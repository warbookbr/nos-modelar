/* Peça de ensaio: o plano cita uma prancha desenhada em mm (referencias/lateral.prancha.svg, com o relatório ao lado) e um texto
   (referencias/alvo.md). A prancha entra no pacote do crítico; o texto não, e o pacote avisa. */
export const PASSOS = [
  ['cubo', { origemId: 1, larg: 0.2, alt: 0.3, prof: 0.4 }],
  ['parte', { nome: 'bloco', sel: { origem: { op: 'cubo', id: 1 } } }],
];

export const PLANO = {
  objeto: 'bloco de ensaio de 200 por 300 por 400 mm',
  referencias: ['referencias/lateral.prancha.svg', 'referencias/alvo.md'],
  escala: { medida: 'a profundidade do bloco', milimetros: 400 },
  partes: [{ nome: 'bloco', forma: 'caixa de 200 por 300 por 400 mm sobre o plano', tecnica: 'cubo' }],
  criteriosDeReprovacao: ['a silhueta de lado sai da prancha além da tolerância'],
};

/* a prancha lateral desenha o lado de x negativo, o da vista esquerda da bancada */
export const CRITICA = { referencias: { 'lateral.prancha.svg': 'esquerda' } };
