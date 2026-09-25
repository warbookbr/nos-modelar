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
