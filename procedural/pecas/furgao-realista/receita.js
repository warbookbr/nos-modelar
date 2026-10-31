/* furgao-realista — furgão médio de teto alto com cabine de bico curto, na etapa 2 de 7 da modelagem (plano
 * docs/modelar/planos/2026-10-30-furgao-realista.md, alinhamento no banco de provas furgao-realista-2026-10-30): a lataria
 * detalhada. Sobre a chapa contínua da etapa 1 (silhueta, raios e painéis da prancha cotada referencias/quatro-vistas.prancha.png,
 * aceitos pela pessoa), esta etapa desenha as frestas das portas (as duas dianteiras da cabine, a de correr do lado direito e as
 * duas traseiras de abrir), o vinco de cintura discreto ao longo da lateral, as nervuras longitudinais do teto alto e a aba leve dos
 * quatro arcos das rodas, e abre na chapa os vãos do para-brisa, dos vidros das portas da cabine e dos das portas traseiras, cada um
 * com a aba dobrada para dentro conferida como moldura. As quatro rodas provisórias da etapa 1 ficam. O corpo de baixo, os
 * para-choques, as rodas da família, os vidros e borrachas, as luzes e o acabamento vêm nas etapas 3 a 7.
 *
 * Origem: a peça nasceu como cópia do `furgao` do acervo, recriado em primitivas do núcleo a partir do modelo "van" do pacote A, de
 * autor A (pacote A, endereço omitido, endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no
 * License.txt do pacote). A malha de origem NÃO está no repositório. Da cópia não sobra forma: as medidas agora são as de classe do
 * alinhamento, desenhadas na prancha, e o `furgao` fica só como referência de caráter (referencias/fonte-vistas.png).
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do furgão em +z, x para a direita de quem olha o furgão de frente
 * (o lado direito do furgão é o -x), centrado em x e em z no comprimento total. A TABELA é em milímetro e é a única fonte das
 * medidas; `derivar` calcula a gaiola, as voltas das portas e dos vãos e as rodas, e `gerarPassos` escreve, por parte, a forma, a
 * `parte` e o `material`. A conversão para metro está em `m`, num lugar só. Nenhuma posição é digitada no passo.
 *
 * Como a chapa é feita. A carroceria é uma superfície por subdivisão (`subdivisao`) de uma gaiola de faces escrita aqui e fechada
 * numa chapa pela espessura. A gaiola é a da etapa 1 refeita para caber as portas: anéis horizontais que dão a volta na planta (a
 * frente, a quina da frente, a lateral, a quina de trás e a traseira), os anéis do ombro que sobem os raios do teto, e a cobertura do
 * teto plano. Cada ponto de anel tem o nome da coluna a que pertence, e as faces entre dois anéis vizinhos ligam as colunas que os
 * dois têm: onde a forma é curva (a frente, as quinas, o ombro) as colunas são as mesmas em todos os anéis e as faces são
 * quadriláteros; na lateral, que é plana do arco ao ombro, uma coluna pode começar e acabar entre dois anéis, e a face ali tem mais
 * lados, sem mudar a forma, porque toda face com os pontos num plano subdivide no mesmo plano. Por isso a lateral tem colunas
 * verticais nas linhas das portas, e em volta de cada arco de roda um arco de raio 475 (o da porta da cabine, 55 mm fora do arco),
 * com os anéis de baixo concêntricos ao arco e os de cima terminando nele.
 *
 * As frestas. Cada porta é uma volta de arestas da gaiola na linha da prancha. Os pontos da volta se dividem, para cada lado, num
 * ponto de borda afastado meia fresta pela superfície e baixado para dentro, e num ponto de dentro, na superfície, com uma tira de
 * faces entre os dois: a porta vira um pedaço solto da mesma chapa, a fresta fica com a largura constante e a volta fechada, a borda
 * de cada lado dobra para dentro como numa porta de verdade, e a espessura fecha as duas bordas como as paredes da fresta. Sem a
 * dobra, a fresta plana só aparecia nas vistas onde o fundo se via por ela. A porta da cabine sobe a coluna do para-brisa sobre a
 * quina (a coluna `D`, que segue a linha da prancha a 30 mm do para-brisa), desce vertical até o arco e contorna o arco por trás.
 */

export const TABELA = {
  // envelope da classe (prancha): 5400 de comprimento, 2000 de largura sem retrovisores, 2500 de altura, soleira em 300
  comprimento: 5400,
  meia_largura: 1000,
  altura: 2500,
  soleira_y: 300,

  // rodas e arcos: entre-eixos e balanço dianteiro (o traseiro sai da diferença), bitola, pneu 225/65 aro 16, arco com 65 mm de folga
  entre_eixos: 3300,
  balanco_dianteiro: 980,
  bitola: 1700,
  pneu_diametro: 710,
  pneu_largura: 225,
  arco_raio: 420,

  // perfil da frente, em [z, y]: nariz vertical até o topo do para-choque, degrau dele, boca do capô, capô curto, para-brisa e testa
  raio_nariz_base: 50,
  parachoque_topo_y: 720,
  raio_parachoque_topo: 30,
  degrau_frente_recuo: 40,
  degrau_frente_y: 760,
  raio_degrau_frente: 10,
  capo_comprimento: 860, // em z, da boca ao pé do para-brisa
  capo_angulo: 22.5,
  raio_boca: 20,
  base_vidro_recuo: 940, // do nariz ao pé do para-brisa, em z
  base_vidro_y: 1310,
  raio_base_vidro: 90,
  para_brisa_angulo: 55,
  topo_vidro_y: 1990,
  raio_topo_vidro: 300,
  testa_recuo: 200, // do topo do para-brisa ao canto da testa no teto, em z
  raio_testa: 200, // a prancha cota 300, mas o filete dela fica limitado à metade do trecho de antes e sai com 200

  // perfil de trás: traseira vertical recuada sobre o degrau do para-choque, quina do teto com raio
  traseira_recuo: 30,
  degrau_tras_y: 570,
  degrau_tras_rampa: 20, // o degrau horizontal da prancha vira uma rampa curta, porque cada anel é uma fatia horizontal
  raio_traseira_base: 40,
  raio_quina_traseira: 120,

  // seção frontal, em [x, y]: lateral vertical até 1450 e quase vertical até o teto, quina do teto com raio
  lateral_reta_ate_y: 1450,
  meia_largura_no_teto: 982,
  raio_lateral: 600,
  raio_ombro: 170,

  // planta: raio das quinas verticais na frente (do para-choque à coluna do para-brisa) e atrás, e na borda do teto plano
  raio_planta_frente: 280,
  raio_coluna_base: 160,
  raio_coluna_topo: 120,
  raio_teto_frente: 100,
  raio_planta_tras: 100,
  raio_teto_tras: 40,

  // chapa: espessura e níveis da subdivisão (com 2 níveis a chapa passa de 250 mil faces, que o adaptador da cena não carrega)
  espessura: 2,
  niveis: 1,
  nitidez_dobra_frente: 0.9, // o topo do para-choque e a boca do capô, de raio curto na prancha

  // gaiola: passo dos anéis ao longo dos perfis e giro máximo entre dois anéis; folga mínima entre anéis; passo dos anéis retos;
  // passo das colunas da lateral, distância mínima de uma coluna a uma linha de porta ou de arco, e passo dos pontos do arco em graus;
  // a altura onde os anéis deixam de ser horizontais e quantos anéis sobem os raios do ombro
  passo_perfil: 140,
  giro_max: 30,
  folga_entre_aneis: 8,
  passo_anel: 150,
  passo_lado: 130,
  margem_coluna: 35,
  passo_arco_graus: 6,
  colunas_frente_transicao: 320, // abaixo da base do para-brisa, a altura em que as colunas da frente passam das partes iguais para a borda do vão
  ombro_y: 2280,
  aneis_do_ombro: 6,

  // frestas das portas (prancha): largura da fresta; base das portas laterais; o arco da porta da cabine 55 mm fora do arco da roda;
  // a traseira da porta da cabine, o topo dela e a fresta da frente a 30 mm do para-brisa, medida na perpendicular à coluna; a coluna
  // do meio e a porta de correr; a base das portas traseiras e o topo delas, no anel do ombro que fica no fim da traseira vertical
  fresta: 6,
  fresta_borda_largura: 5, // a tira de cada lado da fresta, em que a borda dobra para dentro
  fresta_borda_queda: 4, // quanto a borda desce para dentro da superfície, na fresta: com a tira de 5 mm, 39 graus, acima do ângulo do sombreado liso
  fresta_borda_nitidez: 1, // o vinco vivo no começo da tira, que segura a dobra nela e deixa o painel plano até ela
  porta_base_y: 380,
  porta_folga_arco: 55,
  porta_cabine_tras_z: 550,
  porta_cabine_topo_y: 1955,
  porta_fresta_coluna: 30,
  coluna_do_meio: 110,
  porta_correr_largura: 1300,
  porta_correr_topo_y: 2200,
  porta_traseira_base_y: 600, // a prancha desenha 590; sobe 10 mm para a tira da fresta não encostar no degrau do para-choque em 580
  porta_traseira_topo_y: 2376,
  anel_porta_traseira: 2,

  // a coluna da fresta da frente na quina: quanto a quina fica para a frente dela e o mínimo da faixa de trás dela até a lateral
  recuo_quina_porta: 30,
  alcance_coluna_porta: 90,
  inicio_colunas_porta: 150,

  // vãos dos vidros (prancha): para-brisa (a base, e a borda de lado na base e no topo, que é o da porta da cabine), vidro da porta da
  // cabine (base, topo e moldura de trás; a frente é a quina da coluna), vidros das portas traseiras; e a aba dobrada de cada vão
  para_brisa_base_y: 1330,
  para_brisa_x_base: 820,
  para_brisa_x_topo: 790,
  vidro_cabine_base_y: 1363,
  vidro_cabine_topo_y: 1880,
  moldura_vidro_cabine: 70,
  vidro_traseiro_base_y: 1700,
  vidro_traseiro_topo_y: 2200,
  vidro_traseiro_x_dentro: 80,
  vidro_traseiro_x_fora: 820,
  aba_vao_largura: 20,
  aba_vao_raio: 3,
  aba_vao_angulo: 90,

  // vinco de cintura: altura, meia largura da dobra, profundidade, recuo das quinas e rampa das pontas
  cintura_y: 1050,
  cintura_meia_largura: 40,
  cintura_profundidade: 2,
  cintura_recuo: 40,
  cintura_rampa: 150,

  // nervuras do teto: dois sulcos de cada lado, com o centro em x, a meia largura, a profundidade, o recuo das bordas do teto, a
  // rampa das pontas e a nitidez das dobras
  nervura_1_x: 230,
  nervura_2_x: 530,
  nervura_meia_largura: 45,
  nervura_profundidade: 8,
  nervura_recuo: 150,
  nervura_rampa: 200,
  nervura_nitidez: 0.7,

  // aba leve dos arcos das rodas: largura no alto do arco e nas pontas, altura sobre a chapa e o comprimento em que afina nas pontas
  aba_arco_largura: 32,
  aba_arco_largura_ponta: 16,
  aba_arco_altura: 4,
  aba_arco_fechamento: 60,
};

const m = (mm) => mm / 1000;
const grau = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const suave = (t) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };

/* ---------- curvas 2D em milímetro ---------- */

/* A poligonal com o raio de cada canto ([u, v, raio?]) virada em polilinha densa: cada canto com raio vira arco tangente aos dois
   trechos, amostrado a cada grau. O canto sem raio fica vivo. */
function contornoComRaios(pts) {
  const saida = [[pts[0][0], pts[0][1]]];
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [px, py, r = 0] = pts[i];
    const a = pts[i - 1]; const b = pts[i + 1];
    const d1 = [px - a[0], py - a[1]]; const l1 = Math.hypot(...d1);
    const d2 = [b[0] - px, b[1] - py]; const l2 = Math.hypot(...d2);
    const u1 = [d1[0] / l1, d1[1] / l1]; const u2 = [d2[0] / l2, d2[1] / l2];
    const giro = Math.atan2(u1[0] * u2[1] - u1[1] * u2[0], u1[0] * u2[0] + u1[1] * u2[1]);
    if (!r || Math.abs(giro) < 1e-9) { saida.push([px, py]); continue; }
    const t = r * Math.tan(Math.abs(giro) / 2);
    if (t > l1 / 2 + 1e-6 || t > l2 / 2 + 1e-6) throw new Error(`furgao-realista: o raio ${r} no canto [${px}, ${py}] não cabe entre os vizinhos`);
    const t1 = [px - u1[0] * t, py - u1[1] * t];
    const sinal = Math.sign(giro);
    const n = [-u1[1] * sinal, u1[0] * sinal];
    const c = [t1[0] + n[0] * r, t1[1] + n[1] * r];
    const a0 = Math.atan2(t1[1] - c[1], t1[0] - c[0]);
    const passos = Math.max(2, Math.ceil(Math.abs(giro) / grau));
    for (let k = 0; k <= passos; k += 1) {
      const ang = a0 + (giro * k) / passos;
      saida.push([c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang)]);
    }
  }
  saida.push([pts.at(-1)[0], pts.at(-1)[1]]);
  return saida;
}

/* O comprimento acumulado de uma polilinha. */
function acumulado(pl) {
  const s = [0];
  for (let i = 1; i < pl.length; i += 1) s.push(s[i - 1] + Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]));
  return s;
}

/* O ponto da polilinha à distância `d` do começo. */
function pontoNaDistancia(pl, s, d) {
  let i = 1;
  while (i < pl.length - 1 && s[i] < d) i += 1;
  const t = s[i] === s[i - 1] ? 0 : Math.min(1, Math.max(0, (d - s[i - 1]) / (s[i] - s[i - 1])));
  return [lerp(pl[i - 1][0], pl[i][0], t), lerp(pl[i - 1][1], pl[i][1], t)];
}

/* O u da polilinha na altura v, pelo primeiro trecho que a atravessa (a polilinha sobe em v). */
function uNaAltura(pl, v) {
  for (let i = 1; i < pl.length; i += 1) {
    const [u0, v0] = pl[i - 1]; const [u1, v1] = pl[i];
    if ((v - v0) * (v - v1) <= 0 && v1 !== v0) return lerp(u0, u1, (v - v0) / (v1 - v0));
  }
  throw new Error(`furgao-realista: o perfil não chega à altura ${v}`);
}

/* O trecho da polilinha entre as alturas v0 e v1 (sobe em v), cortado nelas. */
function trechoEntre(pl, v0, v1) {
  const saida = [[uNaAltura(pl, v0), v0]];
  for (const p of pl) if (p[1] > v0 + 1e-9 && p[1] < v1 - 1e-9) saida.push(p);
  return saida;
}

/* O trecho da polilinha a partir do primeiro ponto em que ela atinge a altura v (o resto, até o fim). */
function aPartirDe(pl, v) {
  const s = acumulado(pl);
  for (let i = 1; i < pl.length; i += 1) {
    const [u0, v0] = pl[i - 1]; const [u1, v1] = pl[i];
    if ((v - v0) * (v - v1) <= 0 && v1 !== v0) {
      const p = [lerp(u0, u1, (v - v0) / (v1 - v0)), v];
      return { pl: [p, ...pl.slice(i)], s0: s[i - 1] + Math.hypot(p[0] - u0, p[1] - v0) };
    }
  }
  throw new Error(`furgao-realista: o perfil não chega à altura ${v}`);
}

/* As alturas em que o perfil pede anel: a cada `passo` de arco ou a cada `giroMax` graus de giro, o que vier antes. */
function alturasDoPerfil(polilinha, passo, giroMax) {
  /* os trechos retos longos (o capô, o para-brisa) se dividem antes, para o passo de arco valer dentro deles */
  const pl = [polilinha[0]];
  for (let i = 1; i < polilinha.length; i += 1) {
    const [a, b] = [polilinha[i - 1], polilinha[i]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (passo / 8)));
    for (let k = 1; k <= n; k += 1) pl.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
  }
  const alturas = [pl[0][1]];
  let arco = 0; let giro = 0;
  for (let i = 1; i < pl.length; i += 1) {
    arco += Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]);
    if (i + 1 < pl.length) {
      const a = Math.atan2(pl[i][1] - pl[i - 1][1], pl[i][0] - pl[i - 1][0]);
      const b = Math.atan2(pl[i + 1][1] - pl[i][1], pl[i + 1][0] - pl[i][0]);
      let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      giro += Math.abs(d) / grau;
    }
    if (arco >= passo || giro >= giroMax) { alturas.push(pl[i][1]); arco = 0; giro = 0; }
  }
  return alturas;
}

/* Pontos igualmente espaçados entre a e b, sem as pontas, com passo de no máximo `passo`. */
function entre(a, b, passo) {
  const n = Math.max(1, Math.ceil(Math.abs(b - a) / passo - 1e-9));
  return Array.from({ length: n - 1 }, (_, k) => lerp(a, b, (k + 1) / n));
}

/* ---------- a forma, em milímetro ---------- */

/** Os perfis, as funções de fatia e as medidas derivadas, tudo da TABELA. */
export function forma(T) {
  const zFrente = T.comprimento / 2;
  const zTras = -T.comprimento / 2;
  const xMax = T.meia_largura;
  const ys = T.soleira_y;
  const zD = zFrente - T.balanco_dianteiro;
  const zT = zD - T.entre_eixos;
  const rPneu = T.pneu_diametro / 2;

  /* perfil da frente, [z, y], do pé do nariz ao teto */
  const baseVidro = [zFrente - T.base_vidro_recuo, T.base_vidro_y];
  const boca = [baseVidro[0] + T.capo_comprimento, baseVidro[1] - T.capo_comprimento * Math.tan(T.capo_angulo * grau)];
  const topoVidro = [baseVidro[0] - (T.topo_vidro_y - baseVidro[1]) / Math.tan(T.para_brisa_angulo * grau), T.topo_vidro_y];
  const testa = [topoVidro[0] - T.testa_recuo, T.altura];
  const frenteDensa = contornoComRaios([
    [zFrente - 4 * T.raio_nariz_base, ys], [zFrente, ys, T.raio_nariz_base], [zFrente, T.parachoque_topo_y, T.raio_parachoque_topo],
    [zFrente - T.degrau_frente_recuo, T.degrau_frente_y, T.raio_degrau_frente], [...boca, T.raio_boca], [...baseVidro, T.raio_base_vidro],
    [...topoVidro, T.raio_topo_vidro], [...testa, T.raio_testa], [testa[0] - 4 * T.raio_testa, T.altura],
  ]);
  /* o perfil começa no pé do raio do nariz (o trecho reto da soleira fica de fora) e acaba no fim do raio da testa, onde o teto é plano */
  const frente = frenteDensa.slice(frenteDensa.findIndex((p) => p[0] > zFrente - T.raio_nariz_base - 1e-6));
  const zTetoFrente = frente.find((p) => p[1] >= T.altura - 1e-9)[0];
  const perfilFrente = frente.slice(0, frente.findIndex((p) => p[1] >= T.altura - 1e-9) + 1);

  /* perfil de trás, [z, y], do pé da traseira ao teto */
  const zTraseira = zTras + T.traseira_recuo;
  const trasDensa = contornoComRaios([
    [zTras + 4 * T.raio_traseira_base, ys], [zTras, ys, T.raio_traseira_base], [zTras, T.degrau_tras_y - T.degrau_tras_rampa / 2],
    [zTraseira, T.degrau_tras_y + T.degrau_tras_rampa / 2], [zTraseira, T.altura, T.raio_quina_traseira],
    [zTraseira + 4 * T.raio_quina_traseira, T.altura],
  ]);
  const tras = trasDensa.slice(trasDensa.findIndex((p) => p[0] < zTras + T.raio_traseira_base + 1e-6));
  const zTetoTras = tras.find((p) => p[1] >= T.altura - 1e-9)[0];
  const perfilTras = tras.slice(0, tras.findIndex((p) => p[1] >= T.altura - 1e-9) + 1);

  /* seção frontal, [x, y], da soleira ao teto */
  const lateralDensa = contornoComRaios([
    [xMax, ys], [xMax, T.lateral_reta_ate_y, T.raio_lateral], [T.meia_largura_no_teto, T.altura, T.raio_ombro], [0, T.altura],
  ]);
  const xTetoLado = lateralDensa.find((p) => p[1] >= T.altura - 1e-9)[0];
  const perfilLado = lateralDensa.slice(0, lateralDensa.findIndex((p) => p[1] >= T.altura - 1e-9) + 1);

  /* raio da quina da frente na planta, por altura: o do para-choque até a boca, fechando até a coluna do para-brisa */
  const raioFrente = (y) => {
    if (y <= boca[1]) return T.raio_planta_frente;
    if (y <= baseVidro[1]) return lerp(T.raio_planta_frente, T.raio_coluna_base, (y - boca[1]) / (baseVidro[1] - boca[1]));
    if (y <= topoVidro[1]) return lerp(T.raio_coluna_base, T.raio_coluna_topo, (y - baseVidro[1]) / (topoVidro[1] - baseVidro[1]));
    return lerp(T.raio_coluna_topo, T.raio_teto_frente, Math.min(1, (y - topoVidro[1]) / (T.altura - topoVidro[1])));
  };

  /* os arcos das rodas cortam a soleira onde o círculo de raio arco_raio, no centro da roda, cruza y = soleira */
  const dzArco = Math.sqrt(T.arco_raio ** 2 - (ys - rPneu) ** 2);

  /* A fresta da frente da porta da cabine, vista de lado: paralela ao para-brisa e porta_fresta_coluna atrás dele, medida na
     perpendicular à coluna, até o pé da coluna; dali desce vertical até o arco. */
  const pb = T.para_brisa_angulo * grau;
  const zLinhaVidro = (y) => baseVidro[0] - (y - baseVidro[1]) / Math.tan(pb);
  const pePorta = [baseVidro[0] - T.porta_fresta_coluna * Math.sin(pb), baseVidro[1] - T.porta_fresta_coluna * Math.cos(pb)];
  const zFrestaFrente = (y) => (y <= pePorta[1] ? pePorta[0] : zLinhaVidro(y) - T.porta_fresta_coluna / Math.sin(pb));
  return {
    zFrente, zTras, xMax, ys, zD, zT, rPneu, dzArco, boca, baseVidro, topoVidro, testa, pePorta,
    perfilFrente, perfilTras, perfilLado, zTetoFrente, zTetoTras, xTetoLado, raioFrente, zFrestaFrente,
    zF: (y) => uNaAltura(perfilFrente, y),
    zR: (y) => uNaAltura(perfilTras, y),
    xs: (y) => uNaAltura(perfilLado, y),
  };
}

/* ---------- os anéis ---------- */

/* As alturas dos anéis horizontais, com o nome de cada um: as alturas-chave com nome (as do perfil e as das portas, dos vãos e do
   vinco), as dos perfis e a grade de passo_anel, fundidas a menos de folga_entre_aneis e graduadas para nenhum intervalo passar do
   dobro de um vizinho. */
function aneisHorizontais(T, f) {
  const c = T.cintura_y; const h = T.cintura_meia_largura;
  const chaves = [
    ['soleira', f.ys], ['portaBase', T.porta_base_y], ['degrauTras', T.degrau_tras_y - T.degrau_tras_rampa / 2],
    ['degrauTrasTopo', T.degrau_tras_y + T.degrau_tras_rampa / 2], ['portaTraseiraBase', T.porta_traseira_base_y],
    ['parachoque', T.parachoque_topo_y], ['degrauFrente', T.degrau_frente_y], ['boca', f.boca[1]],
    ['cinturaBaixo', c - h], ['cintura', c], ['cinturaCima', c + h],
    ['baseVidro', f.baseVidro[1]], ['paraBrisaBase', T.para_brisa_base_y], ['vidroCabineBase', T.vidro_cabine_base_y],
    ['retaLateral', T.lateral_reta_ate_y], ['vidroTraseiroBase', T.vidro_traseiro_base_y], ['vidroCabineTopo', T.vidro_cabine_topo_y],
    ['portaCabineTopo', T.porta_cabine_topo_y], ['topoVidro', f.topoVidro[1]], ['portaCorrerTopo', T.porta_correr_topo_y],
    ['ombro', T.ombro_y],
  ];
  const nomeDe = new Map();
  for (const [n, y] of chaves) if (!nomeDe.has(y)) nomeDe.set(y, n);
  const fixas = [...nomeDe.keys()].sort((a, b) => a - b);
  for (let k = 1; k < fixas.length; k += 1) {
    if (fixas[k] - fixas[k - 1] < T.folga_entre_aneis) throw new Error(`furgao-realista: os anéis ${nomeDe.get(fixas[k - 1])} e ${nomeDe.get(fixas[k])} ficam a menos de ${T.folga_entre_aneis} mm`);
  }
  const candidatos = [
    ...alturasDoPerfil(trechoEntre(f.perfilFrente, f.ys, T.ombro_y), T.passo_perfil, T.giro_max),
    ...alturasDoPerfil(trechoEntre(f.perfilTras, f.ys, T.ombro_y), T.passo_perfil, T.giro_max),
  ];
  /* Nenhum anel de enchimento cai perto de uma linha de porta horizontal (onde a tira da fresta dobra) nem do alto do arco da porta
     da cabine: o anel que cairia ali vai para a beira da faixa. */
  const meiaTira = T.fresta / 2 + T.fresta_borda_largura + T.folga_entre_aneis;
  const yAltoArco = f.rPneu + T.arco_raio + T.porta_folga_arco;
  const faixas = [
    ...[T.porta_base_y, T.porta_traseira_base_y, T.porta_cabine_topo_y, T.porta_correr_topo_y].map((y) => [y - meiaTira - 1e-6, y + meiaTira + 1e-6]),
    [yAltoArco - 1.5 * meiaTira, yAltoArco + 1.5 * meiaTira],
  ];
  for (const [a, b] of faixas) {
    for (const y of fixas) if (y > a && y < b && !faixas.some(([c, d]) => Math.abs((c + d) / 2 - y) < 1e-6)) throw new Error(`furgao-realista: o anel ${nomeDe.get(y)} cai na faixa da fresta entre ${a.toFixed(0)} e ${b.toFixed(0)}`);
  }
  const foraDasFaixas = (y) => { for (const [a, b] of faixas) if (y > a && y < b) return y - a < b - y ? a : b; return y; };
  const alturas = [...fixas];
  const aceitar = (y) => { const v = foraDasFaixas(y); if (alturas.every((a) => Math.abs(a - v) >= T.folga_entre_aneis)) alturas.push(v); };
  for (const y of candidatos.filter((v) => v > f.ys && v < T.ombro_y).sort((a, b) => a - b)) aceitar(y);
  alturas.sort((a, b) => a - b);
  for (let k = alturas.length - 2; k >= 0; k -= 1) {
    const n = Math.ceil((alturas[k + 1] - alturas[k]) / T.passo_anel - 1e-9);
    for (let i = n - 1; i >= 1; i -= 1) alturas.splice(k + 1, 0, foraDasFaixas(lerp(alturas[k], alturas[k + 1], i / n)));
  }
  for (let dividiu = true; dividiu;) {
    dividiu = false;
    for (let k = 0; k + 1 < alturas.length && !dividiu; k += 1) {
      const vizinhos = [k > 0 ? alturas[k] - alturas[k - 1] : Infinity, k + 2 < alturas.length ? alturas[k + 2] - alturas[k + 1] : Infinity];
      if (alturas[k + 1] - alturas[k] > 2 * Math.min(...vizinhos) + 1e-9) { alturas.splice(k + 1, 0, (alturas[k] + alturas[k + 1]) / 2); dividiu = true; }
    }
  }
  /* a graduação pode ter posto anel de enchimento numa faixa: ele vai para a beira dela, e o que ficar perto de outro sai */
  for (let k = 0; k < alturas.length; k += 1) if (!nomeDe.has(alturas[k])) alturas[k] = foraDasFaixas(alturas[k]);
  alturas.sort((a, b) => a - b);
  for (let k = alturas.length - 1; k > 0; k -= 1) {
    if (alturas[k] - alturas[k - 1] < T.folga_entre_aneis) alturas.splice(nomeDe.has(alturas[k]) ? k - 1 : k, 1);
  }
  let ultima = 'soleira'; let ordem = 0;
  return alturas.map((y) => {
    if (nomeDe.has(y)) { ultima = nomeDe.get(y); ordem = 0; return { nome: ultima, y }; }
    ordem += 1;
    return { nome: `${ultima}${ordem}`, y };
  });
}

/* A seção de um anel horizontal: a frente, a lateral e a traseira na mesma altura, e os raios das quinas. */
function secaoHorizontal(T, f, y) {
  return { yF: y, zF: f.zF(y), xS: f.xs(y), yS: y, yR: y, zR: f.zR(y), rF: f.raioFrente(y), rB: T.raio_planta_tras };
}

/* Os anéis do ombro: cada trecho (frente, lateral e traseira) sobe o seu raio, da altura do ombro ao teto plano. A frente e a
   lateral andam frações iguais do arco; a traseira põe o anel `anel_porta_traseira` no topo das portas traseiras, ainda na parte
   vertical, e reparte o resto. */
function aneisDoOmbro(T, f) {
  const trecho = (perfil) => { const { pl } = aPartirDe(perfil, T.ombro_y); const s = acumulado(pl); return { at: (d) => pontoNaDistancia(pl, s, d), L: s.at(-1) }; };
  const fr = trecho(f.perfilFrente); const tr = trecho(f.perfilTras); const la = trecho(f.perfilLado);
  const n = T.aneis_do_ombro; const kT = T.anel_porta_traseira;
  const dTopo = T.porta_traseira_topo_y - T.ombro_y;
  if (!(dTopo > 0 && f.zR(T.porta_traseira_topo_y + 2) === f.zR(T.ombro_y))) throw new Error('furgao-realista: o topo das portas traseiras precisa ficar na traseira vertical, acima do ombro');
  const rF0 = f.raioFrente(T.ombro_y);
  /* até o anel do topo das portas traseiras, o começo da quina de trás segue a inclinação reta da lateral, para a fresta de fora
     das portas traseiras não entortar no alto; dali ao teto o raio fecha até o da borda do teto */
  const inclinacao = (f.xs(T.ombro_y) - f.xs(T.ombro_y - 100)) / 100;
  const xTrasReta = (y) => f.xs(T.ombro_y) + inclinacao * (y - T.ombro_y) - T.raio_planta_tras;
  const aneis = [];
  let rBTopo = T.raio_planta_tras;
  for (let k = 1; k <= n; k += 1) {
    const t = k / n;
    const dTras = k <= kT ? (dTopo * k) / kT : dTopo + ((tr.L - dTopo) * (k - kT)) / (n - kT);
    const [zF, yF] = fr.at(t * fr.L); const [zR, yR] = tr.at(dTras); const [xS, yS] = la.at(t * la.L);
    const rB = k <= kT ? xS - xTrasReta(yR) : lerp(rBTopo, T.raio_teto_tras, (k - kT) / (n - kT));
    if (k === kT) rBTopo = rB;
    aneis.push({
      nome: k === n ? 'teto' : `ombro${k}`, t,
      sec: { yF, zF, xS, yS, yR, zR, rF: lerp(rF0, T.raio_teto_frente, t), rB },
    });
  }
  return aneis;
}

/* ---------- pontos na seção de um anel (metade x >= 0) ---------- */

const pontoFrente = (s, x) => [x, s.yF, s.zF];
/* na quina da frente, pelo ângulo a: 0 na borda da frente, 90 graus no começo da lateral */
const pontoQuinaFrente = (s, a) => [s.xS - s.rF + s.rF * Math.sin(a), lerp(s.yF, s.yS, suave(a / (Math.PI / 2))), s.zF - s.rF + s.rF * Math.cos(a)];
const pontoLado = (s, z) => [s.xS, s.yS, z];
/* na quina de trás, pelo ângulo a: 0 no fim da lateral, 90 graus na borda da traseira */
const pontoQuinaTras = (s, a) => [s.xS - s.rB + s.rB * Math.cos(a), lerp(s.yS, s.yR, suave(a / (Math.PI / 2))), s.zR + s.rB - s.rB * Math.sin(a)];
const pontoTras = (s, x) => [x, s.yR, s.zR];
/* o caminho da quina da frente para a lateral: s = rF·a na quina, e depois anda para trás pela lateral */
const pontoNoCaminho = (sec, s) => (s <= sec.rF * Math.PI / 2 + 1e-9 ? pontoQuinaFrente(sec, s / sec.rF) : pontoLado(sec, sec.zF - sec.rF - (s - sec.rF * Math.PI / 2)));

/* O ponto mais perto, na seção do anel, de um ponto deslocado, e a normal de fora ali (no plano xz). Serve para as frestas: o ponto
   que a fresta afasta meia largura volta para a superfície da seção na altura nova. */
function projetarNaSecao(sec, p) {
  const sx = p[0] < 0 ? -1 : 1; const x = Math.abs(p[0]); const z = p[2];
  const xFim = sec.xS - sec.rF; const xTras = sec.xS - sec.rB;
  const cand = [];
  cand.push({ q: [Math.min(Math.max(x, 0), xFim), sec.zF], n: [0, 1] });
  { const c = [xFim, sec.zF - sec.rF]; let a = Math.atan2(x - c[0], z - c[1]); a = Math.min(Math.max(a, 0), Math.PI / 2); cand.push({ q: [c[0] + sec.rF * Math.sin(a), c[1] + sec.rF * Math.cos(a)], n: [Math.sin(a), Math.cos(a)] }); }
  cand.push({ q: [sec.xS, Math.min(Math.max(z, sec.zR + sec.rB), sec.zF - sec.rF)], n: [1, 0] });
  { const c = [xTras, sec.zR + sec.rB]; let a = Math.atan2(-(z - c[1]), x - c[0]); a = Math.min(Math.max(a, 0), Math.PI / 2); cand.push({ q: [c[0] + sec.rB * Math.cos(a), c[1] - sec.rB * Math.sin(a)], n: [Math.cos(a), -Math.sin(a)] }); }
  cand.push({ q: [Math.min(Math.max(x, 0), xTras), sec.zR], n: [0, -1] });
  let melhor = null; let dm = Infinity;
  for (const c of cand) { const d = Math.hypot(c.q[0] - x, c.q[1] - z); if (d < dm) { dm = d; melhor = c; } }
  return { p: [sx * melhor.q[0], p[1], melhor.q[1]], n: [sx * melhor.n[0], 0, melhor.n[1]] };
}

/* ---------- a gaiola ---------- */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const esc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a); return l > 1e-12 ? esc(a, 1 / l) : a; };

/**
 * derivar(T) -> a gaiola da chapa e as rodas provisórias, em milímetro e em metro.
 *   pontos: os pontos nomeados da gaiola, em metro, que entram em TOPO;
 *   passo: os campos do passo `subdivisao` (vertices, faces, vincos, cantos), só com nomes;
 *   aneis: os anéis, com a lista de pontos de cada um por coluna, para o teste e a etapa seguinte citarem a gaiola por nome;
 *   portas, vidros: as voltas de cada porta (nos nomes da carroceria) e de cada vão de vidro;
 *   abasDosArcos: a linha de cada arco de roda, para a aba;
 *   rodas: as quatro rodas provisórias, com o perfil do cilindro e a posição.
 */
export function derivar(T) {
  const f = forma(T);
  const fresta = T.fresta;
  const rArcoPorta = T.arco_raio + T.porta_folga_arco;
  const yBase = T.porta_base_y;
  const yTopoArco = f.rPneu + rArcoPorta;
  const margem = T.margem_coluna;
  /* a distância mínima de um ponto da gaiola a uma linha de porta: a meia fresta, a tira da borda e uma folga */
  const tiraDaFresta = fresta / 2 + T.fresta_borda_largura + T.folga_entre_aneis;

  /* os anéis: os horizontais e os do ombro, cada um com a seção */
  const horizontais = aneisHorizontais(T, f).map((a) => ({ ...a, sec: secaoHorizontal(T, f, a.y), horizontal: true }));
  const ombro = aneisDoOmbro(T, f).map((a) => ({ ...a, y: a.sec.yS, horizontal: false }));
  const aneis = [...horizontais, ...ombro];
  for (const a of horizontais) {
    if (Math.abs(a.y - yTopoArco) < 5) throw new Error(`furgao-realista: o anel ${a.nome} fica a menos de 5 mm do alto do arco da porta (${yTopoArco})`);
  }

  /* as colunas da frente: x por anel. Abaixo do capô, em partes iguais; no para-brisa, a borda do vão; no ombro e no teto, as linhas
     das nervuras, iguais às da traseira, para as linhas da cobertura saírem retas. */
  const w = T.nervura_meia_largura;
  const nervuras = [T.nervura_1_x, T.nervura_2_x];
  const linhasDoTeto = [0, (nervuras[0] - w) / 2, nervuras[0] - w, nervuras[0], nervuras[0] + w, (nervuras[0] + w + nervuras[1] - w) / 2, nervuras[1] - w, nervuras[1], nervuras[1] + w];
  const secTeto = ombro.at(-1).sec;
  const xFimTeto = secTeto.xS - secTeto.rF;
  const xTrasTeto = secTeto.xS - secTeto.rB;
  const XT = [...linhasDoTeto, ...entre(linhasDoTeto.at(-1), xFimTeto, (xFimTeto - linhasDoTeto.at(-1)) / 2 + 1e-6), xFimTeto];
  const nF = XT.length - 1;
  const RT = [...linhasDoTeto, ...entre(linhasDoTeto.at(-1), xTrasTeto, (xTrasTeto - linhasDoTeto.at(-1)) / 5 + 1e-6), xTrasTeto];
  const nR = RT.length - 1;
  const xBordaParaBrisa = (y) => lerp(T.para_brisa_x_base, T.para_brisa_x_topo, (y - T.para_brisa_base_y) / (1965 - T.para_brisa_base_y));
  const fracParaBrisa = (y, xFim) => { const xo = xBordaParaBrisa(y); return [...Array.from({ length: nF }, (_, k) => (xo * k) / (nF - 1) / xFim), 1]; };
  const fracUniforme = Array.from({ length: nF + 1 }, (_, k) => k / nF);
  const fracTeto = XT.map((x) => x / xFimTeto);
  const yCapoPlano = T.para_brisa_base_y - T.colunas_frente_transicao;
  const colunasFrente = (an) => {
    const s = an.sec; const xFim = s.xS - s.rF;
    let fr;
    if (!an.horizontal) fr = fracTeto;
    else if (an.y <= yCapoPlano) fr = fracUniforme;
    else if (an.y < T.para_brisa_base_y) {
      const pb = fracParaBrisa(T.para_brisa_base_y, f.xs(T.para_brisa_base_y) - f.raioFrente(T.para_brisa_base_y));
      const t = suave((an.y - yCapoPlano) / (T.para_brisa_base_y - yCapoPlano));
      fr = fracUniforme.map((u, k) => lerp(u, pb[k], t));
    } else if (an.y <= T.porta_cabine_topo_y) fr = fracParaBrisa(an.y, xFim);
    else {
      const pb = fracParaBrisa(T.porta_cabine_topo_y, f.xs(T.porta_cabine_topo_y) - f.raioFrente(T.porta_cabine_topo_y));
      const t = suave((an.y - T.porta_cabine_topo_y) / (T.ombro_y - T.porta_cabine_topo_y));
      fr = pb.map((u, k) => lerp(u, fracTeto[k], t));
    }
    return fr.map((u) => u * xFim);
  };
  /* as colunas da traseira: no corpo, a borda de dentro e a de fora dos vidros traseiros; no ombro e no teto, as das nervuras */
  const colunasTras = (an) => {
    const s = an.sec; const xTras = s.xS - s.rB;
    const corpo = (xt) => [0, T.vidro_traseiro_x_dentro, ...entre(T.vidro_traseiro_x_dentro, T.vidro_traseiro_x_fora, (T.vidro_traseiro_x_fora - T.vidro_traseiro_x_dentro) / 9 + 1e-6),
      T.vidro_traseiro_x_fora, ...entre(T.vidro_traseiro_x_fora, xt, (xt - T.vidro_traseiro_x_fora) / 3 + 1e-6), xt];
    if (an.horizontal) return corpo(xTras);
    const base = corpo(horizontais.at(-1).sec.xS - T.raio_planta_tras).map((x, k, l) => x / l.at(-1));
    return base.map((u, k) => lerp(u, RT[k] / xTrasTeto, an.t) * xTras);
  };
  if (colunasTras(horizontais[0]).length !== nR + 1) throw new Error('furgao-realista: a traseira e o teto pedem o mesmo número de colunas');

  /* A coluna da fresta da frente da porta da cabine (D), por anel: no caminho da quina para a lateral, onde a vista de lado dá a
     linha da prancha; acima do topo da porta, no mesmo ângulo de quina do topo. */
  const sQuina = (sec) => sec.rF * Math.PI / 2;
  const caminhoDeZ = (sec, z) => {
    const zLado = sec.zF - sec.rF;
    if (z <= zLado) return sQuina(sec) + (zLado - z);
    return sec.rF * Math.acos(Math.min(1, Math.max(-1, 1 - (sec.zF - z) / sec.rF)));
  };
  const secTopoPorta = secaoHorizontal(T, f, T.porta_cabine_topo_y);
  const aTopoPorta = caminhoDeZ(secTopoPorta, f.zFrestaFrente(T.porta_cabine_topo_y)) / secTopoPorta.rF;
  const yD = f.rPneu + Math.sqrt(rArcoPorta ** 2 - (f.pePorta[0] - f.zD) ** 2);
  const caminhoD = (an) => {
    if (an.horizontal && an.y <= T.porta_cabine_topo_y) return caminhoDeZ(an.sec, f.zFrestaFrente(an.y));
    return an.sec.rF * aTopoPorta;
  };

  /* os arcos: os ângulos dos pontos do arco da porta (raio rArcoPorta), comuns a todos os anéis que o cortam */
  const theta380 = Math.asin((yBase - f.rPneu) / rArcoPorta);
  const arcos = [{ id: 'arcoD', zc: f.zD }, { id: 'arcoT', zc: f.zT }].map((arco) => {
    const lista = [{ th: theta380, col: `${arco.id}_f`, tipo: 'juncao' }, { th: Math.PI - theta380, col: `${arco.id}_t`, tipo: 'juncao' }];
    horizontais.forEach((a, i) => {
      if (a.y > yBase && a.y < yTopoArco) {
        const th = Math.asin((a.y - f.rPneu) / rArcoPorta);
        lista.push({ th, col: `${arco.id}_j${i}f`, tipo: 'juncao' }, { th: Math.PI - th, col: `${arco.id}_j${i}t`, tipo: 'juncao' });
      }
    });
    if (arco.id === 'arcoD') lista.push({ th: Math.acos((f.pePorta[0] - arco.zc) / rArcoPorta), col: 'D', tipo: 'D' });
    lista.sort((a, b) => a.th - b.th);
    const passo = T.passo_arco_graus * grau;
    const comFill = [lista[0]];
    for (let k = 1; k < lista.length; k += 1) {
      const a = lista[k - 1].th; const b = lista[k].th;
      entre(a, b, passo).forEach((th) => comFill.push({ th, tipo: 'fill' }));
      comFill.push(lista[k]);
    }
    comFill.forEach((p, k) => {
      if (!p.col) p.col = `${arco.id}_c${k}`;
      p.nome = `${arco.id}_${k}`;
      p.z = arco.zc + rArcoPorta * Math.cos(p.th);
      p.y = f.rPneu + rArcoPorta * Math.sin(p.th);
    });
    return { ...arco, pontos: comFill };
  });

  /* as colunas da lateral: as linhas das portas e as de enchimento entre elas, a passo_lado */
  const zCabTras = T.porta_cabine_tras_z;
  const zCorrerFrente = zCabTras - T.coluna_do_meio;
  const zCorrerTras = zCorrerFrente - T.porta_correr_largura;
  const zVidroCabTras = zCabTras + T.moldura_vidro_cabine;
  const zFimLado = f.zR(f.ys) + T.raio_planta_tras;
  const zComecoLado = f.zF(f.ys) - f.raioFrente(f.ys);
  const ancoras = [
    { col: 'portaCorrerTras', z: zCorrerTras }, { col: 'portaCorrerFrente', z: zCorrerFrente }, { col: 'portaCabineTras', z: zCabTras },
    { col: 'vidroCabineTras', z: zVidroCabTras },
  ];
  const quebras = [zFimLado, zCorrerTras, zCorrerFrente, zCabTras, zVidroCabTras, f.pePorta[0], zComecoLado];
  const enchimento = [];
  for (let k = 0; k + 1 < quebras.length; k += 1) entre(quebras[k], quebras[k + 1], T.passo_lado).forEach((z) => enchimento.push({ col: `l${Math.round(z)}`, z }));
  const colunasLado = [...ancoras, ...enchimento].sort((a, b) => b.z - a.z);

  /* ---- os pontos de cada anel, na metade x >= 0 ---- */
  const P = new Map(); const SEC = new Map(); const EXTRA = new Map();
  const nomeE = (base) => `${base}_e`;
  const registrar = (nome, p, sec) => { if (!P.has(nome)) { P.set(nome, p); SEC.set(nome, sec); } return nome; };
  const ehCostura = (col) => col === 'f0' || col === 'r0';
  const nomePonto = (anel, col) => (ehCostura(col) ? `${anel}_${col}` : nomeE(`${anel}_${col}`));
  const secArco = secaoHorizontal(T, f, yBase);

  const cinturaH = (sec, z) => {
    const zIni = sec.zF - sec.rF - T.cintura_recuo; const zFim = sec.zR + sec.rB + T.cintura_recuo;
    return T.cintura_profundidade * suave((zIni - z) / T.cintura_rampa) * suave((z - zFim) / T.cintura_rampa);
  };

  /* o grupo da quina da frente e da coluna D, por anel: q1..q3, E, e D, b1, b2, S0 quando existem; cada um com o caminho s */
  const grupoQuina = (an) => {
    const sec = an.sec; const sq = sQuina(sec);
    const temD = an.y >= yD - 1e-9;
    const sD = temD ? caminhoD(an) : null;
    const temB = temD && (sD - sq) <= T.inicio_colunas_porta;
    const sE = temD ? Math.min(sq, sD - T.recuo_quina_porta) : sq;
    const g = [1, 2, 3].map((k) => ({ col: `q${k}`, s: (k / 4) * sE }));
    g.push({ col: 'E', s: sE });
    if (temD) g.push({ col: 'D', s: sD });
    if (temB) {
      const L = Math.max(sq - sD, T.alcance_coluna_porta);
      [1, 2, 3].forEach((k) => g.push({ col: k === 3 ? 'S0' : `b${k}`, s: sD + (k * L) / 3 }));
    }
    return g;
  };

  /* No ombro (e no anel em que ele começa) a lateral é curva, e as colunas de enchimento são as mesmas em todos os anéis: as que
     cabem entre o começo e o fim da lateral em todos eles. */
  const ehTopoDe = (an) => !an.horizontal || an.nome === 'ombro';
  /* onde a lateral começa para as colunas de enchimento: no fim da quina, ou, no ombro, depois da coluna S0 quando ela passa da quina */
  const comecoDe = (an) => {
    const sec = an.sec; const sq = sQuina(sec);
    const s0 = grupoQuina(an).find((g) => g.col === 'S0' && g.s > sq + 1e-9);
    return Math.min(sec.zF - sec.rF, s0 ? sec.zF - sec.rF - (s0.s - sq) : Infinity);
  };
  const topos = aneis.filter(ehTopoDe);
  const zComecoTopo = Math.min(...topos.map(comecoDe)) - margem;
  const zFimTopo = Math.max(...topos.map((an) => an.sec.zR + an.sec.rB)) + margem;
  /* no ombro a primeira coluna de enchimento fica logo atrás da S0 mais recuada, e o vão até a seguinte se divide a passo_lado */
  {
    const seguinte = Math.max(...colunasLado.filter((c) => c.z < zComecoTopo - margem).map((c) => c.z));
    [zComecoTopo - 1e-6, ...entre(seguinte, zComecoTopo, T.passo_lado)].forEach((z) => colunasLado.push({ col: `l${Math.round(z)}`, z }));
    colunasLado.sort((a, b) => b.z - a.z);
  }

  const listas = [];
  aneis.forEach((an) => {
    const sec = an.sec; const lista = [];
    const add = (col, p, nome = null) => { const n = nome ?? nomePonto(an.nome, col); registrar(n, p, sec); lista.push({ col, nome: n }); return n; };
    /* frente */
    colunasFrente(an).forEach((x, k) => add(`f${k}`, pontoFrente(sec, x)));
    /* quina da frente e grupo da coluna D */
    const sq = sQuina(sec);
    const grupo = grupoQuina(an);
    const naQuina = grupo.filter((g) => g.s <= sq + 1e-9);
    const naLateral = grupo.filter((g) => g.s > sq + 1e-9);
    naQuina.forEach((g) => add(g.col, pontoNoCaminho(sec, g.s)));
    const zComeco = comecoDe(an);
    const zFim = sec.zR + sec.rB;
    /* lateral: pontos estruturais (as linhas das portas, os arcos, as tampas dos arcos) e as colunas de enchimento */
    const itens = naLateral.map((g) => ({ col: g.col, z: sec.zF - sec.rF - (g.s - sq), y: sec.yS }));
    const zonas = [];
    if (an.horizontal) {
      const iH = horizontais.indexOf(an);
      const yAntes = iH > 0 ? horizontais[iH - 1].y : -Infinity;
      for (const arco of arcos) {
        const pts = arco.pontos;
        if (an.y <= yBase + 1e-9) {
          const r = lerp(T.arco_raio, rArcoPorta, (an.y - f.ys) / (yBase - f.ys));
          const thj = Math.asin((an.y - f.rPneu) / r);
          if (Math.abs(an.y - yBase) < 1e-9) pts.forEach((p) => itens.push({ col: p.col, z: p.z, y: p.y, nome: nomeE(p.nome), sec: secArco }));
          else {
            itens.push({ col: pts[0].col, z: arco.zc + r * Math.cos(thj), y: an.y });
            pts.slice(1, -1).forEach((p) => itens.push({ col: p.col, z: arco.zc + r * Math.cos(p.th), y: f.rPneu + r * Math.sin(p.th) }));
            itens.push({ col: pts.at(-1).col, z: arco.zc - r * Math.cos(thj), y: an.y });
          }
          zonas.push([arco.zc - r * Math.cos(thj) - margem, arco.zc + r * Math.cos(thj) + margem]);
        } else if (an.y < yTopoArco) {
          const thj = Math.asin((an.y - f.rPneu) / rArcoPorta);
          pts.filter((p) => p.th >= thj - 1e-9 && p.th <= Math.PI - thj + 1e-9).forEach((p) => itens.push({ col: p.col, z: p.z, y: p.y, nome: nomeE(p.nome), sec: secArco }));
          zonas.push([arco.zc - rArcoPorta * Math.cos(thj) - margem, arco.zc + rArcoPorta * Math.cos(thj) + margem]);
        }
        /* as tampas: o ponto do arco que não é de anel nem da coluna D ganha uma coluna até o primeiro anel acima dele */
        pts.filter((p) => p.tipo === 'fill' && p.y > yAntes && p.y <= an.y && Math.hypot(p.z - arco.zc, an.y - f.rPneu) - rArcoPorta >= tiraDaFresta)
          .forEach((p) => itens.push({ col: p.col, z: p.z, y: an.y }));
      }
    }
    const estruturais = [...itens];
    const ehTopo = ehTopoDe(an);
    for (const c of colunasLado) {
      const fixa = ancoras.some((a) => a.col === c.col);
      if (ehTopo) { if (c.z < zComecoTopo && c.z > zFimTopo) itens.push({ col: c.col, z: c.z, y: sec.yS }); continue; }
      if (c.z >= zComeco - margem || c.z <= zFim + margem) continue;
      if (zonas.some(([a, b]) => c.z > a && c.z < b)) continue;
      if (!fixa && estruturais.some((e) => Math.abs(e.z - c.z) < margem)) continue;
      if (fixa && estruturais.some((e) => Math.abs(e.z - c.z) < 1)) continue;
      itens.push({ col: c.col, z: c.z, y: sec.yS });
    }
    itens.sort((a, b) => b.z - a.z);
    for (const it of itens) {
      const p = it.nome ? null : (an.horizontal && it.y !== sec.yS ? [f.xs(it.y), it.y, it.z] : pontoLado(sec, it.z));
      if (it.nome) { registrar(it.nome, [f.xs(it.y), it.y, it.z], it.sec); lista.push({ col: it.col, nome: it.nome }); continue; }
      const n = add(it.col, p);
      if (an.nome === 'cintura') { const h = cinturaH(sec, it.z); if (h > 0) { P.set(n, [p[0] - h, p[1], p[2]]); EXTRA.set(n, [-h, 0, 0]); } }
    }
    /* quina de trás e traseira */
    add('RS', pontoLado(sec, zFim));
    [1, 2, 3].forEach((k) => add(k === 2 ? 'RM' : `rq${k}`, pontoQuinaTras(sec, (k / 4) * (Math.PI / 2))));
    colunasTras(an).reverse().forEach((x, k, l) => add(`r${l.length - 1 - k}`, pontoTras(sec, x)));
    listas.push({ nome: an.nome, y: an.y, sec, horizontal: an.horizontal, lista });
  });

  /* Uma coluna de enchimento que só um anel tem deixaria o ponto dela com duas arestas, entre a face de baixo e a de cima, que
     dividiriam duas arestas; ela sai do anel. */
  for (let mudou = true; mudou;) {
    mudou = false;
    listas.forEach((l, i) => {
      const vizinhas = [listas[i - 1], listas[i + 1]].filter(Boolean).map((v) => new Set(v.lista.map((p) => p.col)));
      const antes = l.lista.length;
      l.lista = l.lista.filter((p) => !/^l-?\d+$/.test(p.col) || vizinhas.some((v) => v.has(p.col)));
      if (l.lista.length !== antes) mudou = true;
    });
  }

  /* o ombro e a ligação dele com a lateral precisam das mesmas colunas, porque ali a lateral é curva */
  const topoColunas = (l) => l.lista.map((p) => p.col).join(',');
  const iOmbro = listas.findIndex((l) => l.nome === 'ombro');
  for (let i = iOmbro + 1; i < listas.length; i += 1) {
    if (topoColunas(listas[i]) !== topoColunas(listas[iOmbro])) throw new Error(`furgao-realista: o anel ${listas[i].nome} não tem as colunas do anel do ombro`);
  }

  /* ---- as faces entre anéis vizinhos, pelas colunas que os dois têm ---- */
  /* Entre duas colunas comuns, o trecho de baixo e o de cima viram quadriláteros quando têm o mesmo número de pontos, e, onde não
     têm (só na lateral, que é plana), são costurados em quadriláteros e triângulos pela ordem em z: uma face só com muitos lados
     deixaria um ponto de valência alta no meio dela, que a subdivisão espalha em faces finas. */
  const costurar = (baixo0, cima0) => {
    if (baixo0.length === cima0.length) return baixo0.slice(0, -1).map((n, k) => [n, baixo0[k + 1], cima0[k + 1], cima0[k]]);
    /* o ponto que os dois trechos dividem (o arco, onde o anel de cima termina nele) fica só no de baixo: as faces saem em leque
       do anel de cima, e não em triângulo com os três pontos no arco */
    const cima = [...cima0];
    if (cima.length > 1 && cima[0] === baixo0[0]) cima.shift();
    if (cima.length > 1 && cima.at(-1) === baixo0.at(-1)) cima.pop();
    const baixo = baixo0;
    const z = (n) => P.get(n)[2];
    const faces = []; let i = 0; let j = 0;
    while (i < baixo.length - 1 || j < cima.length - 1) {
      if (i === baixo.length - 1) { faces.push([baixo[i], cima[j + 1], cima[j]]); j += 1; continue; }
      if (j === cima.length - 1) { faces.push([baixo[i], baixo[i + 1], cima[j]]); i += 1; continue; }
      const zb = z(baixo[i + 1]); const zc = z(cima[j + 1]);
      const passo = Math.min(Math.abs(z(baixo[i]) - zb), Math.abs(z(cima[j]) - zc));
      if (Math.abs(zb - zc) < 0.35 * passo) { faces.push([baixo[i], baixo[i + 1], cima[j + 1], cima[j]]); i += 1; j += 1; } else if (zb > zc) { faces.push([baixo[i], baixo[i + 1], cima[j]]); i += 1; } else { faces.push([baixo[i], cima[j + 1], cima[j]]); j += 1; }
    }
    return faces;
  };
  const facesE = [];
  for (let i = 0; i + 1 < listas.length; i += 1) {
    const A = listas[i].lista; const B = listas[i + 1].lista;
    const posB = new Map(B.map((p, k) => [p.col, k]));
    const comuns = [];
    A.forEach((p, k) => { if (posB.has(p.col)) comuns.push([k, posB.get(p.col)]); });
    for (let c = 1; c < comuns.length; c += 1) if (comuns[c][1] <= comuns[c - 1][1]) throw new Error(`furgao-realista: as colunas dos anéis ${listas[i].nome} e ${listas[i + 1].nome} se cruzam em ${A[comuns[c][0]].col}`);
    for (let c = 0; c + 1 < comuns.length; c += 1) {
      const [a0, b0] = comuns[c]; const [a1, b1] = comuns[c + 1];
      const baixo = A.slice(a0, a1 + 1).map((p) => p.nome); const cima = B.slice(b0, b1 + 1).map((p) => p.nome);
      costurar(baixo, cima).forEach((poli) => {
        const limpo = poli.filter((n, k) => n !== poli[(k + 1) % poli.length]);
        if (new Set(limpo).size >= 3) facesE.push(limpo);
      });
    }
  }

  /* ---- a cobertura do teto plano: grade de Coons entre o anel do teto e a costura, com as linhas das nervuras retas ---- */
  const teto = listas.at(-1); const tl = teto.lista; const M = tl.length - 1;
  const bc = tl.findIndex((p) => p.col === 'D');
  if (M - bc !== tl.findIndex((p) => p.col === 'RM') || bc !== nF + 5) throw new Error('furgao-realista: a borda do teto não fecha a cobertura');
  const A = M - 2 * bc;
  const F = (b) => P.get(tl[b].nome); const R = (b) => P.get(tl[M - b].nome); const O = (a) => P.get(tl[bc + a].nome);
  const nomeTeto = (a, b) => {
    if (a === 0) return tl[b].nome;
    if (a === A) return tl[M - b].nome;
    if (b === bc) return tl[bc + a].nome;
    return b === 0 ? `cobertura${a}_0` : nomeE(`cobertura${a}_${b}`);
  };
  const zC0 = F(0)[2]; const zC1 = R(0)[2];
  const S = (a) => [0, T.altura, zC0 + ((O(a)[2] - O(0)[2]) / (O(A)[2] - O(0)[2])) * (zC1 - zC0)];
  const zNervuraIni = f.zTetoFrente - T.nervura_recuo; const zNervuraFim = f.zTetoTras + T.nervura_recuo;
  const fundoNervura = (z) => T.nervura_profundidade * suave((zNervuraIni - z) / T.nervura_rampa) * suave((z - zNervuraFim) / T.nervura_rampa);
  const bNervura = new Map([[3, 'centro'], [7, 'centro'], [2, 'borda'], [4, 'borda'], [6, 'borda'], [8, 'borda']]);
  for (let a = 1; a < A; a += 1) {
    for (let b = 0; b < bc; b += 1) {
      const u = b / bc; const v = a / A;
      const p = [0, 1, 2].map((k) => (1 - u) * S(a)[k] + u * O(a)[k] + (1 - v) * F(b)[k] + v * R(b)[k]
        - ((1 - u) * (1 - v) * F(0)[k] + u * (1 - v) * F(bc)[k] + (1 - u) * v * R(0)[k] + u * v * R(bc)[k]));
      if (b <= 8) p[0] = (1 - v) * F(b)[0] + v * R(b)[0];
      p[0] = b === 0 ? 0 : p[0];
      p[1] = T.altura - (bNervura.get(b) === 'centro' ? fundoNervura(p[2]) : 0);
      registrar(nomeTeto(a, b), p, secTeto);
    }
  }
  for (let a = 0; a < A; a += 1) {
    for (let b = 0; b < bc; b += 1) facesE.push([nomeTeto(a, b), nomeTeto(a, b + 1), nomeTeto(a + 1, b + 1), nomeTeto(a + 1, b)]);
  }

  /* ---- espelho: a metade x < 0 ---- */
  const espelho = (n) => (n.endsWith('_e') ? `${n.slice(0, -2)}_d` : n);
  for (const [n, p] of [...P]) {
    if (!n.endsWith('_e')) continue;
    P.set(espelho(n), [-p[0], p[1], p[2]]); SEC.set(espelho(n), SEC.get(n));
    if (EXTRA.has(n)) EXTRA.set(espelho(n), [-EXTRA.get(n)[0], 0, 0]);
  }
  const facesMestre = [...facesE, ...facesE.map((fc) => fc.map(espelho).reverse())];
  const arestas = new Set(); const chave = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  facesMestre.forEach((fc) => fc.forEach((n, k) => arestas.add(chave(n, fc[(k + 1) % fc.length]))));

  /* ---- as voltas das portas e dos vãos, nos nomes da gaiola ---- */
  const anel = (nome) => { const l = listas.find((x) => x.nome === nome); if (!l) throw new Error(`furgao-realista: sem anel ${nome}`); return l; };
  const anelEm = (y) => { const l = listas.find((x) => x.horizontal && Math.abs(x.y - y) < 1e-6); if (!l) throw new Error(`furgao-realista: sem anel na altura ${y}`); return l; };
  const lado = (n, s) => (s === 'd' ? espelho(n) : n);
  const ponto = (l, col, s) => { const p = l.lista.find((q) => q.col === col); if (!p) throw new Error(`furgao-realista: o anel ${l.nome} não tem a coluna ${col}`); return lado(p.nome, s); };
  const trecho = (l, c0, c1, s) => {
    const k0 = l.lista.findIndex((q) => q.col === c0); const k1 = l.lista.findIndex((q) => q.col === c1);
    if (k0 < 0 || k1 < 0) throw new Error(`furgao-realista: o anel ${l.nome} não tem ${c0} ou ${c1}`);
    const t = k0 <= k1 ? l.lista.slice(k0, k1 + 1) : l.lista.slice(k1, k0 + 1).reverse();
    return t.map((q) => lado(q.nome, s));
  };
  const coluna = (col, y0, y1, s) => {
    const sobe = y1 >= y0; const ys = [Math.min(y0, y1), Math.max(y0, y1)];
    const l = listas.filter((x) => x.horizontal && x.y >= ys[0] - 1e-6 && x.y <= ys[1] + 1e-6);
    const c = l.map((x) => ponto(x, col, s));
    return sobe ? c : c.reverse();
  };
  const fechar = (pts) => pts.filter((n, k) => n !== pts[(k + 1) % pts.length]);
  const aCosturaFrente = (l) => trecho(l, 'f0', `f${nF - 1}`, 'e');
  const R380 = anelEm(yBase);
  const portas = [];
  for (const s of ['e', 'd']) {
    const sufixo = s === 'e' ? 'Esquerda' : 'Direita';
    const topo = anelEm(T.porta_cabine_topo_y);
    const colD = listas.filter((x) => x.horizontal && x.y > yD && x.y <= T.porta_cabine_topo_y).map((x) => ponto(x, 'D', s));
    portas.push({
      nome: `portaCabine${sufixo}`,
      volta: fechar([...trecho(R380, 'D', 'D', s), ...colD, ...trecho(topo, 'D', 'portaCabineTras', s),
        ...coluna('portaCabineTras', T.porta_cabine_topo_y, yBase, s), ...trecho(R380, 'portaCabineTras', 'D', s)]),
    });
    /* a porta traseira sobe pelos anéis horizontais e pelos do ombro até o anel do topo dela */
    const iBaseTras = listas.findIndex((x) => x.horizontal && Math.abs(x.y - T.porta_traseira_base_y) < 1e-6);
    const iTopoTras = listas.findIndex((x) => x.nome === `ombro${T.anel_porta_traseira}`);
    const subida = listas.slice(iBaseTras, iTopoTras + 1);
    portas.push({
      nome: `portaTraseira${sufixo}`,
      volta: fechar([...trecho(subida[0], 'r0', `r${nR}`, s), ...subida.map((x) => ponto(x, `r${nR}`, s)),
        ...trecho(subida.at(-1), `r${nR}`, 'r0', s), ...[...subida].reverse().map((x) => ponto(x, 'r0', s))]),
    });
  }
  portas.push({
    nome: 'portaCorrer',
    volta: fechar([...trecho(R380, 'portaCorrerFrente', 'portaCorrerTras', 'd'), ...coluna('portaCorrerTras', yBase, T.porta_correr_topo_y, 'd'),
      ...trecho(anelEm(T.porta_correr_topo_y), 'portaCorrerTras', 'portaCorrerFrente', 'd'), ...coluna('portaCorrerFrente', T.porta_correr_topo_y, yBase, 'd')]),
  });
  const vidros = [];
  {
    const base = anelEm(T.para_brisa_base_y); const topo = anelEm(T.porta_cabine_topo_y);
    const b = aCosturaFrente(base); const t = aCosturaFrente(topo);
    vidros.push({
      nome: 'paraBrisa', linha: 'abaVaoParaBrisa',
      volta: fechar([...b.slice(1).reverse().map(espelho), ...b, ...coluna(`f${nF - 1}`, T.para_brisa_base_y, T.porta_cabine_topo_y, 'e'),
        ...t.slice(0).reverse(), ...t.slice(1).map(espelho), ...coluna(`f${nF - 1}`, T.porta_cabine_topo_y, T.para_brisa_base_y, 'd')]),
    });
  }
  for (const s of ['e', 'd']) {
    const sufixo = s === 'e' ? 'Esquerda' : 'Direita';
    const yb = T.vidro_cabine_base_y; const yt = T.vidro_cabine_topo_y;
    vidros.push({
      nome: `vidroPortaCabine${sufixo}`, linha: `abaVaoPortaCabine${sufixo}`,
      volta: fechar([...coluna('S0', yb, yt, s), ...trecho(anelEm(yt), 'S0', 'vidroCabineTras', s), ...coluna('vidroCabineTras', yt, yb, s), ...trecho(anelEm(yb), 'vidroCabineTras', 'S0', s)]),
    });
    const yb2 = T.vidro_traseiro_base_y; const yt2 = T.vidro_traseiro_topo_y;
    const iFora = colunasTras(anelEm(yb2)).findIndex((x) => Math.abs(x - T.vidro_traseiro_x_fora) < 1e-6);
    vidros.push({
      nome: `vidroPortaTraseira${sufixo}`, linha: `abaVaoPortaTraseira${sufixo}`,
      volta: fechar([...coluna('r1', yb2, yt2, s), ...trecho(anelEm(yt2), 'r1', `r${iFora}`, s), ...coluna(`r${iFora}`, yt2, yb2, s), ...trecho(anelEm(yb2), `r${iFora}`, 'r1', s)]),
    });
  }
  for (const v of [...portas, ...vidros]) {
    v.volta.forEach((n, k) => { if (!arestas.has(chave(n, v.volta[(k + 1) % v.volta.length]))) throw new Error(`furgao-realista: a volta ${v.nome} passa fora das arestas entre ${n} e ${v.volta[(k + 1) % v.volta.length]}`); });
  }

  /* cada volta no sentido anti-horário visto de fora: o lado de dentro fica à esquerda de quem anda nela */
  const normalDe = (n) => projetarNaSecao(SEC.get(n), P.get(n)).n;
  const orientar = (volta) => {
    let area = [0, 0, 0]; let nm = [0, 0, 0];
    volta.forEach((n, k) => { area = soma(area, cruz(P.get(n), P.get(volta[(k + 1) % volta.length]))); nm = soma(nm, normalDe(n)); });
    return dot(area, nm) < 0 ? [...volta].reverse() : volta;
  };
  [...portas, ...vidros].forEach((v) => { v.volta = orientar(v.volta); });

  /* ---- as regiões: as faces de dentro de cada volta, pela face à esquerda da primeira aresta e por vizinhança sem cruzar volta ---- */
  const barreira = new Set();
  [...portas, ...vidros].forEach((v) => v.volta.forEach((n, k) => barreira.add(chave(n, v.volta[(k + 1) % v.volta.length]))));
  const facesDaAresta = new Map();
  facesMestre.forEach((fc, i) => fc.forEach((n, k) => { const c = chave(n, fc[(k + 1) % fc.length]); if (!facesDaAresta.has(c)) facesDaAresta.set(c, []); facesDaAresta.get(c).push(i); }));
  const regiao = new Array(facesMestre.length).fill(null);
  const encher = (volta, rotulo) => {
    const [a, b] = volta;
    const semente = facesMestre.findIndex((fc) => fc.some((n, k) => n === a && fc[(k + 1) % fc.length] === b));
    if (semente < 0) throw new Error(`furgao-realista: nenhuma face à esquerda de ${a} -> ${b}`);
    const fila = [semente]; regiao[semente] = rotulo;
    while (fila.length) {
      const i = fila.pop(); const fc = facesMestre[i];
      fc.forEach((n, k) => {
        const c = chave(n, fc[(k + 1) % fc.length]);
        if (barreira.has(c)) return;
        for (const j of facesDaAresta.get(c)) if (regiao[j] === null) { regiao[j] = rotulo; fila.push(j); }
      });
    }
  };
  vidros.forEach((v) => encher(v.volta, `vidro:${v.nome}`));
  portas.forEach((v) => encher(v.volta, `porta:${v.nome}`));

  /* ---- a fresta ----
     Cada ponto de volta de porta se divide, para cada lado da volta (a porta e a carroceria), em dois: o da borda, afastado meia
     fresta pela superfície e baixado fresta_borda_queda para dentro, e o de dentro, fresta_borda_largura além dele, na superfície.
     As faces de cada lado usam o ponto de dentro, e uma tira de faces liga os dois ao longo da volta: a borda de cada lado dobra para
     dentro como a borda de uma porta de verdade, e a fresta se lê como uma linha em qualquer luz, não só onde o fundo aparece por
     ela. O ponto de dentro leva um vinco fracionário, que segura a dobra na tira. */
  const deslocar = (n, d) => {
    const proj = projetarNaSecao(SEC.get(n), soma(sub(P.get(n), EXTRA.get(n) ?? [0, 0, 0]), d));
    return soma(proj.p, EXTRA.get(n) ?? [0, 0, 0]);
  };
  const dentroDe = new Map(); // nome -> [{porta, m}]
  portas.forEach((v) => {
    const L = v.volta.length;
    v.volta.forEach((n, k) => {
      const pa = P.get(v.volta[(k - 1 + L) % L]); const pb = P.get(v.volta[(k + 1) % L]); const p = P.get(n);
      const nrm = normalDe(n);
      const m1 = unit(cruz(nrm, unit(sub(p, pa)))); const m2 = unit(cruz(nrm, unit(sub(pb, p))));
      const mi = esc(soma(m1, m2), 1 / Math.max(0.3, 1 + dot(m1, m2)));
      if (!dentroDe.has(n)) dentroDe.set(n, []);
      dentroDe.get(n).push({ porta: v.nome, m: mi });
    });
  });
  const borda = new Map(); // `${nome}|${regiao}` -> nome do ponto da borda
  const copia = new Map(); // `${nome}|${regiao}` -> nome do ponto de dentro
  const posicoes = new Map(P);
  const largura = T.fresta_borda_largura; const queda = T.fresta_borda_queda;
  const copiar = (n, rot, mi, nomeBorda, nomeDentro) => {
    const nrm = normalDe(n);
    posicoes.set(nomeBorda, soma(deslocar(n, esc(mi, fresta / 2)), esc(nrm, -queda)));
    posicoes.set(nomeDentro, deslocar(n, esc(mi, fresta / 2 + largura)));
    borda.set(`${n}|${rot}`, nomeBorda); copia.set(`${n}|${rot}`, nomeDentro);
  };
  for (const [n, lst] of dentroDe) {
    lst.forEach(({ porta, m: mi }) => copiar(n, `porta:${porta}`, mi, `${n}_${porta}`, `${n}_${porta}_dentro`));
    const media = esc(lst.reduce((acc, x) => soma(acc, x.m), [0, 0, 0]), -1 / lst.length);
    copiar(n, 'carroceria', media, n, `${n}_corpo`);
  }
  const faces = [];
  const regiaoDaAresta = new Map();
  const regiaoDaFace = [];
  facesMestre.forEach((fc, i) => {
    const r = regiao[i];
    if (r && r.startsWith('vidro:')) return;
    const rot = r ?? 'carroceria';
    faces.push(fc.map((n) => copia.get(`${n}|${rot}`) ?? n));
    regiaoDaFace.push([fc, rot]);
    fc.forEach((n, k) => regiaoDaAresta.set(chave(n, fc[(k + 1) % fc.length]), rot));
  });
  /* as tiras da borda: para cada aresta de volta de porta e cada face que a tem, uma tira entre a borda e o ponto de dentro, no
     sentido da face */
  const dentroDasTiras = [];
  const arestaDeVolta = new Set();
  portas.forEach((v) => v.volta.forEach((n, k) => arestaDeVolta.add(chave(n, v.volta[(k + 1) % v.volta.length]))));
  regiaoDaFace.forEach(([fc, rot]) => fc.forEach((a, k) => {
    const b = fc[(k + 1) % fc.length];
    if (!arestaDeVolta.has(chave(a, b))) return;
    const B = (n) => borda.get(`${n}|${rot}`); const D = (n) => copia.get(`${n}|${rot}`);
    faces.push([B(a), B(b), D(b), D(a)]);
    dentroDasTiras.push([D(a), D(b)]);
  }));
  const final = (n, rot) => copia.get(`${n}|${rot}`) ?? n;

  /* ---- vincos ---- */
  const cadeia = (mestres, rotuloDe) => {
    const pedacos = [];
    let atual = [];
    for (let k = 0; k + 1 < mestres.length; k += 1) {
      const c = chave(mestres[k], mestres[k + 1]);
      if (!arestas.has(c)) throw new Error(`furgao-realista: o vinco passa fora das arestas em ${mestres[k]}`);
      const rot = regiaoDaAresta.get(c);
      if (!rot || (rotuloDe && !rotuloDe(k))) { if (atual.length > 1) pedacos.push(atual); atual = []; continue; }
      const a = final(mestres[k], rot); const b = final(mestres[k + 1], rot);
      if (atual.length && atual.at(-1) === a) atual.push(b);
      else { if (atual.length > 1) pedacos.push(atual); atual = [a, b]; }
    }
    if (atual.length > 1) pedacos.push(atual);
    return pedacos;
  };
  const vincos = [];
  const atravessar = (l, c0) => { const meia = trecho(l, c0, l.lista[0].col, 'e').reverse(); return [...meia.slice(1).reverse().map(espelho), ...meia]; };
  for (const [nome, nit] of [['parachoque', T.nitidez_dobra_frente], ['boca', T.nitidez_dobra_frente], ['degrauFrente', 'viva']]) {
    vincos.push({ nome: `dobra_${nome}`, pontos: atravessar(anel(nome), 'q3').reverse(), nitidez: nit });
  }
  for (const nome of ['degrauTras', 'degrauTrasTopo']) {
    const l = anel(nome); const meia = trecho(l, 'rq1', 'r0', 'e');
    vincos.push({ nome: `dobra_${nome}`, pontos: [...meia, ...meia.slice(0, -1).reverse().map(espelho)], nitidez: 'viva' });
  }
  for (const s of ['e', 'd']) {
    const l = anel('cintura');
    const lst = trecho(l, 'E', 'RS', s);
    const temH = lst.map((n) => (EXTRA.get(n)?.[0] ?? 0) !== 0);
    cadeia(lst, (k) => temH[k] || temH[k + 1]).forEach((pts, k) => vincos.push({ nome: `vincoCintura_${s}${k}`, pontos: pts, nitidez: 'viva' }));
  }
  for (const s of ['e', 'd']) {
    for (const b of [2, 3, 4, 6, 7, 8]) {
      const pts = [];
      for (let a = 1; a < A; a += 1) {
        const n = lado(nomeTeto(a, b), s);
        const z = P.get(n)[2];
        if (z <= zNervuraIni + 1 && z >= zNervuraFim - 1) pts.push(n);
      }
      vincos.push({ nome: `nervura${b}_${s}`, pontos: pts, nitidez: T.nervura_nitidez });
    }
  }

  /* o vinco do ponto de dentro de cada tira da fresta, em cadeias ao longo da volta */
  {
    const viz = new Map();
    const liga = (a, b) => { if (!viz.has(a)) viz.set(a, []); viz.get(a).push(b); };
    dentroDasTiras.forEach(([a, b]) => { liga(a, b); liga(b, a); });
    const usada = new Set(); let k = 0;
    const andar = (ini) => {
      const pts = [ini]; let atual = ini;
      for (;;) {
        const prox = viz.get(atual).find((n) => !usada.has(chave(atual, n)));
        if (!prox) break;
        usada.add(chave(atual, prox)); pts.push(prox); atual = prox;
      }
      return pts;
    };
    const inicios = [...viz.keys()].sort((a, b) => (viz.get(a).length === 1 ? -1 : 0) - (viz.get(b).length === 1 ? -1 : 0) || (a < b ? -1 : 1));
    for (const n of inicios) {
      while (viz.get(n).some((m2) => !usada.has(chave(n, m2)))) {
        const pts = andar(n);
        if (pts.length > 1) { vincos.push({ nome: `fresta${k}`, pontos: pts, nitidez: T.fresta_borda_nitidez }); k += 1; }
      }
    }
  }

  /* os cantos: onde o arco de cada roda encontra a soleira */
  const sol = anel('soleira');
  const cantos = ['e', 'd'].flatMap((s) => arcos.flatMap((a) => [ponto(sol, `${a.id}_f`, s), ponto(sol, `${a.id}_t`, s)]));

  /* as linhas das abas dos arcos: a borda de cada arco na soleira, da frente para trás do lado esquerdo e de trás para a frente do
     direito, para a chapa ficar à esquerda de quem anda na linha */
  const abasDosArcos = arcos.flatMap((a) => ['e', 'd'].map((s) => {
    const pts = trecho(sol, `${a.id}_f`, `${a.id}_t`, s);
    return { arco: a.id, lado: s, pontos: s === 'e' ? pts : pts.reverse() };
  }));

  const usados = new Set(faces.flat());
  const vertices = [...usados].sort();
  const pontos = Object.fromEntries(vertices.map((n) => [n, posicoes.get(n).map(m)]));
  const pontosMm = new Map(vertices.map((n) => [n, posicoes.get(n)]));

  /* as rodas provisórias: cilindros no pneu da prancha, na bitola e no entre-eixos, apoiados no chão */
  const xDentro = T.bitola / 2 - T.pneu_largura / 2;
  const xFora = T.bitola / 2 + T.pneu_largura / 2;
  const rodas = [];
  for (const [eixo, zc] of [['Dianteira', f.zD], ['Traseira', f.zT]]) {
    for (const [ladoNome, s] of [['Esquerda', 1], ['Direita', -1]]) {
      rodas.push({ nome: `rodaProvisoria${eixo}${ladoNome}`, s, zc, xDentro, xFora, raio: f.rPneu });
    }
  }
  return {
    forma: f, aneis: listas.map((l) => ({ nome: l.nome, y: l.y, colunas: l.lista.map((p) => p.col) })), pontos, pontosMm,
    passo: { vertices, faces, vincos, cantos },
    portas: portas.map((v) => ({ nome: v.nome, volta: v.volta })),
    vidros: vidros.map((v) => ({ nome: v.nome, linha: v.linha, volta: v.volta })),
    abasDosArcos, rodas,
    bordaDeBaixo: [...sol.lista.map((p) => p.nome), ...sol.lista.slice(1, -1).reverse().map((p) => espelho(p.nome))],
  };
}

/* ---------- passos ---------- */

const CHAPA = { origem: { op: 'subdivisao', id: 1 } };
const nomeDaAbaDoArco = (a) => `abaArco${a.arco === 'arcoD' ? 'Dianteiro' : 'Traseiro'}${a.lado === 'e' ? 'Esquerdo' : 'Direito'}`;

/** Os PASSOS: a chapa subdividida com espessura, as abas dos vãos dos vidros, as abas dos arcos e as quatro rodas provisórias. */
export function gerarPassos(T) {
  const { passo, rodas, vidros, abasDosArcos } = derivar(T);
  const passos = [
    ['subdivisao', { origemId: 1, ...passo, borda: 'cantos', niveis: T.niveis, espessura: m(T.espessura) }],
    ['parte', { nome: 'carroceria', sel: CHAPA }],
    ['material', { sel: CHAPA, usa: 'azul' }],
  ];
  vidros.forEach((v, k) => {
    const sel = { origem: { op: 'friso', id: 20 + k } };
    passos.push(['friso', {
      origemId: 20 + k, superficie: CHAPA.origem, linha: { nome: v.linha, pontos: [...v.volta, v.volta[0]] },
      aba: { largura: m(T.aba_vao_largura), angulo: T.aba_vao_angulo, raio: m(T.aba_vao_raio) },
    }]);
    passos.push(['parte', { nome: v.linha, sel }]);
    passos.push(['material', { sel, usa: 'azul' }]);
  });
  const W = m(T.aba_arco_largura); const H = m(T.aba_arco_altura); const fundo = -m(T.espessura) / 2;
  const perfilAba = [[0, fundo], [0, 0.6 * H], [0.12 * W, H], [0.45 * W, 0.8 * H], [W, 0.1 * H], [W, fundo]];
  abasDosArcos.forEach((a, k) => {
    const sel = { origem: { op: 'friso', id: 40 + k } };
    const linha = { nome: nomeDaAbaDoArco(a), pontos: a.pontos };
    const meio = a.pontos[Math.floor(a.pontos.length / 2)];
    passos.push(['friso', {
      origemId: 40 + k, superficie: CHAPA.origem, linha, perfil: perfilAba, ponta: 'fechada', fechamento: m(T.aba_arco_fechamento),
      variacao: { largura: [{ ponto: a.pontos[0], valor: m(T.aba_arco_largura_ponta) }, { ponto: meio, valor: W }, { ponto: a.pontos.at(-1), valor: m(T.aba_arco_largura_ponta) }] },
    }]);
    passos.push(['parte', { nome: linha.nome, sel }]);
    passos.push(['material', { sel, usa: 'azul' }]);
  });
  rodas.forEach((r, k) => {
    const sel = { origem: { op: 'lathe', id: 10 + k } };
    passos.push(['lathe', {
      origemId: 10 + k, eixo: 'x', lados: 48,
      perfil: [[0, 0], [m(r.raio), 0], [m(r.raio), m(r.xFora - r.xDentro)], [0, m(r.xFora - r.xDentro)]],
      em: [m(r.s > 0 ? r.xDentro : -r.xFora), m(r.raio), m(r.zc)],
    }]);
    passos.push(['parte', { nome: r.nome, sel }]);
    passos.push(['material', { sel, usa: 'pneu' }]);
    passos.push(['liso', { angulo: 30, sel }]);
  });
  return passos;
}

/* ---------- contatos, vãos, ilhas e pontos ---------- */

const RODAS = ['rodaProvisoriaDianteiraEsquerda', 'rodaProvisoriaDianteiraDireita', 'rodaProvisoriaTraseiraEsquerda', 'rodaProvisoriaTraseiraDireita'];
const ABAS_DOS_VAOS = ['abaVaoParaBrisa', 'abaVaoPortaCabineEsquerda', 'abaVaoPortaCabineDireita', 'abaVaoPortaTraseiraEsquerda', 'abaVaoPortaTraseiraDireita'];
const ABAS_DOS_ARCOS = ['abaArcoDianteiroEsquerdo', 'abaArcoDianteiroDireito', 'abaArcoTraseiroEsquerdo', 'abaArcoTraseiroDireito'];

/* As abas nascem na chapa: a do vão continua a borda dobrada para dentro, e a do arco assenta na lateral em volta do arco, entrando
   meia espessura nela. A chapa e as rodas não se tocam: o arco tem 65 mm de folga sobre o pneu e a face de fora do pneu fica 37,5 mm
   para dentro da lateral. */
export const CONTATOS = [
  ...ABAS_DOS_VAOS.map((a) => ({ par: ['carroceria', a], motivo: 'a aba nasce na parede da borda do vão e continua a chapa dobrada para dentro; as malhas se cruzam por décimos de milímetro na costura' })),
  ...ABAS_DOS_ARCOS.map((a) => ({ par: ['carroceria', a], motivo: 'a aba do arco assenta na lateral em volta do arco da roda e entra meia espessura na chapa, que é o contato dela' })),
];

export const ILHAS = RODAS.map((contem) => ({
  contem,
  motivo: 'roda provisória da etapa 1, apoiada no chão sob o arco e sem tocar a chapa; o cubo, o forro do arco e as rodas da família vêm na etapa 4',
}));

/* Os vãos da chapa: os dos vidros com a aba dobrada como moldura, e os das portas, que a própria porta ocupa com a fresta em volta. */
export function vaosDeclarados(T) {
  const { vidros, portas, bordaDeBaixo } = derivar(T);
  const vaos = vidros.map((v) => ({ nome: v.nome, borda: [...v.volta, v.volta[0]], frisos: [v.linha] }));
  for (const p of portas) {
    if (p.nome.startsWith('portaTraseira')) continue;
    vaos.push({ nome: p.nome, borda: [...p.volta, p.volta[0]], semMoldura: { motivo: 'é o vão da porta na carroceria; a própria porta o ocupa, com a fresta de largura constante em volta, e não leva moldura' } });
  }
  /* as duas portas traseiras ocupam um vão só, cuja borda é a volta das duas sem a fresta do meio */
  const [esq, dir] = ['portaTraseiraEsquerda', 'portaTraseiraDireita'].map((n) => portas.find((p) => p.nome === n).volta);
  const doMeio = new Set(esq.filter((n) => dir.includes(n)));
  const fora = (volta) => {
    const k0 = volta.findIndex((n, k) => doMeio.has(n) && !doMeio.has(volta[(k + 1) % volta.length]));
    const giro = [...volta.slice(k0), ...volta.slice(0, k0)];
    const fim = giro.findIndex((n, k) => k > 0 && doMeio.has(n));
    return giro.slice(0, fim + 1);
  };
  const a = fora(esq); const b = fora(dir);
  vaos.push({ nome: 'portasTraseiras', borda: [...a, ...b.slice(1, -1), a[0]], semMoldura: { motivo: 'é o vão das duas portas traseiras na carroceria; as portas o ocupam, com a fresta de largura constante em volta e entre elas' } });
  vaos.push({
    nome: 'baixo', borda: [...bordaDeBaixo, bordaDeBaixo[0]], frisos: ABAS_DOS_ARCOS,
    parcial: { motivo: 'é a borda de baixo da carroceria, aberta por baixo como a caixa de um furgão: as abas dos arcos cobrem só os quatro arcos, e a soleira, a frente e a traseira ficam para a faixa de baixo, os para-choques e o fundo da etapa 3' },
  });
  return vaos;
}

export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  const f = forma(T);
  const xDentro = T.bitola / 2 - T.pneu_largura / 2;
  const xFora = T.bitola / 2 + T.pneu_largura / 2;
  const r = T.pneu_diametro / 2;
  return [
    { nome: 'canto de cima da caixa da carroceria: a lateral, o teto e o nariz', parte: 'carroceria', medida: 'maximo', em: [f.xMax, T.altura, f.zFrente], toleranciaMm: tol },
    { nome: 'canto de baixo da caixa da carroceria: a lateral direita, a soleira e o para-choque de trás', parte: 'carroceria', medida: 'minimo', em: [-f.xMax, T.soleira_y, f.zTras], toleranciaMm: tol },
    { nome: 'pneu dianteiro esquerdo, embaixo, por dentro e atrás', parte: 'rodaProvisoriaDianteiraEsquerda', medida: 'minimo', em: [xDentro, 0, f.zD - r], toleranciaMm: tol },
    { nome: 'pneu traseiro direito, em cima, por dentro e na frente', parte: 'rodaProvisoriaTraseiraDireita', medida: 'maximo', em: [-xDentro, 2 * r, f.zT + r], toleranciaMm: tol },
    { nome: 'pneu traseiro direito, embaixo, por fora e atrás', parte: 'rodaProvisoriaTraseiraDireita', medida: 'minimo', em: [-xFora, 0, f.zT - r], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'furgao-realista', desc: 'furgão médio de teto alto com cabine de bico curto, etapa 2: a lataria em chapa contínua com as frestas das portas, o vinco de cintura, as nervuras do teto, as abas dos arcos e os vãos dos vidros abertos, e quatro rodas provisórias' },
  PARAMS: TABELA,
  MATERIAIS: {
    azul: { tipo: 'liso', cor: '#5d75c9' },
    pneu: { tipo: 'liso', cor: '#26262b' },
  },
  /* `origem` diz o referencial; os pontos da gaiola, derivados da TABELA atual, entram aqui pelo nome. */
  get TOPO() {
    return {
      origem: 'chão, no meio do furgão em x e em z; y para cima e a frente do furgão em +z',
      ...derivar(this.PARAMS).pontos,
    };
  },
  PLANO: {
    objeto: 'furgão médio de teto alto, etapa 2: lataria de 5400 por 2000 por 2500 mm em chapa contínua com as frestas das cinco portas, o vinco de cintura, as nervuras do teto, as abas dos arcos e os vãos dos vidros, e rodas provisórias',
    referencias: ['referencias/quatro-vistas.prancha.png', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total da carroceria, do nariz em z 2700 à traseira em z -2700', milimetros: 5400 },
    familia: 'veiculo',
    partes: [
      {
        nome: 'carroceria',
        forma: 'chapa de 2 mm da etapa 1 com frestas de 6 mm em volta fechada nas portas da cabine, na de correr à direita e nas traseiras; vinco de cintura raso em y 1050; dois sulcos no teto de cada lado; vãos abertos no para-brisa e nos vidros',
        tecnica: 'subdivisao sem simetria de anéis, ombro e cobertura, com colunas nas linhas das portas e arco de 475 nas rodas; volta de porta dividida meia fresta para cada lado, com a borda dobrada 4 mm numa tira de 5; vincos nas dobras',
      },
      ...ABAS_DOS_VAOS.map((nome) => ({
        nome,
        forma: `aba da borda do vão ${nome.replace('abaVao', '')}, dobrada para dentro a 90 graus com raio de 3 mm e perna de 20 mm, em volta do vão inteiro`,
        tecnica: 'friso com aba sobre a borda do vão, pelos nomes da gaiola',
      })),
      ...ABAS_DOS_ARCOS.map((nome) => ({
        nome,
        forma: `aba leve em volta do arco ${nome.includes('Dianteiro') ? 'dianteiro' : 'traseiro'} ${nome.endsWith('Esquerdo') ? 'esquerdo' : 'direito'}: lábio de 4 mm de altura sobre a lateral, 32 mm de largura no alto do arco e 16 nas pontas, afinando até sumir na soleira`,
        tecnica: 'friso de perfil desenhado sobre a borda do arco, com variacao da largura e pontas fechadas',
      })),
      ...RODAS.map((nome) => ({
        nome,
        forma: `roda provisória da etapa 1: cilindro de 710 mm de diâmetro e 225 de largura, na bitola de 1700 e no ${nome.includes('Dianteira') ? 'eixo dianteiro' : 'eixo traseiro'}, apoiado no chão; sai na etapa 4`,
        tecnica: 'lathe em torno de x de um retângulo, com 48 lados e sombreamento liso',
      })),
    ],
    criteriosDeReprovacao: [
      'a silhueta lateral, frontal ou de cima se afasta da prancha cotada mais de 15 mm em média ou 40 mm em algum ponto',
      'uma fresta de porta não fecha a volta, muda de largura ao longo dela ou sai da linha da prancha',
      'falta uma das cinco portas, ou a de correr aparece também do lado esquerdo',
      'um vão de vidro não fica aberto, ou a aba dele não cobre a borda inteira',
      'o vinco de cintura ou as nervuras do teto não aparecem na luz rasante, ou aparecem fortes como degrau',
      'a aba de um arco sobra solta da lateral ou não acompanha o arco inteiro',
      'a luz rasante ou a curvatura mostram amassado ou ondulação que a forma não pede, fora das frestas, dos vãos e dos vincos',
      'um pneu não toca o chão, ou toca ou atravessa o arco da roda ou a lateral',
      'alguma peça fica solta no ar ou atravessa outra sem motivo',
      'o lado esquerdo e o direito diferem fora da porta de correr',
      'aparece marca, logotipo ou nome de fabricante',
    ],
    lataria: { partes: ['carroceria'] },
  },
  contatos: CONTATOS,
  get vaos() { return vaosDeclarados(this.PARAMS); },
  ilhas: ILHAS,
  PONTOS: pontosDeclarados(TABELA),
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
