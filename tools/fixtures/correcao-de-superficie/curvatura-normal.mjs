#!/usr/bin/env node
/* curvatura-normal.mjs — PROTÓTIPO, fora do núcleo, da tentativa que a pessoa decidiu em 2026-11-19 depois da revisão da etapa B do
 * degrau 3 da fatia 5 (`docs/modelar/planos/2026-11-16-ferramentas-de-correcao-de-superficie.md`): a curvatura normal linearizada como
 * energia do ajuste das cotas, no lugar da derivada segunda do vetor posição da etapa B.
 *
 * A MEDIDA. No vértice regular i, com o anel 3×3 e os estênceis da B-spline bicúbica (os de `energia-de-curvatura.mjs`), a gaiola
 * DECLARADA dá S_u, S_v (as tangentes do limite), n = S_u × S_v / |S_u × S_v| e a métrica E = |S_u|², G = |S_v|², e os quatro ficam
 * congelados. As três curvaturas são lineares na gaiola x:
 *
 *   κ_uu = n · S_uu(x) / E,     κ_uv = √2 n · S_uv(x) / √(E G),     κ_vv = n · S_vv(x) / G.
 *
 * Sobre a própria gaiola declarada κ_uu e κ_vv são a curvatura normal exata do limite nas direções u e v. A energia soma, em cada aresta
 * (s, t) entre dois vértices regulares, (onda/2π)⁶/ℓ_st² Σ_c (κ_c(s) − κ_c(t))², com os eixos alinhados pela aresta como na etapa A e
 * ℓ_st o comprimento da aresta no espaço, na gaiola declarada.
 *
 * A INCÓGNITA. x_j = P_j + t_j N_j: um escalar por vértice, na normal N_j do limite da gaiola declarada naquele vértice (a de
 * `superficieLimite`, que existe também na borda e no extraordinário). O sistema é um só, de um lado direito:
 *
 *   Σ p_i (N_i · (L_i(x) − a_i))² + E(x) + ε Σ t_j²      sujeita às cotas exatas,
 *
 * e as cotas exatas entram de um de dois modos (`cota`):
 *   'normal'    N_k · (L_k(x) − a_k) = 0: a cota exata vale só na normal, e o ponto limite escorrega na tangente o quanto a conta deixar
 *               (a saída diz quanto, em `escorregamento`);
 *   'completa'  L_k(x) = a_k nos três eixos, com duas incógnitas a mais (as duas tangentes) no vértice de cada cota exata: o contrato da
 *               cota fica o de hoje, e o sistema cresce de duas incógnitas e duas restrições por cota exata.
 *
 * NADA DISTO MUDA O NÚCLEO. As cotas (a gaiola declarada e as medidas) são as do passo que a `gaiolaPorRede` monta com `alisarSuperficie`
 * (o miolo com o preenchimento sem alisar e o peso 0,003, a escolha da etapa B), de modo que entre a coluna `etapaB` e a `normal` só muda
 * a energia e a incógnita.
 *
 * Uso: node tools/fixtures/correcao-de-superficie/curvatura-normal.mjs analiticas | grade | energia | emendas | rede  [opções]
 *   --cota=normal | completa   o modo das cotas exatas (padrão: completa)
 *   --onda=<mm>                o comprimento de onda (padrão: quatro arestas medianas); --miolo=<peso> troca o peso das cotas de peso finito
 *   --definicao=<json>         opções de `definicaoAnalitica`, como {"meio":[0.25,0.25]} ou {"pontos":16}
 *   A saída é JSON na saída padrão. */
import { pathToFileURL } from 'node:url';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { gaiolaPorRede } from '../../../procedural/nucleo/gaiola-por-rede.js';
import { gaiolaDoPasso } from '../../../procedural/nucleo/operacoes/subdivisao.js';
import { ajustarGaiolaAsMedidasComPeso, energiaDeVariacaoDeCurvatura, fatorarLU, limitesDaGaiola, resolverLU, superficieLimite } from '../../../procedural/nucleo/subdivisao.js';
import { SUPERFICIES_ANALITICAS, definicaoAnalitica, receitaDeProva } from './chapas.mjs';
import { EPSILON_DO_DESLOCAMENTO, medirAnalitica, medirEmenda, medirRede, topologiaRegular } from './energia-de-curvatura.mjs';

const M = [1 / 6, 4 / 6, 1 / 6]; const S = [1, -2, 1]; const D = [-0.5, 0, 0.5];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const l = norma(a); return [a[0] / l, a[1] / l, a[2] / l]; };
const dist = (a, b) => norma(sub(a, b));
const r4 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1e4) / 1e4);
const sig = (x) => (x == null || !Number.isFinite(x) ? null : Number(x.toPrecision(4)));

const medianaDasArestas = ({ vertices, faces }) => {
  const c = [];
  for (const f of faces) for (let k = 0; k < f.length; k++) c.push(dist(vertices[f[k]], vertices[f[(k + 1) % f.length]]));
  c.sort((a, b) => a - b);
  return c[c.length >> 1];
};

/** curvaturasDoVertice(P, anel) -> { n, E, G, linhas: [uu, uv, vv] }: a normal e a métrica do limite no centro do anel [a + 1][b + 1] da
 *  gaiola P, e as três curvaturas como linhas [índice, peso]: κ_c(x) = Σ peso (n · x_índice). */
export function curvaturasDoVertice(P, anel) {
  const Su = [0, 0, 0], Sv = [0, 0, 0];
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const p = P[anel[a][b]]; const wu = D[a] * M[b], wv = M[a] * D[b]; for (let x = 0; x < 3; x++) { Su[x] += wu * p[x]; Sv[x] += wv * p[x]; } }
  const n = unit(cruz(Su, Sv)); const E = dot(Su, Su), G = dot(Sv, Sv); const raiz = Math.sqrt(E * G);
  const uu = [], uv = [], vv = [];
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
    const j = anel[a][b];
    uu.push([j, (S[a] * M[b]) / E]); vv.push([j, (M[a] * S[b]) / G]);
    if (D[a] * D[b] !== 0) uv.push([j, (Math.SQRT2 * D[a] * D[b]) / raiz]);
  }
  return { n, E, G, Su, Sv, linhas: [uu, uv, vv] };
}

/** termosDaCurvaturaNormal(gaiola, onda) -> [{ aresta, peso, linhas: [Map índice -> vetor g] }]: por aresta entre regulares, o peso
 *  (onda/2π)⁶/ℓ_st² e as três linhas de κ_c(s) − κ_c(t), cada uma como Σ g_j · x_j, com a normal e a métrica da gaiola recebida. */
export function termosDaCurvaturaNormal(gaiola, onda) {
  const P = gaiola.vertices; const T = topologiaRegular(gaiola); const K = (onda / (2 * Math.PI)) ** 6;
  return T.arestas.map(([s, t]) => {
    /* em s, +u é t; em t, +u é o vizinho oposto a s, e o +v dos dois cai do mesmo lado porque a malha é orientada */
    const cs = curvaturasDoVertice(P, T.anel(s, T.vizinhos(s).indexOf(t))); const ct = curvaturasDoVertice(P, T.anel(t, (T.vizinhos(t).indexOf(s) + 2) % 4));
    const linhas = [0, 1, 2].map((c) => {
      const m = new Map();
      const soma = (j, w, n) => { const g = m.get(j) ?? [0, 0, 0]; g[0] += w * n[0]; g[1] += w * n[1]; g[2] += w * n[2]; m.set(j, g); };
      for (const [j, w] of cs.linhas[c]) soma(j, w, cs.n);
      for (const [j, w] of ct.linhas[c]) soma(j, -w, ct.n);
      return m;
    });
    const l = dist(P[s], P[t]);
    return { aresta: [s, t], peso: K / (l * l), linhas };
  });
}

/** energiaNormal(termos, vertices) -> { energia, maiorSalto }: Σ peso Σ_c (linha_c · x)², e a maior diferença |κ_c(s) − κ_c(t)| (1/unidade) */
export function energiaNormal(termos, vertices) {
  let energia = 0, maiorSalto = 0;
  for (const { peso, linhas } of termos) for (const l of linhas) { let r = 0; for (const [j, g] of l) r += dot(g, vertices[j]); energia += peso * r * r; maiorSalto = Math.max(maiorSalto, Math.abs(r)); }
  return { energia, maiorSalto };
}

/* a normal e o ponto do limite em cada vértice da gaiola, pelo oráculo: o canto de uma face de quatro lados que o tem */
function normaisDoLimite(gaiola) {
  const sup = superficieLimite(gaiola); const L = limitesDaGaiola(gaiola); const CANTO = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const N = new Array(gaiola.vertices.length).fill(null);
  gaiola.faces.forEach((f, fi) => f.forEach((v, k) => {
    if (N[v]) return;
    const a = f.length === 4 ? sup.avaliar(fi, ...CANTO[k]) : sup.avaliar(fi, 0, 0, { canto: k });
    if (a.normal && dist(a.ponto, L[v]) < 1e-9) N[v] = a.normal;
  }));
  const falta = N.findIndex((n) => !n);
  if (falta >= 0) throw new Error(`curvatura normal: o vértice ${falta} não tem normal do limite`);
  return N;
}

/* os pesos do ponto limite de cada vértice: linhas[i] = [[c, peso]], pela própria `limitesDaGaiola` aplicada à base */
function pesosDoLimite(gaiola) {
  const n = gaiola.vertices.length; const linhas = Array.from({ length: n }, () => []);
  const vizinhanca = Array.from({ length: n }, () => new Set());
  for (const f of gaiola.faces) for (const a of f) for (const b of f) vizinhanca[a].add(b);
  for (let b = 0; b < n; b += 3) {
    const V = gaiola.vertices.map((_, c) => [c === b ? 1 : 0, c === b + 1 ? 1 : 0, c === b + 2 ? 1 : 0]);
    const L = limitesDaGaiola({ ...gaiola, vertices: V });
    for (let k = 0; k < 3 && b + k < n; k++) for (const i of [...vizinhanca[b + k]].sort((x, y) => x - y)) if (L[i][k] !== 0) linhas[i].push([b + k, L[i][k]]);
  }
  return linhas;
}

/**
 * ajustarPelaNormal(gaiolaDeclarada, medidas, { onda, cota, pesoDoMiolo, epsilon }) -> { vertices, onda, incognitas, restricoes, energiaAntes,
 *   energiaDepois, deslocamento, residuoNaNormal, escorregamento, residuoExato }
 * gaiolaDeclarada e medidas como em `ajustarComEnergia`. `cota`: 'normal' ou 'completa' (cabeçalho). `residuoNaNormal` e `escorregamento`
 * são o maior desvio do ponto limite de uma cota exata ao ponto declarado, na normal e na tangente (unidade da gaiola), e `residuoExato`
 * a distância inteira; `escorregamentoDentro`, o da tangente só nas cotas exatas fora da borda livre. `escorregamentoDaDeclarada` é o mesmo desvio na tangente antes do ajuste (o limite da gaiola declarada).
 */
export function ajustarPelaNormal(gaiola, medidas, { onda = null, cota = 'completa', pesoDoMiolo = null, epsilon = EPSILON_DO_DESLOCAMENTO } = {}) {
  if (cota !== 'normal' && cota !== 'completa') throw new Error(`curvatura normal: cota é ${JSON.stringify(cota)}; use 'normal' ou 'completa'`);
  const P = gaiola.vertices; const nV = P.length; const ondaUsada = onda ?? 4 * medianaDasArestas(gaiola);
  const pesoDe = new Map();
  for (const { indice, peso } of medidas) pesoDe.set(indice, peso === Infinity ? Infinity : (pesoDoMiolo ?? peso));
  const ordem = [...pesoDe.keys()].sort((a, b) => a - b);
  const exatos = ordem.filter((i) => pesoDe.get(i) === Infinity); const comPeso = ordem.filter((i) => pesoDe.get(i) !== Infinity);
  const N = normaisDoLimite(gaiola); const W = pesosDoLimite(gaiola);
  /* as incógnitas: a normal de cada vértice e, com a cota completa, as duas tangentes do vértice de cada cota exata */
  const direcoes = N.map((n, j) => ({ j, vec: n })); const doVertice = N.map((_, j) => [j]);
  if (cota === 'completa') for (const i of exatos) {
    const n = N[i]; const eixo = Math.abs(n[0]) <= Math.abs(n[1]) && Math.abs(n[0]) <= Math.abs(n[2]) ? [1, 0, 0] : (Math.abs(n[1]) <= Math.abs(n[2]) ? [0, 1, 0] : [0, 0, 1]);
    const t1 = unit(cruz(n, eixo)); const t2 = cruz(n, t1);
    for (const vec of [t1, t2]) { doVertice[i].push(direcoes.length); direcoes.push({ j: i, vec }); }
  }
  const nZ = direcoes.length;
  /* uma linha Σ g_j · x_j vira constante + Σ coef_k z_k, com x_j = P_j + Σ z_k vec_k */
  const emZ = (linha) => { let c0 = 0; const coef = []; for (const [j, g] of linha) { c0 += dot(g, P[j]); for (const k of doVertice[j]) { const w = dot(g, direcoes[k].vec); if (w !== 0) coef.push([k, w]); } } return { c0, coef }; };
  const doLimite = (i, eixo) => W[i].map(([c, w]) => [c, [w * eixo[0], w * eixo[1], w * eixo[2]]]);
  const restricoes = [];
  for (const i of exatos) for (const eixo of cota === 'normal' ? [N[i]] : [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) { const { c0, coef } = emZ(doLimite(i, eixo)); restricoes.push({ coef, alvo: dot(eixo, P[i]) - c0 }); }
  const n = nZ + restricoes.length;
  const A = Array.from({ length: n }, () => new Array(n).fill(0)); const rhs = new Array(n).fill(0);
  for (let k = 0; k < nZ; k++) A[k][k] = epsilon;
  const quadrado = (peso, { c0, coef }, alvo) => { for (const [r, wr] of coef) { for (const [c, wc] of coef) A[r][c] += peso * wr * wc; rhs[r] += peso * wr * (alvo - c0); } };
  for (const i of comPeso) quadrado(pesoDe.get(i), emZ(doLimite(i, N[i])), dot(N[i], P[i]));
  const termos = termosDaCurvaturaNormal(gaiola, ondaUsada);
  for (const { peso, linhas } of termos) for (const l of linhas) quadrado(peso, emZ(l), 0);
  restricoes.forEach(({ coef, alvo }, s) => { const r = nZ + s; for (const [c, w] of coef) { A[r][c] += w; A[c][r] += w; } rhs[r] = alvo; });
  const lu = fatorarLU(A);
  if (lu.singularEm >= 0) throw new Error(`curvatura normal: sistema singular na coluna ${lu.singularEm} de ${n}`);
  const z = resolverLU(lu, rhs);
  const V = P.map((p) => [...p]);
  direcoes.forEach(({ j, vec }, k) => { for (let x = 0; x < 3; x++) V[j][x] += z[k] * vec[x]; });
  /* a borda livre: os vértices das arestas de uma face só. O escorregamento sai também só nas cotas exatas de dentro (`dentro`) */
  const usos = new Map(); const naBorda = new Set();
  for (const f of gaiola.faces) f.forEach((a, k) => { const b = f[(k + 1) % f.length]; const c = a < b ? `${a},${b}` : `${b},${a}`; usos.set(c, (usos.get(c) ?? 0) + 1); });
  for (const [c, q] of usos) if (q !== 2) for (const a of c.split(',')) naBorda.add(Number(a));
  const desvios = (L) => {
    let naNormal = 0, naTangente = 0, inteiro = 0, dentro = 0;
    for (const i of exatos) {
      const r = sub(L[i], P[i]); const a = dot(r, N[i]); const t = norma([r[0] - a * N[i][0], r[1] - a * N[i][1], r[2] - a * N[i][2]]);
      naNormal = Math.max(naNormal, Math.abs(a)); naTangente = Math.max(naTangente, t); inteiro = Math.max(inteiro, norma(r)); if (!naBorda.has(i)) dentro = Math.max(dentro, t);
    }
    return { naNormal, naTangente, inteiro, dentro };
  };
  const depois = desvios(limitesDaGaiola({ ...gaiola, vertices: V })); const antes = desvios(limitesDaGaiola(gaiola));
  let deslocamento = 0; for (let j = 0; j < nV; j++) deslocamento = Math.max(deslocamento, dist(V[j], P[j]));
  return { vertices: V, onda: ondaUsada, cota, incognitas: nZ, restricoes: restricoes.length, arestasComTermo: termos.length, energiaAntes: energiaNormal(termos, P).energia, energiaDepois: energiaNormal(termos, V).energia,
    deslocamento, residuoNaNormal: depois.naNormal, escorregamento: depois.naTangente, escorregamentoDentro: depois.dentro, residuoExato: depois.inteiro, escorregamentoDaDeclarada: antes.naTangente };
}

/* ---------- as provas: hoje, a etapa B (o núcleo com `alisarSuperficie`) e a curvatura normal, nas mesmas cotas da etapa B ---------- */

const contexto = (pontos) => ({ vec: (p) => (typeof p === 'string' ? pontos[p] : p), num: Number });
const resumoDoAjuste = (a) => ({ cota: a.cota, incognitas: a.incognitas, restricoes: a.restricoes, ondaMm: r4(a.onda * 1000), deslocamentoDaGaiolaMm: r4(a.deslocamento * 1000), residuoNaNormalMm: sig(a.residuoNaNormal * 1000),
  escorregamentoMm: sig(a.escorregamento * 1000), escorregamentoDentroMm: sig(a.escorregamentoDentro * 1000), residuoExatoMm: sig(a.residuoExato * 1000), escorregamentoDaDeclaradaMm: sig(a.escorregamentoDaDeclarada * 1000), energia: [sig(a.energiaAntes), sig(a.energiaDepois)] });

/** provaDasAnaliticas(opcoes, superficies) -> por superfície: a distância (mm) e a crista de `hoje`, `etapaB` e `normal`, e o ajuste */
export function provaDasAnaliticas(opcoes = {}, superficies = Object.keys(SUPERFICIES_ANALITICAS)) {
  return superficies.map((nome) => {
    const Sa = SUPERFICIES_ANALITICAS[nome]; const definicao = { ...definicaoAnalitica(nome, opcoes.definicao ?? {}), marcarCurvas: true };
    const gh = gaiolaPorRede(definicao); const rh = gaiolaDoPasso(gh.passo, contexto(gh.pontos));
    const gb = gaiolaPorRede({ ...definicao, alisarSuperficie: true }); const rb = gaiolaDoPasso(gb.passo, contexto(gb.pontos));
    for (const r of [rh, rb]) if (r.erro) throw new Error(r.erro.join(': '));
    if (rh.gaiola.vertices.length !== rb.gaiola.vertices.length) throw new Error(`${nome}: a opção mudou a topologia da gaiola`);
    const ajuste = ajustarPelaNormal({ ...rb.declaradaCheia, borda: 'suave' }, rb.medidas, opcoes);
    const exatos = new Set(rb.medidas.filter((m) => m.peso === Infinity).map((m) => m.indice));
    const indice = new Map(gb.passo.vertices.map((v, k) => [typeof v === 'string' ? v : v.nome ?? v[0], k]));
    const curvas = gb.passo.curvas.filter((c) => c.nome === 'h1' || c.nome === 'v1').map((c) => ({ nome: c.nome, gaiola: c.pontos.map((p) => indice.get(p)) }));
    const medir = (gaiola) => { const m = medirAnalitica(Sa, gaiola, curvas, exatos); return { distanciaMm: m.distanciaMm, a50Mm: m.a50Mm, a100Mm: m.a100Mm, crista: Object.fromEntries(m.cristaPontual.map((c) => [c.nome, { maxima: c.maxima, mediana: c.mediana, noCruzamento: c.noCruzamento }])) }; };
    return { superficie: nome, ajuste: resumoDoAjuste(ajuste), hoje: medir({ ...rh.gaiola, borda: 'suave' }), etapaB: medir({ ...rb.gaiola, borda: 'suave' }), normal: medir({ ...rb.gaiola, borda: 'suave', vertices: ajuste.vertices }) };
  });
}

/* a grade de nx por nz vértices, com o ponto de cada um dado por ponto(i, j) */
const grade = (nx, nz, ponto) => {
  const vertices = []; const faces = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) vertices.push(ponto(i, j));
  for (let j = 0; j + 1 < nz; j++) for (let i = 0; i + 1 < nx; i++) { const a = j * nx + i; faces.push([a, a + nx, a + nx + 1, a + 1]); }
  return { vertices, faces, vincos: [], cantos: [], borda: 'suave' };
};

export const FORMAS_DA_GRADE = Object.freeze({ paraboloide: (x, z) => x * x + z * z, cilindro: (x) => 1 - Math.sqrt(1 - x * x), sela: (x, z) => (x * x - z * z) / 1.5 });

/** provaDaGrade(opcoes, razoes) -> a grade de 15 por 15 sobre 600 mm da revisão da etapa B (o espaçamento em x `razao` vezes maior de um
 *  lado da curva do meio; a borda e as duas fileiras do meio exatas; o miolo com a cota da própria forma, de peso 1 sem a energia e 0,003
 *  com ela): o desvio em y (mm) a mais de 100 mm da borda, sem a opção, com a etapa B e com a curvatura normal. */
export function provaDaGrade(opcoes = {}, razoes = [1, 2]) {
  const nx = 15; const saida = [];
  for (const [nome, f] of Object.entries(FORMAS_DA_GRADE)) for (const razao of razoes) {
    const a = 0.6 / (7 + 7 * razao); const xs = (i) => -0.3 + (i <= 7 ? i * a : 7 * a + (i - 7) * a * razao); const zs = (j) => -0.3 + (0.6 * j) / 14;
    const g = grade(nx, nx, (i, j) => [xs(i), f(xs(i), zs(j)), zs(j)]);
    const exata = (k) => { const i = k % nx, j = Math.floor(k / nx); return i === 0 || j === 0 || i === nx - 1 || j === nx - 1 || i === 7 || j === 7; };
    const medidas = (peso) => g.vertices.map((_, indice) => ({ indice, peso: exata(indice) ? Infinity : peso }));
    const desvio = (vertices) => {
      const sup = superficieLimite({ ...g, vertices }); let pior = 0;
      for (let fi = 0; fi < g.faces.length; fi++) for (const u of [0.25, 0.5, 0.75]) for (const v of [0.25, 0.5, 0.75]) {
        const p = sup.avaliar(fi, u, v).ponto;
        if (Math.min(0.3 - Math.abs(p[0]), 0.3 - Math.abs(p[2])) >= 0.1) pior = Math.max(pior, Math.abs(p[1] - f(p[0], p[2])));
      }
      return r4(pior * 1000);
    };
    const ajuste = ajustarPelaNormal(g, medidas(0.003), opcoes);
    saida.push({ forma: nome, razao, semAOpcaoMm: desvio(ajustarGaiolaAsMedidasComPeso(g, medidas(1), null).vertices), etapaBMm: desvio(ajustarGaiolaAsMedidasComPeso(g, medidas(0.003), { tipo: 'variacaoDeCurvatura' }).vertices), normalMm: desvio(ajuste.vertices), ajuste: resumoDoAjuste(ajuste) });
  }
  return saida;
}

/** provaDaEnergia() -> por gaiola amostrada de uma forma: a energia da curvatura normal e a da etapa B (a do núcleo) sobre a própria
 *  gaiola, as duas sem o fator (onda/2π)⁶ (1/m⁴, somadas nas arestas), a razão de cada uma para a da cúbica de referência na mesma
 *  grade, e o maior salto de curvatura entre dois vértices vizinhos (1/m) com a maior curvatura da forma ao lado. */
export function provaDaEnergia() {
  const h = 0.03; const altura = (f, nx = 15, nz = 15, passo = h) => grade(nx, nz, (i, j) => [(i - (nx - 1) / 2) * passo, f((i - (nx - 1) / 2) * passo, (j - (nz - 1) / 2) * passo), (j - (nz - 1) / 2) * passo]);
  const desigual = (f) => { const a = 0.6 / 21; const xs = (i) => -0.3 + (i <= 7 ? i * a : 7 * a + (i - 7) * a * 2); return grade(15, 15, (i, j) => [xs(i), f(xs(i), -0.3 + (0.6 * j) / 14), -0.3 + (0.6 * j) / 14]); };
  const R = 0.5; const calota = (x, z) => R - Math.sqrt(R * R - x * x - z * z); const cilindro = (x) => 1 - Math.sqrt(1 - x * x);
  const inclinada = (x, z) => 3 * x * x - 4 * x * z + 2 * z * z + 0.2 * x - 0.1;
  const gaiolas = {
    'cúbica de referência (y = 5x³, passo de 30 mm)': altura((x) => 5 * x * x * x),
    'plano inclinado, espaçamento desigual e torto': grade(15, 15, (i, j) => { const x = 0.03 * i + 0.002 * i * i + 0.001 * j, z = 0.025 * j + 0.0015 * j * j - 0.0007 * i; return [x, 0.3 * x - 0.2 * z + 0.05, z]; }),
    'cilindro R 1 m, passo igual no ângulo e no eixo': grade(15, 15, (i, j) => { const t = (i - 7) * 0.03; return [Math.sin(t), 1 - Math.cos(t), (j - 7) * 0.03]; }),
    'cilindro R 1 m, passo igual no plano': altura(cilindro),
    'cilindro R 1 m, grade de razão 2': desigual(cilindro),
    'esfera R 0,5 m, passo igual na latitude e na longitude': grade(15, 15, (i, j) => { const lon = (i - 7) * 0.06, lat = (j - 7) * 0.06; return [R * Math.cos(lat) * Math.sin(lon), R - R * Math.cos(lat) * Math.cos(lon), R * Math.sin(lat)]; }),
    'esfera R 0,5 m, passo igual no plano (30 mm)': altura(calota),
    'esfera R 0,5 m, passo igual no plano (15 mm)': altura(calota, 29, 29, h / 2),
    'esfera R 0,5 m, grade de razão 2': desigual(calota),
    'quadrática inclinada do teste da etapa B (3x² − 4xz + 2z² + 0,2x − 0,1)': altura(inclinada),
    'paraboloide R 0,5 m (x² + z²), passo igual no plano': altura((x, z) => x * x + z * z),
    'paraboloide R 0,5 m, grade de razão 2': desigual((x, z) => x * x + z * z),
  };
  const medir = (g) => {
    const e = energiaNormal(termosDaCurvaturaNormal(g, 2 * Math.PI), g.vertices);
    const B = energiaDeVariacaoDeCurvatura(g); const eb = B.valor(g.vertices) / (B.onda / (2 * Math.PI)) ** 6;
    const T = topologiaRegular(g); let maiorCurvatura = 0;
    g.vertices.forEach((_, i) => { if (!T.regular(i)) return; const c = curvaturasDoVertice(g.vertices, T.anel(i, 0)); for (const l of [c.linhas[0], c.linhas[2]]) { let k = 0; for (const [j, w] of l) k += w * dot(c.n, g.vertices[j]); maiorCurvatura = Math.max(maiorCurvatura, Math.abs(k)); } });
    return { normal: e.energia, etapaB: eb, maiorSalto: e.maiorSalto, maiorCurvatura };
  };
  const ref = medir(gaiolas['cúbica de referência (y = 5x³, passo de 30 mm)']);
  return Object.entries(gaiolas).map(([nome, g]) => { const m = medir(g); return { gaiola: nome, energiaNormal: sig(m.normal), sobreACubica: sig(m.normal / ref.normal), energiaDaEtapaB: sig(m.etapaB), etapaBSobreACubica: sig(m.etapaB / ref.etapaB), maiorSaltoDeCurvatura: sig(m.maiorSalto), maiorCurvatura: sig(m.maiorCurvatura) }; });
}

/* as chapas do neutro da receita de prova `nome`: a de hoje, a da etapa B e a da etapa B com os vértices da gaiola trocados pelos do ajuste */
function chapasDaReceita(nome, opcoes) {
  const neutro = (receita) => executarReceita({ ...receita, PASSOS: receita.PASSOS.filter(([op]) => op === 'subdivisao'), vaos: undefined }).neutro.chapas[0];
  const hoje = neutro(receitaDeProva(nome, { marcarCurvas: true }));
  const receita = receitaDeProva(nome, { marcarCurvas: true, alisarSuperficie: true }); const etapaB = neutro(receita);
  const [, passo] = receita.PASSOS.find(([op]) => op === 'subdivisao');
  const r = gaiolaDoPasso(passo, contexto(receita.REDE.pontos));
  if (r.erro) throw new Error(r.erro.join(': '));
  let dif = 0; r.gaiola.vertices.forEach((p, k) => { dif = Math.max(dif, dist(p, etapaB.vertices[k])); });
  if (!(dif < 1e-12) || r.gaiola.vertices.length !== etapaB.vertices.length || hoje.vertices.length !== etapaB.vertices.length) throw new Error(`${nome}: a gaiola refeita difere da do passo em ${dif}`);
  const ajuste = ajustarPelaNormal({ ...r.declaradaCheia, borda: passo.borda ?? 'suave' }, r.medidas, opcoes);
  return { hoje, etapaB, normal: { ...etapaB, vertices: ajuste.vertices }, ajuste, exatos: new Set(r.medidas.filter((m) => m.peso === Infinity).map((m) => m.indice)) };
}

/** provaDasEmendas(opcoes) -> por chapa emendada: a medida na curva `emenda` e a distância à desenhada, hoje, na etapa B e na normal */
export function provaDasEmendas(opcoes = {}, nomes = ['emenda-g2', 'emenda-dupla', 'emenda-g1']) {
  return nomes.map((nome) => {
    const { hoje, etapaB, normal, ajuste, exatos } = chapasDaReceita(nome, opcoes);
    const medir = (chapa) => { const m = medirEmenda(nome, chapa, exatos); return { inclinacao: m.inclinacao, inclinacaoNaBorda: m.inclinacaoNaBorda, naCurva: m.naCurva, aoLado: m.aoLado, crista: m.cristaPontual.maxima, salto: m.salto, distanciaJuntoMm: m.distanciaJuntoMm, distanciaMm: m.distanciaMm }; };
    return { chapa: nome, ajuste: resumoDoAjuste(ajuste), hoje: medir(hoje), etapaB: medir(etapaB), normal: medir(normal) };
  });
}

/** provaDaRede(opcoes) -> a `rede-sem-ruido`: as viradas por metro por classe e a distância a `painel(x, z)`, hoje, na etapa B e na normal */
export function provaDaRede(opcoes = {}) {
  const { hoje, etapaB, normal, ajuste } = chapasDaReceita('rede-sem-ruido', opcoes);
  return { chapa: 'rede-sem-ruido', ajuste: resumoDoAjuste(ajuste), hoje: medirRede(hoje), etapaB: medirRede(etapaB), normal: medirRede(normal) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2); const qual = args.find((a) => !a.startsWith('--'));
  const opcao = (nome) => args.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3);
  const opcoes = { cota: opcao('cota') ?? 'completa', onda: opcao('onda') != null ? Number(opcao('onda')) / 1000 : null, pesoDoMiolo: opcao('miolo') != null ? Number(opcao('miolo')) : null, ...(opcao('definicao') ? { definicao: JSON.parse(opcao('definicao')) } : {}) };
  const provas = { analiticas: provaDasAnaliticas, grade: provaDaGrade, energia: provaDaEnergia, emendas: provaDasEmendas, rede: provaDaRede };
  if (!provas[qual]) { console.error('uso: curvatura-normal.mjs analiticas | grade | energia | emendas | rede [--cota=normal|completa] [--onda=<mm>] [--miolo=<peso>] [--definicao=<json>]'); process.exit(2); }
  process.stdout.write(`${JSON.stringify(provas[qual](opcoes), null, 1)}\n`);
}
