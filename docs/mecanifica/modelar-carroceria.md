# Modelar carroceria de chapa contínua

Esta instrução vale para a peça que é uma chapa contínua de superfície lisa, com dobras vivas, bordas arredondadas, arcos recortados na borda e vãos: carenagem, capô, painel ou carroceria inteira de superfície curva. Ela fica ao lado de [`modelar-veiculos.md`](modelar-veiculos.md), que ensina a técnica das três vistas para a forma facetada, de faces planas. A interseção de vistas dá superfície em facetas; para a chapa lisa, a operação é `subdivisao`, com a gaiola escrita por estações e colunas nomeadas, os vincos nomeados, as cotas como medidas e a espessura no mesmo passo. O contrato completo da operação está em [`operacoes-procedurais.md`](../../.claude/skills/criar-peca/references/operacoes-procedurais.md), na seção da superfície subdividida, e a peça que exercita tudo o que vem abaixo é `procedural/pecas/carenagem-de-prova/`, desenhada só por código, com o teste ao lado da receita.

## Vistas e ficha de medidas

A modelagem começa por quatro vistas ortográficas (lateral, frontal, traseira e superior) com grade em milímetro e por uma ficha de medidas, combinadas com a pessoa pela skill `alinhar-modelagem` antes do primeiro passo. A ficha diz o comprimento, a meia largura e a altura da borda de baixo, do ombro e do teto nas estações que importam, a altura e a saliência de cada vinco e onde ele começa e termina, e a posição de cada arco e de cada vão. Cada número da ficha vira um parâmetro nomeado da `TABELA`, em milímetro, e a ficha marca quais deles a superfície precisa atravessar, porque esses viram medidas na seção de medidas abaixo. O `PLANO` descreve a chapa como uma parte só, com a técnica `subdivisao` e os critérios de reprovação escritos sobre as cotas, os vincos, os arcos e os vãos.

## Gaiola por estações e colunas nomeadas

A gaiola é a malha de controle de poucas centenas de pontos que a subdivisão alisa. Ela se escreve com `gaiolaPorEstacoes`, chamada em `derivar` com os números da `TABELA`: estações ao longo do comprimento, cada uma com as colunas da seção em ordem, da borda de baixo até a costura de simetria. As estações que carregam cota levam o nome da cota (`tras`, `arcoInicio`, `arcoTopo`, `meio`, `vaoInicio`, `frente`), e as de preenchimento levam o nome da última cota antes delas seguido da ordem, de modo que nenhuma receita, medida ou vinco cite estação por posição. As colunas também têm nome (`soleira`, `cintura`, `ombro`, `centro`), e o ponto se chama `estacao_coluna`. A seção é uma função da `TABELA` amostrada em cada estação; com `simetria: 'x'` a gaiola declarada é só a metade x ≥ 0.

A gaiola adensa só onde a forma pede. Longe de um vinco a seção tem poucas colunas, e perto dele entram colunas finas: a coluna que começa entre duas que seguem fecha um pentágono, e duas colunas que se fundem fecham um triângulo. Na carenagem de prova a lateral tem quatro colunas longe do vinco e dez perto dele, a gaiola tem 433 pontos com 6 pentágonos e 6 triângulos, e a chapa sai com 24.990 vértices em nível 2 com a espessura. Duas escolhas tornaram a receita estável quando a `TABELA` muda, e cada uma veio de um parâmetro que o diagnóstico sondou e o motor recusou. As colunas da lateral ficam a passos fixos contados a partir da cintura, porque numa grade fixa da seção subir o ombro 10% fazia a cintura cruzar a coluna vizinha. E o tipo de cada estação (grossa, de transição ou fina) sai da ordem das estações, contado a partir da primeira e da última estação da zona fina, porque com a posição exata uma cota que caía no meio da transição quebrava a fusão das colunas. Duas cotas na mesma posição gritam com os dois nomes, porque cada cota precisa da sua estação.

Os pontos da gaiola são dado derivado da `TABELA`, sem liberdade própria, e por isso ficam fora de `PARAMS`. Em `PARAMS` eles ficariam fixos desde a carga do módulo, de modo que mudar a `TABELA` mudaria só os nomes do passo e a forma sairia igual, e o diagnóstico de parâmetros sondaria cada uma das cerca de 1.300 coordenadas. A receita os publica por um getter de `TOPO`, que o núcleo junta a `PARAMS` no dicionário de nomes:

```js
get TOPO() { return { origem: '…y para cima e a frente em +z', ...derivar(this.PARAMS).pontos }; },
get PASSOS() { return gerarPassos(this.PARAMS); },
```

Assim a receita copiada com outra `TABELA` recalcula a gaiola, e o teste da carenagem confere que alongar o comprimento move a frente da malha. O passo cita a gaiola só por nome, e `enderecosPorIndice`, de `procedural/nucleo/operacoes/subdivisao.js`, confere em teste que não sobrou índice de vértice, face, vinco, canto ou medida.

## Vincos nomeados e raio de borda

O vinco se declara pela coluna ou pela estação que ele segue, com nome, começo, fim e nitidez: `{ nome: 'linhaDeCintura', coluna: 'cintura', de: 'vincoInicio', ate: 'vincoFim', nitidez: 'viva' }`. A dobra viva usa `'viva'` e pode nascer e morrer dentro da chapa. O raio de uma borda arredondada sai da nitidez fracionária, de 0 a 1, e depende do tamanho das faces da gaiola dos dois lados da borda e do ângulo entre elas. A tabela abaixo dá o raio do filete circular que deixa a mesma folga entre a quina viva e a superfície limite, medido em duas gaiolas: o cubo de 1 m com as doze arestas vincadas, em que a borda tem 90 graus por dentro e faces de 1 m, e o ombro da carenagem de prova no meio do comprimento, com 124 graus por dentro e faces de 188 mm dos dois lados.

| nitidez | cubo, lado 1 m, 90° | ombro, lado 188 mm, 124° |
|---:|---:|---:|
| 0,5 | 107 mm | 41,5 mm |
| 0,6 | — | 19,4 mm |
| 0,7 | — | 7,6 mm |
| 0,75 | 12,2 mm | 4,8 mm |
| 0,9 | 2,1 mm | — |
| 1 | 0 | 0 |

No cubo o raio segue 0,6 × lado × 2^(−10 n²), com n a nitidez, de 0,5 para cima. No ombro o raio medido é cerca de 2,1 vezes essa conta, perto do fator tan(φ/2) = 1,88 de um filete que toca as duas faces à mesma distância da quina, com φ o ângulo por dentro; para estimar a nitidez de uma borda que não tem 90 graus, use 0,6 × lado × 2^(−10 n²) × tan(φ/2) e confira pela medida, porque só esses dois ângulos foram medidos. Abaixo de 0,5 a face vizinha deixa de ser plana e a nitidez arredonda a forma toda. O perfil do arredondamento não é um arco de círculo: no ombro com nitidez 0,6 o menor raio de curvatura da seção é 14,7 mm, contra os 19,4 mm do filete de mesma folga.

O raio é da superfície limite. A malha entregue no nível N tem, na seção da borda, segmentos de cerca de lado / 2^N, e o arredondamento menor que um segmento aparece na peça como uma faceta: no ombro da carenagem, em nível 2, o segmento tem 47 mm e o raio de 19 mm cabe dentro de um só. Para o raio aparecer na malha, suba `niveis` ou adense as colunas dos dois lados da borda; adensar também encolhe o raio, o que se compensa baixando a nitidez.

## Medidas nos pontos de cota

Sem medidas, a superfície limite aproxima a gaiola e não passa pelos pontos dela, e toda cota da `TABELA` sai encolhida. Os pontos de cota se listam em `medidas` do ajudante, por `{ estacao, coluna }`, e a superfície passa por eles: cada um vira vértice da malha exportada, com a imagem espelhada também. Na carenagem de prova as sete cotas (teto, ombro, cintura e borda de baixo no meio, topo do arco e teto nas duas pontas) ficam a no máximo 3,3e-16 m de um vértice, conferidas em teste contra os valores escritos pela `TABELA`. A medida pode ficar na borda livre, sobre o vinco vivo e sobre o vinco fracionário. Neste último a cota declarada é o meio do arredondamento: no ombro com nitidez 0,6 a quina virtual entre as duas faces fica 2,6 mm para fora da superfície. Marque só as cotas que a peça precisa acertar, porque cada medida move a gaiola em volta dela; o conjunto que a superfície não separa, ou que moveria a gaiola mais de 100 vezes o erro da cota, grita com os nomes dos pontos.

Os `PONTOS` do contrato do acervo medem a caixa da parte e servem para conferir os extremos: na carenagem, o canto de cima da frente da caixa é a cintura no meio, o teto no meio e a frente, e o `conferir-pontos` o encontra com desvio zero porque a cintura e o teto são medidas e são os pontos mais largo e mais alto da chapa.

## Espessura e seus limites

A espessura entra no mesmo passo, `espessura` em metro, e fecha a chapa num sólido: a superfície subdividida é a face externa e guarda as medidas, a interna anda a espessura contra a normal, e uma parede fecha cada borda livre e cada vão. A gaiola se escreve com a normal para fora; se ela sair para dentro, `lado: 'normal'` põe o material do outro lado. O volume fica perto da área da face externa vezes a espessura, abaixo dela pela curvatura: na carenagem, com 2 mm, a área externa é 6,4065 m², o volume 0,0127978 m³ e a diferença −0,12%, e o `conferir-malha` aprova a topologia sem achado. A espessura não pode passar do raio de curvatura local do lado do material, e o passo grita com os pontos nomeados mais perto quando passa. No vinco vivo esse raio é a largura da faixa de faces ao lado dele dividida pela tangente do meio ângulo da dobra, e cai pela metade a cada nível, de modo que subir `niveis` pode tornar inválida uma espessura que passava. Partes distantes da chapa a menos de uma espessura uma da outra não são conferidas. Use `borda: 'cantos'` para manter os cantos da borda livre e declare em `cantos` os cantos dos vãos e os encontros do arco com a borda reta; sem isso eles arredondam conforme o tamanho da face, até alguns centímetros.

## Régua e pacote cego do Blender

Quando há uma malha de referência para comparar, as ferramentas opcionais de `tools/blender/`, descritas em [`blender/REGUA-E-PACOTE-CEGO.md`](blender/REGUA-E-PACOTE-CEGO.md), preparam as vistas cegas com grade e medem a candidata contra a referência dentro de uma caixa: distância nos dois sentidos, erro de normal e casamento de vincos. Elas rodam só localmente, com o Blender, e a referência, a caixa, as vistas e as medidas ficam fora do repositório. Nenhum número delas aprova forma; a pessoa olha a folha.

## O que observar nas vistas

Três coisas enganam o olho na chapa. A primeira é o avesso nas vistas que olham por dentro: a vista que olha a chapa pelo corte ou pela ponta aberta mostra o lado de dentro, e numa superfície sem espessura esse lado é o avesso da face, que o pacote cego pinta de magenta e a bancada pode mostrar como se fosse a superfície; na chapa com espessura o lado de dentro é a face interna do sólido, e na bancada ela sai escura nas vistas frontal e traseira da carenagem de prova, por estar virada para baixo. A segunda é o recorte por triângulo inteiro: recortar uma malha pela caixa escolhendo triângulos inteiros deixa dentes e lascas na borda, e o recorte certo corta pelos planos da caixa, como o pacote e a régua fazem. A terceira é a borda sem cantos declarados, em que o canto do vão e o encontro do arco com a borda reta arredondam e o recorte parece mole.

O diagnóstico de parâmetros (`npm run parametros`) compara a caixa e a contagem de faces de cada parte, e chama de inerte o parâmetro que muda a forma por dentro da caixa: na carenagem de prova, 7 dos 27 parâmetros saem como inertes (a nitidez do ombro, a faixa e a rampa do vinco, a altura do arco, as bordas do vão e a espessura), e todos mudam a malha. Para esses, a prova de que o parâmetro está ligado é a medida da forma, como o raio de borda ou a cota.

## Provas para entregar

A peça vai à pessoa com `npm run descrever -- <peça>` sem achado, `conferir-pontos` dentro da tolerância, `conferir-malha` com a topologia aprovada, `npm run guarda:acervo` aprovando a peça, as seis vistas de `vistas-da-receita.mjs` e as de `vistas-texturizadas.mjs`, as vistas da bancada (isométrica, frontal, lateral direita, superior e traseira), e um teste ao lado da receita que confere o endereçamento só por nome, as cotas como vértices da malha, o sólido fechado com o volume a 2% da área vezes a espessura e a gaiola recalculada quando a `TABELA` muda. As imagens de trabalho ficam em `tmp/`, fora do controle de versão.

## O que o trecho cego mediu

A preencher pelo orquestrador.
