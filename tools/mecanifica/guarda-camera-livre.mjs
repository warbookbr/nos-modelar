#!/usr/bin/env node
/* guarda-camera-livre.mjs — prova real: uma órbita da bancada vira URL e a URL volta igual. */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../..');
const SAIDA = join(REPO, 'tools/bancadas/out');
const PLAYWRIGHT = join(REPO, 'node_modules/playwright/index.js');
const falhas = [];
const ok = (nome, condicao, detalhe = '') => {
  console.log(`  ${condicao ? 'ok  ' : 'FALHA'} ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!condicao) falhas.push(nome);
};
const proximo = (a, b) => Math.abs(a - b) <= 1e-7;
const mesmaCamera = (a, b) => Boolean(a && b)
  && ['posicao', 'alvo', 'acima'].every((chave) => a[chave]?.length === 3
    && b[chave]?.length === 3
    && a[chave].every((valor, indice) => proximo(valor, b[chave][indice])))
  && proximo(a.zoom, b.zoom);

if (!existsSync(PLAYWRIGHT)) {
  console.error('Playwright não encontrado. Rode: npm ci');
  process.exit(1);
}

const vite = await (await import('vite')).createServer({
  root: REPO,
  configFile: join(REPO, 'vite.config.js'),
  server: { host: '127.0.0.1', port: 0 },
  logLevel: 'error',
});
await vite.listen();
const { port } = vite.httpServer.address();
const pw = (await import(pathToFileURL(PLAYWRIGHT).href)).default;
const browser = await pw.chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
mkdirSync(SAIDA, { recursive: true });

async function esperarBancada(page) {
  await page.waitForFunction(
    () => window.__mecanificaBancada?.ready === true || window.__mecanificaBancada?.ready === false,
    { timeout: 30000 },
  );
  return page.evaluate(() => window.__mecanificaBancada.ready === true);
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const erros = [];
  page.on('pageerror', (erro) => erros.push(erro.message));
  const base = `http://127.0.0.1:${port}/nos-mecanifica/tools/bancadas/harness.html?peca=freio-disco&vista=direita&projecao=ortografica`;
  await page.goto(base, { waitUntil: 'load' });
  ok('(a) a bancada sobe pela URL canônica', await esperarBancada(page));

  const caixa = await page.locator('#cenaBancada').boundingBox();
  if (caixa) {
    const x = caixa.x + caixa.width * 0.5;
    const y = caixa.y + caixa.height * 0.5;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 120, y - 65, { steps: 8 });
    await page.mouse.up();
  }
  await page.waitForTimeout(180);
  const urlLivre = page.url();
  const estadoLivre = await page.evaluate(() => window.__mecanificaBancada.estado());
  const params = new URL(urlLivre).searchParams;
  const componentes = params.get('camera')?.split(',').map(Number) ?? [];
  const cameraEsperada = {
    posicao: componentes.slice(0, 3),
    alvo: componentes.slice(3, 6),
    acima: componentes.slice(6, 9),
    zoom: componentes[9],
  };
  ok('(b ★) a órbita escreve vista livre e câmera explícita na URL',
    Boolean(caixa) && params.get('vista') === 'livre' && Boolean(params.get('camera')), urlLivre);
  ok('(c ★) a tela também declara a câmera livre sem depender de UUID',
    estadoLivre.vista === 'livre' && Array.isArray(estadoLivre.cameraLivre?.posicao),
    JSON.stringify(estadoLivre.cameraLivre));

  await page.goto(urlLivre, { waitUntil: 'load' });
  ok('(d) a URL livre recarrega sem erro', await esperarBancada(page));
  const restaurado = await page.evaluate(() => window.__mecanificaBancada.estado());
  ok('(e ★) posição, alvo, acima, zoom e projeção voltam iguais',
    restaurado.vista === 'livre'
      && restaurado.projecao === estadoLivre.projecao
      && mesmaCamera(restaurado.cameraLivre, cameraEsperada),
    `${page.url()} · ${JSON.stringify(restaurado)}`);
  await page.screenshot({ path: join(SAIDA, 'bancada-camera-livre-recarregada.png') });

  await page.goto(`http://127.0.0.1:${port}/nos-mecanifica/tools/bancadas/harness.html?peca=freio-disco&vista=livre&camera=NaN`, { waitUntil: 'load' });
  ok('(f) entrada inválida fecha para isométrica sem quebrar a bancada', await esperarBancada(page));
  const invalido = await page.evaluate(() => window.__mecanificaBancada.estado());
  ok('(g ★) entrada inválida não vira câmera parcial',
    invalido.vista === 'isometrica' && invalido.cameraLivre === null, JSON.stringify(invalido));
  ok('(h) nenhuma página emitiu erro', erros.length === 0, erros.join(' | '));
  await page.close();
} catch (erro) {
  ok('a execução chega ao fim sem exceção', false, String(erro?.message || erro));
} finally {
  await browser.close();
  await vite.close();
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S): ${falhas.join(' · ')}` : '\ntudo verde — órbita livre pode ser compartilhada e recarregada');
process.exit(falhas.length ? 1 : 0);
