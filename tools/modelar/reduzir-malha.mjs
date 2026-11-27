/* reduzir-malha.mjs — o redutor de malha: menos triângulos na saída, com o desvio sob um teto declarado.
 *
 * O QUE FAZ. Recebe a malha neutra que `executarReceita` entrega (`V`: id -> [x, y, z] em metro; `F`: id -> { vs, parte, material, liso,
 * quebras, ... }) e devolve um derivado dela, sem tocá-la. Cada face é triangulada pela triangulação do núcleo (`triangularFace`, a mesma
 * do adaptador), e a redução é a remoção de vértices por colapso de meia-aresta: o vértice some para cima de um vizinho, nenhuma posição
 * nova nasce e todo vértice que sobrevive tem o id e a posição que tinha. Por isso as normais, o `liso` e as quebras de cada face seguem
 * valendo para os triângulos que ficam.
 *
 * O QUE ELE NÃO MEXE. Borda aberta, aresta de mais de duas faces, aresta com diedro acima de `quinaGraus` e aresta entre faces de parte,
 * material, `liso`, `quebras` ou cor diferentes só encolhem ao longo de si mesmas (um vértice no meio da linha pode ir para o vizinho dela,
 * se a linha nova ficar a menos do teto da antiga); os cantos em que a linha dobra ou se bifurca ficam. Triângulo de área nula na entrada
 * trava os vértices dele.
 *
 * O TETO. Um colapso só vale se (1) todo vértice original que o triângulo novo absorveu fica a no máximo o teto interno da malha reduzida,
 * (2) as amostras de cada triângulo novo (uma grade baricêntrica de três divisões) ficam a no máximo o teto interno da malha original,
 * medidas numa grade espacial sobre os triângulos originais, (3) a normal do triângulo novo fica a no máximo `normalGraus` x `margemNormal`
 * (0,5) da normal de cada triângulo original ao redor de um vértice liso que ele absorveu (o vértice de uma linha de feição pede um
 * triângulo novo perto de cada face original dele, do lado dela), e (4) o triângulo novo não vira de lado (a normal fica a `normalGraus` x `margemNormal` da que ele substitui e da dos triângulos que somem) nem vira lasca (qualidade mínima `QUALIDADE_MINIMA`, ou a que o triângulo já tinha). O colapso que não passa é recusado.
 * O teto interno é `toleranciaMm` x `margem` (0,65), porque o redutor mede vértices e amostras e o desvio verdadeiro passa por pontos entre
 * elas: nas partes curvas do furgão o desvio medido por amostragem fina foi até 1,45 vez o dos vértices. A conferência de que o teto declarado
 * valeu é de outro código: `docs/modelar/banco-de-provas/reduzir-poligonos-2026-11-27/conferir-reducao.mjs`.
 *
 * ORDEM E DETERMINISMO. Fila de prioridade: primeiro o degrau de desvio do colapso (o teto interno em oito degraus), dentro do degrau a menor
 * aresta, e no empate o índice do vértice que some e depois o do vizinho; os índices são a ordem de `V`. A mesma entrada dá a mesma saída, bit a bit. O tempo não entra no resultado.
 *
 * A SAÍDA. `{ V, F, mapa, estatisticas }`. `V` tem só os vértices que sobraram em triângulos, com o id de antes. `F` tem triângulos: o
 * primeiro triângulo de uma face guarda o id dela, os seguintes `${id}#${k}`; cada um leva os campos da face de origem (menos `vs`) e
 * `origem`, o id da face. `mapa` leva o id de cada triângulo removido ao do triângulo que o absorveu e sobrevive, com a mesma parte.
 *
 * É função pura; ainda não tem comando (o comando vem na fatia 2 do plano de reduzir polígonos). */
import { triangularFace } from '../../procedural/nucleo/triangulacao-face.js';

export const TOLERANCIA_MM = 0.05;
export const NORMAL_GRAUS = 2;
export const QUINA_GRAUS = 30;
export const QUALIDADE_MINIMA = 0.05;
export const MARGEM = 0.65;
export const MARGEM_NORMAL = 0.5;
const RAD = 180 / Math.PI;
const MAX_ANEL = 120;
const DEGRAUS = 8;
const M = 131072;

/* ---- geometria ---- */

/* distância ao quadrado do ponto ao triângulo (a, b, c), índices em P */
function distTri2(P, px, py, pz, a, b, c) {
  const ax = P[3 * a], ay = P[3 * a + 1], az = P[3 * a + 2];
  const abx = P[3 * b] - ax, aby = P[3 * b + 1] - ay, abz = P[3 * b + 2] - az;
  const acx = P[3 * c] - ax, acy = P[3 * c + 1] - ay, acz = P[3 * c + 2] - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  let qx, qy, qz;
  if (d1 <= 0 && d2 <= 0) { qx = ax; qy = ay; qz = az; } else {
    const bpx = apx - abx, bpy = apy - aby, bpz = apz - abz;
    const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
    if (d3 >= 0 && d4 <= d3) { qx = ax + abx; qy = ay + aby; qz = az + abz; } else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1 / (d1 - d3); qx = ax + t * abx; qy = ay + t * aby; qz = az + t * abz; } else {
        const cpx = apx - acx, cpy = apy - acy, cpz = apz - acz;
        const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
        if (d6 >= 0 && d5 <= d6) { qx = ax + acx; qy = ay + acy; qz = az + acz; } else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2 / (d2 - d6); qx = ax + t * acx; qy = ay + t * acy; qz = az + t * acz; } else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
              const t = (d4 - d3) / ((d4 - d3) + (d5 - d6)); qx = ax + abx + t * (acx - abx); qy = ay + aby + t * (acy - aby); qz = az + abz + t * (acz - abz);
            } else { const den = 1 / (va + vb + vc); const s = vb * den, t = vc * den; qx = ax + abx * s + acx * t; qy = ay + aby * s + acy * t; qz = az + abz * s + acz * t; }
          }
        }
      }
    }
  }
  const dx = px - qx, dy = py - qy, dz = pz - qz;
  return dx * dx + dy * dy + dz * dz;
}

/* distância ao quadrado do ponto ao segmento (a, b) */
function distSeg2(P, p, a, b) {
  const ax = P[3 * a], ay = P[3 * a + 1], az = P[3 * a + 2];
  const dx = P[3 * b] - ax, dy = P[3 * b + 1] - ay, dz = P[3 * b + 2] - az;
  const px = P[3 * p] - ax, py = P[3 * p + 1] - ay, pz = P[3 * p + 2] - az;
  const l = dx * dx + dy * dy + dz * dz;
  let t = l > 0 ? (px * dx + py * dy + pz * dz) / l : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = px - t * dx, ey = py - t * dy, ez = pz - t * dz;
  return ex * ex + ey * ey + ez * ez;
}

/* A grade espacial sobre os triângulos ORIGINAIS: níveis de célula (cada um 4 vezes maior que o anterior), e cada triângulo vai ao
   primeiro nível em que cobre poucas células. `dentroDe` devolve a menor distância ao quadrado até um triângulo a no máximo `r`. */
function criarGrade(P, T, nT, celula) {
  let mn0 = Infinity, mn1 = Infinity, mn2 = Infinity;
  for (let i = 0; i < P.length; i += 3) { if (P[i] < mn0) mn0 = P[i]; if (P[i + 1] < mn1) mn1 = P[i + 1]; if (P[i + 2] < mn2) mn2 = P[i + 2]; }
  const mn = [mn0, mn1, mn2];
  const niveis = [];
  const nivel = (L) => { while (niveis.length <= L) niveis.push({ s: celula * 4 ** niveis.length, cels: new Map() }); return niveis[L]; };
  const lo = [0, 0, 0], hi = [0, 0, 0];
  for (let t = 0; t < nT; t++) {
    for (let k = 0; k < 3; k++) {
      const x = P[3 * T[3 * t] + k], y = P[3 * T[3 * t + 1] + k], z = P[3 * T[3 * t + 2] + k];
      lo[k] = Math.min(x, y, z) - mn[k]; hi[k] = Math.max(x, y, z) - mn[k];
    }
    let L = 0;
    for (;; L++) {
      const s = celula * 4 ** L;
      const n = (Math.floor(hi[0] / s) - Math.floor(lo[0] / s) + 1) * (Math.floor(hi[1] / s) - Math.floor(lo[1] / s) + 1) * (Math.floor(hi[2] / s) - Math.floor(lo[2] / s) + 1);
      if (n <= 27 || L >= 8) break;
    }
    const nv = nivel(L); const s = nv.s;
    for (let i = Math.floor(lo[0] / s); i <= Math.floor(hi[0] / s); i++) for (let j = Math.floor(lo[1] / s); j <= Math.floor(hi[1] / s); j++) for (let k = Math.floor(lo[2] / s); k <= Math.floor(hi[2] / s); k++) {
      const c = (i * M + j) * M + k; const l = nv.cels.get(c); if (l) l.push(t); else nv.cels.set(c, [t]);
    }
  }
  return {
    dentroDe(px, py, pz, r) {
      let melhor = Infinity;
      const x = px - mn[0], y = py - mn[1], z = pz - mn[2];
      for (const { s, cels } of niveis) {
        if (!cels.size) continue;
        const i1 = Math.floor((x + r) / s), j1 = Math.floor((y + r) / s), k1 = Math.floor((z + r) / s);
        for (let i = Math.floor((x - r) / s); i <= i1; i++) for (let j = Math.floor((y - r) / s); j <= j1; j++) for (let k = Math.floor((z - r) / s); k <= k1; k++) {
          const l = cels.get((i * M + j) * M + k); if (!l) continue;
          for (let q = 0; q < l.length; q++) { const t = l[q]; const d = distTri2(P, px, py, pz, T[3 * t], T[3 * t + 1], T[3 * t + 2]); if (d < melhor) melhor = d; }
        }
      }
      return melhor;
    },
  };
}

/* ---- a fila de prioridade: pelo custo, depois pelo vértice que some, depois pelo vizinho ---- */
function criarFila() {
  let cap = 1 << 16, n = 0;
  let C = new Float64Array(cap), U = new Int32Array(cap), W = new Int32Array(cap), VU = new Int32Array(cap), VW = new Int32Array(cap);
  const menor = (i, j) => C[i] < C[j] || (C[i] === C[j] && (U[i] < U[j] || (U[i] === U[j] && W[i] < W[j])));
  const troca = (i, j) => {
    let x = C[i]; C[i] = C[j]; C[j] = x; x = U[i]; U[i] = U[j]; U[j] = x; x = W[i]; W[i] = W[j]; W[j] = x;
    x = VU[i]; VU[i] = VU[j]; VU[j] = x; x = VW[i]; VW[i] = VW[j]; VW[j] = x;
  };
  const cresce = (A, T) => { const B = new T(cap); B.set(A); return B; };
  return {
    get tamanho() { return n; },
    empurra(c, u, w, vu, vw) {
      if (n === cap) { cap *= 2; C = cresce(C, Float64Array); U = cresce(U, Int32Array); W = cresce(W, Int32Array); VU = cresce(VU, Int32Array); VW = cresce(VW, Int32Array); }
      let i = n++; C[i] = c; U[i] = u; W[i] = w; VU[i] = vu; VW[i] = vw;
      while (i > 0) { const p = (i - 1) >> 1; if (!menor(i, p)) break; troca(i, p); i = p; }
    },
    tira(saida) {
      saida[0] = C[0]; saida[1] = U[0]; saida[2] = W[0]; saida[3] = VU[0]; saida[4] = VW[0];
      n--;
      if (n > 0) {
        C[0] = C[n]; U[0] = U[n]; W[0] = W[n]; VU[0] = VU[n]; VW[0] = VW[n];
        let i = 0;
        for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < n && menor(l, m)) m = l; if (r < n && menor(r, m)) m = r; if (m === i) break; troca(i, m); i = m; }
      }
    },
  };
}

/** Reduz a malha neutra. Opções: `toleranciaMm` (0,05), `normalGraus` (2), `quinaGraus` (30), `unidade` (metros por milímetro da malha: 0,001),
 *  `celulaMm` (a da grade; padrão pelo comprimento médio de aresta). Devolve `{ V, F, mapa, estatisticas }`. */
export function reduzirMalha(neutro, opcoes = {}) {
  const { toleranciaMm = TOLERANCIA_MM, normalGraus = NORMAL_GRAUS, quinaGraus = QUINA_GRAUS, unidade = 0.001, celulaMm = null, margem = MARGEM, margemNormal = MARGEM_NORMAL } = opcoes;
  if (!(toleranciaMm > 0) || !(normalGraus > 0) || !(quinaGraus > 0)) throw new Error('reduzirMalha: toleranciaMm, normalGraus e quinaGraus precisam ser positivos.');
  const teto = toleranciaMm * margem;
  const cosQuina = Math.cos(quinaGraus / RAD);

  /* ---- a malha em triângulos ---- */
  const idsV = [...neutro.V.keys()]; const indiceV = new Map(idsV.map((id, i) => [id, i]));
  const nV = idsV.length;
  const P = new Float64Array(3 * nV);
  idsV.forEach((id, i) => { const p = neutro.V.get(id); P[3 * i] = p[0] / unidade; P[3 * i + 1] = p[1] / unidade; P[3 * i + 2] = p[2] / unidade; });
  const triIds = [], triFace = [], classes = new Map(), classeDe = [];
  const lista = [];
  const classeDaFace = (f) => {
    const chave = JSON.stringify([f.parte ?? null, f.material ?? null, f.liso ?? null, f.quebras ?? null, f.cor ?? null, f.solido ?? null, f.tinta ?? null]);
    let c = classes.get(chave); if (c === undefined) { c = classes.size; classes.set(chave, c); } return c;
  };
  for (const [fid, f] of neutro.F) {
    if (f.vs.length < 3 || f.vs.some((v) => !indiceV.has(v))) continue;
    const pts = f.vs.map((v) => neutro.V.get(v));
    const cls = classeDaFace(f);
    triangularFace(pts).forEach(([a, b, c], k) => {
      lista.push(indiceV.get(f.vs[a]), indiceV.get(f.vs[b]), indiceV.get(f.vs[c]));
      triIds.push(k === 0 ? fid : `${fid}#${k}`); triFace.push(fid); classeDe.push(cls);
    });
  }
  const nT = triIds.length;
  const T = Int32Array.from(lista); const T0 = Int32Array.from(lista);
  const vivo = new Uint8Array(nT).fill(1);
  const classe = Int32Array.from(classeDe);

  const normal = (a, b, c, saida, o) => {
    const ux = P[3 * b] - P[3 * a], uy = P[3 * b + 1] - P[3 * a + 1], uz = P[3 * b + 2] - P[3 * a + 2];
    const vx = P[3 * c] - P[3 * a], vy = P[3 * c + 1] - P[3 * a + 1], vz = P[3 * c + 2] - P[3 * a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx; const l = Math.sqrt(x * x + y * y + z * z);
    if (l > 1e-12) { saida[o] = x / l; saida[o + 1] = y / l; saida[o + 2] = z / l; saida[o + 3] = l / 2; } else { saida[o] = saida[o + 1] = saida[o + 2] = saida[o + 3] = 0; }
  };
  /* qualidade do triângulo: 1 no equilátero, 0 na lasca */
  const qualidade = (a, b, c, area) => {
    const e = (p, q) => { const x = P[3 * p] - P[3 * q], y = P[3 * p + 1] - P[3 * q + 1], z = P[3 * p + 2] - P[3 * q + 2]; return x * x + y * y + z * z; };
    const s = e(a, b) + e(b, c) + e(c, a); return s > 0 ? (4 * Math.sqrt(3) * area) / s : 0;
  };
  const N = new Float64Array(4 * nT); const Q0 = new Float64Array(nT);
  for (let t = 0; t < nT; t++) { normal(T[3 * t], T[3 * t + 1], T[3 * t + 2], N, 4 * t); Q0[t] = qualidade(T[3 * t], T[3 * t + 1], T[3 * t + 2], N[4 * t + 3]); }

  const vt = Array.from({ length: nV }, () => []);
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) vt[T[3 * t + k]].push(t);
  const contem = (t, v) => T[3 * t] === v || T[3 * t + 1] === v || T[3 * t + 2] === v;

  /* ---- as arestas de feição e os vértices presos ---- */
  const chaveAresta = (a, b) => (a < b ? a * nV + b : b * nV + a);
  const arestas = new Map();
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) {
    const a = T[3 * t + k], b = T[3 * t + (k + 1) % 3]; const c = chaveAresta(a, b);
    const e = arestas.get(c); if (e) e.push(t, a < b ? 1 : 0); else arestas.set(c, [t, a < b ? 1 : 0, a, b]);
  }
  const preso = new Uint8Array(nV);
  const feic = Array.from({ length: nV }, () => []);
  const liga = (a, b) => { feic[a].push(b); feic[b].push(a); };
  for (let t = 0; t < nT; t++) if (!(N[4 * t + 3] > 0)) for (let k = 0; k < 3; k++) preso[T[3 * t + k]] = 1;
  for (const e of arestas.values()) {
    const a = e[2], b = e[3];
    if (e.length === 6) { /* [t1, dir1, a, b, t2, dir2] */
      const t1 = e[0], t2 = e[4];
      if (e[1] === e[5]) { preso[a] = 1; preso[b] = 1; liga(a, b); continue; } /* enrolamento inconsistente */
      const dot = N[4 * t1] * N[4 * t2] + N[4 * t1 + 1] * N[4 * t2 + 1] + N[4 * t1 + 2] * N[4 * t2 + 2];
      if (classe[t1] !== classe[t2] || dot < cosQuina || !(N[4 * t1 + 3] > 0) || !(N[4 * t2 + 3] > 0)) liga(a, b);
    } else if (e.length === 4) liga(a, b); /* borda */
    else { preso[a] = 1; preso[b] = 1; liga(a, b); } /* mais de duas faces */
  }
  for (let v = 0; v < nV; v++) if (feic[v].length && feic[v].length !== 2) preso[v] = 1;

  /* os triângulos originais de cada vértice e as normais deles: o triângulo novo que absorve um vértice fica a no máximo `normalGraus` de todos */
  const eraFeicao = Uint8Array.from(feic, (l) => (l.length ? 1 : 0));
  const N0 = Float64Array.from(N); const vt0 = vt.map((l) => l.slice()); const cosNormal = Math.cos((normalGraus * margemNormal) / RAD);

  /* ---- a grade dos triângulos originais ---- */
  let celula = celulaMm;
  if (!celula) { let soma = 0, n = 0; for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) { const a = T[3 * t + k], b = T[3 * t + (k + 1) % 3]; soma += Math.hypot(P[3 * a] - P[3 * b], P[3 * a + 1] - P[3 * b + 1], P[3 * a + 2] - P[3 * b + 2]); n++; } celula = Math.max(2 * soma / Math.max(1, n), 8 * teto); }
  const grade = criarGrade(P, T0, nT, celula);

  /* ---- o colapso ---- */
  const pts = new Array(nT).fill(null); /* triângulo atual -> vértices originais que ele absorveu */
  const ptsAresta = new Map(); /* aresta de feição atual -> vértices originais absorvidos nela */
  const absorvido = new Int32Array(nT).fill(-1);
  const ver = new Int32Array(nV); const alive = new Uint8Array(nV).fill(1);
  for (let v = 0; v < nV; v++) if (!vt[v].length) alive[v] = 0;
  const some = [], fica = []; const nvA = [], nvB = [], nvC = [];
  const nvN = new Float64Array(4 * MAX_ANEL); const destino = [];
  const marcaU = new Int32Array(nV), marcaV = new Int32Array(nV); let carimbo = 0;
  const am = []; for (let i = 0; i <= 3; i++) for (let j = 0; i + j <= 3; j++) am.push([(3 - i - j) / 3, i / 3, j / 3]);
  let colapsos = 0, recusas = 0;
  const ehBordaAberta = (u, v) => { let n = 0; for (const t of vt[u]) if (contem(t, v)) n++; return n === 1; };
  const tetoQ = teto * teto;

  /* custo do colapso u -> v, ou Infinity se recusado; com `aplicar`, o aplica quando passa */
  const avaliar = (u, v, cheio, aplicar) => {
    const anel = vt[u]; some.length = 0; fica.length = 0;
    for (let i = 0; i < anel.length; i++) { const t = anel[i]; if (contem(t, v)) some.push(t); else fica.push(t); }
    if (!fica.length || anel.length > MAX_ANEL) return Infinity;
    const deFeicao = feic[u].length > 0;
    if (some.length !== (deFeicao && feic[u].includes(v) && ehBordaAberta(u, v) ? 1 : 2)) return Infinity;
    /* a condição do elo: os vizinhos comuns de u e v são só os terceiros vértices dos triângulos que somem */
    carimbo++;
    for (const t of vt[v]) for (let k = 0; k < 3; k++) marcaV[T[3 * t + k]] = carimbo;
    let comuns = 0;
    for (const t of anel) for (let k = 0; k < 3; k++) { const w = T[3 * t + k]; if (w !== u && w !== v && marcaU[w] !== carimbo) { marcaU[w] = carimbo; if (marcaV[w] === carimbo) comuns++; } }
    if (comuns !== some.length) return Infinity;
    /* os triângulos novos */
    for (let i = 0; i < fica.length; i++) {
      const t = fica[i];
      const a = T[3 * t] === u ? v : T[3 * t], b = T[3 * t + 1] === u ? v : T[3 * t + 1], c = T[3 * t + 2] === u ? v : T[3 * t + 2];
      const o = 4 * i; normal(a, b, c, nvN, o);
      if (!(nvN[o + 3] > 0)) return Infinity;
      if (nvN[o] * N[4 * t] + nvN[o + 1] * N[4 * t + 1] + nvN[o + 2] * N[4 * t + 2] < cosNormal) return Infinity;
      if (qualidade(a, b, c, nvN[o + 3]) < Math.min(QUALIDADE_MINIMA, Q0[t])) return Infinity;
      nvA[i] = a; nvB[i] = b; nvC[i] = c;
    }
    /* o triângulo que some tem normal perto da do novo mais perto do centro dele */
    for (let i = 0; i < some.length; i++) {
      const t = some[i]; let cx = 0, cy = 0, cz = 0; for (let j = 0; j < 3; j++) { cx += P[3 * T[3 * t + j]]; cy += P[3 * T[3 * t + j] + 1]; cz += P[3 * T[3 * t + j] + 2]; }
      cx /= 3; cy /= 3; cz /= 3; let m = Infinity, q = -1;
      for (let k = 0; k < fica.length; k++) { const d = distTri2(P, cx, cy, cz, nvA[k], nvB[k], nvC[k]); if (d < m) { m = d; q = k; } }
      if (N[4 * t + 3] > 0 && nvN[4 * q] * N[4 * t] + nvN[4 * q + 1] * N[4 * t + 1] + nvN[4 * q + 2] * N[4 * t + 2] < cosNormal) return Infinity;
    }
    /* os vértices originais absorvidos ficam perto dos triângulos novos */
    let custo2 = 0; destino.length = 0;
    const absorve = (p) => {
      let m = Infinity, q = -1; const px = P[3 * p], py = P[3 * p + 1], pz = P[3 * p + 2];
      for (let i = 0; i < fica.length; i++) { const d = distTri2(P, px, py, pz, nvA[i], nvB[i], nvC[i]); if (d < m) { m = d; q = i; } }
      if (m > tetoQ) return false; if (m > custo2) custo2 = m;
      const l0 = vt0[p];
      for (let i = 0; i < l0.length; i++) {
        const t0 = l0[i]; if (!(N0[4 * t0 + 3] > 0)) continue;
        const n0x = N0[4 * t0], n0y = N0[4 * t0 + 1], n0z = N0[4 * t0 + 2];
        /* o vértice liso: o triângulo que o absorve fica perto de toda face original dele. O vértice de uma linha de feição tem faces dos dois
           lados: cada uma tem de ficar perto de algum triângulo novo (o do lado dela). */
        let melhor = nvN[4 * q] * n0x + nvN[4 * q + 1] * n0y + nvN[4 * q + 2] * n0z;
        if (eraFeicao[p]) for (let k = 0; k < fica.length; k++) { const c = nvN[4 * k] * n0x + nvN[4 * k + 1] * n0y + nvN[4 * k + 2] * n0z; if (c > melhor) melhor = c; }
        if (melhor < cosNormal) return false;
      }
      destino.push(q); return true;
    };
    if (!absorve(u)) return Infinity;
    for (const t of anel) { const l = pts[t]; if (l) for (let i = 0; i < l.length; i++) if (!absorve(l[i])) return Infinity; }
    /* a linha de feição: os pontos dela ficam perto da linha nova */
    let outro = -1, daLinha = null;
    if (deFeicao) {
      for (const w of feic[u]) if (w !== v) outro = w;
      if (feic[v].includes(outro)) return Infinity;
      daLinha = [u, ...(ptsAresta.get(chaveAresta(u, v)) ?? []), ...(ptsAresta.get(chaveAresta(u, outro)) ?? [])];
      for (const p of daLinha) { const d = distSeg2(P, p, v, outro); if (d > tetoQ) return Infinity; if (d > custo2) custo2 = d; }
    }
    if (cheio) { /* o triângulo novo contra a malha original */
      for (let i = 0; i < fica.length; i++) for (const [x, y, z] of am) {
        const a = nvA[i], b = nvB[i], c = nvC[i];
        const d = grade.dentroDe(x * P[3 * a] + y * P[3 * b] + z * P[3 * c], x * P[3 * a + 1] + y * P[3 * b + 1] + z * P[3 * c + 1], x * P[3 * a + 2] + y * P[3 * b + 2] + z * P[3 * c + 2], teto);
        if (d > tetoQ) return Infinity; if (d > custo2) custo2 = d;
      }
    }
    if (!aplicar) return Math.sqrt(custo2);

    /* aplica */
    const novoPts = new Map();
    const pontos = [u]; for (const t of anel) { const l = pts[t]; if (l) for (let i = 0; i < l.length; i++) pontos.push(l[i]); }
    for (let i = 0; i < pontos.length; i++) { const q = fica[destino[i]]; let l = novoPts.get(q); if (!l) novoPts.set(q, l = []); l.push(pontos[i]); }
    for (const t of anel) pts[t] = null;
    for (const [q, l] of novoPts) pts[q] = l;
    for (const t of some) { /* o triângulo removido vai ao novo mais perto do centro dele, de preferência da mesma classe */
      let cx = 0, cy = 0, cz = 0; for (let j = 0; j < 3; j++) { cx += P[3 * T[3 * t + j]]; cy += P[3 * T[3 * t + j] + 1]; cz += P[3 * T[3 * t + j] + 2]; }
      cx /= 3; cy /= 3; cz /= 3; let m = Infinity, q = -1, mc = Infinity, qc = -1;
      for (let i = 0; i < fica.length; i++) {
        const d = distTri2(P, cx, cy, cz, nvA[i], nvB[i], nvC[i]);
        if (d < m) { m = d; q = i; } if (classe[fica[i]] === classe[t] && d < mc) { mc = d; qc = i; }
      }
      absorvido[t] = fica[qc >= 0 ? qc : q]; vivo[t] = 0;
      for (let j = 0; j < 3; j++) { const w = T[3 * t + j]; if (w !== u) { const l = vt[w]; l.splice(l.indexOf(t), 1); } }
    }
    const lv = vt[v];
    for (let i = 0; i < fica.length; i++) { const t = fica[i]; T[3 * t] = nvA[i]; T[3 * t + 1] = nvB[i]; T[3 * t + 2] = nvC[i]; for (let j = 0; j < 4; j++) N[4 * t + j] = nvN[4 * i + j]; lv.push(t); }
    vt[u] = []; alive[u] = 0;
    if (deFeicao) {
      ptsAresta.delete(chaveAresta(u, v)); ptsAresta.delete(chaveAresta(u, outro)); ptsAresta.set(chaveAresta(v, outro), daLinha);
      feic[v][feic[v].indexOf(u)] = outro; feic[outro][feic[outro].indexOf(u)] = v; feic[u] = [];
    }
    colapsos++;
    return Math.sqrt(custo2);
  };

  const fila = criarFila();
  const candidatos = (a) => (feic[a].length ? feic[a] : (() => { const s = new Set(); for (const t of vt[a]) for (let k = 0; k < 3; k++) { const w = T[3 * t + k]; if (w !== a) s.add(w); } return [...s].sort((x, y) => x - y); })());
  const empurra = (a) => {
    for (const b of candidatos(a)) { const c = avaliar(a, b, false, false); if (c < Infinity) fila.empurra(Math.floor(c / (teto / DEGRAUS)) * 1e6 + Math.hypot(P[3 * a] - P[3 * b], P[3 * a + 1] - P[3 * b + 1], P[3 * a + 2] - P[3 * b + 2]), a, b, ver[a], ver[b]); }
  };
  for (let a = 0; a < nV; a++) if (alive[a] && !preso[a]) empurra(a);
  const e = [0, 0, 0, 0, 0]; const tocado = new Int32Array(nV); let selo = 0;
  while (fila.tamanho) {
    fila.tira(e);
    const u = e[1], v = e[2];
    if (ver[u] !== e[3] || ver[v] !== e[4] || !alive[u] || !alive[v]) continue;
    const anelAntes = vt[u].slice();
    const c = avaliar(u, v, true, true);
    if (c === Infinity) { recusas++; continue; }
    selo++; const afetados = [];
    const marca = (w) => { if (tocado[w] !== selo) { tocado[w] = selo; afetados.push(w); } };
    marca(v); for (const t of anelAntes) for (let k = 0; k < 3; k++) { const w = T[3 * t + k]; if (w !== u) marca(w); }
    for (const w of afetados) ver[w]++;
    afetados.sort((x, y) => x - y);
    for (const w of afetados) if (alive[w] && !preso[w]) empurra(w);
  }

  /* ---- a saída ---- */
  const absorvedor = (t) => { let q = t; const cam = []; while (!vivo[q]) { cam.push(q); q = absorvido[q]; } for (const x of cam) absorvido[x] = q; return q; };
  const V = new Map(), F = new Map(), mapa = new Map(); const usado = new Uint8Array(nV);
  for (let t = 0; t < nT; t++) if (vivo[t]) for (let k = 0; k < 3; k++) usado[T[3 * t + k]] = 1;
  for (let i = 0; i < nV; i++) if (usado[i]) V.set(idsV[i], neutro.V.get(idsV[i]));
  let triDepois = 0;
  for (let t = 0; t < nT; t++) {
    if (vivo[t]) {
      const { vs, id, ...resto } = neutro.F.get(triFace[t]);
      F.set(triIds[t], { ...resto, id: triIds[t], vs: [idsV[T[3 * t]], idsV[T[3 * t + 1]], idsV[T[3 * t + 2]]], origem: triFace[t] }); triDepois++;
    } else mapa.set(triIds[t], triIds[absorvedor(t)]);
  }
  return { V, F, mapa, estatisticas: { triangulosAntes: nT, triangulosDepois: triDepois, colapsos, recusas, verticesAntes: nV, verticesDepois: V.size, toleranciaMm, normalGraus, quinaGraus } };
}
