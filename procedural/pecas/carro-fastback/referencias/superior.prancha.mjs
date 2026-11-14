#!/usr/bin/env node
/* superior.prancha.mjs — a vista de cima cotada do carro-fastback, quarta das quatro vistas da prancha alvo
 * (skill desenhar-prancha, contrato docs/modelar/usar/CONTRATO-AUTORIA-PRANCHA.md).
 *
 *   node procedural/pecas/carro-fastback/referencias/superior.prancha.mjs
 *
 * Grava, ao lado deste arquivo, `superior.prancha.svg` e `superior.prancha.relatorio.json`, e imprime o relatório. Sai
 * com 1 se o relatório trouxer alerta ou o desenho trouxer colisão.
 *
 * A prancha guarda só o esqueleto: comprimento, largura, silhueta de cima com o ombro dianteiro, a cintura das portas e o
 * quadril traseiro, para-brisa, vidro traseiro e vidros laterais vistos de cima. Tomadas do capô, retrovisores, lanternas
 * e o contorno da tampa são decididos sobre a chapa, no 3D lido contra a referência (decisão da pessoa em 2026-11-14, no
 * plano do carro).
 *
 * Derivada das medidas aprovadas (comprimento 4750, largura 1900). A imagem de cima de caráter foi gerada por IA, fica
 * fora do repositório e não vale como medida. Pelo comprimento da lataria (2414 px na imagem de 2752 px), a escala é de
 * 1,968 mm por pixel, e a largura sai 1901 mm, a 0,1% da tabela; a silhueta foi medida por coluna de pixel nessa escala e
 * os vidros pela cor e a olho.
 *
 * Referencial da planta: z para a frente (à direita no desenho), x para a esquerda do carro (para baixo no desenho),
 * centrado no comprimento e na largura. A imagem tem a frente à esquerda; a leitura contra ela usa `--espelhar`.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { examinarDesenho, imprimirRelatorio, prancha } from '../../../../tools/modelar/prancha/prancha.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = join(AQUI, 'superior.prancha');

/* ------------------------------------------------------------ medidas rígidas */
export const M = {
  comprimento: 4750,
  largura: 1900,
};
const zMax = M.comprimento / 2;
const xMax = M.largura / 2;

/* metade do lado esquerdo do carro, [z, x, raio], da ponta da frente à ponta de trás (medida por coluna de pixel, em mm) */
const metade = [
  [2373, 250, 600], [2330, 500, 30], [2290, 560, 60], [2200, 690, 300], [2000, 850, 500], [1750, 925, 600], [1500, 950, 3000],
  [1150, 948, 300], [1000, 915, 200], [300, 912, 5000], [-750, 912, 3000], [-950, 940, 300], [-1300, 950, 2000],
  [-1700, 930, 800], [-2050, 840, 800], [-2250, 690, 300], [-2340, 400, 400], [-2372, 120, 600],
];
const espelho = (pts) => pts.map(([z, x, r]) => (r === undefined ? [z, -x] : [z, -x, r]));
const silhueta = [[zMax + 3, 0, 4000], ...metade, [-zMax - 4, 0, 4000], ...espelho(metade).reverse()];
const vidroLateral = [[640, 765, 30], [300, 790, 1500], [-500, 772, 3000], [-900, 735, 1500], [-1180, 680, 200], [-1235, 640, 40], [-1000, 627, 2000], [-300, 616, 3000], [150, 640, 300], [450, 700, 600]];
const paraBrisa = [[985, 0, 3000], [870, 680, 200], [760, 722, 40], [300, 632, 400], [160, 575, 40], [215, 0, 5000]];
const vidroTraseiro = [[-975, 0, 5000], [-955, 532, 60], [-1500, 502, 3000], [-1680, 445, 200], [-1795, 0, 1500]];
const fechar = (metadeV) => [...metadeV, ...espelho(metadeV.slice(1, -1)).reverse()];
const mil = (v) => Math.round(v).toLocaleString('pt-BR');

/* ------------------------------------------------------------ especificação */
const ESCALA = 0.15;
const V = { planta: { x: 90, y: 150, leitura: 'projecao', rotuloEm: [90, 110], rotulo: 'SUPERIOR' } };

export const ESPEC = {
  titulo: 'carro-fastback — vista de cima cotada (medidas em mm)',
  subtitulo: 'Esqueleto: silhueta, para-brisa, vidro traseiro e vidros laterais. O detalhe é decidido no 3D contra a referência.',
  escala: ESCALA,
  tela: { largura: 900, altura: 600 },
  limites: { zMin: -zMax, zMax, yMax: 1380, xMax },
  vistas: V,
  envelope: { comprimento: M.comprimento, largura: M.largura },
  autoria: {
    versao: 'mecanifica.prancha-autoria@1',
    estado: 'pronta',
    modo: 'parcial',
    confianca: 'media',
    intencao: 'vista de cima do cupê fastback só com o esqueleto, para a pessoa julgar a cintura, os ombros e os vidros',
    procedencias: [
      { id: 'tabela', tipo: 'medidas-declaradas', evidencia: 'decisões da pessoa de 2026-11-14 no plano do carro: comprimento 4750 e largura 1900' },
      { id: 'carater', tipo: 'referencia-raster-derivada', evidencia: 'imagem de cima gerada por IA, fora do repositório: silhueta medida por coluna de pixel na escala do comprimento; não vale como medida' },
    ],
    incertezas: [
      { id: 'vidros', sobre: 'cantos do para-brisa, do vidro traseiro e dos vidros laterais', fonte: 'carater', efeito: 'diagnostico', motivo: 'lidos pela cor e a olho, com erro da ordem de 20 mm; a pessoa aprova a forma' },
    ],
  },
  camadas: [
    { vista: 'planta', contorno: true, nome: 'silhuetaSuperior', tipo: 'filete', fechado: true, pts: silhueta },
    { vista: 'planta', classe: 'vidro', nome: 'paraBrisa', tipo: 'filete', fechado: true, pts: fechar(paraBrisa) },
    { vista: 'planta', classe: 'vidro', nome: 'vidroTraseiro', tipo: 'filete', fechado: true, pts: fechar(vidroTraseiro) },
    { vista: 'planta', classe: 'vidro', nome: 'vidroLateralEsq', tipo: 'filete', fechado: true, pts: vidroLateral },
    { vista: 'planta', classe: 'vidro', nome: 'vidroLateralDir', tipo: 'filete', fechado: true, pts: espelho(vidroLateral) },
  ],
  landmarks: [
    { id: 'ponta', vista: 'planta', em: [zMax, 0], sobre: 'silhuetaSuperior', rotuloEm: [zMax - 500, -1150] },
    { id: 'quadril', vista: 'planta', em: [-1300, xMax], sobre: 'silhuetaSuperior', rotuloEm: [-1100, xMax + 200] },
  ],
  cotas: [
    { vista: 'planta', de: [-zMax, xMax], ate: [zMax, xMax], desloca: [0, 40], extensao: true, texto: mil(M.comprimento) },
    { vista: 'planta', de: [zMax, -xMax], ate: [zMax, xMax], desloca: [40, 0], extensao: true, texto: mil(M.largura) },
  ],
  legenda: {
    x: 90, y: 505,
    itens: [
      ['#1c2733', 'silhueta da lataria vista de cima'],
      ['#3d6b86', 'para-brisa, vidro traseiro e vidros laterais vistos de cima'],
    ],
    notas: [`Largura ${mil(M.largura)} sem retrovisores; frente à direita.`],
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
