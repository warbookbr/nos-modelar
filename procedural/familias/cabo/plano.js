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
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
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

/** As passagens dos parâmetros: o ponto de cada uma (medido do ponto anterior do percurso) e a direção unitária em que o cabo passa. */
export function passagensDosParametros(p) {
  const lista = []; let anterior = [p.ax, p.ay, p.az];
  for (let k = 1; k <= p.passagens; k += 1) {
    const P = soma(anterior, [p[`p${k}x`], p[`p${k}y`], p[`p${k}z`]]);
    lista.push({ P, d: unitario([p[`p${k}dx`], p[`p${k}dy`], p[`p${k}dz`]]) });
    anterior = P;
  }
  return lista;
}

/** As duas pontas, as passagens e o comprimento pedidos, lidos dos parâmetros. `D` é a distância reta entre as pontas e `cadeia` o caminho reto por todas as passagens (igual a `D` sem elas); sem comprimento, a folga conta sobre a cadeia. */
export function pontasDosParametros(p) {
  const A = [p.ax, p.ay, p.az];
  const B = [p.ax + p.dx, p.ay + p.dy, p.az + p.dz];
  const D = norma(sub(B, A));
  const passagens = passagensDosParametros(p);
  let cadeia = D;
  if (passagens.length) { const pontos = [A, ...passagens.map((q) => q.P), B]; cadeia = 0; for (let i = 1; i < pontos.length; i += 1) cadeia += norma(sub(pontos[i], pontos[i - 1])); }
  const L = p.comprimento > 0 ? p.comprimento : cadeia * (1 + p.folga);
  return { A, B, dA: unitario([p.adx, p.ady, p.adz]), dB: unitario([p.bdx, p.bdy, p.bdz]), D, L, passagens, cadeia };
}

/* As pernas do percurso: de cada ponto ao seguinte, com a direção de saída de cada ponta da perna. Numa passagem o cabo segue na direção dela, e a perna anterior a recebe de volta (a direção em que o cabo sai do ponto, para trás). */
function pernasDoPercurso({ A, B, dA, dB, passagens }) {
  const pontos = [A, ...passagens.map((q) => q.P), B];
  return pontos.slice(0, -1).map((inicio, i) => {
    const fim = pontos[i + 1];
    return { A: inicio, B: fim, dA: i === 0 ? dA : passagens[i - 1].d, dB: i === pontos.length - 2 ? dB : passagens[i].d.map((x) => -x), D: norma(sub(fim, inicio)) };
  });
}

/* O comprimento de cada perna: a distância reta dela mais a parte da sobra (o comprimento menos a cadeia reta) proporcional ao quanto as direções de saída e de chegada se desviam da corda,
   somando o quadrado dos dois ângulos e um piso. A perna cujas direções seguem a corda fica quase esticada, e a que precisa dobrar, ou voltar, fica com a folga. */
const PISO_DO_DESVIO = 0.05;
function repartirOComprimento(pernas, L) {
  const cadeia = pernas.reduce((s, q) => s + q.D, 0);
  const peso = pernas.map((q) => {
    const corda = unitario(sub(q.B, q.A));
    const angulo = (v) => Math.acos(Math.max(-1, Math.min(1, v[0] * corda[0] + v[1] * corda[1] + v[2] * corda[2])));
    const a = angulo(q.dA); const b = angulo(q.dB.map((x) => -x));
    return q.D * (a * a + b * b + PISO_DO_DESVIO);
  });
  const total = peso.reduce((s, x) => s + x, 0);
  return pernas.map((q, i) => q.D + ((L - cadeia) * peso[i]) / total);
}

/* A haste do cabo inteiro: uma elástica por perna, com o comprimento repartido pelas distâncias retas das pernas, e o caminho liso pelos nós de todas (a passagem é um nó
   de tangente fixa). O comprimento do caminho é acertado a 0,02% refazendo cada perna com o comprimento escalado. Com uma perna só é a conta de sempre. */
function haste(pernas, L, diametro, caimento, nosPorPerna = null) {
  let Lr = pernas.length === 1 ? [L] : repartirOComprimento(pernas, L);
  const nos = nosPorPerna ?? Lr.map((x) => nosDaHaste(x, diametro));
  let partida = pernas.map(() => null); let resultado = null;
  for (let passo = 0; passo < 5; passo += 1) {
    const rs = [];
    for (let i = 0; i < pernas.length; i += 1) {
      const q = pernas[i];
      const r = resolverElastica({ A: q.A, B: q.B, dA: q.dA, dB: q.dB, caimento, diametro, L: Lr[i], nos: nos[i], partida: partida[i] });
      if (r.violacao > 1e-8) return { r, caminho: null, perna: i };
      rs.push(r);
    }
    const juntos = rs.length === 1 ? rs[0].nos : rs.flatMap((r, i) => (i === 0 ? r.nos : r.nos.slice(1)));
    const caminho = criarCaminho({ nos: juntos, dA: pernas[0].dA, dB: pernas.at(-1).dB });
    const r = rs.length === 1 ? rs[0] : { iteracoes: rs.reduce((s, x) => s + x.iteracoes, 0), M: rs.reduce((s, x) => s + x.M, 0), energia: rs.reduce((s, x) => s + x.energia, 0), violacao: 0 };
    resultado = { r, caminho, perna: null };
    if (Math.abs(caminho.comprimento / L - 1) < PRECISAO_DA_CURVA) break;
    const f = L / caminho.comprimento; Lr = Lr.map((x) => x * f); partida = rs.map((x) => x.nos);
  }
  return resultado;
}

/* O menor comprimento do percurso inteiro, entre alguns múltiplos da cadeia reta, em que a haste existe, para dizer na recusa. */
function comprimentoViavel(pernas, cadeia, diametro, caimento) {
  for (const f of [1.05, 1.1, 1.2, 1.35, 1.5, 1.75, 2, 2.5, 3, 4, 6]) {
    try { const { caminho } = haste(pernas, cadeia * f, diametro, caimento) ?? {}; if (caminho) return cadeia * f; } catch { /* tenta o próximo */ }
  }
  return null;
}

/** O plano do cabo. */
export function planejar(parametros) {
  const chave = JSON.stringify(parametros);
  if (MEMORIA.has(chave)) return MEMORIA.get(chave);
  const p = parametros;
  const { A, B, dA, dB, D, L, passagens, cadeia } = pontasDosParametros(p);
  const d = p.diametro; const raio = d / 2;
  const rMinimo = p.raioMinimo * d;
  const pernas = pernasDoPercurso({ A, B, dA, dB, passagens });
  const comPassagens = passagens.length > 0;
  const trecho = (i) => `trecho ${i + 1} de ${pernas.length}, de ${pernas[i].A.map((x) => Number(x.toFixed(1))).join(', ')} a ${pernas[i].B.map((x) => Number(x.toFixed(1))).join(', ')}`;
  if (comPassagens) {
    pernas.forEach((q, i) => {
      if (q.D < d) recusar('passagens-distintas', i === pernas.length - 1 ? 'passagens' : `p${i + 1}x`, Number(q.D.toPrecision(4)),
        `pontos de passagem a ao menos um diâmetro (${mm(d)}) um do outro e das pontas; o ${trecho(i)} mede ${mm(q.D)}`, 'a passagem está sobre a ponta ou sobre a outra passagem: afaste os pontos');
    });
    if (p.comprimento > 0 && p.comprimento < cadeia) {
      recusar('comprimento-passa-dos-pontos', 'comprimento', p.comprimento, `um comprimento de ao menos ${mm(cadeia)}, o caminho reto passando pelos pontos (${passagens.length} passagem${passagens.length > 1 ? 's' : ''}); o pedido é ${mm(p.comprimento)}`,
        'um cabo não encurta: aumente o comprimento ou use a folga (comprimento 0), que conta sobre o caminho pelos pontos');
    }
  }

  let feito = null;
  try { feito = haste(pernas, L, d, p.caimento); } catch (erro) { if (!(erro instanceof ErroDaCurva)) throw erro; }
  if (!feito || !feito.caminho) {
    const viavel = comprimentoViavel(pernas, cadeia, d, p.caimento);
    recusar('comprimento-chega', 'comprimento', Number(L.toPrecision(5)),
      `um comprimento que a curva de menor energia alcança saindo de cada ponta${comPassagens ? ' e passando por cada ponto' : ''} na direção pedida${viavel ? `, a partir de cerca de ${mm(viavel)}` : ''}; a distância reta ${comPassagens ? 'pelos pontos' : 'entre as pontas'} é ${mm(cadeia)}${comPassagens && feito?.perna != null ? `, e o que não fecha é o ${trecho(feito.perna)}` : ''}`,
      `o cabo não chega ${comPassagens ? 'de um ponto ao seguinte' : 'de uma ponta à outra'} com esse comprimento e essas direções de saída: aumente o comprimento ou a folga, ou vire ${comPassagens ? 'as direções' : 'as pontas uma para a outra'}`);
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
    pontos: e.pontos.map((q) => q.p), normais, estacoes: e.estacoes, lados: p.lados, faces, triangulos: 2 * p.lados * (e.estacoes - 1) + 2 * (p.lados - 2), passagens,
    comprimentoPedido: L, comprimentoDaCurva: caminho.comprimento, comprimentoDaMalha: e.comprimentoDaMalha, raioMinimo: caminho.raioMinimo,
    desvioDaCorda: e.desvio, distanciaDeAutocontato: contato, iteracoes: r.iteracoes, nosDaHaste: r.M, energia: r.energia,
    trechoA: caminho.trechoA, trechoB: caminho.trechoB, A, B, dA, dB, raio,
  });
  if (MEMORIA.size >= LIMITE_DA_MEMORIA) MEMORIA.delete(MEMORIA.keys().next().value);
  MEMORIA.set(chave, plano);
  return plano;
}
