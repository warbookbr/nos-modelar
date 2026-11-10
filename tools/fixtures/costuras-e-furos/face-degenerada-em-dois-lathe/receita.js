/* face-degenerada-em-dois-lathe/receita.js — peça de prova do defeito "o `unir` com `arredondarCostura` de dois `lathe` deixa face de três cantos colineares"
 * (plano "costuras e furos limpos"): um tubo em pé de 156 mm de diâmetro e 117 mm de altura até o eixo do tubo deitado, também de 156 mm, de eixo x, com 195 mm de
 * comprimento e a ponta de trás rente às costas do tubo em pé; os dois com 144 lados e chanfro de 2 mm nas tampas, unidos por `unir` e arredondados por
 * `arredondarCostura` de raio 10 mm (`raioMinimo` 3, `afinarPontas` 40). Com 175 e 190 mm de comprimento a mesma peça sai sem face degenerada. */
import { receitaDeTubos } from '../tubos-em-t.js';

export default receitaDeTubos('face-degenerada-em-dois-lathe', 'dois tubos de 156 mm em T, o deitado com 195 mm, unidos e arredondados', {
  raio: 78, alturaDoEixo: 117, comprimento: 195, eixoDoDeitado: 'x', chanfroNaBase: true, lados: 144,
});
