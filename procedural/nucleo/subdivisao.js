/* subdivisao.js — superfície de subdivisão Catmull-Clark com vincos
 *
 * Função pura, sem Three.js e sem estado: recebe uma gaiola poligonal (vértices e faces por índice), os vincos
 * (arestas com nitidez) e o número de níveis, e devolve a malha refinada. A regra segue a de OpenSubdiv no modo
 * uniforme, que é a que o modificador Subdivision Surface do Blender usa com "use_limit_surface" desligado:
 *
 *   ponto de face   = média dos vértices da face;
 *   ponto de aresta = (a + b + f1 + f2) / 4 na aresta lisa, (a + b) / 2 na aresta viva, e a mistura linear pela
 *                     nitidez quando 0 < nitidez < 1; aresta de borda ou com mais de duas faces é sempre viva;
 *   ponto de vértice = regra lisa (Q + 2R + (n - 3)P) / n com nenhuma ou uma aresta viva, regra de vinco
 *                     (6P + A + B) / 8 com duas, canto (P) com três ou mais ou quando o vértice é canto declarado;
 *                     quando a regra muda de um nível para o seguinte, o resultado mistura as duas regras pelo peso
 *                     fracionário (média das nitidezes que se apagam);
 *   nitidez do filho = nitidez do pai menos um (método uniforme), e as arestas novas, de dentro das faces, são lisas.
 *
 * A borda segue o Blender: `borda: 'suave'` (padrão, "All" no Blender) deixa o vértice de borda com duas arestas na
 * regra de vinco; `borda: 'cantos'` ("Keep Corners") faz canto do vértice de borda que só tem uma face.
 *
 * Nitidez de NITIDEZ_VIVA (10) para cima é vinco vivo, que nunca se apaga, como em OpenSubdiv (Sdc::Crease, em que
 * SHARPNESS_INFINITE = 10 e IsInfinite(s) é s >= 10). O vinco do Blender e a nitidez da receita, de 0 a 1, viram nitidez
 * em níveis por `nitidezDoVinco(c) = 10 c²`, a conversão do Blender; por isso o vinco 1 do Blender é vivo, e a superfície
 * limite do Blender com vinco 1 só confere com a do núcleo quando a nitidez 10 conta como viva. `'viva'` é a escrita
 * explícita do mesmo vinco vivo.
 *
 * A ordem da saída é determinística: primeiro os pontos de vértice (na ordem da gaiola), depois os de aresta (na
 * ordem em que as arestas aparecem varrendo as faces) e por fim os de face; cada face de k lados vira k quads
 * [vértice, aresta seguinte, face, aresta anterior], com a orientação da face de origem.
 */

export const NITIDEZ_INFINITA = Infinity;
export const NITIDEZ_VIVA = 10;

/** nitidezDoVinco(c) -> nitidez em níveis: c de 0 a 1 (vinco do Blender ou nitidez da receita) vira 10 c², e 1 ou
 *  'viva' vira vinco vivo. */
export function nitidezDoVinco(c) {
  if (c === 'viva') return NITIDEZ_INFINITA;
  const v = Math.max(0, Math.min(1, Number(c)));
  return v >= 1 ? NITIDEZ_INFINITA : NITIDEZ_VIVA * v * v;
}

const chave = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);

function validar(vertices, faces, vincos, niveis) {
  if (!Array.isArray(vertices) || !vertices.length) throw new TypeError('subdivisão: gaiola sem vértices');
  for (const [k, v] of vertices.entries()) {
    if (!Array.isArray(v) || v.length !== 3 || v.some((c) => !Number.isFinite(c))) throw new TypeError(`subdivisão: vértice ${k} precisa ser [x,y,z] finito`);
  }
  if (!Array.isArray(faces) || !faces.length) throw new TypeError('subdivisão: gaiola sem faces');
  for (const [k, f] of faces.entries()) {
    if (!Array.isArray(f) || f.length < 3) throw new TypeError(`subdivisão: face ${k} precisa de 3 ou mais vértices`);
    if (new Set(f).size !== f.length) throw new TypeError(`subdivisão: face ${k} repete vértice`);
    for (const i of f) if (!Number.isInteger(i) || i < 0 || i >= vertices.length) throw new TypeError(`subdivisão: face ${k} cita vértice inexistente ${i}`);
  }
  if (!Number.isInteger(niveis) || niveis < 0 || niveis > 6) throw new TypeError('subdivisão: niveis precisa ser inteiro de 0 a 6');
  if (!Array.isArray(vincos)) throw new TypeError('subdivisão: vincos precisa ser lista [a, b, nitidez]');
}

function arestasDa(faces) {
  const arestas = []; const indice = new Map();
  faces.forEach((f, fi) => {
    for (let k = 0; k < f.length; k++) {
      const a = f[k], b = f[(k + 1) % f.length], c = chave(a, b);
      let e = indice.get(c);
      if (e === undefined) { e = arestas.length; indice.set(c, e); arestas.push({ a, b, faces: [] }); }
      arestas[e].faces.push(fi);
    }
  });
  return { arestas, indice };
}

/* Um nível de refinamento. `nitidez` é um Map chave->nitidez; `cantos` é um Set de índices. */
function refinar(V, F, nitidez, cantos, borda) {
  const { arestas, indice } = arestasDa(F);
  const nV = V.length, nE = arestas.length;
  const s = arestas.map((e) => (e.faces.length !== 2 ? NITIDEZ_INFINITA : (nitidez.get(chave(e.a, e.b)) ?? 0)));
  const pontoFace = F.map((f) => {
    const p = [0, 0, 0]; for (const i of f) { p[0] += V[i][0]; p[1] += V[i][1]; p[2] += V[i][2]; }
    return [p[0] / f.length, p[1] / f.length, p[2] / f.length];
  });
  const pontoAresta = arestas.map((e, k) => {
    const A = V[e.a], B = V[e.b];
    const vivo = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
    if (s[k] >= 1) return vivo;
    const f1 = pontoFace[e.faces[0]], f2 = pontoFace[e.faces[1]];
    const liso = [(A[0] + B[0] + f1[0] + f2[0]) / 4, (A[1] + B[1] + f1[1] + f2[1]) / 4, (A[2] + B[2] + f1[2] + f2[2]) / 4];
    if (s[k] <= 0) return liso;
    return liso.map((c, j) => c + (vivo[j] - c) * s[k]);
  });
  // incidência por vértice, na ordem das arestas
  const incid = Array.from({ length: nV }, () => []);
  arestas.forEach((e, k) => { incid[e.a].push(k); incid[e.b].push(k); });
  const facesDoV = Array.from({ length: nV }, () => []);
  F.forEach((f, fi) => { for (const i of f) facesDoV[i].push(fi); });

  const regra = (P, i, nitidezes) => {
    const vivas = incid[i].filter((k, j) => nitidezes[j] > 0);
    const ehCanto = cantos.has(i) || (borda === 'cantos' && facesDoV[i].length === 1 && incid[i].some((k) => arestas[k].faces.length === 1));
    if (ehCanto || vivas.length >= 3) return { tipo: 'canto', pos: P };
    if (vivas.length === 2) {
      const outro = (k) => (arestas[k].a === i ? V[arestas[k].b] : V[arestas[k].a]);
      const A = outro(vivas[0]), B = outro(vivas[1]);
      return { tipo: 'vinco', pos: [(6 * P[0] + A[0] + B[0]) / 8, (6 * P[1] + A[1] + B[1]) / 8, (6 * P[2] + A[2] + B[2]) / 8] };
    }
    const n = incid[i].length;
    if (facesDoV[i].length === 0 || n < 2) return { tipo: 'canto', pos: P };
    const Q = [0, 0, 0]; for (const fi of facesDoV[i]) { Q[0] += pontoFace[fi][0]; Q[1] += pontoFace[fi][1]; Q[2] += pontoFace[fi][2]; }
    const nf = facesDoV[i].length; Q[0] /= nf; Q[1] /= nf; Q[2] /= nf;
    const Rm = [0, 0, 0];
    for (const k of incid[i]) { const e = arestas[k]; Rm[0] += (V[e.a][0] + V[e.b][0]) / 2; Rm[1] += (V[e.a][1] + V[e.b][1]) / 2; Rm[2] += (V[e.a][2] + V[e.b][2]) / 2; }
    Rm[0] /= n; Rm[1] /= n; Rm[2] /= n;
    return { tipo: 'liso', pos: [(Q[0] + 2 * Rm[0] + (n - 3) * P[0]) / n, (Q[1] + 2 * Rm[1] + (n - 3) * P[1]) / n, (Q[2] + 2 * Rm[2] + (n - 3) * P[2]) / n] };
  };
  const ordem = { liso: 0, vinco: 1, canto: 2 };
  const pontoVertice = V.map((P, i) => {
    const pais = incid[i].map((k) => s[k]);
    const filhos = pais.map((x) => (x === NITIDEZ_INFINITA ? x : Math.max(0, x - 1)));
    const rp = regra(P, i, pais);
    const rf = regra(P, i, filhos);
    if (rp.tipo === rf.tipo || ordem[rp.tipo] < ordem[rf.tipo]) return rp.pos;
    // transição: peso fracionário = média das nitidezes que deixam de ser vivas neste nível
    let soma = 0, cont = 0;
    pais.forEach((x, j) => { if (x > 0 && filhos[j] <= 0) { soma += x; cont += 1; } });
    const w = cont ? Math.min(1, soma / cont) : 1;
    return rp.pos.map((c, j) => w * c + (1 - w) * rf.pos[j]);
  });

  const Vn = [...pontoVertice, ...pontoAresta, ...pontoFace];
  const iE = (a, b) => nV + indice.get(chave(a, b));
  const iF = (fi) => nV + nE + fi;
  const Fn = []; const nitidezN = new Map();
  F.forEach((f, fi) => {
    for (let k = 0; k < f.length; k++) {
      const v = f[k], prox = f[(k + 1) % f.length], ant = f[(k - 1 + f.length) % f.length];
      Fn.push([v, iE(v, prox), iF(fi), iE(ant, v)]);
    }
  });
  arestas.forEach((e, k) => {
    const filho = s[k] === NITIDEZ_INFINITA ? NITIDEZ_INFINITA : Math.max(0, s[k] - 1);
    if (filho > 0 && e.faces.length === 2) {
      nitidezN.set(chave(e.a, nV + k), filho); nitidezN.set(chave(nV + k, e.b), filho);
    }
  });
  return { V: Vn, F: Fn, nitidez: nitidezN };
}

/**
 * subdividirCatmullClark({ vertices, faces, vincos, niveis, cantos, borda }) -> { vertices, faces }
 * vincos: lista de [a, b, nitidez] (nitidez em níveis; de NITIDEZ_VIVA para cima, ou NITIDEZ_INFINITA, é vinco vivo).
 * cantos: índices de vértice que ficam fixos (canto vivo).
 */
function nitidezDosVincos(faces, vincos) {
  const { indice } = arestasDa(faces);
  const nitidez = new Map();
  for (const [k, v] of vincos.entries()) {
    if (!Array.isArray(v) || v.length !== 3) throw new TypeError(`subdivisão: vinco ${k} precisa ser [a, b, nitidez]`);
    const [a, b, x] = v;
    if (!indice.has(chave(a, b))) throw new TypeError(`subdivisão: vinco ${k} cita a aresta ${a}-${b}, que não existe na gaiola`);
    if (!(x >= 0)) throw new TypeError(`subdivisão: vinco ${k} com nitidez inválida`);
    nitidez.set(chave(a, b), x >= NITIDEZ_VIVA ? NITIDEZ_INFINITA : x);
  }
  return nitidez;
}

export function subdividirCatmullClark({ vertices, faces, vincos = [], niveis = 1, cantos = [], borda = 'suave', aoLimite = false }) {
  validar(vertices, faces, vincos, niveis);
  if (borda !== 'suave' && borda !== 'cantos') throw new TypeError("subdivisão: borda precisa ser 'suave' ou 'cantos'");
  let nitidez = nitidezDosVincos(faces, vincos);
  let V = vertices.map((p) => [...p]); let F = faces.map((f) => [...f]);
  let C = new Set(cantos);
  for (let n = 0; n < niveis; n++) {
    const r = refinar(V, F, nitidez, C, borda);
    V = r.V; F = r.F; nitidez = r.nitidez; // os pontos de vértice mantêm o índice, então os cantos continuam válidos
  }
  /* aoLimite: cada vértice da malha final vai para o seu ponto limite, calculado com a nitidez que sobrou neste nível.
     O vértice i < vertices.length continua sendo o vértice i da gaiola, e o ponto limite dele é o da gaiola. */
  if (aoLimite) V = limitesInternos(V, F, nitidez, C, borda, facesPorVertice(V.length, F));
  return { vertices: V, faces: F };
}

/* ---- ponto limite e medidas ----
 *
 * A estrela de um vértice (as faces que o tocam) refina para a estrela do mesmo vértice no nível seguinte: o ponto de
 * vértice, os pontos das arestas que o tocam e os pontos das faces que o tocam só dependem dessas faces. Por isso o
 * ponto limite de um vértice da gaiola sai da estrela dele sozinha: ela é refinada com `refinar` até que nenhuma aresta
 * que toca o vértice guarde nitidez finita (no mínimo um nível, para que toda face vire quad), e então se aplica a
 * fórmula fechada do ponto limite de Catmull-Clark:
 *
 *   canto (canto declarado, três ou mais arestas vivas, ou vértice de face única com borda 'cantos'):  L = P;
 *   vinco ou borda (duas arestas vivas, A e B nas outras pontas; a borda é aresta viva):  L = (A + 4P + B) / 6;
 *   liso (nenhuma aresta viva), valência n, e_j as pontas das arestas e f_j os cantos opostos dos quads:
 *     L = (n² P + 4 Σ e_j + Σ f_j) / (n (n + 5)), que no vértice regular (n = 4) é a máscara 1-4-1 ao quadrado / 36.
 *
 * O dardo vivo (uma só aresta de nitidez infinita chegando a um vértice liso, que é o ponto onde um vinco termina)
 * não tem fórmula fechada confiável aqui: a máscara lisa aplicada a ele erra o ponto limite em 3,4e-2 m no cubo de 2 m
 * com uma aresta viva. Depois do refino, a estrela do dardo refina para uma estrela de mesma forma pela mesma matriz S,
 * e o ponto limite é l·estrela, com l o autovetor à esquerda de S para o autovalor 1 e soma 1 (l S = l). A matriz S sai
 * de `refinar` aplicado à base, e l sai de eliminação de Gauss, sem iteração. O dardo de nitidez finita não chega aí,
 * porque o refino apaga a nitidez antes.
 *
 * A nitidez finita conta inteira no limite (uma nitidez 9,5 é vinco por nove níveis e meio e liso depois), e por isso
 * o refino da estrela vai até ceil(nitidez) níveis, no máximo dez, porque de NITIDEZ_VIVA para cima o vinco é vivo. */

function estrelaDe(V, F, facesDoVertice, nitidez, i) {
  const mapa = new Map([[i, 0]]); const Vm = [V[i]]; const Fm = []; const globais = [i];
  for (const fi of facesDoVertice) {
    Fm.push(F[fi].map((j) => { let m = mapa.get(j); if (m === undefined) { m = Vm.length; mapa.set(j, m); Vm.push(V[j]); globais.push(j); } return m; }));
  }
  const nm = new Map();
  for (const [j, m] of mapa) { if (j === i) continue; const s = nitidez.get(chave(i, j)); if (s !== undefined) nm.set(chave(0, m), s); }
  return { V: Vm, F: Fm, nitidez: nm, globais };
}

/* Eliminação de Gauss com pivotamento parcial em ordem fixa: as colunas são eliminadas da primeira à última e, em cada
 * uma, o pivô é a linha de maior |valor| a partir da diagonal, com empate resolvido pela linha de menor índice. A mesma
 * matriz passa pelas mesmas operações na mesma ordem e dá o mesmo resultado bit a bit. Pivô de módulo até PIVO_NULO
 * para a fatoração e devolve a coluna em que ela parou. */
const PIVO_NULO = 1e-12;

function fatorarLU(A) {
  const n = A.length; const M = A.map((r) => [...r]); const perm = [...Array(n).keys()];
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let r = k + 1; r < n; r++) if (Math.abs(M[r][k]) > Math.abs(M[p][k])) p = r;
    if (Math.abs(M[p][k]) <= PIVO_NULO) return { M, perm, singularEm: k };
    if (p !== k) { [M[p], M[k]] = [M[k], M[p]]; [perm[p], perm[k]] = [perm[k], perm[p]]; }
    for (let r = k + 1; r < n; r++) {
      const f = M[r][k] / M[k][k]; M[r][k] = f;
      for (let c = k + 1; c < n; c++) M[r][c] -= f * M[k][c];
    }
  }
  return { M, perm, singularEm: -1 };
}

function resolverLU({ M, perm }, b) {
  const n = M.length; const y = perm.map((i) => b[i]);
  for (let r = 0; r < n; r++) for (let c = 0; c < r; c++) y[r] -= M[r][c] * y[c];
  for (let r = n - 1; r >= 0; r--) { for (let c = r + 1; c < n; c++) y[r] -= M[r][c] * y[c]; y[r] /= M[r][r]; }
  return y;
}

/* Vetor quase nulo da matriz cuja fatoração parou na coluna k: x_k = 1, x_j = 0 para j > k, e o bloco triangular de
 * cima resolve o resto. Os índices com |x_j| relevante são as incógnitas presas na dependência. */
function vetorNulo({ M }, k) {
  const x = new Array(M.length).fill(0); x[k] = 1;
  for (let r = k - 1; r >= 0; r--) { let s = -M[r][k]; for (let c = r + 1; c < k; c++) s -= M[r][c] * x[c]; x[r] = s / M[r][r]; }
  return x;
}

function limiteDoDardo(V, F, nitidez, borda) {
  const m = V.length; const { arestas } = arestasDa(F); const nE = arestas.length;
  const novo = new Array(m).fill(-1); novo[0] = 0;
  arestas.forEach((e, k) => { if (e.a === 0 || e.b === 0) novo[e.a === 0 ? e.b : e.a] = m + k; });
  F.forEach((q, fi) => {
    const d = q[(q.indexOf(0) + 2) % 4];
    if (q.length !== 4 || novo[d] !== -1) throw new TypeError('subdivisão: a estrela do dardo não é um leque de quads');
    novo[d] = m + nE + fi;
  });
  if (novo.includes(-1)) throw new TypeError('subdivisão: a estrela do dardo não é um leque de quads');
  const S = Array.from({ length: m }, () => new Array(m).fill(0));
  for (let b = 0; b < m; b += 3) {
    const base = V.map((_, c) => [c === b ? 1 : 0, c === b + 1 ? 1 : 0, c === b + 2 ? 1 : 0]);
    const r = refinar(base, F, nitidez, new Set(), borda);
    for (let t = 0; t < m; t++) for (let k = 0; k < 3 && b + k < m; k++) S[t][b + k] = r.V[novo[t]][k];
  }
  // l S = l com soma 1: (Sᵀ - I) l = 0, com a última equação trocada pela soma
  const A = Array.from({ length: m }, (_, c) => Array.from({ length: m }, (_, t) => (c === m - 1 ? 1 : S[t][c] - (t === c ? 1 : 0))));
  const lu = fatorarLU(A);
  if (lu.singularEm >= 0) throw new TypeError('subdivisão: a matriz de refino do dardo não tem autovetor único para o autovalor 1');
  const l = resolverLU(lu, A.map((_, c) => (c === m - 1 ? 1 : 0)));
  return [0, 1, 2].map((j) => { let soma = 0; for (let t = 0; t < m; t++) soma += l[t] * V[t][j]; return soma; });
}

const facesPorVertice = (nV, F) => {
  const r = Array.from({ length: nV }, () => []);
  F.forEach((f, fi) => { for (const i of f) r[i].push(fi); });
  return r;
};

function limiteDaEstrela(estrela, canto, borda) {
  let { V, F, nitidez } = estrela;
  if (!F.length) return [...V[0]];
  let maior = 0; for (const s of nitidez.values()) if (s !== NITIDEZ_INFINITA && s > maior) maior = s;
  /* Sem nitidez finita e com a estrela toda em quads, a fórmula vale já neste nível e o refino é dispensado; o dardo
     sempre refina um nível, porque a matriz dele pede a estrela de vértices distintos que o refino garante. */
  let niveis = Math.ceil(maior);
  if (niveis === 0) {
    const vivasAgora = arestasDa(F).arestas.filter((e) => (e.a === 0 || e.b === 0) && (e.faces.length !== 2 || (nitidez.get(chave(e.a, e.b)) ?? 0) > 0)).length;
    if (vivasAgora === 1 || F.some((f) => f.length !== 4)) niveis = 1;
  }
  const cantos = canto ? new Set([0]) : new Set();
  for (let n = 0; n < niveis; n++) {
    const r = refinar(V, F, nitidez, cantos, borda);
    ({ V, F, nitidez } = estrelaDe(r.V, r.F, facesPorVertice(r.V.length, r.F)[0], r.nitidez, 0));
  }
  const { arestas } = arestasDa(F);
  const incidentes = arestas.filter((e) => e.a === 0 || e.b === 0);
  const outro = (e) => (e.a === 0 ? e.b : e.a);
  const vivas = incidentes.filter((e) => e.faces.length !== 2 || (nitidez.get(chave(e.a, e.b)) ?? 0) > 0);
  const P = V[0];
  const ehCanto = canto || (borda === 'cantos' && F.length === 1 && incidentes.some((e) => e.faces.length === 1));
  if (ehCanto || vivas.length >= 3) return [...P];
  if (vivas.length === 2) {
    const A = V[outro(vivas[0])], B = V[outro(vivas[1])];
    return [0, 1, 2].map((j) => (A[j] + 4 * P[j] + B[j]) / 6);
  }
  const n = incidentes.length;
  if (F.length !== n) throw new TypeError('subdivisão: o ponto limite pede vértice de variedade, com tantas faces quantas arestas em volta');
  if (vivas.length === 1) return limiteDoDardo(V, F, nitidez, borda);
  const e = [0, 0, 0], f = [0, 0, 0];
  for (const a of incidentes) { const q = V[outro(a)]; e[0] += q[0]; e[1] += q[1]; e[2] += q[2]; }
  for (const quad of F) { const q = V[quad[(quad.indexOf(0) + 2) % 4]]; f[0] += q[0]; f[1] += q[1]; f[2] += q[2]; }
  return [0, 1, 2].map((j) => (n * n * P[j] + 4 * e[j] + f[j]) / (n * (n + 5)));
}

function limitesInternos(V, F, nitidez, cantos, borda, facesDoV) {
  return V.map((_, i) => limiteDaEstrela(estrelaDe(V, F, facesDoV[i], nitidez, i), cantos.has(i), borda));
}

function prepararLimite({ vertices, faces, vincos = [], cantos = [], borda = 'suave' }) {
  validar(vertices, faces, vincos, 0);
  if (borda !== 'suave' && borda !== 'cantos') throw new TypeError("subdivisão: borda precisa ser 'suave' ou 'cantos'");
  return { nitidez: nitidezDosVincos(faces, vincos), C: new Set(cantos), facesDoV: facesPorVertice(vertices.length, faces) };
}

/** refinarGaiola(gaiola) -> a gaiola de um nível abaixo, no mesmo formato, com a nitidez dos filhos e os mesmos cantos
 *  (os pontos de vértice mantêm o índice). Serve para conferir que o ponto limite não muda com o refino. */
export function refinarGaiola({ vertices, faces, vincos = [], cantos = [], borda = 'suave' }) {
  const { nitidez, C } = prepararLimite({ vertices, faces, vincos, cantos, borda });
  const r = refinar(vertices, faces, nitidez, C, borda);
  return { vertices: r.V, faces: r.F, vincos: [...r.nitidez].map(([k, s]) => [...k.split(',').map(Number), s]), cantos: [...C], borda };
}

/** limitesDaGaiola({ vertices, faces, vincos, cantos, borda }) -> onde cada vértice da gaiola cai na superfície limite. */
export function limitesDaGaiola(gaiola) {
  const { nitidez, C, facesDoV } = prepararLimite(gaiola);
  return limitesInternos(gaiola.vertices, gaiola.faces, nitidez, C, gaiola.borda ?? 'suave', facesDoV);
}

/* Pesos do ponto limite: o ponto limite é linear nas posições da estrela, e os pesos saem do próprio cálculo aplicado à
 * base, três vértices por vez (um em cada eixo). O resultado é o mesmo nos três eixos. */
function pesosDaEstrela(estrela, canto, borda) {
  const m = estrela.V.length; const w = new Array(m).fill(0);
  for (let b = 0; b < m; b += 3) {
    const V = estrela.V.map((_, c) => [c === b ? 1 : 0, c === b + 1 ? 1 : 0, c === b + 2 ? 1 : 0]);
    const L = limiteDaEstrela({ ...estrela, V }, canto, borda);
    for (let k = 0; k < 3 && b + k < m; k++) w[b + k] = L[k];
  }
  return w;
}

/* Medidas: os vértices marcados passam pela superfície limite, e os outros ficam onde a gaiola os declarou. As posições
 * dos marcados são as incógnitas x_M; o ponto limite de cada marcado é W_i · gaiola, e o sistema
 *
 *   W_MM x_M = alvo_M - W_M,resto x_resto      (alvo = posição declarada; o mesmo sistema nos três eixos)
 *
 * se resolve de uma vez pela eliminação de Gauss acima, com os pesos calculados uma vez por gaiola. O ganho
 * ‖W_MM⁻¹‖∞ é o maior fator pelo qual um deslocamento do alvo vira deslocamento da gaiola. Acima de
 * GANHO_MAXIMO_DAS_MEDIDAS o sistema conta como mal condicionado e falha: com ganho 100, uma cota declarada com 1 mm de
 * erro já pode mover um ponto da gaiola 10 cm, e a gaiola deixa de ser a forma que o modelador desenhou. O arredondamento
 * não é o que limita, porque com ganho 100 o erro dele fica perto de 1e-14 da escala da peça. Pivô nulo é sistema
 * singular e falha com os pontos do vetor nulo. */
export const GANHO_MAXIMO_DAS_MEDIDAS = 100;
export const TOLERANCIA_DAS_MEDIDAS = 1e-6;

export class ErroDasMedidas extends TypeError {
  constructor(motivo, indices) { super(`subdivisão: ${motivo}: vértices ${indices.join(', ')}`); this.motivo = motivo; this.indices = indices; }
}

/** ajustarGaiolaAsMedidas(gaiola, medidas) -> { vertices, ganho, residuos }
 *  medidas: índices dos vértices que a superfície limite deve atravessar; os demais vértices não se movem. */
export function ajustarGaiolaAsMedidas(gaiola, medidas) {
  const { nitidez, C, facesDoV } = prepararLimite(gaiola);
  const borda = gaiola.borda ?? 'suave'; const P = gaiola.vertices; const F = gaiola.faces;
  if (!Array.isArray(medidas)) throw new TypeError('subdivisão: medidas precisa ser lista de vértices');
  for (const i of medidas) {
    if (!Number.isInteger(i) || i < 0 || i >= P.length) throw new TypeError(`subdivisão: medida cita vértice inexistente ${i}`);
    if (!facesDoV[i].length) throw new ErroDasMedidas('medida em vértice sem face', [i]);
  }
  const M = [...new Set(medidas)].sort((a, b) => a - b);
  const linha = new Map(M.map((i, r) => [i, r]));
  const n = M.length;
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  const B = M.map((i) => {
    const est = estrelaDe(P, F, facesDoV[i], nitidez, i);
    const w = pesosDaEstrela(est, C.has(i), borda);
    const b = [...P[i]]; const r = linha.get(i);
    est.globais.forEach((j, c) => {
      const k = linha.get(j);
      if (k !== undefined) A[r][k] += w[c];
      else { b[0] -= w[c] * P[j][0]; b[1] -= w[c] * P[j][1]; b[2] -= w[c] * P[j][2]; }
    });
    return b;
  });
  const lu = fatorarLU(A);
  if (lu.singularEm >= 0) {
    const x = vetorNulo(lu, lu.singularEm); const maior = Math.max(...x.map(Math.abs));
    throw new ErroDasMedidas('as medidas formam sistema singular, porque a superfície limite não separa estes pontos', M.filter((_, r) => Math.abs(x[r]) > 1e-9 * maior));
  }
  const inversa = M.map((_, c) => resolverLU(lu, M.map((__, r) => (r === c ? 1 : 0)))); // colunas da inversa
  let ganho = 0, pior = 0;
  for (let r = 0; r < n; r++) { let s = 0; for (let c = 0; c < n; c++) s += Math.abs(inversa[c][r]); if (s > ganho) { ganho = s; pior = r; } }
  if (ganho > GANHO_MAXIMO_DAS_MEDIDAS) {
    const maior = Math.max(...inversa.map((col) => Math.abs(col[pior])));
    throw new ErroDasMedidas(`as medidas formam sistema mal condicionado (ganho ${ganho.toPrecision(3)}, acima de ${GANHO_MAXIMO_DAS_MEDIDAS})`, M.filter((_, c) => Math.abs(inversa[c][pior]) >= 0.01 * maior));
  }
  const eixos = [0, 1, 2].map((ax) => resolverLU(lu, B.map((b) => b[ax])));
  const V = P.map((p) => [...p]);
  M.forEach((i, r) => { V[i] = [eixos[0][r], eixos[1][r], eixos[2][r]]; });
  // conferência independente dos pesos: o ponto limite recalculado pela geometria da gaiola nova
  const residuos = M.map((i) => {
    const L = limiteDaEstrela(estrelaDe(V, F, facesDoV[i], nitidez, i), C.has(i), borda);
    return Math.hypot(P[i][0] - L[0], P[i][1] - L[1], P[i][2] - L[2]);
  });
  const fora = M.filter((_, r) => residuos[r] > TOLERANCIA_DAS_MEDIDAS);
  if (fora.length) throw new ErroDasMedidas(`a superfície limite não chegou a ${TOLERANCIA_DAS_MEDIDAS} m das medidas`, fora);
  return { vertices: V, ganho, residuos };
}

/* Espelha a gaiola no plano x = 0 ANTES de subdividir: os vértices com |x| <= tolerância ficam compartilhados pelas duas
 * metades e a costura sai lisa (subdividir a metade e espelhar depois deixaria a costura como borda, na regra de vinco).
 * Vértices novos: os da metade original nos mesmos índices, depois as imagens dos que não estão no plano, na ordem. */
export function espelharGaiolaEmX({ vertices, faces, vincos = [], cantos = [] }, tolerancia = 1e-9) {
  const imagem = new Array(vertices.length); const V = vertices.map((p) => [...p]);
  vertices.forEach((p, i) => {
    if (p[0] < -tolerancia) throw new TypeError(`subdivisão: na simetria em x a gaiola é a metade x >= 0; o vértice ${i} tem x = ${p[0]}`);
    if (Math.abs(p[0]) <= tolerancia) { V[i][0] = 0; imagem[i] = i; } else { imagem[i] = V.length; V.push([-p[0], p[1], p[2]]); }
  });
  const F = [...faces.map((f) => [...f]), ...faces.map((f) => [...f].reverse().map((i) => imagem[i]))];
  const chaves = new Set();
  const vin = [];
  for (const [a, b, s] of [...vincos, ...vincos.map(([a, b, s]) => [imagem[a], imagem[b], s])]) {
    const c = chave(a, b); if (chaves.has(c)) continue; chaves.add(c); vin.push([a, b, s]);
  }
  const can = [...new Set([...cantos, ...cantos.map((i) => imagem[i])])];
  return { vertices: V, faces: F, vincos: vin, cantos: can, imagem };
}
