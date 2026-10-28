/* face-plana.js — a face continua plana depois de mover os cantos?
   A operação que move cantos compartilhados (arredondarAresta) altera faces que ela não declara: a vizinha da ponta da aresta
   ganha cantos novos, e só fica plana se o deslocamento cai no plano dela. Esta conta diz isso sobre as posições que a operação
   VAI escrever, para ela gritar antes de escrever. O critério é o de `poligonoPlano` (nucleo.js), o que o núcleo exige de uma
   face de entrada: o canto a mais de 1e-6 (vezes a maior distância ao centro, se passa de 1) do plano de Newell pelo centro. */

const TOLERANCIA_DE_FACE_PLANA = 1e-6;

/** null quando a face de `pontos` (em ordem) é plana; senão `{ canto, desvio, tolerancia }` com o pior canto (índice em `pontos`). */
export function desvioDeFacePlana(pontos) {
  const n = pontos.length;
  if (n < 4) return null;
  let nx = 0; let ny = 0; let nz = 0;
  for (let k = 0; k < n; k++) {
    const a = pontos[k]; const b = pontos[(k + 1) % n];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const comprimento = Math.hypot(nx, ny, nz);
  if (!(comprimento > 0)) return null;
  const normal = [nx / comprimento, ny / comprimento, nz / comprimento];
  const centro = [0, 1, 2].map((e) => pontos.reduce((soma, p) => soma + p[e], 0) / n);
  let escala = 0;
  for (const p of pontos) escala = Math.max(escala, Math.hypot(p[0] - centro[0], p[1] - centro[1], p[2] - centro[2]));
  const tolerancia = TOLERANCIA_DE_FACE_PLANA * Math.max(1, escala);
  let pior = null;
  pontos.forEach((p, canto) => {
    const desvio = Math.abs((p[0] - centro[0]) * normal[0] + (p[1] - centro[1]) * normal[1] + (p[2] - centro[2]) * normal[2]);
    if (desvio > tolerancia && (!pior || desvio > pior.desvio)) pior = { canto, desvio, tolerancia };
  });
  return pior;
}
