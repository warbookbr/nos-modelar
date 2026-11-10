/* Fixa o defeito de hoje (fatia 1 do plano "costuras e furos limpos"); a fatia 3 inverte o número marcado. */
import { describe, expect, it } from 'vitest';
import receita from './receita.js';
import { medirPeca } from '../medir.mjs';

describe('subtrair que não corta nada', () => {
  it('DEFEITO: a peça sai igual ao bloco (6 faces, 8 vértices), sem órfão e sem aviso algum', () => {
    const m = medirPeca(receita);
    expect(m.faces).toBe(6);
    expect(m.neutro.V.size).toBe(8);
    expect(m.orfaos).toEqual([]);
    expect(m.avisos).toEqual([]);
  });
});
