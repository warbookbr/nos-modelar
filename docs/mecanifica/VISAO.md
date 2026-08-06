# Visão da Mecanifica

## A frase

Uma oficina procedural para que uma IA construa e mantenha máquinas complexas
como peças editáveis e montagens recursivas, com identidade, relações, medição e
inspeção reproduzível.

## O problema

Uma IA pode produzir uma peça ou uma imagem 3D sem produzir um sistema que
continue compreensível, editável e verificável. Quanto maior o objeto, maior o
risco de virar uma massa única, difícil de localizar, alterar, reutilizar,
comparar e validar.

O projeto existe para reduzir esse problema. Tudo deve ser avaliado pela pergunta:

> **Isto melhora ou facilita o trabalho da IA ao modelar, inspecionar, corrigir e
> manter objetos 3D mecânicos?**

Uma capacidade que ajuda apenas um operador humano, uma demonstração ou uma
interface externa não é, por si só, objetivo deste repositório.

## O que a IA deve conseguir fazer

A Mecanifica deve permitir que a IA:

- entenda qual definição é responsável por uma forma;
- crie uma nova peça sem depender apenas de moldes preparados;
- altere parâmetros e também a lógica geométrica;
- organize peças em montagens;
- componha montagens dentro de montagens maiores;
- selecione um alvo de edição sem carregar informação desnecessária;
- escolha quais componentes precisa observar juntos;
- isole visualmente uma peça sem perder seu contexto estrutural;
- medir dimensões, eixos, centros, folgas, contatos e interferências;
- comparar revisões e localizar regressões;
- descobrir quais montagens dependem de uma alteração;
- corrigir a peça, adaptar a montagem ou criar uma variante;
- publicar somente estados completos, íntegros e reproduzíveis.

## Horizonte

A progressão desejada é:

1. peças automotivas isoladas;
2. pequenos conjuntos mecânicos;
3. sistemas automotivos completos;
4. um carro inteiro composto por sistemas e conjuntos;
5. depois que esse modelo estiver maduro, robôs e outras máquinas compostas.

O carro é o primeiro grande domínio de prova porque combina muitas peças,
relações, movimentos, encaixes e escalas de inspeção. Robôs entram depois porque
exigem os mesmos fundamentos e acrescentam articulação, cinemática e controle.

## Peça e montagem

Um carro não deve ser uma única receita. Um motor também não.

A unidade geométrica editável é a **peça**. A unidade de composição é a
**montagem**. Montagens podem conter outras montagens.

```text
carro
├─ carroceria
├─ conjunto dianteiro
│  ├─ suspensão
│  ├─ freio
│  └─ roda
│     ├─ pneu
│     ├─ aro
│     └─ fixadores
└─ motor
   ├─ bloco
   ├─ cabeçote
   └─ conjunto do virabrequim
```

A árvore de composição não basta sozinha. Relações podem atravessar ramos: roda,
cubo, eixo, freio, suspensão e caixa de roda precisam ser entendidos em conjunto
mesmo quando não pertencem ao mesmo ramo imediato.

## Trabalho local com contexto preservado

A IA não deve observar o carro inteiro em toda tarefa. Ela deve conseguir pedir
contextos reduzidos como:

```text
somente a roda
roda + cubo
roda + eixo
capô + dobradiças
pistão + biela + virabrequim
motor + cofre do motor
suspensão + roda + caixa de roda
```

O contexto de trabalho separa:

1. alvo que pode ser alterado;
2. objetos mostrados somente para comparação;
3. dependências que podem ter sido afetadas;
4. validações obrigatórias antes de aceitar o resultado.

Isolar reduz o ruído visual. Não apaga relações, dependências ou obrigações de
validação.

## Mapa como dado

Composição, relações e dependências devem existir como dado estruturado e
validável.

Esse mapa precisa responder:

- quais peças e montagens existem;
- qual receita gera cada peça;
- onde cada instância é usada;
- o que contém o quê;
- quais interfaces e relações ligam componentes;
- quais montagens dependem de uma alteração;
- quais verificações precisam ser repetidas;
- quais objetos devem ser observados juntos.

Documentos, árvores e diagramas podem ser gerados desse mapa. Eles não devem ser
a única fonte de verdade.

## Validação em camadas

A IA precisa receber retorno por várias camadas:

- **estrutural:** definição executável, referências válidas, identidade estável;
- **geométrica:** dimensões, espessuras, centros, eixos, volumes e colisões;
- **interfaces:** encaixe, alinhamento, fixação, contato e tolerância;
- **montagem e movimento:** pose, curso, rotação, interferência e espaço varrido;
- **visual:** proporção, leitura da forma, acabamento e coerência com referências.

A inspeção visual é indispensável, mas não substitui medidas e contratos
mecânicos básicos.

## Princípios

- **IA primeiro.** O valor de uma capacidade é medido pelo ganho no trabalho da
  IA.
- **Autoria nativa.** A IA cria conteúdo estruturado e reexecutável, não apenas
  uma malha final.
- **Peça não é montagem.** Receitas geram peças; montagens organizam peças e
  outras montagens.
- **Controle amplo.** A IA pode alterar geometria, composição e relações, não
  apenas parâmetros preparados.
- **Escrita rigorosa.** Estado inválido ou parcial não é publicado.
- **Identidade estável.** Alvos continuam encontráveis entre execuções e
  revisões.
- **Trabalho local, impacto global conhecido.** A IA trabalha em recortes, mas o
  sistema descobre dependentes.
- **Mapa como dado.** Relações não vivem apenas em prosa.
- **Validação em camadas.** Medição e inspeção visual se complementam.
- **Capacidade antes da peça.** Cada peça também prova e melhora uma capacidade
  geral da oficina.
- **MCP é uma porta.** MCP, CLI ou API podem expor capacidades; nenhuma dessas
  opções define o núcleo ou o modelo de autoria.
- **Avanço comprovado.** Testes medem ganhos e revelam lacunas; resultados verdes
  não encerram a busca por melhoria.

## Limites atuais

Ainda não existem:

- montagem recursiva persistida;
- mapa completo de composição e dependências;
- contexto de trabalho derivado automaticamente;
- camada completa de escrita para IA;
- solver geral de encaixe;
- validação geral de movimento e espaço varrido;
- contrato genérico de materiais;
- física de engenharia em tempo real.

## Sinal de progresso

A direção está funcionando quando uma IA consegue criar uma peça, colocá-la em
um conjunto, selecionar o alvo e o contexto relevante, medir as relações,
alterar a definição e descobrir com clareza quais montagens continuaram válidas
e quais precisam de correção.

A definição detalhada está em [`AUTORIA-IA.md`](AUTORIA-IA.md) e
[`MONTAGENS-SEMANTICAS.md`](MONTAGENS-SEMANTICAS.md).
