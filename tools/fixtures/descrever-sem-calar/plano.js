/* plano.js — o PLANO mínimo das peças de prova de `descrever-sem-calar.test.mjs`: uma chapa de uma parte só. */
export const planoDaChapa = (descricao) => ({
  objeto: `chapa de prova subdividida com um vão retangular: ${descricao}`,
  referencias: ['referencias/alvo.md'],
  escala: { medida: 'lado da chapa, em milímetro', milimetros: 650 },
  partes: [{
    nome: 'chapa',
    forma: 'chapa plana de 2 mm de espessura, subdividida em dois níveis, com um vão retangular',
    tecnica: 'chapa por grade subdividida com uma abertura por contorno e a parte nomeada pela origem da abertura',
  }],
  criteriosDeReprovacao: [
    'a chapa não tem o vão retangular pedido',
    'a peça sai sem a parte chapa, porque um passo foi recusado',
    'a chapa sai deitada fora do referencial de Y para cima',
  ],
});
