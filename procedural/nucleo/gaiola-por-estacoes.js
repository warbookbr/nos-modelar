/* gaiola-por-estacoes.js — monta a gaiola da operação `subdivisao` a partir de estações e colunas nomeadas
 *
 * Função pura, sem Three.js e sem domínio: recebe estações nomeadas ao longo de um eixo, cada uma com as suas colunas
 * nomeadas em ordem, e devolve os pontos, as faces, os vincos, os cantos e as medidas já escritos em nomes, no formato
 * que o passo `subdivisao` aceita. A receita espalha `passo` no passo e `pontos` em TOPO, e nenhum índice sai dela.
 *
 *   estação: { nome, em, colunas, regiao? }  as estações vêm na ordem do eixo, com em crescente;
 *   coluna:  { nome, em: [u, v] ou [u, v, w], de?, regiao?, comeca?, termina? }
 *
 * O eixo é 'x', 'y' ou 'z' (em é a posição nesse eixo, u e v são os outros dois na ordem x, y, z: eixo 'z' dá [x, y],
 * 'y' dá [x, z], 'x' dá [y, z], e w desloca o ponto ao longo do eixo), ou uma curva nomeada:
 *   eixo: { curva, pontos: [[x, y, z], ...], normal: [x, y, z], fechada? }
 * Na curva, em é a fração do comprimento da poligonal, de 0 a 1 (na fechada, de 0 a menos de 1), e a coluna fica em
 * O + u U + v V + w T: O é o ponto da curva, T a tangente (no vértice, a bissetriz dos dois trechos, e dentro do trecho
 * a interpolação das tangentes das pontas), V a normal declarada sem a componente em T, e U = T × V. Com a curva girando
 * no sentido anti-horário visto do lado para onde a normal aponta, u cresce para fora da curva. `fechada: true` liga a
 * última estação à primeira, para um anel em volta de um vão.
 *
 * O ponto da coluna c na estação e se chama `${prefixo}${e}_${c}`. A coluna liga-se à de mesmo nome que ficou aberta nas
 * estações anteriores; `de: [...]` declara outra ligação: duas colunas que se fundem numa só (`de` com dois nomes) ou uma
 * coluna que se divide em duas (duas colunas com o mesmo `de`). A coluna que surge sem ligação entre duas ligadas começa
 * ali, e a que some entre duas ligadas termina ali. Cada par de ligações vizinhas fecha um polígono: quad quando as duas
 * colunas seguem, triângulo na fusão e na divisão, pentágono quando uma coluna começa ou termina. A primeira coluna
 * aberta liga-se à primeira da estação seguinte, e a última à última, salvo na borda declarada: `termina: true` na
 * última estação de uma coluna deixa ela acabar ali, e com ela a chapa daquele lado (a aresta até a vizinha vira borda
 * livre, como na tampa que acaba antes da última estação); `comeca: true` faz a coluna nova nascer na borda. Ligações
 * que se cruzam, e a face que ficaria com mais de cinco lados, são transição impossível e gritam com os nomes.
 *
 * regioes: { nome, estacoes: [de, ate], colunas: [de, ate] } adensa só um trecho. A estação com `regiao` é parcial:
 *         vai de uma coluna aberta a outra, dentro da faixa de colunas da região (null é a borda), e fica entre as duas
 *         estações da faixa, que são estações inteiras. A coluna com `regiao` numa estação inteira é coluna extra e
 *         precisa ficar dentro das duas faixas. A estação parcial deixa na frente o ponto de borda da estação anterior, e
 *         a face de fora que encosta nela fecha um pentágono; por isso, entre duas estações inteiras, só uma estação
 *         parcial por vez toca cada coluna de borda da região, e as outras ficam mais estreitas, em escada.
 * vãos:   { nome, estacoes: [de, ate], colunas: [de, ate] } tira as faces cujos pontos ficam todos entre as duas
 *         estações e, em cada uma, entre as duas colunas, que precisam estar abertas nela. Ponto que fica sem face grita
 *         com o nome do vão. O vão não atravessa o fechamento do anel.
 * vincos: { nome, coluna, de?, ate?, nitidez } segue uma coluna de uma estação a outra (por padrão, por todas as
 *         estações em que ela existe, e no anel fechado volta ao primeiro ponto); { nome, estacao, de?, ate?, nitidez }
 *         segue uma estação de uma coluna a outra. A nitidez passa ao passo como veio: de 0 a 1, 'viva' ou nome de PARAMS.
 * cantos e medidas: listas de { estacao?, coluna? }; só a estação marca a estação inteira, só a coluna marca a coluna
 *         inteira, e os dois marcam um ponto. A medida aceita `peso` (número maior que zero ou nome de PARAMS), e os
 *         pontos dela saem como { ponto, peso }, a cota que a superfície aproxima sem passar; sem peso, a cota é exata.
 *         O mesmo ponto marcado por duas medidas com pesos diferentes grita.
 * borda livre: a borda da gaiola é aberta, e o passo escolhe a regra dela por `borda`, como em qualquer gaiola.
 * simetria: 'x' declara a metade x >= 0, que o passo espelha antes de subdividir; ponto com x < 0 grita, e a aresta no
 *         plano x = 0 precisa ser borda da metade, para a costura sair com duas faces.
 *
 * A ordem de saída é determinística: os pontos por estação, na ordem declarada, e dentro dela por coluna; as faces por
 * estação, cada uma com as que ela fecha contra a frente aberta, da primeira coluna à última, e as do fechamento do
 * anel por último; vincos, cantos e medidas na ordem declarada e dos pontos. */

const EIXOS = ['x', 'y', 'z'];
const TOLERANCIA_DA_COSTURA = 1e-9;
const MAIOR_FACE = 5;

const citar = (n) => `'${n}'`;
const lista = (nomes) => nomes.map(citar).join(', ');
const chave = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const cruz = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const norma = (u) => Math.hypot(u[0], u[1], u[2]);
const vezes = (u, s) => [u[0] * s, u[1] * s, u[2] * s];
const vetor3 = (p) => Array.isArray(p) && p.length === 3 && p.every((x) => typeof x === 'number' && Number.isFinite(x));

function falha(texto) { throw new TypeError(`gaiola por estações: ${texto}`); }

function exigirNome(valor, onde) {
  if (typeof valor !== 'string' || !valor) falha(`${onde} precisa de nome (texto não vazio)`);
  return valor;
}

function exigirCampos(objeto, permitidos, onde) {
  if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) falha(`${onde} precisa ser objeto`);
  const extra = Object.keys(objeto).filter((k) => !permitidos.includes(k));
  if (extra.length) falha(`${onde} tem campo desconhecido ${lista(extra)}; os campos são ${permitidos.join(', ')}`);
}

/** nomeDoPonto(estacao, coluna, prefixo) -> o nome do ponto da coluna na estação, como a gaiola o publica. */
export function nomeDoPonto(estacao, coluna, prefixo = '') { return `${prefixo}${estacao}_${coluna}`; }

/* O eixo reto ou a curva nomeada, com o que cada estação precisa para pôr as suas colunas. */
function lerEixo(eixo) {
  const errado = "eixo precisa ser 'x', 'y' ou 'z', ou { curva, pontos, normal, fechada? }";
  if (typeof eixo === 'string') {
    if (!EIXOS.includes(eixo)) falha(errado);
    const k = EIXOS.indexOf(eixo);
    return { reto: true, nome: eixo, k, outros: EIXOS.filter((e) => e !== eixo).map((e) => EIXOS.indexOf(e)), fechada: false };
  }
  if (!eixo || typeof eixo !== 'object' || Array.isArray(eixo)) falha(errado);
  exigirCampos(eixo, ['curva', 'pontos', 'normal', 'fechada'], 'o eixo');
  const nome = exigirNome(eixo.curva, 'a curva do eixo');
  const fechada = eixo.fechada ?? false;
  if (typeof fechada !== 'boolean') falha(`a curva ${citar(nome)} precisa de fechada: true ou false`);
  const P = eixo.pontos;
  if (!Array.isArray(P) || P.length < (fechada ? 3 : 2) || !P.every(vetor3)) falha(`a curva ${citar(nome)} precisa de pontos: lista de ${fechada ? 'três' : 'dois'} ou mais [x, y, z] finitos`);
  if (!vetor3(eixo.normal) || !(norma(eixo.normal) > 0)) falha(`a curva ${citar(nome)} precisa de normal: [x, y, z] não nulo, a direção de v nas colunas`);
  const n = P.length, trechos = fechada ? n : n - 1;
  const dirs = [], acum = [0];
  for (let i = 0; i < trechos; i++) {
    const d = sub(P[(i + 1) % n], P[i]); const l = norma(d);
    if (!(l > 0)) falha(`a curva ${citar(nome)} repete o ponto: o ${i + 1}º e o ${((i + 1) % n) + 1}º são iguais`);
    dirs.push(vezes(d, 1 / l)); acum.push(acum[i] + l);
  }
  const tangentes = P.map((_, i) => {
    const antes = fechada ? dirs[(i - 1 + n) % n] : dirs[i - 1];
    const depois = dirs[i];
    if (!antes) return depois;
    if (!depois) return antes;
    const s = [antes[0] + depois[0], antes[1] + depois[1], antes[2] + depois[2]]; const l = norma(s);
    if (!(l > 1e-12)) falha(`a curva ${citar(nome)} volta sobre si no ${i + 1}º ponto`);
    return vezes(s, 1 / l);
  });
  return { reto: false, nome, P, n, trechos, acum, tangentes, normal: eixo.normal, fechada };
}

/* O ponto e o triedro da curva na fração t do comprimento: O, T, V e U = T × V. */
function triedroDaCurva(C, t, estacao) {
  const total = C.acum[C.trechos];
  const s = t * total;
  let i = 0;
  while (i < C.trechos - 1 && s > C.acum[i + 1]) i++;
  const a = Math.min(1, Math.max(0, (s - C.acum[i]) / (C.acum[i + 1] - C.acum[i])));
  const p = C.P[i], q = C.P[(i + 1) % C.n];
  const O = [p[0] + a * (q[0] - p[0]), p[1] + a * (q[1] - p[1]), p[2] + a * (q[2] - p[2])];
  const t0 = C.tangentes[i], t1 = C.tangentes[(i + 1) % C.n];
  const Tb = [t0[0] + a * (t1[0] - t0[0]), t0[1] + a * (t1[1] - t0[1]), t0[2] + a * (t1[2] - t0[2])];
  const lt = norma(Tb);
  if (!(lt > 1e-12)) falha(`a estação ${citar(estacao)} cai numa volta de 180 graus da curva ${citar(C.nome)}`);
  const T = vezes(Tb, 1 / lt);
  const R = C.normal; const Vb = sub(R, vezes(T, dot(R, T))); const lv = norma(Vb);
  if (!(lv > 1e-9 * norma(R))) falha(`na estação ${citar(estacao)} a tangente da curva ${citar(C.nome)} é paralela à normal declarada`);
  const V = vezes(Vb, 1 / lv);
  return { O, T, V, U: cruz(T, V) };
}

function lerRegioes(regioes) {
  const porNome = new Map();
  if (regioes == null) return porNome;
  if (!Array.isArray(regioes)) falha('regioes precisa ser lista de { nome, estacoes: [de, ate], colunas: [de, ate] }');
  for (const [n, r] of regioes.entries()) {
    exigirCampos(r, ['nome', 'estacoes', 'colunas'], `a região ${n}`);
    const nome = exigirNome(r.nome, `a região ${n}`);
    if (porNome.has(nome)) falha(`o nome de região ${citar(nome)} aparece mais de uma vez`);
    if (!Array.isArray(r.estacoes) || r.estacoes.length !== 2 || r.estacoes.some((x) => typeof x !== 'string')) falha(`a região ${citar(nome)} precisa de estacoes: [de, ate], dois nomes`);
    if (!Array.isArray(r.colunas) || r.colunas.length !== 2 || r.colunas.some((x) => x !== null && typeof x !== 'string')) falha(`a região ${citar(nome)} precisa de colunas: [de, ate], dois nomes ou null para a borda`);
    porNome.set(nome, { nome, estacoes: r.estacoes, colunas: r.colunas, pontos: [] });
  }
  return porNome;
}

const faixaDeColunas = (R) => `${R.colunas[0] == null ? 'da borda' : `de ${citar(R.colunas[0])}`} ${R.colunas[1] == null ? 'à borda' : `a ${citar(R.colunas[1])}`}`;

function lerEstacoes(estacoes, E, prefixo, regioes) {
  if (!Array.isArray(estacoes) || estacoes.length < 2) falha('estacoes precisa ser lista de duas ou mais estações');
  const vistas = new Set(); const pontos = {}; const vertices = []; const donoDoNome = new Map();
  const lidas = estacoes.map((e, k) => {
    exigirCampos(e, ['nome', 'em', 'colunas', 'regiao'], `a estação ${k}`);
    const nome = exigirNome(e.nome, `a estação ${k}`);
    if (vistas.has(nome)) falha(`a estação ${citar(nome)} aparece mais de uma vez`);
    vistas.add(nome);
    if (E.reto) {
      if (typeof e.em !== 'number' || !Number.isFinite(e.em)) falha(`a estação ${citar(nome)} precisa de em: posição finita no eixo ${E.nome}`);
    } else if (typeof e.em !== 'number' || !(e.em >= 0) || !(E.fechada ? e.em < 1 : e.em <= 1)) {
      falha(`a estação ${citar(nome)} precisa de em: fração do comprimento da curva ${citar(E.nome)}, de 0 a ${E.fechada ? 'menos de 1, porque a curva é fechada' : '1'}`);
    }
    const regiao = e.regiao ?? null;
    if (regiao !== null) {
      if (!regioes.has(regiao)) falha(`a estação ${citar(nome)} cita a região ${citar(regiao)}, que não existe`);
      if (k === 0) falha(`a estação ${citar(nome)} é a primeira e não pode ser parcial da região ${citar(regiao)}`);
    }
    if (!Array.isArray(e.colunas) || e.colunas.length < 2) falha(`a estação ${citar(nome)} precisa de duas ou mais colunas`);
    const triedro = E.reto ? null : triedroDaCurva(E, e.em, nome);
    const indice = new Map();
    const colunas = e.colunas.map((c, j) => {
      exigirCampos(c, ['nome', 'em', 'de', 'regiao', 'comeca', 'termina'], `a coluna ${j} da estação ${citar(nome)}`);
      const col = exigirNome(c.nome, `a coluna ${j} da estação ${citar(nome)}`);
      if (indice.has(col)) falha(`a coluna ${citar(col)} aparece mais de uma vez na estação ${citar(nome)}`);
      indice.set(col, j);
      const p = c.em;
      if (!Array.isArray(p) || (p.length !== 2 && p.length !== 3) || p.some((x) => typeof x !== 'number' || !Number.isFinite(x))) {
        falha(`a coluna ${citar(col)} da estação ${citar(nome)} precisa de em: [u, v] ou [u, v, w] finitos`);
      }
      if (c.de != null) {
        if (k === 0) falha(`a coluna ${citar(col)} declara de, mas a estação ${citar(nome)} é a primeira e não tem estação anterior`);
        if (!Array.isArray(c.de) || !c.de.length || c.de.some((x) => typeof x !== 'string')) falha(`a coluna ${citar(col)} da estação ${citar(nome)} precisa de de: lista de nomes de coluna da estação anterior`);
        if (new Set(c.de).size !== c.de.length) falha(`a coluna ${citar(col)} da estação ${citar(nome)} repete coluna em de`);
      }
      for (const flag of ['comeca', 'termina']) if (c[flag] != null && c[flag] !== true) falha(`a coluna ${citar(col)} da estação ${citar(nome)} aceita ${flag} só como true`);
      if (c.comeca && c.de != null) falha(`a coluna ${citar(col)} da estação ${citar(nome)} declara comeca e de; a coluna que começa não vem de outra`);
      const regiaoDaColuna = c.regiao ?? null;
      if (regiaoDaColuna !== null) {
        if (!regioes.has(regiaoDaColuna)) falha(`a coluna ${citar(col)} da estação ${citar(nome)} cita a região ${citar(regiaoDaColuna)}, que não existe`);
        if (regiao !== null && regiaoDaColuna !== regiao) falha(`a coluna ${citar(col)} da estação ${citar(nome)} cita a região ${citar(regiaoDaColuna)}, mas a estação é da região ${citar(regiao)}`);
      }
      let ponto;
      if (E.reto) {
        ponto = [0, 0, 0];
        ponto[E.k] = e.em + (p[2] ?? 0); ponto[E.outros[0]] = p[0]; ponto[E.outros[1]] = p[1];
      } else {
        const { O, T, V, U } = triedro; const w = p[2] ?? 0;
        ponto = [0, 1, 2].map((i) => O[i] + p[0] * U[i] + p[1] * V[i] + w * T[i]);
      }
      const nomePonto = nomeDoPonto(nome, col, prefixo);
      if (donoDoNome.has(nomePonto)) falha(`o ponto ${citar(nomePonto)} sai de duas estações e colunas (${donoDoNome.get(nomePonto)} e ${citar(nome)}/${citar(col)}); renomeie uma delas`);
      donoDoNome.set(nomePonto, `${citar(nome)}/${citar(col)}`);
      pontos[nomePonto] = ponto; vertices.push(nomePonto);
      const daRegiao = regiao ?? regiaoDaColuna;
      if (daRegiao !== null) regioes.get(daRegiao).pontos.push(nomePonto);
      return { nome: col, de: c.de, ponto: nomePonto, regiao: regiaoDaColuna, comeca: c.comeca === true, termina: c.termina === true };
    });
    return { nome, em: e.em, colunas, indice, regiao, k };
  });
  for (let k = 1; k < lidas.length; k++) {
    if (!(lidas[k].em > lidas[k - 1].em)) falha(`as estações vêm em ordem crescente de em, e ${citar(lidas[k].nome)} (${lidas[k].em}) não passa de ${citar(lidas[k - 1].nome)} (${lidas[k - 1].em})`);
  }
  return { lidas, pontos, vertices };
}

/* As faixas de cada região: estações inteiras nas pontas, estações parciais entre elas, colunas extras dentro. */
function conferirRegioes(regioes, lidas) {
  const indiceDaEstacao = new Map(lidas.map((e, k) => [e.nome, k]));
  for (const R of regioes.values()) {
    for (const e of R.estacoes) {
      if (!indiceDaEstacao.has(e)) falha(`a região ${citar(R.nome)} cita a estação ${citar(e)}, que não existe`);
      if (lidas[indiceDaEstacao.get(e)].regiao !== null) falha(`a região ${citar(R.nome)} vai até a estação ${citar(e)}, que é parcial; as pontas da faixa de uma região são estações inteiras`);
    }
    R.i0 = indiceDaEstacao.get(R.estacoes[0]); R.i1 = indiceDaEstacao.get(R.estacoes[1]);
    if (!(R.i0 < R.i1)) falha(`a região ${citar(R.nome)} vai da estação ${citar(R.estacoes[0])} à ${citar(R.estacoes[1])}, que precisa vir depois`);
    if (!R.pontos.length) falha(`a região ${citar(R.nome)} não tem estação nem coluna; marque regiao nas estações parciais e nas colunas extras dela`);
  }
  for (const E of lidas) {
    if (E.regiao !== null) {
      const R = regioes.get(E.regiao);
      if (!(E.k > R.i0 && E.k < R.i1)) falha(`a estação ${citar(E.nome)} é da região ${citar(R.nome)}, mas fica fora das estações ${citar(R.estacoes[0])} a ${citar(R.estacoes[1])} dela`);
      continue;
    }
    for (const [j, c] of E.colunas.entries()) {
      if (c.regiao === null) continue;
      const R = regioes.get(c.regiao);
      if (!(E.k >= R.i0 && E.k <= R.i1)) falha(`a coluna ${citar(c.nome)} da estação ${citar(E.nome)} é da região ${citar(R.nome)}, mas a estação fica fora das estações ${citar(R.estacoes[0])} a ${citar(R.estacoes[1])} dela`);
      const limite = (nome, padrao) => {
        if (nome == null) return padrao;
        if (!E.indice.has(nome)) falha(`a região ${citar(R.nome)} cita a coluna ${citar(nome)}, que a estação ${citar(E.nome)} não tem`);
        return E.indice.get(nome);
      };
      const j0 = limite(R.colunas[0], -1), j1 = limite(R.colunas[1], E.colunas.length);
      if (!(j > j0 && j < j1)) falha(`a coluna ${citar(c.nome)} da estação ${citar(E.nome)} é da região ${citar(R.nome)}, mas fica fora da faixa de colunas ${faixaDeColunas(R)} dela`);
    }
  }
}

function lerVaos(vaos, lidas) {
  if (vaos == null) return [];
  if (!Array.isArray(vaos)) falha('vaos precisa ser lista de { nome, estacoes: [de, ate], colunas: [de, ate] }');
  const nomes = new Set();
  const indiceDaEstacao = new Map(lidas.map((e, k) => [e.nome, k]));
  return vaos.map((v, n) => {
    exigirCampos(v, ['nome', 'estacoes', 'colunas'], `o vão ${n}`);
    const nome = exigirNome(v.nome, `o vão ${n}`);
    if (nomes.has(nome)) falha(`o nome de vão ${citar(nome)} aparece mais de uma vez`);
    nomes.add(nome);
    const par = (x, campo) => {
      if (!Array.isArray(x) || x.length !== 2 || x.some((y) => typeof y !== 'string')) falha(`o vão ${citar(nome)} precisa de ${campo}: [de, ate], dois nomes`);
      return x;
    };
    const [e0, e1] = par(v.estacoes, 'estacoes');
    const colunas = par(v.colunas, 'colunas');
    for (const e of [e0, e1]) if (!indiceDaEstacao.has(e)) falha(`o vão ${citar(nome)} cita a estação ${citar(e)}, que não existe`);
    const i0 = indiceDaEstacao.get(e0), i1 = indiceDaEstacao.get(e1);
    if (!(i0 < i1)) falha(`o vão ${citar(nome)} vai da estação ${citar(e0)} à ${citar(e1)}, que precisa vir depois`);
    return { nome, i0, i1, colunas, dentro: new Set() };
  });
}

/* A frente aberta: a fila de pontos, da primeira coluna à última, que a próxima estação encontra. Cada entrada guarda
   a coluna, o ponto, a estação de onde veio e se a coluna termina ali. A mesma coluna aparece duas vezes onde uma
   estação parcial passou: o ponto da estação inteira de antes e o da parcial, que a face de fora fecha em pentágono. */
const entradas = (E) => E.colunas.map((c) => ({ coluna: c.nome, ponto: c.ponto, termina: c.termina, estacao: E.nome, k: E.k }));

function maisNova(frente, coluna) {
  let melhor = -1;
  for (let i = 0; i < frente.length; i++) if (frente[i].coluna === coluna && (melhor < 0 || frente[i].k > frente[melhor].k)) melhor = i;
  return melhor;
}

/* As ligações da estação S com a frente, em ordem, e a conferência de que não se cruzam. */
function ligar(frente, S, anterior) {
  const entre = `entre as estações ${citar(anterior)} e ${citar(S.nome)}`;
  const ligacoes = [];
  S.colunas.forEach((b, jb) => {
    let pais;
    if (b.de) {
      pais = b.de.map((a) => {
        const i = maisNova(frente, a);
        if (i < 0) falha(`a coluna ${citar(b.nome)} da estação ${citar(S.nome)} vem de ${citar(a)}, que a estação ${citar(anterior)} não tem`);
        return i;
      });
    } else {
      const i = maisNova(frente, b.nome);
      pais = i < 0 ? [] : [i];
      if (b.comeca && pais.length) falha(`a coluna ${citar(b.nome)} da estação ${citar(S.nome)} declara comeca, mas a coluna ${citar(b.nome)} já está aberta desde a estação ${citar(frente[i].estacao)}`);
    }
    for (const i of pais) {
      if (frente[i].termina) falha(`a coluna ${citar(frente[i].coluna)} termina na estação ${citar(frente[i].estacao)}, mas a coluna ${citar(b.nome)} da estação ${citar(S.nome)} se liga a ela`);
      ligacoes.push([i, jb]);
    }
  });
  if (!ligacoes.length) falha(`transição impossível ${entre}: nenhuma coluna de uma se liga à outra`);
  ligacoes.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  for (let t = 1; t < ligacoes.length; t++) {
    if (ligacoes[t][1] < ligacoes[t - 1][1]) {
      const [a1, b1] = ligacoes[t - 1], [a2, b2] = ligacoes[t];
      falha(`transição impossível ${entre}: as ligações ${citar(frente[a1].coluna)} → ${citar(S.colunas[b1].nome)} e ${citar(frente[a2].coluna)} → ${citar(S.colunas[b2].nome)} se cruzam`);
    }
  }
  return ligacoes;
}

/* As faces entre o trecho F da frente e a estação S: um polígono entre cada par de ligações vizinhas. Antes da primeira
   ligação e depois da última, só sobram colunas que terminam (na frente) ou que começam (em S), na borda. */
function facesDoTrecho(F, S, ligacoes, anterior) {
  const entre = `entre as estações ${citar(anterior)} e ${citar(S.nome)}`;
  const [pf, sf] = ligacoes[0], [pl, sl] = ligacoes[ligacoes.length - 1];
  const ponta = (qual, fSoltas, sSoltas, f0, s0) => {
    if (!fSoltas.length && !sSoltas.length) return;
    let dica = `declare de: [${citar(f0.coluna)}] na coluna ${citar(s0.nome)}`;
    if (sSoltas.length) dica += `, ou comeca: true na coluna ${citar(sSoltas[0].nome)} se ela começa na borda`;
    if (fSoltas.length) dica += `, ou termina: true na coluna ${citar(fSoltas[0].coluna)} da estação ${citar(fSoltas[0].estacao)} se ela termina ali`;
    falha(`transição impossível ${entre}: a ${qual} coluna de uma, ${citar(f0.coluna)}, precisa se ligar à ${qual} da outra, ${citar(s0.nome)}; ${dica}`);
  };
  ponta('primeira', F.slice(0, pf).filter((e) => !e.termina), S.colunas.slice(0, sf).filter((c) => !c.comeca), F[0], S.colunas[0]);
  ponta('última', F.slice(pl + 1).filter((e) => !e.termina), S.colunas.slice(sl + 1).filter((c) => !c.comeca), F[F.length - 1], S.colunas[S.colunas.length - 1]);
  const faces = [];
  for (let t = 0; t + 1 < ligacoes.length; t++) {
    const [a1, b1] = ligacoes[t], [a2, b2] = ligacoes[t + 1];
    const nomes = [];
    for (let j = a1; j <= a2; j++) nomes.push(F[j].ponto);
    for (let j = b2; j >= b1; j--) nomes.push(S.colunas[j].ponto);
    faces.push({ entre: [anterior, S.nome], parcial: S.regiao !== null, nomes, vaos: [] });
  }
  return faces;
}

/* Fecha a estação S contra a frente e devolve as faces e a frente nova. A estação inteira encontra a frente toda; a
   parcial, só o trecho entre as colunas a que ela se liga (até a borda, se ela tem coluna que começa na borda). */
function avancar(frente, S, anterior, regioes) {
  const ligacoes = ligar(frente, S, anterior);
  let rs = 0, re = frente.length - 1;
  if (S.regiao !== null) {
    const R = regioes.get(S.regiao);
    if (ligacoes[0][1] === 0) rs = ligacoes[0][0];
    if (ligacoes[ligacoes.length - 1][1] === S.colunas.length - 1) re = ligacoes[ligacoes.length - 1][0];
    const limite = (nome, padrao) => {
      if (nome == null) return padrao;
      const i = maisNova(frente, nome);
      if (i < 0) falha(`a região ${citar(R.nome)} cita a coluna ${citar(nome)}, que não está aberta antes da estação ${citar(S.nome)}`);
      return i;
    };
    const lo = limite(R.colunas[0], 0), hi = limite(R.colunas[1], frente.length - 1);
    if (rs < lo || re > hi) falha(`a estação ${citar(S.nome)} da região ${citar(R.nome)} vai da coluna ${citar(frente[rs].coluna)} à ${citar(frente[re].coluna)}, fora da faixa de colunas ${faixaDeColunas(R)} da região`);
  }
  const faces = facesDoTrecho(frente.slice(rs, re + 1), S, ligacoes.map(([a, b]) => [a - rs, b]), anterior);
  if (S.regiao === null) return { faces, frente: entradas(S) };
  const nova = [...frente.slice(0, rs), ...(rs > 0 ? [frente[rs]] : []), ...entradas(S), ...(re < frente.length - 1 ? [frente[re]] : []), ...frente.slice(re + 1)];
  return { faces, frente: nova };
}

/* Os pontos da estação k que ficam dentro de cada vão: entre as colunas do vão na frente aberta depois dela. */
function marcarVaos(vaos, E, frente) {
  for (const v of vaos) {
    if (E.k < v.i0 || E.k > v.i1) continue;
    const [c0, c1] = v.colunas;
    const p0 = maisNova(frente, c0), p1 = maisNova(frente, c1);
    for (const [c, p] of [[c0, p0], [c1, p1]]) if (p < 0) falha(`o vão ${citar(v.nome)} cita a coluna ${citar(c)}, que a estação ${citar(E.nome)} não tem`);
    if (!(p0 < p1)) falha(`o vão ${citar(v.nome)} vai da coluna ${citar(c0)} à ${citar(c1)}, que na estação ${citar(E.nome)} precisa vir depois`);
    frente.forEach((e, q) => { if (e.k === E.k && q >= p0 && q <= p1) v.dentro.add(e.ponto); });
  }
}

/* A linha de um vinco: os pontos em sequência, ao longo de uma coluna ou de uma estação. */
function linhaDoVinco(v, nome, lidas, fechada) {
  const indiceDaEstacao = new Map(lidas.map((e, k) => [e.nome, k]));
  if ((v.coluna == null) === (v.estacao == null)) falha(`o vinco ${citar(nome)} segue uma coluna ou uma estação: declare coluna ou estacao, um dos dois`);
  if (v.coluna != null) {
    const col = exigirNome(v.coluna, `a coluna do vinco ${citar(nome)}`);
    const tem = lidas.map((e, k) => (e.indice.has(col) ? k : -1)).filter((k) => k >= 0);
    if (!tem.length) falha(`o vinco ${citar(nome)} segue a coluna ${citar(col)}, que nenhuma estação tem`);
    const estacao = (e, padrao) => {
      if (e == null) return padrao;
      if (!indiceDaEstacao.has(e)) falha(`o vinco ${citar(nome)} cita a estação ${citar(e)}, que não existe`);
      return indiceDaEstacao.get(e);
    };
    const i0 = estacao(v.de, tem[0]), i1 = estacao(v.ate, tem[tem.length - 1]);
    if (!(i0 < i1)) falha(`o vinco ${citar(nome)} vai da estação ${citar(lidas[i0].nome)} à ${citar(lidas[i1].nome)}, que precisa vir depois`);
    const pontos = [];
    for (let k = i0; k <= i1; k++) {
      const E = lidas[k];
      if (!E.indice.has(col)) {
        if (E.regiao !== null && k !== i0 && k !== i1) continue;
        falha(`o vinco ${citar(nome)} segue a coluna ${citar(col)} da estação ${citar(lidas[i0].nome)} à ${citar(lidas[i1].nome)}, mas a estação ${citar(E.nome)} não tem a coluna ${citar(col)}`);
      }
      pontos.push(E.colunas[E.indice.get(col)].ponto);
    }
    if (fechada && v.de == null && v.ate == null && i0 === 0) pontos.push(pontos[0]);
    return pontos;
  }
  const est = exigirNome(v.estacao, `a estação do vinco ${citar(nome)}`);
  if (!indiceDaEstacao.has(est)) falha(`o vinco ${citar(nome)} segue a estação ${citar(est)}, que não existe`);
  const E = lidas[indiceDaEstacao.get(est)];
  const coluna = (c, padrao) => {
    if (c == null) return padrao;
    if (!E.indice.has(c)) falha(`o vinco ${citar(nome)} cita a coluna ${citar(c)}, que a estação ${citar(est)} não tem`);
    return E.indice.get(c);
  };
  const j0 = coluna(v.de, 0), j1 = coluna(v.ate, E.colunas.length - 1);
  if (!(j0 < j1)) falha(`o vinco ${citar(nome)} vai da coluna ${citar(E.colunas[j0].nome)} à ${citar(E.colunas[j1].nome)}, que na estação ${citar(est)} precisa vir depois`);
  return E.colunas.slice(j0, j1 + 1).map((c) => c.ponto);
}

function lerVincos(vincos, lidas, arestas, fechada) {
  if (vincos == null) return [];
  if (!Array.isArray(vincos)) falha('vincos precisa ser lista de vincos nomeados');
  const nomes = new Set();
  return vincos.map((v, n) => {
    exigirCampos(v, ['nome', 'coluna', 'estacao', 'de', 'ate', 'nitidez'], `o vinco ${n}`);
    const nome = exigirNome(v.nome, `o vinco ${n}`);
    if (nomes.has(nome)) falha(`o nome de vinco ${citar(nome)} aparece mais de uma vez`);
    nomes.add(nome);
    const ok = v.nitidez === 'viva' || (typeof v.nitidez === 'string' && v.nitidez) || (typeof v.nitidez === 'number' && v.nitidez >= 0 && v.nitidez <= 1);
    if (!ok) falha(`o vinco ${citar(nome)} precisa de nitidez de 0 a 1, 'viva' ou nome de PARAMS`);
    const pontos = linhaDoVinco(v, nome, lidas, fechada);
    for (let k = 0; k + 1 < pontos.length; k++) {
      if (!arestas.has(chave(pontos[k], pontos[k + 1]))) falha(`o vinco ${citar(nome)} liga ${citar(pontos[k])} a ${citar(pontos[k + 1])}, que não formam aresta da gaiola (um vão, uma fusão ou uma divisão tirou essa aresta)`);
    }
    return { nome, pontos, nitidez: v.nitidez };
  });
}

/* cantos e medidas: { estacao?, coluna? } vira a lista dos pontos marcados, na ordem dos pontos. Nas medidas, `peso`
   passa ao passo, e o ponto com peso sai como { ponto, peso }. */
function marcar(seletores, campo, lidas, vertices) {
  if (seletores == null) return null;
  if (!Array.isArray(seletores) || !seletores.length) falha(`${campo} precisa ser lista não vazia de { estacao, coluna }`);
  const marcados = new Set(); const pesos = new Map();
  const indiceDaEstacao = new Map(lidas.map((e, k) => [e.nome, k]));
  for (const [n, s] of seletores.entries()) {
    exigirCampos(s, campo === 'medidas' ? ['estacao', 'coluna', 'peso'] : ['estacao', 'coluna'], `${campo}[${n}]`);
    const peso = s.peso ?? null;
    if (peso !== null && !(typeof peso === 'string' || (typeof peso === 'number' && Number.isFinite(peso) && peso > 0))) falha(`${campo}[${n}] tem peso ${peso}; o peso é número finito maior que zero ou nome de PARAMS, e a medida sem peso é exata`);
    if (s.estacao == null && s.coluna == null) falha(`${campo}[${n}] precisa de estacao, coluna ou os dois`);
    if (s.estacao != null && !indiceDaEstacao.has(s.estacao)) falha(`${campo}[${n}] cita a estação ${citar(s.estacao)}, que não existe`);
    const estacoes = s.estacao != null ? [lidas[indiceDaEstacao.get(s.estacao)]] : lidas;
    let achou = 0;
    for (const E of estacoes) {
      if (s.coluna != null && !E.indice.has(s.coluna)) continue;
      for (const c of E.colunas) {
        if (s.coluna != null && c.nome !== s.coluna) continue;
        if (marcados.has(c.ponto) && (pesos.get(c.ponto) ?? null) !== peso) falha(`${campo}[${n}] marca ${citar(c.ponto)} com outro peso que uma medida anterior`);
        marcados.add(c.ponto); if (peso !== null) pesos.set(c.ponto, peso); achou += 1;
      }
    }
    if (!achou) falha(`${campo}[${n}] cita a coluna ${citar(s.coluna)}, que ${s.estacao != null ? `a estação ${citar(s.estacao)} não tem` : 'nenhuma estação tem'}`);
  }
  return vertices.filter((p) => marcados.has(p)).map((p) => (pesos.has(p) ? { ponto: p, peso: pesos.get(p) } : p));
}

/**
 * gaiolaPorEstacoes({ eixo, estacoes, regioes, vaos, vincos, cantos, medidas, simetria, virar, prefixo })
 *   -> { pontos, passo, ponto(estacao, coluna), regioes }
 * `pontos` vai para TOPO e `passo` se espalha no passo `subdivisao`: { vertices, faces, vincos, cantos?, medidas?,
 * simetria? }, tudo em nomes de ponto. `regioes` dá, para cada região, os nomes dos pontos dela, na ordem dos pontos.
 */
export function gaiolaPorEstacoes(definicao) {
  exigirCampos(definicao, ['eixo', 'estacoes', 'regioes', 'vaos', 'vincos', 'cantos', 'medidas', 'simetria', 'virar', 'prefixo'], 'a definição da gaiola');
  const { simetria = null, virar = false, prefixo = '' } = definicao;
  const E = lerEixo(definicao.eixo);
  if (simetria !== null && simetria !== 'x') falha("simetria só aceita 'x'");
  if (typeof virar !== 'boolean') falha('virar precisa ser true ou false');
  if (typeof prefixo !== 'string') falha('prefixo precisa ser texto');
  const regioes = lerRegioes(definicao.regioes);
  const { lidas, pontos, vertices } = lerEstacoes(definicao.estacoes, E, prefixo, regioes);
  conferirRegioes(regioes, lidas);
  const vaos = lerVaos(definicao.vaos, lidas);

  const todas = [];
  let frente = entradas(lidas[0]);
  marcarVaos(vaos, lidas[0], frente);
  for (let k = 1; k < lidas.length; k++) {
    const r = avancar(frente, lidas[k], lidas[k - 1].nome, regioes);
    todas.push(...r.faces);
    frente = r.frente;
    marcarVaos(vaos, lidas[k], frente);
  }
  if (E.fechada) {
    const r = avancar(frente, lidas[0], lidas[lidas.length - 1].nome, regioes);
    for (const f of r.faces) f.fechamento = true;
    todas.push(...r.faces);
  }
  for (const v of vaos) {
    let tiradas = 0;
    for (const f of todas) if (!f.fechamento && f.nomes.every((p) => v.dentro.has(p))) { f.vaos.push(v.nome); tiradas += 1; }
    if (!tiradas) falha(`o vão ${citar(v.nome)} não tira nenhuma face`);
  }
  const ficam = todas.filter((f) => !f.vaos.length);
  for (const f of ficam) {
    if (f.nomes.length > MAIOR_FACE) {
      const dica = f.parcial || f.nomes.some((p) => [...regioes.values()].some((R) => R.pontos.includes(p))) ? '; numa região, só uma estação parcial por vez toca cada coluna de borda, e as seguintes ficam mais estreitas' : '';
      falha(`transição impossível entre as estações ${citar(f.entre[0])} e ${citar(f.entre[1])}: a face [${lista(f.nomes)}] tem ${f.nomes.length} lados; funda, divida, comece ou termine uma coluna por vez entre colunas que seguem, para a transição dar triângulo ou pentágono${dica}`);
    }
  }
  const usados = new Set(ficam.flatMap((f) => f.nomes));
  const soltos = vertices.filter((p) => !usados.has(p));
  if (soltos.length) {
    const culpados = [...new Set(todas.filter((f) => f.vaos.length && f.nomes.some((p) => soltos.includes(p))).flatMap((f) => f.vaos))];
    if (culpados.length) falha(`${culpados.length === 1 ? 'o vão' : 'os vãos'} ${lista(culpados)} ${culpados.length === 1 ? 'deixa' : 'deixam'} sem face ${soltos.length === 1 ? 'o ponto' : 'os pontos'} ${lista(soltos)}; tire ${soltos.length === 1 ? 'esse ponto' : 'esses pontos'} das estações do vão ou estreite o vão`);
    falha(`${soltos.length === 1 ? 'o ponto' : 'os pontos'} ${lista(soltos)} não pertencem a nenhuma face`);
  }

  const faces = ficam.map((f) => (virar ? [...f.nomes].reverse() : [...f.nomes]));
  const arestas = new Map();
  for (const f of faces) for (let k = 0; k < f.length; k++) { const c = chave(f[k], f[(k + 1) % f.length]); arestas.set(c, (arestas.get(c) ?? 0) + 1); }

  if (simetria === 'x') {
    const negativos = vertices.filter((p) => pontos[p][0] < -TOLERANCIA_DA_COSTURA);
    if (negativos.length) falha(`na simetria em x a gaiola é a metade x >= 0, e ${negativos.length === 1 ? 'o ponto' : 'os pontos'} ${lista(negativos)} ${negativos.length === 1 ? 'tem' : 'têm'} x < 0`);
    const naCostura = (p) => Math.abs(pontos[p][0]) <= TOLERANCIA_DA_COSTURA;
    for (const f of faces) {
      for (let k = 0; k < f.length; k++) {
        const a = f[k], b = f[(k + 1) % f.length];
        if (naCostura(a) && naCostura(b) && arestas.get(chave(a, b)) !== 1) falha(`na simetria em x a aresta ${citar(a)}-${citar(b)} fica no plano x = 0 e tem duas faces na metade; a costura precisa ser borda da metade`);
      }
    }
  }

  const vincos = lerVincos(definicao.vincos, lidas, arestas, E.fechada);
  const cantos = marcar(definicao.cantos, 'cantos', lidas, vertices);
  const medidas = marcar(definicao.medidas, 'medidas', lidas, vertices);
  const passo = { vertices: [...vertices], faces, vincos };
  if (cantos) passo.cantos = cantos;
  if (medidas) passo.medidas = medidas;
  if (simetria) passo.simetria = simetria;
  const indiceDaEstacao = new Map(lidas.map((e) => [e.nome, e]));
  const ponto = (estacao, coluna) => {
    const S = indiceDaEstacao.get(estacao);
    if (!S) falha(`a estação ${citar(estacao)} não existe`);
    if (!S.indice.has(coluna)) falha(`a estação ${citar(estacao)} não tem a coluna ${citar(coluna)}`);
    return S.colunas[S.indice.get(coluna)].ponto;
  };
  const porRegiao = Object.fromEntries([...regioes.values()].map((R) => [R.nome, vertices.filter((p) => R.pontos.includes(p))]));
  return { pontos, passo, ponto, regioes: porRegiao };
}
