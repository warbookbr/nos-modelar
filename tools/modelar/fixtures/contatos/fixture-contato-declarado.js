/* Duas partes que se encostam, e a receita DIZ que se encostam. Passa.
   É a metade do gate que impede a medida de condenar peça correta. */
export const meta = { nome: 'contato_declarado' };
export const contatos = [
  { par: ['esquerda', 'direita'], motivo: 'as duas metades do bloco se encostam na face comum' },
];
export const PASSOS = [
  ['cubo', { origemId: 1, larg: 10, alt: 10, prof: 10 }],
  ['parte', { nome: 'esquerda', sel: { origem: { op: 'cubo', id: 1 } } }],
  ['cubo', { origemId: 2, larg: 10, alt: 10, prof: 10 }],
  ['transladar', { d: [10, 0, 0], sel: { origem: { op: 'cubo', id: 2 } } }],
  ['parte', { nome: 'direita', sel: { origem: { op: 'cubo', id: 2 } } }],
];
