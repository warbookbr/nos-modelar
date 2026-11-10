# Empilhadeira — alinhamento

Plano: [`docs/modelar/planos/2026-11-09-empilhadeira.md`](../../../docs/modelar/planos/2026-11-09-empilhadeira.md).
Decidido pela IA que conduz, por delegação da pessoa em 2026-11-09; cada decisão
de forma passa pela crítica visual dela antes de a etapa ficar fixa.

## O objeto e as referências

Empilhadeira de contrapeso a GLP, classe 2,5 t, torre duplex de 3 m, pneus
pneumáticos, com protetor do operador e cilindro de gás atrás. Referências de
caráter (geradas por IA a pedido da pessoa, sem marca, uma vista por arquivo,
sem valer como medida): `referencias/cima.ia.png`, `referencias/tras.ia.png`,
`referencias/frente.ia.png`. A lateral entra pelos contornos por parte de
outubro (`referencias/lateral.contornos.json`, 25 partes, 4,437 mm/px), cuja
escala bate com o comprimento da ficha (2.635 mm sem garfos contra 2.634 mm
medidos) e que servem de conferência das proporções.

## Como funciona e em que ordem se monta

A carcaça (chassi com contrapeso, capô e piso) é a base: tudo se prende nela. O
eixo dianteiro é motriz e fica sob o piso; o traseiro é direcional, articulado
no meio para acompanhar o chão, sob o contrapeso. A torre se prende no eixo
dianteiro por dois pinos e inclina para a frente e para trás pelos dois
cilindros de inclinação presos no chassi; dentro dela o canal interno sobe pelo
cilindro de elevação e puxa o carro porta-garfos pelas correntes. O protetor do
operador se apoia no chassi em quatro pés. O banco fica sobre o capô, que cobre
o motor; a coluna de direção sai do painel à frente. O cilindro de GLP deita
atravessado sobre o contrapeso, num berço que tomba para trás.

Juntas: as rodas giram nos seus eixos (paralelos ao eixo transversal); as rodas
traseiras esterçam em torno do vertical; a torre inclina em torno do eixo
transversal dos pinos; o canal interno e o carro sobem na vertical; o volante
gira em torno da coluna. A montagem é posta na pose de transporte: torre
vertical, garfos abaixados, rodas retas.

## Medidas (TABELA, em mm)

A primeira coluna de valor é a de partida, da ficha de uma máquina de 2,5 t; a
segunda é a que o rascunho da máquina inteira adotou
(`referencias/empilhadeira.esboco.mjs`, 2026-11-10), na escala da carcaça (o
capô a 1.193 mm, e as medidas laterais da ficha crescem por 596,4/511). As
escalas das vistas de IA: frente 3,395 mm/px na largura (aba do paralama a
1.212) e 4,25 na altura; trás 4,03 (capô); cima 3,80 na largura (capô) e 4,058
no comprimento; lateral de outubro 4,437, levada à carcaça por 1.700/1.756.

| medida | partida | rascunho | fonte do rascunho |
|---|---:|---:|---|
| comprimento até a face dos garfos | 2.635 | 2.706 | carcaça (lateral da carcaça, cubos a 1.700) e face dos garfos a z 520 |
| largura total, nos pneus dianteiros | 1.150 | 1.334 | vista de cima, linhas 120 e 471 (3,80); ficha × 596,4/511 dá 1.342 |
| entre-eixos | 1.700 | 1.700 | ficha |
| bitola dianteira, centro a centro | 970 | 1.084 | decisão: pneu de 417 a 667 |
| bitola traseira, centro a centro | 970 | 1.098 | decisão: pneu de 445 a 653 |
| pneu dianteiro | Ø 705 × 180 | Ø 705 × 250 | Ø da ficha (lateral 691); banda da vista de frente (265) e de trás (250) |
| pneu traseiro | Ø 545 × 150 | Ø 568 × 208 | Ø pelo cubo da carcaça a 284 (lateral 558, ficha 545); banda a da dianteira × 150/180 |
| altura do protetor do operador | 2.150 | 2.135 (2.150 com as lanternas) | lateral, linha 39,5 |
| altura da torre abaixada | 2.100 | 2.100 | ficha; lateral 2.094 |
| garfos | 1.070 × 100 × 40 | 1.070 × 100 × 40 | ficha; vista de cima dá 830 de lâmina, lateral 947 |
| distância entre os centros dos garfos | 500 | 560 | vista de frente, colunas 437-470 e 598-632 (3,395) |
| largura do carro porta-garfos | 1.000 | 1.000 | classe II; frente dá 836, cima 920 |
| largura externa da torre | 820 | 620 | decisão: por dentro da aba do paralama (327), com 17 mm de folga; frente dá 555 |
| largura da carcaça atrás (capô) | 1.070 | 1.193 | vista de trás, colunas 388 a 684 (4,03) |
| largura da aba do paralama | — | 1.212 | vistas de cima, linhas 135 a 454; frente, colunas 366 a 723 |
| altura do piso do operador | 560 | 765 | lateral da carcaça (contorno `piso`) |
| topo da tampa do capô | 1.190 | 1.150 | lateral da carcaça e vista de trás, linha 272 |
| contrapeso: profundidade × altura | 380 × 440 | 486 × 424 | lateral da carcaça (z -1.700 a -2.186, y 221 a 645) |
| largura do protetor | 960 | 960 | ficha; vista de trás dá 1.040 nos pés |
| pés da frente do protetor | — | 455 a 512 do centro | vista de frente, colunas 412-431 (inclinadas 32 mm para dentro até o teto) |
| painel, meia largura na frente | — | 415 de z 10 a -130, 496 atrás | decisão: dá lugar aos pés da frente do protetor |
| cilindro de GLP | Ø 320 × 700, atravessado | Ø 320 × 700 | ficha; vista de trás 675, de cima 731 |
| topo do escape | 2.120 | 2.070 | lateral (linha 58) |

A ordem de prevalência: ficha da classe, depois a lateral, depois o caráter das
vistas de IA. Divergência acima de 5% entre a tabela e a lateral vai à pessoa.

## Partes e ordem de montagem

1. `carcaca`: chassi, contrapeso, capô com tampa, laterais, piso, paralamas e
   poços das rodas, numa peça (rígida); grade e lanternas traseiras como detalhe
   dela.
2. `eixoDianteiro` com as `rodasDianteiras` (2).
3. `eixoTraseiro` direcional com as `rodasTraseiras` (2).
4. `torre`: canais externos com travessas; `canalInterno`; `cilindroElevacao`;
   `correntes`; `carro` porta-garfos com a `grade` de carga; `garfos` (2);
   `cilindrosInclinacao` (2).
5. `protetor` do operador, com as luzes, o espelho e as lanternas altas.
6. `banco`; `colunaDirecao` com o `volante`; `pedais`; `alavancas`.
7. `berco` do GLP com o `cilindroGlp` e as `cintas`; `escape`.

Peça rígida entre juntas é uma peça só, como no braço: o que não gira em
relação ao vizinho entra na mesma receita.

## Grau de realismo

Carcaça moldada com cantos arredondados e arcos de roda recortados; chapas e
tubos com chanfro estreito nas bordas; rodas com banda de rodagem e aro de aço;
torre em perfis com travessas visíveis; protetor em tubo com grade. Sem
parafusos, fiação nem interior.

## O que reprova o objeto

Proporção que não lê como empilhadeira de 2,5 t (torre baixa ou fina demais,
rodas traseiras do tamanho das dianteiras, protetor estreito); peça que cruza
outra; roda fora do chão; junta com eixo errado; garfos fora do carro; cilindro
de GLP sem berço.

## Carcaça (fatias 1 e 2)

Referências de caráter da carcaça isolada, trazidas pela pessoa em 2026-11-09,
uma vista por arquivo: `referencias/carcaca-lado.ia.png`,
`referencias/carcaca-cima.ia.png`, `referencias/carcaca-frente.ia.png` e
`referencias/carcaca-tras.ia.png`. Elas substituem a lateral de outubro como
fonte de forma da carcaça, porque mostram a mesma máquina das vistas inteiras
sem as peças que escondem a carcaça (rodas, torre, protetor, banco). A lateral
é mapeada por parte com `npm run contorno`
(`referencias/carcaca-lado.ia.regioes.json`), com as âncoras nos centros dos
dois cubos: o dianteiro a 352,5 mm do chão (raio do pneu 7.00-12) e o traseiro
a 1.700 mm dele (entre-eixos da ficha), o que dá 4,28 mm/px.

A escala de cada vista vem da ficha e a forma vem da vista. Comprimento e
altura saem da lateral pela calibração dos cubos. A largura sai da vista de
cima pela largura nos pneus da ficha (1.150 mm em 351 px, 3,28 mm/px), porque a
vista de cima escalada pela lateral daria a carcaça com 1.320 mm e os pneus com
1.485 mm, uma razão entre largura e entre-eixos que nenhuma classe real tem
(atrito 5). Com isso a carcaça fica com 1.040 mm nos paralamas dianteiros,
1.010 mm no meio e 1.020 mm no capô, e o canto de trás do capô, visto de cima, é
um arco que tira 110 mm de cada lado nos últimos 220 mm.

A carcaça é uma peça rígida, `carcaca`, com estas partes nomeadas, cada uma
com a sua cor por material:

| parte | o que é | cor | vista que a define |
|---|---|---|---|
| `chassi` | chapas do chassi atrás dos cubos dianteiros e a travessa que recebe os pinos da torre | cinza | frente e lado |
| `laterais` | o corpo laranja dos dois lados, com o arco da roda dianteira, a borda de cima em diagonal e o furo da tampa de combustível só do lado esquerdo | laranja | lado e cima |
| `paralamas` | as abas laranja sobre as rodas dianteiras, com o canto da frente arredondado em planta | laranja | cima e lado |
| `piso` | o piso do operador com o tapete e os dois degraus antiderrapantes | cinza escuro | cima e lado |
| `painel` | o anteparo inclinado à frente do posto, de onde sai a coluna de direção | cinza | lado e cima |
| `tampaMotor` | a tampa arredondada sobre o motor, que é a base do banco | cinza | cima e lado |
| `colunas` | os montantes atrás da tampa do motor, onde se apoiam os pés de trás do protetor | cinza | lado e cima |
| `capo` | a caixa laranja de trás, com o canto traseiro arredondado em planta | laranja | cima, lado e trás |
| `tampa` | a tampa cinza do alto do capô, com a grade do radiador logo abaixo dela | cinza | trás e lado |
| `contrapeso` | o bloco cinza de baixo, atrás, com o rasgo do pino de reboque e os poços das rodas traseiras | cinza | trás e lado |
| `tunel` | o fundo escuro do vão sob o piso, entre as chapas do chassi (z -300 a -1.100, y 195 a 472), que de frente aparece entre os montantes do pé da torre | escuro | frente |
| `pocoTraseiro` | o fundo escuro do poço traseiro e o forro de 15 mm por dentro do arco da roda traseira, de 360 a 590 mm do centro | escuro | trás e lado |

Na integração da máquina inteira (2026-11-10) a carcaça ganhou quatro cortes,
sem parte nova: o painel recolhe os cantos da frente a 415 mm de z 10 a -130,
para os pés da frente do protetor; o painel e o piso têm o rebaixo dos cilindros
de inclinação da torre (x 305 a 405, y 810 a 910, z 10 a -160); o contrapeso
tem o poço da roda traseira (o pneu com 40 mm de folga, de 405 mm para fora); e
o pé das laterais sobe de 191 a 221 mm por dentro dos pneus traseiros, de z -380
a -1.600, para não aparecer de trás sob o contrapeso. Os poços dianteiros cortam
de 377 mm para fora, e as medidas das rodas moram em `RODAS` da carcaça, de onde
`eixos-rodas.esboco.mjs` as lê.

A técnica de cada volume é a da carcaça bruta: a silhueta lateral da parte (o
contorno em mm da lateral, simplificado) extrudada na largura da parte e
cruzada com a planta dela (o contorno da vista de cima), por `extrusao` e
`intersectar`. Os poços das rodas saem por `subtrair` do cilindro do pneu com
40 mm de folga em volta, do lado de dentro do pneu até fora da carcaça, porque
as rodas ficam parcialmente sob os paralamas e o capô (os pneus dianteiros
ocupam de 395 a 575 mm do centro, e a carcaça vai até 520). Na fatia 2 entram
as arestas arredondadas (`arredondarAresta`, raio de 30 mm no capô, nas
laterais e na tampa do motor, 10 mm nas chapas), a grade com as aletas, as
lanternas rentes, o furo da tampa de combustível, os degraus, o rasgo do
contrapeso e as linhas de painel do capô.

O que fica fora da carcaça, embora apareça nas vistas dela: o cubo e o
diferencial do eixo dianteiro (fatia 3), o eixo traseiro com a suspensão
(fatia 3) e o pé da torre com o suporte da inclinação (fatia 4).

## Divergências entre as fontes

As vistas de IA não concordam entre si em escala, e duas delas têm
perspectiva. A torre, medida nas vistas de frente e de trás contra o corpo,
sai 0,90 vez menor de trás (499 contra 554 mm): a vista de trás encolhe o que
fica longe dela. A travessa de cima da torre sai 1,47 vez maior de cima que de
frente (817 contra 554): a vista de cima aumenta o que fica alto. Cada escolha
abaixo leva isso em conta.

- Pneu dianteiro, borda de fora: cima 667, ficha na escala 671, frente 623; de
  trás não aparece. Adotado 667, pela vista de cima e pela ficha. A vista de
  trás o esconde pela perspectiva (667 × 0,90 = 600, atrás do capô de 596); no
  rascunho ele aparece de trás por fora do capô.
- Pneu dianteiro, banda: frente 265 (de 358 a 623), trás 250 (traseiro), ficha
  na escala 210. Adotado 250, de 417 a 667; o poço da carcaça passou de 414 para
  377.
- Diâmetro traseiro: ficha 545, lateral 577 na escala dela e 558 na da carcaça,
  cubo da carcaça a 284. Adotado 568: a roda toca o chão sob o cubo, e a razão
  traseira/dianteira fica em 0,81, a da lateral.
- Pneu traseiro, largura: trás 403 a 653 (a borda de dentro é o lado côncavo do
  contrapeso, não a do pneu), cima 646 a 650, ficha na escala 479 a 654.
  Adotado 445 a 653: a borda de fora pelas três, a banda pela razão da ficha,
  porque o pino da manga do eixo traseiro vai a 440. O contrapeso, que chegava a
  492 mm a 495 de altura, ganhou o poço da roda.
- Pés da frente do protetor: frente 420 a 477, protetor anterior 500 a 556 (por
  fora do painel de 496 da vista de cima da carcaça isolada). Adotado o pé de
  455 a 512, inclinado até o teto como a vista de frente mostra, e o painel
  recolhido a 415 sob ele; na vista de cima da máquina inteira o canto do
  painel fica sob a coluna e não se mede.
- Largura da torre: ficha 820, cima 817 (706 na escala dos pneus da ficha),
  frente 555. A aba do paralama está certa onde a torre passa: as duas vistas
  de cima dão a borda de dentro dela a 321-332 mm em z 164 a 180 (colunas 366 a
  375), por baixo das hastes dos cilindros de inclinação, e a de frente a 307.
  Adotado 620, por dentro da aba; a vista de cima mede a travessa alta,
  aumentada pela perspectiva.
- Aba do paralama contra o capô: cima 606 contra 596; de trás a aba não
  aparece. É a mesma causa do pneu dianteiro escondido de trás, a perspectiva
  da vista de trás, e não a largura das laterais (583 na frente e 595 atrás, na
  vista de cima). Ficam 606 e 596.
- Garfos: ficha 1.070, lateral 947, cima 830. Fica a ficha.
- Vista de frente: a altura tem escala 25% maior que a largura (4,25 contra
  3,395 mm/px), e o casamento dela com o rascunho dá a razão altura/largura 16%
  acima; o corpo laranja atrás da aba, que o rascunho mostra até 600 mm do
  centro, a vista de frente não mostra além de 465.

## Decisões das receitas (2026-11-10)

A máquina saiu do rascunho para dezenove receitas em `partes/`, com a malha do
rascunho aprovado, e a medida de cada peça está na `TABELA` da receita dela, com
a fonte. As decisões que mudaram alguma coisa em relação ao rascunho foram
estas, e a pessoa aceitou todas ao fixar as etapas.

O ombro do pneu ficou em 62 mm, o valor que reproduz o rascunho com menor
diferença (3,3 mm na roda dianteira e 1,6 na traseira), pela opção de ombro
largo que a família `roda-pneu` ganhou; com o ombro redondo o lado do pneu é
uma curva só, do talão à banda. Os furos de fixação da roda traseira foram para
o círculo de 115,5 mm, porque a chapa do disco os cobria. A junta do eixo
traseiro é medida pelo alinhamento com os poços, e não pelo assento plano do
suporte, que a montagem não mede. Os pés do protetor são cortados no plano de
apoio, os da frente na aba do paralama e os de trás no bloco das colunas, e a
dobra da frente das colunas chega à coluna numa curva contínua. A alça é um
tubo redondo de 30 mm preso ao protetor, com o braço de cima 35 mm abaixo do
rascunho por causa dessa curva. O encosto do banco avançou 45 mm para assentar
inteiro na almofada. O escape é um tubo só de 90 mm, com o cotovelo em curva de
raio 100. As cúpulas do cilindro de gás são meias elipses. Pedais e alavancas
fazem parte da peça da coluna de direção, por serem rígidos com ela.

Três questões de forma que os críticos levantaram ficaram como estão por
decisão da pessoa ("pode fixar, seguimos como está"): as colunas de trás do
protetor em chapa larga, o assento do banco em laje sem abas e a grade de carga
e o volante em barras de aresta viva.

