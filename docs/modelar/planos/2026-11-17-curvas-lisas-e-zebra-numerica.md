# Curvas lisas e zebra numérica: a curva lida da prancha vira poucos trechos de curvatura monótona, e a ondulação longa que o crítico vê vira número

**Estado:** ativo

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
3. A rodada do carro com as duas, e o fechamento.

## Riscos e parada

Se a zebra numérica não concordar com o crítico nas rodadas já julgadas, ela não serve de critério, e o plano para na fatia 1 e volta à pessoa. Se a planta não couber em 3 mm com poucos trechos, a tolerância é decisão da pessoa, com a imagem das duas opções.
