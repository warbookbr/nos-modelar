/* Fixa o defeito de hoje (fatia 1 do plano "costuras e furos limpos"); a fatia 4 inverte os números marcados. */
import { describe, expect, it } from 'vitest';
import receita from './receita.js';
import { medirPeca } from '../medir.mjs';

describe('furo numa tampa de lathe', () => {
  it('DEFEITO: o furo recusa porque a tampa resolve para 144 faces, e a peça sai com 1 órfão e sem furo (432 faces)', () => {
    const m = medirPeca(receita);
    expect(m.orfaos).toHaveLength(1);
    expect(m.orfaos[0]).toMatchObject({ op: 'furo', ref: 'de' });
    expect(m.orfaos[0].motivo).toMatch(/EXATAMENTE uma face.*resolveu para 144/);
    expect(m.faces).toBe(432);
  });
});
