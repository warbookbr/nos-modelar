# Execução paralela: quanto as ferramentas ganham com mais núcleos

Pasta do plano [execução paralela](../../planos/2026-11-26-execucao-paralela.md), fatia 1, medida em 2026-11-26 numa máquina de quatro núcleos e 16 GB (15,7 GiB informados ao sistema), com o tempo roubado da máquina virtual abaixo de 1% em todas as medidas.

## Como se refaz

O script [`medir.mjs`](medir.mjs) mede um modo por processo e imprime uma linha JSON:

```
node --max-old-space-size=8192 docs/modelar/banco-de-provas/execucao-paralela-2026-11-26/medir.mjs receita <peça>
node docs/modelar/banco-de-provas/execucao-paralela-2026-11-26/medir.mjs partes <peça>,<peça>,... --processos=<n>
MODELAR_PROCESSOS=<n> node tools/modelar/guardas/guarda-acervo.mjs
```

## Dentro de uma receita

[`receitas.jsonl`](receitas.jsonl). O grafo liga cada passo ao último que escreveu o que ele lê. O passo que lê a malha sem leitura declarada é barreira, e o caminho mais longo pelo grafo é o tempo com núcleos à vontade. A conta otimista supõe a leitura declarada em toda operação, e só a seleção dinâmica fica barreira.

| Peça | Passos | Em série | Ganho máximo hoje | Ganho máximo otimista | Pico de memória |
|---|---|---|---|---|---|
| lataria do `carro-fastback` | 10 | 51 s | 1,00 | 1,00 | 3,0 GB |
| `furgao-realista` | 739 | 47 s | 1,05 | 1,68 | 3,2 GB |
| `bicicleta-urbana` | 635 | 12 s | 1,02 | 1,23 | 0,8 GB |
| `empilhadeira/carcaca` | 181 | 4,4 s | 1,02 | 1,21 | 0,6 GB |
| `sedan-chassi-e-lataria/frente-e-traseira` | 46 | 1,6 s | 1,00 | 1,43 | 0,9 GB |
| `braco-robotico/ombro` | 8 | 0,3 s | 1,00 | 1,15 | 0,2 GB |

Hoje quase todo passo é barreira: no furgão, 594 de 739, a maioria `material`, `parte` e `rotaciona`, que leem a malha sem leitura declarada. Mesmo com a leitura declarada em todas, o ganho fica abaixo de 1,7 vez. A lataria do carro não ganha nada em nenhuma conta, porque os dez passos são uma corrente sobre a mesma chapa. O tempo está dentro de poucas operações: na lataria, 29 s no corte das aberturas (`aberturaPorContorno`, 52%), 14 s na subtração (25%) e 8 s na divisão por contorno (15%); no furgão, 23 s no corte das aberturas (49%); na bicicleta, 9 s no `unir` (69%). Copiar o estado da lataria para outro processo custa 0,4 s para serializar e 1,2 s para desserializar (54 MB).

## Entre as partes de um objeto

[`partes-do-braco.jsonl`](partes-do-braco.jsonl). As treze partes do braço robótico, cada uma com a própria receita, em processos filhos repartidos pela mais lenta primeiro, com a importação da receita no tempo de cada uma:

| Processos | Parede | Soma das partes | Pico de memória somado |
|---|---|---|---|
| 1 | 21,1 s | 20,7 s | 1,2 GB |
| 2 | 12,7 s | 21,3 s | 1,4 GB |
| 4 | 12,5 s | 25,5 s | 1,6 GB |

A malha de cada parte saiu igual, pela impressão do neutro canônico, nas três medidas. A `base` leva 9,9 s sozinha e é o piso: dois processos já chegam a ele, e o quarto não ajuda.

## Entre as peças do acervo

[`guarda-do-acervo.jsonl`](guarda-do-acervo.jsonl). A `guarda:acervo` com `MODELAR_PROCESSOS` em 4, 2 e 1, uma depois da outra:

| Processos | Parede | Ganho | Pico de memória do processo |
|---|---|---|---|
| 1 | 730 s | 1,00 | 5,2 GB |
| 2 | 437 s | 1,67 | 6,2 GB |
| 4 | 288 s | 2,53 | 7,9 GB |

As 121 peças passaram nas três. Os fios dividem um processo só, e cada fio a mais somou perto de 1 GB ao pico. O ganho com quatro fica em 63% do ideal, porque as peças pesadas (a lataria do carro, o furgão) ocupam um fio por quase um minuto enquanto os outros terminam. Numa máquina com mais núcleos, o tempo continua caindo até o da peça mais lenta.

Uma primeira tentativa desta medida rodou a de um processo ao mesmo tempo que a de quatro, porque a de um não usa fios e não caiu no erro de largada que derrubou os fios da outra, e as duas foram descartadas. As da tabela rodaram uma depois da outra.

## Recomendação

O ganho está entre as peças do acervo, que já rodam em paralelo, e dentro das operações mais caras. Rodar passos de uma receita lado a lado não compensa: o teto é 1,7 vez no melhor caso, e só depois de declarar a leitura de todas as operações. Entre as partes de um objeto, o ganho é o da parte mais lenta, e só aparece nas ferramentas que executam todas as partes.

Por isso o número de processos das ferramentas que percorrem o acervo passou a seguir a máquina (`tools/processos-da-maquina.mjs`): o menor entre os núcleos e a memória total dividida por 3,5 GiB, ou o `MODELAR_PROCESSOS` pedido. Nesta máquina e no CI continua quatro. Numa máquina de 16 núcleos e 64 GB a conta dá 16, e a guarda do acervo cairia para perto do tempo da peça mais lenta. A repartição por dentro do corte das aberturas, que é metade do tempo do carro e do furgão, ficou no plano em rascunho [operações repartidas entre núcleos](../../planos/2026-11-26-operacoes-repartidas-entre-nucleos.md).
