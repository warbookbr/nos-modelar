# Referência por medida e rodadas fora do laço

Consulta da skill [criar-peca](../SKILL.md): o que se confere antes de modelar uma parte de um conjunto, e o que se faz depois
de três rodadas sem acerto. Origem: o selim, o garfo e o pedal da `bicicleta-urbana`, em 2026-11-16.

## Antes de modelar uma parte

Antes de modelar cada parte, confira a referência dela por medida, e não por
impressão:

1. Meça quantos pixels a parte ocupa na imagem. Abaixo de uns 300 px no lado
   maior, peça à pessoa uma imagem de perto da parte; com menos que isso a forma
   é adivinhada (o pedal da bicicleta tinha 100 por 50 px, e três rodadas
   modelaram uma peça que não era a da foto).
2. Escreva o que vê na parte, peça por peça (o que é aberto e o que é maciço,
   as bordas, quantos furos, pinos ou nervuras), e só modele depois que a pessoa
   confirmar ou corrigir. Não responda a si mesmo se consegue ler os detalhes: a
   descrição escrita é o teste.
3. Diga quais vistas a referência mostra e quais faltam para a forma da parte.
   O que nenhuma vista mostra fica escrito como suposição, ou se pede outra
   imagem.
4. Confirme que a imagem mostra a mesma peça que a pessoa quer, e não uma
   parecida.

1. Na primeira tentativa, pergunte à pessoa se o que vai ser modelado é um
   conjunto e, se for, se é complexo. Num conjunto complexo, sugira trabalhar
   cada parte isolada na bancada (`--selecionadas=<parte> --modo=isolar
   --focar` em `npm run bancada` e `olhar-bancada`), comparada sozinha com o
   recorte dela na referência, quando isso ajudar a focar na parte que está
   sendo modelada; no conjunto inteiro a parte pequena some e o defeito dela
   passa.
2. A forma de uma parte sai das medidas da referência (contornos e perfis
   tirados da imagem, em milímetros, pela régua de uma medida conhecida), e
   não de curvas inventadas ajustadas a olho.


## Rodadas fora do laço

Um ajuste de forma feito fora do laço de modelagem, em conversa com a pessoa,
também conta rodadas: cada versão mostrada é uma. Antes de mostrar, passe as
vistas pelo `critico-visual` cego, com a referência. Depois de três rodadas na
mesma parte sem nota 8 do crítico ou sem o sim da pessoa, pare e consulte a
pessoa com o registro das três, em vez de tentar a quarta.

A consulta traz o diagnóstico, respondido por medida, antes da pergunta se
segue:

1. Quantos pixels a parte ocupa na referência; abaixo de uns 300 px no lado
   maior, a recomendação é pedir uma imagem de perto.
2. A descrição escrita da parte, peça por peça, que a pessoa confirma ou corrige.
3. Quais vistas faltam na referência e o que foi suposto por isso.
4. Se a referência mostra a mesma peça que a pessoa quer.
5. Se a forma saiu de medidas da referência ou de ajuste a olho.
6. Se as notas do crítico oscilaram entre rodadas que mudaram pouco; se sim, ele
   julgou sem medida, e o pacote seguinte leva o contorno medido e vai pelo
   pedido fechado nas duas ordens, com a nota de `vistas-para-critica.mjs --juntar`
   ([comparar-com-a-referencia.md](comparar-com-a-referencia.md#o-pacote-do-crítico)).

A recomendação segue o primeiro item que falhou, na ordem da lista.

