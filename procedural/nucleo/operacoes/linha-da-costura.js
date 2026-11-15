/* linha-da-costura.js — a costura de uma união como linha do `friso`, e o perfil `cordao` posto no canto a cada ponto dela
   (plano do cordão de solda na costura de tubos, 2026-11-15).

   A LINHA. O `unir` registra as arestas da costura (pares de vértice) e o operando de cada face (`donos`). Com
   `costura: { de: { op: 'unir', id }, entre: [a, b] }`, a linha são as arestas da costura cujas duas faces vêm dos
   operandos a e b; sem `entre`, todas as da costura. As arestas se encadeiam em voltas fechadas, ou em trechos abertos
   quando a costura chega a um vértice que não tem exatamente duas arestas da escolha (o ponto triplo, onde a costura de a
   com b encontra a de a com c). Em cada ponto ficam as normais dos dois lados (a média das faces de cada operando que
   tocam as arestas da linha naquele vértice), e a normal da linha é a bissetriz delas, que aponta para o vão do canto.

   O CORDÃO. O perfil `cordao: { largura }` não é fixo: em cada estação ele é desenhado no plano perpendicular à linha, a
   partir das duas superfícies. Cada pé fica sobre a superfície de um operando, a metade da largura do canto, achado na
   própria malha do operando (o ponto mais próximo) para a superfície curva não deixar o pé no ar, e afundado uma fração da
   largura para o cordão cruzar a superfície com ângulo franco. De um pé ao outro o contorno é reto: um chanfro, a forma que
   a pessoa escolheu por imagem em 2026-11-15, depois do arco, da borda tangente e das escamas na malha (o registro está no
   banco de provas da costura em nó de tubos). Por baixo, o perfil fecha por dentro do material. */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mult = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const tam = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const l = tam(a); return l > 0 ? mult(a, 1 / l) : null; };
/* a normal de Newell de uma face pelos ids dos vértices, unitária */
const normalDe = (st, vs) => {
  const n = [0, 0, 0];
  for (let k = 0; k < vs.length; k++) {
    const a = st.V.get(vs[k]), b = st.V.get(vs[(k + 1) % vs.length]);
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return unit(n) ?? [0, 1, 0];
};
const chave = (x, y) => (x < y ? `${x}-${y}` : `${y}-${x}`);

export const EXEMPLO_DE_COSTURA = "costura: { de: { op: 'unir', id: 3 }, entre: [0, 1] }";
export const EXEMPLO_DE_CORDAO = 'perfil: { cordao: { largura: 0.007 } }';

/* o quanto o pé afunda na superfície e o fundo do perfil abaixo do pé, em fração da largura */
const AFUNDA = 0.03;
const FUNDO = 0.3;

/** reamostrar(pontos, fechada, passo) -> pontos a distâncias iguais ao longo da polilinha, o mais perto de `passo` que
 *  divide o comprimento; a volta não repete o primeiro ponto. */
function reamostrar(pontos, fechada, passo) {
  const P = fechada ? [...pontos, pontos[0]] : pontos;
  const acum = [0];
  for (let k = 1; k < P.length; k++) acum.push(acum[k - 1] + tam(sub(P[k], P[k - 1])));
  const L = acum[acum.length - 1];
  const n = Math.max(fechada ? 8 : 2, Math.round(L / passo));
  const saida = [];
  let k = 1;
  for (let j = 0; j < (fechada ? n : n + 1); j++) {
    const d = (L * j) / n;
    while (k < P.length - 1 && acum[k] < d) k++;
    const t = acum[k] > acum[k - 1] ? (d - acum[k - 1]) / (acum[k] - acum[k - 1]) : 0;
    saida.push(soma(P[k - 1], mult(sub(P[k], P[k - 1]), t)));
  }
  return saida;
}

/** suavizar(pontos, fechada) -> duas passadas de média [1/4, 1/2, 1/4], que tiram o zigue-zague da costura facetada; as
 *  pontas da linha aberta ficam onde estão. */
function suavizar(pontos, fechada) {
  let P = pontos;
  const n = P.length;
  for (let r = 0; r < 2; r++) {
    P = P.map((p, j) => {
      if (!fechada && (j === 0 || j === n - 1)) return p;
      const a = P[(j - 1 + n) % n], b = P[(j + 1) % n];
      return [0, 1, 2].map((c) => 0.25 * a[c] + 0.5 * p[c] + 0.25 * b[c]);
    });
  }
  return P;
}

/** refinar(pontos, fechada, passoFino) -> a curva de Catmull-Rom que passa pelos pontos, amostrada a cada `passoFino`
 *  mais ou menos: a linha fina segue a suavizada sem os cantos que a interpolação reta deixaria em cada ponto dela. */
function refinar(pontos, fechada, passoFino) {
  const n = pontos.length;
  const em = (j) => (fechada ? pontos[(j + n) % n] : pontos[Math.max(0, Math.min(n - 1, j))]);
  const saida = [];
  const trechos = fechada ? n : n - 1;
  for (let j = 0; j < trechos; j++) {
    const p0 = em(j - 1), p1 = em(j), p2_ = em(j + 1), p3 = em(j + 2);
    const partes = Math.max(1, Math.round(tam(sub(p2_, p1)) / passoFino));
    for (let k = 0; k < partes; k++) {
      const t = k / partes, t2 = t * t, t3 = t2 * t;
      saida.push([0, 1, 2].map((c) => 0.5 * ((2 * p1[c]) + (-p0[c] + p2_[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2_[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2_[c] + p3[c]) * t3)));
    }
  }
  if (!fechada) saida.push(pontos[n - 1]);
  return saida;
}

/** semTrechoCurto(pontos, fechada, minimo) -> os pontos sem os que ficam a menos de `minimo` do anterior mantido; na linha
 *  aberta a última ponta fica, e sai a penúltima no lugar dela. */
function semTrechoCurto(pontos, fechada, minimo) {
  const saida = [pontos[0]];
  for (let j = 1; j < pontos.length; j++) {
    const ultimo = !fechada && j === pontos.length - 1;
    if (tam(sub(pontos[j], saida[saida.length - 1])) >= minimo) saida.push(pontos[j]);
    else if (ultimo && saida.length > 1) saida[saida.length - 1] = pontos[j];
  }
  while (fechada && saida.length > 3 && tam(sub(saida[0], saida[saida.length - 1])) < minimo) saida.pop();
  return saida;
}

/** lerCostura(st, costura) -> { registro, de, entre } | { erro: [campo, mensagem] } */
function lerCostura(st, costura) {
  if (!costura || typeof costura !== 'object' || Array.isArray(costura)) return { erro: ['costura', `costura precisa ser a costura de um unir, como ${EXEMPLO_DE_COSTURA}`] };
  const extra = Object.keys(costura).filter((k) => k !== 'de' && k !== 'entre');
  if (extra.length) return { erro: ['costura', `a costura tem campo desconhecido ${extra.map((k) => `'${k}'`).join(', ')}; os campos são de e entre`] };
  const de = costura.de;
  if (!de || typeof de !== 'object' || de.op !== 'unir' || !Number.isSafeInteger(de.id) || Object.keys(de).some((k) => k !== 'op' && k !== 'id')) {
    return { erro: ['costura', `costura.de precisa ser a origem de um unir, {op:'unir', id}, como ${EXEMPLO_DE_COSTURA}`] };
  }
  const registros = st.origens.get(de.id) ?? [];
  if (registros.length !== 1 || registros[0].op !== 'unir') return { erro: ['costura', `a origem unir:${de.id} da costura não existe, ainda não foi criada ou é de outra operação`] };
  const registro = registros[0];
  let entre = null;
  if (costura.entre != null) {
    const e = costura.entre;
    if (!Array.isArray(e) || e.length !== 2 || !e.every((x) => Number.isSafeInteger(x) && x >= 0) || e[0] === e[1]) {
      return { erro: ['costura', `costura.entre precisa ser dois índices diferentes dos sólidos do unir:${de.id}, como ${EXEMPLO_DE_COSTURA}`] };
    }
    entre = e;
  }
  return { registro, de, entre };
}

/** linhaDaCostura(st, costura, nome) -> { cadeias } | { erro: [campo, mensagem] }
 *  Sem `entre`, cada par de sólidos que se toca dá as suas cadeias. Cada cadeia é a que o `friso` varre ({ pontos, normais, fechada, espelhada, nomeDoIndice, nomes, passo }) com, a
 *  mais, `lados`: por ponto, as normais dos dois operandos ({ nA, nB }), e `operandos`: [a, b] e as faces de cada um. */
export function linhaDaCostura(st, costura, { passo, passoFino = passo, alcance, suave }) {
  const lida = lerCostura(st, costura);
  if (lida.erro) return lida;
  const { registro, de, entre } = lida;
  const faces = registro.faces.filter((f) => st.F.has(f));
  const perdidas = registro.faces.length - faces.length;
  if (perdidas) return { erro: ['costura', `${perdidas} face(s) da origem unir:${de.id} foram removidas ou consumidas por um passo posterior; ponha o friso logo depois do unir`] };
  const donos = registro.donos ?? {};
  const facesDaAresta = new Map();
  for (const fid of faces) {
    const vs = st.F.get(fid).vs;
    for (let k = 0; k < vs.length; k++) {
      const c = chave(vs[k], vs[(k + 1) % vs.length]);
      if (!facesDaAresta.has(c)) facesDaAresta.set(c, []);
      facesDaAresta.get(c).push(fid);
    }
  }
  /* as arestas escolhidas, com o operando de cada lado; o lado A é o de menor índice, ou o primeiro de `entre` */
  const escolhidas = [];
  const pares = new Set();
  for (const [x, y] of registro.arestas) {
    const fs = facesDaAresta.get(chave(x, y)) ?? [];
    if (fs.length !== 2) continue;
    const [o1, o2] = fs.map((f) => donos[f]);
    if (o1 == null || o2 == null || o1 === o2) continue;
    pares.add(`${Math.min(o1, o2)}-${Math.max(o1, o2)}`);
    if (entre && !((o1 === entre[0] && o2 === entre[1]) || (o1 === entre[1] && o2 === entre[0]))) continue;
    const primeiro = entre ? entre[0] : Math.min(o1, o2);
    const [fA, fB] = o1 === primeiro ? fs : [fs[1], fs[0]];
    escolhidas.push({ x, y, fA, fB, oA: donos[fA], oB: donos[fB] });
  }
  if (!escolhidas.length) {
    const existentes = [...pares].sort().map((p) => `[${p.replace('-', ', ')}]`).join(', ');
    return { erro: ['costura', entre
      ? `a costura do unir:${de.id} não tem aresta entre os sólidos ${entre[0]} e ${entre[1]}; os pares que se tocam são ${existentes || 'nenhum'}`
      : `a costura do unir:${de.id} não tem aresta entre dois sólidos diferentes`] };
  }

  /* o encadeamento: vizinhança por vértice dentro de cada par de sólidos (sem `entre`, a costura de três sólidos ou mais vira
     uma cadeia por par, e cada uma leva o perfil no canto do seu par); corta nos vértices que não têm exatamente duas arestas
     do mesmo par */
  const par = (e) => `${e.oA}-${e.oB}`;
  const chaveV = (e, v) => `${par(e)}|${v}`;
  const porVertice = new Map();
  for (const [k, e] of escolhidas.entries()) for (const v of [e.x, e.y]) {
    const c = chaveV(e, v);
    if (!porVertice.has(c)) porVertice.set(c, []);
    porVertice.get(c).push(k);
  }
  const usada = new Array(escolhidas.length).fill(false);
  const seguir = (v0, k0) => {
    const vs = [v0]; const ks = [];
    let v = v0, k = k0;
    while (k != null && !usada[k]) {
      usada[k] = true; ks.push(k);
      const e = escolhidas[k];
      v = e.x === v ? e.y : e.x;
      vs.push(v);
      const viz = porVertice.get(chaveV(e, v));
      if (viz.length !== 2) break;
      k = viz[0] === k ? viz[1] : viz[0];
    }
    return { vs, ks };
  };
  const brutas = [];
  /* primeiro os trechos abertos, a partir das pontas (vértices com uma aresta ou com três e mais), em ordem de id */
  const pontas = [...porVertice.entries()].filter(([, ks]) => ks.length !== 2).map(([c, ks]) => ({ c, v: Number(c.split('|')[1]), ks })).sort((p, q) => p.v - q.v || (p.c < q.c ? -1 : 1));
  for (const { v, ks } of pontas) for (const k of ks) if (!usada[k]) brutas.push({ ...seguir(v, k), fechada: false });
  /* depois as voltas, a partir do menor vértice livre */
  for (;;) {
    let menor = null, kMenor = null;
    for (const [k, e] of escolhidas.entries()) if (!usada[k]) for (const v of [e.x, e.y]) if (menor == null || v < menor) { menor = v; kMenor = k; }
    if (kMenor == null) break;
    const { vs, ks } = seguir(menor, kMenor);
    if (vs[vs.length - 1] === vs[0]) vs.pop();
    brutas.push({ vs, ks, fechada: true });
  }

  /* as faces de cada operando, para as normais e para achar o pé do cordão na superfície */
  const facesDoOperando = new Map();
  for (const fid of faces) {
    const o = donos[fid];
    if (o == null) continue;
    if (!facesDoOperando.has(o)) facesDoOperando.set(o, []);
    facesDoOperando.get(o).push(fid);
  }
  const cadeias = [];
  for (const b of brutas) {
    if (b.fechada ? b.vs.length < 3 : b.vs.length < 2) continue;
    /* o trecho da costura mais curto que três passos (a costura de dois sólidos que nascem do mesmo ponto deixa laços de
       frações de milímetro perto dele) não leva perfil nenhum: ele fica de fora, e o perfil das cadeias vizinhas o cobre */
    const P0 = b.vs.map((v) => st.V.get(v));
    let comprimento = 0;
    for (let k = 1; k < P0.length; k++) comprimento += tam(sub(P0[k], P0[k - 1]));
    if (b.fechada) comprimento += tam(sub(P0[0], P0[P0.length - 1]));
    if (comprimento < 3 * passo) continue;
    /* a costura da booleana tem trechos de frações de milímetro ao lado de trechos longos, e a varredura dobraria nos curtos:
       a linha é reamostrada em passos iguais e suavizada, e as normais saem da superfície de cada sólido em cada ponto */
    const grossos = suavizar(reamostrar(b.vs.map((v) => [...st.V.get(v)]), b.fechada, passo), b.fechada);
    /* a suavização puxa as pontas de um trecho aberto curto para perto uma da outra: o ponto a menos de um quarto do passo do
       anterior sai, e a varredura não recebe trecho degenerado (os estais a 22°, revisão de 2026-11-15) */
    const pontos = semTrechoCurto(passoFino < passo ? refinar(grossos, b.fechada, passoFino) : grossos, b.fechada, passoFino / 4);
    const e0 = escolhidas[b.ks[0]];
    const superficieA = superficieDoOperando(st, facesDoOperando.get(e0.oA) ?? [], pontos, alcance, suave);
    const superficieB = superficieDoOperando(st, facesDoOperando.get(e0.oB) ?? [], pontos, alcance, suave);
    const lados = pontos.map((q) => ({ nA: superficieA(q)?.n ?? null, nB: superficieB(q)?.n ?? null }));
    const sem = lados.findIndex((l) => !l.nA || !l.nB);
    if (sem >= 0) return { erro: ['costura', `no ponto [${pontos[sem].map((x) => Number(x.toPrecision(6))).join(', ')}] da costura do unir:${de.id} um dos sólidos não tem superfície perto`] };
    const normais = lados.map(({ nA, nB }) => unit(soma(nA, nB)) ?? nA);
    cadeias.push({
      pontos, normais, fechada: b.fechada, espelhada: false, passo: 1, lados,
      operandos: [e0.oA, e0.oB], superficieA, superficieB,
      nomeDoIndice: (j) => `o ponto ${j} da costura [${pontos[j].map((x) => Number(x.toPrecision(6))).join(', ')}]`,
      nomes: pontos.map(() => ({ nome: null, inverte: false, noPlano: false })),
    });
  }
  if (!cadeias.length) return { erro: ['costura', `a costura do unir:${de.id} não forma linha de dois pontos ou mais`] };
  return { cadeias };
}

/** o ponto mais próximo de p num triângulo (Ericson, Real-Time Collision Detection, 5.1.5) */
function maisProximoNoTriangulo(p, a, b, c) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b); const d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return soma(a, mult(ab, d1 / (d1 - d3)));
  const cp = sub(p, c); const d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return soma(a, mult(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return soma(b, mult(sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6))));
  const den = 1 / (va + vb + vc);
  return soma(a, soma(mult(ab, vb * den), mult(ac, vc * den)));
}

/** superficieDoOperando(st, faces, pontosDaLinha, raio, suave) -> (q) => { p, n }: o ponto da superfície mais perto de q e a
 *  normal ali, só entre as faces que têm vértice a menos de `raio` de algum ponto da linha (a vizinhança da costura). A
 *  normal é a média das normais dos triângulos a menos de `suave` do ponto achado, pesada pela área e pela distância: a
 *  normal de uma face só muda em degrau de uma face para a vizinha numa superfície facetada, e o cordão andaria em degraus. */
export function superficieDoOperando(st, faces, pontosDaLinha, raio, suave) {
  const tris = [];
  const perto = (q) => pontosDaLinha.some((p) => tam(sub(q, p)) < raio);
  for (const fid of faces) {
    const vs = st.F.get(fid).vs.map((v) => st.V.get(v));
    if (!vs.some(perto)) continue;
    const n = normalDe(st, st.F.get(fid).vs);
    for (let k = 1; k + 1 < vs.length; k++) {
      const a = vs[0], b = vs[k], c = vs[k + 1];
      tris.push({ a, b, c, n, area: tam(cruz(sub(b, a), sub(c, a))) / 2 });
    }
  }
  return (q) => {
    let melhor = null, dist = Infinity;
    for (const t of tris) {
      const r = maisProximoNoTriangulo(q, t.a, t.b, t.c);
      const d = tam(sub(r, q));
      if (d < dist) { dist = d; melhor = r; }
    }
    if (!melhor) return null;
    let n = [0, 0, 0];
    for (const t of tris) {
      const d = tam(sub(maisProximoNoTriangulo(melhor, t.a, t.b, t.c), melhor));
      if (d < suave) n = soma(n, mult(t.n, t.area * (1 - d / suave)));
    }
    return { p: melhor, n: unit(n) ?? [0, 1, 0] };
  };
}

const d2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const n2 = (a) => { const l = Math.hypot(a[0], a[1]); return [a[0] / l, a[1] / l]; };
const m2 = (a, k) => [a[0] * k, a[1] * k];
const s2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
const p2 = (a, b) => a[0] * b[0] + a[1] * b[1];

/** perfilDoCordao({ peA, nPeA, peB, nPeB, largura }) -> [[u, v], ...] no plano da estação, a partir dos dois pés
 *  (já no plano, em u e v) e das normais da superfície em cada pé (também no plano). A ordem é pé A, curva até o topo,
 *  curva até o pé B, e o fundo por dentro do material. */
export function perfilDoCordao({ peA, nPeA, peB, nPeB, largura }) {
  const bis = n2(s2(nPeA, nPeB));
  const afunda = AFUNDA * largura;
  const afundA = s2(peA, m2(nPeA, -afunda)), afundB = s2(peB, m2(nPeB, -afunda));
  /* o chanfro: a face reta de pé a pé; o fundo fecha abaixo de cada pé e além do canto, que é a origem do plano (o ponto da
     costura), por dentro do material: o fundo que parava no meio da corda ficava, num canto fechado, ainda no vão entre os
     sólidos, e a face de baixo passava rente à costura deles, o que a união não fechava (2026-11-15) */
  const fundo = FUNDO * largura;
  return [afundA, afundB, s2(afundB, m2(nPeB, -fundo)), m2(bis, -fundo), s2(afundA, m2(nPeA, -fundo))];
}

/** cordaoNoQuadro({ p, quadro, nA, nB, largura, superficieA, superficieB }) -> o perfil da estação, em u (eixo B
 *  do quadro) e v (eixo N). */
export function cordaoNoQuadro({ p, quadro, nA, nB, largura, superficieA, superficieB }) {
  const { T, B, N } = quadro;
  const noPlano = (d) => { const q = sub(d, mult(T, dot(d, T))); return unit(q); };
  const a = noPlano(nA), b = noPlano(nB);
  if (!a || !b) return { erro: 'a normal de uma das superfícies é paralela à linha' };
  /* a reta de cada superfície no plano, saindo do canto pelo lado de fora da outra */
  const raio = (n, outro) => { let d = cruz(T, n); if (dot(d, outro) < 0) d = mult(d, -1); return unit(d); };
  const dA = raio(a, b), dB = raio(b, a);
  const pe = (d, sup) => {
    const alvo = soma(p, mult(d, largura / 2));
    const s = sup(alvo);
    if (!s) return null;
    const uv = (q) => [dot(sub(q, p), B), dot(sub(q, p), N)];
    const n = noPlano(s.n) ?? noPlano(d);
    return { pe: uv(s.p), n: [dot(n, B), dot(n, N)] };
  };
  const pA = pe(dA, superficieA), pB = pe(dB, superficieB);
  if (!pA || !pB) return { erro: 'o pé do cordão não achou a superfície de um dos sólidos perto da costura' };
  const perfil = perfilDoCordao({ peA: pA.pe, nPeA: n2(pA.n), peB: pB.pe, nPeB: n2(pB.n), largura });
  return { perfil };
}
