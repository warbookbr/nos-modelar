/* O `parte` pega só a lateral dos dois cilindros (sem `tampa: 'fundo'` e `tampa: 'topo'`): as partes saem de malha aberta e o contato declarado nunca se confirma.
   A mensagem precisa dizer a causa, e não só que as partes não se tocam. */
export const meta = { nome: 'contato_parte_aberta' };
export const contatos = [
  { par: ['tampa', 'tubo'], motivo: 'o tubo é o pino que apenas assenta na face de cima da tampa' },
];
export const PASSOS = [
  ['cilindro', { origemId: 1, raio: 3, altura: 2, lados: 32, eixo: 'y', em: [0, 0, 0] }],
  ['parte', { nome: 'tampa', sel: { origem: { op: 'cilindro', id: 1 } } }],
  ['cilindro', { origemId: 2, raio: 0.2, altura: 5, lados: 8, eixo: 'y', em: [0, 2, 0] }],
  ['parte', { nome: 'tubo', sel: { origem: { op: 'cilindro', id: 2 } } }],
];
