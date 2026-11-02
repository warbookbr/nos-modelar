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
 *   pneu 235/65 aro 16 (era 225, mudado pela pessoa em 2026-10-31): diâmetro 710 (o do alinhamento), largura 235,
 *   centro da roda em y = 355;
 *   bitola 1730 (era 1700, mudada pela pessoa em 2026-10-31): meia bitola 865 + meia largura do pneu 117,5 = 982,5 <
 *   meia largura 1000 (a face de fora do pneu fica 17,5 mm para dentro da lateral);
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
  bitola: 1730,
  pneuDiametro: 710,
  pneuLargura: 235,
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
  quinaTraseira: [-2670, M.altura],
  degrau: [-2670, 570],
};
const meio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
/* O plástico de baixo, peça própria por fora da lataria aceita, que não se move (escolha da pessoa em 2026-11-01,
   seções do ALINHAMENTO.md, "O corpo de baixo" e "Os para-choques"). Cada seção é [para fora da chapa, altura], em mm:
   na saia e na moldura dos arcos o "para fora" é x, a partir da lateral; no para-choque dianteiro é z para a frente, a
   partir da frente da chapa (2700); no traseiro, z para trás, a partir da chapa do para-choque (-2700). */
export const SECAO_SAIA = [[0, 299], [10, 303], [17, 312], [20, 326], [20, 440], [18, 450], [13, 457], [6, 461], [0, 463]];
export const SECAO_PARACHOQUE_DIANTEIRO = [[0, 300], [15, 302], [30, 320], [42, 350], [46, 375], [44, 382], [30, 388], [30, 482], [44, 488], [50, 500], [50, 670], [47, 695], [38, 712], [22, 720], [0, 724]];
export const SECAO_PARACHOQUE_TRASEIRO = [[0, 300], [60, 302], [95, 312], [108, 330], [110, 350], [110, 560], [108, 570], [102, 577], [92, 580]];
const saida = (secao) => Math.max(...secao.map(([u]) => u));
const topoDe = (secao) => Math.max(...secao.map(([, y]) => y));
/* Topo da saia, no alto da borda redonda de cima. */
const TOPO_FAIXA = topoDe(SECAO_SAIA); // 463, o mesmo do corte A e da legenda
const DEGRAU_DE_CARGA = topoDe(SECAO_PARACHOQUE_TRASEIRO); // 580
const PISO_DO_DEGRAU = 92;
/* A moldura de cada arco é um alargamento (ALINHAMENTO.md, último acréscimo de "O corpo de baixo", 2026-11-02), com o
   caráter de para-lama alargado de furgão: alargamento que se funde ao painel, sem linha na borda de fora, com o
   ressalto maior junto à boca. Tem 150 mm de largura e sai 30 mm, igual nos quatro arcos e em volta toda. Encosta na boca
   do arco sem diminuí-la; a borda do lado do arco dobra 10 mm para dentro dele, por trás da face da chapa, cobrindo a aba
   de chapa do arco (ABA_DO_ARCO, 4 mm de altura); fica cheia, a 30 mm, até 30 mm da boca, e daí desce suave até a chapa,
   chegando tangente a ela. Acima da linha da saia e dos para-choques ela é da cor da lataria; abaixo, o mesmo
   alargamento segue no plástico escuro até embaixo (PONTAS_DA_MOLDURA). A seção é [para fora da chapa, distância da boca
   do arco]; os pontos com "para fora" negativo são a dobra, na própria boca. */
const LARGURA_MOLDURA = 150;
const MOLDURA_ARCO = LARGURA_MOLDURA;
const FOLGA_MOLDURA_FRESTA = 10;
const DOBRA_DA_MOLDURA = 10;
const SAIDA_DA_MOLDURA = 30;
const RESSALTO_ATE = 30; // o patamar cheio, a 30 mm para fora, vai até esta distância da boca (era 20 com a saída de 20)
const ABA_DO_ARCO = { altura: 4, largura: 32 };
const ESPESSURA_DA_MOLDURA = 2;
const SUBIDA_DA_MOLDURA = [[-DOBRA_DA_MOLDURA, 0], [0, 0], [12, 2], [21, 6], [27, 12], [SAIDA_DA_MOLDURA, 20], [SAIDA_DA_MOLDURA, RESSALTO_ATE]];
/* A saída a d da boca: a borda redonda que sobe da boca ao patamar e, depois dele, a descida u = 30 (1 − 3t² + 2t³), com
   a tangente horizontal no patamar e na chapa, sem quina na borda de fora. */
function saidaDaMolduraEm(d) {
  if (d <= 0) return 0;
  if (d <= RESSALTO_ATE) {
    const sub = SUBIDA_DA_MOLDURA.slice(1);
    const k = sub.findIndex(([, dd]) => dd >= d);
    const [[u0, d0], [u1, d1]] = [sub[k - 1], sub[k]];
    return u0 + ((u1 - u0) * (d - d0)) / (d1 - d0);
  }
  if (d >= LARGURA_MOLDURA) return 0;
  const t = (d - RESSALTO_ATE) / (LARGURA_MOLDURA - RESSALTO_ATE);
  return SAIDA_DA_MOLDURA * (1 - (3 * t ** 2 - 2 * t ** 3));
}
function perfilDaMoldura(W) {
  const n = 12;
  const descida = Array.from({ length: n }, (_, i) => {
    const d = RESSALTO_ATE + ((i + 1) / n) * (W - RESSALTO_ATE);
    return [Math.round(saidaDaMolduraEm(d) * 10) / 10, Math.round(d * 10) / 10];
  });
  return [...SUBIDA_DA_MOLDURA, ...descida];
}
export const SECAO_MOLDURA = perfilDaMoldura(LARGURA_MOLDURA);
{
  const secao = SECAO_MOLDURA;
  const W = LARGURA_MOLDURA;
  if (Math.min(...secao.map(([, d]) => d)) < 0) throw new Error('a moldura entra na boca do arco');
  if (Math.max(...secao.map(([, d]) => d)) !== W || Math.max(...secao.map(([u]) => u)) !== SAIDA_DA_MOLDURA) throw new Error(`a moldura não tem ${W} de largura e ${SAIDA_DA_MOLDURA} de saída`);
  if (secao.some(([u, d]) => d > 0 && d <= ABA_DO_ARCO.largura && u < ABA_DO_ARCO.altura + ESPESSURA_DA_MOLDURA)) throw new Error('a moldura não cobre a aba de chapa do arco');
  if (!secao.some(([u, d]) => d === 0 && u === -DOBRA_DA_MOLDURA)) throw new Error('a borda da moldura não dobra 10 mm para dentro do arco');
  /* sem linha na borda de fora: o último trecho chega à chapa quase deitado, e a descida não tem degrau */
  const [[u1, d1], [u2, d2]] = secao.slice(-2);
  if (u2 !== 0 || Math.atan2(u1 - u2, d2 - d1) / grau > 20) throw new Error('a moldura chega à chapa com quina');
  const iRessalto = secao.map(([u]) => u).lastIndexOf(SAIDA_DA_MOLDURA);
  if (secao.slice(iRessalto).some(([u], i, a) => i > 0 && u > a[i - 1][0])) throw new Error('a descida da moldura tem ressalto');
  /* o ressalto maior fica junto da boca: a 60% da largura a moldura já sai no máximo a metade da saída */
  if (saidaDaMolduraEm(W * 0.6) > SAIDA_DA_MOLDURA / 2) throw new Error('o ressalto da moldura não fica junto da boca');
}
/* As portas descem até 380 e a saia vai de 299 a 463: a saia é cortada pelas frestas, e cada porta leva o seu trecho,
   de 380 a 463, que abre com ela (as duas da cabine e a de correr, no lado -x). Ficam presos à carroceria a parte de
   299 a 380 sob as portas e os trechos entre as portas e os arcos. Escolha da pessoa em 2026-11-01. */
const BASE_DAS_PORTAS = 380;
/* Medidas com o plástico: a carroceria não se move. */
const Z_FRENTE_PLASTICO = zFrente + saida(SECAO_PARACHOQUE_DIANTEIRO); // 2750
const Z_TRAS_PLASTICO = zTras - saida(SECAO_PARACHOQUE_TRASEIRO); // -2810
const X_SAIA = xMax + saida(SECAO_SAIA); // 1020
const COMPRIMENTO_COM_PLASTICO = Z_FRENTE_PLASTICO - Z_TRAS_PLASTICO; // 5560
const LARGURA_NA_SAIA = 2 * X_SAIA; // 2040
/* Nos arcos o alargamento sai 30 da lateral: a largura ali é 2060. */
const X_ALARGAMENTO = xMax + SAIDA_DA_MOLDURA; // 1030
const LARGURA_NOS_ARCOS = 2 * X_ALARGAMENTO; // 2060
/* No plástico, abaixo da linha da saia e dos para-choques, o alargamento é a mesma superfície medida da chapa; onde ela
   cai abaixo da saída da peça escura vizinha (20 mm, a saia e os para-choques de lado), a peça escura continua. É a
   distância da boca em que o alargamento sai da saia, e o perfil do corte I. */
const D_NA_SAIA = (() => {
  let [lo, hi] = [RESSALTO_ATE, LARGURA_MOLDURA];
  for (let k = 0; k < 60; k += 1) { const m = (lo + hi) / 2; if (saidaDaMolduraEm(m) > saida(SECAO_SAIA)) lo = m; else hi = m; }
  return (lo + hi) / 2;
})();
export const SECAO_NO_PLASTICO = [...SECAO_MOLDURA.filter(([, d]) => d < D_NA_SAIA), [saida(SECAO_SAIA), Math.round(D_NA_SAIA * 10) / 10], [saida(SECAO_SAIA), LARGURA_MOLDURA]];
if (Math.max(...SECAO_NO_PLASTICO.map(([u]) => u)) !== SAIDA_DA_MOLDURA) throw new Error('no plástico o alargamento não sai os mesmos 30 mm da chapa');
/* O detalhe de corte fica no quadro da vista de cima, abaixo dela: cada milímetro da seção vale 5, a base (300) cai em
   x 3730 e a altura cresce para cima na folha. */
const DETALHE = { escala: 5, xBase: 3730 };
const noDetalhe = (z0, u, y) => [z0 + DETALHE.escala * u, DETALHE.xBase - DETALHE.escala * (y - 300)];
/* Cada detalhe é marcado com a letra do plano de corte nas vistas e na vista de cima. A moldura é desenhada com a
   distância do arco na vertical, a partir de 300. O corte E passa pela porta de correr e mostra a saia cortada pela
   fresta da base da porta, em 380: o trecho de cima vai com a porta, o de baixo fica preso. */
const PLANO_A = -980;
const PLANO_E = -200;
const ANGULO_PLANO_B = 0.75 * Math.PI;
const ANGULO_PLANO_I = 0; // radial no arco traseiro, na altura do eixo, à frente dele: o alargamento no plástico
const PLANO_C = -700;
const PLANO_D = 700;
const FRESTA = 6;
const saiaNaPorta = [
  [...SECAO_SAIA.filter(([, y]) => y < BASE_DAS_PORTAS - FRESTA / 2), [saida(SECAO_SAIA), BASE_DAS_PORTAS - FRESTA / 2], [0, BASE_DAS_PORTAS - FRESTA / 2]],
  [[0, BASE_DAS_PORTAS + FRESTA / 2], [saida(SECAO_SAIA), BASE_DAS_PORTAS + FRESTA / 2], ...SECAO_SAIA.filter(([, y]) => y > BASE_DAS_PORTAS + FRESTA / 2)],
];
/* B é radial: o plano passa pelo centro da roda traseira, a 135 graus de +z, ou 45 graus da vertical para trás. */
const GRAUS_B_DA_VERTICAL = Math.round(ANGULO_PLANO_B / grau - 90);
const DETALHES = [
  { nome: 'Saia', titulo: 'A: saia presa (5:1)', linhas: [`z ${PLANO_A}, lado -x`, 'trecho todo preso,', 'entre arco e porta'], eixo: 'x fora', secao: SECAO_SAIA, z0: -2560, alto: 'altura' },
  { nome: 'SaiaNaPorta', titulo: 'E: saia na porta (5:1)', linhas: [`z ${PLANO_E}, lado -x`, 'porta acima da fresta', `de ${BASE_DAS_PORTAS}, preso abaixo`], eixo: 'x fora', secao: SECAO_SAIA, pecas: saiaNaPorta, z0: -1622, alto: 'altura' },
  { nome: 'Moldura', titulo: 'B e I: arcos (5:1)', letra: 'B', linhas: ['B: cor da lataria, a', `${GRAUS_B_DA_VERTICAL}° da vertical, atrás;`, 'I: no plástico, na', 'altura do eixo'], eixo: 'x fora', secao: SECAO_MOLDURA.map(([u, d]) => [u, 300 + d]), z0: -685, alto: 'largura' },
  { nome: 'AlargamentoNoPlastico', titulo: '', letra: 'I', linhas: [], eixo: '', secao: SECAO_NO_PLASTICO.map(([u, d]) => [u, 300 + d]), z0: -205, alto: 'largura' },
  { nome: 'ParachoqueDianteiro', titulo: 'C: para-choque diant.', linhas: [`x ${PLANO_C} (lado -x), 5:1`, `fundo a ${SECAO_PARACHOQUE_DIANTEIRO[0][1]} do chão`], eixo: 'z frente', secao: SECAO_PARACHOQUE_DIANTEIRO, z0: 252, alto: 'altura', afasta: 30 },
  { nome: 'ParachoqueTraseiro', titulo: 'D: para-choque tras.', linhas: [`x +${PLANO_D} (lado +x), 5:1`, `fundo a ${SECAO_PARACHOQUE_TRASEIRO[0][1]} do chão`], eixo: 'z trás', secao: SECAO_PARACHOQUE_TRASEIRO, z0: 1502, alto: 'altura' },
];
/* O detalhe F, a faixa de baixo do lado -x de arco a arco, ampliada 2,2 vezes sobre a lateral, abaixo dos cortes; ele
   também fica no quadro da vista de cima, com z na horizontal e a altura para cima na folha. */
const FAIXA = { escala: 2.2, z0: -2780, zIni: -1200, xBase: 5105 };
const naFaixa = (z, y, xBase = FAIXA.xBase) => [FAIXA.z0 + FAIXA.escala * (z - FAIXA.zIni), xBase - FAIXA.escala * (y - 300)];
/* O detalhe G é a mesma faixa no lado +x, abaixo de F, na mesma escala e com a frente à direita como em F. */
const X_BASE_G = FAIXA.xBase + 1050;
const naG = (z, y) => naFaixa(z, y, X_BASE_G);
/* A frente do teto na lateral é uma curva contínua e aberta, sem trecho reto, sem bico e sem barriga: sai tangente ao
   para-brisa no topo do vidro (1319, 2110) com raio 1290 e passa, também tangente, a um raio de 405 até chegar ao teto
   em 2500, em z 770 (a variante B, escolhida pela pessoa em 2026-10-31). Os dois arcos somam os 55 graus entre o para-brisa e o teto, e o ângulo do primeiro sai da subida de 390 mm.
   O filete do motor fica limitado à metade do trecho vizinho e não desenha dois raios emendados, então os arcos entram
   como pontos calculados aqui. A quina com a traseira tem raio 180, que deixa a traseira vertical até 2320 e o topo das
   portas traseiras (2380) 10 mm para dentro, no começo da curva. */
const RAIO_TOPO_VIDRO = 1290;
const RAIO_TESTA = 405;
const RAIO_QUINA_TRASEIRA = 180;
const dirVidro = Math.PI - ANGULO_PARA_BRISA * grau; // 125 graus, subindo para trás
/* Subida de um arco que gira de a até b para a esquerda: r (cos a − cos b); avanço em z: r (sen b − sen a). */
const cosEntreArcos = ((M.altura - Y_TOPO_VIDRO) - RAIO_TESTA - RAIO_TOPO_VIDRO * Math.cos(dirVidro)) / (RAIO_TESTA - RAIO_TOPO_VIDRO);
if (!(Math.abs(cosEntreArcos) <= 1)) throw new Error('os dois raios da frente do teto não fecham a subida de 390 mm');
const dirEntreArcos = Math.acos(cosEntreArcos);
if (dirEntreArcos <= dirVidro || dirEntreArcos >= Math.PI) throw new Error('a emenda dos dois raios da frente do teto sai fora da curva');
function arcoTangente(inicio, r, a, b, n) {
  return Array.from({ length: n }, (_, k) => {
    const t = a + ((b - a) * (k + 1)) / n;
    return [inicio[0] + r * (Math.sin(t) - Math.sin(a)), inicio[1] + r * (Math.cos(a) - Math.cos(t))];
  });
}
const arcoDoVidro = arcoTangente(topoVidro, RAIO_TOPO_VIDRO, dirVidro, dirEntreArcos, 16);
const arcoDaTesta = arcoTangente(arcoDoVidro[arcoDoVidro.length - 1], RAIO_TESTA, dirEntreArcos, Math.PI, 10);
const inicioDoTeto = arcoDaTesta[arcoDaTesta.length - 1];
if (Math.abs(inicioDoTeto[1] - M.altura) > 0.5) throw new Error(`a curva da frente do teto chega em ${inicioDoTeto[1]}, e não no teto`);
inicioDoTeto[1] = M.altura;

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
/* Porta dianteira de furgão de bico curto: a fresta da frente sobe a coluna do para-brisa, 122 mm atrás do perfil dela
   na perpendicular, desde o topo da porta (2035, 75 abaixo do topo do para-brisa) até a base da coluna. De lado, a
   coluna aparece como uma faixa de chapa de 100 mm entre a ponta dobrada do vidro (22 mm atrás do perfil) e a fresta,
   e acima da porta fica uma faixa de 75 mm até o topo do para-brisa, onde começa a curva do teto; escolha da pessoa em
   2026-11-01 (antes a fresta corria 30 mm atrás do perfil e o topo da porta ficava 35 abaixo). Da base da coluna a
   fresta desce vertical até perto do arco e contorna o arco por trás, a 160 mm
   dele (10 mm fora do alargamento), até a base da porta (z ≈ 1141). Sem degrau nem prolongamento na cintura. A traseira fica em z 550, na
   coluna do meio, 1170 mm atrás do eixo dianteiro: a porta tem cerca de 1110 na cintura e 590 na base, mais estreita
   embaixo por causa do arco. A coluna do meio tem 110 até a porta de correr, que tem 1300 e fica à frente do arco
   traseiro com folga. O vidro fica 70 mm para dentro da moldura, com a borda da frente seguindo a coluna. */
const MOLDURA = 70;
/* A fresta contorna o arco dianteiro 10 mm fora do alargamento: 160 mm da boca, raio 580 (escolha de 2026-11-02). */
const FOLGA_ARCO = MOLDURA_ARCO + FOLGA_MOLDURA_FRESTA;
const raioPorta = M.arcoRaio + FOLGA_ARCO;
const FRESTA_COLUNA = 122;
const COLUNA_LATERAL = { min: 90, max: 110 };
const FAIXA_TETO_PORTA = 75;
const fendaColuna = (y) => naColuna(FRESTA_COLUNA, y)[0];
const portaCabine = { tras: 550, base: 380, topo: Y_TOPO_VIDRO - FAIXA_TETO_PORTA };
portaCabine.pe = [peVidro[0] + normalTras[0] * FRESTA_COLUNA, peVidro[1] + normalTras[1] * FRESTA_COLUNA]; // pé da fresta da coluna
if (FAIXA_TETO_PORTA < 60 || FAIXA_TETO_PORTA > 90) throw new Error('a faixa de teto acima da porta da cabine sai de 60 a 90 mm');
const zArestaPorta = portaCabine.pe[0];
/* Ponto a `recuo` mm atrás do perfil do para-brisa, na perpendicular, a partir do ponto dele na altura y. */
const naColunaEm = (recuo, y) => {
  const z = P.baseVidro[0] + (coluna[0] / coluna[1]) * (y - P.baseVidro[1]);
  return [z + normalTras[0] * recuo, y + normalTras[1] * recuo];
};
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
/* A aresta vertical tem de cair no contorno do arco, por cima do centro da roda. Antes a regra pedia também a aresta à
   frente do eixo (z ≥ 1720), porque o pé da coluna ficava sobre ele; com a fresta recuada para a coluna ter 100 mm de
   lado, a aresta fica em z 1660, 60 mm atrás do eixo, e o contorno do arco segue pela parte de trás dele. */
if (Math.abs(zArestaPorta - zD) >= raioPorta || yArcoNaAresta <= R) throw new Error('a aresta da porta não desce sobre o arco');
const cantoDoVidro = naColuna(FRESTA_COLUNA + MOLDURA, vidroCabine.base);
if (vidroCabine.base < portaCabine.pe[1] || Math.hypot(cantoDoVidro[0] - portaCabine.pe[0], cantoDoVidro[1] - portaCabine.pe[1]) < MOLDURA - 1
  || vidroCabine.tras - portaCabine.tras < MOLDURA - 1
  || portaCabine.topo - vidroCabine.topo < MOLDURA - 1) throw new Error('o vidro sai da moldura da porta');
if (fendaColuna(vidroCabine.base) - naColuna(FRESTA_COLUNA + MOLDURA, vidroCabine.base)[0] < MOLDURA - 1) throw new Error('o vidro passa da coluna');
if (portaCorrer.tras - (zT + M.arcoRaio) < FOLGA_ARCO_TRASEIRO) throw new Error('a porta de correr fica a menos de 150 mm do arco traseiro');
/* A largura do alargamento é a mesma nos quatro arcos, em volta toda. */
const larguraDaMoldura = () => LARGURA_MOLDURA;
const bordaDaMoldura = (zc, a) => {
  const r = M.arcoRaio + larguraDaMoldura(zc, a);
  return [zc + r * Math.cos(a), R + r * Math.sin(a)];
};
/* O ângulo em que a borda de fora passa na altura y, atrás (lado −1) ou à frente (lado +1) do arco. */
function anguloDaBordaEm(zc, y, lado) {
  let [lo, hi] = lado > 0 ? [-Math.PI / 6, Math.PI / 3] : [Math.PI / 2, (7 * Math.PI) / 6];
  for (let k = 0; k < 60; k += 1) {
    const m = (lo + hi) / 2;
    const sobe = bordaDaMoldura(zc, m)[1] < y;
    if ((lado > 0) === sobe) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}
const zDaBordaEm = (zc, y, lado) => bordaDaMoldura(zc, anguloDaBordaEm(zc, y, lado))[0];
const zDaBocaEm = (zc, y, lado) => zc + lado * Math.sqrt(M.arcoRaio ** 2 - (y - R) ** 2);
/* A emenda de cor: a moldura da cor da lataria acaba, de cada lado do arco, na altura do topo da peça escura vizinha,
   numa linha horizontal da boca à borda de fora, e nenhum ponto dela fica abaixo; daí para baixo o alargamento é da
   peça escura e segue até o fundo dela, em 299. Atrás do arco traseiro a emenda é o degrau do para-choque traseiro
   (580), à frente do dianteiro o topo do para-choque dianteiro (724), e do lado da saia o topo da saia (463). */
const FUNDO_DO_ALARGAMENTO = SECAO_SAIA[0][1];
const PONTAS_DA_MOLDURA = {
  [zT]: { tras: DEGRAU_DE_CARGA, frente: topoDe(SECAO_SAIA) },
  [zD]: { tras: topoDe(SECAO_SAIA), frente: topoDe(SECAO_PARACHOQUE_DIANTEIRO) },
};
function contornoDaMoldura(zc, n = 72) {
  const { tras, frente } = PONTAS_DA_MOLDURA[zc];
  const a0 = anguloDaBordaEm(zc, tras, -1);
  const a1 = anguloDaBordaEm(zc, frente, 1);
  return Array.from({ length: n + 1 }, (_, i) => bordaDaMoldura(zc, a0 + ((a1 - a0) * i) / n));
}
/* O alargamento inteiro, do fundo de um lado ao do outro, na borda de fora (a da superfície, que no plástico fica sob a
   peça escura de D_NA_SAIA para fora). */
function contornoCompleto(zc, n = 400) {
  const a0 = anguloDaBordaEm(zc, FUNDO_DO_ALARGAMENTO, -1);
  const a1 = anguloDaBordaEm(zc, FUNDO_DO_ALARGAMENTO, 1);
  return Array.from({ length: n + 1 }, (_, i) => bordaDaMoldura(zc, a0 + ((a1 - a0) * i) / n));
}
/* No plástico, a linha em que o alargamento sai da peça escura, da emenda de cor até o fundo, de um lado do arco. */
function contornoNoPlastico(zc, lado, yFundo = FUNDO_DO_ALARGAMENTO, n = 24) {
  const r = M.arcoRaio + D_NA_SAIA;
  const yTopo = lado < 0 ? PONTAS_DA_MOLDURA[zc].tras : PONTAS_DA_MOLDURA[zc].frente;
  return Array.from({ length: n + 1 }, (_, i) => {
    const y = yTopo + ((yFundo - yTopo) * i) / n;
    return [zc + lado * Math.sqrt(r ** 2 - (y - R) ** 2), y];
  });
}
for (const zc of [zT, zD]) {
  const { tras, frente } = PONTAS_DA_MOLDURA[zc];
  const borda = contornoDaMoldura(zc, 400);
  const inteiro = contornoCompleto(zc);
  if (Math.abs(inteiro[0][1] - FUNDO_DO_ALARGAMENTO) > 0.5 || Math.abs(inteiro.at(-1)[1] - FUNDO_DO_ALARGAMENTO) > 0.5) throw new Error('o alargamento no plástico não chega ao fundo da peça escura');
  if (inteiro.some(([z, y]) => Math.abs(Math.hypot(z - zc, y - R) - (M.arcoRaio + LARGURA_MOLDURA)) > 0.5)) throw new Error('o alargamento no plástico não tem a mesma largura que o da cor da lataria');
  if (!(D_NA_SAIA > RESSALTO_ATE && D_NA_SAIA < LARGURA_MOLDURA && Math.abs(saidaDaMolduraEm(D_NA_SAIA) - saida(SECAO_SAIA)) < 0.01)) throw new Error('o alargamento no plástico não encontra a saída da saia');
  if (borda.some(([z, y]) => y < (z < zc ? tras : frente) - 0.5)) throw new Error('uma ponta da moldura desce abaixo do topo da peça escura vizinha');
  if (Math.abs(borda[0][1] - tras) > 0.5 || Math.abs(borda.at(-1)[1] - frente) > 0.5) throw new Error('a ponta da moldura não acaba no topo da peça escura vizinha');
}
/* A folga de 10 mm da borda de fora até a fresta da porta da cabine, medida contra o contorno dela em volta do arco e
   na aresta que sobe dele. */
{
  const fresta = [[zArestaPorta, portaCabine.pe[1]], ...arcoDaPorta()];
  const dist = (q) => Math.min(...fresta.slice(1).map((b, i) => {
    const a = fresta[i];
    const [vx, vy] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * vx + (q[1] - a[1]) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(q[0] - a[0] - t * vx, q[1] - a[1] - t * vy);
  }));
  const folga = Math.min(...contornoCompleto(zD).map(dist));
  if (folga < FOLGA_MOLDURA_FRESTA - 0.5) throw new Error(`a moldura do arco dianteiro fica a ${folga.toFixed(1)} mm da fresta da porta da cabine, menos que ${FOLGA_MOLDURA_FRESTA}`);
}
/* A saia entre os arcos, cortada pelas frestas das portas: cada porta tem de levar um trecho só, com as pontas nas
   frestas dela, e nenhum trecho preso à carroceria pode ficar sobre uma porta. Na altura do topo da saia, a frente da
   porta da cabine é o contorno do arco dela, a 160 mm do arco. */
const topoDaSaia = topoDe(SECAO_SAIA);
const saiaEntreOsArcos = [zDaBordaEm(zT, topoDaSaia, 1), zDaBordaEm(zD, topoDaSaia, -1)];
const frenteDaCabineNaSaia = zD - Math.sqrt(raioPorta ** 2 - (topoDaSaia - R) ** 2);
const portasNaSaia = [
  { nome: 'porta de correr', de: portaCorrer.tras, ate: portaCorrer.frente },
  { nome: 'porta da cabine', de: portaCabine.tras, ate: frenteDaCabineNaSaia },
];
function cortarSaia([ini, fim], portas) {
  const cortes = [ini, ...portas.flatMap((q) => [q.de, q.ate]), fim].sort((a, b) => a - b);
  return cortes.slice(1).map((b, i) => {
    const a = cortes[i];
    const porta = portas.find((q) => Math.abs(q.de - a) < 1e-6 && Math.abs(q.ate - b) < 1e-6);
    return { de: a, ate: b, leva: porta ? porta.nome : null };
  });
}
export const TRECHOS_DA_SAIA = cortarSaia(saiaEntreOsArcos, portasNaSaia);
/* No lado +x não há porta de correr: só a porta da cabine leva o trecho dela. */
export const TRECHOS_DA_SAIA_MAIS_X = cortarSaia(saiaEntreOsArcos, portasNaSaia.slice(1));
if (TRECHOS_DA_SAIA_MAIS_X.filter((t) => t.leva).length !== 1) throw new Error('no lado +x a porta da cabine não leva exatamente um trecho de saia');
for (const q of portasNaSaia) {
  if (!(BASE_DAS_PORTAS > SECAO_SAIA[0][1] && BASE_DAS_PORTAS < topoDaSaia)) throw new Error('a base das portas não fica dentro da saia');
  if (q.de < saiaEntreOsArcos[0] || q.ate > saiaEntreOsArcos[1]) throw new Error(`a ${q.nome} passa da saia entre os arcos`);
  const dela = TRECHOS_DA_SAIA.filter((t) => t.leva === q.nome);
  if (dela.length !== 1) throw new Error(`a ${q.nome} não leva exatamente um trecho de saia`);
}
for (const t of TRECHOS_DA_SAIA.filter((x) => !x.leva)) {
  if (portasNaSaia.some((q) => t.de < q.ate - 1e-6 && t.ate > q.de + 1e-6)) throw new Error(`trecho preso da saia de ${t.de} a ${t.ate} fica sobre uma porta`);
  if (t.ate - t.de < 0) throw new Error('trecho de saia com comprimento negativo: as portas se sobrepõem');
}
const folgaMolduraPortaDeCorrer = portaCorrer.tras - Math.max(...contornoCompleto(zT).map(([z]) => z));
if (folgaMolduraPortaDeCorrer < 100) throw new Error(`a moldura do arco traseiro fica a ${folgaMolduraPortaDeCorrer} mm da porta de correr`);

/* ------------------------------------------------------------ seção frontal e traseira */
/* Projeção ao longo de z: a caixa de carga é a parte mais larga e mais alta, então frontal e traseira têm o mesmo
   contorno. A lateral é vertical em 2000 de largura até o vinco de cintura (1190) e dali se inclina para dentro até o
   teto, onde o prolongamento dela chega com 1820 de largura (90 mm a menos de cada lado), como a pessoa escolheu em
   2026-10-31 para o furgão não parecer estreito; a passagem no vinco é um raio de 3000, sem quina. A quina do teto
   com a lateral tem raio de 300. */
const RAIO_QUINA_TETO = 300;
const Y_VINCO = 1190;
const LARGURA_NO_TETO = 1820;
const RAIO_NO_VINCO = 3000;
const xLateralNoTeto = LARGURA_NO_TETO / 2;
/* Com a saia: de frente e de trás ela sai 20 mm de cada lado, de 299 a 463, e a largura nela é 2040. */
const saiaDeFrente = (s) => SECAO_SAIA.map(([u, y]) => [s * (xMax + u), y]);
/* De frente e de trás o alargamento aparece por fora da saia: sai 30 mm de embaixo, com a borda de baixo rolada da saia
   na saída dele, até y 805 no alto do arco, e desce suave até a chapa em 925. */
const iSaiaCheia = SECAO_SAIA.findIndex(([u]) => u === saida(SECAO_SAIA));
const iMolduraCheia = SECAO_MOLDURA.map(([u]) => u).lastIndexOf(saida(SECAO_MOLDURA));
const ladoDeBaixo = (sx) => [
  ...SECAO_SAIA.slice(0, iSaiaCheia + 1).map(([u, y]) => [sx * (xMax + (u * SAIDA_DA_MOLDURA) / saida(SECAO_SAIA)), y]),
  ...SECAO_MOLDURA.slice(iMolduraCheia).map(([u, d]) => [sx * (xMax + u), R + M.arcoRaio + d]),
];
const Y_TOPO_DA_MOLDURA = R + M.arcoRaio + LARGURA_MOLDURA;
const silhuetaFrontal = [...ladoDeBaixo(-1).reverse(), ...ladoDeBaixo(1), [xMax, Y_VINCO, RAIO_NO_VINCO], [xLateralNoTeto, M.altura, RAIO_QUINA_TETO], [-xLateralNoTeto, M.altura, RAIO_QUINA_TETO], [-xMax, Y_VINCO, RAIO_NO_VINCO]];
const INCLINACAO_LATERAL = Math.atan2(xMax - xLateralNoTeto, M.altura - Y_VINCO) / grau;
/* Meia largura da cabine na altura y: vertical até o vinco e fechando em reta até o teto (o raio no vinco tira menos de
   2 mm dela). */
const meiaLarguraEm = (y) => (y <= Y_VINCO ? xMax : xMax - ((xMax - xLateralNoTeto) * (y - Y_VINCO)) / (M.altura - Y_VINCO));
const xPneuDentro = M.bitola / 2 - M.pneuLargura / 2; // 747,5
const xPneuFora = M.bitola / 2 + M.pneuLargura / 2; // 982,5
/* De frente e de trás só se vê o pneu abaixo da soleira: a carroceria cobre o resto, e o pneu inteiro cruzava as portas
   traseiras. O diâmetro fica cotado na lateral. */
const pneuDeFrente = (s) => [[s * xPneuDentro, M.soleira], [s * xPneuDentro, 0, 50], [s * xPneuFora, 0, 50], [s * xPneuFora, M.soleira]];
/* Portas traseiras: o vão tem 1800 até o vinco e, acima dele, a borda de fora acompanha a lateral, sempre 100 mm para
   dentro dela, a folga da quina traseira de raio 100 vista de cima; no topo das portas (2380) o vão fica com cerca de
   1636. Escolha da pessoa em 2026-10-31. A fresta do meio não muda. */
const FOLGA_QUINA_TRASEIRA = 100;
const TOPO_PORTA_TRASEIRA = 2380;
const bordaDaPortaTraseira = (y) => Math.min(900, meiaLarguraEm(y) - FOLGA_QUINA_TRASEIRA);
const xPortaTraseiraTopo = bordaDaPortaTraseira(TOPO_PORTA_TRASEIRA);
const portaTraseira = (s) => [[s * 6, 590, 20], [s * 900, 590, 40], [s * 900, Y_VINCO, RAIO_NO_VINCO], [s * xPortaTraseiraTopo, TOPO_PORTA_TRASEIRA, 90], [s * 6, TOPO_PORTA_TRASEIRA, 20]];
/* As janelas ficam onde estavam, 740 na base; só o canto de cima de fora entra, para a borda de fora correr paralela à
   da porta com a mesma folga que ela tem na base da janela (45 mm). */
const JANELA_TRASEIRA = { dentro: 80, fora: 820, base: 1700, topo: 2200 };
const folgaDaJanela = bordaDaPortaTraseira(JANELA_TRASEIRA.base) - JANELA_TRASEIRA.fora;
const xJanelaTraseiraTopo = bordaDaPortaTraseira(JANELA_TRASEIRA.topo) - folgaDaJanela;
const larguraDaJanelaEm = (y) => JANELA_TRASEIRA.fora + ((xJanelaTraseiraTopo - JANELA_TRASEIRA.fora) * (y - JANELA_TRASEIRA.base)) / (JANELA_TRASEIRA.topo - JANELA_TRASEIRA.base) - JANELA_TRASEIRA.dentro;
const vidroTraseiro = (s) => [[s * JANELA_TRASEIRA.dentro, JANELA_TRASEIRA.base, 50], [s * JANELA_TRASEIRA.fora, JANELA_TRASEIRA.base, 50], [s * xJanelaTraseiraTopo, JANELA_TRASEIRA.topo, 70], [s * JANELA_TRASEIRA.dentro, JANELA_TRASEIRA.topo, 50]];
if (folgaDaJanela < 40) throw new Error(`a janela traseira fica a ${folgaDaJanela} mm da borda da porta`);
/* O para-choque traseiro que a lateral mostra, de trás: da soleira (300) ao degrau de carga (570), no plástico escuro,
   envolvendo as quinas, com o lugar da placa (400 × 130); entre o degrau e a base das portas (590) fica a faixa de
   20 mm da traseira. */
const parachoqueDeTras = [[-990, 305, 40], [990, 305, 40], [990, DEGRAU_DE_CARGA, 30], [-990, DEGRAU_DE_CARGA, 30]];
const placaDeTras = [[-200, 390, 10], [200, 390, 10], [200, 520, 10], [-200, 520, 10]];
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
/* De lado, a coluna é a faixa de chapa entre a ponta dobrada do vidro e a fresta da porta, na perpendicular. */
const pontaDoVidroDeLado = recuoDaPonta * Math.sin(ANGULO_PARA_BRISA * grau);
const colunaDeLado = FRESTA_COLUNA - pontaDoVidroDeLado;
if (colunaDeLado < COLUNA_LATERAL.min || colunaDeLado > COLUNA_LATERAL.max) throw new Error(`a coluna do para-brisa de lado tem ${colunaDeLado} mm, fora de 90 a 110`);
/* A frente abaixo do para-brisa, só em contornos de posição: o capô entre a boca (954) e o pé do para-brisa (1310); o
   para-choque no plástico escuro, envolvendo as quinas até a soleira, com a entrada de ar embaixo e o lugar da placa
   (400 × 130); entre ele e a boca, os faróis grandes nas quinas e a grade entre eles. */
const capoDeFrente = [[-880, boca[1] + 10, 50], [880, boca[1] + 10, 50],
  ...arcoFrontal(xPontaBase, peVidro[1], COROA_CAPO).reverse().map(([x, y], i, a) => (i === 0 || i === a.length - 1 ? [x, y, 30] : [x, y]))];
/* O para-choque dianteiro em duas alturas, com a faixa da entrada de ar recuada de uma quina à outra, de 388 a 482. */
const parachoqueDeFrente = [[-990, 305, 40], [990, 305, 40], [990, topoDe(SECAO_PARACHOQUE_DIANTEIRO), 40], [-990, topoDe(SECAO_PARACHOQUE_DIANTEIRO), 40]];
const entradaDeAr = [[-975, 388], [975, 388], [975, 482], [-975, 482]];
const placa = [[-200, 520, 10], [200, 520, 10], [200, 650, 10], [-200, 650, 10]];
const farol = (s) => [[s * 560, 830, 40], [s * 960, 830, 40], [s * 960, boca[1] - 10, 50], [s * 560, boca[1] - 10, 50]];
const grade = [[-500, 785, 30], [500, 785, 30], [500, boca[1] - 25, 30], [-500, boca[1] - 25, 30]];

/* ------------------------------------------------------------ planta */
/* Vista de cima, [z, x]: para-choques envolvendo as quinas (raio 280 na frente, 100 atrás). A borda do teto é onde o
   teto plano termina, nas tangentes dos raios da lateral (testa e quina traseira) e da frontal (quina do teto). */
/* De cima, com o plástico: o para-choque dianteiro em 2750, com a quina de 300 até a saia em ±1020; o traseiro em
   -2810, com a quina de 210. A chapa fica desenhada por dentro. */
/* De cima, nos arcos o alargamento passa da saia: em cada z, a maior saída dele (30 até 450 mm do eixo, descendo até a
   chapa em 570), e a saia em 20 no resto. */
const saidaDeCima = (dz) => {
  const d = Math.abs(dz) - M.arcoRaio;
  return d <= RESSALTO_ATE ? SAIDA_DA_MOLDURA : saidaDaMolduraEm(d);
};
const meiaLarguraDeCima = (z) => xMax + Math.max(saida(SECAO_SAIA), ...[zT, zD].map((zc) => saidaDeCima(z - zc)));
const planta = (() => {
  const [rF, rT] = [300, 210];
  const canto = (cz, cx, r, a0, a1, n = 12) => Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cz + r * Math.cos(a), cx + r * Math.sin(a)];
  });
  const zs = [];
  for (let z = Z_FRENTE_PLASTICO - rF - 10; z > Z_TRAS_PLASTICO + rT; z -= 10) zs.push(z);
  return [
    ...canto(Z_FRENTE_PLASTICO - rF, X_SAIA - rF, rF, 0, Math.PI / 2),
    ...zs.map((z) => [z, meiaLarguraDeCima(z)]),
    ...canto(Z_TRAS_PLASTICO + rT, X_SAIA - rT, rT, Math.PI / 2, Math.PI),
    ...canto(Z_TRAS_PLASTICO + rT, -(X_SAIA - rT), rT, Math.PI, 1.5 * Math.PI),
    ...zs.slice().reverse().map((z) => [z, -meiaLarguraDeCima(z)]),
    ...canto(Z_FRENTE_PLASTICO - rF, -(X_SAIA - rF), rF, 1.5 * Math.PI, 2 * Math.PI).slice(0, -1),
  ];
})();
const RAIO_QUINA_CHAPA_TRAS = 100;
const chapaDeCima = [[zFrente, -xMax, 280], [zFrente, xMax, 280], [zTras, xMax, RAIO_QUINA_CHAPA_TRAS], [zTras, -xMax, RAIO_QUINA_CHAPA_TRAS]];
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
const zTetoPlano = inicioDoTeto[0];
const zTetoPlanoTras = P.quinaTraseira[0] + RAIO_QUINA_TRASEIRA;
const xTetoPlano = xLateralNoTeto - RAIO_QUINA_TETO * Math.tan((Math.PI - Math.atan2(M.altura - Y_VINCO, xLateralNoTeto - xMax)) / 2);
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
  { id: 'frente', vista: 'lateral', em: [Z_FRENTE_PLASTICO, 650], sobre: 'nariz', rotuloEm: [2580, 120] },
  { id: 'boca', vista: 'lateral', em: P.boca, sobre: 'nariz', rotuloEm: [2480, 1230] },
  { id: 'baseVidro', vista: 'lateral', em: P.baseVidro, sobre: 'capoEParaBrisa', rotuloEm: [2080, 1560] },
  { id: 'topoVidro', vista: 'lateral', em: P.topoVidro, sobre: 'teto', rotuloEm: [1250, 2640] },
  { id: 'teto', vista: 'lateral', em: [0, M.altura], sobre: 'teto', rotuloEm: [-450, 2640] },
  { id: 'degrau', vista: 'lateral', em: [zTras - 50, DEGRAU_DE_CARGA], sobre: 'traseira', rotuloEm: [Z_TRAS_PLASTICO - 60, 520], rotuloAncora: 'end' },
  { id: 'traseira', vista: 'lateral', em: [Z_TRAS_PLASTICO, 450], sobre: 'traseira', rotuloEm: [Z_TRAS_PLASTICO - 60, 380], rotuloAncora: 'end' },
  { id: 'soleira', vista: 'lateral', em: [0, M.soleira], sobre: 'soleira', rotuloEm: [250, 150] },
  { id: 'arcoD', vista: 'lateral', em: [zD, R + M.arcoRaio], sobre: 'arcoDianteiro', rotuloEm: [1950, 960] },
  { id: 'arcoT', vista: 'lateral', em: [zT, R + M.arcoRaio], sobre: 'arcoTraseiro', rotuloEm: [zT + 20, 960] },
  { id: 'cabineT', vista: 'lateral', em: [portaCabine.tras, 1900], sobre: 'portaDaCabine', rotuloEm: [480, 2640], rotuloAncora: 'end' },
  { id: 'correrF', vista: 'lateral', em: [portaCorrer.frente, 2100], sobre: 'portaDeCorrer', rotuloEm: [-130, 2640] },
  { id: 'correrT', vista: 'lateral', em: [portaCorrer.tras, 2100], sobre: 'portaDeCorrer', rotuloEm: [-1220, 2640] },
  { id: 'cabineF', vista: 'lateral', em: [zD - Math.sqrt(raioPorta ** 2 - (500 - R) ** 2), 500], sobre: 'portaDaCabine', rotuloEm: [1000, 150] },
  { id: 'bordaTeto', vista: 'planta', em: [zTetoPlano, -300], sobre: 'bordaDoTeto', rotuloEm: [zTetoPlano - 200, -360], rotuloAncora: 'end' },
  { id: 'chapa', vista: 'planta', em: [zTras, 300], sobre: 'chapaDeCima', rotuloEm: [-2300, 400] },
  { id: 'plástico', vista: 'planta', em: [Z_FRENTE_PLASTICO, -500], sobre: 'silhuetaDeCima', rotuloEm: [2790, -1080] },
  { id: 'largura', vista: 'frontal', em: [xMax, 1000], sobre: 'silhuetaFrontal', rotuloEm: [1060, 900] },
  { id: 'vinco', vista: 'frontal', em: [xMax, Y_VINCO], sobre: 'silhuetaFrontal', rotuloEm: [1060, Y_VINCO + 60] },
  { id: 'vaoTraseiro', vista: 'traseira', em: [900, 900], sobre: 'portaTraseiraEsq', rotuloEm: [1060, 1050], rotuloAncora: 'end' },
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
const Y_LARGURA_MAXIMA = 1100;
const V = {
  lateral: { x: 70, y: 150, leitura: 'projecao', rotuloEm: [70, 96], rotulo: 'LATERAL DIREITA (LADO -X), FRENTE À DIREITA' },
  frontal: { x: 1090, y: 150, leitura: 'projecao', rotuloEm: [1090, 96], rotulo: 'FRONTAL' },
  traseira: { x: 1500, y: 150, leitura: 'projecao', rotuloEm: [1500, 96], rotulo: 'TRASEIRA' },
  planta: { x: 70, y: 720, leitura: 'projecao', rotuloEm: [70, 686], rotulo: 'DE CIMA, FRENTE À DIREITA' },
};

const motivoRodaLateral = 'na lateral a roda desce abaixo da soleira e fica dentro do arco, que é abertura da silhueta';
const motivoAroLateral = 'o aro fica dentro do arco da roda, que é abertura da silhueta na lateral';
const motivoRodaFrente = 'na frontal e na traseira o pneu desce da soleira (300) até o chão; na planta ele fica dentro';

/* As camadas do detalhe F: a saia entre as molduras, as molduras e a boca dos arcos, e as portas cortando a saia. */
function camadasDaFaixa(letra = 'F', comCorrer = true) {
  const naFaixa = letra === 'F' ? (z, y) => naFaixaBase(z, y) : naG;
  const motivo = { foraDoContorno: true, motivoForaDoContorno: `detalhe ${letra} ampliado da faixa de baixo, abaixo da vista de cima` };
  const alturas = Array.from({ length: 13 }, (_, i) => SECAO_SAIA[0][1] + ((490 - SECAO_SAIA[0][1]) * i) / 12);
  const lado = (zc, r, s) => alturas.map((y) => naFaixa(zc + s * Math.sqrt(r ** 2 - (y - R) ** 2), y));
  const frenteCabine = (y) => zD - Math.sqrt(raioPorta ** 2 - (y - R) ** 2);
  /* a borda de fora da moldura, da ponta (no topo da saia) até o alto da faixa */
  const bordaAcima = (zc, s) => Array.from({ length: 7 }, (_, i) => topoDaSaia + ((490 - topoDaSaia) * i) / 6).map((y) => naFaixa(zDaBordaEm(zc, y, s), y));
  const L = (nome, classe, pts) => ({ vista: 'planta', classe, nome: `faixa${letra === 'F' ? '' : letra}${nome}`, tipo: 'poli', pts, ...motivo });
  return [
    L('SaiaTopo', 'painel', [naFaixa(zDaBocaEm(zT, topoDaSaia, 1), topoDaSaia), naFaixa(zDaBocaEm(zD, topoDaSaia, -1), topoDaSaia)]),
    L('SaiaBase', 'contorno', [naFaixa(zDaBocaEm(zT, SECAO_SAIA[0][1], 1), SECAO_SAIA[0][1]), naFaixa(zDaBocaEm(zD, SECAO_SAIA[0][1], -1), SECAO_SAIA[0][1])]),
    L('MolduraTraseira', 'painel', bordaAcima(zT, 1)),
    L('AlargamentoTraseiro', 'painel', contornoNoPlastico(zT, 1).map(([z, y]) => naFaixa(z, y))),
    L('AlargamentoDianteiro', 'painel', contornoNoPlastico(zD, -1).map(([z, y]) => naFaixa(z, y))),
    L('ArcoTraseiro', 'contorno', lado(zT, M.arcoRaio, 1)),
    L('MolduraDianteira', 'painel', bordaAcima(zD, -1)),
    L('ArcoDianteiro', 'contorno', lado(zD, M.arcoRaio, -1)),
    ...(comCorrer ? [L('PortaDeCorrer', 'painel', [naFaixa(portaCorrer.tras, 490), naFaixa(portaCorrer.tras, BASE_DAS_PORTAS), naFaixa(portaCorrer.frente, BASE_DAS_PORTAS), naFaixa(portaCorrer.frente, 490)])] : []),
    L('PortaDaCabine', 'painel', [naFaixa(portaCabine.tras, 490), naFaixa(portaCabine.tras, BASE_DAS_PORTAS), ...alturas.filter((y) => y >= BASE_DAS_PORTAS).map((y) => naFaixa(frenteCabine(y), y))]),
    /* em F, os planos A e E, onde os cortes passam */
    ...(comCorrer ? [['A', PLANO_A], ['E', PLANO_E]].map(([l, z]) => L(`Plano${l}`, 'corte', [naFaixa(z, SECAO_SAIA[0][1]), naFaixa(z, 500)])) : []),
  ];
}
const naFaixaBase = naFaixa;

export const ESPEC = {
  titulo: 'furgao-realista — prancha ortográfica cotada (medidas em mm)',
  subtitulo: 'Furgão médio de teto alto, medidas de classe do alinhamento de 2026-10-30. Derivada da tabela: divergiu, a tabela manda.',
  escala: ESCALA,
  tela: { largura: 1900, altura: 1960 },
  limites: { zMin: Z_TRAS_PLASTICO, zMax: Z_FRENTE_PLASTICO, yMax: M.altura, xMax: X_ALARGAMENTO },
  vistas: V,
  /* o envelope é o de fora, com o plástico; a chapa continua com 5400 × 2000 */
  envelope: { comprimento: COMPRIMENTO_COM_PLASTICO, largura: LARGURA_NOS_ARCOS, altura: M.altura },
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
        evidencia: 'ALINHAMENTO.md do furgão realista (2026-10-30): comprimento 5400, largura 2000 sem retrovisores, altura 2500, entre-eixos 3300, pneu 225/65 aro 16 com 710 de diâmetro e 225 de largura (a pessoa passou a 235 de largura e bitola 1730 em 2026-10-31); medidas de classe de fichas públicas de furgões médios de teto alto, sem marca nem modelo',
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
      { id: 'bitola', sobre: 'bitola de 1730 igual nos dois eixos', fonte: 'ajuste', efeito: 'diagnostico', motivo: 'escolhida pela pessoa em 2026-10-31 para a face de fora do pneu ficar 17,5 mm para dentro da lateral; não vem de ficha' },
      { id: 'pneu', sobre: 'diâmetro do pneu', fonte: 'classe', efeito: 'diagnostico', motivo: 'o alinhamento diz cerca de 710; a conta nominal do 235/65 aro 16 dá 712' },
      { id: 'cabine', sobre: 'boca do capô, base e topo do para-brisa e testa do teto alto', fonte: 'proporcao', efeito: 'diagnostico', motivo: 'posições estimadas para o bico curto; nenhuma ficha de classe as traz, e a pessoa aprova a forma' },
      { id: 'portas', sobre: 'linhas das portas, vidros e arcos', fonte: 'proporcao', efeito: 'diagnostico', motivo: 'posição e tamanho estimados (porta de correr de 1300, vão traseiro de 1800, arco de raio 420); valem como alvo até a pessoa pedir outro' },
    ],
  },
  camadas: [
    /* 1. silhuetas */
    /* o nariz com o para-choque de plástico, que sai 50 mm da frente da chapa entre 300 e 724 */
    { vista: 'lateral', contorno: true, nome: 'nariz', tipo: 'filete', pts: [[zD + dzArco, M.soleira], ...SECAO_PARACHOQUE_DIANTEIRO.map(([u, y]) => [zFrente + u, y]), [2660, 760], [...P.boca, 20], meio(P.boca, P.baseVidro)] },
    { vista: 'lateral', contorno: true, nome: 'capoEParaBrisa', tipo: 'filete', pts: [meio(P.boca, P.baseVidro), [...P.baseVidro, 90], meio(P.baseVidro, P.topoVidro)], esperado: { inversoesMax: 0, raioMinMin: 80 } },
    /* Do meio do para-brisa ao meio da traseira num trecho só: o vidro reto até o topo, a curva da frente do teto em
       pontos e a quina traseira em filete. */
    { vista: 'lateral', contorno: true, nome: 'teto', tipo: 'filete', pts: [meio(P.baseVidro, P.topoVidro), P.topoVidro, ...arcoDoVidro, ...arcoDaTesta.slice(0, -1), inicioDoTeto, [...P.quinaTraseira, RAIO_QUINA_TRASEIRA], meio(P.quinaTraseira, P.degrau)], esperado: { inversoesMax: 0, concentracaoMax: 0.3, raioMinMin: 170 } },
    /* a traseira com o para-choque de plástico: o degrau de carga em 580 e a face 110 mm atrás da chapa dele */
    { vista: 'lateral', contorno: true, nome: 'traseira', tipo: 'filete', pts: [meio(P.quinaTraseira, P.degrau), [P.degrau[0], DEGRAU_DE_CARGA], ...SECAO_PARACHOQUE_TRASEIRO.slice().reverse().map(([u, y]) => [zTras - u, y]), [zT - dzArco, M.soleira]] },
    { vista: 'lateral', contorno: true, nome: 'arcoTraseiro', tipo: 'poli', pts: arco(zT) },
    { vista: 'lateral', contorno: true, nome: 'soleira', tipo: 'poli', pts: [[zT + dzArco, M.soleira], [zD - dzArco, M.soleira]], esperado: { inversoesMax: 0 } },
    { vista: 'lateral', contorno: true, nome: 'arcoDianteiro', tipo: 'poli', pts: arco(zD) },
    { vista: 'frontal', contorno: true, nome: 'silhuetaFrontal', tipo: 'filete', fechado: true, pts: silhuetaFrontal },
    { vista: 'traseira', contorno: true, nome: 'silhuetaTraseira', tipo: 'filete', fechado: true, pts: silhuetaFrontal },
    { vista: 'planta', contorno: true, nome: 'silhuetaDeCima', tipo: 'poli', fechado: true, pts: planta },
    { vista: 'planta', classe: 'painel', nome: 'chapaDeCima', tipo: 'filete', fechado: true, pts: chapaDeCima },

    /* 2. aberturas: vidros (os arcos são a própria silhueta lateral) */
    /* de lado, a ponta dobrada do para-brisa, 27 mm atrás do perfil na horizontal, entre as pontas de baixo e de cima do
       vidro; entre ela e a fresta da porta fica a coluna */
    { vista: 'lateral', classe: 'vidro', nome: 'pontaDoParaBrisa', tipo: 'poli', pts: [vidroBaseY - flechaBase, vidroTopoY - FLECHA_TOPO].map((y) => [P.baseVidro[0] + (coluna[0] / coluna[1]) * (y - P.baseVidro[1]) - recuoDaPonta, y]) },
    { vista: 'lateral', classe: 'vidro', nome: 'vidroDaCabine', tipo: 'filete', fechado: true, pts: [[...naColuna(FRESTA_COLUNA + MOLDURA, vidroCabine.base), 30], [...naColuna(FRESTA_COLUNA + MOLDURA, vidroCabine.topo), 80], [vidroCabine.tras, vidroCabine.topo, 60], [vidroCabine.tras, vidroCabine.base, 40]] },
    { vista: 'frontal', classe: 'vidro', nome: 'paraBrisa', tipo: 'filete', fechado: true, pts: vidroDeFrente },
    { vista: 'planta', classe: 'vidro', nome: 'paraBrisaDeCima', tipo: 'filete', fechado: true, pts: vidroDeCima },
    { vista: 'traseira', classe: 'vidro', nome: 'vidroTraseiroEsq', tipo: 'filete', fechado: true, pts: vidroTraseiro(1) },
    { vista: 'traseira', classe: 'vidro', nome: 'vidroTraseiroDir', tipo: 'filete', fechado: true, pts: vidroTraseiro(-1) },

    /* 3. linhas de porta e borda do teto */
    { vista: 'lateral', classe: 'painel', nome: 'portaDaCabine', tipo: 'filete', fechado: true, pts: [...arcoDaPorta().reverse(), [...portaCabine.pe, 60], [...naColuna(FRESTA_COLUNA, portaCabine.topo), 60], [portaCabine.tras, portaCabine.topo, 60], [portaCabine.tras, portaCabine.base, 40]] },
    /* o vinco de cintura em 1190, ao longo da lateral, da traseira até a quina da frente sobre o capô */
    /* a faixa de plástico de baixo, de 300 a 460, sobre a base das portas, interrompida nos arcos e emendada nos
       para-choques, que de lado vão da quina de raio 280 à frente e da de raio 100 atrás; as frestas das portas a
       atravessam até a base delas */
    /* o plástico de lado: a saia entre as molduras dos arcos, as molduras por fora de cada arco e os para-choques, que
       dobram nas quinas até a moldura; as frestas das portas atravessam a saia até a base delas */
    /* planos dos cortes A (saia, num trecho preso atrás da porta de correr) e B (moldura do arco traseiro, radial) */
    { vista: 'lateral', classe: 'corte', nome: 'planoA', tipo: 'poli', pts: [[PLANO_A, 305], [PLANO_A, 540]] },
    { vista: 'lateral', classe: 'corte', nome: 'planoE', tipo: 'poli', pts: [[PLANO_E, 305], [PLANO_E, 540]] },
    { vista: 'lateral', classe: 'corte', nome: 'planoB', tipo: 'poli', pts: [422, 600].map((r) => [zT + r * Math.cos(ANGULO_PLANO_B), R + r * Math.sin(ANGULO_PLANO_B)]) },
    { vista: 'lateral', classe: 'corte', nome: 'planoI', tipo: 'poli', pts: [422, 560].map((r) => [zT + r * Math.cos(ANGULO_PLANO_I), R + r * Math.sin(ANGULO_PLANO_I)]) },
    { vista: 'frontal', classe: 'corte', nome: 'planoC', tipo: 'poli', pts: [[PLANO_C, 305], [PLANO_C, 720]] },
    { vista: 'traseira', classe: 'corte', nome: 'planoD', tipo: 'poli', pts: [[PLANO_D, 305], [PLANO_D, 576]] },
    /* os mesmos planos de cima: passam um pouco da silhueta para se lerem */
    ...[['A', PLANO_A], ['E', PLANO_E], ['B', zT + 445 * Math.cos(ANGULO_PLANO_B)], ['I', zT + 490 * Math.cos(ANGULO_PLANO_I)]].map(([l, z]) => ({ vista: 'planta', classe: 'corte', nome: `plano${l}DeCima`, tipo: 'poli', pts: [[z, -X_SAIA - 30], [z, -xMax + 25]], foraDoContorno: true, motivoForaDoContorno: 'marca do plano de corte, passa da silhueta para se ler' })),
    { vista: 'planta', classe: 'corte', nome: 'planoCDeCima', tipo: 'poli', pts: [[zFrente - 60, PLANO_C], [Z_FRENTE_PLASTICO + 25, PLANO_C]], foraDoContorno: true, motivoForaDoContorno: 'marca do plano de corte, passa da silhueta para se ler' },
    { vista: 'planta', classe: 'corte', nome: 'planoDDeCima', tipo: 'poli', pts: [[Z_TRAS_PLASTICO - 25, PLANO_D], [zTras + 20, PLANO_D]], foraDoContorno: true, motivoForaDoContorno: 'marca do plano de corte, passa da silhueta para se ler' },
    /* o detalhe F da faixa de baixo no lado -x */
    ...camadasDaFaixa(),
    ...camadasDaFaixa('G', false),
    /* na lateral, a extensão do detalhe F, em volta da faixa de baixo de arco a arco */
    { vista: 'lateral', classe: 'carater', nome: 'marcaDoDetalheF', tipo: 'poli', pts: [[zDaBocaEm(zT, M.soleira, 1) - 20, 260], [zDaBocaEm(zD, M.soleira, -1) + 20, 260], [zDaBocaEm(zD, M.soleira, -1) + 20, 525], [zDaBocaEm(zT, M.soleira, 1) - 20, 525], [zDaBocaEm(zT, M.soleira, 1) - 20, 260]], foraDoContorno: true, motivoForaDoContorno: 'marca do detalhe F: passa da soleira e entra nos arcos para cercar a faixa' },
    /* escala gráfica da lateral */
    { vista: 'lateral', classe: 'painel', nome: 'escalaGrafica', tipo: 'poli', pts: [[-2700, -640], [-2700, -690], [-1700, -690], [-1700, -640]], foraDoContorno: true, motivoForaDoContorno: 'escala gráfica, abaixo das cotas da lateral' },
    /* o topo da saia e dos para-choques vai da boca do arco: as pontas da moldura assentam nele */
    { vista: 'lateral', classe: 'painel', nome: 'saia', tipo: 'poli', pts: [[zDaBocaEm(zT, TOPO_FAIXA, 1), TOPO_FAIXA], [zDaBocaEm(zD, TOPO_FAIXA, -1), TOPO_FAIXA]] },
    { vista: 'lateral', classe: 'painel', nome: 'molduraArcoDianteiro', tipo: 'poli', pts: contornoDaMoldura(zD) },
    { vista: 'lateral', classe: 'painel', nome: 'molduraArcoTraseiro', tipo: 'poli', pts: contornoDaMoldura(zT) },
    /* abaixo da emenda de cor, o alargamento no plástico, até onde ele sai da peça escura */
    ...[[zT, -1, 'TraseiroAtras'], [zT, 1, 'TraseiroFrente'], [zD, -1, 'DianteiroAtras'], [zD, 1, 'DianteiroFrente']].map(([zc, lado, nome]) => ({ vista: 'lateral', classe: 'painel', nome: `alargamento${nome}`, tipo: 'poli', pts: contornoNoPlastico(zc, lado, M.soleira + 5) })),
    { vista: 'lateral', classe: 'painel', nome: 'parachoqueDianteiroDeLado', tipo: 'poli', pts: [[zDaBocaEm(zD, topoDe(SECAO_PARACHOQUE_DIANTEIRO), 1), topoDe(SECAO_PARACHOQUE_DIANTEIRO)], [zFrente - 5, topoDe(SECAO_PARACHOQUE_DIANTEIRO)]] },
    { vista: 'lateral', classe: 'painel', nome: 'parachoqueTraseiroDeLado', tipo: 'poli', pts: [[zDaBocaEm(zT, DEGRAU_DE_CARGA - 2, -1), DEGRAU_DE_CARGA - 2], [P.degrau[0] - 5, DEGRAU_DE_CARGA - 2]] },
    { vista: 'lateral', classe: 'carater', nome: 'vincoDeCintura', tipo: 'poli', pts: [[P.quinaTraseira[0] + 70, Y_VINCO], [boca[0] - ((Y_VINCO - boca[1]) / (peVidro[1] - boca[1])) * (boca[0] - peVidro[0]) - 70, Y_VINCO]] },
    { vista: 'lateral', classe: 'painel', nome: 'portaDeCorrer', tipo: 'filete', fechado: true, pts: [[portaCorrer.frente, portaCorrer.base, 50], [portaCorrer.frente, portaCorrer.topo, 60], [portaCorrer.tras, portaCorrer.topo, 60], [portaCorrer.tras, portaCorrer.base, 50]] },
    { vista: 'traseira', classe: 'painel', nome: 'portaTraseiraEsq', tipo: 'filete', fechado: true, pts: portaTraseira(1) },
    { vista: 'traseira', classe: 'painel', nome: 'portaTraseiraDir', tipo: 'filete', fechado: true, pts: portaTraseira(-1) },
    { vista: 'traseira', classe: 'painel', nome: 'parachoqueTraseiro', tipo: 'filete', fechado: true, pts: parachoqueDeTras },
    { vista: 'traseira', classe: 'painel', nome: 'placaTraseira', tipo: 'filete', fechado: true, pts: placaDeTras },
    { vista: 'planta', classe: 'painel', nome: 'bordaDoTeto', tipo: 'filete', fechado: true, pts: bordaDoTeto },
    { vista: 'planta', classe: 'painel', nome: 'capoDeCima', tipo: 'filete', fechado: true, pts: capoDeCima },
    { vista: 'frontal', classe: 'painel', nome: 'capo', tipo: 'filete', fechado: true, pts: capoDeFrente },
    { vista: 'frontal', classe: 'painel', nome: 'parachoqueDianteiro', tipo: 'filete', fechado: true, pts: parachoqueDeFrente },
    { vista: 'frontal', classe: 'painel', nome: 'entradaDeAr', tipo: 'poli', fechado: true, pts: entradaDeAr },
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
    /* na frontal, o resto do pneu atrás do corpo, escondido, para a cota do diâmetro */
    ...[1, -1].map((sx) => ({ vista: 'frontal', classe: 'oculta', nome: `pneuFrontalOculto${sx > 0 ? 'Esq' : 'Dir'}`, tipo: 'filete', pts: [[sx * xPneuDentro, M.soleira + 2], [sx * xPneuDentro, M.pneuDiametro, 50], [sx * xPneuFora, M.pneuDiametro, 50], [sx * xPneuFora, M.soleira + 2]] })),
    { vista: 'traseira', classe: 'roda', nome: 'pneuTraseiroVistoEsq', tipo: 'filete', pts: pneuDeFrente(1), foraDoContorno: true, motivoForaDoContorno: motivoRodaFrente },
    { vista: 'traseira', classe: 'roda', nome: 'pneuTraseiroVistoDir', tipo: 'filete', pts: pneuDeFrente(-1), foraDoContorno: true, motivoForaDoContorno: motivoRodaFrente },
    /* Na planta o pneu não tem direito de sair: fora da carroceria é o defeito. Ele fica embaixo do corpo, em linha
       escondida, para não cruzar o vidro do para-brisa em traço cheio. */
    { vista: 'planta', classe: 'oculta', nome: 'pneuDeCimaDE', tipo: 'filete', fechado: true, pts: pneuDeCima(zD, 1) },
    { vista: 'planta', classe: 'oculta', nome: 'pneuDeCimaDD', tipo: 'filete', fechado: true, pts: pneuDeCima(zD, -1) },
    { vista: 'planta', classe: 'oculta', nome: 'pneuDeCimaTE', tipo: 'filete', fechado: true, pts: pneuDeCima(zT, 1) },
    { vista: 'planta', classe: 'oculta', nome: 'pneuDeCimaTD', tipo: 'filete', fechado: true, pts: pneuDeCima(zT, -1) },

    /* o detalhe de corte das três seções, em escala 5:1, desenhado abaixo da vista de cima, com a chapa tracejada */
    ...DETALHES.flatMap(({ nome, secao, pecas, z0 }) => [
      ...(pecas ?? [secao]).map((pts, i) => ({ vista: 'planta', classe: 'contorno', nome: `corte${nome}${i ? i + 1 : ''}`, tipo: 'poli', pts: pts.map(([u, y]) => noDetalhe(z0, u, y)), foraDoContorno: true, motivoForaDoContorno: 'detalhe de corte em escala 5:1 desenhado abaixo da vista de cima; não é parte da planta' })),
      { vista: 'planta', classe: 'eixo', tipo: 'poli', pts: [noDetalhe(z0, 0, 280), noDetalhe(z0, 0, topoDe(secao) + 2)] },
    ]),

    /* a aba de chapa do arco, coberta pela moldura, no corte B */
    { vista: 'planta', classe: 'oculta', nome: 'abaDoArco', tipo: 'poli', pts: [[0, 0], [ABA_DO_ARCO.altura, 0], [ABA_DO_ARCO.altura, 14], [0, ABA_DO_ARCO.largura]].map(([u, d]) => noDetalhe(DETALHES.find((x) => x.nome === 'Moldura').z0, u, 300 + d)), foraDoContorno: true, motivoForaDoContorno: 'aba de chapa sob a moldura no detalhe de corte B' },
    /* eixos de simetria e de roda */
    { vista: 'frontal', classe: 'eixo', tipo: 'poli', pts: [[0, -60], [0, 295]] },
    { vista: 'frontal', classe: 'eixo', tipo: 'poli', pts: [[0, 735], [0, 2560]] },
    /* o nível do topo do para-brisa sobre a cabine, de onde a faixa de 75 acima da porta é medida */
    { vista: 'lateral', classe: 'eixo', tipo: 'poli', pts: [[600, Y_TOPO_VIDRO], [P.topoVidro[0] - 5, Y_TOPO_VIDRO]] },
    { vista: 'traseira', classe: 'eixo', tipo: 'poli', pts: [[0, 0], [0, 2560]] },
    { vista: 'planta', classe: 'eixo', tipo: 'poli', pts: [[zTras - 60, 0], [zFrente + 60, 0]] },
    /* o chão, onde as cotas de altura começam */
    { vista: 'lateral', classe: 'eixo', tipo: 'poli', pts: [[zTras, 0], [3200, 0]] },
  ],
  landmarks: LANDMARKS,
  anotacoes: [
    ...DETALHES.flatMap(({ titulo, letra, linhas, eixo, z0, alto, secao }) => [
      ...(titulo ? [{ vista: 'planta', em: [z0 - 60, DETALHE.xBase - DETALHE.escala * 510], texto: titulo }] : []),
      ...linhas.map((t, k) => ({ vista: 'planta', em: [z0 - 60, DETALHE.xBase - DETALHE.escala * (490 - 20 * k)], texto: t })),
      ...(eixo ? [{ vista: 'planta', em: [z0 - 60, DETALHE.xBase + DETALHE.escala * 45], texto: `${eixo}, ${alto === 'largura' ? 'da boca' : 'altura'}` }] : []),
      { vista: 'planta', em: noDetalhe(z0, -18 - (letra === 'I' || letra === 'B' ? 6 : 0), (Math.min(...secao.map(([, y]) => y)) + topoDe(secao)) / 2 - 4), texto: letra ?? titulo[0], classe: 'cortet' },
    ]),
    { vista: 'planta', em: noDetalhe(-1622, 66, 422), texto: 'porta' },
    { vista: 'planta', em: noDetalhe(-1622, 66, 330), texto: 'preso' },
    /* as letras dos planos de corte */
    { vista: 'lateral', em: [PLANO_A + 20, 555], texto: 'A', classe: 'cortet' },
    { vista: 'lateral', em: [PLANO_E + 20, 555], texto: 'E', classe: 'cortet' },
    { vista: 'lateral', em: [zT + 640 * Math.cos(ANGULO_PLANO_B) - 20, R + 640 * Math.sin(ANGULO_PLANO_B)], texto: 'B', classe: 'cortet' },
    { vista: 'frontal', em: [PLANO_C - 120, 745], texto: 'C', classe: 'cortet' },
    { vista: 'traseira', em: [PLANO_D + 120, 330], texto: 'D', classe: 'cortet' },
    { vista: 'planta', em: [PLANO_A + 20, -X_SAIA - 90], texto: 'A', classe: 'cortet' },
    { vista: 'planta', em: [PLANO_E + 20, -X_SAIA - 90], texto: 'E', classe: 'cortet' },
    { vista: 'planta', em: [zT + 445 * Math.cos(ANGULO_PLANO_B) + 20, -X_SAIA - 90], texto: 'B', classe: 'cortet' },
    { vista: 'planta', em: [zT + 490 * Math.cos(ANGULO_PLANO_I) - 60, -X_SAIA - 90], texto: 'I', classe: 'cortet' },
    { vista: 'lateral', em: [zT + 430, R + 17], texto: 'I', classe: 'cortet' },
    { vista: 'planta', em: [Z_FRENTE_PLASTICO + 40, PLANO_C + 20], texto: 'C', classe: 'cortet' },
    { vista: 'planta', em: [Z_TRAS_PLASTICO + 40, X_SAIA + 110], texto: 'D', classe: 'cortet' },
    { vista: 'lateral', em: [zDaBocaEm(zT, 560, 1) + 25, 560], texto: 'F' },
    { vista: 'lateral', em: [-2640, 410], texto: 'para-choque' },
    { vista: 'lateral', em: [2260, 410], texto: 'para-choque' },
    { vista: 'frontal', em: [-480, 420], texto: 'entrada de ar recuada 20' },
    { vista: 'lateral', em: [-1650, -700], texto: '1 m; vistas a 1 px = 6,25 mm' },
    /* o detalhe F */
    { vista: 'planta', em: naFaixa(saiaEntreOsArcos[0], 560), texto: 'F: faixa de baixo no lado -x, de arco a arco (2,2 vezes a lateral); cada porta leva a saia de 380 a 463; junto dos arcos, o alargamento no plástico' },
    { vista: 'planta', em: naFaixa(portaCorrer.tras + 100, 405), texto: `porta de correr leva ${BASE_DAS_PORTAS} a ${topoDaSaia}` },
    { vista: 'planta', em: naFaixa(portaCabine.tras + 40, 405), texto: `porta da cabine leva ${BASE_DAS_PORTAS} a ${topoDaSaia}` },
    { vista: 'planta', em: naFaixa(PLANO_A + 12, 405), texto: 'preso' },
    { vista: 'planta', em: naFaixa(portaCorrer.frente + 8, 405), texto: 'preso' },
    { vista: 'planta', em: naFaixa(PLANO_E + 40, 320), texto: `preso: ${SECAO_SAIA[0][1]} a ${BASE_DAS_PORTAS}, sob as portas; frestas de ${FRESTA} mm` },
    { vista: 'planta', em: naFaixa(PLANO_A + 12, 505), texto: 'A', classe: 'cortet' },
    { vista: 'planta', em: naFaixa(PLANO_E + 12, 505), texto: 'E', classe: 'cortet' },
    /* o detalhe G, o lado +x */
    { vista: 'planta', em: naG(saiaEntreOsArcos[0], 560), texto: 'G: a mesma faixa no lado +x, na escala e com a frente à direita como em F; sem porta de correr' },
    { vista: 'planta', em: naG(-700, 405), texto: 'preso' },
    { vista: 'planta', em: naG(portaCabine.tras + 40, 405), texto: `porta da cabine leva ${BASE_DAS_PORTAS} a ${topoDaSaia}` },
    { vista: 'planta', em: naG(-700, 320), texto: `preso: ${SECAO_SAIA[0][1]} a ${BASE_DAS_PORTAS}, sob a porta; fresta de ${FRESTA} mm` },
    { vista: 'planta', em: naG(saiaEntreOsArcos[0], 172), texto: `Nos dois lados fica preso também o trecho de ${mil(saiaEntreOsArcos[1] - frenteDaCabineNaSaia)} mm entre a porta da cabine e a moldura dianteira.` },
    { vista: 'lateral', em: [-2550, 1215], texto: `vinco ${mil(Y_VINCO)}` },
    /* a cota de 410 de cima é entre as bordas do vidro, e não entre o pé e o topo do para-brisa (441 a 55 graus) */
    { vista: 'planta', em: [2120, -560], texto: 'capô' },
    { vista: 'planta', em: [1870, 450], texto: 'bordas do vidro,' },
    { vista: 'planta', em: [1870, 550], texto: `${mil(vidroBaseY)} a ${mil(vidroTopoY)}` },
    { vista: 'lateral', em: [1500, 2200], texto: `para-brisa a ${Math.round((Math.atan2(P.topoVidro[1] - P.baseVidro[1], P.baseVidro[0] - P.topoVidro[0]) * 180) / Math.PI)}° da horizontal` },
  ],
  cotas: [
    /* lateral: entre-eixos e balanços no chão, comprimento abaixo deles; diâmetro do pneu no centro da roda dianteira;
       largura da porta de correr dentro dela */
    { vista: 'lateral', de: [zT, 0], ate: [zD, 0], desloca: [0, 22], extensao: true, texto: mil(M.entreEixos) },
    { vista: 'lateral', de: [zD, 0], ate: [zFrente, 0], desloca: [0, 22], extensao: true, texto: mil(M.balancoDianteiro) },
    { vista: 'lateral', de: [zTras, 0], ate: [zT, 0], desloca: [0, 22], extensao: true, texto: mil(M.balancoTraseiro) },
    { vista: 'lateral', de: [zTras, 0], ate: [zFrente, 0], desloca: [0, 48], extensao: true, texto: `${mil(M.comprimento)} na chapa` },
    { vista: 'lateral', de: [Z_TRAS_PLASTICO, 0], ate: [Z_FRENTE_PLASTICO, 0], desloca: [0, 74], extensao: true, texto: `${mil(COMPRIMENTO_COM_PLASTICO)} com o plástico` },
    { vista: 'lateral', de: [P.boca[0], 0], ate: P.boca, desloca: [(zFrente - P.boca[0]) * ESCALA + 32, 0], extensao: true, texto: mil(P.boca[1]) },
    { vista: 'lateral', de: [P.baseVidro[0], 0], ate: P.baseVidro, desloca: [(zFrente - P.baseVidro[0]) * ESCALA + 57, 0], extensao: true, texto: mil(P.baseVidro[1]) },
    { vista: 'lateral', de: [P.topoVidro[0], 0], ate: P.topoVidro, desloca: [(zFrente - P.topoVidro[0]) * ESCALA + 82, 0], extensao: true, texto: mil(P.topoVidro[1]) },
    /* a ponta da frente cai no ar: a extensão sobe da quina do para-choque com a chapa, em z 2700 */
    { vista: 'lateral', de: P.baseVidro, ate: [zFrente, P.baseVidro[1]], desloca: [0, -56], extensao: true, pe: [null, [zFrente, topoDe(SECAO_PARACHOQUE_DIANTEIRO)]], texto: mil(zFrente - P.baseVidro[0]) },
    { vista: 'lateral', de: [-450, 0], ate: [-450, M.soleira], texto: mil(M.soleira) },
    { vista: 'lateral', de: [495, 0], ate: [495, TOPO_FAIXA], numero: [56, 30], texto: `saia ${mil(TOPO_FAIXA)}, ver F` },
    /* os para-choques de lado: dobram a quina e seguem até a moldura do arco */
    { vista: 'lateral', de: [Z_TRAS_PLASTICO, DEGRAU_DE_CARGA], ate: [zDaBordaEm(zT, DEGRAU_DE_CARGA, -1), DEGRAU_DE_CARGA], desloca: [0, -12], extensao: true, texto: mil(zDaBordaEm(zT, DEGRAU_DE_CARGA, -1) - Z_TRAS_PLASTICO) },
    { vista: 'lateral', de: [zDaBordaEm(zD, topoDe(SECAO_PARACHOQUE_DIANTEIRO), 1), topoDe(SECAO_PARACHOQUE_DIANTEIRO)], ate: [Z_FRENTE_PLASTICO, topoDe(SECAO_PARACHOQUE_DIANTEIRO)], desloca: [0, -12], extensao: true, pe: [null, [Z_FRENTE_PLASTICO, SECAO_PARACHOQUE_DIANTEIRO.filter(([u]) => u === saida(SECAO_PARACHOQUE_DIANTEIRO)).at(-1)[1]]], texto: mil(Z_FRENTE_PLASTICO - zDaBordaEm(zD, topoDe(SECAO_PARACHOQUE_DIANTEIRO), 1)) },
    /* a coluna de lado, na perpendicular ao para-brisa, da ponta do vidro à fresta, e a faixa de teto acima da porta */
    { vista: 'lateral', de: naColunaEm(pontaDoVidroDeLado, 1800), ate: naColunaEm(FRESTA_COLUNA, 1800), numero: [62, -45], texto: `coluna ${mil(colunaDeLado)}` },
    /* do topo da porta ao nível do topo do para-brisa, com as linhas de extensão saindo do canto da porta e do topo do
       para-brisa */
    { vista: 'lateral', de: [700, portaCabine.topo], ate: [700, Y_TOPO_VIDRO], numero: [30, -16], texto: `faixa ${mil(FAIXA_TETO_PORTA)}` },
    { vista: 'lateral', dono: 'portaDaCabine', de: [portaCabine.tras, portaCabine.pe[1] - 110], ate: [zArestaPorta, portaCabine.pe[1] - 110], texto: mil(portaNaCintura) },
    /* a porta da cabine na base, estreitada pela fresta a 160 mm do arco */
    { vista: 'lateral', dono: 'portaDaCabine', de: [portaCabine.tras, BASE_DAS_PORTAS], ate: [portaCabine.frente, BASE_DAS_PORTAS], desloca: [0, -(620 - BASE_DAS_PORTAS) * ESCALA], extensao: true, texto: `${mil(portaCabine.frente - portaCabine.tras)} na base` },
    { vista: 'lateral', dono: 'portaDeCorrer', de: [portaCorrer.tras, 1700], ate: [portaCorrer.frente, 1700], texto: mil(portaCorrer.frente - portaCorrer.tras) },
    /* frontal: altura à esquerda, largura no teto, bitola e pneu no chão */
    { vista: 'frontal', de: [-xMax, 0], ate: [-xMax, M.altura], desloca: [-40, 0], extensao: true, texto: mil(M.altura) },
    /* a largura máxima é medida abaixo do vinco, onde a lateral ainda está em 2000; as linhas de extensão sobem dali */
    { vista: 'frontal', de: [-xMax, Y_LARGURA_MAXIMA], ate: [xMax, Y_LARGURA_MAXIMA], desloca: [0, -(M.altura - Y_LARGURA_MAXIMA) * ESCALA - 45], extensao: true, texto: mil(M.largura) },
    { vista: 'frontal', de: [-M.bitola / 2, 0], ate: [M.bitola / 2, 0], desloca: [0, 36], extensao: true, texto: `bitola ${mil(M.bitola)}` },
    { vista: 'frontal', de: [xPneuDentro, 0], ate: [xPneuFora, 0], desloca: [0, 16], extensao: true, numero: [-38, 3], texto: mil(M.pneuLargura) },
    { vista: 'frontal', de: [xPneuFora, 0], ate: [xPneuFora, M.pneuDiametro], desloca: [(X_ALARGAMENTO - xPneuFora) * ESCALA + 22, 0], extensao: true, texto: `⌀ ${mil(M.pneuDiametro)}` },
    { vista: 'frontal', de: [-X_ALARGAMENTO, 500], ate: [X_ALARGAMENTO, 500], desloca: [0, 500 * ESCALA + 56], extensao: true, texto: `${mil(LARGURA_NOS_ARCOS)} nos arcos` },
    /* traseira: vão das duas portas acima do teto e largura de um vidro dentro dele */
    { vista: 'traseira', de: [xPortaTraseiraTopo, TOPO_PORTA_TRASEIRA], ate: [-xPortaTraseiraTopo, TOPO_PORTA_TRASEIRA], desloca: [0, -31], extensao: true, texto: `vão no alto ${mil(2 * xPortaTraseiraTopo)}` },
    { vista: 'traseira', de: [900, 1000], ate: [-900, 1000], numero: [-75, -12], texto: `vão ${mil(1800)}` },
    { vista: 'traseira', de: [X_ALARGAMENTO, 500], ate: [-X_ALARGAMENTO, 500], desloca: [0, 500 * ESCALA + 20], extensao: true, texto: `${mil(LARGURA_NOS_ARCOS)} nos arcos` },
    { vista: 'traseira', dono: 'portaTraseiraEsq', de: [JANELA_TRASEIRA.dentro, JANELA_TRASEIRA.base], ate: [JANELA_TRASEIRA.fora, JANELA_TRASEIRA.base], desloca: [0, 20], extensao: true, texto: `${mil(JANELA_TRASEIRA.fora - JANELA_TRASEIRA.dentro)} na base` },
    { vista: 'traseira', dono: 'portaTraseiraEsq', de: [JANELA_TRASEIRA.dentro, JANELA_TRASEIRA.topo], ate: [xJanelaTraseiraTopo, JANELA_TRASEIRA.topo], desloca: [0, -10], extensao: true, texto: `${mil(xJanelaTraseiraTopo - JANELA_TRASEIRA.dentro)} no topo` },
    { vista: 'traseira', dono: 'vidroTraseiroDir', de: [-250, JANELA_TRASEIRA.base], ate: [-250, JANELA_TRASEIRA.topo], texto: mil(JANELA_TRASEIRA.topo - JANELA_TRASEIRA.base) },
    { vista: 'traseira', dono: 'vidroTraseiroEsq', de: [250, JANELA_TRASEIRA.base], ate: [250, JANELA_TRASEIRA.topo], texto: mil(JANELA_TRASEIRA.topo - JANELA_TRASEIRA.base) },
    /* o para-brisa nas pontas de baixo e de cima, com o número dentro do vidro */
    { vista: 'frontal', de: [-xPontaBase, vidroBaseY - flechaBase], ate: [xPontaBase, vidroBaseY - flechaBase], numero: [80, -50], texto: `${mil(2 * xPontaBase)} na base` },
    { vista: 'frontal', de: [-xPontaTopo, vidroTopoY - FLECHA_TOPO], ate: [xPontaTopo, vidroTopoY - FLECHA_TOPO], numero: [80, -42], texto: `${mil(2 * xPontaTopo)} no topo` },
    /* os detalhes de corte: a saída e a altura (ou a largura, na moldura) de cada seção */
    ...DETALHES.flatMap(({ secao, z0, afasta = 0 }) => {
      const yb = Math.min(...secao.map(([, y]) => y));
      const yt = topoDe(secao);
      const u = saida(secao);
      return [
        { vista: 'planta', de: noDetalhe(z0, 0, yt), ate: noDetalhe(z0, u, yt), desloca: [0, -12], extensao: true, texto: mil(u) },
        { vista: 'planta', de: noDetalhe(z0, 0, yb), ate: noDetalhe(z0, 0, yt), desloca: [u * DETALHE.escala * ESCALA + 24 + afasta, 0], extensao: true, texto: mil(yt - yb) },
      ];
    }),
    /* a dobra da moldura para dentro do arco, no corte B */
    (() => {
      const z0 = DETALHES.find((d) => d.nome === 'Moldura').z0;
      return { vista: 'planta', de: noDetalhe(z0, -DOBRA_DA_MOLDURA, 300), ate: noDetalhe(z0, 0, 300), desloca: [0, 14], extensao: true, numero: [-34, 6], texto: `dobra ${DOBRA_DA_MOLDURA}` };

    })(),
    /* os dois recuos do para-choque dianteiro no corte C: o lábio de baixo, que recua por baixo até a chapa, e a faixa
       da entrada de ar, 20 mm para dentro da face de cima; as alturas numa coluna só, à direita */
    ...(() => {
      const z0 = DETALHES.find((d) => d.nome === 'ParachoqueDianteiro').z0;
      const k = DETALHE.escala * ESCALA;
      const [uLabio, yLabio] = SECAO_PARACHOQUE_DIANTEIRO.reduce((a, b) => (b[0] > a[0] && b[1] < 400 ? b : a));
      /* a faixa é o trecho mais recuado acima do lábio, e não o primeiro ponto depois dele */
      const acimaDoLabio = SECAO_PARACHOQUE_DIANTEIRO.filter(([, y]) => y > yLabio && y < 600);
      const uFaixa = Math.min(...acimaDoLabio.map(([u]) => u));
      const naFaixaRecuada = acimaDoLabio.filter(([u]) => u === uFaixa);
      const [yFaixaBase, yFaixaTopo] = [naFaixaRecuada[0][1], naFaixaRecuada.at(-1)[1]];
      if (yFaixaTopo - yFaixaBase !== 94 || saida(SECAO_PARACHOQUE_DIANTEIRO) - uFaixa !== 20) throw new Error('a faixa recuada do corte C não é a de 388 a 482, 20 para dentro');
      const uFace = saida(SECAO_PARACHOQUE_DIANTEIRO);
      const yb = SECAO_PARACHOQUE_DIANTEIRO[0][1];
      const coluna = 60;
      return [
        { vista: 'planta', de: noDetalhe(z0, uLabio, yb), ate: noDetalhe(z0, uLabio, yLabio), desloca: [coluna - uLabio * k, 0], extensao: true, texto: mil(yLabio - yb) },
        { vista: 'planta', de: noDetalhe(z0, uFaixa, yFaixaBase), ate: noDetalhe(z0, uFaixa, yFaixaTopo), desloca: [coluna - uFaixa * k, 0], extensao: true, texto: mil(yFaixaTopo - yFaixaBase) },
        { vista: 'planta', de: noDetalhe(z0, uFaixa, (yFaixaBase + yFaixaTopo) / 2), ate: noDetalhe(z0, uFace, (yFaixaBase + yFaixaTopo) / 2), numero: [-22, 4], texto: mil(uFace - uFaixa) },
        { vista: 'planta', de: noDetalhe(z0, 0, yb), ate: noDetalhe(z0, uLabio, yb), desloca: [0, 22], extensao: true, pe: [null, noDetalhe(z0, uLabio, yLabio)], texto: mil(uLabio) },
      ];
    })(),
    /* de cima, a profundidade do vidro entre a borda de baixo e a de cima, a mesma que a lateral dá a 55 graus */
    { vista: 'planta', dono: 'paraBrisaDeCima', de: [zVidroTopo, 300], ate: [zVidroBase, 300], numero: [70, 0], texto: mil(zVidroBase - zVidroTopo) },
    /* o detalhe F: os trechos da saia em z e as duas alturas */
    ...TRECHOS_DA_SAIA.filter((t) => t.ate - t.de > 50).map((t) => ({ vista: 'planta', de: naFaixa(t.de, SECAO_SAIA[0][1]), ate: naFaixa(t.ate, SECAO_SAIA[0][1]), desloca: [0, 20], extensao: true, texto: mil(t.ate - t.de) })),
    ...[naFaixa, naG].flatMap((f) => [
      { vista: 'planta', de: f(saiaEntreOsArcos[1], SECAO_SAIA[0][1]), ate: f(saiaEntreOsArcos[1], BASE_DAS_PORTAS), desloca: [70, 0], extensao: true, texto: mil(BASE_DAS_PORTAS - SECAO_SAIA[0][1]) },
      { vista: 'planta', de: f(saiaEntreOsArcos[1], BASE_DAS_PORTAS), ate: f(saiaEntreOsArcos[1], topoDaSaia), desloca: [70, 0], extensao: true, texto: mil(topoDaSaia - BASE_DAS_PORTAS) },
    ]),
    { vista: 'planta', de: naFaixa(saiaEntreOsArcos[0], SECAO_SAIA[0][1]), ate: naFaixa(saiaEntreOsArcos[1], SECAO_SAIA[0][1]), desloca: [0, 44], extensao: true, texto: `${mil(saiaEntreOsArcos[1] - saiaEntreOsArcos[0])} entre as molduras, de z ${mil(saiaEntreOsArcos[0])} a ${mil(saiaEntreOsArcos[1])}` },
    ...TRECHOS_DA_SAIA_MAIS_X.filter((t) => t.ate - t.de > 50).map((t) => ({ vista: 'planta', de: naG(t.de, SECAO_SAIA[0][1]), ate: naG(t.ate, SECAO_SAIA[0][1]), desloca: [0, 20], extensao: true, texto: mil(t.ate - t.de) })),
    /* planta: largura à esquerda */
    { vista: 'planta', de: [zTras + RAIO_QUINA_CHAPA_TRAS, -xMax], ate: [zTras + RAIO_QUINA_CHAPA_TRAS, xMax], desloca: [-35 - (RAIO_QUINA_CHAPA_TRAS * ESCALA), 0], extensao: true, texto: `${mil(M.largura)} na chapa` },
  ],
  legenda: {
    x: 1000,
    y: 740,
    itens: [
      ['#12233b', 'silhueta (projeção de cada vista)'],
      ['#2f4562', 'linhas de porta e borda do teto plano; molduras dos arcos, na cor da lataria'],
      ['#3d6b86', 'vidros: para-brisa, portas da cabine, portas traseiras'],
      ['#8a94a2', `pneu ${M.pneuLargura}/65 aro 16 (⌀ ${M.pneuDiametro} × ${M.pneuLargura}) e aro de 16 polegadas`],
      ['#b3593d', 'cotas em mm'],
      ['#1f6f5c', 'landmarks, em [z, y] na lateral, [x, y] na frontal e traseira, [z, x] de cima'],
      ['#6a4c93', 'traço-ponto roxo: planos dos cortes A a E e I, com a letra junto'],
      ['#b3593d', 'tracejado laranja: vinco de cintura e a marca do detalhe F na lateral'],
      ['#c0c6cf', 'tracejado cinza: pneu escondido sob o corpo; traço-ponto: eixos e a chapa nos cortes'],
      ['#b3593d', `cortes: A e E na saia (z ${mil(PLANO_A)} presa, z ${mil(PLANO_E)} na porta), B e I no alargamento (radiais no arco traseiro: B na cor da lataria, I no plástico)`],
      ['#b3593d', `C em x ${mil(PLANO_C)} (lado -x, à esquerda na frontal), D em x +${mil(PLANO_D)} (lado +x, à esquerda na traseira)`],
    ],
    notas: [
      `Calibração: balanços ${M.balancoDianteiro} + entre-eixos ${M.entreEixos} + ${M.balancoTraseiro} = ${M.comprimento}; meia bitola ${num(M.bitola / 2)} + meio pneu ${num(M.pneuLargura / 2)} = ${num(xPneuFora)} < meia largura ${num(xMax)}.`,
      `Arcos das rodas com raio ${M.arcoRaio} no centro da roda (${M.arcoRaio - R} mm sobre o pneu); soleira em ${M.soleira}; largura sem retrovisores.`,
      'A lateral mostra o lado direito (-x), com a porta de correr; o lado esquerdo é o espelho dele sem ela.',
      'Medidas rígidas da classe; cabine, portas, vidros, bitola e balanços estimados na proporção (ver autoria).',
      `Plástico por fora da chapa: saia de 299 a 463 saindo ${saida(SECAO_SAIA)} (${mil(LARGURA_NA_SAIA)} na saia), para-choques saindo ${saida(SECAO_PARACHOQUE_DIANTEIRO)} na frente e ${saida(SECAO_PARACHOQUE_TRASEIRO)} atrás (${mil(COMPRIMENTO_COM_PLASTICO)} com o plástico).`,
      `Alargamento dos arcos: funde-se ao painel, sai ${SAIDA_DA_MOLDURA} junto da boca, dobra ${DOBRA_DA_MOLDURA} para dentro dela e desce tangente à chapa em ${LARGURA_MOLDURA} (${mil(LARGURA_NOS_ARCOS)} nos arcos).`,
      `Cor da lataria acima da saia (${TOPO_FAIXA}) e dos para-choques (${DEGRAU_DE_CARGA} atrás, ${topoDe(SECAO_PARACHOQUE_DIANTEIRO)} na frente); abaixo, o mesmo alargamento no plástico, até ${FUNDO_DO_ALARGAMENTO}.`,
      `A fresta da porta da cabine contorna o arco dianteiro a ${FOLGA_ARCO} da boca (raio ${raioPorta}), 10 fora do alargamento; a porta tem ${mil(portaCabine.frente - portaCabine.tras)} na base.`,
      'As seções estão em SECAO_* na especificação; os seis cortes 5:1 (A, E, B, I, C, D) ficam abaixo da vista de cima, com a chapa em traço-ponto.',
      `Detalhes F e G: a faixa de baixo de arco a arco nos lados -x e +x, 2,2 vezes a lateral. De cima, o contorno à frente do para-brisa é o capô.`,
      `Faixa ${FAIXA_TETO_PORTA}: a chapa acima da porta da cabine, do topo da porta ao nível do topo do para-brisa (${mil(Y_TOPO_VIDRO)}).`,
      `Teto na lateral: curva contínua de raio ${RAIO_TOPO_VIDRO} saindo do topo do para-brisa e ${RAIO_TESTA} até o teto, que começa em z ${Math.round(zTetoPlano)}.`,
      `Teto: raio ${RAIO_QUINA_TRASEIRA} na quina traseira (lateral) e ${RAIO_QUINA_TETO} nas quinas com a lateral (frontal e traseira).`,
      `Laterais: verticais em ${mil(M.largura)} até o vinco (${mil(Y_VINCO)}), fechando ${(INCLINACAO_LATERAL).toFixed(1).replace('.', ',')} graus até o teto (${mil(LARGURA_NO_TETO)} no prolongamento, teto plano com ${mil(2 * xTetoPlano)}).`,
      `Vão traseiro: ${mil(1800)} até o vinco e ${mil(2 * xPortaTraseiraTopo)} no topo das portas, sempre ${FOLGA_QUINA_TRASEIRA} mm dentro da lateral; janelas com 740 na base e ${mil(larguraDaJanelaEm(JANELA_TRASEIRA.topo))} no topo.`,
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
  writeFileSync(`${BASE}.relatorio.json`, `${JSON.stringify({ medidas: M, comPlastico: { comprimento: COMPRIMENTO_COM_PLASTICO, larguraNaSaia: LARGURA_NA_SAIA, zFrente: Z_FRENTE_PLASTICO, zTras: Z_TRAS_PLASTICO, molduraArco: { largura: LARGURA_MOLDURA, saida: SAIDA_DA_MOLDURA, larguraNosArcos: LARGURA_NOS_ARCOS, raioDaFrestaDaCabine: raioPorta, portaDaCabineNaBase: portaCabine.frente - portaCabine.tras, folgaPortaDeCorrer: folgaMolduraPortaDeCorrer } }, secoes: { saia: SECAO_SAIA, moldura: SECAO_MOLDURA, alargamentoNoPlastico: SECAO_NO_PLASTICO, parachoqueDianteiro: SECAO_PARACHOQUE_DIANTEIRO, parachoqueTraseiro: SECAO_PARACHOQUE_TRASEIRO }, relatorio, colisoes: exame.colisoes, avisos: exame.avisos }, null, 2)}\n`);
  if (relatorio.alertas.length || exame.colisoes.length) process.exitCode = 1;
}
