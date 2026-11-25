# Elo entre juntas: a carenagem oca do membro, de uma flange de atuador à outra

**Estado:** ativo

**Território:** `procedural/familias/elo-entre-juntas/`, `tools/fixtures/elo-entre-juntas/`, `docs/modelar/banco-de-provas/elo-entre-juntas-2026-11-25/`, `procedural/familias/index.js`, `docs/modelar/ferramentas-por-objeto.json`, `tools/modelar/capacidade.mjs`.

Ativado pela pessoa em 2026-11-25, junto com o plano do atuador de junta, de que depende.

**Responsável:** a IA da sessão ou o agente despachado de cada fatia; a pessoa aprova a forma por imagem e decide o que está em Decisão da pessoa.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-25.

## Problema observado

O humanoide e o quadrúpede pedem, no [mapa de ferramentas por objeto](../pesquisas/FERRAMENTAS-POR-OBJETO.md), o loft liso e a casca, além da articulação: o membro de um robô é uma carenagem oca de parede fina que liga a flange de um atuador à do próximo, com a forma do braço, da coxa ou da canela. Hoje a IA faria cada membro à mão, com o loft, a casca e os furos de fixação de cada ponta calculados separados, e repetiria isso em cada membro.

Ele ainda não foi feito porque a casca do núcleo recusava o loft côncavo até 2026-11-25, quando o plano de casca, chapa e gabinete trouxe a casca pela receita (`passosDaCascaDoLoft`), e porque não havia o atuador com as flanges para o elo prender. Os dois chegam agora: a casca pela receita está na main, e o plano do atuador de junta faz as flanges.

## Resultado

O agente pede o elo entre duas juntas pelas portas das flanges (posição, eixo e diâmetro de cada uma) e pela seção (redonda, elíptica ou de cantos arredondados, com a cintura ou a barriga declarada) e recebe a carenagem oca, de parede da espessura pedida, com a boca de cada ponta casada com a flange do atuador e a furação de fixação, e as portas das duas pontas.

## Filtro Agent-First

Elo como família: ENVOLVER, pelo contrato da família, com a casca pela receita (`passosDaCascaDoLoft`) para a parede e o loft das seções entre as duas flanges.

As pontas: USAR DIRETO a porta da flange do atuador de junta (o anel e o padrão de furos) para posicionar a boca e furar a fixação.

Membro torto (as duas juntas em eixos diferentes, como o cotovelo e o joelho): ENVOLVER o caminho do loft entre as duas flanges, com as seções girando de uma orientação à outra.

## Incluído

1. O elo reto entre duas flanges coaxiais, com a seção e a cintura declaradas, a parede da casca pela receita e a furação de fixação nas duas bocas.
2. O elo com desvio, entre flanges de eixos diferentes, com o caminho curvo e as seções girando.
3. A perna de prova: três atuadores (quadril, joelho e tornozelo) e dois elos, montada com as articulações, cada encaixe com contato medido e o curso de cada junta conferido.
4. O banco de provas, o mapa de ferramentas, a ficha e o fechamento.

## Excluído

O tronco, a cabeça, a mão e o pé (que pedem outras formas), a carenagem que cobre a própria junta, o chicote de cabos por dentro do elo, a superfície por subdivisão e o cálculo de rigidez.

## Invariantes

O núcleo não ganha nome de objeto nem operação nova, e o acervo sai igual. A família é determinística e cada parte é sólido fechado, num pedaço só, sem lasca.

## Gate de saída

1. A família com teste de cada recusa (flanges que não cabem na seção, parede que fecha a seção), dizendo o recebido e o aceito.
2. Cada forma do elo com perfil, conferência e o veredito da pessoa por imagem em `aprovacao.json`.
3. A perna de prova montada, com a boca de cada elo só encostando na flange do atuador, nada atravessado e o curso de cada junta conferido.
4. A perna abaixo de dez segundos e exportável em STEP e OBJ com as partes nomeadas; `npm run gates` verde e o CI verde.

## Fatias

1. O elo reto, com a aprovação da pessoa (espera a fatia 1 do atuador de junta).
2. O elo com desvio, com a aprovação da pessoa.
3. A perna de prova, com as articulações (espera a fatia 3 do atuador de junta).
4. O banco de provas, o mapa de ferramentas, a ficha e o fechamento.

## Decisão da pessoa

Decidido em 2026-11-25, pela recomendação: a seção padrão do membro é a elíptica de cantos suaves e a parede padrão é de 2 mm, as duas trocáveis por parâmetro. As linhas de painel ficam para o plano de acabamento de hard surface.

## Riscos e parada

Se a seção, ao girar no elo com desvio, torcer a superfície ou fechar a parede da casca, a fatia mede o giro máximo aceito e volta à pessoa.

## Andamento

## Fechamento
