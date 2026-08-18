/* Disco visível sem prometer sistema de freio interno funcional. */
import { PERFIL_AUTORIA_JOGO } from '../perfil-autoria.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_JOGO;
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = { discoMetalico: { cor: '#9aa2aa', aspereza: 0.34, metalicidade: 0.82 } };
const DISCO = 4501;
export const PASSOS = [
  ['cilindro', { origemId: DISCO, raio: 0.158, altura: 0.028, lados: 32, eixo: 'x' }],
  ['parte', { nome: 'discoDeFreio', sel: { tudo: true } }],
  ['material', { usa: 'discoMetalico', sel: { grupo: 'discoDeFreio' } }],
  ['liso', { sel: { grupo: 'discoDeFreio' } }],
  ['solido', { sel: { grupo: 'discoDeFreio' } }],
];
export const meta = { nome: 'disco-freio', tipo: 'objeto', desc: 'disco externo de apresentação' };
