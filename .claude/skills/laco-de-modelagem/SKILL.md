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

Nomeie no despacho as operações de superfície que o motor tem, quando o grau de
realismo combinado no plano as pedir: `arredondarAresta` e `filete` quebram
aresta viva, `liso` sombreia sem faceta, `lathe` faz volume de revolução com
perfil. Isso não é palpite sobre forma, é dizer o que existe. Uma peça desta
casa saiu com aparência de caixa usando `cilindro` nove vezes e `chamferBox`
uma, com as seis operações acima disponíveis e nenhuma citada em lugar nenhum
que o modelador leia.

**revisar** — despache o agente `critico-visual` com a imagem de referência, as
vistas renderizadas e os critérios de reprovação do plano. Nunca mande a
receita, os passos, o histórico, nem o que mudou desde a rodada anterior. Ele
julga o que vê; contar como foi feito é o que faz revisão virar concordância.

As vistas saem de um comando só, e é este:

```bash
npm run vistas:critica -- <peça>
```

Ele devolve as quatro vistas ortográficas do conjunto e duas vistas isoladas de
cada parte declarada no plano. Mande o pacote inteiro, dizendo o nome da parte
e a forma e a técnica que o plano promete para ela. Não monte o pacote com
`npm run bancada`: aquela captura serve à inspeção dirigida e já entregou ao
crítico uma tela com o objeto ocupando um quarto do quadro, e ele deu como
ausente um flange que existia na malha.

**Sem alvo não há rodada.** O crítico que não recebe a imagem de referência
responde com nota nula, corretamente, e o registro recusa nota ausente. Busque
o alvo e despache de novo; não invente número para caber no campo.

**parar-fechou** — a peça passou nas medidas e o revisor não apontou defeito com
nota suficiente. Encerre e mostre o registro.

**parar-limite** e **parar-sem-convergencia** — encerre e leve o caso à pessoa,
com o registro na mão. Não estenda o limite por conta própria: laço que não
fecha é informação, não obstáculo.

## Entre uma coisa e outra, meça

Depois de cada entrega do modelador, rode as medidas antes de chamar o revisor:

```bash
npm run descrever -- <peça>
node tools/mecanifica/conferir-pontos.mjs <peça>
npm run guarda:acervo
npm run guarda:referencial
```

`conferir-pontos` devolve o desvio em milímetro de cada ponto que a receita
declara, e é a medida mais direta de posição. `guarda:referencial` confere que
a peça usa o mesmo referencial do acervo e não afunda no chão: uma peça
construída com o eixo vertical trocado passa em todas as outras medidas, porque
cada régua compara a peça contra a declaração dela mesma.

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
  "veredito": { "alvo": "...", "nota": 6, "defeitos": [], "observacao": "..." },
  "atrito": ["o loft nao fecha tampa propria e o afinamento virou degraus"]
}
JSON
node tools/mecanifica/rodada-de-modelagem.mjs <peça> --registrar /tmp/rodada.json
```

O formato cobra duas coisas que já custaram tentativa aqui: `nota` precisa ser
número de 0 a 10, e `observacao` não passa de 240 caracteres. Escreva a
observação curta desde o começo, em vez de cortar depois.

Quando as medidas reprovarem, grave com `"veredito": null` e o relatório da
falha. Rodada gravada não se reescreve: o registro é evidência do que aconteceu,
e evidência que muda depois não responde por que a peça ficou assim.

O arquivo cai em `rodadas/` DENTRO da pasta da peça, ao lado da receita que ele
julgou. Quem abre a peça encontra o registro sem saber de cor um caminho em
outra árvore. Peça que ainda é arquivo solto não tem pasta, e aí a rodada cai em
`docs/mecanifica/historico/rodadas/`.

## Registre o atrito, e não só o resultado

Cada rodada é também uma amostra de onde o trabalho dói. Pergunte ao modelador,
no despacho, o que faltou: operação que o motor não tem, coisa que só saiu
porque ele fez à mão, medida que não existia, documentação que estava errada.
O registro da rodada tem campo `atrito` para isso, uma lista de frases curtas,
vazia quando a rodada não doeu em nada.

Sem isso, o atrito vive na conversa e morre com ela. Uma peça inteira desta
casa foi modelada como sonda, para levantar exatamente essa lista, e ela só
sobreviveu porque foi escrita antes de a sessão acabar.

## O que você nunca faz

- Editar o veredito do crítico, "traduzindo" ou suavizando defeito.
- Contar ao crítico como a peça foi construída, ou o que você espera que ele
  veja.
- Corrigir a receita você mesmo, mesmo que seja "só um número".
- Mudar o plano de modelagem para caber no que saiu. Plano errado se corrige com
  a pessoa, em rodada de alinhamento nova, e isso reinicia o registro.
- Declarar pronto sem `parar-fechou`.
