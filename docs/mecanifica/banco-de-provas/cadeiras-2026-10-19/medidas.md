# Cadeira: medida de cada perfil contra o esboço alvo

Família `procedural/familias/cadeira/` (versão 1.0.0, primeira rodada: os cinco perfis de encosto alto). O alvo de cada perfil é o esboço que `receitaParaEsboco` tira da receita do externo em `tools/mecanifica/fixtures/receita-externa-cadeiras/`, com o ajuste da pessoa na `cadeira_almofadada_clara` (o topo das pernas da frente encosta no assento). A tabela sai de `node tools/mecanifica/cadeiras-medida.mjs medidas`, e a prancha de `node tools/mecanifica/cadeiras-medida.mjs prancha` (`cadeira-prancha.png`, nesta pasta).

A caixa envolvente do alvo vem das caixas que `descreverEsboco` lê. O volume do alvo é a união das caixas da receita, contando uma vez só onde elas se sobrepõem, menos o que o chanfro do esboço tira e mais os cilindros. A caixa e o volume da família são medidos na malha executada (volume pela fórmula de Newell sobre cada face). Compara-se o tamanho por eixo (largura x, altura y, profundidade z com a frente em +z), porque as receitas de origem não são centradas no assento e a família é.

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

| perfil | volume do alvo (dm³) | volume da família (dm³) | diferença (%) | partes da família | faces da malha |
| --- | ---: | ---: | ---: | ---: | ---: |
| cadeira-branca-de-madeira | 25,11 | 24,65 | −1,9 | 18 | 218 |
| cadeira-branca-simples | 39,41 | 39,45 | +0,1 | 8 | 72 |
| cadeira-de-madeira | 39,31 | 39,59 | +0,7 | 18 | 249 |
| cadeira-rustica | 41,68 | 41,69 | +0,0 | 17 | 198 |
| cadeira-trabalhada | 28,73 | 28,67 | −0,2 | 10 | 110 |

## Onde não chegou

A caixa envolvente fica dentro de 3% por eixo em quatro perfis. A `cadeira-rustica` fica 3,2% abaixo na profundidade (545 contra 563 mm) porque os pregos do encosto da receita saem 8 mm além da travessa do encosto, que já passa 10 mm da face de trás das pernas. A família não desenha pregos, manchas, fendas nem os blocos de madeira podre nos pés, e a travessa do encosto dela encosta na face de trás das pernas. Sem os pregos o alvo mede 555 mm e a diferença é de 1,8%. O volume dessa receita fecha em 0,0% porque os pregos pesam menos de 0,02 dm³.

A `cadeira-trabalhada` tem as pernas da receita deslocadas em x (o assento vai de −316 a 163 mm e as pernas não são simétricas) e a seção das pernas (66 por 27 mm) é diferente da dos postes (50 por 36 mm). A família usa uma seção só (60 por 30 mm) para pernas e postes e é simétrica, e por isso a largura fica 1,0% menor.

## Diferenças de forma que a medida não mostra

- Os chanfros e arredondamentos das peças não existem na família (as caixas são retas); o esboço alvo tem chanfro de 2 a 10 mm.
- A `cadeira-rustica` tem as três tábuas de encosto na mesma altura (1050 mm); no alvo as alturas são 1050, 1000 e 1030 mm. A fenda, as manchas e os cinco pregos do encosto e os quatro do assento ficam de fora.
- O recuo das pernas da frente é fixo em 10 mm da frente do assento; nas receitas ele vai de −3 a 25 mm, e as pernas da frente ficam deslocadas de até 15 mm em z.
- Na `cadeira-branca-de-madeira` o bloco da saia e a travessa alta ficam 10 e 24 mm diferentes do alvo em posição (a travessa alta sobe até 1060 mm na receita e os postes até 1084 mm); o volume fica 1,9% abaixo.
- A `cadeira-de-madeira` tem uma fenda de 2 mm no meio do bloco da saia (a frente e o fundo não se encontram, para a união não quebrar); o bloco do alvo é inteiro.
- As faces da malha da família têm triângulos de união visíveis como arestas na prancha; não são arestas da forma.
