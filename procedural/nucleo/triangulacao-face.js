/* triangulacao-face.js — triangulação dos triângulos de UMA face plana.
   O leque a partir do canto 0 põe dezenas de triângulos longos e finos num
   único vértice quando a face tem muitos cantos (tampa de loft, pedaço de
   união). Faces convexas de 8 cantos ou mais passam a ser triangularizadas por
   subdivisão em triângulo central: cada diagonal (i,j) recebe o ápice k que
   minimiza a razão (soma dos lados ao quadrado / área, mínima no equilátero e
   crescente com a lasca) multiplicada pelo grau previsto dos dois extremos
   elevado a PESO_GRAU, e o processo desce em largura. Numa tampa de 48 lados o
   grau máximo cai de 46 (leque) para 6. Face pequena mantém o leque
   (triangularFace) e a côncava fica com o triangulador dela
   (triangularConvexa devolve null). A
   fronteira do polígono não muda, então casca fechada, ids e manifold seguem
   iguais. Função pura: mesma entrada, mesma saída.

   Face com canto colinear (um polígono válido: o vértice que a booleana deixa no meio de uma aresta, o ponto médio de um
   perfil de extrusão) dá no leque do canto 0 um triângulo de área nula quando o canto 0 vizinho é o colinear.
   `triangularSemDegenerado` devolve o mesmo leque quando ele não tem triângulo degenerado, e só quando tem procura outro:
   o leque a partir de outro canto, e por último as orelhas. Quem valida e quem exporta usam a mesma função com o mesmo
   critério de degenerado, e por isso o leque do canto 0 que já saía sem defeito sai bit a bit igual. */

const MIN_CANTOS = 8;
const GRANDE = 1e30;
const PESO_GRAU = 4;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function leque(n) {
  const t = [];
  for (let k = 1; k < n - 1; k++) t.push([0, k, k + 1]);
  return t;
}

/* pts: posições 3D dos cantos, em ordem. Devolve triplas de índices de pts,
   com o mesmo sentido de giro do polígono. */
export function triangularFace(pts) {
  /* o triângulo de área válida é a própria triangulação: o caminho curto devolve o que `triangularSemDegenerado` devolveria (o leque do canto 0), sem montar a conta da face */
  if (pts.length === 3 && !degeneradoPorEscala(pts)(pts[0], pts[1], pts[2])) return [[0, 1, 2]];
  return triangularConvexa(pts) ?? triangularSemDegenerado(pts) ?? leque(pts.length);
}

/* Área e normal de Newell do polígono; a normal tem o comprimento do dobro da área. */
function normalDeNewell(pts) {
  let nm = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const c = cruz(pts[i], pts[(i + 1) % pts.length]);
    nm = [nm[0] + c[0], nm[1] + c[1], nm[2] + c[2]];
  }
  return nm;
}

/* Critério de degenerado de quem não declara o seu: área abaixo de 1e-12 do quadrado da maior aresta da face, o mesmo
   limite que `triangularConvexa` usa para recusar o apice de lasca. */
function degeneradoPorEscala(pts) {
  let escala = 0;
  for (let i = 0; i < pts.length; i++) { const d = sub(pts[(i + 1) % pts.length], pts[i]); escala = Math.max(escala, Math.hypot(d[0], d[1], d[2])); }
  const limite = 1e-12 * escala * escala;
  return (a, b, c) => Math.hypot(...cruz(sub(b, a), sub(c, a))) / 2 <= limite;
}

/* Orelhas com área positiva sobre a normal da face e sem outro canto dentro ou sobre a diagonal. */
function orelhas(pts, nm, degenerado) {
  const resto = pts.map((_, i) => i);
  const saida = [];
  const dentro = (p, a, b, c) => [[a, b], [b, c], [c, a]].every(([u, v]) => dot(cruz(sub(v, u), sub(p, u)), nm) >= 0);
  while (resto.length > 3) {
    let achou = -1;
    for (let k = 0; k < resto.length && achou < 0; k++) {
      const i = resto[(k + resto.length - 1) % resto.length], j = resto[k], l = resto[(k + 1) % resto.length];
      const [a, b, c] = [pts[i], pts[j], pts[l]];
      if (degenerado(a, b, c) || !(dot(cruz(sub(b, a), sub(c, a)), nm) > 0)) continue;
      if (resto.some((m) => m !== i && m !== j && m !== l && dentro(pts[m], a, b, c))) continue;
      achou = k;
    }
    if (achou < 0) return null;
    const m = resto.length;
    saida.push([resto[(achou + m - 1) % m], resto[achou], resto[(achou + 1) % m]]);
    resto.splice(achou, 1);
  }
  if (degenerado(pts[resto[0]], pts[resto[1]], pts[resto[2]])) return null;
  saida.push([resto[0], resto[1], resto[2]]);
  return saida;
}

/* Triplas de índices de pts, com o sentido de giro do polígono e nenhum triângulo degenerado, ou null quando nenhuma
   triangulação serve. O leque do canto 0 é a primeira escolha; se ele tem triângulo degenerado, o leque a partir do
   primeiro outro canto cujos triângulos todos têm área positiva sobre a normal da face; por fim as orelhas.
   `degenerado(a, b, c)` diz se o triângulo dos três pontos não vale: sem ele, vale o limite relativo à maior aresta. */
export function triangularSemDegenerado(pts, degenerado = null) {
  const n = pts.length;
  if (n < 3) return null;
  const eDegenerado = degenerado ?? degeneradoPorEscala(pts);
  const nm = normalDeNewell(pts);
  const dele = (c) => { const t = []; for (let k = 1; k < n - 1; k++) t.push([c, (c + k) % n, (c + k + 1) % n]); return t; };
  const serve = (t, exigeGiro) => t.every(([i, j, k]) => !eDegenerado(pts[i], pts[j], pts[k])
    && (!exigeGiro || dot(cruz(sub(pts[j], pts[i]), sub(pts[k], pts[i])), nm) > 0));
  const zero = dele(0);
  if (serve(zero, false)) return zero;
  for (let c = 1; c < n; c++) { const t = dele(c); if (serve(t, true)) return t; }
  return orelhas(pts, nm, eDegenerado) ?? porTira(pts, nm, eDegenerado) ?? porSubcadeias(pts, nm, eDegenerado);
}

/* A TIRA DE DUAS CADEIAS EM PASSAGEM LINEAR. O polígono é a cadeia L (do canto s ao canto p) seguida da cadeia R (de volta, de s-1 a p+1); os
   dois degraus das pontas são arestas do polígono, (L0, R0) e (Lm, Rq). O zigue-zague avança numa cadeia por vez a partir do degrau (L0, R0):
   avançar L dá o triângulo (Li, Li+1, Rj), avançar R dá (Li, Rj+1, Rj), os dois com o giro do polígono, e fica o de menor razão
   (soma dos lados ao quadrado) / área, com o empate em L. Cada triângulo tem de ter giro positivo sobre a normal e passar do critério de
   degenerado, e a tira que falha num triângulo é descartada. Como todos os triângulos giram no sentido do polígono e as bordas são as do
   polígono, a cobertura é a do polígono. Os cantos de partida e de chegada saem dos MAIORES_GIROS cantos de maior giro (as quinas da tira; os
   cantos intermediários de uma borda reta quase não giram), em todas as combinações, e a de menor soma de razões fica. Custa n por
   combinação, sem limite de cantos. */
const MAIORES_GIROS = 8;
function porTira(pts, nm, degenerado) {
  const n = pts.length;
  if (n < 4) return null;
  const giro = pts.map((b, i) => {
    const a = pts[(i + n - 1) % n], c = pts[(i + 1) % n];
    const u = sub(b, a), v = sub(c, b);
    const lu = Math.hypot(...u), lv = Math.hypot(...v);
    return lu > 0 && lv > 0 ? Math.hypot(...cruz(u, v)) / (lu * lv) : 0;
  });
  const quinas = giro.map((g, i) => [g, i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]).slice(0, MAIORES_GIROS).map(([, i]) => i).sort((a, b) => a - b);
  let melhor = null, melhorCusto = Infinity;
  for (const s of quinas) for (const p of quinas) {
    const m = (p - s + n) % n;                      // L tem m+1 cantos e R tem n-m-1
    if (m < 1 || n - m - 1 < 2) continue;
    const q = n - m - 2;                            // índice do último canto de R
    if (q < 0) continue;
    const L = (i) => (s + i) % n, R = (j) => (((s - 1 - j) % n) + n) % n;
    const triangulos = []; let custo = 0, i = 0, j = 0, ok = true;
    const avalia = (a, b, c) => {
      const g = cruz(sub(pts[b], pts[a]), sub(pts[c], pts[a]));
      if (!(dot(g, nm) > 0) || degenerado(pts[a], pts[b], pts[c])) return Infinity;
      const u = sub(pts[b], pts[a]), v = sub(pts[c], pts[b]), w = sub(pts[a], pts[c]);
      return (dot(u, u) + dot(v, v) + dot(w, w)) / (Math.hypot(...g) / 2);
    };
    while (i < m || j < q) {
      const cl = i < m ? avalia(L(i), L(i + 1), R(j)) : Infinity;
      const cr = j < q ? avalia(L(i), R(j + 1), R(j)) : Infinity;
      if (cl === Infinity && cr === Infinity) { ok = false; break; }
      if (cl <= cr) { triangulos.push([L(i), L(i + 1), R(j)]); custo += cl; i++; } else { triangulos.push([L(i), R(j + 1), R(j)]); custo += cr; j++; }
    }
    if (ok && custo < melhorCusto * (1 - 1e-9)) { melhor = triangulos; melhorCusto = custo; }
  }
  return melhor;
}

/* O MAIOR PORTE DA FACE EM TIRA. A face fina cujos cantos ficam colineares nos dois lados (a parede de 1 mm de um corte, com dezenas de
   cantos em cada borda) não tem leque nem orelha sem triângulo de área nula: um leque cobre só uma das duas cadeias, e a orelha de três
   cantos da mesma cadeia é nula. A triangulação existe e é o zigue-zague entre as duas cadeias. A busca é a programação dinâmica sobre os
   cantos em ordem: o trecho [i, j] fecha quando algum k dá o triângulo (i, k, j) de área positiva sobre a normal da face e fora do critério
   de degenerado, com os trechos [i, k] e [k, j] fechados; com todos os triângulos de giro positivo a cobertura é a do polígono (a soma
   dos giros é o número de voltas da borda), sem sobreposição. Entre as que fecham, fica a de menor soma da razão (soma dos lados ao
   quadrado) / área, e o empate vai para o menor k. Só roda quando o leque, o leque de outro canto e as orelhas falharam, e por isso as
   faces que hoje triangulam saem iguais. Custa n³, e faces de mais de LIMITE_DA_PROGRAMACAO_DINAMICA cantos ficam sem ela; a tira de
   duas cadeias passa antes por `porTira`, linear, sem limite de cantos. */
export const LIMITE_DA_PROGRAMACAO_DINAMICA = 300;
function porSubcadeias(pts, nm, degenerado) {
  const n = pts.length;
  if (n < 4 || n > LIMITE_DA_PROGRAMACAO_DINAMICA) return null;
  const custo = new Float64Array(n * n).fill(Infinity);
  const melhorK = new Int32Array(n * n).fill(-1);
  for (let i = 0; i + 1 < n; i++) custo[i * n + i + 1] = 0;
  for (let d = 2; d < n; d++) {
    for (let i = 0; i + d < n; i++) {
      const j = i + d;
      for (let k = i + 1; k < j; k++) {
        const resto = custo[i * n + k] + custo[k * n + j];
        if (!(resto < Infinity)) continue;
        const [a, b, c] = [pts[i], pts[k], pts[j]];
        const g = cruz(sub(b, a), sub(c, a));
        if (!(dot(g, nm) > 0) || degenerado(a, b, c)) continue;
        const u = sub(b, a), v = sub(c, b), w = sub(a, c);
        const total = resto + (dot(u, u) + dot(v, v) + dot(w, w)) / (Math.hypot(...g) / 2);
        if (total < custo[i * n + j] * (1 - 1e-9)) { custo[i * n + j] = total; melhorK[i * n + j] = k; }
      }
    }
  }
  if (!(custo[n - 1] < Infinity)) return null;
  const saida = []; const pilha = [[0, n - 1]];
  while (pilha.length) {
    const [i, j] = pilha.pop();
    if (j - i < 2) continue;
    const k = melhorK[i * n + j];
    saida.push([i, k, j]);
    pilha.push([k, j], [i, k]);
  }
  return saida;
}

/* igual a triangularFace, mas devolve null quando a face é pequena ou côncava
   (quem chama triangula por conta própria). */
export function triangularConvexa(pts) {
  const n = pts.length;
  if (n < MIN_CANTOS) return null;
  // normal de Newell
  let nm = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const c = cruz(pts[i], pts[(i + 1) % n]);
    nm = [nm[0] + c[0], nm[1] + c[1], nm[2] + c[2]];
  }
  let escala = 0;
  for (let i = 0; i < n; i++) { const d = sub(pts[(i + 1) % n], pts[i]); escala = Math.max(escala, Math.hypot(d[0], d[1], d[2])); }
  if (!(Math.hypot(nm[0], nm[1], nm[2]) > 1e-12 * escala * escala)) return null;
  // convexa: nenhum giro contra a normal
  const tol = 1e-9 * escala * escala * Math.hypot(nm[0], nm[1], nm[2]);
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], c = pts[(i + 2) % n];
    if (dot(cruz(sub(b, a), sub(c, b)), nm) < -tol) return null;
  }
  const custo = (i, k, j) => {
    const a = pts[i], b = pts[k], c = pts[j];
    const u = sub(b, a), v = sub(c, b), w = sub(a, c);
    const area = Math.hypot(...cruz(u, sub(c, a))) / 2;
    if (!(area > 1e-12 * escala * escala)) return GRANDE;
    return (dot(u, u) + dot(v, v) + dot(w, w)) / area;
  };
  /* Subdivisão por triângulo central: a diagonal (i,j) ganha o apice k, dentro
     do trecho (10% a 90%) que dá o melhor custo; depois se repete em (i,k) e
     (k,j). Se toda essa faixa degenera, olha o trecho inteiro; se ele também só tem lascas, a face fica com quem chamou. */
  const saida = [];
  const grau = new Array(n).fill(0);
  const pilha = [[0, n - 1]];
  for (let cursor = 0; cursor < pilha.length; cursor++) {   // em largura: cada nível já vê o grau deixado pelo anterior
    const [i, j] = pilha[cursor];
    const d = j - i;
    if (d < 2) continue;
    let melhorK = -1, melhorC = GRANDE;
    const acha = (de, ate) => {
      for (let k = de; k <= ate; k++) {
        /* grau previsto dos dois extremos: o que já têm mais os níveis que ainda vão descer por eles */
        const previsto = Math.max(grau[i] + Math.log2(k - i) + 1, grau[j] + Math.log2(j - k) + 1);
        const c = custo(i, k, j) * previsto ** PESO_GRAU;
        // empate (a menos de 1e-9 relativo) fica com o menor k: a conta muda na última casa quando a peça é transladada
        if (c < GRANDE * 1e-3 && (melhorK < 0 || c < melhorC * (1 - 1e-9))) { melhorC = c; melhorK = k; }
      }
    };
    const de = Math.min(d - 1, Math.max(1, Math.ceil(0.1 * d)));
    acha(i + de, i + Math.max(de, Math.min(d - 1, Math.floor(0.9 * d))));
    if (melhorK < 0) acha(i + 1, j - 1);
    if (melhorK < 0) return null;
    saida.push([i, melhorK, j]);
    grau[i]++; grau[melhorK]++; grau[j]++;
    pilha.push([i, melhorK], [melhorK, j]);
  }
  return saida;
}
