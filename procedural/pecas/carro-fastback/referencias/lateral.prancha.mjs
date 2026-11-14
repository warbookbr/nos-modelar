#!/usr/bin/env node
/* lateral.prancha.mjs — a vista lateral cotada do carro-fastback, primeira das quatro vistas da prancha alvo
 * (skill desenhar-prancha, contrato docs/modelar/usar/CONTRATO-AUTORIA-PRANCHA.md).
 *
 *   node procedural/pecas/carro-fastback/referencias/lateral.prancha.mjs
 *
 * Grava, ao lado deste arquivo, `lateral.prancha.svg` e `lateral.prancha.relatorio.json`, e imprime o relatório. Sai com 1
 * se o relatório trouxer alerta ou o desenho trouxer colisão. O PNG sai do SVG por `node tools/modelar/olhar.mjs`.
 *
 * A prancha é DERIVADA das medidas aprovadas pela pessoa em 2026-11-14 (plano docs/modelar/planos/2026-11-14-modelagem-de-carro.md):
 * divergiu, a tabela manda. A imagem lateral de caráter foi gerada por IA, fica fora do repositório e não vale como medida:
 * dela vêm só as posições em proporção. Cada ponto foi lido em pixel e levado a milímetro por trechos, na horizontal do
 * para-choque de trás ao eixo traseiro, do eixo traseiro ao dianteiro e dele à ponta da frente, e na vertical pela fração da
 * altura total. Pela escala do entre-eixos a imagem tem 4.367 mm de comprimento (8% abaixo da tabela), 1.471 de altura
 * (7% acima) e pneu de 705 mm (4% acima); a tabela prevalece nas três.
 *
 * Referencial: y para cima com o chão em y = 0, a frente em +z (à direita no desenho), centrado no comprimento total.
 *
 * Calibração, escrita antes do traçado (skill, passo 1):
 *   comprimento 4750 = balanço dianteiro 1030 + entre-eixos 2720 + balanço traseiro 1000 (os 2.030 mm de balanço divididos
 *   na razão da imagem, 474 px na frente e 460 atrás);
 *   eixo dianteiro em z = 2375 - 1030 = 1345 e traseiro em z = -2375 + 1000 = -1375;
 *   pneu de 680 mm, centro da roda em y = 340, aro de 19 polegadas (483 mm);
 *   arco da roda com raio 380 no centro da roda, 40 mm sobre o pneu, na razão da imagem (222 px de arco para 200 de pneu);
 *   altura 1380 no pico do teto; base da saia em y 170. A largura de 1900 não aparece nesta vista.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { examinarDesenho, imprimirRelatorio, prancha } from '../../../../tools/modelar/prancha/prancha.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = join(AQUI, 'lateral.prancha');

/* ------------------------------------------------------------ medidas rígidas */
export const M = {
  comprimento: 4750,
  largura: 1900,
  altura: 1380,
  entreEixos: 2720,
  balancoDianteiro: 1030,
  balancoTraseiro: 1000,
  pneuDiametro: 680,
  aroDiametro: 483,
  arcoRaio: 380,
  soleira: 170,
  fundoTraseiro: 250,
};
if (M.balancoDianteiro + M.entreEixos + M.balancoTraseiro !== M.comprimento) throw new Error('balanços + entre-eixos ≠ comprimento');

const zFrente = M.comprimento / 2;
const zTras = -M.comprimento / 2;
const zD = zFrente - M.balancoDianteiro; // 1345
const zT = zTras + M.balancoTraseiro; // -1375
const R = M.pneuDiametro / 2;
const dz = (y) => Math.sqrt(M.arcoRaio ** 2 - (y - R) ** 2);
if (zD + M.arcoRaio >= zFrente || zT - M.arcoRaio <= zTras) throw new Error('arco fora do balanço');

/* ------------------------------------------------------------ pontos de caráter, em [z, y] */
const P = {
  labio: [zFrente, 212],
  nariz: [2200, 797],
  basePB: [790, 1005],
  topoPB: [125, 1331],
  pico: [-320, 1394.5], // vértice do filete; o teto passa em 1380
  quedaMeio: [-728, 1341.4],
  quedaJoelho: [-1000, 1305],
  baseTampa: [-1945, 1045],
  spoiler: [-2190, 1053],
  lanternaTopo: [-2170, 920],
  lanternaBase: [-2300, 790],
};
const mil = (v) => Math.round(v).toLocaleString('pt-BR');

/* o arco da roda, da ponta de trás à da frente, pelo alto; as pontas ficam nas alturas dadas */
function arco(zc, yTras, yFrente, n = 40) {
  const a0 = Math.PI - Math.asin((yTras - R) / M.arcoRaio);
  const a1 = Math.asin((yFrente - R) / M.arcoRaio);
  return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [zc + M.arcoRaio * Math.cos(a), R + M.arcoRaio * Math.sin(a)]; });
}

/* ------------------------------------------------------------ especificação */
const ESCALA = 0.3;
const V = { lateral: { x: 110, y: 190, leitura: 'projecao', rotuloEm: [110, 120], rotulo: 'LATERAL DIREITA (LADO -X), FRENTE À DIREITA' } };
const motivoRoda = 'na lateral a roda desce abaixo da saia e fica dentro do arco, que é abertura da silhueta';

const LANDMARKS = [
  { id: 'eixoD', vista: 'lateral', em: [zD, R], rotuloEm: [zD - 60, R - 70] },
  { id: 'eixoT', vista: 'lateral', em: [zT, R], rotuloEm: [zT - 60, R - 70] },
  { id: 'nariz', vista: 'lateral', em: P.nariz, sobre: 'nariz', rotuloEm: [2230, 900] },
  { id: 'basePB', vista: 'lateral', em: P.basePB, sobre: 'capo', rotuloEm: [800, 1090] },
  { id: 'topoPB', vista: 'lateral', em: [260, 1264.8], sobre: 'paraBrisaETeto', rotuloEm: [330, 1335] },
  { id: 'pico', vista: 'lateral', em: [-320, M.altura], sobre: 'paraBrisaETeto', rotuloEm: [-420, 1460] },
  { id: 'baseVigia', vista: 'lateral', em: [-1690, 1115.2], sobre: 'quedaDoFastback', rotuloEm: [-1640, 1240] },
  { id: 'spoiler', vista: 'lateral', em: P.spoiler, sobre: 'quedaDoFastback', rotuloEm: [-2180, 1150] },
  { id: 'arcoD', vista: 'lateral', em: [zD, R + M.arcoRaio], sobre: 'arcoDianteiro', rotuloEm: [zD + 90, 775] },
  { id: 'arcoT', vista: 'lateral', em: [zT, R + M.arcoRaio], sobre: 'arcoTraseiro', rotuloEm: [zT - 140, 790] },
  { id: 'saia', vista: 'lateral', em: [0, M.soleira], sobre: 'soleira', rotuloEm: [60, 90] },
  { id: 'cinturaB', vista: 'lateral', em: [-657, 996], sobre: 'cintura', rotuloEm: [-560, 1070] },
  { id: 'ombroT', vista: 'lateral', em: [-1700, 1002.9], sobre: 'ombroDoParaLama', rotuloEm: [-1780, 900] },
  { id: 'rebaixo', vista: 'lateral', em: [0, 790.3], sobre: 'rebaixoTopo', rotuloEm: [40, 700] },
];

export const ESPEC = {
  titulo: 'carro-fastback — vista lateral cotada (medidas em mm)',
  subtitulo: 'Cupê fastback de duas portas, medidas aprovadas em 2026-11-14. Derivada da tabela: divergiu, a tabela manda.',
  escala: ESCALA,
  tela: { largura: 1680, altura: 900 },
  limites: { zMin: zTras, zMax: zFrente, yMax: M.altura, xMax: M.largura / 2 },
  vistas: V,
  envelope: { comprimento: M.comprimento, altura: M.altura },
  autoria: {
    versao: 'mecanifica.prancha-autoria@1',
    estado: 'pronta',
    modo: 'parcial',
    confianca: 'media',
    intencao: 'vista lateral do cupê fastback, com as curvas de caráter nomeadas, para a pessoa julgar a proporção antes das outras três vistas',
    procedencias: [
      { id: 'tabela', tipo: 'medidas-declaradas', evidencia: 'decisões da pessoa de 2026-11-14 no plano do carro: comprimento 4750, largura 1900, altura 1380, entre-eixos 2720 e pneu de 680' },
      { id: 'carater', tipo: 'referencia-raster-derivada', evidencia: 'imagem lateral gerada por IA, fora do repositório: posições lidas em proporção, por trechos entre as pontas e os eixos e pela fração da altura; não vale como medida' },
    ],
    incertezas: [
      { id: 'balancos', sobre: 'divisão dos 2030 mm de balanço em 1030 na frente e 1000 atrás', fonte: 'carater', efeito: 'diagnostico', motivo: 'a tabela fixa comprimento e entre-eixos; a divisão segue a razão da imagem, que tem balanços 19% mais curtos que os da tabela' },
      { id: 'altura', sobre: 'alturas do capô, da cintura, do ombro e da tampa', fonte: 'carater', efeito: 'diagnostico', motivo: 'lidas como fração da altura da imagem, que é 7% mais alta que a tabela pela escala do entre-eixos; com as rodas na medida da tabela, a faixa de lataria sobre os arcos fica mais baixa que na imagem' },
      { id: 'arcos', sobre: 'raio de 380 dos arcos e saia em 170', fonte: 'carater', efeito: 'diagnostico', motivo: 'razão lida na imagem; nenhuma medida da tabela os fixa' },
      { id: 'linhas', sobre: 'portas, vidros, cintura, ombro e rebaixo da lateral', fonte: 'carater', efeito: 'diagnostico', motivo: 'posições lidas a olho em recortes da imagem, com erro da ordem de 25 mm; a pessoa aprova a forma' },
    ],
  },
  camadas: [
    /* 1. silhueta, no sentido horário a partir da ponta da frente do arco dianteiro */
    { vista: 'lateral', contorno: true, nome: 'nariz', tipo: 'filete', pts: [[zD + dz(M.soleira), M.soleira], [2000, M.soleira, 300], P.labio, [2372, 234], [2335, 262, 10], [2330, 380, 60], [2362, 440, 80], [2345, 572, 300], [2366, 705, 40], P.nariz] },
    { vista: 'lateral', contorno: true, nome: 'capo', tipo: 'filete', pts: [P.nariz, [1700, 950, 3000], [1100, 1000, 4000], P.basePB], esperado: { inversoesMax: 1 } },
    { vista: 'lateral', contorno: true, nome: 'paraBrisaETeto', tipo: 'filete', pts: [P.basePB, [...P.topoPB, 600], [...P.pico, 2500], P.quedaMeio], esperado: { inversoesMax: 0, raioMinMin: 400 } },
    { vista: 'lateral', contorno: true, nome: 'quedaDoFastback', tipo: 'filete', pts: [P.quedaMeio, [...P.quedaJoelho, 2500], [...P.baseTampa, 300], P.spoiler], esperado: { inversoesMax: 1, raioMinMin: 300 } },
    { vista: 'lateral', contorno: true, nome: 'traseira', tipo: 'filete', pts: [P.spoiler, [-2214, 1036, 6], [-2228, 960, 30], [-2245, 861, 150], [-2310, 762, 80], [zTras, 712, 40], [zTras, 668, 30], [-2340, 580, 150], [zTras, 500, 40], [zTras, 455, 30], [-2331, 410, 20], [-2273, 299, 60], [-2114, 266, 200], [-1900, 245, 80], [zT - dz(M.fundoTraseiro), M.fundoTraseiro]] },
    { vista: 'lateral', contorno: true, nome: 'arcoTraseiro', tipo: 'poli', pts: arco(zT, M.fundoTraseiro, M.soleira) },
    { vista: 'lateral', contorno: true, nome: 'soleira', tipo: 'poli', pts: [[zT + dz(M.soleira), M.soleira], [zD - dz(M.soleira), M.soleira]], esperado: { inversoesMax: 0 } },
    { vista: 'lateral', contorno: true, nome: 'arcoDianteiro', tipo: 'poli', pts: arco(zD, M.soleira, M.soleira) },
    /* 2. aberturas: os vidros */
    { vista: 'lateral', classe: 'vidro', nome: 'vidroDaPorta', tipo: 'filete', fechado: true, pts: [[510, 972, 6], [497, 1008, 10], [189, 1192, 400], [0, 1262, 300], [-300, 1303, 1500], [-680, 1268, 20], [-672, 996, 15]] },
    /* a faixa do para-brisa que se vê de lado, entre a silhueta e a coluna A: sem ela a coluna se lia com 120 mm */
    { vista: 'lateral', classe: 'vidro', nome: 'paraBrisaDeLado', tipo: 'poli', fechado: true, pts: [[760, 1010], [660, 975], [404, 1121], [228, 1218], [120, 1272], [175, 1292], [420, 1178]] },
    { vista: 'lateral', classe: 'vidro', nome: 'vidroTraseiroLateral', tipo: 'filete', fechado: true, pts: [[-692, 1000, 10], [-702, 1262, 15], [-960, 1208, 1200], [-1235, 1108, 18], [-1110, 1034, 120], [-900, 1012, 800]] },
    /* 3. cortes de painel */
    { vista: 'lateral', classe: 'painel', nome: 'porta', tipo: 'filete', fechado: true, pts: [[615, 955], [690, 850, 200], [660, 420, 400], [590, 250, 90], [-545, 250, 110], [-640, 470, 500], [-722, 850, 300], [-682, 997]] },
    { vista: 'lateral', classe: 'painel', nome: 'saia', tipo: 'poli', pts: [[zT + dz(203), 203], [zD - dz(203), 203]] },
    { vista: 'lateral', classe: 'painel', nome: 'parachoqueTraseiroDeLado', tipo: 'filete', pts: [[zT - dz(640), 640], [-2021, 668, 120], [-2190, 793]] },
    /* 4. curvas de caráter */
    { vista: 'lateral', classe: 'carater', nome: 'cintura', tipo: 'filete', pts: [[900, 940], [615, 955, 3000], [-657, 996]], esperado: { inversoesMax: 0 } },
    { vista: 'lateral', classe: 'carater', nome: 'ombroDoParaLama', tipo: 'filete', pts: [[-820, 930], [-1000, 970, 500], [-1300, 996, 1500], [-2000, 1008]], esperado: { inversoesMax: 0 } },
    { vista: 'lateral', classe: 'carater', nome: 'rebaixoTopo', tipo: 'filete', pts: [[1760, 740], [-724, 811, 1500], [-1023, 836]], esperado: { inversoesMax: 0 } },
    { vista: 'lateral', classe: 'carater', nome: 'rebaixoBase', tipo: 'filete', pts: [[845, 345], [-618, 420, 800], [-1000, 640, 500], [-1250, 715]], esperado: { inversoesMax: 1 } },
    /* 5. detalhe */
    { vista: 'lateral', classe: 'painel', nome: 'farol', tipo: 'filete', fechado: true, pts: [[2249, 699, 10], [1764, 729], [1895, 630, 60], [2025, 613, 200], [2240, 604, 15]] },
    { vista: 'lateral', classe: 'painel', nome: 'lanterna', tipo: 'filete', fechado: true, pts: [[-2180, 927, 8], [-2216, 927, 8], [-2232, 861, 120], [-2290, 764, 6], [-2262, 754, 10], [-2201, 795, 60], [-2160, 850, 80]] },
    { vista: 'lateral', classe: 'painel', nome: 'macaneta', tipo: 'filete', fechado: true, pts: [[-389, 874, 18], [-645, 874, 18], [-645, 818, 18], [-389, 818, 18]] },
    { vista: 'lateral', classe: 'painel', nome: 'retrovisor', tipo: 'filete', fechado: true, pts: [[450, 1095, 30], [195, 1095, 30], [195, 985, 30], [400, 955, 20]] },
    /* recortes de baixo, lidos na imagem: aberturas na chapa com a peça por trás (fatia 5); a frontal e a traseira também os mostram */
    { vista: 'lateral', classe: 'painel', nome: 'luzDeCanto', tipo: 'filete', fechado: true, pts: [[2250, 420, 5], [2140, 420, 5], [2105, 382, 5], [2250, 382, 5]] },
    { vista: 'lateral', classe: 'painel', nome: 'entradaDeNeblina', tipo: 'filete', fechado: true, pts: [[2223, 376, 6], [2112, 376, 6], [2006, 272, 6], [2215, 272, 6]] },
    { vista: 'lateral', classe: 'painel', nome: 'refletorTraseiro', tipo: 'filete', fechado: true, pts: [[-2001, 450, 8], [-2186, 458, 8], [-2160, 420, 8], [-2020, 416, 8]] },
    { vista: 'lateral', classe: 'painel', nome: 'recorteDoDifusor', tipo: 'filete', pts: [[-2362, 452], [-2295, 398, 30], [-2114, 290, 150], [-1880, 258]] },
    /* rodas */
    { vista: 'lateral', classe: 'roda', nome: 'pneuDianteiro', tipo: 'circulo', centro: [zD, R], raio: R, foraDoContorno: true, motivoForaDoContorno: motivoRoda },
    { vista: 'lateral', classe: 'roda', nome: 'pneuTraseiro', tipo: 'circulo', centro: [zT, R], raio: R, foraDoContorno: true, motivoForaDoContorno: motivoRoda },
    { vista: 'lateral', classe: 'aro', nome: 'aroDianteiro', tipo: 'circulo', centro: [zD, R], raio: M.aroDiametro / 2, foraDoContorno: true, motivoForaDoContorno: motivoRoda },
    { vista: 'lateral', classe: 'aro', nome: 'aroTraseiro', tipo: 'circulo', centro: [zT, R], raio: M.aroDiametro / 2, foraDoContorno: true, motivoForaDoContorno: motivoRoda },
  ],
  landmarks: LANDMARKS,
  cotas: [
    { vista: 'lateral', de: [zT, 0], ate: [zD, 0], desloca: [0, 26], extensao: true, texto: mil(M.entreEixos) },
    { vista: 'lateral', de: [zD, 0], ate: [zFrente, 0], desloca: [0, 26], extensao: true, texto: mil(M.balancoDianteiro) },
    { vista: 'lateral', de: [zTras, 0], ate: [zT, 0], desloca: [0, 26], extensao: true, texto: mil(M.balancoTraseiro) },
    { vista: 'lateral', de: [zTras, 0], ate: [zFrente, 0], desloca: [0, 56], extensao: true, texto: mil(M.comprimento) },
    { vista: 'lateral', de: [-320, 0], ate: [-320, M.altura], desloca: [(zFrente + 320) * ESCALA + 110, 0], extensao: true, texto: mil(M.altura) },
    { vista: 'lateral', de: [P.basePB[0], 0], ate: P.basePB, desloca: [(zFrente - P.basePB[0]) * ESCALA + 70, 0], extensao: true, texto: mil(P.basePB[1]) },
    { vista: 'lateral', de: [P.nariz[0], 0], ate: P.nariz, desloca: [(zFrente - P.nariz[0]) * ESCALA + 30, 0], extensao: true, texto: mil(P.nariz[1]) },
    { vista: 'lateral', de: [P.spoiler[0], 0], ate: P.spoiler, desloca: [(zTras - P.spoiler[0]) * ESCALA - 40, 0], extensao: true, texto: mil(P.spoiler[1]) },
    { vista: 'lateral', de: [zT - R, R], ate: [zT + R, R], numero: [0, -10], texto: `⌀ ${mil(M.pneuDiametro)}` },
  ],
  legenda: {
    x: 110, y: 730,
    itens: [
      ['#1c2733', 'contorno da lataria, cortes de painel (porta, saia, para-choque de trás) e recortes de baixo (neblina, luz de canto, refletor, difusor)'],
      ['#3d6b86', 'vidros, pela borda de fora da moldura: porta, lateral traseiro e a faixa do para-brisa vista de lado'],
      ['#b3593d', 'tracejado laranja: curvas de caráter (cintura, ombro do para-lama, topo do rebaixo em cunha desde o farol, base dele subindo à anca traseira) e cotas em mm'],
      ['#1f6f5c', 'landmarks, em [z, y]'],
    ],
    notas: [
      `Calibração: ${M.balancoTraseiro} + ${M.entreEixos} + ${M.balancoDianteiro} = ${M.comprimento}; pneu de ${M.pneuDiametro}, aro de 19 polegadas, arcos de raio ${M.arcoRaio}, saia em ${M.soleira}.`,
      'Queda do fastback: do pico do teto (z -320) ao começo da tampa (z -1945, y 1045), com a base do vidro traseiro em z -1690, e o lábio do spoiler em y 1053.',
      'Posições lidas em proporção da imagem de caráter; pela escala do entre-eixos ela tem 4.367 de comprimento e 1.471 de altura, e a tabela prevalece.',
    ],
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
