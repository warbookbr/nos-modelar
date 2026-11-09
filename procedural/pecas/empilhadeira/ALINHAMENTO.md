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

## Medidas (TABELA de partida, em mm)

| medida | valor | fonte |
|---|---:|---|
| comprimento até a face dos garfos | 2.635 | ficha da classe; lateral confere 2.634 |
| largura total, nos pneus dianteiros | 1.150 | ficha da classe |
| entre-eixos | 1.700 | ficha da classe; lateral dá 1.755 (3%) |
| bitola dianteira, centro a centro | 970 | 1.150 menos a largura do pneu |
| bitola traseira, centro a centro | 970 | ficha da classe |
| pneu dianteiro 7.00-12 | Ø 705 × 180 | medida do pneu |
| pneu traseiro 6.00-9 | Ø 545 × 150 | medida do pneu |
| altura do protetor do operador | 2.150 | ficha; lateral dá 2.226 com as luzes |
| altura da torre abaixada | 2.100 | ficha; lateral dá 2.165 |
| garfos | 1.070 × 100 × 40 | classe II, 2,5 t |
| distância entre os centros dos garfos | 500 | caráter da vista de cima |
| largura do carro porta-garfos | 1.000 | classe II |
| largura externa da torre | 820 | caráter da vista de frente |
| largura da carcaça atrás | 1.070 | caráter da vista de cima |
| altura do piso do operador | 560 | lateral |
| topo da tampa do capô | 1.190 | lateral |
| contrapeso: profundidade × altura | 380 × 440 | lateral |
| largura do protetor | 960 | caráter da vista de cima |
| cilindro de GLP | Ø 320 × 700, atravessado | botijão de 20 kg |
| topo do escape | 2.120 | lateral |

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
