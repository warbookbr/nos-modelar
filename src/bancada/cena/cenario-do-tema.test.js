/* cenario-do-tema.test.js — a grade do tema some nas bordas, a sombra só recebe sombra, os dois nascem invisíveis, e o contorno procura a máscara em volta do pixel numa camada que nada mais usa. */
import { describe, expect, it } from 'vitest';
import {
  criarCenarioDoTema, criarFundoEmDegrade, LADO_DO_DEGRADE, opacidadeDaGrade, pixelsDoDegrade, TAMANHO_DA_GRADE,
} from './cenario-do-tema.js';
import { CAMADA_DO_CONTORNO, direcoesDaBorda } from './contorno-da-selecao.js';

describe('cenário do tema', () => {
  it('a grade fica cheia no meio e some antes da borda dela', () => {
    expect(opacidadeDaGrade(0)).toBeCloseTo(0.55, 6);
    expect(opacidadeDaGrade(2.2)).toBeCloseTo(0.55, 6);
    expect(opacidadeDaGrade(3.9)).toBeCloseTo(0.275, 6);
    expect(opacidadeDaGrade(5.6)).toBe(0);
    expect(opacidadeDaGrade(TAMANHO_DA_GRADE / 2)).toBe(0);
    const amostras = [0, 1, 2, 3, 4, 5, 6].map((d) => opacidadeDaGrade(d));
    expect(amostras.every((valor, i) => i === 0 || valor <= amostras[i - 1])).toBe(true);
  });

  it('a grade e a sombra nascem invisíveis, e pintar segue a cor do tema e a explosão', () => {
    const cenario = criarCenarioDoTema();
    expect([cenario.grade.visible, cenario.sombra.visible]).toEqual([false, false]);
    expect(cenario.sombra.material.type).toBe('ShadowMaterial');
    expect(cenario.sombra.receiveShadow).toBe(true);
    cenario.pintar({ corDaGrade: '#c3c9c6', fatorExplosao: 0.5 });
    expect(`#${cenario.grade.material.uniforms.cor.value.getHexString()}`).toBe('#c3c9c6');
    expect(cenario.grade.material.uniforms.opacidade.value).toBeCloseTo(0.275, 6);
    expect(cenario.sombra.material.opacity).toBeCloseTo(0.1, 6);
  });
});

describe('fundo em degradê', () => {
  const centro = [0x30, 0x35, 0x3b];
  const borda = [0x1d, 0x20, 0x24];
  const cor = (pixels, coluna, linha, lado = LADO_DO_DEGRADE) => [...pixels.slice((linha * lado + coluna) * 4, (linha * lado + coluna) * 4 + 4)];

  it('é claro no meio, um pouco acima do centro, e escuro nos cantos, sem sorteio', () => {
    const pixels = pixelsDoDegrade({ centro, borda });
    expect(pixels).toEqual(pixelsDoDegrade({ centro, borda }));
    for (const [coluna, linha] of [[0, 0], [LADO_DO_DEGRADE - 1, 0], [0, LADO_DO_DEGRADE - 1], [LADO_DO_DEGRADE - 1, LADO_DO_DEGRADE - 1]]) {
      cor(pixels, coluna, linha).slice(0, 3).forEach((canal, i) => expect(Math.abs(canal - borda[i])).toBeLessThanOrEqual(1));
    }
    /* A textura vai de baixo para cima: o meio a 46% do alto fica na linha de 54% a partir de baixo. */
    const meio = cor(pixels, LADO_DO_DEGRADE / 2, Math.round(0.54 * LADO_DO_DEGRADE));
    meio.slice(0, 3).forEach((canal, i) => expect(Math.abs(canal - centro[i])).toBeLessThanOrEqual(1));
    const caminho = [0, 16, 32, 48, 64].map((coluna) => cor(pixels, coluna, Math.round(0.54 * LADO_DO_DEGRADE))[0]);
    expect(caminho.every((valor, i) => i === 0 || valor >= caminho[i - 1])).toBe(true);
  });

  it('a textura é sRGB, do lado declarado, com as cores escritas como o CSS', () => {
    const textura = criarFundoEmDegrade({ centro: '#30353b', borda: '#1d2024' });
    expect([textura.image.width, textura.image.height]).toEqual([LADO_DO_DEGRADE, LADO_DO_DEGRADE]);
    expect(textura.colorSpace).toBe('srgb');
    expect(cor(textura.image.data, 0, 0)).toEqual([...borda, 255]);
    textura.dispose();
  });
});

describe('contorno da seleção', () => {
  it('procura a máscara em doze direções unitárias em volta do pixel', () => {
    const direcoes = direcoesDaBorda();
    expect(direcoes).toHaveLength(12);
    for (const [x, y] of direcoes) expect(Math.hypot(x, y)).toBeCloseTo(1, 5);
    expect(direcoes[0]).toEqual([1, 0]);
  });

  it('usa uma camada da câmera fora das que a cena usa', () => {
    expect(CAMADA_DO_CONTORNO).toBe(31);
  });
});
