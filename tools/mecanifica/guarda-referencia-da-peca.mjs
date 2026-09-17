#!/usr/bin/env node
/**
 * guarda-referencia-da-peca.mjs — a PROVA PELO OLHO de que a imagem da peça
 * chega ao navegador a partir da PASTA DA PEÇA.
 *
 * Por que existe: a foto que a bancada sobrepõe ao modelo morava em `public/`,
 * a única pasta que o Vite publica sem ninguém importar, e era citada apenas
 * por `sessao-ativa.json`, que é estado local não versionado. Com a imagem
 * dentro da pasta da peça, quem a emite para o pacote publicado é o
 * `import.meta.glob` com `?url` em `src/bancada/referencias/imagens-da-peca.js`.
 *
 * Esse é exatamente o tipo de ligação que teste de unidade não vigia. Trocar o
 * padrão do glob, mudar a extensão aceita ou mover a pasta faria a página
 * continuar subindo, os 1.200 testes continuarem verdes, e a referência sumir
 * da tela de quem abre o endereço publicado. A afirmação aqui é a requisição
 * HTTP: o navegador PEDIU a imagem e recebeu 200.
 *
 * A prova roda sobre o pacote CONSTRUÍDO, e não sobre o servidor de
 * desenvolvimento, porque a diferença entre os dois é justamente o defeito que
 * ela procura: em desenvolvimento o Vite serve qualquer arquivo do repositório.
 *
 *   npm run guarda:referencia
 *
 * Precisa de navegador, por isso não entra em `npm test`; entra nos gates e no
 * `ci.yml`. Prova fora do CI é prova que ninguém é obrigado a rodar.
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const DIST = join(REPO, 'dist');
const OUT = join(REPO, 'tools/bancadas/out');
const BASE = '/nos-mecanifica/';
const PECA = 'peca-de-prova';

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

const falhas = [];
const ok = (nome, cond, detalhe = '') => {
  console.log(`  ${cond ? 'ok  ' : 'FALHA'} ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!cond) falhas.push(nome);
};

if (!existsSync(join(DIST, 'bancada.html'))) {
  console.error('guarda:referencia — `dist/` não existe. Rode `npm run build` antes.');
  process.exit(1);
}
const PW = join(REPO, 'node_modules/playwright/index.js');
if (!existsSync(PW)) { console.error('Playwright não encontrado. Rode: npm ci'); process.exit(1); }

/* Servidor estático burro, servindo só o que a construção emitiu. É o ponto:
   nada fora de `dist/` pode ser alcançado, que é a condição do endereço
   publicado. */
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
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 720 } });

const imagens = [];
const errosDaPagina = [];
pagina.on('response', (r) => {
  const { pathname } = new URL(r.url());
  if (/\.(png|jpe?g|webp|svg)$/i.test(pathname)) imagens.push({ pathname, status: r.status() });
});
pagina.on('pageerror', (e) => errosDaPagina.push(String(e)));

try {
  await pagina.goto(`http://127.0.0.1:${port}${BASE}bancada.html`, { waitUntil: 'load' });
  await pagina.waitForTimeout(1500);

  await pagina.click('#btnMenuAbrir');
  await pagina.locator(`#listaAcervo [data-receita="${PECA}"]`).click({ timeout: 10000 });
  await pagina.waitForTimeout(4000);

  const sobreposicao = imagens.find((i) => /prova/i.test(i.pathname));
  const naCena = await pagina.evaluate(() => window.__mecanificaBancada?.imagemReferencia ?? null);
  ok('a página não emitiu erro', errosDaPagina.length === 0, errosDaPagina[0] ?? '');
  ok('a bancada pediu a sobreposição da peça', Boolean(sobreposicao), sobreposicao?.pathname ?? 'nenhuma imagem de peça foi pedida');
  ok('a sobreposição foi servida pelo pacote construído', sobreposicao?.status === 200, `status ${sobreposicao?.status ?? '—'}`);
  /* A REQUISIÇÃO NÃO É A PROVA. Pedir o arquivo e receber 200 diz que o pacote
     publicou a imagem; não diz que ela virou plano na cena. Textura recusada,
     alinhamento inválido ou malha não adicionada deixariam a requisição verde e
     a tela sem referência nenhuma. */
  ok('a imagem virou plano na cena', naCena?.naCena === true, JSON.stringify(naCena));
  ok('o plano carrega a textura', naCena?.comTextura === true);
  ok('o plano tem tamanho', (naCena?.largura ?? 0) > 0 && (naCena?.altura ?? 0) > 0,
    `${naCena?.largura} x ${naCena?.altura}`);
  ok('a referência na cena é a declarada pela peça', /prova/i.test(naCena?.rotulo ?? ''),
    naCena?.rotulo ?? '—');
  ok('nenhuma imagem da peça faltou', imagens.every((i) => i.status === 200),
    imagens.filter((i) => i.status !== 200).map((i) => `${i.status} ${i.pathname}`).join(', '));
  /* `public/referencias/` não existe mais, e a prova falha se alguém a
     recriar: cópia em `public/` é o estado que esta mudança desfez. */
  /* A MINIATURA E O PUNHO. O painel tinha um botão solto de apagar e nada
     dizendo qual imagem sumiria, e a posição da foto só se ajustava por três
     barras num canto da tela — procurar o encaixe olhando o número em vez da
     cena. Os dois são de tela, então nenhum teste de unidade os enxerga. */
  await pagina.click('.aba-btn[data-aba="referencias"]');
  await pagina.waitForTimeout(700);
  const painel = await pagina.evaluate(() => {
    const itens = [...document.querySelectorAll('.item-referencia')];
    const ambiente = window.__mecanificaBancada.ambiente();
    const punho = ambiente.scene.getObjectByName('__gizmo_da_imagem__');
    return {
      quantos: itens.length,
      comMiniatura: itens.filter((i) => {
        const img = i.querySelector('img.miniatura-referencia');
        return Boolean(img?.src) && img.naturalWidth > 0;
      }).length,
      comApagar: itens.filter((i) => i.querySelector('.apagar-referencia')).length,
      botaoSolto: [...document.querySelectorAll('button')]
        .some((b) => b.textContent.trim() === 'Deletar imagem referência'),
      punhoVisivel: Boolean(punho?.visible),
      setasDoPunho: punho?.children?.length ?? 0,
    };
  });

  ok('a imagem carregada aparece como miniatura, e a miniatura carregou',
    painel.quantos === 1 && painel.comMiniatura === 1,
    `${painel.quantos} item(ns), ${painel.comMiniatura} com imagem visível`);
  ok('cada miniatura leva o apagar dela', painel.comApagar === painel.quantos);
  ok('o botão solto de deletar não existe mais', painel.botaoSolto === false);
  ok('a imagem tem punho na cena, com as três setas',
    painel.punhoVisivel && painel.setasDoPunho === 3,
    `visível ${painel.punhoVisivel}, ${painel.setasDoPunho} setas`);

  ok('não há cópia de referência em `public/`', !existsSync(join(REPO, 'public/referencias')));

  /* O GIRO CHEGA À CENA, e não só ao descritor. Mexer o controle deslizante e
     conferir o número guardado provaria só que o painel escreve onde ele mesmo
     lê; o que decide é a rotação da malha desenhada, que é o que a pessoa vê. */
  const antesDoGiro = await pagina.evaluate(() => {
    const malha = window.__mecanificaBancada.ambiente().scene.getObjectByName('__imagem_referencia__');
    return malha?.rotation?.x ?? null;
  });
  const mexeuOGiro = await pagina.evaluate(() => {
    const campos = [...document.querySelectorAll('.controle-imagem-referencia input[type="range"]')];
    const rotulos = [...document.querySelectorAll('.controle-imagem-referencia .campo-controle')];
    const alvo = rotulos.find((c) => /giro/i.test(c.textContent ?? ''));
    const entrada = alvo?.querySelector('input[type="range"]') ?? campos.find((c) => c.min === '-180');
    if (!entrada) return null;
    entrada.value = '45';
    entrada.dispatchEvent(new Event('input', { bubbles: true }));
    return Number(entrada.value);
  });
  await pagina.waitForTimeout(500);
  const depoisDoGiro = await pagina.evaluate(() => {
    const malha = window.__mecanificaBancada.ambiente().scene.getObjectByName('__imagem_referencia__');
    return malha?.rotation?.x ?? null;
  });
  ok('a aba tem um controle deslizante de giro', mexeuOGiro === 45, String(mexeuOGiro));
  ok('girar o controle gira o plano da imagem na cena',
    antesDoGiro === 0 && Math.abs((depoisDoGiro ?? 0) - Math.PI / 4) < 1e-6,
    `${antesDoGiro} → ${depoisDoGiro} rad, esperado ${Math.PI / 4}`);

  /* A foto é de quem confere no olho, então ela precisa enquadrar o que a
     afirmação mede. Em perspectiva o plano fica de lado e sai do quadro; a
     vista lateral é a que mostra a sobreposição sobre o modelo. */
  await pagina.keyboard.press('3');
  await pagina.waitForTimeout(1200);
  mkdirSync(OUT, { recursive: true });
  await pagina.screenshot({ path: join(OUT, 'guarda-referencia-da-peca.png') });
} finally {
  await navegador.close();
  servidor.close();
}

if (falhas.length) {
  console.error(`guarda:referencia FALHOU — ${falhas.length}: ${falhas.join(', ')}`);
  process.exit(1);
}
console.log(`guarda:referencia ok — ${imagens.length} imagem(ns) da peça servidas pelo pacote construído.`);
