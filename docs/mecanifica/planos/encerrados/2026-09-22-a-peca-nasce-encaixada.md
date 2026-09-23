# A peça nasce encaixada

**Estado:** concluído

**Responsável:** Tiago (autoria) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-mecanifica`, base `15583510` na main.

## Problema observado

Hoje o laço de modelagem trata a peça inteira de uma vez. O modelador escreve
todas as partes, o crítico julga o conjunto, e um erro no punho devolve a rodada
inteira. Quem julga precisa julgar o objeto todo, e julgar o objeto todo é o que
a IA faz pior: o repositório mediu isso em cinco tentativas de carroceria e na
bicicleta, que ficou incompleta.

A montagem também chega tarde. Cada receita tem os próprios números, e a relação
entre peças só confere no fim se eles batem. A bucha tem o furo que alguém
digitou, e não o furo do eixo que existe. A regra da casa, nenhuma coordenada
digitada e tudo derivado, vale dentro de uma receita e para na fronteira dela.

## A ideia

A montagem vira o lugar de trabalho. Cada parte nova é criada dentro do espaço
de montagem, encostada nas que já estão lá, e deriva suas medidas das portas das
vizinhas: o furo da bucha é o raio da porta `haste` do eixo mais a folga
declarada. A parte entra, a junta é medida na hora, o ajuste acontece ali, e a
parte fica fixa antes de a próxima começar.

As partes já prontas são o alvo da próxima. Isso resolve localmente a pergunta
que derrubou as tentativas anteriores, de onde vem o alvo: a verdade está ao
lado, medida, e não numa imagem.

## O grafo que já existe

`src/autoria/derivar-mapa-dependencias.js` e `consultar-impacto-global.js` já
mantêm um grafo de entidades: universo, montagens, peças, ocorrências e
relações, com consulta de impacto e recusa de ciclo, descrito em
`MAPA-CANONICO-DEPENDENCIAS.md`. Ele responde "quem usa esta peça".

O que falta é a aresta de medida: "este parâmetro do ombro vem desta porta da
base". Com ela, o grafo passa a dizer em que ordem construir (a ordem
topológica), o que muda quando uma parte muda (a cascata que a revalidação já
sabe executar) e o que está pendente. É o mapa que a IA consulta para saber onde
está e qual é o próximo passo.

## Resultado

Um mecanismo genérico, sem nenhuma palavra de domínio, em que:

1. uma parte declara parâmetros vinculados a medidas de portas de outras partes
   da mesma montagem, com acréscimo explícito (folga, sobreposição);
2. o resolvedor calcula a ordem pelo grafo, resolve os vínculos nessa ordem,
   recusa ciclo e recusa vínculo para porta ou medida que não existe;
3. cada etapa de construção registra a parte, as juntas medidas no momento em
   que ela entrou e o estado fixo;
4. mudar uma parte do começo propaga pelos vínculos e dispara a revalidação que
   já existe;
5. o laço de modelagem e as skills passam a conduzir uma parte por vez.

## Filtro Agent-First

**REFATORAR e ESTENDER.** O que muda é quem decide a medida de uma parte: deixa
de ser número digitado e passa a ser derivação de vizinha medida. Isso reduz o
que a IA precisa julgar a cada passo a uma parte e suas juntas, que é o tamanho
em que ela acerta. Adiar tem custo crescente: toda peça nova feita no laço
atual digita números que depois precisam ser conferidos um contra o outro.

## Incluído

- o formato do vínculo de medida na montagem persistida, com validação estrita;
- a aresta de medida no grafo e a ordem de construção derivada dele;
- a resolução dos vínculos no resolvedor de montagem, antes da conferência das
  relações;
- o registro de etapa: parte, juntas medidas na entrada, estado fixo;
- a diferença da receita entre rodadas, gravada no registro de rodada pela
  ferramenta, e a nota de passagem do modelador ao fim de cada etapa;
- a fixture neutra que prova o mecanismo: dois blocos, o segundo derivando o
  furo do pino do primeiro, e um terceiro derivando do segundo;
- as instruções, a ferramenta do laço e o braço como primeiro usuário, que
  seguiram para o plano sucessor citado nas fatias.

## Excluído

- solver de restrições geral. O vínculo é uma derivação direta de uma medida de
  porta mais um acréscimo; não resolve sistema de equações;
- o tato (perguntas exatas sobre a malha). Entra em plano próprio, e este plano
  deixa o lugar pronto: cada etapa é pequena o bastante para ser conferida
  inteira por ele;
- as onze partes restantes do braço;
- qualquer palavra de domínio no mecanismo, nos testes dele ou na fixture.

## Gate de saída

1. a fixture neutra de três blocos prova vínculo, ordem, recusa de ciclo,
   recusa de porta inexistente e propagação de mudança;
2. um teste recusa vínculo que aponte para parte ainda não construída na ordem
   declarada;
3. os itens de instrução e de braço seguem no plano sucessor;
4. os 32 gates verdes ao fim de cada fatia.

## Arquivos reservados

`src/autoria/ler-montagem-persistida.js`, `resolver-montagem-persistida.js`,
`derivar-mapa-dependencias.js`, `consultar-impacto-global.js`, a fixture nova em
`tools/fixtures/`, as skills e `.claude/agents/modelador.md` citados acima,
`tools/mecanifica/olhar-bancada.mjs`, `tools/mecanifica/rodada-de-modelagem.mjs`,
`src/autoria/laco-de-modelagem.js`, `docs/mecanifica/usar/AUTORIA-DE-PECA.md`,
`package.json` e `procedural/pecas/braco-robotico/`.

## Fatias

1. **O formato e o grafo.** Vínculo de medida na montagem persistida, validação
   estrita, aresta no grafo, ordem topológica e recusa de ciclo. Provado só na
   fixture neutra.
2. **A resolução.** O resolvedor aplica os vínculos na ordem e entrega a
   montagem com as medidas derivadas. A mudança de uma parte do começo propaga
   e a revalidação existente dispara.
2b. **A posição vem da porta.** O vínculo da fatia 2 resolve o tamanho, e a
   `pose` de cada instância continua digitada: o furo tem o raio do pino, mas
   alguém escreve onde a peça fica. Esta fatia declara o encaixe de posição,
   "a porta `furo` desta instância no mesmo eixo da porta `pino` daquela, com
   tal afastamento", e a pose sai alinhando as duas portas. É derivação direta,
   como o vínculo de tamanho, e não solver. Entra antes da fatia 3 porque medir
   a junta na entrada não diz nada se a posição da peça foi chutada. Incluída
   em 2026-09-23, com o aceite da pessoa.
3. **A etapa.** O registro da etapa com as juntas medidas na entrada, e a recusa
   de avançar com junta reprovada.
4 e 5. **As instruções e o primeiro usuário.** Movidas em 2026-09-23 para o
   plano [o laço constrói parte por parte](../2026-09-23-o-laco-constroi-parte-por-parte.md),
   com o que foi alinhado para elas. Este plano passou do teto de linhas com os
   registros das fatias, e o que falta é de outro tipo: instrução, ferramenta
   do laço e peça real, e não o mecanismo.

## Lido antes da fatia 1

Do rascunho do braço, três achados tocam este plano. `conferir-pontos` mede a
junta como o centro da sobreposição das caixas, que erra quando uma parte entra
pelo flanco da outra; a fatia 3 mede a junta pela porta, e não pela caixa.
`guarda:acervo` para no primeiro contato e nunca confere o `PLANO` de peça sem
geometria; a fatia 4 precisa que a ordem das etapas seja conferível antes da
malha. E a pasta do braço existe só com imagens e nenhum gate a vê; a fatia 5
cria a receita e fecha isso de passagem.

## Feito na fatia 1

A montagem ganhou a versão 5, com `etapas`, a ordem de construção, e
`vinculos`, cada um dizendo que um parâmetro de uma peça é a medida de uma porta
de outra mais um acréscimo explícito. A validação fica em
`src/autoria/vinculos-de-medida.js`, módulo puro: recusa ciclo, recusa vínculo
para instância construída depois, recusa medida que porta não publica,
parâmetro com duas origens, acréscimo ausente e etapa faltando ou repetida. Se a
porta existe na peça é pergunta da fatia 2, que tem a peça em mãos.

O mapa de dependências ganhou `vinculos` e `construcao`, presentes só quando
alguma montagem os declara, para o mapa dos universos sem vínculo continuar
idêntico. A fixture neutra é `tools/fixtures/tres-blocos-vinculados/`, e a prova
é `tools/mecanifica/vinculos-de-medida.test.mjs`.

## Feito na fatia 2

A leitura da peça de prova mostrou que `PARAMS` é a própria `TABELA`, em
milímetros, e que a conversão para metro acontece dentro de `derivar()`. A
medida da porta vem da malha, em metro, e o parâmetro que a recebe pode estar
em milímetro ou em metro conforme o estilo da receita. Por isso o vínculo
ganhou `unidade`, obrigatória, `mm` ou `m`, e o acréscimo vem nela; adivinhar
erraria por mil.

O resolvedor constrói as instâncias na ordem das etapas e, quando uma peça tem
vínculo, pede a receita executada com os parâmetros derivados por um carregador
novo, `carregarPecaComParametros`. A mesma receita com parâmetros diferentes é
outra peça, e o cache usa os valores na chave. Cada instância derivada traz
`parametrosDerivados`, com o vínculo, o valor e a unidade. O resolvedor recusa
porta que a vizinha não publica, medida que a porta não tem, parâmetro que a
receita não declara e montagem com vínculo sem o carregador.

`tools/mecanifica/peca-com-parametros.mjs` é esse carregador. Ele copia a
receita por descritores, porque `PASSOS` é getter e a cópia por espalhamento
congelaria a tabela velha, e recusa parâmetro que a receita não declara.

A consulta de impacto ganhou `instanciasDerivadas`: mudar uma peça lista as
instâncias que derivam dela, em cadeia. A fixture ganhou as receitas dos três
blocos, com os raios vinculados de propósito errados na receita, para a prova
só passar se o valor vier da vizinha. O meio deriva o furo e o pino da base, e
o topo deriva o furo do meio; aumentar o pino da base muda os três.

## Feito na fatia 2b

A montagem v5 ganhou `posicoes`: a porta de uma instância no eixo da porta de
outra, com afastamento na unidade declarada. `src/autoria/posicao-por-porta.js`
calcula a pose alinhando os eixos e, quando as duas portas publicam
`referencia`, o giro em torno dele; sem ela, o resultado diz `giroDefinido:
false`. Posição junto com `pose` é recusada, e a ordem e o ciclo valem para
posições e vínculos juntos. Na fixture ninguém digita coordenada: o meio e o
topo se empilham pelo encaixe, as relações de encaixe cilíndrico passam, girar
a base leva os dois junto, e um vínculo de folga errado reprova a junta.

## Feito na fatia 3

`src/autoria/etapas-de-construcao.js` põe cada junta na etapa em que a segunda
parte entra e só fixa etapa em ordem, com juntas passando e com aceite de
quem aceitou. Etapa fixa que uma mudança anterior quebra vira `quebrada`, passa
na frente e, consertada, volta a aberta pedindo aceite novo. Gravar em disco e
perguntar à pessoa fica para a ferramenta do laço, na fatia 4.

## Riscos e parada

O risco que obriga parar: descobrir que a derivação direta não basta, e que as
partes precisam de restrição mútua (duas partes que se ajustam uma à outra ao
mesmo tempo). Isso é solver, está excluído, e vira plano próprio com a medida
do caso que o exigiu.

Partes corretas sozinhas e erradas juntas: cada segmento certo e a proporção
entre eles errada. A etapa de montagem confere encaixe e não confere proporção.
A fatia 5 registra se isso aparece; se aparecer, a proporção entre partes vira
campo do `PLANO` e conferência da etapa.

O rascunho [o que o braço robótico
achou](../2026-09-21-o-que-o-braco-robotico-achou.md) lista seis achados de código
levantados pelo braço. Os que tocarem montagem ou laço são lidos antes da fatia
1, para não construir em cima de defeito conhecido.

## Fechamento

**Concluído em 2026-09-23 com o mecanismo pronto.** A montagem v5 declara a
ordem de construção, os parâmetros que uma peça deriva das portas das vizinhas
e a posição que sai do encaixe de porta; o resolvedor constrói na ordem e leva
as medidas reais adiante; o mapa e a consulta de impacto seguem a cadeia; e o
registro de etapas só fixa em ordem, com junta passando e aceite. Tudo provado
na fixture neutra de três blocos, sem palavra de domínio. As fatias 4 e 5
seguiram para o plano sucessor.
