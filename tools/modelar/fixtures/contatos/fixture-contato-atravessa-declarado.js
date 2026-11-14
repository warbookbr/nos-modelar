/* O tubo fino entra pela tampa do cilindro e sai pela base: o contato está declarado e a parte atravessa a outra. Com o limite declarado, reprova pela profundidade. */
export const meta = { nome: 'contato_atravessa_declarado' };
export const contatos = [
  { par: ['tampa', 'tubo'], motivo: 'o tubo é o pino que a tampa deveria só tocar na face de cima, entrando no máximo 0,1', penetracaoMaxima: 0.1 },
];
const inteiro = (id) => ({ unir: [{ origem: { op: 'cilindro', id } }, { origem: { op: 'cilindro', id, tampa: 'fundo' } }, { origem: { op: 'cilindro', id, tampa: 'topo' } }] });
export const ALIASES = [['tampaInteira', inteiro(1)], ['tuboInteiro', inteiro(2)]];
export const PASSOS = [
  ['cilindro', { origemId: 1, raio: 3, altura: 2, lados: 32, eixo: 'y', em: [0, 0, 0] }],
  ['parte', { nome: 'tampa', sel: { alias: 'tampaInteira' } }],
  ['cilindro', { origemId: 2, raio: 0.2, altura: 8, lados: 8, eixo: 'y', em: [0, -3, 0] }],
  ['parte', { nome: 'tubo', sel: { alias: 'tuboInteiro' } }],
];
