# Planos da Mecanifica

## Estado

**Plano ativo:**
[`2026-08-20-aceite-visual-e-prova-de-superficie.md`](2026-08-20-aceite-visual-e-prova-de-superficie.md).

Ele cria o porteiro de aceite visual e uma prova privada de cage com seções de
caráter declaradas. P2 e a validação integrada permanecem congelados; nenhum
núcleo ou conteúdo público é alterado antes de a prova demonstrar valor.

A [auditoria das práticas de autoria 3D](2026-08-20-auditoria-praticas-autoria-3d.md)
foi concluída com decisão `corrigir`. Ela preserva a base semântica e congela
P2 e a validação integrada até uma prova privada ligar o aceite visual ao
fechamento e exercitar seções de caráter declaradas.

A [validação integrada do valor Agent-First](2026-08-20-validacao-integrada-mecanifica.md)
está **congelada em `pronto` antes de R0**. O comparativo da trava pode ser
retomado somente depois que a auditoria decidir se sua premissa e suas métricas
continuam válidas.

O plano de [autonomia verificável do Motor de Prancha](2026-08-20-motor-de-prancha-autonomia.md)
está **congelado em `pronto`**: R0–R3 foram aprovadas, R4 só prova autoria e
mutações, e impacto 3D permanece não demonstrado. R5 não executa; essa pergunta
foi transferida para a validação integrada.

O [P2 do chassi](2026-08-19-chassi-p2-prova-do-quarto.md) está **congelado no
estado `pronto`**. Suas evidências e a decisão pendente sobre a alteração local
permanecem íntegras, mas Q7 não executa enquanto a confiabilidade da prancha —
alvo e fonte de julgamento da prova — estiver sob auditoria ativa.

A [coerência entre vistas](2026-08-19-coerencia-entre-vistas.md) foi concluída e
fecha o motor de prancha. Ela desfez um silenciamento indevido de teste — que
sozinho já acusou quatro rodas escapando da carroceria em planta — e passou a
comparar as vistas pelos eixos que compartilham, com leitura `projecao` ou
`secao` declarada. O investimento volta ao chassi: a próxima rodada é P1, o
contrato da cage, onde a seção transversal foi encaixada.

O [motor de prancha com filete e medida](2026-08-19-motor-de-prancha-medida.md)
foi **concluído**. Ele trocou a spline por traçado com filete, adotou âncora
proporcional e passou a emitir relatório medido da própria saída. O ganho não é
estético: o relatório pegou sozinho um arco de roda furando o capô e dez
inversões de curvatura na silhueta do P0 que ninguém tinha visto. Método
registrado na skill `desenhar-prancha`.

**Plano em elaboração:**
[`2026-08-18-chassi-realista-kernel-geometrico.md`](2026-08-18-chassi-realista-kernel-geometrico.md).
Ele está em `rascunho` e não autoriza implementação. A representação de autoria
já foi decidida no dossiê: malha de controle de quadriláteros com vincos,
avaliada por subdivisão Catmull-Clark nativa, com a malha densa como produto
compilado. OCCT/B-rep, Blender headless, SDF e kernel próprio foram rejeitados
com motivo e condição de reabertura; booleana fica proibida na pele primária. O
que falta é a prova descartável do quarto dianteiro e os limiares de referência.
O recorte anterior de `inflate` suave foi cancelado após reprovação visual e
permanece somente como evidência local ainda não integrada.

A [sonda da armadura humanoide tecnológica](2026-08-18-sonda-armadura-humanoide-1-0.md)
foi concluída com decisão `aprovar`. Ela testou hierarquia profunda,
bilateralidade, quiralidade, estados estáticos, contexto progressivo, crítica
visual estruturada e correções genéricas sem publicar geometria ou replicar
franquia. A evidência está em
[`../RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md`](../RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md).

A [sonda do supercarro](2026-08-18-sonda-supercarro-1-0.md) foi concluída com
decisão `aprovar`; a evidência está em
[`../RELATORIO-SONDA-SUPERCARRO-1-0.md`](../RELATORIO-SONDA-SUPERCARRO-1-0.md).

O [ensaio ponta a ponta da dobradiça](2026-08-18-ensaio-ponta-a-ponta-dobradica.md)
foi concluído com decisão `aprovar`; a evidência está em
[`../RELATORIO-ENSAIO-DOBRADICA-1-0.md`](../RELATORIO-ENSAIO-DOBRADICA-1-0.md).

O plano da plataforma procedural extensível foi concluído no R10 com decisão
`aprovar`; a evidência está em `../RELATORIO-PLATAFORMA-PROCEDURAL-R10.md`.

O plano concluído mais recente foi a [auditoria de interseções em montagens](2026-08-18-auditoria-intersecoes-montagem.md), aprovada após integrar malha, contenção, casos inconclusivos e MCP.

O plano de desacoplamento entre núcleo, validadores, fixtures e catálogo foi
concluído com catálogo vazio e rollout coordenado com `warbookbr/mecanica`.

**Plano concluído anterior à auditoria:**
[`2026-08-17-migracao-fps-para-procedural.md`](2026-08-17-migracao-fps-para-procedural.md).

Ele moveu a raiz canônica para `prototipos/procedural/v3/`, preservando
comportamento, geometria e contratos, após verificar o consumidor externo.

**Plano concluído anterior:**
[`2026-08-17-correcoes-fluxo-dobradica.md`](2026-08-17-correcoes-fluxo-dobradica.md).

Ele corrigiu os atritos comprovados pelo estudo de dobradiça: referência
procedural, template, descrição de receita confinada, estado dos contratos e
enquadramento do visor privado. Materiais, união topológica e cinemática
continuam fora.

**Plano concluído anterior:**
[`2026-08-17-estudo-conjunto-dobradica.md`](2026-08-17-estudo-conjunto-dobradica.md).

O estudo criou três peças confinadas e uma montagem v3 válida, registrando nove
achados com diagnóstico causal. A decisão foi `corrigir`: a fixture passou,
mas documentação operacional e enquadramento de peças finas exigem recortes
próprios.

O plano concluído anterior foi
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
| Alteração semântica compacta de montagem | concluído: aprovar |
| Encostar — contato derivado | concluído: aprovar |
| Ponto nomeado, e revisão dos atritos vizinhos | concluído: aprovar |
| Histórico de revisão, e retirada do Caso 3 | concluído: aprovar |
| Perfil fechado no `lathe`, e limpeza da lista | concluído: aprovar |
| Estudo de autoria — conjunto dobradiça | concluído: corrigir |

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

A abertura ativa é o [aceite visual e prova de superfície](2026-08-20-aceite-visual-e-prova-de-superficie.md).
Ela executa a correção determinada pela auditoria antes de qualquer retomada.
Os candidatos permanecem no [`BACKLOG.md`](BACKLOG.md) sem autorização
automática; nenhum recorte nasce apenas da sequência das sondas.
