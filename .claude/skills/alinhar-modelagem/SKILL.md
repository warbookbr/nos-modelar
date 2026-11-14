---
name: alinhar-modelagem
description: Conduz o alinhamento antes de modelar: levanta com a pessoa objeto, referências, escala, partes, contatos e critérios de reprovação, e fecha no PLANO da receita. Use ANTES de qualquer passo de peça nova. Não use para ajustar peça já modelada.
---

# Alinhar a modelagem antes de modelar

O produto desta rodada é um arquivo, e não um acordo de conversa: o `PLANO`
exportado pela receita, validado por
[`src/autoria/plano-de-modelagem.js`](../../../src/autoria/plano-de-modelagem.js) e
cobrado por `npm run guarda:acervo`. Uma rodada inteira respondida está em
[`RODADA-DE-ALINHAMENTO-EXEMPLO.md`](../../../docs/modelar/usar/RODADA-DE-ALINHAMENTO-EXEMPLO.md).

Comece criando a receita que vai receber o combinado:

```
npm run receita:esqueleto -- <peça> [--objeto=<texto>] [--escala=<medida>:<mm>] [--partes=a,b,c]
```

Ela cria `procedural/pecas/<peça>/receita.js` com o `PLANO` vazio (o normalizador o recusa até estar preenchido), `contatos`
vazio, `TABELA` vazia e nenhum passo, e se recusa a sobrescrever uma receita que já existe. Escreva cada coisa decidida direto no
`PLANO`, na hora em que a pessoa a decide, e não numa anotação à parte.

Pergunte uma coisa por vez e escreva o que for decidido. Resposta vaga não
avança: se a pessoa não souber, ofereça duas opções concretas. Quando a escolha
for de forma, mostre as opções lado a lado com a skill
[esbocar-opcoes](../esbocar-opcoes/SKILL.md), junto da foto, e confira a imagem como ela diz antes de mostrar. Não modele no
meio da rodada nem escolha operação do motor; a técnica entra como descrição
curta, e a escolha fina é do modelador.

## 1. Como o objeto funciona e como se monta

Comece por aqui, antes de olhar como ele parece. Pergunte o que o objeto faz, o
que se move em relação a quê, o que segura o quê, e em que ordem uma pessoa o
montaria numa bancada: o que vem primeiro, e o que se prende nele depois.

Essa ordem é a ordem das etapas de construção. Cada parte nasce encostada nas
que já estão prontas, e tira delas o tamanho e a posição: o furo tem o raio do
eixo que passa por ele, e fica no eixo dele. Por isso, para cada parte, anote
qual parte anterior ela toca, por qual superfície (furo, pino, assento, face) e
com que folga. Isso vale mesmo sem imagem nenhuma: a função dá as proporções
que a foto não dá.

## 2. Leia a referência junto com a pessoa

Quando houver imagem, abra com `Read` e diga em voz alta o que vê, corpo por
corpo, e peça à pessoa que corrija e complete. Todo corpo que se distingue na
referência vira parte declarada, inclusive o que não é estrutura (cabo, tampa,
caixa colada). O que ficar de fora fica por decisão escrita. Confira a
orientação de cada extremidade contra a imagem, e não contra o que parece
natural.

## 3. Perguntas fixas

1. **O objeto, e qual recorte dele** vira `objeto`: peça inteira ou parte de um
   conjunto maior, com o recorte escrito.
2. **As imagens** viram `referencias`, com a vista de cada uma. Sem imagem, o
   alvo é a descrição funcional do passo 1, e isso fica escrito.
3. **A medida que dá a escala** vira `escala`: uma medida real em milímetros
   que todo o resto herda. Com mais de uma vista, meça em cada uma a razão
   entre as medidas da tabela que ela mostra (largura sobre comprimento, altura
   sobre largura) antes de modelar: imagem gerada por IA erra a proporção entre
   vistas, e a da empilhadeira dava a carcaça uns 25% mais larga que a ficha.
   Divergência acima de 5% vai à pessoa, com a medida da tabela como
   recomendação.
4. **As partes** viram `partes`. No `ALINHAMENTO.md` cada item da lista de
   partes é uma peça, e o nome dele é o da pasta `partes/<peça>/`, em letras
   minúsculas, dígitos e hífen (`laterais-traseiras`). As partes nomeadas de
   dentro da peça, em camelCase e iguais às do passo `parte` da receita
   (`paraLamaDir`), vêm depois, na descrição do item. O que várias peças
   dividem, como a superfície e as linhas de vão de uma lataria, é definição
   comum e não peça: mora em `partes/_comum/`, e o alinhamento o diz numa frase
   fora da lista.
5. **O grau de realismo.** Diga o que vê e ofereça duas opções concretas:
   silhueta com volumes simples, ou todos os corpos com aresta trabalhada. A
   técnica de cada parte tem de corresponder à escolha.
6. **A forma e a técnica de cada parte**, dizendo se é revolução ou perfil
   varrido, onde a seção varia e onde a aresta é quebrada. Corpo que se repete
   é família, dita uma vez com o número de instâncias.
7. **Os pares que se tocam, e por quê** viram `contatos`, cobrados por medida.
8. **O que reprova este objeto** vira `criteriosDeReprovacao`, cada um uma
   frase verificável.

Para mecanismo, pergunte também o curso de cada movimento e o que não pode se
tocar em nenhuma posição, e o eixo de cada junta dito em relação ao da junta
anterior, paralelo ou perpendicular, conferido contra o movimento que ela deve
fazer e não contra a direção que a imagem sugere: no braço robótico, a saída
do cotovelo tirada da prancha girava o antebraço em torno dele mesmo, e o braço
não dobrava.

## 4. Regras da família

Depois das perguntas fixas, rode o comando que lê as regras de desenho da
família declarada e imprime a pergunta de cada uma, já filtrada pelas partes:

```
node tools/modelar/perguntas-do-alinhamento.mjs <peça>
node tools/modelar/perguntas-do-alinhamento.mjs --familia <família> [--partes a,b]
```

Antes de a receita existir, passe `--familia` (e `--partes` quando as partes já
estiverem decididas). Faça cada pergunta impressa à pessoa e escreva a resposta
no `PLANO` ou nos `criteriosDeReprovacao`; a regra literal vem impressa junto,
com a conferência que a mede quando houver. Objeto sem família recebe o conjunto
geral curto do mesmo comando. As regras moram em
`procedural/criterios/<família>.json`: uma regra nova que a pessoa pedir depois
de ver as imagens entra lá, e o pedido é registrado com
`node tools/modelar/rodada-de-modelagem.mjs <peça> --pedidos <arquivo.json>`.

## Quando não há pessoa na rodada

O agente despachado não faz a rodada de perguntas, e o alinhamento que ele
escreve não vale como aprovado. Ele escreve o `ALINHAMENTO.md` inteiro com a
tabela, as partes e o que reprova, e põe cada escolha que a referência não
decide na seção `## Decisões que dependem da pessoa`, um parágrafo por decisão,
com a recomendação dele. Não escreve a seção `## Aceite`. `npm run fluxo:objeto`
lê isso como alinhamento proposto, aguardando a pessoa, lista as decisões e não
manda criar receita; o mesmo vale para o rascunho.

Só conta como aceite a linha da seção `## Aceite` com a data e as palavras da
pessoa, escrita por quem conduziu a rodada com ela (`- alinhamento: aceito pela
pessoa em AAAA-MM-DD, "..."` e `- rascunho: ...`), ou a delegação escrita por
ela, registrada na mesma seção (`- delegação: pela pessoa em AAAA-MM-DD, "..."`,
que vale para os dois). A sessão que recebe a delegação registra a linha com as
palavras que a pessoa usou; o agente despachado não cria aceite, mesmo que o
brief diga que a pessoa vai concordar.

## Fechando a rodada

A peça nasce como PASTA, com a receita e as imagens dentro:

```
procedural/pecas/<peça>/
  receita.js
  referencias/
    sobreposicao.jpg     ← a que a bancada põe sobre o modelo
    locais/              ← imagem de estudo que não se versiona (ignorada pelo git)
```

Imagem de estudo (foto, catálogo, a que tem marca) vai em `referencias/locais/` e é declarada no `PLANO` como
`referencias/locais/<arquivo>`; só os derivados dela entram versionados, como as coordenadas tiradas ou uma prancha própria. As
ferramentas usam a imagem local quando o arquivo está na máquina e, quando falta (outra máquina, CI), avisam uma vez "referência
local ausente nesta máquina: <caminho>" e seguem. A referência declarada fora de `locais/` que faltar continua reprovando.

Peça em arquivo solto reprova em `npm run guarda:acervo`.

Escreva o `PLANO` na receita com `objeto`, `referencias`, `escala`, `partes` e
`criteriosDeReprovacao`, e a lista de `contatos` ao lado, com as referências
relativas à pasta da peça. Quando o objeto é de uma família com critérios
(`assento`, `veiculo`, `movel-de-caixa`, em `procedural/criterios/`), declare
`familia` no `PLANO`, e `familiaProcedural` quando ele nasce de uma família de
`procedural/familias/`: o brief do crítico passa a trazer as perguntas de forma
delas. A peça de chapa de superfície livre feita por outra técnica que a
subdivisão (uma carroceria por loft, por exemplo) declara `lataria: { partes:
[...] }` no `PLANO`, com as partes que são a chapa, e a peça de subdivisão que não
é chapa declara `lataria: { dispensa: '<motivo>' }`, com o sim da pessoa: a peça de
lataria leva a luz rasante e a curvatura da lataria ao crítico. Num objeto de várias partes, a ordem do passo 1 vai
para `etapas` da montagem v5, e cada encaixe anotado vira um vínculo de medida
ou uma posição por porta, conforme
[`MONTAGENS-SEMANTICAS.md`](../../../docs/modelar/usar/MONTAGENS-SEMANTICAS.md).
O alinhamento parte da forma de referência ou da medida.

Rode `npm run guarda:acervo` e mostre o resultado, depois leia em voz alta para
a pessoa o que ficou escrito e pergunte se é isso.

Esta skill não escreve passo nem julga resultado. Se você conduziu a rodada,
não é você quem aprova o que sair dela.
