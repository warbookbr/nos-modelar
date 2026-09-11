---
name: alinhar-modelagem
description: Conduzir a rodada de alinhamento antes de modelar — levantar objeto, referências, escala, partes, contatos e critérios de reprovação com a pessoa, e sintetizar tudo no PLANO da receita. Use ANTES de escrever qualquer passo de uma peça nova. Não use para ajustar peça já modelada.
---

# Alinhar a modelagem antes de modelar

Esta skill existe porque o defeito mais caro deste projeto não foi geometria
errada: foi trabalho começado sem combinar o que seria feito. Um quadro de
bicicleta saiu com os balanços soltos no ar, um pneu saiu maciço sem aro, cubo
nem raios, e uma prancha torta foi declarada reta — todos com a mesma origem, a
de ninguém ter escrito antes o que a peça deveria ser. Medida nenhuma acusa
parte que nunca foi prometida.

O produto desta rodada é um arquivo, e não um acordo de conversa. Ele é o
`PLANO` exportado pela receita, validado por
[`src/autoria/plano-de-modelagem.js`](../../../src/autoria/plano-de-modelagem.js) e cobrado
por `npm run guarda:acervo`. Enquanto a combinação viver no diálogo, ela volta a
ser conselho, e conselho é ignorado sob pressão de terminar.

Uma rodada inteira já respondida está em
[`RODADA-DE-ALINHAMENTO-EXEMPLO.md`](../../../docs/mecanifica/usar/RODADA-DE-ALINHAMENTO-EXEMPLO.md):
as sete perguntas com as respostas de uma peça real, as decisões que não cabem
em campo nenhum, e as duas falhas que motivaram o plano a existir.

## Como conduzir

Pergunte na ordem abaixo, uma pergunta por vez, e escreva o que for sendo
decidido. Não avance com resposta vaga: "um quadro bonito" não é objeto, e
"tem que ficar certo" não é critério. Se a pessoa não souber, ofereça duas
opções concretas e deixe ela escolher.

Não comece a modelar no meio da rodada, nem proponha operações do motor: a
técnica de cada parte entra como descrição curta, e a escolha fina é do
modelador depois, com o plano na mão.

## Perguntas fixas

Valem para qualquer objeto, e o plano não fecha sem elas.

1. **Qual é o objeto, e qual módulo dele.** Peça inteira ou parte de um
   conjunto maior. Registre o recorte com todas as letras: um quadro de
   bicicleta é o módulo 1 de 5, e rodas, garfo, guidão e transmissão são peças
   próprias.
2. **Quais imagens de referência.** Caminhos dentro do repositório. Sem imagem,
   não há alvo, e a revisão vira gosto. Pergunte de que vista é cada uma.
3. **Qual medida dá a escala.** Uma medida real, em milímetros, que apareça na
   imagem e que todo o resto herde — o diâmetro de uma roda, a largura de uma
   porta, a altura de um degrau. Sem ela, a peça sai proporcional a nada.
4. **Que partes existem, e como cada uma se chama.** O nome é o mesmo que vai
   no passo `parte` da receita e o mesmo que a medida devolve: letras e
   dígitos, sem espaço nem acento. Nome diferente aqui e lá produz parte
   "ausente" a cada conferência.
5. **Que forma cada parte tem, e por qual técnica.** Uma frase que um estranho
   entenda — "tubo achatado e arqueado, da caixa até o tubo de direção" — e a
   técnica em duas ou três palavras.
6. **Que pares devem se tocar, e por quê.** Esta é a lista que vira `contatos`
   na receita, com motivo escrito. Ela é cobrada por medida: par declarado que
   não se toca reprova, e par que se toca sem ter sido declarado também.
7. **O que faz reprovar este objeto.** Defeitos que um revisor deve procurar
   nesta peça específica, cada um em uma frase verificável olhando a
   referência. "Balanços assimétricos entre o lado esquerdo e o direito"
   serve; "ficou feio" não.

## Perguntas que dependem da família

Traga só as que se aplicam, e diga por que está perguntando.

- **Estrutura tubular** (quadro, chassi, treliça, grade): que ângulos precisam
  bater com a referência, onde há simetria bilateral, e que tubo é o mais largo
  ou mais fino do conjunto.
- **Casca ou carenagem** (carroceria, capô, painel): qual é a silhueta em cada
  vista, onde há aberturas, e quais painéis se encontram em qual linha.
- **Mecanismo** (articulação, suspensão, transmissão): o que gira em torno de
  quê, qual é o curso de cada movimento, e o que não pode se tocar em nenhuma
  posição.
- **Marcenaria e mobiliário**: que junta une cada par, qual face é vista, e
  onde a espessura do material manda na forma.

## Fechando a rodada

Escreva o `PLANO` na receita, com os campos `objeto`, `referencias`, `escala`,
`partes` e `criteriosDeReprovacao`, e a lista de `contatos` ao lado. Depois rode
`npm run guarda:acervo` e mostre o resultado: plano inválido ou incompleto
reprova ali, antes de existir geometria, que é o barato deste momento.

Leia em voz alta para a pessoa o que ficou escrito e pergunte se é isso. Plano
combinado e não conferido é a mesma coisa que plano nenhum.

## O que esta skill não faz

Não escreve passo, não escolhe operação do motor e não julga resultado. Quem
modela lê o plano e escreve a receita; quem julga recebe a referência, o
resultado e os critérios daqui, sem saber como a peça foi construída. Se você
conduziu a rodada, não é você quem aprova o que sair dela.
