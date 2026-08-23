/* Confere que nenhuma sonda parcial é promovida sem envelope e silhuetas P0. */
import { describe, expect, it } from 'vitest';
import { sondarCalibracaoR2B } from './calibrar-r2b.mjs';

describe('R2B — sondagem regional de calibração', () => {
  it('não promove candidato parcial e conserva o envelope em toda sonda', () => {
    const { resultados } = sondarCalibracaoR2B({ largura: 320, altura: 240 });
    expect(resultados).toHaveLength(3);
    expect(resultados[0].envelope).toEqual({ largura: 2, comprimento: 4.6, altura: 1.19 });
    expect(resultados[0].passaEnvelope).toBe(true);
    for (const resultado of resultados) expect(resultado.passaP0).toBe(false);
    expect(resultados.slice(1).every((resultado) => resultado.melhoraSemRegressao)).toBe(true);
  });
});
