/* Receita procedural privada do pino usado no ensaio MCP. */
export default {
  meta: { nome: 'Pino guia de ensaio', tipo: 'objeto', fechada: true },
  PASSOS: [
    ['cubo', { origemId: 30, larg: 0.4, alt: 0.5, prof: 0.4 }],
    ['parte', { nome: 'pino', sel: { origem: { op: 'cubo', id: 30 } } }],
    ['publicarPorta', {
      id: 'guiaInterna',
      rotulo: 'Guia interna',
      de: { op: 'cubo', id: 30, face: 'fundo' },
      interface: {
        forma: 'cilindro', papel: 'interna', eixo: [0, 1, 0], centro: [0, 0, 0],
        raio: 0.1, inicio: 0, fim: 0.5, referencia: [1, 0, 0],
      },
    }],
  ],
};
