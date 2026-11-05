# Abertura de contorno livre — fatia 1, as duas técnicas medidas

Fatia 1 do plano [abertura de contorno livre](../../planos/2026-11-05-abertura-de-contorno-livre.md), em 2026-11-05. A peça de
teste é `tools/fixtures/abertura-de-prova/`: uma chapa de subdivisão de 800 por 800 mm, 2 mm de espessura e duas curvaturas, com
um vão desenhado na vista superior que sai de um bico vivo de 40,4 graus, segue reto 304 mm e volta ao bico por dois arcos
tangentes. As duas técnicas estão no protótipo `procedural/nucleo/operacoes/abertura-por-contorno.js`, ainda sem registro como
operação. O corte depois da subdivisão (`receita.js`) tira da chapa já subdividida o prisma do contorno projetado em y, pelo
`subtrair` do núcleo. O corte da gaiola antes da subdivisão (`corte-na-gaiola.js`) recorta as faces da gaiola de 9 por 9 pontos
vistas de cima, parte as cortadas em pedaços convexos, põe os pontos novos na superfície da chapa sem vão e subdivide a gaiola
cortada com a espessura.

## Medidas

O gate 1 conta as arestas sem par e os vínculos não manifold de `tools/oficina/conferir-malha.ts`, os triângulos abaixo do piso de
área do mesmo arquivo (1,29e-9 m² nesta peça) e o grito do passo; a lasca é a `face-fina` de `procedural/nucleo/topologia.js`. O
gate 2 mede, em `tools/fixtures/abertura-de-prova/medir.mjs`, a borda de fora do vão contra o contorno desenhado (o analítico,
com a flecha dos segmentos do arco) vista de cima, a mesma borda em y contra a superfície da chapa sem vão, onde o contorno
projetado cai, e o ângulo do bico vista de cima, a 2 mm dele ao longo da borda. Na posição da peça, com 32 segmentos por quarto
de arco:

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

Com o contorno deslocado de 1, 3, 7 e 11 mm, e com 16 segmentos por quarto de arco, as duas técnicas repetem o que se vê na
posição da peça. O corte depois sai fechado e manifold nas dez posições, com a borda a no máximo 0,499 mm do desenho e nenhum
desvio em y, e deixa de 3 a 8 triângulos sem área e até 4 lascas em todas: a costura passa rente a vértices e arestas da malha
fina, a décimos de milímetro ou menos. O corte na gaiola sai sem triângulo sem área nem lasca nas seis posições até 3 mm, mas nas quatro de 7 e 11 mm a
subdivisão recusa a gaiola cortada (a superfície se dobra sobre si, a até 179 graus), e onde sai, a pele em volta do vão fica a
2,8 mm da chapa sem vão, porque os pontos novos são pontos de controle e a superfície limite não passa por eles; com 16
segmentos a borda passa de 0,5 mm do desenho (0,665 mm). Medir os pontos novos, o remédio direto para o desvio em y, não serve:
exatos ou com peso 100, a subdivisão recusa a gaiola já na posição da peça, e com peso 1 ou 0,01 o desvio em y cai a 1,4 e 1,8 mm
mas a borda vai a 2,8 e 4,6 mm do desenho vista de cima. As faces da gaiola deixadas como polígono côncavo, em vez de pedaços
convexos, dobraram a superfície em todas as variantes tentadas durante a fatia; essa escrita não ficou como opção do protótipo.
As duas técnicas dão a mesma malha a cada execução, e no corte depois as faces da chapa longe do vão ficam com o id e
os cantos de antes do corte.

## Decisão

Nenhuma das duas passa no gate 1 de forma estável. O corte depois reprova em todas as posições pelos triângulos sem área; o corte
na gaiola passa na posição da peça por acaso da posição, é recusado em quatro das dez posições vizinhas e reprova o gate 2 em y
por 2,8 mm onde sai. Pela regra de parada do plano, a fatia para aqui e volta à pessoa com as duas medidas, sem tentar uma
terceira técnica. A recomendação é ficar com o corte depois da subdivisão, que acerta a forma (a borda no desenho, o bico e a
chapa intacta em volta) e só falha na qualidade da malha junto da costura, e acrescentar a ele uma limpeza da costura (fundir na
malha fina o vértice que fica a menos de uma tolerância do contorno antes do corte, ou a lasca depois dele). Essa limpeza é uma
técnica que o plano não previu e pede o aval da pessoa; se ela mexer em `booleanas.js`, o arquivo está no território do plano do
braço.

As imagens são a borda do vão de perto, na vista isométrica da bancada: `corte-depois-sombreado.png` e `corte-depois-arame.png`
da peça de teste, e `corte-na-gaiola-sombreado.png` e `corte-na-gaiola-arame.png` da outra técnica, para comparar. Sombreadas,
as duas parecem iguais; o arame mostra os leques finos do corte depois junto da costura e o refino denso que os pedaços
convexos da gaiola cortada propagam.

## Como reproduzir

```text
npx vitest run procedural/nucleo/operacoes/abertura-por-contorno.test.ts
npm run malha:conferir -- tools/fixtures/abertura-de-prova
npm run bancada -- tools/fixtures/abertura-de-prova --analise --res=2560 --zoom=isometrica:1080,550,1450,740
npm run bancada -- tools/fixtures/abertura-de-prova/corte-na-gaiola.js --analise --res=2560 --zoom=isometrica:1080,550,1450,740
```

O teste imprime as medidas em JSON, as da posição da peça e as da varredura, e trava a linha de base, inclusive os dois
defeitos, para a fatia seguinte mudar o teste quando os corrigir. As imagens saem em
`tools/bancadas/out/analise-<peça>/zoom-isometrica-{sombreado,arame}.png`.
