/* estrutura.js — chassi H-frame, colunas verticais, travessao superior, pes e pinos da prensa hidraulica. */

export const receitaEstrutura = {
  meta: {
    nome: 'Estrutura da Prensa Hidráulica H-Frame',
    versao: '1.0.0',
    autor: 'Mecanifica Procedural AI',
  },
  PARAMS: {
    larguraTotal: 0.74,
    alturaTotal: 1.77,
    profundidadeTotal: 0.60,
  },
  MATERIAIS: {
    acoEstrutural: { cor: '#2b2f36', metalicidade: 0.82, aspereza: 0.38 },
    acoPinos: { cor: '#828a94', metalicidade: 0.90, aspereza: 0.20 },
  },
  ALIASES: [
    ['pesApoio_total', { unir: [
      { origem: { op: 'cubo', id: 101 } },
      { origem: { op: 'cubo', id: 102 } },
      { origem: { op: 'cubo', id: 103 } },
      { origem: { op: 'cubo', id: 104 } },
      { origem: { op: 'cubo', id: 105 } },
    ]}],
    ['colunas_total', { unir: [
      { origem: { op: 'cubo', id: 111 } },
      { origem: { op: 'cubo', id: 112 } },
      { origem: { op: 'cubo', id: 113 } },
      { origem: { op: 'cubo', id: 114 } },
      { origem: { op: 'cubo', id: 115 } },
      { origem: { op: 'cubo', id: 116 } },
    ]}],
    ['travessaoSuperior_total', { unir: [
      { origem: { op: 'cubo', id: 121 } },
      { origem: { op: 'cubo', id: 122 } },
      { origem: { op: 'cubo', id: 123 } },
      { origem: { op: 'cubo', id: 124 } },
    ]}],
    ['pinosSustentacao_total', { unir: [
      { origem: { op: 'cilindro', id: 131 } },
      { origem: { op: 'cilindro', id: 131, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 131, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 132 } },
      { origem: { op: 'cilindro', id: 132, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 132, tampa: 'fundo' } },
    ]}],
  ],
  PASSOS: [
    // --- 1. PÉS DE APOIO NO PISO E TRAVESSA INFERIOR ---
    // Pé esquerdo: sapata horizontal apoiada em y=0 + aba vertical
    ['cubo', { origemId: 101, larg: 0.08, alt: 0.03, prof: 0.60, em: [-0.32, 0, 0] }],
    ['cubo', { origemId: 102, larg: 0.02, alt: 0.08, prof: 0.60, em: [-0.32, 0.03, 0] }],
    // Pé direito: sapata horizontal apoiada em y=0 + aba vertical
    ['cubo', { origemId: 103, larg: 0.08, alt: 0.03, prof: 0.60, em: [0.32, 0, 0] }],
    ['cubo', { origemId: 104, larg: 0.02, alt: 0.08, prof: 0.60, em: [0.32, 0.03, 0] }],
    // Barra de amarração inferior entre os pés
    ['cubo', { origemId: 105, larg: 0.56, alt: 0.04, prof: 0.06, em: [0, 0.03, 0] }],

    // --- 2. COLUNAS VERTICAIS H-FRAME (PERFIS EM C DUPLO APOIADOS NOS PÉS) ---
    // Coluna esquerda: alma lateral + abas frontal e traseira (y de 0.03 a 1.75)
    ['cubo', { origemId: 111, larg: 0.02, alt: 1.72, prof: 0.20, em: [-0.35, 0.03, 0] }],
    ['cubo', { origemId: 112, larg: 0.06, alt: 1.72, prof: 0.03, em: [-0.32, 0.03, 0.085] }],
    ['cubo', { origemId: 113, larg: 0.06, alt: 1.72, prof: 0.03, em: [-0.32, 0.03, -0.085] }],
    // Coluna direita: alma lateral + abas frontal e traseira (y de 0.03 a 1.75)
    ['cubo', { origemId: 114, larg: 0.02, alt: 1.72, prof: 0.20, em: [0.35, 0.03, 0] }],
    ['cubo', { origemId: 115, larg: 0.06, alt: 1.72, prof: 0.03, em: [0.32, 0.03, 0.085] }],
    ['cubo', { origemId: 116, larg: 0.06, alt: 1.72, prof: 0.03, em: [0.32, 0.03, -0.085] }],

    // --- 3. TRAVESSÃO SUPERIOR DE CARGA ---
    // Placa inferior de assentamento (y de 1.57 a 1.59)
    ['cubo', { origemId: 124, larg: 0.28, alt: 0.02, prof: 0.20, em: [0, 1.57, 0] }],
    // Vigas transversais frontal e traseira (y de 1.59 a 1.75)
    ['cubo', { origemId: 121, larg: 0.74, alt: 0.16, prof: 0.03, em: [0, 1.59, 0.085] }],
    ['cubo', { origemId: 122, larg: 0.74, alt: 0.16, prof: 0.03, em: [0, 1.59, -0.085] }],
    // Placa superior de fechamento / montagem (y de 1.75 a 1.77)
    ['cubo', { origemId: 123, larg: 0.28, alt: 0.02, prof: 0.20, em: [0, 1.75, 0] }],

    // --- 4. PINOS TRANSVERSAIS DE TRAVAMENTO DA MESA (CENTRADOS EM Z) ---
    ['cilindro', { origemId: 131, raio: 0.015, altura: 0.26, lados: 16, eixo: 'z', em: [-0.32, 0.55, -0.13] }],
    ['cilindro', { origemId: 132, raio: 0.015, altura: 0.26, lados: 16, eixo: 'z', em: [0.32, 0.55, -0.13] }],

    // --- 5. NOMEAÇÃO SEMÂNTICA DAS PARTES ---
    ['parte', { nome: 'pesApoio', sel: { alias: 'pesApoio_total' } }],
    ['parte', { nome: 'colunas', sel: { alias: 'colunas_total' } }],
    ['parte', { nome: 'travessaoSuperior', sel: { alias: 'travessaoSuperior_total' } }],
    ['parte', { nome: 'pinosSustentacao', sel: { alias: 'pinosSustentacao_total' } }],

    // --- 6. ATRIBUIÇÃO DE MATERIAIS ---
    ['material', { usa: 'acoEstrutural', sel: { grupo: 'pesApoio' } }],
    ['material', { usa: 'acoEstrutural', sel: { grupo: 'colunas' } }],
    ['material', { usa: 'acoEstrutural', sel: { grupo: 'travessaoSuperior' } }],
    ['material', { usa: 'acoPinos', sel: { grupo: 'pinosSustentacao' } }],
  ],
};

export default receitaEstrutura;
