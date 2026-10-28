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

/* Um sólido por seções planas, como a asa: `secoes` seções elípticas de `n` pontos em planos de x constante, de raio que afina e centro
   que se desloca em y (a flecha, só depois de 40% da envergadura: a quebra torna a asa côncava), com as tampas das pontas. Cada seção tem dezenas de pontos exatamente no mesmo plano, a situação que
   desempatava mal no casco incremental da asa de verdade (`tools/modelar/esboco-familias.test.mjs` a mede com a família). */
export function asaDeSecoes({ secoes = 14, n = 60, envergadura = 12000, corda = 700, espessura = 160, afilamento = 0.5, flecha = 1800 } = {}) {
  const vertices = [];
  for (let k = 0; k < secoes; k++) {
    const t = k / (secoes - 1);
    const escala = 1 - (1 - afilamento) * t;
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      vertices.push([t * envergadura, flecha * Math.max(0, (t - 0.4) / 0.6) + (corda / 2) * escala * Math.cos(a), (espessura / 2) * escala * Math.sin(a)]);
    }
  }
  const v = (k, i) => k * n + (i % n);
  const faces = [];
  for (let k = 0; k + 1 < secoes; k++) for (let i = 0; i < n; i++) faces.push([v(k, i), v(k, i + 1), v(k + 1, i + 1), v(k + 1, i)]);
  faces.push(Array.from({ length: n }, (_, i) => v(secoes - 1, i)));
  faces.push(Array.from({ length: n }, (_, i) => v(0, n - 1 - i)));
  return { formato: 'mecanifica.malha@1', vertices, faces, partes: [{ nome: 'asa', de: 0, ate: faces.length }], eixo: 'x' };
}
