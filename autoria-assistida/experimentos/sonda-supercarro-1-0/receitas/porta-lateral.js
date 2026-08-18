/* Porta externa facetada da sonda privada de supercarro. */
import { ID_VOLUME_FACETADO } from '../composicoes.js';
import { PERFIL_AUTORIA_JOGO } from '../perfil-autoria.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_JOGO;
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = { pinturaCobalto: { cor: '#1a64ca', aspereza: 0.27, metalicidade: 0.66 } };
export const CHAMADAS_COMPOSICOES = [{
  id: 'painel-porta', composicao: ID_VOLUME_FACETADO,
  argumentos: { origem: 4601, largura: 0.035, altura: 0.23, profundidade: 1.02, chanfro: 0.014, centro: [0, 0, 0], parte: 'portaLateral', material: 'pinturaCobalto' },
}];
export const meta = { nome: 'porta-lateral', tipo: 'objeto', desc: 'painel lateral compartilhado' };
