# As partes do braço

**Estado:** congelado
**Congelado em:** 2026-09-29, por decisão da pessoa · **Base:** branch `claude/revisar-plano-ativo-cyj8c3`

**Por que foi congelado:** a pessoa abriu o plano [o esboço sem conta à
mão](../encerrados/2026-09-29-o-esboco-sem-conta-a-mao.md), que melhora a ferramenta de
esboço, para o esboço deixar de custar coordenadas calculadas à mão antes de a
modelagem do braço seguir. O plano das partes do braço tinha sido descongelado
no mesmo dia, depois de o plano [união de sólidos](../encerrados/2026-09-28-uniao-de-solidos.md)
fechar com `unir`, `subtrair`, `intersectar`, o arredondamento da costura e o
ombro refeito e fixado.

**Condição de descongelamento:** a pessoa decidir. O plano
[o esboço detalhado coerente](../encerrados/2026-10-01-o-esboco-detalhado-coerente.md)
fechou em 2026-10-06 e o plano ativo passou a ser
[o catálogo de famílias](../2026-10-06-o-catalogo-de-familias.md).

**O que a união deixou para este plano:** o ombro de coluna unida ao braço está
fixo na montagem. O inventário do que cada parte restante pede ao núcleo está no
fechamento do plano da união, e a lacuna que ele apontou, o arredondamento das
bordas convexas e internas, foi resolvida com limitações escritas em
`docs/mecanifica/referencias/GOTCHAS-POR-OPERACAO.md`. Cada etapa passa a
cumprir o passo [Pare e analise](../../usar/PARE-E-ANALISE.md) antes de ser dada
por boa e antes de pedir o aceite da pessoa.

**Fica parado:** as partes restantes, na ordem anelOmbro, braco, anelCotovelo,
cotovelo, juntaCotovelo, anelAntebraco, antebraco, carcacaPunho,
anelTampaPunho, tampaPunho, aneisPunho, garfoPunho e flange; e a exportação do
braço montado. O ombro de tambor segue em `partes/ombro-tambor`.

**Responsável:** Tiago (autoria) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-mecanifica`, base na main em 2026-09-26.

## Problema observado

O plano [o braço inteiro](../encerrados/2026-09-25-o-braco-inteiro.md) fechou com
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
  contorno dela no arquivo de contornos.

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
mapas pedirem, `tools/mecanifica/` no que for exportação ou conferência, os
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
