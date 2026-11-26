# Ferramentas e documentação: toda ferramenta registrada e achada, e o roteador cobrindo o trabalho inteiro

**Estado:** ativo

**Núcleo:** não

**Território:** `tools/README.md`, `tools/registro-de-ferramentas.json`, `tools/mapa/registro-de-ferramentas.mjs`, `tools/mapa/registro-de-ferramentas.test.mjs`, `tools/modelar/comecar.mjs`, `tools/modelar/comecar.test.mjs`, `docs/modelar/roteiros/`, `tools/mapa/roteiros.mjs`, `docs/COMECE-AQUI.md`, `.claude/agents/modelador.md`, `.claude/agents/implementador.md`, `.claude/agents/esbocista.md`, `.claude/agents/desenhador-de-contorno.md`, `.claude/agents/desenhista-de-prancha.md`, `.claude/REGRAS-DOS-AGENTES.md`, `.claude/settings.json`, `.mcp.json`, `.gitignore`, `docs/modelar/banco-de-provas/ferramentas-e-documentacao-2026-11-26/`, `tools/mapa/roteiros.test.mjs`, `tools/mapa/pedido-ao-agente.mjs`, `tools/mapa/pedido-ao-agente.test.mjs`, `docs/modelar/usar/EXPORTACAO.md`, `docs/modelar/usar/MEDIDAS-AVULSAS.md`, `docs/modelar/usar/README.md`, `.claude/skills/criar-peca/references/referencia-e-rodadas.md`.

Ativado pela pessoa em 2026-11-26, com as recomendações 7 e 8 da análise do projeto ("1 a 10 aprovadas") e os achados fora da lista ("Sobre os achados sao importantes, tambem vou seguir sua recomendação em relação a eles").

**Responsável:** a IA da sessão implementa; a pessoa decide o que se apaga entre as ferramentas sem chamador.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-26.

## Problema observado

Não há registro único de ferramentas: 34 linhas de comando não têm entrada no `package.json` (a zebra numérica e a distância à pele entre elas), 21 arquivos (cerca de 2.100 linhas) só são alcançados por teste, e o `tools/README.md` descreve uma pasta que não existe desde outubro (`ferramentas.md`). O roteador não tem ramo para conduzir a rodada, montar e exportar, e o orçamento de leitura não soma a skill que o roteiro manda aplicar, de modo que criar uma peça custa 4.500 palavras, 61% acima do que o gate mede; cinco definições de agente copiam o mesmo bloco de regras; a página de entrada diz 54 peças e a árvore tem 64 (`documentacao.md`). O `.claude/settings.json` libera `Bash(kill *)` enquanto as regras dos agentes proíbem `kill`, e o servidor MCP está ligado só para o Codex, embora o `CLAUDE.md` cite a ferramenta MCP `comecar` (`ferramentas.md`, `processo.md`).

## Resultado

Um registro de ferramentas com gate que recusa linha de comando fora dele e módulo sem chamador; o `tools/README.md` gerado dele; o roteador com ramos de rodada, montagem e exportação e o orçamento somando a skill aplicada; os agentes sem o bloco copiado; a contagem de peças conferida por teste; o `kill` fora da lista liberada; e o MCP ligado para o Claude por `.mcp.json`.

## Excluído

- apagar ferramenta sem a decisão da pessoa; mudar o comportamento de qualquer ferramenta; `.claude/agents/critico-visual.md`.

## Invariantes

Todo comando de hoje continua respondendo igual; o orçamento de leitura só desce.

## Gate de saída

1. O registro com o gate, testado nos dois sentidos, e a lista das ferramentas sem chamador levada à pessoa.
2. O roteador com os três ramos novos dentro do orçamento, e o orçamento somando a skill.
3. O `kill` fora da lista e o MCP respondendo `comecar` numa sessão do Claude.
4. `npm run gates` verde e o CI verde.

## Fatias

1. O `kill`, o `.mcp.json`, a contagem de peças e o bloco copiado dos agentes.
2. O registro de ferramentas com gate e o `tools/README.md` gerado.
3. Os ramos do roteador e o orçamento com a skill; o roteador mostrando o que existe para o objeto e a vigia por `MODELAR_VIGIA`; a ferramenta de uso que nenhum guia cita reprovada; e o comando que monta o pedido ao agente.
4. A decisão da pessoa sobre as ferramentas sem chamador, e o fechamento.

## Riscos e parada

Se o registro acusar ferramenta que alguém usa por fora do repositório, ela fica registrada como externa, com o motivo.

## Decisão da pessoa

Decidido pela pessoa em 2026-11-26, pelas recomendações: o comando que monta o pedido ao agente a partir do plano (território, gate e regras comuns, com os números tirados do banco de provas com a data), em que quem conduz escreve só a tarefa ("1, 2, 3, 4 sim"); toda ferramenta de uso aparece em algum roteiro, skill ou guia, conferido pelo registro (29 das 108 não apareciam), e o `comecar` mostra, no planejamento de uma peça, as ferramentas e famílias que servem ao tipo de objeto ("pode sim"); e, no lugar da tarefa agendada diária, o `comecar` mostra os ramos parados e o último CI vermelho só quando a variável `MODELAR_VIGIA=1` está ligada no ambiente de quem conduz, e sai calado sem rede, para quem clona o repositório não ver o que não é dele ("Pode fazer isso sim, eu permito!").

## Andamento

Em 2026-11-26 a fatia 3 foi feita: os ramos `modelar/rodada`, `modelar/montar` e `modelar/exportar` no roteador, com a página `docs/modelar/usar/EXPORTACAO.md`; o orçamento de leitura somando a skill que o roteiro manda aplicar; o `comecar -- modelar/peca/nova --objeto=<tipo>` listando as ferramentas e as famílias do tipo; a vigia com `MODELAR_VIGIA=1`; o campo `aparece` no registro, com a ferramenta de uso que nada cita reprovada (12 citadas, a maioria na página nova `MEDIDAS-AVULSAS.md`, e 5 marcadas internas); e o `npm run pedido`. O orçamento da peça nova passou de 16.500 para 26.500 bytes sem que a leitura crescesse: os 10.007 bytes da skill de alinhamento, que o roteiro manda aplicar, já eram lidos e não eram contados, e a medida passou a contá-los; a partir daqui ele só desce.

## Fechamento
