/* A malha de prova dos testes da forma de família: um tubo de parede (a camisa do cilindro hidráulico, o cubo da roda) ao longo de x,
   como o dado `mecanifica.malha@1` em milímetro, com as faces em sentido anti-horário visto de fora (a coroa das tampas e as duas
   paredes) e uma só parte. É o que um provedor de famílias entregaria sem o módulo importar o núcleo. */
export function tuboOco({ n = 32, rExt = 20, rInt = 10, comprimento = 100, centro = [0, 0, 0], ancoras, eixo, parte = 'corpo' } = {}) {
  const vertices = [];
  for (const [r, x] of [[rExt, -comprimento / 2], [rExt, comprimento / 2], [rInt, -comprimento / 2], [rInt, comprimento / 2]]) {
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      vertices.push([centro[0] + x, centro[1] + r * Math.cos(a), centro[2] + r * Math.sin(a)]);
    }
  }
  const o0 = (i) => i % n; const o1 = (i) => n + (i % n); const i0 = (i) => 2 * n + (i % n); const i1 = (i) => 3 * n + (i % n);
  const faces = [];
  for (let i = 0; i < n; i++) {
    faces.push([o0(i), o0(i + 1), o1(i + 1), o1(i)]);
    faces.push([i1(i), i1(i + 1), i0(i + 1), i0(i)]);
    faces.push([o1(i), o1(i + 1), i1(i + 1), i1(i)]);
    faces.push([i0(i), i0(i + 1), o0(i + 1), o0(i)]);
  }
  return {
    formato: 'mecanifica.malha@1', vertices, faces, partes: [{ nome: parte, de: 0, ate: faces.length }],
    ...(ancoras ? { ancoras } : {}), ...(eixo ? { eixo } : {}),
  };
}
