# As partes do braço

**Estado:** ativo

**Território:** `procedural/pecas/braco-robotico/`, `src/autoria/etapas-de-construcao.js`, `src/autoria/lataria.js`, `tools/modelar/vistas-de-superficie.mjs`, `tools/modelar/vistas-para-critica.mjs`, `tools/modelar/conferir-pontos.mjs`, `src/autoria/porta-confere-forma.js` na conferência da porta contra a forma, por decisão da pessoa em 2026-11-09

**Descongelado em:** 2026-11-03, por decisão da pessoa, que viu na bancada o ombro desproporcional ao resto do conjunto. Estava congelado desde 2026-09-29 para o esboço deixar de custar conta à mão; os planos do esboço e das ferramentas de modelagem que vieram antes fecharam.

**Responsável:** Tiago (autoria) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-modelar`, base na main em 2026-09-26, descongelado sobre o ramo de trabalho de 2026-11-03.


Em 2026-11-05, com o braço parado, a pessoa deixou que a ferramenta de vistas do crítico (`vistas-para-critica.mjs`) passe ao plano do [esboço pelo núcleo](encerrados/2026-11-05-esboco-pelo-nucleo.md) durante a migração do pacote do crítico; ela voltou a este território quando aquele plano fechou, em 2026-11-05.
Em 2026-11-08 a pessoa passou `procedural/nucleo/operacoes/booleanas.js` ao plano da [união de tubos com arredondamento](encerrados/2026-11-08-uniao-de-tubos-com-arredondamento.md), que corrigiu o `arredondarCostura` onde o arredondamento chega à tampa plana de um tubo; ele voltou a este território quando aquele plano fechou, no mesmo dia, e o cotovelo é refeito com `unir` e `arredondarCostura`.
Em 2026-11-09, com o braço inteiro fixo e a exportação por fazer, a pessoa passou `booleanas.js`, `geradores-avancados.js` e `guarda-acervo.mjs` ao plano das [costuras e furos limpos](2026-11-09-costuras-e-furos-limpos.md) e `etapas-da-montagem.mjs` ao das [ferramentas de conferência e de vista](2026-11-09-ferramentas-de-conferencia-e-vista.md); eles voltam a este território quando aqueles planos fecharem.

## Problema observado

O plano [o braço inteiro](encerrados/2026-09-25-o-braco-inteiro.md) fechou com
a porta conferida contra a forma, o contorno tirado da imagem e o fluxo do
objeto escrito, mas o braço robótico ainda tem só base e anel da cintura
fixos. O ombro será refeito pela vista frontal, as outras partes da rodada de
alinhamento (`procedural/pecas/braco-robotico/ALINHAMENTO.md`) e as quatro
peças novas não existem, e o braço montado não sai do repositório, porque os
exportadores recebem uma receita de cada vez.

## Resultado

O braço robótico fica inteiro pelo fluxo do objeto, parte por parte, e sai
exportado com cada parte na posição da montagem, com cada parte conferida
contra o contorno da referência.

## Alinhado com a pessoa

Continuam valendo as regras do laço: uma etapa por vez, modelador novo por
etapa, crítico sem a história da construção, parada para a pessoa ao fim de
cada etapa, e etapa com defeito em aberto só passa por aceite humano.

O ombro é refeito pela vista frontal (`referencias/frontal.png`), e o fixado
continua guardado como a variação `partes/ombro-tambor`. A lateral das partes
que faltam e do ombro refeito é `referencias/lateral-sem-cabo.png`; a
`lateral.png` fica como está porque as receitas fixas a citam. O cabo externo
fica fora do modelo.

## Estado de partida

O mapa de partes da lateral sem cabo está na série 3, rodada 1, com nota 8 do
crítico; o que sobra é borda serrilhada nas divisas.

O mapa de partes da frontal fechou a série 2 com nota 9, mas a pessoa reabriu
o punho. Uma proposta de sementes feita à mão para o punho está commitada, e a
pessoa a julgou não confiável, porque na resolução da frontal o punho tem
poucos pixels. Está pendente com a pessoa escolher entre aceitar a frontal com
o punho incerto, tirando a forma do punho da lateral, ou obter uma imagem de
detalhe do punho.

Duas melhorias do mapa de partes foram propostas e ainda não aprovadas: alisar
as divisas, para tirar o serrilhado, e dar cores distintas a partes vizinhas.
Nenhuma entra sem a pessoa aprovar.

## Andamento

Em 2026-09-26 a pessoa aceitou os mapas de partes da frontal e da lateral sem
cabo com pendências. A frontal prevalece para a altura e a largura do ombro e
para a altura do braço (177, 202 e 477 mm), porque na lateral o braço cobre o
topo do ombro e o ombro cobre o pé do braço. A prancha da lateral sem cabo foi
aceita com quatro pendências de anotação, registradas em `aceite.json`.
`referencias/papeis.json` declara a lateral sem cabo como principal, a frontal
como apoio e a lateral antiga como substituída. A prancha passou a exigir
largura e altura de toda parte, e a do braço ainda não declara a altura de
`anelAntebraco` e `juntaCotovelo` nem a largura de `anelCotovelo`.

A próxima etapa é a do ombro novo pela montagem. `npm run objeto` ainda mostra
a modelagem como feita porque a montagem só declara `base`, `anelCintura` e
`ombro`; reabrir a etapa do ombro e declarar as peças novas fica para a
próxima conversa com a pessoa.

Em 2026-09-26 a pessoa reabriu a etapa `ombro` com `npm run etapas -- --reabrir`, que guarda o aceite e a receita antigos em `reaberturas`; `npm run objeto` mostra 2 de 3 fixas com o ombro como próxima, e as peças novas seguem fora da montagem até a pessoa confirmar a ordem.

Em 2026-11-03 a pessoa abriu o braço na bancada e apontou que o ombro não está proporcional ao conjunto. Medido contra a prancha da lateral sem cabo: a seção de cima do ombro tem 220 mm de largura, mais que os 189 mm da base, a altura sobre o anel da cintura é de 250 mm contra cerca de 177 mm na referência, e o anel da junta tem 210 mm de diâmetro para uma coluna de 158 mm. A pessoa descongelou o plano para refazer a proporção do ombro primeiro, com as opções desenhadas lado a lado na escala da base e da coluna da referência para ela escolher pela imagem, e as partes seguintes depois, quando ela quiser.

No mesmo dia a pessoa escolheu a opção B (seção de 190 mm, eixo a 115 mm, topo a 210 mm sobre o anel da cintura) e pediu, na mesma rodada, o encontro entre a parte de pé e a deitada sem a quina e os degraus de sombra que ela viu na bancada; a decisão está no `ALINHAMENTO.md` do braço. Duas correções de ferramenta entram no plano porque o ombro as revelou. A luz rasante só era obrigatória no pacote do crítico da peça de lataria, e as marcas do encontro passaram por oito rodadas sem ela; passa a valer também para a peça com sombreamento suave sobre uma emenda de fusão. E `npm run etapas`, ao só ler o estado, derrubou as três etapas fixas e apagou os aceites da base e do anel, porque compara o texto da receita, e o texto mudou em 2026-10-28 com a retirada das referências de terceiros sem mudar a forma; a etapa passa a comparar o que a receita gera e a guardar o aceite de quem quebrou.

O ombro foi refeito em 2026-11-03 em três rodadas (9 a 11). A rodada 9 tirou o degrau em L e foi descartada pela pessoa; a 10 e a 11 voltaram ao desenho aceito em 2026-09-29, no tamanho B e com a saída redonda na largura do bloco, e a passagem do bloco para o círculo misturada ponto a ponto. A pessoa viu também o bloco cheio da rodada 9 corrigido em imagem e ficou com o desenho em L, e aceitou a rodada 11 com as duas marcas de acabamento que o crítico apontou (nota 6): um beliscão nos cantos em que o bloco vira círculo junto ao anel e um bojo leve no encontro de baixo. A etapa `ombro` está fixa por aceite humano.

A coluna (`braco`) foi alinhada com a pessoa no mesmo dia, pelos esboços em `procedural/pecas/braco-robotico/referencias/`: cilindro reto de 156 mm do pé ao topo, 477 mm de altura, pé redondo em volta do eixo da junta do ombro e topo onde assenta o anel do cotovelo; a decisão está no `ALINHAMENTO.md` do braço.

A coluna revelou um defeito do motor. O `arredondarCostura` no encontro de dois cilindros de mesmo raio em ângulo reto recusa o raio por face sem área ou deixa triângulo degenerado, e só fecha com o pé 3 mm mais fino que a coluna, com o encontro serrilhado e com lascas (rodada 2, nota 6). A rodada 1, em vinco, tirou 7. A pessoa decidiu que a correção da ferramenta vem antes, para ver o resultado, e a coluna espera por ela; o arredondamento passa a valer para cilindros de mesmo raio, provado por teste do motor, e a coluna volta ao laço com o pé do diâmetro dela.

Em 2026-11-04 a pessoa aceitou a coluna (rodada 5) e apontou o encaixe do ombro no anel da cintura, que não tinha sido alinhado: a traseira do ombro era quadrada, e as quinas de trás passavam 29 mm além do anel de 210 mm. Entre três opções desenhadas de cima, testou a traseira redonda (opção 2, guardada para voltar se preciso), achou o formato estranho para um ombro, e ficou com as quinas de trás arredondadas (opção 3), em 75 mm para ficarem dentro do anel. As seções da quina saíam em facetas porque o lathe e o loft não passavam do bloco de 1000 ids do passo; com o sim da pessoa, os dois passam a usar a faixa estendida, como o cilindro e o cone já faziam, sem mudar peça nenhuma do acervo.

Em 2026-11-05 a pessoa reabriu o ombro na bancada pelo vão entre ele e a base e, desenhando o antes e o depois, pediu o L inteiro 30 mm mais longo na direção da junta, com a traseira no lugar, e as quinas da frente do pé também em 75 mm, para caber no anel da cintura. O encontro de baixo, arredondado depois da união dos dois lofts, deixava uma faixa de sombra inclinada na lateral; por sugestão dela, o corpo passou a ser uma malha única por subdivisão de uma gaiola em L, com a curva do encontro nos próprios pontos. Por escolha dela entre duas saídas, o topo ficou plano até a parede de trás, sem a crista do domo. Ela fez o papel do crítico e aceitou o ombro pelas imagens, e a etapa está fixa por aceite humano. A gaiola escrita na receita ficou como candidata a ferramenta geral do núcleo, no backlog. No mesmo dia saiu das definições dos agentes a frase que pedia pt-BR nas anotações de trabalho, que fazia o serviço interromper o modelador.

Ainda em 2026-11-05, com o `gaiolaPorLacos` no núcleo, a pessoa pediu a coluna refeita da mesma forma, para ver: o pé e o tubo saem de uma gaiola em planos z, sem a união dos dois cilindros, com as medidas aceitas. Ela a aceitou pelas imagens, e a etapa está fixa por aceite humano. Os limites do ajudante que a coluna mostrou estão no backlog.

Em 2026-11-08 a pessoa alinhou o anel do cotovelo e o cotovelo (seção no `ALINHAMENTO.md` do braço). O anel virou colar fixo, rente à coluna e com 25 mm, e está fixo por aceite dela. O cotovelo, na opção do tubo em pé cruzado no alto pelo tubo deitado, foi feito pelo `gaiolaPorLacos` e fica aberto: embaixo da frente, onde o tubo deitado passa do tubo em pé, o filete termina numa aba torta, e a correção é do ajudante, no backlog, por outra sessão.

Em 2026-11-09 o cotovelo foi refeito como dois tubos unidos com arredondamento e alongado a 190 mm, e entraram o anel do antebraço (único de 25 mm, rente) e o antebraço (tubo de 156 mm). Com o antebraço montado, a pessoa conferiu os eixos e viu que a junta do cotovelo girava o antebraço em torno dele mesmo; o cotovelo virou espelho do ombro, com o eixo paralelo ao dele e a saída para o lado oposto, e o antebraço virou o T da coluna. As três etapas estão fixas por aceite dela, o antebraço com o pé de 176 mm até a conferência de porta aceitar peça em T (backlog). O alinhamento passou a perguntar o eixo de cada junta. Segue o punho.

Ainda em 2026-11-09 o colar do cotovelo saiu (não gira) e a coluna cresceu 25 mm; a coluna e o cotovelo viraram uma peça só, o braço superior, depois da correção do `arredondarCostura` no T com o tubo vertical alto; os tubos passaram a 190 mm, o diâmetro do anel do ombro; a conferência da porta contra a forma passou a medir a face que assenta (território estendido pela pessoa); e o punho entrou com as três juntas, a carcaça da junta 4 no antebraço, os anéis e elos de 135 mm e o flange de 154 mm com oito furos e um central. Todas as etapas até o elo da junta 5 estão fixas por aceite dela; o anel da junta 6 e o flange também, e o braço inteiro, da base ao flange, está fixo. A conferência de porta contra a forma, corrigida aqui, tirou da fila dois itens do backlog; os limites do núcleo que o braço mostrou e a outra sessão corrige estão no backlog (`unir` com tubo tangente à tampa, `unir` de `lathe` com 192 lados, face degenerada que só o visor recusa e a auditoria incompleta por ela, `furo` numa tampa de `lathe`, registro de etapas regravado a cada leitura). O braço montado foi exportado em OBJ por um script local, fora do repositório, a pedido da pessoa, para ela testar; o exportador que lê a montagem, da fatia 2, ainda não existe no repositório. Ficam a limpeza dos contornos do braço superior que a conferência antiga forçou e a fatia 2.

## Incluído

- fechar os mapas de partes e as pranchas da frontal e da lateral sem cabo,
  com a decisão do punho tomada pela pessoa;
- as partes restantes na ordem de montagem, cada uma com o `PLANO` escrito na
  rodada de alinhamento dela: `ombro` refeito, `anelOmbro`, `braco`,
  `anelCotovelo`, `cotovelo`, `juntaCotovelo`, `anelAntebraco`, `antebraco`,
  `carcacaPunho`, `aneisPunho`, `garfoPunho`, `anelTampaPunho`, `tampaPunho` e
  `flange`, com a ordem exata conferida na montagem antes do laço de cada uma;
- a exportação do objeto montado: o exportador pede ao resolvedor da montagem
  as partes posicionadas e grava tudo junto. Peça única ou partes com a
  posição de cada uma é decidido com a pessoa antes da fatia 5;
- `conferir:referencia` por parte, comparando cada parte posicionada com o
  contorno dela no arquivo de contornos;
- dois achados herdados do [rascunho do braço robótico](encerrados/2026-09-21-o-que-o-braco-robotico-achou.md), fechado em 2026-11-05: a medida de junta do `conferir-pontos`, que toma o centro da sobreposição das caixas e erra quando uma parte entra pelo flanco da outra, como no cotovelo; e a conferência de que a técnica escrita no `PLANO` de cada parte foi a usada, que hoje é só leitura do crítico.

## Excluído

- o cabo externo com as presilhas;
- o tato, que entra em plano próprio;
- ampliar a resolução da referência por modelo, ensaiada e não adotada no
  plano anterior;
- as melhorias do mapa de partes enquanto a pessoa não as aprovar;
- o gerador de tubo por caminho, o estudo de ferramentas de forma, o limite de
  1000 ids por operação, o limite absoluto de 0,5 mm² da medida de contato e as
  normais suaves no OBJ, que entram só se uma etapa parar por falta deles.

## Gate de saída

1. os mapas de partes da frontal e da lateral sem cabo fechados por nota 9 ou
   por aceite da pessoa, e as pranchas delas aceitas;
2. todas as etapas da montagem do braço fixas, por crítico ou por aceite
   humano, com as juntas e a conferência de porta passando;
3. `conferir:referencia` mede cada parte posicionada contra o contorno dela e
   reprova parte fora da tolerância, com teste fora do braço;
4. o braço montado exportado, e o arquivo aberto de novo com cada parte na
   posição da montagem;
5. os gates verdes ao fim de cada fatia.

## Arquivos reservados

`procedural/pecas/braco-robotico/`, `modulos/contorno-da-imagem/` no que os
mapas pedirem, `tools/modelar/` no que for exportação ou conferência, os
três exportadores e o resolvedor da montagem no que a exportação precisar.

## Fatias

1. **As partes restantes.** Decisão do punho da frontal, fechamento dos mapas
   e das pranchas, e depois rodada de alinhamento e laço de cada parte na
   ordem de montagem, começando pelo ombro refeito, tudo por
   `npm run objeto`. Numeradas 4 no plano anterior.
2. **O braço sai montado.** Decisão sobre peça única ou partes posicionadas, o
   exportador lendo a montagem e `conferir:referencia` por parte. Numeradas 5
   no plano anterior.

## Riscos e parada

Partes corretas sozinhas e erradas juntas: a etapa confere encaixe, e não
proporção. Se isso aparecer, a proporção entre partes vira campo do `PLANO`, e
o contorno por parte é a medida. O risco que obriga parar é o braço exigir que
duas partes se ajustem uma à outra ao mesmo tempo: isso é solver, e vira plano
próprio. Se a frontal não der a forma do punho e não houver imagem de detalhe,
o punho para e volta à pessoa.

## Fechamento

Preencher somente ao concluir ou cancelar.

Em 2026-09-28 a pessoa comparou, em esboço, o ombro em pé e o deitado com o
ombro de tambor já modelado, e escolheu voltar a ele: o anel do ombro tem o
diâmetro do próprio ombro, como no tambor. A etapa `ombro` foi fixada de novo
por aceite humano, com os dois defeitos aceitos antes. O trabalho do ombro em
pé ficou na branch `claude/revisar-plano-ativo-cyj8c3`.
