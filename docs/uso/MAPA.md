# MAPA — inventário da Mecanifica, arquivo por arquivo

> **GERADO** por `npm run mapa` — não edite à mão. O resumo de cada arquivo
> mora no próprio arquivo (primeiro comentário; H1 nos `.md`); isto é a
> projeção. `npm run mapa:check` (CI) falha se isto estiver velho ou se
> algum arquivo-fonte estiver sem cabeçalho.

461 arquivos (código `.js .mjs .cjs .ts .tsx .html` + docs `.md`).

## (raiz)

- `AGENTS.md` — Mecanifica — instruções para agentes
- `CLAUDE.md` — Mecanifica — acordo de trabalho
- `README.md` — Mecanifica
- `bancada.html` — bancada.html — estúdio de inspeção multivista para autoria e validação de montagens.
- `vite.config.js` — vite.config.js — build estático da BANCADA de autoria, publicada em warbookbr/nos-mecanifica no GitHub Pages. O produto que o cliente abre vive em warbookbr/…
- `vitest.config.ts` — Config do Vitest: cobre os contratos da Mecanifica e os núcleos herdados em tools/**.

## .claude/agents/

- `game-builder.md` — Implementa mudanças delimitadas na Mecanifica, especialmente no núcleo procedural, receitas, bancada e validação, sempre provadas por medição. Use para um br…
- `revisor-adversarial.md` — Revisor adversarial por risco da Mecanifica — tenta quebrar mudanças de núcleo, formato salvo, autoria, montagem ou julgamento antes da integração. Use quand…

## .claude/skills/auditar-montagem/

- `SKILL.md` — Auditar uma montagem persistida da Mecanifica por contexto semântico, relações, impacto de revalidação e vistas visuais. Use quando a tarefa envolver composi…

## .claude/skills/auditar-peca/

- `SKILL.md` — Verificar uma peça da Mecanifica pelo fluxo atual de descrição, bancada neutra, revisão do pacote e gates do repositório.

## .claude/skills/criar-peca/

- `SKILL.md` — Criar ou refinar uma peça 3D procedural da Mecanifica como IA, escrevendo PASSOS e provando o resultado na bancada neutra com medidas, vistas e crítica objet…

## .claude/skills/criar-peca/references/

- `operacoes-procedurais.md` — Referência de operações procedurais

## autoria-assistida/experimentos/ab-fluxo-ia-dobradica/

- `README.md` — A/B do fluxo de modelagem por IA

## autoria-assistida/experimentos/ab-fluxo-ia-dobradica/cego/

- `RUBRICA.md` — Avaliação cega — dobradiça de portão
- `arbitro.md` — Arbitragem cega final — dobradiça de portão
- `avaliador-1.md` — Avaliação cega 1 — dobradiça de portão
- `avaliador-2.md` — Avaliação cega 2 — dobradiça de portão

## autoria-assistida/experimentos/ab-fluxo-ia-dobradica/fontes/

- `condicao-assistida.js` — PEÇA DE EXERCÍCIO — dobradiça vertical de portão para inspeção na bancada. Duas folhas de chapa compartilham o eixo Y: a folha fixa carrega o gomo central e …
- `condicao-crua.js` — DOBRADIÇA DE PORTÃO — conjunto procedural técnico-didático F2 para inspeção e montagem. Duas folhas retangulares de 1,20 m × 0,65 m × 35 mm encontram-se num …

## autoria-assistida/experimentos/autoria-geometrica-do-zero/

- `auditar-visual.mjs` — Captura duas vistas reais da fixture confinada, sem tocar na bancada publicada.
- `executar-estudo.mjs` — Executor reproduzível da fixture, sem publicar receitas no catálogo.
- `materializar-catalogo.mjs` — Materializa JSONs descartáveis para o catálogo MCP local do experimento.

## autoria-assistida/experimentos/autoria-geometrica-do-zero/receitas/

- `anel-tampa.js` — Experimento confinado — anel que assenta no suporte e referencia a folga.
- `eixo-guia.js` — Experimento confinado — eixo cujo comprimento provoca a falha direcional.
- `suporte-de-eixo.js` — Experimento confinado — suporte com alojamento, piloto e assento anular.

## autoria-assistida/experimentos/ensaio-ponta-a-ponta-dobradica/

- `auditar-visual.mjs` — Captura isolada e do conjunto; imagens ficam confinadas ao experimento.
- `carregar-estudo.mjs` — Adaptador privado que usa somente portas oficiais de autoria e leitura.
- `composicoes.js` — Subgrafos privados e paramétricos do ensaio 1.0.
- `executar-estudo.mjs` — Resumo causal e reproduzível da primeira sonda 1.0.

## autoria-assistida/experimentos/ensaio-ponta-a-ponta-dobradica/receitas/

- `folha-batente.js` — Receita privada: folha do batente com dois olhais.
- `folha-porta.js` — Receita privada: folha da porta com olhal central.
- `parafuso-central.js` — Receita privada: pino/parafuso passante, sem promessa de rosca helicoidal.

## autoria-assistida/experimentos/estudo-campo-conjunto-dianteiro/

- `README.md` — Estudo de campo — conjunto dianteiro mínimo
- `REGISTRO.md` — Registro de campo
- `executar-estudo.mjs` — Executa a montagem do estudo sem criar uma porta nova no produto.

## autoria-assistida/experimentos/estudo-campo-conjunto-dianteiro/receitas/

- `_estudo-aro-dianteiro.js` — ESTUDO DE CAMPO — aro simplificado, separado do pneu e do cubo para testar composição e relações entre peças independentes.
- `_estudo-cubo-dianteiro.js` — ESTUDO DE CAMPO — cubo escalonado e vazado do conjunto dianteiro mínimo. A peça prova perfil de revolução e três interfaces semânticas.
- `_estudo-disco-dianteiro.js` — ESTUDO DE CAMPO — disco anular simplificado. O raio externo será alterado na segunda rodada para testar propagação de impacto até a pinça.
- `_estudo-eixo-dianteiro.js` — ESTUDO DE CAMPO — eixo simples do conjunto dianteiro mínimo. Esta peça é evidência descartável de autoria e montagem; não é ativo automotivo.
- `_estudo-pinca-dianteira.js` — ESTUDO DE CAMPO — pinça em três volumes, suficiente para tornar visível a folga radial com o disco sem fingir um tipo de relação ainda inexistente.
- `_estudo-pneu-dianteiro.js` — ESTUDO DE CAMPO — pneu simplificado, uma peça separada do aro para provar assentamento anular e inspeção visual individual.

## autoria-assistida/experimentos/estudo-conjunto-dobradica/

- `REGISTRO.md` — Registro — estudo de autoria de um conjunto simples
- `auditar-visual.mjs` — auditar-visual.mjs — captura cada peça e o conjunto em vistas reproduzíveis.
- `carregar-estudo.mjs` — carregar-estudo.mjs — adaptador confinado das receitas para montagem resolvida.
- `executar-estudo.mjs` — executar-estudo.mjs — mede as três receitas e valida as relações da fixture.

## autoria-assistida/experimentos/estudo-conjunto-dobradica/receitas/

- `folha-fixa.js` — Experimento confinado — folha fixa de uma dobradiça didática.
- `folha-movel.js` — Experimento confinado — folha móvel de uma dobradiça didática.
- `pino-dobradica.js` — Experimento confinado — pino passante de uma dobradiça didática.

## autoria-assistida/experimentos/plataforma-procedural-r10/

- `auditar-visual.mjs` — Captura duas vistas de cada peça e do conjunto, sem usar a bancada publicada.
- `carregar-estudo.mjs` — Adaptador confinado do estudo R10. Nenhuma fixture entra no catálogo público.
- `composicoes.js` — Subgrafos privados do estudo R10. Não entram no catálogo de peças.
- `executar-estudo.mjs` — Resumo reproduzível do estudo privado R10.

## autoria-assistida/experimentos/plataforma-procedural-r10/receitas/

- `apoio-prismatico.js` — Família prismática, produzida por subgrafo declarativo privado.
- `nervura-triangular.js` — Família triangular, produzida pelo subgrafo que usa a extensão nativa.
- `pino-circular.js` — Família de revolução, executada pelo registro explícito completo da R10.

## autoria-assistida/experimentos/sonda-armadura-humanoide-1-0/

- `auditar-visual.mjs` — Capturas privadas por estado e alvo para crítica visual reexecutável.
- `carregar-estudo.mjs` — Adaptador privado: peças oficiais, montagens recursivas e poses derivadas.
- `executar-estudo.mjs` — Resumo mensurável de geometria, estados, contexto e auditoria estática.
- `perfil-autoria.js` — Perfil privado da sonda para orçamento e tolerância de autoria visual.

## autoria-assistida/experimentos/sonda-armadura-humanoide-1-0/familias/

- `intencao.js` — Vocabulário de intenção da sonda: comum nos eixos, específico na função.
- `mao.js` — Família privada: quiralidade é parâmetro explícito, não escala negativa.

## autoria-assistida/experimentos/sonda-armadura-humanoide-1-0/receitas/

- `abdomen.js` — Abdômen segmentado original: três lâminas articuláveis e faixa central emissiva.
- `antebraco.js` — Antebraço local com origem no cotovelo e mão abaixo em Y.
- `braco-superior.js` — Segmento superior local: origem na articulação do ombro, Y aponta para cima.
- `canela.js` — Segmento inferior local com origem no joelho.
- `capacete.js` — Cabeça modular original: casco facetado, visor contínuo e luz de leitura.
- `coxa.js` — Segmento femoral simétrico; origem na articulação do quadril.
- `junta-articulada.js` — Junta visual reutilizável em cotovelos e joelhos; eixo local X.
- `mao-direita.js` — Variante quiral direita da família privada de mãos blindadas.
- `mao-esquerda.js` — Variante quiral esquerda da família privada de mãos blindadas.
- `ombreira.js` — Casca de ombro simétrica; o lado pertence à instância, não à geometria.
- `pe.js` — Bota simplificada, com frente positiva em Z.
- `pelve.js` — Pelve blindada original: placas de quadril, proteção central e sinalização baixa.
- `torax.js` — Torso blindado original: envelope por loft, placas sobrepostas e núcleo luminoso.

## autoria-assistida/experimentos/sonda-armadura-humanoide-1-0/referencias/

- `README.md` — Referência visual privada

## autoria-assistida/experimentos/sonda-supercarro-1-0/

- `auditar-visual.mjs` — Capturas privadas, globais e isoladas, para crítica visual iterativa.
- `carregar-estudo.mjs` — Adaptador privado pelas portas oficiais de autoria, exportação e montagem.
- `composicoes.js` — Bloco privado reutilizável: volume facetado com identidade e aparência.
- `executar-estudo.mjs` — Resumo mensurável da sonda, sem depender da bancada publicada.
- `perfil-autoria.js` — Perfil privado da sonda para orçamento e tolerância de autoria visual.

## autoria-assistida/experimentos/sonda-supercarro-1-0/receitas/

- `aerodinamica.js` — Subconjunto externo com identidades separadas de splitter, difusor e asa.
- `aro.js` — Aro com anel e oito raios, uma definição reutilizada em quatro posições.
- `cabine.js` — Canópia contínua por loft, separável da carroceria e de baixo perfil.
- `carroceria.js` — Envelope principal por seções: x=largura, y=altura, z=frente positiva.
- `disco-freio.js` — Disco visível sem prometer sistema de freio interno funcional.
- `entrada-frontal.js` — Entrada de ar frontal compartilhada; volume visual, não duto funcional.
- `espelho.js` — Espelho externo facetado da sonda privada de supercarro.
- `farol.js` — Farol emissivo dianteiro da sonda privada de supercarro.
- `lanterna.js` — Lanterna emissiva traseira da sonda privada de supercarro.
- `painel-lateral.js` — Painel de entrada de ar lateral da sonda privada de supercarro.
- `pneu.js` — Pneu fechado de revolução, compartilhado pelas quatro rodas.
- `porta-lateral.js` — Porta externa facetada da sonda privada de supercarro.

## autoria-assistida/experimentos/sonda-supercarro-1-0/referencias/

- `README.md` — Referência visual privada

## autoria-assistida/guias/forma/

- `silhueta-e-transicoes.md` — Silhueta e transições

## autoria-assistida/guias/material/

- `leitura-de-material.md` — Leitura de material

## autoria-assistida/guias/processo/

- `evidencia-e-iteracao.md` — Evidência e iteração

## autoria-assistida/homologacoes/fluxo-ia-v2/caso-01-mancal/

- `relato-processo.md` — Relato de processo — Caso 01: mancal de mesa

## autoria-assistida/homologacoes/fluxo-ia-v2/caso-02-placa/

- `relato-processo.md` — Relato de processo — Caso 02: placa adaptadora

## docs/

- `oficina.md` — A Oficina — índice do design

## docs/historico/

- `DECISIONS-ARCHIVE.md` — Arquivo de Decisões — NÓS (D-01…D-54)
- `DECISIONS.md` — Registro de Decisões — NÓS
- `TETO.md` — O TETO — medir o que a Oficina de fato cria
- `diagnostico-subpartes-semanticas.md` — Diagnóstico — subpartes semânticas da moto
- `fase4-drone-inspecao-criacao-relatorio.md` — Relatório de criação — drone-inspecao
- `fase4-drone-inspecao-refino-relatorio.md` — Relatório de refinamento — drone-inspecao
- `fixture-identidade-apaga-relatorio.md` — Fixture — identidade estrutural ao apagar
- `fixture-identidade-cubo-relatorio.md` — Fixture — identidade estável de cubo
- `fixture-identidade-espelho-relatorio.md` — Fixture — identidade estrutural do espelho
- `fixture-identidade-estavel-relatorio.md` — Fixture — identidade estável de loft
- `oficina-projeto.md` — Oficina — o registro de projeto
- `playground.md` — O Playground — o épico da criação por IA
- `proveniencia-local-fixture.md` — Fixture de proveniência local de loft
- `teto-moto-refino-3-relatorio.md` — TETO — relatório da 3ª corrida de refino da moto
- `teto-moto-refino-relatorio.md` — TETO — relatório do REFINO da moto (2ª corrida)
- `teto-moto-relatorio.md` — TETO — relatório da moto
- `teto-selecao-semantica-relatorio.md` — TETO — medição da seleção semântica na moto
- `walkthrough_colaborador4.md` — Resumo de Alterações — Colaborador 4 (branch `colaborador4`)

## docs/mecanifica/

- `AGENT-FIRST.md` — Filtro Agent-First
- `ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md` — Análise — chassi realista e escolha de representação geométrica
- `ARQUITETURA.md` — Arquitetura atual
- `ATRITOS-AUTORIA.md` — Atritos de autoria — resumo atual
- `AUTORIA-IA.md` — Autoria assistida por IA
- `AUTORIA-RECEITA-DECLARATIVA.md` — Autoria de receita declarativa
- `BANCADA-E-APRESENTACAO.md` — Bancada e apresentação
- `BASELINE-MOTOR-R00.md` — Baseline do motor procedural — R00
- `COMPOSICAO-PROCEDURAL-V1.md` — Composição procedural v1
- `CONJUNTO-PROVA-AUTORIA-GEOMETRICA.md` — Conjunto de prova — autoria geométrica do zero
- `CONTEXTO-MONTAGEM-IA.md` — Contexto de montagem para IA
- `CONTEXTO-VISUAL-REVALIDACAO.md` — Contexto visual, revalidação e catálogo de montagem
- `CONTINUIDADE-ARQUITETURAL.md` — Continuidade arquitetural da Mecanifica
- `COORDENACAO-LOCAL.md` — Coordenação local entre agentes
- `COORDENACAO-REPOS.md` — Coordenação entre os repositórios Mecanifica
- `ESCRITA-TRANSACIONAL-MONTAGEM.md` — Escrita transacional de montagem
- `EXTENSOES-NATIVAS-V1.md` — Extensões nativas v1
- `FILETE-V2.md` — Filete v2 — Escopos A e B implementados
- `FLUXO-MODELAGEM-IA.md` — Fluxo de modelagem assistida por IA v4
- `HOMOLOGACAO-FLUXO-IA.md` — Homologação do fluxo de IA
- `INDEX.md` — Mecanifica — entrada atual
- `INTENCAO-PECA-V1.md` — Intenção semântica opcional de peça — v1
- `LACUNAS-DE-CAPACIDADE-V1.md` — Lacunas de capacidade v1
- `MAPA-CANONICO-DEPENDENCIAS.md` — Mapa canônico de dependências
- `MATRIZ-TESTES-ACOPLADOS.md` — Matriz de testes acoplados ao acervo
- `MONTAGEM-PERSISTIDA-V1.md` — Montagem persistida v1
- `MONTAGEM-PERSISTIDA-V2.md` — Montagem persistida v2
- `MONTAGEM-PERSISTIDA-V3.md` — Montagem persistida v3 e impacto local
- `MONTAGEM-PERSISTIDA-V4.md` — Montagem persistida v4 e expectativas de interseção
- `MONTAGENS-SEMANTICAS.md` — Montagens semânticas
- `PERFIS-DE-AUTORIA.md` — Perfis de autoria
- `PLANO.md` — Plano mestre da Mecanifica — aposentado
- `PRANCHA-FREIO-DISCO.md` — Prancha de referência — freio a disco dianteiro
- `PRANCHA-RODA-DIANTEIRA.md` — Prancha de referência — roda dianteira
- `PROTOCOLO-DIAGNOSTICO-MOTOR.md` — Protocolo detalhado — diagnóstico do motor procedural
- `REFERENCIA-E-CRITICA-VISUAL.md` — Referência e crítica visual — protocolo de modelagem
- `RELATORIO-ANALISE-GRANDES-MELHORIAS.md` — Análise — estado e grandes melhorias
- `RELATORIO-DIAGNOSTICO-MOTOR.md` — Relatório — diagnóstico do motor procedural
- `RELATORIO-ENSAIO-DOBRADICA-1-0.md` — Relatório — ensaio ponta a ponta da dobradiça 1.0
- `RELATORIO-ESTUDO-CAMPO-CONJUNTO-DIANTEIRO.md` — Relatório — estudo de campo do conjunto dianteiro
- `RELATORIO-EXPERIMENTO-AUTORIA-GEOMETRICA.md` — Relatório — experimento de autoria geométrica do zero
- `RELATORIO-PLATAFORMA-PROCEDURAL-R10.md` — Relatório R10 — plataforma procedural
- `RELATORIO-R05-REVALIDACAO-CAMPO.md` — Relatório R05 — estudo de campo da revalidação persistida
- `RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md` — Relatório da sonda — armadura humanoide tecnológica 1.0
- `RELATORIO-SONDA-SUPERCARRO-1-0.md` — Relatório da sonda de escala — supercarro exterior 1.0
- `SERVICOS-PROCEDURAL-V1.md` — Serviços procedurais v1
- `UPSTREAM-NOS.md` — Capacidades candidatas ao NÓS
- `VISAO.md` — Visão da Mecanifica

## docs/mecanifica/gerado/

- `CATALOGO-CAPACIDADES.md` — Catálogo de capacidades procedural
- `INDEX.md` — Artefatos gerados do catálogo procedural

## docs/mecanifica/historico/

- `EXPERIMENTO-AB-FLUXO-IA.md` — Experimento A/B — o fluxo ajuda a IA a modelar?
- `EXPERIMENTO-RODA-REALISTA.md` — Experimento de autoria — roda realista
- `OFICINA-OTIMIZACOES.md` — Otimizações da Oficina para autoria por IA
- `README.md` — Histórico da Mecanifica
- `RELATO-RODA-REALISTA.md` — Relato do experimento — roda realista
- `RELATORIO-PONTE-THREE.md` — Relatório da ponte Three.js

## docs/mecanifica/planos/

- `2026-08-04-mcp-para-agentes.md` — MCP para agentes — reduzir contexto sem perder rastreabilidade
- `2026-08-05-mcp-autoria-controlada.md` — MCP — autoria controlada de pacotes
- `2026-08-05-mcp-avaliacao-consolidada.md` — MCP — avaliação consolidada por agente consumidor
- `2026-08-05-mcp-correcao-descoberta.md` — MCP — correção de descoberta de pacotes e revisões
- `2026-08-05-mcp-fatia-1b-visual.md` — MCP — Fatia 1B visual somente leitura
- `2026-08-06-diagnostico-motor-procedural.md` — Diagnóstico do motor procedural atual
- `2026-08-07-montagem-minima-persistida-v1.md` — Montagem Mínima Persistida v1
- `2026-08-09-montagem-persistida-v2-relacoes-locais.md` — Montagem Persistida v2 — Relações Locais
- `2026-08-14-autoria-segura-receitas.md` — Autoria segura de receitas declarativas
- `2026-08-14-contexto-de-montagem-para-ia.md` — Contexto de montagem persistida para IA
- `2026-08-14-contexto-visual-e-autoria-segura.md` — Contexto visual e autoria segura de montagem
- `2026-08-14-continuidade-autoria-ativa.md` — Continuidade de autoria ativa
- `2026-08-14-experimento-autoria-geometrica.md` — Experimento de autoria geométrica do zero
- `2026-08-14-mapa-canonico-dependencias.md` — Mapa canônico de dependências v1
- `2026-08-14-materializacao-autoria-segura.md` — Materialização e autoria segura de montagens
- `2026-08-14-mcp-montagens-leitura.md` — MCP — leitura e auditoria de montagens
- `2026-08-14-revalidacao-cascata-persistida.md` — Revalidação em cascata persistida v1
- `2026-08-14-separacao-direcional-e-impacto-local.md` — Separação direcional e impacto local de montagem
- `2026-08-17-abertura-oblonga.md` — Abertura oblonga — rasgo como forma de primeira classe
- `2026-08-17-alteracao-compacta.md` — Alteração semântica compacta de montagem
- `2026-08-17-correcoes-fluxo-dobradica.md` — Correções do fluxo encontradas no estudo de dobradiça
- `2026-08-17-desacoplamento-catalogo-validacao.md` — Independência entre núcleo, validação e catálogo
- `2026-08-17-encostar.md` — Encostar — contato derivado no lugar de coordenada digitada
- `2026-08-17-estudo-conjunto-dobradica.md` — Estudo de campo — autoria de um conjunto simples de três peças
- `2026-08-17-historico-de-revisao.md` — Histórico de revisão — olhar para trás e voltar
- `2026-08-17-lathe-fechado.md` — Perfil fechado no `lathe` — e a limpeza da lista de pendências
- `2026-08-17-migracao-fps-para-procedural.md` — Migração estrutural de `fps` para `procedural`
- `2026-08-17-nome-de-copia.md` — Nome de cópia no `arranja` — endereço de autor para o grupo linear
- `2026-08-17-ponto-nomeado.md` — Ponto nomeado — e a revisão dos atritos vizinhos
- `2026-08-17-pose-de-criacao.md` — Pose de criação — `em` e `eixo` nos geradores
- `2026-08-18-auditoria-intersecoes-montagem.md` — Auditoria de interseções em montagens
- `2026-08-18-chassi-realista-kernel-geometrico.md` — Chassi realista — representação de superfície para carroceria
- `2026-08-18-ensaio-ponta-a-ponta-dobradica.md` — Ensaio ponta a ponta — dobradiça de porta
- `2026-08-18-plataforma-procedural-extensivel.md` — Plataforma procedural extensível e descobrível
- `2026-08-18-sonda-armadura-humanoide-1-0.md` — Sonda de sistema — armadura humanoide tecnológica 1.0
- `2026-08-18-sonda-supercarro-1-0.md` — Sonda de escala — supercarro exterior 1.0
- `BACKLOG.md` — Backlog aberto
- `MODELO.md` — [ID] — resultado curto
- `README.md` — Planos da Mecanifica

## docs/mecanifica/planos/concluidos/

- `2026-08-02-assentamento-anular.md` — AUT-2026-11 — assentamento anular declarado
- `2026-08-02-camera-livre-reproduzivel.md` — AUT-2026-05 — câmera livre reproduzível
- `2026-08-02-canto-composto.md` — AUT-2026-04 — canto composto de aresta arredondada
- `2026-08-02-concordancia-por-ponto.md` — AUT-2026-02 — discretização por concordância
- `2026-08-02-contagem-por-desvio.md` — AUT-2026-01 — contagem circular por desvio
- `2026-08-02-contato-local-cilindrico.md` — AUT-2026-10 — contato local cilíndrico e alerta global
- `2026-08-02-estados-de-encaixe.md` — AUT-2026-09 — estados explicáveis de encaixe cilíndrico
- `2026-08-02-identidade-porta-estavel.md` — AUT-2026-14 — identidade estável de porta
- `2026-08-02-interfaces-de-encaixe.md` — AUT-2026-06 — interfaces mensuráveis de encaixe
- `2026-08-02-portas-espelho-arranja.md` — AUT-2026-15 — portas sob espelho e arranja
- `2026-08-02-pose-derivada-roda.md` — AUT-2026-07 — pose derivada de um encaixe cilíndrico
- `2026-08-02-pose-em-referencial.md` — AUT-2026-08 — pose de encaixe em referencial transformado
- `2026-08-02-recusa-estrutural-montagem.md` — AUT-2026-13 — recusa estrutural de montagem
- `2026-08-02-tolerancias-de-montagem.md` — AUT-2026-12 — tolerâncias de montagem explícitas
- `2026-08-02-triangulacao-de-furos.md` — AUT-2026-03 — triangulação robusta de vários furos
- `2026-08-03-consulta-subarvore-ia.md` — AUT-2026-18 — consulta de subárvore para IA
- `2026-08-03-hierarquia-semantica-minima.md` — AUT-2026-16 — hierarquia semântica mínima de partes
- `2026-08-03-inspecao-reproduzivel-de-par.md` — AUT-2026-19 — inspeção reproduzível de par
- `2026-08-03-selecao-subarvore-semantica.md` — AUT-2026-17 — seleção de subárvore semântica
- `ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md` — Encerramento do plano mestre — 2 de agosto de 2026

## docs/mecanifica/planos/mcp/

- `INDEX.md` — Programa MCP — índice de planos

## docs/mecanifica/planos/mcp/concluidos/

- `01-fatia-1a-piloto-leitura.md` — MCP — encerramento da Fatia 1A somente leitura

## docs/rumo/

- `NORTE.md` — NORTE — objetivo e método do NÓS
- `PLANO.md` — PLANO — evolução da linguagem de criação do NÓS
- `arquitetura-identidade-estavel.md` — Arquitetura — identidade estável de objetos e subpartes
- `oficina-roteiro.md` — Oficina — o que ainda não existe

## docs/uso/

- `RECURSOS.md` — Recursos e portas de entrada
- `oficina-contrato.md` — Oficina — contrato procedural preservado
- `oficina-referencia.md` — Oficina — aviso de compatibilidade

## prototipos/procedural/v3/

- `README.md` — v3 — núcleo procedural, peças e visor
- `visor.html` — visor.html — visor de peças da OFICINA (D-55): abre qualquer peça de pecas/ isolada no ambiente padrão (?peca=nome).

## prototipos/procedural/v3/extensoes/prisma-triangular/

- `fixture.js` — fixture.js — receita sintética da extensão, sem publicação de peça.
- `implementacao.js` — implementacao.js — recebe somente emissor transacional e resolução numérica.
- `manifesto.js` — manifesto.js — contrato versionado da extensão neutra de prova.

## prototipos/procedural/v3/motor/

- `adaptador.js` — adaptador.js — projeção visual do neutro; não conhece receitas nem execução.
- `animacao.js` — animacao.js — animação rígida e skinning sobre lotes já adaptados.
- `artefatos.js` — artefatos.js — contrato neutro e procedência determinística da execução procedural.
- `catalogo.js` — catálogo.js — projeções puras e determinísticas do registro de operações. Não executa receita, não lê arquivos e não conhece visor, MCP ou domínio.
- `composicoes.js` — composicoes.js — subgrafos procedurais declarativos, sem estado global ou I/O.
- `executor.js` — executor.js — orquestra núcleo, adaptador e animação sem duplicar execução.
- `expressoes.js` — expressoes.js — aritmética determinística e fechada para parâmetros da Oficina. A expressão só existe em um campo numérico e sempre começa com `=`. Ela aceit…
- `extensoes.js` — extensoes.js — SDK nativo: manifesta, limita e combina extensões sem estado global.
- `geo.js` — helpers de GEOMETRIA do motor v3 (D-55): malha = lista chata de vértices (pos xyz, uv, normal) — 8 floats por vértice, triângulos soltos.
- `lacunas.js` — lacunas.js — diagnóstico e planejamento estrutural puros sobre o catálogo. Não executa receita, não grava disco e não decide promoção de capacidade.
- `mat4.js` — mat4 mínimo do motor v3 (D-55) — colunas-major, como o WebGL espera
- `nucleo.js` — nucleo.js — implementação única da OFICINA procedural (passo 1). Executa a lista de PASSOS de uma peça-objeto e devolve o objeto pronto pro visor. Duas camad…
- `oficina.js` — oficina.js — fachada pública compatível do motor procedural. A implementação é separada por responsabilidade; esta entrada preserva o contrato usado por rece…
- `referencia-posicional.js` — referencia-posicional.js — A REGRA ÚNICA de "isto é referência por id posicional?", para o formato salvo da Oficina.
- `registro.js` — registro.js — configuração explícita, determinística e sem estado global de operações.
- `render.js` — O VISOR do motor v3 (D-55) — o ambiente PADRÃO onde toda peça é criada e auditada: framebuffer fixo (?res) com upscale NEAREST (pixel art, custo independente…
- `sha256.js` — sha256.js — SHA-256 síncrono, portátil e sem dependência de Node.
- `tex.js` — helpers de TEXTURA do motor v3 (D-55) — paleta Resurrect64, ruído, dither e o gerador de canvas. Uma peça pode devolver índice da paleta OU [r,g,b] direto (m…
- `uso-operacoes.js` — uso-operacoes.js — contratos Agent-First executáveis das operações nativas. A tabela descreve como chamar a capacidade; o executor continua decidindo a geome…

## prototipos/procedural/v3/motor/operacoes/

- `atributos.js` — atributos.js — operações do grupo, isoladas por serviços explícitos do núcleo.
- `edicao-direta.js` — edicao-direta.js — edições locais por identidade, via serviços explícitos do núcleo.
- `estruturais.js` — estruturais.js — operações do grupo, isoladas por serviços explícitos do núcleo.
- `geradores-avancados.js` — geradores-avancados.js — operações do grupo, isoladas por serviços explícitos do núcleo.
- `primitivas-basicas.js` — primitivas-basicas.js — geradores fundamentais registrados pelo núcleo, sem estado global.
- `primitivas-superficie.js` — primitivas-superficie.js — primitivas fechadas que recebem serviços explícitos do núcleo.
- `transformacoes.js` — transformacoes.js — operações do grupo, isoladas por serviços explícitos do núcleo.

## prototipos/procedural/v3/servicos/

- `descoberta.js` — descoberta.js — porta neutra de descoberta procedural; sem I/O, MCP ou visor.

## src/autoria/

- `adaptar-montagem-three.js` — adaptar-montagem-three.js — projeta uma montagem resolvida em cena Three.js.
- `adaptar-three.js` — adaptar-three.js — adaptador neutro do núcleo da Oficina para Three.js; não altera o formato persistido.
- `alterar-montagem.js` — alterar-montagem.js — alteração semântica compacta de montagem persistida.
- `assinatura-geometria.js` — Compatibilidade da autoria: a implementação portátil vive junto ao núcleo.
- `auditar-intersecoes-montagem.js` — auditoria de interseções de montagem — serviço neutro, sem Three.js.
- `consultar-impacto-global.js` — consultar-impacto-global.js — consulta direcionada sobre o mapa v1.
- `derivar-catalogo-montagens.js` — derivar-catalogo-montagens.js — índice determinístico limitado às raízes dadas.
- `derivar-impacto-montagem.js` — derivar-impacto-montagem.js — deriva dependências locais sem executar revalidação.
- `derivar-mapa-dependencias.js` — derivar-mapa-dependencias.js — mapa global derivado de um snapshot estável.
- `derivar-roteiro-revalidacao.js` — derivar-roteiro-revalidacao.js — transforma impacto local em ações explícitas.
- `descrever-montagem-resolvida.js` — descrever-montagem-resolvida.js — projeta a árvore interna em contexto JSON para IA.
- `descrever-partes.js` — descrever-partes.js — mede uma peça da Oficina POR NOME de parte, sem Three.js: caixa alinhada aos eixos, centro, dimensões e faces de cada parte, e a folga …
- `executar-receita.js` — executar-receita.js — fronteira pura para executar uma receita já carregada.
- `hierarquia-partes.js` — hierarquia-partes.js — consultas puras e determinísticas da árvore semântica. Não conhece Three.js, geometria ou domínio mecânico.
- `intencao-peca.js` — intencao-peca.js — contrato opcional, semântico e neutro de uma receita.
- `interfaces-montagem.js` — interfaces-montagem.js — resolve portas declaradas por peças, mede relações cilíndricas/anulares e deriva uma prévia cilíndrica sem Three.js, hierarquia ou s…
- `ler-montagem-persistida.js` — ler-montagem-persistida.js — leitor/validador fail-closed da montagem v1/v2/v3.
- `ler-peca-resolvida.js` — ler-peca-resolvida.js — a metade LEITORA do formato `mecanifica.peca-resolvida`.
- `ler-universo-autoria.js` — ler-universo-autoria.js — contrato e prova estrutural do universo v1.
- `protocolo-revalidacao.js` — protocolo-revalidacao.js — contrato puro da R00, sem persistência ou efeitos.
- `resolver-montagem-persistida.js` — resolver-montagem-persistida.js — resolve instâncias de peças sem acesso a arquivo.
- `separacao-direcional.js` — separacao-direcional.js — mede intervalos projetados sem alegar colisão geral.
- `snapshot-universo-autoria.js` — snapshot-universo-autoria.js — leitura consistente do universo de autoria.
- `transformacao-rigida.js` — transformacao-rigida.js — contrato neutro de transformações rígidas.

## src/bancada/

- `carregar-peca.js` — carregar-peca.js — resolve somente uma entrada explícita do catálogo.
- `catalogo-pecas.js` — catalogo-pecas.js — contrato explícito da lista que uma aplicação pode publicar. O catálogo é dado de aplicação; o núcleo e os validadores recebem receitas d…
- `controlar-partes.js` — controlar-partes.js — seleção múltipla, contexto fantasma, isolamento e explosão visual.
- `criar-ambiente.js` — criar-ambiente.js — estúdio neutro, câmeras previsíveis e enquadramento da bancada.
- `criar-selecao.js` — criar-selecao.js — raycast da bancada com seleção múltipla e foco por duplo clique.
- `entrada.js` — entrada.js — única entrada publicada da bancada; a aplicação não escolhe peça padrão e usa o catálogo homologado explícito, que hoje está vazio. /
- `estado-bancada.js` — estado-bancada.js — estado headless e determinístico da bancada de inspeção.
- `main.js` — main.js — composição da bancada: fixture procedural, estúdio, inspeção e estado reproduzível.

## tools/

- `README.md` — tools/ — ferramentas da Mecanifica e do núcleo herdado

## tools/arquitetura/

- `independencia-catalogo.mjs` — independencia-catalogo.mjs — firewall pequeno entre o núcleo, a autoria pura e as portas que resolvem arquivos. Importar uma peça pelo caminho é permitido no…
- `mapear-motor-procedural.mjs` — Mapa estático da fachada procedural. É uma evidência de arquitetura: não é importado pelo motor e não participa da execução de receitas.
- `mapear-motor-procedural.test.mjs` — Guarda que o mapa R00 continue descrevendo a fachada procedural real.

## tools/bancadas/

- `criar-aliases.test.mjs` — criar-aliases.test.mjs — impede que a bancada criar volte a diagnosticar como órfã uma peça válida por esquecer o sexto campo do envelope: ALIASES.
- `criar.mjs` — criar.mjs — P7 do playground (D-120): A CAMADA IA, laço único.
- `estado-peca.mjs` — estado-peca.mjs — executa o envelope completo de uma peça procedural para que bancadas distintas não percam MATERIAIS, ESQUELETO ou ALIASES.
- `executar.mjs` — executar.mjs — a bancada do REPLAY da OFICINA (passo 1), sem browser. Roda a lista de PASSOS de uma peça, serializa a lista, re-parseia e re-executa, e afirm…
- `gabarito-selecao-lib.mjs` — gabarito-selecao-lib.mjs — regras puras da Prova Zero: compara o acervo atual ao gabarito gravado e permite declarar SOMENTE peças novas nomeadas.
- `gabarito-selecao-lib.test.mjs` — gabarito-selecao-lib.test.mjs — protege a exceção estreita para peça nova: `--novas` aceita presença nova, mas nunca esconde hash, remoção ou erro de nome.
- `gabarito.mjs` — gabarito.mjs — P5 do playground (D-118): FORMA COMO NÚMERO. Mede a silhueta RENDERIZADA de uma peça contra um CONTORNO de referência (o gabarito, desenhado à…
- `harness-entry.js` — harness-entry.js — catálogo privado dos gates visuais. Este módulo só é carregado por harness.html; não participa da entrada publicada da bancada. /
- `harness.html` — harness.html — bancada privada dos gates; nunca é entrada de Pages.
- `olhar-peca.mjs` — olhar-peca.mjs — o olho da OFICINA (D-55).
- `porteiro.mjs` — porteiro.mjs — GATE explícito de render do harness privado. Ele não descobre nem publica o acervo de `pecas/`: a lista abaixo é a seleção de capacidades que …
- `skill-criar-peca.test.ts` — skill-criar-peca.test.ts — a skill de autoria é MEDIDA contra o núcleo, não revisada no olho. Duas afirmações da `.claude/skills/criar-peca/SKILL.md` custam …
- `visor-imports.test.mjs` — Prova a resolução de imports bare no visor legado servido sem transformação.

## tools/bancadas/bench/

- `gabarito-nucleo.mjs` — gabarito-nucleo.mjs — P5 do playground (docs/historico/playground.md): FORMA COMO NÚMERO. Lógica PURA (sem Playwright/browser — unit-testável) por trás da ba…
- `gabarito-nucleo.test.ts` — Vitest do NÚCLEO PURO da bancada de gabarito (P5 do playground, D-118): máscara por diferença de fundo (+ o corte do HUD), filtro de componente pequeno (o pi…
- `pngstats.mjs` — pngstats.mjs — decodifica um PNG (8-bit, colortype 2/6) via zlib. Sem dependência externa. `decodePng` devolve os pixels CRUS (usado pelo porteiro via `pngSt…
- `pngwrite.mjs` — pngwrite.mjs — codifica um buffer RGB em PNG (8-bit, colortype 2), sem dependência externa (par do decodePng em pngstats.mjs). Usado pela bancada de gabarito…

## tools/bancadas/fixtures/

- `catalogo-visual.js` — catalogo-visual.js — fixtures mínimas do harness privado.

## tools/catalogo/

- `gerar-catalogo-capacidades.mjs` — Gera projeções publicáveis. O motor permanece puro; somente esta borda lê e escreve disco.

## tools/coordenacao/

- `coord.mjs` — coord.mjs — caixa postal local, econômica e sem dependências para coordenar agentes em repositórios diferentes sem carregar histórico ou diffs inteiros.
- `coord.test.mjs` — coord.test.mjs — prova mensagens imutáveis, leitura econômica, confirmações independentes e bloqueio de reservas sobrepostas do canal entre agentes.

## tools/mapa/

- `links.mjs` — links.mjs — o gate de referência: varre todo arquivo rastreado por menções a `docs/<...>.md` (caminho com barra, não prosa solta) e reprova quando o caminho …
- `mapa.mjs` — mapa.mjs — gera docs/uso/MAPA.md: o inventário do repositório com o resumo de cada arquivo. O resumo NÃO mora aqui: mora no PRÓPRIO arquivo (primeiro comentá…
- `planos.mjs` — planos.mjs — impede que o planejamento volte a ter mais de um plano ativo ou que um plano executivo ultrapasse o limite curto acordado.
- `planos.test.mjs` — planos.test.mjs — prova que o gate recusa plano grande, estados inválidos, índice divergente e mais de um plano ativo.
- `toc.mjs` — toc.mjs — gera o índice (sumário) de um doc ENTRE os marcadores <!-- TOC --> e <!-- /TOC -->, a partir dos títulos `##` dele. Mesma filosofia do mapa: o índi…

## tools/mcp/

- `catalogo-montagens.mjs` — catalogo-montagens.mjs — acesso MCP somente a raízes configuradas pelo host.
- `catalogo-montagens.test.mjs` — catalogo-montagens.test.mjs — confinamento e descoberta explícita do catálogo MCP.
- `contratos.mjs` — contratos.mjs — schemas e respostas públicas do perfil MCP somente leitura.
- `ensaio-ponta-a-ponta.test.mjs` — ensaio-ponta-a-ponta.test.mjs — três peças privadas exercitando o MCP real.
- `mcp.test.mjs` — mcp.test.mjs — contrato real de stdio, catálogo, recursos e ferramentas MCP.
- `procedural.test.mjs` — procedural.test.mjs — R09: serviço puro e consumo MCP externo usam a mesma lógica.
- `servidor.mjs` — servidor.mjs — servidor MCP local stdio com revisão e autoria opt-in.
- `universo-dependencias.mjs` — universo-dependencias.mjs — universo canônico confiável para leitura MCP.
- `universo-dependencias.test.mjs` — universo-dependencias.test.mjs — provas do adaptador MCP do mapa global.

## tools/mcp/fixtures/ensaio-ponta-a-ponta/receitas/

- `pino-guia.mjs` — Receita procedural privada do pino usado no ensaio MCP.
- `placa-base.mjs` — Receita procedural privada da placa base usada no ensaio MCP.
- `suporte-portas.mjs` — Receita procedural privada do suporte usado no ensaio MCP.

## tools/mcp/perfis/

- `autoria-montagens.mjs` — autoria-montagens.mjs — porta MCP opt-in, fina sobre a autoria interna.
- `autoria-montagens.test.mjs` — Provas R04: MCP de autoria só atua com escopo do host e sem paths públicos.
- `autoria-receitas.mjs` — autoria-receitas.mjs — porta MCP fina para receitas declarativas.
- `autoria-receitas.test.mjs` — Contrato fino da porta MCP de autoria declarativa.
- `impacto-global.mjs` — impacto-global.mjs — adaptador MCP reduzido sobre o mapa canônico.
- `montagens.mjs` — montagens.mjs — adaptador MCP fino para leitura e auditoria de montagens.
- `procedural.mjs` — procedural.mjs — adaptador MCP fino sobre o serviço puro de descoberta.
- `revalidacao.mjs` — revalidacao.mjs — porta MCP Agent-First sobre campanhas persistidas.
- `revalidacao.test.mjs` — Prova R04: consumidor caixa-preta, nova sessão e escrita segura por IDs.
- `revisao.mjs` — revisao.mjs — adaptador MCP fino para os serviços existentes de modelagem.

## tools/mecanifica/

- `adaptar-montagem-three.test.ts` — Prova que a visualização de montagem deriva somente da árvore resolvida.
- `adaptar-three.test.ts` — adaptar-three.test.ts — prova headless da fronteira entre o núcleo procedural herdado e Three.js.
- `alterar-montagem.test.ts` — alterar-montagem.test.ts — alteração semântica compacta de montagem.
- `argumentos.mjs` — argumentos.mjs — leitura de linha de comando dos CLIs da Mecanifica, com a MESMA lei que o núcleo de autoria aplica a uma referência: bandeira desconhecida, …
- `argumentos.test.ts` — Contratos mínimos do parser compartilhado e recusas pré-navegador.
- `auditar-intersecoes-montagem.test.ts` — @ts-expect-error — serviço neutro JavaScript exercitado pelo contrato público.
- `autoria-ativa.mjs` — autoria-ativa.mjs — provedores neutros para revisões imutáveis ativas.
- `autoria-ativa.test.mjs` — autoria-ativa.test.mjs — continuidade autorizada e falha fechada.
- `autoria-montagem.mjs` — autoria-montagem.mjs — planejamento e aplicação interna de montagens v1/v2/v3.
- `autoria-montagem.test.ts` — Provas R02: planejar, confirmar, validar e materializar montagem persistida.
- `autoria-receita.mjs` — autoria-receita.mjs — autoria declarativa de receitas, sem avaliar JavaScript.
- `autoria-receita.test.ts` — Provas da autoria declarativa de receita sem JavaScript do agente.
- `caminho-confinado.mjs` — caminho-confinado.mjs — guarda de escrita para artefatos que um CLI aceita por caminho. A checagem lexical sozinha não basta: um diretório relativo pode cont…
- `caminho-confinado.test.ts` — caminho-confinado.test.ts — prova do confinamento sem precisar criar links.
- `caminho-procedural.test.ts` — caminho-procedural.test.ts — a raiz da Oficina é neutra e não volta a fps.
- `capturar-montagem.mjs` — capturar-montagem.mjs — serviço importável de vistas de montagem em memória.
- `capturar-montagem.test.ts` — @ts-expect-error — resolvedor JavaScript público, exercitado pelo contrato.
- `catalogo-pecas.test.ts` — catalogo-pecas.test.ts — catálogo vazio é estado válido; IDs e carregadores continuam sendo contratos explícitos quando uma peça voltar a ser publicada. /
- `contexto-montagem-estudo.test.ts` — Repete R001/R002 no descritor de contexto e mede a economia Agent-First.
- `derivar-campanha-revalidacao.mjs` — derivar-campanha-revalidacao.mjs — ponte R02 entre impacto global e R01.
- `derivar-campanha-revalidacao.test.ts` — Provas R02: compartilhamento, múltiplas raízes, isolamento e persistência.
- `derivar-catalogo-montagens.test.ts` — Prova catálogo global confinado às raízes explicitamente resolvidas.
- `derivar-impacto-montagem.test.ts` — Prova mapa de impacto local, direto, indireto e determinístico.
- `derivar-roteiro-revalidacao.test.ts` — Prova roteiro de revalidação assistida, sem correção ou veredito global.
- `descrever-montagem-persistida.mjs` — descrever-montagem-persistida.mjs — CLI confinada do contexto JSON para IA.
- `descrever-montagem-persistida.test.ts` — Prova a CLI confinada que descreve montagem persistida arbitrária em JSON.
- `descrever-montagem.mjs` — descrever-montagem.mjs — lê uma montagem piloto e imprime o diagnóstico declarativo do encaixe. Não abre renderizador, não aplica pose e não conhece automóve…
- `descrever-partes.test.ts` — Contrato de medição headless exercitado por fixtures de capacidade. O catálogo publicado pode estar vazio; a régua recebe um módulo explícito.
- `descrever-peca.mjs` — descrever-peca.mjs — serviço headless de medição e sua CLI fina.
- `encostar.test.ts` — encostar.test.ts — contato derivado no lugar de coordenada digitada (A-6).
- `enquadramento-bancada.test.ts` — enquadramento-bancada.test.ts — prova pura do gate visual da bancada.
- `estado-bancada.test.ts` — estado-bancada.test.ts — contrato headless das vistas, seleção, contexto e URL da bancada.
- `estudo-campo-revalidacao.test.ts` — R05: estudo de campo sobre uma peça compartilhada em duas raízes.
- `executar-receita.test.ts` — executar-receita.test.ts — prova a fronteira pura sem carregar catálogo.
- `exportar-peca.mjs` — exportar-peca.mjs — A-60: o núcleo roda AQUI e grava o resultado; o produto só lê.
- `exportar-peca.test.ts` — Exportação: contrato do artefato e estado sem catálogo publicado.
- `exportar.mjs` — exportar.mjs — a linha de comando do A-60.
- `guarda-bancada-vazia.mjs` — guarda-bancada-vazia.mjs — prova o estado publicado sem catálogo.
- `guarda-camera-livre.mjs` — guarda-camera-livre.mjs — prova real: uma órbita da bancada vira URL e a URL volta igual.
- `guarda-inspecao-par.mjs` — guarda-inspecao-par.mjs — prova real de que duas partes recebem vista legível e URL reproduzível.
- `guarda-portas-bancada.mjs` — guarda-portas-bancada.mjs — a PROVA PELO OLHO DA BANCADA do painel de PORTAS: abrir `bancada.html` numa peça que publica portas mostra as portas na tela, e a…
- `hierarquia-partes.test.ts` — hierarquia-partes.test.ts — árvore semântica sem Three.js ou geometria.
- `impacto-global.test.ts` — impacto-global.test.ts — provas da R03 sobre o mapa canônico v1.
- `intencao-peca.test.ts` — @ts-expect-error — contrato JavaScript puro da autoria.
- `lathe-fechado.test.ts` — lathe-fechado.test.ts — perfil que dá a volta e fecha de verdade.
- `ler-montagem-persistida-v3.test.ts` — Prova o contrato estrutural v3 sem alterar a leitura fechada de v1/v2.
- `loft-fechado.test.ts` — loft-fechado.test.ts — caminho que volta em si e fecha de verdade.
- `mapa-dependencias.test.ts` — mapa-dependencias.test.ts — provas da R02 sobre o snapshot da R01.
- `mcp-degrau-1-preparacao.test.mjs` — Provas da fatia preparatória: importação silenciosa, serviço estruturado e limpeza.
- `montagem-persistida.test.ts` — @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
- `nome-de-copia.test.ts` — nome-de-copia.test.ts — endereço de autor para as cópias do `arranja`.
- `normais-lisas.test.ts` — normais-lisas.test.ts — a borda do furo serrilhava na bancada, e a peça não tinha culpa: o `freio-disco` já usa 12 lados no furo do prisioneiro e já marca a …
- `olhar-bancada.mjs` — olhar-bancada.mjs — serviço headless de vistas e sua CLI fina.
- `olhar-montagem.mjs` — olhar-montagem.mjs — CLI fina sobre captura importável de montagem.
- `ponto-nomeado.test.ts` — ponto-nomeado.test.ts — um nome pode guardar um ponto inteiro (A-8 e A-29).
- `portas-espelho-arranja.test.ts` — portas-espelho-arranja.test.ts — prova adversarial de AUT-2026-15: uma interface não pode permanecer no espaço da fonte quando a sua geometria foi copiada. C…
- `pose-de-criacao.test.ts` — pose-de-criacao.test.ts — a prova de `em` e `eixo` nos geradores (A-4 / O-7).
- `referencia-posicional.test.ts` — referencia-posicional.test.ts — prova do A-22: a regra de "isto é referência por id posicional?" é UMA SÓ, e ela distingue as duas coisas que a chave `de` ca…
- `repositorio-autoria.mjs` — repositorio-autoria.mjs — revisões imutáveis com commit como fronteira de visibilidade.
- `repositorio-autoria.test.ts` — Prova publicação imutável, falha recuperável e conflito explícito.
- `repositorio-revalidacao.mjs` — repositorio-revalidacao.mjs — persistência R01 sobre o repositório transacional existente.
- `repositorio-revalidacao.test.ts` — Provas R01: persistência canônica, retomada, idempotência e conflito.
- `revalidacao-cascata-r00.test.ts` — Provas executáveis da R00: identidade, estados, obsolescência e concorrência.
- `revalidacao-resultados.test.ts` — Provas R03: resultado vinculado, histórico, obsolescência e CAS persistidos.
- `separacao-direcional.test.ts` — Prova separação direcional genérica em peça, parte e montagem recursiva.
- `snapshot-universo-autoria.test.ts` — snapshot-universo-autoria.test.ts — provas da R01.
- `transformacao-rigida.test.ts` — @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
- `universo-autoria.mjs` — universo-autoria.mjs — adaptador confinado do snapshot do universo.
- `universo-autoria.test.ts` — universo-autoria.test.ts — contrato estrutural e fixture adversarial da R00.
- `visor-montagem.html` — visor-montagem.html — superfície privada para evidência visual de montagem.
- `visor-montagem.js` — visor-montagem.js — renderizador privado, derivado de montagem já resolvida.

## tools/modelagem/

- `comparar-revisao.mjs` — CLI fino: lê dois JSONs, usa somente o núcleo puro e escreve JSON canônico.
- `critica-modelagem.mjs` — CLI fino: valida crítica sem abrir navegador, peça ou Oficina.
- `critica-visual.test.mjs` — crítica-visual.test.mjs — contrato neutro e reexecutável de achados visuais.
- `formato-pacote.mjs` — formato-pacote.mjs — contrato pequeno, estrito e canônico do pacote de modelagem assistida. Não conhece Three.js, domínio automotivo ou runtime de navegador:…
- `preparar-pacote.mjs` — preparar-pacote.mjs — cria só o esqueleto canônico; uma pasta já existente é sempre erro. Assim, uma segunda tentativa nunca apaga briefing ou crítica.
- `revisao-modelagem.mjs` — Revisão de modelagem — núcleo puro do ciclo assistido por IA.
- `revisar-pacote.mjs` — revisar-pacote.mjs — marco 2 do fluxo assistido: a única ponte entre o pacote, a régua headless e as quatro câmeras da bancada.
- `validar-pacote.mjs` — validar-pacote.mjs — porta fail-closed do marco 1. Lê, exige bytes canônicos e confere o alvo com a régua headless assim que a fonte canônica existir.

## tools/oficina/

- `arranja-contrato.test.ts` — arranja-contrato.test.ts — o que a op `arranja` PROMETE no comentário e não estava afirmado em lugar nenhum.
- `arredondar-aresta.test.ts` — arredondar-aresta.test.ts — contrato de aceitação do Escopo A do filete v2. Escrito antes da op: uma aresta simples de cubo ganha uma faixa de arco com vário…
- `artefatos-procedencia.test.mjs` — artefatos-procedencia.test.mjs — prova o artefato neutro e a origem das entidades finais.
- `canon-linha-de-base.test.ts` — canon-linha-de-base.test.ts — fotografia do furo antes de portas novas do ciclo 6: raios iguais devem conservar exatamente a geometria atual.
- `catalogo-capacidades.test.mjs` — catálogo-capacidades.test.mjs — R05: descoberta deriva do registro, sem tabela paralela.
- `chao-do-ciclo6.test.ts` — chao-do-ciclo6.test.ts — caso vermelho da quinta propriedade: um triângulo emitido pode ter área zero mesmo com núcleo, adaptador e casca saudáveis.
- `composicoes-procedurais.test.mjs` — composicoes-procedurais.test.mjs — R06: subgrafos declarativos e reutilizáveis.
- `concordancia-por-ponto.test.ts` — concordancia-por-ponto.test.ts — A-35: cada curva de um mesmo passo pode declarar seu próprio custo sem obrigar todas as outras a usarem o maior.
- `conferir-malha.ts` — conferir-malha.ts — a conferência única que todo teste de op nova chama.
- `corpus-motor-r00.mjs` — Corpus sintético da R00. Cada caso dá uma entrada mínima e independente a uma capacidade do núcleo; ele congela o resultado observável, não a sua implementaç…
- `corpus-motor-r00.test.mjs` — Guarda determinismo e compatibilidade da linha de base R00 do núcleo.
- `ensaio-ponta-a-ponta-dobradica.test.mjs` — Primeira sonda 1.0: autoria, composição, exportação, montagem e revisão.
- `expressoes.test.ts` — expressoes.test.ts — contrato da aritmética fechada de PARAMS/TOPO (O-5).
- `extensoes-nativas.test.mjs` — extensoes-nativas.test.mjs — R07: SDK confinado, prova e ausência explícita.
- `filete-v2-aceitacao.mjs` — filete-v2-aceitacao.mjs — gate de descoberta do arredondamento real. Não entra em `npm test` enquanto o v2 não existir: hoje ele precisa FALHAR, exibindo a l…
- `furo-ordens-de-ponte.test.ts` — furo-ordens-de-ponte.test.ts — as promessas do A-30 que a geometria sozinha não mostra.
- `furo-raio-por-grupo.test.ts` — furo-raio-por-grupo.test.ts — contrato da F1: cada grupo de centros pode declarar raio e, em furo cego, profundidade próprios, e receber um nome semântico pa…
- `lacunas-capacidade.test.mjs` — lacunas-capacidade.test.mjs — R08: diagnóstico persistível e busca estrutural.
- `lados-por-desvio.test.ts` — lados-por-desvio.test.ts — A-34: a IA declara uma tolerância geométrica e o núcleo deriva a menor contagem circular, sem adivinhar números sem unidade.
- `nomes-de-face.test.ts` — nomes-de-face.test.ts — os NOMES publicados por `origem` são formato salvo, e este arquivo é a única coisa que os prende à geometria.
- `oficina.test.ts` — Vitest do NÚCLEO da OFICINA (passo 1): prova os invariantes de identidade — numeração determinística e POSICIONAL (re-rodar dá ids idênticos), identidade est…
- `plataforma-procedural-campo-r10.test.mjs` — Campo R10: três famílias, composição, extensão, montagem e duas vistas por alvo.
- `registro-operacoes.test.mjs` — registro-operacoes.test.mjs — prova configuração explícita e despacho determinístico da R02.
- `sonda-armadura-humanoide-1-0.test.mjs` — Sonda 1.0: sistema humanoide original, hierárquico e multiestado.
- `sonda-supercarro-1-0.test.mjs` — Sonda de escala 1.0: sistema exterior ficcional, privado e recursivo.
