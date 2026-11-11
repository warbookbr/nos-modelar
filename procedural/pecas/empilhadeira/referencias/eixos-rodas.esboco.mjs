/* eixos-rodas.esboco.mjs — o rascunho dos eixos e das rodas da empilhadeira (fatia 3): o eixo dianteiro motriz com o diferencial e os
 * dois cubos, o eixo traseiro direcional com a viga, as mangas, os cubos e a barra de direção, e as quatro rodas (pneu e aro), sobre
 * a carcaça de `carcaca.esboco.mjs`. Rodado sozinho, monta a carcaça inteira mais estas partes.
 *
 * A METADE DIANTEIRA MORA NAS RECEITAS DA ETAPA (2026-11-10): o eixo dianteiro com os cubos em `../partes/eixo-dianteiro/receita.js`
 * (`montarEixoDianteiro`, a forma deste rascunho levada para lá sem mudança) e a roda dianteira em `../partes/roda-dianteira/receita.js`
 * (`montarRodaDianteira`, pela família roda-pneu). As medidas da metade dianteira abaixo ficam como registro da fonte; quem as usa são
 * as receitas. O eixo traseiro direcional também mora na receita da etapa (`../partes/eixo-traseiro/receita.js`, `montarEixoTraseiro`,
 * a forma deste rascunho com 96 lados), e as rodas traseiras também (`../partes/roda-traseira/receita.js`, `montarRodaTraseira`, pela
 * família). As duas rodas saem com o ombro largo da família, o arco de 62 mm que reproduz o ombro arredondado que este rascunho
 * desenhava à mão (2026-11-10): a seção à mão, de antes, está no histórico deste arquivo.
 *
 * Eixos do modelo: x lateral (+x é a esquerda de quem dirige), y altura com o chão em 0, z comprimento com a frente em +z; o eixo
 * dianteiro em z 0 e o traseiro em z -1700.
 *
 * DE ONDE VEM CADA MEDIDA.
 *   Altura dos cubos: as âncoras da carcaça (`carcaca-lado.ia.regioes.json`): o dianteiro a 352,5 mm do chão e o traseiro a 284 mm,
 *   em z -1700. As rodas tocam o chão, então o raio do pneu é a altura do cubo: Ø 705 na frente (o 7.00-12 da TABELA) e Ø 568 atrás
 *   (o 6.00-9 da TABELA tem Ø 545; com ele a roda ficaria 11,5 mm acima do chão sob o cubo da carcaça). A lateral de outubro
 *   (`lateral.contornos.json`, 4,437 mm/px) dá a dianteira com 164 px de largura (728 mm) e a traseira com 138 px (612 mm), razão
 *   0,84; a vista de cima dá 143 e 120 px de comprimento médio (razão 0,84); aqui a razão é 0,81 e a TABELA dá 0,77.
 *   Largura e posição das rodas: a vista de cima da máquina (`cima.ia.png`), na escala do paralama (laranja das linhas 135 a 454 nas
 *   colunas 368 a 432, 319 px para os 1.212 mm da aba da carcaça, 3,80 mm/px, centro na linha 294,5): o pneu dianteiro vai à linha
 *   120 e à 471 (meia largura de 667 mm) e o traseiro à 125 e à 467 nas colunas 776 a 856 (650 mm). A vista de trás (`tras.ia.png`,
 *   4,03 mm/px pelo capô, centro na coluna 536) dá o traseiro de 374 a 436 na linha 500 (653 a 403 mm). A vista de frente
 *   (`frente.ia.png`, 3,395 mm/px pela aba, 357 px de 366 a 723) dá o dianteiro de 362 a 439 (620 a 358 mm).
 *   As vistas dão o pneu com 250 a 265 mm de banda. Na integração da máquina inteira (2026-11-10) a carcaça passou a cortar os poços
 *   pela roda (`RODAS` de `carcaca.esboco.mjs`, 40 mm de folga): a dianteira vai de 417 a 667 mm (banda de 250) e a traseira de 445 a
 *   653 (banda de 208, a da dianteira na razão 150/180 da TABELA), com o poço do contrapeso cortado de 405 mm para fora.
 *   Cubos e eixo dianteiro: a vista de frente da carcaça (`carcaca-frente.ia.png`, 3,385 mm/px, centro na coluna 545,5, altura
 *   4,296 mm/px): a tampa cinza do cubo nas colunas 393 a 408 (516 a 463 mm), Ø 90 (linhas 442 a 462); o flange escuro nas 408 a 425
 *   (463 a 404 mm), Ø 220 (linhas 425 a 476); o tubo do eixo Ø 150 (linhas 432 a 467 nas colunas 430 a 445). A lateral da carcaça
 *   (`carcaca-lado.ia.png`, 4,28 mm/px) confere o flange (52 px, 223 mm) e a tampa (26 px, 111 mm).
 *   Cubos traseiros: a vista de trás da carcaça (`carcaca-tras.ia.png`, 4,03 mm/px): a tampa cinza nas colunas 365 a 379, Ø 89
 *   (linhas 457 a 479), e o cubo escuro Ø 177 (linhas 445 a 489 na coluna 388). Ela põe a ponta da tampa a 689 mm do centro, 39 mm
 *   fora do pneu da vista de trás inteira (653); vale a roda, e a tampa fica dentro do aro.
 *   Aros: 12 e 9 polegadas (raio do talão 160 e 120 mm), com o disco rente ao flange do cubo.
 *   Diferencial: o tambor escuro entre as chapas do chassi na vista de frente da carcaça (colunas 510 a 580, linhas 422 a 462) fica
 *   atrás do pé da torre; o corpo do diferencial é um bojo de Ø 300 no meio do eixo, de -120 a 120 mm, que é caráter e não medida.
 *   Eixo traseiro: a viga, as mangas e a barra não aparecem inteiras em nenhuma vista (a de trás as esconde atrás do contrapeso e a
 *   lateral da carcaça mostra só o pino vertical da manga sobre o cubo, coluna 782, linhas 395 a 440); as seções são de caráter.
 *
 * `GIRAR=1 npm run esboco:nucleo -- <este arquivo> --vista isometrica` gira a máquina 180 graus para os três quartos de trás. */
import carcaca, { RODAS } from './carcaca.esboco.mjs';
import { montarEixoDianteiro } from '../partes/eixo-dianteiro/receita.js';
import { montarEixoTraseiro } from '../partes/eixo-traseiro/receita.js';
import { montarRodaDianteira, TABELA as RODA_DIANTEIRA } from '../partes/roda-dianteira/receita.js';
import { montarRodaTraseira, TABELA as RODA_TRASEIRA } from '../partes/roda-traseira/receita.js';

/* as rodas e os cubos, em mm (x é a distância ao centro da máquina) */
/* o diâmetro e a posição de cada pneu vêm de `RODAS` da carcaça, que corta os poços por elas (a decisão da máquina inteira, de
   2026-11-10: a dianteira de 417 a 667 mm, a traseira de 445 a 653; ALINHAMENTO.md); o aro é o das receitas */
export const RODA_D = { ...RODAS.dianteira, aro: RODA_DIANTEIRA.diametroDoAro / 2 };
export const RODA_T = { ...RODAS.traseira, aro: RODA_TRASEIRA.diametroDoAro / 2 };

/** Monta os eixos e as rodas no estado { passos, topo, origem } da carcaça e devolve as medidas usadas. */
export function montarEixosRodas(estado) {
  /* RODAS DIANTEIRAS: a receita da etapa (`../partes/roda-dianteira/receita.js`, família roda-pneu), uma de cada lado, com o meio do
     pneu no meio da banda de `RODAS.dianteira`; o pneu e as partes de aço com os nomes deste rascunho */
  const D = RODA_D;
  const meioDaBanda = D.xDentro + D.banda / 2;
  for (const lado of [1, -1]) {
    montarRodaDianteira(estado, { centro: [lado * meioDaBanda, D.y, D.z], lado, nomes: { pneu: 'pneusDianteiros', aro: 'arosDianteiros', cubo: 'arosDianteiros', disco: 'arosDianteiros' } });
  }
  /* RODAS TRASEIRAS: a receita da etapa (`../partes/roda-traseira/receita.js`, família roda-pneu), uma de cada lado, com o meio do
     pneu no meio da banda de `RODAS.traseira` */
  const T = RODA_T;
  const meioDaBandaTraseira = T.xDentro + T.banda / 2;
  for (const lado of [1, -1]) {
    montarRodaTraseira(estado, { centro: [lado * meioDaBandaTraseira, T.y, T.z], lado, nomes: { pneu: 'pneusTraseiros', aro: 'arosTraseiros', cubo: 'arosTraseiros', disco: 'arosTraseiros' } });
  }

  /* EIXO DIANTEIRO: a receita da etapa (`../partes/eixo-dianteiro/receita.js`), com a origem dela no centro do cubo dianteiro */
  montarEixoDianteiro(estado, undefined, [0, D.y, D.z]);

  /* EIXO TRASEIRO: a receita da etapa (`../partes/eixo-traseiro/receita.js`), com a origem dela no centro do cubo traseiro */
  montarEixoTraseiro(estado, undefined, [0, RODA_T.y, RODA_T.z]);

  return { RODA_D, RODA_T };
}

/* rodado sozinho: a carcaça inteira (os passos dela, sem o giro) e as partes desta frente por cima */
const base = carcaca.opcoes[0];
const passosDaCarcaca = base.passos.filter((p) => p[0] !== 'rotaciona');
const estado = {
  passos: [...passosDaCarcaca],
  topo: { ...base.topo },
  origem: passosDaCarcaca.reduce((m, [, a]) => Math.max(m, a?.origemId ?? 0), 0),
};
montarEixosRodas(estado);
if (process.env.GIRAR) estado.passos.push(['rotaciona', { eixo: 'y', graus: 180, pivo: [0, 600, -995] }]);

export default {
  plano: 'Eixos e rodas da empilhadeira sobre a carcaça: eixo dianteiro motriz, eixo traseiro direcional e as quatro rodas no chão.',
  vista: 'direita',
  opcoes: [{ titulo: 'carcaça com eixos e rodas', nota: 'rascunho da fatia 3', passos: estado.passos, topo: estado.topo }],
};
