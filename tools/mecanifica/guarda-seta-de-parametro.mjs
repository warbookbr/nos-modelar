#!/usr/bin/env node
/**
 * guarda-seta-de-parametro.mjs — mexer num parâmetro não faz a peça escorregar.
 *
 * ESTA GUARDA ENCOLHEU. Ela nasceu afirmando que a seta de parâmetro movia a
 * parte na medida do arrasto, e essa seta saiu da cena em 2026-09-16: ela
 * aparecia junto com o gizmo de mover, em tamanhos diferentes, e não havia como
 * saber qual gesto cada punho fazia. O caminho por número continua inteiro no
 * painel de parâmetros, e é o que sobra aqui.
 *
 * O que continua sendo afirmado, e é o defeito que mais custou: toda prévia
 * reencaixava a peça no estúdio, e engordar um tubo fazia as oito partes
 * escorregarem juntas. Isso não aparece em teste de unidade — mora no encontro
 * entre medida, cena e reexecução.
 *
 *   npm run guarda:seta
 *
 * Precisa de navegador, por isso não entra em `npm test`; entra nos gates e no
 * `ci.yml`.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const DIST = join(REPO, 'dist');
const BASE = '/nos-mecanifica/';
const PECA = 'bicicleta-quadro';
const PARTE = 'tuboSelim';
/* Arrasto em pixels. Grande o bastante para o movimento não se confundir com
   ruído de arredondamento da grade do parâmetro. */
const PIXELS = 120;
/* O avanço pedido e o obtido não batem ao milímetro: o valor do parâmetro é
   encaixado na grade declarada antes de virar geometria. Cinco por cento cobre
   isso sem deixar passar o erro de escala, que era de trezentos e cinquenta. */
const TOLERANCIA = 0.05;

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
  console.error('guarda:seta — `dist/` não existe. Rode `npm run build` antes.');
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
const pagina = await navegador.newPage({ viewport: { width: 1400, height: 860 } });
const erros = [];
pagina.on('pageerror', (e) => erros.push(String(e)));

/* Centro de cada parte em coordenadas do mundo, e as setas visíveis com os seus
   dois extremos já projetados em pixels. Sai tudo numa leitura só para as duas
   medidas serem do mesmo instante. */
const ler = () => pagina.evaluate(() => {
  const bancada = window.__mecanificaBancada;
  const ambiente = bancada.ambiente();
  const V = ambiente.camera.position.constructor;
  const centros = {};
  ambiente.scene.traverse((no) => {
    const identidade = no.userData?.identidadeParte;
    if (!identidade || !no.geometry) return;
    no.updateWorldMatrix(true, false);
    no.geometry.computeBoundingBox?.();
    const caixa = no.geometry.boundingBox;
    if (!caixa) return;
    const centro = new V(
      (caixa.min.x + caixa.max.x) / 2,
      (caixa.min.y + caixa.max.y) / 2,
      (caixa.min.z + caixa.max.z) / 2,
    );
    no.localToWorld(centro);
    centros[identidade] = [centro.x, centro.y, centro.z];
  });

  const setas = [];
  const raiz = ambiente.scene.getObjectByName('__setas_de_parametro__');
  if (raiz?.visible) {
    const camera = ambiente.camera;
    const rect = document.getElementById('cenaBancada').getBoundingClientRect();
    const emPixels = (v) => ({
      x: (v.x * 0.5 + 0.5) * rect.width + rect.left,
      y: (-v.y * 0.5 + 0.5) * rect.height + rect.top,
    });
    for (const grupo of raiz.children) {
      if (!grupo.visible) continue;
      const direcao = new V(0, 1, 0).applyQuaternion(grupo.quaternion);
      setas.push({
        eixo: grupo.userData.eixo,
        inerte: Boolean(grupo.userData.inerte),
        base: emPixels(raiz.position.clone().project(camera)),
        ponta: emPixels(raiz.position.clone().addScaledVector(direcao, raiz.scale.x).project(camera)),
      });
    }
  }
  return { centros, setas, escalaDaSeta: raiz?.scale?.x ?? 0, escalaDoModelo: bancada.controlador()?.raiz?.scale?.x ?? null };
});

try {
  await pagina.goto(`http://127.0.0.1:${port}${BASE}bancada.html`, { waitUntil: 'load' });
  await pagina.waitForTimeout(2500);
  await pagina.click('#btnMenuAbrir');
  await pagina.locator(`#listaAcervo [data-receita="${PECA}"]`).click({ timeout: 10000 });
  await pagina.waitForTimeout(4000);
  await pagina.evaluate((parte) => window.__mecanificaBancada.selecionar([parte]), PARTE);
  await pagina.waitForTimeout(1200);

  /* PRIMEIRA FASE — a peça não escorrega entre prévias. O arrasto da fase seguinte
     não exercita isso: esticar o tubo do selim para cima não muda a maior dimensão
     da peça nem o piso dela, então o encaixe no estúdio daria no mesmo. Quem
     move a caixa inteira é um número que engorda, e engordar já não ganha seta.
     Então esta fase mexe no raio pelo campo numérico do painel, que é a outra
     porta para o mesmo parâmetro. Ela vem ANTES do arrasto porque precisa da
     peça como o arquivo a descreve: depois de esticar o tubo do selim, o
     encaixe no estúdio passa a depender de outra dimensão e o escorregão
     deixaria de acontecer mesmo sem a correção. */
  await pagina.click('.aba-btn[data-aba="parametros"]');
  await pagina.waitForTimeout(400);
  const campo = pagina.locator('#num-raioTuboSelim');
  const temCampo = await campo.count() > 0;
  ok('o painel oferece o raio do tubo do selim como número', temCampo);
  if (temCampo) {
    const base = await ler();
    await campo.fill('113');
    await campo.dispatchEvent('change');
    await pagina.waitForTimeout(1500);
    const engordado = await ler();
    /* A fase só vale se o número realmente entrou: campo preenchido que não
       dispara prévia deixaria as duas leituras iguais e a afirmação abaixo
       passaria sem ter medido nada. */
    ok('o raio entrou e a peça foi reexecutada', await campo.inputValue() === '113',
      await campo.inputValue());
    const andaramAtoa = Object.keys(base.centros).filter((nome) => {
      const a = base.centros[nome];
      const d = engordado.centros[nome];
      return d && Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]) > 0.002;
    });
    /* O tubo do selim é o único que pode mudar de lugar aqui, e mesmo assim por
       crescimento da própria caixa, não por escorregão. */
    ok('engordar um tubo não desloca o resto da peça',
      andaramAtoa.every((nome) => nome === PARTE), andaramAtoa.join(', '));
  }


  ok('a página não emitiu erro', erros.length === 0, erros[0] ?? '');
} catch (erro) {
  ok('a execução chega ao fim sem exceção', false, String(erro?.message ?? erro));
} finally {
  await navegador.close();
  servidor.close();
}

if (falhas.length) {
  console.error(`guarda:seta FALHOU — ${falhas.length}: ${falhas.join(', ')}`);
  process.exit(1);
}
console.log('guarda:seta ok — mexer num parâmetro não faz a peça escorregar no estúdio.');
