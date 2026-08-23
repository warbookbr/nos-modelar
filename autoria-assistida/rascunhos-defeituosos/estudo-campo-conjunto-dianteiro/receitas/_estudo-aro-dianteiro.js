/* ESTUDO DE CAMPO — aro simplificado, separado do pneu e do cubo para testar
   composição e relações entre peças independentes. */
import { executar, colisaoDe } from '../../../../prototipos/procedural/v3/motor/oficina.js';

export const PARAMS = {
  cavidadeRaio: 0.050,
  raioBase: 0.180,
  raioExterno: 0.245,
  meiaLargura: 0.095,
  meiaBanda: 0.075,
  meiaLarguraNeg: '= -meiaLargura',
  meiaBandaNeg: '= -meiaBanda',
};
export const TOPO = { lados: 40 };
export const MATERIAIS = { liga: { cor: '#aab2bb', aspereza: 0.30, metalness: 0.82 } };
const ARO = 1501;
export const ALIASES = [['aroInteiro', { origem: { op: 'lathe', id: ARO } }]];

export const PASSOS = [
  ['lathe', { origemId: ARO, lados: 'lados', perfil: [
    ['cavidadeRaio', 'meiaLarguraNeg'],
    ['raioBase', 'meiaLarguraNeg'],
    ['raioExterno', 'meiaBandaNeg'],
    ['raioExterno', 'meiaBanda'],
    ['raioBase', 'meiaLargura'],
    ['cavidadeRaio', 'meiaLargura'],
    ['cavidadeRaio', 'meiaLarguraNeg'],
  ] }],
  ['rotaciona', { eixo: 'z', graus: -90, pivo: [0, 0, 0], sel: { alias: 'aroInteiro' } }],
  ['parte', { nome: 'aro', sel: { alias: 'aroInteiro' } }],
  ['publicarPorta', {
    nome: 'cavidadeDoCubo', de: { op: 'lathe', id: ARO, faixa: 5 },
    interface: {
      forma: 'cilindro', papel: 'interna', eixo: [1, 0, 0], referencia: [0, 1, 0], centro: [0, 0, 0],
      raio: 'cavidadeRaio', inicio: 'meiaLarguraNeg', fim: 'meiaLargura',
    },
  }],
  ['publicarPorta', {
    nome: 'assentoNoPneu', de: { op: 'lathe', id: ARO, faixa: 2 },
    interface: {
      forma: 'anel', papel: 'ocupa', parte: 'aro', eixo: [1, 0, 0], centro: [0, 0, 0],
      raioInterno: 'raioBase', raioExterno: 'raioExterno', inicio: 'meiaBandaNeg', fim: 'meiaBanda',
    },
  }],
  ['liso', { sel: { origem: { op: 'lathe', id: ARO, faixa: 1 } } }],
  ['liso', { sel: { origem: { op: 'lathe', id: ARO, faixa: 2 } } }],
  ['liso', { sel: { origem: { op: 'lathe', id: ARO, faixa: 3 } } }],
  ['material', { sel: { grupo: 'aro' }, usa: 'liga' }],
  ['solido', { sel: { grupo: 'aro' } }],
];

export const meta = {
  nome: '_estudo-aro-dianteiro', tipo: 'objeto',
  desc: 'aro simplificado para estudo de encaixe no cubo e assentamento no pneu',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};
export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
