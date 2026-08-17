/* PEÇA DE EXEMPLO — NÃO HOMOLOGADA, NÃO É BASE DE PROJETO.
 *
 * Todas as peças de `prototipos/procedural/v3/pecas/` são exemplos. Elas existem para
 * exercitar e provar capacidades do núcleo, e nada mais. Nenhuma é referência de
 * engenharia, componente aprovado ou ponto de partida de produto.
 *
 * Medidas e proporções foram escolhidas para fazer uma capacidade passar ou
 * falhar, não para descrever um componente real. Esta geometria pode mudar ou
 * ser removida a qualquer momento, sem aviso e sem migração.
 *
 * O que este repositório sustenta é o núcleo e as capacidades provadas — nunca
 * a geometria daqui. Ver "Peças são exemplos" no README.md.
 */
/* _modelo-procedural — molde mínimo de receita declarativa da Oficina.
   Copie este arquivo para começar uma peça nova. Ele preserva o selo exigido,
   separa medidas (PARAMS), decisões topológicas (TOPO) e passos (PASSOS), e
   usa origem/parte semânticas em vez de IDs de face. */
import { executar, colisaoDe } from '../motor/oficina.js';

export const PARAMS = {
  larg: 0.08,
  alt: 0.04,
  prof: 0.05,
};

export const TOPO = {};

const CORPO = 100;

export const MATERIAIS = {
  corpo: { cor: '#8e9299', aspereza: 0.7 },
};

export const PASSOS = [
  ['cubo', { origemId: CORPO, larg: 'larg', alt: 'alt', prof: 'prof' }],
  ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: CORPO } } }],
  ['material', { sel: { grupo: 'corpo' }, usa: 'corpo' }],
  ['solido', { sel: { grupo: 'corpo' } }],
];

export const meta = {
  nome: '_modelo-procedural',
  tipo: 'objeto',
  desc: 'molde mínimo de receita procedural declarativa',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS);
}
