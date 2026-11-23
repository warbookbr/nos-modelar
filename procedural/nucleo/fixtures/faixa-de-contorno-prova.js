/* faixa-de-contorno-prova.js — fixture neutra (sem domínio de veículo) para provar `faixaDeContornoNaRede`:
 *   chapa curva de 800 × 450 mm com abertura semicircular de raio 140 mm, nos modos:
 *   - 'baseline': chapa curva sem relevo;
 *   - 'chanfro': faixa chanfrada para dentro (-8 mm) com vinco externo;
 *   - 'ombro': ombro saliente (+14 mm) com vinco externo, modulação longitudinal e aba interna;
 *   - 'bojo': alargamento amplo suave (+22 mm) em continuidade G1 sem vinco;
 *   e corte posterior opcional de emenda de painel atravessando a faixa estampada. */
import { gaiolaPorRede } from '../gaiola-por-rede.js';
import { faixaDeContornoNaRede } from '../faixa-de-contorno-na-rede.js';

export const LARGURA = 800;
export const ALTURA = 450;
export const ARCO = { cx: 400, r: 140 };

/** Superfície curva analítica y(x, z) em mm (abaulamento suave em x e z, normal para +y). */
export function alturaSuperficie(x, z) {
  const bx = 30 * (1 - ((x - 400) / 420) ** 2);
  const bz = -((z - 220) ** 2) / 5000;
  return bx + bz;
}

export function normalSuperficie(x, z) {
  const dydx = (-60 * (x - 400)) / (420 * 420);
  const dydz = -(2 * (z - 220)) / 5000;
  const l = Math.hypot(-dydx, 1, -dydz);
  return [-dydx / l, 1 / l, -dydz / l];
}

export const projetarNaChapa = ([x, , z]) => ({
  ponto: [x, alturaSuperficie(x, z), z],
  normal: normalSuperficie(x, z),
});

export function pontosDoArco(n = 13) {
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const ang = Math.PI * (1 - i / (n - 1)); // de 180° (esquerda) a 0° (direita)
    const x = ARCO.cx + ARCO.r * Math.cos(ang);
    const z = ARCO.r * Math.sin(ang);
    pts.push([x, alturaSuperficie(x, z), z]);
  }
  return pts;
}

export const PERFIS = {
  chanfro: {
    deslocamentoBaseMm: -8,
    faixas: [
      { larguraMm: 36, deslocamentoMm: 0, vinco: 0.85 },
    ],
  },
  ombro: {
    deslocamentoBaseMm: 10,
    vincoBase: 0.6,
    faixas: [
      { larguraMm: 18, deslocamentoMm: 14 },
      { larguraMm: 22, deslocamentoMm: 0, vinco: 0.7 },
    ],
    modulacao: [[0, 0.25], [0.18, 1], [0.82, 1], [1, 0.25]],
    abaInterna: { profundidadeMm: 14, anguloGraus: 90 },
  },
  bojo: {
    deslocamentoBaseMm: 12,
    faixas: [
      { larguraMm: 26, deslocamentoMm: 22 },
      { larguraMm: 34, deslocamentoMm: 10 },
      { larguraMm: 34, deslocamentoMm: 0, continuidade: 'G1' },
    ],
    modulacao: [[0, 0.3], [0.22, 1], [0.78, 1], [1, 0.3]],
  },
};

/** Monta a definição `gaiolaPorRede` para o modo escolhido ('baseline' | 'chanfro' | 'ombro' | 'bojo'). */
export function montarChapaDeProva(modo = 'ombro', { passo = 45 } = {}) {
  const P = (x, z) => [x, alturaSuperficie(x, z), z];
  const ptsArco = pontosDoArco(13);

  const nos = {
    E0: P(0, 0),
    E1: P(0, ALTURA),
    D1: P(LARGURA, ALTURA),
    D0: P(LARGURA, 0),
    T1: P(200, ALTURA),
    T2: P(600, ALTURA),
  };

  let curvas;
  let retalhos;
  let faixa = null;

  if (modo === 'baseline') {
    nos.A0 = ptsArco[0];
    nos.A1 = ptsArco[3];
    nos.A2 = ptsArco[9];
    nos.A3 = ptsArco[12];
    const arcoPts = ptsArco.map((p, k) => (k === 0 ? 'A0' : k === 3 ? 'A1' : k === 9 ? 'A2' : k === 12 ? 'A3' : p));
    curvas = [
      { nome: 'esq', pontos: ['E0', P(0, 225), 'E1'] },
      { nome: 'dir', pontos: ['D0', P(LARGURA, 225), 'D1'] },
      { nome: 'topo', pontos: ['E1', 'T1', P(400, ALTURA), 'T2', 'D1'] },
      { nome: 'baseEsq', pontos: ['E0', P(130, 0), 'A0'] },
      { nome: 'baseDir', pontos: ['A3', P(670, 0), 'D0'] },
      { nome: 'arco', pontos: arcoPts },
      { nome: 'lig1', pontos: ['A1', 'T1'] },
      { nome: 'lig2', pontos: ['A2', 'T2'] },
    ];
    retalhos = [
      { nome: 'pEsq', borda: ['baseEsq', { curva: 'arco', de: 'A0', ate: 'A1' }, 'lig1', { curva: 'topo', de: 'T1', ate: 'E1' }, 'esq'].slice(0, 4) },
    ];
    /* retalhos 4 lados limpos: E0-A0-A1-E1, A1-A2-T2-T1, A2-A3-D0-D1... ajustando com T1/T2 */
    curvas = [
      { nome: 'esq', pontos: ['E0', P(0, 225), 'E1'] },
      { nome: 'dir', pontos: ['D0', P(LARGURA, 225), 'D1'] },
      { nome: 'topoEsq', pontos: ['E1', 'T1'] },
      { nome: 'topoMeio', pontos: ['T1', P(400, ALTURA), 'T2'] },
      { nome: 'topoDir', pontos: ['T2', 'D1'] },
      { nome: 'baseEsq', pontos: ['E0', P(130, 0), 'A0'] },
      { nome: 'baseDir', pontos: ['A3', P(670, 0), 'D0'] },
      { nome: 'arco', pontos: arcoPts },
      { nome: 'lig1', pontos: ['A1', 'T1'] },
      { nome: 'lig2', pontos: ['A2', 'T2'] },
    ];
    retalhos = [
      { nome: 'pEsq', borda: ['baseEsq', { curva: 'arco', de: 'A0', ate: 'A1' }, 'lig1', 'topoEsq', 'esq'] },
      { nome: 'pMeio', borda: [{ curva: 'arco', de: 'A1', ate: 'A2' }, 'lig2', 'topoMeio', 'lig1'] },
      { nome: 'pDir', borda: [{ curva: 'arco', de: 'A2', ate: 'A3' }, 'baseDir', 'dir', 'topoDir', 'lig2'] },
    ];
  } else {
    const spec = PERFIS[modo];
    if (!spec) throw new RangeError(`modo desconhecido: ${modo}`);
    faixa = faixaDeContornoNaRede({
      nome: 'borda',
      contorno: ptsArco,
      fora: [0, 1, 0],
      projetar: projetarNaChapa,
      lado: 'dentro',
      ancoras: [0, 3, 9, 12],
      ...spec,
    });
    Object.assign(nos, faixa.nos);
    const [n0, n1, n2, n3] = faixa.nosExternos;
    curvas = [
      ...faixa.curvas,
      { nome: 'esq', pontos: ['E0', P(0, 225), 'E1'] },
      { nome: 'dir', pontos: ['D0', P(LARGURA, 225), 'D1'] },
      { nome: 'topoEsq', pontos: ['E1', 'T1'] },
      { nome: 'topoMeio', pontos: ['T1', P(400, ALTURA), 'T2'] },
      { nome: 'topoDir', pontos: ['T2', 'D1'] },
      { nome: 'baseEsq', pontos: ['E0', n0] },
      { nome: 'baseDir', pontos: [n3, 'D0'] },
      { nome: 'lig1', pontos: [n1, 'T1'] },
      { nome: 'lig2', pontos: [n2, 'T2'] },
    ];
    retalhos = [
      ...faixa.retalhos,
      { nome: 'pEsq', borda: ['baseEsq', { curva: faixa.curvaExterna, de: n0, ate: n1 }, 'lig1', 'topoEsq', 'esq'] },
      { nome: 'pMeio', borda: [{ curva: faixa.curvaExterna, de: n1, ate: n2 }, 'lig2', 'topoMeio', 'lig1'] },
      { nome: 'pDir', borda: [{ curva: faixa.curvaExterna, de: n2, ate: n3 }, 'baseDir', 'dir', 'topoDir', 'lig2'] },
    ];
  }

  const rede = gaiolaPorRede({
    passo,
    fora: [0, 1, 0],
    nos,
    curvas,
    retalhos,
  });

  return { rede, faixa };
}
