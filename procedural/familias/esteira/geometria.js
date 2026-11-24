/* geometria.js — a esteira de sapatas em volta da roda motriz e da roda guia, com os roletes por baixo, em milímetro.

   A motriz fica no centro e a guia em x = distância, as duas do mesmo tamanho e com o eixo em y; a esteira fica no plano
   [x, z], centrada em y = 0. A disposição dos elos é a da corrente (`disposicaoDaCorrente`, com as duas rodas iguais):
   um polígono de N elos de um passo, com a bucha em cada vértice. Cada elo tem os dois trilhos (placas de meia-volta de
   raio igual à metade da altura do elo, uma de cada lado, por fora da largura interna), a bucha entre eles e a sapata
   por fora: a placa de 0,95 passo por largura da sapata, encostada no trilho, com a garra no meio.

   A motriz tem o dente da roda dentada da ISO 606 (decisão da pessoa em 2026-11-24), com a bucha no lugar do rolo e a
   largura do dente de 0,9 da largura interna. A ponta do dente fica 3 mm abaixo do lado de fora dos trilhos,
   para não chegar na sapata. A guia é um polígono de z lados, da largura dos dois trilhos, com as faces nas cordas dos
   elos, encostando no lado de dentro dos trilhos onde a esteira enrola. Os roletes são cilindros da largura dos trilhos,
   encostados no lado de dentro dos trilhos do trecho de baixo, espalhados entre as rodas. Regra da família, sem norma pública. */
import { disposicaoDaCorrente } from '../corrente/geometria.js';
import { vaoDoDente, medidasDaRoda } from '../roda-dentada/geometria.js';

export const LADOS_DA_BUCHA = 24;
const PONTOS_DA_MEIA_VOLTA = 8;
export const PONTOS_DO_ELO = 2 * PONTOS_DA_MEIA_VOLTA;
export const PONTOS_DA_SAPATA = 8;

function elo([ax, az], [bx, bz], h) {
  const ang = Math.atan2(bz - az, bx - ax); const r = h / 2;
  const meia = (cx, cz, de) => Array.from({ length: PONTOS_DA_MEIA_VOLTA }, (_, k) => { const a = de + (Math.PI * k) / (PONTOS_DA_MEIA_VOLTA - 1); return [cx + r * Math.cos(a), cz + r * Math.sin(a)]; });
  return [...meia(bx, bz, ang - Math.PI / 2), ...meia(ax, az, ang + Math.PI / 2)];
}

/* a sapata do elo de A a B, com a garra, pelo lado de fora (o lado esquerdo do sentido A → B, que gira no sentido horário) */
function sapata([ax, az], [bx, bz], q) {
  const L = Math.hypot(bx - ax, bz - az); const t = [(bx - ax) / L, (bz - az) / L]; const n = [-t[1], t[0]];
  const meio = [(ax + bx) / 2, (az + bz) / 2];
  const base = q.alturaDoElo / 2; const e = q.espessuraDaSapata; const g = q.alturaDaGarra; const c = 0.475 * q.passo; const w = 0.06 * q.passo;
  const pt = (s, h) => [meio[0] + s * t[0] + h * n[0], meio[1] + s * t[1] + h * n[1]];
  return [pt(-c, base), pt(c, base), pt(c, base + e), pt(w, base + e), pt(w / 2, base + e + g), pt(-w / 2, base + e + g), pt(-w, base + e), pt(-c, base + e)];
}

export function geometriaDaEsteira(q) {
  const z = q.dentes; const p = q.passo;
  const d = disposicaoDaCorrente({ passo: p, dentes1: z, dentes2: z, distancia: q.distancia });
  const { R1: R, alfa, beta, distancia: C, k1, k2, n } = d;
  const noCirculo = (cx, a) => [cx + R * Math.cos(a), R * Math.sin(a)];
  const A1 = noCirculo(0, alfa); const B1 = noCirculo(C, beta); const B2 = noCirculo(C, -beta); const A2 = noCirculo(0, -alfa);
  const dir = (P, Q) => { const L = Math.hypot(Q[0] - P[0], Q[1] - P[1]); return [(Q[0] - P[0]) / L, (Q[1] - P[1]) / L]; };
  const du = dir(A1, B1); const dl = dir(B2, A2); const g = (2 * Math.PI) / z;
  const gira = ([x, v], [cx], a) => [cx + (x - cx) * Math.cos(a) - v * Math.sin(a), (x - cx) * Math.sin(a) + v * Math.cos(a)];
  const trechos = [
    { tipo: 'reto', inicio: A1, elos: n, proximo: [A1[0] + p * du[0], A1[1] + p * du[1]], passo: [p * du[0], 0, p * du[1]] },
    { tipo: 'volta', inicio: B1, elos: k2, centro: [C, 0, 0], proximo: gira(B1, [C], -g), graus: 360 / z },
    { tipo: 'reto', inicio: B2, elos: n, proximo: [B2[0] + p * dl[0], B2[1] + p * dl[1]], passo: [p * dl[0], 0, p * dl[1]] },
    { tipo: 'volta', inicio: A2, elos: k1, centro: [0, 0, 0], proximo: gira(A2, [0], -g), graus: 360 / z },
  ].map((t) => ({ ...t, elo: elo(t.inicio, t.proximo, q.alturaDoElo), sapata: sapata(t.inicio, t.proximo, q) }));
  const bf = 0.9 * q.larguraInterna;
  const roda = { passo: p, diametroDoRolo: q.diametroDaBucha, larguraInterna: q.larguraInterna, dentes: z };
  const vao = vaoDoDente(roda); const { da } = medidasDaRoda(roda);
  /* a guia: o polígono de z lados com os vértices nos ângulos dos vértices da esteira e as faces a h/2 para dentro das cordas */
  const raioDaGuia = R - q.alturaDoElo / 2 / Math.cos(Math.PI / z);
  /* os roletes: encostados no lado de dentro dos trilhos do trecho de baixo, ao longo dele (que pode sair um pouco
     inclinado quando o número de dentes é ímpar), do primeiro, que fica fora da ponta dos dentes da motriz e da guia, ao
     último, a passos iguais */
  const raioDoRolete = 0.35 * q.alturaDoElo + 0.12 * R;
  const dentro = [dl[1], -dl[0]];
  const desvio = q.alturaDoElo / 2 + raioDoRolete;
  const naLinha = (s) => [B2[0] + s * dl[0] + desvio * dentro[0], B2[1] + s * dl[1] + desvio * dentro[1]];
  const longe = (s) => Math.min(Math.hypot(...naLinha(s)), Math.hypot(naLinha(s)[0] - C, naLinha(s)[1]));
  const Ls = n * p; let s0 = 0;
  while (longe(s0) < da / 2 + raioDoRolete + 0.1 * p && s0 < Ls / 2) s0 += 1;
  const passoDosRoletes = q.roletes > 1 ? (Ls - 2 * s0) / (q.roletes - 1) : 0;
  if (passoDosRoletes < 2 * raioDoRolete + 0.1 * p) throw new Error(`esteira: ${q.roletes} roletes não cabem entre as rodas a ${C.toFixed(0)} mm; aceito: até ${Math.floor((Ls - 2 * s0) / (2 * raioDoRolete + 0.1 * p)) + 1} roletes`);
  const centroDoRolete = naLinha(s0);
  const yTrilho = [q.larguraInterna / 2, -q.larguraInterna / 2 - q.espessuraDoElo];
  return {
    /* a ponta do dente da motriz fica 3 mm abaixo do lado de fora dos trilhos no meio da corda do elo, para não chegar na sapata */
    raioDaCoroa: Math.min(da / 2, R * Math.cos(Math.PI / z) + q.alturaDoElo / 2 - 3),
    ...d, trechos, yTrilho, larguraDoDente: bf, vao, raioDaPonta: da / 2, raioDaGuia, giroDaGuia: (-beta * 180) / Math.PI, giroDaMotriz: (-alfa * 180) / Math.PI,
    raioDoRolete, centroDoRolete: [centroDoRolete[0], 0, centroDoRolete[1]], passoDosRoletes: [passoDosRoletes * dl[0], 0, passoDosRoletes * dl[1]], larguraDaRoda: q.larguraInterna + 2 * q.espessuraDoElo,
  };
}
