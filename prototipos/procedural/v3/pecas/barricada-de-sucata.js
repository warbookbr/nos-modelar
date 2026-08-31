/* barricada-de-sucata.js — estrutura destrutivel modular pos-apocaliptica para testes de impacto e fisica Chaos. */

export const receitaBarricada = {
  meta: {
    nome: 'Barricada de Sucata Pesada',
    versao: '1.0.0',
    autor: 'Mecanifica Procedural AI',
  },
  PARAMS: {
    larguraTotal: 3.2,
    alturaTotal: 2.25,
  },
  MATERIAIS: {
    concretoBase: { cor: '#64748b', metalicidade: 0.05, aspereza: 0.95 },
    ferroOxidado: { cor: '#7c2d12', metalicidade: 0.8, aspereza: 0.65 },
    chapaBlindagem: { cor: '#334155', metalicidade: 0.85, aspereza: 0.4 },
    acoViga: { cor: '#1e293b', metalicidade: 0.9, aspereza: 0.3 },
  },
  PASSOS: [
    // 1. Sapata esquerda de concreto/aco (Y: 0.00 a 0.35)
    ['cubo', {
      origemId: 1,
      larg: 0.6,
      alt: 0.35,
      prof: 0.5,
      em: [-1.2, 0, -0.25],
    }],
    ['parte', {
      nome: 'sapataEsquerda',
      sel: { origem: { op: 'cubo', id: 1 } },
    }],
    ['material', {
      usa: 'concretoBase',
      sel: { grupo: 'sapataEsquerda' },
    }],

    // 2. Sapata direita de concreto/aco (Y: 0.00 a 0.35)
    ['cubo', {
      origemId: 2,
      larg: 0.6,
      alt: 0.35,
      prof: 0.5,
      em: [0.6, 0, -0.25],
    }],
    ['parte', {
      nome: 'sapataDireita',
      sel: { origem: { op: 'cubo', id: 2 } },
    }],
    ['material', {
      usa: 'concretoBase',
      sel: { grupo: 'sapataDireita' },
    }],

    // 3. Pilar estrutural esquerdo (Y: 0.35 a 2.15)
    ['cubo', {
      origemId: 3,
      larg: 0.22,
      alt: 1.8,
      prof: 0.22,
      em: [-1.01, 0.35, -0.11],
    }],
    ['parte', {
      nome: 'pilarEsquerdo',
      sel: { origem: { op: 'cubo', id: 3 } },
    }],
    ['material', {
      usa: 'acoViga',
      sel: { grupo: 'pilarEsquerdo' },
    }],

    // 4. Pilar estrutural direito (Y: 0.35 a 2.15)
    ['cubo', {
      origemId: 4,
      larg: 0.22,
      alt: 1.8,
      prof: 0.22,
      em: [0.79, 0.35, -0.11],
    }],
    ['parte', {
      nome: 'pilarDireito',
      sel: { origem: { op: 'cubo', id: 4 } },
    }],
    ['material', {
      usa: 'acoViga',
      sel: { grupo: 'pilarDireito' },
    }],

    // 5. Viga transversal inferior unindo os pilares (Y: 0.40 a 0.62)
    ['cubo', {
      origemId: 5,
      larg: 2.4,
      alt: 0.22,
      prof: 0.12,
      em: [-1.2, 0.4, -0.06],
    }],
    ['parte', {
      nome: 'vigaInferior',
      sel: { origem: { op: 'cubo', id: 5 } },
    }],
    ['material', {
      usa: 'ferroOxidado',
      sel: { grupo: 'vigaInferior' },
    }],

    // 6. Chapa principal de blindagem frontal (carroceria soldada) (Y: 0.62 a 1.82)
    ['cubo', {
      origemId: 6,
      larg: 2.6,
      alt: 1.2,
      prof: 0.08,
      em: [-1.3, 0.62, -0.16],
    }],
    ['parte', {
      nome: 'chapaBlindagem',
      sel: { origem: { op: 'cubo', id: 6 } },
    }],
    ['material', {
      usa: 'chapaBlindagem',
      sel: { grupo: 'chapaBlindagem' },
    }],

    // 7. Travessa de reforco frontal (Y: 1.10 a 1.28)
    ['cubo', {
      origemId: 7,
      larg: 2.8,
      alt: 0.18,
      prof: 0.1,
      em: [-1.4, 1.1, -0.22],
    }],
    ['parte', {
      nome: 'reforcoFrontal',
      sel: { origem: { op: 'cubo', id: 7 } },
    }],
    ['material', {
      usa: 'ferroOxidado',
      sel: { grupo: 'reforcoFrontal' },
    }],

    // 8. Viga de coroamento do topo (Y: 2.05 a 2.25)
    ['cubo', {
      origemId: 8,
      larg: 3.0,
      alt: 0.2,
      prof: 0.26,
      em: [-1.5, 2.05, -0.13],
    }],
    ['parte', {
      nome: 'vigaTopo',
      sel: { origem: { op: 'cubo', id: 8 } },
    }],
    ['material', {
      usa: 'acoViga',
      sel: { grupo: 'vigaTopo' },
    }],
  ],
};

export default receitaBarricada;
