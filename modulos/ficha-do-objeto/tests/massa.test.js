/* massa.test.js — as propriedades de massa pela malha batem com as fórmulas fechadas do cubo deslocado e do cilindro facetado, e a
   malha virada para dentro dá o mesmo resultado. */
import { describe, expect, it } from 'vitest';
import { propriedadesDeMassa } from '../src/massa.js';

/* o cubo de lado l com o canto mínimo em `o`, faces para fora */
function cubo(l, o = [0, 0, 0]) {
  const p = (x, y, z) => [o[0] + x * l, o[1] + y * l, o[2] + z * l];
  const quads = [
    [p(0, 0, 0), p(0, 1, 0), p(1, 1, 0), p(1, 0, 0)], [p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)],
    [p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)], [p(0, 1, 0), p(0, 1, 1), p(1, 1, 1), p(1, 1, 0)],
    [p(0, 0, 0), p(0, 0, 1), p(0, 1, 1), p(0, 1, 0)], [p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)],
  ];
  return quads.flatMap(([a, b, c, d]) => [[a, b, c], [a, c, d]]);
}

/* o cilindro de raio r e altura h no eixo y, com n lados */
function cilindro(r, h, n) {
  const tris = [];
  for (let k = 0; k < n; k += 1) {
    const t0 = (2 * Math.PI * k) / n; const t1 = (2 * Math.PI * (k + 1)) / n;
    const a = [r * Math.cos(t0), 0, r * Math.sin(t0)]; const b = [r * Math.cos(t1), 0, r * Math.sin(t1)];
    const A = [a[0], h, a[2]]; const B = [b[0], h, b[2]];
    tris.push([[0, 0, 0], a, b], [[0, h, 0], B, A], [a, A, B], [a, B, b]);
  }
  return tris;
}

describe('propriedadesDeMassa', () => {
  it('o cubo deslocado: massa, centro e o tensor m·l²/6 sem produtos', () => {
    const r = propriedadesDeMassa(cubo(10, [5, -3, 2]), 0.002);
    expect(r.massa).toBeCloseTo(2, 9);
    r.centro.forEach((x, k) => expect(x).toBeCloseTo([10, 2, 7][k], 9));
    for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) expect(r.tensor[i][j]).toBeCloseTo(i === j ? (2 * 100) / 6 : 0, 6);
  });

  it('o cilindro facetado se aproxima de m(3r² + h²)/12 e m r²/2', () => {
    const r = propriedadesDeMassa(cilindro(5, 20, 256), 0.001);
    const m = r.massa;
    expect(m).toBeCloseTo(Math.PI * 25 * 20 * 0.001, 3);
    expect(r.tensor[1][1] / ((m * 25) / 2)).toBeCloseTo(1, 3);
    expect(r.tensor[0][0] / ((m * (3 * 25 + 400)) / 12)).toBeCloseTo(1, 3);
    expect(r.centro[1]).toBeCloseTo(10, 9);
  });

  it('a malha com as faces para dentro dá o mesmo, e a malha sem volume dá null', () => {
    const fora = propriedadesDeMassa(cubo(4), 1);
    const dentro = propriedadesDeMassa(cubo(4).map(([a, b, c]) => [a, c, b]), 1);
    expect(dentro.massa).toBeCloseTo(fora.massa, 9);
    expect(dentro.tensor[0][0]).toBeCloseTo(fora.tensor[0][0], 9);
    expect(propriedadesDeMassa([], 1)).toBeNull();
  });
});
