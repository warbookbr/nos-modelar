/* Segmento superior local: origem na articulação do ombro, Y aponta para cima. */
import { PERFIL_AUTORIA_ARMADURA } from '../perfil-autoria.js';
import { criarIntencaoArmadura } from '../familias/intencao.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_ARMADURA;
export const INTENCAO = criarIntencaoArmadura({
  funcao: 'ligar ombro e cotovelo como segmento estrutural visual do braço',
  familia: 'segmento blindado de membro superior',
  invariantes: ['a origem local permanece no ombro', 'o cotovelo permanece no sentido y negativo'],
  criteriosVisuais: ['silhueta mais larga no ombro', 'placa frontal legível'],
});
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = {
  placaGrafite: { cor: '#373d46', aspereza: 0.43, metalicidade: 0.56 },
  placaCobalto: { cor: '#174f9b', aspereza: 0.31, metalicidade: 0.70 },
};
export const PASSOS = [
  ['chamferBox', { origemId: 6301, larg: 0.28, alt: 0.47, prof: 0.25, chanfro: 0.050, em: [0, -0.28, 0] }],
  ['parte', { nome: 'nucleoDoBraco', sel: { origem: { op: 'chamferBox', id: 6301 } } }],
  ['material', { usa: 'placaGrafite', sel: { grupo: 'nucleoDoBraco' } }],
  ['solido', { sel: { grupo: 'nucleoDoBraco' } }],
  ['chamferBox', { origemId: 6302, larg: 0.23, alt: 0.30, prof: 0.060, chanfro: 0.020, em: [0, -0.25, 0.15] }],
  ['parte', { nome: 'placaFrontalDoBraco', sel: { origem: { op: 'chamferBox', id: 6302 } } }],
  ['material', { usa: 'placaCobalto', sel: { grupo: 'placaFrontalDoBraco' } }],
  ['solido', { sel: { grupo: 'placaFrontalDoBraco' } }],
];
export const meta = { nome: 'braco-superior', tipo: 'objeto', desc: 'segmento blindado de braço superior' };
