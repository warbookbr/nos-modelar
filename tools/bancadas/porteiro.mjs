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

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
let alvos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!alvos.length) alvos = ['freio-disco', '_freio-hierarquia', '_jardineira', '_vao-e-anteparo'];

const { createServer } = await import('vite');
const vite = await createServer({
  root: REPO,
  configFile: join(REPO, 'vite.config.js'),
  server: { host: '127.0.0.1', port: 0 },
  logLevel: 'error',
});
await vite.listen();
const base = `http://127.0.0.1:${vite.httpServer.address().port}/nos-mecanifica/tools/bancadas/harness.html`;

const PW = join(REPO, 'node_modules/playwright/index.js');
if (!existsSync(PW)) { console.error('Playwright não encontrado. Rode: npm ci (na raiz)'); process.exit(2); }
const pw = (await import(pathToFileURL(PW).href)).default;
const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });

let falhas = 0;
for (const nome of alvos) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  const motivos = [];
  try {
    await page.goto(`${base}?peca=${nome}&res=640`, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const ready = await page.evaluate(() => window.__mecanificaBancada?.ready === true);
    if (!ready) motivos.push('window.__mecanificaBancada.ready ≠ true (fixture não abriu)');
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
