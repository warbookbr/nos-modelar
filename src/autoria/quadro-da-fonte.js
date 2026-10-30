/* quadro-da-fonte.js — as quatro câmeras da folha de vistas de uma fonte (`fonte-vistas.png`), num lugar só para a ferramenta que a desenha e a bancada que a mostra.
 *
 * `tools/modelar/modelo-de-referencia.mjs` desenha a folha com estas câmeras ortográficas e a folha comparativa
 * rasteriza a receita com elas; a bancada, no tema Revisão, põe a câmera da peça na câmera de um quadro da folha para a
 * peça e a referência ficarem na mesma escala, lado a lado ou uma sobre a outra. Duas cópias destes números divergiriam
 * em silêncio, e a peça sairia deslocada da referência sem nada acusar.
 *
 * O módulo é puro: não conhece o disco, a página nem o three.js. */

/** As quatro câmeras da folha, na ordem dos quadros (esquerda para a direita, de cima para baixo): o rótulo, a posição relativa ao centro (a câmera olha para o centro) e o vetor para cima. */
export const VISTAS_DA_FONTE = [['isométrica frente-direita', [1, 0.7, 1.2], [0, 1, 0]], ['lateral direita (frente à esquerda)', [1, 0, 0], [0, 1, 0]], ['frontal (de frente)', [0, 0, 1], [0, 1, 0]], ['de cima (frente embaixo)', [0, 1, 0], [0, 0, -1]]];
/** O quadro de cada vista em `vistas.png`, em pixel: 640 por 480, no canto (coluna, linha) da folha de 1280 por 960. */
export const QUADRO_DA_FONTE = { W: 640, H: 480, folga: 1.1 };
/** O centro da caixa e o raio (metade da diagonal) com que as câmeras ortográficas da fonte enquadram: a meia altura visível é `raio * folga`. Entrada: o campo `total` do `partes.json`, em metro. */
export function enquadramentoDaFonte(total) {
  const t = total.tamanho;
  return { centro: [0, 1, 2].map((i) => (total.minimo[i] + total.maximo[i]) / 2), raio: Math.hypot(...t) / 2 };
}
