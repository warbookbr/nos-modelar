# Esquecer precisa falhar

**Estado:** concluído

**Responsável:** a definir · **Base:** `main` em `0adb825`

## Problema observado

O plano anterior fez a peça reprovar quando duas partes se atravessam sem
declaração. A correção funciona, e duas medições desta sessão mostram que ela
não chega a quem precisa.

A primeira é que o veredito é opcional. `--estrito` é uma bandeira que a IA
precisa digitar, pedida apenas no texto de `criar-peca/SKILL.md` e
`auditar-peca/SKILL.md`, e obrigada por gate nenhum. Sem ela, peça atravessada
sai com código zero.

A segunda é que a montagem está descoberta. O código que mede peça atravessando
peça existe, está testado e roda em `auditar-intersecoes-montagem.js`, mas o
resultado é consumido num lugar só, o perfil de montagens do MCP, e vira
descrição para ser lida. O arquivo diz isso de si mesmo na linha 19: a
expectativa ali anota, não julga.

As duas juntas produzem o pior caso. Dentro de uma peça o defeito reprova, desde
que alguém lembre da bandeira; entre peças ele não reprova nunca. E é entre
peças que ele é mais provável, porque quem monta não desenhou as duas.

### Por que a bandeira opcional não se sustenta

O plano anterior mediu que lembrete em prosa é ignorado e que fato impresso na
saída é filtrado. Uma bandeira que precisa ser lembrada é a mesma classe de
coisa: transfere para a memória da IA a decisão de se o veredito existe. Com
prompt curto ninguém digita `--estrito`.

A polaridade correta é a que o plano anterior fixou: esquecer tem de falhar. O
veredito é o padrão, e quem quiser a saída apenas descritiva precisa pedir.

## Resultado

Rodar `descrever` ou `descrever:montagem` sem opção nenhuma já reprova peça ou
montagem com partes se tocando fora do que foi declarado. A montagem declara
seus contatos como a peça faz, e a expectativa que só anotava passa a julgar.
Quem quiser a saída antiga pede explicitamente.

## Filtro Agent-First

Nada de geometria nova. O teste de sólido, a tabela de estados e a ordenação por
gravidade já existem, e a travessia da árvore também. O trabalho é inverter um
padrão, ligar ao código de saída um resultado que já é calculado, e transformar
um campo que anota em um campo que julga.

## Excluído

- corrigir receitas e montagens do acervo. Elas ganham a declaração do que já
  fazem, sem mudar geometria; defeito real é registrado, não corrigido aqui;
- a ancoragem por `encostar`. A operação existe e foi medida nesta sessão; o que
  faltaria era converter receitas não homologadas e escrever regra de estilo, e
  regra em prosa é o que este projeto já mediu ser ignorado;
- a verificação de contato dentro da varredura de parâmetros. Ela depende de
  cada receita declarar a faixa válida de cada número, e nenhuma declara hoje;
- oclusão por contagem de pixel, que o plano anterior já excluiu pelo mesmo
  motivo.

## Invariantes

1. Nenhuma receita ou montagem existente muda de geometria.
2. A declaração continua sendo contrato e não escapatória. Ela diz o que se
   espera antes de medir, e par ausente da lista que se toque reprova.
3. Contato é medido contra o sólido, nunca contra a caixa.
4. A opção que desliga o veredito tem nome explícito e aparece na saída quando
   usada: execução relaxada nunca se parece com execução aprovada.
5. A leitura obrigatória continua em 70 KB ou menos.

## Rodadas

### R00 — o veredito passa a ser o padrão na peça

`descrever` reprova por padrão. A bandeira `--estrito` deixa de ser necessária
e passa a ser aceita sem efeito, para não quebrar chamada existente. Entra uma
opção de sentido oposto, que desliga o veredito e imprime na saída que ele foi
desligado.

Prova: um teste roda `descrever` sem opção nenhuma sobre fixture com contato não
declarado e exige código diferente de zero; outro desliga o veredito e exige
código zero mais a marca de que ele não foi aplicado.

Feito. O veredito roda por padrão, `--estrito` continua aceito sem efeito, e
`--sem-veredito` desliga imprimindo na saída que desligou. Quatro peças do
acervo ganharam a declaração do que já faziam, sem mudar geometria:
`cadeira-de-madeira`, `cutelo-de-sucata`, `gabarito-eixos` e `mancal-guia`.

**Dois defeitos reais que a inversão revelou, registrados e não corrigidos
aqui.** Em `barricada-de-sucata` a receita usa `em` como canto mínimo do cubo,
mas `em` é translação de um cubo centrado na origem: cada volume ficou meia
largura à esquerda e o pilar direito não encosta em nada. Em `bicicleta-urbana`
sobrevive o defeito que originou o plano anterior, `rodaDianteiraPneu ↔
tuboInferior`. Declarar qualquer um seria escapatória, que a invariante 2
proíbe. As duas reprovam, e está correto.

### R01 — a montagem declara seus contatos

O campo `auditoriaIntersecoes.expectativas` da montagem resolvida passa a ser
lido como contrato, no mesmo formato da peça: par de caminhos e motivo com
tamanho mínimo. Par que se toque fora da lista fica marcado como não declarado.
Nome de caminho inexistente falha nomeando os caminhos disponíveis, como já
acontece na peça.

Prova: fixtures com par declarado, não declarado e declaração morta.

Feito em `auditar-intersecoes-montagem.js`. A expectativa deixou de só anotar:
a auditoria passa a devolver `naoDeclarados` e `declaradosSemContato`, com a
mesma ordenação por gravidade da peça. Caminho que a montagem não tem falha
nomeando os caminhos disponíveis, motivo abaixo de 15 caracteres falha, e o
mesmo par declarado duas vezes falha.

**Um limite da medida, encontrado ao escrever as fixtures.** Dois cubos de lado
igual com eixos alinhados, meio sobrepostos, saem como `encostam` e não como
`interpenetram`: todo vértice de um cai exatamente na superfície do outro, o
teste de contenção não acha ponto estritamente dentro, e o veredito cai para o
estado mais leve. O par continua acusado, porque os dois estados contam como
contato, então a reprovação não muda — só a gravidade fica menor que a
realidade. Está fixado por teste para não ser redescoberto por acidente.

### R02 — a montagem reprova

`descrever:montagem` ganha veredito e reprova por padrão quando existe par não
declarado em contato, com a mesma opção de desligamento da R00. O par
inconclusivo nunca conta como livre.

Prova: teste de ponta a ponta sobre as fixtures da R01, exigindo código de
saída diferente de zero, e a verificação de que as montagens do acervo passam
depois de declararem o que já fazem.

Feito em `descrever-montagem-persistida.mjs` e no perfil de montagens do MCP. A
CLI roda a auditoria por padrão, devolve o veredito no JSON e sai com código 1
quando existe par não declarado; `--sem-veredito` desliga e a saída registra
isso. No MCP, o que reprova deixou de ser `interpenetram` cru e passou a ser
contato não declarado: a regra anterior reprovava junta legítima declarada e
deixava passar peças apenas encostando sem declaração.

A montagem do ensaio ganhou a declaração do que já fazia e passou para a versão
4, que transporta `auditoriaIntersecoes`. Entrou a fixture `bloco-fechado.json`:
a `bloco-gabarito` tem duas faces, é malha aberta, e todo par dela sai
inconclusivo em vez de acusado.

### R03 — as skills param de pedir a bandeira

As skills deixam de mandar digitar `--estrito`, porque virou o padrão.

Feito. Saiu de `criar-peca/SKILL.md`, `auditar-peca/SKILL.md` e do
`GUIA-AUTORIA-IA.md`, cujo critério passou a citar contato não declarado e forma
divergente. Relato e plano encerrado mantêm a menção: história é evidência, não
instrução. A leitura obrigatória caiu para 69851 de 70000 bytes.

### R04 — a amostragem da contenção inclui o centroide

A contenção amostrava só os VÉRTICES. Com dois sólidos de lado igual e eixos
alinhados, todo vértice de um cai exatamente na superfície do outro, nenhum fica
estritamente dentro, e metade de volume sobreposto saía como `encostam`. O
centroide de cada triângulo resolve.

Medido antes de propor. No empate, dos 36 vértices nenhum cai dentro; o meio de
aresta acerta 2 de 36 e o centroide 2 de 12, mesmo resultado com um terço dos
pontos. Custo: de 6,23 para 7,02 segundos. Uma sonda adversarial tentou cinco
ataques e nenhum passou como livre; ela mostrou que refinar a malha não abre
brecha, porque o cruzamento é testado triângulo contra triângulo e só a
contenção depende de amostragem.

Feito, com uma correção. Ao entrar, os dois pares do parafuso com as folhas na
dobradiça passaram de `encostam` para `interpenetram`: o parafuso atravessa as
folhas, o estado novo é o certo, e o encaixe segue declarado. A varredura
anterior só cobriu `pecas/` e não alcançou composições. Nenhum veredito de
aprovação mudou; mudou o rótulo de gravidade em cinco pares.

## Fechamento

O gate rodou com um agente sem contexto e o pedido "modele um cavalete de serra
com duas pernas em X cruzadas e uma travessa apoiada em cima", sem nenhuma
menção a contato, atravessamento, declaração ou bandeira. Ele entregou
`cavalete-de-serra.js` declarando os três contatos intencionais com motivo
próprio, e a peça passa com código 0 sem opção nenhuma. Dez parâmetros
declarados, dez vivos, nenhuma medida digitada.

**A ferramenta não chegou a reprovar esse agente, e isso precisa ficar escrito.**
O transcript mostra que ele declarou na primeira escrita da receita. A única
ocorrência de "CONTATO(S) NÃO DECLARADO(S)" ali é ele LENDO o código-fonte de
`descrever-peca.mjs`, não uma saída de comando. Antes disso ele leu a
`cadeira-de-madeira`, que só tem `contatos` porque a R00 os acrescentou horas
antes — ou seja, quem preparou o teste contaminou o ambiente do teste. Um autor
comum não lê a implementação da ferramenta que o julga.

O que ficou provado veio de medida direta, não do comportamento do agente:
removendo o campo `contatos` da peça dele e mais nada, o mesmo comando sai com
código 1 e acusa os três pares — as duas tábuas cruzadas e a travessa contra
cada uma. Com a declaração de volta, código 0. Esquecer falha.

A lição para o próximo gate deste tipo: um teste que exige reprovação depende de
o agente errar, e repetir até alguém errar é caçar o vermelho. A pergunta
verificável é se a ausência de declaração muda o veredito, e essa se responde
tirando a declaração de uma peça pronta.
