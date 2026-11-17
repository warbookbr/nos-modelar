# Curvas lisas e zebra numérica: fatia 1, a zebra numérica e o aviso de área

Registro da fatia 1 do plano [curvas lisas e zebra numérica](../../planos/2026-11-17-curvas-lisas-e-zebra-numerica.md), medida em 2026-11-17, antes de qualquer mudança de forma.

## O que entrou

`tools/modelar/zebra-numerica.mjs` (com `--ajuda`, opções com `=` e o teste ao lado) conta a zebra da bancada sobre a superfície limite exata (`superficieLimite`), sem linhas: amostra cada região numa grade de passo fixo em mm, soldada nas arestas pela topologia da gaiola, e lê o campo g = R·d (o olhar refletido pela normal, na direção d de cada um dos dois eixos da vista). Cada máximo ou mínimo de g dentro da região é o centro de uma família de laços fechados de isofota, e a persistência dele (quanto g desce até a ilha se juntar a outra ou tocar a borda da região) é a altura da ilha. Saem, por região, direção e faixa de comprimento de onda (o dobro da distância do extremo ao ponto onde a ilha se junta): os extremos com persistência de pelo menos 0,004 (uns 0,2 grau de giro da normal), os laços fechados de listra que a zebra da bancada mostra (níveis g = kπ/40, as bordas das listras de 4,5 graus), e os laços esperados, a soma de persistência × 40/π, que é o laço na fase média das listras. A fase muda com a vista e o laço inteiro some e volta quando uma ilha mal cruza um nível, por isso o número estável com a densidade é o dos extremos e o dos laços esperados.

`tools/modelar/suavidade-por-regiao.mjs` passa a avisar, no JSON (`aviso` da região) e na tabela (`AVISO`), quando a área medida fica abaixo de 75% da área da região (`--area-minima`, fração de 0 a 1). Era o caso da chapa do carro com passo 90 (4,11 de 5,90 m²) e do rebaixo (0,0004 m²), onde o índice comparava só o que sobrou da medida. O teste novo mede a chapa lisa de calibração com raio de 5 mm, que deixa 0 m² medido de 0,2416, e com raio de 40 mm, que mede tudo e não avisa.

As regiões do carro (a porta e o quarto traseiro do flanco +x, em mm sobre o centro das faces) são dado de teste em `tools/fixtures/curvas-lisas/carro-caixas.json`, passado por `--caixas`.

## Os números

Comando: `node tools/modelar/zebra-numerica.mjs <receita> --caixas=tools/fixtures/curvas-lisas/carro-caixas.json --passo=<mm>`. As receitas das rodadas saem do git (`git show <commit>:procedural/pecas/carro-fastback/partes/lataria/receita.js`, conferidas pelo sha256 do registro de cada rodada): rodada 2 em 7773e556, rodada 3 em 63851d0d, rodada 4 na main. Passo pedido de 90 a 12 mm; o passo efetivo vai de 32 a 11 mm, porque a grade é a mesma em toda face e só muda em passos inteiros por face.

| Receita | Porta: extremos, laços, laços esperados | Quarto: extremos, laços, laços esperados |
|---|---|---|
| rodada 1 (sem veredito) | 10 a 11; 2 a 3; 2,67 a 3,10 | 17 a 20; 9; 9,58 a 10,51 |
| rodada 2 (6,8) | 7; 1; 2,22 | 6 a 7; 2; 0,95 a 1,17 |
| rodada 3 (6,8) | 7; 1; 2,23 | 6 a 7; 2; 0,95 a 1,17 |
| rodada 4 (6,8) | 6; 0 a 1; 0,99 a 1,07 | 4; 1; 0,78 a 0,86 |
| controle da rodada 5 (curvas lisas, sem registro do crítico) | 6; 1; 0,95 | 6 a 7; 2; 0,68 a 1,00 |

Ruído entre densidades de pontos, nas receitas do carro: no máximo 3 extremos (o quarto da rodada 1, 17 a 20) e 1 laço inteiro, contra os ±5 extremos do protótipo de contagem em linhas; nos laços esperados, no máximo 0,93 no quarto da rodada 1 (9% de 10,5) e 0,23 nas demais regiões. Na chapa de prova `rede-com-ruido`, com 3, 5 e 10 vezes mais pontos: 8 extremos, 3 laços e 2,12 a 2,34 laços esperados; o teste cobra no máximo 1 extremo e 1 laço de diferença e 15% nos esperados entre os passos de 40, 25 e 15 mm.

Taxa de base, nas chapas de prova da correção de superfície: `rede-sem-ruido` 5 a 6 extremos, 0 laço, 1,34 a 1,37 esperados; `rede-com-ruido` 8 extremos, 3 laços, 2,12 a 2,34 esperados; `rede-alisada` 4 a 6 extremos, 2 a 3 laços, 0,99 a 1,16 esperados. Os extremos do controle estão junto do vértice extraordinário da rede e do nó M, que a forma pede.

## O gate 2 do plano: concorda com o crítico?

Em parte, e a parte que falta é a que decide. A zebra numérica conta laço onde o crítico viu laço: nas rodadas 2, 3 e 4 (todas 6,8, com laços e ondas na porta e no quarto) ela dá pelo menos 1 laço inteiro e pelo menos 0,78 laço esperado em cada uma das duas regiões, e a ordem entre as rodadas é a que os registros sugerem (a rodada 4, que menciona só a porta e o vidro lateral, é a de menos laços esperados no quarto). A chapa com ruído declarado dá 3 laços e a de controle 0, o que prova que a medida vê o defeito plantado. O número é estável com a densidade, como o gate pede.

O que a medida não mostra é que separe uma chapa que o crítico julgou lisa de uma que ele reprovou, porque nenhuma rodada do carro foi julgada lisa. O controle da rodada 5 (curvas lisas, não julgado pelo crítico) mede na porta 0,95 laço esperado contra 0,99 a 1,07 da rodada 4, e o controle de prova `rede-sem-ruido`, que é lisa por construção, tem 1,34 a 1,37 esperados por causa do vértice extraordinário, mais que a rodada 4 do carro. Os números absolutos de chapas diferentes não se comparam, e dentro do carro a medida mal separa a rodada 4 do controle de curvas lisas. Por isso o plano manda parar aqui e voltar à pessoa: a ferramenta e o aviso estão feitos e testados, e o que falta é a referência de chapa lisa julgada, que só a fatia 3 (a rodada do carro com curvas lisas, julgada pelo crítico) dá.

Recomendação: seguir para a fatia 2 (o ajuste de curva lisa), que não depende da zebra, e fechar o gate 2 na fatia 3, comparando o número da rodada nova com os da tabela acima e com o julgamento do crítico dela.

## Atritos

1. A contagem de extremos em linhas do protótipo da rodada 5 dependia de onde as linhas cruzam a malha; a persistência de conjuntos de nível sobre a grade soldada não depende, e é o que dá o número estável.
   Custo: uns 20 minutos para desenhar a soldagem pela topologia, em vez de por posição.
   O processo pegou: não.
   Destino: ferramenta, `tools/modelar/zebra-numerica.mjs`.
2. Cada medida do carro leva uns 35 s só para executar os passos `subdivisao` da receita; a bateria de 4 rodadas e 6 variantes levou uns 8 min, com a amostragem em si em menos de 1 s por passo.
   Custo: uns 10 minutos de espera.
   O processo pegou: não.
   Destino: backlog, medir sobre o neutro já executado (o cache por passo do plano do cache).
