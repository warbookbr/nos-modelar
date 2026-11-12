/* ponto-na-malha.test.mjs — o ponto mais próximo de uma malha, com a grade, dá o mesmo que a varredura de todos os triângulos.
 *
 * A grade (células de 1,5 vez o triângulo típico, anéis em volta do ponto, os triângulos grandes numa lista à parte) existe para a consulta não custar o tamanho da malha; a
 * prova é que ela devolve, para pontos de todo lugar (sobre a malha, perto, longe, fora da caixa), o mesmo triângulo e o mesmo ponto que a varredura de todos. A malha de prova
 * mistura triângulos miúdos e um grande, quadriláteros e uma face degenerada. Sem dado de nenhum objeto. */
import { describe, expect, it } from 'vitest';
import { pontoNoTriangulo, prepararPontoNaMalha } from './ponto-na-malha.js';
import { triangularFace } from './triangulacao-face.js';

/** Um gerador pseudoaleatório determinístico (xorshift32), para a prova repetir. */
function sorteio(semente) {
  let s = semente >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/** Uma chapa ondulada de 60 x 40 células (quadriláteros) com um triângulo grande por cima e uma face degenerada, em ids de 1 para cima. */
function malhaDeProva() {
  const V = new Map(); const F = new Map();
  const nx = 60; const ny = 40; const passo = 2;
  const id = (i, j) => 1 + j * (nx + 1) + i;
  for (let j = 0; j <= ny; j += 1) for (let i = 0; i <= nx; i += 1) V.set(id(i, j), [i * passo, j * passo, 3 * Math.sin(i / 5) * Math.cos(j / 7)]);
  let f = 1;
  for (let j = 0; j < ny; j += 1) for (let i = 0; i < nx; i += 1) F.set(f++, { vs: [id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)] });
  const base = V.size;
  V.set(base + 1, [-200, -200, 40]); V.set(base + 2, [400, -200, 40]); V.set(base + 3, [100, 300, 40]);
  F.set(f++, { vs: [base + 1, base + 2, base + 3] });
  V.set(base + 4, [10, 10, 10]); V.set(base + 5, [20, 20, 20]); V.set(base + 6, [30, 30, 30]);
  F.set(f++, { vs: [base + 4, base + 5, base + 6] });
  return { V, F, ids: [...F.keys()] };
}

/** A resposta de referência: todo triângulo, o mais perto vence, o empate (1e-12) fica com a face de menor id e, nela, o primeiro triângulo. */
function porVarredura({ V, F, ids }, p) {
  let melhor = null;
  for (const id of [...ids].sort((a, b) => a - b)) {
    const pts = F.get(id).vs.map((v) => V.get(v));
    for (const [i, j, k] of triangularFace(pts)) {
      const q = pontoNoTriangulo(p, pts[i], pts[j], pts[k]);
      const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      if (!melhor || d < melhor.distancia - 1e-12) melhor = { face: id, ponto: q, distancia: d };
    }
  }
  return melhor;
}

describe('prepararPontoNaMalha', () => {
  const malha = malhaDeProva();
  const { maisProximo, triangulos } = prepararPontoNaMalha(malha.V, malha.F, malha.ids);

  it('conta os triângulos da malha (dois por quadrilátero, um por triângulo)', () => {
    expect(triangulos).toBe(60 * 40 * 2 + 2);
  });

  it('dá o mesmo ponto e a mesma distância que a varredura de todos os triângulos, de qualquer lugar', () => {
    const r = sorteio(20261112);
    for (let n = 0; n < 400; n += 1) {
      const p = [-60 + r() * 240, -60 + r() * 200, -30 + r() * 80];
      const a = maisProximo(p);
      const b = porVarredura(malha, p);
      expect(a.distancia).toBeCloseTo(b.distancia, 9);
      for (let e = 0; e < 3; e += 1) expect(a.ponto[e]).toBeCloseTo(b.ponto[e], 9);
    }
  });

  it('respeita o limite: sem triângulo dentro dele, devolve null', () => {
    expect(maisProximo([60, 40, 500], 10)).toBeNull();
    expect(maisProximo([60, 40, 500], 1000)).not.toBeNull();
  });

  it('é determinística: o mesmo ponto dá a mesma resposta, e a ordem das consultas não muda nenhuma', () => {
    const pontos = [[10, 10, 1], [55.5, 31.2, 0], [119, 79, 3], [-10, 20, 5], [60, 40, 90]];
    const um = pontos.map((p) => maisProximo(p));
    const outro = prepararPontoNaMalha(malha.V, malha.F, [...malha.ids].reverse());
    const dois = [...pontos].reverse().map((p) => outro.maisProximo(p)).reverse();
    expect(dois).toEqual(um);
  });

  it('devolve os vértices do triângulo e o baricentro do ponto nele', () => {
    const r = maisProximo([20.5, 20.5, 0]);
    expect(r.vertices).toHaveLength(3);
    expect(r.baricentro.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 12);
  });
});
