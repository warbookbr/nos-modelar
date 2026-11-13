/* kukri — faca de lâmina curva de desenho moderno, deitada, em duas partes: `lamina` e `cabo`. Cada parte é uma gaiola de
 * `gaiolaPorLacos`: a lâmina em laços paralelos ao plano da chapa (corte em y, o contorno em x e z), e o cabo em laços
 * perpendiculares ao comprimento (corte em x, a seção ovalada em y e z).
 *
 * REFERENCIAL. x é o comprimento, de 0 na ponta do cabo a 430 na ponta da lâmina; y é a espessura e para cima, com o chão em
 * y = 0; z é a largura da lâmina, com o dorso para +z e o gume para -z. O cabo e a lâmina compartilham o eixo y do meio da chapa.
 * Medidas em milímetro; a malha sai em metro por `gerarPassos`.
 *
 * ORIGEM DOS NÚMEROS. Os contornos do dorso, do gume e da silhueta do cabo foram levantados de uma foto de estudo fora do
 * repositório (resumo em `referencias/alvo.md` e `referencias/contorno-derivado.json`). Nada da foto entra aqui, só as
 * coordenadas derivadas, e a gravação da foto não é modelada. */
import { gaiolaPorLacos } from '../../nucleo/gaiola-por-lacos.js';

export const TABELA = {
  /* o meio da chapa e do cabo, a altura do eixo sobre o chão */
  eixo_y: 13.5,
  /* LÂMINA: de x = lamina_base (a face que encosta no cabo) à ponta em x = comprimento */
  comprimento: 430,
  lamina_base: 140,
  espessura_dorso: 5,
  /* meia espessura onde o dorso para e o chanfro começa a quebrar a quina do dorso, e o recuo dessa quina em z */
  quina_dorso_ate: 1.7,
  quina_dorso_recuo: 0.8,
  /* o chanfro do gume: largura máxima em z, fração da largura da lâmina que ele pode ocupar, e o degrau onde o gume começa */
  chanfro_largura: 16,
  chanfro_fracao: 0.42,
  degrau_x: 168.5,
  degrau_rampa: 3.5,
  passo_x: 5,
  /* contornos levantados da foto, [x, z] em mm: do dorso, em duas metades que se encontram na quebra, e do gume */
  dorso_base_quebra: [[140, 35.8], [150, 37.1], [160, 38.8], [170, 40.7], [180, 42.7], [190, 44.9], [200, 47.3], [210, 49.3], [220, 51], [230, 52.5], [240, 53.8], [250, 55.1], [260, 55.9], [270, 56.8], [280, 57.2]],
  dorso_quebra_ponta: [[280, 57.2], [290, 56.2], [300, 54.6], [310, 52.7], [320, 50.4], [330, 48.1], [340, 45.2], [350, 41.7], [360, 38.1], [370, 34], [380, 29.7], [390, 24.5], [400, 19], [410, 13.3], [420, 6.8], [430, 1.2]],
  gume: [[140, 1.6], [168.5, 1.6], [170, 3.6], [180, 6], [190, 7.2], [200, 7.2], [210, 6.2], [220, 4.6], [230, 2.5], [240, 0.2], [250, -2.8], [260, -5.8], [270, -9], [280, -12.1], [290, -14.9], [300, -17.2], [310, -18.8], [320, -20], [330, -20.7], [340, -21], [350, -20.6], [360, -20], [370, -18.7], [380, -17], [390, -14.8], [400, -11.7], [410, -8.4], [420, -4.4], [430, 1.2]],
  /* CABO: de x = 0 (a ponta do bico) a x = lamina_base (a frente, que faz de guarda) */
  gomo_passo: 12.5, gomo_sulco: 3, gomo_sulco_meia_largura: 5,
  /* o centro do cabo reto, em z, é uma reta; os semieixos de cada gomo, e o primeiro sulco, a 15 mm da frente */
  cabo_z_em_140: 21, cabo_z_inclinacao: 0.146,
  cabo_meio_z_cresta_60: 15, cabo_meio_z_cresta_126: 16.5, cabo_meio_y: 12.5,
  /* a guarda: a frente é achatada em y, alarga em z e volta à seção dos gomos em x = guarda_ate */
  guarda_meio_z_frente: 19, guarda_meio_y_frente: 9.5, guarda_meio_y_pico: 13.4, guarda_ate: 128,
  oval_expoente: 2.4,
  /* o bico, em x < 58: z do lado do dorso (hi), z do lado do gume (lo) e meia altura em y (hy) */
  bico_hi: [[1, 2.5], [4, 5.5], [10, 9], [18, 15.5], [24, 17.5], [30, 19], [40, 20.8], [50, 22.5], [58, 23]],
  bico_lo: [[1, -2.5], [4, -9], [10, -18.7], [18, -26], [24, -28.5], [27, -27.5], [30, -19], [33, -11.5], [40, -9.5], [50, -7.8], [58, -7]],
  bico_hy: [[1, 3], [4, 7], [10, 10.5], [20, 12], [30, 12.5], [40, 13], [58, 13.4]],
  bico_planos: [57.5, 53, 48, 43, 38, 34, 31, 28.5, 26, 23, 19, 15, 11, 7.5, 4.5, 2],
  furo_x: 11, furo_z: 2, furo_raio: 2.4,
  niveis_cabo: 1,
};

/* ---------- ajudantes de curva ---------- */

/** Interpola `tab` ([x, v] com x crescente) em x por Hermite monótono: sem overshoot, tangente nula nos extremos locais. */
function interpola(tab, x) {
  const n = tab.length;
  if (x <= tab[0][0]) return tab[0][1];
  if (x >= tab[n - 1][0]) return tab[n - 1][1];
  let i = 0;
  while (tab[i + 1][0] < x) i++;
  const sec = (k) => (tab[k + 1][1] - tab[k][1]) / (tab[k + 1][0] - tab[k][0]);
  const tang = (k) => {
    if (k === 0) return sec(0);
    if (k === n - 1) return sec(n - 2);
    const a = sec(k - 1); const b = sec(k);
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  };
  const [x0, y0] = tab[i]; const [x1, y1] = tab[i + 1];
  const h = x1 - x0; const t = (x - x0) / h;
  const h00 = 2 * t ** 3 - 3 * t ** 2 + 1; const h10 = t ** 3 - 2 * t ** 2 + t; const h01 = -2 * t ** 3 + 3 * t ** 2; const h11 = t ** 3 - t ** 2;
  return h00 * y0 + h10 * h * tang(i) + h01 * y1 + h11 * h * tang(i + 1);
}

const entre = (a, b, t) => Math.min(b, Math.max(a, t));

/* ---------- lâmina ---------- */

/** As estações em x do contorno da lâmina, da base à ponta. */
export function estacoes(T) {
  const xs = new Set([T.lamina_base, T.degrau_x, 280, T.comprimento]);
  for (let x = T.lamina_base; x < T.comprimento; x += T.passo_x) xs.add(x);
  return [...xs].sort((a, b) => a - b);
}

const zDorso = (T, x) => (x <= 280 ? interpola(T.dorso_base_quebra, x) : interpola(T.dorso_quebra_ponta, x));
const zGume = (T, x) => interpola(T.gume, x);

/** Largura em z do chanfro do gume na estação x: nula no trecho sem fio, sobe no degrau e cede perto da ponta. */
export function larguraDoChanfro(T, x) {
  const rampa = entre(0, 1, (x - T.degrau_x) / T.degrau_rampa);
  return Math.min(T.chanfro_largura * rampa, T.chanfro_fracao * (zDorso(T, x) - zGume(T, x)));
}

/** O contorno da lâmina no plano s (distância do meio da chapa, em mm): { gume, dorsoPonta, dorsoBase, base } em [x, z]. */
export function lacoDaLamina(T, s) {
  const xs = estacoes(T);
  const f = Math.abs(s) / (T.espessura_dorso / 2);
  const recuoDoDorso = (x) => (Math.abs(s) > T.quina_dorso_ate ? Math.min(T.quina_dorso_recuo, 0.15 * (zDorso(T, x) - zGume(T, x))) : 0);
  const gume = xs.map((x) => [x, zGume(T, x) + larguraDoChanfro(T, x) * f]);
  const dorso = xs.map((x) => [x, zDorso(T, x) - recuoDoDorso(x)]);
  const ponta = gume[gume.length - 1];
  const iQuebra = xs.indexOf(280);
  const dorsoPonta = dorso.slice(iQuebra).reverse();
  const dorsoBase = dorso.slice(0, iQuebra + 1).reverse();
  const base = [dorso[0], [(dorso[0][0] + gume[0][0]) / 2, (dorso[0][1] + gume[0][1]) / 2], gume[0]];
  return { gume, ponta: [ponta, ponta], dorsoPonta, dorsoBase, base };
}

export function argumentosDaLamina(T) {
  const niv = [-T.espessura_dorso / 2, -T.quina_dorso_ate, 0, T.quina_dorso_ate, T.espessura_dorso / 2];
  const l0 = lacoDaLamina(T, 0);
  return {
    nome: 'l', eixo: 'y', tampa: { de: 'base', ate: 'ponta' },
    trechos: [
      { nome: 'base', pontos: l0.base.length }, { nome: 'gume', pontos: l0.gume.length }, { nome: 'ponta', pontos: 2 },
      { nome: 'dorsoPonta', pontos: l0.dorsoPonta.length }, { nome: 'dorsoBase', pontos: l0.dorsoBase.length },
    ],
    lacos: niv.map((s) => {
      const l = lacoDaLamina(T, s);
      return { em: T.eixo_y + s, trechos: { base: l.base, gume: l.gume, ponta: l.ponta, dorsoPonta: l.dorsoPonta, dorsoBase: l.dorsoBase } };
    }),
    vincos: niv.map((_, i) => ({ nome: `plano${i}`, laco: `l${i}`, nitidez: 'viva' })),
    grupos: [{ nome: 'fio', trechos: ['gume'] }],
  };
}

/* ---------- cabo ---------- */

const centroZ = (T, x) => T.cabo_z_em_140 - T.cabo_z_inclinacao * (T.lamina_base - x);

/** Quanto o sulco entre gomos tira dos semieixos em x. Os sulcos ficam em lamina_base - 15 - k * gomo_passo. */
function sulco(T, x) {
  let d = 0;
  for (let k = 0; k < 6; k++) {
    const xc = T.lamina_base - 15 - k * T.gomo_passo;
    const u = Math.abs(x - xc);
    if (u < T.gomo_sulco_meia_largura) d = Math.max(d, T.gomo_sulco * (0.5 + 0.5 * Math.cos((Math.PI * u) / T.gomo_sulco_meia_largura)));
  }
  return d;
}

/** A seção do cabo em x: centro e semieixos em z e y. */
export function secaoDoCabo(T, x) {
  if (x < 58) {
    const hi = interpola(T.bico_hi, x); const lo = interpola(T.bico_lo, x);
    return { zc: (hi + lo) / 2, sz: (hi - lo) / 2, sy: interpola(T.bico_hy, x) };
  }
  const t = entre(0, 1, (x - 60) / (126 - 60));
  const crista = T.cabo_meio_z_cresta_60 + (T.cabo_meio_z_cresta_126 - T.cabo_meio_z_cresta_60) * t;
  let sz = crista; let sy = T.cabo_meio_y;
  const d = sulco(T, x);
  sz -= d; sy -= d;
  if (x > T.guarda_ate) {
    const g = (x - T.guarda_ate) / (T.lamina_base - T.guarda_ate);
    const alarga = g * g * (3 - 2 * g);
    sz = crista + (T.guarda_meio_z_frente - crista) * alarga;
    sy = T.guarda_meio_y_pico + (T.guarda_meio_y_frente - T.guarda_meio_y_pico) * g ** 2;
  }
  return { zc: centroZ(T, x), sz, sy };
}

export function planosDoCabo(T) {
  const guarda = [];
  for (let k = 0; ; k++) { const x = T.lamina_base - 2.5 * k; if (x < 60) break; guarda.push(x); }
  return [...[...T.bico_planos].sort((a, b) => a - b), ...guarda.reverse()];
}

function anel(T, x) {
  const { zc, sz, sy } = secaoDoCabo(T, x);
  const p = T.oval_expoente;
  const pt = (k) => {
    const th = (k * Math.PI) / 8;
    const c = Math.cos(th); const sn = Math.sin(th);
    const v = zc + sz * Math.sign(c) * Math.abs(c) ** (2 / p);
    const u = T.eixo_y + sy * Math.sign(sn) * Math.abs(sn) ** (2 / p);
    return [u, v];
  };
  const trecho = (k0) => Array.from({ length: 5 }, (_, i) => pt((k0 + i) % 16));
  return { a: trecho(0), b: trecho(4), c: trecho(8), d: trecho(12) };
}

export function argumentosDoCabo(T) {
  return {
    nome: 'c', eixo: 'x', tampa: { de: 'a', ate: 'c' },
    trechos: ['a', 'b', 'c', 'd'].map((nome) => ({ nome, pontos: 5 })),
    lacos: planosDoCabo(T).map((x) => ({ em: x, trechos: anel(T, x) })),
  };
}

/* ---------- derivar, passos ---------- */

export function derivar(T = TABELA) {
  return { lamina: gaiolaPorLacos(argumentosDaLamina(T)), cabo: gaiolaPorLacos(argumentosDoCabo(T)) };
}

const m = (mm) => mm / 1000;

export function gerarPassos(T = TABELA) {
  const { lamina, cabo } = derivar(T);
  return [
    ['subdivisao', { origemId: 1, ...lamina.passo, niveis: 0 }],
    ['parte', { nome: 'lamina', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    ['subdivisao', { origemId: 2, ...cabo.passo, niveis: T.niveis_cabo }],
    ['cilindro', { origemId: 3, raio: m(T.furo_raio), altura: m(40), lados: 16, em: [m(T.furo_x), m(T.eixo_y - 20), m(T.furo_z)] }],
    ['subtrair', { origemId: 4, solidos: [{ origem: { op: 'subdivisao', id: 2 } }, { alias: 'furoInteiro' }] }],
    ['parte', { nome: 'cabo', sel: { origem: { op: 'subtrair', id: 4 } } }],
    ['material', { sel: { origem: { op: 'subdivisao', id: 1 } }, usa: 'laminaFosca' }],
    ['material', { sel: { origem: { op: 'subdivisao', id: 1, parte: 'fio' } }, usa: 'fio' }],
    ['material', { sel: { origem: { op: 'subtrair', id: 4 } }, usa: 'caboGranulado' }],
  ];
}

export const ALIASES = [
  ['furoInteiro', { unir: [{ origem: { op: 'cilindro', id: 3 } }, { origem: { op: 'cilindro', id: 3, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: 3, tampa: 'topo' } }] }],
];

export const CONTATOS = [
  { par: ['lamina', 'cabo'], motivo: 'a base da lâmina, em x = 140, encosta na face da frente do cabo, que faz de guarda, sem vão nem degrau solto' },
];

const receita = {
  meta: { nome: 'kukri', desc: 'kukri de desenho moderno, 430 mm, lâmina curva com chanfro e cabo de cinco gomos com bico furado' },
  PARAMS: TABELA,
  ALIASES,
  MATERIAIS: {
    laminaFosca: { tipo: 'liso', cor: '#17181a', aspereza: 0.8, metalicidade: 0.25 },
    fio: { tipo: 'metal', cor: '#a9adb2', aspereza: 0.25, metalicidade: 0.9, brilho: 0.8 },
    caboGranulado: { tipo: 'liso', cor: '#0e0e0f', aspereza: 0.9, metalicidade: 0, relevo: { tipo: 'granulado', escala: 0.6, intensidade: 0.5 } },
  },
  get TOPO() { return { origem: 'ponta do cabo em x = 0; x para a ponta da lâmina, y para cima com o chão em 0, o gume para -z', ...derivar(this.PARAMS).lamina.pontos, ...derivar(this.PARAMS).cabo.pontos }; },
  PLANO: {
    objeto: 'kukri de desenho moderno, 430 mm de ponta a ponta, deitada: comprimento em x, largura da lâmina em z (dorso para +z, gume para -z) e espessura em y',
    referencias: [
      'referencias/alvo.md',
      'referencias/contorno-derivado.json',
    ],
    escala: { medida: 'comprimento total, da ponta do cabo à ponta da lâmina', milimetros: 430 },
    partes: [
      { nome: 'lamina', forma: 'chapa de 290 mm (x 140 a 430), 5 mm no dorso: quebra em ângulo do dorso em x 280, dorso até a ponta aguda, barriga larga perto da ponta, chanfro largo no gume, trecho sem fio e degrau junto ao cabo, quinas do dorso quebradas', tecnica: 'gaiola por laços em cinco planos de y, contorno levantado da foto, sem subdivisão para o chanfro ficar plano; o fio é um grupo de faces com material próprio' },
      { nome: 'cabo', forma: 'peça única de 140 mm (x 0 a 140), seção ovalada: frente alargada de guarda, cinco gomos com sulcos, bico curvado para o lado do gume e furo passante em y para cordão', tecnica: 'gaiola por laços em cortes de x com subdivisão de um nível, sulcos como estreitamento dos semieixos, furo por subtração de um cilindro' },
    ],
    criteriosDeReprovacao: [
      'a lâmina não tem a quebra em ângulo no dorso, ou a barriga não é mais larga perto da ponta do que junto ao cabo',
      'a lâmina tem espessura igual de cima a baixo, sem afinar até o fio, ou a linha do chanfro não acompanha a curva de baixo',
      'o cabo fica fora da proporção combinada, cerca de 140 mm para 290 mm de lâmina',
      'faltam os cinco gomos, o bico curvado na ponta ou o furo do cordão, ou a frente do cabo não alarga',
      'aparece vão ou degrau solto entre a lâmina e o cabo, ou uma parte atravessa a outra',
      'o cabo sai com quinas vivas, ou a lâmina e o cabo saem com o mesmo material',
    ],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    return [
      { nome: 'ponta da lâmina', parte: 'lamina', medida: 'maximo', em: [T.comprimento, T.eixo_y, T.dorso_quebra_ponta[T.dorso_quebra_ponta.length - 1][1]], toleranciaMm: 2 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
