# Carcaça da empilhadeira, vista lateral: o desenho por restrições ajustado à referência

Fatia 2 do plano [as famílias de desenho](../../../planos/encerrados/2026-10-14-familias-de-desenho.md), em 2026-10-14. O
[desenho](lateral.desenho.json) descreve a vista lateral da carcaça com as onze partes do
[contorno da referência](../../empilhadeira-2026-10-09/referencias/carcaca_lateral.contornos.json) que entram no modelo, com os
mesmos nomes e no sistema dele: milímetro, h para a direita e v para cima, a base em v = 0 e a ponta do paralama em h = 0. A
parte `entalhe` da referência, que fica fora do modelo e tem 3 mm², não foi desenhada. Há uma décima segunda parte, `vaoTraseiro`,
um círculo marcado fora do modelo que só serve de referência para as tangências do arco traseiro (ver o que faltou ao módulo). O
desenho foi escrito do zero vendo a imagem, o mapa de partes e o contorno, sem partir do desenho da prova anterior, porque as
partes dele (o degrau e o bloco) não correspondem às regiões da referência e faltavam o aro, o encosto, o painel, o suporte e a
longarina. São 68 pontos, 137 relações e 12 partes, e o desenho resolve com zero grau de liberdade e sem aviso. O comando gravou
ao lado o [contorno](lateral.contornos.json) e a [vista em traço](lateral.png).

## A razão

A razão passou de 0,95 na primeira rodada. Houve três rodadas do comando, cada uma resolvendo o desenho e medindo a razão geral e
a de cada parte. A segunda e a terceira mudaram só relações, com a mesma geometria: a segunda trocou as posições medidas da frente
ou do chão por medidas a partir das partes vizinhas (perna do arco traseiro, frente do capô, face da frente, base do capô, piso),
e a terceira corrigiu a amarração das costas do encosto, que o teste de variantes descrito abaixo mostrou estar errada. Fora da
contagem, rodei o comando doze vezes em cópias fora desta pasta, para testar o raio exato do arco traseiro e as variantes.

A razão final contra a união das partes é 0,9941 sem alinhar e 0,9943 pela melhor translação, com deslocamento de 0,2 mm; pela
silhueta, 0,9954. As áreas são 1.117.574 mm² na referência e 1.117.406 mm² no desenho.

| parte | sem alinhar | melhor translação |
|---|---|---|
| lateral | 0,9930 | 0,9931 |
| capo | 0,9882 | 0,9882 |
| encosto | 0,9874 | 0,9878 |
| piso | 0,9820 | 0,9827 |
| contrapeso | 0,9723 | 0,9726 |
| painel | 0,9636 | 0,9641 |
| tampa | 0,9627 | 0,9632 |
| paralama | 0,9326 | 0,9461 |
| longarina | 0,9314 | 0,9324 |
| suporte | 0,9181 | 0,9375 |
| aro | 0,8993 | 0,9068 |

Rasterizando os dois a 1 mm, o desenho deixa de cobrir uns 3.000 mm² da referência e tem uns 3.200 mm² fora dela. Um terço disso
fica atrás de h = 2100: a traseira do contrapeso tem ressaltos de até 11 mm para fora e para dentro (os batentes), que o desenho
faz como uma reta só na posição média, e a face de trás do capô é levemente curva. O resto se espalha em desvios de 1 a 3 mm ao
longo do contorno, na ordem do pixel da referência (2,16 mm). As partes finas têm a razão mais baixa porque esse pixel é uma
fração grande delas: o paralama tem 22 mm de espessura, a longarina 16 e o aro de 20 a 22. O aro perde também porque a borda de
fora dele na referência oscila uns 5 mm em volta do círculo, e porque a ponta de baixo vai até v = 150 no desenho e até v = 178
na referência.

## As medidas que mandam

O desenho tem 57 distâncias, 18 ângulos e um raio; as outras relações são de direção, de pertinência e de tangência. Só 18 das
distâncias medem a partir do chão, da frente ou da traseira, e delas e do raio do arco traseiro saem as medidas que um parâmetro
de família mudaria, na tabela abaixo; as outras ficam presas às partes vizinhas e acompanham. A traseira é uma referência vertical em h = 2150, de modo que o comprimento total é o valor dela.

| medida | valor | onde entra |
|---|---|---|
| comprimento total | 2150 mm | referência `traseira`, onde acabam o capô, o contrapeso (8,4 mm antes) e a tampa (19,5 mm antes) |
| altura total | 852,6 mm | topo da frente da tampa |
| avanço do paralama | 204 mm | posição da face da frente; o arco dianteiro, o aro, o piso, o encosto e o pé da rampa medem a partir dela |
| altura da face da frente | 500 mm | base do paralama e começo do aro |
| arco dianteiro | topo a 316,5 mm, vão de 226,1 mm, raio 211,3 mm | canto reentrante arredondado da lateral |
| aro | raio de dentro 346 mm, de fora 354,8 mm, 22 mm no alto e 20,4 mm no fim | canto da lateral e o aro em L |
| pés dos arcos | 24 mm | saias da lateral e base do contrapeso; a soleira entre eles fica no chão |
| arco traseiro | centro em h = 1661,4 e v = 129,8, raio 231,6 mm | as duas pernas tangentes; a lateral sai dele 170,2 mm depois da perna da frente e o contrapeso 142 mm antes da de trás |
| chão do posto | 241 mm | fundo da lateral entre o aro e a rampa |
| rampa | pé a 606,2 mm da face, 34,35° por 324,5 mm e depois 39,5° | topo da lateral sob o piso e o encosto |
| topo da lateral | 650 mm | fim da rampa e base do painel |
| capô | frente 136,5 mm depois da perna dianteira do arco traseiro, base 384 mm, topo 821,6 mm | a tampa, o painel e o contrapeso se medem a partir dele |
| piso | 475 mm | nível do piso; o encosto assenta 8 mm abaixo |
| encosto | 706,6 mm na frente e 767 mm atrás, 623 mm depois da face | o degrau do painel fica 10 mm abaixo do alto dele |
| topo do painel | 841,2 mm | entre o encosto e a tampa |

Os ângulos (as duas rampas, o anteparo a 77°, a descida do piso a 30°, o chanfro do encosto a 54°, o ombro e a descida do capô a
19,4° e 70°, a traseira da tampa a 69°) e os raios dos cantos são o estilo da carcaça, e numa família ficariam com faixa
estreita. Para conferir que o resto acompanha, mudei numa cópia a traseira para 2300, o arco traseiro para h = 1700 e a rampa
baixa para 38°, um de cada vez e os três juntos: os quatro resolvem com o chute original, e a vista em traço continua coerente
(o capô e o contrapeso alongam, o painel estica entre o encosto e o capô). Na versão da segunda rodada, o arco e a rampa davam
"não convergiu", porque as costas do encosto estavam presas à frente do capô e ao cruzamento de uma reta a 47° com a rampa a
39,5°, quase paralelas; agora o fim das costas fica a 9,5 mm do alto da rampa e o comprimento do encosto parte da frente dele.
A razão não teria visto essa falha, porque a geometria era a mesma; quem a pega é a prova nos extremos que a fatia 4 prevê, e
o contrato da fatia 3 deve pedi-la também para a peça de desenho.

## As formas que se repetem

O arco de roda recortado é um canto reentrante de polígono com raio: na lateral, o arco dianteiro sai da face, desce até o pé e
termina numa saia a 24 mm do chão. Os parâmetros são a altura do topo, o vão a partir da face, o raio e a saia.

O arco de roda com aro junta duas coisas no mesmo vértice: a lateral tem um canto convexo de raio 346 que faz a borda de dentro,
e o aro é um polígono em L que reaproveita esse vértice como canto reentrante e tem o canto de fora com raio 354,8, de centro
deslocado, o que afina o aro de 22 mm no alto para 20,4 no fim. A lateral fica à frente do aro e recorta a ponta dele. Os
parâmetros são o canto, o raio de dentro, as duas espessuras e a ponta.

O vão de roda com pernas tangentes é um círculo de centro e raio dados, com uma perna a prumo tangente de cada lado; cada parte
que o cerca sai do círculo numa posição dada pela tangente (o raio até o ponto de saída perpendicular à aresta), e o canto entre
a perna e essa aresta tem o raio do círculo, o que reproduz o arco exato. Entre as duas saídas fica o recorte sob o capô, e a
longarina fecha o vão por baixo. O arco dianteiro também caberia nessa forma, e daria o centro da roda como ponto para medir o
entre-eixos.

A rampa com ombro aparece três vezes: na lateral (chão, concordância de raio 100, rampa a 34,35°, quebra, rampa a 39,5°,
concordância de 30 e topo), no piso (anteparo, descida a 30° e concordância de 150 até o nível) e na traseira do capô (face,
ombro a 19,4°, canto reentrante de 20, descida a 70° e concordância de 80 até o topo). Os parâmetros são as alturas de baixo e de
cima, o pé, os ângulos dos trechos e os raios das concordâncias.

O bloco com chanfro de canto é um retângulo com um canto trocado por um chanfro e os cantos arredondados: o encosto (frente reta,
chanfro a 54°, topo levemente inclinado e uma subida no fim), a tampa (frente a prumo, topo a 4°, traseira a 69°) e o capô. A
base com saia e soleira (pés a uma altura, soleira no chão com chanfros nas pontas) é comum à lateral e ao contrapeso, e o
recuo de canto (o rebaixo do alto do contrapeso sob o capô) e o degrau (o do painel) são formas menores que se repetem nas outras
carcaças da lista de objetos. O paralama e a longarina são placas finas, a segunda já como barra.

## O que faltou ao módulo

Falta geometria de construção. O círculo do arco traseiro precisa existir para as pernas e as saídas serem tangentes a ele, e a
única forma de tê-lo é como parte com `foraDoModelo`; ele sai então como região `vaoTraseiro` no contorno, com um pedaço abaixo
do chão (v até −101,8), e aparece tracejado na vista. `npm run desenho --
docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/carcaca/lateral.desenho.json` lista o `vaoTraseiro` entre as partes
e o `lateral.contornos.json` o grava em `regioes`. Uma marca de construção, que entra no resolvedor e fica fora das regiões e da
vista, resolve.

O raio do canto não é relação. O `raioDoCanto` fica fora do resolvedor, e para o canto seguir o círculo do arco traseiro o valor
231,6 aparece três vezes (o raio do círculo e os cantos KT e KC); o raio do aro, 346, aparece na lateral, no aro e na distância de
346,5 do canto à face, com meio milímetro para a tangência caber. O encaixe exato funciona: com o raio do canto igual ao do
círculo e o ponto de tangência como vértice seguinte, o desenho resolve. Uma família precisa que o raio do canto possa vir de um
parâmetro ou de um círculo (`"raioDoCanto": { "KT": "vaoTraseiro" }`, por exemplo), e que o centro do canto possa ter nome, para
medir o entre-eixos a partir do centro do arco dianteiro. `grep -n '231.6\|346' lateral.desenho.json` mostra as repetições.

Falta distância só na horizontal ou só na vertical entre dois pontos. Para pôr um ponto a tantos milímetros de outro em h, foi
preciso uma reta a prumo que já existisse (a perna do arco, a frente do capô, a face, a frente do encosto) ou uma referência nova
(a traseira); `npm run desenho -- --ajuda` mostra que a `distancia` é entre pontos, em linha reta, ou de ponto a reta.

Quando a geometria pedida é impossível por um lado trocado entre duas retas, o comando diz que o resolvedor não convergiu e não
aponta relação. Foi o caso da segunda rodada com a rampa baixa a 38°, em que a reta das costas do encosto passava a cruzar a
rampa do outro lado do topo; achar a relação culpada exigiu refazer as contas à mão.

A razão por parte sai de uma chamada por parte, com `--parte-a` e `--parte-b`; foram onze chamadas por rodada. Uma opção que
liste todas as partes com nome comum aos dois arquivos de uma vez encurtaria a rodada.
