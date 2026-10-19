/**
 * Metal (porte de `_metal` do Blender para um tile contínuo).
 *
 * Pintado (padrão): casca de laranja sutil, riscos fracos ao longo do eixo x, variação larga de tom,
 * escorridos de sujeira em manchas e lascas minúsculas. Escovado (cinza médio, ou `acabamento: 'escovado'`):
 * fios finíssimos esticados no eixo x (a direção do veio), faixas mais largas e manchas suaves.
 *
 * As frequências do Blender (até 1100 ciclos por metro) passam de um pixel num tile de 0,5 m a 512 px; aqui
 * valem no máximo cerca de 1/5 do lado em ciclos, com a mesma proporção entre os eixos. Sem chão no tile, a
 * sujeira de baixo vira manchas de ruído lento.
 */
import { srgbParaLinear } from './cor.js';
import { faixa, sorteio } from './ruido.js';

/** Cinza médio do Blender: canais a até 22 níveis entre si e média até 205. */
export function ehCinzaMedio(cor) {
  const max = Math.max(...cor);
  const min = Math.min(...cor);
  return max - min <= 22 && (cor[0] + cor[1] + cor[2]) / 3 <= 205;
}

// Máscara das lascas: células de uma grade periódica, ~2 a 4% sorteadas, cada uma um ponto irregular.
function mascaraDeLascas(px, semente, irreg) {
  const mascara = new Float32Array(px * px);
  const g = Math.max(4, Math.min(35, Math.floor(px / 6)));
  const cel = px / g;
  const alcance = Math.ceil(0.16 * cel) + 1;
  for (let cy = 0; cy < g; cy += 1) {
    for (let cx = 0; cx < g; cx += 1) {
      const id = cy * g + cx;
      const sel = faixa(sorteio(semente, id, 40), 0, 1, 0.955, 0.975);
      if (sel <= 0) continue;
      const px0 = (cx + sorteio(semente, id, 41)) * cel;
      const py0 = (cy + sorteio(semente, id, 42)) * cel;
      for (let dy = -alcance; dy <= alcance; dy += 1) {
        for (let dx = -alcance; dx <= alcance; dx += 1) {
          const x = Math.round(px0) + dx;
          const y = Math.round(py0) + dy;
          const d = Math.hypot(x + 0.5 - px0, y + 0.5 - py0) / cel;
          const centro = faixa(d, 1, 0, 0, 0.16, true);
          if (centro <= 0) continue;
          const p = (((y % px) + px) % px) * px + (((x % px) + px) % px);
          mascara[p] = Math.max(mascara[p], centro * faixa(irreg[p], 0, 1, 0.4, 0.55));
        }
      }
    }
  }
  return mascara;
}

export function pintarMetal(col, ctx, { cor, escovado, semente }) {
  const { px } = ctx;
  const base = cor.map(srgbParaLinear);
  const n = px * px;
  const f = (frac) => Math.max(2, Math.floor(px * frac));

  if (escovado) {
    const fios = ctx.ruido(2, f(0.2), { detalhe: 1, rugosidade: 0.7 });
    const faixas = ctx.ruido(2, f(0.078), { detalhe: 2 });
    const mancha = ctx.ruido(2, 2, { detalhe: 2 });
    for (let p = 0; p < n; p += 1) {
      const m = faixa(fios[p], 0.9, 1.1, 0.1, 0.9) * faixa(faixas[p], 0.955, 1.045, 0.1, 0.9) * faixa(mancha[p], 0.94, 1.05, 0.15, 0.85);
      for (let c = 0; c < 3; c += 1) col[p * 3 + c] = base[c] * m;
    }
    return;
  }

  const casca = ctx.ruido(f(0.12), f(0.12), { detalhe: 1 });
  const risco = ctx.ruido(4, f(0.2), { detalhe: 1 });
  const grande = ctx.ruido(1, 1, { detalhe: 2 });
  const po = ctx.ruido(f(0.2), f(0.2), { detalhe: 1 });
  const escorre = ctx.ruido(2, f(0.035), { detalhe: 2 });
  const zona = ctx.ruido(1, 1, { detalhe: 3 });
  const sujo = ctx.ruido(3, 3, { detalhe: 3 });
  const irreg = ctx.ruido(f(0.2), f(0.2), { detalhe: 1 });
  const lascas = mascaraDeLascas(px, semente, irreg);
  const tomSujo = [0.84, 0.8, 0.72];
  for (let p = 0; p < n; p += 1) {
    let m = faixa(casca[p], 0.982, 1.014, 0.15, 0.85) * faixa(risco[p], 0.985, 1.008, 0.15, 0.85);
    m *= faixa(grande[p], 0.975, 1.02, 0.15, 0.85) * faixa(po[p], 0.985, 1.008, 0.15, 0.85);
    const g = faixa(zona[p], 0, 1, 0.45, 0.75) * faixa(escorre[p], 0.35, 1, 0.1, 0.9) * faixa(sujo[p], 0.55, 1, 0.15, 0.85);
    const lasca = lascas[p] * 0.8;
    for (let c = 0; c < 3; c += 1) {
      let v = base[c] * m;
      v += (v * tomSujo[c] - v) * g * 0.55;
      v += (v * 0.5 - v) * lasca;
      col[p * 3 + c] = v;
    }
  }
}
