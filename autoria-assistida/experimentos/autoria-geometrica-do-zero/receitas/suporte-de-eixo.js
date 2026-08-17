/* Experimento confinado — suporte com alojamento, piloto e assento anular. */
import { executar, colisaoDe } from '../../../../prototipos/procedural/v3/motor/oficina.js';
export const PARAMS = { raioAlojamento: 0.020, raioCorpo: 0.050, raioFlange: 0.070, raioPiloto: 0.040, inicio: -0.050, fimCorpo: 0.020, fimFlange: 0.030, fimPiloto: 0.045 };
export const TOPO = { lados: 24 };
export const MATERIAIS = { aco: { cor: '#7c8791', aspereza: 0.52, metalness: 0.7 } };
const SUPORTE = 7101;
export const ALIASES = [['inteiro', { origem: { op: 'lathe', id: SUPORTE } }]];
export const PASSOS = [
  ['lathe', { origemId: SUPORTE, lados: 'lados', perfil: [['raioAlojamento', 'inicio'], ['raioCorpo', 'inicio'], ['raioCorpo', 'fimCorpo'], ['raioFlange', 'fimCorpo'], ['raioFlange', 'fimFlange'], ['raioPiloto', 'fimFlange'], ['raioPiloto', 'fimPiloto'], ['raioAlojamento', 'fimPiloto'], ['raioAlojamento', 'inicio']] }],
  ['rotaciona', { eixo: 'z', graus: -90, pivo: [0, 0, 0], sel: { alias: 'inteiro' } }],
  ['parte', { nome: 'corpo', sel: { alias: 'inteiro' } }],
  ['publicarPorta', { nome: 'alojamentoDoEixo', de: { op: 'lathe', id: SUPORTE, faixa: 7 }, interface: { forma: 'cilindro', papel: 'interna', eixo: [1, 0, 0], referencia: [0, 1, 0], centro: [0, 0, 0], raio: 'raioAlojamento', inicio: 'inicio', fim: 'fimPiloto' } }],
  ['publicarPorta', { nome: 'pilotoDaTampa', de: { op: 'lathe', id: SUPORTE, faixa: 5 }, interface: { forma: 'cilindro', papel: 'externa', eixo: [1, 0, 0], referencia: [0, 1, 0], centro: [0, 0, 0], raio: 'raioPiloto', inicio: 'fimFlange', fim: 'fimPiloto' } }],
  ['publicarPorta', { nome: 'assentoDaTampa', de: { op: 'lathe', id: SUPORTE, faixa: 3 }, interface: { forma: 'anel', papel: 'recebe', parte: 'corpo', eixo: [1, 0, 0], centro: [0, 0, 0], raioInterno: 'raioPiloto', raioExterno: 'raioFlange', inicio: 'fimCorpo', fim: 'fimFlange' } }],
  ['liso', { sel: { origem: { op: 'lathe', id: SUPORTE, faixa: 1 } } }], ['liso', { sel: { origem: { op: 'lathe', id: SUPORTE, faixa: 5 } } }], ['liso', { sel: { origem: { op: 'lathe', id: SUPORTE, faixa: 7 } } }],
  ['material', { sel: { grupo: 'corpo' }, usa: 'aco' }], ['solido', { sel: { grupo: 'corpo' } }],
];
export const meta = { nome: 'suporte-de-eixo', tipo: 'objeto', desc: 'suporte experimental com interfaces semânticas', colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES) };
export function construir(ctx) { return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES); }
