# Empilhadeira — atritos

Plano: [`2026-11-09-empilhadeira.md`](../../planos/encerrados/2026-11-09-empilhadeira.md). Cada atrito diz como se reproduz, se o
processo o teria pego sozinho e o destino.

1. **O teste do esboço contava as opções de peça por número exato.** Cada esboço novo numa pasta de peça quebrava
   `modulos/esboco-nucleo/tests/leitor.test.js` (13, 15, 17, 18, 19 e 20 em dois dias), e quem conduz tinha de editar o
   número. O processo pegava, mas pelo motivo errado. Destino: o teste passou a exigir um piso e a conferir cada esboço,
   corrigido no mesmo commit da fatia 0.
2. **A captura do esboço falha de forma intermitente.** `npm run esboco:nucleo -- <esboço> --vista direita` (ou
   `esquerda`) falhou em todas as tentativas com `page.screenshot: Protocol error (Page.captureScreenshot): Unable to
   capture screenshot`, e com `--vistas` de quatro painéis falhou em cerca de metade. Reproduz com a maquete
   `procedural/pecas/empilhadeira/referencias/maquete.esboco.json` neste ambiente (Chromium headless 1243 no lugar do
   1194 que o Playwright do projeto pede). O processo não pega: é ambiente, mas a ferramenta não tenta de novo. A causa
   apareceu na carcaça, quando nenhuma captura passava: o 1243 ignora `--use-gl=swiftshader` e só cria o contexto WebGL
   pelo ANGLE com o SwiftShader liberado (0 de 4 lançamentos contra 4 de 4, medido nos dois Chromium do contêiner).
   Destino: `tools/modelar/navegador.mjs`, com os dois conjuntos de argumentos e o lançamento que cai no Chromium de
   /opt/pw-browsers quando falta o da versão fixada, usado pela bancada, pela captura da montagem, pelo esboço e pelo
   contorno; o apelido em PLAYWRIGHT_BROWSERS_PATH deixou de ser preciso.
3. **O esboço 2.0 não conhecia o `inflate`.** O passo `["inflate", {...}]` no esboço da carcaça voltava recusado pela
   tabela de milímetro (`a operação "inflate" não está na tabela de medidas`), e `divisoes`, `estacoes` e
   `expoenteSecao` eram tratados como medida. O processo pegou, pela recusa com o nome do campo, que é o desenho da
   tabela. Destino: `inflate` entrou em `TABELA_DE_MEDIDAS` (`contornoLado`, `contornoTopo`) e os três campos em
   `SEMPRE_LIVRES`, em `modulos/esboco-nucleo/src/milimetro.js`.
4. **O `inflate` não serve à carcaça.** Com a silhueta lateral da carcaça inteira, a grade passou do bloco de 1000 ids
   que o esboço reserva por passo, e o modo `secoes` recusa estação com mais de um intervalo, que é o caso de toda
   estação que corta um arco de roda ou o vão do posto. O processo pegou, pelas recusas. Destino: a carcaça foi feita por
   extrusão da silhueta lateral de cada parte cruzada com a planta (`extrusao` + `intersectar`), que não tem esses
   limites; o `inflate` fica para corpo de uma peça só sem cavidade, sem item de backlog, porque nenhuma peça em curso
   precisa dele.
5. **As vistas de IA são mais largas que a máquina da ficha.** Escalada pela lateral (entre-eixos de 1.700), a vista de
   cima dá a carcaça com uns 1.320 mm e os pneus com 1.485 mm por fora, contra 1.150 da ficha de 2,5 t; a de frente e a
   de trás dão o mesmo. Nenhuma classe real tem essa razão entre largura e entre-eixos (0,87). O processo pegou porque
   quem conduz mediu as vistas antes de modelar, mas nada o obrigava. Destino: a pergunta da escala na skill
   `alinhar-modelagem` passou a pedir a razão entre medidas em cada vista antes de modelar; a largura sai da ficha,
   com a proporção interna da vista de cima (carcaça a 0,89 da largura nos pneus), e a decisão vai à pessoa com a
   imagem.
6. **A tampa do capô foi medida no olho na vista de trás e saiu errada.** O perfil de trás de cada parte foi lido à mão
   na imagem, e o topo das colunas do encosto, que aparece atrás do capô, foi tomado como aba da tampa: a tampa virou
   uma laje mais larga que o capô, quando na referência é um painel central com 68% da largura, entre dois ombros
   laranja, com a aba de trás descendo sobre a grade. A grade saiu como rebaixo laranja e é moldura cinza em U; o
   contrapeso saiu trapézio e tem os lados côncavos. O processo não pegou: só a lateral tinha mapa de partes, e o
   rascunho foi à pessoa sem comparação com a referência; foi a pessoa que apontou. Destino: a traseira foi refeita
   com os trechos de cada cor medidos linha a linha na vista de trás, e conferida pela divisão por cor do rascunho
   contra a da referência (80% dos pixels na mesma classe; o resto é o eixo, que não é da carcaça); a skill
   `esbocar-opcoes` passou a pedir essa conferência antes de mostrar, e a ferramenta que a faz entrou no backlog.
7. **A divisa entre o capô e o contrapeso saiu em arco na vista de trás.** O canto arredondado da ponta de trás do capô
   está no contorno lateral, e o contorno cruzado com a planta curva só o mantém no centro: para os lados a planta
   corta antes, e a borda de baixo do capô, vista de trás, sobe no meio. Na referência a divisa é uma reta, porque o
   canto acompanha a curva da traseira. A comparação por cor não acusou (o laranja coincidia em 90%); a pessoa apontou.
   Destino: `lacosPelasVistas` (`procedural/nucleo/lacos-pelas-vistas.js`, com teste e ficha em `npm run capacidade`)
   dá os laços horizontais de `gaiolaPorLacos` a partir da silhueta de lado, da largura por altura e da planta, com a
   ponta da planta levada à silhueta em toda altura; o rascunho da traseira (`carcaca-traseira.esboco.mjs`) passou a
   sair dele, com a divisa reta, o bico acompanhando a curva e a superfície lisa da subdivisão.
8. **O capô subdividido saiu ondulado.** Com `compensar: true` em `gaiolaPorLacos`, a superfície passava de 10 a 30 mm
   do pedido e fazia uma onda depois de cada degrau da silhueta (o bico do capô), e a caixa ficava 2% mais larga. A
   comparação por cor só mostrou a queda (de 81% para 70%), sem dizer onde; a pessoa viu as ondas na imagem. Destino: a
   malha subdividida foi medida por faixa de altura (meia largura e traseira no centro, contra o pedido), o rascunho
   saiu de `compensar` com um laço a cada 20 a 40 mm (largura no pedido, ponta 5 mm para dentro, cor a 75%), e o
   limite está escrito no cabeçalho de `lacos-pelas-vistas.js`. A medida por faixa de altura foi feita em script
   solto; entra no backlog junto da comparação por cor.
   A causa, achada depois num corpo sintético: a compensação move cada ponto da gaiola para a superfície passar por
   ele, e o ponto da quina do contorno (um canto de 90 graus sem vinco, entre a ponta e a lateral) anda até 59 mm para
   fora; a curva que o liga aos vizinhos sai 11,5 mm da lateral reta, e os vizinhos oscilam. Com a quina em `cantos`
   o excesso vai a zero. `gaiolaPorLacos` passou a avisar (`compensacaoPassa`) quando a compensação leva a superfície
   mais de 2 mm além do contorno declarado, com o trecho, o laço e o desvio; nos casos da casa o maior acréscimo é
   1,36 mm. O degrau entre laços, que já dá 13 mm sem compensar, o aviso não cobre.
9. **O bico do capô dava a volta inteira e deixava uma listra no laranja.** Com a ponta da planta levada inteira à
   silhueta, o degrau do bico (55 mm na lateral) corria de um lado ao outro com a mesma profundidade, e de trás aparecia
   como uma listra horizontal que a referência não tem: nela o bico morre nos cantos. A comparação por cor não vê
   listra dentro de uma cor; a pessoa perguntou o que era. Destino: `lacosPelasVistas` ganhou `cantos: 'fixos'`, que
   deixa os cantos da planta no lugar e encolhe o recuo da ponta na altura em que a silhueta fica aquém do extremo, e
   `extremos`, para o corpo menor que acompanha um maior (a grade); o laranja foi a 85% de coincidência.
   A listra enfraqueceu no centro e continuou nos lados, e a pessoa a apontou de novo, rente ao pé da grade. A leitura
   do degrau estava errada: ele não é do laranja, é a soleira do vão da grade. Acima da soleira, o que a lateral vê de
   mais recuado é a borda do vão, que fica aquém da ponta pelo recuo da planta naquela largura (55 a 95 mm, o tamanho
   do degrau). A seção do meio do capô passou a ser a silhueta lateral mais esse recuo, sem degrau, com o vão cortando
   da soleira ao topo, e a lateral do rascunho continua mostrando o degrau, agora pelo vão. O processo não pegaria:
   silhueta lateral de casco com vão no meio não é a seção do meio, e isso entra como pergunta ao ler a lateral.
10. **Quem conduz olha a vista inteira e não vê o defeito; com o lugar apontado, vê na hora.** Os quatro defeitos da
   traseira (itens 6, 7 e 9, e a borda arredondada em volta do vão, que a pessoa apontou por último) passaram por
   quem conduzia, e cada um foi reconhecido assim que a pessoa disse onde olhar. A ordenação automática das regiões por
   diferença de cor e de borda, tentada primeiro, não serve sozinha: a sombra do rascunho vira classe errada e as
   diferenças antigas abafam a nova. O que serve é a leitura forçada de todas as regiões, ampliadas e lado a lado: um
   crítico sem a história, com as doze regiões dos rascunhos antigos, achou a tampa larga, a divisa em arco e a borda
   do vão, e mais uma dezena de diferenças que ninguém tinha listado; a listra do capô ele tomou por sombra. Destino:
   `npm run leitura:regioes` (`tools/modelar/leitura-por-regioes.mjs`) corta as duas vistas na mesma grade, escreve o
   pedido do crítico e recusa a rodada em que alguma região ficou sem resposta. Para a linha suave dentro de uma cor,
   `npm run linhas:modelo` (`tools/modelar/linhas-do-modelo.mjs`) tira da malha o contorno, a divisa entre partes, a
   quina e a dobra fechada, na mesma vista, e a leitura as põe sobre a referência como terceiro painel de cada região
   (`--linhas`), com a pergunta de cada linha no pedido.
11. **O crítico da leitura enche toda região e troca o lado de um adjetivo de uma rodada para a outra.** Nas duas
   rodadas da traseira (`leitura-traseira/rodada-01.json` e `rodada-02.json`) ele listou diferença nas doze regiões,
   quase sempre três por região, citou a grade e o eixo que o pedido mandava ignorar e disse do canto de baixo do
   laranja primeiro que era vivo na referência e depois que era abaulado. Lidas contra as linhas do modelo, várias
   eram verdadeiras e de forma (a faixa do contrapeso, os cantos dos rebaixos, a aba da tampa), uma era a sombra do
   chão lida como pé alargado, e a maioria era detalhe que não cabe no rascunho. Destino: cada diferença passou a
   dizer o tipo (`forma` ou `detalhe`), o comando conta as duas em separado e só manda corrigir a de forma; o pedido
   diz que região certa leva `igual` e `--fora` escreve nele o que não é da peça. A conferência de cada diferença de
   forma contra as linhas é de quem conduz, e o que ficar aceito leva o motivo.
   Depois a diferença passou a poder vir em campos (o atributo, como ele é na referência, como é no modelo), e o
   registro acusa a contradição: a referência não muda entre rodadas, e a rodada que diz dela o oposto da anterior,
   na mesma região e sobre o mesmo atributo, sai listada para quem conduz decidir. O canto de baixo do laranja da
   região B1, passado a campos, é acusado. A comparação é por palavras: "canto inferior" não cruza com "canto de
   baixo", e essa contradição passaria.
12. **A moldura da grade e a aba da tampa sobravam para fora do laranja nos cantos.** O capô acompanha a curva da planta
   e a moldura tinha voltado a ser reta de lado a lado (extrusão cruzada com a rampa), e a aba da tampa, com 23 a 80 mm
   de fundo, caía no laço curto de `lacosPelasVistas`, em que o recuo da planta encolhe até caber. De trás as duas
   estavam no lugar, e as leituras da vista de trás não viam nada; a pessoa viu nos três quartos. Destino: a moldura e
   o fundo saem de `lacosPelasVistas` com a planta do capô, como blocos fundos, e a face de dentro da aba foi levada
   para dentro do capô, para o laço não ficar curto. O processo não pegaria: a leitura por regiões confere uma vista
   por vez, e o que avança ou recua para o observador só aparece na vista vizinha. Toda parte lida numa vista passa a
   ser lida também na vista de cima ou de lado, pelas linhas do modelo, antes de ir à pessoa.
   Em seguida entrou `npm run sobra:partes` (`tools/modelar/sobra-entre-partes.mjs`), que mede em cada vista quanto de
   uma parte aparece fora do contorno da que a contém: na traseira antiga dá 29,4 mm da moldura na vista de cima, e na
   corrigida, zero. Na mesma rodada acusou 40,7 mm da moldura para trás do capô na vista de lado, que ninguém tinha
   visto (a referência mostra até uns 25 mm), e a ponta de baixo da rampa da grade foi recuada.
13. **A rodada de conferência custava minutos, quase todos de espera.** Cada comando montava o esboço de novo (50 s
   na traseira) e cada vista com luz saía da bancada pelo navegador (60 s, com falha de vez em quando); as bandeiras
   de cor, de parte e de caixa se repetiam à mão em quatro comandos. O processo pegava, pelo tempo, e quem conduzia
   passou a rodar menos vistas do que devia (item 12). Destino: `npm run conferir:vistas` monta a opção uma vez e roda
   as medidas e a leitura de todas as vistas declaradas numa config, e `npm run vista:rapida` desenha a vista
   sombreada da malha, sem navegador, em 1 a 2 s. A montagem em dobro do esboço só de passos crus, achada no
   levantamento, fica para depois da junção com a main, por estar no território de outro plano.
   Feita a correção da montagem em dobro, a medição por etapa mostrou que ela custava 3 s: 48 dos 54 s da montagem da
   carcaça eram o relato de contatos, que `montarOpcoes` calculava sempre e as ferramentas de conferência nunca
   liam. Com `relato: false` nelas, as linhas de uma vista foram de 57,6 para 4,8 s e a rodada completa de 110 para
   60 s. O levantamento tinha apontado a causa errada por estimativa; só a medição por etapa mostrou a certa.
14. **A carcaça inteira mostrou o que a camada de conferência ainda não fazia.** Montada por um agente com as
   ferramentas da traseira, em quatro vistas: a vista de cima de IA tem a frente à esquerda e a da bancada a põe
   embaixo, e a config não girava a referência; um comentário mal fechado engoliu duas partes do módulo e a rodada
   seguiu sem elas, porque a config ainda não as declarava; cada rodada numa pasta nova recomeçava a numeração e a
   checagem de contradição não via a anterior; e as caixas da frente das laterais, uma de cada lado, não cabiam em
   `lacosPelasVistas`, que supunha a planta centrada. O processo pegou os quatro, pelo relato de quem montou.
   Destino: a vista da config aceita `girar` e `espelhar`; a parte declarada que a opção não tem é recusa, numa linha
   com as que faltam; `--rodadas-de` leva as rodadas registradas a uma pasta nova, e o resumo diz para usar a mesma;
   `lacosPelasVistas` aceita `centro`, com saída idêntica quando ele é zero. Ficou sem destino a ocultação na
   `sobra:partes`, que é do desenho dela: os degraus escondidos pelo piso deram 20 mm de sobra.
15. **A rodada de correção da carcaça, com quatro críticos sem contexto, deixou o que falta medir.** Dos catorze itens
   de forma triados das quatro leituras, nove foram corrigidos, três não eram da peça ou eram detalhe, e dois ficaram
   com o motivo (a aba do paralama, que as vistas de cima e de frente dão com 606 mm e a de trás não mostra, e a
   faixa laranja sob o contrapeso, porque a lateral desce a 191 mm e as vistas de frente e de trás param em 226). O
   processo pegou sozinho o pino escuro que saía abaixo do corpo, pela proporção da vista; a aba da tampa solta, os
   arcos facetados e o bloco ao lado do contrapeso só apareceram pelo crítico ou pelos três quartos. Ficou sem
   ferramenta: a vista de IA com altura e largura em escalas diferentes (a de frente, 27%), que o casamento trata com
   uma escala só; o arco de contorno, que a simplificação de 6 mm faceta e hoje é ajustado dentro do módulo; o
   encolhimento de 10 a 15 mm da silhueta nos degraus de um corpo subdividido sem compensar, que nada mede; e um
   lugar para registrar a medida que duas vistas dão diferente. Vão ao backlog.
16. **O rascunho do protetor, do posto e dos acessórios mostrou cinco faltas nas ferramentas.** Dezesseis partes sobre
   a carcaça, em três rodadas registradas. `conferir:vistas` não aceita uma vista sem imagem, e a lateral da máquina
   inteira, que só existe em contornos, foi comparada por script solto. `sobra:partes` toma a silhueta de um quadro
   vazado por cheia (a grade do teto dentro do quadro do protetor deu 411 mm de sobra falsa de cima) e aplica as
   mesmas vistas a todos os pares. O esboço não tem varredura de seção ao longo de um caminho, e as colunas saíram de
   uma faixa extrudada cruzada com a seção de frente. O relato de contatos chama de travessia o assento apoiado na
   face curva da tampa do motor. E o registro da leitura pede `aceitas` em frases e `decididas` em objetos, e uma
   rodada foi recusada por isso. O processo pegou os cinco, pelo relato de quem montou. Vão ao backlog. A carcaça
   também ficou devendo: as colunas da frente do protetor caem por fora do painel, e a vista de frente as põe por
   dentro; para isso o painel teria no máximo 415 mm de meia largura junto ao eixo dianteiro.
17. **A torre e os garfos em rascunho deixaram três pendências na carcaça e nas ferramentas.** Dez partes sobre a
   carcaça, em três rodadas registradas. A largura da torre vem de três fontes que não concordam (820 mm na TABELA,
   706 na vista de cima, 555 na de frente na escala da carcaça), e ficou em 620 porque acima disso ela atravessa a
   aba do paralama. O cilindro de inclinação atravessa o painel e o piso, e a carcaça fica devendo um rebaixo no
   painel (x 305 a 405, y 810 a 910, z 0 a -160). O relato de contatos acusa como travessia o eixo dianteiro dentro
   do olhal do pé da torre, que é pino em furo com 2 mm de folga, e o par não tem como ser declarado assim. A lateral
   da torre foi conferida contra os contornos por script à parte, pela mesma falta do item 16. O processo pegou os
   três, pelo relato de contatos e pelo relato de quem montou.
18. **Os eixos e as rodas em rascunho ficaram presos por três medidas da carcaça.** As quatro rodas tocam o chão e nada
   atravessa. O poço da roda dianteira corta de 414 mm para fora e a banda do pneu pede 349; o pneu traseiro fica
   estreito por dentro porque o contrapeso chega a 492 mm dentro do disco da roda; e o diâmetro traseiro ficou em 568
   pelo cubo da carcaça, contra 545 da TABELA e 612 da lateral. Três faltas de ferramenta: `sobra:partes` compara o
   pneu, que de lado é um anel, e acusa o aro e o cubo como fora dele; o relato de contatos deu 76 mm de travessia
   num toque rente que cruzava 0,01 mm, que é a medida da caixa e não a da travessia; e cada sonda de interferência
   remontava a carcaça, 50 s por consulta, o que a montagem sem relato já resolveu. O processo pegou todos.
19. **A máquina inteira em rascunho fechou as pendências entre as partes e mostrou que as vistas de IA não têm uma
   escala só.** Sessenta partes num módulo que chama a montagem da carcaça e as três frentes sobre o mesmo estado
   (`empilhadeira.esboco.mjs`, [três quartos](maquina-inteira-tres-quartos.png) e
   [lado](maquina-inteira-lado.png)). As colunas do protetor foram para dentro do painel, o painel e o piso ganharam o
   rebaixo do cilindro de inclinação, os poços das rodas e o contrapeso passaram a caber os pneus, e as medidas das
   rodas ficaram num objeto só, que a carcaça exporta e os eixos leem. A vista de frente tem a altura 25% maior que a
   largura na mesma escala, e a de trás encolhe em 0,90 o que está longe: a medida adotada e a fonte de cada linha
   estão na TABELA do `ALINHAMENTO.md`, com as divergências numa seção própria. Quatro faltas de ferramenta se
   repetiram: a relação de contato sem pino em furo com folga, o relato que chama de travessia o par de sólido
   inconclusivo com as caixas sobrepostas, a `conferir:vistas` sem a vista só de contornos, e o casamento com uma
   escala por vista. O processo pegou as pendências pelos relatos das frentes; a escala dupla da vista de frente só
   apareceu na comparação entre vistas feita à mão, e falta o campo que a registre na configuração da conferência.
20. **A primeira receita, a da carcaça, parou em três ferramentas antes de chegar ao crítico.** A malha da receita é a
   do rascunho aprovado, e a medição passou na primeira vez. O registro das etapas quebrava ao ler a peça: a booleana
   sobre o corpo subdividido com vinco vivo deixava em `face.quebras` pares de vértices que o corte apagou (cinquenta
   na carcaça). A correção ficou na booleana, que passa a dar a cada pedaço os trechos da aresta original que continuam
   na borda dele, com teste, e a guarda do acervo não mudou em nenhuma das 65 peças. A captura da montagem falhava
   neste contêiner porque o navegador pedia o ícone da página e o servidor respondia 404, e a mensagem não dizia a
   causa: o visor declara ícone vazio e o erro traz o texto e o endereço. O registro da rodada não lia o relato que o
   agente entrega pela ferramenta de devolução, sem bloco de texto, e passou a ler. Ficaram abertos o `npm run
   parametros`, que não terminou em 300 s com a TABELA em listas de contorno, e a montagem v5, que recusa nomear a
   etapa que ainda não tem receita. O processo pegou os três pela recusa da própria ferramenta; nenhum teste cobria a
   booleana sobre face com quebra de sombra, e agora cobre.
21. **O envio da receita da carcaça levou três execuções do CI para chegar à main, sem defeito no código.** A primeira
   reprovou por tempo em dois lugares: dois arquivos da bateria rápida a 12,4 e 12,5 s sozinhos, contra o teto de 12,
   e a razão de tempo do vão na cúpula 4,5% acima do limite (na máquina local a mesma razão dá 1,5 contra o limite de
   3). A segunda reprovou na guarda de gesto, em que o arquivo salvo não chegou em 15 s, e a nova tentativa do mesmo
   job passou nela e reprovou na guarda da imagem de referência; a terceira passou. Nenhum dos quatro testes está em
   arquivo que o ramo mudou. O processo não distingue a carga da máquina do defeito nesses quatro: a bateria rápida já
   separa os dois casos quando o arquivo roda sozinho abaixo do teto, e falta o mesmo cuidado no teste de razão de
   tempo e nas esperas fixas das guardas da bancada, que são de outros planos e ficam aqui como pedido.
22. **As dezenove receitas mostraram onde o laço gasta e o que ele não vê.** Sete peças fecharam na primeira rodada, sem
   defeito, e eram todas prismas, tubos e revoluções simples. As que pediram duas ou três rodadas eram as de superfície
   moldada (carcaça, banco, protetor, rodas), e nelas o crítico manteve a nota e trocou de defeitos de uma rodada para
   a outra. Cinco vezes ele leu como peça atravessando outra um encaixe que a auditoria mede como livre (o assento do
   eixo, o pneu na carcaça, a camisa do cilindro no painel, os montantes do carro no canal, o banco sobre a tampa),
   sempre por não ter vista em corte. Duas vezes comparou a vista de lado com fotos de frente e de trás. Uma face
   degenerada do berço do gás passou por todas as medições da peça e só foi recusada na exportação das vistas de
   superfície. Três famílias ou ajudantes ficaram estreitos para a máquina: a roda, o cilindro hidráulico e a varredura
   de seção constante. O relato de um modelador com várias peças precisou ser repartido à mão para o registro. Tudo
   isso está no roteiro do plano [núcleo para qualquer mecanismo](../../planos/2026-11-10-nucleo-para-qualquer-mecanismo.md),
   nas fatias 1, 4 e 5. O processo pegou a face degenerada e os defeitos de forma pelo crítico; não pegou sozinho as
   leituras erradas de encaixe, que só a medida de quem conduz desfez.
23. **A opção nova da família de roda custou tempo a dois testes que os gates locais não rodam.** O envio do fechamento
   reprovou no CI em dois testes lentos. A conferência das sete famílias foi de 34 para 42 s na máquina local com a
   opção de ombro largo e o perfil da empilhadeira, e no CI o arquivo dela levou 207 s, acima dos 180 s do teto geral:
   o teste ganhou um teto próprio de 420 s. O furgão realista levou 868 s nas duas execuções, contra o teto próprio de
   860: medido aqui antes e depois das mudanças desta sessão, ele dá 160 a 180 s antes e 164 depois, dentro da
   variação da máquina, então o teto dele é que está a 1% do tempo real e fica como pedido ao plano dono do teste. A
   mesma medida mostrou que a correção da booleana tirou a quebra de sombra de dez faces do furgão (18.552 para
   18.542 de 253.481), as que apontavam aresta que o corte tinha apagado; a guarda do acervo e as etapas do acervo
   passam com isso. O processo não pegou o tempo antes do envio porque os testes lentos só rodam inteiros no CI.

