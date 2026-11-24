/* geometria.js — a corrente de rolos fechada em volta de duas rodas dentadas, em milímetro.

   A roda 1 fica no centro, a roda 2 em x = distância, as duas com o eixo em y, e a corrente no plano [x, z], centrada em
   y = 0. A corrente é um polígono fechado de N elos de um passo: os rolos ficam nos vértices; nos enrolamentos, os
   vértices caem no círculo primitivo de cada roda, um a cada 360°/z; nos dois trechos retos, a cada passo. Simétrica em
   z, a corrente fica definida por k1 elos no enrolamento da roda 1, k2 no da roda 2 e n em cada trecho reto: o trecho
   de cima vai do ângulo α = 180° − k1·180°/z1 da roda 1 ao ângulo β = k2·180°/z2 da roda 2, e a distância entre os centros
   é a que faz esse trecho ter n passos exatos. N = k1 + k2 + 2n é par, porque o elo interno (de rolos) e o externo (de
   pinos) se alternam.

   Cada vértice tem o rolo (um tubo de d1 por b1, em volta do pino) e o pino (d2, da face de fora de uma placa externa à
   outra). Cada elo par tem as duas placas internas, de b1/2 a b1/2 + espessura de cada lado, e cada elo ímpar as duas
   externas, por fora delas; a placa é o contorno de duas meias-voltas de raio h2/2 em volta dos dois pinos, com os furos
   do pino. Cada trecho é um rolo, um pino e quatro placas repetidos por `arranja` (linear no reto, radial no
   enrolamento), e por isso o trecho tem ao menos quatro elos. */

export const LADOS_DO_PINO = 24;
const PONTOS_DA_MEIA_VOLTA = 8;
export const PONTOS_DA_PLACA = 2 * PONTOS_DA_MEIA_VOLTA;
export const MINIMO_POR_TRECHO = 4;

const raioPrimitivo = (p, z) => p / (2 * Math.sin(Math.PI / z));

/** A disposição: k1, k2, n, a distância exata e os ângulos α e β, para a distância aproximada pedida. */
export function disposicaoDaCorrente({ passo: p, dentes1: z1, dentes2: z2, distancia: C0 }) {
  const R1 = raioPrimitivo(p, z1); const R2 = raioPrimitivo(p, z2);
  if (C0 <= R1 + R2 + p) throw new Error(`corrente: a distância ${C0} mm é curta para as rodas de ${z1} e ${z2} dentes; aceito: acima de ${(R1 + R2 + p).toFixed(1)} mm`);
  const psi = Math.asin((R2 - R1) / C0);
  /* a roda maior abraça 180° + 2ψ, e a menor 180° − 2ψ, com ψ o ângulo da tangente comum. Os elos abraçados (k1, k2) e
     os do trecho reto (n) saem de uma busca pequena em volta desses valores: entre as combinações de N par em que o
     primeiro rolo de cada trecho reto fica fora do círculo primitivo da roda de onde sai, fica a de distância mais perto da
     pedida */
  const g1 = (2 * Math.PI) / z1; const g2 = (2 * Math.PI) / z2;
  const abraco1 = (Math.PI - 2 * psi) / g1; const abraco2 = (Math.PI + 2 * psi) / g2;
  const montar = (k1, k2, n) => {
    const alfa = Math.PI - (k1 * Math.PI) / z1; const beta = (k2 * Math.PI) / z2;
    const dz = R2 * Math.sin(beta) - R1 * Math.sin(alfa);
    if ((n * p) ** 2 <= dz * dz) return null;
    const C = R1 * Math.cos(alfa) - R2 * Math.cos(beta) + Math.sqrt((n * p) ** 2 - dz * dz);
    const du = [(C + R2 * Math.cos(beta) - R1 * Math.cos(alfa)) / (n * p), dz / (n * p)];
    const fora1 = Math.hypot(R1 * Math.cos(alfa) + p * du[0], R1 * Math.sin(alfa) + p * du[1]) - R1;
    const fora2 = Math.hypot(C + R2 * Math.cos(beta) - p * du[0] - C, R2 * Math.sin(beta) - p * du[1]) - R2;
    if (Math.min(fora1, fora2) < 0) return null;
    return { R1, R2, k1, k2, n, elos: k1 + k2 + 2 * n, distancia: C, alfa, beta };
  };
  const n0 = Math.round(Math.sqrt(C0 * C0 - (R2 - R1) ** 2) / p);
  let melhor = null;
  for (let k1 = Math.floor(abraco1) - 2; k1 <= Math.floor(abraco1) + 1; k1 += 1) for (let k2 = Math.floor(abraco2) - 2; k2 <= Math.floor(abraco2) + 1; k2 += 1) for (let n = n0 - 1; n <= n0 + 1; n += 1) {
    if ((k1 + k2) % 2 || k1 < MINIMO_POR_TRECHO || k2 < MINIMO_POR_TRECHO || n < MINIMO_POR_TRECHO) continue;
    const d = montar(k1, k2, n);
    if (d && (!melhor || Math.abs(d.distancia - C0) < Math.abs(melhor.distancia - C0))) melhor = d;
  }
  if (!melhor) throw new Error(`corrente: nenhuma disposição de rodas de ${z1} e ${z2} dentes a cerca de ${C0} mm tem os trechos retos pela tangente, com ao menos ${MINIMO_POR_TRECHO} elos em cada trecho; aceito: uma distância maior`);
  return melhor;
}

function placa([ax, az], [bx, bz], h) {
  const ang = Math.atan2(bz - az, bx - ax); const r = h / 2;
  const meia = (cx, cz, de) => Array.from({ length: PONTOS_DA_MEIA_VOLTA }, (_, k) => { const a = de + (Math.PI * k) / (PONTOS_DA_MEIA_VOLTA - 1); return [cx + r * Math.cos(a), cz + r * Math.sin(a)]; });
  return [...meia(bx, bz, ang - Math.PI / 2), ...meia(ax, az, ang + Math.PI / 2)];
}

/** Os trechos da corrente: para cada um, o primeiro vértice, o número de elos, a repetição e a paridade do primeiro elo. */
export function geometriaDaCorrente(q) {
  const d = disposicaoDaCorrente(q);
  const p = q.passo; const { R1, R2, alfa, beta, distancia: C, k1, k2, n } = d;
  const noCirculo = (cx, R, a) => [cx + R * Math.cos(a), R * Math.sin(a)];
  const A1 = noCirculo(0, R1, alfa); const B1 = noCirculo(C, R2, beta); const B2 = noCirculo(C, R2, -beta); const A2 = noCirculo(0, R1, -alfa);
  const direcao = (P, Q) => { const L = Math.hypot(Q[0] - P[0], Q[1] - P[1]); return [(Q[0] - P[0]) / L, (Q[1] - P[1]) / L]; };
  const du = direcao(A1, B1); const dl = direcao(B2, A2);
  const trechos = [
    { tipo: 'reto', inicio: A1, elos: n, segundo: (P) => [P[0] + p * du[0], P[1] + p * du[1]], passo: [p * du[0], 0, p * du[1]] },
    { tipo: 'volta', inicio: B1, elos: k2, centro: [C, 0, 0], graus: 360 / q.dentes2, segundo: () => noCirculo(C, R2, beta - (2 * Math.PI) / q.dentes2) },
    { tipo: 'reto', inicio: B2, elos: n, segundo: (P) => [P[0] + p * dl[0], P[1] + p * dl[1]], passo: [p * dl[0], 0, p * dl[1]] },
    { tipo: 'volta', inicio: A2, elos: k1, centro: [0, 0, 0], graus: 360 / q.dentes1, segundo: () => noCirculo(0, R1, -alfa - (2 * Math.PI) / q.dentes1) },
  ];
  let indice = 0;
  const b1 = q.larguraInterna; const ti = q.espessuraInterna; const te = q.espessuraExterna;
  for (const t of trechos) {
    const P0 = t.inicio; const P1 = t.segundo(P0);
    const P2 = t.tipo === 'reto' ? t.segundo(P1) : (() => { const c = t.centro; const g = (-2 * t.graus * Math.PI) / 180; const [x, z] = [P0[0] - c[0], P0[1]]; return [c[0] + x * Math.cos(g) - z * Math.sin(g), x * Math.sin(g) + z * Math.cos(g)]; })();
    const internoPrimeiro = indice % 2 === 0;
    /* o primeiro elo de cada tipo: o do vértice 0 ao 1 e o do 1 ao 2 */
    const [interno, externo] = internoPrimeiro ? [[P0, P1], [P1, P2]] : [[P1, P2], [P0, P1]];
    t.placaInterna = placa(interno[0], interno[1], q.alturaDaPlaca); t.furosInternos = interno;
    t.placaExterna = placa(externo[0], externo[1], q.alturaDaPlaca); t.furosExternos = externo;
    t.internas = internoPrimeiro ? Math.ceil(t.elos / 2) : Math.floor(t.elos / 2);
    t.externas = t.elos - t.internas;
    indice += t.elos;
  }
  const yInterna = [b1 / 2, -b1 / 2 - ti]; const yExterna = [b1 / 2 + ti, -b1 / 2 - ti - te];
  return { ...d, trechos, yInterna, yExterna, comprimentoDoPino: b1 + 2 * ti + 2 * te };
}
