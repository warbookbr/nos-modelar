# Operações repartidas entre núcleos: onde vai o tempo dentro do corte das aberturas

Pasta do plano [operações repartidas entre núcleos](../../planos/2026-11-26-operacoes-repartidas-entre-nucleos.md), fatia 1, medida em 2026-11-26 numa máquina de quatro núcleos e 16 GB. O perfil de CPU do Node pesa um pouco a execução: a lataria passou de 51 s para 66 s com ele ligado, e as frações abaixo valem para a execução sem o perfil.

## Como se refaz

```
node --cpu-prof --cpu-prof-dir=tmp/prof --max-old-space-size=8192 docs/modelar/banco-de-provas/execucao-paralela-2026-11-26/medir.mjs receita <peça>
node docs/modelar/banco-de-provas/operacoes-repartidas-2026-11-26/perfil.mjs tmp/prof/<arquivo>.cpuprofile --dentro=<função> --arquivo=<arquivo.js>
```

O [`perfil.mjs`](perfil.mjs) soma o tempo das amostras cuja pilha passa pela função escolhida, o de cada filha direta dela e o tempo próprio de cada função lá dentro. As linhas mais quentes de uma função saem do `positionTicks` do mesmo perfil.

## Lataria do carro

Três cortes de abertura em corrente (o vidro lateral, a lanterna e o vidro traseiro, cada um sobre a chapa que o anterior deixou), com 28,5 s dentro de `abrir`. Desse tempo, 96,8% está em `cortar`, e dentro de `cortar` 62% está na subtração da booleana do núcleo (`subtrair` em `booleanas.js`), 10% na limpeza da costura e 5% na vizinhança do vão. Somando o corte das aberturas e o passo `subtrair` da receita, a função `nucleoBooleano` leva 28,4 s. A biblioteca da conta geométrica (`manifold.js`) fica com menos de 2 s disso. O resto é o código em volta dela: 40% de tempo próprio, espalhado em vetores novos a cada conta (`sub`, `cruz`, linha 97, 12%), mapas com chave de texto por aresta (linhas 689 e 796, 15%), e um laço que confere cada triângulo novo contra todas as faces dos operandos anteriores (linhas 518 a 520, 11%).

## Furgão realista

Vinte e nove passos de corte de abertura, com 22,9 s dentro de `abrir`. Em `cortar`, 36% está na vizinhança do vão (`vizinhancaDoVao`), dos quais dois terços no `classificadorDeParede`, que monta a grade da chapa inteira a cada corte; 21% é o próprio `cortar`, que percorre as faces da chapa inteira para achar as próximas ao prisma (linhas 1315 e 1318); 19% é a subtração; 16% é a limpeza da costura. Dentro de `nucleoBooleano`, 72% do tempo próprio está numa linha só (1263), que percorre todas as faces da peça depois de cada booleana para achar os vértices que ficaram soltos.

## O que a medida diz sobre a repartição

O tempo do corte das aberturas está em varreduras da malha inteira que se repetem a cada corte (a chapa toda no `cortar` e no classificador de parede, a peça toda depois da booleana) e em contas com objetos pequenos e chaves de texto. A biblioteca da conta geométrica, que é a parte que se repartiria naturalmente, é menos de 10% do tempo. Repartir as varreduras entre fios pede mandar a chapa a cada fio: o estado da lataria serializa em 0,4 s e desserializa em 1,2 s (banco de provas da execução paralela), o que come boa parte do ganho num corte de 5 a 10 s, e a junção em ordem fixa precisa refazer os mapas por aresta.

As mesmas varreduras somem sem fio nenhum: a grade do classificador de parede montada uma vez por chapa e reaproveitada entre os cortes, as faces próximas ao prisma achadas por essa grade em vez da chapa inteira, os vértices soltos achados pelas faces que a booleana tocou em vez da peça inteira, e as chaves por aresta numéricas. Pelo perfil, isso alcança perto de 11 s dos 47 s do furgão e de 6 a 8 s dos 51 s da lataria, com a mesma malha por construção e o mesmo ganho em toda máquina. Parte disso está no arquivo das booleanas, que é do plano do resgate dos ramos antigos.
