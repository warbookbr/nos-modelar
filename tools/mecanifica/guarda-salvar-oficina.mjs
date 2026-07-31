#!/usr/bin/env node
/**
 * guarda-salvar-oficina.mjs — a PROVA PELO BOTÃO REAL do A-15: clicar em
 * "Salvar peça" na Oficina com uma edição endereçada por id posicional não
 * chega ao POST nem ao fallback de download, e a recusa aparece na tela.
 *
 * Por que existe: o código tinha a guarda escrita, e afirmação de código não é
 * prova de comportamento — uma guarda pode viver num caminho que o botão não
 * percorre. Aqui quem dirige é a interface: clique real em `#btSolido` para
 * produzir o passo posicional, clique real em `#btSalvar` para tentar salvar.
 *
 * Prova os DOIS lados, senão a guarda seria só um bloqueio:
 *   - peça LIMPA (`_vao-e-anteparo`, sem referência posicional) salva normal;
 *   - depois de UMA edição posicional, o mesmo botão recusa;
 *   - Ctrl+Z desfaz a edição e o botão volta a salvar.
 *
 * E prova nos DOIS caminhos de saída, em servidores diferentes:
 *   - com a rota real do `servir.mjs` (pecas/ num dir TEMP, nunca o rastreado):
 *     o aceito emite 1 POST e GRAVA o arquivo; o recusado não emite POST nenhum
 *     e o byte no disco não muda;
 *   - num servidor estático SEM a rota: o aceito emite o POST que falha e cai no
 *     download; o recusado não emite POST nem download — logo a recusa acontece
 *     ANTES dos dois, não entre eles.
 *
 * Cobre também a PORTA DOS FUNDOS: `window.__oficina.salvar()`, o gancho que as
 * bancadas headless usam, passa pela mesma guarda que o botão. Antes do conserto
 * desta rodada ele escrevia o arquivo recusado em pecas/ sem passar por ela.
 *
 * O diagnóstico de "é posicional?" é recalculado AQUI, em Node, a partir dos
 * PASSOS lidos da página — a prova não pergunta à guarda se a guarda concorda
 * com ela mesma.
 *
 *   npm run guarda:salvar
 *
 * Screenshot da recusa em tools/bancadas/out/. Sai 1 se qualquer afirmação
 * falhar; sai 1 também se a página emitir erro.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { criarServidor } from '../servir.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const V3 = join(REPO, 'prototipos/fps/v3');
const OUT = join(REPO, 'tools/bancadas/out');
const TEMP = join(REPO, 'scratchpad/guarda-salvar');   // pecas/ de mentira: a rota real grava aqui, nunca no rastreado
const PECA = '_vao-e-anteparo';                        // peça LIMPA e não automotiva: só `sel:{grupo|origem|regiao}`
const FACE_ANTEPARO = 0;                               // a única face não-sólida da peça — marcar sólido grava faces:[0]
const VW = 1100, VH = 620;

/* ---- afirmações ---------------------------------------------------------- */
const falhas = [];
const ok = (nome, cond, detalhe = '') => {
  console.log(`  ${cond ? 'ok  ' : 'FALHA'} ${nome}${detalhe ? ' — ' + detalhe : ''}`);
  if (!cond) falhas.push(nome);
};

/* As SEIS formas de coleção por id que o `npm run id-cru:check` reprova, medidas
   aqui de novo e à parte da página. Se esta lista e a da Oficina divergirem, a
   prova acusa: é justamente o ponto onde uma guarda mente. */
function referenciasPosicionais(passos) {
  const achados = [];
  for (const [indice, passo] of (passos || []).entries()) {
    const a = Array.isArray(passo) && passo[1];
    if (!a || typeof a !== 'object' || Array.isArray(a)) continue;
    for (const chave of ['faces', 'vs', 'pontos', 'de']) if (Object.hasOwn(a, chave)) achados.push(`passo ${indice}: ${chave}`);
    if (a.sel && typeof a.sel === 'object' && !Array.isArray(a.sel)) {
      for (const chave of ['f', 'v']) if (Object.hasOwn(a.sel, chave)) achados.push(`passo ${indice}: sel:{${chave}}`);
    }
  }
  return achados;
}

/* ---- servidor estático mínimo (o padrão de tools/bancadas/oficina.mjs) ----- */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
function servidorEstatico() {
  return createServer((req, res) => {
    const p = join(REPO, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(REPO) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(readFileSync(p));
  });
}

const PW = join(REPO, 'node_modules/playwright/index.js');
if (!existsSync(PW)) { console.error('Playwright não encontrado. Rode: npm ci'); process.exit(1); }
const pw = (await import(pathToFileURL(PW).href)).default;
const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
mkdirSync(OUT, { recursive: true });
rmSync(TEMP, { recursive: true, force: true });
mkdirSync(TEMP, { recursive: true });
copyFileSync(join(V3, 'pecas', `${PECA}.js`), join(TEMP, `${PECA}.js`));

/* uma página instrumentada: conta POST e download, guarda o texto do alerta e
   os erros de página. É o observador — nenhuma dessas contagens vem da Oficina. */
async function abrir(url) {
  const page = await browser.newPage({ viewport: { width: VW, height: VH }, acceptDownloads: true });
  const espia = { posts: [], downloads: [], alertas: [], erros: [] };
  page.on('pageerror', (e) => espia.erros.push(e.message));
  page.on('request', (r) => { if (r.method() === 'POST') espia.posts.push(r.url()); });
  page.on('download', (d) => espia.downloads.push(d.suggestedFilename()));
  page.on('dialog', (d) => { espia.alertas.push(d.message()); d.dismiss(); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }).catch(() => {});
  return { page, espia };
}

const msgDe = (page) => page.$eval('#salvarMsg', (el) => ({ txt: el.textContent, erro: el.classList.contains('erro') }));
const passosDe = (page) => page.evaluate(() => window.__oficina.passos());
const parado = (page) => page.waitForTimeout(500);   // folga depois do clique: o que não saiu em meio segundo não saiu

/* o clique REAL no Salvar, esperando a mensagem parar de mudar (aceito ou
   recusado, os dois escrevem em #salvarMsg). */
async function clicarSalvar(page) {
  const antes = (await msgDe(page)).txt;
  await page.click('#btSalvar');
  await page.waitForFunction((t) => document.getElementById('salvarMsg').textContent !== t, antes, { timeout: 10000 }).catch(() => {});
  await parado(page);
  return msgDe(page);
}

/* a EDIÇÃO posicional, pela interface: seleciona a face do anteparo e clica no
   botão real "marcar sólido" — que só sabe gravar ['solido',{faces:[ids]}]. */
async function editarPosicional(page) {
  await page.evaluate((f) => window.__oficina.selecionarFaces([f]), FACE_ANTEPARO);
  await page.waitForTimeout(120);
  const visivel = await page.evaluate(() => window.__oficina.painelColisao().btSolido);
  await page.click('#btSolido');
  await page.waitForTimeout(120);
  return { visivel, passo: await page.evaluate(() => window.__oficina.ultimoPasso()) };
}

let srv = null, estatico = null;
try {
  /* ===== cenário 1: servidor REAL (a rota grava em pecas/) ================== */
  console.log('\ncenário 1 — servidor de dev real: a recusa acontece ANTES do POST');
  srv = criarServidor({ raiz: V3, pecas: TEMP });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const baseSrv = `http://127.0.0.1:${srv.address().port}`;
  const { page, espia } = await abrir(`${baseSrv}/oficina.html?peca=${PECA}`);

  const pronto = await page.evaluate(() => window.__ready === true);
  ok('(1a) a Oficina abre a peça limpa pelo servidor de dev', pronto && (await page.evaluate(() => window.__oficina.nomePeca())) === PECA);
  const passosBase = await passosDe(page);
  ok('(1a) a peça de partida NÃO tem referência posicional (medido em Node, não pela guarda)',
     referenciasPosicionais(passosBase).length === 0, `${passosBase.length} passos, 0 referências`);

  const strLimpa = await page.evaluate(() => window.__oficina.serializar());
  const msgAceito = await clicarSalvar(page);
  const arquivo = join(TEMP, `${PECA}.js`);
  const gravado = existsSync(arquivo) ? readFileSync(arquivo, 'utf8') : null;
  ok('(1b ★) LEGÍTIMO: o clique real no Salvar emite 1 POST e o servidor GRAVA a peça',
     espia.posts.length === 1 && espia.posts[0].endsWith('/oficina/salvar') && gravado === strLimpa && msgAceito.erro === false,
     `${espia.posts.length} POST · msg "${msgAceito.txt}"`);

  const edicao = await editarPosicional(page);
  const passosEditados = await passosDe(page);
  ok('(1c) a interface grava o passo POSICIONAL pelo botão real "marcar sólido"',
     edicao.visivel === true && JSON.stringify(edicao.passo) === JSON.stringify(['solido', { faces: [FACE_ANTEPARO] }])
     && referenciasPosicionais(passosEditados).length === 1,
     `último passo ${JSON.stringify(edicao.passo)}`);

  const postsAntes = espia.posts.length;
  const msgRecusa = await clicarSalvar(page);
  const depois = existsSync(arquivo) ? readFileSync(arquivo, 'utf8') : null;
  ok('(1d ★) RECUSADO: o mesmo botão não emite POST nenhum e o arquivo em disco não muda',
     espia.posts.length === postsAntes && depois === gravado && readdirSync(TEMP).length === 1,
     `POST ${postsAntes} → ${espia.posts.length} · arquivo ${depois === gravado ? 'intacto' : 'REESCRITO'}`);
  ok('(1d) a recusa é VISÍVEL para quem está usando: mensagem em destaque de erro + alerta com o passo culpado',
     msgRecusa.erro === true && msgRecusa.txt.startsWith('não salvo:') && espia.alertas.length === 1 && /passo 10: faces/.test(espia.alertas[0]),
     `msg "${msgRecusa.txt}"`);
  ok('(1d) o botão volta a aceitar clique depois da recusa (não trava a sessão)',
     (await page.$eval('#btSalvar', (el) => el.disabled)) === false);
  await page.screenshot({ path: join(OUT, 'oficina-guarda-salvar-recusa.png') });

  const viaGancho = await page.evaluate(() => window.__oficina.salvar());
  await parado(page);
  const depoisGancho = existsSync(arquivo) ? readFileSync(arquivo, 'utf8') : null;
  ok('(1e ★) a PORTA DOS FUNDOS obedece à mesma guarda: __oficina.salvar() recusa, sem POST e sem gravar',
     viaGancho && viaGancho.via === 'recusado' && espia.posts.length === postsAntes && depoisGancho === gravado,
     `via ${viaGancho && viaGancho.via} · POST ${espia.posts.length} · arquivo ${depoisGancho === gravado ? 'intacto' : 'REESCRITO'}`);

  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })));
  await page.waitForTimeout(150);
  const passosDesfeitos = await passosDe(page);
  const msgVolta = await clicarSalvar(page);
  ok('(1f ★) a guarda não é bloqueio: Ctrl+Z tira a edição posicional e o MESMO botão volta a salvar',
     referenciasPosicionais(passosDesfeitos).length === 0 && espia.posts.length === postsAntes + 1 && msgVolta.erro === false,
     `POST ${postsAntes} → ${espia.posts.length} · msg "${msgVolta.txt}"`);

  ok('(1) nenhum erro de página no cenário 1', espia.erros.length === 0, espia.erros.join(' | '));
  await page.close();
  srv.close(); srv = null;

  /* ===== cenário 2: servidor SEM a rota (o fallback de download) ============ */
  console.log('\ncenário 2 — servidor estático sem a rota: a recusa acontece ANTES do download');
  estatico = servidorEstatico();
  await new Promise((r) => estatico.listen(0, '127.0.0.1', r));
  const baseEst = `http://127.0.0.1:${estatico.address().port}/prototipos/fps/v3/oficina.html`;
  const { page: p2, espia: e2 } = await abrir(`${baseEst}?peca=${PECA}`);
  ok('(2a) a Oficina abre a mesma peça pelo servidor estático', (await p2.evaluate(() => window.__ready === true)) === true);

  const msgBaixado = await clicarSalvar(p2);
  const dl = await p2.evaluate(() => window.__oficina.ultimoDownload());
  ok('(2b ★) LEGÍTIMO: sem a rota, o clique real cai no FALLBACK de download',
     dl !== null && dl.nome === `${PECA}.js` && dl.tamanho > 200 && e2.downloads.length === 1 && msgBaixado.txt.startsWith('baixado '),
     `download ${JSON.stringify(dl)} · eventos ${e2.downloads.length} · msg "${msgBaixado.txt}"`);

  const edicao2 = await editarPosicional(p2);
  ok('(2c) a mesma edição posicional pelo botão real', JSON.stringify(edicao2.passo) === JSON.stringify(['solido', { faces: [FACE_ANTEPARO] }]));

  const postsAntes2 = e2.posts.length, dlsAntes2 = e2.downloads.length;
  const msgRecusa2 = await clicarSalvar(p2);
  const dlDepois = await p2.evaluate(() => window.__oficina.ultimoDownload());
  ok('(2d ★) RECUSADO: nem POST nem download — a recusa é ANTES dos dois, não entre eles',
     e2.posts.length === postsAntes2 && e2.downloads.length === dlsAntes2 && JSON.stringify(dlDepois) === JSON.stringify(dl),
     `POST ${postsAntes2} → ${e2.posts.length} · download ${dlsAntes2} → ${e2.downloads.length}`);
  ok('(2d) a recusa é VISÍVEL também aqui', msgRecusa2.erro === true && msgRecusa2.txt.startsWith('não salvo:') && e2.alertas.length === 1, `msg "${msgRecusa2.txt}"`);

  ok('(2) nenhum erro de página no cenário 2', e2.erros.length === 0, e2.erros.join(' | '));
  await p2.close();
} finally {
  await browser.close();
  if (srv) srv.close();
  if (estatico) estatico.close();
  rmSync(TEMP, { recursive: true, force: true });
}

console.log(`\n${falhas.length ? `${falhas.length} FALHA(S): ${falhas.join(' · ')}` : 'tudo verde — a guarda do A-15 cobre o botão real, o POST, o download e o gancho'}`);
process.exit(falhas.length ? 1 : 0);
