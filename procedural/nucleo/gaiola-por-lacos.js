/* gaiola-por-lacos.js — monta a gaiola fechada da operação `subdivisao` a partir de laços, um contorno por plano ao longo de um eixo
 *
 * FICHA gaiolaPorLacos
 * serve: gaiola de um sólido fechado dado por laços, o contorno da peça em cada plano ao longo de um eixo, com as pontas tampadas.
 * quando: corpos que se fundem numa malha só sem emenda (L, U, cotovelo, alça, cabo, disco com coluna, carcaça com cantos suaves),
 *   cortados em planos paralelos; para uma chapa aberta use gaiolaPorEstacoes, e para uma faixa de seção constante use gaiolaVarrida.
 * unidades: `em` e os pontos dos trechos entram em mm; `pontos` sai em metro, para pôr em TOPO; espalhe `passo` no passo subdivisao.
 * campos:
 *   nome: prefixo dos pontos, que saem como `${nome}_${laco}_${trecho}${k}`.
 *   eixo: 'x', 'y' ou 'z'; o ponto [u, v] do laço são os outros dois eixos na ordem x, y, z.
 *   trechos: [{ nome, pontos, razao?, some? }] a volta do laço em ordem, e quantos pontos (com as duas pontas) o trecho tem em todo
 *     laço. razao é o último segmento sobre o primeiro (1: iguais; 0,2: encurtam); some, em mm, funde o trecho num ponto onde mede menos.
 *   lacos: [{ nome?, em, trechos: { [trecho]: [[u, v], ...] } }] em crescente; o trecho começa onde o anterior acaba.
 *   tampa: { de, ate } os trechos entre os quais a escada tampa as pontas; as duas cadeias entre eles têm os mesmos pontos.
 *   vincos: [{ nome, trecho | entre: [a, b] | laco, trechos?, lacos?: [de, ate], nitidez }] borda da faixa de um trecho, linha ou
 *     volta de laço; lacos limita o trecho ou o entre a uma faixa de laços. Vinco 'viva' de laço inteiro em dois planos os libera do mínimo.
 *   cantos: [{ entre: [a, b], laco? }] o ponto entre dois trechos fica vivo, em todos os laços ou num só.
 *   medidas: [{ trecho | entre, laco?, peso? }] cota nos pontos marcados; em todos os pontos é recusado.
 *   compensar: true | { trechos, lacos?, pontas? } move os pontos para a superfície limite passar por eles: o arco de r sai com r.
 *     Em peça nova, declare-o nos trechos de canto e de curva (decisão da pessoa, 2026-11-05). pontas move também a lâmina de ponta.
 *   grupos: [{ nome, lacos?: [de, ate], trechos? | unir: [{ lacos?, trechos? }] }] faces para parte; vai em passo.grupos, em pontos.
 * devolve: { pontos, pontosMm, alvosMm, passo, nomeDe(laco, trecho, k), lacos, trechos, avisos, compensacao? }.
 * exemplo:
 *   gaiolaPorLacos({ nome: 'barra', eixo: 'x', tampa: { de: 'baixo', ate: 'cima' },
 *     trechos: [{ nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos: 3 }, { nome: 'cima', pontos: 2 }, { nome: 'tras', pontos: 3 }],
 *     lacos: [0, 50, 100].map((em) => ({ em, trechos: { baixo: [[0, 0], [0, 40]], frente: [[0, 40], [30, 40]],
 *       cima: [[30, 40], [30, 0]], tras: [[30, 0], [0, 0]] } })),
 *     vincos: [{ nome: 'pontas', laco: 'primeiro', nitidez: 'viva' }] })
 * peça: tools/fixtures/solido-por-lacos/coluna.js (disco e cilindro) e tools/fixtures/solido-por-lacos/dobra-em-u.js (dobra em U);
 *   o L é receita.js na mesma pasta.
 * FIM DA FICHA
 *
 * Função pura, sem Three.js e sem domínio. A receita dá, em cada plano, o contorno fechado da peça cortada por ele, em trechos
 * nomeados que vêm na mesma ordem em todo laço; a função reamostra cada trecho com pontos por igual ao longo do comprimento, no
 * número que `trechos` pede, liga dois laços vizinhos ponto a ponto (as tiras), tampa o primeiro e o último laço com uma escada
 * entre as duas cadeias que vão de `tampa.de` a `tampa.ate`, funde os pontos seguidos do mesmo laço que coincidem (a ponta que se
 * fecha num ponto) e orienta as faces pelo sinal do volume. Sai no formato do passo `subdivisao`, com nomes e sem índice.
 * Os limites vistos na coluna do braço (plano dos limites do sólido por laços) estão nos parágrafos A LÂMINA, O PASSO NO TRECHO,
 * OS VINCOS, AS RECUSAS e A COMPENSAÇÃO abaixo.
 *
 * O LAÇO. Cada trecho é uma polilinha [[u, v], ...] de um ou mais pontos; o primeiro ponto dele é o último do trecho anterior, e
 * o último do último trecho é o primeiro do primeiro (a volta fecha), com tolerância de TOLERANCIA_DE_FUSAO_MM. Um trecho de um
 * ponto só tem comprimento zero: todos os pontos dele coincidem e se fundem. O trecho de `pontos` n dá n pontos, as duas pontas
 * nos lugares dados e os outros a distâncias iguais ao longo da polilinha; o último é o primeiro do trecho seguinte, de modo que
 * o laço tem a soma de (n - 1) pontos, o mesmo em todo laço, e os pontos do trecho t no laço l se chamam `${nome}_${l}_${t}${k}`,
 * k de 0 a n - 2. O laço sem nome se chama `l${r}`, pela posição.
 *
 * O PASSO NO TRECHO. Com `razao` r diferente de 1, os segmentos do trecho crescem em progressão geométrica e o último mede r vezes o
 * primeiro: a parede longa que acaba num filete de 0,7 mm tem razao 0,07, e o aviso de amostragem desigual some sem o trecho ser
 * partido em oito. Com `some` s, o trecho que mede menos que s mm num laço vira um ponto, o do meio dele, e os vizinhos acabam e
 * começam nele (a forma muda até s/2 mm ali): o trecho que some e volta entre planos não deixa então um leque de faces finas, e
 * `lacos[k].sumiram` diz em que laços cada trecho foi fundido. O trecho que mede zero já se funde sozinho.
 *
 * A TAMPA. A escada liga, no primeiro e no último laço, o ponto j da cadeia A (do fim de `de`, para a frente na volta, até o
 * começo de `ate`) ao ponto j da cadeia B (do começo de `de`, para trás, até o fim de `ate`), e por isso as duas cadeias precisam
 * do mesmo número de pontos. A primeira face é o trecho `de` com o primeiro degrau, as do meio são quadriláteros entre dois
 * degraus, e o trecho `ate` com mais de dois pontos fecha a última face. Um laço que se funde num ponto só dispensa a tampa.
 *
 * A LÂMINA. O laço de ponta de área zero (uma linha, duas linhas em cruz, um ponto: o fundo de um disco tangente ao plano, ou a ponta
 * em que duas paredes se encostam) é uma lâmina: os pontos dele que coincidem se fundem, todos, e não leva tampa; as tiras dos dois
 * lados se casam sobre ela. A escada ligaria pontos que coincidem e daria faces de área zero. O laço côncavo com área (uma cruz
 * grossa) continua pedindo escada que caiba: se algum degrau cai sobre a reta do vizinho, a tampa é recusada com a medida.
 *
 * OS VINCOS. `{ trecho: t }` é a borda da faixa que o trecho t varre: a linha do primeiro ponto de t por todos os laços, o trecho
 * no último laço, a linha do último ponto de volta e o trecho no primeiro laço. `{ entre: [a, b] }` é só a linha do ponto entre a
 * e b. `{ laco: nome | 'primeiro' | 'ultimo' }` é a volta inteira do laço, ou os `trechos` listados dela, um vinco por trecho.
 * `lacos: [de, ate]` limita o vinco de trecho ou de entre aos laços de um a outro, inclusive: a linha do chanfro de um disco acaba
 * onde o disco acaba, e não segue pelo cilindro. A nitidez é a do passo: 'viva' ou de 0 a 1.
 *
 * AS RECUSAS. Dois laços a menos de DISTANCIA_MINIMA_ENTRE_PLANOS_MM um do outro ondulam a superfície (na peça de teste do plano,
 * a 0,12 mm, uma falha de 5,16 mm na traseira) e são recusados com os dois planos e a distância, salvo se os dois levam vinco
 * 'viva' na volta inteira (`{ laco, nitidez: 'viva' }`, sem `trechos`): o vinco isola a faixa, e o chanfro de 2 mm do topo de um
 * cilindro passa a 2 mm do plano vizinho. A cota exata em todos os pontos (`medidas: 'todos'`, ou marcas que cobrem todos) dobra a
 * superfície e é recusada: marque só os pontos de cota. A tampa com face de área zero num laço côncavo é recusada (A LÂMINA).
 *
 * OS AVISOS. Onde dois trechos vizinhos de um laço têm pontos espaçados muito diferentes (razão acima de RAZAO_MAXIMA_DE_AMOSTRAGEM
 * entre o último segmento de um e o primeiro do outro, fora de vinco e de canto), a subdivisão deixa calombo; o mesmo vale para
 * dois intervalos vizinhos entre planos (menos em torno do laço de vinco vivo inteiro). Sai um aviso por junção, com o laço da maior
 * razão; o aviso não impede a gaiola. Sai também o aviso `facesFinas` quando alguma face tem área menor que
 * LIMITE_DE_FACE_FINA_NA_GAIOLA vezes o quadrado da maior aresta, com a pior e o que fazer (`some`, ou um plano entre os dois).
 *
 * A COMPENSAÇÃO. A superfície limite da subdivisão passa por dentro dos pontos de um arco: o canto de 32 mm com os pontos no arco
 * sai com o recuo de um arco de 34,2 mm. `compensar` move os pontos marcados no plano do laço, na direção da normal da gaiola sem
 * a componente do eixo, em PASSOS_DA_COMPENSACAO passos, cada um o bastante para cobrir a distância normal que ainda falta do ponto
 * limite (de `limitesDaGaiola`) ao ponto declarado. Ficam onde estão os pontos de canto, os fundidos e os de normal quase no eixo
 * (parte no plano abaixo de INCLINACAO_MINIMA_DA_COMPENSACAO), que só andariam muito para cobrir pouco. O ponto em exatamente dois
 * vincos vivos (a borda de um chanfro) anda só pela parte da distância perpendicular à curva do vinco, no plano do laço: a normal
 * média das faces dele inclui a da face vizinha e empurrava o chanfro 0,5 mm para fora dela. Com `pontas: true`, a lâmina de ponta
 * e os pontos de normal no eixo dela andam também ao longo do eixo, e saem do plano do laço: o fundo do disco chega a -78 mm.
 * `alvosMm` guarda os pontos declarados, e `compensacao` o número de pontos movidos, o maior deslocamento e o maior resíduo, em mm.
 * Na peça em L o canto de 32 mm sai com 31,8 mm no corte, e na dobra em U as curvas de 40 e 24 mm saem com 40,1 e 24,0.
 *
 * OS GRUPOS. `grupos` lista conjuntos de pontos por faixa de laços e por trecho (ou a união de vários, em `unir`) e `passo.grupos`
 * leva os nomes ao passo `subdivisao`, que toma por do grupo a face da gaiola com todos os pontos nele e publica as faces refinadas
 * como `parte` da origem: `parte` recorta o disco e o cilindro pela gaiola, e não por caixa. */
import { limitesDaGaiola, nitidezDoVinco } from './subdivisao.js';

/* nitidezDoVinco('viva') */
const NITIDEZ_INFINITA_DO_VINCO = nitidezDoVinco('viva');

/* Planos mais perto que isto ondulam a superfície (fatia 1 do plano do sólido por laços). */
export const DISTANCIA_MINIMA_ENTRE_PLANOS_MM = 2.5;
/* Pontos seguidos de um laço mais perto que isto viram um ponto só; é também a folga da emenda entre trechos. */
export const TOLERANCIA_DE_FUSAO_MM = 1e-3;
/* Razão entre segmentos vizinhos acima da qual sai o aviso de amostragem desigual. */
export const RAZAO_MAXIMA_DE_AMOSTRAGEM = 4;
/* Passos da compensação do ponto limite, e a menor parte da normal no plano do laço com que o ponto ainda anda: o ponto cuja
   normal fica quase no eixo (a face da tampa) não se move. */
export const PASSOS_DA_COMPENSACAO = 8;
/* A gaiola avisa a face cuja área é menos que isto da maior aresta ao quadrado. O `analisarTopologia` reprova a lasca abaixo de 0,003 na
   malha final, e a subdivisão mantém a razão da gaiola até uns 70%, de modo que o aviso fica com folga. */
export const LIMITE_DE_FACE_FINA_NA_GAIOLA = 0.005;
export const INCLINACAO_MINIMA_DA_COMPENSACAO = 0.5;

const EIXOS = { x: 0, y: 1, z: 2 };
const citar = (x) => `'${x}'`;
const br = (x, casas = 2) => String(Number(x.toFixed(casas))).replace('.', ',');
const MEDIDAS_EM_TODOS = 'na peça de teste do plano do sólido por laços, a cota exata nos 817 pontos da gaiola dobrou a parede de lado numa emenda de 62,6 mm e virou 302 faces';

function falha(texto) { throw new RangeError(`gaiolaPorLacos: ${texto}`); }

/* reamostrar(polilinha, n, razao) -> n pontos, as pontas nos lugares dados e os de dentro a distâncias iguais ao longo dela; com
   razao diferente de 1 os segmentos crescem em progressão geométrica, e o último mede razao vezes o primeiro */
function reamostrar(poli, n, razao = 1) {
  const s = [0];
  for (let k = 1; k < poli.length; k++) s.push(s[k - 1] + Math.hypot(poli[k][0] - poli[k - 1][0], poli[k][1] - poli[k - 1][1]));
  const total = s[s.length - 1];
  const ultimo = poli[poli.length - 1];
  if (total <= TOLERANCIA_DE_FUSAO_MM) return Array.from({ length: n }, (_, i) => [...(i === n - 1 ? ultimo : poli[0])]);
  const saida = [[...poli[0]]];
  let j = 0;
  const q = n > 2 && razao !== 1 ? razao ** (1 / (n - 2)) : 1;
  for (let i = 1; i < n - 1; i++) {
    const alvo = q === 1 ? (total * i) / (n - 1) : total * ((q ** i - 1) / (q ** (n - 1) - 1));
    while (j < s.length - 2 && s[j + 1] < alvo) j++;
    const d = s[j + 1] - s[j];
    const t = d > 0 ? (alvo - s[j]) / d : 0;
    saida.push([poli[j][0] + (poli[j + 1][0] - poli[j][0]) * t, poli[j][1] + (poli[j + 1][1] - poli[j][1]) * t]);
  }
  saida.push([...ultimo]);
  return saida;
}

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/* normal de Newell da face (não normalizada; o módulo é o dobro da área da face plana) */
function normalDaFace(f, P) {
  let nx = 0; let ny = 0; let nz = 0;
  f.forEach((v, k) => {
    const [x1, y1, z1] = P[v]; const [x2, y2, z2] = P[f[(k + 1) % f.length]];
    nx += (y1 - y2) * (z1 + z2); ny += (z1 - z2) * (x1 + x2); nz += (x1 - x2) * (y1 + y2);
  });
  return [nx, ny, nz];
}

function volumeComSinal(faces, P) {
  let v = 0;
  for (const f of faces) for (let k = 1; k + 1 < f.length; k++) {
    const a = P[f[0]]; const b = P[f[k]]; const c = P[f[k + 1]];
    v += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  }
  return v / 6;
}

function lerTrechos(trechos) {
  if (!Array.isArray(trechos) || trechos.length < 2) falha('trechos precisa ser lista de pelo menos dois { nome, pontos }, na ordem da volta do laço');
  const vistos = new Set();
  for (const t of trechos) {
    if (!t || typeof t.nome !== 'string' || !t.nome) falha(`cada trecho precisa de nome, e veio ${JSON.stringify(t)}`);
    if (vistos.has(t.nome)) falha(`o trecho ${citar(t.nome)} aparece duas vezes em trechos`);
    vistos.add(t.nome);
    if (!Number.isInteger(t.pontos) || t.pontos < 2) falha(`o trecho ${citar(t.nome)} pede ${JSON.stringify(t.pontos)} pontos; são as duas pontas e os de dentro, inteiro de 2 para cima`);
    for (const campo of ['razao', 'some']) {
      if (t[campo] != null && !(Number.isFinite(t[campo]) && t[campo] > 0)) falha(`o trecho ${citar(t.nome)} traz ${campo} ${JSON.stringify(t[campo])}; ${campo === 'razao' ? 'razao é quanto o último segmento mede do primeiro, número maior que zero (1 é passo igual)' : 'some é o comprimento em mm abaixo do qual o trecho vira um ponto no laço, número maior que zero'}`);
    }
  }
  return trechos.map((t) => ({ nome: t.nome, pontos: t.pontos, razao: t.razao ?? 1, some: t.some ?? 0 }));
}

const comprimentoDe = (poli) => poli.slice(1).reduce((t, p, k) => t + Math.hypot(p[0] - poli[k][0], p[1] - poli[k][1]), 0);

/* o ponto a meio caminho, pelo comprimento, de uma polilinha */
function pontoAoMeio(poli) {
  let falta = comprimentoDe(poli) / 2;
  for (let k = 1; k < poli.length; k++) {
    const d = Math.hypot(poli[k][0] - poli[k - 1][0], poli[k][1] - poli[k - 1][1]);
    if (falta <= d && d > 0) { const t = falta / d; return [poli[k - 1][0] + (poli[k][0] - poli[k - 1][0]) * t, poli[k - 1][1] + (poli[k][1] - poli[k - 1][1]) * t]; }
    falta -= d;
  }
  return [...poli[poli.length - 1]];
}

/* O trecho com `some` que mede menos que isso no laço vira um ponto, o do meio dele, e os trechos vizinhos acabam e começam nesse
   ponto; assim o trecho que some e volta entre planos não deixa um leque de triângulos finos. Devolve as polilinhas e os trechos
   que sumiram. */
function fundirCurtos(polilinhas, trechos) {
  const n = polilinhas.length;
  const saida = polilinhas.map((p) => p.map((q) => [...q]));
  const sumiu = [];
  trechos.forEach((t, i) => {
    /* o trecho sem comprimento já é um ponto (os pontos dele se fundem adiante) e não conta como sumido */
    const comprimento = comprimentoDe(saida[i]);
    if (!t.some || saida[i].length < 2 || comprimento <= TOLERANCIA_DE_FUSAO_MM || comprimento >= t.some) return;
    const m = pontoAoMeio(saida[i]);
    saida[i] = [m];
    const ant = saida[(i + n - 1) % n]; ant[ant.length - 1] = [...m];
    const prox = saida[(i + 1) % n]; prox[0] = [...m];
    sumiu.push(t.nome);
  });
  return { polilinhas: saida, sumiu };
}

function lerLacos(lacos, trechos, e, fechados = new Set()) {
  if (!Array.isArray(lacos) || lacos.length < 2) falha('lacos precisa ser lista de pelo menos dois laços { em, trechos }');
  const nomes = new Set();
  const lidos = lacos.map((l, r) => {
    const nome = l?.nome ?? `l${r}`;
    if (nomes.has(nome)) falha(`o laço ${citar(nome)} aparece duas vezes`);
    nomes.add(nome);
    if (!Number.isFinite(l?.em)) falha(`o laço ${citar(nome)} precisa de em, a posição em mm no eixo ${e}`);
    const dados = l.trechos ?? {};
    const extra = Object.keys(dados).filter((k) => !trechos.some((t) => t.nome === k));
    if (extra.length) falha(`o laço ${citar(nome)} traz o trecho ${citar(extra[0])}, que não está em trechos`);
    const pontos = trechos.map((t, i) => {
      const poli = dados[t.nome];
      if (!Array.isArray(poli) || !poli.length || poli.some((p) => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) {
        falha(`o laço ${citar(nome)} precisa do trecho ${citar(t.nome)} como polilinha [[u, v], ...] de números`);
      }
      return { poli, i };
    });
    pontos.forEach(({ poli, i }) => {
      const ant = pontos[(i + trechos.length - 1) % trechos.length].poli;
      const fim = ant[ant.length - 1];
      const d = Math.hypot(poli[0][0] - fim[0], poli[0][1] - fim[1]);
      if (d > TOLERANCIA_DE_FUSAO_MM) falha(`no laço ${citar(nome)}, o trecho ${citar(trechos[i].nome)} começa em [${poli[0].map((x) => br(x, 3)).join('; ')}] e o ${citar(trechos[(i + trechos.length - 1) % trechos.length].nome)} acaba em [${fim.map((x) => br(x, 3)).join('; ')}], a ${br(d, 3)} mm; cada trecho começa onde o anterior acaba`);
    });
    const { polilinhas, sumiu } = fundirCurtos(pontos.map((p) => p.poli), trechos);
    return { nome, em: l.em, polilinhas, sumiu };
  });
  const perto = [];
  for (let r = 1; r < lidos.length; r++) {
    const a = lidos[r - 1]; const b = lidos[r];
    const d = b.em - a.em;
    if (!(d > 0)) falha(`os laços vêm em ordem crescente de em, e ${citar(b.nome)} (${e} = ${br(b.em)} mm) vem depois de ${citar(a.nome)} (${e} = ${br(a.em)} mm)`);
    /* a faixa entre dois planos, cada um com vinco vivo na volta inteira, não ondula: o vinco a isola dos vizinhos (o chanfro estreito) */
    if (d < DISTANCIA_MINIMA_ENTRE_PLANOS_MM && !(fechados.has(a.nome) && fechados.has(b.nome))) perto.push({ a, b, d });
  }
  if (perto.length) {
    /* o par mais perto, e o primeiro dele em caso de empate */
    const { a, b, d } = perto.reduce((x, y) => (y.d < x.d ? y : x));
    const outros = perto.length > 1 ? `, e mais ${perto.length - 1} ${perto.length === 2 ? 'par fica' : 'pares ficam'} abaixo do mínimo` : '';
    falha(`os laços ${citar(a.nome)} (${e} = ${br(a.em)} mm) e ${citar(b.nome)} (${e} = ${br(b.em)} mm) ficam a ${br(d)} mm um do outro, abaixo do mínimo de ${br(DISTANCIA_MINIMA_ENTRE_PLANOS_MM)} mm${outros}: planos tão perto ondulam a superfície (na peça de teste do plano, a 0,12 mm, uma falha de 5,16 mm); tire um dos dois, afaste-os, ou, se for um chanfro estreito, ponha nos dois planos um vinco 'viva' de laço inteiro (vincos: [{ nome, laco, nitidez: 'viva' }], sem trechos), que isola a faixa dos vizinhos e a libera do mínimo`);
  }
  return lidos;
}

/**
 * gaiolaPorLacos({ nome, eixo, trechos, lacos, tampa, vincos?, cantos?, medidas?, compensar? })
 *   -> { pontos, pontosMm, alvosMm, passo, nomeDe, lacos, trechos, avisos, compensacao? }
 */
export function gaiolaPorLacos(o = {}) {
  const prefixo = o.nome ?? 'laco';
  if (typeof prefixo !== 'string' || !prefixo) falha('nome é o prefixo dos pontos, texto não vazio');
  if (!(o.eixo in EIXOS)) falha(`eixo é 'x', 'y' ou 'z', e veio ${JSON.stringify(o.eixo)}`);
  const e = EIXOS[o.eixo];
  const outros = [0, 1, 2].filter((k) => k !== e);
  const trechos = lerTrechos(o.trechos);
  /* os laços com vinco vivo na volta inteira: a faixa entre dois deles pode ser mais estreita que o mínimo entre planos */
  const nomesDosLacos = Array.isArray(o.lacos) ? o.lacos.map((l, r) => l?.nome ?? `l${r}`) : [];
  const fechados = new Set();
  for (const v of Array.isArray(o.vincos) ? o.vincos : []) {
    if (!v || v.laco == null || v.trechos != null || !(v.nitidez === 'viva' || v.nitidez === 1)) continue;
    fechados.add(v.laco === 'primeiro' ? nomesDosLacos[0] : v.laco === 'ultimo' ? nomesDosLacos[nomesDosLacos.length - 1] : v.laco);
  }
  const lacos = lerLacos(o.lacos, trechos, o.eixo, fechados);
  const iTrecho = new Map(trechos.map((t, i) => [t.nome, i]));
  const exigeTrecho = (t, onde) => { if (!iTrecho.has(t)) falha(`${onde} cita o trecho ${citar(t)}, que não está em trechos (${trechos.map((x) => x.nome).join(', ')})`); return iTrecho.get(t); };

  /* a volta do laço: os pontos de cada trecho menos o último, que é o primeiro do seguinte */
  const inicio = []; let N = 0;
  for (const t of trechos) { inicio.push(N); N += t.pontos - 1; }
  const fimDe = (i) => inicio[(i + 1) % trechos.length];
  const R = lacos.length;
  const iLaco = new Map(lacos.map((l, r) => [l.nome, r]));
  const lacoDe = (x, onde) => {
    if (x === 'primeiro') return 0;
    if (x === 'ultimo') return R - 1;
    if (!iLaco.has(x)) falha(`${onde} cita o laço ${citar(x)}, que não existe`);
    return iLaco.get(x);
  };

  const nomeCru = (r, q) => {
    let i = trechos.length - 1;
    while (inicio[i] > q) i--;
    return `${prefixo}_${lacos[r].nome}_${trechos[i].nome}${q - inicio[i]}`;
  };
  /* posições [u, v] de cada laço, reamostradas */
  const uv = lacos.map((l) => {
    const volta = [];
    trechos.forEach((t, i) => { reamostrar(l.polilinhas[i], t.pontos, t.razao).slice(0, -1).forEach((p) => volta.push(p)); });
    return volta;
  });
  /* fusão: cada corrida de pontos seguidos na volta que coincidem vira um ponto só, o de menor posição da corrida */
  /* o laço de ponta de área zero (uma linha, uma cruz de linhas, um ponto) é uma lâmina: os pontos que coincidem se fundem, todos, e
     as tiras dos dois lados dela se casam sem tampa; a escada ligaria pontos que coincidem e daria faces de área zero */
  const medeAreaZero = (volta) => {
    let area = 0; let perimetro = 0;
    volta.forEach((p, k) => { const b = volta[(k + 1) % N]; area += (p[0] * b[1] - b[0] * p[1]) / 2; perimetro += Math.hypot(b[0] - p[0], b[1] - p[1]); });
    return Math.abs(area) <= TOLERANCIA_DE_FUSAO_MM * Math.max(perimetro, 1);
  };
  const lamina = uv.map((volta, r) => (r === 0 || r === R - 1) && medeAreaZero(volta));
  const rep = uv.map((volta, r) => {
    if (lamina[r]) {
      const donos = []; const dono = new Array(N);
      volta.forEach((p, q) => {
        const j = donos.find((k) => Math.hypot(p[0] - volta[k][0], p[1] - volta[k][1]) <= TOLERANCIA_DE_FUSAO_MM);
        if (j === undefined) donos.push(q);
        dono[q] = j ?? q;
      });
      return dono;
    }
    const liga = volta.map((p, q) => { const b = volta[(q + 1) % N]; return Math.hypot(p[0] - b[0], p[1] - b[1]) <= TOLERANCIA_DE_FUSAO_MM; });
    if (liga.every(Boolean)) return volta.map(() => 0);
    const dono = new Array(N);
    let partida = 0;
    while (liga[(partida + N - 1) % N]) partida++;
    let corrida = [];
    for (let s = 0; s <= N; s++) {
      const q = (partida + s) % N;
      if (s > 0 && (s === N || !liga[(q + N - 1) % N])) { const menor = Math.min(...corrida); for (const c of corrida) dono[c] = menor; corrida = []; }
      if (s < N) corrida.push(q);
    }
    return dono;
  });
  const nm = (r, q) => nomeCru(r, rep[r][((q % N) + N) % N]);

  const pontosMm = {};
  lacos.forEach((l, r) => uv[r].forEach((p, q) => {
    if (rep[r][q] !== q) return;
    const x = [0, 0, 0]; x[e] = l.em; x[outros[0]] = p[0]; x[outros[1]] = p[1];
    pontosMm[nomeCru(r, q)] = x;
  }));
  const nomes = Object.keys(pontosMm);
  const indice = new Map(nomes.map((n, k) => [n, k]));

  const limpa = (f) => {
    const g = f.filter((v, k) => v !== f[(k + 1) % f.length]);
    return g.length >= 3 && new Set(g).size === g.length ? g : null;
  };
  const faces = [];
  for (let r = 0; r + 1 < R; r++) {
    for (let q = 0; q < N; q++) {
      const f = limpa([nm(r, q), nm(r, q + 1), nm(r + 1, q + 1), nm(r + 1, q)]);
      if (f) faces.push(f);
    }
  }

  /* a tampa: escada entre as cadeias A (do fim de `de` para a frente) e B (do começo de `de` para trás) */
  if (o.tampa == null || typeof o.tampa !== 'object') falha('tampa precisa ser { de, ate }, os trechos de onde parte e aonde chega a escada que tampa as pontas');
  const iDe = exigeTrecho(o.tampa.de, 'tampa.de');
  const iAte = exigeTrecho(o.tampa.ate, 'tampa.ate');
  if (iDe === iAte) falha('tampa.de e tampa.ate precisam ser trechos diferentes');
  const A = []; for (let q = fimDe(iDe); ; q = (q + 1) % N) { A.push(q); if (q === inicio[iAte]) break; }
  const B = []; for (let q = inicio[iDe]; ; q = (q + N - 1) % N) { B.push(q); if (q === fimDe(iAte)) break; }
  if (A.length !== B.length) {
    const lado = (de, ate, passo) => { const l = []; for (let i = de; ; i = (i + passo + trechos.length) % trechos.length) { l.push(trechos[i].nome); if (i === ate) break; } return l; };
    falha(`a tampa liga a cadeia ${lado((iDe + 1) % trechos.length, (iAte + trechos.length - 1) % trechos.length, 1).join('+')} (${A.length} pontos) à ${lado((iDe + trechos.length - 1) % trechos.length, (iAte + 1) % trechos.length, -1).join('+')} (${B.length} pontos); a escada pede o mesmo número de pontos nas duas, então mude os pontos de um trecho`);
  }
  if (A.length < 2) falha('a tampa precisa de pelo menos um degrau entre tampa.de e tampa.ate');
  const n = A.length;
  const tampa = (r) => {
    if (lamina[r]) return [];
    const fs = [];
    const de = []; for (let q = inicio[iDe]; ; q = (q + 1) % N) { de.push(nm(r, q)); if (q === fimDe(iDe)) break; }
    fs.push([...de, nm(r, A[1]), nm(r, B[1])]);
    for (let j = 1; j + 1 < n; j++) fs.push([nm(r, A[j]), nm(r, A[j + 1]), nm(r, B[j + 1]), nm(r, B[j])]);
    const ate = []; for (let q = inicio[iAte]; ; q = (q + 1) % N) { ate.push(nm(r, q)); if (q === fimDe(iAte)) break; }
    if (ate.length > 2) fs.push(ate);
    return fs.map(limpa).filter(Boolean);
  };
  const tampas = [0, R - 1].map((r) => ({ r, faces: tampa(r) }));
  for (const { r, faces: fs } of tampas) {
    /* a escada liga o ponto j de uma cadeia ao j da outra; num laço côncavo (em cruz, em T) um degrau pode cair sobre a reta do vizinho */
    const nulas = fs.filter((f) => {
      const [nx, ny, nz] = normalDaFace(f, pontosMm);
      const maior = Math.max(...f.map((v, k) => Math.hypot(...sub3(pontosMm[v], pontosMm[f[(k + 1) % f.length]]))));
      return Math.hypot(nx, ny, nz) / 2 <= TOLERANCIA_DE_FUSAO_MM * Math.max(maior, 1);
    });
    if (nulas.length) {
      falha(`a tampa do laço ${citar(lacos[r].nome)} (${o.eixo} = ${br(lacos[r].em)} mm) tem ${nulas.length} ${nulas.length === 1 ? 'face' : 'faces'} de área zero, a primeira com os pontos ${nulas[0].map(citar).join(', ')}: a escada liga o ponto j de uma cadeia ao ponto j da outra, e num laço côncavo em cruz ou em T os degraus caem sobre a mesma reta; uma triangulação geral do polígono côncavo não cabe aqui, então corte por outro eixo, em que o primeiro e o último laço sejam convexos, ou deixe o laço da ponta com área zero (uma linha ou um ponto), que o ajudante funde sem tampa`);
    }
  }
  faces.push(...tampas[0].faces.map((f) => [...f].reverse()), ...tampas[1].faces);

  /* fechamento: cada aresta em duas faces, uma em cada sentido */
  const sentido = new Map();
  for (const f of faces) f.forEach((a, k) => { const b = f[(k + 1) % f.length]; const c = `${a}|${b}`; sentido.set(c, (sentido.get(c) ?? 0) + 1); });
  for (const [c, k] of sentido) {
    const [a, b] = c.split('|');
    if (k > 1) falha(`a aresta ${citar(a)}-${citar(b)} aparece ${k} vezes no mesmo sentido; os laços se cruzam ou a tampa não casa com eles`);
    if (!sentido.has(`${b}|${a}`)) falha(`a gaiola não fecha na aresta ${citar(a)}-${citar(b)}; confira tampa.de e tampa.ate`);
  }
  const P = nomes.map((k) => pontosMm[k]);
  const fIdx = faces.map((f) => f.map((v) => indice.get(v)));
  let orientadas = faces;
  if (volumeComSinal(fIdx, P) < 0) { orientadas = faces.map((f) => [...f].reverse()); fIdx.forEach((f) => f.reverse()); }

  /* uma faixa de laços [de, ate], inclusive; sem ela, todos */
  const faixaDeLacos = (decl, onde, podeSerUm = false) => {
    if (decl == null) return rs;
    if (!Array.isArray(decl) || decl.length !== 2) falha(`${onde}.lacos precisa ser [de, ate], dois laços`);
    const [de, ate] = decl.map((x) => lacoDe(x, onde));
    if (podeSerUm ? de > ate : de >= ate) falha(`${onde}.lacos vai de ${citar(decl[0])} a ${citar(decl[1])}, e o primeiro precisa vir ${podeSerUm ? 'antes do segundo ou ser ele' : 'antes do segundo'}`);
    return rs.filter((r) => r >= de && r <= ate);
  };

  /* vincos */
  const semRepetir = (l) => l.filter((v, k) => v !== l[k - 1]);
  const rs = [...Array(R).keys()];
  const trechoNoLaco = (r, i) => { const l = []; for (let q = inicio[i]; ; q = (q + 1) % N) { l.push(nm(r, q)); if (q === fimDe(i)) break; } return l; };
  const vincos = [];
  for (const [k, v] of (o.vincos ?? []).entries()) {
    const onde = `vincos[${k}]`;
    if (!v || typeof v.nome !== 'string') falha(`${onde} precisa de nome`);
    if (v.nitidez == null) falha(`${onde} precisa de nitidez, 'viva' ou de 0 a 1`);
    const formas = ['trecho', 'entre', 'laco'].filter((c) => v[c] != null);
    if (formas.length !== 1) falha(`${onde} declara o vinco por um de trecho, entre ou laco, e veio ${formas.length ? formas.join(' e ') : 'nenhum'}`);
    /* `lacos: [de, ate]` limita o vinco de trecho ou de entre a essa faixa de laços, inclusive: a linha de um chanfro que acaba onde o disco acaba */
    if (v.lacos != null && v.laco != null) falha(`${onde} traz lacos e laco; lacos limita o vinco de trecho ou de entre a uma faixa de laços`);
    const faixa = faixaDeLacos(v.lacos, onde);
    if (v.trecho != null) {
      const i = exigeTrecho(v.trecho, onde);
      const ida = faixa.map((r) => nm(r, inicio[i]));
      const volta = [...faixa].reverse().map((r) => nm(r, fimDe(i)));
      const pontos = semRepetir([...ida, ...trechoNoLaco(faixa[faixa.length - 1], i).slice(1), ...volta.slice(1), ...trechoNoLaco(faixa[0], i).reverse().slice(1)]);
      vincos.push({ nome: v.nome, pontos, nitidez: v.nitidez });
    } else if (v.entre != null) {
      if (!Array.isArray(v.entre) || v.entre.length !== 2) falha(`${onde}.entre precisa ser [a, b], dois trechos seguidos`);
      const [a, b] = v.entre.map((t) => exigeTrecho(t, onde));
      if ((a + 1) % trechos.length !== b) falha(`${onde}.entre cita ${citar(v.entre[0])} e ${citar(v.entre[1])}, que não são seguidos na volta`);
      vincos.push({ nome: v.nome, pontos: semRepetir(faixa.map((r) => nm(r, inicio[b]))), nitidez: v.nitidez });
    } else {
      const r = lacoDe(v.laco, onde);
      if (v.trechos == null) {
        const volta = semRepetir([...Array(N + 1).keys()].map((q) => nm(r, q)));
        vincos.push({ nome: v.nome, pontos: volta, nitidez: v.nitidez });
      } else {
        for (const t of v.trechos) {
          const pontos = semRepetir(trechoNoLaco(r, exigeTrecho(t, onde)));
          if (pontos.length >= 2) vincos.push({ nome: `${v.nome}_${t}`, pontos, nitidez: v.nitidez });
        }
      }
    }
  }

  /* cantos e medidas: pontos marcados por trecho ou pelo ponto entre dois trechos, em todos os laços ou num só */
  const marcados = (s, onde) => {
    const lista = s.laco != null ? [lacoDe(s.laco, onde)] : rs;
    if ((s.trecho != null) === (s.entre != null)) falha(`${onde} marca os pontos por trecho ou por entre, um dos dois`);
    let qs;
    if (s.trecho != null) { const i = exigeTrecho(s.trecho, onde); qs = []; for (let q = inicio[i]; ; q = (q + 1) % N) { qs.push(q); if (q === fimDe(i)) break; } }
    else {
      const [a, b] = (s.entre ?? []).map((t) => exigeTrecho(t, onde));
      if ((a + 1) % trechos.length !== b) falha(`${onde}.entre precisa de dois trechos seguidos na volta`);
      qs = [inicio[b]];
    }
    return [...new Set(lista.flatMap((r) => qs.map((q) => nm(r, q))))];
  };
  const cantos = [...new Set((o.cantos ?? []).flatMap((c, k) => marcados(c, `cantos[${k}]`)))];
  let medidas = null;
  if (o.medidas != null) {
    if (o.medidas === 'todos' || o.medidas === true) falha(`medidas em todos os pontos não é aceito: ${MEDIDAS_EM_TODOS}; marque só os pontos de cota, por trecho, por entre ou por laço`);
    if (!Array.isArray(o.medidas) || !o.medidas.length) falha('medidas precisa ser lista não vazia de { trecho | entre, laco?, peso? }');
    const porPonto = new Map();
    o.medidas.forEach((s, k) => {
      for (const p of marcados(s, `medidas[${k}]`)) {
        if (porPonto.has(p) && porPonto.get(p) !== (s.peso ?? null)) falha(`o ponto ${citar(p)} aparece em medidas com pesos diferentes`);
        porPonto.set(p, s.peso ?? null);
      }
    });
    if (porPonto.size >= nomes.length) falha(`as medidas marcam todos os ${nomes.length} pontos da gaiola, o que não é aceito: ${MEDIDAS_EM_TODOS}; marque só os pontos de cota`);
    medidas = nomes.filter((p) => porPonto.has(p)).map((p) => (porPonto.get(p) == null ? p : { ponto: p, peso: porPonto.get(p) }));
  }

  /* grupos de faces: cada um é a lista de pontos de uma faixa de laços e trechos; o passo `subdivisao` toma como do grupo a face da
     gaiola cujos pontos estão todos nele, e a origem do passo cita o grupo para a seleção de `parte` */
  const grupos = [];
  if (o.grupos != null) {
    if (!Array.isArray(o.grupos) || !o.grupos.length) falha('grupos precisa ser lista não vazia de { nome, lacos?: [de, ate], trechos? }');
    const vistos = new Set();
    o.grupos.forEach((g, k) => {
      const onde = `grupos[${k}]`;
      if (!g || typeof g.nome !== 'string' || !g.nome) falha(`${onde} precisa de nome`);
      if (vistos.has(g.nome)) falha(`o grupo ${citar(g.nome)} aparece duas vezes`);
      vistos.add(g.nome);
      /* um grupo é uma seleção { lacos?, trechos? } ou a união de várias, em `unir` */
      const selecoes = g.unir ?? [g];
      if (!Array.isArray(selecoes) || !selecoes.length) falha(`${onde}.unir precisa ser lista não vazia de { lacos?, trechos? }`);
      const doGrupo = new Set();
      selecoes.forEach((sel, j) => {
        const faixa = faixaDeLacos(sel.lacos, g.unir ? `${onde}.unir[${j}]` : onde, true);
        const itens = sel.trechos == null ? trechos.map((_, i) => i) : sel.trechos.map((t) => exigeTrecho(t, onde));
        for (const r of faixa) for (const i of itens) for (let q = inicio[i]; ; q = (q + 1) % N) { doGrupo.add(nm(r, q)); if (q === fimDe(i)) break; }
      });
      grupos.push({ nome: g.nome, pontos: nomes.filter((n) => doGrupo.has(n)) });
    });
  }

  /* avisos de amostragem desigual: nas junções de trechos e entre intervalos vizinhos de planos */
  const avisos = [];
  const nosVincos = new Set(vincos.flatMap((v) => v.pontos));
  const vivos = new Set(cantos);
  trechos.forEach((t, b) => {
    const a = (b + trechos.length - 1) % trechos.length;
    let pior = null;
    rs.forEach((r) => {
      const q = inicio[b];
      const nome = nm(r, q);
      if (nosVincos.has(nome) || vivos.has(nome)) return;
      const p = uv[r][q]; const ant = uv[r][(q + N - 1) % N]; const prox = uv[r][(q + 1) % N];
      const la = Math.hypot(p[0] - ant[0], p[1] - ant[1]); const lb = Math.hypot(prox[0] - p[0], prox[1] - p[1]);
      if (la <= TOLERANCIA_DE_FUSAO_MM || lb <= TOLERANCIA_DE_FUSAO_MM) return;
      const razao = Math.max(la, lb) / Math.min(la, lb);
      if (!pior || razao > pior.razao) pior = { razao, la, lb, laco: lacos[r].nome };
    });
    if (pior && pior.razao > RAZAO_MAXIMA_DE_AMOSTRAGEM) {
      avisos.push({
        ref: 'amostragemDesigual', trechos: [trechos[a].nome, t.nome], laco: pior.laco, razao: Number(pior.razao.toFixed(2)),
        texto: `amostragem desigual entre os trechos ${citar(trechos[a].nome)} e ${citar(t.nome)}: no laço ${citar(pior.laco)}, o último segmento de ${citar(trechos[a].nome)} tem ${br(pior.la, 1)} mm e o primeiro de ${citar(t.nome)} ${br(pior.lb, 1)} mm, razão ${br(pior.razao, 1)}, acima de ${RAZAO_MAXIMA_DE_AMOSTRAGEM}; a subdivisão deixa calombo ali (razão 20 deu 0,76 mm na peça de teste do plano), então dê pontos aos dois trechos na mesma proporção do comprimento ou ponha um vinco na junção`,
      });
    }
  });
  for (let r = 1; r + 1 < R; r++) {
    /* o vinco vivo de laço inteiro isola a faixa dos vizinhos, e a subdivisão não deixa calombo por cima dele */
    if (fechados.has(lacos[r].nome)) continue;
    const d1 = lacos[r].em - lacos[r - 1].em; const d2 = lacos[r + 1].em - lacos[r].em;
    const razao = Math.max(d1, d2) / Math.min(d1, d2);
    if (razao > RAZAO_MAXIMA_DE_AMOSTRAGEM) {
      avisos.push({
        ref: 'planosDesiguais', lacos: [lacos[r - 1].nome, lacos[r].nome, lacos[r + 1].nome], razao: Number(razao.toFixed(2)),
        texto: `os planos em volta do laço ${citar(lacos[r].nome)} ficam a ${br(d1, 1)} e ${br(d2, 1)} mm, razão ${br(razao, 1)}, acima de ${RAZAO_MAXIMA_DE_AMOSTRAGEM}; a subdivisão deixa calombo ali, então espace os planos aos poucos`,
      });
    }
  }

  /* faces finas: área / (maior aresta)^2, a razão que o `analisarTopologia` chama de lasca, abaixo do limite da gaiola; o trecho que
     some entre dois planos deixa um leque delas */
  const finas = [];
  for (const f of faces) {
    const [nx, ny, nz] = normalDaFace(f, pontosMm);
    const maior = Math.max(...f.map((v, k) => Math.hypot(...sub3(pontosMm[v], pontosMm[f[(k + 1) % f.length]]))));
    const razao = maior > TOLERANCIA_DE_FUSAO_MM ? Math.hypot(nx, ny, nz) / 2 / (maior * maior) : 1;
    if (razao < LIMITE_DE_FACE_FINA_NA_GAIOLA) finas.push({ razao, face: f });
  }
  if (finas.length) {
    const pior = finas.reduce((x, y) => (y.razao < x.razao ? y : x));
    avisos.push({
      ref: 'facesFinas', quantidade: finas.length, razao: Number(pior.razao.toPrecision(3)), pontos: pior.face,
      texto: `${finas.length} ${finas.length === 1 ? 'face da gaiola é fina' : 'faces da gaiola são finas'} (área / maior aresta² abaixo de ${br(LIMITE_DE_FACE_FINA_NA_GAIOLA, 3)}), a pior de ${br(pior.razao, 4)} com os pontos ${pior.face.map(citar).join(', ')}; o trecho que some e volta entre planos deixa um leque assim, então, se a face sai de um trecho que some e volta entre planos, declare some (em mm) nesse trecho, que o ajudante funde num ponto nos laços onde mede menos que isso; se vem de dois planos muito afastados ao lado de um ponto, ponha um plano entre eles`,
    });
  }

  /* compensação: os pontos marcados andam no plano do laço até o ponto limite chegar ao declarado pela normal */
  const alvosMm = Object.fromEntries(nomes.map((k) => [k, [...pontosMm[k]]]));
  let compensacao = null;
  if (o.compensar != null && o.compensar !== false) {
    const c = o.compensar === true ? {} : o.compensar;
    if (typeof c !== 'object') falha('compensar é true ou { trechos, lacos? }');
    const lacosC = c.lacos == null ? rs : c.lacos.map((l) => lacoDe(l, 'compensar.lacos'));
    const its = c.trechos == null ? trechos.map((_, i) => i) : c.trechos.map((t) => exigeTrecho(t, 'compensar.trechos'));
    const fundidos = new Set();
    /* o ponto fundido fica onde está, menos o da lâmina de ponta com `pontas`, que é uma linha de pontos de normal bem definida */
    lacos.forEach((_, r) => rep[r].forEach((d, q) => { if (d !== q && !(c.pontas === true && lamina[r])) fundidos.add(nomeCru(r, d)); }));
    const moveis = new Set();
    for (const r of lacosC) for (const i of its) for (let q = inicio[i]; ; q = (q + 1) % N) { moveis.add(nm(r, q)); if (q === fimDe(i)) break; }
    for (const v of [...vivos, ...fundidos]) moveis.delete(v);
    const lista = nomes.filter((k) => moveis.has(k)).map((k) => indice.get(k));
    const daPonta = new Set([0, R - 1].flatMap((r) => uv[r].map((_, q) => indice.get(nm(r, q)))));
    const vincosIdx = [];
    for (const v of vincos) for (let k = 0; k + 1 < v.pontos.length; k++) vincosIdx.push([indice.get(v.pontos[k]), indice.get(v.pontos[k + 1]), nitidezDoVinco(v.nitidez)]);
    const cantosIdx = cantos.map((k) => indice.get(k));
    const facesDo = nomes.map(() => []);
    fIdx.forEach((f, k) => f.forEach((v) => facesDo[v].push(k)));
    /* o ponto em exatamente dois vincos vivos fica na curva do vinco: o limite dele escorrega pela curva, e só a parte do vazio perpendicular
       a ela interessa; pela normal média das faces o ponto de um chanfro andaria também para fora da face (0,5 mm na peça de teste) */
    const vizinhosVivos = new Map();
    for (const [a, b, n] of vincosIdx) {
      if (n !== NITIDEZ_INFINITA_DO_VINCO) continue;
      for (const [x, y] of [[a, b], [b, a]]) vizinhosVivos.set(x, [...(vizinhosVivos.get(x) ?? []), y]);
    }
    const V = P.map((p) => [...p]);
    const alvo = P.map((p) => [...p]);
    let residuo = 0;
    for (let passo = 0; passo <= PASSOS_DA_COMPENSACAO; passo++) {
      const L = limitesDaGaiola({ vertices: V, faces: fIdx, vincos: vincosIdx, cantos: cantosIdx });
      residuo = 0;
      const novos = lista.map((i) => {
        const viz = vizinhosVivos.get(i);
        if (viz?.length === 2) {
          const tg = sub3(V[viz[1]], V[viz[0]]);
          const lt = Math.hypot(...tg);
          if (lt > TOLERANCIA_DE_FUSAO_MM) {
            const u = tg.map((x) => x / lt);
            const d = sub3(alvo[i], L[i]);
            const ao = d[0] * u[0] + d[1] * u[1] + d[2] * u[2];
            const perp = d.map((x, a) => x - ao * u[a]);
            perp[e] = 0;
            residuo = Math.max(residuo, Math.hypot(...perp));
            return V[i].map((c, a) => c + perp[a]);
          }
        }
        const nn = [0, 0, 0];
        for (const k of facesDo[i]) { const w = normalDaFace(fIdx[k], V); nn[0] += w[0]; nn[1] += w[1]; nn[2] += w[2]; }
        const l = Math.hypot(...nn) || 1;
        for (let a = 0; a < 3; a++) nn[a] /= l;
        const d = sub3(alvo[i], L[i]);
        const s = d[0] * nn[0] + d[1] * nn[1] + d[2] * nn[2];
        /* o ponto anda no plano do laço, na direção da normal sem a componente do eixo, o bastante para cobrir s pela normal */
        const no = [...nn]; no[e] = 0;
        const lp = Math.hypot(...no);
        if (lp < INCLINACAO_MINIMA_DA_COMPENSACAO) {
          /* a normal quase no eixo: o ponto de um laço de ponta, com `pontas`, anda ao longo do eixo e sai do plano do laço */
          if (!(c.pontas === true && daPonta.has(i)) || Math.abs(nn[e]) < 0.5) return V[i];
          residuo = Math.max(residuo, Math.abs(s));
          const noEixo = [...V[i]]; noEixo[e] += s / nn[e];
          return noEixo;
        }
        residuo = Math.max(residuo, Math.abs(s));
        const passoNoPlano = s / lp;
        return V[i].map((c, a) => c + (passoNoPlano * no[a]) / lp);
      });
      if (passo === PASSOS_DA_COMPENSACAO) break;
      lista.forEach((i, k) => { V[i] = novos[k]; });
    }
    const deslocamentos = lista.map((i) => Math.hypot(...sub3(V[i], alvo[i]))).filter((x) => x > 0);
    nomes.forEach((k, i) => { pontosMm[k] = V[i]; });
    compensacao = { pontos: deslocamentos.length, maiorDeslocamentoMm: Number(Math.max(0, ...deslocamentos).toFixed(3)), residuoMm: Number(residuo.toFixed(3)) };
  }

  const pontos = {};
  for (const k of nomes) pontos[k] = pontosMm[k].map((x) => x / 1000);
  const passo = { vertices: nomes, faces: orientadas, vincos };
  if (cantos.length) passo.cantos = cantos;
  if (medidas) passo.medidas = medidas;
  if (grupos.length) passo.grupos = grupos;
  const nomeDe = (laco, trecho, k = 0) => {
    const r = lacoDe(laco, 'nomeDe'); const i = exigeTrecho(trecho, 'nomeDe');
    if (!Number.isInteger(k) || k < 0 || k >= trechos[i].pontos) falha(`nomeDe: o trecho ${citar(trecho)} tem os pontos 0 a ${trechos[i].pontos - 1}`);
    return nm(r, inicio[i] + k);
  };
  const saida = { pontos, pontosMm, alvosMm, passo, nomeDe, lacos: lacos.map((l) => ({ nome: l.nome, em: l.em, sumiram: l.sumiu })), trechos, avisos };
  if (compensacao) saida.compensacao = compensacao;
  return saida;
}
