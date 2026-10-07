# As ferramentas de modelagem

**Estado:** ativo

**Responsável:** Claude, com o aceite da pessoa

**Repositório e base:** `warbookbr/nos-mecanifica`, branch da sessão sobre a `main`

## Problema observado

O Mecanifica deve deixar uma IA modelar os objetos da [lista de
famílias](../FAMILIAS-DE-OBJETOS.md) melhor, mais barato e com mais confiança,
e hoje quatro coisas impedem isso. O esboço e o núcleo são dois motores com
unidades, formas, encaixe e gate próprios, e o que o esboço decide é refeito na
modelagem; o esboço, que deveria ser leve e barato, saiu mais caro que o núcleo
em várias tarefas quando foi usado para objeto detalhado. A IA ainda escreve
identificadores numéricos e contas de geometria à mão na receita, porque o
núcleo não tem seleção estável de face e aresta, perfil 2D com furo nem curva
com arco. Faltam as ferramentas que cobrem a lista: a [contagem por
objeto](../FERRAMENTAS-POR-OBJETO.md) põe casca com espessura em 125 objetos,
articulações em 93, estrutura de barras em 72 e chapa dobrada em 62, e a casca e
a chapa não existem. E a verificação compara a peça contra a própria declaração
dela, com o crítico visual como único juiz da semelhança com a referência. As
[análises de 2026-10](../ANALISES-DE-2026-10.md) detalham cada ponto.

## Resultado

Um núcleo só, com níveis de detalhe. O esboço passa a ser o nível zero desse
núcleo, feito de primitivas paramétricas sem malha detalhada, e cada nível
seguinte refina dentro do envelope e das interfaces do anterior, de modo que o
que o esboço decide não é refeito. Duas peças se encaixam por um contrato de
interface único, que o esboço, a montagem e o gate de contato leem do mesmo
dado. A IA descreve a peça por features (furo nesta face, arredondamento nesta
aresta, casca com tais faces abertas) e por ferramentas que geram as formas
difíceis, e o núcleo resolve a geometria. A verificação mede a peça contra o
contorno da referência antes de o crítico olhar, e o custo de cada objeto
(tokens, rodadas e nota) é registrado como dado.

## Incluído

- o documento de objeto com níveis de detalhe e o contrato único de interface
  (eixo, plano, diâmetro, padrão de furos e folga), que substituem as portas,
  as relações de montagem, os contatos do esboço e as interfaces de família
  como formas separadas de dizer que duas peças encaixam;
- o esboço refeito como nível zero do núcleo, aproveitando o que no módulo atual
  é processo e não geometria (Condutor, unidades, notas de passagem, Marcos,
  crítico com escala ancorada e vistas); o módulo atual fica congelado até a
  troca e continua servindo à skill `esbocar-opcoes`;
- a camada de features: seleção de face e aresta por propriedade geométrica,
  sem índice; perfil 2D com furo e deslocamento de contorno; curva com arco,
  tangente e spline;
- as primeiras ferramentas, na ordem da contagem por objeto: casca com
  espessura, articulações, estrutura de barras e chapa dobrada, cada uma aceita
  pelo crítico em objetos da lista nos extremos das faixas e num ponto médio;
- a verificação ancorada: o contorno em milímetro que `modulos/contorno-da-imagem/`
  tira da referência confere silhueta e medidas de cada parte antes do crítico,
  que julga só o que a medida não decide; e o crítico calibrado por um conjunto
  fixo de imagens com defeitos conhecidos e nota esperada;
- as primeiras famílias, as primitivas 2.0: peças paramétricas aprovadas que a
  IA chama com poucos parâmetros em vez de reconstruir, em dois níveis, de
  componente (roda e pneu, cilindro hidráulico, mola, fixador, articulação) e de
  objeto (montagens de componentes, como roupeiro e cadeira), escolhidas entre
  as que mais se repetem na lista de objetos; cada uma é aprovada pelo crítico
  nos extremos das faixas e num ponto médio, com as interfaces conferidas;
- regra que vira código: quando uma ferramenta ou feature nova torna uma regra
  verificável, a regra sai da leitura obrigatória e passa a ser gate, recusa do
  executor ou aviso com mensagem que explica, e o documento guarda só o que é
  julgamento;
- o custo como medida: tokens, rodadas e nota por unidade gravados em cada
  rodada, e um banco de provas com os mesmos objetos refeitos para comparar.

## Excluído

- o OCCT como kernel de autoria; ele continua só na exportação STEP, e a
  hipótese volta se a camada de features sobre a malha não der arredondamento ou
  casca aceitáveis;
- versões novas de montagem persistida: a composição fica como está até haver
  objetos que a exercitem;
- as famílias orgânicas da fase posterior;
- mudar de lugar o que já está bem desenhado (receita determinística, identidade
  semântica, montagem recursiva, mapa de dependências, revisão e impacto).

## Gate de saída

1. O contrato de interface e o documento de objeto existem, com teste, e o gate
   de contato e a montagem leem o mesmo dado.
2. Um objeto da lista é esboçado no nível zero do núcleo e refinado até a
   receita detalhada sem refazer posição, medida ou encaixe decididos no esboço.
3. Uma receita usa seleção de face e aresta, perfil com furo e curva com arco
   sem nenhum identificador numérico escrito pela IA.
4. Casca, articulações, estrutura de barras e chapa dobrada são aceitas pelo
   crítico nos objetos escolhidos, nos extremos e no ponto médio das faixas.
5. Uma parte que diverge da referência é reprovada pela medida de contorno antes
   de chegar ao crítico, e o crítico acerta a nota esperada no conjunto de
   calibração.
6. Pelo menos três famílias de componente e uma de objeto estão aprovadas em
   toda a faixa e usáveis por parâmetro.
7. O banco de provas mostra tokens, rodadas e nota dos mesmos objetos antes e
   depois.
8. `npm run gates --completo` passa.

## Fatias

1. O banco de provas com a medida de custo, para ter o antes, e o contrato único
   de interface.
2. O documento de objeto com níveis de detalhe e o nível zero de primitivas no
   núcleo.
3. O esboço refeito sobre o nível zero, com o processo do módulo atual.
4. A camada de features.
5. Casca com espessura e chapa dobrada.
6. Articulações e estrutura de barras.
7. A verificação ancorada no contorno e o crítico calibrado.
8. As primeiras famílias de componente e de objeto.
9. O banco de provas refeito e o fechamento.

## Referências por fatia

Cada fatia parte do que a [pesquisa aberta](../PESQUISA-ABERTA-2026-10.md) e as
[análises](../ANALISES-DE-2026-10.md) trouxeram, e confere o link de cada
referência antes de usá-la, porque a maior parte não foi aberta na pesquisa. O
contrato de interface parte dos pontos de encaixe com nome do BOSL2, da descrição
de corpos e juntas do URDF e do MJCF, das folgas da ISO 286 e do Gridfinity como
interface padrão que cria um ecossistema de peças. Os níveis de detalhe e o
esboço partem da Procedura, que monta parte por parte com encaixes tipados
conferidos a cada passo, e do ShapeAssembly e do ShapeLib como formatos pequenos
de montagem e de biblioteca de formas. A camada de features parte dos seletores
de face e aresta do CadQuery e do build123d, do problema de nome topológico do
FreeCAD como erro a evitar, e do CAD Sketcher e do SolveSpace para perfil por
restrição. A casca e a chapa partem do Solidify do Blender, da bancada SheetMetal
do FreeCAD, que mantém coerentes a peça dobrada e a planificada, e do Boxes.py
para junta de dedo. As articulações e as barras partem das dobradiças do BOSL2,
do Skin e do Wireframe do Blender e das treliças do Sverchok. A verificação parte
do desvio contra referência do CloudCompare, do achado do 3D-DefectBench de que
seis vistas bastam, do Coal e do FCL para interferência, e do MeshCheck e do 3D
Print Toolbox para defeito de malha. As famílias partem do cq_warehouse, das
bancadas Fasteners e Gears do FreeCAD e do Bolt Factory para fixador, rosca e
engrenagem por norma, e do AssemCAD como fábrica paramétrica de componentes. A
parte do relatório do Blender sobre UV, rigging e render e os modelos de IA
treinados para gerar malha ficam de fora.

## Riscos e desvios

O risco maior é o escopo: trocar a base do esboço, criar a camada de features e
as ferramentas ao mesmo tempo. O desvio é que cada fatia fecha com teste e
gate antes da seguinte, e o esboço atual segue usável até o novo cobrir o que
ele faz. O segundo risco é o nível zero ficar tão pesado quanto o núcleo e
perder o motivo do esboço; o banco de provas mede isso na fatia 3, e o nível
zero que custar mais que o esboço atual não substitui o atual. O terceiro é a
camada de features sobre malha não dar arredondamento ou casca bons em forma
livre; nesse caso a hipótese do OCCT volta, com o custo de identidade e de ida e
volta entre malha e B-Rep já descrito na pesquisa.

## Fechamento

A preencher.

## Depois deste plano

A biblioteca de famílias cresce a cada família nova, com o ajuste numérico dos
parâmetros contra o contorno da referência, que junta o catálogo de famílias e o
[modelador inverso](congelados/2026-08-25-modelador-inverso-priors-familia.md)
numa camada só. As ferramentas seguintes da contagem por objeto, as quatro
lacunas dos modificadores do Blender (deformação por gaiola, projeção sobre
superfície, Cast e controle de normais), a tabela única de normas e as medidas
de movimento, massa e fabricação das análises, com a física do Rapier para testar
movimento. Os geradores novos das análises e da pesquisa: a divisão por regras
do CityEngine, a distribuição com espaçamento mínimo, o Wave Function Collapse,
os campos implícitos do libfive, o Tissue, o Plating Generator e o MAP-Elites
para gerar variantes de uma família. [As partes do
braço](congelados/2026-09-26-as-partes-do-braco.md) continuam congeladas.
