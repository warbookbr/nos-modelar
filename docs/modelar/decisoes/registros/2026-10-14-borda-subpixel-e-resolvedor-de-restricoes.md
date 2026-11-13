# Potrace e VectorCraft não substituem a borda subpixel do contorno da imagem

Estado: em vigor.
Decidido em: 2026-10-14.
Origem: `docs/modelar/historico/LEVANTAMENTO-DESENHO-SEM-REFERENCIA.md`, no commit `eaa9ab0c`.
Substitui: nada.

## O que ficou decidido
O levantamento de 2026-10-14 concluiu que Potrace e VectorCraft não devem trocar nem complementar a borda subpixel do contorno da imagem; a troca é decisão da pessoa e não foi feita. O planegcs 1.3.0, avaliado como resolvedor de restrições, devolve sucesso, grau de liberdade zero e geometria espelhada quando o chute inicial cai do lado errado e a relação não tem sinal, como a distância de ponto a reta; quem usar um resolvedor assim declara o lado de cada relação e o confere depois de resolver. Falta ainda um teste com imagem sintética de verdade conhecida no gate do módulo de contorno, para o alisamento `denteMaximo`, e abri-lo é decisão da pessoa.

## Por quê
Numa imagem sintética de verdade conhecida, a borda subpixel fica a 0,09 px; Potrace e VectorCraft sobre a máscara ou com o limiar 225 ficam de 0,33 a 0,55 px para fora, e o único melhor, Potrace sobre a imagem ampliada oito vezes, parte a silhueta do avião em pedaços. O `denteMaximo` deixa uma ponta de 21 graus com 5,0 px contra 1,2 sem o alisamento e tira de 102 a 138 mm das pontas das hélices.

## Quando reabrir
A origem não dá condição.
