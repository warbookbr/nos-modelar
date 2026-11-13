/* Peça de ensaio da vista de perto: o plano pede duas vistas de perto da parte, uma com a distância do plano e outra com a padrão. */
export const PASSOS = [
  ['cubo', { origemId: 1, larg: 0.2, alt: 0.3, prof: 0.4 }],
  ['parte', { nome: 'bloco', sel: { origem: { op: 'cubo', id: 1 } } }],
];

export const PLANO = {
  objeto: 'bloco de ensaio de 200 por 300 por 400 mm',
  referencias: ['referencias/alvo.md'],
  escala: { medida: 'a profundidade do bloco', milimetros: 400 },
  partes: [{
    nome: 'bloco',
    forma: 'caixa de 200 por 300 por 400 mm sobre o plano',
    tecnica: 'cubo',
    dePerto: [
      { ponto: [100, 300, 200], oQue: 'a quina de cima: aresta viva de caixa', distancia: 120 },
      { ponto: [-100, 0, -200], oQue: 'a quina de baixo, do outro lado' },
    ],
  }],
  criteriosDeReprovacao: ['a caixa não tem 200 por 300 por 400 mm'],
};
