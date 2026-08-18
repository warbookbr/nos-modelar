/* Bota simplificada, com frente positiva em Z. */
import { PERFIL_AUTORIA_ARMADURA } from '../perfil-autoria.js';
import { criarIntencaoArmadura } from '../familias/intencao.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_ARMADURA;
export const INTENCAO = criarIntencaoArmadura({
  funcao: 'estabelecer apoio e direção frontal na extremidade da perna',
  familia: 'bota tecnológica bilateral',
  invariantes: ['a ponta permanece em z positivo', 'a sola permanece abaixo da placa superior'],
  criteriosVisuais: ['base estável em vista frontal', 'avanço da ponta legível em vista lateral'],
});
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = {
  solaGrafite: { cor: '#1f242a', aspereza: 0.61, metalicidade: 0.35 },
  placaCobalto: { cor: '#174f9b', aspereza: 0.31, metalicidade: 0.70 },
};
export const PASSOS = [
  ['chamferBox', { origemId: 6801, larg: 0.28, alt: 0.13, prof: 0.48, chanfro: 0.045, em: [0, -0.065, 0.09] }],
  ['parte', { nome: 'solaDaBota', sel: { origem: { op: 'chamferBox', id: 6801 } } }],
  ['material', { usa: 'solaGrafite', sel: { grupo: 'solaDaBota' } }],
  ['solido', { sel: { grupo: 'solaDaBota' } }],
  ['chamferBox', { origemId: 6802, larg: 0.25, alt: 0.12, prof: 0.27, chanfro: 0.038, em: [0, 0.055, 0.17] }],
  ['parte', { nome: 'peitoDaBota', sel: { origem: { op: 'chamferBox', id: 6802 } } }],
  ['material', { usa: 'placaCobalto', sel: { grupo: 'peitoDaBota' } }],
  ['solido', { sel: { grupo: 'peitoDaBota' } }],
];
export const meta = { nome: 'pe', tipo: 'objeto', desc: 'bota tecnológica simplificada' };
