#!/usr/bin/env node
/**
 * guarda-junta-da-bancada.mjs — arrastar o canto deforma só quem passa por ele.
 *
 * Por que existe: a seta de parâmetro escreve um número declarado no instante
 * do arrasto, e num quadro em treliça nenhum número empurra um tubo inteiro
 * sem descolar as juntas. O autor tentou mover um balanço da bicicleta e viu os
 * quatro balanços mudarem de tamanho, porque o único número ligado àquela
 * direção era o comprimento do balanço, compartilhado pelos quatro. O punho de
 * junta é a resposta: a pessoa pega o canto, a malha deforma, e nenhuma receita
 * é tocada durante o gesto.
 *
 * O que só aparece no navegador, e por isso é afirmado aqui: o punho existe em
 * cima do canto depois do enquadramento no estúdio, o arrasto sobrevive à
 * reconstrução da malha que ele mesmo dispara, e parte que não passa pela junta
 * fica exatamente onde estava.
 *
 *   npm run guarda:junta
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
const PECA = 'peca-de-prova';
/* A ponteira esquerda: onde o balanço inferior e o superior do lado esquerdo se
   encontram. É o canto que o autor tentou mover. */
const JUNTA = 'travessa+tuboEsquerdo';
const PASSAM_PELA_JUNTA = ['travessa', 'tuboEsquerdo'];
const PIXELS = 110;
/* O punho anda no plano que encara a câmera, então o deslocamento no mundo é o
   que o ponteiro percorreu naquele plano. Dez por cento cobre a diferença entre
   o centro da caixa e o canto puxado, porque o centro anda a metade quando a
   outra ponta da parte está presa. */
const TOLERANCIA = 0.1;

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
  console.error('guarda:junta — `dist/` não existe. Rode `npm run build` antes.');
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

/* Centro de cada parte no mundo e os punhos visíveis já projetados em pixels,
   numa leitura só, para as duas medidas serem do mesmo instante. */
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

  const punhos = [];
  const raiz = ambiente.scene.getObjectByName('__punhos_de_junta__');
  if (raiz?.visible) {
    const rect = document.getElementById('cenaBancada').getBoundingClientRect();
    for (const malha of raiz.children) {
      const projetado = malha.position.clone().project(ambiente.camera);
      punhos.push({
        junta: malha.userData.junta,
        x: (projetado.x * 0.5 + 0.5) * rect.width + rect.left,
        y: (-projetado.y * 0.5 + 0.5) * rect.height + rect.top,
      });
    }
  }
  return { centros, punhos };
});

try {
  await pagina.goto(`http://127.0.0.1:${port}${BASE}bancada.html`, { waitUntil: 'load' });
  await pagina.waitForTimeout(2500);
  await pagina.click('#btnMenuAbrir');
  await pagina.locator(`#listaAcervo [data-receita="${PECA}"]`).click({ timeout: 10000 });
  await pagina.waitForTimeout(4000);

  await pagina.click('#btnJuntas');
  await pagina.waitForTimeout(800);

  const antes = await ler();
  ok('o modo de junta desenha um punho por canto da peça', antes.punhos.length === 3,
    `${antes.punhos.length} punhos: ${antes.punhos.map((p) => p.junta).join(', ')}`);

  const punho = antes.punhos.find((p) => p.junta === JUNTA);
  ok('o topo do tubo esquerdo tem punho', Boolean(punho), JUNTA);
  if (!punho) throw new Error('sem punho para arrastar');

  /* Arrasto para trás na tela. A direção exata não importa para a afirmação:
     o que se mede é se as partes que passam pela junta seguem o ponteiro e se
     as outras ficam paradas. */
  await pagina.mouse.move(punho.x, punho.y);
  await pagina.mouse.down();
  for (let passo = 1; passo <= 5; passo += 1) {
    await pagina.mouse.move(punho.x - (PIXELS * passo) / 10, punho.y);
  }
  /* LEITURA NO MEIO DO GESTO, com o ponteiro ainda pressionado. Cada movimento
     reconstrói a malha, e reconstruir pode redesenhar os punhos. Hoje o punho
     acompanha porque a posição redesenhada já inclui o deslocamento acumulado,
     e não foi possível produzir um defeito que quebre isto sem quebrar antes a
     afirmação seguinte. A afirmação fica porque o que ela cobra — o punho sob o
     ponteiro durante o gesto — é o que a pessoa vê, e uma mudança futura na
     reconstrução tem de continuar respeitando isso. */
  const noMeio = await ler();
  const punhoNoMeio = noMeio.punhos.find((p) => p.junta === JUNTA);
  ok('o punho não desgruda do ponteiro durante o arrasto',
    Boolean(punhoNoMeio) && Math.abs((punho.x - punhoNoMeio.x) - PIXELS / 2) <= PIXELS * TOLERANCIA,
    punhoNoMeio ? `andou ${(punho.x - punhoNoMeio.x).toFixed(1)}px de ${PIXELS / 2}px` : 'punho sumiu');

  for (let passo = 6; passo <= 10; passo += 1) {
    await pagina.mouse.move(punho.x - (PIXELS * passo) / 10, punho.y);
  }
  await pagina.mouse.up();
  await pagina.waitForTimeout(1200);

  const depois = await ler();
  const andou = (nome) => {
    const a = antes.centros[nome];
    const d = depois.centros[nome];
    if (!a || !d) return Infinity;
    return Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
  };

  const moveram = PASSAM_PELA_JUNTA.filter((nome) => andou(nome) > 1e-4);
  ok('as partes que passam pela junta seguem o ponteiro',
    moveram.length === PASSAM_PELA_JUNTA.length,
    PASSAM_PELA_JUNTA.map((n) => `${n} ${andou(n).toFixed(4)}`).join(', '));

  const outras = Object.keys(antes.centros).filter((n) => !PASSAM_PELA_JUNTA.includes(n));
  const escorregaram = outras.filter((nome) => andou(nome) > 1e-4);
  ok('parte que não passa pela junta fica parada', escorregaram.length === 0,
    escorregaram.map((n) => `${n} ${andou(n).toFixed(4)}`).join(', '));

  /* O centro da parte anda METADE do canto, porque a outra ponta está presa.
     Isso é o que separa deformar de transladar: se a parte inteira andasse, o
     centro andaria o arrasto todo. */
  const arrastoNoMundo = (() => {
    const a = antes.punhos.find((p) => p.junta === JUNTA);
    const d = depois.punhos.find((p) => p.junta === JUNTA);
    return a && d ? Math.hypot(d.x - a.x, d.y - a.y) : 0;
  })();
  ok('o punho acompanha o ponteiro', Math.abs(arrastoNoMundo - PIXELS) <= PIXELS * TOLERANCIA,
    `ponteiro ${PIXELS}px, punho ${arrastoNoMundo.toFixed(1)}px`);

  const salvar = pagina.locator('#btnSalvarAjusteDeJunta');
  ok('o ajuste fica disponível para salvar', await salvar.isEnabled(),
    await pagina.locator('#resumoJuntas').textContent());

  /* CTRL+Z DESFAZ O ARRASTO DA JUNTA, que é o mesmo comando que desfaz a edição
     de malha. Antes disto o punho não registrava passo nenhum e só um botão de
     Descartar voltava atrás, jogando fora todos os arrastos de uma vez; o botão
     saiu, então esta prova também afirma que ele não voltou. */
  ok('o rodapé não tem mais um botão de descartar',
    await pagina.locator('#btnDescartarAjusteDeJunta').count() === 0);

  await pagina.keyboard.press('Control+z');
  await pagina.waitForTimeout(1000);
  const descartado = await ler();
  const voltou = Object.keys(antes.centros).every((nome) => {
    const a = antes.centros[nome];
    const d = descartado.centros[nome];
    return d && Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]) < 1e-4;
  });
  ok('Ctrl+Z devolve a peça ao que veio do arquivo', voltou);
  ok('depois de desfazer não sobra ajuste para salvar', await salvar.isDisabled(),
    await pagina.locator('#resumoJuntas').textContent());

  ok('a página não emitiu erro', erros.length === 0, erros[0] ?? '');
} catch (erro) {
  ok('a execução chega ao fim sem exceção', false, String(erro?.message ?? erro));
} finally {
  await navegador.close();
  servidor.close();
}

if (falhas.length) {
  console.error(`guarda:junta FALHOU — ${falhas.length}: ${falhas.join(', ')}`);
  process.exit(1);
}
console.log('guarda:junta ok — arrastar o canto deforma só as partes que passam por ele.');
