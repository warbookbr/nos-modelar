# Esquecer precisa falhar

**Estado:** ativo

**Responsável:** a definir · **Base:** `main` em `0adb825`

## Problema observado

O plano anterior fez a peça reprovar quando duas partes se atravessam sem
declaração. A correção funciona, e duas medições desta sessão mostram que ela
não chega a quem precisa.

A primeira é que o veredito é opcional. `--estrito` é uma bandeira que a IA
precisa digitar, e ela está pedida apenas no texto de duas skills,
`criar-peca/SKILL.md` e `auditar-peca/SKILL.md`. Nenhum gate obriga, nenhum
comando falha se ela for esquecida. Quem chama `npm run descrever` sem a
bandeira recebe a mesma saída de sempre e código de saída zero, com a peça
atravessada.

A segunda é que a montagem inteira está descoberta. O código que mede peça
atravessando peça em uma montagem existe, está testado e roda em
`auditar-intersecoes-montagem.js`. O resultado é consumido em um único lugar, o
perfil de montagens do MCP, e vira descrição para ser lida. Nenhum comando
termina com erro por causa dele. O arquivo diz isso de si mesmo na linha 19: a
expectativa ali anota, não julga.

As duas juntas produzem o pior caso possível. Dentro de uma peça o defeito
reprova, desde que alguém lembre da bandeira. Entre peças de uma montagem ele
não reprova nunca. Montagem é onde o defeito é mais provável, porque quem monta
não desenhou as duas peças ao mesmo tempo, e é para onde o projeto vai.

### Por que a bandeira opcional não se sustenta

O plano anterior mediu que lembrete em prosa é ignorado e que fato impresso na
saída é filtrado. Uma bandeira que precisa ser lembrada é a mesma classe de
coisa: ela transfere para a memória da IA a decisão de se o veredito existe.
Com prompt curto, do tipo "modele uma bicicleta", ninguém digita `--estrito`, e
o projeto volta a aprovar peça atravessada com código de saída zero.

A polaridade correta é a que o plano anterior fixou para a declaração: esquecer
tem de falhar. Aplicada à bandeira, isso significa que o veredito é o padrão e
quem quiser a saída apenas descritiva precisa pedir.

## Resultado

Rodar `descrever` ou `descrever:montagem` sem nenhuma opção já reprova peça ou
montagem com partes se atravessando fora do que foi declarado. A montagem
declara seus contatos intencionais do mesmo jeito que a peça, e a expectativa
que hoje só anota passa a julgar. Quem quiser a saída antiga, sem veredito,
pede explicitamente.

## Filtro Agent-First

Nada de geometria nova. O teste exato de sólido, a tabela de estados e a
ordenação por gravidade já existem em `contato-de-solidos.js` e
`contatos-da-peca.js`, e a travessia da árvore da montagem já existe em
`auditar-intersecoes-montagem.js`. O trabalho é inverter um padrão, ligar um
resultado que já é calculado ao código de saída, e transformar um campo que
anota em um campo que julga.

## Excluído

- corrigir as receitas e montagens do acervo. Elas ganham a declaração do que
  já fazem, sem mudar geometria. Se alguma reprovar por defeito real, o defeito
  é registrado e não corrigido dentro deste plano;
- a ancoragem por `encostar`. A operação existe, funciona e foi medida nesta
  sessão, e o que faltaria seria converter receitas não homologadas e escrever
  regra de estilo. Regra em prosa é o que este projeto já mediu ser ignorado;
- a verificação de contato dentro da varredura de parâmetros. Ela depende de
  cada receita declarar a faixa válida de cada número, e nenhuma declara hoje;
- oclusão por contagem de pixel, que o plano anterior já excluiu pelo mesmo
  motivo.

## Invariantes

1. Nenhuma receita ou montagem existente muda de geometria.
2. A declaração continua sendo contrato e não escapatória. Ela diz o que se
   espera antes de medir, e par ausente da lista que se toque reprova.
3. Contato é medido contra o sólido, nunca contra a caixa.
4. A opção que desliga o veredito existe, tem nome explícito e aparece na
   saída quando usada, para que uma execução relaxada nunca se pareça com uma
   execução aprovada.
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
largura à esquerda, a viga inferior ocupa de −2,40 a 0,00 em vez de −1,20 a
1,20, e o pilar direito não encosta em nada. Em `bicicleta-urbana` sobrevive o
defeito que originou o plano anterior, `rodaDianteiraPneu ↔ tuboInferior` por
`intersecao-de-superficies`. Declarar qualquer um seria usar a declaração como
escapatória, que a invariante 2 proíbe. As duas reprovam, e está correto.

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

A montagem do ensaio ponta a ponta ganhou a declaração do que já fazia e passou
da versão 3 para a 4, que é a que transporta `auditoriaIntersecoes`. Entrou a
fixture `bloco-fechado.json`, um cubo de seis faces: a `bloco-gabarito` tem duas
faces, é malha aberta, e todo par dela sai inconclusivo em vez de acusado.

### R03 — as skills param de pedir a bandeira

`criar-peca/SKILL.md` e `auditar-peca/SKILL.md` deixam de mandar digitar
`--estrito`, porque o comportamento passou a ser o padrão. O texto removido
libera espaço na leitura obrigatória, que hoje está em 69869 de 70000 bytes.

Prova: `npm run leitura:obrigatoria` e os gates completos.

Feito. Saiu das duas skills e do `GUIA-AUTORIA-IA.md`, cujo critério passou a
citar contato não declarado e forma divergente. Relato e plano encerrado
mantêm a menção: história é evidência, não instrução. A leitura obrigatória caiu
para 69851 bytes.

### R04 — a amostragem da contenção inclui o centroide

O teste de contenção amostra só os VÉRTICES dos triângulos. Com dois sólidos de
lado igual e eixos alinhados, todo vértice de um cai exatamente na superfície do
outro, nenhum ponto fica estritamente dentro, e sobreposição real de metade do
volume sai como `encostam`. Somar o centroide de cada triângulo resolve.

Medido antes de propor. No empate, dos 36 vértices nenhum cai dentro; o meio de
aresta acerta 2 de 36 e o centroide 2 de 12, mesmo resultado com um terço dos
pontos. No acervo inteiro nenhuma peça mudou de código de saída nem de
quantidade de pares acusados; só a `barricada-de-sucata` mudou o estado de três
pares, de `encostam` para `interpenetram`, e ela é a peça com defeito real. O
custo foi de 6,23 para 7,02 segundos, treze por cento.

Uma sonda adversarial tentou cinco ataques com a amostragem nova — malha
grosseira, haste fina atravessando chapa fina, penetração por quina, sólidos
idênticos e malha aberta — e nenhum passou como livre. Ela derrubou uma
suposição: a haste fina não passa entre os triângulos da chapa, porque o
cruzamento é testado triângulo contra triângulo, e não por amostragem. O único
código 0 com sobreposição real foi malha aberta, que sai inconclusiva e nunca
livre.

Prova: uma fixture com o caso do empate exigindo `interpenetram`, e a suíte
completa verde sem mudança de veredito no acervo.

## Fechamento

Este plano fecha quando um agente sem contexto receber o pedido mínimo "modele
uma montagem com duas peças que se atravessam" e o resultado reprovar sem que
ninguém digite bandeira nenhuma.
