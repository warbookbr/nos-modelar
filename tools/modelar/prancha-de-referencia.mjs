#!/usr/bin/env node
/* prancha-de-referencia.mjs — a prancha modelo e foto: a vista da peça (ou de uma parte isolada) ao lado da foto de referência, as
 * duas na mesma escala em mm, com um comando.
 *
 * POR QUE EXISTE. Na sessão da bicicleta (plano de comparar com a referência, 2026-11-16) a prancha era refeita à mão a cada rodada:
 * 163 scripts de imagem recortando, escalando e colando, e foi neles que entraram a régua da foto frontal errada, o contorno do selim
 * invertido e a escala diferente entre as metades de uma prancha do pedal. Aqui a escala de cada metade é medida, e não estimada: a do
 * modelo vem da câmera ortográfica da bancada (três pontos em mm projetados no quadro da vista), e a da foto vem da régua declarada,
 * uma medida conhecida da foto em px e em mm.
 *
 * COMO. A bancada captura a vista em memória, em projeção ortográfica, com a parte isolada e enquadrada (`--parte`) ou com a peça
 * enquadrada inteira. A prancha é montada no Chromium sem WebGL, que lê jpg, webp e png sem conversão (decisão da fatia 1, com a medida
 * no README da pasta do plano no banco de provas): a página decodifica as imagens, mede a extensão do que não é fundo e desenha o
 * plano que `disporPrancha` monta em Node; só o PNG volta, em base64. Toda a geometria da prancha (escala comum, recortes, réguas,
 * rótulos) é das funções puras deste módulo, testadas sem navegador.
 *
 * O QUE NÃO FAZ, de propósito: medir a foto. A extensão que ela relata é a do que difere do fundo dentro da região pedida, e serve à
 * leitura e ao enquadramento; a medição livre na foto (máscara por cor, varredura por linha, o trecho escolhido) continua por script,
 * e a régua e a região daqui são os parâmetros que ele pode reaproveitar.
 *
 * Uso: node tools/modelar/prancha-de-referencia.mjs <peça> --foto=<arquivo> --regua=<medida> [opções]; `--ajuda` lista as opções. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { verificarCaminhoConfinado } from './caminho-confinado.mjs';
import { iniciarRegistro } from './diario.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const OUT = join(REPO, 'tools/bancadas/out');
/* O tamanho da captura da vista. Com 1280 por 720 os dois pedais enquadrados saíam a 1,4 px/mm e a prancha os ampliava; com 1920 por
   1080 o selim sai a 3,5 px/mm e os pedais a 2, perto da escala comum que a prancha escolhe para eles. */
export const RESOLUCAO_DA_CAPTURA = '1920x1080';

/* As vistas em que a câmera ortográfica olha ao longo de um eixo: nelas a escala em px por mm é uma só no quadro inteiro. */
export const VISTAS_DA_PRANCHA = Object.freeze(['direita', 'esquerda', 'frontal', 'traseira', 'superior', 'inferior']);
export const DISPOSICOES = Object.freeze(['lado', 'sobreposto']);
/* Separa os valores de `--foto`, `--regua`, `--regiao` quando há mais de uma vista (a vírgula já é das coordenadas). */
export const SEPARADOR_POR_VISTA = ';';
/* Os pontos projetados para a escala do modelo: a origem e 100 mm em cada eixo do referencial da peça. */
const PASSO_DA_ESCALA_MM = 100;
export const PONTOS_DA_ESCALA = Object.freeze([[0, 0, 0], [PASSO_DA_ESCALA_MM, 0, 0], [0, PASSO_DA_ESCALA_MM, 0], [0, 0, PASSO_DA_ESCALA_MM]]);
/* A diferença, por canal de 0 a 255, a partir da qual um pixel deixa de ser fundo. O fundo da bancada sem interface é liso; o da foto
   de produto é quase branco, com ruído de compressão de poucos níveis (medido no jpg da bicicleta: até 9 por canal entre decodificadores). */
export const LIMIAR_DO_FUNDO = 24;
/* A folga em volta da extensão, em fração da maior dimensão dela, nos recortes por extensão. */
export const FOLGA_DA_EXTENSAO = 0.08;
/* A altura de desenho de cada linha da prancha e a largura máxima dela, em px; a escala comum é a maior que respeita as duas. */
export const ALTURA_DA_LINHA = 460;
export const LARGURA_MAXIMA = 2400;
const MARGEM = 24;
const ESPACO = 36;
const ALTURA_DO_TITULO = 30;
const ALTURA_DO_ROTULO = 40;
const ALTURA_DA_REGUA = 30;
const LARGURA_DA_REGUA = 46;
const COR_DO_MODELO = '#1f6fb2';
const COR_DA_FOTO = '#c4561b';

export class ErroDePrancha extends Error {}
const recusar = (mensagem) => { throw new ErroDePrancha(mensagem); };

/** `--regua`: uma medida da foto em px e em mm, como `<px>=<mm>` ou pelos dois pontos `x0,y0,x1,y1=<mm>`. */
export function lerRegua(texto) {
  const bruto = String(texto ?? '').trim();
  const casado = /^([^=]+)=([^=]+)$/.exec(bruto);
  const forma = 'escreva <px>=<mm> (ex.: 649=670) ou os dois pontos da medida na foto, x0,y0,x1,y1=<mm> (ex.: 1162,738,1811,738=670)';
  if (!casado) recusar(`--regua '${bruto}' não se lê: ${forma}.`);
  const mm = Number(casado[2]);
  if (!(mm > 0)) recusar(`--regua '${bruto}': a medida em mm precisa ser maior que zero; ${forma}.`);
  const numeros = casado[1].split(',').map((n) => Number(n.trim()));
  if (numeros.some((n) => !Number.isFinite(n))) recusar(`--regua '${bruto}': há número que não se lê; ${forma}.`);
  let px;
  let pontos = null;
  if (numeros.length === 1) px = numeros[0];
  else if (numeros.length === 4) { pontos = numeros; px = Math.hypot(numeros[2] - numeros[0], numeros[3] - numeros[1]); }
  else recusar(`--regua '${bruto}': veio ${numeros.length} número(s) antes do '='; ${forma}.`);
  if (!(px > 0)) recusar(`--regua '${bruto}': a medida em px precisa ser maior que zero; ${forma}.`);
  return { px, mm, pxPorMm: px / mm, ...(pontos ? { pontos } : {}) };
}

/** `--regiao`: a caixa em px da foto, `x0,y0,x1,y1` (dois cantos opostos), ou `auto` pela extensão do que não é fundo. */
export function lerRegiao(texto) {
  const bruto = String(texto ?? 'auto').trim();
  if (bruto === 'auto') return null;
  const numeros = bruto.split(',').map((n) => Number(n.trim()));
  if (numeros.length !== 4 || numeros.some((n) => !Number.isFinite(n))) {
    recusar(`--regiao '${bruto}' não se lê: escreva auto, ou x0,y0,x1,y1 em px da foto (dois cantos opostos, ex.: 560,110,860,240).`);
  }
  const [x0, x1] = [Math.round(Math.min(numeros[0], numeros[2])), Math.round(Math.max(numeros[0], numeros[2]))];
  const [y0, y1] = [Math.round(Math.min(numeros[1], numeros[3])), Math.round(Math.max(numeros[1], numeros[3]))];
  if (x1 - x0 < 2 || y1 - y0 < 2) recusar(`--regiao '${bruto}' tem ${x1 - x0} por ${y1 - y0} px; a caixa precisa de pelo menos 2 px de cada lado.`);
  return [x0, y0, x1, y1];
}

/** Um valor por vista: o texto separado por ';' com um item (vale para todas) ou um por vista, na ordem de `--vistas`. */
export function porVista(texto, vistas, nome) {
  if (texto === undefined || texto === null) return vistas.map(() => null);
  const itens = String(texto).split(SEPARADOR_POR_VISTA).map((s) => s.trim());
  if (itens.length === 1) return vistas.map(() => itens[0]);
  if (itens.length !== vistas.length) {
    recusar(`--${nome} tem ${itens.length} valores separados por '${SEPARADOR_POR_VISTA}' e --vistas tem ${vistas.length} (${vistas.join(', ')}); dê um valor só, que vale para todas, ou um por vista, na mesma ordem.`);
  }
  return itens;
}

/** As vistas da prancha: só as ortográficas de eixo, sem repetição. */
export function lerVistas(texto) {
  const vistas = String(texto ?? 'direita').split(',').map((s) => s.trim()).filter(Boolean);
  if (!vistas.length) recusar('--vistas veio vazia.');
  for (const v of vistas) {
    if (!VISTAS_DA_PRANCHA.includes(v)) recusar(`--vistas: '${v}' não serve à prancha; ela pede uma vista ortográfica de eixo, em que a escala é uma só no quadro: ${VISTAS_DA_PRANCHA.join(', ')}.`);
  }
  if (new Set(vistas).size !== vistas.length) recusar(`--vistas repete vista: ${vistas.join(', ')}.`);
  return vistas;
}

/**
 * A escala do modelo numa vista, em px da imagem gravada por mm do referencial da peça, pela projeção de `PONTOS_DA_ESCALA`
 * (`projecaoMm` da bancada, em px do quadro CSS) e pela largura da imagem gravada. Na vista ortográfica de eixo, dois dos três eixos
 * ficam no plano da imagem com o mesmo comprimento e o terceiro some; uma vista em que isso não vale é recusada.
 */
export function escalaDaVista(projecaoMm, larguraDaImagem) {
  if (!projecaoMm?.pixels || projecaoMm.pixels.length !== 4 || !projecaoMm.quadro) recusar('a bancada não devolveu a projeção dos pontos da escala nesta vista.');
  const fator = larguraDaImagem / projecaoMm.quadro[0];
  const [o, ...eixos] = projecaoMm.pixels;
  const comprimentos = eixos.map((p) => Math.hypot(p[0] - o[0], p[1] - o[1]) * fator / PASSO_DA_ESCALA_MM).sort((a, b) => a - b);
  const [menor, meio, maior] = comprimentos;
  if (!(maior > 0) || menor > maior * 0.02 || Math.abs(meio - maior) > maior * 0.02) {
    recusar(`a vista não é ortográfica de eixo: os três eixos projetam ${comprimentos.map((c) => c.toFixed(3)).join(', ')} px/mm, e a prancha pede dois iguais e um nulo.`);
  }
  return maior;
}

/* ---------- O que roda também na página (autossuficiente: vai como texto para o navegador) ---------- */

/** A cor do fundo de uma caixa da imagem RGBA: a mais comum na borda da caixa, quantizada em 16 níveis por canal e devolvida pela média do grupo. */
export function fundoDaCaixa(dados, largura, caixa) {
  const [x0, y0, x1, y1] = caixa;
  const grupos = new Map();
  const somar = (x, y) => {
    const i = (y * largura + x) * 4;
    const chave = ((dados[i] >> 4) << 8) | ((dados[i + 1] >> 4) << 4) | (dados[i + 2] >> 4);
    const g = grupos.get(chave) ?? { n: 0, r: 0, g: 0, b: 0 };
    g.n += 1; g.r += dados[i]; g.g += dados[i + 1]; g.b += dados[i + 2];
    grupos.set(chave, g);
  };
  for (let x = x0; x < x1; x++) { somar(x, y0); somar(x, y1 - 1); }
  for (let y = y0 + 1; y < y1 - 1; y++) { somar(x0, y); somar(x1 - 1, y); }
  let melhor = null;
  for (const [chave, g] of grupos) if (!melhor || g.n > melhor.n || (g.n === melhor.n && chave < melhor.chave)) melhor = { ...g, chave };
  return [Math.round(melhor.r / melhor.n), Math.round(melhor.g / melhor.n), Math.round(melhor.b / melhor.n)];
}

/** A extensão do que difere do fundo dentro da caixa, `[x0, y0, x1, y1]` em px (fim exclusivo), ou null se só há fundo. */
export function extensaoNaImagem(dados, largura, caixa, fundo, limiar) {
  const [cx0, cy0, cx1, cy1] = caixa;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (let y = cy0; y < cy1; y++) {
    for (let x = cx0; x < cx1; x++) {
      const i = (y * largura + x) * 4;
      if (dados[i + 3] === 0) continue;
      const d = Math.max(Math.abs(dados[i] - fundo[0]), Math.abs(dados[i + 1] - fundo[1]), Math.abs(dados[i + 2] - fundo[2]));
      if (d > limiar) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
  }
  return x1 < x0 ? null : [x0, y0, x1 + 1, y1 + 1];
}

/* Fase 1, na página: decodifica as imagens (guardadas em `window.__prancha` para a fase 2) e mede fundo e extensão de cada uma. */
async function carregarEMedirNaPagina({ modelos, fotos, limiar }) {
  const ler = async (url) => createImageBitmap(await (await fetch(url)).blob());
  const pixels = (bm) => {
    const c = new OffscreenCanvas(bm.width, bm.height);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(bm, 0, 0);
    return g.getImageData(0, 0, bm.width, bm.height).data;
  };
  const guardadas = { modelos: [], fotos: [] };
  const medir = async (url, regiao) => {
    const bm = await ler(url);
    const dados = pixels(bm);
    const inteira = [0, 0, bm.width, bm.height];
    const caixa = regiao ? [Math.max(0, regiao[0]), Math.max(0, regiao[1]), Math.min(bm.width, regiao[2]), Math.min(bm.height, regiao[3])] : inteira;
    const fora = !(caixa[2] - caixa[0] >= 2 && caixa[3] - caixa[1] >= 2);
    const fundo = fora ? null : window.fundoDaCaixa(dados, bm.width, caixa);
    const extensao = fora ? null : window.extensaoNaImagem(dados, bm.width, caixa, fundo, limiar);
    return { bm, medida: { largura: bm.width, altura: bm.height, fundo, extensao, fora } };
  };
  const resposta = { modelos: [], fotos: [] };
  for (const url of modelos) { const { bm, medida } = await medir(url, null); guardadas.modelos.push(bm); resposta.modelos.push(medida); }
  for (const { url, regiao } of fotos) { const { bm, medida } = await medir(url, regiao); guardadas.fotos.push(bm); resposta.fotos.push(medida); }
  window.__prancha = guardadas;
  return resposta;
}

/* Fase 2, na página: executa o plano de desenho de `disporPrancha` e devolve o PNG em base64. */
async function desenharNaPagina(plano) {
  const c = new OffscreenCanvas(plano.largura, plano.altura);
  const g = c.getContext('2d');
  g.fillStyle = plano.fundo;
  g.fillRect(0, 0, plano.largura, plano.altura);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  for (const op of plano.operacoes) {
    g.save();
    if (op.tipo === 'imagem') {
      const bm = window.__prancha[op.fonte][op.indice];
      g.globalAlpha = op.alfa ?? 1;
      g.beginPath();
      g.rect(op.destino[0], op.destino[1], op.destino[2], op.destino[3]);
      g.clip();
      const [sx, sy, sw, sh] = op.recorte;
      const [dx, dy, dw, dh] = op.destino;
      if (op.espelhar) { g.translate(dx + dw, dy); g.scale(-1, 1); g.drawImage(bm, sx, sy, sw, sh, 0, 0, dw, dh); }
      else g.drawImage(bm, sx, sy, sw, sh, dx, dy, dw, dh);
    } else if (op.tipo === 'retangulo') {
      if (op.preencher) { g.fillStyle = op.preencher; g.fillRect(...op.caixa); }
      if (op.cor) {
        g.strokeStyle = op.cor; g.lineWidth = op.espessura ?? 1;
        if (op.tracejado) g.setLineDash(op.tracejado);
        g.strokeRect(...op.caixa);
      }
    } else if (op.tipo === 'linha') {
      g.strokeStyle = op.cor; g.lineWidth = op.espessura ?? 1;
      g.beginPath(); g.moveTo(op.de[0], op.de[1]); g.lineTo(op.ate[0], op.ate[1]); g.stroke();
    } else if (op.tipo === 'texto') {
      g.fillStyle = op.cor ?? '#222';
      g.font = `${op.peso ?? 'normal'} ${op.tamanho ?? 14}px sans-serif`;
      g.textAlign = op.alinhar ?? 'left';
      g.textBaseline = op.base ?? 'alphabetic';
      g.fillText(op.texto, op.em[0], op.em[1]);
    }
    g.restore();
  }
  const blob = await c.convertToBlob({ type: 'image/png' });
  const u8 = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

/* ---------- O plano da prancha, em Node ---------- */

const mm1 = (v) => (Math.round(v * 10) / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const casa = (v, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

/** O recorte a mostrar: a caixa pedida, ou a extensão com folga, limitada à imagem. */
export function recorteComFolga(extensao, largura, altura, folga = FOLGA_DA_EXTENSAO) {
  const [x0, y0, x1, y1] = extensao;
  const f = Math.round(Math.max(x1 - x0, y1 - y0) * folga);
  return [Math.max(0, x0 - f), Math.max(0, y0 - f), Math.min(largura, x1 + f), Math.min(altura, y1 + f)];
}

/** O passo das marcas da régua, em mm: o menor da série 1-2-5 cujas marcas ficam a pelo menos `minimoPx` uma da outra. */
export function passoDaRegua(pxPorMm, minimoPx = 34) {
  for (let ordem = 1; ordem < 1e6; ordem *= 10) {
    for (const m of [1, 2, 5]) if (m * ordem * pxPorMm >= minimoPx) return m * ordem;
  }
  return 1e6;
}

/* As marcas de uma régua em mm ao longo de um lado do painel, com o zero no início da extensão. */
function reguaDoPainel(ops, { painel, zeroX, zeroY, comprimentoX, comprimentoY, escala, cor }) {
  const passo = passoDaRegua(escala);
  const [px, py, pw, ph] = painel;
  const yBase = py + ph + 4;
  ops.push({ tipo: 'linha', de: [px, yBase], ate: [px + pw, yBase], cor: '#999' });
  for (let mm = 0; mm <= comprimentoX + 1e-9; mm += passo) {
    const x = zeroX + mm * escala;
    if (x < px - 0.5 || x > px + pw + 0.5) continue;
    ops.push({ tipo: 'linha', de: [x, yBase], ate: [x, yBase + 8], cor });
    ops.push({ tipo: 'texto', texto: `${mm}`, em: [x, yBase + 21], tamanho: 12, alinhar: 'center', cor: '#444' });
  }
  const xBase = px - 4;
  ops.push({ tipo: 'linha', de: [xBase, py], ate: [xBase, py + ph], cor: '#999' });
  for (let mm = 0; mm <= comprimentoY + 1e-9; mm += passo) {
    const y = zeroY - mm * escala;
    if (y < py - 0.5 || y > py + ph + 0.5) continue;
    ops.push({ tipo: 'linha', de: [xBase - 8, y], ate: [xBase, y], cor });
    ops.push({ tipo: 'texto', texto: `${mm}`, em: [xBase - 11, y], tamanho: 12, alinhar: 'right', base: 'middle', cor: '#444' });
  }
  return passo;
}

/**
 * Monta o plano de desenho da prancha a partir das medidas: uma linha por vista, com a escala comum (px da prancha por mm) a maior que
 * cabe em `alturaDaLinha` e em `larguraMaxima`. `linhas[i]` traz:
 * - `vista`, e `modelo`: `{ largura, altura, extensao, pxPorMm }` da imagem da bancada;
 * - `foto`: `{ nome, largura, altura, regiao (caixa pedida ou null), extensao, pxPorMm, espelhar, regua }`.
 * Devolve `{ largura, altura, fundo, operacoes, escala, linhas }`, e `linhas` traz as medidas em mm que vão também para o JSON.
 */
export function disporPrancha({ titulo, linhas, disposicao = 'lado', alturaDaLinha = ALTURA_DA_LINHA, larguraMaxima = LARGURA_MAXIMA }) {
  if (!DISPOSICOES.includes(disposicao)) recusar(`--disposicao '${disposicao}' não existe; use ${DISPOSICOES.join(' ou ')}.`);
  /* o que cada painel mostra, em px da imagem de origem e em mm */
  const medidas = linhas.map((l) => {
    if (!l.modelo.extensao) recusar(`a vista ${l.vista} do modelo saiu só com fundo: a parte não aparece nela.`);
    if (!l.foto.extensao) recusar(`a foto ${l.foto.nome} não tem nada além do fundo na região ${l.foto.regiao ? l.foto.regiao.join(',') : 'inteira'}.`);
    const recM = recorteComFolga(l.modelo.extensao, l.modelo.largura, l.modelo.altura);
    const recF = l.foto.regiao
      ? [Math.max(0, l.foto.regiao[0]), Math.max(0, l.foto.regiao[1]), Math.min(l.foto.largura, l.foto.regiao[2]), Math.min(l.foto.altura, l.foto.regiao[3])]
      : recorteComFolga(l.foto.extensao, l.foto.largura, l.foto.altura);
    const emMm = (caixa, k) => [(caixa[2] - caixa[0]) / k, (caixa[3] - caixa[1]) / k];
    return {
      recM, recF,
      recMmm: emMm(recM, l.modelo.pxPorMm), recFmm: emMm(recF, l.foto.pxPorMm),
      extMmm: emMm(l.modelo.extensao, l.modelo.pxPorMm), extFmm: emMm(l.foto.extensao, l.foto.pxPorMm),
    };
  });
  /* em `sobreposto` o painel é a união dos dois recortes, alinhados pelo centro das extensões */
  const uniao = medidas.map((m, i) => {
    const l = linhas[i];
    const centro = (ext, k) => [(ext[0] + ext[2]) / 2 / k, (ext[1] + ext[3]) / 2 / k];
    const [cmx, cmy] = centro(l.modelo.extensao, l.modelo.pxPorMm);
    const fx = l.foto.espelhar ? (l.foto.largura - (l.foto.extensao[0] + l.foto.extensao[2]) / 2) / l.foto.pxPorMm : (l.foto.extensao[0] + l.foto.extensao[2]) / 2 / l.foto.pxPorMm;
    const fy = (l.foto.extensao[1] + l.foto.extensao[3]) / 2 / l.foto.pxPorMm;
    /* as caixas em mm relativas ao centro da extensão de cada uma */
    const caixaM = [m.recM[0] / l.modelo.pxPorMm - cmx, m.recM[1] / l.modelo.pxPorMm - cmy, m.recM[2] / l.modelo.pxPorMm - cmx, m.recM[3] / l.modelo.pxPorMm - cmy];
    const fX0 = l.foto.espelhar ? (l.foto.largura - m.recF[2]) : m.recF[0];
    const fX1 = l.foto.espelhar ? (l.foto.largura - m.recF[0]) : m.recF[2];
    const caixaF = [fX0 / l.foto.pxPorMm - fx, m.recF[1] / l.foto.pxPorMm - fy, fX1 / l.foto.pxPorMm - fx, m.recF[3] / l.foto.pxPorMm - fy];
    const u = [Math.min(caixaM[0], caixaF[0]), Math.min(caixaM[1], caixaF[1]), Math.max(caixaM[2], caixaF[2]), Math.max(caixaM[3], caixaF[3])];
    return { caixaM, caixaF, u };
  });
  const larguraDaLinhaMm = (i) => (disposicao === 'lado'
    ? medidas[i].recMmm[0] + medidas[i].recFmm[0]
    : uniao[i].u[2] - uniao[i].u[0]);
  const paineis = disposicao === 'lado' ? 2 : 1;
  const alturaMm = Math.max(...medidas.map((m, i) => (disposicao === 'lado' ? Math.max(m.recMmm[1], m.recFmm[1]) : uniao[i].u[3] - uniao[i].u[1])));
  const sobraLargura = larguraMaxima - 2 * MARGEM - paineis * LARGURA_DA_REGUA - (paineis - 1) * ESPACO;
  const escala = Math.min(alturaDaLinha / alturaMm, ...linhas.map((_, i) => sobraLargura / larguraDaLinhaMm(i)));

  const ops = [];
  let y = MARGEM;
  ops.push({ tipo: 'texto', texto: titulo, em: [MARGEM, y + 18], tamanho: 18, peso: 'bold' });
  ops.push({ tipo: 'texto', texto: `mesma escala nas duas metades: ${casa(escala)} px da prancha por mm; régua em mm, com o zero no canto de baixo à esquerda da extensão (caixa tracejada)`, em: [MARGEM, y + ALTURA_DO_TITULO + 12], tamanho: 13, cor: '#555' });
  y += ALTURA_DO_TITULO + 24;
  let largura = 0;
  const relato = [];
  for (const [i, l] of linhas.entries()) {
    const m = medidas[i];
    const alturaDaLinhaPx = Math.round((disposicao === 'lado' ? Math.max(m.recMmm[1], m.recFmm[1]) : uniao[i].u[3] - uniao[i].u[1]) * escala);
    const topo = y + ALTURA_DO_ROTULO;
    const fotoTexto = `foto ${l.foto.nome}${l.foto.espelhar ? ' (espelhada)' : ''}, régua ${mm1(l.foto.regua.mm)} mm = ${mm1(l.foto.regua.px)} px`;
    const linhaRelato = {
      vista: l.vista,
      modelo: { pxPorMm: l.modelo.pxPorMm, extensaoPx: l.modelo.extensao, extensaoMm: m.extMmm.map((v) => Number(v.toFixed(1))) },
      foto: {
        nome: l.foto.nome, espelhada: Boolean(l.foto.espelhar), pxPorMm: l.foto.pxPorMm, regiaoPx: l.foto.regiao ?? 'auto',
        extensaoPx: l.foto.extensao, extensaoMm: m.extFmm.map((v) => Number(v.toFixed(1))),
      },
    };
    if (disposicao === 'lado') {
      let x = MARGEM + LARGURA_DA_REGUA;
      const desenhar = ({ fonte, rec, k, ext, espelhar, larguraFonte, cor, rotulo }) => {
        const w = Math.round((rec[2] - rec[0]) / k * escala);
        const h = Math.round((rec[3] - rec[1]) / k * escala);
        const dy = topo + Math.round((alturaDaLinhaPx - h) / 2);
        const painel = [x, dy, w, h];
        ops.push({ tipo: 'texto', texto: rotulo[0], em: [x, y + 16], tamanho: 14, peso: 'bold', cor });
        ops.push({ tipo: 'texto', texto: rotulo[1], em: [x, y + 33], tamanho: 12, cor: '#444' });
        ops.push({ tipo: 'retangulo', caixa: painel, preencher: '#ffffff' });
        ops.push({ tipo: 'imagem', fonte, indice: i, recorte: [rec[0], rec[1], rec[2] - rec[0], rec[3] - rec[1]], destino: painel, espelhar });
        ops.push({ tipo: 'retangulo', caixa: painel, cor: '#bbb' });
        /* a extensão na prancha, com o espelho aplicado */
        const ex0 = espelhar ? rec[2] - ext[2] : ext[0] - rec[0];
        const ex1 = espelhar ? rec[2] - ext[0] : ext[2] - rec[0];
        const caixaExt = [x + ex0 / k * escala, dy + (ext[1] - rec[1]) / k * escala, (ex1 - ex0) / k * escala, (ext[3] - ext[1]) / k * escala];
        ops.push({ tipo: 'retangulo', caixa: caixaExt.map((v) => Math.round(v * 2) / 2), cor, tracejado: [5, 4] });
        reguaDoPainel(ops, { painel, zeroX: caixaExt[0], zeroY: caixaExt[1] + caixaExt[3], comprimentoX: (rec[2] - rec[0]) / k, comprimentoY: (rec[3] - rec[1]) / k, escala, cor });
        x += w + ESPACO + LARGURA_DA_REGUA;
        void larguraFonte;
      };
      desenhar({
        fonte: 'modelos', rec: m.recM, k: l.modelo.pxPorMm, ext: l.modelo.extensao, espelhar: false, cor: COR_DO_MODELO,
        rotulo: [`modelo, vista ${l.vista} (ortográfica)`, `extensão ${mm1(m.extMmm[0])} x ${mm1(m.extMmm[1])} mm`],
      });
      desenhar({
        fonte: 'fotos', rec: m.recF, k: l.foto.pxPorMm, ext: l.foto.extensao, espelhar: Boolean(l.foto.espelhar), cor: COR_DA_FOTO,
        rotulo: [fotoTexto, `região ${l.foto.regiao ? `${l.foto.regiao.join(',')} px` : 'auto'}; extensão do que não é fundo ${mm1(m.extFmm[0])} x ${mm1(m.extFmm[1])} mm`],
      });
      largura = Math.max(largura, x - ESPACO + MARGEM);
    } else {
      const u = uniao[i];
      const x0 = MARGEM + LARGURA_DA_REGUA;
      const painel = [x0, topo, Math.round((u.u[2] - u.u[0]) * escala), alturaDaLinhaPx];
      const emPx = (c) => [x0 + (c[0] - u.u[0]) * escala, topo + (c[1] - u.u[1]) * escala, (c[2] - c[0]) * escala, (c[3] - c[1]) * escala].map((v) => Math.round(v));
      ops.push({ tipo: 'texto', texto: `vista ${l.vista}: modelo translúcido (caixa azul) sobre a ${fotoTexto}`, em: [x0, y + 16], tamanho: 14, peso: 'bold', cor: COR_DO_MODELO });
      ops.push({ tipo: 'texto', texto: `alinhados pelo centro das extensões; modelo ${mm1(m.extMmm[0])} x ${mm1(m.extMmm[1])} mm, foto ${mm1(m.extFmm[0])} x ${mm1(m.extFmm[1])} mm`, em: [x0, y + 33], tamanho: 12, cor: '#444' });
      ops.push({ tipo: 'retangulo', caixa: painel, preencher: '#ffffff' });
      ops.push({ tipo: 'imagem', fonte: 'fotos', indice: i, recorte: [m.recF[0], m.recF[1], m.recF[2] - m.recF[0], m.recF[3] - m.recF[1]], destino: emPx(u.caixaF), espelhar: Boolean(l.foto.espelhar) });
      ops.push({ tipo: 'imagem', fonte: 'modelos', indice: i, recorte: [m.recM[0], m.recM[1], m.recM[2] - m.recM[0], m.recM[3] - m.recM[1]], destino: emPx(u.caixaM), alfa: 0.55 });
      ops.push({ tipo: 'retangulo', caixa: painel, cor: '#bbb' });
      const extM = [-m.extMmm[0] / 2, -m.extMmm[1] / 2, m.extMmm[0] / 2, m.extMmm[1] / 2];
      const extF = [-m.extFmm[0] / 2, -m.extFmm[1] / 2, m.extFmm[0] / 2, m.extFmm[1] / 2];
      const caixaM = emPx(extM);
      ops.push({ tipo: 'retangulo', caixa: caixaM, cor: COR_DO_MODELO, tracejado: [5, 4] });
      ops.push({ tipo: 'retangulo', caixa: emPx(extF), cor: COR_DA_FOTO, tracejado: [5, 4] });
      reguaDoPainel(ops, { painel, zeroX: caixaM[0], zeroY: caixaM[1] + caixaM[3], comprimentoX: u.u[2] - u.u[0], comprimentoY: u.u[3] - u.u[1], escala, cor: COR_DO_MODELO });
      largura = Math.max(largura, x0 + painel[2] + MARGEM);
    }
    relato.push(linhaRelato);
    y = topo + alturaDaLinhaPx + ALTURA_DA_REGUA + ESPACO;
  }
  return { largura: Math.ceil(Math.max(largura, 900)), altura: Math.ceil(y - ESPACO + MARGEM), fundo: '#f4f4f2', operacoes: ops, escala, linhas: relato };
}

/* ---------- O serviço ---------- */

const TIPOS = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const dataUrl = (bytes, tipo) => `data:${tipo};base64,${Buffer.from(bytes).toString('base64')}`;

/** Lê e confere o pedido antes de abrir bancada e navegador: um erro de escrita não custa uma captura. */
export function lerPedido({ peca, foto, regua, regiao, vistas, parte, disposicao, espelhar, saida }) {
  if (!peca) recusar('falta a peça: node tools/modelar/prancha-de-referencia.mjs <peça> --foto=<arquivo> --regua=<medida>.');
  const listaDeVistas = lerVistas(vistas);
  if (!foto) recusar('falta --foto=<arquivo> (jpg, png ou webp; fora do repositório, se for de terceiro).');
  if (!regua) recusar('falta --regua: uma medida conhecida da foto, <px>=<mm> ou x0,y0,x1,y1=<mm>; sem ela a foto não tem escala.');
  const fotos = porVista(foto, listaDeVistas, 'foto').map((f) => {
    const abs = resolve(f);
    if (!existsSync(abs)) recusar(`--foto: '${f}' não existe.`);
    const tipo = TIPOS[extname(abs).toLowerCase()];
    if (!tipo) recusar(`--foto: '${f}' não é jpg, png nem webp.`);
    return { abs, nome: basename(abs), tipo };
  });
  const reguas = porVista(regua, listaDeVistas, 'regua').map(lerRegua);
  const regioes = porVista(regiao, listaDeVistas, 'regiao').map((r) => lerRegiao(r ?? 'auto'));
  const espelhadas = espelhar ? String(espelhar).split(',').map((s) => s.trim()).filter(Boolean) : [];
  for (const v of espelhadas) if (!listaDeVistas.includes(v)) recusar(`--espelhar: '${v}' não está em --vistas (${listaDeVistas.join(', ')}).`);
  const partes = parte ? String(parte).split(',').map((s) => s.trim()).filter(Boolean) : [];
  const disp = disposicao ?? 'lado';
  if (!DISPOSICOES.includes(disp)) recusar(`--disposicao '${disp}' não existe; use ${DISPOSICOES.join(' ou ')}.`);
  const nomePadrao = `prancha-${peca}${partes.length ? `-${partes.join('-')}` : ''}-${listaDeVistas.join('-')}.png`;
  const arquivo = resolve(REPO, saida ?? join(relative(REPO, OUT), nomePadrao));
  if (relative(REPO, arquivo).startsWith('..')) recusar(`--saida '${saida}' fica fora do repositório; a prancha é gravada dentro dele (padrão tools/bancadas/out/).`);
  if (extname(arquivo).toLowerCase() !== '.png') recusar(`--saida '${saida}' precisa terminar em .png.`);
  return { peca, vistas: listaDeVistas, fotos, reguas, regioes, espelhadas, partes, disposicao: disp, arquivo };
}

/**
 * Monta a prancha e grava o PNG e, ao lado, o JSON das medidas. `olhar` é o `olharBancada` (injetável no teste) e `chromium` o do
 * Playwright. Devolve `{ arquivo, json, medidas }`.
 */
export async function prancharReferencia(opcoes, { olhar = null, chromium = null, lancar = null, logger = () => {} } = {}) {
  const pedido = lerPedido(opcoes);
  const olharBancada = olhar ?? (await import('./olhar-bancada.mjs')).olharBancada;
  const isolar = pedido.partes.length > 0;
  logger(`prancha: capturando ${pedido.peca}${isolar ? ` (${pedido.partes.join(', ')} isolada)` : ''} nas vistas ${pedido.vistas.join(', ')}, em projeção ortográfica`);
  const r = await olharBancada({
    peca: pedido.peca, vistas: pedido.vistas, res: RESOLUCAO_DA_CAPTURA, projecao: 'ortografica', auditoria: true, capturarEmMemoria: true, medirContatos: false,
    projetar: PONTOS_DA_ESCALA,
    ...(isolar ? { selecionadas: pedido.partes, modo: 'isolar', focar: true } : { enquadrar: true }),
    aoProgredir: logger,
  });
  if (!r.ok) recusar(`a bancada recusou a captura: ${r.erro?.mensagem ?? ''}\n${r.stderr ?? ''}`.trim());
  const capturas = r.resultado.capturas;
  const escalas = r.resultado.vistas.map((v, i) => escalaDaVista(v.projecaoMm, capturas[i].largura));

  const navegador = chromium ?? (await import('playwright')).chromium;
  const lancarChromium = lancar ?? (await import('./navegador.mjs')).lancarChromium;
  const browser = await lancarChromium(navegador, { webgl: false });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: `window.fundoDaCaixa = ${fundoDaCaixa.toString()};\nwindow.extensaoNaImagem = ${extensaoNaImagem.toString()};` });
    const medidas = await page.evaluate(carregarEMedirNaPagina, {
      modelos: capturas.map((c) => dataUrl(c.dados, 'image/png')),
      fotos: pedido.fotos.map((f, i) => ({ url: dataUrl(readFileSync(f.abs), f.tipo), regiao: pedido.regioes[i] })),
      limiar: LIMIAR_DO_FUNDO,
    });
    for (const [i, m] of medidas.fotos.entries()) {
      if (m.fora) recusar(`--regiao ${pedido.regioes[i].join(',')} cai fora da foto ${pedido.fotos[i].nome}, que tem ${m.largura} por ${m.altura} px.`);
    }
    const titulo = `${pedido.peca}${isolar ? `, ${pedido.partes.join(' e ')} isolada` : ''}: modelo e foto de referência`;
    const plano = disporPrancha({
      titulo,
      disposicao: pedido.disposicao,
      linhas: pedido.vistas.map((vista, i) => ({
        vista,
        modelo: { largura: medidas.modelos[i].largura, altura: medidas.modelos[i].altura, extensao: medidas.modelos[i].extensao, pxPorMm: escalas[i] },
        foto: {
          nome: pedido.fotos[i].nome, largura: medidas.fotos[i].largura, altura: medidas.fotos[i].altura, regiao: pedido.regioes[i],
          extensao: medidas.fotos[i].extensao, pxPorMm: pedido.reguas[i].pxPorMm, espelhar: pedido.espelhadas.includes(vista), regua: pedido.reguas[i],
        },
      })),
    });
    const png = await page.evaluate(desenharNaPagina, { largura: plano.largura, altura: plano.altura, fundo: plano.fundo, operacoes: plano.operacoes });
    mkdirSync(dirname(pedido.arquivo), { recursive: true });
    verificarCaminhoConfinado(pedido.arquivo, { raiz: REPO });
    writeFileSync(pedido.arquivo, Buffer.from(png, 'base64'));
    const json = pedido.arquivo.replace(/\.png$/i, '.json');
    const relato = {
      peca: pedido.peca, partes: pedido.partes, disposicao: pedido.disposicao, escalaDaPrancha: plano.escala,
      largura: plano.largura, altura: plano.altura,
      linhas: plano.linhas.map((l, i) => ({ ...l, foto: { ...l.foto, regua: pedido.reguas[i] } })),
    };
    writeFileSync(json, `${JSON.stringify(relato, null, 2)}\n`);
    return { arquivo: pedido.arquivo, json, medidas: relato };
  } finally {
    await browser.close().catch(() => {});
  }
}

/* ---------- A CLI ---------- */

export const OPCOES_DA_CLI = ['peca', 'foto', 'regua', 'regiao', 'vistas', 'parte', 'disposicao', 'espelhar', 'saida'];

export const AJUDA = `node tools/modelar/prancha-de-referencia.mjs <peça> --foto=<arquivo> --regua=<medida> [opções]
Monta a prancha modelo e foto: a vista ortográfica da peça (ou da parte isolada) ao lado da foto de referência, na mesma escala em mm.
A escala do modelo vem da câmera da bancada; a da foto, da régua. Grava o PNG e, ao lado, um JSON com as escalas e as extensões em mm.

  --foto=<arquivo>       a foto de referência, jpg, png ou webp (a de terceiro fica fora do repositório, em tmp/)
  --regua=<px>=<mm>      uma medida conhecida da foto: o comprimento em px e o mesmo em mm (ex.: 649=670, o pneu de 670 mm)
  --regua=x0,y0,x1,y1=<mm>  a mesma medida pelos dois pontos dela na foto, em px (ex.: 1162,738,1811,738=670)
  --regiao=<x0,y0,x1,y1|auto>  a caixa da foto a mostrar, em px (dois cantos opostos); auto (padrão) é a extensão do que não é fundo
  --vistas=<a,b>         as vistas ortográficas de eixo, uma linha da prancha por vista: ${VISTAS_DA_PRANCHA.join(', ')} (padrão direita)
  --parte=<a,b>          isola e enquadra estas partes, como --selecionadas=<a,b> --modo=isolar --focar da bancada; sem ela, a peça inteira
  --espelhar=<a,b>       espelha a foto nestas vistas, quando ela olha a peça do lado oposto ao da vista (ex.: a frente à direita na foto e à esquerda na vista)
  --disposicao=<lado|sobreposto>  lado (padrão): modelo à esquerda e foto à direita; sobreposto: o modelo translúcido sobre a foto, pelo centro das extensões
  --saida=<arquivo.png>  dentro do repositório (padrão tools/bancadas/out/prancha-<peça>[-<partes>]-<vistas>.png); sobrescreve a prancha anterior

Com mais de uma vista, --foto, --regua e --regiao levam um valor por vista separado por ';' (entre aspas no shell), ou um só, que vale para todas:
  node tools/modelar/prancha-de-referencia.mjs bicicleta-urbana --parte=selim --vistas=direita,frontal --espelhar=direita \\
    --foto='tmp/bicicleta/lateral.jpg;tmp/bicicleta/frontal.webp' --regua='1162,738,1811,738=670;654,80,1345,80=680' \\
    --regiao='560,110,870,240;880,150,1100,260'

A medição livre na foto (máscara por cor, varredura por linha ou coluna) continua por script; a régua e a região daqui servem a ele.
Plano: docs/modelar/planos/2026-11-16-comparar-com-a-referencia.md`;

export async function comoCLI(argv, { logger = (l) => process.stderr.write(`${l}\n`), ...injetar } = {}) {
  if (argv.includes('--ajuda') || argv.includes('--help') || argv.includes('-h')) return { codigo: 0, stdout: `${AJUDA}\n`, stderr: '' };
  try {
    const lido = lerArgumentos(argv, { opcoes: OPCOES_DA_CLI, bandeiras: [], posicional: { nome: 'a peça', obrigatorio: false } });
    const r = await prancharReferencia({
      peca: lido.opcao('peca') ?? lido.posicional, foto: lido.opcao('foto'), regua: lido.opcao('regua'), regiao: lido.opcao('regiao'),
      vistas: lido.opcao('vistas'), parte: lido.opcao('parte'), disposicao: lido.opcao('disposicao'), espelhar: lido.opcao('espelhar'),
      saida: lido.opcao('saida'),
    }, { logger, ...injetar });
    const linhas = r.medidas.linhas.map((l) => `  ${l.vista}: modelo ${l.modelo.extensaoMm.join(' x ')} mm (${casa(l.modelo.pxPorMm)} px/mm); foto ${l.foto.extensaoMm.join(' x ')} mm (${casa(l.foto.pxPorMm)} px/mm)${l.foto.espelhada ? ', espelhada' : ''}`);
    return { codigo: 0, stdout: `prancha: ${r.arquivo}\nmedidas: ${r.json}\nescala da prancha: ${casa(r.medidas.escalaDaPrancha)} px/mm\n${linhas.join('\n')}\n`, stderr: '' };
  } catch (erro) {
    return { codigo: erro instanceof ErroDePrancha || /argumento|opção|bandeira/i.test(erro.message) ? 2 : 1, stdout: '', stderr: `prancha-de-referencia: ${erro.message}\n` };
  }
}

const executadoComoCLI = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (executadoComoCLI) {
  const argv = process.argv.slice(2);
  const fechar = iniciarRegistro('prancha-de-referencia', argv.find((a) => a.startsWith('--peca='))?.slice(7) ?? argv.find((a) => !a.startsWith('-')));
  const r = await comoCLI(argv);
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  fechar({ codigo: r.codigo, prometeu: [], medidas: null, erro: r.codigo ? r.stderr.trim() : null });
  process.exit(r.codigo);
}
