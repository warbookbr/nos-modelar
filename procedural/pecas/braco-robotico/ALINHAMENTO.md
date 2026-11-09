# Braço robótico — rodada de alinhamento

Registro da rodada conduzida com a pessoa em 2026-09-23, pela skill
`alinhar-modelagem`. É a fonte do `PLANO` das partes e da montagem v5 do braço,
que ainda serão escritos; enquanto não forem, o combinado vive aqui, e não na
conversa. As imagens de referência estão em `referencias/`: `lateral.png`, a
vista inteira de lado, `cotovelo.png` e `punho.png`, os detalhes.

## Como funciona e em que ordem se monta

O braço é um manipulador de juntas rotativas, montado de baixo para cima, e
cada parte se prende na anterior. A base fica presa no chão, com uma caixa
colada no lado esquerdo. Sobre ela, o anel da cintura gira tudo o que está
acima em torno do eixo vertical. O ombro, o volume redondo na parte baixa da
coluna, é uma junta de eixo horizontal que levanta o braço. A coluna sobe do
ombro até o cotovelo, com um anel de giro no alto. O cotovelo, topo arredondado
com um anel saindo de lado, é outra junta de eixo horizontal, e dele sai o
antebraço, que termina numa carcaça mais larga. O punho desce dessa carcaça,
com anéis de giro e uma articulação em garfo, e termina no flange onde se
prende a ferramenta.

A ordem de montagem é a ordem das etapas de construção: `base` com
`caixaLateral`, `anelCintura`, `ombro`, `braco`, `anelCotovelo`, `cotovelo`,
`anelAntebraco`, `antebraco`, `carcacaPunho`, `aneisPunho`, `garfoPunho` e
`flange`. As três primeiras etapas, que são o recorte do plano ativo, são
`base` (com `caixaLateral`), `anelCintura` e `ombro`.

## Escala

O diâmetro da base, 210 mm (180 mm até a pessoa alargar a base, como está
registrado em "Depois da rodada"). A base aparece inteira na vista lateral e é a
primeira etapa, então a escala sai de onde a construção começa. O alcance
horizontal ficou de fora como escala porque, na tentativa anterior, a leve
perspectiva da imagem o fez divergir da tabela.

## Partes

| nome | o que é |
|---|---|
| `base` | o bloco preso no chão |
| `caixaLateral` | a caixa colada no lado esquerdo da base |
| `anelCintura` | o anel escuro em cima da base |
| `ombro` | o volume arredondado na parte baixa da coluna |
| `braco` | a coluna vertical |
| `anelCotovelo` | o anel escuro no alto da coluna |
| `cotovelo` | o topo arredondado |
| `anelAntebraco` | o anel escuro que sai de lado do cotovelo |
| `antebraco` | o segmento horizontal |
| `carcacaPunho` | a carcaça mais larga na ponta do antebraço |
| `aneisPunho` | os anéis escuros que descem da carcaça |
| `garfoPunho` | a articulação em garfo do punho |
| `flange` | o disco com oito furos em círculo e um furo central |

Os anéis escuros são corpos próprios, e não pintura: na tentativa anterior
viraram degrau entre cilindros e o braço perdeu a leitura de robô.

O cabo externo, com as presilhas, fica de fora por decisão da pessoa. Ele é
curva livre presa por presilha, e não encaixe por porta, e pode entrar depois,
até com o braço já homologado.

## Grau de realismo

Todos os corpos com o acabamento trabalhado, e não volumes simples. O
acabamento combinado, lido na referência junto com a pessoa:

- as carcaças cinzas têm as quinas arredondadas, com filete, e nenhuma aresta
  viva;
- os anéis escuros têm duas faixas separadas por uma ranhura, e as bordas com
  chanfro estreito, com as bordas do chanfro levemente suavizadas;
- as orelhas do cotovelo e do punho têm a face lateral plana no centro,
  cercada por um chanfro largo, com as duas bordas do chanfro suavizadas;
- a coluna, `braco`, é achatada dos lados: a face lateral é plana, com cantos
  bem arredondados no alto e a parte de baixo acompanhando o volume do ombro,
  cercada pelo mesmo chanfro de bordas suavizadas das orelhas. Não é peça
  separada: não tem fresta, parafuso nem mudança de cor.

Filete é a quina arredondada; chanfro é a quina cortada reto, em ângulo. O
plano diz a forma, e o modelador escolhe a técnica.

## O que o plano de cada parte diz

Combinado com a pessoa: o plano diz o quê, de forma medível, e o modelador
decide o como. Para cada parte, o plano traz para que ela serve e onde fica; a
forma, dizendo se é revolução ou perfil, onde a seção muda e onde a aresta é
quebrada; as medidas principais em milímetros, herdadas da escala; as portas
que ela publica, com nome, forma e direção, porque a parte seguinte nasce
delas; qual porta dela encaixa em qual porta da vizinha, e com que folga; e o
que reprova a parte, em frases verificáveis olhando. O plano não traz passo a
passo de operações, coordenadas de posição nem código.

## Forma das três primeiras partes

As medidas são lidas na vista lateral pela escala, cerca de 1,76 mm por pixel,
e têm erro de uns 10% por causa da perspectiva. Trocar um valor na tabela da
receita ajusta o resto.

`base`: corpo cilíndrico de revolução em torno do eixo vertical, com 210 mm de
diâmetro e cerca de 200 mm de altura, apoiado no centro de um pé que é uma
placa quadrada de cantos arredondados, com cerca de 230 mm de lado e 20 mm de
altura; as pontas do pé aparecem nos dois lados da vista lateral. Quinas com
filete no topo do corpo e na borda do pé. Publica em cima o assento onde o
`anelCintura` encaixa.

`caixaLateral`, na mesma etapa da base: caixa de cantos arredondados colada no
lado esquerdo do corpo, apoiada no pé, com cerca de 190 mm de altura e 50 mm de
saída, e um pequeno detalhe (botão ou conector) na face de fora.

`anelCintura`: o anel escuro entre o topo da base e o ombro, em parte escondido
atrás do ombro nas três imagens; por ser de revolução, a parte visível basta.
Continua parte própria, e o ombro começa em cima dele.

`ombro`: a peça que assenta em cima do `anelCintura`, gira com ele em volta do
eixo vertical e carrega a junta do ombro, de eixo horizontal. A forma é a de um
cotovelo de cano, proposta pela pessoa num rascunho feito no Blender: um
pescoço cilíndrico vertical, baixo, que sai do anel e faz uma curva de 90° até
ficar horizontal, com o lado de fora da curva arredondado; na ponta
horizontal, um tambor grosso, bem mais largo que o tubo, cuja face redonda é o
volume que a foto mostra atrás da coluna e onde o `braco` se prende. O pescoço
é baixo porque na foto o tambor quase encosta no anel, e porque distância maior
aumenta a alavanca sobre a cintura; o tambor é grosso porque guarda o motor e a
redução da junta. A parte de trás do ombro não aparece em nenhuma das três
imagens, então essa forma é decisão da pessoa, e não leitura da referência: um
cilindro em pé com outro deitado por cima daria a mesma foto de lado. O
rascunho dela está em `referencias/ombro-rascunho-lado.png`,
`ombro-rascunho-tras.png`, `ombro-rascunho-frente.png` e
`ombro-rascunho-perspectiva.png`, e é o alvo para a parte que a foto não
mostra.

O `ombro` publica embaixo o encaixe no assento do `anelCintura`, no eixo
vertical, e na face do tambor uma porta cilíndrica de eixo horizontal, onde o
`braco` se prende e gira. A coluna fica, por isso, deslocada para a frente do
eixo da cintura, e não em cima dele, como a foto mostra.

## Encaixes das três primeiras partes

Nas fotos as peças encostam sem fresta visível, então nenhum encaixe tem folga
de aparência. Cada medida de encaixe vem da porta da peça anterior, por vínculo
da montagem v5, e a posição vem do encaixe de porta; nenhum desses números é
digitado na receita.

`anelCintura` na `base`: senta no topo da base, no mesmo eixo vertical, com o
mesmo diâmetro dela, acréscimo zero, sem fresta.

`ombro` no `anelCintura`: o pescoço sai de cima do anel, no mesmo eixo vertical,
com diâmetro 20 mm menor que o do anel, cerca de 160 mm, sem fresta. A medida
vem mais do rascunho da pessoa do que da foto, onde quase não aparece pescoço.

`caixaLateral` na `base`: encostada no corpo cilíndrico, no lado esquerdo,
apoiada no pé, com altura 10 mm menor que a do corpo, porque na foto ela termina
um pouco antes do topo; sem fresta.

A porta que fica pronta para a etapa seguinte é a face do tambor do `ombro`, de
eixo horizontal, com o diâmetro do tambor, onde o `braco` se prende.

## O que reprova cada parte

`base`, com a `caixaLateral`: o corpo não é redondo visto de cima, ou o pé não
é quadrado de cantos arredondados; alguma quina viva no topo do corpo ou na
borda do pé; a caixa solta do corpo, com fresta, ou flutuando acima do pé; a
caixa do lado errado, porque na vista lateral da foto ela fica à esquerda.

`anelCintura`: diâmetro diferente do da base, formando degrau na junção;
mais alto que uma faixa estreita, ou com ranhura no meio, que era a leitura
antiga, corrigida pela pessoa; bordas vivas, sem o chanfro estreito; fresta
visível entre o anel e a base; o anel na cor da carcaça, quando ele é escuro e
as carcaças são cinza-claras.

`ombro`: tambor fino como chapa, em vez de grosso; pescoço alto, deixando o
tambor visivelmente afastado do anel; face do tambor que não aponta para a
frente, com o eixo do ombro fora da horizontal ou girado para o lado errado;
curva de 90° com canto vivo por fora; ombro fora do eixo vertical da cintura.

## Depois da rodada

O pé passa só 10 mm além do corpo, e a caixa sai 50 mm; a pessoa decidiu que a
caixa se apoia no pé só na parte que está sobre ele e passa da borda do resto.

O `PLANO` de cada parte está na receita dela, em `partes/`, e a montagem v5 em
`montagem.json`. A largura da caixa na direção Z não aparece em nenhuma imagem;
começou em 90 mm e, vista de cima na rodada 1, a pessoa decidiu 120 mm; a altura do anel e as medidas do tambor foram lidas na foto com o
erro dito acima. As junções de apoio usam `assentaAnular`, que reprova fresta
não declarada.

Na rodada 1 da base o crítico leu o corpo um pouco alto e o pé sobrando à
direita. A pessoa manteve as duas medidas: corpo de 200 mm e pé centrado.

Vendo a base e o anel montados, em vista ortográfica, a pessoa achou o conjunto
estreito e decidiu alargar: o corpo da base passa de 180 para 210 mm de
diâmetro, e o pé de 200 para 230 mm de lado. O anel acompanha pelo vínculo, e a
caixa acompanha o raio do corpo. A escala do braço continua sendo o diâmetro da
base, agora 210 mm.

Vendo a montagem ao lado de recortes da referência, a pessoa corrigiu três
leituras. O anel da cintura é só a faixa escura fina logo acima da base, com
cerca de 25 mm, uma faixa só; a faixa lisa acima dele, depois de uma divisão
escura, já é o pescoço do ombro. O pescoço tem o mesmo diâmetro do anel, e não
20 mm a menos como estava combinado, e sobe reto uns 30 mm antes da curva; o
tambor e a posição do eixo do ombro serão lidos de novo com a pessoa quando a
etapa do ombro começar, porque os números de antes supunham um pescoço mais
fino. Na base, a quina do topo abria um sulco na junção com o anel e passa a
ter só um chanfro pequeno, e o pé avança à esquerda por baixo da caixa até o
meio dela, que é o que a referência mostra.

Os números do ombro foram relidos com a pessoa na escala nova e conferidos num
esboço de cilindros montado sobre a base e o anel: tambor de 240 mm de diâmetro
e 80 mm de espessura, eixo do tambor 120 mm acima do topo do anel, face da
frente 150 mm à frente do eixo da cintura, apontando para +Z. A pessoa chegou a
pedir o tambor virado para a direita e voltou atrás ao ver que a foto mostra a
face dele como círculo e que a junta gira o braço no plano da foto.

O ombro em cotovelo de cano foi reprovado pela pessoa depois de três rodadas.
A curva do tubo, com raio menor que o do próprio tubo, dobrava a parede de
dentro, e o pescoço aparecia por baixo do tambor perto do anel; a rodada 3
achou isso e aparou a parede, mas sobraram degrau e lâmina à vista. A pessoa
também achou a traseira toda curva lisa demais para um braço industrial.

A forma nova vem de um segundo rascunho da pessoa, em
`referencias/ombro-rascunho2-*.png`, validada como plausível: um colar
cilíndrico de 30 mm com o diâmetro do anel e chanfro no topo, que se funde
visualmente com o corpo; um corpo com planta em D, reto e plano na frente,
onde a junta se monta, e redondo atrás no raio do colar, para não varrer área
fora da cintura ao girar; topo plano a 240 mm e uma rampa abaulada descendo
atrás até 120 mm. O tambor passou a ser um disco fino e largo, 300 mm de
diâmetro e 40 mm de espessura, encostado na face plana do bloco com o eixo a
135 mm, para cobrir as quinas da face quadrada vista de frente. A face do bloco
fica 20 mm além do colar, a 125 mm do eixo da cintura. As medidas foram
conferidas num esboço montado sobre a base e o anel. A técnica prevista para o
corpo é `inflate`, o cruzamento da planta com a silhueta lateral.

Na rodada 3 do ombro novo, as quinas de baixo da face do bloco apareciam
embaixo do tambor, porque 300 mm de diâmetro com o eixo a 135 mm cobria a quina
por só 2 mm. Por recomendação aceita pela pessoa, o tambor passa a 320 mm, e o
bloco continua avançando 20 mm além do colar, como no rascunho. Foi testado
também um ombro em "T" no estilo dos braços colaborativos, com um cilindro
deitado sobre o colar; a pessoa ficou com o próprio desenho, porque o "T" deixa
uma linha de divisão muito visível no encontro dos dois cilindros e lê como uma
bola sobre um tubo.

## Proporção do ombro, 2026-11-03

A pessoa abriu o braço na bancada e achou o ombro grande demais para o conjunto: a seção de cima tinha 220 mm, mais que a base, o topo ficava a 250 mm do anel da cintura contra cerca de 177 mm na referência, e o anel da junta tinha 231 mm para uma coluna de 158 mm. Ela viu três tamanhos desenhados sobre a mesma base, com a coluna da referência presa no anel da junta (`referencias/ombro-proporcao.png` e `referencias/ombro-proporcao-frente.png`), e escolheu a opção B: seção de 190 mm, eixo da junta a 115 mm do anel da cintura e topo a 210 mm. A forma em L, com o pé redondo no diâmetro do anel da cintura e a saída redonda com o anel fino, continua a mesma.

Na mesma conversa ela apontou marcas no canto de baixo do encontro entre a parte de pé e a deitada, perto do anel: a saída redonda é 5% maior que a seção quadrada, sobra por baixo dela e bate na frente da parte de pé numa quina viva, e o sombreamento suave sobre os triângulos longos da emenda faz degraus de sombra. O ombro refeito não pode ter quina viva nem degrau de sombra nesse encontro, conferido na luz rasante.

Depois da rodada 9, que tirou o degrau em L e deixou o ombro como bloco sobre um prato fino, a pessoa viu três imagens no tamanho B, o desenho antigo, o desenho antigo com a saída redonda na largura do bloco e a rodada 9, e escolheu o do meio: o desenho que ela aceitou em 2026-09-29, com o degrau em L e o pé redondo, no tamanho B, com a saída redonda do diâmetro da largura do bloco, que não sobra por baixo. Ela pediu também para melhorar a faixa junto ao anel em que o bloco quadrado vira redondo, onde aparecem facetas e um sombreado torcido.

## A coluna, 2026-11-03

A coluna (`braco`) veio depois do ombro fixo. A pessoa viu em esboço a coluna como placa achatada pendurada à frente do anel da junta e achou estranha a parte de baixo, e pediu que a saída de cima fosse cilíndrica para casar com o anel do cotovelo. Viu então a coluna que engrossa de 100 mm no pé até um cilindro de 156 mm no topo, que de lado afunila, e escolheu a coluna redonda e reta (`referencias/coluna-reta.png` e `referencias/coluna-reta-lado.png`, opção 3): um cilindro de 156 mm de diâmetro do pé ao topo, com 477 mm de altura do fundo do pé ao topo, que é a altura da referência. O pé é redondo em volta do eixo da junta do ombro, do diâmetro da coluna, encostado na face do anel da junta, e a coluna gira em volta desse eixo; ela fica à frente do ombro, como na foto. O topo é a face onde assenta o anel do cotovelo, de cerca de 160 mm de diâmetro, de eixo vertical. A coluna e o pé são uma peça só, sem fresta, parafuso nem mudança de cor, com o acabamento de bordas suavizadas das carcaças.

## O encaixe do ombro no anel da cintura, 2026-11-04

O ombro assentava no anel da cintura (210 mm, o diâmetro da base) com a frente do pé redonda e a traseira quadrada, e as duas quinas de trás passavam 29 mm além do anel. A pessoa viu três opções desenhadas de cima (`referencias/ombro-encaixe.png`): como estava, a traseira redonda em meia-lua e as quinas de trás arredondadas em 60 mm. Testou a traseira redonda e achou o formato estranho para um ombro, e escolheu as quinas arredondadas, que mantêm o bloco. Com 60 mm elas ainda passavam 4 mm do anel, e a pessoa viu o ombro sobrando nesse canto; com 75 mm ficam 1,7 mm para dentro dele, e a pessoa aprovou a forma sem passar pelo crítico. A parte de pé e a parte deitada levam o mesmo arco das quinas em planta, e o canto de cima da parte deitada continua redondo no raio dos cantos ao longo da quina, sem achatar.

## O anel do cotovelo e o cotovelo, 2026-11-08

O anel do cotovelo não é junta: num braço de seis eixos desse estilo só a cintura gira em torno do eixo vertical, e as seis rotações são a cintura, o ombro, o cotovelo e as três do punho. O `anelCotovelo` é um colar fixo entre a coluna e o cotovelo, reto e perpendicular à coluna; a inclinação que a prancha mostra é a borda do cilindro vista um pouco de cima na foto. A pessoa o quis rente à coluna, com 156 mm, como os outros anéis são rentes ao que os recebe, com 48 mm de altura na prancha e baixado a 25 mm, como o anel da cintura, a pedido dela, o chanfro estreito de 2 mm e escuro.

O cotovelo é limpo, como a base, e não carregado de detalhe, como o ombro. Entre três formas esboçadas (`referencias/cotovelo-opcoes.png`), a pessoa escolheu a do tubo de 156 mm em pé, saindo do colar, cruzado no alto por outro de 156 mm deitado no eixo da junta, com 175 mm de comprimento (depois alongado a 190, a pedido dela), e pediu a ponta de trás do tubo deitado rente às costas do tubo em pé, sem o degrau de 9,5 mm que ele fazia centrado (`referencias/cotovelo-opcao3.png`). O topo fica a 195 mm do colar e o eixo da junta a 117 mm; a saída, na frente do tubo deitado, publica o encaixe redondo do anel do antebraço. O corpo é uma malha única pela gaiola, como a coluna, com a concordância no encontro dos dois tubos e o chanfro de 2 mm nas bordas das tampas. As orelhas de face plana com chanfro largo do grau de realismo acima deixam de valer para o cotovelo, que não as tem.

Reprova: colar inclinado, oval ou mais largo que a coluna; degrau entre a coluna, o colar e o tubo em pé; a ponta de trás do tubo deitado além das costas do tubo em pé; quina viva ou faixa de sombra no encontro dos dois tubos; saída fora do eixo do tubo deitado; o cotovelo mais alto que 195 mm ou mais largo que 175 mm.

## A saída do cotovelo e o antebraço, 2026-11-09

A pessoa fez no Blender um rascunho da saída, com o tubo deitado do cotovelo um pouco mais longo, o anel e o antebraço, e viu que o chanfro largo do anel, tirado da prancha, afinava demais a peça seguinte. Entre três anéis esboçados (`referencias/saida-cotovelo-anel.png`), escolheu o anel único de 25 mm, rente aos 156 mm do tubo deitado, como o colar e o anel da cintura, com o chanfro estreito de 2 mm dos anéis; a junta de 24 mm e o anel de 69 mm da prancha viram esse anel só. Entre três seções do antebraço (`referencias/antebraco-opcoes.png`), escolheu o tubo de 156 mm, sem redução depois do anel. O tubo deitado do cotovelo passou de 175 a 190 mm, um alongamento pequeno que ela deixou à escolha de quem conduz. Ela acha que os tubos de 156 podem ficar finos para um braço, e isso fica para depois, com o braço montado.

## O eixo da junta do cotovelo, 2026-11-09

Com o antebraço montado, a pessoa conferiu os eixos: a cintura gira em torno do vertical, o ombro em torno de um eixo horizontal para a frente, e o cotovelo, num braço desse tipo, tem o eixo paralelo ao do ombro, para o antebraço subir e descer no plano em que a coluna inclina. A saída do cotovelo tinha sido tirada da prancha apontando para o lado do antebraço, e o anel só girava o antebraço em torno dele mesmo; o braço não dobrava. A correção, vista em `referencias/cotovelo-eixo.png` e aprovada por ela, faz o cotovelo espelho do ombro: o tubo deitado com o eixo para a frente, paralelo à junta do ombro, de 190 mm e a ponta de trás rente às costas do tubo em pé; o anel de 25 mm na face da frente dele; e o antebraço preso no anel como a coluna no ombro, um pé redondo de 156 mm deitado no eixo da junta e o tubo de 156 mm e 253 mm saindo dele para a direita. O alinhamento passou a perguntar o eixo de cada junta em relação à anterior.

O lado da saída do cotovelo foi escolhido pela pessoa entre duas opções vistas de cima (`referencias/cotovelo-lado.png`): o lado oposto ao da saída do ombro. O ombro leva a coluna para a frente da base e o cotovelo traz o antebraço de volta para trás, perto da linha da base, como nos braços desse tipo, e o peso fica sobre a cintura. A ponta rente do tubo deitado passa a ser a da frente, rente à frente do tubo em pé, e a saída aponta para trás.

## A saída do colar, 2026-11-09

O `anelCotovelo` sai do braço porque os anéis escuros marcam juntas que giram e o colar do cotovelo não gira. A coluna cresce 25 mm no lugar dele, de 477 para 502 mm do fundo do pé ao topo, e o cotovelo assenta direto na porta `topo` da coluna, com o raio vindo dela. O topo do cotovelo e o antebraço ficam na mesma altura de antes.

## Tubos de 190 mm do ombro ao punho, 2026-11-09

A pessoa comparou o braço com tubos de 156 e de 190 mm e escolheu 190, o diâmetro do anel do ombro, para o braço ficar robusto e com um diâmetro só do ombro ao punho. A coluna, o cotovelo, o anel do antebraço e o antebraço passam a 190 mm, o raio vem das portas da montagem e o cotovelo sobe 17 mm (o topo vai de 195 a 212 mm). Duas medidas acompanharam o diâmetro para as portas continuarem dentro da forma: o pé do antebraço passa de 176 a 210 mm de espessura (o diâmetro mais os mesmos 20 mm de recuo; com 205 ou menos a porta `apoio` reprova) e o tubo deitado do cotovelo passa de 190 a 210 mm de comprimento (com 208 ou menos a porta `saida` mede o tubo em pé).

## A coluna e o cotovelo viram uma peça, 2026-11-09

A pessoa decidiu que a coluna e o cotovelo são o braço superior, rígido da junta do ombro à junta do cotovelo, e passam a ser uma peça só (`braco`), numa malha única, porque os chanfros de 2 mm das duas bordas do encontro faziam um sulco. A forma de fora não muda: o pé redondo de 190 mm no eixo da junta do ombro, o tubo vertical de 190 mm até o eixo do cotovelo (502 mm do fundo do pé ao topo da coluna e 117 mm até o eixo) e, no alto, o tubo deitado de 210 mm com a ponta da frente rente à frente do tubo vertical e a saída para trás; a posição da `saida` no mundo e a altura total de 619 mm são as de antes. A peça é feita de três `lathe` unidos por `unir`, com as costuras em `arredondarCostura` de raio 10 e 144 lados e o chanfro de 2 mm só nas tampas de fora. A porta `topo` saiu, a `juntaNoOmbro` ficou e a `saida` passou a ser publicada pelo `braco`, onde o anel do antebraço assenta; a pasta do cotovelo e a instância dele na montagem foram apagadas. Duas escolhas de receita acompanharam o núcleo: a tampa da frente do tubo deitado passa 0,05 mm da frente do tubo vertical, porque com as duas exatamente rentes o `unir` deixa uma fresta de 8 mm de corda no plano da tampa, e a parte `pe` termina 70 mm acima do eixo do ombro, porque o filete do encontro do pé com o tubo vertical sobe até 102 mm do eixo junto da face de trás e a conferência da porta `juntaNoOmbro` mede o raio na parte inteira da face dela. As partes `pe`, `coluna` e `cotovelo` são regiões da mesma malha: `pe` até 70 mm de altura, `cotovelo` a partir do eixo do cotovelo e `coluna` o resto.

## O punho, 2026-11-09

A pessoa confirmou a função do punho como nos braços desse tipo: a junta 4 na ponta do antebraço, com o eixo paralelo ao do cotovelo e ao do ombro; a junta 5 com o eixo vertical, perpendicular à 4; e a junta 6 no flange, com o eixo perpendicular à 5. Cada junta tem o seu anel escuro de 25 mm, rente ao que o recebe. Entre o punho com 190 mm e com 135 mm, a altura da carcaça na prancha (`referencias/punho-diametro.png`), ela escolheu 135 mm.

As peças seguem a regra do braço superior, uma peça rígida entre duas juntas: a carcaça da junta 4 é um tubo deitado de 190 mm de diâmetro e 190 de comprimento (escolha da pessoa, para o tubo do antebraço ficar rente ao anel, feita depois de corrigida a conferência de porta), no eixo paralelo ao do cotovelo, na ponta do antebraço, e faz parte da peça do antebraço, como o cotovelo faz parte do braço superior; o anel da junta 4 (135 mm) fica na face da frente dela, e o degrau de 190 para 135 acontece nele. O elo da junta 4 é um pé de 135 mm no eixo da junta com um tubo de 135 mm descendo na vertical, como a coluna no ombro; o anel da junta 5 (135 mm, eixo vertical) fica embaixo dele. O elo da junta 5 é um tubo deitado de 135 mm, com o eixo perpendicular ao da junta 5, encostado embaixo do anel; o anel da junta 6 (135 mm) fica na face da frente dele, e o flange, um disco de 154 mm por 43 mm, nele. As medidas de comprimento são as do esboço e podem ser ajustadas com o punho montado.
