# Hélice, mola, rosca e fixador: um caminho helicoidal que serve a quatro ferramentas que faltam

**Estado:** concluído

**Território:** `procedural/nucleo/caminho-helicoidal.js`, `procedural/nucleo/operacoes/friso.js`, `procedural/nucleo/uso-operacoes.js`, `procedural/familias/mola/`, `procedural/familias/fixador/`, `procedural/familias/index.js`, `tools/fixtures/helice/`, `docs/modelar/ferramentas-por-objeto.json`, `tools/modelar/capacidade.mjs`

**Responsável:** a IA da sessão na nuvem, com a pessoa aprovando a forma de cada família por imagem. A pessoa aprovou e ativou o plano em 2026-11-22 e decidiu a rosca cosmética.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-22.

## Problema observado

O [mapa de ferramentas por objeto](../pesquisas/FERRAMENTAS-POR-OBJETO.md), conferido contra o código em 2026-11-22, dá como inexistentes a mola (26 objetos), a rosca (26), o parafuso e a porca (21) e a hélice (9). Os componentes de mola e de parafuso do esboço antigo saíram com ele em 2026-11-05. As quatro ferramentas dependem do mesmo caminho helicoidal. Hoje esse caminho só sai como `friso` ao longo de uma polilinha calculada à mão na receita, e o `friso` aceita uma normal só para a polilinha inteira. Para o fio redondo da mola isso basta, mas o perfil de um filete de rosca precisa de uma normal que gire com a hélice.

## Resultado

O agente faz uma mola de compressão, de tração ou de torção, um parafuso, uma porca e uma arruela por poucos parâmetros, e qualquer peça helicoidal (rosca sem-fim, caracol, bobina, escada caracol) a partir de um ajudante que dá o caminho, sem calcular ponto.

## Filtro Agent-First

O ajudante `caminhoHelicoidal` é ENVOLVER: ele calcula os pontos e as normais da hélice e entrega a `linha` e as `normais` que o `friso` já consome, como os ajudantes de gaiola entregam o passo `subdivisao`. As `normais` por ponto no `friso` é REFATORAR pequeno: o friso já guarda uma normal por ponto por dentro e hoje repete a única declarada. A mola e o fixador são famílias pelo contrato da família, com perfis, conferência e aprovação.

## Incluído

1. O ajudante `caminhoHelicoidal({ raio, passo, voltas, sentido, pontosPorVolta, pontas })`, em mm, que devolve a polilinha e a normal radial de cada ponto, com o passo que fecha nas pontas (espiras encostadas) quando pedido. Fixture neutra e teste que mede raio, passo e voltas nos pontos.
2. As `normais` por ponto na polilinha do `friso`, exclusivas com `normal`, com recusa que diz o ponto quando a normal é paralela à tangente. O acervo sai com a mesma malha.
3. A família `mola`, com os perfis de compressão (pontas fechadas e retificadas), tração (ganchos nas pontas) e torção (braços retos), por diâmetro do fio, diâmetro externo, comprimento livre e número de espiras, e a conferência de que as espiras não se atravessam.
4. A família `fixador`, com parafuso de cabeça sextavada, allen e panela, porca sextavada e arruela lisa, de M3 a M24 pela tabela ISO de passo grosso, e a rosca como opção da família.
5. O mapa de ferramentas atualizado para hélice, mola, rosca e fixador.

## Excluído

A engrenagem, o rolamento e a polia ficam para outro plano. Rosca interna cortada por booleana, rosca fina, normas além da ISO métrica e mola cônica também ficam fora.

## Invariantes

O núcleo não ganha nome de objeto: o ajudante se chama pelo que gera, o caminho helicoidal. O `friso` com `normal` única dá a mesma malha de antes, e o acervo sai igual.

## Gate de saída

1. O ajudante e as `normais` do friso com fixture neutra, teste e o acervo igual.
2. Cada família com perfis, conferência pelo contrato da família, teste e o veredito da pessoa por imagem em `aprovacao.json`.
3. Um parafuso numa porca e uma mola entre dois pontos montados na bancada, com o contato medido.
4. `npm run gates` verde e o CI verde.

## Fatias

1. Feita em 2026-11-22: o caminho helicoidal (`caminhoHelicoidal`, com ficha em `npm run capacidade`) e as `normais` do friso, provados na peça neutra `tools/fixtures/helice/`.
2. Feita em 2026-11-22: a família `mola` (compressão, tração e torção), com a camada mecânica gravada e a forma aprovada pela pessoa por imagem; o friso ganhou a `helice` declarada, para a composição passar só números.
3. Feita em 2026-11-22: a família `fixador` (parafuso sextavado, allen e abaulado, porca e arruela, de M3 a M24 pela tabela ISO) com a rosca cosmética, a camada mecânica gravada e a forma aprovada pela pessoa por imagem.
4. Feita em 2026-11-22: a rosca fundida como opção da família `fixador` (`rosca` 2): a cabeça, a haste, o núcleo e o filete unidos por `unir` num corpo só, com `limparLascas` de área mínima igual ao quadrado de 0,01 mm, que passa na validação do STEP nas três cabeças de M3 a M24 em até 1,3 s. A pessoa autorizou gravar de novo a camada mecânica com a opção fundida e o perfil novo.
5. Fechamento em 2026-11-22, por decisão da pessoa, sem a montagem: o item 3 do gate de saída foi ao backlog.

## Decisão da pessoa

Decidido em 2026-11-22: a rosca sai cosmética, com o fundido como opção depois se um uso pedir o sólido único. O texto da escolha segue abaixo. Depois de aprovar o fixador, a pessoa pediu o fundido já neste plano, como opção pronta para quem precisar (fatia 4).


A rosca pode sair de dois jeitos. No primeiro, cosmético, o filete é um `friso` que encosta no núcleo do parafuso como sólido à parte, com o contato declarado: é rápido, determinístico e dá a imagem certa, mas o parafuso não é um sólido só no STEP. No segundo, fundido, o filete se une ao núcleo por `unir`: o STEP sai com um sólido só, a operação custa muito mais tempo por peça, e a booleana em superfície helicoidal pode pedir correção no núcleo. A recomendação é o cosmético, com o fundido como opção depois, se um uso pedir o sólido único.

## Riscos e parada

Se as `normais` por ponto mudarem a malha de alguma peça do acervo, a fatia 1 volta à pessoa antes de seguir. Se o friso não fechar a hélice de passo curto sem se cortar (o limite "curva fechada demais para a largura do perfil" do friso), o fio da mola e o filete precisam de mais pontos por volta, e o plano mede o custo antes de seguir. Se uma família passar de dois minutos de execução no ponto médio, ela para e volta com a medida.

## Fechamento

Concluído em 2026-11-22. Entregues o ajudante `caminhoHelicoidal`, as `normais` por ponto e a `helice` declarada no `friso`, a família `mola` (compressão, tração e torção) e a família `fixador` (parafuso sextavado, allen e abaulado, porca e arruela, de M3 a M24, com a rosca cosmética e a fundida), cada uma com teste, camada mecânica gravada e a forma aprovada pela pessoa por imagem; o mapa de ferramentas registra hélice, mola, rosca e fixador como parciais. Os itens 1, 2 e 4 do gate de saída passaram, com o CI verde em cada envio. O item 3, a montagem do parafuso na porca e da mola entre dois pontos com o contato medido, não foi feito: as chamadas de família na mesma receita colidem nos ids de origem, e a montagem v5 pede portas nas duas famílias e uma opção nova na mola, com reaprovação das duas; a pessoa decidiu fechar o plano e levar o item ao backlog. Também fica fora a tolerância do exportador STEP, aplicada antes da escala para mm, que recusa face menor que 1 mm² em qualquer peça pequena; foi ao backlog com a medida.

## Andamento

Em 2026-11-22 as fatias 1, 2 e 3 foram entregues; a pessoa aprovou a forma dos cinco perfis do fixador e autorizou gravar a camada mecânica dele. A pessoa aprovou a forma das três molas pelas imagens isométricas da bancada e autorizou gravar a camada mecânica do `aprovacao.json`, que deixa as camadas do crítico e da pessoa em null como nas outras famílias. Na fatia 4, a primeira união deixava uma lasca de razão 0,0031, logo acima do limite padrão do `limparLascas` (0,003), e a validação do STEP a recusava; a área mínima declarada resolve. A validação do STEP com a tolerância padrão do exportador (0,001, aplicada antes da escala para mm, logo 1 mm² de área mínima) recusa toda peça pequena, cosmética ou fundida; os testes usam 0,00001, e o exportador fica fora deste território. Na fatia 1, o fio de uma mola de 6 voltas sai sólido fechado em cerca de 45 ms e o filete de 12 voltas em cerca de 10 ms.
