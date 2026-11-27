# Cabos: as provas

Evidência do plano [cabos](../../planos/2026-11-27-cabos.md).

## Fatia 1: o cabo entre dois pontos (2026-11-27)

A curva é a elástica discreta (`procedural/familias/cabo/curva.js`): uma haste inextensível de até 97 nós, de trechos iguais, que sai reta de cada ponta na direção pedida e minimiza a soma dos quadrados da segunda diferença com o comprimento de cada trecho fixo; com o caimento entra a gravidade em −y. O palpite é uma Bézier de quarta ordem de menor flexão, com a flecha de um lado só (a regra do lado é fixa), e cada iteração resolve o problema quadrático linearizado pelo complemento de Schur. A Bézier cúbica de Hermite, a primeira ideia, não serve: com as duas pontas viradas uma para a outra os quatro pontos de controle ficam numa reta e o cabo não arqueia. O comprimento da curva lisa (Hermite C¹ pelos nós) é acertado a 0,02% refazendo a haste com o comprimento corrigido.

As estações do tubo vêm do desvio máximo da corda, numa escada de 17 números de estações (uma composição por degrau, porque a composição tem pontos fixos). As faces são lados × trechos + 2 × (lados − 2); o friso desenha o círculo em quartos de arco, e por isso os lados são 8, 12, 16 a 32.

`node docs/modelar/banco-de-provas/cabos-2026-11-27/medir-casos.mjs` mede os casos de `tools/fixtures/cabo/casos.mjs` (comprimento de corte, raio mínimo, faces e tempo).

Imagens em `tools/bancadas/out/cabos/` (não versionadas): um arquivo por caso e `lados-8.png` contra `lados-24.png`.

A pessoa aprovou o cabo entre dois pontos por imagem em 2026-11-27, com a frase "aprovo sim" (`aprovado-*.png`: o laço, o caimento e o mesmo cabo com 8 e com 24 lados), sabendo que os lados vão de 8 a 32 de 4 em 4 e que a conferência de porta se confunde quando as duas tampas ficam no mesmo plano.

## Fatia 2: pedido, passagens, terminais e feixe (2026-11-27)

O jeito de pedir é `cabo({ de: { ponto, direcao }, para: { ponto, direcao }, comprimento | folga, diametro, lados, ... })` em `procedural/familias/cabo/pedido.js`: a ponta B entra em coordenada absoluta e vira o deslocamento da família, a folga de qualquer tamanho vira comprimento (o piso de 0,3 da família é o do ponto mínimo da aprovação, em que todos os parâmetros estão no mínimo e as direções mandam o cabo para longe da outra ponta), e a recusa fala o vocabulário do pedido. As passagens são até duas, com ponto e direção (a da corda se omitida), a braçadeira é um anel de fio redondo e o terminal é a capa cilíndrica ou o olhal (anel), todos voltas fechadas do friso, sem booleana. O comprimento se reparte entre os trechos pelo desvio das direções em relação à corda. Os acessórios são chamadas próprias (`cabo.capa` e `cabo.anel`, duas composições da família), que `cabo()` junta ao cabo; o feixe não os leva. O feixe (`feixeDeCabos`, 2 a 6 cabos) desloca cada cabo pelo eixo normal ao plano de dobra, mede a distância entre os eixos contra a soma dos raios e soma as faces no orçamento; entra pelas `poses` de `instanciaDeFamilia`. Os extremos da família mudaram só no ponto máximo (comprimento até 12000 mm e diâmetro até 25 mm, para o ponto máximo com passagens ser chamável); mínimo, médio e os três perfis têm o mesmo hash de antes.

Imagens em `tools/bancadas/out/cabos-fatia2/` (não versionadas): `bracadeiras.png`, `terminais.png`, `feixe.png`.

A pessoa aprovou a fatia 2 por imagem em 2026-11-27, com a frase "Sim, aprovo as duas" (`aprovado-fatia2-*.png`: o cabo com duas braçadeiras, os terminais de capa e olhal e o feixe de três cabos), e os limites novos da família, diâmetro até 25 mm e comprimento até 12.000 mm.

## Fatia 3: o cabo na montagem com articulação (2026-11-27)

As pontas se prendem a portas por `{ instancia, porta, sentido?, afastamento? }` (`procedural/familias/cabo/montagem.js`): o ponto é o centro da porta na pose resolvida e a direção de saída é o eixo dela. Em cada passo do curso de uma junta as instâncias que ela move são levadas à pose do passo (a mesma conta de `conferirArticulacao`, que não devolve a pose), as portas são resolvidas de novo e o cabo é refeito pela `cabo()` com o mesmo comprimento. A conferência (`conferirCursoDoCabo`) acusa por passo `estica`, `dobra`, `autocontato`, `pontas-coladas`, `atravessa` (o tubo contra cada sólido, pela régua de contato da articulação, folga de 0,3 mm) e `inconclusivo`. Passagens e feixe ficam fora do cabo por portas.

Prova (`tools/fixtures/cabo/junta-com-cabo*.test.mjs`): dois atuadores de 100 mm da fixture de duas juntas, com a porta `cabo` declarada na fixture em cada carcaça, junta A de −90° a 90° em 24 passos. O cabo de 110 mm passa nos 25 passos, com o comprimento de corte entre 109,996 e 110 mm; o curso inteiro leva uns 3,7 s. Os arranjos que falham, em 12 passos: cabo de 48 mm estica de −90° a −60° e de 60° a 90°; cabo de 110 mm da porta oposta dobra abaixo do raio mínimo de −30° a 30°; cabo de 115 mm da mesma porta atravessa a carcaça B e a saída B só no passo zero, onde uma conta independente (eixo do cabo dentro do corpo de revolução de B) também o põe dentro.

Imagens em `tools/bancadas/out/cabos-na-junta/` (não versionadas), de `node tools/fixtures/cabo/junta-com-cabo-vistas.mjs`: `inicio-*`, `meio-*`, `fim-*` (isométrica, de cima e de lado) e `atravessa-no-meio-*`. Aguardam a aprovação da pessoa (gate 5).

Achado: a memória do plano do cabo usava a ordem dos campos como chave, e a chamada e as medidas pediam a mesma conta em ordens diferentes, de modo que cada pose resolvia a haste duas vezes; a chave agora é ordenada e o curso refeito caiu de 8,4 s para 4,4 s.

A pessoa aprovou o cabo na junta por imagem em 2026-11-27, com a frase "aprovo o cabo na junta, o que me preocupa é ele passando por dentro de outra peça" (`aprovado-junta-*.png`; `falha-atravessa-no-meio.png` é o arranjo feito para falhar).
