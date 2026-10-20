# Alvo: trator-pa

## Origem

- Modelo: "tractor-shovel" do pacote A, de autor A.
- Autor: autor A.
- Pacote: pacote A, com o arquivo `tractor-shovel.glb` (seis malhas: corpo, pá e quatro rodas).
- Licença: licença livre sem exigência de crédito, declarada no `License.txt` do pacote.
- Página: endereço omitido
- A malha não está no repositório (`importados/veiculos-livres/pacote-a/tractor-shovel.glb`, ignorado pelo git).
- Referências versionadas: `fonte-vistas.png` (quatro vistas com a cor original) e `fonte-partes.json` (caixas e silhuetas em fatias de superfície, em metro, escala 1,765, comprimento de 4,36 m).

## Medidas contra a fonte

- Caixa total igual à fonte: x ±1465, y 0 a 2669, z -2180 a 2180 mm.
- `comparar-silhueta --rigoroso --cabine auto`: fatias em z com média de 1 mm e máxima de 51 mm; em y, média de 3 mm e máxima de 20 mm; cabine média de 5 mm; nenhuma fatia fora de 87 mm.
- Folha comparativa (interseção sobre união): isométrica 0,988, lateral 0,989, frontal 0,981, de cima 0,973.
- Rodas: traseiras de 1544 mm de diâmetro e 604 de largura (x 861 a 1465), dianteiras de 948 e 436 (x 732 a 1168), 24 lados.

## O que não ficou igual

- Para-lama de trás: começa em x 861 e não em 693, para não atravessar o bloco e a cabine; vista de cima, a parte de dentro da cauda (z -2188 a -1850, x 689 a 851) falta, 0,55% da área.
- Cabine e bloco: 861 mm de meia-largura na base, contra 891 da fonte, para a roda de trás assentar na face do bloco; o afunilamento é de 102 mm e não de 132.
- Vidros: placas de 12 mm por fora das faces; na fonte são coplanares e levemente rebaixados na moldura.
- Pneu e aro: o forro laranja do vão é uma casca de 30 mm com o cone da fonte; o cubo dianteiro usa raio 132 a 174 mm, lido dos vértices.
- Dentes e pá: o tampo cinza tem 20 mm (suposto); a lateral e a traseira verde da placa saem como na fonte, mas a moldura cinza das pontas não existe.
- Faces de luz clara dos retrovisores e do engate (placas brancas da fonte) não foram modeladas; a traseira do bloco, verde na fonte, é cinza.
- Eixos dianteiros: hastes de 44 mm de diâmetro, escondidas, que a fonte não tem; existem só para prender a roda.
- Cores aproximadas: verde `#3ea87a`, cinza `#6f7187`, vidro `#d4ecff`, pneu `#2b2b30`, aro `#f39a35`.

## Duvidoso

- O vão de roda da frente (raio de fundo 150 mm) foi estimado; a fonte só dá as bordas.
- A traseira não aparece nas vistas da fonte; o que está atrás vem das faces da malha.
