/* A receita promete um ANEL e entrega um anel. Passa.
   `lathe` revolve um perfil fechado: o resultado tem furo passante. */
export const meta = { nome: 'forma_anel_cumprida' };
export const formas = { aro: 'anel' };
export const PASSOS = [
  ['lathe', {
    origemId: 1, lados: 24, eixo: 'x', em: [0, 0, 0],
    perfil: [[6, -1], [10, -1], [10, 1], [6, 1], [6, -1]],
  }],
  ['parte', { nome: 'aro', sel: { origem: { op: 'lathe', id: 1 } } }],
];
