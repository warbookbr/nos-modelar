# Atuador de junta: o motor com redutor numa carcaça, com as flanges de saída e de fixação e o eixo da junta

**Estado:** ativo

**Território:** `procedural/familias/atuador-de-junta/`, `procedural/familias/index.js`, `tools/fixtures/atuador-de-junta/`, `docs/modelar/banco-de-provas/atuador-de-junta-2026-11-25/`, `docs/modelar/ferramentas-por-objeto.json`, `tools/modelar/capacidade.mjs`.

Ativado pela pessoa em 2026-11-25, para que agentes despachados avancem nas fatias uma a uma.

**Responsável:** a IA da sessão ou o agente despachado de cada fatia; a pessoa aprova a forma por imagem e decide o que está em Decisão da pessoa.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-25.

## Problema observado

O [mapa de ferramentas por objeto](../pesquisas/FERRAMENTAS-POR-OBJETO.md) pede a articulação para 8 dos 13 robôs (braço industrial, SCARA, delta, humanoide, quadrúpede, garra, efetuador e exoesqueleto), e ela existe só em parte: a extensão de articulação de revolução e prismática, com o curso conferido, e a família `dobradica`. O que se repete em todo robô, e que hoje a IA desenha à mão em cada junta, é o atuador da junta: o motor com o redutor numa carcaça, com a flange que gira na saída, a flange que prende na estrutura, a furação das duas e o eixo de giro. Um humanoide tem de 20 a 30 deles.

Ele ainda não foi feito porque o único robô do acervo (o braço robótico) e o braço de prova de duas juntas usam motores de passo comprados como caixa com eixo, e o plano do braço de prova deixou a família do motor para quando outro objeto pedisse mais que a caixa. O humanoide é esse objeto: a junta dele é o atuador inteiro, e as carenagens dos membros prendem nas flanges dele.

## Resultado

O agente pede o atuador de junta pelo tamanho e pela forma (cilíndrico, de saída na face, ou de caixa, de saída no lado) e recebe a carcaça com o motor e o redutor como volume, a flange de saída e a de fixação com a furação, o conector e as portas: o eixo da junta, a flange de saída e a de fixação, com a articulação de revolução declarada e o curso conferido contra as peças vizinhas.

## Filtro Agent-First

Atuador como família: ENVOLVER, pelo [contrato da família](../contratos/CONTRATO-DA-FAMILIA.md), com a tabela de tamanhos como dado da família, como a `fixador` e a `rolamento`. Não há norma pública de atuador de robô: os tamanhos seguem regra da família, na proporção dos atuadores de mercado, sem marca.

Geometria: USAR DIRETO o `lathe` para a carcaça cilíndrica e as flanges, a `extrusao` para a carcaça de caixa e o `arranja` radial para a furação, como no `rolamento` e no `fuso`.

Junta: USAR DIRETO a extensão de articulação de revolução e o `conferirArticulacao` do núcleo, com o eixo publicado pela família como porta.

Motor e redutor por dentro: ADIAR. O atuador sai como volume de fora, com o motor e o redutor como partes internas só se uma fatia mostrar que a massa ou a vista pedem.

## Incluído

1. O atuador cilíndrico, de saída na face: a carcaça de diâmetro e comprimento da tabela, a flange de saída que gira, com a furação em círculo, a flange de fixação atrás ou em volta, com a furação, e a saída do cabo.
2. O atuador de caixa, de saída no lado (o servo de robô pequeno): a caixa, o eixo de saída com a flange redonda (o "horn"), as orelhas de fixação e a furação.
3. As portas do eixo, da flange de saída e da flange de fixação, e a articulação de revolução com o curso, conferida numa montagem de prova de duas juntas.
4. O banco de provas, o mapa de ferramentas, a ficha e o fechamento.

## Excluído

O motor, o redutor e o encoder por dentro, o cálculo de torque, velocidade e massa pelo motor, o atuador linear (que é o `cilindro-hidraulico` e o `fuso`), a junta de dois graus de liberdade num corpo só e o chicote de cabos.

## Invariantes

O núcleo não ganha nome de objeto nem operação nova, e o acervo sai igual. A família é determinística e cada parte é sólido fechado, num pedaço só, sem lasca. Os tamanhos são regra da família, sem marca de fabricante.

## Gate de saída

1. A família com tabela e teste de cada recusa, dizendo o recebido e o aceito.
2. Cada forma com perfil, conferência pelo contrato da família e o veredito da pessoa por imagem em `aprovacao.json`.
3. A montagem de prova de duas juntas, com o atuador de uma preso na flange de saída da outra, só encostando, e o curso de cada junta conferido sem colisão.
4. A montagem abaixo de dez segundos e exportável em STEP e OBJ com as partes nomeadas; `npm run gates` verde e o CI verde.

## Fatias

1. Feita em 2026-11-25: o atuador cilíndrico, com a aprovação da pessoa.
2. Feita em 2026-11-25: o atuador de caixa, com a aprovação da pessoa.
3. As portas, a articulação e a montagem de prova de duas juntas.
4. O banco de provas, o mapa de ferramentas, a ficha e o fechamento.

## Decisão da pessoa

Decidido em 2026-11-25, pela recomendação: o cilíndrico de 40, 60, 80, 100 e 120 mm de diâmetro, o de caixa nos tamanhos de servo pequeno, médio e grande (caixa de uns 23, 40 e 60 mm), e a flange de saída como a face toda girando. O chanfro nas bordas das flanges e da carcaça sai do próprio perfil torneado, como opção da família.

## Riscos e parada

Se a articulação de revolução não conferir o curso com a carcaça do atuador vizinho por causa da faceta, a fatia mede a folga mínima e volta à pessoa.

## Andamento

Fatia 1, em 2026-11-25. A família `atuador-de-junta` faz o atuador cilíndrico de 40, 60, 80, 100 e 120 mm: a carcaça torneada com a flange de fixação atrás (furos passantes em círculo, por `arranja` radial), o corpo com as bordas chanfradas e a saída do cabo de lado, unida; e a flange de saída que gira, peça à parte sobre a face da frente, com os furos cegos. As portas `fixacao` e `saida` são o padrão dos furos de cada flange. A conferência pegou duas coisas: o padrão circular da porta mede o ângulo no quadro do plano de apoio, que para a normal de trás e para a da frente gira diferente, e o furo 0 passou a ser declarado em 90° + 180°/n atrás e em −90° − 180°/n na frente; e, com três furos, a porta de fixação acusou peça junto do furo maior que o furo, caso que não ficou explicado e que levou o mínimo a quatro furos, o que os atuadores reais usam. A camada mecânica foi gravada depois da aprovação da pessoa por imagem.

Fatia 2, em 2026-11-25. A forma 2 da mesma família é o atuador de caixa, o servo pequeno, médio e grande (caixa de 23, 40 e 60 mm), com `parametrosDoServo(tamanho)` em `servo.js`: a caixa e as orelhas de fixação por `extrusao` em y, unidas à torre do eixo deslocada para uma ponta e à saída do cabo na outra, menos os quatro furos das orelhas; e o horn que gira, peça à parte sobre a torre, com quatro furos cegos em cruz por `arranja` radial. A porta `fixacao` é a lista dos quatro centros dos furos das orelhas, e a `saida` é o padrão circular do horn. As restrições de cada forma passam a valer só nela, pelo fator da forma na expressão, como na tubulação. A camada mecânica foi gravada depois da aprovação da pessoa por imagem.

## Fechamento
