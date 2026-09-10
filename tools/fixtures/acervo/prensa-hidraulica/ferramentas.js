/* ferramentas.js — bolster plate, estampo, unidade hidraulica de potencia, motor, manometro e tubulacoes da prensa hidraulica. */

export const receitaFerramentas = {
  meta: {
    nome: 'Ferramental e Unidade Hidráulica da Prensa H-Frame',
    versao: '1.0.0',
    autor: 'Mecanifica Procedural AI',
  },
  PARAMS: {
    pressaoMaximaBar: 250,
    capacidadeTanqueL: 20,
  },
  MATERIAIS: {
    acoUsinado: { cor: '#8c949e', metalicidade: 0.88, aspereza: 0.24 },
    unidadeForca: { cor: '#202328', metalicidade: 0.75, aspereza: 0.45 },
    acoCromado: { cor: '#d8dce2', metalicidade: 0.95, aspereza: 0.10 },
    bronzeAcessorios: { cor: '#c29b53', metalicidade: 0.78, aspereza: 0.28 },
    visorNivel: { cor: '#e53935', metalicidade: 0.30, aspereza: 0.20 },
  },
  ALIASES: [
    ['bolsterPlate_total', { unir: [
      { origem: { op: 'cubo', id: 301 } },
      { origem: { op: 'cubo', id: 302 } },
    ]}],
    ['tanqueHidraulico_total', { unir: [
      { origem: { op: 'cubo', id: 311 } },
      { origem: { op: 'cubo', id: 312 } },
      { origem: { op: 'cubo', id: 313 } },
      { origem: { op: 'cubo', id: 314 } },
    ]}],
    ['motorBomba_total', { unir: [
      { origem: { op: 'cilindro', id: 321 } },
      { origem: { op: 'cilindro', id: 321, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 321, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 322 } },
      { origem: { op: 'cilindro', id: 322, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 322, tampa: 'fundo' } },
      { origem: { op: 'cubo', id: 323 } },
      { origem: { op: 'cubo', id: 324 } },
    ]}],
    ['manometro_total', { unir: [
      { origem: { op: 'cilindro', id: 331 } },
      { origem: { op: 'cilindro', id: 331, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 331, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 332 } },
      { origem: { op: 'cilindro', id: 332, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 332, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 333 } },
      { origem: { op: 'cilindro', id: 333, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 333, tampa: 'fundo' } },
    ]}],
    ['tubulacaoPressao_total', { unir: [
      { origem: { op: 'cilindro', id: 341 } },
      { origem: { op: 'cilindro', id: 341, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 341, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 342 } },
      { origem: { op: 'cilindro', id: 342, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 342, tampa: 'fundo' } },
    ]}],
  ],
  PASSOS: [
    // --- 1. BOLSTER PLATE E MATRIZ DE PRENSAGEM (SOBRE A MESA EM Y=0.685) ---
    // Placa de desgaste e apoio usinada (y de 0.685 a 0.725)
    ['cubo', { origemId: 301, larg: 0.32, alt: 0.04, prof: 0.28, em: [0, 0.685, 0] }],
    // Bloco porta-matriz central (y de 0.725 a 0.775)
    ['cubo', { origemId: 302, larg: 0.16, alt: 0.05, prof: 0.16, em: [0, 0.725, 0] }],

    // --- 2. RESERVATÓRIO DE ÓLEO HIDRÁULICO (LATERAL DIREITA) ---
    // Suporte / mísula de fixação na coluna direita
    ['cubo', { origemId: 311, larg: 0.15, alt: 0.04, prof: 0.20, em: [0.425, 0.80, 0] }],
    // Caixa do tanque de óleo (y de 0.84 a 1.10)
    ['cubo', { origemId: 312, larg: 0.22, alt: 0.26, prof: 0.26, em: [0.51, 0.84, 0] }],
    // Tampa superior do tanque (y de 1.10 a 1.12)
    ['cubo', { origemId: 313, larg: 0.24, alt: 0.02, prof: 0.28, em: [0.51, 1.10, 0] }],
    // Indicador / visor óptico de nível de óleo
    ['cubo', { origemId: 314, larg: 0.02, alt: 0.10, prof: 0.02, em: [0.625, 0.92, 0.135] }],

    // --- 3. MOTOR ELÉTRICO E BOMBA HIDRÁULICA ---
    // Flange de acoplamento da bomba (y de 1.12 a 1.15)
    ['cilindro', { origemId: 321, raio: 0.06, altura: 0.03, lados: 20, eixo: 'y', em: [0.51, 1.12, 0] }],
    // Carcaça principal do motor elétrico (y de 1.15 a 1.37)
    ['cilindro', { origemId: 322, raio: 0.07, altura: 0.22, lados: 20, eixo: 'y', em: [0.51, 1.15, 0] }],
    // Caixa de bornes elétricos
    ['cubo', { origemId: 323, larg: 0.06, alt: 0.08, prof: 0.06, em: [0.585, 1.22, 0] }],
    // Bloco manifold de comando hidráulico
    ['cubo', { origemId: 324, larg: 0.08, alt: 0.07, prof: 0.08, em: [0.42, 1.12, 0] }],

    // --- 4. MANÔMETRO DE PRESSÃO DE ÓLEO ---
    // Conexão vertical em T no cabeçote superior (y de 1.91 a 1.99)
    ['cilindro', { origemId: 331, raio: 0.012, altura: 0.08, lados: 12, eixo: 'y', em: [0, 1.91, 0] }],
    // Caixa cilíndrica do manômetro (aro de bronze)
    ['cilindro', { origemId: 332, raio: 0.05, altura: 0.03, lados: 24, eixo: 'z', em: [0, 2.03, 0.015] }],
    // Mostrador frontal do manômetro
    ['cilindro', { origemId: 333, raio: 0.045, altura: 0.005, lados: 24, eixo: 'z', em: [0, 2.03, 0.045] }],

    // --- 5. TUBULAÇÃO DE ALTA PRESSÃO ---
    // Linha vertical de subida da bomba ao topo (y de 1.19 a 2.04)
    ['cilindro', { origemId: 341, raio: 0.008, altura: 0.85, lados: 12, eixo: 'y', em: [0.42, 1.19, 0] }],
    // Linha horizontal de ligação ao cabeçote (x de 0 a 0.42 em y=2.04)
    ['cilindro', { origemId: 342, raio: 0.008, altura: 0.42, lados: 12, eixo: 'x', em: [0, 2.04, 0] }],

    // --- 6. NOMEAÇÃO SEMÂNTICA DAS PARTES ---
    ['parte', { nome: 'bolsterPlate', sel: { alias: 'bolsterPlate_total' } }],
    ['parte', { nome: 'tanqueHidraulico', sel: { alias: 'tanqueHidraulico_total' } }],
    ['parte', { nome: 'motorBomba', sel: { alias: 'motorBomba_total' }, pai: 'tanqueHidraulico' }],
    ['parte', { nome: 'manometro', sel: { alias: 'manometro_total' } }],
    ['parte', { nome: 'tubulacaoPressao', sel: { alias: 'tubulacaoPressao_total' } }],

    // --- 7. ATRIBUIÇÃO DE MATERIAIS ---
    ['material', { usa: 'acoUsinado', sel: { grupo: 'bolsterPlate' } }],
    ['material', { usa: 'unidadeForca', sel: { grupo: 'tanqueHidraulico' } }],
    ['material', { usa: 'unidadeForca', sel: { grupo: 'motorBomba' } }],
    ['material', { usa: 'bronzeAcessorios', sel: { grupo: 'manometro' } }],
    ['material', { usa: 'acoCromado', sel: { grupo: 'tubulacaoPressao' } }],
  ],
};

export default receitaFerramentas;
