/* gaiola-gota-prova.js — a chapa curva com um vão em forma de gota, de ponta estreita, desenhada por código na escala de uma carroceria
 *
 * A chapa é um painel de uns 1000 × 500 mm de duas curvaturas (raio 1800 mm em x e 2500 mm em z), a normal para cima, montado por
 * `gaiolaPorEstacoes` com as estações ao longo de z (uns 50 mm uma da outra dentro do vão e a 65 mm fora dele) e 11 colunas em
 * x: as duas da borda do vão, 'baixo' e 'cima', e três de cada lado a 45 mm uma da outra, a última delas a borda da chapa, de modo
 * que a grade segue a gota e a chapa estreita na ponta. A abertura é uma gota de 450 mm de comprimento: 230 mm de altura na estação
 * larga (z = 300 mm) e 10 mm na ponta (z = 750 mm), com os dois lados retos. O vão declarado, 'gota', vai da estação do começo à do
 * fim e da coluna 'baixo' à coluna 'cima'; as colunas do meio ('m1' a 'm5') só existem na estação do começo, e as faces entre as
 * estações do vão e as duas colunas da borda saem. Nenhum número vem de referência externa.
 *
 * `margens` (mm) afasta a borda do vão da abertura: `inicio` e `fim` nas estações das pontas, `baixo` e `cima` nas colunas. Com todas
 * zero o vão é a própria abertura; com margens, a borda do vão é o contorno da abertura levado para fora por elas, e os anéis com recuo
 * as devolvem. */
import { gaiolaPorEstacoes } from '../gaiola-por-estacoes.js';

export const XC = 0.32;
export const Z_LARGA = 0.3;
export const Z_PONTA = 0.75;
export const META_LARGA = 0.115;
export const META_PONTA = 0.005;
export const INCLINACAO = (META_LARGA - META_PONTA) / (Z_PONTA - Z_LARGA);
export const SECANTE = Math.sqrt(1 + INCLINACAO * INCLINACAO);
const inclinacaoDe = (meiaPonta) => (META_LARGA - meiaPonta) / (Z_PONTA - Z_LARGA);
export const PASSO_DA_GRADE = 0.045;
export const COLUNAS_DE_FORA = 3;

export const altura = (x, z) => 0.3 - ((x - XC) ** 2) / (2 * 1.8) - ((z - 0.5) ** 2) / (2 * 2.5);

/** meiaAltura(z): a meia altura da abertura na estação z, entre as estações larga e da ponta. */
export const meiaAltura = (z) => META_LARGA - INCLINACAO * (z - Z_LARGA);

/**
 * montagem({ margens, aneis, vincos, medidas, extra }): a gaiola por estações da chapa com o vão 'gota' e os anéis pedidos.
 * Devolve também `nomes` com a estação e a coluna das pontas do vão.
 */
export function montagem({ margens = {}, meiaPonta = META_PONTA, salto = 0, meio = 5, colunasDeFora = COLUNAS_DE_FORA, estacoesAntes = 5, aneis = [], vincos = [], medidas = null, pesoDosAneis = 5, extra = {} } = {}) {
  const inclinacao = inclinacaoDe(meiaPonta);
  const m = { inicio: 0, fim: 0, baixo: 0, cima: 0, ...margens };
  const zi = Z_LARGA - m.inicio / 1000, zf = Z_PONTA + m.fim / 1000;
  const secante = Math.sqrt(1 + inclinacao * inclinacao);
  const mB = m.baixo / 1000 * secante, mT = m.cima / 1000 * secante;
  const meiaFora = (z) => (z <= zf ? META_LARGA - inclinacao * (z - Z_LARGA) : META_LARGA - inclinacao * (zf - Z_LARGA) + 0.025 * (Math.sqrt(1 + ((z - zf) / 0.1) ** 2) - 1));
  /* dentro do vão as estações andam a uns 50 mm, e a primeira e a última distam `salto` mm das pontas, onde os cantos arredondados
     da abertura precisam de espaço entre a esquina e o primeiro ponto do lado */
  const saltoM = salto / 1000;
  const miolo = Math.max(1, Math.round((zf - zi - 2 * saltoM) / 0.05));
  const dentro = saltoM > 0
    ? [zi, ...Array.from({ length: miolo + 1 }, (_, k) => zi + saltoM + (zf - zi - 2 * saltoM) * k / miolo), zf]
    : Array.from({ length: Math.max(2, Math.round((zf - zi) / 0.05)) + 1 }, (_, k) => zi + (zf - zi) * k / Math.max(2, Math.round((zf - zi) / 0.05)));
  const antes = Array.from({ length: estacoesAntes }, (_, k) => zi - 0.065 * (estacoesAntes - k));
  const depois = [0.065, 0.13, 0.2].map((d) => zf + d);
  const zs = [...antes, ...dentro, ...depois];
  const estacoes = zs.map((z, k) => {
    const meia = z < zi ? meiaFora(zi) : meiaFora(z);
    const xb = XC - meia - mB, xt = XC + meia + mT;
    const colunas = [];
    const por = (nome, x) => colunas.push({ nome, em: [x, altura(x, z)] });
    for (let j = 0; j < colunasDeFora; j++) por(`c${j}`, xb - (colunasDeFora - j) * PASSO_DA_GRADE);
    por('baixo', xb);
    if (z <= zi + 1e-12) for (let k2 = 1; k2 <= meio; k2++) por(`m${k2}`, xb + (xt - xb) * k2 / (meio + 1));
    por('cima', xt);
    for (let j = 0; j < colunasDeFora; j++) por(`d${j}`, xt + (j + 1) * PASSO_DA_GRADE);
    return { nome: `e${k}`, em: z, colunas };
  });
  const primeira = estacoes.findIndex((s) => Math.abs(s.em - zi) < 1e-9);
  const ultima = estacoes.findIndex((s) => Math.abs(s.em - zf) < 1e-9);
  const nomes = { inicio: `e${primeira}`, fim: `e${ultima}`, baixo: 'baixo', cima: 'cima' };
  const g = gaiolaPorEstacoes({
    eixo: 'z', virar: true, estacoes,
    vaos: [{ nome: 'gota', estacoes: [nomes.inicio, nomes.fim], colunas: [nomes.baixo, nomes.cima] }],
    ...(aneis.length ? { aneis } : {}), vincos,
    medidas: medidas ?? [...estacoes.map((s) => ({ estacao: s.nome })), ...aneis.map((a) => ({ anel: a.nome, peso: pesoDosAneis }))],
    ...extra,
  });
  return Object.assign(g, { nomes, estacoesDaChapa: estacoes.map((s) => s.nome) });
}

/** receita(opcoes): a receita { PARAMS, TOPO, PASSOS } da chapa, para as ferramentas que leem a receita. */
export function receita(opcoes = {}, niveis = 2) {
  const g = montagem(opcoes);
  return {
    PARAMS: {},
    TOPO: g.pontos,
    PASSOS: [
      ['subdivisao', { origemId: 1, ...g.passo, borda: 'cantos', niveis }],
      ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    ],
  };
}

export const MARGENS_DE_DENTRO = Object.freeze({ inicio: 70, fim: 70, baixo: 60, cima: 80 });
export const PLANTA_DE_DENTRO = Object.freeze({ salto: 110, meio: 1, colunasDeFora: 2, estacoesAntes: 4 });

/**
 * gota({ modo, relevo, peso, anel }): as opções de `montagem` para a gota com um anel de três voltas a 10 mm. `modo: 'fora'` (padrão) é o anel
 * de recuo 0, com a abertura na própria borda do vão e as voltas para fora, sobre a grade. `modo: 'dentro'` é o vão maior que a abertura, com
 * um recuo para cada lado (60 mm embaixo, 80 mm em cima e 70 mm nas pontas), cantos de 50 mm na estação larga e a ponta viva; a planta dele tem
 * as estações das pontas a 110 mm da seguinte e uma coluna só no meio do começo, para o canto de 50 mm caber entre a esquina e o primeiro ponto.
 * Com `relevo`, a volta 2 sobe 10 mm pela normal, com a medida de peso `peso`, e as voltas 1 e 3 são vincos vivos. `anel` troca campos do anel.
 */
export function gota({ modo = 'fora', relevo = false, peso = 100, anel = {} } = {}) {
  const planta = modo === 'dentro' ? { margens: { ...MARGENS_DE_DENTRO }, ...PLANTA_DE_DENTRO } : {};
  const sem = montagem(planta);
  const n = sem.nomes;
  const base = modo === 'dentro'
    ? { nome: 'g', vao: 'gota', recuo: { [n.baixo]: 60, [n.cima]: 80, [n.inicio]: 70, [n.fim]: 70 }, voltas: 3, largura: 10, raio: 50, raios: { [`${n.fim}_baixo`]: 0, [`${n.fim}_cima`]: 0 } }
    : { nome: 'g', vao: 'gota', recuo: 0, voltas: 3, largura: 10 };
  const opcoes = { ...planta, aneis: [{ ...base, ...(relevo ? { relevo: [0, 10, 0] } : {}), ...anel }] };
  if (relevo) {
    opcoes.vincos = [{ nome: 'molduraDeDentro', anel: 'g', volta: 1, nitidez: 'viva' }, { nome: 'molduraDeFora', anel: 'g', volta: 3, nitidez: 'viva' }];
    /* a volta deslocada leva o peso grande. Na grade grossa do vão maior que a abertura, onde o canto de 50 mm abre a costura, a volta 3 leva peso 5, que
       a mantém sobre a chapa: sem ele o calombo de uma face de 110 mm passa de 0,3 mm. Com recuo 0 a volta 1 é a borda do vão, com a cota das estações. */
    opcoes.medidas = [...sem.estacoesDaChapa.map((estacao) => ({ estacao })), { anel: 'g', volta: 2, peso }, ...(modo === 'dentro' ? [{ anel: 'g', volta: 3, peso: 5 }] : [])];
  }
  return opcoes;
}

export default receita(gota({ relevo: true }));
