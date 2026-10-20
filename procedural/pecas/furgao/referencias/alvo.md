# Alvo: furgao

## Origem

- Modelo: "van" do pacote A, de autor A.
- Autor: autor A.
- Pacote: pacote A, com o arquivo `van.glb` (cinco malhas: carroceria e quatro rodas). A tabela `docs/mecanifica/veiculos-referencias.json` confirma o pacote `pacote-a`.
- Licença: licença livre sem exigência de crédito, declarada no `License.txt` do pacote.
- Página: endereço omitido
- A malha não está no repositório (`importados/veiculos-livres/pacote-a/van.glb`, ignorado pelo git).
- Referências versionadas: `fonte-vistas.png` (quatro vistas com a cor original) e `fonte-partes.json` (caixas e silhuetas em fatias de superfície, em metro, escala 1,765, comprimento de 4,854 m). Frente em +z, conferida na vista lateral (frente à esquerda) e pelas rodas.

## Medidas contra a fonte

- Caixa total: x -1324 a 1324, y 0 a 2383 e z -2427 a 2427 mm, iguais à fonte.
- `comparar-silhueta --rigoroso --cabine auto`: fatias em z com média de 1 mm e máxima de 28 mm; fatias em y com média de 4 mm e máxima de 12 mm; zero fatias fora de 97 mm.
- Folha comparativa (mesma câmera e escala): interseção sobre união de 0,996 na isométrica, 0,997 na lateral, 0,993 na frontal e 0,993 na vista de cima.
- Rodas: diâmetro de 1060 mm, largura de 618 mm, centros em x ±750, z 1386 (frente) e -1297 (trás).

## O que não ficou igual

- Faróis: cascas de 12 mm sobre a quina do nariz e o capô; na fonte o amarelo está na própria superfície e dá a volta até a lateral (x 971, z 2073 a 2250).
- Retrovisor: caixa azul inteira; na fonte a face de trás é clara (vidro do espelho), o que só se vê por trás.
- Pneu e aro: pneu de 24 lados com chanfro; o aro é um disco faceado com a face de fora, com o cubo rebaixado 88 mm. A fonte tem um anel de aro e um cubo menor.
- Arco da roda: polígono de 24 lados com raio de 575 mm (45 mm de folga sobre o pneu); na fonte o forro do arco é escuro e justo ao pneu (529 mm). Na receita o interior do arco sai da cor dos próprios prismas, e só a caixa de roda entre os pneus é escura.
- Painel de teto: faixa de topo plano; a fonte tem o topo levemente abaulado no sombreamento. A cor é aproximada.
- Cores aproximadas, tiradas da textura `colormap` do pacote: carroceria `#5d75c9`, chassi `#6a6b80`, vidro `#d4ecff`, farol `#ffd22e`, lanterna `#d3363d`.
- Lanternas traseiras: placas vermelhas medidas na malha (x 485 a 971, y 1059 a 1236); a fonte não tem imagem da traseira, então a posição vem dos vértices.

## Diferenças por vista (folha aberta)

- Isométrica: mesma massa, capô, para-brisa, janela lateral com recorte do retrovisor, para-lamas em cápsula e painel de teto. Difere o amarelo do farol (casca, sem a volta na lateral) e o interior escuro dos arcos.
- Lateral: perfil do nariz, do capô, do para-brisa, do teto e da traseira inclinada coincidem; a saia inclinada entre as rodas e a soleira aparecem como na fonte. O raio do arco é 45 mm maior que o da fonte.
- Frontal: a cabine afunila de 971 a 794 mm de meia largura como na fonte; grade cinza, para-choque e placa octogonal no mesmo lugar.
- De cima: planta, quinas cortadas dos para-choques, painel de teto, vidro traseiro e retrovisores coincidem; o painel é um pouco mais saturado que o da fonte.

## Duvidoso

- O ruído de ponto flutuante do polígono dos arcos é arredondado a 1e-6 mm em `circuloHorario`, porque o arco centrado em y 530 coincide com o nível da soleira (y 530).
