/* index.js — a porta pública do módulo da ficha do objeto: a ponte do Modelar com o nos-mecatronica.

   Capacidade: monta a ficha de um objeto montado (`montarFicha`) e confere uma ficha ou um pedido contra a cópia conferida dos
   esquemas de lá (`conferirDocumento`). Entrada: as instâncias da montagem resolvida, o resumo da malha exportada e a declaração
   `procedural/pecas/<objeto>/ponte.json`. Saída: a ficha em JSON, versão 1.1. Não sabe nada de simulação. */
export { ErroFicha, eixoEAngulo, idDaFicha, matrizDe, montarFicha } from './ficha.js';
export { VERSOES, conferirDocumento, girar, regrasDaFicha, regrasDoPedido, textoDosErros } from './validar.js';
