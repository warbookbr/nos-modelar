/* ESTUDO DE CAMPO — pinça em três volumes, suficiente para tornar visível a
   folga radial com o disco sem fingir um tipo de relação ainda inexistente. */
import { executar, colisaoDe } from '../../../../prototipos/procedural/v3/motor/oficina.js';

export const PARAMS = {
  garraLargura: 0.024,
  garraAltura: 0.072,
  garraProfundidade: 0.100,
  garraInternaX: 0.009,
  garraExternaX: 0.055,
  garraBaseY: 0.088,
  ponteLargura: 0.070,
  ponteAltura: 0.034,
  ponteProfundidade: 0.100,
  ponteBaseY: 0.160,
  chanfro: 0.004,
};
export const TOPO = {};
export const MATERIAIS = { aluminio: { cor: '#a45c3d', aspereza: 0.54, metalness: 0.35 } };
const GARRA_INTERNA = 1401;
const GARRA_EXTERNA = 1402;
const PONTE = 1403;
export const ALIASES = [
  ['garraInternaInteira', { origem: { op: 'chamferBox', id: GARRA_INTERNA } }],
  ['garraExternaInteira', { origem: { op: 'chamferBox', id: GARRA_EXTERNA } }],
  ['ponteInteira', { origem: { op: 'chamferBox', id: PONTE } }],
];

export const PASSOS = [
  ['chamferBox', { origemId: GARRA_INTERNA, larg: 'garraLargura', alt: 'garraAltura', prof: 'garraProfundidade', chanfro: 'chanfro' }],
  ['transladar', { d: ['garraInternaX', 'garraBaseY', 0], sel: { origem: { op: 'chamferBox', id: GARRA_INTERNA } } }],
  ['chamferBox', { origemId: GARRA_EXTERNA, larg: 'garraLargura', alt: 'garraAltura', prof: 'garraProfundidade', chanfro: 'chanfro' }],
  ['transladar', { d: ['garraExternaX', 'garraBaseY', 0], sel: { origem: { op: 'chamferBox', id: GARRA_EXTERNA } } }],
  ['chamferBox', { origemId: PONTE, larg: 'ponteLargura', alt: 'ponteAltura', prof: 'ponteProfundidade', chanfro: 'chanfro' }],
  ['transladar', { d: [0.032, 'ponteBaseY', 0], sel: { origem: { op: 'chamferBox', id: PONTE } } }],
  /* A primeira tentativa declarou as garras como filhas de `pinca`. A peça
     passou no descritor, mas o exportador recusou a montagem porque o formato
     resolvido v1 ainda não transporta hierarquia interna. O estudo preserva
     as três identidades planas para conseguir seguir até a montagem. */
  ['parte', { nome: 'garraInterna', sel: { alias: 'garraInternaInteira' } }],
  ['parte', { nome: 'garraExterna', sel: { alias: 'garraExternaInteira' } }],
  ['parte', { nome: 'pinca', sel: { alias: 'ponteInteira' } }],
  ['publicarPorta', { nome: 'janelaDoDisco', de: { op: 'chamferBox', id: PONTE } }],
  ['material', { sel: { grupo: 'garraInterna' }, usa: 'aluminio' }],
  ['material', { sel: { grupo: 'garraExterna' }, usa: 'aluminio' }],
  ['material', { sel: { grupo: 'pinca' }, usa: 'aluminio' }],
  ['solido', { sel: { grupo: 'garraInterna' } }],
  ['solido', { sel: { grupo: 'garraExterna' } }],
  ['solido', { sel: { grupo: 'pinca' } }],
];

export const meta = {
  nome: '_estudo-pinca-dianteira', tipo: 'objeto',
  desc: 'pinça simplificada em três volumes para inspeção de folga',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};
export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
