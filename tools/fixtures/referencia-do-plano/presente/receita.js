/* Peça de ensaio: o plano cita referencias/alvo.md e a pasta tem o arquivo. */
export const PASSOS = [
  ['cubo', { origemId: 1, larg: 0.2, alt: 0.3, prof: 0.4 }],
  ['parte', { nome: 'bloco', sel: { origem: { op: 'cubo', id: 1 } } }],
];

export const PLANO = {
  objeto: 'bloco de ensaio de 200 por 300 por 400 mm',
  referencias: ['referencias/alvo.md'],
  escala: { medida: 'a profundidade do bloco', milimetros: 400 },
  partes: [{ nome: 'bloco', forma: 'caixa de 200 por 300 por 400 mm sobre o plano', tecnica: 'cubo' }],
  criteriosDeReprovacao: ['a caixa não tem 200 por 300 por 400 mm'],
};
