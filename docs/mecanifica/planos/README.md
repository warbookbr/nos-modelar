# Planos da Mecanifica

## Estado

**Plano ativo:** [MCP — correção de descoberta de pacotes e revisões](2026-08-05-mcp-correcao-descoberta.md)

Um backlog, programa ou linha candidata não autoriza implementação automática.
Um plano só fica ativo quando tem objetivo, escopo, gates, arquivos reservados,
critério de saída e encerramento registrado.

## Programas

| Programa | Painel | Execução atual |
|---|---|---|
| MCP para agentes | [`mcp/INDEX.md`](mcp/INDEX.md) | correção de descoberta de pacotes e revisões |

O painel de programa acompanha dependências e resultados, mas não conta como
plano executivo ativo. A Fatia 1A somente leitura foi aprovada e encerrada em
[`mcp/concluidos/01-fatia-1a-piloto-leitura.md`](mcp/concluidos/01-fatia-1a-piloto-leitura.md),
a Fatia 1B visual foi encerrada em
[`2026-08-05-mcp-fatia-1b-visual.md`](2026-08-05-mcp-fatia-1b-visual.md), e a
avaliação consolidada foi concluída com decisão `corrigir` em
[`2026-08-05-mcp-avaliacao-consolidada.md`](2026-08-05-mcp-avaliacao-consolidada.md).

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
[MCP Fatia 1B](2026-08-05-mcp-fatia-1b-visual.md) e
[MCP avaliação consolidada](2026-08-05-mcp-avaliacao-consolidada.md).

## Abertura

Os candidatos gerais permanecem em [`BACKLOG.md`](BACKLOG.md). Etapas futuras
do MCP permanecem somente no painel `mcp/INDEX.md` até que a etapa anterior
produza evidência suficiente. Para abrir um plano executivo, copie
[`MODELO.md`](MODELO.md), preencha as provas e atualize este índice.

Referência curada do plano ativo:
`docs/mecanifica/planos/2026-08-05-mcp-correcao-descoberta.md`.
