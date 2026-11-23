# O lado Modelar da mecatrônica: plano-raiz que gera a família de componentes e a ponte

**Estado:** rascunho

**Tipo:** raiz

**Território:** nenhum. Este plano não muda arquivo de código; ele só gera os dois planos abaixo, e cada um declara o próprio território ao ser ativado.

**Responsável:** Tiago decide a ordem e aprova cada plano gerado; a IA da sessão escreve os planos filhos.

**Repositório e base:** `warbookbr/nos-modelar`; o outro lado é `warbookbr/nos-mecatronica`, e a fonte de medidas é `brigsd/Eletrifica`, commit 64b62f0 (2026-11-16), do mesmo dono.

## Este plano não se ativa

Este é um plano-raiz (`**Tipo:** raiz`). Ele não tem implementação nem gate de código, e não passa a `ativo` nem a `pronto` em momento nenhum; `npm run planos:check` recusa os dois estados num plano-raiz. O que ele produz são dois planos em `rascunho`, e cada um passa pelo caminho normal de ativação, com território, gates e fechamento próprios. Ele fecha (`concluído`) quando os dois planos filhos fecharem, e é cancelado se a pessoa desistir da linha antes disso.

## Problema observado

A simulação de um objeto com eletrônica (as ligações, o circuito, o programa, a física e o laço fechado entre eles) passou a morar num repositório próprio, o nos-mecatronica, que nunca edita geometria. Os dois conversam por um contrato de arquivos: o Modelar exporta a ficha do objeto (geometria, peças com identificador, posições, portas elétricas, massa), a mecatrônica simula e devolve um pedido que cita as peças pelo identificador (espaço, posição, passagem, saída de ar), e o Modelar cumpre o pedido na receita e confere o resultado com as réguas dele.

Para o Modelar fazer a parte dele faltam duas coisas. A primeira é a forma das peças eletrônicas: o braço robótico, os eletrodomésticos e o furgão mostram caixas onde deveria haver placa, e não há família de componente nem placa como peça. A segunda é a ponte: o Modelar não exporta ficha, as portas que as partes publicam não dizem se são elétricas nem de que tipo, e nada lê nem confere um pedido vindo de fora.

O Eletrifica, um laboratório de eletrônica em Python do mesmo dono, já resolveu a forma das peças de uma placa (`modulos/pcb/render_3d.py`, as tabelas `BODIES` e `MODULES`, com o corpo declarado como estimativa), e essa é a parte dele que entra aqui, reescrita em JavaScript.

## Resultado

Dois planos em rascunho, cada um com o modelo de plano completo, provados no mesmo objeto do acervo: a família de componentes eletrônicos, que dá forma às peças e à placa, e a ponte com a mecatrônica, que exporta a ficha, declara as portas elétricas e lê e confere o pedido que volta.

## Filtro Agent-First

Parte da placa e dos encapsulamentos do Eletrifica (`modulos/pcb/`): ENVOLVER, por reescrita. A intenção que entra no Modelar é "ponha nesta peça uma placa com estas peças nestas posições", e a família procedural é a interface; o código Python é referência de medida, não dependência.

Contrato da ponte: CRIAR o lado Modelar dele num módulo em `modulos/`, com nome geral, lendo a montagem e as peças que já existem; o núcleo não ganha nada que fale de eletrônica.

Ligações, verificador, esquemático, leitor de Gerber e os simuladores do Eletrifica: fora do Modelar, no nos-mecatronica.

## O objeto que usa o resultado

Os dois planos se provam no braço robótico, escolhido pela pessoa em 2026-11-16: o plano 1 põe a placa de controle na caixa lateral da base, e o plano da ponte exporta a ficha do braço, com as portas elétricas da placa e dos motores, e confere o primeiro pedido que a mecatrônica escrever para ele.

## Invariantes para os dois planos

- O núcleo não conhece eletrônica nem simulação. A família mora em `procedural/familias/`, a ponte em `modulos/`, como os exportadores e a textura, e o que precisar da autoria (o tipo de uma porta) entra como capacidade geral com nome geral.
- Tudo é gerado por script e determinístico; o que é estimativa (corpo de peça, altura, massa) fica declarado como estimativa na peça e na ficha.
- O Modelar não lê código da mecatrônica nem guarda ligação, circuito ou resultado de simulação; o que atravessa é só a ficha e o pedido. Emenda aceita pela pessoa em 2026-11-17 e aplicada na ativação do [plano das trilhas](2026-11-17-trilhas-e-validacao-da-placa.md), em 2026-11-23: o Modelar guarda a cópia do pedido recebido, sem editá-la, como entrada da receita da placa, e dela lê só a topologia das redes e as exigências de forma, sem circuito.
- Um pedido nunca muda forma sozinho: cumpri-lo é mudar a receita pelo fluxo da bancada, e a pessoa aprova a forma.
- Material e cor das peças eletrônicas entram como escolha por peça na receita; paleta nova só com o plano que a pedir.
- Imagem de terceiro (foto de componente com marca) não entra no repositório.
- O formato salvo da montagem semântica só muda com decisão escrita da pessoa no plano que a pedir (o da ponte, se a porta elétrica precisar), com o caminho de migração das montagens já salvas, segundo [`MONTAGENS-SEMANTICAS.md`](../usar/MONTAGENS-SEMANTICAS.md).

## Incluído

- escrever os dois planos filhos, com o que vem do Eletrifica (arquivo e função) quando houver, o território provável, os gates e a prova.

## Excluído

- qualquer implementação neste plano;
- as ligações elétricas, o esquemático, a análise e o leitor de Gerber, que migraram para o nos-mecatronica.

## Os planos que este gera

### 1. Família de componentes eletrônicos

Escrito em 2026-11-16: [família de componentes eletrônicos](../decisoes/PLANOS-ENCERRADOS.md). Uma família procedural de peças eletrônicas por encapsulamento, com as medidas típicas declaradas como estimativa, e a placa como peça declarada na receita, com cada peça na própria parte para a ficha poder citá-la; vem do Eletrifica a tabela `BODIES` e `MODULES` de `modulos/pcb/render_3d.py`.

### 2. Ponte com a mecatrônica

Escrito em 2026-11-16: [ponte com a mecatrônica](2026-11-16-ponte-com-a-mecatronica.md). A exportação da ficha do objeto (peças, identificadores, posições, massa quando houver, portas), a declaração de portas elétricas nas peças e a leitura e conferência do pedido que volta (espaço, posição, passagem), num módulo em `modulos/` e na autoria, com nome geral.

### Os planos que migraram

Os antigos planos 2 (ligações elétricas na montagem), 3 (esquemático com símbolos nossos), 4 (análise depois dos três) e 5 (leitor de Gerber próprio) migraram para o nos-mecatronica em 2026-11-16, onde as ligações, o esquemático e o leitor de Gerber são candidatos no backlog de planos de lá e a análise passou a ser feita pela matriz de lá.

## Gate de saída

1. Os dois planos estão escritos em `docs/modelar/planos/`, em `rascunho`, cada um com o modelo completo e com link para este.
2. Os dois chegaram a `concluído` ou `cancelado`, e este cita o fechamento de cada um.
3. Nenhum código entrou por este plano.

## Fatias

1. Feita em 2026-11-16: o plano 1, família de componentes eletrônicos, com o braço robótico como objeto-alvo; a ativação dele espera um lugar de plano ativo.
2. Feita em 2026-11-16: o plano da ponte com a mecatrônica. Ele pode ser ativado antes ou junto do plano 1, porque as portas das partes do braço bastam para a primeira ficha, e a família publica as dela quando chegar.
3. Fechar este quando os dois filhos fecharem.

## Riscos e parada

Se a porta elétrica exigir mudar o formato salvo da montagem semântica, o plano da ponte para e a pessoa decide antes de mudar o formato. Se a pessoa decidir parar a linha, este plano é cancelado e os planos filhos ainda em rascunho voltam a ser candidatos no backlog.

## Fechamento

A preencher.
