#!/usr/bin/env node
/* frontal.prancha.mjs — rodada 2 após achados do crítico visual sem contexto */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { examinarDesenho, imprimirRelatorio, prancha } from '../../../../tools/modelar/prancha/prancha.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = join(AQUI, 'frontal.prancha');

export const M = {
  comprimento: 4050,
  largura: 1620,
  altura: 1390,
  pneuDiametro: 580,
  pneuLargura: 205,
  bitola: 1365,
  labio: 185,
};
const xMax = M.largura / 2; // 810
const xPneuFora = M.bitola / 2 + M.pneuLargura / 2; // 785
const xPneuDentro = M.bitola / 2 - M.pneuLargura / 2; // 580

const metade = [
  [715, 190, 30], [775, 240, 45], [800, 355, 60], [810, 480, 50], [805, 560, 70],
  [785, 735, 80], [725, 860, 70], [655, 955, 55], [490, 1320, 75], [430, 1378, 220],
];
const espelho = (pts) => pts.map(([x, y, r]) => (r === undefined ? [-x, y] : [-x, y, r]));
const silhueta = [[0, M.labio], ...metade, [0, M.altura, 2500], ...espelho(metade).reverse()];
const pneu = (s) => [[s * xPneuDentro, 195], [s * xPneuDentro, 0, 35], [s * xPneuFora, 0, 35], [s * xPneuFora, 195]];
const motivoRoda = 'na frontal o pneu desce da lataria até o chão';

const ESCALA = 0.32;
const V = { frontal: { x: 150, y: 150, leitura: 'projecao', rotuloEm: [150, 100], rotulo: 'FRONTAL (R2 APÓS CRÍTICO)' } };

export const ESPEC = {
  titulo: 'carro-quadrado — vista frontal R2',
  subtitulo: 'Corrigida pelos achados do crítico visual cego sobre a R1 (1.620 × 1.390 mm).',
  escala: ESCALA,
  tela: { largura: 840, altura: 720 },
  limites: { zMin: -M.comprimento / 2, zMax: M.comprimento / 2, yMax: M.altura, xMax },
  vistas: V,
  envelope: { largura: M.largura, altura: M.altura },
  autoria: {
    versao: 'mecanifica.prancha-autoria@1',
    estado: 'pronta',
    modo: 'parcial',
    confianca: 'media',
    intencao: 'prova prática frontal R2 corrigida pelo crítico visual',
    procedencias: [
      { id: 'tabela', tipo: 'medidas-declaradas', evidencia: 'largura 1620, altura 1390, pneu 580' },
      { id: 'grade', tipo: 'referencia-raster-derivada', evidencia: 'grade calibrada + rodada de crítico visual sobre prancha:sobrepor' },
    ],
    incertezas: [{ id: 'carater', sobre: 'posições de caráter', fonte: 'grade', efeito: 'diagnostico', motivo: 'imagem gerada por IA' }],
  },
  camadas: [
    { vista: 'frontal', contorno: true, nome: 'silhueta', tipo: 'filete', fechado: true, pts: silhueta },
    { vista: 'frontal', classe: 'vidro', nome: 'paraBrisa', tipo: 'filete', fechado: true, pts: [[-580, 975, 20], [-455, 1305, 30], [455, 1305, 30], [580, 975, 20]] },
    { vista: 'frontal', classe: 'painel', nome: 'bordaCapo', tipo: 'filete', pts: [[-665, 860], [-655, 720, 18], [655, 720, 18], [665, 860]] },
    { vista: 'frontal', classe: 'painel', nome: 'parachoqueTopo', tipo: 'poli', pts: [[-806, 515], [806, 515]] },
    { vista: 'frontal', classe: 'roda', nome: 'pneuDianteiroEsq', tipo: 'filete', pts: pneu(1), foraDoContorno: true, motivoForaDoContorno: motivoRoda },
    { vista: 'frontal', classe: 'roda', nome: 'pneuDianteiroDir', tipo: 'filete', pts: pneu(-1), foraDoContorno: true, motivoForaDoContorno: motivoRoda },
  ],
  landmarks: [
    { id: 'teto', vista: 'frontal', em: [0, M.altura], sobre: 'silhueta', rotuloEm: [0, M.altura + 65] },
    { id: 'labio', vista: 'frontal', em: [0, M.labio], sobre: 'silhueta', rotuloEm: [0, 115] },
  ],
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { svg, relatorio, desenho } = prancha(ESPEC);
  const exame = examinarDesenho(desenho);
  console.log(imprimirRelatorio(relatorio));
  console.log(`  colisões: ${exame.colisoes.length}`);
  writeFileSync(`${BASE}.svg`, svg);
  if (relatorio.alertas.length || exame.colisoes.length) process.exitCode = 1;
}
