/* carcaca.esboco.mjs — o rascunho da carcaça inteira da empilhadeira: chassi, laterais, paralamas, piso, painel, tampa do motor,
 * colunas e a traseira de `carcaca-traseira.esboco.mjs`, montada pela função que aquele módulo exporta.
 *
 * DE ONDE VEM CADA MEDIDA.
 *   Comprimento e altura: o contorno de cada parte na lateral (`carcaca-lado.ia.contornos.json`, 4,282 mm/px), com z da lateral
 *   para trás; o modelo tem a frente em +z, e por isso todo ponto [z, y] da lateral entra aqui como [-z, y] (o `L` abaixo).
 *   Largura: a vista de cima (`carcaca-cima.ia.png`), medida por cor coluna a coluna (laranja, cinza, escuro e fundo, pela regra do
 *   perfil por cor; script em scratchpad/carcaca/medir.py). Nela o comprimento corre na horizontal e a largura na vertical. A escala
 *   da largura é a do capô da vista de trás: o capô ocupa as linhas 141 a 454 nas colunas 776 a 870 (313 px) e mede 1.193 mm, o que
 *   dá 3,80 mm/px; cada meia largura é metade do trecho da parte naquela coluna. O comprimento da vista de cima foi levado à lateral
 *   pela frente do paralama (coluna 360, z -188) e pela ponta do capô (coluna 943, z 2178): z = -188 + (coluna - 360) x 4,058.
 *   Perfil de frente: a vista de frente (`carcaca-frente.ia.png`), medida por cor linha a linha, com a altura pela lateral (topo do
 *   paralama na linha 356 a 776 mm, pé do laranja na linha 484 a 226 mm: y = (536,6 - linha) x 4,296) e a largura pela vista de cima
 *   (a aba do paralama, 179 px de meia largura, vale os 606 mm dela: 3,385 mm/px). As vistas de IA não concordam entre si em
 *   largura: a de frente, na escala da própria altura, daria o corpo com 1.180 mm e o paralama com 1.540; vale a de cima.
 * Eixos: x lateral (+x é a esquerda de quem dirige, o lado da lateral de referência e do furo), y altura, z comprimento com a frente
 * em +z (eixo dianteiro em z 0, a traseira em z -2178).
 *
 * `GIRAR=1 npm run esboco:nucleo -- <este arquivo> --vista isometrica` gira a peça 180 graus para os três quartos de trás. */
import {
  ferramentas, montarTraseira, lado, LARANJA, CINZA_CLARO, CINZA, ESCURO,
} from './carcaca-traseira.esboco.mjs';

const ESCURO_PISO = '#34383c';   // o tapete do piso: cinza escuro, mais claro que o fundo da grade
const L = (pts) => pts.map(([z, y]) => [-z, y]);             // ponto da lateral [z para trás, y] -> [z do modelo, y]
const espelhoX = (xy) => xy.map(([x, y]) => [-x, y]);         // o mesmo perfil do outro lado
const circulo = (cz, cy, r, n = 48) => Array.from({ length: n }, (_, k) => [cz + r * Math.cos(2 * Math.PI * k / n), cy + r * Math.sin(2 * Math.PI * k / n)]);
/* o canto de raio r de um polígono em planta, de a0 a a1 graus, com o centro em (cx, cz) */
const arco = (cx, cz, r, a0, a1, n = 5) => Array.from({ length: n + 1 }, (_, k) => {
  const a = (a0 + (a1 - a0) * k / n) * Math.PI / 180;
  return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
});

const estado = { passos: [], topo: {}, origem: 0 };
const { extX, extY, extZ, booleana, parte, corpo } = ferramentas(estado);
const unir = (...s) => booleana('unir', s);
const cortar = (a, ...s) => booleana('subtrair', [a, ...s]);
const cruzar = (...s) => booleana('intersectar', s);

/* larguras da vista de cima (meia largura em mm; entre parênteses as linhas da vista de cima, em px) */
const PLACA = [266, 327];       // chapas do chassi: cinza nas linhas 211-230 e 367-381, colunas 380-404
const ABA = [327, 606];         // aba do paralama: laranja 135-210 e 382-454, colunas 366-400
const FAIXA = 266;              // a faixa laranja da frente entre as chapas: linhas 231-371, colunas 390-396
const LATERAL_FRENTE = 583;     // o corpo laranja: linhas 147 e 454 nas colunas 504-560 (z 400-660)
const LATERAL_TRAS = 595;       // linhas 141 e 454 nas colunas 700-770 (z 1190-1500)
const TAPETE = 400;             // o escuro do piso: linhas 199-200 a 410-412, colunas 504-560
const DEGRAU = 568;             // o cinza dos degraus: linhas 151 e 450, colunas 504-560
const COLUNAS = 516;            // as colunas, pela vista de trás (cinza das colunas 408 a 664 nas linhas 274-280, 4,03 mm/px); a de cima
                                // dava 545 (linhas 148-152 e 437, colunas 700-768), mas a largura vale a de trás
const POCO_D = { z: 0, y: 352.5, r: 392, de: 414 };     // pneu dianteiro com 40 mm de folga; de 355 mm do protótipo x 596,4/511
const POCO_T = { z: -1700, y: 284, r: 312, de: 432 };   // traseiro; de 370 mm do protótipo x 596,4/511

const pocos = (p) => [extX(circulo(p.z, p.y, p.r), p.de, 720), extX(circulo(p.z, p.y, p.r), -720, -p.de)];

/* chassi: as duas chapas com a silhueta lateral (o entalhe é o cubo, que fica de fora) e a travessa da frente, vista de cima entre as
   chapas nas colunas 398-404 (z -34 a -9 na vista de cima; aqui de 9 a 107 mm à frente do eixo, sob a faixa laranja) */
const chapas = lado('chassi');
const chassi = unir(
  extX(chapas, PLACA[0], PLACA[1]), extX(chapas, -PLACA[1], -PLACA[0]),
  extX([[9, 600], [107, 600], [107, 690], [9, 690]], -PLACA[0] - 5, PLACA[0] + 5),
);
parte('chassi', chassi, CINZA);

/* paralamas: as duas abas e a faixa da frente. A aba é chapa de 37 mm (a lateral dá y 755 a 792): sai da silhueta lateral cruzada
   com a planta, e o canto da frente de fora, redondo na vista de cima (colunas 354 a 366 até a linha 135), tem raio 40 mm; o de
   dentro, 15 mm. A faixa da frente fica a 42-74 mm à frente do eixo (colunas 388-396) e desce de 776 a 657 mm (linhas 360-384 da
   vista de frente); vai até 330 mm para encostar nas abas. */
const plantaAba = (s) => {
  const [a, b] = ABA; const zf = 188; const zt = -140;
  const p = [[a, zt], [b, zt], ...arco(b - 40, zf - 40, 40, 0, 90), ...arco(a + 15, zf - 15, 15, 90, 180)];
  return s > 0 ? p : p.map(([x, z]) => [-x, z]).reverse();
};
const ladoAba = lado('paralama');
const abas = [1, -1].map((s) => cruzar(extX(ladoAba, s > 0 ? ABA[0] - 1 : -ABA[1] - 1, s > 0 ? ABA[1] + 1 : -ABA[0] + 1), extY(plantaAba(s), 700, 840)));
const faixa = extX([[42, 657], [74, 657], [74, 776], [42, 776]], -330, 330);
parte('paralamas', unir(...abas, faixa), LARANJA);

/* laterais: o corpo laranja do meio, a frente em volta da roda dianteira e o arco da roda traseira, numa malha só.
   A frente (`frenteLateral` da lateral) vai da chapa do chassi à borda de fora; de frente essa borda é quase vertical (meia largura de
   171 px na linha 364 a 168 px na 464, 579 a 569 mm) e o canto de baixo é redondo (166, 164, 162, 161 e 159 px nas linhas 468 a 484). */
const PERFIL_FRENTE = [[ABA[0], 150], [538, 150], [538, 226], [548, 260], [555, 277], [562, 295], [569, 312], [579, 741], [579, 800], [ABA[0], 800]];
const ladoFrente = lado('frenteLateral');
const frentes = [1, -1].map((s) => cruzar(
  extX(ladoFrente, s > 0 ? ABA[0] : -620, s > 0 ? 620 : -ABA[0]),
  extZ(s > 0 ? PERFIL_FRENTE : espelhoX(PERFIL_FRENTE), -460, 60),
));
const plantaLateral = [[LATERAL_FRENTE, -400], [LATERAL_TRAS, -1520], [-LATERAL_TRAS, -1520], [-LATERAL_FRENTE, -400]];
const meio = cruzar(extX(lado('lateral'), -620, 620), extY(plantaLateral, 150, 1000));
const aro = extX(lado('aroTraseiro'), -LATERAL_TRAS, LATERAL_TRAS);
/* o furo da tampa de combustível, só do lado +x: a elipse da lateral (z 1299-1450, y 704-882), 35 mm de fundo, com o fundo escuro */
const FURO = circulo(-1375, 793, 1, 32).map(([z, y]) => [-1375 + (z + 1375) * 75, 793 + (y - 793) * 89]);
const laterais = cortar(unir(meio, ...frentes, aro), ...pocos(POCO_D), ...pocos(POCO_T), extX(FURO, 560, 720));
parte('laterais', laterais, LARANJA);
parte('furo', extX(FURO, 545, 561), ESCURO);

/* piso: o tapete escuro no meio, com a silhueta lateral do piso (o piso a 765 mm, a rampa até o painel e o espelho do degrau), e os
   degraus cinza dos lados, de z 431 a 719 com o piso do degrau a 490 mm (a lateral dá a borda de baixo do piso a 470-486 mm ali) */
parte('piso', extX(lado('piso'), -TAPETE, TAPETE), ESCURO_PISO);
const degrau = L([[431, 300], [431, 490], [719, 490], [719, 300]]);
parte('degraus', unir(extX(degrau, TAPETE - 1, DEGRAU), extX(degrau, -DEGRAU, -TAPETE + 1)), CINZA);

/* painel: o anteparo inclinado, pela lateral sem a coluna de direção (que é outra peça): a frente reta em z 0-36 de 760 a 915 mm, o
   topo sob a coluna e a descida até o piso em z 404 a 763 mm. Planta da vista de cima: a moldura cinza vai das linhas 165 a 426 nas
   colunas 410-470 (496 mm) e se estreita para 197-415 nas colunas 486-500 (376 mm), com o canto de trás redondo. */
const painel = corpo('painel', {
  lado: L([[0, 760], [0, 915], [181, 915], [404, 763], [404, 760]]),
  perfil: [[760, 496], [900, 496], [915, 484]],
  planta: [[-496, 0], [496, 0], [496, -250], [488, -300], [470, -345], [440, -380], [376, -404],
    [-376, -404], [-440, -380], [-470, -345], [-488, -300], [-496, -250]],
  estacoes: [760, 764, 775, 800, 830, 860, 890, 905, 915],
}, { vincos: [{ nome: 'base', laco: 'primeiro', nitidez: 'viva' }] });
parte('painel', painel, CINZA);

/* tampa do motor: a base do banco. Lateral `tampaMotor` sem o entalhe de trás (ali entra a coluna). Planta da vista de cima: o
   nariz redondo da frente, medido nas colunas 562 a 590 (meia largura de 52, 68, 85, 97, 103, 105,5, 111,5, 115,5, 120, 123,5 e 133
   px de 2 em 2 px até 4 em 4 px), e a meia largura de 507 mm (linhas 161 a 428) daí para trás. De frente o topo tem o ombro redondo. */
const NARIZ = [[0, 200], [8, 258], [16, 323], [24, 369], [32, 391], [40, 401], [56, 424], [73, 439], [89, 456], [105, 469], [130, 495], [160, 507]];
const FRENTE_TM = -667; const TRAS_TM = -1335;
const ladoNariz = NARIZ.map(([dz, w]) => [w, FRENTE_TM - dz]);
const tampaMotor = corpo('tampaMotor', {
  lado: L([[667, 769], [732, 734], [1044, 735], [1266, 906], [1290, 960], [1325, 1042], [1272, 1072], [1111, 1009], [745, 997], [672, 909]]),
  perfil: [[734, 507], [960, 507], [1010, 495], [1050, 470], [1072, 440]],
  planta: [[507, TRAS_TM], ...[...ladoNariz].reverse(), ...ladoNariz.slice(1).map(([x, z]) => [-x, z]), [-507, TRAS_TM]],
  estacoes: [736, 745, 760, 790, 830, 870, 910, 950, 980, 997, 1010, 1025, 1040, 1055, 1068],
}, { vincos: [{ nome: 'base', laco: 'primeiro', nitidez: 'viva' },
  { nome: 'trasDir', entre: ['inicio', 'direita'], nitidez: 'viva' }, { nome: 'trasEsq', entre: ['esquerda', 'inicio'], nitidez: 'viva' }] });
parte('tampaMotor', tampaMotor, CINZA_CLARO);

/* colunas: o bloco atrás da tampa do motor, com a silhueta lateral `coluna` e a largura das colunas na vista de cima */
parte('colunas', extX(lado('coluna'), -COLUNAS, COLUNAS), CINZA);

/* o fundo do poço traseiro, escuro, entre as rodas de trás (lateral `pocoTraseiro`, z 1342-1645; na largura do protótipo, 360 mm
   x 596,4/511) */
parte('pocoTraseiro', extX(L([[1342, 240], [1342, 625], [1645, 625], [1645, 240]]), -420, 420), ESCURO);

/* a traseira: capô, grade, tampa e contrapeso, do módulo dela */
montarTraseira(estado);

if (process.env.GIRAR) estado.passos.push(['rotaciona', { eixo: 'y', graus: 180, pivo: [0, 600, -995] }]);

export default {
  plano: 'Carcaça inteira da empilhadeira: chassi, laterais, paralamas, piso, painel, tampa do motor, colunas e a traseira, pelas vistas de IA.',
  vista: 'direita',
  opcoes: [{ titulo: 'carcaça inteira', nota: 'rascunho pelas quatro vistas', passos: estado.passos, topo: estado.topo }],
};
