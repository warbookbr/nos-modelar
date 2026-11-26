/* geometria.js — o elo entre duas juntas em milímetro, com o eixo do elo em y: a boca A em y = 0 e a boca B em y = comprimento.

   O elo é a carenagem oca de um `loft` de seções ao longo do eixo, aberto nas duas bocas. A seção da boca é o círculo da flange
   que o elo cobre; da boca, por um trecho de `espessuraDaBoca` (onde fica o anel de fixação) e por uma transição de suavização
   (smoothstep, que sai e chega com inclinação zero), a seção passa à do corpo (elíptica, redonda ou de cantos arredondados, por
   uma superelipse de expoente 2 ou 4) e volta à da outra boca. No meio, a cintura ou a barriga multiplica a seção do corpo por
   um fator que vai de 1 nas pontas ao `cintura` no meio do trecho livre (seno ao quadrado). A parede vem da casca pela receita
   (`passosDaCascaDoLoft`), calculada no `derivar`. Regra da família, sem norma. */

export const LADOS = 48;
export const INTERVALOS = 12;
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

/** Os y das seções: a boca, o fim do anel, o trecho livre repartido em intervalos iguais, o começo do anel da outra boca e a boca. */
export function estacoes(q) {
  const livre = q.comprimento - q.espessuraDaBocaA - q.espessuraDaBocaB;
  const meio = Array.from({ length: INTERVALOS - 1 }, (_, i) => q.espessuraDaBocaA + (livre * (i + 1)) / INTERVALOS);
  return [0, q.espessuraDaBocaA, ...meio, q.comprimento - q.espessuraDaBocaB, q.comprimento];
}

/** A seção (contorno em x e z, anti-horário) na posição y do eixo. */
export function contornoEm(q, y) {
  const livre = q.comprimento - q.espessuraDaBocaA - q.espessuraDaBocaB;
  const z = FRACAO_DA_TRANSICAO * livre;
  const eA = 1 - suave((y - q.espessuraDaBocaA) / z);
  const eB = 1 - suave((q.comprimento - q.espessuraDaBocaB - y) / z);
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

/** As seções do `loft` do elo, em milímetro, sem polo (as duas bocas abertas). */
export function secoesDoElo(q) {
  return estacoes(q).map((y) => ({ pos: [0, y, 0], contorno: contornoEm(q, y) }));
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
