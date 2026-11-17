/* ajuste-de-curva-lisa-planta.test.mjs — a planta da lataria do carro-fastback (a TABELA da receita, só leitura, o contorno do polígono com filete da prancha
 * a cada 20 mm) ajustada dentro dos 3 mm que a pessoa soltou, com uma inflexão e poucos trechos. */
import { describe, expect, it } from 'vitest';
import { TABELA, contornoDaPlanta } from '../pecas/carro-fastback/partes/lataria/receita.js';
import { ajustarCurvaLisa } from './ajuste-de-curva-lisa.js';

describe('a planta da lataria do carro-fastback', () => {
  it('cabe em 3 mm com uma inflexão e poucos trechos, lida da TABELA', () => {
    const C = contornoDaPlanta(TABELA.planta, 1); const planta = [];
    for (let s = 0; s <= C.total; s += 20) planta.push(C.ponto(s));
    const a = ajustarCurvaLisa(planta, { tolerancia: 3, maximoDeTrechos: 12 });
    expect(a.cabe).toBe(true);
    expect(a.desvioMaximo).toBeLessThanOrEqual(3);
    expect(a.inflexoes).toBe(1);
    expect(a.clotoides.length).toBeLessThanOrEqual(10);
    expect(a.trechos.length).toBeLessThanOrEqual(10);
    expect(Math.abs(a.comprimento - C.total)).toBeLessThan(15);
  });
});
