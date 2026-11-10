/* torre-garfos.esboco.mjs — o rascunho da torre e dos garfos da empilhadeira (fatia 4): o pé da torre no eixo dianteiro, os dois
 * canais externos com as travessas, os dois canais internos com a travessa de cima, o cilindro de elevação, os dois cilindros de
 * inclinação, as correntes, a placa porta-garfos, a grade de carga e os dois garfos. Rodado sozinho, monta a carcaça inteira de
 * `carcaca.esboco.mjs` mais estas partes (com EIXOS=1, também os eixos e as rodas de `eixos-rodas.esboco.mjs`, para ver o pé no eixo).
 *
 * Eixos do modelo: x lateral (+x é a esquerda de quem dirige), y altura com o chão em 0, z comprimento com a frente em +z e o eixo
 * dianteiro em z 0, y 352,5.
 *
 * POSE. Torre de pé (inclinação zero) e garfos embaixo, com a face de baixo da lâmina a 50 mm do chão.
 * JUNTAS (não animadas aqui). Inclinação: a torre inteira, com o pé, os canais, as correntes, o carro e os garfos, gira em torno do
 * eixo x que passa pelo centro do eixo dianteiro (z 0, y 352,5), onde o pé abraça o tubo do eixo; os cilindros de inclinação acompanham
 * pela orelha. Curso sugerido: 6 graus para a frente e 12 para trás (a ficha usual da classe 2,5 t; nenhuma vista mostra a torre
 * inclinada), 53 e 106 mm de curso da haste, a 510 mm do pino. Elevação: ao longo de y da torre; o canal interno sobe pela haste do
 * cilindro de elevação até 1.475 mm e o carro com os garfos sobe o dobro pelas correntes (2:1), 2.950 mm, para os garfos a 3.000 mm
 * (torre duplex de 3 m do ALINHAMENTO).
 *
 * DE ONDE VEM CADA MEDIDA (as escalas de cada vista estão na conta de cada número).
 *   Lateral: `lateral.contornos.json` (4,437 mm/px), levada ao modelo pelo cubo dianteiro: o círculo ajustado ao pneu dianteiro dá o
 *   centro em z 196, y 171 e o raio 359; o traseiro em z 1958. A lateral é 3,6% maior que a ficha (entre-eixos 1.762 contra 1.700) e
 *   entra com k = 1700/1762: z do modelo = (196 - z) k, y = (y + 188) k. Nela a torre vai de y 140 a 2.085 com a face da frente em
 *   z 364 a 379 e a de trás, acima da roda, em z 71 a 84; o carro com a grade de carga vai até z 516-521 e sobe a 1.236-1.248; a
 *   lâmina de baixo vai de y 136 a 197, ponta em z 1.465, e afina na ponta; o cilindro de inclinação aparece de z -34 a 73 em y 775
 *   a 907.
 *   Vista de frente (`frente.ia.png`): na escala da carcaça (3,385 mm/px na largura, pela aba do paralama, centro na coluna 545) e na
 *   altura própria (topo da torre na linha 38 e chão na 533: 4,25 mm/px). Canal externo das colunas 463 a 476 e 613 a 626, interno
 *   das 477 a 491 e 598 a 611: a torre com 164 px (555 mm na escala da carcaça, 697 mm na escala da altura). Correntes nas colunas
 *   497-503 e 585-593 (149 mm do centro). Placa porta-garfos de 420 a 660 e grade de 415 a 662 (247 px, 836 mm), topo da grade na
 *   linha 247 (1.215 mm); barras da placa nas linhas 388-415 e 480-497. Garfos nas colunas 437-470 e 598-632 (25 px de largura, 85
 *   mm; centros a 167 px, 565 mm).
 *   Vista de cima (`cima.ia.png`, frente à esquerda; largura pelos pneus da ficha: 350 px para 1.150 mm, 3,286 mm/px, centro na
 *   linha 294; comprimento pelos cubos, 4,18 mm/px): a travessa de cima da torre, em D, das linhas 171 a 386 (706 mm) e das colunas
 *   295 a 366 (297 mm de fundo, igual à lateral); a grade das linhas 152 a 432 (920 mm); garfos nas linhas 207-230 e 367-390 (76 mm
 *   de largura, 526 mm entre centros); hastes dos cilindros de inclinação nas linhas 194 e 392 (325 mm do centro), da coluna 364 à
 *   405. Dois cilindros de elevação pretos lado a lado no centro (colunas 316-327 e 329-340); a vista de frente mostra um só no
 *   centro (colunas 535-550) e vale ela: um cilindro central.
 *   Carcaça isolada de lado (`carcaca-lado.ia.png`, 4,282 mm/px, z = (394 - coluna) x 4,282, y = (538,4 - linha) x 4,282): o pé da
 *   torre, a parte `torre` fora do modelo, tem o bloco da frente de z 218 a 370 e de y 204 a 760, a cabeça em C de y 760 a 1.010 e
 *   o pé de trás descendo a z 145 de y 204 a 511; o cilindro de inclinação aparece de z -36 a 75 em y 812 a 912 e entra no painel.
 *   Carcaça isolada de frente (`carcaca-frente.ia.png`, 3,385 mm/px): os montantes do pé nas colunas 462-497 e 593-630 (166 a 284
 *   mm do centro) e os pinos dos cilindros de inclinação nas colunas 445 e 645 (338 mm), na linha 332 (879 mm).
 *   TABELA: torre abaixada 2.100; largura externa da torre 820; placa 1.000; garfos 1.070 x 100 x 40; garfos a 500 entre centros.
 *
 * O QUE FOI ADOTADO.
 *   Altura da torre: 2.100 (TABELA; a lateral dá 2.085). A face da frente dos canais em z 372 (lateral 364-379, carcaca-lado 370).
 *   Largura externa da torre: 620. A TABELA dá 820 e a vista de cima 706, mas a aba do paralama da carcaça começa em x 327 (y 755 a
 *   792, até z 188) e as chapas do chassi ocupam x 266 a 327 até z 100; a torre passa ali, e com 820 atravessaria a aba. 620 fica
 *   entre a vista de frente na escala da carcaça (555) e a de cima (706), com 17 mm de folga para a aba.
 *   Fundo da torre: 272 mm (z 100 a 372). A lateral dá a face de trás em z 75, mas as chapas do chassi vão até z 100 em x 266 a 327,
 *   e a face de trás do canal externo encosta nelas ali.
 *   Placa porta-garfos e grade: 1.000 (TABELA; a frente dá 836 e a de cima 920). Topo da grade: 1.230 (frente 1.215, lateral 1.236).
 *   Garfos: 1.070 x 100 x 40 (TABELA; a lateral dá a lâmina com 947 e 55 de espessura), a 560 entre centros (vista de frente na escala
 *   da carcaça, 565: o garfo fica sobre a borda do canal, como na referência; a TABELA e a de cima dão 500 e 526).
 *   Cilindros de inclinação no x 355 (carcaca-frente 338, cima 325), y 860 (lateral 775-907, carcaca-frente 879).
 *
 * `GIRAR=1 npm run esboco:nucleo -- <este arquivo> --vista isometrica` gira a máquina 180 graus para os três quartos de trás. */
import carcaca from './carcaca.esboco.mjs';
import { ferramentas, CINZA, CINZA_CLARO, ESCURO } from './carcaca-traseira.esboco.mjs';

const PRETO = '#26282b';         // garfos, placa e grade: o quase preto da vista de frente (escuro mais claro que o fundo)
const ACO = '#b4b8bc';           // as hastes cromadas (cinza claro na vista de cima, colunas 364 a 375)
const LADOS = 40;

/* as medidas adotadas, em mm */
export const TORRE = {
  tras: 100, frente: 372,                 // fundo dos canais externos (z)
  externo: { x: [261, 310], alma: 20, aba: 20, y: [150, 2040] },
  interno: { x: [198, 288], alma: 20, aba: 20, z: [124, 348], y: [260, 2100] },
  pivo: { y: 352.5, z: 0 },               // o centro do eixo dianteiro, em torno do qual a torre inclina
};
export const CARRO = { z: [430, 480], x: 500, barraBaixo: [170, 240], barraCima: [540, 640], montante: [140, 195] };
export const GARFO = { centro: 280, largura: 100, espessura: 40, comprimento: 1070, chao: 50, altura: 650, face: 520 };
export const INCLINACAO = { x: 355, y: 860, camisa: [-260, 15], haste: [15, 60], rCamisa: 45, rHaste: 22 };

/** Monta a torre e os garfos no estado { passos, topo, origem } da carcaça e devolve as medidas usadas. */
export function montarTorreGarfos(estado) {
  const { extX, extY, extZ, booleana, parte } = ferramentas(estado);
  const unir = (...s) => booleana('unir', s);
  const cortar = (a, ...s) => booleana('subtrair', [a, ...s]);
  const cruzar = (...s) => booleana('intersectar', s);
  const novo = () => { estado.origem += 1; return estado.origem; };
  /* a cópia do outro lado, pelo espelho em x = 0 (a peça que se repete é feita uma vez) */
  function espelho(sel) {
    const id = novo();
    estado.passos.push(['espelha', { origemId: id, eixo: 'x', pos: 0, derivaDe: sel.origem, sel: { origem: sel.origem } }]);
    return { origem: { op: 'espelha', id, de: sel.origem } };
  }
  const par = (sel) => unir(sel, espelho(sel));
  const circulo = (cx, cy, r, n = LADOS) => Array.from({ length: n }, (_, k) => [cx + r * Math.cos(2 * Math.PI * k / n), cy + r * Math.sin(2 * Math.PI * k / n)]);
  const caixaY = (x0, x1, z0, z1, y0, y1) => extY([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y0, y1);
  const T = TORRE; const E = T.externo; const I = T.interno;

  /* PÉ DA TORRE ------------------------------------------------------------------------------------------------------------------
     O olhal que abraça o tubo do eixo dianteiro (Ø 150 em `eixos-rodas`, de 190 a 404 mm do centro) e a chapa que desce à frente até a
     travessa de baixo dos canais externos. Fica por dentro das chapas do chassi (x 266 a 327), de 215 a 262 mm: por fora delas a frente
     das laterais e o poço da roda ocupam o lugar. É o pé de trás que a carcaca-lado mostra descendo a z 145 (aqui, até a face de trás
     da travessa, z 100). O furo de raio 75 é o assento no tubo; o olhal tem raio 95 para não alcançar o canal interno (z 124).
     Contato: o furo no tubo do eixo (pino) e a face z 100 na travessa de baixo. */
  const P = T.pivo;
  const chapaDoPe = [[-30, 266], [T.tras, E.y[0]], [T.tras, 215], [70, 300]];
  const pe = cortar(unir(extX(circulo(P.z, P.y, 95), 215, 262), extX(chapaDoPe, 215, 262)), extX(circulo(P.z, P.y, 75), 200, 280));
  parte('peTorre', par(pe), CINZA);

  /* CANAIS EXTERNOS --------------------------------------------------------------------------------------------------------------
     Perfil em U de pé, aberto para dentro: a alma do lado de fora (x 290 a 310) e as duas abas de 20 mm na frente e atrás, de x 261 a
     310 (a frente: canal externo de 13-14 px, 49 mm na escala da torre). De y 150 (lateral 140) a 2.040, 60 mm abaixo do interno.
     Travessas: chapas atrás (z 100 a 120, entre as abas de trás) em y 1.150-1.220 e 1.970-2.040, e a de baixo, de fundo, de z 100 a
     220 e y 150 a 210, que é o assento do cilindro de elevação (o carro passa à frente dela, de z 235 em diante). */
  const uExterno = [[E.x[0], T.tras], [E.x[1], T.tras], [E.x[1], T.frente], [E.x[0], T.frente], [E.x[0], T.frente - E.aba],
    [E.x[1] - E.alma, T.frente - E.aba], [E.x[1] - E.alma, T.tras + E.aba], [E.x[0], T.tras + E.aba]];
  const canalExterno = extY(uExterno, E.y[0], E.y[1]);
  const travessas = [
    caixaY(-E.x[1] + 1, E.x[1] - 1, T.tras, T.tras + E.aba, 1150, 1220),
    caixaY(-E.x[1] + 1, E.x[1] - 1, T.tras, T.tras + E.aba, 1970, E.y[1]),
    caixaY(-E.x[1] + 1, E.x[1] - 1, T.tras, 220, E.y[0], 210),
  ];
  /* a orelha do cilindro de inclinação: o bloco preso à alma por fora (face x 310), de z 60 a 160, y 830 a 890, até x 400; a haste
     encosta na face de trás dele (z 60). É a cabeça em C da carcaca-lado, de y 760 a 1.010, reduzida ao que segura o pino. */
  const orelha = caixaY(E.x[1], INCLINACAO.x + 45, 60, 160, INCLINACAO.y - 30, INCLINACAO.y + 30);
  parte('canaisExternos', unir(par(unir(canalExterno, orelha)), ...travessas), CINZA);

  /* CANAIS INTERNOS --------------------------------------------------------------------------------------------------------------
     Perfil em U aberto para dentro, encaixado no U do externo: a alma de x 268 a 288 corre entre as abas do externo (z 120 a 352), e
     as abas de 20 mm, em z 124-144 e 328-348, vão de x 198 a 288. De frente aparece de 198 a 261, ao lado do externo (canal interno
     de 15 px). De y 260 a 2.100 (o topo da torre recolhida). A travessa de cima, entre as almas, de y 2.030 a 2.100 e z 124 a 350, leva
     as polias das correntes na frente e recebe a haste do cilindro de elevação por baixo. */
  const uInterno = [[I.x[0], I.z[0]], [I.x[1], I.z[0]], [I.x[1], I.z[1]], [I.x[0], I.z[1]], [I.x[0], I.z[1] - I.aba],
    [I.x[1] - I.alma, I.z[1] - I.aba], [I.x[1] - I.alma, I.z[0] + I.aba], [I.x[0], I.z[0] + I.aba]];
  const travessaInterna = caixaY(-I.x[1] + 1, I.x[1] - 1, I.z[0], 350, 2030, I.y[1]);
  parte('canaisInternos', unir(par(extY(uInterno, I.y[0], I.y[1])), travessaInterna), CINZA);

  /* CILINDRO DE ELEVAÇÃO ---------------------------------------------------------------------------------------------------------
     Um, no centro (vista de frente, colunas 535 a 550), entre as travessas de trás e o carro: x 0, z 175. Camisa Ø 90 sentada na
     travessa de baixo (y 210) até 1.300; haste Ø 50 até a travessa de cima do interno (2.030). */
  parte('cilindroElevacao', extY(circulo(0, 175, 45), 210, 1300), ESCURO);
  parte('hasteElevacao', extY(circulo(0, 175, 25), 1300, 2030), ACO);

  /* CILINDROS DE INCLINAÇÃO ------------------------------------------------------------------------------------------------------
     Deitados ao longo de z em x 355, y 860, como na carcaca-lado (de z -36 a 75 em y 812 a 912). A camisa de Ø 90 vai de z -260 a 15:
     a carcaça não tem o rebaixo no painel e ela fica dentro dele, de z -260 a 0 (o relato diz a medida que o painel teria de ter). A
     haste de Ø 44 vai de 15 a 60, até a orelha do canal externo. */
  const C = INCLINACAO;
  parte('cilindrosInclinacao', par(extZ(circulo(C.x, C.y, C.rCamisa), C.camisa[0], C.camisa[1])), CINZA);
  parte('hastesInclinacao', par(extZ(circulo(C.x, C.y, C.rHaste), C.haste[0], C.haste[1])), ACO);

  /* PLACA PORTA-GARFOS (o carro) -------------------------------------------------------------------------------------------------
     As duas barras de 1.000 mm à frente da torre (z 430 a 480): a de baixo de y 170 a 240 e a de cima de 540 a 640 (frente, linhas
     480-497 e 388-415, com os garfos embaixo). Os dois montantes de trás, de x 140 a 195, z 235 a 430, levam as barras aos canais
     internos: correm por dentro deles (face de dentro do interno em x 198, 3 mm de folga) e no topo prendem as correntes. */
  const K = CARRO;
  const barras = [caixaY(-K.x, K.x, K.z[0], K.z[1], ...K.barraBaixo), caixaY(-K.x, K.x, K.z[0], K.z[1], ...K.barraCima)];
  const montante = caixaY(K.montante[0], K.montante[1], 235, K.z[0], K.barraBaixo[0], K.barraCima[1]);
  parte('placaGarfos', unir(...barras, par(montante)), PRETO);

  /* GRADE DE CARGA: o quadro de 1.000 sobre a barra de cima (face y 640), de z 445 a 480, com os montantes de 30 mm, a barra de cima
     de 1.200 a 1.230 e a do meio de 890 a 910 (frente: topo na linha 247, barra do meio na 347). */
  const lateralDaGrade = caixaY(K.x - 30, K.x, 445, K.z[1], K.barraCima[1], 1230);
  parte('gradeCarga', unir(par(lateralDaGrade), caixaY(-K.x + 1, K.x - 1, 445, K.z[1], 1200, 1230), caixaY(-K.x + 1, K.x - 1, 445, K.z[1], 890, 910)), PRETO);

  /* GARFOS: em L, a haste de 40 mm de pé contra a face das barras (z 480) e a lâmina de 1.070 x 100 x 40 com a face de baixo a 50 mm
     do chão. A lâmina afina na ponta: de lado, nos últimos 200 mm, desce de 40 a 12 mm; de cima, nos últimos 60, de 100 a 70. */
  const G = GARFO; const ponta = G.face + G.comprimento;
  const ladoDoGarfo = [[K.z[1], G.chao], [ponta, G.chao], [ponta, G.chao + 12], [ponta - 200, G.chao + G.espessura],
    [G.face, G.chao + G.espessura], [G.face, G.altura], [K.z[1], G.altura]];
  const x0 = G.centro - G.largura / 2; const x1 = G.centro + G.largura / 2;
  const plantaDoGarfo = [[x0, K.z[1] - 1], [x1, K.z[1] - 1], [x1, ponta - 60], [x1 - 15, ponta + 1], [x0 + 15, ponta + 1], [x0, ponta - 60]];
  parte('garfos', par(cruzar(extX(ladoDoGarfo, x0, x1), extY(plantaDoGarfo, 0, 700))), PRETO);

  /* CORRENTES: uma fita de 15 x 12 mm de cada lado, em x 143 a 158 (149 mm do centro na frente), de pé na frente da travessa de cima
     do interno (face z 350) até o topo dos montantes do carro (y 640). Na referência elas descem à frente dos canais até a placa. */
  parte('correntes', par(caixaY(143, 158, 350, 362, K.barraCima[1], I.y[1])), ESCURO);

  return { TORRE, CARRO, GARFO, INCLINACAO };
}

/* rodado sozinho: a carcaça inteira (os passos dela, sem o giro) e as partes desta frente por cima */
const base = carcaca.opcoes[0];
const passosDaCarcaca = base.passos.filter((p) => p[0] !== 'rotaciona');
const estado = {
  passos: [...passosDaCarcaca],
  topo: { ...base.topo },
  origem: passosDaCarcaca.reduce((m, [, a]) => Math.max(m, a?.origemId ?? 0), 0),
};
if (process.env.EIXOS) {
  const { montarEixosRodas } = await import('./eixos-rodas.esboco.mjs');
  montarEixosRodas(estado);
}
montarTorreGarfos(estado);
if (process.env.GIRAR) estado.passos.push(['rotaciona', { eixo: 'y', graus: 180, pivo: [0, 600, -995] }]);

export default {
  plano: 'Torre e garfos da empilhadeira sobre a carcaça: canais externos e internos, cilindros, correntes, placa, grade e garfos.',
  vista: 'frontal',
  opcoes: [{ titulo: 'carcaça com torre e garfos', nota: 'rascunho da fatia 4, torre de pé e garfos a 50 mm', passos: estado.passos, topo: estado.topo }],
};
