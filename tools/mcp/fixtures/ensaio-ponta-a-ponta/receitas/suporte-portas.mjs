/* Receita procedural privada do suporte usado no ensaio MCP. */
export default {
  meta: { nome: 'Suporte com interface de ensaio', tipo: 'objeto', fechada: true },
  PASSOS: [
    ['cubo', { origemId: 20, larg: 0.8, alt: 1.1, prof: 0.8 }],
    ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 20 } } }],
    ['publicarPorta', {
      id: 'guiaExterna',
      rotulo: 'Guia externa',
      de: { op: 'cubo', id: 20, face: 'topo' },
      interface: {
        forma: 'cilindro', papel: 'externa', eixo: [0, 1, 0], centro: [0, 1.1, 0],
        raio: 0.1, inicio: 0, fim: 0.4, referencia: [1, 0, 0],
      },
    }],
  ],
};
