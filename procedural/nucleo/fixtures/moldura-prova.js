/* moldura-prova.js — a chapa curva com vão de `friso-prova.js` e as molduras em volta da borda dele, desenhadas por código para a
 * conferência da moldura (`moldura-do-vao.js`).
 *
 * A chapa é a de `friso-prova.js` (9 × 9 pontos a cada 100 mm, duas curvaturas, 2 mm de espessura, o vão de 200 × 200 mm com os quatro
 * cantos vivos). Os frisos seguem a BORDA do vão, os oito pontos da volta de p3_3 a p5_5, com perfil retangular de 5 mm de profundidade
 * centrado na linha. Cada caso devolve os passos e o que a receita declararia em `vaos`:
 *   fechada   — um friso só pela volta, os quatro cantos em meia-esquadria (a moldura da fatia 11, agora na borda do vão);
 *   variavel  — o mesmo com a travessa de 14 mm e o montante de 7 mm, o degrau da fatia 11 nos quatro cantos;
 *   lados     — quatro frisos, um por lado, de corte reto nos cantos: o entalhe do canto;
 *   quePara   — um friso que segue três lados e meio e para antes de fechar a volta;
 *   afastada  — a volta fechada, mas com o perfil afastado da linha: a moldura que não desce até a borda;
 *   metades   — dois frisos que se emendam no meio de dois lados retos, com larguras iguais ou diferentes;
 *   aba       — a aba de 20 mm a 90 graus por três lados da borda, aberta no quarto. */
import { VAO, gaiola, nome } from './friso-prova.js';

export { VAO, nome };
export const PROFUNDIDADE = 0.005;
export const CENTRO_V = 0.001;

/** A volta de pontos do quadrado de a a b (em índices de grade), de (a, a) por x, depois z, de volta a (a, a). */
export function volta(a = VAO.i[0], b = VAO.i[1]) {
  const lista = [];
  for (let i = a; i < b; i++) lista.push(nome(i, a));
  for (let j = a; j < b; j++) lista.push(nome(b, j));
  for (let i = b; i > a; i--) lista.push(nome(i, b));
  for (let j = b; j > a; j--) lista.push(nome(a, j));
  lista.push(nome(a, a));
  return lista;
}
/** A borda do vão, a volta fechada de p3_3 a p5_5. */
export const bordaDoVao = () => volta(VAO.i[0], VAO.i[1]);
export const CANTOS = [nome(VAO.i[0], VAO.j[0]), nome(VAO.i[1], VAO.j[0]), nome(VAO.i[1], VAO.j[1]), nome(VAO.i[0], VAO.j[1])];

const retangulo = (largura, centroU = 0) => ({ retangulo: { largura, profundidade: PROFUNDIDADE, centro: [centroU, CENTRO_V] } });
const chapa = (niveis) => ['subdivisao', { origemId: 1, ...gaiola(), niveis }];
const friso = (id, linha, pontos, largura, extra = {}) => ['friso', { origemId: id, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: linha, pontos }, perfil: retangulo(largura), ...extra }];
const partes = (frisos) => [
  ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
  ...frisos.map((f, k) => ['parte', { nome: f, sel: { origem: { op: 'friso', id: k + 2 } } }]),
];
const caso = (niveis, frisos, vaos) => ({ passos: [chapa(niveis), ...frisos.map(([linha, ...resto], k) => friso(k + 2, linha, ...resto)), ...partes(frisos.map(([linha]) => linha))], vaos });
const declarar = (frisos, extra = {}) => [{ nome: 'janela', borda: bordaDoVao(), frisos, ...extra }];

/** Um friso só pela volta, com a largura única (os cantos são a meia-esquadria de sempre). */
export function fechada({ niveis = 2, largura = 0.01 } = {}) {
  return caso(niveis, [['moldura', bordaDoVao(), largura]], declarar(['moldura']));
}

/** O mesmo com a travessa de 14 mm e o montante de 7 mm: o degrau da fatia 11 nos quatro cantos da borda. */
export function variavel({ niveis = 2, travessa = 0.014, montante = 0.007, referencia = 0.01 } = {}) {
  const [c0, c1, c2, c3] = CANTOS;
  const variacao = { largura: [
    { ponto: c0, antes: montante, depois: travessa }, { ponto: c1, antes: travessa, depois: montante },
    { ponto: c2, antes: montante, depois: travessa }, { ponto: c3, antes: travessa, depois: montante },
  ] };
  return caso(niveis, [['moldura', bordaDoVao(), referencia, { variacao }]], declarar(['moldura']));
}

/** Quatro frisos, um por lado do vão, cada um de corte reto nas pontas: o canto fica com entalhe. */
export function lados({ niveis = 2, largura = 0.01 } = {}) {
  const v = bordaDoVao();
  const lado = (a, b) => v.slice(a, b + 1);
  const frisos = [['lado1', lado(0, 2), largura], ['lado2', lado(2, 4), largura], ['lado3', lado(4, 6), largura], ['lado4', lado(6, 8), largura]];
  return caso(niveis, frisos, declarar(frisos.map(([linha]) => linha)));
}

/** Um friso que segue a borda do canto de baixo até o ponto antes do último e para: a moldura que para antes de fechar a volta. */
export function quePara({ niveis = 2, largura = 0.01, extra = {} } = {}) {
  const pontos = bordaDoVao().slice(0, 8);
  return caso(niveis, [['moldura', pontos, largura]], declarar(['moldura'], extra));
}

/** A volta fechada com o perfil afastado `afastamento` da linha: a moldura que não desce até a borda. */
export function afastada({ niveis = 2, largura = 0.01, afastamento = 0.003 } = {}) {
  return caso(niveis, [['moldura', bordaDoVao(), largura, { perfil: retangulo(largura, afastamento + largura / 2) }]], declarar(['moldura']));
}

/** Dois frisos que se emendam nos pontos do meio de dois lados retos (p4_3 e p4_5), com a largura de cada um. */
export function metades({ niveis = 2, larguraA = 0.01, larguraB = 0.01 } = {}) {
  const v = bordaDoVao();
  const A = v.slice(1, 6); // de p4_3 por p5_3, p5_4, p5_5 até p4_5
  const B = [...v.slice(5, 8), v[0], v[1]]; // de p4_5 por p3_5, p3_4, p3_3 até p4_3
  return caso(niveis, [['metadeA', A, larguraA], ['metadeB', B, larguraB]], declarar(['metadeA', 'metadeB']));
}

/** A aba de 20 mm a 90 graus por três lados da borda do vão, e a quarta aberta; `parcial` entra na declaração. */
export function aba({ niveis = 2, parcial = undefined, lados = 7 } = {}) {
  const pontos = bordaDoVao().slice(0, lados + 1);
  const passos = [chapa(niveis), ['friso', { origemId: 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'abaDoVao', pontos }, aba: { largura: 0.02, angulo: 90, raio: 0.002 } }], ...partes(['abaDoVao'])];
  return { passos, vaos: declarar(['abaDoVao'], parcial === undefined ? {} : { parcial }) };
}
