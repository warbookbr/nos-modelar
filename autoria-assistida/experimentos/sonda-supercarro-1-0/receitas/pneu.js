/* Pneu fechado de revolução, compartilhado pelas quatro rodas. */
import { PERFIL_AUTORIA_JOGO } from '../perfil-autoria.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_JOGO;
export const PARAMS = {
  raioInterno: 0.220,
  raioOmbro: 0.315,
  raioExterno: 0.355,
  meiaLargura: 0.115,
  meiaCoroa: 0.078,
  concordancia: 0.018,
  meiaLarguraNeg: '= -meiaLargura',
  meiaCoroaNeg: '= -meiaCoroa',
};
export const TOPO = { lados: 40, segmentosCurva: 3 };
export const MATERIAIS = { borracha: { cor: '#111419', aspereza: 0.94, metalicidade: 0.02 } };
const PNEU = 4301;
export const ALIASES = [['pneuInteiro', { origem: { op: 'lathe', id: PNEU } }]];
export const PASSOS = [
  ['lathe', { origemId: PNEU, eixo: 'x', lados: 'lados', segmentosCurva: 'segmentosCurva', perfil: [
    ['raioInterno', 'meiaLarguraNeg'],
    ['raioOmbro', 'meiaLarguraNeg', 'concordancia'],
    ['raioExterno', 'meiaCoroaNeg'],
    ['raioExterno', 0],
    ['raioExterno', 'meiaCoroa'],
    ['raioOmbro', 'meiaLargura', 'concordancia'],
    ['raioInterno', 'meiaLargura'],
    ['raioInterno', 'meiaLarguraNeg'],
  ] }],
  ['parte', { nome: 'pneu', sel: { alias: 'pneuInteiro' } }],
  ['publicarPorta', {
    nome: 'assentoDoAro', de: { op: 'lathe', id: PNEU, faixa: 0 },
    interface: {
      forma: 'anel', papel: 'recebe', parte: 'pneu', eixo: [1, 0, 0], centro: [0, 0, 0],
      raioInterno: 'raioInterno', raioExterno: 0.245, inicio: 'meiaLarguraNeg', fim: 'meiaLargura',
    },
  }],
  ['liso', { sel: { grupo: 'pneu' } }],
  ['material', { usa: 'borracha', sel: { grupo: 'pneu' } }],
  ['solido', { sel: { grupo: 'pneu' } }],
];
export const meta = { nome: 'pneu', tipo: 'objeto', desc: 'pneu game-ready simplificado' };
