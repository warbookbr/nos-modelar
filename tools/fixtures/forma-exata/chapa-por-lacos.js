/* chapa-por-lacos.js — a peça de comparação do caso A do estudo do método (plano "forma exata antes da malha", fatia 3): uma chapa de contorno curvo de
 * 290 por 78 por 5 mm, com chanfro largo na borda de baixo e quina quebrada nas costas, feita pelo método do núcleo de 2026-11-13, cinco laços empilhados
 * em `gaiolaPorLacos` com vincos vivos e a espessura afinando para a ponta. É uma cópia fixa, com nomes neutros, da forma que uma peça do acervo tinha nessa
 * data; fica aqui para o teste `procedural/nucleo/forma-exata/casos-medidos.test.mjs` não fixar números de uma peça do acervo, que muda. Medidas em mm; x é o
 * comprimento, y a espessura, z a largura. */
import { gaiolaPorLacos } from '../../../procedural/nucleo/gaiola-por-lacos.js';

export const TABELA = {
  /* o meio da chapa e da outra peça, a altura do eixo sobre o chão */
  eixo_y: 14.5,
  /* CHAPA: de x = chapa_base (a face que encosta na outra peça) à ponta em x = comprimento */
  comprimento: 430,
  chapa_base: 140,
  espessura: 5,
  /* meia espessura onde o costas para e o chanfro começa a quebrar a quina do costas, e o recuo dessa quina em z */
  quina_ate: 1.7,
  quina_recuo: 0.8,
  /* o chanfro do borda: largura máxima em z, fração da largura da chapa que ele pode ocupar, e o degrau onde o borda começa */
  chanfro_largura: 16,
  chanfro_fracao: 0.42,
  degrau_x: 152,
  degrau_rampa: 2.5,
  /* a chapa afina de espessura do costas aa aresta da ponta: a partir de afina_de ela vai a afina_ponta de meia espessura */
  /* meio comprimento, em x, do arredondamento da quebra do costas: uma Bézier quadrática com o canto como controle, da ordem de 4 a 6 mm */
  quebra_suave: 6,
  afina_de: 340, afina_ponta: 0.3,
  passo_x: 5,
  /* os contornos, [x, z] em mm: o das costas, em duas metades que se encontram na quebra, e o da borda de baixo */
  costas_base_quebra: [[140, 34.5], [280, 57.2]],
  costas_quebra_ponta: [[280, 57.2], [355, 32.2], [430, 1.2]],
  borda: [[140, 0.6], [152, 0.6], [154.5, 2.2], [160, 2.9], [170, 3.6], [180, 6], [190, 7.2], [200, 7.2], [210, 6.2], [220, 4.6], [230, 2.5], [240, 0.2], [250, -2.8], [260, -5.8], [270, -9], [280, -12.1], [290, -14.9], [300, -17.2], [310, -18.8], [320, -20], [330, -20.7], [340, -21], [350, -20.6], [360, -20], [370, -18.7], [380, -17], [390, -14.8], [400, -11.7], [410, -8.4], [420, -4.4], [430, 1.2]],
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

const m = (mm) => mm / 1000;
const entre = (a, b, t) => Math.min(b, Math.max(a, t));

/* ---------- chapa ---------- */

/** As estações em x do contorno da chapa, da base à ponta. */
export function estacoes(T) {
  const xs = new Set([T.chapa_base, T.degrau_x, T.degrau_x + T.degrau_rampa, 280, 280 - T.quebra_suave / 2, 280 + T.quebra_suave / 2, T.comprimento]);
  for (let x = T.chapa_base; x < T.comprimento; x += T.passo_x) xs.add(x);
  return [...xs].sort((a, b) => a - b);
}

const zRetoCostas = (T, x) => (x <= 280 ? interpola(T.costas_base_quebra, x) : interpola(T.costas_quebra_ponta, x));
function zCostas(T, x) {
  const r = T.quebra_suave;
  if (!(Math.abs(x - 280) < r)) return zRetoCostas(T, x);
  const t = (x - 280 + r) / (2 * r);
  return (1 - t) ** 2 * zRetoCostas(T, 280 - r) + 2 * t * (1 - t) * zRetoCostas(T, 280) + t * t * zRetoCostas(T, 280 + r);
}
const zBorda = (T, x) => interpola(T.borda, x);

/** Largura em z do chanfro do borda na estação x: nula no trecho sem chanfro, sobe no degrau e cede perto da ponta. */
export function larguraDoChanfro(T, x) {
  const rampa = entre(0, 1, (x - T.degrau_x) / T.degrau_rampa);
  return Math.min(T.chanfro_largura * rampa, T.chanfro_fracao * (zCostas(T, x) - zBorda(T, x)));
}

/** O contorno da chapa no plano s (distância do meio da chapa, em mm): { borda, costasPonta, costasBase, base } em [x, z]. */
export function lacoDaChapa(T, s) {
  const xs = estacoes(T);
  const meia = T.espessura / 2;
  const ponto = (x) => {
    const a = Math.abs(s);
    const larg = zCostas(T, x) - zBorda(T, x);
    const rec = a > T.quina_ate ? Math.min(T.quina_recuo, 0.15 * larg) : 0;
    const zd = zCostas(T, x) - rec;
    const ze = zBorda(T, x) + larguraDoChanfro(T, x) * (a / meia);
    return { d: [x, zd], e: [x, ze] };
  };
  const pts = xs.map(ponto);
  const borda = pts.map((p) => p.e);
  const costas = pts.map((p) => p.d);
  const ponta = borda[borda.length - 1];
  const iQuebra = xs.indexOf(280);
  const costasPonta = costas.slice(iQuebra).reverse();
  const costasBase = costas.slice(0, iQuebra + 1).reverse();
  const base = [costas[0], [(costas[0][0] + borda[0][0]) / 2, (costas[0][1] + borda[0][1]) / 2], borda[0]];
  return { borda, ponta: [ponta, ponta], costasPonta, costasBase, base };
}

export function arbordantosDaChapa(T) {
  const niv = [-T.espessura / 2, -T.quina_ate, 0, T.quina_ate, T.espessura / 2];
  const l0 = lacoDaChapa(T, 0);
  return {
    nome: 'l', eixo: 'y', tampa: { de: 'base', ate: 'ponta' },
    trechos: [
      { nome: 'base', pontos: l0.base.length }, { nome: 'borda', pontos: l0.borda.length }, { nome: 'ponta', pontos: 2 },
      { nome: 'costasPonta', pontos: l0.costasPonta.length }, { nome: 'costasBase', pontos: l0.costasBase.length },
    ],
    lacos: niv.map((s) => {
      const l = lacoDaChapa(T, s);
      return { em: T.eixo_y + s, trechos: { base: l.base, borda: l.borda, ponta: l.ponta, costasPonta: l.costasPonta, costasBase: l.costasBase } };
    }),
    vincos: niv.map((_, i) => ({ nome: `plano${i}`, laco: `l${i}`, nitidez: 'viva' })),
    grupos: [{ nome: 'bordaLarga', trechos: ['borda'] }],
  };
}

/** Fator de espessura da chapa em x: 1 até afina_de e, dali à ponta, desce a afina_ponta / meia espessura. */
export function fatorDeEspessura(T, x) {
  const meia = T.espessura / 2;
  return 1 - (1 - T.afina_ponta / meia) * entre(0, 1, (x - T.afina_de) / (T.comprimento - T.afina_de));
}

/** A chapa sai da gaiola em planos de y fixos; a espessura afina para a ponta aproximando cada ponto do meio da chapa, em metro. */
function chapa(T) {
  const g = gaiolaPorLacos(arbordantosDaChapa(T));
  for (const nome of Object.keys(g.pontos)) {
    const p = g.pontos[nome];
    p[1] = m(T.eixo_y) + (p[1] - m(T.eixo_y)) * fatorDeEspessura(T, p[0] * 1000);
  }
  return g;
}


export function gerarPassos(T = TABELA) {
  const g = chapa(T);
  return [
    ['subdivisao', { origemId: 1, ...g.passo, niveis: 0 }],
    ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
  ];
}

export default {
  meta: { nome: 'chapa-por-lacos', desc: 'chapa de contorno curvo com chanfro largo numa borda, por cinco laços empilhados' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'x no comprimento, y na espessura com o chão em 0, z na largura', ...chapa(this.PARAMS).pontos }; },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};
