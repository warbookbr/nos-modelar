# O laço visual — olhar, sobrepor, despachar

As quatro regras que valem em QUALQUER tarefa que produza forma: criar peça,
auditar peça, auditar montagem, modelar máquina. Elas viviam copiadas palavra
por palavra dentro de duas skills, e regra duplicada envelhece em lugares
diferentes: corrigir uma e esquecer a outra deixa duas verdades no repositório,
e a sessão que ler a errada não tem como saber.

## 1. Antes de tudo: OLHE a imagem

Rasterize as vistas e **abra o PNG**:

```bash
node tools/mecanifica/olhar.mjs saida.png vista-a.svg vista-b.svg
```

Ler o PNG como imagem é passo obrigatório antes de julgar, antes de despachar
crítico e antes de levar qualquer coisa ao usuário. SVG gerado, entregue e nunca
aberto por quem desenhou é o modo de falha real: um nariz aberto de 600 x 370 mm
ficou várias rodadas visível na vista frontal e só foi achado por um script.
Medição pega o defeito que alguém já imaginou; olhar pega o resto.

## 2. Antes de qualquer julgamento: abra o alvo e sobreponha

Não é opcional e não é passo final. Uma prova inteira do chassi foi feita sem
isto: doze rodadas de modelagem sem que o desenho de referência fosse aberto uma
única vez, e o crítico visual recebendo só o render.

1. `npm run olhar -- alvo.png caminho/do/desenho.svg` e **leia a imagem**;
2. `npm run comparar:alvo -- cmp.svg caminho/da/malha.json` para pôr a silhueta
   do modelo sobre as curvas do alvo, em milímetros e na mesma origem;
3. despache o agente `critico-visual` passando os **três** caminhos — alvo,
   modelo e sobreposição. Crítico que recebe só o render dá opinião.

Sem alvo desenhado, desenhe antes: veja
[`REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md). Quando o que
existe é foto e não prancha, `npm run conferir:referencia` mede a borda em
milímetro contra a foto; o contrato e os limites estão em
[`CONFERIR-CONTRA-REFERENCIA.md`](CONFERIR-CONTRA-REFERENCIA.md).

## 3. Despachar o crítico, sem contexto

Em marco — antes de propor promoção, publicação ou de levar o resultado ao
usuário — despache um subagente como **crítico visual**. O protocolo está em
[`REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md).

Passe **apenas o PNG** e a pergunta. **Não passe receita, código, passos,
relatório, o seu raciocínio nem o histórico de construção.** O crítico é para
VER a imagem — revisão de receita é outro trabalho, com outro dono, e um crítico
que lê a receita volta a julgar a intenção em vez do resultado, que é
exatamente o defeito que este papel existe para cobrir. Papel separado dentro da
mesma sessão é ficção: quem modelou tem a narrativa e não consegue não tê-la.

A forma padrão é legibilidade cega: entregue a imagem sem dizer o que é e
pergunte "o que é isto?". Se a resposta não bate com a intenção, é achado, e o
teste não exige gosto — só verifica se a forma comunica.

Três limites, todos inegociáveis:

- **achado, nunca aprovação.** Silêncio do crítico não é evidência de qualidade
  e não entra em registro como aceite. Forma quem aprova é o usuário;
- **depois dos gates, nunca no lugar deles.** Se descrição, medida ou gate ainda
  acusam, corrija primeiro;
- **em marco, não a cada rodada.** Cada despacho é partida fria.

## 4. Antes de caçar defeito: o método tem limite

Se você está tentando decidir **forma, proporção ou caráter**, não é problema
diagnóstico, e eliminar defeito ali rende conserto certo num objeto que continua
ruim. O sintoma é os achados encolherem e a nota não subir. Ver
[`METODO-DIAGNOSTICO-E-SEU-LIMITE.md`](METODO-DIAGNOSTICO-E-SEU-LIMITE.md).

Quando o método valer, dois passos são obrigatórios e são os que mais somem:
**identificar o que falta** (o desenho de referência existia desde a primeira
rodada e nunca foi aberto) e **levantar hipóteses no plural antes de testar**
(o serrilhado foi culpa do renderizador duas vezes antes de alguém rastrear o
loop).

## Antes de gerar a primeira forma

Leia [`GOTCHAS-AUTORIA-VISUAL.md`](GOTCHAS-AUTORIA-VISUAL.md): o registro do que
já falhou aqui e não pode se repetir. Malha fechada não é objeto bom, métrica
verde não aprova forma, mosaico esconde defeito que a vista em tamanho nativo
mostra, e perspectiva bonita não compensa ortográfica ruim.
