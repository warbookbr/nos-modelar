#!/usr/bin/env node
/* energia-de-curvatura.mjs — PROTÓTIPO, fora do núcleo, da etapa A do degrau 3 da fatia 5 do plano das ferramentas de correção de
 * superfície (`docs/modelar/planos/2026-11-16-ferramentas-de-correcao-de-superficie.md`): a energia de variação de curvatura no lugar do
 * regularizador do ajuste das cotas com peso.
 *
 * O QUE TROCA. `ajustarGaiolaAsMedidasComPeso` (`procedural/nucleo/subdivisao.js`) minimiza Σ p_i ‖L_i(x) − a_i‖² + Σ ‖x_j − c_j‖², com
 * as cotas exatas como restrição: o segundo termo cobra o quanto cada ponto da gaiola anda, e junto das curvas exatas ele deixa a crista
 * de curvatura que o oráculo mostrou. Aqui o segundo termo é a variação da curvatura do limite, e do deslocamento sobra só um resto ε que
 * tira a indeterminação:
 *
 *   Σ p_i ‖L_i(x) − a_i‖² + μ E(x) + ε Σ ‖x_j − c_j‖²      sujeita a  L_k(x) = a_k  para cada cota exata k,     ε = 1e-9.
 *
 * A ENERGIA. No vértice regular (valência 4, quatro faces de quatro lados, fora da borda, sem canto declarado e sem aresta de vinco), as
 * derivadas segundas da superfície limite saem do anel 3×3 P_ab (a, b em −1, 0, 1) pelos estênceis da B-spline bicúbica:
 *
 *   S_uu = Σ s_a m_b P_ab,   S_vv = Σ m_a s_b P_ab,   S_uv = Σ d_a d_b P_ab,     m = (1/6, 4/6, 1/6), s = (1, −2, 1), d = (−1/2, 0, 1/2),
 *
 * e D_i = (S_uu/ℓu², √2 S_uv/(ℓu ℓv), S_vv/ℓv²), com ℓu e ℓv os comprimentos das arestas do vértice na gaiola DECLARADA (congelados: a
 * energia fica quadrática em x). E = Σ sobre as arestas (s, t) entre dois vértices regulares de (ℓu ℓv/ℓ_st²) ‖D_s − D_t‖², com os eixos
 * dos dois alinhados pela aresta (u ao longo dela, v para o mesmo lado). É nula em toda quadrática no parâmetro. O vinco, a borda, o
 * canto e o extraordinário não têm termo próprio: entram só como pontos do anel dos vizinhos regulares.
 *
 * A ESCALA. μ = (onda/2π)⁶/(ℓu ℓv), que com o fator da aresta dá (onda/2π)⁶/ℓ_st² por aresta. `onda` é o comprimento de onda em que a
 * energia e a cota de peso 1 pesam o mesmo: a senoide de comprimento `onda` cotada com peso 1 sai com metade da amplitude (no contínuo; na
 * gaiola, 0,46 a quatro arestas por onda e 0,50 a oito, pelo teste). Padrão: quatro vezes a mediana das arestas da gaiola declarada.
 *
 * NADA DISTO MUDA O NÚCLEO: o protótipo monta a mesma gaiola do passo `subdivisao` (`gaiolaDoPasso`), tira dela a gaiola declarada e as
 * medidas, resolve o próprio sistema e devolve a gaiola ajustada, para as medidas existentes (`superficieLimite`, `medirCurvasDoNeutro`,
 * `ondeOndula`) lerem. Os pesos do ponto limite saem de `limitesDaGaiola` aplicada à base, e o sistema, de `fatorarLU` e `resolverLU`.
 *
 * A ETAPA B (2026-11-19) levou a energia ao núcleo (`energiaDeVariacaoDeCurvatura` e o argumento `regularizacao` em
 * `procedural/nucleo/subdivisao.js`, a opção `alisarSuperficie` da `gaiolaPorRede`). Este arquivo fica como a bancada das variantes medidas
 * antes da escolha, e cada prova sai com três colunas: `hoje` (a rede sem a opção), `prototipo` (o ajuste daqui, com as opções da linha de
 * comando; sem opção nenhuma é o da etapa A) e `nucleo` (a rede com `alisarSuperficie`, montada pelo passo `subdivisao`).
 * Desde 2026-11-19 a rede com `alisarSuperficie` tem o miolo preenchido pelas curvas vizinhas, e a coluna `nucleo` o traz; a etapa B como
 * foi medida (o preenchimento padrão com a energia) sai de `preenchimento-do-miolo.mjs`, na coluna `hoje.comEnergia`.
 *
 * Uso: node tools/fixtures/correcao-de-superficie/energia-de-curvatura.mjs analiticas | emendas | rede  [opções]
 *   --onda=<mm>              o comprimento de onda (no protótipo e no núcleo); --miolo=<peso> troca o peso das cotas de peso finito (protótipo)
 *   --longe-da-borda         tira o termo dos vértices cujo anel toca a borda livre (variante da etapa A, que não melhorou a distância)
 *   --comprimento=parametro  o comprimento por aresta no parâmetro (um passo só, a mediana), como no núcleo; o padrão `espaco` é o da etapa A
 *   --curvatura=limite | limiteNaBorda   as derivadas pelas diferenças dos pontos limite do anel, em todo vértice ou só junto da borda
 *   --cruzamento=semTermo [--corte=anel] tira os termos que tocam o cruzamento de duas curvas exatas (a aresta, ou o anel)
 *   --cruzamento=<peso> [--vizinhanca=<n>] troca por esse peso a cota exata das curvas a até n arestas do cruzamento
 *   --rede=<json>            opções a mais da `gaiolaPorRede` nas analíticas do protótipo, como {"liso":false} ou {"interior":false}
 *   --definicao=<json>       opções de `definicaoAnalitica`, como {"pontos":16} (um ponto-chave por ponto da gaiola)
 *   A saída é JSON na saída padrão. */
import { pathToFileURL } from 'node:url';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { gaiolaPorRede } from '../../../procedural/nucleo/gaiola-por-rede.js';
import { gaiolaDoPasso } from '../../../procedural/nucleo/operacoes/subdivisao.js';
import { curvaturaNormal, descendenciaDasLinhas, fatorarLU, limitesDaGaiola, resolverLU, superficieLimite } from '../../../procedural/nucleo/subdivisao.js';
import { EMENDAS, EMENDA_X_MM, SUPERFICIES_ANALITICAS, definicaoAnalitica, painel, pontoDaEmenda, receitaDeProva } from './chapas.mjs';
import { medirCurvasDoNeutro } from './medida-na-curva.mjs';
import { ondeOndula } from './onde-ondula.mjs';

export const EPSILON_DO_DESLOCAMENTO = 1e-9;
const M = [1 / 6, 4 / 6, 1 / 6]; const S = [1, -2, 1]; const D = [-0.5, 0, 0.5];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const chave = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);

/** topologiaRegular(gaiola) -> { regular(i), anel(i, k), vizinhos(i), arestas }: os vértices regulares da gaiola e o anel 3×3 de cada um.
 *  `anel(i, k)` devolve a grade [a + 1][b + 1] dos índices com +u no k-ésimo vizinho de `vizinhos(i)` e +v no seguinte dele na volta. */
export function topologiaRegular({ vertices, faces, vincos = [], cantos = [] }, { longeDaBorda = false } = {}) {
  const n = vertices.length;
  const usos = new Map(); const facesDoV = Array.from({ length: n }, () => []);
  faces.forEach((f, fi) => f.forEach((a, k) => { facesDoV[a].push(fi); const c = chave(a, f[(k + 1) % f.length]); usos.set(c, (usos.get(c) ?? 0) + 1); }));
  const grau = new Array(n).fill(0); const fora = new Set(cantos); const naBorda = new Set();
  for (const [c, q] of usos) { const [a, b] = c.split(',').map(Number); grau[a]++; grau[b]++; if (q !== 2) { fora.add(a); fora.add(b); naBorda.add(a); naBorda.add(b); } }
  for (const [a, b, nitidez] of vincos) { if (nitidez > 0) { fora.add(a); fora.add(b); } } // [a, b, nitidez em níveis], como na gaiola do núcleo
  const voltas = new Map();
  const volta = (i) => {
    if (voltas.has(i)) return voltas.get(i);
    let r = null;
    if (!fora.has(i) && grau[i] === 4 && facesDoV[i].length === 4 && facesDoV[i].every((fi) => faces[fi].length === 4)) {
      /* cada face [i, a, d, b] liga o vizinho a ao seguinte b, com o canto oposto d entre os dois */
      const seguinte = new Map();
      for (const fi of facesDoV[i]) { const f = faces[fi]; const k = f.indexOf(i); seguinte.set(f[(k + 1) % 4], { b: f[(k + 3) % 4], d: f[(k + 2) % 4] }); }
      const viz = [Math.min(...seguinte.keys())]; const diag = [];
      for (let k = 0; k < 4; k++) { const s = seguinte.get(viz[k]); if (!s) break; diag.push(s.d); if (k < 3) viz.push(s.b); }
      if (diag.length === 4 && new Set(viz).size === 4 && seguinte.get(viz[3]).b === viz[0]) r = { viz, diag };
      /* `longeDaBorda`: o vértice cujo anel toca a borda livre fica sem termo, e o degrau da regra de borda não entra na energia */
      if (r && longeDaBorda && [...viz, ...diag].some((j) => naBorda.has(j))) r = null;
    }
    voltas.set(i, r);
    return r;
  };
  const anel = (i, k) => {
    const { viz, diag } = volta(i); const v = (j) => viz[(k + j) % 4]; const q = (j) => diag[(k + j) % 4];
    return [[q(2), v(2), q(1)], [v(3), i, v(1)], [q(3), v(0), q(0)]]; // [a + 1][b + 1]
  };
  const arestas = [];
  for (const c of [...usos.keys()].sort((x, y) => { const [a, b] = x.split(',').map(Number); const [p, q] = y.split(',').map(Number); return a - p || b - q; })) {
    const [a, b] = c.split(',').map(Number);
    if (volta(a) && volta(b)) arestas.push([a, b]);
  }
  return { regular: (i) => volta(i) !== null, vizinhos: (i) => volta(i)?.viz ?? null, anel, arestas };
}

/** as três linhas esparsas (Map índice -> peso) de S_uu, S_uv e S_vv sobre o anel [a + 1][b + 1] */
export function estenceisDoAnel(anel) {
  const uu = new Map(), uv = new Map(), vv = new Map();
  const soma = (m, j, w) => { if (w !== 0) m.set(j, (m.get(j) ?? 0) + w); };
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const j = anel[a][b]; soma(uu, j, S[a] * M[b]); soma(vv, j, M[a] * S[b]); soma(uv, j, D[a] * D[b]); }
  return { uu, uv, vv };
}

const aplicar = (linha, P) => { const r = [0, 0, 0]; for (const [j, w] of linha) { r[0] += w * P[j][0]; r[1] += w * P[j][1]; r[2] += w * P[j][2]; } return r; };

/** termosDaEnergia(gaiolaDeclarada, onda) -> [{ peso, linhas: [Map, Map, Map] }]: por aresta entre regulares, o peso (onda/2π)⁶/ℓ_st² e as
 *  três linhas de D_s − D_t, com os comprimentos da gaiola declarada. E(x) = Σ peso Σ_c ‖linha_c · x‖². */
export function termosDaEnergia(gaiola, onda, opcoes = {}) {
  const P = gaiola.vertices; const T = topologiaRegular(gaiola, opcoes);
  const K = (onda / (2 * Math.PI)) ** 6;
  const h = opcoes.comprimento === 'parametro' ? medianaDasArestas(gaiola) : null;
  const solto = opcoes.semTermoEm ?? null; const alcance = opcoes.alcanceDoCorte ?? 'aresta';
  /* `curvatura: 'limite'` tira as derivadas das diferenças dos PONTOS LIMITE do anel (a média da derivada segunda do limite na vizinhança
     do vértice), e não dos pontos da gaiola; 'limiteNaBorda', só no vértice cujo anel toca a borda livre */
  const modo = opcoes.curvatura ?? 'gaiola'; const W = modo === 'gaiola' ? null : pesosDoLimite(gaiola);
  const bordas = new Set();
  if (modo === 'limiteNaBorda') { const usos = new Map(); for (const f of gaiola.faces) f.forEach((a, k) => { const c = chave(a, f[(k + 1) % f.length]); usos.set(c, (usos.get(c) ?? 0) + 1); }); for (const [c, q] of usos) if (q !== 2) for (const a of c.split(',')) bordas.add(Number(a)); }
  const peloLimite = (A) => {
    const uu = new Map(), uv = new Map(), vv = new Map();
    const soma = (m, j, w) => { if (w !== 0) for (const [c, wc] of W[j]) m.set(c, (m.get(c) ?? 0) + w * wc); };
    for (let a = 0; a < 3; a++) { soma(uu, A[a][1], S[a]); soma(vv, A[1][a], S[a]); for (let b = 0; b < 3; b++) soma(uv, A[a][b], D[a] * D[b]); }
    return { uu, uv, vv };
  };
  const D3 = (i, k) => {
    const A = T.anel(i, k); const e = modo === 'limite' || (modo === 'limiteNaBorda' && A.flat().some((j) => bordas.has(j))) ? peloLimite(A) : estenceisDoAnel(A);
    const lu = h ?? (dist(P[i], P[A[2][1]]) + dist(P[i], P[A[0][1]])) / 2; const lv = h ?? (dist(P[i], P[A[1][2]]) + dist(P[i], P[A[1][0]])) / 2;
    return [[e.uu, 1 / (lu * lu)], [e.uv, Math.SQRT2 / (lu * lv)], [e.vv, 1 / (lv * lv)]];
  };
  const tocaOCorte = (s, t) => solto && (alcance === 'aresta' ? solto.has(s) || solto.has(t) : [s, t].some((i) => T.anel(i, 0).flat().some((j) => solto.has(j))));
  return T.arestas.filter(([s, t]) => !tocaOCorte(s, t)).map(([s, t]) => {
    /* em s, +u é t; em t, +u é o vizinho oposto a s, e o +v dos dois cai do mesmo lado porque a malha é orientada */
    const ks = T.vizinhos(s).indexOf(t); const kt = (T.vizinhos(t).indexOf(s) + 2) % 4;
    const Ds = D3(s, ks), Dt = D3(t, kt);
    const linhas = Ds.map(([ls, es], c) => {
      const m = new Map(); const [lt, et] = Dt[c];
      for (const [j, w] of ls) m.set(j, (m.get(j) ?? 0) + w * es);
      for (const [j, w] of lt) m.set(j, (m.get(j) ?? 0) - w * et);
      return m;
    });
    const l = h ?? dist(P[s], P[t]);
    return { aresta: [s, t], peso: K / (l * l), linhas };
  });
}

/** energiaDaGaiola(termos, vertices) -> E, sem o fator (onda/2π)⁶ quando os termos vêm de onda = 2π */
export function energiaDaGaiola(termos, vertices) {
  let E = 0;
  for (const { peso, linhas } of termos) for (const l of linhas) { const r = aplicar(l, vertices); E += peso * (r[0] * r[0] + r[1] * r[1] + r[2] * r[2]); }
  return E;
}

/* os pesos do ponto limite de cada vértice, pela própria `limitesDaGaiola` aplicada à base, três vértices por chamada (um por eixo) */
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

const medianaDasArestas = ({ vertices, faces }) => {
  const c = [];
  for (const f of faces) for (let k = 0; k < f.length; k++) c.push(dist(vertices[f[k]], vertices[f[(k + 1) % f.length]]));
  c.sort((a, b) => a - b);
  return c[c.length >> 1];
};

/**
 * ajustarComEnergia(gaiolaDeclarada, medidas, { onda, pesoDoMiolo, epsilon }) -> { vertices, onda, energiaAntes, energiaDepois, deslocamento, residuoExato }
 * gaiolaDeclarada: { vertices, faces, vincos, cantos, borda } como declarada (a `declaradaCheia` de `gaiolaDoPasso`); medidas: a lista
 * { indice, peso } do passo, com peso Infinity para a cota exata. `onda` na unidade da gaiola (padrão: quatro arestas medianas);
 * `pesoDoMiolo` troca o peso de toda cota de peso finito. Todos os vértices são incógnitas.
 */
export function ajustarComEnergia(gaiola, medidas, { onda = null, pesoDoMiolo = null, longeDaBorda = false, epsilon = EPSILON_DO_DESLOCAMENTO, comprimento = 'espaco', curvatura = 'gaiola', cruzamento = null, alcanceDoCorte = 'aresta', vizinhanca = 1 } = {}) {
  const P = gaiola.vertices; const nV = P.length;
  const ondaUsada = onda ?? 4 * medianaDasArestas(gaiola);
  const pesoDe = new Map();
  for (const { indice, peso } of medidas) pesoDe.set(indice, peso === Infinity ? Infinity : (pesoDoMiolo ?? peso));
  /* o cruzamento de duas curvas exatas: o vértice regular exato com os quatro vizinhos exatos. `cruzamento: 'semTermo'` tira da energia
     os termos que o tocam; um número troca por esse peso a cota exata dos vértices das curvas a até `vizinhanca` arestas dele */
  let semTermoEm = null; const afrouxados = [];
  if (cruzamento != null) {
    const T0 = topologiaRegular(gaiola); const ex = (i) => pesoDe.get(i) === Infinity;
    const nos = [...pesoDe.keys()].filter((i) => ex(i) && T0.regular(i) && T0.vizinhos(i).every(ex)).sort((a, b) => a - b);
    if (cruzamento === 'semTermo') semTermoEm = new Set(nos);
    else for (const x of nos) for (let k = 0; k < 4; k++) { let ant = x; let v = T0.vizinhos(x)[k]; for (let d = 1; d <= vizinhanca && v != null && ex(v); d++) { pesoDe.set(v, cruzamento); afrouxados.push(v); const viz = T0.vizinhos(v); if (!viz) break; const prox = viz[(viz.indexOf(ant) + 2) % 4]; ant = v; v = prox; } }
  }
  const ordem = [...pesoDe.keys()].sort((a, b) => a - b);
  const exatos = ordem.filter((i) => pesoDe.get(i) === Infinity); const comPeso = ordem.filter((i) => pesoDe.get(i) !== Infinity);
  const W = pesosDoLimite(gaiola);
  const nE = exatos.length; const n = nV + nE;
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  const rhs = [0, 1, 2].map((ax) => P.map((p) => epsilon * p[ax]).concat(new Array(nE).fill(0)));
  for (let k = 0; k < nV; k++) A[k][k] = epsilon;
  for (const i of comPeso) {
    const p = pesoDe.get(i);
    for (const [r, wr] of W[i]) { for (const [c, wc] of W[i]) A[r][c] += p * wr * wc; for (let ax = 0; ax < 3; ax++) rhs[ax][r] += p * wr * P[i][ax]; }
  }
  const termos = termosDaEnergia(gaiola, ondaUsada, { longeDaBorda, comprimento, curvatura, semTermoEm, alcanceDoCorte });
  for (const { peso, linhas } of termos) for (const l of linhas) for (const [r, wr] of l) for (const [c, wc] of l) A[r][c] += peso * wr * wc;
  exatos.forEach((i, s) => {
    const r = nV + s;
    for (const [c, wc] of W[i]) { A[r][c] += wc; A[c][r] += wc; }
    for (let ax = 0; ax < 3; ax++) rhs[ax][r] = P[i][ax];
  });
  const lu = fatorarLU(A);
  if (lu.singularEm >= 0) throw new Error(`energia de curvatura: sistema singular na coluna ${lu.singularEm} de ${n}`);
  const eixos = rhs.map((b) => resolverLU(lu, b));
  const V = P.map((_, j) => [eixos[0][j], eixos[1][j], eixos[2][j]]);
  const L = limitesDaGaiola({ ...gaiola, vertices: V });
  let residuoExato = 0, deslocamento = 0;
  for (const i of exatos) residuoExato = Math.max(residuoExato, dist(L[i], P[i]));
  for (let j = 0; j < nV; j++) deslocamento = Math.max(deslocamento, dist(V[j], P[j]));
  let residuoAfrouxado = 0; for (const i of afrouxados) residuoAfrouxado = Math.max(residuoAfrouxado, dist(L[i], P[i]));
  return { residuoAfrouxado, vertices: V, onda: ondaUsada, arestasComTermo: termos.length, energiaAntes: energiaDaGaiola(termos, P), energiaDepois: energiaDaGaiola(termos, V), deslocamento, residuoExato };
}

/** gaiolasDoPasso(passo, pontos, opcoes) -> { hoje, prototipo, ajuste }: a gaiola ajustada pelo núcleo e a do protótipo, do mesmo passo */
export function gaiolasDoPasso(passo, pontos, opcoes = {}) {
  const r = gaiolaDoPasso(passo, { vec: (p) => (typeof p === 'string' ? pontos[p] : p), num: Number });
  if (r.erro) throw new Error(r.erro.join(': '));
  if (!r.declaradaCheia || !r.medidas) throw new Error('energia de curvatura: o passo não tem medidas');
  const borda = passo.borda ?? 'suave';
  const ajuste = ajustarComEnergia({ ...r.declaradaCheia, borda }, r.medidas, opcoes);
  const exatos = new Set(r.medidas.filter((m) => m.peso === Infinity).map((m) => m.indice));
  return { hoje: { ...r.gaiola, borda }, prototipo: { ...r.gaiola, borda, vertices: ajuste.vertices }, ajuste, exatos };
}

/* ---------- as provas: o número de hoje e o do protótipo ---------- */

const PARAMETROS = [0, 0.25, 0.5, 0.75];
const r4 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1e4) / 1e4);

/* as amostras da superfície limite, 16 por face de quatro lados da gaiola: o ponto (mm) e a normal */
function amostrar(gaiola) {
  const sup = superficieLimite(gaiola); const pontos = [];
  gaiola.faces.forEach((f, fi) => {
    const cantos = f.length === 4 ? [0] : f.map((_, k) => k);
    for (const canto of cantos) for (const u of PARAMETROS) for (const v of PARAMETROS) { const a = sup.avaliar(fi, u, v, { canto }); pontos.push({ p: a.ponto.map((c) => c * 1000), n: a.normal }); }
  });
  return pontos;
}

/* a curvatura transversal na curva e na borda da faixa (duas arestas da gaiola, ou `faixaArestas`), pela medida do núcleo, sobre a gaiola
   refinada dois níveis como no passo de prova */
function cristas(gaiola, curvas, faixaArestas = 2) {
  const chapa = { passo: 0, origemId: null, vertices: gaiola.vertices, faces: gaiola.faces, vincos: gaiola.vincos ?? [], cantos: gaiola.cantos ?? [], borda: gaiola.borda, niveis: 2 };
  const cadeias = descendenciaDasLinhas(gaiola.faces, gaiola.vertices.length, 2, curvas.map((c) => c.gaiola));
  chapa.curvas = curvas.map((c, k) => ({ nome: c.nome, continuidade: null, espelho: false, gaiola: c.gaiola, vertices: cadeias[k] }));
  const passo = medianaDasArestas(gaiola) * 1000;
  return medirCurvasDoNeutro({ chapas: [chapa] }, { faixaMm: faixaArestas * passo })[0].curvas
    .map((m) => ({ nome: m.nome, naCurva: m.curvaturaNaLinha, aoLado: m.curvaturaNaFaixa, crista: r4(Math.max(...m.curvaturaNaFaixa.map((k) => Math.abs(m.curvaturaNaLinha - k)))) }));
}

/** cristaPontual(gaiola, cadeia, { afastamento }) -> { maxima, mediana, vertices }: em cada vértice regular da curva (a cadeia de índices da
 *  gaiola), a mais de `afastamento` arestas das duas pontas, a curvatura normal do limite na direção que atravessa a curva, menos a média
 *  da mesma curvatura nos dois vértices da fileira ao lado (1/unidade da gaiola). É a segunda diferença da curvatura transversal através
 *  da curva: zero onde ela varia em linha reta de um lado ao outro, e a altura da crista (ou do vale) onde a curva a tem. A medida de
 *  Com `exatos` (os índices das cotas exatas), o vértice da curva que cruza outra curva exata sai à parte, em `noCruzamento`. A medida de
 *  `medirLinhasNoLimite` compara medianas da curva inteira e da faixa, que diferem sem crista quando a curvatura varia ao longo da curva. */
export function cristaPontual(gaiola, cadeia, { afastamento = 4, exatos = null } = {}) {
  const sup = superficieLimite(gaiola); const T = topologiaRegular(gaiola); const P = gaiola.vertices;
  const CANTO = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const faceDe = new Map();
  gaiola.faces.forEach((f, fi) => { if (f.length === 4) f.forEach((v, k) => { if (!faceDe.has(v)) faceDe.set(v, [fi, k]); }); });
  const k = (v, d) => { const [fi, c] = faceDe.get(v); return curvaturaNormal(sup.avaliar(fi, ...CANTO[c]), d); };
  const valores = []; let noCruzamento = null;
  for (let j = afastamento; j < cadeia.length - afastamento; j++) {
    const v = cadeia[j]; if (!T.regular(v)) continue;
    const viz = T.vizinhos(v); const a = viz.indexOf(cadeia[j + 1]);
    if (a < 0 || viz[(a + 2) % 4] !== cadeia[j - 1]) continue;
    const e = viz[(a + 1) % 4], d = viz[(a + 3) % 4];
    const dir = [P[d][0] - P[e][0], P[d][1] - P[e][1], P[d][2] - P[e][2]];
    const crista = Math.abs(k(v, dir) - (k(e, dir) + k(d, dir)) / 2);
    /* no cruzamento com outra curva exata a curvatura transversal é a da outra curva, que o ajuste não escolhe: sai à parte */
    if (exatos?.has(e) && exatos.has(d)) noCruzamento = Math.max(noCruzamento ?? 0, crista); else valores.push(crista);
  }
  const o = [...valores].sort((x, y) => x - y);
  return { maxima: r4(o[o.length - 1] ?? null), mediana: r4(o[o.length >> 1] ?? null), vertices: o.length, noCruzamento: r4(noCruzamento), valores: valores.map(r4) };
}

/** medirAnalitica(Sa, gaiola, curvas, exatos): a distância (mm) à superfície analítica `Sa` e as cristas das `curvas` ({ nome, gaiola }) */
export function medirAnalitica(Sa, gaiola, curvas, exatos = null) {
  let inteira = 0, a50 = 0, a100 = 0;
  for (const { p } of amostrar(gaiola)) {
    const d = Math.abs(Sa.distancia(p)); const b = Sa.aBorda(p);
    inteira = Math.max(inteira, d); if (b >= 50) a50 = Math.max(a50, d); if (b >= 100) a100 = Math.max(a100, d);
  }
  return { distanciaMm: r4(inteira), a50Mm: r4(a50), a100Mm: r4(a100), cristas: cristas(gaiola, curvas), cristaPontual: curvas.map((c) => ({ nome: c.nome, ...cristaPontual(gaiola, c.gaiola, { exatos }) })) };
}

/** provaDasAnaliticas(opcoes) -> por superfície: a distância (mm) na chapa inteira, a 50 e a 100 mm da borda, e a crista das curvas de dentro */
export function provaDasAnaliticas(opcoes = {}, superficies = Object.keys(SUPERFICIES_ANALITICAS)) {
  return superficies.map((nome) => {
    const Sa = SUPERFICIES_ANALITICAS[nome];
    const g = gaiolaPorRede({ ...definicaoAnalitica(nome, opcoes.definicao ?? {}), marcarCurvas: true, ...(opcoes.rede ?? {}) });
    const { hoje, prototipo, ajuste, exatos } = gaiolasDoPasso(g.passo, g.pontos, opcoes);
    /* o núcleo com a opção ligada (`alisarSuperficie` na rede), sobre a mesma definição: a mesma topologia e os mesmos nomes de ponto */
    const gn = gaiolaPorRede({ ...definicaoAnalitica(nome, opcoes.definicao ?? {}), marcarCurvas: true, alisarSuperficie: opcoes.onda ? { onda: opcoes.onda * 1000 } : true });
    const rn = gaiolaDoPasso(gn.passo, { vec: (p) => (typeof p === 'string' ? gn.pontos[p] : p), num: Number });
    if (rn.erro) throw new Error(rn.erro.join(': '));
    const nucleo = { ...rn.gaiola, borda: 'suave' };
    const indice = new Map(g.passo.vertices.map((v, k) => [typeof v === 'string' ? v : v.nome ?? v[0], k]));
    const curvas = g.passo.curvas.filter((c) => c.nome === 'h1' || c.nome === 'v1').map((c) => ({ nome: c.nome, gaiola: c.pontos.map((p) => indice.get(p)) }));
    const medir = (gaiola) => medirAnalitica(Sa, gaiola, curvas, exatos);
    return { residuoAfrouxadoMm: r4(ajuste.residuoAfrouxado * 1000), superficie: nome, ondaMm: r4(ajuste.onda * 1000), deslocamentoDaGaiolaMm: r4(ajuste.deslocamento * 1000), energia: [ajuste.energiaAntes, ajuste.energiaDepois], hoje: medir(hoje), prototipo: medir(prototipo), nucleo: medir(nucleo) };
  });
}

/* a chapa do neutro com os vértices da gaiola trocados pelos do protótipo; confere que a gaiola refeita aqui é a do passo */
function chapasDaReceita(nome, opcoes) {
  const receita = receitaDeProva(nome, { marcarCurvas: true });
  const [, passo] = receita.PASSOS.find(([op]) => op === 'subdivisao');
  const [chapa] = executarReceita({ ...receita, PASSOS: receita.PASSOS.filter(([op]) => op === 'subdivisao'), vaos: undefined }).neutro.chapas;
  const { hoje, prototipo, ajuste, exatos } = gaiolasDoPasso(passo, receita.REDE.pontos, opcoes);
  let dif = 0;
  hoje.vertices.forEach((p, k) => { dif = Math.max(dif, dist(p, chapa.vertices[k])); });
  if (!(dif < 1e-12) || hoje.vertices.length !== chapa.vertices.length) throw new Error(`${nome}: a gaiola refeita difere da do passo em ${dif}`);
  const comOpcao = receitaDeProva(nome, { marcarCurvas: true, alisarSuperficie: opcoes.onda ? { onda: opcoes.onda * 1000 } : true });
  const [nucleo] = executarReceita({ ...comOpcao, PASSOS: comOpcao.PASSOS.filter(([op]) => op === 'subdivisao'), vaos: undefined }).neutro.chapas;
  return { hoje: chapa, prototipo: { ...chapa, vertices: prototipo.vertices }, nucleo, ajuste, exatos };
}

/* a distância (mm) da superfície limite à altura desenhada y(x, z), pela diferença em y projetada na normal */
function distanciaADesenhada(chapa, altura, perto = () => true) {
  let pior = 0, pertoPior = 0;
  for (const { p, n } of amostrar({ vertices: chapa.vertices, faces: chapa.faces, vincos: chapa.vincos, cantos: chapa.cantos, borda: chapa.borda })) {
    const d = Math.abs((p[1] - altura(p[0], p[2])) * (n ? n[1] : 1));
    pior = Math.max(pior, d); if (perto(p)) pertoPior = Math.max(pertoPior, d);
  }
  return [r4(pior), r4(pertoPior)];
}

/** medirEmenda(nome, chapa, exatos): a medida na curva `emenda` da chapa emendada `nome` e a distância (mm) à desenhada */
export function medirEmenda(nome, chapa, exatos = null) {
  const m = medirCurvasDoNeutro({ chapas: [chapa] }, { curvas: ['emenda'] })[0].curvas[0];
  const [inteira, junto] = distanciaADesenhada(chapa, (x, z) => pontoDaEmenda(nome, Math.min(600, Math.max(0, x)), Math.min(400, Math.max(0, z)))[1], (p) => Math.abs(p[0] - EMENDA_X_MM) <= 60);
  const cadeia = chapa.curvas.find((c) => c.nome === 'emenda').gaiola;
  return { cristaPontual: cristaPontual({ vertices: chapa.vertices, faces: chapa.faces, vincos: chapa.vincos, cantos: chapa.cantos, borda: chapa.borda }, cadeia, { exatos }), inclinacao: m.inclinacaoForaDosSingulares, inclinacaoNaBorda: m.inclinacaoNaBorda, naCurva: m.curvaturaNaLinha, aoLado: m.curvaturaNaFaixa, salto: m.salto, distanciaMm: inteira, distanciaJuntoMm: junto };
}

/** provaDasEmendas(opcoes) -> por chapa emendada: a medida na curva `emenda` e a distância à desenhada, hoje e no protótipo */
export function provaDasEmendas(opcoes = {}, nomes = ['emenda-g2', 'emenda-dupla', 'emenda-g1']) {
  return nomes.map((nome) => {
    const { hoje, prototipo, nucleo, ajuste, exatos } = chapasDaReceita(nome, opcoes);
    const medir = (chapa) => medirEmenda(nome, chapa, exatos);
    return { chapa: nome, desenhada: [1000 / EMENDAS[nome].raioEsquerdaMm, 1000 / EMENDAS[nome].raioDireitaMm].map(r4), ondaMm: r4(ajuste.onda * 1000), hoje: medir(hoje), prototipo: medir(prototipo), nucleo: medir(nucleo) };
  });
}

/** medirRede(chapa): as viradas por metro por classe da `rede-sem-ruido` e a distância (mm) a `painel(x, z)`, na chapa e a 100 mm da borda */
export function medirRede(chapa) {
  const o = ondeOndula(chapa).classes;
  const [inteira, dentro] = distanciaADesenhada(chapa, painel, (p) => Math.min(p[0], 1000 - p[0], p[2], 500 - p[2]) >= 100);
  return { viradasPorM: Object.fromEntries(Object.entries(o).map(([c, v]) => [c, v.viradasPorM])), amplitude: Object.fromEntries(Object.entries(o).map(([c, v]) => [c, v.amplitudeMediana])), energia: Object.fromEntries(Object.entries(o).map(([c, v]) => [c, v.energia])), distanciaMm: inteira, a100Mm: dentro };
}

/** provaDaRede(opcoes) -> a `rede-sem-ruido`: as viradas por metro por classe e a distância a `painel(x, z)`, hoje e no protótipo */
export function provaDaRede(opcoes = {}) {
  const { hoje, prototipo, nucleo, ajuste } = chapasDaReceita('rede-sem-ruido', opcoes);
  return { chapa: 'rede-sem-ruido', ondaMm: r4(ajuste.onda * 1000), arestasComTermo: ajuste.arestasComTermo, hoje: medirRede(hoje), prototipo: medirRede(prototipo), nucleo: medirRede(nucleo) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2); const qual = args.find((a) => !a.startsWith('--'));
  const opcao = (nome) => args.find((a) => a.startsWith(`--${nome}=`))?.split('=')[1];
  const opcoes = { onda: opcao('onda') != null ? Number(opcao('onda')) / 1000 : null, pesoDoMiolo: opcao('miolo') != null ? Number(opcao('miolo')) : null, longeDaBorda: args.includes('--longe-da-borda'),
    comprimento: opcao('comprimento') ?? 'espaco', curvatura: opcao('curvatura') ?? 'gaiola', cruzamento: opcao('cruzamento') == null ? null : (opcao('cruzamento') === 'semTermo' ? 'semTermo' : Number(opcao('cruzamento'))), alcanceDoCorte: opcao('corte') ?? 'aresta', vizinhanca: Number(opcao('vizinhanca') ?? 1), ...(opcao('rede') ? { rede: JSON.parse(opcao('rede')) } : {}), ...(opcao('definicao') ? { definicao: JSON.parse(opcao('definicao')) } : {}) };
  const provas = { analiticas: provaDasAnaliticas, emendas: provaDasEmendas, rede: provaDaRede };
  if (!provas[qual]) { console.error('uso: energia-de-curvatura.mjs analiticas | emendas | rede [--onda=<mm>] [--miolo=<peso>] [--longe-da-borda]'); process.exit(2); }
  process.stdout.write(`${JSON.stringify(provas[qual](opcoes), null, 1)}\n`);
}
