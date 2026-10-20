# Alvo: carro-esportivo-sedan

## Origem

- Modelo: "sedan-sports" do pacote A, de autor A.
- Autor: autor A.
- Pacote: pacote A, com o arquivo `sedan-sports.glb` (seis malhas: carroceria, aerofólio e quatro rodas).
- Licença: licença livre sem exigência de crédito, declarada no `License.txt` do pacote.
- Página: endereço omitido
- A malha não está no repositório (`importados/veiculos-livres/pacote-a/sedan-sports.glb`, ignorado pelo git).
- Referências versionadas: `fonte-vistas.png` (quatro vistas com a cor original) e `fonte-partes.json` (caixas e silhuetas em fatias de superfície, em metro, escala 1,765, comprimento de 4,5 m).
- Forma lida dos vértices da malha (carroceria e aerofólio), com o ponto médio do comprimento levado a z 0: nariz em duas retas (z 2074, y 1059 até z 1633, y 1324), capô até a cintura em z 1015 e y 1412, pára-brisa a 37 graus até o teto em y 1941, rampa de trás de z -1456 a -2162, seção da cabine de 971 na cintura a 850 em y 1774 e 794 no teto.

## Medidas contra a fonte

- Caixa total: x de -1147 a 1147 mm, y de 0 a 1941 mm e z de -2250 a 2250 mm, iguais à fonte.
- Silhueta por fatia (`comparar-silhueta --rigoroso --cabine auto`): z com média de 1 mm e máxima de 14 mm; y com média de 4 mm e máxima de 49 mm; cabine com média de 4 mm e máxima de 24 mm; nenhuma fatia acima de 90 mm.
- Folha comparativa: interseção sobre união de 0,990 na isométrica, 0,990 na lateral, 0,986 na frontal e 0,9997 por cima.
- Rodas: diâmetro de 1060 mm, largura de 618 mm, centros em x ±750 mm, z 1209 mm (frente) e -1121 mm (trás), pé no chão.

## O que não ficou igual

- Cor por face: a fonte pinta as faces de cima (capô, teto, rampa) em laranja claro e as laterais em vermelho escuro, por causa da textura. A receita usa uma cor só (`#ea6540`) por parte, então a lateral da carroceria sai mais clara que a da fonte.
- Lanternas: a fonte não tem peça de lanterna medida; as placas vermelhas ficam na ponta da rampa de trás, de x 745 a 971, só pela vista de cima (posição suposta).
- Placa: seção octogonal de 618 por 309 mm, como a fonte, sem o arredondamento fino das quinas.
- Pneu: chanfro de 50 mm e 24 lados; a fonte tem pneu e aro com mais detalhe no cubo.
- Aro do para-lama: a fonte tem o furo do anel igual ao pneu (r 529) e a receita deixa 70 mm de folga (r 600), para o pneu não tocar o anel; vê-se uma fresta escura em volta do pneu na lateral.
- Chassi: soleira de 2294 mm de largura de y 353 a 706 e painel de 1942 acima, em vez da faixa de várias facetas da fonte; o painel do nariz e o de trás são caixas retas.
- Retrovisores: caixas de 176 mm, sem haste, como na fonte.
- Vidros: placas de 10 mm sobre as faces da cabine; a fonte tem o vidro como face da própria malha.
- Orientação: frente em +z, conferida pela lateral (frente à esquerda) e pela planta (frente embaixo).

## Duvidoso

- A rampa de trás entre z -1456 e -2162 é uma reta; a fonte pode ter uma quebra pequena na lanterna.
- A silhueta confere pela medida de superfície, mas essa medida só compara fatias. A forma é de quem aprova, olhando a folha comparativa.
