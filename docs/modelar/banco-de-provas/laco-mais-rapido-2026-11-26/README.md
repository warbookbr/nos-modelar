# Laço mais rápido: fatia 1, a dobra e o vinco pela execução guardada e a decisão da pessoa na rodada

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

O teste `tools/modelar/dobra-da-superficie.test.mjs` prende a igualdade na carenagem de prova (medidas, simetria e espessura) e no ombro do braço: a superfície lida da execução guardada contra a refeita, e a dobra e o vinco pela execução direta, pelo cache frio, pelo cache quente e por uma execução sem as chapas.

## A decisão da pessoa na rodada

A rodada ganhou o campo opcional `decisaoDaPessoa`, ao lado de `veredito`. `registrarRodada`, em `src/autoria/laco-de-modelagem.js`, grava o texto `"<quem decidiu>, <AAAA-MM-DD>: <as palavras dela>"`, que é o formato que a ferramenta já cobra do `por` de `rodadas/limite.json` e de `--motivo-dos-pontos`; a expressão e o texto do formato passaram a morar nesse arquivo e a ferramenta os importa. O valor vem de `--registrar ... --decisao-da-pessoa "<texto>"` ou do campo `decisaoDaPessoa` do JSON de `--registrar rodada.json`, e de um lugar só. O formato errado é recusado antes de medir, com o recebido, o esperado e o comando:

```
rodada-de-modelagem: 'decisaoDaPessoa' recebido: "aprovada"; esperado "<quem decidiu>, <AAAA-MM-DD>: <as palavras ou o porquê>", só com a data e as palavras da pessoa. Registre com `node tools/modelar/rodada-de-modelagem.mjs <peça> --registrar ... --decisao-da-pessoa "a pessoa, 2026-11-26: aprovada, pode seguir"`, ou sem a opção quando a pessoa ainda não decidiu.
```

A opção sem `--registrar` também é recusada. Sem a decisão a rodada sai com as mesmas chaves de antes, e nenhum arquivo de rodada do acervo foi tocado. `--acao` mostra, depois da próxima ação, a decisão da última rodada que a tem, e a ação não é decidida por ela.

Os testes cobrem os dois sentidos em `src/autoria/laco-de-modelagem.test.js` e `tools/modelar/rodada-de-modelagem.test.mjs`: grava com a decisão no formato, sai igual sem ela, recusa onze formas erradas no núcleo e cinco na ferramenta sem medir nem gravar, não muda a rodada anterior e recusa na linha de comando.

## O que ficou de fora

A rodada gravada não é reescrita, então a decisão que a pessoa dá depois do registro não tem como entrar naquela rodada: hoje ela só pode ir no registro da rodada seguinte. Gravar a decisão depois, sem reescrever a rodada, pede um arquivo ao lado (como o `limite.json`) e é escolha de desenho que esta fatia não fez.

A skill do laço (`.claude/skills/laco-de-modelagem/`) ainda não manda passar `--decisao-da-pessoa`; ela é repartida na fatia 2 e a instrução entra lá.

O gate de saída 1 do plano pede o tempo da ação da rodada antes e depois: é 29,9 s e cerca de 28 s. Baixar a ação da rodada daqui em diante depende da medida das partes e da referência dentro do `descrever`, que não são do território deste plano.
