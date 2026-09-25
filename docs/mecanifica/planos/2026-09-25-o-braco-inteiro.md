# O braço inteiro

**Estado:** ativo

**Responsável:** Tiago (autoria) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-mecanifica`, base `e6af1190` na main.

## Problema observado

O plano [o laço constrói parte por
parte](encerrados/2026-09-23-o-laco-constroi-parte-por-parte.md) fechou com as
três primeiras partes do braço robótico fixas: base, anel da cintura e ombro.
As outras partes da rodada de alinhamento
(`procedural/pecas/braco-robotico/ALINHAMENTO.md`) ainda não existem, e três
coisas que aquele plano deixou para depois atrapalham a continuação.

Nada confere se a porta que a receita declara bate com a forma da peça. O
resolvedor encaixa no centro e no eixo declarados, e a relação compara porta
com porta, então uma porta posta alguns milímetros fora da face passa, e só o
crítico a pegaria se aparecesse na imagem. O plano anterior anotou que isso
precisa estar resolvido antes de a segunda leva de partes começar.

A referência não deixa medir proporção nem posição. A prancha da lateral do
braço, traçada à mão em 2026-09-24 com retângulos lidos a olho na
`lateral.png`, foi julgada pela pessoa inútil para conferir proporção e posição,
porque o contorno carrega o erro de quem leu a imagem. `prancha-referencia.mjs`
já lê um PNG, mas só extrai o envelope de cima e de baixo por coluna, e perde
toda parte que se sobrepõe a outra na mesma coluna, como o antebraço sobre o
punho.

O objeto montado não sai do repositório. Os três exportadores, `exportar`,
`exportar:step` e `exportar:obj`, recebem uma receita de cada vez e não leem
montagem, então as partes sairiam sozinhas, todas na origem.

## Resultado

O braço robótico fica inteiro, parte por parte, pelo laço de modelagem, com a
porta de cada parte conferida contra a forma dela, o contorno das referências
tirado da própria imagem e o objeto montado exportado com cada parte na
posição.

## Alinhado com a pessoa

Decidido em 2026-09-25: fechar o plano do laço, abrir este para as partes
restantes do braço e trazer para ele a exportação do objeto montado e o plano
congelado [o contorno sai da imagem](#o-contorno-sai-da-imagem), que ficou
guardado como candidato a vir logo depois do laço.

Continuam valendo as regras do laço: uma etapa por vez, modelador novo por
etapa, crítico sem a história da construção, parada para a pessoa ao fim de
cada etapa, e etapa com defeito em aberto só passa por aceite humano.

## Incluído

- a conferência de que a porta declarada pela receita está na face, no centro
  e no raio que declara, medida na peça executada, com teste que reprova a
  porta deslocada;
- o comando que tira da imagem de referência o contorno de cada região, em
  milímetros, descrito abaixo;
- as partes restantes do braço, na ordem de montagem: `braco`, `anelCotovelo`,
  `cotovelo`, `anelAntebraco`, `antebraco`, `carcacaPunho`, `aneisPunho`,
  `garfoPunho` e `flange`, cada uma com o `PLANO` escrito na rodada de
  alinhamento dela;
- a exportação do objeto montado: o exportador pede ao resolvedor da montagem
  as partes já posicionadas e grava tudo junto. Se o braço sai como peça única
  ou como partes com a posição de cada uma é decidido com a pessoa antes da
  fatia começar.

## Excluído

- o cabo externo com as presilhas, fora por decisão da pessoa;
- o tato, que entra em plano próprio;
- porta que recebe várias peças de propósito, que só entra com caso real;
- modelar partes independentes ao mesmo tempo e aceitar partes pequenas em
  grupo, que só entram se o braço mostrar que fazem falta;
- o gerador de tubo por caminho e o estudo de ferramentas de forma, o limite de
  1000 ids por operação, o limite absoluto de 0,5 mm² da medida de contato e as
  normais suaves no OBJ. Continuam anotados no plano encerrado e entram aqui só
  se uma etapa parar por falta deles.

## O contorno sai da imagem

Trazido de `congelados/`, onde foi escrito e congelado em 2026-09-24.

Um comando recebe uma imagem de referência e a escala, e devolve em texto os
contornos de cada região da imagem, em milímetros, traçados pela própria
imagem, com a região nomeada pela pessoa ou pelo modelador. A prancha e a
conferência do modelo contra a referência passam a usar esse arquivo.

Os candidatos a testar são Potrace, que transforma imagem de duas cores em
contornos vetoriais e tem porte em JavaScript no npm, e OpenCV, que separa a
imagem por cor e contraste e acha o contorno de cada região, com versão em
JavaScript (`opencv.js`). Segment Anything recorta objetos quando a cor não
basta, mas é modelo pesado e só entra se o corte por cor falhar. A pesquisa
também levanta outros, como autotrace e os traçadores de bitmap de bibliotecas
de desenho.

O trabalho é comparar os candidatos na `lateral.png`, com a mesma pergunta
para todos: o contorno de cada parte bate com a borda da imagem, em pixels
medidos. Depois escolher um por medida, envolvê-lo num comando em
`tools/mecanifica/`, nomear as regiões, converter para milímetros pela escala
declarada e ligar o resultado a `conferir:referencia` e ao motor de prancha.
Guardar a imagem em texto sem perda, que foi discutido, não reduz o
repositório e fica fora; cor, sombra e acabamento continuam só na imagem; o
motor de prancha não é trocado.

Se nenhum candidato separar as partes que se sobrepõem na imagem, como o
tambor do ombro atrás da coluna, o contorno por região não basta e a pergunta
passa a ser segmentação por objeto, que é outro plano. Dependência que exige
serviço externo ou GPU não entra sem decisão da pessoa.

## Gate de saída

1. a porta deslocada da face é reprovada por medida, com teste fora do braço, e
   todas as portas do braço passam;
2. em cada parte visível da `lateral.png`, o contorno extraído fica a no máximo
   2 pixels da borda da imagem na maior parte do perímetro, medido, e o mesmo
   comando rodado duas vezes na mesma imagem devolve o mesmo arquivo;
3. a prancha feita com esses contornos é aceita pela pessoa como melhor que a
   linha de base desenhada à mão;
4. todas as etapas da montagem do braço fixas, por crítico ou por aceite
   humano, com as juntas passando;
5. o braço montado exportado, e o arquivo aberto de novo com cada parte na
   posição da montagem;
6. os gates verdes ao fim de cada fatia.

## Arquivos reservados

`procedural/pecas/braco-robotico/`, `tools/mecanifica/` no que for comando
novo de contorno ou exportação, os três exportadores e o resolvedor da
montagem no que a exportação precisar.

## Fatias

1. **A porta confere com a forma.** Medida e teste, e as portas das três
   partes fixas conferidas. Porta que reprovar volta a etapa dela.
2. **O contorno sai da imagem.** Pesquisa dos candidatos, ensaio medido na
   `lateral.png`, comando e uso pela prancha e por `conferir:referencia`, com a
   pessoa julgando a prancha nova ao lado da antiga.
3. **As partes restantes.** Rodada de alinhamento e laço de cada parte, na
   ordem de montagem, com o contorno da fatia 2 servindo à medida de
   proporção.
4. **O braço sai montado.** Decisão com a pessoa sobre peça única ou partes
   posicionadas, e o exportador lendo a montagem.

## Feito na fatia 1

`src/autoria/porta-confere-forma.js` mede, na peça executada, se a face de onde
cada porta sai está no plano declarado e se a parte chega ao raio declarado
junto desse plano, numa faixa de 10 mm que deixa passar chanfro e filete de
borda. O núcleo passou a devolver, fora da serialização, as faces de cada
porta. `guarda:acervo` roda a conferência em toda peça do acervo e reprova
porta fora da forma. O teste reprova a porta 3 mm fora do plano e a de raio
2 mm maior, e as portas da base, do anel da cintura e do ombro passam.

## Andamento da fatia 2

Ensaio de 2026-09-25 na `lateral.png`: o Potrace e o OpenCV traçam a silhueta
a até 2 px da borda em 99,9% e 100% do perímetro, mas o Potrace só separa por
limiar de cor, não distingue partes do mesmo cinza e é GPL. O escolhido foi o
OpenCV, que separa as partes pelas bordas de sombra da imagem.
`npm run contorno` (`tools/mecanifica/contorno-da-imagem.mjs`) recebe a imagem
e um arquivo de regiões com duas âncoras e um ponto dentro de cada parte, e
grava o contorno de cada parte em pixel e em milímetro, igual a cada execução.
Na `lateral.png`, base, caixa lateral, braço, cotovelo e antebraço ficam a até
2 px da borda em 99,6% a 100% do perímetro. A imagem não separa as partes que
não têm borda entre si: o antebraço sai junto da carcaça do punho, o topo do
cotovelo sai separado da faixa de baixo dele, o ombro fica dentro do braço e
os anéis escuros se partem em pedaços pequenos. Falta ligar o arquivo ao
`conferir:referencia` e à prancha, e a pessoa julgar o desenho.

## Riscos e parada

Partes corretas sozinhas e erradas juntas: a etapa confere encaixe, e não
proporção. Se isso aparecer, a proporção entre partes vira campo do `PLANO` e
conferência da etapa, e o contorno da fatia 2 é a medida. O risco que obriga
parar é o braço exigir que duas partes se ajustem uma à outra ao mesmo tempo:
isso é solver, e vira plano próprio.

## Fechamento

Preencher somente ao concluir ou cancelar.
