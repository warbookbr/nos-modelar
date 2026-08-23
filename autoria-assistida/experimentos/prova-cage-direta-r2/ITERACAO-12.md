# R2 — iteração 12: largura regional da cabine central

**Decisão:** aprovada para seguir como a melhor cage global medida.

O pior desvio de planta da iteração 11 recaía no centro da cabine. A seção em
`z = -180 mm` recebeu o controle regional `larguraCabineCentral`; foi ampliado
somente o trilho de flanco dessa seção. Teto, ombro, soleira, anéis do nariz e
anca traseira não foram movidos.

A comparação P0 reduz o pior erro de planta de 82,5 mm para 72,7 mm e a média
de 33,1 mm para 24,9 mm. Lateral permanece em 24,6 mm e frontal em 41,5 mm.
O novo pior ponto da planta está na transição traseira da cabine
(`z = -834 mm`, `x = 996 mm`), já delimitada pelo loop
`transicaoCabineTraseira`.

A próxima rodada pode ajustar essa transição diretamente, repetindo as três
medidas globais e mantendo o controle central aprovado.
