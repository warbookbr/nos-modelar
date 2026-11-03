#!/usr/bin/env node
/**
 * guarda-temas-e-visoes.mjs — a prova num navegador de verdade dos gates 1 e 6 do plano das visões de conferência e da interface, no arranjo único da bancada.
 *
 * Os testes de unidade da bancada rodam sobre uma página falsa e provam cada componente; aqui a bancada sobe inteira, com a peça
 * `carenagem-de-prova`, e a afirmação é a medida na tela:
 *
 *   1. cada uma das seis visões, ligada pela tecla dela, muda o desenho da cena em relação à sólida (a fração de pixels
 *      diferentes na região da peça passa de um limiar), a escolha aparece no controle, e voltar à sólida devolve a imagem de
 *      antes; a zebra e a luz rasante acompanham a rotação da câmera (a imagem muda depois de uma órbita e a visão continua a
 *      mesma); a curvatura termina a conta e a legenda diz que está pronta;
 *   2. em 1400 por 900 a cena ocupa ao menos 70% da largura, e em 1100 pixels nada transborda para os lados;
 *   3. a legenda da curvatura e a da luz rasante não cobrem a peça (a caixa da legenda não cruza a caixa da peça na tela).
 *
 * Desde 2026-11-03 a bancada tem um só arranjo: os temas Foco e Revisão saíram, e com eles saíram daqui o laço pelos três
 * temas, a medida da mesa da peça com a referência (que só o Revisão tinha) e a gravação do tema escolhido.
 *
 *   npm run guarda:temas
 *
 * Precisa de navegador, por isso não entra em `npm test`: roda no `bancada:guardas`. */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { abrirNavegador, ARGS_DO_NAVEGADOR, subirVite } from '../../bancadas/ambiente-das-guardas.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PLAYWRIGHT = join(REPO, 'node_modules/playwright/index.js');
const PECA = 'carenagem-de-prova';
const FRACAO_MINIMA_DA_CENA = 0.7;
/* A fração de pixels da região da peça que a visão tem de mudar para a imagem contar como outra; a mais discreta das seis, a
   luz rasante, muda bem mais que isso. */
const LIMIAR_DE_MUDANCA = 0.05;
/* O que a sólida pode variar entre duas fotos da mesma cena (o contorno da seleção e as animações da página ficam fora). */
const RUIDO_MAXIMO = 0.002;
/* A região da peça no arranjo da bancada: entre a árvore (196 px) e o painel da direita (216 px), abaixo da barra do alto. */
const REGIAO_DA_PECA = { x: 300, y: 130, width: 700, height: 380 };
const VISOES = [
  { nome: 'arame', tecla: 'M', rotulo: 'Arame' },
  { nome: 'raio-x', tecla: 'Shift+M', rotulo: 'Raio X' },
  { nome: 'curvatura', tecla: 'K', rotulo: 'Curvatura' },
  { nome: 'zebra', tecla: 'B', rotulo: 'Zebra' },
  { nome: 'luz-rasante', tecla: 'J', rotulo: 'Luz rasante' },
];

const falhas = [];
const ok = (nome, condicao, detalhe = '') => {
  console.log(`  ${condicao ? 'ok  ' : 'FALHA'} ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!condicao) falhas.push(nome);
};

if (!existsSync(PLAYWRIGHT)) {
  console.error('Playwright não encontrado. Rode: npm ci');
  process.exit(1);
}

const vite = await subirVite(REPO);
const pw = (await import(pathToFileURL(PLAYWRIGHT).href)).default;
const navegador = await abrirNavegador(pw, { args: ARGS_DO_NAVEGADOR });

/** A fração de pixels que diferem (mais que 8 de 255 em algum canal) entre duas fotos do mesmo tamanho. */
function fracaoDiferente(a, b) {
  const x = PNG.sync.read(a);
  const y = PNG.sync.read(b);
  if (x.width !== y.width || x.height !== y.height) return 1;
  let diferentes = 0;
  for (let i = 0; i < x.data.length; i += 4) {
    if (Math.abs(x.data[i] - y.data[i]) > 8 || Math.abs(x.data[i + 1] - y.data[i + 1]) > 8 || Math.abs(x.data[i + 2] - y.data[i + 2]) > 8) diferentes += 1;
  }
  return diferentes / (x.width * x.height);
}

async function abrir(largura, altura) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: altura } });
  await contexto.addInitScript(() => {
    try { localStorage.removeItem('mecanifica.bancada.visao'); } catch { /* sem armazenamento */ }
  });
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on('pageerror', (erro) => erros.push(erro.message));
  await pagina.goto(`http://127.0.0.1:${vite.port}/nos-modelar/bancada.html?peca=${PECA}&vista=isometrica`, { waitUntil: 'load' });
  await pagina.waitForFunction(() => window.__mecanificaBancada?.ready === true, { timeout: 90000 });
  await pagina.waitForFunction((nome) => window.__mecanificaBancada.estado()?.peca === nome, PECA, { timeout: 60000 });
  await pagina.waitForTimeout(1500);
  return { contexto, pagina, erros };
}

/* A caixa da legenda e a caixa da peça na tela, as duas em pixels da página: a da peça vem dos oito cantos da caixa de cada malha. */
const legendaCruzaAPeca = (pagina) => pagina.evaluate(() => {
  const legenda = document.querySelector('.painel-visao');
  if (!legenda || legenda.hidden || !legenda.offsetParent) return { legenda: false, cruza: null };
  const ambiente = window.__mecanificaBancada.ambiente();
  const canvas = document.querySelector('#cenaBancada').getBoundingClientRect();
  const V = ambiente.camera.position.constructor;
  const caixa = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  ambiente.scene.traverse((no) => {
    if (!no.isMesh || !no.geometry || !no.userData?.identidadeParte) return;
    no.geometry.computeBoundingBox();
    const { min, max } = no.geometry.boundingBox;
    no.updateWorldMatrix(true, false);
    for (let i = 0; i < 8; i += 1) {
      const p = new V(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).applyMatrix4(no.matrixWorld).project(ambiente.camera);
      const x = canvas.left + (p.x * 0.5 + 0.5) * canvas.width;
      const y = canvas.top + (-p.y * 0.5 + 0.5) * canvas.height;
      caixa.x0 = Math.min(caixa.x0, x); caixa.x1 = Math.max(caixa.x1, x);
      caixa.y0 = Math.min(caixa.y0, y); caixa.y1 = Math.max(caixa.y1, y);
    }
  });
  const l = legenda.getBoundingClientRect();
  const cruza = l.left < caixa.x1 && l.right > caixa.x0 && l.top < caixa.y1 && l.bottom > caixa.y0;
  return { legenda: true, cruza, legendaPx: [l.left, l.top, l.right, l.bottom].map(Math.round), pecaPx: [caixa.x0, caixa.y0, caixa.x1, caixa.y1].map(Math.round) };
});
const nomeDaVisao = (pagina) => pagina.$eval('#nomeVisao', (el) => el.textContent.trim());
const foto = (pagina) => pagina.screenshot({ clip: REGIAO_DA_PECA });

try {
  /* Gate 1: as seis visões, no Foco, em 1400 por 900. */
  {
    const { contexto, pagina, erros } = await abrir(1400, 900);
    await pagina.mouse.move(100, 400);
    const solida = await foto(pagina);
    ok('(a) a bancada abre na visão sólida', (await nomeDaVisao(pagina)) === 'Sólida');
    ok('(a2) duas fotos da sólida saem iguais', fracaoDiferente(solida, await foto(pagina)) <= RUIDO_MAXIMO);
    for (const visao of VISOES) {
      await pagina.keyboard.press(visao.tecla);
      if (visao.nome === 'curvatura') {
        await pagina.waitForSelector('#painelVisao[data-estado="pronta"]', { timeout: 60000 });
      }
      await pagina.waitForTimeout(1200);
      const nome = await nomeDaVisao(pagina);
      if (visao.nome === 'curvatura' || visao.nome === 'luz-rasante') {
        const cruza = await legendaCruzaAPeca(pagina);
        ok(`(b4) ${visao.nome}: a legenda não cobre a peça`, cruza.legenda && !cruza.cruza, JSON.stringify(cruza));
      }
      const mudou = fracaoDiferente(solida, await foto(pagina));
      ok(`(b) ${visao.nome}: a tecla liga a visão e o controle mostra o nome dela`, nome === visao.rotulo, nome);
      ok(`(b2) ${visao.nome}: a cena muda em relação à sólida`, mudou > LIMIAR_DE_MUDANCA, `${(mudou * 100).toFixed(1)}% dos pixels`);
    }
    await pagina.keyboard.press('O');
    await pagina.waitForTimeout(1200);
    const devolvida = fracaoDiferente(solida, await foto(pagina));
    ok('(c) voltar à sólida devolve o nome e a imagem de antes das visões',
      (await nomeDaVisao(pagina)) === 'Sólida' && devolvida <= RUIDO_MAXIMO, `${(devolvida * 100).toFixed(2)}% dos pixels`);
    for (const visao of VISOES.filter((v) => v.nome === 'zebra' || v.nome === 'luz-rasante')) {
      await pagina.keyboard.press(visao.tecla);
      await pagina.waitForTimeout(1200);
      const antes = await foto(pagina);
      await pagina.mouse.move(650, 650);
      await pagina.mouse.down();
      await pagina.mouse.move(790, 610, { steps: 8 });
      await pagina.mouse.up();
      await pagina.waitForTimeout(1200);
      const girou = fracaoDiferente(antes, await foto(pagina));
      ok(`(b3) ${visao.nome}: acompanha a rotação da câmera e continua a mesma visão`,
        girou > LIMIAR_DE_MUDANCA && (await nomeDaVisao(pagina)) === visao.rotulo, `${(girou * 100).toFixed(1)}% dos pixels`);
    }
    ok('(d) nenhuma página emitiu erro', erros.length === 0, erros.join(' | '));
    await contexto.close();
  }

  /* Gate 6: a cena ocupa 70% e nada transborda. */
  {
    for (const [largura, altura] of [[1400, 900], [1100, 800]]) {
      const { contexto, pagina, erros } = await abrir(largura, altura);
      const medida = await pagina.evaluate(() => {
        const canvas = document.querySelector('#cenaBancada').getBoundingClientRect();
        return {
          tema: document.documentElement.dataset.tema,
          canvas: canvas.width,
          transbordo: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        };
      });
      const cena = medida.canvas;
      ok(`(e) em ${largura}: a tela é a da bancada`, medida.tema === 'bancada', medida.tema);
      ok(`(f) em ${largura}: a cena ocupa ao menos 70% da largura`, cena >= FRACAO_MINIMA_DA_CENA * largura,
        `${Math.round(cena)} de ${largura} (${((cena / largura) * 100).toFixed(1)}%)`);
      ok(`(g) em ${largura}: nada transborda para os lados`, medida.transbordo <= 0, `${medida.transbordo} px`);
      ok(`(h) em ${largura}: nenhuma página emitiu erro`, erros.length === 0, erros.join(' | '));
      await contexto.close();
    }
  }
} catch (erro) {
  ok('a execução chega ao fim sem exceção', false, String(erro?.stack || erro));
} finally {
  await navegador.close();
  await vite.close();
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S): ${falhas.join(' · ')}` : '\ntudo verde — as seis visões e o arranjo da bancada medido no navegador');
process.exit(falhas.length ? 1 : 0);
