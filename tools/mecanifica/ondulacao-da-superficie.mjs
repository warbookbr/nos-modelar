#!/usr/bin/env node
/* ondulacao-da-superficie.mjs — acha onde a superfície de subdivisão de uma receita ondula, salta ou dobra fora dos
 * vincos declarados, e diz quanto (em milímetro) e quais pontos nomeados da gaiola mexer.
 *
 * POR QUE ELE EXISTE. A zebra e as listras de reflexo mostram a ondulação à pessoa, mas a IA que lê uma imagem de listras
 * não sabe dizer de quantos milímetros é o defeito nem que ponto da gaiola o causa. Esta ferramenta lê a própria malha que
 * a receita entrega, sem referência externa, e devolve cada falha com posição, amplitude, extensão e os nomes dos pontos
 * da gaiola que mais pesam nela. A zebra continua para a pessoa e o crítico conferirem.
 *
 * COMO MEDE. A receita roda como nas ferramentas oficiais (`executarReceita`, com `TOPO`), e cada passo `subdivisao` tem
 * a sua superfície externa lida dos vértices que o passo entregou. Em cada vértice, a versão suavizada local é um
 * polinômio cúbico da altura sobre o plano tangente, ajustado por mínimos quadrados pesados aos vértices a até `raio`
 * espaçamentos da gaiola (o tamanho médio da aresta da face da gaiola de que o vértice descende), com peso gaussiano de
 * meio raio e reajuste robusto (biquadrado de Tukey sobre o desvio mediano), de modo que o próprio calombo não puxa o
 * ajuste. O ajuste usa os vértices até o primeiro nível do refino, a meio espaçamento. A vizinhança cresce de face em face,
 * pelo caminho de centro em centro até o raio, e não atravessa vinco declarado nem borda, nem contorna a ponta de um
 * vinco; o vértice que fica num vinco é medido de cada lado, e vale o lado de menor desvio. O desvio do vértice à versão
 * suavizada, pela normal, é a ondulação: o defeito da escala da gaiola fica no desvio, e a forma desenhada, de escala
 * maior, fica no ajuste. A curvatura principal da superfície (ajuste quadrático a três quartos de espaçamento) e a da
 * versão suavizada saem em cada falha, e a diferença entre elas é a variação de curvatura que o desvio integra; a troca
 * de sinal do desvio numa mesma falha é a troca de sinal da derivada da curvatura em comprimento curto, que a falha
 * relata como `ondulacao`, e a falha de um sinal só é `calombo`, para fora ou para dentro.
 *
 * O raio de 3 espaçamentos e o limiar de 0,3 mm saem da chapa de prova do teste: com 2 espaçamentos o ajuste engolia
 * metade de uma ondulação de 1 mm entre dois pontos vizinhos (0,50 mm lidos), com 3 lê de 0,85 a 0,88 mm, e na forma lisa
 * o maior desvio fora da zona da borda fica em 0,23 mm (0,13 mm no miolo); o ajuste de quarto grau, com 3,5 e 4
 * espaçamentos, acusava de 0,22 a 0,27 mm junto dos cantos da forma lisa. Abaixo de 0,3 mm a ferramenta passa a
 * confundir forma de escala de três espaçamentos com ondulação.
 *
 * Os vértices com desvio acima de `limiarMm` semeiam regiões, que crescem pelos vizinhos de mesmo sinal acima da metade
 * do limiar; regiões cujos picos ficam a menos de 1,5 espaçamento se juntam numa falha. A emenda é a aresta fora dos
 * vincos declarados em que o ângulo entre as faces passa em `emendaGraus` e no dobro o das arestas paralelas dos dois
 * lados, que é descontinuidade de normal e não curvatura; como a superfície limite só dobra num vinco, ela aparece onde a
 * gaiola se dobra quase como um vinco. A falha cujo pico fica a menos de `zonaDeclarada` espaçamentos de um vinco, de uma
 * borda ou de um canto declarados vai para `junto`, e não para `falhas`: ali o desvio é da feição que a receita pediu, e
 * a ferramenta não separa um defeito colado a ela. Na simetria em x, só a metade declarada é relatada.
 *
 * OS PONTOS. A malha entregue é linear na gaiola (subdividida e, com medidas, levada ao ponto limite), e o peso de cada
 * ponto da gaiola num vértice sai do próprio núcleo, rodando `subdividirCatmullClark` sobre um recorte da gaiola em volta
 * da falha com a base no lugar das posições, três pontos por vez, como `pesosDaEstrela` faz no ponto limite; o recorte é
 * conferido, porque cada vértice da falha tem de sair dele na mesma posição que na malha inteira. A influência de um
 * ponto é a soma, nos vértices da falha, do desvio vezes o peso, e saem de dois a quatro pontos em ordem, cada um com o
 * `desvioMm` do vértice dele (positivo, para fora da versão suavizada): numa `ondulacao` os pontos têm sinais contrários,
 * e o sentido de cada um só se lê aí. `extensaoEmEspacamentos` é a extensão da falha dividida pelo espaçamento da gaiola
 * nela. Até uns dois espaçamentos a falha é de um ou dois pontos, e o desvio cai quase por inteiro quando eles andam o
 * desvio; acima de três a versão suavizada acompanha o ponto que se moveu, uma rodada tira cerca de um quarto e a falha
 * reaparece nos vizinhos. Com medidas, a gaiola é a ajustada pelo núcleo: mexer no ponto declarado move o ajustado e a
 * superfície passa pelo ponto declarado.
 *
 * A FACE VIRADA. A superfície que se dobra sobre si mesma, como a de uma faixa estreita ao lado de faces largas sem transição, ou a de
 * cota exata nos pontos de um anel, tem faces cuja normal se inverte em relação à da vizinha; a curvatura, o desvio à versão suavizada
 * e a emenda não a acusam, e uma transição malfeita virou 137 faces em nível 2 sem falha. A aresta fora dos vincos e das bordas
 * declarados em que o ângulo entre as normais das duas faces passa de `viradaGraus` (90) é de face virada; as que se tocam formam uma
 * falha `faceVirada`, que traz `faces` (as das duas bandas das arestas), `facesViradas` (as que têm a normal contra a da face da gaiola
 * declarada de que descendem, na mancha toda e não só junto da aresta), `arestas`, o maior `anguloGraus`, a posição e os pontos nomeados que mais pesam nela, e a superfície
 * traz `facesViradas`, a soma. Toda face virada é falha, mesmo junto de uma feição.
 *
 * OS AVISOS DA GAIOLA. A gaiola que declara `leitura` avisa pelo nome quando duas estações-chave vizinhas ficam mais perto do que o
 * erro de leitura sustenta; a superfície traz esses avisos em `avisosDaGaiola`, que não contam como falha.
 *
 * A ORIGEM. Quando a gaiola saiu de `gaiolaPorEstacoes`, cada ponto citado traz `origem`: a entrada declarada (estação e coluna),
 * a coluna amostrada numa curva de seção (curva e fração) ou a estação gerada pela interpolação (as chaves que a cercam, a fração
 * e os nós), que é o que diz se o ponto se edita ou sai de outros. Quando saiu de `gaiolaPorRede`, a origem é o ponto-chave declarado
 * (o nó dado por coordenada), o ponto de dentro de um arco de curva (a curva, a fração do comprimento e os dois pontos-chave que o cercam)
 * ou o ponto de dentro de um retalho (as curvas da borda dele). Falha de mais de três espaçamentos se resolve com
 * `npm run alisar`, que usa `devolverOperador`: a linha do operador linear do desvio de cada vértice (o desvio é a normal vezes o
 * vértice menos a soma dos pesos vezes a vizinhança, dividida pela inclinação do ajuste), com os pesos robustos e o referencial fixos.
 *
 * Mesma receita, mesma saída: nenhuma conta depende de relógio, acaso ou ordem de mapa.
 *
 *   node tools/mecanifica/ondulacao-da-superficie.mjs <peça> [--limiar-mm=0.3] [--raio=3] [--zona=1] [--emenda-graus=2] [--virada-graus=90]
 */
import { pathToFileURL } from 'node:url';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { criarResolverNumerico } from '../../procedural/nucleo/expressoes.js';
import { idDoPasso } from '../../procedural/nucleo/nucleo.js';
import { gaiolaDoPasso } from '../../procedural/nucleo/operacoes/subdivisao.js';
import { capturarGaiolas } from '../../procedural/nucleo/gaiola-por-estacoes.js';
import { subdividirCatmullClark } from '../../procedural/nucleo/subdivisao.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

export const PADROES = Object.freeze({ limiarMm: 0.3, raio: 3, zonaDeclarada: 1, emendaGraus: 2, viradaGraus: 90 });
const MM = 1000;
const JUNTAR = 1.5;
const TUKEY = 4.685;
const ITERACOES_ROBUSTAS = 4;
const MAXIMO_DE_PONTOS = 4;

const arred = (x, casas = 3) => { const f = 10 ** casas; const r = Math.round(x * f) / f; return Object.is(r, -0) ? 0 : r; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const l = norma(a); return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0]; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function newell(pts) {
  const n = [0, 0, 0];
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

/* ---- topologia da malha ---- */

function topologia(V, F) {
  const nV = V.length;
  const chave = (a, b) => (a < b ? a * nV + b : b * nV + a);
  const arestas = new Map();
  F.forEach((f, fi) => {
    for (let k = 0; k < f.length; k++) {
      const a = f[k], b = f[(k + 1) % f.length]; const c = chave(a, b);
      let e = arestas.get(c);
      if (!e) { e = { a: Math.min(a, b), b: Math.max(a, b), faces: [] }; arestas.set(c, e); }
      e.faces.push(fi);
    }
  });
  const facesDoV = Array.from({ length: nV }, () => []);
  F.forEach((f, fi) => { for (const v of f) facesDoV[v].push(fi); });
  const vizinhos = Array.from({ length: nV }, () => []);
  for (const e of arestas.values()) { vizinhos[e.a].push(e.b); vizinhos[e.b].push(e.a); }
  for (const l of vizinhos) l.sort((x, y) => x - y);
  return { chave, arestas, facesDoV, vizinhos };
}

/* A face da gaiola de que cada face da malha descende: no primeiro nível a face de k lados vira k quads em sequência, e
 * em cada nível seguinte cada quad vira quatro, na ordem de `subdividirCatmullClark`. */
export function donoNaGaiola(facesGaiola, niveis) {
  if (niveis === 0) return (f) => f;
  const dono1 = [];
  facesGaiola.forEach((f, fi) => { for (let k = 0; k < f.length; k++) dono1.push(fi); });
  const fator = 4 ** (niveis - 1);
  return (f) => dono1[Math.floor(f / fator)];
}

/* ---- álgebra pequena: mínimos quadrados pesados ---- */

function resolver(A, b) {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let k = 0; k < n; k++) {
    let p = k; for (let r = k + 1; r < n; r++) if (Math.abs(M[r][k]) > Math.abs(M[p][k])) p = r;
    if (!(Math.abs(M[p][k]) > 1e-14)) return null;
    if (p !== k) [M[p], M[k]] = [M[k], M[p]];
    for (let r = k + 1; r < n; r++) { const f = M[r][k] / M[k][k]; if (f !== 0) for (let c = k; c <= n; c++) M[r][c] -= f * M[k][c]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let c = r + 1; c < n; c++) s -= M[r][c] * x[c]; x[r] = s / M[r][r]; }
  return x;
}

const BASE_CUBICA = (u, v) => [1, u, v, u * u, u * v, v * v, u * u * u, u * u * v, u * v * v, v * v * v];
const BASE_QUADRATICA = (u, v) => [1, u, v, u * u, u * v, v * v];

/* Mínimos quadrados pesados de z sobre as linhas `phi` da base (calculadas uma vez por vizinhança). */
function ajustar(phi, z, pesos) {
  const m = phi[0].length; const A = Array.from({ length: m }, () => new Float64Array(m)); const b = new Float64Array(m);
  for (let i = 0; i < phi.length; i++) {
    const w = pesos[i]; if (!(w > 0)) continue;
    const f = phi[i];
    for (let r = 0; r < m; r++) { const wr = w * f[r]; b[r] += wr * z[i]; const Ar = A[r]; for (let c = r; c < m; c++) Ar[c] += wr * f[c]; }
  }
  for (let r = 0; r < m; r++) for (let c = 0; c < r; c++) A[r][c] = A[c][r];
  let traco = 0; for (let r = 0; r < m; r++) traco += A[r][r];
  for (let r = 0; r < m; r++) A[r][r] += 1e-12 * traco;
  return resolver(A.map((r) => [...r]), [...b]);
}

/* A linha do ajuste que dá o primeiro coeficiente (o valor ajustado no ponto): com a base `phi` e os pesos `pesos` do
   último ajuste, c0 = Σ π_i z_i, e π_i = w_i (φ_i · y) com (Φᵀ W Φ) y = e0. Vale para os pesos fixos, que é o que o
   desvio do vértice, linear nas posições da vizinhança, precisa para ser derivado dela. */
function linhaDoAjuste(phi, pesos) {
  const m = phi[0].length; const A = Array.from({ length: m }, () => new Float64Array(m));
  for (let i = 0; i < phi.length; i++) {
    const w = pesos[i]; if (!(w > 0)) continue;
    const f = phi[i];
    for (let r = 0; r < m; r++) { const wr = w * f[r]; const Ar = A[r]; for (let c = r; c < m; c++) Ar[c] += wr * f[c]; }
  }
  for (let r = 0; r < m; r++) for (let c = 0; c < r; c++) A[r][c] = A[c][r];
  let traco = 0; for (let r = 0; r < m; r++) traco += A[r][r];
  for (let r = 0; r < m; r++) A[r][r] += 1e-12 * traco;
  const e0 = new Array(m).fill(0); e0[0] = 1;
  const y = resolver(A.map((r) => [...r]), e0);
  return y ? phi.map((f, i) => (pesos[i] > 0 ? pesos[i] * avaliar(y, f) : 0)) : null;
}

const avaliar = (c, f) => { let s = 0; for (let k = 0; k < c.length; k++) s += c[k] * f[k]; return s; };

function mediana(lista) {
  const s = Float64Array.from(lista).sort(); const n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0;
}

/* Curvaturas principais do gráfico w(u, v) no ponto (0, 0), em 1/m, a partir dos coeficientes em coordenadas divididas
 * por `escala`: w_u = c1, w_v = c2, w_uu = 2 c3 / escala, w_uv = c4 / escala, w_vv = 2 c5 / escala. */
function curvaturas(c, escala) {
  const p = c[1], q = c[2]; const r = 2 * c[3] / escala, s = c[4] / escala, t = 2 * c[5] / escala;
  const E = 1 + p * p, Fm = p * q, G = 1 + q * q; const W = Math.sqrt(1 + p * p + q * q);
  const L = r / W, Mm = s / W, N = t / W; const det = E * G - Fm * Fm;
  const K = (L * N - Mm * Mm) / det; const H = (E * N - 2 * Fm * Mm + G * L) / (2 * det);
  const d = Math.sqrt(Math.max(0, H * H - K));
  return [H + d, H - d];
}

/* ---- a superfície entregue por cada passo `subdivisao` ---- */

/** superficiesDaReceita(receita) -> uma entrada por passo `subdivisao` executado, com a malha externa que o passo
 *  entregou (posições lidas do estado da receita), a gaiola de que ela saiu e o que é declarado nela. */
export function superficiesDaReceita(receita) {
  const { resultado: { entrada, neutro }, gaiolas } = capturarGaiolas(() => executarReceita(receita));
  const dict = { ...entrada.PARAMS, ...entrada.TOPO };
  const { num } = criarResolverNumerico(dict);
  const vec = (a) => (typeof a === 'string' ? dict[a] : a).map(num);
  const lista = [];
  entrada.PASSOS.forEach(([op, args = {}], i) => {
    if (op !== 'subdivisao') return;
    const resolvida = gaiolaDoPasso(args, { vec, num });
    if (resolvida.erro) throw new Error(`ondulacao: o passo ${i} (subdivisao) não resolve a gaiola: ${resolvida.erro[1]}`);
    const { gaiola, declarados, declaradaCheia, medidas } = resolvida;
    const niveis = Math.trunc(num(args.niveis ?? 2));
    const borda = args.borda ?? 'suave';
    const aoLimite = args.medidas != null;
    const r = subdividirCatmullClark({ ...gaiola, niveis, borda, aoLimite, comVincos: true });
    const vertices = r.vertices.map((_, k) => {
      const p = neutro.V.get(idDoPasso(i, k));
      if (!p) throw new Error(`ondulacao: o vértice ${k} da superfície do passo ${i} não está na malha entregue; um passo posterior o tirou`);
      return [...p];
    });
    const origem = gaiola.vertices.map((_, k) => k);
    if (gaiola.imagem) gaiola.imagem.forEach((k, j) => { origem[k] = j; });
    const nomeDe = (j) => { const d = declarados[origem[j]]; return typeof d === 'string' ? d : `[${vec(d).map((x) => arred(x * MM, 1)).join(', ')}]`; };
    /* a origem de cada ponto, quando a gaiola saiu de `gaiolaPorEstacoes`: a entrada declarada, a coluna de curva de seção
       ou a estação gerada de que ele vem */
    const montada = gaiolas.find((x) => x.passo.vertices.length === declarados.length && x.passo.vertices.every((n, k) => n === declarados[k])) ?? null;
    const origemDe = (j) => { const d = declarados[origem[j]]; return montada && typeof d === 'string' ? (montada.origens[d] ?? null) : null; };
    lista.push({
      passo: i, origemId: args.origemId ?? null, niveis, borda, aoLimite, simetria: args.simetria ?? null,
      vertices, faces: r.faces, vincos: r.vincos, gaiola: { ...gaiola, borda }, calculados: r.vertices,
      origem, nomeDe, origemDe, declarados, declaradaCheia, medidas, avisos: montada?.avisos ?? [],
    });
  });
  return lista;
}

/* ---- pesos da gaiola nos vértices de uma falha ---- */

function chaveDePosicao(p, celula) { return `${Math.round(p[0] / celula)},${Math.round(p[1] / celula)},${Math.round(p[2] / celula)}`; }

/** influenciaDaGaiola(sup, regiao) -> [{ indice, peso }] da gaiola cheia, somando |desvio| × peso nos vértices da região.
 *  `regiao` é uma lista de { v, desvio }. */
export function influenciaDaGaiola(sup, regiao, topo = topologia(sup.calculados, sup.faces)) {
  const { gaiola, niveis, borda, aoLimite, calculados } = sup;
  const dono = donoNaGaiola(gaiola.faces, niveis);
  const facesDoPonto = Array.from({ length: gaiola.vertices.length }, () => []);
  gaiola.faces.forEach((f, fi) => { for (const v of f) facesDoPonto[v].push(fi); });
  let anel = new Set();
  for (const { v } of regiao) for (const f of topo.facesDoV[v]) anel.add(dono(f));
  const expandir = (conjunto) => { const novo = new Set(conjunto); for (const fi of conjunto) for (const v of gaiola.faces[fi]) for (const g of facesDoPonto[v]) novo.add(g); return novo; };
  /* o suporte: a malha sobre uma face da gaiola, levada ao limite, depende só dos pontos das faces a até dois anéis
     dela; o recorte leva mais um anel, para que a regra nesses pontos seja a da gaiola inteira, e cresce se não bastar */
  for (let k = 0; k < 2; k++) anel = expandir(anel);
  const suporte = new Set([...anel].flatMap((fi) => gaiola.faces[fi]));
  for (let aneis = 3; aneis <= 6; aneis++) {
    anel = expandir(anel);
    const faces = [...anel].sort((a, b) => a - b);
    const globais = [...new Set(faces.flatMap((fi) => gaiola.faces[fi]))].sort((a, b) => a - b);
    const local = new Map(globais.map((g, k) => [g, k]));
    const subFaces = faces.map((fi) => gaiola.faces[fi].map((g) => local.get(g)));
    const arestas = new Set(); for (const f of subFaces) for (let k = 0; k < f.length; k++) { const a = f[k], b = f[(k + 1) % f.length]; arestas.add(a < b ? `${a},${b}` : `${b},${a}`); }
    const vincos = []; for (const [a, b, s] of gaiola.vincos) { if (!local.has(a) || !local.has(b)) continue; const x = local.get(a), y = local.get(b); if (arestas.has(x < y ? `${x},${y}` : `${y},${x}`)) vincos.push([x, y, s]); }
    const cantos = gaiola.cantos.filter((c) => local.has(c)).map((c) => local.get(c));
    const rodar = (vertices) => subdividirCatmullClark({ vertices, faces: subFaces, vincos, cantos, niveis, borda, aoLimite }).vertices;
    const real = rodar(globais.map((g) => gaiola.vertices[g]));
    const celula = 1e-7; const indice = new Map();
    real.forEach((p, k) => { const c = chaveDePosicao(p, celula); if (!indice.has(c)) indice.set(c, []); indice.get(c).push(k); });
    const achar = (p) => {
      const cx = Math.round(p[0] / celula), cy = Math.round(p[1] / celula), cz = Math.round(p[2] / celula);
      let melhor = -1, dm = 1e-9;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        for (const k of indice.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) { const d = dist(real[k], p); if (d <= dm) { dm = d; melhor = k; } }
      }
      return melhor;
    };
    const par = regiao.map(({ v }) => achar(calculados[v]));
    if (par.some((k) => k < 0)) continue;
    const influencia = new Map(); const refeito = regiao.map(() => [0, 0, 0]);
    const comPeso = globais.filter((g) => suporte.has(g));
    for (let b0 = 0; b0 < comPeso.length; b0 += 3) {
      const base = globais.map((g) => { const k = comPeso.indexOf(g, b0) - b0; return [k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0]; });
      const saida = rodar(base);
      for (let k = 0; k < 3 && b0 + k < comPeso.length; k++) {
        const g = comPeso[b0 + k]; let soma = 0;
        regiao.forEach(({ desvio }, t) => {
          const w = saida[par[t]][k]; soma += Math.abs(desvio) * Math.abs(w);
          const P = gaiola.vertices[g]; refeito[t][0] += w * P[0]; refeito[t][1] += w * P[1]; refeito[t][2] += w * P[2];
        });
        if (soma > 0) influencia.set(g, soma);
      }
    }
    /* conferência: a soma dos pesos vezes a gaiola refaz cada vértice da falha */
    const erro = Math.max(...regiao.map(({ v }, t) => dist(refeito[t], calculados[v])));
    if (erro > 1e-8) throw new Error(`ondulacao: os pesos da gaiola não refazem a malha (erro ${erro.toExponential(2)} m)`);
    return [...influencia].map(([indice, peso]) => ({ indice, peso })).sort((a, b) => b.peso - a.peso || a.indice - b.indice);
  }
  throw new Error('ondulacao: o recorte da gaiola em volta da falha não reproduz a malha inteira');
}

/* ---- a leitura ---- */

/** ondulacaoDaSuperficie(sup, opcoes) -> { falhas, junto, desvio } de uma superfície de `superficiesDaReceita`. */
export function ondulacaoDaSuperficie(sup, opcoes = {}) {
  const o = { ...PADROES, ...opcoes };
  const V = sup.vertices; const F = sup.faces; const nV = V.length;
  const topo = topologia(V, F);
  const { chave, arestas, facesDoV } = topo;
  /* o que é declarado: vincos (vivos e de nitidez fracionária), borda e cantos */
  const declarada = new Set();
  for (const [a, b] of sup.vincos) declarada.add(chave(a, b));
  for (const [c, e] of arestas) if (e.faces.length !== 2) declarada.add(c);
  const naFeicao = new Uint8Array(nV);
  for (const c of declarada) { const e = arestas.get(c); naFeicao[e.a] = 1; naFeicao[e.b] = 1; }
  for (const c of sup.gaiola.cantos) naFeicao[c] = 1;
  const feicao = []; for (let v = 0; v < nV; v++) if (naFeicao[v]) feicao.push(v);
  /* normais e centros das faces, normal dos vértices */
  const nf = F.map((f) => newell(f.map((v) => V[v])));
  const centro = F.map((f) => { const c = [0, 0, 0]; for (const v of f) { c[0] += V[v][0]; c[1] += V[v][1]; c[2] += V[v][2]; } return c.map((x) => x / f.length); });
  /* espaçamento da gaiola: aresta média da face da gaiola de que cada face descende */
  const G = sup.gaiola; const dono = donoNaGaiola(G.faces, sup.niveis);
  const hDaFaceG = G.faces.map((f) => { let s = 0; for (let k = 0; k < f.length; k++) s += dist(G.vertices[f[k]], G.vertices[f[(k + 1) % f.length]]); return s / f.length; });
  const h = new Float64Array(nV);
  for (let v = 0; v < nV; v++) { let s = 0; for (const f of facesDoV[v]) s += hDaFaceG[dono(f)]; h[v] = s / facesDoV[v].length; }
  const limiar = o.limiarMm / MM; const sMin = limiar / 8;
  /* O ajuste usa os vértices até o primeiro nível (a meio espaçamento da gaiola), que o refino mantém nos primeiros
     índices: bastam para a forma de escala maior que a gaiola, e o desvio de cada vértice da malha sai do ajuste. */
  let amostra = nV;
  if (sup.niveis >= 2) { const ar = new Set(); for (const f of G.faces) for (let k = 0; k < f.length; k++) { const a = f[k], b = f[(k + 1) % f.length]; ar.add(a < b ? `${a},${b}` : `${b},${a}`); } amostra = G.vertices.length + ar.size + G.faces.length; }

  /* setores do vértice: as faces dele que se alcançam sem atravessar aresta declarada */
  function setores(v) {
    const fs = facesDoV[v]; const pai = fs.map((_, k) => k);
    const raiz = (k) => { while (pai[k] !== k) k = pai[k] = pai[pai[k]]; return k; };
    for (const w of topo.vizinhos[v]) {
      const c = chave(v, w); if (declarada.has(c)) continue;
      const e = arestas.get(c); if (e.faces.length !== 2) continue;
      const x = fs.indexOf(e.faces[0]), y = fs.indexOf(e.faces[1]);
      const rx = raiz(x), ry = raiz(y); if (rx !== ry) pai[Math.max(rx, ry)] = Math.min(rx, ry);
    }
    const grupos = new Map(); fs.forEach((f, k) => { const r = raiz(k); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(f); });
    return [...grupos.values()];
  }

  const marcaF = new Int32Array(F.length).fill(-1); const marcaV = new Int32Array(nV).fill(-1); const geo = new Float64Array(F.length); const fechadaF = new Int32Array(F.length).fill(-1); let selo = 0;
  /* vizinhança de um setor: as faces a até o raio pelo caminho de centro em centro, de face em face por aresta não
     declarada (Dijkstra, com empate pelo índice), e os vértices delas a até o raio. O caminho, e não a distância em
     linha reta, impede que a vizinhança contorne a ponta de um vinco e pegue o outro lado dele. */
  function vizinhanca(v, faces0, R, limite = amostra) {
    selo += 1; const p = V[v]; const heap = []; const pts = []; const faces = [];
    /* fila de prioridade de pares [caminho, face], o menor caminho primeiro e o empate pelo índice da face */
    const menor = (x, y) => x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]);
    const empurrar = (item) => { heap.push(item); let k = heap.length - 1; while (k > 0) { const m = (k - 1) >> 1; if (!menor(heap[k], heap[m])) break; [heap[k], heap[m]] = [heap[m], heap[k]]; k = m; } };
    const tirar = () => { const primeiro = heap[0]; const ult = heap.pop(); if (heap.length) { heap[0] = ult; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && menor(heap[l], heap[m])) m = l; if (r < heap.length && menor(heap[r], heap[m])) m = r; if (m === k) break; [heap[k], heap[m]] = [heap[m], heap[k]]; k = m; } } return primeiro; };
    for (const f of faces0) { marcaF[f] = selo; geo[f] = dist(centro[f], p); empurrar([geo[f], f]); }
    while (heap.length) {
      const [df, f] = tirar(); if (fechadaF[f] === selo || df > geo[f]) continue; fechadaF[f] = selo; faces.push(f);
      const fv = F[f];
      for (let k = 0; k < fv.length; k++) {
        const a = fv[k]; if (marcaV[a] !== selo) { marcaV[a] = selo; if (a < limite && dist(V[a], p) <= R) pts.push(a); }
        const c = chave(a, fv[(k + 1) % fv.length]); if (declarada.has(c)) continue;
        const e = arestas.get(c); const g = e.faces[0] === f ? e.faces[1] : e.faces[0];
        if (g === undefined || fechadaF[g] === selo) continue;
        const d = df + dist(centro[f], centro[g]);
        if (d > R) continue;
        if (marcaF[g] !== selo || d < geo[g]) { marcaF[g] = selo; geo[g] = d; empurrar([d, g]); }
      }
    }
    return { pts, faces };
  }

  /* desvio do vértice à versão suavizada local de um setor, com o ajuste para as curvaturas */
  function desvioNoSetor(v, faces0, R) {
    const { pts, faces } = vizinhanca(v, faces0, R);
    if (pts.length < 8) return null;
    const p = V[v]; const sigma = R / 2;
    const n = [0, 0, 0];
    for (const f of faces) { const w = Math.exp(-((dist(centro[f], p) / sigma) ** 2)); n[0] += w * nf[f][0]; n[1] += w * nf[f][1]; n[2] += w * nf[f][2]; }
    const nz = unit(n); if (!(norma(nz) > 0)) return null;
    const ref = Math.abs(nz[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = unit(cross(ref, nz)); const e2 = cross(nz, e1);
    const loc = pts.map((a) => { const d = sub(V[a], p); return [dot(d, e1) / R, dot(d, e2) / R, dot(d, nz) / R]; });
    const g = pts.map((a) => Math.exp(-((dist(V[a], p) / sigma) ** 2)));
    const base = pts.length >= 20 ? BASE_CUBICA : BASE_QUADRATICA;
    const phi = loc.map((q) => base(q[0], q[1])); const z = loc.map((q) => q[2]);
    let pesos = g; let c = null; let usados = g;
    for (let it = 0; it < ITERACOES_ROBUSTAS; it++) {
      usados = pesos;
      c = ajustar(phi, z, pesos); if (!c) return null;
      const res = z.map((zi, k) => (zi - avaliar(c, phi[k])) * R);
      const s = Math.max(sMin, 1.4826 * mediana(res.map(Math.abs)));
      pesos = g.map((w, k) => { const t = res[k] / (TUKEY * s); return Math.abs(t) < 1 ? w * (1 - t * t) ** 2 : 0; });
    }
    const inclinacao = Math.sqrt(1 + c[1] * c[1] + c[2] * c[2]);
    const desvio = (-c[0] * R) / inclinacao;
    return { desvio, c, e1, e2, nz, R, pts, phi, usados, inclinacao };
  }

  /* A linha do operador do desvio de um vértice: com os pesos e o referencial fixos, desvio = (nz · (V_v − Σ π_a V_a)) / s,
     uma combinação linear das posições da vizinhança. Guarda só o que a ferramenta de alisamento precisa. */
  function linhaDoOperador(v, d) {
    const pi = linhaDoAjuste(d.phi, d.usados); if (!pi) return null;
    const itens = []; for (let k = 0; k < pi.length; k++) if (pi[k] !== 0) itens.push([d.pts[k], pi[k]]);
    return { v, nz: d.nz, s: d.inclinacao, itens };
  }

  const desvio = new Float64Array(nV); const ajuste = new Array(nV); const operador = opcoes.devolverOperador ? new Array(nV).fill(null) : null;
  for (let v = 0; v < nV; v++) {
    const R = o.raio * h[v]; let melhor = null;
    /* na simetria em x, a metade espelhada só é lida perto da costura, onde uma falha da metade declarada pode cruzar */
    if (sup.simetria && sup.calculados[v][0] < -2 * R) continue;
    for (const s of setores(v)) { const d = desvioNoSetor(v, s, R); if (d && (!melhor || Math.abs(d.desvio) < Math.abs(melhor.desvio))) melhor = d; }
    desvio[v] = melhor ? melhor.desvio : 0; ajuste[v] = melhor;
    if (operador && melhor) operador[v] = linhaDoOperador(v, melhor);
    if (melhor) { melhor.phi = null; melhor.pts = null; melhor.usados = null; }
  }

  /* regiões: sementes acima do limiar, crescendo pelos vizinhos de mesmo sinal acima da metade dele */
  const regiaoDe = new Int32Array(nV).fill(-1); const regioes = [];
  const maior = (a, b) => { const da = Math.abs(desvio[a]), db = Math.abs(desvio[b]); if (Math.abs(da - db) > 1e-12) return da > db ? a : b; return V[a][0] !== V[b][0] ? (V[a][0] > V[b][0] ? a : b) : Math.min(a, b); };
  for (let v = 0; v < nV; v++) {
    if (Math.abs(desvio[v]) < limiar || regiaoDe[v] >= 0) continue;
    const sinal = Math.sign(desvio[v]); const id = regioes.length; const membros = [v]; regiaoDe[v] = id;
    for (let q = 0; q < membros.length; q++) {
      const a = membros[q];
      for (const b of topo.vizinhos[a]) {
        if (regiaoDe[b] >= 0 || declarada.has(chave(a, b))) continue;
        if (Math.sign(desvio[b]) !== sinal || Math.abs(desvio[b]) < limiar / 2) continue;
        regiaoDe[b] = id; membros.push(b);
      }
    }
    let pico = membros[0]; for (const a of membros) pico = maior(pico, a);
    regioes.push({ membros, pico });
  }
  /* regiões com picos próximos formam uma falha */
  const pai = regioes.map((_, k) => k); const raiz = (k) => { while (pai[k] !== k) k = pai[k] = pai[pai[k]]; return k; };
  for (let a = 0; a < regioes.length; a++) for (let b = a + 1; b < regioes.length; b++) {
    const pa = regioes[a].pico, pb = regioes[b].pico;
    if (dist(V[pa], V[pb]) <= JUNTAR * Math.max(h[pa], h[pb])) { const ra = raiz(a), rb = raiz(b); if (ra !== rb) pai[Math.max(ra, rb)] = Math.min(ra, rb); }
  }
  const grupos = new Map(); regioes.forEach((r, k) => { const g = raiz(k); if (!grupos.has(g)) grupos.set(g, []); grupos.get(g).push(r); });

  const distFeicao = (v) => { let m = Infinity; for (const a of feicao) { const d = dist(V[a], V[v]); if (d < m) m = d; } return m; };
  const metadeDeclarada = (v) => !sup.simetria || sup.calculados[v][0] >= -1e-9;
  const diametro = (lista) => {
    const longe = (de) => { let m = lista[0], dm = -1; for (const a of lista) { const d = dist(V[a], V[de]); if (d > dm + 1e-15) { dm = d; m = a; } } return [m, dm]; };
    const [a] = longe(lista[0]); return longe(a)[1];
  };
  let topoCalculado = null;
  const pontosDe = (regiao) => {
    topoCalculado ??= topologia(sup.calculados, F);
    const brutos = influenciaDaGaiola(sup, regiao, topoCalculado);
    const porNome = new Map();
    for (const { indice, peso } of brutos) { const j = sup.origem[indice]; porNome.set(j, (porNome.get(j) ?? 0) + peso); }
    const total = [...porNome.values()].reduce((s, x) => s + x, 0);
    const ordem = [...porNome].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    const escolhidos = ordem.slice(0, 2);
    for (const par of ordem.slice(2, MAXIMO_DE_PONTOS)) if (par[1] >= 0.5 * ordem[1][1]) escolhidos.push(par); else break;
    /* o desvio com sinal do vértice do próprio ponto diz para que lado ele está: positivo, para fora da versão suavizada */
    return escolhidos.map(([j, peso]) => {
      const completa = sup.origemDe?.(j) ?? null;
      const { pontosChave, ...origem } = completa ?? {};
      return { nome: sup.nomeDe(j), influencia: arred(peso / total), desvioMm: arred(desvio[j] * MM), ...(completa ? { origem } : {}) };
    });
  };
  const curvaturaDaSuperficie = (v) => {
    const r = 0.75 * h[v]; let melhor = null;
    for (const s of setores(v)) {
      const { pts } = vizinhanca(v, s, r, nV); if (pts.length < 6) continue;
      const a = ajuste[v]; if (!a) continue;
      const loc = pts.map((k) => { const d = sub(V[k], V[v]); return [dot(d, a.e1) / r, dot(d, a.e2) / r, dot(d, a.nz) / r]; });
      const c = ajustar(loc.map((q) => BASE_QUADRATICA(q[0], q[1])), loc.map((q) => q[2]), loc.map(() => 1)); if (!c) continue;
      const k = curvaturas(c, r); if (!melhor || Math.abs(k[0]) + Math.abs(k[1]) < Math.abs(melhor[0]) + Math.abs(melhor[1])) melhor = k;
    }
    return melhor;
  };
  const falhas = []; const junto = [];
  for (const lista of grupos.values()) {
    const membros = lista.flatMap((r) => r.membros); let pico = lista[0].pico; for (const r of lista) pico = maior(pico, r.pico);
    if (!metadeDeclarada(pico)) continue;
    const positivos = membros.filter((a) => desvio[a] > 0), negativos = membros.filter((a) => desvio[a] < 0);
    const amplitude = Math.abs(desvio[pico]);
    const base = {
      tipo: positivos.length && negativos.length ? 'ondulacao' : 'calombo',
      sentido: positivos.length && negativos.length ? 'ambos' : desvio[pico] > 0 ? 'fora' : 'dentro',
      posicaoMm: V[pico].map((x) => arred(x * MM, 1)),
      amplitudeMm: arred(amplitude * MM),
      extensaoMm: arred(diametro(membros) * MM, 1),
      vertices: membros.length,
      espacamentoMm: arred(h[pico] * MM, 1),
    };
    const dF = distFeicao(pico);
    if (dF <= o.zonaDeclarada * h[pico]) { junto.push({ ...base, distanciaDaFeicaoMm: arred(dF * MM, 1) }); continue; }
    const a = ajuste[pico]; const ks = curvaturaDaSuperficie(pico);
    falhas.push({
      ...base,
      extensaoEmEspacamentos: arred(diametro(membros) / h[pico], 1),
      ...(base.tipo === 'ondulacao' ? { picosMm: { fora: arred(Math.max(...positivos.map((k) => desvio[k])) * MM), dentro: arred(Math.min(...negativos.map((k) => desvio[k])) * MM) } } : {}),
      /* os pontos saem do miolo da falha, os vértices com pelo menos metade da amplitude */
      pontos: pontosDe(membros.filter((k) => Math.abs(desvio[k]) >= amplitude / 2).map((k) => ({ v: k, desvio: desvio[k] }))),
      curvatura: {
        superficie: ks ? ks.map((x) => arred(x, 3)) : null,
        suavizada: a ? curvaturas(a.c, a.R).map((x) => arred(x, 3)) : null,
      },
    });
  }

  /* emendas: aresta fora dos vincos declarados com salto de normal em relação às arestas paralelas dos dois lados */
  const angulo = (f, g) => { const a = unit(nf[f]), b = unit(nf[g]); return Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 180 / Math.PI; };
  const opostaNaFace = (f, a, b) => {
    const fv = F[f]; if (fv.length !== 4) return null;
    const ka = fv.indexOf(a), kb = fv.indexOf(b); const k = (ka + 1) % 4 === kb ? ka : kb;
    const ch = chave(fv[(k + 2) % 4], fv[(k + 3) % 4]); if (declarada.has(ch)) return null;
    const e = arestas.get(ch); if (!e || e.faces.length !== 2) return null;
    return angulo(e.faces[0], e.faces[1]);
  };
  const emendas = [];
  for (const [c, e] of [...arestas].sort((x, y) => x[0] - y[0])) {
    if (declarada.has(c) || e.faces.length !== 2) continue;
    const t = angulo(e.faces[0], e.faces[1]);
    if (t < o.emendaGraus) continue;
    const lados = [opostaNaFace(e.faces[0], e.a, e.b), opostaNaFace(e.faces[1], e.a, e.b)].filter((x) => x !== null);
    const ref = lados.length ? Math.max(...lados) : 0;
    if (t - ref >= o.emendaGraus && t >= 2 * ref) emendas.push({ e, salto: t - ref, angulo: t });
  }
  /* emendas que se tocam formam uma falha */
  const eDe = new Map(); emendas.forEach((x, k) => { for (const v of [x.e.a, x.e.b]) { if (!eDe.has(v)) eDe.set(v, []); eDe.get(v).push(k); } });
  const visto = new Uint8Array(emendas.length);
  for (let k0 = 0; k0 < emendas.length; k0++) {
    if (visto[k0]) continue;
    const fila = [k0]; visto[k0] = 1;
    for (let q = 0; q < fila.length; q++) for (const v of [emendas[fila[q]].e.a, emendas[fila[q]].e.b]) for (const k of eDe.get(v)) if (!visto[k]) { visto[k] = 1; fila.push(k); }
    const pior = fila.reduce((m, k) => (emendas[k].salto > emendas[m].salto ? k : m), fila[0]);
    const { e } = emendas[pior]; const meio = [0, 1, 2].map((j) => (V[e.a][j] + V[e.b][j]) / 2);
    const verts = [...new Set(fila.flatMap((k) => [emendas[k].e.a, emendas[k].e.b]))].sort((x, y) => x - y);
    const vPico = dist(V[e.a], meio) <= dist(V[e.b], meio) ? e.a : e.b;
    if (!metadeDeclarada(vPico)) continue;
    const base = {
      tipo: 'emenda',
      posicaoMm: meio.map((x) => arred(x * MM, 1)),
      saltoDeNormalGraus: arred(emendas[pior].salto, 2),
      anguloGraus: arred(emendas[pior].angulo, 2),
      amplitudeMm: arred(Math.max(...verts.map((v) => Math.abs(desvio[v]))) * MM),
      extensaoMm: arred(fila.reduce((s, k) => s + dist(V[emendas[k].e.a], V[emendas[k].e.b]), 0) * MM, 1),
      vertices: verts.length,
      espacamentoMm: arred(h[vPico] * MM, 1),
    };
    const dF = distFeicao(vPico);
    if (dF <= o.zonaDeclarada * h[vPico]) { junto.push({ ...base, distanciaDaFeicaoMm: arred(dF * MM, 1) }); continue; }
    falhas.push({ ...base, pontos: pontosDe(verts.map((v) => ({ v, desvio: Math.max(Math.abs(desvio[v]), 1e-6) }))) });
  }

  /* faces viradas: a aresta fora dos vincos declarados em que as normais das duas faces passam de `viradaGraus` (90 por padrão) é
     a superfície dobrada sobre si mesma, o que nenhuma curvatura nem emenda faz: a normal de uma face se inverte em relação à da
     vizinha. As arestas que se tocam formam uma falha, com as faces das duas bandas e os pontos nomeados que mais pesam nela. */
  const util = (f) => norma(nf[f]) > 1e-18;
  /* a face virada, entre as que tocam a aresta, é a que tem a normal contra a da face da gaiola declarada de que descende */
  const declaradaDaGaiola = sup.declaradaCheia ?? G;
  const normalDoPai = declaradaDaGaiola.faces.map((f) => newell(f.map((v) => declaradaDaGaiola.vertices[v])));
  const contraOPai = (f) => dot(nf[f], normalDoPai[dono(f)]) < 0;
  /* a mancha virada: das faces contra o pai que tocam a aresta, cresce pelas vizinhas que também o estão */
  const contadas = new Set();
  const manchaVirada = (sementes) => {
    const fila = sementes.filter((f) => contraOPai(f) && !contadas.has(f)); const mancha = new Set(fila);
    for (let q = 0; q < fila.length; q++) {
      const f = fila[q]; const fv = F[f];
      for (let k = 0; k < fv.length; k++) {
        for (const g of arestas.get(chave(fv[k], fv[(k + 1) % fv.length])).faces) if (g !== f && !mancha.has(g) && !contadas.has(g) && contraOPai(g)) { mancha.add(g); fila.push(g); }
      }
    }
    for (const f of mancha) contadas.add(f);
    return mancha.size;
  };
  const viradas = [];
  for (const [c, e] of [...arestas].sort((x, y) => x[0] - y[0])) {
    if (declarada.has(c) || e.faces.length !== 2 || !util(e.faces[0]) || !util(e.faces[1])) continue;
    const t = angulo(e.faces[0], e.faces[1]);
    if (t > o.viradaGraus) viradas.push({ e, angulo: t });
  }
  const vDe = new Map(); viradas.forEach((x, k) => { for (const v of [x.e.a, x.e.b]) { if (!vDe.has(v)) vDe.set(v, []); vDe.get(v).push(k); } });
  const vista = new Uint8Array(viradas.length);
  for (let k0 = 0; k0 < viradas.length; k0++) {
    if (vista[k0]) continue;
    const fila = [k0]; vista[k0] = 1;
    for (let q = 0; q < fila.length; q++) for (const v of [viradas[fila[q]].e.a, viradas[fila[q]].e.b]) for (const k of vDe.get(v)) if (!vista[k]) { vista[k] = 1; fila.push(k); }
    const pior = fila.reduce((m, k) => (viradas[k].angulo > viradas[m].angulo ? k : m), fila[0]);
    const { e } = viradas[pior]; const meio = [0, 1, 2].map((j) => (V[e.a][j] + V[e.b][j]) / 2);
    const verts = [...new Set(fila.flatMap((k) => [viradas[k].e.a, viradas[k].e.b]))].sort((x, y) => x - y);
    const vPico = dist(V[e.a], meio) <= dist(V[e.b], meio) ? e.a : e.b;
    if (!metadeDeclarada(vPico)) continue;
    falhas.push({
      tipo: 'faceVirada',
      posicaoMm: meio.map((x) => arred(x * MM, 1)),
      anguloGraus: arred(viradas[pior].angulo, 2),
      faces: new Set(fila.flatMap((k) => viradas[k].e.faces)).size,
      facesViradas: manchaVirada([...new Set(fila.flatMap((k) => viradas[k].e.faces))]),
      arestas: fila.length,
      amplitudeMm: arred(Math.max(...verts.map((v) => Math.abs(desvio[v]))) * MM),
      extensaoMm: arred(fila.reduce((s, k) => s + dist(V[viradas[k].e.a], V[viradas[k].e.b]), 0) * MM, 1),
      vertices: verts.length,
      espacamentoMm: arred(h[vPico] * MM, 1),
      pontos: pontosDe(verts.map((v) => ({ v, desvio: Math.max(Math.abs(desvio[v]), 1e-6) }))),
    });
  }

  const ordenar = (a, b) => b.amplitudeMm - a.amplitudeMm || (b.saltoDeNormalGraus ?? 0) - (a.saltoDeNormalGraus ?? 0)
    || a.posicaoMm[0] - b.posicaoMm[0] || a.posicaoMm[1] - b.posicaoMm[1] || a.posicaoMm[2] - b.posicaoMm[2];
  falhas.sort(ordenar); junto.sort(ordenar);
  /* o desvio fora das feições declaradas, para a ordem de grandeza da superfície */
  const fora = []; for (let v = 0; v < nV; v++) if (metadeDeclarada(v) && distFeicao(v) > o.zonaDeclarada * h[v]) fora.push(Math.abs(desvio[v]) * MM);
  fora.sort((x, y) => x - y);
  const q = (p) => (fora.length ? arred(fora[Math.min(fora.length - 1, Math.floor(p * fora.length))]) : 0);
  const resumo = { falhas, junto, desvioMm: { p50: q(0.5), p95: q(0.95), maximo: fora.length ? arred(fora[fora.length - 1]) : 0, vertices: fora.length } };
  return opcoes.devolverDesvios || operador ? { ...resumo, desvios: desvio, ...(operador ? { operador, espacamentos: h, amostra, foraDaZona: (v) => metadeDeclarada(v) && distFeicao(v) > o.zonaDeclarada * h[v] } : {}) } : resumo;
}

/** ondulacaoDaReceita(receita, opcoes) -> { opcoes, superficies: [...], falhas } */
export function ondulacaoDaReceita(receita, opcoes = {}) {
  const o = { ...PADROES, ...opcoes };
  const superficies = superficiesDaReceita(receita).map((sup) => {
    const r = ondulacaoDaSuperficie(sup, o);
    const hs = []; const G = sup.gaiola;
    for (const f of G.faces) { let s = 0; for (let k = 0; k < f.length; k++) s += dist(G.vertices[f[k]], G.vertices[f[(k + 1) % f.length]]); hs.push(s / f.length); }
    hs.sort((x, y) => x - y);
    return {
      passo: sup.passo, origemId: sup.origemId, niveis: sup.niveis, vertices: sup.vertices.length, faces: sup.faces.length,
      pontosDaGaiola: G.vertices.length,
      facesViradas: r.falhas.reduce((n, f) => n + (f.tipo === 'faceVirada' ? f.facesViradas : 0), 0),
      avisosDaGaiola: sup.avisos,
      espacamentoDaGaiolaMm: { minimo: arred(hs[0] * MM, 1), mediana: arred(mediana(hs) * MM, 1), maximo: arred(hs[hs.length - 1] * MM, 1) },
      ...r,
    };
  });
  return { opcoes: o, superficies, falhas: superficies.reduce((s, x) => s + x.falhas.length, 0) };
}

function lerOpcoes(args) {
  const o = {};
  const nomes = { 'limiar-mm': 'limiarMm', raio: 'raio', zona: 'zonaDeclarada', 'emenda-graus': 'emendaGraus', 'virada-graus': 'viradaGraus' };
  for (const a of args) {
    const m = /^--([a-z-]+)=(.+)$/.exec(a);
    if (!m || !nomes[m[1]]) throw new Error(`ondulacao: opção desconhecida ${a}; as opções são ${Object.keys(nomes).map((k) => `--${k}=`).join(', ')}`);
    const x = Number(m[2]); if (!(x > 0)) throw new Error(`ondulacao: ${a} precisa ser número maior que zero`);
    o[nomes[m[1]]] = x;
  }
  return o;
}

async function principal(argv) {
  const [alvo, ...resto] = argv.slice(2);
  if (!alvo) { process.stderr.write('uso: node tools/mecanifica/ondulacao-da-superficie.mjs <peça> [--limiar-mm=0.3] [--raio=3] [--zona=1] [--emenda-graus=2] [--virada-graus=90]\n'); return 2; }
  const caminho = resolverCaminhoReceita(alvo);
  if (!caminho) { process.stderr.write(`ondulacao: não achei a receita '${alvo}'.\n`); return 2; }
  const receita = receitaDoModulo(await importarReceita(caminho));
  const resultado = ondulacaoDaReceita(receita, lerOpcoes(resto));
  process.stdout.write(`${JSON.stringify({ peca: alvo, ...resultado }, null, 2)}\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((codigo) => { process.exitCode = codigo; }, (erro) => { process.stderr.write(`${erro.message}\n`); process.exitCode = 1; });
}
