# Programa MCP — índice de planos

Este arquivo coordena as etapas em que serviços da Mecanifica são expostos por
MCP. Ele é um painel de programa, não um plano executivo e não autoriza
implementar todas as etapas.

Somente um plano datado marcado como `ativo` em
[`docs/mecanifica/planos/README.md`](../README.md) abre trabalho.

## Posição do MCP na arquitetura

MCP é uma porta de acesso para agentes. Ele não é:

- o núcleo geométrico;
- o formato de receita;
- o futuro formato de montagem;
- o mapa de composição e dependências;
- a arquitetura completa de autoria.

As capacidades e invariantes da autoria são definidas em
[`AUTORIA-IA.md`](../../AUTORIA-IA.md) e
[`MONTAGENS-SEMANTICAS.md`](../../MONTAGENS-SEMANTICAS.md). O programa MCP só
pode expor essas capacidades depois que elas existirem como serviços com
contratos próprios.

A mesma capacidade interna pode ser usada por MCP, CLI, API ou outra porta. Uma
ferramenta MCP não deve duplicar regra de negócio nem transformar limitação do
protocolo em limitação do núcleo.

## Visão macro do programa

O programa busca oferecer uma interface MCP segura e econômica para capacidades
já comprovadas da Mecanifica.

| Módulo | Finalidade | Etapas deste painel |
|---|---|---|
| 1. Leitura e revisão | Expor inspeção, validação, comparação e prova visual somente leitura sobre os serviços existentes. | preparação do núcleo e das CLIs; Fatias 1A e 1B; avaliação consolidada; correção de descoberta |
| 2. Autoria | Expor criação e alteração somente depois que alvo, transação, formato e revalidação estiverem definidos fora do adaptador MCP. | tentativa de autoria controlada; futuras etapas exigem nova definição e plano |
| 3. Materiais | Expor materiais somente depois de existir contrato canônico independente da porta de acesso. | candidato |
| 4. Orquestração e distribuição | Transportar e operar o MCP com autenticação e múltiplos agentes quando o valor local estiver comprovado. | candidato |

Os módulos são um mapa de exposição, não o roteiro mestre da autoria. Uma linha
futura não autoriza implementação até existir um plano executivo ativo.

## Estado

| Etapa | Estado | Depende de | Evidência ou saída |
|---|---|---|---|
| Preparação do núcleo e das CLIs | concluído | — | serviços importáveis, resultados estruturados e paridade das CLIs |
| Fatia 1A — piloto local somente leitura | concluído | preparação | piloto aprovado e encerramento em `docs/mecanifica/planos/mcp/concluidos/01-fatia-1a-piloto-leitura.md` |
| Fatia 1B — quatro vistas oficiais | concluído | Fatia 1A | quatro PNGs oficiais por caso, recursos e chamadas de ferramentas sem fallback |
| Avaliação consolidada do piloto visual | concluído: corrigir | Fatia 1B | inspeção e vistas aprovadas; `AVAL-01` confirmou ausência de descoberta de pacotes e revisões na issue #18 |
| Correção de descoberta de pacotes e revisões | concluído: aprovar | avaliação consolidada | PR #21 mesclado; `mecanifica://pacotes`; validação e comparação caixa-preta sem fallback ou escrita |
| Autoria controlada de pacotes | concluído: interromper | Módulo 1 aprovado | [plano datado](../2026-08-05-mcp-autoria-controlada.md); PR #25 fechado sem merge por bloqueio de publicação atômica e `no-clobber` em API portátil |
| Leitura e auditoria de montagens | ativo | contexto estrutural/visual, catálogo explícito e revalidação assistida concluídos | [plano datado](../2026-08-14-mcp-montagens-leitura.md); expõe somente leitura por IDs semânticos |
| Autoria de receitas e montagens | não definida | formato e serviços internos de autoria; alvo explícito; transação; mapa de dependências; revalidação | precisa de definição e plano próprios; não é continuação automática da autoria de pacotes |
| Contrato e ferramentas de materiais | candidato | contrato canônico prévio | provas determinísticas separadas da autoria geométrica |
| Distribuição e orquestração | candidato | valor local comprovado | decisão separada sobre HTTP, autenticação e múltiplos agentes |

## Regras do programa

- Só existe um plano executivo `ativo` por vez.
- Linhas `candidato` ou `não definida` registram dependências; não reservam
  arquivos nem autorizam implementação.
- Um subplano nasce somente quando a capacidade interna já possui objetivo,
  formato, serviços, gates e critério de parada suficientes.
- O adaptador MCP não duplica validação, defaults, escrita ou cálculo que
  pertencem ao serviço interno.
- Autoria, materiais, Git, publicação e servidor remoto nunca entram por
  expansão implícita de uma fatia de revisão.
- Acrescentar escrita exige alvo explícito, contexto somente leitura separado,
  publicação atômica, recusa de sobrescrita e estado anterior preservado.
- Alterar peça ou montagem exige descoberta e revalidação dos dependentes
  relevantes; o MCP não pode omitir essa obrigação para simplificar a resposta.
- Nomes e divisão de ferramentas futuras não são decididos neste painel.

## Estados do painel

`candidato → pronto → ativo → concluído`, com saídas alternativas `bloqueado` e
`cancelado`. A marca `não definida` indica que a própria capacidade interna ainda
não possui contrato suficiente para virar plano MCP.

Planos executivos datados usam os estados aceitos por `npm run planos:check`.

## Decisão atual

O Módulo 1 — leitura e revisão somente leitura — está **aprovado**. A extensão
somente leitura para montagens está ativa em plano executivo próprio.

A primeira tentativa de autoria controlada foi encerrada com decisão
`interromper`. O protótipo do PR #25 demonstrou planejamento puro, confirmação
determinística, paridade entre planejamento e aplicação e confinamento, mas não
satisfez simultaneamente:

1. o pacote completo aparecer em uma única transição observável;
2. um destino concorrente nunca ser sobrescrito, inclusive quando é uma pasta
   vazia.

A estratégia portátil `mkdir` exclusivo seguida de dois `rename` de arquivo
protege o nome, mas cria uma janela com destino parcial e não resiste a término
abrupto entre as movimentações. A estratégia de `rename` da pasta inteira é
atômica, mas a API disponível não oferece semântica portátil `no-replace` para
diretórios.

Uma retomada dessa fatia exige plano técnico próprio para escolher e provar um
primitivo nativo `no-replace`, um novo protocolo de commit e visibilidade com
contrato revisado, ou uma redução explícita da garantia.

Essa decisão não define a futura autoria de carros, montagens ou receitas. Antes
de discutir novas ferramentas MCP de escrita, o projeto precisa definir e
provar os serviços internos correspondentes à peça, montagem recursiva, mapa de
dependências, contexto de trabalho e revalidação. Nenhuma dessas capacidades
está autorizada por implicação.

O limite de escrita é temporal e baseado nas provas atuais, não uma restrição
permanente. Materialização segura e autoria MCP podem avançar em planos próprios
quando o fluxo interno correspondente satisfizer seus gates. Materiais e
distribuição continuam candidatos e exigem planos próprios.
