# Continuidade arquitetural da Mecanifica

## Objetivo

Este documento preserva a **calibração de julgamento arquitetural** acumulada
durante a evolução da Mecanifica. Ele existe para que uma nova sessão, pessoa ou
agente consiga retomar o projeto sem depender de uma janela de contexto antiga e
sem transformar decisões passadas em dogmas.

A tese central é:

> **Preservar contexto não significa preservar conclusões.**

Este arquivo registra como interpretar decisões, trade-offs, evidências e
heurísticas. Ele não substitui [`VISAO.md`](VISAO.md),
[`ARQUITETURA.md`](ARQUITETURA.md), [`AGENT-FIRST.md`](AGENT-FIRST.md), planos,
issues ou o estado executável do repositório.

Deliberadamente, este documento **não registra rodada atual, branch ativa,
commit corrente ou autorização operacional**. Esses dados envelhecem rápido e
devem permanecer nas fontes de estado e planejamento.

## Como usar este documento

Ao retomar uma decisão arquitetural importante:

1. leia o estado atual no [`INDEX.md`](INDEX.md) e no plano ou issue canônica;
2. use [`AGENT-FIRST.md`](AGENT-FIRST.md) como filtro normativo;
3. use este documento para recuperar a calibração de julgamento e as lições já
   aprendidas;
4. confronte as premissas antigas com o código, testes e evidências atuais;
5. preserve uma decisão somente enquanto os trade-offs que a justificam ainda
   forem verdadeiros.

Se evidência atual contradizer uma conclusão registrada no passado, investigue a
mudança de contexto. Não proteja a conclusão apenas porque ela já foi aceita.

## Postura arquitetural

A Mecanifica deve ser conservadora **com complexidade**, não conservadora **com
mudança**.

A regra não é:

> evitar abstrações novas.

A regra é:

> **evitar complexidade cujo benefício ainda não foi demonstrado.**

Wrappers, refactors, solvers, MCPs, novos contratos ou mudanças estruturais são
opções legítimas quando compram ganhos verificáveis em correção, ergonomia para
IA, custo de contexto, composição, diagnóstico, segurança ou manutenção.

Uma decisão arquitetural atual deve ser tratada como **hipótese calibrada para o
estado atual do sistema**. Evidência nova pode reclassificá-la.

> **Evidência nova tem precedência sobre decisão histórica.**

## O que significa Agent-First na prática

O filtro formal está em [`AGENT-FIRST.md`](AGENT-FIRST.md). A calibração
acumulada acrescenta uma interpretação importante: o objetivo não é maximizar
quantidade de features nem minimizar tokens isoladamente.

O objetivo é permitir que um agente consiga:

- expressar intenção mecânica sem carregar detalhes internos desnecessários;
- construir sistemas complexos por composição;
- reencontrar elementos por identidade estável;
- compreender o estado relevante sem reconstruir toda a sessão;
- diagnosticar por que uma operação falhou;
- corrigir o próprio erro com evidência suficiente;
- evitar publicação parcial, ambígua ou semanticamente incorreta;
- combinar capacidades sem depender de uma porta específica como MCP, CLI ou
  API.

Uma abstração é boa quando reduz **complexidade acidental** sem retirar controle,
verificabilidade ou capacidade de diagnóstico.

## A escada de decisão é uma heurística, não uma preferência estética

A sequência definida no filtro Agent-First continua sendo:

**USAR DIRETO → ENVOLVER → REFATORAR → ADIAR**

Ela deve ser interpretada assim:

### USAR DIRETO

Prefira quando o contrato existente já permite uso correto, previsível e
inspecionável pela IA.

Não adicione uma camada apenas para obter simetria, nomes mais elegantes ou uma
arquitetura aparentemente mais pura.

### ENVOLVER

Crie uma camada semântica quando ela reduz de maneira concreta custo cognitivo,
quantidade de operações, exposição de detalhe irrelevante ou risco de uso
incorreto, preservando diagnóstico e controle suficientes.

### REFATORAR

Refatore quando o problema está no contrato ou no comportamento fundamental e
um wrapper apenas esconderia a deficiência.

### ADIAR

Adiar é correto quando o benefício ainda não justifica a complexidade, os
requisitos permanecem especulativos ou a próxima abstração dependeria de
hipóteses que ainda não foram provadas.

Adiar nunca significa proibir permanentemente.

## Princípios versus decisões atuais

Documentação e coordenação devem distinguir **princípios relativamente
estáveis** de **decisões circunstanciais**.

Exemplo de princípio:

> Complexidade nova deve justificar seu custo por benefício verificável.

Exemplo de decisão circunstancial:

> Uma nova ferramenta MCP não é necessária neste recorte.

O primeiro pode permanecer válido durante muitas fases. O segundo pode mudar
assim que aparecer uma necessidade concreta.

Sempre que possível, registre também **por que** uma decisão foi tomada. Sem a
premissa original, uma instância futura não consegue saber se a conclusão ainda
faz sentido.

## Motor existente e camada semântica

O núcleo procedural existente deve ser tratado como infraestrutura enquanto seus
contratos continuarem adequados e comprovados.

A direção preferida é conceitualmente:

```text
IA
→ capacidades semânticas
→ contratos neutros e testáveis
→ motor existente
```

Isso não autoriza criar automaticamente uma camada para cada função do motor.
Uma camada semântica precisa comprar algo real: menor custo de contexto, menos
passos, mais segurança, melhor composição ou diagnóstico mais claro.

Da mesma forma, preservar um núcleo que funciona não significa blindá-lo contra
refatoração. Se evidência mostrar que o próprio contrato impede uma superfície
Agent-First confiável, refatorar passa a ser a opção correta.

## Peça e montagem são abstrações diferentes

Uma peça pode ser convenientemente representada por uma receita geométrica
determinística. Uma montagem resolve outro problema: composição persistente de
instâncias com identidade, pose, relações e estrutura recursiva.

Objetos complexos não devem tender a receitas monolíticas gigantescas.

A calibração atual favorece construir sistemas a partir de unidades menores que
possam ser identificadas, inspecionadas, alteradas e revalidadas sem exigir que
o agente trate o conjunto inteiro como uma única definição geométrica.

## Composição antes de sofisticação

Antes de automatizações mais sofisticadas, a fundação precisa permitir de forma
confiável:

1. criar unidades simples;
2. combiná-las;
3. identificar cada elemento;
4. representar relações entre elementos;
5. persistir o conjunto;
6. consultar o estado relevante;
7. alterar partes específicas;
8. diagnosticar inconsistências.

Solver, física, CAD mais sofisticado ou automação de alto nível podem ser muito
valiosos. O ponto não é adiá-los por princípio, mas evitar construir essas
camadas sobre identidade, persistência ou composição ainda frágeis quando isso
aumentaria o custo de correção posteriormente.

## Identidade é arquitetura, não detalhe de serialização

Quando um agente reconhece semanticamente um elemento — por exemplo, uma roda
específica de uma montagem — ele precisa conseguir reencontrá-lo entre leitura,
edição, persistência e reconstrução.

Identidade instável aumenta custo de contexto porque força o agente a reconstruir
referências continuamente e torna relações, diagnóstico e edição incremental
mais frágeis.

Por isso, escolhas de identidade devem ser avaliadas junto com composição e
persistência, e não apenas no momento de serializar dados.

## Ergonomia não pode destruir diagnóstico

Agent-First não significa esconder o máximo possível.

Significa expor **a menor quantidade de informação suficiente para ação e
correção confiáveis**.

Uma API curta que converte falhas em mensagens opacas pode ser pior para uma IA
do que uma interface ligeiramente mais explícita que informa:

- o que foi tentado;
- sobre qual entidade;
- qual contrato foi violado;
- qual estado relevante foi encontrado;
- o que impediu a operação de prosseguir.

Redução local de tokens pode aumentar o custo total da tarefa se o agente perde a
capacidade de diagnosticar e corrigir.

## Determinismo e falha segura

Operações centrais devem ser determinísticas quando o domínio permitir.

Identidade ambígua, referência inválida, relação inexistente, estado
incompatível ou pré-condição não satisfeita não devem ser normalizados
silenciosamente por uma suposição arbitrária.

Quando não houver contrato explícito para resolver a ambiguidade, prefira
**fail-closed com diagnóstico** a produzir silenciosamente um estado plausível,
mas semanticamente incorreto.

Isso não significa que o sistema nunca possa inferir. Inferência é válida quando
faz parte de um contrato explícito, verificável e suficientemente seguro.

## Relação persistida não implica solver automaticamente

Representar uma relação mecânica e resolver automaticamente essa relação são
capacidades diferentes.

Uma progressão saudável pode ser:

```text
intenção
→ identidade
→ relação persistida
→ validação
→ resolução automática, quando justificada
```

Essa separação mantém cada camada observável e permite que requisitos reais de
solver apareçam a partir do uso, em vez de serem inventados antecipadamente.

Se um caso concreto demonstrar que persistir sem resolver cria mais custo ou
risco do que benefício, essa ordem também pode ser revista.

## Lição da escrita por portas externas

A experiência de autoria por MCP mostrou uma distinção importante: expor leitura
de estado existente é muito diferente de publicar escrita.

Escrita exige garantias adicionais, especialmente quando existe risco de estado
parcial, sobrescrita concorrente ou publicação não atômica.

A lição durável não é "não escrever por MCP". É:

> **uma porta de acesso não deve prometer uma garantia que a capacidade interna
> ainda não consegue sustentar.**

MCP, CLI, API ou outra porta devem permanecer consumidores de contratos do
sistema. Nenhuma deve forçar a arquitetura interna a se organizar em função da
porta.

## Não abstrair antecipadamente

Antes de criar uma nova camada:

1. observe o comportamento real da capacidade existente;
2. identifique a limitação ou atrito concretos;
3. verifique se o problema é recorrente ou estrutural;
4. determine qual benefício uma abstração compraria;
5. aplique a escada USAR DIRETO, ENVOLVER, REFATORAR ou ADIAR.

Uma arquitetura Agent-First não deve virar uma coleção de wrappers
especulativos.

Ao mesmo tempo, esta heurística não deve ser usada para bloquear uma melhoria
cujo ganho já esteja demonstrado apenas porque ela introduz uma abstração nova.

## Coordenação preserva arquitetura

Separar coordenação arquitetural de execução técnica mostrou valor porque reduz
o risco de uma rodada começar com uma hipótese e terminar implementando
silenciosamente outra arquitetura.

Em geral, a coordenação deve definir escopo, invariantes, critérios, interpretar
evidências e decidir a próxima rodada. A execução deve investigar, implementar,
testar e relatar o estado observado dentro do recorte autorizado.

Quando a realidade contradiz a premissa da rodada, a divergência deve ser
exposta antes de ser normalizada.

Práticas operacionais que protegem essa rastreabilidade incluem:

- não improvisar mudança de escopo diante de divergência relevante;
- não trabalhar sobre estado inesperadamente sujo sem compreender sua origem;
- separar constatação de interpretação;
- publicar evidência no canal canônico da rodada;
- encerrar a rodada quando seu escopo autorizado termina;
- não transformar descoberta lateral automaticamente em implementação nova.

Os detalhes operacionais de coordenação ficam nos documentos específicos. Esta
seção preserva apenas a razão arquitetural dessas práticas.

## Como avaliar uma nova abstração

Uma proposta importante deveria conseguir responder, preferencialmente com
evidência:

- qual problema concreto resolve;
- para quem esse problema existe;
- com que frequência ele ocorre;
- quanto contexto ou quantas operações elimina;
- quais estados ou modos de falha adiciona;
- se o agente continua conseguindo diagnosticar problemas;
- se compõe com o restante do sistema;
- se preserva identidade e verificabilidade;
- qual custo de manutenção introduz;
- o que acontece se simplesmente não a criarmos ainda.

Uma solução tecnicamente sofisticada pode ser rejeitada se não justificar esses
trade-offs. Uma solução que contradiga decisão antiga pode ser aceita se sua
evidência for melhor.

## Ordem estratégica como preferência revisável

A maturidade acumulada favorece, de maneira aproximada:

```text
correção
→ identidade
→ persistência
→ composição
→ diagnóstico
→ ergonomia
→ automação mais sofisticada
```

Isto **não é roadmap nem dependência rígida**. Capacidades evoluem em paralelo e
uma oportunidade concreta pode justificar outra ordem.

A função dessa preferência é lembrar que automação sofisticada geralmente vale
mais quando o agente consegue compreender e corrigir a estrutura sobre a qual a
automação opera.

## Sinal de maturidade de uma capacidade

Uma feature não está madura para agentes apenas porque o happy path funciona.
Considere também:

- descoberta;
- contrato compreensível;
- entrada validável;
- saída estruturada;
- identidade;
- diagnóstico;
- previsibilidade;
- possibilidade de correção;
- composição com operações posteriores.

Uma capacidade pode estar tecnicamente pronta e ainda ser ergonomicamente
imatura para autoria por IA.

## Armadilhas recorrentes

### Arquitetura por estética

Refatorar algo estável apenas porque outra estrutura parece conceitualmente mais
limpa.

### Feature por disponibilidade

Expor uma capacidade apenas porque uma função interna já existe.

### Wrapper sem ganho

Adicionar uma camada que não reduz complexidade para quem a consome.

### Automação prematura

Resolver automaticamente um problema cuja intenção ou identidade ainda não está
representada de modo confiável.

### API mágica

Diminuir parâmetros ou passos sacrificando previsibilidade, verificabilidade ou
diagnóstico.

### Contexto gigante como arquitetura

Depender da IA lembrar de uma longa sequência de decisões anteriores para usar
corretamente uma capacidade.

### Documentação como dogma

Transformar uma decisão histórica em restrição permanente simplesmente porque
ela foi registrada.

### Conservadorismo como veto

Usar "não abstrair antecipadamente" para impedir uma melhoria já sustentada por
evidência real.

## Questões abertas são parte do projeto

Quando ainda não existe informação suficiente, registrar uma questão aberta é
melhor que cristalizar uma arquitetura especulativa.

Quando útil, uma questão aberta deve registrar:

- o que ainda não sabemos;
- que evidência reduziria a incerteza;
- quais decisões dependem dela;
- qual é o custo de esperar.

Incerteza explícita é mais segura que certeza inventada.

## Regra final

A arquitetura deve acumular aprendizado sem acumular dogmas.

Cada nova camada precisa justificar sua existência. Cada decisão anterior pode
ser reaberta. Cada abstração deve tornar o sistema mais compreensível, seguro ou
eficiente para o agente que a utiliza.

O objetivo não é produzir a arquitetura mais elaborada. É produzir uma
arquitetura na qual uma IA consiga **construir, compreender, diagnosticar,
corrigir e evoluir sistemas mecânicos complexos de maneira confiável**.
