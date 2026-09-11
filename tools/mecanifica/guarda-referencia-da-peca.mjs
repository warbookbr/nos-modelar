#!/usr/bin/env node
/**
 * guarda-referencia-da-peca.mjs — a PROVA PELO OLHO de que a imagem da peça
 * chega ao navegador a partir da PASTA DA PEÇA.
 *
 * Por que existe: a foto que a bancada sobrepõe ao modelo morava em `public/`,
 * a única pasta que o Vite publica sem ninguém importar, e era citada apenas
 * por `sessao-ativa.json`, que é estado local não versionado. Com a imagem
 * dentro da pasta da peça, quem a emite para o pacote publicado é o
 * `import.meta.glob` com `?url` em `src/bancada/referencias/imagens-da-peca.js`.
 *
 * Esse é exatamente o tipo de ligação que teste de unidade não vigia. Trocar o
 * padrão do glob, mudar a extensão aceita ou mover a pasta faria a página
 * continuar subindo, os 1.200 testes continuarem verdes, e a referência sumir
 * da tela de quem abre o endereço publicado. A afirmação aqui é a requisição
 * HTTP: o navegador PEDIU a imagem e recebeu 200.
 *
 * A prova roda sobre o pacote CONSTRUÍDO, e não sobre o servidor de
 * desenvolvimento, porque a diferença entre os dois é justamente o defeito que
 * ela procura: em desenvolvimento o Vite serve qualquer arquivo do repositório.
 *
 *   npm run guarda:referencia
 *
 * Precisa de navegador, por isso não entra em `npm test`; entra nos gates e no
 * `ci.yml`. Prova fora do CI é prova que ninguém é obrigado a rodar.
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const DIST = join(REPO, 'dist');
const OUT = join(REPO, 'tools/bancadas/out');
const BASE = '/nos-mecanifica/';
const PECA = 'bicicleta-quadro';

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

const falhas = [];
const ok = (nome, cond, detalhe = '') => {
  console.log(`  ${cond ? 'ok  ' : 'FALHA'} ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!cond) falhas.push(nome);
};

if (!existsSync(join(DIST, 'bancada.html'))) {
  console.error('guarda:referencia — `dist/` não existe. Rode `npm run build` antes.');
  process.exit(1);
}
const PW = join(REPO, 'node_modules/playwright/index.js');
if (!existsSync(PW)) { console.error('Playwright não encontrado. Rode: npm ci'); process.exit(1); }

/* Servidor estático burro, servindo só o que a construção emitiu. É o ponto:
   nada fora de `dist/` pode ser alcançado, que é a condição do endereço
   publicado. */
const servidor = createServer((req, res) => {
  const pedido = decodeURIComponent(req.url.split('?')[0]).replace(BASE, '/');
  const caminho = join(DIST, pedido.replace(/^\//, '') || 'bancada.html');
  if (!caminho.startsWith(DIST) || !existsSync(caminho)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[extname(caminho)] ?? 'application/octet-stream' });
  res.end(readFileSync(caminho));
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const { port } = servidor.address();

const pw = (await import(pathToFileURL(PW).href)).default;
const navegador = await pw.chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 720 } });

const imagens = [];
const errosDaPagina = [];
pagina.on('response', (r) => {
  const { pathname } = new URL(r.url());
  if (/\.(png|jpe?g|webp|svg)$/i.test(pathname)) imagens.push({ pathname, status: r.status() });
});
pagina.on('pageerror', (e) => errosDaPagina.push(String(e)));

try {
  await pagina.goto(`http://127.0.0.1:${port}${BASE}bancada.html`, { waitUntil: 'load' });
  await pagina.waitForTimeout(1500);

  await pagina.click('#btnMenuAbrir');
  await pagina.locator(`#listaAcervo [data-receita="${PECA}"]`).click({ timeout: 10000 });
  await pagina.waitForTimeout(4000);

  const sobreposicao = imagens.find((i) => /sobreposicao/i.test(i.pathname));
  ok('a página não emitiu erro', errosDaPagina.length === 0, errosDaPagina[0] ?? '');
  ok('a bancada pediu a sobreposição da peça', Boolean(sobreposicao), sobreposicao?.pathname ?? 'nenhuma imagem de peça foi pedida');
  ok('a sobreposição foi servida pelo pacote construído', sobreposicao?.status === 200, `status ${sobreposicao?.status ?? '—'}`);
  ok('nenhuma imagem da peça faltou', imagens.every((i) => i.status === 200),
    imagens.filter((i) => i.status !== 200).map((i) => `${i.status} ${i.pathname}`).join(', '));
  /* `public/referencias/` não existe mais, e a prova falha se alguém a
     recriar: cópia em `public/` é o estado que esta mudança desfez. */
  ok('não há cópia de referência em `public/`', !existsSync(join(REPO, 'public/referencias')));

  mkdirSync(OUT, { recursive: true });
  await pagina.screenshot({ path: join(OUT, 'guarda-referencia-da-peca.png') });
} finally {
  await navegador.close();
  servidor.close();
}

if (falhas.length) {
  console.error(`guarda:referencia FALHOU — ${falhas.length}: ${falhas.join(', ')}`);
  process.exit(1);
}
console.log(`guarda:referencia ok — ${imagens.length} imagem(ns) da peça servidas pelo pacote construído.`);
