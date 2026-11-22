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

## Fatia 2: o caminho positivo definido

O ajuste com peso sem cota exata passou ao Cholesky esparso (`procedural/nucleo/algebra-esparsa.js`), com a ordenação de grau mínimo aproximado e o ganho pela cota de Varah. As medidas estão em [`fatia-2.jsonl`](fatia-2.jsonl) e se refazem com:

```
node --max-old-space-size=8192 docs/modelar/banco-de-provas/ajuste-esparso-2026-11-22/ensaio-esparso.mjs 34 21 16 --denso
node --max-old-space-size=8192 docs/modelar/banco-de-provas/ajuste-esparso-2026-11-22/ensaio-esparso.mjs 12
node --max-old-space-size=8192 docs/modelar/banco-de-provas/ajuste-esparso-2026-11-22/ensaio-do-carro.mjs 35 [--sem-medidas]
```

| incógnitas | não nulos de L | preenchimento | fatoração (s) | ajuste esparso (s) | ajuste denso (s) |
|---|---|---|---|---|---|
| 1.457 | 84.289 | 4,7 | 0,07 | 0,15 | 1,1 |
| 3.577 | 269.245 | 6,0 | 0,20 | 0,29 | 12,0 |
| 6.305 | 546.541 | 6,9 | 0,30 | 0,52 | 52,6 |
| 10.795 | 1.158.191 | 8,4 | 1,28 | 1,8 | não medido |

O preenchimento aqui é a razão entre os não nulos de L e os da metade de baixo de H com a diagonal, e é a régua da parada da fatia 3. A gaiola ajustada difere da densa em até 5e-18 m. O ganho pela cota fica em 3,0 contra o exato de 0,680, e a conta exata não roda.

A primeira ordenação, pelo grafo de eliminação explícito, levava 7,4 s com 10.795 incógnitas, 95% do ajuste, e crescia com expoente perto de 2,8. O grafo quociente com o grau exato dava a mesma ordem em 3,5 s. O grau aproximado do AMD, cota superior do exato, leva 0,5 s e deu o mesmo fator na gaiola de prova. Na grade com ligações longas do teste ele enche até 10% mais que o exato, que é a tolerância travada.

No carro, a subdivisão do quarto traseiro com passo 70 caiu de 30,2 s para 3,3 s. Com passo 35, que tem 5.162 vértices na meia gaiola e 10.220 incógnitas, ela leva 10,6 s com as medidas e 6,8 s sem elas, e o pico de memória fica em 1.087 MB contra 1.223 MB sem as medidas. A diferença do pico está dentro do ruído do coletor de memória, e o gate 1 do plano (60 s e 400 MB a mais) passa com folga. O tempo que sobra do ajuste no carro, cerca de 4 s, não está no solver, que leva 1,8 s na gaiola de prova do mesmo tamanho. Fica para a fatia 4 medir onde está.

## Fatia 3: o ponto de sela e o ajuste só com exatas

A medida que o plano marcou para a decisão está em [`fatia-3.jsonl`](fatia-3.jsonl) e se refaz com `ensaio-sela.mjs`, na gaiola de prova com uma cota exata em cada nove. O LU esparso com pivô por limiar no sistema inteiro enche de 6,5 a 20 vezes a razão do Cholesky do mesmo tamanho, acima das três vezes da parada, e leva 104 s com 6.305 incógnitas. As linhas das restrições não têm diagonal, e a eliminação só acha pivô para elas depois de encher. Por isso o ponto de sela passou ao complemento de Schur (`fatorarSelaPorSchur`): o Cholesky de H, o complemento S = G H⁻¹ Gᵀ denso, de uma linha por cota exata, e duas resoluções com H por lado direito. Com a energia de curvatura, H tem o resto de 1e-9 na diagonal e o Schur perdia dígitos (a cota exata saía a 2e-11 m e o operador a 4e-9 m do denso); dois passos de refinamento iterativo sobre o sistema inteiro, na resolução final, trazem os dois de volta para dentro das tolerâncias dos testes.

O ajuste só com exatas é outro sistema, quadrado e com diagonal, e vai bem com o LU esparso: o fator tem de 3,8 a 5,9 vezes os não nulos da matriz, e a inversa inteira, que o ganho pede, sai em 1,7 s com 6.305 pontos.

No acervo, a medida de quais sistemas as doze peças montam mostrou que só duas usam o ajuste: a lataria do carro-fastback (o caminho positivo definido, com 4.255 incógnitas) e a carenagem de prova (só exatas, com 1.127 pontos). Nenhuma peça usa o ponto de sela, que fica coberto pelos testes. O custo dele é o próximo gargalo, 4,6 s com 3.577 incógnitas, quase todo na conta exata do ganho, uma resolução por cota; uma cota rigorosa como a de Varah para o ponto de sela fica medida e não feita.

A recusa do sistema singular passou a nomear a união dos suportes de uma base do núcleo (`baseDoNucleo`), que não depende da ordem: nos dois cubos de vértices todos exatos, os dezesseis vértices nas duas ordens, e a marca CONHECIDA saiu do teste.

## Fatia 4: a prova no carro

O [`ensaio-denso-contra-esparso.mjs`](ensaio-denso-contra-esparso.mjs) resolve a gaiola da lataria do carro-fastback como o passo `subdivisao` a resolve, pelo ajuste esparso, e de novo pela eliminação densa de referência, e compara as duas gaiolas e as duas malhas subdivididas. Na receita de hoje, com 4.255 vértices na gaiola espelhada e 4.322 medidas, a gaiola difere 1e-14 m e a malha 6e-15 m, contra o limite de 1e-9 m do gate 4. O ajuste leva 0,4 s contra 26,8 s do denso. A medição da rodada (`rodada-de-modelagem.mjs carro-fastback/lataria --acao`) passou sem mudar os `PONTOS`, e a ferramenta reconhece a malha e o PLANO como os que o crítico julgou na rodada 7. O retrato das doze peças comparou igual depois das fatias 2 e 3. As medidas estão em [`fatia-4.jsonl`](fatia-4.jsonl), e o ponto de decisão da pessoa não chegou a ser preciso.
