# O braço inteiro

**Estado:** concluído

**Responsável:** Tiago (autoria) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-mecanifica`, base `e6af1190` na main.

## Problema observado

O plano [o laço constrói parte por
parte](2026-09-23-o-laco-constroi-parte-por-parte.md) fechou com as
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

Os candidatos eram Potrace e OpenCV (`opencv.js`), com Segment Anything só se
o corte por cor falhasse, e a pesquisa levantaria outros.

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
3. **O fluxo do objeto.** Um contrato único de como um objeto é
   desenvolvido, com cada etapa declarando quem faz, o que entra, o que sai e
   em que pasta fica, e uma ferramenta que diz a próxima etapa do objeto, como
   `rodada-de-modelagem --acao` já diz a da peça. Descrito abaixo.
4. **As partes restantes.** Rodada de alinhamento e laço de cada parte, na
   ordem de montagem, já pelo fluxo da fatia 3.
5. **O braço sai montado.** Decisão com a pessoa sobre peça única ou partes
   posicionadas, e o exportador lendo a montagem.

## O fluxo do objeto

Decidido com a pessoa em 2026-09-25. As ferramentas de mapa de partes, prancha e
modelagem nasceram uma de cada vez, cada uma numa conversa, e nada diz em que
ordem entram nem quem recebe o quê. As etapas, na ordem em que o objeto é
produzido:

1. **Alinhamento.** Partes, escala, ordem de montagem e o que fica fora do
   modelo, com a pessoa (`alinhar-modelagem`).
2. **Mapear as partes.** O `desenhador-de-contorno` põe as sementes e o
   `critico-visual` julga pelo roteiro: nota 9 fecha, abaixo volta, até três
   rodadas, e depois a pessoa decide (`contorno-da-imagem`).
3. **Prancha.** Um agente de prancha decide o que o comando não sabe: as cotas
   que importam em cada parte, a conferência da calibração e se parte escondida
   aparece tracejada. Um crítico julga com a mesma regra de nota 9 e três
   rodadas. Sem esse trabalho definido, o crítico aprovaria uma cópia do
   contorno.
4. **Modelagem por etapa.** O laço de modelagem de cada parte, com o
   modelador e o crítico recebendo o mesmo pacote de referência.
5. **Aceite da pessoa.** Por crítico ou por aceite humano, como hoje.

O pacote de referência é entregue ao modelador e ao crítico em três imagens,
nesta ordem: a imagem de referência, a prancha limpa, que dá a forma e as
partes com medida, e o mapa de partes com as folhas de divisa, que dá a
divisa entre as partes e o detalhe. A ordem de entrega é diferente da de produção, porque
a prancha sai dos contornos do mapa de partes, e o contrato registra as duas.
Entregar as três ao crítico não fere a regra de não contar como a peça foi
feita: elas vêm da referência, e não da construção.

O contrato fica em `docs/mecanifica/usar/`, e cada etapa tem saída em arquivo
na pasta do objeto, para a ferramenta da próxima etapa ler do disco o estado
em que o objeto está.

## O ombro novo

Decidido com a pessoa em 2026-09-25. A vista frontal do braço inteiro
(`referencias/frontal.png`) mostra o ombro mais simples que o fixado, um bloco
de topo arredondado com um anel, e mais coerente com o resto do desenho. O
ombro será refeito por essa vista, e a etapa `ombro` volta a ficar aberta
quando o laço dela começar. O ombro fixado fica guardado como variação em
`partes/ombro-tambor`, com as rodadas dele, e a montagem continua apontando
para `braco-robotico/ombro`. Antes do laço, a vista frontal passa pelo
mapa de partes e pela prancha, e dela saem também as alturas do ombro e do braço
que a lateral esconde.

A pessoa apontou nos mapas peças que a lista não tinha: `anelOmbro`,
`juntaCotovelo` (ao lado do cotovelo, de onde sai o antebraço),
`anelTampaPunho` e `tampaPunho`, que entram na ordem de montagem.

A pessoa trouxe também uma vista lateral sem o cabo e já com o ombro novo
(`referencias/lateral-sem-cabo.png`). Ela passa a ser a lateral das partes
que faltam e do ombro refeito. A `lateral.png` fica como está, porque as
receitas já fixas e a variação `ombro-tambor` a citam.

Em 2026-09-26 a ampliação foi medida pela borda e pela silhueta reduzida à
escala original. O Real-ESRGAN em CPU não superou o vizinho mais próximo, e o
Gemini deslocou bordas em até 20 px ou inventou detalhe; nenhum foi adotado.

## Feito na fatia 1

`src/autoria/porta-confere-forma.js` mede, na peça executada, se a face de onde
cada porta sai está no plano declarado e se a parte chega ao raio declarado
junto desse plano, numa faixa de 10 mm que deixa passar chanfro e filete de
borda. O núcleo passou a devolver, fora da serialização, as faces de cada
porta. `guarda:acervo` roda a conferência em toda peça do acervo e reprova
porta fora da forma. O teste reprova a porta 3 mm fora do plano e a de raio
2 mm maior, e as portas da base, do anel da cintura e do ombro passam.

## Andamento da fatia 2

Ensaio de 2026-09-25 na `lateral.png`: Potrace e OpenCV traçam a silhueta a
até 2 px da borda em quase todo o perímetro, mas o Potrace só separa por cor e
é GPL, e o escolhido foi o OpenCV.
O primeiro corte, só por bordas de sombra, separou cinco partes e a pessoa o
julgou melhor em parte: juntava antebraço e carcaça do punho, deixava o ombro
dentro da coluna e partia os anéis escuros. O corte passou a ser por
watershed: `npm run contorno` (`tools/mecanifica/contorno-da-imagem.mjs`)
recebe a imagem e um arquivo de regiões com duas âncoras e uma semente, ponto
ou linha, dentro de cada parte, e cada semente cresce até a vizinha. Na
`lateral.png` as 13 partes e o cabo saem separados, com 81% a 100% do
perímetro a até 2 px da borda da imagem, e o resultado é igual a cada
execução. As sementes foram postas pela IA olhando a imagem. Com a pessoa ficou decidido em 2026-09-25 que o corte vira módulo, com fluxo
próprio. `modulos/contorno-da-imagem` faz a segmentação, o mapa de partes com
opacidade de 20%, o recorte ampliado de cada divisa com o original ao lado, a
medida de borda e as rodadas. A skill `contorno-da-imagem` conduz o agente
`desenhador-de-contorno`, que põe as sementes, e o `critico-visual`, que dá
nota: 9 ou mais fecha, abaixo disso volta ao desenhador, até três rodadas, e
depois a decisão é da pessoa. O zoom por divisa entrou porque três críticos
olhando a imagem inteira não viram uma ponta de 3 px da carcaça dentro do
antebraço, e a pessoa a achou pedindo o zoom. A primeira série de rodadas
na `lateral.png` parou em 8, 8 e 7 e foi à pessoa, e mostrou dois furos: o
crítico não lista pasta e abriu 2 e depois 9 dos 19 recortes, e a pintura
pelo polígono enchia de cor o fundo que uma região envolve. Os recortes
passaram a ir numa folha só, `divisas.png`, e a pintura passou a seguir a
máscara de cada região. A segunda série fechou com nota 9 na primeira
rodada. A folha única reduzia o zoom à metade, e o crítico passou a seguir
um roteiro gerado no pacote: uma etapa de visão geral, uma por folha de
divisas e o fechamento. Com até seis divisas cada uma tem etapa própria; com
mais, elas se agrupam para ficar perto de seis etapas, até seis por folha.
Pelo roteiro, o crítico conferiu as 19 divisas da lateral e deu nota 9.
Com a pessoa, em 2026-09-25, entrou o realce da divisa: contraste local e
nitidez aplicados só à imagem que o watershed usa, ligados por `realce` no
arquivo de regiões. Com uma semente por parte, ele levou o ombro e o anel da
cintura de cerca de 62% para 90% de concordância com o contorno aprovado.
Aumentar a resolução 3 vezes foi ensaiado e não adotado: o ESPCN em ONNX foi
o mais fiel (43,4 dB), mas nenhuma versão aumentada separou melhor que a
original com realce (83,4% de concordância).
A prancha passou a sair dos contornos:
`npm run contorno:prancha` desenha a vista lateral com a silhueta e cada
parte, sem coordenada digitada, e o motor de prancha mede o que desenhou. O
arquivo de regiões ganhou `foraDoModelo`, para a parte que só tem semente para
não ser engolida, como o cabo, sair da silhueta e da prancha. Falta ligar o
arquivo ao `conferir:referencia` e a pessoa julgar a prancha nova ao lado da
antiga.

## Riscos e parada

Partes corretas sozinhas e erradas juntas: a etapa confere encaixe, e não
proporção. Se isso aparecer, a proporção entre partes vira campo do `PLANO` e
conferência da etapa, e o contorno da fatia 2 é a medida. O risco que obriga
parar é o braço exigir que duas partes se ajustem uma à outra ao mesmo tempo:
isso é solver, e vira plano próprio.

## Fechamento

**Concluído em 2026-09-26 com as fatias 1, 2 e 3 entregues e o braço dividido
em outro plano.** O plano chegou ao limite de 300 linhas do `planos:check`, e a
pessoa decidiu fechá-lo aqui e levar as fatias 4 e 5 para um plano novo.

A fatia 1 entregou `src/autoria/porta-confere-forma.js`, que reprova a porta
fora do plano ou do raio declarado, rodando em toda peça do acervo por
`guarda:acervo`. A fatia 2 entregou `npm run contorno` e o módulo
`modulos/contorno-da-imagem`, que tiram o contorno de cada parte da imagem por
watershed com sementes nomeadas, e `npm run contorno:prancha`, que desenha a
prancha a partir desses contornos. A fatia 3 entregou o contrato
`docs/mecanifica/usar/FLUXO-DO-OBJETO.md` e `npm run objeto`: o mapa de
partes e a prancha passam por rodadas com crítico (`rodadas-com-critico.mjs`,
nota 9 fecha, até três rodadas), o mapa ganhou etiquetas, fonte e numeração, o
pacote de referência de cada imagem fica em `<nome>.pacote`, e o arquivo de
regiões aceita várias linhas de semente por parte. A pessoa julgou a prancha
tirada dos contornos melhor que a traçada à mão, e ela entrou como segunda
imagem do pacote. Ligar os contornos ao `conferir:referencia` foi adiado,
porque comparar parte a parte pede as partes posicionadas pela montagem.

As referências ganharam a frontal e a lateral sem cabo, o ombro fixado virou
a variação `ombro-tambor` e quatro peças novas entraram na lista, como
descrito em [o ombro novo](#o-ombro-novo).

## Plano sucessor

Iniciar [as partes do braço](../congelados/2026-09-26-as-partes-do-braco.md), que parte
dos mapas de partes da frontal e da lateral sem cabo e leva as fatias 4 e 5:
as partes restantes com o ombro refeito, a exportação do braço montado e a
ligação dos contornos ao `conferir:referencia`.
