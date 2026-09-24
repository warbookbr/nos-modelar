/* liso-por-angulo.test.js — o valor gravado e a média filtrada por ângulo. */
import { describe, expect, it } from 'vitest';
import { normalLisaDoCanto, valorDoLiso } from './liso-por-angulo.js';

describe('liso por ângulo', () => {
  it('grava true sem ângulo e o número com ângulo; recusa ângulo fora de 0 a 180', () => {
    expect(valorDoLiso(undefined)).toBe(true);
    expect(valorDoLiso(30)).toBe(30);
    expect(() => valorDoLiso(0)).toThrow(/entre 0 e 180/);
    expect(() => valorDoLiso(180)).toThrow(/entre 0 e 180/);
    expect(() => valorDoLiso('30')).toThrow(/entre 0 e 180/);
  });

  it('deixa fora da média a face além do limite', () => {
    const cima = { u: [0, 1, 0], n: [0, 1, 0] };
    const lado = { u: [1, 0, 0], n: [1, 0, 0] };
    expect(normalLisaDoCanto([0, 1, 0], 30, [cima, lado])).toEqual([0, 1, 0]);
    const media = normalLisaDoCanto([0, 1, 0], true, [cima, lado]);
    expect(media[0]).toBeCloseTo(Math.SQRT1_2, 6);
  });
});
