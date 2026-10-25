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
 *         com o nome do vão. O vão não atravessa o fechamento do anel. `bordaDoVao(nome)` dá a borda dele por nome.
 *         `livre: true` declara o vão que não tira face: a abertura é a borda livre que as colunas que terminam (`termina`) e
 *         começam (`comeca`) deixam, como a janela de trás de uma carroceria na metade com simetria, em que as colunas do meio
 *         terminam numa estação e recomeçam em outra. O vão vai da estação em que elas terminam à em que recomeçam e da primeira
 *         coluna delas à primeira que a chapa conserva entre as duas estações; a primeira coluna pode faltar nas estações do meio,
 *         e a borda do vão é a borda livre entre os pontos dele.
 * aneis: [{ nome, vao, recuo, voltas, largura | larguras, raio?, raios?, relevo?, segmentos?, camadas?, arredondar? }] põe laços de arestas
 *         que contornam a abertura, costurados à grade ao redor (opções e geometria em `gaiola-aneis.js`). Com `recuo` em mm, número
 *         ou um por lado (`{ baixo: 60, cima: 80, e5: 70, e14: 70 }`, pelos nomes das colunas e estações do vão), o anel preenche o vão
 *         por dentro: a volta 1 é a nova borda do vão, `recuo` mm para dentro. Com `recuo: 0` a abertura é a própria borda do vão e as
 *         voltas crescem para fora, sobre a grade, trocando a faixa de faces que cerca o vão (`camadas`). As voltas seguintes se afastam
 *         da 1, a `largura` mm uma da outra, até laços de transição que alargam até a grade. Os pontos se chamam `${nome}_a${volta}_${ponto da borda}`, com `_arco${j}` nos
 *         arcos dos cantos, e a transição `${nome}_c${j}_…`. Vincos, cantos e medidas os citam por nome: `{ nome, anel, volta,
 *         nitidez }` segue uma volta, e `{ anel, volta? }` marca a volta (ou o anel inteiro, com a transição) em cantos e medidas,
 *         com `peso` nas medidas. `bordaDoVao(vao)` passa a dar a volta 1, e a saída traz `aneis[nome]` com as voltas, a transição e
 *         os vértices extraordinários (valência fora de 4 no interior e de 2 a 3 na borda), declarados pelo nome.
 * vincos: { nome, coluna, de?, ate?, nitidez } segue uma coluna de uma estação a outra (por padrão, por todas as
 *         estações em que ela existe, e no anel fechado volta ao primeiro ponto); { nome, estacao, de?, ate?, nitidez }
 *         segue uma estação de uma coluna a outra. A nitidez passa ao passo como veio: de 0 a 1, 'viva' ou nome de PARAMS.
 * cantos e medidas: listas de { estacao?, coluna? }; só a estação marca a estação inteira, só a coluna marca a coluna
 *         inteira, e os dois marcam um ponto. A medida aceita `peso` (número maior que zero ou nome de PARAMS), e os
 *         pontos dela saem como { ponto, peso }, a cota que a superfície aproxima sem passar; sem peso, a cota é exata.
 *         O mesmo ponto marcado por duas medidas com pesos diferentes grita.
 * leitura: true | { peso?, erro?, inclinacao?, estrito? } declara que as estações e as colunas da gaiola vêm de leitura de imagem,
 *         com erro. Cota lida de imagem que passa exata por cada ponto copia o erro em rugas, e por isso, com `leitura`, a medida
 *         sem `peso` ganha o peso da leitura (`peso`, 1 por padrão: o desvio à cota pesa o mesmo que o deslocamento de um ponto
 *         da gaiola) em vez de ser exata. A cota de projeto que a peça precisa acertar se declara `exata: true` na medida, e o
 *         `peso` próprio da medida vale mais que o da leitura; a declaração de uma medida vence o padrão da leitura sobre o mesmo
 *         ponto, e duas declarações com pesos diferentes sobre o ponto gritam. Sem `leitura`, a medida sem peso continua exata, e
 *         a receita salva antes dela tem o mesmo significado. A leitura também confere o espaçamento das estações-chave (as que
 *         declaram colunas): `erro` é o erro de leitura em mm (2 por padrão), duas leituras vizinhas diferem até 2 × erro, e duas
 *         estações a `espacamento` mm uma da outra têm inclinação 2 × erro / espacamento por causa só do erro. Acima de `inclinacao`
 *         (0,1 por padrão) a gaiola avisa pelo nome das duas estações e diz o espaçamento mínimo recomendado, 2 × erro / inclinacao
 *         mm; o aviso sai em `avisos` (`ref: 'estacoesProximas'`) e a ferramenta de ondulação o relata. Com `estrito: true` o aviso
 *         vira erro, que cita todos os pares.
 * borda livre: a borda da gaiola é aberta, e o passo escolhe a regra dela por `borda`, como em qualquer gaiola.
 * simetria: 'x' declara a metade x >= 0, que o passo espelha antes de subdividir; ponto com x < 0 grita, e a aresta no
 *         plano x = 0 precisa ser borda da metade, para a costura sair com duas faces.
 * curvas e interpolar: opções em `gaiola-interpolada.js`. `curvas` declara colunas a frações fixas do comprimento de uma
 *         curva de seção, que cada estação dá por pontos-chave; `interpolar` preenche as estações sem colunas, e com
 *         `passo` gera as que faltam, pela interpolação monótona das colunas entre as estações-chave. Com `interpolar`,
 *         `chaves: true` num seletor de cantos ou medidas marca só as estações-chave, e a estação gerada não é citável.
 *
 * origens, entradas e estrutura: informação a mais na saída, para quem edita a gaiola por nome (a ferramenta de alisamento).
 *         `origens` dá, de cada ponto, de onde ele vem: { tipo: 'declarada', estacao, coluna, entrada } para a coluna escrita
 *         em `em`; { tipo: 'curva', curva, estacao, coluna, fracao, pontosChave } para a coluna amostrada numa curva de
 *         seção; { tipo: 'gerada' (pelo passo) ou 'interpolada' (estação declarada sem colunas), estacao, coluna, chaves,
 *         fracao, nos } para a coluna que a interpolação preencheu. `entradas` lista os valores editáveis, cada coordenada
 *         [u, v, w] de uma coluna declarada ('estacao/coluna.u') e de um ponto-chave de uma curva ('estacao/curva[k].v'),
 *         com o valor escrito; o ponto de origem 'curva' ou 'gerada' não tem entrada própria, e mexer nele é mexer nas
 *         entradas de que ele sai. `estrutura` é o resumo do que não é entrada (estações e posições, nomes das colunas,
 *         curvas, interpolação, vincos, vãos, medidas), para comparar duas execuções. `capturarGaiolas(fn)` devolve as
 *         saídas das gaiolas montadas durante a chamada de `fn`, para ler essa informação de uma receita pronta.
 *
 * A ordem de saída é determinística: os pontos por estação, na ordem declarada, e dentro dela por coluna; as faces por
 * estação, cada uma com as que ela fecha contra a frente aberta, da primeira coluna à última, e as do fechamento do
 * anel por último; vincos, cantos e medidas na ordem declarada e dos pontos. */

import { capturarGaiolas, registrarGaiola } from './gaiola-captura.js';
import { chaveDaColuna, entradasDaDefinicao, expandirEstacoes } from './gaiola-interpolada.js';
import { construirAneis, extraordinarios, lerAneis } from './gaiola-aneis.js';

const EIXOS = ['x', 'y', 'z'];
const TOLERANCIA_DA_COSTURA = 1e-9;
const MAIOR_FACE = 5;
const MM = 1000;

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
    if (e.colunas == null) falha(`a estação ${citar(nome)} não tem colunas; declare as colunas, ou interpolar para que elas saiam das estações-chave`);
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
function conferirRegioes(regioes, lidas, citavel) {
  const indiceDaEstacao = new Map(lidas.map((e, k) => [e.nome, k]));
  for (const R of regioes.values()) {
    for (const e of R.estacoes) {
      citavel(e, `a região ${citar(R.nome)}`);
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

function lerVaos(vaos, lidas, citavel) {
  if (vaos == null) return [];
  if (!Array.isArray(vaos)) falha('vaos precisa ser lista de { nome, estacoes: [de, ate], colunas: [de, ate] }');
  const nomes = new Set();
  const indiceDaEstacao = new Map(lidas.map((e, k) => [e.nome, k]));
  return vaos.map((v, n) => {
    exigirCampos(v, ['nome', 'estacoes', 'colunas', 'livre'], `o vão ${n}`);
    const nome = exigirNome(v.nome, `o vão ${n}`);
    if (nomes.has(nome)) falha(`o nome de vão ${citar(nome)} aparece mais de uma vez`);
    nomes.add(nome);
    const par = (x, campo) => {
      if (!Array.isArray(x) || x.length !== 2 || x.some((y) => typeof y !== 'string')) falha(`o vão ${citar(nome)} precisa de ${campo}: [de, ate], dois nomes`);
      return x;
    };
    const [e0, e1] = par(v.estacoes, 'estacoes');
    const colunas = par(v.colunas, 'colunas');
    for (const e of [e0, e1]) { citavel(e, `o vão ${citar(nome)}`); if (!indiceDaEstacao.has(e)) falha(`o vão ${citar(nome)} cita a estação ${citar(e)}, que não existe`); }
    const i0 = indiceDaEstacao.get(e0), i1 = indiceDaEstacao.get(e1);
    if (!(i0 < i1)) falha(`o vão ${citar(nome)} vai da estação ${citar(e0)} à ${citar(e1)}, que precisa vir depois`);
    const livre = v.livre ?? false;
    if (livre !== true && livre !== false) falha(`o vão ${citar(nome)} aceita livre só como true ou false`);
    return { nome, i0, i1, colunas, livre, dentro: new Set() };
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
    /* no vão de borda livre a primeira coluna pode ter terminado: o vão começa então na primeira coluna da estação */
    const p0 = v.livre && maisNova(frente, c0) < 0 ? frente.findIndex((e) => e.k === E.k) : maisNova(frente, c0);
    const p1 = maisNova(frente, c1);
    for (const [c, p] of [[c0, p0], [c1, p1]]) if (p < 0) falha(`o vão ${citar(v.nome)} cita a coluna ${citar(c)}, que a estação ${citar(E.nome)} não tem`);
    if (v.livre ? p0 > p1 : !(p0 < p1)) falha(`o vão ${citar(v.nome)} vai da coluna ${citar(c0)} à ${citar(c1)}, que na estação ${citar(E.nome)} precisa vir depois`);
    frente.forEach((e, q) => { if (e.k === E.k && q >= p0 && q <= p1) v.dentro.add(e.ponto); });
  }
}

/* A volta de um anel que um vinco, um canto ou uma medida cita: a lista dos nomes dos pontos dela. */
function voltaDoAnel(aneis, anel, volta, onde) {
  const a = aneis?.porNome.get(anel);
  if (!a) falha(`${onde} cita o anel ${citar(anel)}, que não existe; os anéis declarados são ${aneis?.porNome.size ? lista([...aneis.porNome.keys()]) : 'nenhum'}`);
  if (volta == null) falha(`${onde} cita o anel ${citar(anel)} sem volta; declare volta de 1 a ${a.voltas.length}`);
  if (!Number.isInteger(volta) || volta < 1 || volta > a.voltas.length) falha(`${onde} cita a volta ${volta} do anel ${citar(anel)}, que vai de 1 a ${a.voltas.length}`);
  return a.voltas[volta - 1];
}

/* A linha de um vinco: os pontos em sequência, ao longo de uma coluna, de uma estação ou de uma volta de anel (que fechada repete o primeiro). */
function linhaDoVinco(v, nome, lidas, fechada, citavel, aneis) {
  const indiceDaEstacao = new Map(lidas.map((e, k) => [e.nome, k]));
  if (v.anel != null) {
    if (v.coluna != null || v.estacao != null || v.de != null || v.ate != null) falha(`o vinco ${citar(nome)} segue uma volta de anel: declare só anel e volta`);
    const ponts = voltaDoAnel(aneis, v.anel, v.volta, `o vinco ${citar(nome)}`);
    const a = aneis.porNome.get(v.anel);
    return a.fechada ? [...ponts, ponts[0]] : [...ponts];
  }
  if (v.volta != null) falha(`o vinco ${citar(nome)} declara volta sem anel`);
  if ((v.coluna == null) === (v.estacao == null)) falha(`o vinco ${citar(nome)} segue uma coluna ou uma estação: declare coluna ou estacao, um dos dois`);
  if (v.coluna != null) {
    const col = exigirNome(v.coluna, `a coluna do vinco ${citar(nome)}`);
    const tem = lidas.map((e, k) => (e.indice.has(col) ? k : -1)).filter((k) => k >= 0);
    if (!tem.length) falha(`o vinco ${citar(nome)} segue a coluna ${citar(col)}, que nenhuma estação tem`);
    const estacao = (e, padrao) => {
      if (e == null) return padrao;
      citavel(e, `o vinco ${citar(nome)}`);
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
  citavel(est, `o vinco ${citar(nome)}`);
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

function lerVincos(vincos, lidas, arestas, fechada, citavel, aneis) {
  if (vincos == null) return [];
  if (!Array.isArray(vincos)) falha('vincos precisa ser lista de vincos nomeados');
  const nomes = new Set();
  return vincos.map((v, n) => {
    exigirCampos(v, ['nome', 'coluna', 'estacao', 'anel', 'volta', 'de', 'ate', 'nitidez'], `o vinco ${n}`);
    const nome = exigirNome(v.nome, `o vinco ${n}`);
    if (nomes.has(nome)) falha(`o nome de vinco ${citar(nome)} aparece mais de uma vez`);
    nomes.add(nome);
    const ok = v.nitidez === 'viva' || (typeof v.nitidez === 'string' && v.nitidez) || (typeof v.nitidez === 'number' && v.nitidez >= 0 && v.nitidez <= 1);
    if (!ok) falha(`o vinco ${citar(nome)} precisa de nitidez de 0 a 1, 'viva' ou nome de PARAMS`);
    const pontos = linhaDoVinco(v, nome, lidas, fechada, citavel, aneis);
    for (let k = 0; k + 1 < pontos.length; k++) {
      if (!arestas.has(chave(pontos[k], pontos[k + 1]))) falha(`o vinco ${citar(nome)} liga ${citar(pontos[k])} a ${citar(pontos[k + 1])}, que não formam aresta da gaiola (um vão, uma fusão ou uma divisão tirou essa aresta${aneis && [...aneis.porNome.values()].some((a) => a.anel.fora) ? '; e um anel de recuo 0 troca a faixa de faces em volta do seu vão, com as arestas dela' : ''})`);
    }
    return { nome, pontos, nitidez: v.nitidez };
  });
}

/* A leitura de imagem declarada: o peso que a medida sem peso ganha, o erro de leitura em mm e o limiar de inclinação a
   partir do qual duas estações-chave vizinhas ganham aviso. */
export const LEITURA_PADRAO = Object.freeze({ peso: 1, erro: 2, inclinacao: 0.1, estrito: false });

function lerLeitura(l) {
  if (l == null || l === false) return null;
  const x = l === true ? {} : l;
  exigirCampos(x, ['peso', 'erro', 'inclinacao', 'estrito'], 'a leitura');
  const o = { ...LEITURA_PADRAO, ...Object.fromEntries(Object.entries(x).filter(([, v]) => v != null)) };
  if (!(typeof o.peso === 'string' && o.peso) && !(typeof o.peso === 'number' && Number.isFinite(o.peso) && o.peso > 0)) falha(`a leitura tem peso ${JSON.stringify(o.peso)}; o peso é número finito maior que zero ou nome de PARAMS`);
  for (const campo of ['erro', 'inclinacao']) {
    if (typeof o[campo] !== 'number' || !Number.isFinite(o[campo]) || !(o[campo] > 0)) falha(`a leitura tem ${campo} ${JSON.stringify(o[campo])}; ${campo} é número finito maior que zero${campo === 'erro' ? ', o erro de leitura em mm' : ', a inclinação a partir da qual o erro sozinho mexe a superfície'}`);
  }
  if (typeof o.estrito !== 'boolean') falha('a leitura precisa de estrito: true ou false');
  return o;
}

/* Duas estações-chave vizinhas mais perto do que o erro de leitura sustenta: a diferença que duas leituras podem ter só pelo
   erro (2 × erro) dividida pelo espaçamento dá a inclinação que o erro sozinho põe na superfície. Acima do limiar, avisa. */
function avisosDeEstacoesProximas(chaves, E, leitura) {
  const avisos = [];
  const total = E.reto ? 1 : E.acum[E.trechos];
  const escala = E.reto ? MM : MM * total;
  const diferenca = 2 * leitura.erro;
  const minimo = diferenca / leitura.inclinacao;
  const par = (a, b, fracao) => {
    const espacamento = fracao * escala;
    const inclinacao = diferenca / espacamento;
    if (!(inclinacao > leitura.inclinacao * (1 + 1e-9))) return;
    const mm = (x) => (Math.round(x * 10) / 10);
    const br = (x) => String(x).replace('.', ',');
    avisos.push({
      ref: 'estacoesProximas', estacoes: [a.nome, b.nome], espacamentoMm: mm(espacamento), minimoRecomendadoMm: mm(minimo), inclinacao: Math.round(inclinacao * 100) / 100,
      texto: `as estações-chave ${citar(a.nome)} e ${citar(b.nome)} ficam a ${br(mm(espacamento))} mm uma da outra, e leituras que diferem até ${br(diferenca)} mm (erro de ${br(leitura.erro)} mm) dão inclinação ${br(Math.round(inclinacao * 100) / 100)}, acima de ${br(leitura.inclinacao)}; o espaçamento mínimo recomendado é ${br(mm(minimo))} mm, então funda as duas numa estação ou afaste-as`,
    });
  };
  for (let k = 1; k < chaves.length; k++) par(chaves[k - 1], chaves[k], chaves[k].em - chaves[k - 1].em);
  if (E.fechada && chaves.length > 2) par(chaves[chaves.length - 1], chaves[0], 1 - chaves[chaves.length - 1].em + chaves[0].em);
  return avisos;
}

/* cantos e medidas: { estacao?, coluna?, chaves? } vira a lista dos pontos marcados, na ordem dos pontos. Nas medidas,
   `peso` passa ao passo, e o ponto com peso sai como { ponto, peso }. Com `leitura`, a medida sem `peso` ganha o peso da
   leitura, salvo `exata: true`; a declaração (`peso` ou `exata`) vence esse padrão sobre o mesmo ponto, e duas declarações
   de pesos diferentes gritam. `chaves: true` restringe às estações-chave da interpolação. */
function marcar(seletores, campo, lidas, vertices, citavel, chaves, aneis, leitura) {
  if (seletores == null) return null;
  if (!Array.isArray(seletores) || !seletores.length) falha(`${campo} precisa ser lista não vazia de { estacao, coluna }`);
  const medidas = campo === 'medidas';
  const marcados = new Set(); const pesos = new Map();
  const indiceDaEstacao = new Map(lidas.map((e, k) => [e.nome, k]));
  const lerPeso = (s, n) => {
    const peso = s.peso ?? null;
    if (peso !== null && !(typeof peso === 'string' || (typeof peso === 'number' && Number.isFinite(peso) && peso > 0))) falha(`${campo}[${n}] tem peso ${peso}; o peso é número finito maior que zero ou nome de PARAMS, e a medida sem peso é exata${leitura && medidas ? ' só com exata: true, e sem ele ganha o peso da leitura' : ''}`);
    if (s.exata != null && s.exata !== true && s.exata !== false) falha(`${campo}[${n}] aceita exata só como true ou false`);
    if (s.exata === true && peso !== null) falha(`${campo}[${n}] declara exata e peso; a cota exata não tem peso`);
    if (s.exata === true) return { valor: Infinity, declarado: true };
    if (peso !== null) return { valor: peso, declarado: true };
    return leitura && medidas ? { valor: leitura.peso, declarado: false } : { valor: Infinity, declarado: true };
  };
  const pesar = (p, peso, n) => {
    const antes = pesos.get(p);
    if (antes?.declarado && !peso.declarado) return;
    if (antes?.declarado && antes.valor !== peso.valor) falha(`${campo}[${n}] marca ${citar(p)} com outro peso que uma medida anterior`);
    pesos.set(p, peso);
  };
  for (const [n, s] of seletores.entries()) {
    exigirCampos(s, medidas ? ['estacao', 'coluna', 'anel', 'volta', 'peso', 'exata', 'chaves'] : ['estacao', 'coluna', 'anel', 'volta', 'chaves'], `${campo}[${n}]`);
    if (s.anel != null) {
      if (s.estacao != null || s.coluna != null || s.chaves != null) falha(`${campo}[${n}] marca um anel: declare anel, e volta se for uma só, sem estacao, coluna nem chaves`);
      const peso = lerPeso(s, n);
      const a = aneis?.porNome.get(s.anel);
      /* o anel inteiro não marca a volta 1 do anel de recuo 0: ela é a borda do vão, pontos da grade que as estações já marcam */
      const voltas = s.volta != null ? [voltaDoAnel(aneis, s.anel, s.volta, `${campo}[${n}]`)] : (a ? [...(a.anel.fora ? a.voltas.slice(1) : a.voltas), ...a.costuras] : voltaDoAnel(aneis, s.anel, 1, `${campo}[${n}]`));
      for (const p of voltas.flat()) { marcados.add(p); pesar(p, peso, n); }
      continue;
    }
    if (s.volta != null) falha(`${campo}[${n}] declara volta sem anel`);
    const soChaves = s.chaves ?? false;
    if (soChaves !== false && soChaves !== true) falha(`${campo}[${n}] aceita chaves só como true ou false`);
    if (soChaves && !chaves) falha(`${campo}[${n}] marca chaves: true, mas a gaiola não declara interpolar; sem interpolação toda estação declarada é chave`);
    if (s.estacao != null) citavel(s.estacao, `${campo}[${n}]`);
    const peso = lerPeso(s, n);
    if (s.estacao == null && s.coluna == null && !soChaves) falha(`${campo}[${n}] precisa de estacao, coluna ou os dois`);
    if (s.estacao != null && !indiceDaEstacao.has(s.estacao)) falha(`${campo}[${n}] cita a estação ${citar(s.estacao)}, que não existe`);
    if (soChaves && s.estacao != null && !chaves.has(s.estacao)) falha(`${campo}[${n}] marca chaves: true e cita a estação ${citar(s.estacao)}, que não é estação-chave`);
    const estacoes = (s.estacao != null ? [lidas[indiceDaEstacao.get(s.estacao)]] : lidas).filter((E) => !soChaves || chaves.has(E.nome));
    let achou = 0;
    for (const E of estacoes) {
      if (s.coluna != null && !E.indice.has(s.coluna)) continue;
      for (const c of E.colunas) {
        if (s.coluna != null && c.nome !== s.coluna) continue;
        marcados.add(c.ponto); pesar(c.ponto, peso, n); achou += 1;
      }
    }
    if (!achou) falha(`${campo}[${n}] cita a coluna ${citar(s.coluna)}, que ${s.estacao != null ? `a estação ${citar(s.estacao)} não tem` : `nenhuma estação${soChaves ? '-chave' : ''} tem`}`);
  }
  return vertices.filter((p) => marcados.has(p)).map((p) => (pesos.get(p).valor !== Infinity ? { ponto: p, peso: pesos.get(p).valor } : p));
}

export { capturarGaiolas };

/**
 * gaiolaPorEstacoes({ eixo, estacoes, regioes, vaos, aneis, vincos, cantos, medidas, leitura, simetria, virar, prefixo, curvas, interpolar })
 *   -> { pontos, passo, ponto(estacao, coluna), bordaDoVao(vao), regioes, origens, entradas, estrutura, estacoes?, aneis?, avisos? }
 * `pontos` vai para TOPO e `passo` se espalha no passo `subdivisao`: { vertices, faces, vincos, cantos?, medidas?,
 * simetria? }, tudo em nomes de ponto. `regioes` dá, para cada região, os nomes dos pontos dela, na ordem dos pontos.
 * `bordaDoVao(vao)` devolve os nomes dos pontos da borda do vão, em sequência ao longo das arestas da gaiola, com o
 * primeiro repetido no fim quando a borda volta sobre si: a linha que o friso (e a aba dele) segue; no vão com anel, a volta 1 dele.
 * Com `aneis`, `aneis[nome]` dá { vao, fechada, voltas, costuras, borda, extraordinarios }: os nomes dos pontos de cada volta e da transição,
 * a volta 1 e os vértices extraordinários { ponto, valencia, borda }. Com `interpolar`, `estacoes` lista { nome, em, tipo } de cada estação, com tipo 'chave', 'interpolada' (declarada sem
 * colunas), 'gerada' (pelo passo) ou 'parcial'.
 */
export function gaiolaPorEstacoes(definicao) {
  exigirCampos(definicao, ['eixo', 'estacoes', 'regioes', 'vaos', 'aneis', 'vincos', 'cantos', 'medidas', 'leitura', 'simetria', 'virar', 'prefixo', 'curvas', 'interpolar'], 'a definição da gaiola');
  const { simetria = null, virar = false, prefixo = '' } = definicao;
  const E = lerEixo(definicao.eixo);
  const leitura = lerLeitura(definicao.leitura);
  if (simetria !== null && simetria !== 'x') falha("simetria só aceita 'x'");
  if (typeof virar !== 'boolean') falha('virar precisa ser true ou false');
  if (typeof prefixo !== 'string') falha('prefixo precisa ser texto');
  const regioes = lerRegioes(definicao.regioes);
  const expandida = definicao.curvas != null || definicao.interpolar != null
    ? expandirEstacoes(definicao.estacoes, { interpolar: definicao.interpolar, curvas: definicao.curvas, regioes: definicao.regioes, fechada: E.fechada })
    : null;
  const geradas = expandida?.geradas ?? new Set();
  const chaves = definicao.interpolar != null ? expandida.chaves : null;
  const citavel = (nome, onde) => {
    if (geradas.has(nome)) falha(`${onde} cita a estação ${citar(nome)}, que a interpolação gerou pelo passo; o nome dela muda com o passo e não é identidade, então cite uma estação-chave ou declare a estação { nome, em } sem colunas`);
  };
  const { lidas, pontos, vertices } = lerEstacoes(expandida?.estacoes ?? definicao.estacoes, E, prefixo, regioes);
  conferirRegioes(regioes, lidas, citavel);
  const vaos = lerVaos(definicao.vaos, lidas, citavel);
  const aneisLidos = lerAneis(definicao.aneis, vaos.map((v) => v.nome));

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
    if (!tiradas && !v.livre) falha(`o vão ${citar(v.nome)} não tira nenhuma face; se a abertura é a borda livre que as colunas que terminam e começam deixam, declare livre: true no vão`);
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

  /* A borda de cada vão: as arestas das faces que ficaram e que uma face tirada do vão também tinha, percorridas no
     sentido da face que ficou (a chapa à esquerda de quem anda, vista de fora). */
  const bordasDosVaos = new Map();
  for (const v of vaos) {
    const dosTirados = new Set();
    for (const f of todas) {
      if (!f.vaos.includes(v.nome)) continue;
      const n = f.nomes;
      for (let k = 0; k < n.length; k++) dosTirados.add(chave(n[k], n[(k + 1) % n.length]));
    }
    /* o vão de borda livre não tira face: a borda dele é a borda livre da chapa entre os pontos do vão */
    if (v.livre) {
      for (const f of faces) {
        for (let k = 0; k < f.length; k++) { const a = f[k], b = f[(k + 1) % f.length]; if (v.dentro.has(a) && v.dentro.has(b)) dosTirados.add(chave(a, b)); }
      }
    }
    const seguinte = new Map(); const ordem = [];
    for (const f of faces) {
      for (let k = 0; k < f.length; k++) {
        const a = f[k], b = f[(k + 1) % f.length];
        if (!dosTirados.has(chave(a, b)) || arestas.get(chave(a, b)) !== 1) continue;
        if (seguinte.has(a)) falha(`a borda do vão ${citar(v.nome)} se bifurca no ponto ${citar(a)}; cite a linha pelos pontos`);
        seguinte.set(a, b); ordem.push(a);
      }
    }
    const chegadas = new Set(seguinte.values());
    const visitado = new Set(); const cadeias = [];
    const andar = (inicio) => {
      const cadeia = [inicio]; visitado.add(inicio);
      for (let atual = seguinte.get(inicio); atual !== undefined; atual = seguinte.get(atual)) {
        cadeia.push(atual);
        if (visitado.has(atual)) break;
        visitado.add(atual);
      }
      return cadeia;
    };
    for (const a of ordem) if (!chegadas.has(a) && !visitado.has(a)) cadeias.push(andar(a));
    for (const a of ordem) if (!visitado.has(a)) cadeias.push(andar(a));
    bordasDosVaos.set(v.nome, cadeias);
  }
  const caminhoDoVao = (nome) => {
    if (!bordasDosVaos.has(nome)) falha(`o vão ${citar(nome)} não existe; os vãos declarados são ${vaos.length ? lista(vaos.map((v) => v.nome)) : 'nenhum'}`);
    const cadeias = bordasDosVaos.get(nome);
    if (cadeias.length !== 1) falha(`a borda do vão ${citar(nome)} tem ${cadeias.length} trechos separados; cite cada linha pelos pontos`);
    return [...cadeias[0]];
  };

  /* Os anéis preenchem o vão por dentro e acrescentam pontos e faces; sem `aneis` nada disto roda. */
  const todosOsVertices = [...vertices];
  let aneis = null;
  if (aneisLidos.length) {
    const vizinhoLivre = (ponto, borda) => {
      const daBorda = new Set(borda);
      for (const f of faces) {
        for (let k = 0; k < f.length; k++) {
          const a = f[k], b = f[(k + 1) % f.length];
          if (arestas.get(chave(a, b)) !== 1) continue;
          if (a === ponto && !daBorda.has(b)) return b;
          if (b === ponto && !daBorda.has(a)) return a;
        }
      }
      return null;
    };
    const donoDoPonto = new Map();
    for (const S of lidas) for (const c of S.colunas) donoDoPonto.set(c.ponto, { estacao: S.nome, coluna: c.nome });
    const localizar = (p) => donoDoPonto.get(p) ?? null;
    const limitesDoVao = (nome) => {
      const v = vaos.find((x) => x.nome === nome);
      return { estacoes: [lidas[v.i0].nome, lidas[v.i1].nome], colunas: [...v.colunas] };
    };
    /* o limite do vão (coluna ou estação) em que a aresta fica, para o recuo por lado do anel */
    const ladoDaAresta = (nome, a, b) => {
      const L = limitesDoVao(nome); const la = localizar(a), lb = localizar(b);
      if (!la || !lb) return null;
      if (la.coluna === lb.coluna && L.colunas.includes(la.coluna)) return la.coluna;
      if (la.estacao === lb.estacao && L.estacoes.includes(la.estacao)) return la.estacao;
      return null;
    };
    aneis = construirAneis(aneisLidos, { pos: (p) => pontos[p], faces, bordaDoVao: caminhoDoVao, vizinhoLivre, limitesDoVao, ladoDaAresta, localizar, simetria });
    /* o anel de recuo 0 troca as faces da grade em volta do vão pelas suas, e os pontos que ficavam só nelas saem da gaiola */
    if (aneis.remover.length) {
      const sai = new Set(aneis.remover);
      for (let i = faces.length - 1; i >= 0; i--) if (sai.has(i)) faces.splice(i, 1);
      arestas.clear();
      for (const f of faces) for (let k = 0; k < f.length; k++) { const c = chave(f[k], f[(k + 1) % f.length]); arestas.set(c, (arestas.get(c) ?? 0) + 1); }
      const sem = new Set(aneis.removidos);
      for (let i = todosOsVertices.length - 1; i >= 0; i--) if (sem.has(todosOsVertices[i])) todosOsVertices.splice(i, 1);
    }
    for (const [n, q] of Object.entries(aneis.pontos)) {
      if (n in pontos) falha(`o ponto ${citar(n)} do anel já é ponto da gaiola; renomeie o anel`);
      pontos[n] = q; todosOsVertices.push(n);
    }
    for (const f of aneis.faces) {
      faces.push(f);
      for (let k = 0; k < f.length; k++) { const c = chave(f[k], f[(k + 1) % f.length]); arestas.set(c, (arestas.get(c) ?? 0) + 1); }
    }
  }

  if (simetria === 'x') {
    const negativos = todosOsVertices.filter((p) => pontos[p][0] < -TOLERANCIA_DA_COSTURA);
    if (negativos.length) falha(`na simetria em x a gaiola é a metade x >= 0, e ${negativos.length === 1 ? 'o ponto' : 'os pontos'} ${lista(negativos)} ${negativos.length === 1 ? 'tem' : 'têm'} x < 0`);
    const naCostura = (p) => Math.abs(pontos[p][0]) <= TOLERANCIA_DA_COSTURA;
    for (const f of faces) {
      for (let k = 0; k < f.length; k++) {
        const a = f[k], b = f[(k + 1) % f.length];
        if (naCostura(a) && naCostura(b) && arestas.get(chave(a, b)) !== 1) falha(`na simetria em x a aresta ${citar(a)}-${citar(b)} fica no plano x = 0 e tem duas faces na metade; a costura precisa ser borda da metade`);
      }
    }
  }

  const vincos = lerVincos(definicao.vincos, lidas, arestas, E.fechada, citavel, aneis);
  const cantos = marcar(definicao.cantos, 'cantos', lidas, todosOsVertices, citavel, chaves, aneis, null);
  const medidas = marcar(definicao.medidas, 'medidas', lidas, todosOsVertices, citavel, chaves, aneis, leitura);
  let avisos = null;
  if (leitura) {
    const doEixo = lidas.filter((S) => S.regiao === null && (expandida ? expandida.tipos.get(S.nome) === 'chave' : true));
    avisos = avisosDeEstacoesProximas(doEixo, E, leitura);
    if (leitura.estrito && avisos.length) falha(`a leitura é estrita e ${avisos.length === 1 ? 'um par de estações-chave está' : `${avisos.length} pares de estações-chave estão`} mais perto do que o erro de leitura sustenta: ${avisos.map((a) => a.texto).join('; ')}`);
  }
  const passo = { vertices: [...todosOsVertices], faces, vincos };
  if (cantos) passo.cantos = cantos;
  if (medidas) passo.medidas = medidas;
  if (simetria) passo.simetria = simetria;
  const indiceDaEstacao = new Map(lidas.map((e) => [e.nome, e]));
  const bordaDoVao = (nome) => {
    const caminho = caminhoDoVao(nome);
    const doAnel = aneis ? [...aneis.porNome.values()].find((a) => a.vao === nome) : null;
    return doAnel ? [...doAnel.borda] : caminho;
  };
  const ponto = (estacao, coluna) => {
    citavel(estacao, 'ponto()');
    const S = indiceDaEstacao.get(estacao);
    if (!S) falha(`a estação ${citar(estacao)} não existe`);
    if (!S.indice.has(coluna)) falha(`a estação ${citar(estacao)} não tem a coluna ${citar(coluna)}`);
    return S.colunas[S.indice.get(coluna)].ponto;
  };
  const porRegiao = Object.fromEntries([...regioes.values()].map((R) => [R.nome, vertices.filter((p) => R.pontos.includes(p))]));
  const origens = {};
  for (const S of lidas) for (const c of S.colunas) {
    origens[c.ponto] = expandida?.origens.get(chaveDaColuna(S.nome, c.nome)) ?? { tipo: 'declarada', estacao: S.nome, coluna: c.nome, entrada: `${S.nome}/${c.nome}` };
  }
  const extraordinariosDosAneis = {};
  if (aneis) {
    for (const a of aneis.porNome.values()) {
      Object.assign(origens, a.origens);
      const dosAneis = new Set([...a.ancoras, ...a.voltas.flat(), ...a.costuras.flat(), ...a.grade]);
      extraordinariosDosAneis[a.anel.nome] = extraordinarios(todosOsVertices.filter((p) => dosAneis.has(p)), faces);
    }
  }
  const { estacoes: _estacoes, ...demais } = definicao;
  const estrutura = {
    definicao: demais,
    estacoes: lidas.map((S) => ({ nome: S.nome, em: S.em, regiao: S.regiao, colunas: S.colunas.map((c) => [c.nome, c.de, c.comeca, c.termina, c.regiao]) })),
  };
  const saida = { pontos, passo, ponto, bordaDoVao, regioes: porRegiao, origens, entradas: entradasDaDefinicao(definicao.estacoes), estrutura };
  if (aneis) {
    saida.aneis = Object.fromEntries([...aneis.porNome.values()].map((a) => [a.anel.nome, {
      vao: a.vao, fechada: a.fechada, ...(a.anel.fora ? { fora: true, camadas: a.camadas, grade: [...a.grade] } : {}), voltas: a.voltas.map((v) => [...v]), costuras: a.costuras.map((v) => [...v]), borda: [...a.borda], extraordinarios: extraordinariosDosAneis[a.anel.nome],
    }]));
  }
  if (avisos) saida.avisos = avisos;
  if (chaves) saida.estacoes = lidas.map((e) => ({ nome: e.nome, em: e.em, tipo: expandida.tipos.get(e.nome) }));
  registrarGaiola(saida);
  return saida;
}
