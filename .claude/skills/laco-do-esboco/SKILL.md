---
name: laco-do-esboco
description: Conduzir o laço do esboço detalhado de um ou mais objetos — despachar um esbocista por objeto, despachar o crítico visual cego a cada parada num --feito com brief, devolver nota e motivo ao mesmo esbocista, registrar o veredito, refazer a unidade abaixo de 8 até três rodadas e medir no fim. Use quando a sessão principal orquestra o esboço detalhado. Não use para esboçar à mão nem para mostrar opções de forma à pessoa.
---

# Conduzir o laço do esboço

Você orquestra e não modela. Você não escreve o JSON do esboço, não pontua a
unidade no lugar do crítico e não decide sozinho que uma unidade está boa. Se
você se pegar pensando "essa nota está certa, não preciso abrir a imagem", pare.

O fluxo do esboço, as ferramentas e o formato estão na skill
[`esboco-detalhado`](../esboco-detalhado/SKILL.md), que o `esbocista` lê. Aqui
está só o que a sessão principal faz em volta dele.

## Despachar o esbocista

Despache um agente `esbocista` por objeto, e objetos diferentes em paralelo. O
brief é mínimo: o objeto, o nível de detalhe (`esquematico`, `medio` ou
`detalhado`), a pasta onde gravar e, se houver, a anatomia prévia do objeto
(partes e como se ligam). Não cite defeitos que você espera ou que já viu em
outro esboço: o esbocista passa a corrigi-los de antemão e o crítico deixa de
medir o que o esboço faz sozinho.

## A cada parada num --feito com brief

O esbocista não despacha agente, então para em cada `--feito` que imprime brief
e devolve o caminho do brief e das imagens. Então:

1. Abra você mesmo as imagens da unidade e leia o texto de `--ligacoes` que o
   brief traz, antes de despachar o crítico.
2. Despache o `critico-visual` cego só com o brief e as imagens. Não mande o
   JSON, o plano, o histórico nem o que você viu.
3. Devolva a nota e o motivo ao mesmo esbocista por `SendMessage`, que o retoma
   com o contexto que tem; não crie outro esbocista para a mesma unidade.
4. Registre com `npm run esboco -- --condutor <arquivo> --veredito <unidade> --nota <0-10> --motivo <texto do crítico>`.
5. Nota abaixo de 8 volta ao esbocista para refazer a unidade, e a nova versão
   passa por `--feito` e por crítico de novo. Depois de três rodadas na mesma
   unidade sem chegar a 8, pare e leve o registro (`--condutor --historico`) à
   pessoa; não estenda o limite.

O Marco (25, 50, 75 e 100% do custo) segue do mesmo jeito, com o brief do Marco
e o veredito `marco-<N>`, e a mesma regra de três rodadas.

Antes de aceitar uma nota alta, abra as imagens e confira que a unidade não tem
ponta no ar, peça atravessada ou parte sem ligação. Nota alta sobre imagem que
você não viu é a nota decorativa que este laço existe para evitar. Se discordar
da nota, não a edite: devolva ao crítico a imagem que o faz rever e registre a
nova.

## Ao fim

Meça, com números, e não por impressão: quantas formas ficaram por relação e
quantas por coordenada absoluta, quantas chamadas de ferramenta o esbocista
fez, quantas imagens foram abertas e quantos contornos foram registrados.
Reproduza cada atrito que o esbocista relatou em `ATRITOS.md`, com o comando
dele, antes de tratá-lo como bug do módulo; o que não reproduz volta ao
esbocista com a pergunta. Diga a cada achado se o processo o teria pego sozinho
e, quando não, o que falta vira gate, campo ou instrução.

## O que você nunca faz

- Modelar, editar o JSON do esboço ou corrigir "só um número".
- Dar a nota no lugar do crítico ou editar o veredito dele.
- Contar ao crítico como o esboço foi feito ou o que ele deveria ver.
- Seguir para a unidade seguinte sem a nota registrada da anterior.
- Mudar o código do módulo para fazer o esboço passar.
