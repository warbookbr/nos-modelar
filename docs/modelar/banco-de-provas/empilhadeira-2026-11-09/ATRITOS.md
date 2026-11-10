# Empilhadeira — atritos

Plano: [`2026-11-09-empilhadeira.md`](../../planos/2026-11-09-empilhadeira.md). Cada atrito diz como se reproduz, se o
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
