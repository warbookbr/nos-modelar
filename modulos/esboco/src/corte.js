/* Vista de corte: o plano `eixo = valor` divide o esboço, o desenho mostra só o lado escolhido e a superfície onde o plano
   atravessa cada sólido é preenchida e contornada, para ver o que está por dentro (um eixo no cubo, um pneu sobre o aro).
   O corte é exato sobre as faces que o desenho já tem: cada face plana é recortada pelo semiespaço (Sutherland-Hodgman, no
   espaço), os segmentos de silhueta e os arcos são recortados do mesmo modo, e a superfície de corte sai da interseção do
   plano com as faces inteiras do sólido, encadeada em laços fechados e preenchida por par-ímpar (um laço dentro de outro é
   furo). Vale para todo tipo de forma, porque todos viram faces planas. Puro: não importa o resto do módulo, a não ser o erro. */
import { ErroDeEsboco } from './index.js';

const EIXOS = ['x', 'y', 'z'];
export const LADOS_DO_CORTE = ['+', '-'];
const EPS = 1e-9;
/* Dois pontos da interseção com menos que isto de distância são o mesmo vértice. */
const JUNCAO_MM = 1e-3;
const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);

/* O `corte` do esboço: { eixo, valor, lado? }. O valor já é número aqui; parâmetro e âncora são resolvidos antes. */
export function lerCorte(v, onde = 'esboço') {
  if (v === undefined) return undefined;
  const dica = '"corte" deve ser { "eixo": "x" | "y" | "z", "valor": número em mm, "lado": "+" | "-" (opcional) }';
  if (!objeto(v)) throw new ErroDeEsboco(`${onde}: ${dica}`);
  for (const k of Object.keys(v)) if (!['eixo', 'valor', 'lado'].includes(k)) throw new ErroDeEsboco(`${onde}: o campo "${k}" não existe em "corte"; ${dica}`);
  if (!EIXOS.includes(v.eixo)) throw new ErroDeEsboco(`${onde}: ${dica}; o eixo ${JSON.stringify(v.eixo)} não existe`);
  if (typeof v.valor !== 'number' || !Number.isFinite(v.valor)) throw new ErroDeEsboco(`${onde}: ${dica}; o valor ${JSON.stringify(v.valor)} não é um número em mm (parâmetro ou "<forma>.<âncora>" também servem)`);
  if (v.lado !== undefined && !LADOS_DO_CORTE.includes(v.lado)) throw new ErroDeEsboco(`${onde}: ${dica}; o lado ${JSON.stringify(v.lado)} não existe`);
  return { eixo: v.eixo, valor: v.valor, ...(v.lado !== undefined ? { lado: v.lado } : {}) };
}

/* O lado que fica: o pedido, ou o oposto ao observador, de modo que o plano de corte fique voltado para ele. Com o plano de
   perfil (o observador não tem componente no eixo) o plano é visto de lado e vale "-". */
export function ladoDoCorte(corte, olho) {
  if (corte.lado) return corte.lado;
  return olho[EIXOS.indexOf(corte.eixo)] < -1e-6 ? '+' : '-';
}

/* Quanto a superfície de corte está voltada para o observador: positivo quando se vê a face de corte. */
export function frenteDoCorte(corte, lado, olho) {
  return (lado === '+' ? -1 : 1) * olho[EIXOS.indexOf(corte.eixo)];
}

const distancia = (p, c, s) => s * (p[EIXOS.indexOf(c.eixo)] - c.valor);
const entre = (a, b, da, db) => { const t = da / (da - db); return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])]; };

/* Os pontos do anel que ficam do lado `s` do plano (>= 0), com os pontos novos sobre o plano; null se sobra menos de um triângulo. */
export function recortarAnel(pts, c, s) {
  const saida = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const dp = distancia(p, c, s);
    const dq = distancia(q, c, s);
    if (dp >= 0) saida.push(p);
    if ((dp > 0 && dq < 0) || (dp < 0 && dq > 0)) saida.push(entre(p, q, dp, dq));
  }
  if (saida.length < 3) return null;
  return saida;
}

/* Área do polígono no espaço (soma de produtos vetoriais): a face que o corte reduziu a um fio some. */
const areaDoAnel = (pts) => {
  let x = 0; let y = 0; let z = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]; const q = pts[(i + 1) % pts.length];
    x += p[1] * q[2] - p[2] * q[1]; y += p[2] * q[0] - p[0] * q[2]; z += p[0] * q[1] - p[1] * q[0];
  }
  return Math.hypot(x, y, z) / 2;
};

/* As normais por vértice (`nv`, da superfície suave) de uma face recortada: as dos vértices que ficam, e nos pontos novos sobre o
   plano a interpolação das duas normais da aresta cortada, renormalizada. Na mesma ordem de `recortarAnel`. */
function recortarNormais(pts, nv, c, s) {
  const saida = [];
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const dp = distancia(pts[i], c, s);
    const dq = distancia(pts[j], c, s);
    if (dp >= 0) saida.push(nv[i]);
    if ((dp > 0 && dq < 0) || (dp < 0 && dq > 0)) {
      const t = dp / (dp - dq);
      const n = [0, 1, 2].map((e) => nv[i][e] + t * (nv[j][e] - nv[i][e]));
      const m = Math.hypot(...n) || 1;
      saida.push(n.map((x) => x / m));
    }
  }
  return saida;
}

function recortarFace(f, c, s) {
  const pts = recortarAnel(f.pts, c, s);
  if (!pts || areaDoAnel(pts) < EPS) return null;
  const nova = { ...f, pts };
  if (f.nv) nova.nv = recortarNormais(f.pts, f.nv, c, s);
  if (f.furos) {
    nova.furos = f.furos.map((fu) => recortarAnel(fu, c, s)).filter((fu) => fu && areaDoAnel(fu) >= EPS);
    nova.furo = nova.furos[0] ?? null;
  } else if (f.furo) {
    nova.furo = recortarAnel(f.furo, c, s);
  }
  if (f.linhas) nova.linhas = f.linhas.map((l) => recortarSegmento(l, c, s)).filter(Boolean);
  return nova;
}

function recortarSegmento([a, b], c, s) {
  const da = distancia(a, c, s);
  const db = distancia(b, c, s);
  if (da < 0 && db < 0) return null;
  if (da >= 0 && db >= 0) return [a, b];
  const m = entre(a, b, da, db);
  return da >= 0 ? [a, m] : [m, b];
}

/* Uma polilinha aberta vira as sequências que sobram do lado escolhido. */
function recortarPolilinha(pts, c, s) {
  const saida = [];
  let atual = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const dp = distancia(p, c, s);
    if (dp >= 0) atual.push(p);
    if (i + 1 < pts.length) {
      const q = pts[i + 1];
      const dq = distancia(q, c, s);
      if (dp >= 0 && dq < 0) { atual.push(entre(p, q, dp, dq)); saida.push(atual); atual = []; }
      else if (dp < 0 && dq >= 0) atual = [entre(p, q, dp, dq)];
    }
  }
  if (atual.length > 0) saida.push(atual);
  return saida.filter((l) => l.length >= 2);
}

/* Um bloco de faces do desenho (`lados`, `dentro`, `tampas`, `linhas`, `arcos`) recortado; null se não sobra nada. */
export function recortarBloco(ch, c, s) {
  const lados = ch.lados.map((f) => recortarFace(f, c, s)).filter(Boolean);
  const dentro = ch.dentro.map((f) => recortarFace(f, c, s)).filter(Boolean);
  const tampas = ch.tampas.map((f) => recortarFace(f, c, s)).filter(Boolean);
  if (lados.length + dentro.length + tampas.length === 0) return null;
  return {
    ...ch,
    lados, dentro, tampas,
    linhas: ch.linhas.map((l) => recortarSegmento(l, c, s)).filter(Boolean),
    arcos: (ch.arcos ?? []).flatMap((a) => recortarPolilinha(a, c, s)),
  };
}

/* Os laços fechados em que o plano atravessa as faces `faces` ({ pts, furos? } planas, de um mesmo sólido). Cada face dá os
   segmentos em que o plano a corta (a interseção da reta comum com o polígono, par-ímpar sobre o anel externo e os furos);
   os segmentos se ligam pelas pontas. Um vértice exatamente sobre o plano conta como do lado de dentro, e por isso a
   paridade dos cruzamentos fecha. */
export function lacosDoPlano(faces, c) {
  const k = EIXOS.indexOf(c.eixo);
  const segmentos = [];
  for (const f of faces) {
    const aneis = [f.pts, ...(f.furos && f.furos.length > 0 ? f.furos : f.furo ? [f.furo] : [])];
    const cruz = [];
    for (const an of aneis) {
      for (let i = 0; i < an.length; i++) {
        const p = an[i]; const q = an[(i + 1) % an.length];
        const dp = p[k] - c.valor; const dq = q[k] - c.valor;
        if ((dp >= 0) !== (dq >= 0)) cruz.push(entre(p, q, dp, dq));
      }
    }
    if (cruz.length < 2) continue;
    /* a direção da reta comum: a do maior afastamento entre os cruzamentos */
    let d = [0, 0, 0];
    let maior = 0;
    for (const p of cruz) for (const q of cruz) { const t = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]); if (t > maior) { maior = t; d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]]; } }
    if (maior < JUNCAO_MM) continue;
    cruz.sort((p, q) => (p[0] - q[0]) * d[0] + (p[1] - q[1]) * d[1] + (p[2] - q[2]) * d[2]);
    for (let i = 0; i + 1 < cruz.length; i += 2) {
      if (Math.hypot(cruz[i + 1][0] - cruz[i][0], cruz[i + 1][1] - cruz[i][1], cruz[i + 1][2] - cruz[i][2]) >= JUNCAO_MM) segmentos.push([cruz[i], cruz[i + 1]]);
    }
  }
  return encadear(segmentos);
}

/* Liga segmentos pelas pontas em laços (uma cadeia que não fecha é fechada na mesma, porque a falha é de ponta que a
   tolerância não ligou e a forma desenhada continua legível). */
function encadear(segmentos) {
  const grade = new Map();
  const chave = (p) => p.map((x) => Math.floor(x / JUNCAO_MM)).join(',');
  const pontos = [];
  const no = (p) => {
    const [i, j, l] = p.map((x) => Math.floor(x / JUNCAO_MM));
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let e = -1; e <= 1; e++) {
      for (const n of grade.get(`${i + a},${j + b},${l + e}`) ?? []) if (Math.hypot(pontos[n][0] - p[0], pontos[n][1] - p[1], pontos[n][2] - p[2]) < JUNCAO_MM) return n;
    }
    pontos.push(p);
    const c = chave(p);
    if (!grade.has(c)) grade.set(c, []);
    grade.get(c).push(pontos.length - 1);
    return pontos.length - 1;
  };
  const arestas = segmentos.map(([a, b]) => [no(a), no(b)]).filter(([a, b]) => a !== b);
  const vizinhos = new Map();
  arestas.forEach(([a, b], e) => {
    for (const n of [a, b]) { if (!vizinhos.has(n)) vizinhos.set(n, []); vizinhos.get(n).push(e); }
  });
  const usada = new Array(arestas.length).fill(false);
  const lacos = [];
  for (let e0 = 0; e0 < arestas.length; e0++) {
    if (usada[e0]) continue;
    usada[e0] = true;
    const laco = [arestas[e0][0]];
    let atual = arestas[e0][1];
    for (;;) {
      laco.push(atual);
      const proxima = (vizinhos.get(atual) ?? []).find((e) => !usada[e]);
      if (proxima === undefined) break;
      usada[proxima] = true;
      atual = arestas[proxima][0] === atual ? arestas[proxima][1] : arestas[proxima][0];
      if (atual === laco[0]) break;
    }
    if (laco[laco.length - 1] === laco[0]) laco.pop();
    if (laco.length >= 3) lacos.push(laco.map((n) => pontos[n]));
  }
  return lacos;
}
