# Pergunta 5 (primeira metade): operações contra uso real e verbosidade das receitas

Medido em 2026-11-13 sobre a árvore sem alterações. Os scripts ficam fora do repositório, em `/tmp/claude-0/-home-user-nos-modelar/a45881b0-884a-5495-8d79-e44b78fae420/scratchpad/inventario-5a/`, e todos os comandos abaixo rodam daquela pasta: `node uso.mjs > uso.json` (importa as receitas e guarda os PASSOS), `node analisa.mjs` (itens 1 e 2), `node verbosidade.mjs > verb.json` (item 3, e grava `aux.json`), `node dup.mjs` e `node dup2.mjs` (funções repetidas), `node testes.mjs` (item 4). Nenhum deles leva mais de alguns segundos.

## O que é a receita vigente e como foi contada

Há 49 pastas em `procedural/pecas`. A receita vigente é `pecas/<peça>/receita.js` (43 peças) e `pecas/<peça>/partes/<etapa>/receita.js` (60 partes de 6 peças: aviao, braco-robotico, carrinho-de-mao, empilhadeira, instalacao-solar, sedan-chassi-e-lataria), 103 receitas ao todo. As cópias em `rodadas/` (260 arquivos) ficam de fora, assim como `referencias/`, `alta-definicao/` e `conferencia/`. Nenhuma das 43 receitas de topo escreve PASSOS como lista literal: todas expõem `get PASSOS` ou `gerarPassos`, que monta a lista a partir da TABELA. Por isso o script importa cada receita e lê o `PASSOS` resultante (9 042 passos, sem nenhum nome de operação fora do registro), em vez de ler o texto. O registro tem 42 operações no núcleo (`REGISTRO_OPERACOES.listar()`) e 5 extensões (casca, chapaDobrada, articulacao, estruturaDeBarras, prismaTriangular, em `procedural/extensoes`), que só entram num registro montado por `criarRegistroComExtensoes`. As composições de família já chegam expandidas nos PASSOS.

## 1. Uso por operação (fato medido)

Das 42 operações do núcleo, 28 aparecem em alguma receita vigente e 14 não aparecem em nenhuma: apagaFace, cone, displace, encostar, esfera, extruda, filete, inflate, mescla, moveA, moveF, pesar, plano e vira. As 5 extensões também não aparecem em nenhum PASSOS vigente. Quem as usa fora das receitas vigentes, por busca do nome entre aspas (`grep -rlE "['\"]op['\"]"`, que também pega usos homônimos): plano aparece em 29 arquivos de `rodadas/` e em 3 composições de família; cone, em 1 rodada e 1 família; inflate e mescla, em 2 rodadas cada; filete, em 1 esboço de referência; esfera e cone, em código de `src/` e `tools/` que pode ser outro uso do nome. apagaFace, displace, encostar, extruda, moveA, moveF, pesar e vira só aparecem em testes. A casca aparece em composições de três famílias (cilindro-hidraulico, dobradica, movel-de-caixa), e a articulação é lida por `src/autoria/conferir-articulacao.js`.

Usadas por uma peça só: moveV (53 passos, aviao), limparLascas (38, sedan-chassi-e-lataria), aberturaPorContorno (17, furgao-realista), aparar (15, sedan-chassi-e-lataria) e furo (1 passo, braco-robotico). Com duas ou três peças: pincel (174 passos, 3 peças), loft (58, 3), espelha (49, 2), friso (40, 2) e arredondarCostura (5, 2).

| operação | passos | peças | operação | passos | peças |
|---|---:|---:|---|---:|---:|
| parte | 2 336 | 49 | intersectar | 297 | 30 |
| material | 2 157 | 47 | cilindro | 265 | 20 |
| extrusao | 1 319 | 40 | lathe | 263 | 23 |
| cubo | 597 | 35 | pincel | 174 | 3 |
| liso | 374 | 22 | solido | 149 | 5 |

As dez mais usadas somam 7 931 dos 9 042 passos (87,7%). parte e material sozinhas são 4 493 (49,7%). As outras operações têm 5 a 135 passos cada, e 19 das 42 operações do núcleo (14 sem uso, 5 de uma peça só) ficam fora do uso corrente.

Leitura: o catálogo é largo e o uso real é estreito. A IA que escreve receita parte, na prática, de umas dez operações, e as 14 sem uso não custam nada a ela além do tamanho do catálogo (a revisão da pergunta 2 mede o que isso pesa na leitura). Cada uma das 14 tem um exemplo executado pelo teste do catálogo, então o custo de mantê-las é baixo; o ganho de cortar uma depende de quem a usa, e a lista acima diz quem: nenhuma receita vigente, mas rodadas antigas (plano, inflate, mescla, cone), composições de família (plano, cone, casca) ou só teste (as oito restantes).

## 2. Sequências que andam juntas (fato medido)

`analisa.mjs` conta pares e trios de operações consecutivas dentro de cada receita. O achado dominante é parte seguida de material: 2 118 pares em 47 peças, e nos 2 118 a seleção (`sel`) do material é idêntica à da parte logo antes. Em 245 casos a ordem é a inversa (material e depois parte), todos em instalacao-solar e furgao-realista. Ou seja, 2 363 pares (4 726 passos, 52% de todos) são o mesmo gesto escrito em dois passos com o mesmo seletor. O esquema de `parte` aceita `sel, faces, nome, pai, pivo, substituir` e o de `material` aceita `sel, faces, usa`; não há campo de material em `parte`.

| sequência | ocorrências | peças |
|---|---:|---:|
| parte > material | 2 118 | 47 |
| material > extrusao | 680 | 34 |
| extrusao > parte | 524 | 38 |
| cubo > parte | 469 | 29 |
| extrusao > extrusao | 413 | 32 |
| extrusao > extrusao > intersectar | 208 | 25 |
| intersectar > parte | 233 | 29 |

Os trios mais frequentes são todos recortes da cadeia forma, parte, material (parte > material > extrusao, 679 em 33 peças; extrusao > parte > material, 499 em 34). O único trio de geometria é extrusao > extrusao > intersectar: 208 ocorrências em 25 peças, 70% dos 297 passos de intersectar, é a forma por duas vistas (perfil lateral extrudado em x, seção frontal extrudada em z, interseção dos dois), que a carroceria de carro-suv escreve à mão e que 25 peças repetem com perfis próprios.

Argumentos repetidos, medidos tirando as chaves de identidade (`id`, `origemId`, `nome`, `alias`, `origem`, `parte`, `em`): 684 assinaturas aparecem em 2 ou mais passos e cobrem 7 531 dos 9 042 passos, mas quase tudo é parte e material (a assinatura `parte {sel}` sozinha tem 2 313). Fora essas, o que repete é geometria idêntica dentro de uma peça só: em instalacao-solar, `cubo` de 0,0864 x 0,0004 x 0,165 aparece 120 vezes e `cilindro` de raio 0,011 e 12 lados, 104 vezes, cada um seguido de parte e material com o mesmo uso (`celula`, `parafuso`). A peça tem 1 846 passos e usa `arranja` em nenhum (arranja tem 25 passos, em 5 peças). Passos idênticos e consecutivos são pouco: 48 sequências, 156 passos (1,7%), sobretudo extrusao (42) e liso (22).

Leitura: duas candidatas a nome, e ambas já têm o gesto escrito em todas as receitas. A primeira é um modo de `parte` que também declare o material, que tiraria até 2 118 passos (23%) e tira de cada receita a obrigação de repetir o seletor. A segunda é a forma por duas vistas (extrusao, extrusao, intersectar, que tem 208 casos), que o núcleo ainda não nomeia. Não medi se `lacos-pelas-vistas.js` ou a gaiola já cobrem esse caso. A repetição de peças iguais dentro de uma peça (solar) pede `arranja` ou uma composição, e hoje as receitas preferem um laço em JavaScript.

## 3. Verbosidade (fato medido)

Linhas por peça contam a receita vigente, os arquivos em `receita/` e `partes/_comum/`, sem testes, `rodadas/`, `referencias/`, `alta-definicao/` e `conferencia/` (`verbosidade.mjs`). Total de 38 061 linhas para 9 042 passos, 4,2 linhas por passo; a mediana é de 547 linhas por peça, com 130 passos. Nas 46 peças com 20 passos ou mais, a mediana é de 4,4 linhas por passo. Fora delas há extremos: carenagem-de-prova com 103 linhas por passo (3 passos, 310 linhas) e braco-robotico com 16,7 (106 passos, 1 767 linhas). Como as receitas geram os passos, os 9 042 passos ocupam 8,6 MB de JSON contra 2,6 MB de código-fonte; furgao-realista expande 4 067 linhas em 3,7 MB e sedan-chassi-e-lataria, 836 linhas em 1,6 MB, porque carregam contornos e lofts inteiros.

A classificação de linhas é heurística: comentário, em branco, bloco `TABELA`, linhas fora da TABELA com 4 ou mais números literais, linhas que citam uma operação entre aspas, e o resto, que é código de derivação. No total: comentário 17,5%, em branco 7,3%, TABELA 11,2%, números literais fora da TABELA 4,8%, chamada de operação 4,7%, código 55,0%. Ou seja, a tabela de números literais é 16% das linhas e a chamada de operação é menos de 5%; a maior parte da receita é código que deriva medidas e monta os passos.

| peça | linhas | passos | linhas/passo | comentário | TABELA | números | chamada | código |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| aviao (8 receitas) | 4 640 | 788 | 5,9 | 20% | 7% | 4% | 4% | 57% |
| empilhadeira (19 receitas) | 4 129 | 576 | 7,2 | 28% | 10% | 5% | 3% | 49% |
| furgao-realista | 4 067 | 637 | 6,4 | 16% | 9% | 8% | 4% | 59% |
| instalacao-solar (11) | 2 644 | 1 846 | 1,4 | 18% | 10% | 4% | 7% | 54% |
| braco-robotico (13) | 1 767 | 106 | 16,7 | 27% | 9% | 4% | 7% | 48% |

As cinco juntas são 17 247 linhas, 45% do total. Em aviao, as partes asas (840 linhas), empenagem-vertical (795), empenagem-horizontal (661) e fuselagem (655) têm, cada uma, funções de derivação de contorno e estação (`estacaoDoComando`, `contornoDoComando`, `loftEmX`, `caixasDoLadoDireito`) entre a TABELA e o `gerarPassos`. Em furgao-realista, `receita.js` tem 1 393 linhas e `receita/gaiola.js`, 840. Em empilhadeira, `partes/carcaca/receita.js` tem 532 e a pasta `receita/` ao lado, mais 4 arquivos. Em instalacao-solar, o peso está em 11 receitas pequenas e em `conferencias.mjs` (268). Em braco-robotico, 13 receitas curtas, 4 delas com `gerarPassos` idêntico de 24 linhas (anel-antebraco e anel-punho-4, 5 e 6).

Repetição entre peças (`dup.mjs`, `dup2.mjs`): achei 1 880 definições de função de nível de arquivo, 165 nomes definidos em 2 ou mais peças e, entre eles, 82 com o mesmo corpo normalizado (sem comentário e espaço) em 2 ou mais peças. Peças com partes contam uma vez. Os maiores grupos de corpo idêntico: `m` (conversão mm para metro, 1 linha) em 48 das 49 peças; `area` e `antihorario` (orientação de contorno) em 23 cada; `espelhar` e `perfilM` em 9; `perfilLateral`, `secaoFrontal`, `placaSobre`, `emMetro`, `reta` e `cilindroInteiro` (7 linhas) em 8 cada. `perfilLateral` tem 17 definições, só 8 iguais; carro-suv escreve `areaComSinal` onde carro-taxi escreve `area`, o mesmo cálculo com outro nome. As linhas copiadas além da primeira, nos corpos de 2 linhas ou mais com cópias em peças distintas, somam 491 (1,3% das linhas). Das 43 receitas de topo, 41 não têm nenhum `import`: cada uma é autocontida.

Leitura: a repetição de auxiliares é grande em contagem de definições e pequena em linhas. O que ela custa à IA é outro lado: cada receita nova reescreve `m`, `area`, `antihorario` e orientação de contorno por conta própria e pode errar o sentido, e a regra do projeto de levar a correção para a ferramenta geral não alcança funções que cada peça carrega. Não verifiquei quais destas o núcleo já exporta (por exemplo em `curva2d.js` ou `contorno.js`).

## 4. Teste próprio e catálogo (fato medido)

`testes.mjs` varre os 516 arquivos de teste versionados. Das 42 operações do núcleo, 24 têm arquivo de teste com o nome dela no nome do arquivo (kebab-case), 18 não têm: apagaFace, chamferBox, displace, esfera, extruda, filete, inflate, intersectar, mescla, moveA, moveF, moveV, pesar, pincel, publicarPorta, rotaciona, transladar e vira. As 42 aparecem como passo em ao menos um teste e 36 em três ou mais; com um ou dois testes ficam displace (1), aparar, encostar, extruda, inflate e moveA (2 cada). Além disso, `catalogo.test.mjs` executa o exemplo de cada uma das 42 e exige que não sobrem órfãos. Das 5 extensões, 4 têm arquivo próprio (`extensao-*.test.mjs`, `casca.test.mjs`) e prismaTriangular aparece em 3 arquivos sem nome próprio.

No catálogo gerado (`docs/modelar/gerado`), as 42 operações têm intenção, schema e campos obrigatórios em `catalogo-capacidades.json` e em `CATALOGO-CAPACIDADES.md`, e as 42 têm exemplo em `schemas-operacoes.json` (174 KB), que o `CATALOGO-CAPACIDADES.md` e o `catalogo-capacidades.json` não trazem. As 5 extensões não estão no catálogo: ele é gerado de `REGISTRO_OPERACOES` sem extensões, com 1 módulo.

## O que não consegui medir

O tempo por operação nas peças pesadas e a qualidade das mensagens de erro são da outra metade da pergunta e não foram tocados. Não medi se uma operação nova poupa passos em cada receita, só quantos passos têm o padrão. A divisão da receita em TABELA, números, chamada e código é por heurística de linha e erra nas bordas (objetos literais fora da TABELA contam como código). O nome entre aspas em outros diretórios pode ser outro uso do mesmo nome (esfera, cone, plano). O catálogo dos argumentos e a coerência de nomes entre operações ficaram para a outra metade.

## Achados

1. Parte e material repetem o mesmo seletor em 2 118 pares (23% dos passos podiam sumir, 26% com os 245 pares de ordem inversa, 47 peças). Atrapalha a IA que escreve receita? Sim, pouco por passo e muito em volume: é metade da lista de passos que ela gera e confere, e um seletor trocado em um dos dois dá material em face errada sem erro. Quem usa: 47 de 49 peças.
2. A forma por duas vistas (extrusao, extrusao, intersectar) tem 208 casos em 25 peças. Atrapalha? Moderadamente: cada peça reescreve a conta de eixos e sentido do contorno (o comentário de carro-suv explica os eixos da extrusão), e é onde o erro de orientação mais aparece. Falta medir se já existe operação que a cubra.
3. 14 operações do núcleo e 5 extensões não aparecem em nenhuma receita vigente. Atrapalha? Quase nada: o catálogo tem 42 intenções, e a IA lê 28 em uso. Não recomendo tirar nenhuma sem decidir sobre os usos fora das receitas: plano (29 rodadas e 3 famílias), cone, inflate e mescla (rodadas), casca (3 famílias) e articulação (conferência em `src/autoria`).
4. As dez operações mais usadas são 87,7% dos passos, e 5 operações têm uma peça só como usuária. Atrapalha? Não; é sinal de que o catálogo de partida para a IA pode ser curto, e as de uma peça só (moveV em aviao, limparLascas e aparar no sedan, aberturaPorContorno no furgao-realista, furo no braco-robotico) são opções declaradas por peça.
5. A receita é 55% código de derivação e só 16% tabela de números literais e 5% chamada de operação; 45% das linhas estão em 5 peças. Atrapalha? Sim, nas peças grandes: aviao, empilhadeira e furgao-realista têm mais de 4 000 linhas cada, o que a IA lê para mexer em uma parte. Nas peças de carro de um arquivo só (500 a 800 linhas, 3 a 5 linhas por passo) o custo é menor.
6. 41 de 43 receitas de topo não importam nada e repetem auxiliares (`m` em 48 peças, `area` e `antihorario` em 23, outros 80 nomes em 2 a 9). Atrapalha? Pouco em linhas (1,3%), mais como fonte de divergência (nomes e corpos diferentes para a mesma conta). Candidatos a ferramenta geral: conversão mm para m, área com sinal e orientação anti-horária, espelhar, perfil lateral e seção frontal, desde que o núcleo ainda não os exporte.
7. 18 operações não têm arquivo de teste com o próprio nome e displace tem um só teste como passo, mas o teste do catálogo executa o exemplo das 42. Atrapalha? Não a IA que escreve receita; afeta a confiança nas oito operações sem receita nem família que as use.
8. As extensões não entram no catálogo gerado. Atrapalha? Sim, se a IA depender do catálogo para descobrir capacidade: casca, chapaDobrada, articulacao, estruturaDeBarras e prismaTriangular só são achadas lendo `procedural/extensoes`.
