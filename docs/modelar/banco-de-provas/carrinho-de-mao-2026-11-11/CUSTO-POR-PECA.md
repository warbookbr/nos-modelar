# Custo por peça do carrinho de mão

Tabela gerada em 2026-11-11 pelo comando `npm run -s custo:peca -- procedural/pecas/carrinho-de-mao`, que lê os registros de rodada em `procedural/pecas/carrinho-de-mao/partes/*/rodadas/`. O carrinho de mão é a peça de prova da fatia 1 do plano [Núcleo para qualquer mecanismo](../../decisoes/PLANOS-ENCERRADOS.md), e a linha de base é a [tabela da empilhadeira](../empilhadeira-2026-11-09/CUSTO-POR-PECA.md).

```text
custo por peça: carrinho-de-mao

peça     rod  notas      defeitos   abertos  aceitos  fecho    mod pla fer cri fam  datas
-------  ---  ---------  ---------  -------  -------  -------  -------------------  -----------------------
cacamba  5    8 8 7 8 8  2 2 1 3 0  0        0        critico    3   4   7   1   0  2026-11-11 a 2026-11-11
chassi   3    9 8 8      0 1 0      0        0        critico    0   2   4   0   0  2026-11-11 a 2026-11-11
pes      3    7 8 8      3 1 0      0        0        critico    0   3   3   1   0  2026-11-11 a 2026-11-11
roda     1    8          1          1        2        aceite     0   1   1   0   1  2026-11-11 a 2026-11-11

peças: 4; rodadas: 12; média de rodadas por peça: 3; fecharam na primeira rodada: 0
notas finais: 8: 4
fecho: aceite: 1, critico: 3; defeitos abertos na última rodada: 1
atribuições: modelador 3, plano 10, ferramenta 15, critico 2, familia 1
datas das rodadas: 2026-11-11 a 2026-11-11
```

## Leitura

O carrinho gastou 3 rodadas por peça, e a empilhadeira 1,58. O número subiu, e a comparação direta engana, porque a régua mudou no meio do caminho. Na empilhadeira o crítico julgava sem imagem de referência que valesse por vista, 12 das 19 peças foram fixadas por aceite e 28 defeitos ficaram abertos. No carrinho o crítico recebeu as fotos da pessoa como referência externa a partir da segunda rodada, três das quatro peças fecharam pelo crítico sem defeito, todas com nota 8, e só a roda foi fixada por aceite, com um defeito que vem da família.

As oito rodadas além da primeira de cada peça têm causa conhecida. Duas, no chassi e nos pés, repetiram o julgamento depois que o crítico passou a ter a foto e o plano passou a dizer o que ele lia como defeito. Duas, nas mesmas peças, corrigiram a planta dos braços do chassi, que o desenho mostra abrindo em reta e que só a foto de baixo denunciou. Na caçamba, duas corrigiram defeito de malha e de superfície que a medição da rodada não contava e hoje conta, uma veio de um pedido errado de quem conduz, que mandou a frente em semicírculo, e uma trocou a borda para o trilho fechado, que a receita não usava.

Das 31 atribuições, 15 foram à ferramenta ou ao núcleo, 10 ao plano, 3 ao modelador, 2 ao crítico e 1 à família. Cada uma das de ferramenta virou correção geral no mesmo dia ou está registrada na fatia 4b do plano.

O que a tabela não mostra, e deveria: quantos defeitos ficam abertos no fecho por objeto e se o crítico tinha referência. Sem esses dois campos, um objeto fechado com mais rigor parece mais caro que um fechado por aceite.
