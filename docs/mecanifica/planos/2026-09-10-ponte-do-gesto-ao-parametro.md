# Ponte do gesto ao parâmetro nomeado

**Estado:** ativo

**Responsável:** Claude

**Repositório e base:** `nos-mecanifica`, base `e195332`

## Problema observado

A bancada vai ganhar controle direto para o usuário mover geometria, e o
desenho atual das receitas não recebe esse gesto sem estragar.

A receita da bicicleta, que é a única do acervo, tem quatrocentas e quarenta e
duas linhas e não é lista de passos: é uma `TABELA` de números medidos, uma
função `derivar` que calcula toda posição por trigonometria a partir dela, e uma
`gerarPassos` que emite os passos na hora da execução. Nenhuma posição está
escrita; toda posição é derivada. Um `transladar` empurrado por cima de um corpo
gerado é remendo, e a peça deixa de ser derivada a partir dali.

O caminho de baixo nível é pior. `moveV`, `moveF`, `moveA`, `vira`, `extruda` e
`mescla` só aceitam id literal, que é a referência que o `CLAUDE.md` proíbe
persistir; a referência de operações da skill chama isso de dívida posicional e
manda relatar. Gravar um arrasto assim registra "o vértice que por acaso recebeu
o número 4003 naquela execução": muda um parâmetro acima, o número passa a ser
outro vértice, e o passo deforma o lugar errado sem gritar.

A bancada também ainda não escreve receita. O `atualizarParametro` do
sincronizador muda o estado em memória e avisa por broadcast, e o painel de
parâmetros descobre os controles varrendo argumentos de passo atrás de chaves
como `raio` e `alt`. Na bicicleta esses argumentos são resultados da derivação,
e não as entradas da `TABELA`, então o botão mexe no lugar errado.

## Resultado

Arrastar um punho na bancada muda **um número declarado da receita**, o arquivo
é reescrito com esse número e a peça é reexecutada a partir dele — sem passo de
remendo, sem id literal e sem decimal contínuo gravado.

## Filtro Agent-First

`varrer-peca.mjs` é **USADO DIRETO** como origem da ligação entre geometria e
parâmetro: ele já mexe cada parâmetro e mede o que se move, que é exatamente o
índice que falta, e calculá-lo de novo criaria duas respostas para a mesma
pergunta. A declaração de parâmetros é **REFATORADA** para uma pergunta única,
porque hoje a bicicleta declara em `TABELA`, o contrato do núcleo fala em
`PARAMS`, e a bancada adivinha por nome de argumento; três formas de perguntar a
mesma coisa é custo de contexto puro e a terceira responde errado. A escrita na
receita é **ENVOLVIDA** num serviço com validação e falha total, e não exposta
como edição de arquivo, para que a mesma porta sirva à bancada e ao perfil de
autoria do MCP. O movimento livre de face e vértice é **ADIADO**: ele exige a
camada de tradução e a marca de dívida, e nada nele bloqueia este resultado.

## Incluído

- pergunta única que devolve os parâmetros declarados de uma receita, com valor
  atual, limites e unidade;
- serviço de escrita que troca o valor de um parâmetro declarado na receita, de
  forma transacional e reexecutando antes de gravar;
- ligação entre parte e parâmetro derivada da varredura de sensibilidade;
- punhos por eixo na parte selecionada, ligados a um parâmetro declarado, com
  encaixe em passo legível;
- prova de que arrastar e digitar o mesmo valor produzem o mesmo arquivo.

## Excluído

- movimento livre de vértice, aresta e face, e a camada que traduz gesto sem
  endereço semântico em passo com dívida declarada;
- criação de primitivos pela interface, que é acrescentar passo e não trocar
  número;
- edição de montagem persistida;
- qualquer alteração no vocabulário de operações do núcleo.

## Gate de saída

1. a bancada mostra, para a parte selecionada, apenas parâmetros que de fato a
   movem, e a lista vem da varredura e não de nome de argumento;
2. arrastar um punho grava um número nomeado na receita, e reexecutar o arquivo
   gravado reproduz a geometria vista na tela;
3. escrita recusada não altera o arquivo, e o erro diz qual parâmetro e por quê;
4. arrastar e digitar o mesmo valor produzem arquivos idênticos byte a byte;
5. nenhum passo novo aparece na receita por causa de um arrasto;
6. o retrato de parâmetros e os vinte gates continuam verdes.

## Fatias

1. **Baseline que falha.** Teste que arrasta um punho e verifica o arquivo:
   hoje ele falha porque não existe punho nem escrita. O mesmo teste registra o
   estado atual do painel de parâmetros da bicicleta, mostrando que as chaves
   oferecidas são derivadas e não entradas da tabela.
2. **Pergunta única de parâmetros.** Serviço que recebe uma receita e devolve os
   parâmetros declarados com valor, limite e unidade, aceitando `PARAMS` e a
   forma de tabela da bicicleta. Prova: a bicicleta responde os vinte e três
   declarados; uma receita sem declaração responde lista vazia em vez de
   adivinhar.
3. **Escrita transacional.** Serviço que troca o valor de um parâmetro
   declarado: valida o nome, valida o limite, reexecuta a receita com o valor
   novo, e só então grava. Prova: valor fora do limite não toca no arquivo;
   valor válido muda exatamente um número, e nada mais no arquivo se move.
4. **Ligação parte e parâmetro.** Da varredura de sensibilidade sai, por parte,
   a lista de parâmetros que a movem e o quanto movem. Prova: o tubo superior
   lista os parâmetros que o governam, e um parâmetro inerte não aparece em
   parte nenhuma.
5. **Punhos.** Setas por eixo na parte selecionada, cada uma ligada a um
   parâmetro pela ligação da fatia anterior. O arrasto pré-visualiza, encaixa em
   passo legível e grava ao soltar. Prova: arrastar até um valor e digitar o
   mesmo valor produzem o mesmo arquivo; soltar fora do limite não grava.

## Riscos e parada

O risco que obriga parar é a ligação não ser função. Se um punho não puder ser
ligado a um parâmetro só — porque a posição que ele move nasce de três entradas
da tabela ao mesmo tempo — então o gesto não tem tradução, e insistir produz
punho que muda a coisa errada com confiança. Nesse caso a saída é declarar na
receita qual parâmetro o punho governa, e não adivinhar por sensibilidade.

O segundo risco é a peça sem parâmetro declarado. Numa receita que escreve
número direto no passo, este plano não tem onde escrever, e a bancada precisa
dizer isso em vez de cair no id literal por baixo do pano.

## Fechamento

Preencher ao concluir ou cancelar.
