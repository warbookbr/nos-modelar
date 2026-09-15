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

Nada disso escreve parâmetro. `Descartar` devolve a peça ao que veio do arquivo;
`Salvar ajuste` baixa um `ajuste-<peça>.json`.

## O que o arquivo salvo contém

Nome de cada parte com os dois cantos da caixa que ela passou a ocupar, a
tolerância de aceite, e a lista de juntas puxadas com o deslocamento de cada uma.
Não contém vértice, face, id interno nem posição de passo: a identidade ali é o
nome da parte e o nome da junta, que é formado pelos nomes das partes que se
encontram nela.

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
