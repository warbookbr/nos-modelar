/* fixture-cubo-material.js — caixa com todas as faces em um material declarado, para a exportação OBJ com texturas. */
export const meta = { nome: 'caixa_material_fixture' };
export const MATERIAIS = { madeira: { cor: '#b08050' } };
export const PASSOS = [
  ['cubo', { origemId: 1, larg: 20, alt: 30, prof: 40 }],
  ['material', { usa: 'madeira', sel: { tudo: true } }],
  ['parte', { nome: 'caixa', sel: { origem: { op: 'cubo', id: 1 } } }],
];
