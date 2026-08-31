# Motor de Prancha — R4: autoria fria, revisão e limite de impacto

**Data:** 2026-08-20
**Plano:** `2026-08-20-motor-de-prancha-autonomia.md`
**Estado:** parcial — autoria independente e mutações aprovadas; comparação 3D ainda não foi declarada.

## Autoria sem receita anterior

`tools/mecanifica/prancha-r4-independente.mjs` cria uma furgoneta técnica
ficcional de quatro vistas. Ela não importa nem reutiliza a especificação P0 ou
o cupê de cunha: declara intenção, procedência, envelope, cotas e landmarks
antes das camadas. O resultado é
`docs/mecanifica/img/r4-furgoneta-tecnica-prancha.svg`.

O relatório medido da execução confirma:

| Verificação | Resultado |
| --- | --- |
| quatro vistas | lateral, frontal, planta e traseira com contorno fechado |
| envelope | 3900 × 1760 × 1780 mm, desvio 0 mm |
| landmarks | quatro verificados; pior desvio 0 mm |
| alertas | nenhum |

A saída foi rasterizada e inspecionada em PNG. A leitura visual é compatível
com a intenção: veículo alto, curto, de cabine avançada e seção quase vertical;
não há corte, rótulo encoberto ou vista ausente.

## Revisão por mutação

O teste separado `prancha-r4-independente.test.mjs` usa somente a interface
pública `prancha(spec)` e verifica três resultados:

| Caso | Resultado |
| --- | --- |
| autoria íntegra | sem alertas, não bloqueada |
| frontal elevada a 2050 mm | alerta de coerência entre vistas ou envelope |
| remoção das camadas traseiras | recusa por alegação inválida de quatro vistas |

O replay conjunto de prancha, referência, R4 e cage P2 passou com 68 testes.
Os alvos P0 e cupê continuam sem alertas.

## Limite honesto

Esta etapa não conclui a R4. A prova exigida de impacto ainda pede uma malha 3D
comparável derivada desta prancha e uma sobreposição medida contra ela. A única
malha disponível, a prova privada do quarto dianteiro P2, é um alvo diferente e
permanece congelada; tratá-la como evidência desta furgoneta falsificaria a
comparação. Nenhuma geometria P2, receita procedural, câmera ou núcleo foi
alterada.

A continuação correta é criar um recorte explícito de modelo comparável ou
autorizar uma geometria privada R4 com critério de sobreposição já declarado.
