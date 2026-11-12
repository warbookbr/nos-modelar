#!/usr/bin/env node
/* esboco-nucleo.mjs — o esboço 2.0: as opções de forma de um esboço saem das operações do núcleo, cada uma montada como receita em
 * memória e capturada na bancada com a mesma câmera, lado a lado numa imagem só com o título e a nota de cada uma.
 *
 * Uso: npm run esboco:nucleo -- <arquivo> [--vista <v> | --vistas <v1,v2,...>] [--saida <png>] [--largura <px>] [--sem-cores]
 *      [--rotulos | --sem-rotulos] [--estrito] [--perto <mm>] [--so-montar]
 *
 * O arquivo é um `.esboco.json` de opções de forma (o antigo, que o leitor de `modulos/esboco-nucleo/src/ler-esboco.js` traduz sem
 * reescrita, ou o do 2.0, em mm) ou um módulo `.mjs`/`.js` cujo `default` é o esboço do 2.0, para a opção que precisa de código (a
 * chapa da gaiola, o contorno de um vão). Cada opção vira receita por `receitaDaOpcao` (`modulos/esboco-nucleo/src/opcao.js`),
 * executada pelo executor; o que o leitor ou o núcleo recusam sai com o motivo, e nada é desenhado de outro jeito.
 *
 * O RELATO DE CONTATOS. A cada rodada, para cada opção, sai em texto quem encosta, quem atravessa e com quanto, e a folga entre as
 * formas que ficam perto (`relatoDeContatos` de `modulos/esboco-nucleo/src/contatos.js`, a medida do `descrever` sobre o neutro
 * da opção), com o que cada forma declarou esperar. Com `--estrito` o comando sai com erro, antes da captura, quando há travessia
 * não declarada, relação declarada que a malha não dá ou par de partes Dir e Esq (imagem uma da outra) que mede diferente: o relato
 * lista o último como ASSIMÉTRICO, com os dois vereditos.
 *
 * A MESMA CÂMERA. A bancada encaixa cada peça no estúdio na escala dela, e a câmera automática enquadra cada uma por conta própria;
 * duas opções de tamanhos diferentes sairiam em escalas diferentes. Aqui a câmera é uma só por vista, ortográfica, na direção da
 * vista, centrada no centro da caixa que junta as malhas de todas as opções e com o quadro dessa caixa vista da câmera, mais 8% de
 * margem. Em cada opção a página converte essa câmera do espaço da receita para o do estúdio pela transformação que a bancada deu
 * à peça (`olharComoReferencia` da ponte), e devolve onde o centro e o quadro dos oito cantos da caixa comum caíram na tela: os
 * números saem no relato, e iguais em todas as opções provam a mesma câmera. As vistas são as da bancada (isometrica, frontal,
 * traseira, direita, esquerda, superior, inferior); a padrão é a do esboço. Com `--vistas`, cada opção sai numa linha com um painel
 * por vista, e o nome da vista em cada painel.
 *
 * OS RÓTULOS. Com `rotulos: true` na raiz do esboço, ou `--rotulos`, cada forma do atalho ganha um número sobre o centro da caixa
 * dela na imagem, e a legenda dos números sai embaixo da opção.
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
import { PERTO_MM, relatoDeContatos, textoDoRelato } from '../../modulos/esboco-nucleo/src/contatos.js';
import { configuracaoViteDaRaiz } from './resolucao-da-raiz.mjs';
import { abrirCapturaCompartilhada, PRAZO_DE_CARGA_MS } from './olhar-bancada.mjs';
import { FATOR_DE_AMOSTRAGEM, reduzirPorMedia } from './capturar-montagem.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
/* Na cópia isolada sem `node_modules`, o servidor da captura e o Playwright acham os pacotes na raiz do repositório principal (`resolucao-da-raiz.mjs`). */
const DEPENDENCIAS_DA_CAPTURA = {
  carregarPlaywright: async () => (await import('playwright')).default,
  createServer: async (config) => {
    const extra = configuracaoViteDaRaiz(REPO);
    return (await import('vite')).createServer({ ...config, plugins: extra.plugins, server: { ...config.server, ...extra.server } });
  },
};
const SESSOES = join(REPO, 'tools/bancadas/out/sessoes');
const MARGEM = 0.08;

/** O exemplo da ajuda: o 2.0 com a extrusão de contorno por spline, o encosta, o alinha e o giro com pivô (o teste o monta). */
export const EXEMPLO = `  { "opcoes": [{ "titulo": "cabeça a 12 graus", "formas": [
    { "id": "corpo", "op": "extrusao", "rotacao": [180, 0, 0], "args": { "eixo": "z", "altura": 45, "perfil": { "contorno": {
        "inicio": [30, 330], "trechos": [{ "spline": [[120, 448], [170, 330], [168, 120], [0, 0], [-168, 120],
        [-170, 330], [-122, 470], [-30, 330]] }] } } } },
    { "id": "braco", "op": "cubo", "args": { "larg": 52, "alt": 650, "prof": 24 },
      "encosta": { "id": "corpo", "lado": "+y" }, "alinha": { "+z": "corpo" } },
    { "id": "cabeca", "op": "cubo", "args": { "larg": 70, "alt": 180, "prof": 15 },
      "encosta": { "id": "braco", "lado": "+y" }, "alinha": { "+z": "braco" },
      "rotacao": { "eixo": "x", "graus": -12, "pivo": "cabeca.-y-z" } } ] }] }`;

export const AJUDA = `npm run esboco:nucleo -- <arquivo> [opções]  (node tools/modelar/esboco-nucleo.mjs)
O esboço 2.0: cada opção de forma é uma receita do núcleo, montada em memória e capturada na bancada com a mesma câmera, e as
opções saem lado a lado numa imagem só. A cada rodada sai o relato de contatos de cada opção.

O arquivo é o .esboco.json do 2.0, em mm (ou o antigo, que abre sem reescrita), ou um módulo .mjs cujo default é o esboço.
Cada opção tem "formas" (o atalho), e pode ter "passos" crus do núcleo e "topo" (pontos nomeados), tudo em mm. Uma forma é
{ id, op, args } de um gerador do catálogo (cubo, chamferBox, cilindro, extrusao, lathe, loft, ...) ou { id, ajudante, args } de
uma gaiola, e a posição sai da malha das outras, sem conta:
  centro: [x, y, z] | "corpo.+z" (com "por": "-z", a âncora da própria forma que vai ao ponto)
  sobre: "corpo"                   a base no topo da caixa do corpo
  ponta: { id, lado }              encostada na face da caixa
  encosta: { id, lado }            levada pelo eixo do lado até a malha tocar a da outra
  alinha: { "+z": "corpo" }        a face +z rente à face +z do corpo ("corpo.-z" cita outra face; x, y, z centram)
  desloca: [dx, dy, dz]            soma no fim (com encosta, no eixo do toque é folga)
  rotacao: [rx, ry, rz] | { eixo, graus, pivo: "braco.+y-z" }   sem pivô gira no centro, antes da posição
  repete: { total, d } | { total, eixo, graus|volta, pivo }    o arranja do núcleo
  espelha: "x" | { eixo, pos | em: "corpo" }                     o espelha do núcleo
  contato: { "corpo": "atravessa" }  a relação esperada ("encosta", "atravessa", "folga"); o encosta declara a dele
Na opção, "contatos": [{ "par": ["capo", "tampa"], "relacao": "atravessa", "motivo": "..." }] declara o de qualquer par de
partes, as dos passos crus inclusive, e o motivo sai no relato.
A âncora é "centro" ou lados de eixos distintos ("+y", "+y-z", "-x+y+z") da caixa da forma. Exemplo, a cabeça de uma guitarra
girando 12 graus para trás na junta com o braço, sobre um corpo de contorno por spline (no eixo z o perfil [u, v] vai a (x, -y),
e o giro de 180 graus em x o põe como desenhado):
${EXEMPLO}

  --vista <v>        isometrica, frontal, traseira, direita, esquerda, superior ou inferior (padrão: a do esboço)
  --vistas <v1,v2>   um painel por vista, cada opção numa linha (por exemplo isometrica,direita,frontal)
  --rotulos          um número sobre cada forma e a legenda embaixo da opção (ou "rotulos": true no esboço); --sem-rotulos tira
  --estrito          sai com erro, antes da captura, se houver travessia não declarada, contato declarado que não se dá ou par Dir/Esq que mede diferente
  --perto <mm>       até que folga o relato lista o par (padrão ${PERTO_MM})
  --saida <png>      onde gravar a imagem (padrão: tools/bancadas/out/esboco-nucleo-<nome>.png)
  --largura <px>     a largura de cada painel na imagem (padrão 640, ou 420 com --vistas)
  --sem-cores        a cor dos materiais, em vez de uma cor por parte; vale sozinho quando alguma forma declara cor
  --so-montar        monta, confere e imprime os números e o relato, e não abre a bancada
  --ajuda            esta mensagem

Imprime, por opção, as partes, as faces, a caixa da malha em mm, o hash do neutroCanonico e o relato de contatos, e a posição
da caixa comum na tela de cada captura (a mesma câmera). Precisa do Chromium do Playwright.
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

/**
 * Monta as receitas das opções, com o relato de contatos de cada uma. Devolve `{ vista, paineis, recusas }`; com recusa, `paineis` fica vazio.
 * Com `relato: false` o relato de contatos não é calculado e o campo `contatos` de cada painel sai `null`; o resto do painel sai
 * idêntico. Serve às ferramentas que só usam a receita e o neutro, porque o relato é a parte mais cara da montagem.
 */
export function montarOpcoes(esboco, { nome = 'esboco', perto = PERTO_MM, relato = true } = {}) {
  const lido = lerEsboco(esboco);
  if (lido.recusas.length) return { vista: lido.vista, paineis: [], recusas: lido.recusas, formato: lido.formato };
  const paineis = []; const recusas = [];
  lido.opcoes.forEach((o, i) => {
    try {
      const r = receitaDaOpcao(o, { nome: `${nome}-${i + 1}` });
      const contatos = relato === false ? null : relatoDeContatos(r.neutro, r.formas.filter((f) => !f.oculto), { perto, contatos: r.contatos });
      paineis.push({ titulo: o.titulo ?? `opção ${i + 1}`, nota: o.nota ?? '', receita: r.receita, neutro: r.neutro, partes: r.partes, facesSemParte: r.facesSemParte, formas: r.formas, contatos, contatosDeclarados: r.contatos, apoiaDeclarada: r.apoia });
    } catch (e) {
      if (!(e instanceof RecusaDoEsboco)) throw e;
      recusas.push({ opcao: o.titulo ?? `opção ${i + 1}`, forma: null, motivo: e.message });
    }
  });
  return { vista: lido.vista, rotulos: esboco?.rotulos === true, paineis: recusas.length ? [] : paineis, recusas, formato: lido.formato, conferencias: lido.conferencias };
}

/** Os números das formas visíveis de um painel, na ordem do esboço: `{ n, texto, ponto }`, com o ponto em metro, no espaço da receita. */
export function rotulosDoPainel(painel) {
  return (painel.formas ?? []).filter((f) => !f.oculto).map((f, i) => ({ n: i + 1, texto: f.rotulo ?? f.id, ponto: f.caixa.centro.map((x) => x / 1000) }));
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
   e devolve onde o centro e o quadro dos cantos da caixa comum caem na tela, de -1 a 1, e onde caem os `pontos` pedidos. */
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
  return { escala: escala.x, centro: naTela(cam.centro), quadro, pontos: (cam.pontos ?? []).map(naTela) };
}

const esperarQuadros = (n) => new Promise((ok) => { const passo = (k) => (k <= 0 ? ok(true) : requestAnimationFrame(() => passo(k - 1))); passo(n); });

const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/* uma captura com os números das formas por cima, na posição que a página devolveu */
function imagemComRotulos(png, W, H, rotulos, pontos) {
  const marcas = (rotulos ?? []).map((r, i) => {
    const [x, y] = pontos[i];
    return `<span class="r" style="left:${((x + 1) / 2) * W}px;top:${((1 - y) / 2) * H}px">${r.n}</span>`;
  }).join('');
  return `<div class="i" style="width:${W}px;height:${H}px"><img src="data:image/png;base64,${png.toString('base64')}" width="${W}" height="${H}">${marcas}</div>`;
}
const legenda = (rotulos) => (rotulos?.length ? `<div class="l">${rotulos.map((r) => `<b>${r.n}</b> ${esc(r.texto)}`).join(' &nbsp; ')}</div>` : '');
const ESTILO = '.p{background:#fff;border:1px solid #ddd}.i{position:relative}.i img{display:block}.r{position:absolute;transform:translate(-50%,-50%);min-width:18px;height:18px;padding:0 3px;border-radius:10px;background:#fff;border:2px solid #222;font:bold 12px/18px sans-serif;text-align:center;color:#222}.t{font-size:17px;font-weight:bold;padding:8px 10px 2px}.n{font-size:14px;padding:0 10px 6px;line-height:1.35}.l{font-size:13px;padding:0 10px 10px;color:#333}.v{font-size:13px;padding:6px 10px;color:#555;border-top:1px solid #eee}';

/**
 * Captura cada painel na bancada com a mesma câmera por vista e junta as capturas numa imagem.
 * @param {object} o
 * @param {Array<{titulo, nota, receita, neutro, rotulos?}>} o.paineis   `rotulos`: [{ n, texto, ponto }], ponto em metro
 * @param {string} [o.vista]     a vista da bancada (uma)
 * @param {string[]} [o.vistas]  várias vistas: cada painel sai numa linha, com uma captura por vista
 * @param {string} o.saida       o PNG a gravar
 * @param {string} o.titulo      a linha de cima da imagem
 * @returns {Promise<{ saida, cameras, telas: Array, largura, altura }>}
 */
export async function capturarLadoALado({ paineis, vista, vistas = null, saida, titulo, largura = null, cores = true, rodape = '', logger = () => {} }) {
  if (!paineis.length) throw new Error('nada a capturar');
  const lista = vistas?.length ? vistas : [vista];
  const grade = lista.length > 1;
  const cameras = lista.map((v) => cameraComum(paineis.map((p) => p.neutro), v));
  const W = Math.max(320, Math.round((largura ?? (grade ? 420 : 640)) / 2) * 2);
  const H = Math.min(1400, Math.max(320, Math.max(...cameras.map((c) => Math.round((W * c.meiaAltura) / c.meiaLargura / 2) * 2))));
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
  const captura = await abrirCapturaCompartilhada({ logger: null, dependencias: DEPENDENCIAS_DA_CAPTURA });
  const telas = []; const blocos = [];
  try {
    const page = await captura.browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: FATOR_DE_AMOSTRAGEM });
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    for (const [i, p] of paineis.entries()) {
      const params = new URLSearchParams({ sessao: relative(REPO, arquivos[i]).replaceAll('\\', '/'), projecao: 'ortografica', vista: lista[0] });
      await page.goto(`${captura.base}?${params}`, { waitUntil: 'load', timeout: PRAZO_DE_CARGA_MS });
      await page.waitForFunction(() => { const b = window.__mecanificaBancada; if (b?.erro) throw new Error(String(b.erro)); return b?.carregado === true; }, undefined, { timeout: PRAZO_DE_CARGA_MS });
      await page.evaluate((c) => window.__mecanificaBancada.auditoria({ cores: c }), cores);
      await page.evaluate(esperarQuadros, 3);
      const imagens = [];
      for (const camera of cameras) {
        const tela = await page.evaluate(aplicarCameraNaPagina, { ...camera, pontos: (p.rotulos ?? []).map((r) => r.ponto) });
        if (tela.erro) throw new Error(`${p.titulo}: ${tela.erro}`);
        await page.evaluate(esperarQuadros, 4);
        imagens.push({ vista: camera.vista, html: imagemComRotulos(reduzirPorMedia(await page.screenshot({ type: 'png' })), W, H, p.rotulos, tela.pontos) });
        telas.push({ titulo: p.titulo, vista: camera.vista, centro: tela.centro, quadro: tela.quadro, escala: tela.escala });
        logger(`${p.titulo}${grade ? `, vista ${camera.vista}` : ''}: a caixa comum na tela tem o centro em ${tela.centro.join(', ')} e o quadro ${tela.quadro.join(', ')} (de -1 a 1)`);
      }
      blocos.push({ p, imagens });
    }
    if (erros.length) throw new Error(`a página da bancada emitiu erro: ${erros[0]}`);
    await page.close();
    const texto = (p) => `<div class="t">${esc(p.titulo)}</div><div class="n">${esc(p.nota)}</div>${legenda(p.rotulos)}`;
    const corpo = grade
      ? blocos.map(({ p, imagens }) => `<div class="p" style="margin-bottom:10px"><div style="display:grid;grid-template-columns:repeat(${imagens.length},${W}px);gap:6px">${imagens.map((im) => `<div>${im.html}<div class="v">vista ${esc(VISTAS_BANCADA[im.vista].nome.toLowerCase())}</div></div>`).join('')}</div>${texto(p)}</div>`).join('')
      : `<div style="display:grid;grid-template-columns:repeat(${paineis.length},${W}px);gap:10px">${blocos.map(({ p, imagens }) => `<div class="p">${imagens[0].html}${texto(p)}</div>`).join('')}</div>`;
    const html = `<html><head><meta charset="utf-8"></head><body style="margin:0;background:#f4f2ee;font-family:sans-serif;color:#222"><div style="padding:10px 14px;font-size:20px"><b>${esc(titulo)}</b></div><div style="padding:0 14px">${corpo}</div><div style="padding:8px 14px 12px;font-size:13px;color:#555">${esc(rodape)}</div><style>${ESTILO}</style></body></html>`;
    const colunas = grade ? lista.length : paineis.length;
    const folha = await captura.browser.newPage({ viewport: { width: colunas * (W + 10) + 30, height: H + 200 } });
    await folha.setContent(html);
    mkdirSync(dirname(saida), { recursive: true });
    await folha.screenshot({ path: saida, fullPage: true });
    await folha.close();
  } finally {
    await captura.fechar();
    for (const a of arquivos) rmSync(a, { force: true });
  }
  const png = PNG.sync.read(readFileSync(saida));
  return { saida, camera: cameras[0], cameras, telas, largura: png.width, altura: png.height, quadro: [W, H] };
}

/** A maior diferença, em coordenada de tela (de -1 a 1), entre onde o centro e o quadro da caixa comum caíram nas capturas de uma mesma vista. */
export function diferencaDeCamera(telas) {
  let maior = 0;
  const primeira = new Map();
  for (const t of telas) {
    const p = primeira.get(t.vista ?? '') ?? t;
    primeira.set(t.vista ?? '', p);
    for (const e of [0, 1]) maior = Math.max(maior, Math.abs(t.centro[e] - p.centro[e]));
    for (const e of [0, 1, 2, 3]) maior = Math.max(maior, Math.abs(t.quadro[e] - p.quadro[e]));
  }
  return maior;
}

const caixaMm = (neutro) => { const c = caixaDaMalha(neutro); return c.min.map((m, k) => `${'xyz'[k]} ${(m * 1000).toFixed(1)}..${(c.max[k] * 1000).toFixed(1)}`).join(', '); };

async function principal(argv) {
  if (argv.includes('--ajuda') || !argv.length) { process.stdout.write(AJUDA); return argv.length ? 0 : 2; }
  const COM_VALOR = ['--vista', '--vistas', '--saida', '--largura', '--perto'];
  const valor = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
  const arquivo = argv.find((a, i) => !a.startsWith('--') && !COM_VALOR.includes(argv[i - 1]));
  if (!arquivo || !existsSync(arquivo)) { console.error(`esboco:nucleo: arquivo ${arquivo ?? '(nenhum)'} não existe\n\n${AJUDA}`); return 2; }
  const perto = valor('--perto') === null ? PERTO_MM : Number(valor('--perto'));
  if (!(perto >= 0)) { console.error('esboco:nucleo: --perto é uma distância em mm'); return 2; }
  const vistas = valor('--vistas')?.split(',').map((v) => v.trim()).filter(Boolean) ?? null;
  for (const v of [...(vistas ?? []), valor('--vista')].filter(Boolean)) if (!VISTAS_BANCADA[v]) { console.error(`esboco:nucleo: vista "${v}" não existe (${Object.keys(VISTAS_BANCADA).join(', ')})`); return 2; }
  const nome = basename(arquivo).replace(/\..*$/, '');
  const esboco = await lerArquivoDeEsboco(arquivo);
  const r = montarOpcoes(esboco, { nome, perto });
  console.log(`${arquivo}: esboço ${r.formato === 'antigo' ? 'antigo, traduzido pelo leitor' : 'do 2.0'}`);
  if (r.recusas.length) {
    console.error(`RECUSADO: ${r.recusas.length} recusa(s)`);
    for (const q of r.recusas) console.error(`  ${[q.opcao, q.forma].filter(Boolean).join(', ') || 'esboço'}: ${q.motivo}`);
    return 1;
  }
  let problemas = 0;
  for (const p of r.paineis) {
    console.log(`  ${p.titulo}: ${p.partes.length} partes (${p.partes.join(', ')}), ${p.neutro.F.size} faces, ${p.facesSemParte} sem parte; ${caixaMm(p.neutro)} mm; neutro ${hashDoNeutro(p.neutro).slice(0, 16)}`);
    console.log(`  contatos de "${p.titulo}" (a medida do descrever, tolerância de ${String(p.contatos.tolerancia * 1000).replace(".", ",")} mm):`);
    console.log(textoDoRelato(p.contatos));
    problemas += p.contatos.naoDeclaradas.length + p.contatos.faltam.length + (p.contatos.assimetricas?.length ?? 0);
  }
  if (argv.includes('--estrito') && problemas) {
    console.error(`RECUSADO pelo modo estrito: ${problemas} travessia(s) não declarada(s), contato(s) esperado(s) que a malha não dá ou par(es) Dir/Esq que medem diferente`);
    return 1;
  }
  if (argv.includes('--so-montar')) return 0;
  const rotulos = argv.includes('--sem-rotulos') ? false : argv.includes('--rotulos') || r.rotulos;
  const paineis = r.paineis.map((p) => ({ ...p, rotulos: rotulos ? rotulosDoPainel(p) : null }));
  const vista = valor('--vista') ?? r.vista ?? 'isometrica';
  const saida = resolve(valor('--saida') ?? join(REPO, 'tools/bancadas/out', `esboco-nucleo-${nome}.png`));
  const res = await capturarLadoALado({
    paineis, vista, vistas, saida, titulo: `${nome}: ${paineis.length} opções pelo núcleo`, largura: valor('--largura') === null ? null : Number(valor('--largura')), cores: !argv.includes('--sem-cores') && !r.paineis.some((p) => (p.formas ?? []).some((f) => f.cor)),
    rodape: `Mesma câmera em todas as opções${vistas ? ', vista a vista' : `: vista ${vista}`}, ortográfica, centrada na caixa que junta as opções. Cada opção é uma receita do núcleo capturada na bancada (npm run esboco:nucleo).`,
    logger: (t) => console.log(`  ${t}`),
  });
  console.log(`mesma câmera: a caixa comum difere no máximo ${diferencaDeCamera(res.telas).toExponential(2)} do quadro entre as capturas${vistas ? ' de cada vista' : ''}`);
  console.log(`imagem: ${res.saida} (${res.largura}x${res.altura})`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal(process.argv.slice(2)).then((codigo) => { process.exitCode = codigo; }, (e) => { console.error(`esboco:nucleo: ${e.message}`); process.exitCode = 2; });
}
