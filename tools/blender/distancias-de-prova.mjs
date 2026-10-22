/* distancias-de-prova.mjs — as medidas com que os testes das leituras do pacote conferem polilinhas lidas contra as exatas,
   em qualquer dimensão: os pontos a cada passo ao longo das polilinhas, a distância de cada ponto ao conjunto de segmentos, a
   fração a até uma tolerância e as estatísticas (média, p95 por interpolação linear, como o numpy, e máxima). */

/** Pontos a cada passo ao longo de cada polilinha { fechada, pontos }, com as pontas. */
export function pontosDe(polis, passo) {
  const out = [];
  for (const { fechada, pontos } of polis) {
    const P = fechada && pontos.length > 2 ? [...pontos, pontos[0]] : pontos;
    if (P.length === 1) out.push(P[0]);
    for (let i = 0; i + 1 < P.length; i++) {
      const a = P[i];
      const b = P[i + 1];
      const L = Math.hypot(...a.map((v, j) => b[j] - v));
      const k = Math.max(1, Math.ceil(L / passo));
      for (let t = 0; t < k; t++) out.push(a.map((v, j) => v + ((b[j] - v) * t) / k));
    }
    if (P.length > 1) out.push(P[P.length - 1]);
  }
  return out;
}

function segmentos(polis) {
  const S = [];
  for (const { fechada, pontos } of polis) {
    const P = fechada && pontos.length > 2 ? [...pontos, pontos[0]] : pontos;
    for (let i = 0; i + 1 < P.length; i++) S.push([P[i], P[i + 1]]);
    if (P.length === 1) S.push([P[0], P[0]]);
  }
  return S;
}

/** Distância de cada ponto às polilinhas, em laço simples sobre os segmentos (sem alocar por par). */
export function distancias(pontos, polis) {
  const S = segmentos(polis);
  const dim = pontos.length ? pontos[0].length : 0;
  const A = new Float64Array(S.length * dim);
  const D = new Float64Array(S.length * dim);
  const L2 = new Float64Array(S.length);
  S.forEach(([a, b], k) => {
    for (let j = 0; j < dim; j++) {
      A[k * dim + j] = a[j];
      D[k * dim + j] = b[j] - a[j];
      L2[k] += (b[j] - a[j]) ** 2;
    }
  });
  return pontos.map((p) => {
    let melhor = Infinity;
    for (let k = 0; k < S.length; k++) {
      let t = 0;
      if (L2[k] > 0) {
        for (let j = 0; j < dim; j++) t += (p[j] - A[k * dim + j]) * D[k * dim + j];
        t = Math.max(0, Math.min(1, t / L2[k]));
      }
      let d2 = 0;
      for (let j = 0; j < dim; j++) d2 += (p[j] - A[k * dim + j] - t * D[k * dim + j]) ** 2;
      if (d2 < melhor) melhor = d2;
    }
    return Math.sqrt(melhor);
  });
}

/** Fração dos pontos a até tol das polilinhas. */
export function distanciasA(pontos, polis, tol) {
  if (!pontos.length) return 0;
  return distancias(pontos, polis).filter((d) => d <= tol).length / pontos.length;
}

export function estatisticas(d) {
  const s = [...d].sort((a, b) => a - b);
  const q = (f) => { const x = f * (s.length - 1); const i = Math.floor(x); return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (x - i); };
  return { n: s.length, media: s.reduce((a, b) => a + b, 0) / s.length, p95: q(0.95), maxima: s[s.length - 1] };
}
