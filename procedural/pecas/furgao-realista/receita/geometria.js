/* furgao-realista, receita/geometria.js — as contas que os outros assuntos usam: a conversão para metro, as curvas 2D em
 * milímetro (o contorno com raios, o comprimento acumulado, o ponto a uma distância, os trechos por altura e as alturas dos anéis de um
 * perfil) e os vetores 3D. Nada aqui conhece a TABELA.
 */

export const m = (mm) => mm / 1000;
export const grau = Math.PI / 180;
export const lerp = (a, b, t) => a + (b - a) * t;
export const suave = (t) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };

/* ---------- curvas 2D em milímetro ---------- */

/* A poligonal com o raio de cada canto ([u, v, raio?]) virada em polilinha densa: cada canto com raio vira arco tangente aos dois
   trechos, amostrado a cada grau. O canto sem raio fica vivo. */
export function contornoComRaios(pts) {
  const saida = [[pts[0][0], pts[0][1]]];
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [px, py, r = 0] = pts[i];
    const a = pts[i - 1]; const b = pts[i + 1];
    const d1 = [px - a[0], py - a[1]]; const l1 = Math.hypot(...d1);
    const d2 = [b[0] - px, b[1] - py]; const l2 = Math.hypot(...d2);
    const u1 = [d1[0] / l1, d1[1] / l1]; const u2 = [d2[0] / l2, d2[1] / l2];
    const giro = Math.atan2(u1[0] * u2[1] - u1[1] * u2[0], u1[0] * u2[0] + u1[1] * u2[1]);
    if (!r || Math.abs(giro) < 1e-9) { saida.push([px, py]); continue; }
    const t = r * Math.tan(Math.abs(giro) / 2);
    if (t > l1 / 2 + 1e-6 || t > l2 / 2 + 1e-6) throw new Error(`furgao-realista: o raio ${r} no canto [${px}, ${py}] não cabe entre os vizinhos`);
    const t1 = [px - u1[0] * t, py - u1[1] * t];
    const sinal = Math.sign(giro);
    const n = [-u1[1] * sinal, u1[0] * sinal];
    const c = [t1[0] + n[0] * r, t1[1] + n[1] * r];
    const a0 = Math.atan2(t1[1] - c[1], t1[0] - c[0]);
    const passos = Math.max(2, Math.ceil(Math.abs(giro) / grau));
    for (let k = 0; k <= passos; k += 1) {
      const ang = a0 + (giro * k) / passos;
      saida.push([c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang)]);
    }
  }
  saida.push([pts.at(-1)[0], pts.at(-1)[1]]);
  return saida;
}

/* O comprimento acumulado de uma polilinha. */
export function acumulado(pl) {
  const s = [0];
  for (let i = 1; i < pl.length; i += 1) s.push(s[i - 1] + Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]));
  return s;
}

/* O ponto da polilinha à distância `d` do começo. */
export function pontoNaDistancia(pl, s, d) {
  let i = 1;
  while (i < pl.length - 1 && s[i] < d) i += 1;
  const t = s[i] === s[i - 1] ? 0 : Math.min(1, Math.max(0, (d - s[i - 1]) / (s[i] - s[i - 1])));
  return [lerp(pl[i - 1][0], pl[i][0], t), lerp(pl[i - 1][1], pl[i][1], t)];
}

/* O u da polilinha na altura v, pelo primeiro trecho que a atravessa (a polilinha sobe em v). */
export function uNaAltura(pl, v) {
  for (let i = 1; i < pl.length; i += 1) {
    const [u0, v0] = pl[i - 1]; const [u1, v1] = pl[i];
    if ((v - v0) * (v - v1) <= 0 && v1 !== v0) return lerp(u0, u1, (v - v0) / (v1 - v0));
  }
  throw new Error(`furgao-realista: o perfil não chega à altura ${v}`);
}

/* O trecho da polilinha entre as alturas v0 e v1 (sobe em v), cortado nelas. */
export function trechoEntre(pl, v0, v1) {
  const saida = [[uNaAltura(pl, v0), v0]];
  for (const p of pl) if (p[1] > v0 + 1e-9 && p[1] < v1 - 1e-9) saida.push(p);
  return saida;
}

/* O trecho da polilinha a partir do primeiro ponto em que ela atinge a altura v (o resto, até o fim). */
export function aPartirDe(pl, v) {
  const s = acumulado(pl);
  for (let i = 1; i < pl.length; i += 1) {
    const [u0, v0] = pl[i - 1]; const [u1, v1] = pl[i];
    if ((v - v0) * (v - v1) <= 0 && v1 !== v0) {
      const p = [lerp(u0, u1, (v - v0) / (v1 - v0)), v];
      return { pl: [p, ...pl.slice(i)], s0: s[i - 1] + Math.hypot(p[0] - u0, p[1] - v0) };
    }
  }
  throw new Error(`furgao-realista: o perfil não chega à altura ${v}`);
}

/* As alturas em que o perfil pede anel: a cada `passo` de arco ou a cada `giroMax` graus de giro, o que vier antes. */
export function alturasDoPerfil(polilinha, passo, giroMax) {
  /* os trechos retos longos (o capô, o para-brisa) se dividem antes, para o passo de arco valer dentro deles */
  const pl = [polilinha[0]];
  for (let i = 1; i < polilinha.length; i += 1) {
    const [a, b] = [polilinha[i - 1], polilinha[i]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (passo / 8)));
    for (let k = 1; k <= n; k += 1) pl.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
  }
  const alturas = [pl[0][1]];
  let arco = 0; let giro = 0;
  for (let i = 1; i < pl.length; i += 1) {
    arco += Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]);
    if (i + 1 < pl.length) {
      const a = Math.atan2(pl[i][1] - pl[i - 1][1], pl[i][0] - pl[i - 1][0]);
      const b = Math.atan2(pl[i + 1][1] - pl[i][1], pl[i + 1][0] - pl[i][0]);
      let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      giro += Math.abs(d) / grau;
    }
    if (arco >= passo || giro >= giroMax) { alturas.push(pl[i][1]); arco = 0; giro = 0; }
  }
  return alturas;
}

/* Pontos igualmente espaçados entre a e b, sem as pontas, com passo de no máximo `passo`. */
export function entre(a, b, passo) {
  const n = Math.max(1, Math.ceil(Math.abs(b - a) / passo - 1e-9));
  return Array.from({ length: n - 1 }, (_, k) => lerp(a, b, (k + 1) / n));
}

/* ---------- vetores ---------- */

export const sub =(a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const esc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const unit = (a) => { const l = Math.hypot(...a); return l > 1e-12 ? esc(a, 1 / l) : a; };
