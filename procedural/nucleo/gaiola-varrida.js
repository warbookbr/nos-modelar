/* gaiola-varrida.js — a gaiola de uma superfície varrida: uma seção dada ao longo de um trilho dado, com estações, alargamento e recortes
 *
 * FICHA gaiolaVarrida
 * serve: gaiola de uma faixa de chapa ou de um tubo de seção constante, varrida por um trilho (reta, arco, ou polilinha com raio nos
 *   cantos), com estações por altura ou raio.
 * quando: saia, borda, friso, régua, moldura ou arco, em que a seção é a mesma e o trilho é que anda; para uma chapa inteira com
 *   seções que mudam use gaiolaPorEstacoes, e para feições que cortam a chapa use gaiolaPorRede.
 * unidades: trilho, seção e estações entram em mm; `pontos` sai em metro, para pôr em TOPO.
 * campos:
 *   nome: prefixo dos pontos, que saem como `${nome}_${estacao}_${linha}`.
 *   trilho: [{ reta: { de, ate } }, { arco: { centro, eixo, de, graus } }, ...] contíguos, ou { pontos: [[x, y, z], ...], raios?, fechado? }:
 *     raios é um raio por canto (os pontos de dentro; todos com fechado) ou um número para todos, 0 é canto vivo, e cada canto vira o
 *     arco tangente às duas retas; o raio que não cabe no trecho é recusado com a medida. fechado: true volta do último ponto ao primeiro.
 *   quadro: { u: [x, y, z] } ou { v: [x, y, z] }, com virar? para trocar o sinal do outro eixo, e modo?: 'fixo' (padrão), em que o eixo
 *     fica na direção dada e a seção achata onde ela sai do plano normal ao trilho (a gaiola devolve o aviso), ou 'acompanha', em que a
 *     seção fica no plano normal ao trilho, com o eixo levado sem torção desde o começo (o tubo redondo que sobe continua redondo).
 *   secao: [[u, v] | { u, v, nome? }, ...] as linhas da superfície, de pelo menos duas, cada uma um ponto da seção.
 *   fechada: true fecha a seção: faces também entre a última linha e a primeira (tubo); pede três linhas e recusa `fora`.
 *   tampas: true põe uma face plana em cada ponta (só com fechada), com vinco vivo no aro; 'redondas', sem o vinco. Normal pelo volume.
 *   estacoes: marcos { em } | { fracao } | { plano: { eixo, valor } } | { cilindro: { eixo, por, raio } }, com { entre: n } ou { passo: mm } entre eles;
 *     ou { passo, graus?, flecha? }: um marco em cada emenda do trilho, passo nas retas e, nos arcos, a cada graus (7,5) e corda de flecha (0,15 mm).
 *   fora: [x, y, z] ou { centro, semEixo? }: o lado para onde a chapa olha, que decide a normal das faces (não vale com fechada).
 *   vincos: [{ linha, nitidez }] vinco ao longo de uma linha da seção.
 *   remover: [{ estacoes: [marcoA, marcoB], linhas: [linhaA, linhaB] }] tira as células entre os marcos e as linhas citados.
 *   alargamento: { campo: { cilindro }, perfil: [[d, u], ...], topoAberto?, rolada? } segunda superfície que alarga a seção em volta de um cilindro.
 * devolve: { nome, vertices, faces, vincos, cantos, pontos, posicoes, nomeDe(estacao, linha), estacoes, linhas, comprimento, avisos? },
 *   avisos só quando há: [{ tipo: 'secao-achatada', eixo, de, ate, razao, tamanho, medida, mensagem }].
 * exemplo:
 *   gaiolaVarrida({ nome: 'regua', trilho: [{ reta: { de: [0, 0, 0], ate: [0, 0, 1000] } }], quadro: { u: [1, 0, 0] },
 *     secao: [{ u: 0, v: 0, nome: 'baixo' }, { u: 0, v: 100, nome: 'cima' }],
 *     estacoes: [{ fracao: 0 }, { passo: 100 }, { fracao: 1 }], fora: [1, 0, 0] })
 *   gaiolaVarrida({ nome: 'tubo', trilho: { pontos: [[0, 0, 0], [0, 0, 400], [0, 150, 650]], raios: 60 }, quadro: { u: [0, 1, 0], modo: 'acompanha' },
 *     secao: [[16, 0], [0, 16], [-16, 0], [0, -16]], fechada: true, tampas: true, estacoes: { passo: 40 } })
 * peça: procedural/pecas/furgao-realista/receita.js (saias e molduras dos arcos).
 * FIM DA FICHA
 *
 * Função pura, sem Three.js e sem domínio. A receita declara o trilho (segmentos de reta e de arco, ou uma polilinha), a seção (as linhas
 * da superfície, cada uma um ponto [u, v] em mm) e as estações (os cortes que atravessam as linhas); `gaiolaVarrida` devolve os pontos, as
 * faces e os vincos em nomes, no formato que o passo `subdivisao` aceita, como o fazem `gaiolaPorEstacoes` e `gaiolaPorRede`. A
 * subdivisão, a espessura, a sombra e a simetria continuam no passo; esta função só monta a gaiola. Nada aqui conhece veículo: serve a
 * qualquer saia, borda, friso largo, régua, moldura ou arco varridos. Entra em mm e sai em metro (`pontos`), como `gaiolaPorRede`.
 *
 *   gaiolaVarrida({
 *     nome,                      prefixo dos pontos: `${nome}_${estacao}_${linha}`
 *     trilho,                    [{ reta: { de, ate } }, { arco: { centro, eixo, de, graus } }, ...] contíguos, ou { pontos, raios?, fechado? }
 *     quadro,                    { u: [x, y, z] } ou { v: [x, y, z] }, virar?: true, modo?: 'fixo' | 'acompanha'
 *     secao,                     [[u, v] | { u, v, nome? }, ...]  as linhas, de pelo menos duas
 *     fechada?, tampas?,         true: a seção volta da última linha à primeira; uma face em cada ponta (só com fechada)
 *     estacoes,                  [marco, { entre: n } | { passo: mm, linha? }, marco, ...] ou { passo, graus?, flecha? }
 *     fora,                      [x, y, z] ou { centro: [x, y, z], semEixo?: 'x' | 'y' | 'z' }; sem ele com fechada
 *     vincos?,                   [{ linha: nome, nitidez: 0 a 1 | 'viva' }]
 *     remover?,                  [{ estacoes: [marcoA, marcoB], linhas: [linhaA, linhaB] }]
 *     alargamento?,              { campo: { cilindro }, perfil: [[d, u], ...], topoAberto?, rolada?: { abaixoDe, razao } } ou uma lista deles
 *   })
 *   -> { nome, vertices, faces, vincos, cantos, pontos, posicoes, nomeDe, estacoes, linhas, comprimento, avisos? }
 *
 * O TRILHO. `reta` vai de um ponto a outro; `arco` gira o ponto `de` em torno da reta que passa por `centro` com a direção `eixo`, por
 * `graus` (com sinal, pela regra da mão direita em torno do eixo), e o raio é a distância de `de` ao eixo. Os segmentos se emendam
 * (cada um começa onde o anterior termina) e a posição no trilho é o comprimento de arco `s`, em mm, de 0 ao comprimento. A polilinha
 * `{ pontos }` são retas entre pontos seguidos; no canto o quadro salta de uma reta à outra. Com `raios` cada canto de raio R e giro θ
 * vira o arco tangente às duas retas, que tira R·tan(θ/2) de cada uma, e o trecho que não tem reta para os dois arcos que o cortam é
 * recusado com o comprimento dele, o que os arcos pedem e o maior raio que cabe; o canto de raio 0 fica vivo. Com `fechado: true` a
 * polilinha volta do último ponto ao primeiro, todo ponto é canto, o trilho começa e acaba no meio da reta que sobra entre o último
 * ponto e o primeiro, a última estação é a primeira (as faces fecham o laço, e `tampas` é recusado) e as estações das pontas têm de
 * estar no começo e no fim do trilho. Sem `raios` e sem `fechado` a polilinha é a de antes deles, byte a byte.
 *
 * O QUADRO. Em cada `s` o trilho tem a tangente T. A seção vive no plano que T atravessa: `{ u: dir }` fixa o eixo u da seção na direção
 * dir (por exemplo a saída de uma lateral) e o eixo v sai de T × u; `{ v: dir }` fixa o v (por exemplo a vertical de uma planta) e o u
 * sai de v × T. `virar: true` troca o sinal do eixo que sai do produto. Um ponto da seção [u, v] fica em trilho(s) + u·U + v·V.
 * Esse é o `modo: 'fixo'`, o padrão: o eixo fixo não é projetado no plano normal a T, e onde o trilho sobe em relação a ele a seção
 * achata naquele eixo, medida no corte reto do trilho, na razão |T × dir|. Quando a razão cai abaixo de 0,98 a gaiola devolve um aviso
 * por trecho de estações seguidas, com o `s` de começo e fim, a razão e a medida em mm, e a malha fica a mesma. Com `modo: 'acompanha'`
 * o eixo fixo é projetado no plano normal no começo do trilho e levado sem torção (transporte paralelo): parado nas retas, girando com
 * a tangente em volta do eixo de cada arco e, no canto vivo, pelo menor giro de uma reta à outra; o outro eixo sai do produto como
 * antes, e a seção fica sempre no plano normal ao trilho. No trilho fechado o eixo volta girado em volta da tangente (a torção do
 * laço), e esse giro se reparte por igual ao longo do `s`. No trilho plano com o eixo fixo normal ao plano os dois modos coincidem.
 *
 * AS ESTAÇÕES. Uma estação é um corte que atravessa todas as linhas da seção, e cada linha cruza o corte no seu próprio `s`. O corte é
 * um marco:
 *   { em: mm }                       o mesmo `s` em todas as linhas;
 *   { fracao: 0 a 1 }                essa fração do comprimento do trilho;
 *   { plano: { eixo, valor } }       onde a linha chega à coordenada `valor` no eixo 'x', 'y' ou 'z' (o corte por altura é eixo 'y');
 *   { cilindro: { eixo, por, raio } } onde a linha chega à distância `raio` da reta que passa por `por` com a direção `eixo` (a boca de
 *                                    um arco de roda, ou qualquer furo, é o cilindro em torno do eixo dele);
 *   com `nome?`, `escala?` (o fator de u daquele corte) e, nos dois cortes por superfície, `cruzando?: 'subindo' | 'descendo'`.
 * O primeiro e o último marco são as pontas da superfície, e por isso o corte por altura das pontas é um marco `plano` nas pontas. Cada
 * marco é procurado depois do anterior, ao longo da linha, no primeiro cruzamento (no sentido de `cruzando`, se dito); a linha que não
 * cruza grita com o nome do marco e da linha. Entre dois marcos, `{ entre: n }` põe n - 1 estações por igual e `{ passo: mm }` põe as que
 * cabem em `passo` no trecho mais longo entre as linhas (ou no da `linha` citada), o mesmo número em todas. As estações têm de crescer em todas as linhas. A
 * `escala` é o fator de u da seção na estação, que anda em linha reta no `s` entre os marcos que a declaram (e fica constante fora deles),
 * e serve ao afunilamento de uma borda que sai menos numa ponta do que na outra. `estacoes: { passo, graus?, flecha? }` tira as
 * estações do trilho: um marco `{ em }` em cada emenda de segmento (começo e fim de cada arco, canto vivo), `{ passo }` nas retas e, em
 * cada arco, o que der mais entre uma estação a cada `graus` (7,5) de giro e uma a cada corda de `flecha` (0,15 mm) de afastamento do
 * arco. Os dois padrões são medidos: um tubo de Ø 32 e 24 lados, depois de niveis 2, fica de 31,2 a 32,0 mm em cantos de raio 30 a
 * 300; só pelos graus o canto de raio 300 caía a 30,0 mm, e 10 graus no de raio 60 a 30,9.
 *
 * O ALARGAMENTO. É a segunda superfície, combinada com a da seção pelo máximo. `campo.cilindro` é a distância d de cada ponto (o pé na
 * linha da seção, com u = 0) à superfície do cilindro, positiva para fora dele; `perfil` dá a saída u em função de d, em linha reta entre
 * os pontos e zero fora dele. Onde o perfil passa de zero (de um bilionésimo de mm), a saída do ponto é o maior entre a da própria seção e a do perfil, mas só nas
 * linhas que saem da chapa (u > 0): as linhas que encostam (u de zero para baixo) ficam, menos a última se `topoAberto: true`, que sobe com
 * o alargamento e deixa o topo aberto, em vez de voltar à chapa num degrau. `rolada: { abaixoDe, razao }` rola a borda de baixo: nas
 * linhas com v menor que `abaixoDe` a saída do alargamento fica limitada a `razao` vezes a da própria seção naquela linha, de modo que
 * a borda de baixo se alarga na mesma proporção em que a seção a roda. Uma lista de alargamentos (um por arco, por exemplo) dá a cada
 * ponto o maior entre as suas saídas. O alargamento passa por onde a superfície do cilindro passa, e
 * por isso o trecho em que ele se funde à superfície da seção é a própria malha: não há duas peças para costurar.
 *
 * OS RECORTES E OS VINCOS. `remover` tira as células entre os marcos (pelo nome) e entre as linhas (pelo nome) citados, e o que sobra
 * fica na mesma malha. `vincos` põe vinco ao longo da linha citada, nas arestas que ficaram entre duas faces.
 *
 * A ORIENTAÇÃO. As faces saem com a normal para o lado de `fora`: o vetor, ou, com `centro`, a direção do centro à face (com
 * `semEixo`, sem aquele componente), decidido pela soma dos sinais sobre a malha toda; a soma zero (uma seção cujas faces olham metade
 * para cada lado do vetor) grita, porque então `fora` não diz nada. Mesma definição, mesma saída, byte a byte.
 *
 * A SEÇÃO FECHADA E AS TAMPAS. `fechada: true` liga a última linha à primeira, e a superfície vira um tubo de seção qualquer (pelo
 * menos três linhas, a última diferente da primeira); `remover` não alcança a célula de volta, entre a última linha e a primeira.
 * `tampas: true` põe nas duas pontas a face de todas as linhas da estação, e por isso só vale com `fechada`; o aro de cada tampa sai
 * nos `vincos` como vinco vivo fechado (`${nome}_tampa_0` e `${nome}_tampa_1`), e a ponta fica plana e no lugar depois da subdivisão.
 * `tampas: 'redondas'` põe as mesmas faces sem o vinco, e a subdivisão arredonda e encurta a ponta. Com a seção fechada a
 * orientação não vem de `fora`, que então é recusado: as faces do tubo e as duas tampas (postas na conta mesmo sem `tampas`) fecham um
 * volume, e as faces saem no sentido em que o volume assinado dá positivo, com a normal para fora; o volume zero grita. Sem `fechada` e
 * sem `tampas` a saída é a mesma de antes delas, byte a byte. */

const EPS = 1e-9;
const MM = 1000;
const AMOSTRA_MM = 1;
const AMOSTRAS_MAXIMAS = 20000;
const GRAUS = Math.PI / 180;
const MODOS_DO_QUADRO = ['fixo', 'acompanha'];
const ACHATAMENTO_TOLERADO = 0.02;
const GRAUS_POR_ESTACAO = 7.5;
const FLECHA_POR_ESTACAO = 0.15;
const CAMPOS = ['nome', 'trilho', 'quadro', 'secao', 'fechada', 'tampas', 'estacoes', 'fora', 'vincos', 'remover', 'alargamento'];

export class ErroGaiolaVarrida extends Error {
  constructor(mensagem) { super(`gaiolaVarrida: ${mensagem}`); this.name = 'ErroGaiolaVarrida'; }
}
const falha = (mensagem) => { throw new ErroGaiolaVarrida(mensagem); };
const citar = (nome) => `'${nome}'`;
const mostra = (v) => JSON.stringify(v) ?? String(v);

const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const esc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => esc(a, 1 / norma(a));
const lerp = (a, b, t) => a + (b - a) * t;
const finito = (x) => typeof x === 'number' && Number.isFinite(x);

function exigirCampos(obj, permitidos, onde) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) falha(`${onde} precisa ser objeto, e veio ${mostra(obj)}`);
  const extra = Object.keys(obj).filter((k) => !permitidos.includes(k));
  if (extra.length) falha(`${onde} tem campo desconhecido ${extra.map(citar).join(', ')}; os campos são ${permitidos.join(', ')}`);
}
function vetor(v, onde, { diferenteDeZero = false } = {}) {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(finito)) falha(`${onde} precisa ser [x, y, z] com números finitos em mm, e veio ${mostra(v)}`);
  if (diferenteDeZero && !(norma(v) > EPS)) falha(`${onde} é o vetor nulo; precisa apontar para algum lado`);
  return v;
}
function numero(x, onde, { maiorQue = null, inteiro = false } = {}) {
  if (!finito(x)) falha(`${onde} precisa ser número finito, e veio ${mostra(x)}`);
  if (maiorQue !== null && !(x > maiorQue)) falha(`${onde} precisa ser maior que ${maiorQue}, e veio ${x}`);
  if (inteiro && !Number.isInteger(x)) falha(`${onde} precisa ser inteiro, e veio ${x}`);
  return x;
}

/* ------------------------------------------------------------------ o trilho */

/* o giro de v em torno do eixo unitário k, por th radianos (Rodrigues) */
function girar(v, k, th) {
  const c = Math.cos(th); const s = Math.sin(th);
  return soma(soma(esc(v, c), esc(cruz(k, v), s)), esc(k, dot(k, v) * (1 - c)));
}
/* o menor giro que leva a direção a à direção b, aplicado a v; sem giro quando a e b são a mesma direção ou opostas */
function giroMinimo(v, a, b) {
  const eixo = cruz(a, b); const sen = norma(eixo);
  if (sen < 1e-12) return v;
  return girar(v, esc(eixo, 1 / sen), Math.atan2(sen, dot(a, b)));
}

function segmentoReta(de, ate, onde) {
  const L = norma(sub(ate, de));
  if (!(L > EPS)) falha(`${onde} tem a ponta igual ao começo: o segmento precisa ter comprimento`);
  const t = unit(sub(ate, de));
  return { tipo: 'reta', comprimento: L, inicio: de, fim: ate, tInicio: t, tFim: t, em: (s) => ({ p: soma(de, esc(t, s)), t }), levar: (s, w) => w };
}
function segmentoArco({ centro, eixo, de, graus }, onde) {
  vetor(centro, `${onde}.centro`); vetor(eixo, `${onde}.eixo`, { diferenteDeZero: true }); vetor(de, `${onde}.de`);
  numero(graus, `${onde}.graus`);
  if (Math.abs(graus) < EPS || Math.abs(graus) > 720) falha(`${onde}.graus precisa estar entre 0 e 720 em módulo, com sinal, e veio ${graus}`);
  const k = unit(eixo); const v0 = sub(de, centro); const axial = esc(k, dot(v0, k)); const radial = sub(v0, axial);
  const r = norma(radial);
  if (!(r > EPS)) falha(`${onde}.de está sobre o eixo do arco; o raio precisa ser maior que zero`);
  const total = Math.abs(graus) * GRAUS; const sinal = Math.sign(graus); const kr = cruz(k, radial);
  const ponto = (th) => soma(centro, soma(axial, soma(esc(radial, Math.cos(th)), esc(kr, Math.sin(th)))));
  const em = (s) => {
    const th = sinal * s / r;
    const tg = soma(esc(radial, -Math.sin(th)), esc(kr, Math.cos(th)));
    return { p: ponto(th), t: unit(esc(tg, sinal)) };
  };
  /* no arco a tangente gira em torno do eixo, e o quadro que não torce gira com ela */
  return { tipo: 'arco', graus, comprimento: r * total, inicio: ponto(0), fim: ponto(sinal * total), tInicio: em(0).t, tFim: em(r * total).t, em, levar: (s, w) => girar(w, k, sinal * s / r) };
}

/* a polilinha com raio nos cantos: cada canto com raio vira um arco tangente às duas retas, que encurta cada uma de R·tan(giro/2);
   raio 0 deixa o canto vivo. Com `fechado` a polilinha volta do último ponto ao primeiro, todo ponto é canto, e o trilho começa e
   acaba no meio da reta que sobra entre o último ponto e o primeiro. */
function trechosComRaios(trilho) {
  const { pontos: p, raios } = trilho; const fechado = trilho.fechado === true;
  if (trilho.fechado !== undefined && typeof trilho.fechado !== 'boolean') falha(`trilho.fechado precisa ser true ou false, e veio ${mostra(trilho.fechado)}`);
  const n = p.length;
  if (fechado && n < 3) falha(`trilho.pontos fechado precisa de pelo menos três pontos, e veio com ${n}`);
  const cantos = fechado ? Array.from({ length: n }, (_, i) => i) : Array.from({ length: Math.max(0, n - 2) }, (_, i) => i + 1);
  let rs;
  if (raios === undefined) rs = cantos.map(() => 0);
  else if (Array.isArray(raios)) {
    if (raios.length !== cantos.length) falha(`trilho.raios tem ${raios.length} raios e o trilho tem ${cantos.length} cantos${fechado ? ' (fechado, todo ponto é canto)' : ' (os pontos de dentro, sem as pontas)'}; dê um raio por canto, ou um número só`);
    rs = raios.map((r, k) => numero(r, `trilho.raios[${k}]`));
  } else rs = cantos.map(() => numero(raios, 'trilho.raios'));
  rs.forEach((r, k) => { if (r < 0) falha(`trilho.raios[${k}] é ${r}; o raio do canto é 0 (vivo) ou positivo`); });
  const ponto = (i) => p[((i % n) + n) % n];
  const corte = new Array(n).fill(0); const giro = new Array(n).fill(0); const raio = new Array(n).fill(0);
  cantos.forEach((i, k) => {
    const d1 = unit(sub(ponto(i), ponto(i - 1))); const d2 = unit(sub(ponto(i + 1), ponto(i)));
    const th = Math.acos(Math.max(-1, Math.min(1, dot(d1, d2))));
    if (rs[k] > 0 && th > Math.PI - 1e-6) falha(`o canto em trilho.pontos[${i}] volta para trás (giro de 180 graus): não há arco tangente que o faça`);
    if (rs[k] > 0 && th > 1e-9) { corte[i] = rs[k] * Math.tan(th / 2); giro[i] = th; raio[i] = rs[k]; }
  });
  const ate = fechado ? n : n - 1;
  for (let i = 0; i < ate; i++) {
    const j = (i + 1) % n; const Lt = norma(sub(ponto(j), ponto(i)));
    if (corte[i] + corte[j] > Lt + 1e-6) {
      const parte = (q) => (raio[q] > 0 ? `o raio ${raio[q]} em pontos[${q}] corta ${+corte[q].toFixed(2)} mm dele, e o maior que cabe ali com o outro como está é ${+((Lt - corte[i] - corte[j] + corte[q]) / Math.tan(giro[q] / 2)).toFixed(2)} mm` : null);
      falha(`o raio não cabe no trecho de trilho.pontos[${i}] a trilho.pontos[${j}]: o trecho mede ${+Lt.toFixed(2)} mm e os arcos pedem ${+(corte[i] + corte[j]).toFixed(2)} mm (${[parte(i), parte(j)].filter(Boolean).join('; ')})`);
    }
  }
  const segs = [];
  const reta = (de, para, onde) => { if (norma(sub(para, de)) > 1e-6) segs.push(segmentoReta(de, para, onde)); };
  let inicio;
  if (fechado) {
    const a = ponto(n - 1); const d = unit(sub(ponto(0), a)); const Lt = norma(sub(ponto(0), a));
    inicio = soma(a, esc(d, corte[n - 1] + (Lt - corte[n - 1] - corte[0]) / 2));
  } else inicio = p[0];
  let atual = inicio;
  for (const i of cantos) {
    const P = ponto(i); const d1 = unit(sub(P, ponto(i - 1))); const d2 = unit(sub(ponto(i + 1), P));
    if (!(raio[i] > 0)) { reta(atual, P, `trilho.pontos[${i}]`); atual = P; continue; }
    const T1 = sub(P, esc(d1, corte[i]));
    reta(atual, T1, `trilho.pontos[${i}]`);
    const eixo = unit(cruz(d1, d2)); const centro = soma(T1, esc(unit(cruz(eixo, d1)), raio[i]));
    segs.push(segmentoArco({ centro, eixo, de: T1, graus: giro[i] / GRAUS }, `o arco em trilho.pontos[${i}]`));
    atual = soma(P, esc(d2, corte[i]));
  }
  reta(atual, fechado ? inicio : p[n - 1], `trilho.pontos[${n - 1}]`);
  if (!segs.length) falha('trilho.pontos não deixa comprimento: os pontos coincidem');
  return { segs, fechado };
}

function lerTrilho(trilho) {
  let segs = []; let fechado = false;
  if (trilho && !Array.isArray(trilho) && typeof trilho === 'object') {
    exigirCampos(trilho, ['pontos', 'raios', 'fechado'], 'trilho');
    const p = trilho.pontos;
    if (!Array.isArray(p) || p.length < 2) falha(`trilho.pontos precisa ser lista de pelo menos dois pontos [x, y, z], e veio ${mostra(p)}`);
    p.forEach((q, k) => vetor(q, `trilho.pontos[${k}]`));
    if (trilho.raios === undefined && trilho.fechado === undefined) {
      for (let k = 0; k + 1 < p.length; k++) segs.push(segmentoReta(p[k], p[k + 1], `trilho.pontos[${k}]-[${k + 1}]`));
    } else ({ segs, fechado } = trechosComRaios(trilho));
  } else {
    if (!Array.isArray(trilho) || !trilho.length) falha(`trilho precisa ser lista de segmentos { reta } ou { arco }, ou { pontos }, e veio ${mostra(trilho)}`);
    trilho.forEach((seg, k) => {
      const onde = `trilho[${k}]`;
      exigirCampos(seg, ['reta', 'arco'], onde);
      if ((seg.reta === undefined) === (seg.arco === undefined)) falha(`${onde} precisa ter reta ou arco, um só dos dois`);
      if (seg.reta !== undefined) {
        exigirCampos(seg.reta, ['de', 'ate'], `${onde}.reta`);
        segs.push(segmentoReta(vetor(seg.reta.de, `${onde}.reta.de`), vetor(seg.reta.ate, `${onde}.reta.ate`), `${onde}.reta`));
      } else {
        exigirCampos(seg.arco, ['centro', 'eixo', 'de', 'graus'], `${onde}.arco`);
        segs.push(segmentoArco(seg.arco, `${onde}.arco`));
      }
    });
    for (let k = 1; k < segs.length; k++) {
      if (norma(sub(segs[k].inicio, segs[k - 1].fim)) > 1e-6) falha(`trilho[${k}] começa em [${segs[k].inicio.map((x) => +x.toFixed(4))}] e o segmento anterior termina em [${segs[k - 1].fim.map((x) => +x.toFixed(4))}]; os segmentos precisam se emendar`);
    }
  }
  const acum = []; let L = 0;
  for (const g of segs) { acum.push(L); L += g.comprimento; }
  const local = (s) => {
    const x = Math.min(Math.max(s, 0), L);
    let k = acum.length - 1;
    while (k > 0 && acum[k] > x) k--;
    return { k, x: x - acum[k] };
  };
  const em = (s) => { const { k, x } = local(s); return segs[k].em(x); };
  return { comprimento: L, em, local, segs, acum, fechado };
}

/* ------------------------------------------------------------------ leitura da definição */

function lerQuadro(q, trilho) {
  exigirCampos(q, ['u', 'v', 'virar', 'modo'], 'quadro');
  if ((q.u === undefined) === (q.v === undefined)) falha('quadro precisa ter u ou v, um só dos dois: a direção fixa de um eixo da seção');
  if (q.virar !== undefined && typeof q.virar !== 'boolean') falha(`quadro.virar precisa ser true ou false, e veio ${mostra(q.virar)}`);
  if (q.modo !== undefined && !MODOS_DO_QUADRO.includes(q.modo)) falha(`quadro.modo precisa ser ${MODOS_DO_QUADRO.map(citar).join(' ou ')}, e veio ${mostra(q.modo)}`);
  const eixoU = q.u !== undefined; const rotulo = eixoU ? 'u' : 'v';
  const fixo = unit(vetor(q.u ?? q.v, `quadro.${rotulo}`, { diferenteDeZero: true }));
  const sinal = q.virar ? -1 : 1;
  const montar = (W, t) => {
    const outro = esc(unit(eixoU ? cruz(t, W) : cruz(W, t)), sinal);
    return eixoU ? { U: W, V: outro } : { U: outro, V: W };
  };
  /* a fração do eixo fixo que fica no plano normal ao trilho: o tamanho da seção naquele eixo, medido no corte reto do trilho */
  const fator = (t) => norma(cruz(t, fixo));
  if (q.modo !== 'acompanha') {
    return {
      modo: 'fixo', rotulo, fator,
      em: (t, s) => {
        const o = eixoU ? cruz(t, fixo) : cruz(fixo, t);
        if (!(norma(o) > 1e-9)) falha(`o quadro é paralelo ao trilho em s = ${+s.toFixed(3)} mm: a direção fixa ${rotulo} precisa cruzar a tangente`);
        const outro = esc(unit(o), sinal);
        return eixoU ? { U: fixo, V: outro } : { U: outro, V: fixo };
      },
    };
  }
  /* o quadro que acompanha: o eixo fixo projetado no plano normal ao começo do trilho e levado sem torção (transporte paralelo):
     parado nas retas, girando com a tangente em volta do eixo de cada arco e, num canto vivo, pelo menor giro de uma reta à outra */
  const { segs, comprimento: L } = trilho;
  const projetar = (w, t, onde) => {
    const r = sub(w, esc(t, dot(w, t)));
    if (!(norma(r) > 1e-9)) falha(`o quadro é paralelo ao trilho ${onde}: a direção fixa ${rotulo} precisa cruzar a tangente`);
    return unit(r);
  };
  const inicios = []; let w = projetar(fixo, segs[0].tInicio, 'no começo');
  segs.forEach((g, k) => {
    if (k > 0) w = projetar(giroMinimo(w, segs[k - 1].tFim, g.tInicio), g.tInicio, `em s = ${+trilho.acum[k].toFixed(3)} mm`);
    inicios.push(w); w = g.levar(g.comprimento, w);
  });
  /* no trilho fechado o quadro volta girado em volta da tangente (a torção do laço); o giro se reparte por igual ao longo do trilho */
  let torcao = 0;
  if (trilho.fechado) {
    const t0 = segs[0].tInicio; const w0 = inicios[0]; const wL = projetar(giroMinimo(w, segs.at(-1).tFim, t0), t0, 'no fim');
    torcao = Math.atan2(dot(cruz(wL, w0), t0), dot(wL, w0));
  }
  return {
    modo: 'acompanha', rotulo, fator,
    em: (t, s) => {
      const { k, x } = trilho.local(s);
      let W = segs[k].levar(x, inicios[k]);
      if (torcao) W = girar(W, t, torcao * Math.min(Math.max(s, 0), L) / L);
      return montar(projetar(W, t, `em s = ${+s.toFixed(3)} mm`), t);
    },
  };
}

function lerSecao(secao) {
  if (!Array.isArray(secao) || secao.length < 2) falha(`secao precisa ser lista de pelo menos duas linhas [u, v], e veio ${mostra(secao)}`);
  const nomes = new Set();
  const linhas = secao.map((l, j) => {
    const onde = `secao[${j}]`;
    let u; let v; let nome = null;
    if (Array.isArray(l)) {
      if (l.length !== 2) falha(`${onde} precisa ser [u, v], e veio ${mostra(l)}`);
      [u, v] = l;
    } else {
      exigirCampos(l, ['u', 'v', 'nome'], onde);
      ({ u, v } = l);
      if (l.nome !== undefined) {
        if (typeof l.nome !== 'string' || !l.nome) falha(`${onde}.nome precisa ser texto, e veio ${mostra(l.nome)}`);
        if (nomes.has(l.nome)) falha(`o nome de linha ${citar(l.nome)} aparece mais de uma vez em secao`);
        nomes.add(l.nome); nome = l.nome;
      }
    }
    numero(u, `${onde}.u`); numero(v, `${onde}.v`);
    return { u, v, nome };
  });
  linhas.forEach((l, j) => {
    if (j > 0 && Math.hypot(l.u - linhas[j - 1].u, l.v - linhas[j - 1].v) < EPS) falha(`secao[${j}] repete o ponto de secao[${j - 1}]: duas linhas seguidas no mesmo lugar`);
  });
  return linhas;
}

function lerMarco(m, onde) {
  exigirCampos(m, ['em', 'fracao', 'plano', 'cilindro', 'nome', 'escala', 'cruzando'], onde);
  const seletores = ['em', 'fracao', 'plano', 'cilindro'].filter((k) => m[k] !== undefined);
  if (seletores.length !== 1) falha(`${onde} precisa ter um só corte entre em, fracao, plano e cilindro, e veio ${seletores.length ? seletores.join(' e ') : 'nenhum'}`);
  const marco = { nome: null, escala: null, cruzando: null };
  if (m.nome !== undefined) { if (typeof m.nome !== 'string' || !m.nome) falha(`${onde}.nome precisa ser texto, e veio ${mostra(m.nome)}`); marco.nome = m.nome; }
  if (m.escala !== undefined) marco.escala = numero(m.escala, `${onde}.escala`, { maiorQue: 0 });
  if (m.cruzando !== undefined) {
    if (m.cruzando !== 'subindo' && m.cruzando !== 'descendo') falha(`${onde}.cruzando precisa ser 'subindo' ou 'descendo', e veio ${mostra(m.cruzando)}`);
    if (m.plano === undefined && m.cilindro === undefined) falha(`${onde}.cruzando só vale com plano ou cilindro`);
    marco.cruzando = m.cruzando;
  }
  const sel = seletores[0];
  if (sel === 'em') { marco.tipo = 'em'; marco.em = numero(m.em, `${onde}.em`); }
  else if (sel === 'fracao') {
    marco.tipo = 'fracao'; marco.fracao = numero(m.fracao, `${onde}.fracao`);
    if (marco.fracao < 0 || marco.fracao > 1) falha(`${onde}.fracao precisa estar entre 0 e 1, e veio ${m.fracao}`);
  } else if (sel === 'plano') {
    exigirCampos(m.plano, ['eixo', 'valor'], `${onde}.plano`);
    const i = ['x', 'y', 'z'].indexOf(m.plano.eixo);
    if (i < 0) falha(`${onde}.plano.eixo precisa ser 'x', 'y' ou 'z', e veio ${mostra(m.plano.eixo)}`);
    marco.tipo = 'superficie'; marco.alvo = numero(m.plano.valor, `${onde}.plano.valor`); marco.medida = (p) => p[i];
  } else {
    exigirCampos(m.cilindro, ['eixo', 'por', 'raio'], `${onde}.cilindro`);
    const { medida } = lerCilindro(m.cilindro, `${onde}.cilindro`);
    marco.tipo = 'superficie'; marco.alvo = m.cilindro.raio; marco.medida = medida;
  }
  return marco;
}
/* a distância de um ponto à reta do cilindro */
function lerCilindro(c, onde) {
  const eixo = unit(vetor(c.eixo, `${onde}.eixo`, { diferenteDeZero: true })); const por = vetor(c.por, `${onde}.por`);
  numero(c.raio, `${onde}.raio`, { maiorQue: 0 });
  return { eixo, por, medida: (p) => { const q = sub(p, por); return norma(sub(q, esc(eixo, dot(q, eixo)))); } };
}

function lerEstacoes(estacoes) {
  if (!Array.isArray(estacoes) || estacoes.length < 2) falha(`estacoes precisa ser lista com pelo menos dois marcos, e veio ${mostra(estacoes)}`);
  const itens = []; const nomes = new Set();
  estacoes.forEach((e, k) => {
    const onde = `estacoes[${k}]`;
    if (e && typeof e === 'object' && !Array.isArray(e) && ('entre' in e || 'passo' in e)) {
      exigirCampos(e, ['entre', 'passo', 'linha'], onde);
      if (('entre' in e) === ('passo' in e)) falha(`${onde} precisa ter entre ou passo, um só dos dois`);
      if (e.linha !== undefined && !('passo' in e)) falha(`${onde}.linha só vale com passo: a linha cujo trecho mede o passo`);
      if (e.linha !== undefined && (typeof e.linha !== 'string' || !e.linha)) falha(`${onde}.linha precisa ser o nome de uma linha da seção, e veio ${mostra(e.linha)}`);
      if (k === 0 || k === estacoes.length - 1) falha(`${onde} divide um trecho e precisa ficar entre dois marcos; a primeira e a última estação são marcos`);
      if (itens.at(-1)?.divide) falha(`${onde} vem logo depois de outra divisão; ponha um marco entre as duas`);
      itens.push('entre' in e ? { divide: 'entre', n: numero(e.entre, `${onde}.entre`, { maiorQue: 0, inteiro: true }) } : { divide: 'passo', passo: numero(e.passo, `${onde}.passo`, { maiorQue: 0 }), linha: e.linha ?? null, onde });
      return;
    }
    const marco = lerMarco(e, onde);
    if (marco.nome !== null) { if (nomes.has(marco.nome)) falha(`o nome de estação ${citar(marco.nome)} aparece mais de uma vez em estacoes`); nomes.add(marco.nome); }
    itens.push(marco);
  });
  return itens;
}

/* as estações tiradas do trilho: um marco em cada emenda de segmento (o começo e o fim de cada arco, o canto vivo), `passo` mm nas
   retas e, nos arcos, uma estação a cada `graus` de giro da tangente e a cada corda de `flecha` mm, o que der mais */
function estacoesDoTrilho(e, trilho) {
  exigirCampos(e, ['passo', 'graus', 'flecha'], 'estacoes');
  const passo = numero(e.passo, 'estacoes.passo', { maiorQue: 0 });
  const graus = e.graus === undefined ? GRAUS_POR_ESTACAO : numero(e.graus, 'estacoes.graus', { maiorQue: 0 });
  const flecha = e.flecha === undefined ? FLECHA_POR_ESTACAO : numero(e.flecha, 'estacoes.flecha', { maiorQue: 0 });
  const partes = (g) => {
    const giro = Math.abs(g.graus) * GRAUS; const R = g.comprimento / giro;
    const pelaFlecha = flecha >= R ? Math.PI : 2 * Math.acos(1 - flecha / R);
    return Math.max(1, Math.ceil(giro / (graus * GRAUS) - 1e-9), Math.ceil(giro / pelaFlecha - 1e-9));
  };
  const lista = [{ fracao: 0 }];
  trilho.segs.forEach((g, k) => {
    lista.push(g.tipo === 'arco' ? { entre: partes(g) } : { passo });
    lista.push(k + 1 < trilho.segs.length ? { em: trilho.acum[k + 1] } : { fracao: 1 });
  });
  return lista;
}

function lerFora(fora) {
  if (Array.isArray(fora)) { vetor(fora, 'fora', { diferenteDeZero: true }); return () => fora; }
  exigirCampos(fora, ['centro', 'semEixo'], 'fora');
  vetor(fora.centro, 'fora.centro');
  const i = fora.semEixo === undefined ? -1 : ['x', 'y', 'z'].indexOf(fora.semEixo);
  if (fora.semEixo !== undefined && i < 0) falha(`fora.semEixo precisa ser 'x', 'y' ou 'z', e veio ${mostra(fora.semEixo)}`);
  return (c) => { const d = sub(c, fora.centro); if (i >= 0) d[i] = 0; return d; };
}

function lerAlargamento(a, linhas, onde) {
  exigirCampos(a, ['campo', 'perfil', 'topoAberto', 'rolada'], onde);
  exigirCampos(a.campo, ['cilindro'], `${onde}.campo`);
  exigirCampos(a.campo.cilindro, ['eixo', 'por', 'raio'], `${onde}.campo.cilindro`);
  const { medida } = lerCilindro(a.campo.cilindro, `${onde}.campo.cilindro`);
  const raio = a.campo.cilindro.raio;
  if (!Array.isArray(a.perfil) || a.perfil.length < 2) falha(`${onde}.perfil precisa ser lista de pelo menos dois pontos [d, u], e veio ${mostra(a.perfil)}`);
  a.perfil.forEach((p, k) => {
    if (!Array.isArray(p) || p.length !== 2) falha(`${onde}.perfil[${k}] precisa ser [d, u], e veio ${mostra(p)}`);
    numero(p[0], `${onde}.perfil[${k}][0]`); numero(p[1], `${onde}.perfil[${k}][1]`);
    if (k > 0 && !(p[0] > a.perfil[k - 1][0])) falha(`${onde}.perfil[${k}] tem d = ${p[0]}, que não passa do anterior (${a.perfil[k - 1][0]}); o d cresce ao longo do perfil`);
  });
  if (a.topoAberto !== undefined && typeof a.topoAberto !== 'boolean') falha(`${onde}.topoAberto precisa ser true ou false, e veio ${mostra(a.topoAberto)}`);
  let rolada = null;
  if (a.rolada !== undefined) {
    exigirCampos(a.rolada, ['abaixoDe', 'razao'], `${onde}.rolada`);
    rolada = { abaixoDe: numero(a.rolada.abaixoDe, `${onde}.rolada.abaixoDe`), razao: numero(a.rolada.razao, `${onde}.rolada.razao`, { maiorQue: 0 }) };
    if (!linhas.some((l) => l.v < rolada.abaixoDe)) falha(`${onde}.rolada.abaixoDe = ${rolada.abaixoDe} fica abaixo de todas as linhas da seção; nenhuma linha seria rolada`);
  }
  const p = a.perfil;
  const saida = (d) => {
    if (d <= p[0][0] || d >= p.at(-1)[0]) return 0;
    let k = 1; while (p[k][0] < d) k++;
    return lerp(p[k - 1][1], p[k][1], (d - p[k - 1][0]) / (p[k][0] - p[k - 1][0]));
  };
  return { distancia: (ponto) => medida(ponto) - raio, saida, topoAberto: a.topoAberto === true, rolada };
}

/* ------------------------------------------------------------------ o cálculo */

/* o primeiro `s`, de s0 ao fim do trilho, em que a linha chega ao alvo (no sentido pedido); null se não chega */
function acharCruzamento(medidaEm, alvo, cruzando, s0, L) {
  const n = Math.min(AMOSTRAS_MAXIMAS, Math.max(64, Math.ceil((L - s0) / AMOSTRA_MM)));
  let a = s0; let fa = medidaEm(a) - alvo;
  for (let k = 1; k <= n; k++) {
    const b = lerp(s0, L, k / n); const fb = medidaEm(b) - alvo;
    const sobe = fa < 0 && fb >= 0; const desce = fa > 0 && fb <= 0;
    if ((cruzando === 'subindo' && sobe) || (cruzando === 'descendo' && desce) || (cruzando === null && (sobe || desce))) {
      let lo = a; let hi = b;
      for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; const fm = medidaEm(m) - alvo; if ((fm < 0) === (fa < 0) && fm !== 0) lo = m; else hi = m; }
      return (lo + hi) / 2;
    }
    a = b; fa = fb;
  }
  return null;
}

export function gaiolaVarrida(definicao) {
  exigirCampos(definicao, CAMPOS, 'a definição');
  const { nome } = definicao;
  if (typeof nome !== 'string' || !nome) falha(`nome precisa ser texto não vazio (o prefixo dos pontos), e veio ${mostra(nome)}`);
  if (definicao.trilho === undefined) falha('trilho é obrigatório: os segmentos de reta e arco, ou { pontos }');
  if (definicao.quadro === undefined) falha('quadro é obrigatório: { u: [x, y, z] } ou { v: [x, y, z] }');
  if (definicao.secao === undefined) falha('secao é obrigatória: a lista das linhas [u, v]');
  if (definicao.estacoes === undefined) falha('estacoes é obrigatória: os marcos e as divisões entre eles');
  if (definicao.fechada !== undefined && typeof definicao.fechada !== 'boolean') falha(`fechada precisa ser true ou false, e veio ${mostra(definicao.fechada)}`);
  if (definicao.tampas !== undefined && typeof definicao.tampas !== 'boolean' && definicao.tampas !== 'redondas') falha(`tampas precisa ser true, false ou 'redondas', e veio ${mostra(definicao.tampas)}`);
  const fechada = definicao.fechada === true; const tampas = definicao.tampas === true || definicao.tampas === 'redondas';
  const tampasPlanas = definicao.tampas === true;
  if (tampas && !fechada) falha('tampas pede fechada: true; a tampa é a face de todas as linhas da estação, e só a seção fechada tem contorno para ela');
  if (fechada && definicao.fora !== undefined) falha('fora não vale com fechada: a seção fechada orienta as faces pelo volume, para fora');
  if (!fechada && definicao.fora === undefined) falha('fora é obrigatório: o lado da normal das faces, [x, y, z] ou { centro }');
  const trilho = lerTrilho(definicao.trilho);
  const quadro = lerQuadro(definicao.quadro, trilho);
  const linhas = lerSecao(definicao.secao);
  const itens = lerEstacoes(Array.isArray(definicao.estacoes) ? definicao.estacoes : estacoesDoTrilho(definicao.estacoes, trilho));
  if (fechada && linhas.length < 3) falha(`a seção fechada precisa de pelo menos três linhas, e veio com ${linhas.length}`);
  if (fechada && Math.hypot(linhas.at(-1).u - linhas[0].u, linhas.at(-1).v - linhas[0].v) < EPS) falha(`secao[${linhas.length - 1}] repete o ponto de secao[0]: na seção fechada a volta da última linha à primeira já é feita, sem repetir o ponto`);
  const dicaDeFora = fechada ? null : lerFora(definicao.fora);
  if (trilho.fechado && tampas) falha('tampas não vale com o trilho fechado: o laço não tem ponta, e a última estação é a primeira');
  const alarg = definicao.alargamento === undefined ? [] : (Array.isArray(definicao.alargamento) ? definicao.alargamento : [definicao.alargamento]).map((a, k) => lerAlargamento(a, linhas, Array.isArray(definicao.alargamento) ? `alargamento[${k}]` : 'alargamento'));
  const nLinhas = linhas.length; const L = trilho.comprimento;

  const rotuloMarco = (m, k) => (m.nome ? citar(m.nome) : `estacoes[${k}]`);
  const rotuloLinha = (j) => (linhas[j].nome ? citar(linhas[j].nome) : `secao[${j}]`);

  /* os marcos, linha a linha: o `s` de cada marco em cada linha */
  const marcos = []; // { item (índice em itens), s: [por linha], marco }
  itens.forEach((m, k) => {
    if (m.divide) return;
    const s = linhas.map((l, j) => {
      if (m.tipo === 'em') {
        if (m.em < -EPS || m.em > L + EPS) falha(`${rotuloMarco(m, k)} está em ${m.em} mm, fora do trilho (0 a ${+L.toFixed(3)} mm)`);
        return m.em;
      }
      if (m.tipo === 'fracao') return m.fracao * L;
      const antes = marcos.at(-1)?.s[j] ?? 0;
      const achou = acharCruzamento((x) => {
        const { p, t } = trilho.em(x); const { U, V } = quadro.em(t, x);
        return m.medida(soma(p, soma(esc(U, l.u), esc(V, l.v))));
      }, m.alvo, m.cruzando, antes, L);
      if (achou === null) falha(`a linha ${rotuloLinha(j)} da seção não cruza o corte ${rotuloMarco(m, k)} depois de s = ${+antes.toFixed(3)} mm no trilho${m.cruzando ? ` (${m.cruzando})` : ''}`);
      return achou;
    });
    const anterior = marcos.at(-1);
    if (anterior) {
      s.forEach((x, j) => {
        if (!(x > anterior.s[j] + EPS)) falha(`os cortes ${rotuloMarco(anterior.marco, anterior.k)} e ${rotuloMarco(m, k)} caem no mesmo lugar ou fora de ordem na linha ${rotuloLinha(j)} (s = ${+anterior.s[j].toFixed(3)} e ${+x.toFixed(3)} mm); as estações têm de crescer ao longo do trilho`);
      });
    }
    marcos.push({ k, marco: m, s });
  });

  /* as estações: os marcos e, entre eles, as divisões */
  const estacoes = []; // { s: [por linha], marco: índice do marco | null }
  let m = 0;
  for (let k = 0; k < itens.length; k++) {
    if (itens[k].divide) continue;
    const de = marcos[m]; const ate = marcos[m + 1];
    estacoes.push({ s: de.s, marcoK: de.k, nome: de.marco.nome });
    const div = itens[k + 1]?.divide ? itens[k + 1] : null;
    if (ate) {
      let trechos = de.s.map((x, j) => ate.s[j] - x);
      if (div?.linha) {
        const j = linhas.findIndex((l) => l.nome === div.linha);
        if (j < 0) falha(`${div.onde}.linha cita ${citar(div.linha)}, que não é nome de linha da seção`);
        trechos = [trechos[j]];
      }
      const maior = Math.max(...trechos);
      const n = div ? (div.divide === 'entre' ? div.n : Math.max(1, Math.ceil(maior / div.passo - 1e-9))) : 1;
      for (let i = 1; i < n; i++) estacoes.push({ s: de.s.map((x, j) => lerp(x, ate.s[j], i / n)), marcoK: null, nome: null });
    }
    m += 1;
  }
  const nEst = estacoes.length;
  /* no trilho fechado a última estação é a primeira: as faces da última volta voltam aos pontos da estação 0 */
  if (trilho.fechado) {
    linhas.forEach((_, j) => {
      if (estacoes[0].s[j] > 1e-6 || estacoes[nEst - 1].s[j] < L - 1e-6) falha(`no trilho fechado a primeira e a última estação são o começo e o fim do trilho em todas as linhas, e na linha ${rotuloLinha(j)} vão de s = ${+estacoes[0].s[j].toFixed(3)} a ${+estacoes[nEst - 1].s[j].toFixed(3)} mm (de 0 a ${+L.toFixed(3)})`);
    });
    if (nEst < 3) falha(`o trilho fechado precisa de pelo menos três estações, e veio com ${nEst}`);
  }
  const volta = (i) => (trilho.fechado && i === nEst - 1 ? 0 : i);

  /* o aviso da seção achatada: com o quadro fixo, o eixo fixo que não fica no plano normal ao trilho encolhe a seção naquele eixo,
     medida no corte reto do trilho; a malha não muda, e o aviso diz o trecho e a medida */
  const avisos = [];
  if (quadro.modo === 'fixo') {
    const ext = linhas.map((l) => (quadro.rotulo === 'u' ? l.u : l.v));
    const tamanho = Math.max(...ext) - Math.min(...ext);
    let corrida = null;
    const fechar = () => {
      if (!corrida) return;
      avisos.push({
        tipo: 'secao-achatada', eixo: quadro.rotulo, de: corrida.de, ate: corrida.ate, razao: corrida.razao, tamanho, medida: tamanho * corrida.razao,
        mensagem: `a seção achata no eixo ${quadro.rotulo} de s = ${+corrida.de.toFixed(1)} a ${+corrida.ate.toFixed(1)} mm: ${+tamanho.toFixed(2)} mm de seção medem ${+(tamanho * corrida.razao).toFixed(2)} mm no corte reto do trilho (${+corrida.razao.toFixed(3)}), porque a direção fixa ${quadro.rotulo} do quadro não fica no plano normal ao trilho ali; quadro.modo 'acompanha' mantém a seção nesse plano`,
      });
      corrida = null;
    };
    estacoes.forEach((e) => {
      const razao = Math.min(...e.s.map((x) => quadro.fator(trilho.em(x).t)));
      if (razao < 1 - ACHATAMENTO_TOLERADO) {
        if (!corrida) corrida = { de: e.s[0], ate: e.s[0], razao };
        corrida.ate = e.s[0]; corrida.razao = Math.min(corrida.razao, razao);
      } else fechar();
    });
    fechar();
  }

  /* a escala de u em cada estação e linha, em linha reta no `s` entre os marcos que a declaram */
  const comEscala = marcos.filter((x) => x.marco.escala !== null);
  const escalaEm = (j, s) => {
    if (!comEscala.length) return 1;
    if (s <= comEscala[0].s[j]) return comEscala[0].marco.escala;
    for (let q = 1; q < comEscala.length; q++) {
      if (s <= comEscala[q].s[j]) return lerp(comEscala[q - 1].marco.escala, comEscala[q].marco.escala, (s - comEscala[q - 1].s[j]) / (comEscala[q].s[j] - comEscala[q - 1].s[j]));
    }
    return comEscala.at(-1).marco.escala;
  };

  /* as posições */
  const nomeDe = (i, j) => `${nome}_${i}_${j}`;
  const pos = new Map();
  for (let i = 0; i < nEst; i++) {
    for (let j = 0; j < nLinhas; j++) {
      const s = estacoes[i].s[j]; const l = linhas[j];
      const { p, t } = trilho.em(s); const { U, V } = quadro.em(t, s);
      const uProprio = l.u * escalaEm(j, s);
      let u = uProprio;
      for (const a of alarg) {
        const sobe = uProprio > EPS || (a.topoAberto && j === nLinhas - 1);
        const saida = sobe ? a.saida(a.distancia(soma(p, esc(V, l.v)))) : 0;
        if (saida > EPS) {
          let c = Math.max(saida, uProprio);
          if (a.rolada && l.v < a.rolada.abaixoDe && uProprio > 0) c = Math.min(c, a.rolada.razao * uProprio);
          u = Math.max(u, c);
        }
      }
      pos.set(nomeDe(i, j), soma(p, soma(esc(U, u), esc(V, l.v))));
    }
  }

  /* os recortes: as células entre os marcos e as linhas citados */
  const indiceDaEstacao = new Map(estacoes.map((e, i) => [e.nome, i]).filter(([n]) => n));
  const indiceDaLinha = new Map(linhas.map((l, j) => [l.nome, j]).filter(([n]) => n));
  const removidas = [];
  if (definicao.remover !== undefined) {
    if (!Array.isArray(definicao.remover)) falha(`remover precisa ser lista de { estacoes, linhas }, e veio ${mostra(definicao.remover)}`);
    definicao.remover.forEach((r, k) => {
      const onde = `remover[${k}]`;
      exigirCampos(r, ['estacoes', 'linhas'], onde);
      const par = (campo, mapa, rotulo) => {
        const v = r[campo];
        if (!Array.isArray(v) || v.length !== 2 || v.some((x) => typeof x !== 'string')) falha(`${onde}.${campo} precisa ser [nomeA, nomeB], dois nomes de ${rotulo}, e veio ${mostra(v)}`);
        for (const x of v) if (!mapa.has(x)) falha(`${onde}.${campo} cita ${citar(x)}, que não é nome de ${rotulo} declarado`);
        const [a, b] = v.map((x) => mapa.get(x));
        if (!(a < b)) falha(`${onde}.${campo} vai de ${citar(v[0])} a ${citar(v[1])}, que não está depois dele; cite os nomes em ordem`);
        return [a, b];
      };
      removidas.push({ i: par('estacoes', indiceDaEstacao, 'estação'), j: par('linhas', indiceDaLinha, 'linha') });
    });
  }
  const removida = (i, j) => removidas.some((r) => i >= r.i[0] && i + 1 <= r.i[1] && j >= r.j[0] && j + 1 <= r.j[1]);

  /* as faces, para o lado de fora */
  let faces = [];
  const celulas = fechada ? nLinhas : nLinhas - 1;
  for (let i = 0; i + 1 < nEst; i++) {
    for (let j = 0; j < celulas; j++) {
      const k = (j + 1) % nLinhas;
      if (!removida(i, j)) faces.push([nomeDe(i, j), nomeDe(volta(i + 1), j), nomeDe(volta(i + 1), k), nomeDe(i, k)]);
    }
  }
  if (!faces.length) falha('os recortes tiram todas as faces da superfície');
  if (fechada) {
    /* as tampas no sentido das faces do tubo, que passam na ponta de baixo de (0, j + 1) a (0, j) e na de cima de (último, j) a
       (último, j + 1): cada tampa percorre a aresta no sentido contrário */
    const ponta = (i) => Array.from({ length: nLinhas }, (_, j) => nomeDe(i, j));
    const tampaDe = [ponta(0), ponta(nEst - 1).reverse()];
    const volume = [...faces, ...(trilho.fechado ? [] : tampaDe)].reduce((v, f) => {
      const a = pos.get(f[0]);
      for (let k = 1; k + 1 < f.length; k++) v += dot(a, cruz(pos.get(f[k]), pos.get(f[k + 1]))) / 6;
      return v;
    }, 0);
    if (!(Math.abs(volume) > EPS)) falha(`a seção fechada não encerra volume ao longo do trilho (${volume} mm³): a seção precisa ter área`);
    if (tampas) faces.push(...tampaDe);
    if (volume < 0) faces = faces.map((f) => [...f].reverse());
  }
  let placar = fechada ? 1 : 0;
  for (const f of fechada ? [] : faces) {
    const ps = f.map((n) => pos.get(n)); let n = [0, 0, 0];
    ps.forEach((p, k) => {
      const q = ps[(k + 1) % ps.length];
      n = [n[0] + (p[1] - q[1]) * (p[2] + q[2]), n[1] + (p[2] - q[2]) * (p[0] + q[0]), n[2] + (p[0] - q[0]) * (p[1] + q[1])];
    });
    const c = esc(ps.reduce((a, p) => soma(a, p), [0, 0, 0]), 1 / ps.length);
    placar += Math.sign(dot(n, dicaDeFora(c)));
  }
  if (placar === 0) falha('fora não decide o lado das faces: a soma dos sinais sobre a malha deu zero; aponte fora para o lado em que a maior parte da superfície olha');
  if (placar < 0) faces = faces.map((f) => [...f].reverse());

  /* os vincos ao longo das linhas, cortados onde a aresta não fica entre duas faces */
  const chv = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const arestas = new Map();
  faces.forEach((f) => f.forEach((n, k) => { const c = chv(n, f[(k + 1) % f.length]); arestas.set(c, (arestas.get(c) ?? 0) + 1); }));
  const vincos = [];
  if (definicao.vincos !== undefined) {
    if (!Array.isArray(definicao.vincos)) falha(`vincos precisa ser lista de { linha, nitidez }, e veio ${mostra(definicao.vincos)}`);
    definicao.vincos.forEach((v, k) => {
      const onde = `vincos[${k}]`;
      exigirCampos(v, ['linha', 'nitidez'], onde);
      if (typeof v.linha !== 'string' || !indiceDaLinha.has(v.linha)) falha(`${onde}.linha precisa ser o nome de uma linha da seção, e veio ${mostra(v.linha)}`);
      if (v.nitidez !== 'viva' && !(finito(v.nitidez) && v.nitidez >= 0 && v.nitidez <= 1)) falha(`${onde}.nitidez precisa ser de 0 a 1, ou 'viva', e veio ${mostra(v.nitidez)}`);
      const j = indiceDaLinha.get(v.linha);
      const todos = Array.from({ length: nEst }, (_, i) => nomeDe(volta(i), j));
      let corrida = [todos[0]]; let q = 0;
      const fechar = () => { if (corrida.length > 1) { vincos.push({ nome: `${nome}_${v.linha}_${q}`, pontos: corrida, nitidez: v.nitidez }); q += 1; } };
      for (let i = 0; i + 1 < nEst; i++) {
        if (arestas.get(chv(todos[i], todos[i + 1])) === 2) corrida.push(todos[i + 1]); else { fechar(); corrida = [todos[i + 1]]; }
      }
      fechar();
    });
  }
  if (tampasPlanas) {
    [0, nEst - 1].forEach((i, q) => {
      const aro = Array.from({ length: nLinhas }, (_, j) => nomeDe(i, j));
      vincos.push({ nome: `${nome}_tampa_${q}`, pontos: [...aro, aro[0]], nitidez: 'viva' });
    });
  }

  const vertices = [...new Set(faces.flat())].sort();
  const posicoes = new Map(vertices.map((n) => [n, pos.get(n)]));
  const pontos = Object.fromEntries(vertices.map((n) => [n, pos.get(n).map((x) => x / MM)]));
  return {
    nome, vertices, faces, vincos, cantos: [], pontos, posicoes, nomeDe,
    estacoes: estacoes.map((e) => ({ nome: e.nome, s: e.s })), linhas: linhas.map((l) => l.nome), comprimento: L,
    ...(avisos.length ? { avisos } : {}),
  };
}
