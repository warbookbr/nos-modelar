# Pergunta 4: pastas e módulos (inventário medido, sem a comparação externa)

Medido em 2026-11-13 sobre os 1530 arquivos .js, .mjs e .ts versionados (`git ls-files`, o que exclui node_modules, dist e tmp), com scripts de rascunho fora do repositório. Cada script é citado pelo conteúdo essencial. A comparação com projetos externos, outra parte da pergunta 4, não está aqui.

## Método

O script de grafo lê cada arquivo, tira comentários e extrai com expressão regular `import ... from`, `export ... from`, `import('literal')`, `require('literal')` e `import 'x'`. Resolve o caminho relativo contra a lista versionada (extensões .js, .mjs, .ts e index) e atribui cada ponta a uma área pelo prefixo do caminho. Resultado: 3504 arestas, 3468 resolvidas a arquivos versionados e 36 não resolvidas (strings de teste que escrevem arquivos temporários, json, css e dois scripts de docs). Das resolvidas, 3380 são estáticas e 124 dinâmicas (60 em código, 64 em teste); nenhum `require` foi achado. Há 76 usos de `import(` com argumento não literal, que não entram. A área "outros" são scripts em docs/ e na raiz (655 arquivos) e fica fora das tabelas.

## 1. Matriz de dependência

A tabela conta arestas cujo arquivo de origem não é teste (1872 arestas, com as internas a cada área, que não aparecem). Linha importa coluna. Com testes na origem o total sobe para 3468. Colunas: nuc núcleo, cri critérios, ext extensões, fam famílias, srv serviços, pec peças, aut src/autoria, ban src/bancada, mod todos os módulos, tls todo tools/.

| de \ para | nuc | cri | ext | fam | srv | pec | aut | ban | mod | tls |
|---|---|---|---|---|---|---|---|---|---|---|
| núcleo | . | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| critérios | 0 | . | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| extensões | 14 | 0 | . | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| famílias | 9 | 0 | 7 | . | 0 | 0 | 12 | 0 | 0 | 0 |
| serviços | 1 | 0 | 0 | 0 | . | 0 | 0 | 0 | 0 | 0 |
| peças | 101 | 0 | 0 | 38 | 0 | . | 3 | 0 | 3 | 7 |
| src/autoria | 17 | 1 | 1 | 0 | 0 | 0 | . | 0 | 1 | 0 |
| src/bancada | 0 | 0 | 0 | 0 | 0 | 0 | 34 | . | 0 | 1 |
| módulos | 6 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | . | 0 |
| tools | 88 | 4 | 2 | 9 | 1 | 2 | 192 | 1 | 12 | . |

Os pares mais carregados por subpasta: tools/modelar para src/autoria 152, peças para núcleo 101, tools/modelar para núcleo 49, peças para famílias 38, src/bancada para src/autoria 34, tools/fixtures para núcleo 34, tools/mcp para tools/modelar 20. Entre os módulos, exportador-obj importa exportador-cad (3) e esboco-nucleo importa src/autoria (5) e núcleo (4); os outros cinco módulos não importam outro módulo em código.

Reproduz: `node grafo.mjs` (regex acima, grava arestas.json) e `node matriz.mjs codigo` (agrega por par de áreas; o argumento `todos` inclui testes).

## 2. Onde a fronteira é furada

Fato medido. O núcleo não importa, em código que não é teste, nada de src, tools, módulos, peças, famílias, serviços, critérios nem extensões (linha zero da matriz). Código que não é teste não importa arquivo de teste (0 arestas). Módulos não importam peças nem tools em código. As subidas de camada, por `node fronteira.mjs`:

| Subida | Código | Teste |
|---|---|---|
| núcleo para src, tools ou módulos | 0 | 54 arestas em 29 arquivos (tools/oficina 34, src/autoria 18, módulos 2) |
| núcleo para extensões | 0 | 17 em 6 arquivos |
| módulos para peças | 0 | 1 (esboco-nucleo/tests/variantes.test.js) |
| módulos para tools | 0 | 9 em 5 arquivos |
| src para tools | 1 | 40 |
| src para peças | 0 | 5 |
| peças para tools | 7 | 1 |
| peças para src | 3 | 2 |
| famílias e critérios para src/autoria | 13 | 37 |

As 11 arestas de código de peças e bancada para tools ou src, com arquivo e linha: src/bancada/sessao/montagem-em-dados.js:15 importa tools/modelar/peca-com-parametros.mjs; procedural/pecas/instalacao-solar/conferencias.mjs:14 a 17 importa dois arquivos de src/autoria e dois de tools/modelar; procedural/pecas/furgao-realista/referencias/quatro-vistas.prancha.mjs:29 importa tools/modelar/prancha/prancha.mjs; em sedan-chassi-e-lataria, alta-definicao/aba-no-sedan.rascunho.mjs:15 (dinâmico), exportar-trecho.mjs:7 e relato-do-carro.mjs:6 importam tools/modelar/vao-entre-partes.mjs, tempo-das-etapas.mjs:5 importa src/autoria/executar-receita.js e referencias/sedan-chassi-e-lataria.esboco.mjs:36 importa tools/modelar/instancia-de-familia.mjs. As 13 de famílias e critérios são todas para src/autoria: chamar-familia.js (11 arestas em 11 arquivos de famílias, uma delas procedural/familias/index.js:28), familia.js (familias/index.js:19) e perguntas-do-critico.js (criterios/index.js:4).

Palavras de domínio no núcleo (`node dominio.mjs`: 67 arquivos que não são teste nem fixture, comentários removidos, expressão com veículo, carro, roda, pneu, furgão, sedã, carroceria, porta, chassi, lataria, farol, janela, parede, motor e outras). Fora de comentário sobram duas linhas com termo de veículo, ambas em texto de mensagem: procedural/nucleo/uso-operacoes.js:258 (ajuda do argumento `sentido`, cita "carroceria") e procedural/nucleo/gaiola-aneis.js:1120 (texto do aviso de relevo, cita "o rebaixo do farol do sedã"). As outras cerca de 130 linhas achadas (`parede`, `porta`, `motor`, `janela`) são termos geométricos ou do próprio sistema (porta publicada, parede da casca, motor procedural). Em comentários, um grep pelos termos de veículo (sedã, furgão, veículo, carro, pneu, chassi, carroceria, roda, para-choque, farol, lataria) dá 60 linhas em 24 arquivos que não são teste, por exemplo moldura-do-vao.js:5, curva2d.js:339 e limpar-lascas.js:26 (várias dizem que o código não conhece veículo), e 29 arquivos de teste do núcleo citam algum deles. O termo `lente` é parâmetro da API: `abertura-por-contorno.js` tem 36 ocorrências, e `lente: true` e `parte: 'lente'` fazem parte do contrato do passo.

Leitura minha. A regra do núcleo está cumprida em código; os desvios estão em teste, em dois textos e em comentários. Sem cobertura de máquina: `tools/arquitetura/independencia-catalogo.mjs` só varre arquivos .js (os .mjs e .ts do núcleo ficam de fora) e só reprova `three` ou `pecas/`, então núcleo para src, tools ou módulos não é gate hoje, e o cabeçalho de nucleo-sem-three.mjs admite que a metade de domínio do invariante não se confere por máquina. A inversão de camadas maior é outra: famílias e critérios, que moram em procedural/, dependem de src/autoria, e peças dependem de tools/modelar. Em nível de área há três grupos mutuamente dependentes (`node ciclos-areas.mjs`, origem não teste): critérios com src/autoria; tools/(raiz) com tools/gates; e um grupo de cinco (peças, src/bancada, tools/bancadas, tools/mapa, tools/modelar), ligado por peças para tools/modelar 7 contra 1, tools/modelar para tools/bancadas 12 contra 1 e tools/modelar para tools/mapa 2 contra 1.

## 3. Por que tools/ tem quase o dobro das linhas do núcleo

Linhas contadas por quebra de linha em todos os arquivos versionados de cada pasta (`node linhas.mjs`, `node categorias.mjs`). A classificação é por regra de nome, minha: teste é `*.test.*`; fixture e dado é tudo sob fixtures, out e bench e todo .json; gerador de documento é tools/mapa, tools/catalogo, banco-de-provas.mjs e ferramentas-por-objeto.mjs; gate e guarda é tools/arquitetura, gates e testes, os arquivos soltos da raiz de tools, modelar/guardas, modelar/reguas-de-malha, procedencia-check, origens-check e quatro arquivos de bancadas; ferramenta de modelar é o resto de modelar, mcp, modelagem, blender e oficina.

| Categoria em tools/ | Linhas | Parte |
|---|---|---|
| ferramenta que a IA chama para modelar | 47694 | 38,7% |
| teste | 41513 | 33,7% |
| fixture e dado | 25470 | 20,7% |
| gate e guarda | 6106 | 5,0% |
| gerador de documento | 2236 | 1,8% |
| outros (harness das bancadas) | 84 | 0,1% |
| total | 123103 | 100% |

Contra o núcleo (procedural/nucleo, 197 arquivos, 56076 linhas): código 31420, teste 23090, fixtures em js 1096, dado 470. Sem fixture e dado, tools tem 97633 contra 54510 do núcleo, razão 1,79; com tudo, 2,20. Por categoria a razão é parecida: teste 41513 contra 23090 (1,80) e código 56120 contra 31420 (1,79). Dentro de tools, 24 arquivos Python do Blender somam 7364 linhas, opcionais e fora do CI.

| Subpasta de tools | Teste | Ferramenta | Gate | Documento | Fixture e dado | Total |
|---|---|---|---|---|---|---|
| modelar | 24939 | 33031 | 3685 | 498 | 18378 | 80531 |
| blender | 2764 | 8591 | 0 | 0 | 0 | 11355 |
| fixtures | 2108 | 0 | 0 | 0 | 6132 | 8240 |
| mcp | 2591 | 3488 | 0 | 0 | 700 | 6779 |
| oficina | 6339 | 190 | 0 | 0 | 0 | 6529 |
| modelagem | 270 | 2394 | 0 | 0 | 0 | 2664 |
| mapa | 957 | 0 | 0 | 1647 | 0 | 2604 |
| arquitetura | 738 | 0 | 870 | 0 | 49 | 1657 |
| raiz, gates, bancadas, catalogo, testes | 807 | 0 | 1551 | 91 | 211 | 2744 |

A última linha inclui 84 linhas de harness. Os dez maiores arquivos de tools/modelar (linhas): vistas-para-critica.mjs 1854, olhar-bancada.mjs 1570, vistas-para-critica.test.mjs 1006, descrever-peca.mjs 946, vincos-das-linhas.mjs 946, olhar-bancada.test.mjs 859, ondulacao-da-superficie.mjs 852, conferir-vistas.mjs 849, prancha/prancha.mjs 842, prancha/prancha-dos-contornos.test.mjs 815. Somam 10539, 13% da pasta, que tem 418 arquivos de média 193 linhas e responde por 65% de tools/.

Leitura minha. O excesso não é de gate nem de gerador de documento (7% juntos): é ferramenta de modelar mais o teste dela, na mesma razão de 1,8 do núcleo, e um quinto é fixture. O maior arquivo do repositório, tools/oficina/oficina.test.ts (5924 linhas), testa o núcleo e mora em tools/, de modo que parte do teste do núcleo (6339 linhas em tools/oficina) está fora de procedural/nucleo.

## 4. Ciclos e arquivos grandes

Ciclos entre arquivos (`node ciclos.mjs`, Tarjan sobre as arestas resolvidas). Há um só componente cíclico, de 13 arquivos, todos em tools/modelar: ativar-bancada, entrada-de-medida, esboco-nucleo, etapas-da-montagem, exportar-obj, lasca, leitura-por-regioes, linhas-do-modelo, modelo-aberto, olhar-bancada, rodada-de-modelagem, vista-rapida e vistas-de-superficie. Só com imports estáticos há zero ciclos; sete `import()` dinâmicos fecham o ciclo (entrada-de-medida.mjs:162 e 182, leitura-por-regioes.mjs:551 a 553, modelo-aberto.mjs:68, vistas-de-superficie.mjs:205). Nenhum arquivo importa a si mesmo.

Arquivos de código acima de 1500 linhas (`node linhas.mjs`): 18.

| Área | Arquivos | Maiores |
|---|---|---|
| procedural/pecas | 12 | furgao-realista/rodadas/receita-06 a receita-17, de 1675 a 2369 |
| procedural/nucleo | 3 | nucleo.js 3814, operacoes/booleanas.js 2513, operacoes/abertura-por-contorno.js 1592 |
| tools/modelar | 2 | vistas-para-critica.mjs 1854, olhar-bancada.mjs 1570 |
| tools/oficina | 1 | oficina.test.ts 5924 (teste) |

Fora de código há cerca de 60 arquivos acima de 1500 linhas (46 json, 11 svg, 2 md, 1 css), concentrados em referências de peças e no banco de provas, além de PNGs que a contagem de quebras de linha lê como binário. A pasta furgao-realista/rodadas tem 44 arquivos e 34375 linhas, 33% do código de procedural/pecas (104868), e nenhuma aresta de import aponta para ela.

## Achados

1. Fronteira do núcleo em código: limpa, zero arestas e duas linhas de texto com carroceria e sedã. Isso atrapalha a IA que modela? Não, o custo medido é zero. Falta gate: nenhuma régua cobre núcleo para src, tools ou módulos, nem arquivos .mjs e .ts do núcleo, e o processo atual não pegaria uma regressão.
2. Testes do núcleo importam tools (34 arestas), src (18) e módulos (2) em 29 arquivos. Atrapalha? Pouco: o núcleo roda sem isso, mas quem lê um desses testes precisa abrir tools/oficina/conferir-malha.ts e src/autoria.
3. Famílias e critérios, em procedural/, dependem de src/autoria (13 arestas), e peças dependem de tools/modelar (7) e src (3). Atrapalha quem desenvolve, porque procedural/ não é uma camada abaixo de src como o nome sugere: são 23 arestas em 1872 e três grupos de áreas mutuamente dependentes.
4. Um ciclo de 13 arquivos em tools/modelar, fechado só por 7 imports dinâmicos. Atrapalha? Pouco: 13 de 1375 arquivos e nenhum ciclo estático.
5. tools/ tem 1,79 vez o código e 1,80 vez o teste do núcleo, e só 7% é gate ou gerador de documento. Atrapalha? Tools/modelar (80531 linhas, 418 arquivos) é a superfície que a IA precisa conhecer, mas o número sozinho não mostra dano; o que decide é quantos desses arquivos cada tarefa lê, medida da pergunta 2.
6. 12 dos 18 arquivos acima de 1500 linhas são as rodadas do furgão (34375 linhas, 33% do código de peças, sem import apontando para elas), e nucleo.js tem 3814 linhas. Atrapalha? As rodadas só pesam se a IA as abrir por varredura de pasta; nucleo.js custa uma leitura de 3814 linhas a quem altera o núcleo.
7. src/bancada importa tools/modelar em código (montagem-em-dados.js:15). Atrapalha? Não: é uma aresta, mas mostra que a bancada alcança ferramenta de IA sem gate.

## O que não foi medido

O grafo vem de expressão regular, não de analisador sintático, então um import dentro de string de teste conta como aresta (os 36 não resolvidos são desse tipo) e 76 `import(` com argumento calculado ficam fora. Imports em Python e uso de módulos por caminho em texto (spawn, readFile) não entram. A divisão de tools/ em gate, ferramenta e documento é regra de nome minha, sem leitura arquivo a arquivo. A lista de palavras de domínio é minha e não cobre sinônimos nem objetos de outras peças (cadeira, braço, avião).
