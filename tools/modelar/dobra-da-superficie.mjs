#!/usr/bin/env node
/* dobra-da-superficie.mjs — acha onde a superfície de subdivisão de uma receita dobra com diedro agudo fora de vinco declarado, e diz a
 * parte, o lugar e o ângulo.
 *
 * POR QUE ELE EXISTE. A aba torta com uma aresta fina que um trecho some entre dois laços a 0,2 mm deixa (o pé do filete do cotovelo do
 * braço, 2026-11-08) tem as normais das duas faces da aresta a 89 graus uma da outra: a ondulação mede calombo e emenda, e a face
 * virada só passa de 90 graus, de modo que nenhuma das duas régua a vê, nem a medida de contato. Esta lê a malha que a receita entrega,
 * sem referência externa, e dá cada dobra com a parte, a posição, o diedro e o ponto da gaiola que fica mais perto.
 *
 * COMO MEDE. A receita roda como nas ferramentas oficiais e cada passo `subdivisao` tem a superfície refeita como em
 * `ondulacao-da-superficie.mjs`, com as posições que o estado da receita deu aos vértices. Em cada aresta de duas faces que não
 * descende de vinco declarado (nenhuma de nitidez maior que zero) o diedro é 180 graus menos o ângulo entre as normais das duas
 * faces: 180 é a superfície lisa, 90 é uma quina reta, e abaixo disso a superfície se dobra sobre si. A aresta com diedro abaixo de
 * `diedroMinimoGraus` é dobra; as que se tocam formam uma só, com o menor diedro, a posição da pior aresta, a extensão e a parte (a
 * que as faces da aresta declaram). A borda livre e o vinco, de qualquer nitidez, não entram: ali a dobra é da forma.
 *
 * Mesma receita, mesma saída: nenhuma conta depende de relógio, acaso ou ordem de mapa. Não é gate: a pessoa decide o limiar e onde ligá-la.
 *
 *   node tools/modelar/dobra-da-superficie.mjs <peça> [--diedro-minimo=120]
 */
import { pathToFileURL } from 'node:url';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { criarResolverNumerico } from '../../procedural/nucleo/expressoes.js';
import { idDoPasso } from '../../procedural/nucleo/nucleo.js';
import { gaiolaDoPasso } from '../../procedural/nucleo/operacoes/subdivisao.js';
import { subdividirCatmullClark } from '../../procedural/nucleo/subdivisao.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

/* Diedro (graus) abaixo do qual a aresta fora de vinco é dobra. 120 é uma virada de 60 graus entre as normais. */
export const PADROES = Object.freeze({ diedroMinimoGraus: 120 });
const MM = 1000;
const arred = (x, casas = 2) => { const f = 10 ** casas; const r = Math.round(x * f) / f; return Object.is(r, -0) ? 0 : r; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const operacaoDe = (passo) => (Array.isArray(passo) ? passo[0] : passo?.op);
const argumentosDe = (passo) => (Array.isArray(passo) ? passo[1] ?? {} : passo ?? {});

function newell(pts) {
  const n = [0, 0, 0];
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k]; const b = pts[(k + 1) % pts.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

/* As superfícies dos passos `subdivisao` da receita: vértices em metro, faces, arestas de vinco, a parte de cada vértice e o ponto da gaiola. */
export function superficiesDaReceita(receita) {
  const { entrada, neutro } = executarReceita(receita);
  const dict = { ...entrada.PARAMS, ...entrada.TOPO };
  const { num } = criarResolverNumerico(dict);
  const vec = (a) => (typeof a === 'string' ? dict[a] : a).map(num);
  const partesDoId = new Map();
  for (const face of neutro.F.values()) {
    if (typeof face.parte !== 'string') continue;
    for (const v of face.vs) { if (!partesDoId.has(v)) partesDoId.set(v, new Set()); partesDoId.get(v).add(face.parte); }
  }
  const lista = [];
  (entrada.PASSOS ?? []).forEach((passo, i) => {
    const args = argumentosDe(passo);
    if (operacaoDe(passo) !== 'subdivisao') return;
    const resolvida = gaiolaDoPasso(args, { vec, num });
    if (resolvida.erro) throw new Error(`dobra: o passo ${i} (subdivisao) não resolve a gaiola: ${resolvida.erro[1]}`);
    const { gaiola, declarados } = resolvida;
    const niveis = Math.trunc(num(args.niveis ?? 2));
    const r = subdividirCatmullClark({ ...gaiola, niveis, borda: args.borda ?? 'suave', aoLimite: args.medidas != null, comVincos: true });
    /* o vértice que um passo posterior tirou (uma booleana, um corte) deixa a face dele de fora da medida: ali a malha entregue é outra */
    const vertices = []; const partes = [];
    r.vertices.forEach((_, k) => {
      const id = idDoPasso(i, k);
      const p = neutro.V.get(id);
      vertices.push(p ? [...p] : null); partes.push(partesDoId.get(id) ?? new Set());
    });
    const inteira = (f) => f.every((v) => vertices[v]);
    const faces = r.faces.filter(inteira);
    const origem = gaiola.vertices.map((_, k) => k);
    if (gaiola.imagem) gaiola.imagem.forEach((k, j) => { origem[k] = j; });
    const nomeDe = (j) => { const d = declarados[origem[j]]; return typeof d === 'string' ? d : null; };
    lista.push({ passo: i, vertices, faces, facesTiradas: r.faces.length - faces.length, vincos: r.vincos, partes, gaiola, nomeDe });
  });
  return lista;
}

/** dobraDaSuperficie(sup, opcoes) -> { arestas, dobras: [{ parte, posicaoMm, diedroGraus, arestas, extensaoMm, pertoDe }] }, a pior primeiro */
export function dobraDaSuperficie(sup, opcoes = {}) {
  const o = { ...PADROES, ...opcoes };
  const V = sup.vertices; const F = sup.faces; const nV = V.length;
  const chave = (a, b) => (a < b ? a * nV + b : b * nV + a);
  const declarada = new Set(sup.vincos.map(([a, b]) => chave(a, b)));
  const arestas = new Map();
  F.forEach((f, fi) => f.forEach((a, k) => {
    const b = f[(k + 1) % f.length]; const c = chave(a, b);
    if (!arestas.has(c)) arestas.set(c, { a: Math.min(a, b), b: Math.max(a, b), faces: [] });
    arestas.get(c).faces.push(fi);
  }));
  const normais = F.map((f) => newell(f.map((v) => V[v])));
  const modulo = normais.map((n) => Math.hypot(...n));
  const achadas = [];
  for (const [c, e] of [...arestas].sort((x, y) => x[0] - y[0])) {
    if (declarada.has(c) || e.faces.length !== 2) continue;
    const [f, g] = e.faces;
    if (modulo[f] < 1e-18 || modulo[g] < 1e-18) continue;
    const cos = (normais[f][0] * normais[g][0] + normais[f][1] * normais[g][1] + normais[f][2] * normais[g][2]) / (modulo[f] * modulo[g]);
    const diedro = 180 - (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
    if (diedro < o.diedroMinimoGraus) achadas.push({ e, diedro });
  }
  /* as arestas que se tocam formam uma dobra só */
  const porVertice = new Map();
  achadas.forEach((x, k) => { for (const v of [x.e.a, x.e.b]) { if (!porVertice.has(v)) porVertice.set(v, []); porVertice.get(v).push(k); } });
  const visto = new Uint8Array(achadas.length);
  const dobras = [];
  for (let k0 = 0; k0 < achadas.length; k0++) {
    if (visto[k0]) continue;
    const fila = [k0]; visto[k0] = 1;
    for (let q = 0; q < fila.length; q++) for (const v of [achadas[fila[q]].e.a, achadas[fila[q]].e.b]) for (const k of porVertice.get(v)) if (!visto[k]) { visto[k] = 1; fila.push(k); }
    const pior = fila.reduce((m, k) => (achadas[k].diedro < achadas[m].diedro ? k : m), fila[0]);
    const { e } = achadas[pior];
    const meio = [0, 1, 2].map((j) => (V[e.a][j] + V[e.b][j]) / 2);
    const partes = new Set(); for (const v of [e.a, e.b]) for (const p of sup.partes[v]) partes.add(p);
    let perto = null; let menor = Infinity;
    sup.gaiola.vertices.forEach((p, j) => { const d = dist(p, meio); const nome = sup.nomeDe(j); if (nome && d < menor) { menor = d; perto = nome; } });
    dobras.push({
      parte: [...partes].sort().join('+') || null,
      posicaoMm: meio.map((x) => arred(x * MM, 1)),
      diedroGraus: arred(achadas[pior].diedro),
      arestas: fila.length,
      extensaoMm: arred(fila.reduce((s, k) => s + dist(V[achadas[k].e.a], V[achadas[k].e.b]), 0) * MM, 1),
      pertoDe: perto,
    });
  }
  dobras.sort((x, y) => x.diedroGraus - y.diedroGraus || x.posicaoMm[0] - y.posicaoMm[0] || x.posicaoMm[1] - y.posicaoMm[1] || x.posicaoMm[2] - y.posicaoMm[2]);
  return { arestas: arestas.size, dobras };
}

/** dobraDaReceita(receita, opcoes) -> { opcoes, superficies: [{ passo, ...dobraDaSuperficie }], dobras } */
export function dobraDaReceita(receita, opcoes = {}) {
  const o = { ...PADROES, ...opcoes };
  const superficies = superficiesDaReceita(receita).map((sup) => ({ passo: sup.passo, facesTiradas: sup.facesTiradas, ...dobraDaSuperficie(sup, o) }));
  return { opcoes: o, superficies, dobras: superficies.reduce((s, x) => s + x.dobras.length, 0) };
}

/** A frase de cada dobra, para o relato de quem chama. */
export function textoDaDobra(d) {
  return `dobra na parte ${d.parte ?? 'sem parte'}, em [${d.posicaoMm.join('; ')}] mm, perto do ponto ${d.pertoDe ?? 'sem nome'} da gaiola: diedro de ${String(d.diedroGraus).replace('.', ',')} graus em ${d.arestas} aresta(s), ${String(d.extensaoMm).replace('.', ',')} mm`;
}

function lerOpcoes(args) {
  const o = {};
  for (const a of args) {
    const m = /^--diedro-minimo=(.+)$/.exec(a);
    if (!m || !Number.isFinite(Number(m[1]))) throw new Error(`argumento desconhecido: ${a}`);
    o.diedroMinimoGraus = Number(m[1]);
  }
  return o;
}

async function principal(argv) {
  const [alvo, ...resto] = argv.slice(2);
  if (!alvo) { process.stderr.write('uso: node tools/modelar/dobra-da-superficie.mjs <peça> [--diedro-minimo=120]\n'); return 2; }
  const caminho = resolverCaminhoReceita(alvo);
  if (!caminho) { process.stderr.write(`dobra: não achei a receita '${alvo}'.\n`); return 2; }
  const receita = receitaDoModulo(await importarReceita(caminho));
  const resultado = dobraDaReceita(receita, lerOpcoes(resto));
  process.stdout.write(`${JSON.stringify({ peca: alvo, ...resultado }, null, 2)}\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((codigo) => { process.exitCode = codigo; }, (erro) => { process.stderr.write(`${erro.message}\n`); process.exitCode = 1; });
}
