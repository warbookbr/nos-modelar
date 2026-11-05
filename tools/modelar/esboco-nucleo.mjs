#!/usr/bin/env node
/* esboco-nucleo.mjs — o esboço 2.0: as opções de forma de um esboço saem das operações do núcleo, cada uma montada como receita em
 * memória e capturada na bancada com a mesma câmera, lado a lado numa imagem só com o título e a nota de cada uma.
 *
 * Uso: npm run esboco:nucleo -- <arquivo> [--vista <v>] [--saida <png>] [--largura <px>] [--sem-cores] [--so-montar]
 *
 * O arquivo é um `.esboco.json` de opções de forma (o antigo, que o leitor de `modulos/esboco-nucleo/src/ler-esboco.js` traduz sem
 * reescrita, ou o do 2.0, com `passos` e `formas` em metro) ou um módulo `.mjs`/`.js` cujo `default` é o esboço do 2.0, para a
 * opção que precisa de código (a chapa da gaiola, o contorno de um vão). Cada opção vira receita por `receitaDaOpcao`
 * (`modulos/esboco-nucleo/src/opcao.js`), executada pelo executor; o que o leitor ou o núcleo recusam sai com o motivo, e nada é
 * desenhado de outro jeito.
 *
 * A MESMA CÂMERA. A bancada encaixa cada peça no estúdio na escala dela, e a câmera automática enquadra cada uma por conta própria;
 * duas opções de tamanhos diferentes sairiam em escalas diferentes. Aqui a câmera é uma só, ortográfica, na direção da vista,
 * centrada no centro da caixa que junta as malhas de todas as opções e com o quadro dessa caixa vista da câmera, mais 8% de
 * margem. Em cada opção a página converte essa câmera do espaço da receita para o do estúdio pela transformação que a bancada deu
 * à peça (`olharComoReferencia` da ponte), e devolve onde o centro e o quadro dos oito cantos da caixa comum caíram na tela: os números saem
 * no relato, e iguais em todas as opções provam a mesma câmera. As vistas são as da bancada (isometrica, frontal, traseira,
 * direita, esquerda, superior, inferior); a padrão é a do esboço.
 *
 * `capturarLadoALado` é exportado para `variantes.mjs`, que junta as variantes de uma receita do mesmo jeito. Precisa do
 * Chromium do Playwright, como `npm run bancada`. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { neutroCanonico } from '../../procedural/nucleo/nucleo.js';
import { VISTAS_BANCADA } from '../../src/autoria/vistas-da-bancada.js';
import { lerEsboco } from '../../modulos/esboco-nucleo/src/ler-esboco.js';
import { receitaDaOpcao, RecusaDoEsboco, caixaDaMalha } from '../../modulos/esboco-nucleo/src/opcao.js';
import { abrirCapturaCompartilhada, PRAZO_DE_CARGA_MS } from './olhar-bancada.mjs';
import { FATOR_DE_AMOSTRAGEM, reduzirPorMedia } from './capturar-montagem.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SESSOES = join(REPO, 'tools/bancadas/out/sessoes');
const MARGEM = 0.08;

export const AJUDA = `npm run esboco:nucleo -- <arquivo> [opções]  (node tools/modelar/esboco-nucleo.mjs)
O esboço 2.0: cada opção de forma é uma receita do núcleo, montada em memória e capturada na bancada com a mesma câmera, e as
opções saem lado a lado numa imagem só, com o título e a nota de cada uma.

O arquivo é um .esboco.json de opções de forma (o antigo abre sem reescrita: caixa com raio e chanfro, cilindro, anel, cone em
tronco, extrusão e loft, posicionados por centro, sobre, ponta, desloca e rotacao) ou o do 2.0, em metro: cada opção com
"passos" (passos crus do núcleo, com tudo o que o catálogo oferece), "topo" (pontos nomeados) e "formas" (o atalho: { id, op,
args } ou { id, ajudante: "gaiolaPorLacos" | "gaiolaPorEstacoes" | "gaiolaPorRede" | "gaiolaVarrida", args }, posicionada por
centro, sobre, ponta, desloca e rotacao pela caixa da malha que o núcleo gerou). Um módulo .mjs cujo default é o esboço do 2.0
serve para a opção que precisa de código. O que o leitor ou o núcleo não fazem é recusado com o motivo.

  --vista <v>      isometrica, frontal, traseira, direita, esquerda, superior ou inferior (padrão: a do esboço)
  --saida <png>    onde gravar a imagem (padrão: tools/bancadas/out/esboco-nucleo-<nome>.png)
  --largura <px>   a largura de cada opção na imagem (padrão 640)
  --sem-cores      a cor dos materiais, em vez de uma cor por parte
  --so-montar      monta e confere as receitas, imprime os números, e não abre a bancada
  --ajuda          esta mensagem

Imprime, por opção, as partes, as faces, a caixa da malha em mm e o hash do neutroCanonico, e a posição da caixa comum na tela
de cada captura (a mesma câmera). Precisa do Chromium do Playwright.
`;

export const hashDoNeutro = (neutro) => createHash('sha256').update(JSON.stringify(neutroCanonico(neutro))).digest('hex');

/** O esboço de um arquivo: JSON lido, ou o `default` de um módulo. */
export async function lerArquivoDeEsboco(caminho) {
  const abs = resolve(caminho);
  if (/\.(mjs|js)$/.test(abs)) {
    const modulo = await import(pathToFileURL(abs).href);
    const esboco = modulo.default ?? modulo.ESBOCO;
    if (!esboco) throw new Error(`${caminho}: o módulo precisa exportar o esboço como default`);
    return esboco;
  }
  return JSON.parse(readFileSync(abs, 'utf8'));
}

/** Monta as receitas das opções. Devolve `{ vista, paineis, recusas }`; com recusa, `paineis` fica vazio. */
export function montarOpcoes(esboco, { nome = 'esboco' } = {}) {
  const lido = lerEsboco(esboco);
  if (lido.recusas.length) return { vista: lido.vista, paineis: [], recusas: lido.recusas, formato: lido.formato };
  const paineis = []; const recusas = [];
  lido.opcoes.forEach((o, i) => {
    try {
      const r = receitaDaOpcao(o, { nome: `${nome}-${i + 1}` });
      paineis.push({ titulo: o.titulo ?? `opção ${i + 1}`, nota: o.nota ?? '', receita: r.receita, neutro: r.neutro, partes: r.partes, facesSemParte: r.facesSemParte, formas: r.formas });
    } catch (e) {
      if (!(e instanceof RecusaDoEsboco)) throw e;
      recusas.push({ opcao: o.titulo ?? `opção ${i + 1}`, forma: null, motivo: e.message });
    }
  });
  return { vista: lido.vista, paineis: recusas.length ? [] : paineis, recusas, formato: lido.formato, conferencias: lido.conferencias };
}

const unit = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A câmera comum: ortográfica, na direção da vista da bancada, centrada na caixa que junta as malhas, com o quadro dela. */
export function cameraComum(neutros, vista) {
  const definicao = VISTAS_BANCADA[vista];
  if (!definicao) throw new Error(`vista "${vista}" não existe na bancada (${Object.keys(VISTAS_BANCADA).join(', ')})`);
  const caixas = neutros.map((n) => caixaDaMalha(n)).filter(Boolean);
  const min = [0, 1, 2].map((k) => Math.min(...caixas.map((c) => c.min[k])));
  const max = [0, 1, 2].map((k) => Math.max(...caixas.map((c) => c.max[k])));
  const centro = min.map((m, k) => (m + max[k]) / 2);
  const direcao = unit([...definicao.direcao]);
  const vertical = Math.abs(direcao[1]) > 0.99;
  const acima = vertical ? [0, 0, direcao[1] > 0 ? -1 : 1] : [0, 1, 0];
  const olhar = direcao.map((x) => -x);
  const direita = unit(cruz(olhar, acima)); const cima = unit(cruz(direita, olhar));
  let meiaLargura = 0; let meiaAltura = 0;
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
    const d = [x - centro[0], y - centro[1], z - centro[2]];
    meiaLargura = Math.max(meiaLargura, Math.abs(dot(d, direita))); meiaAltura = Math.max(meiaAltura, Math.abs(dot(d, cima)));
  }
  meiaLargura = Math.max(meiaLargura, 1e-3) * (1 + MARGEM); meiaAltura = Math.max(meiaAltura, 1e-3) * (1 + MARGEM);
  return { vista, centro, direcao, acima, meiaLargura, meiaAltura, caixa: { min, max } };
}

/* Roda na página: converte a câmera do espaço da receita para o do estúdio pela transformação que a bancada deu à peça, aplica,
   e devolve onde o centro e o quadro dos cantos da caixa comum caem na tela, de -1 a 1. */
function aplicarCameraNaPagina(cam) {
  const amb = window.__mecanificaBancada.ambiente();
  let raiz = null;
  for (const filho of amb.scene.children) {
    let tem = false;
    filho.traverse((o) => { if (Array.isArray(o.userData?.faces)) tem = true; });
    if (tem) { raiz = filho; break; }
  }
  if (!raiz) return { erro: 'a página não tem a peça na cena' };
  raiz.updateMatrixWorld(true);
  const V3 = amb.camera.position.constructor;
  const noEstudio = (p) => raiz.localToWorld(new V3(p[0], p[1], p[2]));
  const escala = new V3(); raiz.getWorldScale(escala);
  const c = noEstudio(cam.centro);
  amb.olharComoReferencia({ centro: [c.x, c.y, c.z], direcao: cam.direcao, acima: cam.acima, meiaAltura: cam.meiaAltura * escala.x, meiaLargura: cam.meiaLargura * escala.x, vista: cam.vista, instantaneo: true });
  amb.camera.updateMatrixWorld(true);
  const naTela = (p) => { const q = noEstudio(p).project(amb.camera); return [Number(q.x.toFixed(5)), Number(q.y.toFixed(5))]; };
  /* o quadro dos oito cantos da caixa comum na tela: [x mínimo, y mínimo, x máximo, y máximo] */
  const cantos = [];
  for (const x of [cam.caixa.min[0], cam.caixa.max[0]]) for (const y of [cam.caixa.min[1], cam.caixa.max[1]]) for (const z of [cam.caixa.min[2], cam.caixa.max[2]]) cantos.push(naTela([x, y, z]));
  const quadro = [Math.min(...cantos.map((c) => c[0])), Math.min(...cantos.map((c) => c[1])), Math.max(...cantos.map((c) => c[0])), Math.max(...cantos.map((c) => c[1]))];
  return { escala: escala.x, centro: naTela(cam.centro), quadro };
}

const esperarQuadros = (n) => new Promise((ok) => { const passo = (k) => (k <= 0 ? ok(true) : requestAnimationFrame(() => passo(k - 1))); passo(n); });

const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/**
 * Captura cada painel na bancada com a mesma câmera e junta as capturas numa imagem, lado a lado.
 * @param {object} o
 * @param {Array<{titulo, nota, receita, neutro}>} o.paineis
 * @param {string} o.vista   a vista da bancada
 * @param {string} o.saida   o PNG a gravar
 * @param {string} o.titulo  a linha de cima da imagem
 * @returns {Promise<{ saida, camera, telas: Array, largura, altura }>}
 */
export async function capturarLadoALado({ paineis, vista, saida, titulo, largura = 640, cores = true, rodape = '', logger = () => {} }) {
  if (!paineis.length) throw new Error('nada a capturar');
  const camera = cameraComum(paineis.map((p) => p.neutro), vista);
  const W = Math.max(320, Math.round(largura / 2) * 2);
  const H = Math.min(1400, Math.max(320, Math.round((W * camera.meiaAltura) / camera.meiaLargura / 2) * 2));
  mkdirSync(SESSOES, { recursive: true });
  const arquivos = paineis.map((p, i) => join(SESSOES, `esboco-nucleo-${process.pid}-${i + 1}.json`));
  paineis.forEach((p, i) => {
    const payload = {
      status: 'conectado',
      alvo: { id: `esboco-nucleo-${i + 1}`, tipo: 'peca', nome: p.titulo, perfil: 'jogo', versao: '1.0.0', atualizadoEm: '2026-11-05T00:00:00.000Z' },
      intencaoIA: { titulo: p.titulo, resumo: 'opção do esboço 2.0, montada em memória', checklist: [] },
      referencias: { pranchas: [], imagens: [], criterios: [] },
      receita: p.receita,
    };
    writeFileSync(arquivos[i], JSON.stringify(payload), 'utf8');
  });
  const captura = await abrirCapturaCompartilhada({ logger: null });
  const telas = []; const imagens = [];
  try {
    const page = await captura.browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: FATOR_DE_AMOSTRAGEM });
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    for (const [i, p] of paineis.entries()) {
      const params = new URLSearchParams({ sessao: relative(REPO, arquivos[i]).replaceAll('\\', '/'), projecao: 'ortografica', vista });
      await page.goto(`${captura.base}?${params}`, { waitUntil: 'load', timeout: PRAZO_DE_CARGA_MS });
      await page.waitForFunction(() => { const b = window.__mecanificaBancada; if (b?.erro) throw new Error(String(b.erro)); return b?.carregado === true; }, undefined, { timeout: PRAZO_DE_CARGA_MS });
      await page.evaluate((c) => window.__mecanificaBancada.auditoria({ cores: c }), cores);
      await page.evaluate(esperarQuadros, 3);
      const tela = await page.evaluate(aplicarCameraNaPagina, camera);
      if (tela.erro) throw new Error(`${p.titulo}: ${tela.erro}`);
      await page.evaluate(esperarQuadros, 4);
      const dados = reduzirPorMedia(await page.screenshot({ type: 'png' }));
      imagens.push(dados);
      telas.push({ titulo: p.titulo, ...tela });
      logger(`${p.titulo}: a caixa comum na tela tem o centro em ${tela.centro.join(', ')} e o quadro ${tela.quadro.join(', ')} (de -1 a 1)`);
    }
    if (erros.length) throw new Error(`a página da bancada emitiu erro: ${erros[0]}`);
    await page.close();
    const colunas = paineis.map((p, i) => `<div class="p"><img src="data:image/png;base64,${imagens[i].toString('base64')}" width="${W}" height="${H}"><div class="t">${esc(p.titulo)}</div><div class="n">${esc(p.nota)}</div></div>`).join('');
    const html = `<html><head><meta charset="utf-8"></head><body style="margin:0;background:#f4f2ee;font-family:sans-serif;color:#222"><div style="padding:10px 14px;font-size:20px"><b>${esc(titulo)}</b></div><div style="display:grid;grid-template-columns:repeat(${paineis.length},${W}px);gap:10px;padding:0 14px">${colunas}</div><div style="padding:8px 14px 12px;font-size:13px;color:#555">${esc(rodape)}</div><style>.p{background:#fff;border:1px solid #ddd}.p img{display:block}.t{font-size:17px;font-weight:bold;padding:8px 10px 2px}.n{font-size:14px;padding:0 10px 10px;line-height:1.35}</style></body></html>`;
    const folha = await captura.browser.newPage({ viewport: { width: paineis.length * (W + 10) + 18, height: H + 200 } });
    await folha.setContent(html);
    mkdirSync(dirname(saida), { recursive: true });
    await folha.screenshot({ path: saida, fullPage: true });
    await folha.close();
  } finally {
    await captura.fechar();
    for (const a of arquivos) rmSync(a, { force: true });
  }
  const png = PNG.sync.read(readFileSync(saida));
  return { saida, camera, telas, largura: png.width, altura: png.height, quadro: [W, H] };
}

/** A maior diferença, em coordenada de tela (de -1 a 1), entre onde o centro e o quadro da caixa comum caíram nas capturas. */
export function diferencaDeCamera(telas) {
  let maior = 0;
  for (const t of telas) {
    for (const e of [0, 1]) maior = Math.max(maior, Math.abs(t.centro[e] - telas[0].centro[e]));
    for (const e of [0, 1, 2, 3]) maior = Math.max(maior, Math.abs(t.quadro[e] - telas[0].quadro[e]));
  }
  return maior;
}

const caixaMm = (neutro) => { const c = caixaDaMalha(neutro); return c.min.map((m, k) => `${'xyz'[k]} ${(m * 1000).toFixed(1)}..${(c.max[k] * 1000).toFixed(1)}`).join(', '); };

async function principal(argv) {
  if (argv.includes('--ajuda') || !argv.length) { process.stdout.write(AJUDA); return argv.length ? 0 : 2; }
  const COM_VALOR = ['--vista', '--saida', '--largura'];
  const valor = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
  const arquivo = argv.find((a, i) => !a.startsWith('--') && !COM_VALOR.includes(argv[i - 1]));
  if (!arquivo || !existsSync(arquivo)) { console.error(`esboco:nucleo: arquivo ${arquivo ?? '(nenhum)'} não existe\n\n${AJUDA}`); return 2; }
  const nome = basename(arquivo).replace(/\..*$/, '');
  const esboco = await lerArquivoDeEsboco(arquivo);
  const r = montarOpcoes(esboco, { nome });
  console.log(`${arquivo}: esboço ${r.formato === 'antigo' ? 'antigo, traduzido pelo leitor' : 'do 2.0'}`);
  if (r.recusas.length) {
    console.error(`RECUSADO: ${r.recusas.length} recusa(s)`);
    for (const q of r.recusas) console.error(`  ${[q.opcao, q.forma].filter(Boolean).join(', ') || 'esboço'}: ${q.motivo}`);
    return 1;
  }
  for (const p of r.paineis) console.log(`  ${p.titulo}: ${p.partes.length} partes (${p.partes.join(', ')}), ${p.neutro.F.size} faces, ${p.facesSemParte} sem parte; ${caixaMm(p.neutro)} mm; neutro ${hashDoNeutro(p.neutro).slice(0, 16)}`);
  if (argv.includes('--so-montar')) return 0;
  const vista = valor('--vista') ?? r.vista ?? 'isometrica';
  const saida = resolve(valor('--saida') ?? join(REPO, 'tools/bancadas/out', `esboco-nucleo-${nome}.png`));
  const res = await capturarLadoALado({
    paineis: r.paineis, vista, saida, titulo: `${nome}: ${r.paineis.length} opções pelo núcleo`, largura: Number(valor('--largura') ?? 640), cores: !argv.includes('--sem-cores'),
    rodape: `Mesma câmera em todas: vista ${vista}, ortográfica, centrada na caixa que junta as opções. Cada opção é uma receita do núcleo capturada na bancada (npm run esboco:nucleo).`,
    logger: (t) => console.log(`  ${t}`),
  });
  console.log(`mesma câmera: a caixa comum difere no máximo ${diferencaDeCamera(res.telas).toExponential(2)} do quadro entre as capturas`);
  console.log(`imagem: ${res.saida} (${res.largura}x${res.altura})`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal(process.argv.slice(2)).then((codigo) => { process.exitCode = codigo; }, (e) => { console.error(`esboco:nucleo: ${e.message}`); process.exitCode = 2; });
}
