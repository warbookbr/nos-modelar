/* geometria.js — o trilho e o carro da guia linear, em milímetro.

   O trilho vai ao longo de y, de 0 ao comprimento, com a base em z = 0 e centrado em x. A seção é o retângulo com o canal
   das esferas em cada lado (de 0,55 a 0,75 da altura, fundo de 0,1 da largura), e os furos com rebaixo de cima para baixo
   a cada passo, centrados no comprimento, por `arranja` linear. O carro é o U invertido que monta sobre o trilho, da folga
   de baixo até a altura de montagem, com o vão de 1 mm de cada lado do trilho e o fundo do vão no topo do trilho, onde os
   dois se apoiam; quatro furos roscados (o diâmetro da broca, 0,85 da rosca, com 1,5 rosca de fundo) na face de cima. */

export const FOLGA_LATERAL = 1;

export function geometriaDaGuia(q) {
  const W = q.larguraDoTrilho; const H = q.alturaDoTrilho; const L = q.comprimento;
  const z1 = 0.55 * H; const z2 = 0.75 * H; const d = 0.1 * W;
  const trilho = [[-W / 2, 0], [W / 2, 0], [W / 2, z1], [W / 2 - d, z1], [W / 2 - d, z2], [W / 2, z2], [W / 2, H], [-W / 2, H], [-W / 2, z2], [-W / 2 + d, z2], [-W / 2 + d, z1], [-W / 2, z1]];
  const furos = Math.floor((L - q.diametroDoRebaixo) / q.passo) + 1;
  const primeiro = (L - (furos - 1) * q.passo) / 2;
  const subida = H - q.profundidadeDoRebaixo;
  const furo = [[0, -1], [q.diametroDoFuro / 2, -1], [q.diametroDoFuro / 2, subida], [q.diametroDoRebaixo / 2, subida], [q.diametroDoRebaixo / 2, H + 1], [0, H + 1]];
  const Wc = q.larguraDoCarro; const Hm = q.alturaDeMontagem; const h1 = q.folgaDeBaixo; const v = W / 2 + FOLGA_LATERAL;
  const carro = [[-Wc / 2, h1], [-v, h1], [-v, H], [v, H], [v, h1], [Wc / 2, h1], [Wc / 2, Hm], [-Wc / 2, Hm]];
  const Lc = q.comprimentoDoCarro; const y0 = q.posicaoDoCarro;
  const fundo = 1.5 * q.rosca; const rb = 0.425 * q.rosca;
  const roscado = [[0, 0], [rb, 0], [rb, fundo + 1], [0, fundo + 1]];
  const centrosDoCarro = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => [sx * q.furosDoCarroX / 2, y0 + Lc / 2 + sy * q.furosDoCarroY / 2, Hm - fundo]);
  return { trilho, furo, furos, primeiro, carro, roscado, centrosDoCarro, comprimentoDoCarro: Lc, posicaoDoCarro: y0 };
}
