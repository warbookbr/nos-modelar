#!/usr/bin/env node
/* superior.prancha.mjs — rodada 2 após achados do crítico visual sem contexto */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { examinarDesenho, imprimirRelatorio, prancha } from '../../../../tools/modelar/prancha/prancha.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = join(AQUI, 'superior.prancha');

export const M = {
  comprimento: 4050,
  largura: 1620,
  altura: 1390,
};
const zFrente = M.comprimento / 2;
const zTras = -M.comprimento / 2;
const xMax = M.largura / 2;

const lado = [
  [zFrente - 40, 650, 95],
  [1750, 745, 240],
  [850, 800, 400],
  [0, 810, 400],
  [-1100, 800, 400],
  [-1950, 735, 110],
  [zTras + 35, 670, 80],
];
const espelho = (pts) => pts.map(([z, x, r]) => (r === undefined ? [z, -x] : [z, -x, r]));
const silhueta = [[zFrente, 0], ...lado, [zTras, 0], ...espelho(lado).reverse()];

const ESCALA = 0.32;
const V = { planta: { x: 110, y: 180, leitura: 'projecao', rotuloEm: [110, 115], rotulo: 'PLANTA (R2 APÓS CRÍTICO)' } };

export const ESPEC = {
  titulo: 'carro-quadrado — vista superior R2',
  subtitulo: 'Corrigida pelos achados do crítico visual cego sobre a R1 (4.050 × 1.620 mm).',
  escala: ESCALA,
  tela: { largura: 1600, altura: 820 },
  limites: { zMin: zTras, zMax: zFrente, yMax: M.altura, xMax },
  vistas: V,
  envelope: { comprimento: M.comprimento, largura: M.largura },
  autoria: {
    versao: 'mecanifica.prancha-autoria@1',
    estado: 'pronta',
    modo: 'parcial',
    confianca: 'media',
    intencao: 'prova prática planta R2 corrigida pelo crítico visual',
    procedencias: [
      { id: 'tabela', tipo: 'medidas-declaradas', evidencia: 'comprimento 4050, largura 1620' },
      { id: 'grade', tipo: 'referencia-raster-derivada', evidencia: 'grade calibrada + rodada de crítico visual sobre prancha:sobrepor' },
    ],
    incertezas: [{ id: 'carater', sobre: 'posições de caráter', fonte: 'grade', efeito: 'diagnostico', motivo: 'imagem gerada por IA' }],
  },
  camadas: [
    { vista: 'planta', contorno: true, nome: 'silhueta', tipo: 'filete', fechado: true, pts: silhueta },
    { vista: 'planta', classe: 'vidro', nome: 'paraBrisa', tipo: 'filete', fechado: true, pts: [[820, -580, 20], [820, 580, 20], [375, 455, 20], [375, -455, 20]] },
    { vista: 'planta', classe: 'vidro', nome: 'vidroTraseiro', tipo: 'filete', fechado: true, pts: [[-1650, -465, 20], [-1650, 465, 20], [-1920, 575, 20], [-1920, -575, 20]] },
    { vista: 'planta', classe: 'painel', nome: 'teto', tipo: 'filete', fechado: true, pts: [[350, -455, 20], [350, 455, 20], [-1625, 465, 20], [-1625, -465, 20]] },
    { vista: 'planta', classe: 'carater', nome: 'vincoCapoDir', tipo: 'poli', pts: [[1930, -565], [900, -645]] },
    { vista: 'planta', classe: 'carater', nome: 'vincoCapoEsq', tipo: 'poli', pts: [[1930, 565], [900, 645]] },
  ],
  landmarks: [
    { id: 'frente', vista: 'planta', em: [zFrente, 0], sobre: 'silhueta', rotuloEm: [zFrente + 60, -120] },
    { id: 'traseira', vista: 'planta', em: [zTras, 0], sobre: 'silhueta', rotuloEm: [zTras - 180, 0] },
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
