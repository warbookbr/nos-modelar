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

O diâmetro da base, 180 mm. A base aparece inteira na vista lateral e é a
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

`base`: corpo cilíndrico de revolução em torno do eixo vertical, com 180 mm de
diâmetro e cerca de 200 mm de altura, apoiado no centro de um pé que é uma
placa quadrada de cantos arredondados, com cerca de 200 mm de lado e 20 mm de
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

## Ainda em aberto nesta rodada

Os critérios de reprovação das três primeiras partes, e escrever o `PLANO`
das receitas e a montagem v5 a partir deste registro.
