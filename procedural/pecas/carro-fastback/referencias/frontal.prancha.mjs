#!/usr/bin/env node
/* frontal.prancha.mjs — a vista frontal cotada do carro-fastback, segunda das quatro vistas da prancha alvo
 * (skill desenhar-prancha, contrato docs/modelar/usar/CONTRATO-AUTORIA-PRANCHA.md).
 *
 *   node procedural/pecas/carro-fastback/referencias/frontal.prancha.mjs
 *
 * Grava, ao lado deste arquivo, `frontal.prancha.svg` e `frontal.prancha.relatorio.json`, e imprime o relatório. Sai com 1
 * se o relatório trouxer alerta ou o desenho trouxer colisão.
 *
 * A prancha guarda só o esqueleto: largura, altura, silhueta com a queda da estufa, para-brisa, borda do capô e pneus.
 * Grade, faróis, entradas de baixo, tomadas do capô e retrovisores são decididos sobre a chapa, no 3D lido contra a
 * referência (decisão da pessoa em 2026-11-14, no plano do carro).
 *
 * Derivada das medidas aprovadas (largura 1900, altura 1380, pneu de 680). A imagem frontal de caráter foi gerada por IA,
 * fica fora do repositório e não vale como medida. Pela largura da lataria (1105 px na imagem reduzida a 2000 px), a escala
 * é de 1,72 mm por pixel, e a altura do chão ao teto sai 1376 mm, a 0,3% da tabela; as posições foram lidas nessa escala.
 * As alturas que a lateral também mostra (lábio, borda do capô, base do para-brisa) seguem a lateral aceita.
 *
 * Referencial: y para cima com o chão em y = 0, x para a esquerda do carro visto de frente (à direita no desenho),
 * centrado na largura.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { examinarDesenho, imprimirRelatorio, prancha } from '../../../../tools/modelar/prancha/prancha.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = join(AQUI, 'frontal.prancha');

/* ------------------------------------------------------------ medidas rígidas */
export const M = {
  comprimento: 4750,
  largura: 1900,
  altura: 1380,
  pneuDiametro: 680,
  pneuLargura: 270,
  bitola: 1620,
  labio: 190,
  basePB: 985,
};
const xMax = M.largura / 2;
const xPneuFora = M.bitola / 2 + M.pneuLargura / 2; // 945
const xPneuDentro = M.bitola / 2 - M.pneuLargura / 2; // 675
if (xPneuFora > xMax) throw new Error('o pneu passa da lataria');

/* metade direita do desenho (lado esquerdo do carro), do meio do lábio ao meio do teto */
const metade = [
  [890, M.labio, 40], [945, 240, 80], [952, 330, 200], [952, 600, 3000], [940, 720, 100],
  [880, 860, 300], [800, 955, 200], [735, M.basePB + 10, 90], [590, 1260, 1500], [500, 1350, 160], [300, 1378, 2000],
];
const espelho = (pts) => pts.map(([x, y, r]) => (r === undefined ? [-x, y] : [-x, y, r]));
const silhueta = [[0, M.labio], ...metade, [0, M.altura + 1, 6000] /* vértice do filete; o teto passa em 1380 */, ...espelho(metade).reverse()];
const motivoRoda = 'na frontal o pneu desce da lataria até o chão, abaixo do lábio';
const pneu = (s) => [[s * xPneuDentro, 200], [s * xPneuDentro, 0, 80], [s * xPneuFora, 0, 80], [s * xPneuFora, 200]];
const mil = (v) => Math.round(v).toLocaleString('pt-BR');

/* ------------------------------------------------------------ especificação */
const ESCALA = 0.3;
const V = { frontal: { x: 150, y: 150, leitura: 'projecao', rotuloEm: [150, 100], rotulo: 'FRONTAL' } };

export const ESPEC = {
  titulo: 'carro-fastback — vista frontal cotada (medidas em mm)',
  subtitulo: 'Esqueleto: silhueta, para-brisa, borda do capô e pneus. O detalhe é decidido no 3D contra a referência.',
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
    intencao: 'vista frontal do cupê fastback só com o esqueleto, para a pessoa julgar a largura, a queda da estufa e o para-brisa',
    procedencias: [
      { id: 'tabela', tipo: 'medidas-declaradas', evidencia: 'decisões da pessoa de 2026-11-14 no plano do carro: largura 1900, altura 1380 e pneu de 680' },
      { id: 'carater', tipo: 'referencia-raster-derivada', evidencia: 'imagem frontal gerada por IA, fora do repositório: posições lidas na escala da largura; não vale como medida' },
    ],
    incertezas: [
      { id: 'bitola', sobre: 'bitola de 1620 e pneu de 270 de largura', fonte: 'carater', efeito: 'diagnostico', motivo: 'lidos na imagem; a tabela não os fixa' },
      { id: 'estufa', sobre: 'queda da estufa e largura do teto', fonte: 'carater', efeito: 'diagnostico', motivo: 'posições lidas a olho, com erro da ordem de 20 mm; a pessoa aprova a forma' },
    ],
  },
  camadas: [
    { vista: 'frontal', contorno: true, nome: 'silhuetaFrontal', tipo: 'filete', fechado: true, pts: silhueta },
    { vista: 'frontal', classe: 'vidro', nome: 'paraBrisa', tipo: 'filete', fechado: true, pts: [[-715, 990, 20], [715, 990, 20], [495, 1300, 80], [0, 1318, 6000], [-495, 1300, 80]] },
    { vista: 'frontal', classe: 'painel', nome: 'bordaDoCapo', tipo: 'filete', pts: [[-640, 700], [0, 760, 3000], [640, 700]] },
    { vista: 'frontal', classe: 'roda', nome: 'pneuEsq', tipo: 'filete', pts: pneu(1), foraDoContorno: true, motivoForaDoContorno: motivoRoda },
    { vista: 'frontal', classe: 'roda', nome: 'pneuDir', tipo: 'filete', pts: pneu(-1), foraDoContorno: true, motivoForaDoContorno: motivoRoda },
  ],
  landmarks: [
    { id: 'largura', vista: 'frontal', em: [xMax + 2, 600], sobre: 'silhuetaFrontal', rotuloEm: [xMax + 60, 650] },
    { id: 'teto', vista: 'frontal', em: [0, M.altura], sobre: 'silhuetaFrontal', rotuloEm: [60, M.altura + 60] },
  ],
  cotas: [
    { vista: 'frontal', de: [-xMax, 0], ate: [xMax, 0], desloca: [0, 56], extensao: true, texto: mil(M.largura) },
    { vista: 'frontal', de: [-M.bitola / 2, 0], ate: [M.bitola / 2, 0], desloca: [0, 26], extensao: true, texto: mil(M.bitola) },
    { vista: 'frontal', de: [-xMax, 0], ate: [-xMax, M.altura], desloca: [-40, 0], extensao: true, texto: mil(M.altura) },
  ],
  legenda: {
    x: 150, y: 620,
    itens: [
      ['#1c2733', 'silhueta da lataria e borda do capô'],
      ['#3d6b86', 'para-brisa, pela borda de fora da moldura'],
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
