/* receita de fixture do dossiê: uma parte de um objeto de várias partes. */
export const PLANO = { objeto: 'parte tampa do objeto com partes', referencias: [], escala: { medida: 'largura', milimetros: 100 }, partes: [{ nome: 'tampa', forma: 'bloco' }], criteriosDeReprovacao: ['bloco torto'] };
export default { PLANO, PASSOS: [['cubo', { origemId: 1, larg: 0.1, alt: 0.1, prof: 0.1 }], ['parte', { nome: 'tampa', sel: { origem: { op: 'cubo', id: 1 } } }]] };
