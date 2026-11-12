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
 * da etapa 2 não muda, e o envelope passa de 5400 por 2040 a 5560 por 2100 (2080 na saia). Cada peça é a pele de uma seção da prancha (`TABELA.secao_*`,
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

import { expandirChamadasDeComposicao } from '../../nucleo/composicoes.js';
import { grau, m } from './receita/geometria.js';
import { forma } from './receita/forma.js';
import { derivar } from './receita/gaiola.js';
import { contornoPorRetos, derivarFarois, derivarGrade, derivarLanternas, derivarLuzesDeCanto, derivarPiscasLaterais, raiosDoContorno } from './receita/farol.js';
import { derivarInterior } from './receita/interior.js';
import { cantosDaColuna, derivarJanelas, pontasDaBase } from './receita/janela.js';
import { derivarLuzesPorDentro } from './receita/luzes.js';
import { derivarDetalhes, passosDosDetalhes } from './receita/detalhes.js';
import { BASE_DAS_RODAS, comBase, familias, materiaisDoPneu } from './receita/rodas.js';
import {
  ANTENA, MACANETAS, PLACAS_DAS_MACANETAS, PONTEIRA,
  ABAS_DOS_ARCOS, ABAS_DOS_VAOS, BANCOS, BASES_DO_RETROVISOR, BORRACHAS, COLUNAS_DA_JANELA, AROS, CRISTAIS, JANELAS_DA_CABINE, FAROIS, FORROS, LUZES, LANTERNAS_POR_DENTRO, LUZES_DE_CANTO, LUZES_POR_DENTRO, PISCAS_LATERAIS, MOLDURAS, REFLETORES, PLASTICOS, RODAS, SUFIXOS_DAS_RODAS,
  nomeDaAbaDoArco, nomeDaBorracha, nomeDoCristal,
} from './receita/nomes.js';

export { forma } from './receita/forma.js';
export { derivarPlastico } from './receita/plastico.js';
export { derivar } from './receita/gaiola.js';
export { derivarInterior } from './receita/interior.js';

export const TABELA = {
  // envelope da classe (prancha): 5400 de comprimento, 2040 de largura sem retrovisores (2000 até 2026-11-06, quando a pessoa pediu 20 mm a mais de cada lado), 2500 de altura, soleira em 300
  comprimento: 5400,
  meia_largura: 1020,
  altura: 2500,
  soleira_y: 300,

  // rodas e arcos: entre-eixos e balanço dianteiro (o traseiro sai da diferença), bitola, pneu 235/65 aro 16, arco com 65 mm de folga
  entre_eixos: 3300,
  balanco_dianteiro: 980,
  bitola: 1730, // a face de fora do pneu fica em x 982,5, 37,5 mm para dentro da lateral (17,5 até 2026-11-06: a bitola não mudou com a largura, porque o arco não pede)
  pneu_diametro: 710,
  pneu_largura: 235,
  // a forma do pneu (2026-11-08): 112 lados em volta (a silhueta de 96 lados ainda mostrava a faceta de perto), o ombro em arco de três segmentos no lugar do chanfro
  // reto, e o ângulo da normal suave do pneu, que apaga os gomos do arco (30 graus cada) e da parede do bojo (33) sem alisar a quina dos sulcos (90)
  pneu_lados: 112,
  pneu_ombro_redondo: 1,
  pneu_liso_angulo: 35,
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
  // no vinco em raio 3000 e sem quina; o prolongamento chega ao teto em x 930 (1860 de largura, os mesmos 90 mm de inclinação), e a quina do teto tem raio 300
  lateral_reta_ate_y: 1190,
  meia_largura_no_teto: 930,
  raio_lateral: 3000,
  raio_ombro: 300,

  // planta: raio das quinas verticais na frente (do para-choque à coluna do para-brisa) e atrás, e na borda do teto plano
  raio_planta_frente: 280,
  raio_coluna_base: 160,
  raio_coluna_topo: 160, // a prancha dobra o para-brisa pela quina de raio 160 no pé e no topo
  raio_teto_frente: 100,
  raio_planta_tras: 100,
  raio_teto_tras: 40,

  // chapa: espessura e níveis da subdivisão (com 2 níveis a chapa tem uns 4 vezes as faces de 1 nível e a cena fica pesada de abrir na bancada; o teto de 250 mil faces que se citava aqui não existia: era o adaptador da cena que estourava a pilha, e isso foi corrigido)
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
  porta_cabine_tras_z: 622, // 2026-11-11: 72 mm à frente de onde estava (550), pelo alvo da janela; a porta de correr não se move (`coluna_do_meio` cresce os mesmos 72)
  porta_cabine_topo_y: 2035,
  porta_fresta_coluna: 90, // a fresta da frente da porta, na diagonal, corre 90 mm atrás do perfil do para-brisa, medidos na perpendicular a ele (eram 122 até 2026-11-11)
  porta_frente_z: 1660, // abaixo de `porta_frente_quebra_y` a frente da porta é a vertical neste z, que desce até a costura do arco (era o pé da diagonal de 122 mm, no mesmo z)
  porta_frente_quebra_y: 1335, // a altura em que a diagonal passa para a vertical, entre dois anéis da gaiola (1319 e 1350): o recuo de 80 mm entre as duas fica debaixo da base do retrovisor
  quina_fresta_ref: 30, // a linha que ordena as colunas da quina da frente, onde a fresta da porta corria antes de recuar (o para-brisa não mudou)
  p_inicio_y: 1330, // a partir daqui, e até o ombro, a quina ganha colunas entre E e D: p1 onde a D antiga ficava e as outras a passo_p
  passo_p: 30, // distância entre as colunas p
  p_folga_d: 30, // 2026-11-09: a última coluna p fica a pelo menos isto da D, e as p ficam a passo_p da p1 (antes dividiam o vão até a D, e todas trocavam de lugar quando uma sumia): a p1 some com a D a 30 mm dela, e não a 15, e não sobra o nó de células de 12 mm que cortava a crista da coluna no canto do teto
  retorno_d_y: 2216, // até onde a coluna D, acima do topo da porta, acaba de voltar para a quina (2280, o ombro, até 2026-11-09: o fim do retorno junto com a morte da p1 deixava o nó da crista em y 2200 a 2230, e agora o nó cai mais baixo, na lateral, onde não corta a crista); as colunas p somem uma por anel pelo caminho, e não de uma vez
  para_brisa_topo_y: 2075, // o anel do topo do vão do para-brisa, que era o do topo da porta antes de ela descer
  coluna_do_meio: 182, // 110 até 2026-11-11, quando a traseira da porta da cabine avançou 72 mm (`porta_cabine_tras_z`): a frente da porta de correr fica onde estava
  porta_correr_largura: 1300,
  porta_correr_topo_y: 2200,
  porta_traseira_base_y: 600, // a prancha desenha 590; sobe 10 mm para a tira da fresta não encostar no degrau do para-choque em 580
  porta_traseira_topo_y: 2280, // 2026-11-06: o topo das portas é o anel `ombro` (ombro_y), 40 mm abaixo de onde a traseira vertical acaba e a curva do teto começa (altura menos raio_quina_traseira, 2320); as laterais das portas são verticais e os cantos de cima de fora, cortados em diagonal
  ombro_traseiro_y: 2380, // o anel `ombro${anel_porta_traseira}`, que era o topo das portas: fica onde estava, 10 mm para dentro da traseira vertical, e a luz de freio e o teto não mudam
  anel_porta_traseira: 2,

  // a coluna da fresta da frente na quina: quanto a quina fica para a frente dela e o mínimo da faixa de trás dela até a lateral
  recuo_quina_porta: 30,
  alcance_coluna_porta: 90,
  inicio_colunas_porta: 150,

  // vãos dos vidros (prancha): para-brisa (a base, 20 mm acima do pé; o topo é o anel do topo da porta da cabine; de lado ele acaba na
  // coluna q3 da quina, onde a prancha põe a ponta do vidro, a 100 mm da lateral), vidro da porta da cabine (base na altura do pé do
  // para-brisa, topo e moldura de trás; a frente é a quina da coluna), vidros das portas traseiras; e a aba dobrada de cada vão
  para_brisa_base_y: 1490, // a prancha desenha 1500 para o para-brisa e 1480 para o vidro da porta; com dois anéis a 20 mm um do outro a gaiola enche de anéis a 10 mm, que a aba do vão não dobra, e os dois ficam num anel só
  vidro_cabine_base_y: 1490, // do vão antigo da gaiola: só ordena os anéis, que a janela nova (abaixo) não usa
  vidro_cabine_topo_y: 1960,
  moldura_vidro_cabine: 70,
  // a janela da cabine (2026-11-12, pelo alvo que a pessoa aprovou; as cotas são do desenho, a ±30 mm, em z (a frente é o maior) e y vistas de lado, e `receita/janela.js` as lê): um vão de
  // vidro só, com uma borracha contínua em volta, a coluninha como barra preta da moldura sobre o vidro, o vidro grande atrás dela, o triângulo fixo na frente e, na metade da frente do triângulo, a peça
  // preta da base do retrovisor. O vão é aberto na chapa pronta pelo contorno visto de lado. As cotas são as da moldura de borracha: a borda de fora dela nos lados de baixo, de cima e de trás e na borda da frente do triângulo, e a borda do vidro que se vê junto da coluninha
  // e da peça preta; o vão sai delas recuado `janela_borracha_fora` onde a cota é a borda de fora e aberto `janela_borracha_dentro` onde é a do vidro
  janela_borracha_fora: 12, // quanto a borracha da janela passa sobre a chapa: com os 8 abaixo, a moldura preta tem 20 mm (a dos outros vãos tem `borracha_fora`)
  janela_borracha_dentro: 8, // quanto passa sobre o vidro: cobre a tira de 7,5 mm entre a borda do vão e a do cristal (`vidro_folga_borda`)
  janela_coluna_z_topo: 1217, // a coluninha, pela borda de trás dela (a da frente do vidro grande): no alto em z 1217, em y 1931,
  janela_coluna_y_topo: 1931,
  janela_coluna_z_pe: 1268, // e no pé em z 1268, em y 1349: o alto mais para trás que o pé, 51 mm em toda a altura
  janela_coluna_y_pe: 1349,
  janela_coluna_largura: 25, // a coluninha é uma barra preta de 25 mm sobre o vidro, de cima a baixo
  janela_topo_tras_y: 1966, // o alto do vidro grande: em y 1966 atrás e em 1948 na coluninha (desce para a frente)
  janela_topo_frente_y: 1948,
  janela_tras_z_topo: 747, // a borda de trás do vidro grande: o pé mais à frente que o alto
  janela_tras_z_pe: 820,
  janela_tras_pe_y: 1445, // o pé dela, onde o canto de baixo de trás faz a curva
  janela_pe_coluna_y: 1338, // a base do vidro grande é uma reta própria, do pé de trás até a coluninha, que desce para a frente e chega nela a esta altura
  janela_frente_recuo: 150, // a borda da frente do triângulo é paralela ao para-brisa e fica 150 mm atrás dele, medidos na perpendicular
  janela_ponta_y: 1324, // a ponta do triângulo: onde a base dele encontra a borda da frente, abaixo e um pouco atrás do pé do para-brisa
  janela_triangulo_pe_y: 1346, // a base do triângulo, mais deitada que a do vidro grande, sai do pé da coluninha a esta altura (o contorno da moldura tem um degrau de 8 mm na coluninha)
  janela_coluna_pe_folga: 4, // a barra da coluninha começa 4 mm acima do pé do vidro grande e acaba 2 mm abaixo do alto dele: as pontas ficam dentro da borracha
  janela_coluna_topo_folga: 2,
  janela_coluna_espessura: 4, // a barra é uma placa de borracha na altura da borracha da moldura (`borracha_altura`), engrossada 4 mm para dentro, que atravessa o vidro
  janela_retrovisor_tras_z: 1486, // a vertical que fecha o triângulo na frente e a de trás da peça preta
  janela_retrovisor_sobreposicao: 6, // a peça preta começa 6 mm antes do fim da borracha do triângulo, que ela cobre
  janela_retrovisor_saida: 3, // a peça preta é uma placa 3 mm para fora da lateral, acima da borracha (2,2 mm), engrossada `janela_retrovisor_espessura` para dentro: entra 1 mm na chapa
  janela_retrovisor_espessura: 4,
  janela_retrovisor_malha: 10, // a placa é uma malha de 10 por 10 partes por lado, para seguir a lateral e a quina
  janela_retrovisor_ponta_z: 1767, // a ponta da peça preta, na base dela: a borda da frente sai da borda do vidro e abre para a frente embaixo
  janela_retrovisor_base_y: 1313, // a base da peça: continua a base do triângulo, 25 mm abaixo dela, e é por onde a fresta da porta sai
  janela_segmentos_arco: 8, // por quarto de volta nos cantos dos vidros, para a borracha e a aba contornarem o canto sem facetas
  janela_raio: 8,
  janela_raio_pe_tras: 120, // o canto de baixo de trás do vidro grande, bem aberto
  janela_raio_topo_tras: 35,
  janela_raio_curva: 100, // o canto onde o alto da moldura vira para a descida paralela ao para-brisa, uma curva aberta só (não há mais canto próprio do triângulo)
  janela_raio_frente: 20,
  janela_raio_minimo: 4,
  vidro_traseiro_base_y: 1700,
  vidro_traseiro_topo_y: 2200,
  vidro_traseiro_x_dentro: 80, // a janela das portas traseiras é um retângulo com a mesma margem (vidro_traseiro_margem) de dentro, de fora e de cima
  vidro_traseiro_margem: 80,
  porta_traseira_folga_lanterna: 2, // 2026-11-06: a tira de fora da fresta das portas acaba tanto antes da borda de dentro da lanterna: com a borda da tira sobre o corte do vão, o motor apaga o vértice dela
  porta_traseira_vao_quina: 15, // 2026-11-06: a borda de fora das portas fica em lanterna_x_dentro; onde a traseira reta acaba antes dele (no alto), a coluna seguinte é um ponto da quina de trás pelo menos tanto além da borda
  // cantos dos vãos: cada canto é cortado por uma diagonal de vao_canto_degraus células (cada célula da gaiola vira dois triângulos, e o
  // vão fica com um de cada), e o vidro da porta da cabine e os das portas traseiras ganham colunas a esse passo junto de cada borda
  vao_canto_degraus: 2,
  porta_cabine_canto_degraus: 1, // o canto de cima da frente da porta da cabine, onde ela vira para a descida paralela ao para-brisa, é cortado em diagonal como os dos vãos, mas de uma célula só: com duas o vértice do meio sairia do arco da quina
  // etapa 6, as luzes: as lanternas e a luz de freio são cada uma um vão na gaiola, de cantos retos pelas arestas (a subdivisão os arredonda),
  // com a aba dobrada como os vidros e uma lente rente à lataria. Os anéis são os que já existem, para a forma aceita da chapa não mudar.
  // Os faróis, as luzes de canto, os piscas laterais e a grade deixaram a gaiola: são vãos pelo contorno sobre a chapa pronta, cada um com lente recuada,
  // e atrás de cada lente vêm o refletor (uma capa) e a lâmpada, em partes próprias (etapa 8, `referencias/luzes.md`). Tudo no lado esquerdo (+x); o direito o espelha.
  // O farol é um trapézio em [x, y] na vista frontal: o lado de dentro (junto da grade) vertical em x 460, a base e o topo horizontais, e o lado de fora inclinado,
  // com o topo mais curto que a base (as fotos), para a luz de canto encostar nele por uma fresta. A largura vem da divisão do conjunto de x 460 a 1005: o farol
  // fica com cerca de três quartos dele e a luz de canto, que dobra a quina e entra pela lateral, com o resto.
  farol_x_dentro: 460,
  farol_x_fora_base: 870, // o canto de baixo de fora, 410 mm de base (cerca de 1,7 por 1 com os 240 mm de altura aprovados)
  farol_inclinacao: 0.15, // quanto o lado inclinado avança na base, em fração da largura da base (nas fotos, cerca de 15%)
  farol_y_base: 840,
  farol_y_topo: 1080, // o topo na boca do capô
  farol_raio: 45, // a concordância dos quatro cantos do farol: 45 mm, o mais perto dos cantos pouco arredondados das fotos em que o corte da chapa fecha (com 20 a 40 mm a booleana do vão do lado direito deixa a borda aberta)
  farol_recuo_lente: 3, // a lente de cada luz entra 3 mm no vão: a borda da chapa e a aba aparecem em volta dela
  farol_aro_meia_largura: 6, // o aro cinza do farol é um friso simétrico sobre a borda do vão: 6 mm sobre a chapa e 6 sobre a lente (12 de largura, 2,2 de altura)
  farol_aro_altura: 1.8,
  farol_aro_fundo: 1.9, // quanto o aro entra na chapa (menos que a espessura de 2 mm)
  refletor_encosto: 4.8, // a borda do refletor assenta 4,8 mm atrás da superfície da chapa, 0,2 mm dentro da face de trás da lente (3 de recuo e 2 de espessura)
  refletor_espessura: 2,
  farol_refletor_profundidade: 140, // do plano da lente ao fundo do refletor, 145 mm contando o encosto: 60% dos 240 de altura, como o da carcaça das fotos
  farol_lampada_x: 0.25, // a lâmpada principal a 25% da largura (da meia altura) a partir do lado de dentro
  farol_posicao_x: 0.72, // a de posição, na segunda concavidade, entre 65% e 80%
  farol_posicao_y: 0.4, // e um pouco abaixo da meia altura, em fração da altura
  farol_posicao_profundidade: 45, // a segunda concavidade é menor e mais funda: 45 mm além do fundo largo
  farol_posicao_raio: 50,
  refletor_furo: 16, // o furo do soquete no fundo da capa, de raio
  refletor_facetas: 12, // as facetas largas: 6 de cada lado da lâmpada principal, cada uma uma faixa curva entre dois vincos
  refletor_faceta_relevo: 300, // quanto cada faceta afunda no meio entre dois vincos, em mm: o relevo que a luz rasante lê em metal claro
  luz_canto_fresta: 14, // a fresta entre o lado inclinado do farol e o de dentro da luz de canto
  luz_canto_entra_lado: 60, // quanto o vão entra na lateral além do fim do arco da quina
  luz_canto_base_razao: 0.62, // a base é curta: 62% do topo
  luz_canto_barriga: 22, // o lado de fora é curvo: no meio ele sai 22 mm além da corda
  luz_canto_raios: [55, 140, 60], // as concordâncias dos três cantos do lado de fora, de baixo para cima
  luz_canto_segmentos: 6, // segmentos de cada concordância do contorno da luz de canto (o padrão é 4): o aro lia como polígono nos cantos de raio 55 e 140
  luz_canto_profundidade: 38,
  luz_canto_lampada_y: 0.45,
  pisca_lateral_z: [1680, 1830], // atrás da roda dianteira, no paralama, rente à fresta da porta (z 1660) e sobre o arco (a boca dele acaba em y 925)
  pisca_lateral_y: [1011, 1069], // a pílula de 150 por 58 mm, cerca de 2,5 por 1
  pisca_lateral_afinamento: 5, // a ponta da frente é 10 mm mais baixa que a de trás
  pisca_lateral_raio: 24,
  pisca_lateral_profundidade: 22,
  refletor_inset_luz: 7, // a borda do refletor da luz de canto e do pisca, para dentro do vão
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
  grade_barra_largura: 838, // as barras vão de parede a parede do vão (meia largura menos 1), com as pontas dentro da perna da aba: ponta solta a 20 mm da parede deixava sombras em degrau na luz rasante
  grade_barra_altura: 28,
  grade_barra_saliencia: 14, // quanto a barra sai da lente para a frente (sempre atrás da superfície da chapa)
  lanterna_base_y: 760, // as lanternas de trás (2026-11-06, opção 1 do esboço): vãos pelo contorno, vistos pela diagonal da quina; de 760 (2026-11-07: eram 720, mas o piso do interior vai de 735,5 a 755,5 e o refletor de 100 mm não passa por ele) a 1240 mm, 480 de altura para cerca de 300 de largura pela chapa
  lanterna_topo_y: 1240,
  lanterna_x_dentro: 856, // a borda de dentro na face de trás, na mesma distância da quina de antes da largura nova (836 com a lateral em 1000)
  lanterna_entra_lado: 85, // quanto o vão entra na lateral além do fim do arco da quina
  lanterna_faixas: [0.35, 0.17, 0.21, 0.23], // as quatro faixas da lente de cima para baixo (freio, ré, pisca, neblina), em fração da altura no lado de dentro; a última leva o que sobrar (2026-11-07, fotos de estudo)
  lanterna_linha: 7, // a chapa fina entre duas faixas, em mm
  lanterna_topo_queda: 0.4, // o topo desce de dentro para fora esta fração da altura da faixa de cima
  lanterna_raio_base: 55, // os dois cantos de baixo da base, bem redondos
  lanterna_raio_topo: 20, // os dois cantos de cima
  lanterna_raio_linha: 8, // os cantos das faixas que dão na linha de chapa
  lanterna_refletor_inset: 5, // a borda de cada concha, para dentro do contorno da faixa
  lanterna_refletor_profundidade: 95, // do plano da lente ao fundo da concha, 100 mm contando o encosto
  lanterna_refletor_fundo_plano: 0.2, // até esta fração do raio a concha tem o fundo plano, onde a flange da lâmpada assenta
  lanterna_aneis: [1, 0.78, 0.56, 0.38, 0.27], // os anéis da malha polar de cada concha: menos que os 8 do farol, para a cena ficar mais leve (a escolha é de peso, e não de um teto de faces: o teto de 250 mil que se citava aqui era o adaptador da cena estourando a pilha, já corrigido)
  lanterna_refletor_passo: 40, // o comprimento máximo de um trecho reto da borda de cada concha
  lanterna_furo: 7, // o furo do soquete no fundo de cada concha, de raio
  lanterna_lampada_raio: 6,
  lanterna_lampada_comprimento: 30,
  lanterna_lampada_flange: 11,
  lanterna_recuo_lente: 3, // a lente da lanterna entra 3 mm no vão, como a do farol
  lanterna_aba_largura: 6, // a perna da aba da lanterna é mais curta que a dos outros vãos: o vão começa em 720, abaixo do topo do piso (735 a 755, a cerca de 10 mm da chapa), e uma perna de 10 mm ou mais encosta nele
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
  nervura_nitidez: 0.5, // os ombros do sulco: dobra branda, para a luz rasante ler um canal e não uma fenda
  nervura_nitidez_fundo: 0, // o fundo do sulco sem vinco: canal arredondado, e não um V

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
  moldura_ponta_degrau: 6, // a borda de fora da moldura acaba num corte reto de 6 mm de volta à chapa, em vez de afinar até zero em lasca
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
  piso_meia_largura: 1008,
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
  painel_meia_largura: 870,
  painel_chanfro: 25,

  // os detalhes pequenos (etapa 8, 2026-11-09), aprovados por esboço em banco-de-provas/furgao-realista-2026-10-30/detalhes.
  // Antena: o pé em gota de 120 por 60 mm e 35 de altura, a 60 mm da borda do vão do para-brisa (em arco sobre o teto), com a base entrando 1,7 mm na chapa;
  // a haste de 300 mm que afina de 8 para 4 mm de diâmetro, 10 graus para trás da vertical, nascendo 10 mm dentro do pé.
  antena_pe_comprimento: 120,
  antena_pe_largura: 60,
  antena_pe_altura: 35,
  antena_recuo_borda: 60,
  antena_embutir: 1.7,
  antena_lados: 16,
  antena_haste_comprimento: 300,
  antena_haste_raio_base: 4,
  antena_haste_raio_ponta: 2,
  antena_haste_inclinacao: 10,
  antena_haste_embutir: 10,
  antena_haste_lados: 12,
  antena_liso_angulo: 40,
  // Maçanetas: a altura do centro da alça, abaixo do vinco de cintura; a alça de 180 por 40 mm, com os pés de 18 mm a 70 mm do meio, a 15 mm da porta;
  // o rebaixo de 210 por 70 mm que a placa em anel (8 mm de largura, 5 de altura) faz de conta, a 70 mm da borda da porta que abre.
  macaneta_y: 1060, // a altura das maçanetas da porta de correr e das traseiras; a da porta da cabine é `macaneta_cabine_y`
  macaneta_cabine_y: 1293, // 2026-11-11: logo abaixo do canto de trás do vidro grande, 140 mm abaixo da base dele (alvo da janela)
  macaneta_cabine_borda_porta: 160, // e mais longe da borda de trás da porta que as outras (`macaneta_borda_porta`): a alça começa em z 802, sob o canto de trás do vidro
  macaneta_alca_comprimento: 180,
  macaneta_alca_altura: 40,
  macaneta_alca_fora: 15,
  macaneta_alca_espessura: 7,
  macaneta_pe_largura: 18,
  macaneta_pe_afastamento: 70,
  macaneta_chanfro: 4,
  macaneta_embutir: 1.5,
  macaneta_rebaixo_comprimento: 210,
  macaneta_rebaixo_largura: 70,
  macaneta_placa_borda: 8,
  macaneta_placa_altura: 5,
  macaneta_placa_cantos: 10,
  macaneta_borda_porta: 70,
  // Ponteira: o tubo reto de 55 mm de diâmetro e 3 de parede, a 180 mm do meio (lado esquerdo, +x), com o topo entrando 1 mm no fundo do para-choque traseiro e a boca 50 mm atrás da face dele.
  ponteira_diametro: 55,
  ponteira_parede: 3,
  ponteira_x: 180,
  ponteira_recuo_boca: 50,
  ponteira_embutir: 1,
  ponteira_folga_frente: 5, // a frente do tubo acaba atrás da linha da chapa da traseira, sem encostar nela
  ponteira_segmentos: 6,
  ponteira_liso_angulo: 30,
};

/* ---------- passos ---------- */

const CHAPA = { origem: { op: 'subdivisao', id: 1 } };
/** Os ids dos passos das luzes da frente, por lado k: o vão do farol (810 + k), o da luz de canto (812 + k) e o do pisca lateral (814 + k); as abas
 *  (940 + k, 950 + k e 952 + k) e o aro do farol (954 + k); os refletores (960 + i, na ordem de `REFLETORES`) e as lâmpadas (970 + 2i, o bulbo, e 971 + 2i, a tampinha). */
const ID_FAROL = (k) => 810 + k;
const ID_LUZ_CANTO = (k) => 812 + k;
const ID_PISCA_LATERAL = (k) => 814 + k;
const ID_ABA_FAROL = (k) => 940 + k;
const ID_ABA_LUZ_CANTO = (k) => 950 + k;
const ID_ABA_PISCA_LATERAL = (k) => 952 + k;
const ID_ARO_FAROL = (k) => 954 + k;
/** Os ids dos passos da janela da cabine, por vidro k (a ordem de `derivarJanelas`: os dois vidros grandes e os dois triângulos): o vão (1200 + k), a aba (1210 + k) e a borracha (1220 + k). */
const ID_JANELA = (k) => 1200 + k;
const ID_ABA_JANELA = (k) => 1210 + k;
const ID_BORRACHA_JANELA = (k) => 1220 + k;
/** Os ids dos passos da grade: o vão (804), a aba (944), a translação da lente (945) e as barras (130 + k). */
const ID_GRADE = 804;
/** Os ids dos passos das lanternas de trás, por lado k e faixa i (de cima para baixo): o vão (1100 + 4k + i) e a aba (1110 + 4k + i). */
const ID_LANTERNA = (k, i) => 1100 + 4 * k + i;
const ID_ABA_LANTERNA = (k, i) => 1110 + 4 * k + i;

/** A seção da borracha de vão, [u, v] em mm, u para o cristal e v para fora da chapa: assenta na chapa e no cristal (entra `borracha_fundo` nos dois), passa
 *  `borracha_fora` sobre a chapa e `borracha_dentro` sobre o cristal, sobe `borracha_altura` e desce com o beiral redondo nas duas bordas. */
export function perfilDaBorracha(T, fora = T.borracha_fora, dentro = T.borracha_dentro) {
  const F = fora; const D = dentro; const H = T.borracha_altura; const B = T.borracha_fundo;
  return [[-F, -B], [D, -B], [D, 0.5], [D - 2, 0.46 * H], [D - 5, 0.8 * H], [D - 8, H], [-6, H], [-F + 2.5, 0.55 * H], [-F, 0.4]];
}

/** Os PASSOS: a chapa subdividida com espessura, as abas dos vãos dos vidros,  as abas dos arcos, as quatro rodas da família e o forro dos arcos (que vem com o plástico). */
export function gerarPassos(T) {
  const { passo, plastico, rodas, vidros, cristais, luzes, lentes, abasDosArcos, refletores, lampadas, forma: f } = derivar(T);
  const passos = [
    ['subdivisao', { origemId: 1, ...passo, borda: 'cantos', niveis: T.niveis, espessura: m(T.espessura) }],
  ];
  /* o plástico de baixo: cada peça é a pele de uma seção varrida por fora da chapa, engrossada para dentro */
  plastico.forEach((pl, k) => {
    const sel = { origem: { op: 'subdivisao', id: 50 + k } };
    passos.push(['subdivisao', { origemId: 50 + k, vertices: pl.vertices, faces: pl.faces, vincos: pl.vincos, cantos: pl.cantos, borda: 'cantos', niveis: T.niveis, espessura: m(pl.espessura ?? T.plastico_espessura) }]);
    passos.push(['parte', { nome: pl.nome, sel }]);
    passos.push(['material', { sel, usa: pl.material ?? (FORROS.includes(pl.nome) ? 'forro' : 'plastico') }]);
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
    passos.push(['material', { sel, usa: nomeDoCristal(c.nome).includes('PortaTraseira') ? 'vidroEscuro' : 'vidro' }]);
  });
  vidros.forEach((v, k) => {
    const sel = { origem: { op: 'friso', id: 110 + k } };
    passos.push(['friso', { origemId: 110 + k, superficie: CHAPA.origem, linha: { nome: nomeDaBorracha(v.nome), pontos: [...v.volta, v.volta[0]] }, perfil: perfilBorracha }]);
    passos.push(['parte', { nome: nomeDaBorracha(v.nome), sel }]);
    passos.push(['material', { sel, usa: 'borracha' }]);
  });
  /* as luzes da gaiola (etapa 6): a aba dobrada de cada vão, como a dos vidros, e a lente rente à lataria, no material de cada uma */
  luzes.forEach((v, k) => {
    const sel = { origem: { op: 'friso', id: 900 + k } };
    passos.push(['friso', {
      origemId: 900 + k, superficie: CHAPA.origem, linha: { nome: v.linha, pontos: [...v.volta, v.volta[0]] },
      aba: { largura: m(T.aba_vao_largura), angulo: T.aba_vao_angulo, raio: m(T.aba_vao_raio) },
    }]);
    passos.push(['parte', { nome: v.nome, sel }]);
    passos.push(['material', { sel, usa: 'azul' }]);
  });
  /* a aba e a lente são a mesma parte, cada uma no seu material: o PLANO tinha teto de 64 partes, e desde 2026-11-07 tem 128 */
  lentes.forEach((c, k) => {
    const sel = { origem: { op: 'subdivisao', id: 920 + k } };
    passos.push(['subdivisao', { origemId: 920 + k, vertices: c.vertices, faces: c.faces, borda: 'cantos', niveis: T.niveis, espessura: m(T.luz_espessura) }]);
    passos.push(['parte', { nome: c.nome, sel }]);
    passos.push(['material', { sel, usa: c.material }]);
  });
  /* as luzes da frente (etapa 8): cada uma é um vão pelo contorno na chapa pronta, com a lente recuada e a aba dobrada para dentro, um depois do outro. O farol é visto
     pela frente, a luz de canto pela diagonal da quina e o pisca lateral pelo eixo x; cada chapa é a do vão anterior, e a carroceria é a do último. A lente e a aba são a
     mesma parte, cada uma no seu material; o aro do farol é o friso de perfil simétrico sobre a borda do vão, e atrás da lente vêm o refletor e a lâmpada. */
  const mm = (x) => m(x);
  let anterior = CHAPA;
  const abrir = (origemId, contorno, raios, vista, extra = {}) => {
    passos.push(['aberturaPorContorno', {
      origemId, chapa: anterior, contorno: contornoPorRetos(contorno, mm, raiosDoContorno(contorno, raios)), vista, sentido: '+', lente: true, recuoDaLente: m(T.farol_recuo_lente), limpezaFina: true, ...extra,
    }]);
    anterior = { origem: { op: 'aberturaPorContorno', id: origemId } };
  };
  const abaELente = (idVao, idAba, nome, nomeDaLinha, materialDaLente) => {
    const aba = { origem: { op: 'friso', id: idAba } };
    passos.push(['friso', {
      origemId: idAba, superficie: { op: 'aberturaPorContorno', id: idVao }, linha: { nome: nomeDaLinha },
      aba: { largura: m(T.aba_vao_largura), angulo: T.aba_vao_angulo, raio: m(T.aba_vao_raio) },
    }]);
    const lente = { origem: { op: 'aberturaPorContorno', id: idVao, parte: 'lente' } };
    passos.push(['parte', { nome, sel: aba }]);
    passos.push(['material', { sel: aba, usa: 'aroCinza' }]);
    passos.push(['parte', { nome, sel: lente }]);
    passos.push(['material', { sel: lente, usa: materialDaLente }]);
  };
  /* a janela da cabine (2026-11-11): o vidro grande e o triângulo, de cada lado, é o primeiro vão da cadeia; cada um tem a aba e a borracha dos outros vãos de vidro (a borracha da janela
     é a de `janela_borracha_fora` e `janela_borracha_dentro`, de 20 mm de moldura), no mesmo material, e o vidro é a lente recuada `vidro_folga_borda` da borda, sob a borracha. A peça
     preta da frente do triângulo não é vão: é uma das peças de plástico, sobre a chapa, porque a fresta da porta passa por baixo dela e um vão não pode cruzar a fresta */
  const janelas = derivarJanelas(T, f);
  const perfilBorrachaJanela = perfilDaBorracha(T, T.janela_borracha_fora, T.janela_borracha_dentro).map(([u, v]) => [m(u), m(v)]);
  janelas.forEach((j, k) => abrir(ID_JANELA(k), j.contorno, j.raios, j.vista, { recuoDaLente: m(T.vidro_folga_borda), segmentosArco: T.janela_segmentos_arco }));
  janelas.forEach((j, k) => {
    const aba = { origem: { op: 'friso', id: ID_ABA_JANELA(k) } };
    passos.push(['friso', {
      origemId: ID_ABA_JANELA(k), superficie: { op: 'aberturaPorContorno', id: ID_JANELA(k) }, linha: { nome: j.aba },
      aba: { largura: m(T.aba_vao_largura), angulo: T.aba_vao_angulo, raio: m(T.aba_vao_raio) },
    }]);
    passos.push(['parte', { nome: j.aba, sel: aba }]);
    passos.push(['material', { sel: aba, usa: 'borracha' }]); /* a aba da janela é preta: vista através do vidro, ou por uma fresta, não aparece como tira azul dentro da moldura */
    const vidro = { origem: { op: 'aberturaPorContorno', id: ID_JANELA(k), parte: 'lente' } };
    passos.push(['parte', { nome: j.cristal, sel: vidro }]);
    passos.push(['material', { sel: vidro, usa: 'vidro' }]);
    const borracha = { origem: { op: 'friso', id: ID_BORRACHA_JANELA(k) } };
    passos.push(['friso', { origemId: ID_BORRACHA_JANELA(k), superficie: { op: 'aberturaPorContorno', id: ID_JANELA(k) }, linha: { nome: j.borracha }, perfil: perfilBorrachaJanela }]);
    passos.push(['parte', { nome: j.borracha, sel: borracha }]);
    passos.push(['material', { sel: borracha, usa: 'borracha' }]);
  });
  const farois = derivarFarois(T);
  const luzesDeCanto = derivarLuzesDeCanto(T, f);
  const piscasLaterais = derivarPiscasLaterais(T);
  const perfilDoAro = [[-1, -T.farol_aro_fundo], [1, -T.farol_aro_fundo], [1, 0.15 * T.farol_aro_altura], [0.67, T.farol_aro_altura], [-0.67, T.farol_aro_altura], [-1, 0.15 * T.farol_aro_altura]]
    .map(([u, v]) => [m(u * T.farol_aro_meia_largura), m(v)]);
  farois.forEach((fa, k) => abrir(ID_FAROL(k), fa.farol, fa.raios, 'z'));
  luzesDeCanto.forEach((lc, k) => abrir(ID_LUZ_CANTO(k), lc.contorno, lc.raios, lc.vista, { segmentosArco: T.luz_canto_segmentos }));
  piscasLaterais.forEach((pl, k) => abrir(ID_PISCA_LATERAL(k), pl.contorno, pl.raios, pl.vista));
  farois.forEach((fa, k) => {
    abaELente(ID_FAROL(k), ID_ABA_FAROL(k), `farol${fa.lado}`, `abaVaoFarol${fa.lado}`, 'lenteIncolor');
    const aro = { origem: { op: 'friso', id: ID_ARO_FAROL(k) } };
    passos.push(['friso', { origemId: ID_ARO_FAROL(k), superficie: { op: 'aberturaPorContorno', id: ID_FAROL(k) }, linha: { nome: `aroFarol${fa.lado}` }, perfil: perfilDoAro }]);
    passos.push(['parte', { nome: `aroFarol${fa.lado}`, sel: aro }]);
    passos.push(['material', { sel: aro, usa: 'aroCinza' }]);
  });
  luzesDeCanto.forEach((lc, k) => abaELente(ID_LUZ_CANTO(k), ID_ABA_LUZ_CANTO(k), `luzDeCanto${lc.lado}`, `abaVaoLuzDeCanto${lc.lado}`, 'lenteIncolor'));
  piscasLaterais.forEach((pl, k) => abaELente(ID_PISCA_LATERAL(k), ID_ABA_PISCA_LATERAL(k), `piscaLateral${pl.lado}`, `abaVaoPiscaLateral${pl.lado}`, 'lenteAmbar'));
  /* por dentro: o refletor de cada luz, uma capa engrossada para dentro, e a lâmpada, uma revolução com o soquete atrás (a do farol com a tampinha na ponta) */
  refletores.forEach((r, i) => {
    const sel = { origem: { op: 'subdivisao', id: 960 + i } };
    passos.push(['subdivisao', {
      origemId: 960 + i, vertices: r.capa.vertices, faces: r.capa.faces, ...(r.capa.vincos.length ? { vincos: r.capa.vincos } : {}), borda: 'cantos', niveis: T.niveis, espessura: m(r.espessura),
    }]);
    passos.push(['parte', { nome: r.nome, sel }]);
    passos.push(['material', { sel, usa: 'refletor' }]);
  });
  lampadas.forEach((l, i) => {
    const em = l.base.map(mm);
    const girar = (sel) => { if (l.graus) passos.push(['rotaciona', { eixo: 'y', graus: l.graus, pivo: em, sel }]); };
    const bulbo = { origem: { op: 'lathe', id: 970 + 2 * i } };
    passos.push(['lathe', { origemId: 970 + 2 * i, eixo: l.eixo, lados: 24, perfil: l.bulbo.map(([r, a]) => [mm(r), mm(a)]), em }]);
    girar(bulbo);
    passos.push(['parte', { nome: l.nome, sel: bulbo }]);
    passos.push(['material', { sel: bulbo, usa: 'lampada' }]);
    if (l.nome === 'lampadaFarolEsquerdo' || l.nome === 'lampadaFarolDireito') {
      const tampa = { origem: { op: 'lathe', id: 971 + 2 * i } };
      passos.push(['lathe', { origemId: 971 + 2 * i, eixo: l.eixo, lados: 24, perfil: l.tampinha.map(([r, a]) => [mm(r), mm(a)]), em }]);
      girar(tampa);
      passos.push(['parte', { nome: l.nome, sel: tampa }]);
      passos.push(['material', { sel: tampa, usa: 'tampinha' }]);
    }
  });
  /* a grade (2026-11-05): um terceiro vão pelo contorno, sobre a chapa do último farol; a lente escura recua `grade_recuo` para dentro do
     vão, dentro da perna da aba, e as três barras são extrusões retas que nascem na lente e ficam atrás da superfície da chapa; a aba, a
     lente e as barras são a mesma parte 'grade'. A base do vão é o topo do para-choque, que sobe do lado de fora e cobre a parede de baixo */
  const grade = derivarGrade(T);
  const chapaDaGrade = anterior;
  passos.push(['aberturaPorContorno', {
    origemId: ID_GRADE, chapa: chapaDaGrade, contorno: contornoPorRetos(grade.contorno, mm, grade.raio), vista: 'z', sentido: '+', lente: true, recuoDaLente: m(T.grade_lente_recuo), limpezaFina: true,
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
  /* as lanternas de trás (2026-11-07): cada faixa da lente é um vão próprio, visto pela diagonal da quina, com lente recuada e aba; a chapa de `lanterna_linha` mm entre
     os vãos é a linha que separa as faixas. Aba e lente são a mesma parte de cada faixa, e cada faixa tem a sua cor. */
  const lanternas = derivarLanternas(T, f);
  let chapaAnterior = { origem: { op: 'aberturaPorContorno', id: ID_GRADE } };
  for (const [k, la] of lanternas.entries()) {
    for (const [i, fx] of la.faixas.entries()) {
      const nome = `lanterna${fx.base}${la.lado}`;
      passos.push(['aberturaPorContorno', {
        origemId: ID_LANTERNA(k, i), chapa: chapaAnterior, contorno: contornoPorRetos(fx.contorno, mm, raiosDoContorno(fx.contorno, fx.raios)), vista: la.vista, sentido: '+', lente: true,
        recuoDaLente: m(T.lanterna_recuo_lente), limpezaFina: true,
      }]);
      chapaAnterior = { origem: { op: 'aberturaPorContorno', id: ID_LANTERNA(k, i) } };
      const aba = { origem: { op: 'friso', id: ID_ABA_LANTERNA(k, i) } };
      passos.push(['friso', {
        origemId: ID_ABA_LANTERNA(k, i), superficie: chapaAnterior.origem, linha: { nome: `abaVao${nome[0].toUpperCase()}${nome.slice(1)}` },
        aba: { largura: m(T.lanterna_aba_largura), angulo: T.aba_vao_angulo, raio: m(T.aba_vao_raio) },
      }]);
      const lente = { origem: { op: 'aberturaPorContorno', id: ID_LANTERNA(k, i), parte: 'lente' } };
      passos.push(['parte', { nome, sel: aba }]);
      passos.push(['material', { sel: aba, usa: `aba${fx.material[0].toUpperCase()}${fx.material.slice(1)}` }]);
      passos.push(['parte', { nome, sel: lente }]);
      passos.push(['material', { sel: lente, usa: fx.material }]);
    }
  }
  const carroceria = { origem: chapaAnterior.origem };
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
      if (operacao === 'parte') { nomeadas.push(argumentos); passos.push([operacao, { ...argumentos, nome: `${argumentos.nome}${r.sufixo}` }]); continue; }
      passos.push([operacao, argumentos]);
    }
    /* o pneu leva a banda e o flanco, cada um no seu material, e a roda de aço o aço pintado (o `aco` da família); isto vem antes de girar e transladar, com os ids da família */
    passos.push(...materiaisDoPneu(nomeadas.find(({ nome }) => nome === 'pneu').sel, base, T));
    for (const { nome, sel } of nomeadas) {
      if (r.s < 0) passos.push(['rotaciona', { eixo: 'y', graus: 180, pivo: [0, 0, 0], sel }]);
      passos.push(['transladar', { d: r.centro.map(m), sel }]);
      passos.push(['liso', { angulo: nome === 'pneu' ? T.pneu_liso_angulo : 30, sel }]);
    }
  });
  /* os detalhes pequenos (2026-11-09): a antena, as maçanetas e a ponteira, depois de tudo, com ids a partir de 2000: nenhuma parte anterior muda */
  passos.push(...passosDosDetalhes(T, f));
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
  ...BASES_DO_RETROVISOR.map((b) => ({ par: ['carroceria', b], motivo: 'a base do retrovisor é uma placa de plástico preto sobre a lateral, 3 mm para fora, que entra 1 mm na chapa e cobre a fresta da porta onde ela passa por baixo' })),
  ...BASES_DO_RETROVISOR.map((b, k) => ({ par: [b, BORRACHAS[1 + k]], motivo: 'a base cobre 6 mm da borracha da janela, na vertical de trás dela, e o preto continua da moldura para a base sem chapa no meio' })),
  ...COLUNAS_DA_JANELA.flatMap((c, k) => [
    { par: [c, BORRACHAS[1 + k]], motivo: 'a barra da coluninha acaba dentro da borracha da moldura, na mesma altura dela' },
    { par: [c, CRISTAIS[1 + k]], motivo: 'a barra passa sobre o cristal de cima a baixo e entra nele, e os dois vidros encostam nela' },
    { par: [c, ABAS_DOS_VAOS[1 + k]], motivo: 'a barra acaba sobre a aba do vão, nas duas pontas' },
    { par: ['carroceria', c], motivo: 'as pontas da barra entram na chapa, sob a borracha' },
  ]),
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
  ...[...LUZES, ...FAROIS, ...LUZES_DE_CANTO, ...PISCAS_LATERAIS, 'grade'].map((a) => ({ par: ['carroceria', a], motivo: 'a aba da luz nasce na parede da borda do vão e continua a chapa dobrada para dentro; as malhas se cruzam por décimos de milímetro na costura' })),
  ...AROS.map((aro, k) => ({ par: ['carroceria', aro], motivo: 'o aro do farol é um friso que entra 1,9 mm na chapa em volta do vão, 6 mm de cada lado da borda' })),
  ...AROS.map((aro, k) => ({ par: [aro, FAROIS[k]], motivo: 'o aro cobre 6 mm da borda da lente e a aba do farol, que a lente recuada leva na mesma parte, passa pelo meio dele' })),
  ...AROS.map((aro, k) => ({ par: [aro, REFLETORES[k]], motivo: 'a borda do refletor assenta por trás do aro, 8 mm para dentro da borda do vão, e o aro, que desce até a face da lente, chega a ela' })),
  ...LUZES_POR_DENTRO.flatMap(([luz, refletor, lampadas]) => [
    { par: [luz, refletor], motivo: 'a borda do refletor assenta 4,8 mm atrás da superfície da chapa, 0,2 mm dentro da face de trás da lente, que é a luz' },
    ...lampadas.map((lampada) => ({ par: [refletor, lampada], motivo: 'a flange da lâmpada assenta atrás do furo do soquete da capa e o bulbo passa por ele; a de posição assenta no fundo da segunda concavidade' })),
  ]),
  ...LANTERNAS_POR_DENTRO.flatMap(([lentes, refletor, lampadas]) => [
    ...lentes.map((lente) => ({ par: [lente, refletor], motivo: 'a borda de cada concha assenta 4,8 mm atrás da superfície da chapa, 0,2 mm dentro da face de trás da lente da faixa dela; a parede entre duas conchas fica atrás da linha de chapa entre as lentes' })),
    ...lampadas.map((lampada) => ({ par: [refletor, lampada], motivo: 'a flange da lâmpada assenta atrás do furo do soquete da concha da faixa dela e o bulbo passa por ele' })),
  ]),
  { par: ['pisoInterior', 'divisoria'], motivo: 'a divisória assenta no piso e entra 1 mm nele' },
  ...BANCOS.map((b) => ({ par: ['pisoInterior', b], motivo: 'o banco assenta no piso e entra 1 mm nele' })),
  { par: ['pisoInterior', 'painel'], motivo: 'o painel assenta no piso e entra 1 mm nele' },
  ...FORROS.map((forro) => ({ par: ['pisoInterior', forro], motivo: 'o piso assenta no topo do túnel do forro do arco e entra 1 mm nele (a altura do piso é `piso_y` e a do túnel sai de `forro_folga_tunel`, na TABELA); são o único apoio dele, afastado da chapa dos dois lados' })),
  ...FORROS.map((forro) => ({ par: ['carroceria', forro], motivo: 'a aba do forro assenta na face de dentro da chapa em volta do arco, passando 8 mm da boca, e entra 1 mm na parede' })),
  /* os detalhes pequenos (2026-11-09): cada um assenta na peça que o carrega, entrando uma fração de milímetro nela */
  { par: ['carroceria', ANTENA[0]], motivo: 'o pé da antena assenta no teto da frente, 60 mm atrás da borda do vão do para-brisa, com a base inclinada como o teto e entrando 1,7 mm na chapa de 2 mm, sem passar por ela' },
  { par: [ANTENA[0], ANTENA[1]], motivo: 'a haste nasce 10 mm dentro do pé, na seção mais alta dele, e sai dele inclinada 10 graus para trás da vertical' },
  ...MACANETAS.map((alca) => ({ par: ['carroceria', alca], motivo: 'os dois pés da alça assentam na chapa da porta, dentro da placa em anel, e entram 1,5 mm nela' })),
  ...PLACAS_DAS_MACANETAS.map((placa) => ({ par: ['carroceria', placa], motivo: 'a placa rasa em anel, que faz de conta o rebaixo, assenta na chapa da porta em volta da alça e entra 1,5 mm nela' })),
  { par: ['parachoqueTraseiro', PONTEIRA], motivo: 'o topo do tubo da ponteira encosta no fundo do para-choque traseiro, onde ele sai da chapa, e entra 1 mm nele; a frente do tubo acaba 5 mm atrás da linha da chapa da traseira e a boca fica 50 mm atrás da face do para-choque' },
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
  derivarJanelas(T, forma(T)).forEach((j, k) => vaos.push({ nome: j.cristal, superficie: { op: 'aberturaPorContorno', id: ID_JANELA(k) }, frisos: [j.aba, j.borracha] }));
  derivarLanternas(T, forma(T)).forEach((la, k) => la.faixas.forEach((fx, i) => vaos.push({ nome: `lanterna${fx.base}${la.lado}`, superficie: { op: 'aberturaPorContorno', id: ID_LANTERNA(k, i) }, frisos: [`abaVaoLanterna${fx.base}${la.lado}`] })));
  derivarFarois(T).forEach((fa, k) => vaos.push({ nome: `farol${fa.lado}`, superficie: { op: 'aberturaPorContorno', id: ID_FAROL(k) }, frisos: [`abaVaoFarol${fa.lado}`, `aroFarol${fa.lado}`] }));
  derivarLuzesDeCanto(T, forma(T)).forEach((lc, k) => vaos.push({ nome: `luzDeCanto${lc.lado}`, superficie: { op: 'aberturaPorContorno', id: ID_LUZ_CANTO(k) }, frisos: [`abaVaoLuzDeCanto${lc.lado}`] }));
  derivarPiscasLaterais(T).forEach((pl, k) => vaos.push({ nome: `piscaLateral${pl.lado}`, superficie: { op: 'aberturaPorContorno', id: ID_PISCA_LATERAL(k) }, frisos: [`abaVaoPiscaLateral${pl.lado}`] }));
  const { refletores } = derivarLuzesPorDentro(T, forma(T));
  for (const [, refletor] of LUZES_POR_DENTRO) {
    const capa = refletores.find((r) => r.nome === refletor).capa;
    vaos.push({ nome: `furo${refletor.replace(/^refletor/, 'DoRefletor')}`, borda: [...capa.furo, capa.furo[0]], semMoldura: { motivo: 'é o furo do soquete no fundo do refletor, por onde passa o bulbo da lâmpada: a flange dela o fecha por trás, e a borda dele não leva moldura' } });
  }
  for (const [lentes, refletor] of LANTERNAS_POR_DENTRO) {
    const capa = refletores.find((r) => r.nome === refletor).capa;
    capa.furos.forEach((furo, i) => vaos.push({ nome: `furoDoRefletorLanterna${lentes[i].replace(/^lanterna/, '')}`, borda: [...furo, furo[0]], semMoldura: { motivo: 'é o furo do soquete no fundo da concha do refletor, por onde passa o bulbo da lâmpada: a flange dela o fecha por trás, e a borda dele não leva moldura' } }));
  }
  vaos.push({ nome: 'grade', superficie: { op: 'aberturaPorContorno', id: ID_GRADE }, frisos: ['abaVaoGrade'], parcial: { motivo: 'os dois cantos de baixo do vão são vivos e ficam 24 mm abaixo do topo do para-choque, por trás da pele dele: a aba não dobra nesses 44 mm de cada lado, que nenhuma vista de frente alcança, e a lente e a aba de cima e dos lados cobrem o resto da volta' } });
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
  const detalhes = derivarDetalhes(T, f);
  const { antena, ponteira } = detalhes;
  const cabine = detalhes.macanetas[0];
  const janela = { ...derivarJanelas(T, f).moldura, peca: pontasDaBase(T, f), coluna: cantosDaColuna(T, f) };
  const rad = antena.haste.inclinacao * grau;
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
    { nome: `ponta da haste da antena, em cima e à frente: ${T.antena_haste_comprimento} mm de haste acima do pé e a ponta de ${2 * T.antena_haste_raio_ponta} mm, inclinada ${T.antena_haste_inclinacao} graus para trás`, parte: 'antenaHaste', medida: 'maximo', em: [antena.haste.raioBase, antena.base[0] + antena.comprimento * Math.cos(rad) + antena.haste.raioPonta * Math.sin(rad), antena.base[1] + antena.haste.raioBase * Math.cos(rad)], toleranciaMm: tol },
    { nome: 'alça da maçaneta da porta da cabine esquerda, por fora, em cima e na frente: 15 mm além da chapa, 20 mm acima do centro e 90 mm à frente do centro da alça', parte: 'macanetaCabineEsquerda', medida: 'maximo', em: [cabine.xs + cabine.alcaFora, cabine.yc + cabine.alturaDaAlca / 2, cabine.c + T.macaneta_alca_comprimento / 2], toleranciaMm: tol },
    /* a janela da cabine (2026-11-11): as extremidades da borracha de cada vão, que é a moldura de 20 mm do desenho, e as da peça preta; as cotas do desenho valem ±30 mm, e aqui a tolerância é a do arredondamento dos cantos */
    { nome: 'borracha do vidro grande, atrás e embaixo: a borda de trás da moldura em z 747, o pé dela na coluninha em y 1338', parte: 'borrachaPortaCabineEsquerda', medida: 'minimo', em: [f.xs(janela.contorno[4][1]) - 2, janela.contorno[2][1], janela.contorno[4][0]], toleranciaMm: 8 },
    { nome: 'borracha do vidro grande, em cima e à frente: o alto da moldura em y 1966 e a frente dela na vertical de z 1486 mais 20 mm', parte: 'borrachaPortaCabineEsquerda', medida: 'maximo', em: [f.xs(janela.contorno[2][1]) + 3, janela.contorno[4][1], T.janela_retrovisor_tras_z + T.janela_borracha_dentro + T.janela_borracha_fora], toleranciaMm: 8 },
    { nome: 'barra da coluninha, atrás e embaixo: o pé dela, a 4 mm do pé do vidro grande, e a borda de trás do alto (z 1217)', parte: 'colunaJanelaEsquerda', medida: 'minimo', em: [f.xs(janela.coluna[3][1]) + T.borracha_altura - T.janela_coluna_espessura, janela.coluna[0][1], janela.coluna[3][0]], toleranciaMm: 1 },
    { nome: 'barra da coluninha, em cima e na frente: o alto dela e a borda da frente do pé (z 1293)', parte: 'colunaJanelaEsquerda', medida: 'maximo', em: [f.xs(janela.coluna[0][1]) + T.borracha_altura, janela.coluna[2][1], janela.coluna[1][0]], toleranciaMm: 1 },
    { nome: 'peça preta da base do retrovisor, atrás e embaixo: a vertical de trás (z 1500) na base em y 1313, 3 mm para fora da lateral e 4 mm de espessura', parte: 'baseRetrovisorEsquerda', medida: 'minimo', em: [f.xs(janela.peca[2][1]) + T.janela_retrovisor_saida - T.janela_retrovisor_espessura, T.janela_retrovisor_base_y, janela.peca[1][0]], toleranciaMm: 1 },
    { nome: 'peça preta da base do retrovisor, em cima e na frente: a ponta em z 1767 na base, e o alto da vertical de trás em y 1590', parte: 'baseRetrovisorEsquerda', medida: 'maximo', em: [f.xs(T.janela_retrovisor_base_y) + T.janela_retrovisor_saida, janela.peca[2][1], T.janela_retrovisor_ponta_z], toleranciaMm: 1 },
    { nome: 'boca da ponteira, embaixo, por dentro e atrás: o tubo de 55 mm a 180 mm do meio, com o topo no fundo do para-choque e a boca 50 mm atrás da face dele', parte: 'ponteiraEscapamento', medida: 'minimo', em: [ponteira.x - ponteira.raio, ponteira.y - ponteira.raio, ponteira.zBoca], toleranciaMm: tol },
  ];
}

/* Os materiais (plano de materiais realistas, 2026-11-08), com os valores que a pessoa aprovou na peça de prova `tools/fixtures/acervo/materiais-de-prova`. A lataria
   é tinta sólida com verniz no azul de sempre; os vidros claros da frente têm leve tom verde e passam a luz (transmissão); os das portas traseiras são escurecidos; a
   roda é aço pintado de prata acetinado; o pneu tem a banda com o desenho de costelas e o flanco com as marcações, os dois em borracha preta fosca, no eixo x da roda;
   as lentes levam prismas nas cores de antes; o refletor é espelhado; a saia, os para-choques e as molduras dos arcos são plástico preto acetinado e granulado. */
const LENTE_DE_PRISMAS = { tipo: 'prismas', escala: 6, intensidade: 0.5 };
/* a aba de uma faixa da lanterna na cor da própria lente, opaca e sem relevo (a lente é translúcida, e a aba é a moldura em volta dela) */
const abaDaLente = (lente) => ({ tipo: 'liso', cor: lente.cor, aspereza: lente.aspereza, metalicidade: 0 });
const LENTES = {
  // as lentes das luzes (etapa 6), opacas para o oco do furgão não aparecer por elas
  // as lentes da frente (etapa 8): a do farol e a da luz de canto transparentes e incolores, a do pisca lateral âmbar translúcida, como os vidros
  lenteIncolor: { tipo: 'liso', cor: '#eef4f6', mistura: 'transparente', opacidade: 0.2, aspereza: 0.05, metalicidade: 0.1, relevo: LENTE_DE_PRISMAS },
  lenteAmbar: { tipo: 'liso', cor: '#e08a14', mistura: 'transparente', opacidade: 0.6, aspereza: 0.1, metalicidade: 0.1, relevo: LENTE_DE_PRISMAS },
  lanterna: { tipo: 'liso', cor: '#9a1f1f', aspereza: 0.2, relevo: LENTE_DE_PRISMAS },
  // as faixas da lente da lanterna de trás (etapa 8): lisas e translúcidas, vermelha, incolor e âmbar
  // a faixa de ré da lanterna: incolor e leitosa, de plástico fosco, para a lente não sumir sem o aro cinza do farol e o refletor aparecer esmaecido por trás
  lenteLeitosa: { tipo: 'liso', cor: '#e9eceb', mistura: 'transparente', opacidade: 0.7, aspereza: 0.65, metalicidade: 0, relevo: LENTE_DE_PRISMAS },
  lenteVermelha: { tipo: 'liso', cor: '#c4161c', mistura: 'transparente', opacidade: 0.6, aspereza: 0.1, metalicidade: 0.1, relevo: LENTE_DE_PRISMAS },
};
export const MATERIAIS_DO_FURGAO = {
  // tinta sólida com verniz: base de aspereza média e verniz por cima; verniz 0,8 e asperezaDoVerniz 0,12 foram a escolha da pessoa em 2026-11-09, a versão B entre três versões
  azul: { tipo: 'liso', cor: '#3350b0', aspereza: 0.5, metalicidade: 0.05, verniz: 0.8, asperezaDoVerniz: 0.12 },
  // a borracha de vão em volta dos cristais; o pneu tem os seus (`pneuBanda` e `pneuFlanco`)
  borracha: { tipo: 'liso', cor: '#26262b' },
  // aço pintado de prata acetinado: metal sob tinta, com um verniz fosco por cima; é o `aco` que a família roda-pneu dá ao aro, ao cubo e ao disco
  aco: { tipo: 'metal', acabamento: 'pintado', cor: '#6f737b', aspereza: 0.32, metalicidade: 0.85, verniz: 0.5, asperezaDoVerniz: 0.35 },
  // a tampinha da lâmpada do farol: o aço escovado de antes
  tampinha: { tipo: 'metal', cor: '#a9adb3', acabamento: 'escovado' },
  // plástico preto acetinado, entre o fosco e o brilhante, com granulado fino: a saia, os para-choques e as molduras dos arcos
  plastico: { tipo: 'liso', cor: '#141416', aspereza: 0.5, metalicidade: 0, verniz: 0.6, asperezaDoVerniz: 0.35, relevo: { tipo: 'granulado', escala: 0.4, intensidade: 0.35 } },
  forro: { tipo: 'liso', cor: '#1b1c1f' },
  // o para-brisa e os vidros da cabine: claros, com leve tom verde, por transmissão
  vidro: { tipo: 'liso', cor: '#e4f0ee', mistura: 'transparente', opacidade: 0.25, aspereza: 0.03, metalicidade: 0, transmissao: 1, indiceDeRefracao: 1.5, tomDoVidro: '#a8cdbd' },
  // os vidros das portas de trás: escuros como insulfilm: opacos, com verniz para o reflexo (com transmissão, mesmo baixa, o fundo claro da bancada aparecia através deles)
  vidroEscuro: { tipo: 'liso', cor: '#010203', aspereza: 0.5, metalicidade: 0, verniz: 0.25, asperezaDoVerniz: 0.08, indiceDeRefracao: 1.5 },
  // o pneu, borracha preta fosca: a banda com o desenho de costelas e o flanco com as marcações em relevo (sem nome de fabricante), a medida principal com 18 mm de altura; o eixo da roda é x
  pneuBanda: { tipo: 'liso', cor: '#1f1f23', aspereza: 0.92, metalicidade: 0, relevo: { tipo: 'bandaDeRodagem', escala: 15, intensidade: 0.8, desenho: 'costelas', eixo: 'x' } },
  pneuFlanco: { tipo: 'liso', cor: '#1f1f23', aspereza: 0.9, metalicidade: 0, relevo: { tipo: 'flanco', escala: 18, intensidade: 1, eixo: 'x' } },
  piso: { tipo: 'liso', cor: '#2c2d31' },
  divisoria: { tipo: 'liso', cor: '#5a5d66' },
  banco: { tipo: 'liso', cor: '#3d4048' },
  painelEscuro: { tipo: 'liso', cor: '#26272b' },
  ...LENTES,
  abaLenteVermelha: abaDaLente(LENTES.lenteVermelha),
  abaLenteLeitosa: abaDaLente(LENTES.lenteLeitosa),
  abaLenteAmbar: abaDaLente(LENTES.lenteAmbar),
  aroCinza: { tipo: 'liso', cor: '#4a4c52', aspereza: 0.6 },
  // o refletor, metal espelhado: quase sem aspereza e todo metal
  refletor: { tipo: 'metal', acabamento: 'pintado', cor: '#e8eaed', aspereza: 0.02, metalicidade: 1 },
  lampada: { tipo: 'liso', cor: '#f6f1da', aspereza: 0.35 },
  grade: { tipo: 'liso', cor: '#1d1e21', aspereza: 0.7 },
  // os detalhes pequenos (2026-11-09): o plástico preto da saia sem o granulado, que numa haste de 4 mm e numa alça de 40 mm só faria ruído; e o aço do escapamento, o `aco` mais escuro
  plasticoLiso: { tipo: 'liso', cor: '#141416', aspereza: 0.5, metalicidade: 0, verniz: 0.6, asperezaDoVerniz: 0.35 },
  acoEscuro: { tipo: 'metal', acabamento: 'pintado', cor: '#34363b', aspereza: 0.35, metalicidade: 0.85, verniz: 0.5, asperezaDoVerniz: 0.35 },
};

const receita = {
  meta: { nome: 'furgao-realista', desc: 'furgão médio de teto alto com cabine de bico curto, etapa 5: os cristais rentes à lataria no para-brisa, nas portas da cabine (claros, de leve tom verde) e nas portas traseiras (escurecidos), a borracha de vão em volta de cada um, o piso, os bancos da cabine, o painel e a divisória; a lataria em chapa contínua com as frestas das portas, o vinco de cintura, as nervuras do teto, as abas dos arcos, o para-brisa envolvente e os vãos dos vidros abertos, a saia e os para-choques em plástico escuro e o alargamento dos arcos (em plástico preto acetinado, junto com a saia e os para-choques), por fora da chapa, o forro escuro dos arcos por dentro e as quatro rodas da família roda-pneu (pneu 235/65 aro 16)' },
  PARAMS: TABELA,
  MATERIAIS: MATERIAIS_DO_FURGAO,
  /* `origem` diz o referencial; os pontos da gaiola, derivados da TABELA atual, entram aqui pelo nome. */
  get TOPO() {
    return {
      origem: 'chão, no meio do furgão em x e em z; y para cima e a frente do furgão em +z',
      ...derivar(this.PARAMS).pontos,
    };
  },
  PLANO: {
    objeto: 'furgão médio de teto alto: chapa de 5400 por 2040 por 2500 com frestas, saia, para-choques, forro e rodas, cristais, interior simples, luzes da frente e lanterna de quatro faixas atrás, cada luz com lente, refletor e lâmpada',
    referencias: ['referencias/quatro-vistas.prancha.png', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total da carroceria, do nariz em z 2700 à traseira em z -2700', milimetros: 5400 },
    familia: 'veiculo',
    partes: [
      {
        nome: 'carroceria',
        forma: 'chapa de 2040 de largura: lateral vertical até 1190, fechando 3,9 graus até o teto de ±650; capô 1100 a 1480, para-brisa até 2110, teto de raios 1290 e 405; portas traseiras de lados verticais em x 856, topo 2280',
        tecnica: 'subdivisao de gaiola de anéis, ombro e cobertura com colunas nas portas e arco de 580; porta dividida meia fresta por lado, borda dobrada 4 mm; frente em dois arcos tangentes com coroa em y; cantos dos vãos em diagonal de duas células',
      },
      ...ABAS_DOS_VAOS.map((nome) => ({
        nome,
        forma: `aba da borda do vão ${nome.replace('abaVao', '')}, dobrada para dentro a 90 graus com raio de 3 mm e perna de 20 mm, em volta do vão inteiro, cantos arredondados incluídos`,
        tecnica: nome.includes('PortaCabine') ? 'friso com aba sobre a borda do vão aberto pelo contorno (superficie aberturaPorContorno)' : 'friso com aba sobre a borda do vão, pelos nomes da gaiola',
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
        forma: `moldura do arco ${nome.includes('Dianteiro') ? 'dianteiro' : 'traseiro'} ${nome.endsWith('Esquerdo') ? 'esquerdo' : 'direito'}, em plástico preto acetinado e granulado: alargamento de 150 mm que sai 30, cheio até 30 da boca e descendo tangente à chapa; dobra de 10 mm para dentro; pontas horizontais em 463, 580 e 724`,
        tecnica: 'subdivisao da pele da seção varrida em torno do eixo da roda, com as pontas em altura fixa, engrossada para dentro 2 mm, material do plástico preto acetinado',
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
        forma: JANELAS_DA_CABINE.includes(nome)
          ? `vidro único da janela do lado ${nome.endsWith('Esquerda') ? 'esquerdo' : 'direito'}: o grande atrás (quase tão largo quanto alto, borda de trás inclinada, pé redondo, base própria) e o triângulo na frente (a 150 mm do para-brisa), encostados na barra`
          : `cristal ${nome.includes('PortaTraseira') ? 'escurecido' : 'claro, de leve tom verde,'} do vão ${nome === 'vidroParaBrisa' ? 'do para-brisa' : `da porta traseira ${nome.endsWith('Esquerda') ? 'esquerda' : 'direita'}`}: a mesma superfície do vão, rente à lataria, com a volta recuada 7,5 mm da borda e 4 mm de espessura para dentro`,
        tecnica: JANELAS_DA_CABINE.includes(nome)
          ? 'aberturaPorContorno na vista pelo eixo x num vão só, com lente recuada 7,5 mm: o vidro é a lente, no material do vidro claro com tom verde'
          : 'subdivisao das faces que o vão tirou da chapa, com a volta recuada pela superfície, vidro por transmissão (claro com tom verde no para-brisa, escurecido nas portas traseiras)',
      })),
      ...BORRACHAS.map((nome, k) => ({
        nome,
        forma: JANELAS_DA_CABINE.includes(CRISTAIS[k]) ? `borracha escura contínua em volta do ${CRISTAIS[k]} inteiro, vidro grande e triângulo: moldura de 20 mm (12 sobre a chapa, 8 sobre o cristal), 2,2 mm de altura` : `borracha escura de vão em volta do ${CRISTAIS[k]}: seção de 25 mm (15 sobre a chapa e 10 sobre o cristal) e 2,2 mm de altura, entrando 1,5 mm na chapa e no cristal, cobrindo a junta e a aba`,
        tecnica: nome.includes('PortaCabine') ? 'friso de perfil desenhado sobre a borda do vão aberto pelo contorno, o mesmo perfil dos outros vãos de vidro, declarado com a aba na moldura do vão' : 'friso de perfil desenhado sobre a volta do vão, nos nomes da gaiola, declarado com a aba na moldura do vão',
      })),
      ...COLUNAS_DA_JANELA.map((nome) => ({
        nome,
        forma: `barra preta da coluninha, lado ${nome.endsWith('Esquerda') ? 'esquerdo' : 'direito'}, da moldura: 25 mm de largura, de z 1217 no alto e 1268 no pé (inclinada para trás no alto), de cima a baixo do vão sobre o vidro, na altura da borracha`,
        tecnica: 'subdivisao de uma malha sobre a lateral, 2,2 mm para fora e engrossada 4 mm para dentro, no material da borracha; acaba dentro da borracha nas duas pontas',
      })),
      ...BASES_DO_RETROVISOR.map((nome) => ({
        nome,
        forma: `base do retrovisor ${nome.endsWith('Esquerda') ? 'esquerda' : 'direita'}, peça preta rente à chapa, emendada na frente da moldura, na metade da frente do triângulo: trás vertical em z 1486, frente que segue o vidro e abre embaixo até a ponta em z 1767, base reta em y 1313`,
        tecnica: 'subdivisao de um triângulo plano sobre a lateral, 3 mm para fora e engrossado 4 mm para dentro, em plástico preto, sem vão nem aba; a fresta da porta entra por baixo dela',
      })),
      {
        nome: 'grade',
        forma: 'grade escura e fosca entre os faróis, sem marca, de x -420 a 420 e de y 724 (topo do para-choque) a 1060, cantos de cima de raio 45 e os de baixo vivos; lente recuada 18 mm, aba em volta e três barras retas de 760 mm em y 850, 928 e 1006',
        tecnica: 'terceira aberturaPorContorno na vista frontal, com lente, base 24 mm abaixo do topo do para-choque; friso com aba, lente transladada 18 mm em z e barras em extrusão em z; tudo na mesma parte',
      },
      ...['Esquerdo', 'Direito'].map((lado) => ({
        nome: `farol${lado}`,
        forma: `lente do farol ${lado === 'Esquerdo' ? 'esquerdo' : 'direito'}, lisa, transparente e incolor, recuada 3 mm, no trapézio de y 840 a 1080 e x 460 a 870 na base: dentro vertical, fora inclinado 15% da base, cantos de raio 30; a aba cinza vai na mesma parte`,
        tecnica: 'aberturaPorContorno na vista frontal, na camada da frente da chapa, com lente, recuoDaLente e concordância nos cantos; friso com aba sobre a borda do vão; a aba e a lente são a mesma parte, cada uma no seu material',
      })),
      ...AROS.map((nome) => ({
        nome,
        forma: `aro cinza escuro em volta da lente do farol ${nome.endsWith('Esquerdo') ? 'esquerdo' : 'direito'}, de largura constante: 6 mm sobre a chapa e 6 sobre a borda da lente, 1,8 mm de altura, entrando 1,9 mm na chapa`,
        tecnica: 'friso de perfil simétrico sobre a borda do vão aberto pelo farol (superficie aberturaPorContorno)',
      })),
      ...['Esquerdo', 'Direito'].map((lado) => ({
        nome: `refletorFarol${lado}`,
        forma: `refletor do farol ${lado === 'Esquerdo' ? 'esquerdo' : 'direito'}: capa única de metal claro, borda no contorno da lente por dentro do aro, curva até o fundo (145 mm), sem placa; fundo a 25% da largura, 2ª concavidade a 72%, 12 facetas`,
        tecnica: 'subdivisao de malha polar com furo de soquete de 16 mm, parábola mais poço gaussiano, vincos vivos em 12 raios, 2 mm para trás; o direito é o espelho',
      })),
      ...['Esquerdo', 'Direito'].map((lado) => ({
        nome: `lampadaFarol${lado}`,
        forma: `lâmpada principal do farol ${lado === 'Esquerdo' ? 'esquerdo' : 'direito'}: bulbo de 11 mm de raio e 52 de comprimento com flange de soquete atrás do furo da capa, material claro, e a tampinha metálica na ponta (a máscara que corta a luz alta)`,
        tecnica: 'dois lathe em torno de z na posição do furo, o bulbo e a tampinha na mesma parte, cada um no seu material',
      })),
      ...['Esquerdo', 'Direito'].map((lado) => ({
        nome: `lampadaPosicaoFarol${lado}`,
        forma: `lâmpada de posição do farol ${lado === 'Esquerdo' ? 'esquerdo' : 'direito'}: bulbo pequeno de 5,5 mm de raio e 24 de comprimento no fundo da segunda concavidade do refletor, material claro`,
        tecnica: 'lathe em torno de z',
      })),
      ...['Esquerda', 'Direita'].map((lado) => ({
        nome: `luzDeCanto${lado}`,
        forma: `lente da luz de canto ${lado === 'Esquerda' ? 'esquerda' : 'direita'}, lisa, incolor, recuada 3 mm: lado de dentro inclinado como o de fora do farol, a 14 mm dele, base curta, lado de fora curvo dobrando a quina e entrando 60 mm na lateral`,
        tecnica: 'aberturaPorContorno com lente, vista pela diagonal da quina ([1, 0, 1] na de +x, [-1, 0, 1] na de -x) e sentido +, concordâncias nos cantos; friso com aba sobre a borda do vão; a aba e a lente são a mesma parte',
      })),
      ...['Esquerda', 'Direita'].map((lado) => ({
        nome: `refletorLuzDeCanto${lado}`,
        forma: `refletor em concha da luz de canto ${lado === 'Esquerda' ? 'esquerda' : 'direita'}: capa de 2 mm em metal claro, a borda 7 mm para dentro do vão, 38 mm de profundidade ao longo da diagonal da quina e furo de soquete de 9 mm de raio`,
        tecnica: 'subdivisao de uma malha polar, cada ponto levado à superfície da quina na reta da vista e recuado para dentro ao longo dela',
      })),
      ...['Esquerda', 'Direita'].map((lado) => ({
        nome: `lampadaLuzDeCanto${lado}`,
        forma: `lâmpada da luz de canto ${lado === 'Esquerda' ? 'esquerda' : 'direita'}: bulbo de 7 mm de raio e 26 de comprimento com flange, no furo da concha, com o eixo na diagonal da quina`,
        tecnica: 'lathe em torno de z, girado 45 graus em y',
      })),
      ...['Esquerdo', 'Direito'].map((lado) => ({
        nome: `piscaLateral${lado}`,
        forma: `lente do pisca lateral ${lado === 'Esquerdo' ? 'esquerdo' : 'direito'}, lisa, âmbar translúcida, recuada 3 mm, no paralama atrás da roda dianteira: pílula de 150 por 58 mm em z 1680 a 1830 e y 1011 a 1069, a ponta da frente mais baixa`,
        tecnica: 'aberturaPorContorno com lente, vista pelo eixo x ([1, 0, 0] na de +x, [-1, 0, 0] na de -x) e sentido +, pontas de raio 24; friso com aba; a aba e a lente são a mesma parte',
      })),
      ...['Esquerdo', 'Direito'].map((lado) => ({
        nome: `refletorPiscaLateral${lado}`,
        forma: `refletor em concha do pisca lateral ${lado === 'Esquerdo' ? 'esquerdo' : 'direito'}: capa de 2 mm em metal claro, a borda 4 mm para dentro do vão e 22 mm de profundidade para dentro da chapa, com furo de soquete de 4,5 mm de raio`,
        tecnica: 'subdivisao de uma malha polar, a profundidade ao longo de x',
      })),
      ...['Esquerdo', 'Direito'].map((lado) => ({
        nome: `lampadaPiscaLateral${lado}`,
        forma: `lâmpada do pisca lateral ${lado === 'Esquerdo' ? 'esquerdo' : 'direito'}: bulbo de 5 mm de raio e 20 de comprimento com flange, no furo da concha, com o eixo em x`,
        tecnica: 'lathe em torno de x',
      })),
      ...['Esquerda', 'Direita'].flatMap((lado) => [
        ['Freio', 'vermelha (freio), 35% da altura dentro, topo descendo para fora 40% dela'],
        ['Re', 'incolor (ré), 17% da altura'],
        ['Pisca', 'âmbar (pisca), 21% da altura'],
        ['Neblina', 'vermelha (neblina), 23% da altura, cantos de baixo de raio 55'],
      ].map(([faixa, cor]) => ({
        nome: `lanterna${faixa}${lado}`,
        forma: `faixa ${cor}, da lanterna ${lado === 'Esquerda' ? 'esquerda' : 'direita'} (y 760 a 1240, de x 856, dobrando a quina e entrando 85 mm na lateral), 7 mm de chapa entre faixas; lente lisa translúcida recuada 3 mm`,
        tecnica: 'aberturaPorContorno com lente na diagonal da quina ([1, 0, -1] em +x, [-1, 0, -1] em -x), um vão por faixa; friso com aba; aba e lente na mesma parte, cada uma no seu material',
      }))),
      ...['Esquerda', 'Direita'].map((lado) => ({
        nome: `refletorLanterna${lado}`,
        forma: `refletor da lanterna ${lado === 'Esquerda' ? 'esquerda' : 'direita'}: capa única de 2 mm em metal claro, quatro conchas na vertical, uma atrás de cada faixa, de fundo plano e 100 mm de profundidade, separadas por paredes rente à lente`,
        tecnica: 'subdivisao de quatro malhas polares ligadas por faixas de quadriláteros nas bordas que se defrontam, levadas à quina de trás e recuadas na diagonal; o direito é o espelho',
      })),
      ...['Esquerda', 'Direita'].flatMap((lado) => ['Freio', 'Re', 'Pisca', 'Neblina'].map((faixa) => ({
        nome: `lampadaLanterna${faixa}${lado}`,
        forma: `lâmpada da faixa ${faixa === 'Re' ? 'de ré' : `de ${faixa.toLowerCase()}`} da lanterna ${lado === 'Esquerda' ? 'esquerda' : 'direita'}: bulbo de 6 mm de raio e 30 de comprimento com flange, no furo do centro da concha, eixo na diagonal da quina`,
        tecnica: 'lathe em torno de z, girado 135 graus em y (-135 na direita)',
      }))),
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
          forma: `pneu 235/65 aro 16 da roda ${sufixo.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}: 710 mm de diâmetro e 235 de largura, pneumático com bojo no flanco e ombro arredondado, na bitola de 1730 e no eixo ${sufixo.startsWith('Dianteiro') ? 'dianteiro' : 'traseiro'}, apoiado no chão`,
          tecnica: 'família roda-pneu, perfil furgao-235-65-r16: lathe em torno de x, 112 lados, ombro em arco de três segmentos, quatro sulcos subtraídos da banda, sombreamento liso de 35 graus, banda e flanco cada um no seu material com relevo',
        },
        { nome: `aro${sufixo}`, forma: 'barril de aço do aro de 16 polegadas, de 3,6 mm de parede e 70% da largura do pneu, que a banda abraça', tecnica: 'família roda-pneu: lathe em torno de x de um tubo' },
        { nome: `cubo${sufixo}`, forma: 'cubo da roda de chapa, com o furo central de 71 mm e a volta de 5 furos de fixação de 20 mm no círculo de 118', tecnica: 'família roda-pneu: lathe do anel menos o furo central e os cinco furos repetidos em volta do eixo' },
        { nome: `disco${sufixo}`, forma: 'chapa de aço da roda de 16 polegadas, de 6 mm, do cubo ao aro, deslocada para fora, com a volta de 5 furos de ventilação de 50 mm no círculo de 277', tecnica: 'família roda-pneu: lathe em torno de x de um anel, tipo 0, menos os cinco furos de ventilação repetidos em volta do eixo' },
      ]),
      {
        nome: ANTENA[0],
        forma: 'pé da antena: gota baixa de 120 por 60 mm e 35 mm de altura, fina na frente, inclinada como o teto, no meio do teto (x 0) a 60 mm da borda do vão do para-brisa, com a base assentada na curva do teto sem vão',
        tecnica: 'loft de seções em superelipse (16 lados) de fundo achatado, com pontas fechadas, girado pela inclinação do teto e com a base entrando 1,7 mm na chapa de 2 mm; sombreamento liso de 40 graus',
      },
      {
        nome: ANTENA[1],
        forma: 'haste da antena: 300 mm acima do pé, afinando de 8 mm de diâmetro na base para 4 na ponta, inclinada 10 graus para trás da vertical, nascendo dentro da seção mais alta do pé',
        tecnica: 'lathe de 12 lados de um perfil reto (cone) com a base 10 mm dentro do pé, girada 10 graus em x; plástico preto liso',
      },
      ...MACANETAS.map((nome) => ({
        nome,
        forma: `${/Traseira/.test(nome) ? 'alça vertical de 180 por 40 mm, para a porta traseira, junto da borda do meio, a 70 mm dela' : 'alça horizontal de 180 por 40 mm, a 70 mm da borda da porta que abre (na da cabine, a 160 mm da traseira)'}, a ${/Cabine/.test(nome) ? '1293' : '1060'} mm de altura, em U com dois pés de 18 mm a 70 mm do meio da alça, a 15 mm da porta, de plástico preto`,
        tecnica: 'extrusão de um perfil em U de 14 pontos (barra de 7 mm de espessura com os cantos de fora chanfrados em 4 mm e dois pés), pela altura de 40 mm; os pés entram 1,5 mm na chapa',
      })),
      ...PLACAS_DAS_MACANETAS.map((nome) => ({
        nome,
        forma: 'placa rasa em anel em volta da alça, de 226 por 86 mm por fora e 210 por 70 mm por dentro, 5 mm acima da chapa, da cor da lataria: faz de conta o rebaixo da chapa, que abrir na carroceria mudaria a malha dela',
        tecnica: 'extrusão de um retângulo de cantos chanfrados com um furo retangular, entrando 1,5 mm na chapa',
      })),
      {
        nome: PONTEIRA,
        forma: 'ponteira de escapamento: tubo reto de 55 mm de diâmetro e 3 de parede, 155 mm, sob o para-choque traseiro no lado esquerdo (x 180), encostado no fundo dele, com a boca 50 mm atrás da face dele',
        tecnica: 'extrusão em z de um círculo com furo circular (24 lados), topo entrando 1 mm no fundo do para-choque; aço escuro',
      },
    ],
    criteriosDeReprovacao: [
      'a silhueta lateral, frontal ou de cima se afasta da prancha cotada mais de 15 mm em média ou 40 mm em algum ponto, medida com os cristais e as borrachas',
      'a frente não segue a prancha ajustada: boca do capô fora de 1100, pé do para-brisa fora de 1480, topo fora de 2110, ou a curva do teto sem os dois raios tangentes (1290 e 405) chegando ao teto plano em z 770',
      'o para-brisa não envolve as quinas: borda de cima ou de baixo reta na frontal, ou coluna de chapa diferente de cerca de 100 mm por lado, ou a ponta que não dobra pela quina',
      'um canto de vão de vidro aparece vivo na luz rasante, em degrau ou em aresta, em vez de arredondado',
      'uma fresta de porta não fecha a volta, muda de largura ao longo dela ou sai da linha da prancha',
      'falta uma das cinco portas, ou a de correr aparece também do lado esquerdo',
      'a aba de um vão de vidro não cobre a borda inteira, ou a borracha não cobre a junta inteira do cristal (15 mm sobre a chapa e 10 sobre o cristal; 12 e 8 na cabine), tem degrau ou dente no canto, sobe mais de 4 mm ou não é escura',
      'falta cristal no para-brisa, nas portas da cabine ou nas portas traseiras, ou há vidro no compartimento de carga nas laterais',
      'algum vão deixa ver o oco do furgão: por um cristal aparece o vazio, e não o painel, os bancos, a divisória ou o piso',
      'o cristal fica saliente ou afundado em relação à lataria além da borracha (mais de 1 mm na luz rasante), ou deixa fresta aberta entre a borda do vão e o cristal que a borracha não cubra',
      'falta o piso, a divisória, um dos dois bancos ou o painel, ou algum deles atravessa a chapa, a aba de um vão, um forro, o pneu ou outro volume do interior, ou fica a menos de 10 mm da chapa sem ser o apoio declarado',
      'o vinco de cintura ou as nervuras do teto não aparecem na luz rasante, ou aparecem fortes como degrau',
      'a aba de um arco sobra solta da lateral ou não acompanha o arco inteiro',
      'a lateral não é vertical até o vinco de cintura e inclinada 3,9 graus acima dele, ou um sulco do teto não cabe no teto de ±650',
      'a borda de fora de uma porta traseira não é vertical nem rente à lanterna, ou o topo dela passa de 2320, ou os cantos de cima dela não são redondos, ou a janela dela não é um retângulo de bordas paralelas às da porta',
      'a luz rasante ou a curvatura mostram amassado, ondulação ou serrilhado que a forma não pede, fora das frestas, dos vãos e dos vincos, nem na fresta da porta da cabine junto ao arco dianteiro',
      'um pneu não toca o chão, ou toca ou atravessa o arco da roda, a lateral ou o forro do arco',
      'a roda não é a da família roda-pneu no pneu 235/65 aro 16 (710 mm de diâmetro, 235 de largura, com bojo e ombro) numa roda de chapa de aço de 16 polegadas com 5 parafusos, ou não fica na bitola de 1730 e nos eixos da prancha',
      'o forro de um arco falta, deixa ver o oco do carro pelo arco, não é escuro, fica a menos de 20 mm ou a mais de 30 mm do pneu em algum ponto, ou não encosta na chapa em volta da boca',
      'o alargamento de um arco não cobre o pneu com folga visível, na vista de cima ou na frontal, ou o forro passa para fora da boca do arco',
      'a grade não é um vão escuro de lente recuada com três barras horizontais retas e cantos de cima redondos, ou deixa fresta aberta contra o para-choque',
      'o farol não é o trapézio com o lado de dentro vertical e o de fora inclinado, lente lisa transparente e incolor e aro cinza escuro de largura constante em volta',
      'o refletor do farol é placa plana, ou não é uma capa única da borda da lente ao fundo, ou o fundo não fica a 20% a 30% da largura do lado de dentro, ou falta a 2ª concavidade, a lâmpada principal com a tampinha ou a de posição',
      'a luz de canto não encosta no farol pelo lado inclinado, por uma fresta, nem dobra a quina; falta o pisca lateral âmbar em pílula atrás da roda dianteira, ou uma luz da frente sem refletor em concha e lâmpada',
      'o refletor ou a lâmpada de uma luz da frente atravessa a chapa, o capô, o forro do arco ou outra luz',
      'alguma peça fica solta no ar ou atravessa outra sem motivo',
      'o lado esquerdo e o direito diferem fora da porta de correr',
      'aparece marca, logotipo ou nome de fabricante',
      'a saia ou um para-choque não é plástico escuro por fora da chapa com a seção da prancha: saia de 299 a 463 saindo 20, dianteiro saindo 50 em duas alturas, traseiro saindo 110 com o degrau plano em 580',
      'a saia não é cortada pelas frestas: cada porta deve levar o seu trecho de 383 a 463, e ficam presos os 299 a 377 sob as portas e os trechos entre as portas e os arcos, sem trecho preso de 10 mm junto à fresta do arco dianteiro',
      'a moldura não é do plástico preto da saia e dos para-choques, marca linha na borda de fora (volta à chapa de repente), diminui a boca, não dobra 10 mm para dentro do arco, passa menos de 2 mm acima da aba, ou desce abaixo da ponta vizinha',
      'o alargamento não tem 150 de largura e 30 de saída nos quatro arcos, em volta toda, ou não segue na saia e nos para-choques, com a mesma saída, abaixo das pontas até 299',
      'a continuação escura do alargamento marca emenda com a saia ou com o para-choque, ou há linhas de fresta, emenda de peça ou de cor a menos de 30 mm uma da outra fora dos encontros',
      'a fresta da porta da cabine não corre na borda de fora do alargamento (raio 570, 150 mm da boca) ou corta o alargamento',
      'a porta da cabine não tem a borda de trás em z 622, o topo em y 2035 e a frente descendo paralela ao para-brisa, 90 mm atrás dele, até y 1335 e dali vertical em z 1660 até a costura do arco (±30), ou tem degrau na frente',
      'o canto de cima da frente da porta da cabine é vivo, e não uma curva aberta de uns 70 mm, ou o topo dela não deixa 75 mm de faixa de teto acima, em 2035',
      'a janela da cabine não é um vão só com borracha contínua de uns 20 mm em volta e a coluninha de uns 25 mm como barra preta dela (z 1217 no alto, 1268 no pé), ou há chapa ou tira azul entre a borracha e o vidro ou a base preta',
      'o vidro grande não tem largura sobre altura de 0,85 (±0,1), ou a borda de trás dele não é inclinada com o pé mais à frente (z 820 e 747), ou o canto de baixo de trás é vivo, ou a base dele não é reta e desce para a frente até y 1338',
      'o alto do triângulo tem trecho reto, em vez de virar logo em cima da coluninha para a descida paralela ao para-brisa, ou a frente não fica 150 mm atrás, ou a base não é mais deitada que a do vidro grande, ou a ponta sai de z 1692 e y 1324',
      'a metade da frente do triângulo é vidro, e não a peça preta, ou a borda de trás dela não é vertical em z 1486 (±30), ou a de frente não abre embaixo, ou a fresta da porta não entra por baixo dela e sai pela base',
      'a maçaneta da porta da cabine não fica logo abaixo do canto de trás do vidro grande, uns 140 mm abaixo da base dele (z 802 a 986, y 1277 a 1309, ±30)',
      'falta a faixa recuada da entrada de ar ou o lugar da placa no para-choque dianteiro, ou o lugar da placa no traseiro',
      'o plástico ou a moldura toca ou atravessa o pneu, a saia ou o para-choque toca a aba do arco, ou a silhueta com eles passa de 5560 por 2100 mm',
      'a antena flutua sobre o teto, atravessa a chapa por dentro, fica fora do meio do teto ou longe da borda do para-brisa, ou a haste não é fina e quase em pé, inclinada para trás',
      'falta uma maçaneta nas portas da cabine, na de correr ou nas duas traseiras, ou uma fica longe da borda da porta que abre, fora da altura dela (1060 mm, ou 1293 na porta da cabine), flutua ou atravessa a porta',
      'a ponteira não sai sob o para-choque traseiro do lado esquerdo, não encosta no fundo dele, fica na frente da face dele ou flutua',
    ],
    /* As feições que as réguas de superfície acham e que são desenho, cada uma na caixa justa em volta dela (2026-11-09). A régua dá a posição de uma cadeia de vincos pelo centro
       dela, e a caixa da coluna do para-brisa fica no meio da coluna: o pé e o canto de cima do teto, onde havia nó e bico (2026-11-09: as colunas p morriam de uma vez, a descida
       da coroa tinha salto de curvatura), ficam fora dela, e achado novo ali volta a aparecer. */
    dobrasAceitas: [
      ...[['Esquerdo', 1], ['Direito', -1]].map(([lado, s]) => ({
        parte: `refletorFarol${lado}`, tipos: ['dobra', 'vinco'],
        regiao: { min: [s > 0 ? 495 : -635, 885, 2495], max: [s > 0 ? 635 : -495, 1035, 2540] },
        motivo: 'facetas do refletor do farol (12 vincos vivos em raios, plano da etapa 8), aprovadas pela pessoa por imagem em 2026-11-07',
      })),
      ...[['Esquerda', 1], ['Direita', -1]].flatMap(([lado, s]) => [['freio', 1068], ['ré', 979], ['pisca', 872]].map(([faixa, y]) => ({
        parte: `refletorLanterna${lado}`, tipos: ['dobra', 'vinco'],
        regiao: { min: [s > 0 ? 930 : -995, y - 13, -2650], max: [s > 0 ? 995 : -930, y + 13, -2570] },
        motivo: `parede divisória e concha da faixa de ${faixa} do refletor da lanterna, aprovadas pela pessoa por imagem em 2026-11-07 (a parede liga as conchas)`,
      }))),
      { parte: 'carroceria', tipos: ['vinco'], regiao: { min: [-60, 314, -2695], max: [60, 330, -2678] },
        motivo: 'raio de 40 mm do pé da traseira (raio_traseira_base) em toda a largura, visto de perto: a borda de baixo da traseira arredondada, pedida na tabela' },
      ...[1, -1].map((s) => ({
        parte: 'carroceria', tipos: ['vinco'], regiao: { min: [s > 0 ? 906 : -930, 1815, 1458], max: [s > 0 ? 930 : -906, 1850, 1482] },
        motivo: 'crista da borda da coroa ao longo da coluna do para-brisa (quina de raio 160: desenho da prancha); a caixa é o meio da cadeia, de uns 830 mm desde 2026-11-11; o pé e o canto do teto ficam fora dela',
      })),
      ...[1, -1].map((s) => ({
        parte: 'carroceria', tipos: ['vinco'], regiao: { min: [s > 0 ? 866 : -916, 2217, 1146], max: [s > 0 ? 916 : -866, 2267, 1196] },
        motivo: 'a mesma crista da coroa, no canto do teto: desde 2026-11-11 a cadeia se parte em duas, a de cima de uns 270 mm (a frente da porta ficou mais perto da quina, e a volta da D ao teto começa dali)',
      })),
      { parte: 'parachoqueDianteiro', tipos: ['vinco'], regiao: { min: [-60, 298, 2676], max: [60, 310, 2696] },
        motivo: 'quina de baixo do lábio da seção do para-choque (ponto [15, 302] de secao_parachoque_dianteiro), ao longo de toda a frente: perfil da prancha' },
      { parte: 'parachoqueDianteiro', tipos: ['vinco'], regiao: { min: [-60, 370, 2720], max: [60, 387, 2740] },
        motivo: 'quina de cima do lábio, entre os pontos [46, 375] e [44, 382] da seção, onde começa a faixa recuada da entrada de ar: perfil da prancha' },
      ...[1, -1].map((s) => ({
        parte: 'parachoqueDianteiro', tipos: ['vinco'], regiao: { min: [s > 0 ? 1015 : -1045, 478, 2355], max: [s > 0 ? 1045 : -1015, 498, 2385] },
        motivo: 'degrau de cima da faixa recuada (pontos [30, 482] e [44, 488] da seção) que segue pela lateral do para-choque até o arco: perfil da prancha',
      })),
      ...[524, 646].map((y) => ({
        parte: 'parachoqueDianteiro', tipos: ['vinco'], regiao: { min: [-200, y - 8, 2740], max: [200, y + 8, 2752] },
        motivo: 'cantos chanfrados do bolso do lugar da placa dianteira (400 por 130, fundo recuado 8 mm), pedido pelo plano; visto de perto na frontal',
      })),
      ...[1, -1].map((s) => ({
        parte: 'parachoqueTraseiro', tipos: ['vinco'], regiao: { min: [s > 0 ? 1015 : -1045, 296, -2270], max: [s > 0 ? 1045 : -1015, 310, -2237] },
        motivo: 'quina de baixo da seção do para-choque traseiro (pontos [60, 302] e [95, 312]) na lateral, em continuação à da reta de trás: perfil da prancha',
      })),
      ...[384, 506].map((y) => ({
        parte: 'parachoqueTraseiro', tipos: ['vinco'], regiao: { min: [-205, y - 8, -2812], max: [205, y + 8, -2800] },
        motivo: 'cantos chanfrados do bolso do lugar da placa traseira (400 por 130, fundo recuado 8 mm), pedido pelo plano; visto de perto na traseira',
      })),
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
