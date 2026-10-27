# Bateria rápida e retorno cedo — a bateria local abaixo de um minuto e a completa abaixo de cinco no CI

**Estado:** ativo

**Responsável:** Claude, com a pessoa autorizando o fluxo de envio por ramo no GitHub

**Repositório e base:** `warbookbr/nos-modelar`, main depois da fatia 1 do plano [renomear para Modelar](2026-10-25-renomear-para-modelar.md), que fica pausado até este fechar

## Problema observado

Em 2026-10-25 e 2026-10-27 a bateria completa levou entre 1.262 s e 1.653 s por rodada, e a padrão levou o mesmo numa mudança larga, porque os testes lentos rodam pelo que importa um arquivo mudado e a renomeação tocava quase todos. O resultado só chega no fim: o mapa de arquivos desatualizado e um script fora da lista de réguas, conferências de menos de um segundo, apareceram depois de 21 minutos, e a correção pediu outra rodada inteira, que refez os 35 gates, inclusive os que tinham passado com os mesmos arquivos. Os cerca de 300 arquivos de testes rápidos rodam sempre, uns 250 s, mesmo quando a mudança toca um módulo só. Os nove gates que abrem a bancada sobem cada um o próprio navegador e o próprio servidor, e duas baterias seguidas falharam hoje por tempo vencido quando outra carga rodava junto. Um teste sozinho, o da família aerodinâmica, leva uns 5 minutos, e a varredura do acervo levava 1.100 s até a fatia 8 do plano anterior cortá-la para 21 s sem perder o que conferia. E o envio vai direto à main, então esta máquina de quatro processadores faz o papel do CI a cada envio. A pessoa disse em 2026-10-27 que cinco minutos de espera já é muito.

## Resultado

Um módulo seletor recebe os arquivos mudados e calcula quais gates e quais testes a mudança pode afetar, pelo grafo de imports e pelo que cada gate declara ler, e só esses rodam, os baratos primeiro, parando no primeiro erro, com o resultado verde guardado pela impressão digital do que cada um lê. A bateria local fica abaixo de um minuto na maioria das mudanças e em segundos numa mudança só de documento. A mudança vai a um ramo, e o CI roda a bateria completa dividida entre várias máquinas, abaixo de cinco minutos, antes de ela entrar na main.

## Filtro Agent-First

ENVOLVER: o orquestrador `tools/gates.mjs` continua sendo a entrada e cada gate continua conferindo o que confere hoje; o seletor fica ao lado dele, como módulo próprio com teste, e usa o grafo de módulos que o vitest já calcula. Os testes lentos que encurtam são REFATORAR, medidos por etapa antes, como a varredura do acervo. O CI dividido é configuração do GitHub Actions, sem ferramenta nova.

## Incluído

O módulo seletor (`tools/gates/seletor.mjs`), com o grafo de imports dos testes e dos gates, a declaração do que cada gate lê além dos imports e a recusa do gate que lê arquivo sem declarar; o resultado guardado por gate e por arquivo de teste; a ordem em dois estágios com parada no primeiro erro; um navegador e um servidor compartilhados pelos gates da bancada; a regeneração local do mapa e das páginas dos roteiros, com o CI conferindo; a medida por etapa e o encurtamento dos testes mais lentos; o envio por ramo, com a bateria completa no CI dividida entre máquinas e a junção à main só com o CI verde.

## Excluído

Tirar qualquer conferência; a troca do vitest ou do Playwright; resultado guardado no CI.

## Invariantes

Nenhum gate deixa de rodar no CI, que roda tudo sem resultado guardado. Nada entra na main sem a bateria completa verde. Um gate ou teste que lê arquivo sem declarar reprova no seletor, em vez de ser pulado por engano. Cada teste encurtado continua conferindo o que conferia, dito na fatia com a medida de antes e de depois.

## Gate de saída

1. Uma mudança só de documento roda a bateria local em menos de 30 s, e uma mudança num módulo só em menos de 90 s, medidas em três mudanças reais de cada tipo.
2. A segunda rodada, depois de corrigir um gate, roda só o que a correção tocou.
3. A bateria completa no CI termina em menos de 5 minutos de relógio.
4. Uma mutação plantada em cada área (núcleo, peça, família, esboço, documento, bancada, MCP) é pega pela bateria local, e a mesma mudança corrigida passa.
5. Uma mudança com um teste lento quebrado plantado é barrada antes da main, e corrigida entra sozinha.

## Fatias

1. **Medida e ordem.** O tempo de cada gate e de cada arquivo de teste nas rodadas registradas, e o que cada gate lê; as conferências de menos de cinco segundos rodam primeiro e a bateria para no primeiro erro. Pronto quando uma falha de documento aparece em menos de 30 s.
2. **Seletor.** O módulo que vai dos arquivos mudados aos gates e testes afetados, com o motivo de cada um, a declaração do que cada gate lê e a recusa do que lê sem declarar; o resultado guardado pela impressão digital. Pronto quando o gate 2 passa e as mutações plantadas da área de documento e de núcleo são pegas.
3. **Bancada compartilhada e testes lentos.** Um Chromium e um servidor para os gates da bancada, e os dez arquivos de teste mais lentos medidos por etapa e encurtados sem perder o que conferem. Pronto quando os gates da bancada levam menos da metade e nenhum arquivo de teste passa de 60 s.
4. **CI dividido e envio por ramo.** A bateria completa dividida entre máquinas no GitHub Actions; o envio vai a um ramo e a junção à main só com o CI verde. Pronto quando os gates 3 e 5 passam. Para se a pessoa não quiser dar a permissão de fila ou de proteção da main.
5. **Fechamento.** As mutações plantadas de todas as áreas, a medida dos gates 1 a 3, backlog e o plano movido para `encerrados/`; o seguinte é o de [renomear para Modelar](2026-10-25-renomear-para-modelar.md), a partir da fatia 2, e depois o de ajustes no núcleo dos veículos.

## Decisões da pessoa

1. **Antes da renomeação.** Aprovada em 2026-10-27: este plano passa à frente da renomeação, que fica pausada depois da fatia 1.
2. **Meta e envio por ramo.** Aprovada em 2026-10-27: a meta é a bateria local abaixo de um minuto e a completa abaixo de cinco no CI, com o seletor no centro e o envio por ramo.

## Riscos e parada

O risco é um gate ou teste pulado que deveria ter rodado; a recusa do que lê sem declarar, as mutações plantadas e o CI rodando tudo existem para isso. Para e volta à pessoa se uma mutação plantada passar pela bateria local, se o CI dividido não cair abaixo de 10 minutos, ou se uma fatia passar de um dia.

## Andamento

Escrito em 2026-10-27 a partir da conversa com a pessoa sobre o tempo e o retorno da bateria, e reescrito no mesmo dia com a meta mais ambiciosa, o seletor no centro, a divisão da completa no CI e o encurtamento dos testes lentos. Ativado em 2026-10-27.
