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
