# R2 — iteração 13: posição da transição traseira da cabine

**Decisão:** aprovada para seguir como a melhor cage global medida.

O desvio da iteração 12 não admitia ampliação: aumentar a largura do flanco
ultrapassou o envelope compilado de 2,00 m e foi rejeitado. A correção válida
foi mover a seção `transicaoCabineTraseira` de `z = -1150 mm` para `z = -900
mm`, preservando sua largura máxima e os demais loops.

A comparação P0 reduz o pior erro de planta de 72,7 mm para 56,7 mm e a média
de 24,9 mm para 21,6 mm. A lateral melhora de 24,6 mm para 20,6 mm; a frontal
permanece em 41,5 mm. O maior desvio de planta passa para a traseira
(`z = -1958 mm`, `x = 906 mm`), onde a anca e a tampa traseira já possuem
controles declarados.

A próxima rodada deve priorizar a traseira, sem desfazer a posição aprovada da
transição de cabine.
