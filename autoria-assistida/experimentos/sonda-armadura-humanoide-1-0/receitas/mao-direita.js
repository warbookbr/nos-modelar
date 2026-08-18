/* Variante quiral direita da família privada de mãos blindadas. */
import { criarReceitaMao } from '../familias/mao.js';

const receita = criarReceitaMao('direita');
export const { PERFIL_AUTORIA, INTENCAO, PARAMS, TOPO, ALIASES, MATERIAIS, PASSOS } = receita;
export const meta = { nome: 'mao-direita', tipo: 'objeto', desc: 'mão blindada quiral direita' };
