/* Álgebra esparsa do núcleo: a matriz simétrica montada por soma de termos, a ordenação de grau mínimo, o Cholesky esparso e a
 * substituição. Tudo é determinístico: a montagem soma cada posição na ordem em que os termos chegam (a mesma da matriz densa que ela
 * substitui, e por isso os valores são os mesmos bit a bit), a ordenação desempata pelo menor índice e nenhuma soma é paralela. */

/** matrizSimetrica(n) -> { n, somar(r, c, v), linhas } : a matriz n × n montada por soma, com cada linha um Map coluna → valor na ordem
 *  da primeira soma em cada posição. Quem monta soma as duas posições (r, c) e (c, r), como na matriz densa. */
export function matrizSimetrica(n) {
  const linhas = Array.from({ length: n }, () => new Map());
  return {
    n, linhas,
    somar(r, c, v) { const l = linhas[r]; l.set(c, (l.get(c) ?? 0) + v); },
  };
}

/** paraDensa(matriz) -> a mesma matriz como lista de linhas densas, para a eliminação densa de reserva */
export function paraDensa({ n, linhas }) {
  return linhas.map((l) => { const r = new Array(n).fill(0); for (const [c, v] of l) r[c] = v; return r; });
}

/** porColunas(matriz) -> { n, inicio, indices, valores } : a mesma matriz por colunas, com os índices de linha em ordem crescente. Como
 *  a matriz é simétrica, a coluna c é a linha c. */
export function porColunas({ n, linhas }) {
  const inicio = new Int32Array(n + 1);
  for (let c = 0; c < n; c++) inicio[c + 1] = inicio[c] + linhas[c].size;
  const indices = new Int32Array(inicio[n]); const valores = new Float64Array(inicio[n]);
  for (let c = 0; c < n; c++) {
    const pares = [...linhas[c]].sort((a, b) => a[0] - b[0]);
    pares.forEach(([r, v], k) => { indices[inicio[c] + k] = r; valores[inicio[c] + k] = v; });
  }
  return { n, inicio, indices, valores };
}

/** cotaDeVarah(matriz) -> 1 / min_k (|a_kk| − Σ_{j≠k} |a_kj|), a cota superior de ‖A⁻¹‖∞ para matriz estritamente diagonal dominante
 *  por linhas, ou Infinity quando alguma linha não é dominante. */
export function cotaDeVarah({ n, linhas }) {
  let margem = Infinity;
  for (let k = 0; k < n; k++) {
    let d = 0, fora = 0;
    for (const [c, v] of linhas[k]) { if (c === k) d = Math.abs(v); else fora += Math.abs(v); }
    margem = Math.min(margem, d - fora);
  }
  return margem > 0 ? 1 / margem : Infinity;
}

/* Heap binário de pares (grau, índice), com o menor grau e, no empate, o menor índice no topo. As entradas velhas ficam e são puladas
 * na retirada (quem retira confere o grau atual). */
function heapDePares() {
  const g = []; const i = [];
  const menor = (a, b) => g[a] < g[b] || (g[a] === g[b] && i[a] < i[b]);
  const trocar = (a, b) => { [g[a], g[b]] = [g[b], g[a]]; [i[a], i[b]] = [i[b], i[a]]; };
  return {
    get tamanho() { return g.length; },
    por(grau, indice) {
      let k = g.length; g.push(grau); i.push(indice);
      while (k > 0) { const p = (k - 1) >> 1; if (!menor(k, p)) break; trocar(k, p); k = p; }
    },
    tirar() {
      const topo = [g[0], i[0]]; const ug = g.pop(); const ui = i.pop();
      if (g.length) {
        g[0] = ug; i[0] = ui; let k = 0;
        for (;;) {
          const a = 2 * k + 1, b = a + 1; let m = k;
          if (a < g.length && menor(a, m)) m = a;
          if (b < g.length && menor(b, m)) m = b;
          if (m === k) break; trocar(k, m); k = m;
        }
      }
      return topo;
    },
  };
}

/** ordemDeGrauMinimo(matriz) -> Int32Array com a ordem de eliminação (ordem[k] é o índice eliminado em k-ésimo). Grau mínimo
 *  aproximado, como o AMD de Amestoy, Davis e Duff: elimina a variável de menor grau, com o menor índice no empate. O grafo é guardado
 *  como grafo quociente: a variável eliminada vira um elemento, a lista das vizinhas dela, que representa a clique que a eliminação
 *  criaria, e absorve os elementos vizinhos e os que ficam contidos nela. O grau é a cota superior do AMD, a soma das variáveis vizinhas
 *  com o que cada elemento vizinho tem fora do novo, sem a união exata, que custava a maior parte do tempo e crescia mal. Sem
 *  supervariáveis. A estrutura vem da matriz montada; valores nulos contam como posição (a montagem não guarda o que nunca somou). */
export function ordemDeGrauMinimo({ n, linhas }) {
  const vars = linhas.map((l, k) => { const a = []; for (const c of l.keys()) if (c !== k) a.push(c); return a; });
  const elems = Array.from({ length: n }, () => []); const doElemento = new Array(n).fill(null);
  const viva = new Uint8Array(n).fill(1); const elementoVivo = new Uint8Array(n);
  const marca = new Int32Array(n); let tag = 0; const fora = new Int32Array(n).fill(-1);
  const grau = new Int32Array(n); const heap = heapDePares(); const ordem = new Int32Array(n);
  for (let k = 0; k < n; k++) { grau[k] = vars[k].length; heap.por(grau[k], k); }
  let t = 0;
  while (t < n) {
    const [g, p] = heap.tirar();
    if (!viva[p] || g !== grau[p]) continue;
    viva[p] = 0; ordem[t++] = p;
    /* o elemento novo: as variáveis vizinhas de p e as dos elementos vizinhos, que ele absorve */
    const marcaDoElemento = ++tag; marca[p] = tag; const Lp = [];
    for (const v of vars[p]) if (viva[v] && marca[v] !== tag) { marca[v] = tag; Lp.push(v); }
    for (const e of elems[p]) {
      if (!elementoVivo[e]) continue;
      for (const v of doElemento[e]) if (viva[v] && marca[v] !== tag) { marca[v] = tag; Lp.push(v); }
      elementoVivo[e] = 0; doElemento[e] = null;
    }
    elementoVivo[p] = 1; doElemento[p] = Lp; vars[p] = null; elems[p] = null;
    /* cada vizinha deixa de ter como variável vizinha quem já está em p, e w(e) = |e \ p| para cada outro elemento vizinho delas */
    const tocados = [];
    for (const i of Lp) {
      vars[i] = vars[i].filter((v) => viva[v] && marca[v] !== marcaDoElemento);
      for (const e of elems[i]) {
        if (!elementoVivo[e]) continue;
        if (fora[e] < 0) { fora[e] = doElemento[e].length; tocados.push(e); }
        fora[e]--;
      }
    }
    /* o elemento contido em p é absorvido também, e o grau aproximado é |vars| + |p| − 1 + Σ w(e), limitado pelo de antes mais |p| − 1 e
       pelo número de variáveis que restam */
    const restam = n - t - 1;
    for (const i of Lp) {
      const ei = []; let d = vars[i].length + Lp.length - 1;
      for (const e of elems[i]) {
        if (!elementoVivo[e]) continue;
        if (fora[e] === 0) { elementoVivo[e] = 0; doElemento[e] = null; continue; }
        ei.push(e); d += fora[e];
      }
      ei.push(p); elems[i] = ei;
      d = Math.min(d, grau[i] + Lp.length - 1, restam);
      grau[i] = d; heap.por(d, i);
    }
    for (const e of tocados) fora[e] = -1;
  }
  return ordem;
}

/** fatorarCholesky(matriz, ordem) -> { n, ordem, posicao, Lp, Li, Lx, naoNulos } ou { naoPositivaEm }
 *  O fator L de P A Pᵀ = L Lᵀ, com P a ordem dada (a de `ordemDeGrauMinimo` quando omitida), guardado por colunas, cada coluna com a
 *  diagonal primeiro. Usa a árvore de eliminação para achar a estrutura de cada linha de L (o Cholesky por linhas). Pivô de valor até
 *  `pivoMinimo` vezes a diagonal original para a fatoração e devolve a posição, na ordem original, em que ela parou. */
export function fatorarCholesky(matriz, ordem = ordemDeGrauMinimo(matriz), { pivoMinimo = 1e-14 } = {}) {
  const n = matriz.n;
  const posicao = new Int32Array(n); for (let k = 0; k < n; k++) posicao[ordem[k]] = k;
  /* a matriz permutada por colunas, só a parte de cima (linha ≤ coluna), com as linhas em ordem crescente */
  const ap = new Int32Array(n + 1); const colunas = new Array(n);
  for (let k = 0; k < n; k++) {
    const pares = [];
    for (const [c, v] of matriz.linhas[ordem[k]]) { const r = posicao[c]; if (r <= k) pares.push([r, v]); }
    pares.sort((a, b) => a[0] - b[0]); colunas[k] = pares; ap[k + 1] = ap[k] + pares.length;
  }
  const ai = new Int32Array(ap[n]); const ax = new Float64Array(ap[n]);
  colunas.forEach((pares, k) => pares.forEach(([r, v], j) => { ai[ap[k] + j] = r; ax[ap[k] + j] = v; }));
  /* a árvore de eliminação */
  const pai = new Int32Array(n).fill(-1); const ancestral = new Int32Array(n).fill(-1);
  for (let k = 0; k < n; k++) {
    for (let p = ap[k]; p < ap[k + 1]; p++) {
      let i = ai[p];
      while (i !== -1 && i < k) { const prox = ancestral[i]; ancestral[i] = k; if (prox === -1) pai[i] = k; i = prox; }
    }
  }
  const marca = new Int32Array(n).fill(-1); const pilha = new Int32Array(n);
  /* a estrutura da linha k de L, fora da diagonal, em ordem topológica em pilha[topo..n) */
  const alcance = (k) => {
    let topo = n; marca[k] = k;
    for (let p = ap[k]; p < ap[k + 1]; p++) {
      let i = ai[p]; if (i > k) continue;
      let len = 0;
      for (; marca[i] !== k; i = pai[i]) { pilha[len++] = i; marca[i] = k; }
      while (len > 0) pilha[--topo] = pilha[--len];
    }
    return topo;
  };
  /* contagem das colunas de L, pela mesma estrutura das linhas */
  const conta = new Int32Array(n).fill(1);
  for (let k = 0; k < n; k++) { const topo = alcance(k); for (let t = topo; t < n; t++) conta[pilha[t]]++; }
  marca.fill(-1);
  const Lp = new Int32Array(n + 1); for (let k = 0; k < n; k++) Lp[k + 1] = Lp[k] + conta[k];
  const Li = new Int32Array(Lp[n]); const Lx = new Float64Array(Lp[n]); const livre = Int32Array.from(Lp.subarray(0, n));
  const x = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const topo = alcance(k);
    let diag0 = 0;
    for (let p = ap[k]; p < ap[k + 1]; p++) { x[ai[p]] = ax[p]; if (ai[p] === k) diag0 = ax[p]; }
    let d = x[k]; x[k] = 0;
    for (let t = topo; t < n; t++) {
      const i = pilha[t]; const lki = x[i] / Lx[Lp[i]]; x[i] = 0;
      for (let p = Lp[i] + 1; p < livre[i]; p++) x[Li[p]] -= Lx[p] * lki;
      d -= lki * lki;
      const p = livre[i]++; Li[p] = k; Lx[p] = lki;
    }
    if (!(d > pivoMinimo * Math.abs(diag0))) return { naoPositivaEm: ordem[k] };
    const p = livre[k]++; Li[p] = k; Lx[p] = Math.sqrt(d);
  }
  return { n, ordem, posicao, Lp, Li, Lx, naoNulos: Lp[n] };
}

/** resolverCholesky(fator, b) -> x com A x = b. O lado direito pode ser esparso: a substituição para frente pula a coluna cujo valor
 *  ainda é zero, que não muda nada. */
export function resolverCholesky({ n, ordem, Lp, Li, Lx }, b) {
  const y = new Float64Array(n);
  for (let k = 0; k < n; k++) y[k] = b[ordem[k]];
  for (let j = 0; j < n; j++) {
    if (y[j] === 0) continue;
    const v = (y[j] /= Lx[Lp[j]]);
    for (let p = Lp[j] + 1; p < Lp[j + 1]; p++) y[Li[p]] -= Lx[p] * v;
  }
  for (let j = n - 1; j >= 0; j--) {
    let s = y[j];
    for (let p = Lp[j] + 1; p < Lp[j + 1]; p++) s -= Lx[p] * y[Li[p]];
    y[j] = s / Lx[Lp[j]];
  }
  const xs = new Array(n);
  for (let k = 0; k < n; k++) xs[ordem[k]] = y[k];
  return xs;
}
