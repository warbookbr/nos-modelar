# Contexto das ferramentas de modelagem

Complemento do plano ativo [as ferramentas de
modelagem](planos/2026-10-07-as-ferramentas-de-modelagem.md), aberto quando a fatia
pede: o que já existe e ele reaproveita, as referências de cada fatia e o que vem
depois dele. Saiu do plano para a leitura de quem vai mudar o Mecanifica caber no
orçamento do roteiro `mudar`.

## O que já existe e o plano reaproveita

A forma global N2 (`src/autoria/forma-global.js`,
[contrato](CONTRATO-FORMA-GLOBAL-N2.md)) já é um nível de blocagem: a IA
declara um alvo e um andaime de volumes com nome, o andaime vira uma blocagem
neutra, e o gate G01 compara envelope, pontos de referência e silhueta em três
vistas contra o alvo. Ela aceita caixa, cilindro, prisma convexo, casco por
seções e as primitivas do esboço (cone, esfera, anel, revolução, extrusão
côncava e tubo), e a receita detalhada a refina por `REFINA`, que confere as
partes dentro do envelope dos volumes e as portas do andaime. O encaixe já tem
contrato no núcleo e na montagem: portas publicadas, a porta conferida contra a forma (`porta-confere-forma.js`),
vínculos de medida e posição derivada da porta na montagem v5; as portas só
conhecem cilindro e anel. Ferramenta nova já tem formato de entrada, a [extensão
nativa](EXTENSOES-NATIVAS-V1.md), com manifesto, teste e registro, e o exemplo
`procedural/extensoes/prisma-triangular`. Subgrafo reutilizável de operações já
tem formato, a [composição procedural](COMPOSICAO-PROCEDURAL-V1.md) em
`procedural/nucleo/composicoes.js`. A varredura de parâmetros
(`src/autoria/varrer-parametros.js`) já mede uma peça em lote dentro das faixas
declaradas. A conferência contra foto (`npm run conferir:referencia`), o
contorno por parte em milímetro (`modulos/contorno-da-imagem/`), o [fluxo do
objeto](usar/FLUXO-DO-OBJETO.md), o [aceite visual](CONTRATO-ACEITE-VISUAL.md)
e o [filtro agent-first](AGENT-FIRST.md) já existem e governam como uma
capacidade nova é aceita. O plano estende essas peças em vez de criar outras.

## Referências por fatia

As referências de cada fatia estão na [pesquisa aberta](PESQUISA-ABERTA-2026-10.md)
e nas [análises](ANALISES-DE-2026-10.md), e a fatia confere o link de cada uma
antes de usá-la, porque a maior parte não foi aberta na pesquisa. Para o contorno e
a casca, o Solidify do Blender e o deslocamento de contorno do CAD Sketcher e do
SolveSpace; para a verificação, o desvio contra referência do CloudCompare e o
achado do 3D-DefectBench de que seis vistas bastam.

## Depois do plano

A biblioteca de famílias cresce a cada família nova, com o ajuste numérico dos
parâmetros contra o contorno da referência, que junta o catálogo de famílias e o
[modelador inverso](planos/congelados/2026-08-25-modelador-inverso-priors-familia.md)
numa camada só. As ferramentas seguintes da contagem por objeto, as quatro
lacunas dos modificadores do Blender (deformação por gaiola, projeção sobre
superfície, Cast e controle de normais), a tabela única de normas e as medidas
de movimento, massa e fabricação das análises, com a física do Rapier para testar
movimento. Os geradores novos das análises e da pesquisa: a divisão por regras
do CityEngine, a distribuição com espaçamento mínimo, o Wave Function Collapse,
os campos implícitos do libfive, o Tissue, o Plating Generator e o MAP-Elites
para gerar variantes de uma família. [As partes do
braço](planos/congelados/2026-09-26-as-partes-do-braco.md) continuam congeladas.

A carcaça da empilhadeira volta com a casca nativa da fatia 6, pelo
[alinhamento](banco-de-provas/empilhadeira-2026-10-09/ALINHAMENTO.md) já
começado com a pessoa, que parou na ordem de montagem.
