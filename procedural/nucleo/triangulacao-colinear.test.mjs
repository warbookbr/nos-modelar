/* triangulacao-colinear.test.mjs — face com canto colinear não sai em triângulo de área nula.
   O polígono com um canto no meio de uma aresta é válido (a booleana o deixa, o perfil de uma extrusão o traz), mas o leque do
   canto 0 o triangula com um triângulo de área nula quando o canto 0 é uma ponta da aresta colinear. */
import { readFileSync } from 'node:fs';
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

/* A face em tira: a parede de 1 mm de um corte do sedã, 38 cantos quase colineares em cada borda (fixture com as coordenadas reais). O leque e as
   orelhas não acham triangulação sem triângulo de área nula, e a exportação recusava; o zigue-zague entre as duas cadeias existe. */
describe('face em tira com cantos colineares nos dois lados', () => {
  const tira = JSON.parse(readFileSync(new URL('../../tools/modelar/fixtures/tira-de-corte-colinear.json', import.meta.url), 'utf8'));
  const area3 = (a, b, c) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; return Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2; };
  it('triangularSemDegenerado acha o zigue-zague: 36 triângulos de altura de 1 mm, que somam a área da tira', () => {
    expect(tira).toHaveLength(38);
    for (const t of [triangularSemDegenerado(tira), triangularFace(tira)]) {
      expect(t).toHaveLength(36);
      const areas = t.map(([i, j, k]) => area3(tira[i], tira[j], tira[k]));
      expect(Math.min(...areas)).toBeGreaterThan(1e-5);       /* o lado de 3,5 cm por 1 mm: o zigue-zague, e não a área nula do leque */
      expect(areas.reduce((a, b) => a + b, 0)).toBeCloseTo((0.8615080312627651 - 0.8605075738699912) * (0.32812567535220016 + 0.315000703), 8);
      /* cada aresta de borda uma vez, e as diagonais duas, uma em cada sentido */
      const conta = new Map();
      for (const [i, j, k] of t) for (const [a, b] of [[i, j], [j, k], [k, i]]) conta.set(`${a}|${b}`, (conta.get(`${a}|${b}`) ?? 0) + 1);
      for (let i = 0; i < 38; i++) expect(conta.get(`${i}|${(i + 1) % 38}`)).toBe(1);
      for (const [c, n] of conta) { const [a, b] = c.split('|'); expect(n).toBe(1); if (Number(b) !== (Number(a) + 1) % 38) expect(conta.has(`${b}|${a}`)).toBe(true); }
    }
  });
  it('a mesma tira pelo caminho de quem exporta tem o sentido de giro do polígono', () => {
    const t = triangularSemDegenerado(tira);
    const nm = tira.reduce((s, p, i) => { const q = tira[(i + 1) % 38]; return [s[0] + p[1] * q[2] - p[2] * q[1], s[1] + p[2] * q[0] - p[0] * q[2], s[2] + p[0] * q[1] - p[1] * q[0]]; }, [0, 0, 0]);
    for (const [i, j, k] of t) {
      const a = tira[i], b = tira[j], c = tira[k]; const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      expect(((u[1] * v[2] - u[2] * v[1]) * nm[0] + (u[2] * v[0] - u[0] * v[2]) * nm[1] + (u[0] * v[1] - u[1] * v[0]) * nm[2])).toBeGreaterThan(0);
    }
  });
});

/* A tira de duas cadeias reamostrada: a passagem linear não tem limite de cantos. A tira real de 38 cantos, com cada borda reamostrada em m cantos, triangula com
   2m-2 triângulos de giro positivo, fora do critério de degenerado, e a cobertura é a área do polígono; 302 e 1.000 cantos passam, e o tempo cabe em frações de segundo. */
describe('face em tira de muitos cantos, sem limite de cantos', () => {
  const tira = JSON.parse(readFileSync(new URL('../../tools/modelar/fixtures/tira-de-corte-colinear.json', import.meta.url), 'utf8'));
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cruz3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const reamostrar = (m) => {
    const h = tira.length / 2; const A = tira.slice(0, h); const B = tira.slice(h);
    const re = (C) => Array.from({ length: m }, (_, k) => { const t = (k / (m - 1)) * (C.length - 1); const i = Math.min(C.length - 2, Math.floor(t)); const f = t - i; return C[i].map((x, e) => x + (C[i + 1][e] - x) * f); });
    return [...re(A), ...re(B)];
  };
  it.each([151, 500])('%i cantos por borda: triângulos todos de giro positivo, a área do polígono e menos de 2 s', (m) => {
    const P = reamostrar(m);
    const t0 = performance.now();
    const T = triangularSemDegenerado(P);
    const ms = performance.now() - t0;
    expect(T).not.toBeNull();
    expect(T).toHaveLength(2 * m - 2);
    const nm = P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; const c = cruz3(p, q); return [s[0] + c[0], s[1] + c[1], s[2] + c[2]]; }, [0, 0, 0]);
    let soma = 0;
    for (const [i, j, k] of T) {
      const g = cruz3(sub3(P[j], P[i]), sub3(P[k], P[i]));
      expect(g[0] * nm[0] + g[1] * nm[1] + g[2] * nm[2]).toBeGreaterThan(0);
      soma += Math.hypot(...g) / 2;
    }
    expect(soma).toBeCloseTo(Math.hypot(...nm) / 2, 8);
    expect(ms).toBeLessThan(2000);
  });
  it('a tira alinhada de 302 cantos (a que a programação dinâmica recusava acima de 300) triangula', () => {
    const P = [];
    for (let i = 0; i < 151; i++) P.push([i, 0, 0]);
    for (let i = 150; i >= 0; i--) P.push([i, 1, 0]);
    const T = triangularSemDegenerado(P);
    expect(P).toHaveLength(302);
    expect(T).toHaveLength(300);
  });
});
