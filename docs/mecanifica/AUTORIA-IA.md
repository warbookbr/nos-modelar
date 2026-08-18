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

## A distinção central: peça não é montagem

A arquitetura deve separar dois conceitos.

### Peça

Uma peça é uma unidade física ou geométrica que faz sentido editar e validar
como um objeto próprio. Sua forma nasce de uma receita procedural ou de outra
representação de autoria aceita pelo núcleo.

Exemplos possíveis:

- pneu;
- aro;
- disco de freio;
- eixo;
- pistão;
- biela;
- capô;
- carcaça;
- engrenagem;
- parafuso.

Uma peça pode possuir regiões internas nomeadas, materiais, portas, grupos e
subpartes semânticas. Isso não obriga cada região a virar outro arquivo.

### Montagem

Uma montagem é a composição de instâncias de peças e, recursivamente, de outras
montagens. Ela registra identidade, posição, relações e intenção mecânica entre
os componentes. A montagem não deve esconder a origem das peças nem copiar toda
a geometria para dentro de uma receita gigante.

Exemplos possíveis:

- roda completa;
- freio;
- suspensão dianteira;
- porta do carro;
- cabeçote;
- motor;
- eixo dianteiro;
- carroceria;
- carro completo.

A regra estrutural é:

> **Peças são geradas por receitas. Conjuntos são organizados por montagens.
> Montagens podem conter outras montagens.**

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

## Quando algo deve ser uma peça separada

Não existe um número universal de faces, passos ou linhas que determine a
separação. A decisão deve seguir significado mecânico e custo de autoria.

Uma entidade tende a merecer receita própria quando uma ou mais destas condições
forem verdadeiras:

- existe fisicamente como componente separável;
- pode ser substituída sem substituir todo o conjunto;
- pode ser reutilizada em outra montagem;
- possui interfaces mecânicas próprias;
- move-se de forma independente;
- é fabricada ou especificada separadamente;
- precisa de validação própria;
- pode receber variantes próprias;
- é um alvo natural de trabalho para a IA;
- sua alteração não deveria exigir reescrever a definição interna de outro
  componente.

Uma entidade tende a permanecer como região interna de uma receita quando:

- é inseparável do mesmo corpo físico;
- existe apenas para nomear uma área de inspeção;
- sempre muda junto com o restante da peça;
- não possui montagem, movimento ou substituição independentes;
- separar o arquivo acrescentaria coordenação sem acrescentar controle real;
- sua identidade serve para seleção, material, medição ou explicação, e não para
  composição.

Exemplo: o canal do pneu, a borda externa e os furos de um aro podem ser regiões
semânticas de uma receita de aro. Pneu, aro e tampa, por outro lado, tendem a ser
peças distintas dentro da montagem da roda.

A fronteira pode mudar conforme a fidelidade aumenta. Uma peça simples de
prova pode começar agregada e depois ser decomposta, desde que a identidade e as
relações permitam a migração sem transformar referências em números frágeis.

## Identidade estável

Toda peça, montagem, instância, parte relevante, porta e relação precisa de
identidade estável e legível.

Identidade não pode depender de:

- UUID do renderizador;
- índice num array;
- ordem casual de carregamento;
- posição visual;
- câmera;
- nome temporário gerado apenas para uma execução;
- número de face usado como atalho persistido quando existe referência
  semântica melhor.

A identidade deve permitir que a IA reencontre o mesmo alvo depois de uma
reexecução, alteração de parâmetros, nova sessão ou troca de ferramenta.

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

## Seleção e isolamento

A seleção deve operar sobre identidade semântica. A IA precisa conseguir:

- selecionar uma peça;
- selecionar uma montagem;
- selecionar uma parte interna;
- selecionar uma subárvore;
- selecionar duas ou mais entidades relacionadas;
- isolar somente o alvo;
- mostrar o alvo com contexto fantasma;
- mostrar um conjunto arbitrário de componentes;
- alternar entre vistas reproduzíveis;
- retornar ao contexto maior sem perder a seleção.

Exemplos de inspeção úteis:

```text
somente a roda
roda + cubo
roda + eixo
capô + dobradiças
pistão + biela + virabrequim
motor + cofre do motor
suspensão + roda + caixa de roda
```

Esse mecanismo é necessário para reduzir ruído visual e contexto, mas não
substitui a medição das relações.

## Controle total não significa ausência de limites

"Controle total" significa que a IA pode agir sobre todas as camadas necessárias
à autoria, e não apenas girar controles preparados por humanos.

A IA deve poder, conforme a capacidade for implementada:

- criar uma nova receita;
- modificar parâmetros;
- criar e reordenar operações;
- acrescentar ou remover geometria;
- nomear partes e interfaces;
- criar uma nova montagem;
- inserir ou remover instâncias;
- declarar e alterar relações;
- escolher alvos e contextos de inspeção;
- executar o núcleo;
- solicitar medições e vistas;
- comparar revisões;
- corrigir o resultado;
- registrar a nova versão.

Isso não exige permitir escrita irrestrita e silenciosa. Escrita pode ser
transacional, confinada, versionada e validada. Uma operação inválida deve
falhar sem deixar metade de uma receita, montagem ou relação publicada.

O controle da IA deve ser amplo no que ela consegue expressar e rigoroso no que
o sistema aceita como estado válido.

## Edição local e propagação de impacto

Alterar uma peça não deve obrigar a IA a editar manualmente todas as montagens
que a utilizam. Também não deve existir a promessa falsa de que toda montagem
será corrigida automaticamente.

O comportamento correto é:

1. a peça muda;
2. o sistema identifica dependentes diretos e indiretos;
3. as relações relevantes são reavaliadas;
4. resultados preservados continuam verdes;
5. relações quebradas são relatadas com alvo, causa e medida;
6. a IA decide se corrige a peça, adapta a montagem ou aceita uma nova variante.

Exemplo: aumentar o diâmetro externo de uma roda pode preservar a fixação no
cubo e, ao mesmo tempo, quebrar a folga com a caixa de roda. O sistema deve
mostrar as duas respostas separadamente.

O mapa de dependências serve para descobrir onde olhar. Ele não deve esconder
quebras nem alterar peças vizinhas sem decisão explícita.

## Validação em camadas

Nenhuma única técnica prova que uma peça ou montagem está correta. A validação
deve combinar camadas.

### 1. Validação estrutural

Confere se a definição é legível e íntegra:

- receita executável;
- referências resolvidas;
- identidade sem ambiguidade;
- ausência de órfãos silenciosos;
- formato conhecido;
- montagem sem componentes ausentes;
- relações apontando para alvos existentes.

### 2. Validação geométrica

Confere propriedades mensuráveis da geometria:

- dimensões;
- centros e eixos;
- espessuras;
- faces ou volumes inválidos;
- interpenetrações;
- folgas;
- alinhamentos;
- caixas e regiões ocupadas;
- continuidade e fechamento quando aplicável.

### 3. Validação de interfaces

Confere relações mecânicas declaradas:

- eixo compatível com abertura;
- quantidade e distribuição de furos;
- diâmetros compatíveis;
- centros coincidentes;
- orientação correta;
- tolerância declarada;
- contato ou afastamento esperado.

### 4. Validação de montagem e movimento

Quando o projeto alcançar essa capacidade, confere relações que dependem de
pose ou movimento:

- curso;
- rotação;
- esterçamento;
- abertura;
- interferência ao longo do movimento;
- limites e batentes;
- espaço varrido.

### 5. Inspeção visual

Continua necessária para aspectos que não são reduzidos de forma confiável a
uma regra numérica:

- proporção;
- leitura da forma;
- aparência mecânica;
- detalhes escondidos;
- continuidade visual;
- qualidade estética;
- resultado em ângulos diferentes;
- coerência com referências visuais.

A inspeção visual é indispensável, mas não deve ser a primeira e única defesa
para encaixe mecânico. Uma imagem pode esconder pequenas colisões, folgas
incorretas ou desalinhamentos.

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

## Fluxo de autoria esperado

Sem fixar ainda comandos ou formato de arquivo, o fluxo de uma tarefa deve
preservar esta sequência:

1. identificar o alvo pelo mapa semântico;
2. carregar a receita ou montagem responsável;
3. carregar dependências e relações relevantes;
4. escolher o contexto visual mínimo suficiente;
5. declarar o que pode ser alterado;
6. criar ou modificar a definição;
7. executar o núcleo;
8. verificar integridade estrutural;
9. medir a peça e suas interfaces;
10. inspecionar vistas do alvo isolado;
11. inspecionar pares ou conjuntos relevantes;
12. revalidar montagens dependentes;
13. comparar a revisão nova com a anterior;
14. corrigir ou publicar a revisão.

Uma IA não deve precisar lembrar sozinha quais relações revisar. O sistema deve
fornecer essa lista a partir do mapa canônico.

## Invariantes de direção

Qualquer arquitetura, plano ou ferramenta futura deve respeitar estas regras:

1. Um carro completo é uma montagem recursiva, não uma receita monolítica.
2. Um motor é uma montagem de conjuntos e peças, não uma receita única.
3. Uma peça editável possui uma definição responsável por sua geometria.
4. Uma montagem guarda composição e relações; não copia silenciosamente toda a
   autoria das peças.
5. Montagens podem conter outras montagens.
6. Toda entidade relevante possui identidade estável.
7. Isolamento visual não remove contexto estrutural.
8. O alvo de edição é separado dos objetos exibidos apenas como contexto.
9. O mapa de relações é dado validável, não documentação manual como única
   verdade.
10. Alterar uma peça exige descobrir e revalidar dependentes relevantes.
11. Validação visual complementa medições; não substitui contratos mecânicos
    básicos.
12. A IA deve poder criar lógica geométrica, não apenas alterar parâmetros de
    moldes fixos.
13. Escrita inválida falha sem publicar estado parcial.
14. MCP, CLI ou API são portas de acesso; nenhum deles define o modelo de
    autoria.
15. Testes resolvem decisões ambíguas, não reabrem princípios lógicos já
    estabelecidos.

## Desvios a evitar

Os seguintes caminhos contradizem esta definição:

- tentar modelar um carro inteiro em um único arquivo procedural;
- tentar modelar um motor inteiro como uma única receita indivisível;
- transformar todo detalhe visual em arquivo separado sem significado mecânico;
- manter relações apenas em prosa;
- usar posição de câmera ou UUID do Three.js como identidade persistida;
- oferecer à IA apenas parâmetros de modelos preparados;
- permitir que uma alteração local ignore montagens dependentes;
- considerar uma imagem bonita prova suficiente de encaixe;
- tratar o MCP como substituto do núcleo ou do formato de montagem;
- acrescentar escrita antes de definir transação, alvo e validação;
- esconder falhas para manter um fluxo aparentemente verde.

## Questões ainda abertas

Esta definição não decide antecipadamente:

- como representar variantes e instâncias compartilhadas;
- como versionar relações;
- como declarar movimento e cinemática;
- se haverá solver automático e qual será seu alcance;
- se a representação por malha final e pose mundial aberta no plano de
  [auditoria de interseções](planos/2026-08-18-auditoria-intersecoes-montagem.md)
  será aprovada pelas provas adversariais e de escala;
- quando uma alteração cria variante ou modifica a peça de origem;
- como agentes concorrentes reservam alvos;
- qual será a primeira camada de escrita;
- quais operações entram no MCP e quais permanecem em serviços internos;
- como materiais, física e deformação entrarão no mesmo mapa;
- qual fidelidade mínima caracteriza um carro ou robô completo.

Essas perguntas devem ser resolvidas por planos pequenos, provas e comparação de
resultados, sempre dentro das invariantes deste documento.

## Relação com os demais documentos

- [`ARQUITETURA.md`](ARQUITETURA.md) descreve as fronteiras técnicas atuais.
- [`MONTAGENS-SEMANTICAS.md`](MONTAGENS-SEMANTICAS.md) registra o estado atual e
  os níveis de maturidade das montagens.
- [`BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md) define a superfície
  de inspeção visual.
- [`docs/uso/oficina-contrato.md`](../uso/oficina-contrato.md) registra o
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
