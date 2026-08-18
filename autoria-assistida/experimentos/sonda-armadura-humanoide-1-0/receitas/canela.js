/* Segmento inferior local com origem no joelho. */
import { PERFIL_AUTORIA_ARMADURA } from '../perfil-autoria.js';
import { criarIntencaoArmadura } from '../familias/intencao.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_ARMADURA;
export const INTENCAO = criarIntencaoArmadura({
  funcao: 'proteger o segmento entre joelho e pé com frente e panturrilha inequívocas',
  familia: 'segmento blindado de membro inferior',
  invariantes: ['a origem local permanece no joelho', 'o pé permanece no sentido y negativo'],
  criteriosVisuais: ['placa frontal dominante', 'panturrilha distinguível na vista lateral'],
});
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = {
  nucleoGrafite: { cor: '#292f36', aspereza: 0.49, metalicidade: 0.52 },
  placaCobalto: { cor: '#1857ad', aspereza: 0.29, metalicidade: 0.72 },
};
export const PASSOS = [
  ['chamferBox', { origemId: 6701, larg: 0.28, alt: 0.62, prof: 0.27, chanfro: 0.055, em: [0, -0.34, 0] }],
  ['parte', { nome: 'nucleoDaCanela', sel: { origem: { op: 'chamferBox', id: 6701 } } }],
  ['material', { usa: 'nucleoGrafite', sel: { grupo: 'nucleoDaCanela' } }],
  ['solido', { sel: { grupo: 'nucleoDaCanela' } }],
  ['chamferBox', { origemId: 6702, larg: 0.24, alt: 0.45, prof: 0.085, chanfro: 0.032, em: [0, -0.31, 0.185] }],
  ['parte', { nome: 'placaDaCanela', sel: { origem: { op: 'chamferBox', id: 6702 } } }],
  ['material', { usa: 'placaCobalto', sel: { grupo: 'placaDaCanela' } }],
  ['solido', { sel: { grupo: 'placaDaCanela' } }],
  ['chamferBox', { origemId: 6703, larg: 0.20, alt: 0.29, prof: 0.060, chanfro: 0.022, em: [0, -0.29, -0.17] }],
  ['parte', { nome: 'placaDaPanturrilha', sel: { origem: { op: 'chamferBox', id: 6703 } } }],
  ['material', { usa: 'placaCobalto', sel: { grupo: 'placaDaPanturrilha' } }],
  ['solido', { sel: { grupo: 'placaDaPanturrilha' } }],
];
export const meta = { nome: 'canela', tipo: 'objeto', desc: 'segmento inferior blindado de perna' };
