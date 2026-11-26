# Laço mais rápido: fatia 1, a dobra e o vinco pela execução guardada e a decisão da pessoa ao lado das rodadas

Registro da fatia 1 do plano [laço de modelagem mais rápido](../../planos/2026-11-26-laco-de-modelagem-mais-rapido.md), medida em 2026-11-26 sobre a lataria do carro (`carro-fastback/lataria`, receita de sha256 `70bf7edb`, 10 passos, 66913 vértices na pele da chapa), numa máquina de 4 núcleos e 16 GB, com Node 22.23.4, uma medida por vez, a partir do commit `e568e04a`.

## O que a medida de antes mostrou

O plano parte de 105 s na ação da rodada com o cache quente, 76 deles nas réguas de dobra e vinco, número medido em 2026-11-18. Hoje, antes de qualquer mudança desta fatia, a ação da rodada da lataria leva 29,9 s com o cache quente, e as duas réguas juntas respondem por cerca de 3 s deles (de 12 s a 15 s no registro das etapas do `descrever`). O problema que o plano descreve já não tem o tamanho que ele dá. Entre as duas medidas a receita mudou (era `bda6950a`) e o ajuste das medidas da gaiola, que as réguas refaziam, ficou esparso em 2026-11-22; a causa da queda não foi medida aqui, só o estado de hoje.

O que seguia verdadeiro é que as duas linhas de comando executavam a receita inteira a cada chamada, fora do cache: 67,7 s a da dobra e 64,3 s a do vinco na lataria.

## O que entrou

`superficiesDaReceita`, em `tools/modelar/dobra-da-superficie.mjs`, lê a superfície de cada passo `subdivisao` do que o passo deixa em `neutro.chapas` (a gaiola já ajustada às medidas, os nomes dos pontos, os níveis, as faces e a contagem de vértices da pele), que o estado guardado em `tmp/cache-por-prefixo/` também traz. O ajuste das medidas deixa de ser refeito, e o refino roda sem o ponto limite, porque dele só se usam as faces e as arestas que descendem de vinco, e as posições vêm do estado da receita. A execução que não traz a chapa do passo cai na conta de antes, e `{ guardada: false }` força essa conta para a prova de igualdade. As duas linhas de comando passaram a executar por `executarComCachePorPasso`, com `--sem-cache` para executar inteira e a linha de sempre na saída de erro dizendo de onde a execução recomeçou. O `descrever` já passava às réguas a execução dele e não mudou.

## Os tempos

| medida | antes | depois |
| --- | --- | --- |
| `node tools/modelar/rodada-de-modelagem.mjs carro-fastback/lataria --acao`, cache quente | 29,9 s e 29,9 s | 27,3 s e 29,1 s |
| `node tools/modelar/dobra-da-superficie.mjs procedural/pecas/carro-fastback/partes/lataria/receita.js` | 67,7 s | 2,7 s com o cache quente |
| `node tools/modelar/vinco-oculto.mjs procedural/pecas/carro-fastback/partes/lataria/receita.js` | 64,3 s | 2,8 s com o cache quente |
| a régua de dobra sobre a execução lida do cache, no mesmo processo | 1,88 s | 0,91 s |
| a régua de vinco em seguida, no mesmo processo | 0,51 s | 0,50 s |
| a régua de dobra sobre a execução direta, no mesmo processo | 0,60 s | 0,92 s |

A ação da rodada ganhou cerca de 1 s em 30, dentro da variação entre duas execuções. A última linha piora 0,3 s porque, com a receita executada no mesmo processo, a conta de antes achava o refino na memória do núcleo e a nova pede um refino sem ponto limite, que é outra chamada; esse caminho só acontece com a execução de um minuto na frente.

A ação da rodada de hoje gasta o tempo em outro lugar. Pelo registro das etapas do `descrever` dentro dela: 2 s para ler o estado guardado, 10 s medindo as partes, 3 s nas réguas de dobra e vinco (antes), 5 s nas formas prometidas e o resto na referência, na guarda do acervo e na cópia da rodada.

## A igualdade

Cada linha abaixo foi comparada byte a byte com `cmp` entre o código de antes e o de depois, e entre a execução direta e a lida do cache. O JSON comparado traz a saída inteira da régua de dobra, a da régua de vinco e os segmentos que o desenho do vinco pinta.

| peça | direta e pelo cache, antes e depois |
| --- | --- |
| `carro-fastback/partes/lataria` | sha256 `ce2d10f6` nas quatro |
| `kukri` | `78d5b463` nas quatro |
| `carenagem-de-prova` | `fa326586` nas quatro |
| `braco-robotico/partes/ombro` | `47cfff05` nas quatro |
| `carrinho-de-mao/partes/cacamba` | `a2c76f99` nas quatro |
| `empilhadeira/partes/banco` | `f55fd1e6` nas quatro |

A saída das linhas de comando também é a mesma antes e depois: `ec11bf3e` a da dobra e `1389928c` a do vinco na lataria, `69c20fa8` e `93099d06` no kukri (a do vinco com `--sem-cache`). A saída de `--acao` da lataria é a mesma nas quatro execuções (`e711b24b`).

O teste `tools/modelar/dobra-da-superficie.test.mjs` prende a igualdade na carenagem de prova (medidas, simetria e espessura), no ombro do braço e, desde a revisão, na alça da empilhadeira (duas chapas): a superfície lida da execução guardada contra a refeita, e a dobra e o vinco pela execução direta, pelo cache frio, pelo cache quente e por uma execução sem as chapas.

## A decisão da pessoa, num arquivo ao lado das rodadas

A primeira versão desta fatia gravava a decisão num campo opcional da própria rodada, e a rodada gravada não é reescrita, de modo que a decisão dada depois de a pessoa ver a peça não tinha onde entrar. A pessoa decidiu em 2026-11-26 que a decisão fica num arquivo ao lado das rodadas, gravado depois da rodada.

A decisão mora em `rodadas/decisoes-da-pessoa.json`, na pasta de rodadas da peça, com uma entrada por rodada: o número da rodada, o texto `"<quem decidiu>, <AAAA-MM-DD>: <as palavras dela>"` e a data da gravação. O formato do texto é o que a ferramenta já cobra do `por` de `rodadas/limite.json` e de `--motivo-dos-pontos`; a expressão e o texto do formato passaram a morar em `src/autoria/laco-de-modelagem.js`, com `normalizarDecisaoDaPessoa`, e a ferramenta os importa. O comando é:

```
node tools/modelar/rodada-de-modelagem.mjs <peça> --decisao-da-pessoa "<quem decidiu>, <AAAA-MM-DD>: <as palavras ou o porquê>" --rodada <n> [--substituir]
```

Ele recusa, com o recebido, o esperado e o comando que conserta: o texto fora do formato, a rodada que não está registrada (a mensagem lista as registradas), a falta de `--rodada`, a segunda decisão para a mesma rodada sem `--substituir`, o uso junto de `--registrar` e o arquivo mexido à mão que não se lê. Com `--substituir` a decisão anterior não se perde: fica em `anteriores` na entrada, com a data em que tinha sido gravada. O arquivo da rodada não é tocado em nenhum caso, e a pasta segue contando as mesmas rodadas. `--acao` lista a decisão de cada rodada depois da próxima ação, e a ação não é decidida por ela.

Depois da revisão o comando recusa mais do que isso, e a lista completa está na seção da revisão, adiante.

O campo `decisaoDaPessoa` dentro da rodada saiu. Nenhuma rodada do acervo chegou a tê-lo, então não há registro antigo a ler, e com duas fontes a ferramenta precisaria de uma regra para dizer qual vale quando as duas existem. A decisão dada na hora do registro se grava com o segundo comando logo depois de `--registrar`, que não mede nada e responde na hora.

A ferramenta ganhou `--ajuda`, com o uso de cada comando, e a chamada sem a peça passou a dizer o recebido e o esperado seguidos da ajuda (antes respondia só "diga a peça"). A opção que pede valor aceita `--rodada 3` e `--rodada=3`.

Os testes cobrem os dois sentidos em `src/autoria/laco-de-modelagem.test.js` e em `tools/modelar/rodada-de-modelagem.test.mjs`: grava e relê, não toca as rodadas, recusa a rodada inexistente, o formato errado, a segunda decisão sem substituir e o arquivo inválido, guarda a anterior ao substituir, lista na ação e recusa o uso errado na linha de comando.

## O que a revisão adversarial mudou

A revisão dos commits `42935cb5` e `23b926ba` bloqueou por dois defeitos e pediu sete correções, todas feitas em 2026-11-26 com teste e com o mutante de cada uma conferido.

A recusa do texto fora do formato entregava um comando pronto, com data fixa e palavras que a pessoa não disse, e um agente que o copiasse gravaria uma aprovação inventada. A recusa agora traz o molde `"<quem decidiu>, <AAAA-MM-DD>: <as palavras ou o porquê>"`, e a recusa do `--motivo-dos-pontos`, que tinha o mesmo defeito com outro texto, também. Um teste lê a ajuda, o código da ferramenta e do núcleo e nove recusas e reprova qualquer texto no formato com data de verdade entre aspas. Este documento trazia o mesmo comando pronto e foi corrigido.

O teste da linha de comando rodava contra a pasta de rodadas da lataria do carro, e numa regressão gravaria decisão fabricada no acervo. A linha de comando passou a ler a variável de ambiente `MODELAR_RODADAS_EM_PASTA_DE_TESTE`: com ela as rodadas e as decisões são as de `<pasta>/<peça>`, a pasta tem de ficar fora do repositório (dentro dele é recusada) e a saída diz na primeira linha que a pasta de teste foi usada. Os testes da decisão rodam todos na pasta temporária, e nenhum cita a pasta de uma peça do acervo.

O texto da decisão, o `por` de `limite.json` e o `--motivo-dos-pontos` passam pela mesma conferência, `defeitoDoTextoDeQuem`: uma linha só (quebra de linha, tabulação e os demais caracteres de controle e separadores de linha são recusados) e data que existe no calendário. A decisão tem ainda dois limites: a data não pode ser futura no instante da gravação e não pode ser anterior ao registro da rodada. O dia da pessoa é o do fuso dela e os instantes gravados são UTC, então a conta usa o dia mais adiantado que existe no instante da gravação (14 h à frente) e o mais atrasado no instante do registro (12 h atrás); a rodada antiga, sem `registradaEm`, só tem o limite de cima. Os três `limite.json` do acervo (ombro e ombro-tambor do braço, lataria do carro) passam na conferência nova sem mudança, e o teste que os lê continua no arquivo. O resumo do `--acao` imprime cada decisão entre aspas de JSON, de modo que um texto com quebra de linha, vindo de quem chama a função sem passar pela leitura, ocupa uma linha só.

`lerDecisoesDaPessoa` confere o arquivo inteiro, e a gravação passa o conteúdo novo pela mesma conferência antes de escrever: o formato e a versão (cada um com recusa própria), a peça igual à dona da pasta, a rodada inteira, única e registrada, as chaves fechadas no arquivo, na entrada e em cada anterior (um campo como `aprovada` ou `limite` é recusado), `gravadaEm` como instante ISO em UTC que existe, o texto sem branco nas pontas e dentro dos limites de data contra o `gravadaEm` dele, e `anteriores` como lista não vazia de `{ decisao, gravadaEm }` da mais antiga à mais nova. Cada recusa diz o arquivo, o recebido, o esperado e o conserto.

`--substituir` só vale com decisão anterior e texto diferente: sem decisão anterior é recusado, o mesmo texto já gravado é recusado com e sem ele, e a função exige `substituir` igual a `true` ou `false` (o texto `"false"`, o número 1 e os demais são recusados). A recusa da rodada que não existe lista as registradas e traz o comando com `<n>`, sem sugerir a última. A gravação escreve num temporário ao lado e troca o nome, e o teste prova a troca por um segundo nome do arquivo de antes, que fica com o conteúdo de antes.

A linha de comando recusa a opção com valor repetida (só `--atrito` repete), a opção que não conhece, com a lista das aceitas, `--decisao-da-pessoa` junto de `--acao` ou de qualquer opção que o comando não lê, e a opção sem valor dizendo o que esperava e como escrever. `dobra-da-superficie.mjs` e `vinco-oculto.mjs` respondem `--ajuda`, e o argumento que não conhecem é recusado com o esperado.

Na régua de dobra, a chapa guardada que vem sem os vincos, os cantos, a borda ou as faces deixou de ganhar valor suposto e cai na conta direta. Cada superfície diz em `daExecucaoGuardada` por qual caminho saiu; o campo não entra na saída das réguas (as saídas da carenagem de prova, do ombro e da alça continuam iguais às da conta direta). O teste ganhou a alça da empilhadeira, que tem duas chapas, e confere que as duas vêm do guardado na execução direta, no cache frio e no cache quente, e que nenhuma vem quando a execução não traz as chapas.

A função que lê `limite.json` chamava-se `decisaoDaPessoa` e passou a `decisaoSobreAsParadas`; `tools/modelar/fluxo-do-objeto.mjs` e `tools/modelar/etapas-da-montagem.mjs` trocaram o nome importado, declarados fora do território no commit, e o nome antigo não existe mais.

Os mutantes conferidos, cada um aplicado sozinho com o teste rodado e desfeito em seguida, estão na tabela. Todos morreram.

| correção | mutantes | resultado |
| --- | --- | --- |
| B1, palavras prontas | o comando pronto de volta na recusa da decisão (pelos dois testes) e na do motivo dos pontos | 3 de 3 mortos |
| B2, pasta do teste | a linha de comando ignorando a variável, e a pasta dentro do repositório aceita | 2 de 2 |
| D1, linha de comando | `substituir: true` fixo na chamada | 1 de 1 |
| D2, substituir | sem a exigência de `true` ou `false`, sem a recusa sem anterior, sem a recusa do mesmo texto | 3 de 3 |
| D3, leitura do arquivo | cada conferência tirada sozinha: a peça, a rodada registrada, `gravadaEm` (ausente e só pelo formato), campo a mais nos três níveis, `anteriores` (não lista, vazia, entrada, instante, texto, ordem) e o texto da entrada | 14 de 14 |
| D4, linha e data | quebra de linha aceita (núcleo e ferramenta), só `\n` e `\r` recusados, data que não existe, futura, futura sem a folga do fuso, anterior ao registro, gravação e leitura sem os limites, resumo com o texto cru, `por` e motivo dos pontos pela expressão antiga | 12 de 12 |
| D5, versão, formato, ordem e ação | versão não conferida, versão gravada 2, formato não conferido, leitura e gravação sem ordenar, e a decisão gravada mudando a ação | 6 de 6 |
| D6, régua de dobra | nunca ler o guardado, sempre a primeira chapa, e os vincos, os cantos e a borda supostos (os três, só os vincos, só a borda) | 5 de 5 |
| D7, rodada inexistente | a sugestão da última rodada de volta | 1 de 1 |
| pontos menores | `--rodada` repetido aceito, a decisão com `--acao` aceita, a opção desconhecida aceita, a gravação por cima sem troca e a que deixa o temporário | 5 de 5 |

São 52 mutantes, todos mortos, rodados com `npx vitest run` no arquivo de teste da correção e o filtro do bloco.

## O que ficou de fora

A ferramenta das rodadas não tem um comando de histórico: quem lista as rodadas é o `--acao`, e é nele que as decisões aparecem. O fluxo do objeto (`tools/modelar/fluxo-do-objeto.mjs`) e o custo por peça não mostram a decisão; os dois ficam fora do território deste plano.

A skill do laço (`.claude/skills/laco-de-modelagem/`) ainda não manda gravar a decisão da pessoa depois de mostrar a peça; ela é repartida na fatia 2 e a instrução entra lá.

O gate de saída 1 do plano pede o tempo da ação da rodada antes e depois: é 29,9 s e cerca de 28 s. Baixar a ação da rodada daqui em diante depende da medida das partes e da referência dentro do `descrever`, que não são do território deste plano.
