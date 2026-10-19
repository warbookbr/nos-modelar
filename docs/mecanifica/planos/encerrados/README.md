# Planos encerrados

Esta pasta guarda os planos **concluídos** e **cancelados**. Eles registram o
que foi decidido e provado, e por isso continuam sendo evidência consultável.

Nenhum deles governa trabalho novo: não abre implementação, não reabre escopo e
não autoriza nada por analogia. O plano em jogo mora em
[`../README.md`](../README.md); o que saiu de cena por mudança de rota, e pode
voltar, mora em [`../congelados/README.md`](../congelados/README.md).

## Crônica

- [Receitas com material e textura](./2026-10-19-receitas-com-material-e-textura.md) foi concluído em 2026-10-19: o esboço passou a guardar o material por peça, o tradutor leva 98,8% das peças das receitas do projeto externo ao esboço e de volta, e um módulo gera em Node a textura de madeira, metal, tecido e liso, aprovada pela pessoa em imagem.
- [Aparelhos de caixa](./2026-10-16-aparelhos-de-caixa.md) foi concluído em 2026-10-19: uma família gera eletrodomésticos e eletrônicos de caixa, e o forninho elétrico, o micro-ondas, a air fryer de forno e a lava-louças compacta foram aprovados em forma pela pessoa, por um processo leve que custou uma fração de uma peça do avião.
- As [referências visuais e controles da bancada](./2026-09-09-bancada-referencias-e-controles.md)
  foram concluídas em 2026-09-10, com o desenho em
  [DESENHO-bancada-referencias-e-controles.md](./DESENHO-bancada-referencias-e-controles.md).
  A bancada passou a sustentar imagem de referência por alvo, preferências de
  cena, wireframe e opacidade sobre a seleção, atalhos remapeáveis que recusam
  colisão e painéis recolhíveis. A fronteira entre referência visual e modelo
  procedural ficou guardada por teste.

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
  `procedural/`, sem mudança geométrica ou de contrato.
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
  executável](../../historico/BASELINE-MOTOR-R00.md)
  (`docs/mecanifica/historico/BASELINE-MOTOR-R00.md`) e o mapa da fachada. A R01 foi concluída:
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
  [`CHASSI-P0-ALVO-E-LIMIARES.md`](../../historico/CHASSI-P0-ALVO-E-LIMIARES.md)
  (`docs/mecanifica/historico/CHASSI-P0-ALVO-E-LIMIARES.md`): perfil `F3` declarado antes
  de modelar, envelope e quinze landmarks fixados, prancha ortográfica derivada
  adotada como referência vinculante no lugar da imagem em perspectiva, limiares
  numéricos dos oito eixos e oito condições de rejeição visual escritas antes da
  geometria. A rodada P1 também está fechada em
  [`CHASSI-P1-CONTRATO-DA-CAGE.md`](../../historico/CHASSI-P1-CONTRATO-DA-CAGE.md)
  (`docs/mecanifica/historico/CHASSI-P1-CONTRATO-DA-CAGE.md`): `mecanifica.cage-quad@1` é
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
  [plataforma nativa](../../historico/DOSSIE-PLATAFORMA-AUTORIA-3D-NATIVA.md),
  [motor de superfícies](../../historico/DOSSIE-MOTOR-SUPERFICIES-NATIVAS.md),
  [fluxo multifamília](../../historico/DOSSIE-FLUXO-IA-VALIDACAO-MULTIFAMILIA.md),
  [matriz de rastreabilidade](../../historico/MATRIZ-RASTREABILIDADE-AUTORIA-3D-NATIVA.md),
  [contrato N1](../../historico/FLUXO-AUTORIA-N1.md), [relatório N1](../../historico/RELATORIO-N1-FLUXO-AUTORIA.md),
  [contrato N2](../../CONTRATO-FORMA-GLOBAL-N2.md), [relatório N2](../../historico/RELATORIO-N2-FORMA-GLOBAL.md),
  [relatório N3](../../historico/RELATORIO-N3-CANAL-PERCEPCAO.md),
  [relatório N4](../../historico/RELATORIO-N4-RESTRICOES.md) e [relatório N5](../../historico/RELATORIO-N5-BUSCA.md).
  Caminhos alcançáveis: `docs/mecanifica/DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md`,
  `docs/mecanifica/planos/encerrados/2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md`,
  `docs/mecanifica/historico/DOSSIE-MODELADOR-POR-SELECAO.md`,
  `docs/mecanifica/historico/DOSSIE-PLATAFORMA-AUTORIA-3D-NATIVA.md`,
  `docs/mecanifica/historico/DOSSIE-MOTOR-SUPERFICIES-NATIVAS.md`,
  `docs/mecanifica/historico/DOSSIE-FLUXO-IA-VALIDACAO-MULTIFAMILIA.md`,
  `docs/mecanifica/historico/MATRIZ-RASTREABILIDADE-AUTORIA-3D-NATIVA.md`,
  `docs/mecanifica/historico/FLUXO-AUTORIA-N1.md`,
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

## Crônica do índice de planos

Esta seção guarda o que o índice `planos/README.md` carregava antes de ser enxugado: o estado de cada plano, a execução e os resultados que vieram depois, a tabela de concluídos e a abertura em curso. É consulta e não leitura de partida. A regra de quando um plano governa trabalho novo continua no contrato do índice.

### Estado

[Importar objeto de código](2026-10-15-importar-objeto-de-codigo.md) fechou em 2026-10-16, concluído por decisão da pessoa
sem a fatia 2: os importadores de OpenSCAD, STEP e STL por peça entraram no repositório, e as sondas mostraram que a
importação serve a peças e objetos simples, e que os objetos grandes da lista não existem prontos com licença aberta.

[Gates em poucos minutos](2026-10-16-gates-em-poucos-minutos.md) fechou em 2026-10-16, concluído: a bateria padrão de
`npm run gates` caiu de 27 minutos para menos de 5, com os testes divididos em rápidos e lentos e a bateria completa
antes de todo envio à main, por decisão da pessoa.

[O avião do esboço à receita](2026-10-15-o-aviao-do-esboco-a-receita.md) fechou em 2026-10-16,
concluído com a aprovação da pessoa: as oito peças do avião no núcleo, cada uma com
`REFINA` contra o esboço, a rodada de ajustes que ela pediu, a montagem auditada por
`etapas --auditar` com os encaixes declarados e as rodas no chão, e as ferramentas que a
travessia pediu, da receita planejada gerada ao pacote do crítico montado pela ferramenta.

[As famílias de desenho](2026-10-14-familias-de-desenho.md) fecharam em 2026-10-14,
concluído com a aprovação da pessoa: as famílias de desenho da carcaça e do braço,
ajustadas às referências acima de 0,95, e a prova numa empilhadeira nova, em que o
desenho às cegas pela família deu 0,767 e mostrou que uma referência não basta para a
faixa; a família da carcaça foi ampliada para as duas empilhadeiras, e o ajuste à
referência e o sorteio da prova entraram na ferramenta.

[O desenho sem referência](2026-10-13-desenho-sem-referencia.md) fechou em
2026-10-14, concluído com a decisão da pessoa: o módulo de desenho por restrições,
com o planegcs, e duas provas contra referência escondida, em que as restrições
empataram com as coordenadas no primeiro traço e ganharam na correção; o que
limitou o acerto foi a descrição, e o sucessor monta peças e famílias de desenho.

[O que o avião pede](2026-10-11-o-que-o-aviao-pede.md) fechou em 2026-10-13,
concluído com a aceitação da pessoa: o avião de pequeno porte modelado duas vezes,
a segunda 8% mais barata (3,60 contra 3,93 milhões de tokens) e sem liberação, a
família de superfície aerodinâmica, o recorte de uma forma por outra, o curso de
mecanismo e a superfície suave por seções; 38 atritos da segunda rodada foram ao
backlog.

[As ferramentas de modelagem](2026-10-07-as-ferramentas-de-modelagem.md) fechou
em 2026-10-11, concluído com a aceitação da pessoa: o esboço sobre o nível zero, a
camada de features, casca, chapa dobrada, barras e articulação como extensões
nativas, a medida antes do crítico e o crítico calibrado (12 de 12 imagens), e as
famílias dobradiça, cilindro hidráulico, roda e pneu e móvel de caixa. O banco de
provas refeito mostrou ganho de custo pequeno no esboço.

[O caminho curto da IA](2026-10-07-o-caminho-curto-da-ia.md) fechou em
2026-10-08: os quatro esboços do banco custaram 31% menos tokens, todos em uma
rodada, com duas notas caindo de 9 para 8, aceitas pela pessoa. [As ferramentas
de modelagem](2026-10-07-as-ferramentas-de-modelagem.md), congelado em
2026-10-07 com a fatia 1 entregue, voltou como ativo, com a casca adiantada para a
fatia 2 e o rascunho das [perguntas do
crítico](2026-10-08-perguntas-do-critico-por-objeto.md) absorvido. [As partes do braço](../congelados/2026-09-26-as-partes-do-braco.md)
seguem congeladas.

[O catálogo de famílias](2026-10-06-o-catalogo-de-familias.md) foi
cancelado em 2026-10-07 e substituído pelo plano ativo, com o crítico da T012, a
lista de ferramentas por objeto e a pesquisa aberta entregues.

[O esboço detalhado coerente](2026-10-01-o-esboco-detalhado-coerente.md)
fechou em 2026-10-06 com as fatias 1 a 8 entregues (bugs do fluxo, `fixa`,
`envolve`, roda com raios, crítico por unidade e no Marco, módulos e
biblioteca, `--corte`, `--explodir`, `--ligacoes`, regra da nota no Condutor,
skills `esboco-detalhado` e `laco-do-esboco`) e o gate cumprido em parte: a
refeita da moto e da escavadeira ficou como medição, com as notas paradas
entre 6 e 7 e o custo concentrado em reconstruir mecanismos comuns.

[O esboço sem conta à mão](2026-09-29-o-esboco-sem-conta-a-mao.md)
fechou em 2026-10-01 com o esboço descrito por relações, parâmetros e unidades:
componentes, formas curvas, o gate que propõe o conserto, o Condutor com Envelope
e Marcos, a conferência contra a foto e `--detalhar`, `--integrar` e `--editar`.
Duas rodadas independentes (uma moto de 219 formas e uma mini escavadeira) gastaram
cerca de 10 KB de código auxiliar contra 106 KB, e a pessoa aceitou o resultado.

[União de sólidos](2026-09-28-uniao-de-solidos.md) fechou em
2026-09-29 com `unir`, `subtrair` e `intersectar` no núcleo, o arredondamento
da costura côncava, convexa e interna, o `liso` com ângulo e o ombro refeito
como coluna unida ao braço, fixado pela pessoa. As partes do braço voltaram do
congelamento no mesmo dia, com o inventário do que elas pedem ao núcleo no
fechamento desse plano.

[O braço inteiro](2026-09-25-o-braco-inteiro.md) fechou em
2026-09-26 no limite de tamanho, com a porta conferida contra a forma, o
contorno tirado da imagem por watershed e o fluxo do objeto com mapa de
partes, prancha e rodadas com crítico; as partes restantes e a exportação
passaram ao plano novo.

[O laço constrói parte por
parte](2026-09-23-o-laco-constroi-parte-por-parte.md) fechou em
2026-09-25 com base, anel da cintura e ombro fixos; o ombro passou por aceite
humano com dois defeitos pequenos em aberto.

[A peça nasce encaixada](2026-09-22-a-peca-nasce-encaixada.md)
fechou em 2026-09-23 com o mecanismo pronto: etapas, vínculos de medida e
posição por porta na montagem v5, provados numa fixture neutra.

[O teste carrega o que ele
prova](2026-09-22-o-teste-carrega-o-que-ele-prova.md) fechou em
2026-09-22 apagando `autoria-assistida/`. O que estava em uso mudou para
`tools/mcp/` e `tools/fixtures/`, e um teste novo recusa teste desligado sem
condição escrita.

[O núcleo mora num lugar
só](2026-09-22-o-motor-mora-num-lugar-so.md) fechou em 2026-09-22.
O núcleo está em `procedural/nucleo/` com os testes dele, e
`procedural/nucleo/arrumacao.test.mjs` recusa teste que prova só o núcleo fora
dessa pasta e recusa pasta chamada `motor`.

[Nada depende da
bicicleta](2026-09-17-nada-depende-da-bicicleta.md) fechou em
2026-09-22 com a remoção da peça, e o acervo ficou sem peça, declarado num
`ACERVO-SEM-PECA.md` que saiu quando o braço repovoou o acervo.

O [que o braço robótico achou](../2026-09-21-o-que-o-braco-robotico-achou.md) é
**rascunho** aberto em 2026-09-21. O braço foi modelado como sonda, e não como
peça, e duas rodadas bastaram para levantar a lista: o corpus de teste virou um
segundo acervo visível na bancada, o visor morreu na migração para pasta sem
nada exercitá-lo, o `loft` não fecha tampa própria, o registro de rodada exige
nota que o crítico sem alvo não tem, e a skill de alinhamento nunca pergunta
qual eixo aponta para cima. Esse último produziu o achado que governa os
outros: o braço passou em todas as medidas deitado no chão, porque toda régua
compara a peça contra a declaração da própria peça. `guarda:referencial` saiu
daí e já está na main.

O [vocabulário poligonal da bancada](../congelados/2026-09-17-vocabulario-poligonal-da-bancada.md)
— subdivisão, bisel, loop cut e proportional editing — nasceu **congelado** em
2026-09-17. A frente que precisa melhorar agora é a da IA, e acrescentar
vocabulário de desenho antes disso aumenta o que a pessoa consegue fazer sem
aumentar o que a IA consegue devolver. Modificadores nem entram nele sem uma
medida antes: são não destrutivos e esbarram na regra de que conteúdo salvo é
determinístico e reexecutável.

A [topologia, mover a peça, e ler o gesto](2026-09-16-topologia-e-leitura-do-gesto.md)
foi **concluída** em 2026-09-17. Extrudar, duplicar, apagar, criar face, girar e
escalar vivem no núcleo sem Three.js; mover a parte inteira é `G` sem entrar no
modo de edição; `npm run descrever:gesto` diz por parte se o movimento foi
translação, rotação, escala, esticão com uma ponta presa, dobra ou nenhum desses,
e aponta o passo da receita que constrói aquela parte. A descrição nasce na
bancada, onde as duas malhas ainda têm os mesmos vértices, porque emparelhar duas
nuvens por posição falha quando o gesto tem o tamanho do espaçamento entre
pontos. Três defeitos sérios apareceram no caminho e foram corrigidos: quem
editava a malha não tinha como salvar, porque a base de comparação era a própria
malha viva; duplicar e criar face saíam do alvo indistinguíveis da receita
intacta, e o alvo passou a guardar a contagem de faces por parte; e girar e
escalar respondiam "nada mudou" quando recebiam o eixo pelo nome.

O [modo de edição de malha](2026-09-15-modo-de-edicao-de-malha.md) foi
**concluído** em 2026-09-16. Tab entra no modo, 1/2/3 trocam entre vértice,
aresta e face, L pega a ilha, G move com trava de eixo e valor digitado, o gizmo
move pelo ponteiro, Ctrl gruda no vértice mais próximo e Ctrl+Z desfaz até o
arquivo. Provou o que faltava: variar os números que a receita declara não
alcança uma edição livre, mas reescrever a receita alcança — com o topo do tubo
do selim empurrado 6 mm em x, onde nenhum parâmetro chega, a reescrita fecha em
0,236 mm. Seis defeitos de interface foram achados e medidos, entre eles o clique
tremido que limpava a seleção e o realce que era apagado pela ordem de desenho.

O [ajuste da bancada volta como receita](2026-09-14-ajuste-da-bancada-volta-como-receita.md)
foi **concluído** em 2026-09-15. A bancada exigia que todo gesto caísse num
parâmetro nomeado no instante do arrasto, e num quadro em treliça nenhum número
empurra um tubo inteiro sem descolar as juntas. Os dois momentos foram separados:
a pessoa desenha, e a tradução vira uma rodada com dono. Dali saíram o alvo
medido por parte, a skill `absorver-ajuste-da-bancada`, o comando
`npm run absorver` e o gate `origens:check`, que impede a tradução de inventar
número para fechar a conta.

A [seta move de verdade](2026-09-12-a-seta-move-de-verdade.md) foi
**concluída** em 2026-09-12. O gesto direto da bancada tinha quatro defeitos ao mesmo tempo, todos medidos: a
seta escolhida comparava as bordas da caixa da parte e por isso um raio, que
engorda sem andar, governava a seta; toda prévia reencaixava a peça no estúdio e
as oito partes escorregavam juntas; a reconstrução da prévia jogava fora o
arrasto em curso, e o gesto morria no primeiro movimento do ponteiro; e a
conversão do arrasto ignorava a escala do estúdio. A haste também era fina demais
para o ponteiro acertar. Agora o arrasto move a parte na medida do ponteiro e só
ela, com `guarda:seta` afirmando isso no navegador. Volta ao backlog dizer à
pessoa por que um eixo ficou sem seta.

A [peça mora num lugar só](2026-09-11-a-peca-mora-num-lugar-so.md)
foi **concluída** em 2026-09-11. O material de uma peça estava em quatro árvores
do repositório e nada dizia que pertencia à mesma peça; agora a peça é uma pasta
com receita, referências e rodadas do laço juntas. A foto que a bancada sobrepõe
saiu de `public/` e passou a ser declarada pela receita e emitida na construção,
com guarda que abre o pacote publicado no navegador e confere que ela virou plano
na cena. Referência declarada que não existe e peça em arquivo solto reprovam.

A [orquestração de modelagem](2026-09-11-orquestracao-de-modelagem.md)
foi **concluída** em 2026-09-11. Quem modela deixou de aprovar o que modelou: a
peça declara em `PLANO` o que promete ser, `guarda:acervo` cobra isso a cada
gate, o revisor devolve defeitos em vocabulário fechado onde ângulo e posição
não trocam de sentido, e a decisão de parar saiu da sessão para `proximaAcao`,
que lê os números da rodada. Cada rodada fica registrada com o veredito que a
motivou. O que não foi feito, e limita o resultado: a medida de ângulo e
comprimento contra a imagem de referência, sem a qual reprovar por proporção
ainda depende do olho.

A [ponte do gesto ao parâmetro nomeado](2026-09-10-ponte-do-gesto-ao-parametro.md)
foi **concluída** em 2026-09-11. A bancada passou a oferecer os números que a
receita declara em `PARAMS`, com setas por eixo na parte selecionada ligadas ao
parâmetro que a varredura de sensibilidade apontou, prévia por reexecução, botão
de salvar que grava o lote — no arquivo local ou como commit pela API do GitHub —
e desfazer de sessão que para no estado que veio do arquivo. Arrastar e digitar o
mesmo valor produzem o mesmo arquivo, e nenhum gesto escreve passo novo nem id
literal de vértice.

As [referências visuais e controles da bancada](2026-09-09-bancada-referencias-e-controles.md),
com o desenho em
[DESENHO-bancada-referencias-e-controles.md](DESENHO-bancada-referencias-e-controles.md),
foram **concluídas** em 2026-09-10. O painel `IA & Ref` deixou de mostrar
`undefined`, a referência por imagem persiste por alvo, o plano texturizado é
materializado e descartado no Three.js, a inspeção ganhou wireframe e opacidade
sobre a seleção, e a barra superior trouxe grade e chão como preferência,
atalhos remapeáveis com recusa de colisão e recolhimento dos painéis laterais. A
fronteira entre referência visual e modelo procedural está guardada por teste: o
plano da foto não entra na raiz do modelo nem no enquadramento.

[Esquecer precisa falhar](2026-09-08-esquecer-precisa-falhar.md) foi
**concluído** em 2026-09-08. O veredito de contato deixou de depender da
bandeira `--estrito` e passou a ser o padrão, a montagem passou a reprovar peça
atravessando peça, a expectativa de interseção virou contrato em vez de
anotação, e a amostragem da contenção passou a incluir o centroide de cada
triângulo, o que corrigiu o rebaixamento de `interpenetram` para `encostam`
entre sólidos de lado igual.

O gate de fechamento entregou `cavalete-de-serra`, modelada por um agente sem
contexto a partir de um pedido que não citava contato nem bandeira, e ela passa
declarando os três contatos intencionais. A ferramenta não chegou a reprovar
esse agente, e o registro no plano diz por quê: ele declarou de primeira, depois
de ler uma receita que só tinha `contatos` porque a R00 os acrescentou horas
antes. O que ficou provado veio de medida direta — tirando o campo `contatos`
daquela mesma peça, o comando sai com código 1 e acusa os três pares.

A inversão do padrão também revelou dois defeitos reais no acervo, registrados e
não corrigidos: `barricada-de-sucata`, cuja receita trata `em` como canto mínimo
do cubo quando é translação de um cubo centrado, e `bicicleta-urbana`, que
mantém o tubo inferior atravessando o pneu dianteiro.

O [que nenhuma vista mostra](2026-09-07-o-que-nenhuma-vista-mostra.md)
foi **concluído e aprovado** em 2026-09-08. Ele fechou as duas famílias de "erra
e mede limpo" que a bicicleta produziu: peça que não sai com a forma prometida, e
parte atravessando parte. Contato não declarado passou a REPROVAR com código de
saída, a forma prometida é conferida por V−E+F, os pares acusados saem como
imagem da mesma chamada, e a dica passou a aparecer uma vez e só quando se
aplica.

Nada de geometria foi escrito: o teste exato de sólido já existia dentro da
auditoria de montagem e a contagem de furo em `modulos/topologia`. O núcleo saiu
para `contato-de-solidos.js` e a auditoria de montagem caiu de 340 para 108
linhas sem mudar comportamento.

O gate de fechamento passou com quem não construiu a ferramenta: um subagente
frio recebeu *"leia as skills e o readme, modele uma bicicleta"*, sem menção a
colisão, e a peça saiu verde por estar certa — 22 contatos declarados, zero
atravessamentos. Ele ainda achou dois defeitos e corrigiu a geometria em vez de
declarar, que era o risco de projeto que mataria a porta.

O [atrito achado modelando](2026-09-07-atrito-achado-modelando.md) foi
**concluído e aprovado** em 2026-09-07. Modelar uma bicicleta de ponta a ponta
produziu oito atritos, e **nenhum deles aparecia em gate** — os dezenove estavam
verdes antes, durante e depois. Argumento fora do contrato passou a gritar em vez
de virar translação por zero; a paleta de auditoria caiu de 43 pares
confundíveis para 4 e passou a nomear os que sobram; busca que zera diz qual
palavra a zerou; e o retrato do acervo passou a varrer as quatro pastas de
receita, não duas.

O achado que mais rendeu não estava na lista: ligar a validação expôs três
silêncios nos **próprios testes do repositório** — `esfera` com `seg`, `plano`
com `larg`/`prof`, `cubo` com `tam`. Três testes verdes medindo geometria
diferente da que declaravam.

O [parâmetro que move a peça](2026-09-07-parametro-que-move-a-peca.md)
foi **concluído e aprovado** em 2026-09-07. Ele nasceu da pergunta "onde a IA
gasta tempo" e de uma medição que respondeu outra coisa: **dos 103 parâmetros
declarados no acervo, 13 estão vivos**. Dez das onze receitas trazem `PASSOS`
como literais fixos e `PARAMS` decorativo ao lado, e as três prensas somam trinta
e sete liberdades declaradas que não movem um vértice.

Ele deixou dois comandos. `npm run parametros` separa liberdade declarada de
liberdade real, e recusa diagnosticar receita que executa sem publicar parte, em
vez de chamar tudo de inerte. `npm run varrer` mede sensibilidade e lote sobre o
mesmo motor, com orçamento declarado, e termina com a linha de bancada que a
MEDIÇÃO escolheu — na cadeira, alterar a seção da perna não move a caixa das
pernas, move saias e travessas, e o palpite óbvio olharia no lugar errado.

A prova de campo condenou a primeira versão da própria ferramenta: o candidato
que zerava uma fresta de 14,14 mm abria quatro outras juntas, e o relatório só
contava interpenetração. Todo candidato passou a trazer quantas relações
pioraram. O A/B contra o fluxo desassistido fica pendente: quem o executar não
pode ser quem construiu a ferramenta.

A [esteira confiável para a IA](2026-09-07-esteira-confiavel-para-ia.md)
foi **concluída e aprovada** em 2026-09-07. Ela não tocou o motor, as receitas
nem a geometria: mudou o custo de descobrir que a forma está errada. Olhar uma
peça pelo nome saiu de 63 s de timeout mudo para 3,2 s com PNG; a suíte saiu de
cinco vermelhos por privilégio ausente para zero, e parou de trocar a peça
carregada na bancada; `npm run gates` passou a rodar os dezenove e relatar todos,
em vez de morrer no segundo; as 22 citações mortas do caminho de leitura viraram
zero, com gate no CI; a leitura obrigatória caiu de 119,8 KB para 69,8 KB sem
perder lição; e a saída de `descrever` encolheu 57% mantendo todo fato de
contato.

Ela também deixou o **diário da oficina** (`npm run diario`): as ferramentas do
laço registram sozinhas onde o tempo vai e o que emperra, sem pedir relato a
quem as usa. A primeira leitura apontou `olhar-bancada` como 96% do tempo do
laço — confirmar isso numa série longa é a próxima pergunta.

A rodada R00 dela fundiu dois planos de execução que já estavam prontos e não
mergeados: a melhoria da esteira de autoria para IA, que entregou o endereço
único de receita e a auto-ativação da sessão, e a modelagem da prensa hidráulica
H-frame. Os dois arquivos foram removidos em 2026-09-11: o da esteira porque
tudo que ele descreve está na `main`, e o da prensa porque a máquina não existe
no acervo e, se um dia existir, começa por uma rodada de alinhamento. Plano de execução não é
plano executivo datado, e declará-los como plano ativo reprovava `planos:check`.

A [malha otimizada e prova por objeto](2026-08-31-malha-otimizada-e-prova-por-objeto.md)
foi **encerrada** em 2026-09-01 com H0–H5 entregues e H6 parcial: três módulos de
saída de malha, o conferente único, o modo de auditoria visual e cinco peças no
acervo. Rastreio em [`../MALHA-OTIMIZADA-PROGRESSO.md`](../../historico/MALHA-OTIMIZADA-PROGRESSO.md).

O [laboratório computacional para investigação por
IA](2026-09-01-laboratorio-computacional-ia.md) foi incubado neste
repositório e **encerrado** em 2026-09-03: o subsistema `laboratorio/` saiu
inteiro, com histórico, para
[`warbookbr/nos-ciencia`](https://github.com/warbookbr/nos-ciencia). A
separação é sem conhecimento em nenhum sentido — este repositório não
referencia o laboratório, e o laboratório não importa o motor de receitas.
Quem quiser cruzar as duas coisas faz isso manualmente, citando versão e
commit do lado citado. O dossiê de desenho (`DOSSIE-LABORATORIO-IA.md`) e o
relato de progresso ficam como registro histórico.

A [reorganização da documentação por uso](2026-08-31-reorganizacao-por-uso.md)
foi **concluída e aprovada** em 2026-08-31. Ela separou a documentação por quem
a lê — [`usar/`](../../usar/README.md) para quem usa o Mecanifica, a raiz de
`docs/mecanifica/` para quem o desenvolve, `historico/` e `encerrados/` para o
que já fechou — e deixou cinco gates que impedem a separação de vazar de volta.
A porta de entrada caiu de 665 para 200 linhas. O relato por fase, com as
decisões tomadas e o que foi recusado por custo medido, está em
[`../REORGANIZACAO-POR-USO-PROGRESSO.md`](../../historico/REORGANIZACAO-POR-USO-PROGRESSO.md).

**Plano congelado:** o [modelador inverso com priors por
família](../congelados/2026-08-25-modelador-inverso-priors-familia.md) saiu do
caminho crítico em 2026-08-26, quando o usuário assumiu o julgamento de forma.
Não foi refutado; a pasta [`congelados/`](../congelados/README.md) explica a
diferença entre congelado, cancelado e concluído, e cada plano guardado lá
declara sua condição de descongelamento.

**Concluído e aprovado:**
[`2026-08-28-exportacao-cad-step.md`](2026-08-28-exportacao-cad-step.md) —
entregou os módulos puros `modulos/exportador-cad/` e `modulos/exportador-obj/`,
as CLIs `npm run exportar:step` e `npm run exportar:obj` com escrita atômica, e a
ativação da bancada por sessão (`npm run ativar:bancada`).

O plano anterior de seleção foi **cancelado** antes de implementação. A
premissa “a IA compara bem” não tinha passado pelo teste repetido e embaralhado
que o próprio plano reservava para S1; o gerador manual continuava definindo o
limite da forma alcançável; e o alvo N6 não contém calibração para representar
um objeto 3D exato. A hipótese permanece no histórico, sem autorização.

O mecanismo vigente é [modelagem inversa com priors por
família](../../DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md). Veículos partem de
arquétipos automotivos semanticamente alinhados e deformáveis; humanoides usam
esqueleto, volumes e juntas; peças usam features e interfaces funcionais. As
famílias compartilham receitas, identidade, montagem, revisão, câmeras,
evidência e MCP, não um gerador universal.

A primeira execução é **P0, confiança antes de geometria**: fechar a suíte no
Windows, classificar cada alvo, produzir um canário calibrado e medir o crítico
em pares frios, repetidos, embaralhados e com holdout. Priors, fitting,
preferência e novo carro só abrem pelos gates cumulativos escritos antes da
implementação. O registro de falhas em
[`GOTCHAS-AUTORIA-VISUAL.md`](../../usar/GOTCHAS-AUTORIA-VISUAL.md) é leitura
obrigatória antes de abrir experimento.

O [R2B com controle vertical](2026-08-23-redesenho-cage-r2b-controle-vertical.md)
foi concluído com decisão `interromper`: sua melhor evidência continuou
reprovada numérica e visualmente, e B2–B4 não prosseguem. Cage, métricas e
imagens permanecem como contraevidência; nada foi promovido.

A [auditoria das práticas de autoria 3D](2026-08-20-auditoria-praticas-autoria-3d.md)
foi concluída com decisão `corrigir`. Ela preserva a base semântica e congela
P2 e a validação integrada até uma prova privada ligar o aceite visual ao
fechamento e exercitar seções de caráter declaradas.

A [validação integrada do valor Agent-First](../2026-08-20-validacao-integrada-mecanifica.md)
está **congelada em `pronto` antes de R0**. O comparativo da trava pode ser
retomado somente depois que a auditoria decidir se sua premissa e suas métricas
continuam válidas.

O plano de [autonomia verificável do Motor de Prancha](../2026-08-20-motor-de-prancha-autonomia.md)
está **congelado em `pronto`**: R0–R3 foram aprovadas, R4 só prova autoria e
mutações, e impacto 3D permanece não demonstrado. R5 não executa; essa pergunta
foi transferida para a validação integrada.

O [P2 do chassi](../2026-08-19-chassi-p2-prova-do-quarto.md) está **congelado no
estado `pronto`**. Suas evidências e a decisão pendente sobre a alteração local
permanecem íntegras, mas Q7 não executa enquanto a confiabilidade da prancha —
alvo e fonte de julgamento da prova — estiver sob auditoria ativa.

A [coerência entre vistas](2026-08-19-coerencia-entre-vistas.md) foi concluída e
fecha o motor de prancha. Ela desfez um silenciamento indevido de teste — que
sozinho já acusou quatro rodas escapando da carroceria em planta — e passou a
comparar as vistas pelos eixos que compartilham, com leitura `projecao` ou
`secao` declarada. Essa conclusão é evidência histórica; não reabre P1, cage ou
geometria antes dos gates do novo P0.

O [motor de prancha com filete e medida](2026-08-19-motor-de-prancha-medida.md)
foi **concluído**. Ele trocou a spline por traçado com filete, adotou âncora
proporcional e passou a emitir relatório medido da própria saída. O ganho não é
estético: o relatório pegou sozinho um arco de roda furando o capô e dez
inversões de curvatura na silhueta do P0 que ninguém tinha visto. Método
registrado na skill `desenhar-prancha`.

**Plano histórico em rascunho:**
[`2026-08-18-chassi-realista-kernel-geometrico.md`](../2026-08-18-chassi-realista-kernel-geometrico.md).
Ele está em `rascunho` e não autoriza implementação. A representação então
decidida era malha de controle de quadriláteros com vincos,
avaliada por subdivisão Catmull-Clark nativa, com a malha densa como produto
compilado. OCCT/B-rep, Blender headless, SDF e kernel próprio foram rejeitados
naquele recorte. A prova do quarto, cage e `inflate` permanecem contraevidência;
nenhum deles é a próxima execução.

A [sonda da armadura humanoide tecnológica](2026-08-18-sonda-armadura-humanoide-1-0.md)
foi concluída com decisão `aprovar`. Ela testou hierarquia profunda,
bilateralidade, quiralidade, estados estáticos, contexto progressivo, crítica
visual estruturada e correções genéricas sem publicar geometria ou replicar
franquia. A evidência está em
[`../RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md`](../../historico/RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md).

A [sonda do supercarro](2026-08-18-sonda-supercarro-1-0.md) foi concluída com
decisão `aprovar`; a evidência está em
[`../RELATORIO-SONDA-SUPERCARRO-1-0.md`](../../historico/RELATORIO-SONDA-SUPERCARRO-1-0.md).

O [ensaio ponta a ponta da dobradiça](2026-08-18-ensaio-ponta-a-ponta-dobradica.md)
foi concluído com decisão `aprovar`; a evidência está em
[`../RELATORIO-ENSAIO-DOBRADICA-1-0.md`](../../historico/RELATORIO-ENSAIO-DOBRADICA-1-0.md).

O plano da plataforma procedural extensível foi concluído no R10 com decisão
`aprovar`; a evidência está em `../RELATORIO-PLATAFORMA-PROCEDURAL-R10.md`.

O plano concluído mais recente foi a [auditoria de interseções em montagens](2026-08-18-auditoria-intersecoes-montagem.md), aprovada após integrar malha, contenção, casos inconclusivos e MCP.

O plano de desacoplamento entre núcleo, validadores, fixtures e catálogo foi
concluído com catálogo vazio e rollout coordenado com `warbookbr/mecanica`.

**Plano concluído anterior à auditoria:**
[`2026-08-17-migracao-fps-para-procedural.md`](2026-08-17-migracao-fps-para-procedural.md).

Ele moveu a raiz canônica para `procedural/`, preservando
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
[`../RELATORIO-DIAGNOSTICO-MOTOR.md`](../../historico/RELATORIO-DIAGNOSTICO-MOTOR.md) e a
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
[`../PROTOCOLO-DIAGNOSTICO-MOTOR.md`](../../historico/PROTOCOLO-DIAGNOSTICO-MOTOR.md).

### Execução atual

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

### Resultado pós-estudo

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

### Concluídos


Os planos datados e o encerramento do plano mestre estão em
[`concluidos/`](../concluidos/). A tabela é um índice curto; os detalhes continuam
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
[`../RELATORIO-ANALISE-GRANDES-MELHORIAS.md`](../../historico/RELATORIO-ANALISE-GRANDES-MELHORIAS.md):
`furo` passou a expressar rasgo por `ate`, sem operação nova e sem família de
endereço nova. Costuras de `lathe` e endereço único de grupo linear continuam
abertas, sem abertura automática.

A [pose de criação](2026-08-17-pose-de-criacao.md) fechou o atrito A-4: os
geradores aceitam `em` e `eixo`, e o trio criar/rotacionar/transladar vira um
passo. O acervo gastava 128 dos 853 passos (15%) só em transporte.

Arquivos concluídos: [assentamento](../concluidos/2026-08-02-assentamento-anular.md),
[câmera](../concluidos/2026-08-02-camera-livre-reproduzivel.md), [canto](../concluidos/2026-08-02-canto-composto.md),
[concordância](../concluidos/2026-08-02-concordancia-por-ponto.md), [contagem](../concluidos/2026-08-02-contagem-por-desvio.md),
[contato](../concluidos/2026-08-02-contato-local-cilindrico.md), [encaixe](../concluidos/2026-08-02-estados-de-encaixe.md),
[identidade](../concluidos/2026-08-02-identidade-porta-estavel.md), [interfaces](../concluidos/2026-08-02-interfaces-de-encaixe.md),
[espelho](../concluidos/2026-08-02-portas-espelho-arranja.md), [pose derivada](../concluidos/2026-08-02-pose-derivada-roda.md),
[pose](../concluidos/2026-08-02-pose-em-referencial.md), [recusa](../concluidos/2026-08-02-recusa-estrutural-montagem.md),
[tolerâncias](../concluidos/2026-08-02-tolerancias-de-montagem.md), [triangulação](../concluidos/2026-08-02-triangulacao-de-furos.md),
[consulta](../concluidos/2026-08-03-consulta-subarvore-ia.md), [hierarquia](../concluidos/2026-08-03-hierarquia-semantica-minima.md),
[inspeção](../concluidos/2026-08-03-inspecao-reproduzivel-de-par.md), [seleção](../concluidos/2026-08-03-selecao-subarvore-semantica.md),
[encerramento](../concluidos/ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md),
[MCP Fatia 1A](../mcp/concluidos/01-fatia-1a-piloto-leitura.md),
[MCP Fatia 1B](2026-08-05-mcp-fatia-1b-visual.md),
[MCP avaliação consolidada](2026-08-05-mcp-avaliacao-consolidada.md),
[MCP correção de descoberta](2026-08-05-mcp-correcao-descoberta.md),
[MCP autoria controlada](2026-08-05-mcp-autoria-controlada.md) e
[diagnóstico do motor](2026-08-06-diagnostico-motor-procedural.md).

### Abertura em curso


Nenhuma. O P0 do [modelador inverso com priors por
família](../congelados/2026-08-25-modelador-inverso-priors-familia.md) foi
congelado junto com o plano que ele detalha, e a execução tarefa a tarefa está
ao lado dele, em
[`congelados/2026-08-25-modelador-inverso-priors-familia-p0.md`](../congelados/2026-08-25-modelador-inverso-priors-familia-p0.md).
Ele corrige a linha de base, qualifica alvo e calibra o avaliador; **não modela
carroceria**. Nenhuma tarefa dele foi executada, e as ferramentas que ele usaria
seguem em `tools/modelagem/`. N3–N6, seleção por linhas e os demais candidatos
permanecem como evidência histórica ou backlog, sem continuidade automática.
