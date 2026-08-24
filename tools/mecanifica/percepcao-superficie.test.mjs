/* Provas unitárias do canal C1 de percepção de superfície. */
import { describe, expect, it } from 'vitest';
import { analisarSuperficie, superficiesSinteticas } from './percepcao-superficie.mjs';

describe('canal C1 de percepção de superfície', () => {
  it('separa patch justo de uma quebra C0 explícita', () => {
    const justo = analisarSuperficie(superficiesSinteticas.patchJusto());
    const quebrado = analisarSuperficie(superficiesSinteticas.patchComQuebra());
    expect(justo.leitura).toBe('regular-no-canal-c1');
    expect(quebrado.leitura).toBe('irregular-no-canal-c1');
    expect(quebrado.parcelaAbrupta).toBeGreaterThan(.01);
    expect(justo.parcelaAbrupta).toBe(0);
  });

  it('aceita faces Map/quads usadas pelo corpus R2', () => {
    const analise = analisarSuperficie({ V: new Map([[0, [0, 0, 0]], [1, [1, 0, 0]], [2, [1, 0, 1]], [3, [0, 0, 1]]]), F: new Map([[0, { vs: [0, 1, 2, 3] }]]) });
    expect(analise.triangulos).toBe(2);
    expect(analise.arestasDeBorda).toBe(4);
  });
});
