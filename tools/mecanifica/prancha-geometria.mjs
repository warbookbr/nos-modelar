#!/usr/bin/env node
/* prancha-geometria.mjs — traçado 2D em milímetros para as pranchas ortográficas.
   Tudo aqui devolve POLILINHA AMOSTRADA, nunca comando de SVG: é essa decisão que
   permite desenhar e medir o mesmo dado, em vez de medir uma segunda verdade.
   Puro, determinístico, sem dependência. */

const TAU = Math.PI * 2;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cruz = (a, b) => a[0] * b[1] - a[1] * b[0];
const norma = (a) => Math.hypot(a[0], a[1]);
const unit = (a) => { const l = norma(a) || 1; return [a[0] / l, a[1] / l]; };
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/* Polilinha com filete por vértice: `[x, y, r]`, com `r` em milímetros.
   `r` ausente ou zero é canto vivo. É a primitiva certa para carroceria, que é
   feita de trechos retos ligados por raios curtos — spline por pontos abaula
   tudo e foi o que transformou rampa de fastback em cúpula. */
export function filete(pts, { fechado = false, porArco = 10 } = {}) {
  const n = pts.length;
  if (n < 2) return pts.map(([x, y]) => [x, y]);
  const saida = [];
  const idx = (i) => (i + n) % n;
  const primeiro = fechado ? 0 : 1;
  const ultimo = fechado ? n - 1 : n - 2;

  if (!fechado) saida.push([pts[0][0], pts[0][1]]);

  for (let i = primeiro; i <= ultimo; i += 1) {
    const p = pts[idx(i)];
    const r = p[2] ?? 0;
    const a = pts[idx(i - 1)];
    const b = pts[idx(i + 1)];
    const va = unit(sub(a, p));
    const vb = unit(sub(b, p));
    const cos = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1]));
    const teta = Math.acos(cos);

    /* Colinear ou raio nulo: canto vivo, nada a arredondar. */
    if (!(r > 0) || teta < 1e-4 || Math.PI - teta < 1e-4) {
      saida.push([p[0], p[1]]);
      continue;
    }

    /* Recuo tangente, limitado a metade de cada segmento vizinho para que dois
       filetes seguidos não se comam. */
    const tIdeal = r / Math.tan(teta / 2);
    const t = Math.min(tIdeal, dist(p, a) / 2, dist(p, b) / 2);
    const rEfetivo = t * Math.tan(teta / 2);
    const T1 = [p[0] + va[0] * t, p[1] + va[1] * t];
    const T2 = [p[0] + vb[0] * t, p[1] + vb[1] * t];

    const bis = unit([va[0] + vb[0], va[1] + vb[1]]);
    const d = rEfetivo / Math.sin(teta / 2);
    const C = [p[0] + bis[0] * d, p[1] + bis[1] * d];

    let a1 = Math.atan2(T1[1] - C[1], T1[0] - C[0]);
    let a2 = Math.atan2(T2[1] - C[1], T2[0] - C[0]);
    let delta = a2 - a1;
    while (delta > Math.PI) delta -= TAU;
    while (delta < -Math.PI) delta += TAU;

    saida.push(T1);
    for (let k = 1; k < porArco; k += 1) {
      const ang = a1 + (delta * k) / porArco;
      saida.push([C[0] + Math.cos(ang) * rEfetivo, C[1] + Math.sin(ang) * rEfetivo]);
    }
    saida.push(T2);
  }

  if (!fechado) saida.push([pts[n - 1][0], pts[n - 1][1]]);
  else saida.push(saida[0]);
  return saida;
}

/* Catmull-Rom amostrada. Continua útil onde a forma é genuinamente spline —
   contorno de planta, perfil de capô — mas deixou de ser a primitiva padrão. */
export function suave(pts, { fechado = false, porSegmento = 14 } = {}) {
  const n = pts.length;
  if (n < 2) return pts.map(([x, y]) => [x, y]);
  const P = fechado ? [...pts, pts[0]] : pts;
  const m = P.length;
  const em = (i) => P[Math.min(Math.max(i, 0), m - 1)];
  const pego = (i) => (fechado ? P[(i + m - 1) % (m - 1)] : em(i));
  const saida = [[P[0][0], P[0][1]]];
  for (let i = 0; i < m - 1; i += 1) {
    const p0 = pego(i - 1); const p1 = P[i]; const p2 = P[i + 1]; const p3 = pego(i + 2);
    for (let k = 1; k <= porSegmento; k += 1) {
      const t = k / porSegmento; const t2 = t * t; const t3 = t2 * t;
      saida.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return saida;
}

export function poli(pts, { fechado = false } = {}) {
  const saida = pts.map(([x, y]) => [x, y]);
  if (fechado && saida.length > 1) saida.push(saida[0]);
  return saida;
}

export function circulo(centro, raio, { lados = 72 } = {}) {
  return Array.from({ length: lados + 1 }, (_, i) => [
    centro[0] + Math.cos((i / lados) * TAU) * raio,
    centro[1] + Math.sin((i / lados) * TAU) * raio,
  ]);
}

/* Arco de meia volta pelo lado positivo de y — o arco de caixa de roda. */
export function arcoSuperior(centro, raio, { lados = 36 } = {}) {
  return Array.from({ length: lados + 1 }, (_, i) => {
    const ang = Math.PI - (i / lados) * Math.PI;
    return [centro[0] + Math.cos(ang) * raio, centro[1] + Math.sin(ang) * raio];
  });
}

/* --- medida ------------------------------------------------------------- */

export function comprimento(pl) {
  let s = 0;
  for (let i = 1; i < pl.length; i += 1) s += dist(pl[i - 1], pl[i]);
  return s;
}

export function caixa(pl) {
  const xs = pl.map((p) => p[0]); const ys = pl.map((p) => p[1]);
  return { xMin: Math.min(...xs), xMax: Math.max(...xs), yMin: Math.min(...ys), yMax: Math.max(...ys) };
}

/* Curvatura discreta com sinal, por vértice interno. Devolve também o raio, para
   que "raio mínimo" vire número em vez de impressão. */
export function curvatura(pl) {
  const out = [];
  for (let i = 1; i < pl.length - 1; i += 1) {
    const a = pl[i - 1]; const b = pl[i]; const c = pl[i + 1];
    const u = sub(b, a); const v = sub(c, b);
    const lu = norma(u); const lv = norma(v); const lw = dist(a, c);
    const area2 = cruz(u, v);
    const k = (lu * lv * lw) === 0 ? 0 : (2 * area2) / (lu * lv * lw);
    out.push({ i, k, raio: k === 0 ? Infinity : Math.abs(1 / k), s: (lu + lv) / 2 });
  }
  return out;
}

/* Reamostragem por comprimento de arco, sem pontos duplicados. */
export function reamostrar(pl, { passos = 300 } = {}) {
  const total = comprimento(pl);
  if (total === 0 || pl.length < 2) return pl.map(([x, y]) => [x, y]);
  const passo = total / passos;
  const saida = [pl[0]];
  let alvo = passo; let acumulado = 0;
  for (let i = 1; i < pl.length; i += 1) {
    const a = pl[i - 1]; const b = pl[i];
    const seg = dist(a, b);
    if (seg === 0) continue;
    while (acumulado + seg >= alvo && alvo < total) {
      const t = (alvo - acumulado) / seg;
      saida.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      alvo += passo;
    }
    acumulado += seg;
  }
  saida.push(pl[pl.length - 1]);
  return saida;
}

/* Ponto a uma distância `s` ao longo da linha, por interpolação linear. */
function amostraEm(pl, acum, s) {
  const total = acum[acum.length - 1];
  const alvo = Math.max(0, Math.min(total, s));
  let lo = 0; let hi = acum.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (acum[mid] < alvo) lo = mid + 1; else hi = mid; }
  const i = Math.max(1, lo);
  const seg = acum[i] - acum[i - 1];
  const t = seg === 0 ? 0 : (alvo - acum[i - 1]) / seg;
  return [pl[i - 1][0] + (pl[i][0] - pl[i - 1][0]) * t, pl[i - 1][1] + (pl[i][1] - pl[i - 1][1]) * t];
}

/* Curvatura por JANELA de comprimento de arco, não por vértice.
   Reamostrar não resolve: polilinha já é linear por trecho, então o giro fica
   preso nos vértices originais e qualquer medida por vértice acaba medindo
   densidade de amostragem em vez de forma. Foi assim que um círculo perfeito
   apareceu como "giro concentrado". A janela fixa corrige isso. */
export function perfilCurvatura(pl, { estacoes = 200, janela = 0.02 } = {}) {
  if (pl.length < 3) return [];
  const acum = [0];
  for (let i = 1; i < pl.length; i += 1) acum.push(acum[i - 1] + dist(pl[i - 1], pl[i]));
  const total = acum[acum.length - 1];
  if (total === 0) return [];
  const h = Math.max(total * janela, 1e-9);
  const perfil = [];
  for (let i = 0; i <= estacoes; i += 1) {
    const sPos = (i / estacoes) * total;
    const a = amostraEm(pl, acum, sPos - h);
    const b = amostraEm(pl, acum, sPos);
    const c = amostraEm(pl, acum, sPos + h);
    const u = sub(b, a); const v = sub(c, b);
    if (norma(u) < 1e-12 || norma(v) < 1e-12) continue;
    const giro = Math.atan2(cruz(u, v), u[0] * v[0] + u[1] * v[1]);
    const arco = (norma(u) + norma(v)) / 2;
    perfil.push({ s: sPos, k: giro / Math.max(arco, 1e-9), giro: Math.abs(giro), ds: total / estacoes });
  }
  return perfil;
}

/* Fração do comprimento que é praticamente reta. Limiar relativo ao tamanho da
   própria linha, para valer igual num arco de roda e numa lateral inteira. */
export function retidao(pl, { fatorReto = 3, ...op } = {}) {
  const perfil = perfilCurvatura(pl, op);
  if (perfil.length === 0) return 1;
  const kReto = 1 / (fatorReto * comprimento(pl));
  let reto = 0;
  for (const p of perfil) if (Math.abs(p.k) <= kReto) reto += 1;
  return reto / perfil.length;
}

/* Fração do comprimento que concentra 90% do giro total.
   É ESTA a métrica que separa "rampa com um filete" de "cúpula". Retidão não
   separava: uma spline por três pontos também é quase toda reta — ela só espalha
   a curva pelo meio. Carroceria boa tem giro concentrado em raios curtos; forma
   de sabonete tem giro espalhado por toda a linha.
   Perto de 0 = trechos retos ligados por raios curtos. Perto de 1 = abaulado. */
export function concentracaoDoGiro(pl, { quantil = 0.9, ...op } = {}) {
  const perfil = perfilCurvatura(pl, op);
  if (perfil.length === 0) return 0;
  const total = perfil.reduce((acc, p) => acc + p.giro, 0);
  if (total < 1e-9) return 0;
  const ordenado = [...perfil].sort((a, b) => b.giro - a.giro);
  let acumGiro = 0; let contagem = 0;
  for (const p of ordenado) {
    if (acumGiro >= quantil * total) break;
    acumGiro += p.giro; contagem += 1;
  }
  return contagem / perfil.length;
}

export function inversoes(pl, { fatorReto = 3, ...op } = {}) {
  const perfil = perfilCurvatura(pl, op);
  const kReto = 1 / (fatorReto * comprimento(pl));
  let sinal = 0; let contagem = 0;
  for (const p of perfil) {
    if (Math.abs(p.k) <= kReto) continue;
    const sg = Math.sign(p.k);
    if (sinal !== 0 && sg !== sinal) contagem += 1;
    sinal = sg;
  }
  return contagem;
}

export function raioMinimo(pl) {
  let r = Infinity;
  for (const c of curvatura(pl)) if (c.raio < r) r = c.raio;
  return r;
}

/* Ponto em polígono, por cruzamentos. Usado para achar linha que escapou do
   contorno — o defeito que eu só pegava olhando. */
export function dentro(ponto, poligono) {
  let d = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i, i += 1) {
    const [xi, yi] = poligono[i]; const [xj, yj] = poligono[j];
    if ((yi > ponto[1]) !== (yj > ponto[1])
      && ponto[0] < ((xj - xi) * (ponto[1] - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}

/* Um anel fechado que cruza a si mesmo pode continuar "fechado" para uma
   checagem de pontas e ainda assim não representa uma silhueta utilizável.
   Interseções entre trechos vizinhos são normais (eles compartilham vértice),
   por isso só os pares não adjacentes entram nesta medida. */
export function autoIntersecoes(pl, { epsilon = 1e-9 } = {}) {
  if (pl.length < 4) return [];
  const pts = pl.slice();
  if (dist(pts[0], pts[pts.length - 1]) <= epsilon) pts.pop();
  if (pts.length < 3) return [];
  const cruz2 = (a, b, c) => cruz(sub(b, a), sub(c, a));
  const entre = (a, b, p) => p[0] >= Math.min(a[0], b[0]) - epsilon
    && p[0] <= Math.max(a[0], b[0]) + epsilon
    && p[1] >= Math.min(a[1], b[1]) - epsilon
    && p[1] <= Math.max(a[1], b[1]) + epsilon;
  const corta = (a, b, c, d) => {
    const abC = cruz2(a, b, c); const abD = cruz2(a, b, d);
    const cdA = cruz2(c, d, a); const cdB = cruz2(c, d, b);
    if (Math.abs(abC) <= epsilon && entre(a, b, c)) return true;
    if (Math.abs(abD) <= epsilon && entre(a, b, d)) return true;
    if (Math.abs(cdA) <= epsilon && entre(c, d, a)) return true;
    if (Math.abs(cdB) <= epsilon && entre(c, d, b)) return true;
    return ((abC > epsilon && abD < -epsilon) || (abC < -epsilon && abD > epsilon))
      && ((cdA > epsilon && cdB < -epsilon) || (cdA < -epsilon && cdB > epsilon));
  };
  const achadas = [];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length];
    for (let j = i + 1; j < pts.length; j += 1) {
      if (j === i + 1 || (i === 0 && j === pts.length - 1)) continue;
      const c = pts[j]; const d = pts[(j + 1) % pts.length];
      if (corta(a, b, c, d)) achadas.push({ a: i, b: j });
    }
  }
  return achadas;
}

export function anguloTangente(pl, ponto) {
  let melhor = 0; let melhorD = Infinity;
  for (let i = 0; i < pl.length; i += 1) {
    const d = dist(pl[i], ponto);
    if (d < melhorD) { melhorD = d; melhor = i; }
  }
  const a = pl[Math.max(0, melhor - 1)]; const b = pl[Math.min(pl.length - 1, melhor + 1)];
  return { grausDaHorizontal: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI, desvio: melhorD };
}
