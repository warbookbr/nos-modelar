/* Lanterna emissiva traseira da sonda privada de supercarro. */
import { ID_VOLUME_FACETADO } from '../composicoes.js';
import { PERFIL_AUTORIA_JOGO } from '../perfil-autoria.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_JOGO;
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = { luzVermelha: { cor: '#d31832', emissivo: 0.9, aspereza: 0.20, metalicidade: 0.04 } };
export const CHAMADAS_COMPOSICOES = [{
  id: 'lente-traseira', composicao: ID_VOLUME_FACETADO,
  argumentos: { origem: 4901, largura: 0.36, altura: 0.055, profundidade: 0.09, chanfro: 0.015, centro: [0, 0, 0], parte: 'lanternaTraseira', material: 'luzVermelha' },
}];
export const meta = { nome: 'lanterna', tipo: 'objeto', desc: 'módulo óptico traseiro compartilhado' };
