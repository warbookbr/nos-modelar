/* Onde um volume atravessa a superfície do outro.

   Duas peças que se interpenetram (o pino que passa pelo furo com folga negativa, a rótula que sai pelas duas faces do olhal, a roda
   que entra no aro) formam na tela uma aresta que nenhuma das malhas tem: a curva em que a superfície de uma cruza a da outra. A
   silhueta e o vinco da malha não a traçam, e a imagem sai sem a linha onde a cor e a profundidade mudam de um lado ao outro dela. Aqui
   ela sai da conta exata de cada par de triângulos de volumes diferentes: o segmento em que um triângulo cruza o plano do outro, cortado
   pelo triângulo do outro. Os pares que se tocam (dividem um vértice, como as duas partes de uma superfície só, ou são coplanares, como
   as paredes que se encostam) não têm cruzamento e ficam fora. Quem usa decide quais cruzamentos são aresta (as normais com mais de 30
   graus entre si) e o que deles se vê. A mesma entrada dá a mesma saída: nada aqui sorteia ou olha o tempo. */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/* a distância (mm) abaixo da qual um vértice está sobre o plano do outro triângulo */
const SOBRE_O_PLANO = 1e-7;
/* o cruzamento mais curto que conta (mm) */
const CRUZAMENTO_MINIMO = 1e-3;
const CELULAS_MAXIMAS = 48;

/* O segmento em que o triângulo `B` cruza o `A` (cada um `{ p: [três pontos], n: normal unitária }`), ou null. */
export function cruzamentoDeTriangulos(A, B) {
  const dB = B.p.map((q) => dot(A.n, sub(q, A.p[0])));
  if (dB.every((d) => d > SOBRE_O_PLANO) || dB.every((d) => d < -SOBRE_O_PLANO)) return null;
  if (dB.every((d) => Math.abs(d) <= SOBRE_O_PLANO)) return null;
  const dA = A.p.map((q) => dot(B.n, sub(q, B.p[0])));
  if (dA.every((d) => d > SOBRE_O_PLANO) || dA.every((d) => d < -SOBRE_O_PLANO)) return null;
  /* B cortado pelo plano de A: os vértices sobre o plano e os pontos onde as arestas o atravessam */
  const pontos = [];
  for (let k = 0; k < 3; k++) {
    if (Math.abs(dB[k]) <= SOBRE_O_PLANO) pontos.push(B.p[k]);
    const m = (k + 1) % 3;
    if ((dB[k] > SOBRE_O_PLANO && dB[m] < -SOBRE_O_PLANO) || (dB[k] < -SOBRE_O_PLANO && dB[m] > SOBRE_O_PLANO)) {
      const t = dB[k] / (dB[k] - dB[m]);
      pontos.push(B.p[k].map((c, e) => c + t * (B.p[m][e] - c)));
    }
  }
  if (pontos.length < 2) return null;
  /* os dois pontos mais afastados, se sobrou mais de dois (um vértice sobre o plano repete o ponto) */
  let a = pontos[0]; let b = pontos[1]; let maior = -1;
  for (let i = 0; i < pontos.length; i++) {
    for (let j = i + 1; j < pontos.length; j++) {
      const d = sub(pontos[i], pontos[j]); const c = dot(d, d);
      if (c > maior) { maior = c; a = pontos[i]; b = pontos[j]; }
    }
  }
  if (!(maior > 0)) return null;
  /* e cortado pelo triângulo A, no plano de A: dentro dos três lados */
  let t0 = 0; let t1 = 1;
  const d = sub(b, a);
  for (let k = 0; k < 3; k++) {
    const lado = sub(A.p[(k + 1) % 3], A.p[k]);
    const para = cruz(A.n, lado);
    const c = dot(para, sub(a, A.p[k]));
    const s = dot(para, d);
    const folga = SOBRE_O_PLANO * Math.hypot(...para);
    if (Math.abs(s) < 1e-14) { if (c < -folga) return null; continue; }
    const t = (-folga - c) / s;
    if (s > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    if (t1 <= t0) return null;
  }
  const comp = Math.sqrt(maior) * (t1 - t0);
  if (!(comp > CRUZAMENTO_MINIMO)) return null;
  return [a.map((x, e) => x + t0 * d[e]), a.map((x, e) => x + t1 * d[e])];
}

/* Os cruzamentos de todos os pares de triângulos de volumes diferentes que não dividem vértice. `tris`: `{ p, n, volume, ids }` (`ids`:
   os vértices soldados do triângulo). Devolve `{ a, b, de, com }` por cruzamento, com os índices dos dois triângulos em `tris`. */
export function cruzamentosEntreVolumes(tris) {
  if (tris.length < 2) return [];
  const caixas = tris.map((t) => [0, 1, 2].map((e) => Math.min(t.p[0][e], t.p[1][e], t.p[2][e])).concat([0, 1, 2].map((e) => Math.max(t.p[0][e], t.p[1][e], t.p[2][e]))));
  const min = [0, 1, 2].map((e) => Math.min(...caixas.map((c) => c[e])));
  const max = [0, 1, 2].map((e) => Math.max(...caixas.map((c) => c[3 + e])));
  const medio = caixas.reduce((s, c) => s + Math.max(c[3] - c[0], c[4] - c[1], c[5] - c[2]), 0) / caixas.length;
  const lado = Math.max(medio, Math.max(...max.map((m, e) => m - min[e])) / CELULAS_MAXIMAS, 1e-9);
  const celula = (v, e) => Math.floor((v - min[e]) / lado);
  const grade = new Map();
  caixas.forEach((c, i) => {
    for (let x = celula(c[0], 0); x <= celula(c[3], 0); x++) for (let y = celula(c[1], 1); y <= celula(c[4], 1); y++) for (let z = celula(c[2], 2); z <= celula(c[5], 2); z++) {
      const k = `${x},${y},${z}`;
      if (!grade.has(k)) grade.set(k, []);
      grade.get(k).push(i);
    }
  });
  const saida = [];
  for (const [k, lista] of grade) {
    const [cx, cy, cz] = k.split(',').map(Number);
    for (let u = 0; u < lista.length; u++) {
      for (let w = u + 1; w < lista.length; w++) {
        const i = lista[u]; const j = lista[w];
        if (tris[i].volume === tris[j].volume) continue;
        const ci = caixas[i]; const cj = caixas[j];
        /* o par é tratado só na célula do canto de menor coordenada da sobreposição das caixas */
        let sobrepoe = true; let nesta = true;
        for (let e = 0; e < 3 && sobrepoe; e++) {
          const lo = Math.max(ci[e], cj[e]); const hi = Math.min(ci[3 + e], cj[3 + e]);
          if (hi < lo) sobrepoe = false;
          else if (celula(lo, e) !== [cx, cy, cz][e]) nesta = false;
        }
        if (!sobrepoe || !nesta) continue;
        if (tris[i].ids.some((v) => tris[j].ids.includes(v))) continue;
        const seg = cruzamentoDeTriangulos(tris[i], tris[j]);
        if (seg) saida.push({ a: seg[0], b: seg[1], de: i, com: j });
      }
    }
  }
  return saida;
}
