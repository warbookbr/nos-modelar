/* ferramentas.js — estampo progressivo industrial de 4 estagios: base inferior, 4 colunas de guia com buchas, matriz inferior, guias de tira e puncoes superiores. */

export const receitaFerramentas = {
  meta: {
    nome: 'Estampo Progressivo Industrial de 4 Estágios',
    versao: '2.0.0',
    autor: 'Mecanifica Procedural AI',
  },
  PARAMS: {
    larguraEstampo: 0.94,
    profundidadeEstampo: 0.65,
    alturaBaseInferior: 0.08,
    alturaMatriz: 0.08,
  },
  MATERIAIS: {
    acoFerramentaTemperado: { cor: '#475569', metalicidade: 0.9, aspereza: 0.2 },
    acoUsinadoRetificado: { cor: '#94a3b8', metalicidade: 0.88, aspereza: 0.18 },
    acoCromadoPinos: { cor: '#f1f5f9', metalicidade: 0.98, aspereza: 0.08 },
    bronzeBuchas: { cor: '#d97706', metalicidade: 0.85, aspereza: 0.25 },
    tiraChapaAco: { cor: '#e2e8f0', metalicidade: 0.7, aspereza: 0.35 },
  },
  ALIASES: [
    ['baseInferiorEstampo_total', { unir: [
      { origem: { op: 'cubo', id: 90 } },
      { origem: { op: 'cubo', id: 91 } },
    ]}],
    ['colunaEstampoDE_total', { unir: [
      { origem: { op: 'cilindro', id: 101 } },
      { origem: { op: 'cilindro', id: 101, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 101, tampa: 'topo' } },
    ]}],
    ['colunaEstampoDD_total', { unir: [
      { origem: { op: 'cilindro', id: 102 } },
      { origem: { op: 'cilindro', id: 102, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 102, tampa: 'topo' } },
    ]}],
    ['colunaEstampoTE_total', { unir: [
      { origem: { op: 'cilindro', id: 103 } },
      { origem: { op: 'cilindro', id: 103, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 103, tampa: 'topo' } },
    ]}],
    ['colunaEstampoTD_total', { unir: [
      { origem: { op: 'cilindro', id: 104 } },
      { origem: { op: 'cilindro', id: 104, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 104, tampa: 'topo' } },
    ]}],
    ['guiasDeTira_total', { unir: [
      { origem: { op: 'cubo', id: 111 } },
      { origem: { op: 'cubo', id: 112 } },
      { origem: { op: 'cilindro', id: 113 } },
      { origem: { op: 'cilindro', id: 113, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 113, tampa: 'topo' } },
    ]}],
    ['puncoesConjunto_total', { unir: [
      { origem: { op: 'cubo', id: 120 } },
      { origem: { op: 'cilindro', id: 121 } },
      { origem: { op: 'cilindro', id: 121, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 121, tampa: 'topo' } },
      { origem: { op: 'cubo', id: 122 } },
      { origem: { op: 'cubo', id: 123 } },
      { origem: { op: 'cubo', id: 124 } },
    ]}],
  ],
  PASSOS: [
    // 1. Placa Base Inferior do Estampo (Die Shoe inferior)
    ['cubo', {
      origemId: 90,
      larg: 0.94,
      alt: 0.08,
      prof: 0.65,
      em: [0, 1.09, 0],
    }],
    ['cubo', {
      origemId: 91,
      larg: 0.82,
      alt: 0.08,
      prof: 0.52,
      em: [0, 1.17, 0],
    }],
    ['parte', {
      nome: 'matrizInferior',
      sel: { alias: 'baseInferiorEstampo_total' },
    }],
    ['material', {
      usa: 'acoFerramentaTemperado',
      sel: { grupo: 'matrizInferior' },
    }],

    // 2. 4 Pinos Guia Retificados do Estampo
    ['cilindro', {
      origemId: 101,
      raio: 0.026,
      altura: 0.36,
      lados: 24,
      em: [-0.38, 1.27, 0.22],
    }],
    ['parte', {
      nome: 'colunaEstampoDE',
      sel: { alias: 'colunaEstampoDE_total' },
      pai: 'matrizInferior',
    }],
    ['material', {
      usa: 'acoCromadoPinos',
      sel: { grupo: 'colunaEstampoDE' },
    }],

    ['cilindro', {
      origemId: 102,
      raio: 0.026,
      altura: 0.36,
      lados: 24,
      em: [0.38, 1.27, 0.22],
    }],
    ['parte', {
      nome: 'colunaEstampoDD',
      sel: { alias: 'colunaEstampoDD_total' },
      pai: 'matrizInferior',
    }],
    ['material', {
      usa: 'acoCromadoPinos',
      sel: { grupo: 'colunaEstampoDD' },
    }],

    ['cilindro', {
      origemId: 103,
      raio: 0.026,
      altura: 0.36,
      lados: 24,
      em: [-0.38, 1.27, -0.22],
    }],
    ['parte', {
      nome: 'colunaEstampoTE',
      sel: { alias: 'colunaEstampoTE_total' },
      pai: 'matrizInferior',
    }],
    ['material', {
      usa: 'acoCromadoPinos',
      sel: { grupo: 'colunaEstampoTE' },
    }],

    ['cilindro', {
      origemId: 104,
      raio: 0.026,
      altura: 0.36,
      lados: 24,
      em: [0.38, 1.27, -0.22],
    }],
    ['parte', {
      nome: 'colunaEstampoTD',
      sel: { alias: 'colunaEstampoTD_total' },
      pai: 'matrizInferior',
    }],
    ['material', {
      usa: 'acoCromadoPinos',
      sel: { grupo: 'colunaEstampoTD' },
    }],

    // 3. Guias da Tira de Alimentação com Roletes
    ['cubo', {
      origemId: 111,
      larg: 0.16,
      alt: 0.05,
      prof: 0.36,
      em: [-0.49, 1.235, 0],
    }],
    ['cubo', {
      origemId: 112,
      larg: 0.16,
      alt: 0.05,
      prof: 0.36,
      em: [0.49, 1.235, 0],
    }],
    ['cilindro', {
      origemId: 113,
      raio: 0.022,
      altura: 0.38,
      lados: 24,
      eixo: 'z',
      em: [-0.58, 1.25, 0],
    }],
    ['parte', {
      nome: 'guiasDeAlimentacao',
      sel: { alias: 'guiasDeTira_total' },
      pai: 'matrizInferior',
    }],
    ['material', {
      usa: 'acoUsinadoRetificado',
      sel: { grupo: 'guiasDeAlimentacao' },
    }],

    // 4. Placa Superior Porta-Punções e Punções de 4 Estágios
    ['cubo', {
      origemId: 120,
      larg: 0.88,
      alt: 0.06,
      prof: 0.58,
      em: [0, 1.40, 0],
    }],
    ['cilindro', {
      origemId: 121,
      raio: 0.020,
      altura: 0.10,
      lados: 24,
      em: [-0.24, 1.32, 0],
    }],
    ['cubo', {
      origemId: 122,
      larg: 0.06,
      alt: 0.10,
      prof: 0.16,
      em: [-0.08, 1.32, 0],
    }],
    ['cubo', {
      origemId: 123,
      larg: 0.08,
      alt: 0.10,
      prof: 0.20,
      em: [0.08, 1.32, 0],
    }],
    ['cubo', {
      origemId: 124,
      larg: 0.07,
      alt: 0.10,
      prof: 0.22,
      em: [0.24, 1.32, 0],
    }],
    ['parte', {
      nome: 'puncoesSuperiores',
      sel: { alias: 'puncoesConjunto_total' },
    }],
    ['material', {
      usa: 'acoFerramentaTemperado',
      sel: { grupo: 'puncoesSuperiores' },
    }],
  ],
};

export default receitaFerramentas;
