# Carro fastback: quanto custa o ajuste da chapa quando ela cresce

Pasta do plano [modelagem de carro](../../planos/2026-11-14-modelagem-de-carro.md), no começo da fatia 4. Medida em 2026-11-22 numa máquina de 20 núcleos lógicos e 32 GB, com Node 22.23.2, sem outra medida rodando.

## A pergunta

A lataria do piloto é uma `gaiolaPorRede` subdividida, e a `subdivisao` ajusta a gaiola às medidas das curvas por mínimos quadrados num sistema denso. O carro inteiro, numa chapa só como a pessoa decidiu na fatia 3, tem o dobro do comprimento do quarto traseiro. A pergunta é quanto custa uma execução dessa chapa, antes de escrever a frente.

## Como se refaz

O script [`ensaio-de-escala.mjs`](ensaio-de-escala.mjs) refaz a rede do quarto traseiro com `chapa.passo` menor, pela variante de parâmetros da receita (a mesma de `--params`), e executa só o passo da `subdivisao`, com a parte que nomeia o sólido dela. Os vãos, o arco e as regiões ficam de fora. Cada passo roda num processo, para o pico de memória ser o dele:

```
node --max-old-space-size=8192 docs/modelar/banco-de-provas/carro-fastback-2026-11-14/ensaio-de-escala.mjs
```

As cinco medidas estão em [`medidas.jsonl`](medidas.jsonl). Os vértices são os da meia gaiola que a receita declara; a subdivisão os espelha.

## O resultado

| passo (mm) | vértices da meia gaiola | subdivisão (s) | pico de memória (MB) |
|---|---|---|---|
| 70 (o da receita) | 2.161 | 30,2 | 1.038 |
| 64 | 2.278 | 34,1 | 985 |
| 58 | 2.814 | 69,2 | 1.671 |
| 52 | 2.952 | 78,5 | 1.722 |
| 47 | 3.305 | 111,4 | 2.285 |

O tempo cresce com expoente 3,1 sobre os vértices e a memória com 2,0. O carro inteiro, com o mesmo passo, deve ter de 4.300 a 5.000 vértices na meia gaiola. Pela lei medida, só a subdivisão levaria de 4,3 a 6,8 minutos, com pico de 3,8 a 5,1 GB, a cada execução que muda a forma, fora os vãos e as regiões, que hoje somam outro tanto. O limite padrão de memória do Node fica perto de 4,3 GB, então a chapa inteira pede `--max-old-space-size` maior em toda ferramenta que a executa.

O ensaio confirma o achado da análise de 2026-11-21 e o deixa pior na memória. A estimativa de antes dava de 3,5 a 7,5 minutos e de 2,6 a 4,0 GB.

O perfil de CPU da execução de 2.161 vértices (`node --cpu-prof`) põe 55% do tempo em `resolverLU` e 23% no laço que soma as colunas, os dois na conferência do ganho, que resolve o sistema uma vez por medida; a fatoração leva 10%. A pessoa escolheu em 2026-11-22 o solver esparso, no plano [ajuste esparso da gaiola](../../decisoes/PLANOS-ENCERRADOS.md).
