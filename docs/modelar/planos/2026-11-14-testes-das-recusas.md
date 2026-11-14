# Testes das recusas e dos pontos sem proteção

**Estado:** ativo

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
