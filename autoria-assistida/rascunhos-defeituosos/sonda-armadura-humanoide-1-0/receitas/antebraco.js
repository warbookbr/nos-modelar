/* Antebraço local com origem no cotovelo e mão abaixo em Y. */
import { PERFIL_AUTORIA_ARMADURA } from '../perfil-autoria.js';
import { criarIntencaoArmadura } from '../familias/intencao.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_ARMADURA;
export const INTENCAO = criarIntencaoArmadura({
  funcao: 'formar a proteção entre cotovelo e mão mantendo a direção do membro legível',
  familia: 'segmento blindado de membro superior',
  invariantes: ['a origem local permanece no cotovelo', 'a mão permanece no sentido y negativo'],
  criteriosVisuais: ['placa frontal distinguível do núcleo', 'friso acompanha o eixo longo'],
});
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = {
  nucleoGrafite: { cor: '#282d34', aspereza: 0.50, metalicidade: 0.50 },
  placaCobalto: { cor: '#1857ad', aspereza: 0.29, metalicidade: 0.72 },
  emissivoClaro: { cor: '#eefaff', emissivo: 0.90, aspereza: 0.18, metalicidade: 0.15 },
};
export const PASSOS = [
  ['chamferBox', { origemId: 6401, larg: 0.24, alt: 0.44, prof: 0.22, chanfro: 0.045, em: [0, -0.25, 0] }],
  ['parte', { nome: 'nucleoDoAntebraco', sel: { origem: { op: 'chamferBox', id: 6401 } } }],
  ['material', { usa: 'nucleoGrafite', sel: { grupo: 'nucleoDoAntebraco' } }],
  ['solido', { sel: { grupo: 'nucleoDoAntebraco' } }],
  ['chamferBox', { origemId: 6402, larg: 0.265, alt: 0.33, prof: 0.075, chanfro: 0.027, em: [0, -0.22, 0.15] }],
  ['parte', { nome: 'placaDoAntebraco', sel: { origem: { op: 'chamferBox', id: 6402 } } }],
  ['material', { usa: 'placaCobalto', sel: { grupo: 'placaDoAntebraco' } }],
  ['solido', { sel: { grupo: 'placaDoAntebraco' } }],
  ['chamferBox', { origemId: 6403, larg: 0.025, alt: 0.24, prof: 0.018, chanfro: 0.005, em: [0.105, -0.22, 0.19] }],
  ['parte', { nome: 'frisoDoAntebraco', sel: { origem: { op: 'chamferBox', id: 6403 } } }],
  ['material', { usa: 'emissivoClaro', sel: { grupo: 'frisoDoAntebraco' } }],
  ['solido', { sel: { grupo: 'frisoDoAntebraco' } }],
];
export const meta = { nome: 'antebraco', tipo: 'objeto', desc: 'antebraço blindado com friso emissivo' };
