/* Peça fixa para o teste da linha de comando da rodada de modelagem: dois cubos que se encostam, com o contato declarado.
   O teste media "a primeira peça do acervo", que muda quando entra peça nova e herdou o aviso de malha de uma delas; esta não muda. */
export const meta = { nome: 'rodada_de_medicao' };
export const contatos = [
  { par: ['esquerda', 'direita'], motivo: 'os dois cubos se encostam na face comum, de propósito' },
];
export const PASSOS = [
  ['cubo', { origemId: 1, larg: 10, alt: 10, prof: 10 }],
  ['parte', { nome: 'esquerda', sel: { origem: { op: 'cubo', id: 1 } } }],
  ['cubo', { origemId: 2, larg: 10, alt: 10, prof: 10 }],
  ['transladar', { d: [10, 0, 0], sel: { origem: { op: 'cubo', id: 2 } } }],
  ['parte', { nome: 'direita', sel: { origem: { op: 'cubo', id: 2 } } }],
];
