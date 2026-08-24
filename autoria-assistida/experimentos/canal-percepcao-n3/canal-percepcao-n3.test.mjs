/* Calibração reprodutível entre controles sadios e históricos reprovados. */
import { describe, expect, it } from 'vitest';
import { montarCorpusN3 } from './gerar-evidencias.mjs';

describe('corpus de calibração N3', () => {
  it('mantém o lado sadio regular e todos os históricos reprovados irregulares', () => {
    const corpus = montarCorpusN3();
    const saudaveis = corpus.filter((item) => item.vereditoHumano === 'sadio-por-construcao');
    const reprovados = corpus.filter((item) => item.vereditoHumano !== 'sadio-por-construcao');
    expect(saudaveis.every((item) => item.analise.leitura === 'regular-no-canal-c1')).toBe(true);
    expect(reprovados.every((item) => item.analise.leitura === 'irregular-no-canal-c1')).toBe(true);
    expect(reprovados.map((item) => item.id)).toEqual(expect.arrayContaining(['quarto-dianteiro', 'r2b', 'cupe-livre-corpo']));
  });
});
