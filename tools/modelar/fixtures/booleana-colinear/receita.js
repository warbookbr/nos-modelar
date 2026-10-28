/* Peça de ensaio da ferramenta `lasca`: o perfil lateral de uma perua, extrudado em x, menos dois cilindros de 8 lados com o eixo
 * em x. Com o eixo a 390 mm de altura e o raio de 470 mm, a booleana devolve a faceta de cada cilindro dentro do corpo como um
 * hexágono plano de dois cantos colineares, e o núcleo o triangula em quatro faces, duas delas lascas de 2110 por 7,4 mm (razão de
 * área / maior aresta² de 1,9e-3, abaixo do limite de 3e-3). A forma está certa; o que o teste mede é a divisão em faces.
 *
 * Existe só para provar a ferramenta. Quando o núcleo deixar de dividir assim, a peça passa a não ter lasca e o teste que a usa
 * (`lasca.test.mjs`) deve trocar de caso, e não relaxar o que mede.
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
