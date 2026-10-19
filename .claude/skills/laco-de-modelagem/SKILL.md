---
name: laco-de-modelagem
description: Conduzir o laço de modelagem de uma peça: despachar o modelador com o plano, medir, despachar o crítico sem a história da construção e registrar cada rodada até fechar ou parar. Use depois do alinhamento. Não use para ajuste pontual de peça pronta.
---

# Conduzir o laço de modelagem

Você orquestra e não opina. Você não escreve receita, não julga forma e não
decide sozinho quando parar. Se você se pegar pensando "isso já está bom", pare:
é esse o pensamento que este laço existe para tirar do caminho.

O laço começa depois da rodada de
[`alinhar-modelagem`](../alinhar-modelagem/SKILL.md). Sem plano, não há o que
cumprir nem contra o que julgar.

Depois de mudar silhueta, encontro, corte, união ou arredondamento, e antes de declarar pronto ou pedir o aceite, faça o passo de
[`PARE-E-ANALISE.md`](../../../docs/mecanifica/usar/PARE-E-ANALISE.md) (`olhar-bancada --analise`) e abra as imagens.


## O processo leve, para objeto de uma família

Medido nos aparelhos de caixa (2026-10-16): uma família que já cobre o objeto, com perfis, torna o laço completo desnecessário. Use o processo leve quando o objeto é um perfil de uma família existente, ou uma família nova de forma simples, de uma caixa com frente (porta, painel, botões, puxador, pés). Não o use quando o objeto exige geometria que nenhuma família tem, quando tem partes que se movem ou quando a pessoa pediu o laço completo.

O processo leve não faz esboço por unidade. Um `modelador` escreve a família e os perfis, o `critico-visual` cego olha uma prancha com os perfis lado a lado em uma ou duas rodadas, e o processo para na terceira rodada sem chegar a 8, como o laço completo. A forma continua sendo aprovada pela pessoa em imagem, com `npm run familia -- aprovar <id>`.

Ao mudar uma faixa ou uma opção da família depois da aprovação, o hash dos pontos extremos muda e a aprovação da pessoa se esvazia. Termine as mudanças de faixa antes de pedir o aceite, e peça o aceite uma vez só, com a prancha final.

O custo medido: a família levou cerca de 294 mil tokens (91 chamadas, 100 mil só de leitura), os ajustes depois da primeira prancha 285 mil, e os três perfis seguintes 184 mil (60 chamadas), contra 400 mil a 1,5 milhão por peça do avião. Quase todo o custo está na primeira família; cada perfil novo custa uma fração.

## Parte por parte

Um objeto de várias partes é construído uma etapa por vez, na ordem de
`etapas` da montagem v5
([`MONTAGENS-SEMANTICAS.md`](../../../docs/mecanifica/usar/MONTAGENS-SEMANTICAS.md)).
Cada etapa é uma parte: ela nasce com o tamanho e a posição que os vínculos e
as posições por porta tiram das partes já fixas, e a junta com elas é medida
quando ela entra. Uma peça de uma parte só é uma etapa só.

Cada etapa despacha um `modelador` NOVO. Ele lê do disco o plano, as partes já
fixas, o registro das rodadas anteriores e a nota que o modelador da etapa
anterior deixou. O estado mora nos arquivos; um agente que atravessa várias
etapas leva para as seguintes o que entendeu errado na primeira.

Ao fim de cada etapa, pare e mostre à pessoa as vistas da parte montada sobre
as já fixas, as medidas da junta e o veredito do crítico. A parte sozinha não
basta: a pessoa não julga a altura de um anel sem vê-lo sobre a base. As vistas
montadas, em ortográfica, saem de
`npm run etapas -- <montagem.json> --olhar` (com `--foco <instância>` o quadro fecha na caixa dela), e entram também
no pacote do crítico, que `vistas:critica` já monta com o quadro na peça. A etapa só fica fixa com o aceite dela, e só
depois disso a próxima começa. Etapa fixa que uma mudança anterior quebrou
volta na frente de todas. O estado e a próxima etapa saem de:

```bash
npm run etapas -- <montagem.json>
npm run etapas -- <montagem.json> --fixar <instância> --por <quem aceitou>
```

O segundo comando recusa fixar fora de ordem, sem o crítico ter fechado a peça
da etapa, sem nota de passagem na última rodada, com junta reprovada ou sem
aceite. Não contorne a recusa: ela é o motivo de o laço não virar bola de
neve.

Uma etapa só passa com defeito em aberto por aceite humano. Quando o laço
para no limite ou sem convergência e a pessoa diz, com as palavras dela, que
aceita a etapa como está, fixe com `--aceite-humano` e ponha em `--por` quem
aceitou. Os defeitos entram no aceite gravado. Nenhum agente usa essa opção por
conta própria, nem por achar o defeito pequeno, e ela é recusada no meio do
laço.

Só a pessoa reabre uma etapa fixa, pelo mesmo critério do aceite humano, com
`npm run etapas -- <montagem.json> --reabrir <instância> --por "<quem, data: motivo>"`.
A etapa volta a aberta e o aceite e a receita que ela tinha ficam em
`reaberturas` no registro. O comando recusa sem `--por` completo, etapa que não
está fixa e etapa que tem posterior fixa ou quebrada; nesse caso reabra da
última para a primeira, cada uma com o motivo dela.

## O ciclo de uma etapa

Pergunte a ação antes de qualquer coisa, sempre:

```bash
node tools/mecanifica/rodada-de-modelagem.mjs <peça> --acao
```

**modelar** — despache o modelador com o plano, os contatos e, da segunda
rodada em diante, só os defeitos em aberto que o comando imprimiu, mais o relatório
da medição quando ela é o motivo. Não mande
sua opinião sobre o que fazer. Nomeie as operações de superfície que o motor
tem quando o realismo combinado pedir: `arredondarAresta` e `filete` quebram
aresta, `liso` sombreia sem faceta (com `angulo`, em graus, deixa nítida a quina mais fechada que ele, como o smooth by angle do Blender), `lathe` faz revolução com perfil. Isso é
dizer o que existe, e não palpite. Peça também, no despacho, o que faltou: é
o `atrito` da rodada.

**O pacote de referência.** Quando o objeto passou pelo mapa de partes e pela
prancha, o modelador e o crítico recebem as mesmas três imagens, nesta ordem:
a imagem de referência, a prancha com as cotas e o mapa de partes
com as folhas de divisa. `npm run objeto -- <objeto>` lista o caminho de cada
uma, e `docs/mecanifica/usar/FLUXO-DO-OBJETO.md` diz por que as três vão ao
crítico sem contar como a peça foi feita.

**revisar** — a ferramenta mediu a receita atual e ela passou. Rode `npm run vistas:critica -- <peça>`, que grava as
imagens e, na pasta da rodada (`tools/bancadas/out/critica-<peça>/`, ou a de `--saida=<pasta>`), o `pedido.md` pronto, tirado
da receita: o texto do despacho do `critico-visual`. Não escreva o pedido à mão, nem copie caminho, promessa de parte ou critério
do `PLANO`; mande o texto do `pedido.md` como está. Ele traz, nesta ordem, o objeto, o alvo, as referências, o modelo (as vistas
da peça sozinha e a malha em arame), as vistas montadas, a sobreposição dos cortes, cada parte com a forma e a técnica que o plano
promete, os critérios de reprovação, as perguntas e o limite de 240 caracteres de `onde`, `evidencia` e `observacao` do veredito
(o registro recusa o mais longo, e o detalhe vai no texto; a regra fica no despacho, e não no agente, que mudado pede a calibração
de novo), com o caminho de todas as imagens e o lado de onde cada vista olha. As perguntas são as da família, quando o `PLANO`
declara `familia` ou `familiaProcedural`, e, quando a receita declara `REFINA.esboco`, a de onde o alvo difere da referência real:
o para-brisa saliente do avião veio do esboço, passou por dois críticos e só a pessoa o viu.

Quando a receita declara `REFINA.esboco`, o alvo é a composta da unidade do esboço, gerada pela ferramenta do esboço no momento,
sobre uma cópia do esboço declarado, e nunca a imagem guardada, que pode ser de uma versão anterior do esboço; a pasta traz também a
sobreposição dos cortes do modelo com os do sólido do esboço, e o relatório do comando diz o desvio máximo de cada corte. A
diferença do esboço vai à pessoa, que decide se a receita a corrige. Quando a peça é instância de `<objeto>/montagem.json`, as
vistas montadas saem com o quadro na caixa da peça e as etapas já construídas em volta: duas vezes o crítico errou por ver a peça
pequena demais no conjunto, e o relatório diz quanto do quadro ela ocupa. Se a peça ainda não está entre as etapas construídas, o
relatório avisa que não há vista montada. Nunca mande a receita, os passos, o histórico nem o que mudou: contar como foi
feito faz revisão virar concordância. Sem alvo não há rodada; busque o alvo e despache de novo, sem inventar nota.

A receita que mudou depois da última rodada volta ao crítico, salvo quando a
malha que ela produz e o `PLANO` são os da cópia que a rodada julgou, como ao
declarar o `REFINA` depois de fechar; a ação diz isso no motivo.

**parar-fechou** encerra a etapa e leva o caso à pessoa. **parar-limite** e
**parar-sem-convergencia** também param e levam o registro à pessoa; não
estenda o limite por conta própria.

## Registrando a rodada

O comando lê direto o que os dois agentes devolveram. O modelador fecha a
resposta com um bloco ```json com `partes`, `atrito` e `notaDePassagem`; o
crítico fecha com o veredito em bloco ```json. Cada arquivo pode ser o texto
colado ou a transcrição JSONL que o harness grava para o agente em segundo
plano, e o comando reconhece o formato sozinho. Dele sai o último bloco ```json
do último texto do assistente:

```bash
node tools/mecanifica/rodada-de-modelagem.mjs <peça> --registrar \
  --modelador <arquivo do modelador> --critico <arquivo do crítico> \
  --atrito "o defeito foi do plano: a referência não mostra a fenda"
```

O veredito entra como o crítico o devolveu, sem passar por mão nenhuma. O
`--atrito` pode repetir e acrescenta o atrito de quem conduz, como a atribuição
do defeito da seção seguinte, depois do que o modelador declarou. Sem `--critico`
a rodada é gravada sem veredito, que é o caso da receita que a medição reprovou.
Quando o arquivo não tem bloco, não é JSON válido ou um campo passa do limite, o
erro diz o arquivo e o campo, e a correção é pedir o bloco de novo ao agente.

Se não houver como obter os arquivos, a alternativa é montar o JSON à mão e
passá-lo como `--registrar <rodada.json>`. Não se misturam as duas formas.

```bash
cat > /tmp/rodada.json <<'JSON'
{
  "partes": [
    { "nome": "base", "confere": true },
    { "nome": "punho", "confere": false, "observacao": "saiu macico; o plano promete rasgo passante" }
  ],
  "veredito": { "alvo": "...", "nota": 6, "defeitos": [], "observacao": "..." },
  "atrito": ["o loft nao fecha tampa propria e o afinamento virou degraus"],
  "notaDePassagem": "folga de 0,2 no furo porque o pino e retificado"
}
JSON
node tools/mecanifica/rodada-de-modelagem.mjs <peça> --registrar /tmp/rodada.json
```

A rodada não fecha sem `partes`; `nota` é número de 0 a 10 e `observacao` não
passa de 240 caracteres. `notaDePassagem` é o porquê das escolhas do
modelador, e a última rodada da etapa precisa dela. A ferramenta grava sozinha
o que a receita mudou desde a rodada anterior, em `receita.diferenca`; é isso
que o modelador da etapa seguinte lê para não repetir tentativa. A medição da
rodada é da ferramenta, que a faz sobre a receita atual e grava o resultado e o
relatório; ela recusa o veredito do crítico quando a medição reprovou, e `medidas`
escritas à mão que a contradigam. Rodada gravada não se reescreve, e o arquivo
cai em `rodadas/` dentro da pasta da peça.

## Antes de corrigir, atribua o defeito

Diga, com a evidência, quem errou: o modelador (o plano dizia e a entrega não
cumpre), o plano (pede o que a referência não mostra, e o conserto é rodada de
alinhamento nova), a skill (a instrução não existe ou não diz qual comando), a
ferramenta (a medida não alcança o defeito ou a imagem não deixava ver), o
crítico (viu e não soube dizer) ou quem conduz (pulou passo).

Depois responda: **o processo teria pego isso sozinho?** Se não, o que falta
vira gate, campo ou instrução antes de a correção ser dada por pronta. Algo que
só foi achado porque a pessoa perguntou a coisa certa é defeito de processo.
Escreva a atribuição e a resposta no `atrito` da rodada.

## O que você nunca faz

- Editar o veredito do crítico.
- Contar ao crítico como a peça foi feita ou o que você espera que ele veja.
- Corrigir a receita você mesmo, mesmo que seja "só um número".
- Mudar o plano para caber no que saiu; plano errado se corrige com a pessoa.
- Fixar etapa sem o aceite da pessoa, ou declarar pronto sem `parar-fechou`.
