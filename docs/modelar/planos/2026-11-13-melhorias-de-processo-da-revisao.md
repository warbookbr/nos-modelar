# Melhorias de processo da revisão: menos reenvio sem defeito e menos coisa escrita à mão

**Estado:** ativo

**Território:** `tools/gates/`, `tools/testes-lentos.mjs`, `tools/testes-lentos.test.mjs`, `tools/vitest-duracoes.mjs`, `tools/mapa/`, `docs/modelar/roteiros/`, `.gitattributes`, `tools/arquitetura/independencia-catalogo.mjs`, `tools/arquitetura/nucleo-sem-three.mjs`, `tools/arquitetura/nucleo-sem-three.test.mjs`, `tools/catalogo/`, `.claude/agents/implementador.md`, `.claude/agents/modelador.md`, `.claude/agents/revisor-adversarial.md`, `.claude/agents/desenhador-de-contorno.md`, `.claude/agents/desenhista-de-prancha.md`, `.claude/REGRAS-DOS-AGENTES.md`, `docs/modelar/MECANISMOS.md`, `docs/modelar/banco-de-provas/README.md`, `tools/modelar/rodada-de-modelagem.mjs`, `tools/modelar/rodada-de-modelagem.test.mjs`, `tools/modelar/capacidade.mjs`, `tools/modelar/capacidade.test.mjs`, `tools/modelar/comecar.mjs`, `tools/modelar/comecar.test.mjs`, `tools/modelar/exportar.mjs`, `tools/gates.mjs`, `README.md`, `docs/modelar/INDEX.md`

**Responsável:** a IA da sessão do furgão; as mudanças foram aprovadas pela pessoa em 2026-11-13.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-13.

## Problema observado

A [revisão do projeto](../decisoes/PLANOS-ENCERRADOS.md) mediu, no [relatório](../banco-de-provas/revisao-do-projeto-2026-11-13/RELATORIO.md), que de sete reprovações lidas do CI uma era defeito de peça, três eram teto de tempo e uma era corrida de junção; que o único defeito real seria pego em 2 minutos por uma guarda que só roda no CI; que o mapa gerado conflita em toda junção; que a lista de planos ativos é escrita à mão em três arquivos; que a mesma lista de proibições foi copiada no pedido a cinco agentes; e que o projeto não tem uma página com a visão dos mecanismos.

## Resultado

Um envio com a peça certa não reprova por tempo nem por arquivo gerado, o defeito de peça aparece antes do envio, e o que hoje se copia à mão passa a ter uma fonte só.

## Filtro Agent-First

USAR DIRETO: a bateria `tools/gates.mjs` com o seletor do que mudou, o registro de durações do vitest, o gerador do mapa e o gerador dos roteiros. Nenhuma ferramenta nova fora dessas.

## Incluído, em fatias pela ordem de execução

1. A guarda do acervo das peças que o envio mudou roda na bateria local. Prova: um defeito de borda livre plantado numa peça de fixture para a bateria local.
2. O teto de tempo de cada teste passa a ser relativo à mediana das durações guardadas, e o estouro isolado vira aviso. Prova: o teste das conferências da instalação solar, que reprovou a 80 s no CI e roda em 27 s sozinho, não reprova mais; um teste que dobra de tempo em três execuções seguidas reprova.
3. Os cinco roteiros a menos de 500 bytes do teto ganham 10% de folga, com a linha de base mantida.
4. O mapa gerado deixa de conflitar na junção, por regra de junção que o regenera ou por sair do versionamento, o que a medida mostrar mais simples; a lista de planos ativos do `README.md` e do `docs/modelar/INDEX.md` passa a ser gerada do índice de planos.
5. A régua da fronteira do núcleo cobre arquivos `.mjs` e `.ts` e reprova import de `src/`, `tools/` e `modulos/`. As cinco extensões entram no catálogo gerado.
6. As proibições comuns aos agentes moram em `.claude/REGRAS-DOS-AGENTES.md`, citado por cada definição de agente, e cada agente grava commit parcial na worktree ao fim de cada etapa. O `critico-visual.md` não muda.
7. O diário de atritos ganha um formato com quatro campos (o que aconteceu com o comando, o custo, se o processo pegou e o destino), escrito em `.claude/REGRAS-DOS-AGENTES.md`, porque nenhuma skill manda registrar o diário do objeto; os diários antigos não são reescritos.
8. A página `docs/modelar/MECANISMOS.md`, de uma tela, com cada mecanismo, o que faz, quando é usado e onde mora, e a conferência que acusa mecanismo novo fora da lista.

9. A ferramenta de rodadas guarda só a cópia da receita da última rodada, e as cópias antigas saem do acervo; em cada pasta de peça este plano tira só esses arquivos. Entrou no lugar de tirar as rodadas do furgão à mão, que a revisão recomendava: a correção foi para a ferramenta. Feita em 2026-11-13: 87 cópias e 51.159 linhas a menos em 42 pastas, com a diferença de cada rodada mantida no registro.

10. O índice `docs/modelar/banco-de-provas/README.md` passa a ser gerado das pastas, com o documento de entrada e o título de cada uma, e conferido. Nasceu escrito à mão em 2026-11-13, quando os planos que alcançavam essas pastas saíram da árvore, e já lista só parte delas.

11. `npm run capacidade -- <operação>` imprime a ficha das 42 operações e das cinco extensões a partir do que o registro publica, e `npm run comecar -- <nome>` acha operação, ficha e comando pelo nome. Aprovadas pela pessoa em 2026-11-13, depois da análise dos mecanismos, e feitas por um agente no mesmo dia.

12. A publicação de peças em `pecas-resolvidas/` sai: a pasta, o comando `exportar` e o gate `exportar:check`, na bateria e no CI. A pessoa apontou em 2026-11-13 que a pasta nunca foi usada; a lista de peças publicadas estava vazia desde 2026-08-02, e o gate conferia zero peças a cada envio. O formato de peça resolvida, o leitor e `tools/modelar/exportar-peca.mjs` ficam, porque a montagem e as famílias os usam. Feita no mesmo dia.

13. A bateria local roda os testes lentos ligados ao que o envio mudou, até 8 arquivos ou 5 minutos, e o resto fica para o CI com a lista dita. Entrou depois de duas reprovações do CI em 2026-11-13 por teste lento ligado direto ao arquivo mudado. Feita no mesmo dia, com as fatias 8 e 10: `mecanismos:check` acusa pasta nova fora da página, e o índice do banco de provas é gerado e conferido pelo `mapa:check`.

Estado em 2026-11-13. Feitas por três agentes e conferidas por quem conduz: a fatia 1 (`tools/gates/guarda-local.mjs`, com a guarda de cada peça mudada e o limite de 60 s); a fatia 4 (regra `merge=union` para o mapa no `.gitattributes`, com `npm run mapa` depois de toda junção, e `npm run planos:gerar` para as linhas do `README.md` e do `INDEX.md`); a fatia 5 (a régua da fronteira em `independencia-catalogo.mjs`, com 67 arquivos e 113 imports conferidos, e as cinco extensões no catálogo). Feita por quem conduz: a fatia 3. A fatia 2 fechou em duas rodadas: o teto relativo, e depois o histórico de durações circulando no CI pelo cache, por modo, parte e ramo, o prazo padrão do vitest de 180 s para 900 s como guarda contra travamento, e a razão do furgão no `acervo-real` como aviso; o cache só se prova no CI, e a main não alimenta o histórico porque o avanço dela não dispara a bateria. Feita em parte: a fatia 8, com a página escrita e a conferência por fazer. As fatias 6 e 7 foram fechadas por quem conduz: as cinco definições de agente citam o arquivo de regras, e o formato do diário de atritos está nele.

## Excluído

- as mudanças de núcleo, que são do [plano do núcleo para quem escreve receita](2026-11-13-nucleo-para-quem-escreve-receita.md);
- a avaliação de cada gate e teste, que é do [plano das verificações](2026-11-13-revisao-das-verificacoes-e-dos-testes.md);
- a régua única de face degenerada, que é do [plano das costuras](2026-11-09-costuras-e-furos-limpos.md);
- a reorganização das pastas de documento e a saída de manual, que terão plano próprio.

## Invariantes

Nenhum gate deixa de rodar no CI. O orçamento de leitura continua abaixo da linha de base. O conteúdo gerado continua conferido contra a fonte.

## Gate de saída

Cada fatia tem a prova dela passando e `npm run gates` verde. Ao fim, três envios seguidos com junção da main não pedem resolução manual do mapa.

## Riscos e parada

O teto relativo esconder uma regressão lenta de tempo: por isso três execuções seguidas acima do teto reprovam. A guarda local alongar a bateria: ela roda só as peças mudadas, e se passar de 60 s numa peça fica para o CI com aviso. Se uma fatia pedir arquivo do território de outro plano ativo, ela para e o pedido vai à pessoa.

## Fechamento

Preencher ao concluir ou cancelar.
