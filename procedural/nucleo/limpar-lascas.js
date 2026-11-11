/* limpar-lascas.js — o cálculo da limpeza de lascas depois de uma booleana: função pura sobre vértices e faces, sem passo, sem Manifold
 * e sem domínio de objeto. A operação `limparLascas` (operacoes/limpar-lascas.js) lê a seleção, chama este cálculo e aplica o resultado.
 *
 * O QUE É UMA LASCA. A mesma medida de `topologia.js`: área da face dividida pelo quadrado da maior aresta, abaixo de `limite`
 * (0,003). A booleana as deixa onde o corte passa a centésimos de milímetro de um vértice da malha ou quase sobre uma aresta dela:
 * um triângulo de uma aresta curta e duas longas (a ponta), ou de três cantos quase alinhados (a lâmina).
 *
 * O QUE ELE FAZ, e só isto, nesta ordem, até nenhuma lasca sair mais:
 *   1. TROCA a diagonal do par de triângulos em volta da aresta maior da lasca, quando o par é quase plano, tem os mesmos atributos
 *      e a troca melhora a pior razão do par (não move vértice nenhum);
 *   2. COLAPSA a aresta curta da lasca (o vértice de menor id fica e recebe a posição de um dos dois ou o meio), quando a aresta é
 *      interior (duas faces), a vizinhança continua uma malha fechada, nenhuma face fica virada, nenhuma face boa vira lasca, nenhuma
 *      parte perde a última face e a posição nova fica a no máximo `tolerancia` dos planos das faces boas que o vértice tinha.
 * Os planos de referência são os da malha DE ENTRADA, e o vértice que absorve o outro herda os dois conjuntos: duas fusões seguidas
 * nunca somam o desvio, e a tolerância vale contra a malha original.
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
const igualAtributos = (f, g) => (f.parte ?? null) === (g.parte ?? null) && (f.material ?? null) === (g.material ?? null) && (f.cor ?? null) === (g.cor ?? null)
  && mesmoLiso(f.liso, g.liso) && (f.solido ?? null) === (g.solido ?? null);

/**
 * @param {{ V: Map<number, number[]>, F: Map<number, { vs: number[], parte?: any, tinta?: any[], quebras?: any[] }> }} malha
 * @param {{ selecao?: Iterable<number>, tolerancia: number, limite?: number, passadas?: number }} opcoes
 *   `selecao`: as faces que podem sumir ou trocar de diagonal (padrão: todas); `tolerancia`: o quanto a superfície pode sair do lugar,
 *   na unidade da malha; `limite`: a razão abaixo da qual a face é lasca (padrão 0,003).
 * @returns {{ vertices: Map<number, number[]>, verticesRemovidos: Set<number>, fusoes: Map<number, number>, faces: Map<number, number[]>, facesRemovidas: Set<number>,
 *   relatorio: { selecionadas: number, finasAntes: number, finasDepois: number, colapsos: number, trocas: number, desvioMaximo: number, restantes: { face: number, razao: number, arestaCurta: number, recusas: string[] }[] } }}
 */
export function limparLascas(malha, { selecao = null, tolerancia, limite = LIMITE_DE_FACE_FINA, passadas = 16 } = {}) {
  if (!(Number.isFinite(tolerancia) && tolerancia > 0)) throw new Error('limparLascas: a tolerância é um número positivo, na unidade da malha');
  if (!(Number.isFinite(limite) && limite > 0 && limite < 0.5)) throw new Error('limparLascas: o limite de lasca é um número entre 0 e 0,5');
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
    if (r === undefined) { r = razaoDeFace(F.get(fid).vs.map((v) => V.get(v))); razaoOriginal.set(fid, r); }
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
    const desvio = distanciaEntreRetas(pa, pb, pc, pd);
    if (desvio > tolerancia) return no('troca: o par não é plano dentro da tolerância');
    const antes = Math.min(razaoDeFace([pa, pb, pc]), razaoDeFace([pb, pa, pd]));
    const depois = Math.min(razaoDeFace([pa, pd, pc]), razaoDeFace([pd, pb, pc]));
    const finasDe = (...q) => q.filter((r) => r < limite).length;
    const finasAntesDaTroca = finasDe(razaoDeFace([pa, pb, pc]), razaoDeFace([pb, pa, pd]));
    const finasDepoisDaTroca = finasDe(razaoDeFace([pa, pd, pc]), razaoDeFace([pd, pb, pc]));
    if (!(finasDepoisDaTroca < finasAntesDaTroca && depois > antes * 1.05 + EPS)) return no('troca: não melhora');
    vs.set(f1, [a, d, c]); vs.set(f2, [d, b, c]);
    tirarDe(b, f1); tirarDe(a, f2); poeEm(d, f1); poeEm(c, f2);
    facesMudadas.add(f1); facesMudadas.add(f2);
    desvioMaximo = Math.max(desvioMaximo, desvio);
    trocas += 1;
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

    /* a posição: o ponto que menos se afasta dos planos das faces boas (a ordem decide o empate) */
    const referencia = uniao(a, b);
    const pa = pos(a); const pb = pos(b);
    const candidatos = [pa, pb, [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2]];
    let melhor = null;
    for (const p of candidatos) {
      const custo = referencia.length ? custoEm(referencia, p) : Math.max(dist(p, pa), dist(p, pb));
      if (melhor === null || custo < melhor.custo - 1e-15) melhor = { p, custo };
    }
    if (melhor.custo > tolerancia) return no('colapso: passaria da tolerância');
    /* a vizinhança depois da fusão: nenhuma face vira, nenhuma face boa vira lasca, nenhuma lasca piora */
    const novas = new Map();
    let finasAntesDoColapso = 0; let finasDepoisDoColapso = 0;
    for (const fid of doVertice) {
      const l = vs.get(fid);
      const antigos = pontos(l);
      if (razaoDeFace(antigos) < limite) finasAntesDoColapso += 1;
      if (mesmos.has(fid)) continue;
      const lista = [];
      for (const v of l) { const w = v === b ? a : v; if (lista[lista.length - 1] !== w) lista.push(w); }
      if (lista.length > 1 && lista[0] === lista[lista.length - 1]) lista.pop();
      if (lista.length < 3 || new Set(lista).size !== lista.length) return no('colapso: uma face em volta degeneraria');
      const depois = lista.map((v) => (v === a ? melhor.p : pos(v)));
      const nAntes = newell(antigos); const nDepois = newell(depois);
      const mA = norma(nAntes); const mD = norma(nDepois);
      const qAntes = razaoDeFace(antigos); const qDepois = razaoDeFace(depois);
      if (mA > 0 && mD > 0 && dot(nAntes, nDepois) / (mA * mD) < (qAntes >= limite ? 0.5 : 0)) return no('colapso: viraria uma face em volta');
      if (qAntes >= limite && qDepois < limite) return no('colapso: criaria outra lasca');
      if (qAntes < limite && qDepois < qAntes * 0.8) return no('colapso: afinaria uma lasca vizinha');
      if (qDepois < limite) finasDepoisDoColapso += 1;
      novas.set(fid, lista);
    }
    /* o colapso só vale se tira lasca: mover a superfície para deixar a mesma lasca não é limpeza */
    if (!(finasDepoisDoColapso < finasAntesDoColapso)) return no('colapso: não tira lasca');
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
      if (dot(cruz(e1, e2), u) < -1e-9 * norma(e1) * norma(e2)) return no('fusão: a face resultante não é convexa');
    }
    if (!(razaoDeFace(pj) >= limite)) return no('fusão: a face resultante continua lasca');
    for (const v of l) if (!junta.includes(v)) return no('fusão: canto perdido');
    for (const v of l) { let restam = 0; for (const x of vf.get(v) ?? []) if (x !== fid) restam += 1; if (restam < 3) return no('fusão: deixaria vértice de valência 2'); }
    for (const v of l) tirarDe(v, fid);
    vs.delete(fid); facesRemovidas.add(fid); facesMudadas.delete(fid);
    const pt = F.get(fid).parte; if (pt != null) contagemDeParte.set(pt, contagemDeParte.get(pt) - 1);
    vs.set(g, junta); facesMudadas.add(g);
    for (const v of junta) poeEm(v, g);
    desvioMaximo = Math.max(desvioMaximo, fora);
    absorcoes += 1;
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
      const r = razaoDeFace(pontos(l));
      if (r < limite) lista.push({ fid, r });
    }
    return lista.sort((u, v) => u.r - v.r || u.fid - v.fid);
  };

  const recusas = new Map();
  const finasAntes = finas().length;
  for (let passada = 0; passada < passadas; passada += 1) {
    let andou = false;
    for (const { fid } of finas()) {
      if (!vs.has(fid) || !(razaoDeFace(pontos(vs.get(fid))) < limite)) continue;
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
