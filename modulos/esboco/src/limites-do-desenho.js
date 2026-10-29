/* Os limites que decidem o que é aresta no desenho de linhas: o desenho da blocagem (`desenho-da-blocagem.js`), os traços da camada
   do desenho das formas (`tracos-da-camada.js`) e a medida do desenho (`medida-do-desenho.js`) usam os mesmos, de modo que a regra é uma só. */

/* o cosseno de 30 graus: duas faces vizinhas com normais mais afastadas que isso formam um vinco */
export const COSSENO_DO_VINCO = Math.cos(Math.PI / 6);
/* O vinco é acima de 30 graus, e o ângulo de exatamente 30 não é: o polígono de doze lados tem 30 graus entre faces vizinhas, e o
   arredondamento da conta decidia ao acaso quais das doze arestas do furo ou do tubo saíam traçadas (riscos curtos num lado e nada no
   outro). A folga, de 0,02 grau, põe o empate do lado de não traçar, e a ferramenta que mede o desenho a usa na referência. */
export const FOLGA_DO_VINCO = 2e-4;
/* Uma superfície só vale como outra, e a linha entre elas como aresta, quando a profundidade dos dois planos no ponto da linha difere de
   mais que isto (mm ao longo do olho): é o degrau da oclusão. Abaixo dele a emenda de duas peças no mesmo plano não aparece, e o degrau de
   uma peça embutida a um décimo de milímetro, sim. A medida do desenho usa o mesmo número. */
export const DEGRAU_DE_PROFUNDIDADE = 0.05;
/* A distância da linha às duas amostras de superfície que decidem se ela é aresta, em fração da maior extensão do desenho: perto o bastante
   para a amostra ainda estar na superfície que a linha divide (a faixa junto às pontas da linha, onde uma das amostras cai fora das faces,
   passa a ser de uma fração de pixel), longe o bastante do arredondamento das coordenadas. */
export const ESPACO_DAS_AMOSTRAS = 2e-5;
