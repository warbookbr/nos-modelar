# Autoria assistida por IA

> **Definição de direção, não plano de implementação.** Este documento registra
> como a autoria deve funcionar quando a Mecanifica crescer de peças isoladas
> para sistemas compostos, carros completos e, depois, robôs. As seções de
> estado atual dizem o que existe hoje. As seções de direção definem o modelo a
> preservar, sem afirmar que todas as capacidades já estão implementadas.
## Objetivo

A Mecanifica deve permitir que uma IA crie, refine, inspecione e corrija objetos
3D mecânicos de complexidade crescente:

1. peças automotivas isoladas;
2. conjuntos formados por várias peças;
3. sistemas automotivos completos;
4. um carro inteiro, organizado como composição de sistemas e conjuntos;
5. depois que esse modelo estiver maduro, robôs e outras máquinas compostas.

A IA não deve apenas produzir uma malha final ou alterar alguns números de um
molde preparado por humano. Ela deve conseguir construir e alterar a definição
procedural da peça, organizar peças em montagens, declarar relações, escolher o
contexto necessário para trabalhar e receber retorno suficiente para corrigir o
resultado.

Quando o vocabulário existente não expressar a intenção, a IA também deve
conseguir consultar a lacuna, compor uma capacidade reutilizável ou implementar
uma extensão nativa por contrato e gates. Essa extensão pertence à plataforma
procedural versionada; não vira código oculto dentro da receita nem caso
especial de carro ou robô.

O ciclo desejado é:

```text
entender o alvo
→ criar ou alterar a definição
→ executar o núcleo
→ observar o resultado
→ medir e validar relações
→ corrigir
→ revalidar os conjuntos afetados
```

## Estado atual

Uma peça pode ser escrita como receita determinística. O núcleo resolve
`PARAMS`, `TOPO`, `PASSOS`, `MATERIAIS`, `ALIASES`, partes, portas e origens.
Cada parte relevante pode receber nome semântico estável. A receita exporta
`meta` e `construir`, e quando usa o formato procedural expõe os dados
reexecutáveis.

Expressões nomeadas resolvem números e vetores sem executar JavaScript livre no
arquivo salvo. Operações estruturais publicam origem e seleção. `parte`,
`material`, `liso`, `solido`, `publicarPorta` e as seleções por grupo consultam
essa identidade. `arranja`, `furo`, `espelha`, `loft`, `filete` e as primitivas
existentes são capacidades do núcleo, cada uma com seus limites documentados no
contrato procedural.

A bancada atual consegue mostrar peças, partes semânticas, hierarquia,
subárvores, isolamento, contexto visual, vistas reproduzíveis e alguns
relatórios mensuráveis. O MCP v4 expõe leitura, descrição, validação, comparação
e apresentação visual; no perfil opt-in, também planeja, inspeciona e publica
montagens e receitas declarativas. Revisões ativas autorizadas alimentam o mesmo
catálogo usado por leitura e revalidação, inclusive em uma nova sessão.

Os formatos persistidos `mecanifica.montagem` v1, v2 e v3 cobrem composição
recursiva, pose rígida e relações locais mensuráveis. O mapa canônico e a
revalidação em cascata persistida cobrem o universo explícito autorizado; não
descobrem dependências fora dele nem corrigem ou promovem dependentes
automaticamente. Solver geral de encaixe, materiais canônicos, cinemática e
autoria compatível com todo módulo JavaScript histórico continuam fora.

## Decisão já estabelecida: carro e motor não são receitas monolíticas

Um carro inteiro não deve ser produzido por uma única receita que concentre
carroceria, rodas, motor, suspensão, portas, vidros e todos os detalhes.

Mesmo que uma receita monolítica consiga produzir uma imagem convincente, ela
seria inadequada para o objetivo de autoria contínua porque dificultaria:

- localizar o responsável por uma forma;
- alterar uma parte sem efeitos colaterais desnecessários;
- reutilizar componentes;
- trabalhar em paralelo;
- validar encaixes localmente;
- substituir uma peça;
- compreender dependências;
- continuar o trabalho com outra IA;
- evoluir o objeto por meses ou anos.

O mesmo vale para um motor. O motor é um sistema composto por conjuntos e peças,
não uma única unidade razoável de autoria. Bloco, cabeçote, virabrequim, pistões,
bielas, admissão, escape, distribuição, acessórios e fixações podem exigir
níveis diferentes de decomposição.

Essa conclusão não depende de um teste comparando um carro monolítico com um
carro composto. Ela decorre dos requisitos de manutenção, isolamento,
reutilização e validação local.

## Estrutura recursiva

O modelo esperado é uma árvore ou grafo de composição. Esta árvore é apenas um
exemplo de organização, não uma taxonomia automotiva fechada:

```text
carro
├─ carroceria
│  ├─ capô
│  ├─ porta dianteira esquerda
│  │  ├─ estrutura da porta
│  │  ├─ vidro
│  │  ├─ mecanismo do vidro
│  │  └─ dobradiças
│  └─ para-lamas
├─ conjunto dianteiro
│  ├─ suspensão dianteira
│  ├─ freio dianteiro
│  └─ roda dianteira
│     ├─ pneu
│     ├─ aro
│     ├─ tampa
│     └─ fixadores
└─ motor
   ├─ bloco
   ├─ cabeçote
   ├─ conjunto do virabrequim
   │  ├─ virabrequim
   │  ├─ bielas
   │  └─ pistões
   ├─ admissão
   └─ escape
```

A árvore de contenção não é suficiente para todas as perguntas. Algumas
relações atravessam ramos: a roda se relaciona com o cubo, o eixo, o freio, a
suspensão e a caixa de roda. Por isso, o modelo completo deve aceitar um grafo
de relações além da hierarquia de composição.

## O mapa de relações é dado do sistema

Conforme a IA cria peças e montagens, o sistema deve construir e manter um mapa
canônico de composição, dependências e relações.

Esse mapa não deve existir apenas como um documento escrito manualmente. Um
texto pode ficar desatualizado e divergir do que o sistema realmente executa.
A fonte de verdade deve ser estruturada e validável. Documentos, árvores,
diagramas e relatórios podem ser gerados a partir dela.

O mapa precisa responder pelo menos:

- quais peças e montagens existem;
- onde cada instância aparece;
- o que contém o quê;
- qual receita gera cada peça;
- quais interfaces cada componente publica;
- quais relações ligam dois componentes;
- quais montagens dependem de uma peça;
- quais validações devem ser repetidas depois de uma alteração;
- qual caminho leva do carro inteiro até o alvo de edição;
- quais componentes podem ser mostrados juntos para avaliar uma relação.

Relações possíveis incluem, sem fechar agora o formato final:

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

## Contexto de trabalho da IA

A IA não deve carregar nem observar o carro inteiro para toda tarefa. Ela deve
poder declarar um contexto de trabalho reduzido.

Um contexto de trabalho possui quatro conjuntos diferentes:

1. **Alvo de edição** — o que a IA pode alterar nesta tarefa.
2. **Contexto visual** — componentes mostrados para comparação, normalmente
   somente leitura.
3. **Dependências afetadas** — montagens e relações que podem quebrar com a
   alteração.
4. **Escopo de validação** — verificações obrigatórias antes de aceitar o
   resultado.

Exemplo:

```text
alvo de edição:
  aro-dianteiro

contexto visual:
  aro-dianteiro
  pneu-dianteiro
  cubo-dianteiro
  pinca-dianteira

montagens afetadas:
  roda-dianteira
  conjunto-dianteiro
  carro

validações:
  assentamento do pneu
  fixação no cubo
  folga da pinça
  interferência com a caixa de roda
```

Isolar visualmente uma peça não pode apagar seu contexto estrutural. A IA pode
esconder a carroceria para enxergar roda e eixo, mas o sistema continua sabendo
que ambos pertencem a montagens maiores e que certas relações precisam ser
preservadas.

A bancada deve ser entendida como uma superfície de atenção e inspeção. Ela
ajuda a IA a escolher o que ver, não como a fonte única da verdade sobre o que
está montado.

## O papel dos testes e experimentos

Testes não são necessários para decidir princípios que já decorrem logicamente
dos requisitos. Não é preciso construir um carro inteiro em uma receita única
para descobrir que isso prejudica manutenção, isolamento e reutilização.

Testes e experimentos são úteis nas decisões que continuam ambíguas, por
exemplo:

- quando uma região deve virar peça separada;
- quanto contexto a IA precisa para uma tarefa;
- qual representação de interface encontra mais erros;
- até onde propagar uma revalidação;
- como representar relações complexas;
- quais medições realmente reduzem retrabalho;
- quando compartilhar parâmetro ou duplicar variante;
- qual decomposição permite melhor continuidade entre agentes.

A regra é:

> **Definições lógicas estabelecem o modelo. Experimentos resolvem fronteiras e
> escolhas ainda incertas dentro desse modelo.**

## O papel do MCP

MCP não é o motor 3D, não é a receita e não é a arquitetura de composição. Ele
é uma forma possível de uma IA acessar capacidades já definidas pelo sistema.

O mesmo modelo poderia ser acessado por:

- MCP;
- comandos locais;
- uma API própria;
- edição de arquivos seguida por ferramentas de validação;
- outro protocolo futuro.

Portanto, a pergunta principal não é "o projeto será MCP?". A pergunta é:

> **Quais capacidades de autoria, navegação, inspeção e validação o sistema deve
> oferecer à IA?**

Depois disso se decide quais delas devem ser expostas por MCP.

O MCP atual de leitura e auditoria continua útil porque a criação precisa de
retorno. Porém, acrescentar escrita ao MCP sem antes definir peça, montagem,
identidade, dependência e transação apenas transportaria uma arquitetura
incompleta para outro protocolo.

Uma futura camada de autoria, seja MCP ou não, precisa respeitar pelo menos:

- alvo de escrita explícito;
- contexto somente leitura separado do alvo;
- planejamento antes de publicar mudanças grandes;
- escrita atômica;
- nenhuma sobrescrita acidental;
- resposta estruturada;
- diagnóstico acionável;
- revalidação dos dependentes;
- comparação entre revisão anterior e nova;
- possibilidade de recusar o resultado sem corromper o estado válido anterior.

Ferramentas conceituais futuras podem corresponder a ações como abrir contexto,
criar ou alterar receita, criar montagem, adicionar instância, declarar relação,
executar, medir, renderizar, comparar e publicar revisão. Os nomes e a divisão
exata dessas ferramentas ainda não estão decididos.

## Relação com os demais documentos

- [`ARQUITETURA.md`](ARQUITETURA.md) descreve as fronteiras técnicas atuais.
- [`MONTAGENS-SEMANTICAS.md`](./usar/MONTAGENS-SEMANTICAS.md) registra o estado atual e
  os níveis de maturidade das montagens.
- [`BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md) define a superfície
  de inspeção visual.
- [`docs/nos-herdado/oficina-contrato.md`](../nos-herdado/oficina-contrato.md) registra o
  vocabulário procedural vigente.
- `docs/mecanifica/planos/` contém planos executivos; este arquivo não substitui
  um plano nem autoriza implementação automática.

## Síntese canônica

A Mecanifica deve permitir que uma IA construa máquinas complexas sem tratá-las
como uma massa única.

A unidade geométrica editável é a peça. A unidade de composição é a montagem.
Montagens são recursivas e formam sistemas, carros e, futuramente, robôs. A IA
trabalha em alvos reduzidos, escolhe quais componentes ver juntos e mantém acesso
ao contexto estrutural e às dependências. O sistema registra relações como dado,
revalida o impacto de mudanças e combina medição automática com inspeção visual.

O núcleo cria a geometria. A bancada permite observar e selecionar contexto. O
mapa mantém composição e dependências. As validações verificam peças e relações.
MCP pode expor essas capacidades, mas não as define.

## O contrato de autoria saiu daqui

O que uma IA precisa **obedecer** ao autorar uma peça — distinção entre peça e
montagem, identidade estável, isolamento, limites, propagação de alteração,
validação em camadas, fluxo esperado, invariantes e desvios a evitar — está em
[`usar/AUTORIA-DE-PECA.md`](usar/AUTORIA-DE-PECA.md)
(`docs/mecanifica/usar/AUTORIA-DE-PECA.md`).

Este documento ficou com o que explica **por que** o modelo é assim: objetivo,
estado, decisões tomadas, estrutura recursiva, papel dos testes e do MCP. Serve
a quem muda o Mecanifica, não a quem o usa.
