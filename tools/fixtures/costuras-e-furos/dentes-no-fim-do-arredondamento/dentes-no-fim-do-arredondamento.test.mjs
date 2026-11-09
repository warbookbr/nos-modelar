/* Fixa o defeito de hoje (fatia 1 do plano "costuras e furos limpos"); a fatia 2 inverte os números marcados. */
import { describe, expect, it } from 'vitest';
import receita from './receita.js';
import { medirPeca } from '../medir.mjs';

describe('dentes no fim do arredondamento que afina', () => {
  const m = medirPeca(receita);

  it('a malha fecha, o arredondamento afina até sumir na tampa (aviso faceLimite) e a costura tem 1831 faces', () => {
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(m.avisos).toEqual(['faceLimite']);
    expect(m.facesDeCostura).toBe(1831);
    expect(m.faces).toBe(3549);
  });

  it('DEFEITO: a linha da costura dá meia-volta em 24 vértices, em 18 trechos (a peça aceita da união de tubos dá 4 e 4, só no bico)', () => {
    expect(m.pontasDeSerra).toBe(24);
    expect(m.trechosDeSerrilhado).toBe(18);
  });
});
