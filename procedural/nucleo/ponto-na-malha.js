/* ponto-na-malha.js — o ponto mais próximo de uma malha de triângulos, com grade espacial
 *
 * Função pura, sem domínio. `prepararPontoNaMalha(V, F, ids)` triangula as faces `ids` uma vez e as põe numa grade de células cúbicas;
 * `maisProximo(p, limite)` olha a célula do ponto e os anéis de células em volta, do mais perto ao mais longe, e para quando o triângulo
 * achado está mais perto que o anel seguinte (ou quando o anel passa de `limite`). O custo de uma consulta é o das poucas células de
 * vizinhança, e não o número de faces da malha. Empate de distância (até 1e-12): a face de menor id, e nela o primeiro triângulo.
 *
 * O resultado traz também os três vértices do triângulo achado e as coordenadas baricêntricas do ponto nele, para quem interpola uma grandeza dos vértices (a normal).
 *
 * Quem lê: `paineisPorVaos` com `linhas[i].curva`, que leva cada ponto da curva à pele da chapa. */
import { triangularFace } from './triangulacao-face.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** O ponto do triângulo [A, B, C] mais perto de `p` (Ericson, Real-Time Collision Detection, 5.1.5). */
export function pontoNoTriangulo(p, A, B, C) {
  const ab = sub(B, A); const ac = sub(C, A); const ap = sub(p, A);
  const d1 = dot(ab, ap); const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return [...A];
  const bp = sub(p, B); const d3 = dot(ab, bp); const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return [...B];
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1 / (d1 - d3); return [A[0] + ab[0] * t, A[1] + ab[1] * t, A[2] + ab[2] * t]; }
  const cp = sub(p, C); const d5 = dot(ab, cp); const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return [...C];
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2 / (d2 - d6); return [A[0] + ac[0] * t, A[1] + ac[1] * t, A[2] + ac[2] * t]; }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const t = (d4 - d3) / (d4 - d3 + d5 - d6); return [B[0] + (C[0] - B[0]) * t, B[1] + (C[1] - B[1]) * t, B[2] + (C[2] - B[2]) * t]; }
  const den = 1 / (va + vb + vc); const v = vb * den; const w = vc * den;
  return [A[0] + ab[0] * v + ac[0] * w, A[1] + ab[1] * v + ac[1] * w, A[2] + ab[2] * v + ac[2] * w];
}

/** As coordenadas baricêntricas [u, v, w] do ponto `q`, do plano do triângulo [A, B, C], em A, B e C. */
export function baricentro(q, A, B, C) {
  const v0 = sub(B, A); const v1 = sub(C, A); const v2 = sub(q, A);
  const d00 = dot(v0, v0); const d01 = dot(v0, v1); const d11 = dot(v1, v1); const d20 = dot(v2, v0); const d21 = dot(v2, v1);
  const den = d00 * d11 - d01 * d01;
  if (Math.abs(den) < 1e-30) return [1, 0, 0];
  const v = (d11 * d20 - d01 * d21) / den; const w = (d00 * d21 - d01 * d20) / den;
  return [1 - v - w, v, w];
}

/**
 * @param {Map<number, number[]>} V vértices por id
 * @param {Map<number, { vs: number[] }>} F faces por id
 * @param {number[]} ids as faces que entram
 * @returns {{ maisProximo: (p: number[], limite?: number) => ({ face: number, ponto: number[], distancia: number, vertices: number[], baricentro: number[] } | null), triangulos: number }}
 */
export function prepararPontoNaMalha(V, F, ids) {
  const tris = [];
  for (const id of [...ids].sort((a, b) => a - b)) {
    const f = F.get(id);
    const pts = f.vs.map((v) => V.get(v));
    if (pts.length < 3 || pts.some((p) => !p)) continue;
    for (const [i, j, k] of triangularFace(pts)) tris.push({ face: id, a: pts[i], b: pts[j], c: pts[k], vs: [f.vs[i], f.vs[j], f.vs[k]] });
  }
  if (!tris.length) return { maisProximo: () => null, triangulos: 0 };
  const N = tris.length;
  const caixa = new Float64Array(6 * N);
  const lo = [Infinity, Infinity, Infinity]; const hi = [-Infinity, -Infinity, -Infinity];
  let extensao = 0;
  for (let n = 0; n < N; n += 1) {
    const { a, b, c } = tris[n];
    const o = 6 * n;
    for (let e = 0; e < 3; e += 1) {
      const x = a[e]; const y = b[e]; const z = c[e];
      const mn = x < y ? (x < z ? x : z) : (y < z ? y : z); const mx = x > y ? (x > z ? x : z) : (y > z ? y : z);
      caixa[o + e] = mn; caixa[o + 3 + e] = mx;
      if (mn < lo[e]) lo[e] = mn;
      if (mx > hi[e]) hi[e] = mx;
    }
    extensao += Math.max(caixa[o + 3] - caixa[o], caixa[o + 4] - caixa[o + 1], caixa[o + 5] - caixa[o + 2]);
  }
  const diagonal = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
  /* a célula acompanha o triângulo típico (1,5 vez a extensão média), sem piso pela diagonal: numa chapa fina de malha miúda a célula de diagonal/64 guardava centenas de
     triângulos por camada e toda consulta os percorria. O piso de diagonal/2048 limita só o número de células de uma malha de triângulos minúsculos. */
  const lado = Math.max(diagonal / 2048, 1.5 * (extensao / N), 1e-9);
  const celula = (x, e) => Math.floor((x - lo[e]) / lado);
  const dim = [0, 1, 2].map((e) => celula(hi[e], e) + 1);
  const chave = (i, j, k) => (i * dim[1] + j) * dim[2] + k;
  /* os triângulos que cobririam muitas células (um triângulo grande entre miúdos) não entram na grade: ficam numa lista que toda consulta olha, já com o descarte pela caixa */
  const grade = new Map();
  const grandes = [];
  for (let n = 0; n < N; n += 1) {
    const o = 6 * n;
    const i0 = celula(caixa[o], 0); const j0 = celula(caixa[o + 1], 1); const k0 = celula(caixa[o + 2], 2);
    const i1 = celula(caixa[o + 3], 0); const j1 = celula(caixa[o + 4], 1); const k1 = celula(caixa[o + 5], 2);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) * (k1 - k0 + 1) > 64) { grandes.push(n); continue; }
    for (let i = i0; i <= i1; i += 1) for (let j = j0; j <= j1; j += 1) for (let k = k0; k <= k1; k += 1) {
      const c = chave(i, j, k);
      const l = grade.get(c);
      if (l) l.push(n); else grade.set(c, [n]);
    }
  }
  const visto = new Int32Array(tris.length);
  let carimbo = 0;
  /* o descarte pela caixa: a distância da caixa do triângulo ao ponto é um piso da distância ao triângulo; a margem de 1e-9 cobre a diferença de arredondamento entre a raiz e `hypot` */
  const longeDemais = (n, p, melhor) => {
    const o = 6 * n;
    const dx = p[0] < caixa[o] ? caixa[o] - p[0] : p[0] > caixa[o + 3] ? p[0] - caixa[o + 3] : 0;
    const dy = p[1] < caixa[o + 1] ? caixa[o + 1] - p[1] : p[1] > caixa[o + 4] ? p[1] - caixa[o + 4] : 0;
    const dz = p[2] < caixa[o + 2] ? caixa[o + 2] - p[2] : p[2] > caixa[o + 5] ? p[2] - caixa[o + 5] : 0;
    const lim = melhor.distancia + 1e-9;
    return dx * dx + dy * dy + dz * dz > lim * lim;
  };
  const maisProximo = (p, limite = Infinity) => {
    carimbo += 1;
    let melhor = null;
    /* um candidato vence se está mais perto, ou empata (1e-12) com a face de menor id e, na mesma face, o triângulo de menor índice: o resultado não depende da ordem da busca */
    const tenta = (n) => {
      if (visto[n] === carimbo) return;
      visto[n] = carimbo;
      if (melhor && longeDemais(n, p, melhor)) return;
      const T = tris[n];
      const q = pontoNoTriangulo(p, T.a, T.b, T.c);
      const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      if (!melhor || d < melhor.distancia - 1e-12 || (Math.abs(d - melhor.distancia) <= 1e-12 && (T.face < melhor.face || (T.face === melhor.face && n < melhor.n)))) {
        melhor = { face: T.face, ponto: q, distancia: d, vertices: T.vs, baricentro: baricentro(q, T.a, T.b, T.c), n };
      }
    };
    for (const n of grandes) tenta(n);
    /* a célula do ponto, presa à grade: um ponto fora dela começa pelo anel mais perto */
    const c0 = [0, 1, 2].map((e) => celula(p[e], e));
    const presa = c0.map((c, e) => Math.min(dim[e] - 1, Math.max(0, c)));
    const kMax = Math.max(...[0, 1, 2].map((e) => Math.max(presa[e], dim[e] - 1 - presa[e])));
    for (let k = 0; k <= kMax; k += 1) {
      /* o que falta olhar está nos anéis de k em diante, a pelo menos (k - 1) células do ponto */
      if (melhor && melhor.distancia <= (k - 1) * lado) break;
      if ((k - 1) * lado > limite) break;
      /* um anel maior que a grade inteira: olha todo triângulo da grade de uma vez */
      if (24 * k * k + 2 > 4 * grade.size) {
        for (const lista of grade.values()) for (const n of lista) tenta(n);
        break;
      }
      for (let di = -k; di <= k; di += 1) {
        const i = presa[0] + di;
        if (i < 0 || i >= dim[0]) continue;
        for (let dj = -k; dj <= k; dj += 1) {
          const j = presa[1] + dj;
          if (j < 0 || j >= dim[1]) continue;
          /* no meio do anel só as duas faces em z; nas bordas em x ou y, a coluna inteira */
          const passo = (Math.abs(di) === k || Math.abs(dj) === k) ? 1 : 2 * k;
          for (let dk = -k; dk <= k; dk += passo || 1) {
            const l = presa[2] + dk;
            if (l < 0 || l >= dim[2]) continue;
            const lista = grade.get(chave(i, j, l));
            if (lista) for (const n of lista) tenta(n);
          }
        }
      }
    }
    if (!melhor || melhor.distancia > limite) return null;
    const { n, ...saida } = melhor; void n;
    return saida;
  };
  return { maisProximo, triangulos: tris.length };
}
