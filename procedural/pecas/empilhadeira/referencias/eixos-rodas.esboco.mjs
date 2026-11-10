/* eixos-rodas.esboco.mjs — o rascunho dos eixos e das rodas da empilhadeira (fatia 3): o eixo dianteiro motriz com o diferencial e os
 * dois cubos, o eixo traseiro direcional com a viga, as mangas, os cubos e a barra de direção, e as quatro rodas (pneu e aro), sobre
 * a carcaça de `carcaca.esboco.mjs`. Rodado sozinho, monta a carcaça inteira mais estas partes.
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
import { ferramentas, CINZA, CINZA_CLARO, ESCURO } from './carcaca-traseira.esboco.mjs';

const PRETO_PNEU = '#1a1b1d';
const LADOS = 48;

/* as rodas e os cubos, em mm (x é a distância ao centro da máquina) */
/* o diâmetro e a posição de cada pneu vêm de `RODAS` da carcaça, que corta os poços por elas (a decisão da máquina inteira, de
   2026-11-10: a dianteira de 417 a 667 mm, a traseira de 445 a 653; ALINHAMENTO.md); o aro e o disco são daqui */
export const RODA_D = { ...RODAS.dianteira, aro: 160, disco: [463, 478], furo: 55 };
export const RODA_T = { ...RODAS.traseira, aro: 120, disco: [550, 565], furo: 55 };
const CHAPA = [266, 327];         // as chapas do chassi em x (PLACA de carcaca.esboco.mjs)

/* A seção do pneu em [raio, a], com a de 0 (face de dentro) a b (face de fora): o talão no aro, o flanco abaulado e o ombro
   arredondado (raio de cerca de 55 mm) até a banda plana. A seção é a mesma nas duas rodas, levada ao raio de cada uma. */
function secaoDoPneu(R, aro, b) {
  const h = R - aro;                                   // altura do flanco
  const f = (t) => aro + h * t;                        // a fração t da altura do flanco
  const lado = [[aro, 16], [f(0.04), 6], [f(0.17), 1.5], [f(0.45), 0], [f(0.7), 3], [f(0.82), 10], [f(0.9), 20], [f(0.95), 32],
    [f(0.985), 46], [R, 62]];
  const espelho = [...lado].reverse().map(([r, a]) => [r, b - a]);
  return [...lado, ...espelho, lado[0]];
}

/* O aro com o disco, em [raio, a]: a calha do aro de `aro - 18` a `aro`, de 8 mm a b - 8, e o disco com o furo do cubo entre d0 e d1. */
function secaoDoAro(aro, b, d0, d1, furo) {
  const c = aro - 18;
  if (d0 <= 8) return [[furo, d0], [aro, d0], [aro, b - 8], [c, b - 8], [c, d1], [furo, d1], [furo, d0]];
  return [[furo, d0], [c, d0], [c, 8], [aro, 8], [aro, b - 8], [c, b - 8], [c, d1], [furo, d1], [furo, d0]];
}

/** Monta os eixos e as rodas no estado { passos, topo, origem } da carcaça e devolve as medidas usadas. */
export function montarEixosRodas(estado) {
  const { extX, extY, extZ, booleana, parte } = ferramentas(estado);
  const unir = (...s) => booleana('unir', s);
  const novo = () => { estado.origem += 1; return estado.origem; };
  /* revolução em torno de x: o perfil é [raio, x] e `em` leva o eixo a [0, y, z] */
  function torno(perfil, y, z) {
    const id = novo();
    estado.passos.push(['lathe', { origemId: id, perfil: perfil.map(([r, a]) => [Math.round(r * 10) / 10, Math.round(a * 10) / 10]), eixo: 'x', lados: LADOS, em: [0, y, z] }]);
    return { origem: { op: 'lathe', id } };
  }
  /* a cópia do outro lado, pelo espelho em x = 0 */
  function espelho(sel) {
    const id = novo();
    estado.passos.push(['espelha', { origemId: id, eixo: 'x', pos: 0, derivaDe: sel.origem, sel: { origem: sel.origem } }]);
    return { origem: { op: 'espelha', id, de: sel.origem } };
  }
  const par = (sel) => unir(sel, espelho(sel));
  const circulo = (cx, cy, r, n = 32) => Array.from({ length: n }, (_, k) => [cx + r * Math.cos(2 * Math.PI * k / n), cy + r * Math.sin(2 * Math.PI * k / n)]);

  /* RODAS ------------------------------------------------------------------------------------------------------------------- */
  for (const [nome, R] of [['Dianteiros', RODA_D], ['Traseiros', RODA_T]]) {
    const pneu = secaoDoPneu(R.raio, R.aro, R.banda).map(([r, a]) => [r, R.xDentro + a]);
    const aro = secaoDoAro(R.aro, R.banda, R.disco[0] - R.xDentro, R.disco[1] - R.xDentro, R.furo).map(([r, a]) => [r, R.xDentro + a]);
    parte(`pneus${nome}`, par(torno(pneu, R.y, R.z)), PRETO_PNEU);
    parte(`aros${nome}`, par(torno(aro, R.y, R.z)), CINZA_CLARO);
  }

  /* EIXO DIANTEIRO ---------------------------------------------------------------------------------------------------------- */
  /* a carcaça do eixo: o tubo de Ø 150 de flange a flange (404 mm) e o bojo do diferencial no meio. Passa pelo entalhe das chapas
     do chassi (o contorno lateral `chassi` contorna o cubo: parede da frente em z 98 a 100, de y 338 a 426, e o teto do entalhe pelos
     vértices (87,3, 437,6), (60,5, 429) e (27,3, 462,8)). O assento de cada lado, na espessura da chapa (266 a 327 mm, 4 mm para dentro de cada face), sobe do tubo até 0,5 mm desse
     teto: é a face pela qual o eixo se apoia no chassi. Rente ao teto, a face inclinada coincidente saía no relato de contatos como
     travessia (com a profundidade da caixa, 76 mm); com 0,5 mm sai como folga. */
  const D = RODA_D;
  const assento = [[30, 380], [72, 380], [72, 432.2], [60.5, 428.5], [30, 459.5]];
  parte('eixoDianteiro', unir(
    torno([[0, -404], [75, -404], [75, -190], [150, -120], [150, 120], [75, 190], [75, 404], [0, 404]], D.y, D.z),
    extX(assento, CHAPA[0] + 4, CHAPA[1] - 4), extX(assento, -CHAPA[1] + 4, -CHAPA[0] - 4),
  ), ESCURO);
  /* o cubo: o flange de Ø 220 de 404 a 463 mm (o disco da roda assenta na face de fora dele) e a tampa de Ø 100 até 516 mm, que
     passa pelo furo do disco */
  parte('cubosDianteiros', par(torno([[0, 404], [110, 404], [110, D.disco[0]], [50, D.disco[0]], [50, 516], [0, 516]], D.y, D.z)), CINZA);

  /* EIXO TRASEIRO ----------------------------------------------------------------------------------------------------------- */
  const T = RODA_T;
  const PINO_X = 400;                  // o pino vertical da manga (o eixo do esterço), por dentro do pneu
  /* a viga: seção de 120 x 100 mm, de pino a pino (a ponta encosta no pino da manga), com o olhal do pino de articulação no meio
     (cilindro ao longo de z, Ø 140, de z -1810 a -1590) */
  const viga = unir(
    extX([[T.z + 60, T.y - 50], [T.z - 60, T.y - 50], [T.z - 60, T.y + 50], [T.z + 60, T.y + 50]], -PINO_X + 40, PINO_X - 40),
    extZ(circulo(0, T.y, 70), T.z - 110, T.z + 110),
  );
  parte('eixoTraseiro', viga, ESCURO);
  /* o suporte do pino de articulação: o bloco que desce do fundo do poço traseiro da carcaça (a face de baixo dele, a 428 mm, de z
     -1342 a -1645) até o topo do olhal (354 mm), à frente da viga. É por ele que o eixo traseiro se prende na carcaça. */
  parte('suporteTraseiro', extZ([[-90, T.y + 70], [90, T.y + 70], [90, 428], [-90, 428]], -1640, -1595), CINZA);
  /* a manga: o pino vertical (Ø 80, de 189 a 379 mm), a ponta de eixo até o cubo e o braço que leva à barra de direção, à frente
     da viga */
  const manga = unir(
    extY(circulo(PINO_X, T.z, 40), T.y - 95, T.y + 95),
    torno([[0, PINO_X], [45, PINO_X], [45, 480], [0, 480]], T.y, T.z),
    extY([[PINO_X - 25, T.z + 20], [PINO_X + 20, T.z + 20], [PINO_X + 20, T.z + 165], [PINO_X - 25, T.z + 165]], T.y - 20, T.y + 20),
  );
  parte('mangas', par(manga), ESCURO);
  /* o cubo: o flange de Ø 170 de 480 mm até o disco da roda e a tampa de Ø 100 até 625 mm */
  parte('cubosTraseiros', par(torno([[0, 480], [85, 480], [85, T.disco[0]], [50, T.disco[0]], [50, 625], [0, 625]], T.y, T.z)), CINZA);
  /* a barra de direção: tubo de Ø 44 de braço a braço (encosta na face de dentro de cada braço, a 375 mm), 140 mm à frente do eixo */
  parte('barraDirecao', torno([[0, -PINO_X + 25], [22, -PINO_X + 25], [22, PINO_X - 25], [0, PINO_X - 25]], T.y, T.z + 140), CINZA);

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
