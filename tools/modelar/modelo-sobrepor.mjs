#!/usr/bin/env node
/* modelo-sobrepor.mjs — projeta a silhueta ortográfica 3D da malha neutra
   sobre a prancha e/ou sobre a imagem de referência calibrada, montando
   vista individual ou quadro 2×2 e medindo o desvio em mm contra o contorno
   da prancha via `medirDesvioContorno`.

   Uso (contra prancha, vista única):
     npm run modelo:sobrepor -- <peça> --prancha=<vista.prancha.mjs> [--vista=<nome>] \
       [--partes=p1,p2] --saida=<out.svg> [--png=<out.png>] [--json]

   Uso (contra prancha, múltiplas vistas em quadro 2×2):
     npm run modelo:sobrepor -- <peça> --pranchas=<v1.prancha.mjs,v2.prancha.mjs,...> \
       [--partes=p1,p2] --saida=<quadro.svg> [--png=<quadro.png>] [--json]

   Uso (sobre imagem calibrada, vista única):
     npm run modelo:sobrepor -- <peça> --imagem=<foto.jpg|png> --caixa=x0,y0,x1,y1 \
       --vista=<lateral|frontal|traseira|planta|topo> [--prancha=<vista.prancha.mjs>] \
       [--espelhar-x] [--modo=escala-rigida|proporcao-foto] --saida=<out.svg> [--png=<out.png>]

   Uso (quadro 2×2 via --config=<quadro.json>):
     npm run modelo:sobrepor -- <peça> --config=<quadro.json> \
       [--modo=escala-rigida|proporcao-foto] --saida=<quadro.svg> [--png=<quadro.png>] [--json] */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { manifoldCarregada, erroDaCargaDaManifold } from '../../procedural/nucleo/manifold.js';
import { lerArgumentos } from './argumentos.mjs';
import { ErroDeEntrada, lerEntradaDeMedida, opcaoDaLinha } from './entrada-de-medida.mjs';
import {
  COR_POR_CLASSE,
  criarMapeadorSobrepor,
  extrairGeometriaDaPrancha,
  medirDesvioContorno,
} from './prancha/prancha-sobrepor.mjs';
import { lerDimensoesImagem } from './prancha/referencia-grade.mjs';
import { amostrarTrecho, triangulosDoNeutro } from './silhueta-contra-referencia.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const OLHAR = join(AQUI, 'olhar.mjs');

/* Convenção de projeção ortográfica por vista, alinhada a `prancha.mjs` e `prancha-coerencia.mjs`:
   cada vista mapeia um ponto 3D [x, y, z] em mm para [u, v] em mm no referencial da prancha. */
const EIXOS_VISTA = {
  lateral: ([_x, y, z]) => [z, y],
  frontal: ([x, y, _z]) => [x, y],
  traseira: ([x, y, _z]) => [x, y],
  planta: ([x, _y, z]) => [z, x],
  topo: ([x, _y, z]) => [x, z],
};

const COR_MODELO_3D = '#ff3b81';

const n = (v) => Number(v.toFixed(2));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function areaDoAnel(a) {
  let s = 0;
  for (let i = 0; i < a.length; i += 1) {
    const p = a[i];
    const q = a[(i + 1) % a.length];
    s += p[0] * q[1] - q[0] * p[1];
  }
  return s / 2;
}

/**
 * Converte uma malha neutra (`neutro` do executor ou `{ posicoes, indices }` em metros)
 * na lista de triângulos em mm `[{ p: [[x,y,z]*3], parte }]`.
 */
export function triangulosDaMalha(malha) {
  if (Array.isArray(malha)) return malha;
  if (malha?.posicoes && (malha.indices || malha.faces)) {
    const pos = malha.posicoes;
    const idx = malha.indices ?? malha.faces.flat();
    const tris = [];
    for (let i = 0; i + 2 < idx.length; i += 3) {
      const p = [0, 1, 2].map((k) => {
        const vi = idx[i + k] * 3;
        return [pos[vi] * 1000, pos[vi + 1] * 1000, pos[vi + 2] * 1000];
      });
      tris.push({ p, parte: malha.nome ?? 'malha' });
    }
    return tris;
  }
  return triangulosDoNeutro(malha);
}

/**
 * Projeta os triângulos 3D na vista ortográfica pedida e calcula a união 2D exata
 * via Manifold `CrossSection`, retornando os anéis em mm, o anel externo principal
 * e o envelope `{ uMin, uMax, vMin, vMax }`.
 */
export function extrairContornoVista3D(malhaOuTris, vista, partes = null) {
  const proj = EIXOS_VISTA[vista];
  if (!proj) {
    throw new Error(`vista "${vista}" desconhecida (use: ${Object.keys(EIXOS_VISTA).join(', ')})`);
  }
  const wasm = manifoldCarregada();
  if (!wasm) {
    throw new Error(`Manifold indisponível (${erroDaCargaDaManifold()?.message ?? 'motivo desconhecido'})`);
  }
  const tris = triangulosDaMalha(malhaOuTris);
  const escolhidas = partes?.length ? tris.filter((t) => partes.includes(t.parte)) : tris;
  const r = (v) => Math.round(v * 1e6) / 1e6;
  const pecas = [];
  for (const t of escolhidas) {
    const q = t.p.map((v) => {
      const [u, w] = proj(v);
      return [r(u), r(w)];
    });
    const area = areaDoAnel(q);
    if (Math.abs(area) < 1e-9) continue;
    pecas.push(new wasm.CrossSection([area > 0 ? q : [q[0], q[2], q[1]]], 'Positive'));
  }
  if (!pecas.length) {
    throw new Error(`nenhum triângulo com área projetada na vista "${vista}"`);
  }
  const uniao = wasm.CrossSection.union(pecas);
  const aneis = uniao.toPolygons()
    .filter((a) => a.length >= 3 && !(areaDoAnel(a) < 0 && Math.abs(areaDoAnel(a)) < 0.01))
    .map((a) => a.map((p) => [p[0], p[1]]));
  for (const p of pecas) p.delete?.();
  uniao.delete?.();

  let anelPrincipal = aneis[0] ?? [];
  let maiorArea = -Infinity;
  let uMin = Infinity; let uMax = -Infinity;
  let vMin = Infinity; let vMax = -Infinity;
  for (const a of aneis) {
    const area = Math.abs(areaDoAnel(a));
    if (area > maiorArea) {
      maiorArea = area;
      anelPrincipal = a;
    }
    for (const [u, v] of a) {
      if (u < uMin) uMin = u;
      if (u > uMax) uMax = u;
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
  }
  return { vista, aneis, anelPrincipal, envelopeMm: { uMin, uMax, vMin, vMax } };
}

/**
 * Mede o desvio geométrico em mm entre a projeção 3D e o contorno da prancha
 * usando `medirDesvioContorno`, amostrando o contorno da prancha ao longo das arestas.
 */
export function medirDesvioModeloContraPrancha(geoPrancha, projecao3d, passoMm = 10) {
  const camadasContorno = geoPrancha.camadas.filter((c) => c.contorno);
  const fonte = camadasContorno.length ? camadasContorno : geoPrancha.camadas;
  const pontosPrancha = [];
  for (const c of fonte) {
    if (c.ptsMm.length < 2) continue;
    const fechada = [...c.ptsMm, c.ptsMm[0]];
    for (const s of amostrarTrecho(fechada, passoMm)) {
      pontosPrancha.push(s.p);
    }
  }
  const polilinha3d = [...projecao3d.anelPrincipal, projecao3d.anelPrincipal[0]];
  return medirDesvioContorno(pontosPrancha, polilinha3d);
}

function unirEnvelopes(a, b) {
  if (!a) return { ...b };
  if (!b) return { ...a };
  return {
    uMin: Math.min(a.uMin, b.uMin),
    uMax: Math.max(a.uMax, b.uMax),
    vMin: Math.min(a.vMin, b.vMin),
    vMax: Math.max(a.vMax, b.vMax),
  };
}

function pathDeAnel(anel, mapear) {
  return `${anel.map(mapear).map(([px, py], i) => `${i ? 'L' : 'M'} ${n(px)} ${n(py)}`).join(' ')} Z`;
}

function renderizarVistaContraPrancha({ spec, vista, malha, partes, passoMm = 10, largura = 1100 }) {
  const geo = spec ? extrairGeometriaDaPrancha(spec, vista) : null;
  const vistaEfetiva = geo?.vista ?? vista;
  const proj3d = extrairContornoVista3D(malha, vistaEfetiva, partes);
  const desvio = geo ? medirDesvioModeloContraPrancha(geo, proj3d, passoMm) : null;

  const env = unirEnvelopes(geo?.envelopeMm, proj3d.envelopeMm);
  const spanU = Math.max(1, env.uMax - env.uMin);
  const spanV = Math.max(1, env.vMax - env.vMin);
  const pad = Math.max(spanU, spanV) * 0.08;
  const u0 = env.uMin - pad;
  const v0 = env.vMin - pad;
  const wMm = spanU + pad * 2;
  const hMm = spanV + pad * 2;

  const headerH = 54;
  const areaDesenhoW = largura;
  const areaDesenhoH = Math.max(240, Math.round((hMm / wMm) * areaDesenhoW));
  const totalH = areaDesenhoH + headerH;
  const escala = areaDesenhoW / wMm;

  const espelharHorizontal = vistaEfetiva === 'traseira';
  const inverterVertical = vistaEfetiva === 'planta';
  const mapear = ([u, v]) => {
    const px = espelharHorizontal
      ? areaDesenhoW - (u - u0) * escala
      : (u - u0) * escala;
    const py = inverterVertical
      ? headerH + (v - v0) * escala
      : headerH + areaDesenhoH - (v - v0) * escala;
    return [px, py];
  };

  const strokeBase = Math.max(1.8, largura * 0.002);
  const partesSvg = [];
  partesSvg.push(`<rect width="${largura}" height="${totalH}" fill="#11151c"/>`);

  if (geo) {
    partesSvg.push(`<g fill="none" stroke-opacity="0.92" stroke-linejoin="round" stroke-linecap="round">`);
    for (const c of geo.camadas) {
      const cor = COR_POR_CLASSE[c.classe] ?? '#00f0ff';
      const larg = c.contorno ? strokeBase * 1.25 : strokeBase * 0.9;
      const dash = c.classe === 'carater' ? ` stroke-dasharray="${n(strokeBase * 5)} ${n(strokeBase * 3)}"` : '';
      const d = c.ptsMm.map(mapear).map(([px, py], i) => `${i ? 'L' : 'M'} ${n(px)} ${n(py)}`).join(' ');
      partesSvg.push(`<path data-origem="prancha" data-camada="${esc(c.nome)}" data-classe="${esc(c.classe)}" stroke="${cor}" stroke-width="${n(larg)}"${dash} d="${d}"/>`);
    }
    partesSvg.push(`</g>`);
  }

  const d3d = proj3d.aneis.map((a) => pathDeAnel(a, mapear)).join(' ');
  partesSvg.push(`<path data-origem="modelo-3d" data-vista="${esc(vistaEfetiva)}" fill="${COR_MODELO_3D}" fill-opacity="0.14" stroke="${COR_MODELO_3D}" stroke-width="${n(strokeBase * 1.5)}" stroke-linejoin="round" d="${d3d}"/>`);

  const resumoDesvio = desvio
    ? `mediana ${desvio.medianaMm.toFixed(1)} mm | p95 ${desvio.p95Mm.toFixed(1)} mm | max ${desvio.maxMm.toFixed(1)} mm`
    : `envelope ${spanU.toFixed(0)} × ${spanV.toFixed(0)} mm`;
  const titulo = `${vistaEfetiva.toUpperCase()} — 3D (magenta) vs Prancha (ciano) | ${resumoDesvio}`;
  partesSvg.push(`<rect x="12" y="10" width="${largura - 24}" height="34" rx="6" fill="#1b222c"/>`);
  partesSvg.push(`<text x="24" y="32" fill="#f0f6fc" font-size="16" font-family="ui-monospace, Consolas, monospace">${esc(titulo)}</text>`);

  return {
    largura,
    altura: totalH,
    conteudo: partesSvg.join('\n'),
    vista: vistaEfetiva,
    desvio,
    projecao3d: proj3d,
    geometriaPrancha: geo,
  };
}

function renderizarVistaSobreImagem({ spec, vista, imagemBuf, caixa, espelharX = false, modo = 'escala-rigida', opacidade = 0.92, rotulo = '', malha, partes, passoMm = 10 }) {
  const dim = lerDimensoesImagem(imagemBuf);
  const geo = spec ? extrairGeometriaDaPrancha(spec, vista) : null;
  const vistaEfetiva = geo?.vista ?? vista;
  const proj3d = extrairContornoVista3D(malha, vistaEfetiva, partes);
  const desvio = geo ? medirDesvioModeloContraPrancha(geo, proj3d, passoMm) : null;

  const envelopeMm = geo?.envelopeMm ?? proj3d.envelopeMm;
  const inverterVertical = vistaEfetiva === 'planta';
  const map = criarMapeadorSobrepor({
    envelopeMm,
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

  const partesSvg = [];
  partesSvg.push(`<image href="${href}" x="0" y="0" width="${dim.largura}" height="${dim.altura}"${imgTransform}/>`);

  if (geo) {
    partesSvg.push(`<g fill="none" stroke-opacity="${opacidade}" stroke-linejoin="round" stroke-linecap="round">`);
    for (const c of geo.camadas) {
      const cor = COR_POR_CLASSE[c.classe] ?? '#00f0ff';
      const larg = c.contorno ? strokeBase * 1.2 : strokeBase * 0.9;
      const dash = c.classe === 'carater' ? ` stroke-dasharray="${n(strokeBase * 5)} ${n(strokeBase * 3)}"` : '';
      const d = c.ptsMm.map((p) => map.mmParaPx(p)).map(([px, py], i) => `${i ? 'L' : 'M'} ${n(px)} ${n(py)}`).join(' ');
      partesSvg.push(`<path data-origem="prancha" data-camada="${esc(c.nome)}" data-classe="${esc(c.classe)}" stroke="${cor}" stroke-width="${n(larg)}"${dash} d="${d}"/>`);
    }
    partesSvg.push(`</g>`);
  }

  const d3d = proj3d.aneis.map((a) => pathDeAnel(a, (p) => map.mmParaPx(p))).join(' ');
  partesSvg.push(`<path data-origem="modelo-3d" data-vista="${esc(vistaEfetiva)}" fill="${COR_MODELO_3D}" fill-opacity="0.16" stroke="${COR_MODELO_3D}" stroke-width="${n(strokeBase * 1.6)}" stroke-linejoin="round" d="${d3d}"/>`);

  const textoDesvio = desvio ? ` | desvio med ${desvio.medianaMm.toFixed(1)} p95 ${desvio.p95Mm.toFixed(1)} max ${desvio.maxMm.toFixed(1)} mm` : '';
  const texto = rotulo || `${vistaEfetiva.toUpperCase()} (${modo}) 3D magenta${textoDesvio}`;
  const fs = Math.max(22, Math.round(dim.largura * 0.015));
  partesSvg.push(`<rect x="16" y="16" width="${Math.min(dim.largura - 32, Math.round(texto.length * fs * 0.62) + 28)}" height="${Math.round(fs * 1.75)}" rx="6" fill="#11151c" fill-opacity="0.82"/>`);
  partesSvg.push(`<text x="30" y="${Math.round(16 + fs * 1.25)}" fill="#f0f6fc" font-size="${fs}" font-family="ui-monospace, Consolas, monospace">${esc(texto)}</text>`);

  return {
    largura: dim.largura,
    altura: dim.altura,
    conteudo: partesSvg.join('\n'),
    vista: vistaEfetiva,
    desvio,
    projecao3d: proj3d,
    geometriaPrancha: geo,
    mapeador: map,
  };
}

/**
 * Gera SVG individual de sobreposição 3D (sobre prancha, sobre imagem calibrada, ou ambos).
 */
export function gerarSobreposicaoModeloSvg(opts) {
  const render = opts.imagemBuf
    ? renderizarVistaSobreImagem(opts)
    : renderizarVistaContraPrancha(opts);
  const largSaida = opts.larguraSaida ?? 1400;
  const altSaida = Math.round((render.altura / render.largura) * largSaida);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${render.largura} ${render.altura}" width="${largSaida}" height="${altSaida}">`,
    render.conteudo,
    `</svg>\n`,
  ].join('\n');
  return {
    svg,
    vista: render.vista,
    desvio: render.desvio,
    projecao3d: render.projecao3d,
    geometriaPrancha: render.geometriaPrancha,
    mapeador: render.mapeador ?? null,
  };
}

/**
 * Monta grade 2×2 (ou 1×N) com múltiplas vistas sobrepostas em um único SVG.
 */
export function gerarQuadroModeloSvg(itens, { larguraCelula = 1100, modo = 'escala-rigida', opacidade = 0.92, passoMm = 10 } = {}) {
  if (!itens.length) throw new Error('nenhuma vista fornecida para o quadro');
  const colunas = itens.length === 1 ? 1 : 2;
  const linhas = Math.ceil(itens.length / colunas);
  const renderizadas = itens.map((it) => (it.imagemBuf
    ? renderizarVistaSobreImagem({ ...it, modo: it.modo ?? modo, opacidade: it.opacidade ?? opacidade, passoMm })
    : renderizarVistaContraPrancha({ ...it, passoMm, largura: larguraCelula })));

  const alturaCelula = Math.max(...renderizadas.map((r) => Math.round(larguraCelula * (r.altura / r.largura))));
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
      vista: r.vista,
      desvio: r.desvio,
      envelope3dMm: r.projecao3d.envelopeMm,
      modo: r.mapeador?.modo ?? 'prancha',
    })),
  };
}

function parseNums(str, esperado, nome) {
  const arr = String(str ?? '').split(',').map(Number);
  if (arr.length !== esperado || arr.some((x) => !Number.isFinite(x))) {
    throw new Error(`flag ${nome} exige ${esperado} números separados por vírgula`);
  }
  return arr;
}

const AJUDA = `uso:
  npm run modelo:sobrepor -- <peça> --prancha=<arq.prancha.mjs> [--vista=<nome>] [--partes=p1,p2] --saida=<out.svg> [--png=<out.png>] [--json]
  npm run modelo:sobrepor -- <peça> --pranchas=<a.prancha.mjs,b.prancha.mjs,...> [--partes=p1,p2] --saida=<quadro.svg> [--png=<quadro.png>] [--json]
  npm run modelo:sobrepor -- <peça> --imagem=<foto.jpg|png> --caixa=x0,y0,x1,y1 --vista=<vista> [--prancha=<arq.prancha.mjs>] [--espelhar-x] [--modo=escala-rigida|proporcao-foto] --saida=<out.svg> [--png=<out.png>]
  npm run modelo:sobrepor -- <peça> --config=<quadro.json> [--modo=escala-rigida|proporcao-foto] [--partes=p1,p2] --saida=<quadro.svg> [--png=<quadro.png>] [--json]
`;

async function carregarSpec(caminho) {
  const mod = await import(pathToFileURL(resolve(caminho)).href);
  if (!mod.ESPEC) throw new Error(`${caminho} não exporta ESPEC`);
  return mod.ESPEC;
}

export async function comoCLI(argv) {
  if (argv.includes('--ajuda') || argv.includes('-h')) {
    process.stdout.write(AJUDA);
    return 0;
  }

  let lido;
  try {
    lido = lerArgumentos(argv, {
      opcoes: ['prancha', 'pranchas', 'vista', 'imagem', 'caixa', 'modo', 'opacidade', 'config', 'saida', 'png', 'partes', 'opcao', 'passo'],
      bandeiras: ['espelhar-x', 'json', 'sem-cache'],
      posicional: { nome: 'a peça', obrigatorio: true },
    });
  } catch (erro) {
    process.stderr.write(`modelo-sobrepor: ${erro.message}\n`);
    return 2;
  }

  const saida = lido.opcao('saida');
  if (!saida) {
    process.stderr.write('modelo-sobrepor: falta --saida=<out.svg>.\n');
    return 2;
  }

  const configPath = lido.opcao('config');
  const pranchaPath = lido.opcao('prancha');
  const pranchasList = lido.opcao('pranchas');
  const imagemPath = lido.opcao('imagem');
  const caixaStr = lido.opcao('caixa');

  if (!configPath && !pranchaPath && !pranchasList && !(imagemPath && caixaStr && lido.opcao('vista'))) {
    process.stderr.write('modelo-sobrepor: informe --prancha, --pranchas, --config, ou (--imagem + --caixa + --vista).\n');
    return 2;
  }

  let entrada;
  try {
    entrada = await lerEntradaDeMedida(lido.posicional, {
      opcao: opcaoDaLinha(lido.opcao('opcao')),
      montagem: false,
      cache: !lido.bandeira('sem-cache'),
    });
  } catch (erro) {
    if (erro instanceof ErroDeEntrada) {
      process.stderr.write(`modelo-sobrepor: ${erro.message}\n`);
      return 2;
    }
    throw erro;
  }

  const partes = lido.opcao('partes')
    ? lido.opcao('partes').split(',').map((s) => s.trim()).filter(Boolean)
    : null;
  const { neutro } = entrada.executar();
  const tris = triangulosDaMalha(neutro);
  const modo = lido.opcao('modo') ?? 'escala-rigida';
  const opacidade = lido.opcao('opacidade') ? Number(lido.opcao('opacidade')) : 0.92;
  const passoMm = lido.opcao('passo') ? Number(lido.opcao('passo')) : 10;

  let resultado;
  if (configPath) {
    const cfg = JSON.parse(readFileSync(resolve(configPath), 'utf8'));
    const itens = [];
    for (const v of cfg.vistas ?? []) {
      itens.push({
        spec: v.prancha ? await carregarSpec(v.prancha) : null,
        vista: v.vista ?? null,
        imagemBuf: v.imagem ? readFileSync(resolve(v.imagem)) : null,
        caixa: v.caixa ?? null,
        espelharX: Boolean(v.espelharX),
        rotulo: v.rotulo ?? '',
        malha: tris,
        partes,
      });
    }
    resultado = gerarQuadroModeloSvg(itens, { modo, opacidade, passoMm });
  } else if (pranchasList) {
    const caminhos = pranchasList.split(',').map((s) => s.trim()).filter(Boolean);
    const itens = [];
    for (const c of caminhos) {
      itens.push({
        spec: await carregarSpec(c),
        vista: null,
        malha: tris,
        partes,
      });
    }
    resultado = gerarQuadroModeloSvg(itens, { modo, opacidade, passoMm });
  } else {
    const spec = pranchaPath ? await carregarSpec(pranchaPath) : null;
    const res = gerarSobreposicaoModeloSvg({
      spec,
      vista: lido.opcao('vista') ?? null,
      imagemBuf: imagemPath ? readFileSync(resolve(imagemPath)) : null,
      caixa: caixaStr ? parseNums(caixaStr, 4, '--caixa') : null,
      espelharX: lido.bandeira('espelhar-x'),
      modo,
      opacidade,
      malha: tris,
      partes,
      passoMm,
    });
    resultado = {
      svg: res.svg,
      vistas: [{
        vista: res.vista,
        desvio: res.desvio,
        envelope3dMm: res.projecao3d.envelopeMm,
        modo: res.mapeador?.modo ?? 'prancha',
      }],
    };
  }

  mkdirSync(dirname(resolve(saida)), { recursive: true });
  writeFileSync(resolve(saida), resultado.svg);

  if (lido.bandeira('json')) {
    process.stdout.write(`${JSON.stringify({ peca: lido.posicional, saida, vistas: resultado.vistas }, null, 2)}\n`);
  } else {
    for (const v of resultado.vistas) {
      const d = v.desvio
        ? `mediana ${v.desvio.medianaMm.toFixed(2)} mm, p95 ${v.desvio.p95Mm.toFixed(2)} mm, max ${v.desvio.maxMm.toFixed(2)} mm`
        : 'sem contorno de prancha';
      process.stdout.write(`  ${v.vista}: ${d}\n`);
    }
    process.stdout.write(`sobreposição 3D gravada em ${saida}\n`);
  }

  const png = lido.opcao('png');
  if (png) {
    mkdirSync(dirname(resolve(png)), { recursive: true });
    execFileSync(process.execPath, [OLHAR, resolve(png), resolve(saida)], { stdio: 'inherit' });
  }

  return 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await comoCLI(process.argv.slice(2));
}
