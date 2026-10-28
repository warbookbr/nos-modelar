/* Peça de ensaio da ferramenta `lasca`: o perfil lateral de uma perua, extrudado em x, com uma aresta de 2,8 mm no canto do teto
 * (o ponto [2342, 980] seguido de [2340, 982]). A lateral dessa aresta é um retângulo de 2110 por 2,8 mm, de razão área / maior
 * aresta² de 1,3e-3, abaixo do limite de 3e-3: uma lasca de verdade, da geometria do perfil, que nenhuma correção do núcleo pode
 * fundir (é o caso 7 do plano de ajustes, o arco que corta a base perto de um vértice). Existe só para provar a ferramenta; a
 * fusão das faces da booleana tem a fixture `booleana-colinear`.
 */
const m = (mm) => mm / 1000;
const LADO = [[2282, 198], [2342, 724], [2342, 980], [2340, 982], [1180, 1110], [470, 1580], [-1900, 1580], [-2342, 1190], [-2342, 724], [-2292, 198]];
const antiHorario = (lista) => {
  const area = lista.reduce((soma, [a, b], i) => {
    const [c, d] = lista[(i + 1) % lista.length];
    return soma + (a * d - c * b);
  }, 0) / 2;
  return area < 0 ? [...lista].reverse() : lista;
};
/* Na extrusão em x o núcleo põe [u, v] em y = -u e z = v. */
const PERFIL = antiHorario(LADO.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]);

export const PASSOS = [
  ['extrusao', { origemId: 1, eixo: 'x', altura: 2.11, em: [-1.055, 0, 0], perfil: PERFIL }],
  ['parte', { nome: 'carroceria', sel: { origem: { op: 'extrusao', id: 1 } } }],
];

export default { PASSOS };
