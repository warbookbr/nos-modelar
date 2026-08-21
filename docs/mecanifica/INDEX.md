# Mecanifica — entrada atual

Este repositório mantém a oficina procedural para IA: núcleo geométrico,
receitas determinísticas de peças, bancada de inspeção e ferramentas de medição,
revisão e validação.

O objetivo é melhorar e facilitar o trabalho da IA ao criar, organizar,
inspecionar, corrigir e manter objetos 3D mecânicos. Interface humana, jogo,
narrativa e apresentação externa não definem o escopo. A Oficina humana, a
aplicação jogável e o som foram removidos desta árvore. `bancada.html` é a única
aplicação publicada aqui.

## Estado atual

- A homologação **do fluxo** foi concluída nos Casos 1 e 2, e encerrada aí. Ela
  aprova o processo de autoria, não a geometria: a peça de cada caso segue sendo
  exemplo. O Caso 3 foi retirado — ver o encerramento de
  `docs/mecanifica/planos/2026-08-17-historico-de-revisao.md`.
- A Montagem Mínima Persistida v1 foi concluída em
  `docs/mecanifica/planos/2026-08-07-montagem-minima-persistida-v1.md`, com o
  contrato atual em `docs/mecanifica/MONTAGEM-PERSISTIDA-V1.md`. O plano
  [`2026-08-09-montagem-persistida-v2-relacoes-locais.md`](../../docs/mecanifica/planos/2026-08-09-montagem-persistida-v2-relacoes-locais.md) foi concluído
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
- O [plano de leitura MCP](planos/2026-08-14-mcp-montagens-leitura.md) foi
  concluído e aprovado: contexto, revalidação, catálogo e vistas de montagem
  são consumíveis por IDs semânticos. A ausência de escrita não é veto futuro.
- O [plano de materialização e autoria
  segura](planos/2026-08-14-materializacao-autoria-segura.md) foi concluído e
  aprovado: snapshots imutáveis, ativação por revisão observada, revalidação
  condicionante e perfil MCP de autoria opt-in foram provados no mesmo recorte.
- O [experimento de autoria geométrica do zero](planos/2026-08-14-experimento-autoria-geometrica.md)
  (`docs/mecanifica/planos/2026-08-14-experimento-autoria-geometrica.md`)
  concluiu com `corrigir`: receitas, relações e vistas passaram, mas autoria MCP
  de montagem não pode corrigir uma receita; o relatório define o próximo recorte.
- O [plano de correções do fluxo encontradas na dobradiça](planos/2026-08-17-correcoes-fluxo-dobradica.md)
  (`docs/mecanifica/planos/2026-08-17-correcoes-fluxo-dobradica.md`) foi
  concluído e aprovado: corrigiu documentação, descrição confinada e
  enquadramento do visor; materiais, união topológica e cinemática seguem fora.
- O [plano de migração estrutural de `fps` para `procedural`](planos/2026-08-17-migracao-fps-para-procedural.md)
  (`docs/mecanifica/planos/2026-08-17-migracao-fps-para-procedural.md`) foi
  concluído e aprovado: a raiz canônica agora é
  `prototipos/procedural/v3/`, sem mudança geométrica ou de contrato.
- O [plano de independência entre núcleo, validação e catálogo](planos/2026-08-17-desacoplamento-catalogo-validacao.md)
  (`docs/mecanifica/planos/2026-08-17-desacoplamento-catalogo-validacao.md`)
  foi concluído e aprovado. Ele deixou o catálogo homologado vazio, fixtures
  confinadas, validadores por entrada explícita e rollout coordenado com o
  consumidor antes de remover as receitas não homologadas.
- O plano de [auditoria de interseções em montagens](planos/2026-08-18-auditoria-intersecoes-montagem.md)
  (`docs/mecanifica/planos/2026-08-18-auditoria-intersecoes-montagem.md`)
  foi concluído e aprovado. Ele entrega verificação neutra entre peças-folha
  por malha e contenção, com cobertura explícita e consumo pela revisão MCP;
  solver, correção automática e folga universal permanecem fora.
- O plano da [plataforma procedural extensível e descobrível](planos/2026-08-18-plataforma-procedural-extensivel.md)
  (`docs/mecanifica/planos/2026-08-18-plataforma-procedural-extensivel.md`) foi
  **concluído e aprovado**. Ele substituiu o monólito por núcleo pequeno, registro tipado,
  pacotes de capacidades, grafos derivados, subgrafos reutilizáveis, SDK de
  extensão e descoberta Agent-First. A R00 já fixou a [linha de base
  executável](BASELINE-MOTOR-R00.md)
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
  campo privado (`docs/mecanifica/RELATORIO-PLATAFORMA-PROCEDURAL-R10.md`).
- O [ensaio ponta a ponta da dobradiça 1.0](planos/2026-08-18-ensaio-ponta-a-ponta-dobradica.md)
  (`docs/mecanifica/planos/2026-08-18-ensaio-ponta-a-ponta-dobradica.md`)
  foi concluído e aprovado: três receitas privadas, três relações cilíndricas,
  auditoria 3/3, oito vistas, composições pelas portas oficiais e descoberta
  com contratos executáveis. A evidência está em
  [`RELATORIO-ENSAIO-DOBRADICA-1-0.md`](RELATORIO-ENSAIO-DOBRADICA-1-0.md)
  (`docs/mecanifica/RELATORIO-ENSAIO-DOBRADICA-1-0.md`).
- A [sonda de escala do supercarro 1.0](planos/2026-08-18-sonda-supercarro-1-0.md)
  (`docs/mecanifica/planos/2026-08-18-sonda-supercarro-1-0.md`)
  foi concluída e aprovada: 12 definições privadas, 27 peças-folha, quatro
  submontagens compartilhadas, 13 vistas e auditoria global de 351/351 pares.
  Ela integrou enquadramento por profundidade, sete vistas, foco interno,
  impacto por definição compartilhada e material observável. Evidências,
  métricas e limites estão em
  [`RELATORIO-SONDA-SUPERCARRO-1-0.md`](RELATORIO-SONDA-SUPERCARRO-1-0.md)
  (`docs/mecanifica/RELATORIO-SONDA-SUPERCARRO-1-0.md`).
- A qualidade visual da carroceria foi reprovada depois desse fechamento. O
  [plano do chassi realista](planos/2026-08-18-chassi-realista-kernel-geometrico.md)
  (`docs/mecanifica/planos/2026-08-18-chassi-realista-kernel-geometrico.md`)
  está em `rascunho` e não autoriza implementação. A causa raiz é de
  representação, não de refino: a carroceria rejeitada é um único `loft` de nove
  seções elípticas. A representação de autoria já foi decidida no
  [`ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md`](ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md)
  (`docs/mecanifica/ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md`): malha de
  controle de quadriláteros com vincos, avaliada por subdivisão Catmull-Clark
  nativa, com a malha densa como produto compilado e a unidade editável no loop
  de aresta nomeado. OCCT/B-rep, Blender headless, SDF e kernel próprio estão
  rejeitados com motivo e condição de reabertura. `loft` e qualquer envelope
  varrido estão proibidos como base da pele exterior, porque para-brisa, vidro
  lateral e vão de porta são loops fechados internos que uma varredura não abre
  sem booleana. A rodada P0 está fechada em
  [`CHASSI-P0-ALVO-E-LIMIARES.md`](CHASSI-P0-ALVO-E-LIMIARES.md)
  (`docs/mecanifica/CHASSI-P0-ALVO-E-LIMIARES.md`): perfil `F3` declarado antes
  de modelar, envelope e quinze landmarks fixados, prancha ortográfica derivada
  adotada como referência vinculante no lugar da imagem em perspectiva, limiares
  numéricos dos oito eixos e oito condições de rejeição visual escritas antes da
  geometria. A rodada P1 também está fechada em
  [`CHASSI-P1-CONTRATO-DA-CAGE.md`](CHASSI-P1-CONTRATO-DA-CAGE.md)
  (`docs/mecanifica/CHASSI-P1-CONTRATO-DA-CAGE.md`): `mecanifica.cage-quad@1` é
  artefato autoral separado, para não esticar `malha-poligonal@1`; aresta é par
  ordenado derivado, porque o formato salvo não tem entidade aresta; a seção
  transversal é conferência e não geradora; e a malha compilada **não tem
  identidade persistida** — persistem a cage e o nome semântico, que a face já
  carrega na linha canônica. A prova descartável do quarto dianteiro está em
  execução no [plano P2](planos/2026-08-19-chassi-p2-prova-do-quarto.md)
  (`docs/mecanifica/planos/2026-08-19-chassi-p2-prova-do-quarto.md`), em zona
  privada e sem tocar o núcleo. A rodada Q1 entregou Catmull-Clark determinística
  com vinco semi-agudo, canto de retalho congelado e borda curva relaxando. Q1 a
  Q5 estão feitas e medidas em
  [`RELATORIO-CHASSI-P2-PROVA-DO-QUARTO.md`](RELATORIO-CHASSI-P2-PROVA-DO-QUARTO.md)
  (`docs/mecanifica/RELATORIO-CHASSI-P2-PROVA-DO-QUARTO.md`): a cage do quarto
  cabe em 114 quads contra teto de 800, o arco de roda abre por topologia sem
  booleana, e o nome da região atravessa a subdivisão. O terceiro braço do
  critério de descarte disparou — a alteração local tocou dois loops em vez de um
  — por um único vértice compartilhado onde a crista do para-lama encontra a base
  do para-brisa. O plano P2 está congelado em `pronto`: suas evidências e esse
  veredito pendente não mudam enquanto a ferramenta que define o alvo passa pela
  auditoria ativa abaixo.
- O [motor de prancha com filete e medida](planos/2026-08-19-motor-de-prancha-medida.md)
  (`docs/mecanifica/planos/2026-08-19-motor-de-prancha-medida.md`) foi concluído.
  `tools/mecanifica/prancha.mjs` desenha pranchas ortográficas alvo e emite um
  relatório medido da própria saída; `tools/mecanifica/prancha-geometria.mjs`
  traça por filete e mede curvatura por janela de comprimento de arco. A
  primitiva padrão deixou de ser spline por pontos, que abaulava tudo, e passou a
  ser polilinha com raio por vértice. O relatório verifica contorno fechado,
  detalhe que escapou do contorno e landmark que saiu da linha. O método está na
  skill `desenhar-prancha`. A prova é o cupê de cunha em
  `docs/mecanifica/img/cupe-cunha-prancha.svg`, desenhado do zero e julgado pelo
  relatório antes de qualquer render.
- A [coerência entre vistas](planos/2026-08-19-coerencia-entre-vistas.md)
  (`docs/mecanifica/planos/2026-08-19-coerencia-entre-vistas.md`) foi concluída e
  **fecha o motor de prancha**. As vistas passam a ser comparadas pelos eixos que
  compartilham, cada uma declarando leitura `projecao` ou `secao`, com envelope e
  simetria conferidos pelo motor. A rodada também desfez um silenciamento
  indevido de `foraDoContorno`, que sozinho acusou quatro rodas escapando da
  carroceria em planta, e converteu as linhas inferiores do P0 de spline para
  filete — a spline afundava para 94 mm onde a altura livre declarada é 105.
- A [leitura de referência rasterizada](planos/2026-08-19-leitura-de-referencia-medida.md)
  (`docs/mecanifica/planos/2026-08-19-leitura-de-referencia-medida.md`) foi
  concluída. `tools/mecanifica/prancha-referencia.mjs` decodifica um PNG em Node
  puro, calibra pixel→milímetro pelo entre-eixos entre as manchas de contato das
  rodas e compara silhuetas por desvio. A imagem de terceiro não entra no
  repositório: entram só as coordenadas derivadas, sob a regra de procedência de
  [`referencias/README.md`](referencias/README.md)
  (`docs/mecanifica/referencias/README.md`). Limite medido e registrado: desvio
  de silhueta é confiável, curvatura vinda de raster é ruído. A medida contrariou
  a análise visual — o erro grave não era o teto, eram a traseira e o nariz.
- O plano de [autonomia verificável do Motor de Prancha](planos/2026-08-20-motor-de-prancha-autonomia.md)
  (`docs/mecanifica/planos/2026-08-20-motor-de-prancha-autonomia.md`) está
  **congelado em `pronto`**. Ele auditou o motor, a skill, métricas, referências,
  sobreposição e crítica; R0–R3 foram aprovadas, mas a R4 só demonstrou autoria
  independente e mutações, não impacto 3D comparável. A linha de base R0 está em
  [`docs/mecanifica/RELATORIO-MOTOR-DE-PRANCHA-R0.md`](RELATORIO-MOTOR-DE-PRANCHA-R0.md):
  o contrato agora rejeita auto-interseção, entrada inválida, supressão sem
  motivo, calibração contraditória e comparação de cobertura parcial. A comparação
  externa R1 está em [`docs/mecanifica/RELATORIO-MOTOR-DE-PRANCHA-R1.md`](RELATORIO-MOTOR-DE-PRANCHA-R1.md):
  OpenCV, Potrace e Inkscape não superaram autoria vetorial local com semântica,
  calibração e coerência entre vistas; nenhuma dependência foi incorporada.
- A R2 fechou o contrato de autoria confiável
  (`docs/mecanifica/CONTRATO-AUTORIA-PRANCHA.md`): intenção, procedência,
  confiança, incerteza e bloqueio agora são dados validados antes do desenho.
  A evidência é `docs/mecanifica/RELATORIO-MOTOR-DE-PRANCHA-R2.md`; o relatório
  e a skill expõem o bloqueio sem transformar referência insuficiente em alvo preciso.
- A R3 reexecutou o corpus contra o caminho integrado e recusou incorporar
  mecanismos sem defeito mensurado; a matriz de resultados está em
  `docs/mecanifica/RELATORIO-MOTOR-DE-PRANCHA-R3.md`. A R4 parcial está em
  `docs/mecanifica/RELATORIO-MOTOR-DE-PRANCHA-R4.md`; R5 não executa neste
  recorte.
- O plano de [validação integrada do valor Agent-First](planos/2026-08-20-validacao-integrada-mecanifica.md)
  (`docs/mecanifica/planos/2026-08-20-validacao-integrada-mecanifica.md`) está
  **congelado em `pronto` antes de R0**. Seu comparativo da trava só pode ser
  retomado se a auditoria ativa mantiver válidas suas premissas e métricas.
- O plano de [auditoria das práticas de autoria 3D](planos/2026-08-20-auditoria-praticas-autoria-3d.md)
  foi concluído com decisão **`corrigir`**. O relatório
  [`RELATORIO-AUDITORIA-PRATICAS-AUTORIA-3D.md`](RELATORIO-AUDITORIA-PRATICAS-AUTORIA-3D.md)
  preserva núcleo, identidade e composição, mas registra que P2 fechou medidas
  verdes com forma reprovada. P2 e a validação integrada permanecem congelados
  até uma prova privada tornar alvo, sobreposição, vistas, rejeições e crítica
  independente evidência vinculante, antes de nova prova de superfície.
  Os registros alcançáveis são
  `docs/mecanifica/planos/2026-08-20-auditoria-praticas-autoria-3d.md` e
  `docs/mecanifica/RELATORIO-AUDITORIA-PRATICAS-AUTORIA-3D.md`.
- O plano de [aceite visual vinculante e prova de superfície](planos/2026-08-20-aceite-visual-e-prova-de-superficie.md)
  é o único **ativo**. Ele primeiro torna alvo, sobreposição, vistas, rejeições
  e crítica independente condicionantes do fechamento privado; depois prova uma
  cage com seções de caráter declaradas. P2 e a validação integrada continuam
  congelados, e núcleo, receita pública e catálogo permanecem fora de escopo.
  Registro: `docs/mecanifica/planos/2026-08-20-aceite-visual-e-prova-de-superficie.md`.
  A R0 já isolou o contrato `mecanifica.aceite-visual` v1 em
  [`CONTRATO-ACEITE-VISUAL.md`](CONTRATO-ACEITE-VISUAL.md): alvo, sobreposição,
  quatro vistas, rejeições e crítica tornam-se dados verificáveis antes de R1
  ligar o porteiro à revisão privada.
  Registro: `docs/mecanifica/CONTRATO-ACEITE-VISUAL.md`.
- A [sonda da armadura humanoide tecnológica 1.0](planos/2026-08-18-sonda-armadura-humanoide-1-0.md)
  (`docs/mecanifica/planos/2026-08-18-sonda-armadura-humanoide-1-0.md`)
  foi concluída e aprovada: 13 definições privadas, 22 peças-folha, oito
  submontagens, duas poses estáticas e 16 vistas finais. Ela integrou crítica
  visual reexecutável, bilateralidade quiral e intenção de peça como dados. A
  auditoria decide 231/231 pares em cada estado; movimento contínuo permanece
  explicitamente não verificado. Evidências e limites estão em
  [`RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md`](RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md)
  (`docs/mecanifica/RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md`).
- O contrato de montagem v4 em [`MONTAGEM-PERSISTIDA-V4.md`](MONTAGEM-PERSISTIDA-V4.md)
  registra expectativas de interseção sem suprimi-las. `revisar_montagem` já
  transporta a auditoria; `descrever_montagem` continua sem executá-la.
- A [matriz de testes acoplados ao acervo](MATRIZ-TESTES-ACOPLADOS.md)
  (`docs/mecanifica/MATRIZ-TESTES-ACOPLADOS.md`) registra o
  que é contrato genérico, integração, publicação ou conteúdo específico após
  a remoção das receitas.
- O plano de [autoria segura de receitas declarativas](planos/2026-08-14-autoria-segura-receitas.md)
  (`docs/mecanifica/planos/2026-08-14-autoria-segura-receitas.md`) foi aprovado:
  receitas são dados JSON, passam por vistas e revalidação e não executam
  JavaScript fornecido pelo agente.
- O plano de [continuidade de autoria](planos/2026-08-14-continuidade-autoria-ativa.md)
  (`docs/mecanifica/planos/2026-08-14-continuidade-autoria-ativa.md`)
  foi aprovado: revisão publicada e catálogo operacional agora compartilham o
  mesmo estado, sem alterar o núcleo ou descobrir dependências implícitas.
- O diagnóstico técnico que fundamentou o plano está registrado em
  `docs/mecanifica/RELATORIO-DIAGNOSTICO-MOTOR.md`.
- A análise consolidada de maturidade e próximas melhorias está em
  [`RELATORIO-ANALISE-GRANDES-MELHORIAS.md`](RELATORIO-ANALISE-GRANDES-MELHORIAS.md)
  (`docs/mecanifica/RELATORIO-ANALISE-GRANDES-MELHORIAS.md`).
- O [mapa canônico de dependências](planos/2026-08-14-mapa-canonico-dependencias.md)
  foi concluído com decisão `aprovar`: cobertura global dentro de universo
  explícito, impacto direcionado, proveniência, MCP e continuidade ativa
  (`docs/mecanifica/planos/2026-08-14-mapa-canonico-dependencias.md`). A
  revalidação em cascata persistida foi encerrada no plano próprio abaixo.
- O plano de [revalidação em cascata persistida](planos/2026-08-14-revalidacao-cascata-persistida.md)
  foi concluído no R06 com decisão `aprovar`: identidade semântica, retomada
  persistida, derivação multi-raiz, resultados, obsolescência, estudo de campo
  multi-raiz e consumo Agent-First foram provados. Evolução futura exige plano
  próprio e não implica correção ou promoção automática
  (`docs/mecanifica/planos/2026-08-14-revalidacao-cascata-persistida.md`).
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

## Direção estabelecida

A unidade geométrica editável é a **peça**. A unidade de composição é a
**montagem**. Montagens podem conter outras montagens e formar sistemas, carros
completos e, depois que esse modelo estiver maduro, robôs.

Carro e motor não são receitas monolíticas. A IA deve trabalhar em alvos
reduzidos, escolher quais componentes observar juntos, manter o contexto
estrutural e revalidar as montagens afetadas depois de uma alteração.

Composição, relações e dependências devem existir como dado estruturado do
sistema. Documentação e diagramas podem ser gerados desse mapa, mas não podem
ser sua única fonte de verdade.

MCP, CLI, API ou edição assistida são portas possíveis. Nenhuma delas substitui
o núcleo nem define o modelo de autoria.

## Estrutura principal

| Caminho | Papel |
|---|---|
| `prototipos/procedural/v3/motor/` | núcleo procedural e adaptadores compatíveis |
| `prototipos/procedural/v3/pecas/` | receitas determinísticas de peças |
| `bancada.html`, `src/` | bancada neutra e adaptadores de inspeção |
| `tools/bancadas/` | porteiro, criação, exportação e gabaritos |
| `tools/mecanifica/` | gates da bancada, revisão e contratos |
| `tools/mcp/` | adaptador MCP sobre serviços existentes; hoje principalmente leitura |
| `autoria-assistida/` | pacotes e evidências de homologação de peças |
| `docs/mecanifica/planos/` | contrato de planos, programas e backlog aberto |
| `docs/mecanifica/historico/` | evidências encerradas, sem autoridade nova |

Montagem persistida v1 possui contrato e resolvedor em `src/autoria/` e provas
persistidas em `tools/mecanifica/fixtures/montagens-persistidas/`; o mapa global
de dependências possui contrato em `MAPA-CANONICO-DEPENDENCIAS.md` e serviços em
`src/autoria/`. Não invente uma localização por implicação.

## Fontes de verdade

1. Este índice para a entrada e o estado atual.
2. [`VISAO.md`](VISAO.md) para o objetivo centrado na IA e o horizonte de carros
   e robôs.
3. [`AUTORIA-IA.md`](AUTORIA-IA.md) para o modelo de autoria de peças e sistemas
   compostos.
4. [`AGENT-FIRST.md`](AGENT-FIRST.md) para o critério arquitetural que avalia
   toda capacidade pela ótica do agente que modela, compõe e mantém sistemas.
5. [`ARQUITETURA.md`](ARQUITETURA.md) para fronteiras técnicas atuais e direção
   arquitetural.
6. [`MONTAGENS-SEMANTICAS.md`](MONTAGENS-SEMANTICAS.md) para composição
  recursiva, relações, dependências e níveis de maturidade.
7. [`MONTAGEM-PERSISTIDA-V1.md`](MONTAGEM-PERSISTIDA-V1.md) para o contrato
   executável de montagem persistida v1.
8. [`MONTAGEM-PERSISTIDA-V2.md`](MONTAGEM-PERSISTIDA-V2.md),
   [`MONTAGEM-PERSISTIDA-V3.md`](MONTAGEM-PERSISTIDA-V3.md),
   [`MONTAGEM-PERSISTIDA-V4.md`](MONTAGEM-PERSISTIDA-V4.md) e
   [`CONTEXTO-MONTAGEM-IA.md`](CONTEXTO-MONTAGEM-IA.md) para relações locais e
   sua descrição compacta e consultável.
9. [`BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md) para inspeção visual
  e contexto de trabalho da IA.
10. [`FLUXO-MODELAGEM-IA.md`](FLUXO-MODELAGEM-IA.md) para o fluxo operacional
  atual de uma peça e seus limites.
11. `docs/mecanifica/planos/README.md`, `docs/mecanifica/planos/mcp/INDEX.md` e
  qualquer futuro plano ativo para planejamento.
12. `docs/mecanifica/COORDENACAO-LOCAL.md` e `COORDENACAO-REPOS.md` para trabalho
  paralelo.
13. `docs/uso/oficina-contrato.md` para o vocabulário procedural vigente.
14. [`gerado/INDEX.md`](gerado/INDEX.md) para o catálogo, schemas, contratos de
    uso e hipergrafo
    de capacidades atuais.
15. [`COMPOSICAO-PROCEDURAL-V1.md`](COMPOSICAO-PROCEDURAL-V1.md) para
    reutilização declarativa dentro de receitas.
16. [`EXTENSOES-NATIVAS-V1.md`](EXTENSOES-NATIVAS-V1.md) para extensões nativas.
17. [`LACUNAS-DE-CAPACIDADE-V1.md`](LACUNAS-DE-CAPACIDADE-V1.md) para registrar
    e planejar uma capacidade ausente sem criar extensão automaticamente.
18. [`SERVICOS-PROCEDURAL-V1.md`](SERVICOS-PROCEDURAL-V1.md) para descoberta e
    exposição MCP do vocabulário procedural.
19. [`INTENCAO-PECA-V1.md`](INTENCAO-PECA-V1.md) e
    [`REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md) para
    registrar propósito e achados visuais sem identidade de runtime
    (`docs/mecanifica/INTENCAO-PECA-V1.md`).
20. `docs/uso/MAPA.md` para o inventário gerado.
21. `docs/mecanifica/historico/` e `docs/historico/` somente como evidência.

## Leitura por tarefa

- Estado, objetivo e horizonte: `VISAO.md`, este índice e `planos/README.md`.
- Princípios de autoria: `AUTORIA-IA.md`.
- Peças versus montagens, carro, motor e dependências:
  `MONTAGENS-SEMANTICAS.md` e `ARQUITETURA.md`.
- Montagem persistida e contexto para IA: `MONTAGEM-PERSISTIDA-V1.md`,
  `MONTAGEM-PERSISTIDA-V2.md`, `MONTAGEM-PERSISTIDA-V3.md` e
  `CONTEXTO-MONTAGEM-IA.md`.
- Programa MCP: `docs/mecanifica/planos/mcp/INDEX.md` e os planos datados
  encerrados. O programa MCP não é o roteiro mestre da autoria.
- Núcleo ou dependência técnica: `ARQUITETURA.md`, `AUTORIA-IA.md` e
  `docs/uso/oficina-contrato.md`; para descobrir uma capacidade, abra
  `gerado/INDEX.md` antes de procurar em implementação.
- Reutilização procedural: `COMPOSICAO-PROCEDURAL-V1.md` e o catálogo de
  capacidades; não confundir composição de passos com montagem de peças.
- Capacidade ausente: `LACUNAS-DE-CAPACIDADE-V1.md` e o catálogo gerado; planeje
  primeiro, classifique com evidência e só então abra recorte de implementação.
- Descoberta MCP: `SERVICOS-PROCEDURAL-V1.md`; leia o catálogo, combine e valide
  em memória antes de propor extensão ou registrar lacuna.
- Peça nova ou refinamento: `AUTORIA-IA.md`, `PERFIS-DE-AUTORIA.md`,
  `INTENCAO-PECA-V1.md`, `REFERENCIA-E-CRITICA-VISUAL.md`,
  `FLUXO-MODELAGEM-IA.md` e `BANCADA-E-APRESENTACAO.md`.
- Contexto visual, isolamento e pares: `BANCADA-E-APRESENTACAO.md`.
- Homologação: `HOMOLOGACAO-FLUXO-IA.md` e `FLUXO-MODELAGEM-IA.md`.
- Freio ou roda: a prancha correspondente e o protocolo visual.
- Trabalho histórico: o README da zona histórica antes de abrir evidências.

## Comandos principais

```text
npm test
npm run typecheck
npm run build
npm run porteiro
npm run exportar:check
npm run descrever:montagem:persistida -- --arquivo=<raiz.json> --raiz-montagens=<dir> --raiz-pecas=<dir>
```

## Gates completos

```text
npm test
npm run typecheck
npm run build
npm run porteiro
npm run bancada:vazia:check
npm run guarda:portas
npm run guarda:camera
npm run guarda:par
npm run mapa:check
npm run docs:toc:check
npm run docs:links:check
npm run planos:check
npm run exportar:check
npm run catalogo:check
npm run mcp:check
npm run mcp:ensaio
```

## Pendências atuais

- O plano ativo é o aceite visual vinculante e a prova de superfície. Cenário
  multi-documento, envelope de movimento, subtração robusta, materiais/LOD e
  autoria por intenção continuam candidatos e dependem de recorte executivo
  próprio e ganho verificável.
- `alinhar` e variantes nomeadas permanecem recusados; `loft` fechado já foi
  implementado. A medida e os critérios estão em
  `docs/mecanifica/planos/BACKLOG.md`.

Nenhuma pendência desta lista autoriza implementação automática.

## Histórico

Resultados encerrados da própria Mecanifica ficam em
[`historico/README.md`](historico/README.md). Decisões do NÓS ficam em
`docs/historico/`; nenhuma dessas zonas autoriza trabalho novo.

## Inventário curado

Contratos e protocolos: [ARQUITETURA](ARQUITETURA.md), [AUTORIA-IA](AUTORIA-IA.md),
[AUTORIA-RECEITA-DECLARATIVA](AUTORIA-RECEITA-DECLARATIVA.md),
[MAPA-CANONICO-DEPENDENCIAS](MAPA-CANONICO-DEPENDENCIAS.md)
(`docs/mecanifica/MAPA-CANONICO-DEPENDENCIAS.md`),
[CONTEXTO-MONTAGEM-IA](CONTEXTO-MONTAGEM-IA.md),
[BANCADA-E-APRESENTACAO](BANCADA-E-APRESENTACAO.md), [CONTINUIDADE-ARQUITETURAL](CONTINUIDADE-ARQUITETURAL.md),
[MONTAGEM-PERSISTIDA-V2](MONTAGEM-PERSISTIDA-V2.md), [MONTAGEM-PERSISTIDA-V3](MONTAGEM-PERSISTIDA-V3.md),
[ESCRITA-TRANSACIONAL-MONTAGEM](ESCRITA-TRANSACIONAL-MONTAGEM.md),
[CONTEXTO-VISUAL-REVALIDACAO](CONTEXTO-VISUAL-REVALIDACAO.md),
[FLUXO-MODELAGEM-IA](FLUXO-MODELAGEM-IA.md),
[HOMOLOGACAO-FLUXO-IA](HOMOLOGACAO-FLUXO-IA.md), [MONTAGENS-SEMANTICAS](MONTAGENS-SEMANTICAS.md),
[UPSTREAM-NOS](UPSTREAM-NOS.md), [ATRITOS-AUTORIA](ATRITOS-AUTORIA.md), [VISAO](VISAO.md),
[PERFIS-DE-AUTORIA](PERFIS-DE-AUTORIA.md), [REFERENCIA-E-CRITICA-VISUAL](REFERENCIA-E-CRITICA-VISUAL.md),
[FILETE-V2](FILETE-V2.md), [PRANCHA-FREIO-DISCO](PRANCHA-FREIO-DISCO.md), [PRANCHA-RODA-DIANTEIRA](PRANCHA-RODA-DIANTEIRA.md),
[COORDENACAO-LOCAL](COORDENACAO-LOCAL.md), [COORDENACAO-REPOS](COORDENACAO-REPOS.md), [PLANO](PLANO.md).

O contrato declarativo está em `docs/mecanifica/AUTORIA-RECEITA-DECLARATIVA.md`.

Evidência atual: [estudo de campo do conjunto dianteiro](RELATORIO-ESTUDO-CAMPO-CONJUNTO-DIANTEIRO.md).
O [relatório de autoria geométrica](RELATORIO-EXPERIMENTO-AUTORIA-GEOMETRICA.md)
(`docs/mecanifica/RELATORIO-EXPERIMENTO-AUTORIA-GEOMETRICA.md`) registra a
decisão `corrigir` e a fronteira de autoria de receitas.
O próximo experimento já tem [conjunto neutro definido](CONJUNTO-PROVA-AUTORIA-GEOMETRICA.md)
(`docs/mecanifica/CONJUNTO-PROVA-AUTORIA-GEOMETRICA.md`), mas não possui plano ativo.

Planejamento: [planos/README](planos/README.md),
[diagnóstico do motor](planos/2026-08-06-diagnostico-motor-procedural.md),
[protocolo do diagnóstico](PROTOCOLO-DIAGNOSTICO-MOTOR.md),
[programa MCP](planos/mcp/INDEX.md),
[Fatia 1B visual](planos/2026-08-05-mcp-fatia-1b-visual.md),
[avaliação consolidada](planos/2026-08-05-mcp-avaliacao-consolidada.md),
[correção de descoberta](planos/2026-08-05-mcp-correcao-descoberta.md),
[autoria controlada](planos/2026-08-05-mcp-autoria-controlada.md),
[contexto de montagem para IA](planos/2026-08-14-contexto-de-montagem-para-ia.md),
[separação direcional e impacto local](planos/2026-08-14-separacao-direcional-e-impacto-local.md),
[contexto visual e autoria segura](planos/2026-08-14-contexto-visual-e-autoria-segura.md),
[MCP — leitura e auditoria de montagens](planos/2026-08-14-mcp-montagens-leitura.md)
(`docs/mecanifica/planos/2026-08-14-mcp-montagens-leitura.md`),
[materialização e autoria segura de montagens](planos/2026-08-14-materializacao-autoria-segura.md),
[abertura oblonga](planos/2026-08-17-abertura-oblonga.md)
(`docs/mecanifica/planos/2026-08-17-abertura-oblonga.md`),
[pose de criação](planos/2026-08-17-pose-de-criacao.md)
(`docs/mecanifica/planos/2026-08-17-pose-de-criacao.md`),
[nome de cópia](planos/2026-08-17-nome-de-copia.md)
(`docs/mecanifica/planos/2026-08-17-nome-de-copia.md`),
[alteração compacta](planos/2026-08-17-alteracao-compacta.md)
(`docs/mecanifica/planos/2026-08-17-alteracao-compacta.md`),
[encostar](planos/2026-08-17-encostar.md)
(`docs/mecanifica/planos/2026-08-17-encostar.md`),
[ponto nomeado](planos/2026-08-17-ponto-nomeado.md)
(`docs/mecanifica/planos/2026-08-17-ponto-nomeado.md`),
[histórico de revisão](planos/2026-08-17-historico-de-revisao.md)
(`docs/mecanifica/planos/2026-08-17-historico-de-revisao.md`),
[lathe fechado](planos/2026-08-17-lathe-fechado.md)
(`docs/mecanifica/planos/2026-08-17-lathe-fechado.md`),
[estudo do conjunto dobradiça](planos/2026-08-17-estudo-conjunto-dobradica.md)
(`docs/mecanifica/planos/2026-08-17-estudo-conjunto-dobradica.md`),
[encerramento da Fatia 1A](planos/mcp/concluidos/01-fatia-1a-piloto-leitura.md),
[BACKLOG](planos/BACKLOG.md), [MODELO](planos/MODELO.md) e
[concluídos](planos/concluidos/ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md).

Índices e contratos herdados: [RECURSOS](../uso/RECURSOS.md), [oficina-contrato](../uso/oficina-contrato.md),
[oficina-referencia](../uso/oficina-referencia.md), [MAPA](../uso/MAPA.md), [oficina](../oficina.md).
O contexto histórico do NÓS está em [DECISIONS](../historico/DECISIONS.md),
[DECISIONS-ARCHIVE](../historico/DECISIONS-ARCHIVE.md), [TETO](../historico/TETO.md),
[oficina-projeto](../historico/oficina-projeto.md), [playground](../historico/playground.md),
[diagnostico](../historico/diagnostico-subpartes-semanticas.md), [proveniencia](../historico/proveniencia-local-fixture.md),
[fixtures](../historico/fixture-identidade-estavel-relatorio.md), [walkthrough](../historico/walkthrough_colaborador4.md),
[relatórios de fase 4](../historico/fase4-drone-inspecao-criacao-relatorio.md),
[refinos de moto](../historico/teto-moto-relatorio.md).

Outros registros preservados: [arquivo de decisões](../historico/DECISIONS-ARCHIVE.md),
[diagnóstico de subpartes](../historico/diagnostico-subpartes-semanticas.md),
[fase 4 criação](../historico/fase4-drone-inspecao-criacao-relatorio.md),
[fase 4 refino](../historico/fase4-drone-inspecao-refino-relatorio.md),
[fixture apaga](../historico/fixture-identidade-apaga-relatorio.md),
[fixture cubo](../historico/fixture-identidade-cubo-relatorio.md),
[fixture espelho](../historico/fixture-identidade-espelho-relatorio.md),
[fixture estável](../historico/fixture-identidade-estavel-relatorio.md),
[moto refino 3](../historico/teto-moto-refino-3-relatorio.md),
[moto refino](../historico/teto-moto-refino-relatorio.md),
[seleção semântica](../historico/teto-selecao-semantica-relatorio.md).

Rumo histórico: [NORTE](../rumo/NORTE.md), [PLANO](../rumo/PLANO.md),
[arquitetura-identidade-estavel](../rumo/arquitetura-identidade-estavel.md) e
[oficina-roteiro](../rumo/oficina-roteiro.md). A própria zona histórica da Mecanifica
é indexada em [historico/README](historico/README.md).

<!-- Plano concluído alcançável: docs/mecanifica/planos/2026-08-14-contexto-de-montagem-para-ia.md -->

<!-- Plano concluído alcançável: docs/mecanifica/planos/2026-08-14-separacao-direcional-e-impacto-local.md -->

<!-- Plano concluído alcançável: docs/mecanifica/planos/2026-08-14-contexto-visual-e-autoria-segura.md -->

<!-- Evidência alcançável: docs/mecanifica/RELATORIO-ESTUDO-CAMPO-CONJUNTO-DIANTEIRO.md -->

<!-- Documento de continuidade arquitetural incluído no inventário curado: docs/mecanifica/CONTINUIDADE-ARQUITETURAL.md -->

<!-- Contrato de contexto alcançável: docs/mecanifica/CONTEXTO-MONTAGEM-IA.md -->

<!-- Contrato v3 alcançável: docs/mecanifica/MONTAGEM-PERSISTIDA-V3.md -->

<!-- Contrato v4 alcançável: docs/mecanifica/MONTAGEM-PERSISTIDA-V4.md -->

<!-- Contrato de escrita alcançável: docs/mecanifica/ESCRITA-TRANSACIONAL-MONTAGEM.md -->

<!-- Contexto visual alcançável: docs/mecanifica/CONTEXTO-VISUAL-REVALIDACAO.md -->

<!-- Plano ativo alcançável: docs/mecanifica/planos/2026-08-14-materializacao-autoria-segura.md -->

<!-- Artefatos R05 alcançáveis: docs/mecanifica/gerado/INDEX.md docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md -->

<!-- Contrato R06 alcançável: docs/mecanifica/COMPOSICAO-PROCEDURAL-V1.md -->

<!-- Contrato R07 alcançável: docs/mecanifica/EXTENSOES-NATIVAS-V1.md -->

<!-- Contrato R08 alcançável: docs/mecanifica/LACUNAS-DE-CAPACIDADE-V1.md -->

<!-- Contrato R09 alcançável: docs/mecanifica/SERVICOS-PROCEDURAL-V1.md -->

<!-- Inventário explícito para o gate de alcançabilidade: docs/mecanifica/AGENT-FIRST.md docs/mecanifica/ARQUITETURA.md docs/mecanifica/ATRITOS-AUTORIA.md docs/mecanifica/AUTORIA-IA.md docs/mecanifica/BANCADA-E-APRESENTACAO.md docs/mecanifica/COORDENACAO-LOCAL.md docs/mecanifica/COORDENACAO-REPOS.md docs/mecanifica/FILETE-V2.md docs/mecanifica/FLUXO-MODELAGEM-IA.md docs/mecanifica/HOMOLOGACAO-FLUXO-IA.md docs/mecanifica/MONTAGENS-SEMANTICAS.md docs/mecanifica/MONTAGEM-PERSISTIDA-V2.md docs/mecanifica/PERFIS-DE-AUTORIA.md docs/mecanifica/PLANO.md docs/mecanifica/PRANCHA-FREIO-DISCO.md docs/mecanifica/PRANCHA-RODA-DIANTEIRA.md docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md docs/mecanifica/UPSTREAM-NOS.md docs/mecanifica/VISAO.md docs/mecanifica/historico/README.md docs/mecanifica/historico/EXPERIMENTO-AB-FLUXO-IA.md docs/mecanifica/historico/EXPERIMENTO-RODA-REALISTA.md docs/mecanifica/historico/OFICINA-OTIMIZACOES.md docs/mecanifica/historico/RELATO-RODA-REALISTA.md docs/mecanifica/historico/RELATORIO-PONTE-THREE.md docs/mecanifica/PROTOCOLO-DIAGNOSTICO-MOTOR.md docs/mecanifica/planos/README.md docs/mecanifica/planos/2026-08-06-diagnostico-motor-procedural.md docs/mecanifica/planos/BACKLOG.md docs/mecanifica/planos/MODELO.md docs/mecanifica/planos/2026-08-04-mcp-para-agentes.md docs/mecanifica/planos/2026-08-05-mcp-fatia-1b-visual.md docs/mecanifica/planos/2026-08-05-mcp-avaliacao-consolidada.md docs/mecanifica/planos/2026-08-05-mcp-correcao-descoberta.md docs/mecanifica/planos/2026-08-05-mcp-autoria-controlada.md docs/mecanifica/planos/mcp/INDEX.md docs/mecanifica/planos/mcp/concluidos/01-fatia-1a-piloto-leitura.md docs/mecanifica/planos/concluidos/2026-08-02-assentamento-anular.md docs/mecanifica/planos/concluidos/2026-08-02-camera-livre-reproduzivel.md docs/mecanifica/planos/concluidos/2026-08-02-canto-composto.md docs/mecanifica/planos/concluidos/2026-08-02-concordancia-por-ponto.md docs/mecanifica/planos/concluidos/2026-08-02-contagem-por-desvio.md docs/mecanifica/planos/concluidos/2026-08-02-contato-local-cilindrico.md docs/mecanifica/planos/concluidos/2026-08-02-estados-de-encaixe.md docs/mecanifica/planos/concluidos/2026-08-02-identidade-porta-estavel.md docs/mecanifica/planos/concluidos/2026-08-02-interfaces-de-encaixe.md docs/mecanifica/planos/concluidos/2026-08-02-portas-espelho-arranja.md docs/mecanifica/planos/concluidos/2026-08-02-pose-derivada-roda.md docs/mecanifica/planos/concluidos/2026-08-02-pose-em-referencial.md docs/mecanifica/planos/concluidos/2026-08-02-recusa-estrutural-montagem.md docs/mecanifica/planos/concluidos/2026-08-02-tolerancias-de-montagem.md docs/mecanifica/planos/concluidos/2026-08-02-triangulacao-de-furos.md docs/mecanifica/planos/concluidos/2026-08-03-consulta-subarvore-ia.md docs/mecanifica/planos/concluidos/2026-08-03-hierarquia-semantica-minima.md docs/mecanifica/planos/concluidos/2026-08-03-inspecao-reproduzivel-de-par.md docs/mecanifica/planos/concluidos/2026-08-03-selecao-subarvore-semantica.md docs/mecanifica/planos/concluidos/ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md docs/historico/DECISIONS-ARCHIVE.md docs/historico/DECISIONS.md docs/historico/TETO.md docs/historico/diagnostico-subpartes-semanticas.md docs/historico/fase4-drone-inspecao-criacao-relatorio.md docs/historico/fase4-drone-inspecao-refino-relatorio.md docs/historico/fixture-identidade-apaga-relatorio.md docs/historico/fixture-identidade-cubo-relatorio.md docs/historico/fixture-identidade-espelho-relatorio.md docs/historico/fixture-identidade-estavel-relatorio.md docs/historico/oficina-projeto.md docs/historico/playground.md docs/historico/proveniencia-local-fixture.md docs/historico/teto-moto-refino-3-relatorio.md docs/historico/teto-moto-refino-relatorio.md docs/historico/teto-moto-relatorio.md docs/historico/teto-selecao-semantica-relatorio.md docs/historico/walkthrough_colaborador4.md docs/rumo/NORTE.md docs/rumo/PLANO.md docs/rumo/arquitetura-identidade-estavel.md docs/rumo/oficina-roteiro.md docs/uso/MAPA.md docs/uso/RECURSOS.md docs/uso/oficina-contrato.md docs/uso/oficina-referencia.md docs/oficina.md -->
