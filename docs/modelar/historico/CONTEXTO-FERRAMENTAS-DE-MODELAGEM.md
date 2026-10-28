# Contexto das ferramentas de modelagem

Complemento do plano [as ferramentas de
modelagem](../planos/encerrados/2026-10-07-as-ferramentas-de-modelagem.md), aberto quando a fatia
pede: o que já existe e ele reaproveita, as referências de cada fatia e o que vem
depois dele. Saiu do plano para a leitura de quem vai mudar o Mecanifica caber no
orçamento do roteiro `mudar`.

## O que já existe e o plano reaproveita

A forma global N2 (`src/autoria/forma-global.js`,
[contrato](../CONTRATO-FORMA-GLOBAL-N2.md)) já é um nível de blocagem: a IA
declara um alvo e um andaime de volumes com nome, o andaime vira uma blocagem
neutra, e o gate G01 compara envelope, pontos de referência e silhueta em três
vistas contra o alvo. Ela aceita caixa, cilindro, prisma convexo, casco por
seções e as primitivas do esboço (cone, esfera, anel, revolução, extrusão
côncava e tubo), e a receita detalhada a refina por `REFINA`, que confere as
partes dentro do envelope dos volumes e as portas do andaime. O encaixe já tem
contrato no núcleo e na montagem: portas publicadas, a porta conferida contra a forma (`porta-confere-forma.js`),
vínculos de medida e posição derivada da porta na montagem v5; as portas só
conhecem cilindro e anel. Ferramenta nova já tem formato de entrada, a [extensão
nativa](../EXTENSOES-NATIVAS-V1.md), com manifesto, teste e registro, e o exemplo
`procedural/extensoes/prisma-triangular`. Subgrafo reutilizável de operações já
tem formato, a [composição procedural](../COMPOSICAO-PROCEDURAL-V1.md) em
`procedural/nucleo/composicoes.js`. A varredura de parâmetros
(`src/autoria/varrer-parametros.js`) já mede uma peça em lote dentro das faixas
declaradas. A conferência contra foto (`npm run conferir:referencia`), o
contorno por parte em milímetro (`modulos/contorno-da-imagem/`), o [fluxo do
objeto](../usar/FLUXO-DO-OBJETO.md), o [aceite visual](../CONTRATO-ACEITE-VISUAL.md)
e o [filtro agent-first](../AGENT-FIRST.md) já existem e governam como uma
capacidade nova é aceita. O plano estende essas peças em vez de criar outras.

## Referências por fatia

As referências de cada fatia estão na [pesquisa aberta](../PESQUISA-ABERTA-2026-10.md)
e nas [análises](../ANALISES-DE-2026-10.md), e a fatia confere o link de cada uma
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
de pesquisa](../../../modulos/pesquisa/bibliotecas/BIBLIOTECAS.md).

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

## Desenho da fatia 8

Aprovado pela pessoa em 2026-10-11, com a picape reescrita e cinco julgamentos
nas quatro imagens-chave e três nas outras; depois, a pessoa cortou a rodada de
comparação com o brief atual, que a linha de base de 2026-10-08 já cobre, e a
tarefa 6 roda só o brief novo. Hoje o veredito do `descrever`
confere plano de partes, `REFINA`, contatos e referencial; o G01 roda só sobre o
andaime do esboço; o `conferir:referencia` é um comando solto; o comparador de
contorno por parte (IoU 0,85 e desvio de até o maior entre 5 mm e 3% da maior
dimensão) só serve ao esboço; "meça antes do crítico" é instrução de skill; e as
`perguntas` do `familia.json` são validadas, mas nenhum brief as lê.

O caminho de toda peça passa a ser, no veredito: o que já roda, depois o G01
sobre a malha da peça, depois o contorno por parte quando a pasta tem
`*.contornos.json`, e por fim as razões do `--medidas`, que ganha `razao: [A, B]`
com faixa. Os limiares são os que já existem, medidos dos dois lados pela
calibração. Sem foto, a referência é o alvo N2, o andaime ou a faixa de proporção
da família com fonte em ficha; sem nenhuma, o veredito diz "não conferido: sem
referência", sem aprovar nem barrar. A trava fica no laço: a rodada de modelagem
devolve `modelar` enquanto a medição da receita atual não passar, e o `--proximo`
do esboço só gera o brief depois das medidas.

O conjunto de calibração fica em `banco-de-provas/calibracao-do-critico/`, com
doze imagens geradas da nossa geometria, cada uma com fonte reproduzível, os
defeitos no vocabulário do crítico, a nota esperada em faixa (controle 8 a 10,
superfície 8 a 9, estrutural 5 a 7) e quem decide o defeito, a medida ou o
crítico: três controles, as dobradiças por fora (do esboço do guarda-roupa de
2026-10-08), a picape baixa reescrita (a original não foi guardada) e sete
defeitos de família. Cada imagem recebe de três a cinco julgamentos cegos; acerta
quando a mediana cai na faixa, no máximo um sai dela e o defeito esperado é
citado. O conjunto passa com 11 de 12, com as duas nomeadas obrigatórias, e a
amplitude das notas por imagem é a medida do quinto risco. As perguntas de
componente vêm das `perguntas` da família e dos componentes do esboço; as de
família de objeto (assento, veículo, móvel de caixa) ficam num arquivo próprio,
com condição por pergunta, e só tratam de forma, porque proporção vai para o
`--medidas`. Sem perguntas, o brief é o de hoje byte a byte.

As tarefas: (1) a razão no `--medidas`; (2) G01, contorno e razão no veredito,
com "não conferido"; (3) a trava no laço e no `--proximo`; (4) o conjunto, o
validador e o gate `calibracao:check`; (5) as perguntas por família no brief; (6)
as rodadas com o brief atual e o novo, com até três ajustes; (7) o gate no CI sem
aumentar a leitura obrigatória.

As tarefas 1 a 3 entraram em 2026-10-11. A razão (`mede: { razao: [A, B], faixa }`) vale no módulo do esboço, na blocagem do nível
zero, no `--medidas` e no Portão da Maquete. O veredito de `descrever` ganhou, depois do que já rodava, o G01 sobre a malha da peça
(`REFINA.alvo`), o contorno por parte (`*.contornos.json` na pasta da peça) e as razões (`RAZOES`), e o item sem referência imprime
"não conferido: sem referência" sem aprovar nem barrar; o uso está em [`CONFERIR-CONTRA-REFERENCIA.md`](../usar/CONFERIR-CONTRA-REFERENCIA.md).
Os contornos versionados do braço moram em `procedural/pecas/braco-robotico/referencias/`, na pasta do objeto e não na de uma
parte, e por isso nenhuma peça os recebe: medida a base contra eles (região `base` com o corpo e o pé), a razão interseção/união dá
0,82 na lateral, 0,79 na frontal e 0,85 na lateral sem cabo, e a caixa lateral dá 0 na lateral (a foto a mostra atrás da base, o
`PLANO` a põe em -X). A prova do contorno é, por isso, a do suporte de `tools/fixtures/refina-forma-global/`. A trava no laço é
`rodada-de-modelagem.mjs`: `--acao` mede a receita atual (veredito, `guarda:acervo`, `guarda:referencial` e `PONTOS`), identifica-a
pelo hash e devolve `modelar` enquanto a medição não passa, e `--registrar` mede de novo e recusa o veredito do crítico sobre medição
reprovada; a regra saiu da skill `laco-de-modelagem`. No esboço o `--proximo` já só pedia o brief com o Portão aprovado, e as
medidas do plano, as razões entre elas, são parte do Portão; os testes de recusa estão em `esboco-proximo-mede-antes.test.mjs`.

A tarefa 5 entrou em 2026-10-11. O campo `perguntas` do componente do esboço (e do
módulo) e o de `familia.json` têm teto de 4 por componente; as famílias de objeto
(`assento`, `veiculo`, `movel-de-caixa`) moram em `procedural/criterios/`, com teto
de 6 e uma condição `{ componente, forma }` por pergunta, e são escolhidas por
`plano.familia` no esboço e por `PLANO.familia` na peça (`PLANO.familiaProcedural`
liga a peça ao `familia.json` de que saem as perguntas por componente). As
perguntas entram depois das cinco fixas, com a pergunta aberta no fim, nos briefs
do crítico da unidade, do Marco e do objeto e, na peça, por
`rodada-de-modelagem.mjs <peça> --perguntas`. O validador recusa a pergunta que se
responde com sim ou não e a de proporção; a regra de só tratar de parte que as
vistas mostram fica com quem escreve a pergunta, porque nenhuma checagem sabe o
que uma vista mostra.

A tarefa 4 entrou em 2026-10-11. O conjunto mora em
[`banco-de-provas/calibracao-do-critico/`](../banco-de-provas/calibracao-do-critico/conjunto.json),
no formato `mecanifica.calibracao-do-critico@1` (validador em
`src/autoria/calibracao-do-critico.js`, gate em `tools/modelar/calibracao-do-critico.mjs`). Cada
uma das doze imagens tem um id neutro (`c01` a `c12`, para o nome do arquivo que o crítico lê não
contar o defeito), a fonte que a reproduz sem navegador (um esboço com o remendo declarado, ou uma
chamada de família com os parâmetros que violam restrições nomeadas e as substituições de argumento
derivado), as quatro vistas do brief do objeto (as do esboço pelo desenhista de `briefDoObjeto`, as
das famílias pelo desenhista da blocagem sobre a malha da peça executada), os defeitos esperados no
vocabulário do crítico, a faixa de nota da classe e, por defeito, `decide`: `medida` ou `critico`.
Os controles são a geometria aprovada do ponto médio de cada família, e a picape baixa é o esboço
`fontes/picape-baixa.esboco.json`, escrito à mão. O gate `calibracao:check` (no `GATES`, na bateria
curta e no `ci.yml`, sem navegador, cerca de 10 s) confere o formato; a impressão do que a fonte
desenha hoje (o SVG e a camada de cada vista) contra a gravada; o sha256 de cada PNG; que o controle
é o hash do `aprovacao.json`; que a mutação muda a geometria; o hash do agente `critico-visual.md`
e o do texto fixo do brief, para que mudar o crítico obrigue a medir de novo; e que a medida reprova
cada defeito `decide: medida` e nenhum outro (`esboco-medida:<nome>` do `--medidas`, `razao:<nome>` e
`forma:<parte>` das mesmas funções do veredito da peça), de modo que `decide` vale dos dois lados.
`npm run calibracao -- gerar` regrava as vistas, as impressões e a prancha. Os julgamentos ficam em
`resultados`, vazio até a tarefa 6, e vazio o gate diz "calibração não medida".

Para a tarefa 6 o `calibracao` ganhou três comandos, sem rodar nenhum crítico. `brief <id>` imprime o brief exato do
crítico cego: o texto fixo do brief do objeto, as perguntas de forma do esboço (com a família de objeto do plano) ou do
`familia.json`, os caminhos absolutos das quatro vistas pelo id `cNN` e a escala da nota; o gate reprova (`brief-vaza`)
o objeto ou a pergunta que traga o nome da imagem, a restrição ou a razão do defeito. A picape ganhou o remendo
`plano.familia: veiculo` para receber as perguntas de cabine e caçamba. `registrar <id> --arquivo <saida>` lê a resposta
do crítico, que termina com o JSON do veredito, e grava em `resultados` um julgamento com a nota, os defeitos, a
impressão do brief exato (sem o caminho do repositório) e a data, sob o agente e o brief fixo gravados; recusa resposta
sem JSON válido, crítico que mudou e imagem que já tem todos os julgamentos. `resumo` e o gate pontuam: a imagem
acerta quando a mediana cai na faixa, no máximo um julgamento sai dela, cada defeito `decide: critico` é citado por 4
de 5 julgamentos (2 de 3 nas imagens comuns) e, no controle, no máximo um julgamento cita defeito estrutural; cita
quem traz defeito de tipo em `tiposAceitos` ou palavra do defeito na `parte` ou no `onde`. O conjunto passa com 11 de 12 e as
duas obrigatórias certas. O resumo registra a amplitude por imagem. Enquanto faltam julgamentos o gate diz quantos faltam por imagem
e passa; com todos, reprova (`calibracao-nao-acerta`) o conjunto que não acerta.

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
família](../CONTRATO-DA-FAMILIA.md). As tarefas, cada uma com a sua prova: (1) contrato e validador; (2) o `chamar`
com faixa, restrição, `derivar` e registro explícito; (3) a varredura e o
`descrever` enxergando o registro de composições; (4) a aprovação mecânica e o
`familias:check`; (5) a conferência com o esboço pelo `REFINA`; (6) roda e pneu
de disco; (7) a roda raiada, que aceita as barras; (8) a dobradiça, com chapa e
articulação; (9) o cilindro hidráulico, com casca e articulação prismática; (10)
o roupeiro, depois de conferir que a montagem v5 aceita parâmetro por instância;
(11) o fechamento do item 7 do gate.

As tarefas 1 a 5 entraram em 2026-10-11, com o contrato em
[`CONTRATO-DA-FAMILIA.md`](../CONTRATO-DA-FAMILIA.md) e o gate `familias:check`; a
aprovação mecânica limita a parede da casca a 1,5 vez a espessura pedida e deixa
o curso da articulação para as famílias que geram montagem.

As famílias roda e pneu de disco, dobradiça e cilindro hidráulico (tarefas 6, 8
e 9) foram aprovadas em 2026-10-11 nas três camadas: a mecânica, o crítico com
dois julgamentos cegos (8 nos três pontos da roda e da dobradiça; 8, 9 e 8 no
cilindro, depois de uma rodada que prendeu os olhais por pescoço) e a pessoa, com
as [pranchas](../banco-de-provas/familias-2026-10-11/) guardadas no banco de provas.
A chapa dobrada ganhou `origemId` e a origem estrutural (aba, dobra, lado, borda,
tampa) e a dobradiça passou a fazer o nó com ela, em rolos de 270° com a chapa da
folha tangente ao rolo, que dão a porta do nó e levam o curso a 180°; a aprovação mecânica foi repetida, e o crítico e a pessoa precisam julgar de novo
a geometria nova.

A roda raiada (tarefa 7) entrou em 2026-10-11 como o `tipo` 1 da `roda-pneu`, com os raios feitos pela estrutura de barras
(de 3 a 32 raios, tubo ou barra redonda, com cruzamento ou sem ele), as cinco restrições dela e a medida de corte de cada
barra no `aprovacao.json`. Como o ponto máximo do contrato leva todos os parâmetros ao máximo, ele passou a ser raiado e
mudou de hash, e a aprovação do crítico e da pessoa, que julgaram o disco nos três pontos, foi esvaziada: o mínimo e o
médio mantêm o hash e o disco do máximo antigo também, preso no teste, mas a prancha tem de ser refeita com o máximo raiado
e julgada de novo.

O roupeiro (tarefa 10) entrou em 2026-10-11 e a pessoa o aprovou no mesmo dia. A pessoa decidiu então ampliá-lo para servir de primitiva
2.0 aos móveis de caixa da lista (guarda-roupa, armário de cozinha, cômoda, criado-mudo, estante com portas e gaveteiro): a família
passou a se chamar `movel-de-caixa`, com o roupeiro como o perfil `roupeiro`, e ganhou gavetas com trilho e articulação prismática,
portas sobrepostas e de correr, pés, vão aberto e nove perfis prontos. A aprovação ganhou os perfis e a conferência das aberturas
simultâneas; o contrato está em [`CONTRATO-DA-FAMILIA.md`](../CONTRATO-DA-FAMILIA.md#o-móvel-de-caixa), e o crítico e a pessoa precisam
julgar a geometria nova.

A `roda-pneu` ganhou a versão 2 (2026-10-11): de 50 a 2000 mm de diâmetro, com as medidas em proporção do diâmetro, quatro bandas
(pneumática, maciça, sem pneu com friso e com relevo), a raiada de duas flanges e sete perfis prontos (carro, bicicleta, carrinho de
mão, rodízio, trator, trem e carroça). O contrato da família ganhou o campo `perfis`, a chamada `{ perfil }`, a unidade `razao` e o
produto de dois parâmetros no mapa do esboço, e a aprovação mecânica passou a medir cada perfil e a varrer a escala dele. O crítico e
a pessoa precisam julgar de novo, e a descrição está em [CONTRATO-DA-FAMILIA.md](../CONTRATO-DA-FAMILIA.md#a-família-roda-pneu).

## Pendências da camada de features

O [suporte de tubo](../banco-de-provas/suporte-tubo-2026-10-10/README.md) provou o
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
painel, fecha o canto de duas e recusa o de três).

As três recusas que o suporte de tubo ainda trazia na aba de parede e na aba do
tubo foram corrigidas no núcleo (`operacoes/arestas-em-grupos.js`), cada uma com
uma peça mínima em `operacoes/arredondar-chapa-furada.test.ts`. Os quatro cantos
da aba com furos, ao longo da espessura, eram recusados porque a tampa triangulada
em leque deixa o vértice com 19 a 34 faces; agora a vizinha do lado B recebe os
pontos do arco e as outras levam o vértice à tangência, com casca fechada, faces
planas e o volume retirado igual a quatro vezes a seção do arco vezes 6 mm. A
borda lateral da frente recusava conforme `segmentosArco` (passava com 4, 6, 8 e
12, recusava com 10, 16 e 24) porque uma peça de tampa com dois cantos quase
colineares virava côncava ao mover as pontas; a peça é partida em convexas (as
novas ficam na tampa da extrusão) e o resultado é o mesmo com 4 a 24 segmentos.
As duas bordas livres de cima da aba do tubo, que terminam numa concordância,
tinham a face de ponta quase paralela à aresta, e o escorregamento do anel até
ela passava 61 mm da aresta de 10 mm; a ponta passou a terminar na seção
perpendicular com um degrau plano, o volume retirado é exatamente a seção do arco
vezes 10 mm, e esse modo só entra quando o comum recusa. Um limite novo ficou
medido: com os quatro cantos já arredondados, as arestas da tampa da frente
(laterais e topo) recusam no remate do canto, que pede uma face só onde a tampa
é um leque; na ordem inversa (tampa antes, cantos depois) as sete arestas da aba
de parede arredondam com 4, 10, 16 e 24 segmentos. O que continua recusado: o contorno que volta sobre a faixa (a
mordida semicircular com raio de 3 mm numa faceta de 1,5 mm).

O suporte de tubo foi refeito em `procedural/pecas/suporte-tubo/`, sem a
interseção com caixas, com as 13 arestas externas do plano arredondadas em 3 mm
por `sel.onde`, nenhuma recusada: na aba de parede a tampa da frente (a borda de
cima e as duas laterais) entra antes dos quatro cantos, e na aba do tubo as duas
bordas livres de cima terminam na seção perpendicular, com o degrau plano que o
núcleo escreve quando a borda termina numa concordância. A peça passou em
`guarda:acervo` e entra no acervo com a aprovação da pessoa.

O degrau do suporte, que a pessoa viu na imagem, não era acusado por gate nem por
aviso: `orfaos` ficava em 0 e a face a mais só aparecia na origem do
arredondamento. Duas correções entraram no núcleo e uma no gate. O degrau passou a deixar um
aviso em `neutro.avisos` (`ref: 'degrau'`, com a aresta, a ponta, o motivo e a
sugestão), que `descrever` mostra na descrição e que reprova o veredito da peça e o
`guarda:acervo` com a mensagem do aviso. O suporte passou a usar `cadeia` nas duas
bordas livres e sai sem aviso; as outras quatro peças do acervo não tinham degrau. E
`arredondarAresta` ganhou `cadeia` (`true` ou `{ ate: graus }`): a aresta
escolhida e as que continuam em tangência saem numa varredura só, do canto vivo de
um lado ao do outro ou no laço inteiro, sem degrau, com o raio medido em cada
vértice (desvio abaixo de 1e-9 contra o eixo do cilindro da aresta) e o volume
retirado igual à seção do arco ao longo da cadeia com a esquadria de cada junção.
O caminho escolhido foi a esquadria sobre a malha da extrusão, que dá o mesmo
contorno interno que o deslocamento da `CrossSection` (conferido na malha a 0,1 µm,
a quantização do Clipper) e, ao contrário de derivar a borda da extrusão pelos
contornos deslocados, serve também a uma tampa que já existe na peça, a um furo e
às arestas que as outras operações deixaram. A cadeia entra antes das arestas do
canto, e a receita do suporte já segue essa ordem (cadeia, laterais, cantos livres).

## Depois do plano

A biblioteca de famílias cresce a cada família nova, com o ajuste numérico dos
parâmetros contra o contorno da referência, que junta o catálogo de famílias e o
[modelador inverso](../planos/congelados/2026-08-25-modelador-inverso-priors-familia.md)
numa camada só. As ferramentas seguintes da contagem por objeto, as quatro
lacunas dos modificadores do Blender (deformação por gaiola, projeção sobre
superfície, Cast e controle de normais), a tabela única de normas e as medidas
de movimento, massa e fabricação das análises, com a física do Rapier para testar
movimento. Os geradores novos das análises e da pesquisa: a divisão por regras
do CityEngine, a distribuição com espaçamento mínimo, o Wave Function Collapse,
os campos implícitos do libfive, o Tissue, o Plating Generator e o MAP-Elites
para gerar variantes de uma família. [As partes do
braço](../planos/congelados/2026-09-26-as-partes-do-braco.md) continuam congeladas.

O plano seguinte é [o que o avião pede](../planos/encerrados/2026-10-11-o-que-o-aviao-pede.md),
que leva estes candidatos na lista de sucessão. Candidatos apontados pela pessoa em 2026-10-11: o carrinho de
mão como família de objeto (chassi, caçamba e a roda no perfil de carrinho de mão,
a partir do carrinho azul aprovado), a bacia em casca como primitiva (a caçamba
generalizada, com parede inclinada e contorno em D ou retangular), a dobradiça de
caneco para a porta sobreposta passar de 90° e as ressalvas do fechamento.

A carcaça da empilhadeira volta com a casca nativa da fatia 6, pelo
[alinhamento](../banco-de-provas/empilhadeira-2026-10-09/ALINHAMENTO.md) já
começado com a pessoa, que parou na ordem de montagem.
