/* alisar-curvas.js — os pontos-chave de uma curva declarada alisados pelo resíduo do ajuste polinomial local, sem mexer na forma
 *
 * FICHA alisarPontosDaCurva
 * serve: tirar o ruído dos pontos-chave digitados de uma curva (lidos de imagem, ponto a ponto) sem tirá-la dos pontos duros nem de um limite, e sem mexer na forma.
 * quando: a curva ondula porque cada ponto-chave tem o erro da leitura; numa gaiolaPorRede use a opção alisarCurvas, que chama esta função
 *   em cada curva antes de montar a gaiola; para o miolo dos retalhos já há o `liso` da rede.
 * unidades: mm na entrada e na saída.
 * campos:
 *   pontos: [[x, y, z]] os pontos-chave da curva, em ordem; dois seguidos iguais são recusados.
 *   fechada: true se a curva dá a volta (o último ponto não repete o primeiro).
 *   duros: índices dos pontos que não se mexem; na curva aberta as duas pontas são sempre duras.
 *   partir: índices onde a curva se parte em trechos alisados à parte (o canto); são duros também.
 *   energia: 'quartica' (padrão, a quinta diferença dividida, zero em toda quártica) ou 'cubica' (a quarta, zero em toda cúbica).
 *   rigidez: o peso da energia contra o desvio aos pontos dados (1 por padrão, de 1e-6 a 1e6).
 *   tolerancia: o maior deslocamento de um ponto, em mm (1 por padrão).
 *   silhueta: { vista: 'x' | 'y' | 'z', tolerancia } o maior deslocamento visto ao longo do eixo da vista, em mm.
 *   simetria: 'x' para a curva da metade x >= 0: o ponto a até 1e-6 mm do plano fica com o x dado, e nenhum outro vai a x < 0.
 *   iteracoes: quantas vezes a parametrização se refaz pela curva da volta anterior (2 por padrão, de 1 a 10); a volta só fica se baixar a energia.
 * devolve: { pontos, deslocamentos, limitados, duros, variacaoAntes, variacaoDepois, maiorDeslocamento, voltas }.
 * exemplo:
 *   alisarPontosDaCurva([[0, 0, 0], [100, 1.5, 0], [200, -1, 0], [300, 0.8, 0], [400, -0.6, 0], [500, 1.2, 0], [600, 0, 0]], { tolerancia: 2 })
 * peça: tools/fixtures/correcao-de-superficie/rede-com-ruido (a rede com ruído de 2 mm, alisada pela opção alisarCurvas da gaiolaPorRede).
 * FIM DA FICHA
 *
 * Função pura, sem Three.js e sem domínio.
 *
 * O RUÍDO E A FORMA. O ruído de leitura troca de sinal de um ponto-chave para o seguinte (o da rede de prova tem período de três pontos); a
 * forma muda devagar de um ponto para o outro. A energia mede só o que muda depressa: em cada janela de k + 1 pontos seguidos, o resíduo é
 * a diferença dividida de ordem k dos pontos sobre o parâmetro do comprimento da corda (a soma das distâncias entre pontos seguidos),
 * r = k! · h^k · f[t0, ..., tk], com h a corda média do trecho, que na curva de espaçamento uniforme é a k-ésima diferença comum, em mm.
 * Ela é zero em todo polinômio de grau menor que k no parâmetro da corda: é o resíduo do ajuste local de grau k - 1 pelos k + 1 pontos.
 * Com 'quartica' (k = 5) a forma que o polinômio de grau 4 descreve em seis pontos (o arco, a parábola, a clotoide, a hélice, a senoide de
 * vinte pontos por onda) não pesa quase nada, e o ruído pesa inteiro: na curva de espaçamento uniforme, a componente de período p pontos
 * tem o resíduo multiplicado por (2 sen(π/p))^5, que é 15 no ruído de período três e 0,003 na onda de vinte pontos. A rigidez 1 corta no
 * período de seis pontos: a componente de período seis cai à metade, a de três a menos de 1/200 e a de vinte fica a 1/100 000 do lugar.
 * O primeiro jeito, a terceira diferença com rigidez 1000 (a curva de variação mínima linearizada), não separava os dois: puxava toda
 * curva de curvatura variável para a de curvatura constante até o limite (a elipse de 2000 por 600 em 24 pontos andava 95 mm, a hélice
 * 37,8 e a clotoide 25).
 *
 * O trecho curto. Com k = 5 o trecho aberto de m pontos tem m - 5 janelas, e o de menos de oito pontos ficaria com menos de três: nele a
 * ordem cai para max(4, m - 3), a quarta diferença no trecho de cinco a sete pontos; o ciclo tem m janelas e cai para m - 1 só abaixo de
 * seis pontos. O trecho de menos de cinco pontos fica como está. A quarta diferença no trecho de cinco a sete pontos não separa forma de
 * ruído no arco aberto: o arco limpo de raio 1000 em sete pontos anda 0,13 mm com 45 graus, 2,3 com 90, 7,7 com 120 e 42 com 180.
 * De oito pontos para cima o arco limpo exato fica no lugar só porque a volta é rejeitada (ela não baixa a energia); com um ruído
 * pequeno a volta fica, e o arco aberto de oito pontos anda 0,11 mm com 90 graus, 0,56 com 120 e 5,1 com 180 (com nove pontos, 4,1),
 * e o de onze pontos com 90 graus, 0,02. O trecho assim precisa de mais pontos ou de tolerância pequena.
 *
 * A REGRA EM PONTOS POR VOLTA. A curva de curvatura constante se alisa sem andar quando a volta inteira dela teria uns 16 pontos: o
 * círculo fechado de 16 pontos anda 0,08 mm por 1000 mm de raio, o de 12 anda 1,4 e o de 8, 65. A curva aberta perde nas pontas e pede
 * 24 pontos ou mais por volta: a hélice de raio 300 com 20 pontos por volta, com 0,1 mm de ruído, anda 0,52 mm no ponto vizinho da
 * ponta, com 24 pontos 0,22 e com 32, 0,07; o arco aberto de 120 graus em oito pontos (21 por volta) anda 0,56.
 * A curva que anda mais que meia tolerância, ou que bate nela, sai com aviso na gaiolaPorRede.
 *
 * O canto. Esta função parte a curva só onde o chamador manda (`partir`). Na gaiolaPorRede o canto num ponto-chave numérico se acha
 * pelas cordas até 20 tolerâncias de cada lado: os cantos a menos disso um do outro ou da ponta não são achados, e saem arredondados até
 * a tolerância; o remédio é o nó em `cantos` (a ficha de gaiolaPorRede dá os números).
 *
 * O limite do método. O que muda num comprimento da ordem do espaçamento não se distingue do ruído pela amostragem: a curvatura da ponta
 * da elipse muda num comprimento menor que o raio dela. Com o raio da ponta em umas sete vezes o espaçamento a elipse anda 0,02 mm (a de
 * 2000 por 600, raio de 180 mm, com ponto a cada 25 mm de arco; a de 1000 por 600, raio de 360, a cada 50); com 3,6 vezes, de 0,9 a 1,3
 * mm (as mesmas a cada 50 e a cada 100 mm); com 1,8 vez (a de 2000 por 600 a cada 100 mm) e na de 24 pontos igualmente espaçados no
 * ângulo, a ponta vai ao limite (sem limite, 10 e 130 mm). O arco de espaçamento desigual, de corda até seis vezes a menor em sete
 * pontos, anda até o limite onde a corda é longa. A curva com feição assim precisa de pontos mais juntos nela, de pontos duros na feição
 * ou de tolerância menor nela (a `toleranciaPorCurva` da gaiolaPorRede).
 *
 * O sistema. A curva alisada p = p0 + d minimiza Σ w_i |d_i|² + rigidez · Σ |r_j(p0) + Σ c d|² sobre os deslocamentos d das coordenadas
 * livres; as três coordenadas são independentes, e cada uma é um sistema simétrico, definido positivo e em banda, que se resolve pelo
 * gradiente conjugado do núcleo (`gradienteConjugado`, de `gaiola-por-rede-liso.js`), em ordem fixa de pontos. A curva sem ruído e sem
 * forma de ordem k (a reta, a parábola) tem resíduo zero e d = 0 exato.
 *
 * As voltas e a energia. A parametrização sai da curva da volta anterior (na primeira, da dada), `iteracoes` vezes; cada volta só fica se
 * a energia da curva nova, medida com a parametrização dela mesma, for menor que a da volta anterior, e a primeira, menor que a da curva
 * dada; senão a volta anterior é a resposta (a curva dada, se nenhuma baixou). Por isso a variação nunca sobe (teste). `variacaoAntes` e
 * `variacaoDepois` são essa energia, Σ |r_j|² em mm², da curva dada e da devolvida, cada uma com a própria parametrização.
 *
 * Os pontos duros, os trechos e o limite. Os pontos duros (os que o chamador marca, mais as pontas da curva aberta) ficam onde estão,
 * bit a bit. Os pontos de `partir` são duros e cortam a curva: cada trecho entre dois deles se alisa sozinho, e a energia não atravessa
 * o canto. Depois de resolver, se um ponto do trecho andou mais que `tolerancia` (em mm, a distância em 3D), ou o deslocamento visto pela
 * `silhueta` (o que sobra tirando a componente ao longo do eixo da vista) passa da tolerância dela, ou ele foi a x < 0 com `simetria: 'x'`,
 * o trecho inteiro se resolve de novo com a maior rigidez que cabe no limite, achada por 24 passos de bisseção no expoente (a rigidez
 * vezes 2^-r, r de 0 a 40); os pontos que passavam saem em `limitados`. A rigidez menor solta primeiro a onda longa e continua tirando a
 * curta, e a curva sai lisa. O primeiro jeito, subir o peso do desvio só no ponto que passava, deixava um bico nele: no quarto traseiro
 * com a tolerância de 3 mm o índice do para-lama ficava em 350, contra 224 com a rigidez do trecho. O limite nunca é ultrapassado: o
 * ponto que ainda passar é cortado ao limite (e o x negativo, a 0), como última operação. Com `simetria: 'x'` o ponto que está no plano
 * tem o x preso, como coordenada dura. Quando o ruído passa da tolerância em boa parte das curvas, cada curva fica com uma rigidez, e a
 * diferença entre curvas vizinhas ondula a superfície: no quarto traseiro com 1 mm o para-lama vai de 879 (sem a opção) a 1921, e com 3
 * mm a 224; a tolerância tem de cobrir a amplitude do ruído (`toleranciaPorCurva` na gaiolaPorRede).
 *
 * Tudo é determinístico: a mesma curva dá os mesmos números, bit a bit. */

import { gradienteConjugado } from './gaiola-por-rede-liso.js';

export const ALISAR_CURVAS_PADRAO = Object.freeze({ energia: 'quartica', rigidez: 1, tolerancia: 1, iteracoes: 2 });
/* a ordem da diferença de cada energia: a de ordem k zera o polinômio de grau k - 1 no parâmetro da corda */
const ORDEM = Object.freeze({ quartica: 5, cubica: 4 });
const ORDEM_MINIMA = 4;
/* a faixa da rigidez aceita */
const RIGIDEZ = Object.freeze([1e-6, 1e6]);
/* a distância (mm) ao plano de simetria abaixo da qual o ponto conta como nele: a mesma folga (1e-9 m) da gaiolaPorRede, em mm */
const NO_PLANO = 1e-6;
const EIXO = Object.freeze({ x: 0, y: 1, z: 2 });
const REDUCAO_MAXIMA = 40;
const PASSOS_DA_RIGIDEZ = 24;

const distancia = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const fatorial = (k) => (k <= 1 ? 1 : k * fatorial(k - 1));
/* o valor recebido, como a recusa o mostra: o número como ele é (NaN e Infinity inclusive), o resto em JSON */
const valor = (v) => (typeof v === 'number' || v === undefined ? String(v) : JSON.stringify(v));

function falha(texto) { throw new TypeError(`alisar curvas: ${texto}`); }

/** Confere uma tolerância (mm, número finito maior que zero); `campo` e `onde` dizem quem a declarou, para a recusa. */
export function conferirTolerancia(v, campo, onde) {
  if (!(typeof v === 'number' && Number.isFinite(v) && v > 0)) falha(`${onde} tem ${campo} ${valor(v)}; a tolerância é o maior deslocamento de um ponto, número finito maior que zero, em mm`);
  return v;
}

/** Lê e confere as opções do alisamento de uma curva; `onde` diz quem as declarou, para a recusa. */
export function lerOpcoesDoAlisamento(opcoes = {}, onde = 'o alisamento') {
  const o = { ...ALISAR_CURVAS_PADRAO, silhueta: null, simetria: null, ...Object.fromEntries(Object.entries(opcoes ?? {}).filter(([, v]) => v != null)) };
  if (!Object.hasOwn(ORDEM, o.energia)) falha(`${onde} tem energia ${valor(o.energia)}; use 'quartica' (a quinta diferença, padrão) ou 'cubica' (a quarta)`);
  if (!(typeof o.rigidez === 'number' && o.rigidez >= RIGIDEZ[0] && o.rigidez <= RIGIDEZ[1])) falha(`${onde} tem rigidez ${valor(o.rigidez)}; a rigidez vai de 1e-6 a 1e6 (1 por padrão): abaixo disso a curva não se mexe, e acima a conta perde a precisão sem alisar mais`);
  conferirTolerancia(o.tolerancia, 'tolerancia', onde);
  if (!(Number.isInteger(o.iteracoes) && o.iteracoes >= 1 && o.iteracoes <= 10)) falha(`${onde} tem iteracoes ${valor(o.iteracoes)}; use um inteiro de 1 a 10`);
  if (o.simetria !== null && o.simetria !== 'x') falha(`${onde} tem simetria ${valor(o.simetria)}; a simetria só aceita 'x' (a metade x >= 0)`);
  if (o.silhueta !== null) {
    const s = o.silhueta;
    if (!s || typeof s !== 'object' || Array.isArray(s) || !Object.hasOwn(EIXO, s.vista)) falha(`${onde} tem silhueta ${valor(s)}; a silhueta é { vista: 'x' | 'y' | 'z', tolerancia } em mm`);
    const extra = Object.keys(s).filter((k) => k !== 'vista' && k !== 'tolerancia');
    if (extra.length) falha(`${onde} tem na silhueta o campo ${extra.map((k) => `'${k}'`).join(', ')}, que não existe; use vista e tolerancia`);
    if (!(typeof s.tolerancia === 'number' && Number.isFinite(s.tolerancia) && s.tolerancia > 0)) falha(`${onde} tem silhueta.tolerancia ${valor(s.tolerancia)}; é o maior deslocamento visto pela vista '${s.vista}', número finito maior que zero, em mm`);
  }
  return o;
}

/* Os coeficientes da diferença dividida de ordem k sobre os parâmetros t: Σ f_i / Π_{j≠i} (t_i - t_j). */
function coeficientesDaDiferenca(t) {
  return t.map((ti, i) => { let p = 1; for (let j = 0; j < t.length; j++) if (j !== i) p *= ti - t[j]; return 1 / p; });
}

/* Os resíduos de um trecho: cada um a lista [[índice do ponto, coeficiente]] de k + 1 pontos seguidos, com o parâmetro do comprimento
   da corda de `P`. `indices` é a sequência de pontos do trecho e `ciclico` diz se ele dá a volta. */
function residuosDoTrecho(indices, P, k, ciclico) {
  const m = indices.length;
  const cordas = [];
  const voltas = ciclico ? m : m - 1;
  for (let a = 0; a < voltas; a++) cordas.push(distancia(P[indices[a]], P[indices[(a + 1) % m]]));
  const h = cordas.reduce((s, c) => s + c, 0) / cordas.length;
  const escala = fatorial(k) * h ** k;
  const linhas = [];
  const inicios = ciclico ? m : m - k;
  for (let j = 0; j < inicios; j++) {
    const t = [0];
    for (let a = 0; a < k; a++) t.push(t[a] + cordas[(j + a) % cordas.length]);
    const c = coeficientesDaDiferenca(t);
    linhas.push(c.map((v, a) => [indices[(j + a) % m], v * escala]));
  }
  return linhas;
}

/* Σ |r|² dos resíduos sobre as posições P. */
function energiaDe(linhas, P) {
  let s = 0;
  for (const L of linhas) {
    let x = 0; let y = 0; let z = 0;
    for (const [i, c] of L) { x += c * P[i][0]; y += c * P[i][1]; z += c * P[i][2]; }
    s += x * x + y * y + z * z;
  }
  return s;
}

/* Os trechos da curva: listas de índices, cada uma aberta com as pontas em `partir` (ou nas pontas da curva), ou a volta inteira. */
function trechosDaCurva(n, fechada, partir) {
  const cortes = [...partir].sort((a, b) => a - b);
  if (!fechada) {
    const marcos = [...new Set([0, ...cortes, n - 1])].sort((a, b) => a - b);
    const trechos = [];
    for (let q = 0; q + 1 < marcos.length; q++) trechos.push({ indices: Array.from({ length: marcos[q + 1] - marcos[q] + 1 }, (_, a) => marcos[q] + a), ciclico: false });
    return trechos;
  }
  if (!cortes.length) return [{ indices: Array.from({ length: n }, (_, a) => a), ciclico: true }];
  const trechos = [];
  for (let q = 0; q < cortes.length; q++) {
    const a = cortes[q]; const b = cortes[(q + 1) % cortes.length];
    const comp = ((b - a + n - 1) % n) + 1;
    trechos.push({ indices: Array.from({ length: comp + 1 }, (_, s) => (a + s) % n), ciclico: false });
  }
  return trechos;
}

/* Resolve um trecho pelo deslocamento d de cada coordenada livre: minimiza Σ w d² + rigidez Σ |r0_j + Σ c d|², com r0_j o resíduo dos
   pontos dados e a coordenada presa (`presa[i][q]`) com d = 0. As três coordenadas são independentes, e cada uma é um sistema em banda. */
function resolverTrecho(trecho, P0, pesos, presa, linhas, rigidez, saida) {
  const pontos = [...new Set(trecho.indices)];
  for (let q = 0; q < 3; q++) {
    const livres = pontos.filter((i) => !presa[i][q]);
    if (!livres.length) continue;
    const pos = new Map(livres.map((i, a) => [i, a]));
    const A = livres.map(() => new Map());
    const b = new Float64Array(livres.length);
    const somar = (u, v, x) => A[u].set(v, (A[u].get(v) ?? 0) + x);
    livres.forEach((i, a) => somar(a, a, pesos[i][q]));
    for (const L of linhas) {
      let r0 = 0;
      for (const [i, c] of L) r0 += c * P0[i][q];
      for (const [i, ci] of L) {
        const a = pos.get(i);
        if (a === undefined) continue;
        b[a] -= rigidez * ci * r0;
        for (const [k, ck] of L) { const e = pos.get(k); if (e !== undefined) somar(a, e, rigidez * ci * ck); }
      }
    }
    const colunas = A.map((linha) => [...linha].sort((x, y) => x[0] - y[0]));
    const diag = Float64Array.from(colunas.map((linha, u) => linha.find(([v]) => v === u)[1]));
    const d = gradienteConjugado(colunas, diag, 0, b);
    livres.forEach((i, a) => { saida[i][q] = P0[i][q] + d[a]; });
  }
}

/* Quanto o deslocamento d passa de cada limite: a razão (maior que 1 quando passa) da distância em 3D e da vista da silhueta. */
function excessos(d, tolerancia, silhueta) {
  const total = Math.hypot(...d) / tolerancia;
  if (!silhueta) return { total, visto: 0 };
  const q = EIXO[silhueta.vista];
  return { total, visto: Math.hypot(...d.filter((_, a) => a !== q)) / silhueta.tolerancia };
}

/* O deslocamento d cortado aos limites: primeiro o que a vista da silhueta mostra, depois a distância em 3D. */
function cortarAoLimite(d, tolerancia, silhueta) {
  let e = [...d];
  if (silhueta) {
    const q = EIXO[silhueta.vista];
    const visto = Math.hypot(...e.filter((_, a) => a !== q));
    if (visto > silhueta.tolerancia) { const s = silhueta.tolerancia / visto; e = e.map((v, a) => (a === q ? v : v * s)); }
  }
  const total = Math.hypot(...e);
  if (total > tolerancia) { const s = tolerancia / total; e = e.map((v) => v * s); }
  return e;
}

/**
 * alisarPontosDaCurva(pontos, opcoes) -> { pontos, deslocamentos, limitados, duros, variacaoAntes, variacaoDepois, maiorDeslocamento, voltas }
 *   pontos: [[x, y, z]] em mm; opcoes: { fechada, duros, partir, energia, rigidez, tolerancia, silhueta, simetria, iteracoes }, descritas na
 *   ficha; `onde` diz quem chamou, para a recusa. Devolve as posições novas sem mexer nas dadas; `voltas` é quantas voltas ficaram.
 */
export function alisarPontosDaCurva(pontos, opcoes = {}) {
  const { fechada = false, duros = [], partir = [], onde = 'o alisamento', ...resto } = opcoes;
  const o = lerOpcoesDoAlisamento(resto, onde);
  if (!Array.isArray(pontos) || pontos.some((p) => !Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite))) falha(`${onde} recebeu pontos que não são [x, y, z] finitos em mm`);
  const n = pontos.length;
  const P0 = pontos.map((p) => [...p]);
  for (const lista of [duros, partir]) for (const i of lista) if (!(Number.isInteger(i) && i >= 0 && i < n)) falha(`${onde} cita o ponto ${valor(i)} como duro ou corte; a curva tem os pontos de 0 a ${n - 1}`);
  const cordas = fechada && n > 2 ? n : n - 1;
  for (let i = 0; i < cordas; i++) {
    const j = (i + 1) % n;
    if (!(distancia(P0[i], P0[j]) > 0)) falha(`${onde} repete o ponto-chave: o de índice ${i} e o de índice ${j} são iguais (${valor(P0[i])}), e a corda entre eles é nula; tire um dos dois`);
  }
  if (o.simetria === 'x') { const i = P0.findIndex((p) => p[0] < -NO_PLANO); if (i >= 0) falha(`${onde} tem simetria 'x' e o ponto de índice ${i} em x ${P0[i][0]} < 0; a curva é da metade x >= 0 (o ponto a até ${NO_PLANO} mm do plano conta como nele)`); }
  const duro = new Set([...duros, ...partir, ...(fechada ? [] : [0, n - 1])]);
  /* a ordem do trecho: a da energia, ou menos no trecho aberto curto (que tem m - k janelas) e no ciclo curto (que tem m, e precisa de k + 1 pontos) */
  const ordemDo = (tr) => Math.max(ORDEM_MINIMA, Math.min(ORDEM[o.energia], tr.indices.length - (tr.ciclico ? 1 : 3)));
  const trechos = trechosDaCurva(n, fechada, new Set(partir)).map((tr) => ({ ...tr, k: ordemDo(tr) }));
  /* o trecho curto demais para a energia (menos de k + 1 pontos) não tem resíduo e fica como está */
  const linhasDe = (P) => trechos.map((tr) => (tr.indices.length >= tr.k + 1 ? residuosDoTrecho(tr.indices, P, tr.k, tr.ciclico) : []));
  /* a energia da curva P com a parametrização dela mesma: a medida do quanto ela ondula */
  const energiaPropria = (P) => linhasDe(P).reduce((s, L) => s + energiaDe(L, P), 0);
  /* a coordenada presa: as três do ponto duro, e o x do ponto no plano de simetria */
  const presa = P0.map((p, i) => [0, 1, 2].map((q) => duro.has(i) || (q === 0 && o.simetria === 'x' && Math.abs(p[0]) <= NO_PLANO)));

  /* uma solução com os parâmetros das linhas dadas, com os limites: o trecho em que um ponto passa se resolve com a maior rigidez que
     cabe, e o que ainda passar é cortado */
  function resolverComLimite(linhas) {
    const pesos = P0.map(() => [1, 1, 1]);
    const limitados = new Set();
    const P = P0.map((p) => [...p]);
    /* os pontos do trecho que passam de um limite na solução P */
    const passam = (tr) => tr.indices.filter((i) => {
      if (duro.has(i)) return false;
      const d = [P[i][0] - P0[i][0], P[i][1] - P0[i][1], P[i][2] - P0[i][2]];
      const { total, visto } = excessos(d, o.tolerancia, o.silhueta);
      return total > 1 || visto > 1 || (o.simetria === 'x' && !presa[i][0] && P[i][0] < 0);
    });
    trechos.forEach((tr, q) => {
      resolverTrecho(tr, P0, pesos, presa, linhas[q], o.rigidez, P);
      const fora = passam(tr);
      if (!fora.length) return;
      /* o trecho que passa do limite se resolve com a maior rigidez que cabe nele, por bisseção no logaritmo: a rigidez menor solta
         primeiro a onda longa (a forma) e continua tirando a curta (o ruído), e a curva sai lisa, sem o bico do ponto preso */
      for (const i of fora) limitados.add(i);
      /* a rigidez é a dada vezes 2^-r: r = 0 não cabe, r = REDUCAO_MAXIMA (a rigidez a 1e-12 da dada) cabe sempre, salvo o corte */
      let naoCabe = 0; let cabe = REDUCAO_MAXIMA;
      for (let passo = 0; passo < PASSOS_DA_RIGIDEZ; passo++) {
        const r = (naoCabe + cabe) / 2;
        resolverTrecho(tr, P0, pesos, presa, linhas[q], o.rigidez * 2 ** -r, P);
        if (passam(tr).length) naoCabe = r; else cabe = r;
      }
      resolverTrecho(tr, P0, pesos, presa, linhas[q], o.rigidez * 2 ** -cabe, P);
    });
    for (let i = 0; i < n; i++) {
      if (duro.has(i)) { P[i] = [...P0[i]]; continue; }
      const d = [P[i][0] - P0[i][0], P[i][1] - P0[i][1], P[i][2] - P0[i][2]];
      const { total, visto } = excessos(d, o.tolerancia, o.silhueta);
      if (total > 1 || visto > 1) { const e = cortarAoLimite(d, o.tolerancia, o.silhueta); P[i] = [P0[i][0] + e[0], P0[i][1] + e[1], P0[i][2] + e[2]]; }
      if (o.simetria === 'x' && !presa[i][0] && P[i][0] < 0) P[i][0] = 0;
    }
    return { P, limitados };
  }

  /* cada volta refaz a parametrização pela curva da volta anterior, e só fica se baixar a energia própria da curva */
  const variacaoAntes = energiaPropria(P0);
  let atual = { P: P0, limitados: new Set() }; let energia = variacaoAntes; let voltas = 0;
  for (let it = 0; it < o.iteracoes; it++) {
    const novo = resolverComLimite(linhasDe(atual.P));
    const e = energiaPropria(novo.P);
    if (!(e < energia)) break;
    atual = novo; energia = e; voltas = it + 1;
  }
  const P = atual.P.map((p) => [...p]);
  const deslocamentos = P.map((p, i) => distancia(p, P0[i]));
  return {
    pontos: P,
    deslocamentos,
    limitados: [...atual.limitados].sort((a, b) => a - b),
    duros: [...duro].sort((a, b) => a - b),
    variacaoAntes,
    variacaoDepois: energia,
    maiorDeslocamento: deslocamentos.reduce((s, d) => Math.max(s, d), 0),
    voltas,
  };
}
