# Planos da Mecanifica

## Estado

**Plano ativo:** Nenhum.

**Plano concluído mais recente:**
[`2026-08-14-revalidacao-cascata-persistida.md`](2026-08-14-revalidacao-cascata-persistida.md).

O plano abriu a revalidação em cascata como acréscimo sobre mapa, impacto,
revisões e transações existentes. R00–R06 foram concluídas com decisão
`aprovar`: contrato, persistência, derivação multi-raiz, resultados,
obsolescência, estudo de campo multi-raiz e consumo Agent-First estão provados.
Correção e publicação automática de dependentes permanecem fora.

O plano de
[`continuidade de autoria ativa`](2026-08-14-continuidade-autoria-ativa.md) foi
concluído e aprovado. Revisões imutáveis
autorizadas passam a alimentar leitura, vistas e revalidação, e o perfil de
autoria preserva as ferramentas de auditoria. Ele não abre mapa global,
correção automática de dependentes nem publicação em fontes JavaScript.

O diagnóstico técnico do motor procedural foi concluído. O relatório está em
[`../RELATORIO-DIAGNOSTICO-MOTOR.md`](../RELATORIO-DIAGNOSTICO-MOTOR.md) e a
decisão final — **abrir Montagem Mínima Persistida v1** — já foi executada: o
plano está aberto em
[`2026-08-07-montagem-minima-persistida-v1.md`](2026-08-07-montagem-minima-persistida-v1.md).
O PR #33 que abriu o plano foi mergeado na `main`. A Montagem Mínima Persistida
v1 foi concluída no arquivo
[`2026-08-07-montagem-minima-persistida-v1.md`](2026-08-07-montagem-minima-persistida-v1.md).
O plano de relações locais foi concluído no R06 pelo PR #41, mergeado na `main`
no commit `e7b80ac`. As provas A–F, fixtures persistidas v2, contrato v2 e o
documento de continuidade arquitetural estão integrados. O contexto de
montagem foi concluído no R05 na branch do PR #42. A leitura e auditoria de
montagens por MCP foi aprovada no R04, com consumo caixa-preta e visão real. O
plano de materialização e autoria segura de montagens foi concluído com decisão
`aprovar`. O experimento de autoria geométrica do zero concluiu com `corrigir`.

O método, as perguntas de inspeção e o padrão de evidência usados no diagnóstico
permanecem registrados em
[`../PROTOCOLO-DIAGNOSTICO-MOTOR.md`](../PROTOCOLO-DIAGNOSTICO-MOTOR.md).

Um backlog, programa ou linha candidata não autoriza implementação automática.
Um plano só fica ativo quando tem objetivo, escopo, gates, arquivos reservados,
critério de saída e encerramento registrado.

## Execução atual

R05 do plano de relações locais registrou provas A–F com fixtures persistidas v2
e contrato canônico v2; R06 encerrou e integrou o conjunto na `main`. A Montagem
Mínima Persistida v1 foi encerrada com provas persistidas, determinismo e
contrato v1 documentado. CLI, MCP, bancada, escrita, solver e mapa global
permanecem fora do fechamento.

O contexto de montagem acrescentou serviço puro e CLI confinada sobre v1/v2.
Ele não alterou o resolvedor, os validadores, o motor ou peças publicadas.

O mapa canônico concluiu R00–R06 com decisão `aprovar`: contrato de universo,
snapshot confinado, composição, ocorrências, relações, usos reversos, consulta
de impacto, consumo MCP reduzido, continuidade ativa e escala estão provados.
O plano de cascata persistida foi concluído no R06 após as provas
focadas em contrato, persistência, retomada, compartilhamento, resultados,
obsolescência, concorrência, MCP e estudo de campo, com decisão `aprovar`.
Qualquer evolução permanece separada de promoção automática.

O diagnóstico concluiu que o motor de peça atual é adequado para servir de base
à primeira montagem persistida sem refatoração estrutural prévia. Os limites
conhecidos que não bloqueiam esse recorte são: catálogo semântico de materiais
compartilhado por referência, validação incompleta de reflexão, hierarquia
interna ainda não transportada pelo formato exportado e fragilidades de algumas
receitas históricas. Planos futuros precisam manter esses limites explícitos
enquanto não houver evidência nova.

## Resultado pós-estudo

[`2026-08-14-contexto-de-montagem-para-ia.md`](2026-08-14-contexto-de-montagem-para-ia.md)
foi concluído no R05. Ele entrega descrição estruturada, compacta e consultável
de montagem persistida arbitrária, com cobertura explícita do que foi e do que
não foi verificado.

O estudo completo mede 18.611 bytes e a consulta reduzida, 9.002 bytes.
Renderização, MCP e autoria transacional permanecem etapas posteriores e
separadas, sem abertura automática.

Com autorização explícita de continuidade, a relação espacial direcional e o
mapa de impacto local foram concluídos no R04. Disco–pinça é fixture; o contrato
permanece neutro e não promete colisão geral.

Com autorização explícita de continuidade, o plano de materialização e autoria
segura fechou em R06: a transação, a revalidação condicionante e a autoria MCP
opt-in foram aprovadas pelas provas internas, consumidor caixa-preta e estudo de
campo repetido.

## Programas

| Programa | Painel | Execução atual |
|---|---|---|
| MCP para agentes | [`mcp/INDEX.md`](mcp/INDEX.md) | leitura, autoria de montagem e receita declarativa opt-in aprovadas |

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
| Montagem Persistida v2 — relações locais | concluído: R06, PR #41 |
| Contexto de montagem para IA | concluído: R05, PR #42 |
| Montagem v3 — separação direcional e impacto local | concluído: R04, PR #42 |
| Contexto visual e autoria segura de montagem | concluído: R05, PR #43 |
| MCP — leitura e auditoria de montagens | concluído: aprovar, R04 |
| Abertura oblonga — rasgo no `furo` | concluído: aprovar |
| Pose de criação — `em` e `eixo` nos geradores | concluído: aprovar |
| Nome de cópia no `arranja` | concluído: aprovar |

O plano da abertura oblonga está em
[`2026-08-17-abertura-oblonga.md`](2026-08-17-abertura-oblonga.md). Ele fechou a
primeira das três lacunas geométricas listadas em
[`../RELATORIO-ANALISE-GRANDES-MELHORIAS.md`](../RELATORIO-ANALISE-GRANDES-MELHORIAS.md):
`furo` passou a expressar rasgo por `ate`, sem operação nova e sem família de
endereço nova. Costuras de `lathe` e endereço único de grupo linear continuam
abertas, sem abertura automática.

A [pose de criação](2026-08-17-pose-de-criacao.md) fechou o atrito A-4: os
geradores aceitam `em` e `eixo`, e o trio criar/rotacionar/transladar vira um
passo. O acervo gastava 128 dos 853 passos (15%) só em transporte.

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

## Próxima abertura

A [autoria segura de receitas declarativas](2026-08-14-autoria-segura-receitas.md)
foi aprovada e fechou a fronteira do experimento sem executar JavaScript do
agente. A continuidade dessas revisões no catálogo foi concluída e aprovada;
o mapa canônico é agora o plano ativo e os demais candidatos permanecem no
[`BACKLOG.md`](BACKLOG.md).
