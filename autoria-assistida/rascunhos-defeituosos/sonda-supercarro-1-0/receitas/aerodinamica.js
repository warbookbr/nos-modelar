/* Subconjunto externo com identidades separadas de splitter, difusor e asa. */
import { ID_VOLUME_FACETADO } from '../composicoes.js';
import { PERFIL_AUTORIA_JOGO } from '../perfil-autoria.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_JOGO;
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = { compostoEscuro: { cor: '#161b22', aspereza: 0.50, metalicidade: 0.34 } };
export const CHAMADAS_COMPOSICOES = [
  { id: 'splitter', composicao: ID_VOLUME_FACETADO, argumentos: { origem: 5101, largura: 1.30, altura: 0.045, profundidade: 0.27, chanfro: 0.016, centro: [0, 0.25, 2.12], parte: 'splitterDianteiro', material: 'compostoEscuro' } },
  { id: 'difusor', composicao: ID_VOLUME_FACETADO, argumentos: { origem: 5102, largura: 1.25, altura: 0.10, profundidade: 0.34, chanfro: 0.022, centro: [0, 0.29, -2.06], parte: 'difusorTraseiro', material: 'compostoEscuro' } },
  { id: 'asa', composicao: ID_VOLUME_FACETADO, argumentos: { origem: 5103, largura: 1.12, altura: 0.045, profundidade: 0.22, chanfro: 0.015, centro: [0, 0.86, -1.88], parte: 'asaTraseira', material: 'compostoEscuro' } },
  { id: 'suporte-esquerdo', composicao: ID_VOLUME_FACETADO, argumentos: { origem: 5104, largura: 0.045, altura: 0.22, profundidade: 0.06, chanfro: 0.010, centro: [-0.38, 0.76, -1.88], parte: 'suporteAsaEsquerdo', material: 'compostoEscuro' } },
  { id: 'suporte-direito', composicao: ID_VOLUME_FACETADO, argumentos: { origem: 5105, largura: 0.045, altura: 0.22, profundidade: 0.06, chanfro: 0.010, centro: [0.38, 0.76, -1.88], parte: 'suporteAsaDireito', material: 'compostoEscuro' } },
];
export const meta = { nome: 'aerodinamica', tipo: 'objeto', desc: 'aerodinâmica exterior simplificada' };
