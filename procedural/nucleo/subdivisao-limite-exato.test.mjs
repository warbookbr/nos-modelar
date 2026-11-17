/* subdivisao-limite-exato.test.mjs — o oráculo da superfície limite (`superficieLimite`), a descendência das linhas e a medida na linha
 * (`descendenciaDasLinhas`, `medirLinhasNoLimite`): a posição confere com a fórmula fechada do ponto limite (`limitesDaGaiola`) nos pontos
 * diádicos, também no extraordinário, no vinco e na borda; a quadrática sai exata no retalho regular; a curvatura é a mesma avaliada na
 * gaiola e na gaiola refinada; e a linha lisa não tem salto de curvatura, só a rampa. */
import { describe, expect, it } from 'vitest';
import { curvaturaNormal, descendenciaDasLinhas, limitesDaGaiola, medirLinhasNoLimite, refinarGaiola, subdividirCatmullClark, superficieLimite } from './subdivisao.js';

/* a grade (N+1) x (N+1) de altura z = f(i, j), em faces anti-horárias vistas de +z */
function grade(N, f, extra = {}) {
  const vertices = []; const faces = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) vertices.push([i, j, f(i, j)]);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = j * (N + 1) + i; faces.push([k, k + 1, k + N + 2, k + N + 1]); }
  return { vertices, faces, ...extra };
}

/* a grade com o vértice do meio de valência 5: a face de baixo à direita do meio vira duas, por um ponto novo no meio da aresta de baixo */
function gradeComExtraordinario() {
  const g = grade(6, (i, j) => 0.05 * ((i - 3) ** 2) - 0.03 * ((j - 3) ** 2) + 0.01 * i * j);
  const meio = 3 * 7 + 3; const k = 3 * 7 + 3; // a face [meio, meio+1, meio+8, meio+7] tem o canto de baixo à esquerda no meio
  const fi = g.faces.findIndex((f) => f[0] === k);
  const [a, b, c, d] = g.faces[fi];
  const novo = g.vertices.length; g.vertices.push([(g.vertices[a][0] + g.vertices[d][0] + g.vertices[c][0]) / 3, (g.vertices[a][1] + g.vertices[d][1] + g.vertices[c][1]) / 3, 0.02]);
  g.faces.splice(fi, 1, [a, b, c, novo], [a, novo, c, d]);
  return { g, meio };
}

/* a face do nível n que desce da face fi da gaiola pelo caminho dos quadrantes de (u, v), e o (u, v) nela */
function descer(gaiola, fi, u, v, n) {
  let acc = 0; for (let k = 0; k < fi; k++) acc += gaiola.faces[k].length;
  const filha = (x, y) => (x < 0.5 && y < 0.5 ? [0, 2 * x, 2 * y] : y < 0.5 ? [1, 2 * y, 2 - 2 * x] : x >= 0.5 ? [2, 2 - 2 * x, 2 - 2 * y] : [3, 2 - 2 * y, 2 * x]);
  let [k, x, y] = filha(u, v); let j = acc + k;
  for (let m = 1; m < n; m++) { [k, x, y] = filha(x, y); j = 4 * j + k; }
  return { j, u: x, v: y };
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('a superfície limite exata', () => {
  it('reproduz a quadrática no retalho regular: a posição deslocada de (a + b) / 3 e a curvatura gaussiana exata', () => {
    const [a, b, c] = [0.3, -0.2, 0.15];
    const sup = superficieLimite(grade(8, (i, j) => a * i * i + b * j * j + c * i * j));
    const s = sup.avaliar(3 * 8 + 3, 0.3, 0.7);
    const [x, y] = [3.3, 3.7];
    expect(dist(s.ponto, [x, y, a * x * x + b * y * y + c * x * y + (a + b) / 3])).toBeLessThan(1e-12);
    const fx = 2 * a * x + c * y, fy = 2 * b * y + c * x; const W = 1 + fx * fx + fy * fy;
    expect(s.K).toBeCloseTo((4 * a * b - c * c) / (W * W), 12);
    expect(s.profundidade).toBe(0);
    /* a curvatura normal nas direções principais é a principal */
    expect(curvaturaNormal(s, s.d1)).toBeCloseTo(s.k1, 10);
    expect(curvaturaNormal(s, s.d2)).toBeCloseTo(s.k2, 10);
  });

  it('confere com a fórmula fechada do ponto limite nos pontos diádicos, no extraordinário, no vinco vivo, no vinco fracionário e na borda', () => {
    const { g } = gradeComExtraordinario();
    const gaiola = { ...g, vincos: [[1, 2, Infinity], [2, 3, Infinity], [15, 16, 1.5]], cantos: [0] };
    const sup = superficieLimite(gaiola);
    let G = gaiola; for (let n = 0; n < 5; n++) G = refinarGaiola(G);
    const lim = limitesDaGaiola(G);
    let pior = 0; let fundo = 0;
    gaiola.faces.forEach((f, fi) => {
      for (const [u, v] of [[0, 0], [1, 1], [0.5, 0.25], [1 / 32, 3 / 32], [0.75, 0.75]]) {
        const d = descer(gaiola, fi, u, v, 5);
        const canto = [[0, 0], [1, 0], [1, 1], [0, 1]].findIndex(([x, y]) => x === d.u && y === d.v);
        const s = sup.avaliar(fi, u, v);
        pior = Math.max(pior, dist(s.ponto, lim[G.faces[d.j][canto]]));
        fundo = Math.max(fundo, s.profundidade);
      }
    });
    expect(pior).toBeLessThan(1e-12);
    expect(fundo).toBeGreaterThan(3);
  });

  it('a curvatura é a mesma na gaiola e na gaiola refinada, perto do extraordinário; nele, a posição sai sem curvatura e a normal é a do limite', () => {
    const { g, meio } = gradeComExtraordinario();
    const sup0 = superficieLimite(g); const G2 = refinarGaiola(refinarGaiola(g)); const sup2 = superficieLimite(G2);
    let pior = 0;
    g.faces.forEach((f, fi) => {
      if (!f.includes(meio)) return;
      const c = [[0, 0], [1, 0], [1, 1], [0, 1]][f.indexOf(meio)];
      for (const t of [0.2, 0.01, 1e-4]) {
        const u = c[0] ? 1 - t : t, v = c[1] ? 1 - 0.6 * t : 0.6 * t;
        const A = sup0.avaliar(fi, u, v); const d = descer(g, fi, u, v, 2); const B = sup2.avaliar(d.j, d.u, d.v);
        expect(A.extraordinario).toBe(false);
        pior = Math.max(pior, Math.abs(A.k1 - B.k1) / Math.max(1, Math.abs(A.k1)), Math.abs(A.k2 - B.k2) / Math.max(1, Math.abs(A.k2)));
      }
      const no = sup0.avaliar(fi, c[0], c[1]);
      expect(no.extraordinario).toBe(true);
      expect(no.k1).toBe(null);
      expect(dist(no.ponto, limitesDaGaiola(g)[meio])).toBeLessThan(1e-12);
      const perto = sup0.avaliar(fi, c[0] ? 1 - 1e-6 : 1e-6, c[1] ? 1 - 1e-6 : 1e-6);
      expect(dist(no.normal, perto.normal)).toBeLessThan(1e-4);
    });
    expect(pior).toBeLessThan(1e-9);
  });

  it('o sinal da curvatura: o cubo de faces viradas para fora tem curvatura positiva', () => {
    const vertices = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
    const faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
    const s = superficieLimite({ vertices, faces }).avaliar(1, 0.5, 0.5);
    expect(s.normal[2]).toBeGreaterThan(0.99);
    expect(s.k2).toBeGreaterThan(0);
  });

  it('a face de n lados pede o canto, e (u, v) fora de [0, 1] ou a face que não existe recusam', () => {
    const sup = superficieLimite({ vertices: [[0, 0, 0], [1, 0, 0], [1, 1, 0.2], [0, 1, 0], [-0.5, 0.5, 0.1]], faces: [[0, 1, 2, 3, 4]] });
    expect(() => sup.avaliar(0, 0.5, 0.5)).not.toThrow();
    expect(() => sup.avaliar(0, 0.5, 0.5, { canto: 5 })).toThrow(/tem 5 lados, e o canto precisa ser inteiro/);
    expect(() => sup.avaliar(0, 1.5, 0.5)).toThrow(/precisa estar em \[0, 1\]/);
    expect(() => sup.avaliar(3, 0.5, 0.5)).toThrow(/não existe na gaiola/);
  });
});

describe('a descendência e a medida das linhas', () => {
  it('a descendência segue os vincos que a subdivisão marca, e a linha que não é aresta recusa', () => {
    const g = grade(4, (i, j) => 0.1 * i * j);
    const linha = [5, 6, 7, 8];
    const r = subdividirCatmullClark({ ...g, vincos: [[5, 6, 1], [6, 7, 1], [7, 8, 1]], niveis: 2, comVincos: true });
    const [d] = descendenciaDasLinhas(g.faces, g.vertices.length, 2, [linha]);
    expect(d).toHaveLength(13);
    const marcadas = new Set(r.vincos.map(([a, b]) => (a < b ? `${a},${b}` : `${b},${a}`)));
    for (let k = 1; k < d.length; k++) expect(marcadas.has(d[k - 1] < d[k] ? `${d[k - 1]},${d[k]}` : `${d[k]},${d[k - 1]}`)).toBe(true);
    expect(() => descendenciaDasLinhas(g.faces, g.vertices.length, 1, [[0, 6]])).toThrow(/que não formam aresta da gaiola/);
  });

  it('na linha lisa o salto de curvatura é zero e sobra a rampa; no vinco vivo, o ângulo', () => {
    const N = 8;
    const g = grade(N, (i, j) => (j <= 4 ? 0.02 * (j - 4) ** 2 : 0.08 * (j - 4) ** 2));
    const linha = Array.from({ length: N + 1 }, (_, i) => 4 * (N + 1) + i);
    let G = g; for (let n = 0; n < 2; n++) G = refinarGaiola(G);
    const [d] = descendenciaDasLinhas(g.faces, g.vertices.length, 2, [linha]);
    const [m] = medirLinhasNoLimite(G, [{ nome: 'meio', vertices: d }], { faixa: 2 });
    expect(m.medidas).toBeGreaterThan(50);
    expect(m.saltoMaximo).toBeLessThan(1e-10);
    expect(m.anguloMaximoGraus).toBeLessThan(1e-6);
    expect(m.inclinacaoForaDosSingulares).toBeGreaterThan(0.01);
    /* a curvatura transversal na borda da faixa: a de cada lado, desenhada (0,04 e 0,16 por unidade), e na linha, a do meio da rampa */
    const [kA, kB] = m.curvaturaNaFaixa.map(Math.abs).sort((x, y) => x - y);
    expect(kA).toBeLessThan(Math.abs(m.curvaturaNaLinha));
    expect(Math.abs(m.curvaturaNaLinha)).toBeLessThan(kB);
    const vivo = { ...g, vincos: linha.slice(1).map((v, k) => [linha[k], v, Infinity]) };
    let GV = vivo; for (let n = 0; n < 2; n++) GV = refinarGaiola(GV);
    const [mv] = medirLinhasNoLimite(GV, [{ nome: 'meio', vertices: d }], { faixa: 2 });
    expect(mv.anguloMaximoGraus).toBeGreaterThan(1);
  });
});
