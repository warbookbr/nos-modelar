# Sedã em alta definição, ciclo 1: o corpo de baixo e o capô por dois caminhos

Este é o registro do primeiro ciclo da fatia 4c do plano [`2026-11-10-nucleo-para-qualquer-mecanismo.md`](../../../decisoes/PLANOS-ENCERRADOS.md). O trecho é o corpo de baixo do lado direito, da linha de cintura para baixo, do para-lama dianteiro à lateral traseira, mais a faixa de cima do para-lama e a metade direita do capô, sem a tomada de ar. O ciclo é diagnóstico: mede o que o projeto dá hoje a uma IA para modelar lataria de superfície dura, e nenhuma forma daqui foi aprovada por ninguém.

Os arquivos estão em [`procedural/pecas/sedan-chassi-e-lataria/alta-definicao/`](../../../../../procedural/pecas/sedan-chassi-e-lataria/alta-definicao/). O `alvo.mjs` tem o alvo comum aos dois caminhos (as tabelas do rascunho facetado, a lateral `ladoX(z, y)`, o topo `topoY(x, z)`, as linhas de vão e os painéis). O `caminho-a-gaiola-da-casca.esboco.mjs` e o `caminho-b-rede-de-curvas.esboco.mjs` são os dois esboços 2.0. O `como-receita.mjs` converte um esboço em receita para as ferramentas que só leem receita, o `medir.mjs` mede o tempo, as faces e o raio das quinas, e o `exportar-trecho.mjs` com o `tres-quartos.py` fazem a vista sombreada. Os dois esboços montam por `npm run esboco:nucleo -- <arquivo> --so-montar`, com seis partes e nenhuma face sem parte, e `npm run guarda:acervo` aprova o acervo com eles na pasta.

## O alvo

Não há referência de alta definição. O alvo é o carro facetado com quatro acréscimos deste ciclo, escritos na tabela do `alvo.mjs`: a flecha do topo de 8 mm na largura, o bojo da lateral de 6 mm na altura, a quina do ombro do para-lama em y 890 (acima dela a lateral é a da cabine, abaixo dela o para-lama alarga até a planta do rascunho em y 700) e os raios pedidos, 6 mm na quina da cintura (o topo com a lateral, que na frente é o capô com o para-lama) e 3 mm na quina do ombro. As tabelas do rascunho são polilinhas, e o alvo passa pelos mesmos vértices com uma cúbica monótona, para a planta não ter quina onde o alargamento começa. A chapa tem 1 mm e o vão pedido é de 4 mm.

No caminho A a gaiola é uma grade escrita à mão: 19 estações, que são os vértices da planta do rascunho mais as de preenchimento, por até 13 colunas, que são as arestas da seção, uma coluna de meio por painel para a flecha e as colunas de apoio junto das quinas. São 195 pontos, sem medidas, e os arcos de roda são abertos pelo corte, como no rascunho. No caminho B a gaiola sai de `gaiolaPorRede` com 21 curvas e 10 retalhos, quatro deles de cinco lados: a cintura, o ombro, o fundo, os dois arcos de roda como borda livre, a frente, a traseira, o contorno do topo e sete ligações. São 568 pontos, e a superfície passa pelas curvas.

## A comparação

Os números são da configuração final de cada caminho. No A, as colunas de apoio ficam a 18 mm da cintura e a 2,75 mm do ombro, os dois vincos têm nitidez 0,15 e a subdivisão tem 3 níveis. No B, o passo da rede é 90 mm, a faixa entre a cintura e o ombro tem passo 35 mm, a nitidez é 0,40 na cintura e 0,69 no ombro e a subdivisão tem 3 níveis. O corte em painéis usa `modo: 'superficie'`, salvo os dois arcos do A, que ficam no modo vista (atrito 9).

| Medida | Caminho A, gaiola da casca | Caminho B, rede de curvas |
|---|---|---|
| Linhas de código do caminho (o alvo comum tem 144) | 59 | 107 |
| Pontos da gaiola | 195 | 568 |
| Faces, só a chapa | 21.472 | 64.512 |
| Faces, com os seis painéis | 22.967 | 70.500 |
| Tempo de montagem, só a chapa | 0,5 s | 2,4 s |
| Tempo de montagem, com os painéis | 16,8 s (10,4 s no modo vista) | 52,9 s (42,8 s no modo vista) |
| `npm run ondulacao`, falhas (chapa sem o corte) | 2, de 2,28 e 1,86 mm | 5, de 3,52, 3,22, 2,43, 1,95 e 0,91 mm |
| `npm run ondulacao`, junto das feições | 7, até 3,99 mm | 16, até 3,03 mm |
| `npm run ondulacao`, desvio p95 e máximo | 1,84 e 3,61 mm | 1,13 e 3,52 mm |
| `npm run ondulacao`, faces viradas | 0 | 0 |
| `npm run -s malha:lascas`, modo superfície (modo vista) | 25 (3) | 49 (7) |
| Raio da cintura, pedido 6 mm: menor raio de curvatura do corte | 5,5 a 5,8 mm | 7,1 a 7,2 mm, com segmento de 6 mm |
| Raio da cintura: filete de mesma folga | 9,3 a 9,7 mm | 6,4 a 6,8 mm |
| Raio do ombro, pedido 3 mm: menor raio de curvatura do corte | 2,8 a 4,2 mm | 8,6 a 24 mm |
| Raio do ombro: filete de mesma folga | 0,4 a 0,6 mm | 4,1 a 41 mm |
| `npm run vao:partes`, vão nos oito pares, modo superfície | 3,95 a 4,10 mm, mediana 4,02 | 3,96 a 4,11 mm, mediana 4,02, mais um ponto isolado de 0,002 |
| `npm run vao:partes`, pares com vão abaixo de 4,0 mm | 1 (3,951 no para-lama com a porta, na altura do ombro) | 4 (3,964, 3,977, 3,993 e 3,999) |
| `npm run vao:partes`, degrau máximo | 0,17 mm | 0,98 mm (lateral com a porta traseira), 0,32 mm (para-lama com a porta) |
| `npm run vao:partes`, modo vista | vão de 4,07 a 4,18, degrau até 0,17 | vão de 4,06 a 4,29, degrau até 0,40 |
| Tempo gasto por quem modelou | cerca de 9 minutos | cerca de 9 minutos |

Fora dos dois caminhos, o alvo comum, as leituras e as medidas levaram cerca de 25 minutos, e a troca para o esboço 2.0 e para o modo superfície, depois da interrupção, mais uns 15. O `npm run alisar` não foi rodado: os dois esboços não têm `TABELA` de pontos, e a sondagem ponto a ponto não cabia no tempo.

Como os números foram medidos. A ondulação é a da chapa sem o corte (`HD_PAINEIS=0`), porque a ferramenta recusa a chapa cortada (atrito 5). O raio saiu do `medir.mjs`, em quatro cortes da malha (z 1800, 1500, 1100 e 800), por duas definições. O menor raio de curvatura é o do círculo por três pontos seguidos do corte, junto da quina. O filete de mesma folga é a definição da tabela de `modelar-carroceria.md`: ajusto uma reta a cada face vizinha entre 30 e 80 mm da quina, cruzo as duas e converto em raio a distância desse cruzamento à malha. As duas definições divergem em até 60% na mesma malha (atrito 2), e por isso a tabela traz as duas. Os tempos de montagem são de uma execução, com a máquina dividida com outros agentes, e servem pela ordem de grandeza.

Contra os critérios do plano para o ciclo: nenhum dos dois caminhos fica sem falha de ondulação, nenhum fica sem face fina depois do corte, o raio da cintura fica dentro de 20% do pedido em uma das duas definições e fora na outra nos dois caminhos, o raio do ombro só fica perto no A e varia 50% ao longo da quina, o vão cai abaixo de 4,0 mm em pelo menos um par nos dois, e o degrau passa de 0,3 mm só no B. O crítico sem contexto não foi chamado neste ciclo.

## As imagens

[`tres-quartos-lado-a-lado.png`](tres-quartos-lado-a-lado.png) mostra o mesmo trecho do carro facetado, o caminho A e o caminho B, com a mesma câmera e a mesma luz, e [`tres-quartos-quina-do-para-lama.png`](tres-quartos-quina-do-para-lama.png) aproxima a quina do para-lama com o capô. As partes do facetado são as mesmas seis, que no rascunho incluem o quadro das janelas das portas, o capô inteiro e a faixa de cima da lateral traseira. [`luz-rasante-lado.png`](luz-rasante-lado.png), [`luz-rasante-topo.png`](luz-rasante-topo.png), [`curvatura-lado.png`](curvatura-lado.png) e [`luz-rasante-e-curvatura-tres-quartos.png`](luz-rasante-e-curvatura-tres-quartos.png) são as vistas de `npm run vistas:superficie` dos dois caminhos lado a lado, da chapa sem o corte, e por isso o A aparece nelas sem os arcos de roda.

O que vi nelas. No A a luz corre contínua pela lateral, e a única sombra forte é a faixa escura onde o alargamento do para-lama acaba, em z de 560 a 700, que é o lugar das duas falhas de ondulação. No B a luz rasante mostra manchas em volta dos dois arcos e uma mancha escura acima do arco traseiro, e a curvatura mostra linhas que saem do centro dos retalhos de cinco lados; a escala da curvatura satura em 4,74 1/m no B e em 1,88 1/m no A. Na vista sombreada o arco de roda do A aparece em 48 lados, que são os da linha fechada do corte, e o do B aparece liso. Na aproximação a quina da cintura aparece arredondada nos dois, e a do facetado aparece viva.

## Atritos

1. O raio da quina não se pede em milímetro, e a nitidez só o entrega com níveis que o carro não comporta. Com a gaiola do A sem colunas de apoio e só o vinco (`HD_APOIO_C=0 HD_APOIO_O=0 HD_NC=0.58 HD_NO=0.77 HD_PAINEIS=0 node medir.mjs caminho-a-gaiola-da-casca.esboco.mjs`), a cintura sai com 0,16 mm no nível 3, com 3,88 mm no nível 4 e com 5,91 mm no nível 5, que tem 216.704 faces só neste trecho; o ombro sai vivo nos três. A nitidez 0,58 vale 3,4 níveis de regra viva, e a malha só arredonda depois deles. No B a mesma nitidez 0,45 dá 5,9 mm com passo 60, 13,5 mm com passo 90 e 16,4 mm com passo 120. O menor caso é uma chapa em L de duas faces de 110 mm com vinco 0,58 nos níveis 3, 4 e 5. A atribuição é do núcleo, pela regra da nitidez em níveis, e da instrução, porque a tabela de `modelar-carroceria.md` dá o raio da superfície limite e não diz que ele só aparece na malha quando os níveis passam de dez vezes o quadrado da nitidez. O contorno foi a coluna de apoio de cada lado da quina, com que o menor raio de curvatura fica perto de 0,39 vez a distância da coluna quando não há vinco (4,7 mm a 12 mm, 6,3 mm a 16 mm) e não depende dos níveis; a calibragem levou sete rodadas no A e quatro no B. Resolveria um campo de raio em milímetro no vinco, que o passo `subdivisao` (ou os ajudantes de gaiola) convertesse nas colunas de apoio ou num chanfro de segmentos contados, com o raio conferido na saída. O processo não teria pego sozinho: nenhuma ferramenta mede raio.

2. Não há ferramenta que meça o raio de uma aresta, e o critério dos 20% não tem definição. O `medir.mjs` deste ciclo tem 114 linhas e dá duas respostas para a mesma malha: no A, 5,8 mm pelo menor raio de curvatura e 9,7 mm pelo filete de mesma folga; no B, 7,2 e 6,7 mm. O perfil que a subdivisão dá não é arco de círculo, e a segunda definição passou de 4,4 para 6,6 mm na mesma quina quando entraram as colunas de apoio do ombro, a mais de 80 mm dela, porque a reta ajustada à face vizinha muda. Em quina rasa ela não serve: com 166 graus por dentro, 0,3 mm de folga viram 41 mm de raio. O menor caso é o L do atrito 1. A atribuição é de ferramenta. Resolveria um comando que cortasse a malha por planos perpendiculares a cada vinco nomeado e desse, por vinco e ao longo dele, o menor raio de curvatura, a largura do arredondamento e o ângulo, com a definição que o critério do plano adota.

3. A linha de vão desenhada numa vista não sobe uma quina arredondada. A linha do para-lama com a porta, na vista de lado, cruza a quina da cintura quando a borda de trás do topo fica em z 690. No modo vista o B recusa com "a chapa fica inclinada 89,415 graus em relação à lâmina no ponto [690, 1001,118]", e o A aceita em silêncio e deixa um degrau de 0,61 mm em (859, 1000, 690), que só o `vao:partes` acusa. No modo superfície os dois recusam com "a linha 'fimDoParaLama' sai da chapa num ponto em que a chapa mais próxima é rasante à vista" (`HD_ZPE=690 node medir.mjs <caminho>`). O contorno foi recuar a borda do topo para z 693, fora da lâmina, o que só existe neste trecho, em que a porta não tem teto por cima. O menor caso é uma chapa de duas faces a 90 graus com a quina arredondada e uma linha de vão que cruza a quina. A atribuição é do núcleo. No carro inteiro toda porta cruza a quina da cintura e o capô desce pela quina da frente. Resolveria a linha de vão dada por uma sequência de pontos nomeados da gaiola ou por uma curva da rede, ou a linha continuada de uma vista para a outra no ponto em que a chapa fica rasante.

4. A leitura de ondulação toma por defeito a quina arredondada por colunas de apoio. Sem vinco declarado, `HD_PAINEIS=0 HD_NC=0 HD_NO=0 HD_CAMINHO=a npm run -s ondulacao -- <como-receita.mjs>` dá três falhas, de 21,6, 11,5 e 8,5 mm, com p95 de 18,4 mm, todas sobre a cintura e o ombro, que são a forma pedida. Declarar os dois vincos com nitidez 0,15 leva essas leituras para `junto` e deixa as duas falhas da tabela, ao custo de encolher o raio de 6,1 para 5,0 mm, que compensei afastando a coluna de 15,5 para 18 mm. O menor caso é o L com duas colunas de apoio e sem vinco. A atribuição é de ferramenta. Resolveria declarar a feição arredondada pelo nome da coluna do meio, ou o campo de raio do atrito 1, que a leitura já trataria como vinco.

5. A leitura de ondulação não mede a chapa cortada em painéis. Com os painéis, `npm run -s ondulacao` responde "o vértice 26 da superfície do passo 0 não está na malha entregue; um passo posterior o tirou" no A e o mesmo com o vértice 1175 no B. A superfície que vai à pessoa é a cortada, e a medida é da de antes do corte. O menor caso é o exemplo da ficha de `paineisPorVaos` sobre uma chapa de subdivisão. A atribuição é de ferramenta. Resolveria a leitura usar a superfície do passo como ele a entregou, pela procedência, e relatar a falha pelo painel em que ela cai.

6. O corte deixa faces finas, e a exportação para as vistas recusa a peça por causa delas. `npm run -s malha:lascas` dá 3 faces finas no A e 7 no B no modo vista, e 25 e 49 no modo superfície, todas do passo `subtrair`. `npm run vistas:superficie` sobre o A com painéis responde "Face tem triângulo sem área (altura abaixo da tolerância)" e não gera imagem. As vistas de superfície deste ciclo são da chapa sem o corte, e a vista sombreada saiu de um exportador próprio de 28 linhas, que pula a face sem área. O menor caso é uma chapa de subdivisão de 1 mm cortada por uma linha fechada em círculo. A atribuição é do núcleo, pelo `subtrair` que entrega a face degenerada, e de ferramenta, pelo exportador que para em vez de pular e avisar. Resolveria a limpeza das faces abaixo da tolerância na saída da booleana.

7. `paineisPorVaos` estoura a pilha com chapa grande. Com o B em passo 60 e 3 níveis (126.928 faces), a chamada morre com "RangeError: Maximum call stack size exceeded" em `paineis-por-vaos.js`, na linha `Math.min(...todos.map((p) => p[e]))`, que hoje é a 224. O menor caso é qualquer chapa com mais de uns 120 mil vértices. A atribuição é do núcleo. O contorno foi a rede com passo 90 e passo próprio de 35 mm só na faixa da cintura. Resolveria o mínimo e o máximo por laço. O processo pegou, pela queda.

8. Os retalhos de cinco lados da rede ondulam em volta dos arcos. As quatro maiores falhas do B (3,52, 3,22, 2,43 e 1,95 mm, com extensão de 465 a 1.294 mm) citam o ponto `centro` dos retalhos `trasDoArco`, `frenteDoArco`, `atrasDoArcoDaFrente` e `frenteDoArcoDeTras`. O interior do retalho só conhece as curvas da borda, e o alargamento do para-lama, que é constante abaixo de y 700, não está em nenhuma delas. Uma primeira versão com oito retalhos e passo 60 tinha doze falhas, de até 4,58 mm; com duas ligações a mais em z 560 e -560, a tabela suavizada e o passo 90 ficaram as cinco da tabela. O menor caso é um retalho de cinco lados sobre uma superfície com um degrau suave no meio. A atribuição é do núcleo, pelo preenchimento de n lados, que o alisamento do miolo não toca, e da instrução, que não diz quantas curvas internas uma forma com ombro pede. Resolveria o retalho aceitar uma função de forma ou curvas-guia internas, ou o alisamento valer para o retalho de n lados.

9. O modo superfície de `paineisPorVaos` tem quatro diferenças medidas em relação ao modo vista. A volta fechada com `dentro: 'descarta'` não descartou o disco do arco de roda: o A saiu com 8 pedaços e dois avisos de pedaço sem nome, de 401.345 e 402.055 mm², e por isso os arcos ficaram no modo vista por linha. As faces finas passaram de 3 para 25 no A e de 7 para 49 no B. O vão ficou em 4,02 mm nos trechos planos e caiu a 3,951 mm no A e a 3,964 mm no B onde a linha do para-lama com a porta cruza a quina do ombro, perto do 3,95 que o teste do ajudante já tinha dado numa dobra suave. E a montagem do A passou de 10,4 para 16,8 s. No B o `vao:partes` ainda acusa um mínimo isolado de 0,002 mm e um degrau de 4,02 mm em (760, 1002, 1017), no vão do capô com o para-lama, ao longo de 6 mm de linha; as faces da malha naquele ponto têm as duas paredes em x 757,98 e 762,00, de modo que o vão está aberto ali e a leitura parece vir da emenda das paredes varridas em z 1017,4. Não separei se o erro é da malha ou da medida. O menor caso do primeiro item é a chapa de subdivisão com uma linha fechada em círculo e `dentro: 'descarta'` no modo superfície. A atribuição é do núcleo e, no ponto isolado, de núcleo ou de ferramenta.

10. Na rede a superfície passa pela curva da quina e incha em volta dela. No B a quina viva ajustada fica em (861,75; 1002,09) em z 1500, contra (860,5; 1000) desenhado: o capô sobe 2 mm acima do plano do alvo junto da cintura e a lateral sai 1,3 mm. `modelar-carroceria.md` avisa que isso acontece com todos os pontos medidos. O menor caso é a rede de dois retalhos a 90 graus com a curva comum em `vinco: 0.4`. A atribuição é do núcleo e da instrução. Resolveria a curva de vinco com raio valer como quina teórica, por onde a superfície não passa.

11. A quina rasa não tem raio que a malha mostre. No ombro o ângulo por dentro vai de 153 a 162 graus, e um raio de 3 mm ocupa de 1,0 a 1,4 mm de arco. No A foi preciso pôr colunas a 2,75 mm da quina, ao lado de faces de 95 mm, e o raio medido vai de 2,8 mm onde o alargamento é maior a 4,2 mm onde é menor. No B o vinco 0,69 dá de 8,6 a 24 mm pela curvatura. A atribuição é do núcleo e do pedido: o raio em milímetro numa quina de ângulo variável precisa de uma coluna de apoio cuja distância varie com o ângulo. Resolveria o campo de raio do atrito 1 calculando a distância por estação.

12. As tabelas do facetado trazem quinas que a alta definição vira ondulação. As duas falhas do A, de 2,28 mm em z -510 e 1,86 mm em z 514, ficam onde a planta do rascunho começa a alargar, de 860 para 933 mm em 311 mm de comprimento. Suavizar a tabela com a cúbica monótona não as tirou. A atribuição é da referência: o carro facetado dá o caráter, e a transição do para-lama para a porta precisa ser redesenhada para a chapa lisa, com a pessoa.

13. O rascunho com subdivisão não tem formato que todas as ferramentas leiam. A primeira versão dos dois caminhos era uma receita em arquivo solto, que `npm run guarda:acervo` reprova. A regra da pasta está na primeira frase da seção 2 do `GUIA-AUTORIA-IA.md`, que o roteiro `modelar/peca/nova` me entregou, e eu a contrariei porque `npm run ondulacao`, `npm run -s malha:lascas`, `npm run vistas:superficie` e `npm run exportar:obj` só leem receita. O esboço 2.0, que a guarda aceita, só é lido por `npm run vao:partes` e `npm run esboco:nucleo`. O contorno é o `como-receita.mjs`, de 12 linhas. A atribuição é de ferramenta e de instrução: nenhum roteiro diz onde mora um rascunho de lataria que precisa das medidas de superfície. Resolveria as quatro ferramentas lerem o esboço pela mesma entrada que o `vao:partes` usa.

14. A casca feita por booleanas não vira gaiola. As seis partes do trecho no rascunho têm 389 faces: 124 triângulos, 187 quadriláteros e 78 faces de 5 a 9 lados. A gaiola do A foi escrita de novo a partir das tabelas, e nenhum ajudante monta uma grade de quadriláteros da seção, da planta e do perfil lateral de um corpo aberto. Não testei `gaiolaPorEstacoes` nem `lacosPelasVistas` neste ciclo. O custo foi baixo aqui, 59 linhas, porque o trecho é uma grade regular.

15. O arco de roda aberto pelo corte não tem aresta nomeada. No A o arco é a linha fechada de 48 lados do corte e aparece poligonal, e a borda dele não tem pontos da gaiola onde um `friso` se apoie. No B o arco é curva da rede, e a sonda `HD_LABIO=1` pôs a aba do `friso` (15 mm de largura, 90 graus, raio 3 mm) sobre `rede.linha('arcoFrente')` sem recusa, com 1.642 faces, com e sem os painéis. Não olhei a forma do lábio.

16. `gaiolaPorRede` devolve os pontos em metro, e o esboço e `paineisPorVaos` os querem em milímetro. A conversão é uma linha no esboço do B. A atribuição é do núcleo, e resolveria uma opção de saída em milímetro na rede.

17. A espessura recusa o nível 4 no canto côncavo da borda. Com 4 níveis no A o passo responde "a espessura 0.001 passa do raio de curvatura local, que chega a 0.000983, perto de 'e5_cintura'", que é o canto em que a borda de trás do topo encontra a cintura. A execução devolve a malha vazia sem lançar erro, e a mensagem só aparece em `conferir-malha` ou em `orfaos` do neutro. A atribuição é do núcleo, e o limite está escrito no guia.

## Recomendação

Para o carro inteiro recomendo o caminho A, a grade de estações por colunas com colunas de apoio junto das quinas, e a rede de curvas só onde uma abertura precisa de borda nomeada. O sedã de caixa é quase todo grade: os painéis são planos e as arestas de caráter correm ao comprido ou na seção. No A o raio saiu pela distância da coluna de apoio, com o menor raio de curvatura a menos de 9% do pedido na cintura e sem depender dos níveis; a malha tem um terço das faces do B, a montagem leva um terço do tempo, a luz rasante sai limpa e as duas falhas de ondulação que sobram são da transição do para-lama herdada do facetado. O B custa quatro retalhos de cinco lados que ondulam, uma quina que incha 2 mm e um raio que muda com o passo da rede. O que o A não tem é a borda do arco de roda, que nele é um corte de 48 lados sem aresta nomeada. A previsão, não testada, é que a opção `aneis` da `gaiolaPorEstacoes` dê esse laço dentro da grade; se não der, o arco entra como a rede fez aqui, num trecho só.

A recomendação depende de uma decisão da pessoa: aceitar que a transição do para-lama para a porta seja redesenhada para a chapa lisa, em vez de copiada da planta do facetado.

## O que falta para a alta definição

Em ordem de importância. O que está marcado como medido saiu deste ciclo, e o resto é previsão.

A linha de vão que acompanha a quina arredondada impede o carro inteiro (medido, atrito 3). Toda porta cruza a quina da cintura e o capô desce pela quina da frente, e nos dois modos o ajudante recusa a linha nesse ponto.

O raio em milímetro na aresta encarece cada quina e impede a quina rasa no caminho da rede (medido, atritos 1 e 11). Hoje o raio se acerta por tentativa, medindo com um script próprio.

A medida do raio impede fechar o critério dos 20% (medido, atrito 2). Sem definição e sem comando, o mesmo raio passa ou reprova conforme a conta.

As faces finas do corte impedem o critério de nenhuma face fina e derrubam a exportação e as vistas da peça cortada (medido, atrito 6).

As medidas de superfície sobre o que o fluxo produz encarecem cada rodada (medido, atritos 4, 5 e 13). A ondulação não lê a chapa cortada nem a quina por colunas de apoio, e quatro ferramentas não leem o esboço.

A borda do painel com aba é previsão, e prevejo que impede. O painel sai de um `subtrair`, e a borda dele não tem pontos nomeados; a `aba` do `friso` pede uma linha de pontos da gaiola. O guia de veículo em chassi e lataria já diz que a aba não se faz. Com o vão no modo superfície as paredes do corte ficam normais à chapa, o que é o começo de uma aba, mas nada vira a chapa para dentro.

O lábio do arco de roda sai na rede como `friso` com `aba` (medido, atrito 15, sem olhar a forma) e é previsão que no A dependa do anel na grade. Encarece.

O rebaixo de farol, de maçaneta e de grade é previsão, e prevejo que impede. O plano registra que o rebaixo não existe. Com o que há, o farol é um vão cortado e uma peça solta dentro dele, e a chapa não afunda em volta com raio.

A moldura de vidro é previsão, e prevejo que encarece. O `friso` com `variacao` faz a moldura sobre uma curva nomeada, e a janela cortada por `paineisPorVaos` não tem essa curva; a janela teria de ser vão da gaiola ou curva da rede, na parte de cima do carro, que este ciclo não tocou.

O para-choque é previsão, e prevejo que encarece. É um sólido fechado próprio, que os ajudantes de laços e de varredura fazem, e as quinas dele caem no mesmo problema do raio.

As rodas são previsão, e prevejo que só incomodam. A família `roda-pneu` já entra por `instanciaDeFamilia`, e o que falta é o detalhe do aro no nível do resto do carro.

A transição do para-lama para a porta é da referência e impede aprovar a lateral como está (medido, atrito 12). Precisa de desenho, e não de ferramenta.

O tempo de montagem com painéis encarece o laço (medido). São 17 s no A e 53 s no B a cada medida deste trecho, que é um sexto da lataria.
