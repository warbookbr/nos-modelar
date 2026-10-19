/**
 * Madeira (porte de `_madeira` do Blender para um tile contínuo).
 *
 * O eixo x da imagem corre ao longo do veio e o y atravessa as tábuas. Cada tábua tem o próprio centro
 * de tronco (sorteado), espaçamento de anel e tom. Os anéis são distâncias a esse centro, tortas por um
 * ruído lento; o centro e a profundidade variam ao longo do veio por senoides de período igual ao tile,
 * para que o tile continue sem emenda ao ser repetido.
 */
import { srgbParaLinear } from './cor.js';
import { faixa, sorteio } from './ruido.js';

const ESPACAMENTO = 0.0055; // m entre anéis, como no Blender

function rampaAneis(t, base, veio) {
  // paradas da rampa do Blender: posição -> fator da cor base, interpolação linear
  const paradas = [
    [0, 1.06],
    [0.55, 1],
    [0.8, Math.max(0.05, 1 - 0.2 * veio)],
    [0.88, Math.max(0.05, 1 - 0.3 * veio)],
    [1, 1.04],
  ];
  let f = paradas[paradas.length - 1][1];
  for (let s = 0; s < paradas.length - 1; s += 1) {
    const [p0, f0] = paradas[s];
    const [p1, f1] = paradas[s + 1];
    if (t <= p1) {
      f = f0 + ((f1 - f0) * (t - p0)) / (p1 - p0);
      break;
    }
  }
  return base * f;
}

/**
 * Preenche `col` (linear RGB, px*px*3) com a madeira e devolve `juntas` (proximidade das juntas, ou null).
 */
export function pintarMadeira(col, ctx, { cor, veio, borda, tabuas, semente, metros }) {
  const { px } = ctx;
  const L = metros;
  const lado = 1;
  const nT = Math.max(0, Math.floor(tabuas));
  const nPlank = Math.max(1, nT);
  const w = L / nPlank;
  const base = cor.map((c) => srgbParaLinear(c) * 1.05);

  const rnd = [];
  for (let t = 0; t < nPlank; t += 1) {
    const r = [];
    for (let c = 0; c < 6; c += 1) r.push(sorteio(semente, t, c));
    rnd.push(r);
  }

  const torto = ctx.ruido(2, 3, { detalhe: 3 });
  const fibras = ctx.ruido(2, 70, { detalhe: 2 });
  const manchas = ctx.ruido(2, 2, { detalhe: 2 });

  const juntas = nT > 0 ? new Float32Array(px * px) : null;
  const bw = Math.max(0.003, Math.min(0.03, 0.35 * w));
  const larguraJunta = borda > 0 ? 0.045 : 0.015;

  for (let j = 0; j < px; j += 1) {
    const v = ((j + 0.5) / px) * L;
    const idx = Math.min(nPlank - 1, Math.floor(v / w));
    const r = rnd[idx];
    const baseA = nT > 0 ? (idx + 0.5) * w : L / 2;
    const larguraTronco = nT > 0 ? w : Math.min(0.6, L);
    const fase1 = r[1] * Math.PI * 2;
    const fase3 = r[3] * Math.PI * 2;
    const ca = baseA + (r[0] - 0.5) * larguraTronco * 1.6;
    const profundidade = (r[2] * 0.22 + 0.02) * lado;
    const sp = r[4] * ESPACAMENTO * 0.6 + ESPACAMENTO * 0.7;
    const tomTabua = faixa(r[5], 0.88, 1.08);
    // posição dentro da tábua em unidades de tábua, para junta e borda
    const x01 = (v / L) * nPlank;
    const frac = x01 - Math.floor(x01);
    const fr = frac < 0.5 ? frac : 1 - frac; // pingpong(.., 0.5): 0 na junta, 0,5 no meio
    const distBorda = fr * w;

    for (let i = 0; i < px; i += 1) {
      const u = ((i + 0.5) / px) * L;
      const p = j * px + i;
      const ang = (u / L) * Math.PI * 2;
      let da = v - (ca + Math.sin(ang + fase1) * (r[1] - 0.5) * 0.04);
      if (nT === 0) da = da - L * Math.round(da / L); // peça única: o tronco se repete a cada tile
      const db = profundidade + Math.sin(ang + fase3) * (r[3] - 0.5) * 0.05;
      let dist = Math.hypot(da, db);
      dist += (torto[p] - 0.5) * 0.012;
      const t = (((dist / sp) % 1) + 1) % 1;
      const rr = rampaAneis(t, 1, veio);
      let cr = base[0] * rr;
      let cg = base[1] * rr;
      let cb = base[2] * rr;
      // poros e fibras
      const fib = faixa(fibras[p], 1 - 0.1 * veio, 1 + 0.07 * veio, 0.3, 0.7);
      let m = fib * tomTabua;
      if (borda > 0 && nT > 0) m *= faixa(distBorda, 1 + 0.4 * borda, 1 - 0.2 * borda, 0, bw, true);
      if (nT > 0) {
        m *= faixa(fr, borda ? 0.22 : 0.4, 1, 0, larguraJunta);
        juntas[p] = faixa(fr, 1, 0, 0, 0.04, true);
      }
      m *= faixa(manchas[p], 0.92, 1.06, 0.3, 0.7);
      cr *= m;
      cg *= m;
      cb *= m;
      col[p * 3] = cr;
      col[p * 3 + 1] = cg;
      col[p * 3 + 2] = cb;
    }
  }
  return juntas;
}
