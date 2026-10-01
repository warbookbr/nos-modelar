/* Contato do esboço: gate opt-in de colisão, folga e conjunto conectado entre as
   formas de cada opção. A geometria é a que o desenho já monta (`resolverOpcao`:
   prisma com perfil, furos, eixo e rotação); aqui cada forma vira uma lista de
   peças convexas (prismas) e a distância e a penetração saem dos pares delas.

   Aproximação: caixa (com `raio`), cilindro e `achatado` são um prisma convexo
   exato (o círculo é o polígono de 128 lados que o desenho usa). O anel é cortado
   em 32 setores trapezoidais convexos, com a face interna tangente ao furo, de
   modo que o furo nunca é invadido por excesso; o aro fica no máximo 0,5% do raio
   externo menor que o círculo. A caixa com furos é cortada em triângulos pelo
   earcut. A distância entre peças convexas é exata (GJK) e a penetração é a menor
   sobreposição entre eixos de separação (SAT). Numa forma cortada em várias peças
   a folga é a menor entre elas e a penetração é a maior entre as peças, o que
   subestima um cruzamento que atravesse várias fatias do aro. */
import earcut from 'earcut';
import { ErroDeEsboco, normaisDasFaixas, pontaDeclaradaLivre, pontasDe, resolverOpcao, subforma } from './index.js';
import { expandirEsboco } from './expandir.js';
import { criarConserto } from './conserto.js';

export const TIPOS_DE_PAR = ['atravessa', 'encosta', 'livre'];
/* Contrato de declaração herdado do Mecanifica (`MINIMO_DO_MOTIVO` em
   src/autoria/contatos-da-peca.js): toda exceção declara POR QUE, e um motivo curto
   é declaração que ninguém confere. O valor é copiado em número porque este módulo
   não importa o núcleo. */
export const MINIMO_DO_MOTIVO = 15;
const SETORES = 32;
/* Acima deste número de pares de arestas o SAT dos sólidos em seções dispensa os eixos de aresta contra aresta. */
const LIMITE_DE_ARESTAS = 25000;
const EPS = 1e-9;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const escala = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const somar = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const norma2 = (a) => dot(a, a);

function girar(m, v) {
  return m ? [dot(m[0], v), dot(m[1], v), dot(m[2], v)] : v;
}

function localParaMundo(b, u, v, w) {
  const p = [0, 0, 0];
  p[b.u] = u; p[b.v] = v; p[b.e] = w;
  return p;
}

function direcaoUnica(d) {
  const n = Math.sqrt(norma2(d));
  if (n < 1e-9) return null;
  let u = escala(d, 1 / n);
  const k = u.findIndex((c) => Math.abs(c) > 1e-9);
  if (u[k] < 0) u = escala(u, -1);
  return u;
}

function unicas(direcoes) {
  const mapa = new Map();
  for (const d of direcoes) {
    const u = direcaoUnica(d);
    if (u) mapa.set(u.map((c) => Math.round(c * 1e6)).join(','), u);
  }
  return [...mapa.values()];
}

/* Peça convexa: prisma de um polígono convexo (u, v) extrudado em w. */
function prismaConvexo(r, poligono) {
  const { b, comprimento: h } = r.prisma;
  const M = r.matriz;
  const mundo = (u, v, w) => somar(r.centro, girar(M, localParaMundo(b, u, v, w)));
  const verts = [];
  for (const w of [-h / 2, h / 2]) for (const [u, v] of poligono) verts.push(mundo(u, v, w));
  const eixo = girar(M, localParaMundo(b, 0, 0, 1));
  const normais = [eixo];
  const arestas = [eixo];
  for (let i = 0; i < poligono.length; i++) {
    const p = poligono[i]; const q = poligono[(i + 1) % poligono.length];
    const du = q[0] - p[0]; const dv = q[1] - p[1];
    normais.push(girar(M, localParaMundo(b, dv, -du, 0)));
    arestas.push(girar(M, localParaMundo(b, du, dv, 0)));
  }
  const min = [0, 1, 2].map((i) => Math.min(...verts.map((p) => p[i])));
  const max = [0, 1, 2].map((i) => Math.max(...verts.map((p) => p[i])));
  return { verts, normais: unicas(normais), arestas: unicas(arestas), min, max };
}

/* Peça convexa de um sólido em seções (cone, tronco, esfera, caixa chanfrada): a envoltória de todas as
   seções. As faces laterais são planas (cada faixa entre duas seções é um trapézio), e por isso as normais
   delas e as arestas de cada seção e de cada ponto ao seguinte bastam para o SAT. */
function prismaDeSecoes(r) {
  const { b, secoes } = r.prisma;
  const M = r.matriz;
  const mundo = (u, v, w) => somar(r.centro, girar(M, localParaMundo(b, u, v, w)));
  const verts = [];
  for (const sc of secoes) {
    if (sc.perfil.every(([u, v]) => Math.abs(u) < 1e-12 && Math.abs(v) < 1e-12)) verts.push(mundo(0, 0, sc.w));
    else for (const [u, v] of sc.perfil) verts.push(mundo(u, v, sc.w));
  }
  const eixo = girar(M, localParaMundo(b, 0, 0, 1));
  const normais = [eixo];
  const arestas = [eixo];
  for (const faixa of normaisDasFaixas(r.prisma)) for (const n of faixa) normais.push(girar(M, n));
  secoes.forEach((sc, k) => {
    const N = sc.perfil.length;
    for (let i = 0; i < N; i++) {
      const p = sc.perfil[i]; const q = sc.perfil[(i + 1) % N];
      arestas.push(girar(M, localParaMundo(b, q[0] - p[0], q[1] - p[1], 0)));
      if (k > 0) {
        const a = secoes[k - 1].perfil[i];
        arestas.push(girar(M, localParaMundo(b, p[0] - a[0], p[1] - a[1], sc.w - secoes[k - 1].w)));
      }
    }
  });
  const min = [0, 1, 2].map((i) => Math.min(...verts.map((p) => p[i])));
  const max = [0, 1, 2].map((i) => Math.max(...verts.map((p) => p[i])));
  return { verts, normais: unicas(normais), arestas: unicas(arestas), min, max, limitaArestas: true };
}

/* Um sólido de loft ou de revolução vira uma peça convexa por faixa entre duas seções consecutivas (o tronco
   entre elas). Uma faixa de espessura nula (o degrau da revolução) não tem volume e não entra. */
function pecasPorFaixas(r) {
  const { secoes } = r.prisma;
  const saida = [];
  for (let k = 0; k + 1 < secoes.length; k++) {
    if (secoes[k + 1].w - secoes[k].w <= 1e-9) continue;
    saida.push(prismaDeSecoes({ ...r, prisma: { ...r.prisma, secoes: [secoes[k], secoes[k + 1]] } }));
  }
  return saida;
}

const areaDe = (poli) => poli.reduce((acc, q, i) => acc + q[0] * poli[(i + 1) % poli.length][1] - poli[(i + 1) % poli.length][0] * q[1], 0);

/* Decomposição de um polígono simples em polígonos convexos anti-horários: earcut em triângulos e, depois, a fusão
   gulosa de vizinhos que continuam convexos (Hertel-Mehlhorn). Vértices colineares são aceitos na fusão. */
export function decomporConvexo(perfil) {
  const idx = earcut(perfil.flat(), [], 2);
  let polis = [];
  for (let i = 0; i < idx.length; i += 3) {
    const tri = [idx[i], idx[i + 1], idx[i + 2]];
    if (Math.abs(areaDe(tri.map((k) => perfil[k]))) < 1e-9) continue;
    polis.push(areaDe(tri.map((k) => perfil[k])) > 0 ? tri : [tri[0], tri[2], tri[1]]);
  }
  const convexo = (ids) => {
    const n = ids.length;
    for (let i = 0; i < n; i++) {
      const a = perfil[ids[i]]; const b = perfil[ids[(i + 1) % n]]; const c = perfil[ids[(i + 2) % n]];
      if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) < -1e-9) return false;
    }
    return true;
  };
  const fundir = (A, B) => {
    for (let i = 0; i < A.length; i++) {
      const p = A[i]; const q = A[(i + 1) % A.length];
      for (let j = 0; j < B.length; j++) {
        if (B[j] !== q || B[(j + 1) % B.length] !== p) continue;
        const nova = [];
        for (let k = 1; k <= A.length; k++) nova.push(A[(i + k) % A.length]);
        for (let k = 2; k < B.length; k++) nova.push(B[(j + k) % B.length]);
        return convexo(nova) ? nova : null;
      }
    }
    return null;
  };
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (let a = 0; a < polis.length && !mudou; a++) {
      for (let b = a + 1; b < polis.length && !mudou; b++) {
        const nova = fundir(polis[a], polis[b]);
        if (!nova) continue;
        polis = polis.filter((_, k) => k !== a && k !== b);
        polis.push(nova);
        mudou = true;
      }
    }
  }
  return polis.map((ids) => ids.map((k) => perfil[k]));
}

/* Peças convexas de uma forma resolvida. */
export function pecasDe(r) {
  if (!memoPecas.has(r)) memoPecas.set(r, pecasSemMemoria(r));
  return memoPecas.get(r);
}

/* Uma forma resolvida (e a lista de peças dela) é imutável depois de resolvida: a leitura em texto
   reaproveita as peças e as medidas entre o gate de contato, a projeção e o grafo. */
const memoPecas = new WeakMap();
const memoPares = new WeakMap();

function pecasSemMemoria(r) {
  if (r.partes) return r.partes.flatMap((pt) => pecasDe(subforma(r, pt)));
  if (r.prisma.secoes) return r.prisma.porFaixas ? pecasPorFaixas(r) : [prismaDeSecoes(r)];
  const { perfil, furos } = r.prisma;
  if (furos.length === 0) return r.prisma.naoConvexo ? decomporConvexo(perfil).map((poli) => prismaConvexo(r, poli)) : [prismaConvexo(r, perfil)];
  if (r.forma.tipo === 'anel') {
    const n = perfil.length;
    const passo = n / SETORES;
    /* face interna tangente ao furo: escalar o vértice do polígono inscrito por 1/cos */
    const fator = 1 / Math.cos(Math.PI / SETORES);
    const interno = furos[0].map(([u, v]) => [u * fator, v * fator]);
    const saida = [];
    for (let s = 0; s < SETORES; s++) {
      const i = Math.round(s * passo); const j = Math.round(((s + 1) % SETORES) * passo) % n;
      saida.push(prismaConvexo(r, [perfil[i], perfil[j], interno[j], interno[i]]));
    }
    return saida;
  }
  const plano = [...perfil, ...furos.flat()].flatMap((p) => p);
  const buracos = [];
  let acc = perfil.length;
  for (const f of furos) { buracos.push(acc); acc += f.length; }
  const pontos = [...perfil, ...furos.flat()];
  const idx = earcut(plano, buracos, 2);
  const saida = [];
  for (let i = 0; i < idx.length; i += 3) saida.push(prismaConvexo(r, [pontos[idx[i]], pontos[idx[i + 1]], pontos[idx[i + 2]]]));
  return saida;
}

function apoio(verts, d) {
  let melhor = verts[0]; let m = dot(melhor, d);
  for (let i = 1; i < verts.length; i++) { const t = dot(verts[i], d); if (t > m) { m = t; melhor = verts[i]; } }
  return melhor;
}

/* Ponto da envoltória afim de `pts` mais perto da origem, se os pesos forem todos >= 0. */
function subconjunto(pts) {
  const n = pts.length;
  if (n === 1) return pts[0];
  if (n === 2) {
    const [a, b] = pts; const ab = sub(b, a); const d = norma2(ab);
    if (d < 1e-24) return null;
    const t = -dot(a, ab) / d;
    return t < 0 || t > 1 ? null : somar(a, escala(ab, t));
  }
  if (n === 3) {
    const [a, b, c] = pts; const ab = sub(b, a); const ac = sub(c, a);
    const nn = cross(ab, ac); const d = norma2(nn);
    if (d < 1e-24) return null;
    const p = escala(nn, dot(a, nn) / d);
    const pa = sub(p, a);
    const u = dot(cross(pa, ac), nn) / d; const v = dot(cross(ab, pa), nn) / d;
    return u < -1e-12 || v < -1e-12 || u + v > 1 + 1e-12 ? null : p;
  }
  const [a, b, c, d4] = pts;
  const det = (p, q, r) => dot(p, cross(q, r));
  const ab = sub(b, a); const ac = sub(c, a); const ad = sub(d4, a);
  const total = det(ab, ac, ad);
  if (Math.abs(total) < 1e-18) return null;
  const na = escala(a, -1);
  const mb = det(na, ac, ad) / total; const mc = det(ab, na, ad) / total; const md = det(ab, ac, na) / total;
  const pesos = [1 - mb - mc - md, mb, mc, md];
  return pesos.every((x) => x >= -1e-12) ? [0, 0, 0] : null;
}

function subconjuntos(pts) {
  const n = pts.length; let melhor = null;
  for (let mask = 1; mask < (1 << n); mask++) {
    const sel = []; for (let i = 0; i < n; i++) if (mask & (1 << i)) sel.push(i);
    const p = subconjunto(sel.map((i) => pts[i]));
    if (!p) continue;
    const d = norma2(p);
    if (!melhor || d < melhor.d - 1e-15 || (Math.abs(d - melhor.d) <= 1e-15 && sel.length < melhor.sel.length)) melhor = { p, d, sel };
  }
  return melhor;
}

/* GJK entre duas peças convexas: { d, v }, com d a distância (0 se se tocam ou se cruzam) e v o vetor
   `pontoDeA - pontoDeB` entre os pontos mais próximos (nulo quando d é 0). */
function gjk(A, B) {
  let d = sub(A.verts[0], B.verts[0]);
  let simplex = [sub(apoio(A.verts, d), apoio(B.verts, escala(d, -1)))];
  let v = simplex[0];
  for (let it = 0; it < 100; it++) {
    const r = subconjuntos(simplex);
    v = r.p; simplex = r.sel.map((i) => simplex[i]);
    const v2 = norma2(v);
    if (v2 < 1e-18 || simplex.length === 4) return { d: 0, v: [0, 0, 0] };
    const w = sub(apoio(A.verts, escala(v, -1)), apoio(B.verts, v));
    if (v2 - dot(v, w) <= 1e-10 * v2) return { d: Math.sqrt(v2), v };
    if (simplex.some((s) => norma2(sub(s, w)) < 1e-20)) return { d: Math.sqrt(v2), v };
    simplex.push(w);
  }
  return { d: Math.sqrt(norma2(v)), v };
}

/* Distância entre duas peças convexas (0 se se tocam ou se cruzam). */
function distanciaConvexa(A, B) {
  return gjk(A, B).d;
}

/* Menor sobreposição entre eixos de separação (peças que se cruzam). SAT. Devolve também `dirA`, o
   vetor unitário em que A se afasta de B com o menor deslocamento. */
function sobreposicaoConvexa(A, B) {
  const eixos = [...A.normais, ...B.normais];
  /* Entre sólidos de muitas faces (esfera, cone) os produtos vetoriais das arestas passam de dezenas de milhares
     de eixos: aí só as normais das faces valem, o que nunca subestima a penetração (só a superestima, e só
     quando o GJK já disse que as peças se cruzam). */
  if (!((A.limitaArestas || B.limitaArestas) && A.arestas.length * B.arestas.length > LIMITE_DE_ARESTAS)) {
    for (const ea of A.arestas) for (const eb of B.arestas) eixos.push(cross(ea, eb));
  }
  let menor = Infinity; let dirA = null;
  for (const e of unicas(eixos)) {
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const p of A.verts) { const t = dot(p, e); if (t < a0) a0 = t; if (t > a1) a1 = t; }
    for (const p of B.verts) { const t = dot(p, e); if (t < b0) b0 = t; if (t > b1) b1 = t; }
    const s = Math.min(a1 - b0, b1 - a0);
    if (s < 0) return { p: 0, dirA: null };
    if (s < menor) { menor = s; dirA = a1 - b0 <= b1 - a0 ? escala(e, -1) : e; }
  }
  return menor === Infinity ? { p: 0, dirA: null } : { p: menor, dirA };
}

function penetracaoConvexa(A, B) {
  return sobreposicaoConvexa(A, B).p;
}

function folgaAABB(a, b) {
  let q = 0;
  for (let i = 0; i < 3; i++) { const g = Math.max(a.min[i] - b.max[i], b.min[i] - a.max[i], 0); q += g * g; }
  return Math.sqrt(q);
}

const caixaDasPecas = (pecas) => ({ min: [0, 1, 2].map((i) => Math.min(...pecas.map((p) => p.min[i]))), max: [0, 1, 2].map((i) => Math.max(...pecas.map((p) => p.max[i]))) });

/* Um esboço com formas `oculto` (a unidade isolada por --detalhar esconde as outras, que só servem de referência) julga a
   conectividade das visíveis com o mestre inteiro: uma forma ligada a uma oculta (a menos de `tol`, ou por `atravessa`
   declarado) está ligada ao que a oculta toca, e a folga até a oculta mais próxima vale para o "longe". A oculta nunca é
   achado nem entra no grupo principal. Muda `ligados` (índices das visíveis) e `menorFolga` no lugar; devolve se mudou algo.
   `visiveis` e `ocultas` são listas de peças convexas por forma; `declarado(i, h)` diz se o par visível i e oculta h é um
   `atravessa` declarado. */
export function completarPelasOcultas({ visiveis, ocultas, ligados, menorFolga, tol, alcance, declarado = () => false }) {
  const m = ocultas.length;
  if (m === 0 || visiveis.length === 0) return false;
  const cv = visiveis.map(caixaDasPecas); const co = ocultas.map(caixaDasPecas);
  const toca = Array.from({ length: m }, () => []);
  const vizinhasDeOculta = Array.from({ length: m }, () => []);
  for (let a = 0; a < visiveis.length; a++) {
    for (let h = 0; h < m; h++) {
      const forcado = declarado(a, h);
      if (folgaAABB(cv[a], co[h]) > alcance && !forcado) continue;
      const { folga } = medirPar(visiveis[a], ocultas[h]);
      if (folga < menorFolga[a]) menorFolga[a] = folga;
      if (folga <= tol || forcado) toca[h].push(a);
    }
  }
  for (let h = 0; h < m; h++) for (let k = h + 1; k < m; k++) {
    if (folgaAABB(co[h], co[k]) > tol) continue;
    if (medirPar(ocultas[h], ocultas[k]).folga <= tol) { vizinhasDeOculta[h].push(k); vizinhasDeOculta[k].push(h); }
  }
  const visto = Array(m).fill(false);
  let mudou = false;
  for (let h0 = 0; h0 < m; h0++) {
    if (visto[h0]) continue;
    const fila = [h0]; visto[h0] = true; const adjacentes = new Set();
    while (fila.length) { const h = fila.pop(); for (const a of toca[h]) adjacentes.add(a); for (const k of vizinhasDeOculta[h]) if (!visto[k]) { visto[k] = true; fila.push(k); } }
    const lista = [...adjacentes];
    for (let i = 1; i < lista.length; i++) if (!ligados[lista[0]].includes(lista[i])) { ligados[lista[0]].push(lista[i]); ligados[lista[i]].push(lista[0]); mudou = true; }
  }
  return mudou;
}

/* O número de grupos conectados de uma lista de adjacências. */
export function contarGrupos(ligados) {
  const g = Array(ligados.length).fill(-1); let k = 0;
  for (let a = 0; a < ligados.length; a++) {
    if (g[a] >= 0) continue;
    const f = [a]; g[a] = k;
    while (f.length) { const x = f.pop(); for (const y of ligados[x]) if (g[y] < 0) { g[y] = k; f.push(y); } }
    k++;
  }
  return k;
}

/* { folga, penetracao } entre duas formas (listas de peças convexas). */
export function medirPar(pecasA, pecasB) {
  let doA = memoPares.get(pecasA);
  if (!doA) { doA = new WeakMap(); memoPares.set(pecasA, doA); }
  if (!doA.has(pecasB)) doA.set(pecasB, medirParSemMemoria(pecasA, pecasB));
  return doA.get(pecasB);
}

function medirParSemMemoria(pecasA, pecasB) {
  let folga = Infinity; let penetracao = 0;
  for (const a of pecasA) for (const b of pecasB) {
    if (folgaAABB(a, b) >= folga && folga > 0) continue;
    const d = distanciaConvexa(a, b);
    if (d > 1e-7) { if (d < folga) folga = d; continue; }
    folga = 0;
    const p = penetracaoConvexa(a, b);
    if (p > penetracao) penetracao = p;
  }
  return { folga, penetracao };
}

/* Os pontos de contato entre duas formas (listas de peças convexas), um por par de peças a menos de `tol` uma da outra: o centro da
   região em que as caixas das duas peças, cada uma engordada de `tol / 2`, se encontram (no encosto de topo, a meio caminho entre as
   faces; na penetração, o meio da sobreposição). Devolve [{ ponto: [x, y, z] }]. Determinístico, sem memória. */
export function pontosDeContato(pecasA, pecasB, tol) {
  const saida = [];
  for (const a of pecasA) for (const b of pecasB) {
    if (folgaAABB(a, b) > tol) continue;
    if (distanciaConvexa(a, b) > tol) continue;
    saida.push({ ponto: [0, 1, 2].map((i) => {
      const lo = Math.max(a.min[i], b.min[i]);
      const hi = Math.min(a.max[i], b.max[i]);
      return lo <= hi ? (lo + hi) / 2 : (a.max[i] < b.min[i] ? (a.max[i] + b.min[i]) / 2 : (b.max[i] + a.min[i]) / 2);
    }) });
  }
  return saida;
}

/* Agrupa pontos a menos de `tol` uns dos outros (encadeado: o vizinho do vizinho é do mesmo grupo), na ordem em que chegam.
   Devolve [{ ponto, itens }] com o ponto médio do grupo e os índices dos pontos de entrada. */
export function agruparPontos(pontos, tol) {
  const pai = pontos.map((_, i) => i);
  const raiz = (i) => { while (pai[i] !== i) { pai[i] = pai[pai[i]]; i = pai[i]; } return i; };
  for (let i = 0; i < pontos.length; i++) for (let j = i + 1; j < pontos.length; j++) {
    if (Math.hypot(...pontos[i].map((x, k) => x - pontos[j][k])) <= tol) pai[raiz(j)] = raiz(i);
  }
  const grupos = new Map();
  pontos.forEach((p, i) => { const r = raiz(i); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(i); });
  return [...grupos.values()].map((itens) => ({ itens, ponto: [0, 1, 2].map((k) => itens.reduce((s, i) => s + pontos[i][k], 0) / itens.length) }));
}

/* A menor distância de um ponto às peças de uma forma (0 se está dentro ou encostado). */
export function distanciaDoPonto(p, pecas) {
  const ponto = { verts: [p], min: p, max: p };
  let menor = Infinity;
  for (const b of pecas) {
    if (folgaAABB(ponto, b) >= menor) continue;
    menor = Math.min(menor, gjk(ponto, b).d);
    if (menor <= 1e-7) return 0;
  }
  return menor;
}

/* O par em detalhe, para o conserto: { folga, penetracao, separa, aproxima }. `separa` é a direção unitária
   em que a forma A se afasta de B com o menor deslocamento (o eixo de separação mínima do SAT, na peça de
   maior penetração) e `aproxima` a direção em que A se aproxima de B pelo segmento entre os pontos mais
   próximos. Só se pede para quem tem achado, e por isso não usa memória. */
export function detalharPar(pecasA, pecasB) {
  let folga = Infinity; let penetracao = 0; let separa = null; let aproxima = null;
  for (const a of pecasA) for (const b of pecasB) {
    const { d, v } = gjk(a, b);
    if (d > 1e-7) {
      if (d < folga) { folga = d; aproxima = escala(v, -1 / d); }
      continue;
    }
    folga = 0; aproxima = null;
    const s = sobreposicaoConvexa(a, b);
    if (s.p > penetracao) { penetracao = s.p; separa = s.dirA; }
  }
  return { folga, penetracao, separa, aproxima };
}

const numMm = (v, onde) => {
  if (v === undefined) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new ErroDeEsboco(`${onde}: deve ser um número em mm, finito e maior ou igual a zero`);
  return v;
};

export function lerContato(c, onde) {
  if (c === undefined) return null;
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw new ErroDeEsboco(`${onde}: "contato" deve ser um objeto { usar, tolerancia, penetracao, folga, pares }`);
  if (c.usar !== undefined && typeof c.usar !== 'boolean') throw new ErroDeEsboco(`${onde}: "contato.usar" deve ser true ou false`);
  const pares = [];
  if (c.pares !== undefined) {
    if (!Array.isArray(c.pares)) throw new ErroDeEsboco(`${onde}: "contato.pares" deve ser uma lista de { a, b, tipo, max, motivo }`);
    for (const [i, p] of c.pares.entries()) {
      if (!p || typeof p.a !== 'string' || typeof p.b !== 'string' || p.a === p.b) throw new ErroDeEsboco(`${onde}: contato.pares[${i}] precisa de "a" e "b", ids diferentes`);
      if (!TIPOS_DE_PAR.includes(p.tipo)) throw new ErroDeEsboco(`${onde}: contato.pares[${i}].tipo deve ser um de ${TIPOS_DE_PAR.join(', ')}`);
      if (p.max !== undefined && p.tipo !== 'atravessa') throw new ErroDeEsboco(`${onde}: contato.pares[${i}].max só vale para o tipo atravessa`);
      if (p.motivo !== undefined && typeof p.motivo !== 'string') throw new ErroDeEsboco(`${onde}: contato.pares[${i}].motivo deve ser um texto`);
      pares.push({ a: p.a, b: p.b, tipo: p.tipo, max: numMm(p.max, `${onde}: contato.pares[${i}].max`), motivo: p.motivo, ...(typeof p.junta === 'string' ? { junta: p.junta } : {}) });
    }
  }
  return {
    usar: c.usar,
    tolerancia: numMm(c.tolerancia, `${onde}: contato.tolerancia`),
    penetracao: numMm(c.penetracao, `${onde}: contato.penetracao`),
    folga: numMm(c.folga, `${onde}: contato.folga`),
    pares,
  };
}

/* Pares que a própria geometria declara: uma forma com `encosta` e folga dentro da tolerância
   forma um par `encosta` com a referência, sem `motivo` (não é exceção). Os pares declarados
   à mão vêm depois e prevalecem. `de`/`para` não declara nada. */
export function paresImplicitos(opcao, tolerancia) {
  return (opcao.formas ?? []).filter((f) => f.encosta && typeof f.encosta.referencia === 'string' && (f.encosta.folga ?? 0) <= tolerancia)
    .map((f) => ({ a: f.id, b: f.encosta.referencia, tipo: 'encosta', implicito: true }));
}

/* O par do espelho herda as declarações do original: `guidao ↔ garfoE` declarado (atravessa, livre ou
   encosta, com o mesmo `motivo` e `max`) vale para `guidao ↔ garfoD` quando `garfoD` é o espelho de
   `garfoE`. Se o outro lado do par também tem espelho no mesmo eixo e na mesma posição, o par dos dois
   espelhos herda também (`balancimE ↔ rodaE` gera `balancimD ↔ rodaD`); o cruzado nunca. O par entre a
   fonte e a cópia (`garfoE ↔ garfoD`) não herda nada e é cobrado como qualquer outro. Um par declarado
   para a cópia prevalece. */
export function herdarDoEspelho(pares, opcao) {
  const copias = new Map();
  for (const f of opcao?.formas ?? []) {
    if (f?.espelha && typeof f.id === 'string' && typeof f.espelha.forma === 'string') {
      if (!copias.has(f.espelha.forma)) copias.set(f.espelha.forma, []);
      copias.get(f.espelha.forma).push({ id: f.id, eixo: f.espelha.eixo, pos: f.espelha.pos ?? 0 });
    }
  }
  if (copias.size === 0) return pares;
  const chave = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
  const existentes = new Set(pares.map((p) => chave(p.a, p.b)));
  const extras = [];
  const somar = (p, a, b) => {
    if (a === b || existentes.has(chave(a, b))) return;
    existentes.add(chave(a, b));
    extras.push({ ...p, a, b, herdado: true });
  };
  for (const p of pares) {
    const ca = copias.get(p.a) ?? [];
    const cb = copias.get(p.b) ?? [];
    const casados = new Set();
    for (const c of ca) {
      const d = cb.find((x) => x.eixo === c.eixo && x.pos === c.pos);
      if (!d || c.id === p.b || d.id === p.a) continue;
      somar(p, c.id, d.id);
      casados.add(c.id); casados.add(d.id);
    }
    for (const c of ca) if (!casados.has(c.id) && c.id !== p.b) somar(p, c.id, p.b);
    for (const d of cb) if (!casados.has(d.id) && d.id !== p.a) somar(p, p.a, d.id);
  }
  return [...pares, ...extras];
}

/* A Unidade de detalhe declarada de cada forma: `unidade` na forma (ou na instância de componente, que a passa às formas dela),
   e, sem ela, a da forma de que ela é espelho (`espelha`) ou cópia (`arranjoDe`). Devolve Map id -> nome. */
export function unidadesDeclaradas(formas) {
  const porId = new Map((formas ?? []).filter((f) => f && typeof f.id === 'string').map((f) => [f.id, f]));
  const de = (f, vistos) => {
    if (!f) return undefined;
    if (typeof f.unidade === 'string' && f.unidade.trim()) return f.unidade.trim();
    const fonte = f.espelha?.forma ?? f.arranjoDe?.fonte;
    if (typeof fonte !== 'string' || vistos.has(f.id)) return undefined;
    vistos.add(f.id);
    return de(porId.get(fonte), vistos);
  };
  const saida = new Map();
  for (const f of porId.values()) { const u = de(f, new Set()); if (u !== undefined) saida.set(f.id, u); }
  return saida;
}

export const MOTIVO_DA_MESMA_UNIDADE = 'mesma unidade';

/* O padrão de `max` de um `atravessa` dentro da mesma unidade: a menor dimensão da menor das duas formas. */
const menorDimensao = (r) => Math.min(...[0, 1, 2].map((e) => r.max[e] - r.min[e]));

const arred = (x) => Math.round(x * 10) / 10;
const mmTxt = (x) => arred(x).toString().replace('.', ',');

/* Contrato de declaração: `atravessa` e `livre` são exceções e exigem `motivo` de
   pelo menos MINIMO_DO_MOTIVO caracteres; `atravessa` exige também `max` (mm), pois
   sem ele o par nunca reprova. `encosta` não é exceção e não exige nada. Só é
   chamada com o contato ligado. A mensagem diz o par, o campo e um exemplo. */
function exigirDeclaracao(p, onde, mesmaUnidade = false) {
  if (p.tipo === 'encosta' || mesmaUnidade) return;
  const par = p.junta ? `${p.a} ↔ ${p.b} (da ${p.junta})` : `${p.a} ↔ ${p.b}`;
  const exemplo = p.junta ? `{ "pecas": ["garfoE.*", "guidao"], "max": 15, "motivo": "a presilha do guidão abraça a coroa" }` : `{ "a": "${p.a}", "b": "${p.b}", "tipo": "${p.tipo}"${p.tipo === 'atravessa' ? ', "max": 15' : ''}, "motivo": "a presilha do guidão abraça a bengala" }`;
  const motivo = typeof p.motivo === 'string' ? p.motivo.trim() : '';
  if (motivo.length < MINIMO_DO_MOTIVO) {
    const falta = p.motivo === undefined ? 'falta o campo "motivo"' : `o "motivo" tem ${motivo.length} caractere${motivo.length === 1 ? '' : 's'} e o mínimo é ${MINIMO_DO_MOTIVO}`;
    throw new ErroDeEsboco(`${onde}: o par ${par} (tipo ${p.tipo}) precisa dizer por que a exceção existe: ${falta}. Exemplo: ${exemplo}`);
  }
  if (p.tipo === 'atravessa' && p.max === undefined) {
    throw new ErroDeEsboco(`${onde}: o par ${par} (tipo atravessa) precisa de "max", a penetração máxima em mm que a passagem justifica; sem ele o par nunca reprova. Exemplo: ${exemplo}`);
  }
}


/* Pontos de amostra de uma ponta: o centro e oito pontos na borda da seção (a 90% do raio), no plano perpendicular ao eixo. */
function amostrasDaPonta({ ponto, direcao, raio }) {
  const apoioDoEixo = Math.abs(direcao[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u0 = cross(direcao, apoioDoEixo);
  const u = escala(u0, 1 / Math.sqrt(norma2(u0)));
  const v = cross(direcao, u);
  const saida = [ponto];
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI * 2 * k) / 8;
    saida.push(somar(ponto, somar(escala(u, raio * 0.9 * Math.cos(a)), escala(v, raio * 0.9 * Math.sin(a)))));
  }
  return saida;
}

/* Pontas livres de uma opção: a ponta de tubo ou de haste (cilindro ou caixa com `de`/`para`) que não encosta em nenhuma outra
   forma (visível ou oculta, a menos da tolerância), e as pontas de três ou mais formas que terminam no mesmo ponto sem nenhuma
   outra forma que as una (um coletor). `ponta: true` na forma, ou `ponta: { inicio: true }` / `{ fim: true }`, declara a ponta
   livre de propósito. Duas pontas no mesmo ponto são uma emenda, e não pedem coletor. */
function achadosDePonta({ titulo, rs, pecas, ocultas, tol }) {
  const todas = [...pecas, ...ocultas.map(pecasDe)];
  if (todas.length < 2) return [];
  const pontas = [];
  rs.forEach((r, i) => { for (const p of pontasDe(r)) pontas.push({ ...p, i, livre: pontaDeclaradaLivre(r.forma, p.nome) }); });
  if (pontas.length === 0) return [];
  const caixas = todas.map(caixaDasPecas);
  const ids = [...rs.map((r) => r.id), ...ocultas.map((r) => r.id)];
  const doPonto = (p, j) => {
    const c = caixas[j];
    const fora = [0, 1, 2].reduce((acc, e) => acc + Math.max(c.min[e] - p[e], p[e] - c.max[e], 0) ** 2, 0);
    return Math.sqrt(fora) > tol ? Infinity : distanciaDoPonto(p, todas[j]);
  };
  for (const p of pontas) {
    p.toca = new Set();
    const pontosDeAmostra = amostrasDaPonta(p);
    for (let j = 0; j < todas.length; j++) {
      if (j !== p.i && pontosDeAmostra.some((q) => doPonto(q, j) <= tol)) p.toca.add(j);
    }
  }
  const achados = [];
  for (const p of pontas) {
    if (p.livre || p.toca.size > 0) continue;
    const mais = Math.min(...todas.map((_, j) => (j === p.i ? Infinity : distanciaDoPonto(p.ponto, todas[j]))));
    achados.push({ opcao: titulo, tipo: 'ponta-livre', pecas: [ids[p.i]], ponta: p.nome, ponto: p.ponto.map((x) => arred(x)), mm: arred(mais), sugestao: null });
  }
  for (const g of agruparPontos(pontas.map((p) => p.ponto), tol)) {
    const membros = g.itens.map((k) => pontas[k]);
    const donos = [...new Set(membros.map((p) => p.i))];
    if (donos.length < 3 || membros.some((p) => p.livre)) continue;
    const dono = new Set(donos);
    if ([...new Set(membros.flatMap((p) => [...p.toca]))].some((j) => !dono.has(j))) continue;
    achados.push({ opcao: titulo, tipo: 'pontas-sem-coletor', pecas: donos.map((i) => ids[i]), ponta: undefined, ponto: g.ponto.map((x) => arred(x)), mm: 0, sugestao: null });
  }
  return achados;
}

/* Limiares padrão, proporcionais à dimensão do conjunto: a maior aresta da caixa que
   envolve todas as formas visíveis de cada opção. */
export function padroesDoContato(resolvidas) {
  let dimensao = 0;
  for (const rs of resolvidas) {
    if (rs.length === 0) continue;
    for (let e = 0; e < 3; e++) dimensao = Math.max(dimensao, Math.max(...rs.map((r) => r.max[e])) - Math.min(...rs.map((r) => r.min[e])));
  }
  return { padraoTol: Math.max(1, dimensao * 0.01), padraoPen: Math.max(1, dimensao * 0.003), padraoFolga: dimensao * 0.1 };
}

/* Verifica o contato de todas as opções. Devolve
   { usar, tolerancia, penetracao, folga, achados, atravessamentos, silenciados, resultado, opcoes }.
   `tolerancia` é a folga máxima para ligar duas peças (e para `encosta`);
   `penetracao` é a sobreposição máxima aceita entre peças que não são `atravessa`.
   Pares `atravessa` não reprovam, mas cada sobreposição medida vai em
   `atravessamentos` (do maior para o menor) e, se o par declara `max`, passar dele
   é o achado `atravessa-excedido`. Pares `livre` continuam ignorados, mas cada um vai
   em `silenciados` com o motivo declarado. Com o contato ligado, `atravessa` e `livre`
   sem `motivo` (mínimo MINIMO_DO_MOTIVO caracteres) e `atravessa` sem `max` são
   recusados com ErroDeEsboco. Sem `contato` no JSON (ou com `usar` falso em
   todas as opções) devolve `resultado: 'desligado'` sem medir. */
export function verificarContato(bruto, { resolvidas: prontas, ocultas: prontasOcultas, unidades: planejadas } = {}) {
  const esboco = expandirEsboco(bruto);
  const raiz = lerContato(esboco?.contato, 'esboço');
  const opcoes = Array.isArray(esboco?.opcoes) ? esboco.opcoes : [];
  const lidas = opcoes.map((o, i) => lerContato(o.contato, `opção ${i + 1}`));
  const ativa = (i) => (lidas[i]?.usar ?? raiz?.usar) === true;
  const desligado = { usar: false, tolerancia: null, folga: null, achados: [], resultado: 'desligado', opcoes: [] };
  if (!opcoes.some((_, i) => ativa(i))) return desligado;

  const todasAsFormas = prontas ? null : opcoes.map((o, i) => resolverOpcao(o, `opção ${i + 1}${o.titulo ? ` (${o.titulo})` : ''}`, esboco?.pontos));
  const resolvidas = prontas ?? todasAsFormas.map((rs) => rs.filter((r) => r.forma.oculto !== true));
  const ocultasResolvidas = prontasOcultas ?? (todasAsFormas ? todasAsFormas.map((rs) => rs.filter((r) => r.forma.oculto === true)) : opcoes.map(() => []));
  const todosIds = new Set(resolvidas.flat().map((r) => r.id));
  /* uma forma oculta (a unidade isolada por --detalhar esconde as outras, e a instância pode vir com `oculto`) sai dos
     pares em silêncio; só o id que não existe em forma nenhuma é erro */
  const soOcultos = new Set(opcoes.flatMap((o) => (o?.formas ?? []).filter((f) => f && typeof f.id === 'string' && f.oculto === true).map((f) => f.id)).filter((id) => !todosIds.has(id)));
  const vale = (p) => !soOcultos.has(p.a) && !soOcultos.has(p.b);
  for (const [c, onde] of [[raiz, 'esboço'], ...lidas.map((l, i) => [l, `opção ${i + 1}`])]) {
    for (const p of c?.pares ?? []) for (const id of [p.a, p.b]) {
      if (!todosIds.has(id) && !soOcultos.has(id)) throw new ErroDeEsboco(`${onde}: contato.pares cita "${id}", que não é uma forma visível (ids: ${[...todosIds].join(', ')})`);
    }
  }
  /* a unidade de cada forma: a declarada (`unidade`) manda, e a planejada (o Plano de detalhe do Condutor, passada em
     `unidades`) vale para as outras. Um `atravessa` entre formas da mesma unidade passa sem motivo e sem max. */
  const plano = new Map(planejadas instanceof Map ? planejadas : Object.entries(planejadas ?? {}));
  const unidadeDe = opcoes.map((o) => { const m = new Map(plano); for (const [id, u] of unidadesDeclaradas(o?.formas)) m.set(id, u); return m; });
  const presentes = resolvidas.map((rs) => new Set(rs.map((r) => r.id)));
  const mesmaUnidade = (p, indices) => {
    let visto = false;
    for (const i of indices) {
      if (!presentes[i]?.has(p.a) || !presentes[i]?.has(p.b)) continue;
      const ua = unidadeDe[i].get(p.a);
      if (ua === undefined || ua !== unidadeDe[i].get(p.b)) return false;
      visto = true;
    }
    return visto;
  };
  const ativas = opcoes.map((_, i) => i).filter((i) => ativa(i));
  /* declaração das exceções: só vale com o contato ligado. Os pares da raiz valem em toda
     opção ativa; os da opção, só nela. */
  for (const p of (raiz?.pares ?? []).filter(vale)) exigirDeclaracao(p, 'esboço', p.tipo === 'atravessa' && mesmaUnidade(p, ativas));
  opcoes.forEach((_, i) => { if (ativa(i)) for (const p of (lidas[i]?.pares ?? []).filter(vale)) exigirDeclaracao(p, `opção ${i + 1}`, p.tipo === 'atravessa' && mesmaUnidade(p, [i])); });
  const { padraoTol, padraoPen, padraoFolga } = padroesDoContato(resolvidas);
  const tolRaiz = raiz?.tolerancia ?? padraoTol;
  const penRaiz = raiz?.penetracao ?? padraoPen;
  const folgaRaiz = raiz?.folga ?? padraoFolga;

  const achados = [];
  const atravessamentos = [];
  const silenciados = [];
  const implicitas = [];
  const resumo = [];
  opcoes.forEach((o, i) => {
    const titulo = o.titulo ?? `Opção ${i + 1}`;
    if (!ativa(i)) { resumo.push({ opcao: titulo, usar: false, resultado: 'desligado' }); return; }
    const tol = lidas[i]?.tolerancia ?? tolRaiz;
    const penMax = lidas[i]?.penetracao ?? penRaiz;
    const folgaMax = lidas[i]?.folga ?? folgaRaiz;
    const tipos = new Map();
    const chave = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
    const maximos = new Map();
    const motivos = new Map();
    const daUnidade = new Map();
    const paresDaOpcao = herdarDoEspelho([...paresImplicitos(o, tol), ...(raiz?.pares ?? []), ...(lidas[i]?.pares ?? [])], o);
    const atravessaComOculta = new Set(paresDaOpcao.filter((p) => p.tipo === 'atravessa' && !vale(p)).map((p) => chave(p.a, p.b)));
    for (const p of paresDaOpcao.filter(vale)) {
      tipos.set(chave(p.a, p.b), p.tipo);
      maximos.set(chave(p.a, p.b), p.max);
      motivos.set(chave(p.a, p.b), p.motivo?.trim());
      /* `atravessa` dentro da unidade, sem motivo ou sem max: o motivo é "mesma unidade" e o max é implícito */
      if (p.tipo === 'atravessa' && mesmaUnidade(p, [i])) {
        const semMotivo = (p.motivo?.trim().length ?? 0) < MINIMO_DO_MOTIVO;
        if (semMotivo || p.max === undefined) daUnidade.set(chave(p.a, p.b), { unidade: unidadeDe[i].get(p.a), maxImplicito: p.max === undefined });
      }
    }
    const rs = resolvidas[i];
    const pecas = rs.map(pecasDe);
    const n = rs.length;
    const conserto = criarConserto(o.formas ?? [], rs);
    /* margem da colisão: metade da penetração aceita, no mínimo 1 mm, sem passar de 90% da tolerância
       (uma folga maior que a tolerância desligaria as duas formas e trocaria a colisão por `voando`) */
    const margem = Math.min(Math.max(1, penMax / 2), tol * 0.9);
    const achadosDaOpcao = [];
    const atravessamentosDaOpcao = [];
    const silenciadosDaOpcao = [];
    const ligados = Array.from({ length: n }, () => []);
    const menorFolga = Array(n).fill(Infinity);
    const folgas = Array.from({ length: n }, () => Array(n).fill(Infinity));
    /* forma `a` (índice) até a metade da tolerância da forma `b` (índice), pelo segmento dos pontos mais próximos */
    const sugerirAproximacao = (a, b, motivo) => {
      if (b < 0 || !Number.isFinite(folgas[a][b]) || folgas[a][b] - tol / 2 <= 0) return null;
      const d = detalharPar(pecas[a], pecas[b]);
      return d.aproxima ? conserto.forma(rs[a].id, d.aproxima, folgas[a][b] - tol / 2, motivo) : null;
    };
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const tipo = tipos.get(chave(rs[a].id, rs[b].id));
      if (tipo === 'livre') {
        silenciadosDaOpcao.push({ opcao: titulo, a: rs[a].id, b: rs[b].id, motivo: motivos.get(chave(rs[a].id, rs[b].id)) });
        continue;
      }
      const { folga, penetracao } = medirPar(pecas[a], pecas[b]);
      folgas[a][b] = folgas[b][a] = folga;
      if (folga < menorFolga[a]) menorFolga[a] = folga;
      if (folga < menorFolga[b]) menorFolga[b] = folga;
      if (tipo === 'atravessa' || folga <= tol) { ligados[a].push(b); ligados[b].push(a); }
      const par = [rs[a].id, rs[b].id];
      if (tipo === 'encosta') {
        if (folga > tol) {
          const d = detalharPar(pecas[a], pecas[b]);
          achadosDaOpcao.push({ opcao: titulo, tipo: 'par-nao-encosta', pecas: par, mm: arred(folga), detalhe: 'folga', sugestao: d.aproxima ? conserto.par(par[0], par[1], d.aproxima, folga, `o par devia encostar e há ${mmTxt(folga)} mm de folga`) : null });
        } else if (penetracao > penMax) {
          const d = detalharPar(pecas[a], pecas[b]);
          achadosDaOpcao.push({ opcao: titulo, tipo: 'par-nao-encosta', pecas: par, mm: arred(penetracao), detalhe: 'penetracao', sugestao: d.separa ? conserto.par(par[0], par[1], d.separa, penetracao, `o par devia encostar e se penetra ${mmTxt(penetracao)} mm`) : null });
        }
      } else if (tipo === 'atravessa') {
        const implicito = daUnidade.get(chave(rs[a].id, rs[b].id));
        const max = maximos.get(chave(rs[a].id, rs[b].id)) ?? (implicito ? Math.min(menorDimensao(rs[a]), menorDimensao(rs[b])) : undefined);
        if (implicito) implicitas.push({ opcao: titulo, a: par[0], b: par[1], unidade: implicito.unidade, motivo: MOTIVO_DA_MESMA_UNIDADE, penetracao_mm: arred(penetracao), max_mm: arred(max), maxImplicito: implicito.maxImplicito });
        if (arred(penetracao) > 0) {
          atravessamentosDaOpcao.push({ opcao: titulo, a: par[0], b: par[1], penetracao_mm: arred(penetracao), ...(max === undefined ? {} : { max_mm: arred(max) }), ...(implicito ? { implicita: true } : {}) });
        }
        if (max !== undefined && penetracao > max) {
          const d = detalharPar(pecas[a], pecas[b]);
          const sobra = penetracao - max + 0.1;
          achadosDaOpcao.push({ opcao: titulo, tipo: 'atravessa-excedido', pecas: par, mm: arred(penetracao), max: arred(max), ...(implicito ? { implicita: true, maxSugerido: Math.floor(penetracao) + 1 } : {}), sugestao: d.separa ? conserto.par(par[0], par[1], d.separa, sobra, `a travessia de ${mmTxt(penetracao)} mm passa ${mmTxt(penetracao - max)} mm do máximo de ${mmTxt(max)} mm; mais 0,1 mm de folga de arredondamento`) : null });
        }
      } else if (penetracao > penMax) {
        const d = detalharPar(pecas[a], pecas[b]);
        achadosDaOpcao.push({ opcao: titulo, tipo: 'colisao', pecas: par, mm: arred(penetracao), sugestao: d.separa ? conserto.par(par[0], par[1], d.separa, penetracao + margem, `penetração de ${mmTxt(penetracao)} mm mais margem de ${mmTxt(margem)} mm`) : null });
      }
    }
    /* a forma ligada só por uma oculta (a unidade isolada) não é solta nem longe: o mestre a liga */
    const ocultasDaOpcao = ocultasResolvidas[i] ?? [];
    if (ocultasDaOpcao.length > 0 && n > 1 && (contarGrupos(ligados) > 1 || menorFolga.some((f) => f !== Infinity && f > folgaMax))) {
      completarPelasOcultas({ visiveis: pecas, ocultas: ocultasDaOpcao.map(pecasDe), ligados, menorFolga, tol, alcance: Math.max(tol, folgaMax), declarado: (a, h) => atravessaComOculta.has(chave(rs[a].id, ocultasDaOpcao[h].id)) });
    }
    for (let a = 0; a < n; a++) {
      if (n > 1 && menorFolga[a] !== Infinity && menorFolga[a] > folgaMax) {
        achadosDaOpcao.push({ opcao: titulo, tipo: 'longe', pecas: [rs[a].id], mm: arred(menorFolga[a]), sugestao: sugerirAproximacao(a, folgas[a].indexOf(menorFolga[a]), `a peça mais próxima está a ${mmTxt(menorFolga[a])} mm; a folga vai a metade da tolerância (${mmTxt(tol / 2)} mm)`) });
      }
    }
    /* grupos conectados; o maior (empate: o que contém a primeira forma) é o principal */
    const grupo = Array(n).fill(-1); const grupos = [];
    for (let a = 0; a < n; a++) {
      if (grupo[a] >= 0) continue;
      const fila = [a]; grupo[a] = grupos.length; const membros = [];
      while (fila.length) { const x = fila.pop(); membros.push(x); for (const y of ligados[x]) if (grupo[y] < 0) { grupo[y] = grupos.length; fila.push(y); } }
      grupos.push(membros);
    }
    const principal = grupos.reduce((m, g) => (g.length > m.length ? g : m), grupos[0] ?? []);
    for (let a = 0; a < n; a++) {
      if (principal.includes(a)) continue;
      let ate = Infinity;
      for (const b of principal) {
        if (tipos.get(chave(rs[a].id, rs[b].id)) === 'livre') continue;
        ate = Math.min(ate, folgas[a][b]);
      }
      const vizinho = principal.filter((b) => tipos.get(chave(rs[a].id, rs[b].id)) !== 'livre' && folgas[a][b] === ate)[0];
      achadosDaOpcao.push({ opcao: titulo, tipo: 'voando', pecas: [rs[a].id], mm: Number.isFinite(ate) ? arred(ate) : null, sugestao: vizinho === undefined ? null : sugerirAproximacao(a, vizinho, `a peça fica a ${mmTxt(ate)} mm de ${rs[vizinho].id}, do grupo conectado; a folga vai a metade da tolerância (${mmTxt(tol / 2)} mm)`) });
    }
    achadosDaOpcao.push(...achadosDePonta({ titulo, rs, pecas, ocultas: ocultasDaOpcao, tol }));
    achados.push(...achadosDaOpcao);
    atravessamentos.push(...atravessamentosDaOpcao);
    silenciados.push(...silenciadosDaOpcao);
    resumo.push({ opcao: titulo, usar: true, tolerancia: arred(tol), penetracao: arred(penMax), folga: arred(folgaMax), resultado: achadosDaOpcao.length ? 'reprovado' : 'aprovado' });
  });
  atravessamentos.sort((x, y) => y.penetracao_mm - x.penetracao_mm);
  return {
    usar: true, tolerancia: arred(tolRaiz), penetracao: arred(penRaiz), folga: arred(folgaRaiz), achados, atravessamentos, silenciados, ...(implicitas.length ? { implicitas } : {}), resultado: achados.length ? 'reprovado' : 'aprovado', opcoes: resumo,
  };
}

const NOMES = { colisao: 'colisão', longe: 'longe', voando: 'voando', 'par-nao-encosta': 'par não encosta', 'atravessa-excedido': 'atravessa excedido', 'ponta-livre': 'ponta livre', 'pontas-sem-coletor': 'pontas sem coletor' };
const mm = (x) => x.toFixed(1).replace('.', ',');

/* Linha legível de um achado. */
export function descreverAchado(a) {
  const p = a.pecas;
  const base = `[${a.opcao}] ${NOMES[a.tipo]}: `;
  if (a.tipo === 'colisao') return `${base}${p[0]} e ${p[1]} se penetram ${mm(a.mm)} mm`;
  if (a.tipo === 'ponta-livre') return `${base}${p[0]} tem a ponta ${a.ponta} em [${a.ponto.map(mmTxt).join(' ')}] sem encostar em nada (a forma mais próxima fica a ${mm(a.mm)} mm); encoste-a em outra forma ou declare "ponta": true${a.ponta === 'inicio' || a.ponta === 'fim' ? ` (ou "ponta": { "${a.ponta}": true })` : ''} se ela termina no ar de propósito`;
  if (a.tipo === 'pontas-sem-coletor') return `${base}${p.length} pontas (${p.join(', ')}) terminam no mesmo ponto [${a.ponto.map(mmTxt).join(' ')}] e nenhuma forma as une; ponha ali uma forma que as una (um coletor, com o atravessamento declarado) ou declare "ponta": true em uma delas se o encontro é de propósito`;
  if (a.tipo === 'atravessa-excedido') return `${base}${p[0]} e ${p[1]} se atravessam ${mm(a.mm)} mm, acima do máximo ${a.implicita ? `implícito (mesma unidade: a menor dimensão da menor das duas formas)` : 'declarado'} de ${mm(a.max)} mm${a.implicita ? `; se a travessia é intencional basta declarar "max" (sugestão: ${a.maxSugerido ?? Math.floor(a.mm) + 1}) em contato.juntas ou em contato.pares para este par, por exemplo { "a": "${p[0]}", "b": "${p[1]}", "tipo": "atravessa", "max": ${a.maxSugerido ?? Math.floor(a.mm) + 1} } (dentro da unidade não pede "motivo")` : ''}`;
  if (a.tipo === 'longe') return `${base}${p[0]} fica a ${mm(a.mm)} mm da peça mais próxima`;
  if (a.tipo === 'voando') return `${base}${p[0]} fora do grupo conectado${a.mm === null ? '' : `, a ${mm(a.mm)} mm dele`}`;
  return `${base}${p[0]} e ${p[1]} deviam encostar, ${a.detalhe === 'penetracao' ? `mas se penetram ${mm(a.mm)} mm` : `mas há ${mm(a.mm)} mm de folga`}`;
}

/* Linha legível de um atravessamento declarado. */
export function descreverAtravessamento(t) {
  return `[${t.opcao}] ${t.a} e ${t.b} se atravessam ${mm(t.penetracao_mm)} mm${t.max_mm === undefined ? '' : ` (máximo ${t.implicita ? 'implícito, mesma unidade,' : 'declarado'} ${mm(t.max_mm)} mm)`}`;
}

/* Linha legível de um par silenciado (`livre`). */
export function descreverSilenciado(t) {
  return `[${t.opcao}] ${t.a} e ${t.b} ignorados (livre): ${t.motivo}`;
}
