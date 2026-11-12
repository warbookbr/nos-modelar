/* sedan-chassi-e-lataria/partes/_comum/forro.mjs: o forro de um vão entre painéis, a faixa fina por trás dele que o fecha.
 *
 * O vão de 4 mm entre dois painéis cortados da mesma chapa (`paineisPorVaos`) atravessa a espessura dela de lado a lado, e `npm run vao:partes -- <peça> --fundo=modelo`
 * acha os vãos que deixam ver o outro lado do carro por trás deles. O `paineisPorVaos` não tem aba de borda (o `friso` com `aba` dobra a borda livre de uma gaiola, e a
 * borda de um painel cortado não é gaiola), e o forro é o que a receita tem no lugar: uma faixa de seção retangular que corre pela linha do vão, por baixo da chapa, mais
 * larga que o vão dos dois lados. Ela é uma gaiola própria (as quatro arestas da seção em cada estação da linha, sem suavização, que são faces planas de aresta viva), tirada
 * da curva que `curvaDaGaiola` dá para a linha do vão, e o sólido sai fechado, com a normal para fora.
 *
 * O quadro de cada estação: a tangente T da curva; o eixo `across` (a direção, no plano da chapa, que atravessa o vão, escolhida por linha); a normal da chapa n = T x across,
 * com o sinal para longe do eixo do carro; e b = n x T, ao longo do vão atravessado. A seção fica no plano de (b, n): a face de cima a `fundo` mm da pele de fora e a de
 * baixo a `fundo + espessura`. */
const sub = (a, b) => a.map((v, k) => v - b[k]);
const soma = (a, b) => a.map((v, k) => v + b[k]);
const esc = (a, s) => a.map((v) => v * s);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => esc(a, 1 / Math.hypot(...a));
const EIXOS = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

/** A gaiola da faixa, `{ vertices, faces, niveis: 0 }` com os pontos em mm em `pontos`. `curva` é a polilinha do vão (mm), `passo` pega um ponto a cada `passo`.
 *  `normalDaPele(p)` dá a normal da pele em p (para fora); sem ela a normal é T x across, que só vale onde a pele é plana ao longo de `across` (na saia alargada do para-lama
 *  ela inclina 15 graus e a faixa entrava 3 mm na chapa vizinha). */
export function faixaPorTras({ nome, curva, across, largura, espessura, fundo, passo = 3, centro = [0, 700, 0], normalDaPele }) {
  const pts = curva.filter((_, i) => i % passo === 0 || i === curva.length - 1);
  const a = EIXOS[across];
  const secao = pts.map((p, i) => {
    const T = unit(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
    let n = normalDaPele ? normalDaPele(p) : cruz(T, a);
    if (Math.hypot(...n) < 1e-6) throw new Error(`forro ${nome}: a curva é paralela ao eixo ${across} na estação ${i}`);
    n = unit(n);
    if (dot(n, sub(p, centro)) < 0) n = esc(n, -1);
    /* a seção fica no plano da pele: b é a direção da pele que atravessa o vão, perpendicular à tangente */
    const b = unit(cruz(n, T));
    const canto = (lado, prof) => soma(sub(p, esc(n, prof)), esc(b, (lado * largura) / 2));
    return [canto(1, fundo), canto(-1, fundo), canto(-1, fundo + espessura), canto(1, fundo + espessura)];
  });
  const pontos = {}; const nomeDe = (i, k) => `${nome}_${i}_${k}`;
  secao.forEach((s, i) => s.forEach((c, k) => { pontos[nomeDe(i, k)] = c; }));
  const faces = [];
  for (let i = 0; i + 1 < secao.length; i++) for (let k = 0; k < 4; k++) faces.push([nomeDe(i, k), nomeDe(i, (k + 1) % 4), nomeDe(i + 1, (k + 1) % 4), nomeDe(i + 1, k)]);
  /* as tampas percorrem a borda ao contrário das faces do lado que chegam nela: a primeira de 3 a 0, a última de 0 a 3 */
  faces.push([3, 2, 1, 0].map((k) => nomeDe(0, k)), [0, 1, 2, 3].map((k) => nomeDe(secao.length - 1, k)));
  /* a normal para fora: o volume com sinal tem de ser positivo, senão inverte a ordem de todas as faces */
  let volume = 0;
  for (const f of faces) { const q = f.map((n) => pontos[n]); for (let t = 1; t + 1 < q.length; t++) volume += dot(q[0], cruz(q[t], q[t + 1])) / 6; }
  const orientadas = volume < 0 ? faces.map((f) => [...f].reverse()) : faces;
  return { vertices: Object.keys(pontos), faces: orientadas, niveis: 0, pontos, volume: Math.abs(volume) };
}
