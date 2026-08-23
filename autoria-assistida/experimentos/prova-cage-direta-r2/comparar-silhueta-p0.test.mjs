/* Prova que a comparação lê a máscara de profundidade nas três vistas. */
import { describe, expect, it } from 'vitest';
import { compararSilhuetasP0 } from './comparar-silhueta-p0.mjs';

describe('R2 — comparação de silhueta por profundidade', () => {
  it('mede as três vistas da máscara rasterizada, sem amostrar vértices', () => {
    const resultado = compararSilhuetasP0({ largura: 320, altura: 240 });
    expect(resultado.formato).toBe('mecanifica.comparacao-silhueta-r2@1');
    for (const medida of Object.values(resultado.vistas)) {
      expect(medida.amostras).toBeGreaterThan(5);
      expect(medida.maximoMm).toBeGreaterThanOrEqual(medida.medioMm);
    }
  });
});
