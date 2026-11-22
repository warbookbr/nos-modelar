# Ajuste esparso da gaiola: a linha de base do solver denso

Pasta do plano [ajuste esparso da gaiola](../../planos/2026-11-22-ajuste-esparso-da-gaiola.md). Fatia 1 medida em 2026-11-22 numa máquina de 20 núcleos lógicos e 32 GB, com Node 22.23.2, sem outra medida rodando.

## A gaiola de prova

A [`gaiola-grande.mjs`](../../../../tools/fixtures/ajuste-esparso/gaiola-grande.mjs) passa a casca simétrica neutra das chapas de prova pela `gaiolaPorRede`, com `simetria: 'x'`. Ela espelha a gaiola como o passo `subdivisao` faz e mede todo ponto com peso 1, como a lataria do carro com `pesoDasCurvas: 1`. O `passo` da rede escolhe o tamanho. Ela reproduz o que a revisão do plano apontou como causa do custo: a rede entrega as imagens do espelho no fim, e a banda da matriz cresce na proporção das incógnitas, de 0,67 a 0,72 vez elas, contra a raiz numa grade comum. No carro, com passo 70, a banda é de 4.107 em 4.255.

## Como se refaz

```
node --max-old-space-size=8192 docs/modelar/banco-de-provas/ajuste-esparso-2026-11-22/ensaio-denso.mjs
node --max-old-space-size=8192 docs/modelar/banco-de-provas/ajuste-esparso-2026-11-22/ensaio-denso.mjs 18 16
```

O primeiro roda a série de passo 34 a 21, e o segundo os dois tamanhos da faixa do carro. As medidas estão em [`linha-de-base.jsonl`](linha-de-base.jsonl).

## O resultado

| incógnitas | não nulos de H | banda | não nulos de L e U | preenchimento | fatoração (s) | ajuste (s) | pico (MB) |
|---|---|---|---|---|---|---|---|
| 1.457 | 34.121 | 1.048 | 584.961 | 17,1 | 0,09 | 1,1 | 230 |
| 1.785 | 42.081 | 1.270 | 824.625 | 19,6 | 0,15 | 1,6 | 284 |
| 2.301 | 54.621 | 1.614 | 1.245.141 | 22,8 | 0,26 | 3,4 | 394 |
| 2.795 | 66.671 | 1.952 | 1.719.255 | 25,8 | 0,42 | 6,1 | 422 |
| 3.577 | 85.801 | 2.470 | 2.564.781 | 29,9 | 0,91 | 12,0 | 633 |
| 4.845 | 116.901 | 3.303 | 4.163.497 | 35,6 | 1,84 | 26,7 | 1.478 |
| 6.305 | 152.801 | 4.256 | 6.318.053 | 41,3 | 4,23 | 52,6 | 1.779 |

A matriz H = I + Σ WᵢᵀWᵢ tem 24 não nulos por linha. O ajuste inteiro cresce com expoente 2,8 de 1.457 a 3.577 incógnitas e 2,6 de 3.577 a 6.305. O custo absoluto fica perto do carro: 26,7 s com 4.845 incógnitas na gaiola de prova, contra 30 s com 4.322 no quarto traseiro. O expoente do carro, 3,1, foi medido no passo inteiro da subdivisão, com os níveis e a espessura, e a gaiola de prova mede só o ajuste. A diferença fica registrada, e o gate do plano mede o carro direto.

A fatoração densa leva de 7% a 10% do ajuste, e o resto é a conferência do ganho, que resolve o sistema uma vez por medida. O ganho é 0,680 em todos os tamanhos, contra o limite de 100.

O preenchimento da eliminação de hoje, que segue a ordem da rede, sobe de 17 para 41 vezes os não nulos de H. Ele calibra a parada do plano só depois de medido com a ordenação esparsa da fatia 2, porque é com ela que o ponto de sela será comparado.

## O que o denso faz com a ordem dos vértices

Os testes novos em `procedural/nucleo/subdivisao.test.mjs` ("o ajuste denso diante da ordem dos vértices") travam a referência do esparso. Sem energia de curvatura, renumerar a gaiola muda o ajuste abaixo de 1e-12 m. Com a energia e a onda de 64 passos, a mudança passa de 1e-9 m. Os dois cubos de vértices todos exatos ficam como CONHECIDA, porque a recusa do singular nomeia o primeiro cubo na ordem natural e o segundo na ordem trocada.

## O retrato do acervo

O [`retrato-antes.json`](retrato-antes.json) guarda as doze peças do acervo com passo `subdivisao`, gravadas antes da fatia 2 com `npm run retrato:acervo -- --pecas=... --gravar`. A fatia 4 as compara com `--comparar`.
