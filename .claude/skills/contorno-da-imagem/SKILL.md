---
name: contorno-da-imagem
description: Mapear as partes de uma imagem de referência por watershed com sementes nomeadas, gerar o mapa de partes e tirar o contorno de cada uma em milímetro, com um desenhador que põe as sementes e um crítico que dá nota, até três rodadas. Use quando uma referência precisar de contorno por parte para prancha ou conferência. Não use para modelar a peça.
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
