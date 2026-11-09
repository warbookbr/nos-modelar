/* furo-em-aneis.js — a face furada refeita em anéis (plano "costuras e furos limpos", fatia 4), e a região plana de várias faces como face de entrada.

   O QUE ERA. O `furo` repartia a face entre o contorno e os anéis sem criar vértice nenhum: com um anel, uma face de borda por aresta do anel
   abraçando um trecho do contorno; com vários, pontes e orelhas. Quando o contorno tem muitos cantos (a tampa de 144 lados de um disco), cada face
   dessas liga um canto do contorno, a dezenas de milímetros, a uma aresta do furo de um milímetro: triângulos longos e finos, de razão de aspecto
   até 13 898 no flange do braço, que o sombreamento suave mostra como estrias.

   O QUE É. Quando o contorno da face tem 48 cantos ou mais e a repartição antiga tem um triângulo fino (o critério da régua `triangulo-fino` do repositório: razão de aspecto acima de 10 e maior
   lado acima de 4 vezes a aresta média do contorno), a face é refeita:
     1. em volta de cada furo, um anel de quadriláteros: cada aresta do furo ganha o quadrilátero que a liga à aresta correspondente de um POLÍGONO DE
        APOIO, o contorno do furo afastado `d` para fora (miter), com `d` igual ao raio médio do furo e reduzido pela metade até o apoio caber com folga;
     2. o resto da face (o contorno menos os polígonos de apoio) pela repartição de sempre, mais pontos de reforço numa grade hexagonal de passo 3 vezes
        a aresta média, sem chegar a menos de 0,8 passo do contorno nem dos apoios, e então por flips de Delaunay que respeitam as arestas do contorno e
        dos apoios (nunca flipadas), o que dá triângulos próximos do equilátero.
   Nenhum vértice cai sobre o contorno da face nem dentro de um furo, então a vizinhança da peça não ganha junção em T. A face que a repartição antiga
   já fazia sem triângulo fino fica byte a byte como era. Qualquer prova que falhe aqui devolve `null`, e o `furo` segue com a repartição antiga. */
import { triangularFace } from '../triangulacao-face.js';

/* Só a face de contorno denso (48 cantos ou mais) é refeita. Nela a repartição sem vértice novo liga cada canto do contorno a um furo a dezenas de arestas
   dali, e é de lá que vêm as estrias. As faces de poucos cantos (placa de 4 cantos, tampa de 16 ou 32 lados) têm a repartição que os testes A-26, A-30 e
   A-33 fixam (contagem fechada de faces, nenhum vértice a mais) e seguem como eram, mesmo onde a régua acha triângulo fino neles (29 a 99 nas oito figuras
   da linha de base do furo, de face com 6 a 32 lados). */
export const CANTOS_DO_CONTORNO_DENSO = 48;
const LIMITE_DA_RAZAO = 10;
const FATOR_DO_LADO = 4;
const FATORES_DA_GRADE = [4, 3, 2.5, 2];
const LIMITE_DE_CANTOS = 1500;
const LIMITE_DA_GRADE = 40000;
const FATOR_DA_FOLGA = 0.5;

const cruz2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** A aresta média de uma lista de polígonos (só os lados, cada aresta uma vez por polígono). */
export function arestaMedia(poligonos) {
  let soma = 0, n = 0;
  for (const P of poligonos) for (let k = 0; k < P.length; k++) { soma += dist(P[k], P[(k + 1) % P.length]); n++; }
  return n ? soma / n : 0;
}

/** Verdadeiro se algum polígono (cantos em 2D, anti-horário), triangulado como o adaptador triangula, tem triângulo fino. */
export function temTrianguloFino(poligonos, media) {
  for (const uv of poligonos) {
    const pts = uv.map((p) => [p[0], p[1], 0]);
    const tris = pts.length === 3 ? [[0, 1, 2]] : triangularFace(pts);
    for (const [a, b, c] of tris) {
      const maior = Math.max(dist(uv[a], uv[b]), dist(uv[b], uv[c]), dist(uv[c], uv[a]));
      const dobro = Math.abs(cruz2(uv[a], uv[b], uv[c]));
      const razao = dobro > 0 ? (maior * maior) / dobro : Infinity;
      if (razao > LIMITE_DA_RAZAO && maior > FATOR_DO_LADO * media) return true;
    }
  }
  return false;
}

/* o contorno do anel afastado `d` para fora, nos cantos pela esquadria; o anel é convexo e anti-horário */
function afastar(anel, d) {
  const n = anel.length;
  const normais = anel.map((p, k) => {
    const q = anel[(k + 1) % n];
    const len = dist(p, q) || 1;
    return [(q[1] - p[1]) / len, -(q[0] - p[0]) / len];
  });
  return anel.map((p, k) => {
    const a = normais[(k + n - 1) % n], b = normais[k];
    const m = Math.max(0.2, 1 + a[0] * b[0] + a[1] * b[1]);
    return [p[0] + d * (a[0] + b[0]) / m, p[1] + d * (a[1] + b[1]) / m];
  });
}

function distanciaAoSegmento(p, a, b) {
  const abx = b[0] - a[0], aby = b[1] - a[1];
  const l2 = abx * abx + aby * aby;
  let t = l2 > 0 ? ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(p[0] - a[0] - abx * t, p[1] - a[1] - aby * t);
}
const distanciaAoPoligono = (p, P) => Math.min(...P.map((q, k) => distanciaAoSegmento(p, q, P[(k + 1) % P.length])));

/* o centro do círculo que passa por a, b, c fica à esquerda de a→b se positivo; incircle > 0 quando d está dentro do círculo de (a,b,c) anti-horário */
function dentroDoCirculo(a, b, c, d, eps) {
  const ax = a[0] - d[0], ay = a[1] - d[1], bx = b[0] - d[0], by = b[1] - d[1], cx = c[0] - d[0], cy = c[1] - d[1];
  const det = (ax * ax + ay * ay) * (bx * cy - cx * by) - (bx * bx + by * by) * (ax * cy - cx * ay) + (cx * cx + cy * cy) * (ax * by - bx * ay);
  return det > eps;
}

/**
 * Refaz a face em anéis. `contorno` e `aneis` em 2D como o `furo` os tem (contorno anti-horário, anéis anti-horários), `particionar` a repartição de
 * sempre e `margemDentro` a margem do núcleo. Devolve { bordas, preenchimento, apoios, extras } com os cantos por etiqueta
 * ({tipo:'contorno',i} | {tipo:'anel',k,j} | {tipo:'apoio',k,j} | {tipo:'extra',m}), `bordas[k][j]` o quadrilátero da aresta j do anel k, `apoios[k]` os
 * cantos 2D do polígono de apoio e `extras` os pontos de reforço; ou null quando a face não pede, ou não aceita, a refeitura.
 */
export function refazerEmAneis(entrada) {
  const { contorno, aneis, raios, escala, particionar, margemDentro } = entrada;
  const M = aneis.length;
  const L = aneis[0].length;
  if (M * L > LIMITE_DE_CANTOS || contorno.length > LIMITE_DE_CANTOS) return null;
  const centroDe = (anel) => [anel.reduce((s, p) => s + p[0], 0) / anel.length, anel.reduce((s, p) => s + p[1], 0) / anel.length];
  const raioMedio = aneis.map((anel) => { const c = centroDe(anel); return anel.reduce((s, p) => s + dist(p, c), 0) / anel.length; });

  // o apoio: o maior afastamento (o raio médio do furo, depois metade, um quarto, um oitavo) em que o apoio, com a folga de meio afastamento, cabe
  let apoios = null;
  for (const f of [1, 0.5, 0.25, 0.125]) {
    const d = raioMedio.map((r) => r * f);
    const folgados = aneis.map((anel, k) => afastar(anel, 1.5 * d[k]));
    const cabe = folgados.every((F) => F.every((p) => margemDentro(contorno, p) > 0))
      && folgados.every((F, k) => folgados.every((G, l) => l <= k || !sePerto(F, G, escala)));
    if (cabe) { apoios = aneis.map((anel, k) => afastar(anel, d[k])); break; }
  }
  if (!apoios) return null;

  // a repartição do resto: o contorno menos os apoios, sem vértice novo
  const base = particionar(contorno, apoios, escala, raios);
  if (!base || base.erro) return null;

  /* o passo da grade de reforço começa em 4 vezes a aresta média e fecha (3, 2,5 e 2) até a refeitura não ter triângulo fino pela mesma régua; se nenhum
     passo chega lá, fica o mais fino que fechou */
  let melhor = null;
  for (const fator of FATORES_DA_GRADE) {
    const r = montar(entrada, apoios, base, fator);
    if (!r) break;
    melhor = r;
    const ponto = (t) => (t.tipo === 'contorno' ? contorno[t.i] : t.tipo === 'anel' ? aneis[t.k][t.j] : t.tipo === 'apoio' ? r.apoios[t.k][t.j] : r.extras[t.m]);
    const poligonos = [...r.bordas.flat(), ...r.preenchimento].map((d) => d.cantos.map(ponto));
    if (!temTrianguloFino(poligonos, entrada.media)) break;
  }
  return melhor;
}

function montar({ contorno, aneis, escala, margemDentro, media }, apoios, base, fatorDaGrade) {
  const M = aneis.length;
  const L = aneis[0].length;
  const tags = [];
  const pontos = [];
  const indice = new Map();
  const idDe = (t) => {
    const chave = `${t.tipo}|${t.i ?? ''}|${t.k ?? ''}|${t.j ?? ''}`;
    if (!indice.has(chave)) {
      indice.set(chave, pontos.length);
      tags.push(t);
      pontos.push(t.tipo === 'contorno' ? contorno[t.i] : apoios[t.k][t.j]);
    }
    return indice.get(chave);
  };
  const usados = [];
  // `particionar` descreve o anel de apoio com a etiqueta 'anel': aqui o anel dele é o apoio
  const comoApoio = (t) => (t.tipo === 'anel' ? { tipo: 'apoio', k: t.k, j: t.j } : t);
  const tri = [];
  for (const d of [...base.bordas.flat(), ...base.preenchimento]) tri.push(d.cantos.map((t) => idDe(comoApoio(t))));

  // a grade de reforço
  const h0 = media;
  const passo = fatorDaGrade * h0;
  const folga = FATOR_DA_FOLGA * passo;
  const caixa = contorno.reduce((c, p) => [Math.min(c[0], p[0]), Math.min(c[1], p[1]), Math.max(c[2], p[0]), Math.max(c[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
  const origem = [(caixa[0] + caixa[2]) / 2, (caixa[1] + caixa[3]) / 2];
  const linhas = Math.ceil((caixa[3] - caixa[1]) / (passo * Math.sqrt(3) / 2) / 2) + 1;
  const colunas = Math.ceil((caixa[2] - caixa[0]) / passo / 2) + 2;
  const extras = [];
  const grade = (2 * linhas + 1) * (2 * colunas + 1);
  if (grade > LIMITE_DA_GRADE) return null;   // o passo é pequeno demais para a face: fica a repartição antiga
  if (passo > 0 && passo < Math.max(caixa[2] - caixa[0], caixa[3] - caixa[1])) {
    for (let r = -linhas; r <= linhas; r++) {
      for (let c = -colunas; c <= colunas; c++) {
        const p = [origem[0] + (c + (Math.abs(r) % 2) * 0.5) * passo, origem[1] + r * passo * Math.sqrt(3) / 2];
        if (!(margemDentro(contorno, p) >= folga)) continue;
        if (apoios.some((A) => margemDentro(A, p) > 0 || distanciaAoPoligono(p, A) < folga)) continue;
        extras.push(p);
      }
    }
  }

  // inserção dos reforços, um a um, com flips de Delaunay que nunca tocam aresta do contorno nem do apoio
  const eps = 1e-12 * escala * escala;
  const epsCirculo = 1e-13 * escala ** 4;
  const arestas = new Map();
  const chave = (a, b) => `${a}>${b}`;
  const poe = (t) => { for (let e = 0; e < 3; e++) arestas.set(chave(t[e], t[(e + 1) % 3]), t); };
  const tira = (t) => { for (let e = 0; e < 3; e++) if (arestas.get(chave(t[e], t[(e + 1) % 3])) === t) arestas.delete(chave(t[e], t[(e + 1) % 3])); };
  const triangulos = new Set();
  const novo = (a, b, c) => { const t = [a, b, c]; triangulos.add(t); poe(t); return t; };
  const remove = (t) => { tira(t); triangulos.delete(t); };
  for (const t of tri) novo(...t);
  const fixa = new Set();
  for (const k of arestas.keys()) { const [a, b] = k.split('>'); if (!arestas.has(chave(b, a))) { fixa.add(k); fixa.add(chave(b, a)); } }

  const legaliza = (pilha) => {
    let guarda = 100 * (triangulos.size + 10);
    while (pilha.length && guarda-- > 0) {
      const [u, v] = pilha.pop();
      const t1 = arestas.get(chave(u, v));
      const t2 = arestas.get(chave(v, u));
      if (!t1 || !t2 || fixa.has(chave(u, v))) continue;
      const p = t1.find((x) => x !== u && x !== v);
      const w = t2.find((x) => x !== u && x !== v);
      if (!dentroDoCirculo(pontos[u], pontos[v], pontos[p], pontos[w], epsCirculo)) continue;
      if (!(cruz2(pontos[u], pontos[w], pontos[p]) > eps && cruz2(pontos[w], pontos[v], pontos[p]) > eps)) continue;
      remove(t1); remove(t2);
      novo(u, w, p); novo(w, v, p);
      pilha.push([u, w], [w, v], [v, p], [p, u]);
    }
  };
  legaliza([...arestas.keys()].sort().map((k) => k.split('>').map(Number)));
  for (const p of extras) {
    let alvo = null, sobre = false;
    for (const t of triangulos) {
      const a = pontos[t[0]], b = pontos[t[1]], c = pontos[t[2]];
      const s = [cruz2(a, b, p), cruz2(b, c, p), cruz2(c, a, p)];
      if (s.every((x) => x > eps)) { alvo = t; break; }
      if (s.every((x) => x > -eps)) sobre = true;
    }
    if (!alvo || sobre) continue;
    const id = pontos.length;
    tags.push({ tipo: 'extra', m: usados.length });
    usados.push(p);
    pontos.push(p);
    const [a, b, c] = alvo;
    remove(alvo);
    novo(a, b, id); novo(b, c, id); novo(c, a, id);
    legaliza([[a, b], [b, c], [c, a]]);
  }

  // as provas: contagem, área, cada aresta de borda uma vez, cada interna em duas direções
  const finais = [...triangulos];
  const nExtras = usados.length;
  const esperado = contorno.length + M * L + 2 * M - 2 + 2 * nExtras;
  if (finais.length !== esperado) return null;
  let area = 0;
  for (const [a, b, c] of finais) { const t = cruz2(pontos[a], pontos[b], pontos[c]) / 2; if (!(t > 0)) return null; area += t; }
  const areaDe = (P) => P.reduce((s, p, k) => { const q = P[(k + 1) % P.length]; return s + (p[0] * q[1] - q[0] * p[1]) / 2; }, 0);
  const alvoArea = areaDe(contorno) - apoios.reduce((s, A) => s + areaDe(A), 0);
  if (Math.abs(area - alvoArea) > 1e-9 * Math.max(1, Math.abs(alvoArea))) return null;
  for (const [a, b, c] of finais) for (const [x, y] of [[a, b], [b, c], [c, a]]) {
    const fora = fixa.has(chave(x, y)) && !arestas.has(chave(y, x));
    if (!fora && !arestas.has(chave(y, x))) return null;
  }

  // as famílias: a borda j do anel k é o quadrilátero da aresta j; o resto é preenchimento
  const bordas = aneis.map((anel, k) => anel.map((_, j) => {
    const n = (j + 1) % L;
    return { cantos: [{ tipo: 'anel', k, j: n }, { tipo: 'anel', k, j }, { tipo: 'apoio', k, j }, { tipo: 'apoio', k, j: n }] };
  }));
  const preenchimento = finais.map((t) => ({ cantos: t.map((x) => tags[x]) }));
  return { bordas, preenchimento, apoios, extras: usados };
}

function sePerto(A, B, escala) {
  /* dois convexos se encostam ou se cruzam: eixo separador, como `aneisSeSobrepoem` do núcleo */
  const folga = 1e-9 * Math.max(1, escala);
  for (const [P, Q] of [[A, B], [B, A]]) {
    for (let k = 0; k < P.length; k++) {
      const p = P[k], q = P[(k + 1) % P.length];
      const len = dist(p, q);
      if (!(len > 0)) continue;
      const nx = -(q[1] - p[1]) / len, ny = (q[0] - p[0]) / len;
      let maxP = -Infinity, minP = Infinity, maxQ = -Infinity, minQ = Infinity;
      for (const r of P) { const t = r[0] * nx + r[1] * ny; maxP = Math.max(maxP, t); minP = Math.min(minP, t); }
      for (const r of Q) { const t = r[0] * nx + r[1] * ny; maxQ = Math.max(maxQ, t); minQ = Math.min(minQ, t); }
      if (minQ - maxP > folga || minP - maxQ > folga) return false;
    }
  }
  return true;
}
