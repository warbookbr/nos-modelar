# A peça mora num lugar só

**Estado:** ativo

**Responsável:** Claude

**Repositório e base:** `nos-mecanifica`, base `f5dfdc9`

## Problema observado

O material de uma peça está espalhado por seis pastas que não são vizinhas. Para
a bicicleta: a receita em `prototipos/procedural/v3/pecas/`, os recortes de
referência com âncoras em `docs/mecanifica/referencias/bicicleta-29/`, a foto de
sobreposição da bancada em `public/referencias/`, o gerador de prancha em
`tools/mecanifica/`, os atritos medidos em `docs/mecanifica/historico/`, e, desde
o laço de modelagem, as rodadas em `docs/mecanifica/historico/rodadas/`.

Nenhum documento diz que esses seis caminhos existem nem que pertencem à mesma
peça. Quem vai mexer numa peça precisa descobrir cada um, e descobre de novo a
cada sessão. A organização atual separa por natureza do arquivo — código,
documentação, ferramenta —, o que serve a quem cuida do repositório e não a quem
trabalha numa peça, que é o uso real e o que a modelagem por agentes ampliou.

Dentro da própria documentação o espalhamento se repete em escala menor: os
recortes estão em `referencias/bicicleta-29/` e a folha inteira de onde eles
saíram está solta um nível acima, como `referencias/bicicleta-29-vistas-geradas.png`,
ao lado de material de outras peças. Origem e recorte separados por uma pasta.

A foto de sobreposição mostra a forma aguda do problema: ela está no
repositório, é servida pela aplicação publicada, e o único arquivo que a cita é
`sessao-ativa.json`, que é estado local e não é versionado. Ninguém que abra o
repositório descobre que ela existe.

## Resultado

Abrir uma peça passa a ser abrir um diretório: receita, referências, plano de
modelagem e rodadas no mesmo lugar, e a instrução para quem vai modelar vira um
caminho em vez de seis.

## Filtro Agent-First

Glob do acervo (`prototipos/procedural/v3/pecas/**/*.js`): **REFATORAR**. Ele já
é recursivo em `listarAcervo` e em `pecasDoAcervo`, então pasta por peça cabe;
o que muda é o nome do arquivo deixar de ser a identidade e passar a ser a pasta.

`resolverCaminhoReceita`: **USAR DIRETO**. Já aceita nome curto, extensão
opcional e caminho relativo, e é a porta única de todos os comandos. Ganha uma
forma nova de resolver e nada mais precisa saber.

Gates de documentação: **ADIAR** qualquer mudança neles. As imagens que saírem
de `docs/` deixam de ser conferidas por `docs:links:check`, então a peça precisa
de uma guarda própria que cubra o que se perde.

Foto de sobreposição em `public/`: **ENVOLVER**. O Vite publica `public/`, então
a imagem não pode simplesmente mudar de lugar; ou o build passa a copiar da
pasta da peça, ou a bancada passa a carregar por outro caminho.

## Incluído

- uma pasta por peça, com a receita, as imagens de referência, as âncoras e o
  material que hoje mora em `referencias/`;
- as rodadas do laço gravadas dentro da pasta da peça;
- a foto de sobreposição da bancada resolvida a partir da pasta da peça, sem
  cópia solta em `public/`;
- guarda que reprova peça cujo material declarado não existe, cobrindo o que os
  gates de documentação deixarem de ver;
- a bicicleta migrada inteira, como prova;
- a forma antiga recusada assim que ela não tiver mais ocupante, e a rodada de
  alinhamento passando a criar a pasta — sem as duas, a pasta da peça é
  permissão e não regra, e peça nova volta a espalhar material.

## Excluído

- mudar o formato da receita, o `PLANO` ou o contrato de contatos;
- mover ferramenta de peça específica, como o gerador de prancha, que é código
  e continua em `tools/`;
- mover relatório histórico já encerrado;
- montagens persistidas, que têm formato próprio e outro ciclo.

## Gate de saída

1. abrir a pasta de uma peça mostra receita, referências e rodadas, e o único
   material dela fora da pasta é código, em `tools/`;
2. todo comando que hoje aceita o nome curto da peça continua aceitando, com a
   mesma saída — `descrever`, `bancada`, `exportar`, `guarda:acervo`;
3. a bancada publicada continua abrindo a peça e mostrando a sobreposição, sem
   arquivo solto em `public/`;
4. imagem de referência citada por uma peça e ausente reprova com nome e
   caminho, cobrindo o que `docs:links:check` deixou de conferir;
5. o acervo continua sendo varrido por um caminho só, e a identidade da peça é
   a pasta, nunca a posição num glob;
6. peça nova em arquivo solto REPROVA, com a mensagem dizendo qual é a forma
   certa, e a skill de alinhamento entrega a peça já na pasta;
7. os vinte e quatro gates continuam verdes.

## Fatias

1. **Retrato do espalhamento.** Comando que lista, para uma peça, todo arquivo
   que pertence a ela e onde está. Prova: hoje ele imprime seis caminhos em
   quatro árvores para a bicicleta, e é esse número que a última fatia derruba.
2. **A pasta da peça.** Formato do diretório e resolução: `resolverCaminhoReceita`
   aceita a pasta, `listarAcervo` e `pecasDoAcervo` enxergam as duas formas.
   Prova: uma peça de ensaio em pasta e a bicicleta em arquivo respondem ao
   mesmo comando.
3. **Referências dentro da peça.** As imagens e âncoras passam a morar na pasta,
   declaradas pelo `PLANO`, e a folha de origem vai junto dos recortes que
   saíram dela. Prova: referência declarada e ausente reprova nomeando o
   arquivo, e nenhuma imagem de peça sobra solta em `referencias/`.
4. **A sobreposição sem cópia.** A bancada resolve a imagem a partir da pasta da
   peça. Prova: a bancada publicada abre a bicicleta e mostra a sobreposição com
   `public/referencias/` vazio.
5. **As rodadas junto.** O registro do laço grava dentro da pasta da peça.
   Prova: uma rodada gravada aparece ao lado da receita que a motivou.
6. **A bicicleta migrada.** A peça inteira muda de forma, e o retrato da
   primeira fatia passa de quatro árvores para DUAS: a da peça e a de `tools/`,
   onde o gerador de prancha continua por ser código. Uma árvore só seria mentir
   sobre o que este plano excluiu.
7. **A forma nova vira a única.** A guarda recusa peça em arquivo solto, e a
   skill de alinhamento cria a pasta ao fechar a rodada. Prova: uma peça de
   ensaio escrita como arquivo reprova nomeando a forma certa, e a skill diz
   onde a receita nasce.

## Riscos e parada

O risco que obriga parar é a imagem sair do alcance dos gates de documentação
sem ganhar guarda equivalente. Hoje `docs:links:check` varre 1.033 arquivos e
acusa endereço morto; imagem que migra para fora de `docs/` deixa de ser
conferida por ele, e trocar uma conferência por nenhuma é piorar com aparência
de arrumação. A guarda nova entra antes da migração, não depois.

O segundo risco é a peça virar pasta e o acervo passar a ter duas formas para
sempre. Duas formas custam um `if` em cada comando e uma dúvida em cada sessão.
A saída é migrar a única peça do acervo na mesma rodada e recusar a forma
antiga assim que ela não tiver mais ocupante.

O terceiro risco é o `public/`. Se a bancada publicada depender de um caminho
que só existe em desenvolvimento, a página quebra para quem abre o endereço
publicado, e isso não aparece em teste de unidade. A prova dessa fatia é a
bancada real no navegador, com a pasta antiga vazia.

## Fechamento

Preencher ao concluir ou cancelar.
