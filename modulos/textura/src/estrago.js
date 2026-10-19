/**
 * Estrago por cima do material (porte de `_aplicar_estrago` do Blender, sem `podre`, que é da madeira):
 * manchas irregulares com auréola amarelada de umidade e rasgos finos com enchimento claro, nos dois eixos.
 */
import { srgbParaLinear } from './cor.js';
import { faixa } from './ruido.js';

function misturaTom(col, i, f, tom) {
  for (let c = 0; c < 3; c += 1) col[i + c] += col[i + c] * (tom[c] - 1) * f;
}

function misturaCor(col, i, f, alvo) {
  for (let c = 0; c < 3; c += 1) col[i + c] += (alvo[c] - col[i + c]) * f;
}

export function aplicarEstrago(col, ctx, { manchas = 0, rasgos = 0 }) {
  const { px } = ctx;
  const n = px * px;
  if (manchas > 0) {
    const v = ctx.ruido(2, 2, { detalhe: 5, rugosidade: 0.68 });
    const lim = 0.64 - 0.1 * manchas;
    for (let p = 0; p < n; p += 1) {
      const nucleo = faixa(v[p], 0, 1, lim, lim + 0.05, true);
      const aureola = faixa(v[p], 0, 1, lim - 0.07, lim, true);
      misturaTom(col, p * 3, aureola * 0.7, [0.84, 0.74, 0.56]);
      misturaTom(col, p * 3, nucleo * 0.85, [0.46, 0.36, 0.25]);
    }
  }
  if (rasgos > 0) {
    const zona = ctx.ruido(1, 1, { detalhe: 2 });
    const mais = Math.max(2, Math.floor(px / 18));
    const fendas = [ctx.ruido(1, mais, { detalhe: 1 }), ctx.ruido(mais, 1, { detalhe: 1 })];
    const enchimento = [srgbParaLinear(205) * 0.9, srgbParaLinear(195) * 0.9, srgbParaLinear(160) * 0.9];
    const fundo = [srgbParaLinear(20), srgbParaLinear(14), srgbParaLinear(18)];
    for (const fenda of fendas) {
      for (let p = 0; p < n; p += 1) {
        const z = faixa(zona[p], 0, 1, 0.6 - 0.06 * rasgos, 0.66 - 0.06 * rasgos, true);
        if (z <= 0) continue;
        const d = Math.abs(fenda[p] - 0.5);
        misturaCor(col, p * 3, faixa(d, 1, 0, 0, 0.03 + 0.008 * rasgos) * z * 0.9, enchimento);
        misturaCor(col, p * 3, faixa(d, 1, 0, 0, 0.01 + 0.004 * rasgos) * z * 0.95, fundo);
      }
    }
  }
}
