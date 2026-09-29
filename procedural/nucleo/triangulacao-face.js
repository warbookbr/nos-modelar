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
   iguais. Função pura: mesma entrada, mesma saída. */

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
  return triangularConvexa(pts) ?? leque(pts.length);
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
