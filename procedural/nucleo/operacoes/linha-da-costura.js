/* linha-da-costura.js — a costura de uma união como linha do `friso`, e o perfil `cordao` posto no canto a cada ponto dela
   (plano do cordão de solda na costura de tubos, 2026-11-15).

   A LINHA. O `unir` registra as arestas da costura (pares de vértice) e o operando de cada face (`donos`). Com
   `costura: { de: { op: 'unir', id }, entre: [a, b] }`, a linha são as arestas da costura cujas duas faces vêm dos
   operandos a e b; sem `entre`, todas as da costura. As arestas se encadeiam em voltas fechadas, ou em trechos abertos
   quando a costura chega a um vértice que não tem exatamente duas arestas da escolha (o ponto triplo, onde a costura de a
   com b encontra a de a com c). Em cada ponto ficam as normais dos dois lados (a média das faces de cada operando que
   tocam as arestas da linha naquele vértice), e a normal da linha é a bissetriz delas, que aponta para o vão do canto.

   O CORDÃO. O perfil `cordao: { largura, altura }` não é fixo: em cada estação ele é desenhado no plano perpendicular à
   linha, a partir das duas superfícies. Cada borda (o pé do cordão) fica sobre a superfície de um operando, a metade da
   largura do canto, achada na própria malha do operando (o ponto mais próximo) para a superfície curva não deixar o pé
   no ar, e afundada uma fração da altura para o cordão cruzar a superfície em vez de encostar nela. Do pé ao topo o
   contorno é uma curva de Bézier que sai tangente à superfície e chega ao topo, à `altura` acima do meio da reta entre
   os dois pés, na bissetriz das duas superfícies, com a tangente deitada; por baixo, o perfil fecha por dentro do material. O número de pontos é o mesmo em
   toda estação, como a varredura pede. */

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
export const EXEMPLO_DE_CORDAO = 'perfil: { cordao: { largura: 0.009, altura: 0.0024 } }';

/* quantos pontos de cada curva do pé ao topo; o perfil tem 2 * PONTOS_POR_LADO + 3 pontos */
const PONTOS_POR_LADO = 8;
/* o quanto o pé afunda na superfície, em fração da altura, e o fundo do perfil abaixo do pé, em fração da largura */
const AFUNDA = 0.04;
const FUNDO = 0.3;
/* os braços de cada Bézier, em fração da distância do pé ao topo: longo no pé, para o cordão sair raso da superfície, e
   curto no topo, para a coroa ficar quase reta, chanfrada (escolha da pessoa por imagem, 2026-11-15) */
const BRACO_DO_PE = 0.6;
const BRACO_DO_TOPO = 0.15;

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
 *  Cada cadeia é a que o `friso` varre ({ pontos, normais, fechada, espelhada, nomeDoIndice, nomes, passo }) com, a
 *  mais, `lados`: por ponto, as normais dos dois operandos ({ nA, nB }), e `operandos`: [a, b] e as faces de cada um. */
export function linhaDaCostura(st, costura, { passo, alcance, suave }) {
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
  const operandos = new Set(escolhidas.flatMap((e) => [e.oA, e.oB]));
  if (!entre && operandos.size > 2) {
    return { erro: ['costura', `a costura do unir:${de.id} junta mais de dois sólidos (os pares ${[...pares].sort().map((p) => `[${p.replace('-', ', ')}]`).join(', ')}); escolha um par com entre, como ${EXEMPLO_DE_COSTURA}`] };
  }

  /* o encadeamento: vizinhança por vértice; corta nos vértices que não têm exatamente duas arestas */
  const porVertice = new Map();
  for (const [k, e] of escolhidas.entries()) for (const v of [e.x, e.y]) {
    if (!porVertice.has(v)) porVertice.set(v, []);
    porVertice.get(v).push(k);
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
      const viz = porVertice.get(v);
      if (viz.length !== 2) break;
      k = viz[0] === k ? viz[1] : viz[0];
    }
    return { vs, ks };
  };
  const brutas = [];
  /* primeiro os trechos abertos, a partir das pontas (vértices com uma aresta ou com três e mais), em ordem de id */
  const pontas = [...porVertice.entries()].filter(([, ks]) => ks.length !== 2).map(([v]) => v).sort((p, q) => p - q);
  for (const v of pontas) for (const k of porVertice.get(v)) if (!usada[k]) brutas.push({ ...seguir(v, k), fechada: false });
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
    /* a costura da booleana tem trechos de frações de milímetro ao lado de trechos longos, e a varredura dobraria nos curtos:
       a linha é reamostrada em passos iguais e suavizada, e as normais saem da superfície de cada sólido em cada ponto */
    const pontos = suavizar(reamostrar(b.vs.map((v) => [...st.V.get(v)]), b.fechada, passo), b.fechada);
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

const bezier = (p0, p1, p2, p3, t) => {
  const s = 1 - t;
  return [0, 1].map((k) => s * s * s * p0[k] + 3 * s * s * t * p1[k] + 3 * s * t * t * p2[k] + t * t * t * p3[k]);
};
const d2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const n2 = (a) => { const l = Math.hypot(a[0], a[1]); return [a[0] / l, a[1] / l]; };
const m2 = (a, k) => [a[0] * k, a[1] * k];
const s2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
const p2 = (a, b) => a[0] * b[0] + a[1] * b[1];

/** perfilDoCordao({ peA, nPeA, peB, nPeB, largura, altura }) -> [[u, v], ...] no plano da estação, a partir dos dois pés
 *  (já no plano, em u e v) e das normais da superfície em cada pé (também no plano). A ordem é pé A, curva até o topo,
 *  curva até o pé B, e o fundo por dentro do material. */
export function perfilDoCordao({ peA, nPeA, peB, nPeB, altura, largura }) {
  const meio = m2(s2(peA, peB), 0.5);
  const bis = n2(s2(nPeA, nPeB));
  /* o topo fica à `altura` acima do meio da corda dos dois pés, na bissetriz: é o reforço do cordão sobre a reta entre os pés */
  const topo = s2(meio, m2(bis, altura));
  const deitado = [-bis[1], bis[0]];
  const ladoDe = (pe, nPe) => {
    const afundado = s2(pe, m2(nPe, -AFUNDA * altura));
    let t = [-nPe[1], nPe[0]];
    if (p2(t, d2(topo, afundado)) < 0) t = m2(t, -1);
    let tc = deitado;
    if (p2(tc, d2(afundado, topo)) < 0) tc = m2(tc, -1);
    const dist = Math.hypot(...d2(topo, afundado));
    return { afundado, p1: s2(afundado, m2(t, BRACO_DO_PE * dist)), p2: s2(topo, m2(tc, BRACO_DO_TOPO * dist)) };
  };
  const A = ladoDe(peA, nPeA), B = ladoDe(peB, nPeB);
  const pts = [];
  for (let k = 0; k <= PONTOS_POR_LADO; k++) pts.push(bezier(A.afundado, A.p1, A.p2, topo, k / PONTOS_POR_LADO));
  for (let k = PONTOS_POR_LADO - 1; k >= 0; k--) pts.push(bezier(B.afundado, B.p1, B.p2, topo, k / PONTOS_POR_LADO));
  /* o fundo: abaixo de cada pé e abaixo do meio, por dentro do material */
  const fundo = FUNDO * largura;
  pts.push(s2(B.afundado, m2(nPeB, -fundo)));
  pts.push(s2(meio, m2(bis, -fundo)));
  pts.push(s2(A.afundado, m2(nPeA, -fundo)));
  return pts;
}

/** cordaoNoQuadro({ p, quadro, nA, nB, largura, altura, superficieA, superficieB }) -> o perfil da estação, em u (eixo B
 *  do quadro) e v (eixo N). */
export function cordaoNoQuadro({ p, quadro, nA, nB, largura, altura, superficieA, superficieB }) {
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
  const perfil = perfilDoCordao({ peA: pA.pe, nPeA: n2(pA.n), peB: pB.pe, nPeB: n2(pB.n), altura, largura });
  return { perfil };
}
