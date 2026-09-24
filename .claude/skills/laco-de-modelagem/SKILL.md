---
name: laco-de-modelagem
description: Conduzir o laço de modelagem de uma peça — despachar o modelador com o plano, rodar as medidas, despachar o crítico sem a história da construção, levar o veredito de volta e registrar cada rodada até fechar ou parar. Use depois da rodada de alinhamento. Não use para ajuste pontual de peça pronta.
---

# Conduzir o laço de modelagem

Você orquestra e não opina. Você não escreve receita, não julga forma e não
decide sozinho quando parar. Se você se pegar pensando "isso já está bom", pare:
é esse o pensamento que este laço existe para tirar do caminho.

O laço começa depois da rodada de
[`alinhar-modelagem`](../alinhar-modelagem/SKILL.md). Sem plano, não há o que
cumprir nem contra o que julgar.

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
`npm run etapas -- <montagem.json> --olhar`, e entram também no pacote do
crítico, junto das de `vistas:critica`. A etapa só fica fixa com o aceite dela, e só
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

## O ciclo de uma etapa

Pergunte a ação antes de qualquer coisa, sempre:

```bash
node tools/mecanifica/rodada-de-modelagem.mjs <peça> --acao
```

**modelar** — despache o modelador com o plano, os contatos e, da segunda
rodada em diante, só os defeitos em aberto que o comando imprimiu. Não mande
sua opinião sobre o que fazer. Nomeie as operações de superfície que o motor
tem quando o realismo combinado pedir: `arredondarAresta` e `filete` quebram
aresta, `liso` sombreia sem faceta (com `angulo`, em graus, deixa nítida a quina mais fechada que ele, como o smooth by angle do Blender), `lathe` faz revolução com perfil. Isso é
dizer o que existe, e não palpite. Peça também, no despacho, o que faltou: é
o `atrito` da rodada.

**Meça antes do crítico:**

```bash
npm run descrever -- <peça>
node tools/mecanifica/conferir-pontos.mjs <peça>
npm run guarda:acervo
npm run guarda:referencial
```

Peça que falha no que é contável volta direto ao modelador; gastar crítico
nela ensina que o veredito é decorativo.

**revisar** — despache o `critico-visual` com a referência, o pacote de
`npm run vistas:critica -- <peça>`, que inclui vistas em arame, e os critérios de reprovação, dizendo a forma
e a técnica que o plano promete para cada parte. Nunca mande a receita, os
passos, o histórico nem o que mudou: contar como foi feito faz revisão virar
concordância. Sem alvo não há rodada; busque o alvo e despache de novo, sem
inventar nota.

**parar-fechou** encerra a etapa e leva o caso à pessoa. **parar-limite** e
**parar-sem-convergencia** também param e levam o registro à pessoa; não
estenda o limite por conta própria.

## Registrando a rodada

O veredito é o JSON que o crítico devolveu, sem edição, e `partes` é a
conferência que o modelador devolveu, uma entrada por parte declarada:

```bash
cat > /tmp/rodada.json <<'JSON'
{
  "medidas": { "passou": true, "relatorio": "guarda:acervo ok" },
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
que o modelador da etapa seguinte lê para não repetir tentativa. Quando as medidas reprovarem, grave com
`"veredito": null` e o relatório da falha. Rodada gravada não se reescreve, e o
arquivo cai em `rodadas/` dentro da pasta da peça.

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
