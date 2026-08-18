/* Aro com anel e oito raios, uma definição reutilizada em quatro posições. */
import { PERFIL_AUTORIA_JOGO } from '../perfil-autoria.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_JOGO;
export const PARAMS = {
  cavidadeRaio: 0.188,
  raioBase: 0.205,
  raioExterno: 0.245,
  meiaLargura: 0.095,
  meiaBanda: 0.075,
  meiaLarguraNeg: '= -meiaLargura',
  meiaBandaNeg: '= -meiaBanda',
};
export const TOPO = { lados: 32 };
export const MATERIAIS = { ligaEscura: { cor: '#75808c', aspereza: 0.24, metalicidade: 0.86 } };
const ARO = 4401;
const RAIO = 4402;
export const ALIASES = [['aroInteiro', { origem: { op: 'lathe', id: ARO } }]];
export const PASSOS = [
  ['lathe', { origemId: ARO, eixo: 'x', lados: 'lados', perfil: [
    ['cavidadeRaio', 'meiaLarguraNeg'], ['raioBase', 'meiaLarguraNeg'],
    ['raioExterno', 'meiaBandaNeg'], ['raioExterno', 'meiaBanda'],
    ['raioBase', 'meiaLargura'], ['cavidadeRaio', 'meiaLargura'],
    ['cavidadeRaio', 'meiaLarguraNeg'],
  ] }],
  ['cilindro', { origemId: 4403, raio: 0.070, altura: 0.10, lados: 24, eixo: 'x' }],
  ['chamferBox', { origemId: RAIO, larg: 0.065, alt: 0.035, prof: 0.39, chanfro: 0.009 }],
  ['arranja', {
    origemId: 4450, derivaDe: { op: 'chamferBox', id: RAIO },
    sel: { origem: { op: 'chamferBox', id: RAIO } },
    modo: 'radial', eixo: 'x', total: 8, volta: 360, pivo: [0, 0, 0],
  }],
  ['parte', { nome: 'aroOitoRaios', sel: { tudo: true } }],
  ['publicarPorta', {
    nome: 'assentoNoPneu', de: { op: 'lathe', id: ARO, faixa: 2 },
    interface: {
      forma: 'anel', papel: 'ocupa', parte: 'aroOitoRaios', eixo: [1, 0, 0], centro: [0, 0, 0],
      raioInterno: 'raioBase', raioExterno: 'raioExterno', inicio: 'meiaBandaNeg', fim: 'meiaBanda',
    },
  }],
  ['liso', { sel: { origem: { op: 'lathe', id: ARO } } }],
  ['material', { usa: 'ligaEscura', sel: { grupo: 'aroOitoRaios' } }],
  ['solido', { sel: { grupo: 'aroOitoRaios' } }],
];
export const meta = { nome: 'aro', tipo: 'objeto', desc: 'aro esportivo de oito raios' };
