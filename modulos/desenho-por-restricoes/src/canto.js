/* canto.js — onde fica o centro do arco que arredonda um canto.

   O canto tem o vértice P e os vizinhos A (anterior) e B (próximo). O arco de raio r é tangente às duas arestas, e o centro fica na
   bissetriz do ângulo entre elas, a r / sen(θ/2) do vértice, dentro do ângulo que as duas arestas abrem a partir de P (para um canto
   reentrante do polígono, é o ângulo de fora). É a mesma conta de `arredondarCantos` (geometria.js), que traça o arco depois de
   resolver; aqui ela dá o chute do centro com nome e a conferência do que o resolvedor devolveu. Puro. */

const unitario = (de, para) => {
  const L = Math.hypot(para[0] - de[0], para[1] - de[1]);
  return L > 0 ? [(para[0] - de[0]) / L, (para[1] - de[1]) / L] : null;
};

/* O centro do arco de raio r no canto P entre A e B, ou null quando o canto é reto de 180 graus, fechado em 0 grau ou tem um
   vizinho no mesmo lugar (não há arco tangente às duas arestas). */
export function centroDoCanto(A, P, B, r) {
  const u = unitario(P, A); const w = unitario(P, B);
  if (!u || !w) return null;
  const theta = Math.acos(Math.max(-1, Math.min(1, u[0] * w[0] + u[1] * w[1])));
  if (theta < 1e-6 || theta > Math.PI - 1e-6) return null;
  const bh = u[0] + w[0]; const bv = u[1] + w[1];
  const L = Math.hypot(bh, bv);
  const dc = r / Math.sin(theta / 2);
  return [P[0] + (bh / L) * dc, P[1] + (bv / L) * dc];
}
