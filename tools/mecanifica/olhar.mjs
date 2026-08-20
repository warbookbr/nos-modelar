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
  /* width:max-content e flex:none: sem isso o flex ENCOLHE as vistas para
     caber na janela, e a captura sai comprimida em vez de completa. */
  .fila { display:flex; align-items:flex-start; width:max-content; }
  .peca { padding:8px; flex:none; }
  .rotulo { color:#666; padding:4px 2px; }
  svg { display:block; }
</style>
<div class="fila">
${pecas.map((p) => `<div class="peca">${p.svg}<div class="rotulo">${p.nome}</div></div>`).join('\n')}
</div>`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
await pagina.setContent(html, { waitUntil: 'load' });

/* Captura do ELEMENTO, não da viewport. Redimensionar a janela não bastou: o
   `clip` do Playwright é limitado à viewport, então a terceira e a quarta vista
   simplesmente não eram pintadas. O crítico cego reclamou do enquadramento da
   lateral duas rodadas seguidas e eu tratei como ruído dele; era defeito desta
   ferramenta, e eu vinha julgando a forma em imagem cortada. */
await pagina.locator('.fila').screenshot({ path: saida });
await navegador.close();
console.log(saida);
