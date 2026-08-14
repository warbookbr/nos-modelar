/* ESTUDO DE CAMPO — pneu simplificado, uma peça separada do aro para provar
   assentamento anular e inspeção visual individual. */
import { executar, colisaoDe } from '../../../../prototipos/fps/v3/motor/oficina.js';

export const PARAMS = {
  raioInterno: 0.220,
  raioOmbro: 0.305,
  raioExterno: 0.340,
  meiaLargura: 0.110,
  meiaCoroa: 0.075,
  concordancia: 0.020,
  meiaLarguraNeg: '= -meiaLargura',
  meiaCoroaNeg: '= -meiaCoroa',
};
export const TOPO = { lados: 48, segmentosCurva: 3 };
export const MATERIAIS = { borracha: { cor: '#171a1d', aspereza: 0.96 } };
const PNEU = 1601;
export const ALIASES = [['pneuInteiro', { origem: { op: 'lathe', id: PNEU } }]];

export const PASSOS = [
  ['lathe', { origemId: PNEU, lados: 'lados', segmentosCurva: 'segmentosCurva', perfil: [
    ['raioInterno', 'meiaLarguraNeg'],
    ['raioOmbro', 'meiaLarguraNeg', 'concordancia'],
    ['raioExterno', 'meiaCoroaNeg'],
    ['raioExterno', 0],
    ['raioExterno', 'meiaCoroa'],
    ['raioOmbro', 'meiaLargura', 'concordancia'],
    ['raioInterno', 'meiaLargura'],
    ['raioInterno', 'meiaLarguraNeg'],
  ] }],
  ['rotaciona', { eixo: 'z', graus: -90, pivo: [0, 0, 0], sel: { alias: 'pneuInteiro' } }],
  ['parte', { nome: 'pneu', sel: { alias: 'pneuInteiro' } }],
  ['publicarPorta', {
    nome: 'assentoDoAro', de: { op: 'lathe', id: PNEU, faixa: 0 },
    interface: {
      forma: 'anel', papel: 'recebe', parte: 'pneu', eixo: [1, 0, 0], centro: [0, 0, 0],
      raioInterno: 'raioInterno', raioExterno: 0.245, inicio: 'meiaLarguraNeg', fim: 'meiaLargura',
    },
  }],
  ['liso', { sel: { alias: 'pneuInteiro' } }],
  ['material', { sel: { grupo: 'pneu' }, usa: 'borracha' }],
  ['solido', { sel: { grupo: 'pneu' } }],
];

export const meta = {
  nome: '_estudo-pneu-dianteiro', tipo: 'objeto',
  desc: 'pneu simplificado para estudo de assentamento no aro',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};
export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
