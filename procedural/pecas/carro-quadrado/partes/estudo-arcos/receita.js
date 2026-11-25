/* carro-quadrado/estudo-arcos — chapa curva isolada (perfil da lateral traseira com abaulamento vertical,
 *   afunilamento longitudinal e vinco de ombro) comparando 3 opções de arco lado a lado na bancada:
 *   1) ombro vincado (padrão do carro-quadrado)
 *   2) bojo suave G1 (sem vinco externo)
 *   3) chanfro com aba interna dobrada
 */
import { gaiolaPorRede } from '../../../../nucleo/gaiola-por-rede.js';
import { curvaCentripeta } from '../../../../nucleo/gaiola-interpolada.js';
import { faixaDeContornoNaRede } from '../../../../nucleo/faixa-de-contorno-na-rede.js';

const m = (mm) => mm / 1000;

export const META = {
  nome: 'carro-quadrado/estudo-arcos',
  desc: 'Estudo isolado de três perfis de arco de roda estampados na própria chapa curva com vinco de ombro',
};

export const MATERIAIS = {
  lataria: { cor: '#4c5661', metalicidade: 0.35, aspereza: 0.4 },
};

/* perfil da lateral traseira (x, y) em 5 níveis: soleira, baixo, meio, apoio, vinco, cintura */
const SECOES_BASE = {
  700:  [[795, 255], [825, 425], [840, 632], [838, 788], [775, 945]],
  0:    [[795, 255], [825, 425], [840, 632], [838, 792], [775, 945]],
  '-700': [[782, 260], [812, 427], [827, 629], [825, 797], [770, 943]],
};
const NIVEIS = ['soleira', 'baixo', 'meio', 'apoio', 'vinco', 'cintura'];

function pontoSecao(sec, j) {
  if (j < 3) return sec[j];
  if (j === 3) {
    const [x2, y2] = sec[2];
    const [x3, y3] = sec[3];
    const yAp = y3 - 40;
    const t = (yAp - y2) / (y3 - y2);
    return [x2 + (x3 - x2) * t, yAp];
  }
  return sec[j - 1];
}

function criarAvaliador() {
  const zs = [700, 0, -700];
  const curvasLong = [0, 1, 2, 3, 4, 5].map((j) => {
    const pts = zs.map((z) => {
      const [x, y] = pontoSecao(SECOES_BASE[String(z)], j);
      return [z, x, y];
    });
    return { pts, curva: curvaCentripeta(pts, `long_${j}`) };
  });

  const nivelEmZ = ({ pts, curva }, z) => {
    if (z >= pts[0][0]) return [pts[0][1], pts[0][2]];
    const ult = pts[pts.length - 1];
    if (z <= ult[0]) return [ult[1], ult[2]];
    let lo = 0; let hi = 1;
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
    const cv = curvaCentripeta(ptsY, 'sec');
    let lo = 0; let hi = 1;
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

  return { xPele, normalPele, nivelEmZ: (j, z) => nivelEmZ(curvasLong[j], z) };
}

function montarPainel({ prefixo, zOffset, opcoesFaixa }) {
  const { xPele, normalPele, nivelEmZ } = criarAvaliador();
  const estacoes = [700, 500, -500, -700]; // 2 faixas externas (200 mm) + vão central do arco (1000 mm)
  const nos = {};
  const fixo = (p) => p.map((c) => +c.toFixed(3));
  const no = (i, j) => `e${i}_${NIVEIS[j]}`;

  estacoes.forEach((zLocal, i) => {
    NIVEIS.forEach((_, j) => {
      const [x, y] = nivelEmZ(j, zLocal);
      nos[no(i, j)] = fixo([x, y, zLocal + zOffset]);
    });
  });

  const curvas = [];
  estacoes.forEach((_, i) => {
    curvas.push({ nome: `S${i}`, pontos: [0, 1, 2, 3, 4, 5].map((j) => no(i, j)), passo: 85 });
  });

  const amostrarLong = (i0, i1, j) => {
    const z0 = estacoes[i0]; const z1 = estacoes[i1];
    const zm = (z0 + z1) / 2;
    const [xm, ym] = nivelEmZ(j, zm);
    return [no(i0, j), fixo([xm, ym, zm + zOffset]), no(i1, j)];
  };

  NIVEIS.forEach((_, j) => {
    const vinco = j === 4 ? 0.85 : undefined;
    if (j >= 3) {
      const [xM, yM] = nivelEmZ(j, 0);
      curvas.push({
        nome: `L${j}`,
        pontos: [no(0, j), no(1, j), fixo([xM, yM, zOffset]), no(2, j), no(3, j)],
        passo: 130,
        ...(vinco ? { vinco } : {}),
      });
    } else {
      curvas.push({ nome: `L${j}_f`, pontos: amostrarLong(0, 1, j) });
      curvas.push({ nome: `L${j}_t`, pontos: amostrarLong(2, 3, j) });
    }
  });

  const lado = (curva, de, ate) => ({ curva, de, ate });
  const supPainel = ([, y, z]) => {
    const yCl = Math.max(255, y);
    return [xPele(z - zOffset, yCl), yCl, z];
  };

  const retalhos = [];
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 5; j += 1) {
      if (i === 1 && j < 3) continue;
      const cL = j >= 3 ? `L${j}` : i === 0 ? `L${j}_f` : `L${j}_t`;
      const cU = j + 1 >= 3 ? `L${j + 1}` : i === 0 ? `L${j + 1}_f` : `L${j + 1}_t`;
      retalhos.push({
        nome: `r${i}_${NIVEIS[j]}`,
        borda: [
          lado(cL, no(i, j), no(i + 1, j)),
          lado(`S${i + 1}`, no(i + 1, j), no(i + 1, j + 1)),
          lado(cU, no(i + 1, j + 1), no(i, j + 1)),
          lado(`S${i}`, no(i, j + 1), no(i, j)),
        ],
        ...(j < 4 ? { superficie: supPainel } : {}),
      });
    }
  }

  const R = 350; const yC = 290; const yBase = 255;
  const angMin = Math.asin((yBase - yC) / R);
  const angMax = Math.PI - angMin;
  const N = 13;
  const ptsArco = [];
  for (let k = 0; k < N; k += 1) {
    const ang = angMin + ((angMax - angMin) * k) / (N - 1);
    const zLocal = R * Math.cos(ang);
    const y = k === 0 || k === N - 1 ? yBase : yC + R * Math.sin(ang);
    ptsArco.push(fixo([xPele(zLocal, y), y, zLocal + zOffset]));
  }

  const faixa = faixaDeContornoNaRede({
    nome: 'arco',
    contorno: ptsArco,
    fora: [1, 0, 0],
    projetar: ([, y, z]) => {
      const yCl = Math.max(yBase, y);
      const zLocal = z - zOffset;
      return { ponto: [xPele(zLocal, yCl), yCl, z], normal: normalPele(zLocal, yCl) };
    },
    lado: 'fora',
    ancoras: [0, 3, 9, 12],
    ...opcoesFaixa,
    vao: {
      baseFrente: no(1, 0),
      topoFrente: no(1, 3),
      topoTras: no(2, 3),
      baseTras: no(2, 0),
      curvaFrente: lado('S1', no(1, 3), no(1, 0)),
      curvaTopo: lado('L3', no(2, 3), no(1, 3)),
      curvaTras: lado('S2', no(2, 0), no(2, 3)),
      nosDoVao: nos,
      passoTransicaoMm: 65,
      divisoesRadiais: 3,
    },
  });

  Object.assign(nos, faixa.nos);
  curvas.push(...faixa.curvas);
  retalhos.push(...faixa.retalhos);

  return gaiolaPorRede({
    prefixo,
    passo: 200,
    anguloMax: 20,
    fora: [1, 0, 0],
    nos,
    curvas,
    retalhos,
    cantos: faixa.cantos,
    interior: false,
    liso: false,
    alinharSuperficie: true,
  });
}

const OPCOES = [
  {
    nome: 'painelOmbroVincado',
    prefixo: 'vinc_',
    zOffset: 1700,
    opcoesFaixa: {
      deslocamentoBaseMm: 8,
      vincoBase: 0.35,
      faixas: [
        { larguraMm: 15, deslocamentoMm: 11 },
        { larguraMm: 21, deslocamentoMm: 0, vinco: 0.50 },
      ],
      anelDeAmortecimentoMm: 24,
      modulacao: [[0, 0.30], [0.18, 1], [0.82, 1], [1, 0.30]],
    },
  },
  {
    nome: 'painelBojoSuave',
    prefixo: 'bojo_',
    zOffset: 0,
    opcoesFaixa: {
      deslocamentoBaseMm: 12,
      faixas: [
        { larguraMm: 26, deslocamentoMm: 10 },
        { larguraMm: 38, deslocamentoMm: 0 },
      ],
      anelDeAmortecimentoMm: 28,
      modulacao: [[0, 0.25], [0.22, 1], [0.78, 1], [1, 0.25]],
    },
  },
  {
    nome: 'painelChanfroAba',
    prefixo: 'chan_',
    zOffset: -1700,
    opcoesFaixa: {
      deslocamentoBaseMm: -6,
      vincoBase: 0.60,
      faixas: [
        { larguraMm: 18, deslocamentoMm: 0, vinco: 0.40 },
      ],
      abaInterna: { profundidadeMm: 14 },
      anelDeAmortecimentoMm: 20,
      modulacao: [[0, 0.35], [0.20, 1], [0.80, 1], [1, 0.35]],
    },
  },
];

const REDES = OPCOES.map((op) => ({ ...op, rede: montarPainel(op) }));

export const TOPO = {
  origem: 'centro do painel central no chão: x para a direita, y para cima, painéis distribuídos ao longo de z',
  ...Object.assign({}, ...REDES.map((r) => r.rede.pontos)),
};

export const PASSOS = REDES.flatMap(({ nome, rede }, idx) => {
  const id = idx + 1;
  const { medidas: _, ...passoRede } = rede.passo;
  return [
    ['subdivisao', { origemId: id, ...passoRede, borda: 'cantos', niveis: 2, espessura: m(3) }],
    ['parte', { nome, material: 'lataria', sel: { origem: { op: 'subdivisao', id } } }],
  ];
});

export const PLANO = {
  objeto: 'Três chapas curvas isoladas com relevo lateral e vinco de ombro para estudo e teste comparativo de três perfis de arco na própria malha',
  referencias: ['../../referencias/lateral.prancha.svg'],
  escala: { medida: 'comprimento longitudinal de cada chapa de estudo, de -700 a +700 mm locais', milimetros: 1400 },
  partes: [
    { nome: 'painelOmbroVincado', forma: 'Chapa curva lateral com arco de ombro saliente e vinco externo', tecnica: 'Subdivisão de gaiolaPorRede com faixaDeContornoNaRede (modo vao) e alinharSuperficie' },
    { nome: 'painelBojoSuave', forma: 'Chapa curva lateral com arco de bojo suave G1 sem vinco externo', tecnica: 'Subdivisão de gaiolaPorRede com faixaDeContornoNaRede (modo vao) e alinharSuperficie' },
    { nome: 'painelChanfroAba', forma: 'Chapa curva lateral com arco chanfrado para dentro e aba interna dobrada', tecnica: 'Subdivisão de gaiolaPorRede com faixaDeContornoNaRede (modo vao + abaInterna) e alinharSuperficie' },
  ],
  criteriosDeReprovacao: [
    'Faces órfãs ou auto-interseção de espessura nas três chapas de estudo',
    'Deformação ou degrau na zona neutra fora da faixa do arco',
  ],
};

export default {
  meta: META,
  PLANO,
  MATERIAIS,
  TOPO,
  ilhas: [
    { contem: 'painelOmbroVincado', motivo: 'painel isolado lado a lado para comparação visual das três opções de arco na bancada' },
    { contem: 'painelChanfroAba', motivo: 'painel isolado lado a lado para comparação visual das três opções de arco na bancada' },
  ],
  PASSOS,
};
