/* lataria-com-vinco — a peça de ensaio da faixa dos vincos na curvatura da lataria: uma chapa de superfície livre por subdivisão,
 * dobrada num vinco vivo declarado, com um amassado largo e raso plantado ao lado dele. É desenhada por código: uma gaiola de 9 × 7
 * pontos nomeados `p<i>_<j>` a cada 100 mm em x e z, plana até o vinco `quina` (a linha j = 2, z = 200 mm) e caindo
 * `ANGULO_DA_QUINA` graus depois dele, com o ponto `p4_4` (x = 400 mm, z = 400 mm, a 200 mm do vinco) afundado `FUNDO` em y. A
 * dobra pedida tem curvatura muitas vezes a do amassado e, se contasse na escala da curvatura, deixaria o amassado quase branco;
 * os testes de `vistas-de-superficie.test.mjs` medem isso. Nenhum número vem de referência externa. */

export const PASSO = 0.1;
export const NX = 9;
export const NZ = 7;
export const J_DO_VINCO = 2;
export const ANGULO_DA_QUINA = 30;
export const FUNDO = 0.0075;
export const AMASSADO = { i: 4, j: 4 };
export const nome = (i, j) => `p${i}_${j}`;

/** A altura da chapa sem o amassado: plana até o vinco e caindo depois dele. */
export const altura = (z) => (z <= PASSO * J_DO_VINCO ? 0 : -(z - PASSO * J_DO_VINCO) * Math.tan((ANGULO_DA_QUINA * Math.PI) / 180));

/** Os pontos nomeados da gaiola, no formato de TOPO. */
export function pontos() {
  const p = {};
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NZ; j++) {
      const x = PASSO * i;
      const z = PASSO * j;
      const fundo = i === AMASSADO.i && j === AMASSADO.j ? FUNDO : 0;
      p[nome(i, j)] = [x, altura(z) - fundo, z];
    }
  }
  return p;
}

function gaiola() {
  const vertices = [];
  const faces = [];
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) vertices.push(nome(i, j));
  for (let i = 0; i < NX - 1; i++) for (let j = 0; j < NZ - 1; j++) faces.push([nome(i, j), nome(i, j + 1), nome(i + 1, j + 1), nome(i + 1, j)]);
  const vincos = [{ nome: 'quina', pontos: Array.from({ length: NX }, (_, i) => nome(i, J_DO_VINCO)), nitidez: 'viva' }];
  return { vertices, faces, vincos, borda: 'cantos' };
}

export default {
  meta: { nome: 'lataria-com-vinco', desc: 'chapa dobrada num vinco vivo com um amassado raso ao lado, para provar a faixa dos vincos na curvatura' },
  PARAMS: {},
  TOPO: { origem: 'canto da gaiola em x = 0 e z = 0, y para cima', ...pontos() },
  PASSOS: [
    ['subdivisao', { origemId: 1, ...gaiola(), niveis: 4 }],
    ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
  ],
  PLANO: {
    objeto: 'chapa de 800 por 600 mm dobrada num vinco vivo, com um amassado raso ao lado dele',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'largura da chapa em x', milimetros: 800 },
    partes: [
      { nome: 'chapa', forma: 'chapa plana até o vinco a 200 mm da borda e caindo 30 graus depois dele, com um amassado raso a 200 mm do vinco', tecnica: 'subdivisao com um vinco vivo nomeado' },
    ],
    criteriosDeReprovacao: ['a chapa tem amassado, ondulação ou dobra que a forma não pede'],
  },
};
