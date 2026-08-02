# AUT-2026-01 — contagem circular por desvio

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `986efeb`

## Problema observado

O autor escolhe `lados` como um número sem unidade. Assim, 12 lados num furo e
16 num flange não informam qual superfície é mais facetada. A evidência e a
fronteira estão no A-34 de [`ATRITOS-AUTORIA.md`](../ATRITOS-AUTORIA.md).

## Resultado

Em `cilindro`, `cone` e `furo`, a IA pode escrever `lados: { desvio: X }` e o
núcleo deriva a menor contagem que mantém a flecha do polígono inscrito menor
ou igual a `X`.

## Incluído

- derivação pura e determinística da contagem;
- forma aditiva em `cilindro`, `cone` e `furo`;
- no `furo` com raios diferentes, uso do maior raio do passo;
- diagnóstico fechado para forma, medida ou orçamento inválidos;
- prova geral não automotiva e inspeção visual na bancada;
- atualização do contrato e do registro de atritos.

## Excluído

- esfera, `lathe` e `loft`, que precisam de mais de uma regra geométrica;
- LOD por câmera ou distância;
- contagem diferente por grupo dentro do mesmo passo de furo;
- arredondamento da quina do aro;
- alteração automática das peças de produto existentes.

## Gate de saída

1. `lados` numérico preserva o neutro e os diagnósticos atuais;
2. para contagem derivada `L`, a malha mede flecha `<= desvio`, enquanto
   `L - 1` excede a tolerância quando `L > 3`;
3. dois raios no mesmo passo de furo derivam `L` pelo maior;
4. forma inválida grita antes de criar o primeiro id; estouro derivado grita com
   a contagem e o custo, enquanto o estouro numérico mantém o `throw` atual;
5. duas execuções produzem `neutroCanonico` byte-idêntico;
6. fixture geral usa as três operações, passa em integridade e é conferida em
   pelo menos dois enquadramentos;
7. suíte, gabarito, ids crus, mapa e documentação ficam verdes.

## Fatias

1. fixar a derivação e suas propriedades em teste;
2. integrar em `furo`, preservando a regra de um `L` por passo;
3. integrar em `cilindro` e `cone`;
4. provar numa fixture geral e revisar visualmente;
5. atualizar documentação, medir compatibilidade e encerrar.

## Riscos e parada

- O modo automático põe o raio na topologia: mudar o raio pode renumerar as
  famílias internas do passo. Isso será declarado; o modo numérico não muda.
- Uma tolerância pequena pode exceder o bloco de ids. O passo deve abortar
  inteiro antes de tocar na malha.
- Se a derivação exigir alterar numeração do modo antigo, o plano para e é
  redesenhado.

## Fechamento

Concluído em 2 de agosto de 2026. O modo numérico permaneceu byte-idêntico e o
modo por desvio passou pelas provas de minimalidade, raio governante,
determinismo e falha fechada. A fixture `_gabarito-de-furacao` passou em
integridade e foi revista nas vistas isométrica, superior e frontal, inclusive
com o furo isolado.

Evidência final: 42 arquivos/919 testes verdes, `typecheck`, `build`, gabarito,
ids crus, portas, mapa, sumário, links, índice de planos e exportação verdes.
Não sobrou trabalho dentro do escopo; esfera, `lathe` e `loft` continuam fora
dele por decisão, não como pendência desta entrega.
