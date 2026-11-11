/* arcos-do-contorno.js — o anel de pontos 2D simplificado, com os trechos curvos declarados trocados pelo círculo ajustado
 *
 * FICHA contornoComArcos
 * serve: simplifica um anel de pontos 2D medido (de um contorno de imagem ou de uma vista) e troca cada trecho curvo declarado pelo
 *   círculo que melhor passa pelos pontos dele, amostrado a 96 lados por volta; avisa o arco facetado que ninguém declarou.
 * quando: o contorno medido entra numa extrusão e a simplificação deixa a curva em facetas de 20 a 25 graus; a simplificação sozinha
 *   não distingue o arco do canto, e o ajuste à mão em cada arquivo repete o mesmo código.
 * unidades: tudo em mm, no sistema do anel; os pontos de `de` e `ate` são lidos no anel bruto, sem simplificar.
 * campos:
 *   tolerancia: o desvio máximo da simplificação (Ramer-Douglas-Peucker) e do círculo do aviso, em mm (padrão 6).
 *   arcos: [{ de: [u, v], ate: [u, v] }, ...] os trechos curvos; cada ponta vai ao ponto mais perto do anel bruto, e o trecho é
 *     o sentido entre elas cujo círculo tem o menor desvio (no empate, o que passa por menos pontos do anel).
 *   lados: os lados por volta da amostragem do círculo (padrão 96; múltiplo de 4, para o `segmentosArco` da extrusão).
 *   juntar: a distância abaixo da qual dois pontos seguidos viram um, em mm (padrão 0,5); o ponto do arco fica, o outro sai.
 *   giroMaximo: o giro máximo, em graus, de um vértice dentro de um arco facetado do aviso (padrão 45).
 * devolve: { pontos, circulos, inicio, trechos, segmentosArco, avisos }; `circulos` traz { centro, raio, desvio, angulo } de cada
 *   arco declarado, na ordem de `arcos`, com o desvio máximo dos pontos brutos ao círculo; `inicio` e `trechos` são o contorno
 *   por trechos ({reto} e {arco: {centro, angulo}}) que a `extrusao` aceita em `perfil: {contorno: {inicio, trechos}}`, com
 *   `segmentosArco` (lados / 4) no passo, e dão os mesmos pontos; `avisos` traz um texto por arco facetado não declarado, com as
 *   pontas, o centro, o raio e o desvio dele.
 * exemplo:
 *   contornoComArcos([...Array.from({ length: 40 }, (_, k) => [10 * k, 0]), ...Array.from({ length: 30 },
 *     (_, k) => [200 + 200 * Math.cos(Math.PI * k / 30), 200 * Math.sin(Math.PI * k / 30)])], { arcos: [{ de: [400, 0], ate: [0, 0] }] })
 * peça: procedural/pecas/empilhadeira/referencias/carcaca.esboco.mjs (dois arcos de um lado e um de outro, ajustados à mão hoje).
 * FIM DA FICHA
 *
 * Função pura, sem Three.js e sem domínio. A SIMPLIFICAÇÃO corta o anel no ponto mais longe do primeiro e simplifica as duas metades
 * por Ramer-Douglas-Peucker; os vértices que ficam são pontos do anel bruto, na ordem dele. O CÍRCULO é o de Kasa (mínimos quadrados
 * de x² + y² + D x + E y + F = 0) sobre os pontos brutos do trecho, e o arco vai do primeiro ao último deles pelo lado em que fica o
 * do meio, em passos iguais de no máximo 360 / lados graus. No anel simplificado, o arco toma o lugar dos vértices entre os dois
 * mais perto das pontas do trecho (as duas pontas inclusive).
 *
 * O AVISO. Entre os arcos declarados, uma sequência de três ou mais segmentos do anel simplificado que giram todos para o mesmo lado,
 * cada vértice no máximo `giroMaximo` e somados ao menos 30 graus, e cujos pontos brutos cabem num círculo dentro da `tolerancia` é um arco facetado que ninguém
 * declarou. Ele não muda o contorno: o aviso diz de onde a onde vai, e o trecho entra em `arcos` se for curva.
 *
 * AS RECUSAS. Anel com menos de três pontos ou ponto fora de [u, v] finito, tolerância não positiva, arco sem `de` ou `ate`,
 * trecho com menos de três pontos brutos e trecho cujos pontos não dão círculo (colineares) são recusados com a medida. */

/* o giro somado, em graus, abaixo do qual a sequência é uma borda quase reta com ruído e não entra no aviso */
const GIRO_TOTAL_MINIMO = 30;
const erro = (texto) => { throw new Error(`contornoComArcos: ${texto}`); };
const br = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
const pt = (p) => `[${br(p[0])}, ${br(p[1])}]`;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const norm = (t) => Math.atan2(Math.sin(t), Math.cos(t));

/* Ramer-Douglas-Peucker sobre índices de `c`, de i0 a i1 (inclusive), em `idx` crescente; devolve os índices que ficam */
function rdp(c, idx, eps) {
  if (idx.length < 3) return idx;
  const [x1, y1] = c[idx[0]]; const [x2, y2] = c[idx[idx.length - 1]];
  const n = Math.hypot(x2 - x1, y2 - y1) || 1e-9;
  let dmax = 0; let k = 0;
  for (let i = 1; i < idx.length - 1; i += 1) {
    const [x, y] = c[idx[i]];
    const d = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / n;
    if (d > dmax) { dmax = d; k = i; }
  }
  return dmax > eps ? [...rdp(c, idx.slice(0, k + 1), eps).slice(0, -1), ...rdp(c, idx.slice(k), eps)] : [idx[0], idx[idx.length - 1]];
}
/* os índices dos vértices do anel simplificado, na ordem do anel */
function simplificar(c, eps) {
  let longe = 0;
  c.forEach((p, i) => { if (dist(p, c[0]) > dist(c[longe], c[0])) longe = i; });
  const ida = Array.from({ length: longe + 1 }, (_, i) => i);
  const volta = [...Array.from({ length: c.length - longe }, (_, i) => longe + i), 0];
  return [...rdp(c, ida, eps).slice(0, -1), ...rdp(c, volta, eps).slice(0, -1)];
}

/* o círculo de Kasa pelos pontos: { centro, raio } ou null quando os pontos não dão círculo */
function ajustarCirculo(pts) {
  const a = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; const b = [0, 0, 0];
  for (const [x, y] of pts) {
    const v = [x, y, 1]; const w = -(x * x + y * y);
    for (let i = 0; i < 3; i += 1) { b[i] += v[i] * w; for (let j = 0; j < 3; j += 1) a[i][j] += v[i] * v[j]; }
  }
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d = det(a);
  if (!Number.isFinite(d) || Math.abs(d) < 1e-12 * Math.max(1, Math.abs(a[0][0] * a[1][1] * a[2][2]))) return null;
  const s = [0, 1, 2].map((k) => det(a.map((linha, i) => linha.map((v, j) => (j === k ? b[i] : v)))) / d);
  const cx = -s[0] / 2; const cy = -s[1] / 2; const r2 = cx * cx + cy * cy - s[2];
  if (!(r2 > 0) || !Number.isFinite(r2)) return null;
  return { centro: [cx, cy], raio: Math.sqrt(r2) };
}
const desvioDe = ({ centro, raio }, pts) => pts.reduce((m, p) => Math.max(m, Math.abs(dist(p, centro) - raio)), 0);

/* a varredura (rad, com sinal) do círculo de p0 a p1 pelo lado em que fica pm, e os pontos em passos de no máximo 2π / lados */
function arcoDoCirculo({ centro: [cx, cy], raio: r }, p0, p1, pm, lados) {
  const ang = ([x, y]) => Math.atan2(y - cy, x - cx);
  const a0 = ang(p0); let d = norm(ang(p1) - a0); const dm = norm(ang(pm) - a0);
  if (Math.sign(dm) !== Math.sign(d) || Math.abs(dm) > Math.abs(d)) d -= Math.sign(d) * 2 * Math.PI;
  const n = Math.max(2, Math.ceil(Math.abs(d) / (2 * Math.PI / lados)));
  return { a0, d, pts: Array.from({ length: n + 1 }, (_, k) => [cx + r * Math.cos(a0 + d * k / n), cy + r * Math.sin(a0 + d * k / n)]) };
}

const maisPerto = (lista, p) => lista.reduce((m, q, i) => (dist(q, p) < dist(lista[m], p) ? i : m), 0);

/* o trecho do anel bruto de `de` a `ate` pelo sentido cujo círculo tem o menor desvio (no empate, o de menos pontos), com o círculo */
function trechoBruto(c, de, ate) {
  const n = c.length; const ia = maisPerto(c, de); const ib = maisPerto(c, ate);
  const sentidos = [1, -1].map((passo) => {
    const t = []; for (let i = ia; i !== ib; i = (i + passo + n) % n) t.push(c[i]);
    t.push(c[ib]);
    const circ = t.length >= 3 ? ajustarCirculo(t) : null;
    return { t, circ, desvio: circ ? desvioDe(circ, t) : Infinity };
  });
  const [a, b] = sentidos;
  if (a.desvio !== b.desvio) return a.desvio < b.desvio ? a : b;
  return a.t.length <= b.t.length ? a : b;
}

const pontoValido = (p) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);

/** contornoComArcos(anel, { tolerancia, arcos, lados, juntar, giroMaximo }) -> { pontos, circulos, inicio, trechos, segmentosArco, avisos } */
export function contornoComArcos(anel, opcoes = {}) {
  const { tolerancia = 6, arcos = [], lados = 96, juntar = 0.5, giroMaximo = 45 } = opcoes;
  if (!Array.isArray(anel) || anel.length < 3) erro(`o anel precisa de três pontos [u, v] ou mais (veio ${Array.isArray(anel) ? anel.length : typeof anel})`);
  anel.forEach((p, i) => { if (!pontoValido(p)) erro(`o ponto ${i} do anel não é [u, v] finito`); });
  if (!(tolerancia > 0)) erro(`a tolerância precisa ser maior que zero (veio ${tolerancia})`);
  if (!Number.isInteger(lados) || lados < 8 || lados % 4 !== 0) erro(`lados precisa ser um inteiro múltiplo de 4, de 8 para cima (veio ${lados})`);
  if (!Array.isArray(arcos)) erro('arcos precisa ser uma lista de { de, ate }');

  /* cada entrada: { p, bruto (índice no anel, ou -1 no arco), arco (índice em `arcos`, ou -1) } */
  let c = simplificar(anel, tolerancia).map((i) => ({ p: anel[i], bruto: i, arco: -1 }));
  const circulos = arcos.map(({ de, ate } = {}, k) => {
    if (!pontoValido(de) || !pontoValido(ate)) erro(`o arco ${k} precisa de de: [u, v] e ate: [u, v]`);
    const { t, circ } = trechoBruto(anel, de, ate);
    if (t.length < 3) erro(`o arco ${k} (de ${pt(de)} a ${pt(ate)}) tem ${t.length} ponto(s) no anel; o círculo precisa de três ou mais`);
    if (!circ) erro(`os pontos do arco ${k} (de ${pt(t[0])} a ${pt(t[t.length - 1])}) não dão círculo: estão numa reta`);
    const { d, pts } = arcoDoCirculo(circ, t[0], t[t.length - 1], t[Math.floor(t.length / 2)], lados);
    const n = c.length; const vert = c.map((e) => e.p);
    const ja = maisPerto(vert, t[0]); const jb = maisPerto(vert, t[t.length - 1]);
    const ida = (jb - ja + n) % n;
    const marcados = pts.map((p) => ({ p, bruto: -1, arco: k }));
    /* os vértices que o arco substitui são os do sentido que fica no círculo; no empate, os do sentido mais curto */
    const fora = (i0, m) => { let x = 0; for (let s = 1; s < m; s += 1) x = Math.max(x, Math.abs(dist(vert[(i0 + s) % n], circ.centro) - circ.raio)); return x; };
    const desvioIda = fora(ja, ida); const desvioVolta = fora(jb, n - ida);
    if (desvioIda !== desvioVolta ? desvioIda < desvioVolta : ida <= n / 2) {
      const r = [...c.slice(ja), ...c.slice(0, ja)];
      c = [...marcados, ...r.slice(ida + 1)];
    } else {
      const r = [...c.slice(jb), ...c.slice(0, jb)];
      c = [...marcados.reverse(), ...r.slice(n - ida + 1)];
    }
    return { centro: circ.centro, raio: circ.raio, desvio: desvioDe(circ, t), angulo: d * 180 / Math.PI };
  });

  /* dois pontos seguidos a menos de `juntar`: sai o de trás, ou o que não é do arco */
  const apagar = new Set();
  c.forEach((e, i) => {
    const q = c[(i + c.length - 1) % c.length];
    if (dist(e.p, q.p) > juntar) return;
    if (e.arco >= 0 && q.arco < 0) apagar.add((i + c.length - 1) % c.length);
    else if (!(e.arco >= 0 && q.arco >= 0)) apagar.add(i);
  });
  c = c.filter((_, i) => !apagar.has(i));
  if (c.length < 3) erro(`o contorno ficou com ${c.length} pontos; a tolerância de ${br(tolerancia)} mm é grande para o anel`);

  /* o contorno por trechos: começa num vértice fora de arco, ou no começo de um arco */
  const comeca = (i) => c[i].arco < 0 || c[(i + c.length - 1) % c.length].arco !== c[i].arco;
  let i0 = c.findIndex((e) => e.arco < 0);
  if (i0 < 0) i0 = c.findIndex((_, i) => comeca(i));
  const ordem = [...c.slice(i0), ...c.slice(0, i0)];
  const inicio = ordem[0].p; const trechos = [];
  for (let i = 0; i < ordem.length;) {
    const e = ordem[i];
    if (e.arco < 0) { if (i > 0) trechos.push({ reto: e.p }); i += 1; continue; }
    let j = i; while (j + 1 < ordem.length && ordem[j + 1].arco === e.arco) j += 1;
    if (i > 0 && dist(e.p, ordem[i - 1].p) > 1e-6) trechos.push({ reto: e.p });
    const { centro } = circulos[e.arco];
    const ang = (p) => Math.atan2(p[1] - centro[1], p[0] - centro[0]);
    let varre = 0; for (let k = i; k < j; k += 1) varre += norm(ang(ordem[k + 1].p) - ang(ordem[k].p));
    if (j > i) trechos.push({ arco: { centro, angulo: varre * 180 / Math.PI } });
    i = j + 1;
  }

  /* o aviso: arcos facetados entre os vértices fora de arco */
  const avisos = [];
  const m = c.length;
  const giro = (k) => {
    const a = c[(k + m - 1) % m].p; const b = c[k].p; const d = c[(k + 1) % m].p;
    return norm(Math.atan2(d[1] - b[1], d[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]));
  };
  const brutoEntre = (b0, b1) => { const t = []; for (let i = b0; ; i = (i + 1) % anel.length) { t.push(anel[i]); if (i === b1) break; } return t; };
  const livre = c.map((e) => e.arco < 0);
  let s0 = livre.every(Boolean) ? c.reduce((mx, _, k) => (Math.abs(giro(k)) > Math.abs(giro(mx)) ? k : mx), 0)
    : c.findIndex((_, k) => livre[k] && !livre[(k + m - 1) % m]);
  if (s0 >= 0) {
    const seq = Array.from({ length: m }, (_, k) => (s0 + k) % m);
    const limite = giroMaximo * Math.PI / 180;
    let a = 0;
    while (a < seq.length) {
      if (!livre[seq[a]]) { a += 1; continue; }
      let melhor = -1; let melhorCirc = null;
      const sinal = Math.sign(giro(seq[a + 1] ?? seq[a]));
      const dobra = (k) => { const g = giro(seq[k]); return Math.abs(g) > 1e-9 && Math.abs(g) <= limite && Math.sign(g) === sinal; };
      for (let b = a + 3; b < seq.length && livre[seq[b]]; b += 1) {
        if (!(b === a + 3 ? [a + 1, a + 2].every(dobra) : dobra(b - 1))) break;
        const t = brutoEntre(c[seq[a]].bruto, c[seq[b]].bruto);
        const circ = ajustarCirculo(t);
        if (!circ || desvioDe(circ, t) > tolerancia) break;
        let total = 0; for (let k = a + 1; k < b; k += 1) total += Math.abs(giro(seq[k]));
        if (total >= GIRO_TOTAL_MINIMO * Math.PI / 180) { melhor = b; melhorCirc = { ...circ, desvio: desvioDe(circ, t) }; }
      }
      if (melhor < 0) { a += 1; continue; }
      const p0 = c[seq[a]].p; const p1 = c[seq[melhor]].p;
      avisos.push(`arco facetado não declarado de ${pt(p0)} a ${pt(p1)}: ${melhor - a} segmentos cabem no círculo de centro ${pt(melhorCirc.centro)} e raio ${br(melhorCirc.raio)} mm com desvio de ${br(melhorCirc.desvio)} mm; declare { de: ${pt(p0)}, ate: ${pt(p1)} } em arcos se for curva`);
      a = melhor;
    }
  }

  return { pontos: c.map((e) => e.p), circulos, inicio, trechos, segmentosArco: lados / 4, avisos };
}
