/* Entrada de ar frontal compartilhada; volume visual, não duto funcional. */
import { ID_VOLUME_FACETADO } from '../composicoes.js';
import { PERFIL_AUTORIA_JOGO } from '../perfil-autoria.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_JOGO;
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = { cavidadeEscura: { cor: '#10161d', aspereza: 0.62, metalicidade: 0.18 } };
export const CHAMADAS_COMPOSICOES = [{
  id: 'entrada-frontal', composicao: ID_VOLUME_FACETADO,
  argumentos: { origem: 5201, largura: 0.28, altura: 0.075, profundidade: 0.085, chanfro: 0.014, centro: [0, 0, 0], parte: 'entradaDeArFrontal', material: 'cavidadeEscura' },
}];
export const meta = { nome: 'entrada-frontal', tipo: 'objeto', desc: 'entrada de ar frontal compartilhada' };
