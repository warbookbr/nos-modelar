/* auxiliares.test.mjs — cada auxiliar dá o mesmo número, bit a bit, que a cópia que as receitas fazem hoje. */
import { describe, expect, it } from 'vitest';
import { antiHorario, areaComSinal, espelharMeia, milimetroParaMetro, pontosEmMetro } from './index.js';

/* As cópias das receitas (carro-esportivo-hatch e vizinhas), como estão lá. */
const copiaM = (mm) => mm / 1000;
const copiaArea = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const copiaAntiHorario = (l) => (copiaArea(l) < 0 ? [...l].reverse() : l);
const copiaEspelhar = (meia) => [...meia, ...[...meia].reverse().map(([x, y]) => [-x, y])];

/* Gerador determinístico: os mesmos números a cada execução. */
function sorteador(semente) {
  let s = semente >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
}
const contornoDe = (sorte, n) => Array.from({ length: n }, () => [Math.round((sorte() - 0.5) * 4000) / 3, Math.round((sorte() - 0.5) * 4000) / 7]);

describe('auxiliares do núcleo', () => {
  it('milimetroParaMetro converte como a cópia das receitas', () => {
    const sorte = sorteador(1);
    for (let k = 0; k < 200; k++) { const mm = (sorte() - 0.5) * 9000; expect(Object.is(milimetroParaMetro(mm), copiaM(mm))).toBe(true); }
    expect(milimetroParaMetro(1500)).toBe(1.5);
    expect(milimetroParaMetro(0)).toBe(0);
  });

  it('pontosEmMetro converte cada coordenada, de qualquer dimensão', () => {
    expect(pontosEmMetro([[1000, 2000], [3000, -500]])).toEqual([[1, 2], [3, -0.5]]);
    expect(pontosEmMetro([[1000, 0, 250]])).toEqual([[1, 0, 0.25]]);
    expect(pontosEmMetro([])).toEqual([]);
  });

  it('areaComSinal dá o sinal do sentido e a área conhecida', () => {
    const antiHor = [[0, 0], [4, 0], [4, 3], [0, 3]];
    expect(areaComSinal(antiHor)).toBe(12);
    expect(areaComSinal([...antiHor].reverse())).toBe(-12);
    expect(areaComSinal([[0, 0], [1, 0]])).toBe(0);
    expect(areaComSinal([[5, 5]])).toBe(0);
  });

  it('areaComSinal e antiHorario dão o mesmo que a cópia, bit a bit, em contornos sorteados', () => {
    const sorte = sorteador(7);
    for (let k = 0; k < 200; k++) {
      const contorno = contornoDe(sorte, 3 + (k % 9));
      expect(Object.is(areaComSinal(contorno), copiaArea(contorno))).toBe(true);
      expect(antiHorario(contorno)).toEqual(copiaAntiHorario(contorno));
      expect(areaComSinal(antiHorario(contorno))).toBeGreaterThanOrEqual(0);
    }
  });

  it('antiHorario devolve o próprio contorno quando já está, e uma cópia invertida quando não está', () => {
    const certo = [[0, 0], [1, 0], [1, 1]];
    const errado = [...certo].reverse();
    expect(antiHorario(certo)).toBe(certo);
    expect(antiHorario(errado)).toEqual(certo);
    expect(antiHorario(errado)).not.toBe(errado);
    expect(errado).toEqual([[1, 1], [1, 0], [0, 0]]);
  });

  it('espelharMeia espelha em x = 0 na ordem inversa e dá o mesmo que a cópia', () => {
    const meia = [[0, 0], [1, 0], [1.5, 2], [0.5, 3]];
    expect(espelharMeia(meia)).toEqual([[0, 0], [1, 0], [1.5, 2], [0.5, 3], [-0.5, 3], [-1.5, 2], [-1, 0], [-0, 0]]);
    const sorte = sorteador(3);
    for (let k = 0; k < 50; k++) {
      const m = contornoDe(sorte, 2 + (k % 6));
      expect(espelharMeia(m)).toEqual(copiaEspelhar(m));
    }
    expect(espelharMeia([])).toEqual([]);
  });

  it('não altera a entrada', () => {
    const meia = [[0, 0], [1, 1]];
    const antes = JSON.stringify(meia);
    espelharMeia(meia); antiHorario(meia); areaComSinal(meia); pontosEmMetro(meia);
    expect(JSON.stringify(meia)).toBe(antes);
  });
});
