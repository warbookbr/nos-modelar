/* Experimento confinado — pino passante de uma dobradiça didática. */
import { executar, colisaoDe } from '../../../../prototipos/procedural/v3/motor/oficina.js';

export const PERFIL_AUTORIA = {
  visual: 'tecnicoDidatico',
  fidelidade: 'F2',
  precisao: 'mecanica',
  interacao: 'montagem',
  distanciaMinima: 0.12,
  orcamentoFaces: 160,
};

export const PARAMS = {
  raioHaste: 0.0040,
  raioCabeca: 0.0075,
  inicioCabeca: -0.007,
  inicioHaste: 0,
  fimTrechoInferior: 0.040,
  fimTrechoCentral: 0.080,
  fimHaste: 0.120,
};

export const TOPO = { lados: 24 };

export const MATERIAIS = {
  pino: { cor: '#b7bdc5', aspereza: 0.34, metalness: 0.78 },
};

const PINO = 8301;
const ORIGEM_PINO = { op: 'lathe', id: PINO };
export const ALIASES = [['pinoInteiro', { origem: ORIGEM_PINO }]];

export const PASSOS = [
  ['lathe', {
    origemId: PINO,
    perfil: [
      [0, 'inicioCabeca'],
      ['raioCabeca', 'inicioCabeca'],
      ['raioCabeca', 'inicioHaste'],
      ['raioHaste', 'inicioHaste'],
      ['raioHaste', 'fimHaste'],
      [0, 'fimHaste'],
    ],
    lados: 'lados',
  }],
  ['parte', { nome: 'pino', sel: { alias: 'pinoInteiro' } }],

  ['publicarPorta', {
    nome: 'trechoInferior',
    de: { ...ORIGEM_PINO, faixa: 3 },
    interface: {
      forma: 'cilindro', papel: 'externa', eixo: [0, 1, 0], referencia: [1, 0, 0],
      centro: [0, 0, 0], raio: 'raioHaste', inicio: 'inicioHaste', fim: 'fimTrechoInferior',
    },
  }],
  ['publicarPorta', {
    nome: 'trechoCentral',
    de: { ...ORIGEM_PINO, faixa: 3 },
    interface: {
      forma: 'cilindro', papel: 'externa', eixo: [0, 1, 0], referencia: [1, 0, 0],
      centro: [0, 0, 0], raio: 'raioHaste', inicio: 'fimTrechoInferior', fim: 'fimTrechoCentral',
    },
  }],
  ['publicarPorta', {
    nome: 'trechoSuperior',
    de: { ...ORIGEM_PINO, faixa: 3 },
    interface: {
      forma: 'cilindro', papel: 'externa', eixo: [0, 1, 0], referencia: [1, 0, 0],
      centro: [0, 0, 0], raio: 'raioHaste', inicio: 'fimTrechoCentral', fim: 'fimHaste',
    },
  }],

  ['liso', { sel: { origem: { ...ORIGEM_PINO, faixa: 1 } } }],
  ['liso', { sel: { origem: { ...ORIGEM_PINO, faixa: 3 } } }],
  ['material', { sel: { grupo: 'pino' }, usa: 'pino' }],
  ['solido', { sel: { grupo: 'pino' } }],
];

export const meta = {
  nome: 'pino-dobradica',
  tipo: 'objeto',
  desc: 'pino passante experimental com três trechos de interface',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
