# Superfície de produção (G2): os instrumentos e a linha de base do quarto traseiro

Pasta do plano [superfície de produção (G2)](../../planos/2026-11-22-superficie-de-producao-g2.md). Fatia 1, medida em 2026-11-22.

## Os instrumentos

A distância à pele é a ferramenta [`distancia-a-pele.mjs`](../../../../tools/modelar/distancia-a-pele.mjs). A receita exporta `PELE(PARAMS)`, os retalhos paramétricos da pele analítica que ela já calcula, e a ferramenta mede a distância da superfície limite da chapa a eles, por região, com o lado da normal. O pé de cada amostra na pele sai de uma grade do retalho refinada por Gauss-Newton, e o teste confere a distância contra a exata no paraboloide, na calota e no toro das chapas analíticas, a menos de 1e-6 mm. No painel de prova sem ruído ela dá 4,01 mm no miolo, contra os 4,04 mm que o banco de provas da correção de superfície mediu com roteiro de rascunho e outra amostragem.

Com `--zebra`, a mesma execução mede a zebra numérica nas mesmas regiões, e com `--contra` o veredito compara com uma linha de base. Ele reprova quando os laços esperados de uma região sobem mais que a folga de 0,05, ou quando a chapa sai da pele além do limite do retalho. É o gate que junta a zebra à distância: a onda de 400 mm do diagnóstico antigo, que limpava a zebra e levava a chapa 8,6 mm para fora, reprova pela distância.

O diagnóstico do preenchimento é a ferramenta [`preenchimento-da-rede.mjs`](../../../../tools/modelar/preenchimento-da-rede.mjs). Com `alisarSuperficie`, a `gaiolaPorRede` publica `preenchimento`: de cada lado de cada retalho de quatro lados, se a curva seguinte da rede entrou no miolo e, se não, por quê. A ferramenta liga a opção em todas as redes só para medir, sem mudar a receita e sem rodar a subdivisão, e o resultado do quarto está em [`preenchimento.json`](preenchimento.json).

## Como se refaz

```
node tools/modelar/distancia-a-pele.mjs procedural/pecas/carro-fastback/partes/lataria/receita.js --zebra --caixas=docs/modelar/banco-de-provas/superficie-g2-2026-11-22/caixas.json --saida=docs/modelar/banco-de-provas/superficie-g2-2026-11-22/linha-de-base.json
```

```
node tools/modelar/preenchimento-da-rede.mjs procedural/pecas/carro-fastback/partes/lataria/receita.js --retalhos --saida=docs/modelar/banco-de-provas/superficie-g2-2026-11-22/preenchimento.json
```

Uma variante da receita se compara à linha de base com `--params=<json> --contra=docs/modelar/banco-de-provas/superficie-g2-2026-11-22/linha-de-base.json --limite=1.5`. As regiões estão em [`caixas.json`](caixas.json), todas do lado de x positivo, e a pele do flanco tem espelho em x. O `flanco` é a faixa de 310 a 950 mm de altura, que fica fora das duas arestas da gaiola junto da soleira, onde a regra de borda da subdivisão afasta a chapa da pele; ele e o `paralama` tiram o disco de 430 mm em volta do arco da roda, que a peça corta depois.

## A linha de base

O quarto traseiro como está na main, passo 70 da gaiola, amostrado a 27 mm. A distância, em mm, só onde o pé cai dentro da pele do flanco (o `ombro` tem 181 amostras além do topo da pele, e a `coluna` e a `traseira` ficam fora dela):

| região | amostras medidas | máxima | p95 | mediana | para fora | para dentro | onde está a máxima |
|---|---|---|---|---|---|---|---|
| flanco | 1.638 | 1,79 | 1,08 | 0,35 | 1,37 | 1,79 | 898, 721, -483 |
| porta | 1.200 | 2,80 | 1,20 | 0,43 | 2,26 | 2,80 | 927, 276, -883 |
| paralama | 963 | 2,93 | 0,67 | 0,26 | 2,55 | 2,93 | 929, 270, -916 |
| ombro | 301 | 1,42 | 0,98 | 0,27 | 1,42 | 0,45 | 747, 957, -283 |

A zebra numérica, nas mesmas regiões (extremos, laços e laços esperados):

| região | extremos | laços | esperados |
|---|---|---|---|
| flanco | 9 | 2 | 1,27 |
| porta | 12 | 3 | 2,12 |
| paralama | 2 | 0 | 0,17 |
| ombro | 12 | 5 | 6,13 |
| coluna | 6 | 0 | 1,08 |
| traseira | 14 | 9 | 10,43 |

No flanco a chapa já fica a 1,79 mm da pele, acima do 1,5 mm que o gate 3 do plano pede com a opção ligada. O máximo está no rebaixo, a meia altura da porta. O comentário da receita registra 1,5 mm no flanco, medido com roteiro de rascunho sobre outra faixa, e a diferença fica dita aqui sem mudar o gate: a decisão de manter o 1,5 mm ou medi-lo contra esta linha de base é da pessoa, quando a opção chegar ao quarto na fatia 5.

## O preenchimento do quarto

São 69 retalhos de quatro lados e 276 lados. Têm vizinho 174 lados, e 166 deles com razão de cordas até 1,5. Ficam sem vizinho 61 lados por vinco, 17 por borda livre, 15 no plano de simetria, 1 por retalho de n lados ao lado (o `r8_coluna`, junto do `S9ombro`) e 8 cortados pela razão de cordas acima de 4: o lado de cima de cinco retalhos da soleira (`r4_soleira` a `r8_soleira`, razão de 4,9 a 7,4, porque a faixa da soleira é estreita contra a de cima) e três lados na calota da traseira (`c_base` e `c_soleira`, de 4,0 a 4,7). Dezesseis retalhos têm vizinho nos quatro lados, treze em três, trinta e dois em dois, sete em um e um em nenhum. É o mesmo quadro que a cópia instrumentada do núcleo deu em 2026-11-21 (68 retalhos, 172 lados com vizinho, 8 cortados, 59 por vinco e 33 pelos outros motivos), com o retalho e os lados que a receita ganhou desde então.

## Fatia 2: as formas da curvatura normal, medidas antes do núcleo

O protótipo [`curvatura-normal.mjs`](../../../../tools/fixtures/correcao-de-superficie/curvatura-normal.mjs) já media em 2026-11-19 as duas formas que a fatia 2 põe à pessoa: a cota completa, com a cota exata nos três eixos e duas incógnitas a mais por cota, e a cota só na normal, mais barata, em que o ponto limite da cota escorrega na tangente (4,7 mm na grade de razão 2, 3,7 mm na `rede-sem-ruido`). A cota completa reprovava no cilindro e na sela da grade de razão 2. Ganhou agora `--iteracoes=<n>`, a terceira forma que ficara sem medir: a normal, a métrica e a direção das incógnitas saem da gaiola do ajuste anterior, e não da desenhada, com as cotas e as medidas de sempre. A mudança entre um ajuste e o seguinte cai abaixo de 0,001 mm na quinta iteração em todas as provas.

```
node tools/fixtures/correcao-de-superficie/curvatura-normal.mjs grade --cota=completa --iteracoes=4
node tools/fixtures/correcao-de-superficie/curvatura-normal.mjs analiticas --cota=completa --iteracoes=4 [--definicao='{"meio":[0.25,0.25]}' | '{"meio":[0.3,0.5]}' | '{"pontos":16}']
node tools/fixtures/correcao-de-superficie/curvatura-normal.mjs emendas | rede --iteracoes=4
```

A grade de 15 por 15, o desvio a mais de 100 mm da borda, em mm (o escorregamento da cota exata fica em 1e-13 mm nas duas colunas da cota completa):

| Forma | Sem a opção | Etapa B | Cota completa, uma vez | Cota completa, quatro vezes |
|---|---|---|---|---|
| paraboloide, razão 1 | 0,636 | 0,329 | 0,629 | 0,608 |
| paraboloide, razão 2 | 0,887 | 3,274 | 0,797 | 0,724 |
| cilindro, razão 1 | 0,164 | 0,082 | 0,026 | 0,025 |
| cilindro, razão 2 | 0,320 | 1,648 | 0,365 | 0,268 |
| sela, razão 1 | 0,008 | 0,051 | 0,029 | 0,029 |
| sela, razão 2 | 0,330 | 2,283 | 0,482 | 0,338 |

Nas analíticas, com o miolo pelas curvas vizinhas de hoje, as duas colunas da cota completa ficam abaixo de sem a opção em todas as doze, inclusive na calota assimétrica (0,475 contra 0,707 mm com o meio em 0,25 e 0,25, e 0,287 contra 0,301 com o meio em 0,3 e 0,5), que em 2026-11-19 reprovava pela cota do miolo; a iteração muda as analíticas em menos de 0,02 mm. Nas emendas a iteração muda pouco (a rampa da `emenda-g1` de 15,5 para 14,9, contra 9,98 da etapa B e 25,7 sem a opção). Na `rede-sem-ruido` a distância ao painel vai de 0,66 mm com um ajuste para 1,10 com quatro, contra 1,35 da etapa B e 4,04 sem a opção.

O que sobra contra o gate 1 é a sela: com qualquer forma ela fica pior que sem a opção na grade de razão 1 (0,029 contra 0,008 mm), e com quatro iterações, por 0,008 mm na de razão 2. A curvatura normal da sela varia de fato no espaço, e a energia que cobra a variação a puxa; sem a opção a amostra de uma quadrática em passo igual já cai quase em cima dela. A decisão da fatia 2 vai à pessoa com estes números.

## Fatia 2: a curvatura normal no núcleo

Desde 2026-11-22 o ajuste das cotas com `regularizacao: { tipo: 'variacaoDeCurvatura' }`, que a `alisarSuperficie` liga, é a cota completa refeita quatro vezes (`energiaDeCurvaturaNormal` e `ITERACOES_DA_CURVATURA` em `procedural/nucleo/subdivisao.js`). Ele dá a mesma gaiola do protótipo com quatro iterações a 1e-16 m na grade, e o caminho esparso a mesma do denso. A grade de 15 por 15 tem os números da última coluna da tabela acima, todos dentro da folga de 0,05 mm do gate 1. A esfera, o cilindro e o plano têm energia nula, e a quadrática inclinada não. A energia anterior, `energiaDeVariacaoDeCurvatura`, ficou só como medida.

Nas dezoito analíticas a distância a 100 mm da borda fica abaixo da de sem a opção em todas. Contra a etapa B ela fica igual ou melhor, salvo o toro com o meio em 0,25 e 0,25, por 0,0003 mm, e o toro sem cota de miolo, que vai de 0,050 para 0,128 mm. Na chapa lateral de prova oito dos dez retalhos ficam mais perto da forma que sem a opção, e o `baixo` cai de 0,765 para 0,665 mm. Dois seguem mais longe, o `coluna` (0,476 contra 0,456 mm) e o `atrasDaColuna` (0,464 contra 0,443), com o mesmo número do preenchimento padrão com a mesma energia, e ficam marcados nos testes.

O custo, pelo script [`custo-da-opcao.mjs`](custo-da-opcao.mjs), mede só a subdivisão do quarto traseiro com a opção e sem ela:

| passo da chapa (mm) | pontos da meia gaiola | sem a opção (s) | com a opção (s) | razão | com a opção, sem a conferência do ganho (s) |
|---|---|---|---|---|---|
| 70 (o da receita) | 2.161 | 2,6 | 13,5 | 5,2 | 6,8 |
| 35 (o carro inteiro) | 5.162 | 9,6 | 77,6 | 8,1 | 24,0 |

A etapa B custava 9,8 s no passo 70, 3,8 vezes o custo sem a opção. O gate 4 (até o dobro) reprova. Dois terços do tempo no passo 35 vão para a conferência do ganho, que resolve o sistema uma vez por cota, e o resto para as quatro contas, cada uma com a normal, a energia, a montagem e a fatoração refeitas. A última coluna é uma medida com a conferência desligada à mão, que não existe como opção.
