---
name: absorver-ajuste-da-bancada
description: Transformar um ajuste que a pessoa fez na bancada em receita organizada — ler o alvo salvo, reescrever TABELA, derivar e gerarPassos, e provar por medida que a receita reexecutada chega onde a peça ficou. Use quando receber um arquivo `ajuste-*.json` ou quando a pessoa disser que mexeu na bancada e salvou. Não use para modelar peça nova nem para ajuste que ela pediu por escrito sem tocar na bancada.
---

# Absorver o ajuste da bancada

O contrato desta rodada — o que o arquivo salvo contém, por que a tolerância é
meio milímetro e o que `ORIGENS` exige — está em
[`docs/mecanifica/usar/AJUSTE-DA-BANCADA.md`](../../../docs/mecanifica/usar/AJUSTE-DA-BANCADA.md).

A bancada é o espaço da pessoa e a receita é o que a IA lê. Esta rodada é a
tradução entre os dois, e ela existe porque as duas coisas brigavam: para a
receita continuar legível, todo gesto tinha de cair num parâmetro nomeado no
instante do arrasto, e num quadro em treliça nenhum parâmetro empurra um tubo
inteiro sem descolar as juntas. Agora a pessoa arrasta os cantos livremente, e
quem organiza é esta rodada, depois, com tempo de perguntar.

O que chega até você não é malha. É um arquivo com o nome de cada parte, os dois
cantos da caixa que ela passou a ocupar, e a lista de juntas que a pessoa puxou.
O que sai é a receita reescrita, sem nenhum resíduo do gesto.

## O que é proibido

Não escreva id de vértice, índice de array nem posição de passo no arquivo
salvo. Se o ajuste só puder ser expresso assim, a rodada para e você diz isso à
pessoa — não invente uma camada de correções por cima da receita.

Não afrouxe a tolerância para uma rodada passar. Ela é meio milímetro porque a
tabela é medida em milímetro inteiro; se o ajuste não couber nela, quem muda é a
receita.

Não acrescente parâmetro sem dizer de onde ele veio. `ORIGENS` é conferido pelo
gate `origens:check`, e é o que impede a tabela de virar uma lista de termos
inventados para fechar a conta.

## Fluxo

1. Meça onde a receita está hoje em relação ao que a pessoa deixou:

   ```bash
   npm run absorver -- <ajuste.json>
   ```

   A saída diz, parte por parte, quanto o centro e as dimensões estão fora, em
   milímetro, e marca com `->` quem não cabe na tolerância. Comece lendo os
   gestos no topo: eles dizem quais cantos a pessoa puxou e para onde.

2. Decida o que cada gesto significa na receita. Um mesmo deslocamento costuma
   ter mais de uma leitura — puxar a ponteira 12 mm para trás pode ser balanço
   mais longo ou roda mais atrás, e as duas produzem a mesma malha. Quando duas
   leituras couberem na medida, **pergunte à pessoa**; quando só uma couber,
   resolva e diga qual escolheu.

3. Reescreva `TABELA`, `derivar` e `gerarPassos`. Prefira mexer em número que já
   existe. Parâmetro novo precisa de entrada em `ORIGENS` dizendo de onde ele
   saiu — medição, norma, padrão de fabricação.

4. Meça de novo com o mesmo comando até dar `CHEGOU`. Se as rodadas pararem de
   convergir, ou se acertar exigir termos sem significado físico, pare e leve o
   caso à pessoa: isso é o risco declarado no plano, não teimosia sua.

5. Olhe a peça. Medida dentro da tolerância não aprova forma:

   ```bash
   npm run bancada -- <peca> --vistas=isometrica,frontal,direita,superior --cores
   ```

6. Registre a rodada ao lado da peça, com o ajuste recebido, o que você entendeu
   de cada gesto, o que perguntou e o que a medida deu.

7. Rode os gates completos do INDEX antes de fechar.

## O que esta rodada não decide

Não decide se a forma ficou boa — quem aprova forma é a pessoa. Não decide
modelar peça nova: para isso vale `../criar-peca/SKILL.md` e o laço de
modelagem. E não trata de pedido escrito sem gesto na bancada, que é ajuste
comum de parâmetro.
