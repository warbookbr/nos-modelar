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
 *   - Ctrl+Z desfaz a edição e o botão volta a salvar;
 *   - a peça com PORTAS semânticas (`_jardineira`, 5 `publicarPorta`) salva
 *     normal: `de:{op,id}` é origem estrutural, não coleção de id (A-22).
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
 * O diagnóstico de "é posicional?" é calculado AQUI, em Node, sobre os PASSOS
 * lidos da página — mas a partir de `motor/referencia-posicional.js`, o MESMO
 * módulo que a Oficina e o gate `id-cru` leem (A-22). Era uma terceira cópia da
 * lista de chaves, e a independência que ela prometia nunca existiu: as três
 * cópias divergiram duas vezes na mesma chave, e na segunda esta aqui errou
 * IGUAL à guarda, acusando 5 ids crus em `_jardineira` enquanto o CI acusava 0.
 * Oráculo que erra igual à guarda concorda com ela em vez de vigiá-la.
 *
 * O que este harness prova, então, é a INSTALAÇÃO da guarda: que o botão real,
 * o gancho, o POST e o download passam por ela. Que a REGRA classifica certo é
 * prova de `tools/mecanifica/referencia-posicional.test.ts`, headless e barata.
 * Cada prova no seu lugar, em vez de uma cópia fingindo ser a segunda opinião.
 *
 *   npm run guarda:salvar
 *
 * Dois enquadramentos da mesma barra em tools/bancadas/out/ — o salvamento
 * aceito e a recusa — para conferir no olho o que a afirmação diz em texto.
 * Sai 1 se qualquer afirmação falhar; sai 1 também se a página emitir erro.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { criarServidor } from '../servir.mjs';
import { ocorrenciasPosicionais, rotularOcorrencias } from '../../prototipos/fps/v3/motor/referencia-posicional.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const V3 = join(REPO, 'prototipos/fps/v3');
const OUT = join(REPO, 'tools/bancadas/out');
const TEMP = join(REPO, 'scratchpad/guarda-salvar');           // pecas/ de mentira: a rota real grava aqui, nunca no rastreado
const TEMP_PORTAS = join(REPO, 'scratchpad/guarda-salvar-portas');   // idem, para o cenário A-22 — separado, senão (1d) deixaria de contar arquivos
const PECA = '_vao-e-anteparo';                        // peça LIMPA e não automotiva: só `sel:{grupo|origem|regiao}`
const PORTAS = '_jardineira';                          // A-22: peça LIMPA que publica 5 portas — `de:{op,id}` não é `de:[ids]`
const FACE_ANTEPARO = 0;                               // a única face não-sólida da peça — marcar sólido grava faces:[0]
const VW = 1100, VH = 620;

/* ---- afirmações ---------------------------------------------------------- */
const falhas = [];
const ok = (nome, cond, detalhe = '') => {
  console.log(`  ${cond ? 'ok  ' : 'FALHA'} ${nome}${detalhe ? ' — ' + detalhe : ''}`);
  if (!cond) falhas.push(nome);
};

/* A regra vem do módulo compartilhado — ver o cabeçalho. Medir aqui em Node
   continua importando: a página pode ter a regra certa e não chamá-la. */
const referenciasPosicionais = (passos) => rotularOcorrencias(ocorrenciasPosicionais(passos));

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
rmSync(TEMP_PORTAS, { recursive: true, force: true });
mkdirSync(TEMP, { recursive: true });
mkdirSync(TEMP_PORTAS, { recursive: true });
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

/* `txt` é o que o elemento CONTÉM; a barra é estreita e corta com reticências,
   então o `title` (o texto inteiro, no hover) faz parte do que fica visível. */
const msgDe = (page) => page.$eval('#salvarMsg', (el) => ({ txt: el.textContent, title: el.title, erro: el.classList.contains('erro') }));
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
  await page.screenshot({ path: join(OUT, 'oficina-guarda-salvar-aceito.png') });

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
  ok('(1d) a recusa é VISÍVEL para quem está usando: mensagem em destaque de erro (inteira no title, que a barra corta) + alerta com o passo culpado',
     msgRecusa.erro === true && msgRecusa.txt.startsWith('não salvo:') && msgRecusa.title === msgRecusa.txt
     && espia.alertas.length === 1 && /passo 10: faces/.test(espia.alertas[0]),
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

  /* ===== A-22: porta semântica NÃO é id posicional ========================== */
  /* A prova do outro lado da guarda. Até este ciclo, abrir `_jardineira` — a
     peça que o CI aprova com 0 id cru — e clicar em Salvar SEM EDITAR NADA era
     recusado por "5 referência(s) posicional(is)", que são os cinco
     `publicarPorta` da peça. A ferramenta de autoria recusava exatamente a
     capacidade que o ciclo anterior entregou.

     Servidor e pecas/ PRÓPRIOS: `/pecas/*` sai do dir de destino, então a peça
     precisa estar lá para abrir — e misturá-la no TEMP do cenário 1 afrouxaria
     a afirmação (1d), que conta os arquivos do diretório para provar que a
     recusa não gravou nada. */
  console.log('\nA-22 — a peça com portas semânticas SALVA (a guarda não confunde de:{op,id} com de:[ids])');
  copyFileSync(join(V3, 'pecas', `${PORTAS}.js`), join(TEMP_PORTAS, `${PORTAS}.js`));
  srv = criarServidor({ raiz: V3, pecas: TEMP_PORTAS });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const basePortas = `http://127.0.0.1:${srv.address().port}`;
  const { page: pj, espia: ej } = await abrir(`${basePortas}/oficina.html?peca=${PORTAS}`);
  const passosPortas = await passosDe(pj);
  const quantasPortas = passosPortas.filter((p) => Array.isArray(p) && p[0] === 'publicarPorta').length;
  ok('(1g) a peça de portas abre na Oficina e traz os passos `publicarPorta`',
     (await pj.evaluate(() => window.__ready === true)) === true && quantasPortas === 5,
     `${passosPortas.length} passos, ${quantasPortas} publicarPorta`);
  ok('(1g) o oráculo em Node não vê referência posicional nela', referenciasPosicionais(passosPortas).length === 0);
  const strPortas = await pj.evaluate(() => window.__oficina.serializar());
  const msgPortas = await clicarSalvar(pj);
  const arqPortas = join(TEMP_PORTAS, `${PORTAS}.js`);
  ok('(1g ★) A-22: o clique real no Salvar ACEITA a peça de portas — 1 POST e o arquivo gravado',
     ej.posts.length === 1 && msgPortas.erro === false && existsSync(arqPortas)
     && readFileSync(arqPortas, 'utf8') === strPortas && ej.alertas.length === 0,
     `${ej.posts.length} POST · msg "${msgPortas.txt}"`);
  ok('(1g) nenhum erro de página na peça de portas', ej.erros.length === 0, ej.erros.join(' | '));
  await pj.close();
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
  rmSync(TEMP_PORTAS, { recursive: true, force: true });
}

console.log(`\n${falhas.length ? `${falhas.length} FALHA(S): ${falhas.join(' · ')}` : 'tudo verde — a guarda do A-15 cobre o botão real, o POST, o download e o gancho'}`);
process.exit(falhas.length ? 1 : 0);
