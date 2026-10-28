/* O caso da roda, em miniatura: uma parte inteiramente dentro da outra.
   Nenhuma superfície aparece de fora, e por isso nenhuma vista mostra. */
export const meta = { nome: 'parte_engolida' };
export const PASSOS = [
  ['cubo', { origemId: 1, larg: 20, alt: 20, prof: 20 }],
  ['parte', { nome: 'casca', sel: { origem: { op: 'cubo', id: 1 } } }],
  ['cubo', { origemId: 2, larg: 4, alt: 4, prof: 4 }],
  ['transladar', { d: [0, 8, 0], sel: { origem: { op: 'cubo', id: 2 } } }],
  ['parte', { nome: 'miolo', sel: { origem: { op: 'cubo', id: 2 } } }],
];
