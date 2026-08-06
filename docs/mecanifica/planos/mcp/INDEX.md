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
| Autoria controlada | concluído: interromper | Módulo 1 aprovado | [plano datado](../2026-08-05-mcp-autoria-controlada.md); PR #25 fechado sem merge por bloqueio de publicação atômica e `no-clobber` em API portátil |
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

O Módulo 1 — modelagem e revisão somente leitura — está **aprovado**. Não existe
plano executivo ativo.

A primeira tentativa de autoria controlada foi encerrada com decisão
`interromper`. O protótipo do PR #25 demonstrou planejamento puro, confirmação
determinística, paridade entre dry-run e aplicação e confinamento, mas não
satisfez simultaneamente estas duas invariantes:

1. o pacote completo aparece em uma única transição observável;
2. um destino concorrente nunca é sobrescrito, inclusive quando é uma pasta vazia.

A estratégia portátil `mkdir` exclusivo seguida de dois `rename` de arquivo
protege o nome, mas cria uma janela com destino parcial e não resiste a término
abrupto entre as movimentações. A estratégia de `rename` da pasta inteira é
atômica, mas a API disponível não oferece semântica portátil `no-replace` para
diretórios.

Uma retomada da autoria exige plano técnico próprio para escolher e provar um
primitivo nativo `no-replace`, um novo protocolo de commit/visibilidade com
contrato revisado, ou uma redução explícita da garantia. Nenhuma opção está
autorizada por implicação. Materiais e distribuição continuam candidatos e
exigem planos próprios.
