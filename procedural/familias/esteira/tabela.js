/* tabela.js — a esteira de sapatas de aço, por passo, em milímetro. Não há norma pública de esteira de trator; os
   valores são regra da família, na proporção das esteiras de escavadeira e trator pequenos: o passo, o diâmetro da bucha,
   a largura entre os elos, a altura e a espessura do elo, a largura e a espessura da sapata, a altura da garra e os dentes
   da roda motriz (ímpar, como é usual).

   FICHA parametrosDaEsteira
   serve: os parâmetros da família `esteira` pelo passo: a esteira de sapatas de aço com garra em volta da roda motriz (dente
     da ISO 606) e da roda guia, com os roletes por baixo, numa chamada só.
   quando: trem de esteira de trator, escavadeira ou máquina de esteira, com a motriz e a guia do mesmo tamanho.
   unidades: mm.
   campos:
     passo: 101, 135 ou 171.
     distancia: a distância aproximada entre a motriz e a guia.
     roletes: o número de roletes (padrão 4).
   devolve: os parâmetros completos da família; a motriz fica no centro e a guia em x = distância exata, com o eixo em y.
   exemplo:
     parametrosDaEsteira(135, { distancia: 2200, roletes: 4 })
   peça: tools/fixtures/corrente-e-esteira/exportacao.test.mjs (a esteira de passo 135 com quatro roletes).
   FIM DA FICHA */

const esteira = (passo, diametroDaBucha, larguraInterna, alturaDoElo, espessuraDoElo, larguraDaSapata, espessuraDaSapata, alturaDaGarra, dentes) => Object.freeze({ passo, diametroDaBucha, larguraInterna, alturaDoElo, espessuraDoElo, larguraDaSapata, espessuraDaSapata, alturaDaGarra, dentes });
export const ESTEIRAS = Object.freeze({
  101: esteira(101.6, 40, 60, 50, 20, 300, 12, 20, 21),
  135: esteira(135, 50, 75, 65, 25, 400, 14, 26, 21),
  171: esteira(171, 60, 90, 80, 30, 500, 16, 32, 23),
});

/** Os parâmetros da família pelo passo, com a distância entre a motriz e a guia e o número de roletes; recusa o passo que não existe. */
export function parametrosDaEsteira(passo, { distancia, roletes = 4 } = {}) {
  const e = ESTEIRAS[String(passo)];
  if (!e) throw new Error(`esteira: o passo '${passo}' não existe; aceitos: ${Object.keys(ESTEIRAS).join(', ')}`);
  return { ...e, distancia, roletes };
}
