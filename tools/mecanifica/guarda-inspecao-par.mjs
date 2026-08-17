#!/usr/bin/env node
/* guarda-inspecao-par.mjs — prova real de que duas partes recebem vista legível e URL reproduzível. */
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
const PRECISAO_CAMERA_URL = 5;
const proximo = (a, b) => Math.abs(a - b) <= 0.5 * 10 ** -PRECISAO_CAMERA_URL;
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

async function abrir(page, url) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(
    () => window.__mecanificaBancada?.ready === true || window.__mecanificaBancada?.ready === false,
    { timeout: 30000 },
  );
  return page.evaluate(() => window.__mecanificaBancada.ready === true);
}

async function provarPar(page, { peca, partes }) {
  const url = `http://127.0.0.1:${port}/nos-mecanifica/tools/bancadas/harness.html?peca=${peca}`
    + `&selecionadas=${partes.join(',')}&modo=isolar&projecao=ortografica`;
  ok(`${peca}: a bancada abre`, await abrir(page, url));
  const resultado = await page.evaluate((pedidas) => window.__mecanificaBancada.inspecionarPar(pedidas), partes);
  const pixels = resultado?.pixels ?? [];
  ok(`${peca}: aceita exatamente o par semântico`, resultado?.valida === true && resultado.partes?.join(',') === [...partes].sort().join(','), JSON.stringify(resultado?.partes));
  ok(`${peca}: escolhe uma vista com pixels reais das duas partes`,
    resultado?.legivel === true && pixels.length === 2 && pixels.every((item) => item.pixels >= 64),
    `${resultado?.vistaEscolhida}: ${pixels.map((item) => `${item.nome}=${item.pixels}`).join(', ')}`);
  return resultado;
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const erros = [];
  page.on('pageerror', (erro) => erros.push(erro.message));

  const freio = await provarPar(page, {
    peca: '_freio-hierarquia', partes: ['pastilhaInterna', 'pistao'],
  });
  const urlFocada = page.url();
  const params = new URL(urlFocada).searchParams;
  const componentes = params.get('camera')?.split(',').map(Number) ?? [];
  const cameraDaUrl = {
    posicao: componentes.slice(0, 3),
    alvo: componentes.slice(3, 6),
    acima: componentes.slice(6, 9),
    zoom: componentes[9],
  };
  ok('freio: a escolha evita a isométrica pouco visível', freio?.vistaEscolhida !== 'isometrica', freio?.vistaEscolhida);
  ok('freio: a URL guarda a câmera escolhida',
    params.get('vista') === 'livre' && Boolean(params.get('camera')) && params.get('modo') === 'isolar', urlFocada);
  await page.screenshot({ path: join(SAIDA, 'bancada-inspecao-par-freio.png') });

  ok('freio: o link de inspeção recarrega', await abrir(page, urlFocada));
  const restaurado = await page.evaluate(() => window.__mecanificaBancada.estado());
  const marcadoresRestaurados = await page.evaluate(() => window.__mecanificaBancada.marcadoresDePar());
  ok('freio: seleção, isolamento e câmera voltam iguais',
    restaurado.vista === 'livre'
      && restaurado.modo === 'isolar'
      && restaurado.selecionadas.join(',') === 'pastilhaInterna,pistao'
      && restaurado.inspecao === 'par'
      && marcadoresRestaurados > 0
      && mesmaCamera(restaurado.cameraLivre, cameraDaUrl),
    `${JSON.stringify(restaurado)} · ${marcadoresRestaurados} contorno(s)`);

  await provarPar(page, { peca: '_jardineira', partes: ['caixa', 'terra'] });
  ok('nenhuma página emitiu erro', erros.length === 0, erros.join(' | '));
  await page.close();
} catch (erro) {
  ok('a execução chega ao fim sem exceção', false, String(erro?.message || erro));
} finally {
  await browser.close();
  await vite.close();
}

console.log(falhas.length
  ? `\n${falhas.length} FALHA(S): ${falhas.join(' · ')}`
  : '\ntudo verde — duas partes recebem vista mensurável e URL reproduzível');
process.exit(falhas.length ? 1 : 0);
