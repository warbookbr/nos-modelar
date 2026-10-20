# Alvo: picape-compacta

## Origem

- Modelo: "truck" do pacote A, de autor A.
- Autor: autor A.
- Pacote: pacote A, com o arquivo `truck.glb` (cinco malhas: carroceria e quatro rodas).
- Licença: licença livre sem exigência de crédito, declarada no `License.txt` do pacote.
- Página: endereço omitido
- A malha não está no repositório (`importados/veiculos-livres/pacote-a/truck.glb`, ignorado pelo git).
- Referências versionadas: `fonte-vistas.png` (quatro vistas) e `fonte-partes.json` (silhuetas em fatias, em metro, escala 1,765, comprimento de 5,206 m com as placas).

## Medidas contra a fonte

- Caixa: x -1324 a 1324 e z -2603 a 2603 mm, iguais à fonte; y 0 a 2294 mm contra 2295 mm.
- Silhueta por fatia (`comparar-silhueta --rigoroso`): em z média de 2 mm e máxima de 53 mm; em y média de 9 mm e máxima de 161 mm, com uma fatia fora de 104 mm (y 765 a 860, na traseira).
- Folha comparativa: interseção sobre união de 0,97 na isométrica, 0,98 na lateral, 0,95 na frontal e 0,99 na de cima.
- Medidas lidas da malha por material (a cor vem do mapa de cores): corpo verde de 971 mm de meia largura, chassi e para-lamas de 1147, cabine afunilando de 971 na base a 794 no teto, caçamba com paredes de 177 mm, assoalho em y 1059, rodas de raio 530 e 618 mm de largura em z 1562 e -1297.

## Diferenças por vista (folha aberta)

- Lateral: faltam duas cunhas cinza pequenas (z -2502 a -2359 e 2359 a 2416, y 730 a 860) sob a tampa e sob o nariz, que a fonte faz inclinadas entre o para-choque e o corpo; a receita deixa o recuo vazio.
- Frontal e de cima: o comparador acusa sobra no vidro do para-brisa (x ±647, y 2010 a 2140). A fonte não tem o vidro na silhueta medida; na imagem da fonte o vidro existe, de modo que é efeito da medida e não de forma.
- Frontal: a grade da fonte é um painel com faces inclinadas ao lado; a receita usa uma placa escura de 10 mm.
- Isométrica: o assoalho da caçamba fica 16 mm acima do da fonte (1075 contra 1059), porque o topo do pneu toca y 1059 e o assoalho não pode atravessá-lo. O fundo do vão da roda é uma caixa escura lisa, e não o túnel de raio 529 da fonte.
- Cores: uma cor verde só (a fonte varia o tom por face), o cubo da roda tem recesso cônico estimado, e os retrovisores saem verdes (a fonte tem a face de trás clara).
