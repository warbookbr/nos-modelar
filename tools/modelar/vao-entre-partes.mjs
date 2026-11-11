#!/usr/bin/env node
/* vao-entre-partes.mjs — o vão e o degrau entre partes vizinhas, medidos sobre a malha, e a lista das partes soltas.
 *
 * FICHA vaoEntrePartes
 * serve: medir, em mm e sobre a malha, o vão (a distância de uma borda à borda da outra ao longo da linha comum) e o degrau (o desnível
 *   entre as duas superfícies de fora junto da linha) de cada par de partes vizinhas, e listar a parte que não encosta em nenhuma outra.
 * quando: painéis de chapa separados por vão de projeto (lataria, portas, tampas), onde o relato de contatos só dá a distância entre
 *   caixas; para o contato entre sólidos use o relato do `esboco:nucleo`, e para o quanto uma parte sai de outra numa vista, `sobra:partes`.
 * unidades: as faces entram em mm, `{ pts: [[x, y, z], ...], parte: "<nome>" }`; tudo sai em mm. Ponto de aresta é amostrado a cada passo.
 * campos:
 *   esperado: o vão de projeto, em mm; o par de folga fora de esperado ± tolerancia entra em `fora` com o ponto.
 *   tolerancia: mm em volta do esperado (0,2 por padrão).
 *   degrau: o desnível máximo aceito, em mm; o par que passa dele entra em `fora`.
 *   vizinho: a distância máxima, em mm, em que duas partes são vizinhas (3 vezes o esperado, ou 15).
 *   passo: o espaçamento das amostras ao longo das arestas vivas, em mm (2).
 *   lado: 'fora' (o padrão) mede só a borda da face que olha para longe do centro do modelo; 'todos' mede as duas faces de cada chapa.
 *   toque: até quantos mm duas partes se tocam, e um par assim sai como `toca`, sem vão (0,05).
 *   pares: [[a, b], ...] mede só esses pares, vizinhos ou não.
 *   partes: prefixos ou nomes; só os pares entre partes do subconjunto saem.
 *   folgas: { "a|b": { esperada, tolerancia } } o esperado de cada par, que vale no lugar do geral.
 *   apoia: { parte: motivo } a parte solta de propósito, que não conta em `soltas`.
 * exemplo:
 *   vaoEntrePartes([{ pts: [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]], parte: 'a' }, { pts: [[14, 0, 0], [24, 0, 0], [24, 10, 0], [14, 10, 0]], parte: 'b' }], { esperado: 4 }).pares[0].vao.min === 4
 * peça: procedural/pecas/sedan-chassi-e-lataria/referencias/sedan-chassi-e-lataria.esboco.mjs
 * FIM DA FICHA
 *
 * POR QUE ELE EXISTE. No sedã em painéis (2026-11-11, ATRITOS itens 5, 18 e 19) o relato de contatos listou 183 pares em folga, 117
 * sem número, e nos com número deu a distância entre caixas (2,0 mm onde as bordas estão a 5,3 mm); não avisou as 13 partes que não
 * encostam em nada. Quem fez o rascunho mediu o vão com um script próprio, fora do repositório. Este é o script, com o degrau.
 *
 * COMO MEDE. As arestas vivas de cada parte (as de ângulo entre faces acima de ANGULO_VIVO_GRAUS e as de borda aberta) são amostradas
 * a cada `passo` mm. Para cada amostra de uma parte acha-se, dentro de `vizinho`, a aresta viva da outra que olha para o mesmo lado
 * (a borda da face de fora com a borda da face de fora), e o ponto exato dela mais perto da amostra. O vão é a distância entre os dois
 * no plano da face de fora da outra, e o ponto é o meio do segmento. A medida só vale quando a volta fecha, isto é, quando a aresta da
 * outra parte também tem essa amostra como a mais próxima (a borda de uma chapa em frente à da outra, e não a quina de uma que olha a
 * ponta da outra). Numa chapa inclinada cortada com parede paralela ao eixo e não normal à chapa, o vão ao longo dela passa do que a
 * parede mostra: é esse que sai. O comprimento da linha comum é a soma dos passos das amostras que valem, dividida pela quantidade
 * de linhas paralelas em volta de cada uma (uma chapa tem uma aresta viva em cada face de fora). O degrau é, em cada amostra, a
 * distância dela ao plano da face de fora da outra parte, que passa pelo ponto da aresta que mediu o vão.
 *
 * PARTE SOLTA é a que, em toda outra parte, fica a mais de `toque` mm da superfície e não a atravessa por aresta nenhuma. A parte
 * mais próxima e a distância saem de vértices e amostras de aresta, e por isso a distância vale até o passo. A parte contida inteira
 * dentro de outra, sem tocar a superfície, também sai solta.
 *
 * O LIMITE. O número informa onde olhar; quem aprova forma é a pessoa. Superfície arredondada, sem aresta viva, não dá amostra. A
 * montagem (`mecanifica.montagem`) fica fora: a entrada é um esboço, uma receita ou uma lista de faces.
 *
 * Uso: npm run vao:partes -- <esboço|receita> [--opcao=1] [--esperado=4] [--tolerancia=0.2] [--degrau=1] [--par=a:b]...
 *        [--partes=porta,teto] [--vizinho=15] [--passo=2] [--toque=0.05] [--soltas=recusar] [--apoia=parte:motivo]... [--linhas=40] [--json]
 * Sai 0 sem par fora da faixa, 1 com par fora da faixa ou, em `--soltas=recusar`, com parte solta, e 2 em argumento ruim. */
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PASSO_MM = 2;
export const TOQUE_MM = 0.05;
export const TOLERANCIA_MM = 0.2;
export const VIZINHO_PADRAO_MM = 15;
export const ANGULO_VIVO_GRAUS = 30;
const FOLGA_DE_VIZINHO = 3;

export class ErroDoVao extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroDoVao'; }
}

/* --- álgebra ------------------------------------------------------------------------------------------------------------------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const comp = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const n = comp(a); return n < 1e-12 ? [0, 0, 0] : [a[0] / n, a[1] / n, a[2] / n]; };
const meio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const mais = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

/** O ponto do triângulo (a, b, c) mais perto de p (Ericson, Real-Time Collision Detection). */
function pontoNoTriangulo(p, a, b, c) {
  const ab = sub(b, a); const ac = sub(c, a); const ap = sub(p, a);
  const d1 = dot(ab, ap); const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b); const d3 = dot(ab, bp); const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return mais(a, ab, d1 / (d1 - d3));
  const cp = sub(p, c); const d5 = dot(ab, cp); const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return mais(a, ac, d2 / (d2 - d6));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return mais(b, sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6)));
  const k = 1 / (va + vb + vc);
  return mais(mais(a, ab, vb * k), ac, vc * k);
}

const distCaixa2 = (p, b) => {
  let s = 0;
  for (let k = 0; k < 3; k += 1) { const d = p[k] < b[k] ? b[k] - p[k] : p[k] > b[k + 3] ? p[k] - b[k + 3] : 0; s += d * d; }
  return s;
};
/** A distância entre duas caixas `[x0, y0, z0, x1, y1, z1]`; zero quando se sobrepõem. */
export const folgaDeCaixas = (a, b) => {
  let s = 0;
  for (let k = 0; k < 3; k += 1) { const d = Math.max(a[k] - b[k + 3], b[k] - a[k + 3], 0); s += d * d; }
  return Math.sqrt(s);
};

/* --- a parte: malha soldada, arestas, amostras e árvore de caixas --------------------------------------------------------------- */
function construirArvore(tri, n) {
  const ord = Array.from({ length: n }, (_, i) => i);
  const centro = (i, k) => (tri[i * 9 + k] + tri[i * 9 + 3 + k] + tri[i * 9 + 6 + k]) / 3;
  const nos = [];
  const rec = (i0, i1) => {
    const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let t = i0; t < i1; t += 1) for (let v = 0; v < 3; v += 1) for (let k = 0; k < 3; k += 1) {
      const x = tri[ord[t] * 9 + v * 3 + k];
      if (x < b[k]) b[k] = x; if (x > b[k + 3]) b[k + 3] = x;
    }
    const no = { b, l: -1, r: -1, i0, i1 }; const id = nos.length; nos.push(no);
    if (i1 - i0 > 4) {
      let eixo = 0; let maior = -1;
      for (let k = 0; k < 3; k += 1) { const e = b[k + 3] - b[k]; if (e > maior) { maior = e; eixo = k; } }
      const fatia = ord.slice(i0, i1).sort((x, y) => centro(x, eixo) - centro(y, eixo));
      for (let t = 0; t < fatia.length; t += 1) ord[i0 + t] = fatia[t];
      const m = (i0 + i1) >> 1;
      no.l = rec(i0, m); no.r = rec(m, i1);
    }
    return id;
  };
  rec(0, n);
  return { nos, ord };
}

const ponto3 = (tri, t, v) => [tri[t * 9 + v * 3], tri[t * 9 + v * 3 + 1], tri[t * 9 + v * 3 + 2]];

/** O ponto da superfície da parte mais perto de p, com a distância, se ficar a até `limite` mm; senão `null`. */
export function maisProximo(parte, p, limite = Infinity) {
  let melhor = limite * limite; let q = null;
  const { nos, ord } = parte.arvore; const pilha = [0];
  while (pilha.length) {
    const no = nos[pilha.pop()];
    if (distCaixa2(p, no.b) > melhor) continue;
    if (no.l < 0) {
      for (let t = no.i0; t < no.i1; t += 1) {
        const i = ord[t];
        const c = pontoNoTriangulo(p, ponto3(parte.tri, i, 0), ponto3(parte.tri, i, 1), ponto3(parte.tri, i, 2));
        const d = sub(p, c); const d2 = dot(d, d);
        if (d2 <= melhor) { melhor = d2; q = c; }
      }
    } else {
      const el = distCaixa2(p, nos[no.l].b); const er = distCaixa2(p, nos[no.r].b);
      if (el < er) { pilha.push(no.r, no.l); } else { pilha.push(no.l, no.r); }
    }
  }
  return q ? { d: Math.sqrt(melhor), q } : null;
}

/** Se o segmento p0 p1 atravessa a superfície da parte (interior do segmento, fora das pontas). */
export function segmentoAtravessa(parte, p0, p1) {
  const dir = sub(p1, p0); const { nos, ord } = parte.arvore; const pilha = [0];
  const eps = 1e-9;
  while (pilha.length) {
    const no = nos[pilha.pop()];
    let t0 = 0; let t1 = 1; let fora = false;
    for (let k = 0; k < 3 && !fora; k += 1) {
      if (Math.abs(dir[k]) < 1e-12) { if (p0[k] < no.b[k] - 1e-6 || p0[k] > no.b[k + 3] + 1e-6) fora = true; } else {
        let a = (no.b[k] - 1e-6 - p0[k]) / dir[k]; let b = (no.b[k + 3] + 1e-6 - p0[k]) / dir[k];
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        if (t0 > t1) fora = true;
      }
    }
    if (fora) continue;
    if (no.l >= 0) { pilha.push(no.l, no.r); continue; }
    for (let t = no.i0; t < no.i1; t += 1) {
      const i = ord[t]; const a = ponto3(parte.tri, i, 0); const e1 = sub(ponto3(parte.tri, i, 1), a); const e2 = sub(ponto3(parte.tri, i, 2), a);
      const h = cruz(dir, e2); const det = dot(e1, h);
      if (Math.abs(det) < 1e-12) continue;
      const f = 1 / det; const s = sub(p0, a); const u = f * dot(s, h);
      if (u < -eps || u > 1 + eps) continue;
      const qv = cruz(s, e1); const v = f * dot(dir, qv);
      if (v < -eps || u + v > 1 + eps) continue;
      const tt = f * dot(e2, qv);
      if (tt > 1e-6 && tt < 1 - 1e-6) return true;
    }
  }
  return false;
}

/* A triangulação de um polígono plano, côncavo ou não, por corte de orelhas no plano dele: [[i, j, k], ...] sobre os índices dos pontos. */
function triangularPoligono(pts, n) {
  const m = pts.length;
  if (m === 3) return [[0, 1, 2]];
  const ax = n.map(Math.abs); const d = ax[0] >= ax[1] && ax[0] >= ax[2] ? 0 : ax[1] >= ax[2] ? 1 : 2;
  const [i, j] = d === 0 ? [1, 2] : d === 1 ? [2, 0] : [0, 1];
  const P = pts.map((p) => [p[i], p[j]]);
  let area = 0;
  for (let k = 0; k < m; k += 1) area += P[k][0] * P[(k + 1) % m][1] - P[(k + 1) % m][0] * P[k][1];
  const sg = area >= 0 ? 1 : -1;
  const lado = (a, b, c) => ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) * sg;
  const idx = [...Array(m).keys()]; const out = [];
  while (idx.length > 3) {
    let cortou = false;
    for (let k = 0; k < idx.length && !cortou; k += 1) {
      const a = idx[(k + idx.length - 1) % idx.length]; const b = idx[k]; const c = idx[(k + 1) % idx.length];
      if (lado(P[a], P[b], P[c]) <= 1e-9) continue;
      const dentro = idx.some((q) => q !== a && q !== b && q !== c && lado(P[a], P[b], P[q]) > 1e-9 && lado(P[b], P[c], P[q]) > 1e-9 && lado(P[c], P[a], P[q]) > 1e-9);
      if (dentro) continue;
      out.push([a, b, c]); idx.splice(k, 1); cortou = true;
    }
    if (!cortou) { out.push([idx[idx.length - 1], idx[0], idx[1]]); idx.shift(); }
  }
  out.push([idx[0], idx[1], idx[2]]);
  return out;
}

const chaveDoVertice = (p) => `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)},${Math.round(p[2] * 1000)}`;

/**
 * A parte pronta para medir. `faces` são as dela, `{ pts }` em mm.
 * @returns {{ nome, caixa, tri, nTri, arvore, vertices, arestas, amostras, fechada }}
 */
export function prepararParte(nome, faces, { passo = PASSO_MM, angulo = ANGULO_VIVO_GRAUS } = {}) {
  const indice = new Map(); const verts = [];
  const poligonos = [];
  for (const f of faces) {
    const ids = [];
    for (const p of f.pts) {
      const k = chaveDoVertice(p);
      if (!indice.has(k)) { indice.set(k, verts.length); verts.push([...p]); }
      const id = indice.get(k);
      if (ids[ids.length - 1] !== id) ids.push(id);
    }
    if (ids.length > 1 && ids[0] === ids[ids.length - 1]) ids.pop();
    if (ids.length < 3) continue;
    let n = [0, 0, 0];
    for (let i = 0; i < ids.length; i += 1) n = mais(n, cruz(verts[ids[i]], verts[ids[(i + 1) % ids.length]]), 1);
    if (comp(n) < 1e-9) continue;
    poligonos.push({ ids, n: unit(n) });
  }
  const arestasDe = new Map();
  poligonos.forEach((pol, fi) => {
    for (let i = 0; i < pol.ids.length; i += 1) {
      const a = pol.ids[i]; const b = pol.ids[(i + 1) % pol.ids.length];
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (!arestasDe.has(k)) arestasDe.set(k, { a: Math.min(a, b), b: Math.max(a, b), faces: [] });
      arestasDe.get(k).faces.push(fi);
    }
  });
  const fechada = poligonos.length > 0 && [...arestasDe.values()].every((e) => e.faces.length === 2);
  if (fechada) {
    let vol = 0;
    for (const pol of poligonos) for (let i = 1; i + 1 < pol.ids.length; i += 1) vol += dot(verts[pol.ids[0]], cruz(verts[pol.ids[i]], verts[pol.ids[i + 1]])) / 6;
    if (vol < 0) for (const pol of poligonos) pol.n = [-pol.n[0], -pol.n[1], -pol.n[2]];
  }
  const triangulos = [];
  for (const pol of poligonos) for (const [a, b, c] of triangularPoligono(pol.ids.map((k) => verts[k]), pol.n)) triangulos.push(verts[pol.ids[a]], verts[pol.ids[b]], verts[pol.ids[c]]);
  const nTri = triangulos.length / 3;
  const tri = new Float64Array(nTri * 9);
  triangulos.forEach((p, i) => { tri[i * 3] = p[0]; tri[i * 3 + 1] = p[1]; tri[i * 3 + 2] = p[2]; });
  const caixa = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const p of verts) for (let k = 0; k < 3; k += 1) { if (p[k] < caixa[k]) caixa[k] = p[k]; if (p[k] > caixa[k + 3]) caixa[k + 3] = p[k]; }
  const cosVivo = Math.cos((angulo * Math.PI) / 180);
  const arestas = []; const amostras = [];
  for (const e of arestasDe.values()) {
    arestas.push([verts[e.a], verts[e.b]]);
    const n1 = poligonos[e.faces[0]].n; const n2 = e.faces.length >= 2 ? poligonos[e.faces[1]].n : null;
    if (e.faces.length === 2 && dot(n1, n2) >= cosVivo) continue;
    const pa = verts[e.a]; const pb = verts[e.b]; const len = comp(sub(pb, pa));
    const n = Math.max(1, Math.ceil(len / passo));
    for (let k = 0; k < n; k += 1) amostras.push({ p: mais(pa, sub(pb, pa), (k + 0.5) / n), n1, n2, ds: len / n, a: pa, b: pb });
  }
  return { nome, caixa: nTri ? caixa : [0, 0, 0, 0, 0, 0], tri, nTri, arvore: nTri ? construirArvore(tri, nTri) : { nos: [{ b: [0, 0, 0, 0, 0, 0], l: -1, r: -1, i0: 0, i1: 0 }], ord: [] }, vertices: verts, arestas, amostras, fechada, grade: null };
}

/* a grade de amostras da parte, para achar a aresta viva mais próxima que olha para o mesmo lado */
function gradeDe(parte, celula) {
  if (parte.grade?.celula === celula) return parte.grade;
  const mapa = new Map();
  for (const s of parte.amostras) {
    const k = `${Math.floor(s.p[0] / celula)},${Math.floor(s.p[1] / celula)},${Math.floor(s.p[2] / celula)}`;
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(s);
  }
  parte.grade = { celula, mapa };
  return parte.grade;
}
function vizinhasNaGrade(grade, p, raio, fn) {
  const c = grade.celula; const r = Math.ceil(raio / c);
  const [ix, iy, iz] = [Math.floor(p[0] / c), Math.floor(p[1] / c), Math.floor(p[2] / c)];
  for (let x = ix - r; x <= ix + r; x += 1) for (let y = iy - r; y <= iy + r; y += 1) for (let z = iz - r; z <= iz + r; z += 1) {
    const l = grade.mapa.get(`${x},${y},${z}`);
    if (l) for (const s of l) fn(s);
  }
}

/* --- estatística ------------------------------------------------------------------------------------------------------------- */
const mediana = (v) => { const n = v.length; return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2; };
const percentil = (v, q) => v[Math.min(v.length - 1, Math.floor(q * v.length))];
const arred = (x, c = 3) => Number(x.toFixed(c));
const pt = (p) => p.map((x) => arred(x, 1));

/* O comprimento da linha comum: a soma dos passos dividida pela quantidade de linhas paralelas. As linhas se contam pelas amostras em
   volta de cada uma, num raio R (uma linha dá 2R/passo, k linhas dão k vezes isso), e vale o terceiro quartil, que as pontas não puxam. */
function comprimentoDaLinha(valem, raio) {
  const g = { celula: raio, mapa: new Map() };
  for (const s of valem) {
    const k = `${Math.floor(s.p[0] / raio)},${Math.floor(s.p[1] / raio)},${Math.floor(s.p[2] / raio)}`;
    if (!g.mapa.has(k)) g.mapa.set(k, []);
    g.mapa.get(k).push(s);
  }
  const k = [];
  let soma = 0;
  for (const s of valem) {
    let n = 0;
    vizinhasNaGrade(g, s.p, raio, (o) => { if (comp(sub(o.p, s.p)) <= raio) n += 1; });
    k.push((n * s.ds) / (2 * raio)); soma += s.ds;
  }
  k.sort((x, y) => x - y);
  const linhas = Math.max(1, Math.round(percentil(k, 0.75)));
  const total = soma / linhas;
  return total;
}

/* --- o par --------------------------------------------------------------------------------------------------------------------- */
const dentroDaCaixa = (p, c, folga) => distCaixa2(p, c) <= folga * folga;

/** Se as duas partes se tocam (a até `toque` mm) ou se uma aresta de uma atravessa a outra. Devolve `'atravessa'`, `'toca'` ou `null`. */
export function contatoEntre(A, B, toque = TOQUE_MM) {
  if (folgaDeCaixas(A.caixa, B.caixa) > toque) return null;
  let toca = false;
  for (const [X, Y] of [[A, B], [B, A]]) {
    for (const p of X.vertices) if (dentroDaCaixa(p, Y.caixa, toque) && maisProximo(Y, p, toque)) { toca = true; break; }
    if (!toca) for (const s of X.amostras) if (dentroDaCaixa(s.p, Y.caixa, toque) && maisProximo(Y, s.p, toque)) { toca = true; break; }
  }
  if (folgaDeCaixas(A.caixa, B.caixa) <= 0) {
    for (const [X, Y] of [[A, B], [B, A]]) for (const [p0, p1] of X.arestas) if (segmentoAtravessa(Y, p0, p1)) return 'atravessa';
  }
  return toca ? 'toca' : null;
}

/** A menor distância entre as superfícies de duas partes, por vértices e amostras de aresta; `limite` corta a busca. */
export function distanciaEntre(A, B, limite = Infinity) {
  let melhor = limite; let onde = null;
  for (const [X, Y] of [[A, B], [B, A]]) {
    for (const p of [...X.vertices, ...X.amostras.map((s) => s.p)]) {
      if (distCaixa2(p, Y.caixa) > melhor * melhor) continue;
      const r = maisProximo(Y, p, melhor);
      if (r && r.d <= melhor) { melhor = r.d; onde = meio(p, r.q); }
    }
  }
  return onde ? { d: melhor, em: onde } : null;
}

/* o ponto do segmento a b mais perto de p */
function pontoNoSegmento(p, a, b) {
  const ab = sub(b, a); const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / Math.max(dot(ab, ab), 1e-18)));
  return mais(a, ab, t);
}

/* a normal da aresta que olha para o mesmo lado que `nX`: a de maior cosseno, e só vale acima de 0,7; sem sinal quando uma das
   duas arestas tem uma face só (a chapa sem espessura não diz qual é o lado de fora) */
function normalDoMesmoLado(nX, assinada, o) {
  let melhor = null; let mc = 0.7;
  for (const nY of [o.n1, o.n2]) {
    if (!nY) continue;
    const c = assinada && o.n2 ? dot(nX, nY) : Math.abs(dot(nX, nY));
    if (c > mc) { mc = c; melhor = nY; }
  }
  return melhor;
}

/* o ponto de aresta viva de Y mais perto de p, entre as que olham para o lado de `nX`, a até `raio`: { e, nY, d } */
function arestaDoMesmoLado(Y, p, nX, assinada, raio, celula) {
  let melhor = null; let md = raio;
  vizinhasNaGrade(gradeDe(Y, celula), p, raio, (o) => {
    const nY = normalDoMesmoLado(nX, assinada, o);
    if (!nY) return;
    const e = pontoNoSegmento(p, o.a, o.b); const d = comp(sub(e, p));
    if (d <= md) { md = d; melhor = { e, nY, d }; }
  });
  return melhor;
}

/**
 * Mede o vão e o degrau entre duas partes. A amostra é um ponto de aresta viva de uma parte; o vão dela é a distância, no plano da
 * face de fora da outra, ao ponto da aresta viva da outra que olha para o mesmo lado, e o degrau é o desnível entre esses dois
 * planos. Só valem as amostras de volta fechada: a aresta da outra parte também tem a amostra como a mais próxima.
 * @returns {null | { amostras, vao, linhaMm, degrau, tipo }}  `null` quando nenhuma amostra fica a até `vizinho` mm
 */
export function medirPar(A, B, { vizinho = VIZINHO_PADRAO_MM, toque = TOQUE_MM, centro = null } = {}) {
  const todas = [];
  const celula = vizinho * 1.5 + 2;
  for (const [X, Y] of [[A, B], [B, A]]) {
    for (const s of X.amostras) {
      if (!dentroDaCaixa(s.p, Y.caixa, vizinho)) continue;
      const r = maisProximo(Y, s.p, vizinho);
      if (!r) continue;
      if (r.d <= toque) { todas.push({ vao: r.d, degrau: 0, p: s.p, e: r.q, s, mutua: true, aresta: false }); continue; }
      const u = unit(sub(r.q, s.p));
      const nX = s.n2 && Math.abs(dot(s.n2, u)) < Math.abs(dot(s.n1, u)) ? s.n2 : s.n1;
      const assinada = !!s.n2;
      const c = arestaDoMesmoLado(Y, s.p, nX, assinada, r.d * 1.5 + 2, celula);
      if (!c) { todas.push({ vao: r.d, degrau: null, p: s.p, e: r.q, s, mutua: !maisProximo(X, r.q, r.d - (0.05 + 0.01 * r.d)), aresta: false }); continue; }
      const delta = sub(c.e, s.p); const degrau = Math.abs(dot(delta, c.nY));
      const vao = Math.sqrt(Math.max(0, dot(delta, delta) - degrau * degrau));
      const volta = arestaDoMesmoLado(X, c.e, c.nY, assinada, c.d - (0.05 + 0.01 * c.d), celula);
      todas.push({ vao, degrau, p: s.p, e: c.e, s, mutua: !volta, aresta: true, fora: centro === null || !s.n2 || dot(nX, sub(s.p, centro)) > 0 });
    }
  }
  const contato = contatoEntre(A, B, toque);
  if (!todas.length && !contato) return null;
  /* a medida de aresta contra aresta vale; sem nenhuma, a distância à superfície */
  const todasAsArestas = todas.filter((x) => x.aresta && x.mutua);
  const dasArestas = todasAsArestas.some((x) => x.fora) ? todasAsArestas.filter((x) => x.fora) : todasAsArestas;
  const usadas = dasArestas.length ? dasArestas : todas.filter((x) => x.mutua).length ? todas.filter((x) => x.mutua) : todas;
  const ds = usadas.map((x) => x.vao).sort((a, b) => a - b);
  const acha = (cmp) => usadas.reduce((m, x) => (cmp(x.vao, m.vao) ? x : m), usadas[0]);
  const menor = usadas.length ? acha((a, b) => a < b) : null;
  const maior = usadas.length ? acha((a, b) => a > b) : null;
  const vao = usadas.length ? {
    min: arred(ds[0]), mediana: arred(mediana(ds)), p90: arred(percentil(ds, 0.9)), max: arred(ds[ds.length - 1]),
    emMin: pt(meio(menor.p, menor.e)), emMax: pt(meio(maior.p, maior.e)),
  } : null;
  const raio = Math.max(6, 2 * (vao?.mediana ?? 0) + 4);
  const linhaMm = usadas.length ? comprimentoDaLinha(usadas.map((x) => ({ p: x.p, ds: x.s.ds })), raio) : 0;
  const desn = usadas.filter((x) => x.degrau !== null).sort((a, b) => a.degrau - b.degrau);
  const pior = desn[desn.length - 1];
  const degrau = desn.length ? { mediana: arred(mediana(desn.map((x) => x.degrau))), max: arred(pior.degrau), em: pt(meio(pior.p, pior.e)), amostras: desn.length } : null;
  const tipo = contato === 'atravessa' ? 'atravessa' : contato === 'toca' || (vao && vao.min <= toque) ? 'toca' : 'folga';
  return { amostras: usadas.length, deArestaAAresta: dasArestas.length > 0, vao, linhaMm: arred(linhaMm, 1), degrau, tipo };
}

/* --- a medição de uma peça inteira --------------------------------------------------------------------------------------------- */
const chaveDoPar = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const casa = (nome, filtros) => filtros.some((f) => nome === f || nome.startsWith(f));

/**
 * O vão e o degrau de cada par de partes vizinhas e as partes soltas.
 * @param {Array<{ pts: number[][], parte: string }>} faces  em mm; a face sem `parte` fica fora
 * @param {object} [o]  esperado, tolerancia, degrau, vizinho, passo, toque, lado, pares, partes, folgas, apoia (ver a ficha)
 * @returns {{ pares: Array, soltas: Array, resumo: object }}  `pares` do pior para o melhor
 */
export function vaoEntrePartes(faces, o = {}) {
  const esperado = o.esperado ?? null;
  const tolerancia = o.tolerancia ?? TOLERANCIA_MM;
  const toque = o.toque ?? TOQUE_MM;
  const passo = o.passo ?? PASSO_MM;
  const vizinho = o.vizinho ?? (esperado ? FOLGA_DE_VIZINHO * esperado : VIZINHO_PADRAO_MM);
  const folgas = o.folgas ?? {};
  const apoia = o.apoia ?? {};
  for (const [nome, v] of Object.entries({ tolerancia, toque, passo, vizinho })) if (!(Number.isFinite(v) && v >= 0)) throw new ErroDoVao(`${nome} espera um número de mm a partir de zero`);
  if (esperado !== null && !(Number.isFinite(esperado) && esperado > 0)) throw new ErroDoVao('esperado espera um número de mm maior que zero');
  const porNome = new Map();
  for (const f of faces) if (f.parte) { if (!porNome.has(f.parte)) porNome.set(f.parte, []); porNome.get(f.parte).push(f); }
  const partes = new Map([...porNome].map(([n, fs]) => [n, prepararParte(n, fs, { passo })]));
  const nomes = [...partes.keys()];
  if (o.lado !== undefined && !['fora', 'todos'].includes(o.lado)) throw new ErroDoVao('lado espera fora ou todos');
  /* o lado de fora de uma chapa é o que olha para longe do centro da caixa do modelo; sem ele, valem as duas faces */
  let centro = null;
  if ((o.lado ?? 'fora') === 'fora') {
    const c = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const p of partes.values()) for (let k = 0; k < 3; k += 1) { c[k] = Math.min(c[k], p.caixa[k]); c[k + 3] = Math.max(c[k + 3], p.caixa[k + 3]); }
    centro = [0, 1, 2].map((k) => (c[k] + c[k + 3]) / 2);
  }
  for (const par of o.pares ?? []) for (const n of par) if (!partes.has(n)) throw new ErroDoVao(`a parte "${n}" não existe (${nomes.join(', ')})`);
  const filtros = o.partes ? [...o.partes] : null;
  if (filtros) for (const f of filtros) if (!nomes.some((n) => casa(n, [f]))) throw new ErroDoVao(`o prefixo ou nome "${f}" de --partes não casa com nenhuma parte`);
  const escolhidos = o.pares?.length ? new Set(o.pares.map(([a, b]) => chaveDoPar(a, b))) : null;
  const selecionado = (a, b) => (escolhidos ? escolhidos.has(chaveDoPar(a, b)) : filtros ? casa(a, filtros) && casa(b, filtros) : true);

  const ligadas = new Set(); const contatos = new Map();
  const pares = [];
  for (let i = 0; i < nomes.length; i += 1) for (let j = i + 1; j < nomes.length; j += 1) {
    const A = partes.get(nomes[i]); const B = partes.get(nomes[j]);
    const gap = folgaDeCaixas(A.caixa, B.caixa);
    const escolhido = selecionado(A.nome, B.nome);
    const explicito = escolhidos?.has(chaveDoPar(A.nome, B.nome));
    if (gap <= toque) {
      const c = contatoEntre(A, B, toque);
      if (c) { ligadas.add(A.nome); ligadas.add(B.nome); contatos.set(chaveDoPar(A.nome, B.nome), c); }
    }
    if (!escolhido || (gap > vizinho && !explicito)) continue;
    let alcance = vizinho;
    if (explicito && gap > vizinho) alcance = (distanciaEntre(A, B)?.d ?? gap) + vizinho;
    const m = medirPar(A, B, { vizinho: alcance, toque, centro });
    if (!m) { if (explicito) pares.push({ a: A.nome, b: B.nome, tipo: 'longe', amostras: 0, vao: null, linhaMm: 0, degrau: null }); continue; }
    pares.push({ a: A.nome, b: B.nome, ...m });
  }
  /* o esperado de cada par: o declarado nele, ou o geral; só a folga é conferida contra ele, e o par declarado sempre */
  for (const p of pares) {
    const d = folgas[chaveDoPar(p.a, p.b)] ?? folgas[`${p.a}|${p.b}`] ?? null;
    const esp = d ? d.esperada : (p.tipo === 'folga' || escolhidos ? esperado : null);
    const tol = d ? d.tolerancia : tolerancia;
    p.fora = [];
    if (esp !== null && esp !== undefined) {
      p.esperada = esp; p.tolerancia = tol;
      if (!p.vao) p.fora.push({ motivo: 'sem vizinhança dentro do alcance', mm: null, em: null });
      else if (p.tipo === 'toca' || p.tipo === 'atravessa') p.fora.push({ motivo: `${p.tipo === 'toca' ? 'toca' : 'atravessa'}, sem vão`, mm: 0, em: p.vao.emMin });
      else {
        if (p.vao.min < esp - tol) p.fora.push({ motivo: 'vão abaixo do esperado', mm: p.vao.min, em: p.vao.emMin });
        if (p.vao.max > esp + tol) p.fora.push({ motivo: 'vão acima do esperado', mm: p.vao.max, em: p.vao.emMax });
      }
    }
    if (o.degrau !== undefined && o.degrau !== null && p.degrau && p.degrau.max > o.degrau) p.fora.push({ motivo: 'degrau acima do aceito', mm: p.degrau.max, em: p.degrau.em });
    const desvio = p.vao && p.esperada !== undefined ? Math.max(Math.abs(p.vao.min - p.esperada), Math.abs(p.vao.max - p.esperada)) : (p.vao?.max ?? 0);
    p.desvio = arred(desvio);
  }
  const ordem = { folga: 0, longe: 0, toca: 1, atravessa: 1 };
  pares.sort((x, y) => (y.fora.length > 0) - (x.fora.length > 0) || ordem[x.tipo] - ordem[y.tipo] || y.desvio - x.desvio || (x.a + x.b < y.a + y.b ? -1 : 1));

  /* as partes soltas, entre as do subconjunto */
  const soltas = [];
  for (const n of nomes) {
    if (ligadas.has(n) || (filtros && !casa(n, filtros))) continue;
    const A = partes.get(n);
    let melhor = { d: Infinity, em: null, com: null };
    for (const outra of nomes) {
      if (outra === n) continue;
      const B = partes.get(outra);
      if (folgaDeCaixas(A.caixa, B.caixa) > melhor.d) continue;
      const r = distanciaEntre(A, B, melhor.d);
      if (r && r.d < melhor.d) melhor = { d: r.d, em: r.em, com: outra };
    }
    soltas.push({ parte: n, maisProxima: melhor.com, distanciaMm: melhor.com ? arred(melhor.d) : null, em: melhor.em ? pt(melhor.em) : null, apoia: apoia[n] ?? null });
  }
  soltas.sort((a, b) => (b.distanciaMm ?? Infinity) - (a.distanciaMm ?? Infinity));
  const naoDeclaradas = soltas.filter((s) => !s.apoia);
  return {
    pares, soltas,
    resumo: { partes: nomes.length, pares: pares.length, fora: pares.filter((p) => p.fora.length).length, soltas: soltas.length, soltasSemApoio: naoDeclaradas.length, esperado, tolerancia, degrau: o.degrau ?? null, vizinho, passo, toque },
  };
}

/* --- entrada e linha de comando --------------------------------------------------------------------------------------------- */
/** As faces de um neutro, em mm, com o nome da parte. */
export function facesPorNome(neutro) {
  return [...neutro.F.values()].filter((f) => f.parte).sort((a, b) => a.id - b.id).map((f) => ({ pts: f.vs.map((v) => neutro.V.get(v).map((c) => c * 1000)), parte: f.parte }));
}

/** A entrada de um arquivo: `{ faces, folgas, origem }`. Esboço (.esboco.json ou módulo) ou receita; a montagem é recusada. */
export async function lerEntrada(arquivo, { opcao = 1 } = {}) {
  let abs = resolve(arquivo);
  const { lerArquivoDeEsboco, montarOpcoes } = await import('./esboco-nucleo.mjs');
  let modulo = null; let json = null;
  if (!existsSync(abs)) {
    try { const { resolverCaminhoReceita } = await import('./resolver-caminho-receita.mjs'); abs = resolverCaminhoReceita(arquivo); } catch { throw new ErroDoVao(`${arquivo} não existe, nem como esboço nem como receita`); }
  }
  if (/\.(mjs|js)$/.test(abs)) { const { importarReceita } = await import('./importar-receita.mjs'); modulo = await importarReceita(abs); } else json = JSON.parse(readFileSync(abs, 'utf8'));
  if (json?.formato === 'mecanifica.montagem') throw new ErroDoVao('a entrada é uma montagem (mecanifica.montagem), que este comando não resolve; passe o esboço ou a receita da peça');
  const { receitaDoModulo } = await import('./importar-receita.mjs');
  const receita = modulo ? receitaDoModulo(modulo) : null;
  const ehReceita = receita && (Array.isArray(receita.PASSOS) || Array.isArray(receita.CHAMADAS_COMPOSICOES)) && !Array.isArray(receita.opcoes);
  if (ehReceita) {
    const { executarReceita } = await import('../../src/autoria/executar-receita.js');
    return { faces: facesPorNome(executarReceita(receita).neutro), folgas: {}, origem: `receita ${basename(abs)}` };
  }
  const esboco = modulo ? (modulo.default ?? modulo.ESBOCO) : json;
  if (!esboco) throw new ErroDoVao(`${arquivo} não exporta o esboço como default nem é uma receita`);
  const montado = montarOpcoes(esboco, { nome: basename(abs), relato: false });
  if (montado.recusas?.length) throw new ErroDoVao(`o esboço foi recusado:\n${montado.recusas.map((r) => `- ${r.motivo ?? r}`).join('\n')}`);
  const painel = montado.paineis[opcao - 1];
  if (!painel) throw new ErroDoVao(`o esboço tem ${montado.paineis.length} opções e veio --opcao=${opcao}`);
  const folgas = {};
  for (const c of painel.contatosDeclarados ?? []) if (c.folga) folgas[chaveDoPar(c.par[0], c.par[1])] = c.folga;
  return { faces: facesPorNome(painel.neutro), folgas, origem: `esboço ${basename(abs)}, opção ${opcao}` };
}

const virgula = (x, c = 2) => (x === null || x === undefined ? '-' : x.toFixed(c).replace('.', ','));
const ptTxt = (p) => (p ? `(${p.map((x) => virgula(x, 0)).join(' ')})` : '-');

/** Uma linha por par. */
export function linhaDoPar(p) {
  const v = p.vao;
  const esperado = p.esperada !== undefined ? ` esp ${virgula(p.esperada, 1)}±${virgula(p.tolerancia, 2)}` : '';
  const vao = v ? `vão mín ${virgula(v.min, 3)} med ${virgula(v.mediana)} p90 ${virgula(v.p90)} máx ${virgula(v.max)}` : `vão -`;
  const deg = p.degrau ? ` degrau med ${virgula(p.degrau.mediana)} máx ${virgula(p.degrau.max)}` : '';
  const onde = v && p.tipo === 'folga' ? ` mín em ${ptTxt(v.emMin)} máx em ${ptTxt(v.emMax)}` : '';
  const marca = p.fora.length ? `  FORA: ${p.fora.map((f) => `${f.motivo}${f.mm !== null ? ` ${virgula(f.mm, 3)} em ${ptTxt(f.em)}` : ''}`).join('; ')}` : '';
  return `${p.a}:${p.b} [${p.tipo}] ${vao}${deg} linha ${Math.round(p.linhaMm)} mm${esperado}${onde}${marca}`;
}

const AJUDA = `npm run vao:partes -- <esboço|receita> [--opcao=1] [--esperado=<mm>] [--tolerancia=${TOLERANCIA_MM}] [--degrau=<mm>] [--par=a:b]...
    [--partes=<prefixo|nome>,...] [--vizinho=<mm>] [--passo=${PASSO_MM}] [--toque=${TOQUE_MM}] [--lado=fora|todos] [--soltas=recusar] [--apoia=<parte>:<motivo>]...
    [--linhas=40] [--json]

Mede, sobre a malha, o vão (da borda de uma parte à borda da outra, ao longo da linha comum: mínimo, mediana, p90, máximo, com o ponto do
mínimo e do máximo em mm) e o degrau (o desnível entre as duas superfícies de fora) de cada par de partes vizinhas, o par a menos de
--vizinho mm (3 vezes o esperado, ou ${VIZINHO_PADRAO_MM}). Uma linha por par, do pior ao melhor; --linhas=0 mostra todos. Com --esperado, sai 1 e marca FORA o par
de folga cujo vão sai de esperado ± tolerância; o par declarado na opção do esboço com folga: { esperada, tolerancia } usa o dele. O par
que toca ou atravessa não tem vão. Lista sempre as partes soltas, as que não tocam nem atravessam outra; --soltas=recusar sai 1 com
uma, e --apoia declara a que é solta de propósito. Uma montagem não é entrada.`;

export async function executar(argv) {
  const valores = (nome) => argv.filter((x) => x.startsWith(`--${nome}=`)).map((x) => x.slice(nome.length + 3));
  const valor = (nome) => valores(nome)[0] ?? null;
  const arquivo = argv.find((a) => !a.startsWith('--'));
  if (argv.includes('--ajuda') || argv.includes('--help') || !arquivo) return { codigo: arquivo || !argv.length ? 0 : 2, stdout: `${AJUDA}\n`, stderr: '' };
  try {
    const numero = (nome) => { const v = valor(nome); if (v === null) return undefined; const n = Number(v.replace(',', '.')); if (!Number.isFinite(n)) throw new ErroDoVao(`--${nome} espera um número`); return n; };
    const pares = valores('par').map((t) => { const [a, b, ...r] = t.split(':').map((x) => x.trim()); if (!a || !b || r.length) throw new ErroDoVao('--par espera "a:b"'); return [a, b]; });
    const apoia = {};
    for (const t of valores('apoia')) { const i = t.indexOf(':'); if (i <= 0 || !t.slice(i + 1).trim()) throw new ErroDoVao('--apoia espera "<parte>:<motivo>"'); apoia[t.slice(0, i).trim()] = t.slice(i + 1).trim(); }
    const soltas = valor('soltas');
    if (soltas !== null && !['recusar', 'listar'].includes(soltas)) throw new ErroDoVao('--soltas espera recusar ou listar');
    const entrada = await lerEntrada(arquivo, { opcao: Number(valor('opcao') ?? 1) });
    const r = vaoEntrePartes(entrada.faces, {
      esperado: numero('esperado'), tolerancia: numero('tolerancia'), degrau: numero('degrau'), vizinho: numero('vizinho'), passo: numero('passo'), toque: numero('toque'), lado: valor('lado') ?? undefined,
      pares: pares.length ? pares : undefined, partes: valor('partes') ? valor('partes').split(',').map((s) => s.trim()).filter(Boolean) : undefined, folgas: entrada.folgas, apoia,
    });
    for (const n of Object.keys(apoia)) if (!r.soltas.some((s) => s.parte === n) && !entrada.faces.some((f) => f.parte === n)) throw new ErroDoVao(`--apoia cita a parte "${n}", que não existe`);
    const recusaSoltas = soltas === 'recusar' && r.resumo.soltasSemApoio > 0;
    const codigo = r.resumo.fora || recusaSoltas ? 1 : 0;
    if (argv.includes('--json')) return { codigo, stdout: `${JSON.stringify({ formato: 'modelar.vao-entre-partes@1', origem: entrada.origem, ...r }, null, 1)}\n`, stderr: '' };
    const limite = numero('linhas') ?? 40;
    const mostrar = limite > 0 ? r.pares.slice(0, limite) : r.pares;
    const out = [`${entrada.origem}: ${r.resumo.partes} partes, ${r.resumo.pares} pares vizinhos a até ${virgula(r.resumo.vizinho, 1)} mm, ${r.resumo.fora} fora da faixa${r.resumo.esperado ? ` (${virgula(r.resumo.esperado, 1)} ± ${virgula(r.resumo.tolerancia, 2)} mm)` : ''}`];
    out.push(...mostrar.map(linhaDoPar));
    if (mostrar.length < r.pares.length) out.push(`... mais ${r.pares.length - mostrar.length} pares (--linhas=0 mostra todos; ${r.pares.slice(mostrar.length).filter((p) => p.tipo !== 'folga').length} deles tocam ou atravessam)`);
    out.push(r.soltas.length ? `partes soltas (${r.soltas.length}): ${r.soltas.map((s) => `${s.parte} a ${virgula(s.distanciaMm, 2)} mm de ${s.maisProxima ?? '-'}${s.apoia ? ` [apoia: ${s.apoia}]` : ''}`).join('; ')}` : 'nenhuma parte solta');
    if (recusaSoltas) out.push(`--soltas=recusar: ${r.resumo.soltasSemApoio} parte(s) solta(s) sem --apoia`);
    return { codigo, stdout: `${out.join('\n')}\n`, stderr: '' };
  } catch (erro) {
    if (erro instanceof ErroDoVao || erro?.code === 'ENOENT' || erro instanceof SyntaxError) return { codigo: 2, stdout: '', stderr: `vao:partes: ${erro.message}\n` };
    throw erro;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await executar(process.argv.slice(2));
  process.stdout.write(r.stdout); process.stderr.write(r.stderr); process.exitCode = r.codigo;
}
