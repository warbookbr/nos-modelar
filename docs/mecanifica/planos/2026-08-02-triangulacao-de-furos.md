# AUT-2026-03 — triangulação robusta de vários furos

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `87e72d1`

## Problema observado

`furo` aceita vários anéis na mesma face e preserva a malha quando a partição
falha, mas três figuras geometricamente válidas ainda abortam com “nenhuma
orelha livre”. Elas têm muitos furos próximos da borda e expõem um limite da
ponte gulosa seguida de orelhas, não uma entrada inválida. A fronteira medida
está no A-33 de [`ATRITOS-AUTORIA.md`](../ATRITOS-AUTORIA.md).

## Resultado

Os 37 casos válidos que a varredura histórica encontrou devem receber uma
triangulação determinística sem criar vértices no contorno. Casos realmente
inválidos continuam falhando fechados antes de alterar a malha.

## Incluído

- estratégia determinística de busca para as pontes/orelhas e, só depois dela,
  fallback completo para polígono com buracos;
- preservação byte a byte do primeiro caminho que já funciona;
- provas das três figuras antes bloqueadas e da casca dos dois lados do furo;
- limite explícito de busca, com diagnóstico fechado se ele for atingido.

## Excluído

- booleana genérica, criação de vértices auxiliares ou junção em T;
- aceitar anéis que se cruzam, se encostam ou saem da face;
- alterar a identidade publicada por `furo`;
- alterar peças de produto sem necessidade.

## Gate de saída

1. as referências existentes continuam byte-idênticas quando o caminho antigo
   já fecha;
2. as 37 figuras anteriormente bloqueadas produzem casca fechada, área certa
   e uma borda por aresta de anel;
3. saída, entrada e replay são determinísticos;
4. casos inválidos preservam o abortamento atômico;
5. se o fallback completo não satisfizer as provas, o erro histórico continua
   fechado e sem alocar geometria parcial;
6. suíte, gabarito, ids crus, mapa e documentação ficam verdes.

## Fatias

1. reproduzir e medir a fronteira que ainda falha;
2. introduzir fallback determinístico e limitado;
3. provar integridade, determinismo e inércia;
4. atualizar documentação e encerrar.

## Riscos e parada

- busca sem limite pode transformar uma peça válida em travamento;
- escolher outro primeiro caminho para figuras existentes quebraria replay;
- se o fallback exigir vértice novo na borda, este plano para: isso criaria
  junção em T e pede outro desenho.

## Fechamento

Concluído em 2 de agosto de 2026. O caminho de pontes histórico permanece
prioritário e byte-idêntico para o acervo; as três ordens antigas e oito escolhas
alternativas continuam determinísticas. Quando todas elas falham, `earcut`
triangula apenas os vértices já aprovados e sua saída passa pelas mesmas provas
de contagem, área, borda e identidade antes de virar face.

Evidência: as 37 assinaturas históricas fecharam em `oficina.test.ts`, os três
exemplos representativos atravessaram `adaptarThree`, a fixture neutra de dez
furos foi revisada na bancada em isométrica e superior (144 faces, 0 órfão, 0
face sem identidade), e o gabarito manteve as 28 peças existentes byte-idênticas.
Os gates completos passaram antes do commit de encerramento.
