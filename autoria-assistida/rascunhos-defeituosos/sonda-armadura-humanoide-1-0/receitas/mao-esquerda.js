/* Variante quiral esquerda da família privada de mãos blindadas. */
import { criarReceitaMao } from '../familias/mao.js';

const receita = criarReceitaMao('esquerda');
export const { PERFIL_AUTORIA, INTENCAO, PARAMS, TOPO, ALIASES, MATERIAIS, PASSOS } = receita;
export const meta = { nome: 'mao-esquerda', tipo: 'objeto', desc: 'mão blindada quiral esquerda' };
