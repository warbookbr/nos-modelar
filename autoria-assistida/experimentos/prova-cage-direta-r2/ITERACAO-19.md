# R2 — iteração 19: desacoplamento da ponta dianteira

**Decisão:** aprovada; a ponta recebe um anel próprio de controle.

A busca em memória mostrou que mover apenas `anelPonta` ou
`anelExpansaoDianteira` deslocava a diferença em planta entre `z = 2,20 m` e
`z = 2,11 m`; nenhum candidato melhorava os dois trechos. A R2A exige um
controle próprio nesse caso, portanto foi inserido `anelAjustePonta`, entre a
tampa e o anel estreito. Ele é uma faixa de quatro quads, não uma abertura nem
um detalhe visual.

Com o novo anel em `z = 2,20 m`, a largura de seu flanco é 0,30 e a do anel
seguinte é 0,38. A busca em resolução final reduziu a média de planta de 14,6
para 13,1 mm e o máximo de 38,2 para 38,1 mm. Lateral e frontal permanecem em
8,0/20,5 mm e 16,2/32,7 mm; o envelope compilado continua 2,00 × 1,085 ×
4,60 m.

O máximo de planta restante é traseiro, perto de `z = -0,82 m`, e é independente
da ponta. A próxima rodada deve tratá-lo sem tocar no novo anel e só promover
uma compensação que preserve simultaneamente o envelope e a frontal.
