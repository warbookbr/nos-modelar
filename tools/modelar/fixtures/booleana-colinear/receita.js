/* Caso 1 do plano de ajustes no núcleo: o perfil lateral de uma perua, extrudado em x, menos dois cilindros de 8 lados com o eixo
 * em x. Com o eixo a 390 mm de altura e o raio de 470 mm, a faceta de cada cilindro dentro do corpo é um hexágono plano de dois
 * cantos colineares. Até a fatia 10 a booleana o devolvia em quatro triângulos, dois deles lascas de 2110 por 7,4 mm (razão de
 * área / maior aresta² de 1,9e-3, abaixo do limite de 3e-3), 65 faces no total; com os pedaços coplanares fundidos a faceta é uma
 * face só, são 49 faces e nenhuma lasca. A forma é a mesma (a booleana exata do Blender dá o mesmo volume).
 *
 * Prova a fusão da booleana (`booleana-colinear.test.mjs`). Quando o núcleo mudar a divisão em faces de novo, o teste que a usa
 * troca o número de faces, e não relaxa o que mede: a forma igual e nenhuma lasca.
 */
const m = (mm) => mm / 1000;
const LADO = [[2282, 198], [2342, 724], [2342, 980], [1180, 1110], [470, 1580], [-1900, 1580], [-2342, 1190], [-2342, 724], [-2292, 198]];
const antiHorario = (lista) => {
  const area = lista.reduce((soma, [a, b], i) => {
    const [c, d] = lista[(i + 1) % lista.length];
    return soma + (a * d - c * b);
  }, 0) / 2;
  return area < 0 ? [...lista].reverse() : lista;
};
/* Na extrusão em x o núcleo põe [u, v] em y = -u e z = v. */
const PERFIL = antiHorario(LADO.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]);

const RODAS = [1322, -1322];
const cilindroInteiro = (id) => ({
  unir: [{ origem: { op: 'cilindro', id } }, { origem: { op: 'cilindro', id, tampa: 'fundo' } }, { origem: { op: 'cilindro', id, tampa: 'topo' } }],
});

export const ALIASES = RODAS.map((_, k) => [`cil${10 + k}`, cilindroInteiro(10 + k)]);

export const PASSOS = [
  ['extrusao', { origemId: 1, eixo: 'x', altura: 2.11, em: [-1.055, 0, 0], perfil: PERFIL }],
  ...RODAS.map((z, k) => ['cilindro', { origemId: 10 + k, raio: m(470), altura: 2.4, lados: 8, eixo: 'x', em: [-1.2, m(390), m(z)] }]),
  ['subtrair', { origemId: 30, solidos: [{ origem: { op: 'extrusao', id: 1 } }, ...RODAS.map((_, k) => ({ alias: `cil${10 + k}` }))] }],
  ['parte', { nome: 'carroceria', sel: { origem: { op: 'subtrair', id: 30 } } }],
];

export default { PASSOS, ALIASES };
