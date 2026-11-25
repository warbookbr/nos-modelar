/* geometria.js — a roda dentada de corrente de rolos pela forma de dente da ISO 606, em milímetro, com o eixo em y.

   O diâmetro primitivo é d = p / sen(180°/z). O vão de cada dente é a forma de vão mínimo da norma: o assento do rolo é um
   arco de raio ri = 0,505 d1 em volta do centro do rolo, que fica no círculo primitivo, abrindo o ângulo α = 140° − 90°/z
   para dentro; de cada ponta do assento sai o flanco, um arco de raio re = 0,12 d1 (z + 2) tangente ao assento, até passar
   do círculo da ponta. O diâmetro da ponta é o meio da faixa da norma, entre d + p (1 − 1,6/z) − d1 e d + 1,25 p − d1. A
   largura do dente é 0,93 b1 até 12,7 mm de passo e 0,95 b1 acima. As fórmulas são as da ISO 606 reproduzidas no guia
   aberto de dimensões de roda dentada da Planichapa e no catálogo DIN 8187 / ISO 606 da Top Machinery.

   A roda é a coroa torneada (o disco da ponta com o cubo de um lado e o furo), como o corpo da `engrenagem`, menos o vão
   de um dente repetido em volta do eixo por `arranja` radial. O vão fica no setor do dente dele: a tampa de fora segue o
   raio de cada flanco, porque com a tampa larga os vãos vizinhos se tocavam fora da ponta e a roda de 80 dentes custava
   38 s (medido em 2026-11-24). */

/* 13 pontos no assento: com 7, a corda do arco entrava 0,04 mm no rolo da corrente, mais que a folga de 0,005 d1 da norma */
export const PONTOS_DO_ASSENTO = 13;
export const PONTOS_DO_FLANCO = 5;
export const PONTOS_DO_VAO = PONTOS_DO_ASSENTO + 2 * PONTOS_DO_FLANCO + 3;
export const LADOS_DA_COROA = 128;

export function medidasDaRoda({ passo: p, diametroDoRolo: d1, larguraInterna: b1, dentes: z }) {
  const d = p / Math.sin(Math.PI / z);
  const ri = 0.505 * d1;
  const alfa = ((140 - 90 / z) * Math.PI) / 180;
  const re = 0.12 * d1 * (z + 2);
  const da = (d + p * (1 - 1.6 / z) - d1 + (d + 1.25 * p - d1)) / 2;
  const largura = (p <= 12.7 ? 0.93 : 0.95) * b1;
  return { d, ri, alfa, re, da, df: d - 2 * ri, largura };
}

/** O vão de um dente, centrado no eixo x: o assento, os flancos até passar do círculo da ponta e a tampa de fora, que
    segue o raio de cada flanco para o vão ficar no setor dele e não tocar o vizinho; recusa o dente que acaba em ponta. */
export function vaoDoDente(q) {
  const { d, ri, alfa, re, da } = medidasDaRoda(q);
  const R = d / 2; const ra = da / 2; const z = q.dentes; const p = q.passo;
  const fB = Math.PI - alfa / 2;
  const E = [R + ri * Math.cos(fB), ri * Math.sin(fB)];
  const C = [E[0] - re * Math.cos(fB), E[1] - re * Math.sin(fB)];
  const ponto = (a) => [C[0] + re * Math.cos(a), C[1] + re * Math.sin(a)];
  const ate = (alvo) => { let lo = fB; let hi = fB - Math.PI / 2; for (let i = 0; i < 80; i += 1) { const m = (lo + hi) / 2; if (Math.hypot(...ponto(m)) < alvo) lo = m; else hi = m; } return lo; };
  const naPonta = ponto(ate(ra));
  if (Math.atan2(naPonta[1], naPonta[0]) >= Math.PI / z - 1e-6) throw new Error(`roda dentada: com ${z} dentes o dente acaba em ponta antes do círculo da ponta; aceitos: 9 a 80 dentes`);
  const fim = ate(ra + 0.05 * p);
  const flanco = Array.from({ length: PONTOS_DO_FLANCO }, (_, k) => ponto(fB + ((fim - fB) * (k + 1)) / PONTOS_DO_FLANCO));
  const [xf, zf] = flanco[flanco.length - 1];
  const fora = ra + 0.3 * p; const ang = Math.atan2(zf, xf);
  const tampa = [fora * Math.cos(ang), fora * Math.sin(ang)];
  const assento = Array.from({ length: PONTOS_DO_ASSENTO }, (_, k) => { const f = Math.PI + alfa / 2 - (alfa * k) / (PONTOS_DO_ASSENTO - 1); return [R + ri * Math.cos(f), ri * Math.sin(f)]; });
  const baixo = (pts) => pts.map(([x, v]) => [x, -v]).reverse();
  return [...assento, ...flanco, tampa, [fora, 0], ...baixo([tampa]), ...baixo(flanco)];
}

export function geometriaDaRoda(q) {
  const m = medidasDaRoda(q);
  const L = m.largura; const rh = q.diametroDoCubo / 2; const Lh = q.comprimentoDoCubo; const rb = q.furo / 2;
  return {
    ...m,
    raioDaPonta: m.da / 2, vao: vaoDoDente(q), alturaDoVao: L + 2, emVao: [0, -1, 0],
    /* a coroa torneada: o furo, a face de baixo até a ponta, a largura do dente, o degrau até o cubo e o cubo */
    coroa: [[rb, 0], [m.da / 2, 0], [m.da / 2, L], [rh, L], [rh, L + Lh], [rb, L + Lh], [rb, 0]],
  };
}
