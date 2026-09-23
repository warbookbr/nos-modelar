/* diferenca-de-texto.test.js — a diferença por linha que o registro de rodada guarda: vazia sem mudança, toda acréscimo na primeira versão, cortada no teto. */
import { describe, expect, it } from 'vitest';
import { diferencaDeTexto } from './diferenca-de-texto.js';

describe('diferença de texto por linha', () => {
  it('sem mudança não há linha, e a primeira versão é toda acréscimo', () => {
    expect(diferencaDeTexto('a\nb', 'a\nb').linhas).toEqual([]);
    expect(diferencaDeTexto(null, 'a\nb')).toMatchObject({ primeira: true, acrescentadas: 2, removidas: 0 });
  });

  it('corta no teto e diz que cortou', () => {
    const muitas = Array.from({ length: 30 }, (_, i) => `l${i}`).join('\n');
    const dif = diferencaDeTexto('', muitas, { teto: 10 });
    expect(dif.linhas).toHaveLength(10);
    expect(dif.cortada).toBe(true);
  });
});
