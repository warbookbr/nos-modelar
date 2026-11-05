/* geometria.js — as contas do atalho do esboço 2.0 sobre a malha que o núcleo gerou: a malha de uma parte, a caixa, as âncoras da
 * caixa, o giro e o espelho de pontos com a mesma convenção do núcleo, e a distância que uma forma anda, num eixo, até tocar outra.
 *
 * O TOQUE. `distanciaAteTocar` desliza a malha `movel` ao longo de um eixo, na direção da `alvo`, e devolve quanto ela anda até a
 * primeira superfície encostar na outra. A conta é exata para malhas de faces planas: o primeiro toque entre dois poliedros que se
 * aproximam em linha reta é de um vértice de um numa face do outro ou de uma aresta de um numa aresta do outro, e os três casos são
 * medidos na projeção perpendicular ao eixo (vértice dentro do polígono da face e a altura da face naquele ponto; cruzamento das
 * duas arestas e a altura de cada uma ali). A face que não é plana (o quadrilátero torto da subdivisão) entra como dois triângulos.
 * Sem toque possível (a projeção das duas não se cruza), devolve `null`.
 *
 * Unidade: a do neutro, metro. Núcleo puro: nenhum relógio, nenhum sorteio. */

export const EIXOS = ['x', 'y', 'z'];
export const LADOS = Object.freeze(['+x', '-x', '+y', '-y', '+z', '-z']);
const IDX = { x: 0, y: 1, z: 2 };

/** A malha das faces de uma parte (ou de todas), com os pontos reindexados: `{ pts, faces }`. */
export function malhaDoNeutro(neutro, parte = null) {
  const indice = new Map(); const pts = []; const faces = [];
  for (const f of [...neutro.F.values()].sort((a, b) => a.id - b.id)) {
    if (parte !== null && f.parte !== parte) continue;
    faces.push(f.vs.map((v) => {
      if (!indice.has(v)) { indice.set(v, pts.length); pts.push([...neutro.V.get(v)]); }
      return indice.get(v);
    }));
  }
  return { pts, faces };
}

/** A caixa de uma lista de pontos, ou `null` sem ponto. */
export function caixaDosPontos(pts) {
  if (!pts.length) return null;
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) for (let k = 0; k < 3; k += 1) { if (p[k] < min[k]) min[k] = p[k]; if (p[k] > max[k]) max[k] = p[k]; }
  return { min, max, centro: min.map((m, k) => (m + max[k]) / 2), tamanho: min.map((m, k) => max[k] - m) };
}

export const unirCaixas = (a, b) => caixaDosPontos([a.min, a.max, b.min, b.max]);

/** Lê o sufixo de uma âncora: `centro`, ou de um a três lados de eixos distintos (`+y`, `+y-z`, `-x+y+z`). Devolve `{ k: sinal }` ou null. */
export function lerSufixo(s) {
  if (s === 'centro') return {};
  if (typeof s !== 'string' || !/^([+-][xyz]){1,3}$/.test(s)) return null;
  const lados = {};
  for (const m of s.match(/[+-][xyz]/g)) { if (lados[IDX[m[1]]] !== undefined) return null; lados[IDX[m[1]]] = m[0] === '+' ? 1 : -1; }
  return lados;
}

/** O ponto da âncora na caixa: o centro, com cada eixo citado levado ao mínimo ou ao máximo. */
export function pontoDaAncora(caixa, lados) {
  return caixa.centro.map((c, k) => (lados[k] === 1 ? caixa.max[k] : lados[k] === -1 ? caixa.min[k] : c));
}

/** O giro de um ponto em torno de `pivo`, no eixo, em graus, na regra da mão direita do núcleo (`rotaciona`). */
export function girarPonto(p, pivo, eixo, graus) {
  const t = (graus * Math.PI) / 180; const c = Math.cos(t); const s = Math.sin(t);
  const x = p[0] - pivo[0]; const y = p[1] - pivo[1]; const z = p[2] - pivo[2];
  if (eixo === 'x') return [pivo[0] + x, pivo[1] + y * c - z * s, pivo[2] + y * s + z * c];
  if (eixo === 'y') return [pivo[0] + x * c + z * s, pivo[1] + y, pivo[2] - x * s + z * c];
  return [pivo[0] + x * c - y * s, pivo[1] + x * s + y * c, pivo[2] + z];
}

export const transladarPontos = (pts, d) => pts.map((p) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);
export const transformarMalha = (malha, fn) => ({ pts: malha.pts.map(fn), faces: malha.faces });
export const juntarMalhas = (malhas) => {
  const pts = []; const faces = [];
  for (const m of malhas) { const base = pts.length; pts.push(...m.pts); faces.push(...m.faces.map((f) => f.map((i) => i + base))); }
  return { pts, faces };
};

/* ---- o toque ao longo de um eixo ---- */

const EPS = 1e-12;

/* os polígonos planos de uma malha, já na projeção (a, b) com a altura k; a face torta vira triângulos */
function poligonos(malha, k) {
  const [a, b] = [0, 1, 2].filter((i) => i !== k);
  const saida = [];
  const plano = (idx) => {
    const P = idx.map((i) => malha.pts[i]);
    const n = [0, 0, 0];
    for (let i = 0; i < P.length; i += 1) {
      const p = P[i]; const q = P[(i + 1) % P.length];
      n[0] += (p[1] - q[1]) * (p[2] + q[2]); n[1] += (p[2] - q[2]) * (p[0] + q[0]); n[2] += (p[0] - q[0]) * (p[1] + q[1]);
    }
    return { P, n };
  };
  for (const f of malha.faces) {
    const { P, n } = plano(f);
    const nn = Math.hypot(...n);
    if (nn < EPS) continue;
    const plana = P.every((p) => Math.abs(n[0] * (p[0] - P[0][0]) + n[1] * (p[1] - P[0][1]) + n[2] * (p[2] - P[0][2])) / nn < 1e-9);
    const pedacos = plana || f.length === 3 ? [f] : f.slice(1, -1).map((_, i) => [f[0], f[i + 1], f[i + 2]]);
    for (const g of pedacos) {
      const { P: Q, n: m } = g === f ? { P, n } : plano(g);
      if (Math.abs(m[k]) < 1e-9 * Math.hypot(...m)) continue; // face de pé no eixo: só as arestas tocam
      const xs = Q.map((p) => p[a]); const ys = Q.map((p) => p[b]);
      saida.push({ Q, m, a, b, k, min: [Math.min(...xs), Math.min(...ys)], max: [Math.max(...xs), Math.max(...ys)] });
    }
  }
  return saida;
}

const dentro = (pg, x, y) => {
  let c = false;
  const Q = pg.Q;
  for (let i = 0, j = Q.length - 1; i < Q.length; j = i, i += 1) {
    const xi = Q[i][pg.a]; const yi = Q[i][pg.b]; const xj = Q[j][pg.a]; const yj = Q[j][pg.b];
    /* na borda conta como dentro */
    const dx = xj - xi; const dy = yj - yi; const l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((x - xi) * dx + (y - yi) * dy) / l2)) : 0;
    if (Math.hypot(x - (xi + t * dx), y - (yi + t * dy)) < 1e-12) return true;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const alturaNoPlano = (pg, x, y) => pg.Q[0][pg.k] - (pg.m[pg.a] * (x - pg.Q[0][pg.a]) + pg.m[pg.b] * (y - pg.Q[0][pg.b])) / pg.m[pg.k];

function arestas(malha) {
  const vistas = new Set(); const saida = [];
  for (const f of malha.faces) for (let i = 0; i < f.length; i += 1) {
    const u = f[i]; const v = f[(i + 1) % f.length];
    const chave = u < v ? `${u}-${v}` : `${v}-${u}`;
    if (!vistas.has(chave)) { vistas.add(chave); saida.push([malha.pts[u], malha.pts[v]]); }
  }
  return saida;
}

/**
 * Quanto `movel` anda no eixo `eixo`, no sentido `sinal` (-1: para o lado de menor coordenada), até a primeira superfície tocar
 * `alvo`. As duas em metro, cada uma `{ pts, faces }`. Devolve a distância (>= 0 quando começam separadas) ou null sem toque.
 */
export function distanciaAteTocar(movel, alvo, eixo, sinal) {
  const k = IDX[eixo];
  /* no sentido +, o espelho da coordenada k reduz ao caso de descer */
  const vira = (m) => (sinal > 0 ? transformarMalha(m, (p) => { const q = [...p]; q[k] = -q[k]; return q; }) : m);
  const M = vira(movel); const T = vira(alvo);
  const [a, b] = [0, 1, 2].filter((i) => i !== k);
  const caixa2 = (pts) => { const xs = pts.map((p) => p[a]); const ys = pts.map((p) => p[b]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
  const cm = caixa2(M.pts); const ct = caixa2(T.pts);
  const cruza = (c, min, max) => !(max[0] < c[0] - EPS || min[0] > c[2] + EPS || max[1] < c[1] - EPS || min[1] > c[3] + EPS);
  let melhor = null;
  const ver = (l) => { if (melhor === null || l < melhor) melhor = l; };
  /* vértice do móvel sobre face do alvo, e vértice do alvo sob face do móvel */
  const facesT = poligonos(T, k).filter((pg) => cruza(cm, pg.min, pg.max));
  const facesM = poligonos(M, k).filter((pg) => cruza(ct, pg.min, pg.max));
  for (const p of M.pts) {
    if (!cruza(ct, [p[a], p[b]], [p[a], p[b]])) continue;
    for (const pg of facesT) if (p[a] >= pg.min[0] - EPS && p[a] <= pg.max[0] + EPS && p[b] >= pg.min[1] - EPS && p[b] <= pg.max[1] + EPS && dentro(pg, p[a], p[b])) ver(p[k] - alturaNoPlano(pg, p[a], p[b]));
  }
  for (const q of T.pts) {
    if (!cruza(cm, [q[a], q[b]], [q[a], q[b]])) continue;
    for (const pg of facesM) if (q[a] >= pg.min[0] - EPS && q[a] <= pg.max[0] + EPS && q[b] >= pg.min[1] - EPS && q[b] <= pg.max[1] + EPS && dentro(pg, q[a], q[b])) ver(alturaNoPlano(pg, q[a], q[b]) - q[k]);
  }
  /* aresta com aresta: o cruzamento na projeção e a altura de cada uma nele */
  const eT = arestas(T).filter(([p, q]) => cruza(cm, [Math.min(p[a], q[a]), Math.min(p[b], q[b])], [Math.max(p[a], q[a]), Math.max(p[b], q[b])]));
  for (const [p1, p2] of arestas(M)) {
    const r = [p2[a] - p1[a], p2[b] - p1[b]];
    if (!cruza(ct, [Math.min(p1[a], p2[a]), Math.min(p1[b], p2[b])], [Math.max(p1[a], p2[a]), Math.max(p1[b], p2[b])])) continue;
    for (const [q1, q2] of eT) {
      const s = [q2[a] - q1[a], q2[b] - q1[b]];
      const den = r[0] * s[1] - r[1] * s[0];
      if (Math.abs(den) < EPS * EPS) continue;
      const w = [q1[a] - p1[a], q1[b] - p1[b]];
      const t = (w[0] * s[1] - w[1] * s[0]) / den; const u = (w[0] * r[1] - w[1] * r[0]) / den;
      if (t < -1e-12 || t > 1 + 1e-12 || u < -1e-12 || u > 1 + 1e-12) continue;
      ver(p1[k] + t * (p2[k] - p1[k]) - (q1[k] + u * (q2[k] - q1[k])));
    }
  }
  return melhor;
}
