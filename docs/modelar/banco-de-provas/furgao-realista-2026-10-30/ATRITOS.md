# Furgão realista: atritos

Cada atrito do plano do [furgão realista](../../planos/2026-10-30-furgao-realista.md), com o comando que o reproduz e o destino dado. A classificação final (corrigido no plano, gate ou instrução nova, ou devolvido ao backlog) é da fatia de fechamento.

## 1. A cópia levou a tabela de medidas da fonte

A cópia do `furgao` levou junto o `referencias/fonte-partes.json`, as medidas tiradas da malha do pacote de licença livre. O teste da origem das fontes exige que toda peça com esse arquivo esteja na tabela de fontes de veículo, que registra as 27 recriações e o pacote de cada uma, e a cópia não é uma recriação nova. O processo pegou sozinho: o `test:rapidos` dos gates recusou a cópia. A correção ficou na cópia, que deixa o arquivo só no `furgao` e aponta para ele no cabeçalho e no `alvo.md`; a instrução de cópia de peça com fonte, que não existe hoje, fica para o fechamento decidir.

```bash
npx vitest run tools/modelar/origem-das-fontes.test.mjs
```

## 2. O motor da prancha media o landmark só contra os vértices da linha

Um landmark no meio de um trecho reto, como a soleira, saía 1.164 mm fora da linha, porque `tools/modelar/prancha/prancha.mjs` media a distância só até os vértices, e um trecho reto tem vértice apenas nas pontas. Na primeira rodada da prancha, 11 landmarks acusaram de 80 a 1.164 mm. O processo não teria pego: nenhum teste cobria landmark sobre linha. Corrigido no plano, com o teste em `tools/modelar/prancha/prancha.test.mjs` que falhava antes.

```bash
npx vitest run tools/modelar/prancha/prancha.test.mjs
```

## 3. A skill da prancha manda a especificação para a pasta das ferramentas

A `desenhar-prancha` manda guardar a especificação em `tools/modelar/`, o que mistura o objeto com as ferramentas, e nenhuma prancha de quatro vistas tem padrão de nome. A especificação ficou em `procedural/pecas/furgao-realista/referencias/quatro-vistas.prancha.mjs`. O processo não teria pego. Destino: instrução na skill, decidido no fechamento.

## 4. O relatório da prancha não mostra as colisões de texto

O `imprimirRelatorio` diz "sem alertas" com rótulos sobre linhas, que só aparecem chamando `examinarDesenho`; na primeira rodada, o número 225 caía sobre o pneu. O processo não teria pego. Destino: o motor põe as colisões no relatório, ou a skill manda chamar o exame, decidido no fechamento.

```bash
node procedural/pecas/furgao-realista/referencias/quatro-vistas.prancha.mjs
```

## 5. A vista de cima da prancha sai espelhada

A vista de cima desenha +x para baixo, o que espelha o objeto visto de cima. Não aparece nesta prancha, que é simétrica de cima, mas trocaria de lado qualquer detalhe assimétrico. O processo não teria pego. Destino: backlog, com este caso.

## 6. A cota de altura puxa uma linha solta pelo chão

A cota vertical que parte do chão desenha a linha de extensão ao longo do solo, e sem a linha do chão desenhada ela aparece como um traço solto sob o pneu. O detector de colisões não conta essa sobreposição. O processo não teria pego; a prancha passou a desenhar a linha do chão. Destino: instrução na skill, decidido no fechamento.

## 7. A correção da prancha desfez uma decisão do alinhamento

Na segunda rodada, para fazer a porta da cabine descer reta como o crítico pediu, o agente recuou o pé do para-brisa 660 mm, e o capô passou a 1.270 mm, contra o bico curto que a pessoa aprovou. O relatório do motor e o crítico cego não conhecem o alinhamento, e só a leitura da imagem por quem conduz pegou. A terceira rodada voltou o bico curto com a porta em L. O processo não teria pego sozinho. Destino: a prancha passa a declarar os landmarks que o alinhamento fixa como travados, e o motor acusa quando um deles se move, decidido no fechamento.
