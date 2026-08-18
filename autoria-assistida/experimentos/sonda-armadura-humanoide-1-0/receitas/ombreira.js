/* Casca de ombro simétrica; o lado pertence à instância, não à geometria. */
import { PERFIL_AUTORIA_ARMADURA } from '../perfil-autoria.js';
import { criarIntencaoArmadura } from '../familias/intencao.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_ARMADURA;
export const INTENCAO = criarIntencaoArmadura({
  funcao: 'cobrir a transição entre tórax e braço sem definir lateralidade na geometria',
  familia: 'placa de ombro bilateral',
  invariantes: ['a mesma definição permanece válida nos dois ombros', 'a lateralidade pertence à pose da instância'],
  criteriosVisuais: ['casca se sobrepõe ao braço', 'friso superior continua visível'],
});
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = {
  placaCobalto: { cor: '#174f9b', aspereza: 0.31, metalicidade: 0.70 },
  frisoClaro: { cor: '#e8f5ff', emissivo: 0.88, aspereza: 0.20, metalicidade: 0.20 },
};
export const PASSOS = [
  ['chamferBox', { origemId: 6201, larg: 0.38, alt: 0.20, prof: 0.31, chanfro: 0.065, em: [0, 0, 0] }],
  ['parte', { nome: 'placaDoOmbro', sel: { origem: { op: 'chamferBox', id: 6201 } } }],
  ['material', { usa: 'placaCobalto', sel: { grupo: 'placaDoOmbro' } }],
  ['solido', { sel: { grupo: 'placaDoOmbro' } }],
  ['chamferBox', { origemId: 6202, larg: 0.22, alt: 0.025, prof: 0.025, chanfro: 0.008, em: [0, 0.105, 0.14] }],
  ['parte', { nome: 'frisoDoOmbro', sel: { origem: { op: 'chamferBox', id: 6202 } } }],
  ['material', { usa: 'frisoClaro', sel: { grupo: 'frisoDoOmbro' } }],
  ['solido', { sel: { grupo: 'frisoDoOmbro' } }],
];
export const meta = { nome: 'ombreira', tipo: 'objeto', desc: 'ombreira facetada com friso emissivo' };
