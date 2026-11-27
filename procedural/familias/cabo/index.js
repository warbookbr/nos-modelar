/* index.js — a família `cabo`: o cabo flexível entre dois pontos, de seção circular, com o comprimento pedido, a curva de menor
   energia de dobra (`curva.js`), o raio mínimo de curva, o caimento opcional, os lados da seção, o desvio máximo da corda e o
   orçamento de faces (`plano.js`), as passagens com braçadeira e os terminais das pontas (`acessorios.js`). `medidasDoCabo` dá as medidas
   do cabo que a chamada pede (comprimento de corte, faces, raio). `cabo({ de, para, ... })` (`pedido.js`) é o jeito de pedi-lo sem conta,
   com o feixe de vários cabos. */
export { CABO, medidasDoCabo } from './definicao.js';
export { cabo, feixeDeCabos, medidasDoPedido, parametrosDoCabo, parametrosDoPedido } from './pedido.js';
