# Ferramentas das rodadas: fatia 2, o cache por passo e `--params` nas medidas

Registro das fatias 2 e 3 do plano [ferramentas das rodadas](../../planos/2026-11-18-ferramentas-das-rodadas.md). A fatia 2 foi medida em 2026-11-18 sobre a lataria do carro (`carro-fastback/lataria`, receita de sha256 `bda6950a`, 10 passos, o primeiro deles a `subdivisao` da chapa), numa máquina de 4 núcleos, com Node 22.23.4 e uma medida por vez.

## O que entrou

`tools/modelar/entrada-de-medida.mjs` ganhou `executarComCachePorPasso`, que executa a receita com a memória por prefixo de `tmp/cache-por-prefixo/`, a mesma do `descrever` e da bancada. O que o cache guarda e a chave dele não mudaram. A zebra numérica, o `conferir-pontos` e a medição de `rodada-de-modelagem --acao` passaram a executar por ela. No `--acao` a receita atual executa uma vez para o referencial, os pontos e as faces finas, e as duas guardas (`guarda:acervo` e `guarda:referencial`) recebem o cache ou a execução pronta por opção, desligada no gate. A cópia da receita que a rodada guardou, lida para comparar a forma, guarda só o estado final, porque ninguém a edita.

`--params=<json ou caminho de .json>` entrou na zebra numérica e no `conferir-pontos`. Os parâmetros entram na chave pelo que ela já encadeia (o dicionário da receita, os aliases e o conteúdo de cada passo), e a variante tem índice próprio, para não tirar do índice os pontos da receita do arquivo. A opção é recusada quando o arquivo da receita lê a tabela dos parâmetros direto, fora de `this.PARAMS`, porque a variante teria os passos novos e esses dados velhos.

## Os tempos

Cada linha é um processo novo, cronometrado por fora, do comando à saída. "Antes" é o código do envio 749e7647, sem cache; "primeira" é a medida nova com `tmp/cache-por-prefixo/` vazia; "segunda" é a mesma medida repetida em seguida.

| medida | antes | primeira, cache vazio | segunda, pelo cache | resultado |
| --- | --- | --- | --- | --- |
| `node tools/modelar/zebra-numerica.mjs procedural/pecas/carro-fastback/partes/lataria/receita.js` | 79,9 s | 84,3 s | 2,8 s | o JSON das três é o mesmo arquivo, byte a byte (sha256 `55b17faa`) |
| `node tools/modelar/rodada-de-modelagem.mjs carro-fastback/lataria --acao` | 514,0 s | 288,9 s | 105,2 s | a saída das três é a mesma, byte a byte (sha256 `d0f50df0`) |
| `node tools/modelar/conferir-pontos.mjs carro-fastback/lataria` | 120,7 s (`--sem-cache`) | não medida | 2,3 s | os mesmos desvios, 4,56 mm e 2,84 mm |

A zebra da lataria inteira, nas três execuções: 17825 pontos, passo efetivo 26,558 mm, 115 extremos, 121 laços, 123,991 laços esperados; por faixa de onda, 21 extremos e 6 laços abaixo de 100 mm, 17 e 8 de 100 a 200, 36 e 19 de 200 a 500, 41 e 88 de 500 em diante. Na segunda a execução da `subdivisao` foi de 81,6 s para 1,0 s de leitura do estado guardado.

O `conferir-pontos` da segunda coluna não tem primeira medida própria: ele recomeçou do estado que o `--acao` tinha guardado para a mesma receita (10 de 10 passos servidos), que é o caso de uso do laço.

## O que sobra no `--acao`

Dos 105 s da segunda medida, 76 s são das réguas de dobra e vinco dentro do `descrever`, que executam a `subdivisao` de novo para capturar a gaiola e não passam pela memória por prefixo; o resto é a medida das partes, dos contatos e da referência. A primeira medida com cache vazio levou 288,9 s, e a divisão desse tempo entre a execução do `descrever`, a execução só dos passos que a guarda do acervo faz sem o TOPO e os aliases e a execução da cópia da rodada anterior não foi medida.

## O custo em disco

Depois das duas medidas do `--acao` a pasta `tmp/cache-por-prefixo/` tinha 456 MB em 12 pontos, cada ponto da chapa com 39 a 52 MB. Guardando todos os passos caros da cópia da rodada, eram 857 MB em 21 pontos, e por isso a cópia guarda só o estado final.

## A recusa de `--params` na lataria

A receita da lataria é recusada, e a mensagem lista as cinco linhas: `AJUSTES_DE_CURVA` (281), `ALIASES` (609), os dois `PONTOS` (634 e 635) e a saliência do rebaixo no `PLANO` (676), todos lidos de `TABELA` direto. Enquanto a receita não ler esses dados por `this.PARAMS`, a variante dela se mede editando a tabela no arquivo, e o cache por passo refaz só do passo que mudar.

## Limites conhecidos

A leitura que decide a recusa é por texto e só do arquivo da receita: o arquivo importado que leia a tabela não é visto, e o parâmetro de função com o mesmo nome da tabela é acusado sem ser leitura dela. O `descrever` e a vista rápida não receberam `--params` nesta fatia, e a vista rápida segue sem o cache, porque os arquivos deles estão fora do território do plano.

## Fatia 3: o pente com vários cortes, guiado pela zebra ou em grade

Medida em 2026-11-18 sobre a mesma lataria (receita de sha256 `bda6950a`), na mesma máquina, uma medida por vez.

### O que entrou

O pente de curvatura (`tools/modelar/pente-de-curvatura.mjs`) corta vários planos numa execução. A receita em arquivo executa uma vez, pelo cache por passo, e a malha é lida uma vez para todos os cortes. Os planos vêm de `--cortes=x:400,y:600`, de `--grade=<eixo>:<de>:<até>:<passo>` (repetível) e de `--guiado-pela-zebra=<json>`, que lê a saída da zebra numérica e pede, para cada ilha, os dois cortes pelos eixos perpendiculares ao olhar da região que passam pelo ponto dela, do lado do olhar. As ilhas entram da maior persistência para a menor, o corte a menos de um passo da zebra de outro do mesmo eixo e lado não se repete (a ilha fica anotada no vizinho), e `--maximo-de-cortes` (padrão 24) limita o total e conta os que ficaram de fora. A saída é um JSON com os saltos e as trocas de sinal de cada corte e uma tabela, que sai também em texto. No corte guiado a tabela separa os saltos e as trocas que caem a meia onda do ponto de cada ilha. A imagem por corte só sai com `--imagens`, e as amostras com `--amostras`. O corte único por `--corte` segue igual, e passou a usar o mesmo cache.

`--caixa=<eixo>:<min>:<max>,...` entrou porque a prova no carro mostrou que sem ela a tabela não se lê: o plano atravessa a lataria inteira (vincos, bordas de vão e a outra banda), e a caixa limita a conta ao trecho de dentro dela.

O pente entrou nas fontes vigiadas de `tools/gates/recusas-exercitadas.mjs`, com teste para cada recusa dele, as três que já existiam e as novas.

### Os tempos

| medida | tempo | resultado |
| --- | --- | --- |
| `node tools/modelar/zebra-numerica.mjs procedural/pecas/carro-fastback/partes/lataria/receita.js --caixas=tools/fixtures/curvas-lisas/carro-caixas.json --saida=<zebra.json>`, sem estado guardado | 75,0 s | 8 regiões, 42 ilhas no arquivo |
| `node tools/modelar/pente-de-curvatura.mjs procedural/pecas/carro-fastback/partes/lataria/receita.js --guiado-pela-zebra=<zebra.json>`, pelo cache (10 de 10 passos) | 2,6 s, dos quais 0,4 s nos 24 cortes | 24 cortes, 35 de fora pelo máximo |
| o mesmo com `--maximo-de-cortes=80` | 2,5 s, dos quais 0,6 s nos 51 cortes | as 42 ilhas em 51 cortes, nenhum de fora |
| `... --grade=y:400:650:50 --lado=+x --caixa=x:600:2000,z:-690:-20 --sem-cache` | 115,7 s | 6 cortes |
| o mesmo pelo cache | 1,9 s, dos quais 0,2 s nos 6 cortes | o JSON é o mesmo da execução sem cache, byte a byte |

Antes desta fatia cada corte era uma execução, e os 24 cortes guiados seriam 24 execuções.

### A tabela dos cortes guiados pela zebra

A zebra da lataria com as caixas do carro: porta 2 extremos e 0 laços, tras 7 e 2, trasSemArco 4 e 1, ombro 14 e 3, coluna 3 e 1, teto 0 e 0, tampa 6 e 13, traseira 6 e 4. Os 24 cortes do padrão, na ordem da persistência das ilhas:

| corte | lado | origem | curvas | saltos | maior salto (1/m) | onde (x, y, z em mm) | trocas de sinal | ilhas | saltos nas ilhas | maior salto nas ilhas (1/m) | trocas nas ilhas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| x:417 | +y | zebra: tampa | 5 | 12 | 28,657 | 417, 1023, -2216 | 9 | 1 | 4 | 20,717 | 4 |
| z:-1864 | +y | zebra: tampa | 7 | 26 | 17,607 | 709, 1014, -1864 | 8 | 2 | 5 | 6,196 | 3 |
| x:326 | +y | zebra: tampa | 5 | 18 | 26,640 | 326, 1039, -2197 | 7 | 1 | 7 | 9,058 | 2 |
| z:-1930 | +y | zebra: tampa | 3 | 30 | 55,117 | 712, 996, -1930 | 8 | 1 | 4 | 4,454 | 1 |
| x:320 | -z | zebra: traseira | 7 | 17 | 26,027 | 320, 1025, -2214 | 5 | 1 | 3 | 16,302 | 2 |
| y:901 | -z | zebra: traseira | 11 | 0 | - | - | 14 | 1 | 0 | - | 1 |
| y:987 | +x | zebra: ombro | 6 | 22 | 23,113 | -739, 987, -373 | 10 | 11 | 7 | 22,836 | 3 |
| z:-833 | +x | zebra: ombro, tras, trasSemArco | 6 | 24 | 71,302 | 765, 987, -833 | 12 | 6 | 8 | 71,302 | 6 |
| z:-266 | +x | zebra: ombro, coluna | 2 | 38 | 57,008 | -743, 963, -266 | 18 | 3 | 8 | 56,319 | 5 |
| x:278 | +y | zebra: tampa | 5 | 18 | 27,147 | 278, 1040, -2197 | 7 | 1 | 5 | 7,639 | 3 |
| z:-2004 | +y | zebra: tampa | 5 | 28 | 53,668 | 685, 998, -2004 | 6 | 3 | 3 | 3,075 | 2 |
| x:469 | +y | zebra: tampa | 6 | 11 | 30,453 | 469, 1019, -2214 | 8 | 1 | 2 | 2,126 | 2 |
| x:588 | -z | zebra: traseira | 3 | 11 | 46,605 | 588, 1006, -2163 | 7 | 2 | 4 | 46,605 | 1 |
| y:944 | -z | zebra: traseira | 9 | 10 | 2,435 | 557, 944, -2198 | 8 | 1 | 0 | - | 0 |
| y:1032 | +x | zebra: ombro | 8 | 13 | 20,383 | -486, 1032, -2178 | 12 | 1 | 0 | - | 0 |
| y:678 | +x | zebra: tras, trasSemArco | 4 | 2 | 0,570 | -655, 678, -2245 | 2 | 2 | 0 | - | 1 |
| y:299 | +x | zebra: tras, trasSemArco | 6 | 5 | 0,565 | -935, 299, -958 | 2 | 2 | 1 | 0,547 | 1 |
| z:-933 | +x | zebra: tras, trasSemArco | 6 | 22 | 68,228 | 776, 989, -933 | 10 | 2 | 2 | 4,277 | 1 |
| y:353 | +x | zebra: tras | 6 | 4 | 0,458 | -629, 353, -2257 | 5 | 2 | 0 | - | 0 |
| z:-1663 | +x | zebra: tras | 2 | 28 | 59,841 | 768, 993, -1663 | 16 | 1 | 0 | - | 0 |
| z:-333 | +x | zebra: ombro | 2 | 37 | 64,993 | -741, 973, -333 | 18 | 1 | 10 | 63,993 | 6 |
| z:-1033 | +x | zebra: tras | 4 | 27 | 67,787 | 783, 990, -1033 | 6 | 1 | 0 | - | 0 |
| z:-400 | +x | zebra: ombro | 2 | 38 | 70,670 | -741, 979, -400 | 18 | 1 | 19 | 65,727 | 9 |
| x:106 | +y | zebra: tampa | 5 | 20 | 24,662 | 106, 1044, -2193 | 7 | 1 | 2 | 4,616 | 2 |

As colunas de saltos, maior salto e trocas de sinal contam a seção inteira, que passa por vincos, bordas de vão e pela outra banda da carroceria (o lado `+x` pega a pele de fora de uma banda e a de dentro da outra, de onde vêm os pontos de x negativo). As três últimas colunas contam só o que cai a meia onda do ponto de uma ilha, e são as que dizem o que há no lugar que a zebra apontou. As ilhas do ombro e da tampa ficam em cima de vincos (saltos de 20 a 70 1/m), e as do quarto traseiro (`y:678`, `y:299`, `y:353`) ficam em chapa quase lisa, com no máximo um salto de 0,5 1/m e uma troca de sinal por ilha.

As duas ilhas da porta têm persistência baixa (0,011 e 0,006) e ficam fora dos 24 primeiros. Com `--maximo-de-cortes=80`, os cortes que passam por elas:

| corte | lado | origem | curvas | saltos | maior salto (1/m) | onde (x, y, z em mm) | trocas de sinal | ilhas | saltos nas ilhas | maior salto nas ilhas (1/m) | trocas nas ilhas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| z:-233 | +x | zebra: ombro, porta | 2 | 38 | 53,176 | -744, 958, -233 | 18 | 2 | 6 | 52,938 | 2 |
| y:729 | +x | zebra: porta | 4 | 2 | 2,361 | -775, 729, -2112 | 7 | 1 | 0 | - | 1 |
| z:-433 | +x | zebra: porta | 4 | 35 | 71,232 | 743, 983, -433 | 18 | 1 | 2 | 2,693 | 1 |
| y:859 | +x | zebra: tras, trasSemArco, porta | 7 | 0 | - | - | 14 | 3 | 0 | - | 3 |

### A grade pelo flanco da porta

O crítico da rodada 7 viu ondas no flanco da porta, e a zebra não conta laço ali. A grade pedida, de y 400 a 650 a cada 50 mm, do lado `+x`, na caixa da porta (`--caixa=x:600:2000,z:-690:-20`), corta ao comprido do carro:

| corte | lado | origem | curvas | saltos | maior salto (1/m) | onde (x, y, z em mm) | trocas de sinal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| y:400 | +x | grade | 1 | 0 | - | - | 0 |
| y:450 | +x | grade | 1 | 0 | - | - | 0 |
| y:500 | +x | grade | 1 | 0 | - | - | 2 |
| y:550 | +x | grade | 1 | 0 | - | - | 0 |
| y:600 | +x | grade | 1 | 0 | - | - | 0 |
| y:650 | +x | grade | 1 | 0 | - | - | 0 |

Nesses seis cortes o pente não vê salto. A curvatura fica entre -0,41 e +0,10 1/m, e as duas únicas trocas de sinal estão em `y:500`, a 16 mm uma da outra perto de z -660, com a curvatura a menos de 0,1 1/m do zero. Ao comprido, o flanco não ondula.

Os cortes na outra direção, a seção vertical da porta, não foram pedidos e foram acrescentados (`--grade=z:-600:-100:100 --lado=+x --caixa=x:600:2000,y:250:880`):

| corte | lado | origem | curvas | saltos | maior salto (1/m) | onde (x, y, z em mm) | trocas de sinal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| z:-600 | +x | grade | 1 | 6 | 3,936 | 911, 286, -600 | 4 |
| z:-500 | +x | grade | 1 | 5 | 4,160 | 911, 286, -500 | 4 |
| z:-400 | +x | grade | 1 | 7 | 4,350 | 912, 296, -400 | 2 |
| z:-300 | +x | grade | 1 | 7 | 4,413 | 912, 296, -300 | 2 |
| z:-200 | +x | grade | 1 | 9 | 4,443 | 912, 296, -200 | 2 |
| z:-100 | +x | grade | 1 | 9 | 4,433 | 912, 296, -100 | 2 |

Aqui o pente vê o que a zebra não conta. Nos seis cortes a curvatura troca de sinal em y 526 a 543 e em y 650 a 653, e salta nas bordas dessa faixa: de 0,6 a 1,4 1/m em y 540 a 581 e de 1,0 a 1,9 1/m em y 661 a 696. De z -400 para a frente há mais um salto de 0,4 1/m em y 441 a 456 e um de 0,6 a 1,0 1/m em y 744 a 768. Os saltos maiores, de 3,9 a 4,4 1/m em y 286 a 296 e de 2,1 a 4,1 1/m em y 811 a 868, são da virada da soleira e do ombro. Em z -600 e -500 há mais duas trocas, em y 336 a 384. A faixa entre essas duas trocas tem a mesma posição em toda a porta: é uma listra que corre ao comprido, sem fechar laço, e por isso a zebra numérica, que conta ilhas fechadas, dá zero laços na porta. O pente não diz se a faixa é a forma pedida ou defeito, e a comparação com a prancha é da rodada do carro.

### Limites conhecidos

O corte guiado conta a seção inteira e separa o que fica perto da ilha pela distância ao ponto dela; ele não recebe a caixa da região, que não está na saída da zebra. O `--lado` escolhe pela normal, e numa carroceria de duas bandas a pele de dentro da outra banda entra junto; a `--caixa` a tira. As ilhas que a zebra escreve são no máximo 12 por direção de cada região.
