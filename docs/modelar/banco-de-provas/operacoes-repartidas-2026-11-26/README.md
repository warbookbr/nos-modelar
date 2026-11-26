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

## Fatia 2

Medida em 2026-11-26, na mesma máquina, que neste dia rodava mais devagar que na fatia 1 (a lataria sem mudança nenhuma levou 65 s, contra os 51 a 55 s de antes); o antes e o depois abaixo são do mesmo dia.

O corte das aberturas passou a montar um índice da chapa uma vez (`indiceDaChapa`, em `procedural/nucleo/operacoes/abertura-por-contorno.js`): o registro de cada face com a caixa dela, as faces de cada vértice e, quando o classificador de parede pede, a grade das faces. O índice fica no `st` da execução, sob o símbolo `GUARDA_DA_CHAPA`, e o corte seguinte da mesma chapa o põe em dia em vez de montá-lo de novo. Saíram quatro varreduras que se repetiam a cada corte: a grade do `classificadorDeParede`, a passada de `cortar` pelos mapas da peça atrás das faces que tocam a caixa do contorno, o filtro da chapa inteira que juntava as faces vizinhas das sementes em `vizinhancaDoVao`, e a tabela das faces de cada vértice que `absorverTubos` montava. O raio da peça inteira, que só a limpeza fina usa, deixou de ser medido nos cortes sem ela.

A chave de validade é a procedência da execução. Ao fim de cada passo o despacho do núcleo registra os vértices e as faces cuja entrada o passo criou, apagou ou alterou, e o índice guarda o passo em que foi posto em dia e quantos registros havia. Ele só é reaproveitado quando os registros seguintes são exatamente os dos passos dali até o anterior, um por passo e em ordem, quando os mapas de vértices e de faces são os mesmos objetos, e quando o despacho está contando as escritas do passo corrente e a conta está em zero. Cada face cuja lista de vértices mudou e cada face com um vértice que mudou é lida de novo; acima de um quarto da chapa, o índice é montado do zero. A operação chamada por outro caminho (um registro que troca a função dela, o retrato completo, um estado sem procedência) monta o índice a cada corte, como antes. A memória de execução não leva o índice, porque copia só os campos de texto do estado. Entre as duas vagas da guarda, serve a primeira que tem uma face da chapa pedida e que aceita ser posta em dia; a recusada sai e a seguinte é tentada.

A malha passou a depender do rastreio declarado de escrita, e a frase da fatia 1 de que a mesma malha sai por construção vale só com essa ressalva. No retrato rápido, que é o padrão, a procedência de um passo do núcleo sai da declaração de escrita da operação (`ESCRITA_DAS_OPERACOES`, em `nucleo.js`) e das somas do que ela altera no lugar (`somas-do-rastreio.js`), que antes só decidiam a procedência. A declaração que deixa de fora uma face ou um vértice que o passo mudou deixa o índice velho nela, e o corte seguinte lê a chapa de antes: com as somas da booleana e da abertura desligadas (`injecao.desligadas`), a revisão mostrou a malha diferente da do código anterior em dois cenários de vãos vizinhos e de simetria. Duas conferências cobrem isso. No retrato conferido o registro vem da conta completa e o despacho recusa a declaração que diverge dela. Com a leitura do passo registrada (a leitura conferida), o corte compara o índice reaproveitado com um montado do zero (`divergenciaDoIndice`) e recusa o vão, dizendo a face ou o vértice que diverge e que a causa é a declaração de escrita de um passo anterior. A leitura observada do corte também encolhe com a guarda, porque o corte que reaproveita o índice não relê a chapa inteira dos mapas; a declaração de leitura da operação precisa continuar `malha`, e isso está escrito junto da guarda, porque `procedural/nucleo/planejador/leitura-declarada.js` não é território deste plano.

O índice custa perto de 1 KB por face, medido pela revisão numa chapa de 250 mil faces com a grade, e vive até o fim da execução. A guarda tem um teto de 250 mil faces (`FACES_MAXIMAS_NA_GUARDA`): a chapa maior que ele não fica guardada, e as vagas mais antigas saem enquanto a soma das faces guardadas passa dele. A chapa do furgão tem 103 mil faces e a lataria do carro inteira tem 124 mil, de modo que o teto dá duas vezes a maior chapa de hoje e segura a guarda em cerca de 250 MB.

As faces que tocam a caixa do contorno saem de uma passada pelos registros do índice, que já têm a caixa de cada face, e não de uma grade espacial como o plano previa: a profundidade e a caixa da chapa pedem os extremos de todas as faces de qualquer modo, e a passada pelos registros custou 0,3 s no furgão inteiro, contra 3,2 s da passada pelos mapas.

### Igualdade da malha

A impressão do neutro canônico, antes e depois, com `node --max-old-space-size=8192 docs/modelar/banco-de-provas/execucao-paralela-2026-11-26/medir.mjs receita <peça>`:

| peça | impressão antes | impressão depois | tempo antes | tempo depois | corte das aberturas antes | depois |
| --- | --- | --- | --- | --- | --- | --- |
| `procedural/pecas/carro-fastback/partes/lataria/receita.js` | f80df9ac242c009a | f80df9ac242c009a | 65,4 s | 63,7 s | 33,5 s | 32,1 s |
| `furgao-realista` | b9c5c24feeb3dfa2 | b9c5c24feeb3dfa2 | 56,2 s | 43,9 s | 26,7 s | 15,5 s |
| `procedural/pecas/carro-quadrado/partes/lataria` | 6b4dbff12ba96e7c | 6b4dbff12ba96e7c | 28,1 s | 27,2 s | 10,8 s | 10,5 s |

Os tempos de depois são os da versão final, com as correções da revisão. Além da impressão do neutro, ficaram iguais nas três peças a impressão do registro de cada vão (`neutro.aberturas`, com a vizinhança e a limpeza), a da procedência e a das origens, tiradas por um roteiro de prova fora do repositório. A guarda montou um índice por peça e reaproveitou 2 vezes na lataria do carro, 16 no furgão e 5 no carro quadrado, com 3,4 a 4,2 mil faces refeitas por peça.

### Perfil do furgão depois

Pelo mesmo `perfil.mjs`: `abrir` caiu de 24,2 s para 12,8 s e `cortar` de 20,6 s para 10,0 s, com o perfil ligado nos dois. `vizinhancaDoVao` foi de 7,25 s para 0,59 s, e o tempo próprio de `cortar` de 4,5 s para 1,2 s; montar o índice e pô-lo em dia custa 0,48 s na peça inteira. O que resta em `abrir` é a subtração da booleana (3,6 s), a limpeza da costura no trecho recortado (2,8 s) e a resolução da seleção da chapa (`resolverSelecao`, 2,5 s, em `nucleo.js`, fora do território). Dentro do arquivo sobram quatro varreduras pequenas, não mexidas: o conjunto das faces externas de todas as subdivisões montado a cada corte (0,25 s), o raio da peça inteira nos cortes com limpeza fina (0,25 s), o maior id do passo procurado entre todas as faces da peça (0,16 s) e o filtro que junta a chapa cortada (0,10 s).

Na lataria do carro e no carro quadrado o ganho é pequeno porque o corte ali é quase todo a subtração da booleana, que é da fatia 3.

### Prova da guarda

Três arquivos de teste em `procedural/nucleo/operacoes/`, cada um abaixo de 5 s sozinho (4,7 s, 4,2 s e 3,7 s de testes), com o que repartem em `tools/fixtures/corte-das-aberturas/prova-da-guarda.ts`.

`abertura-por-contorno-guarda.test.ts` roda cortes em corrente com a guarda e sem ela e compara o neutro byte a byte, corta três chapas em alternância com as duas vagas, e trava o que vale dentro de um passo (o índice não é reaproveitado duas vezes no mesmo passo, nem depois de o passo escrever nos mapas, nem com um registro de outro passo ou um registro a mais na procedência) e o teto de faces. `abertura-por-contorno-guarda-chapa-mudada.test.ts` muda a chapa entre dois cortes de sete jeitos (vértices movidos no lugar, vetores dos vértices trocados, listas de vértices das faces giradas, a chapa inteira movida, um passo sem registro na procedência, a chapa transladada por um passo do núcleo, o mapa de vértices trocado por outro de mesmo conteúdo) e confere que o índice posto em dia é igual, registro a registro e célula a célula da grade, ao montado do zero, e que a receita dá o mesmo neutro que sem guarda. `abertura-por-contorno-guarda-conferida.test.ts` injeta a recusa da booleana no trecho recortado (o corte refeito no mesmo passo monta um índice novo) e desliga as somas do rastreio para mostrar a recusa na leitura conferida e no retrato conferido.

Cada mutante abaixo, aplicado ao arquivo da operação pelos roteiros da revisão, reprova ao menos um teste: sem a identidade dos mapas de vértices e de faces; sem a conta das escritas do passo corrente; sem a exigência de ao menos um passo desde o corte anterior; com uma vaga só; sem a leitura dos vértices mudados; sem a das faces mudadas; sem a contagem dos registros; sem a conferência do passo de cada registro; sem o limite de um quarto da chapa; sem a ordem das faces de cada vértice; sem a retirada da face da grade; sem o corte das vagas pelo teto; sem a conferência da leitura conferida. Os nove cenários do roteiro de ataque da revisão dão as mesmas quatro impressões (neutro, vãos, origens, procedência) com o código anterior e com o novo, e o sorteio de mudanças da revisão passou em cinco sementes de 40 rodadas sem divergência.
