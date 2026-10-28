# Alvo: caminhao-lixo

## Origem

- Modelo: "garbage-truck" do pacote A, de autor A.
- Autor: autor A.
- Pacote: pacote A, com o arquivo `garbage-truck.glb` (sete malhas: braço, caçamba de lixo, carroceria e quatro rodas).
- Licença: licença livre sem exigência de crédito, declarada no `License.txt` do pacote.
- Página: endereço omitido
- A malha não está no repositório (`importados/veiculos-livres/pacote-a/garbage-truck.glb`, ignorado pelo git). `docs/modelar/veiculos-referencias.json` confirma o pacote (`pacote-a`, modelo `garbage-truck`).
- Referências versionadas: `fonte-vistas.png` (quatro vistas), `fonte-partes.json` (silhuetas em fatias, em metro, escala 1,765, 6089 mm de comprimento) e `folha-comparativa.png`.
- Orientação: a frente do caminhão está em +z e na lateral da fonte fica à esquerda; não foi preciso girar.

## Medidas contra a fonte

- Caixa: x -1412 a 1412 mm, y 0 a 2824 mm e z -3045 a 3044 mm, iguais à fonte (z com 1 mm de diferença).
- `comparar-silhueta --rigoroso --cabine auto`: fatias em z com média de 5 mm e máxima de 66 mm; fatias em y com média de 8 mm e máxima de 88 mm; zero fatias acima de 122 mm; cabine com média de 11 mm e máxima de 51 mm.
- Folha comparativa (interseção sobre união): 0,983 na isométrica, 0,991 na lateral, 0,981 na frontal e 0,993 de cima.
- Medidas lidas dos vértices da malha, separados por cor do mapa de cores: caçamba de 1147 mm de meia largura com paredes de 176 mm, topo plano em y 2824 até z -1332, rampa a 45 graus até a traseira em z -2692, piso interno em y 2471 com rampa paralela até z -2318; cabine de 971 mm de meia largura afunilando a 800 mm no teto, teto verde de y 2296 a 2470; chassi de y 353 a 529,5 com meia largura de 1147; rodas de raio 529,5 e 530 mm de largura em z 1915 e -944; braços de 146 mm de espessura, de x 1266 a 1412, com cubo em z 529 e y 850 e travessa inclinada em z 2430 a 2609.

## Diferenças por vista (folha aberta)

- Lateral: coincide quase por inteiro. A fonte tem o para-choque da frente mais alto no canto, encostado na roda (z 2444 a 2956); a receita o começa em z 2505, onde o arco de 590 mm acaba, porque o arco recortado no perfil não pode atravessar o para-choque. O pé da barra de levantamento atrás e as duas cunhas cinza pequenas sob o para-choque da frente estão simplificados em caixas.
- Frontal: a receita sobra 66 mm de largura na caçamba entre y 1712 e 2180 (a fonte tem a parede da rampa mais estreita ali, com vértices em x 1059 e 971 na traseira). A receita usa a parede de 1147 mm inteira. A grade escura entre os faróis é uma caixa com o mesmo perfil dos faróis, e não o painel de faces inclinadas da fonte.
- De cima: faltam os dois braços curtos que ligam os postes da barra de levantamento aos suportes laterais (x 1001 a 1118, z -2787 a -2720, 0,05% da área). As pedras de lixo são seis prismas de seis lados com topo plano; a fonte tem uma pilha de poliedros maiores, que se interpenetram e chegam ao topo da borda.
- Isométrica: o vidro do para-brisa e dos laterais é uma placa de 12 a 20 mm sobre a face da cabine, e não rebaixado na moldura como na fonte. O recesso do cubo da roda é estimado. As cores são uma só por parte (a fonte varia o tom por face).
- Janelas laterais da cabine: a fonte tem uma barra diagonal no vidro que a receita não reproduz.
