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

O Manifold, que já é dependência, tem duas partes que o núcleo ainda não usa e
que cada fatia confere antes de escrever à mão. A `CrossSection`, sobre o
Clipper2, faz booleanas de perfil, perfil com furo, deslocamento de contorno com
canto redondo, reto ou em esquadria, fecho convexo e extrusão ou revolução direto
para sólido, e é o ponto de partida da fatia 5. O `Manifold.levelSet(sdf, caixa,
tamanhoDaAresta)` gera o sólido de uma função de distância e foi o ponto de
partida da fatia 6. Medido, não serviu para a casca de sólido facetado: uma caixa
de seis faces sai com 9056 triângulos e um cilindro de 24 lados erra a parede em
até 23%, contra 1000 ids por passo. A casca nativa recua cada face pelo plano
(`procedural/nucleo/casca.js`). Se o arredondamento sobre malha não ficar
aceitável, o plano B é o [replicad](https://github.com/sgenoud/replicad) (MIT), arredondamento e
casca exatos sobre o OpenCASCADE que o repositório já empacota, o que reabre a
decisão do OCCT só na autoria. As outras bibliotecas avaliadas estão no [módulo
de pesquisa](../../modulos/pesquisa/bibliotecas/BIBLIOTECAS.md).

## Desenho da fatia 4

A pessoa decidiu em 2026-10-10 as três escolhas da fatia: o JSON do esboço
continua como fonte de autoria, com o andaime derivado; o contrato N2 não cresce
nesta fatia, e a perda de cavidade e de rotação só vira emenda se o banco de
provas mostrar que custa nota; e o detalhe por unidade e a montagem continuam no
esboço até as famílias, com o item 3 do gate de saída provado por um objeto
refinado depois.

O esboço continua sendo onde a IA escreve, e um tradutor em `src/autoria` lê as
formas já resolvidas pelo módulo (parâmetros, componentes, simetria, arranjo e
relações viram centro e medida) e gera o andaime da forma global N2, que a
receita refina por `REFINA`. Caixa, cilindro, anel, cone, esfera, revolução,
extrusão e tubo têm correspondência exata; `de`/`para` vira tubo. O loft vira
casco por seções, a casca vira o sólido cheio, a inclinação de seção é ignorada,
raio e chanfro da caixa viram extrusão, e o tradutor devolve com o andaime um
relatório de perdas por forma, com o erro de volume e de envelope medido. Rotação
em dois eixos, furos de caixa, faixas e correntes ficam sem equivalente e são
declarados; o componente com detalhe interno é recolhido ao envelope quando passa
do orçamento. Unidades, funções, medidas do plano e contrato ficam num arquivo
derivado ao lado (`mecanifica.processo-nivel-zero@1`), com o hash da fonte. O
gate de contato continua medindo no módulo, mas a exceção de atravessar ou
encostar passa a ser justificada por porta derivada da geometria, e o Envelope
do Condutor passa a ser o verificador do `REFINA`. O Condutor lê a fonte para
unidades, Marcos e crítico, e as medidas passam a vir da blocagem.

As tarefas, cada uma de um problema e com a sua prova: (1) o módulo exporta as
formas resolvidas como dado puro, sem mudar hash nenhum; (2) o tradutor dos tipos
exatos, com volume e envelope por unidade batendo com o esboço nas fixtures da
moto, casa, mancal, cadeira e guarda-roupa; (3) as aproximações e o relatório de
perdas, com a caçamba do carrinho dentro de 1% no envelope externo; (4) as
medidas do plano lidas na blocagem, concordando com `--medidas`, e o G01 quando
houver contorno; (5) as portas no esboço e no gate de contato, com a moto ainda
aprovada e o desalinhamento de raio reprovado; (6) o Condutor lendo o nível zero,
com o percurso da moto idêntico ao esperado; (7) as vistas `--unidade` e
`--composta` pela blocagem, com a silhueta coincidindo com a do desenhista atual
nos esboços do banco; (8) um objeto refeito no caminho novo e medido em tokens,
rodadas e nota contra a medição gravada, e só então a troca da skill
`esboco-detalhado`.

## Desenho da fatia 9

A pessoa decidiu em 2026-10-11: a família e o componente do esboço de mesmo nome
convivem, com uma conferência pelo `REFINA` de que o componente expandido cabe no
envelope e nas portas da família; a família de várias peças e o objeto são
montagens v5 geradas pela família, para a articulação ser conferida de verdade; e
as primeiras famílias são dobradiça, roda e pneu e cilindro hidráulico, com o
roupeiro de objeto, porque mola e fixador pedem hélice e rosca, que não existem,
e não exercitam casca, chapa nem barras.

Cada família é uma pasta em `procedural/familias/<id>/` com o contrato
`mecanifica.familia@1` (`familia.json`: nível, parâmetros com unidade, padrão,
mínimo, máximo e ponto médio, restrições com motivo, portas, ferramentas,
perguntas do crítico e o vínculo com o esboço), a composição procedural, um
`derivar.js` puro que transforma os parâmetros em milímetro nos argumentos da
composição (a composição v1 só substitui valores) e o `aprovacao.json` com os
pontos aprovados presos ao hash da geometria. Quem chama usa `chamar(familia,
id, parametros)`, que confere faixa e restrição. A aprovação tem três camadas: a
mecânica, sem token, varre os parâmetros e confere portas, parede da casca,
planificado da chapa, corte das barras e curso da articulação; o crítico julga
mínimo, máximo e ponto médio, com dois julgamentos nos pontos de borda e o menor
valendo, enquanto a fatia 8 não calibra o crítico; e a pessoa assina a prancha
dos três pontos.

O contrato, o validador e a chamada (tarefas 1 e 2) estão descritos em [contrato da
família](CONTRATO-DA-FAMILIA.md). As tarefas, cada uma com a sua prova: (1) contrato e validador; (2) o `chamar`
com faixa, restrição, `derivar` e registro explícito; (3) a varredura e o
`descrever` enxergando o registro de composições; (4) a aprovação mecânica e o
`familias:check`; (5) a conferência com o esboço pelo `REFINA`; (6) roda e pneu
de disco; (7) a roda raiada, que aceita as barras; (8) a dobradiça, com chapa e
articulação; (9) o cilindro hidráulico, com casca e articulação prismática; (10)
o roupeiro, depois de conferir que a montagem v5 aceita parâmetro por instância;
(11) o fechamento do item 7 do gate.

## Pendências da camada de features

O [suporte de tubo](banco-de-provas/suporte-tubo-2026-10-10/README.md) provou o
item 4 do gate de saída e mostrou duas limitações do `arredondarAresta`, que a
pessoa mandou corrigir antes de qualquer peça de chapa com furo. A aresta da
tampa de um perfil com furo ou de um contorno por trechos, que saía em leque de
peças convexas, passou a arredondar: as faces coplanares que se tocam por aresta
contam como uma só (`operacoes/arestas-em-grupos.js`), e a recusa que sobra é a de
raio que passa de um vértice da tampa. O vértice onde duas ou três arestas
arredondadas se encontram foi o segundo defeito: numa tampa partida o segundo
arredondamento de um canto era recusado, e numa face inteira ele passava e
deixava o painel do primeiro empenado (9,75 mm fora do plano numa caixa de
100 mm com raio de 10 mm). Agora o canto fecha em esquadria
(`operacoes/cantos-arredondados.js`): as retas de vértice das duas faixas se
cruzam, o anel de pontas da faixa antiga escorrega até o encontro e vira também o
da nova, e no canto de três o vértice triplo cai a 45° do arco. Cada aresta segue
sendo uma chamada de `sel.onde` para uma aresta só, em qualquer ordem, e as ordens
testadas dão os mesmos polígonos. A prova está em
`operacoes/arredondar-canto.test.ts`: a caixa com as 12 arestas (80 vértices, 78
faces, 78 planos conferidos contra os calculados à mão, raio medido em cada ponto
de painel) e a chapa com furo com as quatro bordas do topo (volume retirado igual
à soma dos prismas menos a sobreposição dos quatro cantos). O que o remate recusa
com a causa: raio ou número de painéis diferentes entre as arestas do canto,
arestas que não se cruzam a 90°, faixa editada depois de arredondada e número
ímpar de painéis onde três arestas se encontram (o chanfro de `filete`, de um
painel, fecha o canto de duas e recusa o de três). Falta refazer o suporte de
tubo com essa correção, e ele entra no acervo com a aprovação da pessoa.

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
