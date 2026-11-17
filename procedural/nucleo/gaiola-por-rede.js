/* gaiola-por-rede.js — monta a gaiola da operação `subdivisao` a partir de uma rede de curvas nomeadas e dos retalhos que elas fecham
 *
 * FICHA gaiolaPorRede
 * serve: gaiola de chapa contínua cujas arestas seguem curvas de feição nomeadas, preenchida por retalhos entre elas.
 * quando: a chapa tem feições que a grade de estações não acompanha (contorno de janela, arco de roda, cintura, borda de vão); em
 *   chapa de seções regulares ao longo de um eixo use gaiolaPorEstacoes, e para uma faixa de seção constante use gaiolaVarrida.
 * unidades: curvas e nós entram em mm; `pontos` sai em metro, para pôr em TOPO.
 * campos:
 *   curvas: [{ nome, pontos, fechada?, poligonal?, vinco?, peso?, exata?, passo?, continuidade? }] pontos são [x, y, z] ou o nome de um nó;
 *     continuidade: 'G1' | 'G2' declara a curva entre dois retalhos emenda lisa de tangente comum (G1) ou de curvatura igual (G2, experimental:
 *     muda a forma de toda superfície de dupla curvatura e sai com aviso).
 *   nos: { nome: [x, y, z] | { curva, fracao } } ponto nomeado onde curvas se encontram; o nó { curva, fracao } fica sobre uma curva.
 *   retalhos: [{ nome, borda, divisoes? }] borda são as curvas (ou { curva, de?, ate? }) que fecham o retalho, de três a oito lados.
 *   passo: espaçamento alvo da rede em mm, de onde saem as divisões que o retalho não declara.
 *   anguloMax: maior desvio de direção, em graus, entre duas arestas seguidas de uma curva (15 por padrão).
 *   fora: [x, y, z] o sentido para onde a chapa olha, que vira as faces.
 *   leitura: true | { peso?, erro?, inclinacao?, estrito? } como em gaiolaPorEstacoes: as curvas vêm de imagem, com erro.
 *   interior: peso da cota dos pontos de dentro dos retalhos (padrão 1); false os deixa sem cota.
 *   liso: true (padrão), false ou { iteracoes, energia, ancora } alisa o miolo para a tangente não quebrar entre retalhos.
 *   anguloDeCanto: desvio em graus a partir do qual o encontro de duas arestas de borda é canto vivo (35 por padrão).
 *   cantos: nomes de nós que ficam canto vivo além dos achados.
 *   simetria: 'x' declara a metade x >= 0, que o passo espelha.
 *   prefixo: texto posto na frente do nome de todo ponto.
 *   alisarCurvas: true | { energia?, rigidez?, tolerancia?, toleranciaPorCurva?, silhueta?, iteracoes?, curvas?, pontosDuros? } tira o ruído
 *     dos pontos-chave das curvas antes de montar a gaiola, com os nós fixos; tolerancia é o maior deslocamento em mm (1 por padrão).
 *   limitesDaEmenda: { tolerancia?, toleranciaPorCurva?, angulo?, razao? } os limites da continuidade declarada, que dão aviso: o quanto a
 *     declaração pode mover a gaiola (mm, 1 por padrão) e o ângulo (0,5 grau) e a razão de curvatura (1,5, na G2) medidos nela.
 *   marcarCurvas: true põe as curvas em `passo.curvas`, e o passo `subdivisao` marca no neutro (`chapas[k].curvas`) as arestas que descendem
 *     de cada uma, para a medida da emenda ler a curva declarada; a malha não muda.
 * devolve: { pontos, passo, linha(curva), pontoDaCurva, linhas, nos, curvas, retalhos, densidades, extraordinarios, avisos, emendas?, ... }.
 * exemplo:
 *   gaiolaPorRede({ passo: 50, fora: [0, 1, 0], nos: { A: [0, 0, 0], B: [200, 0, 0], C: [200, 0, 200], D: [0, 0, 200] },
 *     curvas: [{ nome: 'baixo', pontos: ['A', 'B'] }, { nome: 'direita', pontos: ['B', 'C'] }, { nome: 'cima', pontos: ['C', 'D'] }, { nome: 'esquerda', pontos: ['D', 'A'] }],
 *     retalhos: [{ nome: 'placa', borda: ['baixo', 'direita', 'cima', 'esquerda'] }] })
 * peça: procedural/nucleo/fixtures/gaiola-por-rede-prova.js (chapa lateral de prova, com janela em gota, arco de roda e coluna).
 * FIM DA FICHA
 *
 * Função pura, sem Three.js e sem domínio. Na modelagem de carroceria a superfície se define pelas curvas de feição (contorno da janela,
 * arco da roda, cintura, linha do teto, bordas dos vãos) e se preenche entre elas. A gaiola por estações é uma grade de fatias que essas
 * feições cruzam; aqui as arestas da gaiola SEGUEM as curvas. A receita declara as curvas e quais curvas fecham cada retalho; o ajudante
 * devolve os pontos, as faces, os vincos, os cantos e as medidas em nomes, no formato que o passo `subdivisao` aceita, como o faz
 * `gaiolaPorEstacoes`. Nenhum índice sai da receita.
 *
 * UNIDADES. As curvas e os nós entram em mm, como a `TABELA`; `pontos` sai em metro, como `TOPO`.
 *
 * curvas: [{ nome, pontos, fechada?, poligonal?, vinco?, peso?, exata?, passo?, continuidade? }]
 *   pontos: os pontos-chave da curva, cada um [x, y, z] em mm ou o NOME de um nó (texto). A curva é a Catmull-Rom centrípeta por eles
 *     (a mesma de `gaiola-interpolada.js`: passa por todos os pontos-chave e não faz laço nem bico dentro de um trecho), medida pelo
 *     comprimento de arco: toda fração de curva neste arquivo é fração do comprimento, de 0 a 1. `fechada: true` fecha a volta (na
 *     fechada o último ponto não repete o primeiro). `poligonal: true` toma os pontos como os vértices de uma polilinha, e a curva é a poligonal
 *     (trechos retos, com os cantos nos pontos); um canto da poligonal pede nó, porque o arco que o atravessa vira de uma vez e sai em
 *     `curvaturaConcentrada`.
 *   vinco: nitidez de 0 a 1 ou 'viva' (ou nome de PARAMS): a curva vira vinco nomeado da subdivisão ao longo de todas as suas arestas.
 *   peso | exata: a cota dos pontos da curva na superfície. Com `exata: true`, ou sem peso nem `leitura`, a superfície passa por eles;
 *     com `peso` (número ou nome de PARAMS) ela só os aproxima por mínimos quadrados, o que serve ao dado lido de imagem, com erro.
 *     No nó em que duas curvas se encontram vale o maior peso, e a cota exata vence.
 *   passo: o espaçamento alvo (mm) desta curva, no lugar do `passo` da rede.
 *   continuidade: 'G1' ou 'G2', a emenda declarada, descrita em A EMENDA DECLARADA. Não vale com vinco.
 * nos: { nome: [x, y, z] | { curva, fracao } }
 *   Um nó é um ponto nomeado onde curvas se encontram. O nó dado por coordenada é o ponto-chave de toda curva que o cita pelo nome; o nó
 *   dado por { curva, fracao } fica sobre essa curva, à fração do comprimento, e as outras curvas o citam como ponto-chave (é o
 *   cruzamento em T de uma curva que termina noutra). O nó parte a curva em arcos. A curva aberta tem nó nas duas pontas (anônimo, se
 *   a ponta é coordenada); duas pontas na mesma coordenada são o mesmo nó. O nó que não está nas curvas por declaração não parte nada.
 * retalhos: [{ nome, borda, divisoes? }]
 *   borda: os lados do retalho em volta, cada um uma curva inteira ('teto'), ou { curva, de?, ate? } com `de` e `ate` o nome de um nó
 *     da curva ou uma fração do comprimento. Na curva aberta, o lado vai de `de` a `ate` pela curva, em qualquer ordem (omitidos, são as
 *     pontas); na fechada o lado vai de `de` a `ate` no sentido da curva, e os dois são obrigatórios. O sentido dos lados e do retalho o
 *     ajudante acha: cada lado começa onde o anterior termina, e o último fecha no começo do primeiro. Um lado pode passar por nós onde
 *     outras curvas terminam (a curva que o vizinho vê em dois arcos), e então o retalho tem lados de vários arcos. Quatro lados dão
 *     um retalho de quadriláteros; três e cinco (até oito) dão um centro com um quadrilátero por lado, e o centro é vértice extraordinário.
 *   divisoes: opcional. Quatro lados: [nU, nV] (nU para o primeiro e o terceiro lado, nV para os outros dois) ou um só número; três, cinco
 *     ou mais lados: um número par, o mesmo em todos. Sem ele a densidade sai do `passo`.
 * passo: o espaçamento alvo em mm da rede inteira; anguloMax: o maior desvio de direção em graus entre duas arestas seguidas de uma curva
 *   (15 por padrão), que adensa as curvas fechadas (a ponta da janela). O alvo de um arco é o maior dos dois. As divisões de cada arco saem
 *   de um sistema inteiro: os lados opostos do retalho de quatro lados somam o mesmo, os lados do retalho de três ou cinco somam o mesmo
 *   número par, e o arco compartilhado tem as mesmas divisões nos dois retalhos, por serem os mesmos pontos. O sistema escolhe, entre as
 *   soluções inteiras, a mais perto do alvo, e `densidades` traz o que saiu; o que o sistema não consegue, ele diz com os nomes.
 * fora: [x, y, z]: o sentido para onde a chapa olha. As faces saem consistentes entre retalhos (cada aresta compartilhada é percorrida
 *   nos dois sentidos) e viradas para `fora`; sem `fora`, o sentido do primeiro retalho vale para os conexos a ele.
 * leitura: true | { peso?, erro?, inclinacao?, estrito? }, como em `gaiolaPorEstacoes`: as curvas vêm de leitura de imagem, e a cota sem
 *   `peso` ganha o peso da leitura (1) em vez de ser exata; dois pontos-chave da mesma curva mais perto do que o erro sustenta
 *   (2 × erro ÷ inclinacao, 40 mm nos padrões) saem em `avisos`.
 * interior: o peso da cota dos pontos de dentro dos retalhos (número maior que zero), que seguem a superfície que o preenchimento
 *   desenhou; false deixa-os sem cota. Padrão 1, o desvio ao preenchimento pesa o mesmo que o deslocamento de um ponto da gaiola.
 * liso: true (padrão), false ou { iteracoes (2), energia ('variacao' ou 'placa'), ancora }: o alisamento do miolo, descrito em A CONTINUIDADE.
 * anguloDeCanto: o desvio de direção (graus, 35 por padrão) a partir do qual o encontro de duas arestas de borda é canto vivo; cantos:
 *   nomes de nós que ficam canto vivo além dos achados. simetria: 'x', como em `gaiolaPorEstacoes`. prefixo: texto posto na frente dos nomes.
 * alisarCurvas: true | { energia, rigidez, tolerancia, toleranciaPorCurva, silhueta, iteracoes, curvas, pontosDuros }: o alisamento das curvas declaradas, descrito
 *   em O ALISAMENTO DAS CURVAS. Sem ele (o padrão), as curvas passam pelos pontos-chave como foram escritos.
 * limitesDaEmenda: { tolerancia, toleranciaPorCurva: { curva: mm }, angulo, razao }: os limites da emenda declarada, descritos em A EMENDA
 *   DECLARADA; vale só com uma curva com `continuidade`.
 * marcarCurvas: true acrescenta ao passo `curvas`, um { nome, pontos, continuidade? } por trecho usado de cada curva (os nomes de ponto ao
 *   longo dele, como os de `vincos`), que o passo `subdivisao` leva à malha e grava no neutro, em `chapas[k].curvas`, sem mudar a geometria:
 *   é o que deixa a medida da emenda achar a curva declarada, que a malha sozinha não carrega. Sem ela (o padrão), o passo é o de sempre.
 *
 * O PREENCHIMENTO. Os pontos da borda de cada retalho são os das curvas, à mesma distância de arco um do outro em cada arco.
 * No retalho de quatro lados o interior é a interpolação transfinita de Coons: P(u, v) = (1-v) A(u) + v C(u) + (1-u) D(v) + u B(v)
 * menos a interpolação bilinear dos quatro cantos, com u e v o índice da divisão sobre o número delas, de modo que o ponto da borda
 * é o da curva exatamente e a função aditiva (a calota de duas curvaturas) sai exata. No retalho de n lados o centro é a média dos
 * cantos e dos meios dos lados, mais a flecha média dos meios fora da superfície sobre 1/sen²(π/n) (exata para uma forma quadrática e um
 * polígono regular); cada raio do centro ao meio de um lado é a parábola da flecha do lado, escalada pelo quadrado do comprimento, e os
 * n quadriláteros são retalhos de Coons de dois lados de curva e dois raios.
 *
 * A CONTINUIDADE. Os pontos da borda são compartilhados, e a superfície limite da subdivisão é C1 em toda aresta que não é vinco, de modo
 * que a tangente não quebra no lado compartilhado, salvo na curva declarada vinco. Mas dois preenchimentos de Coons só se encontram em
 * posição: cada retalho sai da curva com a inclinação que tira das quatro curvas dele, a gaiola chega com uma dobra de alguns graus ao
 * longo da curva compartilhada, e a subdivisão a deixa como um calombo de décimos de milímetro (0,36 mm na chapa de prova, com a face de
 * 40 mm). Por isso, com `liso` (padrão), o miolo dos retalhos é alisado pela normal antes da subdivisão (`gaiola-por-rede-liso.js`): cada
 * ponto de dentro se desloca ao longo da normal do preenchimento, de modo a minimizar a variação do laplaciano da gaiola, que é nula
 * nas formas de curvatura constante e por isso conserva a curvatura do preenchimento e tira só o salto na curva compartilhada. A curva
 * vinco e a borda livre ficam de fora, e a dobra declarada continua dobra. `liso: false` deixa o preenchimento de Coons como saiu, e
 * `liso: { iteracoes, energia, ancora }` ajusta o alisamento. A gaiola traz em `continuidade` o salto de tangente de cada curva
 * compartilhada (o ângulo entre as normais das faces da gaiola dos dois lados, em graus; numa superfície lisa sobra a curvatura entre as
 * faces) e em `alisamento` o maior deslocamento.
 *
 * O ALISAMENTO DAS CURVAS. O `liso` alisa o miolo com as curvas fixas, e por isso não alcança a ondulação que nasce da digitação ponto a
 * ponto das curvas: o preenchimento herda a curvatura delas. Com `alisarCurvas`, cada curva escolhida (`curvas`, todas as que não são
 * poligonais por padrão) tem os pontos-chave alisados por `alisarPontosDaCurva` (`alisar-curvas.js`) antes de a Catmull-Rom passar por
 * eles. A energia é o resíduo do ajuste polinomial local (a quinta diferença dividida no parâmetro da corda, zero em toda quártica), que
 * pesa o ruído que troca de sinal de um ponto para o outro e quase não pesa a forma de curvatura variável amostrada com folga: a
 * clotoide, a senoide, a hélice, a seção em quarto de elipse e a elipse com o raio da ponta em sete espaçamentos, limpas, andam menos de
 * 0,3 mm. O que muda num comprimento da ordem do espaçamento (a ponta de raio pequeno com poucos pontos, o arco de corda muito desigual)
 * não se distingue do ruído e anda até a tolerância; a ficha de `alisarPontosDaCurva` dá os números. Ficam onde estão, bit a bit, os nós (o ponto-chave escrito como nome), as pontas da curva aberta e
 * os pontos que `pontosDuros: { curva: [k] }` declara (k é a posição na lista de pontos da curva); o nó em `cantos`, e todo ponto-chave
 * onde a poligonal dos pontos-chave vira mais que `anguloDeCanto`, parte a curva em trechos alisados à parte: no nó o ângulo é o dos
 * vizinhos, e no ponto-chave numérico o das cordas até 20 tolerâncias de cada lado, que o ruído da ordem da tolerância não vira. O
 * limite dessa medida: dois cantos a menos de 20 tolerâncias um do outro (o V estreito, o friso, o degrau curto) ou um canto a menos
 * disso da ponta da curva aberta não são achados, e o alisamento os arredonda até a tolerância (no V de 90 graus com ponto a cada 10 mm
 * e tolerância de 2,5, os cantos dos lados andam 2,1 mm; no par de V a 40 mm, 2,5 mm, no limite). O remédio é escrever o ponto do canto
 * como nó e pôr o nó em `cantos`: o V e o par de V ficam onde estão; `pontosDuros` não basta, porque a energia atravessa o ponto duro
 * e arredonda os vizinhos. A curva que bate na tolerância, ou anda mais que metade dela, sai com aviso (`alisamentoNoLimite`,
 * `alisamentoAndou`) em `avisos`, com esse remédio. Nenhum ponto anda mais que
 * `tolerancia` mm (1 por padrão), ou que a da curva em `toleranciaPorCurva: { curva: mm }`, e com `silhueta: { vista, tolerancia }` o
 * deslocamento visto pela vista ('x', 'y' ou 'z', o eixo para onde a vista olha) não passa da tolerância dela: as curvas lidas da prancha
 * ficam na silhueta dela, e o que se mexe é a profundidade. Com `simetria: 'x'`, o ponto-chave em x = 0 fica com x = 0 e nenhum vai a
 * x < 0; se a curva entre eles passa do plano, a recusa de x < 0 diz quanto o alisamento a mexeu. `energia` ('quartica' ou 'cubica'),
 * `rigidez` (1) e `iteracoes` (2) vão para `alisarPontosDaCurva`. A saída ganha `alisamentoDasCurvas`, com as opções, e por curva a
 * tolerância, os pontos duros, os de corte, os limitados, os pontos-chave alisados (mm), o deslocamento de cada um em mm e a energia antes
 * e depois. O nó dado por { curva, fracao } fica na curva alisada. Sem a opção, nada muda.
 *
 * A EMENDA DECLARADA. Sem declaração a emenda lisa sai como o alisamento do miolo a deixa: a variação do laplaciano espalha pelo retalho
 * inteiro o salto de curvatura que a curva compartilhada tiver (na chapa de prova de razão 3, a superfície sai 1,3 mm fora da desenhada), as
 * curvas que terminam no nó da emenda, uma de cada lado, chegam a ele cada uma com a tangente da própria ponta (a do ponto refletido), e o
 * limite da subdivisão, exato na curva e de peso 1 no miolo, afunda alguns centésimos ao lado dela; a leitura de um lado só de
 * `continuidade-nas-emendas.mjs` acusa ali até 0,8 grau. Com `continuidade` na curva:
 *   - as curvas que terminam num nó dela (o ponto-chave escrito como nome, ou o nó { curva, fracao } sobre ela), emendadas ou não, se
 *     casam aos pares pela direção com que saem do nó, do par mais reto ao mais dobrado, e o par que atravessa outra curva emendada (as
 *     de baixo e de cima das chapas emendadas, ou duas curvas emendadas que se encontram ponta com ponta no nó de uma terceira) se junta
 *     quando o desvio entre as duas fica abaixo de `anguloDeCanto` (ou dos 35 graus do padrão, com anguloDeCanto: false) e o nó não está
 *     em `cantos`: o trecho da ponta de cada uma usa o ponto-chave vizinho do nó na outra, como a Catmull-Rom de uma curva só pelos dois,
 *     e a tangente no nó é a mesma (`juncoes`). O desvio se confere pelos pontos-chave dados, e o vizinho que é nó { curva, fracao } entra
 *     pela posição na curva dele; a que dobra sai em `emendaDobrada` e a que fica sem par, em `emendaSemPar`, sem a junção. Dois pares
 *     que disputam a mesma ponta com desvios a menos de 1 grau um do outro empatam: nenhum se junta, com `emendaEmpate`, e a gaiola não
 *     depende da ordem das curvas. O par reto sem outra emendada no nó é a continuação da emenda (a curva não emendada que segue a
 *     emendada não é curva sem par); entre duas curvas emendadas que se continuam assim não há junção, e a quebra entre elas acima de
 *     `limitesDaEmenda.angulo` sai em `emendaQuebrada`;
 *   - os pontos de dentro dos dois retalhos a até duas arestas da curva (a faixa) ganham a cota da curva (exata, ou o peso dela, se for
 *     maior que o do miolo);
 *   - no alisamento do miolo, a G1 tira do laplaciano, como o vinco, o ponto da curva que tem três fileiras de miolo livre de cada lado (cada
 *     lado guarda a curvatura dele; na faixa estreita entre duas curvas a curva fica no laplaciano, que é o que segura a fileira ali), e
 *     prende a inclinação dos dois lados uma à outra: a de cada lado é a da parábola pelo ponto da curva e pelas duas fileiras seguintes,
 *     exata em seção de curvatura constante, e o termo, na unidade do laplaciano, pesa 100 vezes uma aresta da variação; a G2 deixa a curva
 *     no laplaciano, pesa a variação mil vezes mais nas arestas da faixa e põe o mesmo termo da tangente. A âncora do alisamento se mede
 *     sem esses pesos.
 * A G2 É EXPERIMENTAL. O peso mil da variação na faixa (PESO_DA_CURVATURA) é o que muda a forma: ele quer a curvatura constante na faixa
 * nas duas direções, e toda superfície de dupla curvatura sai do lugar, mesmo com a curvatura igual dos dois lados (no paraboloide de raio
 * 0,3 m a gaiola anda 17,8 mm com o peso mil, 11,9 com 100, 3,4 com 10 e 0,5 com 1, o mesmo da G1; na chapa de prova `emenda-dupla`, de
 * raio 0,6 m, 22,2 mm, e a curvatura lida troca de sinal), empurra o salto de curvatura para a borda da faixa e, na curva fechada, dobra faces. Por isso toda
 * curva G2 sai com `emendaG2Experimental` em `avisos` e `experimental: true` em `emendas`, e a dobra que ela causa recusa a rede dizendo
 * isso, em vez de mandar declarar liso: false, que a emenda não aceita. A formulação nova da G2 é da fatia 5 do plano.
 * Na chapa de prova de razão de curvatura 3 com G1, a leitura vai de 0,83 a 0,04 grau, e a superfície, a até 60 mm da emenda, fica a
 * 0,18 mm da desenhada (1,24 mm sem a declaração); na de curvatura igual com G2, de 0,39 a 0,03 grau com a razão 1. Na de dupla
 * curvatura com G1, de 1,39 a 0,38 grau, com a gaiola a 0,22 mm da que sai sem a declaração; na seção em S (inflexão na emenda) com G1,
 * de 0,43 a 0,17 grau, e a superfície vai de 2,6 a 0,24 mm da desenhada. O ponto da curva de valência diferente de 4 (de 3 na borda) é
 * vértice extraordinário, onde a subdivisão é no máximo G1: fica fora do termo da tangente, e na G2 sai em `emendaG2NoExtraordinario`. A
 * curva emendada precisa de um arco entre dois retalhos e do `liso` ligado; a curva no plano de simetria (`simetria: 'x'`) é borda de um
 * retalho só, e o outro lado dela é a metade espelhada, que a subdivisão emenda: ali a declaração é recusada dizendo isso.
 * A saída ganha `emendas`, por curva: a continuidade (e `experimental` na G2), os lados, as junções, os pontos com as duas fileiras, os que
 * a parábola não descreve (`semMedida`: a seção sobe mais que meia distância, a fileira entorta), os que só as curvas definem
 * (`dasCurvas`: o cruzamento com outra curva, onde nenhuma fileira de um lado é miolo que se move, e a tangente é a que as curvas dão), os
 * medidos (`medidos`), o tamanho da faixa, os extraordinários e, na gaiola alisada, o maior ângulo entre as tangentes dos dois lados e a
 * razão das curvaturas pela mesma parábola, com sinal: a maior curvatura sobre a menor, as duas com o piso de 0,1 1/m (abaixo dele as
 * duas, a razão é 1), negativa quando a curvatura salta de sinal na emenda (o S de dois arcos, que a G2 não iguala), e a maior é a do
 * maior salto relativo. O salto de sinal pede as curvaturas da parábola com sinais opostos e, quando há a terceira fileira dos dois lados,
 * também as da cúbica pelo ponto da curva e pelas três fileiras, que dão a curvatura na própria curva: na inflexão lisa (y = c x³) ela é
 * perto de zero dos dois lados, e a razão fica positiva. Sem ponto medido, o ângulo e a razão saem null, com `emendaSemMedida`.
 * A saída traz também o deslocamento que a declaração causa. A referência de cada curva emendada é a mesma rede sem a declaração dela
 * (as outras ficam), montada com as mesmas divisões, fora da captura e sem referências próprias, e o maior deslocamento na gaiola
 * inteira sai em `deslocamentoMaximoMm` com `deslocamentoDe: 'curva'`. Com mais de quatro curvas emendadas a referência é uma só, sem
 * declaração nenhuma (`deslocamentoDe: 'conjunto'`, o deslocamento nos retalhos dos dois lados), e o aviso é um só, do conjunto, com as
 * curvas declaradas em volta do ponto que mais anda; a referência que não monta deixa null e `emendaSemReferencia`. Pelo padrão de
 * `alisarCurvas`, `limitesDaEmenda` dá a tolerância desse deslocamento (1 mm, ou a da curva em `toleranciaPorCurva`), e a curva que passa
 * dela sai com `emendaMoveu`; o ângulo acima de `angulo` (0,5 grau, o do gate das chapas) e, na G2, a razão negativa ou acima de `razao`
 * (1,5) saem com `emendaAcimaDoLimite`. Sem a declaração, nada muda.
 *
 * Os vértices extraordinários (valência diferente de 4 no interior, de 2 a 3 na borda) saem declarados, pelo nome, em `extraordinarios`:
 * os nós onde três ou cinco retalhos se encontram, os centros dos retalhos de n lados e o que a borda deixar.
 *
 * ORIGENS, ENTRADAS E ESTRUTURA. Informação a mais na saída, para quem edita a gaiola por nome (as ferramentas de alisamento, de ondulação e de
 * vincos), como em `gaiolaPorEstacoes`, sem mudar a gaiola, a malha nem o passo. `origens` dá, de cada ponto, de onde ele vem:
 * { tipo: 'chave', no, entrada, curvas: [{ curva, pontoChave }] } para o ponto-chave declarado (o nó dado por coordenada, ou a ponta de curva escrita
 * em coordenada); { tipo: 'noNaCurva', no, curva, fracao, pontosChave } para o nó dado por { curva, fracao }; { tipo: 'curva', curva, fracao, entre,
 * pontosChave } para o ponto amostrado dentro de um arco de curva (`entre` são os dois pontos-chave que o cercam); { tipo: 'retalho', retalho,
 * curvas, pontosChave } para o ponto de dentro de um retalho, que sai do preenchimento das curvas da borda dele. `pontosChave` são as
 * entradas de que o ponto depende, por nome. `entradas` lista os valores editáveis, em metro como `pontos`: cada coordenada do ponto-chave
 * escrito em coordenada numa curva ('curva[k].x', com k a posição na lista de pontos da curva) e de cada nó dado por coordenada
 * ('no:nome.x'); o nó dado por { curva, fracao } e o ponto de dentro de um arco ou de um retalho não têm entrada própria. `estrutura`
 * é o resumo do que não é entrada (a definição sem as coordenadas, as divisões de cada arco e as curvas de cada nó), para comparar duas
 * execuções. `fixacao` traz as divisões de cada arco e a posição relativa de cada ponto dentro do arco, que `comDivisoesFixas` (`gaiola-captura.js`) devolve
 * à rede para ela sair com a mesma malha depois de mexer nas entradas. `capturarGaiolas(fn)` (`gaiola-captura.js`) devolve as saídas montadas durante `fn`.
 *
 * gaiolaPorRede(definicao) -> { pontos, passo, linha(curva, de?, ate?), pontoDaCurva(curva, fracao), linhas, nos, curvas, retalhos, densidades, extraordinarios,
 *                               cantos, continuidade, alisamento, avisos, origens, entradas, estrutura, emendas? }
 * `pontos` vai para TOPO e `passo` se espalha no passo `subdivisao`. `linha(curva, de, ate)` devolve os nomes dos pontos ao longo da
 * curva (da fechada inteira, com o primeiro repetido no fim): é a linha que o `friso` percorre. Os nomes dos pontos de dentro de um arco
 * dependem da densidade, e por isso a receita não os cita: cita a curva, o nó ou o retalho. */

import { alteracoesDaRede, assinaturaDaRede, capturarGaiolas, comAlteracoesNaRede, comDivisoesFixas, divisoesFixadas, registrarGaiola } from './gaiola-captura.js';
import { curvaCentripeta } from './gaiola-interpolada.js';
import { extraordinarios as extraordinariosDa } from './gaiola-aneis.js';
import { alisarMioloNaNormal, LONGE_DA_FILEIRA, INCLINACAO_DA_FILEIRA } from './gaiola-por-rede-liso.js';
import { alisarPontosDaCurva, conferirTolerancia, lerOpcoesDoAlisamento } from './alisar-curvas.js';

const MM = 1000;
const AMOSTRAS_POR_TRECHO = 96;
/* a distância, em tolerâncias do alisamento, até onde a corda que mede o canto de um ponto-chave vai (`alisarCurvas`) */
const ESCALA_DO_CANTO = 20;
/* a fração da tolerância acima da qual a curva alisada ganha aviso */
const FRACAO_DO_AVISO = 0.5;
const AMOSTRAS_DE_ANGULO = 24;
const TOLERANCIA_DA_FRACAO = 1e-9;
const MAIOR_RETALHO = 8;
const ANGULO_MAX_PADRAO = 15;
const ANGULO_DE_CANTO_PADRAO = 35;
const LEITURA_PADRAO = Object.freeze({ peso: 1, erro: 2, inclinacao: 0.1, estrito: false });
const INTERIOR_PADRAO = 1;
const ITERACOES_DO_LISO = 2;
const RAZAO_DO_AVISO = 3;
const ANGULO_QUASE_RETO = 160;
const ANGULO_AGUDO = 25;
/* A EMENDA DECLARADA (`continuidade` na curva): G1 é o plano tangente comum, com a curvatura de cada lado livre; G2, também a curvatura
   igual dos dois lados. */
const CONTINUIDADES = ['G1', 'G2'];
/* as fileiras da gaiola de cada lado da curva emendada cujos pontos de dentro ganham a cota da curva: a superfície limite segue o
   preenchimento ali, sem o afundamento entre a curva exata e o miolo de peso 1 que a leitura de um lado só lê como dobra */
const FAIXA_DA_EMENDA = 2;
/* o peso, contra o de uma aresta da variação do laplaciano, da tangente comum (G1) e da variação dentro da faixa (G2) no alisamento do miolo */
const PESO_DA_TANGENTE = 100;
const PESO_DA_CURVATURA = 1000;
/* o piso da curvatura (1/m) na razão da emenda medida na gaiola, o mesmo de `continuidade-nas-emendas.mjs` */
const PISO_DA_RAZAO = 0.1;
/* os limites da emenda declarada (`limitesDaEmenda`): o deslocamento da gaiola pela declaração (mm, o padrão de `alisarCurvas`), e o
   ângulo (graus) e a razão de curvatura medidos na gaiola, os limiares de `continuidade-nas-emendas.mjs` */
const LIMITES_DA_EMENDA_PADRAO = Object.freeze({ tolerancia: 1, angulo: 0.5, razao: 1.5 });
/* a diferença de desvio (graus) abaixo da qual dois pares que disputam a mesma ponta no nó da emenda empatam: nenhum se junta */
const EMPATE_DA_JUNCAO = 1;
/* até quantas curvas emendadas o deslocamento de cada uma se mede pela referência que tira só a declaração dela; acima, pela do conjunto */
const REFERENCIAS_POR_CURVA = 4;

const citar = (n) => `'${n}'`;
const lista = (nomes) => nomes.map(citar).join(', ');
const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const soma = (u, v) => [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
const vezes = (u, s) => [u[0] * s, u[1] * s, u[2] * s];
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const norma = (u) => Math.hypot(u[0], u[1], u[2]);
const finito3 = (p) => Array.isArray(p) && p.length === 3 && p.every((x) => typeof x === 'number' && Number.isFinite(x));
const chaveDaPosicao = (p) => p.map((x) => x.toFixed(6)).join(',');
const chaveDeAresta = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
const br = (x) => String(Math.round(x * 100) / 100).replace('.', ',');

function falha(texto) { throw new TypeError(`gaiola por rede: ${texto}`); }

/* a rede de referência da emenda declarada (a mesma rede sem a declaração de uma curva, ou de todas) se monta sem as próprias referências */
let montandoReferencia = false;

function exigirCampos(objeto, permitidos, onde) {
  if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) falha(`${onde} precisa ser objeto`);
  const extra = Object.keys(objeto).filter((k) => !permitidos.includes(k));
  if (extra.length) falha(`${onde} tem campo desconhecido ${lista(extra)}; os campos são ${permitidos.join(', ')}`);
}

/* ------------------------------------------------------------------ curvas */

/* A curva por comprimento de arco: ponto(f) à fração f do comprimento, `fracaoDaChave(k)` a fração do k-ésimo ponto-chave. Na aberta a
   Catmull-Rom centrípeta de `gaiola-interpolada.js`; na fechada, a mesma sobre a lista estendida pelos vizinhos de cada lado, de modo
   que o trecho de volta ao começo tem os pontos vizinhos certos. */
/* A CURVA COM OS MESMOS PONTOS-CHAVE SAI UMA VEZ. Quem edita a rede (o alisamento, a sonda de cada número) refaz a gaiola dezenas
   de vezes mexendo num ponto-chave de cada vez, e as outras curvas voltam idênticas: a tabela de comprimentos, a Catmull-Rom e o
   monitor delas são só função dos pontos-chave, e refazê-los era um quarto do tempo da gaiola. O que se guarda são as funções (que
   não mudam depois de prontas); cada chamada devolve um objeto novo, porque quem chama grava `decl` e `monitor` nele. */
const curvasFeitas = new Map();
const CURVAS_GUARDADAS = 512;
const chaveDaCurva = (nome, chaves, fechada, poligonal) => `${nome}|${fechada ? 1 : 0}${poligonal ? 1 : 0}|${chaves.map((p) => p.map((x) => (Object.is(x, -0) ? '-0' : String(x))).join(',')).join(';')}`;

function criarCurva(nome, chaves, fechada, poligonal = false, antes = null, depois = null) {
  const vizinhos = antes || depois ? `|${[antes, depois].map((p) => (p ? p.map(String).join(',') : '-')).join(';')}` : '';
  const chave = chaveDaCurva(nome, chaves, fechada, poligonal) + vizinhos;
  let feita = curvasFeitas.get(chave);
  if (!feita) {
    feita = criarCurvaSemMemoria(nome, chaves, fechada, poligonal, antes, depois);
    curvasFeitas.set(chave, feita);
    if (curvasFeitas.size > CURVAS_GUARDADAS) curvasFeitas.delete(curvasFeitas.keys().next().value);
  }
  return { nome, fechada, chaves, comprimento: feita.comprimento, em: feita.em, fracaoDaChave: feita.fracaoDaChave };
}

/* `antes` e `depois`: na curva aberta, o ponto-chave que vem antes do primeiro e depois do último na curva emendada do outro lado do nó
   (`continuidade`). Sem eles o trecho da ponta usa o ponto refletido, como a Catmull-Rom de `gaiola-interpolada.js`; com eles, o mesmo
   trecho que a curva única pelos dois teria, e a tangente no nó é a mesma nas duas. */
function criarCurvaSemMemoria(nome, chaves, fechada, poligonal = false, antes = null, depois = null) {
  const n = chaves.length;
  let base; let primeiro; let trechos;
  if (poligonal) {
    if (fechada && n < 3) falha(`a curva fechada ${citar(nome)} precisa de três pontos-chave ou mais`);
    base = { ponto: (i, t) => { const a = chaves[i % n]; const b = chaves[(i + 1) % n]; return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])]; } };
    primeiro = 0; trechos = fechada ? n : n - 1;
  } else if (fechada) {
    if (n < 3) falha(`a curva fechada ${citar(nome)} precisa de três pontos-chave ou mais`);
    base = curvaCentripeta([chaves[n - 1], ...chaves, chaves[0], chaves[1]], nome);
    primeiro = 1; trechos = n;
  } else if (antes || depois) {
    base = curvaCentripeta([...(antes ? [antes] : []), ...chaves, ...(depois ? [depois] : [])], nome);
    primeiro = antes ? 1 : 0; trechos = n - 1;
  } else {
    base = curvaCentripeta(chaves, nome);
    primeiro = 0; trechos = n - 1;
  }
  const acum = [0]; const params = [[primeiro, 0]];
  let anterior = base.ponto(primeiro, 0);
  const noInicioDoTrecho = [0];
  for (let i = 0; i < trechos; i++) {
    for (let k = 1; k <= AMOSTRAS_POR_TRECHO; k++) {
      const q = base.ponto(primeiro + i, k / AMOSTRAS_POR_TRECHO);
      acum.push(acum[acum.length - 1] + norma(sub(q, anterior))); params.push([primeiro + i, k / AMOSTRAS_POR_TRECHO]);
      anterior = q;
    }
    noInicioDoTrecho.push(acum[acum.length - 1]);
  }
  const comprimento = acum[acum.length - 1];
  const em = (fr) => {
    let f = fr;
    if (fechada) { f -= Math.floor(f); } else { f = Math.min(1, Math.max(0, f)); }
    if (f <= 0) return [...chaves[0]];
    if (f >= 1) return [...chaves[fechada ? 0 : n - 1]];
    const alvo = f * comprimento;
    let lo = 0; let hi = acum.length - 1;
    while (hi - lo > 1) { const meio = (lo + hi) >> 1; if (acum[meio] < alvo) lo = meio; else hi = meio; }
    const a = (alvo - acum[lo]) / (acum[hi] - acum[lo]);
    const [i1, s1] = params[hi]; const s0 = params[lo][0] === i1 ? params[lo][1] : 0;
    return base.ponto(i1, s0 + a * (s1 - s0));
  };
  const fracaoDaChave = (k) => (k >= trechos ? 1 : noInicioDoTrecho[k] / comprimento);
  return { nome, fechada, chaves, comprimento, em, fracaoDaChave };
}

/* O desvio de direção total (graus) da curva entre as frações f0 e f1: a soma do ângulo entre as cordas seguidas. */
function giroDoArco(curva, f0, f1) {
  let total = 0; let anterior = null; let p = curva.em(f0);
  for (let k = 1; k <= AMOSTRAS_DE_ANGULO; k++) {
    const q = curva.em(f0 + (f1 - f0) * k / AMOSTRAS_DE_ANGULO);
    const d = sub(q, p);
    const l = norma(d);
    if (l > 0) {
      const u = vezes(d, 1 / l);
      if (anterior) total += Math.acos(Math.max(-1, Math.min(1, dot(anterior, u)))) * 180 / Math.PI;
      anterior = u;
    }
    p = q;
  }
  return total;
}

/* O espaçamento que a curva pede em cada ponto, e como distribuir as divisões de um arco por ele.
   O espaçamento desejado em cada ponto é o menor de dois: o `passo` e o que faz a curva virar `anguloMax` por divisão (anguloMax ÷
   curvatura). O campo de espaçamento é então limitado em declive: de um ponto ao outro ele só cresce `GRADO` mm por mm de
   curva, o que dá uma gradação suave, do espaçamento fino da ponta de raio pequeno ao grosso da reta (o mínimo, sobre os pontos j, de
   espaçamento_j + GRADO × distância). O monitor é o inverso do espaçamento, e as divisões de um arco ficam a quantias iguais da integral
   dele: o arco de n divisões tem os pontos mais juntos onde a curva vira ou onde o vizinho é fino, sem nó nem curva a mais, e a integral
   do monitor sobre o arco é o número de divisões que ele pediria. */
const AMOSTRAS_DO_MONITOR_POR_MM = 2;
const GRADO = 0.4;

const monitoresFeitos = new WeakMap();

/* O monitor de uma curva é função dela e de dois números; a curva guardada acima tem sempre a mesma `em`, que serve de chave. */
function criarMonitor(c, teto, anguloMaxGraus) {
  let porNumeros = monitoresFeitos.get(c.em);
  if (!porNumeros) { porNumeros = new Map(); monitoresFeitos.set(c.em, porNumeros); }
  const chave = `${teto}|${anguloMaxGraus}`;
  let monitor = porNumeros.get(chave);
  if (!monitor) { monitor = criarMonitorSemMemoria(c, teto, anguloMaxGraus); porNumeros.set(chave, monitor); }
  return monitor;
}

function criarMonitorSemMemoria(c, teto, anguloMaxGraus) {
  const N = Math.min(8000, Math.max(200, Math.ceil(c.comprimento * AMOSTRAS_DO_MONITOR_POR_MM)));
  const P = Array.from({ length: N + 1 }, (_, i) => c.em(i / N));
  const d = Array.from({ length: N }, (_, i) => norma(sub(P[i + 1], P[i])));
  const direcao = (i) => { const v = sub(P[i + 1], P[i]); const l = norma(v); return l > 0 ? vezes(v, 1 / l) : [0, 0, 0]; };
  const curvatura = new Array(N + 1).fill(0);
  const ang = (i, j) => Math.acos(Math.max(-1, Math.min(1, dot(direcao(i), direcao(j)))));
  for (let i = 0; i <= N; i++) {
    let antes = i - 1; let depois = i;
    if (i === 0) { if (c.fechada) antes = N - 1; else { antes = 0; depois = 1; } }
    if (i === N) { if (c.fechada) depois = 0; else { antes = N - 2; depois = N - 1; } }
    const comp = (d[antes] + d[depois]) / 2;
    curvatura[i] = comp > 0 ? ang(antes, depois) / comp : 0;
  }
  const h = curvatura.map((k) => Math.min(teto, k > 0 ? (anguloMaxGraus * Math.PI / 180) / k : teto));
  const voltas = c.fechada ? 2 : 1;
  for (let v = 0; v < voltas; v++) {
    for (let i = 1; i <= N; i++) h[i] = Math.min(h[i], h[i - 1] + GRADO * d[i - 1]);
    if (c.fechada) h[0] = Math.min(h[0], h[N], h[N - 1] + GRADO * d[N - 1]);
    for (let i = N - 1; i >= 0; i--) h[i] = Math.min(h[i], h[i + 1] + GRADO * d[i]);
    if (c.fechada) h[N] = Math.min(h[N], h[0]);
  }
  const M = [0];
  for (let i = 0; i < N; i++) M.push(M[i] + 0.5 * (1 / h[i] + 1 / h[i + 1]) * d[i]);
  const total = M[N];
  /* M(f): a integral até a fração f (na curva fechada, f passa de 1 e a integral continua) */
  const integral = (f) => {
    const volta = c.fechada ? Math.floor(f) : 0;
    const g = f - volta;
    const x = g * N; const i = Math.min(N - 1, Math.floor(x));
    return volta * total + M[i] + (M[i + 1] - M[i]) * (x - i);
  };
  const fracaoDaIntegral = (T) => {
    const volta = c.fechada ? Math.floor(T / total) : 0;
    const t = T - volta * total;
    let lo = 0; let hi = N;
    while (hi - lo > 1) { const meio = (lo + hi) >> 1; if (M[meio] < t) lo = meio; else hi = meio; }
    const a = M[hi] > M[lo] ? (t - M[lo]) / (M[hi] - M[lo]) : 0;
    return volta + (lo + a) / N;
  };
  return { integral, fracaoDaIntegral };
}

/* ---------------------------------------------------------------- leitura */

function lerCurvasDeclaradas(curvas) {
  if (!Array.isArray(curvas) || !curvas.length) falha('curvas precisa ser lista não vazia de { nome, pontos }');
  const porNome = new Map();
  for (const [k, c] of curvas.entries()) {
    exigirCampos(c, ['nome', 'pontos', 'fechada', 'poligonal', 'vinco', 'peso', 'exata', 'passo', 'continuidade'], `a curva ${k}`);
    if (typeof c.nome !== 'string' || !c.nome) falha(`a curva ${k} precisa de nome (texto não vazio)`);
    if (porNome.has(c.nome)) falha(`o nome de curva ${citar(c.nome)} aparece mais de uma vez`);
    if (!Array.isArray(c.pontos) || c.pontos.length < 2) falha(`a curva ${citar(c.nome)} precisa de dois ou mais pontos-chave: [x, y, z] em mm ou o nome de um nó`);
    for (const [j, p] of c.pontos.entries()) {
      if (typeof p !== 'string' && !finito3(p)) falha(`o ${j + 1}º ponto-chave da curva ${citar(c.nome)} precisa ser [x, y, z] finito em mm ou o nome de um nó`);
    }
    const fechada = c.fechada === true;
    if (c.fechada != null && typeof c.fechada !== 'boolean') falha(`a curva ${citar(c.nome)} aceita fechada só como true ou false`);
    if (c.poligonal != null && typeof c.poligonal !== 'boolean') falha(`a curva ${citar(c.nome)} aceita poligonal só como true ou false`);
    if (c.exata != null && c.exata !== true) falha(`a curva ${citar(c.nome)} aceita exata só como true`);
    if (c.exata === true && c.peso != null) falha(`a curva ${citar(c.nome)} declara exata e peso; a cota exata não tem peso`);
    if (c.peso != null && !(typeof c.peso === 'string' || (typeof c.peso === 'number' && Number.isFinite(c.peso) && c.peso > 0))) falha(`a curva ${citar(c.nome)} tem peso ${JSON.stringify(c.peso)}; o peso é número finito maior que zero ou nome de PARAMS`);
    if (c.passo != null && !(typeof c.passo === 'number' && Number.isFinite(c.passo) && c.passo > 0)) falha(`a curva ${citar(c.nome)} tem passo ${JSON.stringify(c.passo)}; o passo é número finito maior que zero, em mm`);
    if (c.vinco != null && c.vinco !== 'viva' && !(typeof c.vinco === 'string' || (typeof c.vinco === 'number' && c.vinco >= 0 && c.vinco <= 1))) falha(`a curva ${citar(c.nome)} tem vinco ${JSON.stringify(c.vinco)}; a nitidez vai de 0 a 1, ou é 'viva', ou nome de PARAMS`);
    if (c.continuidade != null) {
      if (!CONTINUIDADES.includes(c.continuidade)) falha(`a curva ${citar(c.nome)} tem continuidade ${JSON.stringify(c.continuidade)}; a emenda declarada é ${CONTINUIDADES.map(citar).join(' ou ')} (a dobra é vinco)`);
      if (c.vinco != null) falha(`a curva ${citar(c.nome)} declara vinco e continuidade ${citar(c.continuidade)}; o vinco é a dobra, e a emenda lisa não tem vinco: escolha um dos dois`);
    }
    porNome.set(c.nome, { ...c, fechada, poligonal: c.poligonal === true });
  }
  return porNome;
}

/* AS JUNÇÕES DA EMENDA (`continuidade`). Em cada nó de uma curva emendada (o ponto-chave escrito como nome, e o nó dado por
   { curva, fracao } sobre ela), as curvas que terminam ali, emendadas ou não, se casam aos pares pela direção com que saem do nó: o par
   que sai em sentidos quase opostos (o desvio abaixo de `anguloDeCanto`, ou dos 35 graus do padrão quando ele é false) vem primeiro, e
   cada ponta entra num par só. O par se junta quando outra curva emendada passa pelo nó (as duas atravessam a emenda dela, uma de cada
   lado, como as de baixo e de cima das chapas emendadas, ou duas curvas emendadas que se encontram ponta com ponta no nó de uma terceira)
   e o nó não está em `cantos`: o trecho da ponta de cada uma usa o ponto-chave vizinho do nó na outra, e a tangente no nó é a mesma nas
   duas. A direção sai dos pontos-chave dados, antes do alisamento das curvas e da junção; o nó dado por { curva, fracao } entra pela
   posição na curva feita só com os pontos-chave dela, sem as junções. A curva que atravessa e fica sem par sai em `emendaDobrada` (as
   duas que viram mais que o limite uma para a outra) ou em `emendaSemPar` (três ou mais). Devolve { pontas: Map curva -> { inicio?, fim? }
   (cada um { curva, inicio }: a outra curva e se a ponta dela no nó é o começo), porEmenda: Map curva emendada -> [{ no, curvas }],
   avisos }. */
function juncoesDasEmendas(declaradas, nosDeclarados, cantosDeclarados, anguloDeCanto) {
  const pontas = new Map(); const porEmenda = new Map(); const avisos = []; const continuacoesDasEmendas = [];
  const emendadas = [...declaradas.values()].filter((c) => c.continuidade != null);
  if (!emendadas.length) return { pontas, porEmenda, avisos, continuacoes: continuacoesDasEmendas };
  const limite = typeof anguloDeCanto === 'number' ? anguloDeCanto : ANGULO_DE_CANTO_PADRAO;
  /* a posição provisória de um ponto-chave: a coordenada dada, o nó dado por coordenada, ou o nó { curva, fracao } na curva dos pontos-chave dados */
  const provisorias = new Map(); const andando = new Set();
  const posicao = (p) => {
    if (typeof p !== 'string') return p;
    if (provisorias.has(p)) return provisorias.get(p);
    const d = nosDeclarados.get(p);
    let r = null;
    if (d?.tipo === 'ponto') r = d.p;
    else if (d?.tipo === 'curva' && declaradas.has(d.curva) && !andando.has(p)) {
      andando.add(p);
      const c = declaradas.get(d.curva);
      const chaves = c.pontos.map(posicao);
      andando.delete(p);
      if (chaves.every((q) => q !== null)) { try { r = criarCurva(d.curva, chaves, c.fechada, c.poligonal).em(d.fracao); } catch { r = null; } }
    }
    provisorias.set(p, r);
    return r;
  };
  /* os nós de cada curva emendada e, de cada nó, as curvas emendadas que passam por ele */
  const nosDa = new Map(); const emendadasNoNo = new Map();
  for (const e of emendadas) {
    const nosDela = [...new Set([...e.pontos.filter((p) => typeof p === 'string'), ...[...nosDeclarados].filter(([, d]) => d.tipo === 'curva' && d.curva === e.nome).map(([n]) => n)])];
    nosDa.set(e.nome, nosDela);
    for (const no of nosDela) { if (!emendadasNoNo.has(no)) emendadasNoNo.set(no, new Set()); emendadasNoNo.get(no).add(e.nome); }
  }
  const juncoesDoNo = new Map();
  for (const e of emendadas) {
    for (const no of nosDa.get(e.nome)) {
      if (juncoesDoNo.has(no)) continue;
      const doNo = [];
      juncoesDoNo.set(no, doNo);
      const terminam = [];
      for (const c of declaradas.values()) {
        if (c.fechada || c.poligonal) continue;
        if (c.pontos[0] === no) terminam.push({ curva: c.nome, inicio: true, vizinho: c.pontos[1] });
        if (c.pontos[c.pontos.length - 1] === no) terminam.push({ curva: c.nome, inicio: false, vizinho: c.pontos[c.pontos.length - 2] });
      }
      const naEmenda = emendadasNoNo.get(no);
      /* as que atravessam: as que terminam no nó e não são a própria curva emendada que acaba ali sem outra emendada que a cruze */
      const atravessam = terminam.filter((t) => [...naEmenda].some((n) => n !== t.curva));
      if (terminam.length < 2) continue;
      if (cantosDeclarados.has(no)) {
        if (atravessam.length >= 2) avisos.push({ ref: 'emendaNoCanto', curva: e.nome, no, texto: `a curva ${citar(e.nome)} declara continuidade ${citar(e.continuidade)}, mas o nó ${citar(no)} está em cantos: as curvas ${lista(atravessam.map((t) => t.curva))} ficam com o canto ali, sem a tangente comum` });
        continue;
      }
      const pn = posicao(no);
      const direcao = (t) => { const q = posicao(t.vizinho); if (!pn || !q) return null; const u = sub(q, pn); const l = norma(u); return l > 0 ? vezes(u, 1 / l) : null; };
      for (const t of terminam) t.dir = direcao(t);
      /* os pares candidatos, do mais reto ao mais dobrado, e na mesma ordem sempre (a das curvas na definição). O par se junta se outra
         emendada passa pelo nó (a emenda que as duas atravessam: `pedido`); o par reto sem outra emendada, com uma emendada nele, é a
         continuação da própria emenda pelo nó */
      const pares = [];
      for (let i = 0; i < terminam.length; i++) for (let j = i + 1; j < terminam.length; j++) {
        const a = terminam[i]; const b = terminam[j];
        if (a.curva === b.curva || !a.dir || !b.dir) continue;
        const desvio = (Math.acos(Math.max(-1, Math.min(1, -dot(a.dir, b.dir)))) * 180) / Math.PI;
        const pedido = [...naEmenda].some((n) => n !== a.curva && n !== b.curva);
        pares.push({ a, b, desvio, pedido, ordem: pares.length });
      }
      const pedidos = pares.filter((x) => x.pedido && x.desvio <= limite).sort((x, y) => x.desvio - y.desvio || x.ordem - y.ordem);
      const usadas = new Set(); const empatadas = new Set();
      for (const par of pedidos) {
        const { a, b, desvio } = par;
        if (usadas.has(a) || usadas.has(b)) continue;
        /* o empate: outro par livre disputa uma das pontas com desvio quase igual; juntar um ou outro dependeria da ordem das curvas */
        const rivais = pedidos.filter((q) => q !== par && !usadas.has(q.a) && !usadas.has(q.b) && [q.a, q.b].some((t) => t === a || t === b) && q.desvio - desvio <= EMPATE_DA_JUNCAO);
        if (rivais.length) {
          const envolvidas = [...new Set([par, ...rivais].flatMap((q) => [q.a, q.b]))];
          for (const t of envolvidas) { usadas.add(t); empatadas.add(t); }
          avisos.push({ ref: 'emendaEmpate', curva: e.nome, no, curvas: envolvidas.map((t) => t.curva), texto: `no nó ${citar(no)} da curva emendada ${citar(e.nome)}, as curvas ${lista(envolvidas.map((t) => t.curva))} saem com desvios a menos de ${br(EMPATE_DA_JUNCAO)} grau um do outro, e a junção dependeria da ordem das curvas: nenhuma se juntou; deixe uma só curva seguir reta pelo nó, ou parta a rede ali` });
          continue;
        }
        usadas.add(a); usadas.add(b);
        doNo.push({ no, curvas: [a.curva, b.curva] });
        for (const [x, y] of [[a, b], [b, a]]) {
          if (!pontas.has(x.curva)) pontas.set(x.curva, {});
          pontas.get(x.curva)[x.inicio ? 'inicio' : 'fim'] = { curva: y.curva, inicio: y.inicio };
        }
      }
      /* a continuação da emenda: o par reto sem outra emendada no nó; entre duas emendadas, a quebra entre elas se mede na saída */
      const continuacoes = pares.filter((x) => !x.pedido && x.desvio <= limite && (naEmenda.has(x.a.curva) || naEmenda.has(x.b.curva)));
      for (const x of continuacoes) if (naEmenda.has(x.a.curva) && naEmenda.has(x.b.curva) && !continuacoesDasEmendas.some((c) => c.no === no && c.curvas.includes(x.a.curva) && c.curvas.includes(x.b.curva))) continuacoesDasEmendas.push({ no, curvas: [x.a.curva, x.b.curva], pontas: [x.a.inicio, x.b.inicio] });
      const continuam = new Set(continuacoes.flatMap((x) => [x.a, x.b]));
      /* a curva que atravessa e ficou sem par: a que não é emendada, nem empatou, nem segue a emenda pelo nó */
      const sobram = atravessam.filter((t) => !usadas.has(t) && !naEmenda.has(t.curva) && !continuam.has(t));
      if (!sobram.length) continue;
      const soltas = atravessam.filter((t) => !naEmenda.has(t.curva) && !continuam.has(t) && !empatadas.has(t));
      if (soltas.length === 2 && sobram.length === 2 && sobram[0].dir && sobram[1].dir) {
        const [a, b] = sobram;
        const desvio = (Math.acos(Math.max(-1, Math.min(1, -dot(a.dir, b.dir)))) * 180) / Math.PI;
        avisos.push({ ref: 'emendaDobrada', curva: e.nome, no, desvioGraus: Math.round(desvio * 10) / 10, limiteGraus: limite, texto: `no nó ${citar(no)} da curva emendada ${citar(e.nome)}, as curvas ${citar(a.curva)} e ${citar(b.curva)} viram ${br(desvio)} graus uma para a outra, acima de ${typeof anguloDeCanto === 'number' ? 'anguloDeCanto' : `${br(limite)} graus (o padrão de anguloDeCanto, que vale na junção mesmo com anguloDeCanto: false)`}: ficam sem a tangente comum; se é dobra, a curva é vinco, e se não é, acerte os pontos-chave vizinhos do nó` });
      } else if (soltas.length > 2 || sobram.length < soltas.length) {
        avisos.push({ ref: 'emendaSemPar', curva: e.nome, no, curvas: sobram.map((t) => t.curva), texto: `no nó ${citar(no)} da curva emendada ${citar(e.nome)} terminam ${atravessam.length} curvas (${lista(atravessam.map((t) => t.curva))}); a tangente comum se põe entre duas que saem do nó em sentidos opostos, e ${sobram.length === 1 ? `a curva ${citar(sobram[0].curva)} ficou` : `as curvas ${lista(sobram.map((t) => t.curva))} ficaram`} sem par` });
      }
    }
  }
  for (const e of emendadas) porEmenda.set(e.nome, nosDa.get(e.nome).flatMap((no) => (juncoesDoNo.get(no) ?? []).filter((j) => !j.curvas.includes(e.nome))));
  return { pontas, porEmenda, avisos, continuacoes: continuacoesDasEmendas };
}

function lerNosDeclarados(nos, curvas) {
  const porNome = new Map();
  if (nos == null) return porNome;
  if (!nos || typeof nos !== 'object' || Array.isArray(nos)) falha('nos precisa ser objeto { nome: [x, y, z] | { curva, fracao } }');
  for (const [nome, d] of Object.entries(nos)) {
    if (finito3(d)) { porNome.set(nome, { tipo: 'ponto', p: [...d] }); continue; }
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      exigirCampos(d, ['curva', 'fracao'], `o nó ${citar(nome)}`);
      if (!curvas.has(d.curva)) falha(`o nó ${citar(nome)} fica na curva ${citar(d.curva)}, que não existe`);
      if (typeof d.fracao !== 'number' || !(d.fracao >= 0 && d.fracao <= 1)) falha(`o nó ${citar(nome)} precisa de fracao de 0 a 1 do comprimento da curva ${citar(d.curva)}`);
      porNome.set(nome, { tipo: 'curva', curva: d.curva, fracao: d.fracao });
      continue;
    }
    falha(`o nó ${citar(nome)} precisa ser [x, y, z] em mm ou { curva, fracao }`);
  }
  return porNome;
}

function lerLeitura(l) {
  if (l == null || l === false) return null;
  const x = l === true ? {} : l;
  exigirCampos(x, ['peso', 'erro', 'inclinacao', 'estrito'], 'a leitura');
  const o = { ...LEITURA_PADRAO, ...Object.fromEntries(Object.entries(x).filter(([, v]) => v != null)) };
  if (!(typeof o.peso === 'string' && o.peso) && !(typeof o.peso === 'number' && Number.isFinite(o.peso) && o.peso > 0)) falha(`a leitura tem peso ${JSON.stringify(o.peso)}; o peso é número finito maior que zero ou nome de PARAMS`);
  for (const campo of ['erro', 'inclinacao']) {
    if (typeof o[campo] !== 'number' || !Number.isFinite(o[campo]) || !(o[campo] > 0)) falha(`a leitura tem ${campo} ${JSON.stringify(o[campo])}; ${campo} é número finito maior que zero`);
  }
  if (typeof o.estrito !== 'boolean') falha('a leitura precisa de estrito: true ou false');
  return o;
}

/* A opção `alisarCurvas`: true, ou { energia, rigidez, tolerancia, toleranciaPorCurva, silhueta, iteracoes, curvas, pontosDuros }. Devolve
   null (sem a opção), ou { opcoes (as de `alisarPontosDaCurva`), curvas: Set de nomes, pontosDuros: Map curva -> Set de índices de
   ponto-chave, tolerancias: Map curva -> mm }. */
function lerAlisarCurvas(a, declaradas) {
  if (a == null || a === false) return null;
  const x = a === true ? {} : a;
  if (!x || typeof x !== 'object' || Array.isArray(x)) falha(`alisarCurvas é ${JSON.stringify(a)}; use true ou { energia, rigidez, tolerancia, toleranciaPorCurva, silhueta, iteracoes, curvas, pontosDuros }`);
  exigirCampos(x, ['energia', 'rigidez', 'tolerancia', 'toleranciaPorCurva', 'silhueta', 'iteracoes', 'curvas', 'pontosDuros'], 'alisarCurvas');
  const { curvas: escolhidas, pontosDuros, toleranciaPorCurva, ...resto } = x;
  let opcoes;
  try { opcoes = lerOpcoesDoAlisamento(resto, 'alisarCurvas'); } catch (e) { falha(e.message.replace(/^alisar curvas: /, '')); }
  const lisas = [...declaradas.values()].filter((c) => !c.poligonal).map((c) => c.nome);
  let curvas;
  if (escolhidas == null) curvas = new Set(lisas);
  else {
    if (!Array.isArray(escolhidas) || escolhidas.some((n) => typeof n !== 'string')) falha(`alisarCurvas.curvas é ${JSON.stringify(escolhidas)}; use a lista dos nomes das curvas a alisar (sem ela, todas as que não são poligonais)`);
    for (const n of escolhidas) {
      if (!declaradas.has(n)) falha(`alisarCurvas.curvas cita a curva ${citar(n)}, que não existe; as curvas são ${lista([...declaradas.keys()])}`);
      if (declaradas.get(n).poligonal) falha(`alisarCurvas.curvas cita a curva poligonal ${citar(n)}; a poligonal tem os cantos nos pontos e não se alisa`);
    }
    curvas = new Set(escolhidas);
  }
  const duros = new Map();
  if (pontosDuros != null) {
    if (!pontosDuros || typeof pontosDuros !== 'object' || Array.isArray(pontosDuros)) falha(`alisarCurvas.pontosDuros é ${JSON.stringify(pontosDuros)}; use { curva: [índices dos pontos-chave, de 0] }`);
    for (const [n, ks] of Object.entries(pontosDuros)) {
      if (!declaradas.has(n)) falha(`alisarCurvas.pontosDuros cita a curva ${citar(n)}, que não existe; as curvas são ${lista([...declaradas.keys()])}`);
      const total = declaradas.get(n).pontos.length;
      if (!Array.isArray(ks) || ks.some((k) => !(Number.isInteger(k) && k >= 0 && k < total))) falha(`alisarCurvas.pontosDuros da curva ${citar(n)} é ${JSON.stringify(ks)}; use índices de ponto-chave de 0 a ${total - 1}`);
      duros.set(n, new Set(ks));
    }
  }
  /* a tolerância de cada curva, por cima da de todas: a curva que a pessoa quer mais presa (ou mais solta) que as outras */
  const tolerancias = new Map();
  if (toleranciaPorCurva != null) {
    if (!toleranciaPorCurva || typeof toleranciaPorCurva !== 'object' || Array.isArray(toleranciaPorCurva)) falha(`alisarCurvas.toleranciaPorCurva é ${JSON.stringify(toleranciaPorCurva)}; use { curva: mm }`);
    for (const [n, v] of Object.entries(toleranciaPorCurva)) {
      if (!declaradas.has(n)) falha(`alisarCurvas.toleranciaPorCurva cita a curva ${citar(n)}, que não existe; as curvas são ${lista([...declaradas.keys()])}`);
      if (!curvas.has(n)) falha(`alisarCurvas.toleranciaPorCurva cita a curva ${citar(n)}, que não é alisada; as alisadas são ${lista([...curvas])}`);
      try { conferirTolerancia(v, `toleranciaPorCurva.${n}`, 'alisarCurvas'); } catch (e) { falha(e.message.replace(/^alisar curvas: /, '')); }
      tolerancias.set(n, v);
    }
  }
  return { opcoes, curvas, pontosDuros: duros, tolerancias };
}

/* A opção `limitesDaEmenda`: { tolerancia, toleranciaPorCurva, angulo, razao }, sobre os padrões de LIMITES_DA_EMENDA_PADRAO. Devolve
   { tolerancia, angulo, razao, tolerancias: Map curva -> mm }; vale só com uma curva com `continuidade`. */
function lerLimitesDaEmenda(l, declaradas) {
  const emendadas = [...declaradas.values()].filter((c) => c.continuidade != null).map((c) => c.nome);
  if (l == null) return { ...LIMITES_DA_EMENDA_PADRAO, tolerancias: new Map() };
  if (!emendadas.length) falha('limitesDaEmenda vale com a continuidade declarada, e nenhuma curva declara continuidade');
  exigirCampos(l, ['tolerancia', 'toleranciaPorCurva', 'angulo', 'razao'], 'limitesDaEmenda');
  const positivo = (v, onde) => { if (!(typeof v === 'number' && Number.isFinite(v) && v > 0)) falha(`limitesDaEmenda.${onde} é ${JSON.stringify(v)}; precisa ser número finito maior que zero`); return v; };
  const r = { ...LIMITES_DA_EMENDA_PADRAO, tolerancias: new Map() };
  if (l.tolerancia != null) r.tolerancia = positivo(l.tolerancia, 'tolerancia');
  if (l.angulo != null) r.angulo = positivo(l.angulo, 'angulo');
  if (l.razao != null) { r.razao = positivo(l.razao, 'razao'); if (r.razao < 1) falha(`limitesDaEmenda.razao é ${JSON.stringify(l.razao)}; a razão é a maior curvatura sobre a menor, de 1 para cima`); }
  if (l.toleranciaPorCurva != null) {
    if (!l.toleranciaPorCurva || typeof l.toleranciaPorCurva !== 'object' || Array.isArray(l.toleranciaPorCurva)) falha(`limitesDaEmenda.toleranciaPorCurva é ${JSON.stringify(l.toleranciaPorCurva)}; use { curva: mm }`);
    for (const [n, v] of Object.entries(l.toleranciaPorCurva)) {
      if (!emendadas.includes(n)) falha(`limitesDaEmenda.toleranciaPorCurva cita a curva ${citar(n)}, que não declara continuidade; as emendadas são ${lista(emendadas)}`);
      r.tolerancias.set(n, positivo(v, `toleranciaPorCurva.${n}`));
    }
  }
  return r;
}

/* a definição sem as coordenadas: a assinatura da rede, que fixa as divisões (`gaiola-captura.js`) e vai em `estrutura` */
function semCoordenadasDa(definicao) {
  return {
    ...definicao,
    curvas: definicao.curvas.map((c) => ({ ...c, pontos: c.pontos.map((p) => (typeof p === 'string' ? p : null)) })),
    ...(definicao.nos ? { nos: Object.fromEntries(Object.entries(definicao.nos).map(([n, d]) => [n, Array.isArray(d) ? null : d])) } : {}),
  };
}

/* ----------------------------------------------------------------- sistema */

/* As divisões de cada arco. `linhas`: { termos: Map(variável -> coeficiente), rhs, texto } com a soma dos termos igual a rhs; `alvos`: Map
   variável -> número alvo (real); `pesos`: Map variável -> comprimento do arco (mm), que pondera o custo (a variável de retalho de n lados
   não tem). As variáveis são inteiros maiores ou iguais a 1. Os arcos que a mesma soma de um lado e do outro iguala (um arco só dos dois
   lados) viram uma classe, de alvo a média; o resto se resolve por eliminação com pivô de coeficiente 1 ou -1, o que deixa as variáveis
   livres (um inteiro cada) e o resto como combinação inteira delas. `minimos`: Map variável -> menor número de divisões (1 se não
   consta), que é o que a curva pede para não virar mais que `anguloMax` por divisão em média. Entre as soluções inteiras o sistema busca a de menor custo, somando
   por arco o comprimento vezes o quadrado de ln(divisões ÷ alvo), quatro vezes maior quando o arco fica mais grosso que o alvo, pela busca
   local de passo 1 em uma ou duas variáveis livres. A ordem de tudo é a das variáveis, e o resultado é o mesmo sempre. */
function resolverSistema(variaveis, linhas, alvos, pesos, minimos, nomeDe) {
  const pai = new Map(variaveis.map((v) => [v, v]));
  const raiz = (v) => { let r = v; while (pai.get(r) !== r) r = pai.get(r); return r; };
  const resto = [];
  for (const L of linhas) {
    const t = [...L.termos];
    if (L.rhs === 0 && t.length === 2 && t[0][1] + t[1][1] === 0 && Math.abs(t[0][1]) === 1) {
      const a = raiz(t[0][0]); const b = raiz(t[1][0]);
      if (a !== b) { if (a < b) pai.set(b, a); else pai.set(a, b); }
    } else resto.push(L);
  }
  const membros = new Map();
  for (const v of variaveis) { const r = raiz(v); if (!membros.has(r)) membros.set(r, []); membros.get(r).push(v); }
  const alvoDaClasse = new Map(); const minimoDaClasse = new Map();
  for (const [r, vs] of membros) { alvoDaClasse.set(r, vs.reduce((s, v) => s + alvos.get(v), 0) / vs.length); minimoDaClasse.set(r, Math.max(...vs.map((v) => minimos.get(v) ?? 1))); }
  const subs = new Map();
  const reduzir = (L) => {
    const termos = new Map(); let rhs = L.rhs;
    for (const [v0, c] of L.termos) {
      const v = raiz(v0);
      const s = subs.get(v);
      if (!s) termos.set(v, (termos.get(v) ?? 0) + c);
      else { rhs -= c * s.c0; for (const [w, d] of s.t) termos.set(w, (termos.get(w) ?? 0) + c * d); }
    }
    for (const [v, c] of [...termos]) if (c === 0) termos.delete(v);
    return { termos, rhs };
  };
  for (const L of resto) {
    const reduzida = reduzir(L); const termos = reduzida.termos; let rhs = reduzida.rhs;
    if (!termos.size) {
      if (rhs !== 0) falha(`as divisões não fecham: ${L.texto}, e o que os outros retalhos já fixaram dá uma diferença de ${rhs}; declare as divisões dos retalhos vizinhos iguais nos lados compartilhados`);
      continue;
    }
    /* os coeficientes dividem-se pelo máximo divisor comum, que o termo de dois dos retalhos de n lados deixa em 2 */
    const mdc = (x, y) => (y === 0 ? Math.abs(x) : mdc(y, x % y));
    const g = [...termos.values()].reduce((acc, c) => mdc(acc, c), 0);
    if (g > 1) {
      if (rhs % g !== 0) falha(`as divisões não têm solução inteira para ${L.texto}: os lados vizinhos já fixados pedem uma soma que não é múltipla de ${g}; declare divisoes nos retalhos dessa região`);
      for (const [v, c] of termos) termos.set(v, c / g);
      rhs /= g;
    }
    const candidatos = [...termos].filter(([, c]) => Math.abs(c) === 1).map(([v]) => v);
    if (!candidatos.length) falha(`as divisões não têm solução inteira simples para ${L.texto}; declare divisoes nos retalhos dessa região`);
    candidatos.sort((a, b) => (alvoDaClasse.get(b) - alvoDaClasse.get(a)) || (a - b));
    const p = candidatos[0]; const c = termos.get(p);
    const nova = { c0: c * rhs, t: new Map() };
    for (const [w, d] of termos) if (w !== p) nova.t.set(w, -c * d);
    for (const s of subs.values()) {
      const coef = s.t.get(p);
      if (coef === undefined) continue;
      s.c0 += coef * nova.c0; s.t.delete(p);
      for (const [w, d] of nova.t) { const x = (s.t.get(w) ?? 0) + coef * d; if (x === 0) s.t.delete(w); else s.t.set(w, x); }
    }
    subs.set(p, nova);
  }
  const livres = [...membros.keys()].filter((r) => !subs.has(r)).sort((a, b) => a - b);
  const dependentes = [...subs.keys()].sort((a, b) => a - b);
  const valor = new Map(livres.map((r) => [r, Math.max(minimoDaClasse.get(r), Math.round(alvoDaClasse.get(r)))]));
  const avaliar = (r) => { const s = subs.get(r); let x = s.c0; for (const [w, d] of s.t) x += d * valor.get(w); return x; };
  const viavel = () => livres.every((r) => valor.get(r) >= minimoDaClasse.get(r)) && dependentes.every((r) => avaliar(r) >= minimoDaClasse.get(r));
  for (let volta = 0; volta < 100000; volta++) {
    const ruim = dependentes.find((r) => avaliar(r) < minimoDaClasse.get(r));
    if (ruim === undefined) break;
    const s = subs.get(ruim);
    const candidatos = [...s.t].filter(([, d]) => d > 0).map(([w]) => w).sort((a, b) => (alvoDaClasse.get(b) - alvoDaClasse.get(a)) || (a - b));
    if (!candidatos.length) falha(`as divisões não têm solução com ${minimoDaClasse.get(ruim)} divisão(ões) no mínimo por arco perto de ${nomeDe(ruim)}; declare divisoes nos retalhos dessa região`);
    valor.set(candidatos[0], valor.get(candidatos[0]) + 1);
  }
  if (!viavel()) falha(`as divisões não convergem perto de ${nomeDe(dependentes.find((r) => avaliar(r) < minimoDaClasse.get(r)))}; declare divisoes nos retalhos dessa região`);
  const doArco = (v) => { const r = raiz(v); return subs.has(r) ? avaliar(r) : valor.get(r); };
  const arcos = variaveis.filter((v) => pesos.get(v) > 0);
  const custo = () => {
    let total = 0;
    for (const v of arcos) { const d = Math.log(doArco(v) / alvos.get(v)); total += pesos.get(v) * (d < 0 ? d * d : 0.25 * d * d); }
    return total;
  };
  let atual = custo();
  const mexer = (movimentos) => { for (const [r, d] of movimentos) valor.set(r, valor.get(r) + d); };
  for (let volta = 0; volta < 5000; volta++) {
    let melhor = null;
    const tentar = (movimentos) => {
      mexer(movimentos);
      if (viavel()) { const c = custo(); if (c < atual - 1e-9 && (melhor === null || c < melhor.c - 1e-9)) melhor = { movimentos, c }; }
      mexer(movimentos.map(([r, d]) => [r, -d]));
    };
    for (const r of livres) { tentar([[r, 1]]); tentar([[r, -1]]); }
    if (melhor === null) {
      for (let i = 0; i < livres.length; i++) for (let j = i + 1; j < livres.length; j++) for (const di of [1, -1]) for (const dj of [1, -1]) tentar([[livres[i], di], [livres[j], dj]]);
    }
    if (melhor === null) break;
    mexer(melhor.movimentos); atual = melhor.c;
  }
  const final = new Map();
  for (const v of variaveis) final.set(v, doArco(v));
  for (const L of linhas) {
    let s = 0; for (const [v, c] of L.termos) s += c * final.get(v);
    if (s !== L.rhs) falha(`as divisões não fecham: ${L.texto} (deu ${s}, devia dar ${L.rhs})`);
  }
  return final;
}

/* ----------------------------------------------------------------- função */

export function gaiolaPorRede(definicaoDada) {
  /* uma alteração de teste (a ferramenta de vincos) põe vinco em curvas e canto em nós da definição sem escrever na receita */
  const alt = alteracoesDaRede();
  const definicao = alt && definicaoDada && Array.isArray(definicaoDada.curvas) && Array.isArray(definicaoDada.retalhos)
    ? {
      ...definicaoDada,
      curvas: [
        ...definicaoDada.curvas.map((c) => (c && alt.vincos && alt.vincos[c.nome] !== undefined ? { ...c, vinco: alt.vincos[c.nome] } : c)),
        ...(alt.acrescentar?.curvas ?? []),
      ],
      ...(alt.cantos?.length ? { cantos: [...new Set([...(definicaoDada.cantos ?? []), ...alt.cantos.filter((n) => definicaoDada.nos && n in definicaoDada.nos)])] } : {}),
      ...(alt.acrescentar?.nos ? { nos: { ...(definicaoDada.nos ?? {}), ...alt.acrescentar.nos } } : {}),
      retalhos: definicaoDada.retalhos.flatMap((r) => (r && alt.acrescentar?.retalhos?.[r.nome] ? alt.acrescentar.retalhos[r.nome] : [r])),
    }
    : definicaoDada;
  exigirCampos(definicao, ['curvas', 'nos', 'retalhos', 'passo', 'anguloMax', 'fora', 'leitura', 'interior', 'liso', 'anguloDeCanto', 'cantos', 'simetria', 'prefixo', 'alisarCurvas', 'limitesDaEmenda', 'marcarCurvas'], 'a definição da rede');
  const marcarCurvas = definicao.marcarCurvas ?? false;
  if (marcarCurvas !== true && marcarCurvas !== false) falha(`marcarCurvas é ${JSON.stringify(marcarCurvas)}; precisa ser true (as curvas vão ao passo e o neutro marca as arestas que descendem delas) ou false`);
  const { simetria = null, prefixo = '' } = definicao;
  if (simetria !== null && simetria !== 'x') falha("simetria só aceita 'x'");
  if (typeof prefixo !== 'string') falha('prefixo precisa ser texto');
  const passoDaRede = definicao.passo ?? null;
  if (passoDaRede !== null && !(typeof passoDaRede === 'number' && Number.isFinite(passoDaRede) && passoDaRede > 0)) falha(`passo é ${JSON.stringify(passoDaRede)}; precisa ser número finito maior que zero, em mm`);
  const anguloMax = definicao.anguloMax ?? ANGULO_MAX_PADRAO;
  if (!(typeof anguloMax === 'number' && Number.isFinite(anguloMax) && anguloMax > 0)) falha(`anguloMax é ${JSON.stringify(anguloMax)}; precisa ser número finito maior que zero, em graus`);
  const anguloDeCanto = definicao.anguloDeCanto === undefined ? ANGULO_DE_CANTO_PADRAO : definicao.anguloDeCanto;
  if (anguloDeCanto !== null && anguloDeCanto !== false && !(typeof anguloDeCanto === 'number' && anguloDeCanto > 0 && anguloDeCanto < 180)) falha(`anguloDeCanto é ${JSON.stringify(anguloDeCanto)}; precisa ser graus entre 0 e 180, ou false`);
  let interior = definicao.interior === undefined ? INTERIOR_PADRAO : definicao.interior;
  if (interior === null || interior === false) interior = null;
  else if (!(typeof interior === 'number' && Number.isFinite(interior) && interior > 0)) falha(`interior é ${JSON.stringify(interior)}; precisa ser peso maior que zero, ou false`);
  let liso = definicao.liso === undefined ? true : definicao.liso;
  if (liso === false || liso === null) liso = null;
  else if (liso === true) liso = { iteracoes: ITERACOES_DO_LISO };
  else {
    exigirCampos(liso, ['iteracoes', 'energia', 'ancora'], 'liso');
    if (liso.iteracoes != null && (!Number.isInteger(liso.iteracoes) || liso.iteracoes < 1)) falha('liso.iteracoes precisa ser inteiro de 1 para cima');
    if (liso.energia != null && liso.energia !== 'variacao' && liso.energia !== 'placa') falha("liso.energia precisa ser 'variacao' ou 'placa'");
    liso = { iteracoes: ITERACOES_DO_LISO, ...Object.fromEntries(Object.entries(liso).filter(([, v]) => v != null)) };
  }
  if (definicao.fora != null && !finito3(definicao.fora)) falha('fora precisa ser [x, y, z]');
  const leitura = lerLeitura(definicao.leitura);
  const declaradas = lerCurvasDeclaradas(definicao.curvas);
  const nosDeclarados = lerNosDeclarados(definicao.nos, declaradas);
  const alisarCurvas = lerAlisarCurvas(definicao.alisarCurvas, declaradas);
  const limitesDaEmenda = lerLimitesDaEmenda(definicao.limitesDaEmenda, declaradas);
  const cantosDeclarados = new Set(Array.isArray(definicao.cantos) ? definicao.cantos : []);
  const juncoes = juncoesDasEmendas(declaradas, nosDeclarados, cantosDeclarados, anguloDeCanto);
  const relatorioDoAlisamento = alisarCurvas ? new Map() : null;
  const avisosDoAlisamento = [];
  const pref = (n) => `${prefixo}${n}`;

  /* ---- a geometria das curvas e a posição dos nós, avaliadas sob demanda ---- */
  const curvas = new Map(); const posNo = new Map(); const andando = new Set();
  const posicaoDoNo = (nome, quem) => {
    if (posNo.has(nome)) return posNo.get(nome);
    const d = nosDeclarados.get(nome);
    if (!d) falha(`${quem} cita o nó ${citar(nome)}, que não está em nos`);
    if (andando.has(`n:${nome}`)) falha(`o nó ${citar(nome)} depende de si mesmo`);
    andando.add(`n:${nome}`);
    const p = d.tipo === 'ponto' ? d.p : curvaDe(d.curva).em(d.fracao);
    andando.delete(`n:${nome}`);
    posNo.set(nome, p);
    return p;
  };
  /* os pontos-chave de cada curva, já alisados quando `alisarCurvas` a escolhe: a curva emendada (`continuidade`) lê o vizinho do nó na
     outra curva por aqui, sem fazer a outra curva inteira */
  const chavesFeitas = new Map();
  const chavesDe = (nome) => {
    if (chavesFeitas.has(nome)) return chavesFeitas.get(nome);
    if (andando.has(`k:${nome}`)) falha(`a curva ${citar(nome)} depende de si mesma por um nó dela`);
    andando.add(`k:${nome}`);
    const d = declaradas.get(nome);
    let chaves = d.pontos.map((p) => (typeof p === 'string' ? posicaoDoNo(p, `a curva ${citar(nome)}`) : p));
    /* a repetição se confere nos pontos dados, antes do alisamento: a corda nula não tem parâmetro */
    for (let j = 0; j + 1 < chaves.length; j++) if (!(norma(sub(chaves[j + 1], chaves[j])) > 0)) falha(`a curva ${citar(nome)} repete o ponto-chave: o ${j + 1}º e o ${j + 2}º são iguais`);
    if (d.fechada && !(norma(sub(chaves[0], chaves[chaves.length - 1])) > 0)) falha(`a curva fechada ${citar(nome)} repete o primeiro ponto-chave no fim; a volta fecha sozinha`);
    if (alisarCurvas && alisarCurvas.curvas.has(nome)) chaves = alisarChaves(nome, d, chaves);
    andando.delete(`k:${nome}`);
    chavesFeitas.set(nome, chaves);
    return chaves;
  };
  const curvaDe = (nome) => {
    if (curvas.has(nome)) return curvas.get(nome);
    if (andando.has(`c:${nome}`)) falha(`a curva ${citar(nome)} depende de si mesma por um nó dela`);
    andando.add(`c:${nome}`);
    const d = declaradas.get(nome);
    const chaves = chavesDe(nome);
    /* a ponta emendada: o trecho da ponta usa o ponto-chave vizinho do nó na curva do outro lado, e as duas saem do nó com a mesma tangente */
    const ponta = juncoes.pontas.get(nome);
    const vizinhoDe = (j) => { if (!j) return null; const k = chavesDe(j.curva); return j.inicio ? k[1] : k[k.length - 2]; };
    const c = criarCurva(nome, chaves, d.fechada, d.poligonal, vizinhoDe(ponta?.inicio), vizinhoDe(ponta?.fim));
    c.decl = d;
    andando.delete(`c:${nome}`);
    curvas.set(nome, c);
    return c;
  };
  /* O ALISAMENTO DAS CURVAS (`alisarCurvas`): os pontos-chave de cada curva escolhida passam por `alisarPontosDaCurva`
     (`alisar-curvas.js`) antes de a curva ser feita. Os nós (o ponto-chave que é nome) e as pontas da curva aberta são duros, como os que
     `pontosDuros` declara; o nó em `cantos` e todo ponto-chave (nó ou número) onde a poligonal dos pontos-chave vira mais que
     `anguloDeCanto` partem a curva em trechos alisados à parte. Com `simetria: 'x'` o alisamento mantém x >= 0 e o x dos pontos em x = 0.
     O nó dado por { curva, fracao } fica na curva alisada. */
  function alisarChaves(nome, d, chaves) {
    const n = chaves.length;
    const duros = []; const partir = [];
    const tolerancia = alisarCurvas.tolerancias.get(nome) ?? alisarCurvas.opcoes.tolerancia;
    const limiteDoCanto = typeof anguloDeCanto === 'number' ? anguloDeCanto : null;
    /* O canto num nó se mede pelos dois vizinhos. O canto num ponto-chave numérico se mede entre as cordas que vão dele até o primeiro ponto a ESCALA_DO_CANTO tolerâncias de distância de
       cada lado (ou até a ponta da curva aberta): o ruído da ordem da tolerância vira a corda em menos de 2/ESCALA_DO_CANTO rad (6 graus
       com 20), e não passa por canto; na curva espaçada (ponto a cada 100 mm, tolerância de 2,5) a corda é a do vizinho, como antes.
       Na curva densa a corda longa vê o canto verdadeiro em vários pontos seguidos, e fica o de maior ângulo entre eles. O ponto a menos
       desse alcance da ponta da curva aberta não é canto: a corda dele é curta e o ruído a vira. */
    const candidatos = [];
    d.pontos.forEach((p, k) => {
      if (typeof p === 'string') duros.push(k);
      if (alisarCurvas.pontosDuros.get(nome)?.has(k)) duros.push(k);
      const tem = d.fechada || (k > 0 && k < n - 1);
      if (!tem) return;
      if (typeof p === 'string' && cantosDeclarados.has(p)) { partir.push(k); return; }
      if (limiteDoCanto === null) return;
      const alcance = ESCALA_DO_CANTO * tolerancia;
      const ate = (passo) => {
        let j = 1;
        for (;;) {
          const i = k + passo * j;
          const fim = d.fechada ? j >= Math.floor((n - 1) / 2) : i <= 0 || i >= n - 1;
          if (fim || norma(sub(chaves[((i % n) + n) % n], chaves[k])) >= alcance) return j;
          j += 1;
        }
      };
      /* o nó é posição declarada, e não leitura: o canto nele se mede pelos vizinhos, como sempre */
      const no = typeof p === 'string';
      const ja = no ? 1 : ate(-1); const jc = no ? 1 : ate(1);
      const u = sub(chaves[k], chaves[(((k - ja) % n) + n) % n]); const v = sub(chaves[(k + jc) % n], chaves[k]);
      /* perto da ponta, onde a corda não chega ao alcance, o ruído ainda vira a corda: ali não se acha canto */
      if (!no && (norma(u) < alcance || norma(v) < alcance)) return;
      const cosseno = dot(u, v) / (norma(u) * norma(v));
      const angulo = (Math.acos(Math.max(-1, Math.min(1, cosseno))) * 180) / Math.PI;
      if (angulo > limiteDoCanto) candidatos.push({ k, angulo, ja, jc });
    });
    for (const c of candidatos) {
      const venceu = candidatos.every((o) => o === c || (o.k - c.k + n) % n >= c.jc && (c.k - o.k + n) % n >= c.ja || o.angulo < c.angulo || (o.angulo === c.angulo && o.k > c.k));
      if (venceu) partir.push(c.k);
    }
    partir.sort((x, y) => x - y);
    const r = alisarPontosDaCurva(chaves, { ...alisarCurvas.opcoes, tolerancia, ...(simetria ? { simetria } : {}), fechada: d.fechada, duros: [...new Set(duros)], partir, onde: `alisarCurvas na curva ${citar(nome)}` });
    const r4 = (x) => Math.round(x * 1e4) / 1e4;
    relatorioDoAlisamento.set(nome, {
      pontos: n, tolerancia, duros: r.duros, partida: partir, limitados: r.limitados, pontosChave: r.pontos,
      deslocamentosMm: r.deslocamentos.map(r4), maiorDeslocamentoMm: r4(r.maiorDeslocamento),
      variacaoAntes: r4(r.variacaoAntes), variacaoDepois: r4(r.variacaoDepois),
    });
    /* o aviso da curva que bate no limite ou anda mais que FRACAO_DO_AVISO da tolerância: a pessoa confere se o que andou era ruído */
    if (r.limitados.length || r.maiorDeslocamento > FRACAO_DO_AVISO * tolerancia) {
      const noLimite = r.limitados.length > 0;
      avisosDoAlisamento.push({
        ref: noLimite ? 'alisamentoNoLimite' : 'alisamentoAndou', curva: nome, maiorDeslocamentoMm: r4(r.maiorDeslocamento), toleranciaMm: tolerancia, limitados: r.limitados.length,
        texto: noLimite
          ? `alisarCurvas: a curva ${citar(nome)} bateu na tolerância de ${br(tolerancia)} mm em ${r.limitados.length} de ${n} pontos-chave; o que passa dela (ruído maior que a tolerância, ou uma feição que a amostragem não acompanha) ficou só em parte: confira a curva; se é ruído, suba a tolerância dela em toleranciaPorCurva; se é um canto, escreva o ponto do canto como nó e ponha o nó em cantos (pontosDuros não basta: o ponto fica, mas a energia passa por ele e arredonda os vizinhos)`
          : `alisarCurvas: a curva ${citar(nome)} andou até ${br(r.maiorDeslocamento)} mm, mais que ${br(FRACAO_DO_AVISO * 100)}% da tolerância de ${br(tolerancia)} mm; se ela é limpa, isso é forma que a amostragem não acompanha (o círculo fechado pede uns 16 pontos por volta, a curva aberta 24 ou mais) ou um canto que o alisamento arredondou; o canto se guarda escrevendo o ponto dele como nó e pondo o nó em cantos (pontosDuros não basta)`,
      });
    }
    return r.pontos;
  }
  for (const nome of declaradas.keys()) curvaDe(nome);

  /* ---- os nós e os nós de cada curva ---- */
  const nos = new Map(); const porPosicao = new Map();
  const nosDaCurva = new Map([...declaradas.keys()].map((n) => [n, []]));
  const novoNo = (id, pos) => {
    const no = { id, pos, curvas: new Map() };
    nos.set(id, no);
    if (!porPosicao.has(chaveDaPosicao(pos))) porPosicao.set(chaveDaPosicao(pos), id);
    return no;
  };
  const literaisDoNo = new Map(); // nó -> [{ curva, pontoChave }] das pontas de curva escritas em coordenada que o criaram ou se fundiram a ele
  const literalDoNo = (id, curva, pontoChave) => { if (!literaisDoNo.has(id)) literaisDoNo.set(id, []); literaisDoNo.get(id).push({ curva, pontoChave }); };
  const noNaCurva = (id, curvaNome, f) => {
    const no = nos.get(id);
    const lista = nosDaCurva.get(curvaNome);
    const atual = no.curvas.get(curvaNome);
    if (atual !== undefined) {
      const dist = Math.min(Math.abs(atual - f), curvas.get(curvaNome).fechada ? 1 - Math.abs(atual - f) : Infinity);
      if (dist > TOLERANCIA_DA_FRACAO) falha(`o nó ${citar(id)} aparece duas vezes na curva ${citar(curvaNome)}, a ${br(atual * 100)}% e a ${br(f * 100)}% do comprimento`);
      return;
    }
    no.curvas.set(curvaNome, f);
    lista.push({ no: id, f });
  };
  for (const [nome, d] of nosDeclarados) {
    if (d.tipo === 'ponto') novoNo(nome, d.p); else novoNo(nome, posicaoDoNo(nome));
  }
  for (const [nome, c] of curvas) {
    const d = c.decl;
    d.pontos.forEach((p, k) => {
      if (typeof p !== 'string') return;
      const f = c.fechada && k === 0 ? 0 : c.fracaoDaChave(k);
      noNaCurva(p, nome, f);
    });
  }
  for (const [nome, d] of nosDeclarados) if (d.tipo === 'curva') noNaCurva(nome, d.curva, d.fracao);
  for (const [nome, c] of curvas) {
    if (c.fechada) continue;
    const pontas = [[0, c.chaves[0], `${nome}^i`, 0], [c.chaves.length - 1, c.chaves[c.chaves.length - 1], `${nome}^f`, 1]];
    for (const [k, pos, idAnonimo, f] of pontas) {
      const chave = c.decl.pontos[k];
      if (typeof chave === 'string') continue;
      const existente = porPosicao.get(chaveDaPosicao(pos));
      if (existente !== undefined) { noNaCurva(existente, nome, f); literalDoNo(existente, nome, k); }
      else { novoNo(idAnonimo, pos); noNaCurva(idAnonimo, nome, f); literalDoNo(idAnonimo, nome, k); }
    }
  }

  /* ---- os lados dos retalhos, e os nós que as frações pedem ---- */
  const fracaoComoNo = (curvaNome, f) => {
    const lista = nosDaCurva.get(curvaNome); const c = curvas.get(curvaNome);
    for (const { no, f: g } of lista) {
      const dist = Math.min(Math.abs(g - f), c.fechada ? 1 - Math.abs(g - f) : Infinity);
      if (dist <= TOLERANCIA_DA_FRACAO) return no;
    }
    const id = `${curvaNome}@${f}`;
    if (!nos.has(id)) novoNo(id, c.em(f));
    noNaCurva(id, curvaNome, c.fechada ? f - Math.floor(f) : f);
    return id;
  };
  if (!Array.isArray(definicao.retalhos) || !definicao.retalhos.length) falha('retalhos precisa ser lista não vazia de { nome, borda }');
  const retalhos = [];
  const nomesDeRetalho = new Set();
  for (const [k, r] of definicao.retalhos.entries()) {
    exigirCampos(r, ['nome', 'borda', 'divisoes'], `o retalho ${k}`);
    if (typeof r.nome !== 'string' || !r.nome) falha(`o retalho ${k} precisa de nome (texto não vazio)`);
    if (nomesDeRetalho.has(r.nome)) falha(`o nome de retalho ${citar(r.nome)} aparece mais de uma vez`);
    nomesDeRetalho.add(r.nome);
    if (!Array.isArray(r.borda) || r.borda.length < 3 || r.borda.length > MAIOR_RETALHO) falha(`o retalho ${citar(r.nome)} precisa de três a ${MAIOR_RETALHO} lados em borda: curvas inteiras ou { curva, de, ate }`);
    const lados = r.borda.map((e, j) => {
      const l = typeof e === 'string' ? { curva: e } : e;
      exigirCampos(l, ['curva', 'de', 'ate'], `o lado ${j + 1} do retalho ${citar(r.nome)}`);
      const c = curvas.get(l.curva);
      if (!c) falha(`o lado ${j + 1} do retalho ${citar(r.nome)} cita a curva ${citar(l.curva)}, que não existe`);
      const no = (campo, padrao) => {
        const v = l[campo];
        if (v == null) {
          if (c.fechada) falha(`o lado ${j + 1} do retalho ${citar(r.nome)} está na curva fechada ${citar(l.curva)} e precisa de de e ate, nós ou frações`);
          return padrao;
        }
        if (typeof v === 'string') {
          if (!nos.has(v)) falha(`o lado ${j + 1} do retalho ${citar(r.nome)} cita o nó ${citar(v)}, que não existe`);
          if (!nos.get(v).curvas.has(l.curva)) falha(`o nó ${citar(v)} do lado ${j + 1} do retalho ${citar(r.nome)} não está na curva ${citar(l.curva)}; ponha-o entre os pontos-chave dela, ou declare-o em nos como { curva: ${citar(l.curva)}, fracao }`);
          return v;
        }
        if (typeof v !== 'number' || !(v >= 0 && v <= 1)) falha(`${campo} do lado ${j + 1} do retalho ${citar(r.nome)} precisa ser nó ou fração de 0 a 1 do comprimento`);
        return fracaoComoNo(l.curva, v);
      };
      const inicioPadrao = c.fechada ? null : nosDaCurva.get(l.curva).find((x) => x.f === 0)?.no;
      const fimPadrao = c.fechada ? null : nosDaCurva.get(l.curva).find((x) => x.f === 1)?.no;
      const de = no('de', inicioPadrao); const ate = no('ate', fimPadrao);
      if (de === ate) falha(`o lado ${j + 1} do retalho ${citar(r.nome)} começa e termina no nó ${citar(de)}; o lado precisa ir de um nó a outro`);
      return { curva: l.curva, de, ate };
    });
    retalhos.push({ nome: r.nome, lados, divisoes: r.divisoes ?? null });
  }

  /* ---- os arcos: a curva partida nos nós ---- */
  const arcos = []; const arcosDaCurva = new Map();
  for (const [nome, c] of curvas) {
    const ordem = nosDaCurva.get(nome).slice().sort((a, b) => a.f - b.f || (a.no < b.no ? -1 : 1));
    for (let k = 1; k < ordem.length; k++) if (ordem[k].f - ordem[k - 1].f <= TOLERANCIA_DA_FRACAO) falha(`os nós ${citar(ordem[k - 1].no)} e ${citar(ordem[k].no)} ficam no mesmo ponto da curva ${citar(nome)}; use um só`);
    const feitos = [];
    const total = c.fechada ? ordem.length : ordem.length - 1;
    for (let k = 0; k < total; k++) {
      const a = ordem[k]; const b = ordem[(k + 1) % ordem.length];
      const f0 = a.f; const f1 = c.fechada && k === ordem.length - 1 ? b.f + 1 : b.f;
      const arco = { id: arcos.length, curva: nome, f0, f1, de: a.no, ate: b.no, comprimento: (f1 - f0) * c.comprimento, usos: [], n: 0, alvo: 0 };
      arcos.push(arco); feitos.push(arco);
    }
    arcosDaCurva.set(nome, { ordem, arcos: feitos });
  }
  const arcosDaCadeia = (curvaNome, de, ate, quem) => {
    const { ordem, arcos: lista } = arcosDaCurva.get(curvaNome);
    const c = curvas.get(curvaNome);
    const kd = ordem.findIndex((x) => x.no === de); const ka = ordem.findIndex((x) => x.no === ate);
    if (kd < 0 || ka < 0) falha(`${quem}: os nós ${citar(de)} e ${citar(ate)} não estão na curva ${citar(curvaNome)}`);
    if (kd === ka && !c.fechada) falha(`${quem}: ${citar(de)} e ${citar(ate)} são o mesmo nó`);
    const saida = [];
    if (c.fechada) {
      for (let k = kd; ; k = (k + 1) % ordem.length) { saida.push({ arco: lista[k], dir: 1 }); if ((k + 1) % ordem.length === ka) break; }
    } else if (kd < ka) {
      for (let k = kd; k < ka; k++) saida.push({ arco: lista[k], dir: 1 });
    } else {
      for (let k = kd - 1; k >= ka; k--) saida.push({ arco: lista[k], dir: -1 });
    }
    return saida;
  };

  /* ---- a cadeia de cada retalho: o sentido dos lados ---- */
  for (const r of retalhos) {
    const lados = r.lados.map((l) => ({ ...l, arcos: arcosDaCadeia(l.curva, l.de, l.ate, `o retalho ${citar(r.nome)}`) }));
    const inverter = (l) => ({ curva: l.curva, de: l.ate, ate: l.de, arcos: [...l.arcos].reverse().map((x) => ({ arco: x.arco, dir: -x.dir })) });
    const tentar = (primeiro) => {
      const cadeia = [primeiro]; let atual = primeiro.ate;
      for (let j = 1; j < lados.length; j++) {
        const l = lados[j];
        if (l.de === atual) cadeia.push(l);
        else if (l.ate === atual) cadeia.push(inverter(l));
        else return null;
        atual = cadeia[cadeia.length - 1].ate;
      }
      return atual === primeiro.de ? cadeia : null;
    };
    const cadeia = tentar(lados[0]) ?? tentar(inverter(lados[0]));
    if (!cadeia) {
      const pontas = lados.map((l) => `${citar(l.curva)} de ${citar(l.de)} a ${citar(l.ate)}`).join('; ');
      falha(`os lados do retalho ${citar(r.nome)} não fecham uma volta (cada lado começa onde o anterior termina): ${pontas}; confira os nós das pontas, e se uma curva termina sobre outra, declare o nó em nos como { curva, fracao }`);
    }
    r.cadeia = cadeia;
    r.cantos = cadeia.map((l) => l.de);
    if (new Set(r.cantos).size !== r.cantos.length) falha(`o retalho ${citar(r.nome)} passa duas vezes pelo nó ${citar(r.cantos.find((c, i) => r.cantos.indexOf(c) !== i))}`);
    if (cadeia.length === 4 && r.divisoes != null) {
      const d = Array.isArray(r.divisoes) ? r.divisoes : [r.divisoes, r.divisoes];
      if (d.length !== 2 || d.some((x) => !Number.isInteger(x) || x < 1)) falha(`divisoes do retalho ${citar(r.nome)} precisa ser [nU, nV] inteiros ou um inteiro, de 1 para cima`);
      r.dv = d;
    } else if (cadeia.length !== 4 && r.divisoes != null) {
      if (!Number.isInteger(r.divisoes) || r.divisoes < 2 || r.divisoes % 2) falha(`divisoes do retalho de ${cadeia.length} lados ${citar(r.nome)} precisa ser um número par, de 2 para cima, igual nos lados`);
      r.dv = r.divisoes;
    } else if (r.divisoes != null) falha(`divisoes do retalho ${citar(r.nome)} não pôde ser lida`);
    for (const l of cadeia) for (const x of l.arcos) x.arco.usos.push(r.nome);
  }
  for (const a of arcos) if (a.usos.length > 2) falha(`o arco da curva ${citar(a.curva)} entre ${citar(a.de)} e ${citar(a.ate)} é lado de ${a.usos.length} retalhos (${lista(a.usos)}); uma aresta tem no máximo dois`);
  const usados = arcos.filter((a) => a.usos.length);
  const nomeDoArco = (a) => `o arco da curva ${citar(a.curva)} entre ${citar(a.de)} e ${citar(a.ate)}`;

  /* ---- as divisões ---- */
  for (const [nome, c] of curvas) c.monitor = criarMonitor(c, c.decl.passo ?? passoDaRede ?? c.comprimento, anguloMax);
  for (const a of usados) {
    const c = curvas.get(a.curva);
    const doGiro = giroDoArco(c, a.f0, a.f1) / anguloMax;
    a.alvo = Math.max(1, c.monitor.integral(a.f1) - c.monitor.integral(a.f0));
    a.minimo = Math.max(1, Math.ceil(doGiro - 1e-9));
  }
  const A = arcos.length;
  const linhas = []; const alvos = new Map(); const variaveis = [];
  for (const a of usados) { alvos.set(a.id, a.alvo); variaveis.push(a.id); }
  const somaDoLado = (lado, sinal = 1) => { const t = new Map(); for (const x of lado.arcos) t.set(x.arco.id, (t.get(x.arco.id) ?? 0) + sinal); return t; };
  const juntar = (...ts) => { const t = new Map(); for (const m of ts) for (const [v, c] of m) t.set(v, (t.get(v) ?? 0) + c); return t; };
  const alvoDoLado = (lado) => lado.arcos.reduce((s, x) => s + x.arco.alvo, 0);
  retalhos.forEach((r, p) => {
    const n = r.cadeia.length;
    if (n === 4) {
      const [l0, l1, l2, l3] = r.cadeia;
      const nome = `os lados opostos do retalho ${citar(r.nome)}`;
      if (r.dv) {
        linhas.push({ termos: somaDoLado(l0), rhs: r.dv[0], texto: `o primeiro lado do retalho ${citar(r.nome)} pede ${r.dv[0]} divisões` });
        linhas.push({ termos: somaDoLado(l2), rhs: r.dv[0], texto: `o terceiro lado do retalho ${citar(r.nome)} pede ${r.dv[0]} divisões` });
        linhas.push({ termos: somaDoLado(l1), rhs: r.dv[1], texto: `o segundo lado do retalho ${citar(r.nome)} pede ${r.dv[1]} divisões` });
        linhas.push({ termos: somaDoLado(l3), rhs: r.dv[1], texto: `o quarto lado do retalho ${citar(r.nome)} pede ${r.dv[1]} divisões` });
      } else {
        linhas.push({ termos: juntar(somaDoLado(l0), somaDoLado(l2, -1)), rhs: 0, texto: `${nome} (primeiro e terceiro) têm de somar as mesmas divisões` });
        linhas.push({ termos: juntar(somaDoLado(l1), somaDoLado(l3, -1)), rhs: 0, texto: `${nome} (segundo e quarto) têm de somar as mesmas divisões` });
      }
    } else if (r.dv) {
      r.cadeia.forEach((l, j) => linhas.push({ termos: somaDoLado(l), rhs: r.dv, texto: `o lado ${j + 1} do retalho ${citar(r.nome)} pede ${r.dv} divisões` }));
    } else {
      const m = A + p; variaveis.push(m);
      alvos.set(m, Math.max(1, r.cadeia.reduce((s, l) => s + alvoDoLado(l), 0) / n / 2));
      r.cadeia.forEach((l, j) => linhas.push({ termos: juntar(somaDoLado(l), new Map([[m, -2]])), rhs: 0, texto: `os ${n} lados do retalho ${citar(r.nome)} têm de somar o mesmo número par de divisões (lado ${j + 1})` }));
    }
  });
  for (const r of retalhos) {
    if (!r.dv && passoDaRede == null && r.cadeia.some((l) => l.arcos.some((x) => curvas.get(x.arco.curva).decl.passo == null))) {
      /* sem passo da rede nem da curva, o alvo vem só do giro: a rede precisa de passo ou de divisoes */
      falha(`o retalho ${citar(r.nome)} não declara divisoes e a rede não declara passo; declare o passo da rede (mm) ou divisoes no retalho`);
    }
  }
  variaveis.sort((a, b) => a - b);
  const nomeDaVariavel = (v) => (v < A ? nomeDoArco(arcos[v]) : `o retalho ${citar(retalhos[v - A].nome)}`);
  const pesosDoCusto = new Map(usados.map((a) => [a.id, 1]));
  const minimosDosArcos = new Map(usados.map((a) => [a.id, a.minimo]));
  const vizinhasDaCurva = [];
  for (const { arcos: lista2 } of arcosDaCurva.values()) {
    for (let k = 0; k < lista2.length; k++) {
      const a = lista2[k]; const b = lista2[(k + 1) % lista2.length];
      if (a === b || a.ate !== b.de || !a.usos.length || !b.usos.length) continue;
      vizinhasDaCurva.push({ a: a.id, b: b.id, la: a.comprimento, lb: b.comprimento });
    }
  }
  const chaveDoArco = (a) => `${a.curva}:${a.de}>${a.ate}`;
  const semCoordenadas = semCoordenadasDa(definicao);
  /* a ferramenta que mede o que um ponto-chave move fixa as divisões de cada arco e a posição relativa de cada ponto dentro do arco: a
     malha fica a mesma e os pontos acompanham a curva sem o deslize que o espaçamento por curvatura daria a cada milímetro movido */
  const fixas = divisoesFixadas(assinaturaDaRede(semCoordenadas));
  const fixadas = fixas && usados.every((a) => Number.isInteger(fixas.divisoes[chaveDoArco(a)]) && fixas.divisoes[chaveDoArco(a)] >= 1);
  if (fixadas) {
    for (const a of usados) a.n = fixas.divisoes[chaveDoArco(a)];
  } else {
    const divisoes = resolverSistema(variaveis, linhas, alvos, pesosDoCusto, minimosDosArcos, nomeDaVariavel);
    for (const a of usados) a.n = divisoes.get(a.id);
  }

  /* ---- os vértices dos arcos ---- */
  const posicao = new Map(); const ordemDosVertices = [];
  const novoVertice = (id, p) => {
    if (posicao.has(id)) falha(`o ponto ${citar(id)} já existe; um nó, uma curva e um retalho não podem ter o mesmo nome de ponto`);
    posicao.set(id, p); ordemDosVertices.push(id);
  };
  const nomeDoNo = (id) => pref(id);
  for (const a of usados) for (const id of [a.de, a.ate]) if (!posicao.has(nomeDoNo(id))) novoVertice(nomeDoNo(id), [...nos.get(id).pos]);
  const verticesDoArco = new Map(); // id -> nomes, de `de` a `ate`
  const fracaoDoVertice = new Map(); // nome do ponto de dentro de um arco -> { curva, fracao }
  const contadorDaCurva = new Map();
  for (const a of usados) {
    const c = curvas.get(a.curva);
    const ids = [nomeDoNo(a.de)];
    for (let k = 1; k < a.n; k++) {
      const i = (contadorDaCurva.get(a.curva) ?? 0) + 1; contadorDaCurva.set(a.curva, i);
      const id = pref(`${a.curva}.${i}`);
      const fixa = fixadas ? fixas.fracoes[id] : undefined;
      const fr = fixa !== undefined ? a.f0 + fixa * (a.f1 - a.f0) : c.monitor.fracaoDaIntegral(c.monitor.integral(a.f0) + (c.monitor.integral(a.f1) - c.monitor.integral(a.f0)) * k / a.n);
      novoVertice(id, c.em(fr));
      fracaoDoVertice.set(id, { curva: a.curva, fracao: c.fechada ? fr - Math.floor(fr) : fr, noArco: (fr - a.f0) / (a.f1 - a.f0) });
      ids.push(id);
    }
    ids.push(nomeDoNo(a.ate));
    verticesDoArco.set(a.id, ids);
  }
  const ladoEmVertices = (lado) => {
    const ids = [];
    for (const { arco, dir } of lado.arcos) {
      const v = verticesDoArco.get(arco.id);
      const seq = dir === 1 ? v : [...v].reverse();
      ids.push(...(ids.length ? seq.slice(1) : seq));
    }
    return ids;
  };

  /* ---- o preenchimento ---- */
  const avisos = [...avisosDoAlisamento, ...juncoes.avisos]; const angulosDosCantos = new Map();
  const facesDoRetalho = new Map(); const interiorDoRetalho = new Map(); const centros = new Map();
  const novoInterior = (retalho, id, p) => { novoVertice(id, p); interiorDoRetalho.get(retalho).push(id); };
  for (const r of retalhos) {
    interiorDoRetalho.set(r.nome, []);
    const lados = r.cadeia.map(ladoEmVertices);
    const P = (id) => posicao.get(id);
    const faces = [];
    if (r.cadeia.length === 4) {
      const [s0, s1, s2, s3] = lados;
      const nU = s0.length - 1; const nV = s1.length - 1;
      if (s2.length - 1 !== nU || s3.length - 1 !== nV) falha(`o retalho ${citar(r.nome)} ficou com lados opostos de divisões diferentes (${nU} e ${s2.length - 1}, ${nV} e ${s3.length - 1})`);
      const c00 = P(s0[0]), c10 = P(s0[nU]), c11 = P(s1[nV]), c01 = P(s2[nU]);
      const id = (i, j) => {
        if (j === 0) return s0[i];
        if (i === nU) return s1[j];
        if (j === nV) return s2[nU - i];
        if (i === 0) return s3[nV - j];
        return pref(`${r.nome}.${i}.${j}`);
      };
      for (let j = 1; j < nV; j++) {
        for (let i = 1; i < nU; i++) {
          const u = i / nU; const v = j / nV;
          const a = P(s0[i]); const b = P(s1[j]); const c = P(s2[nU - i]); const d = P(s3[nV - j]);
          const p = [0, 1, 2].map((q) => (1 - v) * a[q] + v * c[q] + (1 - u) * d[q] + u * b[q]
            - ((1 - u) * (1 - v) * c00[q] + u * (1 - v) * c10[q] + u * v * c11[q] + (1 - u) * v * c01[q]));
          novoInterior(r.nome, id(i, j), p);
        }
      }
      for (let j = 0; j < nV; j++) for (let i = 0; i < nU; i++) faces.push([id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)]);
    } else {
      const n = lados.length;
      const metade = (lados[0].length - 1) / 2;
      if (!Number.isInteger(metade) || lados.some((l) => l.length - 1 !== 2 * metade)) falha(`o retalho de ${n} lados ${citar(r.nome)} ficou com lados de divisões diferentes ou ímpares (${lados.map((l) => l.length - 1).join(', ')})`);
      const m = metade;
      const Pc = lados.map((l) => P(l[0]));
      const Mid = lados.map((l) => P(l[m]));
      /* a normal média do retalho e a flecha de cada lado sobre ela: só a parte fora da superfície entra na correção do centro, porque o
         arco que o lado faz dentro do plano já está no meio dele */
      let nm = [0, 0, 0];
      for (let i = 0; i < n; i++) { const a = Pc[i]; const b = Pc[(i + 1) % n]; nm = [nm[0] + (a[1] - b[1]) * (a[2] + b[2]), nm[1] + (a[2] - b[2]) * (a[0] + b[0]), nm[2] + (a[0] - b[0]) * (a[1] + b[1])]; }
      const normal = vezes(nm, 1 / (norma(nm) || 1));
      const delta = Mid.map((M, i) => dot(sub(M, vezes(soma(Pc[i], Pc[(i + 1) % n]), 0.5)), normal));
      const mediaC = vezes(Pc.reduce(soma, [0, 0, 0]), 1 / n);
      const mediaM = vezes(Mid.reduce(soma, [0, 0, 0]), 1 / n);
      const mediaD = delta.reduce((x, y) => x + y, 0) / n;
      const C = soma(vezes(soma(mediaC, mediaM), 0.5), vezes(normal, (1 / (Math.sin(Math.PI / n) ** 2) - 0.5) * mediaD));
      const nomeCentro = pref(`${r.nome}.centro`);
      novoInterior(r.nome, nomeCentro, C);
      centros.set(r.nome, nomeCentro);
      /* o raio i vai do meio do lado i ao centro, em parábola */
      const raio = Mid.map((M, i) => {
        const compLado = norma(sub(Pc[(i + 1) % n], Pc[i]));
        const l = norma(sub(C, M));
        const g = compLado > 0 ? vezes(normal, delta[i] * (l / compLado) ** 2) : [0, 0, 0];
        return (t) => [0, 1, 2].map((q) => (1 - t) * M[q] + t * C[q] + 4 * t * (1 - t) * g[q]);
      });
      const idRaio = (i, k) => (k === 0 ? lados[i][m] : k === m ? nomeCentro : pref(`${r.nome}.r${i}.${k}`));
      for (let i = 0; i < n; i++) for (let k = 1; k < m; k++) novoInterior(r.nome, idRaio(i, k), raio[i](k / m));
      const anterior = (i) => (i + n - 1) % n;
      for (let i = 0; i < n; i++) {
        /* o quadrilátero do canto i: (a, b) com a de V_i a M_i pelo lado i, b de V_i a M_{i-1} pelo lado anterior */
        const L = anterior(i);
        const bot = (a) => P(lados[i][a]); const esq = (b) => P(lados[L][2 * m - b]);
        const dir = (b) => raio[i](b / m); const topo = (a) => raio[L](a / m);
        const c00 = Pc[i], c10 = Mid[i], c11 = C, c01 = Mid[L];
        const id = (a, b) => {
          if (b === 0) return lados[i][a];
          if (a === 0) return lados[L][2 * m - b];
          if (a === m) return idRaio(i, b);
          if (b === m) return idRaio(L, a);
          return pref(`${r.nome}.${i}.${a}.${b}`);
        };
        for (let b = 1; b < m; b++) {
          for (let a = 1; a < m; a++) {
            const u = a / m; const v = b / m;
            const A0 = bot(a); const B0 = dir(b); const C0 = topo(a); const D0 = esq(b);
            const p = [0, 1, 2].map((q) => (1 - v) * A0[q] + v * C0[q] + (1 - u) * D0[q] + u * B0[q]
              - ((1 - u) * (1 - v) * c00[q] + u * (1 - v) * c10[q] + u * v * c11[q] + (1 - u) * v * c01[q]));
            novoInterior(r.nome, id(a, b), p);
          }
        }
        for (let b = 0; b < m; b++) for (let a = 0; a < m; a++) faces.push([id(a, b), id(a + 1, b), id(a + 1, b + 1), id(a, b + 1)]);
      }
    }
    /* o canto: o ângulo entre os dois primeiros lados da gaiola que saem dele, e a dobra do preenchimento */
    const angulos = lados.map((l, j) => {
      const antes = lados[(j + lados.length - 1) % lados.length];
      const a = sub(P(antes[antes.length - 2]), P(l[0])); const b = sub(P(l[1]), P(l[0]));
      return Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (norma(a) * norma(b))))) * 180 / Math.PI;
    });
    angulosDosCantos.set(r.nome, angulos);
    const normais = faces.map((f) => { const n = [0, 0, 0]; for (let k = 0; k < f.length; k++) { const a = P(f[k]); const b = P(f[(k + 1) % f.length]); n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); } return n; });
    const media = normais.reduce(soma, [0, 0, 0]);
    const dobradas = faces.map((f, i) => i).filter((i) => dot(normais[i], media) <= 0);
    if (dobradas.length) {
      const f0 = faces[dobradas[0]];
      const centro = vezes(f0.map(P).reduce(soma, [0, 0, 0]), 1 / f0.length);
      let perto = 0; let dMin = Infinity;
      r.cantos.forEach((no, j) => { const d = norma(sub(P(nomeDoNo(no)), centro)); if (d < dMin) { dMin = d; perto = j; } });
      falha(`o preenchimento do retalho ${citar(r.nome)} dobra ${dobradas.length} face(s) perto do nó ${citar(r.cantos[perto])}, onde os lados formam ${br(angulos[perto])} graus: um canto quase reto ou agudo demais não cabe num retalho de Coons; ponha o nó no meio de um lado (a ligação termina na curva do vizinho), mova a ligação para que chegue mais perto de 90 graus, ou divida o retalho com mais uma curva`);
    }
    angulos.forEach((g, j) => {
      if (g > ANGULO_QUASE_RETO || g < ANGULO_AGUDO) {
        avisos.push({
          ref: g > ANGULO_QUASE_RETO ? 'cantoQuaseReto' : 'cantoAgudo', retalho: r.nome, no: r.cantos[j], anguloGraus: Math.round(g * 10) / 10,
          texto: `o canto ${citar(r.cantos[j])} do retalho ${citar(r.nome)} forma ${br(g)} graus; as faces dele saem ${g > ANGULO_QUASE_RETO ? 'quase retas, de área pequena' : 'agudas, em lasca'}, e a superfície pode ondular ali`,
        });
      }
    });
    facesDoRetalho.set(r.nome, faces);
  }

  /* ---- o sentido das faces ---- */
  const estado = new Map(); // retalho -> 0 ou 1 (virado)
  const dirNoRetalho = (r, arcoId) => {
    for (const l of r.cadeia) for (const x of l.arcos) if (x.arco.id === arcoId) return x.dir;
    return 0;
  };
  const vizinhosDe = new Map(retalhos.map((r) => [r.nome, []]));
  for (const a of usados) if (a.usos.length === 2) { vizinhosDe.get(a.usos[0]).push({ outro: a.usos[1], arco: a.id }); vizinhosDe.get(a.usos[1]).push({ outro: a.usos[0], arco: a.id }); }
  const porNomeDeRetalho = new Map(retalhos.map((r) => [r.nome, r]));
  const componentes = [];
  for (const r of retalhos) {
    if (estado.has(r.nome)) continue;
    estado.set(r.nome, 0);
    const fila = [r.nome]; const membros = [r.nome];
    while (fila.length) {
      const atual = fila.shift();
      for (const { outro, arco } of vizinhosDe.get(atual)) {
        const meu = dirNoRetalho(porNomeDeRetalho.get(atual), arco) * (estado.get(atual) ? -1 : 1);
        const dele = dirNoRetalho(porNomeDeRetalho.get(outro), arco);
        const preciso = meu === dele ? 1 : 0; // dele precisa ser oposto ao meu
        if (estado.has(outro)) {
          const efetivo = dele * (estado.get(outro) ? -1 : 1);
          if (efetivo === meu) falha(`os retalhos ${citar(atual)} e ${citar(outro)} não se orientam juntos: a rede não é orientável por eles (confira os lados dos retalhos que fecham a volta em torno de ${nomeDoArco(arcos[arco])})`);
        } else { estado.set(outro, preciso); fila.push(outro); membros.push(outro); }
      }
    }
    componentes.push(membros);
  }
  const fora = definicao.fora ?? null;
  const normalDe = (face) => {
    const n = [0, 0, 0];
    for (let k = 0; k < face.length; k++) {
      const a = posicao.get(face[k]); const b = posicao.get(face[(k + 1) % face.length]);
      n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return n;
  };
  for (const membros of componentes) {
    if (!fora) continue;
    let s = 0;
    for (const nome of membros) for (const f of facesDoRetalho.get(nome)) s += dot(normalDe(f), fora) * (estado.get(nome) ? -1 : 1);
    if (s < 0) for (const nome of membros) estado.set(nome, estado.get(nome) ? 0 : 1);
  }
  const faces = []; const retalhoDaFace = [];
  for (const r of retalhos) {
    for (const f of facesDoRetalho.get(r.nome)) { faces.push(estado.get(r.nome) ? [...f].reverse() : f); retalhoDaFace.push(r.nome); }
  }

  /* ---- vincos, linhas ---- */
  const cadeiaDaCurva = (curvaNome, de, ate, quem) => {
    const c = curvas.get(curvaNome);
    const { ordem } = arcosDaCurva.get(curvaNome);
    const noDe = de ?? (c.fechada ? ordem[0].no : ordem[0].no);
    const noAte = ate ?? (c.fechada ? ordem[0].no : ordem[ordem.length - 1].no);
    const cadeiaArcos = c.fechada && noDe === noAte
      ? Array.from({ length: ordem.length }, (_, k) => ({ arco: arcosDaCurva.get(curvaNome).arcos[(ordem.findIndex((x) => x.no === noDe) + k) % ordem.length], dir: 1 }))
      : arcosDaCadeia(curvaNome, noDe, noAte, quem);
    const ids = [];
    for (const { arco, dir } of cadeiaArcos) {
      const v = verticesDoArco.get(arco.id);
      if (!v) falha(`${quem}: o arco da curva ${citar(curvaNome)} entre ${citar(arco.de)} e ${citar(arco.ate)} não é lado de nenhum retalho`);
      const seq = dir === 1 ? v : [...v].reverse();
      ids.push(...(ids.length ? seq.slice(1) : seq));
    }
    return ids;
  };
  const linha = (curvaNome, de, ate) => {
    if (!curvas.has(curvaNome)) falha(`linha(): a curva ${citar(curvaNome)} não existe; as curvas são ${lista([...curvas.keys()])}`);
    for (const [campo, v] of [['de', de], ['ate', ate]]) if (v != null && !(typeof v === 'string' && nos.has(v) && nos.get(v).curvas.has(curvaNome))) falha(`linha(): ${campo} ${JSON.stringify(v)} não é nó da curva ${citar(curvaNome)}`);
    return cadeiaDaCurva(curvaNome, de ?? null, ate ?? null, `linha(${citar(curvaNome)})`);
  };
  /* os trechos contíguos de arcos usados de uma curva, cada um a lista dos nomes de ponto ao longo dele */
  const trechosUsados = (nome, c) => {
    const { arcos: lista2 } = arcosDaCurva.get(nome);
    const usadosDaCurva = lista2.map((a) => a.usos.length > 0);
    if (!usadosDaCurva.some(Boolean)) return [];
    const trechos = [];
    let atual = [];
    for (let k = 0; k < lista2.length; k++) {
      if (usadosDaCurva[k]) atual.push(lista2[k]); else if (atual.length) { trechos.push(atual); atual = []; }
    }
    if (atual.length) trechos.push(atual);
    if (c.fechada && trechos.length > 1 && usadosDaCurva[0] && usadosDaCurva[lista2.length - 1]) { const ultimo = trechos.pop(); trechos[0] = [...ultimo, ...trechos[0]]; }
    return trechos.map((t) => {
      const ids = [];
      for (const a of t) { const v = verticesDoArco.get(a.id); ids.push(...(ids.length ? v.slice(1) : v)); }
      return ids;
    });
  };
  const vincos = [];
  for (const [nome, c] of curvas) {
    if (c.decl.vinco == null) continue;
    const trechos = trechosUsados(nome, c);
    trechos.forEach((ids, k) => vincos.push({ nome: trechos.length > 1 ? pref(`${nome}.${k + 1}`) : pref(nome), pontos: ids, nitidez: c.decl.vinco }));
  }
  /* marcarCurvas: toda curva com arco usado vai ao passo como curva declarada (`curvas` da subdivisão), um trecho por entrada */
  const curvasMarcadas = [];
  if (marcarCurvas) {
    for (const [nome, c] of curvas) {
      for (const ids of trechosUsados(nome, c)) curvasMarcadas.push({ nome: pref(nome), pontos: ids, ...(c.decl.continuidade ? { continuidade: c.decl.continuidade } : {}) });
    }
  }
  const linhasDasCurvas = {};
  for (const [nome] of curvas) {
    const { arcos: lista2 } = arcosDaCurva.get(nome);
    if (lista2.length && lista2.every((a) => a.usos.length)) linhasDasCurvas[nome] = cadeiaDaCurva(nome, null, null, `linha(${citar(nome)})`);
  }

  /* ---- topologia: arestas, valência, borda ---- */
  const vizinhos = new Map(); const contagem = new Map();
  for (const f of faces) {
    for (let k = 0; k < f.length; k++) {
      const a = f[k]; const b = f[(k + 1) % f.length]; const c = chaveDeAresta(a, b);
      contagem.set(c, (contagem.get(c) ?? 0) + 1);
      if (!vizinhos.has(a)) vizinhos.set(a, new Set());
      if (!vizinhos.has(b)) vizinhos.set(b, new Set());
      vizinhos.get(a).add(b); vizinhos.get(b).add(a);
    }
  }
  for (const [c, n] of contagem) if (n > 2) falha(`a aresta ${c.replace('\u0000', '-')} tem ${n} faces; a rede tem retalhos sobrepostos`);

  /* ---- cantos: nós de borda com desvio de direção acima do limite, e os declarados ---- */
  const cantos = new Set();
  for (const n of definicao.cantos ?? []) {
    if (!nos.has(n) || !posicao.has(nomeDoNo(n))) falha(`cantos cita o nó ${citar(n)}, que não é nó da rede`);
    cantos.add(nomeDoNo(n));
  }
  const cantosAchados = [];
  if (anguloDeCanto) {
    for (const [v, vs] of vizinhos) {
      const daBorda = [...vs].filter((w) => contagem.get(chaveDeAresta(v, w)) === 1);
      if (!daBorda.length) continue;
      if (daBorda.length === 2) {
        const p = posicao.get(v);
        const d1 = sub(posicao.get(daBorda[0]), p); const d2 = sub(posicao.get(daBorda[1]), p);
        const cos = dot(d1, d2) / (norma(d1) * norma(d2));
        const desvio = 180 - Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
        if (desvio > anguloDeCanto && !cantos.has(v)) { cantos.add(v); cantosAchados.push({ ponto: v, desvioGraus: Math.round(desvio * 10) / 10 }); }
      } else if (daBorda.length > 2 && !cantos.has(v)) { cantos.add(v); cantosAchados.push({ ponto: v, desvioGraus: null }); }
    }
  }

  /* ---- as emendas declaradas (`continuidade`): a curva, os dois lados, as fileiras que a atravessam e a faixa ---- */
  const emendasDeclaradas = [];
  for (const [nome, c] of curvas) {
    const tipo = c.decl.continuidade;
    if (tipo == null) continue;
    if (!liso) falha(`a curva ${citar(nome)} declara continuidade ${citar(tipo)} e a rede tem liso: false; a emenda se impõe no alisamento do miolo, que precisa ficar ligado`);
    const arcosDela = arcosDaCurva.get(nome).arcos.filter((a) => a.usos.length === 2);
    if (!arcosDela.length) {
      /* a curva no plano de simetria é borda de um retalho só: o outro lado é a metade espelhada */
      const noPlano = simetria === 'x' && arcosDaCurva.get(nome).arcos.some((a) => a.usos.length === 1)
        && arcosDaCurva.get(nome).arcos.filter((a) => a.usos.length === 1).every((a) => verticesDoArco.get(a.id).every((id) => Math.abs(posicao.get(id)[0]) < 1e-6));
      if (noPlano) falha(`a curva ${citar(nome)} declara continuidade ${citar(tipo)}, mas fica no plano de simetria x = 0: o outro lado dela é a metade espelhada, que a subdivisão emenda pela simetria, e a continuidade declarada vale só na curva entre dois retalhos da rede; tire a declaração dela`);
      falha(`a curva ${citar(nome)} declara continuidade ${citar(tipo)}, mas nenhum arco dela é lado de dois retalhos; a emenda é a curva entre dois retalhos`);
    }
    const daCurva = new Set(); const aoLongo = new Map(); const lados = new Set();
    for (const a of arcosDela) {
      const ids = verticesDoArco.get(a.id);
      ids.forEach((id, k) => {
        daCurva.add(id);
        if (!aoLongo.has(id)) aoLongo.set(id, new Set());
        if (k > 0) aoLongo.get(id).add(ids[k - 1]);
        if (k + 1 < ids.length) aoLongo.get(id).add(ids[k + 1]);
      });
      for (const r of a.usos) lados.add(r);
    }
    emendasDeclaradas.push({ nome, tipo, daCurva, aoLongo, lados, arcos: arcosDela });
  }
  /* o miolo que o alisamento move: o de dentro dos retalhos de quatro lados, de valência 4 */
  const mioloQueSeMove = new Set(retalhos.filter((r) => r.cadeia.length === 4).flatMap((r) => interiorDoRetalho.get(r.nome)).filter((id) => vizinhos.get(id)?.size === 4));
  const facesPorVertice = new Map();
  faces.forEach((f, i) => { for (const v of f) { if (!facesPorVertice.has(v)) facesPorVertice.set(v, []); facesPorVertice.get(v).push(i); } });
  const naBordaLivre = (v) => [...(vizinhos.get(v) ?? [])].some((w) => contagem.get(chaveDeAresta(v, w)) === 1);
  /* a fileira que atravessa a emenda não passa por vinco, canto nem borda livre: a parábola de um lado só vale dentro do trecho liso */
  const foraDaFileira = new Set([...vincos.flatMap((v) => v.pontos), ...cantos]);
  for (const e of emendasDeclaradas) {
    /* as fileiras que atravessam a curva em cada ponto dela de valência 4: de cada lado a1 (o vizinho fora da curva) e a2 (o vizinho de a1
       do outro lado da aresta c-a1, a fileira seguinte); o ponto de valência diferente fica fora, e é no máximo G1 */
    e.fileiras = []; e.extraordinarios = [];
    for (const c of e.daCurva) {
      const vs = vizinhos.get(c);
      const regular = naBordaLivre(c) ? vs.size === 3 : vs.size === 4;
      if (!regular) { e.extraordinarios.push(c); continue; }
      if (naBordaLivre(c)) continue;
      const cruzam = [...vs].filter((w) => !e.aoLongo.get(c).has(w));
      if (cruzam.length !== 2) continue;
      const lados = [];
      for (const a1 of cruzam) {
        const comuns = (facesPorVertice.get(c) ?? []).filter((i) => faces[i].includes(a1));
        if (comuns.length !== 2 || vizinhos.get(a1).size !== 4 || foraDaFileira.has(a1) || naBordaLivre(a1)) break;
        const fora = new Set(comuns.flatMap((i) => faces[i]));
        const a2 = [...vizinhos.get(a1)].filter((w) => !fora.has(w));
        if (a2.length !== 1 || foraDaFileira.has(a2[0]) || naBordaLivre(a2[0])) break;
        /* a terceira fileira, a3: o vizinho de a2 do outro lado da aresta a1-a2 */
        const comuns2 = (facesPorVertice.get(a1) ?? []).filter((i) => faces[i].includes(a2[0]));
        const fora2 = new Set(comuns2.flatMap((i) => faces[i]));
        const a3 = vizinhos.get(a2[0]).size === 4 ? [...vizinhos.get(a2[0])].filter((w) => !fora2.has(w)) : [];
        lados.push({ a1, a2: a2[0], a3: a3.length === 1 ? a3[0] : null, retalho: retalhoDaFace[comuns[0]] });
      }
      if (lados.length === 2 && lados[0].retalho !== lados[1].retalho) e.fileiras.push({ c, lados });
    }
    /* a faixa: os pontos de dentro dos retalhos dos dois lados a até FAIXA_DA_EMENDA arestas da curva */
    const deDentro = new Set([...e.lados].flatMap((r) => interiorDoRetalho.get(r)));
    e.faixa = new Set();
    let frente = [...e.daCurva];
    for (let k = 0; k < FAIXA_DA_EMENDA; k++) {
      const proxima = [];
      for (const v of frente) for (const w of vizinhos.get(v) ?? []) if (deDentro.has(w) && !e.faixa.has(w)) { e.faixa.add(w); proxima.push(w); }
      frente = proxima;
    }
  }

  /* ---- o miolo alisado pela normal: a tangente não quebra nas curvas compartilhadas ---- */
  let alisamento = null;
  if (liso) {
    const indice = new Map(ordemDosVertices.map((id, i) => [id, i]));
    const livres = new Set(); const pulados = new Set();
    /* só o miolo dos retalhos de quatro lados se mexe: o dos de três, cinco ou mais lados, com o centro extraordinário, fica como o preenchimento o pôs */
    for (const r of retalhos) if (r.cadeia.length === 4) for (const id of interiorDoRetalho.get(r.nome)) livres.add(indice.get(id));
    for (const [c, k] of contagem) if (k === 1) for (const id of c.split('\u0000')) pulados.add(indice.get(id));
    for (const v of vincos) for (const id of v.pontos) pulados.add(indice.get(id));
    for (const id of cantos) pulados.add(indice.get(id));
    /* o vértice de valência diferente de 4 (o centro do retalho de n lados, o nó onde se encontram três ou cinco retalhos) tem uma
       vizinhança que o laplaciano não descreve igual à dos outros: fica onde o preenchimento o pôs, e fora da soma */
    for (const [id, vs] of vizinhos) if (vs.size !== 4) { pulados.add(indice.get(id)); livres.delete(indice.get(id)); }
    /* A EMENDA DECLARADA. Na G1 a curva sai do laplaciano, como o vinco: cada lado se alisa com a curvatura dele, e o termo da tangente comum
       (`termosDaTangente` em `gaiola-por-rede-liso.js`) prende as inclinações dos dois lados uma à outra. Na G2 a curva fica no laplaciano, a
       variação pesa PESO_DA_CURVATURA vezes mais nas arestas da faixa (a curvatura fica a mesma dos dois lados e quase constante perto da
       curva), e o termo da tangente também entra. */
    const extras = {};
    if (emendasDeclaradas.length) {
      const tangentes = []; const naFaixaG2 = new Set();
      for (const e of emendasDeclaradas) {
        /* a G1 tira do laplaciano o ponto da curva cujas três fileiras de cada lado são miolo livre: a faixa estreita (uma ou duas fileiras
           entre duas curvas) fica sem laplaciano que a atravesse e com um modo que só a âncora segura, e ali a curva fica no laplaciano */
        if (e.tipo === 'G1') {
          for (const { c, lados } of e.fileiras) if (lados.every((l) => [l.a1, l.a2, l.a3].every((v) => v !== null && livres.has(indice.get(v))))) pulados.add(indice.get(c));
        }
        else for (const id of [...e.daCurva, ...e.faixa]) naFaixaG2.add(indice.get(id));
        for (const { c, lados } of e.fileiras) tangentes.push({ c: indice.get(c), lados: lados.map((l) => [indice.get(l.a1), indice.get(l.a2)]), peso: PESO_DA_TANGENTE });
      }
      if (tangentes.length) extras.tangentes = tangentes;
      if (naFaixaG2.size) extras.pesoDaAresta = (a, b) => (naFaixaG2.has(a) && naFaixaG2.has(b) ? PESO_DA_CURVATURA : 1);
    }
    const r = alisarMioloNaNormal(ordemDosVertices.map((id) => posicao.get(id)), faces.map((f) => f.map((id) => indice.get(id))), livres, pulados, { ...liso, ...extras });
    ordemDosVertices.forEach((id, i) => { if (livres.has(i)) posicao.set(id, r.posicoes[i]); });
    alisamento = { iteracoes: r.iteracoes, deslocamentoMaximoMm: Math.round(r.deslocamentoMaximo * 1000) / 1000 };
    for (const r2 of retalhos) {
      /* a média das normais do retalho sai uma vez (era refeita para cada face dele: o quadrado do número de faces) */
      const nf = (g) => { const m = [0, 0, 0]; for (let k = 0; k < g.length; k++) { const a = posicao.get(g[k]); const b = posicao.get(g[(k + 1) % g.length]); m[0] += (a[1] - b[1]) * (a[2] + b[2]); m[1] += (a[2] - b[2]) * (a[0] + b[0]); m[2] += (a[0] - b[0]) * (a[1] + b[1]); } return m; };
      const facesDele = facesDoRetalho.get(r2.nome);
      const media = facesDele.map(nf).reduce(soma, [0, 0, 0]);
      const dobradas = facesDele.filter((f) => dot(nf(f), media) <= 0);
      if (dobradas.length) {
        /* com a emenda declarada num lado do retalho, liso: false não vale: o remédio é a declaração */
        const doLado = emendasDeclaradas.filter((e) => e.lados.has(r2.nome));
        const g2 = doLado.filter((e) => e.tipo === 'G2');
        if (g2.length) falha(`o alisamento do miolo dobrou ${dobradas.length} face(s) do retalho ${citar(r2.nome)}, com a continuidade 'G2' declarada ${g2.length === 1 ? 'na curva' : 'nas curvas'} ${lista(g2.map((e) => e.nome))}: a G2 é experimental, e o peso dela na faixa da emenda muda a forma de toda superfície de dupla curvatura, aqui até dobrar faces; declare 'G1' ou tire a declaração`);
        if (doLado.length) falha(`o alisamento do miolo dobrou ${dobradas.length} face(s) do retalho ${citar(r2.nome)}, com a continuidade declarada ${doLado.length === 1 ? 'na curva' : 'nas curvas'} ${lista(doLado.map((e) => e.nome))}; as curvas dele pedem uma superfície que o preenchimento não segue: ponha uma curva a mais dentro do retalho, ou tire a declaração (liso: false não vale com ela)`);
        falha(`o alisamento do miolo dobrou ${dobradas.length} face(s) do retalho ${citar(r2.nome)}; as curvas dele pedem uma superfície que o preenchimento não segue; declare liso: false, ou ponha uma curva a mais dentro do retalho`);
      }
    }
  }

  /* ---- medidas ---- */
  const pesoDe = new Map();
  const cotar = (id, peso) => { const antes = pesoDe.get(id); pesoDe.set(id, antes === undefined ? peso : (antes === Infinity || peso === Infinity ? Infinity : (typeof antes === 'string' || typeof peso === 'string' ? antes : Math.max(antes, peso)))); };
  for (const [nome, c] of curvas) {
    const d = c.decl;
    const peso = d.exata === true ? Infinity : (d.peso != null ? d.peso : (leitura ? leitura.peso : Infinity));
    for (const a of arcosDaCurva.get(nome).arcos) if (a.usos.length) for (const id of verticesDoArco.get(a.id)) cotar(id, peso);
  }
  if (interior !== null) for (const r of retalhos) for (const id of interiorDoRetalho.get(r.nome)) cotar(id, interior);
  /* a faixa da emenda declarada ganha a cota da própria curva (exata, ou o peso dela): a superfície limite segue a gaiola alisada ali como
     segue a curva, sem afundar entre a curva e o miolo de peso menor */
  for (const e of emendasDeclaradas) {
    const d = curvas.get(e.nome).decl;
    const peso = d.exata === true ? Infinity : (d.peso != null ? d.peso : (leitura ? leitura.peso : Infinity));
    for (const id of e.faixa) cotar(id, peso);
  }
  const medidas = ordemDosVertices.filter((id) => pesoDe.has(id)).map((id) => (pesoDe.get(id) === Infinity ? id : { ponto: id, peso: pesoDe.get(id) }));

  /* ---- avisos da leitura ---- */
  if (leitura) {
    const minimo = 2 * leitura.erro / leitura.inclinacao;
    for (const [nome, c] of curvas) {
      const ks = c.chaves; const total = c.fechada ? ks.length : ks.length - 1;
      for (let k = 0; k < total; k++) {
        const a = ks[k]; const b = ks[(k + 1) % ks.length];
        const dist = norma(sub(a, b));
        if (dist < minimo * (1 - 1e-9)) {
          avisos.push({
            ref: 'pontosProximos', curva: nome, de: a.map((x) => Math.round(x * 10) / 10), ate: b.map((x) => Math.round(x * 10) / 10), espacamentoMm: Math.round(dist * 10) / 10, minimoRecomendadoMm: Math.round(minimo * 10) / 10,
            texto: `os pontos-chave [${a.map((x) => br(x)).join(', ')}] e [${b.map((x) => br(x)).join(', ')}] da curva ${citar(nome)} ficam a ${br(dist)} mm um do outro, abaixo de ${br(minimo)} mm (2 × erro ${br(leitura.erro)} ÷ inclinação ${br(leitura.inclinacao)}): leituras que diferem até ${br(2 * leitura.erro)} mm dão aí uma inclinação que é só erro; funda os dois pontos`,
          });
        }
      }
    }
    if (leitura.estrito && avisos.length) falha(`a leitura é estrita e ${avisos.length} par(es) de pontos-chave estão mais perto do que o erro sustenta: ${avisos.map((x) => x.texto).join('; ')}`);
  }

  /* ---- saída ---- */
  const pontos = {};
  const vertices = [];
  for (const id of ordemDosVertices) { pontos[id] = posicao.get(id).map((x) => x / MM); vertices.push(id); }
  const facesComNomes = faces;
  const passo = { vertices: [...vertices], faces: facesComNomes, vincos: vincos.map((v) => ({ nome: v.nome, pontos: v.pontos, nitidez: v.nitidez })) };
  if (cantos.size) passo.cantos = vertices.filter((v) => cantos.has(v));
  if (medidas.length) passo.medidas = medidas;
  if (marcarCurvas) passo.curvas = curvasMarcadas;
  if (simetria) {
    const negativos = vertices.filter((p) => pontos[p][0] < -1e-9);
    if (negativos.length) {
      /* com o alisamento, a recusa diz quanto cada curva dos pontos negativos andou: os pontos-chave ficam em x >= 0, e o que sai é a curva entre eles */
      const daOpcao = alisarCurvas ? [...new Set(negativos.map((p) => fracaoDoVertice.get(p)?.curva).filter((c) => c && relatorioDoAlisamento.get(c)?.maiorDeslocamentoMm > 0))] : [];
      const nota = daOpcao.length ? `; alisarCurvas mexeu nos pontos-chave ${daOpcao.length === 1 ? 'da curva' : 'das curvas'} ${daOpcao.map((c) => `${citar(c)} (até ${relatorioDoAlisamento.get(c).maiorDeslocamentoMm} mm)`).join(', ')}, e a curva entre eles passou do plano: declare pontosDuros onde ela encosta no plano ou baixe a tolerância dela em toleranciaPorCurva` : '';
      falha(`na simetria em x a rede é a metade x >= 0, e ${negativos.length === 1 ? 'o ponto' : 'os pontos'} ${lista(negativos.slice(0, 6))} ${negativos.length === 1 ? 'tem' : 'têm'} x < 0${nota}`);
    }
    passo.simetria = simetria;
  }

  const donoDoVertice = new Map();
  for (const r of retalhos) for (const id of interiorDoRetalho.get(r.nome)) donoDoVertice.set(id, r.nome);
  const extra = extraordinariosDa(vertices, faces).map((e) => ({ ...e, ...(donoDoVertice.has(e.ponto) ? { retalho: donoDoVertice.get(e.ponto) } : {}) }));

  /* ---- continuidade: o salto de tangente de cada curva compartilhada, na gaiola ---- */
  const normaisDaFace = faces.map((f) => { const n = normalDe(f); const l = norma(n); return l > 0 ? vezes(n, 1 / l) : n; });
  const facesDoVertice = new Map();
  faces.forEach((f, i) => { for (const v of f) { if (!facesDoVertice.has(v)) facesDoVertice.set(v, []); facesDoVertice.get(v).push(i); } });
  const continuidade = {};
  for (const [nome, c] of curvas) {
    const { arcos: lista2 } = arcosDaCurva.get(nome);
    let maximo = 0; let onde = null; let vistos = 0;
    for (const a of lista2) {
      if (a.usos.length !== 2) continue;
      const ids = verticesDoArco.get(a.id);
      for (let k = 1; k < ids.length - 1; k++) {
        const v = ids[k];
        const dosDois = [0, 1].map((lado) => {
          const nome2 = a.usos[lado];
          let s = [0, 0, 0];
          for (const i of facesDoVertice.get(v)) if (retalhoDaFace[i] === nome2) s = soma(s, normaisDaFace[i]);
          const l = norma(s); return l > 0 ? vezes(s, 1 / l) : null;
        });
        if (!dosDois[0] || !dosDois[1]) continue;
        const angulo = Math.acos(Math.max(-1, Math.min(1, dot(dosDois[0], dosDois[1])))) * 180 / Math.PI;
        vistos += 1;
        if (angulo > maximo) { maximo = angulo; onde = v; }
      }
    }
    if (vistos) continuidade[nome] = { saltoMaximoGraus: Math.round(maximo * 100) / 100, ponto: onde, vinco: c.decl.vinco ?? null, pontos: vistos };
  }

  /* ---- a emenda declarada, medida na gaiola: o ângulo entre as tangentes dos dois lados e a razão das curvaturas, pela parábola de cada lado
     (a mesma de `termosDaTangente`), em cada ponto da curva com as duas fileiras ---- */
  const emendasSaida = {};
  /* O que a declaração move. A referência de cada curva emendada é a mesma rede sem a declaração dela (as outras ficam), montada com as
     divisões desta (a mesma malha), fora da captura e das alterações de teste, e sem referências próprias; a diferença por ponto, na
     gaiola inteira, é o deslocamento que a declaração daquela curva causa. Com mais de REFERENCIAS_POR_CURVA curvas emendadas, a
     referência é uma só, sem declaração nenhuma, e o deslocamento é do conjunto: o aviso cita as curvas declaradas em volta do ponto que
     mais anda. A referência que não monta deixa o deslocamento sem medida (null), com aviso. */
  const referencias = new Map(); let referenciaDoConjunto;
  const porCurva = emendasDeclaradas.length <= REFERENCIAS_POR_CURVA;
  if (emendasDeclaradas.length && !montandoReferencia) {
    const fixacaoDaReferencia = { divisoes: Object.fromEntries(usados.map((a) => [chaveDoArco(a), a.n])), fracoes: Object.fromEntries([...fracaoDoVertice].map(([id, v]) => [id, v.noArco])) };
    const montar = (sem) => {
      const resto = Object.fromEntries(Object.entries(definicao).filter(([k]) => k !== 'limitesDaEmenda' || emendasDeclaradas.some((e) => !sem.has(e.nome))));
      const referencia = { ...resto, curvas: definicao.curvas.map((c) => (sem.has(c.nome) ? Object.fromEntries(Object.entries(c).filter(([k]) => k !== 'continuidade')) : c)) };
      if (referencia.limitesDaEmenda?.toleranciaPorCurva) {
        const fica = Object.fromEntries(Object.entries(referencia.limitesDaEmenda.toleranciaPorCurva).filter(([n]) => !sem.has(n)));
        referencia.limitesDaEmenda = { ...referencia.limitesDaEmenda, toleranciaPorCurva: fica };
      }
      const antes = montandoReferencia;
      montandoReferencia = true;
      try {
        return comAlteracoesNaRede(null, () => capturarGaiolas(() => comDivisoesFixas(new Map([[assinaturaDaRede(semCoordenadasDa(referencia)), fixacaoDaReferencia]]), () => gaiolaPorRede(referencia))).resultado);
      } catch { return null; } finally { montandoReferencia = antes; }
    };
    if (porCurva) for (const e of emendasDeclaradas) referencias.set(e.nome, montar(new Set([e.nome])));
    else referenciaDoConjunto = montar(new Set(emendasDeclaradas.map((e) => e.nome)));
  }
  const diferenca = (ref, ids) => {
    let maior = 0; let onde = null;
    for (const id of ids) { const q = ref.pontos[id]; if (!q) continue; const d = norma(sub(pontos[id], q)) * MM; if (d > maior) { maior = d; onde = id; } }
    return { maior, onde };
  };
  const retalhosDoPonto = (id) => new Set((facesDoVertice.get(id) ?? []).map((i) => retalhoDaFace[i]));
  const semReferencia = (quais, texto) => avisos.push({ ref: 'emendaSemReferencia', curvas: quais, texto });
  if (referenciaDoConjunto === null) semReferencia(emendasDeclaradas.map((e) => e.nome), `a rede sem a continuidade declarada não monta, e o deslocamento que a declaração causa fica sem medida (null): confira a forma na bancada`);
  for (const e of emendasDeclaradas) {
    let anguloMaximo = null; let razaoMaxima = null; let saltoMaximo = -1; let ondeAngulo = null; let ondeRazao = null; let semMedida = 0; let dasCurvas = 0; let medidos = 0;
    for (const { c, lados } of e.fileiras) {
      /* o ponto em que nenhuma fileira de um lado é miolo que o alisamento move (o cruzamento com outra curva, a faixa sem miolo) tem a
         tangente que as curvas dão: fica fora do máximo e se conta em `dasCurvas` */
      if (!lados.every((l) => mioloQueSeMove.has(l.a1) || mioloQueSeMove.has(l.a2))) { dasCurvas += 1; continue; }
      let nc = [0, 0, 0];
      for (const i of facesDoVertice.get(c)) nc = soma(nc, normaisDaFace[i]);
      nc = vezes(nc, 1 / (norma(nc) || 1));
      const pc = posicao.get(c);
      /* a mesma parábola de `termosDaTangente`, ao longo da direção de c para a1 no plano tangente, e com o mesmo critério de validade:
         onde a seção sobe mais que meia distância sobre o plano de c, ou a gaiola entorta a fileira, o ponto fica sem medida */
      const doLado = lados.map(({ a1, a2, a3 }) => {
        const u = sub(posicao.get(a1), pc); const t = sub(u, vezes(nc, dot(u, nc))); const lt = norma(t);
        if (!(lt > 0)) return null;
        const corte = (v) => { const d = sub(posicao.get(v), pc); return { f: dot(d, nc), d: dot(d, t) / lt }; };
        const [g1, g2] = [a1, a2].map(corte);
        if (!(g1.d > 0 && g2.d > LONGE_DA_FILEIRA * g1.d && Math.abs(g2.f) < INCLINACAO_DA_FILEIRA * g2.d)) return null;
        const den = g1.d * g2.d * (g2.d - g1.d);
        /* a curvatura no ponto da curva, pela cúbica do ponto e das três fileiras (f = s d + k0 d²/2 + j d³/6): a parábola dá a média da
           curvatura nas duas fileiras, que na inflexão lisa (a curvatura passa por zero na curva) tem sinais opostos dos dois lados sem
           salto nenhum; a cúbica a dá na curva, perto de zero dos dois lados. Sem a terceira fileira, k0 fica null */
        let k0 = null;
        const g3 = a3 ? corte(a3) : null;
        if (g3 && g3.d > g2.d + (LONGE_DA_FILEIRA - 1) * g1.d && Math.abs(g3.f) < INCLINACAO_DA_FILEIRA * g3.d) {
          const linhas = [g1, g2, g3].map((g) => [g.d, (g.d * g.d) / 2, (g.d ** 3) / 6, g.f]);
          const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
          const A = linhas.map((l) => l.slice(0, 3)); const dA = det(A);
          if (Math.abs(dA) > 0) k0 = det(linhas.map((l) => [l[0], l[3], l[2]])) / dA;
        }
        return { s: (g1.f * g2.d * g2.d - g2.f * g1.d * g1.d) / den, k: (2 * (g2.f * g1.d - g1.f * g2.d)) / den, k0 };
      });
      if (doLado.some((x) => x === null)) { semMedida += 1; continue; }
      medidos += 1;
      const angulo = Math.abs(Math.atan(doLado[0].s) + Math.atan(doLado[1].s)) * 180 / Math.PI;
      /* a razão com sinal: a maior curvatura sobre a menor, as duas com o piso (abaixo dele as duas, a razão é 1), negativa quando a
         curvatura salta de sinal na emenda: as das duas fileiras (a parábola) com sinais opostos acima do piso e, quando a terceira fileira
         existe dos dois lados, também as da curva (a cúbica), o que separa o salto da inflexão lisa. A maior é a do maior salto relativo,
         a diferença das curvaturas com sinal sobre a menor */
      const [ka, kb] = doLado.map((x) => x.k * MM);
      const menor = Math.max(Math.min(Math.abs(ka), Math.abs(kb)), PISO_DA_RAZAO);
      const naCurva = doLado.every((x) => x.k0 !== null) ? doLado.map((x) => x.k0 * MM) : null;
      const oposta = Math.min(Math.abs(ka), Math.abs(kb)) >= PISO_DA_RAZAO && ka * kb < 0
        && (!naCurva || (Math.min(Math.abs(naCurva[0]), Math.abs(naCurva[1])) >= PISO_DA_RAZAO && naCurva[0] * naCurva[1] < 0));
      const razao = (oposta ? -1 : 1) * (Math.max(Math.abs(ka), Math.abs(kb), PISO_DA_RAZAO) / menor);
      const salto = oposta ? Math.abs(razao) + 1 : razao - 1;
      if (anguloMaximo === null || angulo > anguloMaximo) { anguloMaximo = angulo; ondeAngulo = c; }
      if (salto > saltoMaximo) { saltoMaximo = salto; razaoMaxima = razao; ondeRazao = c; }
    }
    if (e.tipo === 'G2' && e.extraordinarios.length) {
      avisos.push({
        ref: 'emendaG2NoExtraordinario', curva: e.nome, pontos: [...e.extraordinarios],
        texto: `a curva ${citar(e.nome)} declara continuidade 'G2' e passa por ${e.extraordinarios.length === 1 ? 'um vértice extraordinário' : `${e.extraordinarios.length} vértices extraordinários`} (${lista(e.extraordinarios.slice(0, 6))}): ali a subdivisão é no máximo G1, e a curvatura não fica igual dos dois lados; tire o vértice extraordinário da curva (o nó onde três ou cinco retalhos se encontram, o centro de um retalho de n lados), se a emenda pede G2 ali`,
      });
    }
    /* o deslocamento da forma pela declaração: o da curva na gaiola inteira, ou o do conjunto nos retalhos dos dois lados */
    let deslocamento = null; let ondeDeslocamento = null;
    if (porCurva && referencias.has(e.nome)) {
      const ref = referencias.get(e.nome);
      if (ref) ({ maior: deslocamento, onde: ondeDeslocamento } = diferenca(ref, ordemDosVertices));
      else semReferencia([e.nome], `a rede sem a continuidade declarada na curva ${citar(e.nome)} não monta, e o deslocamento que a declaração dela causa fica sem medida (null): confira a forma na bancada`);
    } else if (referenciaDoConjunto) {
      const ids = [...new Set([...e.lados].sort().flatMap((r) => facesDoRetalho.get(r).flat()))];
      ({ maior: deslocamento, onde: ondeDeslocamento } = diferenca(referenciaDoConjunto, ids));
    }
    const tolerancia = limitesDaEmenda.tolerancias.get(e.nome) ?? limitesDaEmenda.tolerancia;
    const g2 = e.tipo === 'G2';
    if (g2) {
      avisos.push({
        ref: 'emendaG2Experimental', curva: e.nome,
        texto: `a curva ${citar(e.nome)} declara continuidade 'G2', que é experimental: o peso da variação na faixa da emenda muda a forma de toda superfície de dupla curvatura, mesmo com a curvatura igual dos dois lados (22 mm na chapa de prova emenda-dupla, de raio 0,6 m nas duas direções), empurra o salto de curvatura para a borda da faixa e, numa curva fechada, dobra faces; use a G1, que põe a tangente comum e deixa a curvatura de cada lado, e confira a forma na bancada se ficar com a G2`,
      });
    }
    if (porCurva && deslocamento !== null && deslocamento > tolerancia) {
      avisos.push({
        ref: 'emendaMoveu', curva: e.nome, continuidade: e.tipo, deslocamentoMaximoMm: Math.round(deslocamento * 1000) / 1000, ponto: ondeDeslocamento, toleranciaMm: tolerancia,
        texto: `a continuidade ${citar(e.tipo)} declarada na curva ${citar(e.nome)} move a gaiola até ${br(deslocamento)} mm do que ela é sem a declaração dela (no ponto ${citar(ondeDeslocamento)}), acima da tolerância de ${br(tolerancia)} mm de limitesDaEmenda; ${g2 ? 'a G2 é experimental, e a G1 move bem menos; ' : ''}confira a forma na bancada e, se é a que se quer, declare a tolerância dela em limitesDaEmenda.toleranciaPorCurva, e se não é, tire a declaração ou acerte as curvas dos dois lados`,
      });
    }
    if (medidos === 0) {
      avisos.push({
        ref: 'emendaSemMedida', curva: e.nome, continuidade: e.tipo, pontos: e.fileiras.length, semMedida, dasCurvas,
        texto: `a continuidade ${citar(e.tipo)} da curva ${citar(e.nome)} não se mediu na gaiola: nenhum ponto dela tem as duas fileiras de miolo que o alisamento move (${e.fileiras.length} com as fileiras, ${dasCurvas} que só as curvas definem, ${semMedida} que a parábola não descreve); o ângulo e a razão saem null, e a emenda se confere na superfície, com npm run emendas`,
      });
    } else {
      const acima = [];
      if (anguloMaximo > limitesDaEmenda.angulo) acima.push(`o ângulo entre as tangentes chega a ${br(anguloMaximo)} graus (no ponto ${citar(ondeAngulo)}), acima de ${br(limitesDaEmenda.angulo)}`);
      if (g2 && (razaoMaxima < 0 || razaoMaxima > limitesDaEmenda.razao)) acima.push(razaoMaxima < 0 ? `a curvatura troca de sinal na emenda (a razão com sinal é ${br(razaoMaxima)}, no ponto ${citar(ondeRazao)}), o que a G2 não iguala` : `a razão das curvaturas chega a ${br(razaoMaxima)} (no ponto ${citar(ondeRazao)}), acima de ${br(limitesDaEmenda.razao)}`);
      if (acima.length) {
        avisos.push({
          ref: 'emendaAcimaDoLimite', curva: e.nome, continuidade: e.tipo, anguloMaximoGraus: Math.round(anguloMaximo * 1000) / 1000, razaoMaxima: Math.round(razaoMaxima * 1000) / 1000, limiteAnguloGraus: limitesDaEmenda.angulo, ...(g2 ? { limiteRazao: limitesDaEmenda.razao } : {}),
          texto: `a continuidade ${citar(e.tipo)} declarada na curva ${citar(e.nome)} não se cumpre na gaiola: ${acima.join(', e ')} (limitesDaEmenda); confira os pontos-chave das curvas que atravessam a emenda perto desse ponto, ou a faixa estreita entre duas curvas, onde o termo da tangente não alcança`,
        });
      }
    }
    emendasSaida[e.nome] = {
      continuidade: e.tipo, ...(g2 ? { experimental: true } : {}), lados: [...e.lados].sort(), juncoes: juncoes.porEmenda.get(e.nome) ?? [], pontos: e.fileiras.length, semMedida, dasCurvas, faixa: e.faixa.size,
      extraordinarios: [...e.extraordinarios].sort(),
      medidos, anguloMaximoGraus: anguloMaximo === null ? null : Math.round(anguloMaximo * 1000) / 1000, pontoDoAngulo: ondeAngulo,
      razaoMaxima: razaoMaxima === null ? null : Math.round(razaoMaxima * 1000) / 1000, pontoDaRazao: ondeRazao,
      deslocamentoMaximoMm: deslocamento === null ? null : Math.round(deslocamento * 1000) / 1000, pontoDoDeslocamento: ondeDeslocamento, deslocamentoDe: porCurva ? 'curva' : 'conjunto', toleranciaMm: tolerancia,
      limiteAnguloGraus: limitesDaEmenda.angulo, ...(g2 ? { limiteRazao: limitesDaEmenda.razao } : {}),
    };
  }
  /* o deslocamento do conjunto: um aviso só, com as curvas declaradas que têm um lado no retalho do ponto que mais anda */
  if (referenciaDoConjunto) {
    const { maior, onde } = diferenca(referenciaDoConjunto, ordemDosVertices);
    const dele = retalhosDoPonto(onde);
    const perto = emendasDeclaradas.filter((e) => [...e.lados].some((r) => dele.has(r))).map((e) => e.nome);
    const citadas = perto.length ? perto : emendasDeclaradas.map((e) => e.nome);
    const tolerancia = Math.max(...citadas.map((n) => limitesDaEmenda.tolerancias.get(n) ?? limitesDaEmenda.tolerancia));
    if (maior > tolerancia) {
      avisos.push({
        ref: 'emendaMoveu', curva: citadas[0], curvas: citadas, conjunto: true, deslocamentoMaximoMm: Math.round(maior * 1000) / 1000, ponto: onde, toleranciaMm: tolerancia,
        texto: `a continuidade declarada em ${emendasDeclaradas.length} curvas move a gaiola até ${br(maior)} mm do que ela é sem declaração nenhuma (no ponto ${citar(onde)}), acima da tolerância de ${br(tolerancia)} mm de limitesDaEmenda; o deslocamento é do conjunto (com mais de ${REFERENCIAS_POR_CURVA} curvas declaradas a gaiola não monta uma referência por curva), e as curvas declaradas em volta do ponto são ${lista(citadas)}; declare menos curvas para ver o de cada uma, confira a forma na bancada e, se é a que se quer, declare a tolerância em limitesDaEmenda.toleranciaPorCurva`,
      });
    }
  }
  /* a quebra entre duas curvas emendadas que se continuam pelo nó sem outra emendada que as cruze: não se juntam, e a tangente de cada
     uma no nó é a da própria ponta */
  for (const { no, curvas: [a, b], pontas: [ia, ib] } of juncoes.continuacoes) {
    const saida = (nome, inicio) => { const c = curvas.get(nome); const p = c.em(inicio ? 0 : 1); const q = c.em(inicio ? 1e-4 : 1 - 1e-4); const u = sub(q, p); return vezes(u, 1 / (norma(u) || 1)); };
    const ua = saida(a, ia); const ub = saida(b, ib);
    const quebra = (Math.acos(Math.max(-1, Math.min(1, -dot(ua, ub)))) * 180) / Math.PI;
    if (quebra > limitesDaEmenda.angulo) {
      avisos.push({
        ref: 'emendaQuebrada', no, curvas: [a, b], quebraGraus: Math.round(quebra * 1000) / 1000, limiteAnguloGraus: limitesDaEmenda.angulo,
        texto: `as curvas emendadas ${citar(a)} e ${citar(b)} se continuam no nó ${citar(no)} com ${br(quebra)} graus entre as tangentes: a junção só se põe entre curvas que atravessam outra emendada, e ali nenhuma as cruza; escreva as duas como uma curva só, ou declare a continuidade na curva que passa pelo nó`,
      });
    }
  }

  /* a curva que vira muito dentro de uma só divisão não é seguida pela gaiola: o limite passa pelos pontos e se afasta dela entre eles */
  const limiteDeGiro = 1.5 * anguloMax;
  for (const a of usados) {
    const c = curvas.get(a.curva);
    for (let k = 0; k < a.n; k++) {
      const f0 = a.f0 + (a.f1 - a.f0) * k / a.n; const f1 = a.f0 + (a.f1 - a.f0) * (k + 1) / a.n;
      const giro = giroDoArco(c, f0, f1);
      if (giro > limiteDeGiro) {
        const meio = c.em((f0 + f1) / 2).map((x) => Math.round(x * 10) / 10);
        avisos.push({
          ref: 'curvaturaConcentrada', curva: a.curva, de: a.de, ate: a.ate, giroGraus: Math.round(giro * 10) / 10, perto: meio,
          texto: `${nomeDoArco(a)} vira ${br(giro)} graus dentro de uma só divisão, perto de [${meio.map((x) => br(x)).join(', ')}] mm (o limite é ${br(limiteDeGiro)}): a superfície passa pelos pontos da curva mas se afasta dela entre eles; ponha um nó onde a curvatura muda (a emenda de um arco com uma reta, por exemplo) para o arco ganhar divisões só no trecho que vira`,
        });
        break;
      }
    }
  }
  /* o espaçamento que salta de um arco para o vizinho na mesma curva: a subdivisão ondula ali e a linha do friso se desfaz */
  const arcoPorId = new Map(arcos.map((a) => [a.id, a]));
  for (const { a, b } of vizinhasDaCurva) {
    const A1 = arcoPorId.get(a);
    const va = verticesDoArco.get(a); const vb = verticesDoArco.get(b);
    const ea = norma(sub(posicao.get(va[va.length - 1]), posicao.get(va[va.length - 2]))); const eb = norma(sub(posicao.get(vb[1]), posicao.get(vb[0])));
    const razao = Math.max(ea / eb, eb / ea);
    if (razao > RAZAO_DO_AVISO) {
      avisos.push({
        ref: 'gradacaoBrusca', curva: A1.curva, no: A1.ate, espacamentosMm: [Math.round(ea * 100) / 100, Math.round(eb * 100) / 100], razao: Math.round(razao * 10) / 10,
        texto: `na curva ${citar(A1.curva)}, no nó ${citar(A1.ate)}, o espaçamento salta de ${br(ea)} para ${br(eb)} mm (${br(razao)} vezes); a subdivisão ondula onde o intervalo passa do dobro do vizinho e a linha do friso fica com trechos curtos: o arco tem divisões de menos para o trecho de espaçamento fino que o vizinho pede, e os lados opostos dos retalhos o forçaram; ponha nós na curva ou declare divisoes nos retalhos em volta`,
      });
    }
  }
  const densidades = {};
  for (const a of usados) {
    densidades[chaveDoArco(a)] = { curva: a.curva, de: a.de, ate: a.ate, divisoes: a.n, alvo: Math.round(a.alvo * 100) / 100, comprimentoMm: Math.round(a.comprimento * 100) / 100, espacamentoMm: Math.round(a.comprimento / a.n * 100) / 100 };
    if ((a.n > 3 * a.alvo && a.n > a.alvo + 4) || a.n < a.alvo / 2 - 1e-9) {
      avisos.push({
        ref: 'densidadeForaDoAlvo', curva: a.curva, de: a.de, ate: a.ate, divisoes: a.n, alvo: Math.round(a.alvo * 10) / 10,
        texto: `${nomeDoArco(a)} ficou com ${a.n} divisões (${br(a.comprimento / a.n)} mm cada) e o alvo era ${br(a.alvo)}: os lados opostos dos retalhos em volta o forçaram; declare divisoes nesses retalhos, ou acerte os nós, se a diferença atrapalhar`,
      });
    }
  }
  const nosSaida = {};
  for (const [id] of nos) if (posicao.has(nomeDoNo(id)) && !id.includes('@') && !id.includes('^')) nosSaida[id] = nomeDoNo(id);
  const curvasSaida = {};
  for (const [nome, c] of curvas) {
    const { ordem, arcos: lista2 } = arcosDaCurva.get(nome);
    curvasSaida[nome] = { comprimentoMm: Math.round(c.comprimento * 100) / 100, fechada: c.fechada, nos: ordem.map((x) => x.no), nosPontos: ordem.map((x) => nomeDoNo(x.no)), arcos: lista2.map((a) => ({ de: a.de, ate: a.ate, divisoes: a.usos.length ? a.n : null, retalhos: [...a.usos], pontos: a.usos.length ? [...verticesDoArco.get(a.id)] : null })) };
  }
  /* a fração do comprimento da curva em cada ponto do lado, na ordem do lado (na curva fechada pode passar de 1, em volta) */
  const fracoesDoLado = (lado) => {
    const fr = [];
    for (const { arco, dir } of lado.arcos) {
      const v = verticesDoArco.get(arco.id);
      const f = v.map((id, i) => (i === 0 ? arco.f0 : i === v.length - 1 ? arco.f1 : arco.f0 + fracaoDoVertice.get(id).noArco * (arco.f1 - arco.f0)));
      const seq = dir === 1 ? f : [...f].reverse();
      fr.push(...(fr.length ? seq.slice(1) : seq));
    }
    return fr.map((x) => Math.round(x * 1e6) / 1e6);
  };
  const retalhosSaida = {};
  let faceInicial = 0;
  for (const r of retalhos) {
    const lados = r.cadeia.map(ladoEmVertices);
    retalhosSaida[r.nome] = {
      bordas: r.cadeia.map((l, j) => ({ curva: l.curva, de: l.de, ate: l.ate, pontos: lados[j], fracoes: fracoesDoLado(l) })), faceInicial,
      cantos: r.cantos, angulosGraus: angulosDosCantos.get(r.nome).map((g) => Math.round(g * 10) / 10), lados: r.cadeia.length, divisoes: r.cadeia.length === 4 ? [lados[0].length - 1, lados[1].length - 1] : lados[0].length - 1,
      faces: facesDoRetalho.get(r.nome).length, ...(centros.has(r.nome) ? { centro: centros.get(r.nome) } : {}), virado: estado.get(r.nome) === 1,
    };
    faceInicial += facesDoRetalho.get(r.nome).length;
  }
  const pontoDaCurva = (curvaNome, fracao) => {
    if (!curvas.has(curvaNome)) falha(`pontoDaCurva(): a curva ${citar(curvaNome)} não existe`);
    if (typeof fracao !== 'number' || !(fracao >= 0 && fracao <= 1)) falha('pontoDaCurva(): a fração precisa ficar entre 0 e 1 do comprimento da curva');
    return curvas.get(curvaNome).em(fracao).map((x) => x / MM);
  };

  /* ---- origens, entradas e estrutura ---- */
  const EIXOS = ['x', 'y', 'z'];
  const entradas = [];
  for (const [nome, c] of curvas) {
    c.decl.pontos.forEach((p, k) => {
      if (typeof p !== 'string') p.forEach((v, q) => entradas.push({ id: `${nome}[${k}].${EIXOS[q]}`, tipo: 'chave', curva: nome, pontoChave: k, eixo: EIXOS[q], valor: v / MM }));
    });
  }
  for (const [nome, d] of nosDeclarados) if (d.tipo === 'ponto') d.p.forEach((v, q) => entradas.push({ id: `no:${nome}.${EIXOS[q]}`, tipo: 'no', no: nome, eixo: EIXOS[q], valor: v / MM }));
  /* a entrada (sem o eixo) do k-ésimo ponto-chave de uma curva: o nó dado por coordenada, ou a coordenada escrita na curva */
  const entradaDoPontoChave = (curvaNome, k) => {
    const p = declaradas.get(curvaNome).pontos[k];
    if (typeof p === 'string') return nosDeclarados.get(p)?.tipo === 'ponto' ? `no:${p}` : null;
    return `${curvaNome}[${k}]`;
  };
  const chavesDaCurva = new Map();
  for (const [nome, c] of curvas) chavesDaCurva.set(nome, [...new Set(c.decl.pontos.map((_, k) => entradaDoPontoChave(nome, k)).filter((x) => x !== null))]);
  const chavesDoRetalho = (r) => [...new Set(r.cadeia.flatMap((l) => chavesDaCurva.get(l.curva)))];
  const origens = {};
  for (const [id, no] of nos) {
    const nome = nomeDoNo(id);
    if (!posicao.has(nome)) continue;
    const d = nosDeclarados.get(id);
    if (d?.tipo === 'ponto') {
      const usos = [];
      for (const [cn, c] of curvas) c.decl.pontos.forEach((p, k) => { if (p === id) usos.push({ curva: cn, pontoChave: k }); });
      origens[nome] = { tipo: 'chave', no: id, entrada: `no:${id}`, curvas: usos };
    } else if (literaisDoNo.has(id)) {
      const lit = literaisDoNo.get(id);
      origens[nome] = { tipo: 'chave', no: id, entrada: `${lit[0].curva}[${lit[0].pontoChave}]`, curvas: lit };
    } else {
      const [cn, f] = d?.tipo === 'curva' ? [d.curva, d.fracao] : [[...no.curvas.keys()][0], [...no.curvas.values()][0]];
      origens[nome] = { tipo: 'noNaCurva', no: id, curva: cn, fracao: Math.round(f * 1e6) / 1e6, pontosChave: chavesDaCurva.get(cn) };
    }
  }
  for (const [id, { curva: cn, fracao }] of fracaoDoVertice) {
    const c = curvas.get(cn);
    const trechos = c.fechada ? c.chaves.length : c.chaves.length - 1;
    let k = 0;
    while (k + 1 < trechos && c.fracaoDaChave(k + 1) <= fracao) k++;
    const entre = [entradaDoPontoChave(cn, k), entradaDoPontoChave(cn, (k + 1) % c.chaves.length)];
    origens[id] = { tipo: 'curva', curva: cn, fracao: Math.round(fracao * 1e6) / 1e6, entre, pontosChave: chavesDaCurva.get(cn) };
  }
  for (const r of retalhos) {
    const chaves = chavesDoRetalho(r); const curvasDele = [...new Set(r.cadeia.map((l) => l.curva))];
    for (const id of interiorDoRetalho.get(r.nome)) origens[id] = { tipo: 'retalho', retalho: r.nome, curvas: curvasDele, pontosChave: chaves };
  }
  const ordenadas = {};
  for (const id of ordemDosVertices) ordenadas[id] = origens[id];
  const fixacao = { divisoes: Object.fromEntries(usados.map((a) => [chaveDoArco(a), a.n])), fracoes: Object.fromEntries([...fracaoDoVertice].map(([id, v]) => [id, v.noArco])) };
  const estrutura = {
    definicao: semCoordenadas,
    divisoes: Object.fromEntries(usados.map((a) => [chaveDoArco(a), a.n])),
    nos: Object.fromEntries([...nos].map(([id, no]) => [id, [...no.curvas.keys()]])),
  };
  const saida = {
    pontos, passo, linha, pontoDaCurva, linhas: linhasDasCurvas, nos: nosSaida, curvas: curvasSaida, retalhos: retalhosSaida, densidades,
    extraordinarios: extra, cantos: cantosAchados, continuidade, alisamento, avisos, origens: ordenadas, entradas, estrutura, fixacao,
  };
  if (emendasDeclaradas.length) saida.emendas = emendasSaida;
  if (alisarCurvas) {
    const curvasDoRelatorio = Object.fromEntries([...relatorioDoAlisamento].sort((a, b) => (a[0] < b[0] ? -1 : 1)));
    saida.alisamentoDasCurvas = {
      ...alisarCurvas.opcoes,
      curvas: curvasDoRelatorio,
      maiorDeslocamentoMm: Math.max(0, ...Object.values(curvasDoRelatorio).map((c) => c.maiorDeslocamentoMm)),
    };
  }
  registrarGaiola(saida);
  return saida;
}
