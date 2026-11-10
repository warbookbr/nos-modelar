/* empilhadeira/carcaca — a carcaça da empilhadeira de contrapeso de 2,5 t: chassi, laterais, paralamas, piso com o tapete e os
 * degraus, painel, tampa do motor, colunas, poço traseiro e a traseira (capô, grade, tampa e contrapeso), numa peça rígida.
 *
 * Primeira etapa da montagem `../../montagem.json` (fatias 1 e 2 do plano `docs/modelar/planos/2026-11-09-empilhadeira.md`). O
 * combinado está em `../../ALINHAMENTO.md` ("Carcaça" e "Divergências entre as fontes"); a forma é a do rascunho que a pessoa aprovou
 * por imagem em 2026-11-10, e esta receita é a dona dela: os rascunhos `../../referencias/carcaca.esboco.mjs`,
 * `carcaca-traseira.esboco.mjs` e `empilhadeira.esboco.mjs` montam a carcaça chamando `montarCarcacaEmMm` daqui.
 *
 * DE ONDE VEM CADA MEDIDA. Comprimento e altura: o contorno de cada parte na lateral de caráter (`receita/contornos-da-lateral.js`,
 * 4,282 mm/px pelos cubos), com z da lateral para trás; o modelo tem a frente em +z, e todo ponto [z, y] da lateral entra como
 * [-z, y]. Largura: a vista de cima (`carcaca-cima.ia.png`), medida por cor coluna a coluna, na escala do capô da vista de trás (313
 * px para 1.193 mm, 3,80 mm/px); o comprimento da vista de cima foi levado à lateral por z = -188 + (coluna - 360) x 4,058. Perfil de
 * frente: a vista de frente (`carcaca-frente.ia.png`), com a altura pela lateral e a largura pela de cima (3,385 mm/px). A traseira:
 * a vista de trás (`carcaca-tras.ia.png`, 4,03 mm/px pelo topo da tampa a 1.152 mm na linha 272). As vistas de IA valem como
 * caráter da forma; a medida está nesta TABELA.
 *
 * Eixos: x lateral (+x é a esquerda de quem dirige, o lado do furo da tampa de combustível), y para cima com o chão em y 0, z
 * comprimento com a frente em +z: o eixo dianteiro em z 0 e a traseira em z -2.186.
 *
 * A cadeia: a TABELA em mm; `derivar` monta os passos em mm (os módulos de `receita/`, que o rascunho da máquina inteira também usa);
 * `gerarPassos` converte para metro com `m()`, campo de medida a campo de medida, num lugar só, e acrescenta no fim as portas de
 * `portasDaCarcaca`, que não mudam a malha: hoje a passagem do eixo dianteiro entre as paredes dos poços (etapa do eixo dianteiro). */
import { montarCarcaca } from './receita/frente.js';
import { CONTORNOS_DA_LATERAL } from './receita/contornos-da-lateral.js';

export const TABELA = {
  /* As cores, por parte, do rascunho aprovado: laranja da lataria, dois cinzas, o escuro dos fundos e o cinza escuro do tapete. */
  cores: { laranja: '#e2641e', cinzaClaro: '#73797d', cinza: '#565b60', escuro: '#1c1e20', escuroPiso: '#34383c' },
  /* Círculo de 96 lados: arco de roda e arco do contorno lateral saem com pelo menos 64 lados por volta. */
  ladosDoCirculo: 96,
  /* Até onde, em x, vão os cortes que atravessam a carcaça para fora, e em z os que saem por trás. */
  alemDoLado: 720,

  /* AS RODAS, uma medida por roda (ALINHAMENTO.md, "Divergências entre as fontes"); x é a distância ao centro da máquina. A dianteira
     com Ø 705 (ficha, 7.00-12; o cubo da carcaça a 352,5), de 417 a 667 mm (borda de fora pela vista de cima da máquina, banda de 250
     pela vista de frente e de trás). A traseira com Ø 568, o dobro da altura do cubo traseiro da carcaça (284), de 445 a 653 mm, com a
     banda da dianteira na razão da ficha, 250 x 150/180 = 208. As rodas são da etapa seguinte; aqui elas dão os poços. */
  rodas: {
    dianteira: { y: 352.5, z: 0, raio: 352.5, xDentro: 417, banda: 250 },
    traseira: { y: 284, z: -1700, raio: 284, xDentro: 445, banda: 208 },
  },
  /* Os poços cortam a 40 mm de folga do pneu, pelo lado de dentro e em volta. */
  folgaDoPoco: 40,

  /* As meias larguras da vista de cima (entre parênteses, as linhas e colunas dela, em px). */
  larguras: {
    chapas: [266, 327],        // chapas do chassi: cinza nas linhas 211-230 e 367-381, colunas 380-404
    aba: [327, 606],           // aba do paralama: laranja 135-210 e 382-454, colunas 366-400
    lateralFrente: 583,        // o corpo laranja: linhas 147 e 454 nas colunas 504-560 (z 400-660)
    lateralTras: 595,          // linhas 141 e 454 nas colunas 700-770 (z 1190-1500)
    tapete: 400,               // o escuro do piso: linhas 199-200 a 410-412, colunas 504-560
    degrau: 568,               // o cinza dos degraus: linhas 151 e 450, colunas 504-560
    colunas: 516,              // pela vista de trás (cinza das colunas 408 a 664, 4,03 mm/px); a de cima dava 545
  },

  /* CHASSI. As chapas acabam a 100 mm à frente do eixo: na vista de cima não há cinza entre os paralamas dali em diante, e a silhueta
     lateral das chapas à frente disso está dentro do pé da torre, que é de outra etapa. A travessa da frente, vista de cima entre as
     chapas nas colunas 398-404, vai de 9 a 34 mm à frente do eixo, 5 mm além das chapas de cada lado; com 98 mm de comprimento ela
     aparecia de cima como uma barra grossa onde a referência tem uma linha fina. */
  chassi: {
    ateAFrente: { secao: [[-400, 0], [400, 0], [400, 1300], [-400, 1300]], z: [-2000, 100] },
    travessa: [[9, 600], [34, 600], [34, 690], [9, 690]],
    travessaAlemDasChapas: 5,
    /* A silhueta das chapas com dois trechos curvos trocados pelo círculo ajustado ao contorno: o arco em volta do cubo (centro (24,
       369), raio 124, desvio de 6 mm) até 305 mm de altura, de onde o fundo do vão sobe reto (levado até 338 mm, o arco deixava
       triângulo sem área na face da frente das chapas), e a frente do pescoço (centro (-232, 657), raio 221, desvio de 7 mm);
       simplificados eles saíam em facetas e dentes. O teto do vão, de (-87, 438) a (2, 525), fica como medido: o assento do eixo
       dianteiro (etapa dos eixos) sobe até 0,5 mm dos vértices dele, e o círculo da volta do pescoço o atravessava. */
    arcos: [{ de: [94.21, 261.51], ate: [-80.82, 304.86] }, { de: [-36.4, 545.73], ate: [-10.17, 690.25] }],
    /* O vão do cubo chega a 0 a 2 mm do fim da frente das chapas (100 mm à frente do eixo) entre 338 e 426 mm de altura, e ali a
       chapa partia em duas, com a emenda à vista no meio dela. O fundo do vão fica 12 mm atrás do fim da frente, e a chapa é inteira. */
    almaDaFrente: { espessura: 12, y: [300, 440] },
  },

  /* PARALAMAS. A aba é chapa de 37 mm (a lateral dá y 755 a 792), da silhueta lateral cruzada com a planta: o canto da frente de fora,
     redondo na vista de cima (colunas 354 a 366 até a linha 135), tem raio 40 mm, e o de dentro 15; a planta vai de z -140 a 188. De
     frente a ponta de fora é redonda (179 px de meia largura só na linha 356 da vista de frente): a seção leva a ponta em meio círculo
     da espessura dela, de x 300 para fora, de y 700 a 850 e de z -460 a 300. A faixa da frente desce de 776 a 657 mm (linhas 360-384 da
     vista de frente), até 330 mm para encostar nas abas, 13 a 45 mm atrás do eixo, pela lateral. A beira é uma tira de 37 mm ao longo
     do arco de fora da frente das laterais, de z 140 a 345 e de 579 a 598 mm: na vista de cima o laranja vai à meia largura de 598 mm
     até a coluna 489, z 335. */
  paralamas: {
    frenteDaAba: 188, trasDaAba: -140, cantoDeFora: 40, cantoDeDentro: 15,
    chapa: [755, 792],
    secao: [300, 700, 850],
    alturaDaPlanta: [700, 840],
    comprimentoDaSecao: [-460, 300],
    faixa: [[13, 657], [45, 657], [45, 776], [13, 776]],
    meiaFaixa: 330,
    beira: { de: [140, 776], ate: [345, 600], meio: [250, 740], x: [579, 598] },
  },

  /* LATERAIS. A frente (`frenteLateral` da lateral) com os dois arcos trocados pelo círculo ajustado ao contorno: o de fora, de cima
     para trás (centro (62, 397), raio 386, desvio de 1,6 mm), e o da roda até a altura do cubo (centro (33, 352), raio 191, desvio de
     8 mm). De frente a borda de fora é quase vertical (579 a 569 mm) e o canto de baixo é redondo (166 a 159 px nas linhas 468 a 484):
     `perfilDaFrente`, de x 538 para fora, de z -460 a 60. O corpo do meio vai a z -1540, 36 mm dentro do capô (rente a ele a subdivisão
     do capô abria fresta), com a planta de 583 mm em z -400 a 595 em z -1540, de y 150 a 1000 e de z -1550 a -390. O pé do corpo, de
     frente e de trás, é `pe`: em cima a borda recolhe com o capô (588 mm a 902 de altura, 572 a 934 na vista de trás). O arco da roda
     traseira é um círculo (centro (1766, 296), raio 425, desvio de 2 a 4 mm); o pé do arco segue reto para trás a 629 mm. */
  laterais: {
    arcosDaFrente: [{ de: [150, 775], ate: [418, 545] }, { de: [90, 532], ate: [231, 354] }],
    arcosDoCorpo: [{ de: [1338, 277], ate: [1492, 620] }],
    perfilDaFrente: [[538, 150], [538, 226], [548, 260], [555, 277], [562, 295], [569, 312], [579, 741], [579, 800]],
    comprimentoDaFrente: [-460, 60],
    meiaLarguraBruta: 620,
    planta: [400, 1540],
    alturaDaPlanta: [150, 1000],
    comprimentoDoMeio: [-1550, -390],
    pe: [[560, 1000], [572, 934], [588, 902], [600, 870]],
    /* O canto de baixo do pé, de frente: os pontos medidos (600 a 340, 579 a 312, 569 a 305, 562 a 295, 555 a 277, 548 a 260, 538 a
       226, 518 a 185) davam a quina a 340 mm e degraus de 10 a 20 graus abaixo dela, e de lado a faixa sob a quina lia peça escura
       separada. Ele é a curva de segundo grau que sai vertical de 600 mm a 450 de altura, tem o canto medido (600, 340) por ponto de
       controle e chega na direção dele à ponta de baixo (518, 185): fica a até 6 mm dos pontos medidos abaixo da quina e a 16,5 mm
       dentro da quina, e de lado a sombra desce aos poucos, sem vinco. */
    peDeBaixo: { de: [600, 450], quina: [600, 340], ate: [518, 185], trechos: 12 },
    ajusteDoArco: { pe: { z: [1480, 1500], y: [605, 625], para: [1540, 629] }, traseira: { zDe: 1495, yAcima: 625 } },
    /* A borda de cima do corpo, do degrau à diagonal que sobe até as colunas, é quebrada com raio de 25 mm: na lateral de caráter ela
       tem o brilho de uma borda virada de 3 a 5 px (13 a 21 mm), e viva ela lia plana. A caixa pega só essa borda, dos dois lados, de
       z -435 (atrás da frente em volta da roda) a -1230, 8 mm antes da quina da diagonal em z -1238 (y 896), onde o pé começa a
       recolher com o capô; passando dela a concordância deixava lasca. */
    bordaDeCima: { raio: 22, paineis: 24, regiao: { min: [-700, 440, -1230], max: [700, 890, -435] } },
    /* O poço da roda traseira é o círculo do arco, cortado de 360 mm para fora, por dentro do pé do contrapeso (92 px de meia largura na
       vista de trás, 371 mm): entre ele e o pneu a traseira do corpo aparecia de trás como tira laranja, onde a referência é escura. */
    pocoTraseiroDe: 360,
    /* O vão sob o piso entre as chapas: de frente a referência é escura das linhas 392 a 476 (621 a 260 mm); o vão vai de 195 a 472 mm,
       até z -1100, com o fundo escuro de 12 mm. */
    tunel: { meia: 262, y: [195, 472], z: [-1100, -300], fundoAte: -1088 },
    /* O furo da tampa de combustível, só do lado +x: a elipse da lateral (z 1299-1450, y 704-882), 35 mm de fundo, com o fundo escuro. */
    furo: { centro: [1375, 793], semieixos: [75, 89], lados: 32, corte: [560, 720], fundo: [545, 561] },
    /* De trás, entre os pneus traseiros, o pé das laterais aparecia como tira laranja sob o contrapeso; por dentro dos pneus o pé sobe a
       221 mm de z -1600 a -380, e por fora, que é o que a lateral vê, fica a 191. */
    peSobOContrapeso: { y: [150, 221], z: [-1600, -380] },
  },

  /* PISO. O corpo cinza com a silhueta lateral do piso (765 mm), sem o ressalto a 793 mm sob a borda de trás do painel, que de cima
     aparecia como barra cinza onde a referência é escura: ele desce a 766 mm de z 330 a 460. O tapete escuro é uma chapa de 10 mm de z
     340 a 667, 5 mm por dentro do corpo. Os degraus: o piso do degrau a 490 mm de z 431 a 719, e daí uma rampa 12 mm acima da borda
     diagonal da lateral até z 1238, com a planta da vista de cima (528 mm de z -690 a -880, 492 de -905 a -1250). O rebaixo dos
     cilindros de inclinação da torre (Ø 90 em x 355, y 860, de z -150 a 15) sai do piso e do painel com 5 mm de folga em volta. */
  piso: {
    ressalto: { z: [330, 460], y: 766 },
    tapete: [[340, 760], [667, 765], [667, 775], [340, 770]],
    recuoDoTapete: 5,
    degrau: [[431, 300], [431, 490], [719, 500], [719, 300]],
    rampa: [[700, 300], [700, 500], [719, 500], [1238, 908], [1238, 300]],
    plantaDaRampa: [[528, -690], [528, -880], [492, -905], [492, -1250]],
    meiaDaRampaBruta: 530,
    alturaDaRampa: [280, 950],
    rebaixoDosCilindros: { x: [305, 405], y: [810, 910], z: [10, -160] },
  },

  /* PAINEL. O anteparo inclinado pela lateral sem a coluna de direção: a frente reta em z 0-36 de 760 a 915 mm, o topo sob a coluna e
     a descida até o piso em z 404. A planta recolhe para trás como o laranja da frente das laterais na vista de cima girada (496 mm na
     frente, 391 em z -311, 376 em z -404). Os cantos da frente recolhem a 415 mm de z 10 a -130: ali passam os pés da frente do
     protetor, de 455 a 512 mm (ALINHAMENTO.md, pés da frente do protetor). */
  painel: {
    lado: [[0, 760], [0, 915], [181, 915], [404, 763], [404, 760]],
    perfil: [[760, 496], [900, 496], [915, 484]],
    planta: [[496, 0], [496, -60], [488, -110], [482, -150], [467, -190], [440, -210], [407, -230], [395, -271], [391, -311],
      [386, -370], [376, -404]],
    estacoes: [760, 764, 775, 800, 830, 860, 890, 905, 915],
    cantos: { x: [415, 560], z: [10, -130], y: [700, 1000] },
  },

  /* TAMPA DO MOTOR. A base do banco: a lateral `tampaMotor` sem o entalhe de trás, com o canto de cima da frente pelos pontos do contorno
     (714, 968) e (730, 988), o pé 20 mm dentro do piso e o encosto até z 1335, dentro das colunas. A planta: o nariz redondo da frente
     (colunas 562 a 590 da vista de cima, [recuo, meia largura]), 507 mm no fim dele e daí o recolhimento até 475 (linhas 165-428 na
     coluna 620 a 172-422 na 690). De frente o topo tem o ombro redondo. */
  tampaMotor: {
    frente: 667, tras: 1335,
    nariz: [[0, 200], [8, 258], [16, 323], [24, 369], [32, 391], [40, 401], [56, 424], [73, 439], [89, 456], [105, 469], [130, 495], [160, 507]],
    recolhe: [[500, -867], [488, -908], [483, -1030], [475, -1151]],
    lado: [[667, 749], [732, 714], [1044, 715], [1238, 896], [1335, 915], [1335, 1035], [1325, 1056], [1300, 1069], [1272, 1072], [1230, 1052], [1172, 1026], [1111, 1009],
      [789, 1002], [745, 997], [730, 988], [714, 968], [672, 909]],
    perfil: [[714, 507], [960, 507], [1010, 495], [1050, 470], [1072, 440]],
    estacoes: [716, 730, 750, 780, 820, 860, 900, 930, 955, 975, 990, 1000, 1030, 1045, 1060],
    /* sem laço entre 1000 e 1030 nem acima de 1060: no banco quase plano eles viravam degraus e, no alto, a lâmina de trás dobrava */
    vincoDeTras: { nitidez: 1, esvai: [1000, 1045] },
    cantoDeTras: 40,
  },

  /* COLUNAS. O bloco atrás da tampa do motor, com a silhueta lateral `coluna`; abaixo do topo do capô (1125 mm) a borda de trás vai a z
     1525, dentro dele. */
  colunas: { trasDe: 1485, abaixoDe: 1125, tras: 1525 },

  /* POÇO TRASEIRO. O fundo escuro entre as rodas de trás (lateral z 1342-1645, até o pé do arco, y 428 a 625, 420 mm de meia largura) e
     o forro: uma casca escura de 15 mm por dentro do arco das laterais, de 360 a 590 mm, entre z 1300 e 1545 e de 191 a 640 mm, com a
     seção do pé das laterais. */
  pocoTraseiro: {
    fundo: [[1342, 428], [1342, 625], [1645, 625], [1645, 428]],
    meiaDoFundo: 420,
    forro: 15, forroAte: 590,
    caixa: { meia: 600, y: [191, 640], z: [-1545, -1300] },
    secaoDoForro: [-1550, -1290],
  },

  /* A TRASEIRA, pela vista de trás: (linha em px, meia largura em px) de baixo para cima, com o centro na coluna 536. */
  traseira: {
    vista: { mmPorPx: 4.03, topo: 1152, linhaDoTopo: 272 },
    fim: 2178,
    alemDaTraseira: -2300,
    /* a curva da traseira na vista de cima: (recuo a partir da ponta, fração da meia largura) */
    arredondamento: [[233, 1], [221, 0.98], [205, 0.969], [189, 0.945], [173, 0.916], [157, 0.885], [141, 0.84], [125, 0.785], [109, 0.728],
      [93, 0.669], [77, 0.609], [61, 0.538], [45, 0.462], [29, 0.366], [13, 0.256], [0, 0.129]],
    /* O capô: o canto de baixo quase vivo, o degrau do flanco entre as linhas 330 e 326 e o ombro chanfrado, com o topo plano a 117 px.
       Os ombros a 1.112 mm (linha 282); o extremo de trás da silhueta, no bico, a z 2172. O degrau que a lateral mostra acima do bico é a
       soleira do vão da grade: a seção do meio (z além de 1970, y de 800 para cima) é a silhueta lateral mais o recuo da planta na
       largura do vão mais a borda (5 px), até 20 mm além do bico. A borda rebaixada em volta do vão tem 16 mm de fundo, do capô recuado
       atrás de z 1900; o vão vai até z 1760, e acima da linha 345 a borda sobe com ele. */
    capo: {
      meiaPx: 148, frentePlanta: 1400, topo: 1112, pontaDoBico: 2172, ombroAcimaDe: 1100,
      perfil: [[401, 143], [398, 146], [394, 148], [370, 148], [350, 147], [334, 146], [330, 145], [326, 142], [322, 140], [314, 139],
        [306, 138], [298, 136], [290, 131], [286, 127], [283, 121], [281.9, 117]],
      estacoes: [632.5, 650, 666, 720, 790, 850, 905, 918, 934, 950, 1010, 1047, 1079, 1100, 1112],
      vaoAcimaDaGrade: [[281, 101.5], [268, 101.5]],
      secaoDoMeio: { zDe: 1970, yDe: 800, alemDoBico: 20 },
      bordaDoVaoPx: 5, fundoDaBorda: 16, recuoDaBordaAte: 1900, bordaDeBaixoAbaixoDe: 345, fundoDoVao: -1760,
      /* A quina de cima do bico, sob o vão. De lado a silhueta descia em dois degraus: o bico a z 2163 até 770 mm, a borda rebaixada a
         2147 até 791 e, acima da soleira, o flanco a 2078 a 2096, porque a planta já recuou 32 mm na ponta da soleira (234 mm do
         centro). Na lateral de caráter o bico entra no flanco por uma curva só, de 77 mm de fundo em 43 mm de altura. A quina sai por
         subtrair, a 400 mm do centro para cada lado, do que fica atrás da curva em S (derivada nula nas duas pontas) de z 2172 a 735
         mm de altura a z 2081 a 805, e de z 2081 até 830: o bico e o flanco mantêm a medida, e só a quina e a borda de baixo do vão
         saem. */
      quinaDaSoleira: { y: [735, 805], z: [2172, 2081], ate: 830, meia: 400, trechos: 16 },
      /* a borda de baixo com raio pequeno (viva demais com o vinco inteiro, redonda demais sem ele) e o ombro com quina */
      nitidezDaBase: 0.5, nitidezDoOmbro: 0.6,
    },
    /* A grade: a moldura cinza em U apoiada na rampa do vão (de z 2052 a y 990 até z 2094 a y 795, na lateral), com a espessura real, de
       70 mm à frente da rampa a 14 mm atrás dela, e o fundo escuro de 320 a 70 mm à frente; laços com menos de 60 mm de lado são curtos.
       Os furos começam sob a aba da tampa (linha 313) e têm o canto de baixo de fora redondo, como o vão. */
    grade: {
      vao: [[361.5, 58], [361, 70], [360, 79], [358.5, 85.5], [356.5, 89.5], [354, 92], [350, 94], [342, 96], [334, 98], [326, 99], [318, 101], [306, 101]],
      soleira: [363, 58],
      rampa: [2052, 990, 2094, 795],
      estacoes: [796, 806, 820, 850, 900, 950, 989],
      espessuraMinima: 60,
      moldura: [-70, 14], fundo: [-320, -70],
      furos: [
        [[-71.5, 313], [71.5, 313], [65.5, 336], [-65.5, 336]],
        [[-64.5, 339.5], [64.5, 339.5], [60, 358], [-60, 358]],
        [[75, 313], [98, 313], [96.5, 334], [94, 346], [91, 352], [87, 355.5], [82, 357.5], [66, 357.5]],
        [[-75, 313], [-98, 313], [-96.5, 334], [-94, 346], [-91, 352], [-87, 355.5], [-82, 357.5], [-66, 357.5]],
      ],
      furosDe: -1700,
    },
    /* A tampa: o painel central com a aba de trás, de 101,5 px de meia largura, com a borda de trás em z 2142 recuando 75 mm ao
       quadrado da fração da largura (e mais 45 no canto), a frente em z 1490 e o topo a 1.150 mm; a aba tem a espessura da lateral. */
    tampa: {
      meiaPx: 101.5, ponta: 2142, recuo: 75, recuoDoCanto: 45, frente: 1490,
      fracoes: [0, 0.25, 0.5, 0.7, 0.85, 0.95, 1],
      topoAcimaDe: 1140, topo: 1150, ombro: [1100, 1125],
      perfil: [[318, 92], [316.5, 98], [313, 101.5], [284, 101.5], [278, 100], [275, 96], [273, 90], [272, 84]],
      estacoes: [985, 1000, 1050, 1090, 1107, 1117, 1135, 1150],
    },
    /* O contrapeso: o arco côncavo da roda e a faixa de cima reta, de 143,5 px, da linha 416 à 400 (o alargamento do pé na referência é a
       sombra do chão). Acaba reto a 645 mm, 12 mm dentro do capô, e o pé a 221 mm; a cunha que sobe atrás fica de fora. Os rebaixos em
       px da vista de trás ([x0, x1, linha de baixo, linha de cima, raio]), com o fundo em mm: o rasgo do pino de reboque e o nicho
       escuros, os dois rebaixos laterais e a meia-lua da base, que recua 130 mm ali. O pino e o trinco saem dos rebaixos. */
    contrapeso: {
      meiaPx: 143.5, frentePlanta: 1700, topo: 645, pe: 221,
      ajusteDoLado: [2100, 600, 2150, 620, 245],
      perfil: [[505.5, 92], [503.5, 98], [499, 100.5], [486, 101], [478, 103], [470, 105], [462, 107.5], [454, 110.5],
        [446, 114], [438, 119], [430, 125.5], [424, 131], [418.5, 137], [416.5, 143.5], [400, 143.5]],
      estacoes: [221.5, 232, 250, 285, 329, 393, 424, 442, 507, 540, 558, 571, 600, 626, 645],
      lacoDaFaixa: 'e11',
      rebaixos: {
        rasgo: { caixa: [-46, 46, 422, 403, 5], x: 0, fundo: 90 },
        nicho: { caixa: [-27, 27, 479, 453, 5], x: 0, fundo: 95 },
        rebaixoEsq: { caixa: [105, 118, 415, 404, 2], x: 111.5, fundo: 45 },
        rebaixoDir: { caixa: [-118, -105, 415, 404, 2], x: -111.5, fundo: 45 },
        meiaLua: { meiaLua: [36, 506, 9], base: [[27, 512], [45, 512]], x: 36, fundo: 200 },
      },
      espessuraDoFundo: 12,
      pino: { meia: 14, z: [2152, 2124], linhas: [479, 453] },
      trinco: { meiaPx: 30, z: [2186, 2150], linhas: [440, 425] },
    },
  },

  /* Os contornos da lateral de caráter, por parte, em mm (copiados do mapa de partes; ver o módulo). */
  contornos: CONTORNOS_DA_LATERAL,
};

const m = (mm) => mm / 1000;

/* Os campos de medida de cada operação que a carcaça usa: neles todo número é milímetro. Os outros campos (origem, eixo, sólidos,
   seleção, cor, ângulo do liso, os nomes dos vértices da gaiola) passam como estão. */
const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'], subdivisao: ['vertices', 'espessura'], arredondarCostura: ['raio', 'regiao'] };
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, w]) => [k, emMetro(w)])) : v);

const derivadas = new WeakMap();
/** Os passos da carcaça em mm e os pontos nomeados das gaiolas (o TOPO), calculados da tabela; o mesmo cálculo que o rascunho usa. */
export function derivar(T = TABELA) {
  if (!derivadas.has(T)) {
    const estado = { passos: [], topo: {}, origem: 0 };
    const medidas = montarCarcaca(estado, T, T.contornos);
    derivadas.set(T, { ...estado, medidas });
  }
  return derivadas.get(T);
}

/** O rascunho chama a carcaça por aqui, sobre o estado da máquina inteira, em mm, como o esboço 2.0 pede. */
export function montarCarcacaEmMm(estado, T = TABELA) {
  return montarCarcaca(estado, T, T.contornos);
}

/** As portas da carcaça, em mm, publicadas depois de todos os passos de forma (não mudam a malha nem os ids).
 *
 *  passagemDoEixoDianteiro — cilindro interno no eixo dos cubos dianteiros (y e z de `rodas.dianteira`), com o raio do poço (o pneu
 *  mais a folga), da parede de dentro do poço direito (x = -(xDentro - folga), a face que o corte do poço deixa na lateral) até a do
 *  esquerdo: `fim` é a distância entre as duas paredes. É por ela que o eixo dianteiro entra na montagem: o vínculo leva a distância à
 *  receita do eixo e a posição põe o tubo dele no mesmo eixo, com o giro pela `referencia` para cima. */
export function portasDaCarcaca(T = TABELA) {
  const { POCO_D, cortesDosPocos } = derivar(T).medidas;
  return [
    ['publicarPorta', {
      id: 'passagemDoEixoDianteiro', de: { ...cortesDosPocos[1].origem, tampa: 'topo' },
      interface: { forma: 'cilindro', papel: 'interna', eixo: [1, 0, 0], centro: [-POCO_D.de, POCO_D.y, POCO_D.z], raio: POCO_D.r, inicio: 0, fim: 2 * POCO_D.de, referencia: [0, 1, 0] },
    }],
  ];
}
const MEDIDAS_DA_PORTA = ['centro', 'raio', 'inicio', 'fim'];
const portaEmMetro = ([op, { interface: I, ...resto }]) => [op, { ...resto, interface: Object.fromEntries(Object.entries(I).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }];

/** Os PASSOS, em metro: os de forma e, no fim, as portas. */
export function gerarPassos(T = TABELA) {
  const forma = derivar(T).passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  return [...forma, ...portasDaCarcaca(T).map(portaEmMetro)];
}

/** Os pontos nomeados das gaiolas, em metro. */
export function gerarTopo(T = TABELA) {
  return Object.fromEntries(Object.entries(derivar(T).topo).map(([nome, p]) => [nome, p.map(m)]));
}

/* Os pares que se tocam por desenho. Os volumes da carcaça se sobrepõem por construção (a silhueta lateral de cada parte extrudada e
   cruzada com a planta), e a malha rígida é uma peça só. */
export const CONTATOS = [
  { par: ['capo', 'colunas'], motivo: 'a borda de trás das colunas entra no capô, para não abrir fresta' },
  { par: ['capo', 'contrapeso'], motivo: 'o contrapeso acaba 12 mm dentro do capô, divisa fechada' },
  { par: ['capo', 'fundoGrade'], motivo: 'o fundo escuro da grade fica no vão do capô' },
  { par: ['capo', 'laterais'], motivo: 'o corpo das laterais vai 36 mm dentro do capô' },
  { par: ['capo', 'pocoTraseiro'], motivo: 'o fundo do poço traseiro sobe sob o capô' },
  { par: ['capo', 'tampa'], motivo: 'a aba da tampa desce dentro do capô' },
  { par: ['chassi', 'laterais'], motivo: 'as chapas do chassi encostam no corpo das laterais por dentro' },
  { par: ['colunas', 'laterais'], motivo: 'as colunas assentam no corpo das laterais' },
  { par: ['colunas', 'tampaMotor'], motivo: 'o encosto da tampa do motor vai até dentro das colunas' },
  { par: ['contrapeso', 'fundoNicho'], motivo: 'o fundo escuro do nicho fecha o rebaixo do contrapeso' },
  { par: ['contrapeso', 'fundoRasgo'], motivo: 'o fundo escuro do rasgo fecha o rebaixo do pino de reboque' },
  { par: ['contrapeso', 'pino'], motivo: 'o pino de reboque atravessa o nicho do contrapeso de lado a lado' },
  { par: ['contrapeso', 'trinco'], motivo: 'o trinco sai do rebaixo do contrapeso' },
  { par: ['degraus', 'laterais'], motivo: 'os degraus e a rampa assentam no corpo das laterais' },
  { par: ['degraus', 'piso'], motivo: 'os degraus encostam no piso pelo lado, 1 mm dentro' },
  { par: ['degraus', 'tampaMotor'], motivo: 'a rampa do degrau passa sob a tampa do motor' },
  { par: ['fundoGrade', 'grade'], motivo: 'o fundo escuro é a mesma rampa da moldura, recuada' },
  { par: ['furo', 'laterais'], motivo: 'o fundo do furo da tampa de combustível fica no furo' },
  { par: ['laterais', 'painel'], motivo: 'o painel assenta entre as laterais' },
  { par: ['laterais', 'paralamas'], motivo: 'a aba e a beira do paralama nascem do corpo das laterais' },
  { par: ['laterais', 'piso'], motivo: 'o piso fica entre as laterais' },
  { par: ['laterais', 'pocoTraseiro'], motivo: 'o forro do poço traseiro reveste o arco das laterais' },
  { par: ['laterais', 'tampaMotor'], motivo: 'a tampa do motor assenta no corpo das laterais' },
  { par: ['laterais', 'tunel'], motivo: 'o fundo escuro do túnel fecha o vão sob o piso entre as laterais' },
  { par: ['painel', 'paralamas'], motivo: 'o pé do painel desce sobre a aba e a faixa' },
  { par: ['painel', 'piso'], motivo: 'o painel assenta no piso' },
  { par: ['painel', 'tapete'], motivo: 'o tapete passa sob o painel' },
  { par: ['piso', 'tampaMotor'], motivo: 'o pé da tampa do motor desce 20 mm no piso' },
  { par: ['piso', 'tapete'], motivo: 'o tapete é a chapa de cima do piso' },
];

const receita = {
  meta: { nome: 'empilhadeira/carcaca', desc: 'carcaça da empilhadeira de contrapeso de 2,5 t: chassi, laterais, paralamas, piso, painel, tampa do motor, colunas, capô, grade, tampa e contrapeso' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'chão sob o centro do eixo dianteiro; y para cima, a frente em +z e a traseira em z -2,186', ...gerarTopo(this.PARAMS) }; },
  PLANO: {
    objeto: 'carcaça de empilhadeira de contrapeso a GLP, classe 2,5 t: o corpo rígido com chassi, contrapeso, capô, laterais, piso e paralamas, onde eixos, torre e protetor se prendem',
    referencias: ['../../referencias/carcaca-lado.ia.png', '../../referencias/carcaca-cima.ia.png', '../../referencias/carcaca-frente.ia.png', '../../referencias/carcaca-tras.ia.png'],
    escala: { medida: 'entre-eixos, do centro do cubo dianteiro ao do traseiro (ficha da classe 2,5 t)', milimetros: 1700 },
    partes: [
      { nome: 'chassi', forma: 'duas chapas cinza do chassi atrás dos cubos dianteiros, de 266 a 327 mm do centro, até 100 mm à frente do eixo, e a travessa fina entre elas que recebe os pinos da torre', tecnica: 'silhueta lateral extrudada em x e cruzada com o limite da frente, unida à travessa extrudada' },
      { nome: 'laterais', forma: 'o corpo laranja dos dois lados, com o arco da roda dianteira, o arco da traseira em círculo, a borda de cima em diagonal, o pé de canto redondo e o vão escuro sob o piso', tecnica: 'silhueta lateral com arcos ajustados, extrudada e cruzada com a planta e a seção de frente; poços e vãos por subtrair' },
      { nome: 'furo', forma: 'o fundo escuro do furo elíptico da tampa de combustível, só do lado esquerdo de quem dirige (+x), 35 mm para dentro da face da lateral', tecnica: 'elipse extrudada em x, chapa de 16 mm' },
      { nome: 'tunel', forma: 'o fundo escuro do vão sob o piso, entre as chapas do chassi (z -300 a -1.100, y 195 a 472), que de frente aparece entre os montantes do pé da torre', tecnica: 'retângulo extrudado em z, chapa de 12 mm no fundo do vão' },
      { nome: 'paralamas', forma: 'as abas laranja de 37 mm sobre as rodas dianteiras, de 327 a 606 mm, com o canto da frente arredondado em planta e a ponta redonda de frente, a faixa da frente e a beira sobre o arco', tecnica: 'silhueta lateral cruzada com a planta e a seção de frente, unida à faixa e às beiras extrudadas' },
      { nome: 'piso', forma: 'o piso cinza do operador a 765 mm, entre os tapetes de 400 mm de meia largura, com a rampa até o painel e o rebaixo dos cilindros de inclinação', tecnica: 'silhueta lateral extrudada em x, rebaixos por subtrair' },
      { nome: 'tapete', forma: 'o tapete escuro do piso, chapa de 10 mm de z -340 a -667, 5 mm por dentro do piso de cada lado', tecnica: 'quadrilátero lateral extrudado em x' },
      { nome: 'degraus', forma: 'os dois degraus cinza antiderrapantes dos lados, a 490 mm, e a rampa que sobe da borda diagonal da lateral até as colunas, com a planta da vista de cima', tecnica: 'silhueta lateral extrudada em x, a rampa cruzada com a planta' },
      { nome: 'painel', forma: 'o anteparo escuro inclinado à frente do posto, de 760 a 915 mm, com a planta que recolhe para trás, os cantos da frente recolhidos a 415 mm e o rebaixo dos cilindros', tecnica: 'corpo de laços pelas três vistas, subdividido, com cortes por subtrair' },
      { nome: 'tampaMotor', forma: 'a tampa cinza arredondada sobre o motor, base do banco, com o nariz redondo em planta, o ombro redondo de frente e o encosto até as colunas', tecnica: 'corpo de laços pelas três vistas, subdividido, com vinco na base e nas quinas de trás' },
      { nome: 'colunas', forma: 'os montantes cinza atrás da tampa do motor, de 516 mm de meia largura, onde se apoiam os pés de trás do protetor', tecnica: 'silhueta lateral extrudada em x' },
      { nome: 'pocoTraseiro', forma: 'o fundo escuro do poço traseiro entre as rodas de trás e o forro escuro de 15 mm por dentro do arco das laterais, de 360 a 590 mm do centro', tecnica: 'retângulo lateral extrudado unido ao anel do arco cruzado com a seção do corpo' },
      { nome: 'capo', forma: 'a caixa laranja de trás, de 1.193 mm, com o canto traseiro arredondado em planta, o ombro chanfrado, o vão da grade e a borda rebaixada de 16 mm em volta dele', tecnica: 'corpo de laços pelas três vistas, subdividido, com o vão e a borda por subtrair' },
      { nome: 'grade', forma: 'a moldura cinza em U da grade do radiador no vão do capô, logo abaixo da tampa, com as aletas entre os quatro furos, acompanhando a curva da planta', tecnica: 'corpo de laços pela rampa do vão, subdividido, com os furos por subtrair' },
      { nome: 'fundoGrade', forma: 'o fundo escuro atrás da moldura da grade, a mesma rampa recuada 70 a 320 mm, visível pelos furos', tecnica: 'corpo de laços pela rampa do vão, subdividido' },
      { nome: 'tampa', forma: 'a tampa cinza do alto do capô, a 1.150 mm, com a aba de trás que acompanha a curva da planta e passa sobre a grade', tecnica: 'corpo de laços pelas três vistas, subdividido, com a face de trás no recuo inteiro da planta' },
      { nome: 'contrapeso', forma: 'o bloco cinza de baixo, atrás, de 221 a 645 mm, com os lados côncavos, a faixa de cima reta, o rasgo do pino de reboque, os rebaixos e o poço das rodas traseiras', tecnica: 'corpo de laços pelas três vistas, subdividido, com vinco na faixa; rebaixos e poços por subtrair' },
      { nome: 'fundoRasgo', forma: 'o fundo escuro do rasgo do pino de reboque, 90 mm para dentro da face de trás do contrapeso', tecnica: 'contorno de cantos redondos extrudado em z, chapa de 12 mm' },
      { nome: 'fundoNicho', forma: 'o fundo escuro do nicho do pino, abaixo do rasgo, 95 mm para dentro da face de trás do contrapeso', tecnica: 'contorno de cantos redondos extrudado em z, chapa de 12 mm' },
      { nome: 'pino', forma: 'o pino cinza de reboque, de 28 mm de lado, em pé no nicho do contrapeso', tecnica: 'quadrado extrudado em y' },
      { nome: 'trinco', forma: 'o trinco cinza do contrapeso, de 242 mm de largura, que sai do rebaixo de cima', tecnica: 'retângulo extrudado em y' },
    ],
    criteriosDeReprovacao: [
      'proporção que não lê como carcaça de empilhadeira de 2,5 t: capô estreito, contrapeso raso ou piso alto demais',
      'arco de roda que não deixa o pneu com folga em volta, ou o poço que não chega ao lado de dentro do pneu',
      'parte que sai por fora da caixa do capô ou da aba do paralama na vista de frente ou de trás',
      'fresta aberta entre as partes da carcaça, que é uma peça rígida (capô e laterais, colunas e capô, contrapeso e capô)',
      'o canto de trás do capô reto em planta, ou as faces da lataria com amassado ou ondulação na luz rasante',
      'cor de parte trocada: o laranja da lataria no piso, no chassi ou no contrapeso, ou o fundo escuro aparecendo laranja',
      'o furo da tampa de combustível do lado direito de quem dirige, ou dos dois lados',
    ],
    lataria: { partes: ['capo', 'contrapeso', 'painel', 'tampa', 'tampaMotor'] },
  },
  contatos: CONTATOS,
  /* Os pontos que a TABELA fixa nos três eixos, em mm: os extremos das partes de chapa reta e das partes que dão a largura e o fim da
     carcaça. As partes de laço subdividido e as de silhueta lateral têm o extremo no contorno, e ficam com as vistas. */
  get PONTOS() {
    const T = this.PARAMS; const W = T.larguras; const PI = T.piso; const R = T.traseira; const MM = R.vista.mmPorPx;
    const H = (ypx) => Math.round((R.vista.topo - (ypx - R.vista.linhaDoTopo) * MM) * 10) / 10;
    const FU = T.laterais.furo; const TU = T.laterais.tunel; const PT = T.pocoTraseiro; const CP = R.contrapeso;
    const meiaTapete = W.tapete - PI.recuoDoTapete;
    return [
      { nome: 'ponta de fora da frente da aba do paralama', parte: 'paralamas', medida: 'maximo', em: [W.aba[1], T.paralamas.chapa[1], T.paralamas.frenteDaAba], toleranciaMm: 0.5 },
      { nome: 'canto de trás do tapete', parte: 'tapete', medida: 'minimo', em: [-meiaTapete, PI.tapete[0][1], -PI.tapete[1][0]], toleranciaMm: 0.5 },
      { nome: 'canto da frente do tapete', parte: 'tapete', medida: 'maximo', em: [meiaTapete, PI.tapete[2][1], -PI.tapete[0][0]], toleranciaMm: 0.5 },
      { nome: 'pé de trás da tampa do motor', parte: 'tampaMotor', medida: 'minimo', em: [-T.tampaMotor.perfil[0][1], T.tampaMotor.estacoes[0], -T.tampaMotor.tras], toleranciaMm: 0.5 },
      { nome: 'fundo do furo da tampa de combustível, do lado +x', parte: 'furo', medida: 'maximo', em: [FU.fundo[1], FU.centro[1] + FU.semieixos[1], -FU.centro[0] + FU.semieixos[0]], toleranciaMm: 0.5 },
      { nome: 'fundo do túnel sob o piso', parte: 'tunel', medida: 'minimo', em: [-TU.meia, TU.y[0], TU.z[0]], toleranciaMm: 0.5 },
      { nome: 'forro e fundo do poço traseiro', parte: 'pocoTraseiro', medida: 'minimo', em: [-PT.forroAte, PT.caixa.y[0], -PT.fundo[2][0]], toleranciaMm: 0.5 },
      { nome: 'pino de reboque', parte: 'pino', medida: 'minimo', em: [-CP.pino.meia, H(CP.pino.linhas[0]), -CP.pino.z[0]], toleranciaMm: 0.5 },
      { nome: 'fim de trás da carcaça, no trinco', parte: 'trinco', medida: 'minimo', em: [-CP.trinco.meiaPx * MM, H(CP.trinco.linhas[0]), -CP.trinco.z[0]], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
