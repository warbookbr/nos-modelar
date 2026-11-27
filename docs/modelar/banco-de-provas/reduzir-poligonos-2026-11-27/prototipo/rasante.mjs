// luz rasante em software: a malha original e a reduzida na mesma câmera ortográfica e na mesma luz a 10 graus do plano da imagem,
// normais lisas com quebra a 30 graus (como o `liso` da peça). Grava original, reduzida e diferença x8, e mede a diferença por pixel.
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from './dep/node_modules/pngjs/lib/png.js';
const [arqMalha, arqRed, saida, vistaNome = 'lado', larguraTxt = '1500', herdar = ''] = process.argv.slice(2);
const d = JSON.parse(readFileSync(arqMalha)); const P = d.pos.map((x) => x * 1000);
const T0 = []; for (const f of d.faces) { const vs = f.slice(1); for (let k = 1; k + 1 < vs.length; k++) T0.push(vs[0], vs[k], vs[k+1]); }
const T1 = JSON.parse(readFileSync(arqRed)).tris.flatMap(([, t]) => t);
const VISTAS = { lado: { olho: [1, 0, 0], cima: [0, 1, 0] }, tresquartos: { olho: [0.62, 0.42, 0.66], cima: [0, 1, 0] }, topo: { olho: [0, 1, 0], cima: [0, 0, 1] }, frente: { olho: [0, 0, 1], cima: [0, 1, 0] } };
const nz = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); }; const cr = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; const dt = (a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const w = nz(VISTAS[vistaNome].olho); const u = nz(cr(VISTAS[vistaNome].cima, w)); const v = cr(w, u);
const W = +larguraTxt; let mn = [1e9, 1e9], mx = [-1e9, -1e9];
for (let i = 0; i < P.length; i += 3) { const p = [P[i], P[i+1], P[i+2]]; const a = dt(p, u), b = dt(p, v); if (a < mn[0]) mn[0] = a; if (a > mx[0]) mx[0] = a; if (b < mn[1]) mn[1] = b; if (b > mx[1]) mx[1] = b; }
const esc = (W - 20) / (mx[0] - mn[0]); const H = Math.ceil((mx[1] - mn[1]) * esc) + 20;
let HERDA = null;
function render(T, luz, herdar = false) {
  const nT = T.length / 3; const N = new Float64Array(T.length); const A = new Float64Array(nT);
  for (let t = 0; t < nT; t++) { const a = T[3*t], b = T[3*t+1], c = T[3*t+2]; const e1 = [P[3*b]-P[3*a], P[3*b+1]-P[3*a+1], P[3*b+2]-P[3*a+2]], e2 = [P[3*c]-P[3*a], P[3*c+1]-P[3*a+1], P[3*c+2]-P[3*a+2]]; const n = cr(e1, e2); const l = Math.hypot(...n) || 1; N[3*t] = n[0]/l; N[3*t+1] = n[1]/l; N[3*t+2] = n[2]/l; A[t] = l; }
  const vt = new Map(); for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) { const q = T[3*t+k]; let l = vt.get(q); if (!l) vt.set(q, l = []); l.push(t); }
  const c30 = Math.cos(30 * Math.PI / 180); const CN = new Float64Array(T.length * 3);
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) { let x = 0, y = 0, z = 0; for (const s of vt.get(T[3*t+k])) if (N[3*s]*N[3*t]+N[3*s+1]*N[3*t+1]+N[3*s+2]*N[3*t+2] >= c30) { x += N[3*s]*A[s]; y += N[3*s+1]*A[s]; z += N[3*s+2]*A[s]; } const l = Math.hypot(x, y, z) || 1; const o = 9*t+3*k; CN[o] = x/l; CN[o+1] = y/l; CN[o+2] = z/l; }
  if (!herdar) { HERDA = new Map(); for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) { const q = T[3*t+k]; let l = HERDA.get(q); if (!l) HERDA.set(q, l = []); const o = 9*t+3*k; l.push([N[3*t], N[3*t+1], N[3*t+2], CN[o], CN[o+1], CN[o+2]]); } }
  else for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) { const l = HERDA.get(T[3*t+k]); let m = -2, e = null; for (const x of l) { const c = x[0]*N[3*t]+x[1]*N[3*t+1]+x[2]*N[3*t+2]; if (c > m) { m = c; e = x; } } const o = 9*t+3*k; CN[o] = e[3]; CN[o+1] = e[4]; CN[o+2] = e[5]; }
  const img = new Float32Array(W * H).fill(-1); const zb = new Float32Array(W * H).fill(-1e30);
  for (let t = 0; t < nT; t++) { const X = [], Y = [], Z = []; for (let k = 0; k < 3; k++) { const q = T[3*t+k]; const p = [P[3*q], P[3*q+1], P[3*q+2]]; X.push((dt(p, u) - mn[0]) * esc + 10); Y.push(H - 10 - (dt(p, v) - mn[1]) * esc); Z.push(dt(p, w)); }
    const den = (Y[1]-Y[2])*(X[0]-X[2]) + (X[2]-X[1])*(Y[0]-Y[2]); if (Math.abs(den) < 1e-12) continue;
    const x0 = Math.max(0, Math.floor(Math.min(...X))), x1 = Math.min(W-1, Math.ceil(Math.max(...X))), y0 = Math.max(0, Math.floor(Math.min(...Y))), y1 = Math.min(H-1, Math.ceil(Math.max(...Y)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const px = x + 0.5, py = y + 0.5; const l0 = ((Y[1]-Y[2])*(px-X[2]) + (X[2]-X[1])*(py-Y[2])) / den, l1 = ((Y[2]-Y[0])*(px-X[2]) + (X[0]-X[2])*(py-Y[2])) / den, l2 = 1 - l0 - l1; if (l0 < -1e-6 || l1 < -1e-6 || l2 < -1e-6) continue;
      const z = l0*Z[0]+l1*Z[1]+l2*Z[2]; const i = y*W+x; if (z <= zb[i]) continue; zb[i] = z; const o = 9*t;
      let n = [l0*CN[o]+l1*CN[o+3]+l2*CN[o+6], l0*CN[o+1]+l1*CN[o+4]+l2*CN[o+7], l0*CN[o+2]+l1*CN[o+5]+l2*CN[o+8]]; n = nz(n); if (dt(n, w) < 0) n = n.map((c) => -c);
      const dif = Math.max(0, dt(n, luz)); const h = nz([luz[0]+w[0], luz[1]+w[1], luz[2]+w[2]]); const esp = Math.pow(Math.max(0, dt(n, h)), 40);
      img[i] = Math.min(1, 0.04 + 0.75 * dif + 0.5 * esp); } }
  return img;
}
const grava = (nome, f) => { const png = new PNG({ width: W, height: H }); for (let i = 0; i < W * H; i++) { const [r, g, b] = f(i); png.data[4*i] = r; png.data[4*i+1] = g; png.data[4*i+2] = b; png.data[4*i+3] = 255; } writeFileSync(nome, PNG.sync.write(png)); };
for (const az of [20, 160]) { const a = az * Math.PI / 180, el = 10 * Math.PI / 180; // a luz a 10 graus do plano da imagem
  const luz = nz([0, 1, 2].map((k) => Math.cos(el) * (Math.cos(a) * u[k] + Math.sin(a) * v[k]) + Math.sin(el) * w[k]));
  const a0 = render(T0, luz), a1 = render(T1, luz, herdar === 'herdar'); let n = 0, soma = 0, acima4 = 0, acima16 = 0, pior = 0, sil = 0;
  for (let i = 0; i < W * H; i++) { if (a0[i] < 0 && a1[i] < 0) continue; if (a0[i] < 0 || a1[i] < 0) { sil++; continue; } n++; const df = Math.abs(a0[i] - a1[i]) * 255; soma += df; if (df > 4) acima4++; if (df > 16) acima16++; if (df > pior) pior = df; }
  console.log(`${herdar === 'herdar' ? 'normais herdadas da original, ' : 'normais recalculadas, '}${vistaNome} luz ${az}: ${W}x${H}, pixels da peca ${n}, diferenca media ${(soma / n).toFixed(3)}/255, acima de 4/255: ${(100 * acima4 / n).toFixed(2)}%, acima de 16/255: ${(100 * acima16 / n).toFixed(3)}%, maior ${pior.toFixed(0)}, silhueta diferente em ${sil} pixels`);
  const cinza = (a) => (i) => { const c = a[i] < 0 ? 24 : Math.round(a[i] * 255); return a[i] < 0 ? [24, 28, 34] : [c, c, c]; };
  if (az === 20) grava(`${saida}-${vistaNome}-${az}-original.png`, cinza(a0)); if (az === 20) grava(`${saida}-${vistaNome}-${az}-reduzida.png`, cinza(a1));
  if (az === 20) grava(`${saida}-${vistaNome}-${az}-diferenca-x8.png`, (i) => { if (a0[i] < 0 && a1[i] < 0) return [24, 28, 34]; if (a0[i] < 0 || a1[i] < 0) return [255, 0, 255]; const c = Math.min(255, Math.round(Math.abs(a0[i] - a1[i]) * 255 * 8)); return [c, c, c]; }); }
