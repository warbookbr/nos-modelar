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
as perguntas fixas com as respostas de uma peça real, as decisões que não cabem
em campo nenhum, e as duas falhas que motivaram o plano a existir.

## Como conduzir

Pergunte na ordem abaixo, uma pergunta por vez, e escreva o que for sendo
decidido. Não avance com resposta vaga: "um quadro bonito" não é objeto, e
"tem que ficar certo" não é critério. Se a pessoa não souber, ofereça duas
opções concretas e deixe ela escolher.

Não comece a modelar no meio da rodada, nem proponha operações do motor: a
técnica de cada parte entra como descrição curta, e a escolha fina é do
modelador depois, com o plano na mão.

## Antes das partes: leia a referência junto com a pessoa

Abra as imagens com `Read` e olhe você mesmo. A skill não mandava isso, e o
resultado foi um plano escrito sem ninguém ter enumerado o que a foto mostra.

Percorra a imagem e diga em voz alta o que vê, corpo por corpo, e peça à pessoa
que corrija e complete. **Todo corpo que se distingue na referência vira parte
declarada.** Num braço robótico, os anéis escuros entre carcaças são corpos
próprios e salientes, e não pintura; num plano que não os enumerou eles viraram
degrau entre cilindros, o objeto perdeu o que o fazia ler como robô, e nenhuma
medida acusou porque parte não prometida não é cobrada.

Enumere também o que não é estrutura e aparece: cabo externo e suas presilhas,
caixa de motor colada à base, tampa aparafusada. Se for ficar de fora, que fique
por decisão escrita, e não por ninguém ter reparado.

Depois confira a orientação de cada extremidade contra a imagem, e não contra o
que parece natural. O flange de ferramenta deste acervo foi declarado saindo
reto na ponta do antebraço, e na referência ele pende para baixo, porque o punho
dobra.

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
5. **Qual o grau de realismo, e você diz o que vê antes de perguntar.** Olhe a
   referência e proponha: "vejo carcaça de superfície dura, com aresta quebrada
   e anel de junta saliente, e não volume simples de poucas faces". Ofereça duas
   opções concretas — silhueta correta com volumes simples, ou todos os corpos
   visíveis da referência com aresta trabalhada — e deixe a pessoa escolher. A
   resposta governa a próxima pergunta: pedir realismo e declarar técnica de
   volume simples produz o objeto quadrado que a técnica pediu, e foi o que
   aconteceu aqui.
6. **Que forma cada parte tem, e por qual técnica.** A frase de `forma`
   responde três coisas, sempre: se o corpo é revolução ou perfil varrido, onde
   a seção varia ao longo dele, e onde a aresta é quebrada. A técnica tem de
   corresponder ao grau de realismo combinado, e sai de duas ou três palavras.

   Ruim: `forma: 'carcaça do braço'`, `tecnica: 'cilindro com tampas'`. Não diz
   nenhuma das três, e produziu uma caixa onde a referência mostra volume
   arredondado.

   Bom: `forma: 'perfil varrido na vertical, seção retangular que afina de 130
   para 90 de largura do ombro ao cotovelo, arestas longitudinais em raio de
   18'`, `tecnica: 'loft de superelipse com aresta arredondada'`.

   **Corpo que se repete é família, e não seis frases iguais.** As seis juntas
   deste braço são o mesmo disco saliente entre duas carcaças, e declarar seis
   vezes a mesma coisa convida a seis resultados diferentes. Diga uma vez como a
   família é e quantas instâncias existem, e deixe a receita parametrizar.
7. **Que pares devem se tocar, e por quê.** Esta é a lista que vira `contatos`
   na receita, com motivo escrito. Ela é cobrada por medida: par declarado que
   não se toca reprova, e par que se toca sem ter sido declarado também.
8. **O que faz reprovar este objeto.** Defeitos que um revisor deve procurar
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

A peça nasce como PASTA, e não como arquivo solto. Crie o diretório com a
receita e as imagens dentro, e copie para lá as referências que a rodada
escolheu:

```
prototipos/procedural/v3/pecas/<peça>/
  receita.js
  referencias/
    sobreposicao.jpg     ← a que a bancada põe sobre o modelo
    lateral.png          ← os recortes de conferência
```

Peça em arquivo solto reprova em `npm run guarda:acervo`, e reprova por um
motivo prático: o material dela — referências, âncoras e as rodadas do laço —
não tem onde morar junto, e volta a se espalhar por quatro árvores do
repositório.

Escreva o `PLANO` na receita, com os campos `objeto`, `referencias`, `escala`,
`partes` e `criteriosDeReprovacao`, e a lista de `contatos` ao lado. As
referências são declaradas RELATIVAS à pasta da peça, como no exemplo de árvore
acima, e a chamada `sobreposicao` é a que a bancada mostra sobre o modelo. Depois
rode `npm run guarda:acervo` e mostre o resultado: plano inválido, referência
declarada que não existe e peça fora da pasta reprovam ali, antes de existir
geometria, que é o barato deste momento.

Leia em voz alta para a pessoa o que ficou escrito e pergunte se é isso. Plano
combinado e não conferido é a mesma coisa que plano nenhum.

## O que esta skill não faz

Não escreve passo, não escolhe operação do motor e não julga resultado. Quem
modela lê o plano e escreve a receita; quem julga recebe a referência, o
resultado e os critérios daqui, sem saber como a peça foi construída. Se você
conduziu a rodada, não é você quem aprova o que sair dela.
