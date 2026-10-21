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
 * O vinco do Blender (0 a 1) vira nitidez por `nitidezDoVinco(c) = 10 c²`.
 *
 * A ordem da saída é determinística: primeiro os pontos de vértice (na ordem da gaiola), depois os de aresta (na
 * ordem em que as arestas aparecem varrendo as faces) e por fim os de face; cada face de k lados vira k quads
 * [vértice, aresta seguinte, face, aresta anterior], com a orientação da face de origem.
 */

export const NITIDEZ_INFINITA = Infinity;

export function nitidezDoVinco(c) {
  const v = Math.max(0, Math.min(1, Number(c)));
  return v >= 1 ? 10 : 10 * v * v;
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
 * vincos: lista de [a, b, nitidez] (nitidez em níveis; use NITIDEZ_INFINITA ou >= niveis para vinco vivo).
 * cantos: índices de vértice que ficam fixos (canto vivo).
 */
export function subdividirCatmullClark({ vertices, faces, vincos = [], niveis = 1, cantos = [], borda = 'suave' }) {
  validar(vertices, faces, vincos, niveis);
  if (borda !== 'suave' && borda !== 'cantos') throw new TypeError("subdivisão: borda precisa ser 'suave' ou 'cantos'");
  const { indice } = arestasDa(faces);
  let nitidez = new Map();
  for (const [k, v] of vincos.entries()) {
    if (!Array.isArray(v) || v.length !== 3) throw new TypeError(`subdivisão: vinco ${k} precisa ser [a, b, nitidez]`);
    const [a, b, x] = v;
    if (!indice.has(chave(a, b))) throw new TypeError(`subdivisão: vinco ${k} cita a aresta ${a}-${b}, que não existe na gaiola`);
    if (!(x >= 0)) throw new TypeError(`subdivisão: vinco ${k} com nitidez inválida`);
    nitidez.set(chave(a, b), x);
  }
  let V = vertices.map((p) => [...p]); let F = faces.map((f) => [...f]);
  let C = new Set(cantos);
  for (let n = 0; n < niveis; n++) {
    const r = refinar(V, F, nitidez, C, borda);
    V = r.V; F = r.F; nitidez = r.nitidez; // os pontos de vértice mantêm o índice, então os cantos continuam válidos
  }
  return { vertices: V, faces: F };
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
  return { vertices: V, faces: F, vincos: vin, cantos: can };
}
