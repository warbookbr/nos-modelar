/* Painel de entrada de ar lateral da sonda privada de supercarro. */
import { ID_VOLUME_FACETADO } from '../composicoes.js';
import { PERFIL_AUTORIA_JOGO } from '../perfil-autoria.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_JOGO;
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = { entradaAr: { cor: '#202833', aspereza: 0.52, metalicidade: 0.24 } };
export const CHAMADAS_COMPOSICOES = [{
  id: 'canal-lateral', composicao: ID_VOLUME_FACETADO,
  argumentos: { origem: 4701, largura: 0.06, altura: 0.22, profundidade: 0.54, chanfro: 0.025, centro: [0, 0, 0], parte: 'canalDeArLateral', material: 'entradaAr' },
}];
export const meta = { nome: 'painel-lateral', tipo: 'objeto', desc: 'canal lateral escuro' };
