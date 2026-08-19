#!/usr/bin/env node
/* prancha-chassi-p0.mjs — especificação da prancha ortográfica ALVO da rodada P0
   do chassi realista, desenhada por tools/mecanifica/prancha.mjs. Não é a projeção
   de uma peça existente: é o desenho contra o qual a geometria futura será medida.
   Toda medida vem de docs/mecanifica/CHASSI-P0-ALVO-E-LIMIARES.md e é repetida aqui
   como dado explícito; se divergirem, o documento manda. Saída determinística. */

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prancha, imprimirRelatorio } from './prancha.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAIDA = path.join(REPO, 'docs', 'mecanifica', 'img', 'chassi-p0-prancha.svg');

/* --- dados de P0, em milímetros -------------------------------------------- */
const zMin = -2335, zMax = 2265, yMax = 1190, xMax = 1000;
const RD = { z: 1325, x: 830, raio: 340, arco: 385, larg: 245 };
const RT = { z: -1325, x: 840, raio: 358, arco: 400, larg: 305 };

const LANDMARKS = [
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
const TOPO = [
  [2265, 520], [1325, 880, 1400], [480, 980, 900], [-180, 1185, 300],
  [-560, 1190, 400], [-1150, 1120, 600], [-1750, 1055, 900], [-2335, 920],
];
/* Silhueta inferior em três segmentos: os arcos são aberturas reais, então a
   linha de baixo é interrompida por eles em vez de atravessá-los. */
const BASE = [
  [[2265, 520], [2215, 340], [2100, 205], [1900, 168], [1710, 260], [1710, 340]],
  [[940, 340], [820, 200], [400, 145], [0, 145], [-500, 152], [-800, 190], [-925, 358]],
  [[-1725, 358], [-1900, 210], [-2080, 200], [-2240, 380], [-2335, 920]],
];
/* Curva mestra 3 — linha de ombro, projetada na lateral. */
const OMBRO = [[1325, 900], [700, 935], [0, 950], [-900, 930], [-1500, 900]];
/* Curva mestra 2 — planta: meia largura por estação. */
const PLANTA = [
  [2200, 300], [2100, 620], [1900, 845], [1325, 965], [800, 945],
  [0, 940], [-900, 1000], [-1600, 970], [-2100, 880], [-2335, 665],
];
/* Vista frontal — meia largura por altura. */
const FRONTAL = [
  [105, 860], [340, 940], [725, 962], [900, 965], [1010, 890],
  [1120, 725], [1185, 625],
];

const camadas = [
  { vista: 'lateral', tipo: 'poli', classe: 'eixo', pts: [[zMin - 80, 0], [zMax + 80, 0]] },
  {
    vista: 'lateral', contorno: true, nome: 'silhuetaSuperior', pts: TOPO,
    /* Três inversões são corretas aqui e não defeito: a silhueta inteira tem
       inflexão real no capô, na base do para-brisa e na queda da traseira. O
       limite existe para pegar ondulação — a versão anterior media dez. */
    esperado: { concentracaoMax: 0.30, inversoesMax: 4 },
  },
  ...BASE.map((pts) => ({ vista: 'lateral', contorno: true, pts, tipo: 'suave' })),
  ...[RD, RT].flatMap((r) => [
    { vista: 'lateral', tipo: 'circulo', classe: 'roda', foraDoContorno: true, centro: [r.z, r.raio], raio: r.raio },
    { vista: 'lateral', tipo: 'circulo', classe: 'aro', foraDoContorno: true, centro: [r.z, r.raio], raio: r.raio * 0.74 },
    { vista: 'lateral', tipo: 'arco', classe: 'contorno', contorno: true, centro: [r.z, r.raio], raio: r.arco },
  ]),
  /* A linha de ombro vive em x = ±965 e é projetada na lateral: comparar com a
     silhueta de x = 0 não faz sentido, e a crista do para-lama fica mesmo acima
     do centro do capô. */
  { vista: 'lateral', classe: 'carater', nome: 'linhaDeOmbro', pts: OMBRO, foraDoContorno: true, esperado: { concentracaoMax: 0.6, inversoesMax: 2 } },

  { vista: 'planta', tipo: 'poli', classe: 'eixo', pts: [[zMin - 80, 0], [zMax + 80, 0]] },
  { vista: 'planta', contorno: true, pts: PLANTA, tipo: 'suave' },
  { vista: 'planta', contorno: true, pts: PLANTA.map(([z, w]) => [z, -w]), tipo: 'suave' },
  { vista: 'planta', contorno: true, pts: [[2200, 300], [2265, 0], [2200, -300]], tipo: 'suave' },
  { vista: 'planta', contorno: true, tipo: 'poli', pts: [[-2335, 665], [-2335, -665]] },
  ...[RD, RT].flatMap((r) => [1, -1].map((k) => ({
    vista: 'planta', tipo: 'poli', classe: 'roda', fechado: true, foraDoContorno: true,
    pts: [[r.z - r.raio, k * r.x - r.larg / 2], [r.z + r.raio, k * r.x - r.larg / 2],
      [r.z + r.raio, k * r.x + r.larg / 2], [r.z - r.raio, k * r.x + r.larg / 2]],
  }))),

  { vista: 'frontal', tipo: 'poli', classe: 'eixo', pts: [[0, -60], [0, yMax + 40]] },
  ...[1, -1].map((k) => ({ vista: 'frontal', contorno: true, tipo: 'suave', pts: FRONTAL.map(([y, w]) => [k * w, y]) })),
  { vista: 'frontal', contorno: true, tipo: 'poli', pts: [[-860, 105], [860, 105]] },
  { vista: 'frontal', contorno: true, tipo: 'poli', pts: [[-625, 1185], [625, 1185]] },
  ...[1, -1].map((k) => ({
    vista: 'frontal', tipo: 'poli', classe: 'roda', fechado: true, foraDoContorno: true,
    pts: [[k * RD.x - RD.larg / 2, 0], [k * RD.x + RD.larg / 2, 0],
      [k * RD.x + RD.larg / 2, RD.raio * 2], [k * RD.x - RD.larg / 2, RD.raio * 2]],
  })),
];

const spec = {
  titulo: 'Chassi P0 — prancha ortográfica alvo',
  subtitulo: 'Alvo declarado antes da geometria. Milímetros. x = largura, y = altura, z = frente positiva. Escala 1:6,25.',
  escala: 0.16,
  tela: { largura: 1320, altura: 800 },
  limites: { zMin, zMax, yMax, xMax },
  vistas: {
    lateral: { x: 70, y: 96, rotulo: 'LATERAL — plano x = 0, frente à direita' },
    frontal: { x: 900, y: 96, rotulo: 'FRONTAL — vista ao longo de z' },
    planta: { x: 70, y: 420, rotulo: 'SUPERIOR — planta, frente à direita' },
  },
  camadas,
  cotas: [
    { vista: 'lateral', de: [-1325, 0], ate: [1325, 0], desloca: [0, 34], texto: 'entre-eixos 2650' },
    { vista: 'lateral', de: [zMin, 0], ate: [zMax, 0], desloca: [0, 58], texto: 'comprimento 4600' },
    { vista: 'lateral', de: [zMax, 0], ate: [zMax, yMax], desloca: [34, 0], texto: 'altura 1190' },
    { vista: 'frontal', de: [-965, 0], ate: [965, 0], desloca: [0, 34], texto: 'ombro dianteiro 1930' },
    { vista: 'frontal', de: [-830, 0], ate: [830, 0], desloca: [0, 56], texto: 'bitola diant. 1660' },
    { vista: 'planta', de: [-1325, -840], ate: [-1325, 840], desloca: [-40, 0], texto: 'largura máx. 2000' },
  ],
  landmarks: LANDMARKS.flatMap(([id, x, y, z]) => (
    x === 0 || id === 'L14' || id === 'L15'
      ? [{ vista: 'lateral', em: [z, y], id, sobre: ['L01', 'L04', 'L05', 'L06', 'L07', 'L08', 'L09'].includes(id) ? 'silhuetaSuperior' : undefined }]
      : [{ vista: 'planta', em: [z, x], id }, { vista: 'lateral', em: [z, y] }]
  )),
  legenda: {
    x: 900, y: 420,
    itens: [
      ['#12233b', 'silhueta alvo — curvas mestras 1, 2 e 4'],
      ['#b3593d', 'linha de ombro (curva mestra 3) e cotas'],
      ['#8a94a2', 'roda: 680 mm diant., 716 mm tras.'],
      ['#1f6f5c', 'landmarks L01–L15, tolerância 6 mm'],
    ],
    notas: ['Fonte: CHASSI-P0-ALVO-E-LIMIARES.md', 'Alvo, não geometria. Nenhuma peça foi modelada.'],
  },
};

const { svg, relatorio } = prancha(spec);
mkdirSync(path.dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, svg);
console.log(`prancha-chassi-p0: ${path.relative(REPO, SAIDA)}`);
console.log(imprimirRelatorio(relatorio));
