/** Cor chapada de tinta ou plástico com variação suave e ruído fraco (porte de `_liso` do Blender). */
import { srgbParaLinear } from './cor.js';
import { faixa } from './ruido.js';

export function pintarLiso(col, ctx, { cor }) {
  const { px } = ctx;
  const base = cor.map(srgbParaLinear);
  const grande = ctx.ruido(1, 1);
  const medio = ctx.ruido(7, 7);
  const fino = ctx.ruido(Math.min(200, Math.floor(px / 2)), Math.min(200, Math.floor(px / 2)), { detalhe: 1 });
  for (let p = 0; p < px * px; p += 1) {
    const m = faixa(grande[p], 0.965, 1.03, 0.3, 0.7) * faixa(medio[p], 0.985, 1.015, 0.3, 0.7) * faixa(fino[p], 0.985, 1.012, 0.3, 0.7);
    col[p * 3] = base[0] * m;
    col[p * 3 + 1] = base[1] * m;
    col[p * 3 + 2] = base[2] * m;
  }
  return null;
}
