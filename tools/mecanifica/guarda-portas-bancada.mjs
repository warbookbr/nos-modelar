#!/usr/bin/env node
/**
 * guarda-portas-bancada.mjs — a PROVA PELO OLHO DA BANCADA do painel de PORTAS:
 * abrir `bancada.html` numa peça que publica portas mostra as portas na tela, e
 * abrir numa peça que não publica nenhuma não mostra a seção.
 *
 * Por que existe: o painel do A-20 nasceu sem prova nenhuma. Nenhum arquivo de
 * teste importa `src/bancada/main.js`, e a revisão mediu duas mutações que
 * passavam TODOS os gates e os 502 testes:
 *   - em `src/bancada/main.js`, `convertido.medida.portas ?? []` → `[]`;
 *   - em `src/bancada/carregar-peca.js`, `portasPublicadas(neutro)` → `[]`.
 * Com as duas, o painel some da tela e nada fica vermelho. O painel podia ser
 * apagado inteiro sem custo. É a mesma classe de defeito dos ciclos anteriores:
 * verde pelo motivo errado.
 *
 * Quem dirige aqui é a URL, como em `olhar-bancada.mjs` — a bancada é sempre
 * conduzida pelo endereço, nunca pela API interna, para que a prova seja o mesmo
 * caminho que uma pessoa percorre. E o que é afirmado é o DOM RENDERIZADO, não o
 * retorno de uma função: `#portasPublicadas`, `#resumoPortas` e os `<li>` de
 * `#listaPortas`, lidos da página depois que ela subiu.
 *
 * O ORÁCULO É LITERAL, de propósito. Os oito pares nome/origem estão escritos à
 * mão em `PORTAS_FIXTURE` abaixo, não calculados por `portasPublicadas()`. A
 * lição do A-22 é que oráculo que chama o mesmo módulo do produto concorda com
 * ele em vez de vigiá-lo: a régua que a página usa não pode ser a régua que a
 * mede. Se a fixture mudar de portas, este arquivo tem que mudar junto, e
 * essa é a intenção — porta publicada é contrato, não detalhe.
 *
 *   npm run guarda:portas
 *
 * Duas fotos em tools/bancadas/out/ — o painel aberto com as oito portas e a
 * mesma coluna sem a seção — para conferir no olho o que a afirmação diz em
 * texto. Sai 1 se qualquer afirmação falhar ou se a página emitir erro.
 *
 * Precisa de navegador, por isso não entra em `npm test`; entra no
 * `.github/workflows/ci.yml`. Prova fora do CI é
 * prova que ninguém é obrigado a rodar.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const OUT = join(REPO, 'tools/bancadas/out');

const COM_PORTAS = 'fixture-portas';
const SEM_PORTAS = 'fixture-sem-portas';
const VW = 1280, VH = 720;

/* O ORÁCULO — escrito à mão, na ordem em que a bancada os mostra: por nome, em
   ordem de ponto de código, que é a ordem determinística do módulo neutro (não
   `localeCompare`, que depende do ICU do sistema). `origem` é o
   que a porta DECLARA (op:id mais o recorte do contrato do gerador), a mesma
   coluna que `npm run descrever` imprime. Trocar um nome ou um recorte aqui tem
   que deixar a prova vermelha; é essa a única razão de a lista ser literal. */
const PORTAS_FIXTURE = [
  { nome: 'Base do cilindro', origem: 'baseDoCilindro · cilindro:404 tampa=fundo' },
  { nome: 'baseDoCone', origem: 'baseDoCone · cone:405 tampa=fundo' },
  { nome: 'baseDoVolume', origem: 'baseDoVolume · esfera:401 faixa=ultima' },
  { nome: 'basePrincipal', origem: 'basePrincipal · chamferBox:400' },
  { nome: 'bordaDaBase', origem: 'bordaDaBase · chamferBox:400 aresta=3' },
  { nome: 'faixaDoLeito', origem: 'faixaDoLeito · plano:402 faixa=ultima' },
  { nome: 'superficieDoLeito', origem: 'superficieDoLeito · plano:402' },
  { nome: 'topoDoCilindro', origem: 'topoDoCilindro · cilindro:404 tampa=topo' },
];

/* ---- afirmações ---------------------------------------------------------- */
const falhas = [];
const ok = (nome, cond, detalhe = '') => {
  console.log(`  ${cond ? 'ok  ' : 'FALHA'} ${nome}${detalhe ? ' — ' + detalhe : ''}`);
  if (!cond) falhas.push(nome);
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const PW = join(REPO, 'node_modules/playwright/index.js');
if (!existsSync(PW)) { console.error('Playwright não encontrado. Rode: npm ci'); process.exit(1); }

const { createServer } = await import('vite');
const vite = await createServer({
  root: REPO,
  configFile: join(REPO, 'vite.config.js'),
  server: { host: '127.0.0.1', port: 0 },
  logLevel: 'error',
});
await vite.listen();
const { port } = vite.httpServer.address();
const base = `http://127.0.0.1:${port}/nos-mecanifica/tools/bancadas/harness.html`;

const pw = (await import(pathToFileURL(PW).href)).default;
const browser = await pw.chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
mkdirSync(OUT, { recursive: true });

/* abre a bancada PELA URL e devolve o que o DOM mostra do painel de portas.
   Nada aqui vem de `window.__mecanificaBancada`: o painel é tela, e o que se
   afirma é a tela. */
async function abrirBancada(peca) {
  const page = await browser.newPage({ viewport: { width: VW, height: VH } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  const url = `${base}?peca=${peca}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(
    () => window.__mecanificaBancada?.ready === true || window.__mecanificaBancada?.ready === false,
    { timeout: 30000 },
  );
  const subiu = await page.evaluate(() => window.__mecanificaBancada.ready === true);
  const painel = await page.evaluate(() => {
    const bloco = document.getElementById('portasPublicadas');
    if (!bloco) return null;
    return {
      hidden: bloco.hidden,
      alturaVisivel: bloco.getBoundingClientRect().height,
      resumo: document.getElementById('resumoPortas').textContent,
      itens: [...document.querySelectorAll('#listaPortas li')].map((li) => ({
        nome: li.querySelector('b')?.textContent ?? null,
        origem: li.querySelector('small')?.textContent ?? null,
      })),
    };
  });
  return { page, url, erros, subiu, painel };
}

try {
  /* ===== a peça que PUBLICA portas ========================================= */
  console.log(`\n${COM_PORTAS} — a peça publica portas, e elas aparecem na coluna de conferência`);
  const comPortas = await abrirBancada(COM_PORTAS);
  ok('(a) a bancada sobe a peça com portas pela URL', comPortas.subiu, comPortas.url);
  ok('(a) o bloco de portas EXISTE no documento', comPortas.painel !== null);

  ok('(b ★) o painel está VISÍVEL: não está `hidden` e ocupa altura na coluna',
     comPortas.painel?.hidden === false && comPortas.painel.alturaVisivel > 0,
     `hidden=${comPortas.painel?.hidden} · altura=${Math.round(comPortas.painel?.alturaVisivel ?? 0)}px`);

  ok('(c ★) o resumo conta as portas da peça, com a concordância certa',
     comPortas.painel?.resumo === `${PORTAS_FIXTURE.length} publicadas`,
     `resumo "${comPortas.painel?.resumo}"`);

  ok('(d ★) a LISTA mostra as oito portas: nome e origem declarada, no DOM, iguais ao oráculo literal',
     igual(comPortas.painel?.itens, PORTAS_FIXTURE),
     `${comPortas.painel?.itens.length} item(ns) · ${JSON.stringify(comPortas.painel?.itens)}`);

  /* o `<details>` nasce fechado de propósito; abrir é o gesto de quem confere, e
     a foto tem que mostrar a lista, não só o cabeçalho. O clique só é tentado se
     o painel estiver visível: num painel `hidden` o Playwright ficaria 30s
     esperando o alvo e mataria a execução, engolindo o resumo das falhas. */
  let aberto = false;
  if (comPortas.painel?.hidden === false) {
    await comPortas.page.click('#portasPublicadas > summary');
    await comPortas.page.waitForTimeout(200);
    aberto = await comPortas.page.$eval('#portasPublicadas', (el) => el.open);
  }
  ok('(e) clicar no cabeçalho ABRE a lista para quem está conferindo', aberto === true);
  await comPortas.page.screenshot({ path: join(OUT, 'bancada-portas-publicadas.png') });
  ok('(a) nenhum erro de página na peça com portas', comPortas.erros.length === 0, comPortas.erros.join(' | '));
  await comPortas.page.close();

  /* ===== a peça que NÃO publica porta nenhuma =============================== */
  console.log(`\n${SEM_PORTAS} — a peça não publica porta, e a seção inteira some`);
  const semPortas = await abrirBancada(SEM_PORTAS);
  ok('(f) a bancada sobe a peça sem portas pela URL', semPortas.subiu, semPortas.url);
  ok('(g ★) a seção NÃO aparece: `hidden` e sem altura nenhuma na coluna',
     semPortas.painel?.hidden === true && semPortas.painel.alturaVisivel === 0,
     `hidden=${semPortas.painel?.hidden} · altura=${semPortas.painel?.alturaVisivel}px`);
  ok('(g) e a lista continua vazia — a régua não vira poluição na peça que não publica',
     semPortas.painel?.itens.length === 0, `${semPortas.painel?.itens.length} item(ns)`);
  await semPortas.page.screenshot({ path: join(OUT, 'bancada-portas-ausentes.png') });
  ok('(f) nenhum erro de página na peça sem portas', semPortas.erros.length === 0, semPortas.erros.join(' | '));
  await semPortas.page.close();

  /* ===== os dois lados na MESMA execução =================================== */
  /* sem esta linha, um painel que ignorasse a peça e mostrasse sempre a mesma
     coisa passaria em metade das afirmações acima. O que se afirma é a
     DIFERENÇA: a mesma bancada, duas peças, dois resultados opostos. */
  ok('(h ★) a bancada responde à PEÇA, não a uma constante: mesma tela, uma mostra oito portas e a outra nenhuma',
     comPortas.painel?.itens.length === PORTAS_FIXTURE.length
     && semPortas.painel?.itens.length === 0
     && comPortas.painel?.hidden !== semPortas.painel?.hidden);
} catch (erro) {
  /* exceção também é reprovação, e precisa aparecer no mesmo resumo das outras:
     sair pela porta do erro não conta como prova inconclusiva. */
  ok('a execução chegou ao fim sem exceção', false, String(erro?.message || erro));
} finally {
  await browser.close();
  await vite.close();
}

console.log(
  `\nfotos: ${join(OUT, 'bancada-portas-publicadas.png')}\n       ${join(OUT, 'bancada-portas-ausentes.png')}`,
);
console.log(
  `\n${falhas.length
    ? `${falhas.length} FALHA(S): ${falhas.join(' · ')}`
    : 'tudo verde — o painel de portas da bancada mostra o que a peça publica, e some quando ela não publica'}`,
);
process.exit(falhas.length ? 1 : 0);
