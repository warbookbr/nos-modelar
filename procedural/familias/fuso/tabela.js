/* tabela.js — os fusos, em milímetro.

   Trapezoidal métrico pela ISO 2904 (perfil de 30°, diâmetro nominal d e passo P da série preferida): a altura do filete é
   h3 = P/2 + ac, com a folga de crista ac de 0,25 mm para passo de 2 a 5 e 0,5 mm para passo de 6 a 12, e o diâmetro menor
   é d3 = d − 2 h3. De esferas pelos diâmetros nominais e passos da ISO 3408-2 (16×5, 20×5, 25×5, 25×10, 32×5, 32×10 e
   40×10), só com o volume de fora (decisão da pessoa em 2026-11-24). A castanha flangeada não tem medida pública de norma e
   segue regra da família (`geometria.js`).

   FICHA parametrosDoFuso
   serve: os parâmetros da família `fuso` pelo nome: o trapezoidal da ISO 2904 (Tr10x2 a Tr40x7) ou o de esferas da ISO
     3408-2 (16x5 a 40x10, só o volume de fora), com a castanha flangeada numa posição.
   quando: acionamento de mesa, carro ou eixo linear por fuso.
   unidades: mm.
   campos:
     nome: 'Tr20x4' ou '25x10'.
     comprimento: o comprimento do fuso.
     posicaoDaCastanha: o começo da castanha (a face do flange) ao longo do fuso.
   devolve: os parâmetros completos da família; o eixo é y, de 0 ao comprimento, e as portas `ponta` e `flange`.
   exemplo:
     chamar(registro.obter('fuso'), 'fuso', parametrosDoFuso('Tr20x4', { comprimento: 400, posicaoDaCastanha: 150 }))
   peça: tools/fixtures/elementos-de-maquina/mesa-linear.mjs (o fuso Tr10x2 que move a mesa).
   FIM DA FICHA */

export const TRAPEZOIDAIS = Object.freeze(Object.fromEntries([[10, 2], [12, 3], [14, 3], [16, 4], [20, 4], [24, 5], [28, 5], [32, 6], [36, 6], [40, 7]].map(([d, P]) => [`Tr${d}x${P}`, Object.freeze({ diametro: d, passo: P })])));
export const DE_ESFERAS = Object.freeze(Object.fromEntries([[16, 5], [20, 5], [25, 5], [25, 10], [32, 5], [32, 10], [40, 10]].map(([d, P]) => [`${d}x${P}`, Object.freeze({ diametro: d, passo: P })])));

export const folgaDeCrista = (P) => (P <= 1.5 ? 0.15 : P <= 5 ? 0.25 : 0.5);

/** Os parâmetros da família pelo nome ('Tr20x4' ou '25x10'), com o comprimento e a posição da castanha; recusa o que não existe. */
export function parametrosDoFuso(nome, { comprimento, posicaoDaCastanha = 0 } = {}) {
  const tr = TRAPEZOIDAIS[nome]; const esf = DE_ESFERAS[nome];
  if (!tr && !esf) throw new Error(`fuso: '${nome}' não existe; aceitos: ${[...Object.keys(TRAPEZOIDAIS), ...Object.keys(DE_ESFERAS)].join(', ')}`);
  const { diametro, passo } = tr ?? esf;
  return { tipo: tr ? 1 : 2, diametro, passo, comprimento, posicaoDaCastanha };
}
