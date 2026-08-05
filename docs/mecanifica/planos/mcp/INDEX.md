# Programa MCP — índice de planos

Este arquivo coordena a evolução do MCP da Mecanifica. Ele é um painel de
programa, não um plano executivo e não autoriza implementar todas as etapas.
Somente um plano datado marcado como `ativo` em
`docs/mecanifica/planos/README.md` abre trabalho.

## Visão macro do programa

O programa converte os serviços da Mecanifica em um MCP completo por três
módulos. O resultado global esperado é um serviço MCP redondo: leitura e revisão
determinísticas, autoria controlada com materiais canônicos e distribuição
segura para consumidores, sem misturar essas capacidades antes de cada uma ter
contrato, provas e critérios de parada próprios.

| Módulo | Finalidade | Etapas deste painel |
|---|---|---|
| 1. Modelagem e revisão | Expor inspeção, validação, comparação e prova visual somente leitura sobre os serviços existentes. | preparação do núcleo e das CLIs; Fatias 1A e 1B; avaliação consolidada; correção de descoberta |
| 2. Autoria e materiais | Permitir criação e alteração controladas, com `dry-run`, escrita confinada e contrato canônico de materiais. | autoria controlada; contrato e ferramentas de materiais |
| 3. Orquestração e publicação | Empacotar, transportar e operar o MCP com autenticação e múltiplos consumidores quando o valor local estiver comprovado. | distribuição e orquestração |

Os módulos são o mapa conceitual de longo prazo. As etapas abaixo continuam
sendo a fonte de verdade para estado, dependência e evidência; uma linha futura
não autoriza implementação até existir um plano executivo ativo.

## Estado

| Etapa | Estado | Depende de | Evidência ou saída |
|---|---|---|---|
| Preparação do núcleo e das CLIs | concluído | — | serviços importáveis, resultados estruturados e paridade das CLIs |
| Fatia 1A — piloto local somente leitura | concluído | preparação | piloto aprovado e encerramento em `docs/mecanifica/planos/mcp/concluidos/01-fatia-1a-piloto-leitura.md` |
| Fatia 1B — quatro vistas oficiais | concluído | Fatia 1A | quatro PNGs oficiais por caso, 2 recursos, 6 chamadas de ferramentas, zero fallback e encerramento no plano datado |
| Avaliação consolidada do piloto visual | concluído: corrigir | Fatia 1B | inspeção e vistas aprovadas; `AVAL-01` confirmou ausência de descoberta de pacotes/revisões na issue #18 |
| Correção de descoberta de pacotes e revisões | concluído: aprovar | avaliação consolidada | PR #21 mesclado; `mecanifica://pacotes`; prova R07 com validação e comparação caixa-preta, sem fallback ou escrita |
| Autoria controlada | ativo | Módulo 1 aprovado | [plano datado](../2026-08-05-mcp-autoria-controlada.md); perfil separado com planejamento e criação atômica de pacote em duas fases |
| Contrato e ferramentas de materiais | candidato | contrato canônico prévio e autoria controlada aprovada | provas determinísticas separadas da autoria geométrica |
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

## Decisão atual

O Módulo 1 — modelagem e revisão somente leitura — está **aprovado**. A primeira
etapa autorizada do Módulo 2 é
[autoria controlada de pacotes](../2026-08-05-mcp-autoria-controlada.md), com
coordenação na issue #23.

A fatia ativa adiciona um perfil MCP separado, `autoria`, com exatamente duas
ferramentas: uma planeja os bytes canônicos sem escrita e produz confirmação
determinística; a outra recalcula o plano e cria um pacote novo por publicação
atômica, sem sobrescrita. O perfil `revisao` e suas quatro ferramentas permanecem
inalterados.

Esta etapa não edita receitas JavaScript, não gera revisões, não cria contrato de
materiais e não usa Git. Materiais e distribuição continuam candidatos e exigem
planos próprios após o fechamento explícito desta fatia.
