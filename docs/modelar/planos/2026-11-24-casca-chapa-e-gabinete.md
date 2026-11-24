# Casca, chapa dobrada e gabinete: a parede fina de forma livre, a chapa com abas em várias bordas e a caixa de equipamento

**Estado:** ativo

**Território:** `procedural/familias/gabinete/`, `procedural/familias/index.js`, `procedural/extensoes/chapa-dobrada/`, `procedural/nucleo/casca.js`, `procedural/nucleo/casca.test.mjs`, `procedural/nucleo/casca-pela-receita.js`, `procedural/nucleo/casca-pela-receita.test.mjs`, `tools/fixtures/casca-chapa-e-gabinete/`, `docs/modelar/banco-de-provas/casca-chapa-e-gabinete-2026-11-24/`, `docs/modelar/ferramentas-por-objeto.json`, `tools/modelar/capacidade.mjs`.

Ativado pela pessoa em 2026-11-24, para que agentes despachados avancem nas fatias uma a uma.

**Responsável:** a IA da sessão ou o agente despachado de cada fatia; a pessoa aprova a forma por imagem e decide o que está em Decisão da pessoa. As fatias que mudam o núcleo passam pelo `revisor-adversarial` antes do envio.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-24.

## Problema observado

Pelo [mapa de ferramentas por objeto](../pesquisas/FERRAMENTAS-POR-OBJETO.md), a casca com espessura é a ferramenta mais pedida da lista (125 objetos), a chapa dobrada vem logo abaixo (62) e o gabinete tem 57. Nas máquinas industriais, pesadas e agrícolas, a casca e a chapa são as duas primeiras da contagem (23 e 20 pedidos), à frente de tudo o que os planos de transmissão, tubulação e elementos de máquina fizeram. As três existem só em parte, e o que falta em cada uma é diferente.

A casca existe no núcleo (`procedural/nucleo/casca.js`, desde 2026-11-22) e recua cada face do sólido pela espessura, para dentro. Ela é exata em sólido de três faces por vértice (caixa, cilindro, loft de duas seções com tampas) e em sólido convexo de até 150 faces, e recusa o sólido côncavo com vértice de quatro faces ou mais, que é o caso da carenagem, do capô, do tanque com reentrância e do corpo de bomba. A parede para fora também não existe. O `levelSet` do Manifold foi medido e descartado (milhares de triângulos e erro de até 23 % da espessura nas quinas).

A chapa dobrada existe como extensão nativa (`procedural/extensoes/chapa-dobrada/`): uma seção de abas e dobras com raio, extrudada na largura, com o planificado da seção pelo fator K. Ela faz a chapa de uma linha de dobras só (um U, um Z, uma cantoneira, um rolo). A caixa de chapa, que é uma base com abas dobradas em várias bordas, não sai dela, porque as abas de bordas vizinhas se encontram no canto e pedem o alívio de canto; o planificado da peça inteira também não.

O gabinete existe como a família `aparelho-de-caixa` (forno elétrico, micro-ondas, fritadeira de forno e lava-louças compacta), com caixa, porta, painel e pés. A caixa de equipamento genérica não existe: as duas metades com o encaixe entre elas, os ressaltos para parafuso, a grade de ventilação e os recortes de painel. Hoje a IA que modela o painel elétrico de uma máquina, a carenagem de um motor ou a caixa de um controlador faz cada uma dessas coisas à mão.

As três ainda não foram completadas porque cada uma pede um tipo de trabalho que os planos recentes evitaram de propósito. A casca côncava e a chapa de várias bordas mudam o núcleo e as extensões, com risco para as peças do acervo que já usam a casca e a chapa. O gabinete depende de duas ferramentas que também não existem, o ressalto para parafuso e a furação em padrão (grade e favo), e o mapa dá as duas como ausentes ou parciais.

## Resultado

O agente pede a casca de um sólido feito por `loft`, `extrusao` ou `lathe` com a espessura e as faces abertas, para dentro ou para fora, inclusive na forma côncava; pede a chapa como uma base com abas dobradas nas bordas escolhidas, com o alívio de canto e o planificado da peça inteira; e pede o gabinete como uma família de caixa de equipamento com tampa, encaixe, ressaltos, grade de ventilação e recortes, cada um por parâmetro.

## Filtro Agent-First

Gabinete como família: ENVOLVER. É a peça de mais valor e menos risco: a caixa reta ou de cantos arredondados é convexa, e a casca de hoje já a esvazia. O ressalto e a grade entram como composições dentro da família, sem operação nova. Vai primeiro.

Chapa de várias bordas: ENVOLVER a extensão `chapaDobrada` num modo novo, de base com abas por aresta, reaproveitando a conta de dobra, de recuo e de fator K de `chapa.js`. O alívio de canto é um recorte declarado (retangular ou redondo) na base, no ponto onde duas abas se encontram, e o planificado é o contorno plano da base com as abas abertas, calculado pela mesma conta.

Casca côncava: ENVOLVER a casca existente com um segundo caminho, pela receita em vez da malha. Para o sólido de `loft`, a cavidade é o loft das seções recuadas em 2D por `deslocarContorno`, que já existe; para a `extrusao` e o `lathe`, é o perfil recuado. A cavidade sai pela mesma origem do sólido, e `subtrair` a tira. A parede para fora é o mesmo cálculo com o recuo negativo. A casca pela malha continua como está para os casos que ela já cobre.

Furação em padrão e ressalto como ferramentas gerais: ADIAR. Entram como parte do gabinete; viram ferramenta própria quando uma segunda família pedir.

## Incluído

1. A família `gabinete`: caixa reta ou de cantos arredondados, esvaziada pela casca, partida em base e tampa num plano declarado, com o degrau de encaixe entre as duas, ressaltos com furo nos cantos de dentro, grade de ventilação em rasgos ou furos numa face escolhida, recortes retangulares e redondos de painel e pés opcionais; as portas são os planos de apoio e os furos dos ressaltos.
2. O modo de base com abas da `chapaDobrada`: base de contorno poligonal, aba em cada aresta escolhida com ângulo, raio e comprimento, alívio de canto retangular ou redondo onde duas abas se encontram e o planificado da peça inteira como contorno 2D e como medida.
3. A casca pela receita para `loft`, `extrusao` e `lathe`, para dentro e para fora, com a espessura medida sobre a malha que sai pelas mesmas conferências da casca de hoje (`desvioDePlano`, `espessuraMinima`).
4. Uma peça de prova de cada ferramenta na bancada, o mapa de ferramentas atualizado e as fichas.

## Excluído

A casca de forma livre por malha (sem a receita), o `levelSet`, a casca com espessura variável, a chapa com dobra fora de aresta reta, a estampagem, a costura soldada entre abas, o painel com dobradiça, a junta de vedação do gabinete, a nervura entre paredes (ferramenta `nervura`, para outro plano), a rosca nos ressaltos e a migração das peças do acervo que usam casca ou chapa.

## Invariantes

O núcleo não ganha nome de objeto. A casca pela malha e a chapa de uma linha de dobras saem iguais, byte a byte, nas peças do acervo que as usam, e a assinatura dessas peças não muda. Cada parte é sólido fechado, sem lasca. A família `gabinete` é determinística, e o planificado sai da mesma conta que dobra a chapa.

## Gate de saída

1. O gabinete de prova com base, tampa, encaixe, quatro ressaltos, uma grade e dois recortes: a tampa só encosta na base pelo encaixe, sem atravessar, e cada ressalto tem o furo.
2. A caixa de chapa de prova com base e quatro abas, com o alívio nos quatro cantos, sem abas atravessadas, e o planificado com a área igual à da chapa dobrada pela linha neutra, até 0,5 %.
3. A casca côncava de prova (um loft de várias seções com reentrância) com a parede medida dentro da tolerância da casca de hoje, e a mesma peça com a parede para fora.
4. As peças do acervo que usam `casca` e `chapaDobrada` com a assinatura igual à de antes, pelo gate de assinaturas do acervo.
5. Cada prova abaixo de dez segundos, exportável em STEP e OBJ; `npm run gates` verde e o CI verde.

## Fatias

Cada fatia cabe numa sessão de agente despachado, entrega o teste dela e deixa o andamento escrito abaixo antes de passar à seguinte.

1. A família `gabinete` com a caixa, a tampa, o encaixe e os ressaltos, com a aprovação da pessoa.
2. A grade de ventilação e os recortes de painel no gabinete, e o gabinete de prova, com a aprovação da pessoa.
3. O modo de base com abas da `chapaDobrada`, com o alívio de canto e o planificado, a caixa de chapa de prova, o gabinete de chapa como opção da família e a aprovação da pessoa; passa pelo revisor adversarial.
4. A casca pela receita para `loft`, `extrusao` e `lathe`, para dentro e para fora, a casca côncava de prova e a aprovação da pessoa; passa pelo revisor adversarial.
5. O banco de provas, o mapa de ferramentas, as fichas e o fechamento.

## Decisão da pessoa

Decidido em 2026-11-24: a ordem é gabinete, chapa e casca, do menor risco ao maior; a casca para fora entra junto da para dentro; e o gabinete começa só de plástico, com o gabinete de chapa entrando como opção da família na fatia 3, depois do modo de base com abas da `chapaDobrada`. A chapa não está em outro plano ativo (a "lataria numa chapa só" do plano do carro é a superfície da carroceria, outra coisa).

## Riscos e parada

Se a casca pela receita mudar a assinatura de alguma peça do acervo, a fatia para e volta à pessoa com a lista das peças e o desvio. Se o loft das seções recuadas cruzar a si mesmo (seção fina demais para a espessura), a casca recusa dizendo a seção e a espessura máxima que ela aceita. Se o alívio de canto não fechar o sólido em ângulos de aba diferentes de 90°, a chapa aceita só 90° nas abas vizinhas e a fatia volta à pessoa com a medida.

## Andamento

## Fechamento
