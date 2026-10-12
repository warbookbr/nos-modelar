/* Malha: o sólido que vem de fora do esboço como superfície, uma lista de polígonos planos sobre vértices em milímetro. É a
   forma que uma família procedural (roda-pneu, cilindro-hidraulico, a asa) entrega ao esboço (ver `familia.js`), mas o
   módulo só conhece a malha: não importa o núcleo, nem Three.js, nem a família. Quem a gera é um adaptador, e o que ele
   entrega é este dado simples, que as leituras seguintes tratam como qualquer outro sólido do esboço.

   O DADO (`mecanifica.malha@1`): `vertices` [[x, y, z], ...] e `faces` [[i, j, k, ...], ...], cada face um polígono plano de 3
   ou mais vértices em sentido anti-horário visto de fora (o sentido de uma malha com volume positivo; a leitura inverte a
   malha inteira cujo volume sai negativo). Opcionais: `partes` [{ nome, de, ate }] (as faces de `de` até `ate`, sem incluí-lo,
   são da parte), `ancoras` { nome: [x, y, z] } (os pontos nomeados que a forma expõe, como as portas da família) e os
   metadados que o `--descrever` mostra (`familia`, `perfil`, `portas`). A origem do dado não importa: a leitura recentra a
   malha no centro da caixa dela (a origem de toda forma do esboço) e leva as âncoras junto.

   O QUE A LEITURA DÁ: a caixa, o volume (pelo teorema da divergência) e a normal de cada face. O desenho usa as faces; as
   linhas de contorno saem das arestas de silhueta e de vinco (ver `fatiarMalha`). O gate de contato usa as peças convexas
   de `pecasLocaisDaMalha`.

   AS PEÇAS CONVEXAS. O gate mede distância (GJK) e penetração (SAT) entre peças convexas, e uma malha qualquer (um pneu com o
   furo do aro, um tubo com a haste por dentro) não é convexa: o casco da roda inteira tapa o furo onde o eixo entra. A
   decomposição é a mesma ideia do Hertel-Mehlhorn do resto do módulo, só que no espaço e sem hipótese sobre a forma: cada parte
   é cortada por planos paralelos aos eixos até o casco convexo de cada pedaço quase não esconder volume. A medida é a
   concavidade: a maior distância de um vértice da superfície ao casco do pedaço por dentro (um vértice na superfície do casco
   tem concavidade zero, o da parede do furo de um tubo tem o raio do furo). O pedaço para de ser cortado quando a concavidade
   cai abaixo de `CONCAVIDADE_RELATIVA` da diagonal da forma (com o mínimo de `CONCAVIDADE_MINIMA_MM`), e então o casco dele é
   uma peça do gate. O corte é exato sobre as faces (Sutherland-Hodgman no espaço), então um pedaço de superfície plana ou
   convexa fica com o casco exato; só o côncavo, e só até a concavidade aceita, é coberto a mais. O erro é de projeto e
   conhecido: um corpo que toque uma parede côncava de raio grande vê a parede até `concavidade` mm mais perto do que ela está.
   O que fica de fora: o sólido sem superfície (um corpo inteiro dentro de um fechado que não toca a parede) e o detalhe menor
   que a concavidade, que o desenho mostra e o gate não vê. Cada parte tem um orçamento de peças (`PECAS_POR_PARTE`): a que passa dele,
   como a asa de 13 m do avião, fica com o vazio dos pedaços mais rasos que sobraram, e o gate vê a parte um pouco mais gorda. A
   decomposição é determinística: a mesma malha dá as mesmas peças, na mesma ordem.

   Puro: não lê arquivo e não guarda estado além da memória por malha lida. */
import { ErroDeEsboco } from './index.js';
import { decomporEmPecas } from './decomposicao-convexa.js';

const EIXOS = ['x', 'y', 'z'];
const LADOS = ['+x', '-x', '+y', '-y', '+z', '-z'];
const NOMES_RESERVADOS = ['centro', 'inicio', 'fim', ...LADOS];
export const FORMATO_DA_MALHA = 'mecanifica.malha@1';
/* A concavidade que um pedaço pode esconder no casco: esta fração da diagonal da forma, e nunca menos que o mínimo em mm. */
export const CONCAVIDADE_RELATIVA = 0.0025;
export const CONCAVIDADE_MINIMA_MM = 0.2;
/* O orçamento de peças convexas de cada parte: a decomposição corta o pedaço de vazio mais fundo primeiro e, passando disto, deixa os
   pedaços que sobram como estão (a asa de 13 m do avião pediria centenas de peças pela concavidade, e sai com estas). */
const PECAS_POR_PARTE = 160;
/* Dois vértices a menos disto, em mm, são o mesmo vértice. */
const SOLDA_MM = 1e-4;
/* Uma aresta é vinco (desenhada mesmo sem ser silhueta) quando as normais das duas faces fazem mais que este ângulo. */
const COS_DO_VINCO = Math.cos((40 * Math.PI) / 180);

const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const aplicar = (v, m) => (m ? [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]] : v);
const ponto3 = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);

/* A normal unitária de um polígono (Newell), ou null se ele não tem área. */
function normalDe(pts) {
  let nx = 0; let ny = 0; let nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const t = Math.hypot(nx, ny, nz);
  return t > 1e-12 ? [nx / t, ny / t, nz / t] : null;
}

/* ---------- a leitura ---------- */

/* A malha lida: vértices e âncoras recentrados, normais das faces, caixa e volume. É um objeto de classe só para o
   `toJSON` devolver um resumo e a malha inteira (milhares de vértices) não entrar em manifesto nem em dump do esboço. */
export class Malha {
  constructor(campos) {
    Object.assign(this, campos);
  }

  /* FNV-1a de 32 bits sobre os vértices (a 0,001 mm), as faces e as âncoras: o resumo do `toJSON` entra no hash das imagens, e uma
     família que muda a geometria sem mudar as contagens nem o volume tem de mudar o hash. */
  get impressao() {
    if (this.impressaoDaMalha === undefined) {
      let h = 0x811c9dc5;
      const misturar = (n) => { h ^= n & 0xffff; h = Math.imul(h, 0x01000193) >>> 0; h ^= (n >>> 16) & 0xffff; h = Math.imul(h, 0x01000193) >>> 0; };
      const milesimo = (x) => Math.round(x * 1000) | 0;
      for (const v of this.vertices) for (const c of v) misturar(milesimo(c));
      for (const f of this.faces) { misturar(f.length); for (const i of f) misturar(i); }
      for (const nome of Object.keys(this.ancoras)) { for (const c of nome) misturar(c.charCodeAt(0)); for (const c of this.ancoras[nome]) misturar(milesimo(c)); }
      this.impressaoDaMalha = h.toString(16).padStart(8, '0');
    }
    return this.impressaoDaMalha;
  }

  toJSON() {
    return {
      formato: FORMATO_DA_MALHA,
      ...(this.familia === undefined ? {} : { familia: this.familia }),
      ...(this.perfil === undefined ? {} : { perfil: this.perfil }),
      vertices: this.vertices.length,
      faces: this.faces.length,
      partes: this.partes.map((p) => p.nome),
      ancoras: Object.keys(this.ancoras),
      volume_mm3: Math.round(this.volume),
      impressao: this.impressao,
    };
  }
}

const memoLeitura = new WeakMap();

/* Lê e valida o dado da malha. `dado` pode já ser uma `Malha`. Recusa com o campo e o que é válido. */
export function lerMalha(dado, onde = 'malha') {
  if (dado instanceof Malha) return dado;
  if (objeto(dado) && memoLeitura.has(dado)) return memoLeitura.get(dado);
  exigir(objeto(dado), `${onde}: a malha deve ser { "vertices": [[x, y, z], ...], "faces": [[i, j, k, ...], ...] } em mm`);
  const extras = Object.keys(dado).filter((k) => !['formato', 'vertices', 'faces', 'partes', 'ancoras', 'familia', 'perfil', 'versao', 'parametros', 'portas', 'eixo'].includes(k));
  exigir(extras.length === 0, `${onde}: a malha não tem o campo "${extras[0]}" (campos: formato, vertices, faces, partes, ancoras, familia, perfil, versao, parametros, portas, eixo)`);
  exigir(dado.eixo === undefined || EIXOS.includes(dado.eixo), `${onde}: "eixo" da malha deve ser "x", "y" ou "z", o eixo principal da peça (veio ${JSON.stringify(dado.eixo)})`);
  exigir(dado.formato === undefined || dado.formato === FORMATO_DA_MALHA, `${onde}: "formato" da malha deve ser "${FORMATO_DA_MALHA}" (veio ${JSON.stringify(dado.formato)})`);
  exigir(Array.isArray(dado.vertices) && dado.vertices.length >= 4 && dado.vertices.every(ponto3), `${onde}: "vertices" deve ser uma lista de 4 ou mais [x, y, z] finitos em mm`);
  exigir(Array.isArray(dado.faces) && dado.faces.length >= 4, `${onde}: "faces" deve ser uma lista de 4 ou mais polígonos [i, j, k, ...] de índices de "vertices"`);
  const n = dado.vertices.length;
  dado.faces.forEach((f, k) => {
    exigir(Array.isArray(f) && f.length >= 3 && f.every((i) => Number.isInteger(i) && i >= 0 && i < n) && new Set(f).size === f.length, `${onde}: faces[${k}] deve ter 3 ou mais índices distintos de 0 a ${n - 1} (veio ${JSON.stringify(f)})`);
  });

  /* o centro da caixa dos vértices que as faces usam é a origem da forma, como em toda forma do esboço */
  const usados = new Set(dado.faces.flat());
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const i of usados) for (let e = 0; e < 3; e++) { min[e] = Math.min(min[e], dado.vertices[i][e]); max[e] = Math.max(max[e], dado.vertices[i][e]); }
  const centro = min.map((v, e) => (v + max[e]) / 2);
  const vertices = dado.vertices.map((v) => sub(v, centro));

  let faces = dado.faces.map((f) => [...f]);
  /* o volume pela divergência: positivo quando as faces olham para fora; negativo, a malha inteira vem ao contrário */
  const volumeDe = (fs) => {
    let v = 0;
    for (const f of fs) for (let i = 1; i + 1 < f.length; i++) v += dot(vertices[f[0]], cross(vertices[f[i]], vertices[f[i + 1]])) / 6;
    return v;
  };
  let volume = volumeDe(faces);
  if (volume < 0) { faces = faces.map((f) => [...f].reverse()); volume = -volume; }
  const normais = faces.map((f) => normalDe(f.map((i) => vertices[i])) ?? [0, 1, 0]);

  const partes = lerPartes(dado.partes, faces.length, onde);
  const ancoras = {};
  if (dado.ancoras !== undefined) {
    exigir(objeto(dado.ancoras), `${onde}: "ancoras" deve ser { nome: [x, y, z] } em mm`);
    for (const [nome, p] of Object.entries(dado.ancoras)) {
      exigir(nome && !nome.includes('.') && !nome.includes('@') && !NOMES_RESERVADOS.includes(nome), `${onde}: a âncora "${nome}" não serve: o nome não pode ser vazio, ter ponto nem arroba, nem ser um nome da forma (${NOMES_RESERVADOS.join(', ')})`);
      exigir(ponto3(p), `${onde}: a âncora "${nome}" deve ser [x, y, z] finito em mm`);
      ancoras[nome] = sub(p, centro);
    }
  }
  const caixa = { min: min.map((v, e) => v - centro[e]), max: max.map((v, e) => v - centro[e]) };
  const lida = new Malha({
    ...(dado.familia === undefined ? {} : { familia: dado.familia }), ...(dado.perfil === undefined ? {} : { perfil: dado.perfil }),
    ...(dado.versao === undefined ? {} : { versao: dado.versao }), ...(dado.parametros === undefined ? {} : { parametros: dado.parametros }),
    ...(dado.portas === undefined ? {} : { portas: dado.portas }), ...(dado.eixo === undefined ? {} : { eixo: dado.eixo }),
    vertices, faces, normais, partes, ancoras, caixa, volume, deslocamento: centro,
  });
  memoLeitura.set(dado, lida);
  return lida;
}

function lerPartes(partes, total, onde) {
  if (partes === undefined) return [{ nome: null, de: 0, ate: total }];
  exigir(Array.isArray(partes) && partes.length > 0, `${onde}: "partes" deve ser uma lista de { "nome": texto, "de": n, "ate": n } sobre os índices de "faces"`);
  const nomes = new Set();
  return partes.map((p, k) => {
    exigir(objeto(p) && typeof p.nome === 'string' && p.nome && Number.isInteger(p.de) && Number.isInteger(p.ate) && p.de >= 0 && p.ate > p.de && p.ate <= total, `${onde}: partes[${k}] deve ser { "nome": texto, "de": n, "ate": n } com 0 <= de < ate <= ${total} (veio ${JSON.stringify(p)})`);
    exigir(!nomes.has(p.nome), `${onde}: a parte "${p.nome}" está repetida`);
    nomes.add(p.nome);
    return { nome: p.nome, de: p.de, ate: p.ate };
  });
}

/* Os nomes das âncoras de uma malha, além de `centro` e das seis faces. */
export const nomesDasAncorasDaMalha = (malha) => Object.keys(malha.ancoras);

/* ---------- caixa, vértices e âncoras sob uma matriz ---------- */

/* Os vértices que as faces usam, girados por `m` (relativos ao centro). */
export function verticesDaMalha(malha, m) {
  if (!malha.usados) malha.usados = [...new Set(malha.faces.flat())].sort((a, b) => a - b);
  return malha.usados.map((i) => aplicar(malha.vertices[i], m));
}

export function caixaDaMalha(malha, m) {
  if (!m) return { min: [...malha.caixa.min], max: [...malha.caixa.max] };
  const vs = verticesDaMalha(malha, m);
  return { min: [0, 1, 2].map((e) => Math.min(...vs.map((p) => p[e]))), max: [0, 1, 2].map((e) => Math.max(...vs.map((p) => p[e]))) };
}

/* ---------- o desenho ---------- */

/* Arestas com as faces dos dois lados, pelos vértices soldados (os de partes vizinhas costumam repetir a posição com outro
   índice). Calculado uma vez por malha. */
function arestasDa(malha) {
  if (malha.arestas) return malha.arestas;
  const chave = new Map();
  const soldado = malha.vertices.map((v) => {
    const k = v.map((c) => Math.round(c / SOLDA_MM)).join(',');
    if (!chave.has(k)) chave.set(k, chave.size);
    return chave.get(k);
  });
  const porAresta = new Map();
  malha.faces.forEach((f, k) => {
    for (let i = 0; i < f.length; i++) {
      const a = f[i]; const b = f[(i + 1) % f.length];
      const sa = soldado[a]; const sb = soldado[b];
      if (sa === sb) continue;
      const id = sa < sb ? `${sa}_${sb}` : `${sb}_${sa}`;
      const e = porAresta.get(id);
      if (e) e.faces.push(k); else porAresta.set(id, { a, b, faces: [k] });
    }
  });
  malha.arestas = [...porAresta.values()].map((e) => {
    const [f0, f1] = e.faces;
    const vinco = f1 === undefined ? true : dot(malha.normais[f0], malha.normais[f1]) < COS_DO_VINCO;
    return { a: e.a, b: e.b, f0, f1: f1 ?? null, vinco };
  });
  return malha.arestas;
}

/* Os blocos de desenho da malha para o olho `olho`: as faces voltadas para quem olha, do fundo para a frente, em até
   `BLOCOS` blocos por profundidade (a oclusão final é do teste por pixel da camada, e o SVG do pintor erra só onde partes
   da mesma malha se cobrem em ordem ambígua), e as linhas: a silhueta (uma face de frente e outra de costas), o vinco e a
   borda aberta. Cada face leva a normal de mundo para a luz. */
const BLOCOS = 24;
export function fatiarMalha(r, olho, { semFatias = false } = {}) {
  const malha = r.prisma.malha;
  const m = r.matriz;
  const c = r.centro;
  const mundo = (i) => { const p = aplicar(malha.vertices[i], m); return [p[0] + c[0], p[1] + c[1], p[2] + c[2]]; };
  const cache = new Map();
  const ponto = (i) => { if (!cache.has(i)) cache.set(i, mundo(i)); return cache.get(i); };
  const normais = malha.normais.map((n) => aplicar(n, m));
  const frente = malha.faces.map((_, k) => dot(normais[k], olho) > 1e-9);
  const lados = [];
  malha.faces.forEach((f, k) => {
    if (!frente[k]) return;
    const pts = f.map(ponto);
    lados.push({ papel: 'lado', n: normais[k], pts, prof: pts.reduce((s, p) => s + dot(p, olho), 0) / pts.length, k });
  });
  lados.sort((a, b) => a.prof - b.prof || a.k - b.k);
  const nBlocos = semFatias ? 1 : Math.max(1, Math.min(BLOCOS, Math.ceil(lados.length / 120)));
  const blocos = Array.from({ length: nBlocos }, () => ({ r, prof: 0, lados: [], dentro: [], linhas: [], arcos: [], tampas: [] }));
  const alvo = new Map();
  lados.forEach((f, i) => {
    const b = Math.min(nBlocos - 1, Math.floor((i * nBlocos) / lados.length));
    blocos[b].lados.push({ papel: f.papel, n: f.n, pts: f.pts });
    alvo.set(f.k, b);
  });
  for (const b of blocos) {
    const pts = b.lados.flatMap((f) => f.pts);
    b.prof = pts.length ? pts.reduce((s, p) => s + dot(p, olho), 0) / pts.length : dot(c, olho);
  }
  for (const e of arestasDa(malha)) {
    const f0 = frente[e.f0];
    const f1 = e.f1 === null ? f0 : frente[e.f1];
    const silhueta = f0 !== f1;
    if (!silhueta && !((e.vinco) && (f0 || f1))) continue;
    const k = f0 ? e.f0 : e.f1;
    if (k === null || !alvo.has(k)) continue;
    blocos[alvo.get(k)].linhas.push([ponto(e.a), ponto(e.b)]);
  }
  return blocos.filter((b) => b.lados.length > 0 || b.linhas.length > 0);
}

/* As peças convexas da malha no referencial local (já recentrado), uma lista por parte, na ordem das partes. Cada peça é
   `{ verts, normais, arestas, min, max, limitaArestas }`. Guardada na malha: a decomposição se faz uma vez. */
export function pecasLocaisDaMalha(malha) {
  if (malha.pecas) return malha.pecas;
  const diagonal = norma(sub(malha.caixa.max, malha.caixa.min));
  const base = Math.max(CONCAVIDADE_MINIMA_MM, CONCAVIDADE_RELATIVA * diagonal);
  const contexto = malha.faces.map((f) => f.map((i) => malha.vertices[i]));
  const pecas = [];
  for (const parte of malha.partes) {
    const polis = malha.faces.slice(parte.de, parte.ate).map((f) => f.map((i) => malha.vertices[i]));
    const feitas = decomporEmPecas(polis, base, { contexto, pecas: PECAS_POR_PARTE });
    pecas.push(...feitas);
  }
  malha.pecas = pecas;
  return pecas;
}

/* As peças no mundo para a forma resolvida `r`: vértices girados por `r.matriz` e somados ao centro, normais e arestas só girados. */
export function pecasDaMalha(r) {
  const m = r.matriz;
  const c = r.centro;
  return pecasLocaisDaMalha(r.prisma.malha).map((pc) => {
    const verts = pc.verts.map((v) => { const q = aplicar(v, m); return [q[0] + c[0], q[1] + c[1], q[2] + c[2]]; });
    return {
      verts,
      normais: pc.normais.map((q) => aplicar(q, m)), arestas: pc.arestas.map((q) => aplicar(q, m)),
      min: [0, 1, 2].map((e) => Math.min(...verts.map((p) => p[e]))), max: [0, 1, 2].map((e) => Math.max(...verts.map((p) => p[e]))),
      ...(pc.limitaArestas ? { limitaArestas: true } : {}),
    };
  });
}

/* ---------- o casco por seções, para a blocagem do nível zero ---------- */

/* Quantas seções e quantos raios por seção o casco leva. 24 seções cobrem a roda e o cilindro do trem do avião sem perder o
   flange de 6 mm; 48 raios são os do loft e da revolução do esboço (o círculo inscrito fica 0,2% menor). */
export const SECOES_DO_CASCO = 24;
export const RAIOS_DO_CASCO = 48;
/* Os eixos (u, v) do plano da seção de um sólido de eixo `x`, `y` ou `z`, os mesmos do loft do esboço. */
const PLANO_DA_SECAO = { x: [2, 1], y: [0, 2], z: [0, 1] };
const r3 = (x) => { const v = Math.round(x * 1000) / 1000; return v === 0 ? 0 : v; };

/** O eixo principal da malha: o que o adaptador declarou (`eixo`, o eixo das portas da família) ou, sem ele, o da maior extensão
 *  (o primeiro, em empate). */
export function eixoDaMalha(malha) {
  if (malha.eixo !== undefined) return malha.eixo;
  const extensao = [0, 1, 2].map((e) => malha.caixa.max[e] - malha.caixa.min[e]);
  return EIXOS[extensao.indexOf(Math.max(...extensao))];
}

/* O casco convexo de pontos [u, v] (cadeia monótona), anti-horário, sem repetir o primeiro. */
function cascoPlano(pontos) {
  const p = [...pontos].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const meio = (lista) => {
    const h = [];
    for (const q of lista) { while (h.length >= 2 && cruz(h[h.length - 2], h[h.length - 1], q) <= 1e-12) h.pop(); h.push(q); }
    h.pop();
    return h;
  };
  return [...meio(p), ...meio([...p].reverse())];
}

/* A coordenada a 1e-6 mm, a mesma em que a N2 guarda um ponto do contorno: o que o módulo entrega já é o que a N2 confere. */
const r6 = (x) => { const v = Math.round(x * 1e6) / 1e6; return v === 0 ? 0 : v; };
/* Abaixo desta área (mm2, o dobro da do triângulo) três pontos seguidos do contorno contam como colineares: é 1000 vezes o limite
   com que a N2 recusa um contorno não convexo (1e-9), para o ruído de arredondar a 1e-6 mm não decidir a convexidade. */
const AREA_COLINEAR_MM2 = 1e-6;

/* O contorno de pontos já na ordem do ângulo, sobre uma curva convexa e arredondados a 1e-6 mm, sem nenhum ponto que não vire para o
   lado certo: o ponto cujos vizinhos o deixam colinear (os raios que caem na mesma aresta reta) ou côncavo (o ruído do arredondamento)
   sai e vira cópia do ponto anterior que ficou. A contagem e a ordem dos raios não mudam, de modo que o ponto `k` de uma seção continua
   o ponto `k` da seguinte, que é o que liga as seções do casco; o que a N2 confere (cada trio com área acima de 1e-9 vira para o
   mesmo lado) passa, porque cada trio que sobra vira mais de 1e-6 para o lado certo e os repetidos não contam. */
function convexificar(pontos) {
  const n = pontos.length;
  const vira = (a, b, c) => (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
  const fica = new Array(n).fill(true);
  for (let mudou = true; mudou;) {
    mudou = false;
    const indices = [...fica.keys()].filter((i) => fica[i]);
    for (let q = 0; q < indices.length && indices.length > 3; q++) {
      const a = pontos[indices[(q + indices.length - 1) % indices.length]]; const b = pontos[indices[q]]; const c = pontos[indices[(q + 1) % indices.length]];
      if (vira(a, b, c) <= AREA_COLINEAR_MM2) { fica[indices[q]] = false; mudou = true; break; }
    }
  }
  /* o ponto que saiu copia o anterior que ficou; os do começo, antes do primeiro que ficou, copiam o último (o contorno fecha) */
  let anterior = pontos[fica.lastIndexOf(true)];
  return pontos.map((p, k) => { if (fica[k]) anterior = p; return anterior; });
}

/* O polígono convexo `poli` (anti-horário) amostrado em `n` raios igualmente espaçados em ângulo a partir do centro da caixa
   dele, começando no eixo +u, e convexificado (ver `convexificar`). O centro da caixa fica dentro de um polígono convexo que a
   contenha, o que a média dos vértices não garante num polígono de lados desiguais. */
function raiosDoConvexo(poli, n) {
  const c = [0, 1].map((e) => (Math.min(...poli.map((q) => q[e])) + Math.max(...poli.map((q) => q[e]))) / 2);
  const saida = [];
  for (let k = 0; k < n; k++) {
    const a = (2 * Math.PI * k) / n;
    const d = [Math.cos(a), Math.sin(a)];
    let melhor = 0;
    for (let i = 0; i < poli.length; i++) {
      const p = poli[i]; const q = poli[(i + 1) % poli.length];
      const e = [q[0] - p[0], q[1] - p[1]];
      const den = d[0] * e[1] - d[1] * e[0];
      if (Math.abs(den) < 1e-12) continue;
      const t = ((p[0] - c[0]) * e[1] - (p[1] - c[1]) * e[0]) / den;
      const s = ((p[0] - c[0]) * d[1] - (p[1] - c[1]) * d[0]) / den;
      if (s >= -1e-9 && s <= 1 + 1e-9 && t > melhor) melhor = t;
    }
    saida.push([r6(c[0] + d[0] * melhor), r6(c[1] + d[1] * melhor)]);
  }
  return convexificar(saida);
}

/** O casco da malha por seções perpendiculares ao eixo principal, no formato de um loft sem casca (`eixo`, `eixosDoPerfil`,
 *  `comprimento`, `secoes: [{ w, perfil }]`, `w` e `perfil` no referencial local já centrado). Cada seção é o casco convexo do corte
 *  da superfície pelo plano dela e dos vértices que ficam entre a seção anterior e a seguinte, amostrado em `RAIOS_DO_CASCO` raios,
 *  de modo que o sólido envolve a malha inteira, sem furo nem cavidade. É a forma que a blocagem do nível zero (a N2 só tem sólidos
 *  de seção convexa) aceita de uma peça que o esboço desenha por superfície: a roda vira o cilindro do pneu, e o cilindro hidráulico
 *  o tronco de seções do corpo, da haste e dos olhais. Determinístico. */
export function cascoEmSecoes(malha, { secoes: quantas = SECOES_DO_CASCO, raios = RAIOS_DO_CASCO } = {}) {
  const memoria = `${quantas}x${raios}`;
  malha.cascos ??= new Map();
  if (malha.cascos.has(memoria)) return malha.cascos.get(memoria);
  const casco = cascoPorSecoes(malha, quantas, raios);
  malha.cascos.set(memoria, casco);
  return casco;
}

function cascoPorSecoes(malha, quantas, raios) {
  const eixo = eixoDaMalha(malha);
  const e = EIXOS.indexOf(eixo);
  const [u, v] = PLANO_DA_SECAO[eixo];
  const lo = malha.caixa.min[e];
  const hi = malha.caixa.max[e];
  const vertices = verticesDaMalha(malha, null);
  const passo = (hi - lo) / (quantas - 1);
  const posicao = (i) => (i === quantas - 1 ? hi : lo + i * passo);
  const plano = (p) => [p[u], p[v]];
  /* a aresta que cruza o plano `w` dá um ponto da seção; a aresta e o plano se tocam em pontos só quando a aresta atravessa */
  const arestas = [];
  for (const f of malha.faces) for (let i = 0; i < f.length; i++) arestas.push([malha.vertices[f[i]], malha.vertices[f[(i + 1) % f.length]]]);
  const secoes = [];
  for (let i = 0; i < quantas; i++) {
    const w = posicao(i);
    const antes = i === 0 ? lo - 1 : posicao(i - 1);
    const depois = i === quantas - 1 ? hi + 1 : posicao(i + 1);
    const pontos = vertices.filter((p) => p[e] > antes && p[e] < depois).map(plano);
    for (const [a, b] of arestas) {
      if ((a[e] - w) * (b[e] - w) >= 0) continue;
      const t = (w - a[e]) / (b[e] - a[e]);
      pontos.push([a[u] + t * (b[u] - a[u]), a[v] + t * (b[v] - a[v])]);
    }
    const casco = cascoPlano(pontos);
    exigir(casco.length >= 3, 'cascoEmSecoes: a seção da malha não tem área (a peça é fina demais no eixo escolhido)');
    secoes.push({ w: r3(w), perfil: raiosDoConvexo(casco, raios) });
  }
  return { eixo, eixosDoPerfil: [EIXOS[u], EIXOS[v]], comprimento: r3(hi - lo), secoes };
}
