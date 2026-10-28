# Cadeira: regras construtivas e medida de proporção contra o alvo

Família `procedural/familias/cadeira/` (versão 1.2.0, primeira rodada: os cinco perfis de encosto alto). A prancha `cadeira-prancha.png` (nesta pasta) mostra a malha executada de cada perfil em quatro vistas, isométrica, frontal, lateral e superior, sem o alvo, e três recortes ampliados 3x da isométrica por perfil (base do poste, topo do poste e encontro travessa-poste; sem postes, base e topo do encosto e a ponta da travessa) para conferir lascas. Ela sai de `node tools/modelar/cadeiras-medida.mjs prancha`, e a tabela abaixo de `node tools/modelar/cadeiras-medida.mjs medidas`.

## O alvo vale só para a proporção

Os esboços traduzidos das receitas de origem têm peças que se atravessam (por exemplo poste e almofada em 52 mm na `cadeira_almofadada_clara`) e lados assimétricos, e a família não os copia. O alvo serve para largura, profundidade, altura, espessura e altura do assento, seção das pernas e número de ripas. A caixa envolvente do alvo vem das caixas que `descreverEsboco` lê, com o ajuste da pessoa na `cadeira_almofadada_clara` (o topo das pernas da frente encosta no assento). Compara-se o tamanho por eixo (largura x, altura y, profundidade z, frente em +z), porque as receitas de origem não são centradas no assento e a família é.

| perfil | receita alvo | eixo | alvo (mm) | família (mm) | diferença (mm) | diferença (%) |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| cadeira-branca-de-madeira | cadeira_almofadada_clara | largura (x) | 465,5 | 465,5 | +0,0 | +0,0 |
|  |  | altura (y) | 1083,8 | 1083,8 | +0,0 | +0,0 |
|  |  | profundidade (z) | 471,7 | 471,7 | +0,0 | +0,0 |
| cadeira-branca-simples | cadeira_basica_clara | largura (x) | 503,4 | 503,4 | +0,0 | +0,0 |
|  |  | altura (y) | 1002,9 | 1002,9 | +0,0 | +0,0 |
|  |  | profundidade (z) | 510,4 | 510,4 | +0,0 | +0,0 |
| cadeira-de-madeira | cadeira_ripada_simples | largura (x) | 510,0 | 510,0 | +0,0 | +0,0 |
|  |  | altura (y) | 1120,0 | 1120,0 | +0,0 | +0,0 |
|  |  | profundidade (z) | 540,0 | 540,0 | +0,0 | +0,0 |
| cadeira-rustica | cadeira_desgastada_madeira | largura (x) | 600,0 | 600,0 | +0,0 | +0,0 |
|  |  | altura (y) | 1050,0 | 1050,0 | +0,0 | +0,0 |
|  |  | profundidade (z) | 563,0 | 545,0 | −18,0 | −3,2 |
| cadeira-trabalhada | cadeira_ripada_marrom | largura (x) | 482,6 | 478,0 | −4,6 | −1,0 |
|  |  | altura (y) | 1001,3 | 1001,3 | +0,0 | +0,0 |
|  |  | profundidade (z) | 479,1 | 476,0 | −3,1 | −0,6 |

A caixa envolvente fica dentro de 3% por eixo em quatro perfis. A `cadeira-rustica` fica 3,2% abaixo na profundidade (545 contra 563 mm) porque os pregos do encosto, que a família não desenha, saem 8 mm do alvo e a travessa do encosto da receita passa 10 mm da face de trás das pernas. Sem os pregos o alvo mede 555 mm e a diferença é de 1,8%. As correções de posicionamento não afastaram nenhum perfil do alvo além do que já estava. A `cadeira-de-madeira` volta a 1120 mm de altura: o topo da travessa alta e o dos postes são o mesmo.

Proporções que não são a caixa envolvente, e onde a família difere do alvo:

| perfil | diferença |
| --- | --- |
| cadeira-de-madeira | a saia é uma moldura entre as pernas, com a espessura da perna menos 6 mm (49 mm), e a receita tem um bloco cheio de 470 por 500 mm sob o assento; a travessa alta e a baixa têm a profundidade dos postes (55 mm), e a receita as tem com 30 mm |
| cadeira-trabalhada | a seção das pernas e dos postes é uma só (60 por 34 mm), e a receita tem pernas de 66 por 27 mm e postes de 50 por 36 mm; a travessa alta (208,6 mm de altura) apoia sobre os postes, que acabam em 793 mm, com as faces de trás, da frente e de fora alinhadas com as deles, e a receita tem postes até 817 mm e a travessa 1 a 3 mm fora de alinhamento |
| cadeira-branca-simples | nenhuma além da caixa |
| cadeira-branca-de-madeira | a travessa alta chega a 1060 mm e os postes a 1083,8 mm, como na receita; a saia tem a espessura da perna menos 6 mm (46 mm), e a receita tem 20 mm; os recuos das pernas são de 5 mm, e a receita as tem rentes às bordas do assento |
| cadeira-rustica | as três tábuas de encosto têm a mesma altura (1050 mm), e na receita são 1050, 1000 e 1030 mm; a família acrescenta saias nos quatro lados (64 mm de espessura) para apoiar as tábuas do assento, e as tábuas do encosto se apoiam no assento (a receita as faz descer 60 mm por trás dele) |

## Regras construtivas, medidas por teste

`cadeira.test.mjs` mede cada regra na geometria dos cinco perfis e dos três pontos aprovados (mínimo, médio e máximo).

1. Simetria: toda caixa tem uma caixa espelhada em x = 0 com as mesmas faixas em y e z, o assento é centrado, e as quatro pernas ficam à mesma distância das bordas do assento.
2. Cada poste tem o mesmo x, o mesmo z e a mesma seção da perna de trás do mesmo lado, e começa acima dela (nenhuma peça duplicada).
3. O topo de cada perna fica a até 1 mm da face de baixo do assento (0,5 mm dentro dele), e o poste começa a até 1 mm da face de cima do assento.
4. Nenhum par de peças se atravessa mais que 1 mm, as travessas encostam nos dois postes, e todas as peças formam um conjunto ligado por contato.
5. Nenhuma peça passa do contorno do assento nem fica abaixo do chão.

O portão de contato do esboço (`descreverEsboco`) roda sobre as caixas separadas da família, e o teste reprova atravessamento acima de 1 mm e peça solta. As restrições do contrato recusam as combinações que quebrariam uma regra (ripas soltas, travessa alta ao lado dos postes, saia mais grossa que a perna, assento de tábuas sem saia nos lados, entre outras).

## Degraus e lascas

Os defeitos que a pessoa circulou nas isométricas eram degraus de 1 a 2 mm entre faces que deviam ser alinhadas, medidos na geometria: topo dos postes (1121 mm) um milímetro acima do da travessa alta (1120 mm) na `cadeira-de-madeira`, face de trás das travessas 2 mm para dentro da dos postes nessa e na `cadeira-branca-de-madeira`, travessa alta e postes da `cadeira-trabalhada` 1 a 2 mm fora de alinhamento em z, e a travessa da `cadeira-rustica` 1 mm mais curta que a ripa de fora. A causa era o recuo de 1 a 2 mm que a geometria usava para não deixar faces coplanares na união; ele criava uma saliência visível.

A regra nova, medida por teste sobre as caixas dos cinco perfis e dos pontos mínimo, médio e máximo: duas caixas que se tocam não podem ter faces paralelas do mesmo lado com diferença entre 0,25 e 5 mm. As faces ou ficam alinhadas (diferença menor que 0,25 mm) ou diferem por 5 mm ou mais de propósito. Vale para topos, pontas e laterais. Os 0,5 mm que uma peça entra na outra valem só como penetração (máximo de uma contra mínimo da outra) e nunca definem uma face externa. O teste da regra também confere que ela reprova uma diferença de 1 mm.

O que mudou para obedecer: com postes, as travessas têm a profundidade deles, com as faces de trás e da frente alinhadas; o topo da travessa alta é o dos postes, ou fica 5 mm ou mais abaixo, ou ela apoia sobre os postes com as faces alinhadas (a `cadeira-trabalhada`); a ripa tem a profundidade da perna ou 10 mm a menos; a saia tem a face de dentro alinhada com a da perna e a de fora recuada 6 mm, e o topo igual ao das pernas; o travessão tem 12 mm a menos que a perna; sem postes, as pontas da travessa são as da ripa de fora. Os recuos das pernas passaram a ter mínimo de 5 mm (a perna rente à borda do assento deixava uma face coplanar com a dele). O parâmetro `espessuraDaSaia` saiu da família, porque a regra a fixa, e `larguraDasTravessas` já tinha saído. A perna tem no mínimo 40 mm de largura e 30 de profundidade.

A `cadeira-branca-simples`, base do poste esquerdo: a medida mostra o poste a 12 mm da lateral e a 18 mm do fundo do assento, e sem degrau de face. Ele sai da face de cima do assento recuado, e a decisão de aceitar essa aparência de poste apoiado dentro do assento é da pessoa; não mudei nada nele.

## Triangulação nas faces

A malha que a união devolve traz faces planas largas divididas em triângulos compridos, e a prancha anterior desenhava todas as arestas, o que mostrava diagonais no assento e no encosto. A causa é a triangulação da união de sólidos; ela não muda a forma. A prancha agora desenha só as arestas entre faces de normais diferentes e as arestas de borda, e as diagonais somem. A malha em si continua com os triângulos, e uma exportação que meça aresta por face os verá.
