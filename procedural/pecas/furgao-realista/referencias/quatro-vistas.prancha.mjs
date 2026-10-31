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
/* Pontos de caráter do perfil, em [z, y]. Bico curto, como a pessoa aprovou: para-choque em 2700 com o degrau, boca do
   capô em (2620, 1100), capô curto (860 mm em vista lateral) a cerca de 24 graus, quase emendado no para-brisa; o pé do
   para-brisa fica sobre a roda dianteira, à frente do eixo, em (1760, 1480), e o para-brisa sobe a 55 graus até o topo
   em y 2110; a faixa de 390 mm acima dele vai ao teto num raio grande; teto reto até a traseira vertical em -2670 e o
   degrau do para-choque traseiro em 570. As alturas da boca, do pé e do topo do para-brisa são escolha da pessoa no
   ajuste de 2026-10-31 (eram 954, 1310 e 1990); as posições em z ficaram. */
const ANGULO_PARA_BRISA = 55;
const grau = Math.PI / 180;
const peVidro = [1760, 1480];
const Y_TOPO_VIDRO = 2110;
const topoVidro = [peVidro[0] - (Y_TOPO_VIDRO - peVidro[1]) / Math.tan(ANGULO_PARA_BRISA * grau), Y_TOPO_VIDRO];
const boca = [2620, 1100];
const comprimentoCapo = boca[0] - peVidro[0];
const ANGULO_CAPO = Math.atan2(peVidro[1] - boca[1], comprimentoCapo) / grau;
const P = {
  parachoqueTopo: [zFrente, 720],
  boca,
  baseVidro: peVidro,
  topoVidro,
  testa: [topoVidro[0] - 200, M.altura],
  quinaTraseira: [-2670, M.altura],
  degrau: [-2670, 570],
};
const meio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
/* Raios do teto na lateral: no topo do para-brisa 600, na testa do teto alto 355 (o maior que cabe na metade da faixa
   de 438 mm entre os dois) e na quina com a traseira 180, que deixa a traseira vertical até 2320 e o topo das portas
   traseiras (2380) 10 mm para dentro, no começo da curva. */
const RAIO_TOPO_VIDRO = 600;
const RAIO_TESTA = 355;
const RAIO_QUINA_TRASEIRA = 180;

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
/* Porta dianteira de furgão de bico curto: a fresta da frente sobe a coluna do para-brisa, 30 mm atrás dela, desde o
   teto da cabine (2075, 35 abaixo do topo do para-brisa) até a base da coluna, desce vertical dali até perto do arco e contorna o arco por trás, a 55 mm
   dele, até a soleira logo atrás (z ≈ 1246). Sem degrau nem prolongamento na cintura. A traseira fica em z 550, na
   coluna do meio, 1170 mm atrás do eixo dianteiro: a porta tem cerca de 1185 na cintura e 700 na base, mais estreita
   embaixo por causa do arco. A coluna do meio tem 110 até a porta de correr, que tem 1300 e fica à frente do arco
   traseiro com folga. O vidro fica 70 mm para dentro da moldura, com a borda da frente seguindo a coluna. */
const MOLDURA = 70;
const FOLGA_ARCO = 55;
const raioPorta = M.arcoRaio + FOLGA_ARCO;
const fendaColuna = (y) => naColuna(30, y)[0];
const portaCabine = { tras: 550, base: 380, topo: Y_TOPO_VIDRO - 35 };
portaCabine.pe = [peVidro[0] + normalTras[0] * 30, peVidro[1] + normalTras[1] * 30]; // pé da fresta da coluna
const zArestaPorta = portaCabine.pe[0];
portaCabine.frente = zD - Math.sqrt(raioPorta ** 2 - (portaCabine.base - R) ** 2);
const yArcoNaAresta = R + Math.sqrt(raioPorta ** 2 - (zArestaPorta - zD) ** 2);
/* O contorno da porta em volta do arco: do alto, na aresta vertical, até a soleira atrás dele. */
function arcoDaPorta() {
  const a0 = Math.atan2(yArcoNaAresta - R, zArestaPorta - zD);
  const a1 = Math.atan2(portaCabine.base - R, portaCabine.frente - zD);
  const n = 18;
  const pts = [];
  for (let i = 0; i <= n; i += 1) {
    const ang = a0 + ((a1 - a0) * i) / n;
    pts.push([zD + raioPorta * Math.cos(ang), R + raioPorta * Math.sin(ang)]);
  }
  return pts;
}
/* A base do vidro da porta fica na altura do pé do para-brisa, como a pessoa pediu no ajuste de 2026-10-31. */
const vidroCabine = { tras: portaCabine.tras + MOLDURA, base: peVidro[1], topo: portaCabine.topo - 75 };
const COLUNA_DO_MEIO = 110;
const portaCorrer = { frente: portaCabine.tras - COLUNA_DO_MEIO, base: 380, topo: 2200 };
portaCorrer.tras = portaCorrer.frente - 1300;
const FOLGA_ARCO_TRASEIRO = 150;
const portaNaCintura = zArestaPorta - portaCabine.tras;
if (portaNaCintura < 1100 || portaNaCintura > 1250) throw new Error(`porta da cabine com ${portaNaCintura} mm na cintura, fora de 1100 a 1250`);
const colunaDoMeio = portaCabine.tras - portaCorrer.frente;
if (colunaDoMeio < 90 || colunaDoMeio > 150) throw new Error(`coluna do meio com ${colunaDoMeio} mm, fora de 90 a 150`);
for (const [z, y] of arcoDaPorta()) {
  if (Math.hypot(z - zD, y - R) - M.arcoRaio < 50 - 1e-6) throw new Error('a aresta da porta passa a menos de 50 mm do arco');
}
if (zArestaPorta - zD < 0 || yArcoNaAresta <= R) throw new Error('a aresta da porta não desce sobre o arco');
const cantoDoVidro = naColuna(30 + MOLDURA, vidroCabine.base);
if (vidroCabine.base < portaCabine.pe[1] || Math.hypot(cantoDoVidro[0] - portaCabine.pe[0], cantoDoVidro[1] - portaCabine.pe[1]) < MOLDURA - 1
  || vidroCabine.tras - portaCabine.tras < MOLDURA - 1
  || portaCabine.topo - vidroCabine.topo < MOLDURA - 1) throw new Error('o vidro sai da moldura da porta');
if (fendaColuna(vidroCabine.base) - naColuna(30 + MOLDURA, vidroCabine.base)[0] < MOLDURA - 1) throw new Error('o vidro passa da coluna');
if (portaCorrer.tras - (zT + M.arcoRaio) < FOLGA_ARCO_TRASEIRO) throw new Error('a porta de correr fica a menos de 150 mm do arco traseiro');

/* ------------------------------------------------------------ seção frontal e traseira */
/* Projeção ao longo de z: a caixa de carga é a parte mais larga e mais alta, então frontal e traseira têm o mesmo
   contorno, quase retangular, com a lateral quase vertical (1000 até 1450 de altura, 982 no teto) e a quina do teto
   com raio de 170. */
/* Quina do teto com a lateral, vista de frente e de trás, com raio de 300 (era 170). */
const RAIO_QUINA_TETO = 300;
const silhuetaFrontal = [[-xMax, M.soleira, 30], [xMax, M.soleira, 30], [xMax, 1450, 600], [982, M.altura, RAIO_QUINA_TETO], [-982, M.altura, RAIO_QUINA_TETO], [-xMax, 1450, 600]];
/* Meia largura da cabine na altura y: a lateral quase vertical da frontal, 1000 até 1450 e 982 no teto. */
const meiaLarguraEm = (y) => (y <= 1450 ? xMax : xMax - ((xMax - 982) * (y - 1450)) / (M.altura - 1450));
const xPneuDentro = M.bitola / 2 - M.pneuLargura / 2; // 737,5
const xPneuFora = M.bitola / 2 + M.pneuLargura / 2; // 962,5
/* De frente e de trás só se vê o pneu abaixo da soleira: a carroceria cobre o resto, e o pneu inteiro cruzava as portas
   traseiras. O diâmetro fica cotado na lateral. */
const pneuDeFrente = (s) => [[s * xPneuDentro, M.soleira], [s * xPneuDentro, 0, 50], [s * xPneuFora, 0, 50], [s * xPneuFora, M.soleira]];
const portaTraseira = (s) => [[s * 6, 590, 20], [s * 900, 590, 40], [s * 900, 2380, 90], [s * 6, 2380, 20]];
const vidroTraseiro = (s) => [[s * 80, 1700, 50], [s * 820, 1700, 50], [s * 820, 2200, 70], [s * 80, 2200, 50]];
/* O para-choque traseiro que a lateral mostra, de trás: da soleira (300) ao degrau de carga (570), no plástico escuro,
   envolvendo as quinas, com o lugar da placa (400 × 130); entre o degrau e a base das portas (590) fica a faixa de
   20 mm da traseira. */
const parachoqueDeTras = [[-985, 310, 40], [985, 310, 40], [985, P.degrau[1], 30], [-985, P.degrau[1], 30]];
const placaDeTras = [[-200, 380, 10], [200, 380, 10], [200, 510, 10], [-200, 510, 10]];
/* O para-brisa envolve as quinas. A quina da cabine em planta tem raio 160 (o da receita no pé do para-brisa) e começa
   160 mm para dentro da lateral; o vidro termina 100 mm para dentro dela, de modo que na frontal sobram 100 mm de chapa
   e coluna por lado e o vidro tem cerca de 1.800 na base. De cima, a base e o topo curvam em planta (flecha de 15 mm até
   o começo da quina) e as pontas dobram para a lateral pela quina até o fim do vidro, cerca de 22 graus; elas ficam
   27 mm atrás do centro, dentro da fresta da porta da cabine na lateral (30 mm na perpendicular à coluna, 37 na
   horizontal). De frente, as duas bordas são arcos: a de cima abaulada para cima, com flecha de 50, e a de baixo
   acompanhando o capô. */
const QUINA_VIDRO = 160;
const COLUNA_FRONTAL = 100;
const Y_COTA_VIDRO = 1790;
const FLECHA_PLANTA = 15;
const FLECHA_TOPO = 50;
const COROA_CAPO = 40;
const vidroBaseY = peVidro[1] + 20;
const vidroTopoY = Y_TOPO_VIDRO - 25;
const pontaDoVidro = (y) => meiaLarguraEm(y) - COLUNA_FRONTAL;
const dobraEm = (y) => Math.asin((pontaDoVidro(y) - (meiaLarguraEm(y) - QUINA_VIDRO)) / QUINA_VIDRO);
const recuoEm = (y) => FLECHA_PLANTA + QUINA_VIDRO * (1 - Math.cos(dobraEm(y)));
const recuoDaPonta = Math.max(recuoEm(vidroBaseY), recuoEm(vidroTopoY));
const xPontaBase = pontaDoVidro(vidroBaseY);
const xPontaTopo = pontaDoVidro(vidroTopoY);
/* Na frontal, a borda de baixo desce com a coroa do capô e sobe com o recuo da ponta pela inclinação do capô. */
const flechaBase = COROA_CAPO - recuoEm(vidroBaseY) * Math.tan(ANGULO_CAPO * grau);
const arcoFrontal = (xPonta, yCentro, flecha, n = 16) => Array.from({ length: n + 1 }, (_, i) => {
  const x = -xPonta + (2 * xPonta * i) / n;
  return [x, yCentro - flecha * (x / xPonta) ** 2];
});
const vidroDeFrente = [
  ...arcoFrontal(xPontaBase, vidroBaseY, flechaBase).map(([x, y], i, a) => (i === 0 || i === a.length - 1 ? [x, y, 30] : [x, y])),
  ...arcoFrontal(xPontaTopo, vidroTopoY, FLECHA_TOPO).reverse().map(([x, y], i, a) => (i === 0 || i === a.length - 1 ? [x, y, 30] : [x, y])),
];
if (COLUNA_FRONTAL < 90 || COLUNA_FRONTAL > 110) throw new Error('a chapa e a coluna ao lado do para-brisa na frontal saem de 90 a 110 mm');
if (recuoDaPonta > 30 / Math.sin(ANGULO_PARA_BRISA * grau)) throw new Error('a ponta do para-brisa recua além da fresta da porta da cabine');
/* A frente abaixo do para-brisa, só em contornos de posição: o capô entre a boca (954) e o pé do para-brisa (1310); o
   para-choque no plástico escuro, envolvendo as quinas até a soleira, com a entrada de ar embaixo e o lugar da placa
   (400 × 130); entre ele e a boca, os faróis grandes nas quinas e a grade entre eles. */
const capoDeFrente = [[-880, boca[1] + 10, 50], [880, boca[1] + 10, 50],
  ...arcoFrontal(xPontaBase, peVidro[1], COROA_CAPO).reverse().map(([x, y], i, a) => (i === 0 || i === a.length - 1 ? [x, y, 30] : [x, y]))];
const parachoqueDeFrente = [[-985, 310, 40], [985, 310, 40], [985, 740, 60], [-985, 740, 60]];
const entradaDeAr = [[-650, 350, 30], [650, 350, 30], [650, 480, 30], [-650, 480, 30]];
const placa = [[-200, 520, 10], [200, 520, 10], [200, 650, 10], [-200, 650, 10]];
const farol = (s) => [[s * 560, 830, 40], [s * 960, 830, 40], [s * 960, boca[1] - 10, 50], [s * 560, boca[1] - 10, 50]];
const grade = [[-500, 785, 30], [500, 785, 30], [500, boca[1] - 25, 30], [-500, boca[1] - 25, 30]];

/* ------------------------------------------------------------ planta */
/* Vista de cima, [z, x]: para-choques envolvendo as quinas (raio 280 na frente, 100 atrás). A borda do teto é onde o
   teto plano termina, nas tangentes dos raios da lateral (testa e quina traseira) e da frontal (quina do teto). */
const planta = [[zFrente, -xMax, 280], [zFrente, xMax, 280], [zTras, xMax, 100], [zTras, -xMax, 100]];
/* As bordas do vidro de cima ficam onde a lateral as põe: no perfil do para-brisa, nas alturas da base e do topo do
   vidro da frontal. O topo estava preso a uma altura antiga (1965) e ficava 84 mm à frente do lugar. */
const zVidroBase = naColuna(0, vidroBaseY)[0];
const zVidroTopo = naColuna(0, vidroTopoY)[0];
/* Borda do vidro em planta, [z, x], na altura y: flecha até o começo da quina e a quina dobrando para trás até a ponta. */
function bordaEmPlanta(zCentro, y, n = 12) {
  const xq = meiaLarguraEm(y) - QUINA_VIDRO;
  const dobra = dobraEm(y);
  const meio = Array.from({ length: n + 1 }, (_, i) => {
    const x = -xq + (2 * xq * i) / n;
    return [zCentro - FLECHA_PLANTA * (x / xq) ** 2, x];
  });
  const quina = (sinal) => Array.from({ length: 4 }, (_, k) => {
    const f = ((k + 1) / 4) * dobra;
    return [zCentro - FLECHA_PLANTA - QUINA_VIDRO * (1 - Math.cos(f)), sinal * (xq + QUINA_VIDRO * Math.sin(f))];
  });
  return [...quina(-1).reverse(), ...meio, ...quina(1)];
}
const vidroDeCima = [
  ...bordaEmPlanta(zVidroBase, vidroBaseY),
  ...bordaEmPlanta(zVidroTopo, vidroTopoY).reverse(),
];
const recuoLateral = (y) => P.baseVidro[0] - naColuna(0, y)[0];
if (Math.abs((zVidroBase - zVidroTopo) - (recuoLateral(vidroTopoY) - recuoLateral(vidroBaseY))) > 1) throw new Error('o vidro de cima discorda da lateral');
/* Tangente do filete de 300 da testa com o teto, e do de 120 da quina traseira. */
const giroTesta = Math.PI - Math.atan2(P.testa[1] - P.topoVidro[1], P.testa[0] - P.topoVidro[0]);
const zTetoPlano = P.testa[0] - RAIO_TESTA * Math.tan(giroTesta / 2);
const zTetoPlanoTras = P.quinaTraseira[0] + RAIO_QUINA_TRASEIRA;
const xTetoPlano = 982 - RAIO_QUINA_TETO * Math.tan((Math.PI - Math.atan2(M.altura - 1450, 982 - xMax)) / 2);
const bordaDoTeto = [[zTetoPlano, -xTetoPlano, 100], [zTetoPlano, xTetoPlano, 100], [zTetoPlanoTras, xTetoPlano, 40], [zTetoPlanoTras, -xTetoPlano, 40]];
/* O capô de cima, da boca ao pé do para-brisa (z 1360), que é a linha onde ele encontra o vidro. */
const capoDeCima = [[2600, -860, 120], [2600, 860, 120],
  ...bordaEmPlanta(P.baseVidro[0], peVidro[1]).reverse().map(([z, x], i, a) => (i === 0 || i === a.length - 1 ? [z, x, 30] : [z, x]))];
const pneuDeCima = (zc, s) => [[zc - R, s * xPneuDentro, 40], [zc + R, s * xPneuDentro, 40], [zc + R, s * xPneuFora, 40], [zc - R, s * xPneuFora, 40]];

/* ------------------------------------------------------------ landmarks */
/* `rotulo` é onde o nome vai, fora do corpo, com chamada até o ponto. */
const LANDMARKS = [
  { id: 'eixoD', vista: 'lateral', em: [zD, R], rotuloEm: [zD - 84, R - 90] },
  { id: 'eixoT', vista: 'lateral', em: [zT, R], rotuloEm: [zT - 84, R - 90] },
  { id: 'frente', vista: 'lateral', em: [zFrente, 500], sobre: 'nariz', rotuloEm: [2350, 120] },
  { id: 'boca', vista: 'lateral', em: P.boca, sobre: 'nariz', rotuloEm: [2480, 1230] },
  { id: 'baseVidro', vista: 'lateral', em: P.baseVidro, sobre: 'capoEParaBrisa', rotuloEm: [2080, 1560] },
  { id: 'topoVidro', vista: 'lateral', em: P.topoVidro, sobre: 'teto', rotuloEm: [1250, 2640] },
  { id: 'teto', vista: 'lateral', em: [0, M.altura], sobre: 'teto', rotuloEm: [-450, 2640] },
  { id: 'degrau', vista: 'lateral', em: P.degrau, sobre: 'traseira', rotuloEm: [-2760, 600], rotuloAncora: 'end' },
  { id: 'traseira', vista: 'lateral', em: [zTras, 430], sobre: 'traseira', rotuloEm: [-2760, 380], rotuloAncora: 'end' },
  { id: 'soleira', vista: 'lateral', em: [0, M.soleira], sobre: 'soleira', rotuloEm: [250, 150] },
  { id: 'arcoD', vista: 'lateral', em: [zD, R + M.arcoRaio], sobre: 'arcoDianteiro', rotuloEm: [2000, 830] },
  { id: 'cabineT', vista: 'lateral', em: [portaCabine.tras, 1700], sobre: 'portaDaCabine', rotuloEm: [500, 2640] },
  { id: 'correrF', vista: 'lateral', em: [portaCorrer.frente, 2100], sobre: 'portaDeCorrer', rotuloEm: [100, 2640] },
  { id: 'correrT', vista: 'lateral', em: [portaCorrer.tras, 2100], sobre: 'portaDeCorrer', rotuloEm: [-1220, 2640] },
  { id: 'cabineF', vista: 'lateral', em: [zD - Math.sqrt(raioPorta ** 2 - (500 - R) ** 2), 500], sobre: 'portaDaCabine', rotuloEm: [980, 327] },
  { id: 'largura', vista: 'frontal', em: [xMax, 900], sobre: 'silhuetaFrontal', rotuloEm: [1060, 900] },
  { id: 'vaoTraseiro', vista: 'traseira', em: [900, 1500], sobre: 'portaTraseiraEsq', rotuloEm: [1060, 1500], rotuloAncora: 'end' },
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
      {
        id: 'ajuste',
        tipo: 'medidas-declaradas',
        evidencia: 'ajuste da pessoa em 2026-10-31: boca do capô em y 1100, pé do para-brisa em y 1480 e topo dele em y 2110, com as posições em z mantidas; raios maiores no teto e para-brisa que envolve as quinas',
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
    { vista: 'lateral', contorno: true, nome: 'capoEParaBrisa', tipo: 'filete', pts: [meio(P.boca, P.baseVidro), [...P.baseVidro, 90], meio(P.baseVidro, P.topoVidro)], esperado: { inversoesMax: 0, raioMinMin: 80 } },
    /* Do meio do para-brisa ao meio da traseira num trecho só: o filete fica limitado à metade do trecho vizinho, e com
       o corte no meio da testa o raio de 300 pedido saía com 200. A única inversão é a do topo do para-brisa, onde o
       vidro a 55 graus passa à testa mais em pé: são as duas inclinações da frente do teto, mantidas de propósito. */
    { vista: 'lateral', contorno: true, nome: 'teto', tipo: 'filete', pts: [meio(P.baseVidro, P.topoVidro), [...P.topoVidro, RAIO_TOPO_VIDRO], [...P.testa, RAIO_TESTA], [...P.quinaTraseira, RAIO_QUINA_TRASEIRA], meio(P.quinaTraseira, P.degrau)], esperado: { inversoesMax: 1, concentracaoMax: 0.25, raioMinMin: 170 } },
    { vista: 'lateral', contorno: true, nome: 'traseira', tipo: 'filete', pts: [meio(P.quinaTraseira, P.degrau), P.degrau, [zTras, 570], [zTras, M.soleira, 40], [zT - dzArco, M.soleira]] },
    { vista: 'lateral', contorno: true, nome: 'arcoTraseiro', tipo: 'poli', pts: arco(zT) },
    { vista: 'lateral', contorno: true, nome: 'soleira', tipo: 'poli', pts: [[zT + dzArco, M.soleira], [zD - dzArco, M.soleira]], esperado: { inversoesMax: 0 } },
    { vista: 'lateral', contorno: true, nome: 'arcoDianteiro', tipo: 'poli', pts: arco(zD) },
    { vista: 'frontal', contorno: true, nome: 'silhuetaFrontal', tipo: 'filete', fechado: true, pts: silhuetaFrontal },
    { vista: 'traseira', contorno: true, nome: 'silhuetaTraseira', tipo: 'filete', fechado: true, pts: silhuetaFrontal },
    { vista: 'planta', contorno: true, nome: 'silhuetaDeCima', tipo: 'filete', fechado: true, pts: planta },

    /* 2. aberturas: vidros (os arcos são a própria silhueta lateral) */
    { vista: 'lateral', classe: 'vidro', nome: 'vidroDaCabine', tipo: 'filete', fechado: true, pts: [[...naColuna(30 + MOLDURA, vidroCabine.base), 30], [...naColuna(30 + MOLDURA, vidroCabine.topo), 80], [vidroCabine.tras, vidroCabine.topo, 60], [vidroCabine.tras, vidroCabine.base, 40]] },
    { vista: 'frontal', classe: 'vidro', nome: 'paraBrisa', tipo: 'filete', fechado: true, pts: vidroDeFrente },
    { vista: 'planta', classe: 'vidro', nome: 'paraBrisaDeCima', tipo: 'filete', fechado: true, pts: vidroDeCima },
    { vista: 'traseira', classe: 'vidro', nome: 'vidroTraseiroEsq', tipo: 'filete', fechado: true, pts: vidroTraseiro(1) },
    { vista: 'traseira', classe: 'vidro', nome: 'vidroTraseiroDir', tipo: 'filete', fechado: true, pts: vidroTraseiro(-1) },

    /* 3. linhas de porta e borda do teto */
    { vista: 'lateral', classe: 'painel', nome: 'portaDaCabine', tipo: 'filete', fechado: true, pts: [...arcoDaPorta().reverse(), [...portaCabine.pe, 60], [...naColuna(30, portaCabine.topo), 60], [portaCabine.tras, portaCabine.topo, 60], [portaCabine.tras, portaCabine.base, 40]] },
    { vista: 'lateral', classe: 'painel', nome: 'portaDeCorrer', tipo: 'filete', fechado: true, pts: [[portaCorrer.frente, portaCorrer.base, 50], [portaCorrer.frente, portaCorrer.topo, 60], [portaCorrer.tras, portaCorrer.topo, 60], [portaCorrer.tras, portaCorrer.base, 50]] },
    { vista: 'traseira', classe: 'painel', nome: 'portaTraseiraEsq', tipo: 'filete', fechado: true, pts: portaTraseira(1) },
    { vista: 'traseira', classe: 'painel', nome: 'portaTraseiraDir', tipo: 'filete', fechado: true, pts: portaTraseira(-1) },
    { vista: 'traseira', classe: 'painel', nome: 'parachoqueTraseiro', tipo: 'filete', fechado: true, pts: parachoqueDeTras },
    { vista: 'traseira', classe: 'painel', nome: 'placaTraseira', tipo: 'filete', fechado: true, pts: placaDeTras },
    { vista: 'planta', classe: 'painel', nome: 'bordaDoTeto', tipo: 'filete', fechado: true, pts: bordaDoTeto },
    { vista: 'planta', classe: 'painel', nome: 'capoDeCima', tipo: 'filete', fechado: true, pts: capoDeCima },
    { vista: 'frontal', classe: 'painel', nome: 'capo', tipo: 'filete', fechado: true, pts: capoDeFrente },
    { vista: 'frontal', classe: 'painel', nome: 'parachoqueDianteiro', tipo: 'filete', fechado: true, pts: parachoqueDeFrente },
    { vista: 'frontal', classe: 'painel', nome: 'entradaDeAr', tipo: 'filete', fechado: true, pts: entradaDeAr },
    { vista: 'frontal', classe: 'painel', nome: 'placaDianteira', tipo: 'filete', fechado: true, pts: placa },
    { vista: 'frontal', classe: 'painel', nome: 'farolEsq', tipo: 'filete', fechado: true, pts: farol(1) },
    { vista: 'frontal', classe: 'painel', nome: 'farolDir', tipo: 'filete', fechado: true, pts: farol(-1) },
    { vista: 'frontal', classe: 'painel', nome: 'grade', tipo: 'filete', fechado: true, pts: grade },

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
    /* interrompido no número da largura do para-brisa */
    { vista: 'frontal', classe: 'eixo', tipo: 'poli', pts: [[0, -60], [0, Y_COTA_VIDRO - 15]] },
    { vista: 'frontal', classe: 'eixo', tipo: 'poli', pts: [[0, Y_COTA_VIDRO + 130], [0, 2560]] },
    { vista: 'traseira', classe: 'eixo', tipo: 'poli', pts: [[0, 0], [0, 2560]] },
    { vista: 'planta', classe: 'eixo', tipo: 'poli', pts: [[zTras - 60, 0], [zFrente + 60, 0]] },
    /* o chão, onde as cotas de altura começam */
    { vista: 'lateral', classe: 'eixo', tipo: 'poli', pts: [[zTras, 0], [3200, 0]] },
  ],
  landmarks: LANDMARKS,
  anotacoes: [
    { vista: 'lateral', em: [1500, 2200], texto: `para-brisa a ${Math.round((Math.atan2(P.topoVidro[1] - P.baseVidro[1], P.baseVidro[0] - P.topoVidro[0]) * 180) / Math.PI)}° da horizontal` },
  ],
  cotas: [
    /* lateral: entre-eixos e balanços no chão, comprimento abaixo deles; diâmetro do pneu no centro da roda dianteira;
       largura da porta de correr dentro dela */
    { vista: 'lateral', de: [zT, 0], ate: [zD, 0], desloca: [0, 22], extensao: true, texto: mil(M.entreEixos) },
    { vista: 'lateral', de: [zD, 0], ate: [zFrente, 0], desloca: [0, 22], extensao: true, texto: mil(M.balancoDianteiro) },
    { vista: 'lateral', de: [zTras, 0], ate: [zT, 0], desloca: [0, 22], extensao: true, texto: mil(M.balancoTraseiro) },
    { vista: 'lateral', de: [zTras, 0], ate: [zFrente, 0], desloca: [0, 48], extensao: true, texto: mil(M.comprimento) },
    { vista: 'lateral', de: [zD - R, R], ate: [zD + R, R], texto: `⌀ ${mil(M.pneuDiametro)}` },
    { vista: 'lateral', de: [P.boca[0], 0], ate: P.boca, desloca: [(zFrente - P.boca[0]) * ESCALA + 26, 0], extensao: true, texto: mil(P.boca[1]) },
    { vista: 'lateral', de: [P.baseVidro[0], 0], ate: P.baseVidro, desloca: [(zFrente - P.baseVidro[0]) * ESCALA + 51, 0], extensao: true, texto: mil(P.baseVidro[1]) },
    { vista: 'lateral', de: [P.topoVidro[0], 0], ate: P.topoVidro, desloca: [(zFrente - P.topoVidro[0]) * ESCALA + 76, 0], extensao: true, texto: mil(P.topoVidro[1]) },
    { vista: 'lateral', de: P.baseVidro, ate: [zFrente, P.baseVidro[1]], desloca: [0, -56], extensao: true, texto: mil(zFrente - P.baseVidro[0]) },
    { vista: 'lateral', de: [-200, 0], ate: [-200, M.soleira], texto: mil(M.soleira) },
    { vista: 'lateral', dono: 'portaDaCabine', de: [portaCabine.tras, portaCabine.pe[1] - 110], ate: [zArestaPorta, portaCabine.pe[1] - 110], texto: mil(portaNaCintura) },
    { vista: 'lateral', dono: 'portaDeCorrer', de: [portaCorrer.tras, 1700], ate: [portaCorrer.frente, 1700], texto: mil(portaCorrer.frente - portaCorrer.tras) },
    /* frontal: altura à esquerda, largura no teto, bitola e pneu no chão */
    { vista: 'frontal', de: [-xMax, 0], ate: [-xMax, M.altura], desloca: [-40, 0], extensao: true, texto: mil(M.altura) },
    { vista: 'frontal', de: [-xMax, M.altura], ate: [xMax, M.altura], desloca: [0, -45], extensao: true, texto: mil(M.largura) },
    { vista: 'frontal', de: [-M.bitola / 2, 0], ate: [M.bitola / 2, 0], desloca: [0, 36], extensao: true, texto: `bitola ${mil(M.bitola)}` },
    { vista: 'frontal', de: [xPneuDentro, 0], ate: [xPneuFora, 0], desloca: [0, 16], extensao: true, numero: [34, 3], texto: mil(M.pneuLargura) },
    /* traseira: vão das duas portas acima do teto e largura de um vidro dentro dele */
    { vista: 'traseira', de: [900, 2380], ate: [-900, 2380], desloca: [0, -31], extensao: true, texto: `vão das portas ${mil(1800)}` },
    { vista: 'traseira', de: [xMax, M.soleira], ate: [-xMax, M.soleira], desloca: [0, M.soleira * ESCALA + 20], extensao: true, texto: mil(M.largura) },
    { vista: 'traseira', dono: 'vidroTraseiroEsq', de: [80, 1950], ate: [820, 1950], texto: mil(740) },
    { vista: 'frontal', dono: 'paraBrisa', de: [-pontaDoVidro(Y_COTA_VIDRO), Y_COTA_VIDRO], ate: [pontaDoVidro(Y_COTA_VIDRO), Y_COTA_VIDRO], texto: mil(2 * pontaDoVidro(Y_COTA_VIDRO)) },
    /* de cima, a profundidade do vidro entre a borda de baixo e a de cima, a mesma que a lateral dá a 55 graus */
    { vista: 'planta', dono: 'paraBrisaDeCima', de: [zVidroTopo, 500], ate: [zVidroBase, 500], texto: mil(zVidroBase - zVidroTopo) },
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
      `Teto: raio ${RAIO_TOPO_VIDRO} no topo do para-brisa, ${RAIO_TESTA} na testa e ${RAIO_QUINA_TRASEIRA} na quina traseira (lateral); ${RAIO_QUINA_TETO} nas quinas com a lateral (frontal e traseira).`,
      `Para-brisa: flecha ${FLECHA_TOPO} em cima e ${Math.round(flechaBase)} embaixo na frontal; coluna em x ±${Math.round(xPontaBase)} na base e ±${Math.round(xPontaTopo)} no topo; de cima, pontas ${Math.round(recuoDaPonta)} mm atrás do centro, dobrando na quina de raio ${QUINA_VIDRO}.`,
      `De cima, o vidro vai de z ${Math.round(zVidroBase)} a ${Math.round(zVidroTopo)}: as bordas dele a ${vidroBaseY} e ${vidroTopoY} de altura, 20 e 25 mm dentro do pé e do topo do para-brisa da lateral.`,
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
