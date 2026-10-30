/* friso-prova.js — a chapa curva com vão e os frisos desenhados por código para o teste do passo `friso`.
 *
 * A chapa é uma gaiola de 9 × 9 pontos nomeados `p<i>_<j>` a cada 100 mm em x e z, amostrando uma superfície de duas
 * curvaturas (raio 600 mm em x e 900 mm em z) com 2 mm de espessura, todos os pontos medidos, borda com cantos e um vão
 * de 200 × 200 mm no meio com os quatro cantos vivos. Três frisos seguem linhas nomeadas da gaiola: um tubo de 6 mm em
 * volta fechada ao redor do vão, uma passada fora dele, que dobra 90 graus nos quatro cantos; uma nervura retangular de
 * 8 × 5 mm de ponta aberta ao longo de uma linha; e um friso de perfil trapezoidal livre com ponta fechada. Cada friso
 * entra na chapa pela parte de v negativo do perfil, e as partes e os contatos são declarados. Nenhum dado vem de
 * referência externa. */

export const ESPESSURA = 0.002;
export const PASSO = 0.1;
export const N = 9;
export const VAO = { i: [3, 5], j: [3, 5] };
export const altura = (x, z) => 0.3 - ((x - 0.4) ** 2) / (2 * 0.6) - ((z - 0.4) ** 2) / (2 * 0.9);
export const nome = (i, j) => `p${i}_${j}`;

export const TUBO = { raio: 0.003, centro: 0.002, segmentosArco: 4 };
export const NERVURA = { largura: 0.008, profundidade: 0.005, centro: 0.002 };
export const ABA = [[-0.005, -0.001], [0.005, -0.001], [0.002, 0.004], [-0.002, 0.004]];

/** pontos(): os pontos nomeados da gaiola, no formato de PARAMS. */
export function pontos() {
  const p = {};
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x = PASSO * i, z = PASSO * j; p[nome(i, j)] = [x, altura(x, z), z]; }
  return p;
}

const noVao = (i, j) => i >= VAO.i[0] && i < VAO.i[1] && j >= VAO.j[0] && j < VAO.j[1];

/** gaiola(): o passo subdivisao da chapa, sem origemId nem níveis. */
export function gaiola() {
  const vertices = []; const faces = [];
  /* o ponto de dentro do vão não tem face e fica fora da gaiola */
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (!(i > VAO.i[0] && i < VAO.i[1] && j > VAO.j[0] && j < VAO.j[1])) vertices.push(nome(i, j));
  for (let i = 0; i < N - 1; i++) for (let j = 0; j < N - 1; j++) if (!noVao(i, j)) faces.push([nome(i, j), nome(i, j + 1), nome(i + 1, j + 1), nome(i + 1, j)]);
  const cantos = [[VAO.i[0], VAO.j[0]], [VAO.i[1], VAO.j[0]], [VAO.i[1], VAO.j[1]], [VAO.i[0], VAO.j[1]]].map(([i, j]) => nome(i, j));
  return { vertices, faces, cantos, borda: 'cantos', medidas: [...vertices], espessura: ESPESSURA };
}

/** A volta ao redor do vão, uma passada fora dele: de (2, 2) a (6, 2), (6, 6), (2, 6) e de volta. */
export function voltaDoVao() {
  const [a, b] = [VAO.i[0] - 1, VAO.i[1] + 1];
  const lista = [];
  for (let i = a; i < b; i++) lista.push(nome(i, a));
  for (let j = a; j < b; j++) lista.push(nome(b, j));
  for (let i = b; i > a; i--) lista.push(nome(i, b));
  for (let j = b; j > a; j--) lista.push(nome(a, j));
  lista.push(nome(a, a));
  return lista;
}
export const linhaDaNervura = () => [1, 2, 3, 4, 5, 6, 7].map((i) => nome(i, 7));
export const linhaDaAba = () => [1, 2, 3, 4, 5].map((j) => nome(7, j));

/** passos({ niveis, extra }): a chapa, os três frisos e as partes. `extra` substitui campos de um friso por nome. */
export function passos({ niveis = 2, extra = {} } = {}) {
  return [
    ['subdivisao', { origemId: 1, ...gaiola(), niveis }],
    ['friso', { origemId: 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'voltaDoVao', pontos: voltaDoVao() }, perfil: { circulo: { raio: TUBO.raio, centro: [0, TUBO.centro] } }, segmentosArco: TUBO.segmentosArco, ...extra.voltaDoVao }],
    ['friso', { origemId: 3, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'nervura', pontos: linhaDaNervura() }, perfil: { retangulo: { largura: NERVURA.largura, profundidade: NERVURA.profundidade, centro: [0, NERVURA.centro] } }, ponta: 'aberta', ...extra.nervura }],
    ['friso', { origemId: 4, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'aba', pontos: linhaDaAba() }, perfil: ABA, ponta: 'fechada', fechamento: 0.03, ...extra.aba }],
    ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    ['parte', { nome: 'voltaDoVao', sel: { origem: { op: 'friso', id: 2 } } }],
    ['parte', { nome: 'nervura', sel: { origem: { op: 'friso', id: 3 } } }],
    ['parte', { nome: 'aba', sel: { origem: { op: 'friso', id: 4 } } }],
  ];
}

export const CONTATOS = ['voltaDoVao', 'nervura', 'aba'].map((friso) => ({ par: ['chapa', friso], motivo: `o friso ${friso} entra na chapa pela base do perfil, menos que a espessura` }));

/* A MOLDURA DE LARGURA VARIÁVEL. A mesma volta do vão (de (2, 2) a (6, 2), (6, 6), (2, 6) e de volta, com os quatro cantos
   vivos de 90 graus), agora como moldura plana de seção retangular que é mais larga nas travessas (os trechos ao longo de x,
   14 mm) que nos montantes (os trechos ao longo de z, 7 mm). A largura muda em degrau nos quatro cantos, e a junta de cada
   canto é a meia-esquadria de duas faixas de larguras diferentes. O perfil de referência tem 10 mm de largura; a largura de
   cada ponto o escala em u. */
export const MOLDURA = { travessa: 0.014, montante: 0.007, referencia: 0.01, profundidade: 0.005, centro: 0.001 };

/** variacaoDaMoldura(): a largura por ponto, com o degrau nos quatro cantos da volta do vão. */
export function variacaoDaMoldura({ travessa = MOLDURA.travessa, montante = MOLDURA.montante } = {}) {
  const [a, b] = [VAO.i[0] - 1, VAO.i[1] + 1];
  /* a volta segue a travessa de baixo (ao longo de x), o montante de b, a travessa de cima e o montante de a */
  return {
    largura: [
      { ponto: nome(a, a), antes: montante, depois: travessa },
      { ponto: nome(b, a), antes: travessa, depois: montante },
      { ponto: nome(b, b), antes: montante, depois: travessa },
      { ponto: nome(a, b), antes: travessa, depois: montante },
    ],
  };
}

export const CONTATOS_DA_MOLDURA = [{ par: ['chapa', 'moldura'], motivo: 'a moldura entra na chapa pela base do perfil, menos que a espessura' }];

/** passosDaMoldura({ niveis, extra }): a chapa e a moldura de largura variável, com as duas partes. `extra` substitui campos do friso. */
export function passosDaMoldura({ niveis = 2, extra = {} } = {}) {
  return [
    ['subdivisao', { origemId: 1, ...gaiola(), niveis }],
    ['friso', { origemId: 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'molduraDoVao', pontos: voltaDoVao() }, perfil: { retangulo: { largura: MOLDURA.referencia, profundidade: MOLDURA.profundidade, centro: [0, MOLDURA.centro] } }, variacao: variacaoDaMoldura(), ...extra }],
    ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    ['parte', { nome: 'moldura', sel: { origem: { op: 'friso', id: 2 } } }],
  ];
}
