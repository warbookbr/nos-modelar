/* Linha de comando do esboço: lê `<nome>.esboco.json`, desenha as opções
   lado a lado com modulos/esboco e grava `<nome>.svg` e `<nome>.png` ao lado.
   Uso: npm run esboco -- <arquivo.esboco.json> */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { desenharEsboco, ErroDeEsboco, VISTAS } from '../../modulos/esboco/src/index.js';
import { recortarAmpliado } from './analise-da-peca.mjs';

/* `navegador` opcional: a análise abre um só para as 16 imagens. */
export async function svgParaPng(svg, largura, altura, destino, navegador = null) {
  const proprio = !navegador;
  if (proprio) navegador = (await (await import('playwright')).default.chromium.launch());
  try {
    const pagina = await navegador.newPage({ viewport: { width: largura, height: altura } });
    await pagina.setContent(`<body style="margin:0">${svg}</body>`);
    await pagina.screenshot({ path: destino });
    await pagina.close();
  } finally {
    if (proprio) await navegador.close();
  }
}

/* Matriz de conferência: cada vista, com e sem legendas, com e sem linhas de
   centro. O `ocultar` do arquivo é preservado nos outros elementos; só os
   nomes `legendas` e `linhasCentro` são impostos em todos os níveis. */
export const VISTAS_DA_ANALISE = Object.keys(VISTAS);
export const AMPLIACAO_DO_ZOOM = 3;

export function variante(esboco, { vista, legendas, centros }) {
  const impor = (lista) => {
    if (lista === undefined) return undefined;
    const s = new Set(lista);
    for (const [nome, ligado] of [['legendas', legendas], ['linhasCentro', centros]]) {
      if (ligado) s.delete(nome); else s.add(nome);
    }
    return [...s];
  };
  const v = JSON.parse(JSON.stringify(esboco));
  v.vista = vista;
  v.linhasCentro = centros;
  v.ocultar = impor(v.ocultar ?? []);
  for (const o of v.opcoes ?? []) {
    delete o.linhasCentro;
    if (o.ocultar !== undefined) o.ocultar = impor(o.ocultar);
    for (const f of o.formas ?? []) {
      if (f.ocultar !== undefined) f.ocultar = impor(f.ocultar);
      if (centros && f.linhaCentro === false) delete f.linhaCentro;
    }
  }
  return v;
}

export function lerZoomDoEsboco(texto) {
  const c = /^([a-z]+):(\d+),(\d+),(\d+),(\d+)$/.exec(String(texto ?? ''));
  if (!c) throw new ErroDeEsboco('--zoom precisa ser <vista>:<x0,y0,x1,y1> em pixels.');
  const [vista, x0, y0, x1, y1] = [c[1], +c[2], +c[3], +c[4], +c[5]];
  if (!VISTAS_DA_ANALISE.includes(vista)) throw new ErroDeEsboco(`--zoom: vista '${vista}' desconhecida (${VISTAS_DA_ANALISE.join(', ')}).`);
  if (x1 <= x0 || y1 <= y0) throw new ErroDeEsboco('--zoom: o recorte precisa ter x1>x0 e y1>y0.');
  return { vista, caixa: [x0, y0, x1, y1] };
}

export async function analisarEsboco(arquivo, { zoom = null } = {}) {
  const caminho = resolve(arquivo);
  const texto = readFileSync(caminho, 'utf8');
  const esboco = JSON.parse(texto);
  const pedidoDeZoom = zoom ? lerZoomDoEsboco(zoom) : null;
  const pasta = caminho.replace(/(\.esboco)?\.json$/i, '') + '-analise';
  mkdirSync(pasta, { recursive: true });
  const anterior = join(pasta, 'manifesto.json');
  if (existsSync(anterior)) {
    try { for (const a of JSON.parse(readFileSync(anterior, 'utf8')).arquivos ?? []) rmSync(join(pasta, a), { force: true }); } catch { /* manifesto ilegível */ }
    rmSync(anterior, { force: true });
  }
  const { chromium } = (await import('playwright')).default;
  const navegador = await chromium.launch();
  const arquivos = [];
  const escalas = {};
  try {
    for (const vista of VISTAS_DA_ANALISE) {
      for (const legendas of [true, false]) {
        for (const centros of [true, false]) {
          const { svg, largura, altura, escala } = desenharEsboco(variante(esboco, { vista, legendas, centros }));
          const nome = `${vista}-${legendas ? 'legendas' : 'sem-legendas'}-${centros ? 'centros' : 'sem-centros'}.png`;
          await svgParaPng(svg, largura, altura, join(pasta, nome), navegador);
          arquivos.push(nome);
          escalas[vista] = escala;
        }
      }
    }
  } finally {
    await navegador.close();
  }
  if (pedidoDeZoom) {
    for (const [legendas, centros] of [[true, true], [false, false]]) {
      const base = `${pedidoDeZoom.vista}-${legendas ? 'legendas' : 'sem-legendas'}-${centros ? 'centros' : 'sem-centros'}.png`;
      const recorte = recortarAmpliado(PNG.sync.read(readFileSync(join(pasta, base))), pedidoDeZoom.caixa, AMPLIACAO_DO_ZOOM);
      const nome = `zoom-${base}`;
      writeFileSync(join(pasta, nome), PNG.sync.write(recorte));
      arquivos.push(nome);
    }
  }
  const manifesto = {
    esboco: createHash('sha256').update(texto).digest('hex'),
    data: new Date().toISOString(),
    vistas: VISTAS_DA_ANALISE,
    zoom: pedidoDeZoom,
    escalaPxPorMm: escalas,
    arquivos,
  };
  writeFileSync(anterior, `${JSON.stringify(manifesto, null, 2)}\n`);
  return { pasta, manifesto };
}

export async function gerarEsboco(arquivo) {
  const caminho = resolve(arquivo);
  const base = caminho.replace(/(\.esboco)?\.json$/i, '');
  const { svg, largura, altura, escala } = desenharEsboco(JSON.parse(readFileSync(caminho, 'utf8')));
  writeFileSync(`${base}.svg`, svg);
  await svgParaPng(svg, largura, altura, `${base}.png`);
  return { png: `${base}.png`, svg: `${base}.svg`, largura, altura, escala };
}

async function principal(argv) {
  const alvo = argv.find((a) => !a.startsWith('--'));
  if (!alvo) { process.stderr.write('uso: npm run esboco -- <arquivo.esboco.json> [--analise [--zoom=<vista>:x0,y0,x1,y1]]\n'); return 2; }
  try {
    if (argv.includes('--analise')) {
      const z = argv.find((a) => a.startsWith('--zoom='));
      const { pasta, manifesto } = await analisarEsboco(alvo, { zoom: z ? z.slice(7) : null });
      process.stdout.write(`análise do esboço: ${manifesto.arquivos.length} imagens em ${pasta}\n${manifesto.arquivos.map((a) => `  ${a}`).join('\n')}\nAbra cada imagem antes de dar o esboço por bom (docs/mecanifica/usar/PARE-E-ANALISE.md).\n`);
      return 0;
    }
    const r = await gerarEsboco(alvo);
    process.stdout.write(`esboço ${r.largura}x${r.altura} px, ${r.escala.toFixed(3)} px/mm\n  ${r.png}\n  ${r.svg}\n`);
    return 0;
  } catch (e) {
    if (e.code === 'ENOENT') { process.stderr.write(`esboço recusado: arquivo não encontrado (${alvo})\n`); return 1; }
    if (e instanceof ErroDeEsboco || e instanceof SyntaxError) { process.stderr.write(`esboço recusado: ${e.message}\n`); return 1; }
    throw e;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await principal(process.argv.slice(2));
