# O que o braço robótico achou

**Estado:** rascunho

**Responsável:** Tiago (autoria) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-mecanifica`, base `fb382368` na main.

## Por que este plano existe

O braço robótico foi modelado para ser instrumento, e não peça. O pedido era
descobrir o que falta no projeto, o que está manual demais e onde o modelador
sofre, usando uma peça nova como sonda. Duas rodadas bastaram para encher esta
lista, e a receita foi apagada depois, de propósito.

O achado que governa os outros é este: toda régua deste repositório compara a
peça contra a declaração da própria peça. Quando as duas adotam a mesma
premissa errada, elas concordam entre si e discordam do mundo, e nada acusa. O
braço passou em todas as medidas deitado no chão.

## Achados de fato, já corrigidos

`guarda:referencial` nasceu desta sonda: confere que `TOPO.origem` declara y
como eixo vertical e que nenhum vértice fica abaixo do chão. Disparou duas
vezes em caso real, na declaração e na malha. São 32 gates agora.

O visor e `olhar-peca.mjs` procuravam `pecas/<nome>.js` desde a migração para
`pecas/<nome>/receita.js` e respondiam "peça desconhecida" para todas as peças.
Ficaram quebrados sem ninguém notar porque nenhum gate os exercitava.

A imagem que ia ao crítico saía com a interface em volta e nenhum documento
dizia de onde ela deveria sair. O modo de revisão passou a ligar a auditoria
sozinho, e `npm run vistas:critica` monta o pacote numa chamada: quatro vistas
do conjunto e duas de cada parte declarada.

O veredito não tinha palavra para caráter de superfície, e ser quadrado foi
reportado como espessura e ausência. Entrou o tipo `superficie`, e o contrato
do modelador traduz cada sentido em operação do motor.

A rodada de alinhamento ganhou o passo de ler a referência corpo por corpo, com
a regra de que todo corpo visível vira parte declarada, mais a pergunta do grau
de realismo. As seis partes do braço saíram da cabeça de quem conduziu e não da
foto, e por isso os anéis de junta viraram degrau entre cilindros.

O registro da rodada ganhou o campo `atrito`, e o contrato do modelador passou
a declarar o referencial e a mandar conferir parte por parte contra o plano.

## Achados de fato, em aberto

Todos os que sobraram são de código. O lado de documento e de contrato foi
feito em 2026-09-21 e 22.

`guarda:acervo` mede os contatos primeiro e para na primeira falha, então nunca
chega a validar o plano nem as referências de uma peça que ainda não tem
geometria. A skill promete que a rodada de alinhamento pode ser conferida antes
de existir malha, e na prática isso não acontece.

Nenhum gate confere que a técnica prometida no `PLANO` foi a usada. O crítico e
o modelador passaram a olhar isso por parte, o que é melhor que nada, mas
continua sendo leitura e não medida: parte prometida e não entregue reprova,
técnica prometida e não usada, não.

`conferir-pontos` mede uma junta como o centro da região onde as caixas de duas
partes se sobrepõem. Isso é exato quando dois elos se encostam de topo e é
errado quando um entra pelo flanco do outro, que é o caso de um cotovelo. Uma
peça com articulação de verdade precisa de medida melhor.

O registro de rodada exige nota de 0 a 10 e recusa nota ausente, mas um crítico
que não recebeu alvo legitimamente não tem nota. A skill manda buscar o alvo e
despachar de novo, que resolve na prática, e o esquema continua sem saber dizer
"não julguei".

Pasta de peça sem receita dentro é invisível para todo gate. A pasta do braço
ficou só com as imagens e `guarda:acervo` passou sem reclamar.

A pergunta do referencial continua fora da rodada de alinhamento. Hoje quem
pega é `guarda:referencial`, depois da geometria escrita, e o contrato do
modelador declara a convenção; perguntar antes ainda seria mais barato.

## O corpus de teste virou um segundo acervo

Resolvido em 2026-09-21. O pedido de apagar todas as receitas tinha sido
cumprido pela metade: o commit `33fde6a6` moveu a cadeira, a chapa de fixação e
as três prensas para `tools/fixtures/acervo/` em vez de apagá-las, e de lá elas
apareciam na bancada publicada como se fossem acervo. As cinco saíram, os
testes que as usavam passaram a escrever a própria entrada, e sobrou a
`peca-de-prova`. Dois daqueles testes mediam geometria de verdade e não
encanamento como eu havia afirmado, e um terceiro tinha piso de 300 passos num
acervo que já rendia 329, passando por folga e não por prova.

## Atrito do motor

`loft` não fecha as próprias tampas. O antebraço deveria afinar liso de 100
para 85 mm, a malha sairia aberta e a medida de contato não decidiria os pares,
então o modelador trocou por três cilindros em degraus. Uma tampa automática
quando a seção final tem raio maior que zero resolve. `cilindro` é o único
gerador cuja origem sem `tampa` seleciona só as laterais, então citar um
cilindro inteiro custa três passos, e a rodada 1 saiu com doze faces sem
identidade por causa disso.

O motor tem `arredondarAresta`, `filete`, `liso`, `inflate`, `displace` e
`lathe`, e a receita usava `cilindro` nove vezes, `chamferBox` uma e `furo`
uma. O aspecto quadrado não era o teto do motor, era o que foi alcançado, e
nada aponta o modelador para as operações que tiram a aresta viva. O teto real
é outro: o vocabulário poligonal da bancada está congelado, e é ele que traz
subdivisão e bisel em aresta arbitrária.

## Atrito do ambiente

A sessão remota clonou o repositório raso, com 57 commits. Perguntar ao git
quais commits apagaram receitas devolvia vazio, e vazio é indistinguível de
"nunca aconteceu"; a história inteira tem 1420 e só apareceu depois de um
`git fetch --unshallow`. É o mesmo padrão que esta frente já encontrou três
vezes: devolver silêncio em vez de recusar alto. O repositório também chega sem
`node_modules`, e nenhum gate roda antes de um `npm ci`.

## Falhas de condução, e o que elas ensinam

Estas são minhas, e estão aqui porque um gate de processo resolveria cada uma.
Na rodada 1 não despachei o crítico e olhei a imagem eu mesmo; na primeira
crítica não passei o alvo, e ele reclamou sozinho disso; nunca rodei
`rodada-de-modelagem.mjs --acao`, que a skill manda perguntar antes de tudo, e
as duas rodadas foram registradas depois, de memória; não rodei os gates
completos antes de empurrar, e uma mudança de captura derrubou dois testes do
MCP que só apareceram muito depois; e afirmei que não existia render limpo no
repositório quando `npm run revisar` existe e faz exatamente isso, porque parei
na primeira ferramenta que respondeu.

## O que a receita apagada levava consigo

O braço foi apagado de propósito, para descobrir o que vivia só na conversa. As
três imagens de referência ficaram, porque são a entrada do alinhamento e não a
receita, e por elas a próxima rodada regenera a leitura de forma. O que não se
regenera está aqui.

A tabela: base de 180 mm de diâmetro por 150 de altura, coluna de 160 por 180,
braço de 380 com seção 130 por 110, desvio de cotovelo de 90, antebraço de 370
afinando de 100 para 85, punho de 100, flange de 90 por 12 com oito furos numa
circunferência de 65 e furo central de 35. Alcance de 850 e altura total de
1180 com o braço esticado.

A divergência medida: a referência lateral põe a razão entre alcance horizontal
e altura em 0,73 e a tabela em 0,61, porque a imagem tem leve perspectiva e o
antebraço dela é proporcionalmente mais comprido que o de um braço real de 850
mm. A tabela manda, e isso precisa estar no plano da peça.

O erro de orientação do flange: na referência o punho dobra e o flange pende
para baixo; o plano o colocou saindo reto na ponta do antebraço, por decisão
escrita sem conferir contra a imagem.

## Dois achados da própria remoção

A pasta ficou só com `referencias/` dentro, sem receita, e `guarda:acervo`
passou dizendo uma peça medida: pasta de peça órfã é invisível para todo gate.
E quatro testes que travam números do acervo inteiro caíram junto, que é o
custo medido de acrescentar ou tirar peça.

## O enquadramento da bancada não enquadra

Com a interface escondida, `enquadrar()` deixa o quadro da bicicleta ocupando
13,8% da imagem e a checagem de câmera aceita, enquanto a mesma checagem
reprovava por "silhueta cortada" uma imagem com 79% e margem de sobra em todos
os lados. Os dois lados da checagem estão errados, e a imagem que chega ao
crítico é pequena demais para julgar forma.

## O que fazer, em ordem sugerida

O que sobrou é tudo código, e a ordem é por quanto cada um custa contra o que
cada um evita.

Primeiro o enquadramento da bancada, porque é ele que decide se a imagem que
chega ao crítico serve para julgar forma. Junto vai a checagem de câmera, que
hoje erra nos dois sentidos.

Depois a tampa do `loft`, que é barata e desbloqueia afinamento liso, que é
metade do caminho para superfície que não pareça caixa.

Depois a ordem do `guarda:acervo`, para a rodada de alinhamento poder ser
conferida antes de existir malha, que é o barato que a skill promete e não
entrega.

Depois o gate de pasta de peça sem receita, que é pequeno e fecha um buraco
inteiro de invisibilidade.

A medida de junta de flanco e o gate de técnica prometida são maiores e podem
esperar a próxima peça com articulação de verdade, que é quando eles doem.

O descongelamento do vocabulário poligonal continua sendo decisão sua, e é o
teto real de realismo enquanto estiver congelado.

## Riscos e parada

O risco é este plano virar arrumação infinita. O critério de parada é que cada
item tem evidência medida ou commit apontado; item sem evidência sai da lista
em vez de virar tarefa. O braço não precisa ficar bonito para este plano
fechar: ele é sonda e já entregou o que se pedia dele.

## Fechamento

Preencher somente ao concluir ou cancelar.
