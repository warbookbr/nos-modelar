/* chapa.js — a chapa reta do elo entre juntas (`forma` 2), em milímetro: uma placa de espessura uniforme presa pela face às flanges das
   duas juntas, no lugar da carenagem oca.

   O QUADRO. A normal da chapa é o eixo y: a face de apoio, a das duas flanges, é y = 0 e a de trás é y = `espessuraDaChapa`. A boca A
   fica na origem, a boca B em z = `comprimento`, as duas com a normal da porta −y (as duas bocas olham para o mesmo lado) e o
   padrão de furos de cada uma no plano y = 0, centrado no eixo y da boca. O contorno, em x e z, é uma pista: duas pontas semicirculares
   de raio `larguraDaChapa` / 2 em volta de cada boca, unidas por retas.

   A FURAÇÃO. O furo 0 de cada boca fica meio passo fora do eixo x, como o do atuador e o do elo de carenagem. A porta mede o ângulo dos
   furos no quadro do plano dela (u = normalizado(normal × x)); com a normal −y o furo 0 em (cos π/n, sin π/n) tem o ângulo 180°/n − 90°,
   o mesmo da boca A do elo de carenagem. O furo de passagem, no centro da boca, tem o raio do anel do elo de carenagem (o círculo
   dos furos menos o furo menos a face de 2 mm) e só existe com `passagemDaChapa` 1, para a flange que pedir passagem (cabo, eixo oco). */
import { FACE_ENTRE_FUROS } from './geometria.js';

export const FORMA_DA_CHAPA = 2;
/** O furo de fixação fica a ao menos um diâmetro de furo da borda; a chapa engata o parafuso por ao menos um diâmetro dele. */
export const BORDA_EM_DIAMETROS = 1;
/** Segmentos por quarto de volta das pontas arredondadas. */
export const SEGMENTOS_DA_PONTA = 8;

export const ehChapa = (q) => (q.forma ?? 1) === FORMA_DA_CHAPA;

/** O furo 0 de uma boca (meio passo fora do eixo x, no plano y = 0 da boca), a contagem e o ângulo dele no quadro da porta de normal −y. */
export function furosDaBocaDaChapa(q, lado) {
  const n = q[`furosDaBoca${lado}`]; const r = q[`circuloDaBoca${lado}`] / 2; const a = Math.PI / n;
  return { em: [r * Math.cos(a), 0, r * Math.sin(a)], total: n, graus: 360 / n, anguloInicial: 180 / n - 90 };
}

/** O raio do furo de passagem de uma boca (o do anel do elo de carenagem). */
export const raioDaPassagem = (q, lado) => q[`circuloDaBoca${lado}`] / 2 - q[`diametroDoFuroDaBoca${lado}`] / 2 - FACE_ENTRE_FUROS;

/** A caixa da chapa em x e z, a espessura e o centro de cada boca. */
export function medidasDaChapa(q) {
  const r = q.larguraDaChapa / 2;
  return { raio: r, espessura: q.espessuraDaChapa, comprimento: q.comprimento, bocaA: [0, 0, 0], bocaB: [0, 0, q.comprimento], caixa: { x: [-r, r], y: [0, q.espessuraDaChapa], z: [-r, q.comprimento + r] } };
}
