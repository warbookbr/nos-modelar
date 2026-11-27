# Cabos: as provas

Evidência do plano [cabos](../../planos/2026-11-27-cabos.md).

## Fatia 1: o cabo entre dois pontos (2026-11-27)

A curva é a elástica discreta (`procedural/familias/cabo/curva.js`): uma haste inextensível de até 97 nós, de trechos iguais, que sai reta de cada ponta na direção pedida e minimiza a soma dos quadrados da segunda diferença com o comprimento de cada trecho fixo; com o caimento entra a gravidade em −y. O palpite é uma Bézier de quarta ordem de menor flexão, com a flecha de um lado só (a regra do lado é fixa), e cada iteração resolve o problema quadrático linearizado pelo complemento de Schur. A Bézier cúbica de Hermite, a primeira ideia, não serve: com as duas pontas viradas uma para a outra os quatro pontos de controle ficam numa reta e o cabo não arqueia. O comprimento da curva lisa (Hermite C¹ pelos nós) é acertado a 0,02% refazendo a haste com o comprimento corrigido.

As estações do tubo vêm do desvio máximo da corda, numa escada de 17 números de estações (uma composição por degrau, porque a composição tem pontos fixos). As faces são lados × trechos + 2 × (lados − 2); o friso desenha o círculo em quartos de arco, e por isso os lados são 8, 12, 16 a 32.

`node docs/modelar/banco-de-provas/cabos-2026-11-27/medir-casos.mjs` mede os casos de `tools/fixtures/cabo/casos.mjs` (comprimento de corte, raio mínimo, faces e tempo).

Imagens em `tools/bancadas/out/cabos/` (não versionadas): um arquivo por caso e `lados-8.png` contra `lados-24.png`.
