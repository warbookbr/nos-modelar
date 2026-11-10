---
name: esbocar-opcoes
description: Mostra à pessoa as opções de forma em disputa, lado a lado, feitas pelas operações da peça (esboço 2.0 ou variantes da receita), e pergunta qual se parece mais. Use quando houver escolha de forma. Não use para a peça final.
---

# Esboçar opções de forma

A pessoa entende forma vendo, e não lendo medidas. Sempre que o alinhamento ou
a modelagem chegar a uma escolha de forma (em pé ou deitado, encostado na face
ou na ponta, a ponta em bico ou arredondada), mostre as opções em imagem em vez
de descrevê-las em texto. As opções saem das operações do núcleo, as mesmas
que a peça usa, e por isso mostram o que a peça consegue ser. A referência dos
campos está no [README do esboço 2.0](../../../modulos/esboco-nucleo/README.md).

## Qual dos dois caminhos

Quando a peça já existe e a escolha é de valores (a espessura do tampo, o raio
da ponta, a altura do vão), declare as opções como variantes da receita: a
receita exporta `VARIANTES: [{ nome, nota, tabela: { chave: valor } }]`, cada
variante troca valores da `TABELA`, e `npm run variantes -- <peça>` roda a
receita com cada troca e junta as capturas numa imagem, com a mesma câmera. A
receita do acervo não muda, e a variante com os valores aceitos dá a mesma
malha de antes. O exemplo é a
[cópia de prova da mesa com três espessuras de tampo](../../../docs/modelar/banco-de-provas/esboco-pelo-nucleo-2026-11-05/mesa-com-variantes.js).

Quando a peça ainda não existe, ou a escolha é de forma e não de valor, escreva
um esboço do 2.0: cada opção é uma pequena receita do núcleo, com `passos`
crus (todo o catálogo, as gaiolas, `aberturaPorContorno`, as famílias por
`chamar`), `topo` com os pontos nomeados e o atalho `formas`, que posiciona
formas simples por relação. Rode `npm run esboco:nucleo -- <arquivo>`; o
arquivo é um `.esboco.json` ou um módulo `.mjs` cujo default é o esboço, para a
opção que precisa de código. O exemplo é
[`farol-na-chapa.esboco.mjs`](../../../docs/modelar/banco-de-provas/esboco-pelo-nucleo-2026-11-05/farol-na-chapa.esboco.mjs).
Os `.esboco.json` de opções de forma escritos antes do 2.0 abrem sem reescrita.

## Pare e planeje

Antes de escrever, decida por escrito, em um parágrafo curto por decisão, o que
está em disputa e o que fica igual em todas as opções, quantas opções (duas ou
três, cada uma com uma diferença que se vê), a vista que mostra a diferença e a
parte da peça que entra. Esboce só o que está em disputa. A opção que o núcleo
recusa, com o motivo, não é opção para a peça.

## O atalho de formas

O esboço é em milímetro. Cada forma tem `id` e o gerador, `op` e `args` de um
gerador do catálogo ou `ajudante` e `args` de uma gaiola, e a posição sai da
malha das outras, sem conta: `encosta: { id, lado }` leva a forma até tocar a
outra, `alinha: { "+z": "corpo" }` a deixa rente a uma face, `centro` aceita a
âncora `"corpo.+y"`, e `rotacao` com `pivo` gira na junta. `npm run
esboco:nucleo -- --ajuda` traz o resto e um exemplo.

## Conferir antes de mostrar

`--so-montar` monta e confere as receitas e imprime, por opção, as partes, a
caixa em milímetro e o relato de contatos, sem abrir a bancada; `--estrito`
recusa a travessia que a forma não declarou em `contato`.
Depois rode sem ele, abra a imagem com `Read` e confira que cada opção mostra a
diferença em disputa, que a câmera é a mesma (a ferramenta imprime onde a caixa
comum caiu em cada captura) e que nada foi cortado pelo quadro. Quando a
escolha é de medida, meça a malha (`--so-montar` dá a caixa; `npm run descrever`
dá o resto) em vez de confiar na imagem.
Rascunho que segue uma vista de referência: antes de mostrar, rode
`npm run leitura:regioes` e leve o `pedido.md` a um crítico.

## Como mostrar

Mostre à pessoa a referência e a imagem das opções juntas, uma frase curta por
opção dizendo o que muda entre elas, e termine com a pergunta "qual se parece
mais com o objeto?". A resposta vira decisão escrita no PLANO, como na skill
[alinhar-modelagem](../alinhar-modelagem/SKILL.md), e a variante escolhida vira
o valor da `TABELA`.
