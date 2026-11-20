#!/usr/bin/env node
/* prancha-sobrepor.mjs — projeta apenas a geometria limpa de uma ou mais pranchas
   (sem título, cotas ou legenda) em alto contraste sobre as imagens de referência
   calibradas, nos modos `escala-rigida` e `proporcao-foto`, com montagem em quadro
   2×2 e medida opcional de desvio contra polilinha de referência.

   Uso (vista única):
     node tools/modelar/prancha/prancha-sobrepor.mjs \
       --prancha=<vista.prancha.mjs> --imagem=<foto.jpg|png> \
       --caixa=x0,y0,x1,y1 [--espelhar-x] [--modo=escala-rigida|proporcao-foto] \
       --saida=<out.svg> [--png=<out.png>]

   Uso (quadro multi-vista):
     node tools/modelar/prancha/prancha-sobrepor.mjs \
       --config=<quadro.json> [--modo=escala-rigida|proporcao-foto] \
       --saida=<quadro.svg> [--png=<quadro.png>] */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { prancha } from './prancha.mjs';
import { inverterPontoSvg } from './prancha-coerencia.mjs';
import { criarConversor, lerDimensoesImagem } from './referencia-grade.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const OLHAR = join(AQUI, '..', 'olhar.mjs');

const COR_POR_CLASSE = {
  contorno: '#00f0ff',
  vidro: '#4dff88',
  painel: '#ff8c42',
  carater: '#ffd400',
  roda: '#ffb800',
  aro: '#ffb800',
};

const n = (v) => Number(v.toFixed(2));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Extrai da prancha só as polilinhas geométricas em mm e o envelope total da vista
   (incluindo rodas para vistas verticais, de modo que y=0 alinhe com o chão da foto). */
export function extrairGeometriaDaPrancha(spec, vistaPedida = null) {
  const { relatorio, desenho } = prancha(spec);
  const vistas = Object.keys(spec.vistas);
  const vista = vistaPedida ?? vistas[0];
  if (!spec.vistas[vista]) throw new Error(`vista "${vista}" ausente na prancha (disponíveis: ${vistas.join(', ')})`);

  const linhasContorno = desenho.linhas.filter((l) => l.tipo === 'contorno');
  const camadas = [];
  let uMin = Infinity; let uMax = -Infinity;
  let vMin = Infinity; let vMax = -Infinity;

  for (let i = 0; i < spec.camadas.length; i += 1) {
    const c = spec.camadas[i];
    const linha = linhasContorno[i];
    if (!linha || c.vista !== vista) continue;
    const ptsMm = linha.pts.map((p) => inverterPontoSvg(vista, p, spec));
    const classe = c.contorno ? 'contorno' : (c.classe ?? 'contorno');
    camadas.push({ nome: c.nome ?? `camada_${i}`, classe, contorno: Boolean(c.contorno), foraDoContorno: Boolean(c.foraDoContorno), ptsMm });
    if (c.contorno || c.foraDoContorno) {
      for (const [u, v] of ptsMm) {
        if (c.contorno) {
          if (u < uMin) uMin = u;
          if (u > uMax) uMax = u;
        }
        if (v < vMin) vMin = v;
        if (v > vMax) vMax = v;
      }
    }
  }
  return { vista, camadas, envelopeMm: { uMin, uMax, vMin, vMax }, relatorio };
}

/* Mapeia um ponto [u, v] em mm para pixel da foto conforme o modo escolhido. */
export function criarMapeadorSobrepor({ envelopeMm, caixa, espelharX = false, larguraImg, alturaImg, modo = 'escala-rigida', inverterVertical = false }) {
  const { uMin, uMax, vMin, vMax } = envelopeMm;
  const eixoH = [uMin, uMax];
  const eixoV = inverterVertical ? [vMax, vMin] : [vMin, vMax];
  const convBase = criarConversor({ caixa, eixoH, eixoV, espelharX, larguraImg, alturaImg });
  const [x0, y0, x1, y1] = convBase.caixaExibida;
  const spanU = uMax - uMin;
  const spanV = vMax - vMin;
  const spanPxX = x1 - x0;
  const spanPxY = y1 - y0;
  const razaoFoto = spanPxX / spanPxY;
  const razaoPrancha = spanU / spanV;
  const desvioRazaoPct = ((razaoFoto - razaoPrancha) / razaoPrancha) * 100;

  if (modo === 'proporcao-foto') {
    return {
      modo,
      caixaExibida: convBase.caixaExibida,
      razaoFoto,
      razaoPrancha,
      desvioRazaoPct,
      mmParaPx: convBase.mmParaPx,
    };
  }
  if (modo !== 'escala-rigida') {
    throw new Error(`modo inválido "${modo}": use escala-rigida ou proporcao-foto`);
  }

  /* Escala uniforme preservando a proporção rígida da prancha, centrada na caixa da foto. */
  const sx = spanPxX / spanU;
  const sy = spanPxY / spanV;
  const escala = (sx + sy) / 2;
  const cxPx = (x0 + x1) / 2;
  const cyPx = (y0 + y1) / 2;
  const cu = (uMin + uMax) / 2;
  const cv = (vMin + vMax) / 2;
  const dirV = inverterVertical ? 1 : -1;

  return {
    modo,
    caixaExibida: convBase.caixaExibida,
    razaoFoto,
    razaoPrancha,
    desvioRazaoPct,
    escalaPxPorMm: escala,
    mmParaPx: ([u, v]) => [cxPx + (u - cu) * escala, cyPx + dirV * (v - cv) * escala],
  };
}

function gerarConteudoVistaSvg({ spec, vista, imagemBuf, caixa, espelharX = false, modo = 'escala-rigida', opacidade = 0.92, rotulo = '' }) {
  const dim = lerDimensoesImagem(imagemBuf);
  const geo = extrairGeometriaDaPrancha(spec, vista);
  /* Na vista planta, +x vai para baixo em prancha.mjs; manter orientação consistente. */
  const inverterVertical = geo.vista === 'planta';
  const map = criarMapeadorSobrepor({
    envelopeMm: geo.envelopeMm,
    caixa,
    espelharX,
    larguraImg: dim.largura,
    alturaImg: dim.altura,
    modo,
    inverterVertical,
  });

  const strokeBase = Math.max(2, dim.largura * 0.0018);
  const b64 = imagemBuf.toString('base64');
  const href = `data:${dim.mime};base64,${b64}`;
  const imgTransform = espelharX ? ` transform="translate(${dim.largura}, 0) scale(-1, 1)"` : '';

  const partes = [];
  partes.push(`<image href="${href}" x="0" y="0" width="${dim.largura}" height="${dim.altura}"${imgTransform}/>`);
  partes.push(`<g fill="none" stroke-opacity="${opacidade}" stroke-linejoin="round" stroke-linecap="round">`);
  for (const c of geo.camadas) {
    const cor = COR_POR_CLASSE[c.classe] ?? '#00f0ff';
    const larg = c.contorno ? strokeBase * 1.25 : strokeBase * 0.95;
    const dash = c.classe === 'carater' ? ` stroke-dasharray="${n(strokeBase * 5)} ${n(strokeBase * 3)}"` : '';
    const d = c.ptsMm.map((p) => map.mmParaPx(p)).map(([px, py], i) => `${i ? 'L' : 'M'} ${n(px)} ${n(py)}`).join(' ');
    partes.push(`<path data-camada="${esc(c.nome)}" data-classe="${esc(c.classe)}" stroke="${cor}" stroke-width="${n(larg)}"${dash} d="${d}"/>`);
  }
  partes.push(`</g>`);

  const texto = rotulo || `${geo.vista.toUpperCase()} (${modo}) | razão foto ${map.razaoFoto.toFixed(3)} vs prancha ${map.razaoPrancha.toFixed(3)} (${map.desvioRazaoPct >= 0 ? '+' : ''}${map.desvioRazaoPct.toFixed(1)}%)`;
  const fs = Math.max(22, Math.round(dim.largura * 0.015));
  partes.push(`<rect x="16" y="16" width="${Math.min(dim.largura - 32, Math.round(texto.length * fs * 0.62) + 28)}" height="${Math.round(fs * 1.75)}" rx="6" fill="#11151c" fill-opacity="0.82"/>`);
  partes.push(`<text x="30" y="${Math.round(16 + fs * 1.25)}" fill="#f0f6fc" font-size="${fs}" font-family="ui-monospace, Consolas, monospace">${esc(texto)}</text>`);

  return { largura: dim.largura, altura: dim.altura, conteudo: partes.join('\n'), geometria: geo, mapeador: map };
}

export function gerarSobreposicaoSvg(opts) {
  const v = gerarConteudoVistaSvg(opts);
  const largSaida = opts.larguraSaida ?? 1400;
  const altSaida = Math.round((v.altura / v.largura) * largSaida);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${v.largura} ${v.altura}" width="${largSaida}" height="${altSaida}">`,
    v.conteudo,
    `</svg>\n`,
  ].join('\n');
  return { svg, geometria: v.geometria, mapeador: v.mapeador };
}

/* Monta grade 2×2 (ou 1×N) com várias vistas sobrepostas em um único SVG. */
export function gerarQuadroSobreposicaoSvg(itens, { larguraCelula = 1100, modo = 'escala-rigida', opacidade = 0.92 } = {}) {
  if (!itens.length) throw new Error('nenhuma vista fornecida para o quadro');
  const colunas = itens.length === 1 ? 1 : 2;
  const linhas = Math.ceil(itens.length / colunas);
  const renderizadas = itens.map((it) => gerarConteudoVistaSvg({
    ...it,
    modo: it.modo ?? modo,
    opacidade: it.opacidade ?? opacidade,
  }));
  const alturaCelula = Math.round(larguraCelula * (renderizadas[0].altura / renderizadas[0].largura));
  const totalW = colunas * larguraCelula;
  const totalH = linhas * alturaCelula;

  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">`);
  out.push(`<rect width="${totalW}" height="${totalH}" fill="#16181d"/>`);
  for (let idx = 0; idx < renderizadas.length; idx += 1) {
    const r = renderizadas[idx];
    const col = idx % colunas;
    const lin = Math.floor(idx / colunas);
    const ox = col * larguraCelula;
    const oy = lin * alturaCelula;
    out.push(`<svg x="${ox}" y="${oy}" width="${larguraCelula}" height="${alturaCelula}" viewBox="0 0 ${r.largura} ${r.altura}" preserveAspectRatio="xMidYMid meet">`);
    out.push(r.conteudo);
    out.push(`</svg>`);
  }
  out.push(`</svg>\n`);
  return {
    svg: out.join('\n'),
    vistas: renderizadas.map((r) => ({
      vista: r.geometria.vista,
      modo: r.mapeador.modo,
      razaoFoto: r.mapeador.razaoFoto,
      razaoPrancha: r.mapeador.razaoPrancha,
      desvioRazaoPct: r.mapeador.desvioRazaoPct,
    })),
  };
}

function distPontoSegmento([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax; const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/* Mede o desvio geométrico (mediana, P95 e máximo em mm) entre os pontos da prancha
   e os segmentos de uma polilinha de contorno de referência em mm. */
export function medirDesvioContorno(pontosPranchaMm, polilinhaRefMm) {
  if (!pontosPranchaMm.length || polilinhaRefMm.length < 2) {
    throw new Error('polilinhas insuficientes para medir desvio');
  }
  const dists = pontosPranchaMm.map((p) => {
    let melhor = Infinity;
    for (let i = 1; i < polilinhaRefMm.length; i += 1) {
      const d = distPontoSegmento(p, polilinhaRefMm[i - 1], polilinhaRefMm[i]);
      if (d < melhor) melhor = d;
    }
    return melhor;
  }).sort((a, b) => a - b);
  const pct = (q) => dists[Math.min(dists.length - 1, Math.floor(q * (dists.length - 1)))];
  return {
    amostras: dists.length,
    medianaMm: Number(pct(0.5).toFixed(2)),
    p95Mm: Number(pct(0.95).toFixed(2)),
    maxMm: Number(dists[dists.length - 1].toFixed(2)),
  };
}

function parseNums(str, esperado, nome) {
  const arr = String(str ?? '').split(',').map(Number);
  if (arr.length !== esperado || arr.some((x) => !Number.isFinite(x))) {
    throw new Error(`flag ${nome} exige ${esperado} números separados por vírgula`);
  }
  return arr;
}

function parseArgs(argv) {
  const args = {};
  for (const a of argv) {
    if (a === '--ajuda' || a === '-h') args.ajuda = true;
    else if (a === '--espelhar-x') args.espelharX = true;
    else if (a.startsWith('--')) {
      const idx = a.indexOf('=');
      if (idx === -1) args[a.slice(2)] = true;
      else args[a.slice(2, idx)] = a.slice(idx + 1);
    }
  }
  return args;
}

const AJUDA = `uso:
  npm run prancha:sobrepor -- --prancha=<arq.prancha.mjs> --imagem=<foto.jpg|png> --caixa=x0,y0,x1,y1 [--espelhar-x] [--modo=escala-rigida|proporcao-foto] --saida=<out.svg> [--png=<out.png>]
  npm run prancha:sobrepor -- --config=<quadro.json> [--modo=escala-rigida|proporcao-foto] --saida=<quadro.svg> [--png=<quadro.png>]

Formato de <quadro.json>:
  { "vistas": [ { "prancha": "...prancha.mjs", "vista": "lateral", "imagem": "...jpg", "caixa": [x0,y0,x1,y1], "espelharX": true } ] }`;

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const args = parseArgs(process.argv.slice(2));
  if (args.ajuda || !args.saida || (!args.config && (!args.prancha || !args.imagem || !args.caixa))) {
    console.log(AJUDA);
    process.exit(args.ajuda ? 0 : 2);
  }
  const modo = args.modo ?? 'escala-rigida';
  const opacidade = args.opacidade ? Number(args.opacidade) : 0.92;

  if (args.config) {
    const cfg = JSON.parse(readFileSync(args.config, 'utf8'));
    const itens = [];
    for (const v of cfg.vistas ?? []) {
      const mod = await import(pathToFileURL(resolve(v.prancha)).href);
      if (!mod.ESPEC) throw new Error(`${v.prancha} não exporta ESPEC`);
      itens.push({
        spec: mod.ESPEC,
        vista: v.vista ?? null,
        imagemBuf: readFileSync(resolve(v.imagem)),
        caixa: v.caixa,
        espelharX: Boolean(v.espelharX),
        rotulo: v.rotulo ?? '',
      });
    }
    const res = gerarQuadroSobreposicaoSvg(itens, { modo, opacidade });
    writeFileSync(args.saida, res.svg);
    for (const r of res.vistas) {
      console.log(`  ${r.vista}: razão foto ${r.razaoFoto.toFixed(3)} vs prancha ${r.razaoPrancha.toFixed(3)} (${r.desvioRazaoPct >= 0 ? '+' : ''}${r.desvioRazaoPct.toFixed(1)}%)`);
    }
  } else {
    const mod = await import(pathToFileURL(resolve(args.prancha)).href);
    if (!mod.ESPEC) throw new Error(`${args.prancha} não exporta ESPEC`);
    const res = gerarSobreposicaoSvg({
      spec: mod.ESPEC,
      vista: args.vista ?? null,
      imagemBuf: readFileSync(resolve(args.imagem)),
      caixa: parseNums(args.caixa, 4, '--caixa'),
      espelharX: Boolean(args.espelharX),
      modo,
      opacidade,
    });
    writeFileSync(args.saida, res.svg);
    console.log(`sobreposição gravada em ${args.saida} (${res.geometria.vista}, modo ${modo}, desvio razão ${res.mapeador.desvioRazaoPct.toFixed(1)}%)`);
  }

  if (args.png) {
    execFileSync(process.execPath, [OLHAR, args.png, args.saida], { stdio: 'inherit' });
  }
}
