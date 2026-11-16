/* visoes-da-captura.js — os ids das visões de inspeção da bancada e os controles que a captura por comando regula em cada
   uma. Mora fora de src/bancada/ porque a captura (tools/modelar/olhar-bancada.mjs) roda sem navegador e não pode importar a
   bancada; o registro das visões (src/bancada/visoes/registro-de-visoes.js) lê esta lista e o teste dele confere que os dois
   dizem o mesmo. */
export const CONTROLES_DA_CAPTURA = Object.freeze({
  solida: Object.freeze([]),
  arame: Object.freeze([]),
  'raio-x': Object.freeze([]),
  curvatura: Object.freeze([]),
  zebra: Object.freeze(['larguraDaZebra']),
  'luz-rasante': Object.freeze(['azimute']),
  pintura: Object.freeze(['larguraDaPintura']),
});
export const IDS_DAS_VISOES_DA_CAPTURA = Object.freeze(Object.keys(CONTROLES_DA_CAPTURA));
