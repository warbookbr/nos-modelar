---
name: desenho-por-restricoes
description: Desenha a vista de um objeto sem imagem de referência, por partes, pontos e relações em milímetro que um resolvedor transforma em contorno. Use quando só há a descrição. Não use quando há imagem para traçar (é a contorno-da-imagem).
---

# Desenho por restrições

Você escreve a descrição de uma vista em `<vista>.desenho.json`, e o comando dá a geometria e diz o que está errado. A referência completa do formato é `npm run desenho -- --ajuda`; o README do módulo (`modulos/desenho-por-restricoes/README.md`) tem o exemplo inteiro. Se o brief diz que existe uma imagem escondida do objeto, não abra imagem, contorno nem pasta de peça desse objeto: o que vale é a descrição que a pessoa deu, com as medidas dela. Não invente medida que a descrição não traz; uma medida que você precisa e não tem é pergunta para a pessoa.

## Como escrever

Parta das partes e das medidas da descrição, e escreva relações, não coordenadas.

1. Dê um nome a cada parte (`roda`, `braco`, `cacamba`) e a cada ponto que as define (`C`, `H`). A parte é `circulo`, `barra` (eixo e espessura), `poligono` (os pontos na ordem do contorno) ou `arco`.
2. Ancore o desenho em referências fixas: um chão (`horizontal`, `v`) e, se precisar, um eixo (`vertical`, `h`). Sem âncora o desenho desliza.
3. Escreva uma relação por fato da descrição, cada uma com um nome que diga o fato ("altura do pegador"): `distancia` com `mm`, `raio`, `sobre`, `tangente`, `paralela`, `perpendicular`, `vertical`, `horizontal`, `angulo` com `graus`, `igual`, `coincidente`. É por esse nome que o relatório fala.
4. O chute de cada ponto em `pontos` é só o ponto de partida, em milímetro, h para a direita e v para cima. Ele não precisa estar certo na medida, mas precisa estar do lado certo: ponha o ponto onde ele ficaria numa folha, grosso modo.
5. Declare o `lado` em toda distância de ponto a reta e em toda tangência a reta (`acima`, `abaixo`, `direita`, `esquerda`; acima é o lado de v maior). O resolvedor aceita os dois lados e o chute decide; o `lado` é o que impede a parte de sair espelhada. Entre dois círculos, `por` é `fora` ou `dentro`.
6. Se partes se cobrem, liste `frenteParaFundo` (da que fica à frente para a do fundo); sem a lista, as regiões incluem a sobreposição.

## Como ler o relatório e corrigir

Rode `npm run desenho -- <vista>.desenho.json`. Corrija a relação ou o `lado`, e só mexa no chute quando o relatório disser que o chute escolheu o ramo errado.

- **conflito**: as relações citadas não cabem juntas. Apague uma ou corrija o valor de uma, a que a descrição não sustenta. Não ajuste coordenada para fazer caber.
- **solto**: o relatório diz o grau de liberdade e as partes e os pontos que ainda se movem. Cada grau pede uma relação a mais que os prenda (uma distância, um ângulo, `vertical`, `horizontal`, `sobre` uma referência), tirada da descrição.
- **lado trocado**: a relação, o lado pedido e o lado em que ficou. Ou o chute do ponto está do lado errado (o relatório dá o chute refletido que resolve), ou o `lado` que você escreveu é que está errado; decida pela descrição.
- **resolvido**: lê as medidas derivadas, que você não escreveu (a altura de uma parte, a posição de uma ponta, a caixa da vista), e compara com a descrição. Uma medida derivada que contraria a descrição quer dizer que falta ou sobra uma relação, mesmo com zero grau de liberdade. Aviso de redundância pede que se apague a relação repetida; aviso de sobreposição pede `frenteParaFundo`.

Resolvido, o comando grava `<vista>.contornos.json` e `<vista>.png` (a vista em traço, com os nomes fora do desenho). O contorno é lido pelo esboço (`plano.referencia`) e pela prancha (`npm run contorno:prancha -- <vista>.contornos.json`) como o de uma imagem. A forma é julgada pelo crítico e pela pessoa: o relatório mostra que as relações valem, e não que o objeto se parece com o que se descreveu.
