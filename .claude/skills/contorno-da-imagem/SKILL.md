---
name: contorno-da-imagem
description: Separar as partes de uma imagem de referência por watershed com sementes nomeadas e tirar o contorno de cada uma em milímetro, com um desenhador que põe as sementes e um crítico que dá nota, até três rodadas. Use quando uma referência precisar de contorno por parte para prancha ou conferência. Não use para modelar a peça.
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

## O ciclo

Pergunte a ação, sempre:

```bash
npm run contorno -- --regioes=<regioes.json> --acao
```

**desenhar** — despache o `desenhador-de-contorno` com a imagem, as partes e,
da segunda rodada em diante, só os defeitos que o comando imprimiu.

**Meça antes do crítico.** Rode
`npm run contorno -- <imagem> --regioes=<json> --pacote=<pasta>`. Parte
listada abaixo do mínimo na borda volta ao desenhador sem passar pelo crítico.

**Crítico.** Despache o `critico-visual` com a imagem original como alvo, a
`sobreposicao.png` e todos os recortes de `divisas/`, a lista das partes, a
regra do que aparece e os critérios: região que pega outra parte ou o fundo,
parte com pedaço sem cor, divisa fora do lugar onde a imagem mostra a
separação. Peça atenção aos recortes: cada um mostra o original à esquerda e a
pintura à direita, ampliados, e foi num recorte assim que apareceu o defeito
que três críticos olhando a imagem inteira não viram. Mande o caminho de cada
recorte, um por linha, tirado de `medidas.json`: o crítico só lê arquivo e não
lista pasta, e na primeira rodada da lateral do braço ele abriu dois recortes
de dezenove porque recebeu só o nome da pasta. Nunca mande as sementes nem o
que mudou.

**Registre** o veredito sem editar:

```bash
npm run contorno -- --regioes=<regioes.json> --registrar=<veredito.json>
```

Nota 9 ou mais fecha. Abaixo disso a ação volta a ser **desenhar**, até três
rodadas. Depois da terceira sem nota 9 a ação é **humano**: mostre à pessoa a
sobreposição, os recortes e os defeitos em aberto, e ela decide. Nenhum
agente estende o limite nem aceita defeito por conta própria.

## Ao fechar

O contorno em milímetro fica em `<imagem>.contornos.json`, e a sobreposição
com opacidade de 20% vai à pessoa junto com a nota.
