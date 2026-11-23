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

import { memoizarPura } from './memoria-de-pura.js';
import { matrizPorLinhas, paraDensa, cotaDeVarah, fatorarCholesky, resolverCholesky, somaDasColunasAbsolutas, estimarNorma1, ordemDeGrauMinimo, fatorarLUEsparso, resolverLUEsparso, baseDoNucleo, fatorarSelaPorSchur } from './algebra-esparsa.js';

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

/* Um nível de refinamento. `nitidez` é um Map chave->nitidez; `cantos` é um Set de índices. `linhagem`, quando vem, é o
   Set das chaves das arestas que descendem de um vinco declarado, e a saída traz o Set dos filhos delas; ela não entra
   em nenhuma conta de posição. */
function refinar(V, F, nitidez, cantos, borda, linhagem = null) {
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
  if (!linhagem) return { V: Vn, F: Fn, nitidez: nitidezN };
  const linhagemN = new Set();
  arestas.forEach((e, k) => { if (linhagem.has(chave(e.a, e.b))) { linhagemN.add(chave(e.a, nV + k)); linhagemN.add(chave(nV + k, e.b)); } });
  return { V: Vn, F: Fn, nitidez: nitidezN, linhagem: linhagemN };
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
    if (typeof x !== 'number' || !(x >= 0)) throw new TypeError(`subdivisão: vinco ${k} com nitidez inválida (precisa ser número maior ou igual a zero, ou Infinity)`);
    nitidez.set(chave(a, b), x >= NITIDEZ_VIVA ? NITIDEZ_INFINITA : x);
  }
  return nitidez;
}

/* comVincos: a saída traz também `vincos`, as arestas da malha final que descendem de um vinco declarado de nitidez
 * maior que zero, como [a, b, viva], em que viva diz que a nitidez é infinita (o vinco vivo, que fica dobra na superfície
 * limite); o vinco de nitidez finita se apaga no refino e a superfície fica lisa por cima dele. A ordem segue a das
 * arestas da malha varrendo as faces, e a geometria não muda. */
function subdividirSemMemoria({ vertices, faces, vincos = [], niveis = 1, cantos = [], borda = 'suave', aoLimite = false, comVincos = false }) {
  validar(vertices, faces, vincos, niveis);
  if (borda !== 'suave' && borda !== 'cantos') throw new TypeError("subdivisão: borda precisa ser 'suave' ou 'cantos'");
  let nitidez = nitidezDosVincos(faces, vincos);
  let linhagem = comVincos ? new Set([...nitidez].filter(([, s]) => s > 0).map(([c]) => c)) : null;
  let V = vertices.map((p) => [...p]); let F = faces.map((f) => [...f]);
  let C = new Set(cantos);
  for (let n = 0; n < niveis; n++) {
    const r = refinar(V, F, nitidez, C, borda, linhagem);
    V = r.V; F = r.F; nitidez = r.nitidez; linhagem = r.linhagem ?? null; // os pontos de vértice mantêm o índice, então os cantos continuam válidos
  }
  /* aoLimite: cada vértice da malha final vai para o seu ponto limite, calculado com a nitidez que sobrou neste nível.
     O vértice i < vertices.length continua sendo o vértice i da gaiola, e o ponto limite dele é o da gaiola. */
  if (aoLimite) V = limitesInternos(V, F, nitidez, C, borda, facesPorVertice(V.length, F));
  if (!comVincos) return { vertices: V, faces: F };
  const { arestas } = arestasDa(F);
  const saida = arestas.filter((e) => e.faces.length === 2 && linhagem.has(chave(e.a, e.b)))
    .map((e) => [e.a, e.b, nitidez.get(chave(e.a, e.b)) === NITIDEZ_INFINITA]);
  return { vertices: V, faces: F, vincos: saida };
}

/* A leitura da superfície de uma receita pede o refino com os mesmos argumentos que o passo `subdivisao` já usou; a memória das
 * últimas chamadas (`memoria-de-pura.js`) devolve a cópia do resultado e poupa a segunda conta. Só a chamada com `comVincos`
 * entra na memória, que é a do passo e a da leitura; as outras (o refino de uma sonda, de uma estrela) rodam direto. Os
 * parâmetros ausentes ficam como a função os assume, então a chamada sem um padrão e a que o escreve são duas chaves, e as duas
 * dão o mesmo resultado. */
export const subdividirCatmullClark = memoizarPura(subdividirSemMemoria, { quando: (gaiola) => gaiola?.comVincos === true });

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

/* A matriz das medidas é esparsa (cada ponto só pesa a sua estrela), e a eliminação pula o que é zero: a linha cujo
 * multiplicador é zero e a coluna em que a linha do pivô é zero. As operações que sobram são as mesmas, na mesma ordem,
 * de modo que o resultado é o da eliminação densa (o termo pulado somaria um zero). Com mil medidas, a densa levava
 * cerca de 4 s, quase todos na inversa do ganho. */
export function fatorarLU(A) {
  const n = A.length; const M = A.map((r) => [...r]); const perm = [...Array(n).keys()];
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let r = k + 1; r < n; r++) if (Math.abs(M[r][k]) > Math.abs(M[p][k])) p = r;
    if (Math.abs(M[p][k]) <= PIVO_NULO) return { M, perm, singularEm: k };
    if (p !== k) { [M[p], M[k]] = [M[k], M[p]]; [perm[p], perm[k]] = [perm[k], perm[p]]; }
    const linha = M[k]; const colunas = [];
    for (let c = k + 1; c < n; c++) if (linha[c] !== 0) colunas.push(c);
    for (let r = k + 1; r < n; r++) {
      if (M[r][k] === 0) continue;
      const f = M[r][k] / linha[k]; const Mr = M[r]; Mr[k] = f;
      for (const c of colunas) Mr[c] -= f * linha[c];
    }
  }
  return { M, perm, singularEm: -1 };
}

/* As posições não nulas de L e de U por linha, em ordem crescente de coluna, guardadas na fatoração na primeira vez, junto
   com o valor de cada uma, em vetores de números: a substituição lê índices e valores contíguos, sem a lista de colunas por
   linha nem a busca na linha densa (a resolução repetida por centenas de lados direitos era a maior parte do tempo do
   alisamento sobre a rede de curvas, medido em 2026-10-28). */
function naoNulos(lu) {
  if (!lu.nz) {
    const n = lu.M.length;
    const inicioL = new Int32Array(n + 1); const inicioU = new Int32Array(n + 1);
    const colunasL = []; const valoresL = []; const colunasU = []; const valoresU = []; const diagonal = new Float64Array(n);
    lu.M.forEach((linha, r) => {
      for (let c = 0; c < r; c++) if (linha[c] !== 0) { colunasL.push(c); valoresL.push(linha[c]); }
      for (let c = r + 1; c < n; c++) if (linha[c] !== 0) { colunasU.push(c); valoresU.push(linha[c]); }
      inicioL[r + 1] = colunasL.length; inicioU[r + 1] = colunasU.length; diagonal[r] = linha[r];
    });
    lu.nz = { inicioL, inicioU, colunasL: Int32Array.from(colunasL), valoresL: Float64Array.from(valoresL), colunasU: Int32Array.from(colunasU), valoresU: Float64Array.from(valoresU), diagonal };
  }
  return lu.nz;
}

export function resolverLU(lu, b) {
  const { M, perm } = lu; const n = M.length; const y = perm.map((i) => b[i]);
  const { inicioL, inicioU, colunasL, valoresL, colunasU, valoresU, diagonal } = naoNulos(lu);
  for (let r = 0; r < n; r++) {
    let t = y[r];
    for (let k = inicioL[r]; k < inicioL[r + 1]; k++) t -= valoresL[k] * y[colunasL[k]];
    y[r] = t;
  }
  for (let r = n - 1; r >= 0; r--) {
    let t = y[r];
    for (let k = inicioU[r]; k < inicioU[r + 1]; k++) t -= valoresU[k] * y[colunasU[k]];
    y[r] = t / diagonal[r];
  }
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

/** linhasDoLimite(gaiola, indices) -> para cada índice, a linha esparsa do ponto limite dele, [[vértice, peso], ...] sem os pesos nulos:
 *  o ponto limite do vértice i é Σ peso · gaiola[vértice]. É a linha W_i do ajuste às medidas, exposta para medir a estrutura do sistema
 *  (não nulos, banda e preenchimento) sem montá-lo. */
export function linhasDoLimite(gaiola, indices) {
  const { nitidez, C, facesDoV } = prepararLimite(gaiola);
  const borda = gaiola.borda ?? 'suave';
  return indices.map((i) => {
    const est = estrelaDe(gaiola.vertices, gaiola.faces, facesDoV[i], nitidez, i);
    const w = pesosDaEstrela(est, C.has(i), borda);
    return est.globais.map((j, c) => [j, w[c]]).filter(([, p]) => p !== 0);
  });
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
/** no ajuste com a curvatura normal sem cota exata, o ganho estimado (uma cota inferior, de Hager e Higham) só dispensa a conta exata
 *  quando fica abaixo do limite dividido por esta margem: o estimador erra para menos raramente mais que 3 vezes */
export const MARGEM_DA_ESTIMATIVA_DO_GANHO = 10;
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
  const A = matrizPorLinhas(n);
  const B = M.map((i) => {
    const est = estrelaDe(P, F, facesDoV[i], nitidez, i);
    const w = pesosDaEstrela(est, C.has(i), borda);
    const b = [...P[i]]; const r = linha.get(i);
    est.globais.forEach((j, c) => {
      const k = linha.get(j);
      if (k !== undefined) { if (w[c] !== 0) A.somar(r, k, w[c]); }
      else { b[0] -= w[c] * P[j][0]; b[1] -= w[c] * P[j][1]; b[2] -= w[c] * P[j][2]; }
    });
    return b;
  });
  /* o LU esparso que repete a aritmética da eliminação densa: o ajuste só com exatas guarda a saída das fixtures bit a bit */
  const lu = fatorarLUEsparso(A, { comoADensa: true });
  if (lu.deficientes.length) throw new ErroDasMedidas('as medidas formam sistema singular, porque a superfície limite não separa estes pontos', baseDoNucleo(lu).map((r) => M[r]));
  /* o ganho ‖W_MM⁻¹‖∞ pelas colunas da inversa, uma resolução por vez, sem guardá-las; na recusa, a linha do pior vértice sai das mesmas
     colunas, resolvidas de novo */
  const somas = new Float64Array(n); const e = new Array(n).fill(0);
  const coluna = (c) => { e[c] = 1; const col = resolverLUEsparso(lu, e); e[c] = 0; return col; };
  for (let c = 0; c < n; c++) { const col = coluna(c); for (let r = 0; r < n; r++) somas[r] += Math.abs(col[r]); }
  let ganho = 0, pior = 0;
  for (let r = 0; r < n; r++) if (somas[r] > ganho) { ganho = somas[r]; pior = r; }
  if (ganho > GANHO_MAXIMO_DAS_MEDIDAS) {
    const linhaDoPior = M.map((_, c) => Math.abs(coluna(c)[pior]));
    const maior = Math.max(...linhaDoPior);
    throw new ErroDasMedidas(`as medidas formam sistema mal condicionado (ganho ${ganho.toPrecision(3)}, acima de ${GANHO_MAXIMO_DAS_MEDIDAS})`, M.filter((_, c) => linhaDoPior[c] >= 0.01 * maior));
  }
  const eixos = [0, 1, 2].map((ax) => resolverLUEsparso(lu, B.map((b) => b[ax])));
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

/* A ENERGIA DE VARIAÇÃO DE CURVATURA NO PARÂMETRO. Até 2026-11-22 era a do ajuste com `regularizacao: { tipo: 'variacaoDeCurvatura' }`;
 * hoje o ajuste usa a curvatura normal (`energiaDeCurvaturaNormal`, abaixo), e esta fica como medida, para as bancadas de prova
 * compararem as duas. No vértice regular (valência
 * 4, quatro faces de quatro lados, fora da borda livre, sem canto declarado e sem aresta de vinco) as derivadas segundas da superfície
 * limite, no parâmetro da gaiola (uma aresta é uma unidade), saem do anel 3×3 P_ab (a, b em −1, 0, 1) pelos estênceis da B-spline bicúbica:
 *
 *   S_uu = Σ s_a m_b P_ab,   S_vv = Σ m_a s_b P_ab,   S_uv = Σ d_a d_b P_ab,     m = (1/6, 4/6, 1/6), s = (1, −2, 1), d = (−1/2, 0, 1/2),
 *
 * e D_i = (S_uu, √2 S_uv, S_vv)/h², com h o passo da gaiola declarada (a mediana das arestas), um só para a gaiola inteira. A energia
 * soma, em cada aresta (s, t) entre dois vértices regulares, (onda/2π)⁶/h² ‖D_s − D_t‖², com os eixos dos dois alinhados pela aresta (u
 * ao longo dela, v para o mesmo lado). O comprimento é o do parâmetro, e não o da aresta no espaço: por isso a energia é nula em toda
 * gaiola que é imagem quadrática da grade inteira (a quadrática inclinada amostrada em passo igual no plano, cujas arestas têm
 * comprimentos diferentes no espaço, inclusive), e h só dá a escala. O vinco, a borda, o canto e o extraordinário não têm termo próprio:
 * entram como pontos do anel dos vizinhos regulares. `onda` é o comprimento de onda em que a energia e a cota de peso 1 pesam o mesmo (a
 * senoide de comprimento `onda` cotada com peso 1 sai com metade da amplitude no contínuo); o padrão é ARESTAS_POR_ONDA passos, e a onda
 * declarada fora de ONDA_MINIMA_EM_PASSOS a ONDA_MAXIMA_EM_PASSOS passos é recusada (`ErroDaOnda`).
 * O LIMITE MEDIDO, QUE A TIROU DO AJUSTE: a energia cobra a derivada segunda do vetor posição no parâmetro, e o esticamento do
 * parâmetro ao longo da superfície conta como curvatura. Onde o espaçamento da gaiola muda de um lado de uma curva para o outro, a
 * superfície se afasta da forma (com a razão 2 entre os espaçamentos, o paraboloide de raio 0,5 m vai de 0,99 para 3,27 mm). A medida
 * no espaço que continua linear nos três eixos separados (as diferenças divididas pelos comprimentos das arestas) corrige isso em parte e
 * deixa de ser nula na quadrática inclinada; a que é exata (a curvatura normal, n · S_uu / |S_u|²) junta os três eixos num sistema só.
 * Os números estão no banco de provas da correção de superfície. */
export const REGULARIZACAO_DE_CURVATURA = 'variacaoDeCurvatura';
export const ARESTAS_POR_ONDA = 4;
/** a faixa aceita da onda, em passos da gaiola (a mediana das arestas). Abaixo de duas arestas a gaiola não representa a onda e a energia
 *  deixa de pesar (com 0,01 passo o termo cai abaixo do resto do deslocamento, e o ponto sem cota fica sem nada que o segure); acima de
 *  64 o peso passa de um milhão de vezes o da cota de peso 1, e de umas centenas de passos em diante o sistema perde o pivô. */
export const ONDA_MINIMA_EM_PASSOS = 2;
export const ONDA_MAXIMA_EM_PASSOS = 64;

export class ErroDaOnda extends TypeError {
  constructor(onda, passo) {
    super(`subdivisão: a onda da regularizacao é ${onda}, fora da faixa de ${ONDA_MINIMA_EM_PASSOS * passo} a ${ONDA_MAXIMA_EM_PASSOS * passo} (de ${ONDA_MINIMA_EM_PASSOS} a ${ONDA_MAXIMA_EM_PASSOS} passos da gaiola, cujo passo, a mediana das arestas, é ${passo}), na unidade da gaiola`);
    this.onda = onda; this.passo = passo; this.minima = ONDA_MINIMA_EM_PASSOS * passo; this.maxima = ONDA_MAXIMA_EM_PASSOS * passo;
  }
}

/** passoDaGaiola(vertices, faces) -> a mediana dos comprimentos das arestas, contadas face a face: a escala da energia e da faixa da onda */
export function passoDaGaiola(vertices, faces) {
  const comprimentos = [];
  for (const f of faces) for (let k = 0; k < f.length; k++) { const a = vertices[f[k]], b = vertices[f[(k + 1) % f.length]]; comprimentos.push(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])); }
  comprimentos.sort((x, y) => x - y);
  return comprimentos[comprimentos.length >> 1];
}
/** o resto do termo de deslocamento que fica com a energia ligada: só tira a indeterminação do vértice que nenhum termo alcança */
export const RESTO_DO_DESLOCAMENTO = 1e-9;
const MASSA_DO_ANEL = [1 / 6, 4 / 6, 1 / 6]; const SEGUNDA_DO_ANEL = [1, -2, 1]; const PRIMEIRA_DO_ANEL = [-0.5, 0, 0.5];

/* a regularização como o ajuste a lê: null, ou { tipo: 'variacaoDeCurvatura', onda: comprimento na unidade da gaiola, ou null } */
function lerRegularizacao(regularizacao) {
  if (regularizacao == null) return null;
  const campos = regularizacao && typeof regularizacao === 'object' && !Array.isArray(regularizacao) ? Object.keys(regularizacao) : null;
  if (!campos || regularizacao.tipo !== REGULARIZACAO_DE_CURVATURA || campos.some((c) => c !== 'tipo' && c !== 'onda')) throw new TypeError(`subdivisão: regularizacao precisa ser { tipo: '${REGULARIZACAO_DE_CURVATURA}', onda? }, e veio ${JSON.stringify(regularizacao)}`);
  const onda = regularizacao.onda ?? null;
  if (onda !== null && !(typeof onda === 'number' && Number.isFinite(onda) && onda > 0)) throw new TypeError(`subdivisão: a onda da regularizacao precisa ser comprimento finito maior que zero, na unidade da gaiola, e veio ${JSON.stringify(onda)}`);
  return { tipo: REGULARIZACAO_DE_CURVATURA, onda };
}

/**
 * energiaDeVariacaoDeCurvatura(gaiola, { onda }) -> { onda, passo, termos, derivadas(i, paraU), valor(vertices) }
 * gaiola: { vertices, faces, vincos, cantos } como DECLARADA (o passo sai dela). `termos` é a lista, em ordem fixa (a das arestas por
 * índice), de { aresta: [s, t], peso, linhas }: as três linhas esparsas [[vértice, coeficiente], ...] de D_s − D_t, de modo que a energia
 * é Σ peso Σ_linha ‖linha · x‖². `derivadas(i, paraU)` devolve as linhas { uu, uv, vv } das derivadas segundas do limite no vértice
 * regular i, com +u no vizinho `paraU` e +v no seguinte dele na volta (o lado da face [i, paraU, ·, v]), ou null se i não é regular ou
 * `paraU` não é vizinho. `valor(vertices)` é a energia de uma lista de posições sobre a mesma topologia.
 */
export function energiaDeVariacaoDeCurvatura(gaiola, { onda = null } = {}) {
  const { vertices: P, faces: F } = gaiola;
  const { nitidez, C } = prepararLimite(gaiola);
  const n = P.length;
  const { arestas } = arestasDa(F);
  const grau = new Array(n).fill(0); const fora = new Set(C);
  for (const { a, b, faces } of arestas) {
    grau[a]++; grau[b]++;
    if (faces.length !== 2) { fora.add(a); fora.add(b); }
    if ((nitidez.get(chave(a, b)) ?? 0) > 0) { fora.add(a); fora.add(b); }
  }
  const passo = passoDaGaiola(P, F);
  if (!(passo > 0)) throw new TypeError('subdivisão: a regularizacao pede uma gaiola com arestas de comprimento maior que zero');
  if (onda !== null && !(onda >= ONDA_MINIMA_EM_PASSOS * passo && onda <= ONDA_MAXIMA_EM_PASSOS * passo)) throw new ErroDaOnda(onda, passo);
  const ondaUsada = onda ?? ARESTAS_POR_ONDA * passo;
  const facesDoV = facesPorVertice(n, F);
  /* a volta do vértice regular: os quatro vizinhos em ordem, do menor índice, e o canto oposto de cada face entre dois seguidos */
  const voltas = new Array(n).fill(undefined);
  const volta = (i) => {
    if (voltas[i] !== undefined) return voltas[i];
    let r = null;
    if (!fora.has(i) && grau[i] === 4 && facesDoV[i].length === 4 && facesDoV[i].every((fi) => F[fi].length === 4)) {
      const seguinte = new Map();
      for (const fi of facesDoV[i]) { const f = F[fi]; const k = f.indexOf(i); seguinte.set(f[(k + 1) % 4], { b: f[(k + 3) % 4], d: f[(k + 2) % 4] }); }
      const viz = [Math.min(...seguinte.keys())]; const diag = [];
      for (let k = 0; k < 4; k++) { const s = seguinte.get(viz[k]); if (!s) break; diag.push(s.d); if (k < 3) viz.push(s.b); }
      if (diag.length === 4 && new Set(viz).size === 4 && seguinte.get(viz[3]).b === viz[0]) r = { viz, diag };
    }
    voltas[i] = r;
    return r;
  };
  /* as linhas de S_uu, S_uv e S_vv sobre o anel [a + 1][b + 1], com +u no k-ésimo vizinho da volta e +v no seguinte */
  const linhasDoAnel = (i, k) => {
    const { viz, diag } = volta(i); const v = (j) => viz[(k + j) % 4]; const q = (j) => diag[(k + j) % 4];
    const anel = [[q(2), v(2), q(1)], [v(3), i, v(1)], [q(3), v(0), q(0)]];
    const uu = new Map(), uv = new Map(), vv = new Map();
    const soma = (m, j, w) => { if (w !== 0) m.set(j, (m.get(j) ?? 0) + w); };
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
      const j = anel[a][b];
      soma(uu, j, SEGUNDA_DO_ANEL[a] * MASSA_DO_ANEL[b]); soma(vv, j, MASSA_DO_ANEL[a] * SEGUNDA_DO_ANEL[b]); soma(uv, j, PRIMEIRA_DO_ANEL[a] * PRIMEIRA_DO_ANEL[b]);
    }
    return [uu, uv, vv];
  };
  const escala = [1 / (passo * passo), Math.SQRT2 / (passo * passo), 1 / (passo * passo)];
  const peso = (ondaUsada / (2 * Math.PI)) ** 6 / (passo * passo);
  const termos = [];
  for (const [s, t] of arestas.map(({ a, b }) => (a < b ? [a, b] : [b, a])).sort((x, y) => x[0] - y[0] || x[1] - y[1])) {
    if (!volta(s) || !volta(t)) continue;
    /* em s, +u é t; em t, +u é o vizinho oposto a s, e o +v dos dois cai do mesmo lado porque a malha é orientada */
    const Ds = linhasDoAnel(s, volta(s).viz.indexOf(t)); const Dt = linhasDoAnel(t, (volta(t).viz.indexOf(s) + 2) % 4);
    const linhas = Ds.map((ls, c) => {
      const m = new Map();
      for (const [j, w] of ls) m.set(j, (m.get(j) ?? 0) + w * escala[c]);
      for (const [j, w] of Dt[c]) m.set(j, (m.get(j) ?? 0) - w * escala[c]);
      return [...m].sort((x, y) => x[0] - y[0]);
    });
    termos.push({ aresta: [s, t], peso, linhas });
  }
  const derivadas = (i, paraU) => {
    const k = volta(i)?.viz.indexOf(paraU) ?? -1;
    if (k < 0) return null;
    const [uu, uv, vv] = linhasDoAnel(i, k).map((m) => [...m].sort((x, y) => x[0] - y[0]));
    return { uu, uv, vv };
  };
  const valor = (V) => {
    let E = 0;
    for (const { peso: p, linhas } of termos) for (const l of linhas) { let x = 0, y = 0, z = 0; for (const [j, w] of l) { x += w * V[j][0]; y += w * V[j][1]; z += w * V[j][2]; } E += p * (x * x + y * y + z * z); }
    return E;
  };
  return { onda: ondaUsada, passo, termos, derivadas, valor };
}

/* A CURVATURA NORMAL LINEARIZADA (a energia que o ajuste com `regularizacao: { tipo: 'variacaoDeCurvatura' }` usa). No vértice regular i
 * (a mesma regra da energia acima), com o anel 3×3 e os estênceis da B-spline bicúbica, uma gaiola BASE dá as tangentes do limite
 * S_u = Σ d_a m_b B_ab e S_v = Σ m_a d_b B_ab, a normal n = S_u × S_v / |S_u × S_v| e a métrica E = |S_u|², G = |S_v|², e os quatro
 * ficam congelados. As três curvaturas são lineares na gaiola x:
 *
 *   κ_uu = n · S_uu(x) / E,     κ_uv = √2 n · S_uv(x) / √(E G),     κ_vv = n · S_vv(x) / G.
 *
 * Sobre a própria base, κ_uu e κ_vv são a curvatura normal exata do limite nas direções u e v; por isso a energia não depende do
 * parâmetro e é nula na esfera, no cilindro e no plano, e não na quadrática inclinada, cuja curvatura varia de fato no espaço. A energia
 * soma, em cada aresta (s, t) entre dois vértices regulares, (onda/2π)⁶/ℓ_st² Σ_c (κ_c(s) − κ_c(t))², com os eixos alinhados pela aresta
 * e ℓ_st o comprimento da aresta na base. A medida da derivada do vetor posição (a energia acima) contava o esticamento do parâmetro como
 * curvatura, e na grade de razão 2 levava o paraboloide de 0,89 para 3,27 mm; esta o leva a 0,72 (banco de provas
 * `superficie-g2-2026-11-22`). Devolve { onda, passo, termos, valor(vertices) }, com `termos` em ordem fixa de { aresta, peso, linhas }:
 * cada linha uma lista [[vértice, [gx, gy, gz]], ...], e o termo Σ_j g_j · x_j. */
export function energiaDeCurvaturaNormal(gaiola, base = gaiola.vertices, { onda = null } = {}) {
  const P = gaiola.vertices; const F = gaiola.faces; const n = P.length;
  const { nitidez, C } = prepararLimite(gaiola);
  const { arestas } = arestasDa(F);
  const grau = new Array(n).fill(0); const fora = new Set(C);
  for (const { a, b, faces } of arestas) {
    grau[a]++; grau[b]++;
    if (faces.length !== 2) { fora.add(a); fora.add(b); }
    if ((nitidez.get(chave(a, b)) ?? 0) > 0) { fora.add(a); fora.add(b); }
  }
  const passo = passoDaGaiola(P, F);
  if (!(passo > 0)) throw new TypeError('subdivisão: a regularizacao pede uma gaiola com arestas de comprimento maior que zero');
  if (onda !== null && !(onda >= ONDA_MINIMA_EM_PASSOS * passo && onda <= ONDA_MAXIMA_EM_PASSOS * passo)) throw new ErroDaOnda(onda, passo);
  const ondaUsada = onda ?? ARESTAS_POR_ONDA * passo;
  const facesDoV = facesPorVertice(n, F);
  const voltas = new Array(n).fill(undefined);
  const volta = (i) => {
    if (voltas[i] !== undefined) return voltas[i];
    let r = null;
    if (!fora.has(i) && grau[i] === 4 && facesDoV[i].length === 4 && facesDoV[i].every((fi) => F[fi].length === 4)) {
      const seguinte = new Map();
      for (const fi of facesDoV[i]) { const f = F[fi]; const k = f.indexOf(i); seguinte.set(f[(k + 1) % 4], { b: f[(k + 3) % 4], d: f[(k + 2) % 4] }); }
      const viz = [Math.min(...seguinte.keys())]; const diag = [];
      for (let k = 0; k < 4; k++) { const s = seguinte.get(viz[k]); if (!s) break; diag.push(s.d); if (k < 3) viz.push(s.b); }
      if (diag.length === 4 && new Set(viz).size === 4 && seguinte.get(viz[3]).b === viz[0]) r = { viz, diag };
    }
    voltas[i] = r;
    return r;
  };
  /* o anel 3×3 do vértice i com +u no k-ésimo vizinho, as tangentes do limite na base e a normal */
  const quadro = (i, k) => {
    const { viz, diag } = volta(i); const v = (j) => viz[(k + j) % 4]; const q = (j) => diag[(k + j) % 4];
    const anel = [[q(2), v(2), q(1)], [v(3), i, v(1)], [q(3), v(0), q(0)]];
    const Su = [0, 0, 0]; const Sv = [0, 0, 0];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
      const p = base[anel[a][b]]; const wu = PRIMEIRA_DO_ANEL[a] * MASSA_DO_ANEL[b]; const wv = MASSA_DO_ANEL[a] * PRIMEIRA_DO_ANEL[b];
      for (let x = 0; x < 3; x++) { Su[x] += wu * p[x]; Sv[x] += wv * p[x]; }
    }
    const c = [Su[1] * Sv[2] - Su[2] * Sv[1], Su[2] * Sv[0] - Su[0] * Sv[2], Su[0] * Sv[1] - Su[1] * Sv[0]];
    const lc = Math.hypot(c[0], c[1], c[2]);
    return { anel, Su, Sv, nn: [c[0] / lc, c[1] / lc, c[2] / lc] };
  };
  /* as três curvaturas no vértice i com +u no k-ésimo vizinho, como listas [vértice, vetor] (o vetor já multiplicado pela normal) */
  const curvaturas = (i, k) => {
    const { anel, Su, Sv, nn } = quadro(i, k);
    const E = Su[0] * Su[0] + Su[1] * Su[1] + Su[2] * Su[2]; const G = Sv[0] * Sv[0] + Sv[1] * Sv[1] + Sv[2] * Sv[2]; const raiz = Math.sqrt(E * G);
    const uu = []; const uv = []; const vv = [];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
      const j = anel[a][b];
      uu.push([j, (SEGUNDA_DO_ANEL[a] * MASSA_DO_ANEL[b]) / E]); vv.push([j, (MASSA_DO_ANEL[a] * SEGUNDA_DO_ANEL[b]) / G]);
      if (PRIMEIRA_DO_ANEL[a] * PRIMEIRA_DO_ANEL[b] !== 0) uv.push([j, (Math.SQRT2 * PRIMEIRA_DO_ANEL[a] * PRIMEIRA_DO_ANEL[b]) / raiz]);
    }
    return { n: nn, linhas: [uu, uv, vv] };
  };
  const K = (ondaUsada / (2 * Math.PI)) ** 6;
  const termos = [];
  for (const [s, t] of arestas.map(({ a, b }) => (a < b ? [a, b] : [b, a])).sort((x, y) => x[0] - y[0] || x[1] - y[1])) {
    if (!volta(s) || !volta(t)) continue;
    /* em s, +u é t; em t, +u é o vizinho oposto a s, e o +v dos dois cai do mesmo lado porque a malha é orientada */
    const cs = curvaturas(s, volta(s).viz.indexOf(t)); const ct = curvaturas(t, (volta(t).viz.indexOf(s) + 2) % 4);
    const linhas = [0, 1, 2].map((c) => {
      const m = new Map();
      const soma = (j, w, nn) => { const g = m.get(j) ?? [0, 0, 0]; g[0] += w * nn[0]; g[1] += w * nn[1]; g[2] += w * nn[2]; m.set(j, g); };
      for (const [j, w] of cs.linhas[c]) soma(j, w, cs.n);
      for (const [j, w] of ct.linhas[c]) soma(j, -w, ct.n);
      return [...m].sort((x, y) => x[0] - y[0]);
    });
    const l = Math.hypot(base[s][0] - base[t][0], base[s][1] - base[t][1], base[s][2] - base[t][2]);
    termos.push({ aresta: [s, t], peso: K / (l * l), linhas });
  }
  const valor = (V) => {
    let soma = 0;
    for (const { peso, linhas } of termos) for (const l of linhas) { let r = 0; for (const [j, g] of l) r += g[0] * V[j][0] + g[1] * V[j][1] + g[2] * V[j][2]; soma += peso * r * r; }
    return soma;
  };
  /* a normal do limite na base em cada vértice regular, a mesma de qualquer vizinho como +u (girar o anel gira S_u e S_v juntos) */
  const normais = Array.from({ length: n }, (_, i) => (volta(i) ? quadro(i, 0).nn : null));
  return { onda: ondaUsada, passo, termos, valor, normais };
}

/** as vezes que o ajuste com a curvatura normal refaz a conta, cada uma linearizada na gaiola da anterior: na grade de razão 2 a mudança
 *  entre duas seguidas cai de 0,26 mm na segunda para 0,001 mm na quinta, e o cilindro passa de 0,365 para 0,268 mm na quarta */
export const ITERACOES_DA_CURVATURA = 4;

/* a normal do limite em cada vértice da gaiola: a dada (a fórmula fechada do vértice regular) ou, no que falta, a do oráculo, o canto de
   uma face que o tem */
function normaisDoLimite(gaiola, dadas) {
  const N = dadas.slice();
  if (!gaiola.faces.some((f) => f.some((v) => !N[v]))) return N;
  /* o ponto limite só dos vértices que faltam, para conferir o canto que o oráculo avaliou */
  const sup = superficieLimite(gaiola); const { nitidez, C, facesDoV } = prepararLimite(gaiola); const CANTO = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const L = new Map(); const limite = (v) => { if (!L.has(v)) L.set(v, limiteDaEstrela(estrelaDe(gaiola.vertices, gaiola.faces, facesDoV[v], nitidez, v), C.has(v), gaiola.borda ?? 'suave')); return L.get(v); };
  gaiola.faces.forEach((f, fi) => f.forEach((v, k) => {
    if (N[v]) return;
    const a = f.length === 4 ? sup.avaliar(fi, ...CANTO[k]) : sup.avaliar(fi, 0, 0, { canto: k });
    const l = limite(v);
    if (a.normal && Math.hypot(a.ponto[0] - l[0], a.ponto[1] - l[1], a.ponto[2] - l[2]) < 1e-9) N[v] = a.normal;
  }));
  const falta = N.findIndex((nn, j) => !nn && gaiola.faces.some((f) => f.includes(j)));
  if (falta >= 0) throw new TypeError(`subdivisão: a curvatura normal não achou a normal do limite no vértice ${falta}`);
  return N;
}

/* O AJUSTE COM A CURVATURA NORMAL. A incógnita é um deslocamento por vértice na normal do limite da base, e no vértice de cada cota exata
 * mais duas, nas tangentes: x_j = B_j + Σ z_k d_k. O sistema é um só, nos três eixos juntos:
 *
 *   Σ p_i (N_i · (L_i(x) − a_i))² + E_normal(x) + 1e-9 Σ z_k²      sujeita a  L_k(x) = a_k  nos três eixos, para cada k exato.
 *
 * A cota com peso pesa só na normal: a tangente dela não muda a forma, e é a que a energia deixa escorregar ao longo da superfície. A
 * cota exata fica o contrato de sempre, o ponto limite no ponto declarado a TOLERANCIA_DAS_MEDIDAS. A primeira conta usa a gaiola
 * declarada como base, e cada uma das ITERACOES_DA_CURVATURA − 1 seguintes usa a gaiola da anterior, com as mesmas cotas: a normal e a
 * métrica congeladas na declarada deixam de valer onde a conta move as tangentes (a grade de razão 2). Sem cota exata o sistema vai ao
 * Cholesky esparso; com elas, ao complemento de Schur; quando o Cholesky para, à eliminação densa, que `denso` força. A ordem de
 * eliminação e a análise simbólica da primeira conta servem às seguintes, e H se monta só na parte de cima e se espelha. O ganho é o da
 * última conta, a maior soma, por vértice, do quanto a gaiola anda por unidade de cota. Sem cota exata ele sai da estimativa de Hager e
 * Higham (`estimarNorma1`, umas vinte resoluções, `ganhoEstimado: true`), e a conta exata, uma resolução por cota, só roda quando a
 * estimativa passa de GANHO_MAXIMO_DAS_MEDIDAS / MARGEM_DA_ESTIMATIVA_DO_GANHO; com cota exata ela roda sempre, pela sela sem o refinamento iterativo (o
 * ganho muda a 1e-8 relativo e custa um terço). No quarto traseiro de uma
 * lataria, com 4.255 e 10.220 incógnitas, a conta exata levava dois terços do ajuste. */
function ajusteDaCurvaturaNormal({ gaiola, energia, M, exatos, comPeso, pesoDe, linhaDe, denso }) {
  const P = gaiola.vertices; const nV = P.length;
  /* a ordem de eliminação sai da primeira conta e serve às seguintes: a estrutura de H é a mesma, e qualquer ordem dá o fator certo */
  let ordem = null; let simbolico = null;
  const umaConta = (B, comGanho) => {
    const gB = { ...gaiola, vertices: B };
    const curvatura = energiaDeCurvaturaNormal(gaiola, B, { onda: energia.onda });
    const N = normaisDoLimite(gB, curvatura.normais);
    const direcoes = []; const doVertice = Array.from({ length: nV }, () => []);
    for (let j = 0; j < nV; j++) { if (!N[j]) continue; doVertice[j].push(direcoes.length); direcoes.push({ j, d: N[j] }); }
    for (const i of exatos) {
      const nn = N[i]; const ax = Math.abs(nn[0]) <= Math.abs(nn[1]) && Math.abs(nn[0]) <= Math.abs(nn[2]) ? [1, 0, 0] : (Math.abs(nn[1]) <= Math.abs(nn[2]) ? [0, 1, 0] : [0, 0, 1]);
      const c = [nn[1] * ax[2] - nn[2] * ax[1], nn[2] * ax[0] - nn[0] * ax[2], nn[0] * ax[1] - nn[1] * ax[0]]; const lc = Math.hypot(c[0], c[1], c[2]);
      const t1 = [c[0] / lc, c[1] / lc, c[2] / lc]; const t2 = [nn[1] * t1[2] - nn[2] * t1[1], nn[2] * t1[0] - nn[0] * t1[2], nn[0] * t1[1] - nn[1] * t1[0]];
      for (const d of [t1, t2]) { doVertice[i].push(direcoes.length); direcoes.push({ j: i, d }); }
    }
    const nZ = direcoes.length;
    /* a linha Σ g_j · x_j em z: a constante sobre a base e os coeficientes [k, g_j · d_k], somados por k */
    const emZ = (linha) => {
      let c0 = 0; const coef = new Map();
      for (const [j, g] of linha) { c0 += g[0] * B[j][0] + g[1] * B[j][1] + g[2] * B[j][2]; for (const k of doVertice[j]) { const d = direcoes[k].d; const w = g[0] * d[0] + g[1] * d[1] + g[2] * d[2]; if (w !== 0) coef.set(k, (coef.get(k) ?? 0) + w); } }
      return { c0, coef: [...coef].sort((a, b) => a[0] - b[0]) };
    };
    const doLimite = (i, e) => { const { globais, w } = linhaDe.get(i); const l = []; globais.forEach((j, c) => { if (w[c] !== 0) l.push([j, [w[c] * e[0], w[c] * e[1], w[c] * e[2]]]); }); return l; };
    const H = matrizPorLinhas(nZ); const rhs = new Array(nZ).fill(0);
    for (let k = 0; k < nZ; k++) H.somar(k, k, RESTO_DO_DESLOCAMENTO);
    /* só a parte de cima (r ≤ c, com coef em ordem de coluna), espelhada depois: H sai simétrica bit a bit e a montagem custa a metade */
    const quadrado = (peso, { c0, coef }, alvo) => {
      for (let a = 0; a < coef.length; a++) { const [r, wr] = coef[a]; const pw = peso * wr; for (let b = a; b < coef.length; b++) H.somar(r, coef[b][0], pw * coef[b][1]); rhs[r] += pw * (alvo - c0); }
    };
    const sensibilidade = [];
    for (const i of comPeso) {
      const p = pesoDe.get(i); const l = emZ(doLimite(i, N[i])); quadrado(p, l, N[i][0] * P[i][0] + N[i][1] * P[i][1] + N[i][2] * P[i][2]);
      sensibilidade.push(new Map(l.coef.map(([r, w]) => [r, p * w])));
    }
    for (const { peso, linhas } of curvatura.termos) for (const l of linhas) quadrado(peso, emZ(l), 0);
    for (let r = 0; r < nZ; r++) for (const [c, v] of H.linhas[r]) if (c > r) H.linhas[c].set(r, v);
    const restricoes = [];
    for (const i of exatos) for (const e of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) { const { c0, coef } = emZ(doLimite(i, e)); restricoes.push({ i, coef, alvo: e[0] * P[i][0] + e[1] * P[i][1] + e[2] * P[i][2] - c0 }); }
    const nR = restricoes.length;
    let resolver = null; let fator = null; let resolverDoGanho = null;
    if (!denso && nR === 0) {
      ordem ??= ordemDeGrauMinimo(H);
      fator = fatorarCholesky(H, ordem, { simbolico });
      if (fator.naoPositivaEm === undefined) { simbolico = fator.simbolico; resolver = (b) => ({ x: resolverCholesky(fator, b), mu: [] }); } else fator = null;
    } else if (!denso) {
      ordem ??= ordemDeGrauMinimo(H);
      const sela = fatorarSelaPorSchur(H, restricoes.map((r) => r.coef), { ordem });
      if (sela?.nucleo) throw new ErroDasMedidas('as medidas formam sistema singular, porque a superfície limite não separa estes pontos', [...new Set(sela.nucleo.map((s) => restricoes[s].i))].sort((a, b) => a - b));
      /* o ganho é um tamanho, comparado com 100: as colunas dele dispensam o refinamento, que triplica a conta */
      if (sela) { resolver = (b, g) => sela.resolver(b, g, { refinar: PASSOS_DE_REFINAMENTO }); resolverDoGanho = (b, g) => sela.resolver(b, g); }
    }
    if (!resolver) {
      const n = nZ + nR;
      const A = paraDensa({ n, linhas: [...H.linhas, ...Array.from({ length: nR }, () => new Map())].map((l) => new Map(l)) });
      restricoes.forEach(({ coef }, s) => { for (const [c, w] of coef) { A[nZ + s][c] += w; A[c][nZ + s] += w; } });
      const lu = fatorarLU(A);
      if (lu.singularEm >= 0) throw new ErroDasMedidas('as medidas formam sistema singular, porque a superfície limite não separa estes pontos', M);
      resolver = (b, g) => { const x = resolverLU(lu, [...b, ...(g ?? new Array(nR).fill(0))]); return { x: x.slice(0, nZ), mu: x.slice(nZ) }; };
    }
    const { x: z } = resolver(rhs, restricoes.map((r) => r.alvo));
    const V = B.map((p) => [...p]);
    direcoes.forEach(({ j, d }, k) => { V[j][0] += z[k] * d[0]; V[j][1] += z[k] * d[1]; V[j][2] += z[k] * d[2]; });
    let ganho = 0; let ganhoEstimado = false;
    /* sem cota exata, o ganho é ‖H⁻¹ S‖∞ (uma direção por vértice), igual a ‖(H⁻¹ S)ᵀ‖₁, e o estimador o tira de umas vinte resoluções;
       ele é uma soma que o sistema atinge, e a conta exata, uma resolução por cota, só roda quando ele passa do limite sobre a margem */
    if (comGanho && fator && sensibilidade.length) {
      const colunas = sensibilidade.map((s) => [...s]);
      const est = estimarNorma1({
        n: nZ,
        aplicar: (x) => { const h = resolverCholesky(fator, x); return colunas.map((c) => { let v = 0; for (const [r, w] of c) v += w * h[r]; return v; }); },
        aplicarTransposta: (xi) => { const u = new Array(nZ).fill(0); colunas.forEach((c, t) => { for (const [r, w] of c) u[r] += w * xi[t]; }); return resolverCholesky(fator, u); },
      });
      if (est.estimativa * MARGEM_DA_ESTIMATIVA_DO_GANHO <= GANHO_MAXIMO_DAS_MEDIDAS) { ganho = est.estimativa; ganhoEstimado = true; }
    }
    if (comGanho && !ganhoEstimado) {
      let somas;
      /* sem cota exata, as colunas vão em blocos pelo fator (os mesmos números que uma a uma); com elas, uma a uma pela sela */
      if (fator) somas = somaDasColunasAbsolutas(fator, sensibilidade.map((s) => [...s]), { grupo: Int32Array.from(direcoes, (d) => d.j), tamanho: nV });
      else {
        somas = new Float64Array(nV); const zeroX = new Array(nZ).fill(0); const zeroG = new Array(nR).fill(0);
        const acumular = (x) => { for (let k = 0; k < nZ; k++) somas[direcoes[k].j] += Math.abs(x[k]); };
        const umaColuna = resolverDoGanho ?? resolver;
        for (const s of sensibilidade) { for (const [r, v] of s) zeroX[r] = v; acumular(umaColuna(zeroX, zeroG).x); for (const [r] of s) zeroX[r] = 0; }
        for (let t = 0; t < nR; t++) { zeroG[t] = 1; acumular(umaColuna(zeroX, zeroG).x); zeroG[t] = 0; }
      }
      let pior = 0;
      for (let j = 0; j < nV; j++) if (somas[j] > ganho) { ganho = somas[j]; pior = j; }
      if (ganho > GANHO_MAXIMO_DAS_MEDIDAS) throw new ErroDasMedidas(`as medidas formam sistema mal condicionado (ganho ${ganho.toPrecision(3)}, acima de ${GANHO_MAXIMO_DAS_MEDIDAS}), com o pior no vértice ${pior}`, M);
    }
    return { V, ganho, ganhoEstimado, curvatura };
  };
  let B = P; let r = null; const mudancas = [];
  for (let it = 0; it < ITERACOES_DA_CURVATURA; it++) {
    r = umaConta(B, it === ITERACOES_DA_CURVATURA - 1);
    if (it > 0) { let m = 0; for (let j = 0; j < nV; j++) m = Math.max(m, Math.hypot(r.V[j][0] - B[j][0], r.V[j][1] - B[j][1], r.V[j][2] - B[j][2])); mudancas.push(m); }
    B = r.V;
  }
  return { vertices: r.V, ganho: r.ganho, ganhoEstimado: r.ganhoEstimado, curvatura: r.curvatura, mudancas };
}

/* O ajuste com peso sem cota exata, pelo Cholesky esparso: H = Σ p_i W̃_iᵀ W̃_i + I (ou a energia mais o resto) é simétrica positiva
 * definida, montada por soma na mesma ordem da matriz densa e fatorada na ordem de grau mínimo. O ganho ‖H⁻¹ S‖∞, com S as colunas
 * p_i W̃_iᵀ que cada cota move, tem a cota ‖H⁻¹‖∞ ‖S‖∞, e ‖H⁻¹‖∞ a cota de Varah quando H é estritamente diagonal dominante (o caso sem
 * energia: a diagonal 1 mais a soma dos quadrados passa a soma dos produtos cruzados). Com a cota até GANHO_MAXIMO_DAS_MEDIDAS a recusa
 * é impossível, a conta exata não roda e o ganho devolvido é a cota (`ganhoPelaCota`). Acima dela roda a conta exata, uma resolução por
 * cota, e os pontos da recusa saem da resolução na linha do pior vértice (H é simétrica, e a linha dele em H⁻¹ S é Sᵀ H⁻¹ e_pior).
 * Devolve null quando o Cholesky para, e quem chama cai na eliminação densa, com as recusas dela. */
function ajustePositivoEsparso({ P, U, comPeso, pesoDe, esparsa }) {
  const nU = U.length; const H = matrizPorLinhas(nU);
  const rhs = [0, 1, 2].map((ax) => U.map((j) => P[j][ax]));
  for (let k = 0; k < nU; k++) H.somar(k, k, 1);
  const sensibilidade = []; const normaDeS = new Float64Array(nU);
  for (const i of comPeso) {
    const { termos, b } = esparsa(i); const p = pesoDe.get(i);
    for (const [r, wr] of termos) for (const [c, wc] of termos) H.somar(r, c, p * wr * wc);
    for (const [r, wr] of termos) for (let ax = 0; ax < 3; ax++) rhs[ax][r] += p * wr * (P[i][ax] - b[ax]);
    const e = new Map(); for (const [r, wr] of termos) e.set(r, (e.get(r) ?? 0) + p * wr);
    for (const [r, v] of e) normaDeS[r] += Math.abs(v);
    sensibilidade.push(e);
  }
  const fator = fatorarCholesky(H);
  if (fator.naoPositivaEm !== undefined) return null;
  let maiorS = 0; for (const v of normaDeS) maiorS = Math.max(maiorS, v);
  const cota = cotaDeVarah(H) * maiorS;
  let ganho = cota; let ganhoPelaCota = true;
  if (!(cota <= GANHO_MAXIMO_DAS_MEDIDAS)) {
    ganhoPelaCota = false;
    const somas = new Float64Array(nU); const e = new Array(nU).fill(0);
    for (const s of sensibilidade) {
      for (const [r, v] of s) e[r] = v;
      const coluna = resolverCholesky(fator, e);
      for (const [r] of s) e[r] = 0;
      for (let r = 0; r < nU; r++) somas[r] += Math.abs(coluna[r]);
    }
    ganho = 0; let pior = 0;
    for (let r = 0; r < nU; r++) if (somas[r] > ganho) { ganho = somas[r]; pior = r; }
    if (ganho > GANHO_MAXIMO_DAS_MEDIDAS) {
      e[pior] = 1; const z = resolverCholesky(fator, e);
      const linha = sensibilidade.map((s) => { let v = 0; for (const [r, w] of s) v += w * z[r]; return Math.abs(v); });
      const maior = Math.max(...linha);
      throw new ErroDasMedidas(`as medidas formam sistema mal condicionado (ganho ${ganho.toPrecision(3)}, acima de ${GANHO_MAXIMO_DAS_MEDIDAS})`, comPeso.filter((_, t) => linha[t] >= 0.01 * maior).sort((a, b) => a - b));
    }
  }
  return { eixos: rhs.map((b) => resolverCholesky(fator, b)), ganho, ganhoPelaCota };
}

/* os passos de refinamento iterativo da resolução final do ponto de sela (medidos nos testes da energia de curvatura com cotas exatas) */
const PASSOS_DE_REFINAMENTO = 2;

/* H e o lado direito do bloco de x, os mesmos do caminho positivo definido, montados na mesma ordem */
function montarH({ P, U, comPeso, pesoDe, esparsa }) {
  const nU = U.length; const H = matrizPorLinhas(nU);
  const rhs = [0, 1, 2].map((ax) => U.map((j) => P[j][ax]));
  for (let k = 0; k < nU; k++) H.somar(k, k, 1);
  const sensibilidade = [];
  for (const i of comPeso) {
    const { termos, b } = esparsa(i); const p = pesoDe.get(i);
    for (const [r, wr] of termos) for (const [c, wc] of termos) H.somar(r, c, p * wr * wc);
    for (const [r, wr] of termos) for (let ax = 0; ax < 3; ax++) rhs[ax][r] += p * wr * (P[i][ax] - b[ax]);
    const e = new Map(); for (const [r, wr] of termos) e.set(r, (e.get(r) ?? 0) + p * wr);
    sensibilidade.push(e);
  }
  return { H, rhs, sensibilidade };
}

/* O ajuste com peso e cotas exatas, pelo complemento de Schur (`fatorarSelaPorSchur`): o LU esparso do sistema inteiro enche de 6 a 20
 * vezes mais que o Cholesky do mesmo tamanho, porque as linhas das restrições não têm diagonal. O ganho é o exato, uma resolução por cota,
 * e os pontos da recusa saem da resolução na linha do pior vértice (o sistema é simétrico). O sistema singular nomeia as cotas exatas na
 * união dos suportes da base do núcleo, que não depende da ordem. Devolve null quando o Cholesky de H para. */
function ajusteDeSelaEsparso({ P, U, comPeso, exatos, pesoDe, esparsa }) {
  const nU = U.length; const nE = exatos.length;
  const { H, rhs, sensibilidade } = montarH({ P, U, comPeso, pesoDe, esparsa });
  const g = [[], [], []];
  const linhasDeG = exatos.map((i, s) => {
    const { termos, b } = esparsa(i);
    for (let ax = 0; ax < 3; ax++) g[ax][s] = P[i][ax] - b[ax];
    return termos;
  });
  const sela = fatorarSelaPorSchur(H, linhasDeG);
  if (!sela) return null;
  if (sela.nucleo) throw new ErroDasMedidas('as medidas formam sistema singular, porque a superfície limite não separa estes pontos', sela.nucleo.map((s) => exatos[s]).sort((a, b) => a - b));
  const zeroX = new Array(nU).fill(0); const zeroG = new Array(nE).fill(0);
  const somas = new Float64Array(nU);
  const acumular = (x) => { for (let r = 0; r < nU; r++) somas[r] += Math.abs(x[r]); };
  for (const s of sensibilidade) { for (const [r, v] of s) zeroX[r] = v; acumular(sela.resolver(zeroX, zeroG).x); for (const [r] of s) zeroX[r] = 0; }
  for (let t = 0; t < nE; t++) { zeroG[t] = 1; acumular(sela.resolver(zeroX, zeroG).x); zeroG[t] = 0; }
  let ganho = 0, pior = 0;
  for (let r = 0; r < nU; r++) if (somas[r] > ganho) { ganho = somas[r]; pior = r; }
  if (ganho > GANHO_MAXIMO_DAS_MEDIDAS) {
    zeroX[pior] = 1; const { x, mu } = sela.resolver(zeroX, zeroG);
    const linha = [...sensibilidade.map((s) => { let v = 0; for (const [r, w] of s) v += w * x[r]; return Math.abs(v); }), ...mu.map(Math.abs)];
    const maior = Math.max(...linha);
    throw new ErroDasMedidas(`as medidas formam sistema mal condicionado (ganho ${ganho.toPrecision(3)}, acima de ${GANHO_MAXIMO_DAS_MEDIDAS})`, [...comPeso, ...exatos].filter((_, t) => linha[t] >= 0.01 * maior).sort((a, b) => a - b));
  }
  return { eixos: rhs.map((f, ax) => sela.resolver(f, g[ax], { refinar: PASSOS_DE_REFINAMENTO }).x), ganho, ganhoPelaCota: false };
}

/* Medidas com peso: a superfície limite se aproxima das cotas por mínimos quadrados, sem ser forçada a passar por elas,
 * para que muitas cotas lidas de imagem, cada uma com o seu erro, não ondulem a chapa. A medida exata (peso infinito)
 * continua restrição. As incógnitas são as posições x_U de U, os vértices das estrelas dos pontos com peso e os pontos
 * exatos; os demais ficam onde a gaiola os declarou, porque nenhum ponto limite medido depende deles. Com L_i(x) = W_i · x
 * o ponto limite do ponto medido i, a_i a cota (a posição declarada dele), c_j a posição declarada de cada vértice e p_i
 * o peso, a gaiola ajustada minimiza
 *
 *   E(x) = Σ_{i com peso} p_i ‖L_i(x) − a_i‖² + Σ_{j ∈ U} ‖x_j − c_j‖²     sujeita a  L_k(x) = a_k  para cada k exato.
 *
 * O segundo termo é a regularização: cada vértice de U, medido ou não, paga o quadrado do quanto anda, e por isso os
 * pontos não medidos ficam perto da gaiola declarada e o ponto medido só anda o que a cota justifica. O peso não tem
 * unidade: peso 1 pesa o desvio da superfície à cota igual ao deslocamento de um ponto da gaiola, e o desvio que sobra
 * na cota cai com o peso, até a medida exata no limite. Como o ponto limite é média da estrela, a cota que discorda das
 * vizinhas (o ruído) só seria alcançada movendo a gaiola várias vezes o erro, o que a regularização cobra; a cota que
 * concorda com as vizinhas (o encolhimento da aproximação) custa pouco e é seguida. Zerando o gradiente, com W̃_i os
 * pesos de W_i em U e b_i a parte de W_i · c fora de U, sai o sistema normal, o mesmo nos três eixos:
 *
 *   [ H  Gᵀ ] [ x_U ]   [ Σ p_i W̃_iᵀ (a_i − b_i) + c_U ]        H = Σ p_i W̃_iᵀ W̃_i + I,
 *   [ G  0  ] [  μ  ] = [ a_E − b_E                     ]        G = as linhas W̃_k dos pontos exatos,
 *
 * em que μ são os multiplicadores das restrições. Sem cota exata não há μ, H é positiva definida e se resolve pelo Cholesky esparso
 * (`ajustePositivoEsparso`); com cotas exatas, ou quando o Cholesky para, pela eliminação de Gauss em ordem fixa (U e os pontos em ordem
 * crescente de índice). As duas são determinísticas bit a bit. O ganho é o mesmo das medidas exatas: o maior fator pelo qual um erro
 * nas cotas vira deslocamento de um ponto da gaiola, ‖∂x_U/∂a‖∞. Sem cota exata e sem a energia, a cota de Varah o limita sem resolver
 * nada e, quando ela fica até o limite, o ganho devolvido é a cota (`ganhoPelaCota: true`); nos outros casos ele é calculado resolvendo
 * o sistema para cada cota. Acima de GANHO_MAXIMO_DAS_MEDIDAS falha com os pontos que mais pesam, e o sistema singular falha com os pontos
 * do vetor nulo.
 *
 * Com `regularizacao: { tipo: 'variacaoDeCurvatura', onda? }` o segundo termo deixa de ser o deslocamento e passa a ser a variação da
 * curvatura normal da superfície limite (`energiaDeCurvaturaNormal`), a cota com peso pesa só na normal, e do deslocamento fica o resto
 * RESTO_DO_DESLOCAMENTO, num sistema só nos três eixos que a conta refaz ITERACOES_DA_CURVATURA vezes (`ajusteDaCurvaturaNormal`).
 * Todos os vértices da gaiola são incógnitas, a lista só de cotas exatas é aceita (o ajuste exato de `ajustarGaiolaAsMedidas` não tem
 * regularização), e a saída ganha `regularizacao: { tipo, onda, passo, arestasComTermo, energiaAntes, energiaDepois, iteracoes, mudancas }`,
 * com a energia da última conta e a maior mudança entre duas seguidas. Sem o argumento (ou null) a conta é a de sempre, operação por operação. */
function ajustarComPesoSemMemoria(gaiola, medidas, regularizacao = null, { denso = false } = {}) {
  const energia = lerRegularizacao(regularizacao);
  const { nitidez, C, facesDoV } = prepararLimite(gaiola);
  const borda = gaiola.borda ?? 'suave'; const P = gaiola.vertices; const F = gaiola.faces;
  if (!Array.isArray(medidas)) throw new TypeError('subdivisão: medidas precisa ser lista de { indice, peso }');
  const pesoDe = new Map();
  for (const m of medidas) {
    const i = m?.indice; const p = m?.peso;
    if (!Number.isInteger(i) || i < 0 || i >= P.length) throw new TypeError(`subdivisão: medida cita vértice inexistente ${i}`);
    if (!(p > 0)) throw new TypeError(`subdivisão: o peso da medida do vértice ${i} precisa ser maior que zero, e veio ${p}`);
    if (!facesDoV[i].length) throw new ErroDasMedidas('medida em vértice sem face', [i]);
    if (pesoDe.has(i) && pesoDe.get(i) !== p) throw new ErroDasMedidas('o mesmo ponto aparece em medidas com pesos diferentes', [i]);
    pesoDe.set(i, p);
  }
  const M = [...pesoDe.keys()].sort((a, b) => a - b);
  const exatos = M.filter((i) => pesoDe.get(i) === Infinity); const comPeso = M.filter((i) => pesoDe.get(i) !== Infinity);
  /* as estrelas e os pesos do ponto limite de cada ponto medido, calculados uma vez */
  const linhaDe = new Map(M.map((i) => {
    const est = estrelaDe(P, F, facesDoV[i], nitidez, i);
    return [i, { globais: est.globais, w: pesosDaEstrela(est, C.has(i), borda) }];
  }));
  /* com a energia o ajuste é o da curvatura normal, num sistema só nos três eixos */
  if (energia) {
    const r = ajusteDaCurvaturaNormal({ gaiola, energia, M, exatos, comPeso, pesoDe, linhaDe, denso });
    const V = r.vertices;
    const residuos = M.map((i) => { const L = limiteDaEstrela(estrelaDe(V, F, facesDoV[i], nitidez, i), C.has(i), borda); return Math.hypot(P[i][0] - L[0], P[i][1] - L[1], P[i][2] - L[2]); });
    const fora = M.filter((i, k) => pesoDe.get(i) === Infinity && residuos[k] > TOLERANCIA_DAS_MEDIDAS);
    if (fora.length) throw new ErroDasMedidas(`a superfície limite não chegou a ${TOLERANCIA_DAS_MEDIDAS} m das medidas exatas`, fora);
    const c = r.curvatura;
    return { vertices: V, ganho: r.ganho, ganhoPelaCota: false, ganhoEstimado: r.ganhoEstimado, residuos, medidas: M, regularizacao: { tipo: energia.tipo, onda: c.onda, passo: c.passo, arestasComTermo: c.termos.length, energiaAntes: c.valor(P), energiaDepois: c.valor(V), iteracoes: ITERACOES_DA_CURVATURA, mudancas: r.mudancas } };
  }
  const emU = new Set(exatos);
  for (const i of comPeso) for (const j of linhaDe.get(i).globais) emU.add(j);
  const U = [...emU].sort((a, b) => a - b); const col = new Map(U.map((j, k) => [j, k]));
  const nU = U.length; const nE = exatos.length; const n = nU + nE;
  /* cada ponto medido como linha esparsa sobre U ([coluna, peso]) e a parte fixa b_i fora de U */
  const esparsa = (i) => {
    const { globais, w } = linhaDe.get(i); const termos = []; const b = [0, 0, 0];
    globais.forEach((j, c) => {
      if (w[c] === 0) return;
      const k = col.get(j);
      if (k !== undefined) termos.push([k, w[c]]);
      else { b[0] += w[c] * P[j][0]; b[1] += w[c] * P[j][1]; b[2] += w[c] * P[j][2]; }
    });
    return { termos, b };
  };
  /* sem cota exata o sistema é positivo definido e vai ao Cholesky esparso; com elas, ou quando o Cholesky para, à eliminação densa */
  const esparso = denso ? null : nE === 0 ? ajustePositivoEsparso({ P, U, comPeso, pesoDe, esparsa }) : ajusteDeSelaEsparso({ P, U, comPeso, exatos, pesoDe, esparsa });
  const { eixos, ganho, ganhoPelaCota } = esparso ?? ajusteDenso();
  function ajusteDenso() {
    const A = Array.from({ length: n }, () => new Array(n).fill(0));
    const rhs = [0, 1, 2].map((ax) => U.map((j) => P[j][ax]).concat(new Array(nE).fill(0)));
    for (let k = 0; k < nU; k++) A[k][k] = 1;
    const sensibilidade = []; // a coluna do lado direito que cada cota move, para o ganho
    for (const i of comPeso) {
      const { termos, b } = esparsa(i); const p = pesoDe.get(i);
      for (const [r, wr] of termos) for (const [c, wc] of termos) A[r][c] += p * wr * wc;
      for (const [r, wr] of termos) for (let ax = 0; ax < 3; ax++) rhs[ax][r] += p * wr * (P[i][ax] - b[ax]);
      const e = new Array(n).fill(0); for (const [r, wr] of termos) e[r] += p * wr;
      sensibilidade.push(e);
    }
    exatos.forEach((i, s) => {
      const { termos, b } = esparsa(i); const r = nU + s;
      for (const [c, wc] of termos) { A[r][c] += wc; A[c][r] += wc; }
      for (let ax = 0; ax < 3; ax++) rhs[ax][r] = P[i][ax] - b[ax];
      const e = new Array(n).fill(0); e[r] = 1;
      sensibilidade.push(e);
    });
    const quem = [...comPeso, ...exatos];
    const lu = fatorarLU(A);
    if (lu.singularEm >= 0) {
      const x = vetorNulo(lu, lu.singularEm); const maior = Math.max(...x.map(Math.abs));
      const envolvidos = new Set();
      x.forEach((v, r) => { if (Math.abs(v) > 1e-9 * maior) envolvidos.add(r < nU ? U[r] : exatos[r - nU]); });
      throw new ErroDasMedidas('as medidas formam sistema singular, porque a superfície limite não separa estes pontos', [...envolvidos].sort((a, b) => a - b));
    }
    const colunas = sensibilidade.map((e) => resolverLU(lu, e));
    let ganho = 0, pior = 0;
    for (let r = 0; r < nU; r++) { let s = 0; for (const c of colunas) s += Math.abs(c[r]); if (s > ganho) { ganho = s; pior = r; } }
    if (ganho > GANHO_MAXIMO_DAS_MEDIDAS) {
      const maior = Math.max(...colunas.map((c) => Math.abs(c[pior])));
      throw new ErroDasMedidas(`as medidas formam sistema mal condicionado (ganho ${ganho.toPrecision(3)}, acima de ${GANHO_MAXIMO_DAS_MEDIDAS})`, quem.filter((_, t) => Math.abs(colunas[t][pior]) >= 0.01 * maior).sort((a, b) => a - b));
    }
    return { eixos: rhs.map((b) => resolverLU(lu, b)), ganho, ganhoPelaCota: false };
  }
  const V = P.map((p) => [...p]);
  U.forEach((j, r) => { V[j] = [eixos[0][r], eixos[1][r], eixos[2][r]]; });
  /* conferência pela geometria da gaiola nova: o exato passa a TOLERANCIA_DAS_MEDIDAS, o com peso só relata o desvio */
  const residuos = M.map((i) => {
    const L = limiteDaEstrela(estrelaDe(V, F, facesDoV[i], nitidez, i), C.has(i), borda);
    return Math.hypot(P[i][0] - L[0], P[i][1] - L[1], P[i][2] - L[2]);
  });
  const fora = M.filter((i, r) => pesoDe.get(i) === Infinity && residuos[r] > TOLERANCIA_DAS_MEDIDAS);
  if (fora.length) throw new ErroDasMedidas(`a superfície limite não chegou a ${TOLERANCIA_DAS_MEDIDAS} m das medidas exatas`, fora);
  return { vertices: V, ganho, ganhoPelaCota, residuos, medidas: M };
}

/* O mesmo ajuste com os mesmos argumentos sai da memória (ver `subdividirCatmullClark`): é a conta mais cara da leitura da superfície. */
export const ajustarGaiolaAsMedidasComPeso = memoizarPura(ajustarComPesoSemMemoria);

/** O mesmo ajuste sempre pela eliminação densa, sem memória: a referência contra a qual os testes e o ensaio medem o caminho esparso. */
export const ajustarGaiolaAsMedidasComPesoDenso = (gaiola, medidas, regularizacao = null) => ajustarComPesoSemMemoria(gaiola, medidas, regularizacao, { denso: true });

/**
 * operadorDasMedidas(gaiola, medidas) -> { aplicar(delta), exato }
 * A mesma gaiola ajustada de `ajustarGaiolaAsMedidas` (todas as medidas exatas) ou de `ajustarGaiolaAsMedidasComPeso`
 * (as outras), vista como a transformação linear que ela é: a posição ajustada de cada vértice é combinação linear das
 * posições declaradas, com os mesmos pesos do ponto limite e a mesma fatoração. `aplicar(delta)` recebe um campo de
 * deslocamentos [x, y, z] por vértice da gaiola (a lista toda, com [0, 0, 0] onde nada se move) e devolve o deslocamento
 * que esse campo causa na gaiola ajustada: quem edita pontos declarados lê, sem refatorar nem refazer a superfície, quanto
 * a gaiola ajustada se move. `medidas` é a lista de { indice, peso } da gaiola, com peso Infinity para a medida exata, como
 * o passo `subdivisao` as monta, e `regularizacao` a do passo (a que `gaiolaDoPasso` devolve), ou nada. Não confere o ganho nem os
 * resíduos, que as duas funções acima conferem na primeira vez. Com a regularização o ajuste não é linear na gaiola declarada: a
 * curvatura normal congela a normal e a métrica da gaiola e refaz a conta sobre a anterior. O operador então refaz o ajuste inteiro das
 * posições que recebe (`aplicar(vertices)` devolve a gaiola ajustada delas), e `linear: false` diz que `aplicar(delta)` não é o
 * deslocamento causado pelo campo.
 */
export function operadorDasMedidas(gaiola, medidas, regularizacao = null) {
  const energia = lerRegularizacao(regularizacao);
  if (energia && energia.onda !== null) { const passo = passoDaGaiola(gaiola.vertices, gaiola.faces); if (!(energia.onda >= ONDA_MINIMA_EM_PASSOS * passo && energia.onda <= ONDA_MAXIMA_EM_PASSOS * passo)) throw new ErroDaOnda(energia.onda, passo); }
  if (energia) return { aplicar: (D) => ajustarComPesoSemMemoria({ ...gaiola, vertices: D }, medidas, regularizacao).vertices, exato: false, linear: false, tamanho: gaiola.vertices.length };
  const { nitidez, C, facesDoV } = prepararLimite(gaiola);
  const borda = gaiola.borda ?? 'suave'; const P = gaiola.vertices; const F = gaiola.faces;
  const pesoDe = new Map();
  for (const m of medidas) pesoDe.set(m.indice, m.peso);
  const M = [...pesoDe.keys()].sort((a, b) => a - b);
  const exato = M.every((i) => pesoDe.get(i) === Infinity);
  const nV = P.length;
  const linhaDe = new Map(M.map((i) => {
    const est = estrelaDe(P, F, facesDoV[i], nitidez, i);
    return [i, { globais: est.globais, w: pesosDaEstrela(est, C.has(i), borda) }];
  }));
  const somar = (D, termos) => { const b = [0, 0, 0]; for (const [j, w] of termos) { b[0] += w * D[j][0]; b[1] += w * D[j][1]; b[2] += w * D[j][2]; } return b; };
  if (exato) {
    const linha = new Map(M.map((i, r) => [i, r])); const n = M.length;
    const A = matrizPorLinhas(n);
    const fora = M.map((i) => {
      const { globais, w } = linhaDe.get(i); const r = linha.get(i); const termos = [];
      globais.forEach((j, c) => { const k = linha.get(j); if (k !== undefined) { if (w[c] !== 0) A.somar(r, k, w[c]); } else termos.push([j, w[c]]); });
      return termos;
    });
    const lu = fatorarLUEsparso(A, { comoADensa: true });
    if (lu.deficientes.length) throw new ErroDasMedidas('as medidas formam sistema singular, porque a superfície limite não separa estes pontos', M);
    const aplicar = (D) => {
      const B = M.map((i, r) => { const b = somar(D, fora[r]); return [D[i][0] - b[0], D[i][1] - b[1], D[i][2] - b[2]]; });
      const eixos = [0, 1, 2].map((ax) => resolverLUEsparso(lu, B.map((b) => b[ax])));
      const V = D.map((d) => [...d]);
      M.forEach((i, r) => { V[i] = [eixos[0][r], eixos[1][r], eixos[2][r]]; });
      return V;
    };
    return { aplicar, exato, linear: true, tamanho: nV };
  }
  const exatos = M.filter((i) => pesoDe.get(i) === Infinity); const comPeso = M.filter((i) => pesoDe.get(i) !== Infinity);
  const emU = new Set(exatos);
  for (const i of comPeso) for (const j of linhaDe.get(i).globais) emU.add(j);
  const U = [...emU].sort((a, b) => a - b); const col = new Map(U.map((j, k) => [j, k]));
  const nU = U.length; const nE = exatos.length; const n = nU + nE;
  const esparsa = (i) => {
    const { globais, w } = linhaDe.get(i); const termos = []; const fora = [];
    globais.forEach((j, c) => {
      if (w[c] === 0) return;
      const k = col.get(j);
      if (k !== undefined) termos.push([k, w[c]]); else fora.push([j, w[c]]);
    });
    return { termos, fora };
  };
  /* H por linhas e, à parte, as linhas das cotas exatas: sem elas o sistema vai ao Cholesky esparso, com elas ao complemento de Schur,
     como no ajuste; quando o Cholesky para, a matriz inteira vai à eliminação densa */
  const H = matrizPorLinhas(nU);
  for (let k = 0; k < nU; k++) H.somar(k, k, 1);
  const linhasComPeso = comPeso.map((i) => {
    const e = esparsa(i); const p = pesoDe.get(i);
    for (const [r, wr] of e.termos) for (const [c, wc] of e.termos) H.somar(r, c, p * wr * wc);
    return { i, p, ...e };
  });
  const linhasExatas = exatos.map((i, s) => ({ i, r: nU + s, ...esparsa(i) }));
  let resolver = null;
  if (nE === 0) {
    const fator = fatorarCholesky(H);
    if (fator.naoPositivaEm === undefined) resolver = (b) => resolverCholesky(fator, b);
  } else {
    const sela = fatorarSelaPorSchur(H, linhasExatas.map((l) => l.termos));
    if (sela?.nucleo) throw new ErroDasMedidas('as medidas formam sistema singular, porque a superfície limite não separa estes pontos', M);
    if (sela) resolver = (b) => { const { x, mu } = sela.resolver(b.slice(0, nU), b.slice(nU), { refinar: PASSOS_DE_REFINAMENTO }); return [...x, ...mu]; };
  }
  if (!resolver) {
    const A = paraDensa({ n, linhas: [...H.linhas, ...Array.from({ length: nE }, () => new Map())].map((l) => new Map(l)) });
    for (const { r, termos } of linhasExatas) for (const [c, wc] of termos) { A[r][c] += wc; A[c][r] += wc; }
    const lu = fatorarLU(A);
    if (lu.singularEm >= 0) throw new ErroDasMedidas('as medidas formam sistema singular, porque a superfície limite não separa estes pontos', M);
    resolver = (b) => resolverLU(lu, b);
  }
  const aplicar = (D) => {
    const rhs = [0, 1, 2].map((ax) => U.map((j) => D[j][ax]).concat(new Array(nE).fill(0)));
    for (const { i, p, termos, fora } of linhasComPeso) {
      const b = somar(D, fora);
      for (const [r, wr] of termos) for (let ax = 0; ax < 3; ax++) rhs[ax][r] += p * wr * (D[i][ax] - b[ax]);
    }
    for (const { i, r, fora } of linhasExatas) {
      const b = somar(D, fora);
      for (let ax = 0; ax < 3; ax++) rhs[ax][r] = D[i][ax] - b[ax];
    }
    const eixos = rhs.map(resolver);
    const V = D.map((d) => [...d]);
    U.forEach((j, r) => { V[j] = [eixos[0][r], eixos[1][r], eixos[2][r]]; });
    return V;
  };
  return { aplicar, exato, linear: true, tamanho: nV };
}

/** Fração do porte da superfície até a qual um vértice está no plano x = 0 da simetria: o vértice fora da costura tem a imagem
 *  dele a 2 |x|, e a essa distância os dois seriam o mesmo ponto. */
export const FOLGA_DA_COSTURA = 1e-12;

/** costuraEmXExata(vertices, nSuperficie, comInterna) -> { vertices, mudaram }
 *  Na superfície subdividida de uma gaiola espelhada, a costura é o plano x = 0, mas a soma em ordem diferente das duas metades
 *  (e a normal média da espessura, na face interna) deixa nela resíduos de 1e-19 a 1e-17 m, e a solda que procura x igual a 0
 *  não a acha. Devolve a lista nova com x = 0 exato nos vértices da superfície (os `nSuperficie` primeiros) a até
 *  FOLGA_DA_COSTURA do porte do plano e, com `comInterna` (a espessura), no vértice da face interna que corresponde a cada um (o
 *  índice dele mais `nSuperficie`); `mudaram` conta os vértices que saíram do lugar. Não muda a lista recebida. */
export function costuraEmXExata(vertices, nSuperficie, comInterna = false) {
  let porte = 0;
  for (let k = 0; k < nSuperficie; k++) for (const c of vertices[k]) porte = Math.max(porte, Math.abs(c));
  const folga = FOLGA_DA_COSTURA * porte;
  const saida = vertices.slice();
  let mudaram = 0;
  const zerar = (k) => { if (saida[k][0] !== 0) { saida[k] = [0, saida[k][1], saida[k][2]]; mudaram++; } };
  for (let k = 0; k < nSuperficie; k++) {
    if (Math.abs(vertices[k][0]) > folga) continue;
    zerar(k);
    if (comInterna) zerar(k + nSuperficie);
  }
  return { vertices: saida, mudaram };
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

/* ---- a superfície limite exata: o oráculo ----
 *
 * `superficieLimite(gaiola)` avalia a superfície limite de Catmull-Clark num ponto (face, u, v) da gaiola, sem malha intermediária e sem
 * aproximação, com a posição, as derivadas primeira e segunda, a normal, as curvaturas principais e as direções delas. Serve de régua para
 * as ferramentas que leem a curvatura da malha entregue (de nível finito, em que a curvatura sai por diferença) e para os gates de forma.
 *
 * O RETALHO REGULAR. Fora dos vértices extraordinários e dos vincos, a superfície limite sobre uma face de quatro lados é a B-spline bicúbica
 * uniforme dos 16 pontos da grade 4 x 4 em volta dela (Stam 1998; é o que faz a regra de Catmull-Clark ser C2 ali). A face é regular quando
 * cada canto tem quatro arestas e quatro quadriláteros, sem nitidez e sem ser canto declarado. A borda e o vinco vivo também dão retalho
 * polinomial, com a fileira de fora trocada pela reflexão linear da de dentro (P_fora = 2 P_borda - P_dentro): a regra de vinco (6P + A + B) / 8
 * e o ponto médio da aresta viva são exatamente a regra da B-spline sobre essa fileira, nível após nível. Isso vale no canto da borda que
 * tem uma aresta viva de cada lado da face e mais uma que a continua (o vértice de borda de valência 3, o vinco de valência 4), e no canto
 * que é canto (declarado, `borda: 'cantos'` com uma face, ou três arestas vivas), onde a reflexão das duas direções dá P fixo.
 *
 * PERTO DO EXTRAORDINÁRIO. A face que não é regular (um canto de valência diferente de 4, um vinco de nitidez finita, o canto de borda com
 * `borda: 'suave'`, o dardo) se refina só na vizinhança dela: o anel de faces que tocam os cantos dela refina pela mesma `refinar` da
 * subdivisão, que dá os pontos certos da face filha e do anel da filha, e a filha que contém (u, v) é a nova face. Cada nível divide o
 * parâmetro por dois; a filha que não toca o canto irregular já é regular, de modo que o ponto a uma fração f do canto extraordinário
 * chega ao retalho regular em uns log2(1/f) níveis, e a nitidez finita s se apaga em ceil(s) níveis. O anel é transladado para o primeiro
 * vértice da face antes de refinar (a regra é média ponderada, e a translação não muda o resultado), e por isso as diferenças da grade
 * fundo continuam com a precisão relativa da máquina. O erro, porém, cresce com o fundo: o anel de m níveis tem tamanho físico lambda^m (lambda,
 * o autovalor subdominante da valência n, c = cos(2 pi / n): (c + 5 + raiz((c + 9)(c + 1))) / 16, que é 0,41 na valência 3, 0,55 na 5,
 * 0,58 na 6 e 0,61 na 8) e o parâmetro 2^-m, e o ruído da máquina do anel vira erro relativo de curvatura de uns eps lambda^-m. Por isso
 * a avaliação para no fundo em que isso chega a `ERRO_RELATIVO_DA_CURVATURA` (2e-8), que depende da valência: uns 2^-20 do canto na
 * valência 3 (num plano o oráculo devolvia |k| de 1,8e-5 a 2^-30 e 5,4 a 2^-45, com `extraordinario: false`), 2^-30 na 5 e mais fundo nas
 * maiores, com o teto de `PROFUNDIDADE_DO_LIMITE`. No próprio vértice extraordinário, e abaixo desse piso, a posição sai da fórmula
 * fechada do ponto limite (a de `limitesDaGaiola`), a normal da avaliação logo acima do piso, e a curvatura não existe (a de Catmull-Clark
 * diverge ou depende da direção ali), e sai null com `extraordinario: true`.
 *
 * O PARÂMETRO. Na face de quatro lados [c0, c1, c2, c3], u vai de c0 a c1 e v de c0 a c3, de 0 a 1; na de n lados, `canto` escolhe o
 * quadrilátero do canto k depois de um refino (c_k em (0, 0), u para o meio da aresta (c_k, c_k+1), v para o da aresta (c_k-1, c_k)). As
 * derivadas saem nesse parâmetro; a normal é du x dv unitária, que segue a orientação da face.
 *
 * O SINAL DA CURVATURA. A curvatura normal é k(d) = -II(d)/I(d), positiva quando a superfície se afasta da normal (convexa vista do lado da
 * normal, a calota com a normal para fora), o sinal de `continuidade-nas-emendas.mjs`; k1 >= k2 são as principais, K = k1 k2 e H a média. */

const PROFUNDIDADE_DO_LIMITE = 48;
const DELTA_NO_EXTRAORDINARIO = 2 ** -30;
const ERRO_RELATIVO_DA_CURVATURA = 2e-8;
const EPSILON_DA_MAQUINA = 2 ** -52;

/** o autovalor subdominante da subdivisão de Catmull-Clark num vértice interior de valência n */
export const autovalorSubdominante = (n) => { const c = Math.cos((2 * Math.PI) / n); return (c + 5 + Math.sqrt((c + 9) * (c + 1))) / 16; };

/** o fundo (níveis de refino) até o qual a curvatura perto de um vértice interior de valência n guarda `ERRO_RELATIVO_DA_CURVATURA`:
 *  eps lambda^-m <= erro; a valência 4 não tem piso */
export function fundoUtilDaValencia(n) {
  if (n === 4) return PROFUNDIDADE_DO_LIMITE;
  return Math.min(PROFUNDIDADE_DO_LIMITE, Math.floor(Math.log(ERRO_RELATIVO_DA_CURVATURA / EPSILON_DA_MAQUINA) / -Math.log(autovalorSubdominante(n))));
}

/* o fundo útil da malha local: o menor da valência dos cantos interiores da face 0 que não têm quatro faces */
function fundoUtilDaMalha({ F }) {
  let fundo = PROFUNDIDADE_DO_LIMITE;
  for (const c of F[0]) {
    let nF = 0; const viz = new Set();
    for (const f of F) { const k = f.indexOf(c); if (k < 0) continue; nF++; viz.add(f[(k + 1) % f.length]); viz.add(f[(k + f.length - 1) % f.length]); }
    if (nF !== 4 && viz.size === nF) fundo = Math.min(fundo, fundoUtilDaValencia(nF));
  }
  return fundo;
}

const PERTO = [[1, 0], [3, 1], [2, 3], [0, 2]];
const LONGE = [[2, 0], [3, 2], [1, 3], [0, 1]];
const DENTRO = [[1, 1], [2, 1], [2, 2], [1, 2]];
const CANTO_DA_GRADE = [[0, 0], [3, 0], [3, 3], [0, 3]];

/* o anel da face fi (ela e as faces que tocam algum canto dela), como malha local transladada para o primeiro vértice de fi; a face fi é a 0 */
function anelDaFace(V, F, nitidez, cantos, fi, facesDoV) {
  const outras = new Set();
  for (const c of F[fi]) for (const g of facesDoV[c]) if (g !== fi) outras.add(g);
  const lista = [fi, ...[...outras].sort((a, b) => a - b)];
  const o = V[F[fi][0]];
  const mapa = new Map(); const Vl = []; const globais = [];
  const Fl = lista.map((g) => F[g].map((j) => {
    let m = mapa.get(j);
    if (m === undefined) { m = Vl.length; mapa.set(j, m); Vl.push([V[j][0] - o[0], V[j][1] - o[1], V[j][2] - o[2]]); globais.push(j); }
    return m;
  }));
  const nl = new Map();
  for (const f of Fl) for (let k = 0; k < f.length; k++) {
    const a = f[k], b = f[(k + 1) % f.length]; const s = nitidez.get(chave(globais[a], globais[b]));
    if (s !== undefined) nl.set(chave(a, b), s);
  }
  const cl = new Set();
  for (const [j, m] of mapa) if (cantos.has(j)) cl.add(m);
  return { V: Vl, F: Fl, nitidez: nl, cantos: cl, origem: o };
}

/* a grade 4 x 4 da face 0 da malha local, com a reflexão na borda e no vinco vivo, ou null quando a face não é retalho regular */
function gradeDoRetalho({ V, F, nitidez, cantos }, borda) {
  const f = F[0];
  if (f.length !== 4) return null;
  const { arestas, indice } = arestasDa(F);
  const facesDoV = facesPorVertice(V.length, F);
  const incid = Array.from({ length: V.length }, () => []);
  arestas.forEach((e, k) => { incid[e.a].push(k); incid[e.b].push(k); });
  const sDe = (k) => (arestas[k].faces.length !== 2 ? NITIDEZ_INFINITA : (nitidez.get(chave(arestas[k].a, arestas[k].b)) ?? 0));
  const lados = [];
  for (let s = 0; s < 4; s++) {
    const a = f[s], b = f[(s + 1) % 4]; const k = indice.get(chave(a, b)); const sh = sDe(k);
    if (sh !== 0 && sh !== NITIDEZ_INFINITA) return null;
    if (sh === NITIDEZ_INFINITA) { lados.push({ vivo: true }); continue; }
    const g = arestas[k].faces.find((x) => x !== 0); const G = F[g];
    if (g === undefined || G.length !== 4) return null;
    const j = G.indexOf(b);
    if (G[(j + 1) % 4] !== a) return null;
    lados.push({ vivo: false, face: g, perto: G[(j + 2) % 4], longe: G[(j + 3) % 4] });
  }
  const P = Array.from({ length: 4 }, () => new Array(4).fill(null));
  for (let k = 0; k < 4; k++) P[DENTRO[k][0]][DENTRO[k][1]] = V[f[k]];
  const diagonais = [];
  for (let k = 0; k < 4; k++) {
    const c = f[k]; const A = lados[k]; const B = lados[(k + 3) % 4];
    const vivas = incid[c].filter((e) => sDe(e) > 0);
    if (vivas.some((e) => sDe(e) !== NITIDEZ_INFINITA)) return null;
    const canto = cantos.has(c) || (borda === 'cantos' && facesDoV[c].length === 1 && incid[c].some((e) => arestas[e].faces.length === 1));
    if (!A.vivo && !B.vivo) {
      if (canto || vivas.length || incid[c].length !== 4 || facesDoV[c].length !== 4) return null;
      const resto = facesDoV[c].filter((g) => g !== 0 && g !== A.face && g !== B.face);
      if (resto.length !== 1 || F[resto[0]].length !== 4) return null;
      const D = F[resto[0]]; const j = D.indexOf(c);
      const vizinhos = new Set([D[(j + 1) % 4], D[(j + 3) % 4]]);
      if (!vizinhos.has(A.perto) || !vizinhos.has(B.longe)) return null;
      diagonais.push({ tipo: 'face', v: D[(j + 2) % 4] });
    } else if (A.vivo !== B.vivo) {
      if (canto || vivas.length !== 2) return null;
      const continua = B.vivo ? A.perto : B.longe;
      const e = indice.get(chave(c, continua));
      if (e === undefined || sDe(e) !== NITIDEZ_INFINITA) return null;
      diagonais.push({ tipo: 'reflexo', lado: B.vivo ? k : (k + 3) % 4, perto: B.vivo });
    } else {
      if (!canto && vivas.length < 3) return null;
      diagonais.push({ tipo: 'reflexo', lado: k, perto: true });
    }
  }
  const em = ([i, j]) => P[i][j];
  const refletir = (a, b) => [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]];
  for (let s = 0; s < 4; s++) {
    const [ip, jp] = PERTO[s]; const [il, jl] = LONGE[s];
    if (lados[s].vivo) {
      P[ip][jp] = refletir(em(DENTRO[s]), em(DENTRO[(s + 3) % 4]));
      P[il][jl] = refletir(em(DENTRO[(s + 1) % 4]), em(DENTRO[(s + 2) % 4]));
    } else { P[ip][jp] = V[lados[s].perto]; P[il][jl] = V[lados[s].longe]; }
  }
  diagonais.forEach((d, k) => {
    const [i, j] = CANTO_DA_GRADE[k];
    if (d.tipo === 'face') { P[i][j] = V[d.v]; return; }
    /* a reflexão ao longo da fileira de fora do lado: a partir da célula do lado junto deste canto, contra a seguinte */
    P[i][j] = d.perto ? refletir(em(PERTO[d.lado]), em(LONGE[d.lado])) : refletir(em(LONGE[d.lado]), em(PERTO[d.lado]));
  });
  return P;
}

function baseCubica(t) {
  const s = 1 - t; const t2 = t * t; const t3 = t2 * t;
  return [
    [(s * s * s) / 6, (3 * t3 - 6 * t2 + 4) / 6, (-3 * t3 + 3 * t2 + 3 * t + 1) / 6, t3 / 6],
    [-(s * s) / 2, 1.5 * t2 - 2 * t, -1.5 * t2 + t + 0.5, t2 / 2],
    [s, 3 * t - 2, 1 - 3 * t, t],
  ];
}

/* posição e derivadas até a segunda da B-spline bicúbica da grade P no parâmetro (u, v) */
function avaliarGrade(P, u, v) {
  const bu = baseCubica(u); const bv = baseCubica(v);
  const soma = (du, dv) => {
    const r = [0, 0, 0];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const w = bu[du][i] * bv[dv][j]; const p = P[i][j];
      r[0] += w * p[0]; r[1] += w * p[1]; r[2] += w * p[2];
    }
    return r;
  };
  return { S: soma(0, 0), Su: soma(1, 0), Sv: soma(0, 1), Suu: soma(2, 0), Suv: soma(1, 1), Svv: soma(0, 2) };
}

const pontoV = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vetorial = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unitario = (a) => { const m = Math.hypot(a[0], a[1], a[2]); return m > 0 ? [a[0] / m, a[1] / m, a[2] / m] : null; };

/* normal, formas fundamentais e curvaturas a partir das derivadas (no parâmetro em que vierem: a curvatura não depende dele) */
function geometriaDoPonto({ Su, Sv, Suu, Suv, Svv }) {
  const n = unitario(vetorial(Su, Sv));
  if (!n) return { normal: null, k1: null, k2: null, K: null, H: null, d1: null, d2: null, fundamentais: null };
  const E = pontoV(Su, Su), Fm = pontoV(Su, Sv), G = pontoV(Sv, Sv);
  const L = -pontoV(Suu, n), M = -pontoV(Suv, n), N = -pontoV(Svv, n);
  const det = E * G - Fm * Fm;
  const K = (L * N - M * M) / det; const H = (E * N - 2 * Fm * M + G * L) / (2 * det);
  const disc = Math.sqrt(Math.max(0, H * H - K)); const k1 = H + disc; const k2 = H - disc;
  /* a direção principal de k: (L - k E) a + (M - k F) b = 0, ou a outra linha quando esta é nula */
  const direcao = (k) => {
    const r1 = [L - k * E, M - k * Fm]; const r2 = [M - k * Fm, N - k * G];
    const r = Math.hypot(...r1) >= Math.hypot(...r2) ? r1 : r2;
    const [a, b] = Math.hypot(...r) > 0 ? [-r[1], r[0]] : [1, 0];
    return unitario([a * Su[0] + b * Sv[0], a * Su[1] + b * Sv[1], a * Su[2] + b * Sv[2]]);
  };
  const d1 = direcao(k1); let d2 = direcao(k2);
  if (disc === 0 || !d2 || Math.abs(pontoV(d1, d2)) > 0.5) d2 = unitario(vetorial(n, d1));
  return { normal: n, k1, k2, K, H, d1, d2, fundamentais: { E, F: Fm, G, L, M, N, Su, Sv } };
}

/** curvaturaNormal(amostra, direcao) -> a curvatura normal (1/unidade) da amostra de `superficieLimite` na direção tangente `direcao`
 *  (vetor 3D, a parte fora do plano tangente é descartada), com o sinal de k1 e k2; null quando a amostra não tem curvatura. */
export function curvaturaNormal(amostra, direcao) {
  const f = amostra?.fundamentais;
  if (!f) return null;
  const { E, F: Fm, G, L, M, N, Su, Sv } = f;
  const x = pontoV(direcao, Su), y = pontoV(direcao, Sv); const det = E * G - Fm * Fm;
  const a = (G * x - Fm * y) / det, b = (E * y - Fm * x) / det;
  const I = E * a * a + 2 * Fm * a * b + G * b * b;
  return I > 0 ? (L * a * a + 2 * M * a * b + N * b * b) / I : null;
}

/* a filha da face 0 (de quatro lados) que contém (u, v), o parâmetro nela e a matriz J de d(u', v')/d(u, v) */
function filhaDoQuadrante(u, v) {
  if (u < 0.5 && v < 0.5) return { k: 0, u: 2 * u, v: 2 * v, J: [[2, 0], [0, 2]] };
  if (v < 0.5) return { k: 1, u: 2 * v, v: 2 - 2 * u, J: [[0, 2], [-2, 0]] };
  if (u >= 0.5) return { k: 2, u: 2 - 2 * u, v: 2 - 2 * v, J: [[-2, 0], [0, -2]] };
  return { k: 3, u: 2 - 2 * v, v: 2 * u, J: [[0, -2], [2, 0]] };
}

const multiplicar2 = (A, B) => [[A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]], [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]];

/**
 * superficieLimite(gaiola) -> { avaliar(face, u, v, { canto }) }
 * gaiola: { vertices, faces, vincos, cantos, borda }, no formato de `subdividirCatmullClark`. `avaliar` devolve { ponto, du, dv, duu, duv,
 * dvv, normal, k1, k2, K, H, d1, d2, fundamentais, profundidade, extraordinario }: as derivadas no parâmetro da face (u de c0 a c1, v de
 * c0 a c3), a normal unitária, as curvaturas principais (sinal descrito acima) com as direções, e quantos refinos locais a avaliação pediu.
 * Na face de n lados, `canto` (0 a n - 1) escolhe o quadrilátero do canto e (u, v) é o parâmetro nele.
 */
export function superficieLimite(gaiola) {
  const { nitidez, C, facesDoV } = prepararLimite(gaiola);
  const borda = gaiola.borda ?? 'suave'; const P = gaiola.vertices; const F = gaiola.faces;
  const avaliarLocal = (face, u, v, canto) => {
    let malha = anelDaFace(P, F, nitidez, C, face, facesDoV);
    let origem = malha.origem; let J = [[1, 0], [0, 1]];
    let uu = u, vv = v; let n = F[face].length;
    for (let profundidade = 0; ; profundidade++) {
      const grade = n === 4 ? gradeDoRetalho(malha, borda) : null;
      if (grade) return { grade, uu, vv, J, origem, profundidade, malha: null };
      if (profundidade >= fundoUtilDaMalha(malha)) return { grade: null, uu, vv, J, origem, profundidade, malha };
      const r = refinar(malha.V, malha.F, malha.nitidez, malha.cantos, borda);
      let k;
      if (n === 4) { const q = filhaDoQuadrante(uu, vv); k = q.k; uu = q.u; vv = q.v; J = multiplicar2(q.J, J); } else k = canto;
      const proxima = anelDaFace(r.V, r.F, r.nitidez, malha.cantos, k, facesPorVertice(r.V.length, r.F));
      origem = [origem[0] + proxima.origem[0], origem[1] + proxima.origem[1], origem[2] + proxima.origem[2]];
      malha = proxima; n = 4;
    }
  };
  /* as derivadas da filha levadas ao parâmetro da face: d/du = J00 d/du' + J10 d/dv', e a segunda por J^T H J */
  const levar = (d, J) => {
    const comb = (a, x, b, y) => [a * x[0] + b * y[0], a * x[1] + b * y[1], a * x[2] + b * y[2]];
    const du = comb(J[0][0], d.Su, J[1][0], d.Sv); const dv = comb(J[0][1], d.Su, J[1][1], d.Sv);
    const seg = (p, q) => {
      const r = [0, 0, 0];
      const H = [[d.Suu, d.Suv], [d.Suv, d.Svv]];
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { const w = J[a][p] * J[b][q]; for (let x = 0; x < 3; x++) r[x] += w * H[a][b][x]; }
      return r;
    };
    return { du, dv, duu: seg(0, 0), duv: seg(0, 1), dvv: seg(1, 1) };
  };
  const avaliar = (face, u, v, { canto = 0, daNormal = false } = {}) => {
    if (!Number.isInteger(face) || face < 0 || face >= F.length) throw new TypeError(`superfície limite: a face ${face} não existe na gaiola`);
    if (typeof u !== 'number' || typeof v !== 'number' || !(u >= 0 && u <= 1 && v >= 0 && v <= 1)) throw new TypeError(`superfície limite: (u, v) precisa estar em [0, 1], e veio (${u}, ${v})`);
    if (F[face].length !== 4 && !(Number.isInteger(canto) && canto >= 0 && canto < F[face].length)) throw new TypeError(`superfície limite: a face ${face} tem ${F[face].length} lados, e o canto precisa ser inteiro de 0 a ${F[face].length - 1}`);
    const r = avaliarLocal(face, u, v, canto);
    if (r.grade) {
      const d = avaliarGrade(r.grade, r.uu, r.vv);
      const g = geometriaDoPonto(d);
      const ponto = [r.origem[0] + d.S[0], r.origem[1] + d.S[1], r.origem[2] + d.S[2]];
      return { ponto, ...levar(d, r.J), ...g, profundidade: r.profundidade, extraordinario: false };
    }
    /* o canto irregular da face filha: a posição pela fórmula fechada, a normal a DELTA_NO_EXTRAORDINARIO dele, sem curvatura */
    const m = r.malha;
    const L = limiteDaEstrela(estrelaDe(m.V, m.F, facesPorVertice(m.V.length, m.F)[0], m.nitidez, 0), m.cantos.has(0), borda);
    const ponto = [r.origem[0] + L[0], r.origem[1] + L[1], r.origem[2] + L[2]];
    if (daNormal) return { ponto, normal: null, k1: null, k2: null, extraordinario: true, profundidade: r.profundidade };
    const delta = Math.min(0.25, Math.max(DELTA_NO_EXTRAORDINARIO, 2 ** -(r.profundidade - 2)));
    const passo = (x) => x + (x < 1 ? 1 : -1) * delta;
    const { normal } = avaliar(face, passo(u), passo(v), { canto, daNormal: true });
    return { ponto, du: null, dv: null, duu: null, duv: null, dvv: null, normal, k1: null, k2: null, K: null, H: null, d1: null, d2: null, fundamentais: null, profundidade: r.profundidade, extraordinario: true };
  };
  return { avaliar };
}

/** descendenciaDasLinhas(faces, nVertices, niveis, cadeias) -> as cadeias levadas ao nível `niveis` do refino
 *  Cada cadeia é uma lista de índices de vértice da gaiola em que cada par seguido é aresta dela; a saída é a lista dos vértices da malha
 *  refinada ao longo das arestas que descendem dela, na mesma ordem (o vértice da gaiola mantém o índice e o ponto de aresta entra entre as
 *  duas pontas, nível a nível, com a numeração de `subdividirCatmullClark`). Só a topologia: as posições não entram. */
export function descendenciaDasLinhas(faces, nVertices, niveis, cadeias) {
  let F = faces.map((f) => [...f]); let nV = nVertices; let C = cadeias.map((c) => [...c]);
  for (let n = 0; n < niveis; n++) {
    const { arestas, indice } = arestasDa(F);
    C = C.map((c, j) => c.flatMap((v, k) => {
      if (k === 0) return [v];
      const e = indice.get(chave(c[k - 1], v));
      if (e === undefined) throw new TypeError(`subdivisão: a linha ${j} liga ${c[k - 1]} a ${v}, que não formam aresta da gaiola`);
      return [nV + e, v];
    }));
    const Fn = [];
    F.forEach((f, fi) => {
      for (let k = 0; k < f.length; k++) {
        const v = f[k], prox = f[(k + 1) % f.length], ant = f[(k - 1 + f.length) % f.length];
        Fn.push([v, nV + indice.get(chave(v, prox)), nV + arestas.length + fi, nV + indice.get(chave(ant, v))]);
      }
    });
    nV += arestas.length + F.length; F = Fn;
  }
  return C;
}

/* o ponto (u, v) da face que entra pelo lado s à fração t do lado (de c_s a c_s+1) e anda w para dentro, até o lado oposto em w = 1 */
const PARAMETRO_DO_LADO = [(t, w) => [t, w], (t, w) => [1 - w, t], (t, w) => [1 - t, 1 - w], (t, w) => [w, 1 - t]];
const ao_longo = (am, s) => (s % 2 === 0 ? am.du : am.dv);

/**
 * medirLinhasNoLimite(gaiola, linhas, { faixa, amostras, passosPorFace, epsilon }) -> uma medida por linha
 * A continuidade da superfície limite de `gaiola` (já no nível em que as linhas foram levadas, com faces de quatro lados ao longo delas)
 * ao longo de cada linha { nome, vertices, faixa?, ...outros campos, que voltam na saída }, pelo oráculo `superficieLimite`; a `faixa` da
 * linha vence a das opções, e sem as duas ela é oito arestas da linha (duas da gaiola no nível 2). Em cada aresta da linha,
 * em `amostras` frações dela, a curvatura normal na direção que atravessa a linha (no plano tangente, perpendicular a ela) é avaliada nas
 * duas faces que a aresta separa, e a diferença é o SALTO de curvatura, exato: zero onde a superfície é C2, que é toda a linha fora dos
 * vértices extraordinários e dos vincos. Da linha para dentro de cada lado, ao longo da fileira de faces que a atravessa, até `faixa`
 * (na unidade da gaiola), a mesma curvatura transversal é amostrada `passosPorFace` vezes por face, e a maior variação dela por
 * comprimento é a INCLINAÇÃO da rampa (1/unidade²): a G2 da subdivisão sem salto, com a curvatura que muda de um lado ao outro numa
 * largura de poucas faces. No vértice extraordinário da linha (interior, de valência diferente de 4), o salto é o da curvatura transversal
 * entre a aresta que chega e a que sai, a `epsilon` do comprimento da aresta dele. A linha de borda (um lado só) mede só o lado que tem.
 * Perto de um ponto singular da superfície limite (o extraordinário, o canto declarado, o vértice de borda de valência diferente de 3, onde
 * a curvatura diverge) a inclinação cresce sem limite; `inclinacaoForaDosSingulares` é a maior a mais de `raioDoSingular` (padrão metade
 * da faixa) de todos eles e dos pontos de `evitar` (os do vinco de nitidez finita, que o refino apaga da gaiola mas deixa um filete de raio
 * pequeno na superfície), e `singularesPerto` conta os que ficam a menos da faixa e do raio da linha.
 * A BORDA LIVRE é região própria. A regra de borda da subdivisão zera a curvatura que atravessa a borda livre, e a curvatura sobe de zero
 * ao valor da superfície numa faixa junto dela; a curva que termina na borda herda essa subida na ponta, e o máximo da inclinação sai ali,
 * a 1 mm da borda, e mede a borda, e não a emenda (na `emenda-g1`, 92,65 em z = 0,9 mm contra 42,4 a 30 mm da borda). Por isso
 * `inclinacaoForaDosSingulares` só conta o que fica a mais de `afastamentoDaBorda` de toda aresta de borda livre, e `inclinacaoNaBorda` dá o
 * máximo da faixa da borda, longe dos singulares, à parte, com `ondeInclinacaoNaBorda`. O padrão do afastamento é o dobro da `faixa` da
 * linha (quatro arestas da gaiola de origem, 114 mm nas emendas de prova): o máximo da `emenda-g1` a 30, 57, 80, 100, 120, 150 e 180 mm é
 * 42,4, 29,3, 26,7, 26,0, 25,6, 25,3 e 25,2, e o da `emenda-g2`, 11,9, 7,4, 6,7, 6,62, 6,61, 6,61 e 6,61; a duas arestas ele ainda cai
 * 10% no passo seguinte, e a quatro está no patamar (a G2) ou a 3% do valor de 180 mm (a G1).
 * A linha com uma face que não é de quatro lados em um dos lados recusa (a medida usa o parâmetro de quadrilátero); o perfil que a
 * fileira de faces para ao encontrar uma face que não é de quatro lados sai contado em `perfisCortados`.
 * Devolve { nome, ..., arestas, saltoMaximo, anguloMaximoGraus, inclinacaoMaxima, ondeInclinacao, inclinacaoForaDosSingulares,
 * curvaturaNaLinha, curvaturaNaFaixa, extraordinarios: [{ vertice, valencia, ponto, salto }] } com as curvaturas na unidade inversa da gaiola.
 */
export function medirLinhasNoLimite(gaiola, linhas, { faixa = null, amostras = 4, passosPorFace = 4, epsilon = 1e-4, raioDoSingular = null, evitar = [], afastamentoDaBorda = null } = {}) {
  const sup = superficieLimite(gaiola);
  const F = gaiola.faces; const P = gaiola.vertices;
  const dirigida = new Map();
  F.forEach((f, fi) => { for (let k = 0; k < f.length; k++) dirigida.set(`${f[k]}>${f[(k + 1) % f.length]}`, { face: fi, lado: k }); });
  const { arestas } = arestasDa(F);
  const valencia = new Array(P.length).fill(0); const naBorda = new Set();
  for (const e of arestas) { valencia[e.a]++; valencia[e.b]++; if (e.faces.length !== 2) { naBorda.add(e.a); naBorda.add(e.b); } }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  /* os pontos singulares da superfície limite: o vértice extraordinário de dentro, o de borda que não tem valência 3 (o canto da chapa) e o
     canto declarado, onde a curvatura diverge ou depende da direção */
  const cantosDeclarados = new Set(gaiola.cantos ?? []);
  const singulares = [];
  for (let x = 0; x < P.length; x++) {
    if (!valencia[x]) continue;
    if (cantosDeclarados.has(x) || (naBorda.has(x) ? valencia[x] !== 3 : valencia[x] !== 4)) singulares.push(P[x]);
  }
  for (const p of evitar) singulares.push(p);
  /* as arestas de borda livre, para a distância à borda */
  const segmentosDaBorda = arestas.filter((e) => e.faces.length === 1).map((e) => [P[e.a], P[e.b]]);
  const distanciaAoSegmento = (p, [a, b]) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const l2 = pontoV(ab, ab); const t = l2 > 0 ? Math.max(0, Math.min(1, pontoV(ap, ab) / l2)) : 0;
    return Math.hypot(ap[0] - t * ab[0], ap[1] - t * ab[1], ap[2] - t * ab[2]);
  };
  const mediana = (xs) => { const s = xs.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : null; };
  /* a curvatura transversal da amostra que entrou pelo lado s */
  const transversal = (am, s) => {
    if (!am.normal || !am.fundamentais) return null;
    const d = unitario(vetorial(am.normal, ao_longo(am, s)));
    return d ? curvaturaNormal(am, d) : null;
  };
  let perfisCortados = 0;
  const caminhar = (face, s, t, largura) => {
    const saida = [];
    let f = face, lado = s, anterior = null, andado = 0;
    for (let volta = 0; volta < 4096 && andado < largura; volta++) {
      if (F[f].length !== 4) { perfisCortados++; break; }
      for (let p = volta === 0 ? 0 : 1; p <= passosPorFace; p++) {
        const am = sup.avaliar(f, ...PARAMETRO_DO_LADO[lado](t, p / passosPorFace));
        if (anterior) andado += dist(anterior, am.ponto);
        anterior = am.ponto;
        saida.push({ s: andado, k: transversal(am, lado), ponto: am.ponto });
        if (andado >= largura) break;
      }
      const e = (lado + 2) % 4; const a = F[f][e], b = F[f][(e + 1) % 4];
      const prox = dirigida.get(`${b}>${a}`);
      if (!prox) break;
      f = prox.face; lado = prox.lado;
    }
    return saida;
  };
  return linhas.map((linha) => {
    const { vertices, faixa: faixaDaLinha = null, ...resto } = linha;
    const cortadosAntes = perfisCortados;
    let comprimento = 0;
    for (let k = 1; k < vertices.length; k++) comprimento += dist(P[vertices[k - 1]], P[vertices[k]]);
    const largura = faixaDaLinha ?? faixa ?? (8 * comprimento) / Math.max(1, vertices.length - 1);
    let saltoMaximo = 0, anguloMaximo = 0, inclinacaoMaxima = 0, ondeInclinacao = null, ondeSalto = null, medidas = 0;
    let inclinacaoRegular = 0, ondeRegular = null, inclinacaoBorda = 0, ondeBorda = null;
    const raio = raioDoSingular ?? largura / 2;
    const afastamento = afastamentoDaBorda ?? 2 * largura;
    const perto = singulares.filter((q) => vertices.some((v) => dist(P[v], q) < largura + raio));
    const longeDoSingular = (p) => perto.every((q) => dist(p, q) >= raio);
    const bordaPerto = segmentosDaBorda.filter((sg) => vertices.some((v) => distanciaAoSegmento(P[v], sg) < largura + afastamento));
    const longeDaBorda = (p) => bordaPerto.every((sg) => distanciaAoSegmento(p, sg) >= afastamento);
    const faceDe = (x, y) => { const d = dirigida.get(`${x}>${y}`); if (d && F[d.face].length !== 4) throw new TypeError(`medirLinhasNoLimite: a linha ${linha.nome ?? ''} passa pela face ${d.face}, de ${F[d.face].length} lados, e a medida pede faces de quatro lados (refine a gaiola)`); };
    for (let k = 1; k < vertices.length; k++) {
      if (!dirigida.has(`${vertices[k - 1]}>${vertices[k]}`) && !dirigida.has(`${vertices[k]}>${vertices[k - 1]}`)) throw new TypeError(`medirLinhasNoLimite: a linha ${linha.nome ?? ''} liga ${vertices[k - 1]} a ${vertices[k]}, que não formam aresta da gaiola`);
      faceDe(vertices[k - 1], vertices[k]); faceDe(vertices[k], vertices[k - 1]);
    }
    const naLinha = [], longeA = [], longeB = [];
    for (let k = 1; k < vertices.length; k++) {
      const p = vertices[k - 1], q = vertices[k];
      const A = dirigida.get(`${p}>${q}`), B = dirigida.get(`${q}>${p}`);
      for (let j = 0; j < amostras; j++) {
        const t = (j + 0.5) / amostras;
        const lados = [];
        if (A) lados.push({ ...A, t, am: sup.avaliar(A.face, ...PARAMETRO_DO_LADO[A.lado](t, 0)) });
        if (B) lados.push({ ...B, t: 1 - t, am: sup.avaliar(B.face, ...PARAMETRO_DO_LADO[B.lado](1 - t, 0)) });
        if (!lados.length) continue;
        const ref = lados[0];
        const d = ref.am.normal && unitario(vetorial(ref.am.normal, ao_longo(ref.am, ref.lado)));
        const ks = lados.map((l) => (d && l.am.fundamentais ? curvaturaNormal(l.am, d) : null));
        naLinha.push(ks[0]);
        if (lados.length === 2 && ks[0] !== null && ks[1] !== null) {
          medidas++;
          const salto = Math.abs(ks[0] - ks[1]);
          if (salto > saltoMaximo) { saltoMaximo = salto; ondeSalto = ref.am.ponto; }
          const c = Math.max(-1, Math.min(1, pontoV(lados[0].am.normal, lados[1].am.normal)));
          anguloMaximo = Math.max(anguloMaximo, (Math.acos(c) * 180) / Math.PI);
        }
        lados.forEach((l, i) => {
          const perfil = caminhar(l.face, l.lado, l.t, largura);
          for (let m = 1; m < perfil.length; m++) {
            const a = perfil[m - 1], b = perfil[m];
            if (a.k === null || b.k === null || !(b.s > a.s)) continue;
            const inc = Math.abs(b.k - a.k) / (b.s - a.s);
            const onde = { ponto: b.ponto, distancia: (a.s + b.s) / 2, lado: (A && i === 0) ? 'esquerda' : 'direita' };
            if (inc > inclinacaoMaxima) { inclinacaoMaxima = inc; ondeInclinacao = onde; }
            if (longeDoSingular(a.ponto) && longeDoSingular(b.ponto)) {
              if (longeDaBorda(a.ponto) && longeDaBorda(b.ponto)) { if (inc > inclinacaoRegular) { inclinacaoRegular = inc; ondeRegular = onde; } }
              else if (inc > inclinacaoBorda) { inclinacaoBorda = inc; ondeBorda = onde; }
            }
          }
          const fim = perfil.at(-1);
          if (fim) ((A && i === 0) ? longeA : longeB).push(fim.k);
        });
      }
    }
    /* os vértices extraordinários de dentro da linha: a curvatura transversal a epsilon dele, na aresta que chega e na que sai */
    const extraordinarios = [];
    for (let k = 1; k + 1 < vertices.length; k++) {
      const x = vertices[k];
      if (valencia[x] === 4 || naBorda.has(x)) continue;
      const antes = dirigida.get(`${vertices[k - 1]}>${x}`) ?? null; const depois = dirigida.get(`${x}>${vertices[k + 1]}`) ?? null;
      if (!antes || !depois) continue;
      const a = sup.avaliar(antes.face, ...PARAMETRO_DO_LADO[antes.lado](1 - epsilon, 0));
      const b = sup.avaliar(depois.face, ...PARAMETRO_DO_LADO[depois.lado](epsilon, 0));
      const ka = transversal(a, antes.lado), kb = transversal(b, depois.lado);
      extraordinarios.push({ vertice: x, valencia: valencia[x], ponto: P[x], curvaturas: [ka, kb], salto: ka !== null && kb !== null ? Math.abs(ka - kb) : null });
    }
    return {
      ...resto, arestas: vertices.length - 1, comprimento, faixa: largura, medidas, saltoMaximo, ondeSalto, anguloMaximoGraus: anguloMaximo, inclinacaoMaxima, ondeInclinacao,
      inclinacaoForaDosSingulares: inclinacaoRegular, ondeInclinacaoForaDosSingulares: ondeRegular, singularesPerto: perto.length,
      inclinacaoNaBorda: inclinacaoBorda, ondeInclinacaoNaBorda: ondeBorda, afastamentoDaBorda: afastamento, perfisCortados: perfisCortados - cortadosAntes,
      curvaturaNaLinha: mediana(naLinha), curvaturaNaFaixa: [mediana(longeA), mediana(longeB)], extraordinarios,
    };
  });
}
