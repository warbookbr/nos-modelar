---
name: laco-de-modelagem
description: Conduzir o laço de modelagem de uma peça — despachar o modelador com o plano, rodar as medidas, despachar o crítico sem a história da construção, levar o veredito de volta e registrar cada rodada até fechar ou parar. Use depois da rodada de alinhamento. Não use para ajuste pontual de peça pronta.
---

# Conduzir o laço de modelagem

Você orquestra e não opina. Você não escreve receita, não julga forma e não
decide sozinho quando parar — a decisão sai de `proximaAcao`, com os números da
rodada. Se você se pegar pensando "isso já está bom", pare: é esse o pensamento
que este laço existe para tirar do caminho.

O laço só começa depois que a peça tem plano de modelagem, escrito na rodada de
[`alinhar-modelagem`](../alinhar-modelagem/SKILL.md). Sem plano, não há o que
cumprir nem contra o que julgar.

## O ciclo

Pergunte a ação antes de qualquer coisa, sempre:

```bash
node tools/mecanifica/rodada-de-modelagem.mjs <peça> --acao
```

**modelar** — despache o agente `modelador` com o plano de modelagem, a lista de
contatos e, da segunda rodada em diante, apenas os defeitos em aberto que o
comando imprimiu. Não mande junto a sua opinião sobre o que fazer: o veredito
já diz parte, tipo e sentido, e acrescentar palpite é reintroduzir o autor que
o laço tirou.

**revisar** — despache o agente `critico-visual` com a imagem de referência, as
vistas renderizadas e os critérios de reprovação do plano. Nunca mande a
receita, os passos, o histórico, nem o que mudou desde a rodada anterior. Ele
julga o que vê; contar como foi feito é o que faz revisão virar concordância.

**parar-fechou** — a peça passou nas medidas e o revisor não apontou defeito com
nota suficiente. Encerre e mostre o registro.

**parar-limite** e **parar-sem-convergencia** — encerre e leve o caso à pessoa,
com o registro na mão. Não estenda o limite por conta própria: laço que não
fecha é informação, não obstáculo.

## Entre uma coisa e outra, meça

Depois de cada entrega do modelador, rode as medidas antes de chamar o revisor:

```bash
npm run descrever -- <peça>
npm run guarda:acervo
```

Peça que não cumpre o plano nem os contatos volta direto ao modelador. Gastar
revisão em peça que já falhou no que é contável é desperdiçar rodada e ensinar
que o veredito é decorativo.

## Registrando a rodada

Monte o arquivo da rodada e grave. O veredito é o bloco JSON que o crítico
devolveu, sem edição sua:

```bash
cat > /tmp/rodada.json <<'JSON'
{
  "medidas": { "passou": true, "relatorio": "guarda:acervo ok" },
  "veredito": { "alvo": "...", "nota": 6, "defeitos": [], "observacao": "..." }
}
JSON
node tools/mecanifica/rodada-de-modelagem.mjs <peça> --registrar /tmp/rodada.json
```

Quando as medidas reprovarem, grave com `"veredito": null` e o relatório da
falha. Rodada gravada não se reescreve: o registro é evidência do que aconteceu,
e evidência que muda depois não responde por que a peça ficou assim.

O arquivo cai em `rodadas/` DENTRO da pasta da peça, ao lado da receita que ele
julgou. Quem abre a peça encontra o registro sem saber de cor um caminho em
outra árvore. Peça que ainda é arquivo solto não tem pasta, e aí a rodada cai em
`docs/mecanifica/historico/rodadas/`.

## O que você nunca faz

- Editar o veredito do crítico, "traduzindo" ou suavizando defeito.
- Contar ao crítico como a peça foi construída, ou o que você espera que ele
  veja.
- Corrigir a receita você mesmo, mesmo que seja "só um número".
- Mudar o plano de modelagem para caber no que saiu. Plano errado se corrige com
  a pessoa, em rodada de alinhamento nova, e isso reinicia o registro.
- Declarar pronto sem `parar-fechou`.
