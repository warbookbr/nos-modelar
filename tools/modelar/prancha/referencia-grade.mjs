#!/usr/bin/env node
/* referencia-grade.mjs — estampa uma grade numerada em milímetros e pixels
   sobre uma imagem de referência calibrada, com recortes ampliados opcionais,
   para leitura precisa de coordenadas antes de traçar uma prancha.

   Uso:
     node tools/modelar/prancha/referencia-grade.mjs \
       --imagem=<foto.jpg|png> --caixa=x0,y0,x1,y1 \
       --eixo-h=min,max --eixo-v=min,max \
       [--espelhar-x] [--passo=100] [--passo-menor=50] \
       [--rotulo-h=z] [--rotulo-v=y] [--recorte=h0,v0,h1,v1] \
       --saida=<grade.svg> [--png=<grade.png>] */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const OLHAR = join(AQUI, '..', 'olhar.mjs');

/* Lê largura, altura e MIME direto do cabeçalho de um PNG ou JPEG, sem dependência externa. */
export function lerDimensoesImagem(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 24) {
    throw new Error('imagem inválida ou curta demais');
  }
  if (buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(4) === 0x0d0a1a0a) {
    return { largura: buf.readUInt32BE(16), altura: buf.readUInt32BE(20), mime: 'image/png' };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 8 < buf.length) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      while (i < buf.length && buf[i] === 0xff) i += 1;
      if (i >= buf.length) break;
      const marcador = buf[i];
      i += 1;
      if (marcador === 0xd9 || marcador === 0xda) break;
      if (i + 1 >= buf.length) break;
      const tam = buf.readUInt16BE(i);
      if (tam < 2 || i + tam > buf.length) break;
      /* SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 */
      const ehSof = (marcador >= 0xc0 && marcador <= 0xc3)
        || (marcador >= 0xc5 && marcador <= 0xc7)
        || (marcador >= 0xc9 && marcador <= 0xcb)
        || (marcador >= 0xcd && marcador <= 0xcf);
      if (ehSof && tam >= 7) {
        return { altura: buf.readUInt16BE(i + 3), largura: buf.readUInt16BE(i + 5), mime: 'image/jpeg' };
      }
      i += tam;
    }
    throw new Error('JPEG sem marcador SOF legível');
  }
  throw new Error('formato não suportado: use PNG ou JPEG');
}

/* Conversor linear entre pixels (no quadro exibido) e milímetros [h, v].
   `caixa` entra em pixels da imagem original [x0, y0, x1, y1]; com `espelharX`,
   a caixa é espelhada junto com a imagem para o quadro exibido. */
export function criarConversor({ caixa, eixoH, eixoV, espelharX = false, larguraImg, alturaImg }) {
  if (!Array.isArray(caixa) || caixa.length !== 4) throw new Error('caixa exige 4 números [x0, y0, x1, y1]');
  if (!Array.isArray(eixoH) || eixoH.length !== 2) throw new Error('eixoH exige 2 números [min, max]');
  if (!Array.isArray(eixoV) || eixoV.length !== 2) throw new Error('eixoV exige 2 números [min, max]');
  const [rx0, ry0, rx1, ry1] = caixa.map(Number);
  if (!(rx1 > rx0 && ry1 > ry0)) throw new Error(`caixa inválida: [${caixa.join(', ')}]`);
  const x0 = espelharX ? larguraImg - rx1 : rx0;
  const x1 = espelharX ? larguraImg - rx0 : rx1;
  const y0 = ry0;
  const y1 = ry1;
  const [h0, h1] = eixoH.map(Number);
  const [v0, v1] = eixoV.map(Number);
  if (h0 === h1 || v0 === v1) throw new Error('faixa de eixo não pode ser degenerada');

  /* Eixo H vai da esquerda (x0 -> h0) à direita (x1 -> h1).
     Eixo V vai de baixo (y1 -> v0) para cima (y0 -> v1). */
  const mmParaPx = ([h, v]) => [
    x0 + ((h - h0) / (h1 - h0)) * (x1 - x0),
    y1 - ((v - v0) / (v1 - v0)) * (y1 - y0),
  ];
  const pxParaMm = ([px, py]) => [
    h0 + ((px - x0) / (x1 - x0)) * (h1 - h0),
    v0 + ((y1 - py) / (y1 - y0)) * (v1 - v0),
  ];

  return {
    caixaExibida: [x0, y0, x1, y1],
    eixoH: [h0, h1],
    eixoV: [v0, v1],
    mmPerPxH: Math.abs(h1 - h0) / (x1 - x0),
    mmPerPxV: Math.abs(v1 - v0) / (y1 - y0),
    mmParaPx,
    pxParaMm,
  };
}

function ticksNoIntervalo(min, max, passo) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const inicio = Math.ceil(lo / passo) * passo;
  const lista = [];
  for (let v = inicio; v <= hi + 1e-6; v += passo) {
    lista.push(Math.round(v * 1000) / 1000);
  }
  return lista;
}

const n = (v) => Number(v.toFixed(2));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function gerarGradeSvg({
  imagemBuf,
  caixa,
  eixoH,
  eixoV,
  espelharX = false,
  passoMm = 100,
  passoMenorMm = 50,
  rotuloH = 'h',
  rotuloV = 'v',
  recorteMm = null,
  titulo = '',
  larguraSaida = 1400,
}) {
  const dim = lerDimensoesImagem(imagemBuf);
  const conv = criarConversor({
    caixa,
    eixoH,
    eixoV,
    espelharX,
    larguraImg: dim.largura,
    alturaImg: dim.altura,
  });

  const [cx0, cy0, cx1, cy1] = conv.caixaExibida;
  let vbX = Math.max(0, cx0 - (cx1 - cx0) * 0.08);
  let vbY = Math.max(0, cy0 - (cy1 - cy0) * 0.10);
  let vbW = Math.min(dim.largura - vbX, (cx1 - cx0) * 1.16);
  let vbH = Math.min(dim.altura - vbY, (cy1 - cy0) * 1.20);

  if (recorteMm) {
    const [rh0, rv0, rh1, rv1] = recorteMm.map(Number);
    const [pxA, pyA] = conv.mmParaPx([rh0, rv1]);
    const [pxB, pyB] = conv.mmParaPx([rh1, rv0]);
    vbX = Math.max(0, Math.min(pxA, pxB));
    vbY = Math.max(0, Math.min(pyA, pyB));
    vbW = Math.max(10, Math.min(dim.largura - vbX, Math.abs(pxB - pxA)));
    vbH = Math.max(10, Math.min(dim.altura - vbY, Math.abs(pyB - pyA)));
  }

  const margemEsq = vbW * 0.055;
  const margemTopo = vbH * 0.115;
  const margemDir = vbW * 0.055;
  const margemBase = vbH * 0.065;
  const fullX = vbX - margemEsq;
  const fullY = vbY - margemTopo;
  const fullW = vbW + margemEsq + margemDir;
  const fullH = vbH + margemTopo + margemBase;
  const escalaTela = larguraSaida / fullW;
  const alturaSaida = Math.round(fullH * escalaTela);

  const [hVisMin, vVisMax] = conv.pxParaMm([vbX, vbY]);
  const [hVisMax, vVisMin] = conv.pxParaMm([vbX + vbW, vbY + vbH]);

  const hMenores = passoMenorMm > 0 ? ticksNoIntervalo(hVisMin, hVisMax, passoMenorMm) : [];
  const vMenores = passoMenorMm > 0 ? ticksNoIntervalo(vVisMin, vVisMax, passoMenorMm) : [];
  const hMaiores = ticksNoIntervalo(hVisMin, hVisMax, passoMm);
  const vMaiores = ticksNoIntervalo(vVisMin, vVisMax, passoMm);

  const fontSize = Math.max(10, Math.round(fullW * 0.0115));
  const strokeMaior = Math.max(1, fullW * 0.0009);
  const strokeMenor = Math.max(0.5, fullW * 0.00045);
  const b64 = imagemBuf.toString('base64');
  const href = `data:${dim.mime};base64,${b64}`;
  const imgTransform = espelharX ? ` transform="translate(${dim.largura}, 0) scale(-1, 1)"` : '';

  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(fullX)} ${n(fullY)} ${n(fullW)} ${n(fullH)}" width="${larguraSaida}" height="${alturaSaida}" font-family="ui-monospace, Consolas, monospace">`);
  out.push(`<rect x="${n(fullX)}" y="${n(fullY)}" width="${n(fullW)}" height="${n(fullH)}" fill="#16181d"/>`);
  out.push(`<defs><clipPath id="area"><rect x="${n(vbX)}" y="${n(vbY)}" width="${n(vbW)}" height="${n(vbH)}"/></clipPath></defs>`);
  out.push(`<g clip-path="url(#area)">`);
  out.push(`<image href="${href}" x="0" y="0" width="${dim.largura}" height="${dim.altura}"${imgTransform}/>`);

  /* Grade secundária */
  out.push(`<g stroke="#00f0ff" stroke-opacity="0.22" stroke-width="${n(strokeMenor)}">`);
  for (const h of hMenores) {
    const [px] = conv.mmParaPx([h, 0]);
    if (px >= vbX && px <= vbX + vbW) out.push(`<line x1="${n(px)}" y1="${n(vbY)}" x2="${n(px)}" y2="${n(vbY + vbH)}"/>`);
  }
  for (const v of vMenores) {
    const [, py] = conv.mmParaPx([0, v]);
    if (py >= vbY && py <= vbY + vbH) out.push(`<line x1="${n(vbX)}" y1="${n(py)}" x2="${n(vbX + vbW)}" y2="${n(py)}"/>`);
  }
  out.push(`</g>`);

  /* Grade principal */
  out.push(`<g stroke="#00f0ff" stroke-opacity="0.58" stroke-width="${n(strokeMaior)}">`);
  for (const h of hMaiores) {
    const [px] = conv.mmParaPx([h, 0]);
    if (px >= vbX && px <= vbX + vbW) out.push(`<line x1="${n(px)}" y1="${n(vbY)}" x2="${n(px)}" y2="${n(vbY + vbH)}"/>`);
  }
  for (const v of vMaiores) {
    const [, py] = conv.mmParaPx([0, v]);
    if (py >= vbY && py <= vbY + vbH) out.push(`<line x1="${n(vbX)}" y1="${n(py)}" x2="${n(vbX + vbW)}" y2="${n(py)}"/>`);
  }
  out.push(`</g>`);

  /* Caixa calibrada do objeto */
  out.push(`<rect x="${n(cx0)}" y="${n(cy0)}" width="${n(cx1 - cx0)}" height="${n(cy1 - cy0)}" fill="none" stroke="#ffd400" stroke-width="${n(strokeMaior * 2)}" stroke-dasharray="${n(strokeMaior * 6)} ${n(strokeMaior * 4)}"/>`);
  out.push(`</g>`);

  /* Rótulos nas quatro bordas */
  out.push(`<g fill="#e6edf3" font-size="${fontSize}">`);
  for (const h of hMaiores) {
    const [px] = conv.mmParaPx([h, 0]);
    if (px < vbX || px > vbX + vbW) continue;
    const label = String(Math.round(h));
    out.push(`<text x="${n(px)}" y="${n(vbY - fontSize * 0.45)}" text-anchor="middle">${label}</text>`);
    out.push(`<text x="${n(px)}" y="${n(vbY + vbH + fontSize * 1.15)}" text-anchor="middle">${label}</text>`);
  }
  for (const v of vMaiores) {
    const [, py] = conv.mmParaPx([0, v]);
    if (py < vbY || py > vbY + vbH) continue;
    const label = String(Math.round(v));
    out.push(`<text x="${n(vbX - fontSize * 0.35)}" y="${n(py + fontSize * 0.35)}" text-anchor="end">${label}</text>`);
    out.push(`<text x="${n(vbX + vbW + fontSize * 0.35)}" y="${n(py + fontSize * 0.35)}" text-anchor="start">${label}</text>`);
  }
  const cab = titulo || `${rotuloH}: [${eixoH.join('..')}] mm | ${rotuloV}: [${eixoV.join('..')}] mm | passo ${passoMm} mm | escala ${conv.mmPerPxH.toFixed(2)}×${conv.mmPerPxV.toFixed(2)} mm/px`;
  out.push(`<text x="${n(vbX)}" y="${n(fullY + fontSize * 1.25)}" fill="#ffd400" font-size="${Math.round(fontSize * 0.95)}">${esc(cab)}</text>`);
  out.push(`</g></svg>\n`);

  return { svg: out.join('\n'), conversor: conv, dimensoes: dim };
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

const AJUDA = `uso: npm run referencia:grade -- --imagem=<foto.jpg|png> --caixa=x0,y0,x1,y1 --eixo-h=min,max --eixo-v=min,max --saida=<grade.svg> [opções]

Opções:
  --espelhar-x             espelha a imagem e a caixa na horizontal
  --passo=<mm>             espaçamento da grade principal (padrão: 100)
  --passo-menor=<mm>       espaçamento da grade secundária (padrão: 50)
  --rotulo-h=<texto>       nome do eixo horizontal (padrão: h)
  --rotulo-v=<texto>       nome do eixo vertical (padrão: v)
  --recorte=h0,v0,h1,v1    gera recorte ampliado na faixa em mm indicada
  --titulo=<texto>         cabeçalho exibido no topo
  --png=<arquivo.png>      rasteriza o SVG em PNG via olhar.mjs`;

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const args = parseArgs(process.argv.slice(2));
  if (args.ajuda || !args.imagem || !args.caixa || !args['eixo-h'] || !args['eixo-v'] || !args.saida) {
    console.log(AJUDA);
    process.exit(args.ajuda ? 0 : 2);
  }
  const imagemBuf = readFileSync(args.imagem);
  const res = gerarGradeSvg({
    imagemBuf,
    caixa: parseNums(args.caixa, 4, '--caixa'),
    eixoH: parseNums(args['eixo-h'], 2, '--eixo-h'),
    eixoV: parseNums(args['eixo-v'], 2, '--eixo-v'),
    espelharX: Boolean(args.espelharX),
    passoMm: args.passo ? Number(args.passo) : 100,
    passoMenorMm: args['passo-menor'] !== undefined ? Number(args['passo-menor']) : 50,
    rotuloH: args['rotulo-h'] ?? 'h',
    rotuloV: args['rotulo-v'] ?? 'v',
    recorteMm: args.recorte ? parseNums(args.recorte, 4, '--recorte') : null,
    titulo: args.titulo ?? '',
  });
  writeFileSync(args.saida, res.svg);
  console.log(`grade gravada em ${args.saida} (${res.dimensoes.largura}×${res.dimensoes.altura} px, ${res.conversor.mmPerPxH.toFixed(3)}×${res.conversor.mmPerPxV.toFixed(3)} mm/px)`);
  if (args.png) {
    execFileSync(process.execPath, [OLHAR, args.png, args.saida], { stdio: 'inherit' });
  }
}
