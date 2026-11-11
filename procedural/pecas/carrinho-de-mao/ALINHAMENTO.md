# Carrinho de mão: alinhamento

Plano: [`docs/modelar/planos/2026-11-10-nucleo-para-qualquer-mecanismo.md`](../../../docs/modelar/planos/2026-11-10-nucleo-para-qualquer-mecanismo.md),
fatia 1, item 2 do gate de saída: uma peça nova e simples levada da referência
à etapa fixa pelo caminho da empilhadeira, para provar que o caminho anda e
medir o custo. A pessoa escolheu o carrinho de mão em 2026-11-11 e mandou as
referências no mesmo dia. Cada decisão de forma passa pela crítica visual dela
antes de a etapa ficar fixa.

## O objeto e as referências

Carrinho de mão de obra, de uma roda, com caçamba de chapa estampada de uns
60 L. O chassi é um tubo de aço redondo só, dobrado: na frente ele faz um laço
em U que contorna a roda por fora e por diante, os dois lados sobem em rampa
até passar por baixo da caçamba, seguem quase retos sob ela e, atrás dela,
sobem de novo até as manoplas, que abrem para fora em planta e têm punho de
borracha. O eixo da roda fica entre os dois lados do laço, preso por mancais
sob os tubos. Os pés são outra peça, de tubo mais fino: de cada lado um V sob o
braço, com o fundo arredondado no chão, e as duas pernas de cada lado ligadas
às do outro por duas travessas de chapa chata, aparafusadas sob os braços. A
caçamba é mais larga atrás, quase reta do lado das manoplas, com os cantos
arredondados, e afina arredondada para a frente; tem a borda virada para fora
em toda a volta, e dois tirantes finos descem da frente dela até o laço, perto
do eixo. A roda fica quase toda à frente da caçamba, dentro do laço, com pneu
largo e aro de chapa escuro. No objeto real a caçamba, o chassi e os pés têm a
mesma pintura azul; o rascunho dá uma cor por parte para a conferência.

As referências são cinco imagens de terceiros que a pessoa mandou e que não
entram no repositório: o pneu tem letras do fabricante em relevo. Uma foto de
lado do carrinho inteiro, com a roda à esquerda, tirada um pouco de cima (a
perna de longe aparece 80 px acima da de perto, e o tubo de perto um pouco
abaixo do plano do meio); uma foto de cima, com a roda embaixo; uma foto de
baixo, que mostra os braços sob a caçamba, os pés por dentro deles, as duas
travessas e os parafusos nos quatro cantos; uma foto de três quartos só do
chassi com os pés; e um desenho de linha do chassi de lado e em planta, com os
punhos de borracha. Entram só as coordenadas derivadas delas, em
`referencias/carrinho-de-mao.contornos.json`: as silhuetas em mm da caçamba, do
chassi, dos pés e da roda de lado, e as da caçamba, do laço, dos braços atrás
dela e da parte da roda que aparece de cima. A pessoa disse que vai mandar
também vistas geradas por IA; elas valerão como caráter da forma, nunca como
medida, e entram em `referencias/` como `<vista>.ia.png`, com a vista na
configuração da conferência ao lado das de contornos.

A escala é a do pneu: o diâmetro de 340 mm, medida típica do 3.25-8 de
carrinho de mão, adotada, fixa a da foto de lado em 260 px (1,3077 mm/px, o
eixo da roda no px 190,5 por 639 e o chão na linha 768). A foto de cima tem a
escala que dá à boca da caçamba o comprimento da de lado (820 mm em 378 px,
2,144 mm/px), e a boca dela foi levada 70 mm para trás para cair sobre a de
lado; o laço e as manoplas, que ficam mais baixos, saem dela uns 90 mm adiante
do lugar, pela perspectiva, e por isso a vista de cima só vale para a caçamba e
para as larguras. O desenho de linha não entra na medida: na escala do
comprimento ele dá os pés 334 mm abaixo do braço, e a foto de lado, 245; serve
de caráter das dobras, dos punhos e das travessas.

## Como funciona e em que ordem se monta

O chassi é a base: a caçamba assenta nos braços e se prende neles por
parafusos e, na frente, pelos dois tirantes, que descem até o laço. Os pés se
aparafusam sob os braços pelas travessas. O eixo atravessa os dois mancais sob
o laço e fica fixo neles; a roda gira no eixo, pelo rolamento do cubo. Parado,
o carrinho se apoia em três pontos: a roda e o fundo dos dois pés.

Junta: a roda gira em torno do eixo x, no centro do cubo (x 0, y 170, z 0),
sem curso. A montagem é posta parada, apoiada nos três pontos.

## Medidas (TABELA, em mm)

Referencial igual ao da empilhadeira: x lateral, y altura com o chão em 0, z
comprimento com a frente (a roda) em +z, e o eixo da roda em z 0. As fontes:
"típica adotada" é medida típica de carrinho de mão de obra de 60 L, adotada; "lado" e "cima" são a
proporção da foto de lado ou de cima, na escala adotada, lidas nos contornos;
"rascunho" é o valor que o rascunho fixou para fechar a forma, com o motivo.

| medida | valor | fonte |
|---|---:|---|
| pneu | Ø 340 × 85 | típica adotada (3.25-8); fixa a escala |
| aro | 8 polegadas (talão a Ø 203), de chapa, cubo de 110 de largura | típica adotada; largura do cubo pelo vão do laço |
| eixo | Ø 16, x de -120 a 120, em y 170 | típica adotada; altura pela roda no chão |
| comprimento total | 1.535 | lado: 1.529 (da ponta do laço à da manopla) |
| ponta de fora do laço | z 226 | lado: 225 |
| tubo do chassi | Ø 32 | cima: 32; típica adotada de 28 a 32 |
| laço | eixo do tubo a 95 do centro, reto de z -45 a 116, canto da frente de raio 94 | cima: 96 de meia largura |
| altura do laço | eixo do tubo em y 195 | rascunho: 25 acima do eixo da roda, pelos mancais sob o tubo; lado: no plano do meio, uns 20 abaixo |
| braço sob a caçamba | eixo do tubo em y 266, de z -170 a -770 | lado: 240 a 270 no plano do meio |
| abertura dos braços | em planta, reta contínua da meia largura 143,8 em z -170 a 282,3 em z -1.300: x 160 em z -305, 194 em z -580, 217 em z -770 | desenho de linha em planta (2026-11-11): 44,5 px em 180 e 69 px em 380, 3,83 mm/px pelo comprimento do chassi; baixo (164 do centro sob a caçamba) e cima (256 nas pontas) são fotos em perspectiva e valem menos |
| subida e manopla | dobra em z -1.080 (y 475, x 255), ponta em z -1.300 (y 515, x 282), os dois na reta da planta | lado: 488 em z -1.098, 515 no fim; x pela abertura dos braços |
| manoplas | punho de Ø 38 nos últimos 110, o topo a 535 do chão | desenho de linha (caráter); típica adotada |
| mancais | bloco sob cada lado do laço, x de 79 a 111, y de 158 a 195, 36 no comprimento | baixo e cima (caráter); rascunho |
| pés | tubo de Ø 22, V de z -305 a -580 no eixo do braço, fundo no chão em z -551, x 177 do centro (a média dos topos, que seguem o braço) | lado: pernas de perto e de longe, no plano do meio |
| travessas dos pés | chapa de 40 × 6, nos topos das pernas, sob os braços (face de cima em y 250); a de trás tem 412 de comprimento e a da frente 345 (razão 1,20, antes 1,04) | desenho de linha: 77 contra 95 px entre os eixos dos braços, a olho; baixo (caráter); rascunho |
| boca da caçamba | 820 × 626 (652 com a borda), de z 24 a -810, em y 462 | cima: 824 × 628; lado: boca de 15 a -812, em 430 a 471 |
| planta da boca | em retas e arcos tangentes: traseira reta em z -810, cantos de trás de raio 150, lados retos e paralelos a 313 de meia largura até z -333, flanco em arco de raio 380 convergindo, canto da frente de raio 75 (centro em x 62) e frente em arco muito aberto de raio 390 até a ponta em z 24 | cima: a foto mostra os lados paralelos na metade de trás e a frente achatada e estreita; raios achados por busca contra o contorno levado à escala de lado: sobreposição de cima 92,1% (polilinha da foto 91,7%, semicírculo de raio 313 91,1%) |
| fundo da caçamba | y 284,5, de z -715 a -170, meia largura 150 | lado (fundo entre 250 e 290); baixo (o fundo entre os braços); rascunho: 2,5 acima dos braços |
| parede da frente | sobe do fundo em z -170 à boca em z 24 | lado |
| parede de trás | sobe do fundo em z -715 à boca em z -810 | lado |
| chapa e borda | chapa de 1,5; borda virada de Ø 16 | típica adotada |
| volume | 61,8 L por dentro até o plano da boca | medido na malha do rascunho |
| tirantes | barra de Ø 10, do laço em z 32 à frente da caçamba | lado (caráter: da frente da caçamba ao laço, perto do eixo) |

A prevalência é a do pneu para a escala, depois a foto de lado para
comprimentos e alturas, a de cima para larguras e a de baixo e o desenho de
linha para o caráter. Divergência acima de 5% entre a tabela e a foto de lado
vai à pessoa.

A medida típica que o pedido dava de memória não cabe nas proporções das
referências: com o comprimento de 1.400, o pneu seria de 311; com o pneu de
350 a 400, o comprimento passa de 1.575. Adotar o pneu de 340 dá 1.535 de
comprimento, a boca com 626 de largura e as manoplas com o topo a 535 do chão,
abaixo dos 600 a 650 do pedido; a foto de lado põe a ponta da manopla de perto
a uns 500 do chão. Isso depende da pessoa, e a recomendação é ficar com a
escala do pneu, que é peça de catálogo.

## Partes e ordem de montagem

Peça rígida entre juntas é uma peça só, e o que se aparafusa a outra sem junta
entre elas é peça própria quando vem pronta de fora ou é de outro material.

1. `chassi`: o tubo dobrado único, os dois `mancais` e o `eixo`, que fica fixo
   nos mancais; os punhos de borracha, `manoplas`, são parte dele, de outro
   material. O pedido punha o eixo com a roda; ele fica no chassi porque não
   gira em relação a ele.
2. `pes`: os dois V de tubo fino e as duas `travessas` de chapa, numa peça
   aparafusada sob os braços (a foto de baixo mostra os parafusos nos quatro
   cantos), rígida com o chassi.
3. `cacamba`: a casca com a `borda` virada e os dois `tirantes`, que se
   aparafusam nela e no laço.
4. `roda`: o `pneu` e o `aro` de chapa com o cubo, pela família
   `procedural/familias/roda-pneu/`, perfil `carrinho-de-mao`, com o diâmetro
   de 340 passado como parâmetro (o perfil traz 400, de um 4.00-8). É a única
   peça com junta.

## Contatos

A caçamba assenta nos braços (no rascunho, 2,5 mm acima deles, porque com 0,5
o relato de contatos dava travessia que a malha não tem; a receita põe o
assento e os parafusos). As travessas encostam sob os braços, e as pontas de
cima dos pés entram na braçadeira sob eles. Os tirantes acabam na face de fora
da caçamba e se prendem no tubo do laço. Os mancais ficam sob o laço e o eixo
os atravessa. O talão do pneu assenta entre as abas do aro, e o cubo gira no
eixo com folga. O punho veste a ponta do tubo. A roda fica dentro do laço, com
folga para os tubos, os mancais e a caçamba.

## Grau de realismo

Tubo redondo com as dobras em curva de raio, sem quina; caçamba moldada com o
fundo plano marcado, ligado às paredes por uma dobra de raio 35, e a borda
virada; pneu com ombros redondos e aro
de chapa com o cubo; mancais e travessas como blocos e chapas. Sem parafusos,
furos de fixação nem o relevo do pneu no rascunho.

## O que reprova o objeto

O carrinho que não se apoia em três pontos (a roda e o fundo dos dois pés no
chão em y 0); a caçamba que cruza o chassi; a roda que cruza a caçamba, o laço
ou os mancais; o tubo de seção quadrada ou com dobra em quina; o chassi em mais
de um tubo, ou com garfo no lugar do laço; a caçamba em caixa, de paredes a prumo e
fundo em quina viva, ou mais estreita atrás que na frente; peça solta no ar.

## Rascunho

`referencias/carrinho-de-mao.esboco.mjs` monta o carrinho inteiro numa opção,
com onze partes nomeadas e coloridas, e
`referencias/carrinho-de-mao.conferir.json` confere a vista de lado e a de
cima contra os contornos. Medido em 2026-11-11: nada atravessa sem estar
declarado, no modo estrito; o pneu toca o chão em y 0 sob o eixo e o fundo dos
dois pés em y 0,1, em z -502 e a 166 do centro; a caixa do conjunto vai de x
-326 a 326, y 0 a 535 e z -1.309 a 226; a sobreposição com a silhueta de lado
é de 79% no conjunto, 88% na caçamba, 79% na roda, 30% no chassi e 17% nos
pés, que na foto são duas pernas afastadas pela perspectiva, e com a de cima,
92% na caçamba.

## Decisões das receitas

Em 2026-11-11 a pessoa pediu para trazer o esboço de outubro que ela achou
promissor (`docs/modelar/banco-de-provas/carrinho-refeito-2026-10-08/`), e dele
veio o fundo plano marcado da caçamba, no lugar do fundo em curva do rascunho.
A dobra do fundo tem raio 35, o menor que a conferência de espessura aceita com
a chapa de 1,5 mm, e o volume estimado passou de 61,8 para cerca de 56 L. No
mesmo dia a pessoa deixou a condução do carrinho e o aceite da forma com a IA
da sessão, até o fim ("não vou ter tempo para supervisionar nem aprovar então
deixo sobre sua tutoria"). A roda sai da família `roda-pneu` no limite que ela
aceita: cubo de 102 mm, ombro de 25,5 mm, aro sem abas e cubo com furos.

## Aceite

- alinhamento: aceito pela pessoa em 2026-11-11, "Pode ser o carrinho de mão sim"
- rascunho: aceito pela pessoa em 2026-11-11, "Sim a forma esta boa"
- delegação: pela pessoa em 2026-11-11, "deixo esse trabalho de maneira autonoma para você até o fim a partir de agora, tanto o carrinho de mão quando esse do carro, não vou ter tempo para supervisionar nem aprovar então deixo sobre sua tutoria"
