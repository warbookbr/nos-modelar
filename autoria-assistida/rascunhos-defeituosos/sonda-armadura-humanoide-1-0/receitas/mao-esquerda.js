/* Variante quiral esquerda da família privada de mãos blindadas. */
import { criarReceitaMao } from '../familias/mao.js';

const receita = criarReceitaMao('esquerda');
export const { PERFIL_AUTORIA, INTENCAO, PARAMS, TOPO, ALIASES, MATERIAIS, PASSOS } = receita;
export const meta = { nome: 'mao-esquerda', tipo: 'objeto', desc: 'mão blindada quiral esquerda' };

/* CONTATOS INTENCIONAIS. Declarados quando `--estrito` passou a reprovar contato
   não declarado: a geometria não mudou, só passou a dizer o que sempre fez.
   Armadura é construção em camadas — placa assentada sobre casco é o caso
   legítimo que a medida precisa distinguir de peça que atravessa peça. */
export const contatos = [
  { par: ['palmaEsquerda', 'protetorDoPolegarEsquerdo'], motivo: 'o protetor do polegar nasce da palma esquerda' },
];
