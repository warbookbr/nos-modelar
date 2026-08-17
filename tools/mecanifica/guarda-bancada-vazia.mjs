#!/usr/bin/env node
/* guarda-bancada-vazia.mjs — prova o estado publicado sem catálogo.
 *
 * O teste de contrato consegue dizer que [] é válido, mas não consegue dizer
 * que a aplicação publicada realmente entra nesse estado sem tentar carregar
 * uma receita ou escolher um fallback. Esta guarda sobe a página real, abre-a
 * com o catálogo homologado atual e verifica o estado observável no navegador.
 */
import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const vite = await import('vite');
const playwright = await import(pathToFileURL(join(REPO, 'node_modules/playwright/index.js')).href);

let servidor;
let navegador;
try {
  servidor = await vite.createServer({
    root: REPO,
    configFile: join(REPO, 'vite.config.js'),
    server: { host: '127.0.0.1', port: 0 },
    logLevel: 'error',
  });
  await servidor.listen();
  const { port } = servidor.httpServer.address();
  navegador = await playwright.default.chromium.launch({
    args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 720 } });
  const erros = [];
  pagina.on('pageerror', (erro) => erros.push(erro.message));

  await pagina.goto(`http://127.0.0.1:${port}/nos-mecanifica/bancada.html`, { waitUntil: 'load' });
  await pagina.waitForFunction(
    () => typeof window.__mecanificaBancada === 'object' && window.__mecanificaBancada !== null,
    { timeout: 20000 },
  );

  const estado = await pagina.evaluate(() => ({
    bancada: window.__mecanificaBancada,
    vazioVisivel: !document.getElementById('estadoCatalogoVazio').hidden,
    fixture: document.getElementById('fixtureAtual').textContent,
  }));
  assert.deepEqual(estado.bancada, {
    ready: true,
    catalogoVazio: true,
    peca: null,
    pecasDisponiveis: [],
    estado: estado.bancada.estado,
    url: estado.bancada.url,
  });
  assert.equal(estado.vazioVisivel, true);
  assert.equal(estado.fixture, 'Nenhuma peça homologada');
  assert.deepEqual(erros, []);
  console.log('✓ bancada:vazia — página publicada entrou em estado vazio sem erro ou fallback');
} finally {
  await navegador?.close();
  await servidor?.close();
}
