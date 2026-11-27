/* conferir-reducao.mjs — a conferência independente do redutor de malha (tools/modelar/reduzir-malha.mjs).
 *
 * Não importa nada do redutor: a distância ponto-triângulo (projeção no plano e arestas), a grade, a busca do mais perto e as contagens de
 * aresta são código próprio. Do núcleo só vem a triangulação das faces da malha ORIGINAL (`triangularFace`), que é a que o adaptador
 * desenha. Mede, por parte, nos dois sentidos, o desvio de posição (amostras: vértices, meios de aresta e uma grade baricêntrica de
 * `n` divisões em cada triângulo) e o desvio de normal (normal do triângulo contra a do triângulo mais perto do centro dele, nos dois
 * sentidos), conta a borda e os laços dela (a borda reta perde vértices, e o número de laços não muda), a aresta de mais de duas faces e o enrolamento invertido, e confere que o que sobrou é da original (id,
 * posição, campos da face) e que o mapa leva cada triângulo removido a um sobrevivente da mesma parte. Unidade: milímetro. */
import { triangularFace } from '../../../../procedural/nucleo/triangulacao-face.js';

const SEM_PARTE = '(sem parte)';
const RAD = 180 / Math.PI;

function triangulosOriginais(neutro, unidade) {
  const saida = [];
  for (const [fid, f] of neutro.F) {
    if (f.vs.length < 3 || f.vs.some((v) => !neutro.V.has(v))) continue;
    triangularFace(f.vs.map((v) => neutro.V.get(v))).forEach(([a, b, c], k) => saida.push({ id: k === 0 ? fid : `${fid}#${k}`, face: fid, vs: [f.vs[a], f.vs[b], f.vs[c]], parte: f.parte ?? SEM_PARTE }));
  }
  return saida.map((t) => ({ ...t, p: t.vs.map((v) => neutro.V.get(v).map((c) => c / unidade)) }));
}
function triangulosReduzidos(neutro, unidade) {
  return [...neutro.F].map(([id, f]) => ({ id, face: f.origem ?? id, vs: f.vs, parte: f.parte ?? SEM_PARTE, p: f.vs.map((v) => neutro.V.get(v).map((c) => c / unidade)) }));
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function normalEArea(p) { const n = cruz(sub(p[1], p[0]), sub(p[2], p[0])); const l = Math.hypot(...n); return { n: l > 0 ? [n[0] / l, n[1] / l, n[2] / l] : [0, 0, 0], area: l / 2 }; }

/* distância ao quadrado do ponto a um segmento (ax..bz) */
function segmento2(qx, qy, qz, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, l = dx * dx + dy * dy + dz * dz;
  let t = l > 0 ? ((qx - ax) * dx + (qy - ay) * dy + (qz - az) * dz) / l : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = qx - ax - t * dx, ey = qy - ay - t * dy, ez = qz - az - t * dz; return ex * ex + ey * ey + ez * ez;
}
/* distância ao quadrado do ponto ao triângulo guardado em C[8*i ..]: o pé da perpendicular no plano, se cai dentro; senão a menor das três arestas */
function triangulo2(C, i, qx, qy, qz) {
  const o = 12 * i; const ax = C[o], ay = C[o + 1], az = C[o + 2], bx = C[o + 3], by = C[o + 4], bz = C[o + 5], cx = C[o + 6], cy = C[o + 7], cz = C[o + 8];
  const nx = C[o + 9], ny = C[o + 10], nz = C[o + 11];
  if (nx !== 0 || ny !== 0 || nz !== 0) {
    const h = (qx - ax) * nx + (qy - ay) * ny + (qz - az) * nz; const px = qx - h * nx, py = qy - h * ny, pz = qz - h * nz;
    const lado = (ux, uy, uz, vx, vy, vz) => ((vy - uy) * (pz - uz) - (vz - uz) * (py - uy)) * nx + ((vz - uz) * (px - ux) - (vx - ux) * (pz - uz)) * ny + ((vx - ux) * (py - uy) - (vy - uy) * (px - ux)) * nz;
    if (lado(ax, ay, az, bx, by, bz) >= 0 && lado(bx, by, bz, cx, cy, cz) >= 0 && lado(cx, cy, cz, ax, ay, az) >= 0) return h * h;
  }
  return Math.min(segmento2(qx, qy, qz, ax, ay, az, bx, by, bz), segmento2(qx, qy, qz, bx, by, bz, cx, cy, cz), segmento2(qx, qy, qz, cx, cy, cz, ax, ay, az));
}

function criarIndice(tris, celula) {
  const cels = new Map(); const mn = [Infinity, Infinity, Infinity];
  for (const t of tris) for (const p of t.p) for (let k = 0; k < 3; k++) if (p[k] < mn[k]) mn[k] = p[k];
  const C = new Float64Array(12 * tris.length); const K = 1 << 17;
  tris.forEach((t, idx) => {
    t.nea = normalEArea(t.p);
    for (let q = 0; q < 3; q++) for (let k = 0; k < 3; k++) C[12 * idx + 3 * q + k] = t.p[q][k];
    for (let k = 0; k < 3; k++) C[12 * idx + 9 + k] = t.nea.area > 0 ? t.nea.n[k] : 0;
    const lo = [0, 1, 2].map((k) => Math.floor((Math.min(t.p[0][k], t.p[1][k], t.p[2][k]) - mn[k]) / celula));
    const hi = [0, 1, 2].map((k) => Math.floor((Math.max(t.p[0][k], t.p[1][k], t.p[2][k]) - mn[k]) / celula));
    for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) { const c = (i * K + j) * K + k; const l = cels.get(c); if (l) l.push(idx); else cels.set(c, [idx]); }
  });
  /* o triângulo mais perto: blocos de células ao redor do ponto, crescendo até a melhor distância caber na folga do bloco até a borda dele */
  const folga = (q, c, r) => { let m = Infinity; for (let k = 0; k < 3; k++) { m = Math.min(m, q[k] - mn[k] - (c[k] - r) * celula, (c[k] + r + 1) * celula - (q[k] - mn[k])); } return m; };
  const varre = (q, r, c, fn, soAnel) => {
    for (let i = c[0] - r; i <= c[0] + r; i++) for (let j = c[1] - r; j <= c[1] + r; j++) for (let k = c[2] - r; k <= c[2] + r; k++) {
      if (soAnel && Math.max(Math.abs(i - c[0]), Math.abs(j - c[1]), Math.abs(k - c[2])) !== r) continue;
      const l = cels.get((i * K + j) * K + k); if (l) for (const idx of l) fn(idx);
    }
  };
  const maisPerto = (q, limite = 60) => {
    const c = [0, 1, 2].map((k) => Math.floor((q[k] - mn[k]) / celula)); let melhor = Infinity, quem = -1;
    const fn = (idx) => { const d = triangulo2(C, idx, q[0], q[1], q[2]); if (d < melhor) { melhor = d; quem = idx; } };
    for (let r = 0; r <= limite; r++) { varre(q, r, c, fn, true); if (quem >= 0 && Math.sqrt(melhor) <= folga(q, c, r)) break; }
    return { d: Math.sqrt(melhor), quem };
  };
  /* os triângulos a no máximo `raio` do ponto (o raio cabe em `raio + celula` de blocos) */
  maisPerto.em = (q, raio) => {
    const c = [0, 1, 2].map((k) => Math.floor((q[k] - mn[k]) / celula)); const r = Math.ceil(raio / celula); const lista = []; const vistos = new Set();
    varre(q, r, c, (idx) => { if (!vistos.has(idx)) { vistos.add(idx); if (Math.sqrt(triangulo2(C, idx, q[0], q[1], q[2])) <= raio) lista.push(idx); } }, false);
    return lista;
  };
  return maisPerto;
}

/* as amostras de um triângulo: grade baricêntrica de `n` divisões */
function amostras(tri, n) {
  const [a, b, c] = tri.p; const s = [];
  for (let i = 0; i <= n; i++) for (let j = 0; i + j <= n; j++) { const u = i / n, v = j / n, w = 1 - u - v; s.push([w * a[0] + u * b[0] + v * c[0], w * a[1] + u * b[1] + v * c[1], w * a[2] + u * b[2] + v * c[2]]); }
  return s;
}

function contagemDeArestas(tris) {
  const m = new Map();
  for (const t of tris) for (let k = 0; k < 3; k++) {
    const a = t.vs[k], b = t.vs[(k + 1) % 3]; const direto = a < b; const ch = direto ? `${a}|${b}` : `${b}|${a}`;
    const e = m.get(ch) ?? [0, 0, 0]; e[0]++; e[direto ? 1 : 2]++; m.set(ch, e);
  }
  let borda = 0, multiplas = 0, invertidas = 0; const pai = new Map();
  const raiz = (x) => { while (pai.get(x) !== x) { pai.set(x, pai.get(pai.get(x))); x = pai.get(x); } return x; };
  for (const [ch, [n, d, i]] of m) {
    if (n === 1) { borda++; const [a, b] = ch.split('|'); for (const x of [a, b]) if (!pai.has(x)) pai.set(x, x); pai.set(raiz(a), raiz(b)); } else if (n > 2) multiplas++; else if (d !== 1 || i !== 1) invertidas++;
  }
  const lacos = new Set([...pai.keys()].map(raiz)).size;
  return { arestas: m.size, borda, lacos, multiplas, invertidas, fechada: borda === 0 && multiplas === 0 && invertidas === 0 };
}

const pct = (v, q) => { if (!v.length) return 0; const s = Float64Array.from(v).sort(); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

/** Confere a redução. `original` e `reduzida` são as malhas neutras (`{ V, F }`); `reduzida.mapa` o mapa do redutor. */
export function conferirReducao(original, reduzida, { unidade = 0.001, divisoesOriginal = 2, divisoesReduzida = 3, toleranciaMm = 0.05, normalGraus = 2 } = {}) {
  const O = triangulosOriginais(original, unidade), R = triangulosReduzidos(reduzida, unidade);
  const nomes = [...new Set([...O.map((t) => t.parte), ...R.map((t) => t.parte)])].sort();
  const partes = [];
  for (const nome of nomes) {
    const o = O.filter((t) => t.parte === nome), r = R.filter((t) => t.parte === nome);
    const comprimento = (ts) => { let s = 0, n = 0; for (const t of ts) for (let k = 0; k < 3; k++) { s += Math.hypot(...sub(t.p[k], t.p[(k + 1) % 3])); n++; } return n ? s / n : 1; };
    const celula = Math.max(2 * comprimento(o), 1);
    const iO = criarIndice(o, celula), iR = criarIndice(r.length ? r : [], celula);
    let ida = 0, volta = 0, nAmostras = 0; const nIda = [], nVolta = []; let acimaIda = 0, acimaVolta = 0;
    const pior = { graus: 0, triangulo: null };
    const normais = (ts, outro, indice, n, lista, divisoes) => {
      let max = 0, acima = 0;
      for (const t of ts) {
        for (const q of amostras(t, divisoes)) { const { d } = indice(q); if (d > max) max = d; if (d > toleranciaMm * (1 + 1e-9) + 1e-9) acima++; nAmostras++; }
        if (t.nea.area > 0) {
          const cen = [0, 1, 2].map((k) => (t.p[0][k] + t.p[1][k] + t.p[2][k]) / 3); const { d } = indice(cen);
          let melhor = Infinity; for (const idx of indice.em(cen, d + toleranciaMm)) { const al = outro[idx]; if (al.nea.area > 0) melhor = Math.min(melhor, Math.acos(Math.max(-1, Math.min(1, dot(t.nea.n, al.nea.n)))) * RAD); }
          if (melhor < Infinity) { lista.push(melhor); if (melhor > pior.graus) { pior.graus = melhor; pior.triangulo = t.id; pior.vs = t.vs; pior.centroMm = cen.map((x) => +x.toFixed(3)); } }
        }
      }
      return { max, acima };
    };
    const a = r.length ? normais(r, o, iO, 0, nIda, divisoesReduzida) : { max: Infinity, acima: 0 };
    const b = r.length ? normais(o, r, iR, 0, nVolta, divisoesOriginal) : { max: Infinity, acima: 0 };
    ida = a.max; volta = b.max; acimaIda = a.acima; acimaVolta = b.acima;
    const eO = contagemDeArestas(o), eR = contagemDeArestas(r);
    const degenerados = r.filter((t) => !(t.nea.area > 0)).length;
    const degeneradosOriginal = o.filter((t) => !(t.nea.area > 0)).length;
    const normalMax = Math.max(0, nIda.reduce((m, x) => Math.max(m, x), 0), nVolta.reduce((m, x) => Math.max(m, x), 0));
    partes.push({
      parte: nome, triangulosOriginal: o.length, triangulosReduzida: r.length,
      desvioIdaMm: ida, desvioVoltaMm: volta, desvioMaxMm: Math.max(ida, volta), amostrasAcimaDoTeto: acimaIda + acimaVolta,
      normalMaxGraus: normalMax, piorNormal: pior, normalP99Graus: Math.max(pct(nIda, 0.99), pct(nVolta, 0.99)),
      bordaOriginal: eO.borda, bordaReduzida: eR.borda, lacosOriginal: eO.lacos, lacosReduzida: eR.lacos, multiplasOriginal: eO.multiplas, multiplasReduzida: eR.multiplas,
      invertidasOriginal: eO.invertidas, invertidasReduzida: eR.invertidas, fechadaOriginal: eO.fechada, fechadaReduzida: eR.fechada,
      degeneradosOriginal, degeneradosReduzida: degenerados,
    });
  }
  /* o que sobrou é da original: id e posição dos vértices, campos das faces, e o mapa */
  const problemas = [];
  for (const [id, p] of reduzida.V) { const q = original.V.get(id); if (!q || q[0] !== p[0] || q[1] !== p[1] || q[2] !== p[2]) problemas.push(`vértice ${id} não é o da original`); }
  const iguais = (x, y) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null);
  for (const [id, f] of reduzida.F) {
    const fo = original.F.get(f.origem);
    if (!fo) { problemas.push(`triângulo ${id}: origem ${f.origem} não existe`); continue; }
    for (const campo of new Set([...Object.keys(fo), ...Object.keys(f)])) { if (['vs', 'id', 'origem'].includes(campo)) continue; if (!iguais(fo[campo], f[campo])) problemas.push(`triângulo ${id}: campo ${campo} difere da face ${f.origem}`); }
  }
  const mapa = reduzida.mapa ?? new Map();
  const parteDe = new Map(O.map((t) => [t.id, t.parte]));
  for (const [de, para] of mapa) {
    if (reduzida.F.has(de)) problemas.push(`mapa: ${de} está no mapa e também na saída`);
    if (!reduzida.F.has(para)) problemas.push(`mapa: ${de} vai a ${para}, que não sobrevive`);
    else if ((reduzida.F.get(para).parte ?? SEM_PARTE) !== parteDe.get(de)) problemas.push(`mapa: ${de} vai a ${para}, de outra parte`);
  }
  if (mapa.size && mapa.size + reduzida.F.size !== O.length) problemas.push(`o mapa (${mapa.size}) e a saída (${reduzida.F.size}) não somam os ${O.length} triângulos da original`);
  const todos = {
    desvioMaxMm: partes.reduce((m, p) => Math.max(m, p.desvioMaxMm), 0), normalMaxGraus: partes.reduce((m, p) => Math.max(m, p.normalMaxGraus), 0),
    triangulosOriginal: O.length, triangulosReduzida: R.length, ...contagemDeArestas(R),
    bordaOriginal: contagemDeArestas(O).borda, lacosOriginal: contagemDeArestas(O).lacos,
  };
  const ok = todos.desvioMaxMm <= toleranciaMm * (1 + 1e-9) + 1e-9 && todos.normalMaxGraus <= normalGraus + 1e-9 && !problemas.length
    && partes.every((p) => p.lacosOriginal === p.lacosReduzida && p.multiplasOriginal === p.multiplasReduzida && p.fechadaOriginal === p.fechadaReduzida && p.degeneradosReduzida <= p.degeneradosOriginal);
  return { ok, toleranciaMm, normalGraus, partes, todos, problemas };
}
