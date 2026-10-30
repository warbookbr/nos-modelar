# O laço visual — olhar, sobrepor, despachar

As quatro regras que valem em QUALQUER tarefa que produza forma: criar peça,
auditar peça, auditar montagem, modelar máquina. Elas viviam copiadas palavra
por palavra dentro de duas skills, e regra duplicada envelhece em lugares
diferentes: corrigir uma e esquecer a outra deixa duas verdades no repositório,
e a sessão que ler a errada não tem como saber.

## 1. Antes de tudo: OLHE a imagem

Rasterize as vistas e **abra o PNG**:

```bash
node tools/modelar/olhar.mjs saida.png vista-a.svg vista-b.svg
```

Ler o PNG como imagem é passo obrigatório antes de julgar, antes de despachar
crítico e antes de levar qualquer coisa ao usuário. SVG gerado, entregue e nunca
aberto por quem desenhou é o modo de falha real: um nariz aberto de 600 x 370 mm
ficou várias rodadas visível na vista frontal e só foi achado por um script.
Medição pega o defeito que alguém já imaginou; olhar pega o resto.

**Capture em modo de auditoria.** A bancada tem dois enquadramentos: o que a
pessoa vê, com painel de componentes à esquerda, inspeção à direita, cabeçalho,
barra de vistas, piso, grade e sombra; e o de leitura automática, sem nada
disso, com a peça ocupando o quadro inteiro.

```bash
npm run bancada -- <peça> --vistas=isometrica,frontal,direita,superior --cores
```

`--auditoria` tira o cromo, o piso, a grade e a sombra. `--cores` faz o mesmo e
pinta uma cor por parte, imprimindo a legenda — e é obrigatório em peça de mais
de uma parte, porque partes do mesmo material leem como um borrão só e a junção
entre elas fica invisível. Sem a bandeira, a peça sai numa tira estreita no meio
da tela, e a sombra no chão já foi lida como geometria mais de uma vez.

Para achar amassado em carroceria e em qualquer lataria, a zebra não basta e as
medidas não bastam: a zebra serve ao reflexo (a continuidade de uma curva entre
painéis), e um amassado de um ou dois milímetros em alguns decímetros passa por
distância, mapa de distância, curvatura de raio curto, ondulação e vista comum.
Na peça de lataria, a luz rasante e a curvatura média só da lataria
(`tools/blender/luz-rasante.py` e `tools/blender/curvatura-da-lataria.py`) são
obrigatórias desde 2026-10-30. A peça é de lataria quando a receita tem passo
`subdivisao` (a chapa de superfície livre) ou declara `PLANO.lataria: { partes:
[...] }`, com as partes que são a chapa; a peça de subdivisão que não é chapa
declara `PLANO.lataria: { dispensa: '<motivo>' }`. `npm run vistas:critica` gera
as duas vistas com o resto do pacote do crítico e põe a seção "Superfície" no
pedido, e sem `MODELAR_BLENDER` apontando o Blender recusa o pacote da peça de
lataria com o comando; `rodada-de-modelagem --registrar` recusa o veredito do
crítico de peça de lataria cujo pacote não trouxe as duas vistas da versão medida,
e `--acao` não a dá por fechada sem elas. Para olhar antes do crítico, as duas
saem sozinhas de `MODELAR_BLENDER=<blender> npm run vistas:superficie -- <peça>`.
Abra cada imagem em tamanho nativo como as demais.

## 2. Antes de qualquer julgamento: abra o alvo e sobreponha

Não é opcional e não é passo final. Uma prova inteira do chassi foi feita sem
isto: doze rodadas de modelagem sem que o desenho de referência fosse aberto uma
única vez, e o crítico visual recebendo só o render.

1. `npm run olhar -- alvo.png caminho/do/desenho.svg` e **leia a imagem**;
2. ponha o modelo sobre o alvo, em milímetros e na mesma origem: contra foto,
   `npm run conferir:referencia` mede a borda; contra o esboço, o pedido de
   `npm run vistas:critica` traz a sobreposição dos cortes; contra prancha, a
   comparação por número da skill `desenhar-prancha`;
3. despache o agente `critico-visual` com o alvo ao lado do modelo, no pedido
   que `npm run vistas:critica` monta. Crítico que recebe só o render dá opinião.

Sem alvo desenhado, desenhe antes: veja
[`REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md). Quando o que
existe é foto e não prancha, `npm run conferir:referencia` mede a borda em
milímetro contra a foto; o contrato e os limites estão em
[`CONFERIR-CONTRA-REFERENCIA.md`](CONFERIR-CONTRA-REFERENCIA.md).

## 3. Despachar o crítico, sem contexto

Em marco — antes de propor promoção, publicação ou de levar o resultado ao
usuário — despache um subagente como **crítico visual**. O que ele recebe, o
veredito que devolve e o limite de rodadas estão definidos num lugar só, em
[O laço do crítico](REFERENCIA-E-CRITICA-VISUAL.md#o-laço-do-crítico).

Passe as imagens e a pergunta, como `npm run vistas:critica` as monta. **Não
passe receita, código, passos, relatório, o seu raciocínio nem o histórico de
construção.** O crítico é para
VER a imagem — revisão de receita é outro trabalho, com outro dono, e um crítico
que lê a receita volta a julgar a intenção em vez do resultado, que é
exatamente o defeito que este papel existe para cobrir. Papel separado dentro da
mesma sessão é ficção: quem modelou tem a narrativa e não consegue não tê-la.

Quando a forma vai à pessoa, a legibilidade cega roda antes: entregue a imagem
sem dizer o que é e pergunte "o que é isto?". Se a resposta não bate com a
intenção, é achado, e o teste não exige gosto — só verifica se a forma comunica.

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

Nenhuma métrica aprova forma sozinha: IoU, silhueta, hash e fechamento de malha
verdes só dizem que nada foi acusado, e quem aprova a forma é a pessoa, com a
imagem aberta.

Leia [`GOTCHAS-AUTORIA-VISUAL.md`](GOTCHAS-AUTORIA-VISUAL.md): o registro do que
já falhou aqui e não pode se repetir. Malha fechada não é objeto bom, mosaico
esconde defeito que a vista em tamanho nativo mostra, e perspectiva bonita não
compensa ortográfica ruim.
