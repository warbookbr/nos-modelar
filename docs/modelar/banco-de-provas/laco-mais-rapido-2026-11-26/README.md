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

## Calibração do crítico

Esta seção é a etapa A da calibração da fatia 2: o que o conjunto de hoje prova e a proposta do conjunto novo. Nada do conjunto mudou. A troca não é mecânica, pelos cinco motivos da subseção "Por que a troca não é mecânica", e por isso a etapa B espera a decisão da pessoa.

### O que o conjunto de hoje prova

O conjunto mora em `docs/modelar/banco-de-provas/calibracao-do-critico/conjunto.json`, com 12 imagens e 44 julgamentos do crítico, dados em 2026-10-30 e 2026-11-03. `npm run calibracao:check` passa em 3,4 s e diz: 12 de 12 imagens (3 controles, 1 de superfície, 6 estruturais, e 2 de função que a frase não conta), 4 defeitos da medida reprovados por ela sem chegar ao crítico, agente e brief iguais aos gravados, e o crítico acertando 11 de 12 imagens com o mínimo em 11 e as duas obrigatórias certas. A imagem que erra é o controle do cilindro (c05), com mediana 6 e defeito estrutural citado nos 5 julgamentos.

Cada imagem são quatro vistas de 1100 por 1277 pixels (isométrica, frontal, lateral e superior), em desenho de linhas com uma cor chapada por parte, o título e a nota do objeto escritos na imagem e a barra de 100 mm no canto, todas na mesma escala; três imagens (c01, c05, c06) têm uma quinta vista, a lateral ampliada. Quem as desenhou foi o desenhista do módulo antigo do esboço, que saiu em 2026-11-05, e desde então o `gerar` é recusado. A captura da bancada de hoje (`npm run bancada -- roda-esportiva --vistas=isometrica,frontal,direita,superior --res=1100 --sem-contatos`, 29 s) sai com 1100 por 619 pixels, sombreada, com o material da receita, sem título, sem nota e sem barra de escala, e cada vista enquadrada por conta própria.

O gate prende quatro coisas por imagem e duas do crítico. Por imagem: a fonte (o hash da geometria executada da chamada de família, ou o hash do arquivo do esboço), o `sha256` de cada PNG, o controle igual à geometria do `aprovacao.json` da família, e a medida, que tem de reprovar exatamente os defeitos marcados `decide: medida` e nenhum outro. Do crítico: o hash do arquivo `.claude/agents/critico-visual.md` e o hash do texto fixo do brief (`modeloDoBrief`). Cada julgamento guarda ainda a impressão do brief exato da imagem e a das vistas (`imagemSha256`); trocar um PNG faz o gate reprovar com `julgamento-de-outra-imagem` até os julgamentos daquela imagem saírem de `resultados`, e sem eles o gate diz quantos faltam e passa.

| Imagem | Fonte | O que ela mostra | Quem decide e a medida que reprova sem o crítico |
| --- | --- | --- | --- |
| c01 haste-grossa | família `cilindro-hidraulico`, ponto médio, `haste=110`, violando `haste-abaixo-do-embolo` e `haste-grossa-demais` | haste mais larga que a camisa | a medida: `razao:hastePelaCamisa` (a caixa em y da haste sobre a da camisa, faixa de 0,27 a 0,67) |
| c02 controle-roda | família `roda-pneu`, perfil carro, geometria aprovada | nenhum defeito (chave, 5 julgamentos) | nenhuma medida reprova; do crítico se cobra nota de 8 a 10 e no máximo 1 julgamento com defeito estrutural |
| c03 picape-baixa | esboço `picape-baixa.esboco.json`, reescrito à mão | rodas faltando, piso da caçamba atravessando o arco, conjunto baixo (chave e obrigatória) | o crítico decide as rodas e o piso; a medida `esboco-medida:alturaPeloComprimento` reprova a altura (0,28 onde a ficha pede de 0,30 a 0,40), e ela é um valor gravado em `fontes-de-esboco.json`, que nada recalcula |
| c04 ponta-no-ar | família `dobradica`, ponto médio, a folha da esquerda deslocada | folha solta dos nós do pino | o crítico; nenhuma medida do conjunto alcança |
| c05 controle-cilindro | família `cilindro-hidraulico`, ponto médio, geometria aprovada | nenhum defeito (chave) | nenhuma medida reprova; é a imagem que o crítico erra hoje |
| c06 facetado | família `cilindro-hidraulico`, `lados=12`, `segmentosDoArco=3` | camisa, olhais e haste de doze lados | o crítico (classe superfície, nota de 8 a 9) |
| c07 dobradicas-por-fora | esboço `guarda-roupa.esboco.json` da rodada de 2026-10-08 | dobradiças na face externa das portas (chave e obrigatória) | o crítico; a fonte gravada não tem medida |
| c08 pneu-macico | família `roda-pneu`, ponto médio, `raioDoAssento=0` | pneu maciço, sem aro, cubo nem furos | a medida: `forma:pneu` (o pneu tem de ser um anel) |
| c09 controle-dobradica | família `dobradica`, ponto médio, geometria aprovada | nenhum defeito | nenhuma medida reprova |
| c10 raios-curtos | família `roda-pneu`, padrão, `tipo=1`, os nós do aro a 0,75 | raios que terminam antes do aro | a medida: `razao:discoAlcancaOAro` |
| c11 travessia-sem-explicacao | família `cilindro-hidraulico`, `inicioDoCorpo=-0.1`, `comprimentoDoCorpo=0.7322` | haste atravessando o fundo da camisa e o olhal traseiro | o crítico |
| c12 peca-fora-do-lugar | família `cilindro-hidraulico`, o olhal traseiro deslocado | olhal traseiro fora do eixo da camisa | o crítico |

Das doze, dez saem de chamadas de família e duas de esboços. As quatro medidas vivas (c01, c08, c10 e, pelo valor gravado, c03) são conferidas sobre a geometria e não sobre a imagem, então trocar o desenho não as muda.

### Por que a troca não é mecânica

O texto fixo do brief descreve as imagens antigas. Ele diz ao crítico que as quatro vistas vêm "sem legenda, na mesma escala, com a barra de 100 mm do mesmo comprimento nas quatro", e o brief não pode mudar nesta tarefa. A captura da bancada não tem barra nem escala comum, e entregá-la com esse texto seria dizer ao crítico uma coisa falsa sobre a imagem. Para cumprir o texto sem mudá-lo, a captura teria de ganhar escala comum e barra, o que mexe na bancada, fora do território deste plano.

O brief da calibração não é o que o crítico recebe hoje numa rodada. Na rodada ele recebe o `pedido.md` do `npm run vistas:critica`, com alvo, vistas do modelo, vista por parte, promessa de forma e critérios; a calibração mede o brief de objeto do esboço antigo, com cinco perguntas e nenhum alvo. Trocar só as imagens deixa a calibração medindo um pedido que o laço não faz mais. Medir o pedido de hoje é trocar o brief preso pelo hash, que a tarefa proíbe, e é decisão sobre o que a calibração mede.

As duas imagens obrigatórias não têm como ser capturadas. A picape baixa e o guarda-roupa são esboços do módulo que saiu; não existe receita deles, e a bancada só abre `procedural/pecas/` e `tools/fixtures/acervo/`. Substituí-las é escolher outras peças e outros defeitos para as duas provas que o gate exige certas, e a medida da picape (`esboco-medida:`) não tem equivalente vivo.

As outras dez também não são peças que a bancada abre. São chamadas de família executadas em Node, sete delas com parâmetro fora da restrição ou argumento trocado. Para a bancada capturá-las, cada uma precisa virar uma receita de ensaio em `tools/fixtures/acervo/`, e o formato do conjunto precisa de um tipo de fonte novo em `src/autoria/calibracao-do-critico.js`. Nenhum dos dois caminhos, nem a pasta `docs/modelar/banco-de-provas/calibracao-do-critico/`, está no território do plano, que lista só `tools/modelar/calibracao-do-critico.mjs` e o teste dele.

Os 44 julgamentos deixam de valer. Imagem nova pede julgamento novo: 44 despachos do `critico-visual` (5 em cada uma das 4 chaves e 3 em cada uma das outras 8), que quem conduz faz. Até lá o gate passa como pendente. Com os julgamentos novos ele pode reprovar: hoje o conjunto passa no mínimo exato, 11 de 12, e as faixas de nota e a regra de acerto foram ajustadas sobre o desenho de linhas.

### A proposta do conjunto novo

A proposta mantém as doze provas onde a fonte permite e deixa em aberto as duas que dependem de escolha. A câmera é a mesma para todas: `npm run bancada -- <peça> --vistas=isometrica,frontal,direita,superior --res=1100 --enquadrar --ambiente=nenhum --sem-contatos`, com a vista `direita` gravada como `lateral`, e a lateral ampliada de c01, c05 e c06 deixa de existir porque `--enquadrar` já fecha o quadro na peça. O enquadramento por vista contradiz a "mesma escala" do brief, e é o primeiro ponto a decidir.

| Imagem | Peça e origem da captura | O defeito que deve mostrar | A medida que o reprova sem o crítico |
| --- | --- | --- | --- |
| c01 haste-grossa | receita de ensaio com a chamada de `cilindro-hidraulico` no ponto médio e `haste=110` | haste mais larga que a camisa | `razao:hastePelaCamisa`, igual à de hoje |
| c02 controle-roda | receita de ensaio com `roda-pneu` no perfil carro, ou a peça `roda-esportiva` do acervo | nenhum | nenhuma; o hash da geometria contra o `aprovacao.json`, se for a família |
| c03 (obrigatória) | em aberto: um veículo do acervo com as rodas tiradas e o piso da caçamba descido, numa cópia de ensaio | rodas faltando e piso atravessando o arco | em aberto: a razão de altura por comprimento teria de ser medida viva sobre a peça, e hoje é só o valor gravado |
| c04 ponta-no-ar | receita de ensaio com `dobradica` no ponto médio e a folha deslocada | folha solta dos nós | nenhuma, fica com o crítico |
| c05 controle-cilindro | receita de ensaio com `cilindro-hidraulico` no ponto médio | nenhum | nenhuma; hash contra o `aprovacao.json` |
| c06 facetado | a mesma chamada com `lados=12` e `segmentosDoArco=3` | revolução de doze lados | nenhuma, fica com o crítico |
| c07 (obrigatória) | em aberto: um móvel de porta do acervo ou da família `movel-de-caixa` com as dobradiças levadas à face externa | dobradiças por fora | nenhuma, fica com o crítico |
| c08 pneu-macico | receita de ensaio com `roda-pneu` e `raioDoAssento=0` | pneu maciço | `forma:pneu`, igual à de hoje |
| c09 controle-dobradica | receita de ensaio com `dobradica` no ponto médio | nenhum | nenhuma; hash contra o `aprovacao.json` |
| c10 raios-curtos | receita de ensaio com `roda-pneu`, `tipo=1` e os nós do aro a 0,75 | raios curtos | `razao:discoAlcancaOAro`, igual à de hoje |
| c11 travessia-sem-explicacao | receita de ensaio com o corpo da haste recuado | haste atravessando o fundo | nenhuma, fica com o crítico |
| c12 peca-fora-do-lugar | receita de ensaio com o olhal traseiro deslocado | olhal fora do eixo | nenhuma, fica com o crítico |

Nas dez de família, a receita de ensaio levaria a mesma chamada que `chamadaDaFonte` monta hoje, de modo que o hash da geometria gravado continua valendo e a medida não muda. Nenhuma captura foi gerada: a única captura feita nesta etapa foi a da `roda-esportiva`, para medir o tamanho e o tempo, e ela ficou em `tools/bancadas/out/`, fora do repositório.

### O que a pessoa decide

A primeira decisão é o que a calibração mede: o brief de objeto de hoje com imagens da bancada, ou o `pedido.md` que o crítico recebe na rodada. A recomendação é medir o pedido da rodada, porque é ele que o laço usa, e isso pede mudar o brief preso pelo hash; como o agente ainda se apresenta com o nome antigo do projeto (`processo.md`, parágrafo final), as duas mudanças cabem na mesma medição nova. Se a escolha for manter o brief, a frase da escala comum e da barra de 100 mm precisa valer para a captura, e isso é trabalho na bancada.

A segunda é quais peças e defeitos substituem as duas obrigatórias, e se a altura baixa da picape continua sendo defeito da medida. A recomendação é escolher dois objetos do acervo em que a pessoa já reprovou um defeito parecido numa rodada registrada, para o conjunto nascer de casos decididos por ela.

A terceira é o território: a troca toca `docs/modelar/banco-de-provas/calibracao-do-critico/`, `src/autoria/calibracao-do-critico.js` e `tools/fixtures/acervo/`, que o plano não lista. A recomendação é acrescentá-los ao território do plano antes da etapa B.

A quarta é aceitar que os 44 julgamentos sejam refeitos e que a regra de acerto (11 de 12, as faixas de nota por classe) possa ter de ser reajustada sobre as imagens novas, com o gate em estado pendente até a medição terminar.

### Etapa B: o que a medição da rodada mostrou antes de qualquer troca

A etapa B parou antes de mudar o conjunto, o gate ou o agente, porque medir o crítico com o pedido da rodada muda quais defeitos chegam a ele, e isso a decisão de 2026-11-26 não cobre. Nenhum arquivo além deste foi alterado; as dez receitas de ensaio do protótipo foram apagadas depois da medida.

O `vistas:critica` mede a receita antes de capturar e recusa a que reprova, com a mesma medição do registro da rodada (`medirReceita`: `guarda:acervo` com os contatos, `guarda:referencial`, pontos e formas). Para saber o que essa medição faz com as dez imagens de família, cada chamada do conjunto virou uma receita de ensaio provisória e passou por `node tools/modelar/rodada-de-modelagem.mjs <peça> --acao`, de 1 a 2 s cada. O controle do cilindro (c05) lista nove pares de partes em contato, que uma receita de verdade declararia em `contatos`. Contra esses nove:

| Imagem | O que a medição da rodada vê | Chega ao crítico pelo pedido da rodada |
| --- | --- | --- |
| c01 haste-grossa | dois pares a mais (`cabeca ↔ haste`, `haste ↔ tubo`) | não |
| c06 facetado | os mesmos nove pares | sim |
| c11 travessia-sem-explicacao | quatro pares a mais (`haste` com `olhalTraseiro`, `pescocoTraseiro`, `rotulaTraseira` e `tubo`) | não |
| c12 peca-fora-do-lugar | falta o par `olhalTraseiro ↔ pescocoTraseiro` | não |
| c08 pneu-macico | seis pares onde o controle da roda (c02) tem três, e dois passos órfãos | não |
| c10 raios-curtos | falta o par `aro ↔ disco` | não |
| c04 ponta-no-ar e c09 controle-dobradica | não medidas: a receita não executa no registro comum, porque a operação `chapaDobrada` é extensão da família | a folha solta perderia o contato declarado com os nós, por construção, mas isso não foi medido |

Das sete imagens de família com defeito, cinco medidas são reprovadas pelos contatos antes do crítico, uma não foi medida e só a facetada passa. No conjunto de hoje o crítico decide seis defeitos; com o pedido da rodada, três deles (c11, c12 e, por construção, c04) passam a ser da medida. O que sobra para o crítico na rodada de hoje é o que a medida não alcança: a forma prometida de cada parte, a silhueta e a proporção contra a referência, e a superfície. O conjunto novo precisa de imagens desse tipo, e escolhê-las é decidir o que o crítico tem de pegar.

Três outros fatos pesam na escolha. O `PLANO` recusa nome de parte com hífen (`'partes[2].nome' precisa ser o mesmo identificador usado no passo 'parte': letras e dígitos, sem espaço`), e as três famílias nomeiam partes com hífen (`olhal-traseiro`), de modo que a receita de ensaio teria de renomear as partes e o hash da geometria deixaria de ser o do `aprovacao.json`. O controle de família fica abaixo do chão (`-48,2 mm` no cilindro) e a `guarda:referencial` o reprova, então a receita também teria de erguer a peça. E o pacote da rodada de um cilindro de nove partes tem 27 imagens ou mais (as quatro do conjunto, traseira, esquerda, arame, raio X e duas por parte), contra as quatro ou cinco de hoje, numa pasta de conjunto que soma 3,0 MB.

### As duas obrigatórias: o que as rodadas registradas guardam

Nenhuma peça tem `decisoes-da-pessoa.json`, que nasceu na fatia 1; o julgamento da pessoa só aparece no `atrito` de 52 das 183 rodadas. Os casos em que ela reprovou forma são quatro. Na `roda-esportiva`, rodada 4 (nota 4 do crítico), ela julgou os raios: o par em V abre desde o centro, cada raio com cerca de 3 % do diâmetro, e o miolo vai pouco além dos parafusos; na rodada 5 o crítico pediu raios largos, contra o julgamento dela. No `braco-robotico/ombro`, rodadas 1 e 2 (notas 7 e 8 do crítico), ela reprovou a forma inteira, o cotovelo de cano. Na `aviao/fuselagem`, rodada 2 (nota 8), o para-brisa saliente passou por dois críticos e só ela o viu. Na `braco-robotico/base`, rodada 3, ela achou o conjunto estreito.

A escolha seria a `roda-esportiva` (raios largos demais para o julgamento dela) e a `aviao/fuselagem` (para-brisa saliente), porque são os dois casos em que o defeito é de forma, visível numa peça só, e em que o crítico errou ou não viu. A geometria reprovada não existe mais: a pasta de rodadas guarda só a cópia da receita da última rodada (`receita-06.js` na roda, `receita-03.js` na fuselagem), o `sha256` da receita da rodada 4 da roda não é o de nenhum commit do arquivo (`git log -- procedural/pecas/roda-esportiva/receita.js` tem um commit só), e as duas imagens teriam de ser a receita de hoje com o defeito recolocado à mão, numa cópia de ensaio. Nos dois casos o crítico da época não apontou o que a pessoa viu, então marcá-las obrigatórias é aceitar que o gate pode reprovar o crítico de hoje nelas.

### O que volta à pessoa

A primeira pergunta é quais defeitos o crítico tem de pegar no conjunto novo, já que os de contato são da medida. A recomendação é um conjunto de peças do acervo com `PLANO` e referência, em três grupos: controles que são etapas aceitas pela pessoa; defeitos de forma prometida e de proporção recolocados à mão em cópias de ensaio dessas peças, começando pelos dois casos acima; e a revolução facetada, que é a única imagem de hoje que continua do crítico. As imagens de contato saem do julgamento e ficam como prova da medida, conferida sem navegador como hoje.

A segunda é o tamanho: guardar no repositório o pacote inteiro de cada imagem, com dezenas de PNG, ou um pacote reduzido para a calibração. A recomendação é esperar o pacote menor do crítico, que é a outra parte desta fatia, e calibrar com ele.

A terceira é se as duas imagens recriadas à mão valem como "casos decididos pela pessoa", uma vez que a geometria que ela reprovou não foi guardada. A recomendação é aceitar, com a frase dela do `atrito` gravada na fonte da imagem, e passar a guardar a cópia da receita de toda rodada em que houver decisão dela.

## Fatia 3: o pacote menor do crítico e a cópia da receita da rodada com decisão

Medido em 2026-11-26, na mesma máquina de 4 núcleos e 16 GB, uma captura por vez, com `npm run vistas:critica -- <peça>` e o tempo de relógio do comando inteiro. O antes é o commit `0b02f3cb`; o depois são as mudanças desta fatia sobre ele, ainda sem commit quando foram medidas. As três peças são do acervo e têm `PLANO`: o cilindro de inclinação da empilhadeira (`empilhadeira/cilindro-inclinacao`, 2 partes, instância de montagem), a fuselagem do avião (`aviao/fuselagem`, 13 partes, instância de montagem) e a lataria do carro (`carro-fastback/lataria`, 3 partes, peça de lataria). Nenhuma das três receitas mudou desde a última rodada que o crítico julgou, de modo que o depois mostra o conjunto padrão sem vista isolada de parte; a peça com parte mudada soma duas imagens por parte e, pelo pacote de antes, cerca de 2 s por parte na fuselagem e de 4 a 43 s na lataria, onde a captura que muda de resolução recarrega a peça.

### As duas medidas

| peça | antes: tempo | antes: PNG na pasta | antes: imagens citadas no pedido | depois: tempo | depois: PNG na pasta | depois: imagens citadas no pedido |
| --- | --- | --- | --- | --- | --- | --- |
| `empilhadeira/cilindro-inclinacao` | 109,0 s | 22 | 22 | 71,9 s | 11 | 14 |
| `aviao/fuselagem` | 95,5 s | 46 | 48 | 47,2 s | 11 | 13 |
| `carro-fastback/lataria` | 580,0 s | 57 | 41 | 255,3 s | 19 | 15 |

As imagens citadas no pedido são as que o crítico abre: as do pacote que entram no pedido mais as referências do plano, que moram no repositório. A pasta da lataria tem mais PNG do que o pedido cita porque guarda a captura crua de cada vista de superfície ao lado da que leva a legenda. Com `--completo`, depois da mudança, o cilindro levou 107,6 s com as mesmas 22 imagens, e o `pedido.md` saiu igual ao de antes byte a byte, trocado só o caminho da pasta.

O tempo não cai na proporção das imagens porque a maior parte dele é fixa. No cilindro de antes, pela hora de gravação de cada arquivo, 28 s passam antes da primeira imagem (a medição da receita e a subida do servidor e do navegador), 12 s nas duas partes, 38 s nas sete vistas montadas, 10 s nos cortes e 10 s na medida de quanto as outras peças tapam a peça. Na lataria de antes, cada captura recarrega a peça e leva de 38 a 55 s: 65 s antes da primeira imagem, 42 s nas vistas da peça e da malha, 57 s nas três partes, 114 s nas três visões de reflexo, 40 s na curvatura, 200 s na luz rasante de quatro vistas e 57 s na prancha desenhada. O relatório do comando passou a dizer o tempo de cada etapa (`TEMPO:`), e o depois vem dele: no cilindro, 71,0 s, com 0,3 s de medição, 22,3 s de capturas da bancada, 10,1 s na visibilidade, 16,9 s nas duas vistas montadas e 10,1 s no corte; na fuselagem, 46,3 s, com 5,5 s, 24,1 s, 3,1 s, 6,4 s e 3,7 s; na lataria, 254,5 s, com 22,2 s de medição, 3,8 s na comparação das partes e 170,9 s de capturas, e o resto na prancha desenhada.

O que sobra depois da mudança é a carga da peça a cada captura, que é a outra parte desta fatia (a bancada aquecida), e a montagem resolvida três vezes na peça de montagem (para a visibilidade, para as vistas montadas e para os cortes).

### O conjunto padrão, aprovado pela pessoa

A pessoa aprovou o conjunto em 2026-11-26 ("Aprovado, pode corrigir o enquadramento em seguida sem mudar o conjunto"), vendo as imagens da fuselagem do avião. O conjunto é este, e a ferramenta não tem nome de peça: o que só serve a uma família entra pelo que a receita já declara (a instância de montagem, a peça de lataria de `src/autoria/lataria.js`, `CRITICA.cortes`, `dePerto`, `REFINA.esboco`, a prancha e o contorno citados no plano).

| nº | imagem | por que entra |
| --- | --- | --- |
| 1 | a peça sozinha, isométrica, com sombra | o volume inteiro numa imagem, que é a que o crítico usa para se situar |
| 2 | frontal | a silhueta e a proporção de frente, que se comparam com a referência do mesmo lado |
| 3 | direita | a silhueta de lado |
| 4 | superior | a planta |
| 5 | traseira | o lado que a isométrica e a frontal não mostram |
| 6 | esquerda | a peça que não é simétrica tem parte só de um lado (a porta da fuselagem) |
| 7 | a malha em arame, isométrica | a topologia que a sombra esconde (o leque de lascas do ombro do braço) |
| 8 | a malha em raio X, traseira | o defeito de malha que fica atrás, com as arestas da frente e de trás na mesma imagem |
| 9 | montada, isométrica (só na instância de montagem) | o contexto e a posição da peça entre as outras, com o quadro fechado nela |
| 10 | montada, a ortogonal em que mais área da peça aparece (só na instância de montagem) | a segunda vista de contexto, escolhida pela medida: a peça comprida aparece mais de lado que de frente, a vista em que as outras a tapam não entra, e as áreas a menos de 20 % da maior empatam e fica a primeira da ordem frontal, traseira, direita, esquerda, superior, inferior (deu a direita na fuselagem e no cilindro) |
| 11 | o corte de todo encaixe que encosta ou cruza, com folga até 0,01 mm (só na instância de montagem), mais os que a receita declara em `CRITICA.cortes`; sem nenhum que encoste, o de menor folga e os que empatam com ele | a profundidade de um encaixe não se decide pela vista montada, e o cruzamento ou a peça solta aparece primeiro no par de menor folga |

São oito imagens na peça sozinha e, na instância de montagem, dez mais um corte por encaixe que encosta (cinco na fuselagem do avião, um no cilindro da empilhadeira). A peça de lataria leva mais cinco, todas na vista de três quartos, que mostra a frente, o lado e o topo de uma vez: a curvatura com a legenda, a luz rasante nas duas direções da luz e a zebra com a listra deitada e em pé. As duas primeiras são as que a decisão da pessoa de 2026-10-30 exige no pacote da peça de lataria, e o registro da rodada continua a cobrá-las.

Além do conjunto entram as partes que diferem da última rodada julgada pelo crítico, com as duas vistas isoladas de sempre e as vistas de perto que o plano declara para elas. A ferramenta acha a última rodada com veredito nos registros e compara, parte por parte, a impressão das partes que essa rodada gravou com a da receita de agora: a impressão da malha (as coordenadas dos vértices de cada face e o que a face carrega, sem os números da face e dos vértices, que mudam com um passo acrescentado antes, mais a declaração em `MATERIAIS` do material que a parte usa) e a da promessa do plano. Entra a parte de malha diferente, a de promessa diferente, a que a base não tinha, a que a malha de agora não tem, porque a parte prometida e não entregue tem de aparecer como ausência, e a que o veredito da rodada cita num defeito. Sem rodada julgada, ou com a rodada julgada que não gravou a impressão (as registradas até 2026-11-26), todas as partes entram e o relatório diz por quê. A primeira versão executava de novo a cópia da receita que a rodada guardou, e a seção das correções, mais abaixo, diz por que isso saiu. O que a receita declara para comparar com a referência não muda: o alvo do esboço, a sobreposição dos cortes, a prancha desenhada e o contorno sobreposto.

Ficam de fora do padrão e voltam com `--completo`: a malha em arame vista de trás, as outras cinco vistas montadas, os cortes dos encaixes de folga maior que o limiar, a vista isolada das partes que não mudaram nem foram citadas num defeito e, na lataria, a pintura e as vistas de frente, de lado e de cima da zebra, da curvatura e da luz rasante.

O `pedido.md` do pacote padrão abre com um parágrafo que lista o que entrou e o que ficou de fora, e a seção das partes diz quais não têm vista isolada e que elas aparecem nas vistas da peça inteira, sem dizer por que uma parte tem vista e a outra não. O texto fala das imagens e não cita receita, rodada nem cópia, nem diz que uma parte já foi vista; a rodada com que as partes foram comparadas fica no relatório de quem conduz e no `pacote.json` (`pacote.partes.comparadasComARodada`). O pedido do pacote completo é o de antes, sem o parágrafo.

### As imagens para a pessoa ver

Os três pacotes padrão medidos ficaram em `tools/bancadas/out/`, fora do git, cada um com o `pedido.md` que o crítico receberia: `critica-aviao-fuselagem/rodada-04/` (as onze imagens da instância de montagem: as seis `bancada-aviao-fuselagem-<vista>-orto.png`, `...-isometrica-orto-arame.png`, `...-traseira-orto-raio-x.png`, `etapas-aviao-isometrica-orto-foco-fuselagem.png`, `etapas-aviao-direita-orto-foco-fuselagem.png` e `corte-fuselagem-asas.png`), `critica-empilhadeira-cilindro-inclinacao/rodada-02/` e `critica-carro-fastback-lataria/rodada-08/` (as oito da peça, as duas `...-isometrica-visao-zebra*-enquadrado.png` e, em `superficie/`, `peca-tresquartos-curvatura-legenda.png` e as duas `peca-tresquartos-rasante-az*.png`). A pasta é refeita a cada chamada do comando, e as imagens se regeneram com `npm run vistas:critica -- aviao/fuselagem`.

### A cópia da receita da rodada com decisão da pessoa

Até aqui `rodada-de-modelagem.mjs` guardava em `rodadas/receita-NN.js` só a cópia da última rodada, e a geometria que a pessoa julgou numa rodada anterior se perdia na seguinte: foi o que impediu de recuperar os raios da roda esportiva e o para-brisa da fuselagem para a calibração. O registro de uma rodada nova passa a manter a cópia das rodadas que têm decisão em `decisoes-da-pessoa.json`, até o limite descrito nas correções, e a da última rodada com veredito do crítico, com que `--acao` compara a forma julgada com a atual. `--decisao-da-pessoa` diz onde a cópia da rodada ficou; quando ela já saiu e a receita atual tem o texto e a impressão das partes que a rodada gravou, a cópia é refeita; quando não, a decisão é gravada e o comando avisa, com o caminho que falta, a impressão registrada e os dois comandos de `git` que a recuperam se a versão foi a um commit. Com o arquivo das decisões ilegível, nenhuma cópia é apagada.

Os testes cobrem os dois sentidos em `tools/modelar/rodada-de-modelagem.test.mjs`, no bloco "a cópia da receita da rodada com decisão da pessoa": a rodada decidida mantém a cópia depois de duas rodadas, e a rodada sem decisão a perde como antes; a decisão sobre rodada antiga refaz a cópia ou avisa; a última julgada fica quando a seguinte não tem veredito; e a linha de comando diz onde a cópia está.

### O que ficou de fora desta parte

A recalibração do crítico com o conjunto padrão, que a pessoa aprovou, é o passo seguinte e não foi feita aqui. O registro da rodada não grava se o crítico julgou o pacote padrão ou o completo; o dado está no `pacote.json` da pasta da rodada, fora do git. Os documentos de uso que descrevem o pacote (`docs/modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md` diz "as vistas da peça e de cada parte") estão fora do território deste plano e não foram mudados. A pergunta fechada de uma parte sem vista isolada continua no `pedido-fechado-*.md`, respondida pelas vistas da peça sozinha.

## As correções da revisão adversarial do pacote padrão e o enquadramento

Feito em 2026-11-26 sobre o commit `466e027e`, na mesma máquina, uma captura por vez. A revisão adversarial do commit `5726ca45` bloqueou com sete achados, e cada correção tem teste que falha antes e passa depois, em `tools/modelar/vistas-para-critica.test.mjs`, `tools/modelar/rodada-de-modelagem.test.mjs`, `tools/modelar/olhar-bancada.test.mjs` e `tools/modelar/olhar-bancada-visoes.test.mjs`.

### A base da comparação das partes

A cópia `rodadas/receita-NN.js` importa os módulos pelo caminho relativo, e executá-la hoje usa os módulos de hoje. Uma mudança feita numa ferramenta ou num módulo que a receita importa saía igual na cópia e na receita atual, a parte ficava sem vista isolada e o crítico não a via de perto. A cópia que `--decisao-da-pessoa` refazia tinha o mesmo defeito: bastava o texto de `receita.js` ser o da rodada para ela valer como a geometria julgada.

A base passou a ser um dado gravado. O pacote tira a impressão das partes da receita executada (`impressaoDasPartes`: por parte, a impressão da malha e a da promessa do plano) e a grava no `pacote.json`. O registro do veredito a confere contra a receita medida na hora do registro e a grava no `rodada-NN.json`, no campo `impressaoDasPartes`. O pacote seguinte lê esse campo da última rodada julgada e compara com a impressão da receita de agora. Como a impressão é do resultado da execução, a mudança num módulo importado aparece nela com o texto da receita igual.

O teste "só o módulo que a receita importa muda desde a rodada julgada" monta duas pastas com o mesmo `receita.js` e um `modulo.js` diferente em cada uma, grava na rodada julgada a impressão da primeira e gera o pacote da segunda sem trocar nada na leitura das rodadas nem na execução: a parte cuja malha depende do módulo leva vista isolada. A pasta de rodadas do teste tem também a cópia `receita-02.js`, de texto igual ao de agora, que é o caso em que a versão anterior deixava a parte sem vista.

As rodadas registradas até aqui não têm a impressão, e a invariante do plano é que nenhuma rodada registrada muda. Por isso o primeiro pacote padrão de cada peça do acervo sai com a vista isolada de todas as partes, com o aviso que diz por quê, e a escolha das partes passa a valer da rodada julgada seguinte em diante. É a diferença entre as medidas de antes e de agora na tabela abaixo.

### As outras seis correções

A parte citada em `defeitos[].parte` do veredito da rodada base leva vista isolada mesmo com a malha e a promessa iguais. Na lataria do carro, com a rodada 7 de nota 6, a chapa e o rebaixo lateral saíam sem vista; hoje entram de qualquer modo, porque a rodada 7 não tem a impressão, e passam a entrar pelo defeito quando ela existir.

O `pedido.md` não diz mais por que uma parte tem vista isolada. As frases "a malha dela difere da já julgada", "ela ainda não foi julgada", "não há julgamento anterior" e "com a malha e a forma prometida já julgadas" saíram, e ficou "a vista isolada das partes" de um lado e "que aparecem nas vistas da peça inteira" do outro, com a frase de que a falta da vista isolada não é ausência da parte e não diz que ela está certa. O teste das palavras de história passou a recusar, no que o pacote padrão acrescenta ao pedido, as formas de julgar no passado, diferir, mudar, anterior, aprovar, conferir, antes, ainda não e já, e confere que as quatro frases antigas seriam recusadas. O motivo de cada parte continua no relatório de quem conduz e no `pacote.json`.

No corte dos encaixes a escolha era o primeiro da lista ordenada pela folga, e de dois encaixes de folga zero, um apoio que encosta e um pino que fura, o segundo saía do pacote e o pedido o listava como "de folga maior". Agora entram todos os encaixes de folga até `FOLGA_DE_CONTATO_MM` (0,01 mm) e os declarados em `CRITICA.cortes`; sem nenhum que encoste, entra o de menor folga com os que empatam com ele. O pedido diz o limiar, e o que fica de fora tem folga maior que ele. A escolha e o desenho saíram de `cortesDosEncaixes` para `cortesDasFolhas`, que o teste exercita inteira com as folhas de prova, sem dublê, e gravando as imagens; o mutante que tira o `|| e.declarado` do filtro morre nele. Na fuselagem do avião os cinco encaixes têm folga zero (asas, as duas empenagens, motor e trem do nariz), e o pacote dela leva cinco cortes onde levava um.

O registro do veredito confere, em toda peça, que o `pacote.json` da pasta do pacote é da peça, mostra o texto da receita medida e mostra as mesmas partes; antes só a peça de lataria tinha conferência, e só do texto. A recusa diz o recebido, o esperado e o comando que refaz o pacote. A pasta sem `pacote.json` é recusada, e o pacote gerado antes desta correção, que não traz a impressão das partes, passa pelo texto e a rodada grava a impressão medida no registro.

As cópias de rodada com decisão da pessoa ganharam limite, que é proposta e espera a palavra dela. Ficam na pasta as das três rodadas decididas mais novas (`COPIAS_COM_DECISAO_NA_PASTA`), a da última rodada julgada e a da última rodada. A cópia de uma rodada decidida mais antiga só sai quando o último commit do git a tem com o mesmo conteúdo (`estaIgualNoGit`), e o aviso de `--decisao-da-pessoa` já traz os dois comandos de `git` que a recuperam. Foi o limite mais simples que não perde a geometria julgada: a contagem sozinha apagaria a cópia que ainda não foi a um commit. A decisão da pessoa é texto livre, de modo que o limite não distingue a reprovação do aceite.

O `MATERIAIS` da receita entra na impressão da parte: a face guarda só o nome do material, e a cor trocada na declaração mudava a imagem sem mudar a impressão. Entra a declaração de cada material que as faces da parte citam, e só neles.

Nove mutantes foram postos à mão e os nove morreram: o `|| e.declarado` do filtro, o limiar sem o piso do contato, a parte citada no defeito, a comparação das partes no registro, a do texto da receita no registro, a base no lugar da impressão de agora, o material fora da impressão, o `recuperavel` do limite das cópias e a comparação das partes na cópia refeita.

### O enquadramento das vistas da peça sozinha

A bancada enquadra cada vista para a tela dela, que reserva os lados para os painéis (`meiaAlturaParaVista`, em `src/bancada/criar-ambiente.js`, com 48 % da largura e 62 % da altura). No pacote, que sai em modo de auditoria e sem painel, a peça ficava com no máximo 48 % da largura do quadro. As cinco capturas da peça sozinha (a revisão de quatro vistas, a de trás, a da esquerda, o arame e o raio X) passaram a pedir `enquadrar`, que já existia em `tools/modelar/olhar-bancada.mjs` para as visões de reflexo e fecha a câmera no que está à vista até a maior dimensão ocupar 92 % do quadro. Para isso o `enquadrar` passou a valer junto de `--revisar` e a reaproveitar a página aberta; a chamada que recebe uma página já usada volta o zoom da câmera a 1 antes de qualquer quadro, e o teste com navegador confere que a vista sem `enquadrar`, tirada na página que serviu a uma enquadrada, sai igual byte a byte à da página nova.

O pedido não depende da escala entre vistas: cada vista já tinha o quadro dela, o texto do pedido não compara tamanho de uma vista com o de outra, e a prancha desenhada, a sobreposição e as vistas montadas têm captura própria. O conjunto de imagens não mudou. A ocupação, lida do `pacote.json` de cada pacote:

| vista da fuselagem do avião | antes | depois |
| --- | --- | --- |
| isométrica (e o arame) | 44,2 % por 14,0 % | 92,0 % por 29,1 % |
| frontal | 48,0 % por 36,9 % | 92,0 % por 70,7 % |
| direita e esquerda | 48,0 % por 7,1 % | 92,0 % por 13,6 % |
| superior | 15,8 % por 62,0 % | 23,4 % por 92,0 % |
| traseira (e o raio X) | 48,0 % por 36,9 % | 92,0 % por 70,7 % |

No cilindro de inclinação da empilhadeira as mesmas vistas ficaram em 92,0 % por 49,2 % na isométrica, 92,0 % por 69,8 % na frontal e na traseira, 92,0 % por 29,9 % nas laterais e 52,0 % por 92,0 % na superior. O quadro continua de 1100 por 1450, em pé, que é a resolução fixa do tipo no `pacote.json`; a peça comprida enche a largura e deixa a altura, e trocar a proporção do quadro por vista mudaria a resolução por tipo, o que ficou fora desta correção. As vistas isoladas das partes continuam com o foco da bancada, a 48 % da largura, porque o pedido foi a peça sozinha.

### O tempo, antes e depois

| medida da fuselagem do avião | tempo | imagens na pasta | capturas da bancada |
| --- | --- | --- | --- |
| antes das correções e do enquadramento, sem vista de parte | 46,0 s | 11 | 24,4 s |
| depois, com o mesmo conjunto sem vista de parte | 57,8 s | 15 | 35,2 s |
| depois, como o comando sai hoje, com as treze partes | 86,7 s | 41 | 63,6 s |

A segunda linha foi medida com a rodada base trocada por uma que grava a impressão de agora, que é como o pacote sairá depois da próxima rodada julgada da peça. As quatro imagens a mais são os cortes dos encaixes que o empate tirava, e somam 1 s. Os 10,8 s a mais das capturas são do quadro cheio: medidas uma a uma, as cinco capturas da peça sozinha foram de 14,7, 2,8, 1,7, 2,0 e 3,1 s para 18,7, 5,2, 2,5, 3,0 e 5,5 s, com uma carga de página nos dois casos. A peça cobre perto de quatro vezes mais pontos do quadro, e o navegador sem placa de vídeo desenha por software. Uma volta só do ajuste na câmera ortográfica, no lugar das cinco, não mudou o tempo e foi desfeita. O cilindro de inclinação saiu em 90,5 s com 15 imagens, contra 71,9 s com 11 na medida anterior, com as duas partes em vista isolada.

### As imagens para a pessoa conferir

Os dois pacotes ficaram em `tools/bancadas/out/`, fora do git: `critica-aviao-fuselagem/rodada-04/` e `critica-empilhadeira-cilindro-inclinacao/rodada-02/`. As vistas da peça sozinha são `bancada-<peça>-<vista>-orto-enquadrado.png` nas seis vistas, `...-isometrica-orto-arame-enquadrado.png` e `...-traseira-orto-raio-x-enquadrado.png`. Elas se regeneram com `npm run vistas:critica -- aviao/fuselagem` e `npm run vistas:critica -- empilhadeira/cilindro-inclinacao`.

### O que ficou de fora

A ação da rodada (`--acao`) ainda compara a forma julgada com a atual executando a cópia da última rodada julgada com os módulos de hoje (`impressaoDaForma`), que é o mesmo defeito do primeiro achado noutro lugar; a rodada que grava a impressão das partes já tem o dado para trocar essa comparação, e a troca não foi pedida aqui. Os documentos de uso que descrevem o pacote, fora do território deste plano, não foram mudados. O nome novo dos arquivos das vistas da peça sozinha faz o antes e depois não achar a imagem de mesmo nome no pacote da rodada anterior, na primeira rodada depois da mudança.

O roteiro `modelar/rodada` lia 12.047 bytes contra o orçamento de 11.900 desde o commit `5726ca45`, que pôs no corpo da skill do laço a frase sobre a cópia da receita da rodada decidida, e `npm run roteiros:check` reprovava. A frase foi para o apoio `pacote-e-referencia.md`, com o limite das cópias, e o gate voltou a passar.
