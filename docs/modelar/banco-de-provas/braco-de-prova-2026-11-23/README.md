# Braço de prova de duas juntas: o alinhamento da forma

Evidência do plano do braço de prova de duas juntas, ativado em 2026-11-23.

## Decisões do alinhamento

A pessoa decidiu, por recomendação da IA: o motor do cotovelo na ponta do primeiro elo, ligado ao cotovelo pelas polias GT2 de 20 e 80 dentes; a base redonda e baixa, com a eletrônica dentro e o motor do ombro deitado numa torre em cima dela; o ombro em garfo, com o primeiro elo apoiado de um lado pelo eixo da planetária e do outro por um rolamento; e o botão de parada, de cogumelo vermelho de uns 22 mm, no topo da base, na frente, longe do caminho do braço.

## O formato dos elos

[`elos-opcoes.esboco.mjs`](elos-opcoes.esboco.mjs) desenha três formatos com o mesmo mecanismo e as medidas do catálogo da mecatrônica: caixas retas de cantos chanfrados, tubos redondos com discos nas juntas e perfil em U aberto com a correia à mostra. As imagens estão em [`elos-opcoes.png`](elos-opcoes.png) e [`elos-opcoes-tras.png`](elos-opcoes-tras.png). A pessoa escolheu em 2026-11-23 a opção C, o perfil em U aberto com a correia à mostra, recomendada porque o braço é de estudo e demonstração e o ajuste da correia fica à mão.

## Cores

A pessoa escolheu em 2026-11-23 duas cores nas peças impressas: a estrutura em cinza-escuro e o garfo e as tampas das juntas em laranja; os motores, as polias e a correia com as cores reais (preto, alumínio e preto).

## O plano da forma

As partes, em ordem de montagem: a base redonda (90 mm de raio, 50 mm de altura), com a fonte, o Arduino e os dois drivers dentro e o botão de parada no topo, na frente; a torre do ombro em garfo, duas paredes de 12 mm a 90 mm uma da outra, presas à base; o NEMA 23 com a planetária de 5:1, do lado de fora de uma parede, e o rolamento na outra; o primeiro elo, um perfil em U aberto de 150 mm entre os eixos, girando entre as paredes do garfo, com o NEMA 17 preso perto do ombro e as polias GT2 de 20 e 80 dentes com a correia à mostra até o cotovelo; o segundo elo, outro perfil em U de 150 mm até a ponta; e a garra, um volume de 40 × 45 × 40 mm com 80 g. Os eixos do ombro e do cotovelo são paralelos e horizontais, e o braço trabalha num plano vertical.

Reprova a forma: qualquer componente do pedido inicial fora do lugar ou atravessando outra peça; a correia sem folga de ao menos 2 mm até as paredes do elo; o elo que não gira o curso pedido sem bater no garfo ou na base; parede impressa com menos de 2 mm; peça mais alta que 250 mm ou mais larga que 220 mm, que não cabe na impressora da pessoa; e o centro de massa do braço esticado fora da base com a carga de pior caso.


## A forma modelada, 2026-11-23

O braço está em `procedural/pecas/braco-de-prova/`, montado em nove etapas pela [`montagem.json`](../../../../procedural/pecas/braco-de-prova/montagem.json): a base com a fonte, o Arduino, os dois drivers e o botão de parada; o garfo laranja; o NEMA 23 com a planetária; o rolamento; o primeiro elo; o NEMA 17; as polias e a correia; o segundo elo com o eixo e as tampas laranja do cotovelo; e a garra. Todas as partes são escritas no referencial da montagem, e cada uma se posiciona pela porta onde encaixa. A auditoria da montagem não acha peça atravessando outra e a base apoia no chão. As vistas, com o braço esticado na horizontal, estão em [`montado-isometrica.png`](montado-isometrica.png), [`montado-frontal.png`](montado-frontal.png), [`montado-direita.png`](montado-direita.png) e [`montado-superior.png`](montado-superior.png), e as etapas seguem abertas até a pessoa aprovar por imagem.

Mudou do esboço o que o esboço deixava atravessar. O primeiro elo virou um U de verdade, com fundo e duas paredes de 6 mm afastadas 40 mm por dentro, e as polias e a correia passaram para o plano do braço, dentro do U, porque no esboço elas ficavam fora do perfil; assim a correia tem 17 mm de folga até cada parede e 3 mm até o fundo. O NEMA 17 ficou do lado de fora da parede de trás, a 80 mm do ombro como no esboço, com o eixo entrando no U por um furo, e a distância entre as polias ficou em 70 mm. O segundo elo, que no esboço se sobrepunha ao primeiro, abraça o primeiro pelo lado de fora no cotovelo, com 1 mm de folga, e o fundo dele só começa depois da ponta do primeiro. O motor e a planetária ficaram centrados no eixo do ombro (no esboço estavam 28,5 mm abaixo dele), com a flange na parede do garfo e o eixo de saída de 25 mm chegando à parede do primeiro elo. O rolamento ficou por fora da parede de trás, e o primeiro elo ganhou um pino de 8 mm que gira nele. A garra começa a 305 mm do ombro, depois da placa de 5 mm que fecha a ponta do segundo elo.

Ficou sem conferir: o curso das juntas sem bater no garfo ou na base (o NEMA 17 passa perto da parede de trás do garfo ao girar o ombro para trás), o centro de massa do braço esticado com a carga, que fica muito além da base de 90 mm de raio, e as medidas que não estão no pedido inicial, como o rolamento de 28 mm do esboço, a altura de 12 mm dos drivers e a espessura de 1,5 mm da correia, que são estimativa. O conjunto mede 240 mm na direção do eixo do ombro, por causa do motor deitado, mas cada peça impressa cabe na impressora.
