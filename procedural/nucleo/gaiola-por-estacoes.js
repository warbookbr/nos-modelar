/* gaiola-por-estacoes.js — monta a gaiola da operação `subdivisao` a partir de estações e colunas nomeadas
 *
 * Função pura, sem Three.js e sem domínio: recebe estações nomeadas ao longo de um eixo, cada uma com as suas colunas
 * nomeadas em ordem, e devolve os pontos, as faces, os vincos, os cantos e as medidas já escritos em nomes, no formato
 * que o passo `subdivisao` aceita. A receita espalha `passo` no passo e `pontos` em PARAMS, e nenhum índice sai dela.
 *
 *   estação: { nome, em, colunas }  em é a posição no eixo, e as estações vêm em ordem crescente de em;
 *   coluna:  { nome, em: [u, v] ou [u, v, w], de? }  u e v são os outros dois eixos na ordem x, y, z (eixo 'z' dá
 *            [x, y], 'y' dá [x, z], 'x' dá [y, z]) e w, opcional, desloca o ponto ao longo do eixo a partir da estação.
 *
 * O ponto da coluna c na estação e se chama `${prefixo}${e}_${c}`. Entre duas estações vizinhas, a coluna liga-se à
 * coluna de mesmo nome da estação anterior; `de: [...]` declara outra ligação: duas colunas que se fundem numa só
 * (`de` com dois nomes) ou uma coluna que se divide em duas (duas colunas com o mesmo `de`). A coluna que surge sem
 * ligação entre duas ligadas começa ali, e a que some entre duas ligadas termina ali. Cada par de ligações vizinhas
 * fecha um polígono: quad quando as duas colunas seguem, triângulo na fusão e na divisão, pentágono quando uma coluna
 * começa ou termina. É assim que a gaiola adensa perto de um vinco sem adensar a peça toda. A primeira coluna de uma
 * estação liga-se à primeira da seguinte, e a última à última; ligações que se cruzam, e a face que ficaria com mais
 * de cinco lados, são transição impossível e gritam com os nomes das estações e das colunas.
 *
 * A face sai com a normal (sentido das colunas) × (sentido das estações): no eixo 'z', com as colunas subindo pela
 * lateral x > 0, a normal aponta para +x. `virar: true` inverte todas as faces.
 *
 * vãos:   { nome, estacoes: [de, ate], colunas: [de, ate] } tira as faces entre as duas estações e entre as duas
 *         colunas, que precisam existir em cada estação da faixa. Ponto que fica sem face grita com o nome do vão.
 * vincos: { nome, coluna, de?, ate?, nitidez } segue uma coluna de uma estação a outra (por padrão, por todas as
 *         estações em que ela existe); { nome, estacao, de?, ate?, nitidez } segue uma estação de uma coluna a outra.
 *         A nitidez passa ao passo como veio: de 0 a 1, 'viva' ou nome de PARAMS.
 * cantos e medidas: listas de { estacao?, coluna? }; só a estação marca a estação inteira, só a coluna marca a coluna
 *         inteira, e os dois marcam um ponto.
 * borda livre: a borda da gaiola é aberta, e o passo escolhe a regra dela por `borda`, como em qualquer gaiola.
 * simetria: 'x' declara a metade x >= 0, que o passo espelha antes de subdividir; ponto com x < 0 grita, e a aresta no
 *         plano x = 0 precisa ser borda da metade, para a costura sair com duas faces.
 *
 * A ordem de saída é determinística: os pontos por estação e, dentro dela, por coluna; as faces por faixa entre
 * estações e, dentro dela, da primeira coluna à última; vincos, cantos e medidas na ordem declarada e dos pontos. */

const EIXOS = ['x', 'y', 'z'];
const TOLERANCIA_DA_COSTURA = 1e-9;
const MAIOR_FACE = 5;

const citar = (n) => `'${n}'`;
const lista = (nomes) => nomes.map(citar).join(', ');
const chave = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

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

function lerEstacoes(estacoes, eixo, prefixo) {
  if (!Array.isArray(estacoes) || estacoes.length < 2) falha('estacoes precisa ser lista de duas ou mais estações');
  const eixoK = EIXOS.indexOf(eixo);
  const outros = EIXOS.filter((e) => e !== eixo).map((e) => EIXOS.indexOf(e));
  const vistas = new Set(); const pontos = {}; const vertices = []; const donoDoNome = new Map();
  const lidas = estacoes.map((e, k) => {
    exigirCampos(e, ['nome', 'em', 'colunas'], `a estação ${k}`);
    const nome = exigirNome(e.nome, `a estação ${k}`);
    if (vistas.has(nome)) falha(`a estação ${citar(nome)} aparece mais de uma vez`);
    vistas.add(nome);
    if (typeof e.em !== 'number' || !Number.isFinite(e.em)) falha(`a estação ${citar(nome)} precisa de em: posição finita no eixo ${eixo}`);
    if (!Array.isArray(e.colunas) || e.colunas.length < 2) falha(`a estação ${citar(nome)} precisa de duas ou mais colunas`);
    const indice = new Map();
    const colunas = e.colunas.map((c, j) => {
      exigirCampos(c, ['nome', 'em', 'de'], `a coluna ${j} da estação ${citar(nome)}`);
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
      const ponto = [0, 0, 0];
      ponto[eixoK] = e.em + (p[2] ?? 0); ponto[outros[0]] = p[0]; ponto[outros[1]] = p[1];
      const nomePonto = nomeDoPonto(nome, col, prefixo);
      if (donoDoNome.has(nomePonto)) falha(`o ponto ${citar(nomePonto)} sai de duas estações e colunas (${donoDoNome.get(nomePonto)} e ${citar(nome)}/${citar(col)}); renomeie uma delas`);
      donoDoNome.set(nomePonto, `${citar(nome)}/${citar(col)}`);
      pontos[nomePonto] = ponto; vertices.push(nomePonto);
      return { nome: col, de: c.de, ponto: nomePonto };
    });
    return { nome, em: e.em, colunas, indice };
  });
  for (let k = 1; k < lidas.length; k++) {
    if (!(lidas[k].em > lidas[k - 1].em)) falha(`as estações vêm em ordem crescente de em, e ${citar(lidas[k].nome)} (${lidas[k].em}) não passa de ${citar(lidas[k - 1].nome)} (${lidas[k - 1].em})`);
  }
  return { lidas, pontos, vertices };
}

/* As faces entre a estação A e a seguinte B: as ligações em ordem, e um polígono entre cada par de ligações vizinhas. */
function facesDaFaixa(A, B, k) {
  const entre = `entre as estações ${citar(A.nome)} e ${citar(B.nome)}`;
  const ligacoes = [];
  B.colunas.forEach((b, jb) => {
    const pais = b.de ?? (A.indice.has(b.nome) ? [b.nome] : []);
    for (const a of pais) {
      if (!A.indice.has(a)) falha(`a coluna ${citar(b.nome)} da estação ${citar(B.nome)} vem de ${citar(a)}, que a estação ${citar(A.nome)} não tem`);
      ligacoes.push([A.indice.get(a), jb]);
    }
  });
  ligacoes.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  for (let t = 1; t < ligacoes.length; t++) {
    if (ligacoes[t][1] < ligacoes[t - 1][1]) {
      const [a1, b1] = ligacoes[t - 1], [a2, b2] = ligacoes[t];
      falha(`transição impossível ${entre}: as ligações ${citar(A.colunas[a1].nome)} → ${citar(B.colunas[b1].nome)} e ${citar(A.colunas[a2].nome)} → ${citar(B.colunas[b2].nome)} se cruzam`);
    }
  }
  const ultA = A.colunas.length - 1, ultB = B.colunas.length - 1;
  const primeira = ligacoes[0], ultima = ligacoes[ligacoes.length - 1];
  if (!primeira || primeira[0] !== 0 || primeira[1] !== 0) {
    falha(`transição impossível ${entre}: a primeira coluna de uma, ${citar(A.colunas[0].nome)}, precisa se ligar à primeira da outra, ${citar(B.colunas[0].nome)}; declare de: [${citar(A.colunas[0].nome)}] na coluna ${citar(B.colunas[0].nome)}`);
  }
  if (ultima[0] !== ultA || ultima[1] !== ultB) {
    falha(`transição impossível ${entre}: a última coluna de uma, ${citar(A.colunas[ultA].nome)}, precisa se ligar à última da outra, ${citar(B.colunas[ultB].nome)}; declare de: [${citar(A.colunas[ultA].nome)}] na coluna ${citar(B.colunas[ultB].nome)}`);
  }
  const faces = [];
  for (let t = 0; t + 1 < ligacoes.length; t++) {
    const [a1, b1] = ligacoes[t], [a2, b2] = ligacoes[t + 1];
    const nomes = [];
    for (let j = a1; j <= a2; j++) nomes.push(A.colunas[j].ponto);
    for (let j = b2; j >= b1; j--) nomes.push(B.colunas[j].ponto);
    faces.push({ faixa: k, a: [a1, a2], b: [b1, b2], nomes, vaos: [] });
  }
  return faces;
}

function aplicarVaos(vaos, lidas, faces) {
  if (vaos == null) return;
  if (!Array.isArray(vaos)) falha('vaos precisa ser lista de { nome, estacoes: [de, ate], colunas: [de, ate] }');
  const nomes = new Set();
  const indiceDaEstacao = new Map(lidas.map((e, k) => [e.nome, k]));
  for (const [n, v] of vaos.entries()) {
    exigirCampos(v, ['nome', 'estacoes', 'colunas'], `o vão ${n}`);
    const nome = exigirNome(v.nome, `o vão ${n}`);
    if (nomes.has(nome)) falha(`o nome de vão ${citar(nome)} aparece mais de uma vez`);
    nomes.add(nome);
    const par = (x, campo) => {
      if (!Array.isArray(x) || x.length !== 2 || x.some((y) => typeof y !== 'string')) falha(`o vão ${citar(nome)} precisa de ${campo}: [de, ate], dois nomes`);
      return x;
    };
    const [e0, e1] = par(v.estacoes, 'estacoes');
    const [c0, c1] = par(v.colunas, 'colunas');
    for (const e of [e0, e1]) if (!indiceDaEstacao.has(e)) falha(`o vão ${citar(nome)} cita a estação ${citar(e)}, que não existe`);
    const i0 = indiceDaEstacao.get(e0), i1 = indiceDaEstacao.get(e1);
    if (!(i0 < i1)) falha(`o vão ${citar(nome)} vai da estação ${citar(e0)} à ${citar(e1)}, que precisa vir depois`);
    const faixa = new Map();
    for (let k = i0; k <= i1; k++) {
      const E = lidas[k];
      for (const c of [c0, c1]) if (!E.indice.has(c)) falha(`o vão ${citar(nome)} cita a coluna ${citar(c)}, que a estação ${citar(E.nome)} não tem`);
      const j0 = E.indice.get(c0), j1 = E.indice.get(c1);
      if (!(j0 < j1)) falha(`o vão ${citar(nome)} vai da coluna ${citar(c0)} à ${citar(c1)}, que na estação ${citar(E.nome)} precisa vir depois`);
      faixa.set(k, [j0, j1]);
    }
    let tiradas = 0;
    for (const f of faces) {
      if (f.faixa < i0 || f.faixa + 1 > i1) continue;
      const [ja0, ja1] = faixa.get(f.faixa), [jb0, jb1] = faixa.get(f.faixa + 1);
      if (f.a[0] >= ja0 && f.a[1] <= ja1 && f.b[0] >= jb0 && f.b[1] <= jb1) { f.vaos.push(nome); tiradas += 1; }
    }
    if (!tiradas) falha(`o vão ${citar(nome)} não tira nenhuma face`);
  }
}

/* A linha de um vinco: os pontos em sequência, ao longo de uma coluna ou de uma estação. */
function linhaDoVinco(v, nome, lidas) {
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
      if (!E.indice.has(col)) falha(`o vinco ${citar(nome)} segue a coluna ${citar(col)} da estação ${citar(lidas[i0].nome)} à ${citar(lidas[i1].nome)}, mas a estação ${citar(E.nome)} não tem a coluna ${citar(col)}`);
      pontos.push(E.colunas[E.indice.get(col)].ponto);
    }
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

function lerVincos(vincos, lidas, arestas) {
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
    const pontos = linhaDoVinco(v, nome, lidas);
    for (let k = 0; k + 1 < pontos.length; k++) {
      if (!arestas.has(chave(pontos[k], pontos[k + 1]))) falha(`o vinco ${citar(nome)} liga ${citar(pontos[k])} a ${citar(pontos[k + 1])}, que não formam aresta da gaiola (um vão, uma fusão ou uma divisão tirou essa aresta)`);
    }
    return { nome, pontos, nitidez: v.nitidez };
  });
}

/* cantos e medidas: { estacao?, coluna? } vira a lista dos pontos marcados, na ordem dos pontos. */
function marcar(seletores, campo, lidas, vertices) {
  if (seletores == null) return null;
  if (!Array.isArray(seletores) || !seletores.length) falha(`${campo} precisa ser lista não vazia de { estacao, coluna }`);
  const marcados = new Set();
  const indiceDaEstacao = new Map(lidas.map((e, k) => [e.nome, k]));
  for (const [n, s] of seletores.entries()) {
    exigirCampos(s, ['estacao', 'coluna'], `${campo}[${n}]`);
    if (s.estacao == null && s.coluna == null) falha(`${campo}[${n}] precisa de estacao, coluna ou os dois`);
    if (s.estacao != null && !indiceDaEstacao.has(s.estacao)) falha(`${campo}[${n}] cita a estação ${citar(s.estacao)}, que não existe`);
    const estacoes = s.estacao != null ? [lidas[indiceDaEstacao.get(s.estacao)]] : lidas;
    let achou = 0;
    for (const E of estacoes) {
      if (s.coluna != null && !E.indice.has(s.coluna)) continue;
      for (const c of E.colunas) if (s.coluna == null || c.nome === s.coluna) { marcados.add(c.ponto); achou += 1; }
    }
    if (!achou) falha(`${campo}[${n}] cita a coluna ${citar(s.coluna)}, que ${s.estacao != null ? `a estação ${citar(s.estacao)} não tem` : 'nenhuma estação tem'}`);
  }
  return vertices.filter((p) => marcados.has(p));
}

/**
 * gaiolaPorEstacoes({ eixo, estacoes, vaos, vincos, cantos, medidas, simetria, virar, prefixo })
 *   -> { pontos, passo, ponto(estacao, coluna) }
 * `pontos` vai para PARAMS e `passo` se espalha no passo `subdivisao`: { vertices, faces, vincos, cantos?, medidas?,
 * simetria? }, tudo em nomes de ponto.
 */
export function gaiolaPorEstacoes(definicao) {
  exigirCampos(definicao, ['eixo', 'estacoes', 'vaos', 'vincos', 'cantos', 'medidas', 'simetria', 'virar', 'prefixo'], 'a definição da gaiola');
  const { eixo, simetria = null, virar = false, prefixo = '' } = definicao;
  if (!EIXOS.includes(eixo)) falha("eixo precisa ser 'x', 'y' ou 'z'");
  if (simetria !== null && simetria !== 'x') falha("simetria só aceita 'x'");
  if (typeof virar !== 'boolean') falha('virar precisa ser true ou false');
  if (typeof prefixo !== 'string') falha('prefixo precisa ser texto');
  const { lidas, pontos, vertices } = lerEstacoes(definicao.estacoes, eixo, prefixo);

  const todas = [];
  for (let k = 0; k + 1 < lidas.length; k++) todas.push(...facesDaFaixa(lidas[k], lidas[k + 1], k));
  aplicarVaos(definicao.vaos, lidas, todas);
  const ficam = todas.filter((f) => !f.vaos.length);
  for (const f of ficam) {
    if (f.nomes.length > MAIOR_FACE) {
      const A = lidas[f.faixa], B = lidas[f.faixa + 1];
      falha(`transição impossível entre as estações ${citar(A.nome)} e ${citar(B.nome)}: a face [${lista(f.nomes)}] tem ${f.nomes.length} lados; funda, divida, comece ou termine uma coluna por vez entre colunas que seguem, para a transição dar triângulo ou pentágono`);
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

  const vincos = lerVincos(definicao.vincos, lidas, arestas);
  const cantos = marcar(definicao.cantos, 'cantos', lidas, vertices);
  const medidas = marcar(definicao.medidas, 'medidas', lidas, vertices);
  const passo = { vertices: [...vertices], faces, vincos };
  if (cantos) passo.cantos = cantos;
  if (medidas) passo.medidas = medidas;
  if (simetria) passo.simetria = simetria;
  const indiceDaEstacao = new Map(lidas.map((e) => [e.nome, e]));
  const ponto = (estacao, coluna) => {
    const E = indiceDaEstacao.get(estacao);
    if (!E) falha(`a estação ${citar(estacao)} não existe`);
    if (!E.indice.has(coluna)) falha(`a estação ${citar(estacao)} não tem a coluna ${citar(coluna)}`);
    return E.colunas[E.indice.get(coluna)].ponto;
  };
  return { pontos, passo, ponto };
}
