/* fixture-cubo.js — receita procedural de teste para exportação CAD/STEP. */
export const meta = { nome: 'cubo_fixture' };
export const PASSOS = [
  ['cubo', { origemId: 1, larg: 20, alt: 30, prof: 40 }],
  ['parte', { nome: 'cubo', sel: { origem: { op: 'cubo', id: 1 } } }],
];
