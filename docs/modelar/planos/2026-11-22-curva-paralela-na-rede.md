# Curva paralela na rede de curvas: os anéis em volta de um vão sem desenhar ponto a ponto

**Estado:** rascunho

**Núcleo:** sim

**Território:** a declarar ao ativar: `procedural/nucleo/gaiola-por-rede.js` e os testes dela, `tools/fixtures/curva-paralela/`. O arquivo da rede é do plano da [superfície de produção (G2)](congelados/2026-11-22-superficie-de-producao-g2.md) enquanto ele estiver ativo; este plano se ativa depois que o G2 fechar ou soltar o arquivo.

**Responsável:** a definir ao ativar. A pessoa pediu este plano em 2026-11-22, como a fatia 3 do plano das formas que faltavam, separada para não acumular no backlog e para não atrasar o G2, que é a prioridade.

**Repositório e base:** `warbookbr/nos-modelar`, a main do dia da ativação.

## Problema observado

No piloto da rede de curvas, o modelador não desenhou curvas em laço em volta do vão por causa do custo, e a malha em volta dele saiu em grade simples. Uma chapa com vão fica mais lisa quando há curvas que contornam o vão, paralelas à borda dele, como anéis. Hoje cada uma se desenha ponto a ponto, e nenhum gate mede quantas curvas contornam um vão.

## Resultado

O agente declara, na `gaiolaPorRede`, uma curva paralela a outra a uma distância sobre a superfície, e a rede gera a curva e os retalhos entre as duas, sem pontos escritos à mão.

## Filtro Agent-First

A curva paralela é REFATORAR pequeno sobre a `gaiolaPorRede`: uma declaração nova na lista de curvas (`paralela: { de, distancia, lado }`), resolvida antes dos retalhos, com recusa que diz a curva e a distância quando a paralela se cruza ou sai da superfície.

## Incluído

1. A declaração da curva paralela na `gaiolaPorRede`, aberta ou fechada, para dentro ou para fora, com a distância medida sobre a superfície da rede.
2. Os retalhos entre a curva de origem e a paralela, com a mesma contagem de pontos nas duas.
3. A peça neutra `tools/fixtures/curva-paralela/`, uma chapa curva com um vão e dois anéis em volta, e o teste que mede a distância entre as curvas e a ondulação contra a mesma chapa sem os anéis.
4. A conferência que conta as curvas que contornam cada vão, como aviso da rede.

## Excluído

A aplicação no carro fica para o plano do carro, por decisão da pessoa quando a lataria chegar aos vãos.

## Invariantes

A rede sem curva paralela dá a mesma gaiola de antes, e o acervo sai igual. O núcleo não ganha nome de objeto.

## Gate de saída

1. A peça neutra com a distância entre as curvas dentro de 1% da pedida e a ondulação em volta do vão menor que a da chapa sem anéis, com a medida no banco de provas.
2. As recusas com teste, o acervo igual e `npm run gates` e o CI verdes.
3. As imagens da peça neutra, com e sem anéis, levadas à pessoa.

## Fatias

1. A declaração e a geração da curva paralela, com a peça neutra.
2. Os retalhos e a medida da ondulação.
3. A contagem de curvas em volta do vão e o fechamento.

## Riscos e parada

Se a paralela a uma curva de curvatura forte se cruzar antes da distância pedida, a recusa diz o ponto, e o plano não tenta desfazer o cruzamento. Se o G2 mudar a forma como a rede monta os retalhos, este plano relê a rede antes de começar.

## Fechamento

Preencher somente ao concluir ou cancelar.
