/* implementacao.js — recebe somente emissor transacional e resolução numérica. */
export function implementar(contexto, argumentos = {}) {
  const raio = contexto.numero(argumentos.raio ?? 0.5), altura = contexto.numero(argumentos.altura ?? 1);
  if (!(raio > 0 && altura > 0)) throw new Error('raio e altura precisam ser > 0');
  const pontos = [[raio, 0, 0], [-raio / 2, 0, Math.sqrt(3) * raio / 2], [-raio / 2, 0, -Math.sqrt(3) * raio / 2], [raio, altura, 0], [-raio / 2, altura, Math.sqrt(3) * raio / 2], [-raio / 2, altura, -Math.sqrt(3) * raio / 2]];
  pontos.forEach((ponto, id) => contexto.emitirVertice(id, ponto));
  [[0, 2, 1], [3, 4, 5], [0, 1, 4, 3], [1, 2, 5, 4], [2, 0, 3, 5]].forEach((vs, id) => contexto.emitirFace(id, vs));
}
