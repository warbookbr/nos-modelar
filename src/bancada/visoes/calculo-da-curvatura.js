/* calculo-da-curvatura.js — a conta da curvatura da lataria da peça na bancada, como a das vistas obrigatórias do pacote do
 * crítico, fora do quadro da cena.
 *
 * A conta é a de `curvaturaDaLataria` (src/autoria/curvatura-da-lataria.js) sobre os triângulos do estado neutro (`malhaDoNeutro`),
 * com as partes de lataria e os vincos que `fonte-da-curvatura.js` tira da receita. A peça que não é de lataria, ou cuja lista não
 * acha mais face nenhuma depois de uma edição, tem a curvatura da peça inteira, e a saída diz isso em `semLataria`.
 *
 * A conta roda num trabalhador (`curvatura.worker.js`) ou, sem ele, logo depois do quadro, e recebe o estado neutro empacotado em
 * vetores (`empacotarNeutro`), que passam ao trabalhador sem cópia. Os vincos chegam pelos ids dos vértices nas pontas, que a edição
 * de junta e a de malha não mudam: depois de cada edição a faixa sai das posições da malha editada.
 *
 * Este módulo importa só a conta da curvatura, que não puxa o núcleo procedural: o núcleo carrega a Manifold com `await` no topo
 * do módulo, e o pacote do trabalhador não aceita isso (a construção falhou assim em 2026-10-30). Nada aqui conhece o Three nem o
 * DOM. */
import { curvaturaDaLataria, malhaDoNeutro } from '../../autoria/curvatura-da-lataria.js';

/**
 * O estado neutro (`V`, `F`) em vetores, para ir ao trabalhador sem cópia: os ids e as posições dos vértices, e de cada face o id,
 * a quantidade de cantos, os ids dos cantos e o índice da parte em `partes`. `buffers` são os que se transferem.
 */
export function empacotarNeutro(neutro) {
  const nV = neutro.V.size;
  const idsV = new Float64Array(nV);
  const P = new Float64Array(3 * nV);
  let i = 0;
  for (const [id, p] of neutro.V) {
    idsV[i] = id; P[3 * i] = p[0]; P[3 * i + 1] = p[1]; P[3 * i + 2] = p[2];
    i++;
  }
  const nF = neutro.F.size;
  const idsF = new Float64Array(nF);
  const cantos = new Uint32Array(nF);
  const parteDaFace = new Int32Array(nF);
  const partes = [];
  const indiceDaParte = new Map();
  let total = 0;
  for (const face of neutro.F.values()) total += face.vs.length;
  const vs = new Float64Array(total);
  let f = 0;
  let k = 0;
  for (const [id, face] of neutro.F) {
    idsF[f] = face.id ?? id;
    cantos[f] = face.vs.length;
    for (const v of face.vs) vs[k++] = v;
    const parte = typeof face.parte === 'string' ? face.parte : null;
    if (parte === null) parteDaFace[f] = -1;
    else {
      if (!indiceDaParte.has(parte)) { indiceDaParte.set(parte, partes.length); partes.push(parte); }
      parteDaFace[f] = indiceDaParte.get(parte);
    }
    f++;
  }
  return { idsV, P, idsF, cantos, vs, parteDaFace, partes, buffers: [idsV.buffer, P.buffer, idsF.buffer, cantos.buffer, vs.buffer, parteDaFace.buffer] };
}

/** O estado neutro (`V`, `F`) de volta dos vetores de `empacotarNeutro`, com o que `malhaDoNeutro` e `vincosDaMalha` leem. */
export function desempacotarNeutro({ idsV, P, idsF, cantos, vs, parteDaFace, partes }) {
  const V = new Map();
  for (let i = 0; i < idsV.length; i++) V.set(idsV[i], [P[3 * i], P[3 * i + 1], P[3 * i + 2]]);
  const F = new Map();
  let k = 0;
  for (let f = 0; f < idsF.length; f++) {
    const n = cantos[f];
    const face = { id: idsF[f], vs: Array.from(vs.subarray(k, k + n)) };
    if (parteDaFace[f] >= 0) face.parte = partes[parteDaFace[f]];
    F.set(idsF[f], face);
    k += n;
  }
  return { V, F };
}

/**
 * Uma impressão barata das posições do estado neutro, para saber se uma edição mudou a malha desde a última conta: a soma das
 * coordenadas pesadas pela ordem, com a quantidade de vértices e de faces. Malhas diferentes podem colidir, o que só deixa de
 * refazer uma conta; a mesma malha dá sempre o mesmo número.
 */
export function impressaoDoNeutro(neutro) {
  let soma = 0;
  let k = 0;
  for (const p of neutro.V.values()) {
    const w = (k % 97) + 1;
    soma += w * (p[0] * 1.618033 + p[1] * 2.718281 + p[2] * 3.141592);
    k++;
  }
  return `${neutro.V.size}:${neutro.F.size}:${soma}`;
}

/**
 * A calculadora. `calcular({ vincos, lataria, neutro })`, com `vincos` os de `fonteDaCurvatura` (`{ pontas, nomes }`), devolve, por vértice
 * do estado neutro, os ids (`ids`, na ordem de `malhaDoNeutro`) e as cores (`cores`, RGB de 0 a 1, as de `curvaturaDaLataria`), e
 * da peça a `escala` (1/m), a `faixa` (m, ou null), os `vincos` citados, as `contagens`, `semLataria` e o tempo da conta.
 */
export function criarCalculadoraDaCurvatura({ agora = () => performance.now() } = {}) {
  return function calcular({ vincos: fonteDosVincos = null, lataria, neutro }) {
    const inicio = agora();
    const segmentos = [];
    for (const [a, b] of fonteDosVincos?.pontas ?? []) {
      const p = neutro.V.get(a);
      const q = neutro.V.get(b);
      if (p && q) segmentos.push([p, q]);
    }
    const vincos = segmentos.length ? [{ segmentos }] : [];
    const malha = malhaDoNeutro(neutro);
    let semLataria = !lataria;
    let r;
    try {
      r = curvaturaDaLataria({ ...malha, lataria, vincos });
    } catch (erro) {
      if (!lataria || !/nenhuma lataria/.test(erro.message)) throw erro;
      r = curvaturaDaLataria({ ...malha, vincos });
      semLataria = true;
    }
    return {
      ids: Float64Array.from(malha.ids),
      cores: r.cores,
      escala: r.escala,
      faixa: r.faixa,
      vincos: segmentos.length ? fonteDosVincos.nomes : [],
      contagens: r.contagens,
      semLataria,
      tempoMs: agora() - inicio,
    };
  };
}
