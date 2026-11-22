/* Álgebra esparsa do núcleo: a matriz simétrica montada por soma de termos, a ordenação de grau mínimo, o Cholesky esparso e a
 * substituição. Tudo é determinístico: a montagem soma cada posição na ordem em que os termos chegam (a mesma da matriz densa que ela
 * substitui, e por isso os valores são os mesmos bit a bit), a ordenação desempata pelo menor índice e nenhuma soma é paralela. */

/** matrizPorLinhas(n) -> { n, somar(r, c, v), linhas } : a matriz n × n montada por soma, com cada linha um Map coluna → valor na ordem
 *  da primeira soma em cada posição. Serve à matriz qualquer; quem monta uma simétrica soma as duas posições (r, c) e (c, r), como na
 *  matriz densa. */
export function matrizPorLinhas(n) {
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

/** estruturaSimetrica(matriz) -> a estrutura de A + Aᵀ, no formato da matriz montada, para ordenar uma matriz que não é simétrica */
export function estruturaSimetrica({ n, linhas }) {
  const s = matrizPorLinhas(n);
  for (let r = 0; r < n; r++) { s.linhas[r].set(r, 0); for (const c of linhas[r].keys()) { s.linhas[r].set(c, 0); s.linhas[c].set(r, 0); } }
  return s;
}

/** fatorarLUEsparso(matriz, { ordem, limiar, pivoNulo }) -> { n, ordem, pinv, Lp, Li, Lx, Up, Ui, Ux, naoNulos, deficientes }
 *  P A Q = L U por colunas (Gilbert e Peierls), com Q a ordem de colunas (a de grau mínimo sobre A + Aᵀ quando omitida) e P escolhida
 *  coluna a coluna: o pivô é a diagonal da coluna quando ela tem pelo menos `limiar` vezes o maior candidato, e senão o maior candidato,
 *  com o menor índice de linha no empate. A coluna cujos candidatos ficam todos até `pivoNulo` não ganha pivô e entra em `deficientes`
 *  (posições na ordem), e a fatoração segue: com `deficientes` vazio a matriz é inversível. */
export function fatorarLUEsparso(matriz, { ordem = null, limiar = 0.1, pivoNulo = 1e-12 } = {}) {
  const n = matriz.n;
  const q = ordem ?? ordemDeGrauMinimo(estruturaSimetrica(matriz));
  /* as colunas de A, com as linhas em ordem crescente */
  const colunas = Array.from({ length: n }, () => []);
  for (let r = 0; r < n; r++) for (const [c, v] of matriz.linhas[r]) colunas[c].push([r, v]);
  for (const col of colunas) col.sort((a, b) => a[0] - b[0]);
  const pinv = new Int32Array(n).fill(-1);
  const Lp = [0]; const Li = []; const Lx = []; const Up = [0]; const Ui = []; const Ux = [];
  const x = new Float64Array(n); const marca = new Int32Array(n).fill(-1); const xi = new Int32Array(n); const pilha = new Int32Array(n); const pos = new Int32Array(n);
  const deficientes = [];
  for (let k = 0; k < n; k++) {
    const col = colunas[q[k]];
    /* o alcance de A(:, q_k) no grafo de L, em ordem topológica em xi[topo..n) */
    let topo = n;
    for (const [i0] of col) {
      if (marca[i0] === k) continue;
      let cabeca = 0; pilha[0] = i0;
      while (cabeca >= 0) {
        const j = pilha[cabeca]; const jj = pinv[j];
        if (marca[j] !== k) { marca[j] = k; pos[cabeca] = jj < 0 ? 0 : Lp[jj] + 1; }
        let feito = true;
        if (jj >= 0) {
          const fim = Lp[jj + 1];
          for (let p = pos[cabeca]; p < fim; p++) {
            const i = Li[p];
            if (marca[i] === k) continue;
            pos[cabeca] = p + 1; pilha[++cabeca] = i; feito = false; break;
          }
        }
        if (feito) { cabeca--; xi[--topo] = j; }
      }
    }
    for (let p = topo; p < n; p++) x[xi[p]] = 0;
    for (const [i, v] of col) x[i] = v;
    /* x = L \ A(:, q_k), com L de diagonal 1 guardada primeiro em cada coluna */
    for (let p = topo; p < n; p++) {
      const j = xi[p]; const jj = pinv[j]; if (jj < 0) continue;
      const v = x[j];
      for (let t = Lp[jj] + 1; t < Lp[jj + 1]; t++) x[Li[t]] -= Lx[t] * v;
    }
    /* o pivô: entre as linhas ainda sem pivô, a diagonal se passar do limiar, senão a maior, com a menor linha no empate */
    let ipiv = -1; let a = -1;
    for (let p = topo; p < n; p++) {
      const i = xi[p];
      if (pinv[i] < 0) { const t = Math.abs(x[i]); if (t > a || (t === a && i < ipiv)) { a = t; ipiv = i; } }
      else if (x[i] !== 0) { Ui.push(pinv[i]); Ux.push(x[i]); }
    }
    if (!(a > pivoNulo)) {
      deficientes.push(k);
      Up.push(Ui.length); Lp.push(Li.length);
      continue;
    }
    const diag = q[k];
    if (pinv[diag] < 0 && marca[diag] === k && Math.abs(x[diag]) >= limiar * a) ipiv = diag;
    const pivo = x[ipiv];
    Ui.push(k); Ux.push(pivo); Up.push(Ui.length);
    pinv[ipiv] = k; Li.push(ipiv); Lx.push(1);
    for (let p = topo; p < n; p++) { const i = xi[p]; if (pinv[i] < 0 && x[i] !== 0) { Li.push(i); Lx.push(x[i] / pivo); } }
    Lp.push(Li.length);
  }
  /* as linhas que ficaram sem pivô vão para as posições das colunas deficientes, em ordem crescente */
  let d = 0;
  for (let i = 0; i < n; i++) if (pinv[i] < 0) pinv[i] = deficientes[d++];
  for (let t = 0; t < Li.length; t++) Li[t] = pinv[Li[t]];
  return { n, ordem: q, pinv, Lp: Int32Array.from(Lp), Li: Int32Array.from(Li), Lx: Float64Array.from(Lx), Up: Int32Array.from(Up), Ui: Int32Array.from(Ui), Ux: Float64Array.from(Ux), naoNulos: Li.length + Ui.length, deficientes };
}

/* a diagonal de U na coluna k é a última entrada dela, porque a linha do pivô entra depois das de cima */
function diagonalDeU({ Up, Ui, Ux }, k) { const p = Up[k + 1] - 1; return p >= Up[k] && Ui[p] === k ? Ux[p] : 0; }

/** resolverLUEsparso(fator, b) -> x com A x = b. Pede o fator sem colunas deficientes. */
export function resolverLUEsparso(f, b) {
  const { n, ordem, pinv, Lp, Li, Lx, Up, Ui, Ux } = f;
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) y[pinv[i]] = b[i];
  for (let j = 0; j < n; j++) { const v = y[j]; if (v === 0) continue; for (let p = Lp[j] + 1; p < Lp[j + 1]; p++) y[Li[p]] -= Lx[p] * v; }
  for (let j = n - 1; j >= 0; j--) {
    const v = (y[j] /= diagonalDeU(f, j)); if (v === 0) continue;
    for (let p = Up[j]; p < Up[j + 1] - 1; p++) y[Ui[p]] -= Ux[p] * v;
  }
  const xs = new Array(n);
  for (let k = 0; k < n; k++) xs[ordem[k]] = y[k];
  return xs;
}

/** resolverLUEsparsoTransposta(fator, b) -> x com Aᵀ x = b */
export function resolverLUEsparsoTransposta(f, b) {
  const { n, ordem, pinv, Lp, Li, Lx, Up, Ui, Ux } = f;
  const y = new Float64Array(n);
  for (let k = 0; k < n; k++) y[k] = b[ordem[k]];
  /* Uᵀ z = Qᵀ b, para frente */
  for (let j = 0; j < n; j++) {
    let s = y[j];
    for (let p = Up[j]; p < Up[j + 1] - 1; p++) s -= Ux[p] * y[Ui[p]];
    y[j] = s / diagonalDeU(f, j);
  }
  /* Lᵀ w = z, para trás */
  for (let j = n - 1; j >= 0; j--) {
    let s = y[j];
    for (let p = Lp[j] + 1; p < Lp[j + 1]; p++) s -= Lx[p] * y[Li[p]];
    y[j] = s;
  }
  const xs = new Array(n);
  for (let i = 0; i < n; i++) xs[i] = y[pinv[i]];
  return xs;
}

/** baseDoNucleo(fator, { relativo }) -> a lista dos índices (na numeração original) em que algum vetor da base do núcleo de A passa de
 *  `relativo` vezes o maior módulo dele. Cada coluna deficiente d dá o vetor e_d − y, com y a combinação das colunas com pivô que a
 *  reproduz (a parte de U acima da diagonal dela, resolvida pelo bloco triangular). A união dos suportes não depende da base escolhida,
 *  e por isso não depende da ordem de eliminação. */
export function baseDoNucleo(f, { relativo = 1e-9 } = {}) {
  const { n, ordem, Up, Ui, Ux, deficientes } = f;
  const eDeficiente = new Uint8Array(n); for (const d of deficientes) eDeficiente[d] = 1;
  const envolvidos = new Set();
  for (const d of deficientes) {
    const y = new Float64Array(n);
    for (let p = Up[d]; p < Up[d + 1]; p++) y[Ui[p]] = -Ux[p];
    for (let j = d - 1; j >= 0; j--) {
      if (eDeficiente[j]) { y[j] = 0; continue; }
      const v = (y[j] /= diagonalDeU(f, j)); if (v === 0) continue;
      for (let p = Up[j]; p < Up[j + 1] - 1; p++) y[Ui[p]] -= Ux[p] * v;
    }
    y[d] = 1;
    let maior = 0; for (const v of y) maior = Math.max(maior, Math.abs(v));
    for (let k = 0; k < n; k++) if (Math.abs(y[k]) > relativo * maior) envolvidos.add(ordem[k]);
  }
  return [...envolvidos].sort((a, b) => a - b);
}

/** fatorarSelaPorSchur(H, linhasDeG) -> { resolver(f, g) -> { x, mu }, nucleo: null } | { nucleo: [s, ...] } | null
 *  O sistema de ponto de sela [H Gᵀ; G 0] [x; μ] = [f; g], com H simétrica positiva definida (n × n) e G dada por linhas esparsas
 *  [[coluna, valor], ...], pelo complemento de Schur: Y = H⁻¹ Gᵀ coluna a coluna pelo Cholesky esparso de H, S = G Y (denso, uma linha
 *  e uma coluna por restrição) pelo LU com pivô parcial em ordem natural, e então μ = S⁻¹ (G H⁻¹ f − g) e x = H⁻¹ (f − Gᵀ μ). O LU esparso
 *  do sistema inteiro enche demais, porque as linhas das restrições não têm diagonal (medido no banco de provas do ajuste esparso).
 *  `resolver(f, g, { refinar })` faz `refinar` passos de refinamento iterativo sobre o sistema inteiro. Devolve null quando o Cholesky de H para. Quando S é singular, as restrições não são independentes, o núcleo do sistema é
 *  {(0, μ) : Gᵀ μ = 0} e `nucleo` traz os índices das restrições na união dos suportes da base dele. */
export function fatorarSelaPorSchur(H, linhasDeG, { pivoNulo = 1e-12 } = {}) {
  const n = H.n; const m = linhasDeG.length;
  const fator = fatorarCholesky(H);
  if (fator.naoPositivaEm !== undefined) return null;
  const e = new Array(n).fill(0);
  const Y = linhasDeG.map((l) => { for (const [c, w] of l) e[c] += w; const y = resolverCholesky(fator, e); for (const [c] of l) e[c] = 0; return y; });
  const S = matrizPorLinhas(m);
  for (let s = 0; s < m; s++) for (let t = 0; t < m; t++) { let v = 0; for (const [c, w] of linhasDeG[s]) v += w * Y[t][c]; if (v !== 0) S.somar(s, t, v); }
  const fS = fatorarLUEsparso(S, { ordem: Int32Array.from({ length: m }, (_, k) => k), limiar: 1, pivoNulo });
  if (fS.deficientes.length) return { nucleo: baseDoNucleo(fS) };
  const uma = (f, g) => {
    const xh = resolverCholesky(fator, f);
    const r = linhasDeG.map((l, s) => { let v = -g[s]; for (const [c, w] of l) v += w * xh[c]; return v; });
    const mu = resolverLUEsparso(fS, r);
    /* x = H⁻¹ (f − Gᵀ μ): uma segunda resolução custa menos que o produto por Y, que é denso */
    const fg = f.slice();
    linhasDeG.forEach((l, s) => { const v = mu[s]; if (v !== 0) for (const [c, w] of l) fg[c] -= w * v; });
    return { x: resolverCholesky(fator, fg), mu };
  };
  /* o refinamento iterativo sobre o sistema inteiro: com H perto de singular (a energia de curvatura com o resto de 1e-9 na diagonal) o
     complemento de Schur perde dígitos, e cada passo resolve de novo o resíduo [f − H x − Gᵀ μ; g − G x] e soma a correção */
  const resolver = (f, g, { refinar = 0 } = {}) => {
    const z = uma(f, g);
    for (let passo = 0; passo < refinar; passo++) {
      const rx = f.slice(); const rg = g.slice();
      for (let r = 0; r < n; r++) { let v = 0; for (const [c, w] of H.linhas[r]) v += w * z.x[c]; rx[r] -= v; }
      linhasDeG.forEach((l, s) => { for (const [c, w] of l) { rx[c] -= w * z.mu[s]; rg[s] -= w * z.x[c]; } });
      const d = uma(rx, rg);
      for (let k = 0; k < n; k++) z.x[k] += d.x[k];
      for (let s = 0; s < m; s++) z.mu[s] += d.mu[s];
    }
    return z;
  };
  return { resolver, nucleo: null, naoNulos: fator.naoNulos + fS.naoNulos };
}
