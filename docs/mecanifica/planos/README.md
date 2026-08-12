# Planos da Mecanifica

## Estado

**Plano ativo:** [`2026-08-09-montagem-persistida-v2-relacoes-locais.md`](2026-08-09-montagem-persistida-v2-relacoes-locais.md), em R05.

O diagnóstico técnico do motor procedural foi concluído. O relatório está em
[`../RELATORIO-DIAGNOSTICO-MOTOR.md`](../RELATORIO-DIAGNOSTICO-MOTOR.md) e a
decisão final — **abrir Montagem Mínima Persistida v1** — já foi executada: o
plano está aberto em
[`2026-08-07-montagem-minima-persistida-v1.md`](2026-08-07-montagem-minima-persistida-v1.md).
O PR #33 que abriu o plano foi mergeado na `main`. A Montagem Mínima Persistida
v1 foi concluída no arquivo
[`2026-08-07-montagem-minima-persistida-v1.md`](2026-08-07-montagem-minima-persistida-v1.md).
O plano ativo está em R05 para provas A–F, fixtures persistidas v2 e contrato
canônico v2; o fechamento transversal permanece reservado para R06.

O método, as perguntas de inspeção e o padrão de evidência usados no diagnóstico
permanecem registrados em
[`../PROTOCOLO-DIAGNOSTICO-MOTOR.md`](../PROTOCOLO-DIAGNOSTICO-MOTOR.md).

Um backlog, programa ou linha candidata não autoriza implementação automática.
Um plano só fica ativo quando tem objetivo, escopo, gates, arquivos reservados,
critério de saída e encerramento registrado.

## Execução atual

R05 do plano de relações locais registra provas A–F com fixtures persistidas v2
e contrato canônico v2. A Montagem Mínima Persistida v1 foi encerrada com provas
persistidas, determinismo e contrato v1 documentado; CLI, MCP, bancada, escrita,
solver e mapa global permanecem fora desta rodada.

O diagnóstico concluiu que o motor de peça atual é adequado para servir de base
à primeira montagem persistida sem refatoração estrutural prévia. Os limites
conhecidos que não bloqueiam esse recorte são: catálogo semântico de materiais
compartilhado por referência, validação incompleta de reflexão, hierarquia
interna ainda não transportada pelo formato exportado e fragilidades de algumas
receitas históricas. O plano aberto já declara esses limites como excluídos ou
adiados.

## Programas

| Programa | Painel | Execução atual |
|---|---|---|
| MCP para agentes | [`mcp/INDEX.md`](mcp/INDEX.md) | nenhuma; autoria controlada encerrada com decisão `interromper` |

O painel de programa acompanha dependências e resultados, mas não conta como
plano executivo ativo. A Fatia 1A somente leitura foi aprovada e encerrada em
[`mcp/concluidos/01-fatia-1a-piloto-leitura.md`](mcp/concluidos/01-fatia-1a-piloto-leitura.md),
a Fatia 1B visual foi encerrada em
[`2026-08-05-mcp-fatia-1b-visual.md`](2026-08-05-mcp-fatia-1b-visual.md), a
avaliação consolidada foi concluída com decisão `corrigir` em
[`2026-08-05-mcp-avaliacao-consolidada.md`](2026-08-05-mcp-avaliacao-consolidada.md),
a correção de descoberta foi concluída com decisão `aprovar` em
[`2026-08-05-mcp-correcao-descoberta.md`](2026-08-05-mcp-correcao-descoberta.md)
e a primeira fatia de autoria controlada foi concluída com decisão `interromper`
em [`2026-08-05-mcp-autoria-controlada.md`](2026-08-05-mcp-autoria-controlada.md).

A autoria não foi publicada. O PR #25 foi fechado sem merge porque a
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
`concluído` e `cancelado`. Só existe um plano `ativo` por vez.

## Concluídos

Os planos datados e o encerramento do plano mestre estão em
[`concluidos/`](concluidos/). A tabela é um índice curto; os detalhes continuam
nos arquivos originais.

| Grupo | Estado |
|---|---|
| Fundação, identidade e portas | concluído |
| Arranjos, furos, filete e tolerâncias | concluído |
| Câmera, pose e inspeção reproduzível | concluído |
| Hierarquia, subárvore e interfaces | concluído |
| Encerramento do plano mestre | concluído |
| MCP — Fatia 1A somente leitura | concluído |
| MCP — Fatia 1B visual somente leitura | concluído |
| MCP — avaliação consolidada por agente consumidor | concluído: corrigir |
| MCP — correção de descoberta de pacotes e revisões | concluído: aprovar |
| MCP — autoria controlada de pacotes | concluído: interromper |
| Diagnóstico do motor procedural | concluído: abrir Montagem Mínima Persistida v1 |

Arquivos concluídos: [assentamento](concluidos/2026-08-02-assentamento-anular.md),
[câmera](concluidos/2026-08-02-camera-livre-reproduzivel.md), [canto](concluidos/2026-08-02-canto-composto.md),
[concordância](concluidos/2026-08-02-concordancia-por-ponto.md), [contagem](concluidos/2026-08-02-contagem-por-desvio.md),
[contato](concluidos/2026-08-02-contato-local-cilindrico.md), [encaixe](concluidos/2026-08-02-estados-de-encaixe.md),
[identidade](concluidos/2026-08-02-identidade-porta-estavel.md), [interfaces](concluidos/2026-08-02-interfaces-de-encaixe.md),
[espelho](concluidos/2026-08-02-portas-espelho-arranja.md), [pose derivada](concluidos/2026-08-02-pose-derivada-roda.md),
[pose](concluidos/2026-08-02-pose-em-referencial.md), [recusa](concluidos/2026-08-02-recusa-estrutural-montagem.md),
[tolerâncias](concluidos/2026-08-02-tolerancias-de-montagem.md), [triangulação](concluidos/2026-08-02-triangulacao-de-furos.md),
[consulta](concluidos/2026-08-03-consulta-subarvore-ia.md), [hierarquia](concluidos/2026-08-03-hierarquia-semantica-minima.md),
[inspeção](concluidos/2026-08-03-inspecao-reproduzivel-de-par.md), [seleção](concluidos/2026-08-03-selecao-subarvore-semantica.md),
[encerramento](concluidos/ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md),
[MCP Fatia 1A](mcp/concluidos/01-fatia-1a-piloto-leitura.md),
[MCP Fatia 1B](2026-08-05-mcp-fatia-1b-visual.md),
[MCP avaliação consolidada](2026-08-05-mcp-avaliacao-consolidada.md),
[MCP correção de descoberta](2026-08-05-mcp-correcao-descoberta.md),
[MCP autoria controlada](2026-08-05-mcp-autoria-controlada.md) e
[diagnóstico do motor](2026-08-06-diagnostico-motor-procedural.md).

## Abertura

**Montagem Mínima Persistida v1** está concluída. Nenhum próximo plano executivo
é autorizado automaticamente; backlog, MCP, refatoração do motor,
personalização de materiais e limpeza de receitas históricas permanecem fora do
fechamento.

Os candidatos gerais permanecem em [`BACKLOG.md`](BACKLOG.md). Etapas futuras
do MCP permanecem somente no painel `mcp/INDEX.md` até existir decisão explícita
e um novo plano executivo ativo. Para abrir outro plano, copie [`MODELO.md`](MODELO.md),
preencha objetivo, escopo, gates e encerramento esperado e atualize este índice.
