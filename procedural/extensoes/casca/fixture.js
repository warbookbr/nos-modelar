/* fixture.js — receita sintética da extensão: caixa oca aberta em cima. */
export const PASSOS = [
  ['cubo', { origemId: 1, larg: 2, alt: 1, prof: 3 }],
  ['casca', { origemId: 9, solido: { origem: { op: 'cubo', id: 1 } }, abertas: { origem: { op: 'cubo', id: 1, face: 'topo' } }, espessura: 0.1 }],
];
