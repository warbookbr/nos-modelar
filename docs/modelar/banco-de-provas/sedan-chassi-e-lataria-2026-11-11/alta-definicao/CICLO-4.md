# Sedã em alta definição, ciclo 4: a cabine sem contornos, e a frente e a traseira até o eixo

Este é o quarto ciclo da fatia 4c do plano [`2026-11-10-nucleo-para-qualquer-mecanismo.md`](../../../planos/2026-11-10-nucleo-para-qualquer-mecanismo.md). O ciclo tem duas partes. Na primeira saem da cabine os contornos do [ciclo 3](CICLO-3.md), agora que o núcleo mede o raio em quina oblíqua, deixa duas quinas com raio se cruzarem, faz a moldura seguir a borda limite (`refinar`) e fecha a ponta em que a lateral some, fundindo colunas. Na segunda entra a frente e a traseira do lado direito até o eixo de simetria: o capô até a borda da frente com a tomada de ar, o painel da frente com a grade e o farol, a tampa do porta-malas, o painel de trás com a lanterna e os dois para-choques. Nenhuma forma daqui foi aprovada pela pessoa, e o crítico sem contexto não foi chamado.

Os arquivos estão em [`procedural/pecas/sedan-chassi-e-lataria/alta-definicao/`](../../../../../procedural/pecas/sedan-chassi-e-lataria/alta-definicao/). O `caminho-a-gaiola-da-casca.esboco.mjs` é o andar de baixo, agora até as bordas da frente e de trás e com a tampa, e o `andar-de-cima.esboco.mjs` traz a cabine. O `frente-e-traseira.esboco.mjs` importa os dois e é o lado inteiro, com 32 partes e 103.497 faces.

## O desenho

A cabine. Ela vai do pé do vidro traseiro (z -1312,9) ao pé do para-brisa (z 738), onde a lateral some. Na frente as colunas da lateral se fundem duas a duas nas três últimas estações, e atrás se dividem do mesmo jeito: duas colunas declaram `de` a mesma coluna da estação anterior. O topo da cabine nas duas pontas é o mesmo plano do capô e da tampa, e a 4 mm deles. O vão de 40 mm do tampão fechou. A quina da cabine pede `raio: 4` direto, as quinas do teto vão até a quina da cabine, e as molduras usam `refinar: 2`.

O andar de baixo. Ele vai até a borda da frente (z 2118) e a de trás (z -2083). Além de z 1990 a lateral inteira fica dentro da planta do facetado, por um mínimo suave misturado em 60 mm de z. Com isso o para-lama dobra o canto da frente, e a faixa e a linha do capô se afastam da quina junto com ele. A tampa do porta-malas usa as mesmas colunas do capô: elas começam 4 mm atrás da cabine e vão até a borda de trás. Ela é cortada da lateral traseira por uma linha nova, `tampa`.

Os painéis da frente e de trás. São chapas próprias, ao longo de x, no plano da borda da chapa de baixo, a 4 mm dela por cima e dos lados. O alto e o lado de cada painel saem da borda real da chapa de baixo, tirada por `curvaDaGaiola` na estação da ponta (atrito 6).

Farol, grade e lanterna. O farol é um vão do painel com um anel de três voltas deslocadas para dentro 14, 9 e 4 mm (`relevo`), com um recuo por lado de 34 a 42 mm. É a tentativa de rebaixo com o que existe, e a lente é uma chapa de 4 mm atrás da abertura. A grade é um vão que vai até o eixo, com cinco lâminas de caixa que passam por trás da borda do vão. A lanterna é um vão de cantos vivos com a lente rente, colada atrás da chapa, como os vidros.

Os para-choques e a tomada de ar. Os para-choques são sólidos de `gaiolaPorLacos` ao longo de x, de 72 mm de fundo. As quinas de fora têm 8 mm de raio e as de dentro 3. Os dois são tampados nas pontas, também no eixo (atrito 7). O da frente envolve o canto do para-lama a 4 mm dele, e o de trás fecha em chanfro. A tomada de ar é uma chapa sobre o capô, de z 790 a 1760, com 70 mm de altura e quina de 6 mm, aberta na frente e fundida no capô atrás pela divisão de colunas.

## A cabine antes e depois das correções

| Medida | Ciclo 3, com os contornos | Ciclo 4, sem eles |
|---|---|---|
| Pontas da cabine | acabava onde a lateral tinha 40 mm (z 703 e -1.295), com o tampão aberto | vai às pontas por fusão de colunas (z 738 e -1.312,9) |
| Pontos da gaiola / faces | 585 / 18.844 | 670 / 25.260 |
| Raio da quina da cabine, pedido 4 mm | pedido compensado (5,7 e 8 mm); `raio:aresta` reprovava 22 de 50 cortes que estavam a 3% dos 4 mm | `raio: 4` direto; 2,6 / 3,9 / 5,4 mm, 2 de 49 cortes fora |
| Quinas do teto, pedido 15 mm | paravam 35 mm antes da quina da cabine; 14,5 a 14,7 mm | vão até a quina; 14,5 mm, 13 de 13 em cada uma |
| Pé da cabine, pedido 3 mm | 2,7 mm, 39 de 39 | 2,7 mm, 40 de 40 |
| `npm run ondulacao`, falhas fora das feições | 0 | 0 |
| Junto das feições, maior | 33,5 mm no pé; 4,85 e 2,14 nos cantos do teto | 7,6 e 6,6 mm nos pés das colunas A e C (atrito 10); nada nos cantos do teto |
| Desvio p95 / máximo | 0,48 / 1,18 mm | 0,96 / 3,18 mm |
| Faces finas | 0 | 0 |
| Moldura no canto da janela | 3 segmentos retos | segue a borda arredondada (`refinar: 2`) |
| Vão do capô e da tampa com a cabine | não havia (tampão aberto de 40 mm) | 4,00 mm, degrau 1,01 a 1,10 mm (atrito 8) |

## A frente e a traseira

| Medida | Valor |
|---|---|
| Linhas de código | 218 (`frente-e-traseira.esboco.mjs`), mais 14 no andar de baixo para a frente, a traseira e a tampa |
| Partes / faces do lado inteiro | 32 / 103.497 |
| Montagem (`esboco:nucleo`) | 88 s o lado inteiro; 4 s só as peças da frente e da traseira, com `HD_CONFERIR=0` |
| Medidas com cache | ondulação 125 s (ela não usa o cache), faces finas 5 s, raio 9 s, vão 20 s |
| `ondulacao`, chapa de baixo | 2 falhas: calombo de 0,50 mm no capô junto da frente (z 1995) e de 0,32 mm na lateral de trás (z -1892); p95 0,18 mm |
| `ondulacao`, painel da frente | 1 falha: calombo de 1,09 mm na linha logo abaixo do farol, puxada pela transição do anel |
| `ondulacao`, painel de trás, lentes, vidros | 0 |
| `ondulacao`, para-choques | 19 e 17 falhas, todas `emenda` de 0,1 a 1,7 mm e de 1 a 8 mm de extensão, nos oito cantos de cada tampa (atrito 2) |
| `ondulacao`, tomada de ar | 1 falha: calombo de 1,35 mm em 16 mm, na ponta de trás, onde as colunas se dividem |
| Faces finas | 3, as da parede do corte do fim da porta traseira desde o ciclo 2 |
| Raio, para-choques | quinas de fora 7,3 (frente) e 7,8 (trás) para 8 mm; de dentro 2,9 para 3; todos os cortes dentro de 20% |
| Raio, tomada de ar | 5,8 mm para 6, 19 de 19 |
| Raio, cintura e ombro do andar de baixo | cintura 5,8 mm, 84 de 84; ombro com 11 de 84 fora, onde a quina morre |
| Vão do capô e da tampa com os painéis | capô 4,01 a 4,12 mm, degrau até 0,58; tampa 3,20 a 4,08, mediana 4,05 |
| Vão dos para-lamas com os painéis | frente: mediana 4,07, de 2,06 a 4,75 mm; trás: mediana 4,05, de 1,39 a 4,49; os mínimos no canto de cima, junto do raio da cintura (atrito 6) |
| Vão da tampa com a lateral traseira | 4,06 mm, degrau 0,00 |
| Vão do capô com o para-lama | 4,06 mm, com um mínimo isolado de 2,24 e degrau de 3,39 no canto da frente, numa linha de 1 mm |
| Para-choques | soltos a 4 mm dos painéis, como declarado; o suporte fica fora do esboço |
| Lentes, lâminas e tomada | assentadas como declarado (`atravessa` de 0,014 a 0,2 mm) |

### Tempo gasto em cada passo

Leitura das correções, da receita da fusão e do plano do rebaixo: 8 minutos. A cabine sem contornos, com a divisão nas pontas e a medida dela: 15. O andar de baixo até as bordas e a tampa: 12. O esboço da frente e da traseira: 15. O anel do farol, que levou seis rodadas de recuo, densidade e normal: 15. Os para-choques e a prova de separação: 12. Os painéis com a borda real e o ajuste: 15. As medidas finais, em quatro filas: 25, quase tudo de espera. As imagens: 15. O documento: 15. Somando, cerca de duas horas e meia.

## As imagens

As imagens estão em [`ciclo-4/`](ciclo-4/):

- [`tres-quartos-frente-e-tras.png`](ciclo-4/tres-quartos-frente-e-tras.png): o lado inteiro de frente e de trás, ao lado do mesmo lado do facetado.
- [`luz-rasante-e-curvatura-da-frente.png`](ciclo-4/luz-rasante-e-curvatura-da-frente.png), [`luz-rasante-e-curvatura-da-traseira.png`](ciclo-4/luz-rasante-e-curvatura-da-traseira.png) e [`luz-rasante-e-curvatura-tres-quartos.png`](ciclo-4/luz-rasante-e-curvatura-tres-quartos.png): a de trás saiu dos scripts do Blender chamados à mão, porque `vistas:superficie` não gera a vista de trás.
- [`recorte-farol.png`](ciclo-4/recorte-farol.png), [`recorte-grade.png`](ciclo-4/recorte-grade.png), [`recorte-lanterna.png`](ciclo-4/recorte-lanterna.png) e [`recorte-canto-do-teto.png`](ciclo-4/recorte-canto-do-teto.png).

O que vi nelas:

- Lado inteiro. Tem o caráter do facetado, com frente reta e vertical, capô com a tomada de ar, para-choques escuros de barra e cabine fechada no pé do para-brisa e no do vidro traseiro.
- Farol. Fica no fundo de um rebaixo com raio: a chapa desce do painel até a abertura, e a curvatura mostra o anel do rebaixo em volta da lente.
- Grade. As cinco lâminas aparecem pelo vão, cortadas no eixo para o espelho.
- Lanterna. É um retângulo de cantos vivos rente ao painel. Antes de declarar os cantos ela saía uma pílula.
- Canto do teto. As três quinas se encontram num canto limpo, onde no ciclo 3 a quina transversal parava antes.
- Luz rasante e curvatura. A lateral, o teto e o capô saem lisos. A curvatura acusa as pontas dos para-choques e, no canto de trás da lateral, o brilho do ombro que segue até o painel.

## Atritos

1. O rebaixo do farol sai do relevo dos anéis, mas custa seis rodadas, e o rebaixo de fundo fechado não existe. O anel com recuo pediu um recuo por lado dentro de faixas estreitas ("a transição fecha de 11,6 a 14,0 mm ou a partir de 20,6 mm"), a grade a menos de 35 mm em volta do vão e o vão afastado 30 mm do alto do painel. Com estações a 140 mm a chapa dobrava sobre si nos quatro cantos, mesmo sem relevo, e só montou com elas a 45-50 mm. A lente fica atrás da abertura, posta à mão pela soma do relevo e do recuo. O que o plano do rebaixo pensou, a região rebaixada a uma profundidade com o fundo seguindo a superfície, não existe: a maçaneta, a placa e o friso de fundo fechado não têm caminho. O menor caso é uma chapa plana de grade de 140 mm com um vão de 400 por 200 e um anel de três voltas com relevo. A atribuição é da ferramenta e da instrução. Resolveria o anel escolher a densidade e os recuos que fecham, e o rebaixo de fundo fechado do plano em rascunho.

2. Duas quinas com raio ainda não se cruzam na `gaiolaPorLacos`. O vinco ao longo do laço da ponta (`laco: 'primeiro'`) é recusado com "liga 'paraChoqueDianteiro_l0_baixo0' a 'paraChoqueDianteiro_l0_baixo1', que não formam aresta da gaiola", porque os apoios das quinas da barra entraram entre os pontos do laço. É a correção do ciclo 3 que só chegou à gaiola por estações. O contorno foram dois laços de apoio a 4 e 10 mm de cada ponta, e ficaram 19 e 17 falhas de emenda, de até 1,7 mm, nos oito cantos de cada tampa. O menor caso é a barra de quatro trechos do exemplo da ficha, com `raio` nos quatro `entre` e um vinco no primeiro laço. A atribuição é do núcleo.

3. A linha ao longo de uma coluna não vai até a estação em que a coluna termina no meio da grade. Com `curvaDaGaiola({ coluna: 'vaoDoCapo', de: 'traseira', ate: 'peDaTampa' })` vem a recusa "as colunas 'vaoDoCapo' e 'capoBorda' existem em 'peDaTampa' e não ambas em 'zm1291'". O contorno foi uma estação 33 mm antes, com a ponta da linha passando 7 mm da borda. Uma estação a 15 mm quebrava a gradação e deixava um calombo de 9,6 mm junto do ombro. O menor caso é uma coluna que termina (`termina: true`) numa estação do meio e a linha pedida até ela. A atribuição é do núcleo.

4. A prova de separação acusa ponte na ponta da própria linha, fora da chapa. Com a linha do capô até a borda da frente e `alem: 30`, a montagem é recusada com "a linha 'capo' não separa os dois lados dela", em (664, 971, 2126), 8 mm além da borda. Com `alem: 6` as seis linhas provam separar, e os 7 painéis saem. O menor caso é uma chapa plana com uma linha que sai pela borda com `alem: 30`. A atribuição é do núcleo.

5. A normal da gaiola por estações ao longo de x saiu para dentro sem aviso. Os dois painéis montaram com a espessura crescendo para fora, e o que acusou foi o relato de contatos: as lâminas da grade a 0,8 mm do painel e o para-choque de trás a 3 mm, em vez de 4. Foi preciso inverter o `virar`. O menor caso é uma gaiola de estações em +x com colunas de baixo para cima. A atribuição é da ferramenta. Resolveria um `fora` declarado, como o da rede de curvas, conferido ao montar.

6. A chapa que encosta na borda de outra precisa da borda real, e a gaiola não a dá por coluna dentro de um vão. Com a borda pela fórmula do alvo, o vão dos painéis com os para-lamas ia de 0,1 a 5,7 mm. Com a borda tirada por `curvaDaGaiola` na estação da ponta, o alto ficou certo (4,01 a 4,12 mm com o capô). O lado ficou de 2,3 a 7,1, porque entre as linhas do farol e da lanterna não cabe coluna no painel: ela cairia no vão. Uma coluna que só existe na estação da borda (um pentágono) e um ajuste medido de 1,1 mm na frente e 0,3 atrás deixaram as medianas em 4,07 e 4,05. Os mínimos de 1,4 a 2,1 mm continuam no canto de cima, junto do raio da cintura. O ajuste existe porque na chapa oblíqua do canto a pele de dentro não fica 1 mm atrás da de fora em x. O menor caso é uma chapa plana encostada, com vão de 4 mm, na borda de uma chapa curva com um vão no meio das linhas. A atribuição é do núcleo. Resolveria um ajudante que dê a borda de dentro de uma chapa pela normal, como curva, e o painel que a segue sem coluna por linha.

7. O sólido de laços aberto no eixo deixa o relato de contatos inconclusivo. Com `aberta: 'inicio'`, o para-choque da frente saía "atravessa 14,8 mm pelo eixo z, sólido inconclusivo" contra o painel, que ele não toca. Tampado no eixo, sai "as caixas se sobrepõem e os sólidos não se tocam". O contorno foi tampar, e a tampa do eixo sai ao espelhar. A atribuição é da ferramenta, na medida do relato para sólido aberto.

8. O pé do capô e o da tampa ficam 1,1 mm abaixo do da cabine, com o vão de 4,00 mm certo. As duas chapas seguem a mesma função do topo, mas a subdivisão encolhe cada uma de um jeito junto da borda livre, e o degrau vai de 1,01 a 1,10 mm. O caminho seria a cota medida na borda, e as medidas em todas as colunas fizeram o capô ondular 23,7 mm no ciclo 2. O menor caso são duas chapas de subdivisão de mesma função, com bordas livres a 4 mm uma da outra. A atribuição é do núcleo. Resolveria medidas só na borda livre, com peso, sem ondular o miolo.

9. A vista de trás não sai de `vistas:superficie`, que gera frente, lado, topo e três quartos. Ela saiu chamando `luz-rasante.py` e `curvatura-da-lataria.py` com `--vista traseira` sobre a malha que a ferramenta exportou. A atribuição é da ferramenta, e resolveria a vista de trás na lista ou uma opção `--vistas`.

10. Os pés das colunas A e C da cabine têm desvio de 7,6 e 6,6 mm junto das feições, entre a ponta da janela e a fusão das colunas. Eles ficam fora da conta do critério, e nada aparece na luz rasante. Não reduzi a caso mínimo. A atribuição provável é da ferramenta, no ajuste junto da faixa de apoio onde as colunas da janela convergem.

11. A ondulação monta o esboço de novo a cada medida, 125 s no lado inteiro, enquanto as outras medidas leem o cache em 5 a 20 s. A atribuição é da ferramenta.

12. A fusão de colunas está documentada só para a última estação, e a ponta de trás pede o contrário: duas colunas com `de` a mesma coluna da estação anterior, uma divisão. Funcionou sem aviso. A atribuição é da instrução, e resolveria o guia dizer as duas.

## O que do ciclo 3 ficou resolvido e o que continua

Resolvidos, pelos números acima:
- O raio da quina oblíqua (atrito 1 do ciclo 3): `raio: 4` direto dá 3,9 mm.
- O cruzamento de quinas na gaiola por estações (atrito 2): os cantos do teto fecham sem falha.
- O cache que ignorava o ambiente (atrito 3).
- A moldura facetada (atrito 4).
- A ponta em que a lateral some (atrito 5): fecha por fusão e divisão, e o tampão fechou.
- O vão de borda livre e a ordem das colunas (atrito 7), não retestado, porque a ordem invertida ficou.

Continuam:
- A porta sem quadro (atrito 6).
- O desvio junto do pé da cabine (atrito 8), que mudou de lugar e de tamanho (atrito 10 daqui).
- O critério de degrau nos pares de moldura (atrito 9).
- As três faces finas do ciclo 2.

## O que falta para a alta definição

Para fechar o carro inteiro, em ordem de importância. O que está marcado como medido saiu de um dos quatro ciclos, e o resto é previsão.

Espelhar o outro lado impede o carro inteiro (previsão). Hoje cada chapa é a metade direita, aberta no eixo (o capô, o teto, a tampa, os painéis, a grade), ou um lado só (as portas, os para-lamas). A `gaiolaPorEstacoes` oferece `simetria: 'x'`, que espelha a gaiola antes de subdividir, e é o caminho para as chapas que cruzam o eixo. As linhas de vão de `paineisPorVaos` precisariam valer dos dois lados, com sementes `Esq`, e os para-choques perderiam a tampa do eixo. Nada disso foi provado aqui. A previsão é um ciclo inteiro, porque cada atrito de borda livre no eixo deste ciclo vira costura.

Juntar com o chassi impede o carro montado (previsão). O rascunho facetado tem o chassi, os membros aparados por dentro da casca e os contatos. A lataria de alta definição não é casca de booleanas, e o "interior da casca" que apara os membros não existe. A previsão é aparar os membros pela chapa de subdivisão com espessura, ou desenhá-los a partir das bordas tiradas por `curvaDaGaiola`.

A porta com quadro impede a porta de verdade (medido, ciclo 3).

A borda do painel com aba impede o painel de verdade (previsão). Nada vira a chapa para dentro nas bordas dos vãos.

O rebaixo de fundo fechado impede maçanetas, placa e frisos rebaixados (medido, atrito 1). O rebaixo com abertura sai pelos anéis, com custo.

O pé do capô e da tampa com a cabine e os lados dos painéis encarecem o acabamento (medido, atritos 6 e 8). Hoje saem com degrau de 1,1 mm e mínimos de 1,4 mm nos cantos de cima.

Os retrovisores encarecem (previsão). São sólidos próprios. Com a porta sem quadro, o pé vai na porta abaixo da cintura ou no canto da coluna A, e a técnica é a do para-choque, por laços com raio, com o cruzamento de quinas do atrito 2.

As maçanetas encarecem (previsão). A maçaneta é um rebaixo de fundo fechado na porta com uma peça dentro (atrito 1). Com o que existe, sai como peça sobre a chapa, sem rebaixo.

As rodas só incomodam (previsão). A família `roda-pneu` entra por `instanciaDeFamilia`, uma chamada por roda, e o lábio dos arcos já existe. Falta conferir a folga do pneu com o lábio e o detalhe do aro.

O tempo de montagem encarece o laço (medido). O lado inteiro leva 88 s para montar e 125 s para a ondulação, que não usa o cache. Com o carro inteiro, o dobro.

A recomendação é corrigir no núcleo o cruzamento de quinas na gaiola por laços, a linha até a coluna que termina e a prova na ponta da linha, que são pequenos. Também vale levar o lado inteiro à pessoa para o aceite de forma, com as imagens deste ciclo, antes do ciclo do espelho e do chassi.
