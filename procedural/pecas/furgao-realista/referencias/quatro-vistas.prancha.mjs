#!/usr/bin/env node
/* quatro-vistas.prancha.mjs — a prancha ortográfica cotada do furgao-realista, alvo de medida das etapas de modelagem
 * (skill desenhar-prancha, contrato docs/modelar/usar/CONTRATO-AUTORIA-PRANCHA.md).
 *
 *   node procedural/pecas/furgao-realista/referencias/quatro-vistas.prancha.mjs
 *
 * Grava, ao lado deste arquivo, `quatro-vistas.prancha.svg` (o desenho) e `quatro-vistas.prancha.relatorio.json` (o
 * relatório medido do motor e as colisões do desenho), e imprime o relatório. Sai com 1 se o relatório trouxer alerta ou
 * o desenho trouxer colisão. O PNG sai do SVG por `node tools/modelar/olhar.mjs`.
 *
 * A prancha é DERIVADA das medidas do alinhamento
 * (docs/modelar/banco-de-provas/furgao-realista-2026-10-30/ALINHAMENTO.md): divergiu, o alinhamento e a TABELA da
 * receita mandam. Referencial da receita: y para cima com o chão em y = 0, a frente em +z, x para a direita de quem olha
 * o furgão de frente (o lado direito do furgão é o -x), centrado em x e em z no comprimento total.
 *
 * Calibração, escrita antes do traçado (skill, passo 1):
 *   comprimento 5400 = balanço dianteiro 980 + entre-eixos 3300 + balanço traseiro 1120;
 *   eixo dianteiro em z = 2700 - 980 = 1720 e traseiro em z = -2700 + 1120 = -1580;
 *   pneu 225/65 aro 16: diâmetro 710 (o do alinhamento), largura 225, centro da roda em y = 355;
 *   bitola 1700: meia bitola 850 + meia largura do pneu 112,5 = 962,5 < meia largura 1000 (sobram 37,5 mm por lado);
 *   arco da roda com raio 420 no centro da roda: 65 mm de folga sobre o pneu, e o arco dianteiro (z 1300 a 2140) fica
 *   dentro do balanço e atrás do para-choque (2700), o traseiro (z -2000 a -1160) à frente do para-choque (-2700);
 *   soleira em y = 300, altura 2500 no teto, largura 2000 sem retrovisores.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarAncoras, examinarDesenho, imprimirRelatorio, prancha } from '../../../../tools/modelar/prancha/prancha.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = join(AQUI, 'quatro-vistas.prancha');

/* ------------------------------------------------------------ medidas rígidas */
const M = {
  comprimento: 5400,
  largura: 2000,
  altura: 2500,
  entreEixos: 3300,
  balancoDianteiro: 980,
  balancoTraseiro: 1120,
  bitola: 1700,
  pneuDiametro: 710,
  pneuLargura: 225,
  aroDiametro: 406, // aro 16 polegadas
  arcoRaio: 420,
  soleira: 300,
};
if (M.balancoDianteiro + M.entreEixos + M.balancoTraseiro !== M.comprimento) throw new Error('balanços + entre-eixos ≠ comprimento');
if (M.bitola / 2 + M.pneuLargura / 2 >= M.largura / 2) throw new Error('o pneu não cabe sob a carroceria');

/* As âncoras do motor põem o meio do entre-eixos em z = 0; a receita centra o comprimento total. O deslocamento leva
   uma à outra: o meio do entre-eixos fica em z = (1120 - 980) / 2 = 70. */
const A = criarAncoras({ entreEixos: M.entreEixos, altura: M.altura, meiaLargura: M.largura / 2 });
const DZ = (M.balancoTraseiro - M.balancoDianteiro) / 2;
const fz = (f) => A.fz(f) + DZ;
const zD = fz(1); // 1720
const zT = fz(0); // -1580
const zFrente = M.comprimento / 2; // 2700
const zTras = -M.comprimento / 2; // -2700
const xMax = M.largura / 2; // 1000
const R = M.pneuDiametro / 2; // 355
if (zFrente - zD !== M.balancoDianteiro || zT - zTras !== M.balancoTraseiro) throw new Error('eixos fora dos balanços');
if (zD - M.arcoRaio <= 0 || zD + M.arcoRaio >= zFrente || zT - M.arcoRaio <= zTras) throw new Error('arco fora do balanço');

/* ------------------------------------------------------------ perfil lateral */
/* Pontos de caráter do perfil, em [z, y]. Bico curto: para-choque em 2700, boca do capô em 2640 a 1060 de altura, capô
   curto e inclinado até a base do para-brisa (2020, 1230), para-brisa a cerca de 50 graus até o topo (1380, 1990), testa
   do teto alto até 2500, teto reto até a traseira vertical em -2670 e o degrau do para-choque traseiro em 570. */
const P = {
  parachoqueTopo: [zFrente, 720],
  boca: [2640, 1060],
  baseVidro: [2020, 1230],
  topoVidro: [1380, 1990],
  testa: [1180, M.altura],
  quinaTraseira: [-2670, M.altura],
  degrau: [-2670, 570],
};
const meio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/* Onde o arco corta a soleira: a abertura da roda interrompe a linha de baixo. */
const dzArco = Math.sqrt(M.arcoRaio ** 2 - (M.soleira - R) ** 2);
function arco(zc) {
  const a0 = Math.atan2(M.soleira - R, -dzArco);
  const a1 = Math.atan2(M.soleira - R, dzArco);
  const pts = [];
  const n = 48;
  let ini = a0; const fim = a1;
  if (ini < 0) ini += 2 * Math.PI; // de 187,5° descendo por 90° até -7,5°
  for (let i = 0; i <= n; i += 1) {
    const ang = ini + ((fim - ini) * i) / n;
    pts.push([zc + M.arcoRaio * Math.cos(ang), R + M.arcoRaio * Math.sin(ang)]);
  }
  pts[0] = [zc - dzArco, M.soleira];
  pts[n] = [zc + dzArco, M.soleira];
  return pts;
}

/* Linha da porta da cabine e frente do vidro: paralelas à coluna do para-brisa, recuadas 30 mm (a fresta) e 100 mm (o
   vidro), medidas na perpendicular à coluna. */
const coluna = [P.topoVidro[0] - P.baseVidro[0], P.topoVidro[1] - P.baseVidro[1]];
const Lcol = Math.hypot(...coluna);
const normalTras = [-coluna[1] / Lcol, coluna[0] / Lcol]; // aponta para trás e para baixo
const naColuna = (recuo, y) => {
  const b = [P.baseVidro[0] + normalTras[0] * recuo, P.baseVidro[1] + normalTras[1] * recuo];
  return [b[0] + (coluna[0] / coluna[1]) * (y - b[1]), y];
};
const portaCabine = { frente: 1240, tras: 690, base: 380, topo: 1955 };
const vidroCabine = { tras: 760, base: 1200, topo: 1880 };
const portaCorrer = { frente: 620, tras: 620 - 1300, base: 380, topo: 2200 };

/* ------------------------------------------------------------ seção frontal e traseira */
/* Projeção ao longo de z: a caixa de carga é a parte mais larga e mais alta, então frontal e traseira têm o mesmo
   contorno, quase retangular, com a lateral quase vertical (1000 até 1450 de altura, 982 no teto) e a quina do teto
   com raio de 170. */
const silhuetaFrontal = [[-xMax, M.soleira, 30], [xMax, M.soleira, 30], [xMax, 1450, 600], [982, M.altura, 170], [-982, M.altura, 170], [-xMax, 1450, 600]];
const xPneuDentro = M.bitola / 2 - M.pneuLargura / 2; // 737,5
const xPneuFora = M.bitola / 2 + M.pneuLargura / 2; // 962,5
/* De frente e de trás só se vê o pneu abaixo da soleira: a carroceria cobre o resto, e o pneu inteiro cruzava as portas
   traseiras. O diâmetro fica cotado na lateral. */
const pneuDeFrente = (s) => [[s * xPneuDentro, M.soleira], [s * xPneuDentro, 0, 50], [s * xPneuFora, 0, 50], [s * xPneuFora, M.soleira]];
const portaTraseira = (s) => [[s * 6, 590, 20], [s * 900, 590, 40], [s * 900, 2380, 90], [s * 6, 2380, 20]];
const vidroTraseiro = (s) => [[s * 80, 1700, 50], [s * 820, 1700, 50], [s * 820, 2200, 70], [s * 80, 2200, 50]];
const vidroDeFrente = [[-820, 1250, 60], [820, 1250, 60], [790, 1965, 90], [-790, 1965, 90]];

/* ------------------------------------------------------------ planta */
/* Vista de cima, [z, x]: para-choques envolvendo as quinas (raio 280 na frente, 100 atrás). A borda do teto é onde o
   teto plano termina, nas tangentes dos raios da lateral (testa e quina traseira) e da frontal (quina do teto). */
const planta = [[zFrente, -xMax, 280], [zFrente, xMax, 280], [zTras, xMax, 100], [zTras, -xMax, 100]];
const zVidroBase = naColuna(0, 1250)[0];
const zVidroTopo = naColuna(0, 1965)[0];
const vidroDeCima = [[zVidroBase, -820, 60], [zVidroBase, 820, 60], [zVidroTopo, 790, 90], [zVidroTopo, -790, 90]];
const bordaDoTeto = [[975, -809, 100], [975, 809, 100], [-2550, 809, 40], [-2550, -809, 40]];
const pneuDeCima = (zc, s) => [[zc - R, s * xPneuDentro, 40], [zc + R, s * xPneuDentro, 40], [zc + R, s * xPneuFora, 40], [zc - R, s * xPneuFora, 40]];

/* ------------------------------------------------------------ landmarks */
/* `rotulo` é onde o nome vai, fora do corpo, com chamada até o ponto. */
const LANDMARKS = [
  { id: 'eixoD', vista: 'lateral', em: [zD, R], rotuloEm: [zD - 84, R - 90] },
  { id: 'eixoT', vista: 'lateral', em: [zT, R], rotuloEm: [zT - 84, R - 90] },
  { id: 'frente', vista: 'lateral', em: [zFrente, 500], sobre: 'nariz', rotuloEm: [2780, 520] },
  { id: 'boca', vista: 'lateral', em: P.boca, sobre: 'nariz', rotuloEm: [2780, 1080] },
  { id: 'baseVidro', vista: 'lateral', em: P.baseVidro, sobre: 'capoEParaBrisa', rotuloEm: [2780, 1400] },
  { id: 'topoVidro', vista: 'lateral', em: P.topoVidro, sobre: 'colunaA', rotuloEm: [1250, 2640] },
  { id: 'teto', vista: 'lateral', em: [0, M.altura], sobre: 'teto', rotuloEm: [-300, 2640] },
  { id: 'degrau', vista: 'lateral', em: P.degrau, sobre: 'traseira', rotuloEm: [-2760, 600], rotuloAncora: 'end' },
  { id: 'traseira', vista: 'lateral', em: [zTras, 430], sobre: 'traseira', rotuloEm: [-2760, 380], rotuloAncora: 'end' },
  { id: 'soleira', vista: 'lateral', em: [0, M.soleira], sobre: 'soleira', rotuloEm: [-300, 150] },
  { id: 'arcoD', vista: 'lateral', em: [zD, R + M.arcoRaio], sobre: 'arcoDianteiro', rotuloEm: [1800, 830] },
  { id: 'cabineT', vista: 'lateral', em: [portaCabine.tras, 1700], sobre: 'portaDaCabine', rotuloEm: [850, 2640] },
  { id: 'correrF', vista: 'lateral', em: [portaCorrer.frente, 2100], sobre: 'portaDeCorrer', rotuloEm: [450, 2640] },
  { id: 'correrT', vista: 'lateral', em: [portaCorrer.tras, 2100], sobre: 'portaDeCorrer', rotuloEm: [-800, 2640] },
  { id: 'cabineF', vista: 'lateral', em: [portaCabine.frente, 500], sobre: 'portaDaCabine', rotuloEm: [980, 327] },
  { id: 'largura', vista: 'frontal', em: [xMax, 900], sobre: 'silhuetaFrontal', rotuloEm: [1060, 900] },
  { id: 'vaoTraseiro', vista: 'traseira', em: [900, 1500], sobre: 'portaTraseiraEsq', rotuloEm: [1060, 1500], rotuloAncora: 'end' },
  { id: 'bitola', vista: 'planta', em: [zD, M.bitola / 2], rotuloEm: [zD, 1250] },
];
const mil = (v) => Math.round(v).toLocaleString('pt-BR');
const num = (v) => String(v).replace('.', ',');
function linhasDeLandmarks() {
  const itens = LANDMARKS.map((l) => `${l.id} [${l.em.map((v) => Math.round(v)).join(', ')}]`);
  const linhas = [];
  for (let i = 0; i < itens.length; i += 5) linhas.push(itens.slice(i, i + 5).join('   '));
  return linhas;
}

/* ------------------------------------------------------------ especificação */
const ESCALA = 0.16;
const V = {
  lateral: { x: 70, y: 150, leitura: 'projecao', rotuloEm: [70, 96], rotulo: 'LATERAL DIREITA (LADO -X), FRENTE À DIREITA' },
  frontal: { x: 1090, y: 150, leitura: 'projecao', rotuloEm: [1090, 96], rotulo: 'FRONTAL' },
  traseira: { x: 1500, y: 150, leitura: 'projecao', rotuloEm: [1500, 96], rotulo: 'TRASEIRA' },
  planta: { x: 70, y: 720, leitura: 'projecao', rotuloEm: [70, 696], rotulo: 'DE CIMA, FRENTE À DIREITA' },
};

const motivoRodaLateral = 'na lateral a roda desce abaixo da soleira e fica dentro do arco, que é abertura da silhueta';
const motivoAroLateral = 'o aro fica dentro do arco da roda, que é abertura da silhueta na lateral';
const motivoRodaFrente = 'na frontal e na traseira o pneu desce da soleira (300) até o chão; na planta ele fica dentro';

export const ESPEC = {
  titulo: 'furgao-realista — prancha ortográfica cotada (medidas em mm)',
  subtitulo: 'Furgão médio de teto alto, medidas de classe do alinhamento de 2026-10-30. Derivada da tabela: divergiu, a tabela manda.',
  escala: ESCALA,
  tela: { largura: 1900, altura: 1180 },
  limites: { zMin: zTras, zMax: zFrente, yMax: M.altura, xMax },
  vistas: V,
  envelope: { comprimento: M.comprimento, largura: M.largura, altura: M.altura },
  autoria: {
    versao: 'mecanifica.prancha-autoria@1',
    estado: 'pronta',
    modo: 'quatro-vistas',
    confianca: 'media',
    intencao: 'furgão médio de teto alto com cabine de bico curto, alvo de medida das etapas de modelagem do furgao-realista',
    procedencias: [
      {
        id: 'classe',
        tipo: 'medidas-declaradas',
        evidencia: 'ALINHAMENTO.md do furgão realista (2026-10-30): comprimento 5400, largura 2000 sem retrovisores, altura 2500, entre-eixos 3300, pneu 225/65 aro 16 com 710 de diâmetro e 225 de largura; medidas de classe de fichas públicas de furgões médios de teto alto, sem marca nem modelo',
      },
      {
        id: 'proporcao',
        tipo: 'briefing-ficcional',
        evidencia: 'balanços, bitola, soleira, arcos, perfil da cabine, linhas de porta e vidros estimados nesta especificação dentro das proporções da classe e das decisões de forma do alinhamento (bico curto, laterais quase verticais, porta de correr à direita, duas portas traseiras)',
      },
    ],
    incertezas: [
      { id: 'balancos', sobre: 'divisão dos 2100 mm de balanço em 980 na frente e 1120 atrás', fonte: 'proporcao', efeito: 'diagnostico', motivo: 'a classe fixa comprimento e entre-eixos; a divisão varia uns 100 mm entre furgões da classe' },
      { id: 'bitola', sobre: 'bitola de 1700 igual nos dois eixos', fonte: 'proporcao', efeito: 'diagnostico', motivo: 'valor típico da classe, não declarado no alinhamento; a folga de 37,5 mm por lado confere só que o pneu cabe' },
      { id: 'pneu', sobre: 'diâmetro do pneu', fonte: 'classe', efeito: 'diagnostico', motivo: 'o alinhamento diz cerca de 710; a conta nominal do 225/65 aro 16 dá 699' },
      { id: 'cabine', sobre: 'boca do capô, base e topo do para-brisa e testa do teto alto', fonte: 'proporcao', efeito: 'diagnostico', motivo: 'posições estimadas para o bico curto; nenhuma ficha de classe as traz, e a pessoa aprova a forma' },
      { id: 'portas', sobre: 'linhas das portas, vidros e arcos', fonte: 'proporcao', efeito: 'diagnostico', motivo: 'posição e tamanho estimados (porta de correr de 1300, vão traseiro de 1800, arco de raio 420); valem como alvo até a pessoa pedir outro' },
    ],
  },
  camadas: [
    /* 1. silhuetas */
    { vista: 'lateral', contorno: true, nome: 'nariz', tipo: 'filete', pts: [[zD + dzArco, M.soleira], [zFrente, M.soleira, 50], [...P.parachoqueTopo, 30], [2660, 760], [...P.boca, 20], meio(P.boca, P.baseVidro)] },
    { vista: 'lateral', contorno: true, nome: 'capoEParaBrisa', tipo: 'filete', pts: [meio(P.boca, P.baseVidro), [...P.baseVidro, 100], meio(P.baseVidro, P.topoVidro)], esperado: { inversoesMax: 0, raioMinMin: 90 } },
    { vista: 'lateral', contorno: true, nome: 'colunaA', tipo: 'filete', pts: [meio(P.baseVidro, P.topoVidro), [...P.topoVidro, 150], meio(P.topoVidro, P.testa)], esperado: { inversoesMax: 0 } },
    { vista: 'lateral', contorno: true, nome: 'teto', tipo: 'filete', pts: [meio(P.topoVidro, P.testa), [...P.testa, 300], [...P.quinaTraseira, 120], meio(P.quinaTraseira, P.degrau)], esperado: { inversoesMax: 0, concentracaoMax: 0.25, raioMinMin: 110 } },
    { vista: 'lateral', contorno: true, nome: 'traseira', tipo: 'filete', pts: [meio(P.quinaTraseira, P.degrau), P.degrau, [zTras, 570], [zTras, M.soleira, 40], [zT - dzArco, M.soleira]] },
    { vista: 'lateral', contorno: true, nome: 'arcoTraseiro', tipo: 'poli', pts: arco(zT) },
    { vista: 'lateral', contorno: true, nome: 'soleira', tipo: 'poli', pts: [[zT + dzArco, M.soleira], [zD - dzArco, M.soleira]], esperado: { inversoesMax: 0 } },
    { vista: 'lateral', contorno: true, nome: 'arcoDianteiro', tipo: 'poli', pts: arco(zD) },
    { vista: 'frontal', contorno: true, nome: 'silhuetaFrontal', tipo: 'filete', fechado: true, pts: silhuetaFrontal },
    { vista: 'traseira', contorno: true, nome: 'silhuetaTraseira', tipo: 'filete', fechado: true, pts: silhuetaFrontal },
    { vista: 'planta', contorno: true, nome: 'silhuetaDeCima', tipo: 'filete', fechado: true, pts: planta },

    /* 2. aberturas: vidros (os arcos são a própria silhueta lateral) */
    { vista: 'lateral', classe: 'vidro', nome: 'vidroDaCabine', tipo: 'filete', fechado: true, pts: [[...naColuna(100, vidroCabine.base), 30], [...naColuna(100, vidroCabine.topo), 80], [vidroCabine.tras, vidroCabine.topo, 60], [vidroCabine.tras, vidroCabine.base, 40]] },
    { vista: 'frontal', classe: 'vidro', nome: 'paraBrisa', tipo: 'filete', fechado: true, pts: vidroDeFrente },
    { vista: 'planta', classe: 'vidro', nome: 'paraBrisaDeCima', tipo: 'filete', fechado: true, pts: vidroDeCima },
    { vista: 'traseira', classe: 'vidro', nome: 'vidroTraseiroEsq', tipo: 'filete', fechado: true, pts: vidroTraseiro(1) },
    { vista: 'traseira', classe: 'vidro', nome: 'vidroTraseiroDir', tipo: 'filete', fechado: true, pts: vidroTraseiro(-1) },

    /* 3. linhas de porta e borda do teto */
    { vista: 'lateral', classe: 'painel', nome: 'portaDaCabine', tipo: 'filete', fechado: true, pts: [[portaCabine.frente, portaCabine.base, 40], [portaCabine.frente, 880, 200], [...naColuna(30, 1140), 40], [...naColuna(30, portaCabine.topo), 60], [portaCabine.tras, portaCabine.topo, 60], [portaCabine.tras, portaCabine.base, 40]] },
    { vista: 'lateral', classe: 'painel', nome: 'portaDeCorrer', tipo: 'filete', fechado: true, pts: [[portaCorrer.frente, portaCorrer.base, 50], [portaCorrer.frente, portaCorrer.topo, 60], [portaCorrer.tras, portaCorrer.topo, 60], [portaCorrer.tras, portaCorrer.base, 50]] },
    { vista: 'traseira', classe: 'painel', nome: 'portaTraseiraEsq', tipo: 'filete', fechado: true, pts: portaTraseira(1) },
    { vista: 'traseira', classe: 'painel', nome: 'portaTraseiraDir', tipo: 'filete', fechado: true, pts: portaTraseira(-1) },
    { vista: 'planta', classe: 'painel', nome: 'bordaDoTeto', tipo: 'filete', fechado: true, pts: bordaDoTeto },

    /* 4. rodas */
    { vista: 'lateral', classe: 'roda', nome: 'pneuDianteiro', tipo: 'circulo', centro: [zD, R], raio: R, foraDoContorno: true, motivoForaDoContorno: motivoRodaLateral },
    { vista: 'lateral', classe: 'roda', nome: 'pneuTraseiro', tipo: 'circulo', centro: [zT, R], raio: R, foraDoContorno: true, motivoForaDoContorno: motivoRodaLateral },
    { vista: 'lateral', classe: 'aro', nome: 'aroDianteiro', tipo: 'circulo', centro: [zD, R], raio: M.aroDiametro / 2, foraDoContorno: true, motivoForaDoContorno: motivoAroLateral },
    { vista: 'lateral', classe: 'aro', nome: 'aroTraseiro', tipo: 'circulo', centro: [zT, R], raio: M.aroDiametro / 2, foraDoContorno: true, motivoForaDoContorno: motivoAroLateral },
    { vista: 'frontal', classe: 'roda', nome: 'pneuFrontalDir', tipo: 'filete', pts: pneuDeFrente(1), foraDoContorno: true, motivoForaDoContorno: motivoRodaFrente },
    { vista: 'frontal', classe: 'roda', nome: 'pneuFrontalEsq', tipo: 'filete', pts: pneuDeFrente(-1), foraDoContorno: true, motivoForaDoContorno: motivoRodaFrente },
    { vista: 'traseira', classe: 'roda', nome: 'pneuTraseiroVistoEsq', tipo: 'filete', pts: pneuDeFrente(1), foraDoContorno: true, motivoForaDoContorno: motivoRodaFrente },
    { vista: 'traseira', classe: 'roda', nome: 'pneuTraseiroVistoDir', tipo: 'filete', pts: pneuDeFrente(-1), foraDoContorno: true, motivoForaDoContorno: motivoRodaFrente },
    /* Na planta o pneu não tem direito de sair: fora da carroceria é o defeito. */
    { vista: 'planta', classe: 'roda', nome: 'pneuDeCimaDE', tipo: 'filete', fechado: true, pts: pneuDeCima(zD, 1) },
    { vista: 'planta', classe: 'roda', nome: 'pneuDeCimaDD', tipo: 'filete', fechado: true, pts: pneuDeCima(zD, -1) },
    { vista: 'planta', classe: 'roda', nome: 'pneuDeCimaTE', tipo: 'filete', fechado: true, pts: pneuDeCima(zT, 1) },
    { vista: 'planta', classe: 'roda', nome: 'pneuDeCimaTD', tipo: 'filete', fechado: true, pts: pneuDeCima(zT, -1) },

    /* eixos de simetria e de roda */
    { vista: 'frontal', classe: 'eixo', tipo: 'poli', pts: [[0, -60], [0, 2560]] },
    { vista: 'traseira', classe: 'eixo', tipo: 'poli', pts: [[0, -60], [0, 2560]] },
    { vista: 'planta', classe: 'eixo', tipo: 'poli', pts: [[zTras - 60, 0], [zFrente + 60, 0]] },
  ],
  landmarks: LANDMARKS,
  cotas: [
    /* lateral: entre-eixos e balanços no chão, comprimento abaixo deles; diâmetro do pneu no centro da roda dianteira;
       largura da porta de correr dentro dela */
    { vista: 'lateral', de: [zT, 0], ate: [zD, 0], desloca: [0, 22], extensao: true, texto: mil(M.entreEixos) },
    { vista: 'lateral', de: [zD, 0], ate: [zFrente, 0], desloca: [0, 22], extensao: true, texto: mil(M.balancoDianteiro) },
    { vista: 'lateral', de: [zTras, 0], ate: [zT, 0], desloca: [0, 22], extensao: true, texto: mil(M.balancoTraseiro) },
    { vista: 'lateral', de: [zTras, 0], ate: [zFrente, 0], desloca: [0, 48], extensao: true, texto: mil(M.comprimento) },
    { vista: 'lateral', de: [zD - R, R], ate: [zD + R, R], texto: `⌀ ${mil(M.pneuDiametro)}` },
    { vista: 'lateral', dono: 'portaDeCorrer', de: [portaCorrer.tras, 1700], ate: [portaCorrer.frente, 1700], texto: mil(portaCorrer.frente - portaCorrer.tras) },
    /* frontal: altura à esquerda, largura no teto, bitola e pneu no chão */
    { vista: 'frontal', de: [-xMax, 0], ate: [-xMax, M.altura], desloca: [-40, 0], extensao: true, texto: mil(M.altura) },
    { vista: 'frontal', de: [-xMax, M.altura], ate: [xMax, M.altura], desloca: [0, -25], extensao: true, texto: mil(M.largura) },
    { vista: 'frontal', de: [-M.bitola / 2, 0], ate: [M.bitola / 2, 0], desloca: [0, 36], extensao: true, texto: `bitola ${mil(M.bitola)}` },
    { vista: 'frontal', de: [xPneuDentro, 0], ate: [xPneuFora, 0], desloca: [0, 16], extensao: true, numero: [34, 3], texto: mil(M.pneuLargura) },
    /* traseira: vão das duas portas acima do teto e largura de um vidro dentro dele */
    { vista: 'traseira', de: [900, 2380], ate: [-900, 2380], desloca: [0, -31], extensao: true, texto: mil(1800) },
    { vista: 'traseira', dono: 'vidroTraseiroEsq', de: [80, 1950], ate: [820, 1950], texto: mil(740) },
    /* planta: largura à esquerda */
    { vista: 'planta', de: [zTras, -xMax], ate: [zTras, xMax], desloca: [-25, 0], extensao: true, texto: mil(M.largura) },
  ],
  legenda: {
    x: 1000,
    y: 740,
    itens: [
      ['#12233b', 'silhueta (projeção de cada vista)'],
      ['#2f4562', 'linhas de porta e borda do teto plano'],
      ['#3d6b86', 'vidros: para-brisa, portas da cabine, portas traseiras'],
      ['#8a94a2', 'pneu 225/65 aro 16 (⌀ 710 × 225) e aro de 16 polegadas'],
      ['#b3593d', 'cotas em mm'],
      ['#1f6f5c', 'landmarks, em [z, y] na lateral, [x, y] na frontal e traseira, [z, x] de cima'],
    ],
    notas: [
      `Calibração: balanços ${M.balancoDianteiro} + entre-eixos ${M.entreEixos} + ${M.balancoTraseiro} = ${M.comprimento}; meia bitola ${num(M.bitola / 2)} + meio pneu ${num(M.pneuLargura / 2)} = ${num(xPneuFora)} < meia largura ${num(xMax)}.`,
      `Arcos das rodas com raio ${M.arcoRaio} no centro da roda (${M.arcoRaio - R} mm sobre o pneu); soleira em ${M.soleira}; largura sem retrovisores.`,
      'A lateral mostra o lado direito (-x), com a porta de correr; o lado esquerdo é o espelho dele sem ela.',
      'Medidas rígidas da classe; cabine, portas, vidros, bitola e balanços estimados na proporção (ver autoria).',
      ...linhasDeLandmarks(),
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
