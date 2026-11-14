# Testes das recusas e dos pontos sem proteção

**Estado:** concluído

**Território:** os testes de `procedural/nucleo/operacoes/` (`subdivisao`, `friso`, `espelha`), `src/autoria/contatos-da-peca.js` e o teste dele, os testes de `tools/mcp/` para `parametros` e `procedural.mjs`, os pisos de tamanho do acervo nos testes, a leitura da linha do friso e um gate novo em `tools/gates/`.

**Responsável:** a IA da sessão do furgão; a pessoa aprovou em 2026-11-14 a recomendação da [revisão das verificações](../banco-de-provas/revisao-das-verificacoes-2026-11-13/VEREDITOS.md).

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-14.

## Problema observado

A medida por estrago achou 85 estragos reais que nenhum teste percebeu. Somadas ao piloto, 49 recusas ou `throw` foram tirados de `subdivisao`, `friso`, `espelha` e `contatos-da-peca` sem que nenhum teste reprovasse; o modo estrutural do `espelha` passou 7 de 7, e a reflexão por plano fora da origem passa errada. O schema de entrada e os códigos de saída de `parametros` e a paginação de `procedural.mjs` não têm teste. Dois estragos no `friso` (linhas 405 e 422) prendem a operação em laço sem fim, que o prazo do vitest não interrompe. Os pisos de tamanho do acervo não pegaram nada.

## Resultado

Cada recusa de entrada dessas quatro fontes tem um teste que passa a entrada ruim e confere o campo citado na recusa; o `espelha` tem teste do modo estrutural e de plano fora da origem; `parametros` e a paginação têm teste; os pisos do acervo seguem o tamanho lido; a leitura da linha do friso para com recusa depois de um número de voltas; e um gate recusa recusa nova sem teste que a exercite.

## Filtro Agent-First

USAR DIRETO: vitest e o seletor de testes ligados. ADIAR: biblioteca de mutação.

## Incluído

Os testes acima, o limite de voltas do friso e o gate de recusa exercitada.

## Excluído

Mudar comportamento de operação além do limite de voltas; apagar teste; mudar tetos de tempo.

## Invariantes

A malha de todas as peças do acervo sai idêntica (`node tools/modelar/retrato-do-acervo.mjs --comparar` com saída 0). Uma carga pesada por vez.

## Gate de saída

1. Os estragos de recusa e do `espelha` listados em `ESTRAGOS.md`, refeitos numa cópia, são percebidos pelos testes novos.
2. O friso estragado nas linhas 405 e 422 termina em recusa e não em laço.
3. O gate novo está em `tools/gates.mjs` e no CI e recusa uma recusa sem teste.
4. Retrato do acervo com 0 e `npm run gates` verde.

## Fatias

1. Testes de recusa de `subdivisao`, `friso`, `espelha` e `contatos-da-peca`, e o limite de voltas do friso.
2. Modo estrutural e plano fora da origem do `espelha`.
3. Schema de `parametros`, paginação de `procedural.mjs` e pisos do acervo pelo tamanho lido.
4. Gate de recusa exercitada.

## Decisões que dependem da pessoa

Nenhuma além da já dada.

## Riscos e parada

Se a reflexão fora da origem estiver errada de fato, a correção muda malha de peça que use espelho fora da origem: para e leva à pessoa.

## Andamento

- 2026-11-14, fatia 1: testes de recusa de `subdivisao` (10 casos mais o do limite de vértices, em `TESTES_LENTOS`), `friso` (16 casos) e `contatos-da-peca` (15 casos). Refeitos os estragos que nenhum teste percebia: 6 de 7 em `subdivisao` (o 7º, a linha 389, não tem entrada que o alcance: a validação de `subdividirCatmullClark` recusa antes), 9 de 11 em `friso` (as linhas 479 e 521 não têm entrada que as alcance: 2238 perfis de aba válidos varridos, nenhum se cruza) e 12 de 13 em `contatos-da-peca` (a linha 223 é equivalente). O laço dos estragos 405 e 422 do `friso` estava em `distancias`, do `fixtures/medidas-de-malha.js` do teste da fatia 13, e não na operação: sem triângulo a medir, o anel de células crescia para sempre. `distancias` agora recusa a malha vazia e para com erro depois de 30 voltas; com os dois estragos o teste termina em 4 s com recusa.
- 2026-11-14, fatia 2: `procedural/nucleo/operacoes/espelha.test.ts` (24 casos): a reflexão `2*pos - p` nos três eixos com o plano em 0, 3 e -1,5 (a medida mostrou que a reflexão fora da origem está certa), a ordem e a numeração dos vértices e faces novos, o modo estrutural (origem, cópias, transformação, seleção da origem do espelho) e as oito recusas dele. Refeitos os 15 estragos que nenhum teste percebia: 13 percebidos. Ficam o 267 (face ou vértice-fonte inexistente, que a resolução da origem já impede) e o 279 (o contador do estouro de bloco, que só difere acima de 1,04 milhão de vértices).
- 2026-11-14, fatia 3: `tools/mcp/perfis/parametros-contrato.test.mjs` (17 casos, com as duas funções de medida trocadas por duas que guardam o que receberam) refaz os 14 estragos de `parametros.mjs`, os 14 percebidos. `tools/mcp/perfis/procedural-paginacao.test.mjs` (16 casos, com um serviço de descoberta de mentira) refaz os 16 de `procedural.mjs`: 15 percebidos; o 16º, o limite padrão de 8 da linha 101, é equivalente, porque o schema já preenche `limite` com 8 antes da ferramenta ler a entrada. Os seis pisos de acervo agora seguem o tamanho lido: `material-da-receita.acervo.test.js` compara as receitas com os arquivos que citam `MATERIAIS` e as comparações com a conta das receitas e dos materiais lidos, `custo-de-importar-receita.test.mjs` compara com `pecasDoAcervo()` e `origem-das-fontes.test.mjs` exige a tabela igual às peças que trazem `fonte-partes.json`.
- 2026-11-14, fatia 4: o gate `recusas:check` (`tools/gates/recusas-exercitadas.mjs`, com teste próprio), em `tools/gates.mjs` e no `ci.yml`. Lê por texto as seis fontes vigiadas e exige que cada mensagem de `grita`, `throw`, `erro:` e `erroAcionavel` apareça, em trecho de 20 caracteres, em algum arquivo de teste; a recusa nova com mensagem nova reprova (medido com uma recusa de texto inventado acrescentada a `subdivisao.js`). Para passar, entraram os testes de 13 recusas de ajuda que a amostra do passo 2 não tinha tocado (vinco e grupo sem nome, `liso`, variação, linha sobre a superfície, chapa mudada depois do passo) e quatro exceções com motivo, três delas ainda sem teste por falta de fixture. A heurística aceita mensagens que repetem frases de outra (a 250 do `friso` passa citada pela 255); só a medida por estrago separa as duas.

## Fechamento

Concluído em 2026-11-14, nas quatro fatias. Entraram os testes de recusa de `subdivisao`, `friso`, `contatos-da-peca` e `espelha`, o contrato de `parametros`, a paginação de `procedural.mjs`, os pisos do acervo lidos do tamanho do acervo e o gate `recusas:check`, no CI. Os estragos que antes passavam passaram a ser percebidos, menos os equivalentes ou inalcançáveis, cada um com motivo escrito. A reflexão do `espelha` fora da origem estava certa, e o risco do plano não se realizou. O laço sem fim do friso estragado estava na medida de malha das fixtures de teste e não na operação: ela agora recusa malha vazia e para em 30 voltas. Nenhum código de produto mudou, e a malha do acervo é a mesma por construção. Ficaram no BACKLOG as duas recusas do `friso` ainda sem teste por falta de fixture e a comparação do retrato do acervo contra um commit base.
