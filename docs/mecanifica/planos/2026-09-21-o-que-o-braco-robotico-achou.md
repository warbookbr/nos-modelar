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

O pedido de apagar todas as receitas do repositório foi cumprido pela metade. O
commit `33fde6a6` não apagou a cadeira, a chapa de fixação nem as três prensas:
moveu as cinco de `prototipos/procedural/v3/pecas/` para
`tools/fixtures/acervo/`, com zero linha alterada na maioria dos arquivos. A
mensagem do commit diz "reduz o acervo publicado", que é o que foi feito, e não
diz que o pedido era outro.

O efeito aparece na bancada publicada. As cinco são listadas junto com o acervo
de verdade, sem marca de ensaio, sob um cabeçalho que chama tudo de acervo. E a
varredura desce dentro das pastas de prensa, que têm `estrutura.js`,
`cinematico.js` e `ferramentas.js` em vez de `receita.js`, e lista cada arquivo
como peça própria: três pastas diferentes produzem três entradas chamadas
`cinematico`, nenhuma delas abrindo coisa que faça sentido sozinha.

O conteúdo dessas cinco também não se justifica. Os testes que as usam conferem
encanamento: se `resolver-caminho-receita` acha a receita pelo nome e bloqueia
caminho que sai do repositório, se `parametros-peca` troca um número sem
estragar o resto, se `varrer-peca` entende a faixa `min..max:passos`. Nenhum
deles olha forma, distância entre partes ou aparência. Para eles aquelas peças
são um arquivo com números dentro, e uma entrada mínima escrita no próprio
teste provaria o mesmo. O único que precisa de arquivo em disco é o de resolver
caminho, e mesmo ele pode criar uma pasta temporária.

A recomendação é ficar com uma fixture real, a `peca-de-prova`, que foi feita
para ser entrada das guardas de navegador e nada mais, e trocar o resto por
entradas geradas.

## Atrito do motor

`loft` não fecha as próprias tampas. O antebraço deveria afinar liso de 100 para
85 mm, e a malha sairia aberta, o que deixa a medida de contato incapaz de
decidir os pares. O modelador trocou por três cilindros em degraus, e é por isso
que o antebraço tem aqueles degraus visíveis. Uma tampa automática quando a
seção final tem raio maior que zero resolve.

`cilindro` é o único gerador cuja origem sem `tampa` seleciona só as laterais,
então citar um cilindro inteiro custa três passos. A primeira rodada saiu com
doze faces sem identidade por causa disso.

O motor tem `arredondarAresta`, `filete`, `liso`, `inflate`, `displace` e
`lathe`, e a receita do braço usa `cilindro` nove vezes, `chamferBox` uma e
`furo` uma. O aspecto quadrado não é o teto do motor, é o que foi alcançado, e
nada no plano, nas skills ou nos gates aponta o modelador para as operações que
tiram a aresta viva. O teto real de realismo é outro: o vocabulário poligonal da
bancada está congelado, e é ele que traz subdivisão e bisel em aresta
arbitrária.

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

Na rodada 1 eu não despachei o crítico visual, embora as medidas tivessem
passado. Olhei a imagem eu mesmo e trouxe a conclusão, que é exatamente o
defeito que o papel separado existe para cobrir.

Na primeira crítica eu não passei o alvo, e o crítico reclamou sozinho disso.

Eu nunca rodei `node tools/mecanifica/rodada-de-modelagem.mjs --acao`, que a
skill manda perguntar antes de qualquer coisa. As duas rodadas foram registradas
depois, de memória.

Não rodei os gates completos do INDEX em nenhum momento desta frente.

Afirmei que não existia render limpo no repositório, e existe: `npm run revisar`
captura ortográfica, com enquadramento automático e uma checagem que reprova
quando a peça fica pequena no quadro. Eu não a encontrei porque parei na
primeira ferramenta que respondeu.

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
