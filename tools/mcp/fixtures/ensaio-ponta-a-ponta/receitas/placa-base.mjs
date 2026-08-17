/* Receita procedural privada da placa base usada no ensaio MCP. */
export default {
  meta: { nome: 'Placa base de ensaio', tipo: 'objeto', fechada: true },
  PASSOS: [
    ['cubo', { origemId: 10, larg: 1.6, alt: 0.2, prof: 0.9 }],
    ['parte', { nome: 'base', sel: { origem: { op: 'cubo', id: 10 } } }],
  ],
};
