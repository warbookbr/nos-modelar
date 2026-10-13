---
name: contorno-da-imagem
description: Mapeia as partes de uma referência por watershed com sementes nomeadas e tira o contorno de cada uma em milímetro, com desenhador e crítico. Use quando a referência pedir contorno por parte para prancha ou conferência. Não use para modelar a peça.
---

# Contorno da imagem

Você conduz e não desenha. Quem põe as sementes é o agente
`desenhador-de-contorno`, e quem julga é o `critico-visual`, que não sabe como
as sementes foram postas. O módulo é `modulos/contorno-da-imagem`, e a porta
de linha de comando é `npm run contorno`.

## Antes da primeira rodada

O arquivo de regiões fica ao lado da imagem, como
`referencias/<imagem>.regioes.json`, com duas âncoras que levam pixel a
milímetro (o mesmo formato do `conferir:referencia`), o limiar do fundo e o
nome de cada parte. A lista das partes e uma frase sobre cada uma vêm do
alinhamento da peça. A regra que vale para todos: a região é o que aparece, e
parte escondida atrás de outra fica só com o pedaço visível.

O arquivo de regiões aceita `"realce": true`, que realça contraste local e
nitidez só para o watershed; a silhueta e as medidas ficam na imagem original.
Use quando a divisa entre partes do mesmo cinza exigir muitas sementes: na
lateral do braço, com uma semente por parte, o realce levou o ombro e o anel
da cintura de cerca de 62% para 90% de concordância com o contorno aprovado.
O ajuste é sensível, e ligar ou não o realce é decisão que o crítico julga
pelo resultado.

A silhueta fecha os buracos de fundo cercados por ela até 64 px², o reflexo
claro logo abaixo da linha do topo da fuselagem do avião (19 x 2 px) que o
limiar deixava sem dono; o vão de verdade, como a janela vazada ou o espaço entre
as pás, passa de 64 px² e continua fundo. `"buracoMaximo": <px²>` muda o limite
e 0 desliga, e o comando imprime quantos buracos fechou. A parte listada em
`foraDoModelo` sai da silhueta e pode cortá-la, como o corpo escuro sobre a asa
na frontal do avião: a silhueta guarda então todos os pedaços acima de 9 px² em
`silhueta.pedacos` (o maior primeiro, e `contornoMm` continua sendo o dele), e
a prancha e a conferência do esboço medem a união.

A borda da silhueta sai lisa e as partes chegam até ela. Antes do watershed, a
abertura e o fechamento 3 x 3 tiram da máscara os dentes e as reentrâncias de até
9 px² (`"denteMaximo": <px²>`, 0 desliga); o fio fino de verdade, como o chão da
lateral do avião, e o pixel da semente ficam. Depois do watershed, o pixel da
silhueta que nenhuma parte pegou, o halo claro e a divisa escura contra o fundo,
passa à parte vizinha mais próxima até 4 px dela (`"alcanceSemDono": <px>`, 0
desliga), sem atravessar a divisa que separa duas partes nem a de uma parte em
`foraDoModelo`, e sem dar parte ao que nenhuma semente alcança. `medidas.json`
traz `semDonoPx` (o que sobrou) e `semDonoAnexadosPx` (o que passou às partes). A
divisa de 1 px entre duas partes vizinhas é de ninguém na máscara (`rotulos`, as
pinturas e os recortes), e no contorno de máscara (`"bordaSubpixel": false`) os
contornos das duas ficam a 2 px um do outro, de modo que uma soma de larguras de
partes encostadas fica abaixo da silhueta por esse vão. O contorno subpixel, que é
o padrão (próxima seção), não tem esse vão.

## A linha de cada borda

A linha de cada parte e a da silhueta passam pelo meio-tom da imagem, dentro do
pixel, e não pelo contorno da máscara de pixel, que dava um degrau de 1 px em toda
borda inclinada e deixava amassadas as peças de poucos pixels (hélice, cone,
escapes, janelas, moldura do para-brisa). A partição em partes continua a do
watershed, e muda só por onde passa a linha de cada borda. Na vizinhança da borda
da silhueta (3 px da máscara) o tom de cada pixel diz onde a borda o cruza: a linha
segue o ponto a meio caminho entre o tom do fundo e o traço mais escuro em 5 x 5
pixels em volta. O tom do fundo é a mediana do cinza fora da silhueta, ou o
`"fundo": <0 a 255>` do arquivo de regiões. Onde a borda é divisa entre duas partes
as duas usam a mesma linha, uma de frente e a outra de trás, e não sobra buraco nem
sobreposição: a divisa cai no meio da linha de 1 px do watershed. A linha é
simplificada a `"toleranciaDoTraco"` (0,35 px por padrão) da borda subpixel, e a
silhueta (`contornoMm`, `linhaDeForaMm`) sai das mesmas linhas das partes.

As coordenadas ficam fracionárias, com o centro do pixel (x, y) no ponto (x, y): um
retângulo de pixels de x = 10 a 109 sai de 9,5 a 109,5. A área da parte é a de
verdade, maior que a do contorno de pixel de borda por meio perímetro, e o pedaço
de parte abaixo de 8 px² sai, salvo o maior. Os limites da borda subpixel são
três. Uma linha escura de 1 px de largura deixa a borda até 0,4 px para fora, porque
o traço se reparte em dois pixels. Perto da junção de três regiões a divisa pode
sair até 0,6 px da posição real, em um raio de uns 3 px. Uma parte clara sem traço
escuro na borda, com uma linha escura a menos de 2 px dentro dela, pode ter a borda
puxada para a linha. `medidas.json` traz `traco`, com o tom do fundo e a tolerância.

`"bordaSubpixel": false` volta ao contorno da máscara de pixel, em inteiros, que é o
do braço robótico, de cotas aprovadas. Regerado o contorno de uma imagem que já tem
prancha, as bordas andam até um pixel e o comando da prancha recusa a cota por dois
pontos que ficou a mais de um pixel da borda: aponte os pontos para o contorno novo.

## A forma declarada

O desenhador de contorno entende a referência e pode declarar, em
`<imagem>.regioes.json`, a forma de um trecho da borda de uma parte:

```json
"formas": { "asaEsq": [ { "nome": "bordo de ataque", "de": [104, 152], "ate": [200, 147.7], "forma": "reta" } ] },
"toleranciaDaForma": 1.5
```

`de` e `ate` são dois pontos da borda da parte, em pixel da imagem, como as
sementes (a ferramenta recusa o que fica a mais de 3 px da borda), e o trecho é o
arco mais curto do contorno entre eles. `forma` é `reta`, `curva` (arco ou spline
cúbica) ou `detalhe`, que mantém a borda como a imagem dá e é o que vale sem
declaração. A ferramenta ajusta a reta ou a curva nos pontos da borda subpixel do
trecho. Se a imagem se afasta do declarado mais que a tolerância (1,5 px por
padrão), nada é ajustado e o comando avisa, na saída e em `medidas.json`, o
trecho, a parte e o desvio em pixel e em milímetro, para o desenhador conferir se
aquilo é detalhe, como o volume escuro na frente da asa esquerda do avião, e
trocar a declaração por `detalhe` ou corrigir os pontos. Subir a tolerância para
calar o aviso esconde o detalhe. A junção com uma terceira região no meio do
trecho vai para a reta ou a curva, e as duas partes de uma divisa seguem juntas,
de modo que cada divisa se declara uma vez só. O que foi ajustado e o que foi
avisado também fica em `<imagem>.contornos.json`, em `formas`. O crítico não
recebe a declaração e continua sem saber como a linha foi traçada. Com
`"bordaSubpixel": false` não há borda subpixel e a declaração é recusada.

Quando o objeto tem mais de uma imagem, declare o papel de cada uma em
`papeis.json` da pasta `referencias/` (`{ "imagens": { "<imagem>": { "papel": ..., "motivo": ..., "por": ... } } }`):
`principal` passa por mapa e prancha, `apoio` passa só pelo mapa e dá medidas
à prancha principal por `origem`, e `substituida` sai das etapas com `por`
(a imagem que a substitui) e `motivo`. Apoio e substituída exigem motivo.
Sem o arquivo, toda imagem com regiões é principal.

## O ciclo

Pergunte a ação, sempre:

```bash
npm run contorno -- --regioes=<regioes.json> --acao
```

**desenhar** — despache o `desenhador-de-contorno` com a imagem, as partes e,
da segunda rodada em diante, só os defeitos que o comando imprimiu.

**Meça antes do crítico.** Rode
`npm run contorno -- <imagem> --regioes=<json>`, que grava o pacote em `<nome>.pacote` ao lado da imagem (`lateral.png` dá `lateral.pacote`), onde `npm run objeto` o procura. Parte
listada abaixo do mínimo na borda volta ao desenhador sem passar pelo crítico.

**Crítico.** Despache o `critico-visual` sempre pelo roteiro: mande o caminho
de `roteiro.md` do pacote e peça que ele siga as etapas na ordem. O roteiro
tem uma etapa de visão geral, com o alvo e o mapa de partes, uma etapa para
cada folha de divisas e o fechamento. Cada folha leva os recortes no tamanho em
que foram gerados. Com até seis divisas, cada divisa tem uma etapa só dela,
porque o crítico olha melhor uma coisa de cada vez; com mais, elas se
agrupam para o roteiro ficar perto de seis etapas, com no máximo seis
recortes por folha. Cada linha da folha mostra o original, a pintura e a imagem
inteira em miniatura com a divisa marcada. Junto do roteiro vão a lista das
partes, a regra do que aparece e os critérios: região que pega outra parte
ou o fundo, parte com pedaço sem cor, divisa fora do lugar onde a imagem
mostra a divisa. O roteiro existe porque o crítico só lê arquivo e não
lista pasta: na lateral do braço ele abriu 2 e depois 9 de 19 recortes
soltos, e numa folha única de 19 o zoom caía à metade. Foi num recorte
ampliado que apareceu o defeito que três críticos olhando a imagem inteira
não viram. Nunca mande as sementes nem o que mudou.

**Registre** o veredito sem editar:

```bash
npm run contorno -- --regioes=<regioes.json> --registrar=<veredito.json>
```

Nota 9 ou mais fecha. Abaixo disso a ação volta a ser **desenhar**, até três
rodadas. Depois da terceira sem nota 9 a ação é **humano**: mostre à pessoa o
mapa de partes, os recortes e os defeitos em aberto, e ela decide. Nenhum
agente estende o limite nem aceita defeito por conta própria. Se a pessoa decidir
corrigir a ferramenta e tentar de novo, arquive a série com
`npm run contorno -- --regioes=<json> --nova-serie --por=<quem decidiu>`.

Quando a pessoa decidir aceitar a série com defeito em aberto, ou registrar o
que ela reabriu numa série que já fechou com nota 9, grave o aceite com
`npm run contorno -- --regioes=<json> --aceite-humano --por="<quem, data: motivo>" --pendencias="<texto>"`.
O aceite vai para `aceite.json` na pasta de rodadas, com quem, quando, a
última nota, os defeitos em aberto do último veredito e as pendências, e a
ação passa a ser fechou com motivo aceite humano. A ferramenta recusa aceite
sem `--por` ou sem rodada registrada, e `--nova-serie` arquiva o aceite junto
com as rodadas. Nenhum agente usa `--aceite-humano` por conta própria; só com
o aceite dito pela pessoa, com as palavras dela em `--por`.

## Ao fechar

O contorno em milímetro fica em `<imagem>.contornos.json`, e o mapa de partes
(`<imagem>.pacote/mapa-de-partes.png`, cada parte pintada a 20% por cima da
imagem, com número e nome) vai à pessoa junto com a nota.
