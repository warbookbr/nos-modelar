/* gaiola-por-rede-liso.js — o miolo dos retalhos alisado pela normal, para a tangente não quebrar nas curvas compartilhadas
 *
 * Função pura, sem Three.js e sem domínio. O preenchimento de Coons de cada retalho passa pelas curvas, mas dois retalhos vizinhos só se
 * encontram em posição (C0): a inclinação com que cada um sai da curva é a que o retalho tira das quatro curvas dele, e a gaiola chega à
 * subdivisão com uma dobra de alguns graus ao longo da curva compartilhada. A subdivisão alisa essa dobra e a deixa como um calombo de
 * algumas décimas de milímetro, proporcional à dobra e ao tamanho da face (0,43 mm na chapa de prova, com a face de 40 mm). Esta função tira
 * a dobra da gaiola antes: mexe só nos pontos que o chamador marca como livres (o miolo dos retalhos de quatro lados; as curvas ficam
 * onde estão), cada um ao longo da normal que o preenchimento lhe deu, por um deslocamento escalar h.
 *
 * A energia. O laplaciano discreto L de um ponto é o desvio dele à média ponderada dos vizinhos, com peso 1/comprimento (a segunda
 * diferença de uma grade irregular). Dividido pela escala do ponto (a soma dos comprimentos das arestas sobre a soma dos pesos), vale
 * metade da curvatura numa forma quadrática, qualquer que seja o espaçamento. Minimizar a soma dos L ao quadrado é o alisamento de placa
 * fina, que acha a superfície mais lisa pelas curvas mas achata a curvatura (uma calota sai plana) e perde a inclinação da borda. Aqui a
 * energia é a variação do laplaciano: a soma, sobre as arestas da gaiola, do quadrado da diferença entre os L das duas pontas. Ela é zero
 * para qualquer forma de laplaciano constante, as quadráticas entre elas, e por isso mantém a curvatura que o preenchimento deu; uma dobra
 * ao longo de uma curva é um salto do L ali, e é isso que a energia tira. Os pontos que o chamador marca como pulados não têm L e as arestas
 * deles ficam fora da soma: a borda livre (sem vizinhos do outro lado), o vinco (a dobra declarada continua dobra, e cada lado dele se
 * alisa sozinho) e os vértices de valência diferente de 4, onde a vizinhança não é a de uma grade. Na calota de prova de um retalho de cinco
 * lados com o centro livre, o alisamento deslocava o centro 15 mm; com o centro e os retalhos de n lados fora, nada se mexe neles.
 *
 * Uma âncora pequena (0,1‰ da maior diagonal do sistema por padrão) prende cada ponto à posição que o preenchimento lhe deu, e dá ao
 * sistema uma solução única. Na chapa de prova, sem âncora (1e-9) o maior deslocamento é 1,7 mm; com 1e-4, 0,85 mm, e a leitura de ondulação
 * dá 0,17 mm; com 2e-3 o deslocamento cai a 0,37 mm, mas a âncora também segura o salto que se quer tirar e a leitura sobe a 0,27 mm. O desvio
 * médio à forma desenhada fica em 0,23 a 0,25 mm nos três, e na energia de placa fina sobe a 0,57 mm.
 *
 * O deslocamento é linear em h para as normais dadas; a normal se refaz e o sistema se resolve de novo `iteracoes` vezes. O sistema
 * normal é esparso e simétrico e se resolve por gradiente conjugado com pré-condicionador de Jacobi, em ordem fixa de pontos e de
 * vizinhos, de modo que a mesma gaiola dá a mesma saída. */

const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const norma = (u) => Math.hypot(u[0], u[1], u[2]);
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];

/* Normais dos vértices: a soma das normais de Newell das faces que os tocam, normalizada. */
function normaisDosVertices(P, F) {
  const n = P.map(() => [0, 0, 0]);
  for (const f of F) {
    const m = [0, 0, 0];
    for (let k = 0; k < f.length; k++) {
      const a = P[f[k]]; const b = P[f[(k + 1) % f.length]];
      m[0] += (a[1] - b[1]) * (a[2] + b[2]); m[1] += (a[2] - b[2]) * (a[0] + b[0]); m[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    for (const v of f) { n[v][0] += m[0]; n[v][1] += m[1]; n[v][2] += m[2]; }
  }
  return n.map((m) => { const l = norma(m); return l > 0 ? [m[0] / l, m[1] / l, m[2] / l] : [0, 0, 0]; });
}

/* O sistema normal por gradiente conjugado com pré-condicionador de Jacobi. `colunas[i]` é a linha esparsa i, como pares [coluna, valor]
   em ordem de coluna; `diag` é a diagonal do pré-condicionador (já com a folga) e `folga` a âncora somada à diagonal do sistema.
   As colunas esparsas vão para vetores de números (CSR) e os vetores do laço são `Float64Array`, com as MESMAS somas na mesma ordem
   de antes (a de `reduce` da esquerda para a direita), de modo que o resultado é o mesmo bit a bit; o que muda é que cada volta do
   laço deixa de alocar uma dúzia de listas (era a maior parte do tempo do alisamento, medido em 2026-10-28). */
export function gradienteConjugado(colunas, diag, folga, b) {
  const m = colunas.length;
  const inicio = new Int32Array(m + 1);
  colunas.forEach((c, i) => { inicio[i + 1] = inicio[i] + c.length; });
  const coluna = new Int32Array(inicio[m]);
  const valor = new Float64Array(inicio[m]);
  colunas.forEach((c, i) => c.forEach(([j, v], k) => { coluna[inicio[i] + k] = j; valor[inicio[i] + k] = v; }));
  return gradienteConjugadoCSR(inicio, coluna, valor, diag, folga, b);
}

function gradienteConjugadoCSR(inicio, coluna, valor, diag, folga, b) {
  const m = inicio.length - 1;
  const h = new Float64Array(m);
  const r = Float64Array.from(b);
  const z = new Float64Array(m);
  for (let i = 0; i < m; i++) z[i] = r[i] / diag[i];
  const pv = Float64Array.from(z);
  const Ap = new Float64Array(m);
  let rz = 0; for (let i = 0; i < m; i++) rz += r[i] * z[i];
  let bb = 0; for (let i = 0; i < m; i++) bb += b[i] * b[i];
  const limite = 1e-20 * (bb || 1);
  let rr = 0; for (let i = 0; i < m; i++) rr += r[i] * r[i];
  /* Cada soma que antes era um laço próprio (|r|², p·Ap, r·z) vai dentro do laço que produz as parcelas, na mesma ordem de
     índice, e portanto com o mesmo resultado. */
  for (let it = 0; it < 8 * m + 100; it++) {
    if (rr <= limite) break;
    let pAp = 0;
    for (let i = 0; i < m; i++) {
      let t = folga * pv[i];
      for (let k = inicio[i]; k < inicio[i + 1]; k++) t += valor[k] * pv[coluna[k]];
      Ap[i] = t;
      pAp += pv[i] * t;
    }
    const alfa = rz / pAp;
    let rzNovo = 0; rr = 0;
    for (let i = 0; i < m; i++) {
      h[i] += alfa * pv[i];
      const ri = r[i] - alfa * Ap[i];
      r[i] = ri;
      const zi = ri / diag[i];
      z[i] = zi;
      rzNovo += ri * zi;
      rr += ri * ri;
    }
    const beta = rzNovo / rz;
    for (let i = 0; i < m; i++) pv[i] = z[i] + beta * pv[i];
    rz = rzNovo;
  }
  return h;
}

/* Acima deste número de pontos livres o sistema deixa de caber numa matriz densa de montagem (m² números) e a montagem volta aos mapas. */
const LIMITE_DENSO = 1500;

/**
 * alisarMioloNaNormal(posicoes, faces, livres, pulados, { iteracoes, energia }) -> { posicoes, deslocamentoMaximo, iteracoes }
 *   posicoes: [[x, y, z]] da gaiola; faces: índices; livres: Set dos pontos que se mexem; pulados: Set dos pontos sem laplaciano (borda
 *   livre e vinco, que o chamador marca). energia: 'variacao' (padrão) ou 'placa'. Devolve as posições novas, sem mexer nas dadas.
 *   `limiteDenso` (só para o teste de equivalência) é o número de livres até o qual o sistema se monta em matriz densa.
 */
export function alisarMioloNaNormal(posicoes, faces, livres, pulados, { iteracoes = 2, energia = 'variacao', ancora = 1e-4, limiteDenso = LIMITE_DENSO } = {}) {
  const n = posicoes.length;
  const viz = Array.from({ length: n }, () => new Set());
  for (const f of faces) for (let k = 0; k < f.length; k++) { const a = f[k]; const b = f[(k + 1) % f.length]; viz[a].add(b); viz[b].add(a); }
  const vizinhos = viz.map((s) => [...s].sort((a, b) => a - b));
  const lista = [...livres].sort((a, b) => a - b);
  const indiceDoLivre = new Map(lista.map((v, i) => [v, i]));
  const denso = lista.length <= limiteDenso;
  let P = posicoes.map((p) => [...p]);
  let maior = 0;
  for (let volta = 0; volta < iteracoes; volta++) {
    const N = normaisDosVertices(P, faces);
    const h = denso
      ? resolverVoltaDensa({ P, N, n, vizinhos, pulados, lista, indiceDoLivre, energia, ancora })
      : resolverVoltaPorMapas({ P, N, n, vizinhos, pulados, lista, indiceDoLivre, energia, ancora });
    const novo = P.map((q) => [...q]);
    lista.forEach((v, i) => {
      novo[v] = [P[v][0] + h[i] * N[v][0], P[v][1] + h[i] * N[v][1], P[v][2] + h[i] * N[v][2]];
      maior = Math.max(maior, norma(sub(novo[v], posicoes[v])));
    });
    P = novo;
  }
  return { posicoes: P, deslocamentoMaximo: maior, iteracoes };
}

/* O deslocamento h de uma volta, com o sistema montado em mapas (a montagem de antes, para os sistemas grandes demais para a densa). */
function resolverVoltaPorMapas({ P, N, n, vizinhos, pulados, lista, indiceDoLivre, energia, ancora }) {
  /* o laplaciano de cada ponto que tem um: o valor L0 de agora e o coeficiente de cada ponto livre sobre o seu h */
  const L = new Array(n).fill(null);
  for (let s = 0; s < n; s++) {
    if (pulados.has(s) || !vizinhos[s].length) continue;
    const dists = vizinhos[s].map((j) => norma(sub(P[j], P[s])));
    const pesos = dists.map((d) => 1 / d);
    const total = pesos.reduce((x, y) => x + y, 0);
    /* a escala do ponto: L vale (curvatura / 2) vezes ela numa forma quadrática, qualquer que seja o espaçamento e a valência */
    const escala = energia === 'placa' ? 1 : dists.reduce((x, y) => x + y, 0) / total;
    const L0 = [0, 0, 0]; const coef = new Map();
    vizinhos[s].forEach((j, k) => {
      const a = pesos[k] / total / escala;
      L0[0] += a * (P[j][0] - P[s][0]); L0[1] += a * (P[j][1] - P[s][1]); L0[2] += a * (P[j][2] - P[s][2]);
      if (indiceDoLivre.has(j)) coef.set(indiceDoLivre.get(j), (coef.get(indiceDoLivre.get(j)) ?? 0) + a);
    });
    if (indiceDoLivre.has(s)) coef.set(indiceDoLivre.get(s), (coef.get(indiceDoLivre.get(s)) ?? 0) - 1 / escala);
    L[s] = { L0, coef };
  }
  /* os termos da energia: o próprio L (placa) ou a diferença dos L nas pontas de cada aresta (variação) */
  const termos = [];
  if (energia === 'placa') {
    for (let s = 0; s < n; s++) if (L[s]) termos.push({ peso: 1, L0: L[s].L0, coef: L[s].coef });
  } else {
    for (let s = 0; s < n; s++) {
      if (!L[s]) continue;
      for (const t of vizinhos[s]) {
        if (t < s || !L[t]) continue;
        const peso = 1;
        const coef = new Map(L[s].coef);
        for (const [u, c] of L[t].coef) coef.set(u, (coef.get(u) ?? 0) - c);
        termos.push({ peso, L0: sub(L[s].L0, L[t].L0), coef });
      }
    }
  }
  const linhas = lista.map(() => new Map());
  const b = new Array(lista.length).fill(0);
  for (const { peso, L0, coef } of termos) {
    const itens = [...coef].filter(([, c]) => c !== 0).sort((x, y) => x[0] - y[0]);
    for (const [u, cu] of itens) {
      const nu = N[lista[u]];
      b[u] -= peso * cu * dot(nu, L0);
      for (const [v, cv] of itens) linhas[u].set(v, (linhas[u].get(v) ?? 0) + peso * cu * cv * dot(nu, N[lista[v]]));
    }
  }
  /* gradiente conjugado, com Jacobi, na ordem fixa dos pontos e das colunas */
  const colunas = linhas.map((m) => [...m].sort((x, y) => x[0] - y[0]));
  const escala = colunas.reduce((m, c, i) => Math.max(m, ...c.filter(([j]) => j === i).map(([, v]) => v)), 0) || 1;
  const folga = ancora * escala;
  const diag = colunas.map((c, i) => { const d = c.find(([j]) => j === i); return (d ? d[1] : 0) + folga; });
  return gradienteConjugado(colunas, diag, folga, b);
}

/* O mesmo deslocamento h, com a montagem em vetores de números e uma matriz densa de acumulação (m² números, m = pontos livres).
   Cada conta é a de `resolverVoltaPorMapas`, na mesma ordem: os termos na ordem das arestas, os coeficientes de cada termo em
   ordem de índice, e cada célula da matriz soma as parcelas na ordem em que os termos chegam (começando de zero, como o mapa
   começava de `?? 0`). Uma célula tocada conta como presente mesmo que a soma dê zero, como a entrada do mapa contava. */
function resolverVoltaDensa({ P, N, n, vizinhos, pulados, lista, indiceDoLivre, energia, ancora }) {
  const m = lista.length;
  const idxLivre = new Int32Array(n).fill(-1);
  for (const [v, i] of indiceDoLivre) idxLivre[v] = i;
  const NL = new Float64Array(3 * m);
  lista.forEach((v, u) => { NL[3 * u] = N[v][0]; NL[3 * u + 1] = N[v][1]; NL[3 * u + 2] = N[v][2]; });
  /* o laplaciano de cada ponto que tem um: L0 em três números e os coeficientes (índice livre, valor) em ordem de inserção */
  const tem = new Uint8Array(n);
  const L0 = new Float64Array(3 * n);
  const ini = new Int32Array(n + 1);
  const cIdx = []; const cVal = [];
  for (let s = 0; s < n; s++) {
    ini[s + 1] = ini[s];
    const vs = vizinhos[s];
    if (pulados.has(s) || !vs.length) continue;
    const dists = vs.map((j) => Math.hypot(P[j][0] - P[s][0], P[j][1] - P[s][1], P[j][2] - P[s][2]));
    const pesos = dists.map((d) => 1 / d);
    const total = pesos.reduce((x, y) => x + y, 0);
    const escala = energia === 'placa' ? 1 : dists.reduce((x, y) => x + y, 0) / total;
    let l0 = 0; let l1 = 0; let l2 = 0;
    for (let k = 0; k < vs.length; k++) {
      const j = vs[k];
      const a = pesos[k] / total / escala;
      l0 += a * (P[j][0] - P[s][0]); l1 += a * (P[j][1] - P[s][1]); l2 += a * (P[j][2] - P[s][2]);
      if (idxLivre[j] >= 0) { cIdx.push(idxLivre[j]); cVal.push(0 + a); }
    }
    if (idxLivre[s] >= 0) { cIdx.push(idxLivre[s]); cVal.push(0 - 1 / escala); }
    L0[3 * s] = l0; L0[3 * s + 1] = l1; L0[3 * s + 2] = l2;
    tem[s] = 1; ini[s + 1] = cIdx.length;
  }
  const A = new Float64Array(m * m); const ocupada = new Uint8Array(m * m);
  const b = new Float64Array(m);
  const acc = new Float64Array(m); const marca = new Int32Array(m); const tocados = new Int32Array(m); const itens = new Int32Array(m);
  let carimbo = 0;
  const termo = (L0a, L0b, nTocados) => {
    /* os itens: os coeficientes não nulos, em ordem de índice */
    let q = 0;
    for (let i = 0; i < nTocados; i++) if (acc[tocados[i]] !== 0) itens[q++] = tocados[i];
    const ordenados = itens.subarray(0, q).sort();
    const d0 = L0a[0] - L0b[0]; const d1 = L0a[1] - L0b[1]; const d2 = L0a[2] - L0b[2];
    for (let a = 0; a < q; a++) {
      const u = ordenados[a]; const cu = acc[u];
      const nu0 = NL[3 * u]; const nu1 = NL[3 * u + 1]; const nu2 = NL[3 * u + 2];
      b[u] -= 1 * cu * (nu0 * d0 + nu1 * d1 + nu2 * d2);
      const base = u * m;
      for (let c = 0; c < q; c++) {
        const v = ordenados[c];
        A[base + v] += 1 * cu * acc[v] * (nu0 * NL[3 * v] + nu1 * NL[3 * v + 1] + nu2 * NL[3 * v + 2]);
        ocupada[base + v] = 1;
      }
    }
  };
  const doPonto = (s) => [L0[3 * s], L0[3 * s + 1], L0[3 * s + 2]];
  for (let s = 0; s < n; s++) {
    if (!tem[s]) continue;
    if (energia === 'placa') {
      carimbo += 1; let nT = 0;
      for (let e = ini[s]; e < ini[s + 1]; e++) { const u = cIdx[e]; acc[u] = cVal[e]; marca[u] = carimbo; tocados[nT++] = u; }
      termo(doPonto(s), [0, 0, 0], nT);
      continue;
    }
    for (const t of vizinhos[s]) {
      if (t < s || !tem[t]) continue;
      carimbo += 1; let nT = 0;
      for (let e = ini[s]; e < ini[s + 1]; e++) { const u = cIdx[e]; acc[u] = cVal[e]; marca[u] = carimbo; tocados[nT++] = u; }
      for (let e = ini[t]; e < ini[t + 1]; e++) {
        const u = cIdx[e];
        if (marca[u] === carimbo) acc[u] = acc[u] - cVal[e];
        else { acc[u] = 0 - cVal[e]; marca[u] = carimbo; tocados[nT++] = u; }
      }
      termo(doPonto(s), doPonto(t), nT);
    }
  }
  /* o sistema em colunas esparsas (CSR), na ordem de coluna */
  const inicio = new Int32Array(m + 1);
  for (let u = 0; u < m; u++) {
    let q = 0; const base = u * m;
    for (let v = 0; v < m; v++) if (ocupada[base + v]) q++;
    inicio[u + 1] = inicio[u] + q;
  }
  const coluna = new Int32Array(inicio[m]); const valor = new Float64Array(inicio[m]);
  let escalaDoSistema = 0; const diagonal = new Float64Array(m); const temDiagonal = new Uint8Array(m);
  for (let u = 0; u < m; u++) {
    let k = inicio[u]; const base = u * m;
    for (let v = 0; v < m; v++) {
      if (!ocupada[base + v]) continue;
      coluna[k] = v; valor[k] = A[base + v]; k++;
      if (v === u) { diagonal[u] = A[base + v]; temDiagonal[u] = 1; escalaDoSistema = Math.max(escalaDoSistema, A[base + v]); }
    }
  }
  const escala = escalaDoSistema || 1;
  const folga = ancora * escala;
  const diag = new Float64Array(m);
  for (let u = 0; u < m; u++) diag[u] = (temDiagonal[u] ? diagonal[u] : 0) + folga;
  return gradienteConjugadoCSR(inicio, coluna, valor, diag, folga, b);
}
