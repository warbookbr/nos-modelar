/* Recorte de uma forma por outra (`subtrai`): o alojamento da roda dentro da asa e do capô, a porta rebaixada no casco, o
   compensador aberto na borda de fuga e o furo passante. A forma declara no JSON as formas que ela subtrai (`subtrai: ["id",
   { "forma": "id", "folga": mm, "profundidade": mm, "lado": "-x" }]`), e uma forma auxiliar que só serve de molde leva
   `cortador: true` (oculta por natureza: não se desenha, não entra no gate, nas medidas, no Envelope nem na blocagem).

   A técnica é CSG exato sobre as peças convexas que o módulo já tem (`pecasDe`, a mesma lista que o gate de contato usa), e
   não sobre a malha triangulada: cada peça vira um poliedro convexo (o casco 3D dos vértices dela), e `A - Q` para um `Q`
   convexo sai de `A` cortado pelos planos das faces de `Q` em sequência (a parte de fora de cada plano é uma peça convexa, e o
   que sobra dentro de todos é o `A ∩ Q`, descartado). Um molde composto por várias peças (um loft, um anel) subtrai peça por
   peça. O resultado são peças convexas de volume exato, com a mesma forma de lista que `pecasDe` devolve, de modo que o gate
   (a roda dentro do vão não colide com a parede que sobra), as medidas, o Envelope e o `--descrever` leem a forma recortada
   sem saber que ela foi recortada.

   O desenho precisa da fronteira da união, e não das peças: a superfície da forma (as faces que o desenho já fatia) menos o
   que está dentro do molde, mais as paredes do molde que estão dentro da forma, com a normal virada para o vão. As faces do
   molde são limpas das que ficam dentro de outra peça do molde (a emenda entre duas faixas de um loft não é parede). O
   recorte é determinístico: os mesmos números dão as mesmas peças, na mesma ordem. `folga` engrossa o molde deslocando cada
   face dele para fora (em canto vivo o vão passa de `folga`), e `profundidade` com `lado` tira do molde só a fatia que entra
   `profundidade` mm na forma a partir da face dela no lado dado (o rebaixo da porta no casco, de 18 mm a partir do flanco). Quem
   guarda a posição do vão é o molde: um molde fixo, e não a peça que se move, é o que deixa o gate julgar o curso dela contra a
   parede. Sem Three.js. */
import earcut from 'earcut';
import { ErroDeEsboco, fatiarForma, ordemDasFaces } from './index.js';
import { pecasDe, pecasSemRecorte } from './contato.js';
import { lacosDoPlano } from './corte.js';
import { quisDizer } from './parecido.js';

const EPS = 1e-7;
const VOLUME_MINIMO = 1e-4;
const COS25 = Math.cos((25 * Math.PI) / 180);
const LADOS = ['+x', '-x', '+y', '-y', '+z', '-z'];
const CAMPOS_DO_ITEM = ['forma', 'folga', 'profundidade', 'lado'];
const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };

/* ---------- vetores ---------- */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const esc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.sqrt(dot(a, a));
const unitario = (a) => { const t = norma(a) || 1; return [a[0] / t, a[1] / t, a[2] / t]; };
const distancia = (a, b) => norma(sub(a, b));
const chaveDe = (p, q = 1e6) => `${Math.round(p[0] * q)},${Math.round(p[1] * q)},${Math.round(p[2] * q)}`;

/* A base (e1, e2) do plano de normal `n`, com e1 x e2 = n: um polígono anti-horário em (e1, e2) é anti-horário visto de fora. */
function baseDoPlano(n) {
  const a = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const e1 = unitario(cross(n, a));
  return [e1, cross(n, e1)];
}

/* O casco convexo 2D (cadeia monótona) de pontos `{ u, v, p }`, anti-horário, sem pontos colineares. */
function casco2d(lista) {
  /* as coordenadas vão a 1e-6 mm antes de ordenar: dois pontos que são o mesmo vértice, com a diferença do último bit, ficam iguais, e
     uma aresta vertical não se desfaz em ordem trocada */
  const vistos = new Map();
  for (const p of lista) vistos.set(`${Math.round(p.u * 1e6)},${Math.round(p.v * 1e6)}`, { u: Math.round(p.u * 1e6) / 1e6, v: Math.round(p.v * 1e6) / 1e6, p: p.p });
  const q = [...vistos.values()].sort((a, b) => a.u - b.u || a.v - b.v);
  const volta = (a, b, c) => (b.u - a.u) * (c.v - a.v) - (b.v - a.v) * (c.u - a.u);
  const meio = (ordem) => {
    const h = [];
    for (const p of ordem) {
      while (h.length >= 2 && volta(h[h.length - 2], h[h.length - 1], p) <= 1e-9) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  return [...meio(q), ...meio([...q].reverse())];
}

/* Os pontos coplanares (normal `n`) como polígono convexo anti-horário visto de fora; null com menos de três pontos ou área nula. */
function poligonoNoPlano(pontos, n) {
  const [e1, e2] = baseDoPlano(n);
  const h = casco2d(pontos.map((p) => ({ u: dot(p, e1), v: dot(p, e2), p })));
  if (h.length < 3) return null;
  const pts = h.map((q) => q.p);
  return areaVetorial(pts) < 1e-9 ? null : pts;
}

function areaVetorial(pts) {
  let x = 0; let y = 0; let z = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]; const q = pts[(i + 1) % pts.length];
    x += p[1] * q[2] - p[2] * q[1]; y += p[2] * q[0] - p[0] * q[2]; z += p[0] * q[1] - p[1] * q[0];
  }
  return Math.hypot(x, y, z) / 2;
}

/* ---------- polígonos planos: dividir por um plano, carregando o que cada aresta é ---------- */

/* O polígono `{ pts, n, fl }` dividido pelo plano `n·x = d`: `dentro` (n·x <= d) e `fora` (n·x >= d), cada um ou null. `fl[i]` é a
   marca da aresta que sai de `pts[i]` e acompanha o pedaço da aresta original (a aresta nova, sobre o plano, não leva marca). */
function dividirPoligono(poli, n, d) {
  const { pts, fl } = poli;
  const N = pts.length;
  const s = pts.map((p) => dot(n, p) - d);
  const cls = s.map((x) => (x > EPS ? 1 : x < -EPS ? -1 : 0));
  if (cls.every((c) => c <= 0)) return { dentro: poli, fora: null };
  if (cls.every((c) => c >= 0)) return { dentro: null, fora: poli };
  const D = [];
  const F = [];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const a = pts[i]; const b = pts[j];
    const fe = fl ? fl[i] : null;
    if (cls[i] <= 0) D.push({ p: a, f: cls[i] < 0 || cls[j] <= 0 ? fe : null });
    if (cls[i] >= 0) F.push({ p: a, f: cls[i] > 0 || cls[j] >= 0 ? fe : null });
    if (cls[i] * cls[j] < 0) {
      const t = s[i] / (s[i] - s[j]);
      const c = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])];
      D.push({ p: c, f: cls[j] < 0 ? fe : null });
      F.push({ p: c, f: cls[j] > 0 ? fe : null });
    }
  }
  const refazer = (lista) => {
    const q = [];
    for (const x of lista) {
      const ult = q[q.length - 1];
      if (ult && distancia(ult.p, x.p) < EPS) { ult.f = x.f; continue; }
      q.push({ p: x.p, f: x.f });
    }
    while (q.length > 1 && distancia(q[0].p, q[q.length - 1].p) < EPS) q.pop();
    if (q.length < 3) return null;
    const novo = { ...poli, pts: q.map((x) => x.p), fl: q.map((x) => x.f) };
    return areaVetorial(novo.pts) < 1e-9 ? null : novo;
  };
  return { dentro: refazer(D), fora: refazer(F) };
}

/* ---------- poliedros convexos ---------- */

/* Poliedro convexo a partir das faces `{ n, pts }` (anti-horárias vistas de fora), com os vértices e a caixa. */
function poliedro(faces) {
  const P = { faces };
  const vertices = new Map();
  for (const f of faces) for (const p of f.pts) vertices.set(chaveDe(p), p);
  P.verts = [...vertices.values()];
  P.caixa = { min: [0, 1, 2].map((i) => Math.min(...P.verts.map((p) => p[i]))), max: [0, 1, 2].map((i) => Math.max(...P.verts.map((p) => p[i]))) };
  return P;
}

function volumeDe(P) {
  let v = 0;
  for (const f of P.faces) for (let i = 1; i + 1 < f.pts.length; i++) v += dot(f.pts[0], cross(f.pts[i], f.pts[i + 1])) / 6;
  return v;
}

const caixasSeCruzam = (a, b, folga = 0) => [0, 1, 2].every((i) => a.min[i] <= b.max[i] + folga && b.min[i] <= a.max[i] + folga);

function poliedroDaCaixa(min, max) {
  const [x0, y0, z0] = min; const [x1, y1, z1] = max;
  const quad = (n, pts) => ({ n, pts, fl: pts.map(() => null) });
  return poliedro([
    quad([1, 0, 0], [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]),
    quad([-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]),
    quad([0, 1, 0], [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]]),
    quad([0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]),
    quad([0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]),
    quad([0, 0, -1], [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]]),
  ]);
}

/* O casco convexo 3D de uma nuvem de pontos (incremental: a cada ponto de fora, as faces que ele enxerga saem e o horizonte
   se liga a ele), com os triângulos coplanares fundidos em uma face por plano. Devolve o poliedro, ou null se a nuvem é plana. */
export function cascoConvexo(entrada) {
  const unicos = new Map();
  for (const p of entrada) unicos.set(chaveDe(p, 1e7), p);
  const pts = [...unicos.values()];
  if (pts.length < 4) return null;
  const extensao = Math.max(...[0, 1, 2].map((i) => Math.max(...pts.map((p) => p[i])) - Math.min(...pts.map((p) => p[i]))));
  const eps = Math.max(EPS, 1e-9 * extensao);
  let i0 = 0;
  pts.forEach((p, i) => { if (p[0] < pts[i0][0] || (p[0] === pts[i0][0] && (p[1] < pts[i0][1] || (p[1] === pts[i0][1] && p[2] < pts[i0][2])))) i0 = i; });
  const maisLonge = (medida) => { let k = -1; let m = -1; pts.forEach((p, i) => { const t = medida(p); if (t > m) { m = t; k = i; } }); return { k, m }; };
  const { k: i1, m: m1 } = maisLonge((p) => distancia(p, pts[i0]));
  if (m1 < eps) return null;
  const { k: i2, m: m2 } = maisLonge((p) => norma(cross(sub(pts[i1], pts[i0]), sub(p, pts[i0]))) / m1);
  if (m2 < eps) return null;
  const n0 = unitario(cross(sub(pts[i1], pts[i0]), sub(pts[i2], pts[i0])));
  const { k: i3, m: m3 } = maisLonge((p) => Math.abs(dot(n0, sub(p, pts[i0]))));
  if (m3 < eps) return null;
  const novaFace = (a, b, c) => {
    const cr = cross(sub(pts[b], pts[a]), sub(pts[c], pts[a]));
    const area = norma(cr);
    if (area < 1e-12 * Math.max(1, extensao * extensao)) return null;
    const n = esc(cr, 1 / area);
    return { v: [a, b, c], n, d: dot(n, pts[a]) };
  };
  let faces = [];
  const tetra = [i0, i1, i2, i3];
  for (const [a, b, c, oposto] of [[0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 3, 1], [1, 2, 3, 0]]) {
    let f = novaFace(tetra[a], tetra[b], tetra[c]);
    if (dot(f.n, pts[tetra[oposto]]) - f.d > 0) f = novaFace(tetra[a], tetra[c], tetra[b]);
    faces.push(f);
  }
  for (let k = 0; k < pts.length; k++) {
    if (tetra.includes(k)) continue;
    const p = pts[k];
    const visiveis = new Set(faces.filter((f) => dot(f.n, p) - f.d > eps));
    if (visiveis.size === 0) continue;
    const arestas = new Map();
    for (const f of faces) for (let e = 0; e < 3; e++) arestas.set(`${f.v[e]}|${f.v[(e + 1) % 3]}`, f);
    const novas = [];
    let degenerada = false;
    for (const f of visiveis) {
      for (let e = 0; e < 3; e++) {
        const a = f.v[e]; const b = f.v[(e + 1) % 3];
        if (visiveis.has(arestas.get(`${b}|${a}`))) continue;
        const nf = novaFace(a, b, k);
        if (!nf) degenerada = true; else novas.push(nf);
      }
    }
    if (degenerada) continue;
    faces = [...faces.filter((f) => !visiveis.has(f)), ...novas];
  }
  const grupos = [];
  for (const f of faces) {
    const g = grupos.find((q) => dot(q.n, f.n) > 1 - 1e-9 && Math.abs(q.d - f.d) <= 1e-6 * Math.max(1, extensao));
    if (g) g.f.push(f); else grupos.push({ n: f.n, d: f.d, f: [f] });
  }
  const saida = [];
  for (const g of grupos) {
    const idx = new Set(g.f.flatMap((f) => f.v));
    const poli = poligonoNoPlano([...idx].map((i) => pts[i]), g.n);
    if (poli) saida.push({ n: g.n, pts: poli, fl: poli.map(() => null) });
  }
  return saida.length >= 4 ? poliedro(saida) : null;
}

/* O poliedro `P` dividido pelo plano `n·x = d`: `dentro` (n·x <= d) e `fora` (n·x >= d), cada um ou null (sem volume). */
function dividirPoliedro(P, n, d) {
  const sv = P.verts.map((v) => dot(n, v) - d);
  if (Math.max(...sv) <= EPS) return { dentro: P, fora: null };
  if (Math.min(...sv) >= -EPS) return { dentro: null, fora: P };
  const fd = [];
  const ff = [];
  for (const f of P.faces) {
    const r = dividirPoligono(f, n, d);
    if (r.dentro) fd.push(r.dentro);
    if (r.fora) ff.push(r.fora);
  }
  const noPlano = fd.flatMap((f) => f.pts).filter((p) => Math.abs(dot(n, p) - d) <= EPS);
  const tampa = poligonoNoPlano(noPlano, n);
  if (!tampa) return { dentro: null, fora: null };
  const monta = (faces) => {
    if (faces.length < 4) return null;
    const Q = poliedro(faces);
    return volumeDe(Q) < VOLUME_MINIMO ? null : Q;
  };
  return {
    dentro: monta([...fd, { n, pts: tampa, fl: tampa.map(() => null) }]),
    fora: monta([...ff, { n: esc(n, -1), pts: [...tampa].reverse(), fl: tampa.map(() => null) }]),
  };
}

/* `A - Q` para dois poliedros convexos: as peças convexas de `A` que ficam fora de `Q`. Sem interseção devolve `[A]`. */
function subtrairConvexo(A, Q) {
  if (!caixasSeCruzam(A.caixa, Q.caixa, EPS)) return [A];
  let resto = A;
  const saida = [];
  for (const f of Q.faces) {
    const { dentro, fora } = dividirPoliedro(resto, f.n, dot(f.n, f.pts[0]));
    if (fora) saida.push(fora);
    resto = dentro;
    if (!resto) return [A];
  }
  return saida;
}

/* O poliedro com cada face deslocada `folga` mm para fora (a interseção dos semiespaços deslocados, recortada de uma caixa grande). */
function engrossar(P, folga) {
  const margem = 100 * (folga + 1);
  let Q = poliedroDaCaixa(P.caixa.min.map((x) => x - margem), P.caixa.max.map((x) => x + margem));
  for (const f of P.faces) {
    Q = dividirPoliedro(Q, f.n, dot(f.n, f.pts[0]) + folga).dentro;
    if (!Q) return null;
  }
  return Q;
}

/* ---------- a peça convexa do gate a partir de um poliedro, e o contrário ---------- */

function direcoesUnicas(lista) {
  const mapa = new Map();
  for (const d of lista) {
    const t = norma(d);
    if (t < 1e-9) continue;
    let u = esc(d, 1 / t);
    const k = u.findIndex((c) => Math.abs(c) > 1e-9);
    if (u[k] < 0) u = esc(u, -1);
    mapa.set(u.map((c) => Math.round(c * 1e6)).join(','), u);
  }
  return [...mapa.values()];
}

/* A peça convexa que `pecasDe` devolve (vértices, normais das faces, direções das arestas e caixa) de um poliedro. */
function pecaDoPoliedro(P) {
  const arestas = [];
  for (const f of P.faces) for (let i = 0; i < f.pts.length; i++) arestas.push(sub(f.pts[(i + 1) % f.pts.length], f.pts[i]));
  return { verts: P.verts, normais: direcoesUnicas(P.faces.map((f) => f.n)), arestas: direcoesUnicas(arestas), min: P.caixa.min, max: P.caixa.max, limitaArestas: true, poliedro: P };
}

const poliedroDaPeca = (peca) => peca.poliedro ?? cascoConvexo(peca.verts);

/* ---------- leitura do campo `subtrai` ---------- */

/* O campo `subtrai` de uma forma, validado e normalizado para `[{ forma, folga?, profundidade?, lado? }]`. Antes da expansão os
   números podem ser parâmetro ou "=expressão" (`resolvido` é falso); depois têm de ser números. */
export function lerSubtrai(valor, onde, { resolvido = true } = {}) {
  const dica = '"subtrai" deve ser uma lista de formas a subtrair: "id" ou { "forma": "id", "folga": mm, "profundidade": mm, "lado": "-x" }';
  exigir(Array.isArray(valor) && valor.length > 0, `${onde}: ${dica} (veio ${JSON.stringify(valor)})`);
  const numero = (v) => (typeof v === 'number' && Number.isFinite(v)) || (!resolvido && typeof v === 'string' && v !== '');
  return valor.map((item, i) => {
    const e = typeof item === 'string' ? { forma: item } : item;
    exigir(objeto(e), `${onde}: ${dica}; o item ${i + 1} é ${JSON.stringify(item)}`);
    for (const k of Object.keys(e)) exigir(CAMPOS_DO_ITEM.includes(k), `${onde}: o item ${i + 1} de "subtrai" não tem o campo "${k}"${quisDizer(k, CAMPOS_DO_ITEM)}; campos válidos: ${CAMPOS_DO_ITEM.join(', ')}`);
    exigir(typeof e.forma === 'string' && e.forma, `${onde}: o item ${i + 1} de "subtrai" precisa de "forma", o id da forma a subtrair`);
    exigir(e.folga === undefined || (numero(e.folga) && (typeof e.folga !== 'number' || e.folga >= 0)), `${onde}: "folga" de "${e.forma}" em "subtrai" deve ser um número em mm, maior ou igual a zero (veio ${JSON.stringify(e.folga)})`);
    exigir(e.profundidade === undefined || (numero(e.profundidade) && (typeof e.profundidade !== 'number' || e.profundidade > 0)), `${onde}: "profundidade" de "${e.forma}" em "subtrai" deve ser um número em mm, maior que zero (veio ${JSON.stringify(e.profundidade)})`);
    exigir(e.lado === undefined || LADOS.includes(e.lado), `${onde}: "lado" de "${e.forma}" em "subtrai" deve ser um de ${LADOS.join(', ')}${quisDizer(e.lado, LADOS)}`);
    exigir((e.profundidade === undefined) === (e.lado === undefined), `${onde}: "profundidade" e "lado" de "${e.forma}" em "subtrai" vêm juntos: a profundidade conta a partir da face da forma no "lado" (por exemplo "-x" é a face mais ao -x dela), e sem o lado não há de onde contar`);
    return { forma: e.forma, ...(e.folga !== undefined ? { folga: e.folga } : {}), ...(e.profundidade !== undefined ? { profundidade: e.profundidade, lado: e.lado } : {}) };
  });
}

/* ---------- ligar as formas resolvidas ---------- */

/* Depois de resolvidas todas as formas de uma opção: cada forma com `subtrai` leva `r.subtrai = [{ id, r, folga?, profundidade?,
   lado? }]` com o molde já resolvido, e a caixa dela passa a ser a da forma recortada (a posição por relação das outras formas
   já leu a caixa inteira, antes do recorte). O `cortador` que nenhuma forma subtrai não é recusado (o detalhe de uma unidade pode
   deixá-lo órfão por um instante): é um achado do plano, `cortador-solto`. */
export function anexarRecortes(rs, rotulo) {
  const porId = new Map(rs.map((r) => [r.id, r]));
  const carvadas = rs.filter((r) => r.forma.subtrai !== undefined);
  for (const r of carvadas) {
    const onde = `${rotulo}, forma "${r.id}"`;
    r.subtrai = lerSubtrai(r.forma.subtrai, onde).map((e) => {
      exigir(porId.has(e.forma), `${onde}: "subtrai" cita "${e.forma}", que não existe nesta opção${quisDizer(e.forma, [...porId.keys()])} (ids: ${[...porId.keys()].join(', ')})`);
      exigir(e.forma !== r.id, `${onde}: uma forma não subtrai a si mesma`);
      return { id: e.forma, r: porId.get(e.forma), ...(e.folga ? { folga: e.folga } : {}), ...(e.profundidade !== undefined ? { profundidade: e.profundidade, lado: e.lado } : {}) };
    });
  }
  for (const r of rs) exigir(r.forma.cortador === undefined || r.forma.cortador === true, `${rotulo}, forma "${r.id}": "cortador" deve ser true (a forma é só o molde de um recorte)`);
  const estado = new Map();
  const visitar = (r, pilha) => {
    if (estado.get(r) === 2) return;
    exigir(estado.get(r) !== 1, `${rotulo}: o recorte é circular (${[...pilha, r.id].join(' subtrai ')})`);
    estado.set(r, 1);
    for (const e of r.subtrai ?? []) visitar(e.r, [...pilha, r.id]);
    estado.set(r, 2);
    if (r.subtrai) {
      const pecas = pecasDe(r);
      exigir(pecas.length > 0, `${rotulo}, forma "${r.id}": o recorte remove a forma inteira; confira a posição e o tamanho de ${r.subtrai.map((e) => `"${e.id}"`).join(', ')}`);
      r.min = [0, 1, 2].map((i) => Math.min(...pecas.map((p) => p.min[i])));
      r.max = [0, 1, 2].map((i) => Math.max(...pecas.map((p) => p.max[i])));
    }
  };
  for (const r of carvadas) visitar(r, []);
  return rs;
}

/* A cópia deslocada de uma forma recortada (a explosão) leva os moldes junto: o vão anda com a forma. */
export function deslocarRecorte(r, delta, deslocar) {
  return r.subtrai ? r.subtrai.map((e) => ({ ...e, r: deslocar(e.r, delta) })) : r.subtrai;
}

/* ---------- os moldes e as peças convexas da forma recortada ---------- */

const memoMoldes = new WeakMap();

/* Os poliedros convexos do molde de `r`, com a folga e a fatia de profundidade já aplicadas, cada um com o id do molde (`dono`). */
function moldesDe(r) {
  if (memoMoldes.has(r)) return memoMoldes.get(r);
  const saida = [];
  for (const e of r.subtrai) {
    let pcs = pecasDe(e.r).map(poliedroDaPeca).filter(Boolean);
    if (e.folga) pcs = pcs.map((p) => engrossar(p, e.folga) ?? p);
    if (e.profundidade !== undefined) {
      /* a profundidade conta a partir da face da forma inteira no `lado`: o molde pode passar da face para fora, e só a fatia que entra
         `profundidade` mm na forma corta */
      const u = unitario(LADOS_EM_VETOR[e.lado]);
      const face = Math.max(...pecasSemRecorte(r).flatMap((p) => p.verts.map((v) => dot(u, v))));
      pcs = pcs.map((p) => dividirPoliedro(p, esc(u, -1), -(face - e.profundidade)).dentro).filter(Boolean);
    }
    for (const p of pcs) saida.push({ ...p, dono: e.id });
  }
  memoMoldes.set(r, saida);
  return saida;
}
const LADOS_EM_VETOR = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1] };

/* As peças convexas de uma forma recortada, no formato de `pecasDe`. A peça que nenhum molde toca fica como estava (a original,
   com as normais e as arestas exatas dela); a que o molde corta vira as peças convexas do que sobra. */
export function pecasRecortadas(r) {
  const moldes = moldesDe(r);
  const saida = [];
  for (const peca of pecasSemRecorte(r)) {
    if (!moldes.some((q) => caixasSeCruzam(peca, q.caixa, EPS))) { saida.push(peca); continue; }
    const P = poliedroDaPeca(peca);
    if (!P) { saida.push(peca); continue; }
    let atual = [P];
    for (const q of moldes) atual = atual.flatMap((A) => subtrairConvexo(A, q));
    if (atual.length === 1 && atual[0] === P) saida.push(peca); else saida.push(...atual.map(pecaDoPoliedro));
  }
  return saida;
}

const volumeDasPecas = (pecas) => pecas.reduce((acc, p) => acc + volumeDe(poliedroDaPeca(p) ?? { faces: [] }), 0);

/* O que o recorte fez, para a leitura em texto e para o plano: o volume antes e depois, e por molde o volume que ele sozinho
   retira (zero é um molde que não toca a forma). O volume é a soma das peças convexas e vale para o sólido de peças que não se
   sobrepõem (o tubo, de partes que se cruzam nas juntas, conta a junta duas vezes). */
export function resumoDoRecorte(r) {
  const cheia = pecasSemRecorte(r);
  const volumeCheio = volumeDasPecas(cheia);
  const volume = volumeDasPecas(pecasDe(r));
  const polis = cheia.map(poliedroDaPeca).filter(Boolean);
  const moldes = moldesDe(r);
  const cortadores = r.subtrai.map((e) => {
    const sozinho = moldes.filter((q) => q.dono === e.id);
    const resto = polis.flatMap((P) => sozinho.reduce((atual, q) => atual.flatMap((A) => subtrairConvexo(A, q)), [P]));
    const retirado = volumeCheio - resto.reduce((acc, P) => acc + volumeDe(P), 0);
    return { id: e.id, ...(e.folga ? { folga: e.folga } : {}), ...(e.profundidade !== undefined ? { profundidade: e.profundidade, lado: e.lado } : {}), retiradoMm3: Math.max(0, retirado) };
  });
  return { volumeCheioMm3: volumeCheio, volumeMm3: volume, retiradoMm3: Math.max(0, volumeCheio - volume), pecas: pecasDe(r).length, cortadores };
}

/* ---------- a fronteira: o que o desenho e a seção precisam ---------- */

const OLHO_DA_FRONTEIRA = unitario([0.5412, 0.3377, 0.7697]);
const OLHOS_DA_FRONTEIRA = [OLHO_DA_FRONTEIRA, esc(OLHO_DA_FRONTEIRA, -1)];

/* Uma face do desenho (anel externo e furos) como polígonos convexos planos: o que já é convexo e plano fica, e o resto vira
   triângulos (earcut no plano da normal). */
function polignosConvexos(pts, furos, n) {
  const convexo = (q) => {
    const m = q.length;
    for (let i = 0; i < m; i++) {
      const c = cross(sub(q[(i + 1) % m], q[i]), sub(q[(i + 2) % m], q[(i + 1) % m]));
      if (dot(c, n) < -1e-9 * Math.max(1, norma(c))) return false;
    }
    return true;
  };
  const plano = (q) => q.every((p) => Math.abs(dot(n, sub(p, q[0]))) < 1e-6 * Math.max(1, ...q.map((x) => norma(sub(x, q[0])))));
  if (furos.length === 0 && convexo(pts) && plano(pts)) return [{ pts, n }];
  const [e1, e2] = baseDoPlano(n);
  const todos = [...pts, ...furos.flat()];
  const buracos = [];
  let acc = pts.length;
  for (const fu of furos) { buracos.push(acc); acc += fu.length; }
  const idx = earcut(todos.flatMap((p) => [dot(p, e1), dot(p, e2)]), buracos, 2);
  const saida = [];
  for (let i = 0; i < idx.length; i += 3) {
    const tri = [todos[idx[i]], todos[idx[i + 1]], todos[idx[i + 2]]];
    saida.push({ pts: dot(cross(sub(tri[1], tri[0]), sub(tri[2], tri[0])), n) >= 0 ? tri : [tri[0], tri[2], tri[1]], n });
  }
  return saida.filter((t) => areaVetorial(t.pts) > 1e-9);
}

/* A superfície inteira da forma sem recorte (todas as faces, vistas por dois olhos opostos), em polígonos convexos. É a superfície que o
   desenho da forma inteira mostra, com as pontas das juntas de curva do tubo esquadradas (`esquadrar`): sem isso cada trecho de uma
   curva ficava um prisma reto, e entre dois trechos sobrava uma fresta em cunha por onde se via o fundo. */
function superficieBase(r) {
  const saida = [];
  for (const olho of OLHOS_DA_FRONTEIRA) {
    for (const ch of fatiarForma(r, olho, { semFatias: true, maxFatias: 1, semRecorte: true, esquadrar: true })) {
      for (const f of [...ch.lados, ...ch.dentro, ...ch.tampas]) {
        const furos = f.furos && f.furos.length > 0 ? f.furos : f.furo ? [f.furo] : [];
        for (const q of polignosConvexos(f.pts, furos, f.n)) saida.push({ pts: q.pts, n: f.n, fl: q.pts.map(() => null) });
      }
    }
  }
  return saida;
}

/* Divide o polígono pelas faces do poliedro `Q` em sequência. `fora` são os pedaços fora de `Q` e `dentro` o que sobra dentro de
   todas as faces. Um pedaço sobre o plano de uma face decide pela `regra(c)`, em que `c` é o cosseno entre a normal dele e a da
   face: verdadeiro é dentro (fica no resto) e falso é fora. */
function separarPor(poli, Q, regra) {
  let resto = poli;
  const fora = [];
  for (const f of Q.faces) {
    const d = dot(f.n, f.pts[0]);
    if (resto.pts.every((p) => Math.abs(dot(f.n, p) - d) <= EPS)) {
      if (regra(dot(resto.n, f.n))) continue;
      fora.push(resto);
      resto = null;
      break;
    }
    const r = dividirPoligono(resto, f.n, d);
    if (r.fora) fora.push(r.fora);
    resto = r.dentro;
    if (!resto) break;
  }
  /* o polígono que não entra em `Q` fica inteiro: os planos das faces de `Q` só dividem o que ele de fato corta */
  if (!resto) return { fora: [poli], dentro: [] };
  return { fora, dentro: [resto] };
}

/* A fronteira da união dos moldes: as faces de cada molde sem o que está dentro de outro (a emenda entre duas peças do mesmo molde
   não é parede). Duas faces coplanares de mesmo sentido contam uma vez, e as de sentido oposto somem. Cada aresta leva o vizinho
   dela (a normal do outro polígono que a divide), para o vinco ser desenhado. */
function fronteiraDaUniao(moldes) {
  const faces = [];
  moldes.forEach((Q, i) => {
    for (const f of Q.faces) {
      let pedacos = [{ pts: f.pts, n: f.n, fl: f.pts.map(() => null) }];
      moldes.forEach((O, j) => {
        if (j === i || pedacos.length === 0 || !caixasSeCruzam(Q.caixa, O.caixa, EPS)) return;
        pedacos = pedacos.flatMap((p) => separarPor(p, O, (c) => (c < 0 ? true : c > 0 ? j < i : false)).fora);
      });
      faces.push(...pedacos);
    }
  });
  const chaveDaAresta = (a, b) => { const x = chaveDe(a, 1e3); const y = chaveDe(b, 1e3); return x < y ? `${x}|${y}` : `${y}|${x}`; };
  const porAresta = new Map();
  faces.forEach((f, i) => f.pts.forEach((p, e) => {
    const k = chaveDaAresta(p, f.pts[(e + 1) % f.pts.length]);
    if (!porAresta.has(k)) porAresta.set(k, []);
    porAresta.get(k).push(i);
  }));
  faces.forEach((f, i) => {
    f.fl = f.pts.map((p, e) => {
      const outro = (porAresta.get(chaveDaAresta(p, f.pts[(e + 1) % f.pts.length])) ?? []).find((j) => j !== i);
      return { viz: outro === undefined ? null : faces[outro].n };
    });
  });
  return faces;
}

/* O trecho do segmento [p, q] dentro do poliedro convexo `Q` (com a tolerância), como intervalo de t, ou null. */
function dentroDo(p, q, Q) {
  let t0 = 0; let t1 = 1;
  for (const f of Q.faces) {
    const d = dot(f.n, f.pts[0]);
    const sp = dot(f.n, p) - d - EPS; const sq = dot(f.n, q) - d - EPS;
    if (sp > 0 && sq > 0) return null;
    if (sp > 0) t0 = Math.max(t0, sp / (sp - sq));
    else if (sq > 0) t1 = Math.min(t1, sp / (sp - sq));
    if (t0 >= t1) return null;
  }
  return [t0, t1];
}

/* O segmento sem o que está dentro de algum molde: os pedaços de fora. */
function segmentoForaDe(p, q, moldes) {
  const intervalos = moldes.map((Q) => dentroDo(p, q, Q)).filter(Boolean).sort((a, b) => a[0] - b[0]);
  const saida = [];
  let t = 0;
  for (const [a, b] of intervalos) {
    if (a > t) saida.push([t, a]);
    t = Math.max(t, b);
  }
  if (t < 1) saida.push([t, 1]);
  const ponto = (s) => [p[0] + s * (q[0] - p[0]), p[1] + s * (q[1] - p[1]), p[2] + s * (q[2] - p[2])];
  return saida.map(([a, b]) => [ponto(a), ponto(b)]).filter(([a, b]) => distancia(a, b) > 1e-3);
}

/* O segmento [a, b] (no plano do polígono convexo `poli`) cortado para dentro do polígono, com a tolerância, ou null. */
function segmentoNoPoligono(a, b, poli) {
  let t0 = 0; let t1 = 1;
  const N = poli.pts.length;
  for (let i = 0; i < N; i++) {
    const e = sub(poli.pts[(i + 1) % N], poli.pts[i]);
    const m = cross(poli.n, e);
    const t = norma(m) || 1;
    const sa = dot(m, sub(a, poli.pts[i])) / t + 1e-4; const sb = dot(m, sub(b, poli.pts[i])) / t + 1e-4;
    if (sa < 0 && sb < 0) return null;
    if (sa < 0) t0 = Math.max(t0, sa / (sa - sb));
    else if (sb < 0) t1 = Math.min(t1, sa / (sa - sb));
    if (t0 >= t1) return null;
  }
  const ponto = (s) => [a[0] + s * (b[0] - a[0]), a[1] + s * (b[1] - a[1]), a[2] + s * (b[2] - a[2])];
  return [ponto(t0), ponto(t1)];
}

/* A interseção de dois polígonos convexos que não são coplanares: o segmento comum, ou null. */
function intersecaoDePoligonos(P, F) {
  const dP = dot(P.n, P.pts[0]);
  const s = F.pts.map((p) => dot(P.n, p) - dP);
  if (s.every((x) => Math.abs(x) <= EPS) || s.every((x) => x > EPS) || s.every((x) => x < -EPS)) return null;
  const cruz = [];
  for (let i = 0; i < F.pts.length; i++) {
    const j = (i + 1) % F.pts.length;
    if (Math.abs(s[i]) <= EPS) cruz.push(F.pts[i]);
    else if (s[i] * s[j] < 0) { const t = s[i] / (s[i] - s[j]); cruz.push(soma(F.pts[i], esc(sub(F.pts[j], F.pts[i]), t))); }
  }
  let melhor = null;
  for (let i = 0; i < cruz.length; i++) for (let j = i + 1; j < cruz.length; j++) {
    const t = distancia(cruz[i], cruz[j]);
    if (!melhor || t > melhor.t) melhor = { a: cruz[i], b: cruz[j], t };
  }
  if (!melhor || melhor.t < 1e-3) return null;
  return segmentoNoPoligono(melhor.a, melhor.b, P);
}

/* O polígono visto do outro lado (a parede do vão olha para dentro do vão): a ordem dos pontos e a normal invertem, e a marca de cada
   aresta acompanha a aresta, que agora corre no sentido contrário. */
function invertida(poli) {
  const N = poli.pts.length;
  return { ...poli, pts: [...poli.pts].reverse(), n: esc(poli.n, -1), fl: poli.pts.map((_, j) => poli.fl[(N - 2 - j + N) % N]) };
}

const memoFronteira = new WeakMap();

/* A fronteira da forma recortada, independente do olho: `{ faces, moldes }`. Cada face é `{ pts, n, fl, rim, parede }`: `rim` guarda
   os segmentos em que a superfície encontra o vão (o contorno da porta, a boca do alojamento) que caem sobre ela. */
function fronteiraDe(r) {
  if (memoFronteira.has(r)) return memoFronteira.get(r);
  const moldes = moldesDe(r);
  const base = superficieBase(r);
  const caixaMolde = { min: [0, 1, 2].map((i) => Math.min(...moldes.map((q) => q.caixa.min[i]))), max: [0, 1, 2].map((i) => Math.max(...moldes.map((q) => q.caixa.max[i]))) };
  const sup = [];
  base.forEach((P, i) => {
    let pedacos = [{ ...P, origem: i }];
    for (const Q of moldes) pedacos = pedacos.flatMap((p) => separarPor(p, Q, (c) => c > 0).fora);
    sup.push(...pedacos);
  });
  const paredesDoMolde = fronteiraDaUniao(moldes);
  const cheia = pecasSemRecorte(r).map(poliedroDaPeca).filter(Boolean);
  const paredes = [];
  paredesDoMolde.forEach((F, j) => {
    let restos = [{ ...F, origem: j }];
    for (const A of cheia) {
      const proximos = [];
      for (const p of restos) {
        const sep = separarPor(p, A, (c) => c < 0);
        for (const d of sep.dentro) paredes.push({ ...invertida(d), origem: j, parede: true });
        proximos.push(...sep.fora);
      }
      restos = proximos;
    }
  });
  /* o contorno: onde a superfície original encontra a parede do molde */
  const rims = [];
  base.forEach((P, i) => {
    if (!caixasSeCruzam({ min: P.pts[0].map((_, k) => Math.min(...P.pts.map((p) => p[k]))), max: P.pts[0].map((_, k) => Math.max(...P.pts.map((p) => p[k]))) }, caixaMolde, EPS)) return;
    paredesDoMolde.forEach((F, j) => { const s = intersecaoDePoligonos(P, F); if (s) rims.push({ s, i, j }); });
  });
  const porOrigem = (lista) => { const m = new Map(); for (const f of lista) { if (!m.has(f.origem)) m.set(f.origem, []); m.get(f.origem).push(f); } return m; };
  const supPorOrigem = porOrigem(sup);
  const paredesPorOrigem = porOrigem(paredes);
  const anexar = (f, s) => { const c = segmentoNoPoligono(s[0], s[1], f); if (c && distancia(c[0], c[1]) > 1e-3) (f.rim ??= []).push(c); };
  for (const { s, i, j } of rims) {
    for (const f of supPorOrigem.get(i) ?? []) anexar(f, s);
    for (const f of paredesPorOrigem.get(j) ?? []) anexar(f, s);
  }
  const saida = { faces: repararJuncoes([...sup, ...paredes]), moldes };
  memoFronteira.set(r, saida);
  return saida;
}

/* A superfície dividida pelos planos do molde deixa um vértice de um pedaço no meio da aresta do pedaço vizinho (junção em T), e a
   rasterização deixa um fio de fresta ali. O vértice é inserido na aresta do vizinho (um ponto sobre a aresta não muda a face
   convexa) para as duas faces terem os mesmos vértices. */
function repararJuncoes(faces) {
  const unicos = new Map();
  for (const f of faces) for (const p of f.pts) unicos.set(chaveDe(p, 1e4), p);
  /* os vértices por x, para olhar de cada aresta só os que caem na faixa de x dela */
  const porX = [...unicos.values()].sort((a, b) => a[0] - b[0]);
  const primeiroDeX = (x) => { let lo = 0; let hi = porX.length; while (lo < hi) { const m = (lo + hi) >> 1; if (porX[m][0] < x) lo = m + 1; else hi = m; } return lo; };
  for (const f of faces) {
    f.pts = [...f.pts];
    f.fl = [...f.fl];
    for (let i = 0; i < f.pts.length; i++) {
      const a = f.pts[i]; const b = f.pts[(i + 1) % f.pts.length];
      const ab = sub(b, a);
      const t2 = dot(ab, ab);
      if (t2 < 1e-6) continue;
      const lo = [0, 1, 2].map((k) => Math.min(a[k], b[k]) - 1e-3);
      const hi = [0, 1, 2].map((k) => Math.max(a[k], b[k]) + 1e-3);
      const dentro = [];
      for (let k = primeiroDeX(lo[0]); k < porX.length && porX[k][0] <= hi[0]; k++) {
        const p = porX[k];
        if (p[1] < lo[1] || p[1] > hi[1] || p[2] < lo[2] || p[2] > hi[2]) continue;
        const t = dot(sub(p, a), ab) / t2;
        if (t <= 1e-6 || t >= 1 - 1e-6) continue;
        if (distancia(p, soma(a, esc(ab, t))) < 1e-3) dentro.push({ t, p });
      }
      if (dentro.length === 0) continue;
      dentro.sort((u, v) => u.t - v.t);
      f.pts.splice(i + 1, 0, ...dentro.map((d) => d.p));
      f.fl.splice(i + 1, 0, ...dentro.map(() => f.fl[i]));
      i += dentro.length;
    }
  }
  return faces;
}

/* ---------- o desenho e a seção ---------- */

/* As linhas que o desenho da forma sem recorte traz nessa vista (silhuetas, vincos, arcos das bordas e o contorno das tampas),
   segmento a segmento e sem repetir. */
function linhasDaBase(r, olho, opcoes) {
  const vistas = new Map();
  const juntar = (a, b) => {
    const x = chaveDe(a, 1e3); const y = chaveDe(b, 1e3);
    if (x === y) return;
    const k = x < y ? `${x}|${y}` : `${y}|${x}`;
    if (!vistas.has(k)) vistas.set(k, [a, b]);
  };
  const anel = (pts, fechado) => { for (let i = 0; i + (fechado ? 0 : 1) < pts.length; i++) juntar(pts[i], pts[(i + 1) % pts.length]); };
  for (const ch of fatiarForma(r, olho, { ...opcoes, semRecorte: true })) {
    for (const [a, b] of ch.linhas ?? []) juntar(a, b);
    for (const arco of ch.arcos ?? []) anel(arco, false);
    for (const f of [...ch.lados, ...ch.dentro]) for (const [a, b] of f.linhas ?? []) juntar(a, b);
    for (const t of ch.tampas) for (const a of [t.pts, ...(t.furos && t.furos.length > 0 ? t.furos : t.furo ? [t.furo] : [])]) anel(a, true);
  }
  return [...vistas.values()];
}

/* Acima deste número de faces a ordem de desenho vem da profundidade do centro de cada uma, e não do cruzamento de todas com todas. */
const LIMITE_DA_ORDEM = 1500;
/* Amostras por segmento no teste de oclusão das linhas, e passos da bissecção que acha onde a oclusão começa. */
const AMOSTRAS_DA_LINHA = 16;
const PASSOS_DA_BISSECCAO = 8;
/* Um ponto é coberto quando o raio dele até o olho atravessa, a mais de tanto de distância, uma face voltada para o olho. */
const DISTANCIA_MINIMA_DA_OCLUSAO = 0.01;

/* As faces voltadas para o olho com a caixa delas na tela (s, t), para o teste de oclusão só olhar as que cobrem o ponto. */
function facesNaTela(faces, olho) {
  const apoio = Math.abs(olho[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const S = unitario(cross(olho, apoio));
  const T = cross(olho, S);
  return {
    S, T,
    itens: faces.map((f) => {
      const ss = f.pts.map((p) => dot(p, S)); const tt = f.pts.map((p) => dot(p, T));
      return { f, dn: dot(f.n, olho), s0: Math.min(...ss) - 1e-6, s1: Math.max(...ss) + 1e-6, t0: Math.min(...tt) - 1e-6, t1: Math.max(...tt) + 1e-6 };
    }),
  };
}

/* O ponto `p` está atrás de alguma das faces (convexas, voltadas para o olho)? */
function coberto(p, olho, tela) {
  const s = dot(p, tela.S); const t = dot(p, tela.T);
  for (const { f, dn, s0, s1, t0, t1 } of tela.itens) {
    if (s < s0 || s > s1 || t < t0 || t > t1) continue;
    const d = (dot(f.n, f.pts[0]) - dot(f.n, p)) / dn;
    if (d <= DISTANCIA_MINIMA_DA_OCLUSAO) continue;
    const x = [p[0] + d * olho[0], p[1] + d * olho[1], p[2] + d * olho[2]];
    let dentro = true;
    for (let i = 0; i < f.pts.length && dentro; i++) {
      const e = sub(f.pts[(i + 1) % f.pts.length], f.pts[i]);
      if (dot(cross(f.n, e), sub(x, f.pts[i])) < -1e-6 * (1 + norma(e))) dentro = false;
    }
    if (dentro) return true;
  }
  return false;
}

/* O trecho de cada segmento que se vê: as linhas do contorno do vão e dos vincos das paredes ficam atrás da superfície da própria
   forma onde o vão está escondido, e o desenho com teste de profundidade deita a fita na superfície mais perto do olho sob ela, de
   modo que uma linha escondida precisa sair daqui. */
function linhasVisiveis(linhas, tela, olho) {
  const saida = [];
  for (const [p, q] of linhas) {
    const ponto = (t) => [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]), p[2] + t * (q[2] - p[2])];
    const escondido = (t) => coberto(ponto(t), olho, tela);
    const estados = Array.from({ length: AMOSTRAS_DA_LINHA }, (_, k) => escondido((k + 0.5) / AMOSTRAS_DA_LINHA));
    if (estados.every((e) => !e)) { saida.push([p, q]); continue; }
    if (estados.every(Boolean)) continue;
    /* onde o estado muda entre duas amostras, a bissecção acha o ponto */
    const fronteira = (a, b, ea) => {
      let lo = a; let hi = b;
      for (let i = 0; i < PASSOS_DA_BISSECCAO; i++) { const m = (lo + hi) / 2; if (escondido(m) === ea) lo = m; else hi = m; }
      return (lo + hi) / 2;
    };
    let inicio = estados[0] ? null : 0;
    for (let k = 1; k < AMOSTRAS_DA_LINHA; k++) {
      if (estados[k] === estados[k - 1]) continue;
      const t = fronteira((k - 0.5) / AMOSTRAS_DA_LINHA, (k + 0.5) / AMOSTRAS_DA_LINHA, estados[k - 1]);
      if (estados[k - 1]) inicio = t;
      else { saida.push([ponto(inicio), ponto(t)]); inicio = null; }
    }
    if (inicio !== null) saida.push([ponto(inicio), q]);
  }
  return saida.filter(([a, b]) => distancia(a, b) > 1e-3);
}

/* O que `fatiarForma` devolve para uma forma recortada: um bloco só, com a fronteira em faces convexas (uma por pedaço da superfície e
   da parede do vão), as voltadas para o olho na ordem do fundo para a frente, cada uma com as linhas que lhe cabem (o contorno do
   vão, o vinco das paredes e, na última, as linhas da forma inteira que o vão não levou). */
export function fatiasRecortadas(r, olho, opcoes = {}) {
  const { faces, moldes } = fronteiraDe(r);
  const visiveis = faces.filter((f) => dot(f.n, olho) > 1e-6);
  const centro = (f) => f.pts.reduce((acc, p) => acc + dot(p, olho), 0) / f.pts.length;
  const ordem = visiveis.length > LIMITE_DA_ORDEM ? visiveis.map((_, i) => i).sort((a, b) => centro(visiveis[a]) - centro(visiveis[b]) || a - b) : ordemDasFaces(visiveis, olho);
  const tela = facesNaTela(visiveis, olho);
  const lados = ordem.map((i) => {
    const f = visiveis[i];
    const linhas = [...(f.rim ?? [])];
    if (f.parede) f.pts.forEach((p, e) => { const m = f.fl[e]; if (m && m.viz && dot(esc(f.n, -1), m.viz) < COS25) linhas.push([p, f.pts[(e + 1) % f.pts.length]]); });
    return { papel: 'lado', n: f.n, pts: f.pts, linhas: linhasVisiveis(linhas, tela, olho) };
  });
  const daBase = linhasVisiveis(linhasDaBase(r, olho, opcoes).flatMap(([p, q]) => segmentoForaDe(p, q, moldes)), tela, olho);
  if (lados.length > 0) lados[lados.length - 1].linhas.push(...daBase);
  return [{ r, prof: dot(r.centro, olho), lados, dentro: [], linhas: [], arcos: [], tampas: [] }];
}

/* A seção da forma recortada por um plano de corte: os laços do plano sobre a fronteira inteira (a parede do vão entra, e por isso o
   vão aparece como furo ou como entalhe no contorno). */
export function secaoRecortada(r, corte) {
  const lacos = lacosDoPlano(fronteiraDe(r).faces, corte);
  return lacos.length > 0 ? [lacos] : [];
}
