/* massa.js — a massa, o centro de massa e o tensor de inércia de um sólido de densidade uniforme, pela malha triangulada dele.

   Cada triângulo (a, b, c) com a origem forma um tetraedro de volume com sinal a·(b×c)/6; somados, os volumes com sinal dão o
   volume da malha fechada, e as integrais de segunda ordem dão o tensor. Para o tetraedro (0, a, b, c) de volume v,
   ∫ x_i x_j dV = v/20 · (Σ_p p_i p_j + S_i S_j), com S = a + b + c. Malha com as faces para dentro dá volume negativo, e o sinal
   inteiro é invertido. Cascas que se sobrepõem contam a sobreposição duas vezes, e um buraco aberto conta como fechado pela origem:
   o resultado é estimativa, e quem chama a declara assim.

   O tensor segue a convenção da ficha da ponte: ixx = ∫ (y² + z²) ρ dV, e ixy = −∫ x y ρ dV, no centro de massa. Unidades de quem
   chama: pontos em mm e densidade em g/mm³ dão g e g·mm². */

/** `{ massa, volume, centro: [x, y, z], tensor: 3×3 }` dos triângulos `[[a, b, c], ...]` com a densidade dada. */
export function propriedadesDeMassa(triangulos, densidade) {
  let V = 0;
  const m1 = [0, 0, 0];
  const m2 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const [a, b, c] of triangulos) {
    const v = (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    if (!v) continue;
    V += v;
    const S = [a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]];
    for (let i = 0; i < 3; i += 1) {
      m1[i] += (v * S[i]) / 4;
      for (let j = i; j < 3; j += 1) m2[i][j] += (v / 20) * (a[i] * a[j] + b[i] * b[j] + c[i] * c[j] + S[i] * S[j]);
    }
  }
  if (Math.abs(V) < 1e-12) return null;
  const sinal = Math.sign(V);
  const volume = Math.abs(V);
  const centro = m1.map((x) => (sinal * x) / volume);
  /* os segundos momentos no centro: ∫ x_i x_j − V c_i c_j */
  const M = [0, 1, 2].map((i) => [0, 1, 2].map((j) => sinal * (i <= j ? m2[i][j] : m2[j][i]) - volume * centro[i] * centro[j]));
  const traco = M[0][0] + M[1][1] + M[2][2];
  const tensor = [0, 1, 2].map((i) => [0, 1, 2].map((j) => densidade * ((i === j ? traco : 0) - M[i][j])));
  return { massa: densidade * volume, volume, centro, tensor };
}
