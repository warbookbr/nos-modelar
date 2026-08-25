# Relatório N6 — canário de casco por silhuetas

**Data:** 2026-08-24  
**Estado:** **reprovado e encerrado**  
**Escopo:** experimento isolado; não altera o núcleo procedural, receitas ou
geometria publicada.

## Hipótese testada

As três vistas ortográficas aprovadas do alvo N6 foram vinculadas pelos hashes
do manifesto. O experimento extraiu a maior silhueta de cada imagem e
intersectou os volumes ocupados para formar uma única malha. A hipótese era
que isso eliminaria números de seções arbitrários e daria uma base neutra para
as correções regionais.

## Resultado técnico — insuficiente por definição

O artefato tem 57.230 vértices, 114.396 triângulos e um componente. A
sobreposição de silhueta calculou 0,7645 na frontal, 0,5678 na lateral e
0,3134 na superior. Esses números **não são critérios de qualidade**: todos
existem ao mesmo tempo que a forma reprovada.

## Inspeção visual individual

Cada arquivo abaixo foi aberto sozinho, em tamanho nativo. Não houve promoção
por painel, mosaico, número ou imagem perspectiva.

| Vista | Evidência | Veredito | Achado bloqueante |
| --- | --- | --- | --- |
| Frontal | `render-frontal.png` — `5adb4742…5555ccea` | reprovado | degraus e volumes retos tomam o lugar de nariz e para-lamas. |
| Lateral | `render-lateral.png` — `0e47ed0e…a835ef87` | reprovado | faixas de tetraedros formam um caixote; cabine e arcos não existem. |
| Superior | `render-superior.png` — `3af03d3b…c6944f1d` | reprovado | a planta perde ombros, cabine e cintura do cupê. |
| Perspectiva | `render-perspectiva.png` — `e916d6cc…08acdb9d6` | reprovado | confirma bloco técnico; não compensa os vetos ortográficos. |

As três sobreposições e seus hashes também estão registradas em
`resultado.json`, ao lado das fontes e dos hashes de referência.

## Causa e decisão

Uma silhueta binária informa apenas se existe ocupação em uma projeção. Ela
não contém a topologia automotiva que diferencia capô, arcos, cabine, cintura,
entradas e deck traseiro. A triangulação mais densa nem o ajuste do limiar da
sombra de estúdio resolvem essa ausência de informação semântica.

**Decisão:** não ajustar essa malha e não promovê-la como bloqueio inicial. O
próximo teste N6 deve receber um contrato de marcos regionais e construir uma
carroceria contínua por patches de topologia declarada, com as faixas de
sobreposição dianteira↔cabine, cabine↔entrada e entrada↔traseira verificadas
antes de detalhe. A inspeção individual continua obrigatória.
