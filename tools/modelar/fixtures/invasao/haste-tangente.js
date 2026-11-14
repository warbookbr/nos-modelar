/* A mesma haste pousada sobre a tampa do cilindro (face contra face, sem entrar): encosta e passa. */
export const meta = { nome: 'haste-tangente' };
export const contatos = [
  { par: ['cilindro', 'haste'], motivo: 'a haste foi declarada em contato com o cilindro, como o encaixe de uma armação' },
];
export const ALIASES = [['cilindroInteiro', { unir: [{ origem: { op: 'cilindro', id: 1 } }, { origem: { op: 'cilindro', id: 1, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: 1, tampa: 'topo' } }] }]];
export const PASSOS = [
  ['cilindro', { origemId: 1, raio: 10, altura: 20, lados: 48 }],
  ['parte', { nome: 'cilindro', sel: { alias: 'cilindroInteiro' } }],
  ['cubo', { origemId: 2, larg: 40, alt: 2, prof: 2 }],
  ['transladar', { d: [0, 20, 0], sel: { origem: { op: 'cubo', id: 2 } } }],
  ['parte', { nome: 'haste', sel: { origem: { op: 'cubo', id: 2 } } }],
];
