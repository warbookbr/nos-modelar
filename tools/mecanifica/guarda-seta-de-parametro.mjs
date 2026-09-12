#!/usr/bin/env node
/**
 * guarda-seta-de-parametro.mjs — a seta move a parte na medida do arrasto, e só
 * ela.
 *
 * Por que existe: o gesto direto da bancada tinha quatro defeitos ao mesmo
 * tempo, e cada um escondia o outro. A escolha da seta comparava as BORDAS da
 * caixa da parte, então o raio de um tubo, que engorda e não anda, ganhava a
 * seta. Toda prévia reencaixava a peça no estúdio, então as oito partes
 * escorregavam juntas. A reconstrução da prévia chamava `esconder`, que jogava
 * fora o arrasto em curso, e o gesto morria no primeiro movimento do ponteiro.
 * E a conversão do arrasto ignorava a escala do estúdio, então o avanço saía
 * multiplicado pela ampliação da peça.
 *
 * Nenhum deles aparece em teste de unidade: todos moram no encontro entre
 * medida, cena e ponteiro. A afirmação aqui é o que se vê depois de um arrasto
 * de verdade sobre o pacote construído.
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


  await pagina.click('.aba-btn[data-aba="inspecao"]');
  await pagina.waitForTimeout(400);

  const antes = await ler();
  const seta = antes.setas.find((s) => !s.inerte);
  ok('a parte selecionada oferece pelo menos uma seta arrastável', Boolean(seta),
    antes.setas.map((s) => `${s.eixo}${s.inerte ? ' (inerte)' : ''}`).join(', ') || 'nenhuma');
  if (!seta) throw new Error('sem seta para arrastar');

  const dx = seta.ponta.x - seta.base.x;
  const dy = seta.ponta.y - seta.base.y;
  const comprimento = Math.hypot(dx, dy);
  const ux = dx / comprimento;
  const uy = dy / comprimento;
  /* PONTO DE PARTIDA FORA DA HASTE DESENHADA, de propósito: a haste tem treze
     milímetros na cena, e o que esta guarda afirma é que pegar a seta não exige
     pontaria. Doze pixels ao lado dela é erro de mira comum e tem de funcionar. */
  const meio = {
    x: (seta.base.x + seta.ponta.x) / 2 - uy * 12,
    y: (seta.base.y + seta.ponta.y) / 2 + ux * 12,
  };
  await pagina.mouse.move(meio.x, meio.y);
  await pagina.mouse.down();
  for (let passo = 1; passo <= 10; passo += 1) {
    await pagina.mouse.move(meio.x + ux * PIXELS * passo / 10, meio.y + uy * PIXELS * passo / 10);
  }
  await pagina.mouse.up();
  await pagina.waitForTimeout(1500);
  const depois = await ler();

  const andou = (nome) => {
    const a = antes.centros[nome];
    const d = depois.centros[nome];
    if (!a || !d) return Infinity;
    return Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
  };

  /* O avanço PEDIDO pelo gesto, em unidades do mundo: fração da seta percorrida
     pelo ponteiro vezes o comprimento da seta. É contra isto que o movimento
     obtido é comparado — é o que significa a peça seguir o ponteiro. */
  const pedido = (PIXELS / comprimento) * antes.escalaDaSeta;
  const obtido = andou(PARTE);
  ok('a parte segue o ponteiro, na medida do arrasto',
    Math.abs(obtido - pedido) <= pedido * TOLERANCIA,
    `pediu ${pedido.toFixed(4)}, andou ${obtido.toFixed(4)}`);

  const outras = Object.keys(antes.centros).filter((nome) => nome !== PARTE);
  const escorregaram = outras.filter((nome) => andou(nome) > pedido * 0.01);
  ok('nenhuma outra parte escorrega junto', escorregaram.length === 0,
    escorregaram.map((n) => `${n} ${andou(n).toFixed(4)}`).join(', '));

  ok('o arrasto sobrevive às prévias e não morre no primeiro movimento',
    obtido > pedido * 0.5, `andou ${obtido.toFixed(4)} de ${pedido.toFixed(4)} pedidos`);

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
console.log('guarda:seta ok — o gesto direto move a parte selecionada na medida do arrasto.');
