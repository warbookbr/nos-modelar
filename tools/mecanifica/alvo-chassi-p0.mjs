#!/usr/bin/env node
/* alvo-chassi-p0.mjs — o ALVO do P0 como dado, separado de quem desenha.

   Existe porque o alvo tinha um consumidor só, a prancha, e por isso nunca foi
   comparado com nada. O modelo do quarto dianteiro foi construído sem que o
   desenho de referência fosse aberto uma única vez, e o revisor visual recebeu
   sempre o render sozinho — a pergunta que ele podia responder era "isso parece
   um carro?", nunca "isso bate com o alvo?".

   Toda medida vem de docs/mecanifica/CHASSI-P0-ALVO-E-LIMIARES.md; se
   divergirem, o documento manda. */

export const zMin = -2335, zMax = 2265, yMax = 1190, xMax = 1000;
export const RD = { z: 1325, x: 830, raio: 340, arco: 385, larg: 245 };
export const RT = { z: -1325, x: 840, raio: 358, arco: 400, larg: 305 };

export const LANDMARKS = [
  ['L01', 0, 520, 2265], ['L02', 830, 340, 1325], ['L03', 840, 358, -1325],
  ['L04', 0, 980, 480], ['L05', 0, 1185, -180], ['L06', 0, 1190, -560],
  ['L07', 0, 1120, -1150], ['L08', 0, 1055, -1750], ['L09', 0, 920, -2335],
  ['L10', 930, 950, 0], ['L11', 925, 145, 0], ['L12', 1000, 850, -900],
  ['L13', 965, 900, 1325], ['L14', 830, 725, 1325], ['L15', 840, 758, -1325],
];

/* Curva mestra 1 — silhueta lateral superior, em x = 0.
   Traçada com filete e apenas nos landmarks: a versão anterior tinha pontos de
   forma intermediários e o relatório mediu 10 inversões de curvatura — ondulação,
   não abaulamento intencional. Os raios são grandes porque as quebras são rasas. */
export const TOPO = [
  [2265, 520], [1325, 880, 1400], [480, 980, 900], [-180, 1185, 300],
  [-560, 1190, 400], [-1150, 1120, 600], [-1750, 1055, 900], [-2335, 920],
];
/* Silhueta inferior em três segmentos: os arcos são aberturas reais, então a
   linha de baixo é interrompida por eles em vez de atravessá-los. */
export const BASE = [
  [[2265, 520], [2215, 340, 120], [2100, 205, 180], [1900, 168, 300], [1710, 260, 200], [1710, 340]],
  /* A vista lateral é PROJEÇÃO, então sua linha de baixo é o ponto mais baixo do
     corpo — a altura livre de 105 mm — e não a aresta da soleira, que vive em
     x = ±925 e virou linha de painel. A coerência entre vistas acusou os 35 mm
     de diferença contra a frontal. */
  [[940, 340], [820, 190, 120], [560, 105, 220], [-560, 105, 220], [-800, 190, 120], [-925, 358]],
  [[-1725, 358], [-1900, 210, 140], [-2080, 200, 300], [-2240, 380, 160], [-2335, 920]],
];
/* Curva mestra 3 — linha de ombro, projetada na lateral. */
export const OMBRO = [[1325, 900], [700, 935], [0, 950], [-900, 930], [-1500, 900]];
/* Curva mestra 2 — planta: meia largura por estação. */
export const PLANTA = [
  [2200, 300], [2100, 620, 260], [1900, 845, 500], [1325, 965, 900], [800, 945, 1400],
  [0, 940, 2000], [-900, 1000, 1500], [-1600, 970, 1200], [-2100, 880, 500], [-2335, 665],
];
/* Vista frontal — meia largura por altura. */
export const FRONTAL = [
  [105, 860], [340, 940, 260], [725, 962, 900], [900, 965, 300], [1010, 890, 260],
  [1120, 725, 300], [1185, 625],
];

