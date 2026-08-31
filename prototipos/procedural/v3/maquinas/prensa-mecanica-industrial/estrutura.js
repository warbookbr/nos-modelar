/* estrutura.js — chassi estatico da prensa mecanica industrial: base fundida, mesa bolster, 4 colunas guia e cabecote superior com mancais. */

export const receitaEstrutura = {
  meta: {
    nome: 'Estrutura da Prensa Mecânica Industrial',
    versao: '2.0.0',
    autor: 'Mecanifica Procedural AI',
  },
  PARAMS: {
    larguraMesa: 1.6,
    profundidadeMesa: 1.3,
    alturaMesa: 0.2,
    alturaColuna: 1.7,
    raioColuna: 0.065,
    alturaCabecote: 0.5,
  },
  MATERIAIS: {
    ferroFundidoCinza: { cor: '#2c3539', metalicidade: 0.5, aspereza: 0.6 },
    acoUsinadoMesa: { cor: '#94a3b8', metalicidade: 0.85, aspereza: 0.25 },
    acoGuiaCromado: { cor: '#e2e8f0', metalicidade: 0.95, aspereza: 0.1 },
    bronzeGuia: { cor: '#d97706', metalicidade: 0.8, aspereza: 0.3 },
  },
  ALIASES: [
    ['colunaGuiaDE_total', { unir: [
      { origem: { op: 'cilindro', id: 21 } },
      { origem: { op: 'cilindro', id: 21, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 21, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 25 } },
      { origem: { op: 'cilindro', id: 25, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 25, tampa: 'topo' } },
    ]}],
    ['colunaGuiaDD_total', { unir: [
      { origem: { op: 'cilindro', id: 22 } },
      { origem: { op: 'cilindro', id: 22, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 22, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 26 } },
      { origem: { op: 'cilindro', id: 26, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 26, tampa: 'topo' } },
    ]}],
    ['colunaGuiaTE_total', { unir: [
      { origem: { op: 'cilindro', id: 23 } },
      { origem: { op: 'cilindro', id: 23, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 23, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 27 } },
      { origem: { op: 'cilindro', id: 27, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 27, tampa: 'topo' } },
    ]}],
    ['colunaGuiaTD_total', { unir: [
      { origem: { op: 'cilindro', id: 24 } },
      { origem: { op: 'cilindro', id: 24, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 24, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 28 } },
      { origem: { op: 'cilindro', id: 28, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 28, tampa: 'topo' } },
    ]}],
    ['cabecoteSuperior_total', { unir: [
      { origem: { op: 'cubo', id: 30 } },
      { origem: { op: 'cilindro', id: 31 } },
      { origem: { op: 'cilindro', id: 31, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 31, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 32 } },
      { origem: { op: 'cilindro', id: 32, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 32, tampa: 'topo' } },
      { origem: { op: 'cubo', id: 33 } },
    ]}],
    ['basePedestal_total', { unir: [
      { origem: { op: 'cubo', id: 11 } },
      { origem: { op: 'cubo', id: 12 } },
      { origem: { op: 'cubo', id: 13 } },
      { origem: { op: 'cilindro', id: 14 } },
      { origem: { op: 'cilindro', id: 14, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 14, tampa: 'topo' } },
    ]}],
  ],
  PASSOS: [
    // 1. Base Pedestal de Fundição (Pés, travessas e tirante inferior)
    ['cubo', {
      origemId: 11,
      larg: 0.38,
      alt: 0.85,
      prof: 1.45,
      em: [-0.62, 0.425, 0],
    }],
    ['cubo', {
      origemId: 12,
      larg: 0.38,
      alt: 0.85,
      prof: 1.45,
      em: [0.62, 0.425, 0],
    }],
    ['cubo', {
      origemId: 13,
      larg: 0.88,
      alt: 0.55,
      prof: 0.85,
      em: [0, 0.575, 0],
    }],
    ['cilindro', {
      origemId: 14,
      raio: 0.035,
      altura: 1.30,
      lados: 24,
      eixo: 'x',
      em: [0, 0.20, 0],
    }],
    ['parte', {
      nome: 'basePedestal',
      sel: { alias: 'basePedestal_total' },
    }],
    ['material', {
      usa: 'ferroFundidoCinza',
      sel: { grupo: 'basePedestal' },
    }],

    // 2. Mesa Bolster Usinada
    ['cubo', {
      origemId: 10,
      larg: 1.62,
      alt: 0.20,
      prof: 1.32,
      em: [0, 0.95, 0],
    }],
    ['parte', {
      nome: 'mesaBolster',
      sel: { origem: { op: 'cubo', id: 10 } },
      pai: 'basePedestal',
    }],
    ['material', {
      usa: 'acoUsinadoMesa',
      sel: { grupo: 'mesaBolster' },
    }],

    // 3. Colunas Guia de Aço Maciço e Colares de Fixação
    // Dianteira Esquerda
    ['cilindro', {
      origemId: 21,
      raio: 0.065,
      altura: 1.68,
      lados: 32,
      em: [-0.55, 1.84, 0.42],
    }],
    ['cilindro', {
      origemId: 25,
      raio: 0.095,
      altura: 0.06,
      lados: 32,
      em: [-0.55, 1.08, 0.42],
    }],
    ['parte', {
      nome: 'colunaGuiaDE',
      sel: { alias: 'colunaGuiaDE_total' },
      pai: 'mesaBolster',
    }],
    ['material', {
      usa: 'acoGuiaCromado',
      sel: { grupo: 'colunaGuiaDE' },
    }],

    // Dianteira Direita
    ['cilindro', {
      origemId: 22,
      raio: 0.065,
      altura: 1.68,
      lados: 32,
      em: [0.55, 1.84, 0.42],
    }],
    ['cilindro', {
      origemId: 26,
      raio: 0.095,
      altura: 0.06,
      lados: 32,
      em: [0.55, 1.08, 0.42],
    }],
    ['parte', {
      nome: 'colunaGuiaDD',
      sel: { alias: 'colunaGuiaDD_total' },
      pai: 'mesaBolster',
    }],
    ['material', {
      usa: 'acoGuiaCromado',
      sel: { grupo: 'colunaGuiaDD' },
    }],

    // Traseira Esquerda
    ['cilindro', {
      origemId: 23,
      raio: 0.065,
      altura: 1.68,
      lados: 32,
      em: [-0.55, 1.84, -0.42],
    }],
    ['cilindro', {
      origemId: 27,
      raio: 0.095,
      altura: 0.06,
      lados: 32,
      em: [-0.55, 1.08, -0.42],
    }],
    ['parte', {
      nome: 'colunaGuiaTE',
      sel: { alias: 'colunaGuiaTE_total' },
      pai: 'mesaBolster',
    }],
    ['material', {
      usa: 'acoGuiaCromado',
      sel: { grupo: 'colunaGuiaTE' },
    }],

    // Traseira Direita
    ['cilindro', {
      origemId: 24,
      raio: 0.065,
      altura: 1.68,
      lados: 32,
      em: [0.55, 1.84, -0.42],
    }],
    ['cilindro', {
      origemId: 28,
      raio: 0.095,
      altura: 0.06,
      lados: 32,
      em: [0.55, 1.08, -0.42],
    }],
    ['parte', {
      nome: 'colunaGuiaTD',
      sel: { alias: 'colunaGuiaTD_total' },
      pai: 'mesaBolster',
    }],
    ['material', {
      usa: 'acoGuiaCromado',
      sel: { grupo: 'colunaGuiaTD' },
    }],

    // 4. Cabeçote Superior Monobloco (Coroa pesada perfeitamente assentada no topo das colunas)
    ['cubo', {
      origemId: 30,
      larg: 1.42,
      alt: 0.52,
      prof: 1.10,
      em: [0, 2.42, 0],
    }],
    ['cilindro', {
      origemId: 31,
      raio: 0.15,
      altura: 0.18,
      lados: 32,
      eixo: 'x',
      em: [-0.78, 2.42, 0],
    }],
    ['cilindro', {
      origemId: 32,
      raio: 0.15,
      altura: 0.18,
      lados: 32,
      eixo: 'x',
      em: [0.78, 2.42, 0],
    }],
    ['cubo', {
      origemId: 33,
      larg: 0.58,
      alt: 0.06,
      prof: 0.65,
      em: [-0.20, 2.71, -0.12],
    }],
    ['parte', {
      nome: 'cabecoteSuperior',
      sel: { alias: 'cabecoteSuperior_total' },
      pai: 'mesaBolster',
    }],
    ['material', {
      usa: 'ferroFundidoCinza',
      sel: { grupo: 'cabecoteSuperior' },
    }],
  ],
};

export default receitaEstrutura;
