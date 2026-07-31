# Referência e crítica visual — protocolo de modelagem

Este documento organiza como uma IA transforma imagens de referência em
critérios verificáveis, revisa uma peça durante a modelagem e distingue falha de
execução de capacidade ausente na linguagem. Ele é um protocolo experimental,
não uma skill e não abre sozinho trabalho de implementação.

## Princípio

Uma referência visual não deve virar uma ordem genérica como “faça mais
realista”. Antes de modelar, ela vira um **briefing da peça**: um artefato curto,
específico daquela tarefa, com regiões, relações e enquadramentos observáveis.

Instruções ajudam a IA a notar um problema; não substituem uma operação
geométrica que a linguagem ainda não possui. Toda divergência encontrada é
classificada como:

1. **ajuste:** a capacidade existe e bastam parâmetros ou proporções;
2. **remodelagem local:** a capacidade existe, mas a região precisa ser refeita;
3. **capacidade ausente:** a intenção não é expressável de forma editável,
   semântica e determinística no vocabulário atual.

Só a terceira classe pode justificar mudança na linguagem de autoria.

## Papéis

### Orquestrador

- separa verdade técnica de aparência;
- escolhe vistas comparáveis e o perfil de autoria;
- propõe o briefing e, quando útil, o debate com o usuário;
- mantém o checklist curto e priorizado;
- não transforma cada detalhe observado em requisito obrigatório.

### Modelador

- constrói e refina por região, preservando identidade semântica;
- produz as mesmas vistas canônicas em cada marco;
- responde ao checklist com evidência;
- informa quando uma correção depende de capacidade ausente.

### Crítico visual

Recebe as referências, os renders atuais nas mesmas vistas e o nível de
realismo desejado. Na primeira passada, não recebe justificativas nem o histórico
de construção: avalia o resultado, não a narrativa do modelador.

O crítico aponta no máximo cinco divergências prioritárias. Para cada uma,
informa:

- região e vista em que aparece;
- evidência visual observável;
- impacto em silhueta, proporção, profundidade, transição ou fabricação;
- classificação provável: ajuste, remodelagem local ou capacidade ausente;
- condição visual de aceite, sem prescrever uma sequência rígida de comandos.

Uma segunda passada opcional pode receber o vocabulário disponível para revisar
a classificação de viabilidade. O crítico não edita a peça.

## Pergunta-base para o crítico

> Compare a peça atual com as referências considerando silhueta, proporções,
> continuidade entre superfícies, espessura, profundidade, acabamento de bordas
> e detalhes funcionais. Liste no máximo cinco divergências que mais impedem
> atingir o nível de realismo solicitado. Para cada uma, indique a região
> visual, a evidência observável, a condição de aceite e se a correção parece
> exigir ajuste, remodelagem local ou capacidade ausente.

Uma crítica sem referência pode ser usada depois para perguntar o que parece
artificial, desconectado ou estruturalmente improvável. Ela não substitui a
comparação principal.

## Fluxo

1. Fixar perfil de autoria, distância mínima e orçamento.
2. Reunir referência técnica e referência de aparência separadamente.
3. Gerar briefing com no máximo oito itens e vistas de prova.
4. Permitir revisão do usuário quando o resultado visual for subjetivo.
5. Modelar envelope e interfaces; depois, uma região por vez.
6. Renderizar vistas canônicas equivalentes às referências.
7. Rodar crítica intermediária, limitada às cinco maiores divergências.
8. Classificar cada divergência e corrigir somente as prioritárias.
9. Repetir uma vez; nova rodada exige evidência de ganho ou bloqueio real.
10. Integrar somente depois dos gates semânticos, geométricos e visuais.

O fluxo tem limite: checklist e crítica não crescem indefinidamente. Divergência
não prioritária vai para backlog da peça.

## Aplicação à roda dianteira

As imagens analisadas justificam observar:

- afunilamento e curvatura dos raios;
- transição raio–cubo sem degrau seco;
- transição raio–aro com abertura gradual;
- rebaixos do miolo e assentamentos dos fixadores;
- bordas controladas: nem infinitamente afiadas, nem polidas por inteiro;
- profundidade comprovada nas vistas lateral e perspectiva;
- equivalência entre instâncias radiais.

Isso ainda não autoriza implementar todas as capacidades sugeridas. A ordem
vigente é:

1. encerrar a Fundação de autoria v1;
2. executar O-13 em ciclo próprio, reduzindo a expansão radial manual;
3. abrir Realismo geométrico v1 somente com uma ou duas capacidades escolhidas
   a partir da crítica da roda.

“Auto polimento” global não é capacidade candidata. Se a prova exigir
acabamento, a hipótese é filete ou bevel **seletivo**, endereçado semanticamente,
para preservar arestas mecânicas e encaixes.

## Quando isso pode virar skill

O briefing de uma roda continua sendo artefato da roda. Um guia só vira skill
depois de o mesmo padrão:

- funcionar em pelo menos duas peças de famílias diferentes;
- ser usado por outra sessão ou agente;
- produzir crítica acionável sem depender do histórico desta conversa;
- separar orientação útil de capacidade geométrica ausente;
- ter comandos, saídas e armadilhas estáveis.

Antes disso, manter o protocolo em documentação evita congelar cedo demais uma
receita específica de objeto.
