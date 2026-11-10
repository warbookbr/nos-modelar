/* triangulo-fino.test.mjs — a régua conta o leque que cruza uma região plana e deixa passar o que a triangulação não pode evitar. */
import { describe, expect, it } from 'vitest';
import { medirTrianguloFino, razaoDoTriangulo, regioesPlanas } from './triangulo-fino.mjs';

const neutroDe = (pontos, faces) => ({
  V: new Map(pontos.map((p, i) => [i, p])),
  F: new Map(faces.map((vs, i) => [i, { id: i, vs, cor: null, material: null, parte: 'p', liso: false, solido: false, tinta: [] }])),
  partes: {}, materiais: {},
});

describe('razão de aspecto do triângulo', () => {
  it('o equilátero dá 1,155, o meio quadrado 2, e o triângulo sem área, infinito', () => {
    expect(razaoDoTriangulo([0, 0, 0], [1, 0, 0], [0.5, Math.sqrt(3) / 2, 0])).toBeCloseTo(2 / Math.sqrt(3), 12);
    expect(razaoDoTriangulo([0, 0, 0], [1, 0, 0], [0, 1, 0])).toBeCloseTo(2, 12);
    expect(razaoDoTriangulo([0, 0, 0], [1, 0, 0], [2, 0, 0])).toBe(Infinity);
  });
});

describe('régua de triângulo fino', () => {
  it('o leque de um centro a um contorno de 144 lados é uma região plana de 144 triângulos finos', () => {
    const n = 144;
    const pontos = [[0, 0, 0], ...Array.from({ length: n }, (_, i) => [Math.cos((2 * Math.PI * i) / n), Math.sin((2 * Math.PI * i) / n), 0])];
    const neutro = neutroDe(pontos, Array.from({ length: n }, (_, i) => [0, 1 + i, 1 + ((i + 1) % n)]));
    const { regiao, regioes } = regioesPlanas(neutro);
    expect(regioes).toBe(1);
    expect(new Set(regiao.values()).size).toBe(1);
    const m = medirTrianguloFino(neutro);
    expect(m.triangulos).toBe(144);
    expect(m.finos).toBe(144);
    expect(m.regioes).toBe(1);
    expect(m.pior).toBeGreaterThan(22);
    expect(m.pior).toBeLessThan(23.5);
  });

  it('a lateral de um tubo de 144 lados, quadros de 3,4 por 190 mm, não tem triângulo fino: a diagonal é inevitável', () => {
    const n = 144, R = 0.077, L = 0.19;
    const pontos = [];
    for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n; pontos.push([R * Math.cos(a), R * Math.sin(a), 0], [R * Math.cos(a), R * Math.sin(a), L]); }
    const neutro = neutroDe(pontos, Array.from({ length: n }, (_, i) => [2 * i, 2 * ((i + 1) % n), 2 * ((i + 1) % n) + 1, 2 * i + 1]));
    const m = medirTrianguloFino(neutro);
    expect(m.triangulos).toBe(2 * n);
    expect(m.finos).toBe(0);
    const diagonal = razaoDoTriangulo(pontos[0], pontos[2], pontos[3]);
    expect(diagonal).toBeGreaterThan(40);
  });

  it('face curva (quadro torto) fica fora das regiões, e as duas faces coplanares ligadas por aresta viram uma região', () => {
    const torto = neutroDe([[0, 0, 0], [1, 0, 0], [1, 1, 0.3], [0, 1, 0]], [[0, 1, 2, 3]]);
    expect(regioesPlanas(torto).regioes).toBe(0);
    const plano = neutroDe([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [2, 0, 0], [2, 1, 0]], [[0, 1, 2, 3], [1, 4, 5, 2]]);
    expect(regioesPlanas(plano).regioes).toBe(1);
    const dobrada = neutroDe([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [1, 0, 1], [1, 1, 1]], [[0, 1, 2, 3], [1, 4, 5, 2]]);
    expect(regioesPlanas(dobrada).regioes).toBe(2);
  });

  it('a face degenerada fica fora da triangulação e não derruba a régua', () => {
    const neutro = neutroDe([[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0]], [[0, 1, 2], [0, 1, 3]]);
    const m = medirTrianguloFino(neutro);
    expect(m.triangulos).toBe(1);
  });
});
