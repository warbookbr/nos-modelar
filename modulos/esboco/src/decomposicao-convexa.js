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

   O CORTE. Quando a parte tem um furo em torno de um eixo (nenhum vértice a menos do dobro do limite do eixo, e o eixo fora da
   seção da parte), o primeiro corte é em cunhas por planos que contêm o eixo, tantas quantas a corda de uma cunha precisa para o
   furo ficar a menos de `limite` da corda (o furo de 31,6 mm do cubo da roda do trem em 7 cunhas e o pneu em 24, e não em milhares de
   pedaços de cortes paralelos aos eixos). Dentro de cada cunha, e nas partes sem furo, o corte é por planos paralelos aos eixos, pelo
   vértice mais perto do ponto mais fundo do vazio e no eixo que deixa menos vazio nos dois lados. Os pedaços se cortam sempre o
   de vazio mais fundo primeiro, até todos caberem no limite ou as peças chegarem ao orçamento (`pecas`), e o que sobra vira peça
   como está; quem desiste antes é o pedaço que não melhora depois de `PARADOS` cortes seguidos (a malha aberta, em que o casco
   sempre cobre a abertura). Determinístico: a mesma superfície dá as mesmas peças, na mesma ordem.

   A POSIÇÃO GERAL DO CASCO. O casco incremental de uma superfície de seções planas (a asa do avião) cresce sem limite se os pontos
   coplanares não forem desempatados: ver `cascoConvexo`. Foi o que fez a decomposição da asa passar de 100 s, com o casco de 34 mil
   triângulos para 1828 pontos, a 3 s.

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

/* O simplex inicial do casco: os dois pontos mais distantes entre os extremos dos eixos, o mais longe da reta e o mais longe do plano
   (índices `[i0, i1, i2, i3]`), ou null quando a nuvem é um ponto, uma reta ou um plano a menos de `eps`. */
function simplexInicial(pontos, eps) {
  const n = pontos.length;
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
  return [i0, i1, i2, i3];
}

/* Um número em [-1, 1) que só depende de `i` e `e` (um misturador de bits de 32 bits): a perturbação do casco é a mesma em toda máquina. */
function ruido(i, e) {
  let h = Math.imul(3 * i + e + 1, 0x9e3779b1);
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return ((h >>> 0) / 4294967296) * 2 - 1;
}

/* Os deslocamentos do casco, em fração da maior extensão, na ordem em que se tentam. */
const AMPLITUDES_DO_CASCO = [1e-7, 1e-6, 1e-5];

/* As faces do casco incremental dos pontos deslocados de até `amplitude` (`{ v, n, d }`, com o plano nos pontos deslocados), a partir
   do simplex. Com `limitado`, devolve null quando as faces passam do que um casco dos pontos já inseridos pode ter. */
function facesDoCasco(originais, [i0, i1, i2, i3], amplitude, eps, limitado) {
  const n = originais.length;
  const pontos = originais.map((p, i) => [p[0] + amplitude * ruido(i, 0), p[1] + amplitude * ruido(i, 1), p[2] + amplitude * ruido(i, 2)]);
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
  for (const [feitos, p] of ordem.entries()) {
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
    for (const f of restantes) faces.push(f);
    for (const f of novas) faces.push(f);
    if (limitado && faces.length > 2 * (feitos + 1) + 4) return null;
  }
  return faces;
}

/* O casco convexo de uma nuvem de pontos (incremental, determinístico): `{ vertices, faces, planos }`, com `faces` triângulos
   [a, b, c] de índices de `originais` em sentido anti-horário visto de fora e `planos` { n, d } (n unitário para fora, n·p = d,
   com os pontos como vieram). Devolve null com menos de 4 pontos, e quando a nuvem é plana, uma reta ou um ponto (sem volume).

   A POSIÇÃO GERAL. O casco incremental decide por ponto e por face se a face é visível, e uma superfície de seções planas (a asa:
   14 seções de 130 pontos, cada uma num plano) tem centenas de pontos exatamente no plano de uma face. Nesse empate o conjunto de
   faces visíveis deixa de ser um disco, o horizonte se cruza em si mesmo e o casco passa a ter 19 triângulos por ponto (34 mil
   para 1828 pontos, e a medida do vazio de cada um custava segundos). Cada ponto é então deslocado de um valor de até 1e-7 da maior
   extensão (0,0013 mm na asa de 13 m, 0,00005 mm na roda), mil vezes o limite de visibilidade (1e-10) e muito abaixo da concavidade que a
   decomposição aceita (0,25% da diagonal, no mínimo 0,2 mm): nenhum empate sobra, o casco tem no máximo 2n - 4 triângulos, e o que sai
   são índices dos pontos de entrada. Com o deslocamento perto do limite (1e-11 contra 1e-12) o casco da roda levou 4 minutos.

   O DESLOCAMENTO QUE NÃO BASTA. A deriva do avião (47 seções de 39 pontos, 200 mm de espessura e 3,9 m de altura) explodiu
   com 1e-7: os pontos vizinhos de uma seção quase reta formam faces finas, a normal delas erra mais que o limite de visibilidade
   diante de um ponto a metros dali, e o casco saiu com 257 mil triângulos para 1828 pontos, em 17 s, e a decomposição dela em
   41 s. Um casco de v vértices tem 2v - 4 triângulos, então a construção para assim que passa disso e recomeça com o deslocamento
   dez vezes maior (`AMPLITUDES_DO_CASCO`). A nuvem que já fechava com 1e-7 não muda. */
export function cascoConvexo(originais) {
  const n = originais.length;
  if (n < 4) return null;
  const lo3 = [Infinity, Infinity, Infinity]; const hi3 = [-Infinity, -Infinity, -Infinity];
  for (const p of originais) for (let e = 0; e < 3; e++) { if (p[e] < lo3[e]) lo3[e] = p[e]; if (p[e] > hi3[e]) hi3[e] = p[e]; }
  const escala = Math.max(hi3[0] - lo3[0], hi3[1] - lo3[1], hi3[2] - lo3[2]);
  if (!(escala > 0)) return null;
  /* a nuvem plana (ou reta) não tem casco: o teste é o de sempre, nos pontos como vieram, a 1e-9 da extensão */
  const simplex = simplexInicial(originais, escala * 1e-9);
  if (!simplex) return null;
  const eps = escala * 1e-10;
  let faces = null;
  let amplitude = 0;
  for (const [k, fator] of AMPLITUDES_DO_CASCO.entries()) {
    amplitude = escala * fator;
    faces = facesDoCasco(originais, simplex, amplitude, eps, k < AMPLITUDES_DO_CASCO.length - 1);
    if (faces) break;
  }
  const usados = [...new Set(faces.flatMap((f) => f.v))].sort((a, b) => a - b);
  /* o plano de cada face volta nos pontos como vieram: a normal perturbada de uma face de milhares de milímetros erra 1e-4 rad, e as
     normais de uma face plana inteira deixariam de coincidir. A face quase degenerada fica com a normal perturbada, que é a que decidiu
     o casco: a altura do triângulo nos pontos como vieram precisa passar de mil vezes o deslocamento. A regra pela área deixava passar
     a lasca do bordo de fuga de uma deriva (três pontos quase colineares a um metro um do outro, com 0,0001 mm2), cujo plano nos
     pontos como vieram gira à toa em torno da linha e deixava um ponto do casco 13 mm do lado de fora. */
  const planos = faces.map((f) => {
    const [a, b, c] = f.v;
    const nrm = cross(sub(originais[b], originais[a]), sub(originais[c], originais[a]));
    const t = norma(nrm);
    const maiorAresta = Math.max(norma(sub(originais[b], originais[a])), norma(sub(originais[c], originais[b])), norma(sub(originais[a], originais[c])));
    if (!(t > 1e-12 * escala * escala) || !(t / maiorAresta > 1e3 * amplitude)) return { n: f.n, d: f.d };
    const un = [nrm[0] / t, nrm[1] / t, nrm[2] / t];
    return dot(un, f.n) > 0.5 ? { n: un, d: dot(un, originais[a]) } : { n: f.n, d: f.d };
  });
  return { vertices: usados, faces: faces.map((f) => f.v), planos };
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
   se há superfície a menos de `limite` de `p`. A célula é um número (o índice dela na caixa da malha, com a folga do alcance da
   busca em volta) e o triângulo já visto numa consulta é uma marca num vetor: a asa de 13 m pedia dezenas de milhões de consultas, e
   a chave em texto e o conjunto de vistos de cada uma custavam mais que a conta de distância. */
function grade(polis, h, fonte) {
  const tris = [];
  for (const poli of polis) for (let i = 1; i + 1 < poli.length; i++) tris.push([poli[0], poli[i], poli[i + 1]]);
  const minimos = [Infinity, Infinity, Infinity]; const maximos = [-Infinity, -Infinity, -Infinity];
  for (const poli of polis) for (const q of poli) for (let e = 0; e < 3; e++) { if (q[e] < minimos[e]) minimos[e] = q[e]; if (q[e] > maximos[e]) maximos[e] = q[e]; }
  const origem = minimos.map((v) => Math.floor(v / h) - ALCANCE_DA_BUSCA - 1);
  const dim = maximos.map((v, e) => Math.floor(v / h) + ALCANCE_DA_BUSCA + 2 - origem[e]);
  const chave = (i, j, k) => ((i - origem[0]) * dim[1] + (j - origem[1])) * dim[2] + (k - origem[2]);
  const dentro = (i, j, k) => i >= origem[0] && i - origem[0] < dim[0] && j >= origem[1] && j - origem[1] < dim[1] && k >= origem[2] && k - origem[2] < dim[2];
  const celulas = new Map();
  tris.forEach((t, id) => {
    const lo = [0, 1, 2].map((e) => Math.floor(Math.min(t[0][e], t[1][e], t[2][e]) / h));
    const hi = [0, 1, 2].map((e) => Math.floor(Math.max(t[0][e], t[1][e], t[2][e]) / h));
    for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) {
      const c = chave(i, j, k);
      const lista = celulas.get(c);
      if (lista) lista.push(id); else celulas.set(c, [id]);
    }
  });
  const marcas = new Int32Array(tris.length);
  let consulta = 0;
  const perto = (p, limite) => {
    const i = Math.floor(p[0] / h); const j = Math.floor(p[1] / h); const k = Math.floor(p[2] / h);
    const l2 = limite * limite;
    consulta++;
    for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) for (let c = k - 1; c <= k + 1; c++) {
      if (!dentro(a, b, c)) continue;
      const ids = celulas.get(chave(a, b, c));
      if (!ids) continue;
      for (const id of ids) {
        if (marcas[id] === consulta) continue;
        marcas[id] = consulta;
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
    consulta++;
    let melhor = Infinity;
    const visitar = (a, b, c) => {
      if (!dentro(a, b, c)) return;
      const ids = celulas.get(chave(a, b, c));
      if (!ids) return;
      for (const id of ids) {
        if (marcas[id] === consulta) continue;
        marcas[id] = consulta;
        const t = tris[id];
        const d2 = distancia2ATriangulo(p, t[0], t[1], t[2]);
        if (d2 < melhor) melhor = d2;
      }
    };
    for (let r = 0; r <= ALCANCE_DA_BUSCA; r++) {
      /* só a casca de lado 2r + 1: as duas faces em `a`, e nas camadas de dentro as faces em `b` e em `c` */
      for (let a = i - r; a <= i + r; a++) {
        const faceA = Math.abs(a - i) === r;
        for (let b = j - r; b <= j + r; b++) {
          if (faceA || Math.abs(b - j) === r) { for (let c = k - r; c <= k + r; c++) visitar(a, b, c); continue; }
          if (r > 0) { visitar(a, b, k - r); visitar(a, b, k + r); } else visitar(a, b, k);
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
  const distanciaAoContorno = (pt) => {
    let menor = Infinity;
    for (const [a, b] of segmentos) {
      const dx = b[0] - a[0]; const dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / l2)) : 0;
      const d = Math.hypot(pt[0] - (a[0] + t * dx), pt[1] - (a[1] + t * dy));
      if (d < menor) menor = d;
    }
    return menor;
  };
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

/* O melhor corte de um pedaço: de cada eixo se provam os dois filhos cortados pelo vértice mais perto do ponto mais fundo do vazio, e
   fica o corte que deixa o vazio menos fundo (empate: o que deixa menos área de vazio). Devolve `{ filhos, fundo, total, espalhado }`,
   ou null quando nenhum eixo corta o pedaço. */
function melhorCorte(no, limite, superficie) {
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
  if (candidatos.length === 0) return null;
  const minimo = Math.min(...candidatos.map((c) => c.fundo));
  return candidatos.filter((c) => c.fundo <= minimo * 1.05 + 0.1 * limite).sort((a, b) => a.total - b.total || b.espalhado - a.espalhado)[0];
}

/* Corta os pedaços de `partida` até o casco de cada um não cobrir vazio além de `limite`, sempre o pedaço de vazio mais fundo
   primeiro (empate: o de mais área de vazio, e depois o mais antigo), até todos passarem ou as peças chegarem a `pecas`. O
   orçamento acaba por dentro: o que ficou por cortar vira peça com o vazio que tem, os mais rasos, e a asa de 13 m, que pediria
   centenas de peças, sai com as 160 que o orçamento dá em vez de recomeçar com um limite mais frouxo. Um pedaço sem casco (uma
   lasca plana) some, salvo o primeiro, que vira a caixa dos pontos; o que não melhora depois de `PARADOS` cortes seguidos, ou passa
   de `PROFUNDIDADE_MAXIMA`, fecha como está. Determinístico: a ordem das peças é a dos pedaços, do mais antigo ao mais novo. */
function decompor(partida, limite, superficie, pecas) {
  let serie = 0;
  const abertos = [];
  const folhas = [];
  const fechar = (item) => folhas.push({ ordem: item.ordem, peca: pecaDe(item.no.pontos) });
  const admitir = (no, profundidade, parados) => {
    const item = { no, profundidade, parados, ordem: serie++ };
    if (no.polis.length === 0 || no.pontos.length === 0) return;
    if (!no.casco) { if (profundidade === 0) fechar(item); return; }
    if (no.longe.length === 0 || profundidade >= PROFUNDIDADE_MAXIMA) fechar(item); else abertos.push(item);
  };
  for (const no of partida) admitir(no, 0, 0);
  while (abertos.length > 0 && folhas.length + abertos.length < pecas) {
    let k = 0;
    for (let i = 1; i < abertos.length; i++) {
      const a = abertos[i].no; const b = abertos[k].no;
      if (a.fundo > b.fundo + 1e-9 || (Math.abs(a.fundo - b.fundo) <= 1e-9 && a.vazio > b.vazio + 1e-9)) k = i;
    }
    const [item] = abertos.splice(k, 1);
    const corte = melhorCorte(item.no, limite, superficie);
    const parados = corte && corte.fundo > 0.9 * item.no.fundo ? item.parados + 1 : 0;
    if (!corte || parados > PARADOS) { fechar(item); continue; }
    for (const filho of corte.filhos) admitir(filho, item.profundidade + 1, parados);
  }
  for (const item of abertos) fechar(item);
  return folhas.sort((a, b) => a.ordem - b.ordem).map((f) => f.peca);
}

/* As cunhas em torno de um eixo do esboço (`e`, por um ponto da seção perpendicular): `K` pedaços por planos que contêm o
   eixo. Cada plano tem a normal no plano perpendicular ao eixo, e a cunha `k` fica entre o plano `k` e o `k + 1`. Devolve
   null quando o eixo passa pelo material (um vértice a menos do dobro do limite do eixo, ou o eixo dentro da seção da parte a meia
   altura): não há furo para as cunhas separarem. */
function cunhasEmTornoDe(polis, e, limite, superficie) {
  const [a, b] = [0, 1, 2].filter((q) => q !== e);
  const pontos = pontosDe(polis);
  const centro = [(Math.min(...pontos.map((p) => p[a])) + Math.max(...pontos.map((p) => p[a]))) / 2, (Math.min(...pontos.map((p) => p[b])) + Math.max(...pontos.map((p) => p[b]))) / 2];
  const raioMinimo = Math.min(...pontos.map((p) => Math.hypot(p[a] - centro[0], p[b] - centro[1])));
  if (raioMinimo < 2 * limite) return null;
  /* o furo de verdade: o eixo, a meia altura da parte, fica fora do material. Uma peça maciça e côncava (a viga em L) também não tem
     vértice perto do eixo, e as cunhas só a cortariam à toa. */
  const meio = (Math.min(...pontos.map((p) => p[e])) + Math.max(...pontos.map((p) => p[e]))) / 2;
  const normal = [0, 0, 0]; normal[e] = 1;
  const corte = superficie.secao({ n: normal, d: meio, lado: 1 });
  const noEixo = [0, 0, 0]; noEixo[a] = centro[0]; noEixo[b] = centro[1]; noEixo[e] = meio;
  if (corte.vazia || corte.dentro(corte.plano2(noEixo))) return null;
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

/** Decompõe uma lista de polígonos (a superfície de uma parte) em até `pecas` peças convexas, cada uma o casco de um pedaço da
 *  superfície, com o vazio que o casco cobre abaixo de `limite` (mm) enquanto o orçamento de peças dá. A distância à superfície
 *  vale para os polígonos de `contexto` (por padrão os próprios): a malha inteira fecha as costuras entre partes. */
export function decomporEmPecas(polis, limite, { pecas = 160, contexto = polis } = {}) {
  if (polis.length === 0) return [];
  /* a maior extensão da malha, em laço (uma malha de dezenas de milhares de faces passa do limite de argumentos de `Math.max(...)`) */
  const baixo = [Infinity, Infinity, Infinity]; const alto = [-Infinity, -Infinity, -Infinity];
  for (const poli of contexto) for (const q of poli) for (let e = 0; e < 3; e++) { if (q[e] < baixo[e]) baixo[e] = q[e]; if (q[e] > alto[e]) alto[e] = q[e]; }
  const extensao = Math.max(alto[0] - baixo[0], alto[1] - baixo[1], alto[2] - baixo[2]);
  const superficie = grade(contexto, Math.max(limite, extensao / 40, 1e-6), polis);
  const raiz = avaliar(polis, [], superficie, limite);
  /* o furo em torno de um eixo se resolve em cunhas; o eixo é o que deixa menos vazio depois delas */
  let partida = [raiz];
  if (raiz.longe.length > 0) {
    let melhor = null;
    for (const e of [0, 1, 2]) {
      const cunhas = cunhasEmTornoDe(polis, e, limite, superficie);
      if (!cunhas) continue;
      const nos = cunhas.map((c) => avaliar(c.polis, c.planos, superficie, limite));
      const total = nos.reduce((soma, no) => soma + no.vazio, 0);
      if (!melhor || total < melhor.total) melhor = { nos, total };
    }
    if (melhor && melhor.total < raiz.vazio) partida = melhor.nos;
  }
  return decompor(partida, limite, superficie, pecas);
}
