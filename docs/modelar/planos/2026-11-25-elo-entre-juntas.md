# Elo entre juntas: a carenagem oca do membro, de uma flange de atuador à outra

**Estado:** concluído

**Núcleo:** não

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

Membro torto (as flanges das duas pontas em eixos diferentes; no cotovelo e no joelho os eixos de flexão são paralelos e o membro corre entre eles, o que pede uma curva em cada boca): ENVOLVER o caminho do loft entre as duas flanges, com as seções girando de uma orientação à outra.

## Incluído

1. O elo reto entre duas flanges coaxiais, com a seção e a cintura declaradas, a parede da casca pela receita e a furação de fixação nas duas bocas.
2. O elo com desvio, entre flanges de eixos diferentes, com o caminho curvo e as seções girando, e a curva nas duas bocas, para as juntas de eixos paralelos.
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
2b. A curva na boca A, para ligar juntas de eixos paralelos (coxa e canela), com a aprovação da pessoa.
3. A perna de prova, com as articulações (espera a fatia 3 do atuador de junta).
4. O banco de provas, o mapa de ferramentas, a ficha e o fechamento.

## Decisão da pessoa

Decidido em 2026-11-25, pela recomendação: a seção padrão do membro é a elíptica de cantos suaves e a parede padrão é de 2 mm, as duas trocáveis por parâmetro. As linhas de painel ficam para o plano de acabamento de hard surface.

Decidido em 2026-11-26, junto com a ativação do [esqueleto de proporção](../decisoes/PLANOS-ENCERRADOS.md): a perna de prova da fatia 3 tira a posição das juntas do esqueleto aprovado do humanoide, aprovado em 2026-11-26, em `procedural/pecas/esqueleto-humanoide/`.

Decidido em 2026-11-26, com a frase "pode seguir com a curva na outra ponta": a perna de prova parou porque as juntas de flexão do esqueleto têm eixos paralelos e o elo de uma curva só ligaria o joelho com o eixo ao longo do membro; o elo ganha a curva na boca A (fatia 2b) antes da perna. O plano dava o cotovelo e o joelho como juntas de eixos diferentes, e nenhum gate pegaria o erro; o pedido de toda fatia que monta membro passa a mandar conferir o eixo de cada junta do esqueleto contra o eixo da flange do atuador antes de escolher o elo.

## Riscos e parada

Se a seção, ao girar no elo com desvio, torcer a superfície ou fechar a parede da casca, a fatia mede o giro máximo aceito e volta à pessoa.

## Andamento

Fatia 1 feita em 2026-11-26: a família `elo-entre-juntas` (o elo reto entre duas flanges coaxiais, seção elíptica, redonda ou de cantos arredondados, cintura ou barriga, parede pela casca da receita e a furação de cada boca no padrão da flange), com as recusas testadas e a aprovação mecânica, e a peça de prova do antebraço entre dois atuadores, aprovada pela pessoa por imagem em 2026-11-26 ("aprovo o elo reto, pode seguir"). As provas estão no banco de provas do plano.

Fatia 2 feita em 2026-11-26: o elo com desvio (`desvio` de 0 a 90 graus, `azimute` e `deslocamentoLateral`, com o caminho curvo tangente às duas bocas e as seções girando sem torcer), o elo reto saindo igual bit a bit com desvio zero, e a restrição `curva-fecha-a-parede`, que pede raio de curvatura de 2,5 vezes a maior meia largura da seção: a canela e o antebraço chegam aos 90 graus, o elo de 150 mm a 68,8 e o de 100 mm a 36,7. A pessoa aprovou por imagem em 2026-11-26 ("aprovo, pode conferir e seguir"), e a conferência do contorno serrilhado da vista de cima mostrou que a parede não ondula.

Fatia 2b feita em 2026-11-26: a curva na boca A (`desvioA`, `azimuteA`), com o caminho de duas curvas em S ou em U, as restrições `curva-dupla-fecha-a-parede` e `curvas-no-mesmo-plano`, e o elo de uma curva saindo igual bit a bit com a nova em zero; o comprimento máximo da família subiu de 800 para 1.300 mm, para o ponto máximo da aprovação mecânica caber com as duas curvas, e o `deslocamentoLateral` não tem efeito na curva dupla. A pessoa aprovou a coxa em U por imagem em 2026-11-26 ("aprovo a coxa em U, pode montar a perna"), com o S mostrado como alternativa.

Fatia 3 feita em 2026-11-27: a perna de prova (`tools/fixtures/elo-entre-juntas/perna-de-prova.mjs`), com os atuadores de quadril, joelho e tornozelo e a coxa e a canela em U, nas alturas, eixos e cursos do esqueleto aprovado, montada só pelas portas: só as sete flanges encostam, nada atravessa, o curso de cada junta e a perna dobrada passam sem colisão, a montagem resolve em cerca de 5 s e exporta em STEP e OBJ com as oito partes. A perna ficou com 387 mm de largura e em zigue-zague: o U põe cada atuador entre a coxa e a canela, que se curvam para lados opostos, e o raio mínimo da curva na boca larga do atuador dá arcos de 155 mm; nenhuma escolha de sentido dos eixos estreita a perna, e ela foi posta a 20 mm da linha do meio. A pessoa decidiu fechar o plano assim em 2026-11-27 ("pode fechar o plano assim"), com a perna estreita num plano próprio.

Fatia 4 feita em 2026-11-27: o banco de provas com as imagens aprovadas e as medidas, a ficha da família no catálogo de capacidade e a exportação da perna entre os testes lentos.

## Fechamento

Concluído em 2026-11-27 no ramo `claude/admiring-rubin-h9zjwx`, sem PR, com `npm run gates` verde em cada envio. A família `elo-entre-juntas` faz o membro oco entre duas flanges de atuador: reto, com uma curva ou com uma curva em cada boca, com as recusas testadas e a aprovação mecânica, e as formas aprovadas pela pessoa por imagem. A perna de prova prova o encaixe, os cursos e a exportação, mas sai larga; vão ao backlog a perna estreita (a flange de fixação menor no atuador, a curva mais fechada com reforço por dentro ou o elo de chapa preso ao lado), a instrução de que em cadeia cada atuador gira meia volta em relação ao anterior, e a recusa da exportação que não aponta a face de id repetido.
