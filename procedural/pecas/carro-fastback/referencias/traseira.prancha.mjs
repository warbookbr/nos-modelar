#!/usr/bin/env node
/* traseira.prancha.mjs — a vista traseira cotada do carro-fastback, terceira das quatro vistas da prancha alvo
 * (skill desenhar-prancha, contrato docs/modelar/usar/CONTRATO-AUTORIA-PRANCHA.md).
 *
 *   node procedural/pecas/carro-fastback/referencias/traseira.prancha.mjs
 *
 * Grava, ao lado deste arquivo, `traseira.prancha.svg` e `traseira.prancha.relatorio.json`, e imprime o relatório. Sai com 1
 * se o relatório trouxer alerta ou o desenho trouxer colisão.
 *
 * A prancha guarda só o esqueleto: largura, altura, silhueta com a queda da estufa e o ombro do spoiler, vidro traseiro,
 * borda da tampa e pneus. Lanternas, painel escuro, placa, difusor, ponteiras e retrovisores são decididos sobre a chapa,
 * no 3D lido contra a referência (decisão da pessoa em 2026-11-14, no plano do carro).
 *
 * Derivada das medidas aprovadas (largura 1900, altura 1380, pneu de 680). A imagem traseira de caráter foi gerada por IA,
 * fica fora do repositório e não vale como medida. Pela largura da lataria (1525 px na imagem de 2752 px), a escala é de
 * 1,246 mm por pixel, e a altura do chão ao teto sai 1386 mm, a 0,4% da tabela; a silhueta foi medida por linha de pixel
 * nessa escala e o vidro pela cor. A base do para-choque sai a 206 mm no meio.
 *
 * Referencial: y para cima com o chão em y = 0, x para a esquerda do carro (à esquerda no desenho, visto de trás),
 * centrado na largura.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { examinarDesenho, imprimirRelatorio, prancha } from '../../../../tools/modelar/prancha/prancha.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = join(AQUI, 'traseira.prancha');

/* ------------------------------------------------------------ medidas rígidas */
export const M = {
  comprimento: 4750,
  largura: 1900,
  altura: 1380,
  pneuDiametro: 680,
  pneuLargura: 270,
  bitola: 1620,
  baseTraseira: 210,
  baseVidro: 1074,
};
const xMax = M.largura / 2;
const xPneuFora = M.bitola / 2 + M.pneuLargura / 2; // 945
const xPneuDentro = M.bitola / 2 - M.pneuLargura / 2; // 675
if (xPneuFora > xMax) throw new Error('o pneu passa da lataria');

/* metade do lado esquerdo do carro, do meio da base ao meio do teto (medida por linha de pixel, em mm) */
const metade = [
  [930, M.baseTraseira, 8], [952, 300, 60], [952, 350, 200], [952, 600, 3000], [940, 758, 100],
  [905, 827, 300], [845, 932, 120], [795, 978, 10], [805, 1000, 5], [745, 1014, 15], [700, 1050, 60], [677, 1106, 300], [624, 1211, 800],
  [590, 1281, 200], [487, 1351, 150], [300, 1378, 2000],
];
const espelho = (pts) => pts.map(([x, y, r]) => (r === undefined ? [-x, y] : [-x, y, r]));
const silhueta = [[0, M.baseTraseira], ...metade, [0, M.altura + 1, 6000] /* vértice do filete; o teto passa em 1380 */, ...espelho(metade).reverse()];
const motivoRoda = 'na traseira o pneu desce da lataria até o chão, abaixo do para-choque';
const pneu = (s) => [[s * xPneuDentro, 200], [s * xPneuDentro, 0, 80], [s * xPneuFora, 0, 80], [s * xPneuFora, 200]];
const mil = (v) => Math.round(v).toLocaleString('pt-BR');

/* ------------------------------------------------------------ especificação */
const ESCALA = 0.3;
const V = { traseira: { x: 150, y: 150, leitura: 'projecao', rotuloEm: [150, 100], rotulo: 'TRASEIRA' } };

export const ESPEC = {
  titulo: 'carro-fastback — vista traseira cotada (medidas em mm)',
  subtitulo: 'Esqueleto: silhueta com a aba do spoiler, vidros, borda da tampa e pneus. O detalhe é decidido no 3D contra a referência.',
  escala: ESCALA,
  tela: { largura: 900, altura: 700 },
  limites: { zMin: -M.comprimento / 2, zMax: M.comprimento / 2, yMax: M.altura, xMax },
  vistas: V,
  envelope: { largura: M.largura, altura: M.altura },
  autoria: {
    versao: 'mecanifica.prancha-autoria@1',
    estado: 'pronta',
    modo: 'parcial',
    confianca: 'media',
    intencao: 'vista traseira do cupê fastback só com o esqueleto, para a pessoa julgar a queda da estufa, o ombro e o vidro traseiro',
    procedencias: [
      { id: 'tabela', tipo: 'medidas-declaradas', evidencia: 'decisões da pessoa de 2026-11-14 no plano do carro: largura 1900, altura 1380 e pneu de 680' },
      { id: 'carater', tipo: 'referencia-raster-derivada', evidencia: 'imagem traseira gerada por IA, fora do repositório: silhueta medida por linha de pixel na escala da largura; não vale como medida' },
    ],
    incertezas: [
      { id: 'bitola', sobre: 'bitola de 1620 e pneu de 270 de largura', fonte: 'carater', efeito: 'diagnostico', motivo: 'lidos na imagem; a tabela não os fixa' },
      { id: 'estufa', sobre: 'queda da estufa e largura do teto', fonte: 'carater', efeito: 'diagnostico', motivo: 'silhueta medida por pixel, vidro e borda da tampa lidos a olho, com erro da ordem de 20 mm; a pessoa aprova a forma' },
    ],
  },
  camadas: [
    { vista: 'traseira', contorno: true, nome: 'silhuetaTraseira', tipo: 'filete', fechado: true, pts: silhueta },
    { vista: 'traseira', classe: 'vidro', nome: 'vidroTraseiro', tipo: 'filete', fechado: true, pts: [[-500, M.baseVidro, 50], [500, M.baseVidro, 50], [515, 1305, 20], [0, 1314, 9000], [-515, 1305, 20]] },
    { vista: 'traseira', classe: 'painel', nome: 'bordaDaTampa', tipo: 'filete', pts: [[-790, 1000], [0, 1012, 4000], [790, 1000]] },
    { vista: 'traseira', classe: 'vidro', nome: 'vidroLateralEsq', tipo: 'poli', fechado: true, pts: [[680, 1070], [585, 1270], [560, 1270], [648, 1070]] },
    { vista: 'traseira', classe: 'vidro', nome: 'vidroLateralDir', tipo: 'poli', fechado: true, pts: [[-680, 1070], [-585, 1270], [-560, 1270], [-648, 1070]] },
    { vista: 'traseira', classe: 'roda', nome: 'pneuEsq', tipo: 'filete', pts: pneu(1), foraDoContorno: true, motivoForaDoContorno: motivoRoda },
    { vista: 'traseira', classe: 'roda', nome: 'pneuDir', tipo: 'filete', pts: pneu(-1), foraDoContorno: true, motivoForaDoContorno: motivoRoda },
  ],
  landmarks: [
    { id: 'largura', vista: 'traseira', em: [-xMax - 2, 600], sobre: 'silhuetaTraseira', rotuloEm: [-xMax - 60, 650] },
    { id: 'teto', vista: 'traseira', em: [0, M.altura], sobre: 'silhuetaTraseira', rotuloEm: [60, M.altura + 60] },
  ],
  cotas: [
    { vista: 'traseira', de: [-xMax, 0], ate: [xMax, 0], desloca: [0, 56], extensao: true, texto: mil(M.largura) },
    { vista: 'traseira', de: [-M.bitola / 2, 0], ate: [M.bitola / 2, 0], desloca: [0, 26], extensao: true, texto: mil(M.bitola) },
    { vista: 'traseira', de: [xMax, 0], ate: [xMax, M.altura], desloca: [-40, 0], extensao: true, texto: mil(M.altura) },
  ],
  legenda: {
    x: 150, y: 620,
    itens: [
      ['#1c2733', 'silhueta da lataria e borda da tampa com o spoiler'],
      ['#3d6b86', 'vidro traseiro e vidros laterais vistos de trás'],
    ],
    notas: [`Largura ${mil(M.largura)} sem retrovisores; bitola ${mil(M.bitola)} e pneu de ${M.pneuLargura} lidos na imagem.`],
  },
};

/* ------------------------------------------------------------ execução */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { svg, relatorio, desenho } = prancha(ESPEC);
  const exame = examinarDesenho(desenho);
  console.log(imprimirRelatorio(relatorio));
  console.log(`  colisões do desenho: ${exame.colisoes.length}, avisos: ${exame.avisos.length}`);
  for (const c of exame.colisoes) console.log(`  COLISÃO ${c.tipo}: ${c.a} × ${c.b}`);
  for (const a of exame.avisos) console.log(`  AVISO ${a.tipo}: ${a.a} × ${a.b} (${a.motivo})`);
  writeFileSync(`${BASE}.svg`, svg);
  writeFileSync(`${BASE}.relatorio.json`, `${JSON.stringify({ medidas: M, relatorio, colisoes: exame.colisoes, avisos: exame.avisos }, null, 2)}\n`);
  if (relatorio.alertas.length || exame.colisoes.length) process.exitCode = 1;
}
