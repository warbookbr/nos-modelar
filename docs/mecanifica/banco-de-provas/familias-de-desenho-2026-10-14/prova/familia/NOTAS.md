# A carcaça da descrição pela família de desenho

Desenho da vista lateral descrita em [DESCRICAO.md](../DESCRICAO.md), feito só com a
família `procedural/familias-de-desenho/carcaca-empilhadeira/` (1.0.0) e o catálogo
dela, sem mudar nenhum dos dois e sem ver a foto. O comando foi rodado uma vez:

```
npm run desenho -- familia procedural/familias-de-desenho/carcaca-empilhadeira/carcaca-empilhadeira.familia-de-desenho.json --valores=comprimento=2320,altura=866,avanco=220,arcoD=340,vaoD=244,aro=325,arcoT=1780,raioT=255,posto=260,rampa=38,topo=680,capo=834,piso=450,encosto=700,painel=840 --grava=docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/prova/familia
```

Resolveu com zero grau de liberdade e gravou `lateral.desenho.json`,
`lateral.contornos.json` e `lateral.png`. Conferido o PNG contra a descrição, nenhum
ajuste dentro das faixas aproximava mais a forma: o que ainda diverge depende de
valor fora da faixa ou de amarração fixa da família, descritos abaixo.

## Como os valores foram escolhidos

O comprimento e a altura da descrição (2453 e 998 mm) passam do máximo da família e
ficaram em 2320 e 866 mm. As outras medidas da descrição são frações do comprimento
e da altura totais, e foram aplicadas ao desenho de 2320 por 866 mm, para as partes
ficarem na mesma proporção dentro da vista que de fato se desenha; aplicadas a 2453
por 998 mm, elas cairiam ainda mais fora das faixas. Onde a descrição não diz nada,
ficou a proporção da referência da família.

| parâmetro | valor | de onde saiu | na faixa |
|---|---|---|---|
| `comprimento` | 2320 | 2453 mm da descrição | preso no máximo |
| `altura` | 866 | 998 mm da descrição | preso no máximo |
| `avanco` | 220 | o arco desce ao fundo a um quinto do comprimento, 464 mm, que é `avanco + vaoD`; a soma foi repartida na razão da referência (204 para 226,1), porque a descrição não separa o avanço do paralama do vão do arco | dentro |
| `vaoD` | 244 | a outra parte da mesma soma | dentro |
| `arcoD` | 340 | "arco grande, contornado por uma faixa de aro": para o recorte ficar concêntrico com o aro, o topo dele iria a 404 mm (centro do aro a 500 - 325 mais o raio do recorte, 229,2) | preso no máximo |
| `aro` | 325 | a faixa de aro contorna o arco que chega ao fundo a 464 mm; a ponta do aro, em `avanco + aro + 20,9`, pedia aro perto de 223 mm | preso no mínimo |
| `arcoT` | 1780 | o arco traseiro começa a três quartos do comprimento, 1740 mm, o que põe o centro em 1995 mm; o capô a pouco menos de três quartos e com pouco menos de um quarto do comprimento pede o mesmo sentido | preso no máximo |
| `raioT` | 255 | arco "largo" com o topo perto da metade da altura, 433 mm, que é `129,8 + raioT`, pedia 303 mm | preso no máximo |
| `posto` | 260 | a borda de cima da lateral atrás do arco a dois quintos da altura, 346 mm | preso no máximo |
| `rampa` | 38 | "mais inclinada que suave", sem número; ficou na ponta íngreme da faixa (38 graus embaixo, 43,15 em cima) | no máximo, por escolha |
| `topo` | 680 | a rampa encontra o capô a quatro quintos da altura, 693 mm | preso no máximo |
| `capo` | 834 | a descrição só diz capô alto e tampa baixa por cima; ficou a proporção da referência, 0,9636 da altura, 834,5 mm | preso no máximo |
| `piso` | 450 | o degrau cinza "baixo" sobre o piso do operador; com o chão em 260 mm, um degrau baixo ficaria perto de 390 mm | preso no mínimo |
| `encosto` | 700 | topo do encosto a pouco mais de quatro quintos da altura: o trecho reto de cima fica de 700 a 718 mm, 0,81 a 0,83 da altura | dentro |
| `painel` | 840 | a descrição não tem painel; é o menor valor que a relação `capo < painel - 5` deixa com o capô em 834, para o degrau dele sobre o capô ficar mínimo | dentro |

Ficaram presos no limite da faixa, por valor da descrição fora dela, o
`comprimento`, a `altura`, o `arcoD`, o `aro`, o `arcoT`, o `raioT`, o `posto`, o
`topo`, o `capo` e o `piso`. A `rampa` está no máximo porque a descrição pede o lado
íngreme e não dá número.

## O que a descrição pede e a família não tem

A proporção geral não cabe: a descrição tem 2453 por 998 mm, altura de 0,407 do
comprimento, e o maior desenho da família tem 2320 por 866 mm, 0,373, de modo que o
desenho sai mais baixo e mais curto que o objeto descrito.

A frente do encosto fica presa a 623 mm da face (`E1` em `avanco + 623`), sem
parâmetro, e no desenho está a 843 mm, 0,36 do comprimento; a descrição a põe pouco
antes do meio, perto de 0,45 a 0,48.

A família não tem o furo redondo pequeno na lateral perto da junta com o capô.

A descrição diz a frente baixa e aberta, com um degrau baixo sobre o piso do arco até
a rampa. A parte `piso` da família tem um anteparo que sobe a `piso + 173` mm logo
atrás do paralama (626 mm, 0,72 da altura, com o piso no mínimo), e o degrau sobre o
chão do posto tem no mínimo 190 mm, porque o chão do posto vai até 260 mm e o piso
começa em 450; a descrição põe o chão a 346 mm.

A rampa da descrição sobe até encontrar o capô. Na família o alto da rampa fica 214 mm
antes da frente do capô (`topoDaRampa` é `frenteDoCapo - 214,15`), com um trecho
plano da lateral entre os dois.

A faixa de aro da família é um quarto de círculo próprio, que nasce no topo da face a
500 mm, e o recorte do arco dianteiro fica abaixo dela com um trecho de face vertical
por cima; a faixa não acompanha a borda do arco como a descrição diz, e o arco não
passa de 340 mm de altura.

O arco traseiro, com centro e raio no máximo, começa a 1525 mm, 0,66 do comprimento,
e tem o topo a 385 mm, 0,44 da altura; a descrição pede o começo a três quartos e o
topo perto da metade. A família também põe a frente do capô 136,5 mm atrás do começo
do arco traseiro, enquanto a descrição põe o capô começando um pouco antes do arco. O
capô sai com 0,28 do comprimento, e a descrição diz um pouco menos de um quarto.

A família desenha um painel entre o encosto e o capô que passa do topo do capô, que a
descrição não menciona; com o painel no menor valor permitido ele fica 6 mm acima do
capô.

O que a descrição diz e o desenho cumpre: o fundo reto, o paralama fino e reto perto
de três quintos da altura (500 a 522 mm, 0,58 a 0,60), o arco dianteiro quase em
quarto de círculo chegando ao fundo a um quinto do comprimento, a rampa reta e
íngreme, o encosto de cantos arredondados mais largo que alto (662 por 321 mm), o
capô alto de frente vertical e traseira arredondada começando a 0,72 do comprimento,
a tampa baixa no topo que passa para trás sobre a traseira do capô e o contrapeso do
fundo até 407 mm, 0,47 da altura, com a traseira a prumo.
