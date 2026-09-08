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

Prova: um teste que roda `descrever` sem opção nenhuma sobre uma fixture com
contato não declarado e exige código de saída diferente de zero; outro que roda
com a opção de desligar e exige código zero mais a marca de que o veredito não
foi aplicado.

### R01 — a montagem declara seus contatos

O campo `auditoriaIntersecoes.expectativas` da montagem resolvida passa a ser
lido como contrato, no mesmo formato da peça: par de caminhos e motivo com
tamanho mínimo. Par que se toque fora da lista fica marcado como não declarado.
Nome de caminho inexistente falha nomeando os caminhos disponíveis, como já
acontece na peça.

Prova: fixtures de montagem com par declarado, par não declarado e declaração
morta, cobrindo os três casos.

### R02 — a montagem reprova

`descrever:montagem` ganha veredito e reprova por padrão quando existe par não
declarado em contato, com a mesma opção de desligamento da R00. O par
inconclusivo nunca conta como livre.

Prova: teste de ponta a ponta sobre as fixtures da R01, exigindo código de
saída diferente de zero, e a verificação de que as montagens do acervo passam
depois de declararem o que já fazem.

### R03 — as skills param de pedir a bandeira

`criar-peca/SKILL.md` e `auditar-peca/SKILL.md` deixam de mandar digitar
`--estrito`, porque o comportamento passou a ser o padrão. O texto removido
libera espaço na leitura obrigatória, que hoje está em 69869 de 70000 bytes.

Prova: `npm run leitura:obrigatoria` e os gates completos.

## Fechamento

Este plano fecha quando um agente sem contexto receber o pedido mínimo "modele
uma montagem com duas peças que se atravessam" e o resultado reprovar sem que
ninguém digite bandeira nenhuma.
