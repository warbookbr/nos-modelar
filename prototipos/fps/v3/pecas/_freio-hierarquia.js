/* PEÇA DE EXEMPLO — NÃO HOMOLOGADA, NÃO É BASE DE PROJETO.
 *
 * Todas as peças de `prototipos/fps/v3/pecas/` são exemplos. Elas existem para
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
/* Fixture de AUT-2026-16. Reusa a geometria real do freio a disco para provar
   somente a intenção estrutural: pistão e duas pastilhas pertencem à pinça.
   A ordem de fabricação do freio declara os filhos antes da pinça; o núcleo
   portanto resolve o pai no fim da receita, por nome, e não pela posição do
   passo. Esta peça não é publicada ao cliente enquanto o artefato resolvido
   não transportar a hierarquia.

   Bancada: ?peca=_freio-hierarquia
   CLI:     npm run descrever -- _freio-hierarquia
*/
import {
  ALIASES,
  MATERIAIS,
  PARAMS,
  PASSOS as PASSOS_DO_FREIO,
  TOPO,
} from './freio-disco.js';

export { ALIASES, MATERIAIS, PARAMS, TOPO };

const PAI = {
  pastilhaInterna: 'pinca',
  pastilhaExterna: 'pinca',
  pistao: 'pinca',
};

export const PASSOS = PASSOS_DO_FREIO.map(([op, args]) => (
  op === 'parte' && Object.hasOwn(PAI, args.nome)
    ? [op, { ...args, pai: PAI[args.nome] }]
    : [op, args]
));

export const meta = {
  nome: 'Freio a disco — hierarquia de partes',
  tipo: 'fixture de autoria',
};
