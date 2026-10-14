# Família de desenho do braço colaborativo

A família `braco-colaborativo.familia-de-desenho.json` (`mecanifica.familia-de-desenho@1`) desenha a vista lateral de um braço robótico colaborativo de seis eixos na pose de L, com a coluna em pé, o antebraço na horizontal e o punho para baixo. As 14 partes têm os nomes das regiões do [contorno da referência](../../pecas/braco-robotico/referencias/lateral-sem-cabo.contornos.json) e o sistema dele: milímetro, h para a direita e v para cima, o chão em v = −5 e o eixo da base em h = 0. Ela parte do [desenho ajustado à referência](../../../docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/braco/NOTAS.md), na fatia 4 do plano [as famílias de desenho](../../../docs/mecanifica/planos/2026-10-14-familias-de-desenho.md). As peças que ela usa estão no catálogo `pecas.json` (`mecanifica.pecas-de-desenho@1`), que todo comando carrega com `--pecas`.

## Os parâmetros

Os nove parâmetros são as medidas que mandam no desenho ajustado. O médio e o padrão são o valor da referência.

| parâmetro | o que mede | mínimo | médio | máximo |
|---|---|---|---|---|
| `alturaBase` | do chão ao topo do corpo da base | 190 | 236 | 280 |
| `diametroBaixo` | a largura do corpo da base | 185 | 206 | 236 |
| `alturaOmbro` | a altura do ombro, com a junta no meio | 155 | 181 | 205 |
| `comprimentoBraco` | da junta do ombro ao eixo do antebraço | 400 | 509,5 | 610 |
| `diametroCima` | a largura da coluna de cima | 150 | 175,5 | 195 |
| `comprimentoAntebraco` | do eixo da base ao eixo do punho | 510 | 636 | 720 |
| `diametroAntebraco` | o tubo do antebraço | 110 | 130 | 148 |
| `larguraPunho` | a largura dos anéis do punho | 92 | 110 | 126 |
| `alturaPunho` | do fundo da carcaça do punho à face de baixo da flange | 210 | 250 | 285 |

O resto do desenho fica amarrado a eles por parâmetros derivados no próprio desenho. Os detalhes da base, da caixa lateral e do anel da cintura seguem `diametroBaixo/206`; os do braço, do anel do cotovelo e do cotovelo seguem `diametroCima/175,5`; a junta, o anel do antebraço e a carcaça do punho seguem `diametroAntebraco/130`; e o garfo, o pescoço e a flange seguem `larguraPunho/110` na largura e `alturaPunho/250` na altura. Os anéis guardam o degrau da referência sobre o corpo vizinho: a cintura tem 6 mm a menos que a base e o ombro 9, e a junta e o anel do antebraço passam 11 mm do tubo de cada lado. O raio da ponta do braço é o menor entre a meia altura do ombro menos 4,5 mm e a meia largura do ombro menos 12,5 mm, de modo que a ponta fica dentro do ombro e o U do ombro continua à vista em qualquer combinação.

As faixas vêm de uma referência só e do conhecimento geral de braços colaborativos de seis eixos de 3 a 16 kg de carga, sem outra imagem. Nessa classe, a base vai de uns 130 mm de diâmetro nos de 3 kg a uns 190 a 240 mm nos de 10 a 16 kg, o braço de uns 250 a uns 640 mm e a razão entre o comprimento do braço e o diâmetro da base fica entre 1,9 e 3,2. As faixas daqui são mais estreitas que a classe porque cada parâmetro vai ao extremo sozinho, com os outros na referência, e num braço real eles andam juntos: com `diametroBaixo` abaixo de 185 a coluna de cima no padrão fica mais larga que o ombro, e com `comprimentoBraco` abaixo de 400 o braço fica mais atarracado que qualquer um da classe. Com os nove no mínimo, o braço tem 400 mm, como os de 5 kg da classe, e a base 185 mm, mais perto dos de 10 kg; os de 3 kg, com base perto de 130 mm e braço perto de 250 mm, ficam fora desta família.

## As peças

`anelCoaxial` é o tambor num eixo, uma barra do início ao fim com a espessura igual ao diâmetro e o meio marcado, que se empilha pondo o início de um no fim do outro; a família o usa seis vezes, no anel da cintura, no ombro (cujo meio é a junta do ombro), no anel do cotovelo, na junta do cotovelo, no anel do antebraço e nos anéis do punho. `pontaConcentrica` são os dois lados e os dois cantos de uma ponta a um raio da junta; o polígono do elo cita os cantos e os arredonda com o mesmo raio, e a ponta sai em semicírculo com centro na junta. A família a usa na ponta do braço, em volta da junta do ombro, e na ponta da carcaça do punho, em volta do eixo do punho. `flangeComCubo` é o garfo com o pescoço e a flange em cápsula, simétricos em torno do eixo que vai do topo do garfo ao centro da flange. `blocoDeJunta` é o retângulo com só os cantos do topo arredondados, usado na caixa lateral e no cotovelo. As quatro valem em qualquer direção: o comprimento é distância entre pontos, o desenho de fora dá a direção do eixo, e o parâmetro `angulo` de cada peça só orienta o chute.

## A prova

O perfil `referencia` tem os mesmos valores do médio, e o desenho dele, em `referencia/`, dá 0,9540 contra a referência pela união das partes, 0,9547 pela melhor translação e 0,9772 pela silhueta, contra 0,9555 do desenho ajustado. A diferença está no punho: a ponta da carcaça virou um semicírculo de raio 67, a meia altura dela, com centro no eixo do punho, onde o ajuste tinha 66 em cima, 68 embaixo e cantos de 66 e 58, e os anéis, o garfo e a flange subiram 1 mm com ela. Os anéis que no ajuste tinham canto vivo têm canto de 1 mm. As outras partes repetem a razão por parte do ajuste até a terceira casa.

`--provar` resolve os 21 conjuntos de valores (o padrão, todos no mínimo e todos no máximo, e cada parâmetro no mínimo e no máximo com os outros no padrão; o médio e o perfil `referencia` são o padrão e não se repetem) com zero grau de liberdade, sem conflito, sem lado trocado, sem polígono cruzado e sem parte escondida. As pastas `minimo/`, `medio/` e `maximo/` têm o desenho especializado, os contornos e a vista em traço de todos os parâmetros no mínimo, no médio e no máximo; `medio/` é igual a `referencia/` byte a byte. Nas três vistas o braço continua coerente, com as partes na mesma proporção, a ponta do braço dentro do U do ombro, o tubo do antebraço à vista entre o anel e a carcaça e o punho pendurado no eixo. Para refazer, da raiz do repositório:

```bash
D=procedural/familias-de-desenho/braco-colaborativo
npm run desenho -- familia $D/braco-colaborativo.familia-de-desenho.json --pecas=$D/pecas.json --provar
npm run desenho -- familia $D/braco-colaborativo.familia-de-desenho.json --pecas=$D/pecas.json --perfil=referencia --grava=$D/referencia
npm run desenho -- razao procedural/pecas/braco-robotico/referencias/lateral-sem-cabo.contornos.json $D/referencia/lateral.contornos.json --partes
npm run desenho -- familia $D/braco-colaborativo.familia-de-desenho.json --pecas=$D/pecas.json --grava=$D/minimo --valores=alturaBase=190,diametroBaixo=185,alturaOmbro=155,comprimentoBraco=400,diametroCima=150,comprimentoAntebraco=510,diametroAntebraco=110,larguraPunho=92,alturaPunho=210
npm run desenho -- familia $D/braco-colaborativo.familia-de-desenho.json --pecas=$D/pecas.json --grava=$D/medio --valores=alturaBase=236,diametroBaixo=206,alturaOmbro=181,comprimentoBraco=509.5,diametroCima=175.5,comprimentoAntebraco=636,diametroAntebraco=130,larguraPunho=110,alturaPunho=250
npm run desenho -- familia $D/braco-colaborativo.familia-de-desenho.json --pecas=$D/pecas.json --grava=$D/maximo --valores=alturaBase=280,diametroBaixo=236,alturaOmbro=205,comprimentoBraco=610,diametroCima=195,comprimentoAntebraco=720,diametroAntebraco=148,larguraPunho=126,alturaPunho=285
```

## O que faltou ao formato

Falta relação entre parâmetros da família. A família 3D (`mecanifica.familia@1`) tem `restricoes`, e com ela as faixas poderiam chegar aos braços de 3 kg recusando só a combinação incoerente, como a coluna de cima mais larga que o ombro. Acrescentar `"restricoes": [{ "id": "coluna-de-cima-mais-estreita", "expressao": "diametroCima <= diametroBaixo - 9" }]` à família e rodar `npm run desenho -- familia <família> --pecas=<catálogo> --so-relatorio` dá `campo desconhecido "restricoes" na família`.

Falta o lado vindo do uso. Um parâmetro de peça é número, e por isso a peça não recebe o `lado` nem o `eixo` de uma distância com sinal: trocar no catálogo a relação de comprimento do `anelCoaxial` por uma distância com `"lado": "sentido"` e dar `"sentido": "acima"` como parâmetro dá `o parâmetro "sentido" usa o parâmetro "acima", que não existe`. As peças em qualquer direção ficam com o comprimento sem sinal, o chute decide para que lado o eixo vai e `--provar` não vê a peça virada: com `"angulo": 90` nos usos `tamborPunho` e `punho` e a origem do `punho` acima do eixo do antebraço, o punho sai para cima e `--provar` dá 21 de 21. Aqui os chutes seguem os parâmetros e o punho fica para baixo em todos os conjuntos, o que só a vista mostra.

Falta o canto opcional. O `raioDoCanto` não aceita zero, e a peça não tem como deixar o arredondamento para o uso: com `"canto": 0` no `anelCoaxial` do catálogo, o comando dá `o "raioDoCanto" da barra "anelCintura" deve ser um número em milímetro maior que zero, e veio 0`, e por isso o padrão do anel é 1 mm. Falta também o menor de dois valores nas expressões: `"raioPontaBraco": "=min(raioPeloOmbroAlto,raioPeloOmbroLargo)"` dá `função 'min' não existe`, e o desenho escreve o menor como `(a+b-sqrt((a-b)*(a-b)))/2`. E não há como gravar o conjunto de todos os parâmetros no mínimo sem escrever os nove valores em `--valores`: `--perfil=minimo` dá `o perfil "minimo" não existe na família`.
