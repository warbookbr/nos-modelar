---
name: prancha-dos-contornos
description: Fazer a prancha lateral de um objeto a partir dos contornos que o mapa de partes tirou da imagem, com o desenhista de prancha escolhendo as cotas e um crítico dando nota, até três rodadas. Use depois de mapear as partes da imagem, antes da modelagem. Não use para prancha de carroceria desenhada por medida declarada; essa é a skill desenhar-prancha.
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
`em`, declara `de` ou passa a `medivel: false`.

**Crítico.** Despache o `critico-visual` com a imagem de referência como alvo,
`<imagem>.prancha.png` como modelo e o roteiro
`<imagem>.prancha.pacote/roteiro.md`, que o comando grava a cada prancha e
tem uma etapa por parte: largura, altura, nome e linhas livres. Pergunte se a silhueta e cada parte da
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
