/* muitos-lados-no-unir/receita.js — peça de prova do defeito "dois `lathe` de muitos lados no `unir` com `arredondarCostura` deixam vértice órfão"
 * (plano "costuras e furos limpos"): o T de dois tubos de 156 mm da peça `face-degenerada-em-dois-lathe` (deitado com 175 mm), mas com 224 lados em cada
 * `lathe`. O backlog do braço registrou o caso com 192 lados (4 órfãos); em 2026-11-09 o 192 fecha, e a recusa ("o raio ... não cabe no vértice da costura:
 * a tangência passa do fim da superfície fatiada") aparece com 216, 224 e 232 lados. */
import { receitaDeTubos } from '../tubos-em-t.js';

export default receitaDeTubos('muitos-lados-no-unir', 'dois tubos de 156 mm em T com 224 lados, unidos e arredondados', {
  raio: 78, alturaDoEixo: 117, comprimento: 175, eixoDoDeitado: 'x', chanfroNaBase: true, lados: 224,
});
