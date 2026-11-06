# Abertura em qualquer direção — a bateria de limites da operação

Provas do plano [abertura em qualquer direção](../../planos/encerrados/2026-11-06-abertura-em-qualquer-direcao.md), em 2026-11-06. A operação
`aberturaPorContorno` ganhou a vista por vetor (fatia 1), e esta bateria a mediu em nove peças de teste neutras de
`tools/fixtures/aberturas-em-teste/`, uma por caso, cada uma com o gate de malha (nenhuma aresta sem par, vínculo não manifold,
triângulo sem área pelo adaptador nem lasca da topologia) e a borda do vão contra o desenho (`medidas.ts`). Os testes estão ao lado das
peças: `vao-da-quina.test.ts`, `dois-vaos.test.ts`, `formas.test.ts`, `superficies.test.ts` e `chapa-grande.test.ts` (lento). As
imagens de cada peça (vista isométrica, uma cor por parte, a lente do vão em roxo) estão nesta pasta, com o nome
`bancada-...-<peça>-js-isometrica.png`. Nada vem de referência externa, e a malha do furgão ficou igual (retrato do acervo antes e
depois: 1 peça igual, 0 com mudança).

## O que a bateria achou e o que foi corrigido

A limpeza fina é uma opção nova do passo, `limpezaFina`, ligada por padrão na vista por vetor oblíqua e desligada nos eixos x, y e z:
ligada, a fusão da costura não torna lasca uma face de pele que estava saudável, e a face com três cantos alinhados (que a vizinha
obriga a ter o vértice do meio) se divide por uma diagonal, na chapa e na lente. Ligada no furgão ela muda a malha (a grade ganhava
53 faces e as faces finas caíam de 254 para 161), por isso o padrão dos eixos continua o de antes, e o furgão a adota declarando
`limpezaFina: true` quando o plano dele voltar.

1. A tampa por laços. O `gaiolaPorLacos` recusava a tampa com mais pontos no trecho `ate`, porque a escada fechava a última face sobre
   a reta do trecho. Agora os pontos alinhados entram na última face da escada, como os de `de` entram na primeira (o trecho `ate`
   curvo continua com a face própria); teste em `gaiola-por-lacos.test.ts`. As 16 faces finas da base da caixa de quinas eram outra
   coisa: a primeira faixa da tampa tinha 9 mm de largura por 560 de comprimento (arco de cinco pontos), e a subdivisão com espessura a
   rasga em lascas. Com quatro pontos por quarto de arco a faixa mede 16 mm e a base sai sem lasca.
2. A tira de 163 por 11 mm do vão da quina não era uma fusão que faltou, e sim fusões demais: a costura reta do corte a 45° passa rente
   à linha y = 250 da malha, e a regra do canto quase reto fundia os vértices da costura um atrás do outro, o que puxou as 13 faces da
   pele em leque, todas de 12 mm de base por 160 de altura, uma delas abaixo do limite (razão 2,6e-3). A guarda da limpeza fina recusa
   a fusão que faria uma face de pele de razão 0,0045 ou mais cair abaixo de 0,003.
3. O triângulo sem área do vão da quina era o pentágono de pele cujo vértice do contorno (u = -150, v = 250) cai sobre a linha da malha
   e deixa três cantos alinhados: a triangulação do adaptador cortava ali uma orelha de 0,3 mm² (ruído de float32 num lado de 77 mm).
   A divisão por diagonal tirou os cinco pentágonos assim do vão da quina. O piso da divisão é o do gate de malha (2e-9 do quadrado do
   maior raio da peça), porque o da chapa sozinho é pequeno demais numa lente de 190 mm dentro de uma peça de 800.
4. A chapa de 125 mil vértices estourava a pilha na operação (`Math.max(...lista)` sobre os vértices da chapa), e o gate da bateria
   achou o mesmo no adaptador do Three (`adaptar-three.js`, `push(...lote.faces)`), que fica fora do território. A operação foi
   corrigida; o adaptador não: a chapa de 250 mil faces em uma parte só não chega a ele (ver o último caso).
5. A recusa "cruza a borda da chapa" agora diz que a borda de um vão aberto antes conta e que dois vãos do mesmo eixo precisam de folga, e,
   com `sentido`, qual é o plano que separa as camadas.
6. Dois vãos com o contorno do segundo a menos de 0,3 mm da borda do primeiro fundiam vértices da borda registrada do primeiro, que o
   friso lê; agora a operação recusa e diz a folga.
7. O registro do vão ganhou `limpeza.divisoes` e `limpeza.finasRestantes` (as faces finas que a limpeza não achou como desfazer).

## A tabela dos casos

Todas as medidas de borda abaixo saem iguais ao desenho a menos de 0,004 mm (o piso da conta é a precisão float32 da Manifold); o
limite de 0,5 mm do plano nunca esteve perto. O tempo é o do passo todo, subdivisão incluída, no contêiner de 4 processadores.

| caso | peça | resultado | medida |
|---|---|---|---|
| vão que dobra a quina, vista [1, 0, 1] com sentido + | `caixa-de-quinas.js` | passa, um vão só, malha fechada, borda nas duas faces | 12 521 faces, 2,3 s, 5 divisões, desvio 2e-13 mm; alcança a face +z e a +x nas duas peles; sem sentido, recusa: "atravessa a chapa 2 vezes, declare sentido" |
| dois vãos, mesma vista y, a 20, 1 e 0,3 mm | `dois-vaos.js` | passa, fechada, sem lasca | 2 357 a 2 377 faces, 0,6 a 0,7 s, desvio até 0,004 mm |
| dois vãos, mesma vista, abaixo de 0,3 mm | `dois-vaos.js` | recusa com a medida | 0,2 e 0,05 mm: "a costura chega tão perto da borda do vão do passo 1 que a limpeza fundiu N vértices dela"; sem a recusa, a tira de 0,15 mm sai lasca (4 faces finas em 0,05 mm) |
| dois vãos, mesma vista, folga zero ou contorno dentro do primeiro | `dois-vaos.js` | recusa | "cruza a borda da chapa vista do eixo y (a borda de um vão aberto antes conta...)" |
| dois vãos na quina, um em cada face (o caso do furgão), a 5 mm do furo do primeiro visto do eixo do segundo | `dois-vaos.js` (`passosNaQuina`) | passa, fechada, sem lasca | 12 535 faces, 3,7 s; o mesmo passa a 2, 1, 0,5, 0,3 e 0,2 mm; a 0,1 e a -1 mm recusa pela borda |
| vão dentro da lente de outro | `dois-vaos.js` (`comFuro`) | passa: a lente é cortada como chapa de duas peles, fechada e sem lasca | 2 382 faces, 0,8 s, furo no desenho a menos de 0,5 mm |
| contorno em L (braços de 40 mm) | `contornos-de-forma.js` | passa | 1 353 faces, 0,3 s, 2 divisões |
| estrela de cinco pontas (raio de dentro 45 e 20 mm) | `contornos-de-forma.js` | passa | 1 449 e 1 435 faces, 0,3 s |
| bico agudo de 30, 8 e 4 graus | `contornos-de-forma.js` | passa; a ponta do desenho fica na borda a menos de 0,5 mm | 1 295 a 1 344 faces, 0,2 s |
| bico agudo de 2 graus | `contornos-de-forma.js` | recusa com a medida: "o recuo de 5 mm fecha o vão inteiro; reduza recuoDaLente"; com `recuoDaLente` de 1 mm passa | 1 315 faces |
| contorno que cruza um vinco vivo (cumeeira) | `vinco-e-borda.js` | passa; os vértices da borda sobre a cumeeira ficam nela | 2 232 faces, 0,4 s, 4 divisões |
| contorno a 40, 5 e 1 mm da borda da chapa | `vinco-e-borda.js` | passa | 2 198 a 2 224 faces |
| contorno a 0,5 mm da borda da chapa | `vinco-e-borda.js` | aceita, mas a tira que sobra é ela mesma a lasca: o gate de malha acusa 1 face fina | limite do desenho, e não da operação |
| contorno encostado na borda da chapa ou fora dela | `vinco-e-borda.js` | recusa: "fora da chapa" ou "cruza a borda da chapa... caber inteiro dentro dela" | a 0 e a -5 mm |
| sela de raios de 250 mm, vão de 160 mm a 640 mm (inclinação de 54 graus), cúpula a 580 mm (46 graus) | `dupla-curvatura.js` | passa | 2 341 e 2 352 faces, 0,3 a 0,4 s |
| sela, vão a 500 e a 580 mm (flanco de 30 e de 46 graus) | `dupla-curvatura.js` | a malha fecha, mas fica 1 lasca (razão de 0,0007 a 0,0016): limite, ver abaixo | nas posições 450, 500, 580 e 670 mm, 1 lasca; a 700 mm, 4 (a tira de 20 mm junto da borda) |
| folha dobrada em S, três camadas na mesma reta | `tres-camadas.js` | sem sentido recusa ("atravessa a chapa 3 vezes"); com + corta só a de cima, com - só a de baixo, fechadas e sem lasca | 6 935 faces, 0,8 s |
| folha dobrada em U, duas camadas | `tres-camadas.js` | idem, com 2 vezes | 4 133 faces, 0,4 s |
| camadas que se sobrepõem em profundidade (a de baixo, em x = 200, passa da profundidade que a de cima atinge no meio) | `tres-camadas.js` (`ondas: 70`) | recusa nos dois sentidos, com as duas profundidades e os pontos | a de cima chega a 230,029 mm, a de baixo a 240 mm |
| camadas que não se sobrepõem dentro do vão, mas a de baixo passa do plano fora dele | `tres-camadas.js` (`ondas: 60`) | sentido +: recusa pela borda e diz o plano e o que fazer; sentido -: passa | 11 417 faces, 1,5 s |
| chapa feita por `gaiolaPorRede` | `chapa-por-rede.js` | passa | 3 576 faces, 0,6 s, desvio 0,0003 mm |
| corpo fechado feito por `gaiolaPorLacos` (elipsoide, pontas em um ponto), vista z com sentido + | `casco-por-lacos.js` | passa; sem sentido recusa | 4 021 faces, 0,5 s |
| um vão numa chapa de 249 mil faces | `chapa-grande.js` | passa, fechado e sem lasca (medido sem o adaptador) | 40,7 s para o vão, 45,1 s o passo todo (a subdivisão sozinha 4,4 s), 3,6 GB de memória |

## O que ficou como limite, com a medida

- A lasca de uma face da parede ou da lente na sela de flanco, em 4 de 8 posições medidas fora da borda (450, 500, 580 e 670 mm). A face é um triângulo da parede (ou da borda
  da lente) em que quatro pontos da costura caem na mesma reta (os pontos de cruzamento da pele de fora, os da de dentro e o vértice do
  canto da lente recuada), e a triangulação certa pede três triângulos a partir de dois polígonos, o que a limpeza de hoje (que
  funde e divide faces, mas não refaz a triangulação de duas faces vizinhas) não faz. A malha fecha, o gate a acusa, o registro diz
  `limpeza.finasRestantes`. Não bloqueia caso real conhecido; vai ao backlog com a medida.
- O recuo da lente em contorno de bico de 2 graus ou de contorno estreito: recusa clara; o conserto é `recuoDaLente` menor ou `lente`
  declarada de outro modo.
- A camada pelo plano entre as duas: a separação é um plano perpendicular ao eixo; a camada que passa desse plano fora do contorno
  entra na verificação da borda e recusa o vão (caso `ondas: 60` com +). A recusa diz o plano.
- O adaptador do Three não aceita uma parte de 125 mil faces ou mais (estoura a pilha em `push(...lote.faces)`, linha 388 de
  `src/autoria/adaptar-three.js`); a operação já aguenta. Fica fora do território deste plano.

## O custo de um vão na chapa grande

A chapa de `chapa-grande.js` (cúpula de 770 por 770 mm, cinco níveis, 249 216 faces antes do vão) leva 4,4 s para subdividir e 40,7 s
para o vão com a lente, com 3,6 GB de memória. O perfil de CPU do passo mostra a `nucleoBooleano` de `booleanas.js` com 19%, a coleta
de lixo com 18%, o corpo de `aberturaPorContorno` com 10% (as cópias da chapa para a lente e os mapas), e o resto espalhado em
`cascaAberta`, `limparCostura`, `conferirProjecao` e `voltasDaBorda`. Na de quatro níveis (63 mil faces) o vão leva 9 s. O custo é
linear na chapa, e é o da booleana sobre a chapa inteira que o backlog já registra; não foi atacado aqui.

## Como reproduzir

`npx vitest run tools/fixtures/aberturas-em-teste/` roda a bateria rápida (os quatro arquivos de testes somam de 25 a 30 s, cada um
abaixo de 12 s sozinho), e o `chapa-grande.test.ts` entra em `TESTES_LENTOS`. As imagens saem de
`npm run bancada -- tools/fixtures/aberturas-em-teste/<peça>.js --vistas=isometrica --cores`.
