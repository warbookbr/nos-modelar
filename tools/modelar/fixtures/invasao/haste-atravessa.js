/* Uma haste fina que ATRAVESSA o cilindro de lado a lado: nenhum vértice dela fica dentro, só as superfícies se cruzam. O contato está declarado e mesmo assim a peça invade. */
export const meta = { nome: 'haste-atravessa' };
export const contatos = [
  { par: ['cilindro', 'haste'], motivo: 'a haste foi declarada em contato com o cilindro, como o encaixe de uma armação' },
];
export const ALIASES = [['cilindroInteiro', { unir: [{ origem: { op: 'cilindro', id: 1 } }, { origem: { op: 'cilindro', id: 1, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: 1, tampa: 'topo' } }] }]];
export const PASSOS = [
  ['cilindro', { origemId: 1, raio: 10, altura: 20, lados: 48 }],
  ['parte', { nome: 'cilindro', sel: { alias: 'cilindroInteiro' } }],
  ['cubo', { origemId: 2, larg: 40, alt: 2, prof: 2 }],
  ['transladar', { d: [0, 9, 0], sel: { origem: { op: 'cubo', id: 2 } } }],
  ['parte', { nome: 'haste', sel: { origem: { op: 'cubo', id: 2 } } }],
];
