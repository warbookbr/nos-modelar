/* ajuste-de-curva-lisa-planta.test.mjs — a planta da lataria do carro-fastback (a TABELA da receita, só leitura, o contorno do polígono com filete da prancha)
 * ajustada dentro dos 3 mm que a pessoa soltou, com uma inflexão e poucos trechos. Este teste acopla à peça: se a TABELA mudar, os números mudam com ela. */
import { describe, expect, it } from 'vitest';
import { TABELA, contornoDaPlanta } from '../pecas/carro-fastback/partes/lataria/receita.js';
import { ajustarCurvaLisa } from './ajuste-de-curva-lisa.js';

const C = contornoDaPlanta(TABELA.planta, 1);
const amostra = (passo) => { const p = []; for (let s = 0; s <= C.total; s += passo) p.push(C.ponto(s)); return p; };

describe('a planta da lataria do carro-fastback', () => {
  it('cabe em 3 mm com uma inflexão e poucos trechos, sem lóbulo inventado, e dá a mesma contagem de clotoides a 20 mm e a 0,8 mm', () => {
    const esparsa = ajustarCurvaLisa(amostra(20), { tolerancia: 3, maximoDeClotoides: 12 });
    expect(esparsa.cabe).toBe(true);
    expect(esparsa.desvioMaximo).toBeLessThanOrEqual(3);
    expect(esparsa.inflexoes).toBe(1);
    expect(esparsa.clotoides.length).toBeLessThanOrEqual(9);
    expect(esparsa.trechos.length).toBeLessThanOrEqual(8);
    expect(Math.abs(esparsa.comprimento - C.total)).toBeLessThan(15);
    /* depois do lóbulo do para-lama a entrada só tem curvatura de um sinal (os filetes do canto de trás e a reta entre eles): o ajuste não troca de sinal ali */
    for (const j of esparsa.joelhos.filter((q) => q.s > 2300)) expect(j.k).toBeGreaterThan(-0.2e-3);
    const densa = ajustarCurvaLisa(amostra(0.8), { tolerancia: 3, maximoDeClotoides: 12 });
    expect(densa.cabe).toBe(true);
    expect(densa.desvios).toHaveLength(Math.floor(C.total / 0.8) + 1);
    expect(densa.clotoides.length).toBe(esparsa.clotoides.length);
    expect(densa.inflexoes).toBe(esparsa.inflexoes);
  });
});
