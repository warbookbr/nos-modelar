#!/usr/bin/env node
/* vistas-de-passos.mjs — a folha de seis vistas de um objeto convertido do esboço em receita do Mecanifica, para conferir o que a conversão e os ajustes fizeram.

   Uso: node tools/mecanifica/vistas-de-passos.mjs <receita.json | esboco.json> [--alinhar] [--ajustes <ajustes.json>] [--saida <pasta>]

   A entrada é a receita do externo já expandida (`pecas`, convertida por `receita-externa.mjs`) ou um esboço (`opcoes`). A conversão é a de
   `esboco-para-passos.mjs`, com o alinhamento das caixas e os ajustes da pessoa se pedidos. Escreve em `<saida>/<id>.png` as vistas isométricas
   (frente-direita, trás-esquerda, frente-esquerda), frontal, lateral direita e superior, cada peça com uma cor e a legenda dos nomes, e em
   `<saida>/<id>.pecas.txt` a caixa envolvente de cada peça. Quadro: x para a direita, y para cima, z para a frente; em cada vista, a direita da
   tela é a direita de quem olha. Imprime os pares de caixas retas que se atravessam, separados em embutidos (uma dentro da outra, que não aparecem)
   e passantes (a peça cruza a outra de lado a lado). Precisa do Chromium do Playwright. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { passosDoEsboco } from './esboco-para-passos.mjs';
import { receitaParaEsboco } from './receita-externa.mjs';

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

/** O quadro de uma vista, rasterizado com profundidade por pixel (ordenar polígonos pela profundidade média desenha pontas e cantos errados onde as peças se tocam). A direita da tela é `dir × cima`, a de quem olha na direção `dir`. */
export function quadroDaVista(polis, indice, [rotulo, d, up], W, H) {
  const dir = unit(d); const direita = unit(cruz(dir, up)); const cima = unit(cruz(direita, dir));
  const itens = [];
  for (const { p, parte } of polis) {
    const n = normal(p);
    if (dot(n, dir) >= -1e-9) continue;
    itens.push({ pts: p.map((v) => [dot(v, direita), -dot(v, cima), dot(v, dir)]), luz: 0.6 + 0.4 * Math.max(0, dot(n, unit([0.4, 0.9, 0.5]))), parte });
  }
  const xs = itens.flatMap((i) => i.pts.map((q) => q[0])); const ys = itens.flatMap((i) => i.pts.map((q) => q[1]));
  const x0 = Math.min(...xs); const x1 = Math.max(...xs); const y0 = Math.min(...ys); const y1 = Math.max(...ys);
  const e = Math.min((W - 30) / (x1 - x0), (H - 50) / (y1 - y0));
  const dx = W / 2 - ((x0 + x1) / 2) * e; const dy = H / 2 + 8 - ((y0 + y1) / 2) * e;
  const S = 2; const w = W * S; const h = H * S;
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
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i += 1) { png.data[i * 4] = rgb[i * 3]; png.data[i * 4 + 1] = rgb[i * 3 + 1]; png.data[i * 4 + 2] = rgb[i * 3 + 2]; png.data[i * 4 + 3] = 255; }
  const uri = `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
  return `<div class="q"><img src="${uri}" width="${W}" height="${H}"><div class="t">${rotulo}</div></div>`;
}

const identidade = (m) => m.every((l, i) => l.every((v, j) => Math.abs(v - (i === j ? 1 : 0)) < 1e-9));

/** Os pares de caixas retas que se atravessam mais de 1 mm, em embutidos e passantes. */
export function contatosDasCaixas(formas) {
  const retas = formas.filter((f) => f.tipo === 'caixa' && identidade(f.geometria.matriz));
  const embutidos = []; const passantes = [];
  for (let i = 0; i < retas.length; i += 1) for (let j = i + 1; j < retas.length; j += 1) {
    const a = retas[i].geometria.caixa; const b = retas[j].geometria.caixa;
    const ov = [0, 1, 2].map((k) => Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]));
    if (ov.some((v) => v <= 0.01)) continue;
    const pen = Math.min(...ov);
    if (pen <= 1) continue;
    const dentro = (p, q) => [0, 1, 2].every((k) => p.min[k] >= q.min[k] - 3 && p.max[k] <= q.max[k] + 3);
    const k = ov.indexOf(pen);
    const passa = (p, q) => p.min[k] < q.min[k] - 3 && p.max[k] > q.max[k] + 3;
    const par = { a: retas[i].id, b: retas[j].id, eixo: 'xyz'[k], mm: Math.round(pen * 10) / 10 };
    if (dentro(a, b) || dentro(b, a) || !(passa(a, b) || passa(b, a))) embutidos.push(par); else passantes.push(par);
  }
  return { embutidos, passantes };
}

export async function gerarFolha(entrada, { alinhar = false, ajustes = [], saida, nome }) {
  const { chromium } = await import('playwright');
  const traducao = entrada.pecas ? receitaParaEsboco(entrada) : { esboco: entrada, recusas: [] };
  const esboco = traducao.esboco;
  const id = nome ?? entrada.id ?? 'objeto';
  const r = passosDoEsboco(esboco, { alinhar, ajustes });
  const { neutro } = executarReceita({ meta: { nome: id }, PASSOS: r.passos });
  let polis = [...neutro.F.values()].map((fc) => ({ p: fc.vs.map((v) => neutro.V.get(v).map((x) => x * 1000)), parte: fc.parte }));
  let vol = 0; for (const { p } of polis) vol += dot(area(p), p[0]);
  if (vol < 0) polis = polis.map(({ p, parte }) => ({ p: [...p].reverse(), parte }));
  const indice = new Map(r.partes.map((p, i) => [p, i]));
  const W = 620; const H = 620;
  const legenda = r.partes.map((p, i) => `<span class="l"><i style="background:${corDe(i, 1)}"></i>${p}</span>`).join('');
  const html = `<html><body style="margin:0;background:#f4f2ee;font-family:sans-serif"><div style="padding:8px 12px;font-size:18px"><b>${id}</b> — ${r.partes.length} peças (cada peça com uma cor; x para a direita, y para cima, z para a frente)</div><div style="padding:0 12px 6px">${legenda}</div><div style="display:grid;grid-template-columns:repeat(3,${W}px)">${VISTAS.map((v) => quadroDaVista(polis, indice, v, W, H)).join('')}</div><style>.q{border:1px solid #ddd;position:relative}.t{position:absolute;left:8px;top:6px;font-size:15px;background:#fffd;padding:2px 6px}.l{display:inline-block;margin:2px 10px 2px 0;font-size:13px}.l i{display:inline-block;width:12px;height:12px;margin-right:4px;vertical-align:-2px;border:1px solid #333}</style></body></html>`;
  mkdirSync(saida, { recursive: true });
  const navegador = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const pg = await navegador.newPage({ viewport: { width: 3 * W, height: 2 * H + 140 } });
  await pg.setContent(html); await pg.screenshot({ path: join(saida, `${id}.png`), fullPage: true }); await navegador.close();
  const linhas = r.dados.formas.map((f) => { const c = f.geometria.caixa; const girada = !identidade(f.geometria.matriz); return `${f.id}\t${f.tipo}${girada ? ' (girada)' : ''}\tx ${c.min[0].toFixed(0)}..${c.max[0].toFixed(0)}\ty ${c.min[1].toFixed(0)}..${c.max[1].toFixed(0)}\tz ${c.min[2].toFixed(0)}..${c.max[2].toFixed(0)}`; });
  writeFileSync(join(saida, `${id}.pecas.txt`), `Peças de ${id} (milímetro; caixa envolvente de cada peça; x direita, y cima, z frente):\n${linhas.join('\n')}\n`);
  return { ...r, contatos: contatosDasCaixas(r.dados.formas), id, recusasDaTraducao: traducao.recusas };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const arquivo = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--ajustes' && args[args.indexOf(a) - 1] !== '--saida');
  if (!arquivo) { console.error('uso: node tools/mecanifica/vistas-de-passos.mjs <receita.json | esboco.json> [--alinhar] [--ajustes <ajustes.json>] [--saida <pasta>]'); process.exit(2); }
  const valor = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const entrada = JSON.parse(readFileSync(arquivo, 'utf8'));
  const ajustes = valor('--ajustes') ? JSON.parse(readFileSync(valor('--ajustes'), 'utf8')) : [];
  const r = await gerarFolha(entrada, { alinhar: args.includes('--alinhar'), ajustes, saida: valor('--saida') ?? '.', nome: entrada.id ?? basename(arquivo).replace(/\..*$/, '') });
  console.log(`${r.id}: ${r.partes.length} peças, ${r.recusas.length} recusadas, ${r.alteracoes.length} alterações do alinhamento, ${ajustes.length} ajustes`);
  for (const q of r.recusasDaTraducao) console.log(`  PEÇA FORA DA FOLHA: ${q.peca} (${q.motivo ?? q.aviso})`);
  console.log(`atravessam embutidos: ${r.contatos.embutidos.length}; passantes: ${r.contatos.passantes.length}`);
  for (const p of r.contatos.passantes) console.log(`  passante: ${p.a} / ${p.b} (${p.eixo}, ${p.mm} mm)`);
}
