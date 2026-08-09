# Montagens semânticas

> **Estado e direção, não plano de implementação.** Este documento descreve o
> que já existe para consultar partes e relações e fixa o modelo que uma futura
> montagem persistida deve respeitar. Nenhuma seção autoriza trabalho automático;
> implementação exige plano executivo próprio.

A definição ampla de autoria está em [`AUTORIA-IA.md`](AUTORIA-IA.md). Este
arquivo detalha somente a camada de composição necessária para a IA construir e
manter sistemas complexos.

## Distinção de base

Uma **peça** é uma unidade geométrica editável, produzida por uma receita
responsável.

Uma **montagem** é a composição de instâncias de peças e, recursivamente, de
outras montagens. Ela registra identidade, posição e intenção mecânica entre os
componentes. Não deve copiar toda a geometria e todas as operações para dentro
de uma receita gigante.

O recorte executável da montagem persistida v1 está documentado em
[`MONTAGEM-PERSISTIDA-V1.md`](MONTAGEM-PERSISTIDA-V1.md).

A regra é:

> **Peças são geradas por receitas. Conjuntos são organizados por montagens.
> Montagens podem conter outras montagens.**

Um carro e um motor são montagens recursivas. Uma roda completa, um freio, uma
porta ou um cabeçote também podem ser montagens quando contêm componentes que
merecem autoria, movimento, substituição ou validação próprios.

## Composição recursiva

Uma montagem futura precisa conseguir declarar pelo menos:

- identidade própria;
- instâncias de peças;
- instâncias de outras montagens;
- receita e versão responsáveis por cada peça;
- pose de cada instância no referencial da montagem;
- partes e interfaces publicadas pelos componentes;
- relações entre componentes;
- dependências diretas e indiretas;
- validações exigidas pela montagem.

A hierarquia de contenção responde “o que pertence a quê”, mas não responde a
todas as relações mecânicas. O modelo completo também precisa de um grafo.

Exemplo simplificado:

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

A roda pode pertencer ao conjunto dianteiro e, ao mesmo tempo, relacionar-se
com cubo, eixo, freio, suspensão e caixa de roda. Essas relações atravessam a
árvore e não podem ser inferidas apenas pela proximidade visual.

## Relações semânticas

A relação descreve intenção mecânica entre alvos estáveis, não um UUID de
renderizador nem uma posição copiada da câmera.

Relações futuras podem expressar, sem fechar agora o formato final:

- contém;
- instancia;
- fixa em;
- encaixa em;
- gira em torno de;
- desliza sobre;
- apoia em;
- mantém folga com;
- deve permanecer alinhado com;
- depende dimensionalmente de;
- precisa ser revalidado quando muda.

Cada relação precisa nomear os dois lados, declarar o tipo de compromisso e
oferecer dados suficientes para que a validação produza resposta mensurável ou
explique por que somente inspeção visual é possível.

Uma relação inválida deve falhar sem alterar as demais.

## Mapa canônico

Conforme a IA cria peças e montagens, o sistema deve manter um mapa estruturado
de composição, relações e dependências.

Esse mapa precisa responder:

- quais peças e montagens existem;
- onde cada instância é utilizada;
- qual montagem contém cada entidade;
- quais relações ligam dois componentes;
- quais interfaces cada componente publica;
- quais conjuntos dependem de uma peça;
- quais validações precisam ser repetidas depois de uma alteração;
- qual caminho leva do sistema inteiro ao alvo de edição;
- quais componentes devem ser vistos juntos para inspecionar uma relação.

O mapa é dado validável. Documentos, diagramas e árvores podem ser gerados a
partir dele, mas prosa manual não pode ser sua única fonte de verdade.

## Contexto de trabalho

Uma tarefa sobre montagem deve separar quatro conjuntos:

1. **Alvo de edição** — peça ou montagem que pode ser alterada.
2. **Contexto visual** — entidades mostradas somente para comparação.
3. **Dependências afetadas** — relações e montagens que podem quebrar.
4. **Escopo de validação** — verificações obrigatórias antes de aceitar a
   alteração.

Exemplo:

```text
alvo:
  aro-dianteiro

contexto visual:
  pneu-dianteiro
  cubo-dianteiro
  pinca-dianteira

dependentes:
  roda-dianteira
  conjunto-dianteiro
  carro

validar:
  assentamento do pneu
  fixação no cubo
  folga da pinça
  interferência com a caixa de roda
```

Isolar visualmente o aro não pode fazer o sistema esquecer que ele pertence a
uma roda e que a roda pertence ao carro.

## Propagação de alterações

Alterar uma peça não implica corrigir automaticamente tudo ao redor. Também não
pode encerrar a tarefa sem conferir os dependentes.

O comportamento esperado é:

1. registrar a nova definição da peça;
2. localizar dependentes diretos e indiretos;
3. reexecutar as relações relevantes;
4. preservar separadamente o que continuou válido;
5. relatar as relações quebradas, com alvo, causa e medida;
6. permitir que a IA corrija a peça, adapte a montagem ou crie uma variante.

O mapa orienta onde olhar. Ele não autoriza alterações silenciosas em peças
vizinhas.

## Invariantes

- a mesma receita e os mesmos parâmetros reproduzem a mesma peça;
- a mesma montagem e as mesmas versões reproduzem a mesma composição;
- identidade não depende de índice, câmera ou UUID de renderizador;
- origem, parte, grupo, porta, peça, instância e montagem resolvem sem
  ambiguidade;
- uma relação inválida falha e não corrompe o restante;
- montagem não esconde órfãos, faces sem identidade ou material inválido;
- montagem não absorve silenciosamente a autoria interna das peças;
- isolamento visual não remove dependências;
- alterações locais disparam descoberta e revalidação dos dependentes
  relevantes;
- representações resolvidas ou exportadas são derivadas da autoria e não a
  substituem.

## Níveis de maturidade

| Nível | Estado | Evidência ou falta |
|---:|---|---|
| 0 | peça isolada executável | núcleo, visor, estado e exportação |
| 1 | partes semânticas nomeáveis | `parte`, seleção e revisão de peças |
| 2 | grupos e portas publicáveis | painel de portas e `guarda:portas` |
| 3 | hierarquia e consulta de subárvore | bancada e `guarda:par` |
| 4 | contratos locais de pose, contato e interface | capacidades e provas específicas já existem, mas não formam uma montagem persistida geral |
| 5 | montagem persistida recursiva v1 | `mecanifica.montagem` v1, pose rígida persistida e resolução recursiva já implementadas |
| 6 | mapa de dependências e contexto derivado | não implementado |
| 7 | validação integrada de montagem e movimento | não implementado |
| 8 | autoria transacional de sistemas compostos pela IA | não implementado |

Os níveis 0 a 3 são operacionais. O nível 4 possui vocabulário e provas locais,
mas ainda não existe como capacidade geral de montagem. Os níveis seguintes são
a direção estabelecida, não promessa de implementação imediata.

## O que não existe

Ainda não há:

- relações persistidas gerais;
- mapa completo de dependências;
- resolução automática de contato;
- solver geral de encaixe;
- validação de espaço varrido;
- autoria de montagem por MCP, CLI ou outra porta.

Não simule essas capacidades com índices internos, posições de câmera, cópia de
matriz do Three.js ou documentação manual tratada como verdade executável.

## Questões abertas

A direção não decide antecipadamente:

- como ampliar a montagem persistida v1 com relações, variantes e instâncias compartilhadas;
- como versionar instâncias e relações;
- quando uma alteração modifica a origem ou cria uma variante;
- como representar movimento e cinemática;
- até onde revalidar dependentes;
- quando uma região interna deve virar peça separada;
- qual representação de colisão será usada;
- se haverá solver e qual será seu alcance;
- como agentes concorrentes reservam alvos.

Essas perguntas devem ser resolvidas por planos pequenos e provas dentro das
invariantes deste documento e de [`AUTORIA-IA.md`](AUTORIA-IA.md).
