# Alvo: carro-corrida

## Origem

- Modelo: "race" do pacote A, de autor A.
- Autor: autor A.
- Pacote: pacote A, com o arquivo `race.glb` (cinco malhas: carroceria e quatro rodas).
- Licença: licença livre sem exigência de crédito, declarada no `License.txt` do pacote.
- Página: endereço omitido
- A malha não está no repositório (`importados/veiculos-livres/pacote-a/race.glb`, ignorado pelo git). A tabela `docs/mecanifica/veiculos-referencias.json` confirma o pacote.
- Referências versionadas: `fonte-vistas.png` e `fonte-partes.json` (em metro, escala 1,765, frente em +z).

## Medidas contra a fonte

- Caixa: x ±1147, y 0 a 1293 e z ±2259, iguais à fonte (diferença 0 mm).
- Rodas: diâmetro 1059, de x 618 a 1147, centros em z 1129 e -1553; pneu com ombros chanfrados (raio 450 nas faces) e aro laranja de raio 291 a 450 na face de fora.
- Corpo lido dos vértices da malha, por plano: nariz de 534 mm, planta que alarga de 267 a 618 em z 576 a 292, deck em y 862, pontões de x 618 a 1059, cockpit oval de y 862 a 1116, cobertura em cunha, nadadeira até y 1293, asa traseira de y 858 a 946 sobre placas de x 441 a 618.
- Simetria exata em x. Silhueta por fatia: média 1 mm e máxima 13 mm.

## O que não ficou igual

- Cubo da roda: disco chato, e não o prato afundado da fonte (cone de 176 mm de profundidade).
- Pneu e aro somam 529 mm como na fonte, mas o aro é uma peça separada de 12 mm.
- Cockpit: bloco maciço claro, como na fonte; a fonte tem um degrau pequeno laranja junto dele que não foi separado.
- A textura da fonte tem manchas de cor no nariz e na cobertura (faixa escura central) que a receita só aproxima com a cobertura em laranja escuro.
- Cores aproximadas das cores da textura (laranja `#e0623c`, cinza `#6d6e83`, aro `#d08a2c`).
- Pneu com 32 lados e braço de suspensão com 24 lados, contra a contagem própria da fonte.

## Duvidoso

- A fonte não mostra a face de baixo; o fundo em y 177 e o chanfro de trás vêm dos vértices.
- A silhueta confere por fatia; a forma é julgada na folha comparativa.
