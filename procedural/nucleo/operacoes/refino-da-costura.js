/* refino-da-costura.js — o refino da faixa que o cordão de solda toca (plano do cordão de solda na costura de tubos, fatia 7).

   A união que funde o cordão aos sólidos corta as faces dos tubos pelo pé do cordão, e a face de um tubo que vem de um anel ao
   outro (dezenas de milímetros de comprimento por uns poucos de largura) sai da união como um polígono longo com a curva do
   pé de um lado: a triangulação dele é um leque de triângulos finos e longos, e o sombreado liso risca o tubo ao longo deles.
   Antes isto era contornado pela receita, que punha anéis a cada 4 mm nas pontas do tubo; aqui o refino é da ferramenta.

   O CÁLCULO. Entre as faces do resultado, as que tocam a costura e têm aresta mais longa que `LIMITE_DO_LADO` passos são as
   da faixa. Cada aresta longa delas (fora as da costura, que o cordão desenhou) ganha pontos a `passo` de distância, e o
   mesmo conjunto de pontos entra na face do outro lado da aresta, para a malha continuar sem junção em T. Cada face da faixa é
   então triangulada de novo, pela triangulação do polígono que deixa menor a pior razão de aspecto (o maior lado ao quadrado
   sobre o dobro da área), e os triângulos herdam a cor, o material, a parte, o liso e as quebras de sombra da face. Onde
   nenhuma triangulação serve (polígono não simples ou com mais de `MAXIMO_DE_CANTOS` cantos) a face guarda os pontos novos e
   continua um polígono só.

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

/** o passo do refino pela largura do cordão: 0,4 da largura (2,8 mm num cordão de 7 mm, e nenhum lado da faixa passa de 1,5 passo), medido contra os anéis de 4 mm que a receita da bicicleta punha */
export const passoDoRefino = (largura) => 0.4 * largura;
/** a largura da faixa em volta da costura, medida da costura à aresta: duas larguras do cordão */
export const faixaDoRefino = (largura) => 2 * largura;

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

/**
 * refinarFaixaDaCostura(st, { faces, costura, arestasDaCostura, passo, idV, idF, donos }) -> { novas, tocadas } ou null
 *  `faces` (lista) e `costura` (as faces que tocam a costura) são do registro da união; `arestasDaCostura` é o conjunto de chaves
 *  "a-b" (a < b) das arestas da costura; `idV(k)` e `idF(k)` dão o k-ésimo id novo de vértice e de face do passo. Escreve em `st`,
 *  põe em `faces` e em `costura` os triângulos novos e em `donos` o dono deles, e devolve a contagem. Se algo não confere (a malha
 *  deixaria de fechar, o passo acabaria os ids) não escreve nada e devolve null.
 */
export function refinarFaixaDaCostura(st, { faces, costura, arestasDaCostura, passo, faixa, idV, idF, primeiroV, primeiroF, limiteDeIds, donos }) {
  const limite = LIMITE_DO_LADO * passo;
  const posDe = (v) => st.V.get(v);
  /* os pontos da costura, numa grade de células do tamanho da faixa, para achar a distância de uma aresta à costura */
  const noDaCostura = new Set();
  for (const c of arestasDaCostura) for (const v of c.split('-')) noDaCostura.add(Number(v));
  const grade = new Map();
  const celula = (p) => p.map((x) => Math.floor(x / faixa));
  for (const v of [...noDaCostura].sort((x, y) => x - y)) {
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
     vez (a malha engrossa aos poucos, e o sombreado não vê o degrau); o que sobra menos que o passo seguinte fica sem ponto */
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
  const doResultado = [...new Set(faces)].filter((f) => st.F.has(f)).sort((x, y) => x - y);
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
  const deDentroDaFaceta = (c) => {
    const cd = cossenoDoDiedro(c);
    if (cd === null) return false;
    const proprio = Math.acos(Math.min(1, cd));
    if (proprio < PISO_DO_DIEDRO) return true;
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
    return proprio < maior / 4;
  };
  /* OS PEDAÇOS DE UMA FACETA SE JUNTAM. A união parte a faceta cortada pelo pé do cordão em pedaços convexos, e cada pedaço
     triangulado sozinho liga o ponto do pé (que fica dentro da faceta, com a normal lisa puxada pelo cordão) ao canto mais
     longe do pedaço, num triângulo longo que leva essa normal tubo afora: o risco claro ao longo do tubo. Os pedaços do mesmo
     plano que vêm da mesma face de entrada, com a mesma aparência, se juntam pela aresta comum que não é quebra de sombra
     (`fundir`, que só junta dois polígonos com exatamente uma aresta em comum) num polígono só, e a triangulação dele escolhe
     entre todos os pontos da borda da faceta (os do pé e os que o refino põe nas arestas dela). A junção só fica quando o
     polígono junto é refeito (tem aresta dividida ou toca a costura). */
  const aparencia = (f) => JSON.stringify([f.parte ?? null, f.material ?? null, f.cor ?? null, f.liso ?? null, f.solido ?? null, st.pedacosDe?.get(f.id) ?? f.id]);
  const noResultado = new Set(doResultado);
  const paiDaFace = new Map(doResultado.map((f) => [f, f]));
  const raizDaFace = (x) => { while (paiDaFace.get(x) !== x) { paiDaFace.set(x, paiDaFace.get(paiDaFace.get(x))); x = paiDaFace.get(x); } return x; };
  for (const [c, fs] of [...facesDaAresta.entries()].sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0))) {
    if (fs.length !== 2 || !fs.every((g) => noResultado.has(g)) || arestasDaCostura.has(c)) continue;
    const [f1, f2] = fs.map((g) => st.F.get(g));
    if (f1.tinta?.length || f2.tinta?.length || aparencia(f1) !== aparencia(f2)) continue;
    if ([f1, f2].some((g) => (g.quebras ?? []).some(([x, y]) => chave(x, y) === c))) continue;
    if (!deDentroDaFaceta(c)) continue;
    const r1 = raizDaFace(f1.id), r2 = raizDaFace(f2.id);
    if (r1 !== r2) paiDaFace.set(Math.max(r1, r2), Math.min(r1, r2));
  }
  const grupos = new Map();
  for (const f of doResultado) { const r = raizDaFace(f); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(f); }
  /* quantas faces usam cada canto: a junção tira uma face de cada ponta da aresta comum, e o canto que ficaria com menos de três
     (um vínculo que não fecha laço) a impede */
  const valencia = new Map();
  for (const f of st.F.values()) for (const v of f.vs) valencia.set(v, (valencia.get(v) ?? 0) + 1);
  const juntas = new Map();   // sobrevivente -> { vs, absorvidas }
  for (const [r, membros] of grupos) {
    if (membros.length < 2) continue;
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
  const poligonoDe = (fid) => juntas.get(fid)?.vs ?? st.F.get(fid).vs;
  const vivas = doResultado.filter((f) => !absorvida.has(f));
  const tocaACostura = new Set(costura);
  for (const [r, j] of juntas) if (j.absorvidas.some((g) => tocaACostura.has(g))) tocaACostura.add(r);

  /* a aresta de uma face lasca (largura, 2 vezes a área sobre o perímetro, abaixo de 1/10 do passo) fica inteira (medida depois da junção dos pedaços, que absorve a lasca da faceta): a normal da lasca não
     tem precisão (o diedro dela não diz se a aresta é dobra ou fica dentro de uma faceta), e o ponto novo entraria na média lisa com o
     ângulo inteiro do canto dela */
  const larguraMinima = passo / 10;
  const arestaDeLasca = new Set();
  for (const f of st.F.values()) {
    if (absorvida.has(f.id)) continue;
    const vs = poligonoDe(f.id);
    if (vs.length < 3) continue;
    const P = vs.map(posDe);
    const N = normalDe(P);
    let per = 0;
    for (let k = 0; k < P.length; k++) per += tam(sub(P[(k + 1) % P.length], P[k]));
    if (per > 0 && (tam(N) / per) < larguraMinima) for (let k = 0; k < vs.length; k++) arestaDeLasca.add(chave(vs[k], vs[(k + 1) % vs.length]));
  }
  const divisoes = new Map();   // chave da aresta -> { a, b, n } com a < b
  for (const fid of vivas) {
    const vs = poligonoDe(fid);
    if (new Set(vs).size !== vs.length) continue;
    for (let k = 0; k < vs.length; k++) {
      const a = vs[k], b = vs[(k + 1) % vs.length], c = chave(a, b);
      if (arestasDaCostura.has(c) || divisoes.has(c) || arestaDeLasca.has(c) || deDentroDaFaceta(c)) continue;
      const l = tam(sub(posDe(b), posDe(a)));
      if (l <= limite) continue;
      const lo = Math.min(a, b), hi = Math.max(a, b), A = posDe(lo), B = posDe(hi);
      const tr = trechoNaFaixa(A, B, l);
      if (tr && (tr[1] - tr[0]) * l > limite) divisoes.set(c, { a: lo, b: hi, ts: pontosDaAresta(tr[0], tr[1], l) });
    }
  }
  if (!divisoes.size) return { novas: 0, tocadas: 0 };
  /* a junção que não ganhou ponto nem toca a costura volta aos pedaços */
  for (const [r, j] of [...juntas]) {
    const P = j.vs;
    let tem = tocaACostura.has(r);
    for (let k = 0; k < P.length && !tem; k++) tem = divisoes.has(chave(P[k], P[(k + 1) % P.length]));
    if (!tem) { juntas.delete(r); for (const g of j.absorvidas) absorvida.delete(g); }
  }

  /* os pontos de cada aresta dividida, do menor id ao maior */
  const ordem = [...divisoes.entries()].sort((x, y) => x[1].a - y[1].a || x[1].b - y[1].b);
  const pontos = new Map();   // chave -> [{ id, pos }] de a para b
  const posNovas = new Map();
  let kv = 0;
  for (const [c, { a, b, ts }] of ordem) {
    const A = posDe(a), B = posDe(b), lista = [];
    for (const u of ts) {
      const id = idV(primeiroV + kv++);
      const p = [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u];
      posNovas.set(id, p); lista.push(id);
    }
    pontos.set(c, lista);
  }
  const posicao = (v) => posNovas.get(v) ?? posDe(v);
  if (primeiroV + kv > limiteDeIds) return null;

  /* os polígonos depois de dividir as arestas: toda face que tem uma aresta dividida (a da faixa e a do outro lado) */
  const poligono = new Map();
  const quebrasNovas = new Map();
  const comPontos = (vs) => {
    const saida = [];
    vs.forEach((v, k) => {
      const w = vs[(k + 1) % vs.length];
      saida.push(v);
      const lista = pontos.get(chave(v, w));
      if (lista) saida.push(...(v < w ? lista : [...lista].reverse()));
    });
    return saida;
  };
  for (const fid of doResultado) {
    if (absorvida.has(fid)) continue;
    const f = st.F.get(fid);
    const vs = poligonoDe(fid);
    let tem = juntas.has(fid);
    for (let k = 0; k < vs.length && !tem; k++) tem = pontos.has(chave(vs[k], vs[(k + 1) % vs.length]));
    if (!tem) continue;
    poligono.set(f.id, comPontos(vs));
    const quebrasDaFace = [f, ...(juntas.get(fid)?.absorvidas ?? []).map((g) => st.F.get(g))].flatMap((g) => g.quebras ?? []);
    if (quebrasDaFace.length) {
      const q = [];
      for (const [x, y] of quebrasDaFace) {
        const lista = pontos.get(chave(x, y));
        if (!lista) { q.push([x, y]); continue; }
        const cadeia = x < y ? [x, ...lista, y] : [x, ...[...lista].reverse(), y];
        for (let k = 0; k + 1 < cadeia.length; k++) q.push([cadeia[k], cadeia[k + 1]]);
      }
      quebrasNovas.set(f.id, q);
    }
  }

  /* a triangulação das faces da faixa */
  const triangulos = new Map();   // fid -> lista de [a, b, c] em ids
  /* o triângulo quase sem área (o dobro da área até 4e-9 vezes o quadrado da meia-diagonal da caixa da malha; a medida de contato
     recusa a partir de 2e-9 vezes o da parte, que é menor) deixaria a parte inconclusiva na auditoria de contato */
  const caixa = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const p of st.V.values()) for (let i = 0; i < 3; i++) { if (p[i] < caixa[i]) caixa[i] = p[i]; if (p[i] > caixa[i + 3]) caixa[i + 3] = p[i]; }
  const meia = Math.hypot(caixa[3] - caixa[0], caixa[4] - caixa[1], caixa[5] - caixa[2]) / 2;
  const areaMinima = 4e-9 * meia * meia;
  const diagonaisUsadas = new Set();
  for (const fid of poligono.keys()) {
    const vs = poligono.get(fid);
    const P = vs.map(posicao);
    const normal = normalDe(P);
    /* a diagonal que já é aresta de outra face, ou que a triangulação de outro polígono já usou (dois cantos que uma dobra fora do
       plano liga), deixaria a aresta em mais de duas faces */
    const t = triangular(P, normal, (i, k) => facesDaAresta.has(chave(vs[i], vs[k])) || diagonaisUsadas.has(chave(vs[i], vs[k])), areaMinima);
    if (t) {
      const tris = t.map(([i, j, k]) => [vs[i], vs[j], vs[k]]);
      triangulos.set(fid, tris);
      for (const T of tris) for (let k = 0; k < 3; k++) diagonaisUsadas.add(chave(T[k], T[(k + 1) % 3]));
    }
  }

  /* a conferência da malha: toda aresta dirigida do que muda tem a oposta no que muda ou no que fica */
  const mudam = new Set([...poligono.keys(), ...absorvida]);
  const dirigidas = new Map();
  const conta = (m, a, b) => m.set(`${a}>${b}`, (m.get(`${a}>${b}`) ?? 0) + 1);
  const depois = new Map();
  for (const [fid, vs] of poligono) {
    const tris = triangulos.get(fid);
    for (const P of tris ?? [vs]) for (let k = 0; k < P.length; k++) conta(depois, P[k], P[(k + 1) % P.length]);
  }
  for (const f of st.F.values()) if (!mudam.has(f.id)) for (let k = 0; k < f.vs.length; k++) conta(dirigidas, f.vs[k], f.vs[(k + 1) % f.vs.length]);
  /* as diagonais novas entram duas vezes, uma em cada sentido, dentro de `depois` */
  for (const [c, n] of depois) {
    const [a, b] = c.split('>');
    const oposta = (depois.get(`${b}>${a}`) ?? 0) + (dirigidas.get(`${b}>${a}`) ?? 0);
    if (n !== 1 || oposta !== 1 || (dirigidas.get(c) ?? 0) > 0) return null;
  }
  let novasFaces = 0;
  for (const tris of triangulos.values()) novasFaces += tris.length - 1;
  if (primeiroF + novasFaces > limiteDeIds) return null;

  /* aplica: as faces absorvidas saem (do estado, da lista do registro, da costura e dos donos), e a triangulação da sobrevivente
     cobre a faceta inteira */
  for (const [id, p] of posNovas) { st.V.set(id, p); st.novosV?.push(id); }
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
  for (const [fid, vs] of [...poligono.entries()].sort((x, y) => x[0] - y[0])) {
    const f = st.F.get(fid);
    const tris = triangulos.get(fid);
    const q = quebrasNovas.get(fid);
    if (!tris) {
      f.vs = vs;
      if (q) f.quebras = q;
      continue;
    }
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
  return { novas: novas.length - absorvida.size, tocadas: poligono.size + absorvida.size };
}
