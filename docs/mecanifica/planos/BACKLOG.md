# Backlog de candidatos

Este arquivo guarda possibilidades, não tarefas prometidas. A ordem é temática,
não prioridade. Um item só vira trabalho depois de ganhar plano próprio com
escopo, exclusões, gate e decisão explícita.

## Autoria procedural

| Candidato | Evidência | Estado de preparação |
|---|---|---|
| `AUT-01` — contagem por desvio (`lados: { desvio }`) | A-34; silhueta e custo usavam números incomparáveis | concluído em [`AUT-2026-01`](2026-08-02-contagem-por-desvio.md) |
| `AUT-02` — canto composto de `arredondarAresta` | A-37 e [`FILETE-V2.md`](../FILETE-V2.md), Escopo B | concluído em [`AUT-2026-04`](2026-08-02-canto-composto.md) |
| `AUT-03` — triangulação robusta de face com buracos | A-33; 37 casos válidos históricos abortavam | concluído em [`AUT-2026-03`](2026-08-02-triangulacao-de-furos.md) |
| `AUT-04` — discretização por concordância | A-35 | concluído em [`AUT-2026-02`](2026-08-02-concordancia-por-ponto.md) |
| `AUT-05` — posição, encaixe e hierarquia semânticos | O-7, O-8, O-10, A-16 e A-29 | tema grande; deve ser dividido por uma montagem real |
| `AUT-06` — câmera livre reproduzível | A-1 | concluído em [`AUT-2026-05`](2026-08-02-camera-livre-reproduzivel.md) |

## Peças e produto

| Candidato | Evidência | Dono provável |
|---|---|---|
| `PEC-01` — cubo-piloto e flange do freio | A-32 | autoria + contrato de montagem com `warbookbr/mecanica` |
| `PROD-01` — narrativa de desgaste do freio | antiga Fase 5 e [`VISAO.md`](../VISAO.md) | repositório `warbookbr/mecanica`; não pertence a este núcleo |
| `PROD-02` — caminhada, carro detalhado e novos sistemas | visão de longo prazo | produto; dividir por experiência observável |

## Fluxo de IA e upstream

| Candidato | Evidência | Estado |
|---|---|---|
| `IA-01` — reduzir custo de revisão sem prescrever mais modelagem | A/B empatado em 14/16 | só reabrir com nova hipótese mensurável |
| `UP-01` — extrair capacidades gerais para o NÓS | [`UPSTREAM-NOS.md`](../UPSTREAM-NOS.md) | escolher uma capacidade por contribuição |

## Itens encerrados que não voltam ao backlog

- A-15 saiu da Mecanifica com a Oficina humana; permanece apenas como histórico
  e possível contribuição ao NÓS.
- A-30 foi resolvido pela F1 do antigo Ciclo 6.
- A-36 foi resolvido para aresta simples por `arredondarAresta`; o caso composto
  está representado somente por `AUT-02`/A-37.
- os A-39 a A-45 ensaiados no plano antigo nunca foram registrados e não devem
  ser reutilizados como se fossem decisões vigentes.
