# AUT-2026-12 — tolerâncias de montagem explícitas

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `204949f`

## Problema observado

O mesmo campo `tolerancia` hoje representa a margem numérica do cálculo, enquanto
a faixa `min`/`max` mistura alvo de projeto e variação de fabricação. Uma IA não
consegue dizer, só pelo resultado, se a folga é a intenção nominal ou um limite
aceitável de produção.

## Resultado

Uma relação pode declarar valor nominal e desvios de fabricação; o leitor deriva
a faixa de aceitação e relata separadamente essa especificação e a tolerância
numérica do cálculo. O formato antigo continua reproduzível.

## Incluído

- forma nominal + `toleranciaFabricacao` para folga ou sobreposição;
- `toleranciaNumerica` explícita, com leitura compatível do campo legado;
- prova em encaixe cilíndrico, assentamento anular e relação antiga;
- relatório curto, determinístico e orientado a causa.

## Excluído

- metrologia de uma peça real, unidade alternativa, ajuste estatístico,
  temperatura, material, deformação ou decisão de reparo;
- mudança automática de medida, solver, persistência versionada ou UI.

## Gate de saída

1. nominal, fabricação e cálculo aparecem como dados distintos no resultado;
2. a faixa derivada aprova/reprova no mesmo limite que o formato antigo;
3. fabricação inválida e tolerância numérica inválida falham com causas distintas;
4. pino/luva antigo permanece byte a byte no diagnóstico essencial.

## Fatias

1. congelar a forma compatível e os limites de responsabilidade;
2. derivar faixa de aceitação em um helper puro;
3. aplicar a cilindro e anel, com pilotos atualizados;
4. provar compatibilidade, mutações e documentação; encerrar.

## Riscos e parada

- se faltar um dado de processo, não o inferir a partir de material ou geometria;
- se a nova forma mudar a decisão de uma relação antiga, parar e preservar o
  formato histórico;
- se o escopo precisar de distribuição estatística, abrir plano metrológico próprio.

## Fechamento

Concluído em 2 de agosto de 2026. Cada faixa aceita agora a forma legada
`{min,max}` ou a forma explícita `{nominal,toleranciaFabricacao:{menos,mais}}`.
O leitor deriva a mesma faixa de aceitação e expõe `toleranciaNumerica` como
margem do cálculo; `tolerancia` continua somente como entrada compatível.

Roda/cubo e aro/pneu usam a forma nova; pino/luva permanece legado para provar
replay. Os testes cobrem os três dados separados, faixa derivada, fabricação
impossível e duplicidade entre o campo novo e o legado. Metrologia, distribuição
estatística, temperatura e material continuam candidatos de outro escopo.
