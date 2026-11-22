# Superfície de produção (G2): os instrumentos e a linha de base do quarto traseiro

Pasta do plano [superfície de produção (G2)](../../planos/2026-11-22-superficie-de-producao-g2.md). Fatia 1, primeira parte, medida em 2026-11-22.

## Os instrumentos

A distância à pele é a ferramenta [`distancia-a-pele.mjs`](../../../../tools/modelar/distancia-a-pele.mjs). A receita exporta `PELE(PARAMS)`, os retalhos paramétricos da pele analítica que ela já calcula, e a ferramenta mede a distância da superfície limite da chapa a eles, por região, com o lado da normal. O pé de cada amostra na pele sai de uma grade do retalho refinada por Gauss-Newton, e o teste confere a distância contra a exata no paraboloide, na calota e no toro das chapas analíticas, a menos de 1e-6 mm. No painel de prova sem ruído ela dá 4,01 mm no miolo, contra os 4,04 mm que o banco de provas da correção de superfície mediu com roteiro de rascunho e outra amostragem.

Com `--zebra`, a mesma execução mede a zebra numérica nas mesmas regiões, e com `--contra` o veredito compara com uma linha de base. Ele reprova quando os laços esperados de uma região sobem mais que a folga de 0,05, ou quando a chapa sai da pele além do limite do retalho. É o gate que junta a zebra à distância: a onda de 400 mm do diagnóstico antigo, que limpava a zebra e levava a chapa 8,6 mm para fora, reprova pela distância.

O diagnóstico do preenchimento, a outra parte da fatia 1, mora em `gaiola-por-rede.js` e espera a fatia 3 do plano das formas que faltavam soltar o arquivo.

## Como se refaz

```
node tools/modelar/distancia-a-pele.mjs procedural/pecas/carro-fastback/partes/lataria/receita.js --zebra --caixas=docs/modelar/banco-de-provas/superficie-g2-2026-11-22/caixas.json --saida=docs/modelar/banco-de-provas/superficie-g2-2026-11-22/linha-de-base.json
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
