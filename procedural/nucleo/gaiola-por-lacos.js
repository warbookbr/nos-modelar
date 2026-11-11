/* gaiola-por-lacos.js — monta a gaiola fechada da operação `subdivisao` a partir de laços, um contorno por plano ao longo de um eixo
 *
 * FICHA gaiolaPorLacos
 * serve: gaiola de um sólido fechado dado por laços, o contorno da peça em cada plano ao longo de um eixo, com as pontas tampadas, ou
 *   de uma casca com a ponta aberta (a boca de uma cuba, de um recipiente, de uma carenagem), pronta para a chapa do passo subdivisao.
 * quando: corpos que se fundem numa malha só sem emenda (L, U, cotovelo, alça, cabo, disco com coluna, carcaça com cantos suaves),
 *   cortados em planos paralelos; para uma chapa aberta use gaiolaPorEstacoes, e para uma faixa de seção constante use gaiolaVarrida.
 * unidades: `em` e os pontos dos trechos entram em mm; `pontos` sai em metro, para pôr em TOPO; espalhe `passo` no passo subdivisao.
 * campos:
 *   nome: prefixo dos pontos, que saem como `${nome}_${laco}_${trecho}${k}`.
 *   eixo: 'x', 'y' ou 'z'; o ponto [u, v] do laço são os outros dois eixos na ordem x, y, z.
 *   trechos: [{ nome, pontos, razao?, some?, encolhe? }] a volta do laço em ordem, e quantos pontos (com as duas pontas) o trecho tem em
 *     todo laço. razao é o último segmento sobre o primeiro (1: iguais; 0,2: encurtam); some, em mm, funde o trecho num ponto onde mede
 *     menos; encolhe { de, ate, curva? } leva o trecho de inteiro, no laço de, a um ponto no laço ate, aos poucos (curva 'linear' ou 'entrada').
 *   lacos: [{ nome?, em, trechos: { [trecho]: [[u, v], ...] } }] em crescente; o trecho começa onde o anterior acaba.
 *   tampa: { de, ate } os trechos entre os quais a escada tampa as pontas; as duas cadeias entre eles têm os mesmos pontos.
 *   vincos: [{ nome, trecho | entre: [a, b] | laco, trechos?, lacos?: [de, ate], nitidez | raio, esvai? }] borda da faixa de um trecho, linha ou
 *     volta de laço; lacos limita o trecho ou o entre a uma faixa de laços; esvai { de, ate, curva? } faz a nitidez do entre cair a zero
 *     entre dois laços. Vinco 'viva' de laço inteiro em dois planos os libera do mínimo.
 *   une: [[trechoA, trechoB], ...] funde, em cada laço, os pontos dos dois trechos que coincidem, mesmo sem serem vizinhos na volta: a linha
 *     dobrada sobre si (a ponta fina de um tubo, uma lâmina no meio) fica com um ponto só; recusa trecho que falta e par sem ponto comum.
 *   cantos: [{ entre: [a, b], laco? }] o ponto entre dois trechos fica vivo, em todos os laços ou num só.
 *   medidas: [{ trecho | entre, laco?, peso? }] cota nos pontos marcados; em todos os pontos é recusado.
 *   compensar: true | { trechos, lacos?, pontas? } move os pontos para a superfície limite passar por eles: o arco de r sai com r.
 *     Em peça nova, declare-o nos trechos de canto e de curva (decisão da pessoa, 2026-11-05). pontas move também a lâmina de ponta.
 *     Onde a superfície entre os pontos de um laço sai do contorno mais de TOLERANCIA_DA_COMPENSACAO_MM além do que saía sem compensar (o
 *     canto sem vinco, a quina de uma planta em polígono), sai o aviso `compensacaoPassa` com o trecho, o laço e o desvio.
 *   grupos: [{ nome, lacos?: [de, ate], trechos? | unir: [{ lacos?, trechos? }] }] faces para parte; vai em passo.grupos, em pontos.
 *   aberta: 'inicio' | 'fim' | 'ambas' a ponta sem tampa; o laço dela fica borda livre, e `bocas` dá os pontos dele em volta fechada
 *     (para um vinco, um friso ou a borda virada). Com 'ambas', tampa é dispensada. Sem aberta, as duas pontas são tampadas.
 *   espessura: mm, ou { valor, niveis?, lado? }, a chapa que o passo subdivisao vai pôr: só confere o raio local na malha refinada (de
 *     NIVEIS_DA_CONFERENCIA_DA_ESPESSURA níveis), e cada laço com par de raio abaixo dela dá o aviso `cantoApertado` com o ponto, a
 *     direção ('noLaco', o canto; 'entreLacos', a dobra para o vizinho ou a tampa), o raio e o que fazer. A malha não muda.
 * devolve: { pontos, pontosMm, alvosMm, passo, nomeDe(laco, trecho, k), lacos, trechos, avisos, compensacao?, bocas?, espessura? }.
 * exemplo:
 *   gaiolaPorLacos({ nome: 'barra', eixo: 'x', tampa: { de: 'baixo', ate: 'cima' },
 *     trechos: [{ nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos: 3 }, { nome: 'cima', pontos: 2 }, { nome: 'tras', pontos: 3 }],
 *     lacos: [0, 50, 100].map((em) => ({ em, trechos: { baixo: [[0, 0], [0, 40]], frente: [[0, 40], [30, 40]],
 *       cima: [[30, 40], [30, 0]], tras: [[30, 0], [0, 0]] } })),
 *     vincos: [{ nome: 'pontas', laco: 'primeiro', nitidez: 'viva' }] })
 * peça: tools/fixtures/solido-por-lacos/coluna.js (disco e cilindro) e tools/fixtures/solido-por-lacos/dobra-em-u.js (dobra em U);
 *   o L é receita.js na mesma pasta; encolhe e esvai, em tubos.js (dois tubos que se cruzam), com a técnica antiga em tubos-hoje.js.
 * FIM DA FICHA
 *
 * Função pura, sem Three.js e sem domínio. A receita dá, em cada plano, o contorno fechado da peça cortada por ele, em trechos
 * nomeados que vêm na mesma ordem em todo laço; a função reamostra cada trecho com pontos por igual ao longo do comprimento, no
 * número que `trechos` pede, liga dois laços vizinhos ponto a ponto (as tiras), tampa o primeiro e o último laço com uma escada
 * entre as duas cadeias que vão de `tampa.de` a `tampa.ate`, funde os pontos seguidos do mesmo laço que coincidem (a ponta que se
 * fecha num ponto) e orienta as faces pelo sinal do volume. Sai no formato do passo `subdivisao`, com nomes e sem índice.
 * Os limites vistos na coluna do braço (plano dos limites do sólido por laços) estão nos parágrafos A LÂMINA, O PASSO NO TRECHO,
 * OS VINCOS, AS RECUSAS e A COMPENSAÇÃO abaixo.
 *
 * O LAÇO. Cada trecho é uma polilinha [[u, v], ...] de um ou mais pontos; o primeiro ponto dele é o último do trecho anterior, e
 * o último do último trecho é o primeiro do primeiro (a volta fecha), com tolerância de TOLERANCIA_DE_FUSAO_MM. Um trecho de um
 * ponto só tem comprimento zero: todos os pontos dele coincidem e se fundem. O trecho de `pontos` n dá n pontos, as duas pontas
 * nos lugares dados e os outros a distâncias iguais ao longo da polilinha; o último é o primeiro do trecho seguinte, de modo que
 * o laço tem a soma de (n - 1) pontos, o mesmo em todo laço, e os pontos do trecho t no laço l se chamam `${nome}_${l}_${t}${k}`,
 * k de 0 a n - 2. O laço sem nome se chama `l${r}`, pela posição.
 *
 * O PASSO NO TRECHO. Com `razao` r diferente de 1, os segmentos do trecho crescem em progressão geométrica e o último mede r vezes o
 * primeiro: a parede longa que acaba num filete de 0,7 mm tem razao 0,07, e o aviso de amostragem desigual some sem o trecho ser
 * partido em oito. Com `some` s, o trecho que mede menos que s mm num laço vira um ponto, o do meio dele, e os vizinhos acabam e
 * começam nele (a forma muda até s/2 mm ali): o trecho que some e volta entre planos não deixa então um leque de faces finas, e
 * `lacos[k].sumiram` diz em que laços cada trecho foi fundido. O trecho que mede zero já se funde sozinho.
 *
 * O TRECHO QUE ENCOLHE. `encolhe: { de, ate }` num trecho o leva, nos laços de `de` a `ate`, da forma inteira que a receita dá a um ponto:
 * em cada laço entre os dois, cada ponto da polilinha anda em linha reta até o ponto que o trecho tem em `ate`, com o peso da posição do
 * laço na faixa ('linear': proporcional ao eixo; 'entrada': parte parado, 2t² - t³, para a faixa não começar de repente). Os pontos do trecho,
 * reamostrados por igual, se aproximam por igual e se fundem no laço final, e o trecho que some entre planos a 2,5 mm não deixa leque de
 * faces finas nem exige laço a 0,2 mm do vizinho. A receita dá o trecho inteiro em todo laço da faixa e um ponto (ou pontos que coincidem)
 * em `ate`; os trechos seguidos que encolhem usam a mesma faixa e o mesmo ponto lá, e os vizinhos que não encolhem acabam e começam nas
 * pontas dele, como no `some`. Com a ponta andando muito sobre um arco do vizinho, ele a segue pela corda (1,3 mm numa faixa de 40 mm
 * sobre o círculo de 78 mm), então prefira o trecho curto, ou o vizinho com pontos perto da ponta. Faixa invertida, laço que não existe
 * e trecho que não mede zero em `ate` são recusados com o laço e a medida. Sem `encolhe`, a malha sai idêntica à de antes do campo.
 *
 * O VINCO QUE ESVAI. `esvai: { de, ate }` num vinco de `entre` (a linha do ponto entre dois trechos, que corre pelos laços) mantém a nitidez
 * declarada até o laço `de`, a faz cair a zero em `ate` pelo mesmo peso e acaba aí: cada aresta entre dois laços leva a média da nitidez
 * dos dois, e o vinco sai em vários, de nitidez constante cada um (`${nome}_${k}`). A nitidez parte de um número de 0 (exclusive) a 1, e
 * não do 'viva'; a faixa fica dentro dos laços do vinco; o vinco de trecho ou de laço não aceita `esvai`.
 *
 * A COSTURA. `une: [[a, b]]` funde, em cada laço, os pontos do trecho a que coincidem com os do trecho b (a distância de TOLERANCIA_DE_FUSAO_MM),
 * mesmo que os dois não sejam vizinhos na volta: o laço de uma ponta fina de tubo, em que as duas laterais de um ouvido de largura zero ficam uma
 * sobre a outra, tem então um ponto só por posição, e a malha casa pelos pontos em vez de ter duas folhas soltas. As faces que a costura deixa sobre
 * os mesmos pontos, uma em cada sentido (a membrana de espessura zero entre o laço fino e o ponto em que ele nasce), saem juntas. A linha em que
 * o sólido toca a si mesmo dos dois lados deixa quatro faces numa aresta e continua recusada. O par sem nenhum ponto em comum, em laço algum, é
 * recusado com os dois trechos; sem `une`, nada muda na malha.
 *
 * A TAMPA. A escada liga, no primeiro e no último laço, o ponto j da cadeia A (do fim de `de`, para a frente na volta, até o
 * começo de `ate`) ao ponto j da cadeia B (do começo de `de`, para trás, até o fim de `ate`), e por isso as duas cadeias precisam
 * do mesmo número de pontos. A primeira face é o trecho `de` com o primeiro degrau, as do meio são quadriláteros entre dois
 * degraus, e o trecho `ate` com mais de dois pontos fecha a última face: curvo, como face própria; reto (pontos alinhados), com os
 * pontos dentro da última face da escada, entre o degrau e a ponta, porque uma face só de pontos alinhados teria área zero. Um laço que
 * se funde num ponto só dispensa a tampa. Faixa fina na tampa: a primeira faixa (de `de` ao primeiro degrau) mede a largura do passo
 * do primeiro arco da cadeia, e uma faixa de 9 mm por 560 mm que a subdivisão com espessura rasga em lascas pede arcos de menos pontos.
 *
 * A LÂMINA. O laço de ponta de área zero (uma linha, duas linhas em cruz, um ponto: o fundo de um disco tangente ao plano, ou a ponta
 * em que duas paredes se encostam) é uma lâmina: os pontos dele que coincidem se fundem, todos, e não leva tampa; as tiras dos dois
 * lados se casam sobre ela. A escada ligaria pontos que coincidem e daria faces de área zero. O laço côncavo com área (uma cruz
 * grossa, o laço da faixa sob um círculo) fica com a escada quando ela cabe; se algum degrau cai sobre a reta do vizinho, a tampa é a
 * triangulação do contorno por orelhas, na ordem da volta (a mesma orientação), sem exigir cadeias iguais. Só é recusada, com os trechos a
 * reamostrar, a volta que se toca (o mesmo ponto duas vezes) ou em que nenhuma orelha cabe.
 *
 * OS VINCOS. `{ trecho: t }` é a borda da faixa que o trecho t varre: a linha do primeiro ponto de t por todos os laços, o trecho
 * no último laço, a linha do último ponto de volta e o trecho no primeiro laço. `{ entre: [a, b] }` é só a linha do ponto entre a
 * e b. `{ laco: nome | 'primeiro' | 'ultimo' }` é a volta inteira do laço, ou os `trechos` listados dela, um vinco por trecho.
 * `lacos: [de, ate]` limita o vinco de trecho ou de entre aos laços de um a outro, inclusive: a linha do chanfro de um disco acaba
 * onde o disco acaba, e não segue pelo cilindro. A nitidez é a do passo: 'viva' ou de 0 a 1.
 *
 * AS RECUSAS. Dois laços a menos de DISTANCIA_MINIMA_ENTRE_PLANOS_MM um do outro ondulam a superfície (na peça de teste do plano,
 * a 0,12 mm, uma falha de 5,16 mm na traseira) e são recusados com os dois planos e a distância, salvo se os dois levam vinco
 * 'viva' na volta inteira (`{ laco, nitidez: 'viva' }`, sem `trechos`): o vinco isola a faixa, e o chanfro de 2 mm do topo de um
 * cilindro passa a 2 mm do plano vizinho. A cota exata em todos os pontos (`medidas: 'todos'`, ou marcas que cobrem todos) dobra a
 * superfície e é recusada: marque só os pontos de cota. A tampa de laço côncavo sem triangulação é recusada com o trecho a reamostrar (A LÂMINA).
 *
 * OS AVISOS. Onde dois trechos vizinhos de um laço têm pontos espaçados muito diferentes (razão acima de RAZAO_MAXIMA_DE_AMOSTRAGEM
 * entre o último segmento de um e o primeiro do outro, fora de vinco e de canto), a subdivisão deixa calombo; o mesmo vale para
 * dois intervalos vizinhos entre planos (menos em torno do laço de vinco vivo inteiro). Sai um aviso por junção, com o laço da maior
 * razão; o aviso não impede a gaiola. Sai também o aviso `facesFinas` quando alguma face tem área menor que
 * LIMITE_DE_FACE_FINA_NA_GAIOLA vezes o quadrado da maior aresta, com a pior e o que fazer (`some`, ou um plano entre os dois).
 *
 * A COMPENSAÇÃO. A superfície limite da subdivisão passa por dentro dos pontos de um arco: o canto de 32 mm com os pontos no arco
 * sai com o recuo de um arco de 34,2 mm. `compensar` move os pontos marcados no plano do laço, na direção da normal da gaiola sem
 * a componente do eixo, em PASSOS_DA_COMPENSACAO passos, cada um o bastante para cobrir a distância normal que ainda falta do ponto
 * limite (de `limitesDaGaiola`) ao ponto declarado. Ficam onde estão os pontos de canto, os fundidos e os de normal quase no eixo
 * (parte no plano abaixo de INCLINACAO_MINIMA_DA_COMPENSACAO), que só andariam muito para cobrir pouco. O ponto em exatamente dois
 * vincos vivos (a borda de um chanfro) anda só pela parte da distância perpendicular à curva do vinco, no plano do laço: a normal
 * média das faces dele inclui a da face vizinha e empurrava o chanfro 0,5 mm para fora dela. Com `pontas: true`, a lâmina de ponta
 * e os pontos de normal no eixo dela andam também ao longo do eixo, e saem do plano do laço: o fundo do disco chega a -78 mm.
 * `alvosMm` guarda os pontos declarados, e `compensacao` o número de pontos movidos, o maior deslocamento e o maior resíduo, em mm.
 * Na peça em L o canto de 32 mm sai com 31,8 mm no corte, e na dobra em U as curvas de 40 e 24 mm saem com 40,1 e 24,0.
 * A superfície passa pelos pontos movidos, mas entre eles não há promessa: num laço de contorno em polígono (a planta de um capô, com
 * as quinas da largura sem vinco), o ponto da quina anda até 59 mm para fora para o limite passar por ele, e a curva lisa que o liga aos
 * vizinhos sai 11,5 mm da lateral reta, em toda altura, com o passo de 120 mm entre pontos; com metade do passo, 4,6, e com a quina em
 * `cantos`, zero. É a interpolação por ponto de um contorno com quina, e não um erro da conta. Por isso, depois de compensar, a gaiola é
 * refinada um nível e a linha de cada laço (os pontos dela e o meio de cada segmento) é levada ao limite, com e sem a compensação;
 * o quanto o ponto com ela fica fora do contorno declarado, menos o que já ficava sem ela, acima de TOLERANCIA_DA_COMPENSACAO_MM, dá o
 * aviso `compensacaoPassa`, um por trecho, com o pior laço, o desvio em mm e quantos laços passam. A conta não muda a gaiola, mede no
 * plano do laço (o deslocamento ao longo do eixo fica de fora) e subestima o pico, que fica entre os pontos dela (11,5 contra 13,9 mm
 * na malha de nível 3); entre laços, a onda depois de um degrau da silhueta já existe sem compensar e não entra no aviso.
 *
 * OS GRUPOS. `grupos` lista conjuntos de pontos por faixa de laços e por trecho (ou a união de vários, em `unir`) e `passo.grupos`
 * leva os nomes ao passo `subdivisao`, que toma por do grupo a face da gaiola com todos os pontos nele e publica as faces refinadas
 * como `parte` da origem: `parte` recorta o disco e o cilindro pela gaiola, e não por caixa.
 *
 * A BOCA. `aberta` tira a tampa da ponta pedida: as faces são as da gaiola fechada menos as da escada daquela ponta, na mesma ordem e com a
 * mesma orientação, e as arestas do laço da boca ficam numa face só (o fechamento aceita só essas). O lado de fora da casca é o do sólido
 * que a fecharia, medido com um leque de cada aresta da boca até o centro dela, que só entra na conta do volume. O laço de área zero não
 * tem boca e é recusado. `bocas.inicio` e `bocas.fim` dão { laco, em, pontos }, a volta do laço com o primeiro ponto repetido no fim. A
 * borda livre já é viva na subdivisão (fica no plano do laço, na curva dos pontos dele), e o vinco vivo nela só confirma isso: a malha
 * sai a mesma. Com `espessura` no passo `subdivisao`, a chapa fecha a boca com a parede da borda e o sólido fica fechado.
 *
 * A CONFERÊNCIA DA ESPESSURA. Numa casca de uma peça de prova, a chapa foi recusada pelo passo porque um laço tinha cantos de raio local
 * de 6,7 mm, e a saída se achou por tentativa. Com `espessura`, a gaiola é refinada como o passo a refina (os vincos e os cantos dela, os
 * níveis pedidos) e a chapa é medida pela mesma conta do passo (`espessarSuperficie`); cada par de vértices em que a espessura chega ao
 * raio local vai ao ponto da gaiola mais perto, e o pior de cada laço dá o aviso, com a direção pelo cosseno do par com a tangente do
 * laço (COSSENO_DO_CANTO_NO_LACO). Na quina de um polígono o raio acompanha o passo entre os pontos: o quadrado de 60 mm com 3 pontos
 * por lado dá 13,4 mm, com 5 dá 6,7. A dobra entre o laço da ponta e a tampa sai como 'entreLacos'. A superfície que se dobra sobre si
 * (que nenhuma espessura acompanha) dá o aviso `espessuraRecusada` com o motivo do passo. A conta não muda a gaiola; a malha com
 * `medidas` vai ao limite no passo e aqui não, e a diferença fica fora da conferência. */
import { limitesDaGaiola, nitidezDoVinco, refinarGaiola, subdividirCatmullClark } from './subdivisao.js';
import { ErroDaEspessura, espessarSuperficie } from './espessura.js';
import { inserirApoiosNosVincos } from './apoio-do-vinco.js';

/* As pontas que `aberta` deixa sem tampa, pela posição do laço: a primeira, a última ou as duas. */
const PONTAS_ABERTAS = { inicio: ['inicio'], fim: ['fim'], ambas: ['inicio', 'fim'] };
/* Níveis de subdivisão com que `espessura` confere o raio local, os do passo `subdivisao` quando ele não diz outros. */
export const NIVEIS_DA_CONFERENCIA_DA_ESPESSURA = 2;
/* O par de vértices da malha cuja direção faz com a tangente do laço um cosseno de pelo menos isto mede o canto do laço; os outros, a dobra
   entre laços (ou entre o laço da ponta e a tampa). */
const COSSENO_DO_CANTO_NO_LACO = 0.7;

/* nitidezDoVinco('viva') */
const NITIDEZ_INFINITA_DO_VINCO = nitidezDoVinco('viva');

/* Planos mais perto que isto ondulam a superfície (fatia 1 do plano do sólido por laços). */
export const DISTANCIA_MINIMA_ENTRE_PLANOS_MM = 2.5;
/* Pontos seguidos de um laço mais perto que isto viram um ponto só; é também a folga da emenda entre trechos. */
export const TOLERANCIA_DE_FUSAO_MM = 1e-3;
/* Razão entre segmentos vizinhos acima da qual sai o aviso de amostragem desigual. */
export const RAZAO_MAXIMA_DE_AMOSTRAGEM = 4;
/* Passos da compensação do ponto limite, e a menor parte da normal no plano do laço com que o ponto ainda anda: o ponto cuja
   normal fica quase no eixo (a face da tampa) não se move. */
export const PASSOS_DA_COMPENSACAO = 8;
/* A gaiola avisa a face cuja área é menos que isto da maior aresta ao quadrado. O `analisarTopologia` reprova a lasca abaixo de 0,003 na
   malha final, e a subdivisão mantém a razão da gaiola até uns 70%, de modo que o aviso fica com folga. */
export const LIMITE_DE_FACE_FINA_NA_GAIOLA = 0.005;
/* A razão mínima entre o passo dos pontos ao longo de um trecho reto e a menor distância entre laços vizinhos nele. Abaixo dela, com a
   gaiola subdividida, a dobra entre planos próximos deixa um leque de faces finas sem que a gaiola tenha uma face fina sequer. Medido na
   caçamba do carrinho de mão (lados retos, laços a 5,2 mm na dobra do fundo): razão 5,7 e 3,8 deram zero faces finas, 2,9 deu 12, 2,3
   deu 30 e 1,9 deu 68; com os laços da dobra a 7,7 mm, 3,9 e 2,6 deram zero, 1,9 deu 8 e 1,3 deu 40. */
export const RAZAO_MINIMA_DO_PASSO_PELA_DISTANCIA_ENTRE_LACOS = 3;
export const INCLINACAO_MINIMA_DA_COMPENSACAO = 0.5;
/* A compensação avisa quando leva a superfície, entre os pontos de um laço, mais que isto (em mm) além do pedido, descontado o que ela já
   passava sem compensar (A COMPENSAÇÃO). Nas peças de teste em que a compensação é a da casa o acréscimo maior é de 1,36 mm (o L de
   190 mm), e 0,21 na dobra em U, 0,8 na coluna, 0,87 e 0,49 nos tubos; no corpo de planta em polígono que ela ondulou, 11,5 mm. */
export const TOLERANCIA_DA_COMPENSACAO_MM = 2;

const EIXOS = { x: 0, y: 1, z: 2 };
const citar = (x) => `'${x}'`;
const br = (x, casas = 2) => String(Number(x.toFixed(casas))).replace('.', ',');
const MEDIDAS_EM_TODOS = 'na peça de teste do plano do sólido por laços, a cota exata nos 817 pontos da gaiola dobrou a parede de lado numa emenda de 62,6 mm e virou 302 faces';

function falha(texto) { throw new RangeError(`gaiolaPorLacos: ${texto}`); }

/* reamostrar(polilinha, n, razao) -> n pontos, as pontas nos lugares dados e os de dentro a distâncias iguais ao longo dela; com
   razao diferente de 1 os segmentos crescem em progressão geométrica, e o último mede razao vezes o primeiro */
function reamostrar(poli, n, razao = 1) {
  const s = [0];
  for (let k = 1; k < poli.length; k++) s.push(s[k - 1] + Math.hypot(poli[k][0] - poli[k - 1][0], poli[k][1] - poli[k - 1][1]));
  const total = s[s.length - 1];
  const ultimo = poli[poli.length - 1];
  if (total <= TOLERANCIA_DE_FUSAO_MM) return Array.from({ length: n }, (_, i) => [...(i === n - 1 ? ultimo : poli[0])]);
  const saida = [[...poli[0]]];
  let j = 0;
  const q = n > 2 && razao !== 1 ? razao ** (1 / (n - 2)) : 1;
  for (let i = 1; i < n - 1; i++) {
    const alvo = q === 1 ? (total * i) / (n - 1) : total * ((q ** i - 1) / (q ** (n - 1) - 1));
    while (j < s.length - 2 && s[j + 1] < alvo) j++;
    const d = s[j + 1] - s[j];
    const t = d > 0 ? (alvo - s[j]) / d : 0;
    saida.push([poli[j][0] + (poli[j + 1][0] - poli[j][0]) * t, poli[j][1] + (poli[j + 1][1] - poli[j][1]) * t]);
  }
  saida.push([...ultimo]);
  return saida;
}

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/* normal de Newell da face (não normalizada; o módulo é o dobro da área da face plana) */
function normalDaFace(f, P) {
  let nx = 0; let ny = 0; let nz = 0;
  f.forEach((v, k) => {
    const [x1, y1, z1] = P[v]; const [x2, y2, z2] = P[f[(k + 1) % f.length]];
    nx += (y1 - y2) * (z1 + z2); ny += (z1 - z2) * (x1 + x2); nz += (x1 - x2) * (y1 + y2);
  });
  return [nx, ny, nz];
}

function volumeComSinal(faces, P) {
  let v = 0;
  for (const f of faces) for (let k = 1; k + 1 < f.length; k++) {
    const a = P[f[0]]; const b = P[f[k]]; const c = P[f[k + 1]];
    v += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  }
  return v / 6;
}

/* a distância do ponto [u, v] ao contorno fechado, positiva fora dele e negativa dentro (pela paridade dos cruzamentos) */
function distanciaParaFora(contorno, p) {
  let d = Infinity; let dentro = false;
  for (let k = 0; k < contorno.length; k++) {
    const a = contorno[k]; const b = contorno[(k + 1) % contorno.length];
    const dx = b[0] - a[0]; const dy = b[1] - a[1]; const q = dx * dx + dy * dy;
    const t = q > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / q)) : 0;
    d = Math.min(d, Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t));
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < a[0] + ((p[1] - a[1]) * dx) / dy) dentro = !dentro;
  }
  return dentro ? -d : d;
}

/* A linha de cada laço na gaiola refinada um nível: entre dois pontos seguidos da volta entra o ponto de aresta que o refino pôs entre eles (o
   único vizinho dos dois), de modo que a linha tem os pontos da gaiola e os do meio de cada segmento. `cadeias` é, por laço, [{ i, trecho }];
   devolve as cadeias refinadas no mesmo formato e `limites(vertices)`, os pontos limite da gaiola de mesma topologia com esses vértices,
   refinada do mesmo modo (o refino mantém o índice dos pontos e numera os novos pela topologia). */
function linhasDosLacosRefinadas(gaiola, cadeias) {
  const refinada = refinarGaiola(gaiola);
  const viz = refinada.vertices.map(() => []);
  for (const f of refinada.faces) f.forEach((a, k) => { const b = f[(k + 1) % f.length]; viz[a].push(b); viz[b].push(a); });
  const linhas = cadeias.map((c) => c.flatMap((x, k) => {
    const y = c[(k + 1) % c.length];
    const meio = viz[x.i].find((v) => viz[y.i].includes(v));
    return meio === undefined ? [x] : [x, { i: meio, trecho: x.trecho }];
  }));
  const limites = (vertices) => limitesDaGaiola(vertices === gaiola.vertices ? refinada : refinarGaiola({ ...gaiola, vertices }));
  return { linhas, limites };
}

function lerTrechos(trechos) {
  if (!Array.isArray(trechos) || trechos.length < 2) falha('trechos precisa ser lista de pelo menos dois { nome, pontos }, na ordem da volta do laço');
  const vistos = new Set();
  for (const t of trechos) {
    if (!t || typeof t.nome !== 'string' || !t.nome) falha(`cada trecho precisa de nome, e veio ${JSON.stringify(t)}`);
    if (vistos.has(t.nome)) falha(`o trecho ${citar(t.nome)} aparece duas vezes em trechos`);
    vistos.add(t.nome);
    if (!Number.isInteger(t.pontos) || t.pontos < 2) falha(`o trecho ${citar(t.nome)} pede ${JSON.stringify(t.pontos)} pontos; são as duas pontas e os de dentro, inteiro de 2 para cima`);
    for (const campo of ['razao', 'some']) {
      if (t[campo] != null && !(Number.isFinite(t[campo]) && t[campo] > 0)) falha(`o trecho ${citar(t.nome)} traz ${campo} ${JSON.stringify(t[campo])}; ${campo === 'razao' ? 'razao é quanto o último segmento mede do primeiro, número maior que zero (1 é passo igual)' : 'some é o comprimento em mm abaixo do qual o trecho vira um ponto no laço, número maior que zero'}`);
    }
  }
  return trechos.map((t) => ({ nome: t.nome, pontos: t.pontos, razao: t.razao ?? 1, some: t.some ?? 0, ...(t.encolhe != null ? { encolhe: lerFaixaQueSome(t.encolhe, `o trecho ${citar(t.nome)}`, 'encolhe') } : {}) }));
}

const CURVAS_DA_FAIXA = ['linear', 'entrada'];

/* { de, ate, curva? } de `encolhe` e de `esvai`: dois laços, em nome ou 'primeiro' e 'ultimo', e como o peso vai de 0 a 1 entre eles */
function lerFaixaQueSome(f, onde, campo) {
  if (f == null || typeof f !== 'object' || Array.isArray(f)) falha(`${onde} traz ${campo} ${JSON.stringify(f)}; ${campo} é { de, ate }, os dois laços entre os quais ${campo === 'encolhe' ? 'o trecho vai de inteiro a um ponto' : 'a nitidez do vinco cai a zero'}`);
  for (const k of ['de', 'ate']) if (typeof f[k] !== 'string' || !f[k]) falha(`${onde} traz ${campo} sem ${k}; ${k} é o nome do laço (ou 'primeiro' e 'ultimo') ${k === 'de' ? 'onde a faixa começa, ainda inteira' : 'onde ela acaba, com o efeito completo'}`);
  if (f.curva != null && !CURVAS_DA_FAIXA.includes(f.curva)) falha(`${onde} traz ${campo} com curva ${JSON.stringify(f.curva)}; curva é ${CURVAS_DA_FAIXA.map(citar).join(' ou ')} (linear: o peso cresce igual com a posição; entrada: parte parado, para a faixa não começar de repente, e chega com a inclinação média da linear)`);
  return { de: f.de, ate: f.ate, curva: f.curva ?? 'linear' };
}

/* o peso de 0 (em `de`) a 1 (em `ate`) de um laço na faixa, pela posição em mm no eixo */
const pesoNaFaixa = (em, emDe, emAte, curva) => {
  const t = Math.min(1, Math.max(0, (em - emDe) / (emAte - emDe)));
  return curva === 'entrada' ? t * t * (2 - t) : t;
};

const comprimentoDe = (poli) => poli.slice(1).reduce((t, p, k) => t + Math.hypot(p[0] - poli[k][0], p[1] - poli[k][1]), 0);

/* o ponto a meio caminho, pelo comprimento, de uma polilinha */
function pontoAoMeio(poli) {
  let falta = comprimentoDe(poli) / 2;
  for (let k = 1; k < poli.length; k++) {
    const d = Math.hypot(poli[k][0] - poli[k - 1][0], poli[k][1] - poli[k - 1][1]);
    if (falta <= d && d > 0) { const t = falta / d; return [poli[k - 1][0] + (poli[k][0] - poli[k - 1][0]) * t, poli[k - 1][1] + (poli[k][1] - poli[k - 1][1]) * t]; }
    falta -= d;
  }
  return [...poli[poli.length - 1]];
}

/* O trecho com `some` que mede menos que isso no laço vira um ponto, o do meio dele, e os trechos vizinhos acabam e começam nesse
   ponto; assim o trecho que some e volta entre planos não deixa um leque de triângulos finos. Devolve as polilinhas e os trechos
   que sumiram. */
function fundirCurtos(polilinhas, trechos) {
  const n = polilinhas.length;
  const saida = polilinhas.map((p) => p.map((q) => [...q]));
  const sumiu = [];
  trechos.forEach((t, i) => {
    /* o trecho sem comprimento já é um ponto (os pontos dele se fundem adiante) e não conta como sumido */
    const comprimento = comprimentoDe(saida[i]);
    if (!t.some || saida[i].length < 2 || comprimento <= TOLERANCIA_DE_FUSAO_MM || comprimento >= t.some) return;
    const m = pontoAoMeio(saida[i]);
    saida[i] = [m];
    const ant = saida[(i + n - 1) % n]; ant[ant.length - 1] = [...m];
    const prox = saida[(i + 1) % n]; prox[0] = [...m];
    sumiu.push(t.nome);
  });
  return { polilinhas: saida, sumiu };
}

/* a faixa de laços de cada trecho com `encolhe`, em posição de laço: [{ de, ate, curva }] ou null, na ordem dos trechos */
function faixasDeEncolhimento(trechos, nomesDosLacos) {
  const laco = (nome, onde) => {
    if (nome === 'primeiro') return 0;
    if (nome === 'ultimo') return nomesDosLacos.length - 1;
    const r = nomesDosLacos.indexOf(nome);
    if (r < 0) falha(`${onde} cita o laço ${citar(nome)}, que não existe`);
    return r;
  };
  return trechos.map((t) => {
    if (!t.encolhe) return null;
    const onde = `o trecho ${citar(t.nome)}, em encolhe`;
    const de = laco(t.encolhe.de, onde); const ate = laco(t.encolhe.ate, onde);
    if (de >= ate) falha(`${onde}, vai do laço ${citar(nomesDosLacos[de])} ao ${citar(nomesDosLacos[ate])}, e o primeiro precisa vir antes do segundo`);
    return { de, ate, curva: t.encolhe.curva };
  });
}

/* o ponto da polilinha mais perto de `p`: { k, t, ponto, d }, o segmento k (de k a k+1), a fração t nele, o ponto e a distância */
function maisPertoNaPolilinha(poli, p) {
  let melhor = null;
  for (let k = 0; k + 1 < poli.length; k++) {
    const dx = poli[k + 1][0] - poli[k][0]; const dy = poli[k + 1][1] - poli[k][1];
    const q = dx * dx + dy * dy;
    const t = q > 0 ? Math.min(1, Math.max(0, ((p[0] - poli[k][0]) * dx + (p[1] - poli[k][1]) * dy) / q)) : 0;
    const ponto = [poli[k][0] + dx * t, poli[k][1] + dy * t];
    const d = Math.hypot(p[0] - ponto[0], p[1] - ponto[1]);
    if (!melhor || d < melhor.d) melhor = { k, t, ponto, d };
  }
  return melhor;
}

/* a posição, pelo comprimento desde o começo, do ponto { k, t } da polilinha, e o ponto a `s` mm do começo com o índice do segmento */
const posicaoNaPolilinha = (poli, { k, t }) => comprimentoDe(poli.slice(0, k + 1)) + t * Math.hypot(poli[k + 1][0] - poli[k][0], poli[k + 1][1] - poli[k][1]);
function pontoEm(poli, s) {
  let falta = s;
  for (let k = 0; k + 1 < poli.length; k++) {
    const d = Math.hypot(poli[k + 1][0] - poli[k][0], poli[k + 1][1] - poli[k][1]);
    if (falta <= d || k + 2 === poli.length) { const t = d > 0 ? Math.min(1, falta / d) : 0; return { k, t, ponto: [poli[k][0] + (poli[k + 1][0] - poli[k][0]) * t, poli[k][1] + (poli[k + 1][1] - poli[k][1]) * t] }; }
    falta -= d;
  }
  return { k: 0, t: 0, ponto: [...poli[0]] };
}

/* o ângulo da tangente da polilinha a `s` mm do começo, interpolado entre o dos segmentos vizinhos (o do segmento muda de repente no vértice) */
function anguloEm(poli, s) {
  const seg = []; let c = 0;
  for (let k = 0; k + 1 < poli.length; k++) {
    const dx = poli[k + 1][0] - poli[k][0]; const dy = poli[k + 1][1] - poli[k][1];
    const d = Math.hypot(dx, dy);
    seg.push({ de: c, ate: c + d, ang: Math.atan2(dy, dx) }); c += d;
  }
  let k = seg.findIndex((x) => s <= x.ate); if (k < 0) k = seg.length - 1;
  const meio = (x) => (x.de + x.ate) / 2;
  const entre = (a, b) => { let d = b.ang - a.ang; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; const t = (s - meio(a)) / (meio(b) - meio(a) || 1); return a.ang + d * Math.min(1, Math.max(0, t)); };
  if (s < meio(seg[k]) && k > 0) return entre(seg[k - 1], seg[k]);
  if (s >= meio(seg[k]) && k + 1 < seg.length) return entre(seg[k], seg[k + 1]);
  return seg[k].ang;
}

/* Distância (mm) até a qual o ponto onde o trecho que encolhe toca o vizinho conta como estando sobre a polilinha dele. */
const ENCAIXE_NO_VIZINHO_MM = 0.05;

/* O trecho com `encolhe: { de, ate }` vai de inteiro, no laço `de`, a um ponto, no laço `ate`: nos laços entre os dois, cada ponto da polilinha
   que a receita deu anda em linha reta até o ponto que o trecho tem no laço `ate`, com o peso da posição do laço na faixa, de modo que os
   pontos do trecho (reamostrados por igual) se aproximam por igual e se fundem no laço final, sem leque de faces finas. O trecho tem de
   medir zero no laço `ate`, e os trechos seguidos que encolhem usam o mesmo ponto lá. Os laços fora da faixa ficam como a receita deu.
   Os trechos vizinhos que não encolhem acabam e começam nas pontas do trecho que encolhe, como no `some`: só o ponto da ponta deles troca.
   Se a polilinha do vizinho passa do ponto onde o trecho o toca (o arco do círculo que, nos laços da faixa, segue até o ponto final), a
   ponta do trecho anda sobre essa curva, e não pela corda: o encontro está a `peso` do caminho, pelo comprimento, entre o ponto onde o
   trecho o toca e o fim da polilinha, o vizinho é cortado nele, e o desvio que isso dá à ponta se espalha pelo trecho, de modo que a
   superfície do vizinho fica na forma dele. */
function encolherTrechos(lidos, trechos, e, faixas) {
  if (!faixas.some(Boolean)) return;
  const n = trechos.length;
  const ondeAcaba = (r) => `${citar(lidos[r].nome)} (${e} = ${br(lidos[r].em)} mm)`;
  faixas.forEach((f, i) => {
    if (!f) return;
    const medida = comprimentoDe(lidos[f.ate].polilinhas[i]);
    if (medida > TOLERANCIA_DE_FUSAO_MM) falha(`o trecho ${citar(trechos[i].nome)}, em encolhe, mede ${br(medida, 3)} mm no laço ${ondeAcaba(f.ate)}, onde a faixa acaba; nele o trecho precisa ser um ponto (a polilinha de um ponto só, ou de pontos que coincidem) para os pontos se fundirem, e os trechos vizinhos acabam e começam nesse ponto`);
  });
  const alvos = faixas.map((f, i) => (f ? lidos[f.ate].polilinhas[i][0] : null));
  lidos.forEach((l, r) => {
    const pesos = faixas.map((f) => (f && r >= f.de && r <= f.ate ? pesoNaFaixa(l.em, lidos[f.de].em, lidos[f.ate].em, f.curva) : null));
    const cruas = l.polilinhas;
    const novas = cruas.map((poli, i) => (pesos[i] === null ? null : poli.map(([u, v]) => [u + (alvos[i][0] - u) * pesos[i], v + (alvos[i][1] - v) * pesos[i]])));
    const saida = cruas.map((poli, i) => novas[i] ?? poli);
    /* o vizinho j da cadeia de trechos que encolhem (de a até b) passa do ponto onde ela o toca? Então a cadeia o segue (guia); senão, só
       a ponta do vizinho troca. `i` é o trecho da ponta que toca j. */
    const guiaDe = (i, j, antes) => {
      const cru = cruas[j]; const iCru = cruas[i];
      if (cru.length < 2) return null;
      const toque = antes ? iCru[0] : iCru[iCru.length - 1];
      const encontro = antes ? cru[cru.length - 1] : cru[0];
      if (Math.hypot(encontro[0] - toque[0], encontro[1] - toque[1]) <= TOLERANCIA_DE_FUSAO_MM) return null;
      const perto = maisPertoNaPolilinha(cru, toque);
      if (perto.d > ENCAIXE_NO_VIZINHO_MM) falha(`no laço ${citar(l.nome)} (${e} = ${br(l.em)} mm), o trecho ${citar(trechos[j].nome)} passa do ponto onde o ${citar(trechos[i].nome)}, que encolhe, o toca, mas o ponto fica a ${br(perto.d, 3)} mm dele; o vizinho que passa da ponta segue a curva em que a ponta está`);
      const s0 = posicaoNaPolilinha(cru, perto); const alvo = antes ? comprimentoDe(cru) : 0;
      return { cru, antes, corte: pontoEm(cru, alvo - (alvo - s0) * (1 - pesos[i])) };
    };
    /* o ponto `p` levado pelo peso `w` ao longo da curva do guia até o ponto final dele (o fim da polilinha se ela vem antes do trecho, o
       começo se vem depois): o ponto da curva mais perto anda pelo comprimento, e a distância dele à curva, girada com a tangente, encolhe
       com (1 - w), de modo que o ponto fica à mesma altura sobre a curva em vez de cortar a corda */
    const seguir = ({ cru, antes }, p, w) => {
      const perto = maisPertoNaPolilinha(cru, p);
      const s0 = posicaoNaPolilinha(cru, perto); const total = comprimentoDe(cru);
      const alvo = antes ? total : 0;
      const sJ = alvo - (alvo - s0) * (1 - w);
      const J = pontoEm(cru, sJ);
      const giro = anguloEm(cru, sJ) - anguloEm(cru, s0);
      const dx = p[0] - perto.ponto[0]; const dy = p[1] - perto.ponto[1];
      const c = Math.cos(giro); const sn = Math.sin(giro);
      return [J.ponto[0] + (dx * c - dy * sn) * (1 - w), J.ponto[1] + (dx * sn + dy * c) * (1 - w)];
    };
    /* a cadeia de trechos seguidos que encolhem: o primeiro e o último dela tocam os vizinhos que não encolhem */
    const comeco = (i) => { let a = i; while (novas[(a + n - 1) % n] && (a + n - 1) % n !== i) a = (a + n - 1) % n; return a; };
    const fimDe = (i) => { let b = i; while (novas[(b + 1) % n] && (b + 1) % n !== i) b = (b + 1) % n; return b; };
    const guias = new Map();
    novas.forEach((poli, i) => {
      if (!poli) return;
      const a0 = comeco(i); const b0 = fimDe(i);
      if (!guias.has(a0)) guias.set(a0, { a: novas[(a0 + n - 1) % n] ? null : guiaDe(a0, (a0 + n - 1) % n, true), b: novas[(b0 + 1) % n] ? null : guiaDe(b0, (b0 + 1) % n, false) });
      const { a: gA, b: gB } = guias.get(a0);
      if (gA || gB) {
        /* com os dois guias, cada ponto fica com o do lado mais perto, pelo inverso do quadrado da distância à curva de cada um */
        saida[i] = cruas[i].map((q, k) => {
          const pa = gA ? seguir(gA, q, pesos[i]) : novas[i][k];
          const pb = gB ? seguir(gB, q, pesos[i]) : novas[i][k];
          if (!gA || !gB) return gA ? pa : pb;
          const da = maisPertoNaPolilinha(gA.cru, q).d; const db = maisPertoNaPolilinha(gB.cru, q).d;
          const wa = (1 / (da * da + 1e-12)) / (1 / (da * da + 1e-12) + 1 / (db * db + 1e-12));
          return [pa[0] * wa + pb[0] * (1 - wa), pa[1] * wa + pb[1] * (1 - wa)];
        });
      }
    });
    novas.forEach((poli, i) => {
      if (!poli) return;
      const ant = (i + n - 1) % n; const prox = (i + 1) % n;
      const { a: gA, b: gB } = guias.get(comeco(i));
      /* cada vizinho acaba (ou começa) onde o trecho começa (ou acaba) */
      for (const [j, antes, g] of [[ant, true, comeco(i) === i ? gA : null], [prox, false, fimDe(i) === i ? gB : null]]) {
        if (novas[j]) continue;
        const ponta = saida[i][antes ? 0 : saida[i].length - 1];
        const v = g ? (antes ? [...g.cru.slice(0, g.corte.k + 1).map((q) => [...q]), [...ponta]] : [[...ponta], ...g.cru.slice(g.corte.k + 1).map((q) => [...q])]) : [...saida[j]];
        if (!g) { if (antes) v[v.length - 1] = [...ponta]; else v[0] = [...ponta]; }
        saida[j] = v;
      }
    });
    l.polilinhas = saida;
    l.polilinhas.forEach((poli, i) => {
      const ant = l.polilinhas[(i + n - 1) % n];
      const fim = ant[ant.length - 1];
      const d = Math.hypot(poli[0][0] - fim[0], poli[0][1] - fim[1]);
      if (d > TOLERANCIA_DE_FUSAO_MM) falha(`no laço ${citar(l.nome)} (${e} = ${br(l.em)} mm), depois de encolher, o trecho ${citar(trechos[i].nome)} começa a ${br(d, 3)} mm de onde o ${citar(trechos[(i + n - 1) % n].nome)} acaba; trechos seguidos que encolhem usam a mesma faixa, de e ate, e o mesmo ponto no laço final`);
    });
  });
}

function lerLacos(lacos, trechos, e, fechados = new Set()) {
  if (!Array.isArray(lacos) || lacos.length < 2) falha('lacos precisa ser lista de pelo menos dois laços { em, trechos }');
  const nomes = new Set();
  const faixas = faixasDeEncolhimento(trechos, lacos.map((l, r) => l?.nome ?? `l${r}`));
  /* no laço da faixa de um trecho que encolhe, o vizinho dele pode passar da ponta, e a ponta se confere depois de encolher */
  const encolhendo = (i, r) => { const f = faixas[(i + trechos.length) % trechos.length]; return !!f && r >= f.de && r <= f.ate; };
  const lidos = lacos.map((l, r) => {
    const nome = l?.nome ?? `l${r}`;
    if (nomes.has(nome)) falha(`o laço ${citar(nome)} aparece duas vezes`);
    nomes.add(nome);
    if (!Number.isFinite(l?.em)) falha(`o laço ${citar(nome)} precisa de em, a posição em mm no eixo ${e}`);
    const dados = l.trechos ?? {};
    const extra = Object.keys(dados).filter((k) => !trechos.some((t) => t.nome === k));
    if (extra.length) falha(`o laço ${citar(nome)} traz o trecho ${citar(extra[0])}, que não está em trechos`);
    const pontos = trechos.map((t, i) => {
      const poli = dados[t.nome];
      if (!Array.isArray(poli) || !poli.length || poli.some((p) => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) {
        falha(`o laço ${citar(nome)} precisa do trecho ${citar(t.nome)} como polilinha [[u, v], ...] de números`);
      }
      return { poli, i };
    });
    pontos.forEach(({ poli, i }) => {
      if (encolhendo(i, r) || encolhendo(i - 1, r)) return;
      const ant = pontos[(i + trechos.length - 1) % trechos.length].poli;
      const fim = ant[ant.length - 1];
      const d = Math.hypot(poli[0][0] - fim[0], poli[0][1] - fim[1]);
      if (d > TOLERANCIA_DE_FUSAO_MM) falha(`no laço ${citar(nome)}, o trecho ${citar(trechos[i].nome)} começa em [${poli[0].map((x) => br(x, 3)).join('; ')}] e o ${citar(trechos[(i + trechos.length - 1) % trechos.length].nome)} acaba em [${fim.map((x) => br(x, 3)).join('; ')}], a ${br(d, 3)} mm; cada trecho começa onde o anterior acaba`);
    });
    return { nome, em: l.em, polilinhas: pontos.map((p) => p.poli) };
  });
  const perto = [];
  for (let r = 1; r < lidos.length; r++) {
    const a = lidos[r - 1]; const b = lidos[r];
    const d = b.em - a.em;
    if (!(d > 0)) falha(`os laços vêm em ordem crescente de em, e ${citar(b.nome)} (${e} = ${br(b.em)} mm) vem depois de ${citar(a.nome)} (${e} = ${br(a.em)} mm)`);
    /* a faixa entre dois planos, cada um com vinco vivo na volta inteira, não ondula: o vinco a isola dos vizinhos (o chanfro estreito) */
    if (d < DISTANCIA_MINIMA_ENTRE_PLANOS_MM && !(fechados.has(a.nome) && fechados.has(b.nome))) perto.push({ a, b, d });
  }
  if (perto.length) {
    /* o par mais perto, e o primeiro dele em caso de empate */
    const { a, b, d } = perto.reduce((x, y) => (y.d < x.d ? y : x));
    const outros = perto.length > 1 ? `, e mais ${perto.length - 1} ${perto.length === 2 ? 'par fica' : 'pares ficam'} abaixo do mínimo` : '';
    falha(`os laços ${citar(a.nome)} (${e} = ${br(a.em)} mm) e ${citar(b.nome)} (${e} = ${br(b.em)} mm) ficam a ${br(d)} mm um do outro, abaixo do mínimo de ${br(DISTANCIA_MINIMA_ENTRE_PLANOS_MM)} mm${outros}: planos tão perto ondulam a superfície (na peça de teste do plano, a 0,12 mm, uma falha de 5,16 mm); tire um dos dois, afaste-os, ou, se for um chanfro estreito, ponha nos dois planos um vinco 'viva' de laço inteiro (vincos: [{ nome, laco, nitidez: 'viva' }], sem trechos), que isola a faixa dos vizinhos e a libera do mínimo`);
  }
  encolherTrechos(lidos, trechos, e, faixas);
  for (const l of lidos) {
    const { polilinhas, sumiu } = fundirCurtos(l.polilinhas, trechos);
    l.polilinhas = polilinhas; l.sumiu = sumiu;
  }
  return lidos;
}

/**
 * gaiolaPorLacos({ nome, eixo, trechos, lacos, tampa, vincos?, cantos?, medidas?, compensar? })
 *   -> { pontos, pontosMm, alvosMm, passo, nomeDe, lacos, trechos, avisos, compensacao? }
 */
export function gaiolaPorLacos(o = {}) {
  const prefixo = o.nome ?? 'laco';
  if (typeof prefixo !== 'string' || !prefixo) falha('nome é o prefixo dos pontos, texto não vazio');
  if (!(o.eixo in EIXOS)) falha(`eixo é 'x', 'y' ou 'z', e veio ${JSON.stringify(o.eixo)}`);
  const e = EIXOS[o.eixo];
  const outros = [0, 1, 2].filter((k) => k !== e);
  const trechos = lerTrechos(o.trechos);
  /* os laços com vinco vivo na volta inteira: a faixa entre dois deles pode ser mais estreita que o mínimo entre planos */
  const nomesDosLacos = Array.isArray(o.lacos) ? o.lacos.map((l, r) => l?.nome ?? `l${r}`) : [];
  const fechados = new Set();
  for (const v of Array.isArray(o.vincos) ? o.vincos : []) {
    if (!v || v.laco == null || v.trechos != null || !(v.nitidez === 'viva' || v.nitidez === 1)) continue;
    fechados.add(v.laco === 'primeiro' ? nomesDosLacos[0] : v.laco === 'ultimo' ? nomesDosLacos[nomesDosLacos.length - 1] : v.laco);
  }
  const lacos = lerLacos(o.lacos, trechos, o.eixo, fechados);
  const iTrecho = new Map(trechos.map((t, i) => [t.nome, i]));
  const exigeTrecho = (t, onde) => { if (!iTrecho.has(t)) falha(`${onde} cita o trecho ${citar(t)}, que não está em trechos (${trechos.map((x) => x.nome).join(', ')})`); return iTrecho.get(t); };

  /* a volta do laço: os pontos de cada trecho menos o último, que é o primeiro do seguinte */
  const inicio = []; let N = 0;
  for (const t of trechos) { inicio.push(N); N += t.pontos - 1; }
  const fimDe = (i) => inicio[(i + 1) % trechos.length];
  const R = lacos.length;
  const iLaco = new Map(lacos.map((l, r) => [l.nome, r]));
  const lacoDe = (x, onde) => {
    if (x === 'primeiro') return 0;
    if (x === 'ultimo') return R - 1;
    if (!iLaco.has(x)) falha(`${onde} cita o laço ${citar(x)}, que não existe`);
    return iLaco.get(x);
  };

  const nomeCru = (r, q) => {
    let i = trechos.length - 1;
    while (inicio[i] > q) i--;
    return `${prefixo}_${lacos[r].nome}_${trechos[i].nome}${q - inicio[i]}`;
  };
  /* posições [u, v] de cada laço, reamostradas */
  const uv = lacos.map((l) => {
    const volta = [];
    trechos.forEach((t, i) => { reamostrar(l.polilinhas[i], t.pontos, t.razao).slice(0, -1).forEach((p) => volta.push(p)); });
    return volta;
  });
  /* fusão: cada corrida de pontos seguidos na volta que coincidem vira um ponto só, o de menor posição da corrida */
  /* o laço de ponta de área zero (uma linha, uma cruz de linhas, um ponto) é uma lâmina: os pontos que coincidem se fundem, todos, e
     as tiras dos dois lados dela se casam sem tampa; a escada ligaria pontos que coincidem e daria faces de área zero */
  const medeAreaZero = (volta) => {
    let area = 0; let perimetro = 0;
    volta.forEach((p, k) => { const b = volta[(k + 1) % N]; area += (p[0] * b[1] - b[0] * p[1]) / 2; perimetro += Math.hypot(b[0] - p[0], b[1] - p[1]); });
    return Math.abs(area) <= TOLERANCIA_DE_FUSAO_MM * Math.max(perimetro, 1);
  };
  const lamina = uv.map((volta, r) => (r === 0 || r === R - 1) && medeAreaZero(volta));
  /* as pontas sem tampa: a boca da casca, cujo laço fica como borda livre da gaiola */
  if (o.aberta != null && !(o.aberta in PONTAS_ABERTAS)) falha(`aberta é ${Object.keys(PONTAS_ABERTAS).map(citar).join(', ')}, a ponta que fica sem tampa (a boca de uma casca), e veio ${JSON.stringify(o.aberta)}; sem aberta as duas pontas são tampadas`);
  const abertos = new Set((o.aberta == null ? [] : PONTAS_ABERTAS[o.aberta]).map((p) => (p === 'inicio' ? 0 : R - 1)));
  for (const r of abertos) if (lamina[r]) falha(`aberta deixa sem tampa o laço ${citar(lacos[r].nome)} (${o.eixo} = ${br(lacos[r].em)} mm), mas ele tem área zero (uma lâmina, um ponto) e não tem boca; abra a outra ponta ou dê área ao laço`);
  const rep = uv.map((volta, r) => {
    if (lamina[r]) {
      const donos = []; const dono = new Array(N);
      volta.forEach((p, q) => {
        const j = donos.find((k) => Math.hypot(p[0] - volta[k][0], p[1] - volta[k][1]) <= TOLERANCIA_DE_FUSAO_MM);
        if (j === undefined) donos.push(q);
        dono[q] = j ?? q;
      });
      return dono;
    }
    const liga = volta.map((p, q) => { const b = volta[(q + 1) % N]; return Math.hypot(p[0] - b[0], p[1] - b[1]) <= TOLERANCIA_DE_FUSAO_MM; });
    if (liga.every(Boolean)) return volta.map(() => 0);
    const dono = new Array(N);
    let partida = 0;
    while (liga[(partida + N - 1) % N]) partida++;
    let corrida = [];
    for (let s = 0; s <= N; s++) {
      const q = (partida + s) % N;
      if (s > 0 && (s === N || !liga[(q + N - 1) % N])) { const menor = Math.min(...corrida); for (const c of corrida) dono[c] = menor; corrida = []; }
      if (s < N) corrida.push(q);
    }
    return dono;
  });
  /* a costura: os pontos de dois trechos que coincidem num laço se fundem, mesmo que os trechos não sejam vizinhos na volta */
  const costuras = [];
  if (o.une != null) {
    if (!Array.isArray(o.une) || !o.une.length) falha('une precisa ser lista não vazia de pares [trechoA, trechoB]');
    o.une.forEach((par, k) => {
      const onde = `une[${k}]`;
      if (!Array.isArray(par) || par.length !== 2 || par[0] === par[1]) falha(`${onde} precisa ser um par de dois trechos diferentes [trechoA, trechoB], e veio ${JSON.stringify(par)}`);
      const [a, b] = par.map((t) => exigeTrecho(t, onde));
      const doTrecho = (i) => { const qs = []; for (let q = inicio[i]; ; q = (q + 1) % N) { qs.push(q); if (q === fimDe(i)) break; } return qs; };
      const qa = doTrecho(a); const qb = doTrecho(b);
      let uniu = 0;
      uv.forEach((volta, r) => {
        const raiz = (x) => { while (rep[r][x] !== x) x = rep[r][x]; return x; };
        for (const x of qa) for (const y of qb) {
          if (Math.hypot(volta[x][0] - volta[y][0], volta[x][1] - volta[y][1]) > TOLERANCIA_DE_FUSAO_MM) continue;
          const ra = raiz(x); const rb = raiz(y);
          uniu++;
          if (ra !== rb) rep[r][Math.max(ra, rb)] = Math.min(ra, rb);
        }
        for (let q = 0; q < N; q++) rep[r][q] = raiz(q);
      });
      if (!uniu) falha(`${onde} une os trechos ${citar(par[0])} e ${citar(par[1])}, mas nenhum ponto de um coincide com um do outro em laço algum (a ${TOLERANCIA_DE_FUSAO_MM} mm); a costura funde pontos que já estão no mesmo lugar, então confira as polilinhas dos dois`);
      costuras.push([par[0], par[1]]);
    });
  }
  const nm = (r, q) => nomeCru(r, rep[r][((q % N) + N) % N]);

  const pontosMm = {};
  lacos.forEach((l, r) => uv[r].forEach((p, q) => {
    if (rep[r][q] !== q) return;
    const x = [0, 0, 0]; x[e] = l.em; x[outros[0]] = p[0]; x[outros[1]] = p[1];
    pontosMm[nomeCru(r, q)] = x;
  }));
  let nomes = Object.keys(pontosMm);
  let indice = new Map(nomes.map((n, k) => [n, k]));

  const limpa = (f) => {
    const g = f.filter((v, k) => v !== f[(k + 1) % f.length]);
    return g.length >= 3 && new Set(g).size === g.length ? g : null;
  };
  const faces = [];
  for (let r = 0; r + 1 < R; r++) {
    for (let q = 0; q < N; q++) {
      const f = limpa([nm(r, q), nm(r, q + 1), nm(r + 1, q + 1), nm(r + 1, q)]);
      if (f) faces.push(f);
    }
  }

  /* a tampa: escada entre as cadeias A (do fim de `de` para a frente) e B (do começo de `de` para trás); com as duas pontas abertas, nenhuma */
  const tampas = abertos.size === 2 ? [] : tampasDasPontas();
  function tampasDasPontas() {
    if (o.tampa == null || typeof o.tampa !== 'object') falha('tampa precisa ser { de, ate }, os trechos de onde parte e aonde chega a escada que tampa as pontas');
    const iDe = exigeTrecho(o.tampa.de, 'tampa.de');
    const iAte = exigeTrecho(o.tampa.ate, 'tampa.ate');
    if (iDe === iAte) falha('tampa.de e tampa.ate precisam ser trechos diferentes');
    const A = []; for (let q = fimDe(iDe); ; q = (q + 1) % N) { A.push(q); if (q === inicio[iAte]) break; }
    const B = []; for (let q = inicio[iDe]; ; q = (q + N - 1) % N) { B.push(q); if (q === fimDe(iAte)) break; }
    if (A.length !== B.length) {
      const lado = (de, ate, passo) => { const l = []; for (let i = de; ; i = (i + passo + trechos.length) % trechos.length) { l.push(trechos[i].nome); if (i === ate) break; } return l; };
      falha(`a tampa liga a cadeia ${lado((iDe + 1) % trechos.length, (iAte + trechos.length - 1) % trechos.length, 1).join('+')} (${A.length} pontos) à ${lado((iDe + trechos.length - 1) % trechos.length, (iAte + 1) % trechos.length, -1).join('+')} (${B.length} pontos); a escada pede o mesmo número de pontos nas duas, então mude os pontos de um trecho`);
    }
    if (A.length < 2) falha('a tampa precisa de pelo menos um degrau entre tampa.de e tampa.ate');
    const n = A.length;
    const tampa = (r) => {
      if (lamina[r]) return [];
      const fs = [];
      const de = []; for (let q = inicio[iDe]; ; q = (q + 1) % N) { de.push(nm(r, q)); if (q === fimDe(iDe)) break; }
      const ate = []; for (let q = inicio[iAte]; ; q = (q + 1) % N) { ate.push(nm(r, q)); if (q === fimDe(iAte)) break; }
      /* o trecho `ate` com vários pontos alinhados: a face que o fecharia sozinha teria área zero, então os pontos entram na última
         face da escada, entre o degrau e a ponta, como os de `de` entram na primeira */
      const reta = ate.length > 2 && Math.hypot(...normalDaFace(ate, pontosMm)) / 2 <= TOLERANCIA_DE_FUSAO_MM * Math.max(...ate.map((v) => Math.hypot(...sub3(pontosMm[v], pontosMm[ate[0]]))), 1);
      fs.push([...de, ...(reta && n === 2 ? ate : [nm(r, A[1]), nm(r, B[1])])]);
      for (let j = 1; j + 1 < n; j++) fs.push([nm(r, A[j]), ...(j + 1 === n - 1 && reta ? ate : [nm(r, A[j + 1]), nm(r, B[j + 1])]), nm(r, B[j])]);
      if (ate.length > 2 && !reta) fs.push(ate);
      return fs.map(limpa).filter(Boolean);
    };
    return [0, R - 1].filter((r) => !abertos.has(r)).map((r) => ({ r, faces: tampa(r) }));
  }
  const areaNula = (f) => {
    const [nx, ny, nz] = normalDaFace(f, pontosMm);
    const maior = Math.max(...f.map((v, k) => Math.hypot(...sub3(pontosMm[v], pontosMm[f[(k + 1) % f.length]]))));
    return Math.hypot(nx, ny, nz) / 2 <= TOLERANCIA_DE_FUSAO_MM * Math.max(maior, 1);
  };
  /* o trecho a que cada ponto da volta do laço r pertence (o ponto fundido fica com o trecho do menor índice) */
  const trechoDoPonto = (r, nome) => {
    for (let q = 0; q < N; q++) {
      if (nomeCru(r, rep[r][q]) !== nome) continue;
      let i = trechos.length - 1; while (inicio[i] > rep[r][q]) i--;
      return trechos[i].nome;
    }
    return null;
  };
  /* A TAMPA DO LAÇO CÔNCAVO. Quando a escada põe um degrau sobre a reta do vizinho (a cruz, o T, o trecho coincidente), a tampa é a triangulação
     do contorno do laço por orelhas, na ordem da volta: a mesma orientação da escada, sem exigir cadeias iguais nem laço convexo. Fica recusado o
     contorno em que o mesmo ponto passa duas vezes (um laço que se toca) ou em que nenhuma orelha cabe, com os trechos a reamostrar. */
  const porOrelhas = (r) => {
    const nomesDaVolta = []; for (let q = 0; q < N; q++) { const n = nm(r, q); if (n !== nomesDaVolta[nomesDaVolta.length - 1]) nomesDaVolta.push(n); }
    if (nomesDaVolta.length > 1 && nomesDaVolta[0] === nomesDaVolta[nomesDaVolta.length - 1]) nomesDaVolta.pop();
    if (new Set(nomesDaVolta).size !== nomesDaVolta.length) return { repetido: nomesDaVolta.find((n, k) => nomesDaVolta.indexOf(n) !== k) };
    const pt = (n) => [pontosMm[n][outros[0]], pontosMm[n][outros[1]]];
    let area2 = 0; nomesDaVolta.forEach((n, k) => { const a = pt(n); const b = pt(nomesDaVolta[(k + 1) % nomesDaVolta.length]); area2 += a[0] * b[1] - b[0] * a[1]; });
    const sinal = Math.sign(area2) || 1;
    const folga = TOLERANCIA_DE_FUSAO_MM * 10;
    const cruz = (a, b, c) => ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) * sinal;
    const dentro = (p, a, b, c) => cruz(a, b, p) >= -folga && cruz(b, c, p) >= -folga && cruz(c, a, p) >= -folga;
    const resto = [...nomesDaVolta]; const tri = [];
    while (resto.length > 3) {
      let achou = -1;
      for (let i = 0; i < resto.length && achou < 0; i++) {
        const a = pt(resto[(i + resto.length - 1) % resto.length]); const b = pt(resto[i]); const c = pt(resto[(i + 1) % resto.length]);
        if (cruz(a, b, c) <= folga) continue;
        if (resto.some((n, k) => k !== i && k !== (i + 1) % resto.length && k !== (i + resto.length - 1) % resto.length && dentro(pt(n), a, b, c))) continue;
        achou = i;
      }
      if (achou < 0) return { preso: resto };
      tri.push([resto[(achou + resto.length - 1) % resto.length], resto[achou], resto[(achou + 1) % resto.length]]);
      resto.splice(achou, 1);
    }
    tri.push([...resto]);
    return { faces: tri.filter((f) => !areaNula(f)) };
  };
  for (const t of tampas) {
    const { r, faces: fs } = t;
    /* a escada liga o ponto j de uma cadeia ao ponto j da outra; num laço côncavo (em cruz, em T) um degrau pode cair sobre a reta do vizinho */
    const nulas = fs.filter(areaNula);
    if (!nulas.length) continue;
    const alt = porOrelhas(r);
    if (alt.faces) { t.faces = alt.faces; continue; }
    const onde = `a tampa do laço ${citar(lacos[r].nome)} (${o.eixo} = ${br(lacos[r].em)} mm)`;
    if (alt.repetido) {
      const tr = trechoDoPonto(r, alt.repetido);
      falha(`${onde} não tem triangulação: o ponto ${citar(alt.repetido)}${tr ? ` (do trecho ${citar(tr)})` : ''} aparece duas vezes na volta, que se toca; reamostre ${tr ? `o trecho ${citar(tr)}` : 'o trecho que o repete'} para os pontos não coincidirem, una os trechos que se tocam (une), ou deixe o laço da ponta com área zero`);
    }
    const trs = [...new Set(alt.preso.map((n) => trechoDoPonto(r, n)).filter(Boolean))];
    falha(`${onde} tem ${nulas.length} ${nulas.length === 1 ? 'face' : 'faces'} de área zero na escada, a primeira com os pontos ${nulas[0].map(citar).join(', ')}, e nenhuma orelha cabe no contorno que sobra (${alt.preso.length} pontos, dos trechos ${trs.map(citar).join(', ')}); reamostre esses trechos com outro número de pontos ou corte por outro eixo, em que o primeiro e o último laço sejam convexos`);
  }
  for (const t of tampas) faces.push(...(t.r === 0 ? t.faces.map((f) => [...f].reverse()) : t.faces));
  /* com costura, a linha dobrada sobre si deixa pares de faces sobre os mesmos pontos, uma em cada sentido: são a membrana de espessura zero
     dos dois lados da linha, sem volume, e saem juntas */
  if (costuras.length) {
    const grupos = new Map();
    faces.forEach((f, k) => { const c = [...f].sort().join('|'); grupos.set(c, [...(grupos.get(c) ?? []), k]); });
    const sentidoDe = (f) => { const m = f.indexOf([...f].sort()[0]); return f[(m + 1) % f.length] < f[(m + f.length - 1) % f.length]; };
    const sai = new Set();
    for (const ks of grupos.values()) {
      const mais = ks.filter((k) => sentidoDe(faces[k])); const menos = ks.filter((k) => !sentidoDe(faces[k]));
      for (let j = 0; j < Math.min(mais.length, menos.length); j++) { sai.add(mais[j]); sai.add(menos[j]); }
    }
    if (sai.size) { const ficam = faces.filter((_, k) => !sai.has(k)); faces.length = 0; faces.push(...ficam); }
  }

  /* fechamento: cada aresta em duas faces, uma em cada sentido, menos a da boca de uma ponta aberta, que fica em uma face só */
  const daBoca = new Set([...abertos].flatMap((r) => uv[r].map((_, q) => nm(r, q))));
  const sentido = new Map();
  for (const f of faces) f.forEach((a, k) => { const b = f[(k + 1) % f.length]; const c = `${a}|${b}`; sentido.set(c, (sentido.get(c) ?? 0) + 1); });
  const bordaLivre = [];
  for (const [c, k] of sentido) {
    const [a, b] = c.split('|');
    if (k > 1) falha(`a aresta ${citar(a)}-${citar(b)} aparece ${k} vezes no mesmo sentido; os laços se cruzam ou a tampa não casa com eles`);
    if (sentido.has(`${b}|${a}`)) continue;
    if (daBoca.has(a) && daBoca.has(b)) { bordaLivre.push([a, b]); continue; }
    falha(`a gaiola não fecha na aresta ${citar(a)}-${citar(b)}; confira tampa.de e tampa.ate`);
  }
  const P = nomes.map((k) => pontosMm[k]);
  let fIdx = faces.map((f) => f.map((v) => indice.get(v)));
  let orientadas = faces;
  /* o lado de fora da casca aberta é o do sólido que a fecharia: um leque de cada aresta da boca até o centro dela, que só entra na conta */
  const leque = [];
  for (const r of abertos) {
    const daquela = new Set(uv[r].map((_, q) => nm(r, q)));
    const centro = [...daquela].reduce((s, v) => s.map((x, a) => x + pontosMm[v][a] / daquela.size), [0, 0, 0]);
    const c = P.length;
    P.push(centro);
    for (const [a, b] of bordaLivre) if (daquela.has(a)) leque.push([indice.get(b), indice.get(a), c]);
  }
  if (volumeComSinal([...fIdx, ...leque], P) < 0) { orientadas = faces.map((f) => [...f].reverse()); fIdx.forEach((f) => f.reverse()); }
  P.length = nomes.length;

  /* uma faixa de laços [de, ate], inclusive; sem ela, todos */
  const faixaDeLacos = (decl, onde, podeSerUm = false) => {
    if (decl == null) return rs;
    if (!Array.isArray(decl) || decl.length !== 2) falha(`${onde}.lacos precisa ser [de, ate], dois laços`);
    const [de, ate] = decl.map((x) => lacoDe(x, onde));
    if (podeSerUm ? de > ate : de >= ate) falha(`${onde}.lacos vai de ${citar(decl[0])} a ${citar(decl[1])}, e o primeiro precisa vir ${podeSerUm ? 'antes do segundo ou ser ele' : 'antes do segundo'}`);
    return rs.filter((r) => r >= de && r <= ate);
  };

  /* vincos */
  const semRepetir = (l) => l.filter((v, k) => v !== l[k - 1]);
  const rs = [...Array(R).keys()];
  /* O vinco `entre` com `esvai: { de, ate }` tem a nitidez declarada até o laço `de`, cai dela até zero no laço `ate` (pelo peso da posição
     do laço, linear ou suave) e acaba aí. A aresta entre dois laços leva a média da nitidez dos dois; as de mesma nitidez formam um vinco só,
     e o nome dos outros leva o índice da primeira aresta, `${nome}_${k}`. */
  const vincoQueEsvai = (v, onde, faixa, linha, semRepetirPontos) => {
    if (typeof v.nitidez !== 'number' || !(v.nitidez > 0 && v.nitidez <= 1)) falha(`${onde} traz esvai com nitidez ${JSON.stringify(v.nitidez)}; a nitidez que cai até zero parte de um número entre 0 (exclusive) e 1, e o 'viva' não cai`);
    const f = lerFaixaQueSome(v.esvai, onde, 'esvai');
    const de = lacoDe(f.de, `${onde}.esvai`); const ate = lacoDe(f.ate, `${onde}.esvai`);
    if (de >= ate) falha(`${onde}.esvai vai de ${citar(f.de)} a ${citar(f.ate)}, e o primeiro precisa vir antes do segundo`);
    if (de < faixa[0] || ate > faixa[faixa.length - 1]) falha(`${onde}.esvai vai do laço ${citar(lacos[de].nome)} ao ${citar(lacos[ate].nome)}, e o vinco só corre do ${citar(lacos[faixa[0]].nome)} ao ${citar(lacos[faixa[faixa.length - 1]].nome)}; a faixa em que a nitidez cai fica dentro dele`);
    const valor = faixa.map((r) => (r <= de ? v.nitidez : r >= ate ? 0 : v.nitidez * (1 - pesoNaFaixa(lacos[r].em, lacos[de].em, lacos[ate].em, f.curva))));
    const arestas = [];
    for (let k = 0; k + 1 < faixa.length; k++) {
      const nitidez = Number(((valor[k] + valor[k + 1]) / 2).toFixed(6));
      if (nitidez > 0 && linha[k] !== linha[k + 1]) arestas.push({ a: linha[k], b: linha[k + 1], nitidez, k });
    }
    const grupos = [];
    for (const x of arestas) {
      const g = grupos[grupos.length - 1];
      if (g && g.nitidez === x.nitidez && g.pontos[g.pontos.length - 1] === x.a) g.pontos.push(x.b);
      else grupos.push({ nitidez: x.nitidez, pontos: [x.a, x.b], k: x.k });
    }
    return grupos.map((g, j) => ({ nome: j === 0 ? v.nome : `${v.nome}_${g.k}`, pontos: semRepetirPontos(g.pontos), nitidez: g.nitidez }));
  };
  const trechoNoLaco = (r, i) => { const l = []; for (let q = inicio[i]; ; q = (q + 1) % N) { l.push(nm(r, q)); if (q === fimDe(i)) break; } return l; };
  const vincos = [];
  for (const [k, v] of (o.vincos ?? []).entries()) {
    const onde = `vincos[${k}]`;
    if (!v || typeof v.nome !== 'string') falha(`${onde} precisa de nome`);
    if (v.raio != null && v.nitidez != null) falha(`${onde} declara raio e nitidez; o raio em mm decide a nitidez (as colunas de apoio fazem o arredondamento), então declare só um dos dois`);
    if (v.raio != null && v.esvai != null) falha(`${onde} declara raio e esvai; o raio por posição se declara como { de, ate } ou lista, e esvai é da nitidez`);
    if (v.nitidez == null && v.raio == null) falha(`${onde} precisa de nitidez, 'viva' ou de 0 a 1, ou de raio em mm`);
    const decl = v.raio != null ? { nitidez: 0, raio: v.raio } : { nitidez: v.nitidez };
    const formas = ['trecho', 'entre', 'laco'].filter((c) => v[c] != null);
    if (formas.length !== 1) falha(`${onde} declara o vinco por um de trecho, entre ou laco, e veio ${formas.length ? formas.join(' e ') : 'nenhum'}`);
    /* `lacos: [de, ate]` limita o vinco de trecho ou de entre a essa faixa de laços, inclusive: a linha de um chanfro que acaba onde o disco acaba */
    if (v.lacos != null && v.laco != null) falha(`${onde} traz lacos e laco; lacos limita o vinco de trecho ou de entre a uma faixa de laços`);
    const faixa = faixaDeLacos(v.lacos, onde);
    if (v.trecho != null) {
      if (v.esvai != null) falha(`${onde} traz esvai, que só vale no vinco de entre (a linha do ponto entre dois trechos, que corre pelos laços); o vinco de trecho contorna a faixa e não tem uma direção em que a nitidez possa cair`);
      const i = exigeTrecho(v.trecho, onde);
      const ida = faixa.map((r) => nm(r, inicio[i]));
      const volta = [...faixa].reverse().map((r) => nm(r, fimDe(i)));
      const pontos = semRepetir([...ida, ...trechoNoLaco(faixa[faixa.length - 1], i).slice(1), ...volta.slice(1), ...trechoNoLaco(faixa[0], i).reverse().slice(1)]);
      vincos.push({ nome: v.nome, pontos, ...decl });
    } else if (v.entre != null) {
      if (!Array.isArray(v.entre) || v.entre.length !== 2) falha(`${onde}.entre precisa ser [a, b], dois trechos seguidos`);
      const [a, b] = v.entre.map((t) => exigeTrecho(t, onde));
      if ((a + 1) % trechos.length !== b) falha(`${onde}.entre cita ${citar(v.entre[0])} e ${citar(v.entre[1])}, que não são seguidos na volta`);
      const linha = faixa.map((r) => nm(r, inicio[b]));
      if (v.esvai == null) vincos.push({ nome: v.nome, pontos: semRepetir(linha), ...decl });
      else vincos.push(...vincoQueEsvai(v, onde, faixa, linha, semRepetir));
    } else {
      if (v.esvai != null) falha(`${onde} traz esvai, que só vale no vinco de entre (a linha do ponto entre dois trechos, que corre pelos laços); o vinco ${v.trecho != null ? 'de trecho' : 'de laço'} não tem uma direção em que a nitidez possa cair`);
      const r = lacoDe(v.laco, onde);
      if (v.trechos == null) {
        const volta = semRepetir([...Array(N + 1).keys()].map((q) => nm(r, q)));
        vincos.push({ nome: v.nome, pontos: volta, ...decl });
      } else {
        for (const t of v.trechos) {
          const pontos = semRepetir(trechoNoLaco(r, exigeTrecho(t, onde)));
          if (pontos.length >= 2) vincos.push({ nome: `${v.nome}_${t}`, pontos, ...decl });
        }
      }
    }
  }

  /* cantos e medidas: pontos marcados por trecho ou pelo ponto entre dois trechos, em todos os laços ou num só */
  const marcados = (s, onde) => {
    const lista = s.laco != null ? [lacoDe(s.laco, onde)] : rs;
    if ((s.trecho != null) === (s.entre != null)) falha(`${onde} marca os pontos por trecho ou por entre, um dos dois`);
    let qs;
    if (s.trecho != null) { const i = exigeTrecho(s.trecho, onde); qs = []; for (let q = inicio[i]; ; q = (q + 1) % N) { qs.push(q); if (q === fimDe(i)) break; } }
    else {
      const [a, b] = (s.entre ?? []).map((t) => exigeTrecho(t, onde));
      if ((a + 1) % trechos.length !== b) falha(`${onde}.entre precisa de dois trechos seguidos na volta`);
      qs = [inicio[b]];
    }
    return [...new Set(lista.flatMap((r) => qs.map((q) => nm(r, q))))];
  };
  const cantos = [...new Set((o.cantos ?? []).flatMap((c, k) => marcados(c, `cantos[${k}]`)))];
  let medidas = null;
  if (o.medidas != null) {
    if (o.medidas === 'todos' || o.medidas === true) falha(`medidas em todos os pontos não é aceito: ${MEDIDAS_EM_TODOS}; marque só os pontos de cota, por trecho, por entre ou por laço`);
    if (!Array.isArray(o.medidas) || !o.medidas.length) falha('medidas precisa ser lista não vazia de { trecho | entre, laco?, peso? }');
    const porPonto = new Map();
    o.medidas.forEach((s, k) => {
      for (const p of marcados(s, `medidas[${k}]`)) {
        if (porPonto.has(p) && porPonto.get(p) !== (s.peso ?? null)) falha(`o ponto ${citar(p)} aparece em medidas com pesos diferentes`);
        porPonto.set(p, s.peso ?? null);
      }
    });
    if (porPonto.size >= nomes.length) falha(`as medidas marcam todos os ${nomes.length} pontos da gaiola, o que não é aceito: ${MEDIDAS_EM_TODOS}; marque só os pontos de cota`);
    medidas = nomes.filter((p) => porPonto.has(p)).map((p) => (porPonto.get(p) == null ? p : { ponto: p, peso: porPonto.get(p) }));
  }

  /* grupos de faces: cada um é a lista de pontos de uma faixa de laços e trechos; o passo `subdivisao` toma como do grupo a face da
     gaiola cujos pontos estão todos nele, e a origem do passo cita o grupo para a seleção de `parte` */
  const grupos = [];
  if (o.grupos != null) {
    if (!Array.isArray(o.grupos) || !o.grupos.length) falha('grupos precisa ser lista não vazia de { nome, lacos?: [de, ate], trechos? }');
    const vistos = new Set();
    o.grupos.forEach((g, k) => {
      const onde = `grupos[${k}]`;
      if (!g || typeof g.nome !== 'string' || !g.nome) falha(`${onde} precisa de nome`);
      if (vistos.has(g.nome)) falha(`o grupo ${citar(g.nome)} aparece duas vezes`);
      vistos.add(g.nome);
      /* um grupo é uma seleção { lacos?, trechos? } ou a união de várias, em `unir` */
      const selecoes = g.unir ?? [g];
      if (!Array.isArray(selecoes) || !selecoes.length) falha(`${onde}.unir precisa ser lista não vazia de { lacos?, trechos? }`);
      const doGrupo = new Set();
      selecoes.forEach((sel, j) => {
        const faixa = faixaDeLacos(sel.lacos, g.unir ? `${onde}.unir[${j}]` : onde, true);
        const itens = sel.trechos == null ? trechos.map((_, i) => i) : sel.trechos.map((t) => exigeTrecho(t, onde));
        for (const r of faixa) for (const i of itens) for (let q = inicio[i]; ; q = (q + 1) % N) { doGrupo.add(nm(r, q)); if (q === fimDe(i)) break; }
      });
      grupos.push({ nome: g.nome, pontos: nomes.filter((n) => doGrupo.has(n)) });
    });
  }

  /* avisos de amostragem desigual: nas junções de trechos e entre intervalos vizinhos de planos */
  const avisos = [];
  const nosVincos = new Set(vincos.flatMap((v) => v.pontos));
  const vivos = new Set(cantos);
  trechos.forEach((t, b) => {
    const a = (b + trechos.length - 1) % trechos.length;
    let pior = null;
    rs.forEach((r) => {
      const q = inicio[b];
      const nome = nm(r, q);
      if (nosVincos.has(nome) || vivos.has(nome)) return;
      const p = uv[r][q]; const ant = uv[r][(q + N - 1) % N]; const prox = uv[r][(q + 1) % N];
      const la = Math.hypot(p[0] - ant[0], p[1] - ant[1]); const lb = Math.hypot(prox[0] - p[0], prox[1] - p[1]);
      if (la <= TOLERANCIA_DE_FUSAO_MM || lb <= TOLERANCIA_DE_FUSAO_MM) return;
      const razao = Math.max(la, lb) / Math.min(la, lb);
      if (!pior || razao > pior.razao) pior = { razao, la, lb, laco: lacos[r].nome };
    });
    if (pior && pior.razao > RAZAO_MAXIMA_DE_AMOSTRAGEM) {
      avisos.push({
        ref: 'amostragemDesigual', trechos: [trechos[a].nome, t.nome], laco: pior.laco, razao: Number(pior.razao.toFixed(2)),
        texto: `amostragem desigual entre os trechos ${citar(trechos[a].nome)} e ${citar(t.nome)}: no laço ${citar(pior.laco)}, o último segmento de ${citar(trechos[a].nome)} tem ${br(pior.la, 1)} mm e o primeiro de ${citar(t.nome)} ${br(pior.lb, 1)} mm, razão ${br(pior.razao, 1)}, acima de ${RAZAO_MAXIMA_DE_AMOSTRAGEM}; a subdivisão deixa calombo ali (razão 20 deu 0,76 mm na peça de teste do plano), então dê pontos aos dois trechos na mesma proporção do comprimento ou ponha um vinco na junção`,
      });
    }
  });
  for (let r = 1; r + 1 < R; r++) {
    /* o vinco vivo de laço inteiro isola a faixa dos vizinhos, e a subdivisão não deixa calombo por cima dele */
    if (fechados.has(lacos[r].nome)) continue;
    const d1 = lacos[r].em - lacos[r - 1].em; const d2 = lacos[r + 1].em - lacos[r].em;
    const razao = Math.max(d1, d2) / Math.min(d1, d2);
    if (razao > RAZAO_MAXIMA_DE_AMOSTRAGEM) {
      avisos.push({
        ref: 'planosDesiguais', lacos: [lacos[r - 1].nome, lacos[r].nome, lacos[r + 1].nome], razao: Number(razao.toFixed(2)),
        texto: `os planos em volta do laço ${citar(lacos[r].nome)} ficam a ${br(d1, 1)} e ${br(d2, 1)} mm, razão ${br(razao, 1)}, acima de ${RAZAO_MAXIMA_DE_AMOSTRAGEM}; a subdivisão deixa calombo ali, então espace os planos aos poucos`,
      });
    }
  }

  /* o passo dos pontos num trecho reto da tampa contra a distância entre laços vizinhos: a subdivisão da gaiola deixa leque de faces
     finas na dobra quando os pontos ao longo do trecho são muito mais densos que os laços empilhados (a gaiola em si não tem face fina, e o aviso de
     faces finas abaixo não o vê) */
  trechos.forEach((t, i) => {
    /* o leque nasce nos degraus da tampa, que parte dos dois trechos `tampa.de` e `tampa.ate` */
    if (abertos.size === 2 || o.tampa == null || (t.nome !== o.tampa.de && t.nome !== o.tampa.ate)) return;
    const qs = []; for (let q = inicio[i]; ; q = (q + 1) % N) { qs.push(q); if (q === fimDe(i)) break; }
    if (qs.length < 4 || R < 3) return;
    const reto = uv.every((volta) => {
      const a = volta[qs[0]]; const b = volta[qs[qs.length - 1]]; const comp = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return comp > TOLERANCIA_DE_FUSAO_MM && qs.every((q) => Math.abs((b[0] - a[0]) * (volta[q][1] - a[1]) - (b[1] - a[1]) * (volta[q][0] - a[0])) / comp <= 1e-3 * comp);
    });
    if (!reto) return;
    let passo = null; let perto = null; let longe = 0;
    uv.forEach((volta, r) => {
      const a = volta[qs[0]]; const b = volta[qs[qs.length - 1]];
      const s = Math.hypot(b[0] - a[0], b[1] - a[1]) / (qs.length - 1);
      if (s > TOLERANCIA_DE_FUSAO_MM && (passo === null || s < passo)) passo = s;
      if (r + 1 >= R) return;
      const meio = qs[qs.length >> 1]; const c = uv[r + 1][meio]; const m = volta[meio];
      const d = Math.hypot(c[0] - m[0], c[1] - m[1], lacos[r + 1].em - lacos[r].em);
      if (d > TOLERANCIA_DE_FUSAO_MM && (perto === null || d < perto.d)) perto = { d, de: lacos[r].nome, ate: lacos[r + 1].nome };
      if (d > longe) longe = d;
    });
    if (passo === null || perto === null) return;
    const razao = passo / perto.d;
    /* laços a distâncias parecidas dão células de proporção comum e a subdivisão não deixa leque; o leque vem do degrau entre a pilha de
       laços próximos e os laços afastados (a dobra e a parede), então só o degrau de RAZAO_MAXIMA_DE_AMOSTRAGEM vezes ou mais conta */
    if (razao >= RAZAO_MINIMA_DO_PASSO_PELA_DISTANCIA_ENTRE_LACOS || longe < RAZAO_MAXIMA_DE_AMOSTRAGEM * perto.d) return;
    const comprimento = passo * (qs.length - 1);
    const pontosCabem = Math.max(2, Math.floor(comprimento / (RAZAO_MINIMA_DO_PASSO_PELA_DISTANCIA_ENTRE_LACOS * perto.d)) + 1);
    avisos.push({
      ref: 'passoDensoEntreLacos', trecho: t.nome, lacos: [perto.de, perto.ate], razao: Number(razao.toFixed(2)), passoMm: Number(passo.toFixed(2)), distanciaMm: Number(perto.d.toFixed(2)),
      texto: `no trecho ${citar(t.nome)} os pontos ficam a ${br(passo, 1)} mm uns dos outros ao longo do laço e os laços ${citar(perto.de)} e ${citar(perto.ate)} a ${br(perto.d, 1)} mm, razão ${br(razao, 1)}, abaixo de ${RAZAO_MINIMA_DO_PASSO_PELA_DISTANCIA_ENTRE_LACOS}; a gaiola não tem face fina, mas a subdivisão deixa um leque delas na dobra entre os laços próximos (na caçamba do carrinho de mão, razão 3,8 deu zero, 2,9 deu 12 e 1,9 deu 68), então baixe os pontos desse trecho de ${t.pontos} para ${pontosCabem} ou menos, ou espace os laços`,
    });
  });

  /* faces finas: área / (maior aresta)^2, a razão que o `analisarTopologia` chama de lasca, abaixo do limite da gaiola; o trecho que
     some entre dois planos deixa um leque delas */
  const finas = [];
  for (const f of faces) {
    const [nx, ny, nz] = normalDaFace(f, pontosMm);
    const maior = Math.max(...f.map((v, k) => Math.hypot(...sub3(pontosMm[v], pontosMm[f[(k + 1) % f.length]]))));
    const razao = maior > TOLERANCIA_DE_FUSAO_MM ? Math.hypot(nx, ny, nz) / 2 / (maior * maior) : 1;
    if (razao < LIMITE_DE_FACE_FINA_NA_GAIOLA) finas.push({ razao, face: f });
  }
  if (finas.length) {
    const pior = finas.reduce((x, y) => (y.razao < x.razao ? y : x));
    avisos.push({
      ref: 'facesFinas', quantidade: finas.length, razao: Number(pior.razao.toPrecision(3)), pontos: pior.face,
      texto: `${finas.length} ${finas.length === 1 ? 'face da gaiola é fina' : 'faces da gaiola são finas'} (área / maior aresta² abaixo de ${br(LIMITE_DE_FACE_FINA_NA_GAIOLA, 3)}), a pior de ${br(pior.razao, 4)} com os pontos ${pior.face.map(citar).join(', ')}; o trecho que some e volta entre planos deixa um leque assim, então, se a face sai de um trecho que some e volta entre planos, declare some (em mm) nesse trecho, que o ajudante funde num ponto nos laços onde mede menos que isso; se vem de dois planos muito afastados ao lado de um ponto, ponha um plano entre eles`,
    });
  }

  /* compensação: os pontos marcados andam no plano do laço até o ponto limite chegar ao declarado pela normal */
  const alvosMm = Object.fromEntries(nomes.map((k) => [k, [...pontosMm[k]]]));
  let compensacao = null;
  if (o.compensar != null && o.compensar !== false) {
    const c = o.compensar === true ? {} : o.compensar;
    if (typeof c !== 'object') falha('compensar é true ou { trechos, lacos? }');
    const lacosC = c.lacos == null ? rs : c.lacos.map((l) => lacoDe(l, 'compensar.lacos'));
    const its = c.trechos == null ? trechos.map((_, i) => i) : c.trechos.map((t) => exigeTrecho(t, 'compensar.trechos'));
    const fundidos = new Set();
    /* o ponto fundido fica onde está, menos o da lâmina de ponta com `pontas`, que é uma linha de pontos de normal bem definida */
    lacos.forEach((_, r) => rep[r].forEach((d, q) => { if (d !== q && !(c.pontas === true && lamina[r])) fundidos.add(nomeCru(r, d)); }));
    const moveis = new Set();
    for (const r of lacosC) for (const i of its) for (let q = inicio[i]; ; q = (q + 1) % N) { moveis.add(nm(r, q)); if (q === fimDe(i)) break; }
    for (const v of [...vivos, ...fundidos]) moveis.delete(v);
    const lista = nomes.filter((k) => moveis.has(k)).map((k) => indice.get(k));
    const daPonta = new Set([0, R - 1].flatMap((r) => uv[r].map((_, q) => indice.get(nm(r, q)))));
    const vincosIdx = [];
    for (const v of vincos) for (let k = 0; k + 1 < v.pontos.length; k++) vincosIdx.push([indice.get(v.pontos[k]), indice.get(v.pontos[k + 1]), nitidezDoVinco(v.nitidez)]);
    const cantosIdx = cantos.map((k) => indice.get(k));
    const facesDo = nomes.map(() => []);
    fIdx.forEach((f, k) => f.forEach((v) => facesDo[v].push(k)));
    /* o ponto em exatamente dois vincos vivos fica na curva do vinco: o limite dele escorrega pela curva, e só a parte do vazio perpendicular
       a ela interessa; pela normal média das faces o ponto de um chanfro andaria também para fora da face (0,5 mm na peça de teste) */
    const vizinhosVivos = new Map();
    for (const [a, b, n] of vincosIdx) {
      if (n !== NITIDEZ_INFINITA_DO_VINCO) continue;
      for (const [x, y] of [[a, b], [b, a]]) vizinhosVivos.set(x, [...(vizinhosVivos.get(x) ?? []), y]);
    }
    const V = P.map((p) => [...p]);
    const alvo = P.map((p) => [...p]);
    let residuo = 0;
    for (let passo = 0; passo <= PASSOS_DA_COMPENSACAO; passo++) {
      const L = limitesDaGaiola({ vertices: V, faces: fIdx, vincos: vincosIdx, cantos: cantosIdx });
      residuo = 0;
      const novos = lista.map((i) => {
        const viz = vizinhosVivos.get(i);
        if (viz?.length === 2) {
          const tg = sub3(V[viz[1]], V[viz[0]]);
          const lt = Math.hypot(...tg);
          if (lt > TOLERANCIA_DE_FUSAO_MM) {
            const u = tg.map((x) => x / lt);
            const d = sub3(alvo[i], L[i]);
            const ao = d[0] * u[0] + d[1] * u[1] + d[2] * u[2];
            const perp = d.map((x, a) => x - ao * u[a]);
            perp[e] = 0;
            residuo = Math.max(residuo, Math.hypot(...perp));
            return V[i].map((c, a) => c + perp[a]);
          }
        }
        const nn = [0, 0, 0];
        for (const k of facesDo[i]) { const w = normalDaFace(fIdx[k], V); nn[0] += w[0]; nn[1] += w[1]; nn[2] += w[2]; }
        const l = Math.hypot(...nn) || 1;
        for (let a = 0; a < 3; a++) nn[a] /= l;
        const d = sub3(alvo[i], L[i]);
        const s = d[0] * nn[0] + d[1] * nn[1] + d[2] * nn[2];
        /* o ponto anda no plano do laço, na direção da normal sem a componente do eixo, o bastante para cobrir s pela normal */
        const no = [...nn]; no[e] = 0;
        const lp = Math.hypot(...no);
        if (lp < INCLINACAO_MINIMA_DA_COMPENSACAO) {
          /* a normal quase no eixo: o ponto de um laço de ponta, com `pontas`, anda ao longo do eixo e sai do plano do laço */
          if (!(c.pontas === true && daPonta.has(i)) || Math.abs(nn[e]) < 0.5) return V[i];
          residuo = Math.max(residuo, Math.abs(s));
          const noEixo = [...V[i]]; noEixo[e] += s / nn[e];
          return noEixo;
        }
        residuo = Math.max(residuo, Math.abs(s));
        const passoNoPlano = s / lp;
        return V[i].map((c, a) => c + (passoNoPlano * no[a]) / lp);
      });
      if (passo === PASSOS_DA_COMPENSACAO) break;
      lista.forEach((i, k) => { V[i] = novos[k]; });
    }
    const deslocamentos = lista.map((i) => Math.hypot(...sub3(V[i], alvo[i]))).filter((x) => x > 0);
    nomes.forEach((k, i) => { pontosMm[k] = V[i]; });
    compensacao = { pontos: deslocamentos.length, maiorDeslocamentoMm: Number(Math.max(0, ...deslocamentos).toFixed(3)), residuoMm: Number(residuo.toFixed(3)) };
    /* a conferência: a superfície limite ao longo de cada laço, nos pontos da gaiola e no meio de cada segmento, com e sem a compensação, contra
       o contorno declarado; o que a compensação leva além do pedido é o quanto o ponto com ela passa do contorno, menos o que ele já passava sem */
    const trechoDe = (q) => { let i = trechos.length - 1; while (inicio[i] > q) i--; return trechos[i].nome; };
    const cadeias = rs.map((r) => {
      const c = [];
      for (let q = 0; q < N; q++) { const i = indice.get(nm(r, q)); if (c[c.length - 1]?.i !== i) c.push({ i, trecho: trechoDe(q) }); }
      if (c.length > 1 && c[0].i === c[c.length - 1].i) c.pop();
      return c;
    });
    const gaiola = (vertices) => ({ vertices, faces: fIdx, vincos: vincosIdx, cantos: cantosIdx });
    const { linhas, limites } = linhasDosLacosRefinadas(gaiola(V), cadeias);
    const noPlano = (p) => [p[outros[0]], p[outros[1]]];
    const contornos = rs.map((r) => (lamina[r] ? [] : lacos[r].polilinhas.flatMap((p) => p.slice(0, -1))));
    const Lcom = limites(V);
    /* só os pontos que passam da tolerância com a compensação pedem a gaiola sem ela, que custa outro refino */
    const candidatos = rs.flatMap((r) => (contornos[r].length < 3 ? [] : linhas[r].map((x) => ({ r, ...x, dCom: distanciaParaFora(contornos[r], noPlano(Lcom[x.i])) }))))
      .filter((x) => x.dCom > TOLERANCIA_DA_COMPENSACAO_MM);
    const Lsem = candidatos.length ? limites(alvo) : null;
    const porTrecho = new Map();
    for (const { r, i, trecho, dCom } of candidatos) {
      const dSem = Math.max(0, distanciaParaFora(contornos[r], noPlano(Lsem[i])));
      const acima = dCom - dSem;
      if (!(acima > TOLERANCIA_DA_COMPENSACAO_MM)) continue;
      const t = porTrecho.get(trecho) ?? { acima: -Infinity, lacos: new Set() };
      t.lacos.add(r);
      if (acima > t.acima) Object.assign(t, { acima, dCom, dSem, r });
      porTrecho.set(trecho, t);
    }
    for (const { nome } of trechos) {
      const t = porTrecho.get(nome);
      if (!t) continue;
      const l = lacos[t.r];
      avisos.push({
        ref: 'compensacaoPassa', trecho: nome, laco: l.nome, desvioMm: Number(t.dCom.toFixed(2)), semCompensarMm: Number(t.dSem.toFixed(2)), lacos: t.lacos.size,
        texto: `com compensar, a superfície passa ${br(t.dCom, 1)} mm do pedido entre os pontos do trecho ${citar(nome)} no laço ${citar(l.nome)} (${o.eixo} = ${br(l.em)} mm), contra ${br(t.dSem, 1)} mm sem compensar, e passa de ${br(TOLERANCIA_DA_COMPENSACAO_MM)} mm além disso em ${t.lacos.size} ${t.lacos.size === 1 ? 'laço' : 'laços'}; a compensação faz a superfície passar pelos pontos, e perto de um ponto em que o laço dobra de repente (um canto sem vinco, a quina de uma planta em polígono) a curva lisa entre eles sai do contorno; marque o canto em cantos, dê mais pontos ao trecho (com metade do passo, o desvio cai à metade), compense só os trechos de arco que não acabam num canto (compensar: { trechos }), ou tire compensar`,
      });
    }
  }

  /* O RAIO EM MM: o vinco com `raio` ganha as colunas de apoio (apoio-do-vinco.js), depois da compensação e antes da conferência da espessura, que
     refina a gaiola com elas. Os pontos de apoio entram nos grupos cujas duas pontas da aresta de saída já estão neles. */
  let raios = null; const apoioDe = new Map();
  const comRaio = vincos.filter((v) => v.raio != null);
  if (comRaio.length) {
    const ap = inserirApoiosNosVincos({ pontos: pontosMm, faces: orientadas, vincos: comRaio, unidade: 1 });
    orientadas = ap.faces;
    for (const v of vincos) if (ap.linhas[v.nome]) v.pontos = ap.linhas[v.nome];
    for (const [n, q] of Object.entries(ap.pontos)) { pontosMm[n] = q; alvosMm[n] = [...q]; apoioDe.set(n, ap.origens[n]); }
    nomes = Object.keys(pontosMm); indice = new Map(nomes.map((n, k) => [n, k]));
    fIdx = orientadas.map((f) => f.map((v) => indice.get(v)));
    for (const g of grupos) {
      const dentro = new Set(g.pontos);
      for (const [n, org] of apoioDe) if (dentro.has(org.ponto) && dentro.has(org.vizinho)) g.pontos.push(n);
    }
    raios = ap.raios;
    for (const a of ap.avisos) avisos.push({ ref: a.nome, texto: a.motivo, ...a });
  }

  /* A CONFERÊNCIA DA ESPESSURA: a gaiola refinada como o passo a refina e a chapa medida pela mesma conta do passo; cada par de vértices
     da malha em que a espessura passa do raio local vai ao ponto da gaiola mais perto, e o pior de cada laço dá um aviso. A malha não muda. */
  let conferenciaDaEspessura = null;
  if (o.espessura != null) {
    const ex = typeof o.espessura === 'number' ? { valor: o.espessura } : o.espessura;
    const onde = 'espessura';
    if (!ex || typeof ex !== 'object' || !(Number.isFinite(ex.valor) && ex.valor > 0)) falha(`${onde} é a espessura da chapa em mm, número maior que zero (ou { valor, niveis?, lado? }), e veio ${JSON.stringify(o.espessura)}; ela só confere o raio local, e a chapa continua sendo do passo subdivisao`);
    const niveis = ex.niveis ?? NIVEIS_DA_CONFERENCIA_DA_ESPESSURA;
    if (!Number.isInteger(niveis) || niveis < 1) falha(`${onde}.niveis é o número de níveis do passo subdivisao, inteiro de 1 para cima, e veio ${JSON.stringify(ex.niveis)}`);
    const lado = ex.lado ?? 'contraNormal';
    if (lado !== 'contraNormal' && lado !== 'normal') falha(`${onde}.lado é 'contraNormal' (o padrão do passo, a chapa para dentro) ou 'normal', e veio ${JSON.stringify(ex.lado)}`);
    const t = ex.valor;
    const vincosIdx = [];
    for (const v of vincos) for (let k = 0; k + 1 < v.pontos.length; k++) vincosIdx.push([indice.get(v.pontos[k]), indice.get(v.pontos[k + 1]), nitidezDoVinco(v.nitidez)]);
    const malha = subdividirCatmullClark({ vertices: nomes.map((k) => pontosMm[k]), faces: fIdx, vincos: vincosIdx, cantos: cantos.map((k) => indice.get(k)), niveis });
    let lugares = []; let raioMinimo = Infinity;
    try {
      raioMinimo = espessarSuperficie({ vertices: malha.vertices, faces: malha.faces, espessura: t, lado }).raioMinimo;
    } catch (err) {
      if (!(err instanceof ErroDaEspessura)) throw err;
      if (err.tipo === 'raio' && err.raio != null) { lugares = err.lugares; raioMinimo = err.raio; } else {
        avisos.push({ ref: 'espessuraRecusada', espessuraMm: t, texto: `com a espessura de ${br(t)} mm o passo subdivisao recusaria a chapa: ${err.motivo}` });
      }
    }
    /* o laço e o trecho de cada ponto da gaiola, e o ponto da gaiola mais perto de cada lugar (o refino mantém o índice dos pontos dela) */
    const doPonto = new Map();
    /* a tangente do laço no ponto, pelos vizinhos distintos dele na volta, separa o canto do laço (o par ao longo dela) da dobra entre laços */
    const vizinhoDistinto = (r, q, passo) => { let j = q; do j = (j + passo + N) % N; while (j !== q && nm(r, j) === nm(r, q)); return uv[r][j]; };
    lacos.forEach((_, r) => {
      for (let q = 0; q < N; q++) {
        const nome = nm(r, q);
        if (doPonto.has(nome)) continue;
        let i = trechos.length - 1; while (inicio[i] > rep[r][q]) i--;
        const a = vizinhoDistinto(r, q, -1); const b = vizinhoDistinto(r, q, 1);
        const tangente = [0, 0, 0]; tangente[outros[0]] = b[0] - a[0]; tangente[outros[1]] = b[1] - a[1];
        doPonto.set(nome, { r, trecho: trechos[i].nome, tangente });
      }
    });
    for (const [n, org] of apoioDe) if (doPonto.has(org.ponto)) doPonto.set(n, doPonto.get(org.ponto));
    const porLaco = new Map();
    for (const l of lugares) {
      let melhor = 0; let dMelhor = Infinity;
      for (let k = 0; k < nomes.length; k++) { const p = malha.vertices[k]; const d = Math.hypot(p[0] - l.ponto[0], p[1] - l.ponto[1], p[2] - l.ponto[2]); if (d < dMelhor) { dMelhor = d; melhor = k; } }
      const { r, trecho, tangente } = doPonto.get(nomes[melhor]);
      const ed = sub3(malha.vertices[l.vertices[1]], malha.vertices[l.vertices[0]]);
      const aoLongo = Math.abs(ed[0] * tangente[0] + ed[1] * tangente[1] + ed[2] * tangente[2]) / (Math.hypot(...ed) * Math.hypot(...tangente) || 1);
      const direcao = aoLongo >= COSSENO_DO_CANTO_NO_LACO ? 'noLaco' : 'entreLacos';
      const x = porLaco.get(r) ?? { pares: 0 };
      x.pares += 1;
      if (!(x.raio <= l.raio)) Object.assign(x, { raio: l.raio, ponto: nomes[melhor], trecho, direcao });
      porLaco.set(r, x);
    }
    for (const r of [...porLaco.keys()].sort((a, b) => a - b)) {
      const x = porLaco.get(r); const l = lacos[r];
      const ondeNoLaco = `do laço ${citar(l.nome)} (${o.eixo} = ${br(l.em)} mm), perto do ponto ${citar(x.ponto)} (trecho ${citar(x.trecho)})`;
      const resolve = x.direcao === 'noLaco'
        ? `faça o canto em arco no laço, de raio maior que a espessura e com pontos bastantes para a malha seguir o arco (numa quina do polígono o raio local acompanha o passo entre os pontos e cai quando eles se aproximam)`
        : `afaste o laço vizinho, ou ponha um laço a mais que faça a curva da dobra com raio maior que a espessura`;
      avisos.push({
        ref: 'cantoApertado', laco: l.nome, ponto: x.ponto, trecho: x.trecho, direcao: x.direcao, raioMm: Number(x.raio.toFixed(2)), espessuraMm: t, pares: x.pares,
        texto: `com a espessura de ${br(t)} mm, ${x.direcao === 'noLaco' ? 'o canto' : 'a dobra entre laços'} ${ondeNoLaco} tem raio local de ${br(x.raio)} mm, que não chega à espessura (${x.pares} ${x.pares === 1 ? 'par' : 'pares'} de vértices da malha de nível ${niveis} nesse laço), e o passo subdivisao recusaria a chapa; ${resolve}, ou use espessura menor que o raio`,
      });
    }
    conferenciaDaEspessura = { espessuraMm: t, niveis, lado, raioMinimoMm: Number.isFinite(raioMinimo) ? Number(raioMinimo.toFixed(2)) : null };
  }

  const pontos = {};
  for (const k of nomes) pontos[k] = pontosMm[k].map((x) => x / 1000);
  /* o `raio` pedido segue no vinco do passo, em metro como o resto dele, junto da nitidez 0 */
  const emMetro = (r) => (typeof r === 'number' ? r / 1000 : Array.isArray(r) ? r.map((x) => x / 1000) : { de: r.de / 1000, ate: r.ate / 1000 });
  const passo = { vertices: nomes, faces: orientadas, vincos: vincos.map((v) => {
    if (v.raio == null) return v;
    /* o raio REALIZADO: o vinco que ficou sem apoio não leva raio, e o que não coube leva o que a malha tem */
    const gravado = raios?.find((x) => x.vinco === v.nome)?.gravado;
    if (gravado == null) { const { raio: _sem, ...resto } = v; return resto; }
    return { ...v, raio: emMetro(gravado) };
  }) };
  if (cantos.length) passo.cantos = cantos;
  if (medidas) passo.medidas = medidas;
  if (grupos.length) passo.grupos = grupos;
  const nomeDe = (laco, trecho, k = 0) => {
    const r = lacoDe(laco, 'nomeDe'); const i = exigeTrecho(trecho, 'nomeDe');
    if (!Number.isInteger(k) || k < 0 || k >= trechos[i].pontos) falha(`nomeDe: o trecho ${citar(trecho)} tem os pontos 0 a ${trechos[i].pontos - 1}`);
    return nm(r, inicio[i] + k);
  };
  const saida = { pontos, pontosMm, alvosMm, passo, nomeDe, lacos: lacos.map((l) => ({ nome: l.nome, em: l.em, sumiram: l.sumiu })), trechos, avisos };
  if (compensacao) saida.compensacao = compensacao;
  if (raios) saida.raios = raios;
  if (abertos.size) {
    saida.bocas = Object.fromEntries([...abertos].sort((a, b) => a - b).map((r) => [r === 0 ? 'inicio' : 'fim', { laco: lacos[r].nome, em: lacos[r].em, pontos: semRepetir([...Array(N + 1).keys()].map((q) => nm(r, q))) }]));
  }
  if (conferenciaDaEspessura) saida.espessura = conferenciaDaEspessura;
  return saida;
}
