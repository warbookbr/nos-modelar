# Bateria rápida e retorno cedo — o gate que falha avisa em segundos e o que não mudou não roda de novo

**Estado:** rascunho

**Responsável:** Claude

**Repositório e base:** `warbookbr/nos-modelar`, main depois do fechamento do plano [renomear para Modelar](2026-10-25-renomear-para-modelar.md)

## Problema observado

Em 2026-10-25 a bateria completa levou entre 1.262 s e 1.653 s por rodada, e o resultado só chega no fim. Numa delas, o mapa de arquivos desatualizado e um script fora da lista de réguas, duas conferências de menos de um segundo, só apareceram depois de 21 minutos, e a correção pediu outra rodada inteira, que refez os 35 gates, inclusive os que tinham passado com os mesmos arquivos. Os nove gates que abrem a bancada sobem cada um o próprio navegador e o próprio servidor, que em 2026-09-22 eram metade do tempo da bateria e são a origem das falhas por disputa do cache do Vite. Os cerca de 300 arquivos de testes rápidos rodam sempre, uns 250 s, mesmo quando a mudança toca um módulo só. E o mapa e as páginas geradas dos roteiros reprovam quando não foram regenerados, quando a própria bateria poderia gerá-los.

## Resultado

O gate que falha avisa em segundos, a segunda rodada depois de uma correção roda só o que a correção tocou, e a bateria local da maioria das mudanças leva poucos minutos; a completa e o CI continuam rodando tudo, sem resultado guardado.

## Filtro Agent-First

ENVOLVER: o orquestrador `tools/gates.mjs` continua sendo a entrada, e cada gate continua conferindo o que confere hoje. O que muda é a ordem, o resultado guardado por impressão digital dos arquivos, o navegador compartilhado e a seleção dos testes rápidos.

## Incluído

A ordem em dois estágios, com as conferências de menos de cinco segundos antes e parada se uma falhar; o resultado de cada gate guardado com a impressão digital dos arquivos que ele lê, e pulado na bateria local quando nada deles mudou; um navegador e um servidor compartilhados pelos gates da bancada; a seleção dos testes rápidos pelo grafo de imports, com os testes que leem arquivo sem importá-lo declarando o que leem; a regeneração local do mapa e das páginas dos roteiros, com o CI conferindo; o envio por ramo, com a bateria completa no CI antes de a mudança entrar na main; a junção dos gates de documentação que conferem só a própria documentação, se a medida mostrar que isso economiza.

## Excluído

Tirar qualquer conferência, os gates do CI, os testes lentos, que já rodam por impacto, e a troca do vitest ou do Playwright.

## Invariantes

Nenhum gate deixa de rodar no `--completo` e no CI. O resultado guardado nunca vale no CI. Nada entra na main sem a bateria completa verde, local ou no CI. Um gate que lê um arquivo e não o declara reprova, em vez de ser pulado por engano.

## Gate de saída

1. Uma falha numa conferência barata aparece em menos de 30 s depois de chamar a bateria.
2. A segunda rodada, depois de corrigir um gate de documentação, leva menos de um décimo da primeira.
3. Os gates da bancada levam menos da metade do tempo medido antes, sem falha nova por cache.
4. Uma mutação plantada em cada área (núcleo, peça, documento, bancada) é pega pela bateria local, e `npm run gates -- --completo` passa.

## Fatias

1. **Medida e ordem.** O tempo de cada gate e o que cada um lê, medidos; os dois estágios com parada no primeiro.
2. **Resultado guardado.** A impressão digital por gate, a declaração do que cada um lê e a recusa do que lê sem declarar.
3. **Navegador compartilhado.** Um Chromium e um servidor para os gates da bancada.
4. **Testes rápidos por impacto e geração local.** A seleção pelo grafo de imports e a regeneração das páginas.
5. **Envio por ramo, com o CI rodando a completa.** Quem integra roda a bateria local e envia para um ramo; o CI roda a bateria completa nele, e a junção à main só acontece com o CI verde, por fila de integração ou pelo próprio fluxo de envio, sem push direto na main. Pronto quando uma mudança com um teste lento quebrado plantado é barrada antes da main e a mesma mudança corrigida entra sozinha. Para se a espera do CI passar de 30 minutos por envio ou se a fila exigir permissão que a pessoa não quer dar.
6. **Fechamento.** As mutações plantadas, backlog e o plano movido para `encerrados/`; o seguinte é o de ajustes no núcleo dos veículos.

## Riscos e parada

O risco é um gate pulado que deveria ter rodado, porque leu um arquivo sem declarar; a recusa da fatia 2 e as mutações plantadas existem para isso. Para e volta à pessoa se uma mutação plantada passar pela bateria local, ou se o ganho medido na fatia 1 não justificar as fatias seguintes.

## Andamento

Escrito em 2026-10-27 a partir da conversa com a pessoa sobre o tempo e o retorno da bateria, sem implementação. No mesmo dia a pessoa pediu a fatia 5, o envio por ramo com o CI rodando a completa, como fazem os times que têm suítes longas.
