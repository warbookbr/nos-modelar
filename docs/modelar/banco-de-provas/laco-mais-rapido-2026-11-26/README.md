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
