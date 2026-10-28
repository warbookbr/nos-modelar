/* alisar-numerico.mjs — a álgebra e a geometria pequenas da ferramenta de alisamento.
 *
 * Sem estado e sem acaso: o mesmo dado dá o mesmo resultado, bit a bit.
 *
 *   cholesky(A, n)         fatora a matriz simétrica positiva definida (Float64Array n×n) e resolve sistemas com ela.
 *   minimosQuadradosComBolas  minimiza ½ xᵀ H x − gᵀ x com  ‖f0 + F x‖ ≤ raio por grupo de linhas, pelo método dos multiplicadores.
 *   indiceEspacial(...)    a grade que acha, em tempo curto, a face da malha mais perto de um ponto, e o pé dele nela.
 */

/** cholesky(A, n) -> { resolver(b) -> x }, com A em Float64Array de n×n (só o triângulo de baixo é lido). Lança se A não for positiva definida. */
export function cholesky(A, n) {
  const L = new Float64Array(n * n);
  for (let j = 0; j < n; j++) {
    let s = A[j * n + j];
    for (let k = 0; k < j; k++) s -= L[j * n + k] * L[j * n + k];
    if (!(s > 1e-300)) throw new Error(`alisar: a matriz do ajuste não é positiva definida na coluna ${j}`);
    const d = Math.sqrt(s); L[j * n + j] = d;
    for (let i = j + 1; i < n; i++) {
      let t = A[i * n + j];
      const li = i * n, lj = j * n;
      for (let k = 0; k < j; k++) t -= L[li + k] * L[lj + k];
      L[li + j] = t / d;
    }
  }
  const resolver = (b) => {
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) { let t = b[i]; const li = i * n; for (let k = 0; k < i; k++) t -= L[li + k] * y[k]; y[i] = t / L[li + i]; }
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) { let t = y[i]; for (let k = i + 1; k < n; k++) t -= L[k * n + i] * x[k]; x[i] = t / L[i * n + i]; }
    return x;
  };
  return { resolver };
}

/**
 * minimosQuadradosComBolas({ H, g, n, F, f0, grupos, x0, lambda0, kappa, tolerancia, externas, internas }) -> { x, lambda, violacaoMaxima, externas, internas }
 * Minimiza ½ xᵀ H x − gᵀ x sujeito a ‖f0_G + F_G x‖ ≤ raio_G para cada grupo G de linhas, com H simétrica positiva definida
 * (Float64Array n×n) e F como lista de linhas { colunas: Int32Array, valores: Float64Array } esparsas. O grupo de uma linha só
 * é a caixa |f| ≤ raio (a distância de um ponto a uma superfície, pela normal), e o de três linhas é a bola (o afastamento de um
 * ponto no espaço). O método é o dos multiplicadores (Lagrangiano aumentado): com o multiplicador λ_G de cada grupo e a
 * penalidade κ, cada passo externo minimiza
 *
 *   ½ xᵀ H x − gᵀ x + Σ_G (1 / 2κ) ( max(0, λ_G + κ (‖f_G(x)‖ − raio_G))² − λ_G² )
 *
 * por Newton com busca de linha (o Hessiano dos grupos ativos é κ a aᵀ + m ∇²‖f‖, em que a = F_Gᵀ f/‖f‖ e m é o multiplicador
 * novo, e a fatoração é de Cholesky), e depois atualiza λ_G com o m do grupo. Para quando nenhum grupo passa do raio mais que
 * `tolerancia` (milímetro). O mesmo λ e o mesmo x servem de partida para a chamada seguinte, com outros pesos.
 */
export function minimosQuadradosComBolas({ H, g, n, F, f0, grupos, x0 = null, lambda0 = null, kappa, tolerancia = 5e-3, externas = 12, internas = 12 }) {
  const x = x0 ? Float64Array.from(x0) : new Float64Array(n);
  const lambda = lambda0 ? Float64Array.from(lambda0) : new Float64Array(grupos.length);
  const Hx = new Float64Array(n);
  const v = new Float64Array(F.length);
  const avaliar = (xx) => {
    for (let i = 0; i < F.length; i++) { const { colunas, valores } = F[i]; let s = f0[i]; for (let a = 0; a < colunas.length; a++) s += valores[a] * xx[colunas[a]]; v[i] = s; }
  };
  const normaDe = (G) => { let q = 0; for (const i of G.linhas) q += v[i] * v[i]; return Math.sqrt(q); };
  const quadratica = (xx) => {
    let q = 0, l = 0;
    for (let i = 0; i < n; i++) { let s = 0; const li = i * n; for (let j = 0; j < n; j++) s += H[li + j] * xx[j]; Hx[i] = s; q += 0.5 * xx[i] * s - g[i] * xx[i]; l += 0; }
    return q + l;
  };
  const valorAL = (xx) => {
    avaliar(xx);
    let t = quadratica(xx);
    grupos.forEach((G, k) => { const m = Math.max(0, lambda[k] + kappa * (normaDe(G) - G.raio)); t += (m * m - lambda[k] * lambda[k]) / (2 * kappa); });
    return t;
  };
  let totalInternas = 0; let totalExternas = 0; let violacaoMaxima = Infinity;
  for (let ext = 0; ext < externas; ext++) {
    totalExternas += 1;
    for (let it = 0; it < internas; it++) {
      totalInternas += 1;
      avaliar(x); quadratica(x);
      const grad = new Float64Array(n); for (let i = 0; i < n; i++) grad[i] = Hx[i] - g[i];
      const A = Float64Array.from(H);
      let ativos = 0;
      grupos.forEach((G, k) => {
        const norma = normaDe(G); const m = lambda[k] + kappa * (norma - G.raio);
        if (!(m > 0)) return;
        ativos += 1;
        /* as colunas do grupo e a matriz local das suas linhas */
        const mapa = new Map(); const cols = [];
        for (const i of G.linhas) for (const c of F[i].colunas) if (!mapa.has(c)) { mapa.set(c, cols.length); cols.push(c); }
        const L = G.linhas.map((i) => { const r = new Float64Array(cols.length); const { colunas, valores } = F[i]; for (let a = 0; a < colunas.length; a++) r[mapa.get(colunas[a])] = valores[a]; return r; });
        const u = norma > 1e-12 ? G.linhas.map((i) => v[i] / norma) : G.linhas.map((_, p) => (p === 0 ? 1 : 0));
        const a = new Float64Array(cols.length);
        L.forEach((r, p) => { for (let c = 0; c < cols.length; c++) a[c] += u[p] * r[c]; });
        for (let c = 0; c < cols.length; c++) grad[cols[c]] += m * a[c];
        for (let c = 0; c < cols.length; c++) for (let d = 0; d < cols.length; d++) A[cols[c] * n + cols[d]] += kappa * a[c] * a[d];
        if (G.linhas.length > 1 && norma > 1e-12) {
          const s = m / norma;
          /* ∇²‖f‖ = F_Gᵀ (I − u uᵀ) F_G / ‖f‖ */
          const T = L.map((r, p) => { const t = new Float64Array(cols.length); for (let q = 0; q < L.length; q++) { const P = (p === q ? 1 : 0) - u[p] * u[q]; if (P !== 0) for (let c = 0; c < cols.length; c++) t[c] += P * L[q][c]; } return t; });
          for (let c = 0; c < cols.length; c++) for (let d = 0; d < cols.length; d++) { let z = 0; for (let p = 0; p < L.length; p++) z += L[p][c] * T[p][d]; A[cols[c] * n + cols[d]] += s * z; }
        }
      });
      let gn = 0; for (let i = 0; i < n; i++) gn = Math.max(gn, Math.abs(grad[i]));
      const passo = cholesky(A, n).resolver(grad);
      /* busca de linha pelo valor do Lagrangiano aumentado */
      const v0 = valorAL(x);
      let t = 1; let aceito = false; const novo = new Float64Array(n);
      let slope = 0; for (let i = 0; i < n; i++) slope -= grad[i] * passo[i];
      for (let b = 0; b < 25; b++) {
        for (let i = 0; i < n; i++) novo[i] = x[i] - t * passo[i];
        if (valorAL(novo) <= v0 + 1e-4 * t * slope + 1e-12 * Math.abs(v0)) { aceito = true; break; }
        t *= 0.5;
      }
      if (!aceito) break;
      let dx = 0; for (let i = 0; i < n; i++) { dx = Math.max(dx, Math.abs(novo[i] - x[i])); x[i] = novo[i]; }
      if (dx < 1e-7 || (gn < 1e-9 && ativos === 0)) break;
    }
    avaliar(x);
    violacaoMaxima = 0;
    grupos.forEach((G, k) => {
      const c = normaDe(G) - G.raio;
      violacaoMaxima = Math.max(violacaoMaxima, c);
      lambda[k] = Math.max(0, lambda[k] + kappa * c);
    });
    if (violacaoMaxima < tolerancia) break;
  }
  return { x, lambda, violacaoMaxima, externas: totalExternas, internas: totalInternas };
}

/* ---- geometria da malha ---- */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** peDoPontoNoTriangulo(p, a, b, c) -> { pe, bary: [α, β, γ], d2 } o ponto do triângulo mais perto de p (Ericson, Real-Time Collision Detection). */
export function peDoPontoNoTriangulo(p, a, b, c) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  const fim = (bary) => {
    const pe = [bary[0] * a[0] + bary[1] * b[0] + bary[2] * c[0], bary[0] * a[1] + bary[1] * b[1] + bary[2] * c[1], bary[0] * a[2] + bary[1] * b[2] + bary[2] * c[2]];
    const d = sub(p, pe);
    return { pe, bary, d2: dot(d, d) };
  };
  if (d1 <= 0 && d2 <= 0) return fim([1, 0, 0]);
  const bp = sub(p, b); const d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return fim([0, 1, 0]);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return fim([1 - v, v, 0]); }
  const cp = sub(p, c); const d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return fim([0, 0, 1]);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return fim([1 - w, 0, w]); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return fim([0, 1 - w, w]); }
  const den = 1 / (va + vb + vc); const v = vb * den, w = vc * den;
  return fim([1 - v - w, v, w]);
}

/**
 * indiceEspacial(vertices, faces) -> { maisPerto(p, alcance) -> { face, a, b, c, bary, pe, distancia, normal } | null }
 * A grade uniforme dos centros das faces (quadriláteros ou triângulos); cada quadrilátero se divide nos triângulos
 * (0, 1, 2) e (0, 2, 3), e o pé é o do triângulo mais perto. `alcance` limita a busca, em metro. A normal é a do triângulo.
 */
export function indiceEspacial(vertices, faces) {
  const centros = faces.map((f) => { const c = [0, 0, 0]; for (const v of f) { c[0] += vertices[v][0]; c[1] += vertices[v][1]; c[2] += vertices[v][2]; } return c.map((x) => x / f.length); });
  let aresta = 0; let n = 0;
  for (const f of faces) for (let k = 0; k < f.length; k++) { const p = vertices[f[k]], q = vertices[f[(k + 1) % f.length]]; aresta += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); n += 1; }
  const celula = Math.max(1e-6, 3 * aresta / Math.max(1, n));
  const chave = (i, j, k) => `${i},${j},${k}`;
  const grade = new Map();
  centros.forEach((c, fi) => {
    const k = chave(Math.floor(c[0] / celula), Math.floor(c[1] / celula), Math.floor(c[2] / celula));
    if (!grade.has(k)) grade.set(k, []);
    grade.get(k).push(fi);
  });
  const triangulos = (f) => (f.length === 4 ? [[f[0], f[1], f[2]], [f[0], f[2], f[3]]] : [[f[0], f[1], f[2]]]);
  const maisPerto = (p, alcance) => {
    const raio = Math.ceil((alcance + celula) / celula);
    const ci = Math.floor(p[0] / celula), cj = Math.floor(p[1] / celula), ck = Math.floor(p[2] / celula);
    let melhor = null;
    for (let i = ci - raio; i <= ci + raio; i++) for (let j = cj - raio; j <= cj + raio; j++) for (let k = ck - raio; k <= ck + raio; k++) {
      const lista = grade.get(chave(i, j, k)); if (!lista) continue;
      for (const fi of lista) {
        for (const [a, b, c] of triangulos(faces[fi])) {
          const r = peDoPontoNoTriangulo(p, vertices[a], vertices[b], vertices[c]);
          if (!melhor || r.d2 < melhor.d2 - 1e-24 || (Math.abs(r.d2 - melhor.d2) <= 1e-24 && fi < melhor.face)) melhor = { ...r, face: fi, a, b, c };
        }
      }
    }
    if (!melhor || Math.sqrt(melhor.d2) > alcance) return null;
    const nn = cross(sub(vertices[melhor.b], vertices[melhor.a]), sub(vertices[melhor.c], vertices[melhor.a]));
    const l = Math.hypot(nn[0], nn[1], nn[2]) || 1;
    return { face: melhor.face, a: melhor.a, b: melhor.b, c: melhor.c, bary: melhor.bary, pe: melhor.pe, distancia: Math.sqrt(melhor.d2), normal: nn.map((x) => x / l) };
  };
  return { maisPerto };
}
