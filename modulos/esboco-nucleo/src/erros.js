/* erros.js — a recusa do esboço 2.0: o que o núcleo ou o atalho não fazem volta com o motivo e o lugar. */
export class RecusaDoEsboco extends Error {
  constructor(motivo, onde = null) { super(onde ? `${onde}: ${motivo}` : motivo); this.name = 'RecusaDoEsboco'; this.motivo = motivo; this.onde = onde; }
}
export const recusar = (motivo, onde) => { throw new RecusaDoEsboco(motivo, onde); };
