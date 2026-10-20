# Alvo: caminhao-entrega

## Origem

- Modelo: "delivery" do pacote A, de autor A.
- Autor: autor A.
- Pacote: pacote A, arquivo `delivery.glb` (seis malhas: corpo, porta de trás e quatro rodas).
- Licença: licença livre sem exigência de crédito, declarada no `License.txt` do pacote.
- Página: endereço omitido
- A malha não está no repositório (`importados/veiculos-livres/pacote-a/delivery.glb`, ignorado pelo git). `docs/mecanifica/veiculos-referencias.json` confirma o pacote.
- Referências versionadas: `fonte-vistas.png` e `fonte-partes.json` (em metro, escala 1,765, comprimento de 5,736 m). A frente está em +z e à esquerda na vista lateral, sem giro.
- Sem texto nem marca: só cores e formas.

## Medidas contra a fonte

- Caixa total: x ±1324 mm, y 0 a 2912 mm e z ±2868 mm, iguais à fonte.
- `comparar-silhueta --rigoroso --cabine auto`: fatias em z com média de 1 mm e máxima de 92 mm; fatias em y com média de 2 mm e máxima de 29 mm; cabine com máxima de 36 mm; zero fatias fora de 115 mm.
- Rodas: pneu de 1060 mm de diâmetro e 529 mm de largura, centros em x 795, z 1827 (frente) e -1032 (trás), pé no chão.
- Simetria exata em x. Cores lidas da textura da fonte (as cores da malha vêm de um mapa de cores, sem material por parte).

## O que não ficou igual

- Porta de trás: a fonte guarda a porta como uma folha em dentes de serra de 131 mm de recuo; a receita a faz sólida, com 30 mm de fundo plano e vales alternados em 5 mm (vales colineares geram triângulo sem área na tampa). Sem a alça da porta (placa clara de 354 mm).
- Faróis: placas de 12 mm que cobrem a face da frente e o chanfro do nariz; a fonte tem um calço amarelo rente à face.
- Vão das rodas: o pneu tem 15 mm de folga até a coroa do para-lama (545 mm); na fonte encosta (530 mm). Arcos em 24 lados por volta, como na fonte.
- Cubo: o recesso e o pino do centro seguem os raios medidos nos vértices; o anel intermediário do cubo da fonte não existe.
- Para-choque de trás: chanfros da planta idênticos aos da frente; a face de baixo do baú tem na fonte um chanfro de 52 mm nas quinas de trás, que a receita não tem.
- Cores: aproximadas, tiradas dos vértices e de `fonte-vistas.png`; o verde do baú é um meio-termo entre a lateral e o teto.

## Diferenças por vista (folha aberta)

- Lateral: perfil do capô, para-brisa, cabine, bloco claro do teto, degrau do baú, escotilha e arcos das rodas na mesma posição; a interseção sobre a união é 0,993.
- Frontal: cabine afunila como na fonte, baú mais largo atrás com os cantos de cima chanfrados, retrovisores, faróis e saia chanfrada no mesmo lugar (0,990).
- De cima: baú, escotilha e quadro de trás conferem. A "sobra" de 6,5% que a folha marca em z 861 a 1387 e x ±606 é o bloco claro do teto da cabine, quase branco, que a folha trata como fundo na fonte (sobra falsa).
- Isométrica: mesma leitura; o verde do baú da fonte tem degradê que a receita não tem.

## Duvidoso

- Altura do degrau traseiro do baú (y 706) e profundidade do quadro de trás (177 mm): lidas pelos vértices da fonte, a traseira não aparece nas quatro vistas.
- A silhueta confere pela medida de superfície, que compara só envelopes por fatia. Forma e proporção são de quem aprova.
