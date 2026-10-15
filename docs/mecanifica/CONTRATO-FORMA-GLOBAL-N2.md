# Contrato de forma global N2

## Papel

Este contrato implementa a fatia N2 do plano ativo. Ele permite à IA declarar
um alvo mensurável, criar um andaime do objeto inteiro, compilar uma blocagem
neutra e decidir se a forma pode avançar. Não implementa superfície, detalhe,
decomposição, montagem ou regras de carro no núcleo.

## Fontes e derivados

São fontes editáveis:

- `mecanifica.alvo-forma-global@2`: envelope, landmarks, silhuetas, regiões
  obrigatórias, rejeições, limiares e orçamento;
- `mecanifica.andaime-global@2`: envelope pretendido, landmarks e volumes
  semânticos do objeto inteiro, e, quando declaradas, as portas que a receita
  detalhada precisa manter.

São derivados descartáveis:

- `mecanifica.blocagem-global@2`: triângulos neutros, envelope medido,
  procedência por volume/região e estatísticas;
- vistas SVG/PNG, máscaras de comparação, medições e decisões.

Índices de vértices e faces pertencem somente ao produto compilado. Identidade
autoral permanece nos IDs do alvo, andaime, landmark, volume e região.

## Vocabulário

A N2 aceita dez volumes globais. Todo volume declara `id`, `regioes`, `tipo` e
`centro`, e os campos abaixo, todos obrigatórios, sem nenhum extra. As medidas
estão em milímetro.

| Tipo | Intenção | Campos do tipo |
|---|---|---|
| `caixa` | massa retangular simples | `dimensoes` |
| `cilindro` | roda, eixo ou volume axial bruto | `eixo`, `raio`, `comprimento`, `segmentos` |
| `prisma` | perfil convexo extrudado num eixo | `eixoExtrusao`, `eixosPerfil`, `comprimento`, `perfil` |
| `casco-secoes` | casco convexo por seções ao longo de um eixo | `eixoPercurso`, `eixosSecao`, `secoes` |
| `cone` | cone ou tronco de cone | `eixo`, `raioBase`, `raioTopo`, `comprimento`, `segmentos` |
| `esfera` | cúpula, bola, volume arredondado | `raio`, `segmentos` |
| `anel` | flange, arruela, aro com furo passante | `eixo`, `raioExterno`, `raioInterno`, `espessura`, `segmentos` |
| `revolucao` | sólido de revolução de um perfil | `eixo`, `perfil` (`[raio, altura]`), `segmentos` |
| `extrusao` | perfil simples, convexo ou côncavo, extrudado num eixo | `eixoExtrusao`, `eixosPerfil`, `comprimento`, `perfil` |
| `tubo` | tubo por pontos com raio de curva | `caminho`, `raio`, `raioCurva`, `segmentos` |

Esse vocabulário não pretende modelar superfície final. Ele existe para provar
postura, silhueta, proporção e completude antes de investir em N3. As seis
últimas linhas são as primitivas do esboço, que `primitivas-forma-global.js`
valida e transforma em malha.

As primitivas seguem estas regras. O `centro` do cone, do anel e da revolução é o
meio do comprimento ao longo do eixo; na extrusão e no tubo é a origem dos pontos
do perfil e do caminho, como no prisma. O cone tem `raioBase` no começo do eixo e
`raioTopo` no fim, um deles pode ser zero, e raios iguais são recusados porque
formam um cilindro. A esfera tem os polos em y e `segmentos` múltiplo de 4, o que
põe o equador e os pontos cardeais em vértices e deixa o envelope exatamente
igual ao raio. O anel é oco, com `0 < raioInterno < raioExterno`, e a vista ao
longo do eixo mostra o furo. A revolução é maciça: o perfil sobe ao longo do
eixo, aceita degraus e cinturas, tem raio zero só nas pontas e mede as alturas a
partir do meio da faixa. A extrusão aceita qualquer polígono simples, sem ponto
repetido, sem área nula e sem arestas que se cruzem ou se toquem, em qualquer
sentido e em qualquer ordem de `eixosPerfil`; as tampas côncavas são
trianguladas por orelhas (`earcut`). O tubo varre uma seção circular por um
caminho de 2 a 64 pontos; com `raioCurva` maior que zero cada canto vira um arco
de raio `raioCurva` na linha de centro, cortado em seções retas de no máximo 6
graus, e com `raioCurva` zero o canto é uma meia-esquadria. O `raioCurva` precisa
passar do `raio` do tubo, para a curva interna não se fechar, e os trechos
precisam comportar as curvas ou as juntas vizinhas.

Toda malha de primitiva é fechada, tem a normal para fora e sai igual a cada
execução do mesmo andaime. Cada recusa diz o caminho do campo, o valor recebido e
o que é aceito, no formato `volumes[2].raioTopo: recebeu 30; aceita valor
diferente de raioBase (30)...`, e o código do erro (`ErroFormaGlobal.codigo`)
identifica o caso. Dimensão não positiva, eixo contraditório, perfil que não é
polígono simples e orçamento excedido falham antes de produzir uma blocagem. O
perfil do `prisma` e das seções do `casco-secoes` continua precisando ser
convexo; o perfil côncavo usa a `extrusao`.

## G01 — forma global medida

`mecanifica.avaliacao-forma-global@1` compara alvo e blocagem na mesma unidade e
nos mesmos eixos. O gate só aprova quando todos estes itens passam:

1. envelope derivado dentro do erro relativo permitido;
2. todos os landmarks presentes e dentro da tolerância;
3. todas as regiões globais obrigatórias representadas;
4. volumes e triângulos dentro do orçamento;
5. silhuetas frontal, direita e superior acima do IoU mínimo e abaixo do
   desvio máximo.

O comparador rasteriza separadamente os contornos do alvo e os triângulos da
blocagem. Uma média não esconde vista reprovada. Objeto parcial, cabine
achatada, landmark deslocado e estouro de orçamento são casos vermelhos do
corpus executável.

G01 é técnico. Ele não afirma que o objeto foi reconhecido.

## G02 — reconhecimento e aceite

`mecanifica.decisao-forma-global@1` só aprova quando:

- G01 está aprovado;
- uma crítica de papel `critico-visual-independente` registra o que reconheceu
  recebendo vistas neutras sem a identidade esperada;
- o usuário decide `aprovar` explicitamente.

Ausência de crítica ou de decisão mantém G02 `bloqueado`. Crítica ou usuário
reprovando torna a decisão `reprovado`. O autor não pode preencher o papel de
crítico independente e G01 verde não é convertido em reconhecimento implícito.

## Ligação ao nível detalhado

A receita de uma peça refina o andaime em vez de refazer posição, medida e encaixe. Dois campos opcionais ligam os
dois níveis, e nenhum deles muda uma receita ou um andaime que não os declare.

No andaime, `portas` é uma lista opcional de `{ id, interface }`. A `interface` repete a do passo `publicarPorta`
do núcleo (`anel`, `cilindro`, `plano`, `padraoFuros` ou `trilho`, com `papel`, `eixo`, `centro` e as medidas da
forma), em milímetro, já expandida: `centros` no lugar de `padrao` e `extensao` como `[largura, comprimento]`. O
`id` é o nome que a receita publica. Um andaime sem `portas` mantém o mesmo conteúdo canônico e a mesma blocagem, e
a blocagem não carrega as portas. O campo entra em `mecanifica.andaime-global@2` como adição compatível.

Na receita, `REFINA` (formato `mecanifica.refinamento-global`, versão 1, escrito ao lado de `PLANO`) declara:

```js
REFINA: {
  andaime: 'andaime.json',                      // caminho relativo à pasta da peça, confinado ao repositório
  partes: { coluna: 'coluna-central' },         // parte da receita -> volume do andaime que ela refina
  tolerancia: { envelope: 2, porta: 0.5 },      // milímetro; teto de 50 para o envelope e de 5 para a porta
}
```

`src/autoria/refinamento-global.js` confere a peça executada e `tools/mecanifica/refinamento-global.mjs` lê o
andaime do disco. O veredito de `descrever-peca` roda a conferência sempre que a receita declara `REFINA`, e a
`guarda:acervo` passa por ele. Cada achado diz a parte, o volume ou a porta, e o desvio:

- `parte-fora-do-envelope`: a malha da parte passa, em algum lado, do envelope do volume (a caixa alinhada aos
  eixos da malha que a blocagem compilaria para ele) por mais que `tolerancia.envelope`;
- `parte-sem-volume`: a peça entrega uma parte que `REFINA.partes` não cita, e sem volume não há envelope;
- `parte-ausente` e `volume-desconhecido`: o vínculo cita uma parte que a peça não tem ou um volume que o andaime
  não tem;
- `porta-ausente`: o andaime declara uma porta que a peça não publica;
- `porta-fora-do-lugar`: a interface que o núcleo resolveu difere da do andaime em algum campo que o andaime
  declara, por mais que `tolerancia.porta` nos comprimentos e 0,001 nas direções (cerca de 0,06 grau);
- `porta-fora-do-plano`, `porta-com-raio-errado` e `porta-sem-face`: a porta publicada não confere com a malha da
  peça, pela régua de `porta-confere-forma.js`, que continua sendo a única que olha a geometria da porta.

O andaime está em milímetro e o núcleo em metro, no mesmo quadro de coordenadas, com a mesma origem e os mesmos
eixos. O envelope é um limite superior: uma parte pequena dentro de um volume grande passa, e quem decide se a
parte preenche o volume é o G01 da blocagem, a razão de volume contra a forma do esboço quando a receita a declara (seção
"Forma da parte contra a forma do esboço") e a pessoa. A conferência também não exige que todo volume do andaime tenha uma parte.

## Forma da parte contra a forma do esboço

O envelope acima é uma caixa e limita a parte só por cima. O andaime perde o que o esboço tem: a N2 não subtrai um volume de outro, e
por isso o recorte some; não inclina o sólido, e por isso as pás da hélice e o montante do para-brisa não têm volume; e a forma de
família vira o casco convexo das seções dela. O envelope da ponta da asa do avião é a caixa da asa inteira, que passa 5,3 m da ponta, e
uma ponta feita em qualquer lugar dela passa. Quando a receita precisa responder se a parte tem a forma da que o esboço aprovado
desenhou, ela declara `esboco` dentro de `REFINA`, e a conferência compara a malha da parte com o sólido da forma do próprio esboço.
Sem o campo nada muda para receita nenhuma, e a conferência do envelope também não o lê.

```js
REFINA: {
  andaime: 'andaime.json',
  esboco: {
    arquivo: '../../esboco/aviao.esboco.json',   // relativo à pasta da peça, confinado ao repositório, de um .esboco.json
    opcao: 1,                                    // número a partir de 1 ou título da opção; padrão 1
    formas: {                                    // parte da receita -> forma do esboço
      fuselagem: 'fuselagem',
      asa: ['asaD', 'pontaD'],                   // uma parte pode refinar mais de uma forma: a comparação é com a união delas
      porta: { formas: 'porta', minimo: 0.9 },   // mínimo próprio da parte, no lugar do geral
    },
    minimo: 0.95,                                // razão interseção/união mínima de cada parte sem mínimo próprio, de 0 (aberto) a 1
  },
  partes: { ... }, tolerancia: { ... },
}
```

A forma canônica de `esboco` traz `arquivo`, `opcao` (1 quando a receita não a escreve), `minimo` e `formas` como a lista
`[{ parte, formas, minimo? }]` em ordem de nome de parte, com as formas de cada parte em ordem de id; a normalização aceita as duas
escritas e é idempotente. Só as partes que o campo cita são conferidas, e uma parte do `REFINA.partes` sem forma no esboço continua
conferida só pelo envelope.

A razão de uma parte é `V(parte ∩ formas) / V(parte ∪ formas)`: vale 1 quando a parte é a forma e cai com a parte menor, maior ou
deslocada. A parte que repete o recorte da forma dá 1, e a parte sem o recorte que a forma tem dá a razão que o recorte tira, um menos o
volume do vão sobre o volume da parte. A conferência mede com a Manifold, em milímetro, e reprova a parte abaixo do mínimo com um achado
que diz a parte, as formas, a razão e o mínimo. Em `partes` volta a razão de cada parte medida, com os volumes da parte, das formas e da
interseção em mm3, e o veredito de `descrever-peca` imprime na seção `REFERÊNCIA DA FORMA` uma linha com a razão de cada parte quando o
campo existe. Os achados são:

- `parte-fora-da-forma-do-esboco`: a razão da parte está abaixo do mínimo dela;
- `forma-do-esboco-desconhecida`: a parte cita uma forma que a opção do esboço não tem (a mensagem lista as que ela tem);
- `parte-ausente-do-esboco`: a parte cita uma forma e a peça não tem nenhuma face com o nome dela;
- `forma-do-esboco-sem-solido`: a forma não tem sólido, hoje só a faixa (`envolve`), e o motivo vem na mensagem;
- `parte-sem-solido`: a malha da parte não forma um sólido fechado e orientado, e sem sólido não há volume para comparar. A parte que a
  conferência não consegue medir reprova em vez de passar, porque o campo é uma declaração da receita.

`src/autoria/solido-do-esboco.js` monta o sólido de cada forma de `formasResolvidas` (`mecanifica.formas-resolvidas@1`), sem importar o
módulo do esboço. A geometria do tipo vem do tradutor do nível zero, no quadro local da forma (`volumeLocalDaForma`, que dá o volume da
N2 com a matriz identidade, de modo que a rotação em dois eixos deixa de importar), com os mesmos lados do esboço; o sólido é essa
malha girada pela `matriz` e posta no `centro`, e a matriz com determinante negativo (o espelho) vira os triângulos para a normal
continuar saindo. O que a N2 muda é refeito: o loft com seção inclinada, seção ponto ou casca é a união do casco convexo dos pontos de
cada par de seções (a casca é o externo menos a cavidade, que passa 1 mm da boca), e o loft sem nada disso fica como o tradutor o põe,
a superfície de cada ponto ao ponto correspondente da seguinte, que é a que o esboço desenha e a que o `loft` do núcleo faz; a caixa com
`furos` é a caixa menos um cilindro de 128 lados por furo; o tubo com canto sem raio de curva é um tubo por trecho e uma esfera por
junta; e a forma de família é a malha que o provedor de `tools/mecanifica/esboco-familias.mjs` entrega (a que o módulo já leu,
recentrada e com as faces para fora), uma parte da família por vez e unidas, porque o aro e o pneu se sobrepõem e a união de sólidos
fechados é definida onde a malha das duas juntas não é.

O recorte de uma forma (`geometria.recorte.cortadores`) é lido como em `modulos/esboco/src/recorte.js`: o sólido da forma inteira menos
o sólido de cada molde, que pode ser qualquer forma da opção, visível ou `cortador`, e pode ter o próprio recorte. `folga` engrossa o
molde deslocando cada face dele para fora (em canto vivo o vão passa de `folga`), peça convexa por peça convexa (o casco de cada faixa do
loft), e só vale para molde convexo ou loft; `profundidade` com `lado` deixa do molde só a fatia que entra `profundidade` mm na forma a
partir da face dela nesse lado. O recorte circular, o que remove a forma inteira e a folga num molde que não é convexo nem loft são
recusados. As coordenadas entram na Manifold relativas ao centro das partes medidas, porque ela trabalha em Float32 (o erro fica em
cerca de um milionésimo do volume), e os sólidos saem iguais a cada execução.

`src/autoria/forma-do-esboco.js` faz a conferência (`conferirFormaDoEsboco`) e não conhece disco: recebe as formas resolvidas e a peça
executada. O adaptador `tools/mecanifica/esboco-solido.mjs` lê a opção pelo módulo, guarda no processo o resultado de
`formasResolvidas` pela impressão do esboço (resolver a opção do avião inteiro leva 45 s, dos quais 40 s são a superfície das 15 formas
de família, gerada a frio pelo provedor, e 3 s os recortes do módulo; a conferência dos sólidos e das razões depois leva meio segundo),
entrega a malha de cada família e carrega o módulo, as famílias e a Manifold só quando a receita declara o campo.
`tools/mecanifica/refinamento-global.mjs` lê o esboço do caminho que a receita declara, confinado ao repositório como o andaime, o
veredito de `descrever-peca` roda a conferência junto com o `REFINA`, como já roda o envelope e as portas, e a `guarda:acervo` passa por
ele. A linha de comando `npm run forma:esboco -- <peça> --esboco=<arquivo.esboco.json> --mesmo-id` (ou
`--formas=parte:forma+forma,...`, com `--minimo=` e `--opcao=`) mede uma receita que não declara o campo, ligando cada parte à forma de
mesmo id, sem mudá-la; serve para medir uma peça fixa ou escolher o mínimo antes de escrever a declaração.

Limites. A razão mede volume e não o lugar de cada detalhe, e a parte que erra por menos que o mínimo passa; o mínimo é de quem
declara, e a razão que a parte tem de fato volta em `partes`. A faixa (`envolve`) não tem sólido. O loft de seções muito torcidas, como
uma pá, usa a superfície que a N2 faz, e o volume dela difere da fórmula do prismatoide do tradutor em até 5%. O `volumeMm3` e a caixa
que o módulo calcula para a forma de família recortada vêm das peças convexas dela e não valem como referência (a ponta da asa do avião
sai com volume negativo e a deriva com a caixa 268 mm mais baixa); o sólido da conferência não os usa.

## Andaime derivado do esboço

O esboço continua sendo onde a IA escreve, e o andaime do nível zero sai dele. `src/autoria/tradutor-nivel-zero.js`
(`traduzirFormasParaAndaime`) lê as formas já resolvidas pelo módulo (`formasResolvidas`, formato
`mecanifica.formas-resolvidas@1`, descrito no README do esboço) e devolve o andaime, sem importar o módulo; o adaptador
`tools/mecanifica/esboco-para-andaime.mjs` (`andaimeDoEsboco`, `andaimeDoArquivo`) lê o esboço, chama as duas pontas e
`descreverTraducao` imprime o resultado em texto. O resultado é `{ andaime, tabela, naoTraduzidas, perdas, ocultas }`: o andaime
já aceito por `normalizarAndaimeGlobal`, a tabela do id do esboço para o id do andaime, as formas visíveis que ficaram de fora
com o motivo (`{ id, tipo, motivo }`), o relatório de perdas das formas aproximadas e os ids das formas `oculto: true`, que são
referência do esboço e não entram.

Têm correspondência exata a caixa sem raio, chanfro nem furo, o cilindro, o anel (sem furo é um cilindro), o cone, a esfera,
a revolução, a extrusão convexa ou côncava e o tubo; a haste `de`/`para` e a ligação `ligar` chegam como cilindro, e como
tubo de dois pontos quando o eixo dela não coincide com um eixo do mundo. O esboço e a N2 usam os mesmos lados (128 no
cilindro, no anel e no cone, 48 no tubo, 40 por 20 na esfera, e o `lados` que a forma declarar), de modo que o polígono e a área
são os mesmos. A rotação sai da matriz da forma. Uma matriz que leva os três eixos a eixos do mundo só reordena as medidas. Uma
que deixa um eixo no lugar e gira os outros dois no plano dele gira o perfil: a caixa vira a extrusão desse eixo do retângulo
girado e a extrusão gira o contorno. Cone, anel, revolução, loft, caixa com raio ou chanfro e cilindro achatado só entram com o
eixo sobre um eixo do mundo, e a esfera não depende da matriz.

Entram com aproximação declarada o que a N2 não tem com o mesmo tipo. O loft vira `casco-secoes`: o esboço já reamostra as
seções para o mesmo número de pontos, o centro de cada seção já está deslocando o contorno, a posição `w` da seção vira a
posição do casco, e a seção ponto vira o polígono do vizinho a 1%, porque o casco recusa área nula. A casca do loft vira o
sólido externo cheio (a cavidade some). A inclinação de seção é ignorada: o contorno é projetado no plano perpendicular ao eixo,
e a seção de cada ponta vai ao ponto mais extremo dela ao longo do eixo, para o envelope nesse eixo não encolher. A caixa com raio
vira a extrusão do mesmo retângulo arredondado do esboço (36 pontos, oito segmentos por canto, o raio recortado à metade da menor
medida e os pontos repetidos tirados), a caixa com chanfro vira o casco das quatro seções que o esboço desenha (topo, corpo,
corpo, topo), e o cilindro achatado vira a extrusão do círculo cortado pelo plano do lado achatado; nesses três a geometria é a
mesma do esboço, e só o tipo muda. O componente com detalhe interno que faz o andaime passar do orçamento de volumes do alvo
(`volumesMaximos`, 1000 por padrão) é recolhido a uma caixa do envelope da forma principal (ou do conjunto de suas formas, se
ele não declara principal), começando pelo componente de mais volumes e só entre os que têm dois ou mais; as formas dele
apontam na tabela para o volume da caixa, e se ainda assim não couber a tradução recusa.

Cada forma aproximada, e cada componente recolhido, entra em `perdas` (em ordem de id), com `id`, `tipo`, `aproximacao`
(`loft-como-casco`, `caixa-com-raio-como-extrusao`, `caixa-com-chanfro-como-casco`, `cilindro-achatado-como-extrusao` ou
`componente-recolhido-ao-envelope`), `volumeId`, `perdido` (lista de `{ codigo, descricao }`: `tipo`, `inclinacao`, `casca`,
`secao-ponto` ou `detalhe-interno`), `volumeEsboco`, `volumeAndaime`, `erroVolume` (`mm3` e `relativo`, o do andaime menos o
do esboço sobre o do esboço), `envelopeEsboco`, `envelopeAndaime` e `erroEnvelope` (`mm`, o maior desvio de uma face, e
`relativo`, esse desvio sobre a extensão do esboço no eixo). O volume e o envelope do andaime são medidos na blocagem N2 do
volume, compilada pelo próprio tradutor com um alvo largo (`src/autoria/medir-blocagem-nivel-zero.js`), e não estimados. O
volume do esboço vem da conta sobre os dados da forma: a área do contorno vezes o comprimento na caixa e no cilindro, a fórmula
do prismatoide no loft sem inclinação e, com seção inclinada, o sólido convexo de cada par de seções (o que o esboço desenha),
menos a cavidade quando há casca; no componente recolhido é a soma dos volumes das formas dele que se traduzem, medidos na
blocagem delas. No loft com casca o relatório traz ainda `volumeExternoEsboco` e `erroVolumeExterno`, que separam o que a
inclinação ignorada custa (na caçamba do carrinho, cerca de 10% sobre o externo) do que a cavidade custa (a casca de 4 mm faz o
andaime ter 29 vezes o volume do esboço).

Fica de fora, e volta em `naoTraduzidas`, o que não tem equivalente: faixa (`envolve`), furo de caixa (com ou sem raio), rotação em
mais de um eixo de um sólido que a N2 não inclina, tubo com canto sem raio de curva (o esboço põe uma esfera na junta e a N2 uma
meia-esquadria), loft sem seções ou com contornos de números de pontos diferentes, e qualquer volume que a própria N2 recusa, com
a mensagem dela. `estrito: true` recusa o conjunto inteiro quando alguma forma visível fica de fora, e as aproximações sozinhas
não o reprovam: elas estão em `perdas`, nunca em silêncio.

O id do volume é o slug do id da forma (sem acento, `camelCase` e pontos viram hífen), e dois ids que dão o mesmo slug levam
ambos o hash do id original, de modo que a tabela não depende da ordem das formas. As regiões de um volume são a unidade e a
parte da forma, ou `sem-regiao` sem as duas. O envelope é a união das caixas do esboço, e os landmarks são o centro do
conjunto e os pontos nomeados do esboço que caem dentro dele.

As medidas do `plano.medidas` do esboço são lidas na blocagem do andaime (`src/autoria/medidas-na-blocagem.js`,
`lerMedidasNaBlocagem`; o adaptador `medidasDoAndaime` junta as duas pontas). A mesma expressão que o esboço mede sobre as
próprias formas (`alturaTotal`, `larguraTotal`, `profundidadeTotal`, `{ caixa, formas }` e `{ distancia, eixo }`) é medida nos
vértices da malha compilada, achando as formas citadas pela `tabela` do tradutor, e devolve por medida o que o esboço devolve
(`esperado_mm`, `medido_mm`, `desvio_mm`, `tolerancia_mm`, `ok`), com o valor exato, os volumes lidos e as perdas que tocam esses
volumes. A blocagem mede de verdade o envelope: a caixa de um eixo e as seis faces (`<id>.+y`). As âncoras que a malha não revela
(`centro`, `inicio`, `fim`, seções e pontos-guia) valem a posição do esboço e só são aceitas dentro do envelope medido do volume;
os pontos nomeados e os vetores valem o que declaram. Uma medida volta com `lida: false` e o motivo, sem derrubar as outras,
quando cita forma que não existe ou âncora que a forma não tem, uma âncora fora do envelope medido, uma forma sem tradução cuja
caixa passa do que as outras formas medem no eixo (se cabe dentro, ela não pode mudar o resultado e a medida é lida, com a forma
em `foraDoAndaime`), ou a forma de um componente recolhido ao envelope da principal, que só tem o envelope da principal.
`compararLeituras` compara a blocagem com a mesma conta sobre o dado do esboço e diz, por medida, a diferença e se ela cabe no
`erroEnvelope.mm` das perdas dos volumes lidos mais a tolerância de concordância de 0,05 mm, que cobre o polígono inscrito do
tubo e do cilindro fora dos eixos. O tradutor preserva o envelope das aproximações (a caçamba cheia, a inclinação ignorada e a
casca não o mudam), e por isso nas fixtures nenhuma medida precisa da perda para ser explicada: a diferença máxima é 0,0089 mm.
A seção ponto de um loft perto da borda é o caso em que a perda explica a diferença.

O G01 completo roda sobre o andaime derivado por `avaliarG01DoAndaime` (`src/autoria/g01-do-andaime.js`) e, a partir do esboço,
por `g01DoEsboco` no adaptador: o alvo N2 entra de fora, o tradutor recebe o `alvo`, o `objetivo`, a `familia` e os `eixos` dele, e
o resultado traz o G01 (`mecanifica.avaliacao-forma-global@1`), o G00 do alvo e `medidasAprovadas`, que diz se envelope,
landmarks, regiões, orçamento e as três silhuetas passam sem depender de a crítica do alvo estar registrada (o G01 fica
`bloqueado` enquanto o G00 está). Nenhum esboço do repositório declara `plano.referencia`, e por isso a chamada está provada com um
alvo sintético (um cubo, em três silhuetas retangulares); sem `alvo` ela devolve `rodou: false` dizendo se falta o contorno ou só o
alvo. Transformar o contorno de referência de uma vista (`mecanifica.contornos@1`) nas três silhuetas do alvo não está feito.

O mesmo G01 roda sobre a malha da peça executada (`avaliarG01DaPeca`, no mesmo `g01-do-andaime.js`), quando a receita declara o alvo
em `REFINA.alvo` ao lado de `REFINA.andaime`. A blocagem é a do andaime com os vértices e as faces trocados pelos triângulos da peça
(as faces do núcleo triangulam como o contato de sólidos, em milímetro), cada triângulo no volume que `REFINA.partes` diz que a
parte dele refina, e `avaliarFormaGlobal` roda sem mudança. O envelope derivado sai da malha; os landmarks e o envelope declarado
vêm do andaime, porque uma malha não os revela, e as regiões obrigatórias valem pelas partes entregues. O orçamento do alvo limita a
blocagem do andaime e não a peça detalhada, e por isso não entra em `medidasAprovadas`. O veredito de `descrever` imprime o G01
em `REFERÊNCIA DA FORMA` e reprova quando as medidas não passam, sem esperar a crítica do alvo (o G00 fica bloqueado até ela existir).
A prova está em `tools/mecanifica/forma-da-peca-no-veredito.test.mjs`, sobre o suporte de `tools/fixtures/refina-forma-global/`
(`alvo.json`): a malha que confere passa, e a sapata deslocada 30 mm reprova em duas silhuetas e no envelope.

A prova está em `src/autoria/tradutor-nivel-zero.test.js` (cada tipo com formas escritas à mão, a rotação, as aproximações com
valores analíticos, o recolhimento, as recusas, os ids e o determinismo) e em `tools/mecanifica/esboco-para-andaime.test.mjs`
(as fixtures do módulo e do banco de provas): nas formas exatas o volume coincide com o do esboço dentro de 1e-6 relativo e o
envelope dentro de 1e-5 mm, e dentro de r (1 - cos(pi / n)) no cilindro e no tubo fora dos eixos, em cada forma, unidade, parte e
no conjunto; as formas aproximadas sem perda de volume (caixa com raio, cilindro achatado, loft sem casca nem inclinação) têm o
mesmo erro, e a caçamba do carrinho (casca e seção inclinada) é provada à parte, com o envelope externo dentro de 1%, a perda
de cavidade declarada e o volume do esboço calculado por fora, pelo casco convexo de cada faixa. As medidas do plano e o G01 têm
`src/autoria/medidas-na-blocagem.test.js` (formas escritas à mão) e `tools/mecanifica/esboco-medidas-no-andaime.test.mjs` (as dez
fixtures com `plano.medidas`, a medida alterada para reprovar, a forma sem tradução, o componente recolhido e o G01).

## Porta operacional

`criarServicoAutoria3DNativa().formaGlobal` expõe uma única fachada pura para
normalizar alvo/andaime, compilar, avaliar, decidir e renderizar evidências. O
provedor `forma-global-nativa` cobre somente `alvo`, `andaime` e `blocagem` no
planejador. Decomposição, integração, superfície, estados, revisão e publicação
continuam lacunas explícitas.

## Reexecução

```text
npx vitest run tools/mecanifica/forma-global-n2-caixa-preta.test.mjs tools/mecanifica/forma-global-n2-primitivas.test.mjs tools/mecanifica/forma-global-n2-g01-primitivas.test.mjs
npm run autoria:n2:evidencias
npm run autoria:n2:evidencias:check
```

A ligação ao nível detalhado tem teste próprio, com o suporte de prova de
`tools/fixtures/refina-forma-global/`:

```text
npx vitest run src/autoria/refinamento-global.test.js tools/mecanifica/refinamento-global.test.mjs
```

A forma da parte contra a forma do esboço (`REFINA.esboco`) tem a prova do sólido de cada tipo e do recorte, a da conferência sobre um
esboço sintético (um bloco com um cilindro recortado, uma viga inclinada e uma forma de família) e a de ponta a ponta no veredito, na
guarda do acervo e na linha de comando, com as fixtures de `tools/fixtures/forma-do-esboco/`:

```text
npx vitest run src/autoria/solido-do-esboco.test.js src/autoria/forma-do-esboco.test.js tools/mecanifica/forma-do-esboco.test.mjs
```

`forma-global-n2-primitivas.test.mjs` prova cada primitiva (envelope medido, malha
fechada, volume conhecido, determinismo e recusa) e
`forma-global-n2-g01-primitivas.test.mjs` aprova no G01 um andaime que usa as seis,
com três casos vermelhos (envelope, região e silhueta).

O tradutor do nível zero e a leitura das medidas na blocagem têm teste próprio:

```text
npx vitest run src/autoria/tradutor-nivel-zero.test.js tools/mecanifica/esboco-para-andaime.test.mjs src/autoria/medidas-na-blocagem.test.js tools/mecanifica/esboco-medidas-no-andaime.test.mjs
```

Os PNGs são conveniência de inspeção. Os SVGs, JSONs e hashes do manifesto são
os derivados textuais reexecutáveis. O alvo e o andaime versionados continuam
as fontes de verdade.

## Limites

N2 não prova qualidade de superfície, curvatura, vincos, aberturas, contato,
conectividade, cinemática ou carro final. A prova usa um veículo compacto bruto
apenas porque quatro rodas, postura, corpo e cabine oferecem leitura global
fácil de atacar. N4 continuará responsável pelo carro bruto produzido sobre a
representação de superfície escolhida em N3.
