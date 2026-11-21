# Curvas lisas e zebra numérica: a curva lida da prancha vira poucos trechos de curvatura monótona, e a ondulação longa que o crítico vê vira número

**Estado:** concluído

**Território:** `procedural/nucleo/ajuste-de-curva-lisa.js` e o teste dele, `tools/modelar/zebra-numerica.mjs` e o teste dele, `tools/modelar/suavidade-por-regiao.mjs` (só o aviso de área), `tools/fixtures/curvas-lisas/`, `docs/modelar/banco-de-provas/curvas-lisas-2026-11-17/`. A lataria do carro entra como prova pelo plano do carro, e a medida nova pode ler o oráculo e as chapas de prova da correção de superfície sem mudá-las, porque são do plano da correção de superfície.

**Responsável:** a IA da sessão implementa e conduz a revisão adversarial; Tiago decidiu em 2026-11-17 pausar as rodadas do carro e escrever este plano, e aprova a forma do carro por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-17 (57c39806), ativado pela pessoa em 2026-11-17 na vaga da leitura por partes, que foi congelada.

## Problema observado

Cinco rodadas do quarto traseiro do `carro-fastback` pararam em 6,8 com a silhueta conferida nas três pranchas e a forma toda presente: o que reprova é a chapa não lisa, com anéis e ondas de 200 a 500 mm na zebra da lateral (registros em `procedural/pecas/carro-fastback/partes/lataria/rodadas/`). O estudo de 2026-11-17 e a medida de controle da rodada 5 mostraram que a causa são as curvas-guia lidas ponto a ponto da prancha: polígono com filete por vértice na planta, poligonais com média gaussiana nos níveis e na queda, cada vértice virando uma lombada de curvatura. Trocadas por curvas lisas, as ilhas da porta caíram de 27 para 4. Faltam duas ferramentas. O ajuste da planta à mão, por clotoides, não convergiu a 3 mm dos pontos, porque o núcleo não tem ajuste de curva lisa; e o índice de suavidade, que ajusta em 40 mm, é cego a essa onda longa e caótico com a densidade de pontos, de modo que nenhuma medida estável diz se uma mudança melhorou o que o crítico vê.

## Resultado

Uma curva dada por pontos e tolerância sai como poucos trechos de curvatura monótona, com o número de inflexões declarado e o desvio a cada ponto medido; e uma medida sobre a superfície limite conta, por região e por faixa de comprimento de onda, os extremos da normal e os laços fechados de isofota que a zebra mostra, estável com a densidade de pontos.

## Filtro Agent-First

O ajuste é capacidade nova do núcleo (ENVOLVER sobre a curva da gaiola: entram pontos e tolerância, sai a curva que `gaiolaPorRede` já consome). A zebra numérica é USAR DIRETO como ferramenta de medida, ao lado de `onde-ondula.mjs` e `medida-na-curva.mjs`, com saída que o modelador e o crítico leem. O índice de suavidade passa a avisar quando a área medida fica muito abaixo da área da região (REFATORAR pequeno).

## Incluído

- o ajuste de curva lisa, com prova em curvas analíticas conhecidas (arco, clotoide, cônica, a mesma com ruído) e na planta do carro dentro dos 3 mm que a pessoa soltou;
- a zebra numérica, com prova nas chapas da fatia 5 da correção de superfície (a `rede-sem-ruido` dá a taxa de base do método) e nas rodadas 4 e 5 do carro, que o crítico já julgou;
- o aviso de área no índice de suavidade;
- uma rodada do carro com as duas, como prova, pelo laço de modelagem.
- emenda aprovada pela pessoa em 2026-11-18, do debate das melhorias das rodadas 6 e 7: as regiões da zebra numérica para a coluna, o teto e a traseira, com exclusão por caixa ou disco para tirar o furo do arco; `ponto`, `rumo` e `valorEm` exatos no ajuste; e o ajuste com objetivo de lisura opcional (entre as cadeias que cabem, a de menor variação de curvatura), independente do sentido dos pontos, com modo de pontos esparsos, trecho mínimo em unidade dos pontos e rumo fixo nas pontas, mantido o padrão atual para as provas da fatia 2 valerem.

## Excluído

- a G2 e os degraus 2, 3 e 5 do plano da correção de superfície, que seguem lá;
- a lanterna de três barras e o painel escuro da traseira, que são a etapa da traseira do carro.

## Gate de saída

1. O ajuste recupera as curvas analíticas com o número de inflexões certo e desvio dentro da tolerância, e a planta do carro dentro de 3 mm.
2. A zebra numérica concorda com a leitura do crítico nas rodadas já julgadas (onde ele viu laços, ela conta laços) e varia menos que o ruído entre densidades de pontos.
3. A rodada de prova do carro passa o critério de lisura do crítico, ou a medida mostra onde está o que falta, com a pessoa decidindo o próximo passo.
4. Revisão adversarial sem bloqueio no núcleo.

## Fatias

1. Feita em 2026-11-17: a zebra numérica (`tools/modelar/zebra-numerica.mjs`) e o aviso de área do índice de suavidade (`--area-minima`), medidos nas rodadas 2 a 4 do carro e nas chapas de prova (`docs/modelar/banco-de-provas/curvas-lisas-2026-11-17/`). A medida é estável com a densidade (no máximo 3 extremos e 1 laço de diferença, contra ±5 extremos do protótipo) e conta laço onde o crítico viu laço, mas o gate de saída 2 fica em aberto: nenhuma rodada julgada lisa existe para separar o lisa do reprovado, e a pessoa decide o próximo passo.
2. Feita em 2026-11-17: o ajuste de curva lisa no núcleo (`procedural/nucleo/ajuste-de-curva-lisa.js`), cadeia de clotoides com as provas analíticas, limpas e com ruído, e a planta do carro-fastback dentro de 3 mm (2,54 mm, 9 clotoides em 2 lóbulos, 1 inflexão, a mesma contagem de 20 a 0,8 mm de espaçamento), no banco de provas desta pasta; a revisão adversarial do núcleo e o uso na receita ficam para a fatia 3.
3. As rodadas do carro com as duas: a 6 (planta pelo ajuste, nota 7) e a 7 (teto, quina e perfil da traseira pelo ajuste) feitas em 2026-11-18; as seguintes depois das fatias 4 e 5.
4. Feita em 2026-11-18: as regiões novas da zebra numérica (a coluna, o teto, a tampa, a traseira, o ombro e o quarto traseiro sem o arco, com exclusão por caixa ou disco) e a leitura exata do ajuste (`ponto`, `rumoEm` e `valorEm`), com a rodada 7 medida contra a 6, no banco de provas desta pasta.
5. Feita em 2026-11-21: o ajuste com objetivo de lisura, com revisão adversarial e prova em mais de um comprimento e densidade fora da curva do carro, e o fechamento. Implementado (`objetivo`, `esparsos`, `trechoMinimo`, `rumoInicio` e `rumoFim`, com o padrão igual bit a bit), com a revisão adversarial sem bloqueio e o comparativo da lataria no banco de provas; a pessoa aprovou pelas imagens em 2026-11-21 ("Aprovo, encerre").

## Riscos e parada

Se a zebra numérica não concordar com o crítico nas rodadas já julgadas, ela não serve de critério, e o plano para na fatia 1 e volta à pessoa. Se a planta não couber em 3 mm com poucos trechos, a tolerância é decisão da pessoa, com a imagem das duas opções.

## Fechamento

Concluído em 2026-11-21, no ramo `envio/curvas-lisas-e-zebra-numerica`, com a aprovação da pessoa pelas imagens do comparativo da lataria.

Os gates de saída ficaram assim. O gate 1 fechou: o ajuste recupera as curvas analíticas com desvio dentro da tolerância, e a planta do carro cabe em 3 mm (2,54 mm, 9 clotoides). A contagem de inflexões ficou como diagnóstico, por decisão da pessoa em 2026-11-17. O gate 2 fechou em parte: a zebra numérica é estável com a densidade e conta laço onde o crítico viu laço na coluna e na traseira, mas no flanco e na porta, entre as rodadas 6 e 7, ela não acompanha o crítico, como registra o banco de provas da fatia 4. O gate 3 fechou pela segunda via: as rodadas 6 e 7 do carro não passaram o critério de lisura do crítico (notas 7 e 6), a medida mostrou onde está o que falta, e a pessoa decidiu pausar o carro, que está congelado pela outra frente. O gate 4 fechou: a revisão adversarial do núcleo terminou sem bloqueio nas fatias 2, 4 e 5.

O resultado observado: `ajustarCurvaLisa` no núcleo (cadeia de clotoides, leitura exata, ajuste guardado, objetivo de lisura, pontos esparsos, trecho mínimo e rumo fixo nas pontas), a zebra numérica com regiões e exclusões, e o aviso de área do índice de suavidade. A lisura com trecho mínimo tira de 14% a 35% da variação de curvatura das cinco curvas da lataria; adotá-la na receita é decisão do plano do carro.

Ficam no backlog: a contagem de inflexões medida contra a ponte entre as faixas, a inserção de joelho instável fora da planta, a ficha de `ajustarCurvaLisa` fora de `npm run capacidade`, a zebra numérica que não separa a ilha da forma pedida da onda nem tem olhar por região com aviso, a medida sobre o neutro já executado e o caminho com barra do Windows no cabeçalho de `ajustes-de-curva.js`.
