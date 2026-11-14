# Robô humanoide, braço direito: rodada de alinhamento

Registro da fatia 1 do plano [modelagem de robô humanoide](../../../docs/modelar/planos/2026-11-14-modelagem-de-robo.md). A rodada foi conduzida com a pessoa em 2026-11-14 pela sessão que coordena o plano, e este arquivo foi escrito por um agente despachado a partir das decisões que ela relatou. Por isso ele não traz a seção de aceite, que cabe a quem conduziu a rodada, e separa o que a pessoa fixou do que foi proposto sem ela.

## O objeto e as referências

O objeto é o braço direito de um robô humanoide de 1.750 mm de altura, do disco do ombro à ponta dos dedos. Tronco, cabeça, pernas e braço esquerdo ficam fora deste recorte. As referências são duas imagens geradas por IA, de frente e de costas, guardadas fora do repositório em `referencias/locais/`; o que elas mostram está descrito em [`referencias/alvo.md`](referencias/alvo.md). Elas dão o caráter da forma, e as medidas vêm da tabela abaixo.

## Como funciona e em que ordem se monta

O braço é uma cadeia de juntas de revolução montada do tronco para a ponta. O disco do ombro prende no tronco e tem dois eixos perpendiculares que se cruzam no centro dele: o de flexão, ao longo do disco, e o de abdução, apontado para a frente. O braço pende do eixo de abdução. O cotovelo é uma dobradiça de eixo paralelo ao de flexão do ombro, e dele sai o antebraço. O anel do punho gira em torno do eixo do antebraço e carrega o eixo de flexão da mão, perpendicular ao do anel. A palma gira nesse eixo e carrega os nós dos quatro dedos e a saída inclinada do polegar. Cada dedo tem três falanges em série, e cada uma dobra para dentro da palma.

A ordem das etapas em `montagem.json` é a ordem de montagem dita pela pessoa: `ombro`, `braco`, `cotovelo`, `antebraco`, `punho` e `palma`, depois `polegarBase`, `polegarProximal` e `polegarDistal`, e por fim as três falanges de cada dedo, do indicador ao mínimo.

## Medidas fixadas pela pessoa

| medida | valor |
|---|---|
| altura do robô | 1.750 mm |
| diâmetro do disco do ombro | 110 mm |
| braço, do centro do ombro ao centro do cotovelo | 300 mm |
| antebraço, do centro do cotovelo ao centro do punho | 260 mm |
| mão, do centro do punho à ponta do dedo médio | 190 mm |
| largura da palma | 90 mm |

A escala de cada receita é a medida fixada da parte, quando há uma, e a medida proposta quando não há.

## Juntas e cursos

| junta | eixo | curso | repouso |
|---|---|---|---|
| ombro, flexão | ao longo do disco (x) | -60° a 180° | 0° |
| ombro, abdução | perpendicular ao de flexão, para a frente (z) | 0° a 90° | 10° |
| cotovelo | paralelo ao de flexão do ombro (x) | 0° a 140° | 10° |
| punho, rotação | ao longo do antebraço (y) | -90° a 90° | 0° |
| punho, flexão | perpendicular ao do anel (x) | -60° a 60° | 0° |
| cada falange | paralelo à linha dos nós (z) | 0° a 90°, para dentro da palma | 0° |
| polegar, na palma | inclinado, saindo da palma | 0° a 90° | 0° |

As dezenove juntas que ligam duas peças do braço estão declaradas em `articulacoes.json`, no formato da extensão de articulação, com as peças que acompanham cada movimento. A flexão do ombro gira o ombro em relação ao tronco, que ainda não está na montagem, e entra quando o tronco entrar.

## Partes

Cada item é uma peça, com a receita em `partes/<peça>/receita.js`.

| peça | o que é | partes nomeadas |
|---|---|---|
| `ombro` | disco de junta preso ao tronco, com os dois eixos | `disco`, `garfoDeAbducao` |
| `braco` | casca cinza com painel escuro, do ombro ao cotovelo | `casca`, `painel`, `estrutura` |
| `cotovelo` | dobradiça com cilindro | `cilindro`, `garfo` |
| `antebraco` | casca com duas hastes expostas por baixo | `casca`, `hasteA`, `hasteB`, `estrutura` |
| `punho` | anel com as orelhas do eixo de flexão | `anel` |
| `palma` | placa de 90 mm com os quatro nós e a saída do polegar | `placa`, `saidaDoPolegar` |
| `polegar-base` | elo que gira no eixo inclinado da palma | `base` |
| `falange-proximal` | primeira falange, cinco instâncias | `elo` |
| `falange-media` | segunda falange, quatro instâncias | `elo` |
| `falange-distal` | terceira falange, cinco instâncias | `elo` |

A montagem tem 21 instâncias das dez receitas. As falanges são o corpo que se repete: uma receita por posição no dedo, usada pelos quatro dedos, e o polegar usa a proximal e a distal.

## Encaixes

Cada parte nasce na porta da anterior, pelas `posicoes` de `montagem.json`: o braço no eixo de abdução do ombro, o cotovelo no furo de baixo do braço, o antebraço na saída do cotovelo, o punho na ponta do antebraço, a palma no eixo de flexão do punho, a base do polegar e a primeira falange de cada dedo no nó correspondente da palma, e cada falange na ponta da anterior. Quatro `vinculos` levam a medida de uma porta ao parâmetro da parte seguinte, com folga zero por enquanto: o furo do braço com o raio do eixo de abdução, o pino do cotovelo com o furo do braço, o assento do antebraço com a saída do cotovelo, e o furo do punho com a ponta do antebraço. As portas ainda não existem, porque nenhuma receita tem passo; os nomes delas estão no cabeçalho de cada receita. As relações de encaixe conferidas por medida entram em `relacoes` junto com as portas, na fatia 2.

## Esqueleto

`andaime.json` é o esqueleto do braço, no formato do andaime da forma global N2, em milímetro, no quadro do robô inteiro: y para cima com o chão em y = 0, x para a direita do robô e z para a frente. Ele está na pose zero, com o braço pendente na vertical e a palma voltada para o corpo, porque o volume do andaime é alinhado aos eixos. Traz um volume por instância da montagem, com o id da instância em minúsculas e hífen (`polegarBase` é `polegar-base`), uma porta por eixo de junta e seis marcos: o centro do conjunto, os centros do ombro, do cotovelo e do punho, a linha dos nós e a ponta do dedo médio. O centro do ombro está em x 250 e y 1.435, o do cotovelo em y 1.135, o do punho em y 875, a linha dos nós em y 760 e a ponta do dedo médio em y 685.

As receitas ainda não declaram `REFINA`. Elas são escritas no quadro local de cada parte e postas no lugar pela montagem, e a conferência que existe compara a parte com o volume no mesmo quadro. A comparação do planejado com o executado na montagem é a régua que o plano deixa pendente da decisão da pessoa.

## Grau de realismo e material

Todos os corpos com a aresta trabalhada, como decidido no plano. As cascas são de parede fina com a espessura visível nas bordas. O painel escuro é material liso da paleta, sem textura de fibra de carbono, e se separa da casca cinza por costura.

## O que reprova o objeto

1. Segmento que não gira em torno do centro da sua junta: disco, pino do cotovelo ou anel do punho fora do eixo.
2. Duas partes que se atravessam em qualquer ponto do curso; o antebraço não entra no braço a 140°.
3. Casca sem parede fina visível nas bordas, ou segmento maciço que deveria ser casca.
4. Dedos sem três falanges separadas, ou polegar no mesmo plano dos outros dedos.
5. Painel escuro só como cor, sem costura ou degrau de borda que o separe da casca cinza.
6. Segmento com mais de 5% de diferença da medida fixada.

Cada receita repete, nos `criteriosDeReprovacao` dela, os que valem para a parte.

## Decisões que dependem da pessoa

O polegar ficou com duas falanges mais a base articulada, três juntas ao todo. A frase da pessoa, "polegar e quatro dedos de três falanges", deixa em aberto se o polegar também tem três. A recomendação é manter duas falanges e a base, que é a anatomia da mão e o que a referência sugere.

Os quatro dedos ficaram com o mesmo comprimento, porque a instância da montagem não recebe parâmetro próprio e dedos de comprimentos diferentes pediriam uma receita por falange de cada dedo. A recomendação é aceitar dedos iguais nesta primeira versão e rever quando a montagem der parâmetro por instância.

A mão de 190 mm foi dividida em 115 mm do punho à linha dos nós e 75 mm de dedo médio, com falanges de 32, 24 e 19 mm. A recomendação é manter, por ser a proporção comum de uma mão.

O centro do ombro foi posto a 1.435 mm do chão e a 250 mm do plano de simetria do robô. A pessoa fixou a altura total e os segmentos do braço, e não a posição do ombro no corpo. A recomendação é tratar os dois números como provisórios até a tabela de proporções do corpo inteiro, porque mudar a posição do ombro desloca o braço todo sem mudar nenhuma parte.

As medidas que a pessoa não fixou estão marcadas como proposta na `TABELA` de cada receita: a espessura do disco do ombro (50 mm), a seção da casca do braço (100 por 115 mm) e do antebraço (85 por 95 mm), a parede das cascas (3 mm), o vão da costura do painel (2 mm), o cilindro do cotovelo (76 mm de diâmetro por 90 de largura), o anel do punho (64 mm por 30), as hastes do antebraço (12 mm de diâmetro, afastadas 30 mm), a espessura da palma (28 mm), o passo entre dedos (22 mm), os pinos dos dedos (3 mm de raio) e a inclinação do eixo do polegar (45 graus). A recomendação é seguir com elas e corrigir pela imagem na rodada de cada parte.

O eixo de abdução foi apontado para a frente (z) e o de flexão ao longo do disco (x), com os dois cruzando no centro do disco. A pessoa disse que são perpendiculares e ficam no disco, e a direção de cada um saiu do movimento que a junta deve fazer. A recomendação é manter.

O esqueleto foi escrito na pose zero e a pose de repouso (abdução de 10° e cotovelo de 10°) ficou registrada só como número, à espera do ângulo de junta declarado na montagem, que é uma das lacunas que o plano mede. A recomendação é manter assim até o ponto de decisão da fatia 3.

A folga de todos os vínculos está em zero. A recomendação é fixar a folga de cada junta na rodada da parte que a recebe.
