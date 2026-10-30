/* cenario-do-tema.test.js — a grade do tema some nas bordas, a sombra só recebe sombra, os dois nascem invisíveis, e o contorno procura a máscara em volta do pixel numa camada que nada mais usa. */
import { describe, expect, it } from 'vitest';
import { criarCenarioDoTema, opacidadeDaGrade, TAMANHO_DA_GRADE } from './cenario-do-tema.js';
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
