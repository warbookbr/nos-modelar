/* Espelho externo facetado da sonda privada de supercarro. */
import { ID_VOLUME_FACETADO } from '../composicoes.js';
import { PERFIL_AUTORIA_JOGO } from '../perfil-autoria.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_JOGO;
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = { cascaEscura: { cor: '#1d2630', aspereza: 0.38, metalicidade: 0.46 } };
export const CHAMADAS_COMPOSICOES = [{
  id: 'casca-espelho', composicao: ID_VOLUME_FACETADO,
  argumentos: { origem: 5001, largura: 0.17, altura: 0.09, profundidade: 0.11, chanfro: 0.025, centro: [0, 0, 0], parte: 'espelhoRetrovisor', material: 'cascaEscura' },
}];
export const meta = { nome: 'espelho', tipo: 'objeto', desc: 'espelho externo compartilhado' };
