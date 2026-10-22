/* gaiola-interpolada.js — estações interpoladas e colunas por curva de seção, opções da gaiola por estações
 *
 * Função pura, sem Three.js e sem domínio. `gaiolaPorEstacoes` chama `expandirEstacoes` quando a definição declara
 * `interpolar` ou `curvas`, e recebe de volta estações comuns, com todas as colunas escritas; sem as duas opções, nada
 * aqui roda e a saída do ajudante é a de antes, byte a byte.
 *
 * curvas: [{ nome, colunas: [{ nome, fracao }] }] declara uma curva de seção e as colunas que saem dela, cada uma a uma
 *         fração fixa do comprimento da curva, de 0 a 1, em ordem crescente. Na estação, a entrada
 *         { curva: nome, pontos: [[u, v] ou [u, v, w], ...] } da lista de colunas vira essas colunas, na ordem, com os
 *         pontos-chave daquela estação; colunas declaradas antes e depois dela continuam onde estão.
 *         A curva é a Catmull-Rom centrípeta pelos pontos-chave, com um ponto fantasma refletido em cada ponta. Ela
 *         passa por todos os pontos-chave, cada ponto mexe só os dois trechos de cada lado, e o parâmetro centrípeto
 *         (o nó anda a raiz da distância entre pontos) é o único da família que não faz laço nem bico dentro de um
 *         trecho (Yuksel, Schaefer e Keyser, 2011); a uniforme faz laço quando um trecho curto fica entre dois longos, e
 *         a spline natural ou a cordal passam longe dos pontos quando o espaçamento varia. O comprimento sai da
 *         poligonal de 64 amostras por trecho, e a fração cai pelo comprimento, de modo que as colunas ficam igualmente
 *         espaçadas ao longo da curva e não se amontoam onde os pontos-chave se juntam, como sobre um arco.
 *
 * interpolar: { passo? } declara que a estação sem `colunas`, { nome, em }, é interpolada: cada coluna dela sai da
 *         interpolação monótona (PCHIP de Fritsch e Carlson, com as derivadas pela média harmônica ponderada das
 *         secantes, zero no extremo e limitadas a três vezes a secante na ponta) das coordenadas [u, v, w] da coluna nas
 *         estações-chave, as que declaram colunas. Num intervalo entre duas chaves a curva de cada coordenada fica entre
 *         os valores das duas pontas, porque a derivada nunca troca de sinal com a secante nem passa de três vezes ela; a
 *         interpolação não ultrapassa os nós e não ondula entre cortes. Com `passo`, o ajudante gera as estações que
 *         faltam entre duas estações declaradas vizinhas, dividindo o intervalo em partes iguais de no máximo `passo`, e
 *         gradua: o intervalo que passa do dobro de um vizinho se divide ao meio até caber. A estação gerada se chama
 *         `${anterior}_${k}`, com a última estação declarada antes dela e a ordem a partir dali; como esse nome depende
 *         do passo, ele não é identidade, e cantos, medidas, vincos, vãos e regiões não o citam.
 *         Entre as chaves A e B, a estação interpolada leva as colunas de A que se ligam a B (pelo nome, ou porque uma
 *         coluna de B as cita em `de`), com o nome de A; a fusão, a divisão e a coluna que começa ficam em B, e a coluna
 *         de A que não chega a B termina logo depois de A. Os nós da interpolação seguem a coluna pelas chaves de antes
 *         e de depois enquanto a ligação é de um para um; na fusão e na divisão, o nó é a média das colunas ligadas. A
 *         interpolação não extrapola, não entra numa região e não vale no eixo fechado. */

const AMOSTRAS_POR_TRECHO = 64;

const citar = (n) => `'${n}'`;
const lista = (nomes) => nomes.map(citar).join(', ');
function falha(texto) { throw new TypeError(`gaiola por estações: ${texto}`); }

function exigirCampos(objeto, permitidos, onde) {
  if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) falha(`${onde} precisa ser objeto`);
  const extra = Object.keys(objeto).filter((k) => !permitidos.includes(k));
  if (extra.length) falha(`${onde} tem campo desconhecido ${lista(extra)}; os campos são ${permitidos.join(', ')}`);
}

/* ---------------------------------------------------------------- PCHIP */

/** derivadasPchip(x, y) -> as derivadas nos nós da interpolação monótona de Fritsch e Carlson, na forma do PchipInterpolator. */
export function derivadasPchip(x, y) {
  const n = x.length; const h = [], m = [];
  for (let k = 0; k + 1 < n; k++) { h.push(x[k + 1] - x[k]); m.push((y[k + 1] - y[k]) / h[k]); }
  if (n === 2) return [m[0], m[0]];
  const d = new Array(n).fill(0);
  for (let k = 1; k + 1 < n; k++) {
    if (!(m[k - 1] * m[k] > 0)) continue;
    const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1];
    d[k] = (w1 + w2) / (w1 / m[k - 1] + w2 / m[k]);
  }
  const ponta = (h0, h1, m0, m1) => {
    const d0 = ((2 * h0 + h1) * m0 - h0 * m1) / (h0 + h1);
    if (Math.sign(d0) !== Math.sign(m0)) return 0;
    if (Math.sign(m0) !== Math.sign(m1) && Math.abs(d0) > Math.abs(3 * m0)) return 3 * m0;
    return d0;
  };
  d[0] = ponta(h[0], h[1], m[0], m[1]);
  d[n - 1] = ponta(h[n - 2], h[n - 3], m[n - 2], m[n - 3]);
  return d;
}

/** pchip(x, y) -> t => valor: a interpolação monótona pelos nós (x crescente), sem extrapolar. */
export function pchip(x, y) {
  if (x.length < 2 || x.length !== y.length) throw new TypeError('pchip: precisa de dois ou mais nós, com x e y do mesmo tamanho');
  for (let k = 1; k < x.length; k++) if (!(x[k] > x[k - 1])) throw new TypeError('pchip: x precisa ser crescente');
  const d = derivadasPchip(x, y);
  return (t) => {
    if (!(t >= x[0] && t <= x[x.length - 1])) throw new TypeError(`pchip: ${t} fica fora dos nós, de ${x[0]} a ${x[x.length - 1]}`);
    let k = 0;
    while (k < x.length - 2 && t > x[k + 1]) k++;
    const h = x[k + 1] - x[k], s = (t - x[k]) / h;
    if (s === 0) return y[k];
    if (s === 1) return y[k + 1];
    /* a forma com a diferença dá o valor exato no intervalo plano; o corte nas pontas, que na aritmética exata não
       muda nada, tira o arredondamento que passaria do nó por um ulp */
    const h10 = s * (1 - s) * (1 - s), h01 = s * s * (3 - 2 * s), h11 = s * s * (s - 1);
    const v = y[k] + (y[k + 1] - y[k]) * h01 + h * (d[k] * h10 + d[k + 1] * h11);
    return Math.min(Math.max(v, Math.min(y[k], y[k + 1])), Math.max(y[k], y[k + 1]));
  };
}

/* ------------------------------------------------- Catmull-Rom centrípeta */

const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const norma = (u) => Math.hypot(u[0], u[1], u[2]);
const mistura = (p, q, a, b, t) => { const f = (t - a) / (b - a); return [p[0] + f * (q[0] - p[0]), p[1] + f * (q[1] - p[1]), p[2] + f * (q[2] - p[2])]; };

/**
 * curvaCentripeta(pontos, nome?) -> { ponto(trecho, s), comprimento, naFracao(f), trechos }
 * A Catmull-Rom centrípeta pelos pontos-chave ([u, v] ou [u, v, w]); `ponto` avalia o trecho no parâmetro s de 0 a 1,
 * e `naFracao` dá o ponto à fração f do comprimento.
 */
export function curvaCentripeta(pontos, nome = 'curva') {
  if (!Array.isArray(pontos) || pontos.length < 2) falha(`a curva ${citar(nome)} precisa de dois ou mais pontos-chave`);
  const P = pontos.map((p, i) => {
    if (!Array.isArray(p) || (p.length !== 2 && p.length !== 3) || p.some((x) => typeof x !== 'number' || !Number.isFinite(x))) falha(`o ${i + 1}º ponto-chave da curva ${citar(nome)} precisa ser [u, v] ou [u, v, w] finitos`);
    return [p[0], p[1], p[2] ?? 0];
  });
  const n = P.length;
  for (let i = 0; i + 1 < n; i++) if (!(norma(sub(P[i + 1], P[i])) > 0)) falha(`a curva ${citar(nome)} repete o ponto-chave: o ${i + 1}º e o ${i + 2}º são iguais`);
  const antes = sub([2 * P[0][0], 2 * P[0][1], 2 * P[0][2]], P[1]);
  const depois = sub([2 * P[n - 1][0], 2 * P[n - 1][1], 2 * P[n - 1][2]], P[n - 2]);
  const Q = [antes, ...P, depois];
  const t = [0];
  for (let i = 1; i < Q.length; i++) t.push(t[i - 1] + Math.sqrt(norma(sub(Q[i], Q[i - 1]))));
  /* trecho i, de P[i] a P[i+1], usa Q[i..i+3]; Barry e Goldman */
  const ponto = (i, s) => {
    if (s <= 0) return [...P[i]];
    if (s >= 1) return [...P[i + 1]];
    const [t0, t1, t2, t3] = [t[i], t[i + 1], t[i + 2], t[i + 3]];
    const u = t1 + s * (t2 - t1);
    const A1 = mistura(Q[i], Q[i + 1], t0, t1, u), A2 = mistura(Q[i + 1], Q[i + 2], t1, t2, u), A3 = mistura(Q[i + 2], Q[i + 3], t2, t3, u);
    const B1 = mistura(A1, A2, t0, t2, u), B2 = mistura(A2, A3, t1, t3, u);
    return mistura(B1, B2, t1, t2, u);
  };
  const trechos = n - 1;
  const acum = [0]; const params = [[0, 0]];
  let anterior = P[0];
  for (let i = 0; i < trechos; i++) {
    for (let k = 1; k <= AMOSTRAS_POR_TRECHO; k++) {
      const q = ponto(i, k / AMOSTRAS_POR_TRECHO);
      acum.push(acum[acum.length - 1] + norma(sub(q, anterior))); params.push([i, k / AMOSTRAS_POR_TRECHO]);
      anterior = q;
    }
  }
  const comprimento = acum[acum.length - 1];
  const naFracao = (f) => {
    if (f <= 0) return [...P[0]];
    if (f >= 1) return [...P[n - 1]];
    const alvo = f * comprimento;
    let lo = 0, hi = acum.length - 1;
    while (hi - lo > 1) { const meio = (lo + hi) >> 1; if (acum[meio] < alvo) lo = meio; else hi = meio; }
    const a = (alvo - acum[lo]) / (acum[hi] - acum[lo]);
    const [i1, s1] = params[hi]; const s0 = params[lo][0] === i1 ? params[lo][1] : 0;
    return ponto(i1, s0 + a * (s1 - s0));
  };
  return { ponto, comprimento, naFracao, trechos };
}

/* ------------------------------------------------------------- curvas */

function lerCurvas(curvas) {
  const porNome = new Map();
  if (curvas == null) return porNome;
  if (!Array.isArray(curvas)) falha('curvas precisa ser lista de { nome, colunas: [{ nome, fracao }] }');
  for (const [n, c] of curvas.entries()) {
    exigirCampos(c, ['nome', 'colunas'], `a curva ${n}`);
    if (typeof c.nome !== 'string' || !c.nome) falha(`a curva ${n} precisa de nome (texto não vazio)`);
    if (porNome.has(c.nome)) falha(`o nome de curva ${citar(c.nome)} aparece mais de uma vez`);
    if (!Array.isArray(c.colunas) || !c.colunas.length) falha(`a curva ${citar(c.nome)} precisa de colunas: lista de { nome, fracao }`);
    const nomes = new Set(); let antes = -Infinity;
    const colunas = c.colunas.map((col, j) => {
      exigirCampos(col, ['nome', 'fracao'], `a coluna ${j} da curva ${citar(c.nome)}`);
      if (typeof col.nome !== 'string' || !col.nome) falha(`a coluna ${j} da curva ${citar(c.nome)} precisa de nome (texto não vazio)`);
      if (nomes.has(col.nome)) falha(`a coluna ${citar(col.nome)} aparece mais de uma vez na curva ${citar(c.nome)}`);
      nomes.add(col.nome);
      if (typeof col.fracao !== 'number' || !(col.fracao >= 0 && col.fracao <= 1)) falha(`a coluna ${citar(col.nome)} da curva ${citar(c.nome)} precisa de fracao de 0 a 1`);
      if (!(col.fracao > antes)) falha(`as colunas da curva ${citar(c.nome)} vêm em fração crescente, e ${citar(col.nome)} (${col.fracao}) não passa da anterior (${antes})`);
      antes = col.fracao;
      return { nome: col.nome, fracao: col.fracao };
    });
    porNome.set(c.nome, { nome: c.nome, colunas });
  }
  return porNome;
}

/* A chave de uma coluna numa estação, para o mapa de origens. */
export const chaveDaColuna = (estacao, coluna) => `${estacao}\u0000${coluna}`;

/* A lista de colunas da estação com cada entrada de curva trocada pelas colunas dela. Cada coluna que sai de uma curva
   entra em `origens` com a curva, a fração e os pontos-chave da estação. */
function expandirColunas(estacao, curvas, origens) {
  return estacao.colunas.flatMap((c, j) => {
    if (!c || typeof c !== 'object' || !('curva' in c)) return [c];
    exigirCampos(c, ['curva', 'pontos'], `a curva da coluna ${j} da estação ${citar(estacao.nome)}`);
    const C = curvas.get(c.curva);
    if (!C) falha(`a estação ${citar(estacao.nome)} usa a curva ${citar(c.curva)}, que não está em curvas`);
    const curva = curvaCentripeta(c.pontos, `${c.curva}' da estação '${estacao.nome}`);
    const tres = c.pontos.some((p) => Array.isArray(p) && p.length === 3);
    return C.colunas.map((col) => {
      const p = curva.naFracao(col.fracao);
      origens.set(chaveDaColuna(estacao.nome, col.nome), { tipo: 'curva', curva: c.curva, estacao: estacao.nome, coluna: col.nome, fracao: col.fracao, pontosChave: c.pontos.map((q) => [...q]) });
      return { nome: col.nome, em: tres ? p : [p[0], p[1]] };
    });
  });
}

const EIXOS_LOCAIS = ['u', 'v', 'w'];

/**
 * entradasDaDefinicao(estacoes) -> as entradas editáveis da gaiola, na ordem das estações e das colunas declaradas: cada
 * coordenada local [u, v, w] de uma coluna declarada ({ id: 'estacao/coluna.u', ... }) e de cada ponto-chave de uma curva de
 * seção ({ id: 'estacao/curva[k].u', ... }). A estação sem colunas (interpolada) e a que a interpolação gera não têm
 * entrada: os pontos delas saem das chaves.
 */
export function entradasDaDefinicao(estacoes) {
  const entradas = [];
  for (const e of estacoes) {
    if (!Array.isArray(e?.colunas)) continue;
    for (const c of e.colunas) {
      if (c && typeof c === 'object' && 'curva' in c) {
        (c.pontos ?? []).forEach((p, k) => p.forEach((valor, q) => entradas.push({ id: `${e.nome}/${c.curva}[${k}].${EIXOS_LOCAIS[q]}`, tipo: 'curva', estacao: e.nome, alvo: c.curva, pontoChave: k, eixo: EIXOS_LOCAIS[q], valor })));
      } else if (c && typeof c === 'object' && Array.isArray(c.em)) {
        c.em.forEach((valor, q) => entradas.push({ id: `${e.nome}/${c.nome}.${EIXOS_LOCAIS[q]}`, tipo: 'coluna', estacao: e.nome, alvo: c.nome, eixo: EIXOS_LOCAIS[q], valor }));
      }
    }
  }
  return entradas;
}

/* ---------------------------------------------------------- interpolar */

function local(c, estacao) {
  const p = c.em;
  if (!Array.isArray(p) || (p.length !== 2 && p.length !== 3) || p.some((x) => typeof x !== 'number' || !Number.isFinite(x))) falha(`a coluna ${citar(c.nome)} da estação ${citar(estacao)} precisa de em: [u, v] ou [u, v, w] finitos`);
  return [p[0], p[1], p[2] ?? 0];
}
const media = (cols, estacao) => { const s = [0, 0, 0]; for (const c of cols) { const p = local(c, estacao); s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; } return s.map((x) => x / cols.length); };

/* As colunas de B ligadas à coluna `nome` de A: as que a citam em `de`, e a de mesmo nome sem `de` que não começa ali. */
function ligadas(B, nome) {
  return B.colunas.filter((b) => (b.de != null ? Array.isArray(b.de) && b.de.includes(nome) : b.nome === nome && b.comeca !== true));
}

/* Os nós (em, [u, v, w]) da coluna `nome` de keys[i] até a sua ligação em keys[i + 1], estendidos pelas chaves de antes
   e de depois enquanto a ligação é de um para um. Cada nó leva, em terceiro, o nome da estação-chave de onde veio. */
function nosDaColuna(keys, i, nome) {
  const A = keys[i], B = keys[i + 1];
  const colA = A.colunas.find((c) => c.nome === nome);
  const alvo = ligadas(B, nome);
  const nos = [[A.em, local(colA, A.nome), A.nome], [B.em, media(alvo, B.nome), B.nome]];
  /* para trás */
  let atual = colA;
  for (let j = i; j > 0 && atual; j--) {
    const K = keys[j - 1];
    const pais = atual.de != null ? K.colunas.filter((c) => Array.isArray(atual.de) && atual.de.includes(c.nome)) : (atual.comeca === true ? [] : K.colunas.filter((c) => c.nome === atual.nome));
    if (!pais.length || pais.some((c) => c.termina === true)) break;
    nos.unshift([K.em, media(pais, K.nome), K.nome]);
    atual = pais.length === 1 ? pais[0] : null;
  }
  /* para frente */
  atual = alvo.length === 1 ? alvo[0] : null;
  for (let j = i + 1; j + 1 < keys.length && atual && atual.termina !== true; j++) {
    const filhos = ligadas(keys[j + 1], atual.nome);
    if (!filhos.length) break;
    nos.push([keys[j + 1].em, media(filhos, keys[j + 1].nome), keys[j + 1].nome]);
    atual = filhos.length === 1 ? filhos[0] : null;
  }
  return nos;
}

function lerInterpolar(interpolar, fechada) {
  exigirCampos(interpolar, ['passo'], 'interpolar');
  if (fechada) falha('interpolar não vale no eixo fechado: a interpolação não atravessa o fechamento do anel');
  const passo = interpolar.passo ?? null;
  if (passo !== null && !(typeof passo === 'number' && Number.isFinite(passo) && passo > 0)) falha(`interpolar.passo é ${passo}; precisa ser número finito maior que zero, no mesmo sentido de em`);
  return { passo };
}

/* Os intervalos (k, k + 1) entre estações declaradas que podem receber estações geradas: as duas inteiras e fora de
   toda região. */
function intervalosLivres(declaradas, regioes) {
  const indice = new Map(declaradas.map((e, k) => [e.nome, k]));
  const faixas = [];
  for (const R of regioes ?? []) {
    const i0 = indice.get(R?.estacoes?.[0]), i1 = indice.get(R?.estacoes?.[1]);
    if (i0 != null && i1 != null) faixas.push([i0, i1, R.nome]);
  }
  return { faixas, livre: (k) => declaradas[k].regiao == null && declaradas[k + 1].regiao == null && !faixas.some(([a, b]) => k >= a && k + 1 <= b) };
}

/* As posições das estações geradas em cada intervalo livre, com a graduação. */
function gerarPosicoes(declaradas, livre, passo) {
  const seq = declaradas.map((e, k) => ({ em: e.em, declarada: k }));
  const todas = [];
  for (let k = 0; k < seq.length; k++) {
    todas.push(seq[k]);
    if (k + 1 === seq.length || !livre(k)) continue;
    const a = seq[k].em, b = seq[k + 1].em;
    const n = Math.ceil((b - a) / passo - 1e-9);
    for (let j = 1; j < n; j++) todas.push({ em: a + (b - a) * j / n, dono: k });
  }
  const livreEntre = (p, q) => {
    const k = p.declarada ?? p.dono;
    return livre(k) && (q.declarada === undefined || q.declarada === k + 1);
  };
  for (let dividiu = true; dividiu;) {
    dividiu = false;
    for (let k = 0; k + 1 < todas.length && !dividiu; k++) {
      const largura = todas[k + 1].em - todas[k].em;
      const vizinhos = [k > 0 ? todas[k].em - todas[k - 1].em : Infinity, k + 2 < todas.length ? todas[k + 2].em - todas[k + 1].em : Infinity];
      if (largura > 2 * Math.min(...vizinhos) * (1 + 1e-9) && livreEntre(todas[k], todas[k + 1])) {
        todas.splice(k + 1, 0, { em: (todas[k].em + todas[k + 1].em) / 2, dono: todas[k].declarada ?? todas[k].dono });
        dividiu = true;
      }
    }
  }
  return todas;
}

/**
 * expandirEstacoes(estacoes, { interpolar, curvas, regioes, fechada })
 *   -> { estacoes, tipos: Map nome -> 'chave' | 'interpolada' | 'gerada' | 'parcial', chaves: Set, geradas: Set,
 *        origens: Map chaveDaColuna(estacao, coluna) -> origem }
 * As estações de volta são comuns: cada uma com `colunas` escritas, que `gaiolaPorEstacoes` lê como sempre. `origens`
 * guarda, das colunas que não são entrada declarada, de onde vieram: { tipo: 'curva', curva, estacao, coluna, fracao,
 * pontosChave } para a coluna amostrada numa curva de seção, e { tipo: 'gerada' ou 'interpolada', estacao, coluna,
 * chaves: [A, B], fracao, nos } para a coluna de uma estação que a interpolação preencheu, com as duas chaves que a
 * cercam, a fração do intervalo e as estações-chave que servem de nó à interpolação da coluna.
 */
export function expandirEstacoes(estacoes, { interpolar, curvas, regioes, fechada }) {
  const C = lerCurvas(curvas);
  const origens = new Map();
  const opcao = interpolar == null ? null : lerInterpolar(interpolar, fechada);
  if (!Array.isArray(estacoes) || estacoes.length < 2) falha('estacoes precisa ser lista de duas ou mais estações');
  const declaradas = estacoes.map((e, k) => {
    if (!e || typeof e !== 'object' || Array.isArray(e)) falha(`a estação ${k} precisa ser objeto`);
    if (e.colunas == null) {
      if (!opcao) falha(`a estação ${citar(e.nome)} não tem colunas; declare as colunas, ou interpolar para que elas saiam das estações-chave`);
      if (e.regiao != null) falha(`a estação ${citar(e.nome)} é da região ${citar(e.regiao)} e não tem colunas; a interpolação não entra numa região`);
      return { ...e, interpolada: true };
    }
    if (!Array.isArray(e.colunas)) return e;
    return { ...e, colunas: expandirColunas(e, C, origens) };
  });
  if (!opcao) return { estacoes: declaradas, tipos: new Map(declaradas.map((e) => [e.nome, e.regiao != null ? 'parcial' : 'chave'])), chaves: new Set(declaradas.filter((e) => e.regiao == null).map((e) => e.nome)), geradas: new Set(), origens };

  for (const [k, e] of declaradas.entries()) {
    if (typeof e.em !== 'number' || !Number.isFinite(e.em)) falha(`a estação ${citar(e.nome)} precisa de em: posição finita`);
    if (k > 0 && !(e.em > declaradas[k - 1].em)) falha(`as estações vêm em ordem crescente de em, e ${citar(e.nome)} (${e.em}) não passa de ${citar(declaradas[k - 1].nome)} (${declaradas[k - 1].em})`);
  }
  const { faixas, livre } = intervalosLivres(declaradas, regioes);
  for (const [k, e] of declaradas.entries()) {
    if (!e.interpolada) continue;
    const dentro = faixas.find(([a, b]) => k > a && k < b);
    if (dentro) falha(`a estação ${citar(e.nome)} é interpolada e fica dentro da região ${citar(dentro[2])}; a interpolação não entra numa região`);
  }

  /* as posições, com as geradas */
  const todas = opcao.passo === null ? declaradas.map((e, k) => ({ em: e.em, declarada: k })) : gerarPosicoes(declaradas, livre, opcao.passo);
  const nomes = new Set(declaradas.map((e) => e.nome));
  const contagem = new Map();
  const seq = todas.map((p) => {
    if (p.declarada !== undefined) return declaradas[p.declarada];
    const dono = declaradas[p.dono].nome; const k = (contagem.get(dono) ?? 0) + 1; contagem.set(dono, k);
    const nome = `${dono}_${k}`;
    if (nomes.has(nome)) falha(`a estação gerada ${citar(nome)}, a ${k}ª depois de ${citar(dono)}, tem o nome de uma estação declarada; renomeie a declarada`);
    return { nome, em: p.em, interpolada: true, gerada: true };
  });

  /* as chaves e as colunas de cada estação interpolada */
  const keys = seq.filter((e) => !e.interpolada && e.regiao == null);
  if (keys.length < 2) falha('interpolar precisa de duas ou mais estações-chave, as que declaram colunas fora de região');
  const tipos = new Map(); const geradas = new Set();
  let i = -1;
  const saida = seq.map((e) => {
    if (!e.interpolada) {
      if (e.regiao == null) i += 1;
      tipos.set(e.nome, e.regiao != null ? 'parcial' : 'chave');
      return e;
    }
    tipos.set(e.nome, e.gerada ? 'gerada' : 'interpolada');
    if (e.gerada) geradas.add(e.nome);
    if (i < 0 || i + 1 >= keys.length) falha(`a estação ${citar(e.nome)} é interpolada e fica ${i < 0 ? 'antes da primeira' : 'depois da última'} estação-chave; a interpolação não extrapola`);
    const A = keys[i], B = keys[i + 1];
    const entre = seq.slice(seq.indexOf(A) + 1, seq.indexOf(B));
    const parcial = entre.find((x) => x.regiao != null);
    if (parcial) falha(`a estação ${citar(e.nome)} é interpolada entre as chaves ${citar(A.nome)} e ${citar(B.nome)}, e a estação parcial ${citar(parcial.nome)} fica no mesmo intervalo; a interpolação não entra numa região`);
    const colunas = A.colunas.filter((c) => c.termina !== true && ligadas(B, c.nome).length).map((c) => {
      const nos = nosDaColuna(keys, i, c.nome);
      const x = nos.map(([em]) => em);
      const valor = [0, 1, 2].map((q) => pchip(x, nos.map(([, p]) => p[q]))(e.em));
      origens.set(chaveDaColuna(e.nome, c.nome), { tipo: e.gerada ? 'gerada' : 'interpolada', estacao: e.nome, coluna: c.nome, chaves: [A.nome, B.nome], fracao: (e.em - A.em) / (B.em - A.em), nos: nos.map(([, , n]) => n) });
      return { nome: c.nome, em: valor };
    });
    if (colunas.length < 2) falha(`a estação ${citar(e.nome)} é interpolada entre as chaves ${citar(A.nome)} e ${citar(B.nome)}, mas só ${colunas.length} coluna liga as duas; ligue as colunas por nome ou por de`);
    const { interpolada, gerada, ...resto } = e;
    return { ...resto, colunas };
  });
  return { estacoes: saida, tipos, chaves: new Set(keys.map((e) => e.nome)), geradas, origens };
}
