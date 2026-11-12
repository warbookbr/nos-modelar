/* limpar-lascas.js — o cálculo da limpeza de lascas depois de uma booleana: função pura sobre vértices e faces, sem passo, sem Manifold
 * e sem domínio de objeto. A operação `limparLascas` (operacoes/limpar-lascas.js) lê a seleção, chama este cálculo e aplica o resultado.
 *
 * O QUE É UMA LASCA. A mesma medida de `topologia.js`: área da face dividida pelo quadrado da maior aresta, abaixo de `limite`
 * (0,003). A booleana as deixa onde o corte passa a centésimos de milímetro de um vértice da malha ou quase sobre uma aresta dela:
 * um triângulo de uma aresta curta e duas longas (a ponta), ou de três cantos quase alinhados (a lâmina).
 *
 * O QUE ELE FAZ, e só isto, nesta ordem para cada lasca, em passadas até nenhuma sair mais (a pior razão primeiro, depois o id):
 *   1. TROCA a diagonal do par de triângulos em volta da aresta maior da lasca (a ponta de apice quase sobre a aresta), quando o par tem
 *      os mesmos atributos, é convexo e quase plano e a troca tira lasca; não move vértice;
 *   2. COLAPSA uma aresta da lasca, da menor para a maior: o vértice de menor id fica, na posição (a dele, a do outro ou o meio) que
 *      menos sai dos planos das faces boas que os dois tinham;
 *   3. JUNTA a lasca à face vizinha, que ganha o apice como canto, quando o resultado continua convexo e deixa de ser lasca.
 * Cada movimento só vale com a aresta interior (duas faces), a vizinhança ainda uma malha fechada (condição de ligação), nenhuma face
 * virada, nenhuma face boa virando lasca, nenhuma parte perdendo a última face, e DUAS medidas da superfície: o ponto novo a no máximo
 * `tolerancia` dos planos de ENTRADA das faces boas em volta (o vértice que absorve o outro herda os dois conjuntos, e fusões em cadeia
 * não somam), e o remendo novo a no máximo `tolerancia` do remendo de antes, nos dois sentidos, medido nos cantos, nos pontos médios e
 * no centro das faces. A segunda existe porque o ponto pode estar sobre os planos e a face estreita ao lado girar em volta dele: um
 * colapso de 2 mm numa tira de 0,1 mm moveu a superfície 16 µm com o ponto a 4 µm dos planos.
 *
 * O QUE ELE NÃO FAZ. Não cria vértice nem face, não mexe em face fora da seleção (ela só acompanha o vértice que se move), não toca
 * face com tinta e não desfaz a lasca que nasce da entrada (a tira de 0,2 mm de uma concordância de raio 3 que já era fina na
 * chapa): essa fica em `restantes`, com o motivo. Aresta de borda (uma face só) e vértice de aresta não-manifold ficam como estão.
 *
 * Determinístico: a ordem é (razão crescente, id) e os empates entre candidatos seguem a ordem das arestas. */
import { LIMITE_DE_FACE_FINA } from './topologia.js';

const EPS = 1e-12;
const MAXIMO_DE_PLANOS = 48;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const dist = (a, b) => norma(sub(a, b));

/** O vetor de Newell: normal da face com o comprimento do dobro da área. */
function newell(pontos) {
  let nx = 0; let ny = 0; let nz = 0;
  for (let k = 0; k < pontos.length; k += 1) {
    const a = pontos[k]; const b = pontos[(k + 1) % pontos.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return [nx, ny, nz];
}

function maiorAresta(pontos) {
  let m = 0;
  for (let k = 0; k < pontos.length; k += 1) m = Math.max(m, dist(pontos[k], pontos[(k + 1) % pontos.length]));
  return m;
}

/** Área / maior aresta², a razão de `topologia.js`. */
export function razaoDeFace(pontos) {
  const m = maiorAresta(pontos);
  return m > 0 ? norma(newell(pontos)) / 2 / (m * m) : 0;
}

/** A distância entre a reta de ab e a reta de cd: o quanto o quadrilátero de quatro pontos sai de um plano. */
function distanciaEntreRetas(a, b, c, d) {
  const u = sub(b, a); const v = sub(d, c);
  const n = cruz(u, v);
  const nn = norma(n);
  if (nn <= 1e-12 * norma(u) * norma(v)) return norma(cruz(sub(c, a), u)) / (norma(u) || 1);
  return Math.abs(dot(sub(c, a), n)) / nn;
}

const mesmoLiso = (x, y) => (x ?? null) === (y ?? null);
/** A distância de um ponto ao triângulo (o ponto mais próximo, de Ericson); no triângulo sem área, ao menor dos três lados. */
function distanciaAoTriangulo(p, A, B, C) {
  const ab = sub(B, A); const ac = sub(C, A); const ap = sub(p, A);
  const d1 = dot(ab, ap); const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return norma(ap);
  const bp = sub(p, B); const d3 = dot(ab, bp); const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return norma(bp);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1 / (d1 - d3); return norma(sub(p, [A[0] + ab[0] * t, A[1] + ab[1] * t, A[2] + ab[2] * t])); }
  const cp = sub(p, C); const d5 = dot(ab, cp); const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return norma(cp);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2 / (d2 - d6); return norma(sub(p, [A[0] + ac[0] * t, A[1] + ac[1] * t, A[2] + ac[2] * t])); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const t = (d4 - d3) / ((d4 - d3) + (d5 - d6)); const bc = sub(C, B); return norma(sub(p, [B[0] + bc[0] * t, B[1] + bc[1] * t, B[2] + bc[2] * t])); }
  const soma = va + vb + vc;
  if (!(soma > 0)) return Math.min(distanciaAoSegmento(p, A, B), distanciaAoSegmento(p, B, C), distanciaAoSegmento(p, C, A));
  const v = vb / soma; const w = vc / soma;
  return norma(sub(p, [A[0] + ab[0] * v + ac[0] * w, A[1] + ab[1] * v + ac[1] * w, A[2] + ab[2] * v + ac[2] * w]));
}
function distanciaAoSegmento(p, A, B) {
  const ab = sub(B, A); const m = dot(ab, ab);
  const t = m > 0 ? Math.max(0, Math.min(1, dot(sub(p, A), ab) / m)) : 0;
  return norma(sub(p, [A[0] + ab[0] * t, A[1] + ab[1] * t, A[2] + ab[2] * t]));
}

/** O maior afastamento entre dois remendos de polígonos convexos (a superfície de antes e a de depois, com a mesma borda), nos dois
 *  sentidos, medido nos cantos, nos pontos médios das arestas e no centro de cada polígono. Os planos de referência limitam o ponto
 *  novo; este limita a superfície, que o braço de uma face estreita pode inclinar muito mais que o ponto. */
function desvioEntreRemendos(antes, depois) {
  const triangulos = (poligonos) => poligonos.flatMap((P) => { const T = []; for (let k = 1; k + 1 < P.length; k += 1) T.push([P[0], P[k], P[k + 1]]); return T; });
  const amostras = (poligonos) => poligonos.flatMap((P) => {
    const m = P.length; const c = [0, 0, 0];
    const S = P.map((q, k) => { c[0] += q[0] / m; c[1] += q[1] / m; c[2] += q[2] / m; const r = P[(k + 1) % m]; return [(q[0] + r[0]) / 2, (q[1] + r[1]) / 2, (q[2] + r[2]) / 2]; });
    return [...P, ...S, c];
  });
  const sentido = (de, para) => {
    let m = 0;
    for (const p of amostras(de)) { let d = Infinity; for (const [A, B, C] of para) d = Math.min(d, distanciaAoTriangulo(p, A, B, C)); m = Math.max(m, d); }
    return m;
  };
  const tA = triangulos(antes); const tD = triangulos(depois);
  return Math.max(sentido(antes, tD), sentido(depois, tA));
}

const igualAtributos = (f, g) => (f.parte ?? null) === (g.parte ?? null) && (f.material ?? null) === (g.material ?? null) && (f.cor ?? null) === (g.cor ?? null)
  && mesmoLiso(f.liso, g.liso) && (f.solido ?? null) === (g.solido ?? null);

/**
 * @param {{ V: Map<number, number[]>, F: Map<number, { vs: number[], parte?: any, tinta?: any[], quebras?: any[] }> }} malha
 * @param {{ selecao?: Iterable<number>, tolerancia: number, limite?: number, passadas?: number, trilha?: object[] | null }} opcoes
 *   `selecao`: as faces que podem sumir ou trocar de diagonal (padrão: todas); `tolerancia`: o quanto a superfície pode sair do lugar,
 *   na unidade da malha; `limite`: a razão abaixo da qual a face é lasca (padrão 0,003).
 * @returns {{ vertices: Map<number, number[]>, verticesRemovidos: Set<number>, fusoes: Map<number, number>, faces: Map<number, number[]>, facesRemovidas: Set<number>,
 *   relatorio: { selecionadas: number, finasAntes: number, finasDepois: number, colapsos: number, trocas: number, desvioMaximo: number, restantes: { face: number, razao: number, arestaCurta: number, recusas: string[] }[] } }}
 */
export function limparLascas(malha, { selecao = null, tolerancia, limite = LIMITE_DE_FACE_FINA, passadas = 16, trilha = null, maxOperacoes = Infinity, areaMinima = 0 } = {}) {
  if (!(Number.isFinite(tolerancia) && tolerancia > 0)) throw new Error('limparLascas: a tolerância é um número positivo, na unidade da malha');
  if (!(Number.isFinite(limite) && limite > 0 && limite < 0.5)) throw new Error('limparLascas: o limite de lasca é um número entre 0 e 0,5');
  if (!(Number.isFinite(areaMinima) && areaMinima >= 0)) throw new Error('limparLascas: a área mínima é um número a partir de zero, na unidade da malha ao quadrado');
  /* a razão de uma face, e a de uma face de área abaixo de `areaMinima` (a que a medida de contatos não triangula, por menor que seja a razão dela
     com a maior aresta) vale metade do limite: ela é lasca mesmo com boa proporção */
  const razao = (pontos) => {
    const r = razaoDeFace(pontos);
    return areaMinima > 0 && r >= limite && norma(newell(pontos)) / 2 < areaMinima ? limite / 2 : r;
  };
  const { V, F } = malha;
  const vs = new Map(); const vf = new Map();
  for (const [fid, f] of F) {
    vs.set(fid, f.vs.slice());
    for (const v of f.vs) { let s = vf.get(v); if (!s) vf.set(v, s = new Set()); s.add(fid); }
  }
  const selecionadas = new Set(selecao == null ? F.keys() : [...selecao].filter((f) => F.has(f)));
  const moveu = new Map();
  const pos = (v) => moveu.get(v) ?? V.get(v);
  const pontos = (lista) => lista.map(pos);
  const bloqueada = (fid) => (F.get(fid).tinta?.length ?? 0) > 0;
  const contagemDeParte = new Map();
  for (const f of F.values()) if (f.parte != null) contagemDeParte.set(f.parte, (contagemDeParte.get(f.parte) ?? 0) + 1);

  /* os planos de referência, da malha de entrada: só de face boa (a normal de uma lasca é ruído) */
  const razaoOriginal = new Map();
  const boaOriginal = (fid) => {
    let r = razaoOriginal.get(fid);
    if (r === undefined) { r = razao(F.get(fid).vs.map((v) => V.get(v))); razaoOriginal.set(fid, r); }
    return r >= limite;
  };
  const planos = new Map();
  const planosDe = (v) => {
    let lista = planos.get(v);
    if (lista) return lista;
    lista = [];
    for (const fid of vf.get(v) ?? []) {
      const original = F.get(fid).vs;
      if (!original.includes(v) || !boaOriginal(fid)) continue;
      const p = original.map((w) => V.get(w));
      const n = newell(p); const m = norma(n);
      if (!(m > 0)) continue;
      const u = [n[0] / m, n[1] / m, n[2] / m];
      lista.push({ n: u, d: dot(u, p[0]) });
    }
    planos.set(v, lista);
    return lista;
  };
  const uniao = (a, b) => {
    const saida = [...planosDe(a)];
    for (const p of planosDe(b)) if (!saida.some((q) => dot(q.n, p.n) > 1 - 1e-12 && Math.abs(q.d - p.d) < 1e-12)) saida.push(p);
    return saida.length > MAXIMO_DE_PLANOS ? saida.slice(0, MAXIMO_DE_PLANOS) : saida;
  };
  const custoEm = (lista, p) => { let m = 0; for (const { n, d } of lista) m = Math.max(m, Math.abs(dot(n, p) - d)); return m; };

  const vizinhos = (v) => {
    const s = new Set();
    for (const fid of vf.get(v) ?? []) { const l = vs.get(fid); const k = l.indexOf(v); s.add(l[(k + 1) % l.length]); s.add(l[(k + l.length - 1) % l.length]); }
    return s;
  };
  /** As faces que têm a aresta a-b, e se alguma tem os dois cantos sem a aresta entre eles. */
  const facesDaAresta = (a, b) => {
    const lista = []; let solta = false;
    const sb = vf.get(b);
    for (const fid of vf.get(a) ?? []) {
      if (!sb?.has(fid)) continue;
      const l = vs.get(fid); const i = l.indexOf(a); const n = l.length;
      if (l[(i + 1) % n] === b || l[(i + n - 1) % n] === b) lista.push(fid); else solta = true;
    }
    return { lista, solta };
  };
  const tirarDe = (v, fid) => { const s = vf.get(v); if (s) { s.delete(fid); if (!s.size) vf.delete(v); } };
  const poeEm = (v, fid) => { let s = vf.get(v); if (!s) vf.set(v, s = new Set()); s.add(fid); };

  const fusoes = new Map(); const verticesRemovidos = new Set(); const facesRemovidas = new Set(); const facesMudadas = new Set();
  let colapsos = 0; let trocas = 0; let absorcoes = 0; let desvioMaximo = 0;

  let ultimaRecusa = '';
  const no = (motivo) => { ultimaRecusa = motivo; return false; };

  /* ---- a troca da diagonal ---- */
  function tentarTroca(f1, k) {
    const l1 = vs.get(f1);
    if (l1.length !== 3 || !selecionadas.has(f1) || bloqueada(f1)) return no('troca: a face não é triângulo da seleção');
    const a = l1[k]; const b = l1[(k + 1) % 3]; const c = l1[(k + 2) % 3];
    const { lista, solta } = facesDaAresta(a, b);
    if (solta || lista.length !== 2) return no('troca: aresta de borda ou não-manifold');
    const f2 = lista.find((x) => x !== f1);
    const l2 = vs.get(f2);
    if (l2.length !== 3 || !selecionadas.has(f2) || bloqueada(f2)) return no('troca: o vizinho não é triângulo da seleção');
    if (!igualAtributos(F.get(f1), F.get(f2)) || F.get(f1).quebras?.length || F.get(f2).quebras?.length) return no('troca: atributos ou vinco diferentes');
    const d = l2.find((x) => x !== a && x !== b);
    if (d === c || vizinhos(c).has(d)) return no('troca: os apices já são vizinhos');
    if ((vf.get(a)?.size ?? 0) < 4 || (vf.get(b)?.size ?? 0) < 4) return no('troca: deixaria vértice de valência 2');
    const [pa, pb, pc, pd] = [a, b, c, d].map(pos);
    const n1 = newell([pa, pb, pc]); const n2 = newell([pb, pa, pd]);
    const m1 = newell([pa, pd, pc]); const m2 = newell([pd, pb, pc]);
    const ref = [n1[0] + n2[0], n1[1] + n2[1], n1[2] + n2[2]];
    if (!(dot(m1, ref) > 0 && dot(m2, ref) > 0)) return no('troca: o par não é convexo');
    const desvio = desvioEntreRemendos([[pa, pb, pc], [pb, pa, pd]], [[pa, pd, pc], [pd, pb, pc]]);
    if (desvio > tolerancia) return no('troca: o par não é plano dentro da tolerância');
    const antes = Math.min(razao([pa, pb, pc]), razao([pb, pa, pd]));
    const depois = Math.min(razao([pa, pd, pc]), razao([pd, pb, pc]));
    const finasDe = (...q) => q.filter((r) => r < limite).length;
    const finasAntesDaTroca = finasDe(razao([pa, pb, pc]), razao([pb, pa, pd]));
    const finasDepoisDaTroca = finasDe(razao([pa, pd, pc]), razao([pd, pb, pc]));
    if (!(finasDepoisDaTroca < finasAntesDaTroca && depois > antes * 1.05 + EPS)) return no('troca: não melhora');
    vs.set(f1, [a, d, c]); vs.set(f2, [d, b, c]);
    tirarDe(b, f1); tirarDe(a, f2); poeEm(d, f1); poeEm(c, f2);
    facesMudadas.add(f1); facesMudadas.add(f2);
    desvioMaximo = Math.max(desvioMaximo, desvio);
    trocas += 1;
    trilha?.push({ tipo: 'troca', faces: [f1, f2], vertices: [a, b, c, d], desvio });
    return true;
  }

  /* ---- o colapso da aresta curta ---- */
  function tentarColapso(x, y) {
    const a = Math.min(x, y); const b = Math.max(x, y);
    const { lista, solta } = facesDaAresta(a, b);
    if (solta || lista.length !== 2) return no('colapso: aresta de borda ou não-manifold');
    for (const fid of lista) if (!selecionadas.has(fid) || bloqueada(fid)) return no('colapso: face fora da seleção ou com tinta');
    const somem = lista.filter((fid) => vs.get(fid).length === 3);
    const apices = new Set(somem.map((fid) => vs.get(fid).find((w) => w !== a && w !== b)));
    const na = vizinhos(a); const nb = vizinhos(b);
    for (const w of na) if (w !== b && nb.has(w) && !apices.has(w)) return no('colapso: a vizinhança deixaria de ser malha fechada');
    const mesmos = new Set(somem);
    /* as partes: nenhuma perde a última face */
    const perdas = new Map();
    for (const fid of somem) { const p = F.get(fid).parte; if (p != null) perdas.set(p, (perdas.get(p) ?? 0) + 1); }
    for (const [p, n] of perdas) if ((contagemDeParte.get(p) ?? 0) - n < 1) return no('colapso: a parte perderia a última face');
    for (const w of apices) { let restam = 0; for (const fid of vf.get(w) ?? []) if (!mesmos.has(fid)) restam += 1; if (restam < 3) return no('colapso: deixaria vértice de valência 2'); }
    const doVertice = new Set([...(vf.get(a) ?? []), ...(vf.get(b) ?? [])]);
    let faltam = 0; for (const fid of doVertice) if (!mesmos.has(fid)) faltam += 1;
    if (faltam < 3) return no('colapso: deixaria vértice de valência 2');
    for (const fid of doVertice) if (!mesmos.has(fid) && bloqueada(fid)) return no('colapso: face com tinta em volta');

    /* a posição: do que cabe nos planos das faces boas, a que menos sai deles; e a vizinhança depois da fusão confere: nenhuma face
       vira, nenhuma face boa vira lasca, nenhuma lasca piora, e a superfície nova fica a no máximo a tolerância da de antes */
    const referencia = uniao(a, b);
    const pa = pos(a); const pb = pos(b);
    const candidatos = [pa, pb, [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2]]
      .map((p, k) => ({ p, k, custo: referencia.length ? custoEm(referencia, p) : Math.max(dist(p, pa), dist(p, pb)) }))
      .filter((c) => c.custo <= tolerancia)
      .sort((u, v) => u.custo - v.custo || u.k - v.k);
    if (!candidatos.length) return no('colapso: passaria da tolerância');
    const antigas = [...doVertice].sort((u, v) => u - v);
    let melhor = null; let novas = null;
    for (const candidato of candidatos) {
      const tentativa = new Map();
      let finasAntesDoColapso = 0; let finasDepoisDoColapso = 0;
      let recusa = null;
      for (const fid of antigas) {
        const l = vs.get(fid);
        const antigos = pontos(l);
        if (razao(antigos) < limite) finasAntesDoColapso += 1;
        if (mesmos.has(fid) || recusa) continue;
        const nova = [];
        for (const v of l) { const w = v === b ? a : v; if (nova[nova.length - 1] !== w) nova.push(w); }
        if (nova.length > 1 && nova[0] === nova[nova.length - 1]) nova.pop();
        if (nova.length < 3 || new Set(nova).size !== nova.length) { recusa = 'colapso: uma face em volta degeneraria'; continue; }
        const depois = nova.map((v) => (v === a ? candidato.p : pos(v)));
        const nAntes = newell(antigos); const nDepois = newell(depois);
        const mA = norma(nAntes); const mD = norma(nDepois);
        const qAntes = razao(antigos); const qDepois = razao(depois);
        if (mA > 0 && mD > 0 && dot(nAntes, nDepois) / (mA * mD) < (qAntes >= limite ? 0.5 : 0)) recusa = 'colapso: viraria uma face em volta';
        else if (qAntes >= limite && qDepois < limite) recusa = 'colapso: criaria outra lasca';
        else if (qAntes < limite && qDepois < qAntes * 0.8) recusa = 'colapso: afinaria uma lasca vizinha';
        else { if (qDepois < limite) finasDepoisDoColapso += 1; tentativa.set(fid, nova); }
      }
      if (recusa) { no(recusa); continue; }
      /* o colapso só vale se tira lasca: mover a superfície para deixar a mesma lasca não é limpeza */
      if (!(finasDepoisDoColapso < finasAntesDoColapso)) { no('colapso: não tira lasca'); continue; }
      const desvio = desvioEntreRemendos(antigas.map((fid) => pontos(vs.get(fid))), [...tentativa].map(([, nova]) => nova.map((v) => (v === a ? candidato.p : pos(v)))));
      if (desvio > tolerancia) { no('colapso: a superfície passaria da tolerância'); continue; }
      melhor = { p: candidato.p, custo: Math.max(candidato.custo, desvio) }; novas = tentativa;
      break;
    }
    if (!melhor) return false;
    /* aplicado */
    for (const fid of lista) {
      if (!mesmos.has(fid)) continue;
      for (const v of vs.get(fid)) tirarDe(v, fid);
      vs.delete(fid); facesRemovidas.add(fid); facesMudadas.delete(fid);
      const p = F.get(fid).parte; if (p != null) contagemDeParte.set(p, contagemDeParte.get(p) - 1);
    }
    const planosFundidos = referencia;
    for (const [fid, l] of novas) {
      vs.set(fid, l); facesMudadas.add(fid);
      for (const v of l) poeEm(v, fid);
    }
    vf.delete(b);
    planos.set(a, planosFundidos); planos.delete(b);
    if (melhor.p !== pa) moveu.set(a, melhor.p);
    moveu.delete(b);
    verticesRemovidos.add(b); fusoes.set(b, a);
    desvioMaximo = Math.max(desvioMaximo, melhor.custo);
    colapsos += 1;
    trilha?.push({ tipo: 'colapso', faces: lista, vertices: [a, b], desvio: melhor.custo });
    return true;
  }

  /* ---- a fusão com a vizinha ---- */
  /* a lasca de apice quase sobre a aresta da vizinha entra nela: a vizinha ganha o apice como canto e a lasca some; vale quando a
     vizinha é qualquer polígono, o resultado continua convexo e plano dentro da tolerância e deixa de ser lasca */
  function tentarFusao(fid, k) {
    const l = vs.get(fid); const n = l.length;
    if (!selecionadas.has(fid) || bloqueada(fid) || F.get(fid).quebras?.length) return no('fusão: a face é de fora da seleção, tem tinta ou vinco');
    const a = l[k]; const b = l[(k + 1) % n];
    const { lista, solta } = facesDaAresta(a, b);
    if (solta || lista.length !== 2) return no('fusão: aresta de borda ou não-manifold');
    const g = lista.find((x) => x !== fid);
    const lg = vs.get(g); const m = lg.length;
    if (!selecionadas.has(g) || bloqueada(g) || F.get(g).quebras?.length || !igualAtributos(F.get(fid), F.get(g))) return no('fusão: a vizinha é de fora da seleção ou tem outros atributos');
    const restoF = []; for (let i = 2; i < n; i += 1) restoF.push(l[(k + i) % n]);
    const j = lg.findIndex((v, i) => v === b && lg[(i + 1) % m] === a);
    if (j < 0) return no('fusão: a vizinha percorre a aresta no mesmo sentido');
    const restoG = []; for (let i = 2; i < m; i += 1) restoG.push(lg[(j + i) % m]);
    const junta = [a, ...restoG, b, ...restoF];
    if (new Set(junta).size !== junta.length) return no('fusão: a vizinha já tem o canto da lasca');
    const pg = pontos(lg); const ng = newell(pg); const mg = norma(ng);
    if (!(mg > 0)) return no('fusão: a vizinha não tem área');
    const u = [ng[0] / mg, ng[1] / mg, ng[2] / mg];
    let fora = 0;
    for (const v of restoF) fora = Math.max(fora, Math.abs(dot(u, sub(pos(v), pg[0]))));
    if (fora > tolerancia) return no('fusão: o canto da lasca sai do plano da vizinha além da tolerância');
    const pj = pontos(junta);
    for (let i = 0; i < pj.length; i += 1) {
      const e1 = sub(pj[i], pj[(i + pj.length - 1) % pj.length]); const e2 = sub(pj[(i + 1) % pj.length], pj[i]);
      if (dot(cruz(e1, e2), u) < -1e-9 * norma(e1) * norma(e2)) {
        /* o canto que só recua do vizinho a menos que a tolerância (os cantos de uma face dobrada sobre si mesma, que o corte deixa
           alinhados até o ruído) vale como alinhado: a altura dele sobre a reta dos dois vizinhos é o recuo, e a superfície nova é
           conferida abaixo pelo desvio entre remendos */
        const corda = norma(sub(pj[(i + 1) % pj.length], pj[(i + pj.length - 1) % pj.length]));
        const recuo = corda > 0 ? norma(cruz(e1, e2)) / corda : Infinity;
        if (!(recuo <= tolerancia)) return no('fusão: a face resultante não é convexa');
      }
    }
    /* a face de área abaixo da mínima pode ir para a vizinha mesmo que o resultado siga fino, desde que não fique pior que a vizinha era: o corte
       deixa a fita de cantos alinhados que só a vizinha, também estreita, pode receber */
    const aMinima = areaMinima > 0 && norma(newell(pontos(l))) / 2 < areaMinima;
    if (!(razao(pj) >= limite) && !(aMinima && razao(pj) >= razao(pg) * 0.8)) return no('fusão: a face resultante continua lasca');
    for (const v of l) if (!junta.includes(v)) return no('fusão: canto perdido');
    /* o canto da lasca que a vizinha não tinha passa a ser dela: ela conta entre as faces que ficam em volta dele */
    for (const v of l) { const restam = new Set([...(vf.get(v) ?? [])].filter((x) => x !== fid)); restam.add(g); if (restam.size < 3) return no('fusão: deixaria vértice de valência 2'); }
    const desvioDaFusao = desvioEntreRemendos([pontos(l), pg], [pj]);
    if (desvioDaFusao > tolerancia) return no('fusão: a superfície passaria da tolerância');
    for (const v of l) tirarDe(v, fid);
    vs.delete(fid); facesRemovidas.add(fid); facesMudadas.delete(fid);
    const pt = F.get(fid).parte; if (pt != null) contagemDeParte.set(pt, contagemDeParte.get(pt) - 1);
    vs.set(g, junta); facesMudadas.add(g);
    for (const v of junta) poeEm(v, g);
    desvioMaximo = Math.max(desvioMaximo, desvioDaFusao);
    absorcoes += 1;
    trilha?.push({ tipo: 'absorcao', faces: [fid, g], vertices: [...l], desvio: desvioDaFusao });
    return true;
  }

  const arestasPorTamanho = (fid) => {
    const l = vs.get(fid); const p = pontos(l);
    return l.map((v, k) => ({ k, a: v, b: l[(k + 1) % l.length], c: dist(p[k], p[(k + 1) % l.length]) })).sort((u, v) => u.c - v.c || u.k - v.k);
  };
  const finas = () => {
    const lista = [];
    for (const fid of selecionadas) {
      const l = vs.get(fid);
      if (!l || new Set(l).size !== l.length) continue;
      const r = razao(pontos(l));
      if (r < limite) lista.push({ fid, r });
    }
    return lista.sort((u, v) => u.r - v.r || u.fid - v.fid);
  };

  const recusas = new Map();
  const finasAntes = finas().length;
  for (let passada = 0; passada < passadas; passada += 1) {
    let andou = false;
    for (const { fid } of finas()) {
      if (colapsos + trocas + absorcoes >= maxOperacoes) break;
      if (!vs.has(fid) || !(razao(pontos(vs.get(fid))) < limite)) continue;
      const arestas = arestasPorTamanho(fid);
      let feito = false;
      const recusadas = new Set();
      if (vs.get(fid).length === 3) for (let i = arestas.length - 1; i >= 0 && !feito; i -= 1) { feito = tentarTroca(fid, arestas[i].k); if (!feito) recusadas.add(ultimaRecusa); }
      for (let i = 0; i < arestas.length && !feito; i += 1) { feito = tentarColapso(arestas[i].a, arestas[i].b); if (!feito) recusadas.add(ultimaRecusa); }
      for (let i = arestas.length - 1; i >= 0 && !feito; i -= 1) { feito = tentarFusao(fid, arestas[i].k); if (!feito) recusadas.add(ultimaRecusa); }
      if (feito) { andou = true; recusas.delete(fid); } else recusas.set(fid, [...recusadas].sort());
    }
    if (!andou) break;
  }

  const restantesLista = finas();
  const restantes = restantesLista.map(({ fid, r }) => ({ face: fid, razao: r, arestaCurta: arestasPorTamanho(fid)[0].c, recusas: recusas.get(fid) ?? [] }));

  const facesSaida = new Map();
  for (const fid of facesMudadas) if (vs.has(fid)) facesSaida.set(fid, vs.get(fid));
  return {
    vertices: new Map([...moveu].filter(([v]) => !verticesRemovidos.has(v))),
    verticesRemovidos,
    fusoes: resolverFusoes(fusoes),
    faces: facesSaida,
    facesRemovidas,
    relatorio: { selecionadas: selecionadas.size, finasAntes, finasDepois: restantes.length, colapsos, trocas, absorcoes, desvioMaximo, restantes },
  };
}

/** Cada vértice que sumiu aponta para o que sobrou no fim da cadeia (b→a, depois a→c vira b→c). */
function resolverFusoes(fusoes) {
  const saida = new Map();
  for (const [b] of fusoes) { let a = fusoes.get(b); while (fusoes.has(a)) a = fusoes.get(a); saida.set(b, a); }
  return saida;
}
