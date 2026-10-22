/* borda-enrolada.js — a borda enrolada de prova da gaiola local, desenhada só por código
 *
 * Uma chapa de 1 m ao longo de z e 0,4 m de altura em y, levemente abaulada, com a normal para +x. Num trecho dela, de
 * z = 0,3 a 0,7 m, a borda de cima enrola para trás sobre a própria chapa, como a moldura de um vidro: a chapa passa da
 * borda, dá meia volta num raio de 4 mm e desce 12 mm atrás de si. O enrolamento cresce e some ao longo do trecho (a
 * fração `quanto(z)` vai de 0 nas pontas a 1 no meio), para a aba não nascer de uma vez. Nenhum número vem de
 * referência externa.
 *
 * Três gaiolas amostram a mesma forma. `definicaoLisa` é a chapa sem a borda, em estações a cada 10 cm e cinco colunas.
 * `definicaoLocal` acrescenta a borda numa região: as estações parciais do meio do passo (z = 0,35, 0,45, 0,55 e 0,65)
 * só cobrem da coluna 'd' à borda de cima, as colunas extras 'd5' e 'd8' graduam o passo até o enrolamento e as seis
 * colunas do enrolamento começam na borda na primeira estação parcial e terminam na última. `definicaoInteira` faz o
 * mesmo com as estações do meio do passo inteiras, que é como a gaiola adensava antes de haver região. */

export const RAIO = 0.004;
export const ABA = 0.012;
export const ALTURA = 0.4;
const COLUNAS = [['a', 0], ['b', 0.1], ['c', 0.2], ['d', 0.3], ['e', ALTURA]];
const PRINCIPAIS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((z) => Math.round(z * 100) / 100);
const MEIOS = [0.35, 0.45, 0.55, 0.65];
export const TRECHO = [0.3, 0.7];

/** chapa(y, z) -> x da chapa lisa. */
export const chapa = (y, z) => 0.04 * Math.sin(Math.PI * z) + 0.02 * (y / ALTURA) ** 2;
const inclinacao = (y) => 0.04 * y / (ALTURA * ALTURA);

/** quanto(z) -> a fração do enrolamento na estação z, de 0 nas pontas do trecho a 1 no meio. */
export const quanto = (z) => (z > TRECHO[0] && z < TRECHO[1] ? Math.sin(Math.PI * (z - TRECHO[0]) / (TRECHO[1] - TRECHO[0])) : 0);

/** enrolamento(z, voltaMaxima) -> as seis colunas da borda enrolada na seção z, [x, y] cada uma: quatro no arco de
 *  meia volta (voltaMaxima, em radianos, padrão π) e duas na aba, que desce na direção em que o arco termina. */
export function enrolamento(z, voltaMaxima = Math.PI) {
  const a = quanto(z);
  const borda = [chapa(ALTURA, z), ALTURA];
  const m = inclinacao(ALTURA); const l = Math.hypot(m, 1);
  const t = [m / l, 1 / l]; const n = [1 / l, -m / l];
  const centro = [borda[0] - RAIO * n[0], borda[1] - RAIO * n[1]];
  const volta = voltaMaxima * a;
  const noArco = (f) => [centro[0] + RAIO * (n[0] * Math.cos(f) + t[0] * Math.sin(f)), centro[1] + RAIO * (n[1] * Math.cos(f) + t[1] * Math.sin(f))];
  const fim = noArco(volta);
  const dir = [-n[0] * Math.sin(volta) + t[0] * Math.cos(volta), -n[1] * Math.sin(volta) + t[1] * Math.cos(volta)];
  const arco = [1, 2, 3, 4].map((j) => noArco(volta * j / 4));
  const aba = [1, 2].map((j) => [fim[0] + dir[0] * ABA * a * j / 2, fim[1] + dir[1] * ABA * a * j / 2]);
  return [...arco, ...aba];
}

const nomeDaEstacao = (z) => (MEIOS.includes(z) ? `m${Math.round(z * 100)}` : `e${String(Math.round(z * 10)).padStart(2, '0')}`);
const ponto = (nome, y, z, extra) => ({ nome, em: [chapa(y, z), y], ...extra });

/* A seção na estação z: as colunas da chapa (todas ou da 'd' em diante), as extras e o enrolamento. */
function secao(z, { parcial, regiao, voltaMaxima }) {
  const dentro = z > TRECHO[0] && z < TRECHO[1];
  const extra = regiao ? { regiao } : {};
  const colunas = COLUNAS.filter(([n]) => !parcial || n >= 'd').map(([n, y]) => ponto(n, y, z));
  if (!dentro) return colunas;
  const primeira = z === MEIOS[0], ultima = z === MEIOS[MEIOS.length - 1];
  const eTem = colunas.findIndex((c) => c.nome === 'e');
  const extras = [ponto('d5', 0.37, z, parcial ? {} : extra)];
  if (!primeira && !ultima) extras.push(ponto('d8', 0.39, z, parcial ? {} : extra));
  colunas.splice(eTem, 0, ...extras);
  enrolamento(z, voltaMaxima).forEach(([x, y], j) => {
    const c = { nome: `h${j + 1}`, em: [x, y], ...(parcial ? {} : extra) };
    if (primeira) c.comeca = true;
    if (ultima) c.termina = true;
    colunas.push(c);
  });
  return colunas;
}

/** definicaoLisa() -> a chapa sem a borda enrolada. */
export const definicaoLisa = () => ({ eixo: 'z', estacoes: PRINCIPAIS.map((z) => ({ nome: nomeDaEstacao(z), em: z, colunas: secao(z, {}).filter((c) => /^[a-e]$/.test(c.nome)) })) });

/** definicaoLocal(voltaMaxima) -> a chapa com a borda enrolada numa região, sem adensar o resto. */
export function definicaoLocal(voltaMaxima) {
  const zs = [...PRINCIPAIS, ...MEIOS].sort((p, q) => p - q);
  return {
    eixo: 'z',
    regioes: [{ nome: 'moldura', estacoes: ['e03', 'e07'], colunas: ['d', null] }],
    estacoes: zs.map((z) => {
      const parcial = MEIOS.includes(z);
      return { nome: nomeDaEstacao(z), em: z, ...(parcial ? { regiao: 'moldura' } : {}), colunas: secao(z, { parcial, regiao: 'moldura', voltaMaxima }) };
    }),
  };
}

/** definicaoInteira() -> a mesma borda com as estações do meio do passo inteiras. */
export function definicaoInteira() {
  const zs = [...PRINCIPAIS, ...MEIOS].sort((p, q) => p - q);
  return { eixo: 'z', estacoes: zs.map((z) => ({ nome: nomeDaEstacao(z), em: z, colunas: secao(z, {}) })) };
}
