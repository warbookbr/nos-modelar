# Planos do Modelar

## Estado

**Planos ativos:**

1. [planejador de execução da receita](2026-11-14-planejador-de-execucao.md). Território: `procedural/nucleo/planejador/`, `procedural/nucleo/memoria-de-execucao.js`, a opção `planejar` em `src/autoria/executar-receita.js`. Em aberto: tudo, a começar pela fatia 1 (medir sem mudar nada).
2. [revisão das verificações e dos testes](2026-11-13-revisao-das-verificacoes-e-dos-testes.md). Território: `docs/modelar/banco-de-provas/revisao-das-verificacoes-2026-11-13/`. Em aberto: tudo.
3. [testes das recusas e dos pontos sem proteção](2026-11-14-testes-das-recusas.md). Território: `procedural/nucleo/operacoes/`, `src/autoria/contatos-da-peca.js`, `tools/mcp/`, `tools/gates/`. Em aberto: a conferência final (retrato do acervo e `npm run gates`).

A lista está em ordem de prioridade. A ordem desempata quando dois planos precisam do mesmo arquivo: o de menor prioridade espera ou pede à pessoa que mude o território.


Em rascunho: [ferramenta de material](2026-11-08-ferramenta-de-material.md), para ver um material em segundos, compor relevos e reaproveitar materiais por nome; pode ser ativado, porque o plano dos materiais realistas fechou. [Rebaixo por contorno](2026-11-10-rebaixo-por-contorno.md), para o degrau, o sulco e a borda rebaixada sobre a superfície de um corpo, com a borda no raio pedido; espera um lugar de plano ativo. [Planejador de execução da receita](2026-11-14-planejador-de-execucao.md), proposta para ler a receita como grafo, agrupar subtrações, guardar o resultado por passo e executar partes independentes em paralelo, com a linha de base de tempo das peças pesadas; espera o plano ativo do núcleo.

Plano concluído ou cancelado não fica nesta pasta. Ao fechar, o plano tem o Fechamento preenchido, ganha uma linha em [`PLANOS-ENCERRADOS.md`](../decisoes/PLANOS-ENCERRADOS.md) com o que entregou e o commit em que o texto inteiro está, e sai da árvore, tudo por `npm run planos:encerrar -- <arquivo> --linha "<o que entregou>"`; a decisão que continua valendo vira registro em [`decisoes/registros/`](../decisoes/README.md). Os congelados que ainda contam têm pasta própria em [`congelados/`](congelados/README.md).

## Programas

| Programa | Painel | Execução atual |
|---|---|---|
| MCP para agentes | [`mcp/INDEX.md`](mcp/INDEX.md) | leitura, autoria de montagem e receita declarativa opt-in aprovadas |

O painel de programa acompanha dependências e resultados, mas não conta como
plano executivo ativo. A Fatia 1A somente leitura foi aprovada e encerrada em
[`mcp/concluidos/01-fatia-1a-piloto-leitura.md`](mcp/concluidos/01-fatia-1a-piloto-leitura.md),
a Fatia 1B visual foi encerrada em
[`2026-08-05-mcp-fatia-1b-visual.md`](../decisoes/PLANOS-ENCERRADOS.md), a
avaliação consolidada foi concluída com decisão `corrigir` em
[`2026-08-05-mcp-avaliacao-consolidada.md`](../decisoes/PLANOS-ENCERRADOS.md),
a correção de descoberta foi concluída com decisão `aprovar` em
[`2026-08-05-mcp-correcao-descoberta.md`](../decisoes/PLANOS-ENCERRADOS.md)
e a primeira fatia de autoria controlada foi concluída com decisão `interromper`
em [`2026-08-05-mcp-autoria-controlada.md`](../decisoes/PLANOS-ENCERRADOS.md).

A primeira autoria controlada de pacotes não foi publicada. O PR #25 foi fechado sem merge porque a
implementação portátil não demonstrou simultaneamente publicação do pacote
completo em uma única transição e recusa atômica de sobrescrita contra destino
concorrente. Uma retomada exige plano técnico separado. Edição de receita,
revisões, materiais, Git e distribuição permanecem fora.

## Contrato de plano

Todo plano curto deve declarar:

1. objetivo verificável e fora de ambiguidade;
2. hipótese ou pergunta que justifica o trabalho;
3. arquivos e identidades em escopo;
4. invariantes que não podem mudar;
5. gates e evidências esperadas;
6. limites e itens explicitamente fora;
7. resultado, decisão e caminho de encerramento.

Estados aceitos nos planos executivos datados: `rascunho`, `pronto`, `ativo`,
`concluído` e `cancelado`. Até 6 planos podem estar `ativo` ao mesmo tempo, cada um com território declarado (seção abaixo); eram 5 até 2026-11-10, quando duas sessões em paralelo abriram cada uma um plano sobre a mesma base e a pessoa deixou a decisão com quem conduzia.

Um backlog, programa ou linha candidata não autoriza implementação automática.
Um plano só fica ativo quando tem objetivo, escopo, gates, território, critério de
saída e encerramento registrado. Cada plano ativo tem o seu gate de saída e fecha sozinho.

## Território dos planos ativos

Todo plano `ativo` declara, logo abaixo do Estado, uma linha `**Território:**` com os caminhos que ele muda, cada um entre crases e separados por vírgula: pasta terminada em `/` ou arquivo. Um plano ativo que só espera a aprovação da pessoa declara `**Território:** nenhum (aguarda aprovação)`.

Dois planos ativos não podem ter território sobreposto: há sobreposição quando um caminho é igual ao outro ou é a pasta que o contém. Ficam fora dessa regra os caminhos compartilhados por todos, que estão na lista `CAMINHOS_COMPARTILHADOS` de [`tools/mapa/planos.mjs`](../../../tools/mapa/planos.mjs), a única cópia dessa lista. Quando dois planos precisarem do mesmo arquivo, vale a ordem de prioridade da lista de planos ativos acima: o de menor prioridade espera ou pede à pessoa que mude o território.

## O que o gate exige

`npm run planos:check` lê todos os planos desta pasta e das subpastas. Cada plano precisa declarar `**Estado:**` com um dos estados da lista acima ou `congelado`, e ter no máximo 300 linhas. Um plano em `rascunho`, `pronto` ou `ativo` mora na raiz, não numa subpasta, e o de `rascunho` ou `pronto` precisa de link neste índice. O gate reprova mais de 5 planos `ativo`, plano ativo sem a linha `**Território:**` e territórios sobrepostos, dizendo os dois planos e o caminho em comum. Este índice precisa da declaração `**Planos ativos:**` com a lista dos planos ativos, cada um com o nome do arquivo num link, ou `nenhum.` quando não houver plano ativo, e a lista precisa conter exatamente os planos `ativo`. O mesmo comando confere que o README.md da raiz (parágrafo "Planos ativos:"), o `docs/modelar/INDEX.md` (linha "- Planos ativos:") e este índice apontam os mesmos planos ativos, ou todos nenhum.
