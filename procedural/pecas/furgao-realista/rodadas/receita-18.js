/* furgao-realista — furgão médio de teto alto com cabine de bico curto, na etapa 5 de 7 da modelagem (plano
 * docs/modelar/planos/2026-10-30-furgao-realista.md, alinhamento no banco de provas furgao-realista-2026-10-30): a lataria
 * detalhada, refeita pela prancha ajustada de 2026-10-31 (a frente mais alta, o para-brisa que envolve as quinas, a curva do teto
 * de dois raios e os raios maiores nas quinas do teto, e o ajuste de largura de 2026-10-31, com as laterais fechando 3,9 graus acima do vinco de
 * cintura; ver "O ajuste da prancha" e "O ajuste de caráter da largura" em referencias/alvo.md). Sobre a chapa contínua da
 * etapa 1 (silhueta, raios e painéis da prancha cotada referencias/quatro-vistas.prancha.png, aceitos pela pessoa), esta etapa desenha as frestas das portas (as duas dianteiras da cabine, a de correr do lado direito e as
 * duas traseiras de abrir), o vinco de cintura discreto ao longo da lateral, as nervuras longitudinais do teto alto e a aba leve dos
 * quatro arcos das rodas, e abre na chapa os vãos do para-brisa, dos vidros das portas da cabine e dos das portas traseiras, cada um
 * com a aba dobrada para dentro conferida como moldura, cada canto cortado em diagonal para a subdivisão arredondá-lo. As luzes e o
 * acabamento vêm nas etapas 6 e 7.
 *
 * Etapa 4, as rodas e o forro dos arcos: as quatro rodas saem da família `roda-pneu` (pneu 235/65 aro 16 com bojo e ombro, roda de chapa de aço com 5
 * parafusos), na bitola e nos eixos da prancha e apoiadas no chão, e cada arco ganha um forro escuro por dentro da chapa, a 25 mm do pneu, que fecha o oco
 * atrás da roda. A receita expande a chamada da família dentro de `gerarPassos`, soma uma base aos ids locais dela e põe o sufixo da roda nos nomes das
 * partes (pneu, aro, cubo, disco), como a hélice do avião faz com a pá; o forro é a mesma seção varrida em arco que a moldura.
 *
 * Etapa 5, os vidros, as borrachas e o interior. Cada vão de vidro da etapa 2 (o para-brisa, os das duas portas da cabine e os das duas portas traseiras; a carga
 * fica fechada nas laterais) recebe um cristal escurecido e translúcido: as próprias faces que o vão tirou da chapa, com a volta recuada 7,5 mm para dentro pela
 * superfície (além da perna da aba, de 5 mm) e os pontos de dentro onde estão, de modo que o cristal fica rente à lataria. A junta de 7,5 mm e a aba ficam
 * sob a borracha de vão, escura, varrida pela volta do vão (`friso` com perfil: 15 mm sobre a chapa, 10 sobre o cristal, 2,2 mm de altura, entrando 1,5 mm
 * nos dois), que entra na conferência da moldura do vão junto com a aba. Atrás dos cristais fica um interior simples, todo dentro da chapa: o piso, que
 * assenta no topo dos túneis dos quatro forros dos arcos (736,6) e fica a 10 mm da chapa dos dois lados; a divisória entre a cabine e a carga, que é a seção de dentro
 * da chapa recuada 28 mm, de lado a lado e do piso ao teto, em z 560; os bancos do motorista (esquerdo, +x) e do passageiro, volumes em L com os cantos
 * chanfrados; e o painel, sob o pé do para-brisa. Quem olha pelo para-brisa vê o painel, os bancos e a divisória, pelas portas da cabine os bancos, e pelas
 * portas traseiras a divisória e o piso, e nenhum vão deixa ver o oco. Posição nenhuma é digitada: o interior é derivado da seção da chapa (`secaoDeDentro`)
 * e da TABELA. O recuo do cristal, o perfil da borracha e as medidas do interior são parâmetros da TABELA (`vidro_*`, `borracha_*`, `piso_*`, `divisoria_*`,
 * `banco_*`, `painel_*`).
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
 *
 * Os arquivos. A receita passou do limiar da convenção de divisão (docs/modelar/banco-de-provas/navegacao-de-receitas-2026-11-05) e
 * se divide por assunto: aqui ficam a TABELA, `gerarPassos`, os contatos, os vãos, as ilhas, os pontos e o PLANO; a derivação mora em
 * `receita/`: `geometria.js` (as contas), `forma.js` (perfis e anéis), `plastico.js` (o plástico de baixo), `gaiola.js` (`derivar`),
 * `interior.js`, `rodas.js` e `nomes.js` (os nomes das partes). `npm run receita:mapa -- furgao-realista` dá a linha de cada trecho.
 */

import { expandirChamadasDeComposicao } from '../../../nucleo/composicoes.js';
import { m } from '.././receita/geometria.js';
import { forma } from '.././receita/forma.js';
import { derivar } from '.././receita/gaiola.js';
import { contornoPorRetos, derivarFarois, derivarGrade } from '.././receita/farol.js';
import { derivarInterior } from '.././receita/interior.js';
import { BASE_DAS_RODAS, comBase, familias } from '.././receita/rodas.js';
import {
  ABAS_DOS_ARCOS, ABAS_DOS_VAOS, BANCOS, BORRACHAS, CRISTAIS, FAROIS, FORROS, LUZES, PISCAS, MOLDURAS, PLASTICOS, RODAS, SUFIXOS_DAS_RODAS,
  nomeDaAbaDoArco, nomeDaBorracha, nomeDoCristal,
} from '.././receita/nomes.js';

export { forma } from '.././receita/forma.js';
export { derivarPlastico } from '.././receita/plastico.js';
export { derivar } from '.././receita/gaiola.js';
export { derivarInterior } from '.././receita/interior.js';

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
  // o forro dos arcos: a folga do túnel até a banda do pneu, a da parede de dentro até a face de dentro do pneu, quanto ele passa da boca
  // do arco para encostar na chapa, e o raio onde a parede de dentro acaba. As duas folgas eram uma só até 2026-11-05: separadas, o
  // túnel sobe ou desce sem mexer na parede que encosta nos forros do piso.
  forro_folga_tunel: 25,
  forro_folga_parede: 25,
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
  // etapa 6, as luzes e a grade: cada uma é um vão na gaiola, de cantos retos pelas arestas (a subdivisão os arredonda), com a aba dobrada
  // como os vidros e uma lente rente à lataria. Os anéis são os que já existem, para a forma aceita da chapa não mudar.
  // Os faróis e os piscas (2026-11-05, forma A de `referencias/farol-dianteiro.esboco.json`) são vãos pelo contorno sobre a chapa pronta,
  // em [x, y] mm na vista frontal, no lado esquerdo (+x; o direito o espelha): o farol é afinado, com a ponta de dentro descendo em diagonal
  // até a grade e a de fora indo a x 980, onde a quina vira lateral, e o pisca é a ponta de fora do mesmo conjunto, um segundo vão na lente.
  farol_perfil: [[460, 840], [985, 840], [985, 1080], [490, 1080]], // o conjunto 1 do esboço (farol de 240 mm), o trapézio com o topo na boca do capô
  farol_raio: 40, // a concordância dos quatro cantos do farol
  pisca_x_dentro: 890, // o pisca ocupa a ponta de fora do farol, de x 890 à borda dele
  farol_recuo_lente: 3, // a lente do farol entra 3 mm no vão: a borda da chapa e a aba aparecem em volta dela
  pisca_margem: 6, // o vão do pisca fica 6 mm dentro da borda do farol (3 além da lente), porque o vão não pode encostar na borda do sólido
  pisca_recuo_lente: 0, // o pisca enche o vão aberto na lente do farol, e por isso encosta nela
  // a grade (2026-11-05, conjunto 1 do esboço): também um vão pelo contorno, de x -420 a 420, do topo do para-choque (que sai da seção do para-choque, e
  // não de um número aqui) a grade_topo_y; os cantos de cima têm concordância e os de baixo ficam vivos no para-choque. O vão começa grade_embutido mm
  // abaixo do topo dele, por trás da pele do para-choque, para a aba de baixo ficar escondida e nenhuma fresta abrir entre os dois
  grade_embutido: 24,
  grade_meia_largura: 420,
  grade_topo_y: 1060,
  grade_raio_topo: 45,
  grade_lente_recuo: 3, // a lente da grade entra 3 mm no vão, como a do farol
  grade_recuo: 18, // a lente escura da grade recua 18 mm para dentro do vão, dentro da perna de 20 mm da aba
  grade_barras_y: [850, 928, 1006], // as três barras horizontais
  grade_barra_largura: 760,
  grade_barra_altura: 28,
  grade_barra_saliencia: 14, // quanto a barra sai da lente para a frente (sempre atrás da superfície da chapa)
  lanterna_base_y: 830, // na quina de trás, entre a borda da porta traseira e a lateral, abaixo do vinco de cintura
  // o anel boca1 (1125): acima dele os anéis de enchimento ficam a 12,5 mm, e o trecho curto junto da quina faz a aba do vão se dobrar
  lanterna_topo_y: 1130,
  // a luz de freio alta, sobre as portas traseiras: na quina curva da traseira para o teto, entre dois anéis do ombro (o das portas é o 2),
  // de x -r a x r pela coluna r de número freio_coluna (a r3 cai em x 185 a 191), com cerca de 370 por 55 mm
  freio_anel_base: 3,
  freio_anel_topo: 4,
  freio_coluna: 3,
  luz_folga_borda: 5.5, // a lente começa logo além da perna da aba (5 mm)
  luz_espessura: 4,
  vao_canto_passo_cabine: 28,
  vao_canto_passo_traseiro: 25,
  aba_vao_largura: 20,
  aba_vao_raio: 3,
  aba_vao_angulo: 90,
  vidro_folga_borda: 7.5, // o cristal começa 7,5 mm para dentro do vão, além da perna da aba (5 mm), e a borracha cobre a junta
  vidro_espessura: 4,
  // borracha de vão (etapa 5): seção [u, v] sobre a borda do vão, u para o vidro e v para fora da chapa; entra 1,5 mm na chapa e no cristal, e cobre a junta de 7,5 mm
  borracha_fora: 15, // quanto passa sobre a chapa
  borracha_dentro: 10, // quanto passa sobre o cristal (2,5 mm além da borda dele)
  borracha_altura: 2.2, // baixa o bastante para não sobrar como filete fora do contorno nas vistas de frente e de trás (a pessoa pediu em 2026-11-03)
  borracha_fundo: 1.5,

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

  // interior (etapa 5), todo dentro da chapa: o piso assenta nos topos dos túneis dos forros dos arcos (que sobem a 736,6) e fica a 10 mm da face de
  // dentro da chapa, a divisória atrás dos bancos, dois bancos de cabine e o painel. A margem é a folga entre a divisória e a face de dentro da chapa.
  piso_y: 735.5,
  piso_espessura: 20,
  piso_meia_largura: 988,
  piso_z_frente: 1740,
  piso_z_tras: -2655,
  piso_raio_cantos: 90,
  divisoria_z: 560, // o eixo da divisória, atrás das janelas das portas da cabine (que acabam em 620)
  divisoria_espessura: 30,
  divisoria_margem: 28,
  banco_x: 400, // o eixo de cada banco; o do motorista fica no lado esquerdo (+x)
  banco_largura: 540,
  banco_costas_z: 650, // a face de trás do encosto
  banco_costas_espessura: 120,
  banco_profundidade: 520, // do fundo do encosto à frente do assento
  banco_assento_y: 1190,
  banco_topo_y: 1790,
  banco_chanfro: 22,
  painel_z_tras: 1470,
  painel_z_frente: 1735,
  painel_topo_y: 1400,
  painel_meia_largura: 850,
  painel_chanfro: 25,
};

/* ---------- passos ---------- */

const CHAPA = { origem: { op: 'subdivisao', id: 1 } };
/** Os ids dos passos dos faróis: por lado k, o vão do farol (800 + 2k), o do pisca na lente dele (801 + 2k) e a aba (940 + k). */
const ID_FAROL = (k) => 800 + 2 * k;
const ID_PISCA = (k) => 801 + 2 * k;
const ID_ABA_FAROL = (k) => 940 + k;
/** Os ids dos passos da grade: o vão (804), a aba (944), a translação da lente (945) e as barras (130 + k). */
const ID_GRADE = 804;

/** A seção da borracha de vão, [u, v] em mm, u para o cristal e v para fora da chapa: assenta na chapa e no cristal (entra `borracha_fundo` nos dois), passa
 *  `borracha_fora` sobre a chapa e `borracha_dentro` sobre o cristal, sobe `borracha_altura` e desce com o beiral redondo nas duas bordas. */
export function perfilDaBorracha(T) {
  const F = T.borracha_fora; const D = T.borracha_dentro; const H = T.borracha_altura; const B = T.borracha_fundo;
  return [[-F, -B], [D, -B], [D, 0.5], [D - 2, 0.46 * H], [D - 5, 0.8 * H], [D - 8, H], [-6, H], [-F + 2.5, 0.55 * H], [-F, 0.4]];
}

/** Os PASSOS: a chapa subdividida com espessura, as abas dos vãos dos vidros,  as abas dos arcos, as quatro rodas da família e o forro dos arcos (que vem com o plástico). */
export function gerarPassos(T) {
  const { passo, plastico, rodas, vidros, cristais, luzes, lentes, abasDosArcos, forma: f } = derivar(T);
  const passos = [
    ['subdivisao', { origemId: 1, ...passo, borda: 'cantos', niveis: T.niveis, espessura: m(T.espessura) }],
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
  /* os cristais: a mesma superfície do vão, recuada da borda, engrossada para dentro; e a borracha de vão por cima da junta, varrida pela volta do vão */
  const perfilBorracha = perfilDaBorracha(T).map(([u, v]) => [m(u), m(v)]);
  cristais.forEach((c, k) => {
    const sel = { origem: { op: 'subdivisao', id: 100 + k } };
    passos.push(['subdivisao', { origemId: 100 + k, vertices: c.vertices, faces: c.faces, borda: 'cantos', niveis: T.niveis, espessura: m(T.vidro_espessura) }]);
    passos.push(['parte', { nome: nomeDoCristal(c.nome), sel }]);
    passos.push(['material', { sel, usa: 'vidro' }]);
  });
  vidros.forEach((v, k) => {
    const sel = { origem: { op: 'friso', id: 110 + k } };
    passos.push(['friso', { origemId: 110 + k, superficie: CHAPA.origem, linha: { nome: nomeDaBorracha(v.nome), pontos: [...v.volta, v.volta[0]] }, perfil: perfilBorracha }]);
    passos.push(['parte', { nome: nomeDaBorracha(v.nome), sel }]);
    passos.push(['material', { sel, usa: 'borracha' }]);
  });
  /* as luzes e a grade (etapa 6): a aba dobrada de cada vão, como a dos vidros, e a lente rente à lataria, no material de cada uma */
  luzes.forEach((v, k) => {
    const sel = { origem: { op: 'friso', id: 900 + k } };
    passos.push(['friso', {
      origemId: 900 + k, superficie: CHAPA.origem, linha: { nome: v.linha, pontos: [...v.volta, v.volta[0]] },
      aba: { largura: m(T.aba_vao_largura), angulo: T.aba_vao_angulo, raio: m(T.aba_vao_raio) },
    }]);
    passos.push(['parte', { nome: v.nome, sel }]);
    passos.push(['material', { sel, usa: 'azul' }]);
  });
  /* a aba e a lente são a mesma parte, cada uma no seu material: o PLANO tem teto de 64 partes */
  lentes.forEach((c, k) => {
    const sel = { origem: { op: 'subdivisao', id: 920 + k } };
    passos.push(['subdivisao', { origemId: 920 + k, vertices: c.vertices, faces: c.faces, borda: 'cantos', niveis: T.niveis, espessura: m(T.luz_espessura) }]);
    passos.push(['parte', { nome: c.nome, sel }]);
    passos.push(['material', { sel, usa: c.material }]);
  });
  /* os faróis e os piscas (2026-11-05): cada farol é um vão pelo contorno na camada da frente da chapa, vista pela frente, com a lente
     recuada; o pisca é um segundo vão aberto nessa lente, e a aba do farol é o friso sobre a borda do vão. A chapa de cada vão é a
     do vão anterior, e a carroceria é a do último */
  const farois = derivarFarois(T);
  const mm = (x) => m(x);
  farois.forEach((fa, k) => {
    const chapaAnterior = k === 0 ? CHAPA : { origem: { op: 'aberturaPorContorno', id: ID_FAROL(k - 1) } };
    passos.push(['aberturaPorContorno', {
      origemId: ID_FAROL(k), chapa: chapaAnterior, contorno: contornoPorRetos(fa.farol, mm, T.farol_raio), vista: 'z', sentido: '+', lente: true, recuoDaLente: m(T.farol_recuo_lente),
    }]);
    passos.push(['aberturaPorContorno', {
      origemId: ID_PISCA(k), chapa: { origem: { op: 'aberturaPorContorno', id: ID_FAROL(k), parte: 'lente' } }, contorno: contornoPorRetos(fa.pisca, mm, fa.raioPisca), vista: 'z', lente: true, recuoDaLente: m(T.pisca_recuo_lente),
    }]);
    const aba = { origem: { op: 'friso', id: ID_ABA_FAROL(k) } };
    passos.push(['friso', {
      origemId: ID_ABA_FAROL(k), superficie: { op: 'aberturaPorContorno', id: ID_FAROL(k) }, linha: { nome: `abaVaoFarol${fa.lado}` },
      aba: { largura: m(T.aba_vao_largura), angulo: T.aba_vao_angulo, raio: m(T.aba_vao_raio) },
    }]);
    const lenteDoFarol = { origem: { op: 'aberturaPorContorno', id: ID_PISCA(k) } };
    passos.push(['parte', { nome: `farol${fa.lado}`, sel: aba }]);
    passos.push(['material', { sel: aba, usa: 'azul' }]);
    passos.push(['parte', { nome: `farol${fa.lado}`, sel: lenteDoFarol }]);
    passos.push(['material', { sel: lenteDoFarol, usa: 'farol' }]);
    const pisca = { origem: { op: 'aberturaPorContorno', id: ID_PISCA(k), parte: 'lente' } };
    passos.push(['parte', { nome: `pisca${fa.lado}`, sel: pisca }]);
    passos.push(['material', { sel: pisca, usa: 'pisca' }]);
  });
  /* a grade (2026-11-05): um terceiro vão pelo contorno, sobre a chapa do último farol; a lente escura recua `grade_recuo` para dentro do
     vão, dentro da perna da aba, e as três barras são extrusões retas que nascem na lente e ficam atrás da superfície da chapa; a aba, a
     lente e as barras são a mesma parte 'grade'. A base do vão é o topo do para-choque, que sobe do lado de fora e cobre a parede de baixo */
  const grade = derivarGrade(T);
  const chapaDaGrade = { origem: { op: 'aberturaPorContorno', id: ID_FAROL(farois.length - 1) } };
  passos.push(['aberturaPorContorno', {
    origemId: ID_GRADE, chapa: chapaDaGrade, contorno: contornoPorRetos(grade.contorno, mm, grade.raio), vista: 'z', sentido: '+', lente: true, recuoDaLente: m(T.grade_lente_recuo),
  }]);
  const abaDaGrade = { origem: { op: 'friso', id: 944 } };
  passos.push(['friso', {
    origemId: 944, superficie: { op: 'aberturaPorContorno', id: ID_GRADE }, linha: { nome: 'abaVaoGrade' },
    aba: { largura: m(T.aba_vao_largura), angulo: T.aba_vao_angulo, raio: m(T.aba_vao_raio) },
  }]);
  const lenteDaGrade = { origem: { op: 'aberturaPorContorno', id: ID_GRADE, parte: 'lente' } };
  passos.push(['transladar', { sel: lenteDaGrade, d: [0, 0, -m(T.grade_recuo)] }]);
  passos.push(['parte', { nome: 'grade', sel: abaDaGrade }]);
  passos.push(['material', { sel: abaDaGrade, usa: 'azul' }]);
  passos.push(['parte', { nome: 'grade', sel: lenteDaGrade }]);
  passos.push(['material', { sel: lenteDaGrade, usa: 'grade' }]);
  /* a face da lente recuada fica em z do nariz menos o degrau da frente menos o recuo; a barra sai um pouco para trás dela e vem até
     `grade_barra_saliencia` à frente, de modo que a frente da barra ainda fica atrás da chapa */
  const zFaceDaLente = T.comprimento / 2 - T.degrau_frente_recuo - T.grade_recuo;
  grade.barras.forEach((b, k) => {
    const sel = { origem: { op: 'extrusao', id: 130 + k } };
    passos.push(['extrusao', {
      origemId: 130 + k, eixo: 'z', altura: m(T.grade_barra_saliencia + 2), em: [0, 0, m(zFaceDaLente - 2)],
      perfil: { retangulo: { largura: m(T.grade_barra_largura), profundidade: m(T.grade_barra_altura), centro: [0, -m(b.y)] } },
    }]);
    passos.push(['parte', { nome: 'grade', sel }]);
    passos.push(['material', { sel, usa: 'grade' }]);
  });
  const carroceria = { origem: { op: 'aberturaPorContorno', id: ID_GRADE } };
  passos.push(['parte', { nome: 'carroceria', sel: carroceria }]);
  passos.push(['material', { sel: carroceria, usa: 'azul' }]);
  /* o interior: piso, divisória, bancos e painel, cada um uma extrusão do perfil que `derivarInterior` escreve */
  const { piso, divisoria, bancos, painel } = derivarInterior(T, f);
  const perfilM = (pl) => pl.map(([u, v]) => [m(u), m(v)]);
  const peca = (id, nome, material, args) => {
    const sel = { origem: { op: 'extrusao', id } };
    passos.push(['extrusao', { origemId: id, ...args }]);
    passos.push(['parte', { nome, sel }]);
    passos.push(['material', { sel, usa: material }]);
  };
  const r = piso.perfil.retangulo;
  peca(120, piso.nome, 'piso', { perfil: { retangulo: { largura: m(r.largura), profundidade: m(r.profundidade), centro: r.centro.map(m), cantos: m(r.cantos) } }, altura: m(piso.altura), em: [0, m(piso.y0), 0] });
  peca(121, divisoria.nome, 'divisoria', { perfil: perfilM(divisoria.perfil), eixo: 'z', altura: m(divisoria.espessura), em: [0, 0, m(divisoria.z0)] });
  bancos.forEach((b, k) => peca(122 + k, b.nome, 'banco', { perfil: perfilM(b.perfil), eixo: 'x', altura: m(b.largura), em: [m(b.x0), 0, 0] }));
  peca(124, painel.nome, 'painelEscuro', { perfil: perfilM(painel.perfil), eixo: 'x', altura: m(painel.largura), em: [m(painel.x0), 0, 0] });
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

/* As abas nascem na chapa: a do vão continua a borda dobrada para dentro, e a do arco assenta na lateral em volta do arco, entrando
   meia espessura nela. A chapa e as rodas não se tocam: o arco tem 65 mm de folga sobre o pneu e a face de fora do pneu fica 37,5 mm
   para dentro da lateral. */
/* O plástico de baixo e as molduras se somam por fora da chapa. A saia, a moldura e os para-choques têm a borda que encosta na chapa entrando 1 mm nela.
   A continuação escura do alargamento é parte da saia e dos para-choques, na mesma malha: eles vão até a boca do arco, cobrem a aba (4 mm de altura) e
   sobem no alargamento, e a moldura da cor da lataria assenta no topo deles. A moldura passa 2 mm ou mais acima da aba; só a parede dela na boca,
   de 0 a 3 mm do arco, encosta na raiz da aba. Nenhuma peça toca o pneu. */
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
  ...ABAS_DOS_VAOS.map((aba, k) => ({ par: [aba, BORRACHAS[k]], motivo: 'a borracha passa sobre a perna da aba (5 mm para dentro do vão) e entra 1,5 mm abaixo da superfície, onde a aba dobra' })),
  ...BORRACHAS.map((b) => ({ par: ['carroceria', b], motivo: 'a borracha assenta na chapa em volta do vão: passa 15 mm sobre ela e entra 1,5 mm na superfície' })),
  ...BORRACHAS.map((b, k) => ({ par: [b, CRISTAIS[k]], motivo: 'o cristal começa 7,5 mm para dentro da borda do vão e a borracha passa 2,5 mm sobre a borda dele, entrando 1,5 mm: é a borracha que segura o cristal, e é ela que cobre a junta' })),
  ...[...LUZES, ...FAROIS, 'grade'].map((a) => ({ par: ['carroceria', a], motivo: 'a aba da luz nasce na parede da borda do vão e continua a chapa dobrada para dentro; as malhas se cruzam por décimos de milímetro na costura' })),
  ...FAROIS.map((farol, k) => ({ par: [farol, PISCAS[k]], motivo: 'o pisca é o pedaço que o vão do pisca tirou da lente do farol, do tamanho do vão: as duas se encostam na parede dele' })),
  { par: ['pisoInterior', 'divisoria'], motivo: 'a divisória assenta no piso e entra 1 mm nele' },
  ...BANCOS.map((b) => ({ par: ['pisoInterior', b], motivo: 'o banco assenta no piso e entra 1 mm nele' })),
  { par: ['pisoInterior', 'painel'], motivo: 'o painel assenta no piso e entra 1 mm nele' },
  ...FORROS.map((forro) => ({ par: ['pisoInterior', forro], motivo: 'o piso assenta no topo do túnel do forro do arco e entra 1 mm nele (a altura do piso é `piso_y` e a do túnel sai de `forro_folga_tunel`, na TABELA); são o único apoio dele, afastado da chapa dos dois lados' })),
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
  const { vidros, luzes, portas, bordaDeBaixo, passo } = derivar(T);
  const naChapa = new Set(passo.vertices);
  const vaos = vidros.map((v) => ({ nome: v.nome, borda: [...v.volta, v.volta[0]], frisos: [v.linha, nomeDaBorracha(v.nome)] }));
  for (const v of luzes) vaos.push({ nome: v.nome, borda: [...v.volta, v.volta[0]], frisos: [v.linha] });
  derivarFarois(T).forEach((fa, k) => vaos.push({ nome: `farol${fa.lado}`, superficie: { op: 'aberturaPorContorno', id: ID_FAROL(k) }, frisos: [`abaVaoFarol${fa.lado}`] }));
  vaos.push({ nome: 'grade', superficie: { op: 'aberturaPorContorno', id: ID_GRADE }, frisos: ['abaVaoGrade'], parcial: { motivo: 'os dois cantos de baixo do vão são vivos e ficam 24 mm abaixo do topo do para-choque, por trás da pele dele: a aba não dobra nesses 44 mm de cada lado, que nenhuma vista de frente alcança, e a lente e a aba de cima e dos lados cobrem o resto da volta' } });
  derivarFarois(T).forEach((fa, k) => vaos.push({ nome: `pisca${fa.lado}`, superficie: { op: 'aberturaPorContorno', id: ID_PISCA(k) }, semMoldura: { motivo: 'é o vão que o pisca ocupa na lente do farol, do tamanho dele; a borda é a do pisca com a lente, sem aba nem moldura' } }));
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
    { nome: `piso do interior, embaixo e atrás: assentado no topo dos túneis dos forros, de ${T.piso_espessura} mm, a ${T.piso_meia_largura} mm do eixo e acabando ${-T.piso_z_tras} mm atrás do centro`, parte: 'pisoInterior', medida: 'minimo', em: [-T.piso_meia_largura, T.piso_y, T.piso_z_tras], toleranciaMm: tol },
    { nome: 'divisória, no alto e na face da frente: a seção de dentro recuada 28 mm da chapa e do teto, 15 mm à frente do eixo dela em z 560', parte: 'divisoria', medida: 'maximo', em: [T.meia_largura - T.divisoria_margem, T.altura - T.divisoria_margem, T.divisoria_z + T.divisoria_espessura / 2], toleranciaMm: tol },
    { nome: 'banco do motorista, no alto da frente do assento e do lado de fora: 540 mm de largura no lado esquerdo, encosto até 1790, assento a 520 mm do fundo do encosto', parte: 'bancoMotorista', medida: 'maximo', em: [T.banco_x + T.banco_largura / 2, T.banco_topo_y, T.banco_costas_z + T.banco_profundidade], toleranciaMm: tol },
    { nome: `forro do arco dianteiro esquerdo, embaixo e atrás: a parede de dentro ${T.forro_folga_parede} mm além da face de dentro do pneu mais os ${T.plastico_espessura} mm da espessura, as pontas na soleira e a borda da aba ${T.forro_sobra} mm além da boca`, parte: 'forroArcoDianteiroEsquerdo', medida: 'minimo', em: [xDentro - T.forro_folga_parede - T.plastico_espessura, T.soleira_y, f.zD - T.arco_raio - T.forro_sobra], toleranciaMm: 1 },
    { nome: `forro do arco traseiro direito, em cima e na frente: a aba na face de dentro da chapa, o alto da borda ${T.forro_sobra} mm acima da boca e a parede de dentro ${T.forro_folga_parede} mm além do pneu mais os ${T.plastico_espessura} mm da espessura`, parte: 'forroArcoTraseiroDireito', medida: 'maximo', em: [-(xDentro - T.forro_folga_parede - T.plastico_espessura), f.rPneu + T.arco_raio + T.forro_sobra, f.zT + T.arco_raio + T.forro_sobra], toleranciaMm: 1 },
  ];
}

const receita = {
  meta: { nome: 'furgao-realista', desc: 'furgão médio de teto alto com cabine de bico curto, etapa 5: os cristais escurecidos rentes à lataria no para-brisa, nas portas da cabine e nas portas traseiras, a borracha de vão em volta de cada um, o piso, os bancos da cabine, o painel e a divisória; a lataria em chapa contínua com as frestas das portas, o vinco de cintura, as nervuras do teto, as abas dos arcos, o para-brisa envolvente e os vãos dos vidros abertos, a saia e os para-choques em plástico escuro e o alargamento dos arcos (da cor da lataria em cima, escuro embaixo), por fora da chapa, o forro escuro dos arcos por dentro e as quatro rodas da família roda-pneu (pneu 235/65 aro 16)' },
  PARAMS: TABELA,
  MATERIAIS: {
    azul: { tipo: 'liso', cor: '#5d75c9' },
    borracha: { tipo: 'liso', cor: '#26262b' },
    aco: { tipo: 'metal', cor: '#a9adb3', acabamento: 'escovado' },
    plastico: { tipo: 'liso', cor: '#39393f' },
    forro: { tipo: 'liso', cor: '#1b1c1f' },
    // o cristal escurecido, translúcido pela mistura do adaptador (opacidade 0,5) para o interior aparecer; o brilho vem da aspereza baixa e da metalicidade
    vidro: { tipo: 'liso', cor: '#1b2530', mistura: 'transparente', opacidade: 0.5, aspereza: 0.1, metalicidade: 0.35 },
    piso: { tipo: 'liso', cor: '#2c2d31' },
    divisoria: { tipo: 'liso', cor: '#5a5d66' },
    banco: { tipo: 'liso', cor: '#3d4048' },
    painelEscuro: { tipo: 'liso', cor: '#26272b' },
    // as lentes das luzes (etapa 6), opacas para o oco do furgão não aparecer por elas
    farol: { tipo: 'liso', cor: '#d9e0e4', aspereza: 0.12, metalicidade: 0.4 },
    lanterna: { tipo: 'liso', cor: '#9a1f1f', aspereza: 0.2 },
    pisca: { tipo: 'liso', cor: '#d98a1f', aspereza: 0.2 },
    grade: { tipo: 'liso', cor: '#1d1e21', aspereza: 0.7 },
  },
  /* `origem` diz o referencial; os pontos da gaiola, derivados da TABELA atual, entram aqui pelo nome. */
  get TOPO() {
    return {
      origem: 'chão, no meio do furgão em x e em z; y para cima e a frente do furgão em +z',
      ...derivar(this.PARAMS).pontos,
    };
  },
  PLANO: {
    objeto: 'furgão médio de teto alto, etapa 5: chapa de 5400 por 2000 por 2500 com frestas, saia, para-choques e alargamento dos arcos (5560 por 2060), forro e rodas, mais cristais, borrachas de vão e interior simples',
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
      ...CRISTAIS.map((nome) => ({
        nome,
        forma: `cristal escurecido e translúcido do vão ${nome === 'vidroParaBrisa' ? 'do para-brisa' : nome.includes('Cabine') ? `da porta da cabine ${nome.endsWith('Esquerda') ? 'esquerda' : 'direita'}` : `da porta traseira ${nome.endsWith('Esquerda') ? 'esquerda' : 'direita'}`}: a mesma superfície do vão, rente à lataria, com a volta recuada 7,5 mm da borda e 4 mm de espessura para dentro`,
        tecnica: 'subdivisao das faces que o vão tirou da chapa, com a volta recuada pela superfície, material translúcido escuro',
      })),
      ...BORRACHAS.map((nome, k) => ({
        nome,
        forma: `borracha escura de vão em volta do ${CRISTAIS[k]}: seção de 25 mm (15 sobre a chapa e 10 sobre o cristal) e 2,2 mm de altura, entrando 1,5 mm na chapa e no cristal, cobrindo a junta e a aba`,
        tecnica: 'friso de perfil desenhado sobre a volta do vão, nos nomes da gaiola, declarado com a aba na moldura do vão',
      })),
      {
        nome: 'grade',
        forma: 'grade escura e fosca entre os faróis, sem marca, de x -420 a 420 e de y 724 (topo do para-choque) a 1060, cantos de cima de raio 45 e os de baixo vivos; lente recuada 18 mm, aba em volta e três barras retas de 760 mm em y 850, 928 e 1006',
        tecnica: 'terceira aberturaPorContorno na vista frontal, com lente, base 24 mm abaixo do topo do para-choque; friso com aba, lente transladada 18 mm em z e barras em extrusão em z; tudo na mesma parte',
      },
      ...['Esquerdo', 'Direito'].map((lado) => ({
        nome: `farol${lado}`,
        forma: `farol ${lado === 'Esquerdo' ? 'esquerdo' : 'direito'} trapézio de cantos de raio 40: [460, 840], [985, 840], [985, 1080], [490, 1080], topo na boca do capô, ponta de dentro junto da grade; lente clara recuada 3 mm e aba do vão para dentro`,
        tecnica: 'aberturaPorContorno na vista frontal, na camada da frente da chapa, com lente, recuoDaLente e concordância nos cantos; friso com aba sobre a borda do vão; a aba e a lente são a mesma parte, cada uma no seu material',
      })),
      ...['Esquerdo', 'Direito'].map((lado) => ({
        nome: `pisca${lado}`,
        forma: `pisca ${lado === 'Esquerdo' ? 'esquerdo' : 'direito'}, a ponta de fora do farol: x 890 a 985, na altura toda dele, 6 mm dentro da borda, cantos de fora na concordância do farol, lente âmbar opaca do tamanho do vão`,
        tecnica: 'segundo aberturaPorContorno, sobre a lente do farol, com lente e recuoDaLente 0; o pedaço retirado é o pisca',
      })),
      ...['Esquerda', 'Direita'].map((lado) => ({
        nome: `lanterna${lado}`,
        forma: `lanterna ${lado === 'Esquerda' ? 'esquerda' : 'direita'} vertical na quina de trás, embutida e rente: da porta traseira até a lateral, de y 830 a 1125, lente vermelha opaca de 4 mm e a aba do vão dobrada para dentro`,
        tecnica: 'subdivisao das faces que o vão tirou da chapa, com a volta recuada 5,5 mm pela superfície, e friso com aba sobre a borda do vão',
      })),
      {
        nome: 'luzDeFreio',
        forma: 'luz de freio alta no meio, sobre as portas traseiras, na quina curva da traseira para o teto: de x -190 a 190 e de y 2429 a 2467, cerca de 370 por 55 mm, lente vermelha opaca rente de 4 mm e a aba do vão dobrada para dentro',
        tecnica: 'subdivisao das faces que o vão tirou da chapa, com a volta recuada 5,5 mm pela superfície, e friso com aba sobre a borda do vão',
      },
      {
        nome: 'pisoInterior',
        forma: 'piso de 20 mm de y 735,5 a 755,5, 1976 mm de largura de z -2655 a 1740 com cantos de raio 90, assentado no topo dos forros dos arcos e a 10 mm da chapa dos dois lados',
        tecnica: 'extrusao de um retângulo de cantos redondos em y',
      },
      {
        nome: 'divisoria',
        forma: 'divisória de 30 mm em z 560, entre a cabine e a carga: a seção de dentro da chapa recuada 28 mm, de lado a lado e do piso ao teto, sem janela',
        tecnica: 'extrusao em z da seção de dentro (lateral, ombro e teto) derivada do perfil da chapa',
      },
      ...BANCOS.map((nome) => ({
        nome,
        forma: `banco do ${nome === 'bancoMotorista' ? 'motorista, no lado esquerdo (+x)' : 'passageiro, no lado direito'} da cabine, volume em L de 540 mm de largura em x ${nome === 'bancoMotorista' ? '130 a 670' : '-670 a -130'}: assento até 1190 e encosto até 1790 de z 650 a 770, com 520 mm de profundidade, cantos chanfrados, no piso`,
        tecnica: 'extrusao em x do perfil em L com os cantos chanfrados',
      })),
      {
        nome: 'painel',
        forma: 'painel da cabine sob o pé do para-brisa, de 1700 mm de largura e z 1470 a 1735, até 1400 de altura com a testa junto ao vidro, a face de baixo recuada e os cantos chanfrados, no piso',
        tecnica: 'extrusao em x do perfil lateral com os cantos chanfrados',
      },
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
      'a silhueta lateral, frontal ou de cima se afasta da prancha cotada mais de 15 mm em média ou 40 mm em algum ponto, medida com os cristais e as borrachas',
      'a frente não segue a prancha ajustada: boca do capô fora de 1100, pé do para-brisa fora de 1480, topo fora de 2110, ou a curva do teto sem os dois raios tangentes (1290 e 405) chegando ao teto plano em z 770',
      'o para-brisa não envolve as quinas: borda de cima ou de baixo reta na frontal, ou coluna de chapa diferente de cerca de 100 mm por lado, ou a ponta que não dobra pela quina',
      'um canto de vão de vidro aparece vivo na luz rasante, em degrau ou em aresta, em vez de arredondado',
      'uma fresta de porta não fecha a volta, muda de largura ao longo dela ou sai da linha da prancha',
      'falta uma das cinco portas, ou a de correr aparece também do lado esquerdo',
      'a aba de um vão de vidro não cobre a borda inteira, ou a borracha não cobre a junta inteira do cristal (15 mm sobre a chapa, 10 sobre o cristal), tem degrau ou dente no canto, sobe mais de 4 mm da lataria ou não é escura',
      'falta cristal no para-brisa, nas portas da cabine ou nas portas traseiras, ou há vidro no compartimento de carga nas laterais',
      'algum vão deixa ver o oco do furgão: por um cristal aparece o vazio, e não o painel, os bancos, a divisória ou o piso',
      'o cristal fica saliente ou afundado em relação à lataria além da borracha (mais de 1 mm na luz rasante), ou deixa fresta aberta entre a borda do vão e o cristal que a borracha não cubra',
      'falta o piso, a divisória, um dos dois bancos ou o painel, ou algum deles atravessa a chapa, a aba de um vão, um forro, o pneu ou outro volume do interior, ou fica a menos de 10 mm da chapa sem ser o apoio declarado',
      'o vinco de cintura ou as nervuras do teto não aparecem na luz rasante, ou aparecem fortes como degrau',
      'a aba de um arco sobra solta da lateral ou não acompanha o arco inteiro',
      'a lateral não é vertical até o vinco de cintura e inclinada 3,9 graus acima dele, ou o vão traseiro não acompanha a lateral 100 mm para dentro dela acima do vinco, ou um sulco do teto não cabe no teto de ±630',
      'a luz rasante ou a curvatura mostram amassado, ondulação ou serrilhado que a forma não pede, fora das frestas, dos vãos e dos vincos, nem na fresta da porta da cabine junto ao arco dianteiro',
      'um pneu não toca o chão, ou toca ou atravessa o arco da roda, a lateral ou o forro do arco',
      'a roda não é a da família roda-pneu no pneu 235/65 aro 16 (710 mm de diâmetro, 235 de largura, com bojo e ombro) numa roda de chapa de aço de 16 polegadas com 5 parafusos, ou não fica na bitola de 1730 e nos eixos da prancha',
      'o forro de um arco falta, deixa ver o oco do carro pelo arco, não é escuro, fica a menos de 20 mm ou a mais de 30 mm do pneu em algum ponto, ou não encosta na chapa em volta da boca',
      'o alargamento de um arco não cobre o pneu com folga visível, na vista de cima ou na frontal, ou o forro passa para fora da boca do arco',
      'a grade não é um vão escuro de lente recuada com três barras horizontais retas e cantos de cima redondos, ou deixa fresta aberta contra o para-choque, ou o farol não é o trapézio de cantos arredondados com o pisca âmbar na ponta de fora',
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
