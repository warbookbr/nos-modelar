#!/usr/bin/env node
/* continuidade-nas-emendas.mjs — percorre as linhas onde dois trechos da chapa se encontram e mede, ponto a ponto, a fresta (mm), o ângulo
 * entre as normais dos dois lados (graus) e a razão entre as curvaturas dos dois lados, em números e numa imagem com a emenda colorida.
 *
 * POR QUE ELE EXISTE. A zebra mostra a emenda por imagem (a faixa que pula é um degrau, a que dobra é um vinco, a que muda de largura é
 * uma quebra de curvatura), e é o único lugar em que a zebra vê o que o mapa de desvio não vê, porque o ajuste liso do mapa atravessa a
 * emenda. Esta ferramenta dá o mesmo em números: G0 (posição: a fresta), G1 (tangente: o ângulo) e G2 (curvatura: a razão), em cada ponto.
 *
 * O QUE É UMA EMENDA. A malha que a receita entrega carrega, por face, a `parte` e, pela procedência do neutro (`neutro.procedencia.faces`),
 * o passo que criou a face (a origem). Ela NÃO carrega as curvas declaradas da gaiola: a `subdivisao` não marca no neutro as arestas que
 * descendem de um vinco (só a marca de sombra dos vincos vivos), e por isso a curva da gaiola fica fora até o núcleo a marcar. Escolha:
 * o trecho de uma face é o seu GRUPO, por `--por=parte` (padrão), `--por=origem` (o passo que a criou) ou `--por=ambos`; a emenda é a
 * linha onde faces de grupos diferentes se encontram, de dois jeitos:
 *   - aresta comum: a aresta da malha tem uma face de cada grupo, e as duas normais concordam (cosseno acima de 0,5);
 *   - bordas vizinhas: a aresta é borda do seu trecho liso (nenhuma face que concorde com ela do outro lado; a quina da espessura não
 *     concorda) e passa a até `--alcance` mm (padrão 10) da borda de um trecho de outro grupo cuja face concorde com a dela. É o caso de
 *     duas chapas que não se soldam (o degrau, a fresta).
 * Cada emenda é um par de grupos e uma cadeia de arestas encadeadas; as amostras são os vértices da cadeia, do lado A (o grupo de nome
 * menor na ordem do texto). A casca de duas peles entra com `--lado` (a mesma regra de `mapa-de-desvio.mjs`); sem ele as duas peles dão
 * cada uma as suas emendas, e um lado nunca mistura a pele de fora com a de dentro, porque só entram vértices de normal que concorda.
 *
 * COMO MEDE, em cada amostra p do lado A (o ponto correspondente do lado B, pB, é p na aresta comum e o ponto mais perto da borda de B
 * nas bordas vizinhas):
 *   - fresta = |pB - p| em mm, decomposta em desnível (ao longo da normal de A, com sinal: negativo é B para dentro) e folga (no plano);
 *   - cada lado tem um AJUSTE DE UM LADO SÓ: um polinômio de grau 2 da altura sobre o plano tangente, por mínimos quadrados, nos vértices
 *     daquele grupo a até `--raio` mm (padrão 50) do ponto, de normal que concorda com a da face da emenda, com dois reajustes do plano;
 *     o ajuste dá a normal e a forma fundamental no ponto da emenda, sem misturar os dois lados;
 *   - ângulo = o ângulo entre as normais dos dois ajustes, em graus;
 *   - curvatura de cada lado = a curvatura normal do ajuste na direção que atravessa a emenda (perpendicular à emenda no plano tangente),
 *     em 1/m, positiva convexa (o centro de curvatura para dentro da pele);
 *   - razão = |k| maior / max(|k| menor, piso), com piso de 0,1 1/m (dois lados quase planos não dão razão grande por divisão por quase
 *     zero); o salto |kA - kB| em 1/m também sai.
 * Uma amostra ACUSA quando a fresta passa de `--limiar-fresta` (0,2 mm), o ângulo de `--limiar-angulo` (1 grau), ou a razão de
 * `--limiar-razao` (1,5) com o salto acima de 0,3 1/m. Numa emenda lisa os três ficam em zero, zero e 1. As chapas de calibração
 * (`tools/fixtures/reflexo-calibracao/`, degrau de 1,5 mm, vinco de 6 graus, quebra de curvatura de razão 3, e a lisa) provam a régua no
 * teste: acha cada um no lugar declarado, dentro de 10%, e nada na lisa.
 *
 * O QUE ELE DIZ. JSON na saída padrão: por emenda, os dois lados, o tipo, o comprimento, os máximos (valor, ponto e s em mm) e as medianas,
 * a contagem de amostras que acusam, e as amostras `[s, x, y, z, fresta, desnivel, angulo, kA, kB, razao]` (null onde o ajuste de um
 * lado não teve vértices bastantes). A imagem é a malha em cinza na vista pedida com cada emenda por cima, colorida por `--cor=angulo`
 * (padrão), `razao` ou `fresta`, com a barra de escala; a emenda é desenhada por cima da malha, também onde a vista a esconderia.
 *
 * Uso: node tools/modelar/continuidade-nas-emendas.mjs <peça> [--opcao=<n>] [--lado=<+z|-z|+x|-x|+y|-y|centro>] [--por=<parte|origem|ambos>]
 *        [--raio=<mm>] [--alcance=<mm>] [--limiar-fresta=<mm>] [--limiar-angulo=<graus>] [--limiar-razao=<n>] [--cor=<angulo|razao|fresta>]
 *        [--escala=<valor>] [--vista=<isometrica|isometrica-traseira|frontal|traseira|direita|esquerda|superior|inferior>] [--amostras=nao] [--saida=<png>]
 *   (também `npm run emendas -- <peça> ...`). A imagem vai para `--saida` (padrão tmp/continuidade-nas-emendas/<peça>.png) e o JSON, para a
 *   saída padrão; `--amostras=nao` deixa as amostras fora do JSON. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { ErroDeEntrada, lerEntradaDeMedida, opcaoDaLinha } from './entrada-de-medida.mjs';
import { TINTA, VISTAS, baseDaVista, numeroRedondo } from './imagem-de-medida.mjs';
import { malhaDoNeutro, pintarMalha, selecionarLado } from './mapa-de-desvio.mjs';

export const PADROES = Object.freeze({ raioMm: 50, alcanceMm: 10, limiarFrestaMm: 0.2, limiarAnguloGraus: 1, limiarRazao: 1.5, saltoMinimo: 0.3, piso: 0.1 });
const CONCORDA = 0.5;

/* ---------- vetores ---------- */

const pto = (P, i) => [P[3 * i], P[3 * i + 1], P[3 * i + 2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const m = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / m, a[1] / m, a[2] / m]; };
const r3 = (x, k = 1000) => (x === null || !Number.isFinite(x) ? null : Math.round(x * k) / k);

/* ---------- os grupos e a geometria das faces ---------- */

/** A malha (como `malhaDoNeutro`) com o grupo de cada face por `por` (`parte`, `origem` ou `ambos`), a normal unitária, a área e o centro. */
export function malhaComGrupos(neutro, { por = 'parte' } = {}) {
  if (!['parte', 'origem', 'ambos'].includes(por)) throw new Error(`--por: '${por}' não vale; use parte, origem ou ambos`);
  const malha = malhaDoNeutro(neutro);
  const origem = new Map();
  for (const [id, eventos] of neutro.procedencia?.faces ?? []) if (eventos?.length) origem.set(id, `${eventos[0].passo}-${String(eventos[0].operacao).replace(/^.*\./, '')}`);
  const ids = [...neutro.F.values()].map((f) => f.id);
  const grupos = malha.partes.map((parte, k) => {
    const o = `origem ${origem.get(ids[k]) ?? '?'}`;
    return por === 'parte' ? (parte ?? '(sem parte)') : por === 'origem' ? o : `${parte ?? '(sem parte)'} / ${o}`;
  });
  const { P, faces } = malha;
  const normais = []; const areas = []; const centros = [];
  for (const f of faces) {
    let n = [0, 0, 0]; const c = [0, 0, 0];
    for (let k = 0; k < f.length; k++) {
      const a = pto(P, f[k]); const b = pto(P, f[(k + 1) % f.length]);
      n = [n[0] + (a[1] - b[1]) * (a[2] + b[2]), n[1] + (a[2] - b[2]) * (a[0] + b[0]), n[2] + (a[0] - b[0]) * (a[1] + b[1])];
      for (let q = 0; q < 3; q++) c[q] += a[q] / f.length;
    }
    const m = Math.hypot(...n); areas.push(m / 2); normais.push(m ? n.map((x) => x / m) : [0, 0, 0]); centros.push(c);
  }
  return { ...malha, grupos, normais, areas, centros, por };
}

/** Um índice espacial de vértices por grupo: `vizinhos(grupo, ponto, raio)` dá os vértices do grupo a até `raio` mm. */
export function indiceDosGrupos(malha, selFace, raio) {
  const { P, faces, grupos } = malha; const C = raio;
  const porGrupo = new Map();
  faces.forEach((f, k) => {
    if (!selFace[k]) return;
    if (!porGrupo.has(grupos[k])) porGrupo.set(grupos[k], new Set());
    const s = porGrupo.get(grupos[k]); for (const v of f) s.add(v);
  });
  const hashes = new Map();
  for (const [g, s] of porGrupo) {
    const h = new Map();
    for (const v of s) { const k = `${Math.floor(P[3 * v] / C)}|${Math.floor(P[3 * v + 1] / C)}|${Math.floor(P[3 * v + 2] / C)}`; if (!h.has(k)) h.set(k, []); h.get(k).push(v); }
    hashes.set(g, h);
  }
  return {
    porGrupo,
    vizinhos(g, p, r = raio) {
      const h = hashes.get(g); if (!h) return [];
      const a = Math.ceil(r / C); const [cx, cy, cz] = p.map((x) => Math.floor(x / C)); const out = [];
      for (let i = -a; i <= a; i++) for (let j = -a; j <= a; j++) for (let k = -a; k <= a; k++) {
        for (const v of h.get(`${cx + i}|${cy + j}|${cz + k}`) ?? []) { const d = sub(pto(P, v), p); if (dot(d, d) <= r * r) out.push(v); }
      }
      return out;
    },
  };
}

/* ---------- o ajuste de um lado ---------- */

function resolver6(A, b) {
  const m = 6;
  for (let i = 0; i < m; i++) A[i * m + i] += 1e-12;
  for (let c = 0; c < m; c++) {
    let p = c; for (let r = c + 1; r < m; r++) if (Math.abs(A[r * m + c]) > Math.abs(A[p * m + c])) p = r;
    if (p !== c) { for (let k = 0; k < m; k++) { const t = A[c * m + k]; A[c * m + k] = A[p * m + k]; A[p * m + k] = t; } const t = b[c]; b[c] = b[p]; b[p] = t; }
    const d = A[c * m + c]; if (Math.abs(d) < 1e-18) return null;
    for (let r = c + 1; r < m; r++) { const f = A[r * m + c] / d; for (let k = c; k < m; k++) A[r * m + k] -= f * A[c * m + k]; b[r] -= f * b[c]; }
  }
  const x = new Array(m);
  for (let r = m - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < m; k++) s -= A[r * m + k] * x[k]; x[r] = s / A[r * m + r]; }
  return x;
}

/**
 * ajusteLocal(P, N, vertices, centro, semente, { raio }) -> { normal, curvatura(d) (1/m, convexa positiva), tensor (3x3, 1/m), principais [k1, k2] (1/m), pontos } ou null.
 * Quadrática h = c0 + c1 s + c2 t + c3 s² + c4 st + c5 t² sobre o plano tangente em `centro`, só com os `vertices` de normal que concorda
 * com `semente` (cosseno > 0,5); o plano é refeito duas vezes pela normal ajustada. Pede ao menos 12 vértices.
 */
export function ajusteLocal(P, N, vertices, centro, semente, { raio = PADROES.raioMm } = {}) {
  let w = unit(semente); let res = null;
  for (let it = 0; it < 3; it++) {
    const ajuda = Math.abs(w[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = unit(cruz(w, ajuda)); const v = cruz(w, u);
    const A = new Float64Array(36); const b = new Float64Array(6); let n = 0;
    for (const i of vertices) {
      if (N[3 * i] * w[0] + N[3 * i + 1] * w[1] + N[3 * i + 2] * w[2] < CONCORDA) continue;
      const d = sub(pto(P, i), centro); const s = dot(d, u) / raio; const t = dot(d, v) / raio; const h = dot(d, w);
      const f = [1, s, t, s * s, s * t, t * t];
      for (let r = 0; r < 6; r++) { b[r] += f[r] * h; for (let c = 0; c < 6; c++) A[r * 6 + c] += f[r] * f[c]; }
      n++;
    }
    if (n < 12) return null;
    const c = resolver6(A, b); if (!c) return null;
    const g = [c[1] / raio, c[2] / raio]; /* dh/ds, dh/dt em mm/mm */
    const hess = [[(2 * c[3]) / raio ** 2, c[4] / raio ** 2], [c[4] / raio ** 2, (2 * c[5]) / raio ** 2]]; /* 1/mm */
    const normal = unit([w[0] - g[0] * u[0] - g[1] * v[0], w[1] - g[0] * u[1] - g[1] * v[1], w[2] - g[0] * u[2] - g[1] * v[2]]);
    res = { u, v, w, g, hess, normal, pontos: n };
    if (it < 2) w = normal;
  }
  const { u, v, g, hess, normal } = res;
  const raiz = Math.sqrt(1 + g[0] ** 2 + g[1] ** 2);
  /** curvatura normal (1/m, convexa positiva) numa direção tangente `d` do espaço */
  const curvatura = (d) => {
    let a = [dot(d, u), dot(d, v)]; const m = Math.hypot(...a); if (!m) return null; a = [a[0] / m, a[1] / m];
    const II = (a[0] * a[0] * hess[0][0] + 2 * a[0] * a[1] * hess[0][1] + a[1] * a[1] * hess[1][1]) / raiz;
    const I = 1 + (a[0] * g[0] + a[1] * g[1]) ** 2;
    return (-II / I) * 1000;
  };
  /* o tensor de curvatura no espaço (1/m): -(H_ss u⊗u + H_st (u⊗v + v⊗u) + H_tt v⊗v), com a inclinação pequena depois do reajuste */
  const tensor = [0, 1, 2].map((i) => [0, 1, 2].map((j) => -1000 * (hess[0][0] * u[i] * u[j] + hess[0][1] * (u[i] * v[j] + v[i] * u[j]) + hess[1][1] * v[i] * v[j]) / raiz));
  /* as curvaturas principais (1/m, convexa positiva, k1 >= k2): os autovalores da forma 2x2, com a inclinação pequena depois do reajuste */
  const tr = (hess[0][0] + hess[1][1]) / 2; const dv = Math.hypot((hess[0][0] - hess[1][1]) / 2, hess[0][1]);
  const principais = [(-(tr - dv) * 1000) / raiz, (-(tr + dv) * 1000) / raiz];
  return { normal, curvatura, tensor, principais, pontos: res.pontos };
}

/* ---------- as emendas ---------- */

function encadear(arestas) {
  /* arestas: [{ a, b, ... }]; devolve cadeias de índices de aresta, em ordem */
  const viz = new Map();
  arestas.forEach((e, k) => { for (const v of [e.a, e.b]) { if (!viz.has(v)) viz.set(v, []); viz.get(v).push(k); } });
  const usado = new Uint8Array(arestas.length); const cadeias = [];
  const andar = (inicio, k0) => {
    const vs = [inicio]; const es = []; let atual = inicio; let k = k0;
    while (k !== undefined && !usado[k]) {
      usado[k] = 1; es.push(k); const e = arestas[k]; const prox = e.a === atual ? e.b : e.a;
      vs.push(prox); atual = prox; k = viz.get(prox).find((j) => !usado[j]);
    }
    return { vs, es };
  };
  const chaves = [...viz.keys()].sort((x, y) => x - y);
  for (const v of chaves) { const l = viz.get(v); if (l.length === 1 && !usado[l[0]]) cadeias.push({ fechada: false, ...andar(v, l[0]) }); }
  for (const v of chaves) for (const k of viz.get(v)) if (!usado[k]) { const c = andar(v, k); cadeias.push({ fechada: true, ...c }); }
  return cadeias;
}

/** As emendas: `[{ lados: [A, B], tipo, arestas: [{ a, b, fA, fB?, segB? }] }]`, uma por par de grupos e tipo. */
export function acharEmendas(malha, selFace, { alcanceMm = PADROES.alcanceMm } = {}) {
  const { P, faces, grupos, normais } = malha;
  const arestas = new Map();
  faces.forEach((f, k) => {
    if (!selFace[k]) return;
    for (let q = 0; q < f.length; q++) {
      const a = f[q]; const b = f[(q + 1) % f.length]; const ch = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (!arestas.has(ch)) arestas.set(ch, { a: Math.min(a, b), b: Math.max(a, b), fs: [] });
      arestas.get(ch).fs.push(k);
    }
  });
  const pares = new Map(); const bordas = [];
  const juntar = (A, B, tipo, e) => { const k = `${A}\u0000${B}\u0000${tipo}`; if (!pares.has(k)) pares.set(k, { lados: [A, B], tipo, arestas: [] }); pares.get(k).arestas.push(e); };
  for (const e of arestas.values()) {
    for (const f of e.fs) {
      const conc = e.fs.filter((g) => g !== f && dot(normais[f], normais[g]) > CONCORDA);
      if (conc.some((g) => grupos[g] === grupos[f])) continue;
      const outro = conc.find((g) => grupos[g] !== grupos[f]);
      if (outro !== undefined) { if (grupos[f] < grupos[outro]) juntar(grupos[f], grupos[outro], 'aresta comum', { a: e.a, b: e.b, fA: f, fB: outro }); }
      else if (!conc.length) bordas.push({ a: e.a, b: e.b, f });
    }
  }
  /* as bordas vizinhas: o ponto mais perto da borda de outro grupo, a até o alcance */
  if (bordas.length) {
    let maior = 0; for (const e of bordas) maior = Math.max(maior, Math.hypot(...sub(pto(P, e.a), pto(P, e.b))));
    const C = alcanceMm + maior; const h = new Map(); const chave = (p) => p.map((x) => Math.floor(x / C)).join('|');
    bordas.forEach((e, k) => { const m = sub(pto(P, e.a), [0, 0, 0]).map((x, q) => (x + P[3 * e.b + q]) / 2); const c = chave(m); if (!h.has(c)) h.set(c, []); h.get(c).push(k); });
    for (const e of bordas) {
      const A = grupos[e.f]; const m = [0, 1, 2].map((q) => (P[3 * e.a + q] + P[3 * e.b + q]) / 2);
      const [cx, cy, cz] = m.map((x) => Math.floor(x / C)); let melhor = null;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) for (const o of h.get(`${cx + i}|${cy + j}|${cz + k}`) ?? []) {
        const s = bordas[o]; if (grupos[s.f] === A || dot(normais[s.f], normais[e.f]) <= CONCORDA) continue;
        const d = distanciaAoSegmento(m, pto(P, s.a), pto(P, s.b));
        if (d.t <= 0 || d.t >= 1 || Math.abs(dot(unit(sub(pto(P, e.b), pto(P, e.a))), unit(sub(pto(P, s.b), pto(P, s.a))))) < 0.7) continue; /* a borda de B ao lado, paralela, e não a ponta dela no canto */
        if (d.d <= alcanceMm && (!melhor || d.d < melhor.d - 1e-9 || (Math.abs(d.d - melhor.d) <= 1e-9 && grupos[s.f] < grupos[melhor.s.f]))) melhor = { d: d.d, s };
      }
      if (melhor && A < grupos[melhor.s.f]) juntar(A, grupos[melhor.s.f], 'bordas vizinhas', { a: e.a, b: e.b, fA: e.f });
    }
    malha.bordas = bordas;
  }
  return [...pares.values()].sort((x, y) => (x.lados.join() + x.tipo < y.lados.join() + y.tipo ? -1 : 1));
}

function distanciaAoSegmento(p, a, b) {
  const ab = sub(b, a); const L = dot(ab, ab); const t = L ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / L)) : 0;
  const q = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
  return { d: Math.hypot(...sub(p, q)), q, t };
}

/** O ponto do lado B que corresponde a `p` na borda: o mais perto das bordas do grupo B, com a face de B que o dá. */
function pontoDoOutroLado(malha, p, B, nA, alcance) {
  const { P, grupos, normais, bordas } = malha; let melhor = null;
  for (const s of bordas) {
    if (grupos[s.f] !== B || dot(normais[s.f], nA) <= CONCORDA) continue;
    const a = pto(P, s.a); if (Math.abs(a[0] - p[0]) > alcance * 4 || Math.abs(a[1] - p[1]) > alcance * 4 || Math.abs(a[2] - p[2]) > alcance * 4) continue;
    const d = distanciaAoSegmento(p, a, pto(P, s.b)); if (d.d <= alcance * 2 && (!melhor || d.d < melhor.d)) melhor = { ...d, f: s.f };
  }
  return melhor;
}

/** Mede a emenda: as cadeias de arestas, e em cada vértice da cadeia a fresta, o ângulo e as curvaturas dos dois lados. */
export function medirEmenda(malha, emenda, indice, { raioMm = PADROES.raioMm, alcanceMm = PADROES.alcanceMm, piso = PADROES.piso } = {}) {
  const { P, N, normais } = malha; const [A, B] = emenda.lados;
  const cadeias = encadear(emenda.arestas).filter((c) => c.es.length >= 2);
  /* com muitas bordas, o índice das bordas de B por célula acelera o ponto do outro lado */
  return cadeias.map((c) => {
    const amostras = []; let s = 0;
    c.vs.forEach((v, q) => {
      const p = pto(P, v);
      if (q > 0) s += Math.hypot(...sub(p, pto(P, c.vs[q - 1])));
      const e = emenda.arestas[c.es[Math.min(q, c.es.length - 1)]];
      const ant = pto(P, c.vs[Math.max(0, q - 1)]); const pos = pto(P, c.vs[Math.min(c.vs.length - 1, q + 1)]);
      const tA = unit(sub(pos, ant));
      const semA = normais[e.fA];
      let pB = p; let semB = e.fB !== undefined ? normais[e.fB] : null;
      if (emenda.tipo === 'bordas vizinhas') { const o = pontoDoOutroLado(malha, p, B, semA, alcanceMm); if (!o) return; pB = o.q; semB = normais[o.f]; }
      const ajA = ajusteLocal(P, N, indice.vizinhos(A, p, raioMm), p, semA, { raio: raioMm });
      const ajB = ajusteLocal(P, N, indice.vizinhos(B, pB, raioMm), pB, semB, { raio: raioMm });
      const d = sub(pB, p); const fresta = Math.hypot(...d);
      const nRef = ajA?.normal ?? semA; const desnivel = dot(d, nRef);
      let angulo = null; let kA = null; let kB = null; let razao = null;
      if (ajA && ajB) {
        angulo = (Math.acos(Math.max(-1, Math.min(1, dot(ajA.normal, ajB.normal)))) * 180) / Math.PI;
        const dA = unit(cruz(ajA.normal, tA)); const dB = unit(sub(dA, ajB.normal.map((x) => x * dot(dA, ajB.normal))));
        kA = ajA.curvatura(dA); kB = ajB.curvatura(dB);
        if (kA !== null && kB !== null) razao = Math.max(Math.abs(kA), Math.abs(kB)) / Math.max(Math.min(Math.abs(kA), Math.abs(kB)), piso);
      }
      amostras.push([r3(s, 10), ...p.map((x) => r3(x, 10)), r3(fresta), r3(desnivel), r3(angulo), r3(kA), r3(kB), r3(razao)]);
    });
    return { fechada: c.fechada, comprimentoMm: r3(s, 10), amostras };
  }).filter((c) => c.amostras.length >= 2);
}

const COL = { s: 0, x: 1, fresta: 4, desnivel: 5, angulo: 6, kA: 7, kB: 8, razao: 9 };

function resumoDaCadeia(amostras, limiares) {
  const maximo = (col) => {
    let m = null;
    for (const a of amostras) if (a[col] !== null && (!m || a[col] > m.valor)) m = { valor: a[col], ponto: a.slice(1, 4), sMm: a[0] };
    return m;
  };
  const mediana = (col) => { const v = amostras.map((a) => a[col]).filter((x) => x !== null).sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : null; };
  const mr = maximo(COL.razao); if (mr) { const a = amostras.find((x) => x[0] === mr.sMm); mr.curvaturaA = a[COL.kA]; mr.curvaturaB = a[COL.kB]; }
  const acusa = { fresta: 0, angulo: 0, curvatura: 0 };
  for (const a of amostras) {
    if (a[COL.fresta] > limiares.fresta) acusa.fresta++;
    if (a[COL.angulo] !== null && a[COL.angulo] > limiares.angulo) acusa.angulo++;
    if (a[COL.razao] !== null && a[COL.razao] > limiares.razao && Math.abs(a[COL.kA] - a[COL.kB]) > PADROES.saltoMinimo) acusa.curvatura++;
  }
  return {
    maximos: { frestaMm: maximo(COL.fresta), anguloGraus: maximo(COL.angulo), razaoDeCurvatura: mr },
    medianas: { frestaMm: mediana(COL.fresta), desnivelMm: mediana(COL.desnivel), anguloGraus: mediana(COL.angulo), curvaturaA: mediana(COL.kA), curvaturaB: mediana(COL.kB), razaoDeCurvatura: mediana(COL.razao) },
    acusa, semAjuste: amostras.filter((a) => a[COL.angulo] === null).length,
  };
}

/* ---------- a imagem ---------- */

const RAMPA = [[46, 150, 80], [236, 196, 40], [200, 34, 30]];
function corDaRampa(u) {
  u = Math.max(0, Math.min(1, u)); const [a, b, k] = u < 0.5 ? [RAMPA[0], RAMPA[1], u * 2] : [RAMPA[1], RAMPA[2], (u - 0.5) * 2];
  return a.map((x, i) => x + (b[i] - x) * k);
}

function desenhar(malha, sel, emendas, { vista, cor, escala, nome, linhas }) {
  const { quadro, pxMm, origem } = pintarMalha(malha, sel, new Float64Array(malha.n).fill(Number.NaN), { vista, escalaMm: 1, margemSuperior: 90 });
  const { direita, cima } = baseDaVista(VISTAS[vista]);
  const tela = (p) => [origem.ox + (dot(p, direita) - origem.x0) * pxMm, origem.oy + (origem.y1 - dot(p, cima)) * pxMm];
  const col = COL[cor]; const base = cor === 'razao' ? 1 : 0;
  const valor = (a) => a[col];
  for (const passo of [0, 1]) for (const e of emendas) for (const c of e.cadeias) {
    for (let q = 1; q < c.amostras.length; q++) {
      const a = c.amostras[q - 1]; const b = c.amostras[q]; const v = [valor(a), valor(b)].filter((x) => x !== null);
      const k = v.length ? Math.max(...v) : null;
      const [x0, y0] = tela(a.slice(1, 4)); const [x1, y1] = tela(b.slice(1, 4));
      if (passo === 0) { quadro.linha(x0, y0, x1, y1, TINTA, 7); continue; }
      quadro.linha(x0, y0, x1, y1, k === null ? [150, 150, 150] : corDaRampa((k - base) / (escala - base)), 5);
    }
  }
  const { W, H } = quadro;
  quadro.texto(30, 16, `CONTINUIDADE NAS EMENDAS - ${nome}`, { escala: 3 });
  linhas.forEach((l, k) => quadro.texto(30, 44 + k * 18, l, { escala: 2, cor: [90, 96, 102] }));
  const bx = W - 110; const by0 = 90; const by1 = H - 90;
  for (let y = by0; y <= by1; y++) quadro.retangulo(bx, y, bx + 26, y + 1, corDaRampa(1 - (y - by0) / (by1 - by0)));
  quadro.linha(bx, by0, bx + 26, by0, TINTA); quadro.linha(bx, by1, bx + 26, by1, TINTA); quadro.linha(bx, by0, bx, by1, TINTA); quadro.linha(bx + 26, by0, bx + 26, by1, TINTA);
  for (let k = 0; k <= 4; k++) {
    const y = by0 + ((by1 - by0) * k) / 4; const v = escala - ((escala - base) * k) / 4;
    quadro.linha(bx + 26, y, bx + 32, y, TINTA); quadro.texto(bx + 36, y - 7, String(Math.round(v * 100) / 100), { escala: 2 });
  }
  quadro.texto(bx - 20, by0 - 40, { angulo: 'GRAUS', razao: 'RAZAO K', fresta: 'FRESTA MM' }[cor], { escala: 2 });
  const mm = numeroRedondo((W * 0.18) / pxMm); const comp = Math.round(mm * pxMm);
  quadro.linha(30, H - 30, 30 + comp, H - 30, TINTA, 2); quadro.linha(30, H - 36, 30, H - 24, TINTA); quadro.linha(30 + comp, H - 36, 30 + comp, H - 24, TINTA);
  quadro.texto(30, H - 56, `${mm} MM NA VISTA`, { escala: 2 });
  return quadro.png();
}

/* ---------- a ferramenta ---------- */

/**
 * continuidadeNasEmendas(neutro, opcoes) -> { json, png }; opcoes: { nome, lado, por, raioMm, alcanceMm, limiarFrestaMm, limiarAnguloGraus,
 * limiarRazao, cor, escala, vista, amostras }.
 */
export function continuidadeNasEmendas(neutro, {
  nome = 'peca', lado = null, por = 'parte', raioMm = PADROES.raioMm, alcanceMm = PADROES.alcanceMm, limiarFrestaMm = PADROES.limiarFrestaMm,
  limiarAnguloGraus = PADROES.limiarAnguloGraus, limiarRazao = PADROES.limiarRazao, cor = 'angulo', escala = null, vista = 'isometrica-traseira', amostras = true,
} = {}) {
  if (!(raioMm > 0)) throw new Error(`--raio espera um número de mm maior que zero, e veio ${raioMm}`);
  if (!(alcanceMm > 0)) throw new Error(`--alcance espera um número de mm maior que zero, e veio ${alcanceMm}`);
  if (!['angulo', 'razao', 'fresta'].includes(cor)) throw new Error(`--cor: '${cor}' não vale; use angulo, razao ou fresta`);
  if (!VISTAS[vista]) throw new Error(`--vista: '${vista}' não existe; use ${Object.keys(VISTAS).join(', ')}`);
  const malha = malhaComGrupos(neutro, { por });
  const sel = selecionarLado(malha, lado);
  const selFace = malha.faces.map((f) => f.every((i) => sel[i]));
  const indice = indiceDosGrupos(malha, selFace, raioMm);
  const brutas = acharEmendas(malha, selFace, { alcanceMm });
  const limiares = { fresta: limiarFrestaMm, angulo: limiarAnguloGraus, razao: limiarRazao };
  const emendas = brutas.map((e) => ({ lados: e.lados, tipo: e.tipo, cadeias: medirEmenda(malha, e, indice, { raioMm, alcanceMm }) })).filter((e) => e.cadeias.length);
  const lista = emendas.flatMap((e) => e.cadeias.map((c) => ({ lados: e.lados, tipo: e.tipo, fechada: c.fechada, comprimentoMm: c.comprimentoMm, ...resumoDaCadeia(c.amostras, limiares), amostras: c.amostras })));
  const extremo = (f) => Math.max(0, ...lista.map((e) => f(e) ?? 0));
  const col = { angulo: 'anguloGraus', razao: 'razaoDeCurvatura', fresta: 'frestaMm' }[cor];
  const escalaDaCor = escala ?? (cor === 'razao' ? Math.max(2, numeroRedondo(extremo((e) => e.maximos[col]?.valor))) : numeroRedondo(Math.max(extremo((e) => e.maximos[col]?.valor), cor === 'angulo' ? 2 : 0.5)));
  const acusadas = lista.filter((e) => e.acusa.fresta || e.acusa.angulo || e.acusa.curvatura).length;
  const png = desenhar(malha, sel, emendas, {
    vista, cor, escala: escalaDaCor, nome,
    linhas: [`VISTA ${vista.toUpperCase()}   GRUPOS POR ${por.toUpperCase()}   RAIO ${raioMm} MM${lado ? `   LADO ${lado}` : ''}   COR ${cor.toUpperCase()}`,
      `${lista.length} EMENDAS, ${acusadas} ACUSAM   FRESTA MAX ${r3(extremo((e) => e.maximos.frestaMm?.valor))} MM   ANGULO MAX ${r3(extremo((e) => e.maximos.anguloGraus?.valor), 100)}   RAZAO MAX ${r3(extremo((e) => e.maximos.razaoDeCurvatura?.valor), 100)}`],
  });
  const json = {
    peca: nome, lado, por, unidades: { fresta: 'mm', angulo: 'graus', curvatura: '1/m', comprimento: 'mm' },
    parametros: { raioMm, alcanceMm, limiares: { frestaMm: limiarFrestaMm, anguloGraus: limiarAnguloGraus, razao: limiarRazao, saltoMinimo: PADROES.saltoMinimo }, piso: PADROES.piso },
    convencao: 'amostras: [s mm, x, y, z mm, fresta mm, desnível mm (ao longo da normal de A; negativo é B para dentro), ângulo graus, curvatura A, curvatura B (1/m, convexa positiva, na direção que atravessa a emenda), razão]; lado A é o grupo de nome menor',
    grupos: [...indice.porGrupo.keys()].sort(),
    resumo: { emendas: lista.length, acusam: acusadas, frestaMaximaMm: r3(extremo((e) => e.maximos.frestaMm?.valor)), anguloMaximoGraus: r3(extremo((e) => e.maximos.anguloGraus?.valor)), razaoMaxima: r3(extremo((e) => e.maximos.razaoDeCurvatura?.valor)) },
    vista, cor, escalaDaCor,
    emendas: lista.map((e) => (amostras ? e : { ...e, amostras: undefined })),
  };
  return { json, png };
}

export const OPCOES_DA_CLI = ['opcao', 'lado', 'por', 'raio', 'alcance', 'limiar-fresta', 'limiar-angulo', 'limiar-razao', 'cor', 'escala', 'vista', 'amostras', 'saida'];

async function principal(argv) {
  let lido;
  try { lido = lerArgumentos(argv.slice(2), { opcoes: OPCOES_DA_CLI, bandeiras: ['ajuda'], posicional: { nome: 'peça', obrigatorio: false } }); } catch (e) { process.stderr.write(`emendas: ${e.message}\n`); return 2; }
  const peca = lido.posicional;
  if (lido.bandeira('ajuda') || !peca) { process.stderr.write(`uso: node tools/modelar/continuidade-nas-emendas.mjs <peça> [--${OPCOES_DA_CLI.join('=...] [--')}=...]\n  ver o cabeçalho do arquivo\n`); return lido.bandeira('ajuda') ? 0 : 2; }
  const numero = (n, padrao) => { const t = lido.opcao(n); if (t === null || t === undefined) return padrao; const x = Number(t); if (!Number.isFinite(x)) throw new Error(`--${n} espera um número, e veio '${t}'`); return x; };
  const amostras = lido.opcao('amostras') ?? 'sim';
  if (!['sim', 'nao'].includes(amostras)) { process.stderr.write(`emendas: --amostras espera sim ou nao, e veio '${amostras}'\n`); return 2; }
  let entrada;
  try { entrada = await lerEntradaDeMedida(peca, { opcao: opcaoDaLinha(lido.opcao('opcao')), montagem: false }); } catch (e) {
    if (e instanceof ErroDeEntrada) { process.stderr.write(`emendas: ${e.message}\n`); return 2; }
    throw e;
  }
  const nome = basename(peca).replace(/\.(mjs|js|json)$/, '');
  const { json, png } = continuidadeNasEmendas(entrada.executar().neutro, {
    nome, lado: lido.opcao('lado') ?? null, por: lido.opcao('por') ?? 'parte', raioMm: numero('raio', PADROES.raioMm), alcanceMm: numero('alcance', PADROES.alcanceMm),
    limiarFrestaMm: numero('limiar-fresta', PADROES.limiarFrestaMm), limiarAnguloGraus: numero('limiar-angulo', PADROES.limiarAnguloGraus), limiarRazao: numero('limiar-razao', PADROES.limiarRazao),
    cor: lido.opcao('cor') ?? 'angulo', escala: numero('escala', null), vista: lido.opcao('vista') ?? 'isometrica-traseira', amostras: amostras === 'sim',
  });
  const saida = resolve(lido.opcao('saida') ?? `tmp/continuidade-nas-emendas/${nome}.png`);
  mkdirSync(dirname(saida), { recursive: true }); writeFileSync(saida, png);
  process.stdout.write(`${JSON.stringify({ ...json, imagem: saida })}\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`${e.message}\n`); process.exitCode = 1; });
}
