/* Fixa o defeito de hoje (fatia 1 do plano "costuras e furos limpos"); a fatia 3 inverte os números marcados. */
import { describe, expect, it } from 'vitest';
import receita from './receita.js';
import { medirPeca } from '../medir.mjs';

describe('dois lathe de muitos lados no unir com arredondarCostura', () => {
  it('DEFEITO: com 224 lados o arredondamento recusa ("não cabe no vértice da costura") e deixa 1 órfão', () => {
    const m = medirPeca(receita);
    expect(m.orfaos).toHaveLength(1);
    expect(m.orfaos[0]).toMatchObject({ op: 'arredondarCostura', ref: 'raio' });
    expect(m.orfaos[0].motivo).toMatch(/não cabe no vértice 2048 da costura/);
    expect(m.faces).toBe(1922);
    expect(m.facesDeCostura).toBe(0);
  });
});
