/* gaiola-por-estacoes-prova.js — a forma de prova da gaiola por estações, desenhada só por código
 *
 * Uma meia chapa de 2,4 m ao longo de z, de x >= 0, que a simetria em x completa: a lateral sobe da borda de baixo até
 * o ombro e o teto vai do ombro à costura em x = 0. A chapa tem duas curvaturas (a planta abaula em z e a seção abaula
 * na lateral e no teto), um vinco vivo na coluna 'cintura' que nasce e morre dentro da lateral, de z = 1,1 a 1,9 m, o
 * ombro como vinco de nitidez 0,75 (raio de borda), um arco recortado na borda de baixo, de z = 0,3 a 0,9 m, e um vão
 * no teto, de z = 1,3 a 1,7 m, entre as colunas 'vaoFora' e 'vaoDentro'. Nenhum número vem de referência externa.
 *
 * A superfície é a função `superficie(z, s)`, com s de 0 (borda de baixo) a 1 (ombro) na lateral e de 1 a 2 (costura)
 * no teto. As colunas são frações de 1/16 em s. Duas gaiolas amostram a mesma função nos pontos das estações e colunas:
 * `definicaoAdensada` usa 1/4 em s longe do vinco e 1/16 perto dele, com as colunas começando (pentágonos) antes do vinco
 * e se fundindo (triângulos) depois; `definicaoGradeCheia` usa 1/16 em s e 5 cm em z em toda a chapa, que é a densidade
 * da adensada perto do vinco, e só tira as colunas de dentro do vão. */

export const COMPRIMENTO = 2.4;
export const NITIDEZ_DO_OMBRO = 0.75;
const PASSO_FINO = 0.05;

const suave = (t) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
const largura = (z) => 0.70 + 0.10 * Math.sin(Math.PI * z / COMPRIMENTO);
const alturaDoOmbro = (z) => 0.75 + 0.05 * Math.sin(Math.PI * z / COMPRIMENTO);
const arco = (z) => { const t = (z - 0.6) / 0.3; return t * t < 1 ? 0.22 * Math.sqrt(1 - t * t) : 0; };
const bordaDeBaixo = (z) => 0.10 + arco(z);
const S_CINTURA = 9 / 16;
const dobra = (z, s) => 0.025 * suave((z - 1.1) / 0.2) * suave((1.9 - z) / 0.2) * Math.max(0, 1 - Math.abs(s - S_CINTURA) / 0.1);

/** superficie(z, s) -> [x, y] da seção na estação z, com s de 0 a 2. */
export function superficie(z, s) {
  if (s <= 1) {
    const yb = bordaDeBaixo(z);
    return [largura(z) - 0.08 * s * s + 0.03 * Math.sin(Math.PI * s) + dobra(z, s), yb + (alturaDoOmbro(z) - yb) * s];
  }
  const r = s - 1;
  return [(largura(z) - 0.08) * (1 - r), alturaDoOmbro(z) + 0.12 * (1 - (1 - r) * (1 - r))];
}

const ESPECIAIS = new Map([[0, 'soleira'], [9, 'cintura'], [16, 'ombro'], [20, 'vaoFora'], [24, 'vaoDentro'], [32, 'centro']]);
/** nomeDaColuna(k) -> o nome da coluna em s = k/16. */
export const nomeDaColuna = (k) => ESPECIAIS.get(k) ?? `s${String(k).padStart(2, '0')}`;
/** nomeDaEstacao(z) -> o nome da estação em z, em centímetros. */
export const nomeDaEstacao = (z) => `z${String(Math.round(z * 100)).padStart(3, '0')}`;

const coluna = (z, k, de) => {
  const c = { nome: nomeDaColuna(k), em: superficie(z, k / 16) };
  if (de) c.de = de.map(nomeDaColuna);
  return c;
};
const estacao = (z, colunas) => ({ nome: nomeDaEstacao(z), em: z, colunas });
const faixa = (de, ate, passo) => { const r = []; for (let k = 0; Math.round((de + k * passo) * 100) <= Math.round(ate * 100); k++) r.push(Math.round((de + k * passo) * 100) / 100); return r; };

const GROSSAS = [0, 4, 8, 12, 16, 20, 24, 28, 32];
const MEIAS = [0, 4, 6, 8, 10, 12, 16, 20, 24, 28, 32];
const FINAS = [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24, 28, 32];

const comuns = {
  eixo: 'z', simetria: 'x',
  vincos: [
    { nome: 'linhaDeCintura', coluna: 'cintura', de: 'z110', ate: 'z190', nitidez: 'viva' },
    { nome: 'ombro', coluna: 'ombro', nitidez: NITIDEZ_DO_OMBRO },
  ],
  vaos: [{ nome: 'claraboia', estacoes: ['z130', 'z170'], colunas: ['vaoFora', 'vaoDentro'] }],
  cantos: ['z130', 'z170'].flatMap((estacao) => ['vaoFora', 'vaoDentro'].map((coluna) => ({ estacao, coluna }))),
};

/** A gaiola adensada só perto do vinco: 1/4 em s longe dele, 1/16 perto, e a transição por pentágono e triângulo. */
export function definicaoAdensada() {
  const estacoes = [];
  for (const z of [0, 0.2, ...faixa(0.25, 0.95, PASSO_FINO)]) estacoes.push(estacao(z, GROSSAS.map((k) => coluna(z, k))));
  // as colunas meias e finas começam sem ligação entre duas que seguem: cada uma fecha um pentágono
  estacoes.push(estacao(1.0, MEIAS.map((k) => coluna(1.0, k))));
  for (const z of faixa(1.05, 1.9, PASSO_FINO)) estacoes.push(estacao(z, FINAS.map((k) => coluna(z, k))));
  // depois do vinco, as finas se fundem duas a duas, e cada fusão fecha um triângulo
  const fusao1 = new Map([[6, [5, 6]], [8, [7, 8]], [10, [9, 10]], [12, [11, 12]]]);
  estacoes.push(estacao(1.95, MEIAS.map((k) => coluna(1.95, k, fusao1.get(k)))));
  const fusao2 = new Map([[4, [4, 6]], [8, [8, 10]]]);
  estacoes.push(estacao(2.0, GROSSAS.map((k) => coluna(2.0, k, fusao2.get(k)))));
  for (const z of [2.2, 2.4]) estacoes.push(estacao(z, GROSSAS.map((k) => coluna(z, k))));
  return { ...comuns, estacoes };
}

/** A mesma forma em grade cheia: 1/16 em s e 5 cm em z na chapa toda; dentro do vão faltam as colunas que ele tira. */
export function definicaoGradeCheia() {
  const todas = Array.from({ length: 33 }, (_, k) => k);
  const semVao = todas.filter((k) => k <= 20 || k >= 24);
  const estacoes = faixa(0, COMPRIMENTO, PASSO_FINO).map((z) => estacao(z, (z > 1.3 && z < 1.7 ? semVao : todas).map((k) => coluna(z, k))));
  return { ...comuns, estacoes };
}
