<!-- AJUSTE-DA-BANCADA.md — contrato do gesto por junta e da rodada que o traduz em receita. -->
# Ajuste da bancada

A bancada é o espaço de quem desenha e a receita é o que a IA lê. Este documento
diz como uma coisa vira a outra sem que nenhuma das duas fique pior.

## Por que existe

Até setembro de 2026 a bancada exigia que todo gesto caísse num parâmetro
nomeado no instante do arrasto. Num quadro em treliça isso não alcança o que a
pessoa quer: cada tubo é definido pelos dois pontos de junta que ele liga, e não
existe número na `TABELA` que empurre um tubo inteiro sem descolar as juntas.
Medido na bicicleta, a seta do balanço esquerdo estava ligada ao comprimento do
balanço, que é compartilhado pelos quatro — arrastá-la esticava os quatro ao
mesmo tempo, e nenhum deles saía do lugar.

A saída foi separar os dois momentos. Durante o gesto ninguém precisa saber que
número existe; a tradução acontece depois, numa rodada com dono.

## O gesto: arrastar a junta

O botão `Juntas` na barra de cima desenha um punho em cada canto onde partes
diferentes se encontram. Na bicicleta são seis: as duas ponteiras traseiras, a
caixa do movimento central, o encontro dos balanços superiores no tubo do selim
e as duas soldas do tubo superior.

Arrastar um punho deforma só as partes que passam por aquele canto, presas na
outra ponta: o vértice sobre a junta anda o arrasto inteiro, o mais distante da
mesma parte não anda, e o meio anda proporcional à distância. Parte que não passa
pela junta fica exatamente onde estava.

O punho anda no plano que encara a câmera, porque o ponteiro tem duas liberdades
e o canto tem três. Para mexer na dimensão que ficou de fora, gire a câmera e
arraste de novo.

Nada disso escreve parâmetro. `Ctrl+Z` desfaz um arrasto de junta por vez, pelo
mesmo comando que desfaz a edição de malha, e para quando a peça volta ao que
veio do arquivo. `Salvar ajuste` baixa um `ajuste-<peça>.json`.

## Mover a parte inteira

Selecione a parte na cena e aperte `G`, sem entrar no modo de edição. A parte
anda como corpo: `X`, `Y` e `Z` travam o eixo, um número digitado dá o valor
exato, `Ctrl` gruda no vértice mais próximo que não está sendo movido, `Esc`
cancela, clique confirma e `Ctrl+Z` desfaz. É a mesma convenção do modo objeto
do Blender.

Por dentro é a mesma máquina do modo de edição, com a parte inteira selecionada e
os vértices escondidos. Por isso o que sai é o mesmo alvo medido, e a rodada de
absorção trata igual.

## O modo de edição: vértice, aresta e face

O gesto por junta move cantos inteiros. Para mexer na forma com liberdade, o modo
de edição é o caminho, e ele segue as teclas do Blender.

`Tab` entra e sai. Se houver partes selecionadas quando você aperta, a edição
vale só para elas — no quadro da bicicleta, o tubo do selim abre com 30 vértices
em vez dos 502 da peça inteira. Sem seleção, vale para tudo.

`1`, `2` e `3` trocam entre vértice, aresta e face, convertendo o que já estava
selecionado. Clique seleciona, `Shift`+clique soma, `Alt`+clique tira, `A`
seleciona tudo, `Alt`+`A` limpa, `L` pega a ilha conexa sob o ponteiro, e
arrastar abre caixa de seleção.

`G` move. `X`, `Y` e `Z` travam o eixo, um número digitado dá o valor exato, `Esc`
cancela e clique confirma. A seleção também traz um gizmo de três setas no
centro: arrastar uma seta faz o mesmo que o `G` com aquele eixo travado.

Segurar `Ctrl` durante o movimento liga o ímã, que gruda a seleção no vértice
mais próximo que não está sendo movido. Ele trabalha sobre o centro da seleção;
puxar cada vértice para o vizinho dele desmontaria a forma.

Dentro do modo o botão esquerdo pertence à seleção, então a câmera muda de botão:
o do meio gira e o direito arrasta. Sair devolve o padrão.

`Ctrl`+`Z` desfaz, parando no estado que veio do arquivo.

O que ainda não existe: extrudar, duplicar, apagar, criar geometria, rotacionar e
escalar. Todas mudam a topologia ou o número de partes, e a rodada de absorção
ainda não sabe reescrever receita que ganhou ou perdeu parte.

## Quando o botão de salvar aparece

Sempre que a malha na tela deixa de ser igual à que veio do arquivo, seja por
junta puxada, seja por vértice, aresta ou face editada no modo de edição. O
rodapé com o botão sobe sozinho nesse momento e some quando um Ctrl+Z devolve a
peça ao estado do arquivo.

## O que o arquivo salvo contém

Nome de cada parte com os dois cantos da caixa que ela passou a ocupar e a nuvem
de pontos que ela passou a ocupar, a tolerância de aceite, a lista de juntas
puxadas com o deslocamento de cada uma, o nome da receita de onde a peça veio, e
a descrição do gesto. Não contém vértice, face, id interno nem posição de passo:
a identidade ali é o nome da parte e o nome da junta, que é formado pelos nomes
das partes que se encontram nela.

## Ler o gesto antes de reescrever

O `absorver` responde se a receita chega onde a peça ficou. Antes dele vem a
pergunta do que a pessoa fez, e quem responde é:

```bash
npm run descrever:gesto -- <ajuste.json>
```

Ele diz, por parte, se o movimento é translação, rotação em torno de um eixo de
coordenada, escala, esticão com uma ponta presa, dobra, ou nenhum desses, com os
números de cada caso em milímetro e em grau. Junto vai o passo da receita que
constrói aquela parte, que é onde a reescrita vai mexer. Ele não reescreve nada
e não aprova nada, então não achar padrão não é falha: é resposta.

A descrição nasce na bancada, no instante do salvamento, porque ali as duas
malhas ainda têm os mesmos vértices e ninguém precisa descobrir qual virou qual.
Para um arquivo salvo antes disso existir, o comando reconstrói a descrição
emparelhando as duas nuvens de pontos por posição, e avisa que fez isso: quando
o movimento tem o tamanho do espaçamento entre os pontos, o emparelhamento fica
ambíguo e a resposta sai como "sem padrão". Medido na bicicleta, o anel do tubo
do selim tem dezoito lados a dezessete milímetros de raio, o que põe os pontos a
cinco milímetros e nove um do outro, e um gesto de seis milímetros já cai nesse
caso.

## A rodada de absorção

Quem traduz é a skill `absorver-ajuste-da-bancada`. O instrumento é:

```bash
npm run absorver -- <ajuste.json>
```

Ele reexecuta a receita, compara com o alvo parte por parte e diz em milímetro o
que está fora. Sai com código 1 enquanto não chega, que é o estado normal no
começo da rodada.

### Tolerância

Meio milímetro. Os números medidos da bicicleta são inteiros em milímetro — 502
de balanço, 17 de raio do tubo do selim, 622 de aro —, então um parâmetro inteiro
não consegue expressar nada mais fino que meio milímetro para cada lado. Exigir
menos seria reprovar a receita por uma casa que ela não tem como escrever. A
tolerância não é afrouxada para uma rodada passar: se o ajuste não couber nela,
quem muda é a receita.

### Intenção ambígua

Um mesmo deslocamento costuma ter mais de uma leitura. Puxar a ponteira 12 mm
para trás pode ser balanço mais longo ou roda mais atrás, e as duas produzem a
mesma malha e viram parâmetros diferentes. Quando duas leituras couberem na
medida, a rodada pergunta; quando só uma couber, ela resolve e diz qual escolheu.

## O que a rodada consegue absorver

A pergunta não é se a edição cabe nos números que a receita já tem — quase nunca
cabe. Medido na bicicleta, mover um vértice 5 mm e depois procurar o melhor
valor entre os vinte e nove parâmetros declarados chega a 2,531 mm de erro, cinco
vezes a tolerância. A rodada não procura número: ela reescreve `TABELA`,
`derivar` e `gerarPassos`.

O caso provado em teste é justamente um que nenhum número alcança. O triângulo
principal do quadro é simétrico no plano do meio, então nada na tabela desloca o
tubo do selim para o lado — é a mesma razão pela qual a bancada não desenha seta
de x naquela parte. Empurrando o anel de cima do tubo 6 mm em x, a receita como
está fica 6,000 mm fora; com um parâmetro novo ligado ao passo que constrói o
tubo, e com origem declarada, ela chega a 0,236 mm.

O limite real é outro: enquanto a edição não mudar topologia nem número de
partes, a reescrita é trabalho de escrita comum. Quando mudar, a rodada ainda não
sabe o que fazer.

## `ORIGENS`: de onde veio cada número

O risco da rodada é a deriva de parâmetro: acertar o alvo inventando termos até a
conta fechar, até a tabela não corresponder mais a nada que se possa medir no
objeto. `ORIGENS` é a declaração que segura isso — cada parâmetro diz de onde
saiu, seja medição, norma ou padrão de fabricação.

A adesão é opcional por receita, porque o acervo é anterior à regra; a completude
não é. Quem declara, declara todos os parâmetros e não deixa frase explicando
número que já saiu. `npm run origens:check` cobra isso, e a rodada de absorção
reprova parâmetro novo sem origem mesmo em receita que ainda não declara nada.

## Limite

O editor de malha completo — vértice, aresta, face, extrusão, duplicação — não
existe e está adiado de propósito. Enquanto o caminho de volta não estiver
provado, liberdade de edição só produz arquivo que não salva. Esta página cobre
o gesto por junta, que é o que hoje volta inteiro.
