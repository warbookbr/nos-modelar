# Organização dos documentos: uma finalidade por pasta e nada encerrado na área de trabalho

**Estado:** ativo

**Território:** `docs/modelar/usar/`, `docs/modelar/contratos/`, `docs/modelar/decisoes/`, `docs/modelar/pesquisas/`, `docs/modelar/historico/`, `tools/modelar/comecar.mjs`. Entram também os 41 documentos soltos de `docs/modelar/` que a proposta lista com destino, a pasta `docs/modelar/planos/encerrados/`, que é caminho compartilhado, e, em cada arquivo que cita um documento movido, só a linha do link. Os três arquivos de instrução por pasta entram no território quando a fatia 5 começar.

**Responsável:** a IA da sessão do furgão orquestra, com agentes; a pessoa aprovou a organização por imagem em 2026-11-13.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-13.

## Problema observado

A [revisão do projeto](2026-11-12-revisao-do-projeto-para-o-trabalho-da-ia.md) mediu 43 documentos soltos em `docs/modelar/`, com contrato, guia, visão e pesquisa lado a lado e quatro versões da montagem persistida; 118 planos encerrados inteiros na árvore (1,4 MB) e 88 arquivos de histórico; nenhuma instrução por pasta de código. A [pesquisa](../banco-de-provas/revisao-do-projeto-2026-11-13/pergunta-4-projetos-operados-por-ia.md) mostrou a prática de quem opera repositório com agente: uma finalidade por página, decisão curta e imutável no lugar do plano entregue, e documento substituído fora do índice, porque o agente lê documento velho como instrução.

## Resultado

A árvore da [proposta](../banco-de-provas/revisao-do-projeto-2026-11-13/proposta-de-organizacao-dos-documentos.md) que a pessoa aprovou: dois documentos soltos, `usar/` para fazer, `contratos/` para consultar, `decisoes/` e `pesquisas/` para entender, e nada encerrado ou substituído na área de trabalho.

## Filtro Agent-First

USAR DIRETO: o gate de links, que acusa cada link quebrado por um arquivo movido; o gerador dos roteiros; a crônica de `planos/encerrados/README.md`, que já tem uma linha por plano encerrado. ADIAR: ferramenta nova de registro de decisão; o registro é um arquivo de texto com campos fixos até haver motivo para mais.

## Incluído, em fatias pela ordem de execução

1. As pastas `contratos/`, `decisoes/` e `pesquisas/` nascem, cada uma com o `README.md` que diz o que mora nela, e os 41 documentos soltos vão para o destino da proposta, conferido arquivo a arquivo pela leitura de cada um. Os links são corrigidos onde o gate acusar, e os roteiros são regenerados. As quatro versões da montagem persistida viram um documento com a versão vigente. Onde as regras de `usar/` recusarem um guia (ele cita documento de fora, ou nenhuma skill o cita), o guia fica em `contratos/` e o motivo é relatado.
2. O levantamento das decisões em vigor. Cada um dos 118 planos encerrados e cada arquivo de `historico/` é lido, e sai dele uma de três respostas: a decisão que ainda governa trabalho novo e não está escrita em código, gate ou documento vivo; a lição já coberta, com o lugar que a cobre; ou nada. Só a primeira vira registro em `decisoes/`.
3. O registro de decisão: um arquivo curto por decisão em vigor, com a data, o que ficou decidido, o porquê, o que ela substitui e o commit e o caminho do plano de origem. Depois de entrar, o registro não é editado; uma decisão nova o substitui e ele sai do índice. O índice de `decisoes/` é gerado e conferido.
4. `planos/encerrados/` e `historico/` saem da árvore, depois de as fatias 2 e 3 fecharem. A crônica de uma linha por plano vai para `decisoes/`, com o commit em que o texto inteiro está. O roteiro `pesquisar` passa a apontar para `decisoes/`.
5. `procedural/nucleo/`, `procedural/pecas/` e `tools/` ganham cada uma um arquivo de instrução com o que só vale nela, tirado do que hoje está em documento geral, sem repetir o contrato da raiz.

## Excluído

Reescrever o conteúdo dos documentos movidos; mexer em `banco-de-provas/`, `gerado/` e `roteiros/` além dos caminhos; tirar plano em jogo ou congelado.

## Invariantes

Nenhum link quebrado: `npm run docs:links:check` verde a cada commit. O orçamento de leitura de cada roteiro não sobe. Nada sai da árvore sem o commit de origem escrito no lugar que o substitui.

## Gate de saída

1. `docs/modelar/` tem dois documentos soltos, e cada pasta tem o `README.md` que diz a finalidade dela.
2. Todo plano encerrado e todo arquivo de histórico tem a resposta da fatia 2 registrada, e toda decisão em vigor tem registro.
3. `planos/encerrados/` e `historico/` não existem na árvore, e o comando `comecar -- pesquisar` leva a `decisoes/`.
4. `npm run gates` verde, e a pessoa viu a árvore final.

## Riscos e parada

Tirar um plano cuja lição ainda é consultada: por isso a fatia 4 só roda depois da 2 e da 3, e o commit de origem fica escrito. Mover documento e quebrar citação em código: o gate de citações acusa, e o agente corrige só a linha do link. Os três arquivos de instrução por pasta entram no território quando a fatia 5 começar. A regra de `usar/` recusar os guias: o destino muda para `contratos/`, sem afrouxar a regra. Se o levantamento da fatia 2 achar mais de 40 decisões em vigor, ele para e a lista vai à pessoa antes de os registros serem escritos.

## Fechamento

Preencher ao concluir ou cancelar.
