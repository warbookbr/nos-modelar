/* fixture-uniao.js — fixture neutra da fatia 5 do plano "União de sólidos":
   uma coluna e um braço unidos por `unir`, pousados numa base. Prova que as
   ferramentas que leem a peça (descrever, portas, contatos, guardas,
   exportação e bancada) funcionam sobre uma malha unida. Não é peça do
   acervo nem exemplo de produto. */
export const meta = { nome: 'fixture_uniao' };
export const contatos = [
  { par: ['base', 'ombro'], motivo: 'o ombro unido pousa na base pela face de baixo da coluna' },
];
export const PASSOS = [
  ['cubo', { origemId: 1, larg: 0.4, alt: 1, prof: 0.4, em: [0, 0.2, 0] }],
  ['cubo', { origemId: 2, larg: 1, alt: 0.3, prof: 0.3, em: [0.3, 0.9, 0] }],
  ['unir', { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }],
  ['parte', { nome: 'ombro', sel: { origem: { op: 'unir', id: 9 } } }],
  ['publicarPorta', { id: 'costura', rotulo: 'Costura do ombro', de: { op: 'unir', id: 9, costura: true } }],
  ['cubo', { origemId: 3, larg: 1.2, alt: 0.2, prof: 0.8 }],
  ['parte', { nome: 'base', sel: { origem: { op: 'cubo', id: 3 } } }],
];
