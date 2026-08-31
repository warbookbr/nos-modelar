# Matriz de rastreabilidade — autoria 3D nativa para IA

**Estado:** ativo com o plano mestre  
**Plano:** [`2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md`](./planos/encerrados/2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md)  
**Base:** `d99a639`

## Como ler

Esta matriz é o índice executável de N0. Cada linha liga objetivo, capacidade,
fonte, teste, evidência, gate, fase e decisão. `existente/provado` pode ser usado
agora; `existente/limitado` tem fronteira conhecida; `proposto` ainda exige
prova; `bloqueado` não autoriza implementação indireta.

Uma linha só muda para `aprovado` quando a evidência citada existe, foi aberta ou
reexecutada, e o gate correspondente foi decidido. A ausência de imagem,
comparação, crítica ou decisão do usuário mantém o item incompleto.

## Matriz principal

| ID | Objetivo verificável | Capacidade e estado | Fonte canônica | Teste/evidência | Gate e decisão |
|---|---|---|---|---|---|
| RT-01 | preservar a base semântica | peça, montagem, identidade e revisão — existente/provado | `prototipos/procedural/v3/`, `src/autoria/`, `docs/mecanifica/ARQUITETURA.md` | `npm test`, typecheck, build, round-trip | G11; regressão bloqueia |
| RT-02 | descobrir capacidade antes de inventar operação | catálogo, combinação, lacunas e adaptador — N1 provado | `docs/mecanifica/gerado/`, `prototipos/procedural/v3/servicos/provedor-autoria.js` | testes N1, `npm run catalogo:check` | N1 concluída; promover ou registrar lacuna |
| RT-03 | definir referência e rejeições antes da malha | alvo, landmarks, silhuetas e comparação — N2 provado tecnicamente | `src/autoria/forma-global.js`, `CONTRATO-FORMA-GLOBAL-N2.md` | alvo independente, sobreposição, métricas e corpus adversarial | G01 aprovado; G02 pendente |
| RT-04 | modelar objeto inteiro reconhecível | andaime global, blocagem e vistas — N2 implementado; reconhecimento pendente | `src/autoria/forma-global.js`, `src/autoria/renderizar-forma-global-svg.js` | quatro vistas, pacote cego, crítica e aceite do usuário | G01 aprovado; G02 bloqueado sem crítico/usuário |
| RT-05 | editar superfície por intenção/região | tipo de fonte e separação fonte/derivado — N1 provado; executor — proposto | `src/autoria/contrato-autoria-3d.js`, `DOSSIE-MOTOR-SUPERFICIES-NATIVAS.md` | testes N1; depois prova de representações e edição local | G02/G07; escolher, corrigir ou descartar |
| RT-06 | manter superfície tecnicamente saudável | continuidade, malha, normais, espessura e curvatura — existente/limitado | validadores atuais + novo validador de superfície | casos bons, degenerados, G0/G1/G2, facetas e ondulação | G07; reprovação retorna à superfície |
| RT-07 | decompor sem perder a forma global | receita elevada, regiões e fonte/derivado — N1 provado; decomposição — proposta | `src/autoria/contrato-autoria-3d.js`, pacote de família futuro | testes N1; depois comparação antes/depois e influência fonte→produto | G03/G04; aceitar ou redesenhar |
| RT-08 | impedir peças flutuantes | interfaces, adjacências e conectividade — existente/limitado | montagens v4, portas e relações; ampliado em N1/N5 | grafo de adjacências, distância, orientação, contato e folga | G05/G06; componente isolado reprova |
| RT-09 | integrar superfície e mecânica | composição híbrida — existente/limitado | montagens, resolvedor e exportação | carro/robô pequeno com peça procedural e superfície nativa | G04; integrar ou retornar |
| RT-10 | manter corpo em estados válidos | pose estática — existente/limitado; trajetória — proposto | montagens/poses atuais; contrato cinemático posterior | neutra, articulada e envelope quando essencial | G05; movimento não é presumido |
| RT-11 | dar à IA um caminho único | planejador, estados, schemas, fachada e cliente caixa-preta — N1 provado | `src/autoria/servico-fluxo-autoria.js`, `RELATORIO-N1-FLUXO-AUTORIA.md` | testes N1 e `npm run autoria:schemas:check` | N1 concluída; exposição MCP permanece N7 |
| RT-12 | reduzir contexto sem esconder falha | skills, MCP e revisão — existente/limitado | `.claude/skills/`, `tools/mcp/`, `DOSSIE-FLUXO-IA-VALIDACAO-MULTIFAMILIA.md` | chamada somente leitura, proposta, captura e aplicação opt-in | G09; expor somente serviço provado |
| RT-13 | provar carro reconhecível | veículo bruto — proposto | pacote de família veículo, referência e superfície | roda/postura, capô, cabine, cintura, para-lamas, traseira e leitura cega | N4/G04; usuário aprova ou interrompe |
| RT-14 | provar humanoide conectado | corpo-base e cobertura — proposto | pacote de família humanoide, andaime e interfaces | tórax, cabeça, pelve, membros, cadeia conectada e vistas | N6/G05; usuário aprova ou interrompe |
| RT-15 | fechar ou descartar a abordagem | decisão por evidência — existente como processo; matriz — novo | plano, dossiês, relatórios e esta matriz | corpus, custos, gates, contraevidências e decisão registrada | N8; promover/corrigir/redesenhar/interromper |

## Rastreio por fase

| Fase | Entradas obrigatórias | Saídas obrigatórias | Linhas cobertas | Pode abrir a próxima? |
|---|---|---|---|---|
| N0 verdade | R2B encerrado, contraevidências, base e matriz | baseline, referência inicial, decisões separadas e dossiês | RT-01–RT-03, RT-15 | sim, somente com baseline explícito |
| N1 contrato | matriz, lacunas, dossiês e serviços existentes | schemas, estados, fonte/derivado, diagnóstico, adaptadores honestos e plano caixa-preta | RT-02, RT-05, RT-07, RT-11 | sim; N1 concluída, N2 pode abrir |
| N2 forma global | referência, andaime e orçamento | blocagem inteira, vistas, medidas, crítica e aceite | RT-03/RT-04 | não ainda; G01 passou e G02 aguarda crítico/usuário |
| N3 superfície | blocagem aprovada e alternativas | compilador, edição regional, procedência e validadores | RT-05–RT-07 | sim, se G07 e edição local passarem |
| N4 veículo | superfície aprovada e andaime veicular | carro bruto reconhecível e pacote de evidências | RT-09/RT-13 | sim, somente por aceite explícito |
| N5 integração | carro bruto, mecânica e interfaces | montagem híbrida, conexões e impacto | RT-08/RT-09 | sim, se nenhuma conexão obrigatória faltar |
| N6 humanoide | contrato comum, corpo-base e interfaces | cobertura humanoide pequena, duas poses e crítica | RT-10/RT-14 | sim, sem regra específica de carro |
| N7 Agent-First | serviços provados e schemas | skill/MCP/CLI caixa-preta com diagnóstico | RT-11/RT-12 | sim, se não duplicar regra |
| N8 decisão | corpus completo e custos | relatório, decisão e backlog/reabertura | todas | fecha ou reabre uma fase |

## Ledger de evidências atual

| Evidência | O que prova | O que não prova | Estado |
|---|---|---|---|
| `RELATORIO-PLATAFORMA-PROCEDURAL-R10.md` | registro, descoberta e extensões do procedural | autoria de superfície estilizada | aprovado como plataforma |
| `RELATORIO-SONDA-SUPERCARRO-1-0.md` | montagem, vistas, impacto e escala de sistema | carro visualmente convincente | aprovado como sonda, forma reprovada |
| `RELATORIO-R2-CAGE-DIRETA-R3.md` | falha regional e limites da cage R2 | solução de carroceria | contraevidência preservada |
| `RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md` | hierarquia, reutilização e estados estáticos | robô visualmente bom ou conectado | aprovado como plataforma, forma limitada |
| evidências R2B | faixa vertical e campeão 20,5/42,9/32,7 mm | leitura de carro | R2B interrompido |
| `DOSSIE-*.md` | arquitetura e critérios de construção | implementação executada | vinculante para N0/N1 |
| testes e `RELATORIO-N1-FLUXO-AUTORIA.md` | contratos, schemas, reutilização, diagnóstico e cliente caixa-preta | provedores de forma/superfície prontos | N1 passou; lacunas transferidas para N2/N3 |
| `RELATORIO-N2-FORMA-GLOBAL.md` e evidências N2 | alvo independente, andaime, blocagem inteira, vistas, métricas e falha segura | reconhecimento independente, superfície ou carro final | G01 aprovado; G02 pendente |

## Protocolo de mudança

Toda alteração de capacidade abre uma entrada ou atualiza uma linha sem apagar a
anterior. O diff deve informar fonte afetada, consumidores, evidência antes,
evidência depois, gate e decisão. Se a implementação revelar nova dependência,
ela entra primeiro como lacuna e bloqueia a fase dependente até ser classificada.

Uma linha `proposto` não pode ser descrita no relatório como existente. Uma linha
`aprovado como plataforma` não aprova o objeto. Uma linha `bloqueado` exige
decisão explícita para reabrir ou descartar.

## Critério de fechamento de N0

N0 fecha quando a matriz, o plano, os três dossiês, o inventário de fontes e o
ledger de contraevidências estão alcançáveis, consistentes e validados pelos
gates documentais. N0 não fecha nenhuma capacidade de superfície: ele somente
torna impossível perder o vínculo entre objetivo, implementação e prova nas
fases seguintes.
