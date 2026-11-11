#!/usr/bin/env node
/* vista-rapida.mjs — a imagem sombreada de uma opção de esboço numa vista, tirada da malha em JavaScript, sem navegador.
 *
 * POR QUE ELE EXISTE. A captura de uma vista do rascunho pelo `esboco:nucleo` abre a bancada no Chromium, leva cerca de um minuto por
 * vista no contêiner e falha de vez em quando (ATRITOS da empilhadeira, item 2). Quem conduz um rascunho contra uma referência pela
 * leitura por regiões precisa de uma imagem com luz a cada rodada, e o crítico precisa dela na vista vizinha também, porque o que
 * avança ou recua para o observador só aparece ali (item 12). Essa imagem de trabalho não precisa vir da bancada.
 *
 * O QUE ELE FAZ. Monta a opção como o `linhas:modelo`, projeta os triângulos numa câmera ortográfica na direção de uma vista da bancada
 * (ou numa direção qualquer), com a caixa do objeto centrada e uma folga em volta, e pinta cada pixel com a cor da parte sob uma luz
 * difusa vinda de cima, da esquerda e de frente do observador, mais luz ambiente, sem sombra projetada. As normais são alisadas por
 * vértice dentro da mesma parte quando o ângulo entre as faces é menor que `--liso` graus, e interpoladas no triângulo; a aresta acima
 * do ângulo fica viva. A imagem é desenhada com o dobro da resolução e reduzida pela média, e o fundo é `FUNDO_DO_PAINEL` em toda a
 * imagem, de modo que `leitura:regioes --captura=<png>` a aceita sem `--painel`.
 *
 * A COR. `--cores=parte:#rrggbb,...` manda; depois vale a cor da face no neutro (a que o pincel e a cor da forma do esboço gravam),
 * depois a cor do material declarado da face, e a parte sem nenhuma leva um cinza médio.
 *
 * O LIMITE. É a imagem de trabalho de quem conduz e do crítico. A luz e o material não são os da bancada, e a imagem que vai à pessoa
 * continua saindo da bancada.
 *
 * Uso: npm run vista:rapida -- <esboço> --vista=<vista> --saida=<png> [--opcao=1] [--largura=900] [--margem=0.08]
 *        [--cores=capo:#e2641e,tampa:#73797d] [--direcao=x,y,z] [--liso=35]
 * Sem npm: node tools/modelar/vista-rapida.mjs <mesmos argumentos>. */
import { writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VISTAS_BANCADA } from '../../src/autoria/vistas-da-bancada.js';
import { FUNDO_DO_PAINEL, imagem, paraPng } from './leitura-por-regioes.mjs';

export const LISO_PADRAO = 35;
export const LARGURA_PADRAO = 900;
export const MARGEM_PADRAO = 0.08;
export const SUPERAMOSTRAGEM = 2;
export const CINZA = '#8c8c8c';
/* a luz, no espaço da câmera: pesos sobre a direita, o cima e o "para o observador" */
export const LUZ = Object.freeze({ direita: -0.45, cima: 0.75, frente: 0.5, difusa: 0.68, ambiente: 0.32 });

export class ErroDaVista extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroDaVista'; }
}

const unit = (v) => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* --- a câmera ------------------------------------------------------------------------------------------------------------------- */
/**
 * A base da câmera: para onde ela olha, a direita e o cima da imagem. Recebe o nome de uma vista da bancada ou a direção [x, y, z]
 * do objeto para a câmera, na convenção de `VISTAS_BANCADA` (a mesma regra de cima do `linhas:modelo`).
 */
export function camera(vistaOuDirecao) {
  let direcao;
  if (Array.isArray(vistaOuDirecao)) {
    if (vistaOuDirecao.length !== 3 || !vistaOuDirecao.every(Number.isFinite) || Math.hypot(...vistaOuDirecao) < 1e-9) throw new ErroDaVista('a direção precisa de três números, não todos zero');
    direcao = vistaOuDirecao;
  } else {
    const definicao = VISTAS_BANCADA[vistaOuDirecao];
    if (!definicao) throw new ErroDaVista(`vista "${vistaOuDirecao}" não existe na bancada (${Object.keys(VISTAS_BANCADA).join(', ')})`);
    direcao = [...definicao.direcao];
  }
  direcao = unit(direcao);
  const acima = Math.abs(direcao[1]) > 0.99 ? [0, 0, direcao[1] > 0 ? -1 : 1] : [0, 1, 0];
  const olhar = direcao.map((x) => -x);
  const direita = unit(cruz(olhar, acima));
  return { olhar, direita, cima: unit(cruz(direita, olhar)) };
}

/* --- a cor ---------------------------------------------------------------------------------------------------------------------- */
export const rgbDoHex = (hex) => {
  const limpo = String(hex ?? '').trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(limpo) ? [0, 2, 4].map((i) => parseInt(limpo.slice(i, i + 2), 16)) : null;
};

/** A cor de uma face e de onde ela veio: `cores` (o que se passou por parte), `face`, `material` ou `cinza`. */
export function corDaFace(face, materiais = {}, sobrepor = {}) {
  if (sobrepor[face.parte]) return { cor: sobrepor[face.parte], origem: 'cores' };
  if (rgbDoHex(face.cor)) return { cor: face.cor, origem: 'face' };
  const doMaterial = face.material ? materiais?.[face.material]?.cor : null;
  if (rgbDoHex(doMaterial)) return { cor: doMaterial, origem: 'material' };
  return { cor: CINZA, origem: 'cinza' };
}

/**
 * A cor de cada parte do neutro, a mais frequente entre as faces dela, com a origem: `{ nome: { cor, origem, faces } }`. A origem é
 * `misto` quando faces da mesma parte tiram a cor de lugares diferentes, e `cores` diz quantas cores distintas a parte tem.
 */
export function coresDasPartes(neutro, partes, sobrepor = {}) {
  const conta = new Map();
  for (const f of neutro.F.values()) {
    const { cor, origem } = corDaFace(f, neutro.materiais, sobrepor);
    if (!conta.has(f.parte)) conta.set(f.parte, { porCor: new Map(), origens: new Set(), faces: 0 });
    const c = conta.get(f.parte); c.faces += 1; c.origens.add(origem);
    c.porCor.set(cor.toLowerCase(), (c.porCor.get(cor.toLowerCase()) ?? 0) + 1);
  }
  const sai = {};
  for (const nome of [...new Set([...partes, ...conta.keys()])]) {
    const c = conta.get(nome);
    if (!c) { sai[nome] = { cor: sobrepor[nome] ?? CINZA, origem: sobrepor[nome] ? 'cores' : 'cinza', faces: 0, cores: 1 }; continue; }
    const [cor] = [...c.porCor.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    sai[nome ?? '(sem parte)'] = { cor, origem: c.origens.size > 1 ? 'misto' : [...c.origens][0], faces: c.faces, cores: c.porCor.size };
  }
  return sai;
}

/** As faces do neutro em mm, com a parte (o nome) e a cor resolvida de cada uma, na ordem dos ids. */
export function facesDaOpcao(neutro, sobrepor = {}) {
  return [...neutro.F.values()].sort((a, b) => a.id - b.id).map((f) => ({
    pts: f.vs.map((v) => neutro.V.get(v).map((c) => c * 1000)), parte: f.parte ?? '', cor: corDaFace(f, neutro.materiais, sobrepor).cor,
  }));
}

/* --- o raster sombreado --------------------------------------------------------------------------------------------------------- */
const paraLinear = (c) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
const paraSrgb = (x) => { const c = x <= 0.0031308 ? x * 12.92 : 1.055 * (x ** (1 / 2.4)) - 0.055; return Math.max(0, Math.min(255, Math.round(c * 255))); };
const chaveDoPonto = (parte, p) => `${parte}|${Math.round(p[0] * 1000)}|${Math.round(p[1] * 1000)}|${Math.round(p[2] * 1000)}`;

/** A normal de cada canto de cada face: a média, pesada pela área, das faces da mesma parte no mesmo ponto a menos de `liso` graus. */
export function normaisDosCantos(faces, liso = LISO_PADRAO) {
  const normal = faces.map((f) => {
    let n = [0, 0, 0];
    for (let i = 0; i < f.pts.length; i += 1) { const a = f.pts[i]; const b = f.pts[(i + 1) % f.pts.length]; n = [n[0] + (a[1] - b[1]) * (a[2] + b[2]), n[1] + (a[2] - b[2]) * (a[0] + b[0]), n[2] + (a[0] - b[0]) * (a[1] + b[1])]; }
    return { peso: n, u: unit(n) };
  });
  if (!(liso > 0)) return faces.map((f, i) => f.pts.map(() => normal[i].u));
  const porPonto = new Map();
  faces.forEach((f, i) => f.pts.forEach((p) => { const k = chaveDoPonto(f.parte, p); if (!porPonto.has(k)) porPonto.set(k, []); porPonto.get(k).push(i); }));
  const limite = Math.cos((liso * Math.PI) / 180);
  return faces.map((f, i) => f.pts.map((p) => {
    const lista = porPonto.get(chaveDoPonto(f.parte, p)); const u = normal[i].u;
    const s = [0, 0, 0]; const vistas = new Set();
    for (const j of lista) {
      if (vistas.has(j)) continue; vistas.add(j);
      if (dot(normal[j].u, u) < limite) continue;
      s[0] += normal[j].peso[0]; s[1] += normal[j].peso[1]; s[2] += normal[j].peso[2];
    }
    return Math.hypot(...s) > 1e-12 ? unit(s) : u;
  }));
}

/**
 * Desenha as faces sombreadas numa câmera ortográfica.
 * @param {Array<{ pts: number[][], parte: string|number, cor: string|number[] }>} faces  polígonos em mm, com a cor `#rrggbb` ou [r, g, b]
 * @param {{ vista?: string, direcao?: number[], base?: object, largura?: number, margem?: number, liso?: number, fundo?: number[], amostras?: number }} o
 *   `base` é a de `camera`; `margem` é a folga de cada lado, em fração do maior lado da caixa projetada do objeto
 * @returns {{ imagem, largura, altura, mmPorPx, caixa: { u0, u1, v0, v1 }, base, cobertura: number }}
 *   `caixa` é o quadro da imagem em mm na base da câmera; `cobertura` é a fração dos pixels com objeto
 */
export function rasterSombreado(faces, o = {}) {
  const base = o.base ?? camera(o.direcao ?? o.vista ?? 'frontal');
  const largura = o.largura ?? LARGURA_PADRAO; const margem = o.margem ?? MARGEM_PADRAO;
  const amostras = o.amostras ?? SUPERAMOSTRAGEM; const fundo = o.fundo ?? FUNDO_DO_PAINEL;
  if (!Number.isInteger(largura) || largura < 8) throw new ErroDaVista('a largura precisa ser um inteiro de pelo menos 8 px');
  if (!(margem >= 0 && margem < 2)) throw new ErroDaVista('a margem precisa estar entre 0 e 2');
  const { olhar, direita, cima } = base;
  let u0 = Infinity; let u1 = -Infinity; let v0 = Infinity; let v1 = -Infinity;
  const proj = faces.map((f) => f.pts.map((p) => {
    const u = dot(p, direita); const v = dot(p, cima);
    if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
    return [u, v, dot(p, olhar)];
  }));
  if (!faces.length || !(u1 > u0) || !(v1 > v0)) throw new ErroDaVista('a malha não tem área nesta vista');
  const folga = margem * Math.max(u1 - u0, v1 - v0);
  u0 -= folga; u1 += folga; v0 -= folga; v1 += folga;
  const mmPorPx = (u1 - u0) / largura;
  const altura = Math.max(1, Math.round((v1 - v0) / mmPorPx));
  /* centra a caixa na altura arredondada */
  const sobra = altura * mmPorPx - (v1 - v0); v0 -= sobra / 2; v1 += sobra / 2;
  const L = largura * amostras; const A = altura * amostras; const passo = mmPorPx / amostras;
  const prof = new Float32Array(L * A).fill(Infinity); const qual = new Int32Array(L * A).fill(-1);
  const nrm = new Float32Array(L * A * 3);
  const cantos = normaisDosCantos(faces, o.liso ?? LISO_PADRAO);
  faces.forEach((f, i) => {
    const q = proj[i].map(([u, v, d]) => [(u - u0) / passo, (v1 - v) / passo, d]); const nc = cantos[i];
    for (let t = 1; t < q.length - 1; t += 1) {
      const [a, b, c] = [q[0], q[t], q[t + 1]]; const [na, nb, ncc] = [nc[0], nc[t], nc[t + 1]];
      const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
      if (Math.abs(area) < 1e-9) continue;
      const xa = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))); const xb = Math.min(L - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      const ya = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))); const yb = Math.min(A - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      for (let y = ya; y <= yb; y += 1) for (let x = xa; x <= xb; x += 1) {
        const px = x + 0.5; const py = y + 0.5;
        const w0 = ((b[0] - px) * (c[1] - py) - (c[0] - px) * (b[1] - py)) / area;
        const w1 = ((c[0] - px) * (a[1] - py) - (a[0] - px) * (c[1] - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        const d = w0 * a[2] + w1 * b[2] + w2 * c[2]; const k = y * L + x;
        if (d < prof[k]) {
          prof[k] = d; qual[k] = i;
          nrm[k * 3] = w0 * na[0] + w1 * nb[0] + w2 * ncc[0]; nrm[k * 3 + 1] = w0 * na[1] + w1 * nb[1] + w2 * ncc[1]; nrm[k * 3 + 2] = w0 * na[2] + w1 * nb[2] + w2 * ncc[2];
        }
      }
    }
  });
  /* a luz: difusa de cima, da esquerda e de frente do observador, mais ambiente; a face de costas é acesa pelo lado que se vê */
  const paraCamera = olhar.map((x) => -x);
  const luz = unit([0, 1, 2].map((k) => LUZ.direita * direita[k] + LUZ.cima * cima[k] + LUZ.frente * paraCamera[k]));
  const corLinear = faces.map((f) => (Array.isArray(f.cor) ? f.cor : (rgbDoHex(f.cor) ?? rgbDoHex(CINZA))).map(paraLinear));
  const fundoLinear = fundo.map(paraLinear);
  const im = imagem(largura, altura, fundo);
  let cheios = 0;
  for (let y = 0; y < altura; y += 1) for (let x = 0; x < largura; x += 1) {
    const s = [0, 0, 0]; let com = 0;
    for (let dy = 0; dy < amostras; dy += 1) for (let dx = 0; dx < amostras; dx += 1) {
      const k = (y * amostras + dy) * L + x * amostras + dx; const i = qual[k];
      if (i < 0) { s[0] += fundoLinear[0]; s[1] += fundoLinear[1]; s[2] += fundoLinear[2]; continue; }
      com += 1;
      let n = unit([nrm[k * 3], nrm[k * 3 + 1], nrm[k * 3 + 2]]);
      if (dot(n, paraCamera) < 0) n = n.map((c) => -c);
      const e = LUZ.ambiente + LUZ.difusa * Math.max(0, dot(n, luz));
      const c = corLinear[i]; s[0] += c[0] * e; s[1] += c[1] * e; s[2] += c[2] * e;
    }
    if (com * 2 >= amostras * amostras) cheios += 1;
    const o3 = (y * largura + x) * 3; const n2 = amostras * amostras;
    im.dados[o3] = paraSrgb(s[0] / n2); im.dados[o3 + 1] = paraSrgb(s[1] / n2); im.dados[o3 + 2] = paraSrgb(s[2] / n2);
  }
  return { imagem: im, largura, altura, mmPorPx, caixa: { u0, u1, v0, v1 }, base, cobertura: cheios / (largura * altura) };
}

/* --- linha de comando ----------------------------------------------------------------------------------------------------------- */
const AJUDA = `npm run vista:rapida -- <esboço> --vista=<vista> --saida=<png> [--opcao=1] [--largura=${LARGURA_PADRAO}] [--margem=${MARGEM_PADRAO}]
    [--cores=parte:#rrggbb,...] [--direcao=x,y,z] [--liso=${LISO_PADRAO}]

Desenha a opção sombreada numa câmera ortográfica, sem navegador, sobre o fundo do painel da folha do esboço: a imagem de trabalho
de quem conduz e do crítico, que leitura:regioes --captura=<png> aceita sem --painel. A imagem que vai à pessoa sai da bancada.
--direcao (do objeto para a câmera) vale no lugar de --vista; --liso=0 deixa toda face chapada.`;

/** Os argumentos lidos e conferidos; argumento ruim lança `ErroDaVista`. */
export function lerArgumentos(argv) {
  const valor = (nome) => { const a = argv.find((x) => x.startsWith(`--${nome}=`)); return a === undefined ? null : a.slice(nome.length + 3); };
  const arquivo = argv.find((a) => !a.startsWith('--'));
  if (!arquivo) throw new ErroDaVista('falta o arquivo do esboço');
  if (!valor('saida')) throw new ErroDaVista('falta --saida=<png>');
  if (!valor('vista') && !valor('direcao')) throw new ErroDaVista('falta --vista=<vista> ou --direcao=x,y,z');
  let direcao = null;
  if (valor('direcao')) {
    direcao = valor('direcao').split(',').map(Number);
    if (direcao.length !== 3 || !direcao.every(Number.isFinite) || Math.hypot(...direcao) < 1e-9) throw new ErroDaVista('--direcao espera três números separados por vírgula, não todos zero');
  }
  const vista = valor('vista');
  if (vista && !VISTAS_BANCADA[vista]) throw new ErroDaVista(`vista "${vista}" não existe na bancada (${Object.keys(VISTAS_BANCADA).join(', ')})`);
  const inteiro = (nome, padrao, minimo) => {
    const v = valor(nome); if (v === null) return padrao;
    const n = Number(v); if (!Number.isInteger(n) || n < minimo) throw new ErroDaVista(`--${nome} espera um inteiro de pelo menos ${minimo}`);
    return n;
  };
  const numero = (nome, padrao, ok, texto) => {
    const v = valor(nome); if (v === null) return padrao;
    const n = Number(v); if (!Number.isFinite(n) || !ok(n)) throw new ErroDaVista(`--${nome} espera ${texto}`);
    return n;
  };
  const cores = {};
  if (valor('cores')) {
    for (const par of valor('cores').split(',')) {
      const [nome, cor, ...resto] = par.split(':');
      if (!nome || resto.length || !rgbDoHex(cor) || !String(cor).startsWith('#')) throw new ErroDaVista(`--cores espera parte:#rrggbb separados por vírgula, e "${par}" não é assim`);
      cores[nome] = cor;
    }
  }
  return {
    arquivo, saida: valor('saida'), vista, direcao, cores,
    opcao: inteiro('opcao', 1, 1), largura: inteiro('largura', LARGURA_PADRAO, 8),
    margem: numero('margem', MARGEM_PADRAO, (n) => n >= 0 && n < 2, 'um número entre 0 e 2'),
    liso: numero('liso', LISO_PADRAO, (n) => n >= 0 && n < 180, 'graus entre 0 e 180'),
  };
}

export async function executar(argv) {
  if (argv.includes('--ajuda') || argv.includes('--help') || argv.length === 0) return { codigo: 0, stdout: `${AJUDA}\n`, stderr: '' };
  let a;
  try { a = lerArgumentos(argv); } catch (e) {
    if (e instanceof ErroDaVista) return { codigo: 2, stdout: '', stderr: `vista:rapida: ${e.message}\n` };
    throw e;
  }
  const { lerArquivoDeEsboco, montarOpcoes } = await import('./esboco-nucleo.mjs');
  const t0 = performance.now();
  let montado;
  try { montado = montarOpcoes(await lerArquivoDeEsboco(resolve(a.arquivo)), { nome: basename(a.arquivo), relato: false }); } catch (e) {
    if (e?.code === 'ENOENT' || e?.code === 'ERR_MODULE_NOT_FOUND') return { codigo: 2, stdout: '', stderr: `vista:rapida: não achei ${a.arquivo}\n` };
    if (e instanceof SyntaxError) return { codigo: 1, stdout: '', stderr: `vista:rapida: o esboço não se lê: ${e.message}\n` };
    throw e;
  }
  if (montado.recusas?.length) {
    const texto = montado.recusas.map((r) => (typeof r === 'string' ? r : [r.opcao, r.forma, r.motivo].filter(Boolean).join(': '))).map((r) => `- ${r}`).join('\n');
    return { codigo: 1, stdout: '', stderr: `vista:rapida: o esboço foi recusado:\n${texto}\n` };
  }
  const painel = montado.paineis[a.opcao - 1];
  if (!painel) return { codigo: 2, stdout: '', stderr: `vista:rapida: o esboço tem ${montado.paineis.length} opções\n` };
  const desconhecidas = Object.keys(a.cores).filter((n) => !painel.partes.includes(n));
  if (desconhecidas.length) return { codigo: 2, stdout: '', stderr: `vista:rapida: --cores cita parte que a opção não tem: ${desconhecidas.join(', ')} (tem ${painel.partes.join(', ')})\n` };
  const t1 = performance.now();
  const r = rasterSombreado(facesDaOpcao(painel.neutro, a.cores), { vista: a.vista, direcao: a.direcao, largura: a.largura, margem: a.margem, liso: a.liso });
  const saida = resolve(a.saida);
  writeFileSync(saida, paraPng(r.imagem));
  const t2 = performance.now();
  const cores = coresDasPartes(painel.neutro, painel.partes, a.cores);
  const legenda = Object.entries(cores).map(([n, c]) => `${n} ${c.cor} (${c.origem}${c.cores > 1 ? `, ${c.cores} cores` : ''})`).join(', ');
  return {
    codigo: 0,
    stdout: `${r.largura} x ${r.altura} px, ${r.mmPorPx.toFixed(2)} mm por px\ncores: ${legenda}\nmontagem ${((t1 - t0) / 1000).toFixed(1)} s, desenho ${((t2 - t1) / 1000).toFixed(1)} s\n${saida}\n`,
    stderr: '',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await executar(process.argv.slice(2));
  process.stdout.write(r.stdout); process.stderr.write(r.stderr); process.exitCode = r.codigo;
}
