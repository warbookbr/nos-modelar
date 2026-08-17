/* Experimento confinado — anel que assenta no suporte e referencia a folga. */
import { executar, colisaoDe } from '../../../../prototipos/procedural/v3/motor/oficina.js';
export const PARAMS = { raioInterno: 0.040, raioExterno: 0.070, inicio: 0.025, fim: 0.040 };
export const TOPO = { lados: 24 };
export const MATERIAIS = { aluminio: { cor: '#b38a61', aspereza: 0.5, metalness: 0.42 } };
const TAMPA = 7301;
export const ALIASES = [['inteiro', { origem: { op: 'lathe', id: TAMPA } }]];
export const PASSOS = [
  ['lathe', { origemId: TAMPA, lados: 'lados', perfil: [['raioInterno', 'inicio'], ['raioExterno', 'inicio'], ['raioExterno', 'fim'], ['raioInterno', 'fim'], ['raioInterno', 'inicio']] }], ['rotaciona', { eixo: 'z', graus: -90, pivo: [0, 0, 0], sel: { alias: 'inteiro' } }],
  ['parte', { nome: 'anel', sel: { alias: 'inteiro' } }],
  ['publicarPorta', { nome: 'anelDeAssento', de: { op: 'lathe', id: TAMPA, faixa: 3 }, interface: { forma: 'anel', papel: 'ocupa', parte: 'anel', eixo: [1, 0, 0], centro: [0, 0, 0], raioInterno: 'raioInterno', raioExterno: 'raioExterno', inicio: 'inicio', fim: 'fim' } }],
  ['liso', { sel: { origem: { op: 'lathe', id: TAMPA, faixa: 1 } } }], ['liso', { sel: { origem: { op: 'lathe', id: TAMPA, faixa: 3 } } }], ['material', { sel: { grupo: 'anel' }, usa: 'aluminio' }], ['solido', { sel: { grupo: 'anel' } }],
];
export const meta = { nome: 'anel-tampa', tipo: 'objeto', desc: 'anel-tampa experimental com assento semântico', colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES) };
export function construir(ctx) { return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES); }
