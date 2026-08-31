/* cutelo-de-sucata.js — arma corpo a corpo pós-apocalíptica: cutelo reforçado com lâmina de sucata pesada e cabo revestido. */

export const receitaCutelo = {
  meta: {
    nome: 'Cutelo de Sucata Reforçado',
    versao: '1.0.0',
    autor: 'Mecanifica Procedural AI',
  },
  PARAMS: {
    comprimentoTotal: 0.88,
    larguraLamina: 0.12,
  },
  MATERIAIS: {
    ferroSucata: { cor: '#475569', metalicidade: 0.85, aspereza: 0.45 },
    fioAfiado: { cor: '#cbd5e1', metalicidade: 0.95, aspereza: 0.15 },
    couroCabo: { cor: '#78350f', metalicidade: 0.1, aspereza: 0.8 },
    reforcoBronze: { cor: '#d97706', metalicidade: 0.9, aspereza: 0.3 },
  },
  ALIASES: [
    ['cabo_total', { unir: [
      { origem: { op: 'cilindro', id: 10 } },
      { origem: { op: 'cilindro', id: 10, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 10, tampa: 'topo' } },
    ]}],
    ['pomo_total', { unir: [
      { origem: { op: 'cilindro', id: 11 } },
      { origem: { op: 'cilindro', id: 11, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 11, tampa: 'topo' } },
    ]}],
  ],
  PASSOS: [
    // 1. Pomo / Contrapeso hexagonal
    ['cilindro', {
      origemId: 11,
      raio: 0.032,
      altura: 0.04,
      lados: 6,
      eixo: 'y',
      em: [0, 0.02, 0],
    }],
    ['parte', {
      nome: 'pomo',
      sel: { alias: 'pomo_total' },
    }],
    ['material', {
      usa: 'ferroSucata',
      sel: { grupo: 'pomo' },
    }],

    // 2. Cabo / Empunhadura
    ['cilindro', {
      origemId: 10,
      raio: 0.02,
      altura: 0.25,
      lados: 16,
      eixo: 'y',
      em: [0, 0.16, 0],
    }],
    ['parte', {
      nome: 'cabo',
      sel: { alias: 'cabo_total' },
      pai: 'pomo',
    }],
    ['material', {
      usa: 'couroCabo',
      sel: { grupo: 'cabo' },
    }],

    // 3. Guarda / Travessa protetora de mão
    ['cubo', {
      origemId: 12,
      larg: 0.12,
      alt: 0.025,
      prof: 0.045,
      em: [0, 0.295, 0],
    }],
    ['parte', {
      nome: 'guarda',
      sel: { origem: { op: 'cubo', id: 12 } },
      pai: 'cabo',
    }],
    ['material', {
      usa: 'reforcoBronze',
      sel: { grupo: 'guarda' },
    }],

    // 4. Dorso de Reforço (Barra pesada soldada)
    ['cubo', {
      origemId: 13,
      larg: 0.03,
      alt: 0.54,
      prof: 0.022,
      em: [-0.035, 0.57, 0],
    }],
    ['parte', {
      nome: 'reforcoDorso',
      sel: { origem: { op: 'cubo', id: 13 } },
      pai: 'guarda',
    }],
    ['material', {
      usa: 'ferroSucata',
      sel: { grupo: 'reforcoDorso' },
    }],

    // 5. Corpo Principal da Lâmina
    ['cubo', {
      origemId: 14,
      larg: 0.08,
      alt: 0.52,
      prof: 0.012,
      em: [0.015, 0.56, 0],
    }],
    ['parte', {
      nome: 'laminaCorpo',
      sel: { origem: { op: 'cubo', id: 14 } },
      pai: 'reforcoDorso',
    }],
    ['material', {
      usa: 'ferroSucata',
      sel: { grupo: 'laminaCorpo' },
    }],

    // 6. Fio Cortante Afiado
    ['cubo', {
      origemId: 15,
      larg: 0.03,
      alt: 0.48,
      prof: 0.005,
      em: [0.065, 0.54, 0],
    }],
    ['parte', {
      nome: 'fioCortante',
      sel: { origem: { op: 'cubo', id: 15 } },
      pai: 'laminaCorpo',
    }],
    ['material', {
      usa: 'fioAfiado',
      sel: { grupo: 'fioCortante' },
    }],

    // 7. Ponta Chanfrada Agressiva
    ['cubo', {
      origemId: 16,
      larg: 0.07,
      alt: 0.06,
      prof: 0.008,
      em: [0.025, 0.83, 0],
    }],
    ['parte', {
      nome: 'pontaAgressiva',
      sel: { origem: { op: 'cubo', id: 16 } },
      pai: 'laminaCorpo',
    }],
    ['material', {
      usa: 'fioAfiado',
      sel: { grupo: 'pontaAgressiva' },
    }],
  ],
};

export default receitaCutelo;
