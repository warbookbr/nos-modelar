# Alvo: carro-suv

## Origem

- Modelo: "suv" do pacote A, de autor A.
- Autor: autor A.
- Pacote: pacote A, com o arquivo `suv.glb` (seis malhas: carroceria, quatro rodas e o estepe `wheel-back`).
- Licença: licença livre sem exigência de crédito, declarada no `License.txt` do pacote.
- Página: endereço omitido
- A malha não está no repositório (`importados/veiculos-livres/pacote-a/suv.glb`, ignorado pelo git).
- Referências versionadas: `fonte-vistas.png` (quatro vistas com a cor original), `fonte-partes.json` (caixas e silhuetas em fatias, em metro, escala 1,765, comprimento de 4,766 m) e `folha-comparativa.png` (fonte, receita e diferença na mesma câmera e escala).

## Medidas contra a fonte

- Caixa total: x de -1324 a 1324 mm, y de 0 a 2295 mm e z de -2383 a 2383 mm, iguais à fonte (1 mm em y).
- `comparar-silhueta --rigoroso --cabine auto`: fatias em z com média de 2 mm e máxima de 36 mm, fatias em y com média de 6 mm e máxima de 49 mm, cabine com média de 7 mm e máxima de 49 mm, nenhuma fatia fora de 95 mm.
- Folha comparativa: interseção sobre união de 0,988 (isométrica), 0,993 (lateral), 0,989 (frontal) e 0,996 (de cima).
- Rodas: 1059 mm de diâmetro, 618 mm de largura com o aro, x de 441 a 1059, centros em z 1341 e -988.
- Medidas lidas vértice a vértice da malha, com a cor por vértice amostrada no `colormap.png` do pacote: parede inclinada única da cabine e da caixa de trás (971 mm de meia largura em y 1412, 794 mm em y 2295), traseira inclinada de z -2030 (y 1412) a -1677 (y 2295), cova da grade de 970 mm entre os faróis, faróis redondos de 177 mm de raio.

## O que não ficou igual

- Vista lateral: o pneu e o aro são lisos; a fonte tem chanfro no pneu, aro com anel e cubo central. A fonte mostra a borda do arco com o anel um pouco mais largo junto ao estribo.
- Vista frontal: o para-brisa e os vidros são placas de 10 a 20 mm sobre as faces; na fonte o vidro fica rente à face. A moldura do para-brisa é a mesma, mas o vidro lateral sai 10 mm da parede.
- Isométrica: a cova da grade foi feita com o chanfro do topo e a face escura; a fonte tem um degradê de cor que a receita não tem (cores lisas aproximadas: verde `#3ba478`, teto `#6e7186`).
- De cima: o estepe é um cilindro de 32 lados cortado pelo plano inclinado da traseira; a fonte tem o pneu com cantos arredondados. A placa clara de trás e as lanternas vermelhas ficam atrás, onde `fonte-vistas.png` não mostra.
- Estribo: dividido em duas peças (faixa cinza e degrau claro de 6 mm); na fonte é uma face clara só.
- Para-lamas: anel em arco de raio 688 mm, com as pontas assentadas no para-choque (y 706) e no estribo (y 530); a fonte tem uma saída mais longa no chassi atrás das rodas.
- A janela lateral começa em z 746 (e não 763, medido) para encostar no retrovisor sem atravessá-lo.
- Para-choques e saias a 15 mm das rodas (começam em z 1886 e -1533), para o arco de 545 mm não atravessá-los; na fonte o para-choque encosta no pneu.

## Duvidoso

- Cores: aproximadas pelo `colormap.png` e por `fonte-vistas.png`.
- A traseira baixa (lanternas, placa) é lida da malha, não de uma vista.
- A medida de silhueta confere escala e envelope; a forma é julgada pela folha aberta.
