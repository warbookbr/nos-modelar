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

## A terceira revisão e a decisão da pessoa

A terceira revisão adversarial do ajuste achou `cabe` e `desvioMaximo` seguros como ferramenta geral: nenhum `cabe` verdadeiro acima da tolerância de ×1e-3 a ×1e3, numa espiral de 30 rad, num arco de 340 graus, com ruído e numa curva 3D; o filete e o seno dão a mesma contagem nas três escalas, o ruído numa reta e num arco não inventa inflexão, e a planta dá 9 clotoides e 1 inflexão de 30 a 0,8 mm de espaçamento, com a amostra deslocada, a ×1e-3 e com ruído de ±1 (11 clotoides).

Ela bloqueou a contagem de inflexões como métrica geral. A lombada do teste (3 mm, sigma 40, R 20 m, tolerância 1, pontos a 5 mm) conta 2 inflexões a ±200 e a ±1500, mas 0 a ±300, ±400 e ±800, com `cabe` verdadeiro e a curvatura negativa no meio da curva ajustada, onde a inflexão é obrigatória: o ajuste estreita o lóbulo, e a sagita dele contra a própria corda cai a 0,47, abaixo do limiar de 80%. Baixar o limiar a 0,5 ou 0,3 não resolve. Ela também achou a inserção de joelhos instável fora da planta (a lombada de 10 mm a ±800 cabe com 6 clotoides a 20 e 10 mm de espaçamento e não cabe com 10 a 5 e 2 mm, e o `motivo` diz que falta clotoide), o desvio da curva à poligonal punindo a flecha da corda da própria entrada em tolerância muito menor que ela, e cinco miudezas (reta com ruído rente à tolerância com 6 a 8 clotoides, coordenadas de 1e12 sem recusa por precisão, tolerância de 1e-7 em 24 s, a planta a ×1e-3 em 11,6 s, e o trecho de 3354 a 3394 mm da planta preso ao piso de 1% do arco).

A pessoa decidiu em 2026-11-17 ("Pode ser sim") seguir a recomendação: a contagem de inflexões fica como diagnóstico, sem aprovar nem reprovar nada, com esta limitação escrita na ficha de `ajustarCurvaLisa`; a correção da contagem (a profundidade do lóbulo contra a ponte entre as faixas vizinhas, travada com a lombada a ±400 e ±800) e a da inserção fora da planta vão para o backlog; e a fatia 3 usa a planta, que é estável.

O processo teria pegado sozinho? Não: o teste só tinha a lombada num comprimento e a densidade só na planta. A instrução que falta vai junto da correção no backlog: toda métrica de contagem do ajuste se prova em mais de um comprimento e mais de uma densidade fora da curva do objeto.

## Fatia 4: as regiões da coluna, do teto e da traseira, e a exclusão do furo do arco

A caixa da zebra numérica ganhou `menos`, uma lista de sub-regiões tiradas dela, cada uma outra caixa `{ x, y, z }` ou um disco `{ centro, normal, raio }`, em mm. O disco tira o que cai dentro do raio medido no plano dele, em qualquer distância ao longo da normal, e a caixa da região limita a profundidade. A exclusão vale pelo centro da face da gaiola refinada, como a própria caixa, e a borda que ela abre conta como borda da região, de modo que a ilha que encosta nela deixa de ser fechada. A região com `menos` traz `excluidas`, o número de faces tiradas. A ferramenta não conhece arco nem vão: quem declara a exclusão é o arquivo de caixas do objeto. O teste prova os dois sentidos na chapa `rede-com-ruido` (o extremo em x 249, z 250 some com um disco de 60 mm em volta dele e o de x 844 fica; com uma caixa em volta do de x 844 é o contrário) e exercita cada recusa de formato.

`tools/fixtures/curvas-lisas/carro-caixas.json` mantém `porta` e `tras` como eram, para a série das fatias 1 e 3 continuar comparável, e ganha seis regiões. `trasSemArco` é a `tras` menos o disco do arco da roda (centro em y 340 e z -1375 e raio de 380 mm, de `TABELA.arco` da receita, com 20 mm de folga: raio 400, normal em x). `ombro` é a caixa de diagnóstico da rodada 7 (y 880 a 1060, z -1300 a -20), que cobre o rolo do ombro e a raiz da coluna. `coluna` vai de y 1025 a 1400 e de z -1840 a -20, com x de 540 em diante para ficar fora do vidro traseiro (que chega a x 532), menos a caixa do vidro lateral (z -1215 a -690, y 1000 a 1262); sobram o trecho sobre a porta e a coluna C atrás do vidro. `teto` é o teto à frente do vidro traseiro (z -950 a -20, x 20 a 560), sem vão dentro. `tampa` é a tampa atrás do vidro traseiro (z -2100 a -1800). `traseira` é a face de trás (z -2500 a -2100, y 320 a 1030, x 20 a 800) menos a caixa da lanterna com 20 mm de folga (x 446 a 780, y 674 a 925). O olhar é +x no lado, +y no teto e na tampa e -z na traseira. As seis pedidas pela emenda são `porta`, `tras`, `trasSemArco`, `coluna`, `teto` e `traseira`; `ombro` e `tampa` entraram porque a primeira medida mostrou que sem elas a raiz da coluna ficava sem região e a tampa dominava o número do teto.

### Os números das rodadas 6 e 7

Comando: `node tools/modelar/zebra-numerica.mjs <receita> --caixas=tools/fixtures/curvas-lisas/carro-caixas.json`, com os padrões (passo pedido de 25 mm, efetivo de 26,4 e 26,6 mm, persistência 0,004, frequência 40). A rodada 6 é a receita de 2580a0bc (sha256 6e7b87a3…, o mesmo do registro `rodadas/rodada-05.json`), gravada numa pasta temporária ao lado de `lataria` e apagada depois; a rodada 7 é a receita atual (sha256 bda6950a…, main em 3ff238d6). Cada célula traz extremos, laços inteiros e laços esperados.

| Região | Rodada 6 (nota 7) | Rodada 7 (nota 6) | O que mudou |
|---|---|---|---|
| `porta` | 2; 0; 0,207 | 2; 0; 0,215 | nada |
| `tras` | 7; 3; 1,898 | 7; 2; 1,528 | caiu |
| `trasSemArco` | 4; 2; 1,276 | 4; 1; 0,822 | caiu |
| `ombro` | 16; 4; 6,690 | 14; 3; 6,107 | caiu pouco |
| `coluna` | 1; 0; 0,147 | 3; 1; 0,321 | subiu |
| `teto` | 1; 0; 0,082 | 0; 0; 0 | caiu a zero |
| `tampa` | 7; 10; 10,104 | 6; 13; 12,022 | subiu |
| `traseira` | 3; 2; 2,730 | 6; 4; 3,781 | subiu |

O disco do arco tira 316 faces da `tras` e, nas duas rodadas, os mesmos 3 extremos, que ficam na boca do arco (y 353 e 361 em z -1663 e -1033, e y 508 em z -1500): 0,62 laço esperado na rodada 6 e 0,71 na 7, um terço e quase metade do número da `tras`, que vinham de superfície que o corte do arco remove ou de ilha fechada só pelo furo.

### Concorda com o crítico, por região?

O crítico deu 7 à rodada 6, com laços no flanco em y 450 a 650 e na coluna C, e 6 à rodada 7, com ondas na lateral do meio da porta ao arco em y 400 a 550 e na raiz da coluna até o teto, além da traseira. Para ele a rodada 7 é pior no flanco e na coluna.

Na `porta` a medida não concorda: dá o mesmo número nas duas rodadas, e os dois extremos que acha ficam em y 729 e 848, acima da faixa de y 400 a 550 em que o crítico viu as ondas da rodada 7. Na `tras` e na `trasSemArco` ela concorda no lugar da rodada 6 e discorda no sentido: a maior ilha fica no flanco entre a porta e o arco (x 919, y 678, z -833), perto da faixa que o crítico apontou, mas a persistência dela cai de 0,075 para 0,032 da rodada 6 para a 7 e o número da região cai, enquanto o crítico viu a rodada 7 pior; a única ilha na faixa de y 400 a 550 (y 381, z -833) tem persistência de 0,011 e 0,009, sem laço. Uma caixa só do flanco (y 380 a 680, z -1000 a -350) dá 1 extremo e 0,062 laço esperado nas duas rodadas.

No `ombro` a medida concorda no lugar e não no sentido: é a região de mais extremos do lado nas duas rodadas, com ilhas na raiz da coluna (y 987 a 1032, em z -266 e -833, persistência de 0,09 a 0,17), e cai pouco da rodada 6 para a 7. Parte dessas ilhas é o degrau do ombro à coluna, que a receita declara com vinco, e a medida não separa o degrau pedido da onda. Na `coluna` ela concorda no sentido: sobe de 1 para 3 extremos e de 0,147 para 0,321, com uma ilha nova na coluna C (x 568, y 1123, z -1400, um laço inteiro de 44 mm de onda). Na rodada 6, em que o crítico viu laços na coluna C, ela acha ali um extremo sem laço (x 606, y 1124, z -1301, persistência 0,012), o que é concordância fraca. Com o olhar +y, a mesma região dá 1 e 2 extremos e nenhum laço, e a coluna C sozinha dá zero nas duas rodadas, ou seja, o número da coluna depende do olhar.

No `teto` não há defeito medido em nenhuma das duas, e o crítico não apontou o teto em si. Na `traseira` a medida concorda com o último veredito: sobe de 3 para 6 extremos e de 2,73 para 3,78 laços esperados. A maior ilha das duas rodadas fica no degrau das lanternas (y 901 a 910, persistência 0,099 na rodada 6 e 0,193 na 7), que é forma declarada na tabela `traseira`, e a da borda da tampa (y 1003) cai de 0,105 para 0,004; as três que só aparecem na rodada 7 são menores (0,015 a 0,049, com onda de 32 a 53 mm). Na `tampa` o número é o maior da peça e sobe na rodada 7, mas vem de três ilhas de persistência 0,09 a 0,51 logo atrás da base do vidro traseiro (z -1864 a -2005), mais de vinte vezes o limiar, ordem de grandeza de dobra e não de ondulação; a medida não diz se é a forma pedida.

No conjunto, a medida acompanha o crítico na coluna e na traseira e não o acompanha no flanco e na porta, que é onde ele ancorou a queda da nota de 7 para 6. As ondas que ele viu em y 400 a 550 não aparecem como ilha fechada de persistência 0,004 ou mais na superfície limite com o olhar +x. Fica por saber se elas são listra torta sem laço fechado, que esta medida não conta por desenho, ou efeito dos vãos e da malha cortada, que ela não lê. Isso depende de comparar com a imagem da zebra que o crítico julgou, e não foi feito nesta fatia.

### Atritos da fatia 4

1. A primeira caixa do `teto`, que ia até a tampa com o vidro traseiro excluído, deu 13 laços, todos na tampa, e escondia que o teto mede zero. Reproduz com `teto` em z -2100 a -20 e `menos` de x 0 a 600 e z -1800 a -950.
   Custo: uma medida de 1 min e a divisão em `teto` e `tampa`.
   O processo pegou: não; quem mostrou foi a lista `ilhas` da saída, lida à mão.
   Destino: instrução, este README: a região se escolhe por painel, e a lista `ilhas` se lê antes de aceitar o número de uma região nova.
2. A medida não separa a ilha que a forma pede (o degrau do ombro à coluna, o das lanternas, a borda da tampa) da onda, e nas regiões `ombro`, `tampa` e `traseira` a forma domina o número.
   Custo: nenhum nesta fatia; limita a leitura das três regiões.
   O processo pegou: não.
   Destino: backlog, uma exclusão por faixa ao longo de vinco declarado ou a comparação com a medida da forma pedida sem ruído.
3. O número da `coluna` muda com o olhar (+x: 1 e 3 extremos; +y: 1 e 2, sem laço), porque a coluna C tem a normal mais para cima do que para o lado e o trecho sobre a porta, mais para o lado.
   Custo: duas medidas a mais, de 1 min cada.
   O processo pegou: não.
   Destino: backlog, olhar por região tirado da normal média com aviso quando a região mistura faces de dois eixos dominantes.
4. Cada medida do carro leva de 60 a 80 s, quase tudo na execução da receita, e a rodada 6 ajusta as curvas na hora. Foram 8 execuções da receita nesta fatia.
   Custo: uns 10 minutos de espera.
   O processo pegou: não; é o atrito 2 da fatia 1, ainda aberto.
   Destino: backlog, a medida sobre o neutro já executado (plano das ferramentas das rodadas).
5. `tools/modelar/zebra-numerica.mjs` não está em `FONTES_VIGIADAS` de `tools/gates/recusas-exercitadas.mjs`, de modo que o gate não cobraria teste das recusas novas; elas foram testadas uma a uma por decisão de quem escreveu.
   Custo: nenhum.
   O processo pegou: não.
   Destino: gate, incluir a zebra numérica nas fontes vigiadas, que fica fora do território desta fatia e depende de quem conduz.
