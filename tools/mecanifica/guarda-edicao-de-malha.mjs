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

  const gizmo = ambiente.scene.getObjectByName('__gizmo_de_edicao__');
  const setas = [];
  if (gizmo?.visible) {
    const V = ambiente.camera.position.constructor;
    for (const braco of gizmo.children) {
      const direcao = new V(0, 1, 0).applyQuaternion(braco.quaternion);
      const base = gizmo.position.clone();
      gizmo.parent.localToWorld(base);
      const ponta = gizmo.position.clone().addScaledVector(direcao, gizmo.scale.x);
      gizmo.parent.localToWorld(ponta);
      const emPixels = (v) => {
        const pr = v.clone().project(ambiente.camera);
        return { x: (pr.x * 0.5 + 0.5) * rect.width + rect.left, y: (-pr.y * 0.5 + 0.5) * rect.height + rect.top };
      };
      setas.push({ eixo: braco.userData.eixoDoGizmo, base: emPixels(base), ponta: emPixels(ponta) });
    }
  }

  return {
    edicao: bancada.edicaoDeMalha?.() ?? null,
    camera: [ambiente.camera.position.x, ambiente.camera.position.y, ambiente.camera.position.z],
    gizmoVisivel: Boolean(gizmo?.visible),
    setas,
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

  /* A CÂMERA CONTINUA ANDANDO DENTRO DO MODO. A camada parava a propagação de
     qualquer botão do ponteiro, e a pessoa que apertava Tab ficava presa num
     ângulo só. Dentro do modo o esquerdo é da seleção, e a órbita passa para o
     botão do meio. */
  const antesDeGirar = await ler();
  await pagina.mouse.move(700, 430);
  await pagina.mouse.down({ button: 'middle' });
  for (let passo = 1; passo <= 6; passo += 1) await pagina.mouse.move(700 + passo * 20, 430);
  await pagina.mouse.up({ button: 'middle' });
  await pagina.waitForTimeout(600);
  const depoisDeGirar = await ler();
  const girou = Math.hypot(...[0, 1, 2].map((i) => depoisDeGirar.camera[i] - antesDeGirar.camera[i]));
  ok('no modo de edição o botão do meio ainda gira a câmera', girou > 0.05,
    `a câmera andou ${girou.toFixed(4)}`);
  ok('girar a câmera não mexe na seleção',
    (depoisDeGirar.edicao?.selecionados?.length ?? 0) === (antesDeGirar.edicao?.selecionados?.length ?? 0));

  /* O RECORTE PELA PEÇA. Entrar no modo com uma parte selecionada edita só ela;
     sem seleção, a peça inteira. Sem isto, mexer num tubo punha os 502 vértices
     da bicicleta na tela e um clique podia cair em vértice de outra peça. */
  await tecla('Tab');
  await pagina.evaluate(() => window.__mecanificaBancada.selecionar(['tuboSelim']));
  await pagina.waitForTimeout(500);
  await tecla('Tab');
  const recortado = await ler();
  ok('com uma parte selecionada, o modo edita só ela',
    recortado.pontosNaTela.length > 0 && recortado.pontosNaTela.length < ligado.pontosNaTela.length,
    `${ligado.pontosNaTela.length} na peça inteira, ${recortado.pontosNaTela.length} no tubo do selim`);
  await tecla('Tab');
  await pagina.evaluate(() => window.__mecanificaBancada.selecionar([]));
  await pagina.waitForTimeout(400);
  await tecla('Tab');
  const inteiro = await ler();
  ok('sem seleção, o modo volta a valer para a peça inteira',
    inteiro.pontosNaTela.length === ligado.pontosNaTela.length,
    `${inteiro.pontosNaTela.length} pontos`);

  const alvo = inteiro.pontosNaTela[Math.floor(inteiro.pontosNaTela.length / 2)];
  ok('há vértice sob o ponteiro para clicar', Boolean(alvo));
  if (!alvo) throw new Error('nenhum vértice projetado no quadro');

  await pagina.mouse.click(alvo.x, alvo.y);
  await pagina.waitForTimeout(400);
  const selecionado = await ler();
  ok('clicar num vértice seleciona', (selecionado.edicao?.selecionados?.length ?? 0) > 0,
    `${selecionado.edicao?.selecionados?.length ?? 0} selecionado(s)`);

  /* CLICAR DE LONGE. O autor relatou clicar em certos vértices e nada acontecer.
     A hipótese era o alcance do clique: o ponto é desenhado com tamanho
     constante na tela e o alcance do raio é medido no mundo, então afastar a
     câmera encolheria a área clicável sem encolher o desenho. O alcance passou a
     acompanhar a distância por isso.
     ESTA AFIRMAÇÃO NÃO PROVA AQUELA CORREÇÃO: com o alcance fixo de volta, e a
     câmera recuada até o limite, o clique continua pegando o vértice. Ou seja, a
     causa do que o autor viu é outra e ainda não foi encontrada. A afirmação
     fica porque o que ela cobra — clicar funcionar com a câmera longe — precisa
     continuar valendo, mas ela não pode ser lida como o defeito resolvido. */
  await pagina.mouse.move(700, 430);
  await pagina.mouse.wheel(0, 4000);
  await pagina.waitForTimeout(1000);
  const longe = await ler();
  const alvoLonge = longe.pontosNaTela[Math.floor(longe.pontosNaTela.length / 2)];
  if (alvoLonge) {
    await pagina.mouse.click(alvoLonge.x, alvoLonge.y);
    await pagina.waitForTimeout(400);
    const deLonge = await ler();
    ok('com a câmera afastada o clique ainda pega o vértice',
      (deLonge.edicao?.selecionados?.length ?? 0) > 0,
      `${deLonge.edicao?.selecionados?.length ?? 0} selecionado(s)`);
  }
  await pagina.mouse.wheel(0, -4000);
  await pagina.waitForTimeout(1000);
  const dePerto = await ler();
  const alvoPerto = dePerto.pontosNaTela[Math.floor(dePerto.pontosNaTela.length / 2)];
  await pagina.mouse.click(alvoPerto.x, alvoPerto.y);
  await pagina.waitForTimeout(400);

  await tecla('l');
  const ilha = await ler();
  ok('L pega a ilha inteira sob o ponteiro',
    (ilha.edicao?.selecionados?.length ?? 0) > 1,
    `${ilha.edicao?.selecionados?.length} selecionado(s)`);

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

  /* O GIZMO. Ele aparece com a seleção e arrastar uma seta move no eixo dela,
     que é o segundo caminho pedido depois do teste: a trava por tecla funciona,
     mas não mostra o eixo antes do gesto. */
  ok('o gizmo aparece com a seleção e tem as três setas',
    depoisDoMovimento.gizmoVisivel && depoisDoMovimento.setas.length === 3,
    `visível ${depoisDoMovimento.gizmoVisivel}, ${depoisDoMovimento.setas.length} setas`);

  const seta = depoisDoMovimento.setas
    .map((s) => ({ ...s, comprimento: Math.hypot(s.ponta.x - s.base.x, s.ponta.y - s.base.y) }))
    .sort((a, b) => b.comprimento - a.comprimento)[0];
  if (seta) {
    const ux = (seta.ponta.x - seta.base.x) / seta.comprimento;
    const uy = (seta.ponta.y - seta.base.y) / seta.comprimento;
    /* Ponto de partida ao lado da haste desenhada, de propósito: pegar a seta
       não pode exigir pontaria. */
    const meio = {
      x: (seta.base.x + seta.ponta.x) / 2 - uy * 10,
      y: (seta.base.y + seta.ponta.y) / 2 + ux * 10,
    };
    await pagina.mouse.move(meio.x, meio.y);
    await pagina.mouse.down();
    for (let passo = 1; passo <= 8; passo += 1) {
      await pagina.mouse.move(meio.x + (ux * 90 * passo) / 8, meio.y + (uy * 90 * passo) / 8);
    }
    await pagina.mouse.up();
    await pagina.waitForTimeout(600);
    const comGizmo = await ler();
    const andou = comGizmo.caixaDaCena && depoisDoMovimento.caixaDaCena
      ? Math.hypot(...[0, 1, 2].map((i) => comGizmo.caixaDaCena.max[i] - depoisDoMovimento.caixaDaCena.max[i]))
      : 0;
    ok('arrastar a seta do gizmo move a malha desenhada', andou > 1e-3, `andou ${andou.toFixed(4)}`);
    await tecla('Control+z');
    await pagina.waitForTimeout(500);
  }

  /* O ÍMÃ. Com Ctrl apertado durante o movimento, a seleção gruda no vértice
     mais próximo que não está sendo movido, em vez de seguir o ponteiro livre.
     A afirmação é que o resultado MUDA com o Ctrl: sem isso o ímã poderia estar
     desligado e ninguém notaria. */
  await pagina.mouse.move(alvo.x, alvo.y);
  await tecla('g');
  await pagina.mouse.move(alvo.x + 60, alvo.y - 40);
  await pagina.waitForTimeout(300);
  const livre = await ler();
  await pagina.keyboard.down('Control');
  await pagina.mouse.move(alvo.x + 61, alvo.y - 41);
  await pagina.waitForTimeout(300);
  const grudado = await ler();
  await pagina.keyboard.up('Control');
  await tecla('Escape');
  const diferenca = livre.caixaDaCena && grudado.caixaDaCena
    ? Math.hypot(...[0, 1, 2].map((i) => grudado.caixaDaCena.max[i] - livre.caixaDaCena.max[i]))
    : 0;
  /* O limite é generoso de propósito, e mesmo assim tem dente. O ímã recalcula
     no movimento do ponteiro, então a leitura com Ctrl precisa de um pixel de
     deslocamento; um pixel sozinho move a malha por volta de 0,005. Com o ímã
     ligado o salto medido é 0,83, duas ordens de grandeza acima. Exigir mais de
     um décimo separa os dois casos sem depender de sorte. */
  ok('segurar Ctrl durante o movimento liga o ímã e muda onde a seleção para',
    diferenca > 0.1, `o destino mudou ${diferenca.toFixed(4)} ao apertar Ctrl`);

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
