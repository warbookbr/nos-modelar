/**
 * Camada de uso por cima da cor base (porte de `_aplicar_desgaste` do Blender, em linear):
 * tinta amarelada, encardido, escorridos, ferrugem e tinta lascada.
 *
 * Num tile não há quina nem chão. A quina vira a proximidade das juntas entre tábuas (quando há) mais
 * cristas de ruído espalhadas, e o "embaixo" do Blender não existe: a sujeira de baixo fica no ruído de
 * manchas. Os escorridos correm ao longo do veio (eixo x da imagem).
 */
import { faixa, limitar } from './ruido.js';

function misturaTom(col, i, f, tom) {
  col[i] += col[i] * (tom[0] - 1) * f;
  col[i + 1] += col[i + 1] * (tom[1] - 1) * f;
  col[i + 2] += col[i + 2] * (tom[2] - 1) * f;
}

function misturaCor(col, i, f, alvo) {
  col[i] += (alvo[0] - col[i]) * f;
  col[i + 1] += (alvo[1] - col[i + 1]) * f;
  col[i + 2] += (alvo[2] - col[i + 2]) * f;
}

const lin = (c) => {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};
const TOM_FERRUGEM = [
  [lin(52), lin(30), lin(20)],
  [lin(104), lin(54), lin(30)],
  [lin(150), lin(86), lin(48)],
];

function rampaFerrugem(t) {
  const [a, b, c] = TOM_FERRUGEM;
  const [p, q] = t < 0.5 ? [a, b] : [b, c];
  const s = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  return [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s, p[2] + (q[2] - p[2]) * s];
}

/**
 * @param col Float32Array linear RGB (px*px*3), alterado no lugar
 * @param ctx { px, ruido(nu, nv, opcoes), juntas: Float32Array | null }
 */
export function aplicarDesgaste(col, ctx, nivel, ferrugem = 0) {
  const k = limitar(nivel);
  const fe = limitar(ferrugem);
  const { px, juntas } = ctx;
  const n = px * px;
  const tomN = ctx.ruido(1.5, 1.5);
  const escorreN = ctx.ruido(2, 15, { detalhe: 3 });
  const manchaN = ctx.ruido(3, 3, { detalhe: 5, rugosidade: 0.6 });
  const grandeN = ctx.ruido(2, 2, { detalhe: 6, rugosidade: 0.7 });
  const pontosN = ctx.ruido(15, 15, { detalhe: 4, rugosidade: 0.7 });
  const riscoN = ctx.ruido(2, 45, { detalhe: 3 });
  const rasgoN = ctx.ruido(35, 35, { detalhe: 5, rugosidade: 0.75 });
  const tonsN = ctx.ruido(60, 60, { detalhe: 6, rugosidade: 0.75 });
  const cristaN = ctx.ruido(3, 3, { detalhe: 3 });
  const limiar = 1 - 0.45 * k - 0.22 * fe;

  for (let p = 0; p < n; p += 1) {
    const i = p * 3;
    const fresta = juntas ? juntas[p] : 0;
    const quina = Math.max(fresta, 0.85 * faixa(cristaN[p], 0, 1, 0.55, 0.8));
    // tinta envelhecida: amarelada e desigual
    const tom = faixa(tomN[p], 0.5, 1, 0.3, 0.7);
    misturaTom(col, i, tom * 0.7 * k, [0.97, 0.91, 0.76]);
    // encardido
    const escorre = faixa(escorreN[p], 0, 1, 0.48, 0.72);
    const mancha = faixa(manchaN[p], 0, 1, 0.45, 0.72);
    let sujo = Math.max(fresta, escorre * 0.45);
    sujo = Math.max(sujo, mancha * 0.35);
    misturaTom(col, i, Math.min(sujo * 0.8 * k, 0.9), [0.58, 0.5, 0.4]);
    // campo de ferrugem
    const grande = faixa(grandeN[p], 0, 1, 0.4, 0.75);
    const pontos = faixa(pontosN[p], 0, 1, 0.66, 0.86);
    const pressao = Math.max(quina, fresta * (0.6 + 0.3 * fe));
    const f = grande * 0.55 + pressao * 0.5 + pontos * 0.25;
    const ferr = faixa(f, 0, 1, limiar, limiar + 0.06, true);
    const aureola = faixa(f, 0, 1, limiar - 0.14, limiar, true);
    const risco = faixa(riscoN[p], 0, 1, 0.55, 0.75);
    const escorrido = risco * faixa(f, 0, 1, limiar - 0.3, limiar - 0.05);
    // tinta lascada: nas quinas e em pontinhos, borda irregular
    const rasgo = faixa(rasgoN[p], 0, 1, 0.4, 0.6);
    const lasca = quina * rasgo + pontos * 0.3 > 1 - 0.5 * k ? 1 : 0;
    const tons = rampaFerrugem(tonsN[p]);
    misturaTom(col, i, Math.max(aureola, escorrido) * 0.65 * k, [0.7, 0.56, 0.42]);
    misturaCor(col, i, lasca * 0.9, [tons[0] * 0.55, tons[1] * 0.55, tons[2] * 0.55]);
    misturaCor(col, i, ferr * 0.95, tons);
  }
}
