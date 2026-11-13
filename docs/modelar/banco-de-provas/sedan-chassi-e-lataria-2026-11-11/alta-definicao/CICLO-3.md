# Sedã em alta definição, ciclo 3: o andar de cima sobre o de baixo

Este é o terceiro ciclo da fatia 4c do plano [`2026-11-10-nucleo-para-qualquer-mecanismo.md`](../../../decisoes/PLANOS-ENCERRADOS.md). Sobre o andar de baixo do [ciclo 2](CICLO-2.md), que não mudou, entra a cabine do mesmo lado do carro. Ela tem o peitoril, a lateral com as colunas A, B e C, o teto, o para-brisa e o vidro traseiro até o meio do carro, as três janelas laterais, cinco vidros e cinco molduras. Nenhuma forma daqui foi aprovada pela pessoa, e o crítico sem contexto não foi chamado.

O esboço é [`andar-de-cima.esboco.mjs`](../../../../../procedural/pecas/sedan-chassi-e-lataria/alta-definicao/andar-de-cima.esboco.mjs). Ele importa o do andar de baixo e acrescenta os passos da cabine, com o alvo dela no fim de `alvo.mjs`. O caráter vem da cabine do facetado: o perfil do para-brisa, do teto em y 1523 e do vidro traseiro, a lateral que fecha 143 mm em 623 de altura, a faixa das janelas de y 1075 a 1420 e as pontas das janelas.

## O desenho

A cabine é uma chapa própria de 1 mm, de `gaiolaPorEstacoes` ao longo de z, com 585 pontos. A cintura do andar de baixo é a fronteira: o peitoril de cima começa 4 mm para dentro da borda da faixa de baixo (x 816 contra 820), no mesmo plano dela, e esse é o vão entre as portas e o teto. As colunas da seção vão do meio do carro, pelo topo, até a quina da cabine; descem a lateral pelo topo e pelo pé das janelas; e chegam ao pé da lateral e ao peitoril. O topo das janelas corre 103 mm abaixo da quina, e por isso desce junto onde a quina desce com o para-brisa ou com o vidro traseiro. Assim a coluna A e a coluna C saem inclinadas, e a vigia sai com a borda de trás paralela ao vidro traseiro, como no facetado, sem borda escrita à mão.

As quinas têm raio no vinco. O pé da lateral tem 3 mm. A quina da cabine (a coluna A, a calha do teto e a coluna C) tem 4 mm, com o pedido compensado nas colunas A e C (atrito 1). As duas quinas do teto com o para-brisa e com o vidro traseiro, ao longo de uma estação, têm 15 mm. As três janelas laterais são vãos da gaiola. O para-brisa e o vidro traseiro, que chegam ao meio do carro, são vãos de borda livre: as colunas do meio terminam numa estação e recomeçam em outra.

A moldura é um `friso` de 14 por 3,9 mm sobre `bordaDoVao`, que desce 0,9 mm na chapa. Cada vidro é uma chapa própria de 4 mm, com a face de fora a 0,8 mm para dentro da pele e passando 12 mm da borda do vão por trás da chapa. A moldura assenta na chapa e no vidro, e o vidro, na chapa. Os três contatos são declarados como `atravessa`, de 0,9, 0,1 e 0,2 mm.

## Os números

A coluna da cabine é o andar de cima. A do andar de baixo é a mesma peça do ciclo 2, medida agora dentro do esboço dos dois andares, com as ferramentas corrigidas desde então.

| Medida | Andar de baixo (ciclo 2, no esboço dos dois andares) | Andar de cima (ciclo 3) |
|---|---|---|
| Linhas de código | 160 (alvo 110) | 179 (alvo, mais 43) |
| Pontos da gaiola | 1.377 | 585, mais 152 dos cinco vidros |
| Faces | 46.227 | 18.844 |
| Montagem | 67 s os dois andares juntos (`esboco:nucleo`), dos quais o corte dos painéis de baixo é a maior parte | 3 s só a cabine com vidros e molduras |
| `npm run ondulacao`, falhas fora das feições | 0 | 0 na chapa e nos cinco vidros |
| `npm run ondulacao`, desvio p95 e máximo | 0,12 e 0,29 mm | 0,48 e 1,18 mm |
| `npm run ondulacao`, junto das feições | 12, até 1,35 mm | 22, até 33,5 mm (atrito 8) |
| `npm run -s malha:lascas` | 3, as do ciclo 2 | 0 |
| Raio da cintura, pedido 6 mm | 5,8 mm, 79 de 79 cortes dentro de 20% | |
| Raio do ombro, pedido por estação | dentro de 20% onde o pedido vai até 10 mm; 8 cortes fora onde a quina morre | |
| Raio do pé da cabine, pedido 3 mm | | 2,7 a 2,9 mm, 39 de 39 cortes |
| Raio da quina da cabine, projeto 4 mm | | coluna A 3,67 a 3,99 mm (12 de 12); calha 3,03 a 3,87 (25 de 26); coluna C 1,94 a 3,99 (8 de 10) |
| Raio das quinas do teto, pedido 15 mm | | 14,5 a 14,7 mm, 12 de 12 em cada uma |
| Vão nos pares de chapa (`vao:partes --partes=` só as chapas) | 4,04 a 4,16 mm, degrau até 0,05 mm, nos 8 pares | 4,00 mm, degrau 0,00, nos 4 pares da cintura (teto com para-lama, portas e lateral traseira) |
| Moldura e vidro | | cinco molduras assentadas na chapa e no vidro, contatos declarados; nenhum vidro solto (`--soltas=recusar`) |
| Medidas com cache / sem cache | de 1 a 3 s por comando / de 55 a 90 s por comando | |

A quina da cabine contra os 4 mm de projeto saiu do `--json` de `raio:aresta`, separado por trecho. O comando, sem a separação, dá 22 de 50 cortes fora, porque compara com o raio compensado que o passo guarda (atrito 1). Os três cortes fora estão junto dos dois cantos do teto, onde o apoio não coube: o passo grava 1,45 mm na estação da quina do teto com o vidro traseiro.

Os 12 pares que `vao:partes` reprova sem `--partes` são todos de moldura com vidro ou com chapa. O degrau de 3 e 3,8 mm é a altura da moldura, por desenho, e o critério de 0,3 mm é dos pares de chapa. Restrito às chapas, o comando sai sem nenhum par fora. As quatro partes soltas que ele lista são o capô, a soleira e as duas portas, que só têm vão com as vizinhas, porque o chassi não está no esboço. Os vidros tocam a chapa e não aparecem na lista.

### Tempo gasto em cada passo

Leitura do vão de borda livre, do terceiro número da coluna e do desenho da cabine no facetado: 12 minutos. O alvo da cabine e o esboço: 15. A primeira montagem, a ordem das colunas e a quina transversal: 5. A primeira vista: 3. As medidas, com a armadilha do cache: 12. A quina oblíqua: 6. As medidas finais: 8. As imagens: 12. O documento: 15. Somando, cerca de 90 minutos.

## As imagens

As imagens estão em [`ciclo-3/`](ciclo-3/):

- [`tres-quartos-frente-e-tras.png`](ciclo-3/tres-quartos-frente-e-tras.png): o andar de cima sobre o de baixo, de frente e de trás, ao lado do mesmo trecho do facetado. O facetado mostra o teto inteiro, os dois lados; o ciclo 3 é a metade direita.
- [`luz-rasante.png`](ciclo-3/luz-rasante.png): a luz rasante de lado e de três quartos.
- [`curvatura.png`](ciclo-3/curvatura.png): a curvatura de três quartos e de lado.
- [`luz-rasante-e-curvatura-de-cima.png`](ciclo-3/luz-rasante-e-curvatura-de-cima.png): o teto visto de cima.
- [`recorte-janela-moldura-e-vidro.png`](ciclo-3/recorte-janela-moldura-e-vidro.png): o canto de baixo da janela traseira da porta, e o corte em z -400 pelo pé dela, com a chapa, a moldura e o vidro em cores.
- [`recorte-juncao-porta-teto.png`](ciclo-3/recorte-juncao-porta-teto.png): a linha da porta encontrando o vão da cintura, e o corte em z -400 pela faixa de baixo, pelo vão e pelo peitoril de cima.

O que vi nelas. A cabine tem o caráter do facetado, com teto plano, para-brisa inclinado e pouco curvo, colunas finas, cantos das janelas arredondados e molduras escuras contínuas. A luz rasante corre lisa pela lateral, pelo teto e pelo para-brisa. Na de cima aparece um ponto escuro em cada canto do teto, onde a quina transversal termina antes da quina da cabine (atrito 2). A curvatura satura em ±1,8 1/m, com a faixa ocre nas seis quinas, e não mostra amassado nos painéis da cabine. Nos cortes, a moldura cobre 7 mm de chapa e 7 de vidro e assenta nos dois, e o peitoril de cima fica no plano da faixa de baixo, a 4 mm dela. No canto da janela a moldura sai em três segmentos retos (atrito 4). Entre o capô e o pé do para-brisa fica um vão aberto de uns 40 mm (atrito 5), e a porta não tem quadro (atrito 6).

## Atritos

1. O raio de uma quina que corta as estações na diagonal sai menor que o pedido. Com `raio: 4` na coluna `quina`, `raio:aresta` mediu 3,87 mm na calha do teto, que corre ao longo de z, 2,79 na coluna A e 1,99 na coluna C, cujas quinas sobem a 48 e a 65 graus da horizontal e cortam as estações de z constante na diagonal. O ajudante lê a dobra e põe os apoios no plano da estação. Numa aresta oblíqua, a distância perpendicular dos apoios encolhe, tanto mais quanto mais em pé a aresta. O contorno foi pedir em cada estação o raio dividido pela razão medida (5,7 mm na coluna A e 8 na coluna C), o que deu 3,99 e 3,98 mm. Com isso o passo guarda o raio compensado, e `raio:aresta` compara com ele e reprova 22 de 50 cortes que estão a menos de 3% dos 4 mm de projeto. O menor caso é uma chapa em L cuja quina corta as estações a 50 graus, com `raio: 4`. A atribuição é do núcleo. Resolveria o ajudante tomar a dobra e a distância dos apoios no plano perpendicular à aresta, ou guardar no passo o raio de projeto separado do pedido ao ajudante.

2. Duas quinas com raio que se cruzam não se declaram. A quina do teto com o para-brisa corre ao longo de uma estação e encontra a coluna `quina`, que já tem apoios. O passo recusa com "o vinco 'topoDoParaBrisa' liga 'cab_topoDoParaBrisa_faixaDoTeto' a 'cab_topoDoParaBrisa_quina', que não formam aresta da gaiola". O vinco da estação liga os pontos declarados, e os apoios da coluna ficaram entre eles. O contorno foi terminar as duas quinas transversais 35 mm antes da quina da cabine. Ficou um canto de teto em que a quina some, com desvio de 4,85 e 2,14 mm junto das feições, um ponto escuro na luz rasante de cima e um ponto em que o raio não cabe (1,45 mm). O menor caso é a caixa com uma quina por coluna e outra por estação, as duas com raio, que se cruzam. A atribuição é do núcleo. No carro inteiro todo canto de teto, de capô, de porta-malas e de para-choque é um cruzamento assim. Resolveria o vinco de estação seguir pela cadeia dos apoios, e o canto de três quinas com o arredondamento dos três raios.

3. O cache das medidas não vê as variáveis de ambiente que o esboço lê. Exportei a cabine sozinha com `HD_CABINE=so`, e depois `npm run ondulacao` sobre o esboço sem a variável leu do cache a montagem da cabine sozinha ("montagem lida do cache"), porque a assinatura é a do conteúdo do arquivo. O menor caso é um esboço que lê `process.env.X` montado com dois valores de X. A atribuição é da ferramenta. Resolveria a assinatura pela montagem em si (os passos e o topo que o esboço exporta), e não pelo arquivo. Todas as medidas da tabela foram feitas com `--sem-cache`.

4. A moldura sobre `bordaDoVao` sai facetada nos cantos. A borda do vão na superfície é arredondada pela subdivisão, mas a linha do `friso` são os pontos da gaiola, e no canto da janela a moldura é um polígono de três segmentos retos. O menor caso é um vão retangular de cantos livres numa chapa de faces de 50 mm, com o friso sobre a borda dele. A atribuição é do núcleo. Resolveria `bordaDoVao` devolver a borda refinada, como `curvaDaGaiola` devolve a curva, ou o friso aceitar a curva.

5. A gaiola por estações não fecha a ponta em que a lateral some. No pé do para-brisa e no do vidro traseiro, a altura da lateral da cabine vai a zero, e a coluna A e a coluna C morrem sobre o peitoril. Com estações de z constante, as colunas da lateral ficariam todas no mesmo ponto, com faces degeneradas. O contorno foi acabar a cabine onde a lateral tem 40 mm de altura (z 703 na frente e -1.295 atrás). Isso deixa entre o capô e o pé do para-brisa um vão aberto de cerca de 40 mm, que no carro real é a grade do tampão, e atrás um vão igual até onde viria a tampa do porta-malas. O menor caso é uma chapa em que uma quina desce até encontrar outra, como a coluna A no peitoril. A atribuição é do núcleo e da instrução. Resolveria a fusão de colunas com vinco declarada no ajudante, ou um retalho triangular costurado à grade.

6. A porta não tem quadro, porque a linha de vão não passa de uma chapa para a outra. `paineisPorVaos` corta uma chapa só. A porta do andar de baixo acaba na cintura, e o quadro da janela fica no teto. A porta do sedã real leva o quadro, e a linha de vão sobe pela coluna A, corre sob a calha e desce pela coluna B, atravessando a fronteira entre as duas gaiolas. O contorno foi aceitar a porta sem quadro, como no pedido do ciclo. A atribuição é do núcleo e da decisão de forma. Resolveria o ajudante de painéis aceitar mais de uma chapa, com a linha que passa de uma à outra pela borda comum, ou o andar de baixo e o de cima numa gaiola só.

7. O vão de borda livre só aceita que falte a primeira coluna da lista. Com as colunas em ordem do peitoril ao meio do carro, o vão do para-brisa recusa com "o vão 'vidroTraseiro' cita a coluna 'centro', que a estação 'vigiaTras' não tem". O contorno foi inverter a ordem das colunas e virar as faces. A atribuição é do núcleo (o ajudante), e a regra não está na ficha.

8. A ondulação acusa 33,5 mm junto do pé da cabine. São dois pontos sobre a linha do pé, em (803, 1004, 695) e em (804, 1002, -92), marcados como junto das feições e fora da conta do critério. O pé é uma quina de 75 graus com raio de 3 mm entre um peitoril de 12 mm e a lateral, e o ajuste local passa por cima da dobra. Nada aparece na luz rasante nem na curvatura. Não reduzi a caso mínimo. A atribuição provável é da ferramenta, no ajuste junto da faixa de apoio quando a face vizinha é mais estreita que três espaçamentos.

9. O critério de degrau de `vao:partes` vale para todos os pares, os de moldura e de vidro incluídos. Sem `--partes`, 12 pares saem fora por degrau de 3 e 3,8 mm, que é a moldura por desenho. A atribuição é da ferramenta. Resolveria o degrau só nos pares de `folga`, ou o degrau por par lido do contato declarado.

## O que do ciclo 2 ficou resolvido e o que continua

Resolvidos, pelos números acima:
- O vão nos dois pares que a medida reprovava com a malha limpa (atrito 2 do ciclo 2): degrau de 0,05 e 0,03 mm.
- A janela e o raio por ponto em `raio:aresta` (atrito 3).
- A curvatura que saturava (atrito 8): agora ±1,8 1/m, com a faixa dos vincos.
- O custo de cada medida (atrito 10): de 1 a 3 s com o cache, com a ressalva do atrito 3 daqui.

Continuam:
- As três faces finas na parede do corte do fim da porta traseira (atrito 9).
- A ondulação do andar de baixo lida antes do corte (atrito 11).
- O raio de uma quina de dobra variável, que pede duas montagens (atrito 4).
- A gradação depois dos apoios (atrito 5).
- Os anéis, que não servem ao arco (atrito 6).
- As medidas em todas as colunas, que fazem o capô ondular (atrito 7), não retestadas.

## O que falta para a alta definição

Em ordem de importância, pensando já no carro inteiro. O que está marcado como medido saiu de um dos três ciclos, e o resto é previsão.

A porta com quadro e a linha de vão que atravessa duas chapas impedem a porta de verdade (medido, atrito 6). Hoje a porta é só o andar de baixo. Para o quadro, ou o ajudante de painéis corta duas chapas costuradas, ou o carro sai de uma gaiola só, do peitoril de baixo ao teto. Neste ciclo isso não foi tentado, por causa da ponta que a grade não fecha (atrito 5).

O cruzamento de quinas com raio impede os cantos do carro (medido, atrito 2). Os cantos do teto ficaram com a quina sumindo, e todo canto do capô, da tampa do porta-malas e dos para-choques é o mesmo encontro de duas ou três quinas.

A ponta em que uma quina morre sobre outra encarece a frente e a traseira da cabine (medido, atrito 5). O tampão do para-brisa e o da tampa do porta-malas ficaram como vãos abertos. Prevejo que a grade do tampão saia como peça própria, por varredura sobre a curva do pé do para-brisa, como a moldura; a ponta da coluna A fica sem fechar até o núcleo fechar a fusão de colunas.

O raio em quina oblíqua encarece toda quina que corre inclinada (medido, atrito 1): as colunas, a quina do capô com a frente e a da tampa com a traseira. Hoje cada uma pede uma calibragem medida.

A borda do painel com aba impede o painel de verdade (previsão, já no ciclo 2). Nada vira a chapa para dentro nas bordas do capô, das portas e da tampa, e a aba do `friso` só nasce de uma linha da gaiola, não da borda do corte.

O rebaixo de farol, de grade, de lanterna e de maçaneta impede a frente, a traseira e as portas (previsão; o plano registra que o rebaixo não existe). O que este ciclo mostra é que a outra metade do problema já tem técnica. A lente do farol e da lanterna é uma chapa própria atrás da pele, como o vidro, com a moldura como `friso` sobre a borda de um vão da gaiola (medido para os vidros). O que falta é a chapa afundar em volta com raio.

O capô com a tomada de ar encarece (previsão). A tomada é um volume sobre o capô com quinas próprias. Prevejo uma gaiola própria, assentada no capô com contato declarado. O encontro com raio entre ela e o capô cai no cruzamento de quinas, e sem ele o encontro sai vivo.

A grade da frente encarece (previsão). Ela é um vão no painel dianteiro, que este trecho não tem, com uma peça dentro. O vão vem da gaiola, como as janelas daqui, e a grade como peça própria apoiada no vão, como o vidro.

Os para-choques encarecem (previsão). São sólidos fechados, por laços ou varredura, com quinas que se cruzam nas pontas. O apoio no chassi é contato declarado, e o vão com a lataria se mede como aqui, por `vao:partes`.

A moldura facetada nos cantos só incomoda (medido, atrito 4). Ela aparece de perto, nos cantos de janela, de farol e de lanterna.

As maçanetas e os retrovisores encarecem (previsão). A maçaneta cai no rebaixo, e o retrovisor é um sólido próprio com o pé na porta, que agora não tem quadro.

As rodas só incomodam (previsão). A família `roda-pneu` já entra por `instanciaDeFamilia`.

Com os dois andares de um lado, o trecho cumpre os critérios medidos da fatia pelos comandos, com três ressalvas. A quina da cabine só se confirma pela separação por trecho (atrito 1). Restam as três faces finas do ciclo 2. E o degrau pede `--partes`. A recomendação é corrigir no núcleo o raio em quina oblíqua e o cruzamento de quinas antes do ciclo da frente e da traseira, que depende dos dois. Também vale levar os dois andares à pessoa agora, com as imagens, para o aceite de forma, incluindo a decisão sobre a porta sem quadro.
