/* O mesmo tubo apenas assentado na face de cima do cilindro. Passa: só encosta. */
export const meta = { nome: 'contato_so_encosta' };
export const contatos = [
  { par: ['tampa', 'tubo'], motivo: 'o tubo é o pino que apenas assenta na face de cima da tampa' },
];
const inteiro = (id) => ({ unir: [{ origem: { op: 'cilindro', id } }, { origem: { op: 'cilindro', id, tampa: 'fundo' } }, { origem: { op: 'cilindro', id, tampa: 'topo' } }] });
export const ALIASES = [['tampaInteira', inteiro(1)], ['tuboInteiro', inteiro(2)]];
export const PASSOS = [
  ['cilindro', { origemId: 1, raio: 3, altura: 2, lados: 32, eixo: 'y', em: [0, 0, 0] }],
  ['parte', { nome: 'tampa', sel: { alias: 'tampaInteira' } }],
  ['cilindro', { origemId: 2, raio: 0.2, altura: 5, lados: 8, eixo: 'y', em: [0, 2, 0] }],
  ['parte', { nome: 'tubo', sel: { alias: 'tuboInteiro' } }],
];
