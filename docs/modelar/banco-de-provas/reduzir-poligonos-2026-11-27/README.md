# Reduzir polígonos: o redutor de malha e a medida no furgão (fatia 1)

Pasta da fatia 1 do plano [reduzir polígonos](../../planos/2026-11-27-reduzir-poligonos.md), medida em 2026-11-27 sobre o `furgao-realista` (262.947 faces, 521.976 triângulos). O redutor é `tools/modelar/reduzir-malha.mjs`, uma função pura sobre a malha neutra que remove vértices por colapso de meia-aresta, sem criar posição nova, e recusa o colapso que passa do teto de distância ou de normal. Ainda não tem comando: a exportação e o comando entram na fatia 2.

## O que ficou medido

Com o padrão (0,05 mm e 2 graus), o redutor leva o furgão de 521.976 para 369.202 triângulos, 29,3% a menos, em 30,3 s de relógio (a execução da receita, que fica fora dessa conta, leva 43 s), e duas execuções dão o mesmo sha256 (`2e651469…e8001`). A conferência independente mediu o desvio máximo de posição em 0,0484 mm, abaixo de 0,05 mm em todas as 127 partes, a borda e a casca fechada iguais às da malha original, nenhuma aresta de mais de duas faces e nenhum enrolamento invertido. O desvio de normal máximo medido é 1,55 graus na carroceria e em 126 das 127 partes até 1,55 graus; a exceção é `refletorLanternaEsquerda`, com 3,90 graus, em faixas de 0,1 mm de largura por 12 mm de comprimento da própria malha original, onde a normal de uma faixa difere 13 graus da vizinha e a medida por vizinhança de 0,05 mm não distingue uma faixa da outra. O refletor da lanterna direita, espelho do esquerdo, sai com 0,66 grau. Por isso `ok` da conferência está falso neste retrato: o teto de normal de 2 graus não vale para essa parte.

A carroceria cai de 201.962 para 96.096 triângulos (52% a menos), a maior parte do ganho. O para-brisa cai 62%, os vidros das portas traseiras 94%, e 48.006 triângulos de 33 partes (pneus, refletores de farol, aros) ficam intactos porque nenhum colapso cabe nos tetos. O alvo do plano, perto de 215 mil triângulos, não foi alcançado: com 2 graus de normal medidos, o piso é perto de 369 mil. O protótipo chegava a 216 mil porque deixava a normal dos vértices já curvos afastar-se do teto (a folga de 0,5 grau mais o que a superfície original já curva) e porque o desvio dele medido por amostragem fina passava de 0,05 mm (de 0,05 a 0,09 mm). A sensibilidade ao teto de normal, só contando triângulos e sem conferência: 4 graus dão 357.348 triângulos e 6 graus dão 340.748. A decisão de afrouxar o teto de normal ou de reduzir as peças pequenas densas na receita (fatia 3) é da pessoa.

O desvio de posição passa por uma margem: o redutor aplica 65% do teto declarado (0,0325 mm) e a conferência independente acha até 1,45 vez esse valor nos pontos entre os vértices e as amostras que o redutor mede; com 80% de margem a conferência achou 0,056 mm. O teto de normal interno é 50% do declarado (1 grau) pelo mesmo motivo. Os dois fatores são parâmetros (`margem`, `margemNormal`).

## A luz rasante

`vistas:superficie` executa a receita e não aceita uma malha pronta, então a malha reduzida não passa por ele. [`luz-rasante.mjs`](luz-rasante.mjs) desenha as duas malhas pela mesma câmera ortográfica, luz a 10 graus do plano da imagem, normais lisas por vértice com quebra a 30 graus recalculadas sobre cada malha, como o adaptador faria. Não é o desenho da bancada: serve para comparar as duas malhas entre si. As imagens `furgao-<vista>-<azimute>-original.png`, `-reduzida.png` e `-diferenca-x8.png` (diferença ampliada 8 vezes, magenta onde a silhueta difere) estão nesta pasta, na vista de lado e de três quartos, a 20 e 160 graus. A diferença média por pixel fica entre 0,035 e 0,19 de 255, nenhum pixel de silhueta difere, e o pixel de maior diferença tem 127 de 255 na vista de três quartos a 160 graus, 0,004% da peça acima de 16 de 255, nas nervuras do teto. A pessoa julga a forma por essas imagens.

## Como se refaz

```
npx vitest run tools/modelar/reduzir-malha.test.mjs
node docs/modelar/banco-de-provas/reduzir-poligonos-2026-11-27/medir-furgao.mjs [--extra]
```

O segundo comando executa a receita do furgão, reduz duas vezes, confere (uns 3 minutos, em um núcleo), desenha as imagens e grava [`medidas-furgao.json`](medidas-furgao.json) com a contagem e o desvio de cada parte. [`conferir-reducao.mjs`](conferir-reducao.mjs) é a conferência, escrita sem importar nada do redutor (só a triangulação das faces da malha original vem do núcleo). Ela mora aqui, dentro do território do plano, e na fatia 2 passa para `tools/modelar/` quando a exportação precisar dela.

## O protótipo da análise

A pasta [`prototipo/`](prototipo/) guarda os scripts da análise que deu origem ao plano, como estavam: `colapso.mjs` (o colapso), `geo.mjs` (a geometria de medida), `medir.mjs` (a malha da receita para JSON), `rasante.mjs`, `comparar-malhas.mjs` e `normais.mjs`. Eles dependem de arquivos fora do repositório (a malha em JSON e um `pngjs` próprio) e não rodam daqui; valem como registro. O protótipo triangulava em leque, e por isso deixava triângulos sem área em pontos colineares, e levava 48 a 148 s.

## O que mudou do protótipo para o redutor

A triangulação é a do núcleo, com a guarda de lasca (qualidade mínima do triângulo, ou a que ele já tinha). A fila é de prioridade por degrau de desvio e menor aresta, com desempate por índice, no lugar de varreduras repetidas, e a distância dos pontos do triângulo novo à malha original é pedida a uma grade espacial em níveis, só dentro do raio do teto. A normal é conferida contra as faces originais de cada vértice absorvido, e não contra a normal média do vértice com folga. O tempo no furgão inteiro caiu de 48 a 148 s para 30 s, dentro da meta do plano de até 30 s por peça.

## Atritos

Os dois arquivos novos de `tools/modelar/` precisam de uma linha em `tools/registro-de-ferramentas.json` (`semChamador`, até a fatia 2 ligar o comando), arquivo fora do território deste plano; o `ferramentas:registro:check` recusa sem ela.
