/* ESTUDO DE CAMPO — disco anular simplificado. O raio externo será alterado
   na segunda rodada para testar propagação de impacto até a pinça. */
import { executar, colisaoDe } from '../../../../prototipos/fps/v3/motor/oficina.js';

export const PARAMS = {
  raioInterno: 0.050,
  /* R002: era 0.140. O aumento preserva o assento no cubo e invade em 5 mm a
     ponte da pinça, cuja base radial está em y=0.160. */
  raioExterno: 0.165,
  inicioX: 0.024,
  fimX: 0.040,
  assentoRaioExterno: 0.085,
};
export const TOPO = { lados: 40 };
export const MATERIAIS = { ferroFundido: { cor: '#6e747a', aspereza: 0.82, metalness: 0.42 } };
const DISCO = 1301;
export const ALIASES = [['discoInteiro', { origem: { op: 'lathe', id: DISCO } }]];

export const PASSOS = [
  ['lathe', { origemId: DISCO, lados: 'lados', perfil: [
    ['raioInterno', 'inicioX'],
    ['raioExterno', 'inicioX'],
    ['raioExterno', 'fimX'],
    ['raioInterno', 'fimX'],
    ['raioInterno', 'inicioX'],
  ] }],
  ['rotaciona', { eixo: 'z', graus: -90, pivo: [0, 0, 0], sel: { alias: 'discoInteiro' } }],
  ['parte', { nome: 'disco', sel: { alias: 'discoInteiro' } }],
  ['publicarPorta', {
    nome: 'assentoNoCubo', de: { op: 'lathe', id: DISCO, faixa: 0 },
    interface: {
      forma: 'anel', papel: 'ocupa', parte: 'disco', eixo: [1, 0, 0], centro: [0, 0, 0],
      raioInterno: 'raioInterno', raioExterno: 'assentoRaioExterno', inicio: 'inicioX', fim: 'fimX',
    },
  }],
  ['publicarPorta', { nome: 'faixaDaPinca', de: { op: 'lathe', id: DISCO, faixa: 1 } }],
  ['liso', { sel: { origem: { op: 'lathe', id: DISCO, faixa: 1 } } }],
  ['material', { sel: { grupo: 'disco' }, usa: 'ferroFundido' }],
  ['solido', { sel: { grupo: 'disco' } }],
];

export const meta = {
  nome: '_estudo-disco-dianteiro', tipo: 'objeto',
  desc: 'disco anular simplificado para estudo de impacto local',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};
export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
