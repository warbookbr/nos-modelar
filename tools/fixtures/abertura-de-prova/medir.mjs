/* medir.mjs — as medidas do gate 2 do plano da abertura de contorno livre sobre a malha de uma peça com vão por contorno:
 * a borda do vão achada na malha, o desvio dela contra o contorno desenhado e o ângulo do bico, e a qualidade das faces junto
 * da borda. O gate 1 (aresta sem par, vínculo não manifold e triângulo sem área) é medido pelas funções de
 * `tools/oficina/conferir-malha.ts`, no teste `procedural/nucleo/operacoes/abertura-por-contorno.test.ts`, que chama este
 * módulo e imprime os números do banco de provas.
 *
 * A BORDA DO VÃO. A pele da chapa tem a normal perto da vertical e a parede do vão não: a borda de fora é a aresta da parede cuja
 * outra face é da pele de cima, e a de dentro, da pele de baixo, cada uma encadeada numa volta (`bordaDoVao`).
 *
 * O CONTORNO DESENHADO é o analítico, pelos trechos (reto e arcoTangente, os que a peça de teste usa), e não o polígono que
 * a discretização do arco dá: o desvio contra ele inclui a flecha dos segmentos do arco. O desvio contra o polígono também
 * sai, para separar o erro do corte do erro da discretização. Tudo em metro na entrada; as medidas saem em milímetro e grau.
 *
 * A LENTE NO LUGAR. `relacaoEntrePartes` mede se duas partes fechadas se cruzam (o volume da interseção pela Manifold) e a menor
 * distância entre elas, para a lente recuada contra a aba e contra a chapa. */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const norma = (a) => Math.hypot(a[0], a[1]);
const unit = (a) => { const n = norma(a); return [a[0] / n, a[1] / n]; };
const xz = (p) => [p[0], p[2]];
const graus = (r) => (r * 180) / Math.PI;
const anguloEntre = (u, v) => graus(Math.acos(Math.max(-1, Math.min(1, dot(unit(u), unit(v))))));

/** trechosAnaliticos({ inicio, trechos }) -> lista de trechos { tipo: 'reto', a, b } ou { tipo: 'arco', a, b, centro, raio, sentido,
 *  varredura, tA, tB }, com as tangentes de saída e de chegada. Só reto e arcoTangente, os trechos da peça de teste. */
export function trechosAnaliticos({ inicio, trechos }) {
  const saida = []; let atual = inicio; let tangente = null;
  for (const t of trechos) {
    if (t.reto) {
      const b = t.reto; const d = unit(sub(b, atual));
      saida.push({ tipo: 'reto', a: atual, b, tA: d, tB: d }); atual = b; tangente = d;
    } else if (t.arcoTangente) {
      const b = t.arcoTangente; const corda = sub(b, atual);
      const sentido = Math.sign(cross(tangente, corda));
      const normal = [-tangente[1] * sentido, tangente[0] * sentido];
      const raio = dot(corda, corda) / (2 * dot(corda, normal));
      const centro = [atual[0] + normal[0] * raio, atual[1] + normal[1] * raio];
      const c = unit(corda);
      const tB = sub([2 * dot(tangente, c) * c[0], 2 * dot(tangente, c) * c[1]], tangente);
      const a0 = Math.atan2(atual[1] - centro[1], atual[0] - centro[0]);
      const a1 = Math.atan2(b[1] - centro[1], b[0] - centro[0]);
      let varredura = (a1 - a0) * sentido; while (varredura <= 0) varredura += 2 * Math.PI;
      saida.push({ tipo: 'arco', a: atual, b, centro, raio, sentido, inicioAngular: a0, varredura, tA: tangente, tB });
      atual = b; tangente = tB;
    } else throw new TypeError(`medir: trecho ${JSON.stringify(Object.keys(t))} fora do que a peça de teste usa (reto e arcoTangente)`);
  }
  return saida;
}

function distanciaAoSegmento(p, a, b) {
  const ab = sub(b, a); const l2 = dot(ab, ab);
  const t = l2 ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2)) : 0;
  return norma(sub(p, [a[0] + ab[0] * t, a[1] + ab[1] * t]));
}

function distanciaAoTrecho(p, t) {
  if (t.tipo === 'reto') return distanciaAoSegmento(p, t.a, t.b);
  let ang = (Math.atan2(p[1] - t.centro[1], p[0] - t.centro[0]) - t.inicioAngular) * t.sentido;
  while (ang < 0) ang += 2 * Math.PI;
  while (ang >= 2 * Math.PI) ang -= 2 * Math.PI;
  if (ang <= t.varredura) return Math.abs(norma(sub(p, t.centro)) - t.raio);
  return Math.min(norma(sub(p, t.a)), norma(sub(p, t.b)));
}

/** Pontos do contorno analítico a cada `passo` metro de comprimento, para o desvio no sentido do contorno à borda. */
function amostrar(analitico, passo) {
  const pts = [];
  for (const t of analitico) {
    const comprimento = t.tipo === 'reto' ? norma(sub(t.b, t.a)) : t.raio * t.varredura;
    const n = Math.max(1, Math.ceil(comprimento / passo));
    for (let k = 0; k < n; k++) {
      const s = k / n;
      if (t.tipo === 'reto') pts.push([t.a[0] + (t.b[0] - t.a[0]) * s, t.a[1] + (t.b[1] - t.a[1]) * s]);
      else { const ang = t.inicioAngular + t.sentido * t.varredura * s; pts.push([t.centro[0] + t.raio * Math.cos(ang), t.centro[1] + t.raio * Math.sin(ang)]); }
    }
  }
  return pts;
}

function normalDaFace(pts) {
  const n = [0, 0, 0];
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const l = Math.hypot(...n);
  return { n: n.map((x) => x / l), area: l / 2 };
}

/** As faces da parede do vão e as duas bordas (fora e dentro), cada uma uma volta de ids de vértice. A pele da chapa são as faces
 *  de normal perto da vertical (|n.y| acima de `pele`; a de fora para cima, a de dentro para baixo), a parede as outras dentro de
 *  `interior`, a caixa em [x, z] fora da qual a face é do perímetro da chapa. A borda de cada pele é a aresta dela cuja outra
 *  face é da parede. Serve aos dois cortes: no de depois da subdivisão a parede é vertical, no da gaiola ela segue a normal. */
export function bordaDoVao(neutro, { interior, pele = 0.6 }) {
  const V = neutro.V;
  const normal = new Map();
  for (const f of neutro.F.values()) normal.set(f.id, normalDaFace(f.vs.map((v) => V.get(v))).n);
  const dentro = (v) => { const p = V.get(v); return p[0] > interior[0][0] && p[0] < interior[1][0] && p[2] > interior[0][1] && p[2] < interior[1][1]; };
  const parede = new Set();
  for (const f of neutro.F.values()) if (Math.abs(normal.get(f.id)[1]) <= pele && f.vs.every(dentro)) parede.add(f.id);
  /* a outra face de cada aresta da parede */
  const donoDaAresta = new Map();
  for (const f of neutro.F.values()) for (let k = 0; k < f.vs.length; k++) donoDaAresta.set(`${f.vs[k]}>${f.vs[(k + 1) % f.vs.length]}`, f.id);
  const bordas = { fora: [], dentro: [] };
  for (const fid of parede) {
    const vs = neutro.F.get(fid).vs;
    for (let k = 0; k < vs.length; k++) {
      const a = vs[k], b = vs[(k + 1) % vs.length];
      const outra = donoDaAresta.get(`${b}>${a}`);
      if (outra == null || parede.has(outra)) continue;
      bordas[normal.get(outra)[1] > 0 ? 'fora' : 'dentro'].push([a, b]);
    }
  }
  const encadear = (arestas) => {
    const prox = new Map(arestas.map(([a, b]) => [a, b]));
    if (prox.size !== arestas.length) return { voltas: [], erro: 'a borda passa duas vezes por um vértice' };
    const vistos = new Set(); const voltas = [];
    for (const [a] of arestas) {
      if (vistos.has(a)) continue;
      const volta = []; let c = a;
      while (c != null && !vistos.has(c)) { vistos.add(c); volta.push(c); c = prox.get(c); }
      if (c !== a) return { voltas, erro: 'a borda não fecha' };
      voltas.push(volta);
    }
    return { voltas };
  };
  return { parede, fora: encadear(bordas.fora), dentro: encadear(bordas.dentro) };
}

/** Comprimento ao longo da volta e o ponto da volta a `s` metros de `inicio`, andando no sentido `passo` (+1 ou -1), em [x, z]. */
function pontoAoLongo(volta, inicio, s, passo, V) {
  const n = volta.length; let resta = s; let k = inicio;
  for (let guarda = 0; guarda < n; guarda++) {
    const j = (k + passo + n) % n;
    const a = xz(V.get(volta[k])), b = xz(V.get(volta[j]));
    const l = norma(sub(b, a));
    if (l >= resta) return [a[0] + ((b[0] - a[0]) * resta) / l, a[1] + ((b[1] - a[1]) * resta) / l];
    resta -= l; k = j;
  }
  return xz(V.get(volta[k]));
}

/** medirAbertura(neutro, { contorno, poligono, interior, bico, distanciaDoBico }) -> as medidas do gate 2 e da malha junto da borda.
 *  `contorno` é o { inicio, trechos } desenhado, `poligono` a lista [x, z] do prisma (a discretização), `bico` o ponto [x, z] do
 *  canto vivo e `distanciaDoBico` o comprimento, ao longo da borda, em que se mede a direção de cada lado do bico. */
export function medirAbertura(neutro, { contorno, poligono, interior, bico, alturaEm = null, distanciaDoBico = 0.002 }) {
  const V = neutro.V;
  const analitico = trechosAnaliticos(contorno);
  const { parede, fora, dentro } = bordaDoVao(neutro, { interior });
  const mm = (x) => x * 1000;
  const resultado = { facesDaParede: parede.size, erroDaBorda: fora.erro ?? dentro.erro ?? null, voltas: { fora: fora.voltas.length, dentro: dentro.voltas.length } };
  if (resultado.erroDaBorda || fora.voltas.length !== 1 || dentro.voltas.length !== 1) return resultado;
  const lados = poligono.map((p, k) => [p, poligono[(k + 1) % poligono.length]]);
  const desvio = (volta) => {
    let aoDesenho = 0, aoPoligono = 0;
    for (const v of volta) {
      const p = xz(V.get(v));
      aoDesenho = Math.max(aoDesenho, Math.min(...analitico.map((t) => distanciaAoTrecho(p, t))));
      aoPoligono = Math.max(aoPoligono, Math.min(...lados.map(([a, b]) => distanciaAoSegmento(p, a, b))));
    }
    /* no outro sentido: cada ponto do desenho, a cada 0,5 mm, até a borda da malha */
    const arestas = volta.map((v, k) => [xz(V.get(v)), xz(V.get(volta[(k + 1) % volta.length]))]);
    let doDesenho = 0;
    for (const p of amostrar(analitico, 0.0005)) doDesenho = Math.max(doDesenho, Math.min(...arestas.map(([a, b]) => distanciaAoSegmento(p, a, b))));
    return { verticesDaBorda: volta.length, daBordaAoDesenhoMm: mm(aoDesenho), doDesenhoABordaMm: mm(doDesenho), daBordaAoPoligonoMm: mm(aoPoligono) };
  };
  resultado.desvio = { fora: desvio(fora.voltas[0]), dentro: desvio(dentro.voltas[0]) };
  /* em y: a borda de fora contra a superfície da chapa sem vão, que é onde o contorno projetado cai, e a pele de fora inteira
     contra a mesma superfície, que mostra se o corte mexeu na chapa em volta do vão */
  if (alturaEm) {
    const emY = (v) => { const p = V.get(v); return Math.abs(p[1] - alturaEm(p[0], p[2])); };
    const pele = new Set();
    for (const f of neutro.F.values()) { const pts = f.vs.map((v) => V.get(v)); if (normalDaFace(pts).n[1] > 0.6) for (const v of f.vs) pele.add(v); }
    resultado.desvio.fora.daBordaASuperficieMm = mm(Math.max(...fora.voltas[0].map(emY)));
    resultado.desvio.peleDeForaASuperficieMm = mm(Math.max(...[...pele].map(emY)));
  }
  /* o bico: o vértice da borda de fora mais perto do bico desenhado, e a direção de cada lado a `distanciaDoBico` ao longo dela */
  const volta = fora.voltas[0];
  let k0 = 0, d0 = Infinity;
  volta.forEach((v, k) => { const d = norma(sub(xz(V.get(v)), bico)); if (d < d0) { d0 = d; k0 = k; } });
  const pb = xz(V.get(volta[k0]));
  const anguloNaMalha = anguloEntre(sub(pontoAoLongo(volta, k0, distanciaDoBico, 1, V), pb), sub(pontoAoLongo(volta, k0, distanciaDoBico, -1, V), pb));
  const primeiro = analitico[0], ultimo = analitico[analitico.length - 1];
  const anguloDesenhado = anguloEntre(primeiro.tA, [-ultimo.tB[0], -ultimo.tB[1]]);
  const kp = poligono.findIndex((p) => norma(sub(p, bico)) < 1e-9);
  const anguloDoPoligono = kp < 0 ? null : anguloEntre(sub(poligono[(kp + 1) % poligono.length], bico), sub(poligono[(kp - 1 + poligono.length) % poligono.length], bico));
  resultado.bico = { vertice: volta[k0], distanciaAoDesenhadoMm: mm(d0), anguloNaMalha, anguloDesenhado, anguloDoPoligono, diferenca: Math.abs(anguloNaMalha - anguloDesenhado) };
  return resultado;
}

/** Qualidade das faces: a menor razão área / maior aresta² (a de `face-fina` em `procedural/nucleo/topologia.js`) e quantas
 *  ficam abaixo de `limite`, entre as faces da lista. */
export function qualidadeDasFaces(neutro, ids, limite = 0.003) {
  let menor = Infinity, abaixo = 0;
  for (const id of ids) {
    const pts = neutro.F.get(id).vs.map((v) => neutro.V.get(v));
    const { area } = normalDaFace(pts);
    let maior = 0;
    for (let k = 0; k < pts.length; k++) { const a = pts[k], b = pts[(k + 1) % pts.length]; maior = Math.max(maior, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])); }
    const razao = area / (maior * maior);
    menor = Math.min(menor, razao); if (razao < limite) abaixo++;
  }
  return { faces: ids.length, menorRazao: menor, abaixoDoLimite: abaixo, limite };
}

/** relacaoEntrePartes(neutro, a, b, wasm, { distancia }) -> { volumeMm3, distanciaMm }: o volume da interseção dos sólidos de
 *  duas listas de partes, pela Manifold (`wasm`, a instância que o núcleo carregou), e a menor distância entre as malhas, de cada
 *  vértice de uma aos triângulos da outra, nos dois sentidos (com `distancia: false`, só o volume). Cada lista precisa formar um
 *  sólido fechado. */
export function relacaoEntrePartes(neutro, a, b, wasm, { distancia = true } = {}) {
  const sub3 = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
  const dot3 = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const cruz3 = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  const tam = (p) => Math.hypot(p[0], p[1], p[2]);
  const aoSegmento = (p, u, v) => { const uv = sub3(v, u); const s = Math.max(0, Math.min(1, dot3(sub3(p, u), uv) / dot3(uv, uv))); return tam(sub3(p, [u[0] + uv[0] * s, u[1] + uv[1] * s, u[2] + uv[2] * s])); };
  const aoTriangulo = ([x, y, z], p) => {
    const n = cruz3(sub3(y, x), sub3(z, x)); const l = tam(n);
    if (l > 0) { const N = n.map((c) => c / l); const h = dot3(sub3(p, x), N); const q = sub3(p, N.map((c) => c * h)); if ([[x, y], [y, z], [z, x]].every(([u, v]) => dot3(cruz3(sub3(v, u), sub3(q, u)), N) >= 0)) return Math.abs(h); }
    return Math.min(aoSegmento(p, x, y), aoSegmento(p, y, z), aoSegmento(p, z, x));
  };
  const malha = (partes) => {
    const faces = [...neutro.F.values()].filter((f) => partes.includes(f.parte));
    const ids = [...new Set(faces.flatMap((f) => f.vs))];
    const tris = [];
    for (const f of faces) for (let k = 1; k + 1 < f.vs.length; k++) tris.push([f.vs[0], f.vs[k], f.vs[k + 1]]);
    return { ids, tris, pontos: ids.map((v) => neutro.V.get(v)), triangulos: tris.map((t) => t.map((v) => neutro.V.get(v))) };
  };
  const solido = ({ ids, tris }) => {
    const indice = new Map(ids.map((v, k) => [v, k]));
    const props = new Float32Array(ids.length * 3); ids.forEach((v, k) => props.set(neutro.V.get(v), 3 * k));
    const mesh = new wasm.Mesh({ numProp: 3, vertProperties: props, triVerts: Uint32Array.from(tris.flat().map((v) => indice.get(v))) });
    mesh.merge();
    return new wasm.Manifold(mesh);
  };
  const A = malha(a), B = malha(b);
  const sa = solido(A), sb = solido(B);
  try {
    const r = wasm.Manifold.intersection(sa, sb);
    const volumeMm3 = r.volume() * 1e9; r.delete();
    if (!distancia) return { volumeMm3, distanciaMm: null };
    let d = Infinity;
    for (const p of A.pontos) for (const t of B.triangulos) d = Math.min(d, aoTriangulo(t, p));
    for (const p of B.pontos) for (const t of A.triangulos) d = Math.min(d, aoTriangulo(t, p));
    return { volumeMm3, distanciaMm: d * 1000 };
  } finally { sa.delete(); sb.delete(); }
}
