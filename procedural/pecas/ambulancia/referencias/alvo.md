# Alvo: ambulancia

## Origem

- Modelo: "ambulance" do pacote A, de autor A.
- Autor: autor A.
- Pacote: pacote A, com o arquivo `ambulance.glb` (sete malhas: corpo, quatro rodas e duas portas de trás).
- Licença: licença livre sem exigência de crédito, declarada no `License.txt` do pacote.
- Página: endereço omitido
- A malha não está no repositório (`importados/veiculos-livres/pacote-a/ambulance.glb`, ignorado pelo git).
- Referências versionadas: `fonte-vistas.png` (quatro vistas com a cor original) e `fonte-partes.json` (caixas e silhuetas em fatias de superfície, em metro, escala 1,765, comprimento de 5,736 m). A frente está em +z e à esquerda na vista lateral, sem giro.
- Sem texto nem marca: só cores e as barras de luzes.

## Medidas contra a fonte

- Caixa total: x ±1324 mm, y 0 a 3177 mm e z ±2868 mm, iguais à fonte.
- `comparar-silhueta --rigoroso --cabine auto`: fatias em z com média de 5 mm e máxima de 350 mm; fatias em y com média de 6 mm e máxima de 88 mm; corpo com máxima de 101 mm. A única fatia fora de 115 mm é z 837 a 956 (ymax 2645 contra 2295), e vem de o envelope da fonte só ver vértices: a face da frente do baú está em z 835, na borda da fatia anterior. Na folha, a vista lateral tem interseção sobre união de 0,994.
- Rodas: pneu de 1060 mm de diâmetro e 530 mm de largura, centros em x 795, z 1827 (frente) e -1562 (trás), pé no chão.
- Simetria exata em x.

## O que não ficou igual

- Janela do baú: placa azul acinzentada de 10 mm sobre a parede. A fonte a tem rebaixada cerca de 85 mm.
- Portas de trás: a fonte guarda duas malhas de porta dentro do baú, invisíveis nas vistas. Não existem na receita, e a traseira é uma parede lisa (nenhuma vista da fonte a mostra).
- Pneu: liso, sem chanfro; o aro é um disco liso, sem o cubo escuro central.
- Refletores vermelhos: placas de 2 mm sobre a parede; a fonte os tem rente à face.
- Faróis: placas de 12 mm que cobrem a face da frente e o chanfro do nariz; a fonte tem um calço amarelo que também dobra a quina.
- Estribo e trilho: o trilho cinza só existe entre as rodas, como na fonte; as formas dos pés das coroas dos para-lamas e dos degraus dos para-choques são medidas pelas vértices, e não pela imagem.
- Vão das rodas: o pneu tem 15 mm de folga até a coroa do para-lama (545 mm); na fonte o pneu encosta na coroa.
- Cores: aproximadas, tiradas de `fonte-vistas.png`. O branco do baú sai um pouco mais claro que o da fonte.

## Diferenças por vista (folha aberta)

- Lateral: perfil do capô, para-brisa, cabine, degrau do baú, painel do teto e barras de luzes na mesma posição; faixas vermelha e cinza e a janela nas mesmas alturas. Rodas e arcos iguais em posição e tamanho.
- Frontal: a cabine afunila como na fonte, o painel do teto e as barras aparecem acima, os estribos e retrovisores saem do mesmo modo; o para-choque e a placa estão no lugar.
- De cima: a quina da frente do baú chanfrada, as três barras de luzes, o painel do teto, os estribos escuros e os retrovisores em posição; a diferença é só a sombra do painel, mais clara na receita.
- Isométrica: mesma leitura; a janela do baú parece mais rasa e a grade tem menos relevo que na fonte.

## Duvidoso

- Altura do degrau traseiro do baú (y 705) e comprimento das barras de para-choque: lidos pelos vértices da fonte e pela lateral.
- A silhueta confere pela medida de superfície, que compara só envelopes por fatia. Forma e proporção são de quem aprova.
