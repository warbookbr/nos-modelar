# Ponte do gesto ao parâmetro nomeado

**Estado:** concluído

**Responsável:** Claude

**Repositório e base:** `nos-mecanifica`, base `70144b8`

**Referência lida:** `brigsd/nos`, `prototipos/fps/v3/oficina.html`

## Problema observado

A bancada vai ganhar controle direto para o usuário mover geometria, e o
desenho atual das receitas não recebe esse gesto sem estragar.

A receita da bicicleta não é lista de passos: é uma `TABELA` de números medidos,
uma `derivar` que calcula toda posição por trigonometria, e uma `gerarPassos`
que emite os passos na execução. Nenhuma posição está escrita, toda posição é
derivada, e um `transladar` empurrado por cima de um corpo gerado é remendo.

O caminho de baixo nível é pior. `moveV`, `moveF`, `moveA`, `vira`, `extruda` e
`mescla` só aceitam id literal, a referência que o `CLAUDE.md` proíbe persistir e
que a skill chama de dívida posicional. Gravar um arrasto assim registra "o
vértice que por acaso recebeu o número 4003 naquela execução": muda um parâmetro
acima e o passo deforma o lugar errado sem gritar.

A bancada também ainda não escreve receita, e o painel de parâmetros descobre os
controles varrendo argumentos de passo atrás de chaves como `raio`. Na bicicleta
esses argumentos são resultados da derivação, e não entradas da `TABELA`, então
o controle mexe no lugar errado.

## Resultado

Mexer um controle na bancada muda **um número declarado da receita**, a peça é
reexecutada a partir dele, e ao salvar o arquivo é reescrito — sem passo de
remendo, sem id literal e sem decimal contínuo gravado.

MEXER É PRÉVIA, SALVAR É GRAVAÇÃO, e a separação foi decidida durante a
execução. Gravar ao soltar cada controle daria uma escrita por gesto: ajustar
cinco números viraria cinco commits, cinco disparos de integração contínua e
cinco publicações, com o histórico cheio de estados intermediários que ninguém
escolheu, e uma janela por gesto para outra pessoa commitar no meio da
sequência. A bancada acumula, mostra quantas alterações estão sem salvar, e
grava o lote inteiro de uma vez.

## O que vem do `brigsd/nos`, e o que não vem

O `nos` tem um editor 3D de manipulação direta já construído e provado, em
`prototipos/fps/v3/oficina.html`: malha desenhada num canvas 2D sobreposto,
ordem de acerto do clique declarada (setas, depois vértice, depois face, depois
câmera), gizmo de três setas com tamanho constante na tela, arrasto travado no
eixo, extrusão pela normal, ímã, pincel, desfazer e refazer.

Quatro coisas de lá entram neste plano.

A conta do arrasto travado no eixo, que já está resolvida: seta com comprimento
em mundo igual à distância dividida por oito, avanço igual ao produto do
deslocamento do mouse pela direção dividido pelo comprimento, zona morta na
base, e seta apagada e inerte quando aponta para a câmera.

A prévia por reexecução: enquanto o mouse se move, a peça inteira é executada de
novo e o resultado aparece na tela. Lá o que muda a cada quadro é um passo
tentativo no fim da lista; aqui será um valor tentativo na tabela. É a mesma
máquina com carga diferente, e ela dispensa qualquer edição de malha no lugar.

O limite do desfazer, que o `nos` chama de baseline: as operações que vieram do
arquivo ficam travadas, então Ctrl+Z desfaz o que a pessoa fez na sessão e nunca
desmonta a peça. Isto não estava previsto neste plano e passa a estar.

O serializador `serializarPeca`, que reescreve a peça como arquivo e a faz
reabrir idêntica, inclusive preservando declarações do autor — o comentário do
`meta.simetria` registra que eles já apanharam de perder declaração calada no
round-trip e consertaram. A fatia de escrita adota essa forma em vez de
inventar outra.

Uma coisa de lá NÃO entra: como o gesto é gravado. No `nos`, soltar o arrasto
executa `PASSOS.push(['moveV', { v: selecionado, d }])`, isto é, "mova o vértice
número 4003 nesta distância". O número é a posição do vértice naquela execução;
mude o número de lados do cilindro acima e ele passa a ser outro vértice, e o
passo deforma o lugar errado sem gritar. Lá isso é coerente, porque a peça É a
lista de passos e acrescentar no fim é a forma natural de editar. Aqui a peça é
uma tabela medida mais o código que deriva os passos, então acrescentar no fim é
remendo sobre valor calculado. Neste plano, soltar o arrasto grava um número com
nome na tabela.

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
autoria do MCP. O editor do `nos` é **REFATORADO** na parte de interação e **NÃO PORTADO** na
parte de gravação, pelo motivo da seção acima. O movimento livre de face e
vértice é **ADIADO**: ele exige a
camada de tradução e a marca de dívida, e nada nele bloqueia este resultado.

## Incluído

- pergunta única que devolve os parâmetros declarados, com valor, limites e
  unidade;
- escrita transacional em lote, reexecutando antes de gravar, com duas portas: o
  atendente do servidor de desenvolvimento e a API de conteúdo do GitHub;
- ligação entre parte e parâmetro derivada da varredura de sensibilidade;
- controles e setas por eixo ligados a essa medida, com prévia por reexecução e
  botão de salvar que grava o lote;
- desfazer limitado à sessão, sem alcançar o estado que veio do arquivo;
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
2. salvar grava os números nomeados na receita, e reexecutar o arquivo gravado
   reproduz a geometria vista na tela;
3. mexer um controle não grava nada: só o botão de salvar escreve, e o rodapé
   diz quantas alterações estão pendentes;
4. escrita recusada não altera o arquivo, e o erro diz qual parâmetro e por quê;
5. arrastar e digitar o mesmo valor produzem arquivos idênticos byte a byte;
6. nenhum passo novo aparece na receita por causa de um gesto, e nenhum id
   literal de vértice ou face é escrito;
7. desfazer para no estado que veio do arquivo e devolve a receita byte a byte
   ao que estava ao abrir;
8. o retrato de parâmetros e os vinte gates continuam verdes.

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
3. **Escrita transacional.** Serviço que troca valores de parâmetros declarados:
   valida os nomes, reexecuta a receita com os valores novos, e só então grava.
   Prova: valor recusado não toca no arquivo; lote válido muda exatamente as
   linhas pedidas, e nada mais no arquivo se move; lote com uma troca inválida
   não grava nenhuma das outras.
4. **Ligação parte e parâmetro.** Da varredura de sensibilidade sai, por parte,
   a lista de parâmetros que a movem e o quanto movem. Prova: o tubo superior
   lista os parâmetros que o governam, e um parâmetro inerte não aparece em
   parte nenhuma.
5. **Laço fechado por controle.** Os controles do painel passam a listar os
   parâmetros declarados, mexer reexecuta a receita com os valores tentativos, e
   o botão de salvar grava o lote — no arquivo local pelo atendente do servidor
   de desenvolvimento, ou no repositório pela API do GitHub quando a bancada
   está publicada. Prova: vários toques em dois parâmetros não gravam nada até o
   botão, e depois gravam num envio só.
6. **Setas na peça.** As mesmas ligações, com outro gesto: setas por eixo na
   parte selecionada, desenhadas sobre a cena, com a conta do arrasto travado no
   eixo vinda do `nos`. Prova: arrastar até um valor e digitar o mesmo valor
   produzem o mesmo arquivo.
7. **Desfazer da sessão.** Ctrl+Z devolve o valor anterior de cada parâmetro
   alterado nesta sessão, e para no estado que veio do arquivo. Prova: desfazer
   além do início da sessão não altera o arquivo, e o texto da receita volta
   byte a byte ao que estava ao abrir.

## Riscos e parada

O risco que obriga parar é a ligação não ser função. Se um punho não puder ser
ligado a um parâmetro só — porque a posição que ele move nasce de três entradas
da tabela ao mesmo tempo — então o gesto não tem tradução, e insistir produz
punho que muda a coisa errada com confiança. Nesse caso a saída é declarar na
receita qual parâmetro o punho governa, e não adivinhar por sensibilidade.

O terceiro risco apareceu medido e está registrado aqui porque limita o
resultado: parte cuja forma nasce de uma CURVA medida, e não de números soltos,
continua sem controle. É o caso do tubo inferior da bicicleta, cujas duas bordas
são polilinhas de doze pontos. A leitura desce em coordenada, que é lista de
números, e para em lista de listas. Mexer num ponto de curva é outro gesto e
outro plano.

O segundo risco é a peça sem parâmetro declarado. Numa receita que escreve
número direto no passo, este plano não tem onde escrever, e a bancada precisa
dizer isso em vez de cair no id literal por baixo do pano.

## Fechamento

**Concluído** em 2026-09-11, commits `54778d1` a `60a5f31`, vinte gates verdes.
As sete fatias saíram, com a aceitação em
`tools/mecanifica/ponte-gesto-parametro.test.mjs`. Fica pendente a conferência
do desfazer no navegador pelo autor, e volta ao backlog o controle de parte cuja
forma nasce de curva medida, pelo motivo já registrado nos riscos.
