/* tabela.js — os atuadores de junta cilíndricos, por diâmetro da carcaça, em milímetro. Não há norma pública de atuador de
   robô; os tamanhos são regra da família (decisão da pessoa em 2026-11-25: 40, 60, 80, 100 e 120 mm), na proporção dos
   atuadores de mercado, sem marca. Cada tamanho dá o comprimento da carcaça, a flange de fixação de trás (diâmetro,
   espessura, círculo, furos e diâmetro do furo), a flange de saída da frente (as mesmas medidas, com o furo cego para
   parafuso), o diâmetro da saída do cabo e o chanfro das bordas. */

const atuador = (diametro, comprimento, flange, saida, furo, furoDaSaida, furos, cabo) => Object.freeze({
  diametro, comprimento,
  diametroDoFlange: flange, espessuraDoFlange: Math.round(0.08 * diametro + 2), circuloDoFlange: (flange + diametro) / 2, furosDoFlange: furos, diametroDoFuroDoFlange: furo,
  diametroDaSaida: saida, espessuraDaSaida: Math.round(0.06 * diametro + 2), circuloDaSaida: 0.7 * saida, furosDaSaida: furos, diametroDoFuroDaSaida: furoDaSaida,
  diametroDoCabo: cabo, chanfro: Math.round(0.03 * diametro * 10) / 10,
});
export const ATUADORES = Object.freeze({
  40: atuador(40, 32, 52, 26, 3.4, 2.5, 4, 6),
  60: atuador(60, 45, 76, 38, 3.4, 2.5, 6, 8),
  80: atuador(80, 55, 100, 50, 4.5, 3.3, 8, 10),
  100: atuador(100, 65, 124, 62, 5.5, 4.2, 8, 12),
  120: atuador(120, 75, 148, 74, 6.6, 5, 12, 14),
});

/** Os parâmetros da família pelo diâmetro do atuador cilíndrico; recusa o tamanho que não existe. */
export function parametrosDoAtuador(diametro) {
  const a = ATUADORES[String(diametro)];
  if (!a) throw new Error(`atuador de junta: o diâmetro ${diametro} não existe; aceitos: ${Object.keys(ATUADORES).join(', ')}`);
  return { ...a };
}
