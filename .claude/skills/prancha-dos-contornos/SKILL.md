---
name: prancha-dos-contornos
description: Faz a prancha de uma vista (lateral, topo ou frontal) pelos contornos do mapa de partes, com desenhista de cotas e crítico. Use depois do mapa, antes da modelagem. Não use para carroceria por medida declarada (é a desenhar-prancha).
---

# Prancha dos contornos

Você conduz e não desenha. Quem escolhe é o agente `desenhista-de-prancha`, e
quem julga é o `critico-visual`. O comando é `npm run contorno:prancha`, e a
etapa faz parte do fluxo descrito em `docs/mecanifica/usar/FLUXO-DO-OBJETO.md`.

A prancha só começa com o mapa de partes fechado (`npm run objeto -- <objeto>`
mostra). Ela sai inteira dos contornos, e o que o agente decide é o que o
comando não sabe: as cotas de cada parte, a conferência da calibração e o que
a imagem esconde. Sem esse trabalho o crítico aprovaria uma cópia do contorno.

## O ciclo

A prancha é de uma vista só, a da imagem: `lateral` (padrão, a do braço),
`topo` ou `frontal`. A vista vem de `"vista"` em `<imagem>.prancha.json`, que
o desenhista escreve junto com as cotas, e dá o rótulo e o título da prancha
e o nome do que cada sentido da imagem mede. Nas escolhas, `largura` é sempre
o sentido horizontal da imagem e `altura` o vertical; na lateral a horizontal
é o comprimento e a vertical a altura, no topo a horizontal é a largura e a
vertical o comprimento, e na frontal são largura e altura. As cotas gerais e o
roteiro do crítico falam nessas palavras, então numa prancha de topo a cota
`altura` do arquivo sai escrita comprimento. Imagem chamada `topo` ou
`frontal` sem `"vista"` no arquivo não gera prancha: o comando sai com código
2 pedindo a vista, para a de topo não sair rotulada como lateral.

Pergunte a ação, sempre:

```bash
npm run contorno:prancha -- <imagem>.contornos.json --acao
```

**desenhar** — despache o `desenhista-de-prancha` com o caminho dos
contornos, o alinhamento do objeto e, da segunda rodada em diante, só os
defeitos do tipo `cota` que o comando imprimiu. Defeito de forma de contorno
(`superficie`, `comprimento` e os outros tipos de geometria) apontado na
prancha não vai ao desenhista: leve-o ao mapa de partes (skill
`contorno-da-imagem`), porque o contorno vem de lá, e refaça a prancha depois.
Os nomes das partes ficam em duas colunas fora da silhueta; medida escondida
nesta vista vem de outra imagem de referência com contornos (`origem`), e
nota de texto sem número sai na lista de FALTA. O desenhista declara a posição de cada cota
e de cada nome em `<imagem>.prancha.json`, usa `medivel: false` com motivo
onde uma parte esconde a outra e confere em recorte ampliado a região de cada
cota. Não aceite a devolução se `npm run contorno:prancha` sair com código
diferente de zero: ele sai com 3 enquanto houver texto sobreposto ou cruzado
por linha que não é a dele, número sobre contorno de parte, chamadas coladas
ou quase paralelas juntas, cota que invade outra parte ou sai da sua sobre
outro contorno, marca de nome na borda da parte e chamada que atravessa outra
parte tendo saída livre, e o crítico não recebe prancha com colisão. Chamada
de parte cercada dos dois lados sai como aviso. Cota com `origem` cuja
medida discorda desta vista além de 3% ou 5 mm, ou cuja linha sairia da
parte, é recusada com código 1 antes de desenhar; o desenhista escolhe outro
`em`, declara `de` ou passa a `medivel: false`. Quando a pessoa decidiu qual
vista vale para aquela medida, a cota leva `prevalece: "<motivo>"` citando a
decisão; aí ela é aceita, sai externa com o número da origem e a marca
"(<vista>, prevalece)", e o relatório imprime uma linha PREVALECE com as duas
medidas e o motivo. Motivo vazio é recusado, e sem decisão da pessoa o campo
não entra.

A cota cuja linha cai toda fora da parte, a pelo menos 6 px da medida (lado
`acima`, `abaixo`, `direita`, `esquerda` ou `afasta`), é externa e ganha as
linhas de extensão, que descem das duas pontas da medida até a linha da cota,
como no desenho técnico. Elas contam como colisão quando atravessam parte
alheia (a parte que contém a da cota não conta), quando cruzam a chamada de
outra parte ou o número de outra cota. A extensão da largura e a da altura da
mesma parte se cruzam sem colisão. Parte numa fenda de outra, em que o contorno
da outra a envolve em 90% das direções ou mais, como a deriva na planta do
avião, conta como contida para a regra de cota sobre outra parte. A cota de
altura que não cabe na silhueta, como o comprimento da fuselagem na planta,
leva `"alemDosNomes": true` (e `"lado": "esquerda"` se for o caso, direita por
padrão): a linha vai para além do texto mais largo da coluna de nomes daquele
lado, onde nenhuma chamada passa, uma faixa de 28 px por cota. Vale só para
altura e não se combina com `afasta`. Se a imagem tem silhueta em vários
pedaços (a parte fora do modelo a corta), as cotas gerais medem a união deles.
As cotas gerais também ganham as linhas de extensão, dos cantos da caixa da
silhueta até a linha da cota; a silhueta não é parte alheia para elas, e elas
cruzam linha de cota e extensão de outra cota (a além dos nomes que passa do
fim da silhueta) sem colisão, mas colidem com chamada, número e parte.
`"rotulo": "por janela"` numa cota escreve o texto depois do número, no
desenho e no roteiro do crítico, para a parte que é um conjunto de pedaços
(as 8 janelas) dizer que o número é de um só; conta na colisão do texto, e é
recusado vazio ou em cota `medivel: false`.

Toda parte da prancha declara as duas cotas, largura e altura, e cada uma
fica medida nesta vista, vinda de outra vista por `origem` (com ou sem
`prevalece`) ou `medivel: false` com motivo. Faltando alguma, o comando para
antes de desenhar com código 4 e lista as faltas por parte (`FALTA COTA
<parte>: largura e altura`). O roteiro do crítico abre cada etapa com as duas
cotas esperadas e o estado de cada uma; o crítico cobra essas duas e não
outras, e o desenhista trabalha pela mesma lista. A prancha se faz só das
imagens de papel `principal` em `papeis.json` da pasta `referencias/`; imagem de `apoio`
tem só mapa de partes e entra aqui por `origem`, e imagem `substituida` não
entra.

**Crítico.** Despache o `critico-visual` com a imagem de referência como alvo,
`<imagem>.prancha.png` como modelo e o roteiro
`<imagem>.prancha.pacote/roteiro.md`, que o comando grava a cada prancha e
tem uma etapa por parte: as duas medidas da vista (na lateral comprimento e altura, no topo largura e comprimento), nome e linhas livres. Pergunte se a silhueta e cada parte da
prancha seguem a imagem, se as cotas estão nas partes que o modelador precisa
e se alguma medida contradiz o alinhamento. Nunca mande as escolhas do agente
nem o que mudou.

**Registre** o veredito sem editar:

```bash
npm run contorno:prancha -- <imagem>.contornos.json --registrar=<veredito.json>
```

Nota 9 ou mais fecha. Abaixo disso volta ao agente, até três rodadas; depois
a decisão é da pessoa, e nenhum agente estende o limite. Se a pessoa decidir
tentar de novo, arquive a série com `--nova-serie --por=<quem decidiu>`.

Quando a pessoa decidir aceitar a série com defeito em aberto, ou registrar o
que ela reabriu numa série que já fechou com nota 9, grave o aceite com
`npm run contorno:prancha -- <imagem>.contornos.json --aceite-humano --por="<quem, data: motivo>" --pendencias="<texto>"`.
O aceite vai para `aceite.json` na pasta de rodadas, com quem, quando, a
última nota, os defeitos em aberto do último veredito e as pendências, e a
ação passa a ser fechou com motivo aceite humano. A ferramenta recusa aceite
sem `--por` ou sem rodada registrada, e `--nova-serie` arquiva o aceite junto
com as rodadas. Nenhum agente usa `--aceite-humano` por conta própria; só com
o aceite dito pela pessoa, com as palavras dela em `--por`.
