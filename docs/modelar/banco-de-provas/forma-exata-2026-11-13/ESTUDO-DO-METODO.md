# Estudo do método: a forma exata antes da malha, medida em três casos

Estudo da fatia 3 do plano [forma exata antes da malha](../../planos/2026-11-13-forma-exata-antes-da-malha.md), feito em 2026-11-13. O protótipo está em `procedural/nucleo/forma-exata/` e não muda nenhuma operação nem nenhuma peça do acervo.

## Resumo para decidir

1. Hoje o núcleo transforma a peça em triângulos logo no começo e depois chanfra, arredonda e fura mexendo nos triângulos. O protótipo guarda a peça como faces e contornos de medida exata (retas, arcos, planos, cilindros), faz o chanfro, o arredondamento e o furo nessa descrição, e só gera os triângulos no fim.
2. Na chapa de contorno curvo com gume, do tipo da lâmina, o método novo entregou a peça inteira em três operações, fechada, sem nenhum triângulo fino. A lâmina do acervo tem 47 triângulos finos, e o núcleo de hoje não tem operação que faça esse chanfro numa extrusão.
3. No furo passante com a boca arredondada, o método de hoje já sai limpo desde a correção de novembro. O protótipo empata na qualidade, faz cada furo com a boca numa operação só (hoje são dez passos para nove furos) e faz também a boca chanfrada, que hoje é recusada.
4. Na peça de prova da agulha, com o tubo rente às duas faces do outro, o método novo não cobre. Ele cobre um caso mais simples, um tubo que encontra outro no meio, e ali a menor face ficou com 4 mm², contra 0,004 mm² do método de hoje.
5. O que se ganha: nas peças de chapa, de bloco e de torno, as faces sem área, as agulhas e as faces finas deixam de nascer, porque cada face é triangulada a partir do contorno exato dela e divide os vértices com a vizinha.
6. O que não se ganha: o encontro de dois corpos curvos em geral, a união e a subtração de sólidos quaisquer e toda a superfície livre (lataria, gaiola, subdivisão) continuam no método de hoje.
7. O preço em malha: de 35% a 90% mais faces na chapa e no disco, e de duas a quatro vezes mais no encontro de tubos.
8. O preço em trabalho: cerca de 11 dias de agente para a primeira entrega útil, que é a chapa com bordas e furos como operação do núcleo, e mais 4 dias para as peças de torno. Os números estão na tabela de custo.
9. Recomendo seguir com a fatia 4 só para a chapa, o furo e o torno, nessa ordem, cada operação ao lado da antiga. Recomendo não levar a união geral nem o arredondamento de costura geral para o método novo.
10. Depende da sua decisão: aprovar essa ordem e esse limite. Antes de começar, convém você ver uma imagem da chapa e do disco na bancada, porque este estudo só mediu a malha.

## O método em palavras

A peça é um prisma: um contorno fechado, desenhado com retas e arcos, que sobe reto até uma altura. O contorno fica guardado como a lista dos trechos, cada um com as pontas e, no arco, o centro e o raio. O arquivo `curva2d.js` do núcleo lê esse mesmo vocabulário de trechos, mas devolve só os pontos já calculados, e o centro e o raio se perdem ali; o protótipo lê os trechos de novo em `contorno-exato.js` e confere, em teste, que os pontos de `curva2d.js` caem sobre os segmentos dele.

Cada aresta de cima e de baixo do prisma guarda a borda dela: viva, chanfrada ou arredondada. As operações `chanfrarAresta`, `arredondarAresta` e `furoPassante` só trocam essa anotação e acrescentam o laço do furo. As faces que resultam são superfícies de nome conhecido: o chanfro de um trecho reto é um plano e o de um arco é um cone; o arredondamento de um reto é um cilindro e o de um arco é um toro; a parede de um arco é um cilindro. A função `facesExatas` lista essas faces sem gerar malha.

O que torna o método possível é uma propriedade do contorno de retas e arcos: recuado para dentro, ele continua sendo de retas e arcos, porque a reta recuada é uma reta paralela e o arco recuado é um arco de mesmo centro. Uma borda é, então, uma regra que diz quanto o contorno recua em cada altura. Em cada altura de quebra da borda o protótipo recua cada trecho pela distância dele e refaz os cantos pela interseção exata dos dois vizinhos. Onde um chanfro largo encontra um chanfro estreito num canto vivo, a aresta de encontro das duas faces sai dessa interseção, sem que alguém a escreva.

A malha é gerada no fim, em `malhaDaForma`. Cada nível é amostrado com o mesmo número de divisões por trecho, e dois níveis vizinhos são ligados por faixas de quatro cantos. O topo e o fundo são triangulados por `triangular-regiao.js`, uma triangulação de Delaunay com as arestas do contorno preservadas e pontos novos só por dentro da face, postos no centro do círculo de cada triângulo ruim até nenhum passar do limite. Toda face usa os vértices do nível que divide com a vizinha. Por construção não há vértice de uma face no meio da aresta de outra, que é de onde vêm a agulha e a face sem área do método de hoje.

O protótipo tem 1.006 linhas em cinco arquivos e 33 testes. As recusas dizem a operação, o trecho e a medida: a borda mais larga que o trecho vizinho, a borda que muda numa junção tangente, o furo cuja boca alcança a borda de fora.

## Como os casos foram medidos

Os três casos estão em `procedural/nucleo/forma-exata/casos-medidos.test.mjs`, que roda o método atual pelas receitas e o protótipo pelas funções dele, mede os dois com as mesmas funções e fixa os números. O comando `MEDIR=1 npx vitest run procedural/nucleo/forma-exata/casos-medidos.test.mjs` imprime a tabela inteira.

As réguas são as de `tools/modelar/reguas-de-malha/`: a de face degenerada e a de triângulo fino. A coluna "abaixo de 1e-9 m²" conta as faces de menos de um milésimo de milímetro quadrado, que é a medida da peça de prova da agulha. O volume é o da malha. "Fechada" quer dizer que toda aresta é de exatamente duas faces, uma em cada sentido. O tempo é o de gerar a peça, numa execução.

## Caso A: a chapa de contorno curvo com gume e quinas quebradas

A chapa tem 290 por 78 por 5 mm, com o contorno em dois retos, um degrau, três arcos na borda de baixo e um arco e dois retos na de cima. A borda de baixo leva um chanfro de 16 mm de largura por 2,5 mm de altura nas duas faces, que se encontram num fio no meio da espessura. As outras bordas, menos a base, levam quina quebrada de 0,8 mm.

O método atual aparece em duas linhas porque não há operação equivalente. A primeira é a lâmina do acervo (`procedural/pecas/kukri/receita.js`), que tem o mesmo tamanho e o mesmo tipo de borda e foi feita com cinco laços empilhados numa gaiola; ela afina para a ponta, então o volume dela não se compara com o da chapa. A segunda é a `extrusao` do mesmo contorno, sem borda nenhuma: a tampa da extrusão sai em 22 faces, e `arredondarAresta` e `filete` recusam a aresta dela com "de precisa resolver para EXATAMENTE uma face".

| Método | Faces | Degeneradas | Triângulos finos | Pior razão | Menor face (mm²) | Volume (mm³) | Fechada | Tempo |
|---|---|---|---|---|---|---|---|---|
| Atual, lâmina do acervo (gaiola de 5 laços) | 628 | 0 | 47 | 866 | 1,26 | 52.051,0 | sim | 1,4 s |
| Atual, extrusão do contorno, sem borda | 110 | 0 | 38 | 27.537 | 13,2 | 63.930,0 | sim | 17 ms |
| Protótipo, prisma exato com os dois chanfros | 1.190 | 0 | 0 | 0 | 2,84 | 53.163,3 | sim | 27 ms |

A forma do protótipo tem 21 faces exatas, e o volume exato dela, calculado sem malha, é 53.149,7 mm³. A malha fica 0,026% acima, que é o efeito das cordas nos arcos com desvio de 0,02 mm. O protótipo tem 90% mais faces que a lâmina do acervo: as duas faces largas levam pontos por dentro, e é isso que tira os triângulos finos.

Duas ressalvas. A triangulação deixou 32 triângulos que só melhorariam dividindo o contorno, e nenhum deles chega ao limite da régua. E a ordem das operações importa neste protótipo: quebrar as quinas antes de abrir o gume passa por um estado em que o degrau de 3 mm some, e a operação recusa.

## Caso B: um tubo que encontra outro, com arredondamento na costura

A peça de prova `agulha-na-faceta-do-tubo` são três cilindros de 190 mm de diâmetro, com o tubo rente às duas faces do pé e o arredondamento de 10 mm afinando até sumir junto delas. O método novo não cobre essa peça. A costura de dois cilindros não é reta nem arco, e ali o arredondamento encontra a tampa e o chanfro da ponta do outro tubo. O protótipo recusa a configuração com a medida.

O que o método cobre em parte é o encontro de dois tubos em ângulo reto no meio do tronco, com raio constante. Nesse caso a curva do centro da esfera que rola na costura tem fórmula fechada, e `juncao-de-tubos.js` constrói a peça a partir dela: o arredondamento, a parede do ramo e o buraco do tronco dividem as mesmas estações, e a janela do tronco em volta do ramo é triangulada no cilindro desenrolado. Isso é uma construção direta para um par de formas; a operação geral de costura continua faltando. Medi dois T, um com o ramo de 60 mm de raio num tronco de 95 e outro com os dois raios de 95, em que o arredondamento some nos dois pontos em que as paredes ficam tangentes.

| Peça e método | Faces | Degeneradas | Abaixo de 1e-9 m² | Triângulos finos | Menor face (mm²) | Volume (mm³) | Fechada | Tempo |
|---|---|---|---|---|---|---|---|---|
| Peça de prova da agulha, atual | 6.540 | 0 | 40 | 1.440 | 0,0000105 | 18.758.289,0 | sim | 3,9 s |
| Peça de prova da agulha, protótipo | recusa | | | | | | | |
| T 95/60, atual (`unir` e `arredondarCostura`) | 4.326 | 0 | 0 | 1.352 | 0,00415 | 13.151.039,8 | sim | 1,0 s |
| T 95/60, protótipo | 8.828 | 0 | 0 | 0 | 4,32 | 13.150.580,0 | sim | 38 ms |
| T 95/95, atual (`unir` e `arredondarCostura`) | 2.874 | 0 | 9 | 559 | 0,000723 | 16.143.330,4 | sim | 0,7 s |
| T 95/95, protótipo | 11.672 | 0 | 0 | 0 | 0,475 | 16.143.924,3 | sim | 69 ms |

Os volumes dos dois métodos diferem em 0,004% nos dois T. A contagem de triângulos finos do método atual inclui as tampas dos tubos, que o `lathe` fecha em leque: medida à parte, a mesma união do T 95/60 sem o arredondamento já conta 466. O resto está nas facetas cortadas pela costura. O protótipo sai com o dobro e o quádruplo das faces, porque a grade do tronco é fina em toda a volta na faixa do ramo.

O resultado deste caso é parcial e precisa ser lido assim: onde o protótipo alcança, a menor face sai de 650 a 1.000 vezes maior; a peça que motivou o estudo fica fora do alcance dele.

## Caso C: o furo passante em face plana, com a boca tratada

O disco é o da peça de prova `furo-em-face-plana`: 154 mm de diâmetro, 43 mm de espessura, 144 lados, um furo central de 30 mm e oito de 6 mm, com 18 lados cada. A peça de prova tem furos cegos; aqui eles são passantes, e a boca da frente é arredondada com raio de 1 mm em três painéis, ou chanfrada de 1 mm.

| Método | Faces | Degeneradas | Triângulos finos | Menor face (mm²) | Volume (mm³) | Fechada | Tempo |
|---|---|---|---|---|---|---|---|
| Atual, peça de prova (furos cegos) | 1.032 | 0 | 52 | 4,48 | 795.200,2 | sim | 0,5 s |
| Atual, nove passantes, boca viva | 1.738 | 0 | 0 | 4,48 | 761.374,0 | sim | 0,8 s |
| Atual, nove passantes, boca de raio 1 (nove passos a mais) | 2.224 | 0 | 0 | 0,552 | 761.309,6 | sim | 1,0 s |
| Atual, boca chanfrada | recusa | | | | | | |
| Protótipo, nove passantes, boca viva | 2.582 | 0 | 0 | 0,725 | 761.374,0 | sim | 27 ms |
| Protótipo, nove passantes, boca de raio 1 | 3.006 | 0 | 0 | 0,551 | 761.310,6 | sim | 18 ms |
| Protótipo, nove passantes, boca chanfrada de 1 | 2.682 | 0 | 0 | 0,725 | 761.244,8 | sim | 15 ms |

Neste caso o método atual já está limpo: a fatia 4 do plano das [costuras e furos limpos](../../planos/2026-11-09-costuras-e-furos-limpos.md) refez a face furada em anéis, e os 52 triângulos finos que sobram na peça de prova estão na tampa de trás, que o furo não toca. Com a boca viva os dois métodos dão o mesmo volume até o décimo algarismo. O protótipo não melhora a qualidade aqui e gasta de 35% a 49% mais faces. O ganho é de vocabulário: a boca arredondada entra na mesma operação do furo, e a boca chanfrada, que o `filete` recusa ("o raio não cabe: a face ficaria côncava"), sai.

O volume exato do disco com as nove bocas arredondadas é 760.763,0 mm³. A malha fica 0,07% acima porque os furos de 18 lados são polígonos inscritos no círculo.

## O que o método cobre e o que não cobre

Cobre a peça que é um prisma reto sobre um contorno de retas e arcos, com chanfro ou arredondamento nas arestas de cima e de baixo, trecho a trecho, e furos redondos passantes com a boca tratada. Pela mesma propriedade do recuo, cobriria a peça de revolução de perfil em retas e arcos, que este protótipo não escreveu. Cobre, por construção direta, o encontro de dois cilindros de eixos que se cruzam em ângulo reto.

Não cobre a superfície livre. A lataria, a gaiola e tudo o que passa pela subdivisão não têm contorno de reta e arco nem superfície de nome conhecido, e o método não tem o que dizer sobre elas. O plano já as exclui.

Não cobre a costura entre dois corpos curvos em geral. A curva de encontro de dois cilindros só tem fórmula simples em posições particulares, e o arredondamento dela precisa de regra própria onde encontra uma tampa, um chanfro ou um terceiro corpo. A peça de prova da agulha está exatamente nesse ponto.

Não cobre a booleana geral. Unir, subtrair ou intersectar duas formas exatas quaisquer é o trabalho de um motor de sólidos, que o plano deixa de fora. O que cabe são pares específicos: dois prismas de mesmo eixo, que se resolvem no contorno, e os cilindros do caso B.

Dentro do que cobre, o protótipo ainda deixa de fora: a spline e a concordância do contorno; o furo cego, o inclinado e o que não é redondo; a aresta vertical de um canto do contorno; a borda mais larga que o trecho vizinho, que pede refazer o contorno e hoje é recusada; o encontro da boca de um furo com a borda de fora. Os testes de orientação e de círculo da triangulação usam margem de arredondamento em ponto flutuante, sem aritmética exata, e isso precisa de revisão antes de virar operação. O protótipo não está no registro de operações, e nenhuma receita o chama.

## Quanto custa levar cada operação

Um dia de agente é uma sessão de trabalho com os testes, a ficha da operação e a passagem pelo revisor adversarial. A referência de escala é o próprio protótipo, que levou menos de um dia sem nada disso, e o plano das costuras, em que uma correção de operação levou mais de um dia. As três primeiras linhas são a base comum, paga uma vez.

| O que levar | O que muda | Dias de agente | Risco |
|---|---|---|---|
| Base: a forma exata como operação do registro | schema, endereços de face (topo, fundo, parede e borda por trecho, furo), partes, material, catálogo e ficha | 3 | médio: o endereço de face é contrato salvo nas receitas |
| Base: a triangulação da região | testes de orientação robustos, divisão do contorno quando o triângulo ruim não se conserta por dentro, revisão adversarial | 2 | médio |
| Base: `curva2d.js` entregar os trechos resolvidos, a concordância e a spline aproximada por arcos | o contorno exato passa a ter uma fonte só | 1 | baixo |
| `extrusao` | o perfil com furos sai da forma exata, com as tampas sem triângulo fino; `deslocar` vira recuo exato | 1,5 | baixo |
| `filete` e `arredondarAresta` nas arestas de um prisma, com a cadeia | viram a borda declarada por trecho, inclusive o chanfro largo de um lado só | 1,5 | baixo |
| `furo` passante redondo e rasgo em face plana | viram laço do contorno, com a boca na mesma operação | 1,5 | baixo |
| `furo` cego em face plana | o laço passa a valer só até uma altura, com fundo | 1,5 | médio |
| `lathe` | a revolução de perfil em retas e arcos, com tampas trianguladas e chanfro no perfil | 2 | baixo |
| `cilindro`, `cone`, `cubo`, `chamferBox` | casos da `extrusao` e do `lathe` exatos | 1 | baixo, e ganho pequeno: já saem limpos |
| Borda mais larga que o trecho vizinho | refazer a topologia do contorno recuado | 3 | alto |
| `furo` na lateral de um cilindro | a costura de dois cilindros, como no caso B | 3 | médio |
| `unir`, `subtrair`, `intersectar` de dois prismas de mesmo eixo | booleana de contornos com arcos | 3 | médio |
| `arredondarCostura` de dois cilindros que se cruzam em ângulo reto | o caso B como operação, com endereços | 3 | médio |
| `arredondarCostura` onde o raio encontra tampa, chanfro ou terceiro corpo | a peça de prova da agulha | 10 ou mais | alto, sem garantia de fechar |
| `unir`, `subtrair`, `intersectar` gerais | motor de sólidos | 20 ou mais | alto; o plano exclui |
| `loft`, `inflate`, `extruda`, `aberturaPorContorno`, `aparar`, `limparLascas` | nada: são de superfície geral ou de malha por natureza | 0 | ficam como estão |

## Recomendação de ordem

Primeiro a base e a chapa: as três linhas de base, a `extrusao`, o `filete` com o `arredondarAresta` e o `furo` passante, 10,5 dias. É o que a lâmina pediu e o núcleo não tinha, e é onde o caso A mostrou ganho medido. A operação nova entra ao lado da `extrusao` de hoje, e o acervo não muda.

Depois o `lathe` e o furo cego, 3,5 dias, que levam o mesmo ganho às peças de torno e ao flange da peça de prova. As primitivas vêm de carona, sem pressa.

A borda mais larga que o trecho vizinho só quando uma peça real pedir, porque é o item de maior risco entre os que cabem.

O `arredondarCostura` e a booleana ficam no método de hoje. O caso B mostra que a construção direta de um par de cilindros dá malha boa, e eu só a levaria a operação se o braço ou outra peça repetir esse encontro simples; a peça de prova da agulha não se resolve por este caminho, e a correção dela continua sendo assunto do plano das costuras.
