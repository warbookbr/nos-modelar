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

## O ciclo de uma etapa

Pergunte a ação antes de qualquer coisa, sempre:

```bash
node tools/modelar/rodada-de-modelagem.mjs <peça> --acao
```

**modelar** — despache o modelador com o plano, os contatos e, da segunda
rodada em diante, só os defeitos em aberto que o comando imprimiu, mais o relatório
da medição quando ela é o motivo. Não mande
sua opinião sobre o que fazer. Nomeie as operações de superfície que o motor
tem quando o realismo combinado pedir: `arredondarAresta` e `filete` quebram
aresta, `liso` sombreia sem faceta (com `angulo`, em graus, deixa nítida a quina mais fechada que ele, como o smooth by angle do Blender), `lathe` faz revolução com perfil. Isso é
dizer o que existe, e não palpite. Peça também, no despacho, o que faltou: é
o `atrito` da rodada.

**revisar** — a ferramenta mediu a receita atual e ela passou. Rode `npm run vistas:critica -- <peça>`, que mede a receita antes de capturar e recusa a que reprova, e grava as imagens e, na pasta da rodada
(`tools/bancadas/out/critica-<peça>/rodada-NN/`), o `pedido.md` pronto, tirado da receita: o texto do despacho do
`critico-visual`. Não escreva o pedido à mão, nem copie caminho, promessa de parte ou critério do `PLANO`; mande o texto do
`pedido.md` como está. Não mande o que mudou, porque contar como foi feito faz revisão virar concordância. Sem alvo não há
rodada; busque o alvo e despache de novo, sem inventar nota. O que o crítico recebe e não recebe, o veredito e o limite de
rodadas estão em [O laço do crítico](../../../docs/modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md#o-laço-do-crítico).

A receita que mudou depois da última rodada volta ao crítico, salvo quando a
malha que ela produz e o `PLANO` são os da cópia que a rodada julgou, como ao
declarar o `REFINA` depois de fechar; a ação diz isso no motivo.

**parar-fechou** encerra a etapa e leva o caso à pessoa. **parar-limite** e
**parar-sem-convergencia** também param e levam o registro à pessoa; não
estenda o limite por conta própria. Quando a pessoa manda seguir, a decisão
entra no arquivo `limite.json` da pasta de rodadas da peça, com `por` no formato `"quem, AAAA-MM-DD: as
palavras dela"` e `motivo`: `"limite"` é um inteiro maior que 6 ou `"sem"` (sem
limite), e `"convergenciaDesde"` é o número do registro a partir do qual a
convergência volta a contar depois de uma parada sem convergência, no máximo o
do próximo registro a gravar. A ação que segue por essa decisão diz isso no
motivo, com o `por`.

Depois de mudar silhueta, encontro, corte, união ou arredondamento, e antes de dar por pronto, faça o passo de
[`PARE-E-ANALISE.md`](../../../docs/modelar/usar/PARE-E-ANALISE.md) (`npm run bancada -- <peça> --analise`) e abra as imagens.

### Mostrar à pessoa e gravar a decisão dela

Depois de registrar a rodada e de mostrar a peça à pessoa, a decisão dela sobre a rodada se grava com as palavras dela, e
só quando ela pede explicitamente que se grave:

```bash
node tools/modelar/rodada-de-modelagem.mjs <peça> --decisao-da-pessoa "<quem decidiu>, <AAAA-MM-DD>: <as palavras dela>" --rodada <n>
```

O comando grava no arquivo `decisoes-da-pessoa.json` da pasta de rodadas da peça, sem mexer no registro da rodada, e o `--acao`
passa a listar a decisão de cada rodada. A data é a do dia em que ela decidiu, e `--substituir` troca uma decisão já gravada
quando ela a muda. Nenhum agente grava por conta própria, nem resume, traduz ou completa o que ela disse: sem o pedido dela e
sem as palavras dela, a rodada fica sem decisão gravada.

## Quando ler os arquivos de apoio

O corpo cobre a rodada comum de uma peça. Cada caso abaixo tem um arquivo nesta pasta, e a regra dele só está lá.

- [`processo-leve.md`](processo-leve.md): leia antes de começar quando o objeto for um perfil de uma família existente ou
  uma família nova de caixa com frente, porque nesse caso o laço por unidade não se usa.
- [`parte-por-parte.md`](parte-por-parte.md): leia quando o objeto tiver mais de uma parte, antes da primeira etapa e antes
  de fixar, reabrir ou aceitar com defeito uma etapa pelo `npm run etapas`; traz também a vista isolada da parte em trabalho e o `--aceite-humano`, que nenhum agente usa por conta própria.
- [`pacote-e-referencia.md`](pacote-e-referencia.md): leia antes de despachar o modelador ou o crítico quando a peça tiver
  imagem de referência, prancha ou mapa de partes, lataria, sombreamento suave sobre emenda de fusão, junta de tubos
  soldada, `REFINA.esboco` ou lugar numa montagem, e quando precisar do conteúdo do pacote, da comparação de duas rodadas
  ou de trazer foto de terceiro ao pedido.
- [`refino.md`](refino.md): leia quando a entrega passou na medição e começa a rodada de refino, antes de despachar o
  refinador: as zonas certas, a conferência entre candidatas e o que fazer com zona mexida.
- [`registro-a-mao.md`](registro-a-mao.md): leia só quando não houver como obter os arquivos dos agentes para o registro.

## Registrando a rodada

O comando lê direto o que os dois agentes devolveram. O modelador fecha a
resposta com um bloco ```json com `partes`, `atrito` e `notaDePassagem`; o
crítico fecha com o veredito em bloco ```json. Cada arquivo pode ser o texto
colado ou a transcrição JSONL que o harness grava para o agente em segundo
plano, e o comando reconhece o formato sozinho. Dele sai o último bloco ```json
do último texto do assistente; no relato de várias peças, o bloco precedido de
uma linha só com o nome da peça que se registra:

```bash
node tools/modelar/rodada-de-modelagem.mjs <peça> --registrar \
  --modelador <arquivo do modelador> --critico <arquivo do crítico> \
  --atrito "o defeito foi do plano: a referência não mostra a fenda"
```

O veredito entra como o crítico o devolveu, sem passar por mão nenhuma. O
`--atrito` pode repetir e acrescenta o atrito de quem conduz, como a atribuição
do defeito da seção seguinte, depois do que o modelador declarou. Sem `--critico`
a rodada é gravada sem veredito, que é o caso da receita que a medição reprovou.
Quando o arquivo não tem bloco, não é JSON válido ou um campo passa do limite, o
erro diz o arquivo e o campo, e a correção é pedir o bloco de novo ao agente.

A rodada guarda em `pontos` o esperado resolvido de cada ponto de `PONTOS`. Todo
esperado que mudou desde a última rodada que o gravou, e todo ponto que saiu, só
se registra com `--motivo-dos-pontos "<quem decidiu>, <AAAA-MM-DD>: <por quê>"`,
venha a mudança de `PONTOS` reescrito ou de outro dado da receita, como a
TABELA; a recusa diz de onde veio. `--acao` avisa antes do registro.

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
- Gravar a decisão da pessoa sem pedido explícito dela, ou com palavras que não são as dela.
