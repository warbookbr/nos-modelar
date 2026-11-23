/* carro-quadrado/lataria/receita/retrovisor.js — retrovisores externos realistas (base triangular, pedestal curto encorpado, concha aerodinâmica oca varrida e espelho embutido). */
import { m } from './chapa.js';

/* tumblehome do vidro da porta: x = 772 (y = 956) até x = 626 (y = 1312) */
const xVidroPorta = (y) => 772 - ((y - 956) / (1312 - 956)) * (772 - 626);

/* contorno superelíptico suave (n = 3.4) no plano (u ∈ [-1, 1], v ∈ [-1, 1]) para cantos automotivos arredondados */
function superelipse(ang, n = 3.4) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const p = 2 / n;
  return [Math.sign(c) * Math.pow(Math.abs(c), p), Math.sign(s) * Math.pow(Math.abs(s), p)];
}

/* gera o retrovisor direito (+x) e espelha em x para retrovisorEsquerdo (-x) */
export function passosRetrovisores(proxId) {
  const passos = [];
  const emitirPar = (passoFn, mat) => {
    const idD = proxId();
    const oD = { op: 'subdivisao', id: idD };
    passos.push(passoFn(idD));
    const idE = proxId();
    passos.push(['espelha', { eixo: 'x', origemId: idE, derivaDe: oD, sel: { origem: oD } }]);
    passos.push(['parte', { nome: 'retrovisorDireito', material: mat, sel: { origem: oD } }]);
    passos.push(['parte', { nome: 'retrovisorEsquerdo', material: mat, sel: { origem: { op: 'espelha', id: idE, de: oD } } }]);
  };

  /* 1. Base triangular encaixada na coluna A da porta (com folga zero na borracha) */
  emitirPar((id) => {
    const ty0 = 956; const ty1 = 1062;
    const tzF = 636; const tzT = 528;
    const x0Out = xVidroPorta(ty0) + 5; const x0In = xVidroPorta(ty0) - 9;
    const x1Out = xVidroPorta(ty1) + 5; const x1In = xVidroPorta(ty1) - 9;
    const verts = [
      [m(x0In), m(ty0), m(tzT)], [m(x0Out), m(ty0), m(tzT)],
      [m(x0Out), m(ty0), m(tzF)], [m(x0In), m(ty0), m(tzF)],
      [m(x1In), m(ty1), m(tzT)], [m(x1Out), m(ty1), m(tzT)],
    ];
    const faces = [[0, 1, 2, 3], [0, 4, 5, 1], [1, 5, 2], [2, 5, 4, 3], [3, 4, 0]];
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  }, 'borrachaVidro');

  /* 2. Pedestal articulado curto e encorpado (4 anéis elípticos suaves de x = 754 até x = 808) */
  emitirPar((id) => {
    const N = 16;
    /* estações [x, yCentro, zCentro, ry, rz] em mm */
    const est = [
      [750, 996, 578, 28, 32],
      [768, 1002, 572, 24, 28],
      [788, 1008, 562, 22, 26],
      [808, 1012, 554, 24, 28],
    ];
    const verts = [];
    for (const [x, yc, zc, ry, rz] of est) {
      for (let i = 0; i < N; i += 1) {
        const a = (2 * Math.PI * i) / N;
        const [cu, cv] = superelipse(a, 2.8);
        verts.push([m(x), m(yc + ry * cv), m(zc + rz * cu)]);
      }
    }
    const iStart = verts.length; verts.push([m(est[0][0]), m(est[0][1]), m(est[0][2])]);
    const iEnd = verts.length; verts.push([m(est[est.length - 1][0]), m(est[est.length - 1][1]), m(est[est.length - 1][2])]);
    const faces = [];
    for (let s = 0; s < est.length - 1; s += 1) {
      for (let i = 0; i < N; i += 1) {
        const j = (i + 1) % N;
        faces.push([s * N + i, s * N + j, (s + 1) * N + j, (s + 1) * N + i]);
      }
    }
    for (let i = 0; i < N; i += 1) {
      const j = (i + 1) % N;
      faces.push([j, i, iStart]);
      faces.push([(est.length - 1) * N + i, (est.length - 1) * N + j, iEnd]);
    }
    return ['subdivisao', { origemId: id, niveis: 1, vertices: verts, faces, liso: 45 }];
  }, 'plasticoFosco');

  /* 3. Carcaça aerodinâmica OCA varrida para trás (~15°), com borda de 6 mm e cavidade real de 14 mm */
  const xMin = 796; const xMax = 938;
  const xMid = (xMin + xMax) / 2; const rxBase = (xMax - xMin) / 2; // 71 mm -> 142 mm largura
  const zBoca = (u) => 532 - 36 * ((u + 1) / 2); // varredura ~15° voltada ao motorista (532 interno -> 496 externo)
  const yCentro = (u) => 1019 + 2 * ((u + 1) / 2);
  const ryLocal = (u) => 47 - 4 * ((u + 1) / 2); // altura 94 mm interno -> 86 mm na ponta externa
  const profLocal = (u) => 74 - 24 * ((u + 1) / 2); // gota aerodinâmica: 74 mm interno -> 50 mm na ponta externa

  emitirPar((id) => {
    const N = 24;
    /* 6 anéis do sólido fechado da concha oca:
       0 = nariz frontal, 1 = ombro frontal, 2 = corpo, 3 = boca traseira externa,
       4 = borda interna da boca (parede 6 mm), 5 = fundo da cavidade (14 mm para dentro) */
    const aneis = [
      { escU: 0.42, escV: 0.42, fProf: 1.00, dzFix: 0 },
      { escU: 0.86, escV: 0.86, fProf: 0.82, dzFix: 0 },
      { escU: 1.00, escV: 1.00, fProf: 0.42, dzFix: 0 },
      { escU: 1.00, escV: 1.00, fProf: 0.00, dzFix: 0 },
      { escU: 0.90, escV: 0.87, fProf: 0.00, dzFix: 2 },
      { escU: 0.87, escV: 0.84, fProf: 0.00, dzFix: 14 },
    ];
    const verts = [];
    for (const an of aneis) {
      for (let i = 0; i < N; i += 1) {
        const a = (2 * Math.PI * i) / N;
        const [cu, cv] = superelipse(a, 3.4);
        const u = cu * an.escU;
        const x = xMid + rxBase * u;
        const y = yCentro(u) + ryLocal(u) * cv * an.escV;
        const z = zBoca(u) + profLocal(u) * an.fProf + an.dzFix;
        verts.push([m(x), m(y), m(z)]);
      }
    }
    const iFrente = verts.length;
    verts.push([m(xMid), m(yCentro(0)), m(zBoca(0) + profLocal(0) + 4)]);
    const iFundo = verts.length;
    verts.push([m(xMid), m(yCentro(0)), m(zBoca(0) + 14)]);

    const faces = [];
    /* fecha o nariz frontal (+z) */
    for (let i = 0; i < N; i += 1) {
      const j = (i + 1) % N;
      faces.push([i, j, iFrente]);
    }
    /* faixas entre anéis 0->1->2->3->4->5 */
    for (let k = 0; k < aneis.length - 1; k += 1) {
      for (let i = 0; i < N; i += 1) {
        const j = (i + 1) % N;
        faces.push([k * N + j, k * N + i, (k + 1) * N + i, (k + 1) * N + j]);
      }
    }
    /* fecha o fundo interno da cavidade (olhando para -z) */
    const bF = (aneis.length - 1) * N;
    for (let i = 0; i < N; i += 1) {
      const j = (i + 1) % N;
      faces.push([bF + j, bF + i, iFundo]);
    }
    return ['subdivisao', { origemId: id, niveis: 1, vertices: verts, faces, liso: 45 }];
  }, 'plasticoFosco');

  /* 4. Placa do espelho refletivo embutida 9 mm dentro da cavidade com folga real de 3 mm em toda a volta */
  emitirPar((id) => {
    const N = 24;
    const verts = [];
    /* camada 0 = face refletiva (-z, em dz = +9 mm dentro da boca); camada 1 = costas do vidro (dz = +12 mm) */
    for (const dz of [9, 12]) {
      for (let i = 0; i < N; i += 1) {
        const a = (2 * Math.PI * i) / N;
        const [cu, cv] = superelipse(a, 3.4);
        const u = cu * 0.84;
        const x = xMid + rxBase * u;
        const y = yCentro(u) + ryLocal(u) * cv * 0.80;
        const z = zBoca(u) + dz;
        verts.push([m(x), m(y), m(z)]);
      }
    }
    const iEsp = verts.length; verts.push([m(xMid), m(yCentro(0)), m(zBoca(0) + 9)]);
    const iTras = verts.length; verts.push([m(xMid), m(yCentro(0)), m(zBoca(0) + 12)]);
    const faces = [];
    for (let i = 0; i < N; i += 1) {
      const j = (i + 1) % N;
      faces.push([j, i, iEsp]); // face refletiva olhando para -z
      faces.push([i, j, N + j, N + i]); // borda fina de 3 mm
      faces.push([N + i, N + j, iTras]); // costas olhando para +z
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  }, 'espelhoRetrovisor');

  return passos;
}
