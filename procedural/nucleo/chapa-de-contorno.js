/* chapa-de-contorno.js — a chapa de espessura dada por um contorno 2D fechado, com chanfro, quina quebrada e canto arredondado por trecho
 *
 * FICHA chapaDeContorno
 * serve: gaiola de uma chapa sólida a partir de um contorno 2D fechado em mm (pontos nomeados em trechos) e de uma espessura; o chanfro de
 *   borda (a largura e a espessura que resta no gume), a quina quebrada e o raio de um canto são opções declaradas, sem escrever os laços.
 * quando: chapa de aresta dura (lâmina, aba, calço, placa) em que o contorno é desenho e a borda é chanfrada ou quebrada; devolve o que
 *   gaiolaPorLacos devolve, e o passo vai a `subdivisao` com niveis 0 (chapa plana) ou mais. Para um corpo de seção que varia ao longo de
 *   um eixo use corpoDeSecaoVariavel, e para um contorno sem espessura, gaiolaPorEstacoes.
 * unidades: contorno, espessura, `em`, passo e larguras em mm; `pontos` sai em metro, para pôr em TOPO.
 * campos:
 *   nome: prefixo dos pontos (texto), como em gaiolaPorLacos.
 *   eixo: 'x', 'y' ou 'z', a normal da chapa (padrão 'y'); o ponto [u, v] do contorno são os outros dois eixos na ordem x, y, z.
 *   em: o plano médio da chapa sobre o eixo, em mm (padrão 0).
 *   espessura: a espessura da chapa, em mm.
 *   trechos: [{ nome, pontos, pontosNoTrecho?, passo?, chanfro?, quinaQuebrada?, grupo? }] o contorno em ordem, anti-horário ou horário; o
 *     primeiro ponto de um trecho é o último do anterior e o último do último é o primeiro do primeiro. Um trecho de um ponto só é uma ponta.
 *     chanfro { largura, resta?, entrada?, saida?, limite? }: no trecho, cada face da chapa recua `largura` mm para dentro (medida
 *     perpendicular ao contorno) e a borda fica com `resta` mm de espessura (0, o gume). entrada e saida, em mm do trecho, fazem a
 *     largura crescer de 0 no começo e cair a 0 no fim. limite { fracao, contra: [trechos] } nunca deixa a largura passar de fracao da
 *     distância do ponto aos trechos citados (a largura da chapa ali).
 *     recuoEm: 'normal' (padrão: a largura é perpendicular ao contorno), 'u' ou 'v' (a largura é medida ao longo desse eixo do contorno).
 *     quinaQuebrada { largura, altura?, entrada?, saida?, limite?, recuoEm? }: o mesmo recuo, mas a borda mantém a espessura menos `altura` (padrão
 *     a largura) de cada lado, quebrando só a quina. grupo: nome do conjunto de faces do trecho, para `parte` ou material.
 *     pontosNoTrecho fixa o número de pontos do trecho (de 1 mais o número de segmentos para cima); passo (mm) vale só nele.
 *   tampa: { de, ate } os trechos entre os quais a escada tampa as faces da chapa, como em gaiolaPorLacos; o número de pontos das duas
 *     cadeias é igualado aqui.
 *   passo: o espaçamento dos pontos ao longo dos trechos, em mm (padrão 5).
 *   raioDoCanto: [{ em: [u, v], raio }] arredonda o vértice do contorno em [u, v], dentro de um trecho, com um arco tangente de `raio` mm.
 *   afinar: { coordenada, de, ate, espessuraFinal } a espessura cai linearmente de `espessura` a `espessuraFinal` entre `de` e `ate`,
 *     medidos na coordenada 'u' ou 'v' do contorno; pontosMm, alvosMm e `lacos[].afinada` acompanham.
 * devolve: { pontos, pontosMm, alvosMm, passo, nomeDe, lacos, trechos, avisos, chapa }, o de gaiolaPorLacos mais `chapa`: { niveis,
 *   trechos: [{ nome, pontos }] } com as alturas dos laços em relação ao plano médio e os pontos de cada trecho.
 * exemplo:
 *   chapaDeContorno({ nome: 'p', eixo: 'y', espessura: 6, tampa: { de: 'base', ate: 'topo' }, passo: 20,
 *     trechos: [{ nome: 'base', pontos: [[0, 0], [0, 60]] }, { nome: 'esq', pontos: [[0, 60], [100, 60]], chanfro: { largura: 10 } },
 *       { nome: 'topo', pontos: [[100, 60], [100, 0]] }, { nome: 'dir', pontos: [[100, 0], [0, 0]], quinaQuebrada: { largura: 1.5 } }] })
 * peça: procedural/pecas/kukri/receita.js (a lâmina: chanfro do gume, quina quebrada do dorso e o raio da quebra do dorso).
 * FIM DA FICHA
 *
 * Função pura, sem Three.js e sem domínio. COMO SAI. A espessura é cortada em laços paralelos ao plano médio, um por altura em que alguma
 * borda muda de inclinação: as duas faces da chapa (±espessura/2), a altura `resta/2` de cada chanfro (0 no gume) e a altura
 * `espessura/2 - altura` de cada quina quebrada. Em cada laço o contorno de cada trecho recua para dentro `largura` vezes a fração de
 * subida entre essa altura e a face (0 na altura da borda, 1 na face), e nos vértices o recuo é a interseção das retas recuadas dos
 * dois segmentos vizinhos, com a distância limitada a 3 vezes a maior largura. Duas bordas chanfradas que se encontram numa ponta
 * fecham nela: o recuo na ponta se anula pelo `limite` ou pela interseção das duas retas, e o laço que se cruza é recusado com o trecho.
 * Os trechos de um laço vão a gaiolaPorLacos com vinco vivo na volta inteira de cada laço, a faixa de laços de uma borda chanfrada fica
 * plana (niveis 0 em subdivisao) e o grupo de um trecho vira grupo de faces.
 *
 * O CONTORNO. Cada segmento do trecho (já com os arcos de `raioDoCanto`, de no máximo 10 graus cada) é repartido por igual em passos de `passo`
 * mm, no mínimo um, e os vértices dados ficam onde estão; `entrada` e `saida` do chanfro ganham um ponto na distância dita. Cada segmento
 * vai a gaiolaPorLacos como um trecho próprio (nome `${trecho}_${i}_`), para a reamostragem dela não mover os vértices; os trechos `de` e
 * `ate` da tampa e os de um ponto só vão inteiros e reamostrados por igual. As duas cadeias da tampa ganham o mesmo número de pontos pelo
 * segmento de maior passo de cada cadeia. Onde um chanfro encontra um trecho sem borda e a largura passa do vizinho, os pontos do vizinho
 * que o recuo ultrapassa se juntam no ponto da interseção das retas recuadas.
 *
 * AS RECUSAS. Nome de trecho que termina em _número_ (reservado), borda com recuoEm cujo segmento é paralelo ao eixo (a largura efetiva cai abaixo
 * do limite de face fina), contorno aberto, trecho que não continua o anterior, contorno que se cruza, se toca num vértice ou volta sobre si, espessura ou
 * largura não positiva, `resta` ou `altura` fora de (0, espessura) e alturas de borda que deixam entre dois laços menos que o limite de face
 * fina vezes o passo (a recusa diz o campo e o trecho), canto num encontro de trechos ou perto demais do vizinho ou de outro canto para o
 * raio (a recusa diz o raio que cabe), trecho citado que não existe e laço recuado que se cruza ou muda de sentido (a recusa diz os dois
 * trechos e os vértices) são recusados com o passo, o valor recebido e o limite. */
import { gaiolaPorLacos } from './gaiola-por-lacos.js';
import { LIMITE_DE_FACE_FINA } from './topologia.js';

const MM = 1000;
const EIXOS = { x: 0, y: 1, z: 2 };
const TOL = 1e-3;
const LIMITE_DA_ESQUADRIA = 3;
const PASSO_DO_ARCO_GRAUS = 10;
const falha = (texto) => { throw new RangeError(`chapaDeContorno: ${texto}`); };
const br = (x, casas = 2) => Number(x).toFixed(casas).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '').replace('.', ',');
const citar = (x) => `'${x}'`;
const pt = (p) => `[${br(p[0])}, ${br(p[1])}]`;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const numero = (x) => typeof x === 'number' && Number.isFinite(x);
const positivo = (x) => numero(x) && x > 0;
const ponto2 = (p) => Array.isArray(p) && p.length === 2 && numero(p[0]) && numero(p[1]);

function comprimento(poli) {
  let s = 0;
  for (let k = 1; k < poli.length; k++) s += dist(poli[k - 1], poli[k]);
  return s;
}

/* n pontos por igual ao longo da polilinha, as pontas nos lugares dados */
function reamostrar(poli, n) {
  if (poli.length === 1 || n <= 1) return [[...poli[0]]];
  const s = [0];
  for (let k = 1; k < poli.length; k++) s.push(s[k - 1] + dist(poli[k - 1], poli[k]));
  const total = s[s.length - 1];
  const saida = [[...poli[0]]];
  let j = 0;
  for (let i = 1; i < n - 1; i++) {
    const alvo = (total * i) / (n - 1);
    while (j < s.length - 2 && s[j + 1] < alvo) j++;
    const d = s[j + 1] - s[j];
    const t = d > 0 ? (alvo - s[j]) / d : 0;
    saida.push([poli[j][0] + (poli[j + 1][0] - poli[j][0]) * t, poli[j][1] + (poli[j + 1][1] - poli[j][1]) * t]);
  }
  saida.push([...poli[poli.length - 1]]);
  return saida;
}

function distanciaAoSegmento(p, a, b) {
  const dx = b[0] - a[0]; const dy = b[1] - a[1];
  const q = dx * dx + dy * dy;
  const t = q > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / q)) : 0;
  return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dy * t));
}
const distanciaAPolilinha = (p, poli) => {
  if (poli.length === 1) return dist(p, poli[0]);
  let m = Infinity;
  for (let k = 1; k < poli.length; k++) m = Math.min(m, distanciaAoSegmento(p, poli[k - 1], poli[k]));
  return m;
};

const areaComSinal = (poli) => {
  let a = 0;
  for (let k = 0; k < poli.length; k++) { const p = poli[k]; const q = poli[(k + 1) % poli.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
};

/* a menor distância entre dois segmentos: 0 se se cruzam, se se tocam ou se se sobrepõem */
function distanciaEntreSegmentos(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(a, b, c); const d2 = o(a, b, d); const d3 = o(c, d, a); const d4 = o(c, d, b);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return 0;
  return Math.min(distanciaAoSegmento(a, c, d), distanciaAoSegmento(b, c, d), distanciaAoSegmento(c, a, b), distanciaAoSegmento(d, a, b));
}
const TOQUE = 1e-4;
/* o primeiro par de segmentos não vizinhos que se cruzam, se tocam ou se sobrepõem: [i, j] (índices dos segmentos), ou null */
function seAutoCruza(poli) {
  const n = poli.length;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (distanciaEntreSegmentos(poli[i], poli[(i + 1) % n], poli[j], poli[(j + 1) % n]) < TOQUE) return [i, j];
  }
  return null;
}
/* o ponto repetido dentro de um trecho vira um só (o de um trecho de um ponto, ou de pontos todos iguais, fica como está) */
const semRepetidosNoTrecho = (poli) => {
  const r = poli.filter((p, i) => i === 0 || dist(p, poli[i - 1]) > TOL);
  return r.length ? r : [poli[0]];
};
const semRepetidos = (poli) => {
  const r = [];
  poli.forEach((p, i) => { if (i === 0 || dist(p, r[r.length - 1]) > 1e-6) r.push(p); });
  while (r.length > 1 && dist(r[0], r[r.length - 1]) <= 1e-6) r.pop();
  return r;
};

/* O arco tangente de raio r no vértice b, entre os pontos a e c: os pontos do arco, de b e do raio, e a tangente t. */
function geometriaDoCanto(a, b, c, r) {
  const u1 = [(b[0] - a[0]) / dist(a, b), (b[1] - a[1]) / dist(a, b)];
  const u2 = [(c[0] - b[0]) / dist(b, c), (c[1] - b[1]) / dist(b, c)];
  const giro = Math.atan2(u1[0] * u2[1] - u1[1] * u2[0], u1[0] * u2[0] + u1[1] * u2[1]);
  return { u1, giro, t: Math.abs(giro) < 1e-6 ? 0 : r * Math.tan(Math.abs(giro) / 2) };
}
function pontosDoArco(b, g, r) {
  if (g.t === 0) return [b];
  const t1 = [b[0] - g.u1[0] * g.t, b[1] - g.u1[1] * g.t];
  const lado = Math.sign(g.giro);
  const centro = [t1[0] - g.u1[1] * r * lado, t1[1] + g.u1[0] * r * lado];
  const segmentos = Math.max(2, Math.ceil((Math.abs(g.giro) * 180) / Math.PI / PASSO_DO_ARCO_GRAUS));
  const a0 = Math.atan2(t1[1] - centro[1], t1[0] - centro[0]);
  return Array.from({ length: segmentos + 1 }, (_, k) => {
    const ang = a0 + (g.giro * k) / segmentos;
    return [centro[0] + r * Math.cos(ang), centro[1] + r * Math.sin(ang)];
  });
}

function lerBorda(t, onde, nomes) {
  const bordas = ['chanfro', 'quinaQuebrada'].filter((k) => t[k] != null);
  if (bordas.length > 1) falha(`${onde} tem chanfro e quinaQuebrada: escolha um por trecho`);
  if (!bordas.length) return null;
  const tipo = bordas[0];
  const b = t[tipo];
  const ond = `${onde}.${tipo}`;
  if (!b || typeof b !== 'object') falha(`${ond} é um objeto { largura, ... }, e veio ${JSON.stringify(b)}`);
  if (!positivo(b.largura)) falha(`${ond}.largura é número positivo em mm, e veio ${JSON.stringify(b.largura)}`);
  for (const k of ['resta', 'altura', 'entrada', 'saida']) if (b[k] != null && !(numero(b[k]) && b[k] >= 0)) falha(`${ond}.${k} é número não negativo, e veio ${JSON.stringify(b[k])}`);
  if (tipo === 'chanfro' && b.altura != null) falha(`${ond}.altura não existe no chanfro: a espessura que resta na borda é resta`);
  if (tipo === 'quinaQuebrada' && b.resta != null) falha(`${ond}.resta não existe na quina quebrada: a altura da quebra é altura`);
  let limite = null;
  if (b.limite != null) {
    if (!positivo(b.limite.fracao) || !Array.isArray(b.limite.contra) || !b.limite.contra.length) falha(`${ond}.limite é { fracao, contra: [trechos] } com fracao positiva, e veio ${JSON.stringify(b.limite)}`);
    for (const c of b.limite.contra) if (!nomes.has(c)) falha(`${ond}.limite.contra cita o trecho ${citar(c)}, que não existe (${[...nomes].join(', ')})`);
    limite = { fracao: b.limite.fracao, contra: b.limite.contra };
  }
  if (b.recuoEm != null && !['normal', 'u', 'v'].includes(b.recuoEm)) falha(`${ond}.recuoEm é 'normal' (padrão), 'u' ou 'v', e veio ${JSON.stringify(b.recuoEm)}`);
  return { tipo, recuoEm: b.recuoEm ?? 'normal', largura: b.largura, resta: b.resta ?? 0, altura: b.altura ?? b.largura, entrada: b.entrada ?? 0, saida: b.saida ?? 0, limite };
}

/* a interseção das retas recuadas dos segmentos que chegam e saem do vértice v, ou o recuo médio quando são paralelas; limitada pela esquadria */
function pontoRecuado(v, dirA, dirB, nA, nB, dA, dB) {
  const rA = [v[0] + nA[0] * dA, v[1] + nA[1] * dA];
  const rB = [v[0] + nB[0] * dB, v[1] + nB[1] * dB];
  const cruz = dirA[0] * dirB[1] - dirA[1] * dirB[0];
  let p;
  if (Math.abs(cruz) < 1e-6) p = [(rA[0] + rB[0]) / 2, (rA[1] + rB[1]) / 2];
  else {
    const t = ((rB[0] - rA[0]) * dirB[1] - (rB[1] - rA[1]) * dirB[0]) / cruz;
    p = [rA[0] + dirA[0] * t, rA[1] + dirA[1] * t];
  }
  const maximo = LIMITE_DA_ESQUADRIA * Math.max(dA, dB);
  const desloc = dist(p, v);
  if (desloc > maximo && desloc > 0) return [v[0] + ((p[0] - v[0]) * maximo) / desloc, v[1] + ((p[1] - v[1]) * maximo) / desloc];
  return p;
}

/* o ponto a `s` mm do começo da polilinha, ou null se cai a menos de `perto` de um vértice ou fora dela (um ponto tão perto de um vértice daria uma face fina) */
function cortarEm(poli, s, perto = TOL) {
  let acc = 0;
  for (let k = 1; k < poli.length; k++) {
    const d = dist(poli[k - 1], poli[k]);
    if (s > acc + perto && s < acc + d - perto) {
      const t = (s - acc) / d;
      return { depois: k, ponto: [poli[k - 1][0] + (poli[k][0] - poli[k - 1][0]) * t, poli[k - 1][1] + (poli[k][1] - poli[k - 1][1]) * t] };
    }
    acc += d;
  }
  return null;
}

export function chapaDeContorno(o = {}) {
  const prefixo = o.nome ?? 'chapa';
  if (typeof prefixo !== 'string' || !prefixo) falha('nome é o prefixo dos pontos, texto não vazio');
  const eixo = o.eixo ?? 'y';
  if (!(eixo in EIXOS)) falha(`eixo é 'x', 'y' ou 'z', e veio ${JSON.stringify(o.eixo)}`);
  const em = o.em ?? 0;
  if (!numero(em)) falha(`em é a posição do plano médio em mm, e veio ${JSON.stringify(o.em)}`);
  if (!positivo(o.espessura)) falha(`espessura é número positivo em mm, e veio ${JSON.stringify(o.espessura)}`);
  const passoPadrao = o.passo ?? 5;
  if (!positivo(passoPadrao)) falha(`passo é número positivo em mm, e veio ${JSON.stringify(o.passo)}`);
  if (!Array.isArray(o.trechos) || o.trechos.length < 2) falha('trechos é a lista, em ordem, dos trechos do contorno fechado, com ao menos dois');
  if (!o.tampa || typeof o.tampa.de !== 'string' || typeof o.tampa.ate !== 'string') falha('tampa é { de, ate }, os nomes dos dois trechos entre os quais a escada tampa a chapa');
  if (o.raioDoCanto != null && !Array.isArray(o.raioDoCanto)) falha('raioDoCanto é uma lista de { em: [u, v], raio }');
  const meia = o.espessura / 2;
  const nomes = new Set();
  for (const [i, t] of o.trechos.entries()) {
    if (!t || typeof t.nome !== 'string' || !t.nome) falha(`trechos[${i}] precisa de nome (texto)`);
    if (/_\d+_$/.test(t.nome)) falha(`o nome ${citar(t.nome)} do trecho trechos[${i}] termina em _número_, que é reservado aos segmentos que a chapa gera (${citar(`${t.nome.replace(/_\d+_$/, '')}_0_`)} e parecidos); renomeie o trecho`);
    if (nomes.has(t.nome)) falha(`o trecho ${citar(t.nome)} aparece duas vezes`);
    nomes.add(t.nome);
  }
  const iDe = o.trechos.findIndex((t) => t.nome === o.tampa.de);
  const iAte = o.trechos.findIndex((t) => t.nome === o.tampa.ate);
  if (iDe < 0 || iAte < 0 || iDe === iAte) falha(`tampa { de, ate } cita trechos que existem e são diferentes (${[...nomes].join(', ')}), e veio ${JSON.stringify(o.tampa)}`);

  /* 1. os trechos: pontos, continuidade */
  const T = o.trechos.map((t, i) => {
    const onde = `trechos[${i}] (${citar(t.nome)})`;
    if (!Array.isArray(t.pontos) || !t.pontos.length || !t.pontos.every(ponto2)) falha(`${onde}.pontos é a lista de pontos [u, v] em mm, e veio ${JSON.stringify(t.pontos)}`);
    if (t.passo != null && !positivo(t.passo)) falha(`${onde}.passo é número positivo em mm, e veio ${JSON.stringify(t.passo)}`);
    if (t.pontosNoTrecho != null && !(Number.isInteger(t.pontosNoTrecho) && t.pontosNoTrecho >= 2)) falha(`${onde}.pontosNoTrecho é inteiro de 2 em diante, e veio ${JSON.stringify(t.pontosNoTrecho)}`);
    return { nome: t.nome, onde, pontos: semRepetidosNoTrecho(t.pontos.map((p) => [...p])), borda: lerBorda(t, onde, nomes), grupo: t.grupo ?? null, passo: t.passo ?? passoPadrao, fixos: t.pontosNoTrecho ?? null, uniforme: i === iDe || i === iAte };
  });
  T.forEach((t, i) => {
    const ant = T[(i + T.length - 1) % T.length];
    const fim = ant.pontos[ant.pontos.length - 1];
    if (dist(fim, t.pontos[0]) > TOL) falha(`${t.onde} começa em ${pt(t.pontos[0])}, e o trecho anterior (${citar(ant.nome)}) acaba em ${pt(fim)}: o contorno tem de ser fechado e contínuo`);
    if (t.grupo != null && (typeof t.grupo !== 'string' || !t.grupo)) falha(`${t.onde}.grupo é um nome (texto), e veio ${JSON.stringify(t.grupo)}`);
  });

  /* 2. os cantos de raio, medidos sobre os vértices dados: cada tangente cabe no segmento, e duas vizinhas cabem juntas */
  const cantos = [];
  for (const [k, c] of (o.raioDoCanto ?? []).entries()) {
    const onde = `raioDoCanto[${k}]`;
    if (!c || !ponto2(c.em) || !positivo(c.raio)) falha(`${onde} é { em: [u, v], raio } com raio positivo em mm, e veio ${JSON.stringify(c)}`);
    let achou = false;
    T.forEach((t, i) => {
      if (achou) return;
      const j = t.pontos.findIndex((p) => dist(p, c.em) <= 0.01);
      if (j < 0) return;
      achou = true;
      if (j === 0 || j === t.pontos.length - 1) falha(`${onde} cita ${pt(c.em)}, o encontro dos trechos ${citar(t.nome)} e do vizinho: o canto de raio fica dentro de um trecho, e então junte os dois num trecho só`);
      const g = geometriaDoCanto(t.pontos[j - 1], t.pontos[j], t.pontos[j + 1], c.raio);
      cantos.push({ onde, i, j, raio: c.raio, g, ponto: t.pontos[j] });
    });
    if (!achou) falha(`${onde} cita ${pt(c.em)}, que não é vértice de trecho nenhum`);
  }
  for (const c of cantos) {
    const t = T[c.i];
    const vizinho = (j2) => cantos.find((x) => x.i === c.i && x.j === j2);
    const seguinte = vizinho(c.j + 1);
    const anterior = vizinho(c.j - 1);
    for (const [outro, j2] of [[anterior, c.j - 1], [seguinte, c.j + 1]]) {
      const len = dist(t.pontos[c.j], t.pontos[j2]);
      if (outro) {
        if (j2 < c.j) continue;
        if (c.g.t + outro.g.t > len + 1e-9) {
          const f = len / (c.g.t + outro.g.t);
          falha(`${c.onde} e ${outro.onde}: os cantos ${pt(c.ponto)} (raio ${br(c.raio)}) e ${pt(outro.ponto)} (raio ${br(outro.raio)}) ficam a ${br(len)} mm um do outro e pedem ${br(c.g.t)} + ${br(outro.g.t)} = ${br(c.g.t + outro.g.t)} mm de tangente juntos; os raios que cabem, na mesma proporção, são ${br(c.raio * f)} e ${br(outro.raio * f)} mm`);
        }
      } else if (c.g.t > len + 1e-9) {
        falha(`${c.onde}: o raio ${br(c.raio)} mm pede ${br(c.g.t)} mm de tangente de cada lado do canto ${pt(c.ponto)}, e o segmento vizinho mede ${br(len)} mm; o raio que cabe é ${br(len / Math.tan(Math.abs(c.g.giro) / 2))} mm`);
      }
    }
  }
  for (const i of new Set(cantos.map((c) => c.i))) {
    const t = T[i];
    const deste = cantos.filter((c) => c.i === i).sort((a, b) => b.j - a.j);
    for (const c of deste) t.pontos.splice(c.j, 1, ...pontosDoArco(c.ponto, c.g, c.raio));
  }

  /* 3. cada trecho vira segmentos, com os pontos de entrada e de saída do chanfro, e cada segmento um número de passos */
  for (const t of T) {
    const len0 = comprimento(t.pontos);
    t.colapsado = len0 <= TOL;
    if (t.colapsado) { t.segs = []; t.n = 2; continue; }
    if (t.borda && !t.uniforme) {
      for (const s of [t.borda.entrada, len0 - t.borda.saida]) {
        if (!(s > 0)) continue;
        const corte = cortarEm(t.pontos, s, 0.1 * t.passo);
        if (corte) t.pontos.splice(corte.depois, 0, corte.ponto);
      }
    }
    const polis = t.uniforme ? [t.pontos] : t.pontos.slice(1).map((p, k) => [t.pontos[k], p]);
    t.segs = polis.map((poli) => ({ poli, len: comprimento(poli), k: Math.max(1, Math.round(comprimento(poli) / t.passo - 1e-9)) }));
    if (t.fixos != null) {
      const alvo = t.fixos - 1;
      if (alvo < t.segs.length) falha(`${t.onde}.pontosNoTrecho = ${t.fixos} não cobre os ${t.segs.length} segmentos do trecho (pede ao menos ${t.segs.length + 1}); parta o trecho ou aumente o número`);
      const total = t.segs.reduce((s, x) => s + x.len, 0);
      t.segs.forEach((x) => { x.k = Math.max(1, Math.floor((x.len / total) * alvo)); });
      while (t.segs.reduce((s, x) => s + x.k, 0) < alvo) t.segs.reduce((m, x) => (x.len / x.k > m.len / m.k ? x : m)).k += 1;
      while (t.segs.reduce((s, x) => s + x.k, 0) > alvo) t.segs.filter((x) => x.k > 1).reduce((m, x) => (x.len / x.k < m.len / m.k ? x : m)).k -= 1;
    }
  }
  const cadeia = (de, ate) => {
    const lista = []; for (let i = (de + 1) % T.length; i !== ate; i = (i + 1) % T.length) lista.push(i); return lista;
  };
  const cadeiaA = cadeia(iDe, iAte);
  const cadeiaB = cadeia(iAte, iDe);
  const pontosDa = (c) => c.reduce((s, i) => s + (T[i].colapsado ? 1 : T[i].segs.reduce((q, x) => q + x.k, 0)), 1);
  while (pontosDa(cadeiaA) !== pontosDa(cadeiaB)) {
    const menor = pontosDa(cadeiaA) < pontosDa(cadeiaB) ? cadeiaA : cadeiaB;
    const candidatos = menor.filter((i) => !T[i].colapsado && T[i].fixos == null).flatMap((i) => T[i].segs);
    if (!candidatos.length) falha(`as duas cadeias da tampa entre ${citar(o.tampa.de)} e ${citar(o.tampa.ate)} têm ${pontosDa(cadeiaA)} e ${pontosDa(cadeiaB)} pontos, e nenhum trecho da menor pode ganhar pontos (todos colapsados ou com pontosNoTrecho)`);
    candidatos.reduce((m, x) => (x.len / x.k > m.len / m.k ? x : m)).k += 1;
  }
  for (const t of T) {
    if (t.colapsado) { t.outer = [[...t.pontos[0]]]; continue; }
    t.outer = [[...t.segs[0].poli[0]]];
    t.pecas = [];
    for (const x of t.segs) {
      const a = x.poli[0]; const b = x.poli[x.poli.length - 1];
      const de = t.outer.length - 1;
      const pts = x.poli.length > 2 ? reamostrar(x.poli, x.k + 1) : Array.from({ length: x.k + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / x.k, a[1] + ((b[1] - a[1]) * i) / x.k]);
      for (const p of pts.slice(1)) t.outer.push(p);
      t.pecas.push({ de, ate: t.outer.length - 1 });
    }
  }

  /* 4. os vértices únicos do contorno e os segmentos */
  const V = []; const refs = T.map(() => []);
  T.forEach((t) => t.outer.slice(0, -1).forEach((p) => V.push(p)));
  {
    let acc = 0;
    T.forEach((t, i) => {
      const inicio = acc; acc += t.outer.length - 1;
      refs[i] = t.colapsado ? [inicio % V.length, inicio % V.length] : t.outer.map((_, j) => (inicio + j) % V.length);
    });
  }
  const N = V.length;
  if (N < 3) falha(`o contorno tem ${N} vértice(s) distintos, e uma chapa pede ao menos 3`);
  const donoDe = new Array(N);
  T.forEach((t, i) => { for (let j = 0; j < t.outer.length - 1; j++) donoDe[refs[i][j]] = { i, j }; });
  const ondeSegmento = (k) => `o trecho ${citar(T[donoDe[k].i].nome)} no vértice ${pt(V[k])}`;
  {
    const cruzam = seAutoCruza(V);
    if (cruzam) falha(`o contorno se toca ou se cruza: ${ondeSegmento(cruzam[0])} e ${ondeSegmento(cruzam[1])} (um trecho que volta sobre si ou passa por um vértice do outro)`);
  }
  const orientacao = Math.sign(areaComSinal(V)) || 1;
  const seg = Array.from({ length: N }, (_, k) => {
    const a = V[k]; const b = V[(k + 1) % N];
    const d = dist(a, b);
    return { dir: [(b[0] - a[0]) / d, (b[1] - a[1]) / d] };
  });
  const normal = (s) => [-s.dir[1] * orientacao, s.dir[0] * orientacao];

  /* 5. a largura de cada ponto de cada trecho com borda, e a altura em que a borda começa */
  for (const t of T) {
    if (!t.borda) continue;
    const b = t.borda;
    const s = [0];
    for (let k = 1; k < t.outer.length; k++) s.push(s[k - 1] + dist(t.outer[k - 1], t.outer[k]));
    const total = s[s.length - 1];
    t.largura = t.outer.map((p, k) => {
      let w = b.largura;
      if (b.entrada > 0) w *= Math.min(1, s[k] / b.entrada);
      if (b.saida > 0) w *= Math.min(1, (total - s[k]) / b.saida);
      if (b.limite) {
        const contra = b.limite.contra.map((n) => T.find((x) => x.nome === n));
        w = Math.min(w, b.limite.fracao * Math.min(...contra.map((c) => distanciaAPolilinha(p, c.outer))));
      }
      return w;
    });
    const hr = b.tipo === 'chanfro' ? b.resta / 2 : meia - b.altura;
    if (!(hr >= 0 && hr < meia)) falha(`${t.onde}.${b.tipo === 'chanfro' ? `resta ${br(b.resta)} mm` : `altura ${br(b.altura)} mm`}: a borda precisa ficar entre 0 e a espessura ${br(o.espessura)} mm`);
    t.hr = hr;
    t.campoDaAltura = b.tipo === 'chanfro' ? `chanfro.resta = ${br(b.resta, 9)} mm (altura ${br(hr, 9)} mm)` : `quinaQuebrada.altura = ${br(b.altura, 9)} mm (altura ${br(hr, 9)} mm)`;
  }

  /* 6. as alturas dos laços: as duas faces e a altura da borda de cada trecho, a mais que o limite de face fina uma da outra */
  const maiorPasso = Math.max(...T.map((t) => t.passo));
  const minimo = LIMITE_DE_FACE_FINA * maiorPasso;
  const origens = [{ h: meia, quem: `a face da chapa (espessura ${br(o.espessura, 9)} mm, altura ${br(meia, 9)} mm)` }];
  for (const t of T) if (t.borda) origens.push({ h: Math.round(t.hr * 1e9) / 1e9, quem: `o trecho ${citar(t.nome)}, ${t.campoDaAltura}` });
  const ordenadas = [...origens].sort((a, b) => a.h - b.h);
  for (let k = 0; k < ordenadas.length; k++) {
    const x = ordenadas[k];
    if (x.h > 0 && 2 * x.h < minimo) falha(`${x.quem}: as duas alturas simétricas ficam a ${br(2 * x.h, 9)} mm uma da outra, menos que ${br(minimo, 9)} mm (o limite de face fina, ${LIMITE_DE_FACE_FINA}, vezes o passo ${br(maiorPasso)}); aumente a espessura que resta ou use 0 para o gume`);
    if (k > 0 && x.h - ordenadas[k - 1].h > 0 && x.h - ordenadas[k - 1].h < minimo) falha(`${x.quem} fica a ${br(x.h - ordenadas[k - 1].h, 9)} mm de ${ordenadas[k - 1].quem}, menos que ${br(minimo, 9)} mm (o limite de face fina, ${LIMITE_DE_FACE_FINA}, vezes o passo ${br(maiorPasso)}): a faixa entre os laços sairia com face fina; afaste as alturas ou iguale-as`);
  }
  const alturas = new Set(origens.map((x) => x.h));
  const niveis = [...alturas].sort((a, b) => a - b).flatMap((a) => (a === 0 ? [0] : [-a, a])).sort((a, b) => a - b);

  /* 7. o contorno recuado de cada laço */
  const larguraEm = (i, j, h) => {
    const t = T[i];
    if (!t.borda) return 0;
    const sobe = Math.min(1, Math.max(0, (Math.abs(h) - t.hr) / (meia - t.hr)));
    return t.largura[j] * sobe;
  };
  /* com recuoEm 'u' ou 'v' a largura é medida ao longo desse eixo: a distância perpendicular ao segmento é a largura vezes o cosseno dele com o eixo */
  const fatorDoRecuo = (i, k) => {
    const eixoDoRecuo = T[i].borda?.recuoEm;
    if (!eixoDoRecuo || eixoDoRecuo === 'normal') return 1;
    return Math.abs(normal(seg[k])[eixoDoRecuo === 'u' ? 0 : 1]);
  };
  for (let k = 0; k < N; k++) {
    const t = T[donoDe[k].i];
    if (!t.borda || t.borda.recuoEm === 'normal') continue;
    const efetiva = t.borda.largura * fatorDoRecuo(donoDe[k].i, k);
    if (efetiva < minimo) falha(`${t.onde}: com recuoEm '${t.borda.recuoEm}' a largura ${br(t.borda.largura)} mm vira ${br(efetiva, 6)} mm perpendiculares ao segmento que sai de ${pt(V[k])}, menos que ${br(minimo, 6)} mm (o limite de face fina vezes o passo): o segmento é paralelo ao eixo '${t.borda.recuoEm}' e o chanfro sumiria; use recuoEm 'normal' ou o outro eixo`);
  }
  const lacos = niveis.map((h) => {
    const P = V.map((v, k) => {
      const antes = seg[(k + N - 1) % N]; const depois = seg[k];
      const a = donoDe[(k + N - 1) % N]; const b = donoDe[k];
      const dA = larguraEm(a.i, a.j + 1, h) * fatorDoRecuo(a.i, (k + N - 1) % N); const dB = larguraEm(b.i, b.j, h) * fatorDoRecuo(b.i, k);
      if (dA === 0 && dB === 0) return v;
      return pontoRecuado(v, antes.dir, depois.dir, normal(antes), normal(depois), dA, dB);
    });
    /* o vizinho que o recuo ultrapassa se junta ao ponto da interseção: o segmento recuado nunca anda para trás */
    for (let volta = 0; volta < N; volta++) {
      let mudou = false;
      for (let k = 0; k < N; k++) {
        const k2 = (k + 1) % N;
        const passo = (P[k2][0] - P[k][0]) * seg[k].dir[0] + (P[k2][1] - P[k][1]) * seg[k].dir[1];
        if (passo < -1e-9) {
          if (dist(P[k2], V[k2]) >= dist(P[k], V[k])) P[k] = [...P[k2]]; else P[k2] = [...P[k]];
          mudou = true;
        }
      }
      if (!mudou) break;
    }
    const onde = `o laço a ${br(h)} mm do plano médio`;
    const unicos = []; const dono = [];
    P.forEach((p, k) => { if (!unicos.length || dist(p, unicos[unicos.length - 1]) > 1e-6) { unicos.push(p); dono.push(k); } });
    while (unicos.length > 1 && dist(unicos[0], unicos[unicos.length - 1]) <= 1e-6) { unicos.pop(); dono.pop(); }
    const cruza = unicos.length >= 3 ? seAutoCruza(unicos) : [0, 0];
    if (cruza) falha(`${onde} se cruza depois do recuo das bordas, entre ${ondeSegmento(dono[cruza[0]])} e ${ondeSegmento(dono[cruza[1]])}: alguma largura de chanfro ou de quina é maior que a chapa ali; reduza a largura ou declare um limite { fracao, contra } nos trechos`);
    if (Math.sign(areaComSinal(unicos)) !== orientacao) falha(`${onde} muda de sentido depois do recuo das bordas: a largura do chanfro passa da largura da chapa; reduza a largura ou declare um limite`);
    return { h, P };
  });
  const gaiolaDe = (t) => (t.uniforme || t.colapsado ? [{ nome: t.nome, de: 0, ate: t.outer.length - 1, n: t.colapsado ? 2 : t.outer.length }]
    : t.pecas.map((q, k) => ({ nome: `${t.nome}_${k}_`, de: q.de, ate: q.ate, n: q.ate - q.de + 1 })));
  const trechosDaGaiola = T.flatMap((t, i) => gaiolaDe(t).map((x) => ({ ...x, i })));
  const trechosDoLaco = (P) => Object.fromEntries(trechosDaGaiola.map((x) => [x.nome, x.n === 2 && T[x.i].colapsado ? [P[refs[x.i][0]], P[refs[x.i][0]]] : refs[x.i].slice(x.de, x.ate + 1).map((k) => P[k])]));

  const g = gaiolaPorLacos({
    nome: prefixo, eixo, tampa: o.tampa,
    trechos: trechosDaGaiola.map((x) => ({ nome: x.nome, pontos: x.n })),
    lacos: lacos.map(({ h, P }) => ({ em: em + h, trechos: trechosDoLaco(P) })),
    vincos: lacos.map((_, i) => ({ nome: `plano${i}`, laco: `l${i}`, nitidez: 'viva' })),
    ...(T.some((t) => t.grupo) ? { grupos: [...new Set(T.filter((t) => t.grupo).map((t) => t.grupo))].map((nome) => ({ nome, trechos: trechosDaGaiola.filter((x) => T[x.i].grupo === nome).map((x) => x.nome) })) } : {}),
  });

  /* 8. a espessura que afina ao longo de uma coordenada, aproximando cada ponto do plano médio */
  if (o.afinar != null) {
    const a = o.afinar;
    if (!a || !['u', 'v'].includes(a.coordenada) || !numero(a.de) || !numero(a.ate) || !(a.ate > a.de) || !positivo(a.espessuraFinal) || a.espessuraFinal >= o.espessura) {
      falha(`afinar é { coordenada: 'u' | 'v', de, ate, espessuraFinal } com de < ate e a espessura final entre 0 e ${br(o.espessura)} mm, e veio ${JSON.stringify(a)}`);
    }
    const e = EIXOS[eixo]; const c = [0, 1, 2].filter((k) => k !== e)[a.coordenada === 'u' ? 0 : 1];
    const queda = 1 - a.espessuraFinal / o.espessura;
    for (const [nome, p] of Object.entries(g.pontos)) {
      const f = 1 - queda * Math.min(1, Math.max(0, (p[c] * MM - a.de) / (a.ate - a.de)));
      p[e] = em / MM + (p[e] - em / MM) * f;
      for (const tabela of [g.pontosMm, g.alvosMm]) if (tabela?.[nome]) tabela[nome][e] = em + (tabela[nome][e] - em) * f;
    }
    for (const l of g.lacos) l.afinada = { coordenada: a.coordenada, de: a.de, ate: a.ate, espessuraFinal: a.espessuraFinal };
  }
  return { ...g, chapa: { niveis, trechos: T.map((t) => ({ nome: t.nome, pontos: t.outer.length })) } };
}
