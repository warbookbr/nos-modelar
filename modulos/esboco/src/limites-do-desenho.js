/* Os limites que decidem o que é aresta no desenho de linhas: o desenho da blocagem (`desenho-da-blocagem.js`), os traços da camada
   do desenho das formas (`tracos-da-camada.js`) e a medida do desenho (`medida-do-desenho.js`) usam os mesmos, de modo que a regra é uma só. */

/* o cosseno de 30 graus: duas faces vizinhas com normais mais afastadas que isso formam um vinco */
export const COSSENO_DO_VINCO = Math.cos(Math.PI / 6);
/* O vinco é de 30 graus ou mais, e o ângulo de exatamente 30 entra: o polígono de doze lados tem 30 graus entre faces vizinhas, e o
   prisma de doze lados é facetado de verdade, que o desenho tem de mostrar (decisão da pessoa em 2026-10-29, sobre o tubo facetado da
   calibração do crítico). Sem folga, o arredondamento da conta decidia ao acaso quais das doze arestas saíam traçadas; a folga, de 0,02
   grau, negativa porque o limite é `COSSENO_DO_VINCO - FOLGA_DO_VINCO`, põe o empate do lado de traçar, e a ferramenta que mede o desenho
   a usa na referência. Um tubo liso do acervo tem mais lados e vincos bem abaixo de 30 graus. */
export const FOLGA_DO_VINCO = -2e-4;
/* Uma superfície só vale como outra, e a linha entre elas como aresta, quando a profundidade dos dois planos no ponto da linha difere de
   mais que isto (mm ao longo do olho): é o degrau da oclusão. Abaixo dele a emenda de duas peças no mesmo plano não aparece, e o degrau de
   uma peça embutida a um décimo de milímetro, sim. A medida do desenho usa o mesmo número. */
export const DEGRAU_DE_PROFUNDIDADE = 0.05;
/* A distância da linha às duas amostras de superfície que decidem se ela é aresta, em fração da maior extensão do desenho: perto o bastante
   para a amostra ainda estar na superfície que a linha divide (a faixa junto às pontas da linha, onde uma das amostras cai fora das faces,
   passa a ser de uma fração de pixel), longe o bastante do arredondamento das coordenadas. */
export const ESPACO_DAS_AMOSTRAS = 2e-5;
