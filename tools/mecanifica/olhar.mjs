#!/usr/bin/env node
/* olhar.mjs — rasteriza SVGs para PNG, para que a IA OLHE o desenho.

   Por que existe: durante toda a investigação do chassi eu gerei SVG, mandei
   para o usuário e julguei pelos números. Nunca abri uma imagem. O nariz aberto
   de 600 x 370 mm do quarto dianteiro estava visível para qualquer um que
   olhasse a vista frontal, e eu só achei rodando um script que contava laços de
   borda.

   Medição só pega o defeito que alguém já imaginou. Olhar pega o resto. As duas
   coisas são necessárias e nenhuma substitui a outra.

   Uso: node tools/mecanifica/olhar.mjs saida.png entrada.svg [outra.svg ...]
   Os SVGs entram lado a lado, rotulados pelo nome do arquivo. */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const [saida, ...entradas] = process.argv.slice(2);
if (!saida || !entradas.length) {
  console.error('uso: olhar.mjs saida.png entrada.svg [...]');
  process.exit(2);
}

const pecas = entradas.map((f) => ({
  nome: path.basename(f, '.svg'),
  svg: readFileSync(f, 'utf8'),
}));

/* Fundo claro e neutro, e uma régua de rótulo por peça: sem rótulo é fácil
   julgar a vista errada. */
const html = `<!doctype html><meta charset="utf-8">
<style>
  body { margin:0; background:#f2f2f0; font:13px/1.4 system-ui,sans-serif; }
  .fila { display:flex; align-items:flex-start; }
  .peca { padding:8px; }
  .rotulo { color:#666; padding:4px 2px; }
  svg { display:block; max-height:78vh; width:auto; }
</style>
<div class="fila">
${pecas.map((p) => `<div class="peca">${p.svg}<div class="rotulo">${p.nome}</div></div>`).join('\n')}
</div>`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
await pagina.setContent(html, { waitUntil: 'load' });
const alvo = await pagina.locator('.fila').boundingBox();
await pagina.screenshot({ path: saida, clip: alvo });
await navegador.close();
console.log(saida);
