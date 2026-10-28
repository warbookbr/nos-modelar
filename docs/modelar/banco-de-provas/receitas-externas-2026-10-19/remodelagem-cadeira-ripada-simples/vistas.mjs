#!/usr/bin/env node
/* vistas.mjs — as seis vistas de cadeira_ripada_simples (isométricas frente-direita, trás-esquerda e frente-esquerda, frontal, lateral direita e superior)
   em cadeira_ripada_simples-vistas.png, com o mesmo quadro e as mesmas cores de tools/modelar/vistas-de-passos.mjs (quadroDaVista e VISTAS vêm de lá).

   Uso: node vistas.mjs [--receita <arquivo.mjs>] [--saida <arquivo.png>]
   Precisa do Chromium do Playwright (PLAYWRIGHT_CHROMIUM, ou /opt/pw-browsers/chromium). */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = new URL('../../../../../', import.meta.url);
const { executarReceita } = await import(new URL('src/autoria/executar-receita.js', RAIZ));
const { VISTAS, quadroDaVista } = await import(new URL('tools/modelar/vistas-de-passos.mjs', RAIZ));
const { chromium } = await import(new URL('node_modules/playwright/index.mjs', RAIZ));

const args = process.argv.slice(2);
const valorDe = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const caminhoReceita = valorDe('--receita');
const modulo = caminhoReceita
  ? await import(pathToFileURL(resolve(caminhoReceita)).href)
  : await import('./cadeira_ripada_simples.receita.mjs');
const saida = valorDe('--saida') ?? new URL('./cadeira_ripada_simples-vistas.png', import.meta.url).pathname;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const area = (p) => { const w = [0, 0, 0]; for (let i = 0; i < p.length; i += 1) { const a = p[i]; const b = p[(i + 1) % p.length]; w[0] += (a[1] - b[1]) * (a[2] + b[2]); w[1] += (a[2] - b[2]) * (a[0] + b[0]); w[2] += (a[0] - b[0]) * (a[1] + b[1]); } return w; };

function hsl(h, s, l) { const a = s * Math.min(l, 1 - l); const f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)].map((x) => Math.round(255 * x)); }
const corDe = (i, luz) => `rgb(${hsl((i * 47) % 360, 0.55, 0.55 * luz + 0.1).join(',')})`;

const { neutro } = executarReceita(modulo);
let polis = [...neutro.F.values()].map((fc) => ({ p: fc.vs.map((v) => neutro.V.get(v).map((x) => x * 1000)), parte: fc.parte }));
let vol = 0; for (const { p } of polis) vol += dot(area(p), p[0]);
if (vol < 0) polis = polis.map(({ p, parte }) => ({ p: [...p].reverse(), parte }));

const partes = [...new Set(polis.map((f) => f.parte))];
const indice = new Map(partes.map((p, i) => [p, i]));
const W = 620; const H = 620;
const legenda = partes.map((p, i) => `<span class="l"><i style="background:${corDe(i, 1)}"></i>${p}</span>`).join('');
const html = `<html><body style="margin:0;background:#f4f2ee;font-family:sans-serif"><div style="padding:8px 12px;font-size:18px"><b>cadeira_ripada_simples</b> — ${partes.length} peças (cada peça com uma cor; x para a direita, y para cima, z para a frente)</div><div style="padding:0 12px 6px">${legenda}</div><div style="display:grid;grid-template-columns:repeat(3,${W}px)">${VISTAS.map((v) => quadroDaVista(polis, indice, v, W, H)).join('')}</div><style>.q{border:1px solid #ddd;position:relative}.t{position:absolute;left:8px;top:6px;font-size:15px;background:#fffd;padding:2px 6px}.l{display:inline-block;margin:2px 10px 2px 0;font-size:13px}.l i{display:inline-block;width:12px;height:12px;margin-right:4px;vertical-align:-2px;border:1px solid #333}</style></body></html>`;

const navegador = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const pagina = await navegador.newPage({ viewport: { width: 3 * W, height: 2 * H + 140 } });
await pagina.setContent(html);
await pagina.screenshot({ path: saida, fullPage: true });
await navegador.close();
console.log(`vistas: ${saida} (${partes.length} peças, ${polis.length} faces)`);
