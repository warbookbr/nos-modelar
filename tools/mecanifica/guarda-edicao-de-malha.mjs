#!/usr/bin/env node
/**
 * guarda-edicao-de-malha.mjs — o modo de edição existe na tela e responde.
 *
 * Por que existe: o gesto por junta foi recusado por ser complexo demais, e o
 * modo de edição é o que ficou no lugar. Ele é feito de teclado, seleção por
 * raycast e escrita direta nos vértices da malha da cena — três coisas que teste
 * de unidade não alcança. Um módulo de topologia impecável convive com pontos
 * invisíveis, Tab engolido por outro atalho e movimento que não chega à
 * geometria desenhada.
 *
 * O que é afirmado aqui: Tab liga e desliga, os pontos aparecem, clicar
 * seleciona, 1/2/3 trocam o nível e convertem o que já estava selecionado, L
 * pega a ilha, G com trava de eixo e valor digitado move a malha de verdade, e
 * Ctrl+Z devolve.
 *
 *   npm run guarda:edicao
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
/* O valor digitado no movimento, em unidades da peça. Grande o bastante para a
   medida não se confundir com ruído de arredondamento da malha. */
const AVANCO = 0.2;

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
  console.error('guarda:edicao — `dist/` não existe. Rode `npm run build` antes.');
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

/* O estado da edição, o desenho dos pontos com o seu tamanho na tela, e a caixa
   envolvente da malha da CENA — não a do estado neutro. É a caixa da cena que
   prova que o movimento chegou até a geometria desenhada. */
const ler = () => pagina.evaluate(() => {
  const bancada = window.__mecanificaBancada;
  const ambiente = bancada.ambiente();
  const grupo = ambiente.scene.getObjectByName('__edicao_de_malha__');
  const pontos = grupo?.children?.find((no) => no.isPoints);
  const rect = document.getElementById('cenaBancada').getBoundingClientRect();

  let minimo = null;
  let maximo = null;
  const naTela = [];
  ambiente.scene.traverse((no) => {
    if (!no.userData?.identidadeParte || !no.geometry) return;
    no.updateWorldMatrix(true, false);
    no.geometry.computeBoundingBox?.();
    const caixa = no.geometry.boundingBox;
    if (!caixa) return;
    for (const canto of [caixa.min, caixa.max]) {
      const p = canto.clone();
      no.localToWorld(p);
      minimo = minimo ? [Math.min(minimo[0], p.x), Math.min(minimo[1], p.y), Math.min(minimo[2], p.z)] : [p.x, p.y, p.z];
      maximo = maximo ? [Math.max(maximo[0], p.x), Math.max(maximo[1], p.y), Math.max(maximo[2], p.z)] : [p.x, p.y, p.z];
    }
  });

  if (pontos?.visible) {
    const posicao = pontos.geometry.getAttribute('position');
    const V = ambiente.camera.position.constructor;
    for (let i = 0; i < posicao.count; i += 1) {
      const p = new V(posicao.getX(i), posicao.getY(i), posicao.getZ(i));
      pontos.localToWorld(p);
      const projetado = p.project(ambiente.camera);
      if (Math.abs(projetado.x) > 1 || Math.abs(projetado.y) > 1 || projetado.z > 1) continue;
      naTela.push({
        x: (projetado.x * 0.5 + 0.5) * rect.width + rect.left,
        y: (-projetado.y * 0.5 + 0.5) * rect.height + rect.top,
      });
    }
  }

  return {
    edicao: bancada.edicaoDeMalha?.() ?? null,
    grupoVisivel: Boolean(grupo?.visible),
    pontosVisiveis: Boolean(pontos?.visible),
    tamanhoDoPonto: pontos?.material?.size ?? 0,
    pontosNaTela: naTela,
    caixaDaCena: minimo && maximo ? { min: minimo, max: maximo } : null,
  };
});

const tecla = async (chave) => { await pagina.keyboard.press(chave); await pagina.waitForTimeout(250); };

try {
  await pagina.goto(`http://127.0.0.1:${port}${BASE}bancada.html`, { waitUntil: 'load' });
  await pagina.waitForTimeout(2500);
  await pagina.click('#btnMenuAbrir');
  await pagina.locator(`#listaAcervo [data-receita="${PECA}"]`).click({ timeout: 10000 });
  await pagina.waitForTimeout(4000);

  const desligado = await ler();
  ok('fora do modo de edição a malha de pontos não aparece',
    !desligado.grupoVisivel && desligado.edicao?.ativo !== true,
    `grupo ${desligado.grupoVisivel}, ativo ${desligado.edicao?.ativo}`);

  await tecla('Tab');
  const ligado = await ler();
  ok('Tab liga o modo de edição', ligado.edicao?.ativo === true, JSON.stringify(ligado.edicao?.modo ?? null));
  ok('os vértices aparecem na tela, com tamanho visível',
    ligado.pontosVisiveis && ligado.tamanhoDoPonto >= 2 && ligado.pontosNaTela.length > 0,
    `visível ${ligado.pontosVisiveis}, tamanho ${ligado.tamanhoDoPonto}, ${ligado.pontosNaTela.length} pontos no quadro`);

  const alvo = ligado.pontosNaTela[Math.floor(ligado.pontosNaTela.length / 2)];
  ok('há vértice sob o ponteiro para clicar', Boolean(alvo));
  if (!alvo) throw new Error('nenhum vértice projetado no quadro');

  await pagina.mouse.click(alvo.x, alvo.y);
  await pagina.waitForTimeout(400);
  const selecionado = await ler();
  ok('clicar num vértice seleciona', (selecionado.edicao?.selecionados?.length ?? 0) > 0,
    `${selecionado.edicao?.selecionados?.length ?? 0} selecionado(s)`);

  await tecla('l');
  const ilha = await ler();
  ok('L pega a ilha inteira sob o ponteiro',
    (ilha.edicao?.selecionados?.length ?? 0) > (selecionado.edicao?.selecionados?.length ?? 0),
    `${selecionado.edicao?.selecionados?.length} → ${ilha.edicao?.selecionados?.length}`);

  await tecla('2');
  const emAresta = await ler();
  ok('2 troca para aresta e converte o que estava selecionado',
    emAresta.edicao?.modo === 'aresta' && (emAresta.edicao?.selecionados?.length ?? 0) > 0,
    `modo ${emAresta.edicao?.modo}, ${emAresta.edicao?.selecionados?.length} selecionado(s)`);

  await tecla('3');
  const emFace = await ler();
  ok('3 troca para face e converte o que estava selecionado',
    emFace.edicao?.modo === 'face' && (emFace.edicao?.selecionados?.length ?? 0) > 0,
    `modo ${emFace.edicao?.modo}, ${emFace.edicao?.selecionados?.length} selecionado(s)`);

  await tecla('1');
  await tecla('l');
  const antesDoMovimento = await ler();

  /* G, trava em y, valor digitado, Enter. O que se mede é a caixa da malha
     DESENHADA: o estado interno pode estar certo e a geometria da cena não
     receber o movimento, e aí a pessoa move e não vê nada acontecer. */
  await pagina.mouse.move(alvo.x, alvo.y);
  await tecla('g');
  await tecla('y');
  for (const digito of String(AVANCO)) await tecla(digito);
  await tecla('Enter');
  const depoisDoMovimento = await ler();

  const subiu = depoisDoMovimento.caixaDaCena && antesDoMovimento.caixaDaCena
    ? depoisDoMovimento.caixaDaCena.max[1] - antesDoMovimento.caixaDaCena.max[1]
    : 0;
  ok('G com eixo travado e valor digitado move a malha desenhada',
    Math.abs(subiu) > 1e-3, `a caixa da cena subiu ${subiu.toFixed(4)}`);

  await tecla('Control+z');
  await pagina.waitForTimeout(600);
  const desfeito = await ler();
  const voltou = desfeito.caixaDaCena && antesDoMovimento.caixaDaCena
    ? Math.abs(desfeito.caixaDaCena.max[1] - antesDoMovimento.caixaDaCena.max[1])
    : Infinity;
  ok('Ctrl+Z devolve a malha ao que estava antes do movimento', voltou < 1e-3,
    `sobrou ${voltou.toFixed(5)}`);

  await tecla('Tab');
  const fechado = await ler();
  ok('Tab desliga o modo e some com os pontos',
    fechado.edicao?.ativo === false && !fechado.grupoVisivel);

  ok('a página não emitiu erro', erros.length === 0, erros[0] ?? '');
} catch (erro) {
  ok('a execução chega ao fim sem exceção', false, String(erro?.message ?? erro));
} finally {
  await navegador.close();
  servidor.close();
}

if (falhas.length) {
  console.error(`guarda:edicao FALHOU — ${falhas.length}: ${falhas.join(', ')}`);
  process.exit(1);
}
console.log('guarda:edicao ok — o modo de edição aparece na tela, seleciona, move e desfaz.');
