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

