#!/usr/bin/env node
/**
 * guarda-escolha-da-peca.mjs — a escolha de quem está na bancada não é desfeita
 * pelo relógio.
 *
 * Por que existe: a bancada relê `sessao-ativa.json` a cada segundo e meio, e
 * qualquer leitura trocava o modelo em cena. Quem abria uma peça em `Abrir` a
 * via ser substituída pela peça do arquivo sem ter tocado em nada, levando
 * junto a seleção, o enquadramento e os parâmetros em prévia. O defeito era
 * invisível enquanto as duas peças tinham o mesmo nome, que é o caso comum de
 * quem trabalha numa peça só.
 *
 * A afirmação é sobre a TELA depois do tempo passar: escolhi, esperei mais do
 * que o intervalo de leitura, e continua sendo a minha peça; a entrega da
 * sessão fica oferecida e carrega quando eu clico.
 *
 *   npm run guarda:escolha
 *
 * Roda sobre o pacote construído, servindo um `sessao-ativa.json` com o nome
 * trocado: sem nomes distintos a prova passaria sem provar nada.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const DIST = join(REPO, 'dist');
const BASE = '/nos-mecanifica/';
const NOME_DO_ARQUIVO = 'PEÇA DA SESSÃO';
const INTERVALO_DE_LEITURA = 1500;

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
  console.error('guarda:escolha — `dist/` não existe. Rode `npm run build` antes.');
  process.exit(1);
}
if (!existsSync(join(DIST, 'sessao-ativa.json'))) {
  console.error('guarda:escolha — `dist/sessao-ativa.json` não existe. Rode `npm run build` com uma sessão ativa.');
  process.exit(1);
}
const PW = join(REPO, 'node_modules/playwright/index.js');
if (!existsSync(PW)) { console.error('Playwright não encontrado. Rode: npm ci'); process.exit(1); }

const servidor = createServer((req, res) => {
  const pedido = decodeURIComponent(req.url.split('?')[0]).replace(BASE, '/');
  const caminho = join(DIST, pedido.replace(/^\//, '') || 'bancada.html');
  if (!caminho.startsWith(DIST) || !existsSync(caminho)) { res.writeHead(404); res.end(); return; }
  if (pedido.endsWith('sessao-ativa.json')) {
    const dados = JSON.parse(readFileSync(caminho, 'utf8'));
    dados.alvo.nome = NOME_DO_ARQUIVO;
    dados.receita.meta.nome = NOME_DO_ARQUIVO;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(dados));
    return;
  }
  res.writeHead(200, { 'Content-Type': TIPOS[extname(caminho)] ?? 'application/octet-stream' });
  res.end(readFileSync(caminho));
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const { port } = servidor.address();

const pw = (await import(pathToFileURL(PW).href)).default;
const navegador = await pw.chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 760 } });
const naTela = () => pagina.$eval('#fixtureAtual', (el) => el.textContent.trim());

try {
  await pagina.goto(`http://127.0.0.1:${port}${BASE}bancada.html`, { waitUntil: 'load' });
  await pagina.waitForTimeout(2500);
  ok('sem escolha, a peça da sessão sobe sozinha', (await naTela()) === NOME_DO_ARQUIVO, await naTela());

  await pagina.click('#btnMenuAbrir');
  const entradas = await pagina.$$eval('#listaAcervo [data-receita]', (els) => els.map((e) => e.dataset.receita));
  if (entradas.length === 0) { console.error('guarda:escolha — acervo vazio, nada a escolher.'); process.exit(1); }
  await pagina.click(`#listaAcervo [data-receita="${entradas[0]}"]`);
  await pagina.waitForTimeout(1200);
  const escolhida = await naTela();
  ok('a peça escolhida entra em cena', escolhida !== NOME_DO_ARQUIVO, escolhida);

  /* Duas voltas inteiras do relógio de leitura: uma só poderia passar por
     coincidência de tempo. */
  await pagina.waitForTimeout(INTERVALO_DE_LEITURA * 2 + 500);
  ok('a escolha continua em cena depois de duas leituras do arquivo', (await naTela()) === escolhida, await naTela());

  const oferta = pagina.locator('#avisoSessaoNova');
  /* Sem espera implícita: quando a oferta NÃO aparece, o que interessa é a
     linha de falha, e não uma exceção de tempo esgotado sem nome. */
  const ofertaVisivel = await oferta.isVisible();
  ok('a entrega da sessão aparece como oferta', ofertaVisivel,
    ofertaVisivel ? (await oferta.textContent()) : 'nenhuma oferta na tela');

  if (ofertaVisivel) {
    await oferta.click();
    await pagina.waitForTimeout(1200);
    ok('aceitar a oferta troca a peça em cena', (await naTela()) === NOME_DO_ARQUIVO, await naTela());
    ok('a oferta some depois de aceita', !(await oferta.isVisible()));
  }
} finally {
  await navegador.close();
  servidor.close();
}

if (falhas.length) {
  console.error(`guarda:escolha FALHOU — ${falhas.length}: ${falhas.join(', ')}`);
  process.exit(1);
}
console.log('guarda:escolha ok — a leitura periódica não desfaz a escolha de quem está na bancada.');
