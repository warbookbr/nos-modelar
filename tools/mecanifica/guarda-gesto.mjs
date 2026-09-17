#!/usr/bin/env node
/**
 * guarda-gesto.mjs — o que a pessoa desenhou sai da bancada e chega legível.
 *
 * Por que existe: a descrição do gesto é conta pura e tem teste de unidade, mas
 * a conta certa não garante nada do caminho que importa. O caminho é: editar a
 * malha na tela, achar o botão de salvar, o arquivo sair com a descrição
 * dentro, e `descrever:gesto` lê-la e dizer em palavras o que houve. Cada um
 * desses elos já esteve quebrado — salvar exigia ter puxado uma junta, e o
 * rodapé com o botão só aparecia no modo de junta, então uma sessão inteira de
 * edição de vértice não produzia arquivo nenhum.
 *
 * O que é afirmado aqui: depois de mover uma parte na bancada, o botão de
 * salvar aparece e fica ativo, o arquivo baixado traz `descricaoDoGesto` com a
 * parte certa classificada como translação na medida certa, e o comando de
 * leitura imprime isso apontando o passo da receita que constrói a parte.
 *
 *   npm run guarda:gesto
 *
 * Precisa de navegador, por isso não entra em `npm test`; entra nos gates e no
 * `ci.yml`.
 */
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const DIST = join(REPO, 'dist');
const BASE = '/nos-mecanifica/';
const PECA = 'peca-de-prova';
const PARTE = 'tuboDeitado';
/* O quanto a parte anda, em unidades da peça, e o mesmo número em milímetro.
   Escolhido grande o bastante para não se confundir com arredondamento e
   pequeno o bastante para não jogar a peça para fora do enquadramento. */
const AVANCO = 0.2;
const AVANCO_MM = 200;

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.map': 'application/json',
};

const falhas = [];
const ok = (nome, cond, detalhe = '') => {
  console.log(`  ${cond ? 'ok  ' : 'FALHA'} ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!cond) falhas.push(nome);
};

if (!existsSync(join(DIST, 'bancada.html'))) {
  console.error('guarda:gesto — `dist/` não existe. Rode `npm run build` antes.');
  process.exit(1);
}
const PW = join(REPO, 'node_modules/playwright/index.js');
if (!existsSync(PW)) { console.error('Playwright não encontrado. Rode: npm ci'); process.exit(1); }

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
const contexto = await navegador.newContext({ viewport: { width: 1400, height: 860 }, acceptDownloads: true });
const pagina = await contexto.newPage();
const erros = [];
pagina.on('pageerror', (e) => erros.push(String(e)));

const pasta = mkdtempSync(join(tmpdir(), 'guarda-gesto-'));
const caminhoDoAlvo = join(pasta, 'ajuste.json');

try {
  await pagina.goto(`http://127.0.0.1:${port}${BASE}bancada.html?peca=${PECA}`, { waitUntil: 'load' });
  await pagina.waitForFunction(() => window.__mecanificaBancada?.carregado === true, null, { timeout: 30000 });
  await pagina.waitForTimeout(600);

  const estadoDoBotao = () => pagina.evaluate(() => {
    const botao = document.getElementById('btnSalvarAjusteDeJunta');
    const rodape = document.getElementById('rodapeJuntas');
    return { existe: Boolean(botao), desativado: Boolean(botao?.disabled), rodapeEscondido: Boolean(rodape?.hidden) };
  });

  const antes = await estadoDoBotao();
  ok('com a malha como veio do arquivo, não há o que salvar',
    antes.desativado && antes.rodapeEscondido, JSON.stringify(antes));

  /* Mover a parte inteira, que é o gesto mais simples e o que tem resposta
     conhecida: a descrição tem de sair como translação de AVANCO_MM. */
  await pagina.evaluate((parte) => window.__mecanificaBancada.selecionar([parte]), PARTE);
  await pagina.waitForTimeout(400);
  await pagina.keyboard.press('g');
  await pagina.waitForTimeout(200);
  await pagina.keyboard.press('z');
  for (const caractere of String(AVANCO)) await pagina.keyboard.press(caractere === '.' ? 'Period' : caractere);
  await pagina.keyboard.press('Enter');
  await pagina.waitForTimeout(800);

  const mexeu = await pagina.evaluate((parte) => {
    const bancada = window.__mecanificaBancada;
    const caixa = bancada.ambiente().scene.getObjectByName('__raiz_da_peca__');
    return { partes: bancada.partes.length, parte };
  }, PARTE).catch(() => null);
  const depois = await estadoDoBotao();
  ok('depois de mover a parte, o botão de salvar aparece e fica ativo',
    !depois.desativado && !depois.rodapeEscondido, JSON.stringify(depois));

  const baixado = pagina.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await pagina.click('#btnSalvarAjusteDeJunta');
  const arquivo = await baixado;
  ok('clicar em salvar baixa um arquivo', Boolean(arquivo));
  if (!arquivo) throw new Error('salvar não produziu download');
  writeFileSync(caminhoDoAlvo, readFileSync(await arquivo.path()));
  const alvo = JSON.parse(readFileSync(caminhoDoAlvo, 'utf8'));

  ok('o arquivo salvo traz a descrição do gesto', Boolean(alvo.descricaoDoGesto),
    Object.keys(alvo).join(', '));

  const daParte = (alvo.descricaoDoGesto?.partes ?? []).find((p) => p.parte === PARTE);
  ok('a descrição classifica a parte movida como translação',
    daParte?.tipo === 'translacao', `${daParte?.tipo ?? 'ausente'} — ${daParte?.frase ?? ''}`);
  ok('a translação sai na medida do movimento, em milímetro',
    Math.abs((daParte?.distanciaMm ?? 0) - AVANCO_MM) < 1,
    `${daParte?.distanciaMm ?? 0} mm, esperado ${AVANCO_MM}`);
  ok('só a parte movida aparece como mexida',
    JSON.stringify(alvo.descricaoDoGesto?.mexidas) === JSON.stringify([PARTE]),
    JSON.stringify(alvo.descricaoDoGesto?.mexidas));
  ok('a descrição não guarda identificador de vértice',
    !/"(vs|idV|vertices)"\s*:/.test(JSON.stringify(alvo.descricaoDoGesto)));

  ok('a página não emitiu erro', erros.length === 0, erros[0] ?? '');
} catch (erro) {
  ok('a execução chega ao fim sem exceção', false, String(erro?.message ?? erro));
} finally {
  await navegador.close();
  servidor.close();
}

/* A última pergunta: o comando de leitura entende o arquivo que a bancada
   acabou de escrever, e liga a parte ao passo que a constrói. */
if (existsSync(caminhoDoAlvo)) {
  let saida = '';
  try {
    saida = execFileSync(process.execPath, [join(HERE, 'descrever-gesto.mjs'), caminhoDoAlvo],
      { cwd: REPO, encoding: 'utf8' });
  } catch (erro) {
    saida = String(erro.stdout ?? '') + String(erro.stderr ?? '');
  }
  ok('descrever:gesto lê o arquivo e diz que a parte andou inteira',
    saida.includes(PARTE) && saida.includes('translacao'), saida.split('\n').find((l) => l.includes('translacao')) ?? '');
  ok('descrever:gesto aponta o passo da receita que constrói a parte',
    /constru[ií]da em \d+/.test(saida), saida.split('\n').find((l) => l.includes('construída em')) ?? '');
  ok('descrever:gesto usa a descrição salva, e não a reconstruída por posição',
    saida.includes('correspondência de vértices conhecida'));
}

if (falhas.length) {
  console.error(`guarda:gesto FALHOU — ${falhas.length}: ${falhas.join(', ')}`);
  process.exit(1);
}
console.log('guarda:gesto ok — a edição sai da bancada descrita em palavras e números.');
