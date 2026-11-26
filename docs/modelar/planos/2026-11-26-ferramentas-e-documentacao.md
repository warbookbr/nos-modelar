# Ferramentas e documentação: toda ferramenta registrada e achada, e o roteador cobrindo o trabalho inteiro

**Estado:** ativo

**Núcleo:** não

**Território:** `tools/README.md`, `tools/registro-de-ferramentas.json`, `tools/mapa/registro-de-ferramentas.mjs`, `tools/mapa/registro-de-ferramentas.test.mjs`, `tools/modelar/comecar.mjs`, `tools/modelar/comecar.test.mjs`, `docs/modelar/roteiros/`, `tools/mapa/roteiros.mjs`, `docs/COMECE-AQUI.md`, `.claude/agents/modelador.md`, `.claude/agents/implementador.md`, `.claude/agents/esbocista.md`, `.claude/agents/desenhador-de-contorno.md`, `.claude/agents/desenhista-de-prancha.md`, `.claude/settings.json`, `.mcp.json`, `docs/modelar/banco-de-provas/ferramentas-e-documentacao-2026-11-26/`.

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
3. Os ramos do roteador e o orçamento com a skill, e o fechamento.

## Riscos e parada

Se o registro acusar ferramenta que alguém usa por fora do repositório, ela fica registrada como externa, com o motivo.

## Decisão da pessoa

## Andamento

## Fechamento
