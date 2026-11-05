#!/usr/bin/env node
/* desenhar-vistas.mjs — desenha as quatro vistas da peça de teste "coluna sobre disco" (isométrica, frontal, direita e superior) em PNG,
 * sem navegador: projeção ortográfica da malha que o núcleo entrega, z-buffer e sombra de Lambert com a normal suavizada entre faces
 * a menos de 35 graus (o chanfro de 2 mm e o filete ficam à vista, e a aresta viva do chanfro fica viva). Serve para ver a peça onde a
 * bancada (`npm run bancada`, que precisa do navegador do Playwright) não roda. Grava uma imagem por vista e a folha das quatro.
 *
 *   node tools/fixtures/solido-por-lacos/desenhar-vistas.mjs <pasta> [largura em pixels, padrão 900] */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import receita from './coluna.js';

const pasta = process.argv[2];
const tam = Number(process.argv[3] ?? 900);
if (!pasta) { process.stderr.write('uso: node tools/fixtures/solido-por-lacos/desenhar-vistas.mjs <pasta> [largura]\n'); process.exit(2); }
mkdirSync(pasta, { recursive: true });

const { neutro } = executarReceita(receita);
if (neutro.orfaos.length) throw new Error(`a peça tem órfãos: ${neutro.orfaos.map((o) => o.motivo).join('; ')}`);
const MM = 1000;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };

/* os triângulos (em leque) com a normal de cada um */
const P = new Map(); const tris = [];
for (const [id, v] of neutro.V) P.set(id, v.map((x) => x * MM));
for (const f of neutro.F.values()) {
  for (let k = 1; k + 1 < f.vs.length; k++) {
    const vs = [f.vs[0], f.vs[k], f.vs[k + 1]];
    const n = cross(sub(P.get(vs[1]), P.get(vs[0])), sub(P.get(vs[2]), P.get(vs[0])));
    if (Math.hypot(...n) > 1e-12) tris.push({ vs, n: unit(n), area: Math.hypot(...n) });
  }
}
/* a normal de cada canto: a soma das normais dos triângulos do vértice que estão a menos de 35 graus da dele, pela área */
const porVertice = new Map();
tris.forEach((t, i) => t.vs.forEach((v) => { if (!porVertice.has(v)) porVertice.set(v, []); porVertice.get(v).push(i); }));
const COS = Math.cos((35 * Math.PI) / 180);
for (const t of tris) {
  t.nc = t.vs.map((v) => {
    const s = [0, 0, 0];
    for (const j of porVertice.get(v)) if (dot(tris[j].n, t.n) >= COS) for (let a = 0; a < 3; a++) s[a] += tris[j].n[a] * tris[j].area;
    return unit(s);
  });
}

/* as vistas: direita e alto da câmera; a câmera olha ao longo de `olha` */
const VISTAS = {
  isometrica: { olha: unit([-1, -0.75, 1]), alto: [0, 1, 0] },
  frontal: { olha: [0, 0, 1], alto: [0, 1, 0] },
  direita: { olha: [-1, 0, 0], alto: [0, 1, 0] },
  superior: { olha: [0, -1, 0], alto: [0, 0, -1] },
};

function desenhar(nome, { olha, alto }) {
  const dir = unit(cross(alto, [-olha[0], -olha[1], -olha[2]]));
  const up = unit(cross([-olha[0], -olha[1], -olha[2]], dir));
  const proj = (p) => [dot(p, dir), dot(p, up), dot(p, olha)];
  const pts = new Map([...P].map(([k, p]) => [k, proj(p)]));
  const xs = [...pts.values()].map((p) => p[0]); const ys = [...pts.values()].map((p) => p[1]);
  const lado = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const esc = (tam * 0.9) / lado;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2; const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const tela = (p) => [tam / 2 + (p[0] - cx) * esc, tam / 2 - (p[1] - cy) * esc, p[2]];
  const cor = new Uint8ClampedArray(tam * tam * 4); const z = new Float32Array(tam * tam).fill(Infinity);
  for (let i = 0; i < tam * tam; i++) { cor[i * 4] = 243; cor[i * 4 + 1] = 243; cor[i * 4 + 2] = 241; cor[i * 4 + 3] = 255; }
  /* luz de chave por cima e à esquerda da câmera, mais uma luz de frente fraca */
  const chave = unit([-0.5 * dir[0] + 0.7 * up[0] - 0.55 * olha[0], -0.5 * dir[1] + 0.7 * up[1] - 0.55 * olha[1], -0.5 * dir[2] + 0.7 * up[2] - 0.55 * olha[2]]);
  for (const t of tris) {
    if (dot(t.n, olha) > 0) continue;
    const [a, b, c] = t.vs.map((v) => tela(pts.get(v)));
    const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(den) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))); const x1 = Math.min(tam - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))); const y1 = Math.min(tam - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5; const py = y + 0.5;
      const l1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / den;
      const l2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / den;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const zz = l1 * a[2] + l2 * b[2] + l3 * c[2];
      if (zz >= z[y * tam + x]) continue;
      z[y * tam + x] = zz;
      const n = unit([0, 1, 2].map((e) => l1 * t.nc[0][e] + l2 * t.nc[1][e] + l3 * t.nc[2][e]));
      const luz = 0.28 + 0.62 * Math.max(0, dot(n, chave)) + 0.12 * Math.max(0, -dot(n, olha));
      const o = (y * tam + x) * 4;
      cor[o] = Math.min(255, 150 * luz + 20); cor[o + 1] = Math.min(255, 168 * luz + 22); cor[o + 2] = Math.min(255, 196 * luz + 24);
    }
  }
  return sharp(Buffer.from(cor.buffer), { raw: { width: tam, height: tam, channels: 4 } }).png();
}

const imagens = [];
for (const [nome, v] of Object.entries(VISTAS)) {
  const arquivo = join(pasta, `coluna-${nome}.png`);
  await desenhar(nome, v).toFile(arquivo);
  imagens.push({ nome, arquivo });
  process.stdout.write(`${arquivo}\n`);
}
const folha = join(pasta, 'coluna-quatro-vistas.png');
await sharp({ create: { width: tam * 2, height: tam * 2, channels: 4, background: '#f3f3f1' } })
  .composite(await Promise.all(imagens.map(async ({ arquivo }, k) => ({ input: arquivo, left: (k % 2) * tam, top: Math.floor(k / 2) * tam }))))
  .png().toFile(folha);
process.stdout.write(`${folha}\n`);
