/* torre-garfos.esboco.mjs — o rascunho da torre e dos garfos da empilhadeira (fatia 4): o pé da torre no eixo dianteiro, os dois
 * canais externos com as travessas, os dois canais internos com a travessa de cima, o cilindro de elevação, os dois cilindros de
 * inclinação, as correntes, a placa porta-garfos, a grade de carga e os dois garfos. Rodado sozinho, monta a carcaça inteira de
 * `carcaca.esboco.mjs` mais estas partes (com EIXOS=1, também os eixos e as rodas de `eixos-rodas.esboco.mjs`, para ver o pé no eixo).
 *
 * A TORRE INTEIRA MORA NAS RECEITAS DA ETAPA (2026-11-10). A primeira metade: os pés e os canais externos em
 * `../partes/torre/receita.js` (`montarTorre`), os canais internos em `../partes/canal-interno/receita.js` (`montarCanalInterno`) e o
 * cilindro de elevação em `../partes/cilindro-elevacao/receita.js` (`montarCilindroElevacao`). A segunda: a placa e a grade em
 * `../partes/carro/receita.js` (`montarCarro`), cada garfo em `../partes/garfo/receita.js` (`montarGarfo`), as correntes em
 * `../partes/correntes/receita.js` (`montarCorrentes`) e cada cilindro de inclinação em `../partes/cilindro-inclinacao/receita.js`
 * (`montarCilindroInclinacao`). A forma é a deste rascunho, com 96 lados nos círculos, e o garfo e o cilindro de inclinação de cada
 * lado postos pelas portas das receitas no lugar do espelho. As medidas abaixo ficam como registro da fonte; quem as usa são as
 * receitas, e este módulo só as chama sobre o estado da máquina.
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
import { montarTorre, TABELA as TABELA_TORRE, derivar as derivarTorre } from '../partes/torre/receita.js';
import { montarCanalInterno, TABELA as TABELA_INTERNO, derivar as derivarInterno } from '../partes/canal-interno/receita.js';
import { montarCilindroElevacao } from '../partes/cilindro-elevacao/receita.js';
import { montarCarro, TABELA as CARRO, derivar as derivarCarro } from '../partes/carro/receita.js';
import { montarGarfo, TABELA as GARFO, derivar as derivarGarfo } from '../partes/garfo/receita.js';
import { montarCorrentes } from '../partes/correntes/receita.js';
import { montarCilindroInclinacao, TABELA as INCLINACAO, derivar as derivarInclinacao } from '../partes/cilindro-inclinacao/receita.js';


/* as medidas adotadas, em mm, lidas das receitas da etapa (2026-11-10), onde a forma deste rascunho foi levada sem mudança de medida:
   TORRE resume a torre e o canal interno, e CARRO, GARFO e INCLINACAO são as TABELAS do carro, do garfo e do cilindro de inclinação. */
const DI = derivarInterno();
export const TORRE = {
  tras: TABELA_TORRE.tras, frente: TABELA_TORRE.frente,   // fundo dos canais externos (z)
  externo: TABELA_TORRE.externo,
  interno: { x: [TABELA_INTERNO.dentro, DI.fora], alma: TABELA_INTERNO.alma, aba: TABELA_INTERNO.aba, z: DI.z, y: DI.y },
  pivo: derivarTorre().pivo,              // o centro do eixo dianteiro, em torno do qual a torre inclina
};
export { CARRO, GARFO, INCLINACAO };

/** Monta a torre e os garfos no estado { passos, topo, origem } da carcaça e devolve as medidas usadas. */
export function montarTorreGarfos(estado) {
  /* PÉ DA TORRE E CANAIS EXTERNOS: a receita da etapa (`../partes/torre/receita.js`), no referencial da máquina. O olhal abraça o
     tubo do eixo dianteiro (raio 75) com 2 mm de folga, de 215 a 262 mm do centro; o canal externo em U com as travessas e a orelha
     do cilindro de inclinação. */
  montarTorre(estado);

  /* CANAIS INTERNOS: a receita da etapa (`../partes/canal-interno/receita.js`), recolhidos, com o topo no da torre. */
  montarCanalInterno(estado);

  /* CILINDRO DE ELEVAÇÃO: a receita da etapa (`../partes/cilindro-elevacao/receita.js`), com o fundo da camisa no assento da torre,
     sobre a travessa de baixo (a porta `assentoDoCilindro`). */
  montarCilindroElevacao(estado, undefined, derivarTorre().portas.assentoDoCilindro.centro);

  /* CILINDROS DE INCLINAÇÃO: a receita da etapa (`../partes/cilindro-inclinacao/receita.js`), um de cada lado, com a ponta da haste na
     face de trás da orelha da torre (as portas `orelhaEsquerda` e `orelhaDireita`) e a camisa no rebaixo do painel da carcaça. */
  const portasDaTorre = derivarTorre().portas;
  const naOrelha = derivarInclinacao().portas.naOrelha.ponto;
  for (const lado of ['orelhaEsquerda', 'orelhaDireita']) {
    const em = portasDaTorre[lado].ponto.map((c, k) => c - naOrelha[k]);
    montarCilindroInclinacao(estado, undefined, em, { camisa: 'cilindrosInclinacao', haste: 'hastesInclinacao' });
  }

  /* PLACA PORTA-GARFOS E GRADE DE CARGA: a receita da etapa (`../partes/carro/receita.js`), embaixo, no referencial da máquina. */
  montarCarro(estado);

  /* GARFOS: a receita da etapa (`../partes/garfo/receita.js`), um de cada lado, com a face de trás da haste na face da frente da barra
     de cima do carro (as portas `apoioDoGarfoEsquerdo` e `apoioDoGarfoDireito`) e a face de baixo da lâmina a 50 mm do chão. */
  const portasDoCarro = derivarCarro().portas;
  const gancho = derivarGarfo().portas.gancho.ponto;
  for (const lado of ['apoioDoGarfoEsquerdo', 'apoioDoGarfoDireito']) {
    montarGarfo(estado, undefined, portasDoCarro[lado].ponto.map((c, k) => c - gancho[k]), { garfo: 'garfos' });
  }

  /* CORRENTES: a receita da etapa (`../partes/correntes/receita.js`), da cabeça do cilindro e da travessa do canal interno ao carro. */
  montarCorrentes(estado);

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
