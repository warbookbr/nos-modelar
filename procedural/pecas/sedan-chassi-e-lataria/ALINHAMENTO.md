# Sedã em chassi e lataria: alinhamento

Objeto de teste pedido pela pessoa em 2026-11-11, como diagnóstico: saber se o
projeto dá a uma IA o que ela precisa para modelar bem o chassi e a lataria de
um carro. Não é etapa de plano e não leva a receitas oficiais nesta etapa. Este
alinhamento foi proposto por um agente despachado, sem a rodada de perguntas
com a pessoa que a skill `alinhar-modelagem` pede; por isso toda escolha de
forma que a referência não decide está na seção das decisões, com a
recomendação, e nada aqui vale como aprovado. As dificuldades encontradas estão
em [`ATRITOS.md`](../../../docs/modelar/banco-de-provas/sedan-chassi-e-lataria-2026-11-11/ATRITOS.md).

## O objeto e as referências

Um sedã de caixa de quatro portas, vermelho, com capô de tomada de ar,
para-lamas alargados em volta dos arcos, cabine que afunila até o teto,
para-choques retos, dois faróis e grade na frente e duas lanternas atrás. É o
mesmo carro de `procedural/pecas/carro-sedan-classico/`, que o acervo faz como
um bloco maciço por interseção de prismas. Aqui ele é refeito como um carro é
construído: um chassi de plataforma, e sobre ele a lataria em painéis de chapa
separados, com espessura de chapa e vão constante entre vizinhos.

A referência é a do acervo, e nada novo entra no repositório.
`carro-sedan-classico/referencias/fonte-partes.json` traz a caixa total, a
caixa das rodas e a da carroceria e as silhuetas em fatias (48 fatias de 91,7
mm ao longo do comprimento e 24 de 63,5 mm na altura), medidas na malha de um
modelo livre que não está no repositório. `fonte-vistas.png` mostra essa malha
em isométrica, de lado, de frente e de cima, toda vermelha.
`vistas-textura.png` e `vistas.png` são da receita do acervo. A fonte é
facetada, de faces planas, não separa painéis, não tem vista de trás e não tem
chassi. Os perfis mais finos que as fatias (o perfil lateral, a planta, a seção
do para-lama, a cabine, as janelas, os faróis, os para-choques e as rodas) são
os números que a receita do acervo leu da malha, copiados para a tabela do
rascunho. A divisão em painéis, a espessura, os vãos e todo o chassi são
propostas deste alinhamento, sem medida na referência.

Para a conferência, `referencias/sedan-chassi-e-lataria.contornos.json` guarda
os contornos de lado, de cima e de frente, derivados das fatias por
`referencias/derivar-contornos.mjs`, com incerteza de meia fatia (46 mm no
comprimento e 32 mm na altura).

## Como funciona e em que ordem se monta

O chassi é a base e carrega tudo. Duas longarinas correm de ponta a ponta,
ligadas por três travessas, com o rebaixo sob a cabine; o assoalho assenta
nelas, com o túnel no meio e o degrau do porta-malas atrás. As soleiras do
chassi fecham os lados do assoalho, e delas sobem os montantes A, B e C. A
parede corta-fogo separa o motor da cabine, o suporte do radiador fecha a
frente e o anteparo traseiro fecha o porta-malas; as travessas do painel e de
trás da cabine e os reforços da cintura correm por dentro do pé dos vidros. As
quatro caixas de roda cobrem os pneus por dentro dos arcos. Os eixos são presos
sob as longarinas, e as rodas giram neles.

A lataria se prende no chassi de fora para dentro da dependência. Primeiro os
painéis fixos, que são aparafusados ou soldados: as soleiras, as laterais
traseiras, o teto com as colunas, o painel dianteiro, o painel traseiro e os
para-lamas. Depois os painéis que fecham os vãos deixados por eles e se movem
em dobradiças: as quatro portas, o capô e a tampa do porta-malas. Por último os
vidros, os faróis, a grade, as lanternas, os para-choques, os retrovisores e a
tomada de ar.

As juntas não são modeladas nesta etapa, e o objeto é posto parado, com tudo
fechado. Ficam anotadas para a receita: cada roda gira em torno de x no centro
do cubo; cada porta gira em torno de um eixo vertical na borda da frente dela,
no montante A a dianteira e no B a traseira; o capô gira em torno de x na borda
de trás; a tampa gira em torno de x na borda da frente.

## Medidas (TABELA, em mm)

Referencial do acervo: x lateral com a direita do carro em +x, y altura com o
chão em 0, z comprimento com a frente em +z, centrado em x e em z. As fontes:
"fonte" é `fonte-partes.json`; "acervo" é a leitura da malha feita pela receita
do acervo, na `TABELA` dela; "pedido" é o que a pessoa fixou; "rascunho" é
valor proposto aqui, sem medida na referência.

| medida | valor | fonte |
|---|---:|---|
| comprimento total | 4.400, de z -2.200 a 2.200 | fonte; fixa a escala |
| altura e largura | 1.523 de altura; 1.972 de largura nos retrovisores | fonte |
| corpo de baixo, de lado | topo em y 1.000 de z 1.879 a -1.421, frente em z 2.122 (y 970), traseira em z -2.087 (y 972), fundo em y 419 | acervo |
| corpo de baixo, de cima | meia largura 860 nas portas, 934 no arco da frente, 928 no de trás, 770 na frente e 880 atrás | acervo; fonte: 860, 934 e 928 nas fatias |
| alargamento do para-lama | meia largura 935 até y 795, voltando a 860 em y 890 | acervo; fonte: 934 até y 825 e 854 em y 920 |
| cabine | pé do para-brisa em z 688, teto de z 229 a -1.054 em y 1.523, pé do vidro traseiro em z -1.313; meia largura 850 na cintura e 730 no teto | acervo; fonte: 730 no teto |
| rodas | pneu de Ø 728 por 205, eixos em z 1.249 e -1.181, centro do pneu a 807,5 do meio | acervo; fonte: Ø 729 e face de fora em 928 |
| arcos | raio 404, o do pneu mais 40 | acervo |
| chapa | 1 | pedido (0,8 a 1) |
| vão entre painéis | 4 | pedido |
| vidro | 1 de espessura, a da chapa de que ele é cortado, com 4 de vão para ela | rascunho |
| capô | de z 690 a 1.990, meia largura 760 | rascunho |
| tampa do porta-malas | de z -1.315 a -2.000, meia largura 740 | rascunho |
| painéis dianteiro e traseiro | de z 1.990 à frente (10 atrás da quina da planta em z 2.000) e de z -2.000 à traseira | rascunho |
| portas | dianteira de z 690 a -45, traseira de z -45 a -760 (21 à frente do arco), de y 470 a 1.470; a borda da frente da dianteira, acima da cintura, 75 atrás do para-brisa | rascunho |
| soleira | de y 419 a 470 sob as portas | rascunho |
| cintura | y 1.000: acima, o teto com as colunas | rascunho |
| janelas | para-brisa de y 1.075 a 1.425; vidro traseiro de y 1.110 a 1.420; vidros das portas de y 1.075 a 1.420 com quadro de 50; vigia de z -852 a -1.195 | acervo para os vidros da frente e de trás e para a vigia; rascunho para os das portas |
| faróis, grade, lanternas | farol de x 330 a 760 e y 755 a 945; grade com meia largura 283 e y 765 a 935; lanterna de x 440 a 840 e y 815 a 925 | acervo |
| para-choques | dianteiro de z 2.126 a 2.198 e y 413 a 745; traseiro de z -2.091 a -2.200 e y 457 a 745 | acervo, afastados 4 dos painéis |
| assoalho | chapa de 2 em y 400 na cabine e em y 490 no porta-malas, com a rampa dos pés até y 640 | rascunho |
| longarinas | perfil de 80 por 100, a 420 do meio, em y 388 a 488 nas pontas e 298 a 398 sob a cabine | rascunho |
| túnel | 240 de largura no pé, 150 no topo, 120 de altura | rascunho |
| caixas de roda | chapa de 3 a 40 do pneu, parede de dentro a 637 do meio | rascunho |
| montantes | A de z 600 a 696, B de z -75 a -15, C de z -835 a -754 | rascunho |
| eixos | Ø 60, em y 364 | rascunho |

A prevalência é a da fonte para a caixa e as silhuetas, depois a leitura do
acervo para os perfis, e o rascunho para o que a referência não tem.

## Partes e ordem de montagem

Cada item é uma peça da etapa de receitas, com o nome da pasta dela, e reúne partes que o rascunho já separa e nomeia (`paraLamaDir`,
`portaDianteiraEsq`, `vidroTraseiro` e as outras). Os painéis de chapa saem todos da mesma superfície de carroceria, que é definição comum
deles e não peça. A divisão é a da fatia 4c, de 2026-11-12, feita sobre o esboço em alta definição do carro inteiro
(`alta-definicao/chassi-aparado.esboco.mjs`, relato em `docs/modelar/banco-de-provas/sedan-chassi-e-lataria-2026-11-11/alta-definicao/RECEITA.md`),
e substitui a lista de quatorze peças da proposta de 2026-11-11, que era a do rascunho facetado: o chassi aparado pela lataria só existe numa peça
que tenha também as duas chapas que o aparam, e por isso o chassi, a lataria de baixo e o teto são uma peça só.

1. `carroceria`: a lataria de baixo (o capô, os dois para-lamas, as quatro portas, as duas laterais traseiras, as duas soleiras, a tampa do
   porta-malas e os dois lábios dos arcos), o teto com as colunas e as cinco molduras dos vãos, e o chassi aparado por essas duas chapas (as 34
   partes de plataforma, longarinas, travessas, caixas de roda, montantes, reforços e eixos).
2. `vidros`: o para-brisa, o vidro traseiro, os quatro vidros das portas e as duas vigias.
3. `frente-e-traseira`: o painel dianteiro com a grade de cinco lâminas e os vãos de farol, o painel traseiro com os vãos de lanterna, as quatro
   lentes, os dois para-choques de ponta a ponta e a tomada de ar do capô.
4. `rodas`: quatro rodas de pneu, aro, disco e cubo, pela família `procedural/familias/roda-pneu/`, perfil `carro`, com o diâmetro de 728 e a
   largura de 205 passados como parâmetro, postas por `instanciaDeFamilia` numa chamada com as quatro poses.
5. `acessorios`: os dois retrovisores de laços e as quatro maçanetas.

## Contatos

Cada painel apoia no chassi por dentro. O capô assenta no topo da parede
corta-fogo atrás e no topo do suporte do radiador na frente. Cada para-lama
assenta nesses dois, no montante A pela borda de trás e na ponta da soleira do
chassi, e a borda da caixa de roda é soldada nele, meia espessura para dentro. A chapa da soleira veste a
soleira do chassi e o pé dos montantes A e B. A porta dianteira fecha contra o
montante A, onde ficam as dobradiças, contra o B e contra a soleira do chassi;
a traseira, contra o B, onde ficam as dobradiças dela, e contra a soleira, e
fica a 4 mm do batente do montante C. A lateral traseira assenta no montante C,
no reforço da cintura, na travessa de trás da cabine e na ponta do anteparo. O teto
assenta nos montantes A, B e C, na travessa do painel pelo pé do para-brisa, na
travessa de trás da cabine pelo pé do vidro traseiro e nos reforços da cintura
pelo pé das colunas C. Os painéis dianteiro e traseiro assentam nas pontas das
longarinas. A tampa do porta-malas assenta no topo do anteparo.

Entre dois painéis vizinhos o vão é de 4 mm, medido ao longo da chapa pela
face de fora: capô e para-lama, capô e painel dianteiro, para-lama e
painel dianteiro, para-lama e porta dianteira, as duas portas, porta traseira e
lateral traseira, cada porta e a soleira, cada porta e o teto, lateral traseira
e tampa, lateral traseira e painel traseiro, tampa e painel traseiro. Na linha
de cintura o teto fica 4 mm acima da lateral traseira, com o degrau de 10 mm do
ombro entre os dois. O capô acaba 5,6 mm à frente do pé do para-brisa e a tampa
começa 5 mm atrás do pé do vidro traseiro. Cada vidro, farol, lanterna e a
grade ficam no vão deles com 4 mm em toda a volta, e no rascunho não encostam
em nada. Os para-choques ficam 4 mm à frente e atrás dos painéis, presos pelos
suportes, que passam por furos nos painéis e saem das longarinas.

No chassi, o assoalho assenta nas longarinas e nas travessas e entra nas
soleiras; o túnel assenta no assoalho; os montantes nascem das soleiras; as
caixas de roda da frente se prendem nas longarinas superiores, e as de trás, no
assoalho e no anteparo. O cubo de cada roda gira no eixo com 8,6 mm de folga no
raio, e o pneu fica a 40 mm da caixa de roda.

## Grau de realismo

Chapa de faces planas, como a fonte, com 1 mm de espessura e corte reto na
borda, sem aba dobrada nem painel interno. Chassi de caixas e perfis retos, com
os membros que encostam na lataria aparados pela face de dentro dela. Rodas da
família, com ombro e disco. Sem motor, suspensão, bancos, dobradiças,
fechaduras, borrachas nem parafusos. A opção de chapa lisa com raio nas quinas
está nas decisões.

Das regras da família `veiculo`: a coluna do para-brisa tem 75 mm vista de
lado e a calha sobre a porta, 53 mm; a caixa de roda fica a 40 mm do pneu; os
dois lados são iguais, sem exceção; atrás dos vidros aparecem o assoalho, o
túnel e os montantes, sem bancos; a borda de trás do capô e a da frente da
tampa correm a menos de 30 mm do pé dos vidros, por serem a própria junta com a
cabine. As regras de plástico de proteção não se aplicam, porque o carro não
tem saia nem moldura de arco.

## O que reprova o objeto

A carroceria em bloco maciço, sem espessura de chapa. Painel que cruza o
vizinho ou o chassi sem estar declarado. Vão entre vizinhos fora de 4 mm por
mais de 0,5 mm no plano do corte, ou que varia ao longo da linha. Dois painéis
vizinhos fora da mesma superfície, com degrau entre eles acima de 0,5 mm fora
da linha de cintura. Painel que não encosta em nenhum membro do chassi. Arco de
roda ausente ou janela fechada por chapa. Roda que cruza a caixa de roda ou o
para-lama, ou que não toca o chão em y 0. Um lado diferente do outro. Vão que
deixa ver através do carro onde o carro tem estrutura por trás, que são os
montantes e a soleira. Peça solta no ar na etapa de receita.

## Decisões que dependem da pessoa

A referência tem duas janelas por lado, uma longa e uma curta atrás, que é
proporção de duas portas, e o pedido é de quatro. O rascunho põe a linha entre
as portas em z -45 e acaba a porta traseira em z -760, à frente do arco; a
janela curta vira vigia fixa na coluna C. A recomendação é manter as quatro
portas assim.

O teto com as colunas encontra a parte de baixo na linha de cintura, em y
1.000, de modo que a coluna C é do teto e a lateral traseira acaba na cintura.
A alternativa é a lateral traseira inteiriça com a coluna C, como na estampa de
um carro real, e o teto só com a chapa de cima. A recomendação é a cintura
nesta etapa, por ser uma linha reta que a ferramenta corta com vão constante, e
rever depois de a pessoa ver as imagens.

A soleira sob as portas entrou como painel próprio, dois a mais que a lista do
pedido, para a porta ter contra o que fechar embaixo. A recomendação é mantê-la.

A chapa tem 1 mm e o vão 4 mm. O vidro, que no rascunho refeito é cortado da
mesma chapa, ficou com 1 mm. A recomendação é ficar com a chapa e o vão e dar
ao vidro 4 mm na etapa de receita, a partir de uma chapa própria.

A superfície é facetada, como a fonte. A chapa lisa, com raio nas quinas e
curvatura nos painéis, foi testada só no corpo de baixo e saiu ondulada pelas
três vistas. A recomendação é ficar com a facetada neste objeto e tratar a lisa
como trabalho de ferramenta.

O chassi aparece 121 mm abaixo da carroceria, com as longarinas descendo a y
298, porque a fonte tem o fundo da carroceria em y 419. A alternativa é subir o
assoalho e esconder as longarinas, perdendo altura de cabine. A recomendação é
manter.

O pneu da fonte tem 728 mm, grande para um sedã de 4,4 m. A recomendação é
mantê-lo, por ser a proporção da referência.

Os vidros, os faróis, a grade e as lanternas ficam soltos no vão, e as bordas
dos painéis não têm aba. A recomendação é aceitar isso no rascunho e pedir o
apoio de cada um e a aba das portas, do capô e da tampa na etapa de receita.

## Rascunho

`referencias/sedan-chassi-e-lataria.esboco.mjs` monta o carro inteiro numa
opção, com 83 partes nomeadas: 34 do chassi, 16 das rodas, 15 painéis de chapa,
8 vidros e 10 acabamentos. Os 15 painéis e os 8 vidros saem de uma superfície
só, montada uma vez: a carroceria inteira é uma chapa fechada de 1 mm, e
`paineisPorVaos`, do núcleo, a parte por 44 linhas de vão desenhadas nas vistas
de cima, de lado e de frente, num corte só, e nomeia cada painel pelo ponto
visto dele. Das 44 linhas, 36 vão no modo superfície, em que a parede do corte
é normal à chapa, e 8 no modo vista, em que a lâmina atravessa o carro: os três
planos de corte, a cintura, a linha entre as portas e os arcos de roda. O
interior da casca, que apara os membros do chassi, é construído uma vez por
espessura e copiado no lugar. `SEDAN=chassi` monta só o chassi com as rodas,
`SEDAN=explodida` afasta os painéis, `SEDAN_CORES=reais` troca a cor por painel
pela do objeto, e `SEDAN_PLANOS=superficie` troca os três planos de corte por
linhas de superfície. As duas versões anteriores do rascunho e a comparação das
três estão no `ATRITOS.md`.

Medido em 2026-11-11, sobre o núcleo do commit `030d8430`. A caixa do conjunto
vai de x -986 a 986, y 0 a 1.523 e z -2.200 a 2.198. O rascunho tem 428 passos,
carrega em 20 s e monta em 9 s. No modo estrito do relato de contatos nada
atravessa sem estar declarado; 64 pares encostam e 63 atravessam por desenho,
iguais dos dois lados. `npm run vao:partes`, com o vão, o degrau e as folgas de
desenho declarados em cada par e as 13 partes soltas de propósito declaradas em
`apoia`, dá o vão da face de fora entre 4,00 e 4,16 mm em todos os pares de
chapa e de vidro, e a menor distância entre os dois sólidos entre 4,00 e 4,08
mm, o para-brisa e o vidro traseiro incluídos; o capô e o para-lama ficam a 5,6
mm do pé da cabine e a tampa a 5,0 mm, por desenho. Com `--esperado=4
--tolerancia=0.2 --soltas=recusar` o comando sai com 0. Com `--folga3d=3.8` sai
com 1 por onze pares do chassi e das rodas cuja folga de desenho, declarada, é
menor que 3,8 mm, o que o `ATRITOS.md` explica.

`referencias/sedan-chassi-e-lataria.conferir.json` confere as vistas de lado,
de cima e de frente contra os contornos da fonte, com o chassi fora da conta. A
sobreposição é de 92,8% de lado (sobra de 0,1% e falta de 7,1% da área da
referência, a falta no vão entre o pneu e o arco e nos cantos que as fatias dão
às rodas), 98,2% de cima (sobra de 0,4% e falta de 1,5%) e 97,5% de frente
(sobra de 0,3% e falta de 2,2%).

As imagens para a pessoa estão em
`docs/modelar/banco-de-provas/sedan-chassi-e-lataria-2026-11-11/`.

## Aceite

- delegação: pela pessoa em 2026-11-11, "deixo esse trabalho de maneira autonoma para você até o fim a partir de agora, tanto o carrinho de mão quando esse do carro, não vou ter tempo para supervisionar nem aprovar então deixo sobre sua tutoria"

As oito decisões da seção "Decisões que dependem da pessoa" ficam com a
recomendação escrita em cada uma, tomadas por quem conduz sob essa delegação.
