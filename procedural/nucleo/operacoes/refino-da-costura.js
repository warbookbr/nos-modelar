/* refino-da-costura.js — o refino da faixa que o cordão de solda toca (plano do cordão de solda na costura de tubos, fatia 7).

   A união que funde o cordão aos sólidos corta as faces dos tubos pelo pé do cordão, e a face de um tubo que vem de um anel ao
   outro (dezenas de milímetros de comprimento por uns poucos de largura) sai da união como um polígono longo com a curva do
   pé de um lado: a triangulação dele é um leque de triângulos finos e longos, e o sombreado liso risca o tubo ao longo deles.
   Antes isto era contornado pela receita, que punha anéis a cada 4 mm nas pontas do tubo; aqui o refino é da ferramenta.

   O CÁLCULO. A faixa é a das faces que têm um canto no pé do cordão (as arestas da costura com uma face do cordão de um lado),
   cada uma inteira, até o anel seguinte; a costura de outro sólido da mesma união não conta. Antes de tudo, os pedaços do mesmo
   plano que vêm da mesma face de origem se juntam num polígono (o contorno deles). Cada aresta de dobra de uma face da faixa cuja
   outra face também é da faixa ganha pontos: a `passo` de distância no trecho a menos de `faixa` do pé e, dali até as pontas, com
   o passo crescendo 1,5 vez a cada ponto; a mesma lista de pontos entra nas duas faces, e nenhuma face fora da faixa ganha ponto.
   Cada polígono da faixa é então triangulado pela triangulação que deixa menor a pior razão de aspecto (o maior lado ao quadrado
   sobre o dobro da área), e os triângulos herdam a cor, o material, a parte, o liso e as quebras de sombra da face.

   A RECUSA. O triângulo novo de lado acima de `LIMITE_DO_LADO` passos não pode sair mais que FOLGA_DA_RECUSA vezes pior que o
   pedaço de que saiu (a pior razão da melhor triangulação do pedaço, ou RAZAO_ACEITA, a que for maior). O polígono recusado deixa
   inteira a aresta dividida sem a qual ele passa, ou todas, e os vizinhos dela são refeitos, até nada mais mudar; o polígono do
   pé que não se triangula fica como a união o deixou. A conta de faces novas tem teto (TETO_POR_PONTO_DO_PE por ponto do pé), e
   a malha tem de fechar; se não, nada se escreve e a união avisa.

   O PASSO vem da largura do cordão (`passoDoRefino`), e o friso o declara no registro da origem dele; a união que recebe o cordão como
   operando é que aplica o refino. Determinístico: a ordem das arestas e das faces é a dos ids. */

import { fundir } from '../pedacos-convexos.js';

const LIMITE_DO_LADO = 1.5;
const MAXIMO_DE_CANTOS = 400;
const FOLGA = 1e-9;
const CRESCIMENTO = 1.5;
/* a aresta de diedro abaixo de um grau fica inteira: dentro de uma faceta é o pedaço do mesmo plano (ou quase, numa faceta
   torta), e numa superfície fina o triângulo longo que sobra mal dobra */
const PISO_DO_DIEDRO = Math.PI / 180;
/* o diedro acima deste é dobra de verdade (a quina, o pé do cordão), e não o facetado de uma superfície lisa */
const LIMITE_DO_DIEDRO = (30 * Math.PI) / 180;

/** o passo do refino pela largura do cordão: 0,4 da largura (2,8 mm num cordão de 7 mm), medido contra os anéis de 4 mm que a receita da bicicleta punha */
export const passoDoRefino = (largura) => 0.4 * largura;
/** o trecho de passo constante em volta do pé, medido do pé à aresta: uma largura do cordão (com duas, a bicicleta ganha 5 mil faces
    e a régua do pé não melhora); dali ao anel seguinte o passo cresce */
export const faixaDoRefino = (largura) => largura;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const tam = (a) => Math.hypot(a[0], a[1], a[2]);
const cruz3 = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const chave = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function normalDe(P) {
  const n = [0, 0, 0];
  for (let k = 0; k < P.length; k++) {
    const a = P[k], b = P[(k + 1) % P.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

/* A melhor triangulação do polígono (lista de pontos 3D e plano pela normal), por programação dinâmica: o mínimo da pior razão de
   aspecto e, no empate, da soma. `proibida(i, k)` recusa a diagonal entre dois cantos (a que já é aresta de outra face da malha),
   e o triângulo com o dobro da área até `areaMinima` (m²) não entra.
   Devolve a lista de triângulos [i, j, k] (índices crescentes, o sentido do polígono) ou null. */
function triangular(P3, normal, proibida = () => false, areaMinima = 0) {
  const n = P3.length;
  if (n < 3 || n > MAXIMO_DE_CANTOS) return null;
  const ax = Math.abs(normal[0]) >= Math.abs(normal[1]) && Math.abs(normal[0]) >= Math.abs(normal[2]) ? 0 : Math.abs(normal[1]) >= Math.abs(normal[2]) ? 1 : 2;
  const u = (ax + 1) % 3, w = (ax + 2) % 3;
  const P = P3.map((p) => [p[u], p[w]]);
  let area2 = 0;
  for (let k = 0; k < n; k++) { const a = P[k], b = P[(k + 1) % n]; area2 += a[0] * b[1] - b[0] * a[1]; }
  if (!(Math.abs(area2) > 0)) return null;
  const sinal = Math.sign(area2);
  let escala = 0;
  for (const p of P) for (const q of P) escala = Math.max(escala, Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]));
  const eps = escala * escala * FOLGA;
  const cruz = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const cruzam = (a, b, c, d) => {
    const d1 = cruz(a, b, c), d2 = cruz(a, b, d), d3 = cruz(c, d, a), d4 = cruz(c, d, b);
    return ((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps));
  };
  const dentro = (c) => {
    let d = false;
    for (let k = 0, m = n - 1; k < n; m = k++) if ((P[k][1] > c[1]) !== (P[m][1] > c[1]) && c[0] < ((P[m][0] - P[k][0]) * (c[1] - P[k][1])) / (P[m][1] - P[k][1]) + P[k][0]) d = !d;
    return d;
  };
  /* diagonal (i, k) válida: dentro do polígono, sem cruzar aresta e sem passar por outro canto */
  const diag = new Map();
  const valida = (i, k) => {
    if (k === i + 1 || (i === 0 && k === n - 1)) return true;
    const c = `${i},${k}`;
    if (diag.has(c)) return diag.get(c);
    let ok = !proibida(i, k);
    const a = P[i], b = P[k];
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    for (let m = 0; m < n && ok; m++) {
      if (m === i || m === k) continue;
      const t = ((P[m][0] - a[0]) * dx + (P[m][1] - a[1]) * dy) / l2;
      if (t > 0 && t < 1 && Math.abs(cruz(a, b, P[m])) <= Math.sqrt(l2) * Math.sqrt(eps)) ok = false;
    }
    for (let m = 0; m < n && ok; m++) {
      const m2 = (m + 1) % n;
      if (m === i || m === k || m2 === i || m2 === k) continue;
      if (cruzam(a, b, P[m], P[m2])) ok = false;
    }
    if (ok && !dentro([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])) ok = false;
    diag.set(c, ok);
    return ok;
  };
  const razao = (i, j, k) => {
    const a = P3[i], b = P3[j], c = P3[k];
    const ab = tam(sub(b, a)), bc = tam(sub(c, b)), ca = tam(sub(a, c));
    const A = Math.sign(cruz(P[i], P[j], P[k])) === sinal ? Math.abs(cruz(P[i], P[j], P[k])) : 0;
    if (!(A > eps)) return Infinity;
    if (tam(cruz3(sub(b, a), sub(c, a))) <= areaMinima) return Infinity;
    const maior = Math.max(ab, bc, ca);
    return (maior * maior) / (A * (tam(normal) / Math.abs(area2)));
  };
  /* melhor[i][k]: o melhor para o sub-polígono de i a k */
  const pior = Array.from({ length: n }, () => new Float64Array(n));
  const soma = Array.from({ length: n }, () => new Float64Array(n));
  const corte = Array.from({ length: n }, () => new Int32Array(n).fill(-1));
  for (let len = 2; len < n; len++) {
    for (let i = 0; i + len < n; i++) {
      const k = i + len;
      pior[i][k] = Infinity; soma[i][k] = Infinity;
      if (!valida(i, k)) continue;
      for (let j = i + 1; j < k; j++) {
        const p1 = pior[i][j], p2 = pior[j][k];
        if (!Number.isFinite(p1) && j - i > 1) continue;
        if (!Number.isFinite(p2) && k - j > 1) continue;
        const r = razao(i, j, k);
        if (!Number.isFinite(r)) continue;
        const pj = Math.max(r, j - i > 1 ? p1 : 0, k - j > 1 ? p2 : 0);
        const sj = r + (j - i > 1 ? soma[i][j] : 0) + (k - j > 1 ? soma[j][k] : 0);
        const melhor = pj < pior[i][k] - 1e-12 || (Math.abs(pj - pior[i][k]) <= 1e-12 && sj < soma[i][k]);
        if (melhor) { pior[i][k] = pj; soma[i][k] = sj; corte[i][k] = j; }
      }
    }
  }
  /* o polígono inteiro: a aresta (0, n-1) fecha o polígono, e o corte dela é o triângulo que a contém */
  if (corte[0][n - 1] < 0) return null;
  const tris = [];
  const desce = (i, k) => {
    if (k - i < 2) return;
    const j = corte[i][k];
    tris.push([i, j, k]);
    desce(i, j); desce(j, k);
  };
  desce(0, n - 1);
  return tris;
}

/* a razão (maior lado ao quadrado sobre o dobro da área) até a qual o triângulo novo passa mesmo pior que o pedaço de que saiu: a
   da régua do cordão (fatia 3), que conta como longo o triângulo de razão acima de 8 */
const RAZAO_ACEITA = 8;
/* a folga da recusa: os pontos das duas arestas de uma tira fina caem em frações diferentes do comprimento, e a tira refeita sai
   até duas vezes mais fina que a inteira; com folga 1, as tiras finas que a união deixa recusavam o refino e devolviam as arestas
   delas, e a bicicleta ficava com 868 triângulos de mais de 40 mm no pé (a base com anéis tinha 128; com 2, 51) */
const FOLGA_DA_RECUSA = 2;
/* as rodadas da conferência: o polígono recusado devolve as arestas divididas dele, e os vizinhos são refeitos */
const RODADAS = 12;
/* o teto de faces novas por ponto do pé (a bicicleta fica perto de 3) */
const TETO_POR_PONTO_DO_PE = 8;

/* a pior razão da triangulação dos triângulos (listas de 3 pontos) */
function piorRazao(tris, curto = 0) {
  let pior = 0;
  for (const [a, b, c] of tris) {
    const ab = tam(sub(b, a)), bc = tam(sub(c, b)), ca = tam(sub(a, c));
    const A = tam(cruz3(sub(b, a), sub(c, a)));
    const maior = Math.max(ab, bc, ca);
    if (maior <= curto) continue;
    pior = Math.max(pior, A > 0 ? (maior * maior) / A : Infinity);
  }
  return pior;
}

/**
 * refinarFaixaDaCostura(st, { faces, costura, arestasDaCostura, arestasDoPe, cordoes, passo, faixa, idV, idF, donos }) -> { novas, tocadas } ou null
 *  `faces` (lista) e `costura` (as faces que tocam a costura) são do registro da união; `arestasDaCostura` é o conjunto de chaves
 *  "a-b" (a < b) das arestas da costura, que nunca se dividem, e `arestasDoPe` o das que ficam entre o cordão e um sólido (o pé do
 *  cordão, de onde a faixa se mede); `cordoes` é o conjunto dos índices de operando que são cordão (`donos` diz o de cada face), e
 *  a face do cordão não é refeita. `idV(k)` e `idF(k)` dão o k-ésimo id novo de vértice e de face do passo. Escreve em `st`, põe em
 *  `faces` e em `costura` os triângulos novos e em `donos` o dono deles, e devolve a contagem. Se algo não confere (a malha
 *  deixaria de fechar, o passo acabaria os ids) não escreve nada e devolve null.
 */
export function refinarFaixaDaCostura(st, { faces, costura, arestasDaCostura, arestasDoPe = arestasDaCostura, cordoes = null, passo, faixa, idV, idF, primeiroV, primeiroF, limiteDeIds, donos }) {
  const limite = LIMITE_DO_LADO * passo;
  const posDe = (v) => st.V.get(v);
  /* os pontos do pé do cordão, numa grade de células do tamanho da faixa, para achar a distância de uma aresta ao pé */
  const doPe = new Set();
  for (const c of arestasDoPe) for (const v of c.split('-')) doPe.add(Number(v));
  const grade = new Map();
  const celula = (p) => p.map((x) => Math.floor(x / faixa));
  for (const v of [...doPe].sort((x, y) => x - y)) {
    const p = posDe(v);
    if (!p) continue;
    const k = celula(p).join(',');
    if (!grade.has(k)) grade.set(k, []);
    grade.get(k).push(p);
  }
  const pertoDe = (p) => {
    const c = celula(p);
    for (let x = c[0] - 1; x <= c[0] + 1; x++) for (let y = c[1] - 1; y <= c[1] + 1; y++) for (let z = c[2] - 1; z <= c[2] + 1; z++) {
      for (const q of grade.get(`${x},${y},${z}`) ?? []) if (Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < faixa) return true;
    }
    return false;
  };
  /* o trecho [t0, t1] da aresta a-b (fração do comprimento) que fica na faixa, ou null: amostrado a um quarto do passo, e alargado de uma amostra */
  const trechoNaFaixa = (a, b, l) => {
    const m = Math.max(1, Math.ceil(l / (passo / 4)));
    let t0 = null, t1 = null;
    for (let k = 0; k <= m; k++) {
      const t = k / m;
      if (pertoDe([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t])) { if (t0 === null) t0 = t; t1 = t; }
    }
    return t0 === null ? null : [Math.max(0, t0 - 1 / m), Math.min(1, t1 + 1 / m)];
  };
  /* os pontos da aresta, em fração do comprimento: a passo no trecho da faixa e, daí até cada ponta, com o passo crescendo de 1,5 em 1,5
     vez (a malha engrossa aos poucos até o anel seguinte, e o sombreado não vê o degrau); o que sobra menos que o passo seguinte fica sem
     ponto. A aresta é de uma face que o pé toca, e por isso o ponto não passa da faixa (as faces do pé até o anel seguinte). */
  const pontosDaAresta = (t0, t1, l) => {
    const n = Math.max(1, Math.ceil(((t1 - t0) * l) / passo));
    const ts = [];
    for (let j = 0; j <= n; j++) ts.push(t0 + ((t1 - t0) * j) / n);
    for (const sentido of [1, -1]) {
      let pos = sentido > 0 ? t1 : t0, d = passo;
      for (;;) {
        d *= CRESCIMENTO;
        const prox = pos + (sentido * d) / l;
        if (prox >= 1 - d / l / 2 || prox <= d / l / 2) break;
        ts.push(prox); pos = prox;
      }
    }
    return ts.filter((t) => t > 1e-9 && t < 1 - 1e-9).sort((x, y) => x - y);
  };
  const doCordao = (fid) => donos != null && cordoes != null && cordoes.has(donos[fid]);
  /* as faces que o refino pode refazer: as do resultado que não são do cordão */
  const doResultado = [...new Set(faces)].filter((f) => st.F.has(f) && !doCordao(f)).sort((x, y) => x - y);
  const noResultado = new Set(doResultado);
  const normalUnitaria = new Map();
  const normalDaFaceDe = (fid) => {
    if (!normalUnitaria.has(fid)) { const n = normalDe(st.F.get(fid).vs.map(posDe)); const t = tam(n); normalUnitaria.set(fid, t > 0 ? n.map((x) => x / t) : null); }
    return normalUnitaria.get(fid);
  };
  const facesDaAresta = new Map();
  for (const f of st.F.values()) for (let k = 0; k < f.vs.length; k++) {
    const c = chave(f.vs[k], f.vs[(k + 1) % f.vs.length]);
    if (!facesDaAresta.has(c)) facesDaAresta.set(c, []);
    facesDaAresta.get(c).push(f.id);
  }
  /* o cosseno do diedro da aresta (1 no plano), ou null quando ela não tem duas faces (o liso costuma vir depois da união, e
     por isso não entra na conta) */
  const cossenoDoDiedro = (c) => {
    const fs = facesDaAresta.get(c) ?? [];
    if (fs.length !== 2) return null;
    const p = normalDaFaceDe(fs[0]), q = normalDaFaceDe(fs[1]);
    return p && q ? p[0] * q[0] + p[1] * q[1] + p[2] * q[2] : null;
  };
  /* A ARESTA DE DENTRO DE UMA FACETA. A superfície lisa facetada dobra nas arestas da faceta (o diedro do facetado); a aresta que
     a união ou a triangulação abriu dentro da faceta tem diedro quase nulo (pedaços do mesmo plano, abaixo de PISO_DO_DIEDRO) ou
     bem menor que o das arestas da faceta (a diagonal de uma faceta torta). O ponto novo nela não fica na superfície que a
     faceta aproxima: a normal lisa dele é a do plano da faceta, e não a que o sombreado interpola entre as arestas, e a faceta
     aparece como faixa. Ela fica inteira quando o diedro dela é menor que um quarto do maior diedro das outras arestas das duas
     faces dela (as da costura e as de dobra de verdade, acima de LIMITE_DO_DIEDRO, não contam). */
  const memoDentro = new Map();
  const deDentroDaFaceta = (c) => {
    if (memoDentro.has(c)) return memoDentro.get(c);
    const cd = cossenoDoDiedro(c);
    let r = false;
    if (cd !== null) {
      const proprio = Math.acos(Math.min(1, cd));
      if (proprio < PISO_DO_DIEDRO) r = true;
      else {
        let maior = 0;
        for (const fid of facesDaAresta.get(c)) {
          const vs = st.F.get(fid).vs;
          for (let k = 0; k < vs.length; k++) {
            const o = chave(vs[k], vs[(k + 1) % vs.length]);
            if (o === c || arestasDaCostura.has(o)) continue;
            const co = cossenoDoDiedro(o);
            if (co === null) continue;
            const d = Math.acos(Math.max(-1, Math.min(1, co)));
            if (d < LIMITE_DO_DIEDRO && d > maior) maior = d;
          }
        }
        r = proprio < maior / 4;
      }
    }
    memoDentro.set(c, r);
    return r;
  };

  /* OS PEDAÇOS DE UMA FACETA SE JUNTAM. As uniões partem a faceta cortada pelo pé do cordão em pedaços convexos, e cada pedaço
     triangulado sozinho liga o ponto do pé ao canto mais longe do pedaço, num triângulo longo que leva a normal do pé tubo afora: o
     risco claro ao longo do tubo. Os pedaços do mesmo plano que vêm da mesma face de origem (`pedacosDe` seguido em cadeia, por
     cima da união dos tubos e da do cordão), com a mesma aparência, se juntam pelas arestas comuns que não são costura nem quebra
     de sombra num polígono só, o contorno dos pedaços, e a triangulação dele escolhe entre todos os pontos da borda da faceta (os
     do pé e os que o refino põe nas arestas dela). Quando o contorno não é um laço simples, os pedaços se juntam dois a dois pela
     aresta comum (`fundir`). A junção só fica quando o polígono junto é refeito. */
  const raizDoPedaco = (fid) => { let r = fid; for (let g = st.pedacosDe?.get(r); g != null && g !== r; g = st.pedacosDe?.get(r)) r = g; return r; };
  const aparencia = (f) => JSON.stringify([f.parte ?? null, f.material ?? null, f.cor ?? null, f.liso ?? null, f.solido ?? null, raizDoPedaco(f.id)]);
  const ehQuebra = (f, c) => (f.quebras ?? []).some(([x, y]) => chave(x, y) === c);
  const paiDaFace = new Map(doResultado.map((f) => [f, f]));
  const raizDaFace = (x) => { while (paiDaFace.get(x) !== x) { paiDaFace.set(x, paiDaFace.get(paiDaFace.get(x))); x = paiDaFace.get(x); } return x; };
  const juntavel = new Set();
  for (const [c, fs] of [...facesDaAresta.entries()].sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0))) {
    if (fs.length !== 2 || !fs.every((g) => noResultado.has(g)) || arestasDaCostura.has(c)) continue;
    const [f1, f2] = fs.map((g) => st.F.get(g));
    if (f1.tinta?.length || f2.tinta?.length) continue;
    if (aparencia(f1) !== aparencia(f2)) continue;
    if (ehQuebra(f1, c) || ehQuebra(f2, c)) continue;
    if (!deDentroDaFaceta(c)) continue;
    juntavel.add(c);
    const r1 = raizDaFace(f1.id), r2 = raizDaFace(f2.id);
    if (r1 !== r2) paiDaFace.set(Math.max(r1, r2), Math.min(r1, r2));
  }
  const grupos = new Map();
  for (const f of doResultado) { const r = raizDaFace(f); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(f); }
  /* o contorno do grupo: as arestas dirigidas sem a oposta no grupo, num laço só e simples; as arestas internas são todas juntáveis,
     e nenhum canto fica só dentro do grupo */
  const contornoDoGrupo = (membros) => {
    const dirigidas = new Map();
    const usos = new Map();
    for (const g of membros) {
      const vs = st.F.get(g).vs;
      if (new Set(vs).size !== vs.length) return null;
      for (let k = 0; k < vs.length; k++) {
        const a = vs[k], b = vs[(k + 1) % vs.length];
        if (dirigidas.has(`${a}>${b}`)) return null;
        dirigidas.set(`${a}>${b}`, [a, b]);
        usos.set(a, (usos.get(a) ?? 0) + 1);
      }
    }
    const seguinte = new Map();
    for (const [k, [a, b]] of dirigidas) {
      if (dirigidas.has(`${b}>${a}`)) { if (!juntavel.has(chave(a, b))) return null; continue; }
      if (seguinte.has(a)) return null;
      seguinte.set(a, b);
    }
    if (!seguinte.size) return null;
    const inicio = Math.min(...seguinte.keys());
    const laco = [inicio];
    for (let v = seguinte.get(inicio); v !== inicio; v = seguinte.get(v)) { if (v === undefined || laco.length > seguinte.size) return null; laco.push(v); }
    if (laco.length !== seguinte.size) return null;
    const noLaco = new Set(laco);
    for (const v of usos.keys()) if (!noLaco.has(v)) return null;
    return laco;
  };
  /* quantas faces usam cada canto: a junção dois a dois tira uma face de cada ponta da aresta comum, e o canto que ficaria com menos
     de três (um vínculo que não fecha laço) a impede */
  const valencia = new Map();
  for (const f of st.F.values()) for (const v of f.vs) valencia.set(v, (valencia.get(v) ?? 0) + 1);
  const juntas = new Map();   // sobrevivente -> { vs, absorvidas }
  for (const [r, membros] of grupos) {
    if (membros.length < 2) continue;
    const laco = contornoDoGrupo(membros);
    if (laco) { juntas.set(r, { vs: laco, absorvidas: membros.filter((g) => g !== r) }); continue; }
    let P = st.F.get(r).vs.slice();
    const absorvidas = [];
    const resto = membros.filter((g) => g !== r);
    for (let mudou = true; mudou;) {
      mudou = false;
      for (let k = 0; k < resto.length; k++) {
        const R = st.F.get(resto[k]).vs;
        const Q = fundir(P, R);
        if (!Q || new Set(Q).size !== Q.length) continue;
        const comuns = P.filter((v) => R.includes(v));
        if (comuns.some((v) => valencia.get(v) <= 3)) continue;
        for (const v of comuns) valencia.set(v, valencia.get(v) - 1);
        P = Q; absorvidas.push(resto[k]); resto.splice(k, 1); mudou = true; break;
      }
    }
    if (absorvidas.length) juntas.set(r, { vs: P, absorvidas });
  }
  const absorvida = new Set([...juntas.values()].flatMap((j) => j.absorvidas));
  const sobrevivente = new Map();
  for (const [r, j] of juntas) for (const g of j.absorvidas) sobrevivente.set(g, r);
  const poligonoDe = (fid) => juntas.get(fid)?.vs ?? st.F.get(fid).vs;
  const membrosDe = (fid) => [fid, ...(juntas.get(fid)?.absorvidas ?? [])];
  const vivas = doResultado.filter((f) => !absorvida.has(f));
  const tocaACostura = new Set(costura);
  for (const [r, j] of juntas) if (j.absorvidas.some((g) => tocaACostura.has(g))) tocaACostura.add(r);
  /* as faces do pé: as que têm um canto no pé do cordão, até o anel seguinte (a face inteira) */
  const doPeDoCordao = vivas.filter((fid) => poligonoDe(fid).some((v) => doPe.has(v)));
  const ehDoPe = new Set(doPeDoCordao);

  /* as arestas que podem ganhar pontos: de uma face do pé, fora da costura, longas, de dobra (não de dentro de uma faceta), com
     duas faces no resultado fora do cordão; os pontos de cada uma, em fração do comprimento, de a (o menor id) a b */
  const candidatas = new Map();
  for (const fid of doPeDoCordao) {
    const vs = poligonoDe(fid);
    if (new Set(vs).size !== vs.length) continue;
    for (let k = 0; k < vs.length; k++) {
      const a = vs[k], b = vs[(k + 1) % vs.length], c = chave(a, b);
      const fs = facesDaAresta.get(c) ?? [];
      if (candidatas.has(c) || arestasDaCostura.has(c)) continue;
      if (deDentroDaFaceta(c)) continue;
      if (fs.length !== 2 || !fs.every((g) => noResultado.has(g) && ehDoPe.has(sobrevivente.get(g) ?? g))) continue;
      const l = tam(sub(posDe(b), posDe(a)));
      if (l <= limite) continue;
      const lo = Math.min(a, b), hi = Math.max(a, b), A = posDe(lo), B = posDe(hi);
      const tr = trechoNaFaixa(A, B, l);
      if (tr) candidatas.set(c, { a: lo, b: hi, ts: pontosDaAresta(tr[0], tr[1], l) });
    }
  }
  /* o triângulo quase sem área (o dobro da área até 4e-9 vezes o quadrado da meia-diagonal da caixa da malha; a medida de contato
     recusa a partir de 2e-9 vezes o da parte, que é menor) deixaria a parte inconclusiva na auditoria de contato */
  const caixa = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const p of st.V.values()) for (let i = 0; i < 3; i++) { if (p[i] < caixa[i]) caixa[i] = p[i]; if (p[i] > caixa[i + 3]) caixa[i + 3] = p[i]; }
  const meia = Math.hypot(caixa[3] - caixa[0], caixa[4] - caixa[1], caixa[5] - caixa[2]) / 2;
  const areaMinima = 4e-9 * meia * meia;
  /* a pior razão de cada pedaço como ele é, pela mesma triangulação (a que a recusa compara) */
  const piorDoPedaco = new Map();
  const piorOriginal = (fid) => {
    let pior = 0;
    for (const g of membrosDe(fid)) {
      if (!piorDoPedaco.has(g)) {
        const vs = st.F.get(g).vs, P = vs.map(posDe);
        const t = vs.length === 3 ? [[0, 1, 2]] : triangular(P, normalDe(P));
        piorDoPedaco.set(g, t ? piorRazao(t.map((T) => T.map((i) => P[i]))) : Infinity);
      }
      pior = Math.max(pior, piorDoPedaco.get(g));
    }
    return pior;
  };

  /* A CONFERÊNCIA DE CADA POLÍGONO REFEITO. Todo polígono que ganha ponto (o do pé e o do outro lado da aresta dividida) e todo
     polígono do pé (o pedaço junto ou o polígono que a união deixou) é triangulado de novo; o triângulo não pode sair pior que o
     pedaço de que veio (a pior razão dele, ou RAZAO_ACEITA, a que for maior). O polígono recusado devolve as arestas divididas
     dele, que ficam inteiras, e os vizinhos delas são refeitos na rodada seguinte; o polígono do pé recusado sem aresta dividida
     fica como estava (e o pedaço junto volta aos pedaços). */
  const bloqueadas = new Set();
  const recusados = new Set();
  let divisoes = new Map(), triangulos = new Map(), poligono = new Map(), posNovas = new Map(), pontos = new Map();
  const memoTri = new Map();
  for (let rodada = 0; rodada < RODADAS; rodada++) {
    divisoes = new Map([...candidatas].filter(([c]) => !bloqueadas.has(c)));
    const ordem = [...divisoes.entries()].sort((x, y) => x[1].a - y[1].a || x[1].b - y[1].b);
    pontos = new Map(); posNovas = new Map();
    let kv = 0;
    for (const [c, { a, b, ts }] of ordem) {
      const A = posDe(a), B = posDe(b), lista = [];
      for (const u of ts) {
        const id = idV(primeiroV + kv++);
        posNovas.set(id, [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u]);
        lista.push(id);
      }
      pontos.set(c, lista);
    }
    const posicao = (v) => posNovas.get(v) ?? posDe(v);
    /* o polígono com os pontos só das arestas de `usar` */
    const comPontos = (vs, usar) => {
      const saida = [];
      vs.forEach((v, k) => {
        const w = vs[(k + 1) % vs.length];
        saida.push(v);
        const c = chave(v, w);
        const lista = usar.has(c) ? pontos.get(c) : null;
        if (lista) saida.push(...(v < w ? lista : [...lista].reverse()));
      });
      return saida;
    };
    /* a triangulação do polígono com os pontos das arestas `usar`, ou null quando não há ou quando ela sai pior que o pedaço */
    const tentar = (fid, vs, usar) => {
      const P3 = comPontos(vs, usar);
      const assinatura = `${fid}|${[...usar].sort().join(',')}`;
      let t = memoTri.get(assinatura);
      if (t === undefined) {
        const P = P3.map(posicao);
        /* a diagonal que já é aresta de outra face deixaria a aresta em mais de duas faces (as arestas entre os pedaços juntos somem) */
        const proprias = new Set(membrosDe(fid));
        const tt = triangular(P, normalDe(P), (i, k) => (facesDaAresta.get(chave(P3[i], P3[k])) ?? []).some((g) => !proprias.has(g)), areaMinima);
        t = tt && piorRazao(tt.map((T) => T.map((i) => P[i])), limite) <= Math.max(RAZAO_ACEITA, piorOriginal(fid)) * FOLGA_DA_RECUSA ? tt : null;
        memoTri.set(assinatura, t);
      }
      if (!t) return null;
      const tris = t.map(([i, j, k]) => [P3[i], P3[j], P3[k]]);
      /* as diagonais (os lados dos triângulos que não são da borda do polígono) que a triangulação de outro polígono já usou
         (dois cantos que uma dobra fora do plano liga) */
      const borda = new Set(P3.map((v, k) => chave(v, P3[(k + 1) % P3.length])));
      const diagonais = tris.flatMap((T) => T.map((v, q) => chave(v, T[(q + 1) % 3]))).filter((c) => !borda.has(c));
      if (diagonais.some((c) => diagonaisUsadas.has(c))) return null;
      return { P3, tris, diagonais };
    };
    poligono = new Map(); triangulos = new Map();
    const alvo = new Set(doPeDoCordao.filter((f) => !recusados.has(f)));
    for (const c of divisoes.keys()) for (const g of facesDaAresta.get(c)) alvo.add(sobrevivente.get(g) ?? g);
    const diagonaisUsadas = new Set();
    let mudou = false;
    for (const fid of [...alvo].sort((x, y) => x - y)) {
      const vs = poligonoDe(fid);
      const divididas = [];
      for (let k = 0; k < vs.length; k++) { const c = chave(vs[k], vs[(k + 1) % vs.length]); if (divisoes.has(c)) divididas.push(c); }
      if (!divididas.length && !juntas.has(fid) && vs.length === 3) continue;
      let r = tentar(fid, vs, new Set(divididas));
      if (!r) {
        /* recusado: a aresta dividida que, inteira, deixa o polígono passar fica inteira (a primeira, na ordem das chaves); se
           nenhuma basta, ficam todas */
        const fica = divididas.length > 1 ? [...divididas].sort().find((c) => tentar(fid, vs, new Set(divididas.filter((d) => d !== c)))) : null;
        const inteiras = fica ? [fica] : divididas;
        if (inteiras.length) { for (const c of inteiras) bloqueadas.add(c); mudou = true; }
        if (!divididas.length) recusados.add(fid);
        continue;
      }
      poligono.set(fid, r.P3);
      triangulos.set(fid, r.tris);
      for (const c of r.diagonais) diagonaisUsadas.add(c);
    }
    if (!mudou) break;
    if (rodada === RODADAS - 1) return null;
  }
  if (!poligono.size) return { novas: 0, tocadas: 0 };
  /* a junção que não foi refeita volta aos pedaços */
  for (const [r, j] of [...juntas]) if (!poligono.has(r)) { juntas.delete(r); for (const g of j.absorvidas) absorvida.delete(g); }
  const posicao = (v) => posNovas.get(v) ?? posDe(v);
  /* só entram os pontos das arestas divididas, todos usados */
  if (primeiroV + posNovas.size > limiteDeIds) return null;

  /* as quebras de sombra dos polígonos refeitos, com as arestas divididas em pedaços */
  const quebrasNovas = new Map();
  for (const fid of poligono.keys()) {
    const quebrasDaFace = membrosDe(fid).map((g) => st.F.get(g)).flatMap((g) => g.quebras ?? []);
    if (!quebrasDaFace.length) continue;
    const q = [];
    for (const [x, y] of quebrasDaFace) {
      const lista = pontos.get(chave(x, y));
      if (!lista) { q.push([x, y]); continue; }
      const cadeia = x < y ? [x, ...lista, y] : [x, ...[...lista].reverse(), y];
      for (let k = 0; k + 1 < cadeia.length; k++) q.push([cadeia[k], cadeia[k + 1]]);
    }
    quebrasNovas.set(fid, q);
  }

  /* a conferência da malha: toda aresta dirigida do que muda tem a oposta no que muda ou no que fica */
  const mudam = new Set([...poligono.keys(), ...absorvida]);
  const dirigidas = new Map();
  const conta = (m, a, b) => m.set(`${a}>${b}`, (m.get(`${a}>${b}`) ?? 0) + 1);
  const depois = new Map();
  for (const tris of triangulos.values()) for (const P of tris) for (let k = 0; k < 3; k++) conta(depois, P[k], P[(k + 1) % 3]);
  for (const f of st.F.values()) if (!mudam.has(f.id)) for (let k = 0; k < f.vs.length; k++) conta(dirigidas, f.vs[k], f.vs[(k + 1) % f.vs.length]);
  for (const [c, n] of depois) {
    const [a, b] = c.split('>');
    const oposta = (depois.get(`${b}>${a}`) ?? 0) + (dirigidas.get(`${b}>${a}`) ?? 0);
    if (n !== 1 || oposta !== 1 || (dirigidas.get(c) ?? 0) > 0) return null;
  }
  let novasFaces = 0;
  for (const tris of triangulos.values()) novasFaces += tris.length - 1;
  if (primeiroF + novasFaces > limiteDeIds || novasFaces - absorvida.size > TETO_POR_PONTO_DO_PE * doPe.size) return null;

  /* aplica: as faces absorvidas saem (do estado, da lista do registro, da costura e dos donos), e a triangulação da sobrevivente
     cobre a faceta inteira */
  for (const [id, p] of [...posNovas].sort((x, y) => x[0] - y[0])) { st.V.set(id, p); st.novosV?.push(id); }
  for (const g of [...absorvida].sort((x, y) => x - y)) {
    st.F.delete(g);
    st.parteAtribuidaEm?.delete(g);
    st.pedacosDe?.delete(g);
    if (donos) delete donos[g];
    for (const lista of [faces, costura]) for (let i = lista.indexOf(g); i >= 0; i = lista.indexOf(g)) lista.splice(i, 1);
  }
  let kf = 0;
  const novas = [];
  const toca = tocaACostura;
  for (const [fid, tris] of [...triangulos.entries()].sort((x, y) => x[0] - y[0])) {
    const f = st.F.get(fid);
    const q = quebrasNovas.get(fid);
    /* o triângulo de maior área fica com o id da face */
    let melhor = 0, areaMelhor = -1;
    tris.forEach((t, k) => { const a = tam(normalDe(t.map(posicao))); if (a > areaMelhor) { areaMelhor = a; melhor = k; } });
    const chavesDasQuebras = new Set((q ?? []).map(([x, y]) => chave(x, y)));
    const quebrasDe = (t) => t.map((v, k) => [v, t[(k + 1) % 3]]).filter(([x, y]) => chavesDasQuebras.has(chave(x, y)));
    tris.forEach((t, k) => {
      const qs = quebrasDe(t);
      if (k === melhor) {
        f.vs = t; f.tinta = [];
        if (qs.length) f.quebras = qs; else delete f.quebras;
        return;
      }
      const id = idF(primeiroF + kf++);
      st.F.set(id, { ...f, id, vs: t, tinta: [], ...(qs.length ? { quebras: qs } : {}) });
      if (!qs.length) delete st.F.get(id).quebras;
      st.novosF?.push(id);
      if (st.parteAtribuidaEm?.has(fid)) st.parteAtribuidaEm.set(id, st.parteAtribuidaEm.get(fid));
      (st.pedacosDe ??= new Map()).set(id, st.pedacosDe.get(fid) ?? fid);
      faces.push(id);
      if (donos && donos[fid] != null) donos[id] = donos[fid];
      if (toca.has(fid) && t.some((v, j) => arestasDaCostura.has(chave(v, t[(j + 1) % 3])))) costura.push(id);
      novas.push(id);
    });
    const i = costura.indexOf(fid);
    const melhorToca = tris[melhor].some((v, j) => arestasDaCostura.has(chave(v, tris[melhor][(j + 1) % 3])));
    if (toca.has(fid) && !melhorToca && i >= 0) costura.splice(i, 1);
    if (toca.has(fid) && melhorToca && i < 0) costura.push(fid);
  }
  return { novas: novas.length - absorvida.size, tocadas: triangulos.size + absorvida.size };
}
