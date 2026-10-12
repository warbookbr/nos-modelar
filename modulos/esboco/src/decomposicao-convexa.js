/* Decomposição convexa de uma superfície: o casco convexo de uma nuvem de pontos e o corte de uma lista de polígonos planos
   em pedaços cujo casco quase não esconde vazio. É o que dá ao gate de contato as peças convexas de uma malha (ver `malha.js`).

   POR QUE NÃO O CASCO DA PARTE INTEIRA. O gate mede distância (GJK) e penetração (SAT) entre peças convexas, e o casco de um
   aro, de um tubo ou de um pneu tapa o furo onde entra o eixo, a haste ou o aro. Cada peça precisa ser o casco de um pedaço
   da superfície, e o pedaço precisa ser tão pouco côncavo que o casco dele não cubra vazio além de um limite.

   A MEDIDA. O casco cobre vazio onde um ponto da superfície dele está longe da superfície do sólido. Cada triângulo do casco
   é amostrado em 7 pontos, e um ponto está `longe` quando nenhum polígono da malha inteira passa a menos de `limite` dele (a
   malha inteira, e não só o pedaço, fecha as costuras entre partes vizinhas). O fundo aberto que um corte deixa (o casco
   também tem uma face no plano de corte) não é superfície do sólido: o ponto dele conta como vazio só se cai fora da seção
   do sólido pelo plano (`secaoDoPlano`), de modo que um corte através de um aro ainda enxerga o furo.

   O CORTE. Quando a parte tem um furo em torno de um eixo (o raio mínimo dos vértices ao eixo não é zero), o primeiro corte é
   em cunhas por planos que contêm o eixo, tantas quantas a corda de uma cunha precisa para o furo ficar a menos de `limite` da
   corda (o aro e o pneu em 24 cunhas, e não em milhares de pedaços de cortes paralelos aos eixos). Dentro de cada cunha, e nas
   partes sem furo, o corte é por planos paralelos aos eixos, pelo meio do vazio no eixo e na posição que deixa menos vazio
   nos dois lados. Quem desiste: o pedaço que não melhora depois de `PARADOS` cortes seguidos (a malha aberta, em que o casco
   sempre cobre a abertura) vira peça com o vazio que sobrou, e uma parte que passa do orçamento de peças sobe o limite
   (ver `decomporParte`). Determinístico: a mesma superfície dá as mesmas peças, na mesma ordem.

   Puro: só aritmética sobre listas de números. */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);

/* O mais fundo que a decomposição corta, e quantos cortes seguidos podem não reduzir o vazio. */
export const PROFUNDIDADE_MAXIMA = 14;
const PARADOS = 3;
/* Distância, em mm, de um ponto a um plano de corte para estar sobre ele. */
const SOBRE_O_PLANO = 1e-6;
/* O alcance, em células da grade, da busca da distância de um ponto à superfície. */
const ALCANCE_DA_BUSCA = 6;

/* ---------- o casco convexo ---------- */

/* O casco convexo de uma nuvem de pontos (incremental, determinístico): `{ vertices, faces, planos }`, com `faces` triângulos
   [a, b, c] de índices de `pontos` em sentido anti-horário visto de fora e `planos` { n, d } (n unitário para fora, n·p = d).
   Devolve null quando a nuvem é plana, uma reta ou um ponto (sem volume). */
export function cascoConvexo(pontos) {
  const n = pontos.length;
  if (n < 4) return null;
  const caixa = [0, 1, 2].map((e) => [Math.min(...pontos.map((p) => p[e])), Math.max(...pontos.map((p) => p[e]))]);
  const escala = Math.max(...caixa.map(([lo, hi]) => hi - lo));
  if (!(escala > 0)) return null;
  const eps = escala * 1e-9;
  /* o simplex inicial: os dois pontos mais distantes entre os extremos dos eixos, o mais longe da reta e o mais longe do plano */
  const extremos = new Set();
  for (let e = 0; e < 3; e++) {
    let lo = 0; let hi = 0;
    for (let i = 1; i < n; i++) { if (pontos[i][e] < pontos[lo][e]) lo = i; if (pontos[i][e] > pontos[hi][e]) hi = i; }
    extremos.add(lo); extremos.add(hi);
  }
  const lista = [...extremos].sort((a, b) => a - b);
  let i0 = lista[0]; let i1 = lista[1]; let melhor = -1;
  for (const a of lista) for (const b of lista) { const d = norma(sub(pontos[a], pontos[b])); if (d > melhor + 1e-15) { melhor = d; i0 = a; i1 = b; } }
  if (!(melhor > eps)) return null;
  const dir = sub(pontos[i1], pontos[i0]);
  let i2 = -1; let m2 = eps;
  for (let i = 0; i < n; i++) { const d = norma(cross(dir, sub(pontos[i], pontos[i0]))) / melhor; if (d > m2 + 1e-15) { m2 = d; i2 = i; } }
  if (i2 < 0) return null;
  const nor = cross(dir, sub(pontos[i2], pontos[i0]));
  const nn = norma(nor);
  let i3 = -1; let m3 = eps;
  for (let i = 0; i < n; i++) { const d = Math.abs(dot(nor, sub(pontos[i], pontos[i0]))) / nn; if (d > m3 + 1e-15) { m3 = d; i3 = i; } }
  if (i3 < 0) return null;

  const faces = [];
  const nova = (a, b, c) => {
    const nrm = cross(sub(pontos[b], pontos[a]), sub(pontos[c], pontos[a]));
    const t = norma(nrm);
    if (!(t > 1e-18)) return null;
    const un = [nrm[0] / t, nrm[1] / t, nrm[2] / t];
    return { v: [a, b, c], n: un, d: dot(un, pontos[a]) };
  };
  const centroIni = [0, 1, 2].map((e) => (pontos[i0][e] + pontos[i1][e] + pontos[i2][e] + pontos[i3][e]) / 4);
  for (const [a, b, c] of [[i0, i1, i2], [i0, i1, i3], [i0, i2, i3], [i1, i2, i3]]) {
    let f = nova(a, b, c);
    if (dot(f.n, centroIni) - f.d > 0) f = nova(a, c, b);
    faces.push(f);
  }
  const ja = new Set([i0, i1, i2, i3]);
  /* os pontos entram do mais longe do centro para o mais perto: os de dentro caem logo, sem mexer no casco */
  const ordem = [];
  for (let i = 0; i < n; i++) if (!ja.has(i)) ordem.push(i);
  const dist2 = (i) => { const d = sub(pontos[i], centroIni); return dot(d, d); };
  ordem.sort((a, b) => dist2(b) - dist2(a) || a - b);
  for (const p of ordem) {
    const visiveis = [];
    for (let k = 0; k < faces.length; k++) if (dot(faces[k].n, pontos[p]) - faces[k].d > eps) visiveis.push(k);
    if (visiveis.length === 0) continue;
    const dosVisiveis = new Set(visiveis);
    const direcionadas = new Map();
    for (const k of visiveis) {
      const [a, b, c] = faces[k].v;
      for (const [x, y] of [[a, b], [b, c], [c, a]]) direcionadas.set(`${x}_${y}`, [x, y]);
    }
    const novas = [];
    for (const [x, y] of direcionadas.values()) {
      if (direcionadas.has(`${y}_${x}`)) continue;
      const f = nova(x, y, p);
      if (f) novas.push(f);
    }
    const restantes = faces.filter((_, k) => !dosVisiveis.has(k));
    faces.length = 0;
    faces.push(...restantes, ...novas);
  }
  const usados = [...new Set(faces.flatMap((f) => f.v))].sort((a, b) => a - b);
  return { vertices: usados, faces: faces.map((f) => f.v), planos: faces.map((f) => ({ n: f.n, d: f.d })) };
}

/* A peça convexa de um conjunto de pontos: o casco, ou a caixa dos pontos quando eles são planos (uma chapa sem espessura).
   `{ verts, normais, arestas, min, max, limitaArestas }`: os vértices do casco, as normais das faces e as direções das
   arestas (sem repetir nem inverter), o que o SAT do gate pede. */
export function pecaDe(pontos) {
  const casco = cascoConvexo(pontos);
  const caixa = (ps) => ({ min: [0, 1, 2].map((e) => Math.min(...ps.map((p) => p[e]))), max: [0, 1, 2].map((e) => Math.max(...ps.map((p) => p[e]))) });
  if (!casco) {
    const { min, max } = caixa(pontos);
    const verts = [];
    for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) verts.push([x, y, z]);
    return { verts, normais: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], arestas: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], ...caixa(verts) };
  }
  const verts = casco.vertices.map((i) => pontos[i]);
  const direcao = (d) => {
    const t = norma(d);
    if (t < 1e-12) return null;
    let u = [d[0] / t, d[1] / t, d[2] / t];
    const k = u.findIndex((q) => Math.abs(q) > 1e-9);
    if (u[k] < 0) u = [-u[0], -u[1], -u[2]];
    return u;
  };
  const unicas = (ds) => {
    const m = new Map();
    for (const d of ds) { const u = direcao(d); if (u) m.set(u.map((q) => Math.round(q * 1e6)).join(','), u); }
    return [...m.values()];
  };
  const arestas = [];
  for (const [a, b, c] of casco.faces) for (const [x, y] of [[a, b], [b, c], [c, a]]) arestas.push(sub(pontos[y], pontos[x]));
  return { verts, normais: unicas(casco.planos.map((p) => p.n)), arestas: unicas(arestas), limitaArestas: true, ...caixa(verts) };
}

/* ---------- corte e medida ---------- */

/* O polígono recortado pelo semiespaço de normal `n` e deslocamento `d`: fica o lado `s` (+1: n·p >= d; -1: n·p <= d), com os
   pontos novos sobre o plano. Vazio se sobra menos de um triângulo. */
function recortarPoligono(poli, n, d, s) {
  const saida = [];
  for (let i = 0; i < poli.length; i++) {
    const p = poli[i]; const q = poli[(i + 1) % poli.length];
    const dp = s * (dot(n, p) - d); const dq = s * (dot(n, q) - d);
    if (dp >= 0) saida.push(p);
    if ((dp > 0 && dq < 0) || (dp < 0 && dq > 0)) {
      const t = dp / (dp - dq);
      saida.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]), p[2] + t * (q[2] - p[2])]);
    }
  }
  return saida.length >= 3 ? saida : [];
}

const recortarTodos = (polis, n, d, s) => polis.map((poli) => recortarPoligono(poli, n, d, s)).filter((q) => q.length);

/* Os pontos distintos de uma lista de polígonos, na ordem em que aparecem. */
export function pontosDe(polis) {
  const vistos = new Map();
  for (const poli of polis) for (const p of poli) {
    const k = `${Math.round(p[0] * 1e6)},${Math.round(p[1] * 1e6)},${Math.round(p[2] * 1e6)}`;
    if (!vistos.has(k)) vistos.set(k, p);
  }
  return [...vistos.values()];
}

/* O quadrado da distância de `p` ao triângulo `a b c` (o ponto mais perto do triângulo, pelas regiões de Voronoi). */
function distancia2ATriangulo(p, a, b, c) {
  const ab = sub(b, a); const ac = sub(c, a); const ap = sub(p, a);
  const d1 = dot(ab, ap); const d2 = dot(ac, ap);
  const alvo = (q) => { const d = sub(p, q); return dot(d, d); };
  if (d1 <= 0 && d2 <= 0) return alvo(a);
  const bp = sub(p, b);
  const d3 = dot(ab, bp); const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return alvo(b);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return alvo([a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]]); }
  const cp = sub(p, c);
  const d5 = dot(ab, cp); const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return alvo(c);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return alvo([a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]]); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return alvo([b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])]); }
  const den = 1 / (va + vb + vc);
  const v = vb * den; const w = vc * den;
  return alvo([a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w]);
}

/* A superfície da malha inteira como triângulos numa grade de células de lado `h` (no mínimo o limite): `perto(p, limite)` diz
   se há superfície a menos de `limite` de `p`. */
function grade(polis, h, fonte) {
  const celulas = new Map();
  const chave = (i, j, k) => `${i},${j},${k}`;
  const tris = [];
  for (const poli of polis) for (let i = 1; i + 1 < poli.length; i++) tris.push([poli[0], poli[i], poli[i + 1]]);
  tris.forEach((t, id) => {
    const lo = [0, 1, 2].map((e) => Math.floor(Math.min(t[0][e], t[1][e], t[2][e]) / h));
    const hi = [0, 1, 2].map((e) => Math.floor(Math.max(t[0][e], t[1][e], t[2][e]) / h));
    for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) {
      const c = chave(i, j, k);
      if (!celulas.has(c)) celulas.set(c, []);
      celulas.get(c).push(id);
    }
  });
  const perto = (p, limite) => {
    const i = Math.floor(p[0] / h); const j = Math.floor(p[1] / h); const k = Math.floor(p[2] / h);
    const l2 = limite * limite;
    const vistos = new Set();
    for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) for (let c = k - 1; c <= k + 1; c++) {
      const ids = celulas.get(chave(a, b, c));
      if (!ids) continue;
      for (const id of ids) {
        if (vistos.has(id)) continue;
        vistos.add(id);
        const t = tris[id];
        if (distancia2ATriangulo(p, t[0], t[1], t[2]) <= l2) return true;
      }
    }
    return false;
  };
  /* a distância de `p` à superfície, procurando em camadas de células até a próxima camada já não poder ter nada mais perto;
     passando de `ALCANCE_DA_BUSCA` células devolve esse alcance (o ponto está longe de tudo) */
  const distancia = (p) => {
    const i = Math.floor(p[0] / h); const j = Math.floor(p[1] / h); const k = Math.floor(p[2] / h);
    const vistos = new Set();
    let melhor = Infinity;
    for (let r = 0; r <= ALCANCE_DA_BUSCA; r++) {
      for (let a = i - r; a <= i + r; a++) for (let b = j - r; b <= j + r; b++) for (let c = k - r; c <= k + r; c++) {
        if (Math.max(Math.abs(a - i), Math.abs(b - j), Math.abs(c - k)) !== r) continue;
        const ids = celulas.get(chave(a, b, c));
        if (!ids) continue;
        for (const id of ids) {
          if (vistos.has(id)) continue;
          vistos.add(id);
          const t = tris[id];
          const d2 = distancia2ATriangulo(p, t[0], t[1], t[2]);
          if (d2 < melhor) melhor = d2;
        }
      }
      if (melhor <= (r * h) * (r * h)) break;
    }
    return Number.isFinite(melhor) ? Math.sqrt(melhor) : ALCANCE_DA_BUSCA * h;
  };
  /* a seção por cada plano de corte, uma vez só */
  const secoes = new Map();
  const secao = (plano) => {
    const k = `${plano.n.map((x) => Math.round(x * 1e6)).join(',')}|${Math.round(plano.d * 1e5)}|${plano.lado}`;
    if (!secoes.has(k)) secoes.set(k, secaoDoPlano(fonte, plano));
    return secoes.get(k);
  };
  return { perto, distancia, secao };
}

/* A seção do sólido por um plano de corte: os segmentos, em duas coordenadas do plano, em que os polígonos da parte inteira
   (`fonte`, sem os recortes) cruzam o plano. Com `dentro` (par-ímpar sobre eles) e `distanciaAoContorno` diz se um ponto do
   plano está no sólido. O plano é lido deslocado de uma fração de nada para o lado do material que o pedaço guarda
   (`plano.lado`): o vértice que cai sobre o plano conta como do outro lado, e por isso uma aresta que o plano toca (o anel
   de um degrau do perfil) é do contorno uma vez só, e não duas nem nenhuma. */
function secaoDoPlano(fonte, plano) {
  const apoio = Math.abs(plano.n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = cross(plano.n, apoio); const nu = norma(u);
  const eu = [u[0] / nu, u[1] / nu, u[2] / nu];
  const ev = cross(plano.n, eu);
  const plano2 = (q) => [dot(q, eu), dot(q, ev)];
  const segmentos = [];
  for (const poli of fonte) {
    const dist = poli.map((q) => dot(plano.n, q) - plano.d);
    /* acima do plano deslocado: para o lado + o vértice sobre o plano é de baixo; para o lado -, de cima */
    const acima = dist.map((x) => (plano.lado > 0 ? x > SOBRE_O_PLANO : x >= -SOBRE_O_PLANO));
    if (acima.every(Boolean) || acima.every((a) => !a)) continue;
    const pontos = [];
    for (let i = 0; i < poli.length; i++) {
      const j = (i + 1) % poli.length;
      if (acima[i] === acima[j]) continue;
      const t = dist[i] / (dist[i] - dist[j]);
      const c = Math.max(0, Math.min(1, t));
      pontos.push(plano2([0, 1, 2].map((e) => poli[i][e] + c * (poli[j][e] - poli[i][e]))));
    }
    if (pontos.length === 2) segmentos.push(pontos);
  }
  const dentro = (pt) => {
    let par = false;
    for (const [a, b] of segmentos) {
      if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]) par = !par;
    }
    return par;
  };
  const distanciaAoContorno = (pt) => Math.min(Infinity, ...segmentos.map(([a, b]) => {
    const dx = b[0] - a[0]; const dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / l2)) : 0;
    return Math.hypot(pt[0] - (a[0] + t * dx), pt[1] - (a[1] + t * dy));
  }));
  return { plano2, dentro, distanciaAoContorno, vazia: segmentos.length === 0 };
}

/* Os pontos do casco que estão a mais de `limite` da superfície (`superficie`, a grade da malha inteira): onde o casco cobre
   vazio. Amostra cada triângulo do casco em 7 pontos além dos vértices. Um triângulo sobre um plano de corte (`planos`, os
   cortes que levaram ao pedaço) não é superfície do sólido: o ponto dele vale se cai na seção do sólido pelo plano. */
function pontosLonge(superficie, pontos, casco, limite, planos) {
  const secao = (k) => superficie.secao(planos[k]);
  const planoDeCorte = (tri) => planos.findIndex((pl) => tri.every((q) => Math.abs(dot(pl.n, q) - pl.d) < SOBRE_O_PLANO));
  const longe = [];
  let area = 0;
  const nos = [[1, 1, 1], [2, 1, 0], [2, 0, 1], [1, 2, 0], [0, 2, 1], [1, 0, 2], [0, 1, 2]];
  for (const f of casco.faces) {
    const t = f.map((i) => pontos[i]);
    const peso = norma(cross(sub(t[1], t[0]), sub(t[2], t[0]))) / 2 / nos.length;
    const k = planoDeCorte(t);
    const sec = k >= 0 ? secao(k) : null;
    for (const [x, y, z] of nos) {
      const q = [0, 1, 2].map((e) => (x * t[0][e] + y * t[1][e] + z * t[2][e]) / 3);
      let d;
      if (sec) {
        const pt = sec.plano2(q);
        if (!sec.vazia && sec.dentro(pt)) continue;
        d = sec.vazia ? Infinity : sec.distanciaAoContorno(pt);
        if (d <= limite) continue;
      } else {
        if (superficie.perto(q, limite)) continue;
        d = superficie.distancia(q);
      }
      longe.push({ q, d });
      area += peso;
    }
  }
  return { pontos: longe, area };
}

/* O pedaço pronto para ser julgado: o casco dos pontos e o que ele cobre de vazio. `planos` são os cortes que o delimitam. */
function avaliar(polis, planos, superficie, limite) {
  const pontos = pontosDe(polis);
  const casco = pontos.length >= 4 ? cascoConvexo(pontos) : null;
  const vazio = casco ? pontosLonge(superficie, pontos, casco, limite, planos) : { pontos: [], area: 0 };
  return { polis, planos, pontos, casco, longe: vazio.pontos, vazio: vazio.area, fundo: vazio.pontos.reduce((m, p) => Math.max(m, p.d), 0) };
}

const EIXOS_UNITARIOS = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/* Corta um pedaço até o casco dele não cobrir vazio além de `limite`: de cada eixo se provam os dois filhos cortados pela
   ponto mais fundo do vazio, e fica o corte que deixa o vazio menos fundo (empate: o que deixa menos área de vazio). Devolve false quando passa de `orcamento.pecas` peças. */
function decompor(no, limite, superficie, profundidade, saida, orcamento, parados = 0) {
  if (no.polis.length === 0 || no.pontos.length === 0) return true;
  const folha = () => { if (globalThis.__DEBUG_FOLHA) console.log(' '.repeat(profundidade), 'folha prof', profundidade, 'vazio', no.vazio.toFixed(0), 'polis', no.polis.length, 'maxd', no.longe.length ? Math.max(...no.longe.map((p) => p.d)).toFixed(1) : 0); saida.push(pecaDe(no.pontos)); return saida.length <= orcamento.pecas; };
  if (globalThis.__DEBUG_NO && no.longe.length) { const q = no.longe.reduce((m, p) => (p.d > m.d ? p : m), no.longe[0]); console.log(' '.repeat(profundidade), 'N', profundidade, 'planos', no.planos.length, 'deepest', q.q.map((x) => x.toFixed(0)).join(','), 'd', q.d.toFixed(1), 'bbox', [0,1,2].map((e)=>Math.min(...no.pontos.map((p)=>p[e])).toFixed(0)+'..'+Math.max(...no.pontos.map((p)=>p[e])).toFixed(0)).join(' ')); }
  if (!no.casco || no.longe.length === 0 || profundidade >= PROFUNDIDADE_MAXIMA) return no.casco || profundidade === 0 ? folha() : true;
  const candidatos = [];
  for (const [e, n] of EIXOS_UNITARIOS.entries()) {
    /* o corte passa pelo vértice mais perto do ponto mais fundo do vazio: o canto côncavo de um degrau, ou, no vazio de uma
       corda, o vértice do meio dela */
    const ordenados = no.longe.map((p) => p.q[e]).sort((a, b) => a - b);
    const q = no.longe.reduce((m, p) => (p.d > m.d + 1e-9 ? p : m), no.longe[0]).q;
    const pos = no.pontos.reduce((m, v) => (norma(sub(v, q)) < norma(sub(m, q)) ? v : m), no.pontos[0])[e];
    const ao = no.pontos.map((p) => p[e]);
    if (!(pos > Math.min(...ao) + 1e-6 && pos < Math.max(...ao) - 1e-6)) continue;
    const metades = [-1, 1].map((s) => recortarTodos(no.polis, n, pos, s));
    if (metades.some((f) => f.length === 0)) continue;
    const filhos = metades.map((polis, k) => avaliar(polis, [...no.planos, { n, d: pos, lado: k === 0 ? -1 : 1 }], superficie, limite));
    candidatos.push({ filhos, fundo: Math.max(filhos[0].fundo, filhos[1].fundo), total: filhos[0].vazio + filhos[1].vazio, espalhado: ordenados[ordenados.length - 1] - ordenados[0] });
  }
  if (candidatos.length === 0) return folha();
  const minimo = Math.min(...candidatos.map((c) => c.fundo));
  const melhor = candidatos.filter((c) => c.fundo <= minimo * 1.05 + 0.1 * limite).sort((a, b) => a.total - b.total || b.espalhado - a.espalhado)[0];
  if (globalThis.__DEBUG_FOLHA) console.log(' '.repeat(profundidade), 'nó prof', profundidade, 'vazio', no.vazio.toFixed(0), 'maxd', Math.max(...no.longe.map((p) => p.d)).toFixed(1), 'cand', candidatos.map((c) => c.fundo.toFixed(1)).join('/'));
  const paradosAgora = melhor.fundo > 0.9 * no.fundo ? parados + 1 : 0;
  if (paradosAgora > PARADOS) return folha();
  for (const filho of melhor.filhos) if (!decompor(filho, limite, superficie, profundidade + 1, saida, orcamento, paradosAgora)) return false;
  return true;
}

/* As cunhas em torno de um eixo do esboço (`e`, por um ponto da seção perpendicular): `K` pedaços por planos que contêm o
   eixo. Cada plano tem a normal no plano perpendicular ao eixo, e a cunha `k` fica entre o plano `k` e o `k + 1`. Devolve
   null quando o eixo passa pelo material (o raio mínimo dos vértices ao eixo é menor que o dobro do limite): não há furo para
   as cunhas separarem. */
function cunhasEmTornoDe(polis, e, limite, superficie) {
  const [a, b] = [0, 1, 2].filter((q) => q !== e);
  const pontos = pontosDe(polis);
  const centro = [(Math.min(...pontos.map((p) => p[a])) + Math.max(...pontos.map((p) => p[a]))) / 2, (Math.min(...pontos.map((p) => p[b])) + Math.max(...pontos.map((p) => p[b]))) / 2];
  const raioMinimo = Math.min(...pontos.map((p) => Math.hypot(p[a] - centro[0], p[b] - centro[1])));
  if (raioMinimo < 2 * limite) return null;
  const K = Math.min(64, Math.max(4, Math.ceil(Math.PI / Math.acos(Math.max(0, 1 - limite / raioMinimo)))));
  const planoDe = (k) => {
    const ang = (2 * Math.PI * k) / K;
    const n = [0, 0, 0];
    n[a] = -Math.sin(ang); n[b] = Math.cos(ang);
    return { n, d: n[a] * centro[0] + n[b] * centro[1] };
  };
  const cunhas = [];
  for (let k = 0; k < K; k++) {
    const p1 = planoDe(k); const p2 = planoDe((k + 1) % K);
    /* à esquerda do raio k e à direita do raio k + 1; cada cunha tem menos de 180 graus */
    const polisDaCunha = recortarTodos(recortarTodos(polis, p1.n, p1.d, +1), p2.n, p2.d, -1);
    if (polisDaCunha.length === 0) continue;
    cunhas.push({ polis: polisDaCunha, planos: [{ ...p1, lado: 1 }, { ...p2, lado: -1 }] });
  }
  return cunhas;
}

/** Decompõe uma lista de polígonos (a superfície de uma parte) em peças convexas cujo casco não cobre vazio além de `limite`
 *  (mm), ou null se passa de `pecas` peças. A distância à superfície vale para os polígonos de `contexto` (por padrão os
 *  próprios): a malha inteira fecha as costuras entre partes. */
export function decomporEmPecas(polis, limite, { pecas = 160, contexto = polis } = {}) {
  if (polis.length === 0) return [];
  const todos = contexto.flat();
  const extensao = Math.max(...[0, 1, 2].map((e) => Math.max(...todos.map((q) => q[e])) - Math.min(...todos.map((q) => q[e]))));
  const superficie = grade(contexto, Math.max(limite, extensao / 40, 1e-6), polis);
  const saida = [];
  const orcamento = { pecas };
  const raiz = avaliar(polis, [], superficie, limite);
  /* o furo em torno de um eixo se resolve em cunhas; o eixo é o que deixa menos vazio depois delas */
  let partida = [raiz];
  if (raiz.longe.length > 0) {
    let melhor = null;
    for (const e of [0, 1, 2]) {
      const cunhas = cunhasEmTornoDe(polis, e, limite, superficie);
      if (!cunhas) continue;
      const nos = cunhas.map((c) => avaliar(c.polis, c.planos, superficie, limite));
      const total = nos.reduce((s, no) => s + no.vazio, 0);
      if (!melhor || total < melhor.total) melhor = { nos, total };
    }
    if (globalThis.__DEBUG_MALHA) console.log('raiz vazio', raiz.vazio.toFixed(0), 'cunhas', melhor ? melhor.nos.length : null, 'total', melhor?.total.toFixed(0));
    if (melhor && melhor.total < 0.6 * raiz.vazio) partida = melhor.nos;
  }
  for (const no of partida) if (!decompor(no, limite, superficie, 0, saida, orcamento)) return null;
  return saida;
}
