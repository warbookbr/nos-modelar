#!/usr/bin/env node
/* lateral.prancha.mjs — rodada 2 após achados do crítico visual sem contexto */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { examinarDesenho, imprimirRelatorio, prancha } from '../../../../tools/modelar/prancha/prancha.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = join(AQUI, 'lateral.prancha');

export const M = {
  comprimento: 4050,
  largura: 1620,
  altura: 1390,
  entreEixos: 2360,
  balancoDianteiro: 790,
  balancoTraseiro: 900,
  pneuDiametro: 580,
  aroDiametro: 365,
  arcoRaio: 350,
  soleira: 255,
  fundoTraseiro: 315,
};
if (M.balancoDianteiro + M.entreEixos + M.balancoTraseiro !== M.comprimento) throw new Error('soma ≠ comprimento');

const zFrente = M.comprimento / 2; // +2025
const zTras = -M.comprimento / 2;  // -2025
const zD = zFrente - M.balancoDianteiro; // +1235
const zT = zTras + M.balancoTraseiro;    // -1125
const R = M.pneuDiametro / 2; // 290
const dz = (y) => Math.sqrt(M.arcoRaio ** 2 - (y - R) ** 2);

const P = {
  labio: [1915, 295],
  nariz: [1970, 765],
  basePB: [845, 935],
  topoPB: [310, 1378],
  pico: [-300, 1390],
  topoTras: [-1510, 1384],
  baseTampa: [-1955, 955],
};

function arco(zc, yTras, yFrente, n = 36) {
  const a0 = Math.PI - Math.asin((yTras - R) / M.arcoRaio);
  const a1 = Math.asin((yFrente - R) / M.arcoRaio);
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [zc + M.arcoRaio * Math.cos(a), R + M.arcoRaio * Math.sin(a)];
  });
}

const ESCALA = 0.32;
const V = { lateral: { x: 110, y: 180, leitura: 'projecao', rotuloEm: [110, 115], rotulo: 'LATERAL (R2 APÓS CRÍTICO)' } };
const motivoRoda = 'na lateral a roda desce abaixo da soleira e fica dentro do arco';

export const ESPEC = {
  titulo: 'carro-quadrado — vista lateral R2',
  subtitulo: 'Corrigida pelos achados do crítico visual cego sobre a R1 (4.050 × 1.620 × 1.390 mm).',
  escala: ESCALA,
  tela: { largura: 1600, altura: 820 },
  limites: { zMin: zTras, zMax: zFrente, yMax: M.altura, xMax: M.largura / 2 },
  vistas: V,
  envelope: { comprimento: M.comprimento, altura: M.altura },
  autoria: {
    versao: 'mecanifica.prancha-autoria@1',
    estado: 'pronta',
    modo: 'parcial',
    confianca: 'media',
    intencao: 'prova prática R2 corrigida pelo crítico visual',
    procedencias: [
      { id: 'tabela', tipo: 'medidas-declaradas', evidencia: '4050 × 1620 × 1390 mm, entre-eixos 2360 mm, pneu 580 mm' },
      { id: 'grade', tipo: 'referencia-raster-derivada', evidencia: 'grade calibrada + rodada de crítico visual sobre prancha:sobrepor' },
    ],
    incertezas: [{ id: 'entreeixos', sobre: 'entre-eixos 2360 da tabela vs 2402 da foto', fonte: 'grade', efeito: 'diagnostico', motivo: 'a tabela rígida prevalece sobre a foto de IA' }],
  },
  camadas: [
    { vista: 'lateral', contorno: true, nome: 'nariz', tipo: 'filete', pts: [[zD + dz(M.soleira), M.soleira], [1760, 265, 60], P.labio, [2005, 385, 35], [2025, 515, 25], [2000, 680, 40], P.nariz] },
    { vista: 'lateral', contorno: true, nome: 'capo', tipo: 'filete', pts: [P.nariz, [1420, 855, 2500], P.basePB], esperado: { inversoesMax: 0 } },
    { vista: 'lateral', contorno: true, nome: 'paraBrisaETeto', tipo: 'filete', pts: [P.basePB, [...P.topoPB, 110], [...P.pico, 1200], [...P.topoTras, 85], P.baseTampa], esperado: { inversoesMax: 0 } },
    { vista: 'lateral', contorno: true, nome: 'traseira', tipo: 'filete', pts: [P.baseTampa, [-1995, 735, 30], [zTras, 560, 20], [zTras, 430, 30], [-1945, 365, 40], [-1680, 330, 100], [zT - dz(M.fundoTraseiro), M.fundoTraseiro]] },
    { vista: 'lateral', contorno: true, nome: 'arcoTraseiro', tipo: 'poli', pts: arco(zT, M.fundoTraseiro, M.soleira) },
    { vista: 'lateral', contorno: true, nome: 'soleira', tipo: 'poli', pts: [[zT + dz(M.soleira), M.soleira], [zD - dz(M.soleira), M.soleira]], esperado: { inversoesMax: 0 } },
    { vista: 'lateral', contorno: true, nome: 'arcoDianteiro', tipo: 'poli', pts: arco(zD, M.soleira, M.soleira) },
    { vista: 'lateral', classe: 'vidro', nome: 'vidroDaPorta', tipo: 'filete', fechado: true, pts: [[610, 955, 15], [235, 1345, 35], [-345, 1355, 25], [-345, 955, 15]] },
    { vista: 'lateral', classe: 'vidro', nome: 'vidroTraseiroLateral', tipo: 'filete', fechado: true, pts: [[-430, 945, 15], [-430, 1350, 25], [-1455, 1345, 30], [-1815, 960, 15], [-1775, 945, 15]] },
    { vista: 'lateral', classe: 'painel', nome: 'porta', tipo: 'filete', fechado: true, pts: [[780, 935], [780, 335, 30], [-385, 335, 30], [-385, 945]] },
    { vista: 'lateral', classe: 'painel', nome: 'frisoTras', tipo: 'poli', pts: [[-2005, 515], [zT - dz(515) - 20, 515]] },
    { vista: 'lateral', classe: 'painel', nome: 'frisoCentro', tipo: 'poli', pts: [[zT + dz(515) + 20, 515], [zD - dz(515) - 20, 515]] },
    { vista: 'lateral', classe: 'carater', nome: 'cintura', tipo: 'filete', pts: [[1960, 765], [845, 935, 1500], [-1945, 945]], esperado: { inversoesMax: 0 } },
    { vista: 'lateral', classe: 'roda', nome: 'pneuDianteiro', tipo: 'circulo', centro: [zD, R], raio: R, foraDoContorno: true, motivoForaDoContorno: motivoRoda },
    { vista: 'lateral', classe: 'roda', nome: 'pneuTraseiro', tipo: 'circulo', centro: [zT, R], raio: R, foraDoContorno: true, motivoForaDoContorno: motivoRoda },
    { vista: 'lateral', classe: 'aro', nome: 'aroDianteiro', tipo: 'circulo', centro: [zD, R], raio: M.aroDiametro / 2, foraDoContorno: true, motivoForaDoContorno: motivoRoda },
    { vista: 'lateral', classe: 'aro', nome: 'aroTraseiro', tipo: 'circulo', centro: [zT, R], raio: M.aroDiametro / 2, foraDoContorno: true, motivoForaDoContorno: motivoRoda },
  ],
  landmarks: [
    { id: 'teto', vista: 'lateral', em: [-300, 1390], sobre: 'paraBrisaETeto', rotuloEm: [-340, 1455] },
    { id: 'basePB', vista: 'lateral', em: P.basePB, sobre: 'capo', rotuloEm: [880, 1010] },
    { id: 'nariz', vista: 'lateral', em: P.nariz, sobre: 'nariz', rotuloEm: [2000, 830] },
    { id: 'eixoD', vista: 'lateral', em: [zD, R], rotuloEm: [zD - 40, R - 55] },
    { id: 'eixoT', vista: 'lateral', em: [zT, R], rotuloEm: [zT - 40, R - 55] },
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
