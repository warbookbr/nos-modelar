/* geometria.js — o elo entre duas juntas em milímetro, com o eixo do elo em y: a boca A em y = 0 e a boca B em y = comprimento.

   O elo é a carenagem oca de um `loft` de seções ao longo do eixo, aberto nas duas bocas. A seção da boca é o círculo da flange
   que o elo cobre; da boca, por um trecho de `espessuraDaBoca` (onde fica o anel de fixação) e por uma transição de suavização
   (smoothstep, que sai e chega com inclinação zero), a seção passa à do corpo (elíptica, redonda ou de cantos arredondados, por
   uma superelipse de expoente 2 ou 4) e volta à da outra boca. No meio, a cintura ou a barriga multiplica a seção do corpo por
   um fator que vai de 1 nas pontas ao `cintura` no meio do trecho livre (seno ao quadrado). A parede vem da casca pela receita
   (`passosDaCascaDoLoft`), calculada no `derivar`. Regra da família, sem norma.

   O DESVIO. Com `desvio` ou `deslocamentoLateral` diferentes de zero o eixo deixa de ser reto: cada boca tem um trecho reto de
   `espessuraDaBoca` (o anel fica nele, e a face da boca é perpendicular ao eixo ali) e, entre os dois, o caminho é uma Bézier
   cúbica que sai na direção de +y e chega na direção da boca B, girada `desvio` graus no plano que contém y e a direção do
   desvio (`azimute`: 0 é para +z, 90 é para +x). A boca B fica a `comprimento` em y; sem deslocamento lateral o caminho é o
   arco de círculo daquele desvio, e o deslocamento lateral (mm, na direção do desvio) o afasta dele. Cada seção continua sendo
   a do corpo, medida em arco ao longo do caminho, e gira com a tangente em torno do eixo do giro (perpendicular ao plano do
   desvio), que é a `orientacao` do `loft`: o quadro da seção não torce, só inclina. Com os dois em zero o caminho é o eixo y e
   a malha é a de antes, bit a bit. */

export const LADOS = 48;
export const INTERVALOS = 12;
/* as seções a mais de cada ponta no caminho com desvio (duas por ponta) */
export const SECOES_A_MAIS_DO_DESVIO = 4;
/* a transição de cada boca ocupa esta fração do trecho livre (entre as duas espessuras de boca); o meio fica com o corpo */
export const FRACAO_DA_TRANSICAO = 0.4;
export const MARGEM_DO_FURO = 1;
export const FACE_ENTRE_FUROS = 2;
const EXPOENTE = { 1: 2, 2: 2, 3: 4 };

const suave = (t) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };

/** Os dois semieixos do corpo (x e z) pela forma da seção: a elíptica leva a largura e a profundidade, a redonda o menor dos dois. */
export function semieixosDoCorpo(q) {
  const redonda = q.secao === 2;
  const menor = Math.min(q.larguraDaSecao, q.profundidadeDaSecao);
  return redonda ? [menor / 2, menor / 2] : [q.larguraDaSecao / 2, q.profundidadeDaSecao / 2];
}

/** Os y (em arco, no caminho com desvio) das seções: a boca, o fim do anel, o trecho livre repartido em intervalos iguais, o começo do anel da outra boca e a boca.
 *  No caminho com desvio (`refinada`) cada ponta tem duas seções a mais, a `g` e a 3 `g` do anel (`g` é a espessura da boca, ou 1/24 do trecho livre se este for menor): a
 *  seção entre o trecho curvo e o anel reto inclina a metade da dobra entre os dois, e com o intervalo longo de antes a face de dentro da curva se comprimia contra o anel. */
export function estacoes(q, total = q.comprimento, refinada = false) {
  const livre = total - q.espessuraDaBocaA - q.espessuraDaBocaB;
  if (refinada) {
    const eA = q.espessuraDaBocaA; const eB = q.espessuraDaBocaB; const gA = Math.min(eA, livre / 24); const gB = Math.min(eB, livre / 24);
    const ini = eA + 3 * gA; const fim = total - eB - 3 * gB; const passo = (fim - ini) / INTERVALOS;
    const meio = Array.from({ length: INTERVALOS - 1 }, (_, i) => ini + passo * (i + 1));
    return [0, eA, eA + gA, ini, ...meio, fim, total - eB - gB, total - eB, total];
  }
  const meio = Array.from({ length: INTERVALOS - 1 }, (_, i) => q.espessuraDaBocaA + (livre * (i + 1)) / INTERVALOS);
  return [0, q.espessuraDaBocaA, ...meio, total - q.espessuraDaBocaB, total];
}

/** A seção (contorno em x e z, anti-horário) na posição y do eixo (ou no arco `y` do caminho de comprimento `total`). */
export function contornoEm(q, y, total = q.comprimento) {
  const livre = total - q.espessuraDaBocaA - q.espessuraDaBocaB;
  const z = FRACAO_DA_TRANSICAO * livre;
  const eA = 1 - suave((y - q.espessuraDaBocaA) / z);
  const eB = 1 - suave((total - q.espessuraDaBocaB - y) / z);
  const corpo = Math.max(0, 1 - eA - eB);
  const u = (y - q.espessuraDaBocaA) / livre;
  const fator = 1 - (1 - q.cintura) * Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ** 2;
  const [ax, az] = semieixosDoCorpo(q);
  const boca = eA * (q.diametroDaBocaA / 2) + eB * (q.diametroDaBocaB / 2);
  const rx = corpo * ax * fator + boca; const rz = corpo * az * fator + boca;
  const n = 2 + (EXPOENTE[q.secao] - 2) * corpo;
  const potencia = (t) => Math.sign(t) * Math.abs(t) ** (2 / n);
  return Array.from({ length: LADOS }, (_, j) => { const a = (2 * Math.PI * j) / LADOS; return [rx * potencia(Math.cos(a)), rz * potencia(Math.sin(a))]; });
}

const GRAUS = Math.PI / 180;
/* no caminho com desvio a casca acaba 30 µm antes do plano da boca B e o anel passa dele: a face do anel e a ponta da casca, as duas
   inclinadas fora dos eixos, não ficam coplanares (a união de duas faces coplanares com ruído de ponto flutuante deixa arestas de
   nanômetro, abaixo da precisão do motor, que recusa a booleana) */
export const RECUO_DA_PONTA_B = 0.03;
const AMOSTRAS_DO_ARCO = 2000;
const soma3 = (a, b, k = 1) => [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]];

/** O eixo é reto (o elo de antes, bit a bit) quando não há desvio nem deslocamento lateral. */
export const ehReto = (q) => q.desvio === 0 && q.deslocamentoLateral === 0;

/** A direção do desvio no plano xz (azimute 0 para +z, 90 para +x) e o eixo do giro, perpendicular a ela e a y. */
export function direcaoDoDesvio(q) {
  const a = q.azimute * GRAUS;
  return { direcao: [Math.sin(a), 0, Math.cos(a)], eixoDoGiro: ehReto(q) || q.azimute === 0 ? [1, 0, 0] : [Math.cos(a), 0, -Math.sin(a) || 0] };
}

/** A tangente do eixo na boca B (a de A é +y) e a rotação que leva o quadro da boca A ao da B (em torno do eixo do giro, de `desvio` graus). */
export function giroDaBocaB(q) {
  const d = q.desvio * GRAUS; const { direcao, eixoDoGiro } = direcaoDoDesvio(q);
  const gira = (v) => {
    const k = eixoDoGiro; const dot = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
    const c = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
    return [0, 1, 2].map((i) => v[i] * Math.cos(d) + c[i] * Math.sin(d) + k[i] * dot * (1 - Math.cos(d)));
  };
  const tangente = [Math.sin(d) * direcao[0], Math.cos(d), Math.sin(d) * direcao[2]];
  /* o núcleo mede o ângulo dos furos de uma porta circular a partir de u = normalizado(normal × x) (ou × y, se a normal quase
     coincide com x), e não da referência; o quadro girado do anel (a imagem do da boca B reta, u0 = −z) difere dele de `anguloExtra` */
  const apoio = Math.abs(tangente[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const prod = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const u = prod(tangente, apoio); const tu = Math.hypot(...u); const un = u.map((x) => x / tu); const vn = prod(tangente, un);
  const giradoU = gira([0, 0, -1]);
  const anguloExtra = Math.atan2(giradoU[0] * vn[0] + giradoU[1] * vn[1] + giradoU[2] * vn[2], giradoU[0] * un[0] + giradoU[1] * un[1] + giradoU[2] * un[2]) / GRAUS;
  return { tangente, referencia: gira([1, 0, 0]), gira, anguloExtra };
}

/** O caminho do eixo: trecho reto da boca A, Bézier cúbica no meio, trecho reto da boca B. Devolve o comprimento em arco, o ponto da boca B e `pos(s)` (mm). */
export function caminhoDoElo(q) {
  if (ehReto(q)) return { total: q.comprimento, pontoB: [0, q.comprimento, 0], pos: (s) => [0, s, 0] };
  const d = q.desvio * GRAUS; const { direcao } = direcaoDoDesvio(q); const { tangente } = giroDaBocaB(q);
  const eA = q.espessuraDaBocaA; const eB = q.espessuraDaBocaB;
  const fimY = q.comprimento - eB * Math.cos(d);
  const lateral = (fimY - eA) * Math.tan(d / 2) + q.deslocamentoLateral;
  const P0 = [0, eA, 0]; const P1 = [lateral * direcao[0], fimY, lateral * direcao[2]];
  const corda = Math.hypot(P1[0] - P0[0], P1[1] - P0[1], P1[2] - P0[2]);
  const h = d > 1e-9 ? ((4 / 3) * Math.tan(d / 4) * corda) / (2 * Math.sin(d / 2)) : corda / 3;
  const C1 = soma3(P0, [0, 1, 0], h); const C2 = soma3(P1, tangente, -h);
  const bezier = (t) => { const u = 1 - t; return [0, 1, 2].map((i) => u * u * u * P0[i] + 3 * u * u * t * C1[i] + 3 * u * t * t * C2[i] + t * t * t * P1[i]); };
  const tabela = [0]; let anterior = bezier(0);
  for (let i = 1; i <= AMOSTRAS_DO_ARCO; i += 1) { const p = bezier(i / AMOSTRAS_DO_ARCO); tabela.push(tabela[i - 1] + Math.hypot(p[0] - anterior[0], p[1] - anterior[1], p[2] - anterior[2])); anterior = p; }
  const meio = tabela[AMOSTRAS_DO_ARCO]; const total = eA + meio + eB;
  const noArco = (a) => {
    let i = 1; while (i < AMOSTRAS_DO_ARCO && tabela[i] < a) i += 1;
    const t = (i - 1 + (a - tabela[i - 1]) / (tabela[i] - tabela[i - 1])) / AMOSTRAS_DO_ARCO;
    return bezier(Math.min(1, Math.max(0, t)));
  };
  const pontoB = soma3(P1, tangente, eB);
  const pos = (s) => (s <= eA ? [0, s, 0] : s >= total - eB ? soma3(pontoB, tangente, s - total) : noArco(s - eA));
  return { total, pontoB, pos };
}

/** As seções do `loft` do elo, em milímetro, sem polo (as duas bocas abertas); no caminho com desvio, cada contorno em x e z da boca A passa ao quadro (eixo do giro, w) do `loft`. */
export function secoesDoElo(q) {
  const { total, pos } = caminhoDoElo(q);
  if (ehReto(q)) return estacoes(q).map((y) => ({ pos: pos(y), contorno: contornoEm(q, y) }));
  const a = q.azimute * GRAUS; const c = Math.cos(a); const s = Math.sin(a);
  return estacoes(q, total, true).map((y, k, todas) => ({ pos: pos(k === todas.length - 1 ? y - RECUO_DA_PONTA_B : y), contorno: contornoEm(q, y, total).map(([x, z]) => [x * c - z * s, x * s + z * c]) }));
}

/** O anel de fixação de uma boca: o raio de dentro (a passagem), o de fora (dentro da parede) e a espessura. */
export function anelDaBoca(q, lado) {
  const D = q[`diametroDaBoca${lado}`]; const c = q[`circuloDaBoca${lado}`]; const f = q[`diametroDoFuroDaBoca${lado}`];
  return { dentro: c / 2 - f / 2 - FACE_ENTRE_FUROS, fora: D / 2 - q.parede / 2, espessura: q[`espessuraDaBoca${lado}`] };
}

/** O furo de fixação da boca: o centro do furo 0 (meio passo fora do eixo x, como o do atuador), a contagem e o ângulo da porta no quadro do plano dela (a normal −y da boca A e a +y da boca B), que dá os mesmos furos para qualquer contagem. */
export function furosDaBoca(q, lado) {
  const n = q[`furosDaBoca${lado}`]; const r = q[`circuloDaBoca${lado}`] / 2; const a = Math.PI / n;
  return { em: [r * Math.cos(a), 0, r * Math.sin(a)], total: n, graus: 360 / n, anguloInicial: lado === 'A' ? 180 / n - 90 : -90 - 180 / n };
}
