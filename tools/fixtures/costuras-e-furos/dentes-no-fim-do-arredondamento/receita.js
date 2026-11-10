/* dentes-no-fim-do-arredondamento/receita.js — peça de prova do defeito "dentes de serra onde o arredondamento da costura afina até sumir junto a uma face
 * plana" (plano "costuras e furos limpos"): dois tubos de 190 mm de diâmetro em T, o em pé de eixo y e o deitado de eixo z com 210 mm de comprimento, a frente
 * dele 0,05 mm além da frente do tubo em pé, unidos por `unir` e com a costura arredondada por `arredondarCostura` de raio 10 mm, em modo curvo, com
 * `raioMinimo` 3 mm e `afinarPontas` 40 mm. A operação avisa `faceLimite`: o raio cai até o maior que cabe antes da borda da tampa e some nela. */
import { receitaDeTubos } from '../tubos-em-t.js';

export default receitaDeTubos('dentes-no-fim-do-arredondamento', 'dois tubos de 190 mm em T com a costura arredondada que afina até sumir na tampa', { avanco: 0.05 });
