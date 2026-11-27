/* luz-rasante.mjs — a luz rasante da malha original e da reduzida lado a lado, em software, com a diferença.
 *
 * `vistas:superficie` (tools/modelar/vistas-de-superficie.mjs) executa a receita e não aceita uma malha pronta, então a malha reduzida não passa
 * por ele. Aqui as duas malhas neutras passam pelo mesmo desenho: câmera ortográfica, luz a 10 graus do plano da imagem, normais lisas por
 * vértice com quebra a 30 graus (a regra do `liso` das peças), recalculadas sobre cada malha como o adaptador faria. Grava a original, a
 * reduzida e a diferença ampliada 8 vezes, e devolve a diferença por pixel. O desenho não é o da bancada: serve para comparar as duas malhas
 * entre si. */
import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { triangularFace } from '../../../../procedural/nucleo/triangulacao-face.js';

const VISTAS = { lado: { olho: [1, 0, 0], cima: [0, 1, 0] }, tresquartos: { olho: [0.62, 0.42, 0.66], cima: [0, 1, 0] }, topo: { olho: [0, 1, 0], cima: [0, 0, 1] }, frente: { olho: [0, 0, 1], cima: [0, 1, 0] } };
const nz = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function paraTriangulos(neutro, recortar) {
  const ids = new Map(); const P = []; const T = [];
  const no = (v) => { let i = ids.get(v); if (i === undefined) { i = ids.size; ids.set(v, i); const p = neutro.V.get(v); P.push(p[0] * 1000, p[1] * 1000, p[2] * 1000); } return i; };
  for (const f of neutro.F.values()) {
    if (recortar && !recortar(f)) continue;
    if (f.vs.length === 3) { T.push(no(f.vs[0]), no(f.vs[1]), no(f.vs[2])); continue; }
    for (const [a, b, c] of triangularFace(f.vs.map((v) => neutro.V.get(v)))) T.push(no(f.vs[a]), no(f.vs[b]), no(f.vs[c]));
  }
  return { P: Float64Array.from(P), T: Int32Array.from(T) };
}

function desenhar({ P, T }, cena, luz) {
  const { u, v, w, mn, esc, W, H } = cena; const nT = T.length / 3;
  const N = new Float64Array(T.length), A = new Float64Array(nT);
  for (let t = 0; t < nT; t++) {
    const a = T[3 * t], b = T[3 * t + 1], c = T[3 * t + 2];
    const n = cr([P[3 * b] - P[3 * a], P[3 * b + 1] - P[3 * a + 1], P[3 * b + 2] - P[3 * a + 2]], [P[3 * c] - P[3 * a], P[3 * c + 1] - P[3 * a + 1], P[3 * c + 2] - P[3 * a + 2]]);
    const l = Math.hypot(...n) || 1; N[3 * t] = n[0] / l; N[3 * t + 1] = n[1] / l; N[3 * t + 2] = n[2] / l; A[t] = l;
  }
  const vt = new Map(); for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) { const q = T[3 * t + k]; let l = vt.get(q); if (!l) vt.set(q, l = []); l.push(t); }
  const c30 = Math.cos(30 * Math.PI / 180); const CN = new Float64Array(T.length * 3);
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) {
    let x = 0, y = 0, z = 0;
    for (const s of vt.get(T[3 * t + k])) if (N[3 * s] * N[3 * t] + N[3 * s + 1] * N[3 * t + 1] + N[3 * s + 2] * N[3 * t + 2] >= c30) { x += N[3 * s] * A[s]; y += N[3 * s + 1] * A[s]; z += N[3 * s + 2] * A[s]; }
    const l = Math.hypot(x, y, z) || 1; const o = 9 * t + 3 * k; CN[o] = x / l; CN[o + 1] = y / l; CN[o + 2] = z / l;
  }
  const img = new Float32Array(W * H).fill(-1); const zb = new Float32Array(W * H).fill(-1e30);
  const h = nz([luz[0] + w[0], luz[1] + w[1], luz[2] + w[2]]);
  for (let t = 0; t < nT; t++) {
    const X = [], Y = [], Z = [];
    for (let k = 0; k < 3; k++) { const q = T[3 * t + k]; const p = [P[3 * q], P[3 * q + 1], P[3 * q + 2]]; X.push((dt(p, u) - mn[0]) * esc + 10); Y.push(H - 10 - (dt(p, v) - mn[1]) * esc); Z.push(dt(p, w)); }
    const den = (Y[1] - Y[2]) * (X[0] - X[2]) + (X[2] - X[1]) * (Y[0] - Y[2]); if (Math.abs(den) < 1e-12) continue;
    const x0 = Math.max(0, Math.floor(Math.min(...X))), x1 = Math.min(W - 1, Math.ceil(Math.max(...X))), y0 = Math.max(0, Math.floor(Math.min(...Y))), y1 = Math.min(H - 1, Math.ceil(Math.max(...Y)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const l0 = ((Y[1] - Y[2]) * (px - X[2]) + (X[2] - X[1]) * (py - Y[2])) / den, l1 = ((Y[2] - Y[0]) * (px - X[2]) + (X[0] - X[2]) * (py - Y[2])) / den, l2 = 1 - l0 - l1;
      if (l0 < -1e-6 || l1 < -1e-6 || l2 < -1e-6) continue;
      const z = l0 * Z[0] + l1 * Z[1] + l2 * Z[2]; const i = y * W + x; if (z <= zb[i]) continue; zb[i] = z; const o = 9 * t;
      let n = nz([l0 * CN[o] + l1 * CN[o + 3] + l2 * CN[o + 6], l0 * CN[o + 1] + l1 * CN[o + 4] + l2 * CN[o + 7], l0 * CN[o + 2] + l1 * CN[o + 5] + l2 * CN[o + 8]]);
      if (dt(n, w) < 0) n = n.map((c) => -c);
      img[i] = Math.min(1, 0.04 + 0.75 * Math.max(0, dt(n, luz)) + 0.5 * Math.pow(Math.max(0, dt(n, h)), 40));
    }
  }
  return img;
}

/** Grava `<prefixo>-<vista>-<azimute>-{original,reduzida,diferenca-x8}.png` e devolve a diferença por pixel de cada vista. `recortar(face)` limita as faces. */
export function luzRasante(original, reduzida, prefixo, { vista = 'lado', largura = 1500, azimutes = [20, 160], recortar = null } = {}) {
  const A = paraTriangulos(original, recortar), B = paraTriangulos(reduzida, recortar);
  const w = nz(VISTAS[vista].olho); const u = nz(cr(VISTAS[vista].cima, w)); const v = cr(w, u);
  const mn = [Infinity, Infinity], mx = [-Infinity, -Infinity];
  for (let i = 0; i < A.P.length; i += 3) { const p = [A.P[i], A.P[i + 1], A.P[i + 2]]; const a = dt(p, u), b = dt(p, v); mn[0] = Math.min(mn[0], a); mx[0] = Math.max(mx[0], a); mn[1] = Math.min(mn[1], b); mx[1] = Math.max(mx[1], b); }
  const esc = (largura - 20) / (mx[0] - mn[0]); const cena = { u, v, w, mn, esc, W: largura, H: Math.ceil((mx[1] - mn[1]) * esc) + 20 };
  const { W, H } = cena; const saida = [];
  const grava = (nome, f) => { const png = new PNG({ width: W, height: H }); for (let i = 0; i < W * H; i++) { const [r, g, b] = f(i); png.data[4 * i] = r; png.data[4 * i + 1] = g; png.data[4 * i + 2] = b; png.data[4 * i + 3] = 255; } writeFileSync(nome, PNG.sync.write(png)); };
  const cinza = (a) => (i) => (a[i] < 0 ? [24, 28, 34] : [Math.round(a[i] * 255), Math.round(a[i] * 255), Math.round(a[i] * 255)]);
  for (const az of azimutes) {
    const a = az * Math.PI / 180, el = 10 * Math.PI / 180;
    const luz = nz([0, 1, 2].map((k) => Math.cos(el) * (Math.cos(a) * u[k] + Math.sin(a) * v[k]) + Math.sin(el) * w[k]));
    const a0 = desenhar(A, cena, luz), a1 = desenhar(B, cena, luz);
    let n = 0, soma = 0, acima4 = 0, acima16 = 0, pior = 0, silhueta = 0;
    for (let i = 0; i < W * H; i++) {
      if (a0[i] < 0 && a1[i] < 0) continue; if (a0[i] < 0 || a1[i] < 0) { silhueta++; continue; }
      n++; const d = Math.abs(a0[i] - a1[i]) * 255; soma += d; if (d > 4) acima4++; if (d > 16) acima16++; if (d > pior) pior = d;
    }
    saida.push({ vista, azimute: az, largura: W, altura: H, pixelsDaPeca: n, diferencaMedia255: +(soma / n).toFixed(3), acima4Pct: +(100 * acima4 / n).toFixed(3), acima16Pct: +(100 * acima16 / n).toFixed(4), maior255: Math.round(pior), pixelsDeSilhuetaDiferente: silhueta });
    const base = `${prefixo}-${vista}-${az}`;
    grava(`${base}-original.png`, cinza(a0)); grava(`${base}-reduzida.png`, cinza(a1));
    grava(`${base}-diferenca-x8.png`, (i) => { if (a0[i] < 0 && a1[i] < 0) return [24, 28, 34]; if (a0[i] < 0 || a1[i] < 0) return [255, 0, 255]; const c = Math.min(255, Math.round(Math.abs(a0[i] - a1[i]) * 255 * 8)); return [c, c, c]; });
  }
  return saida;
}
