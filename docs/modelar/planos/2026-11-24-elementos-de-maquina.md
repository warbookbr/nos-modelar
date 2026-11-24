# Elementos de máquina: perfil estrutural, guia linear, rolamento com mancal e fuso com castanha

**Estado:** ativo

**Território:** `procedural/familias/perfil-estrutural/`, `procedural/familias/guia-linear/`, `procedural/familias/rolamento/`, `procedural/familias/fuso/`, `procedural/familias/index.js`, `tools/fixtures/elementos-de-maquina/`, `docs/modelar/banco-de-provas/elementos-de-maquina-2026-11-24/`, `docs/modelar/ferramentas-por-objeto.json`, `tools/modelar/capacidade.mjs`.

Ativado pela pessoa em 2026-11-24, para que agentes despachados avancem nas fatias uma a uma.

**Responsável:** a IA da sessão ou o agente despachado de cada fatia; a pessoa aprova a forma de cada família por imagem e decide o que está em Decisão da pessoa.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-24.

## Problema observado

O [mapa de ferramentas por objeto](../pesquisas/FERRAMENTAS-POR-OBJETO.md) tem 58 objetos nos grupos de máquinas industriais, máquinas têxteis e de embalagem, máquinas pesadas e agrícolas, e motores, transmissões e mecanismos. Contadas as ferramentas que esses objetos pedem, depois da casca (23) e da chapa (20), que mexem no núcleo, vêm o atuador linear (17), a guia linear (16), a articulação (16) e o perfil estrutural (15), e logo abaixo o rolamento (7), que não existe. Um torno, uma fresadora, uma prensa, uma ponte rolante ou uma linha de montagem são em grande parte um quadro de perfil, guias com carro, eixos apoiados em mancais e um fuso que move a mesa. Hoje a IA que modela uma dessas máquinas desenha cada uma dessas peças à mão, sem medida de norma, e refaz a mesma peça em cada máquina.

Essas quatro peças ainda não foram feitas por três motivos que o histórico mostra. O primeiro é o mesmo da tubulação: o projeto tira as ferramentas do objeto que está sendo modelado (o avião, o carro, a bicicleta, o braço), e nenhum objeto do acervo é uma máquina industrial. O segundo é que o perfil e a guia existem só em parte, dentro de outra coisa: a `estruturaDeBarras` faz tubo redondo, quadrado, retangular e cantoneira entre nós, sem I, H, U nem alumínio ranhurado, e o trilho de gaveta vive dentro da família `movel-de-caixa`. O terceiro é que o rolamento e o mancal existiam como componentes do esboço antigo e saíram com ele em 2026-11-05, sem que um gerador novo os substituísse. A [análise de 2026-10](../pesquisas/ANALISES-DE-2026-10.md) já apontava que fixador, rosca, rolamento, perfil, polia e eixo consultam tabelas parecidas de norma, e as famílias `fixador`, `polia-e-correia` e `tubulacao` mostraram desde então a forma de pôr essa tabela dentro da família.

## Resultado

O agente pede, por norma e tamanho, o perfil estrutural cortado no comprimento, o trilho de guia linear com o carro, o rolamento com o mancal e o fuso com a castanha, cada um como família do contrato, com perfis, conferência, aprovação e portas nos pontos onde as peças se montam umas nas outras (a face do carro, o furo do rolamento, a castanha no fuso, as pontas do perfil). Uma montagem de prova na bancada, uma mesa linear com quadro de perfil, duas guias, fuso apoiado em dois mancais e o carro levando a castanha, sai com cada encaixe com contato medido sem atravessar.

## Filtro Agent-First

Cada elemento como família: ENVOLVER. Perfil, guia, rolamento com mancal e fuso com castanha são famílias pelo [contrato da família](../contratos/CONTRATO-DA-FAMILIA.md), como a `tubulacao`, com a tabela de norma como dado da família. O catálogo de normas único continua ADIAR: com estas quatro, serão sete famílias com tabela própria, e a decisão de juntá-las volta à pessoa no fechamento, com a medida da repetição.

Geometria: USAR DIRETO o núcleo. A seção de perfil é `extrusao` de contorno; o trilho e o carro são `extrusao` com furação por `arranja`; os anéis, as esferas e o mancal são `lathe` e esferas repetidas em volta do eixo; o fuso é a `helice` do `friso`, como a rosca do `fixador`. Nenhuma operação nova.

Posição na montagem: USAR DIRETO o `instanciaDeFamilia` com poses e as portas, como a tubulação e o par de engrenagens. O movimento do carro e da castanha fica como parâmetro de posição da montagem de prova; a articulação prismática medida contra as peças fica ADIAR, para o plano que montar uma máquina.

Perfil estrutural na `estruturaDeBarras`: ADIAR. O plano faz o perfil reto cortado como família; ligar as seções novas à `estruturaDeBarras` para o quadro de nós entra depois, se a mesa linear mostrar que o perfil avulso não basta.

## Incluído

1. O perfil estrutural reto, com corte reto ou a 45° nas pontas: I e H de abas paralelas (IPE e HEA) e U pelas tabelas públicas europeias de perfis laminados, e o alumínio ranhurado de 20, 30, 40 e 45 mm com a ranhura de cada um.
2. A guia linear de esferas, trilho e carro, pelos tamanhos 15, 20, 25 e 30, com a furação do trilho e do carro.
3. O rolamento rígido de esferas das séries 60 e 62 (furo, diâmetro externo e largura da norma ISO 15), com anéis, esferas e vedação como volume, e o mancal de pedestal com o rolamento alojado.
4. O fuso trapezoidal (Tr 10 a Tr 40, pela ISO 2904) e o de esferas só com o volume de fora, com a castanha flangeada.
5. A montagem de prova da mesa linear na bancada e no banco de provas, o mapa de ferramentas atualizado e as fichas em `npm run capacidade`.

## Excluído

O rolamento de rolos, o axial e o de agulhas, a bucha, a guia em V e a corrediça de gaveta (que fica na `movel-de-caixa`), o perfil de chapa dobrada e o tubo, a ligação dos perfis novos à `estruturaDeBarras`, a cantoneira de fixação entre perfis, o cálculo de carga, vida e rigidez, o atuador pneumático, a corrente e a esteira, a casca, a chapa e o gabinete. Peça do acervo que hoje desenha esses elementos à mão não é migrada.

## Invariantes

O núcleo não ganha nome de objeto nem operação nova, e o acervo sai igual. Cada família é determinística e cada parte é sólido fechado, num pedaço só, sem lasca, pelo teste que já corre em toda família. Os valores das tabelas são números de norma pública, sem marca de fabricante; o que só o catálogo de fabricante dá (como a altura do carro da guia) segue regra declarada da família, como as conexões de PVC da tubulação.

## Gate de saída

1. Cada família com tabela e teste de cada recusa (tamanho fora da tabela, comprimento curto, fuso mais curto que a castanha), dizendo o recebido e o aceito.
2. Cada família com perfil, conferência pelo contrato da família e o veredito da pessoa por imagem em `aprovacao.json`.
3. A mesa linear de prova montada na bancada, com cada encaixe com contato medido sem atravessar.
4. A mesa de prova abaixo de dez segundos e exportável em STEP e OBJ com as partes nomeadas.
5. `npm run gates` verde e o CI verde.

## Fatias

Cada fatia cabe numa sessão de agente despachado, entrega o teste dela e deixa o andamento escrito abaixo antes de passar à seguinte.

1. Feita em 2026-11-24: o perfil estrutural (I, H, U e alumínio ranhurado), com a aprovação da pessoa.
2. Feita em 2026-11-24: a guia linear, trilho e carro, com a aprovação da pessoa.
3. O rolamento e o mancal de pedestal, com a aprovação da pessoa.
4. O fuso e a castanha, com a aprovação da pessoa.
5. A mesa linear de prova, o banco de provas, o mapa de ferramentas, as fichas e o fechamento.

## Decisão da pessoa

Decidido em 2026-11-24: o plano entra com as quatro famílias; o fuso de esferas sai só com o volume de fora, sem as esferas de dentro; os perfis I, H e U seguem a série europeia em milímetro (IPE e HEA, e o U europeu).

## Riscos e parada

Se a tabela de um elemento pedir valor que não é de norma pública (a altura do carro da guia, o mancal de pedestal), ele sai por regra declarada da família e a fatia diz qual. Se as esferas do rolamento passarem de dois segundos por peça, elas saem como anel cheio e a fatia volta à pessoa com a medida antes de seguir.

## Andamento

Fatia 1, em 2026-11-24. A família `perfil-estrutural` faz o IPE (80 a 600), o HE A (100 a 600) e o UPN (50 a 400) pela EN 10365, lidos nas tabelas da ArcelorMittal, e o alumínio ranhurado de 20, 30, 40 e 45 mm, com a ranhura em T e o furo central por regra da família, porque não há norma pública. A seção é uma `extrusao` com as concordâncias em quatro segmentos (o raio nulo vira 0,2 mm, para o número de pontos não mudar) e o corte a 45° são prismas triangulares extrudados em x tirados por `subtrair`, com o lado de cima mais comprido; as portas `inicio` e `fim` são os planos das pontas. O teste confere que os 59 tamanhos saem num pedaço só e que a área da seção bate com a massa por metro da tabela até 2 %. A camada mecânica foi gravada depois da aprovação da pessoa por imagem.
Fatia 2, em 2026-11-24. A família `guia-linear` faz o trilho e o carro numa chamada, nos tamanhos 15, 20, 25 e 30: o trilho por `extrusao` com o canal das esferas nos dois lados e os furos com rebaixo a cada passo, centrados no comprimento, por `lathe` em z repetido por `arranja` linear; o carro como U invertido apoiado no topo do trilho, com o vão de 1 mm dos lados e quatro furos roscados, na posição pedida. As portas `base` e `mesa` são o plano de baixo do trilho e o de cima do carro. A ISO 12090-1 não tem texto público, e as medidas são as de intercâmbio usuais do mercado, como regra declarada da família. O teste confere os quatro tamanhos em dois pedaços, o carro só encostando no trilho e os furos centrados. A camada mecânica foi gravada depois da aprovação da pessoa por imagem.

## Fechamento
