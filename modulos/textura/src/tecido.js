/**
 * Tecido (porte de `_tecido` do Blender para um tile contínuo): trama simples de dois fios que se cruzam
 * alternados (xadrez de fios por cima e por baixo), cada fio com tom próprio, ondulação leve, penugem fina,
 * fibras soltas ao longo do eixo x e variação de tom em escala média e grande.
 *
 * O fio do Blender tem 1,8 mm (278 por tile de 0,5 m), que num tile de 512 px ocuparia menos de 2 px. Aqui o
 * tile leva `fiosPorTile(px)` fios por lado (par, cerca de px/5, no máximo 278), de modo que o fio fica mais
 * grosso que o real quando px é baixo. O número é par para o xadrez fechar na emenda.
 */
import { srgbParaLinear } from './cor.js';
import { faixa, sorteio } from './ruido.js';

export function fiosPorTile(px) {
  return Math.max(8, Math.min(278, 2 * Math.round(px / 10)));
}

const mod = (a, n) => ((a % n) + n) % n;

export function pintarTecido(col, ctx, { cor, semente }) {
  const { px } = ctx;
  const N = fiosPorTile(px);
  const base = cor.map(srgbParaLinear);
  const ciclos = Math.max(1, Math.round(N / 12));
  const fino = Math.max(2, Math.floor(px / 5));
  const ondU = ctx.ruido(ciclos, ciclos, { detalhe: 1 });
  const ondV = ctx.ruido(ciclos, ciclos, { detalhe: 1 });
  const pen = ctx.ruido(fino, fino, { detalhe: 1, rugosidade: 0.6 });
  const fibr = ctx.ruido(20, fino, { detalhe: 1 });
  const mid = ctx.ruido(13, 13, { detalhe: 2 });
  const big = ctx.ruido(1, 1, { detalhe: 2 });

  const tomA = new Float32Array(N);
  const tomB = new Float32Array(N);
  for (let k = 0; k < N; k += 1) {
    tomA[k] = faixa(sorteio(semente, k, 100), 0.9, 1.1);
    tomB[k] = faixa(sorteio(semente, k, 101), 0.9, 1.1);
  }

  for (let j = 0; j < px; j += 1) {
    for (let i = 0; i < px; i += 1) {
      const p = j * px + i;
      const uu = ((i + 0.5) / px) * N + (ondU[p] - 0.5) * 0.9;
      const vv = ((j + 0.5) / px) * N + (ondV[p] - 0.5) * 0.9;
      const iu = Math.floor(uu);
      const iv = Math.floor(vv);
      const par = mod(iu + iv, 2);
      const su = Math.sin((uu - iu) * Math.PI);
      const sv = Math.sin((vv - iv) * Math.PI);
      const pf = su ** 0.7 * (sv * 0.3 + 0.7);
      const pt = sv ** 0.7 * (su * 0.3 + 0.7);
      const tom = par ? tomA[mod(iu, N)] : tomB[mod(iv, N)];
      let m = faixa(par ? pf : pt, 0.62, 1.34) * tom;
      m *= faixa(pen[p], 0.92, 1.07, 0.3, 0.7) * faixa(fibr[p], 0.96, 1.03, 0.3, 0.7);
      m *= faixa(mid[p], 0.97, 1.03, 0.3, 0.7) * faixa(big[p], 0.94, 1.05, 0.3, 0.7);
      for (let c = 0; c < 3; c += 1) col[p * 3 + c] = base[c] * m;
    }
  }
}
