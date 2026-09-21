# O que o braço robótico achou

**Estado:** rascunho

**Responsável:** Tiago (autoria) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-mecanifica`, base `fb382368` na main.

## Por que este plano existe

O braço robótico foi modelado para ser instrumento, e não peça. O pedido era
descobrir o que falta no projeto, o que está manual demais e onde o modelador
sofre, usando uma peça nova como sonda. Duas rodadas bastaram para encher esta
lista. A peça em si está em `prototipos/procedural/v3/pecas/braco-robotico/`,
com as duas rodadas registradas ao lado da receita, e serve de evidência de
cada item abaixo.

O achado que governa os outros é este: toda régua deste repositório compara a
peça contra a declaração da própria peça. Quando as duas adotam a mesma
premissa errada, elas concordam entre si e discordam do mundo, e nada acusa. O
braço passou em todas as medidas deitado no chão.

## Achados de fato, já corrigidos

`guarda:referencial` nasceu nesta sessão e está na `main`. Ele confere que
`TOPO.origem` declara y como eixo vertical, que é o que a bancada desenha, e
que nenhum vértice fica abaixo do chão. Disparou duas vezes em caso real: na
declaração, antes de existir geometria, e na malha, depois de a declaração
estar certa. São 32 gates agora.

O visor e `olhar-peca.mjs` procuravam `pecas/<nome>.js` desde que o acervo
migrou para `pecas/<nome>/receita.js`, e respondiam "peça desconhecida" para
todas as peças, inclusive a bicicleta. Ficaram quebrados sem ninguém notar
porque nenhum gate os exercitava. Estão consertados e continuam sem gate.

## Achados de fato, em aberto

A skill `alinhar-modelagem` não pergunta o referencial. As sete perguntas fixas
cobrem objeto, imagens, escala, partes, formas, contatos e critérios, e nenhuma
pergunta qual eixo aponta para cima ou onde fica o chão. Foi essa ausência que
produziu o braço deitado: o plano inventou um referencial porque nada perguntou
qual era o do acervo.

`guarda:acervo` não chega a validar o plano nem as referências quando a peça
ainda não tem geometria. Ele mede os contatos primeiro e para na primeira
falha. A skill promete que a rodada de alinhamento pode ser conferida antes de
existir malha, e na prática isso não acontece.

Nenhum gate confere que a técnica prometida no `PLANO` foi a usada. Na rodada 1
o plano prometia flange com furos booleanos e a entrega foi um disco liso;
parte prometida e não entregue reprova, técnica prometida e não usada, não.

`conferir-pontos` mede uma junta como o centro da região onde as caixas de duas
partes se sobrepõem. Isso é exato quando dois elos se encostam de topo e é
errado quando um entra pelo flanco do outro, que é o caso do cotovelo. O ponto
da junta 3 ficou de fora por isso, e uma peça com articulação de verdade vai
precisar de medida melhor.

As imagens que o crítico visual recebe saem de `tools/bancadas/harness.html`,
que se declara "bancada privada dos gates" e não é a bancada publicada. Nenhum
documento diz isso. Se a bancada ganhar uma vista ou um modo de exibição, o
harness não ganha, e a revisão passa a julgar outra coisa.

O registro de rodada exige nota de 0 a 10 e recusa nota ausente, mas um crítico
que não recebeu alvo legitimamente não tem nota. Ele também limita a observação
a 240 caracteres, o que obriga a cortar o achado para caber no campo.

## O corpus de teste virou um segundo acervo

Resolvido em 2026-09-21. O pedido de apagar todas as receitas do repositório
tinha sido cumprido pela metade: o commit `33fde6a6` moveu a cadeira, a chapa
de fixação e as três prensas de `pecas/` para `tools/fixtures/acervo/` em vez
de apagá-las, com zero linha alterada na maioria dos arquivos, e de lá elas
apareciam na bancada publicada como se fossem acervo, sem marca, com a
varredura descendo dentro das pastas e inventando peças chamadas `cinematico` e
`estrutura`.

As cinco foram apagadas e os testes que as usavam passaram a escrever a própria
entrada mínima; sobrou a `peca-de-prova`, que é entrada das guardas de
navegador. A bancada marca ensaio como ensaio e parou de descer dentro de pasta
de peça. Dois desses testes mediam geometria de verdade, e não encanamento como
eu havia afirmado, e precisaram de receita paramétrica escrita durante o teste.
Um terceiro tinha piso de 300 passos conferidos num acervo que já rendia 329, e
passava por folga e não por prova.

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
"nunca aconteceu". A história inteira tem 1420 commits e só apareceu depois de
um `git fetch --unshallow`. É o mesmo padrão que esta frente já encontrou três
vezes: devolver silêncio em vez de recusar alto.

O repositório também chega sem `node_modules`, e nenhum gate roda antes de um
`npm ci`. Não está escrito em lugar nenhum que eu tenha lido.

## Falhas de condução, e o que elas ensinam

Estas são minhas, e estão aqui porque um gate de processo resolveria cada uma.
Na rodada 1 não despachei o crítico visual embora as medidas tivessem passado,
e olhei a imagem eu mesmo. Na primeira crítica não passei o alvo, e o crítico
reclamou sozinho disso. Nunca rodei `rodada-de-modelagem.mjs --acao`, que a
skill manda perguntar antes de qualquer coisa, e as duas rodadas foram
registradas depois, de memória. Não rodei os gates completos do INDEX antes de
empurrar, e uma mudança de captura derrubou dois testes do MCP que só
apareceram muito depois. E afirmei que não existia render limpo no
repositório, quando `npm run revisar` existe e faz exatamente isso: parei na
primeira ferramenta que respondeu.

## O que a receita apagada levava consigo

O braço foi apagado de propósito, para descobrir o que vivia só na conversa. A
resposta são três coisas, e ficam escritas aqui para o recomeço não repetir.

A tabela inteira. Base de 180 mm de diâmetro por 150 de altura, coluna de 160
por 180, braço de 380 com seção 130 por 110, desvio de cotovelo de 90,
antebraço de 370 afinando de 100 para 85, punho de 100, e flange de 90 por 12
com oito furos numa circunferência de 65 e furo central de 35. Alcance de 850
somando braço, antebraço e punho, altura total de 1180 com o braço esticado.

A divergência medida entre a imagem e a tabela. A referência lateral põe a
razão entre alcance horizontal e altura em 0,73 e a tabela põe em 0,61, porque
a imagem tem leve perspectiva e o antebraço dela é proporcionalmente mais
comprido do que o de um braço real de 850 mm. A decisão foi a tabela mandar, e
isso precisa estar no plano da peça para ninguém corrigir a moto pela silhueta.

O erro de orientação do flange. Na referência o punho dobra e o flange aponta
para baixo, pendurado abaixo do eixo do antebraço. O plano de alinhamento o
colocou na ponta do antebraço, no mesmo eixo, apontando para a frente. Foi
decisão escrita sem conferir contra a imagem, e o crítico não a acusou porque a
pose do modelo era outra.

## Dois achados da própria remoção

A pasta da peça ficou só com `referencias/` dentro, sem receita, e
`guarda:acervo` passou dizendo uma peça medida. Pasta de peça órfã, com imagens
e sem receita, é invisível para todo gate.

Apagar uma peça derrubou quatro testes que travam números do acervo inteiro: o
retrato de parâmetros em dois lugares e o piso de passos conferidos da Oficina.
São testes que fazem o seu trabalho, e também a medida do custo de acrescentar
ou tirar peça.

## O enquadramento da bancada não enquadra

Com a interface escondida, `enquadrar()` deixa o quadro da bicicleta ocupando
13,8% da imagem, e a checagem de câmera do modo de revisão aceita isso. A mesma
checagem tinha reprovado, com "silhueta cortada", uma imagem com 79% de
ocupação e margem de sobra em todos os lados. Os dois lados da checagem estão
errados, e a imagem que chega ao crítico é pequena demais para julgar forma.

## O que fazer, em ordem sugerida

Primeiro os dois que estão na cara do usuário toda vez que ele abre a bancada: a
marca de ensaio na lista e a varredura que para de descer dentro de pasta de
peça.

Depois a pergunta do referencial na skill de alinhamento, que é barata e fecha a
causa do achado que governa esta lista.

Depois o gate de processo: exigir rodada registrada e fechada por
`parar-fechou`, com as imagens vindo de `npm run revisar`, escrito na skill.

Depois a limpeza do corpus, trocando as cinco fixtures por entradas geradas.

A tampa do `loft` e o descongelamento do vocabulário poligonal são decisões de
outra ordem e ficam para depois de a lista acima estar feita.

## Riscos e parada

O risco é este plano virar arrumação infinita. O critério de parada é que cada
item aqui tem evidência medida ou commit apontado; item sem evidência sai da
lista em vez de virar tarefa.

O braço robótico não precisa ficar bonito para este plano fechar. Ele é sonda, e
já entregou o que se pedia dele. Se a forma dele virar trabalho próprio, vira
plano próprio.

## Fechamento

Preencher somente ao concluir ou cancelar.
