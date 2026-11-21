#!/usr/bin/env node
/* traseira.prancha.mjs — rodada 2 após achados do crítico visual sem contexto */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { examinarDesenho, imprimirRelatorio, prancha } from '../../../../tools/modelar/prancha/prancha.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = join(AQUI, 'traseira.prancha');

export const M = {
  comprimento: 4050,
  largura: 1620,
  altura: 1390,
  pneuDiametro: 580,
  pneuLargura: 205,
  bitola: 1365,
  fundoTraseiro: 230,
};
const xMax = M.largura / 2;
const xPneuFora = M.bitola / 2 + M.pneuLargura / 2; // 785
const xPneuDentro = M.bitola / 2 - M.pneuLargura / 2; // 580

const metade = [
  [690, 235, 35], [760, 265, 45], [798, 355, 60], [810, 485, 50], [798, 630, 70],
  [775, 825, 70], [700, 935, 55], [495, 1320, 75], [440, 1378, 220],
];
const espelho = (pts) => pts.map(([x, y, r]) => (r === undefined ? [-x, y] : [-x, y, r]));
const silhueta = [[0, M.fundoTraseiro], ...metade, [0, M.altura, 2500], ...espelho(metade).reverse()];
const pneu = (s) => [[s * xPneuDentro, 240], [s * xPneuDentro, 0, 35], [s * xPneuFora, 0, 35], [s * xPneuFora, 240]];
const motivoRoda = 'na traseira o pneu desce da lataria até o chão';

const ESCALA = 0.32;
const V = { traseira: { x: 150, y: 150, leitura: 'projecao', rotuloEm: [150, 100], rotulo: 'TRASEIRA (R2 APÓS CRÍTICO)' } };

export const ESPEC = {
  titulo: 'carro-quadrado — vista traseira R2',
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
    intencao: 'prova prática traseira R2 corrigida pelo crítico visual',
    procedencias: [
      { id: 'tabela', tipo: 'medidas-declaradas', evidencia: 'largura 1620, altura 1390, pneu 580' },
      { id: 'grade', tipo: 'referencia-raster-derivada', evidencia: 'grade calibrada + rodada de crítico visual sobre prancha:sobrepor' },
    ],
    incertezas: [{ id: 'carater', sobre: 'posições de caráter', fonte: 'grade', efeito: 'diagnostico', motivo: 'imagem gerada por IA' }],
  },
  camadas: [
    { vista: 'traseira', contorno: true, nome: 'silhueta', tipo: 'filete', fechado: true, pts: silhueta },
    { vista: 'traseira', classe: 'vidro', nome: 'vidroTraseiro', tipo: 'filete', fechado: true, pts: [[-575, 975, 20], [-465, 1270, 30], [465, 1270, 30], [575, 975, 20]] },
    { vista: 'traseira', classe: 'painel', nome: 'tampa', tipo: 'filete', fechado: true, pts: [[-645, 515], [-665, 830, 18], [-610, 945, 25], [-490, 1315, 30], [490, 1315, 30], [610, 945, 25], [665, 830, 18], [645, 515]] },
    { vista: 'traseira', classe: 'painel', nome: 'parachoqueTopo', tipo: 'poli', pts: [[-806, 515], [806, 515]] },
    { vista: 'traseira', classe: 'roda', nome: 'pneuTraseiroEsq', tipo: 'filete', pts: pneu(1), foraDoContorno: true, motivoForaDoContorno: motivoRoda },
    { vista: 'traseira', classe: 'roda', nome: 'pneuTraseiroDir', tipo: 'filete', pts: pneu(-1), foraDoContorno: true, motivoForaDoContorno: motivoRoda },
  ],
  landmarks: [
    { id: 'teto', vista: 'traseira', em: [0, M.altura], sobre: 'silhueta', rotuloEm: [0, M.altura + 65] },
    { id: 'fundo', vista: 'traseira', em: [0, M.fundoTraseiro], sobre: 'silhueta', rotuloEm: [0, 150] },
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
