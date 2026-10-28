# Alvo: carro-corrida-futurista

## Origem

- Modelo: "race-future" do pacote A, de autor A.
- Autor: autor A.
- Pacote: pacote A, com o arquivo `race-future.glb` (cinco malhas: monocoque com asas e quatro rodas).
- Licença: licença livre sem exigência de crédito, declarada no `License.txt` do pacote.
- Página: endereço omitido
- A malha não está no repositório (`importados/veiculos-livres/pacote-a/race-future.glb`, ignorado pelo git). A tabela `docs/modelar/veiculos-referencias.json` confirma o pacote.
- Referências versionadas: `fonte-vistas.png` e `fonte-partes.json` (em metro, escala 1,765, comprimento de 4,694 m, frente em +z).

## Medidas contra a fonte

- Caixa: x ±1059, y 0 a 1469 e z ±2347, iguais à fonte (diferença 0 mm).
- Rodas: diâmetro 1059, de x 530 a 1059, centros em z 1041 e -1642.
- Planta, perfil e alturas lidos dos vértices da malha (nariz 441 de meia-largura, meio 618, traseira 441; pontões, aletas, visor, santantônio, cobertura e placas das asas).
- Comparador rigoroso (94 mm por fatia): média 3 mm, máxima 58 mm, nenhuma fatia fora.
- Folha comparativa: interseção sobre união de 0,985 (isométrica), 0,980 (lateral), 0,975 (frontal) e 0,990 (de cima).

## O que não ficou igual

- Lateral: 0% de diferença na silhueta; o pneu não tem o chanfro interno da fonte e o centro do cubo não tem o rebaixo escuro.
- Frontal (sobra 0,73%, falta 0,31%): os 32 lados do pneu e o contorno do para-lama diferem por pixels nas quinas de baixo.
- Isométrica (sobra 0,46%): o contorno das rodas sobra por pixels.
- Cubo: disco cinza liso, sem o anel e o centro escuro; o aro laranja é um disco de raio 450.
- Para-lama: o arco tem 12 segmentos e vão de 545 mm, contra 530 da fonte; o miolo sólido de x 441 a 530 da fonte foi trocado por um eixo de 90 mm de raio entre o monocoque e o pneu.
- A parede de trás do monocoque na fonte (face cinza da cobertura em z -1994) e o rebaixo do fundo não existem; a placa da asa traseira para na altura do arco do para-lama de trás, e o degrau de trás do meio do monocoque fica em z -1008 (na fonte, -1120).
- A cunha diagonal vai até z 407 (fonte: 488) para não atravessar o para-lama da frente.
- Cores aproximadas das da textura (azul `#6070d0`, cinza `#707287`, aro `#d28a30`).

## Duvidoso

- A cobertura do motor é um prisma de lados planos; a fonte tem superfície torcida entre o visor e a traseira.
- A silhueta confere por fatia; a forma é julgada na folha comparativa.
