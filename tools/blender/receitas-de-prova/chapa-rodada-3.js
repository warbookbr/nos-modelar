/* chapa-rodada-3.js — a rodada em que a abertura da chapa e o friso descem 45 mm (o canto arredondado da segunda fica). */
import { receitaDaChapa, RAIO_DO_CANTO } from './chapa-com-abertura.mjs';

export default receitaDaChapa({ friso: true, canto: RAIO_DO_CANTO, desce: 0.045 });
