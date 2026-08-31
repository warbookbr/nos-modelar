# Planos encerrados

Esta pasta guarda os planos **concluídos** e **cancelados**. Eles registram o
que foi decidido e provado, e por isso continuam sendo evidência consultável.

Nenhum deles governa trabalho novo: não abre implementação, não reabre escopo e
não autoriza nada por analogia. O plano em jogo mora em
[`../README.md`](../README.md); o que saiu de cena por mudança de rota, e pode
voltar, mora em [`../congelados/README.md`](../congelados/README.md).

## Crônica

O que segue veio do `INDEX.md`, onde ocupava mais da metade da porta de entrada
com narrativa de coisa já encerrada. Está aqui inteiro, sem reescrita.

- A homologação **do fluxo** foi concluída nos Casos 1 e 2, e encerrada aí. Ela
  aprova o processo de autoria, não a geometria: a peça de cada caso segue sendo
  exemplo. O Caso 3 foi retirado — ver o encerramento de
  `docs/mecanifica/planos/encerrados/2026-08-17-historico-de-revisao.md`.
- A Montagem Mínima Persistida v1 foi concluída em
  `docs/mecanifica/planos/encerrados/2026-08-07-montagem-minima-persistida-v1.md`, com o
  contrato atual em `docs/mecanifica/MONTAGEM-PERSISTIDA-V1.md`. O plano
  [`2026-08-09-montagem-persistida-v2-relacoes-locais.md`](./2026-08-09-montagem-persistida-v2-relacoes-locais.md) foi concluído
  no R06: provas A–F, fixtures persistidas v2, contrato v2 e continuidade
  arquitetural foram integrados pelo PR #41 no commit `e7b80ac`. O contexto de
  montagem para IA foi concluído no R05 com descritor puro e CLI confinada. O
  plano de separação direcional e impacto local foi concluído no R04 com
  montagem v3 e mapa derivado; mapa global, revalidação automática, escrita MCP
  e API permanecem fora.
- O plano de contexto visual e autoria segura foi concluído no R05: captura
  privada, revalidação assistida, catálogo explícito e revisões imutáveis foram
  provados; escrita MCP e materialização no workspace ficaram fora daquele
  fechamento e foram tratadas por recortes próprios.
- O [plano de leitura MCP](./2026-08-14-mcp-montagens-leitura.md) foi
  concluído e aprovado: contexto, revalidação, catálogo e vistas de montagem
  são consumíveis por IDs semânticos. A ausência de escrita não é veto futuro.
- O [plano de materialização e autoria
  segura](./2026-08-14-materializacao-autoria-segura.md) foi concluído e
  aprovado: snapshots imutáveis, ativação por revisão observada, revalidação
  condicionante e perfil MCP de autoria opt-in foram provados no mesmo recorte.
- O [experimento de autoria geométrica do zero](./2026-08-14-experimento-autoria-geometrica.md)
  (`docs/mecanifica/planos/encerrados/2026-08-14-experimento-autoria-geometrica.md`)
  concluiu com `corrigir`: receitas, relações e vistas passaram, mas autoria MCP
  de montagem não pode corrigir uma receita; o relatório define o próximo recorte.
- O [plano de correções do fluxo encontradas na dobradiça](./2026-08-17-correcoes-fluxo-dobradica.md)
  (`docs/mecanifica/planos/encerrados/2026-08-17-correcoes-fluxo-dobradica.md`) foi
  concluído e aprovado: corrigiu documentação, descrição confinada e
  enquadramento do visor; materiais, união topológica e cinemática seguem fora.
- O [plano de migração estrutural de `fps` para `procedural`](./2026-08-17-migracao-fps-para-procedural.md)
  (`docs/mecanifica/planos/encerrados/2026-08-17-migracao-fps-para-procedural.md`) foi
  concluído e aprovado: a raiz canônica agora é
  `prototipos/procedural/v3/`, sem mudança geométrica ou de contrato.
- O [plano de independência entre núcleo, validação e catálogo](./2026-08-17-desacoplamento-catalogo-validacao.md)
  (`docs/mecanifica/planos/encerrados/2026-08-17-desacoplamento-catalogo-validacao.md`)
  foi concluído e aprovado. Ele deixou o catálogo homologado vazio, fixtures
  confinadas, validadores por entrada explícita e rollout coordenado com o
  consumidor antes de remover as receitas não homologadas.
- O plano de [auditoria de interseções em montagens](./2026-08-18-auditoria-intersecoes-montagem.md)
  (`docs/mecanifica/planos/encerrados/2026-08-18-auditoria-intersecoes-montagem.md`)
  foi concluído e aprovado. Ele entrega verificação neutra entre peças-folha
  por malha e contenção, com cobertura explícita e consumo pela revisão MCP;
  solver, correção automática e folga universal permanecem fora.
- O plano da [plataforma procedural extensível e descobrível](./2026-08-18-plataforma-procedural-extensivel.md)
  (`docs/mecanifica/planos/encerrados/2026-08-18-plataforma-procedural-extensivel.md`) foi
  **concluído e aprovado**. Ele substituiu o monólito por núcleo pequeno, registro tipado,
  pacotes de capacidades, grafos derivados, subgrafos reutilizáveis, SDK de
  extensão e descoberta Agent-First. A R00 já fixou a [linha de base
  executável](../../BASELINE-MOTOR-R00.md)
  (`docs/mecanifica/BASELINE-MOTOR-R00.md`) e o mapa da fachada. A R01 foi concluída:
  `oficina.js` é a fachada compatível; núcleo, adaptador, animação e executor
  têm implementação única separada. A R02 foi concluída: o despacho passa por
  registro explícito, versionado e determinístico das 32 operações. Não haverá
  cópia `legacy` nem segundo executor. A R03 foi concluída: as operações vivem
  em grupos com dependências explícitas e o núcleo não contém seus corpos.
  A R04 foi concluída: artefato neutro, procedência por entidade e grafo de
  execução são derivados sem mudar a receita.
  A R05 foi concluída: catálogo, busca, explicação e hipergrafo de capacidades
  derivam do registro; schemas e referência para skill são gerados, sem tabelas
  manuais reconciliadas por regex.
  A R06 foi concluída: subgrafos declarativos expandem com parâmetros, tipos,
  orçamento e procedência semântica, sem reintroduzir receitas públicas.
  A R07 foi concluída: extensões nativas registradas recebem contexto limitado,
  são transacionais e possuem diagnóstico explícito quando ausentes.
  A R08 foi concluída: lacunas persistíveis e planejamento determinístico
  distinguem cadeia existente, candidato a operação nativa e necessidade de
  representação por evidência explícita, sem promoção automática.
  A R09 foi concluída: o mesmo serviço puro de descoberta é exposto por recursos
  e ferramentas MCP de leitura, provado por cliente externo sem escrita.
  A R10 removeu a lacuna de extensão nas portas oficiais e aprovou o estudo de
  campo privado (`docs/mecanifica/historico/RELATORIO-PLATAFORMA-PROCEDURAL-R10.md`).
- O [ensaio ponta a ponta da dobradiça 1.0](./2026-08-18-ensaio-ponta-a-ponta-dobradica.md)
  (`docs/mecanifica/planos/encerrados/2026-08-18-ensaio-ponta-a-ponta-dobradica.md`)
  foi concluído e aprovado: três receitas privadas, três relações cilíndricas,
  auditoria 3/3, oito vistas, composições pelas portas oficiais e descoberta
  com contratos executáveis. A evidência está em
  [`RELATORIO-ENSAIO-DOBRADICA-1-0.md`](../../historico/RELATORIO-ENSAIO-DOBRADICA-1-0.md)
  (`docs/mecanifica/historico/RELATORIO-ENSAIO-DOBRADICA-1-0.md`).
- A [sonda de escala do supercarro 1.0](./2026-08-18-sonda-supercarro-1-0.md)
  (`docs/mecanifica/planos/encerrados/2026-08-18-sonda-supercarro-1-0.md`)
  foi concluída e aprovada: 12 definições privadas, 27 peças-folha, quatro
  submontagens compartilhadas, 13 vistas e auditoria global de 351/351 pares.
  Ela integrou enquadramento por profundidade, sete vistas, foco interno,
  impacto por definição compartilhada e material observável. Evidências,
  métricas e limites estão em
  [`RELATORIO-SONDA-SUPERCARRO-1-0.md`](../../historico/RELATORIO-SONDA-SUPERCARRO-1-0.md)
  (`docs/mecanifica/historico/RELATORIO-SONDA-SUPERCARRO-1-0.md`).
- A qualidade visual da carroceria foi reprovada depois desse fechamento. O
  [plano do chassi realista](../2026-08-18-chassi-realista-kernel-geometrico.md)
  (`docs/mecanifica/planos/2026-08-18-chassi-realista-kernel-geometrico.md`)
  está em `rascunho` e não autoriza implementação. A causa raiz é de
  representação, não de refino: a carroceria rejeitada é um único `loft` de nove
  seções elípticas. A representação de autoria já foi decidida no
  [`ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md`](../../historico/ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md)
  (`docs/mecanifica/historico/ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md`): malha de
  controle de quadriláteros com vincos, avaliada por subdivisão Catmull-Clark
  nativa, com a malha densa como produto compilado e a unidade editável no loop
  de aresta nomeado. OCCT/B-rep, Blender headless, SDF e kernel próprio estão
  rejeitados com motivo e condição de reabertura. `loft` e qualquer envelope
  varrido estão proibidos como base da pele exterior, porque para-brisa, vidro
  lateral e vão de porta são loops fechados internos que uma varredura não abre
  sem booleana. A rodada P0 está fechada em
  [`CHASSI-P0-ALVO-E-LIMIARES.md`](../../CHASSI-P0-ALVO-E-LIMIARES.md)
  (`docs/mecanifica/CHASSI-P0-ALVO-E-LIMIARES.md`): perfil `F3` declarado antes
  de modelar, envelope e quinze landmarks fixados, prancha ortográfica derivada
  adotada como referência vinculante no lugar da imagem em perspectiva, limiares
  numéricos dos oito eixos e oito condições de rejeição visual escritas antes da
  geometria. A rodada P1 também está fechada em
  [`CHASSI-P1-CONTRATO-DA-CAGE.md`](../../CHASSI-P1-CONTRATO-DA-CAGE.md)
  (`docs/mecanifica/CHASSI-P1-CONTRATO-DA-CAGE.md`): `mecanifica.cage-quad@1` é
  artefato autoral separado, para não esticar `malha-poligonal@1`; aresta é par
  ordenado derivado, porque o formato salvo não tem entidade aresta; a seção
  transversal é conferência e não geradora; e a malha compilada **não tem
  identidade persistida** — persistem a cage e o nome semântico, que a face já
  carrega na linha canônica. A prova descartável do quarto dianteiro está em
  execução no [plano P2](../2026-08-19-chassi-p2-prova-do-quarto.md)
  (`docs/mecanifica/planos/2026-08-19-chassi-p2-prova-do-quarto.md`), em zona
  privada e sem tocar o núcleo. A rodada Q1 entregou Catmull-Clark determinística
  com vinco semi-agudo, canto de retalho congelado e borda curva relaxando. Q1 a
  Q5 estão feitas e medidas em
  [`RELATORIO-CHASSI-P2-PROVA-DO-QUARTO.md`](../../historico/RELATORIO-CHASSI-P2-PROVA-DO-QUARTO.md)
  (`docs/mecanifica/historico/RELATORIO-CHASSI-P2-PROVA-DO-QUARTO.md`): a cage do quarto
  cabe em 114 quads contra teto de 800, o arco de roda abre por topologia sem
  booleana, e o nome da região atravessa a subdivisão. O terceiro braço do
  critério de descarte disparou — a alteração local tocou dois loops em vez de um
  — por um único vértice compartilhado onde a crista do para-lama encontra a base
  do para-brisa. O plano P2 está congelado em `pronto`: suas evidências e esse
  veredito pendente não mudam enquanto a ferramenta que define o alvo passa pela
  auditoria ativa abaixo.
- O [motor de prancha com filete e medida](./2026-08-19-motor-de-prancha-medida.md)
  (`docs/mecanifica/planos/encerrados/2026-08-19-motor-de-prancha-medida.md`) foi concluído.
  `tools/mecanifica/prancha.mjs` desenha pranchas ortográficas alvo e emite um
  relatório medido da própria saída; `tools/mecanifica/prancha-geometria.mjs`
  traça por filete e mede curvatura por janela de comprimento de arco. A
  primitiva padrão deixou de ser spline por pontos, que abaulava tudo, e passou a
  ser polilinha com raio por vértice. O relatório verifica contorno fechado,
  detalhe que escapou do contorno e landmark que saiu da linha. O método está na
  skill `desenhar-prancha`. A prova é o cupê de cunha em
  `docs/mecanifica/img/cupe-cunha-prancha.svg`, desenhado do zero e julgado pelo
  relatório antes de qualquer render.
- A [coerência entre vistas](./2026-08-19-coerencia-entre-vistas.md)
  (`docs/mecanifica/planos/encerrados/2026-08-19-coerencia-entre-vistas.md`) foi concluída e
  **fecha o motor de prancha**. As vistas passam a ser comparadas pelos eixos que
  compartilham, cada uma declarando leitura `projecao` ou `secao`, com envelope e
  simetria conferidos pelo motor. A rodada também desfez um silenciamento
  indevido de `foraDoContorno`, que sozinho acusou quatro rodas escapando da
  carroceria em planta, e converteu as linhas inferiores do P0 de spline para
  filete — a spline afundava para 94 mm onde a altura livre declarada é 105.
- A [leitura de referência rasterizada](./2026-08-19-leitura-de-referencia-medida.md)
  (`docs/mecanifica/planos/encerrados/2026-08-19-leitura-de-referencia-medida.md`) foi
  concluída. `tools/mecanifica/prancha-referencia.mjs` decodifica um PNG em Node
  puro, calibra pixel→milímetro pelo entre-eixos entre as manchas de contato das
  rodas e compara silhuetas por desvio. A imagem de terceiro não entra no
  repositório: entram só as coordenadas derivadas, sob a regra de procedência de
  [`referencias/README.md`](../../referencias/README.md)
  (`docs/mecanifica/referencias/README.md`). Limite medido e registrado: desvio
  de silhueta é confiável, curvatura vinda de raster é ruído. A medida contrariou
  a análise visual — o erro grave não era o teto, eram a traseira e o nariz.
- O plano de [autonomia verificável do Motor de Prancha](../2026-08-20-motor-de-prancha-autonomia.md)
  (`docs/mecanifica/planos/2026-08-20-motor-de-prancha-autonomia.md`) está
  **congelado em `pronto`**. Ele auditou o motor, a skill, métricas, referências,
  sobreposição e crítica; R0–R3 foram aprovadas, mas a R4 só demonstrou autoria
  independente e mutações, não impacto 3D comparável. A linha de base R0 está em
  [`docs/mecanifica/historico/RELATORIO-MOTOR-DE-PRANCHA-R0.md`](../../historico/RELATORIO-MOTOR-DE-PRANCHA-R0.md):
  o contrato agora rejeita auto-interseção, entrada inválida, supressão sem
  motivo, calibração contraditória e comparação de cobertura parcial. A comparação
  externa R1 está em [`docs/mecanifica/historico/RELATORIO-MOTOR-DE-PRANCHA-R1.md`](../../historico/RELATORIO-MOTOR-DE-PRANCHA-R1.md):
  OpenCV, Potrace e Inkscape não superaram autoria vetorial local com semântica,
  calibração e coerência entre vistas; nenhuma dependência foi incorporada.
- A R2 fechou o contrato de autoria confiável
  (`docs/mecanifica/usar/CONTRATO-AUTORIA-PRANCHA.md`): intenção, procedência,
  confiança, incerteza e bloqueio agora são dados validados antes do desenho.
  A evidência é `docs/mecanifica/historico/RELATORIO-MOTOR-DE-PRANCHA-R2.md`; o relatório
  e a skill expõem o bloqueio sem transformar referência insuficiente em alvo preciso.
- A R3 reexecutou o corpus contra o caminho integrado e recusou incorporar
  mecanismos sem defeito mensurado; a matriz de resultados está em
  `docs/mecanifica/historico/RELATORIO-MOTOR-DE-PRANCHA-R3.md`. A R4 parcial está em
  `docs/mecanifica/historico/RELATORIO-MOTOR-DE-PRANCHA-R4.md`; R5 não executa neste
  recorte.
- O plano de [validação integrada do valor Agent-First](../2026-08-20-validacao-integrada-mecanifica.md)
  (`docs/mecanifica/planos/2026-08-20-validacao-integrada-mecanifica.md`) está
  **congelado em `pronto` antes de R0**. Seu comparativo da trava só pode ser
  retomado se a auditoria ativa mantiver válidas suas premissas e métricas.
- O plano de [auditoria das práticas de autoria 3D](./2026-08-20-auditoria-praticas-autoria-3d.md)
  foi concluído com decisão **`corrigir`**. O relatório
  [`RELATORIO-AUDITORIA-PRATICAS-AUTORIA-3D.md`](../../historico/RELATORIO-AUDITORIA-PRATICAS-AUTORIA-3D.md)
  preserva núcleo, identidade e composição, mas registra que P2 fechou medidas
  verdes com forma reprovada. P2 e a validação integrada permanecem congelados
  até uma prova privada tornar alvo, sobreposição, vistas, rejeições e crítica
  independente evidência vinculante, antes de nova prova de superfície.
  Os registros alcançáveis são
  `docs/mecanifica/planos/encerrados/2026-08-20-auditoria-praticas-autoria-3d.md` e
  `docs/mecanifica/historico/RELATORIO-AUDITORIA-PRATICAS-AUTORIA-3D.md`.
- O plano de [aceite visual vinculante e prova de superfície](./2026-08-20-aceite-visual-e-prova-de-superficie.md)
  foi concluído com decisão `redesenhar`: R0–R1B passam, mas a R2 não alcança
  os limites P0. O [relatório R2/R3](../../historico/RELATORIO-R2-CAGE-DIRETA-R3.md) preserva
  as evidências e o achado da suíte agregada. O
  [redesenho R2B com controle vertical](./2026-08-23-redesenho-cage-r2b-controle-vertical.md)
  foi concluído com decisão `interromper`: B1 provou a faixa vertical, mas o
  campeão B2 permaneceu reprovado em 20,5/42,9/32,7 mm e sem leitura convincente
  de carro. B2–B4 não continuam; evidências e IDs permanecem preservados.
  Registros:
  `docs/mecanifica/planos/encerrados/2026-08-20-aceite-visual-e-prova-de-superficie.md`,
  `docs/mecanifica/historico/RELATORIO-R2-CAGE-DIRETA-R3.md` e
  `docs/mecanifica/planos/encerrados/2026-08-23-redesenho-cage-r2b-controle-vertical.md`.
  A R0 já isolou o contrato `mecanifica.aceite-visual` v1 em
  [`CONTRATO-ACEITE-VISUAL.md`](../../CONTRATO-ACEITE-VISUAL.md): alvo, sobreposição,
  quatro vistas, rejeições e crítica tornam-se dados verificáveis antes de R1
  ligar o porteiro à revisão privada.
  Registro: `docs/mecanifica/CONTRATO-ACEITE-VISUAL.md`.
- O único plano **ativo** é o [modelador inverso com priors por família](../congelados/2026-08-25-modelador-inverso-priors-familia.md). O plano por
  seleção foi cancelado: sua capacidade de comparação não tinha calibração
  repetida, o gerador restringia o espaço alcançável e o alvo N6 é direção
  estética sem câmeras/correspondências geométricas. O [novo dossiê vinculante](../../DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md)
  preserva o núcleo
  procedural, identidade, montagem, revisão, impacto, bancada, câmeras e MCP;
  separa priors de veículo, humanoide e peça; e introduz qualificação de alvo,
  superfície semântica, fitting inverso e crítico calibrado por gates.
  Somente P0 está aberto: fechar a suíte no Windows, qualificar os alvos e medir
  o avaliador antes de criar geometria. N0–N6, R2B, seleção por linhas e o
  canário de silhuetas permanecem evidência histórica, não continuidade.
  Registros do caminho substituído: [plano cancelado](./2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md),
  [dossiê por seleção](../../historico/DOSSIE-MODELADOR-POR-SELECAO.md),
  [plataforma nativa](../../DOSSIE-PLATAFORMA-AUTORIA-3D-NATIVA.md),
  [motor de superfícies](../../DOSSIE-MOTOR-SUPERFICIES-NATIVAS.md),
  [fluxo multifamília](../../DOSSIE-FLUXO-IA-VALIDACAO-MULTIFAMILIA.md),
  [matriz de rastreabilidade](../../MATRIZ-RASTREABILIDADE-AUTORIA-3D-NATIVA.md),
  [contrato N1](../../FLUXO-AUTORIA-N1.md), [relatório N1](../../historico/RELATORIO-N1-FLUXO-AUTORIA.md),
  [contrato N2](../../CONTRATO-FORMA-GLOBAL-N2.md), [relatório N2](../../historico/RELATORIO-N2-FORMA-GLOBAL.md),
  [relatório N3](../../historico/RELATORIO-N3-CANAL-PERCEPCAO.md),
  [relatório N4](../../historico/RELATORIO-N4-RESTRICOES.md) e [relatório N5](../../historico/RELATORIO-N5-BUSCA.md).
  Caminhos alcançáveis: `docs/mecanifica/DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md`,
  `docs/mecanifica/planos/encerrados/2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md`,
  `docs/mecanifica/historico/DOSSIE-MODELADOR-POR-SELECAO.md`,
  `docs/mecanifica/DOSSIE-PLATAFORMA-AUTORIA-3D-NATIVA.md`,
  `docs/mecanifica/DOSSIE-MOTOR-SUPERFICIES-NATIVAS.md`,
  `docs/mecanifica/DOSSIE-FLUXO-IA-VALIDACAO-MULTIFAMILIA.md`,
  `docs/mecanifica/MATRIZ-RASTREABILIDADE-AUTORIA-3D-NATIVA.md`,
  `docs/mecanifica/FLUXO-AUTORIA-N1.md`,
  `docs/mecanifica/historico/RELATORIO-N1-FLUXO-AUTORIA.md`,
  `docs/mecanifica/CONTRATO-FORMA-GLOBAL-N2.md`,
  `docs/mecanifica/historico/RELATORIO-N2-FORMA-GLOBAL.md`,
  `docs/mecanifica/historico/RELATORIO-N3-CANAL-PERCEPCAO.md`,
  `docs/mecanifica/historico/RELATORIO-N4-RESTRICOES.md` e
  `docs/mecanifica/historico/RELATORIO-N5-BUSCA.md`.
- A [sonda da armadura humanoide tecnológica 1.0](./2026-08-18-sonda-armadura-humanoide-1-0.md)
  (`docs/mecanifica/planos/encerrados/2026-08-18-sonda-armadura-humanoide-1-0.md`)
  foi concluída e aprovada: 13 definições privadas, 22 peças-folha, oito
  submontagens, duas poses estáticas e 16 vistas finais. Ela integrou crítica
  visual reexecutável, bilateralidade quiral e intenção de peça como dados. A
  auditoria decide 231/231 pares em cada estado; movimento contínuo permanece
  explicitamente não verificado. Evidências e limites estão em
  [`RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md`](../../historico/RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md)
  (`docs/mecanifica/historico/RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md`).
- O contrato de montagem v4 em [`MONTAGEM-PERSISTIDA-V4.md`](../../MONTAGEM-PERSISTIDA-V4.md)
  registra expectativas de interseção sem suprimi-las. `revisar_montagem` já
  transporta a auditoria; `descrever_montagem` continua sem executá-la.
- A [matriz de testes acoplados ao acervo](../../MATRIZ-TESTES-ACOPLADOS.md)
  (`docs/mecanifica/MATRIZ-TESTES-ACOPLADOS.md`) registra o
  que é contrato genérico, integração, publicação ou conteúdo específico após
  a remoção das receitas.
- O plano de [autoria segura de receitas declarativas](./2026-08-14-autoria-segura-receitas.md)
  (`docs/mecanifica/planos/encerrados/2026-08-14-autoria-segura-receitas.md`) foi aprovado:
  receitas são dados JSON, passam por vistas e revalidação e não executam
  JavaScript fornecido pelo agente.
- O plano de [continuidade de autoria](./2026-08-14-continuidade-autoria-ativa.md)
  (`docs/mecanifica/planos/encerrados/2026-08-14-continuidade-autoria-ativa.md`)
  foi aprovado: revisão publicada e catálogo operacional agora compartilham o
  mesmo estado, sem alterar o núcleo ou descobrir dependências implícitas.
- O diagnóstico técnico que fundamentou o plano está registrado em
  `docs/mecanifica/historico/RELATORIO-DIAGNOSTICO-MOTOR.md`.
- A análise consolidada de maturidade e próximas melhorias está em
  [`RELATORIO-ANALISE-GRANDES-MELHORIAS.md`](../../historico/RELATORIO-ANALISE-GRANDES-MELHORIAS.md)
  (`docs/mecanifica/historico/RELATORIO-ANALISE-GRANDES-MELHORIAS.md`).
- O [mapa canônico de dependências](./2026-08-14-mapa-canonico-dependencias.md)
  foi concluído com decisão `aprovar`: cobertura global dentro de universo
  explícito, impacto direcionado, proveniência, MCP e continuidade ativa
  (`docs/mecanifica/planos/encerrados/2026-08-14-mapa-canonico-dependencias.md`). A
  revalidação em cascata persistida foi encerrada no plano próprio abaixo.
- O plano de [revalidação em cascata persistida](./2026-08-14-revalidacao-cascata-persistida.md)
  foi concluído no R06 com decisão `aprovar`: identidade semântica, retomada
  persistida, derivação multi-raiz, resultados, obsolescência, estudo de campo
  multi-raiz e consumo Agent-First foram provados. Evolução futura exige plano
  próprio e não implica correção ou promoção automática
  (`docs/mecanifica/planos/encerrados/2026-08-14-revalidacao-cascata-persistida.md`).
- O Módulo 1 do MCP — leitura e revisão somente leitura — foi aprovado após as
  Fatias 1A e 1B, a avaliação consolidada e a correção de descoberta.
- A primeira tentativa de autoria controlada foi encerrada com decisão
  `interromper`; a issue #23 foi concluída e o PR #25 foi fechado sem merge.
- O MCP padrão continua sendo uma porta de leitura e auditoria; o perfil de
  autoria é opt-in do host e só materializa montagens no repositório autorizado.
  Nenhum perfil define o núcleo, o formato de peça ou a futura arquitetura.
- Os adaptadores de inspeção e a bancada publicada existem e são usados pelos
  gates.
- Hierarquia semântica mínima, consulta de subárvore, isolamento e contexto
  visual existem para peças.
- Os contratos v1/v2/v3, o resolvedor recursivo, o contexto JSON consultável,
  o mapa canônico dentro de universo explícito e a revalidação em cascata
  persistida existem. Não há descoberta fora desse universo, correção ou
  promoção automática de dependentes, colisão geral nem solver.
- O visor legado resolve o import bare `earcut` por import map; `porteiro` e
  `criar` voltaram a auditar as peças sem alteração geométrica.
- Não existe contrato genérico de materiais.

