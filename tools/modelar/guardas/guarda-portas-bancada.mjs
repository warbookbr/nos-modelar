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
 * AS TRÊS LINHAS QUE PUBLICAM. A bancada publica as portas em três lugares:
 * a carga (`carregar-peca.js`) e as duas reconstruções de `cena/edicao-da-peca.js`
 * (que moravam em `main.js`), a que vem depois de arrastar uma junta
 * (`reconstruirComAjuste`) e a que vem depois de editar a malha
 * (`reconstruirMalhaEditada`). Trocar qualquer uma das duas por `portas: []`
 * passava verde nas dez guardas, porque só a carga
 * era conferida. A terceira parte desta guarda abre `fixture-portas-junta`, lê o
 * painel, arrasta uma junta, lê o painel de novo, gira a parte pela edição de
 * malha e lê o painel uma terceira vez; cada leitura é nomeada pelo estado em
 * que a peça está, para a falha dizer qual estado perdeu as portas.
 *
 * A terceira parte achou um defeito de produto, e não só uma lacuna da guarda:
 * `fotografarMalha` (main.js) copiava só `V` e `F`, então a malha de base do
 * ajuste não trazia `portas` e o painel sumia depois do primeiro gesto, com ou
 * sem a mutação. As duas mutações plantadas eram, por isso, no-ops na tela.
 *
 * Precisa de navegador, por isso não entra em `npm test`; entra no
 * `.github/workflows/ci.yml`. Prova fora do CI é
 * prova que ninguém é obrigado a rodar.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrirNavegador, ARGS_DO_NAVEGADOR, subirVite } from '../../bancadas/ambiente-das-guardas.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../..');
const OUT = join(REPO, 'tools/bancadas/out');

const COM_PORTAS = 'fixture-portas';
const SEM_PORTAS = 'fixture-sem-portas';
const COM_JUNTA = 'fixture-portas-junta';
const PIXELS_DE_JUNTA = 100;
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

/* O oráculo da peça com junta, também literal: duas portas, uma por parte. */
const PORTAS_DA_JUNTA = [
  { nome: 'portaDoBraco', origem: 'portaDoBraco · cubo:131' },
  { nome: 'portaDoCorpo', origem: 'portaDoCorpo · cubo:130' },
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

const vite = await subirVite(REPO);
const { port } = vite;
const base = `http://127.0.0.1:${port}/nos-modelar/tools/bancadas/harness.html`;

const pw = (await import(pathToFileURL(PW).href)).default;
const browser = await abrirNavegador(pw, { args: ARGS_DO_NAVEGADOR });
mkdirSync(OUT, { recursive: true });

/* o que o DOM mostra do painel de portas neste instante. */
const lerPainel = (page) => page.evaluate(() => {
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
  const painel = await lerPainel(page);
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

  /* ===== depois de um gesto que deforma e de um ajuste que recarrega ======== */
  /* A mesma peça passa por três caminhos que montam `medida.portas`: a carga, a
     reconstrução do arrasto de junta e a reconstrução da edição de malha. Cada
     leitura abaixo é de um estado, e o nome do estado é o que a falha diz. */
  console.log(`\n${COM_JUNTA} — o painel continua mostrando as portas depois de cada reconstrução do modelo`);
  const junta = await abrirBancada(COM_JUNTA);
  ok('(i) a bancada sobe a peça com junta pela URL', junta.subiu, junta.url);
  const painelOk = (p) => p?.hidden === false && p.alturaVisivel > 0
    && p.resumo === `${PORTAS_DA_JUNTA.length} publicadas` && igual(p.itens, PORTAS_DA_JUNTA);
  const resumoDoPainel = (p) => `hidden=${p?.hidden} · resumo "${p?.resumo}" · ${p?.itens.length} item(ns)`;
  ok('(i ★) logo após a CARGA o painel mostra as duas portas', painelOk(junta.painel), resumoDoPainel(junta.painel));

  const centros = () => junta.page.evaluate(() => {
    const ambiente = window.__mecanificaBancada.ambiente();
    const V = ambiente.camera.position.constructor;
    const saida = {};
    ambiente.scene.traverse((no) => {
      const parte = no.userData?.identidadeParte;
      if (!parte || !no.geometry) return;
      no.updateWorldMatrix(true, false);
      no.geometry.computeBoundingBox?.();
      const caixa = no.geometry.boundingBox;
      if (!caixa) return;
      const c = new V((caixa.min.x + caixa.max.x) / 2, (caixa.min.y + caixa.max.y) / 2, (caixa.min.z + caixa.max.z) / 2);
      no.localToWorld(c);
      saida[parte] = [c.x, c.y, c.z, caixa.max.x - caixa.min.x, caixa.max.z - caixa.min.z];
    });
    return saida;
  });
  const andou = (a, b) => Object.keys(a).filter((n) => b[n] && Math.hypot(b[n][0] - a[n][0], b[n][1] - a[n][1], b[n][2] - a[n][2]) > 1e-4);

  /* o gesto que DEFORMA: ligar o modo de junta e arrastar um punho. */
  const antesDoArrasto = await centros();
  await junta.page.evaluate(() => document.getElementById('btnJuntas').click());
  await junta.page.waitForTimeout(300);
  const punho = await junta.page.evaluate(() => {
    const ambiente = window.__mecanificaBancada.ambiente();
    const raiz = ambiente.scene.getObjectByName('__punhos_de_junta__');
    if (!raiz?.visible || !raiz.children.length) return null;
    const rect = document.getElementById('cenaBancada').getBoundingClientRect();
    const p = raiz.children[0].position.clone().project(ambiente.camera);
    return { junta: raiz.children[0].userData.junta, x: (p.x * 0.5 + 0.5) * rect.width + rect.left, y: (-p.y * 0.5 + 0.5) * rect.height + rect.top };
  });
  ok('(j) o modo de junta desenha punho na peça com junta', punho !== null, punho?.junta ?? 'nenhum punho');
  if (punho) {
    await junta.page.mouse.move(punho.x, punho.y);
    await junta.page.mouse.down();
    for (let passo = 1; passo <= 10; passo += 1) {
      await junta.page.mouse.move(punho.x - (PIXELS_DE_JUNTA * passo) / 10, punho.y);
    }
    await junta.page.mouse.up();
    await junta.page.waitForTimeout(400);
  }
  const depoisDoArrasto = await centros();
  ok('(j) o arrasto DEFORMOU a malha: alguma parte andou',
     andou(antesDoArrasto, depoisDoArrasto).length > 0, andou(antesDoArrasto, depoisDoArrasto).join(', ') || 'nada andou');
  const painelAposJunta = await lerPainel(junta.page);
  ok('(j ★) depois do arrasto de junta (gesto que deforma) o painel AINDA mostra as duas portas',
     painelOk(painelAposJunta), resumoDoPainel(painelAposJunta));

  /* o ajuste que RECARREGA: girar a parte pela edição de malha, que refaz o modelo
     com a malha nova (reconstruirMalhaEditada). */
  await junta.page.evaluate(() => document.getElementById('btnJuntas').click());
  await junta.page.evaluate(() => window.__mecanificaBancada.selecionar(['corpo']));
  await junta.page.waitForTimeout(150);
  await junta.page.keyboard.press('Tab');
  await junta.page.waitForTimeout(250);
  await junta.page.keyboard.press('a');
  await junta.page.keyboard.press('r');
  await junta.page.waitForTimeout(400);
  const depoisDaEdicao = await centros();
  ok('(k) a edição de malha refez a malha: a parte girada mudou de largura em x',
     Math.abs((depoisDaEdicao.corpo?.[3] ?? 0) - (depoisDoArrasto.corpo?.[3] ?? 0)) > 1e-3,
     `corpo ${depoisDoArrasto.corpo?.[3]?.toFixed(3)} -> ${depoisDaEdicao.corpo?.[3]?.toFixed(3)}`);
  const painelAposEdicao = await lerPainel(junta.page);
  ok('(k ★) depois do ajuste que recarrega a peça (edição de malha) o painel AINDA mostra as duas portas',
     painelOk(painelAposEdicao), resumoDoPainel(painelAposEdicao));
  ok('(j) nenhum erro de página na peça com junta', junta.erros.length === 0, junta.erros.join(' | '));
  await junta.page.close();

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
