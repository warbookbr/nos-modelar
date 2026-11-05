# Abertura de contorno livre — as técnicas medidas e a operação

Provas do plano [abertura de contorno livre](../../planos/2026-11-05-abertura-de-contorno-livre.md), em 2026-11-05. A peça de
teste é `tools/fixtures/abertura-de-prova/`: uma chapa de subdivisão de 800 por 800 mm, 2 mm de espessura e duas curvaturas, com
um vão desenhado na vista superior que sai de um bico vivo de 40,4 graus, segue reto 304 mm e volta ao bico por dois arcos
tangentes. A fatia 1 mediu as duas técnicas de corte e não aprovou nenhuma; as fatias 2 e 3 fizeram a operação
`aberturaPorContorno` pela técnica que a pessoa escolheu, o corte depois da subdivisão com uma limpeza da costura, e a aba e a
lente sobre ela.

## Fatia 1: as duas técnicas

O corte depois da subdivisão tirava da chapa já subdividida o prisma do contorno projetado em y, pelo `subtrair` do núcleo. O
corte da gaiola antes da subdivisão recortava as faces da gaiola de 9 por 9 pontos vistas de cima, partia as cortadas em pedaços
convexos, punha os pontos novos na superfície da chapa sem vão e subdividia a gaiola cortada com a espessura. O protótipo das
duas ficou em `procedural/nucleo/operacoes/abertura-por-contorno.js` e `tools/fixtures/abertura-de-prova/corte-na-gaiola.js` até o
commit `dc1d1d17`; a fatia 2 tirou o corte na gaiola, que a decisão descartou, e o arquivo passou a ser a operação.

O gate 1 conta as arestas sem par e os vínculos não manifold de `tools/oficina/conferir-malha.ts`, os triângulos abaixo do piso de
área do mesmo arquivo (1,29e-9 m² nesta peça) e o grito do passo; a lasca é a `face-fina` de `procedural/nucleo/topologia.js`. O
gate 2 mede, em `tools/fixtures/abertura-de-prova/medir.mjs`, a borda do vão contra o contorno desenhado (o analítico, com a
flecha dos segmentos do arco) vista de cima, a mesma borda em y contra a superfície da chapa sem vão, onde o contorno projetado
cai, e o ângulo do bico vista de cima, a 2 mm dele ao longo da borda. Na posição da peça, com 32 segmentos por quarto de arco:

| medida | corte depois | corte na gaiola |
|---|---:|---:|
| arestas sem par, vínculos não manifold | 0, 0 | 0, 0 |
| triângulos sem área (menor área) | 5 (3,3e-11 m²) | 0 (2,4e-7 m²) |
| lascas junto da borda | 4 | 0 |
| borda contra o desenho, vista de cima | 0,125 mm | 0,166 mm |
| borda contra a chapa sem vão, em y | 0,000 mm | 2,830 mm |
| borda de dentro contra o desenho, vista de cima | 0,125 mm | 0,735 mm |
| bico (desenhado 40,38 graus) | 39,00 graus | 38,98 graus |
| malha | 2364 vértices, 2438 faces | 4496 vértices, 4496 faces |

Com o contorno deslocado de 1, 3, 7 e 11 mm, e com 16 segmentos por quarto de arco, o corte depois saiu fechado e manifold nas dez
posições, com a borda no desenho e sem desvio em y, e deixou de 3 a 8 triângulos sem área e até 4 lascas em todas: a costura
passa rente a vértices e arestas da malha fina, a décimos de milímetro ou menos. O corte na gaiola foi recusado pela subdivisão em
quatro das dez posições e, onde saiu, afastou a pele em volta do vão 2,8 mm da chapa sem vão. Nenhuma das duas passou no gate 1 de
forma estável, e a fatia parou com a recomendação de ficar com o corte depois e acrescentar a ele uma limpeza da costura. As
imagens da fatia 1 são `corte-depois-sombreado.png`, `corte-depois-arame.png`, `corte-na-gaiola-sombreado.png` e
`corte-na-gaiola-arame.png`.

## Fatias 2 e 3: a operação, a aba e a lente

A pessoa aprovou em 2026-11-05 o corte depois da subdivisão com a limpeza dentro da operação, a vista como parâmetro, o bico medido
contra o desenho com um piso de segmentos e a borda de dentro com o mesmo gate da de fora. A operação está em
`procedural/nucleo/operacoes/abertura-por-contorno.js`, registrada no núcleo e no catálogo, e a peça de teste a usa assim:

```js
['aberturaPorContorno', { origemId: 3, chapa: { origem: { op: 'subdivisao', id: 1 } }, contorno, vista: 'y', segmentosArco: 32, lente: true }],
['friso', { origemId: 4, superficie: { op: 'aberturaPorContorno', id: 3 }, linha: { nome: 'abaDoVao' }, aba: { largura: 0.008, angulo: 90, raio: 0.001 } }],
```

O corte é o `subtrair` do núcleo, sem mudança em `booleanas.js`: o prisma do contorno entra no fim da faixa de ids do passo, a
booleana o tira da chapa e o que sobra das laterais dele vira a parede do vão, com id novo depois dos pedaços. A limpeza da costura
roda depois do corte, sobre a chapa e sobre a lente, em três passos. O primeiro funde num ponto só a aresta que toca a costura e
mede menos de 1% da maior aresta das faces em volta, o canto da costura quase reto (o triângulo com os vizinhos abaixo de dez
pisos de área), a aresta mais curta da face sem área e, na face de pele fina presa à costura, a aresta mais curta que corre na
costura; o vértice que fica é sempre o ponto do desenho, depois o da costura, depois o da malha fina, e a fusão só acontece quando
não muda a topologia em volta nem vira face. O segundo junta à vizinha a face de pele que ainda sai fina, a ponta do leque que a
booleana abre de um vértice da malha para os pontos de um arco, quando o resultado sai convexo e sem canto quase reto. O terceiro
tira o vértice que ficou no meio da aresta entre duas faces só. A face que some na limpeza era um pedaço sem área, e a de antes do
passo entra em `consumidas`.

Na posição da peça, com 32 segmentos, a operação dá 2414 faces de chapa, 249 de lente e 1356 de aba, e a limpeza funde 30 vértices
e tira 17 faces sem área, com a superfície a no máximo 0,038 mm de onde os vértices fundidos estavam. As duas bordas ficam a
0,125 mm do desenho nos dois sentidos (a flecha dos segmentos do arco; contra o polígono do prisma, 2e-13 mm), a borda de fora e a
pele de fora ficam sobre a chapa sem vão em y (1,7e-13 mm), o bico sai com 39,00 graus contra 40,38 desenhados e a espessura medida
na borda é 2,000 mm. O menor triângulo da peça inteira tem 1,3e-8 m², dez vezes o piso, a menor razão de face em volta do vão é
0,0039 (o limite da lasca é 0,003), e `npm run malha:conferir` só dá alertas (faces tortas da subdivisão, n-gons, polos e as três
ilhas da chapa, da lente e da aba).

A varredura repete as posições da fatia 1 no piso de segmentos deste contorno (23) e com 32, e acrescenta três posições com 64,
onde o arco menor, de 51 mm de raio, tem pontos a 1,3 mm. A coluna sem limpeza é o mesmo corte feito pelo `extrusao` e pelo
`subtrair` do núcleo, como na fatia 1, contado só na chapa; a coluna com a operação conta a peça inteira, com a lente e a aba. O
desvio da fusão é a distância de cada vértice fundido às faces que ficaram em volta do que ficou.

| dx (mm) | segmentos | sem limpeza: sem área / lascas | menor triângulo | com a operação: sem área / lascas | menor triângulo | vértices fundidos | faces tiradas | lascas fundidas | desvio da fusão (mm) | borda de fora (mm) | borda de dentro (mm) | bico (graus) |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 23 | 6 / 3 | 3,0e-11 | 0 / 0 | 1,5e-8 | 29 | 19 | 0 | 0,111 | 0,222 | 0,222 | 38,54 |
| 0 | 32 | 5 / 4 | 3,3e-11 | 0 / 0 | 1,3e-8 | 30 | 17 | 0 | 0,038 | 0,125 | 0,125 | 39,00 |
| 1 | 23 | 5 / 1 | 5,3e-11 | 0 / 0 | 1,3e-8 | 30 | 18 | 0 | 0,113 | 0,222 | 0,222 | 38,54 |
| 1 | 32 | 5 / 1 | 3,7e-11 | 0 / 0 | 1,6e-8 | 31 | 18 | 0 | 0,048 | 0,125 | 0,125 | 39,00 |
| 3 | 23 | 3 / 0 | 4,4e-11 | 0 / 0 | 1,9e-8 | 28 | 18 | 0 | 0,100 | 0,222 | 0,222 | 38,54 |
| 3 | 32 | 6 / 2 | 2,2e-11 | 0 / 0 | 7,7e-9 | 34 | 20 | 0 | 0,061 | 0,125 | 0,125 | 39,00 |
| 7 | 23 | 4 / 0 | 5,5e-11 | 0 / 0 | 1,9e-8 | 29 | 14 | 0 | 0,139 | 0,222 | 0,222 | 38,54 |
| 7 | 32 | 4 / 1 | 1,0e-10 | 0 / 0 | 1,9e-8 | 32 | 19 | 1 | 0,137 | 0,125 | 0,125 | 39,00 |
| 11 | 23 | 2 / 0 | 1,1e-10 | 0 / 0 | 1,7e-8 | 26 | 16 | 0 | 0,152 | 0,222 | 0,222 | 38,54 |
| 11 | 32 | 4 / 2 | 8,0e-11 | 0 / 0 | 1,4e-8 | 26 | 16 | 2 | 0,152 | 0,125 | 0,125 | 39,00 |
| -4 | 64 | 6 / 4 | 2,6e-11 | 0 / 0 | 3,8e-9 | 38 | 22 | 5 | 0,071 | 0,031 | 0,031 | 39,69 |
| 9 | 64 | 4 / 7 | 1,1e-10 | 0 / 0 | 4,6e-9 | 33 | 21 | 8 | 0,113 | 0,031 | 0,031 | 39,69 |
| 17 | 64 | 4 / 2 | 2,0e-11 | 0 / 0 | 5,8e-9 | 33 | 20 | 1 | 0,004 | 0,031 | 0,031 | 39,69 |

Em todas as treze posições a peça sai sem aresta sem par, sem vínculo não manifold, sem triângulo abaixo do piso e sem nenhum achado
reprovado da topologia, e a borda de fora fica sobre a chapa sem vão em y. Fora da varredura do teste, as mesmas contas deram zero
em mais vinte posições (dx de -4 a 17 mm com 23, 32 e 64 segmentos). A mesma receita dá a mesma malha byte a byte, e as faces da
chapa a mais de 260 mm do centro do vão ficam com o id e os cantos de antes do corte. As vistas 'x' e 'z' passam nos mesmos gates
com a chapa girada para que o eixo da vista seja x ou z (na 'z' o giro é um espelho, e o sentido das faces da gaiola vira junto).

O bico se mede contra o desenho: a operação compara o ângulo de cada canto vivo do polígono com o de uma referência fina (2048 e
4096 segmentos por quarto de volta, extrapolados ao limite) e recusa o erro de 2 graus ou mais, que é o gate 2. Neste contorno o
bico é formado pelo reto e pelo segundo arco, e o erro vem da corda do primeiro segmento do arco: 2,76 graus com 16 segmentos,
2,004 com 22, 1,84 com 23 e 1,38 com 32. O piso deste contorno é 23, e a recusa diz isso.

As recusas acontecem antes de mexer na malha, e cada uma diz o que fazer:

| caso | mensagem (resumo) |
|---|---|
| contorno sem o último arco | o contorno não fecha: o último trecho termina em [540, 380] mm, a 323,9 mm do início [220, 430] mm, e o vão fecharia por um reto que ninguém desenhou; termine o último trecho no início |
| laço em oito | o contorno se cruza: a aresta 0 (de [300, 300] mm a [500, 500] mm) cruza ou toca a aresta 2; o vão precisa de um contorno simples, que não toque a si mesmo |
| triângulo que passa da borda da chapa | o ponto [800, 410] mm do contorno fica fora da chapa vista do eixo y: o vão precisa caber inteiro dentro dela; traga o contorno para dentro ou troque a vista |
| triângulo fora da chapa | o ponto [900, 900] mm do contorno fica fora da chapa vista do eixo y |
| 16 segmentos | o bico em [220, 430] mm sai com 37,63 graus contra 40,38 desenhados (diferença de 2,755, acima dos 2 graus do gate de forma); o piso deste contorno é segmentosArco 23 |
| vista 'superior' | vista precisa ser 'x', 'y' ou 'z', o eixo ao longo do qual o contorno é projetado |
| friso com pontos na borda da abertura | sobre a abertura a linha é a borda de fora do vão inteira, e não leva pontos |

Duas recusas existem e a peça de teste não as exercita: a do lado do contorno que cruza a borda da chapa com os dois pontos dentro
dela, que só uma chapa côncava vista do eixo produz, e a da chapa que a reta do eixo atravessa mais de uma vez (a chapa dobrada
sobre si na vista).

A aba é o `friso` com `aba` sobre a borda de fora do vão. A mudança em `procedural/nucleo/operacoes/friso.js` é a mínima para ele
aceitar `superficie: { op: 'aberturaPorContorno', id }`: a linha passa a ser a volta da borda de fora que a operação registrou, a
normal é a da pele em volta de cada ponto, a espessura é a que a operação mediu na borda, e os pontos da borda mais perto de um
canto vivo que o recuo da esquadria nele saem da linha, porque o corte deixa pontos a frações de milímetro do bico e a esquadria de
40 graus recua 8 mm de cada lado; o recuo é o de `varrerPerfil`, com a parte de v que entra quando a linha gira pela normal da
chapa curva. Na peça de teste a aba de 8 mm a 90 graus com raio de 1 mm segue a borda de fora a no máximo 0,18 mm (junto do bico,
onde a linha corta pela corda), entra no vão até 6,1 mm (a esquadria no bico), desce 11,5 mm abaixo da pele de fora e sai
fechada. A lente é o pedaço retirado, a interseção da chapa com o mesmo prisma
calculada pela Manifold dentro da operação antes do corte e limpa pelos mesmos três passos, citável por
`{ op: 'aberturaPorContorno', id, parte: 'lente' }`; ela sai fechada, com o menor triângulo de 1,5e-8 m². Na peça de teste a lente
sobe 100 mm só para a imagem mostrar o vão, a parede e a aba; no lugar, ela ocupa o vão inteiro e atravessa a aba, que entra 3 mm
nele, e a receita que a quiser como lente de verdade precisa recuá-la.

As imagens são da vista isométrica da bancada, recortadas em volta do vão: `abertura-sombreado.png` e `abertura-arame.png` mostram o
vão com a parede, a aba por dentro da borda e a lente acima, e `abertura-bico-sombreado.png` e `abertura-bico-arame.png` o bico de
perto. No arame se veem os leques que a booleana abre dos vértices da malha para os pontos do arco menor, que a limpeza deixa com
razão acima de 0,0039.

## Como reproduzir

```text
npx vitest run procedural/nucleo/operacoes/abertura-por-contorno.test.ts
npm run malha:conferir -- tools/fixtures/abertura-de-prova
npm run bancada -- tools/fixtures/abertura-de-prova --analise --res=2560 --zoom=isometrica:1100,490,1440,790
```

O teste imprime as medidas em JSON, as da posição da peça e as da varredura com e sem a limpeza, e trava a ausência dos triângulos
sem área e das lascas em toda posição. As imagens desta pasta são recortes de
`tools/bancadas/out/analise-tools-fixtures-abertura-de-prova/bancada-tools-fixtures-abertura-de-prova-isometrica-orto{,-arame}.png`:
o vão em (1100, 490) a (1440, 790), ampliado duas vezes, e o bico em (1105, 595) a (1245, 690), ampliado cinco vezes.
