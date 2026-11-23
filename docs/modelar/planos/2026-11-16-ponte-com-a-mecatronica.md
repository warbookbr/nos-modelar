# Ponte com a mecatrônica: a ficha do objeto exportada, as portas elétricas declaradas e o pedido que volta conferido

**Estado:** rascunho

**Território:** a declarar ao ativar; deve ficar num módulo novo `modulos/ficha-do-objeto/` (a exportação da ficha e a leitura e conferência do pedido), na declaração de portas da autoria (`procedural/familias/componente-eletronico/` e as partes que publicam portas), em `procedural/pecas/braco-robotico/` (as portas e o pedido cumprido) e em `docs/modelar/banco-de-provas/ponte-mecatronica-<data>/`.

**Responsável:** a IA da sessão implementa; Tiago aprova a forma por imagem e decide o que fazer com pedido que mude forma aprovada.

**Repositório e base:** `warbookbr/nos-modelar`, main na ativação; o outro lado do contrato é `warbookbr/nos-mecatronica`, pelo contrato da ponte (o README da pasta `ponte/` de lá) e pela decisão 0001 de lá, que separa a forma da simulação.

Gerado pelo plano-raiz [o lado Modelar da mecatrônica](2026-11-16-eletronica-no-modelar.md), fatia 2. Objeto-alvo: o braço robótico, o mesmo do [plano da família de componentes](../decisoes/PLANOS-ENCERRADOS.md).

## Problema observado

A simulação de ligações, circuito, programa e física de um objeto do Modelar mora no repositório nos-mecatronica, que nunca edita geometria: ele lê uma ficha do objeto que o Modelar exporta e devolve um pedido (espaço, posição, passagem, saída de ar) que o Modelar cumpre e confere. Hoje o Modelar não exporta essa ficha. A montagem semântica ([`MONTAGENS-SEMANTICAS.md`](../usar/MONTAGENS-SEMANTICAS.md)) já tem instâncias com identificador, posição e portas mecânicas publicadas pelas partes, e os exportadores em `modulos/` já escrevem a malha, mas nada junta isso num arquivo que outro repositório leia, as portas não dizem que são elétricas nem de que tipo, nenhuma peça declara massa, e não há leitor que confira um pedido contra a montagem. Na matriz da mecatrônica, as linhas `ponte-ficha-exportada`, `ponte-portas-eletricas`, `ponte-massa-e-inercia`, `ponte-pedido-cumprido` e `ponte-verificacao-no-modelar` têm o Modelar como dono e estão em `falta`.

## Resultado

O Modelar exporta por comando a ficha do braço robótico (geometria, peças com identificador estável, posição e giro na montagem, portas com posição e tipo, inclusive as elétricas, e massa onde houver material com densidade declarada), reproduzida igual em duas exportações e aceita pelo esquema da ponte, e lê um pedido escrito pela mecatrônica, recusando o item que cita peça ou porta que não existe e dizendo, item a item, se o espaço, a posição e a passagem pedidos estão atendidos na montagem.

## Filtro Agent-First

Exportação da ficha: CRIAR em `modulos/ficha-do-objeto/`, ao lado dos exportadores, com o mesmo padrão deles (comando, saída determinística, teste). Ela lê a montagem resolvida e as peças, e o núcleo não ganha nada que fale de eletrônica nem de simulação; a intenção do autor é "exporte a ficha deste objeto", e o comando devolve o arquivo e o relatório do que é medido, declarado ou estimado.

Portas elétricas: ENVOLVER a porta que as partes já publicam, com um campo geral de tipo de porta declarado na autoria (alimentação, terra, sinal digital, sinal analógico, barramento, fase de motor, como o contrato da ponte lista), e a família de componentes do plano 1 publicando as portas de cada encapsulamento. Se a porta precisar de campo novo no formato salvo da montagem, o plano para e a pessoa decide, com o caminho de migração das montagens salvas.

Massa e inércia: ADIAR o que exigir material com densidade que a receita não declara; a ficha leva a massa só da peça que a declare ou cujo material a tenha, marcada como estimativa, e o resto fica ausente e dito como ausente.

Leitura e conferência do pedido: CRIAR no mesmo módulo, usando as réguas que o Modelar já tem (contato, colisão, referencial, as guardas do acervo) para conferir o pedido cumprido, sem régua nova de domínio.

Volumes livres: ADIAR para depois da primeira prova, salvo se o pedido de espaço do braço não puder ser conferido sem eles.

## O que é do Modelar e o que não é

O esquema JSON da ficha e do pedido é do contrato e se escreve junto com a mecatrônica, com versão; este plano escreve o lado Modelar dele e o conferidor daqui. As ligações entre portas, o circuito, o esquemático, o leitor de Gerber e toda simulação moram no nos-mecatronica, e o Modelar não os lê nem os guarda. O pedido nunca muda a forma sozinho: cumpri-lo é mudar a receita da peça pelo fluxo normal da bancada, e a pessoa aprova a forma.

## Incluído

- o comando de exportação da ficha, com a malha do objeto montado em milímetro e no referencial do Modelar, a lista de peças com identificador, família quando houver, posição e giro, e a origem de cada valor (medido, declarado ou estimativa);
- o tipo de porta na autoria, com as portas elétricas publicadas pela família de componentes e pelas partes do braço que levam motor e conector;
- a massa e o centro de massa por peça quando o material tiver densidade declarada, marcados como estimativa;
- o leitor do pedido, que recusa versão desconhecida, peça e porta inexistentes, e confere espaço, posição e passagem contra a montagem, item a item, com o motivo de cada item não atendido;
- a ficha do braço robótico exportada, um pedido de prova escrito à mão como fixture, e o banco de provas.

## Excluído

- ligação entre portas, netlist, esquemático, circuito, programa e física, que são do nos-mecatronica; a lista de redes de uma placa chega no item `ligacoes` do pedido e o Modelar guarda a cópia do pedido, pela emenda aplicada pelo [plano das trilhas](2026-11-17-trilhas-e-validacao-da-placa.md) em 2026-11-23;
- a saída de ar calculada pelo calor, salvo a conferência do item de abertura quando o pedido o trouxer;
- inércia de conjunto móvel e eixos de junta na ficha, que entram em fatia própria se a camada física da mecatrônica pedir;
- mudar a forma aprovada do braço para cumprir pedido sem a aprovação da pessoa.

## Gate de saída

1. A ficha do braço robótico exportada duas vezes sai byte a byte igual e passa no esquema da ponte, e uma ficha com campo ausente ou versão desconhecida é recusada pelo conferidor daqui com o campo e a versão.
2. Toda peça da ficha tem identificador que existe na montagem, e toda porta elétrica tem posição no referencial da peça e tipo; teste com a montagem do braço e com uma fixture geral.
3. Um pedido de prova com um item atendido, um não atendido e um que cita peça inexistente é lido, e o relatório diz atendido, não atendido com o motivo e recusado com o identificador.
4. A malha das peças do acervo inalterada pelo retrato do acervo, e `node tools/modelar/guardas/guarda-acervo.mjs braco-robotico` sem reprovação nova.
5. Nenhum arquivo do núcleo menciona eletrônica, porta elétrica ou simulação.
6. A nota de uso no catálogo de módulos e no guia de montagens, e as linhas da matriz da mecatrônica que este plano mudar, atualizadas lá pelo fluxo daquele repositório.

## Fatias

1. O esquema da ficha, escrito com a mecatrônica, e a ficha mínima do braço (peças, identificadores, posições e malha), com o teste de reprodução.
2. O tipo de porta na autoria e as portas elétricas na família de componentes e no braço.
3. A massa e o centro de massa onde houver densidade declarada.
4. O leitor e o conferidor do pedido, com a fixture de prova.
5. O primeiro pedido real da mecatrônica para o braço, cumprido pela receita com aprovação da pessoa, e a ficha exportada de novo; documentação, banco de provas e fechamento.

## Riscos e parada

Se a porta elétrica exigir mudar o formato salvo da montagem semântica, o plano para e a pessoa decide antes, com a migração das montagens salvas. Se a ficha precisar de um dado que o Modelar só produz conhecendo a simulação, o plano para e a pergunta volta à decisão 0001 da mecatrônica. Se o plano da família de componentes não estiver concluído quando este for ativado, a fatia 2 usa as portas das partes do braço e a família entra depois.

## Fechamento

A preencher.
