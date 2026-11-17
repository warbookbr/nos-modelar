# Cache por passo: a linha de base do laço e onde o cache rende mais

Pasta do plano [cache por passo da receita](../../decisoes/PLANOS-ENCERRADOS.md), fatia 1, medida em 2026-11-17 entre 01:43 e 03:06 UTC, numa máquina de quatro núcleos a 2,3 GHz e 15 GB, com Node 22.23.4 e sem outro agente rodando. O laço medido é o de depois de uma edição da receita: um `descrever` e uma captura da bancada, com a receita mudada desde a captura anterior.

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

## Fatia 2: a leitura declarada, conferida

Feita em 2026-11-17, sem medida de tempo (a máquina tinha outros agentes). O núcleo ganhou um registro de leitura, desligado por padrão: com `OPCOES.aoLer` ou `OPCOES.leitura: 'conferido'`, cada passo roda com uma leitura rastreada em `st.V`, `st.F` e `st.origens` (`procedural/nucleo/planejador/leitura-do-passo.js`), que separa o que a resolução da seleção lê, e o que ela devolve (os citados do passo), do que a função da operação lê depois. A leitura de uma entrada que o próprio passo criou não conta, e a consulta que a operação faz a um registro de origem cita as faces dele. A declaração por operação está em `procedural/nucleo/planejador/leitura-declarada.js`, por mapa, em três níveis: 'nada', 'citados' e 'malha'. O modo conferido recusa o passo que leu além do declarado, com o passo, a operação, o mapa e como leu.

O [`levantar-leitura.mjs`](levantar-leitura.mjs) soma, por operação, quantos passos leram cada nível, e a soma de onze peças (a bicicleta, o furgão realista, partes do braço, da empilhadeira, do carrinho de mão, do sedã, do avião e da instalação solar) está em [`leitura-por-operacao.jsonl`](leitura-por-operacao.jsonl). As nove operações da linha de base ficaram assim:

| operação | passos na soma | vértices | faces | onde ela varre |
| --- | --- | --- | --- | --- |
| `lathe`, `extrusao`, `subdivisao` | 185, 173, 57 | nada | nada | |
| `friso` | 35 | citados | citados | |
| `subtrair` | 47 | citados | malha | a coleta dos vértices sem face depois do corte e a face vizinha de uma aresta |
| `unir` | 19 | malha | malha | as faces, como o `subtrair`, e os vértices quando refina a faixa da costura (a caixa da malha inteira, no cordão de solda) |
| `aberturaPorContorno` | 17 | malha | malha | o raio da peça, de todos os vértices, e as chaves dos dois mapas para o id local livre |
| `limparLascas` | 8 | malha | malha | a caixa de todos os vértices, e as faces |
| `arredondarAresta` | 14 | malha | malha | as faces, para achar a outra face da aresta e a terceira de cada ponta |

O `unir` foi declarado primeiro com os vértices 'citados', como a soma das peças mostrava, e a conferência o recusou na fixture do cordão de solda e no passo 301 da bicicleta, onde a união refina a costura; a declaração passou a 'malha'. A conferência do acervo, uma peça por processo com `--conferir`, passou nas 121 receitas (as raízes de `procedural/pecas/` e as partes de objeto), e o resultado está em [`conferencia-da-leitura.jsonl`](conferencia-da-leitura.jsonl). O teste `procedural/nucleo/planejador/leitura-declarada.test.mjs` prova o registro (a malha igual bit a bit com ele ligado, os mapas devolvidos sem nada instalado, a seleção que varre separada da operação), a recusa e os exemplos do registro, e `leitura-declarada-acervo.test.mjs`, que é lento, confere cinco peças que cobrem toda declaração que não é 'malha'.

O que isso diz ao cache: as primitivas e os atributos não dependem de nada que já existia, e as transformações e o `friso` dependem só do que citam, mas as operações caras (as booleanas, a abertura por contorno, a limpeza de lascas e o arredondamento de aresta) leem a malha inteira, e um passo assim depende de todo passo anterior. No furgão, em que as 17 aberturas são metade da execução, a dependência por leitura só poupa uma abertura quando a edição vem depois dela, como o prefixo já faz. Estreitar essa leitura muda as operações (`procedural/nucleo/operacoes/`, fora do território), e a da abertura por contorno não é só varredura: o raio da peça inteira entra na conta dela, de modo que a abertura de um vão depende hoje da geometria de toda a peça.

## A revisão da fatia 2 e a fatia 3: o cache por prefixo

A revisão adversarial da fatia 2 achou que a leitura declarada não serve para pular passos: a `subdivisao` lê a gaiola que outra `subdivisao` deixou em `st.pontosDaGaiola`, o `friso` lê a superfície que outro passo guardou em `st.superficiesDosFrisos`, e a leitura de uma face que um passo anterior apagou some do resumo. Quem conduz decidiu que o cache é por prefixo, e a leitura declarada fica como diagnóstico. As lacunas estão no plano, e três achados no backlog.

O cache por prefixo é a memória de execução que o núcleo já tinha num processo, guardada fora dele (`procedural/nucleo/planejador/memoria-em-armazem.js`). O estado depois do passo k fica sob a chave encadeada do conteúdo dos passos 0 a k e do que os rodeia (`chavesDosPrefixos`), com a versão do código do núcleo no nome do ponto e dentro dele, e uma execução recomeça do último ponto guardado do prefixo dela. Uma edição no passo j muda a chave de j e de todos os seguintes, e de nenhum anterior, de modo que o recomeço vem sempre de antes de j e não depende de saber o que cada passo lê. O núcleo não toca em disco: quem cria a memória dá o armazém (`ler`, `gravar`, `apagar`) e a serialização (no Node, `v8.serialize`). O modo conferido (`OPCOES.memoriaConferida`) roda de novo inteira a execução que recomeçou de um estado guardado e recusa a divergência da impressão do neutro (`procedural/nucleo/planejador/impressao-do-neutro.js`, todos os campos do neutro, os de fora da enumeração inclusive, com Map, Set, zero negativo e NaN distintos).

O teste `procedural/nucleo/planejador/cache-por-prefixo.test.mjs` traz os três casos da revisão como edição (muda só um passo anterior, e a saída com o cache é a da execução inteira, recomeçando do passo anterior ao mudado), a receita repetida que não executa passo nenhum, a edição do último passo que executa só ele (gate 2), o estado de outra versão que não é servido (gate 4), duas memórias em disco numa pasta temporária, como dois comandos, o armazém que falha ou devolve lixo, o índice que mantém os pontos mais recentes e o modo conferido que recusa um estado trocado. O teste `cache-por-prefixo-acervo.test.mjs` roda cada receita inteira, guardando o estado depois do passo do meio, e de novo recomeçando dali, e compara a impressão do neutro das duas. Por padrão, e no CI, ele roda o conjunto de cobertura: o exemplo do registro de cada uma das 43 operações e as sete peças mais baratas que, juntas, usam toda operação do acervo menos três, escolhidas pela cobertura gulosa sobre o tempo de cada receita na varredura inteira (as sete somaram 7,6 s dos 766 s da varredura). As três de fora são as que só peça cara usa: o `aparar`, só na carroceria do sedã (289 s), e a `aberturaPorContorno` e a `limparLascas`, só no furgão realista (94 s) e no quarto traseiro do carro (236 s); no conjunto elas ficam com o exemplo do registro. O conjunto levou 24 s, e está em `TESTES_LENTOS`.

A varredura inteira, com `CACHE_ACERVO_INTEIRO=1`, é a prova do gate 1, rodada em 2026-11-17 duas vezes (a segunda com a conferência estrita do ponto guardado, no arquivo do commit `02788903`): a impressão do neutro é a mesma nas 121 receitas, e nas 111 que têm passos o ponto do meio foi guardado e lido e a segunda execução fez só a metade de trás; as outras dez são as partes do robô humanoide, que ainda não têm passo. Ela levou 709 e 767 s com a máquina dividida com outros agentes, 268 e 289 s deles na carroceria do sedã:

```
CACHE_ACERVO_INTEIRO=1 npx vitest run procedural/nucleo/planejador/cache-por-prefixo-acervo.test.mjs
```

O que fica para a fatia 4: o armazém em disco no host, numa pasta fora do repositório (como `tmp/cache-de-medida/`), com a versão do núcleo tirada do conteúdo de `procedural/nucleo/` (o `assinaturaDaEntrada` de `tools/modelar/entrada-de-medida.mjs` já faz essa conta) e a limpeza dos pontos de versões velhas, que hoje ninguém apaga. A escolha dos pontos é a da memória do processo (os dois últimos passos das operações pesadas e o último passo de operação cara antes de onde a execução diverge da anterior), e as duas listas do núcleo não batem com a linha de base. Na bicicleta, as operações pesadas acabam no passo 258 e as uniões do quadro (68 % da execução) estão nos passos 299 a 305: a primeira edição depois delas recomeça do 258 e as refaz, e só a seguinte recomeça depois do 305, que entra como a operação cara antes da divergência. No quarto traseiro, a `subdivisao` do passo 0 (de 55 a 97 s) não está em nenhuma das duas listas, e a edição de um vão nos passos 4 a 6 a refaz sempre. A fatia 4 precisa escolher os pontos pelo custo, e a medida dela diz se o gate 3 passa com isso. Cada ponto custa uma serialização (de 0,2 a 1,4 s na linha de base) e, na volta, uma leitura; a cópia extra que a memória do processo fazia na volta não é feita no armazém.

## A revisão do cache por prefixo

A revisão adversarial dos commits `14833a64` e `02788903` conferiu que o estado guardado está completo (1.497 pontos em 57 receitas, sem divergência) e achou quatro falhas, corrigidas no mesmo dia, cada uma com teste do caso que a revisão reproduziu, em `procedural/nucleo/planejador/cache-por-prefixo.test.mjs`:

1. O processo sem a Manifold guardava o estado depois da booleana que gritou por ela, e o processo seguinte, com a biblioteca, recomeçava dele sem o corte; o modo conferido recusava, mas deixava o ponto. Agora a disponibilidade da Manifold entra na chave, nenhum ponto é guardado depois do primeiro passo que gritou com ela ausente, e o ponto que o conferido recusa sai do armazém junto com os que a execução recusada guardou depois dele. A prova roda dois processos, um com `procedural/nucleo/planejador/fixtures/sem-manifold.mjs`, sobre a mesma pasta.
2. A versão cobria só `procedural/nucleo/`. `versao-do-codigo.mjs` cobre também `procedural/extensoes/`, a versão de cada pacote que esses arquivos importam pelo nome (hoje `manifold-3d` 3.5.4 e `earcut` 3.0.2) e a do Node.
3. A chave não distinguia o buraco de uma lista (`[0, , 0]`, que o núcleo pula) do valor indefinido (`[0, undefined, 0]`, que ele recusa), e o estado de um servia ao outro. `chave-do-prefixo.js` os distingue. A mesma falta estava no `chaveExata` de `procedural/nucleo/memoria-de-pura.js`, que a memória das funções puras usa: o arquivo veio por empréstimo ao plano, a chave exata passou a distinguir o buraco (o teste é de `memoria-de-pura.test.mjs`), e a chave do prefixo passou a ser a dela.
4. Com `maximo = 4` e todo passo guardado, a edição só recomeçava do passo anterior nas quatro últimas posições. A memória em armazém escolhe agora os pontos pelo custo (o passo que leva ao menos `limiarDeCustoMs`, 250 ms por padrão, os dois últimos e o anterior ao primeiro que mudou desde a execução anterior), `maximo` é validado e é 16 por padrão, infinito com todo passo guardado, e a receita de oito cubos refaz seis passos ao mudar o terceiro.

Também entraram a trava opcional do índice (`armazem.trancar`), que evita perder o ponto de outro processo que guarda ao mesmo tempo, e `desserializarDevolveCopia`, sem a qual o núcleo copia o estado lido, porque um armazém que devolve o objeto guardado teria o estado mudado pelos passos seguintes.

A varredura inteira (`CACHE_ACERVO_INTEIRO=1`) rodou de novo em 2026-11-17 com o código destas correções, no commit `558350aa`: as 121 receitas deram o mesmo neutro recomeçando do passo do meio, em 676 s com a máquina dividida.

## Fatia 4, primeira parte: o `descrever` com o cache por prefixo e a medida do laço

A CLI do `descrever` liga o cache por prefixo (`--sem-cache` o desliga; o serviço o recebe desligado, para quem chama em processo escolher). A memória vem de `procedural/nucleo/planejador/armazem-em-pasta.mjs`: o armazém em `tmp/cache-por-prefixo/`, que grava ao lado e renomeia, tranca o índice com um arquivo criado de forma exclusiva e lista a pasta para a limpeza das versões velhas, e a versão do código calculada uma vez, na importação do módulo, ao lado da do núcleo (uns 60 ms). O processo cujo código no disco mudou depois da importação recebe uma memória que só lê. Com isso entraram as correções da segunda revisão: o modo conferido que recusa descarta todos os pontos da receita (o veneno pode ter vindo de um ponto anterior, que já gerou os seguintes), a chave acha o buraco índice por índice, o ponto, o índice e o descarte se gravam dentro da trava, e a versão leva a arquitetura do Node, o conteúdo de cada pacote importado (o `.wasm` da Manifold inclusive) e a versão de cada dependência que ele declara.

O laço foi medido em 2026-11-17 entre 07:21 e 07:36 UTC com a máquina dividida com outros agentes, carga de um minuto entre 4,4 e 7,2 nos quatro núcleos e a calibração entre 3,29 e 3,42 s (contra 3,14 a 3,37 s com a máquina livre). O modo `laco` do [`medir-linha-de-base.mjs`](medir-linha-de-base.mjs) roda o `descrever` sem o cache, com o cache frio (que grava os pontos), com a receita sem o último passo (a edição no fim) e com a mesma receita, numa pasta de cache temporária; as linhas estão em [`medidas.jsonl`](medidas.jsonl).

| peça | `descrever` sem cache | com o cache frio | depois da edição no fim | a mesma receita | captura da bancada | laço antes | laço depois |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bicicleta, mediana de três | 26,4 s (executar 19,0 s) | 22,1 s | 8,5 s (executar 0,34 s) | 7,8 s | 60,0 s | 86 s | 69 s |
| quarto traseiro, uma rodada | 153,1 s (executar 139,1 s) | 70,9 s | 12,5 s (executar 1,3 s) | 13,2 s | 298,1 s | 451 s | 311 s |

No quarto traseiro, a receita sem o último passo perde a parte do último vão, e o `descrever` sai com código 1; a execução dela (1,3 s) vale como a da edição no fim, e o tempo total vale o da mesma receita. A execução fria com o cache (59,6 s) saiu abaixo da sem cache (139,1 s) na mesma rodada pela variação da `subdivisao` medida na fatia 1, e não pelo cache. Pelos passos executados, que o gate 3 do carro conta, o `descrever` depois da edição no fim executa 0 dos 10 passos, contra 10.

O laço cai 20 % na bicicleta e 31 % no quarto traseiro, longe da metade do gate 3, porque a captura da bancada ainda executa a receita duas vezes: na ativação, no Node, e na página. A captura é 70 % do laço da bicicleta e 66 % do do carro depois do cache no `descrever`, e as duas execuções dela são de 18 e 15 s na bicicleta e de 143 e 121 s no carro (fatia 1). Tirá-las muda arquivos fora do território do plano: `tools/modelar/entrada-de-medida.mjs` (o `executarReceitaGuardada`, que a ativação e a medida de contatos usam, recebendo a memória do cache por prefixo), `tools/modelar/ativar-bancada.mjs` (que gravaria ao lado da sessão o neutro executado, num formato que o navegador lê) e `src/bancada/sessao/carregar-sessao.js` (que já aceita um `neutro` pronto em `processarReceitaSessao`, e passaria a buscá-lo em vez de executar a receita da sessão). O `src/bancada/carregar-peca.js`, que entrou no território, é o caminho da peça do catálogo e não o da captura, e o `olhar-bancada.mjs` emprestado só chama a ativação e a medida de contatos.

## Fatia 4, segunda parte: a captura executa a receita uma vez só

Com o empréstimo de `tools/modelar/entrada-de-medida.mjs`, `tools/modelar/ativar-bancada.mjs` e `src/bancada/sessao/carregar-sessao.js`, a ativação da captura executa a receita com a memória do cache por prefixo (o `executarReceitaGuardada` recebe a memória quando a receita não sai do cache da receita inteira) e grava ao lado do arquivo da sessão o neutro executado (`<sessão>.neutro.json`), no texto de `procedural/nucleo/planejador/neutro-em-texto.js`. A página lê esse neutro em vez de executar a receita (`processarPayloadSessao`), e executa como antes quando o arquivo falta ou não carrega. A medida de contatos da captura também recebe a memória, e a captura apaga o neutro junto com a sessão. O neutro do cache da receita inteira volta da serialização sem os campos que o núcleo deixa fora da enumeração (`origens`, `chapas`, `aberturas`), que a página usa; nesse caso o neutro da página sai do cache por prefixo. A leitura na página é síncrona, porque o processamento do payload no sincronizador é síncrono e o `sincronizador.js` não está no território.

A prova de que a imagem é a mesma está no [`prova-da-captura.mjs`](prova-da-captura.mjs): três capturas em memória das vistas isométrica, direita e superior, a de antes (a página executa), a de agora (a página lê o neutro) e a de antes outra vez. No `braco-robotico/flange` e na bicicleta, as imagens de agora são iguais às de antes pixel a pixel nas três vistas, e as duas de antes também são iguais entre si ([`prova-da-captura.jsonl`](prova-da-captura.jsonl)). Para saber que a página lê de fato o neutro, uma captura com o neutro gravado mexido (os vértices encolhidos em x) saiu diferente da normal.

O laço foi medido de novo entre 07:45 e 08:20 UTC, com a carga de um minuto entre 2,6 e 7,7 e a calibração entre 3,31 e 3,95 s; as capturas de antes e de agora foram intercaladas, para as duas pegarem a mesma carga.

| peça | `descrever` sem cache | `descrever` depois da edição no fim | captura de antes | captura de agora | laço antes | laço agora |
| --- | --- | --- | --- | --- | --- | --- |
| bicicleta, mediana de três | 23,9 s | 8,4 s | 50,7 s | 23,6 s | 74,6 s | 32,0 s (−57 %) |
| quarto traseiro | 162,9 s | 12,8 s (17,6 s a mesma receita) | 298,1 s (07:31, carga 4,5) | 43,4 e 46,9 s | 461 s | 56 a 65 s (−86 %) |

A captura de antes do quarto traseiro intercalada com as de agora não terminou: com a carga em 7,7, a página caiu (`Page crashed`) executando a receita, depois de 807 s, e o valor da tabela é o da captura de antes medida às 07:31 com a carga em 4,5. Pelos passos executados, que o gate 3 do carro conta, o laço antes executava os 10 passos três vezes (no `descrever`, na ativação e na página), 30 por laço; depois de uma edição do último passo ele executa esse passo no `descrever` e na ativação, que recomeçam do ponto anterior, e nenhum na página, 2 por laço (na medida, com a receita sem o último passo e com a mesma receita, 0). O gate 3 passa nas duas peças: a bicicleta cai 57 % na mediana de três, com a carga anotada, e o carro, de 30 passos executados por laço para 2.

## A revisão da fatia 4 e as correções

A revisão adversarial dos commits `dc8fd8a2`, `1fa98a2c` e `0eb64433` achou cinco falhas, corrigidas com um teste cada, que falhava antes da correção e passa depois.

1. A página aceitava qualquer neutro citado pela sessão e voltava a executar a receita em silêncio quando o arquivo faltava. O neutro gravado leva agora a impressão da entrada, o hash do JSON da receita que a ativação gravou na sessão (`impressaoDaReceita`, em `neutro-em-texto.js`); a página a confere e recusa o neutro de outra entrada, e o 404 ou a falha de leitura geram um aviso no console, e não um silêncio. O modelo diz de onde veio o neutro (`origemDoNeutro`: `gravado`, `fornecido` ou `executado`, com o motivo quando executou), a ponte expõe isso em `neutroDaSessao`, e o relato da captura traz a linha `página: neutro lido do arquivo que a ativação gravou` ou `página: receita executada na página (o neutro gravado não serviu: ...)`, também em `resultado.neutroDaPagina`. A `prova-da-captura.mjs` imprime o caminho de cada captura e sai com código 1 se a de agora não leu o neutro gravado. O teste da sessão trocava o neutro por outro sem que nada notasse; ganhou um neutro com um campo que a execução nunca produz, e a troca da linha `neutroPronto ?? executarReceita(...)` por `executarReceita(...)` agora o reprova, assim como aceitar o neutro sem conferir a impressão. A falha de gravação do neutro na ativação vira o aviso `ativação: aviso: ...` no relato e apaga o neutro de uma ativação anterior que ficou ao lado do mesmo arquivo de sessão.
2. `olhar-bancada --sem-cache` desligava só o cache da receita inteira. A ativação recebe agora `cachePorPrefixo: false` e a medida de contatos não cria a memória (`memoriaDaMedida`), de modo que a receita executa do zero, como a ajuda diz.
3. A trava do índice custava 30 s quando o processo que a criou tinha morrido. Ela leva o pid de quem a criou; quem a encontra testa se o processo existe (`process.kill(pid, 0)`, que não envia sinal) e a toma na hora se não existe, e quem espera uma trava viva desiste em 1 s e segue sem gravar. A trava sem pid legível só é tomada depois de 30 s.
4. A limpeza das versões velhas apagava o `.parcial` que outro processo ainda escrevia. Agora só apaga o `.parcial` (e a `.trava`) de mais de cinco minutos (`PARCIAL_ABANDONADO_MS`), e só quando o armazém sabe dizer a idade (`idadeMs`). A ativação e a CLI dela aceitam a pasta do cache (`pastaDoCachePorPrefixo`, `--pasta-do-cache-por-prefixo`), e o teste da ativação grava numa pasta temporária.
5. Recomeçando de um ponto guardado, o `descrever` contava o passo a partir de zero no progresso e descartava os tempos por passo. O núcleo registra em `estatisticas.recomecouDoPasso` o passo de onde recomeçou, e o cronômetro soma esse deslocamento ao progresso e aos tempos.

Dos achados menores, dois foram corrigidos: a sessão e o neutro que uma captura morta deixa em `tools/bancadas/out/sessoes/` são varridos por idade (mais de seis horas, e nunca os arquivos em uso pela chamada ou pelas capturas compartilhadas), e `arquivoDoNeutroDaSessao` recusa o nome que não termina em `.json`, em vez de devolver o próprio arquivo da sessão.

O neutro canônico e as imagens não mudaram. O hash do neutro (`impressaoDoNeutro`) e o de cada PNG da captura em memória (vistas isométrica, direita e superior, com auditoria) são os mesmos no commit `0eb64433`, extraído para uma pasta à parte, e depois das correções: `braco-robotico/flange`, neutro `7a032a860c69cd3f` e imagens `655af8945b7f1891`, `19f2cc97fe0267e8` e `e7a7ffeebd37dea4`; `bicicleta-urbana`, neutro `840cfcd38189a987` e imagens `0335123a158e46d1`, `94779ac10b941c39` e `c575a7b9d3376e31`. A `prova-da-captura.mjs` também deu zero pixels diferentes nas duas peças, com o caminho `gravado` na captura de agora e `executado` nas de antes (as duas últimas linhas de [`prova-da-captura.jsonl`](prova-da-captura.jsonl)).

### Limitações conhecidas

- A tomada de uma trava de processo morto renomeia a trava antes de apagá-la, mas dois processos que a tomam no mesmo instante podem, num caso raro, levar a trava nova do outro; o custo é um ponto ou uma entrada de índice perdidos, nunca um resultado diferente.
- O pid da trava pode ser reaproveitado por outro processo; nesse caso a trava é tratada como viva até o prazo de 1 s, e quem espera segue sem gravar.
- A impressão da entrada é o hash da receita em JSON: o que o JSON não guarda (funções, o valor indefinido de um objeto) não entra nela. Uma mudança só nisso não troca a impressão, e o neutro gravado serviria à receita nova; o que a receita faz com uma função é lido pelo núcleo ao executar, e uma receita que muda só num valor assim é a mesma sessão para a página.
- A página lê o neutro por uma requisição síncrona, porque o processamento do payload é síncrono; o neutro de uma peça pesada (o do furgão passa de dezenas de megabytes em texto) bloqueia a página enquanto carrega.
- O neutro do cache da receita inteira volta sem os campos que o núcleo deixa fora da enumeração, de modo que a ativação o refaz pelo cache por prefixo quando precisa dele para a página; com `--sem-cache` isso não ocorre, porque a execução é nova.
- A varredura de sessões abandonadas usa só a idade do arquivo; uma sessão em curso de outro processo que passe de seis horas sem ser reescrita seria apagada.
- Na volta do texto, o `artefato` deixa de estar congelado e as referências compartilhadas viram cópias (125 na bicicleta, como `frisos[4].extremos[1][3]`, que apontava para o mesmo objeto que um vértice de `V`); hoje a página não altera esses objetos.
- As chaves de objeto que começam pelo caractere nulo não são escapadas, e um objeto cuja única chave é `"\u0000Map"` voltaria como Map.
- A ativação usa `origens` como sinal de que o neutro está completo, o que depende de o núcleo continuar gravando esse campo.
- A captura do quarto traseiro, que tem o maior neutro e é a maior leitura síncrona da página, não tem prova por imagem.
