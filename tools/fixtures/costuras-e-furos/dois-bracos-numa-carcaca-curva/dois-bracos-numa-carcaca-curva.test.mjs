/* Fatia 1 do plano "costuras e furos limpos". O caso do retrovisor do furgão não reproduziu a recusa do arredondarCostura nesta forma reduzida
   (carcaça em concha e dois braços chatos), nem com o raio de 3 a 20 mm, nem no esboço inteiro (união 17 ou 24): o teste fixa o que ela dá hoje. */
import { describe, expect, it } from 'vitest';
import receita from './receita.js';
import { medirPeca } from '../medir.mjs';

describe('dois braços chatos numa carcaça curva', () => {
  it('o arredondamento não recusa hoje (0 órfãos, 0 arestas soltas) e deixa 1 face degenerada, no raio de 6 mm', () => {
    const m = medirPeca(receita);
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(m.faces).toBe(1706);
    expect(m.facesDeCostura).toBe(674);
    expect(m.facesDegeneradas).toBe(1);
  });
});
