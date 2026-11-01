#!/usr/bin/env node
/**
 * guarda-temas-e-visoes.mjs — a prova num navegador de verdade dos gates 1 e 6 do plano das visões de conferência e da interface.
 *
 * Os testes de unidade da bancada rodam sobre uma página falsa e provam cada componente; aqui a bancada sobe inteira, com a peça
 * `carenagem-de-prova`, e a afirmação é a medida na tela:
 *
 *   1. cada uma das seis visões, ligada pela tecla dela, muda o desenho da cena em relação à sólida (a fração de pixels
 *      diferentes na região da peça passa de um limiar), a escolha aparece no controle, e voltar à sólida devolve a imagem de
 *      antes; a zebra e a luz rasante acompanham a rotação da câmera (a imagem muda depois de uma órbita e a visão continua a
 *      mesma); a curvatura termina a conta e a legenda diz que está pronta;
 *   2. nos três temas, em 1400 por 900, a cena (no Revisão, a mesa da peça e da referência) ocupa ao menos 70% da largura, e
 *      em 1100 pixels nada transborda para os lados.
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
const REGIAO_DA_PECA = { x: 300, y: 130, width: 800, height: 380 };
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

async function abrir(tema, largura, altura) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: altura } });
  await contexto.addInitScript((escolhido) => {
    try { localStorage.setItem('mecanifica.bancada.tema', JSON.stringify(escolhido)); localStorage.removeItem('mecanifica.bancada.visao'); } catch { /* sem armazenamento */ }
  }, tema);
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on('pageerror', (erro) => erros.push(erro.message));
  await pagina.goto(`http://127.0.0.1:${vite.port}/nos-modelar/bancada.html?peca=${PECA}&vista=isometrica`, { waitUntil: 'load' });
  await pagina.waitForFunction(() => window.__mecanificaBancada?.ready === true, { timeout: 90000 });
  await pagina.waitForFunction((nome) => window.__mecanificaBancada.estado()?.peca === nome, PECA, { timeout: 60000 });
  await pagina.waitForTimeout(1500);
  return { contexto, pagina, erros };
}

const nomeDaVisao = (pagina) => pagina.$eval('#nomeVisao', (el) => el.textContent.trim());
const foto = (pagina) => pagina.screenshot({ clip: REGIAO_DA_PECA });

try {
  /* Gate 1: as seis visões, no Foco, em 1400 por 900. */
  {
    const { contexto, pagina, erros } = await abrir('foco', 1400, 900);
    await pagina.mouse.move(100, 760);
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
      await pagina.mouse.move(150, 760);
      await pagina.mouse.down();
      await pagina.mouse.move(260, 720, { steps: 8 });
      await pagina.mouse.up();
      await pagina.waitForTimeout(1200);
      const girou = fracaoDiferente(antes, await foto(pagina));
      ok(`(b3) ${visao.nome}: acompanha a rotação da câmera e continua a mesma visão`,
        girou > LIMIAR_DE_MUDANCA && (await nomeDaVisao(pagina)) === visao.rotulo, `${(girou * 100).toFixed(1)}% dos pixels`);
    }
    ok('(d) nenhuma página emitiu erro', erros.length === 0, erros.join(' | '));
    await contexto.close();
  }

  /* Gate 6: a cena ocupa 70% e nada transborda, nos três temas. */
  for (const tema of ['foco', 'bancada', 'revisao']) {
    for (const [largura, altura] of [[1400, 900], [1100, 800]]) {
      const { contexto, pagina, erros } = await abrir(tema, largura, altura);
      const medida = await pagina.evaluate(() => {
        const canvas = document.querySelector('#cenaBancada').getBoundingClientRect();
        /* No Revisão a cena é a peça (o canvas) mais a referência ao lado dela. */
        const lado = document.querySelector('#mesaComparacao .lado-referencia');
        const referencia = lado && lado.offsetParent ? lado.getBoundingClientRect().width : 0;
        return {
          tema: document.documentElement.dataset.tema,
          canvas: canvas.width,
          mesa: canvas.width + referencia,
          transbordo: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        };
      });
      const cena = tema === 'revisao' ? medida.mesa : medida.canvas;
      ok(`(e) ${tema} em ${largura}: a tela é a do tema`, medida.tema === tema, medida.tema);
      ok(`(f) ${tema} em ${largura}: a cena ocupa ao menos 70% da largura`, cena >= FRACAO_MINIMA_DA_CENA * largura,
        `${Math.round(cena)} de ${largura} (${((cena / largura) * 100).toFixed(1)}%)`);
      ok(`(g) ${tema} em ${largura}: nada transborda para os lados`, medida.transbordo <= 0, `${medida.transbordo} px`);
      ok(`(h) ${tema} em ${largura}: nenhuma página emitiu erro`, erros.length === 0, erros.join(' | '));
      await contexto.close();
    }
  }
} catch (erro) {
  ok('a execução chega ao fim sem exceção', false, String(erro?.stack || erro));
} finally {
  await navegador.close();
  await vite.close();
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S): ${falhas.join(' · ')}` : '\ntudo verde — as seis visões e os três temas medidos no navegador');
process.exit(falhas.length ? 1 : 0);
