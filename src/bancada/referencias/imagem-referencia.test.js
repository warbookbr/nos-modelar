/* imagem-referencia.test.js — contrato do descritor e alinhamento lateral. */
import { describe, expect, it } from 'vitest';
import { criarAlinhamentoInicial, normalizarImagemReferencia } from './imagem-referencia.js';

describe('imagem de referência', () => {
  it('calcula o plano YZ no centro da peça, com proporção e lado solicitados', () => {
    const alinhamento = criarAlinhamentoInicial({
      caixa: { min: { x: -0.1, y: 0, z: -1 }, max: { x: 0.1, y: 2, z: 1 } },
      larguraImagem: 2000,
      alturaImagem: 1000,
      lado: 'esquerda',
    });

    expect(alinhamento.y).toBe(1);
    expect(alinhamento.largura).toBe(4);
    expect(alinhamento.escala).toBeGreaterThan(0);
    expect(alinhamento.lado).toBe('esquerda');
  });

  it('recusa fonte ausente e limita opacidade a um intervalo visível', () => {
    expect(normalizarImagemReferencia({ fonte: 'url', url: '  ' })).toBeNull();
    expect(normalizarImagemReferencia({ fonte: 'url', url: 'https://exemplo.test/bike.jpg', opacidade: 2 }))
      .toMatchObject({ fonte: 'url', alinhamento: { opacidade: 1 } });
  });
});
