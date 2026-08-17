/* Experimento confinado — eixo cujo comprimento provoca a falha direcional. */
import { executar, colisaoDe } from '../../../../prototipos/fps/v3/motor/oficina.js';
export const PARAMS = { raio: 0.019, inicio: -0.040, comprimento: 0.055, fim: 0.015 };
export const TOPO = { lados: 24 };
export const MATERIAIS = { aco: { cor: '#a3adb6', aspereza: 0.42, metalness: 0.76 } };
const EIXO = 7201;
export const ALIASES = [['inteiro', { unir: [{ origem: { op: 'cilindro', id: EIXO } }, { origem: { op: 'cilindro', id: EIXO, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: EIXO, tampa: 'topo' } }] }]];
export const PASSOS = [
  ['cilindro', { origemId: EIXO, raio: 'raio', altura: 'comprimento', lados: 'lados' }], ['rotaciona', { eixo: 'z', graus: -90, pivo: [0, 0, 0], sel: { alias: 'inteiro' } }], ['transladar', { d: ['inicio', 0, 0], sel: { alias: 'inteiro' } }],
  ['parte', { nome: 'ombro', sel: { alias: 'inteiro' } }],
  ['publicarPorta', { nome: 'hasteNoSuporte', de: { op: 'cilindro', id: EIXO }, interface: { forma: 'cilindro', papel: 'externa', eixo: [1, 0, 0], referencia: [0, 1, 0], centro: [0, 0, 0], raio: 'raio', inicio: 'inicio', fim: 'fim' } }],
  ['liso', { sel: { origem: { op: 'cilindro', id: EIXO } } }], ['material', { sel: { grupo: 'ombro' }, usa: 'aco' }], ['solido', { sel: { grupo: 'ombro' } }],
];
export const meta = { nome: 'eixo-guia', tipo: 'objeto', desc: 'eixo experimental de comprimento controlado', colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES) };
export function construir(ctx) { return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES); }
