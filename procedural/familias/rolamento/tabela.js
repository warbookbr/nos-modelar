/* tabela.js — o rolamento rígido de uma carreira de esferas das séries 60 e 62, em milímetro: furo d, diâmetro externo D,
   largura B e chanfro mínimo r.

   As medidas de contorno são as da ISO 15, lidas no extrato público da JIS B 1512 que a Miki Pulley publica ("Ball Bearing
   Standard Dimensions Table — Excerpt from JIS"); o 6200, que o extrato não traz, foi conferido nas fichas abertas de dois
   fabricantes. O 6009, o 6207 e o 6209 ficam fora, porque o extrato não os traz. O número e o diâmetro das esferas não são
   de norma e seguem regra da família (`geometria.js`).

   FICHA parametrosDoRolamento
   serve: os parâmetros da família `rolamento` pela designação (séries 60 e 62 da ISO 15): o rolamento aberto, vedado ou
     alojado no mancal de pedestal.
   quando: apoio de eixo de máquina, polia, roda ou fuso.
   unidades: mm.
   campos:
     designacao: '6000' a '6010' ou '6200' a '6210' (sem 6009, 6207 e 6209).
     forma: 1 aberto, 2 vedado, 3 no mancal.
   devolve: os parâmetros completos da família; o eixo é y, de 0 à largura, e as portas `furo` e `apoio`.
   exemplo:
     parametrosDoRolamento(6204, 3)
   peça: tools/fixtures/elementos-de-maquina/mesa-linear.mjs (os dois mancais 6000 do fuso).
   FIM DA FICHA */

const r = (d, D, B, chanfro) => Object.freeze({ d, D, B, chanfro });
export const ROLAMENTOS = Object.freeze({
  6000: r(10, 26, 8, 0.3), 6001: r(12, 28, 8, 0.3), 6002: r(15, 32, 9, 0.3), 6003: r(17, 35, 10, 0.3), 6004: r(20, 42, 12, 0.6),
  6005: r(25, 47, 12, 0.6), 6006: r(30, 55, 13, 1), 6007: r(35, 62, 14, 1), 6008: r(40, 68, 15, 1), 6010: r(50, 80, 16, 1),
  6200: r(10, 30, 9, 0.6), 6201: r(12, 32, 10, 0.6), 6202: r(15, 35, 11, 0.6), 6203: r(17, 40, 12, 0.6), 6204: r(20, 47, 14, 1),
  6205: r(25, 52, 15, 1), 6206: r(30, 62, 16, 1), 6208: r(40, 80, 18, 1.1), 6210: r(50, 90, 20, 1.1),
});

/** Os parâmetros da família pela designação ('6204'), com a forma (1 aberto, 2 vedado, 3 no mancal); recusa a que não existe. */
export function parametrosDoRolamento(designacao, forma = 1) {
  const b = ROLAMENTOS[String(designacao)];
  if (!b) throw new Error(`rolamento: '${designacao}' não existe; aceitos: ${Object.keys(ROLAMENTOS).join(', ')}`);
  return { forma, furo: b.d, diametroExterno: b.D, largura: b.B, chanfro: b.chanfro };
}
