/* chapa-rodada-2.js — a segunda rodada: a chapa igual, o friso em volta da abertura e um canto da abertura arredondado. */
import { receitaDaChapa, RAIO_DO_CANTO } from './chapa-com-abertura.mjs';

export default receitaDaChapa({ friso: true, canto: RAIO_DO_CANTO });
