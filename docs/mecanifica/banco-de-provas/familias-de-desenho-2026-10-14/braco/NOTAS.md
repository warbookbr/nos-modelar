# Braço robótico, vista lateral: o desenho por restrições ajustado à referência

Fatia 2 do plano [as famílias de desenho](../../../planos/encerrados/2026-10-14-familias-de-desenho.md), em 2026-10-14. O
[desenho](lateral.desenho.json) descreve a vista lateral do braço com as 14 partes do
[contorno da referência](../../../../../procedural/pecas/braco-robotico/referencias/lateral-sem-cabo.contornos.json), com os
mesmos nomes e no sistema dele: milímetro, h para a direita e v para cima, o chão na face de baixo da chapa da base (v = −5) e o
eixo da base no meio do corpo dela (h = 0). Foi escrito do zero vendo a imagem, o mapa de partes e o contorno, porque as partes
do desenho da prova anterior não correspondiam às regiões da referência. São 52 pontos, 104 relações e 14 partes, e o desenho
resolve com zero grau de liberdade e sem aviso. O comando gravou ao lado o [contorno](lateral.contornos.json) e a
[vista em traço](lateral.png).

## A razão

A razão passou de 0,95 na primeira rodada. Houve três rodadas do comando, cada uma resolvendo o desenho e medindo a razão; a
segunda e a terceira só reescreveram relações sem mudar a geometria: a ponta do braço passou a ter o raio igual à meia largura
dela (86 mm, semicírculo exato), e as alturas da coluna de cima e do antebraço deixaram de ser medidas do chão e passaram a ser
medidas a partir dos eixos das juntas. A razão final contra a união das partes é 0,9555 sem alinhar e 0,9560 pela melhor
translação, com deslocamento de 0,4 mm; pela silhueta, 0,9780. Por parte:

| parte | sem alinhar | melhor translação |
|---|---|---|
| base | 0,9607 | 0,9626 |
| caixaLateral | 0,9718 | 0,9772 |
| anelCintura | 0,8609 | 0,8763 |
| ombro | 0,8113 | 0,8117 |
| braco | 0,9681 | 0,9685 |
| anelCotovelo | 0,8886 | 0,9149 |
| cotovelo | 0,9532 | 0,9539 |
| juntaCotovelo | 0,6724 | 0,6746 |
| anelAntebraco | 0,9481 | 0,9498 |
| antebraco | 0,9593 | 0,9659 |
| carcacaPunho | 0,9511 | 0,9545 |
| aneisPunho | 0,8968 | 0,9130 |
| garfoPunho | 0,9664 | 0,9702 |
| flange | 0,8671 | 0,8718 |

O que segura a razão geral são as costuras. A referência tem 292.736 mm² e o desenho 304.391 mm²; o desenho deixa de cobrir
cerca de 970 mm² da referência e tem cerca de 12.600 mm² fora dela. Rasterizando os dois a 0,5 mm, uns 8.700 mm² desse excesso
caem nas costuras de 3 a 6 mm que o contorno da imagem deixa sem dono entre regiões vizinhas (anel e corpo, braço e ombro, junta
e anel), e que a união das partes conta como vazio; um desenho de partes que se tocam as preenche, e por isso o teto da razão
pela união das partes, para esta referência, fica perto de 0,97. O erro de forma propriamente dito é de uns 2.800 mm² fora e 800
mm² dentro, e a maior parcela é a flange (uns 600 mm²), desenhada como cápsula onde a imagem mostra o disco visto um pouco de
cima, que é uma elipse. As partes finas têm a razão mais baixa porque a costura é uma fração grande delas: a juntaCotovelo tem 25
mm de largura com costura dos dois lados e, no desenho, leva também a faixa de v 941 a 958 que a referência dá ao cotovelo; o
anelCintura e o anelCotovelo têm cerca de 50 mm de altura com costura em cima e embaixo. O ombro é a faixa em U visível em volta
da ponta do braço: perde a costura entre os dois e a ponta do braço, concêntrica com o meio do ombro, desce 5 mm abaixo da ponta
da referência.

## As medidas que mandam

O desenho tem 47 relações com medida em milímetro, com 33 valores distintos, e 7 espessuras de barra; o resto são relações de
direção, de pertinência e uma igualdade. As medidas que um parâmetro de família mudaria são nove, e as outras são detalhe que pode
ficar como proporção delas.

| medida | valor (mm) | onde entra |
|---|---|---|
| altura da base | 236 | do chão ao topo do corpo da base |
| diâmetro da coluna de baixo | 206, 200 e 197 | corpo da base, anel da cintura e ombro, no eixo da base |
| altura do ombro | 181 | a junta do ombro fica no meio dele, a 377,5 mm do chão |
| comprimento do braço | 509,5 | da junta do ombro ao eixo do antebraço |
| diâmetro da coluna de cima | 175,5 | anel do cotovelo, cotovelo e topo do braço, recuada 9,25 mm à esquerda do eixo da base |
| comprimento do antebraço | 636 | do eixo da base ao eixo do punho |
| diâmetro do antebraço | 130 | o tubo; a junta e o anel do antebraço têm 152 |
| largura do punho | 110 | anéis do punho; garfo de 102, pescoço de 56 e flange de 160 |
| altura do punho | 250 | do fundo da carcaça à face de baixo da flange: anéis 81, garfo 102, pescoço 26, flange 41 |

Os detalhes amarrados a elas são a chapa da base (28 de espessura, passando 12 de cada lado), a caixa lateral (64,5 por 208, a
24 do chão e avançando 13 sobre a base), a altura do anel da cintura (51) e do anel do cotovelo (52, começando 134 abaixo do eixo
do antebraço), o topo do cotovelo (113 acima do eixo do antebraço, cantos de raio 32), o braço (recuo de 6,5 na saída do ombro e
de 10,5 antes do alargamento, que vai de 45 a 20 abaixo do anel do cotovelo), a junta e o anel do antebraço (30,5 e 72 de
largura) e a carcaça do punho (295 de comprimento, 66 acima e 68 abaixo do eixo, ponta de raio 66 em volta do eixo do punho e
cantos de raio 58 e 30). Três proporções se repetem e servem de partida para a faixa da família: a ponta do braço e a ponta da
carcaça têm raio igual à meia largura ou meia altura delas, o anel do antebraço passa 11 mm do tubo de cada lado, e a coluna de
cima tem 0,89 do diâmetro do ombro.

## As formas que se repetem

Seis das 14 partes são o mesmo tambor num eixo, uma barra entre dois pontos do eixo com a espessura igual ao diâmetro: o
anelCintura e o ombro na coluna, a juntaCotovelo, o anelAntebraco e o antebraco no eixo do antebraço, e os aneisPunho no eixo do
punho. Cada um começa onde o anterior termina, e a coluna inteira é uma pilha de tambores coaxiais descrita por uma lista de
alturas e diâmetros; essa pilha é a peça de desenho mais reutilizável do braço.

A ponta concêntrica com a junta aparece duas vezes: a ponta de baixo do braço é um semicírculo de raio 86 com centro na junta do
ombro, e a ponta direita da carcaça do punho é um arco de raio 66 com centro no eixo do punho. Como peça, é um elo com uma ponta
arredondada cujo centro é o ponto da junta, que outras partes usam como eixo. O braço é ainda um elo afunilado com alargamento,
que estreita da saída do ombro até perto do cotovelo e alarga até a largura da coluna de cima.

O cotovelo e a caixa lateral são o retângulo com só os cantos de uma ponta arredondados, que é o bloco de junta. O garfo do punho
com o pescoço e a flange formam a flange com cubo, um disco com um cubo mais estreito em cima, simétricos em torno do eixo do
punho, e a flange sozinha é a cápsula. A base é um corpo sobre uma sapata mais larga por um ressalto fixo, com os cantos de baixo
arredondados.

## O que faltou ao módulo

Falta parâmetro com nome. Uma mesma medida aparece escrita em mais de um lugar: o raio 86 da ponta do braço em três distâncias e
no `raioDoCanto`, o raio 66 da ponta da carcaça no `raioDoCanto` e na distância da ponta ao eixo do punho, e cada meia largura
duas vezes, uma de cada lado. Para a família, cada medida precisa ser um nome lido em todos esses lugares. Acrescentar
`"parametros": {"raioDaPontaDoBraco": 86}` na raiz do desenho e rodar `npm run desenho -- <desenho> --so-relatorio` dá
`campo desconhecido "parametros" na raiz`.

Falta a relação de simetria. A base, o braço, o garfo, o pescoço e a flange são simétricos em torno de um eixo, e cada par de
pontos pede duas distâncias com `lado` e o mesmo número. O planegcs tem a restrição de ponto simétrico em torno de uma reta
(`p2p_symmetric_ppl`), que o módulo não expõe: a relação `{"nome": "garfo simétrico", "simetrico": ["GH", "GG", "aneisPunho"]}`
é recusada com `campo desconhecido "simetrico"`.

Falta o centro do canto arredondado. O `raioDoCanto` não passa pelo resolvedor e não tem ponto de centro, e por isso a ponta da
carcaça concêntrica com o eixo do punho só se escreve repetindo o raio numa distância, e o semicírculo da ponta do braço pede três
distâncias iguais ao raio. Um ponto de centro do canto, ou uma relação de concentricidade entre o canto e um ponto, tiraria a
repetição e deixaria a junta como o ponto que manda.

A espessura da barra fica fora do resolvedor, como o README do módulo diz, e nenhuma relação a lê nem usa o lado da barra como
reta. Não se escreve que o anel tem a largura do cotovelo, e a coluna de cima (topo do braço, anel do cotovelo e cotovelo) teve de
ser feita de polígonos com pontos compartilhados para as larguras ficarem amarradas. O `raioDoCanto` da barra arredonda os quatro
cantos, e o cotovelo, arredondado só em cima, também virou polígono.

Falta a elipse. A flange é um disco visto um pouco de cima e é a parte com o maior erro de forma; o planegcs tem a elipse, e a
parte `{"elipse": {"centro": "L1"}}` é recusada com `campo desconhecido "elipse"`.

A razão pela união das partes conta como vazio a costura de 3 a 6 mm entre regiões vizinhas da referência, e a ferramenta não
tem como fechar as costuras mais estreitas que uma largura dada antes de medir, nem o contorno da imagem as dá a uma das vizinhas.
O efeito aparece em `npm run desenho -- razao procedural/pecas/braco-robotico/referencias/lateral-sem-cabo.contornos.json
docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/braco/lateral.contornos.json`, que dá 0,9555 pela união das partes
e 0,9780 pela silhueta, e no `--parte-a=juntaCotovelo --parte-b=juntaCotovelo`, que dá 0,67 a uma parte de 25 mm com costura dos
dois lados. O processo só mostra isso porque a razão imprime a outra medida ao lado; a decomposição do excesso entre costura e
forma foi feita por rasterização fora da ferramenta.

## Como refazer

```bash
npm run desenho -- docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/braco/lateral.desenho.json
npm run desenho -- razao procedural/pecas/braco-robotico/referencias/lateral-sem-cabo.contornos.json docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/braco/lateral.contornos.json
npm run desenho -- razao procedural/pecas/braco-robotico/referencias/lateral-sem-cabo.contornos.json docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/braco/lateral.contornos.json --parte-a=ombro --parte-b=ombro
```
