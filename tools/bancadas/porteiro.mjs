#!/usr/bin/env node
/* porteiro.mjs — GATE explícito de render do harness privado. Ele não descobre
   nem publica o acervo de `pecas/`: a lista abaixo é a seleção de capacidades
   que precisa de navegador real. Conteúdo homologado, quando existir, ganha
   gate próprio e não entra aqui por acidente.
 */
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pngStats } from './bench/pngstats.mjs';
import { abrirNavegador, ARGS_DO_NAVEGADOR, subirVite } from './ambiente-das-guardas.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
let alvos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!alvos.length) alvos = ['fixture-visual', 'fixture-hierarquia', 'fixture-portas', 'fixture-sem-portas', 'fixture-uniao'];

const vite = await subirVite(REPO);
const base = `http://127.0.0.1:${vite.port}/nos-modelar/tools/bancadas/harness.html`;

const PW = join(REPO, 'node_modules/playwright/index.js');
if (!existsSync(PW)) { console.error('Playwright não encontrado. Rode: npm ci (na raiz)'); process.exit(2); }
const pw = (await import(pathToFileURL(PW).href)).default;
const browser = await abrirNavegador(pw, { args: ARGS_DO_NAVEGADOR });

let falhas = 0;
for (const nome of alvos) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  /* órfão também reprova: uma receita cujo passo gritou (a booleana sem a
     Manifold carregada no navegador, por exemplo) ainda desenha o resto da
     peça, e o quadro sairia plausível. */
  page.on('console', (m) => { if (m.type() === 'error' || /órfão/.test(m.text())) erros.push('console: ' + m.text()); });
  const motivos = [];
  try {
    await page.goto(`${base}?peca=${nome}&res=640`, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const ready = await page.evaluate(() => window.__mecanificaBancada?.ready === true);
    if (!ready) motivos.push('window.__mecanificaBancada.ready ≠ true (fixture não abriu)');
    if (nome === 'fixture-uniao') {
      const partes = await page.evaluate(() => window.__mecanificaBancada?.partes ?? []);
      if (!partes.includes('ombro')) motivos.push(`a união não chegou à cena: partes = ${JSON.stringify(partes)}`);
    }
    const buf = await page.screenshot();
    try {
      const s = pngStats(buf);
      if (s.cores < 4 || s.fracDominante > 0.985 || s.lumaRange < 6)
        motivos.push(`frame degenerado (cores=${s.cores}, dominante=${(s.fracDominante * 100 | 0)}%, luma=${s.lumaRange})`);
    } catch (e) { motivos.push('frame ilegível: ' + e.message); }
    if (erros.length) motivos.push(`${erros.length} erro(s) de página: ${erros.slice(0, 2).join(' ; ')}`);
  } catch (e) { motivos.push('navegação falhou: ' + e.message); }
  await page.close();
  if (motivos.length) { falhas++; console.log(`✗ ${nome}\n    ${motivos.join('\n    ')}`); }
  else console.log(`✓ ${nome}`);
}
await browser.close();
await vite.close();
console.log(`\nporteiro: ${alvos.length - falhas}/${alvos.length} passaram`);
process.exit(falhas ? 1 : 0);
