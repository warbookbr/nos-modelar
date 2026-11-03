/* furgao-realista — furgão médio de teto alto com cabine de bico curto, na etapa 3 de 7 da modelagem (plano
 * docs/modelar/planos/2026-10-30-furgao-realista.md, alinhamento no banco de provas furgao-realista-2026-10-30): a lataria
 * detalhada, refeita pela prancha ajustada de 2026-10-31 (a frente mais alta, o para-brisa que envolve as quinas, a curva do teto
 * de dois raios e os raios maiores nas quinas do teto, e o ajuste de largura de 2026-10-31, com as laterais fechando 3,9 graus acima do vinco de
 * cintura; ver "O ajuste da prancha" e "O ajuste de caráter da largura" em referencias/alvo.md). Sobre a chapa contínua da
 * etapa 1 (silhueta, raios e painéis da prancha cotada referencias/quatro-vistas.prancha.png, aceitos pela pessoa), esta etapa desenha as frestas das portas (as duas dianteiras da cabine, a de correr do lado direito e as
 * duas traseiras de abrir), o vinco de cintura discreto ao longo da lateral, as nervuras longitudinais do teto alto e a aba leve dos
 * quatro arcos das rodas, e abre na chapa os vãos do para-brisa, dos vidros das portas da cabine e dos das portas traseiras, cada um
 * com a aba dobrada para dentro conferida como moldura, cada canto cortado em diagonal para a subdivisão arredondá-lo. Os vidros e borrachas, as luzes e o
 * acabamento vêm nas etapas 5 a 7.
 *
 * Etapa 4, as rodas e o forro dos arcos: as quatro rodas saem da família `roda-pneu` (pneu 235/65 aro 16 com bojo e ombro, roda de chapa de aço com 5
 * parafusos), na bitola e nos eixos da prancha e apoiadas no chão, e cada arco ganha um forro escuro por dentro da chapa, a 25 mm do pneu, que fecha o oco
 * atrás da roda. A receita expande a chamada da família dentro de `gerarPassos`, soma uma base aos ids locais dela e põe o sufixo da roda nos nomes das
 * partes (pneu, aro, cubo, disco), como a hélice do avião faz com a pá; o forro é a mesma seção varrida em arco que a moldura.
 *
 * Etapa 3, o plástico de baixo, peça própria por fora da chapa (prancha de 2026-11-01): a saia de 299 a 463, que sai 20 mm da lateral, as
 * alargamento de 150 mm que sai 30 mm em volta dos quatro arcos (2026-11-02) e os para-choques, que saem 50 mm na frente e 110 atrás e dobram nas quinas. A chapa
 * da etapa 2 não muda, e o envelope passa de 5400 por 2000 a 5560 por 2060 (2040 na saia). Cada peça é a pele de uma seção da prancha (`TABELA.secao_*`,
 * [para fora da chapa, altura] em milímetro) varrida por um trilho e engrossada para dentro pela espessura do passo `subdivisao`, e o
 * trilho é a lateral reta (saia), o círculo da moldura em torno do eixo da roda ou a planta do para-choque (reta, quina e lateral).
 * A saia é cortada pelas frestas das portas, de 6 mm: cada porta leva o seu trecho, de 383 a 463; ficam presos os 299 a 377 sob as portas,
 * os trechos entre as portas e os arcos. A saia da porta da cabine vai até a fresta, que é a borda do alargamento. O alargamento de cada arco (escolha da pessoa em 2026-11-02) se funde ao
 * painel, sem linha na borda de fora e com o ressalto maior junto à boca: encosta na boca do arco, sem diminuí-la, com a borda dobrada 10 mm para
 * dentro do arco por trás da face da chapa, cobre a aba do arco passando 2 mm ou mais acima dela, fica cheio a 30 mm até 30 da boca e desce numa
 * curva que chega tangente à chapa, em 150. Acima da linha da saia e dos para-choques ele é a moldura, da cor da lataria, e acaba, de cada lado, numa
 * ponta horizontal da boca à borda de fora, no topo da peça escura vizinha (463 da saia, 580 do traseiro, 724 do dianteiro). Daí até 299 o mesmo
 * alargamento segue no plástico escuro como parte da própria saia e dos para-choques, na mesma malha e sem emenda: a superfície deles é a maior entre a
 * da peça e a do alargamento, até a boca. A fresta da porta da cabine contorna o arco dianteiro na borda de fora do alargamento, a 150 mm da boca (raio
 * 570), onde ele já é chapa. As frestas, os arcos e o para-brisa são os da chapa aceita.
 * O lugar da placa é um bolso de paredes vivas na reta de cada para-choque, e a faixa da entrada de ar é parte da seção do dianteiro.
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
 * verticais nas linhas das portas, e em volta de cada arco de roda um arco de raio 570 (o da porta da cabine, 150 mm fora do arco),
 * com os anéis de baixo concêntricos ao arco e os de cima terminando nele.
 *
 * As frestas. Cada porta é uma volta de arestas da gaiola na linha da prancha. Os pontos da volta se dividem, para cada lado, num
 * ponto de borda afastado meia fresta pela superfície e baixado para dentro, e num ponto de dentro, na superfície, com uma tira de
 * faces entre os dois: a porta vira um pedaço solto da mesma chapa, a fresta fica com a largura constante e a volta fechada, a borda
 * de cada lado dobra para dentro como numa porta de verdade, e a espessura fecha as duas bordas como as paredes da fresta. Sem a
 * dobra, a fresta plana só aparecia nas vistas onde o fundo se via por ela. A porta da cabine sobe a coluna do para-brisa sobre a
 * quina (a coluna `D`, que segue a linha da prancha a 122 mm do perfil do para-brisa, 100 mm atrás da ponta dobrada do vidro), desce vertical até o arco e contorna o arco por trás.
 */

import { gaiolaVarrida } from '../../nucleo/gaiola-varrida.js';
import { chamar, criarRegistroDeFamilias } from '../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../nucleo/composicoes.js';

export const TABELA = {
  // envelope da classe (prancha): 5400 de comprimento, 2000 de largura sem retrovisores, 2500 de altura, soleira em 300
  comprimento: 5400,
  meia_largura: 1000,
  altura: 2500,
  soleira_y: 300,

  // rodas e arcos: entre-eixos e balanço dianteiro (o traseiro sai da diferença), bitola, pneu 235/65 aro 16, arco com 65 mm de folga
  entre_eixos: 3300,
  balanco_dianteiro: 980,
  bitola: 1730, // a face de fora do pneu fica em x 982,5, 17,5 mm para dentro da lateral
  pneu_diametro: 710,
  pneu_largura: 235,
  arco_raio: 420,
  // a roda da família `roda-pneu`: o perfil dela (pneu com bojo, ombro e quatro sulcos ao longo da volta, roda de chapa de aço com 5 parafusos e 5 furos de
  // ventilação) e o assento do aro de 16 polegadas; o diâmetro e a largura do pneu são os da prancha (710 e 235), e não os 712 do perfil
  roda_perfil: 'furgao-235-65-r16',
  roda_assento: 406.4,
  // o forro dos arcos: a folga até o pneu, quanto ele passa da boca do arco para encostar na chapa, e o raio onde a parede de dentro acaba
  forro_folga: 25,
  forro_sobra: 8,
  forro_raio_fundo: 130,

  // perfil da frente, em [z, y]: nariz vertical até o topo do para-choque, degrau dele, boca do capô, capô curto, para-brisa e a curva
  // do teto (dois arcos tangentes, o de 1290 saindo do vidro e o de 405 chegando ao teto plano)
  raio_nariz_base: 50,
  parachoque_topo_y: 720,
  raio_parachoque_topo: 30,
  degrau_frente_recuo: 40,
  degrau_frente_y: 760,
  raio_degrau_frente: 10,
  capo_comprimento: 860, // em z, da boca ao pé do para-brisa; com a boca em 1100 e o pé em 1480 o capô fica a 23,8 graus
  boca_y: 1100,
  raio_boca: 20,
  base_vidro_recuo: 940, // do nariz ao pé do para-brisa, em z
  base_vidro_y: 1480,
  raio_base_vidro: 90,
  para_brisa_angulo: 55,
  topo_vidro_y: 2110,
  raio_arco_vidro: 1290, // da curva do teto, o arco que sai tangente ao para-brisa no topo do vidro
  raio_arco_testa: 405, // e o que chega ao teto plano (em z 770), tangente ao primeiro

  // perfil de trás: traseira vertical recuada sobre o degrau do para-choque, quina do teto com raio
  traseira_recuo: 30,
  degrau_tras_y: 570,
  degrau_tras_rampa: 20, // o degrau horizontal da prancha vira uma rampa curta, porque cada anel é uma fatia horizontal
  raio_traseira_base: 40,
  raio_quina_traseira: 180,

  // seção frontal, em [x, y]: lateral vertical em x 1000 até o vinco de cintura e fechando daí até o teto (3,9 graus), com a passagem
  // no vinco em raio 3000 e sem quina; o prolongamento chega ao teto em x 910 (1820 de largura), e a quina do teto tem raio 300
  lateral_reta_ate_y: 1190,
  meia_largura_no_teto: 910,
  raio_lateral: 3000,
  raio_ombro: 300,

  // planta: raio das quinas verticais na frente (do para-choque à coluna do para-brisa) e atrás, e na borda do teto plano
  raio_planta_frente: 280,
  raio_coluna_base: 160,
  raio_coluna_topo: 160, // a prancha dobra o para-brisa pela quina de raio 160 no pé e no topo
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
  colunas_do_capo_y: 720, // do anel do topo do para-choque em diante, três colunas da lateral andam junto com o fim da quina
  colunas_do_capo: 3,
  colunas_do_capo_passo: 60,
  passo_arco_graus: 3,
  tampas_aneis: 2, // quantos anéis acima do ponto do arco a tampa dele sobe antes de a coluna acabar, para o leque dos anéis ficar longe da fresta
  ombro_y: 2280,
  aneis_do_ombro: 6,

  // frestas das portas (prancha): largura da fresta; base das portas laterais; o arco da porta da cabine 160 mm fora do arco da roda (10 mm fora do alargamento);
  // a traseira da porta da cabine, o topo dela e a fresta da frente a 122 mm do perfil do para-brisa (100 mm atrás da ponta do vidro), medida na perpendicular à coluna; a coluna
  // do meio e a porta de correr; a base das portas traseiras e o topo delas, no anel do ombro que fica no fim da traseira vertical
  fresta: 6,
  fresta_borda_largura: 5, // a tira de cada lado da fresta, em que a borda dobra para dentro
  fresta_borda_queda: 4, // quanto a borda desce para dentro da superfície, na fresta: com a tira de 5 mm, 39 graus, acima do ângulo do sombreado liso
  fresta_borda_nitidez: 1, // o vinco vivo no começo da tira, que segura a dobra nela e deixa o painel plano até ela
  porta_base_y: 380,
  porta_folga_arco: 150, // a fresta da porta da cabine contorna o arco dianteiro a esta distância da boca: exatamente na borda de fora do alargamento, onde ele já é chapa
  porta_cabine_tras_z: 550,
  porta_cabine_topo_y: 2035,
  porta_fresta_coluna: 122,
  quina_fresta_ref: 30, // a linha que ordena as colunas da quina da frente, onde a fresta da porta corria antes de recuar (o para-brisa não mudou)
  p_inicio_y: 1330, // a partir daqui, e até o ombro, a quina ganha colunas entre E e D: p1 onde a D antiga ficava e as outras a passo_p
  passo_p: 30, // distância entre as colunas p
  para_brisa_topo_y: 2075, // o anel do topo do vão do para-brisa, que era o do topo da porta antes de ela descer
  coluna_do_meio: 110,
  porta_correr_largura: 1300,
  porta_correr_topo_y: 2200,
  porta_traseira_base_y: 600, // a prancha desenha 590; sobe 10 mm para a tira da fresta não encostar no degrau do para-choque em 580
  porta_traseira_topo_y: 2380, // no anel do ombro que cai no começo da quina de trás (2320), 10 mm para dentro da traseira vertical
  anel_porta_traseira: 2,

  // a coluna da fresta da frente na quina: quanto a quina fica para a frente dela e o mínimo da faixa de trás dela até a lateral
  recuo_quina_porta: 30,
  alcance_coluna_porta: 90,
  inicio_colunas_porta: 150,

  // vãos dos vidros (prancha): para-brisa (a base, 20 mm acima do pé; o topo é o anel do topo da porta da cabine; de lado ele acaba na
  // coluna q3 da quina, onde a prancha põe a ponta do vidro, a 100 mm da lateral), vidro da porta da cabine (base na altura do pé do
  // para-brisa, topo e moldura de trás; a frente é a quina da coluna), vidros das portas traseiras; e a aba dobrada de cada vão
  para_brisa_base_y: 1490, // a prancha desenha 1500 para o para-brisa e 1480 para o vidro da porta; com dois anéis a 20 mm um do outro a gaiola enche de anéis a 10 mm, que a aba do vão não dobra, e os dois ficam num anel só
  vidro_cabine_base_y: 1490,
  vidro_cabine_topo_y: 1960,
  moldura_vidro_cabine: 70,
  vidro_traseiro_base_y: 1700,
  vidro_traseiro_topo_y: 2200,
  vidro_traseiro_x_dentro: 80,
  vidro_traseiro_x_fora: 820,
  vidro_traseiro_folga_fora: 45, // a borda de fora da janela corre 45 mm para dentro da borda de fora da porta, que acompanha a lateral
  // cantos dos vãos: cada canto é cortado por uma diagonal de vao_canto_degraus células (cada célula da gaiola vira dois triângulos, e o
  // vão fica com um de cada), e o vidro da porta da cabine e os das portas traseiras ganham colunas a esse passo junto de cada borda
  vao_canto_degraus: 2,
  vao_canto_passo_cabine: 28,
  vao_canto_passo_traseiro: 25,
  aba_vao_largura: 20,
  aba_vao_raio: 3,
  aba_vao_angulo: 90,

  // vinco de cintura: altura (sobe com o pé do para-brisa, 1480 sobre 1310), meia largura da dobra, profundidade, recuo das quinas e
  // rampa das pontas
  cintura_y: 1190,
  cintura_meia_largura: 40,
  cintura_profundidade: 2,
  cintura_recuo: 40,
  cintura_rampa: 150,

  // coroa da frente: o capô e o para-brisa abaulam em x, com a borda mais alta no meio. A flecha é quanto a ponta do vidro (a coluna q3
  // da quina) fica abaixo do meio, em y; ela cresce do zero na boca do capô até a flecha da base do vão, passa à da borda de cima do
  // vão e some até o teto plano. O abaulamento acaba na coluna D da fresta da porta, que fica na altura do anel.
  flecha_capo_base: 28,
  flecha_vidro_topo: 50,

  // nervuras do teto: dois sulcos de cada lado, com o centro em x, a meia largura, a profundidade, o recuo das bordas do teto, a
  // rampa das pontas e a nitidez das dobras
  nervura_1_x: 190,
  nervura_2_x: 420,
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

  // o anel do topo da saia, que é o da base do plástico: a chapa não cede nada ao plástico, mas a gaiola tem anel ali (460) e nenhum de
  // enchimento a menos de folga_faixa_topo dele
  faixa_topo_y: 460,
  folga_faixa_topo: 25,

  // plástico de baixo (etapa 3), por fora da chapa, pelas seções da prancha (2026-11-01), cada ponto [para fora da chapa, altura] em mm
  // A saia sai 20 mm da lateral, o alargamento dos arcos 30, o dianteiro 50 e o traseiro 110.
  secao_saia: [[0, 299], [10, 303], [17, 312], [20, 326], [20, 440], [18, 450], [13, 457], [6, 461], [0, 463]],
  // O alargamento dos quatro arcos (2026-11-02) é um perfil só, em volta toda, que se funde ao painel: a subida [para fora, distância da boca do arco]
  // (o ponto de "para fora" negativo é a borda dobrada para dentro do arco, e o ressalto cheio fica a 30 mm até 30 mm da boca) e uma descida em curva
  // u = saida (1 − 3p² + 2p³), de p = 0 no ressalto a p = 1 na chapa, com a distância da boca indo de 30 a 150 e a tangente horizontal nas duas pontas.
  secao_moldura_subida: [[-10, 0], [0, 0], [12, 2], [21, 6], [27, 12], [30, 20], [30, 30]],
  moldura_saida: 30,
  moldura_descida_passos: 12,
  moldura_largura: 150,
  // Acima da linha da saia e dos para-choques ele é da cor da lataria (as molduras) e acaba, de cada lado do arco, numa ponta horizontal da boca à borda de
  // fora, na altura do topo da peça escura vizinha (o da saia, o do para-choque dianteiro à frente do arco dianteiro e o do traseiro atrás do arco
  // traseiro). Daí até 299 o mesmo alargamento segue na saia e nos para-choques, na mesma malha: a superfície deles é a maior entre a da peça e a do alargamento.
  secao_parachoque_dianteiro: [[0, 300], [15, 302], [30, 320], [42, 350], [46, 375], [44, 382], [30, 388], [30, 482], [44, 488], [50, 500], [50, 670], [47, 695], [38, 712], [22, 720], [0, 724]],
  secao_parachoque_traseiro: [[0, 300], [60, 302], [95, 312], [108, 330], [110, 350], [110, 560], [108, 570], [102, 577], [92, 580]],
  parachoque_dianteiro_vincos: [388, 482], // as alturas das linhas da seção que levam vinco vivo (os degraus da faixa da entrada de ar)
  parachoque_traseiro_vincos: [580], // a borda do degrau de carga
  plastico_espessura: 2,
  plastico_penetracao: 1, // quanto a borda que encosta na chapa entra nela
  plastico_passo_y: 40, // a distância máxima, em altura, entre as linhas da seção da saia e dos para-choques, para a ponta acompanhar o círculo da boca
  plastico_base_y: 299, // o fundo da saia
  moldura_passo_graus: 5,
  saia_passo: 130,
  parachoque_estacoes_lado: 4,
  parachoque_estacoes_quina: 8,
  parachoque_passo_x: 100,
  // lugares da placa (400 por 130), como bolsos nas retas dos para-choques, com o fundo recuado da superfície
  placa_meia_largura: 200,
  placa_dianteira_y0: 520,
  placa_traseira_y0: 380,
  placa_altura: 130,
  placa_fundo: 8,
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
  const boca = [baseVidro[0] + T.capo_comprimento, T.boca_y];
  const topoVidro = [baseVidro[0] - (T.topo_vidro_y - baseVidro[1]) / Math.tan(T.para_brisa_angulo * grau), T.topo_vidro_y];
  const anguloCapo = Math.atan2(baseVidro[1] - boca[1], boca[0] - baseVidro[0]) / grau;
  const frenteDensa = contornoComRaios([
    [zFrente - 4 * T.raio_nariz_base, ys], [zFrente, ys, T.raio_nariz_base], [zFrente, T.parachoque_topo_y, T.raio_parachoque_topo],
    [zFrente - T.degrau_frente_recuo, T.degrau_frente_y, T.raio_degrau_frente], [...boca, T.raio_boca], [...baseVidro, T.raio_base_vidro],
    [...topoVidro],
  ]);
  /* o perfil começa no pé do raio do nariz (o trecho reto da soleira fica de fora) */
  const frenteAteVidro = frenteDensa.slice(frenteDensa.findIndex((p) => p[0] > zFrente - T.raio_nariz_base - 1e-6));
  /* A curva do teto sobre o para-brisa: dois arcos tangentes, o de raio_arco_vidro saindo do para-brisa no topo do vidro e o de
     raio_arco_testa chegando ao teto plano, que somam os 55 graus do para-brisa. O filete não desenha dois raios emendados, então os
     arcos são calculados aqui: o ângulo da emenda sai da subida que falta até o teto. Uma direção é o ângulo do trecho, de 0 (para a
     frente) a 180 graus (para trás); no para-brisa ela é 180 menos o ângulo do vidro. */
  const dirVidro = Math.PI - T.para_brisa_angulo * grau;
  const cosEmenda = ((T.altura - T.topo_vidro_y) - T.raio_arco_testa - T.raio_arco_vidro * Math.cos(dirVidro)) / (T.raio_arco_testa - T.raio_arco_vidro);
  if (!(Math.abs(cosEmenda) <= 1)) throw new Error('furgao-realista: os dois raios da curva do teto não fecham a subida até o teto');
  const dirEmenda = Math.acos(cosEmenda);
  if (dirEmenda <= dirVidro || dirEmenda >= Math.PI) throw new Error('furgao-realista: a emenda dos dois raios da curva do teto sai fora da curva');
  const arcoTangente = (inicio, r, a, b) => {
    const n = Math.max(2, Math.ceil(Math.abs(b - a) / grau));
    return Array.from({ length: n }, (_, k) => {
      const t = a + ((b - a) * (k + 1)) / n;
      return [inicio[0] + r * (Math.sin(t) - Math.sin(a)), inicio[1] + r * (Math.cos(a) - Math.cos(t))];
    });
  };
  const arcoVidro = arcoTangente(topoVidro, T.raio_arco_vidro, dirVidro, dirEmenda);
  const arcoTesta = arcoTangente(arcoVidro.at(-1), T.raio_arco_testa, dirEmenda, Math.PI);
  const testa = arcoTesta.at(-1);
  if (Math.abs(testa[1] - T.altura) > 0.5) throw new Error(`furgao-realista: a curva do teto chega em ${testa[1].toFixed(1)}, e não no teto`);
  testa[1] = T.altura;
  const perfilFrente = [...frenteAteVidro, ...arcoVidro, ...arcoTesta.slice(0, -1), testa];
  const zTetoFrente = testa[0];

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

  /* A borda de fora das portas traseiras, que é o começo da quina de trás: 900 até o vinco de cintura, e daí a lateral prolongada
     (reta do vinco ao teto, sem o raio de 3000 que tira menos de 2 mm dela) menos o raio da quina de trás vista de cima, sempre
     100 mm para dentro dela. */
  const xLinhaDaLateral = (y) => (y <= T.lateral_reta_ate_y ? xMax : xMax - ((xMax - T.meia_largura_no_teto) * (y - T.lateral_reta_ate_y)) / (T.altura - T.lateral_reta_ate_y));
  const xBordaTraseira = (y) => xLinhaDaLateral(y) - T.raio_planta_tras;

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
  /* A mesma linha a quina_fresta_ref atrás do perfil, que ordena as colunas q1 a q3 e E da quina da frente (e com elas as pontas do vão do para-brisa): ela ficou onde a fresta da porta corria na etapa 2, e a fresta da porta recuou sem levar o para-brisa. */
  const pePortaQuina = [baseVidro[0] - T.quina_fresta_ref * Math.sin(pb), baseVidro[1] - T.quina_fresta_ref * Math.cos(pb)];
  const zFrestaQuina = (y) => (y <= pePortaQuina[1] ? pePortaQuina[0] : zLinhaVidro(y) - T.quina_fresta_ref / Math.sin(pb));
  return {
    zFrente, zTras, xMax, ys, zD, zT, rPneu, dzArco, boca, baseVidro, topoVidro, testa, pePorta, pePortaQuina, zFrestaQuina, anguloCapo,
    perfilFrente, perfilTras, perfilLado, zTetoFrente, zTetoTras, xTetoLado, raioFrente, zFrestaFrente, xBordaTraseira,
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
    ['soleira', f.ys], ['portaBase', T.porta_base_y], ['faixaTopo', T.faixa_topo_y], ['degrauTras', T.degrau_tras_y - T.degrau_tras_rampa / 2],
    ['degrauTrasTopo', T.degrau_tras_y + T.degrau_tras_rampa / 2], ['portaTraseiraBase', T.porta_traseira_base_y],
    ['parachoque', T.parachoque_topo_y], ['degrauFrente', T.degrau_frente_y], ['boca', f.boca[1]],
    ['cinturaBaixo', c - h], ['cintura', c], ['cinturaCima', c + h],
    ['paraBrisaBase', T.para_brisa_base_y], ['vidroCabineBase', T.vidro_cabine_base_y],
    ['retaLateral', T.lateral_reta_ate_y], ['vidroTraseiroBase', T.vidro_traseiro_base_y], ['vidroCabineTopo', T.vidro_cabine_topo_y],
    ['portaCabineTopo', T.porta_cabine_topo_y], ['paraBrisaTopo', T.para_brisa_topo_y], ['topoVidro', f.topoVidro[1]], ['portaCorrerTopo', T.porta_correr_topo_y],
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
  const aceitar = (y) => { const v = foraDasFaixas(y); if (alturas.every((a) => Math.abs(a - v) >= T.folga_entre_aneis) && Math.abs(v - T.faixa_topo_y) >= T.folga_faixa_topo) alturas.push(v); };
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
  return { yF: y, zF: f.zF(y), xS: f.xs(y), yS: y, yR: y, zR: f.zR(y), rF: f.raioFrente(y), rB: f.xs(y) - f.xBordaTraseira(y) };
}

/* Os anéis do ombro: cada trecho (frente, lateral e traseira) sobe o seu raio, da altura do ombro ao teto plano. A frente e a
   lateral andam frações iguais do arco; a traseira põe o anel `anel_porta_traseira` no topo das portas traseiras, ainda na parte
   vertical, e reparte o resto. */
function aneisDoOmbro(T, f) {
  const trecho = (perfil) => { const { pl } = aPartirDe(perfil, T.ombro_y); const s = acumulado(pl); return { at: (d) => pontoNaDistancia(pl, s, d), L: s.at(-1) }; };
  const fr = trecho(f.perfilFrente); const tr = trecho(f.perfilTras); const la = trecho(f.perfilLado);
  const n = T.aneis_do_ombro; const kT = T.anel_porta_traseira;
  /* o topo das portas traseiras fica no começo da quina de trás, no máximo 12 mm para dentro da traseira vertical; a distância do
     anel do ombro até ele é medida ao longo do perfil */
  const dTopo = (() => {
    const { pl } = aPartirDe(f.perfilTras, T.ombro_y); const s = acumulado(pl);
    const k = pl.findIndex((p) => p[1] >= T.porta_traseira_topo_y);
    if (k < 1) throw new Error('furgao-realista: o perfil de trás não chega ao topo das portas traseiras');
    const t = (T.porta_traseira_topo_y - pl[k - 1][1]) / (pl[k][1] - pl[k - 1][1]);
    return lerp(s[k - 1], s[k], t);
  })();
  if (!(dTopo > 0 && f.zR(T.ombro_y) - f.zR(T.porta_traseira_topo_y) < 12)) throw new Error('furgao-realista: o topo das portas traseiras precisa ficar acima do ombro e a menos de 12 mm da traseira vertical');
  const rF0 = f.raioFrente(T.ombro_y);
  /* até o anel do topo das portas traseiras, o começo da quina de trás segue a lateral prolongada, para a fresta de fora das portas
     traseiras não entortar no alto; dali ao teto o raio fecha até o da borda do teto */
  const xTrasReta = (y) => f.xBordaTraseira(y);
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

/* ---------- o plástico de baixo ---------- */

/* Insere nas alturas `ys` os pontos que faltam numa seção [[u, y]] (y crescente), na reta entre os vizinhos. */
function comAlturas(secao, ys) {
  const s = secao.map((p) => [...p]);
  for (const y of ys) {
    if (s.some((p) => Math.abs(p[1] - y) < 1e-9)) continue;
    const k = s.findIndex((p, i) => i + 1 < s.length && y > p[1] && y < s[i + 1][1]);
    if (k < 0) throw new Error(`furgao-realista: a seção não passa pela altura ${y}`);
    const [u0, y0] = s[k]; const [u1, y1] = s[k + 1];
    s.splice(k + 1, 0, [lerp(u0, u1, (y - y0) / (y1 - y0)), y]);
  }
  return s;
}

/* Reparte os trechos da seção [[u, y]] mais longos que `passo` em altura, na reta entre os vizinhos, sem mudar a forma. A saia e os
   para-choques acabam na boca do arco, que é um círculo: com poucas linhas a aresta de ponta vira uma corda e entra na boca. */
function adensar(secao, passo) {
  const s = [secao[0]];
  for (let i = 1; i < secao.length; i += 1) {
    const [u0, y0] = secao[i - 1]; const [u1, y1] = secao[i];
    const n = Math.ceil(Math.abs(y1 - y0) / passo - 1e-9);
    for (let k = 1; k < n; k += 1) s.push([lerp(u0, u1, k / n), lerp(y0, y1, k / n)]);
    s.push(secao[i]);
  }
  return s;
}

/**
 * Uma grade de quadriláteros varrida: `estacoes` ao longo do trilho e `linhas` ao longo da seção, com a posição de cada vértice dada por
 * `posicao(estacao, linha)`. `manter(i, j)` tira células. A orientação sai pela dica, que dá para cada face o lado de fora; `vincosEm`
 * são os índices das linhas que levam vinco vivo ao longo do trilho.
 */
function construirGrade({ nome, estacoes, linhas, posicao, manter = () => true, dica, vincosEm = [] }) {
  const nomeDe = (i, j) => `${nome}_${i}_${j}`;
  const pos = new Map();
  estacoes.forEach((e, i) => linhas.forEach((l, j) => pos.set(nomeDe(i, j), posicao(e, l))));
  let faces = [];
  for (let i = 0; i + 1 < estacoes.length; i += 1) {
    for (let j = 0; j + 1 < linhas.length; j += 1) {
      if (manter(i, j)) faces.push([nomeDe(i, j), nomeDe(i + 1, j), nomeDe(i + 1, j + 1), nomeDe(i, j + 1)]);
    }
  }
  let placar = 0;
  for (const fc of faces) {
    const ps = fc.map((n) => pos.get(n));
    let nx = 0; let ny = 0; let nz = 0;
    ps.forEach((p, k) => { const q = ps[(k + 1) % ps.length]; nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1]); });
    const c = ps.reduce((s, p) => [s[0] + p[0] / ps.length, s[1] + p[1] / ps.length, s[2] + p[2] / ps.length], [0, 0, 0]);
    const h = dica(c);
    placar += Math.sign(nx * h[0] + ny * h[1] + nz * h[2]);
  }
  if (placar < 0) faces = faces.map((fc) => [...fc].reverse());
  const vincos = vincosEm.map((j) => ({ nome: `${nome}Linha${j}`, pontos: estacoes.map((_, i) => nomeDe(i, j)), nitidez: 'viva' }));
  return { faces, pos, vincos };
}

/* Um bolso nas faces da grade cujos vértices caem todos na região: os vértices dela recuam `fundo` na direção `dir`, e as paredes ligam a
   borda do bolso ao fundo. As voltas da borda e do fundo levam vinco vivo. */
function abrirBolso(grade, { nome, dentro, fundo, dir }) {
  const chv = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const emBolso = grade.faces.filter((fc) => fc.every((n) => dentro(grade.pos.get(n))));
  if (!emBolso.length) throw new Error(`furgao-realista: o bolso ${nome} não pegou nenhuma face`);
  const set = new Set(emBolso);
  const resto = grade.faces.filter((fc) => !set.has(fc));
  const arestasDoResto = new Set();
  resto.forEach((fc) => fc.forEach((n, k) => arestasDoResto.add(chv(n, fc[(k + 1) % fc.length]))));
  const borda = [];
  emBolso.forEach((fc) => fc.forEach((n, k) => { const o = fc[(k + 1) % fc.length]; if (arestasDoResto.has(chv(n, o))) borda.push([n, o]); }));
  const fundoDe = (n) => `${n}_${nome}`;
  new Set(emBolso.flat()).forEach((n) => { const p = grade.pos.get(n); grade.pos.set(fundoDe(n), [p[0] + dir[0] * fundo, p[1] + dir[1] * fundo, p[2] + dir[2] * fundo]); });
  grade.faces = [...resto, ...emBolso.map((fc) => fc.map(fundoDe)), ...borda.map(([a, c]) => [a, c, fundoDe(c), fundoDe(a)])];
  const proximo = new Map(borda); const usadas = new Set();
  let k = 0;
  for (const [a] of borda) {
    if (usadas.has(a)) continue;
    const pts = []; let n = a;
    while (!usadas.has(n)) { usadas.add(n); pts.push(n); n = proximo.get(n); }
    pts.push(pts[0]);
    grade.vincos.push({ nome: `${nome}Borda${k}`, pontos: pts, nitidez: 'viva' }, { nome: `${nome}Fundo${k}`, pontos: pts.map(fundoDe), nitidez: 'viva' });
    k += 1;
  }
}

/* A peça pronta para o passo `subdivisao`: vértices usados, faces e os vincos que ficaram em arestas de duas faces. */
function fecharPeca(nome, grades) {
  const chv = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const faces = grades.flatMap((g) => g.faces);
  const pos = new Map(grades.flatMap((g) => [...g.pos]));
  const arestas = new Map();
  faces.forEach((fc) => fc.forEach((n, i) => { const c = chv(n, fc[(i + 1) % fc.length]); arestas.set(c, (arestas.get(c) ?? 0) + 1); }));
  const vincos = [];
  for (const v of grades.flatMap((g) => g.vincos)) {
    let corrida = [v.pontos[0]]; let k = 0;
    const fechar = () => { if (corrida.length > 1) { vincos.push({ nome: `${v.nome}_${k}`, pontos: corrida, nitidez: v.nitidez }); k += 1; } };
    for (let i = 0; i + 1 < v.pontos.length; i += 1) {
      if (arestas.get(chv(v.pontos[i], v.pontos[i + 1])) === 2) corrida.push(v.pontos[i + 1]); else { fechar(); corrida = [v.pontos[i + 1]]; }
    }
    fechar();
  }
  const vertices = [...new Set(faces.flat())].sort();
  return { nome, vertices, faces, vincos, cantos: [], posicoes: new Map(vertices.map((n) => [n, pos.get(n)])) };
}

/* As estações de um para-choque, da ponta de trás do lado -x à do lado +x: a lateral, a quina, a reta da frente (ou da traseira), a quina
   e a lateral. A reta tem as estações a passo_x e as do lugar da placa; a quina e a lateral, as dadas. */
function estacoesDoParachoque(T, xReta, xPlaca, dsAlarg = []) {
  const nL = T.parachoque_estacoes_lado; const nQ = T.parachoque_estacoes_quina;
  const n = Math.round((2 * xReta) / T.parachoque_passo_x);
  /* as estações da reta são frações da meia largura dela, que na traseira muda com a saída da seção; xPlaca é a fração em que cai o lugar da placa */
  const xs = [...new Set([...Array.from({ length: n + 1 }, (_, k) => -1 + (2 * k) / n), -xPlaca, xPlaca])].sort((a, b) => a - b);
  const lado = (s, ts) => ts.map((t) => ({ tipo: 'lado', s, t }));
  const quina = (s, fs) => fs.map((fi) => ({ tipo: 'quina', s, phi: fi * (Math.PI / 2) }));
  const de = (n) => Array.from({ length: n }, (_, k) => (k + 1) / n);
  /* nas pontas da lateral, as estações do alargamento, da boca do arco para fora de um lado e para dentro do outro */
  const alarg = (s, ds) => ds.map((d) => ({ tipo: 'alargamento', s, d }));
  return [
    ...alarg(-1, dsAlarg), ...lado(-1, de(nL).reverse()), ...quina(-1, de(nQ).reverse()),
    ...xs.map((fr) => ({ tipo: 'reta', fr })),
    ...quina(1, de(nQ)), ...lado(1, de(nL)), ...alarg(1, dsAlarg.slice().reverse()),
  ];
}

/**
 * derivarPlastico(T, f) -> as peças de plástico por fora da chapa, cada uma com vértices, faces, vincos e posições em milímetro.
 *   A saia (sai 20 mm da lateral, de 299 a 463) é cortada pelas frestas das portas: cada porta leva o seu trecho, de 380 a 463, e a
 *   parte de 299 a 380 sob as portas, os trechos entre as portas e os arcos e o trecho junto ao arco dianteiro ficam presos, e vão até a boca
 *   dos arcos. A moldura de cada arco sai 20 mm, da boca para fora, com a largura que varia pelo ângulo, e acaba em pontas horizontais no topo
 *   das peças escuras vizinhas. Os para-choques saem 50 mm na frente e 110 atrás e dobram nas quinas até a boca do arco, reduzindo a saída para
 *   a da saia na lateral. Cada peça é a pele de fora da seção da prancha, varrida pelo trilho, e a espessura do passo a engrossa para dentro,
 *   para a chapa.
 */
export function derivarPlastico(T, f) {
  const yc = f.rPneu;
  const pen = T.plastico_penetracao;
  const raioPorta = T.arco_raio + T.porta_folga_arco;
  const dzDe = (r) => (y) => Math.sqrt(r ** 2 - (y - yc) ** 2);
  const saida = (sec) => Math.max(...sec.map(([u]) => u));
  const kLado = saida(T.secao_saia) / saida(T.secao_parachoque_dianteiro);
  const kLadoTras = saida(T.secao_saia) / saida(T.secao_parachoque_traseiro);
  const baixoPortas = T.porta_base_y - T.fresta / 2; const cimaPortas = T.porta_base_y + T.fresta / 2;
  const lados = [['Esquerda', 1], ['Direita', -1]];
  /* os pontos de seção que tocam a chapa (u = 0) entram na chapa por `pen` */
  const tocaChapa = (l) => (Math.abs(l.u) < 1e-9 ? { ...l, u: -pen } : l);
  const zT = f.zT; const zD = f.zD;
  const portaTras = T.porta_cabine_tras_z;
  const correrFrente = portaTras - T.coluna_do_meio; const correrTras = correrFrente - T.porta_correr_largura;
  const meia = T.fresta / 2;
  const partes = [];

  /* O alargamento dos arcos: a subida e a descida em curva da prancha, que dão a saída u a cada distância d da boca. */
  const ressalto = T.secao_moldura_subida.at(-1)[1];
  const larguraAlarg = T.moldura_largura;
  const saidaAlarg = (d) => {
    if (d <= 0 || d >= larguraAlarg) return 0;
    if (d <= ressalto) {
      const sub = T.secao_moldura_subida.slice(1);
      const k = sub.findIndex(([, dd]) => dd >= d);
      const [u0, d0] = sub[k - 1]; const [u1, d1] = sub[k];
      return lerp(u0, u1, (d - d0) / (d1 - d0));
    }
    const q = (d - ressalto) / (larguraAlarg - ressalto);
    return T.moldura_saida * (1 - 3 * q ** 2 + 2 * q ** 3);
  };
  /* A continuação escura do alargamento é parte da saia e dos para-choques, na mesma malha, sem emenda: junto do arco a superfície deles é a maior entre a
     da própria peça e a do alargamento (a saída dele a d da boca), e a borda de baixo é rolada como a da saia, na razão das saídas (30 sobre 20). Onde o
     alargamento chega à chapa, a 150 mm da boca, a superfície é a da peça: ali a malha da faixa do arco encontra a da saia, nos mesmos pontos. As faixas
     têm uma estação a cada distância d da boca que o perfil do alargamento tem. */
  const rJoin = T.arco_raio + larguraAlarg;
  const dzJoin = dzDe(rJoin);
  const dsAlarg = [...new Set([
    ...T.secao_moldura_subida.slice(1).map(([, d]) => d),
    ...Array.from({ length: T.moldura_descida_passos - 1 }, (_, i) => ressalto + ((i + 1) / T.moldura_descida_passos) * (larguraAlarg - ressalto)),
  ])];
  const iRolo = T.secao_saia.findIndex(([u]) => u === saida(T.secao_saia));
  const yRolo = T.secao_saia[iRolo][1];
  const razaoRolo = T.moldura_saida / saida(T.secao_saia);
  const uDaSaia = (y) => {
    const k = T.secao_saia.findIndex(([, yy], i) => i + 1 < T.secao_saia.length && y >= yy && y <= T.secao_saia[i + 1][1]);
    const [u0, y0] = T.secao_saia[k]; const [u1, y1] = T.secao_saia[k + 1];
    return lerp(u0, u1, (y - y0) / (y1 - y0));
  };
  /* a saída da superfície a d da boca, na altura y, para uma linha de seção de saída própria uPropria; as linhas que encostam na chapa ficam nela, menos a de
     cima (topo), que sobe com o alargamento: a borda de cima fica aberta, na altura da ponta da moldura, e não volta à chapa em degrau */
  const uContinua = (d, y, uPropria, topo = false) => {
    if (uPropria <= 1e-9 && !topo) return uPropria;
    const uf = Math.min(Math.max(saidaAlarg(d), uPropria), y < yRolo ? razaoRolo * uDaSaia(y) : Infinity);
    return Math.abs(uf) < 1e-9 ? -pen : uf;
  };

  /* A peça pronta de uma gaiola varrida: os campos do passo `subdivisao` e as posições em milímetro. */
  const daVarredura = (g) => ({ nome: g.nome, vertices: g.vertices, faces: g.faces, vincos: g.vincos, cantos: g.cantos, posicoes: g.posicoes });
  const EIXO_X = [1, 0, 0];
  /* o marco de corte na distância r do eixo de um arco: a linha chega a ele subindo (atrás do arco, vindo do eixo) ou descendo (na frente dele) */
  const marcoDoArco = (zc, r, cruzando, nome) => ({ cilindro: { eixo: EIXO_X, por: [0, yc, zc], raio: r }, cruzando, ...(nome ? { nome } : {}) });

  /* ---- a saia ---- */
  const secaoSaia = adensar(comAlturas(T.secao_saia, [baixoPortas, cimaPortas]), T.plastico_passo_y).map(([u, y]) => tocaChapa({ u, y }));
  const iBaixo = secaoSaia.findIndex((l) => Math.abs(l.y - baixoPortas) < 1e-9);
  const iCima = secaoSaia.findIndex((l) => Math.abs(l.y - cimaPortas) < 1e-9);
  /* as linhas da seção, com o nome das que os cortes e os recortes citam: a de baixo da base das portas, a de cima dela e a do topo */
  const linhasDaSaia = secaoSaia.map((l, j) => ({ u: l.u, v: l.y, ...(j === iBaixo ? { nome: 'baixoPorta' } : j === iCima ? { nome: 'cimaPorta' } : j === secaoSaia.length - 1 ? { nome: 'topo' } : {}) }));
  /* o alargamento de cada arco, em volta do eixo da roda: a saída u do perfil em cada distância d da boca, em reta entre as estações, e zero a partir de um
     ponto entre a última estação e a fresta da porta; a borda de baixo é rolada e a de cima fica aberta */
  const perfilAlarg = [...dsAlarg.map((d) => [d, saidaAlarg(d)]), [(dsAlarg.at(-1) + (larguraAlarg - T.fresta / 2)) / 2, 0]];
  const alargamentos = [zT, zD].map((zc) => ({ campo: { cilindro: { eixo: EIXO_X, por: [0, yc, zc], raio: T.arco_raio } }, perfil: perfilAlarg, topoAberto: true, rolada: { abaixoDe: yRolo, razao: razaoRolo } }));
  const passoDaSaia = { passo: T.saia_passo, linha: 'cimaPorta' };
  for (const [lado, s] of lados) {
    const trilhoDe = (de, ate) => [{ reta: { de: [s * 1000, 0, de], ate: [s * 1000, 0, ate] } }];
    const quadro = s > 0 ? { u: [s, 0, 0] } : { u: [s, 0, 0], virar: true };
    const emZ = (z, nome) => ({ em: z - zT, nome });
    /* os cortes em z, de trás para a frente: a saia começa na borda de fora do alargamento do arco traseiro e acaba na fresta da porta da cabine, e dali, em cada
       arco, as estações do alargamento vão até a boca, na mesma malha: não há trecho preso entre a fresta e o alargamento. As portas levam só a saia de baixo. */
    const frestaD = marcoDoArco(zD, raioPorta - T.fresta / 2, 'descendo', 'frestaDaPorta');
    const meio = s < 0
      ? [emZ(correrTras - meia, 'trasDaCorrer'), passoDaSaia, emZ(correrFrente + meia, 'frenteDaCorrer'), passoDaSaia, emZ(portaTras - meia, 'trasDaCabine'), passoDaSaia]
      : [emZ(portaTras - meia, 'trasDaCabine'), passoDaSaia];
    const presa = gaiolaVarrida({
      nome: `saiaPresa${lado}`, trilho: trilhoDe(zT, zD), quadro, secao: linhasDaSaia, fora: [s, 0, 0], alargamento: alargamentos,
      estacoes: [
        ...dsAlarg.map((d) => marcoDoArco(zT, T.arco_raio + d, 'subindo')), marcoDoArco(zT, rJoin, 'subindo'), passoDaSaia,
        ...meio, frestaD,
        ...dsAlarg.slice().reverse().map((d) => marcoDoArco(zD, T.arco_raio + d, 'descendo')),
      ],
      remover: [...(s < 0 ? [{ estacoes: ['trasDaCorrer', 'frenteDaCorrer'], linhas: ['baixoPorta', 'topo'] }] : []), { estacoes: ['trasDaCabine', 'frestaDaPorta'], linhas: ['baixoPorta', 'topo'] }],
    });
    partes.push(daVarredura(presa));
    /* o trecho de cada porta, de 383 a 463: a porta da cabine acaba na fresta, na borda do alargamento */
    const linhasDaPorta = linhasDaSaia.slice(iCima);
    const portas = [
      ...(s < 0 ? [{ rotulo: 'PortaCorrer', de: correrTras + meia, ate: correrFrente - meia, fim: { fracao: 1 } }] : []),
      { rotulo: `PortaCabine${lado}`, de: portaTras + meia, ate: zD, fim: marcoDoArco(zD, raioPorta + T.fresta / 2, 'descendo') },
    ];
    for (const { rotulo, de, ate, fim } of portas) {
      const g = gaiolaVarrida({ nome: `saia${rotulo}`, trilho: trilhoDe(de, ate), quadro, secao: linhasDaPorta, fora: [s, 0, 0], estacoes: [{ fracao: 0 }, passoDaSaia, fim] });
      partes.push(daVarredura(g));
    }
  }

  /* ---- as molduras dos arcos: o alargamento da cor da lataria acima das pontas, em torno do eixo da roda (abaixo delas ele é a saia e os para-choques) ---- */
  const topo = (sec) => Math.max(...sec.map(([, y]) => y));
  const topoSaia = topo(T.secao_saia); const topoDiant = topo(T.secao_parachoque_dianteiro); const topoTras = topo(T.secao_parachoque_traseiro);
  const secaoMoldura = [
    ...T.secao_moldura_subida.map(([u, d]) => ({ u, d })),
    ...Array.from({ length: T.moldura_descida_passos }, (_, i) => {
      const q = (i + 1) / T.moldura_descida_passos;
      return { u: T.moldura_saida * (1 - 3 * q ** 2 + 2 * q ** 3), d: ressalto + q * (larguraAlarg - ressalto) };
    }),
  ].map(tocaChapa).map((l, j) => ({ u: l.u, v: l.d, ...(j === 1 ? { nome: 'boca' } : {}) }));
  /* as pontas: cada moldura acaba, de cada lado do arco, numa ponta horizontal da boca à borda de fora, na altura do topo da peça escura vizinha */
  const pontas = { [zT]: { tras: topoTras, frente: topoSaia }, [zD]: { tras: topoSaia, frente: topoDiant } };
  const passoDaMoldura = { passo: T.arco_raio * ((T.moldura_passo_graus * Math.PI) / 180), linha: 'boca' };
  for (const [zc, rotulo] of [[zD, 'Dianteiro'], [zT, 'Traseiro']]) {
    for (const [lado, s] of lados) {
      const nome = `moldura${rotulo === 'Dianteiro' ? 'ArcoDianteiro' : 'ArcoTraseiro'}${lado === 'Esquerda' ? 'Esquerdo' : 'Direito'}`;
      const g = gaiolaVarrida({
        nome, trilho: [{ arco: { centro: [s * 1000, yc, zc], eixo: EIXO_X, de: [s * 1000, yc, zc + T.arco_raio], graus: -200 } }],
        quadro: s > 0 ? { u: [s, 0, 0], virar: true } : { u: [s, 0, 0] }, secao: secaoMoldura, fora: [s, 0, 0],
        estacoes: [{ plano: { eixo: 'y', valor: pontas[zc].frente }, cruzando: 'subindo' }, passoDaMoldura, { plano: { eixo: 'y', valor: pontas[zc].tras }, cruzando: 'descendo' }],
      });
      partes.push(daVarredura(g));
    }
  }

  /* ---- o forro dos arcos: por dentro da chapa, fecha o oco atrás de cada roda ----
     Um balde aberto para fora, em torno do eixo da roda, só na metade de cima: uma aba assentada na face de dentro da chapa em volta da boca (passa 8 mm
     dela para encostar), o túnel a `forro_folga` do pneu e a parede de dentro, a essa mesma folga da face de dentro do pneu. O trilho é o círculo do túnel,
     e a seção sai radial (v) e pela largura (u, para dentro). As pontas acabam onde a borda da aba cruza a soleira. */
  const rForro = T.pneu_diametro / 2 + T.forro_folga;
  const rBordaForro = T.arco_raio + T.forro_sobra;
  const angForro = Math.asin((yc - T.soleira_y) / rBordaForro);
  const fundoForro = f.xMax - (T.bitola / 2 - T.pneu_largura / 2) + T.forro_folga;
  const tuneis = Math.ceil((fundoForro - pen) / 70);
  const secaoForro = [
    { u: -pen, v: rBordaForro - rForro, nome: 'borda' },
    { u: -pen, v: 0, nome: 'canto' },
    ...Array.from({ length: tuneis - 1 }, (_, i) => ({ u: -pen - ((i + 1) * (fundoForro - pen)) / tuneis, v: 0 })),
    { u: -fundoForro, v: 0, nome: 'canto2' },
    { u: -fundoForro, v: -(rForro - T.forro_raio_fundo) / 2 },
    { u: -fundoForro, v: T.forro_raio_fundo - rForro },
  ];
  for (const [zc, rotulo] of [[zD, 'Dianteiro'], [zT, 'Traseiro']]) {
    for (const [lado, s] of lados) {
      const nome = `forroArco${rotulo}${lado === 'Esquerda' ? 'Esquerdo' : 'Direito'}`;
      const g = gaiolaVarrida({
        nome,
        trilho: [{ arco: { centro: [s * f.xMax, yc, zc], eixo: EIXO_X, de: [s * f.xMax, yc - rForro * Math.sin(angForro), zc + rForro * Math.cos(angForro)], graus: -(180 + 2 * (angForro / grau)) } }],
        quadro: s > 0 ? { u: [s, 0, 0], virar: true } : { u: [s, 0, 0] }, secao: secaoForro, fora: [s, 0, 0],
        vincos: [{ linha: 'canto', nitidez: 'viva' }, { linha: 'canto2', nitidez: 'viva' }],
        estacoes: [{ fracao: 0 }, { passo: rForro * ((T.moldura_passo_graus * Math.PI) / 180), linha: 'canto' }, { fracao: 1 }],
      });
      partes.push(daVarredura(g));
    }
  }

  /* ---- o para-choque dianteiro ---- */
  {
    const sec = adensar(comAlturas(T.secao_parachoque_dianteiro, [T.placa_dianteira_y0, T.placa_dianteira_y0 + T.placa_altura]), T.plastico_passo_y);
    const uChapa = (y) => f.zF(y) - f.zFrente; // a chapa recua do nariz no alto
    const linhas = sec.map(([u, y], j) => (j === sec.length - 1 ? { u: uChapa(y) - pen, y, topo: true } : tocaChapa({ u, y })));
    const rQuina = f.raioFrente(T.parachoque_topo_y); const xQuina = f.xMax - rQuina; const zQuina = f.zFrente - rQuina;
    const zFimLado = (y) => zD + dzJoin(y);
    const posicao = (e, l) => {
      const u = l.u; const y = l.y;
      if (e.tipo === 'reta') return [e.fr * xQuina, y, f.zFrente + u];
      const rho = rQuina + kLado * u; const zc = zQuina + (1 - kLado) * u;
      if (e.tipo === 'quina') return [e.s * (xQuina + rho * Math.sin(e.phi)), y, zc + rho * Math.cos(e.phi)];
      if (e.tipo === 'alargamento') return [e.s * (f.xMax + uContinua(e.d, y, kLado * u, l.topo)), y, zD + dzDe(T.arco_raio + e.d)(y)];
      return [e.s * (f.xMax + kLado * u), y, lerp(zc, zFimLado(y), e.t)];
    };
    const g = construirGrade({
      nome: 'parachoqueDianteiro', estacoes: estacoesDoParachoque(T, xQuina, T.placa_meia_largura / xQuina, dsAlarg), linhas, posicao, dica: (c) => [c[0], 0, c[2] - 100],
      vincosEm: T.parachoque_dianteiro_vincos.map((y) => sec.findIndex((p) => Math.abs(p[1] - y) < 1e-9)),
    });
    abrirBolso(g, {
      nome: 'placaDianteira', fundo: T.placa_fundo, dir: [0, 0, -1],
      dentro: (p) => Math.abs(p[0]) <= T.placa_meia_largura + 0.5 && p[1] >= T.placa_dianteira_y0 - 0.5 && p[1] <= T.placa_dianteira_y0 + T.placa_altura + 0.5 && p[2] >= f.zFrente + saida(T.secao_parachoque_dianteiro) - 1,
    });
    partes.push(fecharPeca('parachoqueDianteiro', [g]));
  }

  /* ---- o para-choque traseiro, com o degrau plano de carga em cima ---- */
  {
    const sec = adensar(comAlturas(T.secao_parachoque_traseiro, [T.placa_traseira_y0, T.placa_traseira_y0 + T.placa_altura]), T.plastico_passo_y);
    const uChapa = (y) => f.zTras - f.zR(y); // negativa: a chapa fica dentro da traseira vertical, no degrau
    const topoY = sec.at(-1)[1];
    const linhas = [...sec.map(([u, y]) => tocaChapa({ u, y })), { u: uChapa(topoY) - pen, y: topoY }];
    const rQuina = T.raio_planta_tras; const zQuina = f.zTras + rQuina; const xQuina = f.xMax - rQuina;
    const zFimLado = (y) => zT - dzJoin(y);
    const posicao = (e, l) => {
      const u = l.u; const y = l.y;
      const rho = rQuina + u; const xc = xQuina - (1 - kLadoTras) * u;
      if (e.tipo === 'reta') return [e.fr * xc, y, f.zTras - u];
      if (e.tipo === 'quina') return [e.s * (xc + rho * Math.sin(e.phi)), y, zQuina - rho * Math.cos(e.phi)];
      if (e.tipo === 'alargamento') return [e.s * (f.xMax + uContinua(e.d, y, kLadoTras * u)), y, zT - dzDe(T.arco_raio + e.d)(y)];
      return [e.s * (f.xMax + kLadoTras * u), y, lerp(zQuina, zFimLado(y), e.t)];
    };
    const estsTras = estacoesDoParachoque(T, xQuina, T.placa_meia_largura / (xQuina - (1 - kLadoTras) * saida(T.secao_parachoque_traseiro)), dsAlarg);
    /* o degrau de carga é plano: onde o alargamento passa dele (a saída dele maior que a do degrau) o degrau some e a borda de cima fica aberta, na altura do degrau */
    const uDegrau = kLadoTras * sec.at(-1)[0];
    const passaDoDegrau = (e) => e.tipo === 'alargamento' && saidaAlarg(e.d) > uDegrau;
    const g = construirGrade({
      nome: 'parachoqueTraseiro', estacoes: estsTras, linhas,
      manter: (i, j) => !(j === linhas.length - 2 && (passaDoDegrau(estsTras[i]) || passaDoDegrau(estsTras[i + 1]))), posicao, dica: (c) => [c[0], 0, c[2] + 100],
      vincosEm: T.parachoque_traseiro_vincos.map((y) => sec.findIndex((p) => Math.abs(p[1] - y) < 1e-9)),
    });
    abrirBolso(g, {
      nome: 'placaTraseira', fundo: T.placa_fundo, dir: [0, 0, 1],
      dentro: (p) => Math.abs(p[0]) <= T.placa_meia_largura + 0.5 && p[1] >= T.placa_traseira_y0 - 0.5 && p[1] <= T.placa_traseira_y0 + T.placa_altura + 0.5 && p[2] <= f.zTras - saida(T.secao_parachoque_traseiro) + 1,
    });
    partes.push(fecharPeca('parachoqueTraseiro', [g]));
  }
  return partes;
}

/* ---------- a gaiola ---------- */

const sub =(a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const esc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a); return l > 1e-12 ? esc(a, 1 / l) : a; };

/**
 * derivar(T) -> a gaiola da chapa, o plástico, o forro e as chamadas das rodas, em milímetro e em metro.
 *   pontos: os pontos nomeados da gaiola, em metro, que entram em TOPO;
 *   passo: os campos do passo `subdivisao` (vertices, faces, vincos, cantos), só com nomes;
 *   aneis: os anéis, com a lista de pontos de cada um por coluna, para o teste e a etapa seguinte citarem a gaiola por nome;
 *   portas, vidros: as voltas de cada porta (nos nomes da carroceria) e de cada vão de vidro;
 *   abasDosArcos: a linha de cada arco de roda, para a aba;
 *   rodas: as quatro rodas, com o sufixo, o centro e a chamada da família roda-pneu.
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

  /* as colunas da frente: x por anel. Do para-choque até o topo da porta da cabine, em partes iguais entre o meio e o começo da quina
     (o vão do para-brisa sai pela coluna q3 da quina, e não por uma coluna da frente); acima do topo da porta, as partes iguais passam
     às linhas das nervuras, iguais às da traseira, para as linhas da cobertura saírem retas. */
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
  const fracUniforme = Array.from({ length: nF + 1 }, (_, k) => k / nF);
  const fracTeto = XT.map((x) => x / xFimTeto);
  const colunasFrente = (an) => {
    const s = an.sec; const xFim = s.xS - s.rF;
    let fr;
    if (!an.horizontal) fr = fracTeto;
    else if (an.y <= T.para_brisa_topo_y) fr = fracUniforme;
    else {
      const t = suave((an.y - T.para_brisa_topo_y) / (T.ombro_y - T.para_brisa_topo_y));
      fr = fracUniforme.map((u, k) => lerp(u, fracTeto[k], t));
    }
    return fr.map((u) => u * xFim);
  };
  /* as colunas da traseira: no corpo, a borda de dentro e a de fora dos vidros traseiros; no ombro e no teto, as das nervuras */
  const colunasTras = (an) => {
    const s = an.sec; const xTras = s.xS - s.rB;
    const pt = T.vao_canto_passo_traseiro; const kk = T.vao_canto_degraus;
    const dentro = T.vidro_traseiro_x_dentro;
    /* a borda de fora do vidro fica 45 mm dentro da borda de fora da porta, que acompanha a lateral, e não passa de 820 */
    const corpo = (xt, y) => {
      const fora = Math.min(T.vidro_traseiro_x_fora, f.xBordaTraseira(y) - T.vidro_traseiro_folga_fora);
      const cantoDentro = Array.from({ length: kk }, (_, j) => dentro + (j + 1) * pt);
      const cantoFora = Array.from({ length: kk }, (_, j) => fora - (kk - j) * pt);
      const miolo = entre(cantoDentro.at(-1), cantoFora[0], (cantoFora[0] - cantoDentro.at(-1)) / (10 - 2 * kk) + 1e-6);
      return [0, dentro, ...cantoDentro, ...miolo, ...cantoFora, fora, ...entre(fora, xt, (xt - fora) / 2 + 1e-6), xt];
    };
    if (an.horizontal) return corpo(xTras, an.y);
    const ref = horizontais.at(-1);
    const base = corpo(ref.sec.xS - ref.sec.rB, ref.y).map((x, k, l) => x / l.at(-1));
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
  const yDQuina = f.rPneu + Math.sqrt(rArcoPorta ** 2 - (f.pePortaQuina[0] - f.zD) ** 2);
  const secTopoQuina = secaoHorizontal(T, f, T.para_brisa_topo_y);
  const aTopoQuina = caminhoDeZ(secTopoQuina, f.zFrestaQuina(T.para_brisa_topo_y)) / secTopoQuina.rF;
  const caminhoQuina = (an) => (an.horizontal && an.y <= T.para_brisa_topo_y ? caminhoDeZ(an.sec, f.zFrestaQuina(an.y)) : an.sec.rF * aTopoQuina);
  const caminhoD = (an) => {
    if (an.horizontal && an.y <= T.porta_cabine_topo_y) return caminhoDeZ(an.sec, f.zFrestaFrente(an.y));
    /* Acima do topo da porta a coluna D não tem mais a fresta a seguir. Com a fresta a 122 mm do perfil ela fica quase no fim da quina,
       longe de E: ela volta, até o topo do vão do para-brisa, para a posição que tinha com a fresta a quina_fresta_ref, a mesma do teto da
       etapa 2; com ela parada em 2035 a curva do teto saía com calombo de 2,9 mm no ombro. */
    const t = suave((an.y - T.porta_cabine_topo_y) / (T.para_brisa_topo_y - T.porta_cabine_topo_y));
    return lerp(an.sec.rF * aTopoPorta, caminhoQuina(an), t);
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
  const quebras = [zFimLado, zCorrerTras, zCorrerFrente, zCabTras, zVidroCabTras, f.pePortaQuina[0], zComecoLado];
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
    const sE = an.y >= yDQuina - 1e-9 ? Math.min(sq, caminhoQuina(an) - T.recuo_quina_porta) : sq;
    const g = [1, 2, 3].map((k) => ({ col: `q${k}`, s: (k / 4) * sE }));
    g.push({ col: 'E', s: sE });
    /* Entre E e D a quina fica sem coluna quando a fresta recua (a face vira corda de um arco de raio 160 e sai com barriga a menos, uma
       mancha afundada na curvatura). A coluna p1 fica onde a D da etapa 2 ficava (a fresta a quina_fresta_ref), de modo que o encontro do teto
       com a coluna do para-brisa tem a mesma malha de antes, e p2 em diante dividem o resto até a D nova, a passo_p uma da outra. Isso vale de
       p_inicio_y até o ombro, que tem as mesmas colunas do teto, cuja cobertura conta as que vêm antes de D. */
    if (temD && an.horizontal && an.y >= T.p_inicio_y && an.y < T.ombro_y) {
      const sR = caminhoQuina(an);
      if (sR > sE + 1 && sR < sD - 1) {
        g.push({ col: 'p1', s: sR });
        const n = Math.floor((sD - sR) / T.passo_p);
        for (let k = 1; k < n; k += 1) g.push({ col: `p${k + 1}`, s: sR + ((sD - sR) * k) / n });
      }
    }
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

  /* A coroa da frente: a flecha, por altura, é quanto a coluna q3 da quina (a ponta do vão do para-brisa) fica abaixo do meio da
     frente. Do zero na boca do capô ela cresce até a da base do vão (a coroa do capô), passa à da borda de cima do vão e some até o
     teto plano. Em cada anel, um ponto da frente ou da quina desce a flecha vezes (x / x de q3)², e dali até a coluna D da fresta a
     descida some, de modo que a porta, a lateral e o teto plano ficam onde estavam. Só o y muda: na quina, que é parede vertical, o
     ponto escorrega pela parede; no capô e no para-brisa ele afunda um pouco, e a borda do vão sai em arco, mais baixa nas pontas. */
  const flechaEm = (y) => {
    if (y <= f.boca[1]) return 0;
    if (y <= T.para_brisa_base_y) return T.flecha_capo_base * suave((y - f.boca[1]) / (T.para_brisa_base_y - f.boca[1]));
    if (y <= T.para_brisa_topo_y) return lerp(T.flecha_capo_base, T.flecha_vidro_topo, (y - T.para_brisa_base_y) / (T.para_brisa_topo_y - T.para_brisa_base_y));
    return T.flecha_vidro_topo * (1 - suave((y - T.para_brisa_topo_y) / (T.altura - T.para_brisa_topo_y)));
  };
  const listas = [];
  aneis.forEach((an) => {
    const sec = an.sec; const lista = [];
    const add = (col, p, nome = null) => { const n = nome ?? nomePonto(an.nome, col); registrar(n, p, sec); lista.push({ col, nome: n }); return n; };
    /* frente */
    const grupo = grupoQuina(an);
    const xDoCaminho = (s) => pontoNoCaminho(sec, s)[0];
    const xQ3 = xDoCaminho(grupo.find((g) => g.col === 'q3').s);
    /* o abaulamento acaba onde a coluna D acabava com a fresta a quina_fresta_ref (a fresta da porta recuou, e o abaulamento do para-brisa não) */
    const xFimDaCoroa = Math.max(xQ3 + 1, an.y >= yDQuina - 1e-9 ? xDoCaminho(caminhoQuina(an)) : sec.xS);
    const coroa = (p) => {
      const x = Math.abs(p[0]);
      const g = x <= xQ3 ? (x / xQ3) ** 2 : 1 - suave((x - xQ3) / (xFimDaCoroa - xQ3));
      return [p[0], p[1] - flechaEm(p[1]) * g, p[2]];
    };
    colunasFrente(an).forEach((x, k) => add(`f${k}`, coroa(pontoFrente(sec, x))));
    /* quina da frente e grupo da coluna D */
    const sq = sQuina(sec);
    const naQuina = grupo.filter((g) => g.s <= sq + 1e-9);
    const naLateral = grupo.filter((g) => g.s > sq + 1e-9);
    naQuina.forEach((g) => add(g.col, coroa(pontoNoCaminho(sec, g.s))));
    const zComeco = comecoDe(an);
    const zFim = sec.zR + sec.rB;
    /* lateral: pontos estruturais (as linhas das portas, os arcos, as tampas dos arcos) e as colunas de enchimento */
    const itens = naLateral.map((g) => ({ col: g.col, z: sec.zF - sec.rF - (g.s - sq), y: sec.yS }));
    const zonas = [];
    if (an.horizontal) {
      const iH = horizontais.indexOf(an);
      const yAntes = iH > T.tampas_aneis - 1 ? horizontais[iH - T.tampas_aneis].y : -Infinity;
      for (const arco of arcos) {
        const pts = arco.pontos;
        if (an.y <= yBase + 1e-9) {
          const r = lerp(T.arco_raio, rArcoPorta, (an.y - f.ys) / (yBase - f.ys));
          const thj = Math.asin((an.y - f.rPneu) / r);
          if (Math.abs(an.y - yBase) < 1e-9) pts.forEach((p) => itens.push({ col: p.col, z: p.z, y: p.y, nome: nomeE(p.nome), sec: secArco }));
          else {
            itens.push({ col: pts[0].col, z: arco.zc + r * Math.cos(thj), y: an.y });
            /* abaixo do eixo (thj < 0) o primeiro ponto do anel fica em -thj, e os pontos do arco que vêm antes dele em ângulo sairiam
               do outro lado dele em z; eles ficam de fora desses anéis */
            const dentroDoAngulo = (p) => thj >= 0 || (p.th >= -thj && p.th <= Math.PI + thj);
            pts.slice(1, -1).filter(dentroDoAngulo).forEach((p) => itens.push({ col: p.col, z: arco.zc + r * Math.cos(p.th), y: f.rPneu + r * Math.sin(p.th) }));
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
    /* nos anéis do vidro da porta da cabine, as colunas dos cantos do vão, a vao_canto_passo_cabine uma da outra a partir de cada
       borda lateral dele (S1 e S2 na frente, T1 e T2 atrás) */
    if (an.horizontal && an.y >= T.vidro_cabine_base_y - 1e-6 && an.y <= T.vidro_cabine_topo_y + 1e-6) {
      const zS0 = itens.find((it) => it.col === 'S0')?.z ?? sec.zF - sec.rF;
      for (let j = 1; j <= T.vao_canto_degraus; j += 1) {
        itens.push({ col: `S${j}`, z: zS0 - j * T.vao_canto_passo_cabine, y: sec.yS }, { col: `T${j}`, z: zVidroCabTras + j * T.vao_canto_passo_cabine, y: sec.yS });
      }
    }
    /* No capô e no para-lama, onde a quina acaba mais para trás a cada anel, as colunas de enchimento da lateral ficam em z fixo e a
       primeira delas ao lado do fim da quina (E) se afasta e some a cada poucos anéis: a face ao lado de E oscila de 40 a 150 mm e a
       luz rasante mostra a beira do capô em degraus. Colunas_do_capo colunas sobem junto com E, a colunas_do_capo_passo uma da outra, e as de z fixo
       que cairiam perto delas saem (são estruturais). */
    if (an.horizontal && an.y >= T.colunas_do_capo_y && itens.length > 0) {
      const zE = sec.zF - sec.rF;
      const zProximo = Math.max(...itens.map((it) => it.z));
      for (let j = 1; j <= T.colunas_do_capo; j += 1) {
        const z = zE - j * T.colunas_do_capo_passo;
        if (z > zProximo + T.margem_coluna + 5) itens.push({ col: `F${j}`, z, y: sec.yS });
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

  /* ---- os cantos dos vãos em diagonal ----
     A volta de um vão que anda pela gaiola dá um canto de 90 graus em cada quina do retângulo, e a subdivisão o arredonda com o raio
     das faces dali, pequeno; cortado em degraus ele ficaria com degraus visíveis. Cada canto é cortado em diagonal: a volta segue, por
     vao_canto_degraus células, a diagonal que liga a coluna de dentro do canto, no anel da borda, à coluna da borda, no anel
     vao_canto_degraus acima, e cada célula dessa diagonal é partida em dois triângulos, um de cada lado dela. A diagonal fica de
     fora do vão e a célula vizinha dela fica na chapa. A partição das células vem logo depois de montadas as faces. */
  const colunasDoCanto = (rs, cF, cMeio) => {
    const lista = rs[0].lista.map((q) => q.col);
    const iF = lista.indexOf(cF); const iM = lista.indexOf(cMeio);
    if (iF < 0 || iM < 0) throw new Error(`furgao-realista: o anel ${rs[0].nome} não tem a coluna ${cF} ou ${cMeio}`);
    const passo = iM > iF ? 1 : -1;
    const cols = [cF];
    for (let j = 1; j <= T.vao_canto_degraus; j += 1) cols.unshift(lista[iF + passo * j]);
    for (let j = 0; j < T.vao_canto_degraus; j += 1) {
      for (const r of [rs[j], rs[j + 1]]) {
        const l = r.lista.map((q) => q.col);
        if (Math.abs(l.indexOf(cols[j]) - l.indexOf(cols[j + 1])) !== 1) throw new Error(`furgao-realista: as colunas ${cols[j]} e ${cols[j + 1]} do canto do vão não são vizinhas no anel ${r.nome}`);
      }
    }
    return cols;
  };
  const aneisEntre = (yb, yt) => listas.filter((x) => x.horizontal && x.y >= yb - 1e-6 && x.y <= yt + 1e-6);
  const iForaTraseiro = 2 + 2 * T.vao_canto_degraus + (9 - 2 * T.vao_canto_degraus); // r0, a borda de dentro, os cantos, o miolo e os cantos de fora
  const meioDoVidroTraseiro = `r${Math.ceil((1 + iForaTraseiro) / 2)}`;
  const meioDoVidroDaCabine = (() => {
    const rs = aneisEntre(T.vidro_cabine_base_y, T.vidro_cabine_topo_y);
    const colunasBaixo = rs[0].lista.map((q) => q.col);
    const [k0, k1] = [colunasBaixo.indexOf('vidroCabineTras'), colunasBaixo.indexOf('S0')].sort((a, b) => a - b);
    const comuns = colunasBaixo.slice(k0 + 1, k1).filter((c) => rs.at(-1).lista.some((q) => q.col === c) && /^l-?\d+$/.test(c));
    return comuns[Math.floor(comuns.length / 2)];
  })();
  const cantosDosVaos = [
    { rs: aneisEntre(T.para_brisa_base_y, T.para_brisa_topo_y), cMeio: 'f0', cantos: ['q3'] },
    { rs: aneisEntre(T.vidro_cabine_base_y, T.vidro_cabine_topo_y), cMeio: meioDoVidroDaCabine, cantos: ['S0', 'vidroCabineTras'] },
    { rs: aneisEntre(T.vidro_traseiro_base_y, T.vidro_traseiro_topo_y), cMeio: meioDoVidroTraseiro, cantos: ['r1', `r${iForaTraseiro}`] },
  ];
  const diagonaisDosCantos = [];
  const arcosDosCantos = [];
  for (const { rs, cMeio, cantos } of cantosDosVaos) {
    const k = T.vao_canto_degraus;
    for (const cF of cantos) {
      for (const sub2 of [rs.slice(0, k + 1), rs.slice(rs.length - k - 1).reverse()]) {
        const cols = colunasDoCanto(sub2, cF, cMeio);
        const nome = (r, c) => r.lista.find((q) => q.col === c).nome;
        for (let j = 0; j < k; j += 1) diagonaisDosCantos.push([nome(sub2[j], cols[j]), nome(sub2[j + 1], cols[j + 1])]);
        arcosDosCantos.push({
          p00: nome(sub2[0], cols[0]), p10: nome(sub2[0], cols[k]), p01: nome(sub2[k], cols[0]), p11: nome(sub2[k], cols[k]),
          cadeia: Array.from({ length: k - 1 }, (_, j) => nome(sub2[j + 1], cols[j + 1])),
        });
      }
    }
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

  /* Os nós de dentro da diagonal de cada canto saem da diagonal e vão para o arco: o bloco de k por k células do canto vira um
     remendo bilinear, com a quina do vão (a coluna de fora no anel da borda) em (1, 0) e o fim da diagonal em (1, 1), e o arco de
     raio 1 tangente à borda no começo da diagonal e à coluna de fora no fim dela passa por esses nós, em (sen a, 1 - cos a), a
     = 90 graus vezes j sobre k. Com a diagonal reta o canto saía em chanfro, de dois cantos de 45 graus. */
  for (const { p00, p10, p01, p11, cadeia } of arcosDosCantos) {
    const k = cadeia.length + 1;
    const [a, b, c, d] = [p00, p10, p01, p11].map((n) => P.get(n));
    cadeia.forEach((n, j) => {
      const ang = (Math.PI / 2) * ((j + 1) / k);
      const u = Math.sin(ang); const w = 1 - Math.cos(ang);
      P.set(n, [0, 1, 2].map((e) => (1 - u) * (1 - w) * a[e] + u * (1 - w) * b[e] + (1 - u) * w * c[e] + u * w * d[e]));
    });
  }
  /* a partição das células das diagonais dos cantos dos vãos */
  for (const [p, q] of diagonaisDosCantos) {
    const i = facesE.findIndex((fc) => fc.includes(p) && fc.includes(q));
    if (i < 0) throw new Error(`furgao-realista: nenhuma face tem a diagonal ${p} -> ${q}`);
    const fc = facesE[i];
    const ip = fc.indexOf(p); const iq = fc.indexOf(q);
    if (fc.length !== 4 || (ip - iq + 4) % 4 !== 2) throw new Error(`furgao-realista: a face da diagonal ${p} -> ${q} não é um quadrilátero com os dois pontos opostos`);
    const r = [...fc.slice(ip), ...fc.slice(0, ip)];
    facesE.splice(i, 1, [r[0], r[1], r[2]], [r[2], r[3], r[0]]);
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
  /* Os cantos dos vãos. A volta de um vão que anda pela gaiola dá um canto de 90 graus em cada quina do retângulo, e a subdivisão o
     arredonda com o raio das faces dali, pequeno. Cada canto é cortado em diagonal: a volta segue, por vao_canto_degraus células, a
     diagonal que liga a coluna de dentro do canto, no anel da borda, à coluna da borda, no anel vao_canto_degraus acima, e cada
     célula dessa diagonal é partida em dois triângulos, um de cada lado dela (a gaiola foi partida acima, antes da volta ser
     conferida pelas arestas). */
  /* de (rs[0], cMeio0) a (rs.at(-1), cMeio1) pelo lado da coluna de fora cF, com os dois cantos cortados em diagonal */
  const meiaVolta = (rs, cMeio0, cMeio1, cF, s) => {
    const k = T.vao_canto_degraus;
    const rsB = rs.slice(0, k + 1); const rsT = rs.slice(rs.length - k - 1).reverse();
    const colsB = colunasDoCanto(rsB, cF, cMeio0); const colsT = colunasDoCanto(rsT, cF, cMeio1);
    const cadeiaB = rsB.map((r, j) => ponto(r, colsB[j], s)); const cadeiaT = rsT.map((r, j) => ponto(r, colsT[j], s));
    return [
      ...trecho(rsB[0], cMeio0, colsB[0], s), ...cadeiaB.slice(1), ...coluna(cF, rsB[k].y, rsT[k].y, s).slice(1),
      ...[...cadeiaT].reverse().slice(1), ...trecho(rsT[0], colsT[0], cMeio1, s).slice(1),
    ];
  };
  const vidros = [];
  {
    const rs = aneisEntre(T.para_brisa_base_y, T.para_brisa_topo_y);
    const metade = meiaVolta(rs, 'f0', 'f0', 'q3', 'e');
    vidros.push({ nome: 'paraBrisa', linha: 'abaVaoParaBrisa', volta: fechar([...metade, ...[...metade].reverse().map(espelho)]) });
  }
  for (const s of ['e', 'd']) {
    const sufixo = s === 'e' ? 'Esquerda' : 'Direita';
    const rs = aneisEntre(T.vidro_cabine_base_y, T.vidro_cabine_topo_y);
    const meio = meioDoVidroDaCabine;
    const frente = meiaVolta(rs, meio, meio, 'S0', s);
    const tras = meiaVolta(rs, meio, meio, 'vidroCabineTras', s);
    vidros.push({ nome: `vidroPortaCabine${sufixo}`, linha: `abaVaoPortaCabine${sufixo}`, volta: fechar([...frente, ...[...tras].reverse()]) });
    const rt = aneisEntre(T.vidro_traseiro_base_y, T.vidro_traseiro_topo_y);
    const dentroT = meiaVolta(rt, meioDoVidroTraseiro, meioDoVidroTraseiro, 'r1', s);
    const foraT = meiaVolta(rt, meioDoVidroTraseiro, meioDoVidroTraseiro, `r${iForaTraseiro}`, s);
    vidros.push({ nome: `vidroPortaTraseira${sufixo}`, linha: `abaVaoPortaTraseira${sufixo}`, volta: fechar([...foraT, ...[...dentroT].reverse()]) });
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
  /* o plástico de baixo, por fora da chapa: os pontos dele entram no TOPO junto com os da gaiola */
  const plastico = derivarPlastico(T, f);
  const pontosMm = new Map([...vertices.map((n) => [n, posicoes.get(n)]), ...plastico.flatMap((pl) => [...pl.posicoes])]);
  const pontos = Object.fromEntries([...pontosMm].map(([n, p]) => [n, p.map(m)]));

  /* as quatro rodas da família `roda-pneu`, no pneu da prancha, na bitola e no entre-eixos, apoiadas no chão: a chamada da família e o centro de cada uma */
  const rodas = [];
  for (const [eixo, zc] of [['Dianteiro', f.zD], ['Traseiro', f.zT]]) {
    for (const [ladoNome, s] of [['Esquerdo', 1], ['Direito', -1]]) {
      rodas.push({ sufixo: `${eixo}${ladoNome}`, s, centro: [s * T.bitola / 2, f.rPneu, zc], chamada: chamadaDaRoda(T, `roda-${eixo.toLowerCase()}-${ladoNome.toLowerCase()}`) });
    }
  }
  return {
    forma: f, aneis: listas.map((l) => ({ nome: l.nome, y: l.y, colunas: l.lista.map((p) => p.col) })), pontos, pontosMm,
    passo: { vertices, faces, vincos, cantos }, plastico,
    portas: portas.map((v) => ({ nome: v.nome, volta: v.volta })),
    vidros: vidros.map((v) => ({ nome: v.nome, linha: v.linha, volta: v.volta })),
    abasDosArcos, rodas,
    bordaDeBaixo: [...sol.lista.map((p) => p.nome), ...sol.lista.slice(1, -1).reverse().map((p) => espelho(p.nome))],
  };
}

/* ---------- a roda da família ---------- */

let registroDeFamilias = null;
const familias = () => { registroDeFamilias ??= criarRegistroDeFamilias(); return registroDeFamilias; };

/** A chamada da família `roda-pneu` pelo perfil da tabela. O perfil dá a roda de chapa, os sulcos da banda e os furos de ventilação; o que a prancha fixa
 *  vale mais que ele: o diâmetro e a largura do pneu (710 e 235) e o assento do aro, que as medidas da família pedem como proporção do diâmetro. */
function chamadaDaRoda(T, id) {
  const D = T.pneu_diametro;
  return chamar(familias().obter('roda-pneu'), id, { perfil: T.roda_perfil, diametroPneu: D, larguraPneu: T.pneu_largura / D, diametroAro: T.roda_assento / D });
}

/* Os ids da família são locais (de 1 a 11) e os nomes das partes são os dela (pneu, aro, cubo, disco): cada roda soma `base` aos ids e põe o sufixo da roda nos
   nomes, para as quatro não colidirem entre si nem com os passos desta receita. */
const comBase = (v, base) => {
  if (Array.isArray(v)) return v.map((x) => comBase(x, base));
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'origemId' || (k === 'id' && typeof v.op === 'string') ? x + base : comBase(x, base)]));
  }
  return v;
};
const PARTES_DA_RODA = ['pneu', 'aro', 'cubo', 'disco'];
const BASE_DAS_RODAS = 200;

/* ---------- passos ---------- */

const CHAPA = { origem: { op: 'subdivisao', id: 1 } };
const nomeDaAbaDoArco = (a) => `abaArco${a.arco === 'arcoD' ? 'Dianteiro' : 'Traseiro'}${a.lado === 'e' ? 'Esquerdo' : 'Direito'}`;

/** Os PASSOS: a chapa subdividida com espessura, as abas dos vãos dos vidros,  as abas dos arcos, as quatro rodas da família e o forro dos arcos (que vem com o plástico). */
export function gerarPassos(T) {
  const { passo, plastico, rodas, vidros, abasDosArcos } = derivar(T);
  const passos = [
    ['subdivisao', { origemId: 1, ...passo, borda: 'cantos', niveis: T.niveis, espessura: m(T.espessura) }],
    ['parte', { nome: 'carroceria', sel: CHAPA }],
    ['material', { sel: CHAPA, usa: 'azul' }],
  ];
  /* o plástico de baixo: cada peça é a pele de uma seção varrida por fora da chapa, engrossada para dentro */
  plastico.forEach((pl, k) => {
    const sel = { origem: { op: 'subdivisao', id: 50 + k } };
    passos.push(['subdivisao', { origemId: 50 + k, vertices: pl.vertices, faces: pl.faces, vincos: pl.vincos, cantos: pl.cantos, borda: 'cantos', niveis: T.niveis, espessura: m(T.plastico_espessura) }]);
    passos.push(['parte', { nome: pl.nome, sel }]);
    passos.push(['material', { sel, usa: MOLDURAS.includes(pl.nome) ? 'azul' : FORROS.includes(pl.nome) ? 'forro' : 'plastico' }]);
  });
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
  /* as rodas: a expansão da família, na origem e com o lado de fora em +x, sem as portas; a do lado direito gira meia volta em y, e todas vão ao centro */
  rodas.forEach((r, k) => {
    const base = BASE_DAS_RODAS + 20 * k;
    const { passos: daFamilia } = expandirChamadasDeComposicao(familias().registroComposicoes, [r.chamada]);
    const nomeadas = [];
    for (const passo of daFamilia) {
      const [operacao, argumentos] = comBase(passo, base);
      if (operacao === 'publicarPorta') continue;
      if (operacao === 'parte') { nomeadas.push(argumentos.sel); passos.push([operacao, { ...argumentos, nome: `${argumentos.nome}${r.sufixo}` }]); continue; }
      passos.push([operacao, argumentos]);
    }
    for (const sel of nomeadas) {
      if (r.s < 0) passos.push(['rotaciona', { eixo: 'y', graus: 180, pivo: [0, 0, 0], sel }]);
      passos.push(['transladar', { d: r.centro.map(m), sel }]);
      passos.push(['liso', { angulo: 30, sel }]);
    }
  });
  return passos;
}

/* ---------- contatos, vãos, ilhas e pontos ---------- */

const SUFIXOS_DAS_RODAS = ['DianteiroEsquerdo', 'DianteiroDireito', 'TraseiroEsquerdo', 'TraseiroDireito'];
const RODAS = SUFIXOS_DAS_RODAS.map((sufixo) => PARTES_DA_RODA.map((parte) => `${parte}${sufixo}`));
const FORROS = SUFIXOS_DAS_RODAS.map((sufixo) => `forroArco${sufixo}`);
const ABAS_DOS_VAOS = ['abaVaoParaBrisa', 'abaVaoPortaCabineEsquerda', 'abaVaoPortaCabineDireita', 'abaVaoPortaTraseiraEsquerda', 'abaVaoPortaTraseiraDireita'];
const ABAS_DOS_ARCOS = ['abaArcoDianteiroEsquerdo', 'abaArcoDianteiroDireito', 'abaArcoTraseiroEsquerdo', 'abaArcoTraseiroDireito'];

/* As abas nascem na chapa: a do vão continua a borda dobrada para dentro, e a do arco assenta na lateral em volta do arco, entrando
   meia espessura nela. A chapa e as rodas não se tocam: o arco tem 65 mm de folga sobre o pneu e a face de fora do pneu fica 37,5 mm
   para dentro da lateral. */
/* O plástico de baixo e as molduras se somam por fora da chapa. A saia, a moldura e os para-choques têm a borda que encosta na chapa entrando 1 mm nela.
   A continuação escura do alargamento é parte da saia e dos para-choques, na mesma malha: eles vão até a boca do arco, cobrem a aba (4 mm de altura) e
   sobem no alargamento, e a moldura da cor da lataria assenta no topo deles. A moldura passa 2 mm ou mais acima da aba; só a parede dela na boca,
   de 0 a 3 mm do arco, encosta na raiz da aba. Nenhuma peça toca o pneu. */
const SAIAS = ['saiaPresaEsquerda', 'saiaPresaDireita', 'saiaPortaCabineEsquerda', 'saiaPortaCabineDireita', 'saiaPortaCorrer'];
const MOLDURAS = ['molduraArcoDianteiroEsquerdo', 'molduraArcoDianteiroDireito', 'molduraArcoTraseiroEsquerdo', 'molduraArcoTraseiroDireito'];
const PARACHOQUES = ['parachoqueDianteiro', 'parachoqueTraseiro'];
const PLASTICOS = [...SAIAS, ...MOLDURAS, ...PARACHOQUES];

export const CONTATOS = [
  ...ABAS_DOS_VAOS.map((a) => ({ par: ['carroceria', a], motivo: 'a aba nasce na parede da borda do vão e continua a chapa dobrada para dentro; as malhas se cruzam por décimos de milímetro na costura' })),
  ...ABAS_DOS_ARCOS.map((a) => ({ par: ['carroceria', a], motivo: 'a aba do arco assenta na lateral em volta do arco da roda e entra meia espessura na chapa, que é o contato dela' })),
  ...PLASTICOS.map((pl) => ({ par: ['carroceria', pl], motivo: 'o plástico se soma por fora da chapa e a borda dele que encosta entra 1 mm na parede, sem vão e sem fresta' })),
  ...[['Dianteiro', 'Esquerda', 'Esquerdo'], ['Dianteiro', 'Direita', 'Direito'], ['Traseiro', 'Esquerda', 'Esquerdo'], ['Traseiro', 'Direita', 'Direito']].flatMap(([eixo, lado, lad]) => [
    { par: [`saiaPresa${lado}`, `molduraArco${eixo}${lad}`], motivo: 'a ponta horizontal da moldura assenta no topo da saia, a 463, do lado da saia, e a medida a dá por menos de 1 mm de sobreposição' },
    { par: [`parachoque${eixo}`, `molduraArco${eixo}${lad}`], motivo: 'a ponta horizontal da moldura assenta no topo do para-choque (580 atrás, 724 na frente), e a medida a dá por menos de 1 mm de sobreposição' },
    { par: [`abaArco${eixo}${lad}`, `molduraArco${eixo}${lad}`], motivo: 'a moldura cobre a aba do arco, passando 2 mm ou mais acima dela; a parede da moldura na boca encosta na raiz da aba' },
    { par: [`abaArco${eixo}${lad}`, `saiaPresa${lado}`], motivo: 'a saia vai até a boca do arco e sobe no alargamento, cobrindo a aba por baixo da ponta da moldura; as caixas se cruzam na raiz da aba' },
    { par: [`abaArco${eixo}${lad}`, `parachoque${eixo}`], motivo: 'o para-choque vai pela lateral até a boca do arco e sobe no alargamento, cobrindo a aba por baixo da ponta da moldura; as caixas se cruzam na raiz da aba' },
    { par: [`abaArco${eixo}${lad}`, `forroArco${eixo}${lad}`], motivo: 'o forro assenta por dentro da chapa em volta da boca, onde a aba assenta por fora; elas só se encostam na raiz da aba, na espessura da chapa' },
    { par: [`molduraArco${eixo}${lad}`, `forroArco${eixo}${lad}`], motivo: 'a moldura dobra 10 mm para dentro do arco na boca, atravessa a chapa e chega à aba do forro, que passa 8 mm da boca por dentro' },
    { par: [`saiaPresa${lado}`, `forroArco${eixo}${lad}`], motivo: 'a saia vai até a boca do arco e dobra para dentro dela, e essa dobra chega à aba do forro, que passa 8 mm da boca por dentro' },
    { par: [`parachoque${eixo}`, `forroArco${eixo}${lad}`], motivo: 'o para-choque vai até a boca do arco e dobra para dentro dela, e essa dobra chega à aba do forro, que passa 8 mm da boca por dentro' },
  ]),
  ...FORROS.map((forro) => ({ par: ['carroceria', forro], motivo: 'a aba do forro assenta na face de dentro da chapa em volta do arco, passando 8 mm da boca, e entra 1 mm na parede' })),
  ...SUFIXOS_DAS_RODAS.flatMap((sufixo) => [
    { par: [`pneu${sufixo}`, `aro${sufixo}`], motivo: 'o assento do pneu abraça o barril do aro: a borda de dentro da banda é o raio do assento do aro' },
    { par: [`aro${sufixo}`, `disco${sufixo}`], motivo: 'a chapa da roda sobrepõe o meio da parede do aro' },
    { par: [`disco${sufixo}`, `cubo${sufixo}`], motivo: 'a chapa da roda sobrepõe o meio da parede do cubo' },
  ]),
];

/* Cada roda é um grupo de quatro partes ligadas entre si, apoiado no chão sob o arco e sem tocar a chapa nem o forro: 25 mm de folga em volta do pneu. */
export const ILHAS = RODAS.map(([pneu]) => ({
  contem: pneu,
  motivo: 'a roda da família roda-pneu, apoiada no chão sob o arco e sem tocar a chapa nem o forro do arco; o eixo e a suspensão não são modelados',
}));

/* Os vãos da chapa: os dos vidros com a aba dobrada como moldura, e os das portas, que a própria porta ocupa com a fresta em volta. */
export function vaosDeclarados(T) {
  const { vidros, portas, bordaDeBaixo, passo } = derivar(T);
  const naChapa = new Set(passo.vertices);
  const vaos = vidros.map((v) => ({ nome: v.nome, borda: [...v.volta, v.volta[0]], frisos: [v.linha] }));
  for (const p of portas) {
    if (p.nome.startsWith('portaTraseira')) continue;
    if (!p.volta.every((n) => naChapa.has(n))) continue;
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
    parcial: { motivo: 'é a borda de baixo da carroceria, aberta por baixo como a caixa de um furgão: as abas dos arcos cobrem só os quatro arcos, e a soleira, a frente e a traseira ficam sem moldura, com o plástico da saia e dos para-choques por fora; o fundo fica para a etapa 7' },
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
    { nome: 'canto de baixo da caixa da carroceria: a lateral direita, a soleira e a traseira', parte: 'carroceria', medida: 'minimo', em: [-f.xMax, T.soleira_y, f.zTras], toleranciaMm: tol },
    { nome: 'frente do para-choque dianteiro, no alto da faixa de baixo: a ponta mais à frente, 50 mm além da chapa, e o lado mais largo, no alargamento do arco, 30 mm além da lateral', parte: 'parachoqueDianteiro', medida: 'maximo', em: [f.xMax + 30, 724, f.zFrente + 50], toleranciaMm: 4 },
    { nome: 'traseira do para-choque traseiro: o lado direito, no alargamento do arco, 30 mm além da lateral, o fundo e a ponta mais atrás, 110 mm além da chapa', parte: 'parachoqueTraseiro', medida: 'minimo', em: [-(f.xMax + 30), 300, f.zTras - 110], toleranciaMm: 4 },
    { nome: 'pneu dianteiro esquerdo, embaixo, por dentro e atrás', parte: 'pneuDianteiroEsquerdo', medida: 'minimo', em: [xDentro, 0, f.zD - r], toleranciaMm: tol },
    { nome: 'pneu traseiro direito, em cima, por dentro e na frente', parte: 'pneuTraseiroDireito', medida: 'maximo', em: [-xDentro, 2 * r, f.zT + r], toleranciaMm: tol },
    { nome: 'pneu traseiro direito, embaixo, por fora e atrás', parte: 'pneuTraseiroDireito', medida: 'minimo', em: [-xFora, 0, f.zT - r], toleranciaMm: tol },
    { nome: 'forro do arco dianteiro esquerdo, embaixo e atrás: a parede de dentro 25 mm além da face de dentro do pneu mais os 2 mm da espessura, as pontas na soleira e a borda da aba 8 mm além da boca', parte: 'forroArcoDianteiroEsquerdo', medida: 'minimo', em: [xDentro - T.forro_folga - T.plastico_espessura, T.soleira_y, f.zD - T.arco_raio - T.forro_sobra], toleranciaMm: 1 },
    { nome: 'forro do arco traseiro direito, em cima e na frente: a aba na face de dentro da chapa, o alto da borda 8 mm acima da boca e a parede de dentro 25 mm além do pneu mais os 2 mm da espessura', parte: 'forroArcoTraseiroDireito', medida: 'maximo', em: [-(xDentro - T.forro_folga - T.plastico_espessura), f.rPneu + T.arco_raio + T.forro_sobra, f.zT + T.arco_raio + T.forro_sobra], toleranciaMm: 1 },
  ];
}

const receita = {
  meta: { nome: 'furgao-realista', desc: 'furgão médio de teto alto com cabine de bico curto, etapa 4: a lataria em chapa contínua com as frestas das portas, o vinco de cintura, as nervuras do teto, as abas dos arcos, o para-brisa envolvente e os vãos dos vidros abertos, a saia e os para-choques em plástico escuro e o alargamento dos arcos (da cor da lataria em cima, escuro embaixo), por fora da chapa, o forro escuro dos arcos por dentro e as quatro rodas da família roda-pneu (pneu 235/65 aro 16)' },
  PARAMS: TABELA,
  MATERIAIS: {
    azul: { tipo: 'liso', cor: '#5d75c9' },
    borracha: { tipo: 'liso', cor: '#26262b' },
    aco: { tipo: 'metal', cor: '#a9adb3', acabamento: 'escovado' },
    plastico: { tipo: 'liso', cor: '#39393f' },
    forro: { tipo: 'liso', cor: '#1b1c1f' },
  },
  /* `origem` diz o referencial; os pontos da gaiola, derivados da TABELA atual, entram aqui pelo nome. */
  get TOPO() {
    return {
      origem: 'chão, no meio do furgão em x e em z; y para cima e a frente do furgão em +z',
      ...derivar(this.PARAMS).pontos,
    };
  },
  PLANO: {
    objeto: 'furgão médio de teto alto, etapa 4: chapa de 5400 por 2000 por 2500 mm com frestas das cinco portas, mais saia, para-choques e alargamento dos arcos por fora (5560 por 2060), forro dos arcos e rodas roda-pneu 235/65 aro 16',
    referencias: ['referencias/quatro-vistas.prancha.png', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total da carroceria, do nariz em z 2700 à traseira em z -2700', milimetros: 5400 },
    familia: 'veiculo',
    partes: [
      {
        nome: 'carroceria',
        forma: 'chapa de 2 mm: lateral vertical até o vinco em 1190 e fechando 3,9 graus até o teto de ±630; capô de 1100 a 1480, para-brisa até 2110, teto de raios 1290 e 405, frestas de 6 mm, sulcos, vãos redondos; o plástico de baixo se soma por fora',
        tecnica: 'subdivisao de gaiola de anéis, ombro e cobertura com colunas nas portas e arco de 580; porta dividida meia fresta por lado, borda dobrada 4 mm; frente em dois arcos tangentes com coroa em y; cantos dos vãos em diagonal de duas células',
      },
      ...ABAS_DOS_VAOS.map((nome) => ({
        nome,
        forma: `aba da borda do vão ${nome.replace('abaVao', '')}, dobrada para dentro a 90 graus com raio de 3 mm e perna de 20 mm, em volta do vão inteiro, cantos arredondados incluídos`,
        tecnica: 'friso com aba sobre a borda do vão, pelos nomes da gaiola',
      })),
      ...ABAS_DOS_ARCOS.map((nome) => ({
        nome,
        forma: `aba leve em volta do arco ${nome.includes('Dianteiro') ? 'dianteiro' : 'traseiro'} ${nome.endsWith('Esquerdo') ? 'esquerdo' : 'direito'}: lábio de 4 mm de altura sobre a lateral, 32 mm de largura no alto do arco e 16 nas pontas, afinando até sumir na soleira`,
        tecnica: 'friso de perfil desenhado sobre a borda do arco, com variacao da largura e pontas fechadas',
      })),
      ...['Esquerda', 'Direita'].map((lado) => ({
        nome: `saiaPresa${lado}`,
        forma: `saia do lado ${lado === 'Esquerda' ? 'esquerdo' : 'direito'}, plástico escuro por fora da lateral: sai 20 mm, de 299 a 463, borda de cima redonda e a de baixo dobrando para dentro; sobe no alargamento junto dos arcos, na mesma malha, até a boca`,
        tecnica: 'subdivisao da pele da seção varrida em linha reta e, junto dos arcos, em faixas pelo perfil do alargamento, engrossada 2 mm, cortada pelas frestas das portas',
      })),
      ...['PortaCabineEsquerda', 'PortaCabineDireita', 'PortaCorrer'].map((rotulo) => ({
        nome: `saia${rotulo}`,
        forma: `trecho da saia que a ${rotulo === 'PortaCorrer' ? 'porta de correr (lado direito)' : `porta da cabine do lado ${rotulo.endsWith('Esquerda') ? 'esquerdo' : 'direito'}`} leva, de 383 a 463, com a mesma seção e a fresta de 6 mm em 380 entre ele e a parte presa`,
        tecnica: 'subdivisao da pele da seção da saia varrida em linha reta pela largura da porta, engrossada para dentro 2 mm',
      })),
      ...MOLDURAS.map((nome) => ({
        nome,
        forma: `moldura do arco ${nome.includes('Dianteiro') ? 'dianteiro' : 'traseiro'} ${nome.endsWith('Esquerdo') ? 'esquerdo' : 'direito'}, na cor da lataria: alargamento de 150 mm que sai 30, cheio até 30 da boca e descendo tangente à chapa; dobra de 10 mm para dentro; pontas horizontais em 463, 580 e 724`,
        tecnica: 'subdivisao da pele da seção varrida em torno do eixo da roda, com as pontas em altura fixa, engrossada para dentro 2 mm, material da lataria',
      })),
      {
        nome: 'parachoqueDianteiro',
        forma: 'para-choque dianteiro de plástico escuro, de 300 a 724: sai 50 mm, com a faixa da entrada de ar 20 mm recuada, de quina a quina (388 a 482), e o lábio; dobra nas quinas e sobe no alargamento até a boca; lugar da placa de 400 por 130',
        tecnica: 'subdivisao da pele da seção varrida pela planta (reta, quina de raio 300, lateral e faixa do alargamento), vincos nos degraus da entrada de ar, bolso de paredes vivas para a placa',
      },
      {
        nome: 'parachoqueTraseiro',
        forma: 'para-choque traseiro de plástico escuro, de 300 a 580: sai 110 mm atrás das portas, com o degrau plano de carga em 580 e o lugar da placa de 400 por 130; dobra nas quinas e sobe no alargamento até a boca',
        tecnica: 'subdivisao da pele da seção varrida pela planta (reta, quina de raio 210, lateral e faixa do alargamento), vinco na borda do degrau, bolso de paredes vivas para a placa',
      },
      ...FORROS.map((nome) => ({
        nome,
        forma: `forro escuro do arco ${nome.includes('Dianteiro') ? 'dianteiro' : 'traseiro'} ${nome.endsWith('Esquerdo') ? 'esquerdo' : 'direito'}, por dentro da chapa: aba em volta da boca (passa 8 mm), túnel a 25 mm do pneu e parede de dentro a 25 mm dele, fechando o oco`,
        tecnica: 'subdivisao da pele da seção varrida em arco em torno do eixo da roda, com vinco vivo nas duas dobras, engrossada 2 mm para dentro, plástico escuro',
      })),
      ...SUFIXOS_DAS_RODAS.flatMap((sufixo) => [
        {
          nome: `pneu${sufixo}`,
          forma: `pneu 235/65 aro 16 da roda ${sufixo.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}: 710 mm de diâmetro e 235 de largura, pneumático com bojo no flanco e ombro chanfrado, na bitola de 1730 e no eixo ${sufixo.startsWith('Dianteiro') ? 'dianteiro' : 'traseiro'}, apoiado no chão`,
          tecnica: 'família roda-pneu, perfil furgao-235-65-r16: lathe em torno de x da seção do pneu, banda 0 (pneumático), 96 lados, quatro sulcos ao longo da volta subtraídos da banda, sombreamento liso',
        },
        { nome: `aro${sufixo}`, forma: 'barril de aço do aro de 16 polegadas, de 3,6 mm de parede e 70% da largura do pneu, que a banda abraça', tecnica: 'família roda-pneu: lathe em torno de x de um tubo' },
        { nome: `cubo${sufixo}`, forma: 'cubo da roda de chapa, com o furo central de 71 mm e a volta de 5 furos de fixação de 20 mm no círculo de 118', tecnica: 'família roda-pneu: lathe do anel menos o furo central e os cinco furos repetidos em volta do eixo' },
        { nome: `disco${sufixo}`, forma: 'chapa de aço da roda de 16 polegadas, de 6 mm, do cubo ao aro, deslocada para fora, com a volta de 5 furos de ventilação de 50 mm no círculo de 277', tecnica: 'família roda-pneu: lathe em torno de x de um anel, tipo 0, menos os cinco furos de ventilação repetidos em volta do eixo' },
      ]),
    ],
    criteriosDeReprovacao: [
      'a silhueta lateral, frontal ou de cima se afasta da prancha cotada mais de 15 mm em média ou 40 mm em algum ponto, medida com os vãos do para-brisa tampados (o vidro entra na etapa 5)',
      'a frente não segue a prancha ajustada: boca do capô fora de 1100, pé do para-brisa fora de 1480, topo fora de 2110, ou a curva do teto sem os dois raios tangentes (1290 e 405) chegando ao teto plano em z 770',
      'o para-brisa não envolve as quinas: borda de cima ou de baixo reta na frontal, ou coluna de chapa diferente de cerca de 100 mm por lado, ou a ponta que não dobra pela quina',
      'um canto de vão de vidro aparece vivo na luz rasante, em degrau ou em aresta, em vez de arredondado',
      'uma fresta de porta não fecha a volta, muda de largura ao longo dela ou sai da linha da prancha',
      'falta uma das cinco portas, ou a de correr aparece também do lado esquerdo',
      'um vão de vidro não fica aberto, ou a aba dele não cobre a borda inteira',
      'o vinco de cintura ou as nervuras do teto não aparecem na luz rasante, ou aparecem fortes como degrau',
      'a aba de um arco sobra solta da lateral ou não acompanha o arco inteiro',
      'a lateral não é vertical até o vinco de cintura e inclinada 3,9 graus acima dele, ou o vão traseiro não acompanha a lateral 100 mm para dentro dela acima do vinco, ou um sulco do teto não cabe no teto de ±630',
      'a luz rasante ou a curvatura mostram amassado, ondulação ou serrilhado que a forma não pede, fora das frestas, dos vãos e dos vincos, nem na fresta da porta da cabine junto ao arco dianteiro',
      'um pneu não toca o chão, ou toca ou atravessa o arco da roda, a lateral ou o forro do arco',
      'a roda não é a da família roda-pneu no pneu 235/65 aro 16 (710 mm de diâmetro, 235 de largura, com bojo e ombro) numa roda de chapa de aço de 16 polegadas com 5 parafusos, ou não fica na bitola de 1730 e nos eixos da prancha',
      'o forro de um arco falta, deixa ver o oco do carro pelo arco, não é escuro, fica a menos de 20 mm ou a mais de 30 mm do pneu em algum ponto, ou não encosta na chapa em volta da boca',
      'o alargamento de um arco não cobre o pneu com folga visível, na vista de cima ou na frontal, ou o forro passa para fora da boca do arco',
      'alguma peça fica solta no ar ou atravessa outra sem motivo',
      'o lado esquerdo e o direito diferem fora da porta de correr',
      'aparece marca, logotipo ou nome de fabricante',
      'a saia ou um para-choque não é plástico escuro por fora da chapa com a seção da prancha: saia de 299 a 463 saindo 20, dianteiro saindo 50 em duas alturas, traseiro saindo 110 com o degrau plano em 580',
      'a saia não é cortada pelas frestas: cada porta deve levar o seu trecho de 383 a 463, e ficam presos os 299 a 377 sob as portas e os trechos entre as portas e os arcos, sem trecho preso de 10 mm junto à fresta do arco dianteiro',
      'a moldura não é da cor da lataria, marca linha na borda de fora (volta à chapa de repente), diminui a boca, não dobra 10 mm para dentro do arco, passa menos de 2 mm acima da aba, ou desce abaixo da ponta vizinha',
      'o alargamento não tem 150 de largura e 30 de saída nos quatro arcos, em volta toda, ou não segue na saia e nos para-choques, com a mesma saída, abaixo das pontas até 299',
      'a continuação escura do alargamento marca emenda com a saia ou com o para-choque, ou há linhas de fresta, emenda de peça ou de cor a menos de 30 mm uma da outra fora dos encontros',
      'a fresta da porta da cabine não corre na borda de fora do alargamento (raio 570, 150 mm da boca) ou corta o alargamento',
      'a fresta da frente da porta da cabine não corre 122 mm atrás do perfil do para-brisa (100 atrás da ponta do vidro), ou o topo dela não deixa 75 mm de faixa de teto acima, em 2035',
      'falta a faixa recuada da entrada de ar ou o lugar da placa no para-choque dianteiro, ou o lugar da placa no traseiro',
      'o plástico ou a moldura toca ou atravessa o pneu, a saia ou o para-choque toca a aba do arco, ou a silhueta com eles passa de 5560 por 2060 mm',
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
