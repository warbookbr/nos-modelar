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

  const hierarquia = await provarPar(page, {
    peca: 'fixture-hierarquia', partes: ['pastilhaInterna', 'pistao'],
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
  ok('fixture de hierarquia: a escolha evita a isométrica pouco visível', hierarquia?.vistaEscolhida !== 'isometrica', hierarquia?.vistaEscolhida);
  ok('fixture de hierarquia: a URL guarda a câmera escolhida',
    params.get('vista') === 'livre' && Boolean(params.get('camera')) && params.get('modo') === 'isolar', urlFocada);
  await page.screenshot({ path: join(SAIDA, 'bancada-inspecao-par-freio.png') });

  ok('fixture de hierarquia: o link de inspeção recarrega', await abrir(page, urlFocada));
  const restaurado = await page.evaluate(() => window.__mecanificaBancada.estado());
  const marcadoresRestaurados = await page.evaluate(() => window.__mecanificaBancada.marcadoresDePar());
  ok('fixture de hierarquia: seleção, isolamento e câmera voltam iguais',
    restaurado.vista === 'livre'
      && restaurado.modo === 'isolar'
      && restaurado.selecionadas.join(',') === 'pastilhaInterna,pistao'
      && restaurado.inspecao === 'par'
      && marcadoresRestaurados > 0
      && mesmaCamera(restaurado.cameraLivre, cameraDaUrl),
    `${JSON.stringify(restaurado)} · ${marcadoresRestaurados} contorno(s)`);

  await provarPar(page, { peca: 'fixture-portas', partes: ['base', 'superficie'] });

  /* FOCAR O CONTATO, e não a união. `inspecionarPar` escolhe a vista; ele nunca
     enquadrou. Num par de partes compridas que se tocam só na ponta, a caixa da
     união é as duas inteiras e o encaixe fica com poucos pixels — foi assim que
     um cabo atravessando uma empunhadura teve de ser diagnosticado pelos números
     da receita, porque nenhuma vista conseguia mostrá-lo.

     A prova é comparativa, e não estética: a caixa do contato tem de ser
     ESTRITAMENTE MENOR que a da união. Sem esta comparação, um `focarContato`
     que não fizesse nada passaria — e passou, na primeira versão, porque em
     ortográfica o zoom vem da caixa e não do raio. */
  /* A medida do zoom é a extensão BRUTA projetada, e não `area`: `area` é
     recortada ao quadro, então quando o par passa a transbordar ela CAI, e usá-la
     faria o teste dizer que aproximar afasta. */
  const extensaoProjetada = async () => {
    const e = await page.evaluate(() => window.__mecanificaBancada.enquadramento());
    return e?.larguraBruta != null ? e.larguraBruta * e.alturaBruta : null;
  };
  const antes = await extensaoProjetada();
  const contato = await page.evaluate(
    () => window.__mecanificaBancada.focarContato(['base', 'superficie']));
  ok('foco de contato: enquadra o par, tocando-se ou com folga',
    contato?.valida === true, JSON.stringify(contato?.motivo ?? contato?.tocam));
  const depois = await extensaoProjetada();
  /* A regra geral é a que vale para qualquer par: focar o contato NUNCA pode
     enquadrar mais que a união. Duas chapas cujo encontro é quase a peça inteira
     mudam pouco, e está certo — o que não pode é AFASTAR, que foi o defeito da
     primeira versão, quando a folga saía do maior lado. */
  ok('foco de contato: nunca enquadra mais que a união das duas partes',
    antes !== null && depois !== null && depois >= antes * 0.999,
    `extensão projetada antes=${antes?.toFixed(3)} depois=${depois?.toFixed(3)}`);

  const semPar = await page.evaluate(() => window.__mecanificaBancada.focarContato(['base']));
  ok('foco de contato: recusa quando não são duas partes', semPar?.valida === false, JSON.stringify(semPar));

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
