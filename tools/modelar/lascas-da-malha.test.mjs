/* lascas-da-malha.test.mjs — a lasca de 0,01 mm solta ao lado de um cubo é acusada, o cubo não, e a placa de 0,05 mm passa. */
import { describe, expect, it } from 'vitest';
import { ESPESSURA_MINIMA, lascasDaMalha } from './lascas-da-malha.mjs';

/* a caixa de [x0, y0, z0] a [x1, y1, z1] em mm, como malha em metro, com as faces para fora */
function caixas(lista) {
  const V = new Map(); const F = new Map(); let v = 0; let f = 0;
  for (const [a, b] of lista) {
    const base = v;
    for (const z of [a[2], b[2]]) for (const y of [a[1], b[1]]) for (const x of [a[0], b[0]]) V.set(v++, [x / 1000, y / 1000, z / 1000]);
    for (const q of [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]]) F.set(f++, { vs: q.map((k) => base + k) });
  }
  return { V, F };
}

describe('lascas da malha', () => {
  it('acusa a lasca de 0,01 mm e não o cubo de 10 mm', () => {
    const lascas = lascasDaMalha(caixas([[[0, 0, 0], [10, 10, 10]], [[20, 0, 0], [30, 10, 0.01]]]));
    expect(lascas).toHaveLength(1);
    expect(lascas[0].espessura).toBeCloseTo(0.01, 3);
  });

  it('deixa passar a placa de 0,05 mm, acima do limite de 0,02 mm', () => {
    expect(ESPESSURA_MINIMA).toBe(0.02);
    expect(lascasDaMalha(caixas([[[0, 0, 0], [10, 10, 0.05]]]))).toEqual([]);
  });
});
