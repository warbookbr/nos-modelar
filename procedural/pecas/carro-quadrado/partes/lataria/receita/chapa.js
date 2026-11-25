/* carro-quadrado/lataria/receita/chapa.js — gaiola 100% quad da chapa contínua com arcos de roda estampados na própria malha via faixaDeContornoNaRede. */
import { gaiolaPorRede } from '../../../../../nucleo/gaiola-por-rede.js';
import { curvaCentripeta } from '../../../../../nucleo/gaiola-interpolada.js';
import { faixaDeContornoNaRede } from '../../../../../nucleo/faixa-de-contorno-na-rede.js';

export const m = (mm) => mm / 1000;

const NIVEIS = ['soleira', 'baixo', 'meio', 'apoio', 'vinco', 'cintura', 'quina', 'eixo'];
const LADO = 6; // soleira..cintura (0..5) fecham a frente e a traseira; quina (6) e eixo (7) formam teto/capô/vidro traseiro

/* deriva o nível auxiliar 'apoio' (~38 mm abaixo de 'vinco') a partir da seção de 7 níveis de TABELA.secoes,
   garantindo faixa uniforme em valência 4 ao longo de todo o vinco L4 */
function pontoSecao(T, z, j) {
  const s = T.secoes[String(z)];
  if (j < 3) return [s[j][0], s[j][1], z];
  if (j === 3) {
    /* apoio: 38 mm abaixo de vinco (s[3]), interpolado na superfície entre meio (s[2]) e vinco (s[3]) */
    const [x2, y2] = s[2];
    const [x3, y3] = s[3];
    const yAp = y3 - 40;
    const t = y3 === y2 ? 1 : Math.max(0, Math.min(1, (yAp - y2) / (y3 - y2)));
    return [x2 + (x3 - x2) * t, yAp, z];
  }
  if (j < 7) return [s[j - 1][0], s[j - 1][1], z];
  return [0, s[6], z];
}

function pontoFrenteOuTraseira(arr, j) {
  if (j < 3) return arr[j];
  if (j === 3) {
    const a = arr[2];
    const b = arr[3];
    const yAp = b[1] - 40;
    const t = b[1] === a[1] ? 1 : Math.max(0, Math.min(1, (yAp - a[1]) / (b[1] - a[1])));
    return [a[0] + (b[0] - a[0]) * t, yAp, a[2] + (b[2] - a[2]) * t];
  }
  return arr[j - 1];
}

/* interpola x(z, y) da pele externa da lateral como superfície suave C1 bicúbica (Catmull-Rom centrípeta em y e em z
   sobre TODAS as estações, incluindo as intermediárias 1550, 1235 e -1125), zerando quebras de tangente nas fronteiras dos arcos */
function criarAvaliadorLateral(T) {
  const todasSecoes = new Map();
  for (const z of T.estacoes) todasSecoes.set(z, T.secoes[String(z)]);
  for (const [zStr, sec] of Object.entries(T.secoesIntermediarias ?? {})) {
    todasSecoes.set(Number(zStr), sec);
  }
  const zs = [...todasSecoes.keys()].sort((a, b) => b - a);

  const pontoDeSecao = (sec, z, j) => {
    if (j < 3) return [sec[j][0], sec[j][1]];
    if (j === 3) {
      const [x2, y2] = sec[2];
      const [x3, y3] = sec[3];
      const yAp = y3 - 40;
      const t = y3 === y2 ? 1 : Math.max(0, Math.min(1, (yAp - y2) / (y3 - y2)));
      return [x2 + (x3 - x2) * t, yAp];
    }
    return [sec[j - 1][0], sec[j - 1][1]];
  };

  /* para cada nível j = 0..5, constrói a curva longitudinal suave Catmull-Rom (z -> [x, y]) */
  const curvasLong = [0, 1, 2, 3, 4, 5].map((j) => {
    const pts = zs.map((z) => {
      const [x, y] = pontoDeSecao(todasSecoes.get(z), z, j);
      return [z, x, y];
    });
    return { pts, curva: curvaCentripeta(pts, `long_${j}`) };
  });

  const nivelEmZ = ({ pts, curva }, z) => {
    if (z >= pts[0][0]) return [pts[0][1], pts[0][2]];
    const ult = pts[pts.length - 1];
    if (z <= ult[0]) return [ult[1], ult[2]];
    let lo = 0;
    let hi = 1;
    for (let it = 0; it < 16; it += 1) {
      const mid = (lo + hi) / 2;
      if (curva.naFracao(mid)[0] > z) lo = mid;
      else hi = mid;
    }
    const p = curva.naFracao((lo + hi) / 2);
    return [p[1], p[2]];
  };

  const xPele = (z, y) => {
    const ptsY = curvasLong.map((cl) => nivelEmZ(cl, z));
    if (y <= ptsY[0][1]) return ptsY[0][0];
    const ult = ptsY[ptsY.length - 1];
    if (y >= ult[1]) return ult[0];
    const cv = curvaCentripeta(ptsY, 'sec_z');
    let lo = 0;
    let hi = 1;
    for (let it = 0; it < 16; it += 1) {
      const mid = (lo + hi) / 2;
      if (cv.naFracao(mid)[1] < y) lo = mid;
      else hi = mid;
    }
    return cv.naFracao((lo + hi) / 2)[0];
  };

  const normalPele = (z, y) => {
    const dxdy = (xPele(z, y + 4) - xPele(z, y - 4)) / 8;
    const dxdz = (xPele(z + 4, y) - xPele(z - 4, y)) / 8;
    const l = Math.hypot(1, dxdy, dxdz);
    return [1 / l, -dxdy / l, -dxdz / l];
  };

  const nivelEmZPorIndice = (j, z) => nivelEmZ(curvasLong[j], z);

  return { xPele, normalPele, nivelEmZPorIndice };
}

export function derivarChapa(T) {
  const zs = T.estacoes;
  const iJ = zs.length - 1;
  const nos = {};
  const nome = (i, j) => `e${i}_${NIVEIS[j]}`;
  const fixo = (p) => p.map((c) => +c.toFixed(3));
  const { xPele, normalPele, nivelEmZPorIndice } = criarAvaliadorLateral(T);

  /* e2 (z = 832, base do para-brisa) recua suavemente abaixo do vinco ao longo do flanco reto da porta,
     dando folga simétrica (~67 mm) atrás do arco dianteiro sem tocar em vinco/cintura/para-brisa */
  const Z_E2_INFERIOR = [760, 780, 800, 818];
  zs.forEach((z, i) => {
    NIVEIS.forEach((_, j) => {
      if (i === 2 && j < Z_E2_INFERIOR.length) {
        const zAlvo = Z_E2_INFERIOR[j];
        const [xC, yC] = nivelEmZPorIndice(j, zAlvo);
        nos[nome(i, j)] = fixo([xC, yC, zAlvo]);
      } else {
        nos[nome(i, j)] = fixo(pontoSecao(T, z, j));
      }
    });
  });
  for (let j = 0; j < LADO; j += 1) {
    nos[`f_${NIVEIS[j]}`] = fixo(pontoFrenteOuTraseira(T.frente, j));
    nos[`t_${NIVEIS[j]}`] = fixo(pontoFrenteOuTraseira(T.traseira, j));
  }
  /* quinas quad sem retalho triangular: f_canto/f_quina na frente (canto quase quadrado visto de cima cobrindo o pisca) */
  nos.f_canto = fixo([760, 738, 1982]);
  nos.f_quina = fixo([694, 742, 1998]);
  nos.t_canto = fixo([742, 926, -1968]);
  nos.t_quina = fixo([680, 928, -2002]);

  const PASSO_VERTICAL = 85;
  const curvas = [];
  zs.forEach((z, i) => {
    const p = i === 0 || i === iJ ? { peso: 0.05 } : {};
    curvas.push({ nome: `S${i}_baixo`, pontos: [0, 1, 2, 3, 4, 5].map((j) => nome(i, j)), passo: PASSO_VERTICAL, ...p });
    curvas.push({ nome: `S${i}_pilar`, pontos: [nome(i, 5), nome(i, 6)], ...p });
    curvas.push({ nome: `S${i}_teto`, pontos: [nome(i, 6), nome(i, 7)], ...p });
  });
  const curvaS = (i, j) => (j < 5 ? `S${i}_baixo` : j === 5 ? `S${i}_pilar` : `S${i}_teto`);

  /* níveis inferiores (soleira, baixo, meio) pulam os dois vãos de arco (i = 1 dianteiro, i = 5 traseiro);
     apoio (j = 3) forma a borda superior dos vãos de arco, mantendo vinco (j = 4) 100% em valência 4 com faixa uniforme de 40 mm;
     nos vãos de arco, apoio..eixo preservam as estações intermediárias 1550, 1235 e -1125 como pontos-chave para zero afundamento do capô */
  const VAO_ARCO_D = 1;
  const VAO_ARCO_T = 5;
  const vaosArco = new Set([VAO_ARCO_D, VAO_ARCO_T]);
  const pontosIntermediarios = T.secoesIntermediarias ?? {};

  const pontoIntermediario = (zStr, j) => {
    const s = pontosIntermediarios[zStr];
    if (!s) return null;
    const z = Number(zStr);
    if (j === 3) {
      const [x2, y2] = s[2];
      const [x3, y3] = s[3];
      const yAp = y3 - 40;
      const t = y3 === y2 ? 1 : Math.max(0, Math.min(1, (yAp - y2) / (y3 - y2)));
      return fixo([x2 + (x3 - x2) * t, yAp, z]);
    }
    if (j < 7) return fixo([s[j - 1][0], s[j - 1][1], z]);
    return fixo([0, s[6], z]);
  };

  /* amostra pontos intermediários da mesma curva longitudinal C1 nos trechos fora dos arcos para tangência exata em e1 e e6 */
  const amostrarLongitudinal = (idA, idB, j, nInt) => {
    const a = nos[idA];
    const b = nos[idB];
    const pts = [idA];
    for (let k = 1; k <= nInt; k += 1) {
      const t = k / (nInt + 1);
      const z = a[2] + (b[2] - a[2]) * t;
      const [x, y] = nivelEmZPorIndice(j, z);
      pts.push(fixo([x, y, z]));
    }
    pts.push(idB);
    return pts;
  };

  NIVEIS.forEach((_, j) => {
    const vinco = j === 4 ? T.vincos.lateral : j === 5 ? T.vincos.cintura : j === 6 ? T.vincos.quina : undefined;
    if (j >= 3) {
      const pts = [];
      for (let i = 0; i < zs.length; i += 1) {
        pts.push(nome(i, j));
        if (i === VAO_ARCO_D) {
          for (const zStr of ['1550', '1235']) {
            const pi = pontoIntermediario(zStr, j);
            if (pi) pts.push(pi);
          }
        } else if (i === VAO_ARCO_T) {
          const pi = pontoIntermediario('-1125', j);
          if (pi) pts.push(pi);
        }
      }
      curvas.push({ nome: `L${j}`, pontos: pts, passo: 130, ...(vinco ? { vinco } : {}) });
    } else {
      /* níveis inferiores (soleira, baixo, meio) são divididos em 3 trechos contínuos fora dos dois arcos */
      curvas.push({ nome: `L${j}_f`, pontos: amostrarLongitudinal(nome(0, j), nome(1, j), j, 2) });
      curvas.push({ nome: `L${j}_m`, pontos: [2, 3, 4, 5].map((i) => nome(i, j)) });
      curvas.push({
        nome: `L${j}_t`,
        pontos: [
          ...amostrarLongitudinal(nome(6, j), nome(7, j), j, 1),
          ...amostrarLongitudinal(nome(7, j), nome(8, j), j, 1).slice(1),
        ],
      });
    }
  });
  const curvaL = (i, j) => {
    if (j >= 3) return `L${j}`;
    if (i < VAO_ARCO_D) return `L${j}_f`;
    if (i < VAO_ARCO_T) return `L${j}_m`;
    return `L${j}_t`;
  };

  /* frente: curvas horizontais F0..F5 com frente reta e canto arredondado limpo (compatível com carro quadrado) */
  for (let j = 0; j < LADO - 1; j += 1) {
    const a = nos[nome(0, j)];
    const b = nos[`f_${NIVEIS[j]}`];
    const p1 = fixo([a[0] * 0.955, a[1] + (b[1] - a[1]) * 0.45, b[2] - 20]);
    const p2 = fixo([a[0] * 0.52, a[1] + (b[1] - a[1]) * 0.9, b[2] - 3]);
    curvas.push({ nome: `F${j}`, pontos: [nome(0, j), p1, p2, `f_${NIVEIS[j]}`], peso: 0.05 });
  }
  curvas.push({ nome: `F${LADO - 1}`, pontos: [nome(0, 5), 'f_canto', 'f_quina', fixo([260, nos.f_cintura[1], nos.f_cintura[2]]), 'f_cintura'], peso: 0.05 });
  curvas.push({ nome: 'Fquina', pontos: [nome(0, 6), 'f_quina'], peso: 0.05 });
  curvas.push({ nome: 'perfilFrente', pontos: Array.from({ length: LADO }, (_, k) => `f_${NIVEIS[LADO - 1 - k]}`), passo: PASSO_VERTICAL, peso: 0.05 });
  const fe = nos[nome(0, 7)];
  const fc = nos.f_cintura;
  curvas.push({ nome: 'Feixo', pontos: [nome(0, 7), fixo([0, (fe[1] + fc[1]) / 2, (fe[2] + fc[2]) / 2]), 'f_cintura'], peso: 0.05 });

  /* traseira: Curva 1 (tuck-under) e traseira plana de ponta a ponta com canto suave (~15 mm) */
  for (let j = 0; j < LADO - 1; j += 1) {
    const a = nos[nome(iJ, j)];
    const b = nos[`t_${NIVEIS[j]}`];
    const p1 = fixo([a[0] * 0.94, a[1] + (b[1] - a[1]) * 0.45, b[2] + 15]);
    const p2 = fixo([a[0] * 0.52, a[1] + (b[1] - a[1]) * 0.9, b[2] + 2]);
    curvas.push({ nome: `Q${j}`, pontos: [nome(iJ, j), p1, p2, `t_${NIVEIS[j]}`], peso: 0.05 });
  }
  curvas.push({ nome: `Q${LADO - 1}`, pontos: [nome(iJ, 5), 't_canto', 't_quina', fixo([340, nos.t_cintura[1], nos.t_cintura[2]]), 't_cintura'], peso: 0.05 });
  curvas.push({ nome: 'Qquina', pontos: [nome(iJ, 6), 't_quina'], peso: 0.05 });
  curvas.push({ nome: 'perfilTraseira', pontos: Array.from({ length: LADO }, (_, k) => `t_${NIVEIS[LADO - 1 - k]}`), passo: PASSO_VERTICAL, peso: 0.05 });
  const te = nos[nome(iJ, 7)];
  const tc = nos.t_cintura;
  curvas.push({ nome: 'Teixo', pontos: [nome(iJ, 7), fixo([0, (te[1] + tc[1]) / 2, (te[2] + tc[2]) / 2]), 't_cintura'], peso: 0.05 });

  const supLateral = ([, y, z]) => [xPele(z, Math.max(255, y)), Math.max(255, y), z];
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
        ...(j < 4 ? { superficie: supLateral } : {}),
      });
    }
  }

  /* arcos de roda dianteiro (vão i = 1) e traseiro (vão i = 5) estampados na própria malha via faixaDeContornoNaRede (modo vao + alinharSuperficie PIA) */
  const cantosArcos = [];
  const montarVaoArco = (pref, iVao, arco) => {
    const { z: zC, y: yC, raio: R } = arco;
    const yBase = 255;
    const angMin = Math.asin((yBase - yC) / R);
    const angMax = Math.PI - angMin;
    const N = 13;
    const ptsArco = [];
    for (let k = 0; k < N; k += 1) {
      const ang = angMin + ((angMax - angMin) * k) / (N - 1);
      const z = zC + R * Math.cos(ang);
      const y = k === 0 || k === N - 1 ? yBase : yC + R * Math.sin(ang);
      ptsArco.push(fixo([xPele(z, y), y, z]));
    }

    const solF = nome(iVao, 0);
    const apF = nome(iVao, 3);
    const solT = nome(iVao + 1, 0);
    const apT = nome(iVao + 1, 3);

    const faixa = faixaDeContornoNaRede({
      nome: pref,
      contorno: ptsArco,
      fora: [1, 0, 0],
      projetar: ([, y, z]) => {
        const yCl = Math.max(yBase, y);
        return {
          ponto: [xPele(z, yCl), yCl, z],
          normal: normalPele(z, yCl),
        };
      },
      lado: 'fora',
      deslocamentoBaseMm: 8,
      vincoBase: 0.35,
      faixas: [
        { larguraMm: 15, deslocamentoMm: 11 },
        { larguraMm: 21, deslocamentoMm: 0, vinco: 0.50 },
      ],
      anelDeAmortecimentoMm: 24,
      modulacao: [[0, 0.30], [0.18, 1], [0.82, 1], [1, 0.30]],
      ancoras: [0, 3, 9, 12],
      vao: {
        baseFrente: solF,
        topoFrente: apF,
        topoTras: apT,
        baseTras: solT,
        curvaFrente: lado(`S${iVao}_baixo`, apF, solF),
        curvaTopo: lado('L3', apT, apF),
        curvaTras: lado(`S${iVao + 1}_baixo`, solT, apT),
        nosDoVao: nos,
        passoTransicaoMm: 65,
        divisoesRadiais: 3,
      },
    });

    Object.assign(nos, faixa.nos);
    curvas.push(...faixa.curvas);
    retalhos.push(...faixa.retalhos);
    cantosArcos.push(...faixa.cantos);
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
    borda: [lado('S0_pilar', nome(0, 5), nome(0, 6)), lado('Fquina', nome(0, 6), 'f_quina'), lado(`F${LADO - 1}`, 'f_quina', 'f_canto'), lado(`F${LADO - 1}`, 'f_canto', nome(0, 5))],
  });
  retalhos.push({
    nome: 'f_capo_centro',
    borda: [lado('S0_teto', nome(0, 6), nome(0, 7)), lado('Feixo', nome(0, 7), 'f_cintura'), lado(`F${LADO - 1}`, 'f_cintura', 'f_quina'), lado('Fquina', 'f_quina', nome(0, 6))],
  });
  retalhos.push({
    nome: 'c_tampa_canto',
    borda: [lado(`S${iJ}_pilar`, nome(iJ, 5), nome(iJ, 6)), lado('Qquina', nome(iJ, 6), 't_quina'), lado(`Q${LADO - 1}`, 't_quina', 't_canto'), lado(`Q${LADO - 1}`, 't_canto', nome(iJ, 5))],
  });
  retalhos.push({
    nome: 'c_tampa_centro',
    borda: [lado(`S${iJ}_teto`, nome(iJ, 6), nome(iJ, 7)), lado('Teixo', nome(iJ, 7), 't_cintura'), lado(`Q${LADO - 1}`, 't_cintura', 't_quina'), lado('Qquina', 't_quina', nome(iJ, 6))],
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
    alinharSuperficie: true,
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
