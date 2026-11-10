/* protetor-posto.esboco.mjs — o rascunho do protetor do operador, do posto do operador e dos acessórios da empilhadeira (fatias 5, 6 e
 * 7 do plano), montado sobre a carcaça em rascunho (`carcaca.esboco.mjs`).
 *
 * O módulo exporta `montarProtetorPosto(estado)`, que escreve as partes num estado { passos, topo, origem } como `montarTraseira`;
 * rodado sozinho, ele monta a carcaça inteira (os passos da opção de `carcaca.esboco.mjs`) e as partes daqui por cima.
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
import carcaca from './carcaca.esboco.mjs';

const CINZA_PROTETOR = '#565b60';   // o mesmo cinza das colunas e da tampa do motor
const ESCURO_BANCO = '#2a2d30';
const CLARO = '#b4b8ba';            // o cilindro de gás, cinza claro nas vistas de cima e de trás
const VERMELHO = '#c0302a';         // as lanternas de cima

/* a lateral da máquina inteira levada à carcaça (ver o cabeçalho) */
const ZL = (px) => -(px - 349.8) * 4.2955 + 194.1;
const YL = (py) => (493.6 - py) * 4.2955 + 183.9;

const circulo = (cu, cv, r, n = 48) => Array.from({ length: n }, (_, k) => [cu + r * Math.cos(2 * Math.PI * k / n), cv + r * Math.sin(2 * Math.PI * k / n)]);
const espelhoX = (xy) => xy.map(([x, y]) => [-x, y]);
const retangulo = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
/* o retângulo de cantos redondos, de raio r, com 6 segmentos por canto */
function arredondado(u0, v0, u1, v1, r) {
  const pts = [];
  for (const [cu, cv, a0] of [[u1 - r, v0 + r, -90], [u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180]]) {
    for (let k = 0; k <= 6; k += 1) { const a = (a0 + 15 * k) * Math.PI / 180; pts.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]); }
  }
  return pts;
}

/** O caminho [z, y] com as quinas internas trocadas por arcos de raio `raios[i]` (um por quina), a cada 6 graus. */
function caminhoComCurvas(pts, raios) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]];
    const u1 = [b[0] - a[0], b[1] - a[1]]; const l1 = Math.hypot(...u1); u1[0] /= l1; u1[1] /= l1;
    const u2 = [c[0] - b[0], c[1] - b[1]]; const l2 = Math.hypot(...u2); u2[0] /= l2; u2[1] /= l2;
    const giro = Math.atan2(u1[0] * u2[1] - u1[1] * u2[0], u1[0] * u2[0] + u1[1] * u2[1]);
    const r = raios[i - 1]; const t = r * Math.tan(Math.abs(giro) / 2);
    const ini = [b[0] - u1[0] * t, b[1] - u1[1] * t];
    const s = Math.sign(giro); const n1 = [-u1[1] * s, u1[0] * s];
    const cen = [ini[0] + n1[0] * r, ini[1] + n1[1] * r];
    const a0 = Math.atan2(ini[1] - cen[1], ini[0] - cen[0]);
    const passos = Math.max(2, Math.ceil(Math.abs(giro) / (6 * Math.PI / 180)));
    for (let k = 0; k <= passos; k += 1) { const ang = a0 + giro * k / passos; out.push([cen[0] + r * Math.cos(ang), cen[1] + r * Math.sin(ang)]); }
  }
  out.push(pts[pts.length - 1]);
  return out;
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

/* --- as medidas ---------------------------------------------------------------------------------------------------------------- */
/* PROTETOR. A coluna da frente, pela borda da frente dela na lateral: px 398 na linha 350 e px 460 na linha 110, uma reta de 14,5 graus
   para trás (z = -12,9 a 800,7 mm e -279,2 a 1.831,6 mm). A seção de lado tem 70 mm (18 px nas linhas 275 a 350, onde nada se junta a
   ela), e o eixo dela fica 36 mm atrás da borda. */
const INCL = (-279.2 + 12.9) / (1831.6 - 800.7);                       // dz/dy da coluna da frente: -0,258
const zFrente = (y) => -12.9 + INCL * (y - 800.7);                      // a borda da frente da coluna da frente
const zEixoFrente = (y) => zFrente(y) - 36;
const PE_FRENTE = 788;          // o pé da coluna da frente: a face de cima da aba do paralama (792 mm na carcaça), 4 mm dentro
/* O teto. O topo do quadro na lateral fica na linha 39,5 (y 2.135), sem as lanternas, que sobem à linha 36 (2.149); a ficha dá 2.150
   de altura do protetor e a vista de trás, na escala da largura, 2.097. Adotado: o topo do quadro a 2.135 e as lanternas até 2.150.
   As travessas têm 70 mm de altura (de trás, a travessa de trás ocupa as linhas 42 a 58, 64 mm, e de frente a da frente, 36 a 48). O
   perfil de lado do teto é mais fundo: na lateral ele desce até a linha 80 (y 1.980), 155 mm, com a quina de dentro da frente num
   arco largo até a coluna (px 578 na linha 81, 533 na 84, 519 na 90, 511 na 96, 504 na 102 e 499 na 111). */
const TOPO = 2135; const ALTURA_PERFIL = 70; const Y_TETO = TOPO - 45;
/* O fim de trás do teto: a borda de trás da coluna de trás na lateral vai a px 720 na linha 50 (z -1.396); de cima a travessa de trás
   fica nas colunas 757 a 770 (z -1.423 a -1.476); adotado -1.425 na face de trás da travessa. A frente do teto, pela lateral: a
   borda da frente na linha 50 fica no px 489 (z -405); de cima o quadro plano começa na coluna 497 (z -368). */
const TRAS_TETO = -1425;
/* As larguras (meia largura por fora). Trás: as colunas de trás vão de 406 a 665 na linha 270 (520 mm) e de 418 a 653 no alto, linha
   48 (474 mm); de frente, a coluna da frente vai de 412 a 690 na linha 340 (477 mm) e de 426 a 678 na 145 (432 mm). A ficha dá 960 de
   largura do protetor (480). Adotado: o teto com 480 por fora e 55 de perfil; a coluna de trás com o pé de 460 a 516, dentro da face
   de cima das colunas cinza da carcaça (516); a coluna da frente com o pé de 455 a 512 e o alto na largura do teto, 32 mm para dentro,
   como a vista de frente a inclina (leitura de frente da máquina inteira, rodada 1, B1 e B4), sobre a aba do
   paralama; o painel da carcaça recolhe os cantos da frente a 415 mm de z 10 a -90 para dar lugar a ele (até a integração da máquina
   inteira o pé ficava de 500 a 556, por fora do painel de 496). */
const X_TETO = [425, 480];
const X_PE_TRAS = [460, 516];
const X_PE_FRENTE = [455, 512];
const Y_JUNTA = 1990;   // a altura em que as colunas acabam de se inclinar para dentro e entram no perfil do teto

export function montarProtetorPosto(estado) {
  const { extX, extY, extZ, booleana, parte } = ferramentas(estado);
  const unir = (...s) => booleana('unir', s);
  const cortar = (a, ...s) => booleana('subtrair', [a, ...s]);
  const cruzar = (...s) => booleana('intersectar', s);
  const lados = (fn) => [1, -1].map(fn);
  const emX = (s, [a, b]) => (s > 0 ? [a, b] : [-b, -a]);
  /* gira uma forma já feita em torno do eixo x, pelo pivô [x, y, z] */
  const girarX = (sel, graus, pivo) => { estado.passos.push(['rotaciona', { eixo: 'x', graus, pivo, sel }]); return sel; };

  /* --- protetor: as quatro colunas, o quadro e a grade do teto ------------------------------------------------------------------- */
  /* A coluna da frente e o perfil de lado do teto são um tubo só: a faixa de 70 mm ao longo do caminho que sobe pela coluna, dobra com
     raio de 60 mm (de lado o canto de fora da lateral é quase vivo: px 486 na linha 65 e 489 na 50) e corre no alto até a coluna de
     trás. A inclinação para dentro (o pé por fora do painel, o alto na largura do teto) sai do cruzamento com a seção vista de frente. */
  const caminho = caminhoComCurvas([[zEixoFrente(PE_FRENTE), PE_FRENTE], [zEixoFrente(Y_TETO), Y_TETO], [-1300, Y_TETO]], [60]);
  const ladoFrente = faixa(caminho, 35);
  const secaoFrente = (s) => { const p = [[X_PE_FRENTE[0], PE_FRENTE - 20], [X_PE_FRENTE[1], PE_FRENTE - 20], [X_TETO[1], Y_JUNTA], [X_TETO[1], TOPO + 5], [X_TETO[0], TOPO + 5], [X_TETO[0], Y_JUNTA]]; return s > 0 ? p : espelhoX(p).reverse(); };
  /* O perfil de lado do teto, da dobra até a coluna de trás, pelo contorno da lateral (ver as medidas do teto): a borda de baixo com a
     quina de dentro em arco, o topo com o canto de fora redondo (px 490 na linha 48, 503 na 45, 523 na 42 e 537 na 39,5). */
  const perfilTeto = [[ZL(678), YL(80)], [ZL(578), YL(81)], [ZL(533), YL(84)], [ZL(525), YL(87)], [ZL(519), YL(90)], [ZL(514), YL(93)],
    [ZL(511), YL(96)], [ZL(504), YL(102)], [ZL(499), YL(111)], [zFrente(YL(111)) - 5, YL(111)], [ZL(478), YL(75)], [ZL(486), YL(60)],
    [ZL(490), YL(50)], [ZL(503), YL(45)], [ZL(523), TOPO - 8], [ZL(537), TOPO], [ZL(678), TOPO]];
  /* A coluna de trás, uma chapa larga de lado que se afina para cima (na lateral, a borda de trás vai de px 749 na linha 275 a 726 na
     95 e 720 na 50; a da frente, de 690 na 260 a 678 na 95), apoiada na face de cima das colunas cinza da carcaça (y 1.143 a 1.154, de
     z -1.269 a -1.508). O canto de cima e de trás é redondo, com 40 mm. */
  const ladoTras = [[-1272, 1138], [-1505, 1138], [ZL(741), YL(200)], [ZL(732), YL(140)], [ZL(726), YL(95)], [ZL(722), YL(65)],
    ...Array.from({ length: 7 }, (_, k) => { const a = Math.PI + Math.PI / 2 * k / 6; return [TRAS_TETO + 40 + 40 * Math.cos(a), TOPO - 40 - 40 * Math.sin(a)]; }),
    [-1215, TOPO], [ZL(678), YL(95)], [ZL(681), YL(140)], [ZL(689), YL(200)], [ZL(690), YL(260)]];
  const secaoTras = (s) => { const p = [[X_PE_TRAS[0], 1120], [X_PE_TRAS[1], 1120], [X_TETO[1], Y_JUNTA], [X_TETO[1], TOPO + 5], [X_TETO[0], TOPO + 5], [X_TETO[0], Y_JUNTA]]; return s > 0 ? p : espelhoX(p).reverse(); };
  const quadros = lados((s) => unir(
    cruzar(extX(ladoFrente, ...emX(s, [380, 600])), extZ(secaoFrente(s), -1400, 100)),
    extX(perfilTeto, ...emX(s, X_TETO)),
    cruzar(extX(ladoTras, ...emX(s, [380, 600])), extZ(secaoTras(s), -1600, -1100)),
  ));
  /* as travessas do teto: a da frente sobre a dobra (de frente, o perfil de cima vai de lado a lado nas linhas 36 a 48) e a de trás,
     que leva as lanternas (de trás, linhas 42 a 58) */
  const zDobra = zEixoFrente(Y_TETO);
  const travessas = [extX(retangulo(zDobra - 80, TOPO - ALTURA_PERFIL, zDobra - 5, TOPO), -X_TETO[0] - 1, X_TETO[0] + 1),
    extX(retangulo(TRAS_TETO, TOPO - ALTURA_PERFIL, TRAS_TETO + 75, TOPO), -X_TETO[0] - 1, X_TETO[0] + 1)];
  parte('protetor', unir(...quadros, ...travessas), CINZA_PROTETOR);

  /* A grade do teto: seis barras ao comprido, nas linhas 185, 220, 255, 290, 325 e 360 da vista de cima (35 px, 135 mm, entre elas) e
     nas colunas 464 a 603 da de trás (27 px, 108 mm); adotado 120 mm, simétricas. Duas barras atravessadas, nas colunas 607 e 645 da
     vista de cima (z -814 e -969). Barras de 30 mm, de 2.095 a 2.130 mm, apoiadas nas travessas e no perfil do teto. */
  const Z_GRADE = [zDobra - 75, TRAS_TETO + 70];
  const barras = [60, 180, 300].flatMap((x) => [x, -x]).map((x) => extX(retangulo(Z_GRADE[1], TOPO - 40, Z_GRADE[0], TOPO - 5), x - 15, x + 15));
  const atravessadas = [-814, -969].map((z) => extX(retangulo(z - 15, TOPO - 40, z + 15, TOPO - 5), -X_TETO[0] - 1, X_TETO[0] + 1));
  parte('gradeTeto', unir(...barras, ...atravessadas), CINZA_PROTETOR);

  /* As luzes de trabalho: na lateral, px 437 a 462 nas linhas 84 a 130 (z -181 a -288, y 1.745 a 1.943), à frente da coluna da
     frente; de frente, colunas 415 a 440 e 663 a 690 nas linhas 84 a 126, sobre a coluna. Uma caixa de 90 mm de largura e de lado,
     de 1.750 a 1.940, com a face de trás na face da frente da coluna (inclinada como ela), de 445 a 530 mm: centrada na borda de fora
     da coluna, que ali vai de 433 a 489 mm. Na primeira rodada, de 415 a 505, ela ficava sobre a coluna de frente; na segunda, de 470
     a 555, passava toda para fora e aparecia de trás, onde a referência a esconde atrás da coluna de trás. */
  const ladoLuz = [[zFrente(1750) - 3, 1750], [zFrente(1940) - 3, 1940], [zFrente(1940) + 90, 1940], [zFrente(1750) + 90, 1750]];
  parte('luzesTrabalho', unir(...lados((s) => extX(ladoLuz, ...emX(s, [445, 530])))), ESCURO);
  /* As lanternas do alto, na face de trás da travessa de trás: de trás, linhas 44 a 57, colunas 434 a 485 e 586 a 631 (205 a 410 mm
     do centro), dentro da altura da travessa (a primeira rodada as pôs acima dela, e de trás sobravam por cima); de lado, px 720 a
     736 nas linhas 36 a 68. */
  parte('lanternas', unir(...lados((s) => extX(retangulo(TRAS_TETO - 18, TOPO - 60, TRAS_TETO + 2, TOPO - 5), ...emX(s, [205, 410])))), VERMELHO);
  /* O espelho, do lado esquerdo (+x): na lateral px 484 a 501 nas linhas 117 a 155 (z -382 a -455, y 1.637 a 1.801); de trás,
     colunas 430 a 447 (356 a 426 mm). Preso à face de trás da coluna da frente por um braço. */
  parte('espelho', unir(extX(retangulo(-455, 1640, -385, 1800), 356, 426),
    extX(retangulo(-395, 1705, zFrente(1720) - 66, 1730), 400, 440)), ESCURO);
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
