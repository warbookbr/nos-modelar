/* A fatia 1 do plano "costuras e furos limpos" fixou o defeito (24 pontas em 18 trechos); a causa era o registro da costura do `unir`, que perdia
   9 trechos de diedro de 135° (`tools/modelar/reguas-de-malha/costura-registrada.test.mjs`), e com o registro inteiro o número inverteu. */
import { describe, expect, it } from 'vitest';
import receita from './receita.js';
import { medirPeca } from '../medir.mjs';

describe('dentes no fim do arredondamento que afina', () => {
  const m = medirPeca(receita);

  it('a malha fecha, o arredondamento afina até sumir na tampa (aviso faceLimite) e a costura tem 1791 faces', () => {
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(m.avisos).toEqual(['faceLimite']);
    expect(m.facesDeCostura).toBe(1791);
    expect(m.faces).toBe(3433);
    expect(m.facesDegeneradas).toBe(0);
  });

  it('a linha da costura dá meia-volta em 3 vértices, em 3 trechos, só nos bicos (eram 24 em 18; a peça aceita da união de tubos dá 4 e 4)', () => {
    expect(m.pontasDeSerra).toBe(3);
    expect(m.trechosDeSerrilhado).toBe(3);
  });
});
