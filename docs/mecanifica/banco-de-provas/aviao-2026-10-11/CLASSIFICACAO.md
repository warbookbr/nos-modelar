# Avião de pequeno porte: classificação dos atritos

Fatia 4 do plano [o que o avião pede](../../planos/2026-10-11-o-que-o-aviao-pede.md).
Cada atrito da [referência e da prancha](ATRITOS.md) (R1 a R8) e do
[esboço](esboco/ATRITOS.md) (E1 a E43) entra numa de quatro classes: ferramenta
nova ou primitiva 2.0, correção de ferramenta que já existe, correção do processo
do crítico, ou nada. A contagem de objetos vem da
[contagem por objeto](../../FERRAMENTAS-POR-OBJETO.md). R2 a R5 já foram
corrigidos durante a fatia 2 e não entram.

## Ferramentas novas e primitivas 2.0

**A. Superfície aerodinâmica como família.** Asa, empenagem, leme, profundor e pá
saíram de lofts escritos seção a seção: a seção só aceita polígono convexo (E30),
não gira no próprio plano, e a torção da pá custou 96 expressões à mão (E17); o
mesmo perfil se reescreve em cada seção, cerca de 340 expressões na deriva e no
leme (E34); a blocagem não traduz a pá girada (E5). O crítico apontou as pás
como tira de quinas vivas, o bordo de ataque agudo e a ponta da asa facetada. A
família recebe corda, perfil, espessura, torção, afilamento, enflechamento e
diedro, e entrega a superfície fixa com a de comando separada por fresta e presa
por eixo. A hélice é a mesma família com número de pás em torno de um cubo. O
`aerofolio` não existe hoje e é pedido por 16 objetos da lista (aviões, planador,
helicóptero, drones, turbina, lancha, bomba, entre outros).

**B. Recorte de uma forma por outra no esboço.** Sem subtração, o trem do nariz
atravessa o capô depois de 85 graus do curso (E40), o principal recolhe numa
carenagem sob a asa em vez de dentro dela (ocorrência em E27), a porta só existe
como placa saliente (E26) e o compensador do profundor ficou de fora. A contagem
põe a `booleana` em 9 objetos, mas não marca os aviões, que precisaram dela para
alojamento de trem e porta rebaixada; a contagem subestima a ferramenta, e isso
vai corrigido junto.

**C. Curso de mecanismo no esboço.** O trem gira por um parâmetro, e saber onde o
curso atravessa algo pediu copiar o detalhe e rodar quinze edições à mão (E38,
E42); a instância de componente não gira, e a roda do trem principal precisou de
módulo próprio (E43). A `articula` é parcial e serve a 93 objetos. A ferramenta
declara o curso, varre as posições no gate e grava as poses para o crítico.

**D. Superfície suave por seções.** O capô saiu com faixas em degrau na primeira
rodada, o amortecedor e a ponta da asa saíram facetados, e o crítico apontou isso
em quatro unidades. O `loftSuave` é parcial e serve a 46 objetos.

## Correções de ferramenta que já existe

**Integração do detalhe com o mestre.** O `--integrar` recusa parâmetro
reescrito e deixa órfãos (E13, E19), não leva a `funcao` (E36), não tira a junta
apagada (E37), e o contrato `tocam` não acompanha o detalhe (E41).

**Envelope e maquete.** A caixa da maquete vira restrição mesmo errada (E14, E16,
E27), conta a caixa girada (E22) e não acusa a divisão flap e aileron contrária à
referência (E32); só o `--replanejar` do plano inteiro refaz o Envelope.

**Gate de contato.** Contato de face conta um ponto (E6), peça dentro de outra
reprova mesmo sendo encaixe (E8), o isolado não acusa forma solta na origem (E10)
nem travessia com vizinha oculta (E28).

**Famílias no esboço.** `roda-pneu` e `cilindro-hidraulico` não entram no JSON do
esboço (E7), e o trem usou o componente `roda` e cilindros por `ligar`.

**Referência no esboço.** A conferência por parte não se desliga (E1), as vistas
não aceitam deslocamento de origem (E2), a silhueta da frontal fica só com o
maior pedaço quando uma parte fora do modelo a corta (E3), e o nome do arquivo não
dá a vista (E4).

**Contorno e prancha.** Reflexo cercado pela silhueta fica sem dono (R1); a cota
externa não tem linha de extensão (R6) nem passa da coluna de nomes (R7); a parte
numa fenda não conta como contida (R8).

**Miúdos.** O `arranja` repete uma forma só (E18), a âncora da caixa girada é a da
caixa envolvente (E23), o `--descrever` arredonda a uma casa (E35) e imprime
`[object Object]` (E39).

## Correções do processo do crítico

**O brief diz de que lado cada vista olha e mostra o que as quatro não mostram.**
A frontal olha de +z, e neste objeto isso é a cauda; o crítico do Marco de 75%
deu 7 por ler o leme à frente da deriva (E12, E21, E31). Nenhuma vista olha da
proa, do lado esquerdo nem de baixo, e as unidades dependeram de cortes escolhidos
pelo esbocista.

**O brief vai para arquivo e se reimprime.** O brief da unidade só saía na tela, e
o do Marco não se reimprime (E20, E25); a imagem extra sobrescreve a do brief
(E33); as vistas levam o subtítulo do objeto (E11) e enquadram o avião inteiro
(E9).

**O crítico vê a referência.** Sem ela, reprovou o cone de cauda como agulha e o
esbocista o alargou além da referência (E29).

**O crítico vê o curso inteiro.** O esbocista mostrou 45 e 80 graus, e a travessia
a 90 ficou fora do julgamento (E40).

**A nota de uma unidade não trava as outras que o Marco aponta** (E24).

## Nada

A casca desenha as arestas internas em tracejado nas vistas de fora (E15): é a
convenção do desenho para aresta oculta, e o crítico a leu como detalhe sem pesar
na nota.

## Recomendação para a fatia 5

Construir A, B e as correções do processo do crítico, nessa ordem. A e B são as
faltas que mais custaram e as que impediram o avião de cumprir o alinhamento;
as correções do crítico são baratas e mudaram notas nesta rodada. C e D, as
correções de ferramenta e os miúdos voltam ao backlog com o atrito que os
justifica, salvo o que a pessoa puxar para a fatia 5.

## Segunda rodada

A segunda rodada deixou 44 atritos em [`esboco-r2/ATRITOS.md`](esboco-r2/ATRITOS.md),
classificados aqui em 2026-10-13 pela mesma régua. O 27, a blocagem da forma de
família cortada por molde e da roda de furo aberto, foi corrigido durante a
rodada. O 10 e o 43, o cortador repetido na segunda integração, o 44, a mensagem de
colisão sem o limite, e o 14, a medida do recuo do escape, foram corrigidos no
fechamento do plano. O 8 não procede: a cota da hélice na prancha é a altura
desenhada de lado, e a medida do plano confere a mesma coisa. Ao corrigi-lo, um
esbocista alargou a tolerância da medida para ela passar, o que o processo não
pegou; o [agente](../../../../.claude/agents/esbocista.md) passou a proibir isso.
Os 38 que seguem abertos vão ao [backlog](../../planos/BACKLOG.md), por decisão da
pessoa em 2026-10-13, com a integração como o primeiro grupo a puxar.

**Integração do detalhe com o mestre.** É o grupo que mais custou edição à mão do
mestre. O `--integrar` descarta em silêncio o `subtrai` que o detalhe escreve em
forma de outra unidade, e o trem que recolhe para dentro do capô ou da asa exige
editar a forma alheia no mestre (34, 40); recusa a unidade que traz um módulo novo
(28); não avisa de `plano.medidas`, `plano.pecas` e `plano.referencia` que citam a
forma trocada, que o `--editar` também não alcança (5, 20, 30, 35); as medidas do
plano não descem ao detalhe (11); o `--detalhar` regrava o detalhe existente sem
avisar (15) e deixa imagens soltas na pasta (9). Correção de ferramenta que já
existe.

**Família de superfície aerodinâmica e recorte.** A família não publica âncora de
bordo de fuga nem de espessura na linha de dobradiça, e flap, aileron e nariz do
profundor saíram de 44 expressões e de números calculados fora do módulo (24,
26); recusa corda na raiz acima de 0,8 da envergadura, que a deriva pede (29);
cortar a ponta levantada acusa `recorte-vazio` e dá volume negativo (19); e o
Envelope por `substitui` não aceita a forma de família que cobre duas formas da
maquete (23). Correção de família e de ferramenta.

**Curso de mecanismo.** Uma forma não gira em dois grupos, e o trem que recolhe e
deita a roda saiu com seno e cosseno à mão (36); a linguagem de expressões não tem
`asin` nem `abs` (38); as poses do curso só usam as quatro vistas de sempre e a
unidade de duas metades afastadas sai minúscula, de modo que o fim do curso só se
leu em cortes gerados à mão (37, 41). Ferramenta.

**Conferência, gate e mensagens.** O vidro solto dentro do vão passa na tolerância
de contato (12); a conferência da silhueta não localiza o desvio (3), dá a célula
só à forma mais próxima (31), arredonda a razão a duas casas (21), não aceita
tolerância nem espelho por parte (4, 22) e deixa a maquete passar com o profundor
205 mm mais raso (25); `encaixa.em` não vira porta do Envelope (1); a pá em
bandeira passa na maquete (6); o arranjo radial acusa as pás vizinhas (7); não há
âncora da meia-largura do casco numa cota qualquer (13); e as mensagens da rotação
(2), da travessia "de lado a lado" (18) e da nota de passagem acima de 240
caracteres (32) dizem a causa errada ou nada. Correções miúdas.

**Desempenho.** Cada leitura do mestre leva de 1 a 1,5 minuto, o `--curso` 2
minutos e o `--feito` da unidade 9 minutos, por recalcular as famílias ocultas
(33, 39, 42). A bateria dos gates subiu a 22 minutos pelo mesmo motivo e está sendo
corrigida no fechamento.

**Desenho.** A vizinha em cinza lê como parte da unidade (16) e o cotovelo de
seções retas sai com um leque de traços (17). Correção de ferramenta.
