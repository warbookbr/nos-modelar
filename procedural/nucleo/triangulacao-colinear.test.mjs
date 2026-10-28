/* triangulacao-colinear.test.mjs — face com canto colinear não sai em triângulo de área nula.
   O polígono com um canto no meio de uma aresta é válido (a booleana o deixa, o perfil de uma extrusão o traz), mas o leque do
   canto 0 o triangula com um triângulo de área nula quando o canto 0 é uma ponta da aresta colinear. */
import { describe, expect, it } from 'vitest';
import { triangularFace, triangularSemDegenerado } from './triangulacao-face.js';

const area2d = (a, b, c) => ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
const areaDoPoligono = (pts) => pts.reduce((soma, p, i) => soma + (p[0] * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * p[1]) / 2, 0);

/* Os triângulos têm área positiva (mesmo sentido do polígono) e somam a área do polígono: os dois juntos fazem o ladrilhamento. */
function conferirLadrilhamento(pts, triangulos) {
  expect(triangulos).toHaveLength(pts.length - 2);
  const areas = triangulos.map(([i, j, k]) => area2d(pts[i], pts[j], pts[k]));
  for (const area of areas) expect(area).toBeGreaterThan(1e-9);
  expect(areas.reduce((a, b) => a + b, 0)).toBeCloseTo(areaDoPoligono(pts), 12);
}

const PENTAGONO = [[0, 0, 0], [0.5, 0, 0], [1, 0, 0], [1, 0.4, 0], [0, 0.4, 0]];
const L = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [1, 1, 0], [1, 2, 0], [0, 2, 0]];
const U = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [3, 2, 0], [2, 2, 0], [2, 1, 0], [1, 1, 0], [1, 2, 0], [0, 2, 0]];

describe('triangulação sem triângulo de área nula', () => {
  it('o leque do canto 0 que já não tem triângulo degenerado sai igual ao de antes', () => {
    const quadrado = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]];
    expect(triangularSemDegenerado(quadrado)).toEqual([[0, 1, 2], [0, 2, 3]]);
    const hexagono = [[1, 0, 0], [0.5, 0.8, 0], [-0.5, 0.8, 0], [-1, 0, 0], [-0.5, -0.8, 0], [0.5, -0.8, 0]];
    expect(triangularSemDegenerado(hexagono)).toEqual([[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5]]);
    expect(triangularFace(quadrado)).toEqual([[0, 1, 2], [0, 2, 3]]);
  });

  it('o canto colinear no começo do leque troca de canto e a face fica sem triângulo de área nula', () => {
    expect(area2d(PENTAGONO[0], PENTAGONO[1], PENTAGONO[2])).toBe(0);
    const t = triangularSemDegenerado(PENTAGONO);
    expect(t).not.toEqual([[0, 1, 2], [0, 2, 3], [0, 3, 4]]);
    conferirLadrilhamento(PENTAGONO, t);
    expect(triangularFace(PENTAGONO)).toEqual(t);
  });

  it('o canto colinear no fim do leque também troca de canto', () => {
    const girado = [...PENTAGONO.slice(2), ...PENTAGONO.slice(0, 2)];
    conferirLadrilhamento(girado, triangularSemDegenerado(girado));
  });

  it('um polígono côncavo com canto colinear usa o canto que enxerga todos os outros', () => {
    conferirLadrilhamento(L, triangularSemDegenerado(L));
  });

  it('sem leque que sirva, as orelhas fecham a face', () => {
    const t = triangularSemDegenerado(U);
    conferirLadrilhamento(U, t);
    /* nenhum canto é o centro de todos os triângulos: não é um leque */
    const centros = [0, 1, 2].map((p) => new Set(t.map((tri) => tri[p])).size);
    expect(centros.every((n) => n > 1)).toBe(true);
  });

  it('é determinística: a mesma entrada dá a mesma saída', () => {
    expect(triangularSemDegenerado(U)).toEqual(triangularSemDegenerado(U));
  });

  it('o critério de degenerado de quem chama manda: com ele frouxo o leque do canto 0 fica', () => {
    expect(triangularSemDegenerado(PENTAGONO, () => false)).toEqual([[0, 1, 2], [0, 2, 3], [0, 3, 4]]);
  });

  it('devolve null quando nenhuma triangulação serve', () => {
    expect(triangularSemDegenerado([[0, 0, 0], [1, 0, 0], [2, 0, 0]])).toBeNull();
    expect(triangularSemDegenerado(PENTAGONO, () => true)).toBeNull();
  });
});
