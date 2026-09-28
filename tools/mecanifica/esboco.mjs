/* Linha de comando do esboço: lê `<nome>.esboco.json`, desenha as opções
   lado a lado com modulos/esboco e grava `<nome>.svg` e `<nome>.png` ao lado.
   Uso: npm run esboco -- <arquivo.esboco.json> */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { desenharEsboco, ErroDeEsboco } from '../../modulos/esboco/src/index.js';

export async function svgParaPng(svg, largura, altura, destino) {
  const { chromium } = (await import('playwright')).default;
  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage({ viewport: { width: largura, height: altura } });
    await pagina.setContent(`<body style="margin:0">${svg}</body>`);
    await pagina.screenshot({ path: destino });
  } finally {
    await navegador.close();
  }
}

export async function gerarEsboco(arquivo) {
  const caminho = resolve(arquivo);
  const base = caminho.replace(/(\.esboco)?\.json$/i, '');
  const { svg, largura, altura, escala } = desenharEsboco(JSON.parse(readFileSync(caminho, 'utf8')));
  writeFileSync(`${base}.svg`, svg);
  await svgParaPng(svg, largura, altura, `${base}.png`);
  return { png: `${base}.png`, svg: `${base}.svg`, largura, altura, escala };
}

async function principal(argv) {
  const alvo = argv.find((a) => !a.startsWith('--'));
  if (!alvo) { process.stderr.write('uso: npm run esboco -- <arquivo.esboco.json>\n'); return 2; }
  try {
    const r = await gerarEsboco(alvo);
    process.stdout.write(`esboço ${r.largura}x${r.altura} px, ${r.escala.toFixed(3)} px/mm\n  ${r.png}\n  ${r.svg}\n`);
    return 0;
  } catch (e) {
    if (e instanceof ErroDeEsboco || e instanceof SyntaxError) { process.stderr.write(`esboço recusado: ${e.message}\n`); return 1; }
    throw e;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await principal(process.argv.slice(2));
