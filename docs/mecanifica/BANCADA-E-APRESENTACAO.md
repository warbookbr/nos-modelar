# Bancada e apresentação

## Papel

`bancada.html` é a única aplicação publicada deste repositório. Ela abre uma
peça isolada, mede o neutro, mostra vistas canônicas e registra uma URL
reproduzível. A apresentação do cliente pertence a
[`warbookbr/mecanica`](https://github.com/warbookbr/mecanica).

## Consulta

A bancada mostra a hierarquia informativa da peça, partes, grupos e portas.
Seleção semântica, isolamento, contexto fantasma, explosão e consulta de
subárvore já existem. A régua e o painel de portas respondem à peça carregada,
não a uma constante global.

## Revisão visual

Use as quatro vistas canônicas quando o pacote exigir revisão. Leia os PNGs,
confira enquadramento, corte, legibilidade e identidade. `porteiro` verifica
abertura, erros de página e quadro degenerado. `revisar:modelagem` conserva
revisões recusadas e promovidas sem criação manual de evidência.

## Limites atuais

A bancada não persiste uma montagem nem resolve encaixes. Posição, contato,
pose derivada e solver ficam no backlog. O servidor estático local ainda não
resolve o import bare `earcut`; não contorne isso alterando câmera ou peça.

## Critério de saída

Uma peça só é levada ao produto depois de passar estado, identidade, exportação,
gates de câmera/portas e leitura visual. O produto do cliente não carrega a
linguagem de autoria.
