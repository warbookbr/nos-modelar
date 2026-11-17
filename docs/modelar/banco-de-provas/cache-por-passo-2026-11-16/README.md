# Cache por passo: a linha de base do laço e onde o cache rende mais

Pasta do plano [cache por passo da receita](../../planos/2026-11-16-cache-por-passo.md), fatia 1, medida em 2026-11-17 entre 01:43 e 03:06 UTC, numa máquina de quatro núcleos a 2,3 GHz e 15 GB, com Node 22.23.4 e sem outro agente rodando. O laço medido é o de depois de uma edição da receita: um `descrever` e uma captura da bancada, com a receita mudada desde a captura anterior.

## Como se refaz

O script [`medir-linha-de-base.mjs`](medir-linha-de-base.mjs) mede um modo e uma peça por processo, e imprime uma linha JSON:

```
node --max-old-space-size=8192 docs/modelar/banco-de-provas/cache-por-passo-2026-11-16/medir-linha-de-base.mjs execucao <peça>
node --max-old-space-size=8192 docs/modelar/banco-de-provas/cache-por-passo-2026-11-16/medir-linha-de-base.mjs descrever <peça>
node --max-old-space-size=8192 docs/modelar/banco-de-provas/cache-por-passo-2026-11-16/medir-linha-de-base.mjs bancada <peça> [--zebra] [--com-cache]
```

O modo `execucao` importa a receita, executa-a com o cronômetro por passo do `descrever` (`registroCronometrado`), anota o pico de memória e mede quanto custa copiar (`structuredClone`) e serializar (`v8.serialize`) o estado executado, que é o que um cache entre comandos teria de gravar e ler. O modo `descrever` chama o serviço do `descrever` e tira a duração de cada etapa do andamento que ele já relata. O modo `bancada` faz uma captura isométrica (com `--zebra`, a vista direita com a zebra e o enquadramento, que é a captura do quarto traseiro) e tira a duração de cada etapa da batida de andamento da bancada, a cada 200 ms; sem `--com-cache`, ele apaga antes as entradas daquela receita em `tmp/cache-de-medida/`, para a captura ser a de depois de uma edição.

Cada linha traz a carga da máquina (`os.loadavg()`, o mesmo número de `uptime`) antes e depois, a fração de CPU roubada pelo hospedeiro (`steal`, de `/proc/stat`) e o tempo de uma conta fixa feita antes da medida (`calibracaoS`), que diz se a máquina estava na mesma velocidade. As medidas desde 02:22 estão em [`medidas.jsonl`](medidas.jsonl), uma por linha. As de antes, feitas enquanto o script ganhava a calibração e a memória, são citadas no texto com os mesmos números que imprimiram. A carga de um minuto ficou entre 0,05 e 2,8 (a captura sobe a carga, porque o Chromium e o Node correm juntos), o roubo entre 0,1 % e 0,4 % e a calibração entre 3,14 s e 3,37 s.

## O laço depois de uma edição

Medianas de três medidas (a bancada da bicicleta, de quatro; o furgão, de uma captura só). A execução no Node da captura é a ativação da sessão, que executa a receita e a guarda para a medida de contatos; a execução na página é a da bancada no navegador, que executa a receita de novo a partir do módulo (`src/bancada/carregar-peca.js`).

| peça | `descrever` | dele, executar a receita | captura | dela, execução no Node | dela, execução na página | laço | execuções no laço |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bicicleta (`bicicleta-urbana`, 635 passos) | 18,5 s | 11,9 s | 38,1 s | 12,5 s | 15,4 s | 56,5 s | 39,8 s, 70 % |
| quarto traseiro do carro (`carro-fastback/lataria`, 10 passos, zebra) | 131,6 s | 120,0 s | 279,4 s | 143,3 s | 121,3 s | 411 s | 385 s, 94 % |
| furgão realista (739 passos) | 71,9 s | 42,0 s | 154,8 s | 46,8 s | 58,6 s | 227 s | 147 s, 65 % |

Em todo laço a mesma receita é executada três vezes: uma no `descrever`, que não lê o cache da receita inteira (`executarReceitaGuardada` de `tools/modelar/entrada-de-medida.mjs`), uma na ativação da captura, que lê e grava esse cache, e uma na página, que nunca o lê. O resto do laço é pequeno: no `descrever`, medir as partes, os contatos e as formas prometidas dão 6,4 s na bicicleta, 10 s no carro e 25 s no furgão; na captura, a medida de contatos dá 5 s na bicicleta e 24 s no furgão, e abrir o navegador, ler o estado e fotografar somam de 5 a 20 s. Sem edição nenhuma (`--com-cache`), a captura da bicicleta cai para 20,7 s e a do carro para 134,9 s, e a execução na página é então 74 % e 92 % delas.

O braço robótico não é peça pesada para este plano: as treze partes executam em 11 s somadas, a mais lenta (o antebraço, de 10 passos) em 3,1 s, e o `descrever` do antebraço leva 4,2 s. A montagem dele não foi medida.

## Onde vai o tempo da execução

| peça | execução | operações que custam | passo mais caro | refeito por um cache de prefixo, mediana sobre o passo mudado | refeito se o último passo muda |
| --- | --- | --- | --- | --- | --- |
| bicicleta | 12,0 a 12,3 s (5 medidas) | `unir` 68 % (5 passos), `arredondarAresta` 15 % (12) | 301, `unir`, 5,3 s | 2,6 % | 1,4 % (0,17 s) |
| quarto traseiro | 97 a 145 s (10 medidas) | `subdivisao` 56 % a 67 % (passo 0), `aberturaPorContorno` 19 % a 26 % (3), `subtrair` 12 % a 15 % (1) | 0, `subdivisao`, 55 a 97 s | 27 % | 0,2 % (0,15 s) |
| furgão realista | 38,8 a 42,2 s (4 medidas) | `aberturaPorContorno` 49 % (17 passos), `subtrair` 10 % (18), `lathe` 10 % (63) | 91, `aberturaPorContorno`, 2,0 s | 48 % | 0,4 % (0,15 s) |

A coluna do prefixo é a fração do tempo de execução que um cache que recomeça do estado guardado logo antes do passo mudado ainda refaria, tomada a mediana sobre a posição do passo mudado. Na bicicleta, metade do tempo está nos passos 299 a 305 (as uniões do quadro), e o que muda depois deles sai quase de graça; no carro, o passo 0 sozinho é mais da metade, e só uma edição depois dele ganha; no furgão, o tempo se espalha pelas 127 partes, e o prefixo ainda refaz metade: é a peça em que saber de que passo cada passo depende rende mais que o prefixo.

O tempo do carro varia de 97 s a 145 s entre execuções iguais, com a calibração igual e o roubo abaixo de 0,2 %, e a variação está quase toda na `subdivisao` (de 55 s a 97 s), enquanto as aberturas e a subtração variam menos de 15 %. A coleta de lixo, medida uma vez com `--trace-gc`, pausou 8,9 s de 133 s, e não explica a diferença. A bicicleta varia 2 %, e o furgão 9 %.

## Quanto custa guardar o estado

| peça | faces | copiar o estado | serializar | ler de volta | tamanho serializado |
| --- | --- | --- | --- | --- | --- |
| bicicleta | 59.261 | 0,5 s | 0,22 s | 0,31 s | 32 MB |
| quarto traseiro | 142.123 | 1,1 a 1,3 s | 0,42 a 0,49 s | 0,82 a 0,84 s | 61 MB |
| furgão realista | 262.947 | 2,7 s | 1,37 s | 2,06 s | 150 MB |

Guardar um ponto em disco custa de 2 % a 4 % da execução da peça, e ler um, de 1 % a 5 %, de modo que o cache paga com poucos pontos por receita e não com um ponto por passo: o furgão com um ponto a cada passo gravaria 739 vezes 150 MB.

## O pico de memória por peça

Medido a pedido de quem conduz o plano, porque o retrato do acervo morreu por memória nesta sessão e só passou com `--max-old-space-size=6000`. O `heapUsed` é amostrado ao fim de cada passo, e o `rss` é o máximo do processo (`resourceUsage().maxRSS`).

| peça | limite de 8.192 MB: pico de `heapUsed` | pico de `rss` | limite padrão, de 2.198 MB: pico de `heapUsed` | pico de `rss` |
| --- | --- | --- | --- | --- |
| bicicleta | 538 MB | 844 MB | | |
| quarto traseiro | 1.363 MB | 3.092 MB | 1.160 MB | 2.189 MB |
| furgão realista | 2.637 MB | 2.984 MB | 1.492 MB | 1.909 MB |
| braço, a parte mais pesada | 107 MB | 288 MB | | |

Nesta máquina o `NODE_OPTIONS` do ambiente já traz `--max-old-space-size=8192`, e o limite padrão do Node sem ele é 2.198 MB. Com o limite padrão, o furgão e o quarto traseiro executam inteiros, cada um sozinho no seu processo, porque o coletor trabalha mais cedo: o pico de 2,6 GB do furgão com o limite alto é lixo ainda não coletado. Nenhuma das quatro peças pesadas explica sozinha a morte do retrato; o que fica é o acúmulo entre peças no mesmo processo, ou uma peça que esta medida não cobre (a carroceria do sedã, de 174 mil faces, não foi medida).

## A decisão

A execução da receita é a maior fatia do laço nas três peças pesadas, de 65 % a 94 %, e a parada do plano (a execução não ser a maior fatia) não vale. Dentro dela, o que rende mais é deixar de executar a mesma receita três vezes por edição, antes de qualquer impressão digital por passo: com uma execução só por edição, o laço da bicicleta iria de 56,5 s a uns 29 s e o do carro de 411 s a uns 170 s, os dois já abaixo da metade que o gate 3 pede, sem tocar no núcleo. Duas das três execuções estão no território do plano só em parte: a do `descrever` passa a ler e gravar o cache da receita inteira que a ativação já usa (`descrever-peca.mjs`, no território); a da página só sai se a página receber o estado executado em vez de executar o módulo, o que é da bancada (`src/bancada/carregar-peca.js` e `tools/modelar/olhar-bancada.mjs`), fora do território enquanto o plano do reflexo estiver ativo.

O cache por passo vem depois, sobre a execução que sobra, e rende de forma diferente por peça. Na bicicleta e no carro, pontos guardados logo depois das operações caras (as uniões do quadro, a subdivisão da chapa) tiram quase toda a execução de uma edição posterior a elas, e o núcleo já tem esse mecanismo dentro de um processo (`procedural/nucleo/memoria-de-execucao.js`, com as chaves encadeadas de `chavesDosPrefixos`, os pontos depois de `OPERACOES_PESADAS` e a prova bit a bit); o que falta a ele é gravar os pontos em disco entre comandos, com a versão do código do núcleo na chave. No furgão o prefixo ainda refaz metade do tempo, e o ganho depende da leitura declarada da fatia 2, que diz que parte cada passo lê.

## O que a fatia 2 precisa saber

As operações a declarar primeiro são as que custam nas peças da linha de base: `aberturaPorContorno`, `subtrair`, `unir`, `subdivisao`, `arredondarAresta`, `lathe`, `extrusao`, `friso` e `limparLascas`, que somam mais de 90 % da execução das três. A edição de forma do carro costuma mudar a gaiola, que é o passo 0, e aí nem o prefixo nem a dependência poupam a `subdivisao`: o ganho no carro está nas edições dos vãos e da subtração, depois dela. O tempo do carro varia 50 % entre execuções iguais, e o gate 3 medido nele com mediana de três pode cair ou passar pela variação da `subdivisao`; contar os passos executados, como o gate 2 faz, é a medida que não varia.
