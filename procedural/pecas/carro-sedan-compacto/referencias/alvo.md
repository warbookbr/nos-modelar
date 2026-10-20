# Alvo: carro-sedan-compacto

## Origem

- Modelo: "sedan" do pacote A, de autor A.
- Autor: autor A.
- Pacote: pacote A, com o arquivo `sedan.glb` (cinco malhas: carroceria e quatro rodas).
- Licença: licença livre sem exigência de crédito, declarada no `License.txt` do pacote.
- Página: endereço omitido
- A malha não está no repositório (`importados/veiculos-livres/pacote-a/sedan.glb`, ignorado pelo git).
- Referências versionadas: `fonte-vistas.png` (quatro vistas com a cor original) e `fonte-partes.json` (caixas e silhuetas em fatias de superfície, em metro, escala 1,765, comprimento de 4,5 m).

## Medidas contra a fonte

- Caixa total: x de -1324 a 1324 mm, igual à fonte. y de 0 a 2290 mm contra 2295 mm (5 mm). z de -2262 a 2250 mm contra -2250 a 2250 mm (12 mm, por causa das lanternas traseiras).
- Silhueta por fatia, método de superfície (`comparar-silhueta`): lateral e de cima com diferença média de 22 mm e máxima de 177 mm; frontal e lateral com média de 30 mm e máxima de 116 mm. Nenhuma fatia passa de 225 mm (5% do comprimento).
- Rodas: diâmetro de 1059 mm e largura de 618 mm, centros em x ±750 mm, z 1209 mm (frente) e -1121 mm (trás), com pé no chão em y 0.
- Simetria exata em x: cada parte da esquerda é o espelho da direita, com as mesmas medidas.

## O que não ficou igual

- Cabine: largura constante, de 840 mm de meia-largura. A fonte afunila o teto, e a cabine não acompanha esse afunilamento.
- Para-brisa: placa retangular de 790 mm de meia-largura. A fonte é mais estreita em cima e mais larga embaixo.
- Vidro traseiro: não existe. A fonte não mostra vidro na traseira.
- Pneu: liso, sem chanfro. A fonte tem pneu com acabamento arredondado.
- Lanternas traseiras: caixas vermelhas de 470 por 120 por 12 mm, na face de trás. Nenhuma vista da fonte mostra a traseira, então a posição é suposta. Elas saem 12 mm para trás do limite da fonte.
- Faróis: caixas de 6 mm de saliência sobre o nariz. A fonte mostra os faróis com volume que não foi medido.
- Retrovisores: caixas de 354 por 170 por 140 mm, na altura do capô. A fonte não mostra haste.
- Passagens das rodas: cortes cilíndricos de raio 580 mm, com 50 mm de folga em volta do pneu. O formato do vão da fonte não foi medido.
- Cores: aproximadas, tiradas de `fonte-vistas.png` (carroceria `#e0623c`, vidro `#bfdcf0`, chassi `#4a4e5b`, pneu `#1f2125`, aro `#9aa3b5`).

## Duvidoso

- Canto de trás do teto, em z -860 mm: a fonte pode estar entre -840 e -860 mm.
- Capô entre z 1000 e 2030 mm: a receita usa uma reta de 1260 a 1410 mm, e a fonte pode ter uma curva.
- Posição das lanternas traseiras, que é suposta (ver acima).
- A silhueta confere pela medida de superfície, mas essa medida só compara fatias. Forma e proporção são de quem aprova.
