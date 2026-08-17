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
/* PEÇA DE EXERCÍCIO — prova não automotiva de AUT-2026-15. Três placas de
   sinalização demonstram portas sob cópia: duas voltas de uma placa radial,
   uma fileira linear e uma imagem de espelho. Não é conjunto mecânico: serve
   para separar o contrato geral da origem que motivou a linguagem.

   A porta de cada cópia declara o quadro da PLACA-FONTE. O núcleo transporta
   centro/eixo/referência pela derivação estrutural indicada em `de`; não há
   coordenada recalculada no autor. A cópia espelhada traz `mao:'espelhada'` e
   é deliberadamente prova de RECUSA para relações atuais: elas sabem rotação,
   não reflexão.

   Bancada e régua:
     npm run bancada -- _portas-espelho-arranja --vistas=frontal,lateral,isometrica
     npm run descrever -- _portas-espelho-arranja --estrito
*/
import { executar, colisaoDe } from '../motor/oficina.js';

export const PARAMS = {
  lado: 0.4,
  passoLinear: 0.7,
};

export const TOPO = {};

export const MATERIAIS = {
  radial: { cor: '#3e8ed0', aspereza: 0.65 },
  linear: { cor: '#e5a93e', aspereza: 0.65 },
  espelho: { cor: '#b85c75', aspereza: 0.65 },
};

const PLACA_RADIAL = 801;
const COPIAS_RADIAIS = 802;
const PLACA_LINEAR = 803;
const COPIAS_LINEARES = 804;
const PLACA_ESPELHO = 805;
const COPIA_ESPELHADA = 806;

const RADIAL = { op: 'cubo', id: PLACA_RADIAL };
const RADIAIS = { op: 'arranja', id: COPIAS_RADIAIS, de: RADIAL };
const LINEAR = { op: 'cubo', id: PLACA_LINEAR };
const LINEARES = { op: 'arranja', id: COPIAS_LINEARES, de: LINEAR };
const ESPELHO = { op: 'cubo', id: PLACA_ESPELHO };
const ESPELHADA = { op: 'espelha', id: COPIA_ESPELHADA, de: ESPELHO };

const QUADRO_EXTERNO = {
  forma: 'cilindro', papel: 'externa', eixo: [1, 0, 0], referencia: [0, 1, 0],
  centro: ['= lado / 2', 0, 0], raio: 0.04, inicio: -0.1, fim: 0.1,
};
const QUADRO_RADIAL = { ...QUADRO_EXTERNO, centro: ['= 1 + lado / 2', 0, 0] };
const QUADRO_LINEAR = { ...QUADRO_EXTERNO, centro: ['= lado / 2', 0, 1.2] };
const QUADRO_ESPELHO = { ...QUADRO_EXTERNO, centro: ['= 2 + lado / 2', 0, -1.2] };

export const PASSOS = [
  /* Três placas na volta: a fonte e duas cópias de 120°. Cada porta usa uma
     identidade de cópia declarada, nunca índice de face ou posição de passo. */
  ['cubo', { lado: 'lado', origemId: PLACA_RADIAL }],
  ['transladar', { d: [1, 0, 0], sel: { origem: RADIAL } }],
  ['arranja', { modo: 'radial', eixo: 'y', volta: 360, total: 3, origemId: COPIAS_RADIAIS, derivaDe: RADIAL, sel: { origem: RADIAL } }],
  ['parte', { nome: 'placaRadialFonte', sel: { origem: RADIAL } }],
  ['parte', { nome: 'placaRadialPrimeira', sel: { origem: { ...RADIAIS, copia: 'primeira' } } }],
  ['parte', { nome: 'placaRadialUltima', sel: { origem: { ...RADIAIS, copia: 'ultima' } } }],
  ['publicarPorta', { id: 'encaixeRadialPrimeiro', rotulo: 'Encaixe da primeira placa radial', de: { ...RADIAIS, copia: 'primeira' }, interface: QUADRO_RADIAL }],
  ['publicarPorta', { id: 'encaixeRadialUltimo', rotulo: 'Encaixe da última placa radial', de: { ...RADIAIS, copia: 'ultima' }, interface: QUADRO_RADIAL }],
  ['material', { sel: { origem: RADIAIS }, usa: 'radial' }],

  /* Três placas em linha: `ultima` permanece a última cópia se a contagem
     mudar; o centro da interface anda pelo deslocamento declarado do arranjo. */
  ['cubo', { lado: 'lado', origemId: PLACA_LINEAR }],
  ['transladar', { d: [0, 0, 1.2], sel: { origem: LINEAR } }],
  ['arranja', { modo: 'linear', d: ['passoLinear', 0, 0], total: 3, origemId: COPIAS_LINEARES, derivaDe: LINEAR, sel: { origem: LINEAR } }],
  ['parte', { nome: 'placaLinearFonte', sel: { origem: LINEAR } }],
  ['parte', { nome: 'placaLinearPrimeira', sel: { origem: { ...LINEARES, copia: 'primeira' } } }],
  ['parte', { nome: 'placaLinearUltima', sel: { origem: { ...LINEARES, copia: 'ultima' } } }],
  ['publicarPorta', { id: 'encaixeLinearUltimo', rotulo: 'Encaixe da última placa linear', de: { ...LINEARES, copia: 'ultima' }, interface: QUADRO_LINEAR }],
  ['material', { sel: { origem: LINEARES }, usa: 'linear' }],

  /* O espelho recebe quadro transportado, mas troca a mão. A marca faz a
     relação posterior parar antes de fingir que pode virar uma rotação. */
  ['cubo', { lado: 'lado', origemId: PLACA_ESPELHO }],
  ['transladar', { d: [2, 0, -1.2], sel: { origem: ESPELHO } }],
  ['espelha', { eixo: 'x', pos: 0, origemId: COPIA_ESPELHADA, derivaDe: ESPELHO, sel: { origem: ESPELHO } }],
  ['parte', { nome: 'placaEspelhoFonte', sel: { origem: ESPELHO } }],
  ['parte', { nome: 'placaEspelhada', sel: { origem: ESPELHADA } }],
  ['publicarPorta', { id: 'encaixeEspelhado', rotulo: 'Encaixe da placa espelhada', de: ESPELHADA, interface: { ...QUADRO_ESPELHO, papel: 'interna' } }],
  ['material', { sel: { origem: ESPELHADA }, usa: 'espelho' }],
  ['solido', { sel: { origem: RADIAL } }],
  ['solido', { sel: { origem: RADIAIS } }],
  ['solido', { sel: { origem: LINEAR } }],
  ['solido', { sel: { origem: LINEARES } }],
  ['solido', { sel: { origem: ESPELHO } }],
  ['solido', { sel: { origem: ESPELHADA } }],
];

export const meta = {
  nome: '_portas-espelho-arranja',
  tipo: 'objeto',
  desc: 'prova neutra de portas sob cópia radial, linear e espelhada',
  fechada: true,
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS);
}
