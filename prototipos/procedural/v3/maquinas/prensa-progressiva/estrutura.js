/* estrutura.js — chassi estático da prensa mecânica: mesa, colunas guia e cabeçote superior. */

export const receitaEstrutura = {
  meta: {
    nome: 'Estrutura da Prensa Mecânica',
    versao: '1.0.0',
    autor: 'Mecanifica Procedural',
  },
  PARAMS: {
    larguraMesa: 2.4,
    profundidadeMesa: 1.6,
    alturaMesa: 0.4,
    alturaColuna: 2.2,
    raioColuna: 0.09,
    alturaCabecote: 0.5,
  },
  MATERIAIS: {
    acoEstrutural: { cor: '#334155', metalicidade: 0.7, aspereza: 0.4 },
    acoGuiaPolido: { cor: '#cbd5e1', metalicidade: 0.9, aspereza: 0.15 },
  },
  ALIASES: [
    ['colunaGuiaDE_total', { unir: [
      { origem: { op: 'cilindro', id: 21 } },
      { origem: { op: 'cilindro', id: 21, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 21, tampa: 'topo' } },
    ]}],
    ['colunaGuiaDD_total', { unir: [
      { origem: { op: 'cilindro', id: 22 } },
      { origem: { op: 'cilindro', id: 22, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 22, tampa: 'topo' } },
    ]}],
    ['colunaGuiaTE_total', { unir: [
      { origem: { op: 'cilindro', id: 23 } },
      { origem: { op: 'cilindro', id: 23, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 23, tampa: 'topo' } },
    ]}],
    ['colunaGuiaTD_total', { unir: [
      { origem: { op: 'cilindro', id: 24 } },
      { origem: { op: 'cilindro', id: 24, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 24, tampa: 'topo' } },
    ]}],
  ],
  PASSOS: [
    // 1. Mesa Inferior
    ['cubo', {
      origemId: 10,
      larg: 2.4,
      alt: 0.4,
      prof: 1.6,
    }],
    ['transladar', {
      d: [0, 0.2, 0],
      sel: { origem: { op: 'cubo', id: 10 } },
    }],
    ['parte', {
      nome: 'mesaInferior',
      sel: { origem: { op: 'cubo', id: 10 } },
    }],
    ['material', {
      usa: 'acoEstrutural',
      sel: { grupo: 'mesaInferior' },
    }],

    // 2. Coluna Dianteira Esquerda
    ['cilindro', {
      origemId: 21,
      raio: 0.09,
      altura: 2.2,
      lados: 24,
    }],
    ['transladar', {
      d: [-0.95, 1.5, 0.55],
      sel: { alias: 'colunaGuiaDE_total' },
    }],
    ['parte', {
      nome: 'colunaGuiaDE',
      sel: { alias: 'colunaGuiaDE_total' },
      pai: 'mesaInferior',
    }],
    ['material', {
      usa: 'acoGuiaPolido',
      sel: { grupo: 'colunaGuiaDE' },
    }],

    // 3. Coluna Dianteira Direita
    ['cilindro', {
      origemId: 22,
      raio: 0.09,
      altura: 2.2,
      lados: 24,
    }],
    ['transladar', {
      d: [0.95, 1.5, 0.55],
      sel: { alias: 'colunaGuiaDD_total' },
    }],
    ['parte', {
      nome: 'colunaGuiaDD',
      sel: { alias: 'colunaGuiaDD_total' },
      pai: 'mesaInferior',
    }],
    ['material', {
      usa: 'acoGuiaPolido',
      sel: { grupo: 'colunaGuiaDD' },
    }],

    // 4. Coluna Traseira Esquerda
    ['cilindro', {
      origemId: 23,
      raio: 0.09,
      altura: 2.2,
      lados: 24,
    }],
    ['transladar', {
      d: [-0.95, 1.5, -0.55],
      sel: { alias: 'colunaGuiaTE_total' },
    }],
    ['parte', {
      nome: 'colunaGuiaTE',
      sel: { alias: 'colunaGuiaTE_total' },
      pai: 'mesaInferior',
    }],
    ['material', {
      usa: 'acoGuiaPolido',
      sel: { grupo: 'colunaGuiaTE' },
    }],

    // 5. Coluna Traseira Direita
    ['cilindro', {
      origemId: 24,
      raio: 0.09,
      altura: 2.2,
      lados: 24,
    }],
    ['transladar', {
      d: [0.95, 1.5, -0.55],
      sel: { alias: 'colunaGuiaTD_total' },
    }],
    ['parte', {
      nome: 'colunaGuiaTD',
      sel: { alias: 'colunaGuiaTD_total' },
      pai: 'mesaInferior',
    }],
    ['material', {
      usa: 'acoGuiaPolido',
      sel: { grupo: 'colunaGuiaTD' },
    }],

    // 6. Cabeçote Superior (Coroa)
    ['cubo', {
      origemId: 30,
      larg: 2.4,
      alt: 0.5,
      prof: 1.6,
    }],
    ['transladar', {
      d: [0, 2.85, 0],
      sel: { origem: { op: 'cubo', id: 30 } },
    }],
    ['parte', {
      nome: 'cabecoteSuperior',
      sel: { origem: { op: 'cubo', id: 30 } },
      pai: 'mesaInferior',
    }],
    ['material', {
      usa: 'acoEstrutural',
      sel: { grupo: 'cabecoteSuperior' },
    }],

    // 7. Portas Públicas de Acoplamento
    ['publicarPorta', {
      id: 'portaMesaSuperior',
      rotulo: 'portaMesaSuperior',
      de: { op: 'cubo', id: 10, face: 'topo' },
    }],
    ['publicarPorta', {
      id: 'portaMancalCabecote',
      rotulo: 'portaMancalCabecote',
      de: { op: 'cubo', id: 30, face: 'frente' },
    }],
  ],
};
