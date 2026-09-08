/* A MESMA geometria da fixture declarada, sem a declaração. Reprova.
   O par é idêntico: o que muda é só a receita ter dito ou não. */
export const meta = { nome: 'contato_nao_declarado' };
export const PASSOS = [
  ['cubo', { origemId: 1, larg: 10, alt: 10, prof: 10 }],
  ['parte', { nome: 'esquerda', sel: { origem: { op: 'cubo', id: 1 } } }],
  ['cubo', { origemId: 2, larg: 10, alt: 10, prof: 10 }],
  ['transladar', { d: [10, 0, 0], sel: { origem: { op: 'cubo', id: 2 } } }],
  ['parte', { nome: 'direita', sel: { origem: { op: 'cubo', id: 2 } } }],
];
