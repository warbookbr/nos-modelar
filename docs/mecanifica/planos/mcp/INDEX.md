# Programa MCP — índice de planos

Este arquivo coordena a evolução do MCP da Mecanifica. Ele é um painel de
programa, não um plano executivo e não autoriza implementar todas as etapas.
Somente o plano datado marcado como `ativo` em
`docs/mecanifica/planos/README.md` abre trabalho.

## Estado

| Etapa | Estado | Depende de | Evidência ou saída |
|---|---|---|---|
| Preparação do núcleo e das CLIs | concluído | — | serviços importáveis, resultados estruturados e paridade das CLIs |
| Fatia 1A — piloto local somente leitura | concluído | preparação | piloto aprovado e encerramento em `docs/mecanifica/planos/mcp/concluidos/01-fatia-1a-piloto-leitura.md` |
| Fatia 1B — quatro vistas oficiais | concluído | Fatia 1A | quatro PNGs oficiais por caso, 2 recursos, 6 tools, zero fallback e encerramento no plano datado |
| Avaliação consolidada do piloto visual | candidato | Fatia 1B | métricas comparativas e decisão de continuar, redesenhar ou parar |
| Autoria controlada | candidato | avaliação positiva | escrita confinada, atômica, com dry-run e sem sobrescrita |
| Contrato e ferramentas de materiais | candidato | contrato canônico prévio | provas determinísticas separadas da autoria geométrica |
| Distribuição e orquestração | candidato | valor local comprovado | decisão separada sobre HTTP, autenticação e múltiplos clientes |

## Regras do programa

- Só existe um plano executivo `ativo` por vez.
- Linhas `candidato` registram dependências; não reservam arquivos nem autorizam
  implementação.
- Um subplano completo nasce somente quando a etapa anterior produzir evidência
  suficiente para fechar objetivo, escopo, gates e critério de parada.
- O índice não repete detalhes dos planos; registra apenas estado, dependência e
  evidência de conclusão.
- Autoria, materiais, Git, publicação e servidor remoto nunca entram por
  expansão implícita de uma fatia de revisão.

## Estados do painel

`candidato → pronto → ativo → concluído`, com saídas alternativas `bloqueado` e
`cancelado`. Planos executivos datados usam os estados aceitos por
`npm run planos:check`.

## Próxima decisão

A Fatia 1B foi aprovada: uma única ferramenta transportou as quatro vistas
oficiais, sem escrita, fallback ou resíduo de Playwright/Vite. O programa agora
não tem plano ativo. A próxima decisão é abrir ou não uma avaliação consolidada
do piloto visual; autoria, materiais e distribuição continuam bloqueados até
essa decisão separada.
