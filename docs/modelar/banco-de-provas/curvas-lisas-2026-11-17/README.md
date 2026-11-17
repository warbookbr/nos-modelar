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

## Fatia 2: o ajuste de curva lisa

`procedural/nucleo/ajuste-de-curva-lisa.js` (`ajustarCurvaLisa`, ficha no cabeçalho do arquivo, testes `ajuste-de-curva-lisa.test.mjs` e `ajuste-de-curva-lisa-planta.test.mjs`) recebe pontos de uma curva plana e uma tolerância e devolve uma cadeia de clotoides (curvatura linear em cada trecho, contínua entre trechos, logo G2 sem condição de emenda), com os joelhos da curvatura, o número de inflexões, as corridas de curvatura monótona (`trechos`) e o desvio a cada ponto. `pontosDaRede(passo, { nome })` devolve a curva no formato de `curvas` de `gaiolaPorRede`: pontos-chave sobre a curva ajustada, que a Catmull-Rom da rede reproduz a menos de 0,3 mm com passo de 60 mm (o teste monta uma rede de um retalho e mede os pontos da linha dela contra a curva fina). `gaiolaPorRede` e `curva-da-gaiola.js` não mudaram.

Por que clotoide e não cônica ou cúbica: a clotoide é a curva de menor variação de curvatura entre duas curvaturas dadas, a cadeia delas com curvatura contínua é G2 por construção, e a inflexão cai onde a curvatura cruza zero. A cônica só tem curvatura monótona em cada metade e pede a posição do eixo; a cúbica de curvatura monótona pede uma condição de monotonia sobre os coeficientes. Os graus de liberdade por trecho são os mesmos e sem restrição.

O método: Levenberg-Marquardt sobre início, rumo, comprimento, curvaturas e posição dos joelhos, com resíduo de distância com sinal à curva, as pontas com peso 10, os duros com peso 20 e uma penalidade de desempate sobre a variação de curvatura de cada trecho (0,1 × tolerância × Δk × L, adimensional em Δk × L: a mesma forma em outra escala dá o mesmo ajuste). Começa de uma clotoide só, com o rumo lido da corda dos pontos numa janela de 3% do arco; enquanto o desvio máximo passa de 97% da tolerância entra um joelho no ponto de maior desvio, e no fim se tira cada joelho que a tolerância dispensa. De todos os ajustes que cabem fica o de menos clotoides. O passo de integração vem do comprimento, da curvatura e da tolerância (a flecha da corda abaixo de 1/20 dela no ajuste e de 1/100 na medida final), com os joelhos quebrando o passo; o LM usa no máximo 400 pontos (com os piores de cada ajuste anterior) e para por convergência. `cabe` mede, na curva a passo fino, o desvio de cada ponto à curva e o da curva à poligonal dos pontos (que tira da conta a densidade da entrada), a projeção dos pontos em ordem ao longo do arco e o comprimento da curva perto do da poligonal. A inflexão conta a troca de sinal entre as faixas de curvatura cuja sagita, medida na curva integrada, passa de 80% da tolerância; se `cabe` é falso, `motivo` diz qual condição falhou e com que valor. A coordenada livre de pontos de 3 componentes entra em quadratura no desvio: o plano fica com sqrt(tolerância² - metade da faixa²).

Correções da revisão adversarial da fatia 2, com o antes e o depois (as provas novas falhavam no código antigo):

| Achado | Antes | Depois |
|---|---|---|
| Ruído do tamanho do espaçamento (arco de 600 mm e 900 mm; 6 mm a cada 10 mm com tolerância 12,7; 2 mm a cada 3 mm com 4,2; 1 mm a cada 2 mm com 2,1) | 3 dos 5 casos falhavam (4 clotoides e 1 inflexão inventada, ou `cabe` falso), pelo rumo inicial de segmentos seguidos | os 5 dão 1 clotoide e nenhuma inflexão, pelo rumo da corda numa janela de 3% do arco |
| Pontos todos iguais | `cabe` verdadeiro com NaN | recusa com o comprimento da poligonal e a tolerância; o resultado não finito também é recusado |
| Escala (arco de 3 mm de raio com tolerância 0,02; de 50 m com 5; de 200 mm com 0,05) | passo de 2 mm absoluto, desvio acima da tolerância | passo relativo, e o desvio devolvido confere com uma integração independente de Runge-Kutta a menos de 10% da tolerância |
| Pontos fora de ordem, ou indo e voltando | só a distância ao conjunto | `cabe` falso |
| Lóbulo inventado na planta, entre os arcos 3400 e 3490 mm (3,5, -2,4 e 1,1 1/m) | 3,61, -2,45 e 1,09 1/m onde a entrada só tem curvatura positiva | sem o lóbulo: o que o tirou foi o rumo inicial pela corda e a parada por convergência, e não a penalidade (com peso 0 o ajuste da planta também o dá); o teste cobra curvatura maior que -0,2 1/m depois de 2300 mm |
| Contagem de inflexões por giro × comprimento / 8 | só vale para curvatura constante | sagita da faixa na curva integrada; o lóbulo triangular fundo conta 2 inflexões, o raso 0 |
| Custo: arco de 1 km de raio com 3000 pontos e ruído | 124,9 s | 0,08 s (convergência e no máximo 400 pontos no LM) |
| Planta a 0,8 mm e a 20 mm | contagem de clotoides sem prova, e 8 a 9 conforme a densidade | 9 clotoides nas quatro densidades (20, 10, 5 e 0,8 mm), com uma inflexão |
| Entrada | misturar pontos de 2 e de 3 componentes, tolerância em texto, `duros` que não é lista e coordenada livre que varia passavam | recusa com o valor recebido; a coordenada livre entra em quadratura no desvio (ver a linha da coordenada livre) |
| Penalidade de curvatura com unidade de 1/comprimento: o mesmo filete (reta de 200, filete de 90 graus de raio 20, reta de 200, tolerância 0,5, pontos a 1) vezes S | ×1e-3: `cabe` falso, 31 vezes a tolerância; ×1: `cabe` falso com 2 inflexões inventadas; ×1e3: `cabe` verdadeiro | ×1e-3, ×1 e ×1e3: `cabe` verdadeiro, 4 clotoides, 0 inflexão, desvio de 0,269 da escala nos três (o S de curvatura variável também dá o mesmo nas três escalas, com 1 inflexão). A penalidade passou a ser adimensional (Δk × L) e de desempate, e o teto absoluto de passo de integração saiu |
| Lombada gaussiana de 3 mm, sigma 40, sobre arco de raio 20 m (tolerância 1, pontos a 15, 5 e 1 mm): a curvatura troca de sinal duas vezes, com sagita de 1,18 mm | `cabe` verdadeiro com 0 inflexão nas três densidades (o lóbulo do ajuste e os flancos ficavam abaixo do limiar da contagem, e a penalidade o apagava) | `cabe` verdadeiro, 2 clotoides e 2 inflexões nas três densidades (o limiar da contagem passou a 80% da tolerância, e a penalidade deixou de apagar o lóbulo) |
| Entrada reduzida a 400 pontos para o LM, com a inserção de joelho mirando um ponto que o LM não via | a planta a 0,8 mm falhava com a penalidade pequena (`cabe` falso, 3,1 mm) | os 8 piores pontos de cada ajuste entram no conjunto do LM dos seguintes; a planta dá a mesma contagem de 20 a 0,8 mm |
| Coordenada livre (elipse com z em rampa de 0 a 0,5 e tolerância 0,5) | o limite de variação gastava a tolerância duas vezes (a variação e o desvio no plano) | a metade da faixa (0,25) entra em quadratura: o plano fica com 0,433, e o desvio 3D de cada ponto até a curva de `pontosDaRede` medido no teste fica em 0,5 ou menos; faixa de 2 (metade 1) é recusada |
| Curva fechada (círculo com o último ponto igual ao primeiro) e coordenada de 1e300 | `cabe` falso sem motivo; 1e300 passava | `motivo` diz que o último ponto se projeta fora do fim da curva e que a curva fechada se ajusta em dois arcos; 1e300 é recusado citando o ponto e o valor |

`maximoDeTrechos` virou `maximoDeClotoides`, que é o que ele conta.

Provas em curvas analíticas (os mesmos casos do teste), desvio máximo medido, número de clotoides e de inflexões:

| Curva | limpa (tolerância 0,5 mm) | com ruído de 0,3 mm (tolerância 1 mm) |
|---|---|---|
| arco de 500 mm, 90 graus | 0,006 mm, 1 clotoide, 0 inflexão | 0,455 mm, 1, 0 |
| clotoide de 1/800 a 1/300 | 0,004 mm, 1, 0 | 0,439 mm, 1, 0 |
| quarto de elipse de 600 por 250 mm | 0,444 mm, 2, 0 | 0,748 mm, 2, 0 |
| S de 1/400 a -1/400 | 0,005 mm, 1, 1 | 0,502 mm, 1, 1 |

A planta da lataria do carro-fastback (a TABELA da receita, só leitura: o polígono com filete da prancha de `contornoDaPlanta`, 802 pontos a cada 5 mm, 4005 mm de arco) com tolerância de 3 mm: cabe com 9 clotoides em 8 corridas de curvatura monótona, desvio máximo 2,54 mm e 1 inflexão, em uns 4 s (máquina carregada); a 20, 10 e 0,8 mm de espaçamento dá os mesmos 9 clotoides, 8 corridas e 1 inflexão, com desvio de 2,54 a 2,72 mm. Os joelhos a 5 mm (arco em mm, curvatura em 1/m): 0 em 0; 1619 em 0; 1791 em -1,40; 1831 em 0,55; 2268 em 0,09; 3041 em 0,96; 3354 em 3,65; 3394 em 0,50; 3584 em 0,95; 4004 em -0,23. Lida como a forma pede: reta da frente até o lóbulo do para-lama (curvatura de -1,4 1/m, que sai para fora), a volta com curvatura que sobe a 3,6 1/m (raio de uns 275 mm) no canto de trás, e a ponta no eixo do carro. A entrada ali é uma sequência de filetes de 300, 400 e 600 mm com retas curtas entre eles, de curvatura positiva; o ajuste os substitui por uma rampa que sobe a 3,6 1/m e desce a 0,5 e 0,95 1/m sem sinal oposto, e acaba com -0,23 1/m na ponta do eixo, que a tolerância não distingue de reta. São 2 lóbulos e 9 clotoides, porque cada lóbulo pede subida e descida. A versão anterior desta fatia dava 8 clotoides e 2,87 mm com a penalidade de 1/comprimento; sem ela, com os outros ajustes da revisão, a contagem é 9 e igual em todas as densidades. O teste da planta acopla à peça: se a TABELA mudar, os números mudam com ela. O ajuste do carro continua sem rodada: o uso desta curva na receita é a fatia 3.

Atritos:

1. O ajuste da planta largava o ponto de partida (6,7 mm fora) e fazia um gancho de 10 graus no começo; só a medida do resíduo das pontas mostrou (`a.inicio` contra o primeiro ponto).
   Custo: duas rodadas de ajuste (uns 15 minutos).
   O processo pegou: não.
   Destino: ferramenta, o peso das pontas em `ajuste-de-curva-lisa.js`.
2. A ficha `ajustarCurvaLisa` não entra em `npm run capacidade`, que lista os ajudantes por um registro fora do território deste plano (`tools/modelar/capacidade.mjs`).
   Custo: nenhum ainda; o ajudante não aparece na busca por capacidade.
   O processo pegou: não.
   Destino: backlog, registrar a ficha quando o plano der o arquivo.
3. A primeira versão passou nos testes que escrevi e falhou em cinco achados da revisão adversarial (ruído denso, entrada degenerada, escala, ordem e custo), porque os testes só usavam ruído bem menor que o espaçamento e curvas de uns 500 mm.
   Custo: uma rodada de revisão e de correção.
   O processo pegou: sim, a revisão adversarial.
   Destino: ferramenta, os testes novos em `ajuste-de-curva-lisa.test.mjs` cobrem ruído do tamanho do espaçamento, escala de milímetros a dezenas de metros, ordem e custo.
