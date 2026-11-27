/* plano.js — dos parâmetros do cabo (milímetro, graus) ao plano do tubo: as estações, as normais, as faces e as medidas.

   A ordem: o comprimento pedido (ou a folga sobre a distância reta), a haste de menor energia (`curva.js`) com o comprimento da
   curva lisa acertado a 0,02%, o raio de dobra e o autocontato medidos na curva, as estações pelo desvio máximo da corda
   (`caminho.js`) e as faces pelo número de lados. Cada recusa é um `ErroChamadaDeFamilia` com a restrição que a nomeia, o valor
   recebido e o aceito. A mesma entrada dá a mesma saída; o resultado fica na memória do processo, porque o `derivar` e as medidas
   o pedem os dois. */
import { ErroChamadaDeFamilia } from '../../../src/autoria/chamar-familia.js';
import { ErroDaCurva, nosDaHaste, resolverElastica } from './curva.js';
import { criarCaminho, distanciaDeAutocontato, estacoesDoCaminho, quadroSemTorcao, trechoMaximoDoTubo, ESCADA_DE_ESTACOES } from './caminho.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unitario = (a) => { const n = norma(a); return [a[0] / n, a[1] / n, a[2] / n]; };
const mm = (x) => `${Number(x.toPrecision(4))} mm`;

export const TOLERANCIA_DO_COMPRIMENTO = 0.005;
const PRECISAO_DA_CURVA = 2e-4;

const recusar = (restricao, campo, valor, aceito, motivo) => { throw new ErroChamadaDeFamilia({ familia: 'cabo', campo, valor, aceito, restricao, motivo }); };

/** O número de faces do tubo fechado: um quadrilátero por lado e trecho, e os lados − 2 triângulos de cada tampa. */
export const facesDoTubo = (lados, estacoes) => lados * (estacoes - 1) + 2 * (lados - 2);

const MEMORIA = new Map();
const LIMITE_DA_MEMORIA = 24;

/** Esquece os planos guardados: a prova de determinismo refaz a conta do zero. */
export const esquecerPlanos = () => MEMORIA.clear();

/** As duas pontas e o comprimento pedidos, lidos dos parâmetros. */
export function pontasDosParametros(p) {
  const A = [p.ax, p.ay, p.az];
  const B = [p.ax + p.dx, p.ay + p.dy, p.az + p.dz];
  const D = norma(sub(B, A));
  const L = p.comprimento > 0 ? p.comprimento : D * (1 + p.folga);
  return { A, B, dA: unitario([p.adx, p.ady, p.adz]), dB: unitario([p.bdx, p.bdy, p.bdz]), D, L };
}

function haste(entrada, L, nos) {
  let partida = null; let Lr = L; let resultado = null;
  for (let passo = 0; passo < 5; passo += 1) {
    const r = resolverElastica({ ...entrada, L: Lr, nos, partida });
    if (r.violacao > 1e-8) return { r, caminho: null };
    const caminho = criarCaminho({ nos: r.nos, dA: entrada.dA, dB: entrada.dB });
    resultado = { r, caminho };
    if (Math.abs(caminho.comprimento / L - 1) < PRECISAO_DA_CURVA) break;
    Lr *= L / caminho.comprimento; partida = r.nos;
  }
  return resultado;
}

/* O menor comprimento, entre alguns múltiplos da distância reta, em que a haste existe, para dizer na recusa. */
function comprimentoViavel(entrada, D, nos) {
  for (const f of [1.05, 1.1, 1.2, 1.35, 1.5, 1.75, 2, 2.5, 3, 4, 6]) {
    try { const { caminho } = haste(entrada, D * f, nosDaHaste(D * f, entrada.diametro)) ?? {}; if (caminho) return D * f; } catch { /* tenta o próximo */ }
  }
  return null;
}

/** O plano do cabo. */
export function planejar(parametros) {
  const chave = JSON.stringify(parametros);
  if (MEMORIA.has(chave)) return MEMORIA.get(chave);
  const p = parametros;
  const { A, B, dA, dB, D, L } = pontasDosParametros(p);
  const d = p.diametro; const raio = d / 2;
  const rMinimo = p.raioMinimo * d;
  const entrada = { A, B, dA, dB, caimento: p.caimento, diametro: d };
  const nos = nosDaHaste(L, d);

  let feito = null;
  try { feito = haste(entrada, L, nos); } catch (erro) { if (!(erro instanceof ErroDaCurva)) throw erro; }
  if (!feito || !feito.caminho) {
    const viavel = comprimentoViavel(entrada, D, nos);
    recusar('comprimento-chega', 'comprimento', Number(L.toPrecision(5)),
      `um comprimento que a curva de menor energia alcança saindo de cada ponta na direção pedida${viavel ? `, a partir de cerca de ${mm(viavel)}` : ''}; a distância reta entre as pontas é ${mm(D)}`,
      'o cabo não chega de uma ponta à outra com esse comprimento e essas direções de saída: aumente o comprimento ou a folga, ou vire as pontas uma para a outra');
  }
  const { r, caminho } = feito;

  if (caminho.raioMinimo < rMinimo * (1 - 1e-9)) {
    recusar('raio-minimo-cabe', 'raioMinimo', Number(caminho.raioMinimo.toPrecision(4)),
      `uma curva cujo menor raio de dobra seja ao menos ${mm(rMinimo)} (${p.raioMinimo} diâmetros); a curva de menor energia com esse comprimento e essas direções dobra até ${mm(caminho.raioMinimo)}`,
      'o raio mínimo não cabe: aumente o comprimento ou a folga, afaste as pontas, vire as direções de saída ou reduza raioMinimo');
  }
  const contato = distanciaDeAutocontato(caminho, 2 * d);
  if (contato < d) {
    recusar('sem-autocontato', 'diametro', d,
      `um cabo que não encoste em si mesmo: dois trechos do cabo ficam a ${mm(contato)} um do outro, menos que o diâmetro`,
      'o cabo atravessa a si mesmo: aumente o afastamento entre as pontas, mude as direções de saída ou reduza o comprimento');
  }

  const maximo = trechoMaximoDoTubo(raio, p.lados);
  const e = estacoesDoCaminho(caminho, { desvio: p.desvioMaximo, maximo });
  if (!e) {
    recusar('desvio-da-corda', 'desvioMaximo', p.desvioMaximo,
      `um desvio que o cabo cumpra com até ${ESCADA_DE_ESTACOES.at(-1)} estações; esse pede mais`,
      'aumente desvioMaximo ou reduza o comprimento do cabo');
  }
  const faces = facesDoTubo(p.lados, e.estacoes);
  if (p.orcamentoDeFaces > 0 && faces > p.orcamentoDeFaces) {
    recusar('orcamento-de-faces', 'orcamentoDeFaces', p.orcamentoDeFaces,
      `ao menos ${faces} faces (0 é sem orçamento): o desvio de ${p.desvioMaximo} mm com ${p.lados} lados pede ${e.estacoes - 1} trechos e daria ${faces} faces`,
      'aumente orcamentoDeFaces, aumente desvioMaximo ou reduza os lados');
  }
  const deficit = (L - e.comprimentoDaMalha) / L;
  if (deficit > TOLERANCIA_DO_COMPRIMENTO) {
    recusar('comprimento-da-malha', 'desvioMaximo', p.desvioMaximo,
      `um desvio com que a malha fique a menos de ${TOLERANCIA_DO_COMPRIMENTO * 100}% do comprimento pedido; com ${p.desvioMaximo} mm ela fica ${(deficit * 100).toFixed(2)}% mais curta`,
      'reduza desvioMaximo');
  }
  const tangentes = e.pontos.map((q) => q.t);
  const normais = quadroSemTorcao(tangentes);
  const plano = Object.freeze({
    pontos: e.pontos.map((q) => q.p), normais, estacoes: e.estacoes, lados: p.lados, faces, triangulos: 2 * p.lados * (e.estacoes - 1) + 2 * (p.lados - 2),
    comprimentoPedido: L, comprimentoDaCurva: caminho.comprimento, comprimentoDaMalha: e.comprimentoDaMalha, raioMinimo: caminho.raioMinimo,
    desvioDaCorda: e.desvio, distanciaDeAutocontato: contato, iteracoes: r.iteracoes, nosDaHaste: r.M, energia: r.energia,
    trechoA: caminho.trechoA, trechoB: caminho.trechoB, A, B, dA, dB, raio,
  });
  if (MEMORIA.size >= LIMITE_DA_MEMORIA) MEMORIA.delete(MEMORIA.keys().next().value);
  MEMORIA.set(chave, plano);
  return plano;
}
