/* arcos-do-contorno.test.mjs — o anel simplificado com os arcos declarados no círculo ajustado: o raio sai do ruído, o anel sem arco volta
   igual, os trechos dão os mesmos pontos e o arco facetado que ninguém declarou entra em `avisos` com a posição. */
import { describe, expect, it } from 'vitest';
import { contornoComArcos } from './arcos-do-contorno.js';
import { contornoPorTrechos } from './curva2d.js';

/* ruído determinístico em [-amplitude, amplitude]: congruencial linear com semente fixa */
function ruido(semente, amplitude) {
  let s = semente >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s / 2 ** 32 * 2 - 1) * amplitude; };
}
/* um perfil com o fundo reto e um arco de raio R por cima, de 0 a 120 graus, medido a cada 2 mm com o ruído dado */
function perfilComArco(R, amplitude) {
  const r = ruido(7, amplitude); const anel = [];
  const centro = [0, 0]; const fim = (120 * Math.PI) / 180;
  const p1 = [R * Math.cos(fim), R * Math.sin(fim)];
  for (let x = p1[0]; x < R; x += 2) anel.push([x, -50 + r()]);               // o fundo, a 50 mm abaixo do centro
  for (let y = -50; y < 0; y += 2) anel.push([R + r(), y]);                   // o lado direito, até a altura do centro
  const n = Math.ceil((fim * R) / 2);
  for (let k = 0; k <= n; k += 1) {
    const a = (fim * k) / n; const d = R + r();
    anel.push([centro[0] + d * Math.cos(a), centro[1] + d * Math.sin(a)]);
  }
  for (let y = p1[1] - 2; y > -50; y -= 2) anel.push([p1[0] + r(), y]);       // o lado esquerdo, de volta ao fundo
  return { anel, de: [R, 0], ate: p1 };
}
const mesmosPontos = (a, b, tol) => a.length === b.length && a.every((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1]) <= tol);

describe('contornoComArcos', () => {
  it('o arco de raio 386 mm medido com 0,5 mm de ruído sai com o raio a 1 mm, em 96 lados por volta', () => {
    const { anel, de, ate } = perfilComArco(386, 0.5);
    const r = contornoComArcos(anel, { arcos: [{ de, ate }] });
    const [c] = r.circulos;
    expect(Math.abs(c.raio - 386)).toBeLessThan(1);
    expect(Math.hypot(...c.centro)).toBeLessThan(1);
    expect(c.desvio).toBeLessThan(1.5);
    expect(Math.abs(Math.abs(c.angulo) - 120)).toBeLessThan(1);
    const doArco = r.pontos.filter((p) => Math.abs(Math.hypot(p[0] - c.centro[0], p[1] - c.centro[1]) - c.raio) < 1e-6 && p[1] > 1);
    expect(doArco.length).toBeGreaterThanOrEqual(Math.ceil(120 / 3.75) - 1);
    expect(r.avisos).toEqual([]);
  });

  it('os trechos com arco dão os mesmos pontos pela curva da extrusão, com segmentosArco = lados / 4', () => {
    const { anel, de, ate } = perfilComArco(386, 0.5);
    const r = contornoComArcos(anel, { arcos: [{ de, ate }] });
    expect(r.segmentosArco).toBe(24);
    expect(r.trechos.filter((t) => t.arco)).toHaveLength(1);
    const pts = contornoPorTrechos({ inicio: r.inicio, trechos: r.trechos }, { segmentosArco: r.segmentosArco });
    const i0 = r.pontos.findIndex((p) => p === r.inicio);
    expect(mesmosPontos(pts, [...r.pontos.slice(i0), ...r.pontos.slice(0, i0)], 1e-6)).toBe(true);
  });

  it('o anel sem arco declarado e sem arco facetado volta igual e sem aviso', () => {
    const anel = [[0, 0], [800, 0], [800, 300], [500, 300], [450, 600], [0, 600]];
    const r = contornoComArcos(anel);
    expect(r.pontos).toEqual(anel);
    expect(r.circulos).toEqual([]);
    expect(r.avisos).toEqual([]);
    expect(r.inicio).toEqual(anel[0]);
    expect(r.trechos).toEqual(anel.slice(1).map((p) => ({ reto: p })));
  });

  it('o arco facetado não declarado entra em avisos com as pontas', () => {
    /* um quarto de volta de raio 300 em seis facetas de 15 graus, no canto de cima à direita */
    const faceta = Array.from({ length: 7 }, (_, k) => [500 + 300 * Math.cos((Math.PI / 2) * (k / 6)), 300 + 300 * Math.sin((Math.PI / 2) * (k / 6))]);
    const anel = [[0, 0], [800, 0], ...faceta, [0, 600]];
    const r = contornoComArcos(anel);
    expect(r.pontos).toEqual(anel);
    expect(r.avisos).toHaveLength(1);
    expect(r.avisos[0]).toContain('de [800, 300] a [500, 600]');
    expect(r.avisos[0]).toContain('raio 300 mm');
    const declarado = contornoComArcos(anel, { arcos: [{ de: [800, 300], ate: [500, 600] }] });
    expect(declarado.avisos).toEqual([]);
    expect(Math.abs(declarado.circulos[0].raio - 300)).toBeLessThan(1e-6);
  });

  it('é determinística: a mesma entrada dá a mesma saída, byte a byte', () => {
    const { anel, de, ate } = perfilComArco(386, 0.5);
    expect(JSON.stringify(contornoComArcos(anel, { arcos: [{ de, ate }] }))).toBe(JSON.stringify(contornoComArcos(anel, { arcos: [{ de, ate }] })));
  });

  it('recusa o anel curto, a tolerância não positiva e o arco sem ponta, com a medida', () => {
    expect(() => contornoComArcos([[0, 0], [1, 0]])).toThrow(/três pontos/);
    expect(() => contornoComArcos([[0, 0], [1, 0], [0, 1]], { tolerancia: 0 })).toThrow(/tolerância/);
    expect(() => contornoComArcos([[0, 0], [1, 0], [0, 1]], { arcos: [{ de: [0, 0] }] })).toThrow(/arco 0/);
  });
});
