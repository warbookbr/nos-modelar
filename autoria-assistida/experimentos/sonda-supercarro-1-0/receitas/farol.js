/* Farol emissivo dianteiro da sonda privada de supercarro. */
import { ID_VOLUME_FACETADO } from '../composicoes.js';
import { PERFIL_AUTORIA_JOGO } from '../perfil-autoria.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_JOGO;
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = { luzFria: { cor: '#d9f1ff', emissivo: 0.95, aspereza: 0.16, metalicidade: 0.05 } };
export const CHAMADAS_COMPOSICOES = [{
  id: 'lente-frontal', composicao: ID_VOLUME_FACETADO,
  argumentos: { origem: 4801, largura: 0.30, altura: 0.055, profundidade: 0.10, chanfro: 0.016, centro: [0, 0, 0], parte: 'farolFrontal', material: 'luzFria' },
}];
export const meta = { nome: 'farol', tipo: 'objeto', desc: 'módulo óptico dianteiro compartilhado' };
