/* gaiola-interpolada-prova.js — a forma de prova da gaiola interpolada, desenhada só por código
 *
 * Uma meia chapa de 2,4 m ao longo de z, de x >= 0, com a seção em quarto de elipse: a coluna de ângulo θ fica em
 * x = W(z) cos θ e y = 0,1 + H(z) sen θ, com θ de 0 (a borda de baixo) a π/2 (a costura em x = 0). A largura W cresce
 * da traseira para a frente e a altura H tem o máximo no meio. As cinco seções-chave, em z = 0, 0,6, 1,2, 1,8 e 2,4 m,
 * são cortes conhecidos da superfície, e entre elas a superfície é a função analítica, contra a qual se mede a gaiola
 * interpolada. Cada coordenada de cada coluna tem o extremo numa chave, como o corte que se tira no ponto mais alto:
 * a interpolação monótona não passa dos nós, e o extremo que cai entre duas chaves sai achatado (com a base subindo
 * 2 cm por metro, o máximo da coluna de 60 graus vai para z = 2,03 m e o desvio sobe de 0,37 a 0,73 mm). Nenhum número
 * vem de referência externa. */

export const COMPRIMENTO = 2.4;
export const CHAVES = [['tras', 0], ['quarto', 0.6], ['meio', 1.2], ['tresQuartos', 1.8], ['frente', 2.4]];
export const COLUNAS = 7;

const largura = (z) => 0.62 + 0.06 * Math.sin(Math.PI * z / (2 * COMPRIMENTO));
const altura = (z) => 0.30 + 0.02 * (1 - ((z - COMPRIMENTO / 2) / (COMPRIMENTO / 2)) ** 2);
const BASE = 0.10;

/** superficie(z, θ) -> [x, y] da seção em z, com θ de 0 a π/2. */
export function superficie(z, teta) {
  return [largura(z) * Math.cos(teta), BASE + altura(z) * Math.sin(teta)];
}

export const angulo = (j) => (j * Math.PI) / (2 * (COLUNAS - 1));
export const nomeDaColuna = (j) => `s${j}`;

/** As cinco estações-chave com as colunas nos ângulos fixos, da borda de baixo à costura, com a normal para fora. */
export function chavesExplicitas() {
  return CHAVES.map(([nome, z]) => ({
    nome, em: z,
    colunas: Array.from({ length: COLUNAS }, (_, j) => { const [x, y] = superficie(z, angulo(j)); return { nome: nomeDaColuna(j), em: [x, y] }; }),
  }));
}

/** As cinco estações-chave com a seção como curva por nove pontos-chave (θ a cada π/16) e as colunas a frações iguais do comprimento. */
export function chavesPorCurva() {
  return CHAVES.map(([nome, z]) => ({
    nome, em: z,
    colunas: [{ curva: 'secao', pontos: Array.from({ length: 9 }, (_, k) => superficie(z, (k * Math.PI) / 16)) }],
  }));
}

export const curvaDaSecao = { nome: 'secao', colunas: Array.from({ length: COLUNAS }, (_, j) => ({ nome: nomeDaColuna(j), fracao: j / (COLUNAS - 1) })) };
