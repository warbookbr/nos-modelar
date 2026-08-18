/* Segmento femoral simétrico; origem na articulação do quadril. */
import { PERFIL_AUTORIA_ARMADURA } from '../perfil-autoria.js';
import { criarIntencaoArmadura } from '../familias/intencao.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_ARMADURA;
export const INTENCAO = criarIntencaoArmadura({
  funcao: 'ligar quadril e joelho como massa principal do membro inferior',
  familia: 'segmento blindado de membro inferior',
  invariantes: ['a origem local permanece no quadril', 'o joelho permanece no sentido y negativo'],
  criteriosVisuais: ['silhueta afunila em direção ao joelho', 'friso acompanha o eixo longo'],
});
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = {
  placaGrafite: { cor: '#343a43', aspereza: 0.44, metalicidade: 0.55 },
  placaCobalto: { cor: '#174f9b', aspereza: 0.31, metalicidade: 0.70 },
  emissivoClaro: { cor: '#eefaff', emissivo: 0.90, aspereza: 0.18, metalicidade: 0.15 },
};
export const PASSOS = [
  ['chamferBox', { origemId: 6601, larg: 0.34, alt: 0.72, prof: 0.32, chanfro: 0.065, em: [0, -0.35, 0] }],
  ['parte', { nome: 'nucleoDaCoxa', sel: { origem: { op: 'chamferBox', id: 6601 } } }],
  ['material', { usa: 'placaGrafite', sel: { grupo: 'nucleoDaCoxa' } }],
  ['solido', { sel: { grupo: 'nucleoDaCoxa' } }],
  ['chamferBox', { origemId: 6602, larg: 0.29, alt: 0.49, prof: 0.075, chanfro: 0.030, em: [0, -0.32, 0.20] }],
  ['parte', { nome: 'placaFrontalDaCoxa', sel: { origem: { op: 'chamferBox', id: 6602 } } }],
  ['material', { usa: 'placaCobalto', sel: { grupo: 'placaFrontalDaCoxa' } }],
  ['solido', { sel: { grupo: 'placaFrontalDaCoxa' } }],
  ['chamferBox', { origemId: 6603, larg: 0.025, alt: 0.36, prof: 0.018, chanfro: 0.005, em: [0.125, -0.32, 0.25] }],
  ['parte', { nome: 'frisoDaCoxa', sel: { origem: { op: 'chamferBox', id: 6603 } } }],
  ['material', { usa: 'emissivoClaro', sel: { grupo: 'frisoDaCoxa' } }],
  ['solido', { sel: { grupo: 'frisoDaCoxa' } }],
];
export const meta = { nome: 'coxa', tipo: 'objeto', desc: 'segmento femoral blindado' };
