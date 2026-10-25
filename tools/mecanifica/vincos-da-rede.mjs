/* vincos-da-rede.mjs — as peças de `vincos-das-linhas.mjs` para a gaiola que sai de `gaiolaPorRede`: as cadeias são as curvas da rede, a
 * declaração de vinco vai na curva, e a linha que nenhuma curva acompanha vira a sugestão de uma curva nova.
 *
 * A rede não tem colunas nem estações: tem curvas nomeadas, nós onde elas se encontram e retalhos que elas fecham. Cada curva é um
 * caminho de arestas da gaiola (os arcos de nó a nó que algum retalho usa), e é essa cadeia que a ferramenta casa com a linha 3D. O vinco da
 * rede é da curva inteira (`vinco` na curva), de modo que a linha que acompanha a curva de ponta a ponta sai como `{ curva, vinco }`, e a que
 * acompanha só um trecho entre nós sai com os nós e o aviso de que a curva precisa ser partida neles para o vinco valer só ali.
 *
 * Quando nenhuma curva acompanha a linha, a sugestão é uma curva nova. A linha é reduzida a pontos-chave a cada `passoDaCurvaMm`; os
 * extremos viram nós em curvas da rede (a curva do lado do retalho mais perto de cada ponta, à fração do comprimento dela, ou o nó que já
 * estiver a até `fundirMm`), e a curva que atravessa o limite entre retalhos ganha um nó na curva que ela cruza. Em cada retalho que a curva
 * nova percorre, a saída diz quais curvas fechariam os dois retalhos em que ele se parte (a lista de lados, na sintaxe de `borda`). O que a
 * rede não consegue fechar (a curva que entra e sai pelo mesmo lado, ou que termina dentro do retalho) sai dito, sem sugestão de retalhos.
 *
 * Para saber como a rede sairia com o vinco declarado (a nitidez pelo ângulo lido, a dobra na malha, a cobertura), a receita é lida de novo com
 * `comAlteracoesNaRede` (`gaiola-captura.js`), que põe o vinco na curva da definição sem escrever na receita. A receita cuja rede é montada
 * uma vez, ao importar o módulo, não se refaz; para ela a ferramenta devolve a sugestão e diz que não pôde verificá-la. */
import { entradaDaReceita } from '../../src/autoria/executar-receita.js';
import { criarResolverNumerico } from '../../procedural/nucleo/expressoes.js';
import { capturarGaiolas, comAlteracoesNaRede } from '../../procedural/nucleo/gaiola-captura.js';
import { gaiolaDoPasso } from '../../procedural/nucleo/operacoes/subdivisao.js';

const MM = 1000;
export const PADROES_DA_REDE = Object.freeze({ passoDaCurvaMm: 60, fundirMm: 10 });
const arred = (x, casas = 2) => { const f = 10 ** casas; const r = Math.round(x * f) / f; return Object.is(r, -0) ? 0 : r; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lerp = (a, b, t) => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])];
const citar = (n) => `'${n}'`;
const emMm = (p) => p.map((x) => arred(x * MM, 1));

/** achaRede(gaiolas, declarados) -> a saída de `gaiolaPorRede` capturada cujos pontos são os declarados do passo, ou null. */
export function achaRede(gaiolas, declarados) {
  return gaiolas.find((g) => g?.fixacao && g.curvas && g.retalhos && g.passo.vertices.length === declarados.length && g.passo.vertices.every((n, k) => n === declarados[k])) ?? null;
}

/** idsDosNos(rede) -> Map nome do ponto -> id do nó, dos nós da rede que são ponto da gaiola. */
export function idsDosNos(rede) {
  const m = new Map();
  for (const c of Object.values(rede.curvas)) c.nos.forEach((id, k) => m.set(c.nosPontos[k], id));
  return m;
}

/**
 * cadeiasDaRede(rede, declarados) -> { porNome, estacoes, cadeias }: uma cadeia por trecho contíguo de arcos usados de cada curva, na ordem
 * das curvas. Cada cadeia traz `nome` (a curva), `pontos` (índices na gaiola), `nomes`, `rotulos` (o id do nó em cada ponto que é nó, ou null)
 * e `toda` (a cadeia é a curva inteira).
 */
export function cadeiasDaRede(rede, declarados) {
  const indice = new Map(declarados.map((d, k) => [d, k]));
  const ids = idsDosNos(rede);
  const cadeias = [];
  for (const [nome, c] of Object.entries(rede.curvas)) {
    const n = c.arcos.length;
    const usado = c.arcos.map((a) => a.pontos !== null);
    if (!usado.some(Boolean)) continue;
    const todos = usado.every(Boolean);
    /* a curva fechada com arco sem uso começa no primeiro arco depois de um sem uso, para o trecho não ser partido ao meio */
    let inicio = 0;
    if (c.fechada && !todos) inicio = usado.findIndex((u, j) => u && !usado[(j + n - 1) % n]);
    const corridas = []; let atual = [];
    for (let j = 0; j < n; j++) {
      const a = c.arcos[(inicio + j) % n];
      if (a.pontos !== null) atual.push(a); else if (atual.length) { corridas.push(atual); atual = []; }
    }
    if (atual.length) corridas.push(atual);
    for (const corrida of corridas) {
      const nomes = [];
      for (const a of corrida) nomes.push(...(nomes.length ? a.pontos.slice(1) : a.pontos));
      cadeias.push({
        indice: cadeias.length, tipo: 'curva', nome, fechada: c.fechada && todos, nomes, pontos: nomes.map((p) => indice.get(p)),
        rotulos: nomes.map((p) => ids.get(p) ?? null), toda: todos && corridas.length === 1,
      });
    }
  }
  return { porNome: true, estacoes: [], cadeias };
}

/**
 * resolverDaRede({ receita, i, rede }) -> (troca) => o que `gaiolaDoPasso` devolve para o passo i com a rede refeita: `troca.vincos` são
 * { curva, nitidez } a pôr nas curvas da definição e `troca.cantos` são nomes de ponto da gaiola, dos quais os que são nós da rede viram
 * canto. Devolve null se a receita não monta a rede ao ser lida (a rede foi montada ao importar o módulo).
 */
export function resolverDaRede({ receita, i, rede }) {
  const ids = idsDosNos(rede);
  return (troca) => {
    const alt = { vincos: {}, cantos: [] };
    for (const v of troca.vincos ?? []) if (v && v.curva) alt.vincos[v.curva] = v.nitidez;
    for (const c of troca.cantos ?? []) if (ids.has(c)) alt.cantos.push(ids.get(c));
    const { resultado: entrada, gaiolas } = capturarGaiolas(() => comAlteracoesNaRede(alt, () => entradaDaReceita(receita)));
    const nova = achaRede(gaiolas, rede.passo.vertices);
    if (!nova) return { erro: ['rede', 'a receita não monta a rede ao ser lida (ela é montada ao importar o módulo), e a ferramenta não pode refazê-la com o vinco'] };
    const dict = { ...entrada.PARAMS, ...entrada.TOPO };
    const { num } = criarResolverNumerico(dict);
    const vec = (a) => (typeof a === 'string' ? dict[a] : a).map(num);
    return gaiolaDoPasso(entrada.PASSOS[i][1], { vec, num });
  };
}

/**
 * verificarSugestao({ receita, sugestao }) -> { monta, ... }: a receita lida de novo com a curva nova, os nós e os retalhos partidos da
 * sugestão, para saber se a rede monta com ela. `monta: false` traz o erro da rede (as divisões que o sistema inteiro não fecha pedem
 * `divisoes` nos retalhos em volta); `monta: null` diz que a receita não monta a rede ao ser lida.
 */
export function verificarSugestao({ receita, sugestao }) {
  if (!receita || !sugestao.fecham?.length || sugestao.avisos?.length) return { monta: null, motivo: 'a sugestão não parte retalho nenhum, ou parte algum de modo que a rede não fecha' };
  const acrescentar = {
    nos: sugestao.nos,
    curvas: [{ nome: sugestao.nome, pontos: sugestao.pontos }],
    retalhos: Object.fromEntries(sugestao.fecham.map((f) => [f.retalho, f.em.map((e) => ({ nome: e.nome, borda: e.borda }))])),
  };
  try {
    const { gaiolas } = capturarGaiolas(() => comAlteracoesNaRede({ acrescentar }, () => entradaDaReceita(receita)));
    const nova = gaiolas.find((g) => g?.curvas?.[sugestao.nome]);
    if (!nova) return { monta: null, motivo: 'a receita não monta a rede ao ser lida (ela é montada ao importar o módulo)' };
    return { monta: true, retalhos: Object.keys(nova.retalhos).length, pontos: nova.passo.vertices.length };
  } catch (e) {
    return { monta: false, erro: String(e.message) };
  }
}

/* ------------------------------------------------------------------ curva nova */

/* A distância de q ao triângulo abc. */
function distanciaAoTriangulo(q, a, b, c) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(q, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return dist(q, a);
  const bp = sub(q, b); const d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return dist(q, b);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return dist(q, lerp(a, b, d1 / (d1 - d3)));
  const cp = sub(q, c); const d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return dist(q, c);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return dist(q, lerp(a, c, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) return dist(q, lerp(b, c, (d4 - d3) / ((d4 - d3) + (d5 - d6))));
  const denom = 1 / (va + vb + vc);
  return dist(q, [a[0] + ab[0] * vb * denom + ac[0] * vc * denom, a[1] + ab[1] * vb * denom + ac[1] * vc * denom, a[2] + ab[2] * vb * denom + ac[2] * vc * denom]);
}

/**
 * sugerirCurvaNova({ rede, declarados, posicoes, amostras, nome, rodadas, minimo, opcoes }) -> { distanciaMm, sugestao, texto }
 * `posicoes` são os pontos declarados da gaiola, em metro, na ordem de `declarados`; `amostras` são os pontos da linha, em metro; `rodadas(rotulos,
 * minimo)` é a que junta os trechos curtos de `vincos-das-linhas.mjs`.
 */
export function sugerirCurvaNova({ rede, declarados, posicoes, amostras, nome, rodadas, minimo, limiarMm, opcoes = {} }) {
  const o = { ...PADROES_DA_REDE, ...opcoes };
  const indice = new Map(declarados.map((d, k) => [d, k]));
  const P = (n) => posicoes[indice.get(n)];
  const nomesDeRetalho = Object.keys(rede.retalhos);
  const dono = new Array(rede.passo.faces.length).fill(-1);
  nomesDeRetalho.forEach((r, j) => { const { faceInicial, faces } = rede.retalhos[r]; for (let f = faceInicial; f < faceInicial + faces; f++) dono[f] = j; });
  const quadros = rede.passo.faces.map((f) => f.map(P));
  const centros = quadros.map((q) => q.reduce((a, p) => [a[0] + p[0] / q.length, a[1] + p[1] / q.length, a[2] + p[2] / q.length], [0, 0, 0]));
  /* o retalho e a distância de cada amostra: a face da gaiola mais perto, entre as oito de centro mais perto */
  const doRetalho = amostras.map((q) => {
    const proximas = centros.map((c, f) => [dist(q, c), f]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, 8);
    let melhor = { d: Infinity, f: -1 };
    for (const [, f] of proximas) {
      const t = quadros[f];
      const d = t.length === 4 ? Math.min(distanciaAoTriangulo(q, t[0], t[1], t[2]), distanciaAoTriangulo(q, t[0], t[2], t[3])) : distanciaAoTriangulo(q, t[0], t[1], t[2]);
      if (d < melhor.d) melhor = { d, f };
    }
    return melhor;
  });
  const longe = doRetalho.map((x) => x.d).sort((a, b) => a - b)[Math.floor((doRetalho.length - 1) / 2)];
  const base = { distanciaMm: { media: arred(doRetalho.reduce((s, x) => s + x.d, 0) / doRetalho.length * MM), maxima: arred(Math.max(...doRetalho.map((x) => x.d)) * MM) } };
  if (longe * MM > Math.max(20, 4 * limiarMm)) return { ...base, sugestao: null, texto: 'a linha passa fora da rede, a mais de 20 mm das faces da gaiola: estenda a rede de curvas até ela' };

  const corridas = rodadas(doRetalho.map((x) => dono[x.f]), minimo);
  const acumulado = [0]; for (let k = 1; k < amostras.length; k++) acumulado.push(acumulado[k - 1] + dist(amostras[k - 1], amostras[k]));
  const L = acumulado[acumulado.length - 1];

  /* o lado do retalho mais perto de q, na poligonal da gaiola */
  const maisPertoNosLados = (retalho, q, preferidas = null) => {
    const bordas = rede.retalhos[retalho].bordas;
    let melhor = null;
    bordas.forEach((l, j) => {
      if (preferidas && !preferidas.has(l.curva)) return;
      const pts = l.pontos.map(P);
      for (let k = 0; k + 1 < pts.length; k++) {
        const ab = sub(pts[k + 1], pts[k]); const l2 = dot(ab, ab);
        const u = l2 > 0 ? Math.min(1, Math.max(0, dot(sub(q, pts[k]), ab) / l2)) : 0;
        const d = dist(q, lerp(pts[k], pts[k + 1], u));
        if (!melhor || d < melhor.d) melhor = { d, j, fracao: l.fracoes[k] + u * (l.fracoes[k + 1] - l.fracoes[k]), k };
      }
    });
    return melhor ?? (preferidas ? maisPertoNosLados(retalho, q, null) : null);
  };
  /* a fração pela poligonal da gaiola tem o erro da corda; o ponto exato da curva refina a vizinhança dela */
  const refinar = (retalho, melhor, q) => {
    const l = rede.retalhos[retalho].bordas[melhor.j];
    const fechada = rede.curvas[l.curva].fechada;
    let f = melhor.fracao; let janela = Math.abs(l.fracoes[melhor.k + 1] - l.fracoes[melhor.k]);
    const lo = Math.min(l.fracoes[0], l.fracoes.at(-1)); const hi = Math.max(l.fracoes[0], l.fracoes.at(-1));
    const noIntervalo = (x) => Math.min(hi, Math.max(lo, x));
    const em = (x) => rede.pontoDaCurva(l.curva, fechada ? x - Math.floor(x) : Math.min(1, Math.max(0, x)));
    for (let volta = 0; volta < 3; volta++) {
      let achado = { d: Infinity, x: f };
      for (let s = -10; s <= 10; s++) { const x = noIntervalo(f + (s / 10) * janela); const d = dist(q, em(x)); if (d < achado.d) achado = { d, x }; }
      f = achado.x; janela /= 5;
    }
    return { j: melhor.j, curva: l.curva, fracao: f, ponto: em(f), d: dist(q, em(f)) };
  };
  const pontoNoLado = (retalho, q, preferidas = null) => refinar(retalho, maisPertoNosLados(retalho, q, preferidas), q);
  /* a ponta da linha segue na direção que tinha até encontrar um lado do retalho; a superfície curva e a reta se afastam com o quadrado da
     distância, e por isso o lado só conta como achado a menos de fundirMm/3 mais 6% do caminho; sem achar, vale o lado mais perto */
  const pontoNaPonta = (retalho, q, direcao) => {
    const bordas = rede.retalhos[retalho].bordas;
    let escolhido = null;
    bordas.forEach((l, j) => {
      let melhor = null;
      for (let t = 0; t <= 0.6; t += 0.002) {
        const qt = [q[0] + direcao[0] * t, q[1] + direcao[1] * t, q[2] + direcao[2] * t];
        const m = maisPertoNosLados(retalho, qt, new Set([l.curva]));
        if (m.j === j && (!melhor || m.d < melhor.m.d)) melhor = { m, t, qt };
      }
      if (melhor && melhor.m.d * MM <= o.fundirMm / 3 + 0.06 * melhor.t * MM && (!escolhido || melhor.t < escolhido.t)) escolhido = melhor;
    });
    if (escolhido) return { ...refinar(retalho, escolhido.m, escolhido.qt), alcanceMm: arred(escolhido.t * MM, 1) };
    return { ...pontoNoLado(retalho, q), alcanceMm: null };
  };
  const direcaoDaPonta = (inicio) => {
    const alvo = Math.min(0.02, L / 3);
    const k = inicio ? 0 : amostras.length - 1; const passoDoIndice = inicio ? 1 : -1;
    let j = k + passoDoIndice;
    while (j + passoDoIndice >= 0 && j + passoDoIndice < amostras.length && Math.abs(acumulado[j] - acumulado[k]) < alvo) j += passoDoIndice;
    const v = sub(amostras[k], amostras[j]); const l = Math.hypot(...v);
    return l > 0 ? v.map((x) => x / l) : [0, 0, 0];
  };

  /* os nós da curva nova: as pontas, e o cruzamento de cada limite entre retalhos */
  const nos = {};
  const nosDaRede = (curva) => rede.curvas[curva].nosPontos.map((nm, k) => ({ id: rede.curvas[curva].nos[k], nome: nm }));
  const noNaCurva = (achado, nomeNovo) => {
    for (const { id, nome: nm } of nosDaRede(achado.curva)) if (dist(achado.ponto, P(nm)) * MM <= o.fundirMm) return { nome: id, existente: true, ponto: P(nm), curva: achado.curva };
    nos[nomeNovo] = { curva: achado.curva, fracao: arred(achado.fracao - (rede.curvas[achado.curva].fechada ? Math.floor(achado.fracao) : 0), 4) };
    return { nome: nomeNovo, existente: false, ponto: achado.ponto, curva: achado.curva };
  };
  const trechos = corridas.map((c) => ({ retalho: nomesDeRetalho[c.c], s0: c.i, s1: c.i + c.n - 1 }));
  let contador = 0;
  const cortes = []; // por trecho: { entrada, saida }
  trechos.forEach((t, k) => {
    const entrada = k === 0
      ? (() => { const a = pontoNaPonta(t.retalho, amostras[t.s0], direcaoDaPonta(true)); return { ...a, no: noNaCurva(a, `${nome}.a`) }; })()
      : cortes[k - 1].saidaDoVizinho;
    let saida; let saidaDoVizinho = null;
    if (k === trechos.length - 1) { const b = pontoNaPonta(t.retalho, amostras[t.s1], direcaoDaPonta(false)); saida = { ...b, no: noNaCurva(b, `${nome}.b`) }; }
    else {
      const seguinte = trechos[k + 1].retalho;
      const comuns = new Set(rede.retalhos[t.retalho].bordas.map((l) => l.curva).filter((cv) => rede.retalhos[seguinte].bordas.some((l) => l.curva === cv)));
      const q = lerp(amostras[t.s1], amostras[trechos[k + 1].s0], 0.5);
      const a = pontoNoLado(t.retalho, q, comuns);
      contador += 1;
      saida = { ...a, no: noNaCurva(a, `${nome}.x${contador}`) };
      /* o mesmo nó, visto do retalho seguinte: o lado dele que tem a mesma curva e contém o ponto */
      const bordasDoSeguinte = rede.retalhos[seguinte].bordas;
      let melhorLado = -1; let dm = Infinity;
      bordasDoSeguinte.forEach((l, j) => {
        if (l.curva !== a.curva) return;
        const lo = Math.min(l.fracoes[0], l.fracoes.at(-1)), hi = Math.max(l.fracoes[0], l.fracoes.at(-1));
        const f = rede.curvas[a.curva].fechada ? a.fracao - Math.floor(a.fracao) : a.fracao;
        const dentro = f >= lo - 1e-6 && f <= hi + 1e-6;
        const d = dentro ? 0 : Math.min(Math.abs(f - lo), Math.abs(f - hi));
        if (d < dm) { dm = d; melhorLado = j; }
      });
      saidaDoVizinho = melhorLado >= 0 ? { ...a, j: melhorLado, no: saida.no } : null;
      if (!saidaDoVizinho) saidaDoVizinho = { ...a, j: -1, no: saida.no };
    }
    cortes.push({ entrada, saida, saidaDoVizinho });
  });

  /* os pontos-chave da curva nova: os nós das pontas e dos cruzamentos, e os pontos da linha entre eles */
  const passo = o.passoDaCurvaMm / MM;
  const n = Math.max(2, Math.round(L / passo));
  const janela = Math.min(passo / 3, 0.015);
  const media = (s) => {
    const dentro = []; for (let k = 0; k < amostras.length; k++) if (Math.abs(acumulado[k] - s) <= janela) dentro.push(amostras[k]);
    if (!dentro.length) { let m = 0; for (let k = 1; k < amostras.length; k++) if (Math.abs(acumulado[k] - s) < Math.abs(acumulado[m] - s)) m = k; return amostras[m]; }
    return dentro.reduce((a, p) => [a[0] + p[0] / dentro.length, a[1] + p[1] / dentro.length, a[2] + p[2] / dentro.length], [0, 0, 0]);
  };
  const nosNaLinha = [];
  cortes.forEach((c, k) => {
    if (k === 0) nosNaLinha.push({ s: -dist(amostras[0], c.entrada.ponto), no: c.entrada.no });
    nosNaLinha.push({ s: k === cortes.length - 1 ? L + dist(amostras.at(-1), c.saida.ponto) : acumulado[trechos[k].s1] + dist(amostras[trechos[k].s1], c.saida.ponto) * 0.5, no: c.saida.no });
  });
  const interiores = [];
  for (let k = 1; k < n; k++) {
    const s = (L * k) / n;
    if (nosNaLinha.some((x) => Math.abs(x.s - s) < 0.4 * passo)) continue;
    interiores.push({ s, ponto: media(s) });
  }
  const sequenciaFinal = [...nosNaLinha.map((x) => ({ s: x.s, no: x.no })), ...interiores.map((x) => ({ s: x.s, ponto: x.ponto }))].sort((a, b) => a.s - b.s);
  const pontosDaCurva = []; const jaCitados = new Set();
  for (const x of sequenciaFinal) {
    if (x.no) { if (jaCitados.has(x.no.nome)) continue; jaCitados.add(x.no.nome); pontosDaCurva.push(x.no.nome); } else pontosDaCurva.push(emMm(x.ponto));
  }

  /* os retalhos que a curva nova fecha */
  const fecham = [];
  const avisos = [];
  trechos.forEach((t, k) => {
    const { entrada, saida } = cortes[k];
    const bordas = rede.retalhos[t.retalho].bordas;
    const m = bordas.length;
    const a = entrada.j; const b = saida.j;
    if (a < 0 || b < 0) { avisos.push(`no retalho ${citar(t.retalho)} a curva cruza ${citar(saida.curva)} num ponto que o retalho seguinte não tem como lado`); return; }
    if (a === b) { avisos.push(`no retalho ${citar(t.retalho)} a curva entra e sai pelo mesmo lado, ${citar(bordas[a].curva)}, e não parte o retalho: um retalho precisa de três lados`); return; }
    /* o lado do retalho vai do canto dele ao seguinte, e pode correr contra a curva; na curva fechada `de` e `ate` valem no sentido da curva,
       e por isso o lado contra a curva sai com os nós trocados */
    const contraACurva = (j) => bordas[j].fracoes.at(-1) < bordas[j].fracoes[0];
    const parte = (j, de, ate) => {
      const a = de ?? bordas[j].de; const b = ate ?? bordas[j].ate;
      return contraACurva(j) ? { curva: bordas[j].curva, de: b, ate: a } : { curva: bordas[j].curva, de: a, ate: b };
    };
    const lado = (j) => parte(j, null, null);
    const nova = (de, ate) => ({ curva: nome, de, ate });
    const peca = (de, ate, nomeDoRetalho) => {
      const lados = [];
      const depoisDe = (j) => (j + 1) % m;
      lados.push(parte(de.j, de.no.nome, null));
      for (let j = depoisDe(de.j); j !== ate.j; j = depoisDe(j)) lados.push(lado(j));
      lados.push(parte(ate.j, null, ate.no.nome));
      lados.push(nova(ate.no.nome, de.no.nome));
      /* o corte num nó que já é ponta do lado deixa um lado sem comprimento, que sai da lista */
      const validos = lados.filter((l) => l.de !== l.ate);
      return { nome: nomeDoRetalho, lados: validos.length, borda: validos };
    };
    const A = { j: a, no: entrada.no }; const B = { j: b, no: saida.no };
    fecham.push({ retalho: t.retalho, em: [peca(A, B, `${t.retalho}_a`), peca(B, A, `${t.retalho}_b`)] });
  });

  const sugestao = {
    tipo: 'curva', nome, pontos: pontosDaCurva, nos,
    entre: [cortes[0].entrada.curva, cortes.at(-1).saida.curva], retalhos: trechos.map((t) => t.retalho),
    ...(trechos.length > 1 ? { cruza: cortes.slice(0, -1).map((c) => c.saida.curva) } : {}),
    fecham, ...(avisos.length ? { avisos } : {}),
  };
  const partidos = fecham.map((f) => citar(f.retalho)).join(', ');
  const texto = fecham.length
    ? `curva nova ${citar(nome)} de ${citar(sugestao.entre[0])} a ${citar(sugestao.entre[1])}, com ${pontosDaCurva.length} pontos-chave, que parte ${fecham.length === 1 ? 'o retalho' : 'os retalhos'} ${partidos} em dois${avisos.length ? `; ${avisos.join('; ')}` : ''}`
    : `curva nova ${citar(nome)} de ${citar(sugestao.entre[0])} a ${citar(sugestao.entre[1])}, com ${pontosDaCurva.length} pontos-chave, que não fecha retalho: ${avisos.join('; ')}`;
  return { ...base, sugestao, texto };
}
