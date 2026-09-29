/* analise-da-peca.mjs — o passo "Pare e analise": a matriz de vistas que a IA
 * precisa olhar antes de declarar uma forma pronta, o manifesto que prova que
 * ela foi gerada para a receita atual, e a leitura desse manifesto pelo
 * registro de etapas. O protocolo mora em docs/mecanifica/usar/PARE-E-ANALISE.md.
 *
 * A captura é do `olhar-bancada`, injetado em `olhar`; este módulo só decide
 * quais chamadas fazer, recorta e compõe os PNGs (pngjs) e escreve o manifesto.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const VISTAS_DA_ANALISE = ['isometrica', 'frontal', 'direita', 'traseira', 'superior', 'inferior'];
export const MODOS_DA_ANALISE = [
  { nome: 'sombreado', arame: false },
  { nome: 'arame', arame: true },
  { nome: 'raio-x', arame: 'raio-x' },
];
export const AMPLIACAO_DO_ZOOM = 3;
export const NOME_DO_MANIFESTO = 'manifesto.json';

export function apelido(nome) {
  return String(nome ?? 'sessao-ativa').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sessao-ativa';
}

export const pastaDaAnalise = (ref) => join('tools/bancadas/out', `analise-${apelido(ref)}`);

/** Hash do texto da receita, o mesmo sha256 que o registro de etapas usa. */
export function hashDaReceita(ref) {
  try {
    return createHash('sha256').update(readFileSync(resolverCaminhoReceita(ref, { raiz: REPO }))).digest('hex');
  } catch {
    return null;
  }
}

export function lerManifesto(ref) {
  const arquivo = join(REPO, pastaDaAnalise(ref), NOME_DO_MANIFESTO);
  if (!existsSync(arquivo)) return null;
  try {
    return JSON.parse(readFileSync(arquivo, 'utf8'));
  } catch {
    return null;
  }
}

/** 'feita' só se o manifesto existe e traz o hash da receita de agora. */
export function estadoDaAnalise(ref, { lerManifestoDe = lerManifesto, hashDe = hashDaReceita } = {}) {
  const manifesto = lerManifestoDe(ref);
  const hash = hashDe(ref);
  return manifesto && hash && manifesto.receita === hash ? 'feita' : 'ausente';
}

export function lerZoom(texto) {
  const c = /^([a-z]+):(\d+),(\d+),(\d+),(\d+)$/.exec(String(texto ?? ''));
  if (!c) throw new Error('--zoom precisa ser <vista>:<x0,y0,x1,y1> em pixels.');
  const [vista, x0, y0, x1, y1] = [c[1], +c[2], +c[3], +c[4], +c[5]];
  if (!VISTAS_DA_ANALISE.includes(vista)) throw new Error(`--zoom: vista '${vista}' não está na matriz (${VISTAS_DA_ANALISE.join(', ')}).`);
  if (x1 <= x0 || y1 <= y0) throw new Error('--zoom: o recorte precisa ter x1>x0 e y1>y0.');
  return { vista, caixa: [x0, y0, x1, y1] };
}

export function recortarAmpliado(png, [x0, y0, x1, y1], k = AMPLIACAO_DO_ZOOM) {
  if (x1 > png.width || y1 > png.height) {
    throw new Error(`recorte ${x0},${y0},${x1},${y1} sai da imagem de ${png.width}x${png.height}.`);
  }
  const w = (x1 - x0) * k;
  const h = (y1 - y0) * k;
  const saida = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const de = ((y0 + Math.floor(y / k)) * png.width + x0 + Math.floor(x / k)) * 4;
      png.data.copy(saida.data, (y * w + x) * 4, de, de + 4);
    }
  }
  return saida;
}

function lado(a, b) {
  const sep = 8;
  const saida = new PNG({ width: a.width + sep + b.width, height: Math.max(a.height, b.height) });
  saida.data.fill(255);
  for (const [png, xd] of [[a, 0], [b, a.width + sep]]) {
    for (let y = 0; y < png.height; y++) png.data.copy(saida.data, (y * saida.width + xd) * 4, y * png.width * 4, (y + 1) * png.width * 4);
  }
  return saida;
}

const lerPng = (arquivo) => PNG.sync.read(readFileSync(arquivo));
const gravarPng = (arquivo, png) => writeFileSync(arquivo, PNG.sync.write(png));

/**
 * Gera a matriz vistas x modos, o zoom opcional, a peça isolada opcional e o
 * manifesto. `olhar` é o `olharBancada`. Devolve `{ ok, arquivos, manifesto }`
 * ou a resposta da primeira captura que falhou.
 */
export async function analisarPeca({ peca, parte = null, zoom = null, zoomAntes = null, saida = null, olhar, res = '1280', espera = '1200' }) {
  if (!peca) throw new Error('--analise exige a peça (--peca=<nome>).');
  if (zoomAntes && !zoom) throw new Error('--zoom-antes exige --zoom.');
  const pedidoDeZoom = zoom ? lerZoom(zoom) : null;
  const pasta = saida ?? pastaDaAnalise(peca);
  const pastaAbs = resolve(REPO, pasta);
  if (relative(REPO, pastaAbs).startsWith('..')) throw new Error('--saida precisa ficar dentro do repositório.');
  /* A pasta padrão é da análise e é refeita inteira; numa --saida escolhida
     só sai o que o manifesto anterior listou. */
  if (!saida) rmSync(pastaAbs, { recursive: true, force: true });
  mkdirSync(pastaAbs, { recursive: true });
  /* Rodar de novo na mesma pasta apaga só o que o manifesto anterior listou:
     o olhar-bancada não sobrescreve imagem de revisão, e a pasta é da análise. */
  const anterior = join(pastaAbs, NOME_DO_MANIFESTO);
  if (existsSync(anterior)) {
    try {
      for (const a of JSON.parse(readFileSync(anterior, 'utf8')).arquivos ?? []) rmSync(join(REPO, a), { force: true });
    } catch { /* manifesto ilegível: nada a apagar por ele */ }
    rmSync(anterior, { force: true });
  }
  const arquivos = [];
  const porModo = {};
  const chamar = async (extra) => {
    const r = await olhar({ peca, projecao: 'ortografica', res, espera, saida: pasta, estrito: false, auditoria: true, ...extra });
    if (!r.ok) return r;
    for (const a of r.resultado.arquivos) arquivos.push(relative(REPO, resolve(REPO, a)));
    return r;
  };
  for (const modo of MODOS_DA_ANALISE) {
    const r = await chamar({ vistas: VISTAS_DA_ANALISE, arame: modo.arame });
    if (!r.ok) return r;
    porModo[modo.nome] = r.resultado.arquivos.map((a) => resolve(REPO, a));
  }
  if (parte) {
    const r = await chamar({ vistas: VISTAS_DA_ANALISE, selecionadas: [parte], modo: 'isolar', arame: false, focar: true });
    if (!r.ok) return r;
  }
  if (pedidoDeZoom) {
    const i = VISTAS_DA_ANALISE.indexOf(pedidoDeZoom.vista);
    for (const modo of MODOS_DA_ANALISE) {
      const depois = recortarAmpliado(lerPng(porModo[modo.nome][i]), pedidoDeZoom.caixa);
      const arquivo = join(pastaAbs, `zoom-${pedidoDeZoom.vista}-${modo.nome}.png`);
      gravarPng(arquivo, depois);
      arquivos.push(relative(REPO, arquivo));
      if (zoomAntes && modo.nome === 'sombreado') {
        const antesInteiro = lerPng(resolve(zoomAntes));
        const depoisInteiro = lerPng(porModo[modo.nome][i]);
        if (antesInteiro.width !== depoisInteiro.width || antesInteiro.height !== depoisInteiro.height) {
          throw new Error(`--zoom-antes tem ${antesInteiro.width}x${antesInteiro.height} e a captura ${depoisInteiro.width}x${depoisInteiro.height}; recapture o antes com a mesma --res.`);
        }
        const par = join(pastaAbs, `zoom-${pedidoDeZoom.vista}-antes-depois.png`);
        gravarPng(par, lado(recortarAmpliado(antesInteiro, pedidoDeZoom.caixa), depois));
        arquivos.push(relative(REPO, par));
      }
    }
  }
  const manifesto = {
    peca, receita: hashDaReceita(peca), data: new Date().toISOString(),
    vistas: VISTAS_DA_ANALISE, modos: MODOS_DA_ANALISE.map((m) => m.nome),
    ...(parte ? { parte } : {}), ...(pedidoDeZoom ? { zoom: pedidoDeZoom } : {}), arquivos,
  };
  writeFileSync(anterior, `${JSON.stringify(manifesto, null, 2)}\n`, 'utf8');
  return { ok: true, arquivos: [...arquivos, relative(REPO, anterior)], manifesto };
}
