# A peça nasce encaixada

**Estado:** ativo

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
- a mudança nas instruções para conduzir uma parte por vez e declarar a ordem
  das etapas no `PLANO`: `laco-de-modelagem`, que é a skill do orquestrador,
  `alinhar-modelagem`, `criar-peca`, `auditar-montagem` e o contrato em
  `.claude/agents/modelador.md`. `modelar-maquina` é apagada. O crítico visual
  não muda: ele continua sem saber como a peça foi feita;
- a captura da bancada sem interface por padrão, descrita em "Alinhado para a
  fatia 4";
- as três primeiras partes do braço robótico como primeiro usuário real.

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
3. as três primeiras partes do braço nascem por vínculo, sem nenhum número de
   encaixe digitado, e as juntas passam na hora em que cada parte entra;
4. as skills conduzem o laço etapa por etapa, e o registro de rodada tem uma
   entrada por etapa;
5. os 32 gates verdes ao fim de cada fatia.

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
3. **A etapa.** O registro da etapa com as juntas medidas na entrada, e a recusa
   de avançar com junta reprovada.
4. **As instruções.** As skills e o contrato do modelador conduzindo uma
   parte por vez, com tudo o que está em "Alinhado para a fatia 4"; o `PLANO` da receita declara a ordem das etapas. Cada etapa
   despacha um modelador novo, que lê do disco as partes já fixas e o parecer
   da etapa anterior: o estado mora nos arquivos, e um agente longo carregaria
   para as etapas seguintes o que entendeu errado na primeira. Modelador e
   crítico podem repetir a etapa entre si, e ao fim dela o orquestrador para e
   mostra à pessoa as vistas da parte, as medidas da junta e o veredito. A etapa
   só fica fixa com o aceite dela. Para o modelador novo saber o que foi tentado
   e o que deu errado, o registro de cada rodada passa a guardar a diferença da
   receita para a rodada anterior, gerada pela ferramenta ao registrar, ao lado
   das medidas e do veredito que já guarda. O modelador fecha cada etapa com uma
   nota curta dizendo por que escolheu o que escolheu, que é a única parte que a
   ferramenta não consegue gerar sozinha.
5. **O primeiro usuário.** Terminar a rodada de alinhamento do braço, que parou
   na escala, e construir as três primeiras partes pelo mecanismo. O que der
   atrito volta para as fatias 1 a 4 e é consertado de forma genérica, provado
   de novo na fixture neutra.

A fatia 5 começa só depois das quatro primeiras verdes. O braço nunca é a única
prova do mecanismo: se ele fosse, o mecanismo seria moldado ao braço, e uma
falha não diria se o erro está no mecanismo ou na peça.

## Alinhado para a fatia 4

Combinado com a pessoa em 2026-09-23, depois de reler as skills.

As skills se contradiziam em três pontos, e os três são corrigidos. A cadeia da
receita é escrita uma vez, em `docs/mecanifica/usar/AUTORIA-DE-PECA.md`, e as
skills apontam para ela: a `TABELA` em milímetros é o que se mede e se edita,
`derivar()` converte e calcula, os `PARAMS` em metros são o que o núcleo
executa, e `gerarPassos()` produz os passos. Metro é a unidade da malha, do
visor e dos formatos 3D; milímetro é a unidade em que peça mecânica se mede.
Hoje nenhum gate confere essa cadeia, e as duas fixtures usam só `PARAMS`. A
peça mora em `procedural/pecas/<peça>/`; `modelar-maquina` e a pasta
`procedural/maquinas/` que ela mandava criar saem. O nome `pecas` é decidido na
fatia 5: quando o braço virar várias receitas e uma montagem, a pasta guarda um
objeto e não uma peça, e só o primeiro caso real diz que forma ela terá.

A bancada serve para investigar e `vistas:critica` para julgar, e as duas skills
dizem isso. `npm run bancada` passa a sair sem interface por padrão, que é o que
a IA quase sempre quer; `npm run bancada:tela` mostra a tela como a pessoa vê,
para quando o assunto é a própria interface. A skill de modelagem só cita o
primeiro, e o segundo é documentado onde se fala de mexer na bancada. Até aqui o
padrão era com interface, e a imagem limpa dependia de lembrar da opção.

`auditar-montagem` continua sendo a auditoria da montagem pronta, no fim ou de
uma que já existe, e ganha uma linha dizendo isso. A etapa de montagem do laço
usa as ferramentas dela, de relação, interseção e impacto, em cada junta.

As skills são reescritas como método curto, e o porquê de cada regra vai para
uma referência consultada quando preciso. Elas cresceram por acúmulo de avisos
sobre falhas antigas, e citam receitas que já não existem.

O alinhamento começa por como o objeto funciona e como uma pessoa o montaria, e
só depois por como ele parece. A ordem das etapas segue a ordem real de
montagem. Com isso o trabalho não desmorona quando não há imagem de referência,
e a medida de cada parte sai da função que ela cumpre ao lado da vizinha.

A ferramenta de rodada recusa passo fora de ordem: registrar sem medida, fechar
sem crítico, fixar etapa sem o aceite da pessoa. A skill passa a mandar
perguntar à ferramenta qual é o próximo passo, em vez de descrever a sequência e
depender de quem conduz segui-la.

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
achou](2026-09-21-o-que-o-braco-robotico-achou.md) lista seis achados de código
levantados pelo braço. Os que tocarem montagem ou laço são lidos antes da fatia
1, para não construir em cima de defeito conhecido.

## Fechamento

Preencher somente ao concluir ou cancelar.
