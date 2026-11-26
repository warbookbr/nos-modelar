/* vistas-de-passos.mjs — o rasterizador das vistas de uma malha, com profundidade por pixel e contorno entre as partes.

   Só módulo, sem linha de comando: `rasterDaVista` devolve os buffers de uma vista, `quadroDaVista` devolve o quadro em PNG embutido para uma
   folha em HTML, e `VISTAS` são as seis vistas (três isométricas, frontal, lateral direita e superior). Usam-no `folha-comparativa.mjs` e
   `vistas-da-receita.mjs`. Quadro: x para a direita, y para cima, z para a frente; em cada vista, a direita da tela é a direita de quem olha.
   A folha do objeto convertido do esboço antigo e a linha de comando saíram em 2026-11-26, junto com a conversão. */
import { PNG } from 'pngjs';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
const area = (p) => { const w = [0, 0, 0]; for (let i = 0; i < p.length; i += 1) { const a = p[i]; const b = p[(i + 1) % p.length]; w[0] += (a[1] - b[1]) * (a[2] + b[2]); w[1] += (a[2] - b[2]) * (a[0] + b[0]); w[2] += (a[0] - b[0]) * (a[1] + b[1]); } return w; };
const normal = (p) => unit(area(p));

export const VISTAS = [
  ['isométrica frente-direita', [-1, -1, -1], [0, 1, 0]], ['isométrica trás-esquerda', [1, -1, 1], [0, 1, 0]], ['isométrica frente-esquerda', [1, -1, -1], [0, 1, 0]],
  ['frontal (de frente)', [0, 0, -1], [0, 1, 0]], ['lateral direita (frente à esquerda)', [-1, 0, 0], [0, 1, 0]], ['superior (frente embaixo)', [0, -1, 0], [0, 0, -1]],
];

function hsl(h, s, l) { const a = s * Math.min(l, 1 - l); const f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)].map((x) => Math.round(255 * x)); }
const corDe = (i, luz) => `rgb(${hsl((i * 47) % 360, 0.55, 0.55 * luz + 0.1).join(',')})`;

/** Rasteriza uma vista com profundidade por pixel (ordenar polígonos pela profundidade média desenha pontas e cantos errados onde as peças se tocam). A direita da tela é `dir × cima`, a de quem olha na direção `dir`.
    Sem `enquadre`, a escala e o deslocamento ajustam a vista à folha; com `enquadre = { e, dx, dy }` (pixel por milímetro e deslocamento em pixel), várias vistas e imagens saem na mesma escala e no mesmo lugar.
    Devolve os buffers (largura `w`, altura `h`, supersampling `S`): `rgb`, `quem` (índice da parte, -1 fora do objeto, -2 sem parte) e `prof`, e o enquadre usado. */
export function rasterDaVista(polis, indice, [rotulo, d, up], W, H, { enquadre = null, S = 2 } = {}) {
  const dir = unit(d); const direita = unit(cruz(dir, up)); const cima = unit(cruz(direita, dir));
  const itens = [];
  for (const { p, parte } of polis) {
    const n = normal(p);
    if (dot(n, dir) >= -1e-9) continue;
    itens.push({ pts: p.map((v) => [dot(v, direita), -dot(v, cima), dot(v, dir)]), luz: 0.6 + 0.4 * Math.max(0, dot(n, unit([0.4, 0.9, 0.5]))), parte });
  }
  let e; let dx; let dy;
  if (enquadre) ({ e, dx, dy } = enquadre);
  else {
    const xs = itens.flatMap((i) => i.pts.map((q) => q[0])); const ys = itens.flatMap((i) => i.pts.map((q) => q[1]));
    const x0 = Math.min(...xs); const x1 = Math.max(...xs); const y0 = Math.min(...ys); const y1 = Math.max(...ys);
    e = Math.min((W - 30) / (x1 - x0), (H - 50) / (y1 - y0));
    dx = W / 2 - ((x0 + x1) / 2) * e; dy = H / 2 + 8 - ((y0 + y1) / 2) * e;
  }
  const w = W * S; const h = H * S;
  const prof = new Float64Array(w * h).fill(Infinity); const quem = new Int32Array(w * h).fill(-1); const rgb = new Uint8Array(w * h * 3).fill(244);
  for (const it of itens) {
    const cor = (indice.has(it.parte) ? corDe(indice.get(it.parte), it.luz).match(/\d+/g).map(Number) : [150, 150, 150]);
    const q = it.pts.map(([x, y, z]) => [(x * e + dx) * S, (y * e + dy) * S, z]);
    for (let k = 1; k < q.length - 1; k += 1) {
      const [A, B, C] = [q[0], q[k], q[k + 1]];
      const den = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
      if (Math.abs(den) < 1e-12) continue;
      for (let py = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]))); py <= Math.min(h - 1, Math.ceil(Math.max(A[1], B[1], C[1]))); py += 1) {
        for (let px = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]))); px <= Math.min(w - 1, Math.ceil(Math.max(A[0], B[0], C[0]))); px += 1) {
          const X = px + 0.5; const Y = py + 0.5;
          const l1 = ((B[1] - C[1]) * (X - C[0]) + (C[0] - B[0]) * (Y - C[1])) / den;
          const l2 = ((C[1] - A[1]) * (X - C[0]) + (A[0] - C[0]) * (Y - C[1])) / den;
          const l3 = 1 - l1 - l2;
          if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
          const z = l1 * A[2] + l2 * B[2] + l3 * C[2]; const i = py * w + px;
          if (z < prof[i] - 1e-6) { prof[i] = z; quem[i] = indice.has(it.parte) ? indice.get(it.parte) : -2; rgb[i * 3] = cor[0]; rgb[i * 3 + 1] = cor[1]; rgb[i * 3 + 2] = cor[2]; }
        }
      }
    }
  }
  const limiar = 2 / e; // salto de profundidade, em milímetro, que conta como contorno
  for (let y = 0; y < h - 1; y += 1) for (let x = 0; x < w - 1; x += 1) {
    const i = y * w + x;
    for (const j of [i + 1, i + w]) if (quem[i] !== quem[j] || Math.abs(prof[i] - prof[j]) > limiar * 4) { for (const m of [quem[i] !== -1 && prof[i] <= prof[j] ? i : j]) { rgb[m * 3] = 34; rgb[m * 3 + 1] = 34; rgb[m * 3 + 2] = 34; } }
  }
  return { rotulo, w, h, S, rgb, quem, prof, enquadre: { e, dx, dy }, direita, cima, dir };
}

/** O quadro de uma vista (PNG embutido e rótulo) para a folha em HTML. */
export function quadroDaVista(polis, indice, vista, W, H) {
  const { rotulo, w, h, rgb } = rasterDaVista(polis, indice, vista, W, H);
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i += 1) { png.data[i * 4] = rgb[i * 3]; png.data[i * 4 + 1] = rgb[i * 3 + 1]; png.data[i * 4 + 2] = rgb[i * 3 + 2]; png.data[i * 4 + 3] = 255; }
  const uri = `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
  return `<div class="q"><img src="${uri}" width="${W}" height="${H}"><div class="t">${rotulo}</div></div>`;
}
