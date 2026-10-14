# Família de desenho da carcaça de empilhadeira

A família `carcaca-empilhadeira.familia-de-desenho.json` (`mecanifica.familia-de-desenho@1`) desenha a vista lateral da carcaça de uma empilhadeira a combustão de 1,5 a 3,5 t, olhada do lado direito com a frente à esquerda, sem rodas, torre, garfos, assento nem volante, com as onze partes do contorno da referência (paralama, suporte, lateral, aro, piso, encosto, painel, capô, tampa, contrapeso e longarina). Ela veio do desenho ajustado à referência na fatia 2 do plano das famílias de desenho (`docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/carcaca/NOTAS.md`), e as peças que ela usa estão no catálogo `pecas.json` (`mecanifica.pecas-de-desenho@1`). A família declara em `catalogo` o catálogo `pecas.json`, ao lado dela, e os comandos o carregam sozinhos, sem `--pecas`:

```
npm run desenho -- familia procedural/familias-de-desenho/carcaca-empilhadeira/carcaca-empilhadeira.familia-de-desenho.json --provar
npm run desenho -- familia <a mesma família> --perfil=referencia --grava=procedural/familias-de-desenho/carcaca-empilhadeira/referencia
```

## Os parâmetros

São as medidas que mandam no ajuste, com o médio e o padrão no valor da referência. O resto do desenho fica preso a elas pelas relações e pelos valores derivados em `desenho.parametros`.

| parâmetro | medida | mínimo | médio | máximo |
|---|---|---|---|---|
| `comprimento` | da ponta do paralama à traseira | 2020 | 2150 | 2320 mm |
| `altura` | altura total, no topo da tampa | 842 | 852,6 | 866 mm |
| `avanco` | avanço do paralama além da face | 185 | 204 | 225 mm |
| `arcoD` | topo do arco dianteiro recortado | 295 | 316,5 | 340 mm |
| `vaoD` | vão do arco dianteiro a partir da face (o raio do canto é 14,8 mm menor) | 205 | 226,1 | 245 mm |
| `aro` | raio de dentro do aro | 325 | 346 | 370 mm |
| `arcoT` | centro do arco traseiro, a partir da ponta do paralama | 1530 | 1661,4 | 1780 mm |
| `raioT` | raio do arco traseiro (a base do capô fica 152,4 mm acima dele) | 210 | 231,6 | 255 mm |
| `posto` | chão do posto | 225 | 241 | 260 mm |
| `rampa` | inclinação do trecho baixo da rampa (o alto tem 5,15 graus a mais) | 31 | 34,35 | 38 graus |
| `topo` | topo da lateral | 620 | 650 | 680 mm |
| `capo` | topo do capô | 808 | 821,6 | 834 mm |
| `piso` | nível do piso | 450 | 475 | 500 mm |
| `encosto` | frente do encosto | 680 | 706,6 | 735 mm |
| `painel` | topo do painel | 830 | 841,2 | 852 mm |

As faixas vêm de uma referência só e de conhecimento geral, sem outra imagem. Não se sabe a capacidade da empilhadeira da referência; ela foi tomada como o meio da classe, o mínimo como a ponta de 1,5 t e o máximo como a de 3,5 t. Nessa classe o entre-eixos vai de cerca de 1400 a 1700 mm, o balanço traseiro e o contrapeso crescem com a capacidade, o pneu dianteiro muda pouco e o traseiro vai de cerca de 5.00-8 a 6.50-10; daí as faixas de 6 a 10% no comprimento, no arco traseiro e nos raios, de 4 a 7% nas alturas do posto, do piso, da lateral e do encosto, e de 3,5 graus na rampa. O topo do capô, o do painel e o da tampa ficam empilhados a 19,6 e 11,4 mm um do outro, e a prova varia um parâmetro de cada vez; por isso as faixas deles ficam em 1,3 a 1,6% em volta da referência, a largura que ainda deixa o painel acima do capô e a tampa visível sobre ele em qualquer caso da prova de um parâmetro por vez.

Três relações de ordem (`restricoes` da família) dizem quais combinações das faixas são da família, para a prova poder testar também os pares nos extremos cruzados sem estreitar mais nenhuma faixa. `capo-abaixo-do-painel` (`capo < painel - 5`) põe o painel acima do capô: o raio do canto de trás do painel acompanha a folga entre os dois, e com o `capo` em 834 e o `painel` em 830 ele dava raio negativo. `painel-abaixo-da-tampa` (`painel < altura`) deixa a tampa visível sobre o painel. `painel-perto-do-encosto` (`painel <= encosto + 162`) guarda o topo reto do painel, que fica menor quanto mais alto ele sobe do alto do encosto a 28 graus: com o `encosto` em 680 e o `painel` em 852, 172 mm de diferença, a aresta mede 41,9 mm e os cantos de 70 mm e do painel pedem 47,0 mm de tangência. O limite medido é 162,75 mm, no canto pior da faixa (capô em 808 e painel em 852), e o 162 deixa o `encosto` no mínimo com o `painel` no padrão, que são 161,2 mm, dentro da família. As três valem no padrão, no médio e no perfil `referencia`.

Para o desenho ajustado resolver em toda a faixa sem mudar a forma da referência, parte das amarrações dele foi trocada por outras que dão a mesma geometria no valor da referência. O alto da rampa fica 247,85 mm antes do fim da lateral, que segue o arco traseiro, e o pé da rampa sai das alturas e da inclinação; as costas do encosto, a subida de trás dele (45,33 mm acima do fim do topo reto) e o degrau do painel seguem o alto da rampa; a quebra da rampa fica 50,9 mm abaixo do piso; a base do capô segue o raio do arco traseiro; a ponta do aro fica 4 mm abaixo do fim do arco dele; e o raio do canto de trás do painel acompanha a folga entre o topo do painel e o do capô. Com isso o que muda entre a frente e o arco traseiro vai para o chão do posto, a soleira, o nível do piso e o topo do encosto, que têm folga, e o que muda entre o arco traseiro e a traseira vai para o fundo do contrapeso e os topos do capô e da tampa. Os casos mais justos da prova são o comprimento no mínimo, em que o fundo do contrapeso fica com 48 mm, e o capô no máximo, em que o canto de trás do painel fica 10,7 mm acima do capô, com raio de 9,3 mm.

## As peças

`arcoRecortadoComAro` é a frente de um painel de lado com o arco de roda recortado embaixo (face, topo do recorte, vão e pé) e o aro em L por cima, cuja borda de dentro é o canto convexo do painel no topo da face. `vaoFechadoPelaLongarina` é o vão de uma roda como círculo de construção, com as duas pernas a prumo tangentes a ele, a saída de cada perna pela tangente e a longarina presa nas pernas. `rampaComOmbro` é a rampa de dois trechos do pé ao topo, com o ombro onde a inclinação muda. A família usa cada uma uma vez (`arco`, `vao` e `rampa`), e o polígono da lateral passa pelos pontos das três.

## As provas

O perfil `referencia` grava em `referencia/` o mesmo desenho do ajuste: a razão contra `docs/mecanifica/banco-de-provas/empilhadeira-2026-10-09/referencias/carcaca_lateral.contornos.json` é 0,9941 sem alinhar e 0,9943 pela melhor translação, com a mesma razão por parte do ajuste (`npm run desenho -- razao procedural/familias-de-desenho/carcaca-empilhadeira/referencia/lateral.contornos.json <a referência> --partes`). `--provar` resolve os 243 conjuntos de valores, os 33 de um parâmetro por vez (o padrão, todos no mínimo, no médio e no máximo, e cada parâmetro nos três) e os 210 dos 105 pares de parâmetros nos extremos cruzados, o mínimo de um com o máximo do outro dos dois jeitos, e desenha 240 deles sem conflito, parte solta, lado trocado, polígono cruzado, parte escondida nem peça virada. Os 3 que sobram ferem uma relação de ordem e não são desenhados: `capo` no máximo com `painel` no mínimo, `altura` no mínimo com `painel` no máximo e `encosto` no mínimo com `painel` no máximo. Sem as relações, o primeiro e o terceiro reprovavam, o primeiro com raio negativo no canto de trás do painel e o terceiro com raio de canto que não cabe na aresta. A prova leva cerca de 25 segundos. As pastas `minimo/`, `medio/` e `maximo/` têm o desenho com todos os parâmetros no mínimo, no médio e no máximo, gravado com `--perfil=minimo`, `--perfil=medio` e `--perfil=maximo` e `--grava`; o médio é o valor da referência e por isso `medio/` e `referencia/` têm o mesmo desenho. O gate `npm run familias-de-desenho:check` roda a prova e confere que as quatro pastas são o que a família gera hoje, nos bytes do desenho e dos contornos.

## O que o formato não deixa fazer

Uma peça não dá cantos arredondados a um polígono que não é dela. O polígono da lateral passa pelas três peças, e o raio do recorte, o do canto sob o aro e o do arco traseiro são escritos na lateral e no contrapeso, fora das peças, repetindo o valor que a peça recebe (`grep -n raioDoCanto carcaca-empilhadeira.familia-de-desenho.json`).

A `rampaComOmbro` sobe para a direita e a traseira do capô desce para a direita com o mesmo desenho de ombro, e a traseira do capô segue em relações na família. O formato já deixa a peça servir espelhada (o `lado` e o `eixo` de uma relação aceitam um parâmetro de palavra ou um sinal, `npm run desenho -- --ajuda`, em OS PARÂMETROS), mas a `rampaComOmbro` não declara a orientação: a traseira do capô tem os ângulos e a altura do pé escritos nas relações da família, e trocá-los pela peça exigiria a altura do alto da descida como parâmetro, que hoje sai das outras relações, e regravar as quatro pastas. Fica para quando uma segunda rampa espelhada pedir.
