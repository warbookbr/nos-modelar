/* carro-quadrado/lataria/receita/chapa.js — gaiola 100% quad da chapa contínua com arcos de roda estampados na própria malha via faixaDeContornoNaRede. */
import { gaiolaPorRede } from '../../../../../nucleo/gaiola-por-rede.js';
import { faixaDeContornoNaRede } from '../../../../../nucleo/faixa-de-contorno-na-rede.js';

export const m = (mm) => mm / 1000;

const NIVEIS = ['soleira', 'baixo', 'meio', 'vinco', 'cintura', 'quina', 'eixo'];
const LADO = 5; // soleira..cintura (0..4) fecham a frente e a traseira; quina (5) e eixo (6) formam teto/capô/vidro traseiro

function pontoSecao(T, z, j) {
  const s = T.secoes[String(z)];
  if (j < 6) return [s[j][0], s[j][1], z];
  return [0, s[6], z];
}

/* interpola x(z, y) da pele externa da lateral a partir de TABELA.secoes (em mm) */
function xPeleLateral(T, z, y) {
  const zs = T.estacoes;
  let i0 = 0;
  for (let i = 0; i < zs.length - 1; i += 1) {
    if (z <= zs[i] && z >= zs[i + 1]) { i0 = i; break; }
  }
  const zA = zs[i0];
  const zB = zs[i0 + 1];
  const tz = zA === zB ? 0 : Math.max(0, Math.min(1, (zA - z) / (zA - zB)));
  const xEmSecao = (sec) => {
    for (let j = 0; j < 4; j += 1) {
      const [x0, y0] = sec[j];
      const [x1, y1] = sec[j + 1];
      if (y <= y1 || j === 3) {
        const ty = y1 === y0 ? 0 : Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
        return x0 + (x1 - x0) * ty;
      }
    }
    return sec[0][0];
  };
  return xEmSecao(T.secoes[String(zA)]) + (xEmSecao(T.secoes[String(zB)]) - xEmSecao(T.secoes[String(zA)])) * tz;
}

function normalLateral(T, z, y) {
  const dxdy = (xPeleLateral(T, z, y + 4) - xPeleLateral(T, z, y - 4)) / 8;
  const dxdz = (xPeleLateral(T, z + 4, y) - xPeleLateral(T, z - 4, y)) / 8;
  const l = Math.hypot(1, dxdy, dxdz);
  return [1 / l, -dxdy / l, -dxdz / l];
}

export function derivarChapa(T) {
  const zs = T.estacoes;
  const iJ = zs.length - 1;
  const nos = {};
  const nome = (i, j) => `e${i}_${NIVEIS[j]}`;
  const fixo = (p) => p.map((c) => +c.toFixed(3));

  zs.forEach((z, i) => {
    NIVEIS.forEach((_, j) => { nos[nome(i, j)] = fixo(pontoSecao(T, z, j)); });
  });
  for (let j = 0; j < LADO; j += 1) {
    nos[`f_${NIVEIS[j]}`] = fixo(T.frente[j]);
    nos[`t_${NIVEIS[j]}`] = fixo(T.traseira[j]);
  }
  /* quinas quad sem retalho triangular: f_canto/f_quina na frente (canto quase quadrado visto de cima cobrindo o pisca) */
  nos.f_canto = fixo([760, 738, 1982]);
  nos.f_quina = fixo([694, 742, 1998]);
  nos.t_canto = fixo([742, 926, -1968]);
  nos.t_quina = fixo([680, 928, -2002]);

  const curvas = [];
  zs.forEach((z, i) => {
    const p = i === 0 || i === iJ ? { peso: 0.05 } : {};
    curvas.push({ nome: `S${i}_baixo`, pontos: [0, 1, 2, 3, 4].map((j) => nome(i, j)), ...p });
    curvas.push({ nome: `S${i}_pilar`, pontos: [nome(i, 4), nome(i, 5)], ...p });
    curvas.push({ nome: `S${i}_teto`, pontos: [nome(i, 5), nome(i, 6)], ...p });
  });
  const curvaS = (i, j) => (j < 4 ? `S${i}_baixo` : j === 4 ? `S${i}_pilar` : `S${i}_teto`);

  /* L0 (soleira) pula os dois vãos de arco (i = 1 dianteiro, i = 5 traseiro); L1 e L2 também pulam esses dois vãos */
  const VAO_ARCO_D = 1;
  const VAO_ARCO_T = 5;
  const vaosArco = new Set([VAO_ARCO_D, VAO_ARCO_T]);

  NIVEIS.forEach((_, j) => {
    const vinco = j === 3 ? T.vincos.lateral : j === 4 ? T.vincos.cintura : j === 5 ? T.vincos.quina : undefined;
    if (j >= 3) {
      curvas.push({ nome: `L${j}`, pontos: zs.map((_, i) => nome(i, j)), ...(vinco ? { vinco } : {}) });
    } else {
      /* níveis inferiores (soleira, baixo, meio) são divididos em 3 trechos contínuos fora dos dois arcos */
      curvas.push({ nome: `L${j}_f`, pontos: [nome(0, j), nome(1, j)] });
      curvas.push({ nome: `L${j}_m`, pontos: [2, 3, 4, 5].map((i) => nome(i, j)) });
      curvas.push({ nome: `L${j}_t`, pontos: [6, 7, 8].map((i) => nome(i, j)) });
    }
  });
  const curvaL = (i, j) => {
    if (j >= 3) return `L${j}`;
    if (i < VAO_ARCO_D) return `L${j}_f`;
    if (i < VAO_ARCO_T) return `L${j}_m`;
    return `L${j}_t`;
  };

  /* frente: curvas horizontais F0..F4 com frente reta e canto arredondado limpo (compatível com carro quadrado) */
  for (let j = 0; j < LADO - 1; j += 1) {
    const a = nos[nome(0, j)];
    const b = nos[`f_${NIVEIS[j]}`];
    const p1 = fixo([a[0] * 0.955, a[1] + (b[1] - a[1]) * 0.45, b[2] - 20]);
    const p2 = fixo([a[0] * 0.52, a[1] + (b[1] - a[1]) * 0.9, b[2] - 3]);
    curvas.push({ nome: `F${j}`, pontos: [nome(0, j), p1, p2, `f_${NIVEIS[j]}`], peso: 0.05 });
  }
  curvas.push({ nome: 'F4', pontos: [nome(0, 4), 'f_canto', 'f_quina', fixo([260, nos.f_cintura[1], nos.f_cintura[2]]), 'f_cintura'], peso: 0.05 });
  curvas.push({ nome: 'Fquina', pontos: [nome(0, 5), 'f_quina'], peso: 0.05 });
  curvas.push({ nome: 'perfilFrente', pontos: Array.from({ length: LADO }, (_, k) => `f_${NIVEIS[LADO - 1 - k]}`), peso: 0.05 });
  const fe = nos[nome(0, 6)];
  const fc = nos.f_cintura;
  curvas.push({ nome: 'Feixo', pontos: [nome(0, 6), fixo([0, (fe[1] + fc[1]) / 2, (fe[2] + fc[2]) / 2]), 'f_cintura'], peso: 0.05 });

  /* traseira: Curva 1 (tuck-under) e traseira plana de ponta a ponta com canto suave (~15 mm) */
  for (let j = 0; j < LADO - 1; j += 1) {
    const a = nos[nome(iJ, j)];
    const b = nos[`t_${NIVEIS[j]}`];
    const p1 = fixo([a[0] * 0.94, a[1] + (b[1] - a[1]) * 0.45, b[2] + 15]);
    const p2 = fixo([a[0] * 0.52, a[1] + (b[1] - a[1]) * 0.9, b[2] + 2]);
    curvas.push({ nome: `Q${j}`, pontos: [nome(iJ, j), p1, p2, `t_${NIVEIS[j]}`], peso: 0.05 });
  }
  curvas.push({ nome: 'Q4', pontos: [nome(iJ, 4), 't_canto', 't_quina', fixo([340, nos.t_cintura[1], nos.t_cintura[2]]), 't_cintura'], peso: 0.05 });
  curvas.push({ nome: 'Qquina', pontos: [nome(iJ, 5), 't_quina'], peso: 0.05 });
  curvas.push({ nome: 'perfilTraseira', pontos: Array.from({ length: LADO }, (_, k) => `t_${NIVEIS[LADO - 1 - k]}`), peso: 0.05 });
  const te = nos[nome(iJ, 6)];
  const tc = nos.t_cintura;
  curvas.push({ nome: 'Teixo', pontos: [nome(iJ, 6), fixo([0, (te[1] + tc[1]) / 2, (te[2] + tc[2]) / 2]), 't_cintura'], peso: 0.05 });

  const retalhos = [];
  const lado = (curva, de, ate) => ({ curva, de, ate });
  for (let i = 0; i < iJ; i += 1) {
    for (let j = 0; j < NIVEIS.length - 1; j += 1) {
      if (vaosArco.has(i) && j < 3) continue; // substituído pelos anéis concêntricos do arco estampado na malha
      retalhos.push({
        nome: `r${i}_${NIVEIS[j]}`,
        borda: [
          lado(curvaL(i, j), nome(i, j), nome(i + 1, j)),
          lado(curvaS(i + 1, j), nome(i + 1, j), nome(i + 1, j + 1)),
          lado(curvaL(i, j + 1), nome(i + 1, j + 1), nome(i, j + 1)),
          lado(curvaS(i, j), nome(i, j + 1), nome(i, j)),
        ],
      });
    }
  }

  /* arcos de roda dianteiro (vão i = 1) e traseiro (vão i = 5) estampados na própria malha via faixaDeContornoNaRede */
  const cantosArcos = [];
  const linhaLateral = (nomeA, nomeB, nInt = 2) => {
    const a = nos[nomeA];
    const b = nos[nomeB];
    const pts = [nomeA];
    for (let k = 1; k <= nInt; k += 1) {
      const t = k / (nInt + 1);
      const y = a[1] + (b[1] - a[1]) * t;
      const z = a[2] + (b[2] - a[2]) * t;
      pts.push(fixo([xPeleLateral(T, z, y), y, z]));
    }
    pts.push(nomeB);
    return pts;
  };

  const montarVaoArco = (pref, iVao, arco) => {
    const { z: zC, y: yC, raio: R } = arco;
    const yBase = 255;
    const angMin = Math.asin((yBase - yC) / R); // ~ -0.10 rad para encostar exatamente em y = 255
    const angMax = Math.PI - angMin;
    const N = 13;
    const ptsArco = [];
    for (let k = 0; k < N; k += 1) {
      const ang = angMin + ((angMax - angMin) * k) / (N - 1);
      const z = zC + R * Math.cos(ang);
      const y = k === 0 || k === N - 1 ? yBase : yC + R * Math.sin(ang);
      ptsArco.push(fixo([xPeleLateral(T, z, y), y, z]));
    }

    const faixa = faixaDeContornoNaRede({
      nome: pref,
      contorno: ptsArco,
      fora: [1, 0, 0],
      projetar: ([, y, z]) => ({
        ponto: [xPeleLateral(T, z, y), y, z],
        normal: normalLateral(T, z, y),
      }),
      lado: 'fora',
      deslocamentoBaseMm: 8,
      vincoBase: 0.35,
      faixas: [
        { larguraMm: 18, deslocamentoMm: 12 },
        { larguraMm: 26, deslocamentoMm: 0, vinco: 0.55 },
      ],
      modulacao: [[0, 0.30], [0.18, 1], [0.82, 1], [1, 0.30]],
      ancoras: [0, 3, 9, 12],
    });

    Object.assign(nos, faixa.nos);
    curvas.push(...faixa.curvas);
    retalhos.push(...faixa.retalhos);

    const [n0, n1, n2, n3] = faixa.nosExternos;
    cantosArcos.push(`${pref}_a0_n0`, `${pref}_a0_n3`, n0, n3);

    const solF = nome(iVao, 0);
    const vinF = nome(iVao, 3);
    const solT = nome(iVao + 1, 0);
    const vinT = nome(iVao + 1, 3);

    curvas.push({ nome: `${pref}_solF`, pontos: linhaLateral(solF, n0, 1) });
    curvas.push({ nome: `${pref}_solT`, pontos: linhaLateral(n3, solT, 1) });
    curvas.push({ nome: `${pref}_ligF`, pontos: linhaLateral(n1, vinF, 2) });
    curvas.push({ nome: `${pref}_ligT`, pontos: linhaLateral(n2, vinT, 2) });

    retalhos.push({
      nome: `${pref}_pFrente`,
      borda: [`${pref}_solF`, lado(faixa.curvaExterna, n0, n1), `${pref}_ligF`, lado(`S${iVao}_baixo`, vinF, solF)],
    });
    retalhos.push({
      nome: `${pref}_pTopo`,
      borda: [lado(faixa.curvaExterna, n1, n2), `${pref}_ligT`, lado('L3', vinT, vinF), `${pref}_ligF`],
    });
    retalhos.push({
      nome: `${pref}_pTras`,
      borda: [lado(faixa.curvaExterna, n2, n3), `${pref}_solT`, lado(`S${iVao + 1}_baixo`, solT, vinT), `${pref}_ligT`],
    });
  };

  montarVaoArco('arcoD', VAO_ARCO_D, T.arcos.dianteiro);
  montarVaoArco('arcoT', VAO_ARCO_T, T.arcos.traseiro);
  for (let j = 0; j < LADO - 1; j += 1) {
    retalhos.push({
      nome: `f_${NIVEIS[j]}`,
      borda: [
        lado(`F${j}`, nome(0, j), `f_${NIVEIS[j]}`),
        lado('perfilFrente', `f_${NIVEIS[j]}`, `f_${NIVEIS[j + 1]}`),
        lado(`F${j + 1}`, `f_${NIVEIS[j + 1]}`, nome(0, j + 1)),
        lado('S0_baixo', nome(0, j + 1), nome(0, j)),
      ],
    });
    retalhos.push({
      nome: `c_${NIVEIS[j]}`,
      borda: [
        lado(`Q${j}`, nome(iJ, j), `t_${NIVEIS[j]}`),
        lado('perfilTraseira', `t_${NIVEIS[j]}`, `t_${NIVEIS[j + 1]}`),
        lado(`Q${j + 1}`, `t_${NIVEIS[j + 1]}`, nome(iJ, j + 1)),
        lado(`S${iJ}_baixo`, nome(iJ, j + 1), nome(iJ, j)),
      ],
    });
  }
  /* 4 retalhos 100% QUAD nas quinas do capô e da coluna D (elimina os polos val:3 de retalho triangular!) */
  retalhos.push({
    nome: 'f_capo_canto',
    borda: [lado('S0_pilar', nome(0, 4), nome(0, 5)), lado('Fquina', nome(0, 5), 'f_quina'), lado('F4', 'f_quina', 'f_canto'), lado('F4', 'f_canto', nome(0, 4))],
  });
  retalhos.push({
    nome: 'f_capo_centro',
    borda: [lado('S0_teto', nome(0, 5), nome(0, 6)), lado('Feixo', nome(0, 6), 'f_cintura'), lado('F4', 'f_cintura', 'f_quina'), lado('Fquina', 'f_quina', nome(0, 5))],
  });
  retalhos.push({
    nome: 'c_tampa_canto',
    borda: [lado(`S${iJ}_pilar`, nome(iJ, 4), nome(iJ, 5)), lado('Qquina', nome(iJ, 5), 't_quina'), lado('Q4', 't_quina', 't_canto'), lado('Q4', 't_canto', nome(iJ, 4))],
  });
  retalhos.push({
    nome: 'c_tampa_centro',
    borda: [lado(`S${iJ}_teto`, nome(iJ, 5), nome(iJ, 6)), lado('Teixo', nome(iJ, 6), 't_cintura'), lado('Q4', 't_cintura', 't_quina'), lado('Qquina', 't_quina', nome(iJ, 5))],
  });

  const rede = gaiolaPorRede({
    passo: T.chapa.passo,
    anguloMax: T.chapa.anguloMax,
    fora: [1, 0, 0],
    simetria: 'x',
    nos,
    curvas,
    retalhos,
    cantos: cantosArcos,
    interior: false,
    liso: T.chapa.liso,
  });
  return { rede, zs };
}

export function projetarVista(vista, pontos) {
  const l = Math.hypot(...vista);
  const d = vista.map((c) => c / l);
  let u = [d[2], 0, -d[0]];
  const lu = Math.hypot(...u);
  u = lu < 1e-9 ? [1, 0, 0] : u.map((c) => c / lu);
  const v = [
    d[1] * u[2] - d[2] * u[1],
    d[2] * u[0] - d[0] * u[2],
    d[0] * u[1] - d[1] * u[0],
  ];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return pontos.map(([x, y, z, r]) => [dot([x, y, z], u), dot([x, y, z], v), r]);
}

export function contornoComFilete(pontos) {
  const n = pontos.length;
  const raio = (i) => {
    const [p, a, b] = [pontos[i], pontos[(i + n - 1) % n], pontos[(i + 1) % n]];
    if (!p[2]) return 0;
    const ua = [a[0] - p[0], a[1] - p[1]];
    const ub = [b[0] - p[0], b[1] - p[1]];
    const la = Math.hypot(...ua);
    const lb = Math.hypot(...ub);
    const teta = Math.acos(Math.max(-1, Math.min(1, (ua[0] * ub[0] + ua[1] * ub[1]) / (la * lb))));
    return Math.min(p[2], (Math.min(la, lb) / 2) * Math.tan(teta / 2));
  };
  const trechos = [];
  if (raio(0)) trechos.push({ concordancia: m(raio(0)) });
  for (let i = 1; i < n; i += 1) {
    const [u, v] = pontos[i];
    trechos.push({ reto: [m(u), m(v)] });
    if (raio(i)) trechos.push({ concordancia: m(raio(i)) });
  }
  trechos.push({ reto: [m(pontos[0][0]), m(pontos[0][1])] });
  return { inicio: [m(pontos[0][0]), m(pontos[0][1])], trechos };
}
