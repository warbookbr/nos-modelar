# Cordão de solda na costura de tubos: rodadas de forma e medidas

Esta pasta guarda a evidência do plano do cordão de solda (`docs/modelar/planos/2026-11-15-costura-em-no-de-tubos.md`). A sonda do `arredondarCostura` no nó de tubos está em [`SONDA.md`](SONDA.md) e o protótipo do cordão por polilinha em [`CORDAO.md`](CORDAO.md). As imagens daqui foram geradas pelo projeto; a foto de solda que a pessoa trouxe ficou fora do repositório.

## As rodadas de forma

Em 2026-11-15 o cordão passou a ser o `friso` com `costura` e o perfil `cordao`, desenhado a cada ponto no canto entre os dois tubos. A pessoa viu, nesta ordem, o arco de borda nítida no modelo da solda TIG, com escamas na malha (a954da5f, b3ea1fc9), o topo achatado (4a80977d), a altura pela abertura do canto (418d2f29), a borda deitada a 15° (1d009009) e o sombreado próprio a 12° (d4b26d45). O cordão redondo leu como mangueira e o arco alto como cobra; a borda tangente ao tubo deixou riscos no sombreado e lascas na união. Depois da foto da solda TIG de quadro a forma escolhida foi o chanfro, a face reta de pé a pé sem altura no meio (7719ff8b), e as escamas ficaram para o plano de material.

Em 2026-11-16 a pessoa aprovou a bicicleta inteira com o cordão em todas as juntas do quadro e do garfo, de lado, de frente e em perspectiva ao lado da foto ("a solda atual ficou muito boa"). Na fatia 7 ela aprovou as juntas sem os anéis da receita, com o refino da ferramenta e a normal lisa pesada pelo ângulo do canto ([`fatia7-juntas-antes-depois.png`](fatia7-juntas-antes-depois.png), em cima antes e embaixo depois, no tubo do selim, na caixa de direção e na coroa do garfo), e conferiu que a normal nova não muda as peças do acervo que têm sombreado liso ([`fatia7-acervo-normal-lisa.png`](fatia7-acervo-normal-lisa.png), antes à esquerda e depois à direita).

## As medidas no fim da fatia 7

Medidas no ramo `bicicleta` em 990e0f6b, em 2026-11-16; a base de comparação é e911b02d, o commit anterior.

Nos casos de dois tubos da fixture (`procedural/nucleo/fixtures/no-de-tubos.js`, cordão de 7 mm) e nos de ponto triplo (cordão de 5 mm), a malha fecha sem órfão, sem aresta sem par e sem vínculo não manifold. As faces que o cordão acrescenta, contando os cortes da união e à parte o refino da faixa, são 149 + 114 no T reto 17/8, 275 + 217 no oblíquo a 35° 17/8, 506 + 174 no oblíquo a 60° 17/16 (o par de 32 mm de diâmetro), 278 + 240 no T de raios iguais, 736 + 1935 em `tubo e dois estais` e 1537 + 3186 no `no de 4 tubos`. Fora da borda do chanfro, a dobra acima de 150° entre faces vizinhas aparece em 1 aresta no oblíquo a 60°, 2 no T de raios iguais e 2 em cada caso de ponto triplo; em todas uma das faces é uma lasca de 1 a 4 µm de largura e menos de 0,003 mm² com a normal virada, e a base tem as mesmas.

O retrato do acervo medido em e911b02d e comparado com 990e0f6b dá 120 peças iguais e a bicicleta mudada: faces de 49.553 para 56.300, faces finas de 594 para 1.505, volume 1,5e-5 relativo menor.

A varredura das juntas da bicicleta (`tmp/varredura/juntas.mjs`, só os sólidos e os passos das juntas) fecha as uniões em todos os valores da coroa do garfo de 395 a 405 mm e do topo dos estais de 40 a 49 mm. De 50 a 56 mm o `friso` recusa por curva fechada demais no ponto 10 ou 11 da costura do quadro, o limite de geometria; antes da fatia 7 essa recusa começava em 51 mm. Nenhum valor recusa por casca aberta ou precisão, contra 12 da linha de base de 2026-11-16.

Na malha que a bancada desenha, os triângulos que tocam o pé do cordão com lado maior acima de 40 mm e razão de aspecto acima de 8 passaram de 128 para 1.161 com a fatia 7, e os que, entre esses, têm as normais dos dois cantos do lado maior a mais de 8° uma da outra passaram de 1 para 54. Das 1.057 faces da malha que tocam a costura e passam de 40 mm de um canto a outro, 949 já são triângulos no núcleo: sem os anéis de 4 mm, a faceta do tubo vai da costura até o anel seguinte, a até 144 mm, e o refino divide só a faixa de duas larguras, de modo que o triângulo liga o pé do cordão ao canto do anel distante. A pessoa aprovou a imagem dessas juntas com esses triângulos; a medida está registrada para a revisão.
