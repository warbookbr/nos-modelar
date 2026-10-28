#!/usr/bin/env node
/* vistas-da-receita.mjs — a folha de seis vistas de uma receita `.js` do acervo, cada parte com uma cor, para olhar a forma e a divisão em partes.

   Uso: node tools/modelar/vistas-da-receita.mjs <receita.js> [--saida <arquivo.png>]

   Executa a receita pelo núcleo e desenha, com o rasterizador de `vistas-de-passos.mjs` (profundidade por pixel, contorno entre partes), as vistas isométricas
   frente-direita, trás-esquerda e frente-esquerda, a frontal, a lateral direita (frente à esquerda) e a superior (frente embaixo). Cada vista se ajusta à própria
   folha; para comparar com a fonte na mesma câmera e na mesma escala use `folha-comparativa.mjs`. Quadro: x para a direita, y para cima, z para a frente. Precisa do Chromium do Playwright. */
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VISTAS, quadroDaVista } from './vistas-de-passos.mjs';
import { importarReceita, triangulosDaReceita } from './triangulos-da-receita.mjs';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const area = (p) => { const w = [0, 0, 0]; for (let i = 0; i < p.length; i += 1) { const a = p[i]; const b = p[(i + 1) % p.length]; w[0] += (a[1] - b[1]) * (a[2] + b[2]); w[1] += (a[2] - b[2]) * (a[0] + b[0]); w[2] += (a[0] - b[0]) * (a[1] + b[1]); } return w; };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Os polígonos da receita em milímetro, com a orientação corrigida para fora (volume positivo), e o índice de cor de cada parte. */
export function poligonosDaReceita(receita) {
  const { tris, partes, nome } = triangulosDaReceita(receita);
  let polis = tris.map(({ p, parte }) => ({ p, parte }));
  let vol = 0; for (const { p } of polis) vol += dot(area(p), p[0]);
  if (vol < 0) polis = polis.map(({ p, parte }) => ({ p: [...p].reverse(), parte }));
  return { polis, partes, indice: new Map(partes.map((p, i) => [p, i])), nome };
}

const ESTILO = '<style>.q{border:1px solid #ddd;position:relative}.t{position:absolute;left:8px;top:6px;font-size:15px;background:#fffd;padding:2px 6px}.l{display:inline-block;margin:2px 10px 2px 0;font-size:13px}.l i{display:inline-block;width:12px;height:12px;margin-right:4px;vertical-align:-2px;border:1px solid #333}</style>';

/** O HTML da folha de seis vistas. `corDeParte(i)` dá a cor CSS da parte i (a mesma do rasterizador). */
export function htmlDaFolhaDeSeis({ polis, partes, indice, nome }, corDeParte, W = 620, H = 620) {
  const legenda = partes.map((p, i) => `<span class="l"><i style="background:${corDeParte(i)}"></i>${esc(p)}</span>`).join('');
  return `<html><body style="margin:0;background:#f4f2ee;font-family:sans-serif"><div style="padding:8px 12px;font-size:18px"><b>${esc(nome)}</b> — ${partes.length} partes (cada parte com uma cor; x para a direita, y para cima, z para a frente)</div><div style="padding:0 12px 6px">${legenda}</div><div style="display:grid;grid-template-columns:repeat(3,${W}px)">${VISTAS.map((v) => quadroDaVista(polis, indice, v, W, H)).join('')}</div>${ESTILO}</body></html>`;
}

/** Cor CSS da parte i, igual à do rasterizador (matiz a cada 47 graus). */
export function corCssDaParte(i) {
  const h = (i * 47) % 360; const s = 0.55; const l = 0.65;
  const a = s * Math.min(l, 1 - l); const f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return `rgb(${[f(0), f(8), f(4)].map((x) => Math.round(255 * x)).join(',')})`;
}

export async function vistasDaReceita(receita, saidaPng) {
  const { chromium } = await import('playwright');
  const dados = poligonosDaReceita(receita);
  const W = 620; const H = 620;
  const navegador = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  try {
    const pg = await navegador.newPage({ viewport: { width: 3 * W, height: 2 * H + 140 } });
    await pg.setContent(htmlDaFolhaDeSeis(dados, corCssDaParte, W, H));
    await pg.screenshot({ path: saidaPng, fullPage: true });
  } finally { await navegador.close(); }
  return { partes: dados.partes.length, faces: dados.polis.length, nome: dados.nome };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const arquivo = a.find((x, i) => !x.startsWith('--') && a[i - 1] !== '--saida');
  if (!arquivo) { console.error('uso: node tools/modelar/vistas-da-receita.mjs <receita.js> [--saida <arquivo.png>]'); process.exit(2); }
  const i = a.indexOf('--saida');
  const stem = basename(arquivo, '.js') === 'receita' ? basename(dirname(resolve(arquivo))) : basename(arquivo, '.js');
  const saida = resolve(i >= 0 ? a[i + 1] : `${stem}-vistas.png`);
  const r = await vistasDaReceita(await importarReceita(arquivo), saida);
  console.log(`vistas: ${saida} (${r.partes} partes, ${r.faces} triângulos)`);
}
