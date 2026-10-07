# As ferramentas de modelagem

**Estado:** congelado
**Congelado em:** 2026-10-07, por decisão da pessoa

**Por que foi congelado:** a medição do banco de provas mostrou que boa parte do
custo da IA está antes da modelagem, em ler documentação que a tarefa não pede e
em conduzir o esboço, e a pessoa decidiu atacar isso primeiro, em [o caminho
curto da IA](../2026-10-07-o-caminho-curto-da-ia.md). Nada aqui foi refutado.

**Condição de descongelamento:** o caminho curto da IA fechar; este plano volta
como ativo a partir da fatia 2, com o banco de provas refeito pelo caminho curto
como o novo "antes".

**O que foi levado:** a fatia 1 foi entregue antes do congelamento: as portas
estendidas (plano de apoio, padrão de furos e trilho, com folga pela ISO 286), o
banco de provas com o registro de custo e os quatro objetos de esboço medidos, o
desenho do esboço com oclusão por pixel em Three.js (que adianta parte da fatia 2)
e o crítico do objeto inteiro no nível sem Detalhe por unidade. Os três objetos
detalhados do banco ficaram sem medir.

**O que fica parado:** as fatias 2 a 9, sem código começado.

**Responsável:** Claude, com o aceite da pessoa

**Repositório e base:** `warbookbr/nos-mecanifica`, branch da sessão sobre a `main`

## Problema observado

O Mecanifica deve deixar uma IA modelar os objetos da [lista de
famílias](../../FAMILIAS-DE-OBJETOS.md) melhor, mais barato e com mais confiança,
e hoje quatro coisas impedem isso. O esboço e o núcleo são dois motores, com
unidades, formas, encaixe e gate próprios, e o que o esboço decide é refeito na
modelagem; o esboço, que deveria ser leve e barato, saiu mais caro que o núcleo
em várias tarefas quando foi usado para objeto detalhado. O núcleo já seleciona
por grupo, região, origem, porta e alias, mas várias operações ainda pedem
identificador de vértice ou face, e não há seleção por propriedade geométrica,
perfil 2D com furo nem curva com arco, de modo que a IA escreve contas e números
à mão na receita. Faltam as ferramentas que cobrem a lista: a [contagem por
objeto](../../FERRAMENTAS-POR-OBJETO.md) põe casca com espessura em 125 objetos,
articulações em 93, estrutura de barras em 72 e chapa dobrada em 62, e a casca e
a chapa não existem. E a verificação já tem peças que medem contra referência
externa, mas elas não estão no caminho de toda peça: na prática a régua compara a
peça contra a declaração dela, e o crítico visual é o único juiz da semelhança.
As [análises de 2026-10](../../ANALISES-DE-2026-10.md) detalham cada ponto.

## O que já existe e este plano reaproveita

A forma global N2 (`src/autoria/forma-global.js`,
[contrato](../../CONTRATO-FORMA-GLOBAL-N2.md)) já é um nível de blocagem: a IA
declara um alvo e um andaime de volumes com nome, o andaime vira uma blocagem
neutra, e o gate G01 compara envelope, pontos de referência e silhueta em três
vistas contra o alvo. Ela está parada desde 2026-08-24 e aceita só caixa,
cilindro e prisma convexo. O encaixe já tem contrato no núcleo e na montagem:
portas publicadas, a porta conferida contra a forma (`porta-confere-forma.js`),
vínculos de medida e posição derivada da porta na montagem v5; as portas só
conhecem cilindro e anel. Ferramenta nova já tem formato de entrada, a [extensão
nativa](../../EXTENSOES-NATIVAS-V1.md), com manifesto, teste e registro, e o exemplo
`procedural/extensoes/prisma-triangular`. Subgrafo reutilizável de operações já
tem formato, a [composição procedural](../../COMPOSICAO-PROCEDURAL-V1.md) em
`procedural/nucleo/composicoes.js`. A varredura de parâmetros
(`src/autoria/varrer-parametros.js`) já mede uma peça em lote dentro das faixas
declaradas. A conferência contra foto (`npm run conferir:referencia`), o
contorno por parte em milímetro (`modulos/contorno-da-imagem/`), o [fluxo do
objeto](../../usar/FLUXO-DO-OBJETO.md), o [aceite visual](../../CONTRATO-ACEITE-VISUAL.md)
e o [filtro agent-first](../../AGENT-FIRST.md) já existem e governam como uma
capacidade nova é aceita. O plano estende essas peças em vez de criar outras.

## Resultado

Um núcleo só, com níveis de detalhe. O esboço passa a ser o nível zero, feito
sobre a forma global N2 estendida, e cada nível seguinte refina dentro do
envelope e das portas do anterior, de modo que o que o esboço decide não é
refeito. Duas peças se encaixam pelas portas do núcleo, estendidas a mais tipos,
e o esboço e o gate de contato leem o mesmo dado. A IA descreve a peça por
features (furo nesta face, arredondamento nesta aresta, casca com tais faces
abertas) e por ferramentas que geram as formas difíceis, e o núcleo resolve a
geometria. A verificação mede a peça contra a referência antes de o crítico
olhar, e o custo de cada objeto (tokens, rodadas e nota) é registrado como dado.

## Incluído

- as portas como contrato único de encaixe: novos tipos além de cilindro e anel
  (plano de apoio, padrão de furos, trilho e folga por classe de ajuste), e o
  esboço e as famílias passando a declarar portas em vez de contatos próprios;
- o nível zero: a forma global N2 estendida com as primitivas do esboço (cone,
  esfera, anel, revolução, extrusão de perfil côncavo, tubo) e com a ligação ao
  nível detalhado, em que a receita refina dentro do envelope e das portas da
  blocagem;
- o esboço refeito sobre o nível zero, aproveitando o que no módulo atual é
  processo e não geometria (Condutor, unidades, notas de passagem, Marcos,
  crítico com escala ancorada e vistas); o módulo atual fica congelado até a
  troca e continua servindo à skill `esbocar-opcoes`;
- a camada de features sobre os seletores que já existem: seleção de face e
  aresta por propriedade geométrica (direção da normal, posição extrema, tipo),
  perfil 2D com furo e deslocamento de contorno, curva com arco, tangente e
  spline, e as operações que hoje pedem identificador passando a aceitar seleção;
- as primeiras ferramentas como extensões nativas, na ordem da contagem por
  objeto: casca com espessura, chapa dobrada, articulações e estrutura de barras,
  cada uma aceita pelo crítico em objetos da lista nos extremos das faixas e num
  ponto médio;
- a verificação ancorada: o G01 da forma global, a conferência contra foto e o
  contorno por parte no caminho de toda peça, antes do crítico, que julga só o
  que a medida não decide; e o crítico calibrado por um conjunto fixo de imagens
  com defeitos conhecidos e nota esperada;
- as primeiras famílias, as primitivas 2.0: peças paramétricas aprovadas que a
  IA chama com poucos parâmetros em vez de reconstruir, feitas como composições
  procedurais sobre as ferramentas, em dois níveis, de componente (roda e pneu,
  cilindro hidráulico, mola, fixador, articulação) e de objeto (montagens de
  componentes, como roupeiro e cadeira), escolhidas entre as que mais se repetem
  na lista; cada uma é aprovada pela varredura de parâmetros e pelo crítico nos
  extremos das faixas e num ponto médio, com as portas conferidas;
- regra que vira código: quando uma ferramenta ou feature nova torna uma regra
  verificável, a regra sai da leitura obrigatória e passa a ser gate, recusa do
  executor ou aviso com mensagem que explica, e o documento guarda só o que é
  julgamento;
- o custo como medida: tokens, rodadas e nota por unidade gravados em cada
  rodada, e um banco de provas com os mesmos objetos refeitos para comparar.

## Excluído

- o OCCT como kernel de autoria; ele continua só na exportação STEP. A
  [análise de agosto](../../historico/ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md)
  o rejeitou para ativo visual e deixou a reabertura para requisito de
  fabricação ou tolerância de peça mecânica, que este plano não tem; a hipótese
  volta se a camada de features sobre a malha não der arredondamento ou casca
  aceitáveis;
- o que está congelado: a carroceria por casca deformável e o vocabulário
  poligonal da bancada; o `loft` continua fora da pele exterior de carroceria,
  como a análise de agosto fixou;
- versões novas de montagem persistida: a composição fica como está até haver
  objetos que a exercitem;
- as famílias orgânicas da fase posterior;
- mudar de lugar o que já está bem desenhado (receita determinística, identidade
  semântica, montagem recursiva, mapa de dependências, revisão e impacto).

## Gate de saída

1. As portas cobrem os tipos novos, com teste, e o esboço e o gate de contato
   leem portas.
2. Um objeto da lista é esboçado no nível zero e refinado até a receita
   detalhada sem refazer posição, medida ou encaixe decididos no esboço.
3. Uma receita usa seleção por propriedade geométrica, perfil com furo e curva
   com arco sem nenhum identificador numérico escrito pela IA.
4. Casca, chapa dobrada, articulações e estrutura de barras existem como
   extensões nativas e são aceitas pelo crítico nos objetos escolhidos, nos
   extremos e no ponto médio das faixas.
5. Uma parte que diverge da referência é reprovada pela medida antes de chegar
   ao crítico, e o crítico acerta a nota esperada no conjunto de calibração.
6. Pelo menos três famílias de componente e uma de objeto estão aprovadas em
   toda a faixa e usáveis por parâmetro.
7. O banco de provas mostra tokens, rodadas e nota dos mesmos objetos antes e
   depois.
8. `npm run gates --completo` passa.

## Fatias

1. O banco de provas com a medida de custo, para ter o antes, e as portas
   estendidas como contrato único de encaixe.
2. O nível zero: a forma global N2 estendida e ligada ao nível detalhado.
3. O esboço refeito sobre o nível zero, com o processo do módulo atual.
4. A camada de features sobre os seletores existentes.
5. Casca com espessura e chapa dobrada, como extensões nativas.
6. Articulações e estrutura de barras, como extensões nativas.
7. A verificação ancorada no caminho de toda peça e o crítico calibrado.
8. As primeiras famílias de componente e de objeto, como composições.
9. O banco de provas refeito e o fechamento.

## Referências por fatia

Cada fatia parte do que a [pesquisa aberta](../../PESQUISA-ABERTA-2026-10.md) e as
[análises](../../ANALISES-DE-2026-10.md) trouxeram, e confere o link de cada
referência antes de usá-la, porque a maior parte não foi aberta na pesquisa. As
portas estendidas partem dos pontos de encaixe com nome do BOSL2, da descrição
de corpos e juntas do URDF e do MJCF, das folgas da ISO 286 e do Gridfinity como
interface padrão que cria um ecossistema de peças. O nível zero e o esboço partem
da Procedura, que monta parte por parte com encaixes tipados conferidos a cada
passo, e do ShapeAssembly e do ShapeLib como formatos pequenos de montagem e de
biblioteca de formas. A camada de features parte dos seletores de face e aresta
do CadQuery e do build123d, do problema de nome topológico do FreeCAD como erro a
evitar, e do CAD Sketcher e do SolveSpace para perfil por restrição. A casca e a
chapa partem do Solidify do Blender, da bancada SheetMetal do FreeCAD, que mantém
coerentes a peça dobrada e a planificada, e do Boxes.py para junta de dedo. As
articulações e as barras partem das dobradiças do BOSL2, do Skin e do Wireframe
do Blender e das treliças do Sverchok. A verificação parte do desvio contra
referência do CloudCompare, do achado do 3D-DefectBench de que seis vistas
bastam, do Coal e do FCL para interferência, e do MeshCheck e do 3D Print Toolbox
para defeito de malha. As famílias partem do cq_warehouse, das bancadas Fasteners
e Gears do FreeCAD e do Bolt Factory para fixador, rosca e engrenagem por norma,
e do AssemCAD como fábrica paramétrica de componentes. A parte do relatório do
Blender sobre UV, rigging e render e os modelos de IA treinados para gerar malha
ficam de fora.

## Riscos e desvios

O risco maior é o escopo: estender a base do esboço, criar a camada de features e
as ferramentas ao mesmo tempo. O desvio é que cada fatia fecha com teste e gate
antes da seguinte, e o esboço atual segue usável até o novo cobrir o que ele faz.
O segundo risco é o nível zero ficar tão pesado quanto o núcleo e perder o motivo
do esboço; o banco de provas mede isso na fatia 3, e o nível zero que custar mais
que o esboço atual não substitui o atual. O terceiro é a forma global N2, parada
desde agosto, não servir de base; a fatia 2 começa conferindo que ela ainda roda
e passa nos testes, e se não servir o nível zero é escrito ao lado dela com o
mesmo contrato de alvo e G01. O quarto é a camada de features sobre malha não dar
arredondamento ou casca bons em forma livre; nesse caso a hipótese do OCCT volta,
com o custo de identidade e de ida e volta entre malha e B-Rep já descrito na
pesquisa.

## Fechamento

A preencher.

## Depois deste plano

A biblioteca de famílias cresce a cada família nova, com o ajuste numérico dos
parâmetros contra o contorno da referência, que junta o catálogo de famílias e o
[modelador inverso](2026-08-25-modelador-inverso-priors-familia.md)
numa camada só. As ferramentas seguintes da contagem por objeto, as quatro
lacunas dos modificadores do Blender (deformação por gaiola, projeção sobre
superfície, Cast e controle de normais), a tabela única de normas e as medidas
de movimento, massa e fabricação das análises, com a física do Rapier para testar
movimento. Os geradores novos das análises e da pesquisa: a divisão por regras
do CityEngine, a distribuição com espaçamento mínimo, o Wave Function Collapse,
os campos implícitos do libfive, o Tissue, o Plating Generator e o MAP-Elites
para gerar variantes de uma família. [As partes do
braço](2026-09-26-as-partes-do-braco.md) continuam congeladas.
