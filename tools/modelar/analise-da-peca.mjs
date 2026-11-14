/* analise-da-peca.mjs — o passo "Pare e analise": a matriz de vistas que a IA
 * precisa olhar antes de declarar uma forma pronta, o manifesto que prova que
 * ela foi gerada para a receita atual, e a leitura desse manifesto pelo
 * registro de etapas. O protocolo mora em docs/modelar/usar/PARE-E-ANALISE.md.
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

const NUM = '-?\\d+(?:\\.\\d+)?';
const FORMAS_DO_ZOOM = 'Escreva --zoom=<vista>:<x0,y0,x1,y1> para uma caixa em pixels da vista (4 inteiros) ou --zoom=<vista>:mm:<x0,y0,z0,x1,y1,z1> para uma caixa em mm do referencial da peça (dois cantos opostos, 6 números).';

/**
 * O pedido de zoom, de uma das duas formas, que o prefixo `mm:` separa para nunca se confundirem:
 *   `frontal:10,5,20,15`              caixa em PIXELS da vista (4 inteiros): { vista, caixa }
 *   `frontal:mm:900,1200,-300,1100,1500,300`  caixa em MM do referencial da peça (dois cantos opostos, 6 números): { vista, mm: [[x0,y0,z0],[x1,y1,z1]] }
 */
export function lerZoom(texto) {
  const bruto = String(texto ?? '');
  const c = /^([a-z]+):(mm:)?(.+)$/.exec(bruto);
  if (!c) throw new Error(`--zoom veio "${bruto}". ${FORMAS_DO_ZOOM}`);
  const [, vista, prefixoMm, resto] = c;
  if (!VISTAS_DA_ANALISE.includes(vista)) throw new Error(`--zoom: vista '${vista}' não está na matriz (${VISTAS_DA_ANALISE.join(', ')}).`);
  const partes = resto.split(',').map((n) => n.trim());
  if (!partes.every((n) => new RegExp(`^${NUM}$`).test(n))) throw new Error(`--zoom veio "${bruto}", com algo que não é número. ${FORMAS_DO_ZOOM}`);
  const numeros = partes.map(Number);
  if (prefixoMm) {
    if (numeros.length !== 6) {
      throw new Error(`--zoom=${vista}:mm: pede 6 números (x0,y0,z0,x1,y1,z1, dois cantos da caixa em mm), e vieram ${numeros.length}. `
        + `${numeros.length === 4 ? `Se a caixa é em pixels, escreva sem o mm: --zoom=${vista}:${partes.join(',')}.` : FORMAS_DO_ZOOM}`);
    }
    const a = numeros.slice(0, 3); const b = numeros.slice(3);
    return { vista, mm: [a.map((v, i) => Math.min(v, b[i])), a.map((v, i) => Math.max(v, b[i]))] };
  }
  if (numeros.length === 6) throw new Error(`--zoom=${vista}:${partes.join(',')} tem 6 números, que é caixa em mm, e a caixa em mm leva o prefixo mm:. Escreva --zoom=${vista}:mm:${partes.join(',')}. Caixa em pixels tem 4 inteiros.`);
  if (numeros.length !== 4 || !partes.every((n) => /^\d+$/.test(n))) {
    throw new Error(`--zoom veio "${bruto}": caixa em pixels pede 4 inteiros não negativos${partes.some((n) => /\./.test(n) || n.startsWith('-')) ? ' (valor com vírgula decimal ou negativo só vale em mm, com o prefixo mm:)' : ''}. ${FORMAS_DO_ZOOM}`);
  }
  const [x0, y0, x1, y1] = numeros;
  if (x1 <= x0 || y1 <= y0) throw new Error('--zoom: o recorte precisa ter x1>x0 e y1>y0.');
  return { vista, caixa: [x0, y0, x1, y1] };
}

/** Os 8 cantos de uma caixa em mm (`[min, max]`). */
export function cantosDaCaixaMm([min, max]) {
  const saida = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) saida.push([x, y, z]);
  return saida;
}

/**
 * A caixa em pixels de uma caixa em mm, pelos cantos que a página projetou nesta vista (`pixels`, no quadro `quadro` = [largura, altura]):
 * o retângulo que envolve os 8, arredondado para fora e cortado ao quadro. Diz se o corte tirou algo.
 */
export function caixaEmPixelsDosCantos(pixels, quadro) {
  const xs = pixels.map((p) => p[0]); const ys = pixels.map((p) => p[1]);
  const livre = [Math.floor(Math.min(...xs)), Math.floor(Math.min(...ys)), Math.ceil(Math.max(...xs)), Math.ceil(Math.max(...ys))];
  const caixa = [Math.max(0, livre[0]), Math.max(0, livre[1]), Math.min(quadro[0], livre[2]), Math.min(quadro[1], livre[3])];
  if (caixa[2] <= caixa[0] || caixa[3] <= caixa[1]) return { caixa: null, livre, cortada: true };
  return { caixa, livre, cortada: caixa.some((v, i) => v !== livre[i]) };
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
export async function analisarPeca({ peca, parte = null, zoom = null, zoomAntes = null, saida = null, olhar, res = '1280', espera = '1200', prazoDeCargaMs = undefined, contatos = {} }) {
  if (!peca) throw new Error('--analise exige a peça (--peca=<nome>).');
  if (zoomAntes && !zoom) throw new Error('--zoom-antes exige --zoom.');
  const pedidoDeZoom = zoom ? lerZoom(zoom) : null;
  /* Numa `--saida` escolhida as imagens vão para uma SUBPASTA da peça (`<saida>/analise-<peça>`): vários modeladores na mesma cópia, cada um com a sua peça, usavam a
     mesma pasta e as imagens se misturavam e sumiam, porque a limpeza do manifesto anterior apagava o que era de outro. */
  const pasta = saida ? join(saida, `analise-${apelido(peca)}`) : pastaDaAnalise(peca);
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
  /* o que a análise diz da carga e da medida: as páginas carregadas ao todo e o que houve com os contatos (a primeira chamada os mede, ou pula, ou lê do cache) */
  let cargasDePagina = 0;
  let estadoDosContatos = null;
  const chamar = async (extra) => {
    const r = await olhar({ peca, projecao: 'ortografica', res, espera, saida: pasta, estrito: false, auditoria: true, ...(prazoDeCargaMs ? { prazoDeCargaMs } : {}), ...contatos, ...extra });
    if (!r.ok) return r;
    for (const a of r.resultado.arquivos) arquivos.push(relative(REPO, resolve(REPO, a)));
    cargasDePagina += r.resultado.cargasDePagina ?? 0;
    estadoDosContatos ??= r.resultado.contatos ?? null;
    return r;
  };
  let caixaEmPixels = null;
  for (const modo of MODOS_DA_ANALISE) {
    /* a caixa em mm se projeta na primeira passada: a câmera é a mesma nos três modos */
    const projetar = pedidoDeZoom?.mm && !caixaEmPixels ? cantosDaCaixaMm(pedidoDeZoom.mm) : undefined;
    const r = await chamar({ vistas: VISTAS_DA_ANALISE, arame: modo.arame, ...(projetar ? { projetar } : {}) });
    if (!r.ok) return r;
    porModo[modo.nome] = r.resultado.arquivos.map((a) => resolve(REPO, a));
    if (projetar) {
      const doZoom = r.resultado.vistas?.[VISTAS_DA_ANALISE.indexOf(pedidoDeZoom.vista)]?.projecaoMm;
      if (!doZoom) throw new Error('--zoom em mm: a captura não devolveu a projeção da caixa na vista; a bancada não expõe a câmera desta página.');
      const projetada = caixaEmPixelsDosCantos(doZoom.pixels, doZoom.quadro);
      if (!projetada.caixa) {
        throw new Error(`--zoom em mm: a caixa [${pedidoDeZoom.mm.map((c) => c.join(', ')).join('] a [')}] mm cai fora do quadro da vista ${pedidoDeZoom.vista} (projetou em ${projetada.livre.join(', ')} px, num quadro de ${doZoom.quadro.join('x')}); use uma vista que a mostre ou outra caixa.`);
      }
      caixaEmPixels = { ...projetada, quadro: doZoom.quadro };
    }
  }
  if (parte) {
    const r = await chamar({ vistas: VISTAS_DA_ANALISE, selecionadas: [parte], modo: 'isolar', arame: false, focar: true });
    if (!r.ok) return r;
  }
  if (pedidoDeZoom) {
    const i = VISTAS_DA_ANALISE.indexOf(pedidoDeZoom.vista);
    for (const modo of MODOS_DA_ANALISE) {
      const caixa = pedidoDeZoom.caixa ?? caixaEmPixels.caixa;
      const depois = recortarAmpliado(lerPng(porModo[modo.nome][i]), caixa);
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
        gravarPng(par, lado(recortarAmpliado(antesInteiro, caixa), depois));
        arquivos.push(relative(REPO, par));
      }
    }
  }
  const manifesto = {
    peca, receita: hashDaReceita(peca), data: new Date().toISOString(),
    vistas: VISTAS_DA_ANALISE, modos: MODOS_DA_ANALISE.map((m) => m.nome),
    ...(parte ? { parte } : {}),
    ...(pedidoDeZoom ? { zoom: caixaEmPixels ? { ...pedidoDeZoom, caixaEmPixels: caixaEmPixels.caixa, cortadaPeloQuadro: caixaEmPixels.cortada } : pedidoDeZoom } : {}),
    cargasDePagina, ...(estadoDosContatos ? { contatos: estadoDosContatos } : {}), arquivos,
  };
  writeFileSync(anterior, `${JSON.stringify(manifesto, null, 2)}\n`, 'utf8');
  return { ok: true, arquivos: [...arquivos, relative(REPO, anterior)], manifesto, cargasDePagina, contatos: estadoDosContatos, zoomEmPixels: caixaEmPixels };
}
