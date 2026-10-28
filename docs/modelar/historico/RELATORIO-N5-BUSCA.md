# Relatório N5 — busca residual controlada

**Decisão:** C3 funciona no recorte sintético; N6 continua bloqueada.

N5 não escolhe a forma de um carro. Ela testa se uma liberdade que sobra de C2
pode ser buscada de maneira determinística, com objetivo declarado e gates que
impedem a busca de romper a superfície.

## Contrato da busca

- liberdade única: `bojoRelativo`, de 0,08 a 0,18, passo 0,005;
- alvo medido: bojo central de 41,6 mm acima da base suave;
- candidatos: 21, todos avaliados antes da ordenação;
- elegibilidade: as três restrições N4, C1 regular e diedro máximo ≤ 19°;
- desempate: erro do objetivo, P95 C1 e valor do parâmetro, nesta ordem.

O vencedor é `bojoRelativo = 0,16`, com erro de 0 mm, P95 de 4,771°, máximo de
18,704° e nenhuma aresta abrupta. As seis imagens obrigatórias foram abertas
individualmente e são vinculadas ao manifesto por SHA-256.

## O que isso prova — e o que não prova

Prova que a IA pode declarar uma variável livre real, definir uma função-objetivo
mensurável e deixar a busca escolher somente candidatos geometricamente válidos.
O alvo é deliberadamente sintético: ele não é referência visual de carro esportivo real,
nem torna o vencedor uma carroceria, nem valida proporção ou reconhecimento.

N6 fica bloqueada até existir um alvo automotivo vinculante, suas vistas e
landmarks, briefing de rejeições e crítica independente sem conhecer a receita.

## Reexecução

```text
npx vitest run autoria-assistida/experimentos/sonda-busca-n5/sonda-busca-n5.test.mjs
node autoria-assistida/experimentos/sonda-busca-n5/gerar-evidencias.mjs
npm run procedencia:check -- autoria-assistida/experimentos/sonda-busca-n5/fonte-n5.json
```
