/* Importador de STEP para `.esboco.json`.

   Cada sólido do STEP é uma peça, e a peça vira a forma exata mais simples que o esboço tem para ela, nesta ordem:
   1. revolução (cilindro, cone ou tronco, anel, ou a revolução de um perfil) quando o sólido é de revolução em torno de um eixo;
   2. extrusão do contorno da maior face plana quando o sólido é um prisma (a face oposta paralela e congruente, as laterais
      perpendiculares), com os furos passantes do contorno como cortadores (cilindro quando o furo é redondo, extrusão quando não);
   3. caixa orientada, o último recurso, marcada no relato com a ocupação (volume do sólido sobre o da caixa).
   A decisão se faz pela malha que o OpenCascade gera do B-rep (as normais exatas de cada vértice e as faces separadas), e não pelo
   tipo de superfície do B-rep: um sólido é de revolução quando a normal de todo vértice fica no plano que contém o eixo e o vértice,
   e é prisma quando todo triângulo é tampa (normal igual a ±n, em duas alturas só) ou lateral (normal perpendicular a n). O contorno
   do perfil de uma revolução vem da seção do próprio sólido por um semiplano que contém o eixo.

   Leitor. `occt-wasm` (OpenCascade 7.x compilado para WASM, MIT OR Apache-2.0, 22 MB de .wasm), que o repositório já usa no
   exportador de STEP e por isso não acrescenta dependência. Lê o STEP, separa os sólidos, entrega malha com normais exatas, volume,
   inércia e distância exata entre sólidos.

   Nomes. O STEP guarda o nome do sólido no rótulo do XCAF (o produto) ou no `MANIFOLD_SOLID_BREP`. O id da forma é esse nome em
   minúsculas, sem acento nem espaço. Nome genérico ("Körper7", "Solid3", vazio) ou repetido vira `peca_<ordem>_<forma>`, em que a
   ordem é a posição do sólido no arquivo.

   Quadro. O de CAD tem z para cima, e o esboço tem y para cima e a frente em -z: o mesmo quadro do importador de `.csg`
   (`quadroDoEsboco`, rotação própria, sem espelhar), em milímetro.

   Relações. Dois sólidos a menos de `toleranciaDeContato` um do outro (distância exata do B-rep) entram em `plano.contrato.tocam`.

   Núcleo: recebe o texto do STEP e devolve `{ esboco, texto, relatorio }`. A linha de comando fica em `importar-step.mjs`. */
import { createHash } from 'node:crypto';
import { OcctKernel } from 'occt-wasm';
import { quadroDoEsboco, RecusaDeImportacao, serializar } from './esboco-importar-csg.mjs';

export { RecusaDeImportacao };

const TOL_NORMAL_TAMPA = 1e-5; // 1 - cos do desvio aceito entre a normal do vértice e a da tampa
const TOL_NORMAL_LATERAL = 2e-3; // |cos| máximo entre a normal do vértice de uma lateral e a direção da extrusão
const TOL_EIXO = 2e-3; // desvio angular, em radiano, aceito entre a normal de um vértice e o plano meridiano de uma revolução
const TOL_ALTURA = 5e-3; // mm: diferença de altura aceita entre os vértices de uma mesma tampa
const LIMIAR_APROXIMADO = 0.6; // razão mínima entre o menor e o maior volume (sólido e forma aproximada) para trocar a caixa por um prisma ou revolução aproximados
const TOL_VOLUME = 0.01; // diferença relativa aceita entre o volume do sólido e o da forma exata
const SOLDA = 1e3; // os vértices que coincidem a menos de 1 µm são o mesmo
const GENERICO = /^(?:k[oö]rper|solid|body|corpo|part|peca|peça|brep|manifold_solid_brep|shape|component|componente|unnamed|sem[ _-]?nome|none|nauo|product|node|object|objeto)?[\s_.:-]*\d*$/i;

/* ---------- álgebra ---------- */

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const esc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const n = norma(a); return n > 0 ? esc(a, 1 / n) : a; };
const arred = (x, casas = 3) => { const f = 10 ** casas; const v = Math.round(x * f) / f; return Object.is(v, -0) ? 0 : v; };
const vet = (v) => v.map((x) => arred(x));
const rad = (g) => (g * Math.PI) / 180;
const EIXOS = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/* Encaixa no eixo do mundo o vetor que está a menos de 2e-4 dele; senão devolve o vetor unitário. */
function encaixar(v) {
  const u = unit(v);
  for (let i = 0; i < 3; i++) if (Math.abs(u[i]) > 1 - 2e-4) return EIXOS[i].map((x) => x * Math.sign(u[i]));
  return u.map((x) => (Math.abs(x) < 1e-9 ? 0 : x));
}

/* A rotação R (colunas = eixos locais no mundo) -> [rx, ry, rz] em graus, R = Rz·Ry·Rx, a convenção de `rotacao` do esboço. */
function angulosDaRotacao(R) {
  const sy = -R[2][0];
  const ry = Math.asin(Math.max(-1, Math.min(1, sy)));
  let rx; let rz;
  if (Math.abs(sy) < 1 - 1e-9) { rx = Math.atan2(R[2][1], R[2][2]); rz = Math.atan2(R[1][0], R[0][0]); } else { rz = 0; rx = Math.atan2(-R[1][2], R[1][1]); }
  return [rx, ry, rz].map((a) => arred((a * 180) / Math.PI, 4));
}
const daColunas = (x, y, z) => [0, 1, 2].map((i) => [x[i], y[i], z[i]]);

/* Um quadro direito (x, y, z) com y = eixo; x é a projeção do eixo do mundo menos alinhado ao eixo, para que o sólido alinhado
   fique com rotação zero ou de múltiplos de 90 graus. `prefer` é um vetor que, se dado, escolhe a direção de x no plano. */
function quadroDoEixo(eixo, prefer = null) {
  const y = encaixar(eixo);
  let x;
  if (prefer && Math.abs(dot(prefer, y)) < 0.999) x = unit(sub(prefer, esc(y, dot(prefer, y))));
  else {
    let melhor = null;
    for (const e of EIXOS) { const d = Math.abs(dot(e, y)); if (melhor === null || d < melhor.d - 1e-9) melhor = { e, d }; }
    x = unit(sub(melhor.e, esc(y, dot(melhor.e, y))));
  }
  x = encaixar(x);
  const z = unit(cruz(x, y));
  return { x, y, z, R: daColunas(x, y, z) };
}

/* Os autovalores e autovetores de uma matriz simétrica 3x3, por Jacobi. */
function autoSimetrica(S) {
  const A = S.map((l) => [...l]);
  const V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let it = 0; it < 50; it++) {
    let p = 0; let q = 1; let m = Math.abs(A[0][1]);
    if (Math.abs(A[0][2]) > m) { p = 0; q = 2; m = Math.abs(A[0][2]); }
    if (Math.abs(A[1][2]) > m) { p = 1; q = 2; m = Math.abs(A[1][2]); }
    if (m < 1e-14 * (Math.abs(A[0][0]) + Math.abs(A[1][1]) + Math.abs(A[2][2]) + 1e-300)) break;
    const th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
    const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
    const c = 1 / Math.sqrt(t * t + 1); const s = t * c;
    for (let k = 0; k < 3; k++) { const akp = A[k][p]; const akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
    for (let k = 0; k < 3; k++) { const apk = A[p][k]; const aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
    for (let k = 0; k < 3; k++) { const vkp = V[k][p]; const vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
  }
  return [0, 1, 2].map((i) => ({ valor: A[i][i], vetor: [V[0][i], V[1][i], V[2][i]] }));
}

/* ---------- contornos planos ---------- */

const areaAssinada = (pts) => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i]; const b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };

/* Tira do contorno os vértices que ficam sobre a reta dos vizinhos (a menos de `tol` mm), até nenhum sobrar. */
function semColineares(pts, tol = 2e-3) {
  let p = pts;
  for (let mudou = true; mudou && p.length > 3;) {
    mudou = false;
    const q = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[(i - 1 + p.length) % p.length]; const b = p[i]; const c = p[(i + 1) % p.length];
      const ac = [c[0] - a[0], c[1] - a[1]]; const len = Math.hypot(...ac);
      const d = len < 1e-9 ? 0 : Math.abs(ac[0] * (b[1] - a[1]) - ac[1] * (b[0] - a[0])) / len;
      if (d < tol && q.length + (p.length - i - 1) > 3) { mudou = true; continue; }
      q.push(b);
    }
    p = q;
  }
  return p;
}

/* Os laços de contorno de um conjunto de triângulos de um mesmo plano: as arestas que só um triângulo usa, encadeadas. `proj`
   leva o ponto 3D às coordenadas do plano. Devolve laços de [u, v], cada um no sentido do triângulo (arestas orientadas). */
function lacos(triangulos, proj) {
  const ids = new Map();
  const pontos = [];
  const id = (p) => {
    const k = `${Math.round(p[0] * SOLDA)},${Math.round(p[1] * SOLDA)},${Math.round(p[2] * SOLDA)}`;
    if (!ids.has(k)) { ids.set(k, pontos.length); pontos.push(proj(p)); }
    return ids.get(k);
  };
  const arestas = new Map();
  for (const t of triangulos) {
    const [a, b, c] = t.map(id);
    if (a === b || b === c || a === c) continue;
    for (const [x, y] of [[a, b], [b, c], [c, a]]) arestas.set(`${x}>${y}`, [x, y]);
  }
  const saem = new Map();
  for (const [chave, [x, y]] of arestas) {
    if (arestas.has(`${y}>${x}`)) continue;
    if (!saem.has(x)) saem.set(x, []);
    saem.get(x).push(y);
    void chave;
  }
  const resultado = [];
  const chaves = [...saem.keys()].sort((a, b) => a - b);
  for (const inicio of chaves) {
    while ((saem.get(inicio) ?? []).length > 0) {
      const laco = [inicio];
      let atual = inicio;
      for (;;) {
        const opcoes = saem.get(atual) ?? [];
        if (opcoes.length === 0) { laco.length = 0; break; }
        const prox = opcoes.shift();
        if (prox === inicio) break;
        laco.push(prox);
        atual = prox;
        if (laco.length > pontos.length + 1) { laco.length = 0; break; }
      }
      if (laco.length >= 3) resultado.push(laco.map((i) => pontos[i]));
    }
  }
  return resultado;
}

/* Se o laço é uma circunferência (pontos todos a igual distância de um centro, espalhados em volta), devolve { centro, raio }. */
function circuloDoLaco(pts) {
  const n = pts.length;
  if (n < 12) return null;
  const [a, b, c] = [pts[0], pts[Math.floor(n / 3)], pts[Math.floor((2 * n) / 3)]];
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-9) return null;
  const ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) / d;
  const uy = ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) / d;
  const r = Math.hypot(a[0] - ux, a[1] - uy);
  const tol = Math.max(5e-3, r * 2e-3);
  let maiorSalto = 0;
  for (let i = 0; i < n; i++) {
    if (Math.abs(Math.hypot(pts[i][0] - ux, pts[i][1] - uy) - r) > tol) return null;
    const p = pts[i]; const q = pts[(i + 1) % n];
    const ang = Math.abs(Math.atan2((p[0] - ux) * (q[1] - uy) - (p[1] - uy) * (q[0] - ux), (p[0] - ux) * (q[0] - ux) + (p[1] - uy) * (q[1] - uy)));
    maiorSalto = Math.max(maiorSalto, ang);
  }
  return maiorSalto < 0.7 ? { centro: [ux, uy], raio: r } : null;
}

/* O ponto está dentro do polígono ou a menos de `tol` de uma aresta dele. */
function dentroOuNaBorda(p, poly, tol) {
  if (dentroDe(p, poly)) return true;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]; const b = poly[(i + 1) % poly.length];
    const ab = [b[0] - a[0], b[1] - a[1]]; const l2 = ab[0] * ab[0] + ab[1] * ab[1];
    const t = l2 < 1e-18 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / l2));
    if (Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1]) <= tol) return true;
  }
  return false;
}

const dentroDe = (p, poly) => {
  let dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if ((poly[i][1] > p[1]) !== (poly[j][1] > p[1]) && p[0] < ((poly[j][0] - poly[i][0]) * (p[1] - poly[i][1])) / (poly[j][1] - poly[i][1]) + poly[i][0]) dentro = !dentro;
  }
  return dentro;
};

/* O retângulo de menor área em volta dos pontos 2D, com um lado sobre uma aresta do casco convexo. Empate (a menos de 1e-6 da área)
   fica com o ângulo mais perto de zero, para a peça alinhada aos eixos sair sem giro. */
function retanguloMinimo(pts) {
  const ordenados = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cruzamento = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const meio = [];
  for (const p of ordenados) { while (meio.length >= 2 && cruzamento(meio[meio.length - 2], meio[meio.length - 1], p) <= 0) meio.pop(); meio.push(p); }
  const topo = [];
  for (const p of [...ordenados].reverse()) { while (topo.length >= 2 && cruzamento(topo[topo.length - 2], topo[topo.length - 1], p) <= 0) topo.pop(); topo.push(p); }
  const casco = [...meio.slice(0, -1), ...topo.slice(0, -1)];
  const candidatos = [0];
  for (let i = 0; i < casco.length; i++) {
    const a = casco[i]; const b = casco[(i + 1) % casco.length];
    candidatos.push(Math.atan2(b[1] - a[1], b[0] - a[0]));
  }
  let melhor = null;
  for (const ang of candidatos) {
    const c = Math.cos(ang); const s = Math.sin(ang);
    let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
    for (const p of casco) { const u = c * p[0] + s * p[1]; const v = -s * p[0] + c * p[1]; x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
    const area = (x1 - x0) * (y1 - y0);
    const m = ((ang % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
    const desvio = Math.min(m, Math.PI / 2 - m);
    if (melhor === null || area < melhor.area * (1 - 1e-6) || (area <= melhor.area * (1 + 1e-6) && desvio < melhor.desvio - 1e-9)) melhor = { ang, area, desvio };
  }
  return melhor.ang;
}

/* ---------- leitura do STEP ---------- */

/* O texto de uma cadeia do STEP, com as escapadas \X\HH, \X2\...\X0\, \X4\...\X0\ e a aspa dobrada. */
export function decodificarTextoStep(s) {
  return s
    .replace(/\\X2\\((?:[0-9A-Fa-f]{4})+)\\X0\\/g, (_, h) => String.fromCharCode(...(h.match(/.{4}/g) ?? []).map((x) => parseInt(x, 16))))
    .replace(/\\X4\\((?:[0-9A-Fa-f]{8})+)\\X0\\/g, (_, h) => String.fromCodePoint(...(h.match(/.{8}/g) ?? []).map((x) => parseInt(x, 16))))
    .replace(/\\X\\([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/''/g, "'");
}

/* Os nomes dos `MANIFOLD_SOLID_BREP` na ordem do arquivo. */
export function nomesDosSolidosNoTexto(texto) {
  const nomes = [];
  for (const m of texto.matchAll(/(?:MANIFOLD_SOLID_BREP|BREP_WITH_VOIDS)\s*\(\s*'((?:[^']|'')*)'/g)) nomes.push(decodificarTextoStep(m[1]).trim());
  return nomes;
}

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export function idDoNome(nome) {
  return semAcento(nome).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/* Os sólidos do documento XCAF na ordem das folhas, cada um com o nome do rótulo quando o rótulo tem um só. */
function solidosDoXcaf(kernel, doc) {
  const lista = [];
  const visita = (tag) => {
    const info = doc.getLabelInfo(tag);
    const filhos = doc.getChildren(tag);
    if (filhos.length > 0) { for (const c of filhos) visita(c); return; }
    const h = info.shapeHandle;
    if (h === undefined || h === null) return;
    const dentro = kernel.getShapeType(h) === 'solid' ? [h] : kernel.getSubShapes(h, 'solid');
    for (const s of dentro) lista.push({ forma: s, nome: dentro.length === 1 ? (info.name ?? '').trim() : '' });
  };
  for (const r of doc.getRoots()) visita(r);
  return lista;
}

/* Extrai de cada sólido a malha no quadro do esboço e as grandezas exatas do B-rep. */
async function lerSolidos(texto, quadro, { deflexao = 1 / 50 } = {}) {
  const kernel = await OcctKernel.init();
  const R = quadro.map((l) => l.slice(0, 3)).slice(0, 3);
  const rot = (p) => [0, 1, 2].map((i) => R[i][0] * p[0] + R[i][1] * p[1] + R[i][2] * p[2]);
  let achados = [];
  try { achados = solidosDoXcaf(kernel, kernel.importXCAFFromSTEP(texto)); } catch { achados = []; }
  if (achados.length === 0) {
    let forma;
    try { forma = kernel.importStep(texto); } catch (e) { throw new RecusaDeImportacao(`o STEP não pôde ser lido: ${e.message ?? e}`); }
    achados = (kernel.getShapeType(forma) === 'solid' ? [forma] : kernel.getSubShapes(forma, 'solid')).map((s) => ({ forma: s, nome: '' }));
  }
  if (achados.length === 0) throw new RecusaDeImportacao('o STEP não tem nenhum sólido (só superfícies ou curvas): a importação trata cada sólido como uma peça');
  const solidos = achados.map((a) => a.forma);
  const nomesRotulo = achados.map((a) => a.nome);
  const nomesBrep = nomesDosSolidosNoTexto(texto);
  const brepCasa = nomesBrep.length === solidos.length;
  const dados = solidos.map((s, i) => {
    const bb = kernel.getBoundingBox(s);
    const diag = Math.hypot(bb.xmax - bb.xmin, bb.ymax - bb.ymin, bb.zmax - bb.zmin);
    const malha = kernel.meshShape(s, { linearDeflection: Math.max(diag * deflexao, 1e-3), angularDeflection: 0.08 });
    const n = malha.vertexCount;
    const P = new Float64Array(n * 3); const N = new Float64Array(n * 3);
    for (let v = 0; v < n; v++) {
      const p = rot([malha.positions[v * 3], malha.positions[v * 3 + 1], malha.positions[v * 3 + 2]]);
      const q = unit(rot([malha.normals[v * 3], malha.normals[v * 3 + 1], malha.normals[v * 3 + 2]]));
      for (let c = 0; c < 3; c++) { P[v * 3 + c] = p[c]; N[v * 3 + c] = q[c]; }
    }
    // a normal do vértice vem da superfície, sem o sentido da face: o sentido de fora é o do enrolamento do triângulo, que o OpenCascade
    // gera para fora do sólido (conferido pelo volume com sinal da malha)
    const NT = new Float64Array(malha.triangleCount * 9);
    const giros = new Int8Array(malha.triangleCount);
    let volumeComSinal = 0;
    for (let t = 0; t < malha.triangleCount; t++) {
      const [a, b, c] = [0, 1, 2].map((k) => { const v = malha.indices[t * 3 + k]; return [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]]; });
      const g = cruz(sub(b, a), sub(c, a));
      volumeComSinal += dot(a, cruz(b, c)) / 6;
      const v0 = malha.indices[t * 3];
      giros[t] = dot(g, [N[v0 * 3], N[v0 * 3 + 1], N[v0 * 3 + 2]]) >= 0 ? 1 : -1;
    }
    const global = volumeComSinal >= 0 ? 1 : -1;
    for (let t = 0; t < malha.triangleCount; t++) for (let k = 0; k < 3; k++) { const v = malha.indices[t * 3 + k]; for (let c = 0; c < 3; c++) NT[t * 9 + k * 3 + c] = N[v * 3 + c] * giros[t] * global; }
    const I = kernel.getInertia(s);
    const Ie = [0, 1, 2].map((r) => [0, 1, 2].map((c) => I[r * 3 + c]));
    const Ir = [0, 1, 2].map((r) => [0, 1, 2].map((c) => { let t = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) t += R[r][a] * Ie[a][b] * R[c][b]; return t; }));
    const com = kernel.getCenterOfMass(s);
    return {
      ordem: i + 1,
      handle: s,
      nome: nomesRotulo[i] || (brepCasa ? nomesBrep[i] : ''),
      diag,
      volume: kernel.getVolume(s),
      centroDeMassa: rot([com.x, com.y, com.z]),
      inercia: Ir,
      sentido: global,
      P, N, NT, I: malha.indices, nTri: malha.triangleCount,
    };
  });
  return { kernel, dados, R };
}

/* ---------- classificação ---------- */

const tri = (d, t) => [0, 1, 2].map((k) => { const v = d.I[t * 3 + k]; return [d.P[v * 3], d.P[v * 3 + 1], d.P[v * 3 + 2]]; });
const nv = (d, v) => [d.N[v * 3], d.N[v * 3 + 1], d.N[v * 3 + 2]];
const nc = (d, t, k) => [d.NT[t * 9 + k * 3], d.NT[t * 9 + k * 3 + 1], d.NT[t * 9 + k * 3 + 2]];
const pv = (d, v) => [d.P[v * 3], d.P[v * 3 + 1], d.P[v * 3 + 2]];

function aabbDe(d) {
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < d.P.length / 3; v++) for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], d.P[v * 3 + c]); max[c] = Math.max(max[c], d.P[v * 3 + c]); }
  return { min, max };
}

/* Revolução: o eixo candidato vem da inércia (o autovalor que difere dos outros dois, que são iguais) e é provado pelas normais. */
function eixoDeRevolucao(d) {
  const eg = autoSimetrica(d.inercia).sort((a, b) => a.valor - b.valor);
  const escala = Math.max(...eg.map((e) => Math.abs(e.valor)), 1e-300);
  const igual = (a, b) => Math.abs(a - b) <= 1e-4 * escala;
  let eixo = null;
  if (igual(eg[0].valor, eg[1].valor) && !igual(eg[1].valor, eg[2].valor)) eixo = eg[2].vetor;
  else if (igual(eg[1].valor, eg[2].valor) && !igual(eg[0].valor, eg[1].valor)) eixo = eg[0].vetor;
  if (!eixo) return null;
  const a = encaixar(eixo);
  const c = d.centroDeMassa;
  for (let v = 0; v < d.P.length / 3; v++) {
    const rel = sub(pv(d, v), c);
    const perp = sub(rel, esc(a, dot(rel, a)));
    const rho = norma(perp);
    if (rho < 1e-6) continue;
    if (Math.abs(dot(cruz(nv(d, v), a), perp)) / rho > TOL_EIXO) return null;
  }
  return { eixo: a, centro: c };
}

/* O perfil [raio, altura] da revolução: a seção do sólido por um semiplano que contém o eixo, no quadro do CAD. */
function perfilDaRevolucao(kernel, R, d, eixo, centro) {
  // do esboço ao CAD: a inversa da rotação é a transposta
  const aCad = (v) => [0, 1, 2].map((i) => R[0][i] * v[0] + R[1][i] * v[1] + R[2][i] * v[2]);
  const a = aCad(eixo); const c = aCad(centro);
  const u = unit(cruz(a, Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
  const w = cruz(u, a);
  const S = 4 * d.diag + 10;
  const caixa = kernel.transform(kernel.translate(kernel.makeBox(S, 2 * S, S), 0, -S, 0), [u[0], a[0], w[0], c[0], u[1], a[1], w[1], c[1], u[2], a[2], w[2], c[2]]);
  const metade = kernel.common(d.handle, caixa);
  const malha = kernel.meshShape(metade, { linearDeflection: 0.01, angularDeflection: 0.08 });
  const tris = [];
  for (let t = 0; t < malha.triangleCount; t++) {
    const ps = [0, 1, 2].map((k) => { const i = malha.indices[t * 3 + k]; return [malha.positions[i * 3], malha.positions[i * 3 + 1], malha.positions[i * 3 + 2]]; });
    if (ps.every((p) => Math.abs(dot(sub(p, c), w)) < 2e-3)) tris.push(ps);
  }
  const ls = lacos(tris, (p) => { const r = sub(p, c); return [dot(r, u), dot(r, a)]; });
  return ls;
}

/* O perfil -> forma de revolução. `pontos` é um laço [raio, altura]. Devolve null se o perfil não é expressável. */
function formaDeRevolucao(pontosBrutos) {
  const lista = pontosBrutos.map(([r, z]) => [Math.max(0, r), z]);
  let pts = semColineares(lista.map(([r, z]) => [arred(r, 3), arred(z, 3)]), 2e-3);
  if (pts.length < 3) return null;
  const zmin = Math.min(...pts.map((p) => p[1])); const zmax = Math.max(...pts.map((p) => p[1]));
  const rmax = Math.max(...pts.map((p) => p[0]));
  if (!(zmax - zmin > 1e-3) || !(rmax > 1e-3)) return null;
  const noEixo = pts.map((p) => p[0] < 2e-3);
  const nEixo = noEixo.filter(Boolean).length;
  if (nEixo === 0) {
    // sem tocar o eixo: só o retângulo (anel)
    const rs = [...new Set(pts.map((p) => arred(p[0], 2)))]; const zs = [...new Set(pts.map((p) => arred(p[1], 2)))];
    if (pts.length === 4 && rs.length === 2 && zs.length === 2) return { tipo: 'anel', R: rmax, r: Math.min(...pts.map((p) => p[0])), z0: zmin, z1: zmax };
    return null;
  }
  // toca o eixo: a cadeia vai do ponto do eixo de baixo ao de cima, com altura que só sobe
  const n = pts.length;
  let k = -1;
  for (let i = 0; i < n; i++) if (noEixo[i] && noEixo[(i + 1) % n]) { k = i; break; }
  if (k < 0 || nEixo !== 2) return null;
  let cadeia = Array.from({ length: n }, (_, i) => pts[(k + 1 + i) % n]);
  if (cadeia[0][1] > cadeia[n - 1][1]) cadeia = cadeia.reverse();
  for (let i = 1; i < n; i++) if (cadeia[i][1] < cadeia[i - 1][1] - 2e-3) return null;
  for (let i = 1; i < n - 1; i++) if (cadeia[i][0] < 2e-3) return null;
  const z0 = cadeia[0][1]; const z1 = cadeia[n - 1][1];
  const baixo = (p) => Math.abs(p[1] - z0) < 2e-3; const alto = (p) => Math.abs(p[1] - z1) < 2e-3;
  const meio = cadeia.slice(1, -1);
  if (meio.length === 2 && baixo(meio[0]) && alto(meio[1])) {
    if (Math.abs(meio[0][0] - meio[1][0]) < 2e-3) return { tipo: 'cilindro', R: meio[0][0], z0, z1 };
    return { tipo: 'cone', R: meio[0][0], r2: meio[1][0], z0, z1 };
  }
  if (meio.length === 1 && baixo(meio[0])) return { tipo: 'cone', R: meio[0][0], r2: 0, z0, z1 };
  if (meio.length === 1 && alto(meio[0])) return { tipo: 'cone', R: 0, r2: meio[0][0], z0, z1 };
  return { tipo: 'revolucao', perfil: cadeia.map(([r, z]) => [r, z - z0]), z0, z1 };
}

/* Prisma de eixo n: tampas em duas alturas e laterais perpendiculares; devolve o contorno externo e os furos passantes. */
function tentarPrisma(d, n) {
  const nT = d.I.length / 3;
  const topo = []; const base = [];
  let hMaxTopo = -Infinity; let hMinTopo = Infinity; let hMaxBase = -Infinity; let hMinBase = Infinity;
  for (let t = 0; t < nT; t++) {
    const vs = [0, 1, 2].map((k) => d.I[t * 3 + k]);
    const cs = vs.map((v, k) => dot(nc(d, t, k), n));
    const ps = vs.map((v) => pv(d, v));
    if (cs.every((c) => c > 1 - TOL_NORMAL_TAMPA)) {
      topo.push(ps);
      for (const p of ps) { const h = dot(p, n); hMaxTopo = Math.max(hMaxTopo, h); hMinTopo = Math.min(hMinTopo, h); }
    } else if (cs.every((c) => c < -(1 - TOL_NORMAL_TAMPA))) {
      base.push(ps);
      for (const p of ps) { const h = dot(p, n); hMaxBase = Math.max(hMaxBase, h); hMinBase = Math.min(hMinBase, h); }
    } else if (!cs.every((c) => Math.abs(c) < TOL_NORMAL_LATERAL)) return null;
  }
  if (topo.length === 0 || base.length === 0) return null;
  if (hMaxTopo - hMinTopo > TOL_ALTURA || hMaxBase - hMinBase > TOL_ALTURA) return null;
  const altura = (hMaxTopo + hMinTopo) / 2 - (hMaxBase + hMinBase) / 2;
  if (!(altura > 1e-3)) return null;
  return { n, topo, base, altura, hBase: (hMaxBase + hMinBase) / 2 };
}

/* Classifica os laços [u, v] de uma tampa ou de uma seção: o de maior área é o contorno externo, e os de sentido oposto dentro dele são
   os furos. Devolve { externo (anti-horário), areaExterna, furos: [{ pontos, area }] } ou null (ilha, segunda região, furo dentro de
   furo ou nenhum laço). */
function contornosDeLacos(lacosBrutos, { ilhasPequenas = 0 } = {}) {
  const ls = lacosBrutos.map((l) => semColineares(l)).filter((l) => l.length >= 3);
  if (ls.length === 0) return null;
  const orden = ls.map((l) => ({ l, a: areaAssinada(l) })).sort((a, b) => Math.abs(b.a) - Math.abs(a.a));
  const [externo, ...resto] = orden;
  if (Math.abs(externo.a) < 1e-6) return null;
  const furos = [];
  for (const h of resto) {
    if (Math.sign(h.a) === Math.sign(externo.a)) { if (Math.abs(h.a) <= ilhasPequenas * Math.abs(externo.a)) continue; return null; } // ilha ou segunda região
    if (!h.l.every((p) => dentroDe(p, externo.l))) return null;
    furos.push(h);
  }
  for (let i = 0; i < furos.length; i++) for (let j = 0; j < furos.length; j++) if (i !== j && furos[i].l.every((p) => dentroDe(p, furos[j].l))) return null;
  return { externo: externo.a > 0 ? externo.l : [...externo.l].reverse(), areaExterna: Math.abs(externo.a), furos: furos.map((h) => ({ pontos: h.l, area: Math.abs(h.a) })) };
}

/* O quadro q girado de `ang` no plano do contorno (x' = cos x + sin z) e a função que leva um ponto [u, v] do quadro q ao girado. */
function girarQuadro(q, ang) {
  const x = encaixar(soma(esc(q.x, Math.cos(ang)), esc(q.z, Math.sin(ang))));
  const g = { x, y: q.y, z: unit(cruz(x, q.y)) };
  g.R = daColunas(g.x, g.y, g.z);
  const c = dot(g.x, q.x); const sn = dot(g.x, q.z);
  return { quadro: g, ponto: ([u, v]) => [c * u + sn * v, -sn * u + c * v] };
}

/* A seção da malha pelo plano de normal n à altura h: as arestas que o plano corta, orientadas pelo lado de fora do sólido,
   encadeadas em laços 3D. */
function lacosDaSeccao(d, n, h) {
  const segs = [];
  const nT = d.I.length / 3;
  for (let t = 0; t < nT; t++) {
    const ps = [0, 1, 2].map((k) => pv(d, d.I[t * 3 + k]));
    const hs = ps.map((p) => dot(p, n) - h);
    if (hs.every((x) => x > 0) || hs.every((x) => x < 0)) continue;
    const cortes = [];
    for (let k = 0; k < 3; k++) {
      const a = ps[k]; const b = ps[(k + 1) % 3]; const ha = hs[k]; const hb = hs[(k + 1) % 3];
      if ((ha < 0) !== (hb < 0)) cortes.push(soma(a, esc(sub(b, a), ha / (ha - hb))));
    }
    if (cortes.length !== 2) continue;
    const g = esc(cruz(sub(ps[1], ps[0]), sub(ps[2], ps[0])), d.sentido);
    const dir = cruz(n, g);
    segs.push(dot(sub(cortes[1], cortes[0]), dir) >= 0 ? cortes : [cortes[1], cortes[0]]);
  }
  const chave = (p) => `${Math.round(p[0] * SOLDA)},${Math.round(p[1] * SOLDA)},${Math.round(p[2] * SOLDA)}`;
  const saem = new Map();
  for (const [a, b] of segs) { const k = chave(a); if (!saem.has(k)) saem.set(k, []); saem.get(k).push({ a, b }); }
  const resultado = [];
  for (const [inicio, lista] of [...saem.entries()].sort((x, y) => (x[0] < y[0] ? -1 : 1))) {
    while (lista.length > 0) {
      const laco = [];
      let atual = lista.shift();
      for (;;) {
        laco.push(atual.a);
        const kb = chave(atual.b);
        if (kb === inicio) break;
        const prox = saem.get(kb);
        if (!prox || prox.length === 0) { laco.length = 0; break; }
        atual = prox.shift();
        if (laco.length > segs.length) { laco.length = 0; break; }
      }
      if (laco.length >= 3) resultado.push(laco);
    }
  }
  return resultado;
}

function candidatosDeNormal(d) {
  const nT = d.I.length / 3;
  const grupos = new Map();
  for (let t = 0; t < nT; t++) {
    const vs = [0, 1, 2].map((k) => d.I[t * 3 + k]);
    const n0 = nc(d, t, 0);
    if (!vs.every((v, k) => dot(nc(d, t, k), n0) > 1 - 1e-6)) continue; // face curva
    const [a, b, c] = vs.map((v) => pv(d, v));
    const area = norma(cruz(sub(b, a), sub(c, a))) / 2;
    let dir = encaixar(n0);
    const maior = [0, 1, 2].reduce((m, i) => (Math.abs(dir[i]) > Math.abs(dir[m]) + 1e-9 ? i : m), 0);
    if (dir[maior] < 0) dir = esc(dir, -1); // n e -n são o mesmo eixo de prisma: fica o de componente maior positivo
    const chave = dir.map((x) => Math.round(x * 2000)).join(',');
    const g = grupos.get(chave) ?? { dir, area: 0 };
    g.area += area;
    grupos.set(chave, g);
  }
  return [...grupos.values()].sort((a, b) => b.area - a.area || a.dir[0] - b.dir[0] || a.dir[1] - b.dir[1] || a.dir[2] - b.dir[2]).slice(0, 3).map((g) => g.dir);
}

/* A caixa orientada de menor volume, com um eixo na normal de uma das maiores faces planas (ou nos eixos do mundo). */
function melhorCaixa(d) {
  const nPts = d.P.length / 3;
  const pts = [];
  for (let v = 0; v < nPts; v++) pts.push(pv(d, v));
  const candidatas = [...candidatosDeNormal(d), ...EIXOS];
  let melhor = null;
  const vistos = new Set();
  for (const n of candidatas) {
    const chave = n.map((x) => Math.round(Math.abs(x) * 1000)).join(',');
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const q = quadroDoEixo(n);
    const p2 = pts.map((p) => [dot(p, q.x), dot(p, q.z)]);
    const ang = retanguloMinimo(p2);
    const x = encaixar(soma(esc(q.x, Math.cos(ang)), esc(q.z, Math.sin(ang))));
    const z = unit(cruz(x, q.y));
    const ext = [x, q.y, z].map((e) => { let lo = Infinity; let hi = -Infinity; for (const p of pts) { const t = dot(p, e); lo = Math.min(lo, t); hi = Math.max(hi, t); } return [lo, hi]; });
    const vol = ext.reduce((a, [lo, hi]) => a * (hi - lo), 1);
    if (melhor === null || vol < melhor.vol * (1 - 1e-6)) melhor = { vol, x, y: q.y, z, ext };
  }
  const eixosMundo = EIXOS.map((e) => { let lo = Infinity; let hi = -Infinity; for (const p of pts) { const t = dot(p, e); lo = Math.min(lo, t); hi = Math.max(hi, t); } return [lo, hi]; });
  const volMundo = eixosMundo.reduce((a, [lo, hi]) => a * (hi - lo), 1);
  if (volMundo <= melhor.vol * 1.005) melhor = { vol: volMundo, x: EIXOS[0], y: EIXOS[1], z: EIXOS[2], ext: eixosMundo };
  const centro = [0, 1, 2].reduce((c, i) => soma(c, esc([melhor.x, melhor.y, melhor.z][i], (melhor.ext[i][0] + melhor.ext[i][1]) / 2)), [0, 0, 0]);
  return { ...melhor, centro, dims: melhor.ext.map(([lo, hi]) => hi - lo) };
}

/* ---------- proximidade entre peças ---------- */

/* O ponto do triângulo (a, b, c) mais perto de p (Ericson, Real-Time Collision Detection). */
function pontoMaisPerto(p, a, b, c) {
  const ab = sub(b, a); const ac = sub(c, a); const ap = sub(p, a);
  const d1 = dot(ab, ap); const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b); const d3 = dot(ab, bp); const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return soma(a, esc(ab, d1 / (d1 - d3)));
  const cp = sub(p, c); const d5 = dot(ab, cp); const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return soma(a, esc(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return soma(b, esc(sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6))));
  const den = 1 / (va + vb + vc);
  return soma(a, soma(esc(ab, vb * den), esc(ac, vc * den)));
}

/* A grade de células que guarda, em cada uma, os triângulos da malha que chegam a `folga` dela. */
function grade(d, folga) {
  const { min, max } = aabbDe(d);
  const cel = Math.max(folga * 4, Math.max(...[0, 1, 2].map((i) => max[i] - min[i])) / 40, 1e-3);
  const celulas = new Map();
  const chave = (i, j, k) => `${i},${j},${k}`;
  for (let t = 0; t < d.I.length / 3; t++) {
    const ps = [0, 1, 2].map((k) => pv(d, d.I[t * 3 + k]));
    const lo = [0, 1, 2].map((e) => Math.floor((Math.min(ps[0][e], ps[1][e], ps[2][e]) - folga - min[e]) / cel));
    const hi = [0, 1, 2].map((e) => Math.floor((Math.max(ps[0][e], ps[1][e], ps[2][e]) + folga - min[e]) / cel));
    for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) {
      const c = chave(i, j, k);
      if (!celulas.has(c)) celulas.set(c, []);
      celulas.get(c).push(t);
    }
  }
  return { celulas, cel, min, chave };
}

/* A menor distância dos vértices de `a` aos triângulos de `b` (com a grade de `b`), ou Infinity quando passa de `limite`. */
function distanciaAteMalha(a, b, g, limite) {
  let melhor = Infinity;
  for (let v = 0; v < a.P.length / 3; v++) {
    const p = pv(a, v);
    const idx = [0, 1, 2].map((e) => Math.floor((p[e] - g.min[e]) / g.cel));
    const ts = g.celulas.get(g.chave(...idx));
    if (!ts) continue;
    for (const t of ts) {
      const q = pontoMaisPerto(p, pv(b, b.I[t * 3]), pv(b, b.I[t * 3 + 1]), pv(b, b.I[t * 3 + 2]));
      const dd = norma(sub(p, q));
      if (dd < melhor) { melhor = dd; if (melhor <= limite * 0.01) return melhor; }
    }
  }
  return melhor;
}

/* ---------- da classificação às formas do esboço ---------- */

const volumeDoPerfil = (pontos) => { // sólido de revolução de [raio, altura] (Pappus, por trechos)
  let v = 0;
  for (let i = 0; i < pontos.length; i++) { const [r1, z1] = pontos[i]; const [r2, z2] = pontos[(i + 1) % pontos.length]; v += (z2 - z1) * (r1 * r1 + r1 * r2 + r2 * r2); }
  return Math.abs((Math.PI * v) / 3);
};

function classificar(kernel, R, d) {
  const aabb = aabbDe(d);
  const rev = eixoDeRevolucao(d);
  if (rev) {
    const ls = perfilDaRevolucao(kernel, R, d, rev.eixo, rev.centro);
    if (ls.length === 1) {
      const perfil = formaDeRevolucao(ls[0]);
      if (perfil) {
        const forma = finalizarRevolucao(perfil, rev.eixo, rev.centro);
        if (Math.abs(forma.volumeDaForma - d.volume) <= TOL_VOLUME * d.volume) return forma;
      }
    }
  }
  const candidatos = candidatosDeNormal(d);
  for (const n of candidatos) {
    const pr = tentarPrisma(d, n);
    if (!pr) continue;
    const q0 = quadroDoEixo(n);
    const proj = (p) => [dot(p, q0.x), dot(p, q0.z)];
    const topo0 = contornosDeLacos(lacos(pr.topo, proj));
    const base0 = contornosDeLacos(lacos(pr.base, proj));
    if (!topo0 || !base0) continue;
    if (Math.abs(topo0.areaExterna - base0.areaExterna) > 2e-3 * topo0.areaExterna || topo0.furos.length !== base0.furos.length) continue;
    const areaUtil = topo0.areaExterna - topo0.furos.reduce((a, f) => a + f.area, 0);
    if (Math.abs(areaUtil * pr.altura - d.volume) > TOL_VOLUME * d.volume) continue;
    const { quadro: q, ponto } = girarQuadro(q0, retanguloMinimo(topo0.externo));
    const topo = { ...topo0, externo: topo0.externo.map(ponto), furos: topo0.furos.map((f) => ({ ...f, pontos: f.pontos.map(ponto) })) };
    if (topo.furos.length === 0 && topo.externo.length === 4) { // o prisma de contorno retangular é uma caixa exata
      const [a, b, c2] = topo.externo;
      const l1 = [b[0] - a[0], b[1] - a[1]]; const l2 = [c2[0] - b[0], c2[1] - b[1]];
      if (Math.abs(l1[0] * l2[0] + l1[1] * l2[1]) <= 1e-3 * Math.hypot(...l1) * Math.hypot(...l2)) {
        const us = topo.externo.map((p) => p[0]); const vs = topo.externo.map((p) => p[1]);
        const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
        const centro = soma(soma(esc(q.x, (u0 + u1) / 2), esc(q.z, (v0 + v1) / 2)), esc(q.y, pr.hBase + pr.altura / 2));
        return { classe: 'caixa', exata: true, x: q.x, y: q.y, z: q.z, dims: [u1 - u0, pr.altura, v1 - v0], centro, volumeDaForma: areaUtil * pr.altura, ocupacao: d.volume / (areaUtil * pr.altura), ajuste: 1 };
      }
    }
    return { classe: 'extrusao', quadro: q, n, altura: pr.altura, hBase: pr.hBase, topo, volumeDaForma: areaUtil * pr.altura };
  }
  // as formas aproximadas: valem quando o ajuste é melhor que o da caixa e passa de LIMIAR_APROXIMADO (razão entre o menor e o maior volume)
  const cx = melhorCaixa(d);
  const volCaixa = cx.dims[0] * cx.dims[1] * cx.dims[2];
  const caixa = { classe: 'caixa', ...cx, volumeDaForma: volCaixa, ocupacao: d.volume / volCaixa, aabb, ajuste: d.volume / volCaixa };
  let melhor = caixa;
  const considera = (c) => { if (c && c.ajuste >= LIMIAR_APROXIMADO && c.ajuste > melhor.ajuste + 0.02) melhor = c; };
  // prisma aproximado: o contorno e os furos da seção do meio, estendidos por toda a altura (chanfros e raios das bordas ficam de fora)
  const eixosDoPrisma = [];
  const poeEixo = (v) => { const u = unit(v); if (norma(v) > 1e-6 && !eixosDoPrisma.some((n) => Math.abs(dot(n, u)) > 0.999)) eixosDoPrisma.push(encaixar(u)); };
  candidatos.forEach(poeEixo);
  autoSimetrica(d.inercia).forEach((e) => poeEixo(e.vetor));
  for (let i = 0; i < candidatos.length; i++) for (let j = i + 1; j < candidatos.length; j++) poeEixo(cruz(candidatos[i], candidatos[j])); // o eixo perpendicular a duas laterais
  EIXOS.forEach(poeEixo);
  for (const n of eixosDoPrisma) {
    let hmin = Infinity; let hmax = -Infinity;
    for (let v = 0; v < d.P.length / 3; v++) { const h = dot(pv(d, v), n); hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); }
    const altura = hmax - hmin;
    if (!(altura > 1e-3)) continue;
    const q0 = quadroDoEixo(n);
    const secao = (fracao) => {
      let h = hmin + fracao * altura;
      for (let i = 0; i < 20; i++) {
        let perto = false;
        for (let v = 0; v < d.P.length / 3 && !perto; v++) perto = Math.abs(dot(pv(d, v), n) - h) < 1e-4;
        if (!perto) break;
        h += 0.0137;
      }
      return contornosDeLacos(lacosDaSeccao(d, n, h).map((l) => l.map((p) => [dot(p, q0.x), dot(p, q0.z)])), { ilhasPequenas: 0.03 });
    };
    const ct = secao(0.5);
    if (!ct) continue;
    // num prisma as seções são iguais: a de 20% e a de 80% têm de ter a área e o lugar da do meio, senão a seção do meio é só uma fatia
    const caixaDe = (c) => { const us = c.externo.map((q) => q[0]); const vs = c.externo.map((q) => q[1]); return [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)]; };
    const [m0, m1, m2, m3] = caixaDe(ct);
    const tamanho = Math.max(m1 - m0, m3 - m2);
    let consistente = true;
    for (const f of [0.2, 0.8]) {
      const o = secao(f);
      if (!o || Math.abs(o.areaExterna - ct.areaExterna) > 0.12 * ct.areaExterna) { consistente = false; break; }
      const [o0, o1, o2, o3] = caixaDe(o);
      if (Math.max(Math.abs(o0 - m0), Math.abs(o1 - m1), Math.abs(o2 - m2), Math.abs(o3 - m3)) > 0.06 * tamanho) { consistente = false; break; }
    }
    if (!consistente) continue;
    const forma = (ct.areaExterna - ct.furos.reduce((a, f) => a + f.area, 0)) * altura;
    const razao = d.volume / forma;
    // o contorno tem de conter a projeção do sólido inteiro: sem isso a seção do meio é só uma fatia, e o volume pode coincidir por acaso
    let fora = 0;
    for (let v = 0; v < d.P.length / 3; v++) {
      const p = pv(d, v);
      if (!dentroOuNaBorda([dot(p, q0.x), dot(p, q0.z)], ct.externo, 0.5)) fora++;
    }
    if (fora > 0.15 * (d.P.length / 3)) continue;
    const { quadro: q, ponto } = girarQuadro(q0, retanguloMinimo(ct.externo));
    const topo = { ...ct, externo: ct.externo.map(ponto), furos: ct.furos.map((f) => ({ ...f, pontos: f.pontos.map(ponto) })) };
    considera({ classe: 'extrusao', aproximada: true, quadro: q, n, altura, hBase: hmin, topo, volumeDaForma: forma, ajuste: Math.min(razao, 1 / razao) });
  }
  considera(revolucaoAproximada(d));
  return melhor;
}

/* O eixo e o perfil de uma revolução aproximada: o eixo é o principal de inércia cujos outros dois momentos diferem até 8%, e o perfil
   é o contorno externo (o maior raio a cada altura), de modo que fendas e furos de través não entram. */
function revolucaoAproximada(d) {
  const eg = autoSimetrica(d.inercia).sort((a, b) => a.valor - b.valor);
  let melhor = null;
  for (let k = 0; k < 3; k++) {
    const [o1, o2] = [0, 1, 2].filter((i) => i !== k).map((i) => eg[i].valor);
    if (Math.abs(o1 - o2) > 0.08 * Math.max(o1, o2)) continue;
    let a = encaixar(eg[k].vetor);
    const maior = [0, 1, 2].reduce((m, i) => (Math.abs(a[i]) > Math.abs(a[m]) + 1e-9 ? i : m), 0);
    if (a[maior] < 0) a = esc(a, -1);
    const c = d.centroDeMassa;
    const nV = d.P.length / 3;
    const zs = new Float64Array(nV); const rs = new Float64Array(nV);
    let zmin = Infinity; let zmax = -Infinity;
    for (let v = 0; v < nV; v++) {
      const r = sub(pv(d, v), c);
      zs[v] = dot(r, a); rs[v] = norma(sub(r, esc(a, zs[v])));
      zmin = Math.min(zmin, zs[v]); zmax = Math.max(zmax, zs[v]);
    }
    if (!(zmax - zmin > 1e-3)) continue;
    const K = 96;
    const passo = (zmax - zmin) / K;
    const rho = new Float64Array(K);
    const bin = (z) => Math.max(0, Math.min(K - 1, Math.floor((z - zmin) / passo)));
    for (let t = 0; t < d.I.length / 3; t++) {
      for (let e = 0; e < 3; e++) {
        const v1 = d.I[t * 3 + e]; const v2 = d.I[t * 3 + ((e + 1) % 3)];
        let [z1, r1, z2, r2] = [zs[v1], rs[v1], zs[v2], rs[v2]];
        if (z1 > z2) [z1, r1, z2, r2] = [z2, r2, z1, r1];
        const b1 = bin(z1); const b2 = bin(z2);
        for (let b = b1; b <= b2; b++) {
          const zc = Math.max(z1, Math.min(z2, zmin + (b + 0.5) * passo));
          const rr = z2 - z1 < 1e-9 ? Math.max(r1, r2) : r1 + ((r2 - r1) * (zc - z1)) / (z2 - z1);
          if (rr > rho[b]) rho[b] = rr;
          if (b === b1 && z2 - z1 < 1e-9) break;
        }
      }
    }
    const linha = [[rho[0], zmin], ...Array.from({ length: K }, (_, b) => [rho[b], zmin + (b + 0.5) * passo]), [rho[K - 1], zmax]];
    const simples = simplificarLinha(linha, 0.15);
    const perfil = formaDeRevolucao([[0, zmin], ...simples, [0, zmax]]);
    if (!perfil) continue;
    const forma = finalizarRevolucao(perfil, a, c);
    const razao = d.volume / forma.volumeDaForma;
    const ajuste = Math.min(razao, 1 / razao);
    if (melhor === null || ajuste > melhor.ajuste) melhor = { ...forma, aproximada: true, ajuste };
  }
  return melhor;
}

/* Douglas-Peucker de uma linha [raio, altura], mantendo as pontas. */
function simplificarLinha(pts, tol) {
  if (pts.length <= 2) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const ab = [b[0] - a[0], b[1] - a[1]]; const len = Math.hypot(...ab);
  let imax = 0; let dmax = -1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = len < 1e-12 ? Math.hypot(pts[i][0] - a[0], pts[i][1] - a[1]) : Math.abs(ab[0] * (pts[i][1] - a[1]) - ab[1] * (pts[i][0] - a[0])) / len;
    if (d > dmax) { dmax = d; imax = i; }
  }
  if (dmax <= tol) return [a, b];
  return [...simplificarLinha(pts.slice(0, imax + 1), tol).slice(0, -1), ...simplificarLinha(pts.slice(imax), tol)];
}

/* A forma de revolução com o eixo posto no sentido em que o cone fica com a base larga no começo; devolve a classificação. */
function finalizarRevolucao(perfil, eixo, centro) {
  let eixoFinal = eixo;
  const p = { ...perfil };
  if (p.tipo === 'cone' && p.r2 > p.R) {
    eixoFinal = esc(eixo, -1);
    [p.R, p.r2, p.z0, p.z1] = [p.r2, p.R, -p.z1, -p.z0];
  }
  return { classe: 'revolucao', ...p, quadro: quadroDoEixo(eixoFinal), origem: centro, volumeDaForma: volumeDeRevolucao(p) };
}

function volumeDeRevolucao(p) {
  const pi = Math.PI;
  switch (p.tipo) {
    case 'cilindro': return pi * p.R * p.R * (p.z1 - p.z0);
    case 'cone': return (pi * (p.z1 - p.z0) / 3) * (p.R * p.R + p.R * p.r2 + p.r2 * p.r2);
    case 'anel': return pi * (p.R * p.R - p.r * p.r) * (p.z1 - p.z0);
    default: return volumeDoPerfil(p.perfil);
  }
}

/* Passa a classificação para as formas do esboço (a principal e os cortadores). */
function formasDoEsboco(id, c) {
  const comRotacao = (forma, R) => { const rot = angulosDaRotacao(R); if (rot.some((a) => Math.abs(a) > 1e-6)) forma.rotacao = rot; return forma; };
  if (c.classe === 'caixa') {
    const forma = { id, tipo: 'caixa', largura: arred(c.dims[0]), altura: arred(c.dims[1]), profundidade: arred(c.dims[2]), centro: vet(c.centro) };
    return { forma: comRotacao(forma, daColunas(c.x, c.y, c.z)), cortadores: [] };
  }
  if (c.classe === 'revolucao') {
    const { quadro: q, origem } = c;
    const ponto = (z) => soma(origem, esc(q.y, z));
    const meio = (c.z0 + c.z1) / 2;
    const centro = ponto(meio);
    let forma;
    if (c.tipo === 'cilindro') forma = { id, tipo: 'cilindro', diametro: arred(2 * c.R), comprimento: arred(c.z1 - c.z0), eixo: 'y', centro: vet(centro) };
    else if (c.tipo === 'anel') forma = { id, tipo: 'anel', diametroExterno: arred(2 * c.R), diametroInterno: arred(2 * c.r), espessura: arred(c.z1 - c.z0), eixo: 'y', centro: vet(centro) };
    else if (c.tipo === 'cone') forma = { id, tipo: 'cone', diametro: arred(2 * c.R), diametroTopo: arred(2 * c.r2), comprimento: arred(c.z1 - c.z0), eixo: 'y', centro: vet(centro) };
    else forma = { id, tipo: 'revolucao', perfil: c.perfil.map(([r, z]) => [arred(r), arred(z)]), eixo: 'y', centro: vet(centro) };
    return { forma: comRotacao(forma, q.R), cortadores: [] };
  }
  // extrusão
  const { quadro: q, topo } = c;
  const uv = topo.externo;
  const [u0, u1] = [Math.min(...uv.map((p) => p[0])), Math.max(...uv.map((p) => p[0]))];
  const [v0, v1] = [Math.min(...uv.map((p) => p[1])), Math.max(...uv.map((p) => p[1]))];
  const uc = (u0 + u1) / 2; const vc = (v0 + v1) / 2;
  const hc = c.hBase + c.altura / 2;
  const mundo = (u, v, h) => soma(soma(esc(q.x, u), esc(q.z, v)), esc(q.y, h));
  const centro = mundo(uc, vc, hc);
  const perfil = uv.map(([u, v]) => [arred(u - uc), arred(v - vc)]);
  const forma = { id, tipo: 'extrusao', perfil, comprimento: arred(c.altura), eixo: 'y', centro: vet(centro) };
  const cortadores = topo.furos.map((f, i) => {
    const cid = `${id}_furo_${i + 1}`;
    const circ = circuloDoLaco(f.pontos);
    const folga = 2; // o cortador passa 1 mm de cada lado para não ficar rente às tampas
    if (circ) {
      return comRotacao({ id: cid, tipo: 'cilindro', diametro: arred(2 * circ.raio), comprimento: arred(c.altura + folga), eixo: 'y', centro: vet(mundo(circ.centro[0], circ.centro[1], hc)), cortador: true }, q.R);
    }
    const fu = f.pontos; const fu0 = Math.min(...fu.map((p) => p[0])); const fu1 = Math.max(...fu.map((p) => p[0])); const fv0 = Math.min(...fu.map((p) => p[1])); const fv1 = Math.max(...fu.map((p) => p[1]));
    const fuc = (fu0 + fu1) / 2; const fvc = (fv0 + fv1) / 2;
    return comRotacao({ id: cid, tipo: 'extrusao', perfil: fu.map(([a, b]) => [arred(a - fuc), arred(b - fvc)]), comprimento: arred(c.altura + folga), eixo: 'y', centro: vet(mundo(fuc, fvc, hc)), cortador: true }, q.R);
  });
  if (cortadores.length > 0) forma.subtrai = cortadores.map((x) => x.id);
  return { forma: comRotacao(forma, q.R), cortadores };
}

/* ---------- a importação ---------- */

/**
 * @param {string} texto o conteúdo do STEP
 * @param {{ frente?: string, girar?: number[], arquivo?: string, toleranciaDeContato?: number, nomes?: Record<string,string> }} [opcoes]
 */
export async function importarStep(texto, { frente = '+y', girar = [0, 0, 0], arquivo = 'objeto.step', toleranciaDeContato = 0.1, nomes = {} } = {}) {
  const quadro = quadroDoEsboco({ frente, girar });
  const { kernel, dados, R } = await lerSolidos(texto, quadro);
  try {
    const pecas = dados.map((d) => ({ d, c: classificar(kernel, R, d) }));
    const ocupados = new Set();
    const pad = String(dados.length).length;
    const pecasComId = pecas.map(({ d, c }) => {
      const forma = c.classe === 'revolucao' ? c.tipo : c.classe === 'extrusao' ? 'extrusao' : 'caixa';
      const base = d.nome && !GENERICO.test(d.nome) ? idDoNome(d.nome) : '';
      let id = nomes[d.nome] ?? (base || `peca_${String(d.ordem).padStart(pad, '0')}_${forma}`);
      if (ocupados.has(id)) id = `peca_${String(d.ordem).padStart(pad, '0')}_${forma}`;
      ocupados.add(id);
      return { d, c, id, nomeGenerico: !base };
    });
    const formas = [];
    const relPecas = [];
    for (const { d, c, id, nomeGenerico } of pecasComId) {
      const { forma, cortadores } = formasDoEsboco(id, c);
      formas.push(forma, ...cortadores);
      relPecas.push({
        id, nomeNoStep: d.nome || null, nomeGenerico, ordem: d.ordem, classe: c.classe, tipo: forma.tipo,
        furos: cortadores.length, volumeDoSolido_mm3: arred(d.volume, 2), volumeDaForma_mm3: arred(c.volumeDaForma, 2),
        ocupacao: arred(d.volume / c.volumeDaForma, 3), ...(c.aproximada ? { aproximada: 'prisma pela seção do meio: os chanfros e raios das bordas não entram' } : {}), ...(c.classe === 'caixa' && !c.exata ? { marcada: `caixa orientada, último recurso: ocupação ${arred(c.ocupacao, 3)}` } : {}),
      });
    }
    // contatos por proximidade: a menor distância entre as malhas (a flecha da malha é de décimos de µm a µm, bem abaixo da tolerância)
    const contatos = [];
    const caixas = dados.map((d) => aabbDe(d));
    const grades = new Map();
    for (let i = 0; i < dados.length; i++) {
      for (let j = i + 1; j < dados.length; j++) {
        const longe = [0, 1, 2].some((e) => caixas[i].min[e] > caixas[j].max[e] + toleranciaDeContato || caixas[j].min[e] > caixas[i].max[e] + toleranciaDeContato);
        if (longe) continue;
        for (const k of [i, j]) if (!grades.has(k)) grades.set(k, grade(dados[k], toleranciaDeContato));
        const dist = Math.min(distanciaAteMalha(dados[i], dados[j], grades.get(j), toleranciaDeContato), distanciaAteMalha(dados[j], dados[i], grades.get(i), toleranciaDeContato));
        if (dist <= toleranciaDeContato) contatos.push({ a: pecasComId[i].id, b: pecasComId[j].id, distancia_mm: arred(dist, 3) });
      }
    }
    const porClasse = {};
    const porTipo = {};
    for (const p of relPecas) { porClasse[p.classe] = (porClasse[p.classe] ?? 0) + 1; porTipo[p.tipo] = (porTipo[p.tipo] ?? 0) + 1; }
    const ocupacaoMedia = relPecas.reduce((s, p) => s + Math.min(p.ocupacao, 1 / p.ocupacao), 0) / relPecas.length;
    const nome = arquivo.replace(/^.*[\\/]/, '').replace(/\.(?:step|stp)$/i, '');
    const sha = createHash('sha256').update(texto).digest('hex');
    const nCaixas = relPecas.filter((p) => p.classe === 'caixa' && p.marcada).length;
    const aproximadas = relPecas.filter((p) => p.aproximada).length;
    const exatas = relPecas.length - nCaixas - aproximadas;
    const giro = girar.some((g) => g !== 0);
    const plano = {
      texto: [
        `Importado de ${nome}.step (sha256 ${sha.slice(0, 16)}) por importar-step, sem desenhar à mão: cada um dos ${relPecas.length} sólidos é uma peça. Quadro: o z do CAD é o y do esboço (para cima), e a direção ${frente} do CAD é a frente do esboço, em -z; rotação própria, sem espelhar nem escalar, em milímetro.${giro ? ` Antes disso o objeto foi girado [${girar.join(', ')}] graus no quadro do CAD.` : ''}`,
        `Cada peça é a forma mais simples que a representa: ${porClasse.revolucao ?? 0} de revolução (cilindro, cone, anel ou perfil), ${porClasse.extrusao ?? 0} extrusão(ões) do contorno com os furos passantes como cortadores, ${relPecas.filter((p) => p.classe === 'caixa' && !p.marcada).length} caixa(s) exata(s) e ${nCaixas} caixa(s) orientada(s) de último recurso. ${exatas} peça(s) são exatas (o volume da forma fecha com o do sólido) e ${aproximadas} são aproximadas (prisma pela seção do meio ou revolução pelo contorno externo, com os chanfros, raios e furos de través de fora); a ocupação de cada uma está no relato da importação.`,
        `Os ${contatos.length} contato(s) vêm da distância exata entre os sólidos (até ${toleranciaDeContato} mm) e ficam em plano.contrato.tocam; o contato do esboço fica desligado até o esbocista decidir as exceções.`,
      ].join(' '),
      contrato: { tocam: contatos.map((c) => [c.a, c.b]) },
    };
    if (contatos.length === 0) delete plano.contrato;
    const esboco = {
      plano,
      contato: { usar: false },
      opcoes: [{ titulo: nome, nota: `Importado do STEP: ${relPecas.length} peças (${Object.entries(porTipo).map(([t, n]) => `${n} ${t}`).join(', ')})`, formas }],
    };
    const relatorio = {
      fonte: { arquivo: `${nome}.step`, sha256: sha },
      quadro: { frente, girar, regra: '(x, y, z)_cad -> (x, z, -y), girado em torno de y para a frente escolhida ficar em -z; o giro de `girar` vem antes, no quadro do CAD' },
      leitor: 'occt-wasm (OpenCascade)',
      pecas: relPecas,
      contatos,
      toleranciaDeContato_mm: toleranciaDeContato,
      classes: porClasse,
      tipos: porTipo,
      exatas,
      aproximadas,
      caixasUltimoRecurso: nCaixas,
      ocupacaoMedia: arred(ocupacaoMedia, 3),
      caixas: relPecas.filter((p) => p.marcada).map((p) => ({ id: p.id, ocupacao: p.ocupacao })),
    };
    const malhas = pecasComId.map(({ d, id }, i) => ({
      id,
      formas: [id, ...(formas.filter((f) => f.cortador && f.id.startsWith(`${id}_furo_`)).map((f) => f.id))],
      triangulos: Array.from({ length: d.nTri }, (_, t) => tri(d, t)),
      volume: d.volume,
      ordem: i + 1,
    }));
    return { esboco, texto: serializar(esboco), relatorio, malhas };
  } finally {
    kernel.releaseAll();
  }
}

/* A conferência numérica: cada peça importada contra a malha do próprio sólido (o OpenCascade a gera do B-rep), pelo mesmo
   `conferirComMalha` do importador de `.csg`. Devolve a razão interseção/união por peça e a do conjunto (soma das interseções
   sobre a soma das uniões, que vale porque cada peça é medida contra o próprio sólido). */
export async function conferirStep({ esboco, malhas }) {
  const { conferirComMalha } = await import('./esboco-importar-csg-conferir.mjs');
  const identidade = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  const [opcao] = esboco.opcoes;
  const porPeca = [];
  let comum = 0; let uniao = 0;
  for (const m of malhas) {
    const sub = { plano: { texto: m.id }, contato: { usar: false }, opcoes: [{ titulo: m.id, formas: opcao.formas.filter((f) => m.formas.includes(f.id)) }] };
    const colada = m.triangulos.map((t) => t.map((p) => p.map((x) => Math.round(x * 1e3) / 1e3))); // vértices a menos de 1 µm viram um só
    try {
      const c = await conferirComMalha(JSON.parse(JSON.stringify(sub)), colada, identidade);
      porPeca.push({ id: m.id, iou: c.iou, volumeDoSolido_mm3: c.volumeDoOpenScad_mm3, volumeDaForma_mm3: c.volumeDoEsboco_mm3 });
      comum += c.volumeComum_mm3;
      uniao += c.volumeDoOpenScad_mm3 + c.volumeDoEsboco_mm3 - c.volumeComum_mm3;
    } catch (e) {
      porPeca.push({ id: m.id, iou: null, semMedida: String(e.message ?? e) });
    }
  }
  const medidas = porPeca.filter((p) => p.iou !== null);
  return {
    iouDoConjunto: uniao > 0 ? arred(comum / uniao, 4) : null,
    iouMedioPorPeca: medidas.length > 0 ? arred(medidas.reduce((a, p) => a + p.iou, 0) / medidas.length, 4) : null,
    pecasMedidas: medidas.length,
    pecasSemMedida: porPeca.length - medidas.length,
    porPeca,
  };
}

export { serializar };
