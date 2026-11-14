/* Uma barra girada 45 graus que apoia só uma ARESTA na tampa do cilindro, e uma face coplanar ao lado: encosta, e passa. */
export const meta = { nome: 'aresta-sobre-a-face' };
export const contatos = [
  { par: ['cilindro', 'haste'], motivo: 'a haste foi declarada em contato com o cilindro, como o encaixe de uma armação' },
];
export const ALIASES = [['cilindroInteiro', { unir: [{ origem: { op: 'cilindro', id: 1 } }, { origem: { op: 'cilindro', id: 1, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: 1, tampa: 'topo' } }] }]];
export const PASSOS = [
  ['cilindro', { origemId: 1, raio: 10, altura: 20, lados: 48 }],
  ['parte', { nome: 'cilindro', sel: { alias: 'cilindroInteiro' } }],
  ['cubo', { origemId: 2, larg: 4, alt: 4, prof: 4 }],
  ['rotaciona', { eixo: 'z', graus: 45, pivo: [0, 0, 0], sel: { origem: { op: 'cubo', id: 2 } } }],
  ['transladar', { d: [0, 20 + 2 * Math.SQRT1_2, 0], sel: { origem: { op: 'cubo', id: 2 } } }],
  ['parte', { nome: 'haste', sel: { origem: { op: 'cubo', id: 2 } } }],
];
