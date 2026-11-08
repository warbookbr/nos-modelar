#!/usr/bin/env node
/* medir.mjs — as medidas da peça de prova "união de dois tubos" (`receita.js`).
 *
 * As réguas de superfície (`dobra-da-superficie.mjs`, `vinco-oculto.mjs`, `ondulacao-da-superficie.mjs`) só leem a malha de um passo `subdivisao`,
 * que a união de dois sólidos não tem: chamadas pela linha de comando sobre esta receita elas devolvem `superficies: []` e zero achados, o que não
 * prova nada. Aqui a malha que a receita entrega (partes `tubos` e `disco`) é entregue às mesmas funções das réguas, como uma superfície sem vincos
 * declarados, e o que elas acham sai com a posição. Nenhuma régua é alterada.
 *
 *   node tools/fixtures/uniao-de-tubos/medir.mjs [--imagem=<png>] [--vista=iso|frontal|direita|superior] */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { dobraDaSuperficie } from '../../modelar/dobra-da-superficie.mjs';
import { ondulacaoDaSuperficie } from '../../modelar/ondulacao-da-superficie.mjs';
import { desenharAchados, vincoOcultoDaSuperficie } from '../../modelar/vinco-oculto.mjs';
import receitaBase, { TABELA, gerarPassos } from './receita.js';

const MM = 1000;
const arred = (x, casas = 2) => { const f = 10 ** casas; const r = Math.round(x * f) / f; return Object.is(r, -0) ? 0 : r; };

/** superficieDaMalha(neutro, parte) -> a malha da parte como a superfície que as réguas leem, sem vinco declarado */
export function superficieDaMalha(neutro, parte = null, quinaGraus = 85) {
  const indice = new Map(); const vertices = []; const faces = []; const partes = [];
  const de = (id, nome) => {
    if (!indice.has(id)) { indice.set(id, vertices.length); vertices.push([...neutro.V.get(id)]); partes.push(new Set()); }
    partes[indice.get(id)].add(nome);
    return indice.get(id);
  };
  for (const f of neutro.F.values()) {
    if (parte && f.parte !== parte) continue;
    faces.push(f.vs.map((v) => de(v, f.parte)));
  }
  /* as quinas vivas de desenho (a borda das tampas, a costura da base com o disco, a borda de baixo do disco) entram como vinco declarado: as arestas
     entre faces a pelo menos `quinaGraus` uma da outra. O que fica entre as facetas de um tubo (3,75 graus) e a quina reta é a malha do encontro. */
  const newell = (f) => {
    const n = [0, 0, 0];
    for (let k = 0; k < f.length; k++) { const a = vertices[f[k]]; const b = vertices[f[(k + 1) % f.length]]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
    const l = Math.hypot(...n); return l < 1e-18 ? null : n.map((x) => x / l);
  };
  const normais = faces.map(newell); const porAresta = new Map();
  faces.forEach((f, i) => f.forEach((a, k) => { const b = f[(k + 1) % f.length]; const c = a < b ? `${a},${b}` : `${b},${a}`; if (!porAresta.has(c)) porAresta.set(c, []); porAresta.get(c).push(i); }));
  const vincos = [];
  for (const [c, fs] of porAresta) {
    if (fs.length !== 2 || !normais[fs[0]] || !normais[fs[1]]) continue;
    const cos = normais[fs[0]][0] * normais[fs[1]][0] + normais[fs[0]][1] * normais[fs[1]][1] + normais[fs[0]][2] * normais[fs[1]][2];
    if ((Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI >= quinaGraus) vincos.push(c.split(',').map(Number));
  }
  const gaiola = { vertices, faces, vincos: [], cantos: [] };
  return { passo: null, origemId: null, niveis: 0, borda: 'suave', vertices, faces, vincos, partes, gaiola, calculados: vertices, origem: vertices.map((_, k) => k), nomeDe: () => null, origemDe: () => null, declarados: [], avisos: [] };
}

/** Os vértices da parte à altura dada, a menos de `tol` mm, com o raio ao eixo y: o anel que o tubo em pé tem em y = 0. */
export function aneisEmY(neutro, parte, y, tol = 1e-3) {
  const pontos = new Map();
  for (const f of neutro.F.values()) {
    if (f.parte !== parte) continue;
    for (const v of f.vs) { const p = neutro.V.get(v); if (Math.abs(p[1] * MM - y) <= tol) pontos.set(v, p.map((c) => c * MM)); }
  }
  return [...pontos.values()];
}

/** medirTubos({ tabela, ondulacao }) -> as medidas; `tabela` muda campos da TABELA da receita (por exemplo { lados: 192 }) */
export function medirTubos(opcoes = {}) {
  const T = { ...TABELA, ...(opcoes.tabela ?? {}) };
  const receita = { ...receitaBase, PARAMS: T, PASSOS: gerarPassos(T) };
  const { neutro } = executarReceita(receita);
  const sup = superficieDaMalha(neutro);
  const dobra = dobraDaSuperficie(sup);
  const vinco = vincoOcultoDaSuperficie(sup);
  /* a ondulação é a régua lenta (uns 16 s): quem não a quer passa `ondulacao: false` */
  const onda = opcoes.ondulacao === false ? null : ondulacaoDaSuperficie(sup);
  /* a base do tubo em pé: os vértices de y = 0 da parte `tubos` num círculo de raio R, e os do topo do disco nos mesmos pontos */
  const pe = aneisEmY(neutro, 'tubos', 0); const disco = aneisEmY(neutro, 'disco', 0);
  const raios = pe.map((p) => Math.hypot(p[0], p[2])).filter((r) => r > 1);
  const anguloDe = (p) => { const a = (Math.atan2(p[2], p[0]) * 180) / Math.PI; return Math.round((a + 360) % 360 * 1000) / 1000; };
  const doPe = new Set(pe.filter((p) => Math.hypot(p[0], p[2]) > T.raio - 0.01).map(anguloDe));
  const doDisco = new Set(disco.filter((p) => Math.hypot(p[0], p[2]) > T.raio - 0.01).map(anguloDe));
  const rente = [...doPe].every((a) => doDisco.has(a));
  const base = {
    lados: T.lados, verticesNoAnel: doPe.size, raioMinimoMm: arred(Math.min(...raios), 3), raioMaximoMm: arred(Math.max(...raios), 3),
    anelDoDiscoIgual: rente, anelCompleto: doPe.size === T.lados,
  };
  return { neutro, sup, dobra, vinco, onda, base, desenho: [{ sup, segmentos: vinco.segmentos }] };
}

const porTipo = (falhas) => falhas.reduce((t, f) => ({ ...t, [f.tipo]: (t[f.tipo] ?? 0) + 1 }), {});

function principal(argv) {
  let imagem = null; let vista = 'iso';
  for (const a of argv.slice(2)) {
    const m = /^--([a-z]+)=(.+)$/.exec(a);
    if (m && m[1] === 'imagem') imagem = m[2]; else if (m && m[1] === 'vista') vista = m[2]; else throw new Error(`argumento desconhecido: ${a}`);
  }
  const r = medirTubos();
  const { segmentos, ...vinco } = r.vinco;
  const resumo = {
    orfaos: r.neutro.orfaos.length,
    dobras: r.dobra.dobras.length, dobrasDaMalha: r.dobra.dobras.slice(0, 12),
    vincos: vinco.vincos.length, chanfros: vinco.chanfros.length, achadosDeVinco: [...vinco.vincos, ...vinco.chanfros].slice(0, 12),
    ondulacao: { falhas: r.onda.falhas.length, porTipo: porTipo(r.onda.falhas), desvioMm: r.onda.desvioMm, junto: r.onda.junto?.length ?? 0, maiorAmplitudeMm: Math.max(0, ...r.onda.falhas.map((f) => f.amplitudeMm)) },
    base: r.base,
  };
  if (imagem) writeFileSync(imagem, PNG.sync.write(desenharAchados(r.desenho, { vista })));
  process.stdout.write(`${JSON.stringify(resumo, null, 2)}\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = principal(process.argv);
