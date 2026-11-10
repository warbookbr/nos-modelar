/* frente-rente-a-tampa/receita.js — peça de prova do defeito "o `unir` deixa uma fresta quando a frente de um tubo fica rente à tampa de outro"
 * (plano "costuras e furos limpos"): três cilindros de 190 mm de diâmetro como o braço superior, o pé de eixo z (de z = 0 a 190 mm), o tubo em pé de eixo y e o
 * tubo deitado de eixo z com 210 mm, a frente dele em z = 190 mm, no mesmo plano da frente do tubo em pé, com `avanco` 0 (o braço usa 0,05 mm de folga para
 * fechar). Só o `unir`: com o arredondamento da costura depois, o sólido da união já saiu aberto e o passo recusa. */
import { receitaDeTubos } from '../tubos-em-t.js';

export default receitaDeTubos('frente-rente-a-tampa', 'três tubos de 190 mm unidos por unir com a frente do deitado rente à do tubo em pé', {
  pe: true, avanco: 0, raioDoEncontro: 0,
});
