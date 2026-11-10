/* protetor-posto.esboco.mjs — o rascunho do protetor do operador, do posto do operador e dos acessórios da empilhadeira (fatias 5, 6 e
 * 7 do plano), montado sobre a carcaça em rascunho (`carcaca.esboco.mjs`).
 *
 * O módulo exporta `montarProtetorPosto(estado)`, que escreve as partes num estado { passos, topo, origem } como `montarTraseira`;
 * rodado sozinho, ele monta a carcaça inteira (os passos da opção de `carcaca.esboco.mjs`) e as partes daqui por cima. O protetor
 * (fatia 5) é a receita da etapa, `../partes/protetor/receita.js`, chamada daqui; o posto e os acessórios continuam neste rascunho.
 *
 * DE ONDE VEM CADA MEDIDA.
 *   Lado: `lateral.contornos.json` (4,437 mm/px, z da lateral para trás). Na lateral o cubo dianteiro fica em z 200,5 e y 189,5 e o
 *   traseiro em z 1.956,5 (centros das caixas dos dois pneus), com o chão em y -190; o entre-eixos dela é 1.756, contra os 1.700 da
 *   carcaça. A lateral entra então na escala da carcaça por k = 1.700 / 1.756 = 0,968, com o cubo dianteiro em z 0 e o chão em y 0:
 *   Z(px) = -(px - 349,8) x 4,2955 + 194,1 e Y(py) = (493,6 - py) x 4,2955 + 183,9, em px da imagem da lateral (as funções ZL e YL).
 *   Conferido na carcaça: a ponta do capô da lateral cai em z -2.176 (carcaça -2.178) e o topo da tampa em y 1.150 (carcaça 1.150).
 *   Trás: `tras.ia.png`, medida por cor linha a linha; a largura pelo capô (laranja das colunas 388 a 684 nas linhas 366 a 396, 297 px
 *   para 1.193 mm, 4,02 mm/px, centro na coluna 536). A altura dessa vista não casa com a largura (a perspectiva da IA), e dela só se
 *   tira largura.
 *   Cima: `cima.ia.png` (frente à esquerda), medida por cor coluna a coluna; a largura pelo capô (laranja das linhas 143 a 453 na
 *   coluna 860, 3,85 mm/px, centro na linha 298) e o comprimento pela régua da carcaça: z = 188 - (coluna - 360) x 4,058 (a frente do
 *   paralama na coluna 360 e a ponta do capô na 943, as mesmas da vista de cima da carcaça).
 *   Frente: `frente.ia.png`; a largura pelo paralama (laranja das colunas 368 a 721 na linha 355, 353 px para 1.212 mm, 3,43 mm/px).
 * Eixos: x lateral (+x é a esquerda de quem dirige), y altura com o chão em 0, z comprimento com a frente em +z e o eixo dianteiro em 0.
 *
 * `GIRAR=1 npm run esboco:nucleo -- <este arquivo> --vista isometrica` gira o conjunto 180 graus para os três quartos de trás. */
import { ferramentas, CINZA, ESCURO } from './carcaca-traseira.esboco.mjs';
import { montarProtetor, derivar as derivarProtetor } from '../partes/protetor/receita.js';
import carcaca from './carcaca.esboco.mjs';

const ESCURO_BANCO = '#2a2d30';
const CLARO = '#b4b8ba';            // o cilindro de gás, cinza claro nas vistas de cima e de trás

const circulo = (cu, cv, r, n = 48) => Array.from({ length: n }, (_, k) => [cu + r * Math.cos(2 * Math.PI * k / n), cv + r * Math.sin(2 * Math.PI * k / n)]);
const retangulo = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
/* o retângulo de cantos redondos, de raio r, com 6 segmentos por canto */
function arredondado(u0, v0, u1, v1, r) {
  const pts = [];
  for (const [cu, cv, a0] of [[u1 - r, v0 + r, -90], [u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180]]) {
    for (let k = 0; k <= 6; k += 1) { const a = (a0 + 15 * k) * Math.PI / 180; pts.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]); }
  }
  return pts;
}

/** A faixa de largura 2h em volta do caminho [z, y]: a seção constante de um tubo ou perfil ao longo dele, vista de lado. */
function faixa(caminho, h) {
  const esq = []; const dir = [];
  caminho.forEach((p, i) => {
    const a = caminho[Math.max(0, i - 1)]; const b = caminho[Math.min(caminho.length - 1, i + 1)];
    const t = [b[0] - a[0], b[1] - a[1]]; const l = Math.hypot(...t);
    const n = [-t[1] / l, t[0] / l];
    esq.push([p[0] + n[0] * h, p[1] + n[1] * h]); dir.push([p[0] - n[0] * h, p[1] - n[1] * h]);
  });
  return [...esq, ...dir.reverse()];
}

/* --- o protetor ---------------------------------------------------------------------------------------------------------------- */
/* AS QUATRO COLUNAS, O QUADRO E A GRADE DO TETO, AS LUZES DE TRABALHO, AS LANTERNAS E O ESPELHO MORAM NA RECEITA DA ETAPA (2026-11-10),
   `../partes/protetor/receita.js` (`montarProtetor`), com as medidas e a fonte de cada uma na TABELA dela; este módulo só a chama
   sobre o estado da máquina, e a alça de acesso (fatia 7) e o encosto tiram dela a coluna da frente e a calibração da lateral. A
   forma é a deste rascunho, com os pés cortados pelo plano do apoio na carcaça (a face de cima da aba do paralama e a das colunas),
   onde antes entravam nela. */
const PROTETOR = derivarProtetor();
const { ZL, YL, zEixoFrente } = PROTETOR;

export function montarProtetorPosto(estado) {
  const { extX, extY, extZ, booleana, parte } = ferramentas(estado);
  const unir = (...s) => booleana('unir', s);
  const cortar = (a, ...s) => booleana('subtrair', [a, ...s]);
  const cruzar = (...s) => booleana('intersectar', s);
  const lados = (fn) => [1, -1].map(fn);
  const emX = (s, [a, b]) => (s > 0 ? [a, b] : [-b, -a]);
  /* gira uma forma já feita em torno do eixo x, pelo pivô [x, y, z] */
  const girarX = (sel, graus, pivo) => { estado.passos.push(['rotaciona', { eixo: 'x', graus, pivo, sel }]); return sel; };
  /* --- protetor: a receita da etapa, no referencial da máquina ------------------------------------------------------------------ */
  montarProtetor(estado);

  /* A alça de acesso, atrás de cada coluna da frente: na lateral a coluna engrossa das linhas 265 a 110 (y 1.166 a 1.831) até px 486
     na linha 140, 60 mm atrás da face de trás dela. Um tubo de 30 mm paralelo à coluna, com dois braços até ela. */
  const alcaY = [1180, 1820];
  const zAlca = (y) => zEixoFrente(y) - 35 - 75;
  const ladoAlca = faixa([[zAlca(alcaY[0]), alcaY[0]], [zAlca(alcaY[1]), alcaY[1]]], 15);
  const bracos = alcaY.map((y) => [[zAlca(y) + 10, y - 15], [zEixoFrente(y), y - 15], [zEixoFrente(y), y + 15], [zAlca(y) + 10, y + 15]]);
  const xAlca = [450, 485];   // dentro da largura da coluna, que com o pé de 455 a 512 vai de 440 a 500 ali
  parte('alcas', unir(...lados((s) => unir(extX(ladoAlca, ...emX(s, xAlca)), ...bracos.map((b) => extX(b, ...emX(s, xAlca)))))), ESCURO);

  /* --- posto do operador ---------------------------------------------------------------------------------------------------------- */
  /* O assento: na lateral (região `banco`), a almofada vai do px 564 ao 677 (z -726 a -1.211) com o topo na linha 270 (y 1.143); a
     base segue a face de cima da tampa do motor da carcaça (y 1.002 em z -789, 1.009 em -1.111, 1.026 em -1.172, 1.052 em -1.230). De
     cima, o assento escuro vai das linhas 232 a 365 (512 mm): 500 mm de largura. Cantos de 40 mm de lado e de 60 em planta. */
  const baseTampa = [[-1210, 1044], [-1172, 1024], [-1111, 1007], [-789, 1000], [-725, 1000]];
  const ladoAssento = [...baseTampa, ...arredondado(-1210, 1060, -725, 1143, 40).filter(([, y]) => y > 1100)];
  const assento = cruzar(extX(ladoAssento, -250, 250), extY(arredondado(-250, -1210, 250, -725, 60), 990, 1150),
    extZ(arredondado(-250, 980, 250, 1143, 40), -1215, -720));
  parte('assento', assento, ESCURO_BANCO);
  /* O encosto: na lateral, da linha 256 (y 1.204: px 649 a 682) à 186 (y 1.505: px 681 a 685), com a frente curva (px 641 na linha 226 e
     662 na 196) e a costa quase reta (688 a 690). Fica atrás da almofada, sobre ela, e à frente das colunas de trás, que estão de 425
     a 516 mm para os lados. 480 mm de largura. */
  const ladoEncosto = [[-1245, 1135], [-1120, 1135], [ZL(649), YL(256)], [ZL(641), YL(226)], [ZL(645), YL(210)], [ZL(662), YL(196)],
    [ZL(675), YL(188)], [ZL(685), YL(188)], [ZL(690), YL(200)], [-1255, YL(240)], [-1252, 1160]];
  const encosto = cruzar(extX(ladoEncosto, -240, 240), extZ(arredondado(-240, 1110, 240, 1510, 60), -1300, -1000));
  parte('encosto', encosto, ESCURO_BANCO);

  /* A coluna de direção e o volante. De lado (região `volante`) o aro é uma barra inclinada do px 475 ao 540 entre as linhas 185 e 228,
     35 graus sobre a horizontal, com o centro em px 505 e linha 208 (z -473, y 1.410), e 76 px de corda: 330 mm. A TABELA não traz o
     diâmetro do volante; adotado 340. A coluna sai da face de cima do painel (y 915, de z 0 a -181) em z -110 e vai ao cubo do volante:
     36 graus para trás da vertical, perpendicular ao aro. Ela é montada de pé no pivô e girada em torno de x. */
  const PIVO = [0, 905, -110];
  const L = Math.hypot(-473 + 110, 1410 - 915);
  const GRAUS = -Math.atan2(473 - 110, 1410 - 915) * 180 / Math.PI;
  const yCubo = 915 + L;
  const capa = extY(arredondado(-55, -165, 55, -55, 20), 880, 915 + 380);
  const eixo = extY(circulo(0, -110, 22, 24), 915 + 370, yCubo - 10);
  const coluna = unir(capa, eixo);
  girarX(coluna, GRAUS, PIVO);
  parte('colunaDirecao', coluna, ESCURO);
  const aro = cortar(extY(circulo(0, -110, 170, 64), yCubo - 15, yCubo + 15), extY(circulo(0, -110, 145, 64), yCubo - 20, yCubo + 20));
  const cubo = extY(circulo(0, -110, 45, 32), yCubo - 25, yCubo + 25);
  const raios = [90, 210, 330].map((a) => {
    const c = Math.cos(a * Math.PI / 180); const s = Math.sin(a * Math.PI / 180);
    return extY([[-12, 40], [12, 40], [12, 155], [-12, 155]].map(([u, v]) => [u * c - v * s, -110 + u * s + v * c]), yCubo - 8, yCubo + 8);
  });
  const volante = unir(aro, cubo, ...raios);
  girarX(volante, GRAUS, PIVO);
  parte('volante', volante, ESCURO);

  /* Os pedais, na rampa do painel (a face de cima dele desce de z -181 a 915 mm a z -404 a 763): na lateral, px 448 a 486 nas linhas 331
     a 362 (z -228 a -391). Sapatas de 140 mm ao longo da rampa e 22 de espessura, 8 mm acima dela, com uma haste até a face: o
     acelerador à direita (-x) e o freio e a aproximação à esquerda. */
  const A = [-181, 915]; const B = [-404, 763];
  const lr = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const u = [(B[0] - A[0]) / lr, (B[1] - A[1]) / lr]; const n = [u[1] * -1, u[0]].map((v) => -v);   // n aponta para cima e para trás
  const naRampa = (s, t) => [A[0] + u[0] * s + n[0] * t, A[1] + u[1] * s + n[1] * t];
  const sapata = [naRampa(70, 8), naRampa(210, 8), naRampa(210, 30), naRampa(70, 30)];
  const haste = [naRampa(130, -6), naRampa(150, -6), naRampa(150, 9), naRampa(130, 9)];
  const pedal = (x0, x1) => unir(extX(sapata, x0, x1), extX(haste, (x0 + x1) / 2 - 10, (x0 + x1) / 2 + 10));
  parte('pedais', unir(pedal(-200, -120), pedal(40, 130), pedal(150, 230)), ESCURO);

  /* As alavancas do sistema hidráulico, à direita do volante, na face de cima do painel: de cima, colunas 435 a 465 nas linhas 230 a
     260 (x -146 a -262, z -116 a -238). Três hastes de 14 mm, de pé, de 905 a 1.130 mm, com o manípulo. */
  const alavancas = [-160, -205, -250].map((x) => unir(extY(retangulo(x - 7, -167, x + 7, -153), 905, 1130),
    extY(arredondado(x - 18, -178, x + 18, -142, 8), 1110, 1165)));
  parte('alavancas', unir(...alavancas), ESCURO);

  /* --- acessórios --------------------------------------------------------------------------------------------------------------- */
  /* O cilindro de gás, deitado de través sobre a tampa do capô, atrás das colunas de trás. A máquina das vistas o tem: de trás, cinza
     claro das colunas 450 a 618 (675 mm) e das linhas 190 a 270 (320 mm), centrado; de cima, das colunas 820 a 900 (z -1.679 a -2.003:
     324 mm de diâmetro, centro em z -1.841) e das linhas 185 a 375 (731 mm, centro em x -69, com a válvula do lado -x); de lado (região
     `cilindro`), centro em y 1.359. TABELA: 320 x 700. Adotado: 320 mm de diâmetro, 700 do fim da cúpula ao fim da válvula, centro em z
     -1.840, y 1.345 e x 30 (o conjunto, da cúpula à válvula, centrado em x -10), com a cúpula do lado da válvula larga (raio 135, de trás ela ocupa 75 px de 340) (a vista de trás o dá centrado e a de cima, 69 mm para -x; com o centro do corpo em -35 e em -10 ele
     saía de trás 45 a 50 mm para o lado do escape). */
  const CG = { x: 30, y: 1345, z: -1840, r: 160 };
  const corpoGas = unir(
    extX(circulo(CG.z, CG.y, CG.r, 48), CG.x - 300, CG.x + 290),
    extX(circulo(CG.z, CG.y, 125, 48), CG.x + 280, CG.x + 315),
    extX(circulo(CG.z, CG.y, 135, 48), CG.x - 345, CG.x - 290),
    extX(circulo(CG.z, CG.y, 35, 24), CG.x - 385, CG.x - 335),
  );
  parte('cilindroGlp', corpoGas, CLARO);
  /* As cintas: de trás, as faixas escuras nas colunas 497 a 510 e 553 a 565; de cima, nas linhas 255 e 317. Adotado: duas, a 120 mm do
     meio do cilindro, de 40 mm, só pela metade de cima (a de baixo some no berço). */
  const XC = [CG.x - 120, CG.x + 120];
  const cinta = (xc) => cruzar(cortar(extX(circulo(CG.z, CG.y, CG.r + 10, 48), xc - 20, xc + 20), extX(circulo(CG.z, CG.y, CG.r - 1, 48), xc - 25, xc + 25)),
    extX(retangulo(CG.z - 300, 1250, CG.z + 300, 1600), xc - 25, xc + 25));
  parte('cintas', unir(...XC.map(cinta)), ESCURO);
  /* O berço: a chapa na face de cima da tampa do capô (y 1.150) e dois apoios em V sob as cintas, que sobem a 1.260 e recebem o
     cilindro pelo círculo dele. */
  const chapa = extX(retangulo(CG.z - 150, 1146, CG.z + 150, 1162), CG.x - 260, CG.x + 260);
  const apoios = XC.map((xc) => cortar(extX(retangulo(CG.z - 175, 1150, CG.z + 175, 1262), xc - 25, xc + 25),
    extX(circulo(CG.z, CG.y, CG.r, 48), xc - 30, xc + 30)));
  parte('berco', unir(chapa, ...apoios), CINZA);

  /* O escape, atrás da coluna de trás do lado direito (-x): na lateral px 742 a 766 (z -1.490 a -1.593) da linha 272 (y 1.135, a tampa
     do capô) à 98 (y 1.882), e a ponta curva para trás até a linha 58 (y 2.055, px 750 a 772); de trás, colunas 623 a 640 (350 a 418
     mm). Um tubo de 90 mm de pé na face de cima da tampa, de 1.148 a 1.990, e a ponta de 100 mm inclinada 35 graus para trás. O eixo
     fica em x -355 e z -1.567: em -370 e -1.545 o pé saía 14 mm da tampa vista de cima, pela frente dela (z -1.512) e pelo lado
     (409 mm), medido com `sobra:partes` (escape em tampa). */
  const escape = extY(circulo(-355, -1567, 45, 32), 1146, 1990);
  const ponta = extY(circulo(-355, -1567, 40, 32), 1950, 2070);
  girarX(ponta, -35, [-355, 1960, -1567]);
  parte('escape', unir(escape, ponta), ESCURO);
}

/* --- a carcaça mais as partes daqui ------------------------------------------------------------------------------------------------- */
const base = carcaca.opcoes[0];
const passosDaCarcaca = base.passos.filter(([op, a]) => !(op === 'rotaciona' && !a.sel));
const maiorId = passosDaCarcaca.reduce((m, [, a]) => Math.max(m, a?.origemId ?? 0), 0);
const estado = { passos: [...passosDaCarcaca], topo: { ...base.topo }, origem: maiorId };
montarProtetorPosto(estado);
if (process.env.GIRAR) estado.passos.push(['rotaciona', { eixo: 'y', graus: 180, pivo: [0, 1000, -995] }]);

export default {
  plano: 'Protetor do operador, posto do operador e acessórios da empilhadeira sobre a carcaça em rascunho, pelas vistas de IA e pela lateral.',
  vista: 'direita',
  opcoes: [{ titulo: 'carcaça com protetor, posto e acessórios', nota: 'rascunho das fatias 5, 6 e 7', passos: estado.passos, topo: estado.topo }],
};
