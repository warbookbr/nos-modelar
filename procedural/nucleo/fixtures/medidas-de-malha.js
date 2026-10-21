/* medidas-de-malha.js — medidas de teste sobre malha poligonal por índice, sem Three.js: área, volume com sinal,
 * distância de pontos a triângulos e cruzamento de arestas com triângulos. Servem aos testes da subdivisão, da gaiola
 * por estações e da espessura, que medem a forma de prova; nenhuma receita as usa. */

const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const cruz = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** triangulos(faces) -> o leque de cada face, [f0, fk, fk+1], na ordem das faces. */
export const triangulos = (faces) => faces.flatMap((f) => f.slice(1, -1).map((_, j) => [f[0], f[j + 1], f[j + 2]]));

/** area(vertices, faces) -> a soma das áreas dos triângulos do leque de cada face. */
export function area(vertices, faces) {
  let s = 0;
  for (const [a, b, c] of triangulos(faces)) { const n = cruz(sub(vertices[b], vertices[a]), sub(vertices[c], vertices[a])); s += Math.hypot(n[0], n[1], n[2]) / 2; }
  return s;
}

/** volume(vertices, faces) -> o volume com sinal da malha fechada, positivo com a normal para fora. */
export function volume(vertices, faces) {
  let s = 0;
  for (const [a, b, c] of triangulos(faces)) s += dot(vertices[a], cruz(vertices[b], vertices[c])) / 6;
  return s;
}

/* Grade de células cúbicas com os triângulos pela caixa de cada um. */
function grade(tris, celula) {
  const g = new Map(); const ch = (i, j, k) => `${i},${j},${k}`;
  tris.forEach((t, n) => {
    const lo = [0, 1, 2].map((e) => Math.floor(Math.min(t[0][e], t[1][e], t[2][e]) / celula));
    const hi = [0, 1, 2].map((e) => Math.floor(Math.max(t[0][e], t[1][e], t[2][e]) / celula));
    for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) { const c = ch(i, j, k); if (!g.has(c)) g.set(c, []); g.get(c).push(n); }
  });
  return { em: (i, j, k) => g.get(ch(i, j, k)) ?? [] };
}

/** distancias(pontos, tris, celula) -> a distância de cada ponto ao triângulo mais próximo (tris em posições); a busca
 *  abre anéis de células até que a menor distância achada caiba no raio já varrido. */
export function distancias(pontos, tris, celula = 0.02) {
  const g = grade(tris, celula);
  return pontos.map((p) => {
    const c = p.map((x) => Math.floor(x / celula));
    let melhor = Infinity;
    for (let r = 1; melhor > r * celula - celula; r++) {
      const vistos = new Set();
      for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) {
        for (const n of g.em(c[0] + i, c[1] + j, c[2] + k)) { if (vistos.has(n)) continue; vistos.add(n); const d = pontoTriangulo(p, tris[n]); if (d < melhor) melhor = d; }
      }
    }
    return melhor;
  });
}

/** pontoTriangulo(p, [a, b, c]) -> a distância do ponto ao triângulo, pela região de Voronoi do ponto mais próximo
 *  (Ericson, Real-Time Collision Detection). */
export function pontoTriangulo(p, [a, b, c]) {
  const em = (o, u, s, v = [0, 0, 0], t = 0) => [o[0] + s * u[0] + t * v[0], o[1] + s * u[1] + t * v[1], o[2] + s * u[2] + t * v[2]];
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return dist(p, a);
  const bp = sub(p, b); const d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return dist(p, b);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return dist(p, em(a, ab, d1 / (d1 - d3)));
  const cp = sub(p, c); const d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return dist(p, c);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return dist(p, em(a, ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return dist(p, em(b, sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6))));
  const den = 1 / (va + vb + vc);
  return dist(p, em(a, ab, vb * den, ac, vc * den));
}

/** cruzamentos(vertices, faces, celula) -> as arestas do leque de triangulação que atravessam o interior de um
 *  triângulo que não toca nenhuma das pontas delas: [{ aresta: [a, b], triangulo: [i, j, k] }]. Numa malha sem
 *  auto-interseção a lista é vazia, porque dois triângulos que se cruzam têm uma aresta de um atravessando o outro. */
export function cruzamentos(vertices, faces, celula = 0.02, folga = 1e-9) {
  const T = triangulos(faces);
  const g = grade(T.map((t) => t.map((i) => vertices[i])), celula);
  const arestas = new Map();
  for (const [a, b, c] of T) for (const [p, q] of [[a, b], [b, c], [c, a]]) arestas.set(p < q ? `${p},${q}` : `${q},${p}`, p < q ? [p, q] : [q, p]);
  const achados = [];
  for (const [a, b] of arestas.values()) {
    const A = vertices[a], B = vertices[b]; const d = sub(B, A);
    const lo = [0, 1, 2].map((e) => Math.floor(Math.min(A[e], B[e]) / celula));
    const hi = [0, 1, 2].map((e) => Math.floor(Math.max(A[e], B[e]) / celula));
    const vistos = new Set();
    for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) {
      for (const n of g.em(i, j, k)) {
        if (vistos.has(n)) continue; vistos.add(n);
        const t = T[n]; if (t.includes(a) || t.includes(b)) continue;
        /* Möller-Trumbore: o segmento A + s d atravessa o interior do triângulo */
        const P0 = vertices[t[0]], e1 = sub(vertices[t[1]], P0), e2 = sub(vertices[t[2]], P0);
        const h = cruz(d, e2); const det = dot(e1, h);
        if (Math.abs(det) < 1e-30) continue;
        const inv = 1 / det; const w = sub(A, P0);
        const u = dot(w, h) * inv; if (u <= folga || u >= 1 - folga) continue;
        const q = cruz(w, e1); const v = dot(d, q) * inv; if (v <= folga || u + v >= 1 - folga) continue;
        const s = dot(e2, q) * inv; if (s <= folga || s >= 1 - folga) continue;
        achados.push({ aresta: [a, b], triangulo: t });
      }
    }
  }
  return achados;
}
