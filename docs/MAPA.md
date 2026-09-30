# MAPA — inventário da Mecanifica, arquivo por arquivo

> **GERADO** por `npm run mapa` — não edite à mão. O resumo de cada arquivo
> mora no próprio arquivo (primeiro comentário; H1 nos `.md`); isto é a
> projeção. `npm run mapa:check` (CI) falha se isto estiver velho ou se
> algum arquivo-fonte estiver sem cabeçalho.

856 arquivos (código `.js .mjs .cjs .ts .tsx .html` + docs `.md`).

## (raiz)

- `AGENTS.md` — Mecanifica — instruções para agentes
- `CLAUDE.md` — Mecanifica — acordo de trabalho
- `README.md` — Mecanifica
- `bancada.html` — bancada.html — estúdio de inspeção multivista para autoria e validação de montagens.
- `vite.config.js` — vite.config.js — build estático da BANCADA de autoria, publicada em warbookbr/nos-mecanifica no GitHub Pages. O produto que o cliente abre vive em warbookbr/…
- `vitest.config.ts` — Config do Vitest: cobre os contratos da Mecanifica e os núcleos herdados em tools/**.

## .claude/agents/

- `critico-visual.md` — Crítico visual sem contexto da Mecanifica. Recebe o DESENHO ALVO e as vistas do MODELO e responde se o segundo bate com o primeiro. Use antes de fechar qualq…
- `desenhador-de-contorno.md` — Põe as sementes que mapeiam as partes de uma imagem de referência no arquivo de regiões e gera o pacote do crítico com `npm run contorno`. Nas rodadas seguin…
- `desenhista-de-prancha.md` — Decide o que a prancha feita pelos contornos da imagem não sabe decidir sozinha — as cotas de cada parte, a conferência da calibração e o que a imagem escond…
- `implementador.md` — Implementa mudanças delimitadas na Mecanifica, especialmente no núcleo procedural, receitas, bancada e validação, sempre provadas por medição. Use para um br…
- `modelador.md` — Escreve e corrige a receita procedural de UMA peça a partir de um plano de modelagem e, nas rodadas seguintes, de um veredito de defeitos. Não julga o própri…
- `revisor-adversarial.md` — Revisor adversarial por risco da Mecanifica — tenta quebrar mudanças de núcleo, formato salvo, autoria, montagem ou julgamento antes da integração. Use quand…

## .claude/skills/absorver-ajuste-da-bancada/

- `SKILL.md` — Transformar um ajuste que a pessoa fez na bancada em receita organizada — ler o alvo salvo, reescrever TABELA, derivar e gerarPassos, e provar por medida que…

## .claude/skills/alinhar-modelagem/

- `SKILL.md` — Conduzir a rodada de alinhamento antes de modelar — levantar objeto, referências, escala, partes, contatos e critérios de reprovação com a pessoa, e sintetiz…

## .claude/skills/auditar-montagem/

- `SKILL.md` — Auditar uma montagem persistida da Mecanifica por contexto semântico, relações, impacto de revalidação e vistas visuais. Use quando a tarefa envolver composi…

## .claude/skills/auditar-peca/

- `SKILL.md` — Verificar uma peça da Mecanifica pelo fluxo atual de descrição, bancada neutra, revisão do pacote e gates do repositório.

## .claude/skills/contorno-da-imagem/

- `SKILL.md` — Mapear as partes de uma imagem de referência por watershed com sementes nomeadas, gerar o mapa de partes e tirar o contorno de cada uma em milímetro, com um …

## .claude/skills/criar-peca/

- `SKILL.md` — Criar ou refinar uma peça 3D procedural da Mecanifica como IA, escrevendo PASSOS e provando o resultado na bancada neutra com medidas, vistas e crítica objet…

## .claude/skills/criar-peca/references/

- `operacoes-procedurais.md` — Referência de operações procedurais
- `por-que.md` — Por que cada regra da skill `criar-peca` existe

## .claude/skills/desenhar-prancha/

- `SKILL.md` — Desenhar uma prancha ortográfica alvo da Mecanifica com o motor de prancha — silhueta, aberturas, painéis e cotas em vistas lateral, frontal, traseira e supe…

## .claude/skills/esbocar-opcoes/

- `SKILL.md` — Mostrar à pessoa, em imagem, as opções de forma em disputa durante o alinhamento — cilindros, anéis, caixas, cones, esferas, extrusões, tubos e componentes p…

## .claude/skills/laco-de-modelagem/

- `SKILL.md` — Conduzir o laço de modelagem de uma peça — despachar o modelador com o plano, rodar as medidas, despachar o crítico sem a história da construção, levar o ver…

## .claude/skills/prancha-dos-contornos/

- `SKILL.md` — Fazer a prancha lateral de um objeto a partir dos contornos que o mapa de partes tirou da imagem, com o desenhista de prancha escolhendo as cotas e um crític…

## docs/

- `RECURSOS.md` — Recursos e portas de entrada
- `oficina.md` — A Oficina — índice do design

## docs/mecanifica/

- `AGENT-FIRST.md` — Filtro Agent-First
- `ARQUITETURA-SESSAO-E-SEGURANCA.md` — Arquitetura de Sessão Ativa, Hospedagem Estática e Segurança Corporativa
- `ARQUITETURA.md` — Arquitetura atual
- `ATRITOS-AUTORIA.md` — Atritos de autoria — resumo atual
- `AUTORIA-IA.md` — Autoria assistida por IA
- `BANCADA-E-APRESENTACAO.md` — Bancada e apresentação
- `COMPOSICAO-PROCEDURAL-V1.md` — Composição procedural v1
- `CONTEXTO-MONTAGEM-IA.md` — Contexto de montagem para IA
- `CONTEXTO-VISUAL-REVALIDACAO.md` — Contexto visual, revalidação e catálogo de montagem
- `CONTINUIDADE-ARQUITETURAL.md` — Continuidade arquitetural da Mecanifica
- `CONTRATO-ACEITE-VISUAL.md` — Contrato de aceite visual
- `CONTRATO-FORMA-GLOBAL-N2.md` — Contrato de forma global N2
- `COORDENACAO-LOCAL.md` — Coordenação local entre agentes
- `COORDENACAO-REPOS.md` — Coordenação entre os repositórios Mecanifica
- `DOSSIE-EXPORTACAO-CAD-STEP.md` — Dossiê técnico — exportação CAD/STEP
- `DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md` — Dossiê — modelador inverso com priors por família
- `ESCRITA-TRANSACIONAL-MONTAGEM.md` — Escrita transacional de montagem
- `EXTENSOES-NATIVAS-V1.md` — Extensões nativas v1
- `FILETE-V2.md` — Filete v2 — Escopos A e B implementados
- `FLUXO-MODELAGEM-IA.md` — Fluxo de modelagem assistida por IA v4
- `HOMOLOGACAO-FLUXO-IA.md` — Homologação do fluxo de IA
- `INDEX.md` — Mecanifica — entrada atual
- `INVENTARIO.md` — Inventário e fontes de verdade
- `LACUNAS-DE-CAPACIDADE-V1.md` — Lacunas de capacidade v1
- `MAPA-CANONICO-DEPENDENCIAS.md` — Mapa canônico de dependências
- `MATRIZ-TESTES-ACOPLADOS.md` — Matriz de testes acoplados ao acervo
- `MONTAGEM-PERSISTIDA-V1.md` — Montagem persistida v1
- `MONTAGEM-PERSISTIDA-V2.md` — Montagem persistida v2
- `MONTAGEM-PERSISTIDA-V3.md` — Montagem persistida v3 e impacto local
- `MONTAGEM-PERSISTIDA-V4.md` — Montagem persistida v4 e expectativas de interseção
- `PERFIS-DE-AUTORIA.md` — Perfis de autoria
- `SERVICOS-PROCEDURAL-V1.md` — Serviços procedurais v1
- `UPSTREAM-NOS.md` — Capacidades candidatas ao NÓS
- `VISAO.md` — Visão da Mecanifica

## docs/mecanifica/gerado/

- `CATALOGO-CAPACIDADES.md` — Catálogo de capacidades procedural
- `INDEX.md` — Artefatos gerados do catálogo procedural

## docs/mecanifica/historico/

- `ALVO-N6-CUPE-ESPORTIVO.md` — Alvo N6 — cupê esportivo aprovado
- `ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md` — Análise — chassi realista e escolha de representação geométrica
- `BASELINE-MOTOR-R00.md` — Baseline do motor procedural — R00
- `BICICLETA-REALISTA-ATRITOS.md` — Bicicleta realista: diário de atrito da rodada
- `CADEIRA-REALISTA-NOTAS.md` — Cadeira Realista — Notas de Projeto, Problemas e Limitações
- `CHASSI-P0-ALVO-E-LIMIARES.md` — Chassi P0 — alvo, referência e limiares
- `CHASSI-P1-CONTRATO-DA-CAGE.md` — Chassi P1 — contrato da malha de controle
- `CONJUNTO-PROVA-AUTORIA-GEOMETRICA.md` — Conjunto de prova — autoria geométrica do zero
- `DOSSIE-CABO-DE-PA.md` — Cabo de pá: alternativas ao eucalipto — dossiê técnico
- `DOSSIE-FLUXO-IA-VALIDACAO-MULTIFAMILIA.md` — Dossiê — fluxo de IA e validação multifamília
- `DOSSIE-LABORATORIO-IA.md` — Laboratório computacional para investigação por IA
- `DOSSIE-MODELADOR-POR-SELECAO.md` — Dossiê histórico — modelador por seleção
- `DOSSIE-MOTOR-SUPERFICIES-NATIVAS.md` — Dossiê — motor nativo de superfícies semânticas
- `DOSSIE-PLATAFORMA-AUTORIA-3D-NATIVA.md` — Dossiê — plataforma nativa de autoria 3D para IA
- `EXPERIMENTO-AB-FLUXO-IA.md` — Experimento A/B — o fluxo ajuda a IA a modelar?
- `EXPERIMENTO-CARRO-SEM-APOIO.md` — Carro modelado do zero, sem o motor da Mecanifica
- `EXPERIMENTO-RODA-REALISTA.md` — Experimento de autoria — roda realista
- `FLUXO-AUTORIA-N1.md` — Fluxo de autoria 3D — contratos executáveis da N1
- `LABORATORIO-IA-PROGRESSO.md` — Laboratório computacional para IA — progresso por fatia
- `MALHA-OTIMIZADA-PROGRESSO.md` — Malha otimizada e prova por objeto — progresso
- `MATRIZ-RASTREABILIDADE-AUTORIA-3D-NATIVA.md` — Matriz de rastreabilidade — autoria 3D nativa para IA
- `OFICINA-OTIMIZACOES.md` — Otimizações da Oficina para autoria por IA
- `PLANO.md` — Plano mestre da Mecanifica — aposentado
- `PROTOCOLO-DIAGNOSTICO-MOTOR.md` — Protocolo detalhado — diagnóstico do motor procedural
- `README.md` — Histórico da Mecanifica
- `REGISTRO-FALHAS-AUTORIA-V.md` — Registro de falhas da autoria — V-01 a V-38
- `RELATO-RODA-REALISTA.md` — Relato do experimento — roda realista
- `RELATORIO-ANALISE-GRANDES-MELHORIAS.md` — Análise — estado e grandes melhorias
- `RELATORIO-AUDITORIA-PRATICAS-AUTORIA-3D.md` — Auditoria das práticas de autoria 3D
- `RELATORIO-CHASSI-P2-PROVA-DO-QUARTO.md` — Chassi P2 — relatório da prova do quarto dianteiro
- `RELATORIO-DIAGNOSTICO-MOTOR.md` — Relatório — diagnóstico do motor procedural
- `RELATORIO-ENSAIO-DOBRADICA-1-0.md` — Relatório — ensaio ponta a ponta da dobradiça 1.0
- `RELATORIO-ESTUDO-CAMPO-CONJUNTO-DIANTEIRO.md` — Relatório — estudo de campo do conjunto dianteiro
- `RELATORIO-EXPERIMENTO-AUTORIA-GEOMETRICA.md` — Relatório — experimento de autoria geométrica do zero
- `RELATORIO-EXPORTACAO-CAD-STEP-R00.md` — Relatório R00 — exportação CAD/STEP
- `RELATORIO-MODELADOR-INVERSO-P0.md` — Relatório P0 — confiança antes de geometria
- `RELATORIO-MOTOR-DE-PRANCHA-R0.md` — Motor de Prancha — R0: linha de base e corpus adversarial
- `RELATORIO-MOTOR-DE-PRANCHA-R1.md` — Motor de Prancha — R1: comparação externa controlada
- `RELATORIO-MOTOR-DE-PRANCHA-R2.md` — Motor de Prancha — R2: contrato de autoria confiável
- `RELATORIO-MOTOR-DE-PRANCHA-R3.md` — Motor de Prancha — R3: implementação e replay do corpus
- `RELATORIO-MOTOR-DE-PRANCHA-R4.md` — Motor de Prancha — R4: autoria fria, revisão e limite de impacto
- `RELATORIO-N1-FLUXO-AUTORIA.md` — Relatório N1 — contratos e orquestração da autoria 3D
- `RELATORIO-N2-FORMA-GLOBAL.md` — Relatório N2 — forma global
- `RELATORIO-N3-CANAL-PERCEPCAO.md` — Relatório N3 — canal de percepção
- `RELATORIO-N4-RESTRICOES.md` — Relatório N4 — sonda de autoria por restrição
- `RELATORIO-N5-BUSCA.md` — Relatório N5 — busca residual controlada
- `RELATORIO-N6-CANARIO-CASCO-VISUAL.md` — Relatório N6 — canário de casco por silhuetas
- `RELATORIO-PLATAFORMA-PROCEDURAL-R10.md` — Relatório R10 — plataforma procedural
- `RELATORIO-PONTE-THREE.md` — Relatório da ponte Three.js
- `RELATORIO-R05-REVALIDACAO-CAMPO.md` — Relatório R05 — estudo de campo da revalidação persistida
- `RELATORIO-R2-CAGE-DIRETA-R3.md` — R2 — relatório de decisão da cage direta
- `RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md` — Relatório da sonda — armadura humanoide tecnológica 1.0
- `RELATORIO-SONDA-SUPERCARRO-1-0.md` — Relatório da sonda de escala — supercarro exterior 1.0
- `REORGANIZACAO-POR-USO-PROGRESSO.md` — Reorganização por uso — progresso

## docs/mecanifica/planos/

- `2026-08-18-chassi-realista-kernel-geometrico.md` — Chassi realista — representação de superfície para carroceria
- `2026-08-19-chassi-p2-prova-do-quarto.md` — Chassi P2 — prova descartável do quarto dianteiro
- `2026-08-20-motor-de-prancha-autonomia.md` — Motor de Prancha — autonomia verificável
- `2026-08-20-validacao-integrada-mecanifica.md` — Validação integrada da Mecanifica — valor Agent-First
- `2026-09-21-o-que-o-braco-robotico-achou.md` — O que o braço robótico achou
- `2026-09-29-o-esboco-sem-conta-a-mao.md` — O esboço sem conta à mão
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

## docs/mecanifica/planos/congelados/

- `2026-08-25-modelador-inverso-priors-familia-p0.md` — Modelador inverso com priors por família — execução do P0
- `2026-08-25-modelador-inverso-priors-familia.md` — Modelador inverso com priors por família
- `2026-09-10-carroceria-por-casca-deformavel.md` — Carroceria por casca deformável ajustada contra referência
- `2026-09-17-vocabulario-poligonal-da-bancada.md` — Vocabulário poligonal da bancada
- `2026-09-26-as-partes-do-braco.md` — As partes do braço
- `README.md` — Planos congelados

## docs/mecanifica/planos/encerrados/

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
- `2026-08-18-ensaio-ponta-a-ponta-dobradica.md` — Ensaio ponta a ponta — dobradiça de porta
- `2026-08-18-plataforma-procedural-extensivel.md` — Plataforma procedural extensível e descobrível
- `2026-08-18-sonda-armadura-humanoide-1-0.md` — Sonda de sistema — armadura humanoide tecnológica 1.0
- `2026-08-18-sonda-supercarro-1-0.md` — Sonda de escala — supercarro exterior 1.0
- `2026-08-19-coerencia-entre-vistas.md` — Coerência entre vistas na prancha
- `2026-08-19-leitura-de-referencia-medida.md` — Leitura de referência rasterizada
- `2026-08-19-motor-de-prancha-medida.md` — Motor de prancha com filete e medida
- `2026-08-20-aceite-visual-e-prova-de-superficie.md` — Aceite visual vinculante e prova de superfície
- `2026-08-20-auditoria-praticas-autoria-3d.md` — Auditoria das práticas de autoria 3D da Mecanifica
- `2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md` — Histórico cancelado — modelador por seleção
- `2026-08-23-redesenho-cage-r2b-controle-vertical.md` — Redesenho R2B — controle vertical da cage direta
- `2026-08-28-exportacao-cad-step.md` — Exportação CAD/STEP modular
- `2026-08-31-malha-otimizada-e-prova-por-objeto.md` — Malha otimizada e prova por objeto
- `2026-08-31-reorganizacao-por-uso.md` — Reorganização da documentação por uso
- `2026-09-01-laboratorio-computacional-ia.md` — Laboratório computacional para investigação por IA
- `2026-09-07-atrito-achado-modelando.md` — Atrito achado modelando
- `2026-09-07-esteira-confiavel-para-ia.md` — Esteira confiável para a IA
- `2026-09-07-o-que-nenhuma-vista-mostra.md` — O que nenhuma vista mostra
- `2026-09-07-parametro-que-move-a-peca.md` — Parâmetro que move a peça
- `2026-09-08-esquecer-precisa-falhar.md` — Esquecer precisa falhar
- `2026-09-09-bancada-referencias-e-controles.md` — 2026-09-09 — referências visuais e controles da bancada
- `2026-09-10-ponte-do-gesto-ao-parametro.md` — Ponte do gesto ao parâmetro nomeado
- `2026-09-11-a-peca-mora-num-lugar-so.md` — A peça mora num lugar só
- `2026-09-11-orquestracao-de-modelagem.md` — Orquestração de modelagem — alinhamento, despacho e veredito
- `2026-09-12-a-seta-move-de-verdade.md` — A seta move de verdade
- `2026-09-14-ajuste-da-bancada-volta-como-receita.md` — Ajuste da bancada volta como receita — o caminho de volta existe
- `2026-09-15-modo-de-edicao-de-malha.md` — Modo de edição de malha — vértice, aresta e face
- `2026-09-16-topologia-e-leitura-do-gesto.md` — Topologia, mover a peça, e ler o gesto
- `2026-09-17-nada-depende-da-bicicleta.md` — Nada depende da bicicleta
- `2026-09-22-a-peca-nasce-encaixada.md` — A peça nasce encaixada
- `2026-09-22-o-motor-mora-num-lugar-so.md` — O núcleo mora num lugar só, e se chama núcleo
- `2026-09-22-o-teste-carrega-o-que-ele-prova.md` — O teste carrega o que ele prova
- `2026-09-23-o-laco-constroi-parte-por-parte.md` — O laço constrói parte por parte
- `2026-09-25-o-braco-inteiro.md` — O braço inteiro
- `2026-09-28-uniao-de-solidos.md` — União de sólidos — dois sólidos viram uma peça só
- `DESENHO-bancada-referencias-e-controles.md` — Referências visuais e controles persistentes da bancada
- `README.md` — Planos encerrados

## docs/mecanifica/planos/mcp/

- `INDEX.md` — Programa MCP — índice de planos

## docs/mecanifica/planos/mcp/concluidos/

- `01-fatia-1a-piloto-leitura.md` — MCP — encerramento da Fatia 1A somente leitura

## docs/mecanifica/referencias/

- `GOTCHAS-POR-OPERACAO.md` — Gotchas por operação: os casos completos
- `README.md` — Referências de forma

## docs/mecanifica/usar/

- `AJUSTE-DA-BANCADA.md` — Ajuste da bancada
- `ATIVACAO-BANCADA-SESSAO-ATIVA.md` — Ativação de Peças e Montagens na Bancada 3D (Sessão Ativa)
- `AUTORIA-DE-PECA.md` — Autoria de peça — o contrato
- `AUTORIA-RECEITA-DECLARATIVA.md` — Autoria de receita declarativa
- `CONFERIR-CONTRA-REFERENCIA.md` — Conferir a peça contra uma foto de referência
- `CONTRATO-AUTORIA-PRANCHA.md` — Contrato de autoria de prancha v1
- `CRITICA-VISUAL-CONTRATO-E-CASOS.md` — Crítica visual — contrato do achado e casos aplicados
- `FLUXO-DO-OBJETO.md` — Fluxo do objeto
- `GOTCHAS-AUTORIA-VISUAL.md` — Gotchas de autoria visual
- `GUIA-AUTORIA-IA.md` — # Guia de Autoria e Modelagem Procedural para IA
- `INTENCAO-PECA-V1.md` — Intenção semântica opcional de peça — v1
- `LACO-VISUAL.md` — O laço visual — olhar, sobrepor, despachar
- `METODO-DIAGNOSTICO-E-SEU-LIMITE.md` — Método diagnóstico, e onde ele para
- `MONTAGENS-SEMANTICAS.md` — Montagens semânticas
- `PARAMETROS-VIVOS.md` — Parâmetro vivo e parâmetro decorativo
- `PARE-E-ANALISE.md` — Pare e analise
- `README.md` — Usar o Mecanifica
- `REFERENCIA-E-CRITICA-VISUAL.md` — Referência e crítica visual — protocolo de modelagem
- `RODADA-DE-ALINHAMENTO-EXEMPLO.md` — Rodada de alinhamento, preenchida: o quadro de bicicleta

## docs/nos-herdado/

- `README.md` — Herança do NÓS
- `TETO.md` — O TETO — medir o que a Oficina de fato cria
- `oficina-contrato.md` — Oficina — contrato procedural preservado
- `oficina-projeto.md` — Oficina — o registro de projeto
- `oficina-referencia.md` — Oficina — aviso de compatibilidade
- `playground.md` — O Playground — o épico da criação por IA

## modulos/contorno-da-imagem/src/

- `colunas.js` — colunas.js — nomes em duas colunas fora do desenho, com chamada até a parte.
- `desenho.js` — desenho.js — o que o crítico e a pessoa olham.
- `index.js` — index.js — a porta do módulo contorno-da-imagem: segmentação, desenho, medida e rodadas.
- `medida.js` — medida.js — o contorno de cada parte contra as bordas da própria imagem. Para cada parte, a fração do perímetro que fica a até `distancia` pixels de uma bord…
- `opencv.js` — opencv.js — carrega o OpenCV uma vez. Carregado por require, e só quando usado: importado como módulo ES, o pacote quebra dentro do vitest. E o módulo volta …
- `regioes.js` — regioes.js — as partes da imagem, separadas por watershed com sementes.
- `rodadas.js` — rodadas.js — a conversa entre quem produz e o crítico, com limite. Vale para o mapa de partes e para a prancha.

## modulos/contorno-da-imagem/tests/

- `contorno.test.js` — contorno.test.js — cada peça do módulo vista num caso construído de propósito: duas partes do mesmo cinza separadas pela semente, a pintura com a opacidade p…

## modulos/esboco/

- `PLANO-ESTADO-DA-ARTE.md` — Plano de Implementação: Estado da Arte e Ergonomia para IA no `@mecanifica/esboco`
- `README.md` — @mecanifica/esboco

## modulos/esboco/componentes/

- `index.js` — Biblioteca de componentes do esboço: cada `<nome>.json` desta pasta descreve um componente parametrizado (parâmetros, entradas, formas, âncoras e pares do ga…

## modulos/esboco/src/

- `achado.js` — Imagem de um achado: só as peças envolvidas saem coloridas (a primeira em laranja, a segunda em azul), o resto sai em cinza translúcido, sem legenda numerada…
- `ajustar.js` — `--ajustar`: aplica no JSON declarado as sugestões de contato do gate e reexecuta o gate, até aprovar, até uma rodada não reduzir os achados ou até o limite …
- `componentes.js` — Componentes parametrizados: `{ "id": "rodaFrente", "usa": "roda", "parametros": {...}, "centro": [...] }` numa lista de formas vira as formas do componente, …
- `condutor.js` — O Condutor: a máquina de estados do fluxo de um esboço grande. Estágios: Maquete (formas primitivas com dimensões e posições certas), Conferência da maquete,…
- `conserto.js` — Conserto proposto pelo gate: para cada achado de contato, qual forma mover, em que vetor e por quê. Trabalha sobre o esboço já expandido (números, sem expres…
- `contato.js` — Contato do esboço: gate opt-in de colisão, folga e conjunto conectado entre as formas de cada opção. A geometria é a que o desenho já monta (`resolverOpcao`:…
- `descrever.js` — Leitura do esboço em texto: cada forma resolvida, as âncoras, o grafo de contatos 3D, as formas soltas e as sobreposições (3D e por vista), sem desenhar nada…
- `esquema.js` — Esquema do JSON do esboço: recusa o campo que não existe, o tipo de forma que não existe e o valor fora do conjunto válido, com uma mensagem que diz onde est…
- `expandir.js` — Parâmetros, expressões, formas herdadas da raiz e arranjos: a etapa que transforma o JSON declarado num JSON simples, só com números, antes de qualquer outra…
- `index.js` — Esboço de opções de forma: lê a declaração de cilindros, anéis e caixas em milímetro, resolve as posições relativas (sobre, ponta) e desenha as opções lado a…
- `parecido.js` — "Quis dizer": o nome válido mais parecido com o que foi escrito, para as mensagens de recusa do esquema, do plano e do Condutor. Puro.
- `plano.js` — O `plano` estruturado do esboço: nível de detalhe, medidas nomeadas conferidas contra o esboço e contrato de relações (o que deve tocar, o que deve ficar liv…
- `projecao.js` — Sobreposição na projeção: o gate de contato mede colisão, folga e ligação em três dimensões, e a pessoa vê o que ele não mede: duas peças sem penetração algu…
- `referencia.js` — Conferência contra a referência: compara, por vista, a silhueta do esboço com a silhueta de uma referência (o contorno de uma foto, em milímetro) e, por part…

## modulos/esboco/tests/

- `componentes.test.js` — Componentes parametrizados (`usa`): expansão com ids prefixados, parâmetros no escopo do componente, entradas, âncoras expostas, pares do gate, espelho de in…
- `condutor.test.js` — O Condutor: estágios, Portão de estágio, nível de detalhe, Plano de detalhe (unidades e ordem), agrupamento com motivo e Marcos.
- `conserto.test.js` — Conserto proposto pelo gate e `--ajustar`: qual forma se move, quanto, e o gate aprovando depois.
- `contato.test.js` — Gate de contato do esboço: colisão, folga, voando e pares declarados.
- `curvas.test.js` — Formas curvas: extrusão de perfil côncavo, loft por seções e revolução por perfil, em desenho (ordem das faces medida por lançamento de raios), âncoras, gate…
- `descrever.test.js` — Leitura do esboço em texto (`--descrever`, `--descrever --mudou`) e âncoras nomeadas.
- `desempenho.test.js` — Desempenho do esboço: a projeção reaproveita as faces de cada forma, só mede os pares cujas caixas na tela se cruzam, o desenho tem a opção de menos lados no…
- `esboco.test.js` — Contrato do esboço: posição relativa por sobre/ponta, recusa de referência inexistente e PNG no tamanho que o desenho declara.
- `esperado.test.js` — Fixtures com resultado esperado: a moto de prova (com o Condutor completo), o mancal e a casa, cada uma com o seu `<nome>.esperado.json` ao lado (contagem de…
- `formas.test.js` — Formas novas: esfera, cone e tronco, extrusão de polígono, chanfro em caixa e tubo por pontos, em desenho, âncoras, gate de contato, espelho e arranjo, leitu…
- `leitura.test.js` — Leitura padrão do `--descrever` (só divergências), detalhe por forma, leitura completa idêntica à antiga e imagem por achado.
- `parametros.test.js` — Parâmetros e expressões, formas herdadas da raiz, `espelha` e `arranja`, e o legado byte a byte.
- `plano.test.js` — O `plano` estruturado: medidas nomeadas conferidas contra o esboço, contrato de relações e o esquema do JSON.
- `posicao.test.js` — Posicionar sem calcular coordenada: haste `de`/`para`, `encosta`, `alinha` e pontos nomeados.
- `projecao.test.js` — Sobreposição na projeção: silhuetas que se cobrem sem penetração 3D, explosão e opacidade.
- `referencia.test.js` — Conferência contra a referência: a silhueta do esboço contra um contorno (gerado aqui, sem foto), por vista e por parte, com a razão interseção/união e o des…
- `relacoes.test.js` — Contrato de relações da fatia 8: `contato.juntas`, pontos-guia nomeados no `caminho` do tubo, âncora com deslocamento e `<instancia>.<parte>` em todo campo q…
- `skill.test.js` — A skill `esbocar-opcoes` e o `PARE-E-ANALISE.md` dizem o fluxo, o nível de detalhe e a proibição de auditar por imagem com legenda numerada, sem citar objeto…

## modulos/exportador-cad/src/

- `contrato.js` — contrato.js — contrato e validação de opções do exportador CAD.
- `index.js` — index.js — porta pública do módulo exportador CAD.
- `separar-corpos.js` — separar-corpos.js — separação determinística de componentes conexos por parte.
- `triangular-faces.js` — triangular-faces.js — decomposição determinística de faces poligonais em triângulos.
- `validar-malha.js` — validar-malha.js — validação pura de integridade e topologia da malha neutra.

## modulos/exportador-cad/src/backends/

- `step-facetado.js` — step-facetado.js — backend de exportação STEP facetado via OCCT WASM.

## modulos/exportador-cad/tests/

- `exportador-cad.test.js` — exportador-cad.test.js — suíte de testes do exportador CAD cobrindo R01, R02 e R04.

## modulos/exportador-obj/src/

- `contrato.js` — contrato.js — tipos, erros e validação de opções do exportador Wavefront OBJ.
- `gerar-obj.js` — gerar-obj.js — serializador Wavefront OBJ (.obj) puro e determinístico com suporte a multipartes.
- `index.js` — index.js — porta pública do módulo exportador Wavefront OBJ.
- `validar-malha.js` — validar-malha.js — validação e normalização de malha neutra para exportação OBJ.

## modulos/exportador-obj/tests/

- `exportador-obj.test.js` — exportador-obj.test.js — suíte de testes do exportador Wavefront OBJ.

## modulos/otimizador-malha/src/

- `otimizar.js` — otimizar.js — reduz malha na CAMADA DE SAÍDA, sem mover um único ponto.

## modulos/otimizador-malha/tests/

- `otimizar.test.js` — otimizar.test.js — o invariante é a coisa a provar, não o ganho.

## modulos/preparo-micropoligono/src/

- `preparar.js` — preparar.js — deixa a malha pronta para pipeline de micropolígono.

## modulos/preparo-micropoligono/tests/

- `preparar.test.js` — preparar.test.js — cada requisito é visto reprovando o seu defeito.

## modulos/topologia/src/

- `analisar.js` — analisar.js — organizador de topologia: diz o que há de errado no traçado de uma malha, e nunca a reescreve.

## modulos/topologia/tests/

- `analisar.test.js` — analisar.test.js — cada regra é vista REPROVANDO um defeito construído de propósito, e APROVANDO a malha sã correspondente.

## procedural/

- `README.md` — v3 — núcleo procedural, peças e visor
- `visor.html` — visor.html — visor de peças da OFICINA (D-55): abre qualquer peça de pecas/ isolada no ambiente padrão (?peca=nome).

## procedural/extensoes/prisma-triangular/

- `fixture.js` — fixture.js — receita sintética da extensão, sem publicação de peça.
- `implementacao.js` — implementacao.js — recebe somente emissor transacional e resolução numérica.
- `manifesto.js` — manifesto.js — contrato versionado da extensão neutra de prova.

## procedural/nucleo/

- `adaptador.js` — adaptador.js — projeção visual do neutro; não conhece receitas nem execução.
- `animacao.js` — animacao.js — animação rígida e skinning sobre lotes já adaptados.
- `arrumacao.test.mjs` — arrumacao.test.mjs — segura a arrumação do plano "o núcleo mora num lugar só" (2026-09-22). Antes dele, os testes do núcleo moravam espalhados por `tools/` e…
- `artefatos.js` — artefatos.js — contrato neutro e procedência determinística da execução procedural.
- `artefatos.test.mjs` — artefatos-procedencia.test.mjs — prova o artefato neutro e a origem das entidades finais.
- `catalogo.js` — catálogo.js — projeções puras e determinísticas do registro de operações. Não executa receita, não lê arquivos e não conhece visor, MCP ou domínio.
- `catalogo.test.mjs` — catálogo-capacidades.test.mjs — R05: descoberta deriva do registro, sem tabela paralela.
- `composicoes.js` — composicoes.js — subgrafos procedurais declarativos, sem estado global ou I/O.
- `composicoes.test.mjs` — composicoes-procedurais.test.mjs — R06: subgrafos declarativos e reutilizáveis.
- `concordancia-por-ponto.test.ts` — concordancia-por-ponto.test.ts — A-35: cada curva de um mesmo passo pode declarar seu próprio custo sem obrigar todas as outras a usarem o maior.
- `entrada.js` — oficina.js — fachada pública compatível do motor procedural. A implementação é separada por responsabilidade; esta entrada preserva o contrato usado por rece…
- `executor.js` — executor.js — orquestra núcleo, adaptador e animação sem duplicar execução.
- `expressoes.js` — expressoes.js — aritmética determinística e fechada para parâmetros da Oficina. A expressão só existe em um campo numérico e sempre começa com `=`. Ela aceit…
- `expressoes.test.ts` — expressoes.test.ts — contrato da aritmética fechada de PARAMS/TOPO (O-5).
- `extensoes.js` — extensoes.js — SDK nativo: manifesta, limita e combina extensões sem estado global.
- `extensoes.test.mjs` — extensoes-nativas.test.mjs — R07: SDK confinado, prova e ausência explícita.
- `geo.js` — helpers de GEOMETRIA do motor v3 (D-55): malha = lista chata de vértices (pos xyz, uv, normal) — 8 floats por vértice, triângulos soltos.
- `lacunas.js` — lacunas.js — diagnóstico e planejamento estrutural puros sobre o catálogo. Não executa receita, não grava disco e não decide promoção de capacidade.
- `lacunas.test.mjs` — lacunas-capacidade.test.mjs — R08: diagnóstico persistível e busca estrutural.
- `lados-por-desvio.test.ts` — lados-por-desvio.test.ts — A-34: a IA declara uma tolerância geométrica e o núcleo deriva a menor contagem circular, sem adivinhar números sem unidade.
- `linha-de-base-do-furo.test.ts` — canon-linha-de-base.test.ts — fotografia do furo antes de portas novas do ciclo 6: raios iguais devem conservar exatamente a geometria atual.
- `linha-de-base-do-nucleo.mjs` — Corpus sintético da R00. Cada caso dá uma entrada mínima e independente a uma capacidade do núcleo; ele congela o resultado observável, não a sua implementaç…
- `linha-de-base-do-nucleo.test.mjs` — Guarda determinismo e compatibilidade da linha de base R00 do núcleo.
- `liso-por-angulo.js` — liso-por-angulo.js — a normal suave de um canto de face, com ângulo limite.
- `liso-por-angulo.test.js` — liso-por-angulo.test.js — o valor gravado e a média filtrada por ângulo.
- `loft-aresta.test.js` — loft-aresta.test.js — a ponta do loft fecha numa linha, com malha fechada e sem leque nem triângulo dobrado.
- `manifold.js` — manifold.js — o ÚNICO ponto onde o núcleo toca a biblioteca Manifold (`manifold-3d`, WebAssembly). As booleanas (`unir`, `subtrair`, `intersectar`) ENVOLVEM …
- `mat4.js` — mat4 mínimo do motor v3 (D-55) — colunas-major, como o WebGL espera
- `nomes-de-face.test.ts` — nomes-de-face.test.ts — os NOMES publicados por `origem` são formato salvo, e este arquivo é a única coisa que os prende à geometria.
- `nucleo.js` — nucleo.js — implementação única da OFICINA procedural (passo 1). Executa a lista de PASSOS de uma peça-objeto e devolve o objeto pronto pro visor. Duas camad…
- `ponto-nomeado.test.ts` — ponto-nomeado.test.ts — um nome pode guardar um ponto inteiro (A-8 e A-29).
- `pose-de-criacao.test.ts` — pose-de-criacao.test.ts — a prova de `em` e `eixo` nos geradores (A-4 / O-7).
- `referencia-posicional.js` — referencia-posicional.js — A REGRA ÚNICA de "isto é referência por id posicional?", para o formato salvo da Oficina.
- `referencia-posicional.test.ts` — referencia-posicional.test.ts — prova do A-22: a regra de "isto é referência por id posicional?" é UMA SÓ, e ela distingue as duas coisas que a chave `de` ca…
- `registro.js` — registro.js — configuração explícita, determinística e sem estado global de operações.
- `registro.test.mjs` — registro-operacoes.test.mjs — prova configuração explícita e despacho determinístico da R02.
- `render.js` — O VISOR do motor v3 (D-55) — o ambiente PADRÃO onde toda peça é criada e auditada: framebuffer fixo (?res) com upscale NEAREST (pixel art, custo independente…
- `sha256.js` — sha256.js — SHA-256 síncrono, portátil e sem dependência de Node.
- `tex.js` — helpers de TEXTURA do motor v3 (D-55) — paleta Resurrect64, ruído, dither e o gerador de canvas. Uma peça pode devolver índice da paleta OU [r,g,b] direto (m…
- `triangulacao-face.js` — triangulacao-face.js — triangulação dos triângulos de UMA face plana. O leque a partir do canto 0 põe dezenas de triângulos longos e finos num único vértice …
- `uso-operacoes.js` — uso-operacoes.js — contratos Agent-First executáveis das operações nativas. A tabela descreve como chamar a capacidade; o executor continua decidindo a geome…

## procedural/nucleo/operacoes/

- `arranja-contrato.test.ts` — arranja-contrato.test.ts — o que a op `arranja` PROMETE no comentário e não estava afirmado em lugar nenhum.
- `arredondar-aresta.test.ts` — arredondar-aresta.test.ts — contrato de aceitação do Escopo A do filete v2. Escrito antes da op: uma aresta simples de cubo ganha uma faixa de arco com vário…
- `arredondar-costura-convexa.test.ts` — arredondar-costura-convexa.test.ts — fatia 7b do plano "União de sólidos": o `arredondarCostura` arredonda também a borda CONVEXA de uma booleana (a beira do…
- `arredondar-costura.test.ts` — arredondar-costura.test.ts — fatia 4 do plano "União de sólidos": o encontro côncavo de uma união é arredondado com raio declarado, e o `liso` com ângulo não…
- `atributos.js` — atributos.js — operações do grupo, isoladas por serviços explícitos do núcleo.
- `booleanas-carga.test.ts` — booleanas-carga.test.ts — fatia 5 do plano "União de sólidos". O núcleo carrega a Manifold sozinho, por await no topo de `manifold.js`: quem só importa a fac…
- `booleanas-revisao-2.test.ts` — booleanas-revisao-2.test.ts — regressões da segunda revisão adversarial das booleanas (2026-09-29): tolerâncias que dependiam da posição, costura mista que s…
- `booleanas.js` — booleanas.js — `unir`, `subtrair` e `intersectar`: dois ou mais SÓLIDOS fechados viram uma superfície fechada só, sem face interna.
- `booleanas.test.ts` — booleanas.test.ts — fatias 1 a 3 do plano "União de sólidos" (docs/mecanifica/planos/encerrados/2026-09-28-uniao-de-solidos.md). A fixture é neutra: dois cub…
- `edicao-direta.js` — edicao-direta.js — edições locais por identidade, via serviços explícitos do núcleo.
- `encostar.test.ts` — encostar.test.ts — contato derivado no lugar de coordenada digitada (A-6).
- `estouro-de-bloco.test.ts` — estouro-de-bloco.test.ts — nenhum passo que passa de BLOCO ids lança erro: espelha, arranja, furo e os geradores com lados:{desvio} continuam na faixa estend…
- `estruturais.js` — estruturais.js — operações do grupo, isoladas por serviços explícitos do núcleo.
- `furo-raio-por-grupo.test.ts` — furo-raio-por-grupo.test.ts — contrato da F1: cada grupo de centros pode declarar raio e, em furo cego, profundidade próprios, e receber um nome semântico pa…
- `geradores-avancados.js` — geradores-avancados.js — operações do grupo, isoladas por serviços explícitos do núcleo.
- `lathe-fechado.test.ts` — lathe-fechado.test.ts — perfil que dá a volta e fecha de verdade.
- `loft-fechado.test.ts` — loft-fechado.test.ts — caminho que volta em si e fecha de verdade.
- `nome-de-copia.test.ts` — nome-de-copia.test.ts — endereço de autor para as cópias do `arranja`.
- `primitivas-basicas.js` — primitivas-basicas.js — geradores fundamentais registrados pelo núcleo, sem estado global.
- `primitivas-superficie.js` — primitivas-superficie.js — primitivas fechadas que recebem serviços explícitos do núcleo.
- `transformacoes.js` — transformacoes.js — operações do grupo, isoladas por serviços explícitos do núcleo.
- `triangulacao-sem-leque.test.ts` — triangulacao-sem-leque.test.ts — face plana grande (tampa de superelipse, pedaço de união) não sai em leque: grau máximo por canto e ângulo mínimo dos triâng…
- `uniao-lateral-rente.test.ts` — uniao-lateral-rente.test.ts — `unir` com laterais coplanares (rentes). Caso do ombro do braço robótico: coluna e braço com a MESMA meia largura. A saída tem …

## procedural/pecas/braco-robotico/

- `ALINHAMENTO.md` — Braço robótico — rodada de alinhamento

## procedural/pecas/braco-robotico/partes/anel-cintura/

- `receita.js` — braco-robotico/anel-cintura — o anel escuro da cintura, sobre a base.

## procedural/pecas/braco-robotico/partes/anel-cintura/rodadas/

- `receita-01.js` — braco-robotico/anel-cintura — o anel escuro da cintura, sobre a base.
- `receita-02.js` — braco-robotico/anel-cintura — o anel escuro da cintura, sobre a base.

## procedural/pecas/braco-robotico/partes/base/

- `receita.js` — braco-robotico/base — a base do braço robótico, com a caixa lateral.

## procedural/pecas/braco-robotico/partes/base/rodadas/

- `receita-01.js` — braco-robotico/base — a base do braço robótico, com a caixa lateral.
- `receita-02.js` — braco-robotico/base — a base do braço robótico, com a caixa lateral.
- `receita-03.js` — braco-robotico/base — a base do braço robótico, com a caixa lateral.
- `receita-04.js` — braco-robotico/base — a base do braço robótico, com a caixa lateral.

## procedural/pecas/braco-robotico/partes/ombro/

- `receita.js` — braco-robotico/ombro — ombro escolhido pela pessoa em 2026-09-28, partindo da rodada 2 (cotovelo de cano), depois de comparar com o ombro de tambor sobre a b…

## procedural/pecas/braco-robotico/partes/ombro-tambor/

- `receita.js` — braco-robotico/ombro-tambor — variação guardada do ombro: o ombro do braço robótico, sobre o anel da cintura: um colar redondo, um corpo com planta em "D" e …

## procedural/pecas/braco-robotico/partes/ombro-tambor/rodadas/

- `receita-01.js` — braco-robotico/ombro — o ombro do braço robótico, em forma de cotovelo de cano, sobre o anel da cintura.
- `receita-02.js` — braco-robotico/ombro — o ombro do braço robótico, em forma de cotovelo de cano, sobre o anel da cintura.
- `receita-03.js` — braco-robotico/ombro — o ombro do braço robótico, sobre o anel da cintura: um colar redondo, um corpo com planta em "D" e o tambor da junta.
- `receita-04.js` — braco-robotico/ombro — o ombro do braço robótico, sobre o anel da cintura: um colar redondo, um corpo com planta em "D" e o tambor da junta.
- `receita-05.js` — braco-robotico/ombro — o ombro do braço robótico, sobre o anel da cintura: um colar redondo, um corpo com planta em "D" e o tambor da junta.
- `receita-06.js` — braco-robotico/ombro — o ombro do braço robótico, sobre o anel da cintura: um colar redondo, um corpo com planta em "D" e o tambor da junta.
- `receita-07.js` — braco-robotico/ombro — o ombro do braço robótico, sobre o anel da cintura: um colar redondo, um corpo com planta em "D" e o tambor da junta.
- `receita-08.js` — braco-robotico/ombro — o ombro do braço robótico, sobre o anel da cintura: um colar redondo, um corpo com planta em "D" e o tambor da junta.

## procedural/pecas/braco-robotico/partes/ombro/rodadas/

- `receita-01.js` — braco-robotico/ombro — o ombro do braço robótico, em forma de cotovelo de cano, sobre o anel da cintura.
- `receita-02.js` — braco-robotico/ombro — o ombro do braço robótico, em forma de cotovelo de cano, sobre o anel da cintura.
- `receita-03.js` — braco-robotico/ombro — o ombro do braço robótico, sobre o anel da cintura: um colar redondo, um corpo com planta em "D" e o tambor da junta.
- `receita-04.js` — braco-robotico/ombro — o ombro do braço robótico, sobre o anel da cintura: um colar redondo, um corpo com planta em "D" e o tambor da junta.
- `receita-05.js` — braco-robotico/ombro — o ombro do braço robótico, sobre o anel da cintura: um colar redondo, um corpo com planta em "D" e o tambor da junta.
- `receita-06.js` — braco-robotico/ombro — o ombro do braço robótico, sobre o anel da cintura: um colar redondo, um corpo com planta em "D" e o tambor da junta.
- `receita-07.js` — braco-robotico/ombro — o ombro do braço robótico, sobre o anel da cintura: um colar redondo, um corpo com planta em "D" e o tambor da junta.
- `receita-08.js` — braco-robotico/ombro — o ombro do braço robótico, sobre o anel da cintura: um colar redondo, um corpo com planta em "D" e o tambor da junta.

## procedural/pecas/braco-robotico/referencias/frontal.pacote/

- `roteiro.md` — Roteiro da análise

## procedural/pecas/braco-robotico/referencias/lateral-sem-cabo.pacote/

- `roteiro.md` — Roteiro da análise

## procedural/pecas/braco-robotico/referencias/lateral-sem-cabo.prancha.pacote/

- `roteiro.md` — Roteiro da crítica da prancha

## procedural/pecas/braco-robotico/referencias/lateral.pacote/

- `roteiro.md` — Roteiro da análise

## procedural/pecas/braco-robotico/referencias/lateral.prancha.pacote/

- `roteiro.md` — Roteiro da crítica da prancha

## procedural/servicos/

- `descoberta.js` — descoberta.js — porta neutra de descoberta procedural; sem I/O, MCP ou visor.
- `fluxo-autoria.js` — Configuração nativa atual: fluxo N1 + capacidade medida de forma global N2.
- `provedor-autoria.js` — Adaptador N1 da descoberta procedural para o contrato de provedores. Ele só planeja: não executa receita, não registra lacuna e não escreve.

## src/autoria/

- `absorcao-da-edicao.test.js` — absorcao-da-edicao.test.js — o laço inteiro: a pessoa edita a malha, a receita é reescrita, e a medida diz se chegou.
- `adaptar-montagem-three.js` — adaptar-montagem-three.js — projeta uma montagem resolvida em cena Three.js.
- `adaptar-three.js` — adaptar-three.js — adaptador neutro do núcleo da Oficina para Three.js; não altera o formato persistido.
- `adaptar-three.test.js` — adaptar-three.test.js — a malha da cena carrega de qual vértice neutro cada posição veio, que é o que permite a edição devolver o movimento à malha.
- `ajuste-de-junta.js` — ajuste-de-junta.js — arrastar o canto onde as partes se encontram.
- `ajuste-de-junta.test.js` — ajuste-de-junta.test.js — o gesto do canto: quais juntas a peça tem, o que anda quando a pessoa puxa uma, e se o que ela desenhou cabe numa receita.
- `alterar-montagem.js` — alterar-montagem.js — alteração semântica compacta de montagem persistida.
- `alvo-de-cada-operacao.test.js` — alvo-de-cada-operacao.test.js — toda operação de topologia produz alvo que a régua da absorção entende, reproduz e reprova enquanto a receita não mudar.
- `alvo-do-ajuste.js` — alvo-do-ajuste.js — o que a pessoa deixou na bancada, escrito como medida.
- `alvo-do-ajuste.test.js` — alvo-do-ajuste.test.js — a régua que decide se a receita reescrita chegou onde a pessoa deixou a peça na bancada.
- `assinatura-geometria.js` — Compatibilidade da autoria: a implementação portátil vive junto ao núcleo.
- `auditar-intersecoes-montagem.js` — auditoria de interseções de montagem — serviço neutro, sem Three.js.
- `auditar-intersecoes-montagem.test.mjs` — A expectativa da montagem passou a JULGAR: par que se toque fora da lista sai em `naoDeclarados`. Estes testes montam uma montagem sintética de dois cubos, p…
- `caminho-simetrico.js` — caminho-simetrico.js — utilitário declarativo para construção de caminhos bilaterais simétricos para a primitiva `loft` no motor procedural da Mecanifica.
- `caminho-simetrico.test.mjs` — caminho-simetrico.test.mjs — testes unitários para a função criarCaminhoSimetrico.
- `catalogo-pecas.js` — catalogo-pecas.js — contrato explícito da lista que uma aplicação pode publicar. O catálogo é dado de aplicação; o núcleo e os validadores recebem receitas d…
- `consultar-impacto-global.js` — consultar-impacto-global.js — consulta direcionada sobre o mapa v1.
- `contato-de-solidos.js` — contato-de-solidos — o núcleo geométrico que decide se dois sólidos se separam, se encostam ou se invadem. Serviço neutro, sem Three.js.
- `contatos-da-peca.js` — contatos-da-peca — quais partes de uma peça se tocam, e quais delas a receita disse que DEVIAM se tocar.
- `contatos-da-peca.test.mjs` — contatos-da-peca.test.mjs — a medida só vale se ela REPROVAR alguma coisa.
- `contrato-autoria-3d.js` — Contratos neutros da N1. Este módulo valida intenção, fonte e provedores; não executa geometria, não lê disco e não conhece Three.js ou MCP.
- `cor-de-auditoria.js` — cor-de-auditoria.js — a paleta da auditoria visual, e a conferência dela.
- `cor-de-auditoria.test.mjs` — A paleta da auditoria e a conferência dela.
- `derivar-catalogo-montagens.js` — derivar-catalogo-montagens.js — índice determinístico limitado às raízes dadas.
- `derivar-impacto-montagem.js` — derivar-impacto-montagem.js — deriva dependências locais sem executar revalidação.
- `derivar-mapa-dependencias.js` — derivar-mapa-dependencias.js — mapa global derivado de um snapshot estável.
- `derivar-roteiro-revalidacao.js` — derivar-roteiro-revalidacao.js — transforma impacto local em ações explícitas.
- `descrever-montagem-resolvida.js` — descrever-montagem-resolvida.js — projeta a árvore interna em contexto JSON para IA.
- `descrever-partes.js` — descrever-partes.js — mede uma peça da Oficina POR NOME de parte, sem Three.js: caixa alinhada aos eixos, centro, dimensões e faces de cada parte, e a folga …
- `descricao-do-gesto.js` — descricao-do-gesto.js — o que a pessoa fez na bancada, dito em palavras geométricas com números.
- `descricao-do-gesto.test.js` — Uma caixa de 1 m de lado com um anel no meio da altura, numa parte só. O anel existe porque sem ele a caixa tem dois níveis em y, e com dois níveis um arquei…
- `diferenca-de-texto.js` — diferenca-de-texto.js — a diferença entre duas versões de um texto, linha a linha, para o registro de rodada guardar o que foi TENTADO.
- `diferenca-de-texto.test.js` — diferenca-de-texto.test.js — a diferença por linha que o registro de rodada guarda: vazia sem mudança, toda acréscimo na primeira versão, cortada no teto.
- `etapas-de-construcao.js` — etapas-de-construcao.js — o registro de cada etapa de uma montagem v5: a parte que entrou, as juntas que passaram a existir com ela e o resultado da medida d…
- `executar-receita.js` — executar-receita.js — fronteira pura para executar uma receita já carregada.
- `forma-da-parte.js` — forma-da-parte — a peça saiu com a forma que a receita prometeu?
- `forma-da-parte.test.mjs` — forma-da-parte.test.mjs — a promessa de forma só vale se ela reprovar.
- `forma-global.js` — Contrato e executor neutros da N2. A fonte é um andaime de volumes semânticos; a malha e as projeções são produtos derivados sem identidade. Este módulo não …
- `fresta-e-porta-ocupada.test.js` — fresta-e-porta-ocupada.test.js — duas coisas que a montagem deixava passar em silêncio: fresta entre faces apoiadas e duas partes na mesma porta.
- `hierarquia-partes.js` — hierarquia-partes.js — consultas puras e determinísticas da árvore semântica. Não conhece Three.js, geometria ou domínio mecânico.
- `intencao-peca.js` — intencao-peca.js — contrato opcional, semântico e neutro de uma receita.
- `interfaces-montagem.js` — interfaces-montagem.js — resolve portas declaradas por peças, mede relações cilíndricas/anulares e deriva uma prévia cilíndrica sem Three.js, hierarquia ou s…
- `laco-de-modelagem.js` — laco-de-modelagem.js — quem decide se a modelagem continua, e por quê.
- `laco-de-modelagem.test.js` — laco-de-modelagem.test.js — a decisão de parar sai dos números, não de quem modelou.
- `ler-montagem-persistida.js` — ler-montagem-persistida.js — leitor/validador fail-closed da montagem v1 a v5.
- `ler-peca-resolvida.js` — ler-peca-resolvida.js — a metade LEITORA do formato `mecanifica.peca-resolvida`.
- `ler-universo-autoria.js` — ler-universo-autoria.js — contrato e prova estrutural do universo v1.
- `mapa-parte-passo.js` — mapa-parte-passo.js — qual passo da receita constrói qual parte.
- `mapa-parte-passo.test.js` — mapa-parte-passo.test.js — o mapa acha o passo que constrói cada parte.
- `material-da-peca.js` — material-da-peca.js — tudo que pertence a uma peça, e onde está hoje.
- `origem-de-parametro.js` — origem-de-parametro.js — de onde veio cada número da tabela.
- `origem-de-parametro.test.js` — origem-de-parametro.test.js — a regra que impede a rodada de absorção de inventar número para fechar a conta.
- `orquestrar-fluxo-autoria.js` — Orquestração pura da N1: planeja, diagnostica e registra transições. Não compila, renderiza, persiste ou publica nada por conta própria.
- `parametros-declarados.js` — parametros-declarados.js — a pergunta única: quais números desta receita alguém pode mexer, e qual é o valor de cada um agora.
- `parametros-declarados.test.js` — parametros-declarados.test.js — a pergunta única não adivinha.
- `parametros-vivos.js` — parametros-vivos.js — separa liberdade DECLARADA de liberdade REAL.
- `plano-de-modelagem.js` — plano-de-modelagem.js — o que a peça PROMETE ser, escrito antes da geometria.
- `plano-de-modelagem.test.js` — plano-de-modelagem.test.js — o contrato do que a peça promete ser.
- `porta-confere-forma.js` — porta-confere-forma.js — a porta que a receita declara está na forma da peça.
- `porta-confere-forma.test.js` — porta-confere-forma.test.js — a porta no lugar passa, a porta deslocada do plano e a de raio errado reprovam, e as portas das partes fixas do braço passam.
- `posicao-por-porta.js` — posicao-por-porta.js — a pose de uma instância derivada do encaixe de uma porta dela numa porta de outra instância já construída.
- `protocolo-revalidacao.js` — protocolo-revalidacao.js — contrato puro da R00, sem persistência ou efeitos.
- `provedor-contratos-autoria.js` — Provedor N1 do briefing: transforma o objetivo já validado em plano puro. Não alega validar prancha, forma, superfície, montagem, revisão ou promoção.
- `provedor-forma-global.js` — Provedor N2: cobre planejamento de alvo, andaime e blocagem porque há um serviço puro correspondente. Crítica e aceite continuam fora deste manifesto.
- `qualificacao-alvo.js` — qualificacao-alvo.js — declara o que uma referência permite inferir.
- `renderizar-forma-global-svg.js` — Adaptador SVG puro da N2. Consome somente alvo e blocagem neutros; não usa DOM, Three.js, câmera de runtime ou caminhos de arquivo.
- `resolver-montagem-persistida.js` — resolver-montagem-persistida.js — resolve instâncias de peças sem acesso a arquivo.
- `schemas-autoria-3d.js` — JSON Schemas descobríveis de N1/N2. A validação semântica final continua nos normalizadores e na máquina de estados; schemas são a fronteira estrutural.
- `separacao-direcional.js` — separacao-direcional.js — mede intervalos projetados sem alegar colisão geral.
- `servico-fluxo-autoria.js` — Fachada pura e serializável da N1 para clientes internos caixa-preta.
- `servico-forma-global.js` — Fachada pura da N2. Mantém contrato, compilação, medição, render e decisão atrás de uma porta única consumível sem conhecer a implementação.
- `snapshot-universo-autoria.js` — snapshot-universo-autoria.js — leitura consistente do universo de autoria.
- `texto-parametro.js` — texto-parametro.js — a troca do número no TEXTO da receita, sem tocar em disco.
- `topologia-da-malha.js` — topologia-da-malha.js — extrudar, duplicar, apagar e criar face.
- `topologia-da-malha.test.js` — topologia-da-malha.test.js — as operações que mudam a malha, medidas na peça de prova: quantas faces e vértices nascem, quem some, e o que fica no lugar. A p…
- `transformacao-rigida.js` — transformacao-rigida.js — contrato neutro de transformações rígidas.
- `varrer-parametros.js` — varrer-parametros.js — mede o que cada parâmetro faz, em vez de adivinhar.
- `veredito-de-forma.js` — veredito-de-forma.js — a saída do revisor, em vocabulário fechado.
- `veredito-de-forma.test.js` — veredito-de-forma.test.js — o veredito que não deixa a correção para o chute.
- `vinculos-de-medida.js` — vinculos-de-medida.js — o grafo de "esta medida vem daquela porta" dentro de uma montagem, e a ordem de construção que ele impõe.

## src/bancada/

- `acervo-receitas.js` — acervo-receitas.js — lista as receitas do acervo para a bancada abrir.
- `acervo-receitas.test.js` — acervo-receitas.test.js — a lista que a bancada abre vem do acervo inteiro.
- `caixa-do-visivel.js` — caixa-do-visivel.js — a caixa do que a câmera de fato mostra.
- `caixa-do-visivel.test.js` — caixa-do-visivel.test.js — o enquadramento mede só o que aparece.
- `carregar-peca.js` — carregar-peca.js — resolve somente uma entrada explícita do catálogo.
- `controlar-partes.js` — controlar-partes.js — seleção múltipla, contexto fantasma, isolamento e explosão visual.
- `controlar-partes.test.js` — controlar-partes.test.js — apresentação temporária apenas da seleção.
- `criar-ambiente.js` — criar-ambiente.js — estúdio neutro, câmeras previsíveis e enquadramento da bancada.
- `criar-selecao.js` — criar-selecao.js — raycast da bancada com seleção múltipla e foco por duplo clique.
- `edicao-de-malha.js` — edicao-de-malha.js — seleção temporária por topologia na bancada.
- `edicao-de-malha.test.js` — edicao-de-malha.test.js — topologia, conversão de seleção entre vértice, aresta e face, e o movimento aplicado à malha neutra.
- `entrada.js` — entrada.js — única entrada publicada da bancada; a aplicação não escolhe peça padrão e usa o catálogo homologado explícito, que hoje está vazio. /
- `estado-bancada.js` — estado-bancada.js — estado headless e determinístico da bancada de inspeção.
- `main.js` — main.js — bancada interativa de co-modelagem (Humano + IA): 3D, referências, parâmetros e feedback.

## src/bancada/anotacoes/

- `pinos-anotacoes.js` — pinos-anotacoes.js — marcadores 3D interativos sobre a malha e lista de notas para feedback com a IA.

## src/bancada/controles/

- `atalhos.js` — atalhos.js — catálogo de comandos de teclado da bancada, com persistência local e recusa de colisão.
- `atalhos.test.js` — atalhos.test.js — registro de atalhos de teclado da bancada.
- `gizmo-de-setas.js` — gizmo-de-setas.js — as três setas por eixo, desenhadas e clicáveis.
- `historico-parametros.js` — historico-parametros.js — o desfazer da sessão, limitado ao que a pessoa mexeu depois de abrir a peça.
- `historico-parametros.test.js` — historico-parametros.test.js — desfazer da sessão.
- `punhos-de-junta.js` — punhos-de-junta.js — o punho no canto onde as partes se encontram.

## src/bancada/preferencias/

- `estado-local.js` — estado-local.js — preferências persistentes e locais da apresentação da bancada.
- `estado-local.test.js` — estado-local.test.js — preferências visuais locais da bancada.

## src/bancada/referencias/

- `armazenamento-imagem.js` — armazenamento-imagem.js — persistência local de uma imagem de referência por alvo.
- `armazenamento-imagem.test.js` — armazenamento-imagem.test.js — isolamento de referências locais por alvo.
- `imagem-referencia.js` — imagem-referencia.js — forma validada e alinhamento lateral de referência visual.
- `imagem-referencia.test.js` — imagem-referencia.test.js — contrato do descritor e alinhamento lateral.
- `imagens-da-peca.js` — imagens-da-peca.js — as imagens que moram na pasta da peça, servidas pelo Vite.
- `imagens-da-peca.test.js` — imagens-da-peca.test.js — a imagem da peça precisa ter endereço no navegador.
- `modal-referencia.js` — modal-referencia.js — lightbox modal interativo para imagens de referência com zoom e pan.
- `painel-referencias.js` — painel-referencias.js — interface lateral para visualização de critérios de engenharia, intenção da IA e toggles de pranchas 2D.
- `prancha-overlay.js` — prancha-overlay.js — projeta pranchas técnicas 2D, contornos e blueprints como planos no espaço 3D.
- `prancha-overlay.test.js` — prancha-overlay.test.js — plano de foto é apresentação, não modelo procedural.
- `punho-da-imagem.js` — punho-da-imagem.js — arrastar a imagem de referência na cena.

## src/bancada/sessao/

- `carregar-sessao.js` — carregar-sessao.js — processa o payload de uma sessão ativa (peça ou montagem) para a cena Three.js.
- `estado-sessao.js` — estado-sessao.js — modelo canônico do estado de trabalho compartilhado entre IA e operador.
- `registro-de-eventos.js` — registro-de-eventos.js — a memória curta da bancada.
- `registro-de-eventos.test.js` — registro-de-eventos.test.js — prova que a memória curta da bancada guarda a sequência certa, junta repetição consecutiva e descarta o antigo, não o recente, …
- `sessao.test.js` — sessao.test.js — testes do motor de sessão ativa e sincronização em tempo real.
- `sincronizador.js` — sincronizador.js — gerenciador de sincronização em tempo real para a Sessão Ativa.

## tools/

- `README.md` — tools/ — ferramentas da Mecanifica e do núcleo herdado
- `gates.mjs` — gates.mjs — roda TODOS os gates e relata TODOS, em vez de parar no primeiro.

## tools/arquitetura/

- `fronteira-da-bancada.mjs` — fronteira-da-bancada.mjs — a bancada é um módulo, não o centro do projeto.
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
- `sem-sessao-no-pacote.mjs` — sem-sessao-no-pacote.mjs — a sessão ativa não vai para `dist/`.
- `sem-sessao-no-pacote.test.mjs` — sem-sessao-no-pacote.test.mjs — o pacote sai sem a sessão de quem construiu.
- `skill-criar-peca.test.ts` — skill-criar-peca.test.ts — a skill de autoria é MEDIDA contra o núcleo, não revisada no olho. Duas afirmações da `.claude/skills/criar-peca/SKILL.md` custam …
- `versao-publicada.mjs` — versao-publicada.mjs — de qual commit veio a página que está aberta.
- `versao-publicada.test.mjs` — versao-publicada.test.mjs — prova que a versão na tela diz a verdade sobre a construção, inclusive quando não há git, não há commit ou a árvore está suja.
- `visor-imports.test.mjs` — Prova a resolução de imports bare no visor legado servido sem transformação.

## tools/bancadas/bench/

- `gabarito-nucleo.mjs` — gabarito-nucleo.mjs — P5 do playground (docs/nos-herdado/playground.md): FORMA COMO NÚMERO. Lógica PURA (sem Playwright/browser — unit-testável) por trás da …
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

## tools/fixtures/

- `requisitos-da-peca-de-prova.js` — requisitos-da-peca-de-prova.js — o que uma peça precisa TER para as guardas provarem o que dizem provar.
- `requisitos-da-peca-de-prova.test.mjs` — requisitos-da-peca-de-prova.test.mjs — a régua da peça de prova mede o que as guardas realmente exigem, e reprova quando falta.

## tools/fixtures/acervo/peca-de-prova/

- `receita.js` — peca-de-prova/receita.js — a peça que as guardas de navegador usam.
- `receita.test.mjs` — receita.test.mjs — a peça de prova cumpre o que as guardas exigem dela.

## tools/fixtures/conjunto-com-submontagens/

- `executar-estudo.mjs` — Fixture de teste: um conjunto de seis peças em duas submontagens, com relações diretas e indiretas. Quem a usa é `tools/mecanifica/contexto-montagem-estudo.t…

## tools/fixtures/conjunto-com-submontagens/receitas/

- `_estudo-aro-dianteiro.js` — ESTUDO DE CAMPO — aro simplificado, separado do pneu e do cubo para testar composição e relações entre peças independentes.
- `_estudo-cubo-dianteiro.js` — ESTUDO DE CAMPO — cubo escalonado e vazado do conjunto dianteiro mínimo. A peça prova perfil de revolução e três interfaces semânticas.
- `_estudo-disco-dianteiro.js` — ESTUDO DE CAMPO — disco anular simplificado. O raio externo será alterado na segunda rodada para testar propagação de impacto até a pinça.
- `_estudo-eixo-dianteiro.js` — ESTUDO DE CAMPO — eixo simples do conjunto dianteiro mínimo. Esta peça é evidência descartável de autoria e montagem; não é ativo automotivo.
- `_estudo-pinca-dianteira.js` — ESTUDO DE CAMPO — pinça em três volumes, suficiente para tornar visível a folga radial com o disco sem fingir um tipo de relação ainda inexistente.
- `_estudo-pneu-dianteiro.js` — ESTUDO DE CAMPO — pneu simplificado, uma peça separada do aro para provar assentamento anular e inspeção visual individual.

## tools/fixtures/conjunto-do-eixo/

- `anel-tampa.js` — anel-tampa.js — anel que assenta no suporte, do conjunto de prova descrito em `eixo-guia.js`.
- `eixo-guia.js` — eixo-guia.js — a receita declarativa pequena que os testes de autoria usam. Ela tem o mínimo de que eles precisam: um cilindro, um comprimento dado por parâm…
- `materializar-catalogo.mjs` — Materializa o conjunto do eixo como catálogo MCP descartável, na pasta passada como argumento. O destino é obrigatório: gravar dentro do repositório por omis…
- `suporte-de-eixo.js` — suporte-de-eixo.js — suporte com alojamento, piloto e assento anular, do conjunto de prova descrito em `eixo-guia.js`.

## tools/fixtures/dobradica-com-extensao/

- `carregar-estudo.mjs` — Fixture de teste: uma dobradiça de três receitas compostas que usa a extensão `prisma-triangular`. Quem a usa é `tools/oficina/ensaio-ponta-a-ponta-dobradica…
- `composicoes.js` — Subgrafos privados e paramétricos do ensaio 1.0.

## tools/fixtures/dobradica-com-extensao/receitas/

- `folha-batente.js` — Receita privada: folha do batente com dois olhais.
- `folha-porta.js` — Receita privada: folha da porta com olhal central.
- `parafuso-central.js` — Receita privada: pino/parafuso passante, sem promessa de rosca helicoidal.

## tools/fixtures/montagem-com-instancias-repetidas/

- `carregar-estudo.mjs` — Fixture de teste: uma montagem de doze peças com uma submontagem de roda instanciada quatro vezes. Quem a usa é `tools/oficina/sonda-supercarro-1-0.test.mjs`…
- `composicoes.js` — Bloco privado reutilizável: volume facetado com identidade e aparência.
- `perfil-autoria.js` — Perfil privado da sonda para orçamento e tolerância de autoria visual.

## tools/fixtures/montagem-com-instancias-repetidas/receitas/

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

## tools/fixtures/tres-blocos-vinculados/

- `README.md` — Três blocos vinculados

## tools/fixtures/tres-blocos-vinculados/receitas/

- `bloco.js` — bloco.js — o bloco da fixture neutra "três blocos vinculados", nas três variações que ela usa: só pino, furo e pino, e só furo. Um arquivo só gera as três, p…

## tools/fixtures/tres-familias-com-extensao/

- `carregar-estudo.mjs` — Fixture de teste: três famílias de peça numa montagem, uma delas feita com a extensão `prisma-triangular`. Quem a usa é `tools/oficina/plataforma-procedural-…
- `composicoes.js` — Subgrafos privados do estudo R10. Não entram no catálogo de peças.

## tools/fixtures/tres-familias-com-extensao/receitas/

- `apoio-prismatico.js` — Família prismática, produzida por subgrafo declarativo privado.
- `nervura-triangular.js` — Família triangular, produzida pelo subgrafo que usa a extensão nativa.
- `pino-circular.js` — Família de revolução, executada pelo registro explícito completo da R10.

## tools/mapa/

- `citacoes.mjs` — citacoes.mjs — documento de leitura obrigatória não pode mandar abrir arquivo que não existe.
- `estrutura-docs.mjs` — estrutura-docs.mjs — sustenta a separação da documentação por quem a lê.
- `estrutura-docs.test.mjs` — estrutura-docs.test.mjs — cada gate é visto REPROVANDO antes de ser aceito.
- `gates-bateria-curta.test.mjs` — gates-bateria-curta.test.mjs — a bateria curta só roda quando tudo o que mudou é peça ou documento; qualquer outro arquivo, ou não saber o que mudou, roda to…
- `gates-espelham-ci.test.mjs` — gates-espelham-ci.test.mjs — o comando local `npm run gates` cobre tudo o que o CI executa.
- `leitura-obrigatoria.mjs` — leitura-obrigatoria.mjs — quanto uma sessão precisa LER antes de escrever a primeira linha de receita.
- `links.mjs` — links.mjs — o gate de referência: varre todo arquivo rastreado por menções a `docs/<...>.md` (caminho com barra, não prosa solta) e reprova quando o caminho …
- `mapa.mjs` — mapa.mjs — gera docs/MAPA.md: o inventário do repositório com o resumo de cada arquivo. O resumo NÃO mora aqui: mora no PRÓPRIO arquivo (primeiro comentário …
- `planos.mjs` — planos.mjs — impede que o planejamento volte a ter mais de um plano ativo ou que um plano executivo ultrapasse o limite curto acordado.
- `planos.test.mjs` — planos.test.mjs — prova que o gate recusa plano grande, estados inválidos, índice divergente e mais de um plano ativo.
- `reguas-nos-gates.mjs` — reguas-nos-gates.mjs — régua que existe precisa ser rodada por alguém.
- `reguas-nos-gates.test.mjs` — reguas-nos-gates.test.mjs — a régua órfã precisa reprovar.
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

## tools/mcp/guias/forma/

- `silhueta-e-transicoes.md` — Silhueta e transições

## tools/mcp/guias/material/

- `leitura-de-material.md` — Leitura de material

## tools/mcp/guias/processo/

- `evidencia-e-iteracao.md` — Evidência e iteração

## tools/mcp/perfis/

- `autoria-execucao.mjs` — autoria-execucao.mjs — ferramentas MCP para ativacao em tempo real na bancada e exportacao CAD/STEP.
- `autoria-execucao.test.mjs` — autoria-execucao.test.mjs — testes unitarios para ferramentas MCP ativar_bancada e exportar_step.
- `autoria-montagens.mjs` — autoria-montagens.mjs — porta MCP opt-in, fina sobre a autoria interna.
- `autoria-montagens.test.mjs` — Provas R04: MCP de autoria só atua com escopo do host e sem paths públicos.
- `autoria-receitas.mjs` — autoria-receitas.mjs — porta MCP fina para receitas declarativas.
- `autoria-receitas.test.mjs` — Contrato fino da porta MCP de autoria declarativa.
- `impacto-global.mjs` — impacto-global.mjs — adaptador MCP reduzido sobre o mapa canônico.
- `montagens.mjs` — montagens.mjs — adaptador MCP fino para leitura e auditoria de montagens.
- `parametros.mjs` — parametros.mjs — ferramentas MCP da varredura paramétrica.
- `parametros.test.mjs` — As duas ferramentas da varredura vistas pela porta MCP.
- `procedural.mjs` — procedural.mjs — adaptador MCP fino sobre o serviço puro de descoberta.
- `revalidacao.mjs` — revalidacao.mjs — porta MCP Agent-First sobre campanhas persistidas.
- `revalidacao.test.mjs` — Prova R04: consumidor caixa-preta, nova sessão e escrita segura por IDs.
- `revisao.mjs` — revisao.mjs — adaptador MCP fino para os serviços existentes de modelagem.

## tools/mecanifica/

- `absorver-ajuste.mjs` — absorver-ajuste.mjs — a régua da rodada de absorção.
- `adaptar-montagem-three.test.ts` — Prova que a visualização de montagem deriva somente da árvore resolvida.
- `adaptar-three.test.ts` — adaptar-three.test.ts — prova headless da fronteira entre o núcleo procedural herdado e Three.js.
- `alinhar-modelagem.test.mjs` — alinhar-modelagem.test.mjs — a rodada de alinhamento continua colada ao formato que ela produz.
- `alterar-montagem.test.ts` — alterar-montagem.test.ts — alteração semântica compacta de montagem.
- `alvo-chassi-p0.mjs` — alvo-chassi-p0.mjs — o ALVO do P0 como dado, separado de quem desenha.
- `analise-da-peca.mjs` — analise-da-peca.mjs — o passo "Pare e analise": a matriz de vistas que a IA precisa olhar antes de declarar uma forma pronta, o manifesto que prova que ela f…
- `analise-da-peca.test.mjs` — analise-da-peca.test.mjs — a matriz do "Pare e analise", o manifesto e o zoom.
- `argumentos.mjs` — argumentos.mjs — leitura de linha de comando dos CLIs da Mecanifica, com a MESMA lei que o núcleo de autoria aplica a uma referência: bandeira desconhecida, …
- `argumentos.test.ts` — Contratos mínimos do parser compartilhado e recusas pré-navegador.
- `ativar-bancada.mjs` — ativar-bancada.mjs — ativa qualquer peca ou montagem procedural na sessao ativa da bancada 3D.
- `ativar-bancada.test.mjs` — ativar-bancada.test.mjs — grito do motor é RECUSA, e não decoração no rodapé.
- `auditar-intersecoes-montagem.test.ts` — @ts-expect-error — serviço neutro JavaScript exercitado pelo contrato público.
- `autoria-ativa.mjs` — autoria-ativa.mjs — provedores neutros para revisões imutáveis ativas.
- `autoria-ativa.test.mjs` — autoria-ativa.test.mjs — continuidade autorizada e falha fechada.
- `autoria-montagem.mjs` — autoria-montagem.mjs — planejamento e aplicação interna de montagens v1/v2/v3.
- `autoria-montagem.test.ts` — Provas R02: planejar, confirmar, validar e materializar montagem persistida.
- `autoria-receita.mjs` — autoria-receita.mjs — autoria declarativa de receitas, sem avaliar JavaScript.
- `autoria-receita.test.ts` — Provas da autoria declarativa de receita sem JavaScript do agente.
- `caminho-confinado.mjs` — caminho-confinado.mjs — guarda de escrita para artefatos que um CLI aceita por caminho. A checagem lexical sozinha não basta: um diretório relativo pode cont…
- `caminho-confinado.test.ts` — caminho-confinado.test.ts — prova do confinamento sem precisar criar links.
- `caminho-procedural.test.ts` — caminho-procedural.test.ts — a raiz procedural é neutra: não volta a `fps`, que era o nome do jogo removido, nem a `prototipos`, que dizia experimento sobre …
- `capacidade-symlink.mjs` — capacidade-symlink.mjs — este ambiente consegue criar vínculo simbólico?
- `capturar-montagem.mjs` — capturar-montagem.mjs — serviço importável de vistas de montagem em memória.
- `capturar-montagem.test.ts` — @ts-expect-error — resolvedor JavaScript público, exercitado pelo contrato.
- `catalogo-pecas.test.ts` — catalogo-pecas.test.ts — catálogo vazio é estado válido; IDs e carregadores continuam sendo contratos explícitos quando uma peça voltar a ser publicada. /
- `comparar-alvo.mjs` — comparar-alvo.mjs — sobrepõe a silhueta do MODELO ao DESENHO ALVO, em milímetros, na mesma origem e na mesma escala.
- `conferir-contra-referencia.mjs` — conferir-contra-referencia.mjs — desvio em MILÍMETRO entre a silhueta lateral de partes de uma peça e a borda correspondente de uma foto de referência.
- `conferir-contra-referencia.test.mjs` — A REFERÊNCIA É A SILHUETA DA PRÓPRIA PEÇA DE PROVA, desenhada a partir da malha dela e guardada ao lado da receita. Uma foto de conteúdo faria este teste dep…
- `conferir-juntas.mjs` — conferir-juntas.mjs — ferramenta de medição e diagnóstico de interfaces de contato entre componentes de uma peça procedural.
- `conferir-juntas.test.ts` — conferir-juntas.test.ts — testes para a ferramenta de medição e diagnóstico de juntas.
- `conferir-malha.mjs` — conferir-malha.mjs — um comando que responde as três perguntas de malha sobre uma receita: o traçado está bom, sobra alguma coisa, e ela sai para um motor de…
- `conferir-pontos.mjs` — conferir-pontos.mjs — mede os PONTOS DECLARADOS de uma peça contra a malha que a receita produz, e devolve o desvio de cada um em milímetro.
- `contexto-montagem-estudo.test.ts` — Repete R001/R002 no descritor de contexto e mede a economia Agent-First.
- `contorno-da-imagem.mjs` — contorno-da-imagem.mjs — a porta de linha de comando do módulo `modulos/contorno-da-imagem`, que separa as partes de uma imagem de referência por watershed c…
- `contorno-da-imagem.test.mjs` — contorno-da-imagem.test.mjs — o contorno sai da imagem, igual nas duas execuções, separa partes do mesmo cinza e recusa semente fora da parte.
- `cor-auditoria.test.ts` — cor-auditoria.test.ts — a cor de auditoria é ENDEREÇO, não enfeite.
- `derivar-campanha-revalidacao.mjs` — derivar-campanha-revalidacao.mjs — ponte R02 entre impacto global e R01.
- `derivar-campanha-revalidacao.test.ts` — Provas R02: compartilhamento, múltiplas raízes, isolamento e persistência.
- `derivar-catalogo-montagens.test.ts` — Prova catálogo global confinado às raízes explicitamente resolvidas.
- `derivar-impacto-montagem.test.ts` — Prova mapa de impacto local, direto, indireto e determinístico.
- `derivar-roteiro-revalidacao.test.ts` — Prova roteiro de revalidação assistida, sem correção ou veredito global.
- `descrever-gesto.mjs` — descrever-gesto.mjs — ler a edição da bancada em palavras, antes de reescrever.
- `descrever-montagem-persistida.mjs` — descrever-montagem-persistida.mjs — CLI confinada do contexto JSON para IA.
- `descrever-montagem-persistida.test.ts` — Prova a CLI confinada que descreve montagem persistida arbitrária em JSON.
- `descrever-montagem.mjs` — descrever-montagem.mjs — lê uma montagem piloto e imprime o diagnóstico declarativo do encaixe. Não abre renderizador, não aplica pose e não conhece automóve…
- `descrever-partes.test.ts` — Contrato de medição headless exercitado por fixtures de capacidade. O catálogo publicado pode estar vazio; a régua recebe um módulo explícito.
- `descrever-peca.mjs` — descrever-peca.mjs — serviço headless de medição e sua CLI fina.
- `diario.mjs` — diario.mjs — registra o que as ferramentas do laço fizeram, sem pedir nada a quem as usa.
- `diario.test.mjs` — diario.test.mjs — o instrumento não pode mudar o que ele mede.
- `enquadramento-bancada.test.ts` — enquadramento-bancada.test.ts — prova pura do gate visual da bancada.
- `esboco-referencia.mjs` — Lê as referências do esboço para o módulo `modulos/esboco`, que não lê arquivo: um JSON de contornos da imagem (`mecanifica.contornos@1`, o que `npm run cont…
- `esboco.mjs` — Linha de comando do esboço: lê `<nome>.esboco.json`, desenha as opções lado a lado com modulos/esboco e grava `<nome>.svg` e `<nome>.png` ao lado. Uso: npm r…
- `estado-bancada.test.ts` — estado-bancada.test.ts — contrato headless das vistas, seleção, contexto e URL da bancada.
- `estudo-campo-revalidacao.test.ts` — R05: estudo de campo sobre uma peça compartilhada em duas raízes.
- `etapas-da-montagem.mjs` — etapas-da-montagem.mjs — o registro de etapas de uma montagem v5, em disco, e a única porta para fixar uma etapa.
- `etapas-da-montagem.test.mjs` — etapas-da-montagem.test.mjs — a porta que fixa etapa. Fixar exige a etapa ser a próxima, o crítico ter fechado a peça dela, a nota de passagem, as juntas pas…
- `etapas-de-construcao.test.mjs` — etapas-de-construcao.test.mjs — fatia 3 do plano "a peça nasce encaixada": o registro de etapas, a junta medida quando a parte entra e a recusa de seguir com…
- `executar-receita.test.ts` — executar-receita.test.ts — prova a fronteira pura sem carregar catálogo.
- `exportar-obj.mjs` — exportar-obj.mjs — CLI para exportação atômica e segura de receitas procedurais em Wavefront OBJ (.obj).
- `exportar-obj.test.mjs` — exportar-obj.test.mjs — suíte de testes da CLI de exportação OBJ.
- `exportar-peca.mjs` — exportar-peca.mjs — A-60: o núcleo roda AQUI e grava o resultado; o produto só lê.
- `exportar-peca.test.ts` — Exportação: contrato do artefato e estado sem catálogo publicado.
- `exportar-step.mjs` — exportar-step.mjs — CLI para exportação atômica e segura de receitas procedurais em formato STEP.
- `exportar-step.test.mjs` — exportar-step.test.js — suíte de testes da CLI de exportação STEP e escrita segura.
- `exportar.mjs` — exportar.mjs — a linha de comando do A-60.
- `ferramentas-sobre-uniao.test.ts` — ferramentas-sobre-uniao.test.ts — fatia 5 do plano "União de sólidos": as ferramentas que leem a peça funcionam sobre uma malha unida. A fixture é neutra (`f…
- `fluxo-autoria-n1-caixa-preta.test.mjs` — Prova caixa-preta N1.2: schemas, cobertura real e diagnóstico sem acesso oculto.
- `fluxo-autoria-n1.test.ts` — Provas executáveis da N1.1: contratos, provedores, fluxo e falha segura.
- `forma-global-n2-caixa-preta.test.mjs` — Prova N2 por uma única fachada pública, sem importar a implementação.
- `gerar-evidencias-forma-global-n2.mjs` — Gera o pacote reexecutável da prova N2 a partir de duas fontes versionadas. SVG/PNG são derivados; alvo e andaime continuam sendo a autoria.
- `gerar-schemas-autoria-3d.mjs` — Gera ou confere o índice estático dos schemas públicos da autoria 3D N1.
- `hierarquia-partes.test.ts` — hierarquia-partes.test.ts — árvore semântica sem Three.js ou geometria.
- `impacto-global.test.ts` — impacto-global.test.ts — provas da R03 sobre o mapa canônico v1.
- `importar-receita.mjs` — importar-receita.mjs — import dinâmico de receita SEM cache obsoleto.
- `intencao-peca.test.ts` — @ts-expect-error — contrato JavaScript puro da autoria.
- `ler-diario.mjs` — ler-diario.mjs — lê o diário da oficina e responde onde o tempo foi e onde o trabalho emperrou.
- `ler-montagem-persistida-v3.test.ts` — Prova o contrato estrutural v3 sem alterar a leitura fechada de v1/v2.
- `mapa-dependencias.test.ts` — mapa-dependencias.test.ts — provas da R02 sobre o snapshot da R01.
- `material-da-peca.mjs` — material-da-peca.mjs — imprime tudo que pertence a uma peça e onde está.
- `material-da-peca.test.mjs` — material-da-peca.test.mjs — o retrato do espalhamento, antes de arrumar.
- `mcp-degrau-1-preparacao.test.mjs` — Provas da fatia preparatória: importação silenciosa, serviço estruturado e limpeza.
- `montagem-persistida.test.ts` — @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
- `normais-lisas.test.ts` — normais-lisas.test.ts — a borda do furo serrilhava na bancada, e a peça não tinha culpa: o `freio-disco` já usa 12 lados no furo do prisioneiro e já marca a …
- `objeto.mjs` — objeto.mjs — em que etapa do fluxo um objeto está, e o que vem a seguir.
- `objeto.test.mjs` — objeto.test.mjs — a ferramenta lê cada etapa do fluxo no disco e aponta a primeira que falta.
- `olhar-bancada.mjs` — olhar-bancada.mjs — serviço headless de vistas e sua CLI fina.
- `olhar-bancada.test.mjs` — olhar-bancada.test.mjs — validação antecipada de peças e mitigação de timeout em capturas headless.
- `olhar-montagem.mjs` — olhar-montagem.mjs — CLI fina sobre captura importável de montagem.
- `olhar.mjs` — olhar.mjs — rasteriza SVGs para PNG, para que a IA OLHE o desenho.
- `ombro-uniao.test.ts` — ombro-uniao.test.ts — a rodada do ombro do plano "União de sólidos": a união e o arredondamento sobre superfícies CURVAS facetadas. A fixture (`fixtures/fixt…
- `origens-check.mjs` — origens-check.mjs — quem declara de onde vieram os números, declara todos.
- `papeis-do-laco.test.mjs` — papeis-do-laco.test.mjs — os papéis do laço continuam separados e genéricos.
- `parametros-peca.mjs` — parametros-peca.mjs — responde o que dá para mexer numa receita.
- `parametros-peca.test.mjs` — Prova de R00: liberdade declarada não é liberdade real, e a diferença é conferível. O número do acervo fica travado aqui de propósito — se alguém ligar uma r…
- `partes-de-objeto.test.mjs` — partes-de-objeto.test.mjs — um objeto de várias partes é uma pasta com as partes dentro de `partes/`, e cada ferramenta acha a parte pelo nome curto `objeto/…
- `pasta-da-peca.test.mjs` — pasta-da-peca.test.mjs — a peça passa a poder ser uma pasta.
- `peca-com-parametros.mjs` — peca-com-parametros.mjs — executa uma receita com parâmetros trocados e devolve a peça resolvida que o resolvedor de montagem lê.
- `percepcao-superficie.mjs` — Canal C1: diagnostico de continuidade de superficie, sem dependencia do motor. Ele nao julga se algo "parece um carro"; apenas torna variacao de normal visiv…
- `percepcao-superficie.test.mjs` — Provas unitárias do canal C1 de percepção de superfície.
- `portas-espelho-arranja.test.ts` — portas-espelho-arranja.test.ts — prova adversarial de AUT-2026-15: uma interface não pode permanecer no espaço da fonte quando a sua geometria foi copiada. C…
- `procedencia-check.mjs` — Gate N3: contrato reduzido e explícito de procedência da fonte de restrições.
- `procedencia-check.test.mjs` — Provas do gate N3 para procedência de valores estruturais.
- `qualificacao-alvo.test.mjs` — qualificacao-alvo.test.mjs — contrato que separa intenção de medição 3D.
- `repositorio-autoria.mjs` — repositorio-autoria.mjs — revisões imutáveis com commit como fronteira de visibilidade.
- `repositorio-autoria.test.ts` — Prova publicação imutável, falha recuperável e conflito explícito.
- `repositorio-revalidacao.mjs` — repositorio-revalidacao.mjs — persistência R01 sobre o repositório transacional existente.
- `repositorio-revalidacao.test.ts` — Provas R01: persistência canônica, retomada, idempotência e conflito.
- `resolver-caminho-receita.mjs` — resolver-caminho-receita.mjs — localizador flexível de receitas com confinamento seguro
- `resolver-caminho-receita.test.mjs` — resolver-caminho-receita.test.mjs — testes unitários para resolução flexível e segura de receitas procedurais.
- `revalidacao-cascata-r00.test.ts` — Provas executáveis da R00: identidade, estados, obsolescência e concorrência.
- `revalidacao-resultados.test.ts` — Provas R03: resultado vinculado, histórico, obsolescência e CAS persistidos.
- `rodada-de-modelagem.mjs` — rodada-de-modelagem.mjs — registra uma rodada do laço e diz o que vem agora.
- `rodada-de-modelagem.test.mjs` — rodada-de-modelagem.test.mjs — o registro do laço, de ponta a ponta.
- `rodadas-com-critico.mjs` — rodadas-com-critico.mjs — as rodadas entre quem produz e o crítico gravadas em disco, com a regra do módulo `contorno-da-imagem`: nota 9 fecha, abaixo volta,…
- `rodadas-com-critico.test.mjs` — rodadas-com-critico.test.mjs — o aceite humano grava quem, quando, a última nota, os defeitos abertos e as pendências, fecha a série, recusa aceite sem autor…
- `separacao-direcional.test.ts` — Prova separação direcional genérica em peça, parte e montagem recursiva.
- `snapshot-universo-autoria.test.ts` — snapshot-universo-autoria.test.ts — provas da R01.
- `transformacao-rigida.test.ts` — @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
- `universo-autoria.mjs` — universo-autoria.mjs — adaptador confinado do snapshot do universo.
- `universo-autoria.test.ts` — universo-autoria.test.ts — contrato estrutural e fixture adversarial da R00.
- `varrer-peca.mjs` — varrer-peca.mjs — CLI da varredura paramétrica.
- `varrer-peca.test.mjs` — Prova de R01: a varredura reproduz, sem dica nenhuma, o achado que motivou o plano — e nunca aplica o vencedor que encontra.
- `vinculos-de-medida.test.mjs` — vinculos-de-medida.test.mjs — fatias 1, 2 e 2b do plano "a peça nasce encaixada": formato v5 da montagem, ordem de construção, arestas de medida no mapa, e a…
- `visor-montagem.html` — visor-montagem.html — superfície privada para evidência visual de montagem.
- `visor-montagem.js` — visor-montagem.js — renderizador privado, derivado de montagem já resolvida.
- `vistas-para-critica.mjs` — vistas-para-critica.mjs — monta, numa chamada, o pacote de imagens que a crítica visual precisa receber.
- `vistas-para-critica.test.mjs` — vistas-para-critica.test.mjs — o prefixo que apaga as imagens velhas pega só as da peça pedida.

## tools/mecanifica/fixtures/

- `fixture-cubo.js` — fixture-cubo.js — receita procedural de teste para exportação CAD/STEP.
- `fixture-erro.js` — fixture-erro.js — receita procedural propositalmente sem partes para teste de falha.
- `fixture-ombro-uniao.js` — fixture-ombro-uniao.js — fixture neutra copiada em 2026-09-29 do ombro do braço robótico (procedural/pecas/braco-robotico/partes/ombro/receita.js), para os t…
- `fixture-uniao.js` — fixture-uniao.js — fixture neutra da fatia 5 do plano "União de sólidos": uma coluna e um braço unidos por `unir`, pousados numa base. Prova que as ferrament…

## tools/mecanifica/fixtures/contatos/

- `fixture-contato-declarado.js` — Duas partes que se encostam, e a receita DIZ que se encostam. Passa. É a metade do gate que impede a medida de condenar peça correta.
- `fixture-contato-nao-declarado.js` — A MESMA geometria da fixture declarada, sem a declaração. Reprova. O par é idêntico: o que muda é só a receita ter dito ou não.
- `fixture-forma-anel-cumprida.js` — A receita promete um ANEL e entrega um anel. Passa. `lathe` revolve um perfil fechado: o resultado tem furo passante.
- `fixture-forma-anel-quebrada.js` — A MESMA promessa de anel da fixture cumprida, entregue como sólido SEM furo passante. Reprova por forma, e só por forma.
- `fixture-parte-engolida.js` — O caso da roda, em miniatura: uma parte inteiramente dentro da outra. Nenhuma superfície aparece de fora, e por isso nenhuma vista mostra.

## tools/mecanifica/guardas/

- `guarda-acervo.mjs` — guarda-acervo.mjs — roda o veredito completo sobre TODO o acervo.
- `guarda-acervo.test.mjs` — guarda-acervo.test.mjs — a polaridade do veredito de contato.
- `guarda-bancada-vazia.mjs` — guarda-bancada-vazia.mjs — prova o estado publicado sem catálogo.
- `guarda-camera-livre.mjs` — guarda-camera-livre.mjs — prova real: uma órbita da bancada vira URL e a URL volta igual.
- `guarda-edicao-de-malha.mjs` — guarda-edicao-de-malha.mjs — o modo de edição existe na tela e responde.
- `guarda-escolha-da-peca.mjs` — guarda-escolha-da-peca.mjs — a escolha de quem está na bancada não é desfeita pelo relógio.
- `guarda-gesto.mjs` — guarda-gesto.mjs — o que a pessoa desenhou sai da bancada e chega legível.
- `guarda-inspecao-par.mjs` — guarda-inspecao-par.mjs — prova real de que duas partes recebem vista legível e URL reproduzível.
- `guarda-junta-da-bancada.mjs` — guarda-junta-da-bancada.mjs — arrastar o canto deforma só quem passa por ele.
- `guarda-portas-bancada.mjs` — guarda-portas-bancada.mjs — a PROVA PELO OLHO DA BANCADA do painel de PORTAS: abrir `bancada.html` numa peça que publica portas mostra as portas na tela, e a…
- `guarda-referencia-da-peca.mjs` — guarda-referencia-da-peca.mjs — a PROVA PELO OLHO de que a imagem da peça chega ao navegador a partir da PASTA DA PEÇA.
- `guarda-referencial.mjs` — guarda-referencial.mjs — confere que toda peça do acervo usa o MESMO referencial e está apoiada acima do chão.

## tools/mecanifica/prancha/

- `prancha-autoria.mjs` — Contrato curto entre a intenção declarada e o vetor que o motor desenha. Ele não tenta adivinhar confiança: exige que a IA exponha fonte, limite e bloqueio p…
- `prancha-chassi-p0.mjs` — prancha-chassi-p0.mjs — especificação da prancha ortográfica ALVO da rodada P0 do chassi realista, desenhada por tools/mecanifica/prancha.mjs. Não é a projeç…
- `prancha-cupe-cunha.mjs` — prancha-cupe-cunha.mjs — prova R5 do plano do motor de prancha: uma carroceria ficcional desenhada do zero com âncora proporcional, traçado por filete e julg…
- `prancha-dos-contornos.mjs` — prancha-dos-contornos.mjs — a prancha lateral desenhada com os contornos que `npm run contorno` tirou da imagem de referência, em milímetro.
- `prancha-dos-contornos.test.mjs` — prancha-dos-contornos.test.mjs — a prancha da lateral do braço sai dos contornos gravados, sem parte fora da silhueta e sem a parte fora do modelo.
- `prancha-geometria.mjs` — prancha-geometria.mjs — traçado 2D em milímetros para as pranchas ortográficas. Tudo aqui devolve POLILINHA AMOSTRADA, nunca comando de SVG: é essa decisão q…
- `prancha-r4-independente.mjs` — Prancha R4, escrita sem reutilizar as receitas P0 ou cupê. É um briefing ficcional completo: o arquivo é a autoria declarativa, não uma malha.
- `prancha-r4-independente.test.mjs` — prancha-r4-independente.test.mjs — prova fria e mutações da prancha R4.
- `prancha-referencia.mjs` — prancha-referencia.mjs — lê uma prancha rasterizada de referência, calibra pixel→milímetro por duas medidas conhecidas e extrai a silhueta como polilinha em …
- `prancha-referencia.test.mjs` — Testes do leitor de referência: decodificação PNG sem dependência, calibração por rodas, simplificação e comparação de silhueta. A prancha real não vive no r…
- `prancha.mjs` — prancha.mjs — motor de prancha ortográfica alvo. Recebe especificação declarativa em milímetros e devolve SVG determinístico MAIS um relatório medido da próp…
- `prancha.test.mjs` — Testes do motor de prancha: filete, âncora proporcional e métrica. O que se prova aqui é o que o plano 2026-08-19-motor-de-prancha-medida pediu — que o desen…

## tools/modelagem/

- `aceite-visual-regional.mjs` — aceite-visual-regional.mjs — v2 do aceite: evidência por região e papel. A v1 continua em aceite-visual.mjs, com suas quatro vistas globais intactas.
- `aceite-visual-regional.test.mjs` — aceite-visual-regional.test.mjs — prova cobertura regional, hashes e crítica obrigatória no aceite v2.
- `aceite-visual.mjs` — aceite-visual.mjs — porteiro de vínculo entre revisão, briefing e evidências visuais.
- `aceite-visual.test.mjs` — aceite-visual.test.mjs — corpus de vínculo, bytes e reprovações visuais.
- `analisar-calibracao-critico.mjs` — Estatística P0-C: mede respostas já ingeridas; não chama nem simula um crítico externo.
- `analisar-calibracao-critico.test.mjs` — Estatística P0-C: quatro respostas por item e bootstrap por objeto, não por apresentação.
- `calibracao-critico-cli.mjs` — Porta offline para enviar estímulos e reingressar respostas sem chamar rede/modelo.
- `calibracao-critico-cli.test.mjs` — CLI offline: separa lote público, chave local e respostas para auditoria.
- `caminho-repositorio.mjs` — caminho-repositorio.mjs — resolução portátil e confinada de repo://.
- `caminho-repositorio.test.mjs` — caminho-repositorio.test.mjs — confinamento de evidências repo:// portátil.
- `comparar-revisao.mjs` — CLI fino: lê dois JSONs, usa somente o núcleo puro e escreve JSON canônico.
- `contrato-julgamento-critico.mjs` — Resposta de crítico externo: dados assinados, nunca veredito inferido localmente.
- `contrato-julgamento-critico.test.mjs` — Contrato assinado que mantém o julgamento externo rastreável.
- `critica-modelagem.mjs` — CLI fino: valida crítica sem abrir navegador, peça ou Oficina.
- `critica-visual.test.mjs` — crítica-visual.test.mjs — contrato neutro e reexecutável de achados visuais.
- `despachar-consulta-visual.mjs` — Materializa um despacho visual mínimo. Não é sandbox de modelo: prova os bytes entregues, e deixa explícito que isolamento do processo é outra camada.
- `despachar-consulta-visual.test.mjs` — despachar-consulta-visual.test.mjs — prova que o despacho entrega somente a consulta declarada e íntegra.
- `fechar-aceite-visual.mjs` — fechar-aceite-visual.mjs — fecha tecnicamente uma revisão privada só após conferir briefing, modelo, arquivos e crítica pelo porteiro visual.
- `fechar-aceite-visual.test.mjs` — fechar-aceite-visual.test.mjs — o fechamento não concede aceite retroativo.
- `formato-pacote.mjs` — formato-pacote.mjs — contrato pequeno, estrito e canônico do pacote de modelagem assistida. Não conhece Three.js, domínio automotivo ou runtime de navegador:…
- `gerar-canario-geometrico-p0.mjs` — Canário P0: fixture sintética calibrada para provar o fluxo de fitting.
- `gerar-canario-geometrico-p0.test.mjs` — Canário P0: prova o contrato calibrado, não qualidade de modelagem.
- `gerar-corpus-p0.mjs` — Gera controles visuais sintéticos P0. Não representa produto, veículo ou humanoide aprovados.
- `gerar-corpus-p0.test.mjs` — Corpus sintético P0: estímulos rastreáveis para calibrar crítico, não modelos de produto.
- `orquestrar-calibracao-critico.mjs` — Transporte offline: exporta estímulos cegos e ingere respostas assinadas.
- `orquestrar-calibracao-critico.test.mjs` — Lote cego: o transporte não revela gabarito e exige cobertura completa.
- `orquestrar-revisao-regional.mjs` — Caminho único R1A: despacho mínimo, revisor limitado e crítica persistida.
- `orquestrar-revisao-regional.test.mjs` — orquestrar-revisao-regional.test.mjs — fixa a ordem despacho, revisão limitada e crítica persistida.
- `preparar-pacote.mjs` — preparar-pacote.mjs — cria só o esqueleto canônico; uma pasta já existente é sempre erro. Assim, uma segunda tentativa nunca apaga briefing ou crítica.
- `revisao-modelagem.mjs` — Revisão de modelagem — núcleo puro do ciclo assistido por IA.
- `revisar-pacote.mjs` — revisar-pacote.mjs — marco 2 do fluxo assistido: a única ponte entre o pacote, a régua headless e as quatro câmeras da bancada.
- `revisor-limitado.mjs` — Revisor visual em processo separado. O pai libera leitura apenas do próprio programa e do despacho; a criança prova que não alcança outro arquivo.
- `revisor-limitado.test.mjs` — revisor-limitado.test.mjs — prova leitura do despacho e recusa de acesso externo pelo crítico Node.
- `validar-corpus-avaliacao.mjs` — Contrato local do corpus P0; não chama modelo nem infere qualidade visual.
- `validar-corpus-avaliacao.test.mjs` — O corpus P0 só fica elegível após cobertura, isolamento e quatro julgamentos cegos.
- `validar-pacote.mjs` — validar-pacote.mjs — porta fail-closed do marco 1. Lê, exige bytes canônicos e confere o alvo com a régua headless assim que a fonte canônica existir.

## tools/oficina/

- `argumento-desconhecido.test.mjs` — Argumento fora do contrato da operação GRITA, e o passo não roda.
- `busca-vazia-diz-por-que.test.mjs` — Busca que volta vazia diz por quê.
- `chao-do-ciclo6.test.ts` — chao-do-ciclo6.test.ts — caso vermelho da quinta propriedade: um triângulo emitido pode ter área zero mesmo com núcleo, adaptador e casca saudáveis.
- `conferir-malha.ts` — conferir-malha.ts — a conferência única que todo teste de op nova chama.
- `ensaio-ponta-a-ponta-dobradica.test.mjs` — Primeira sonda 1.0: autoria, composição, exportação, montagem e revisão.
- `filete-v2-aceitacao.mjs` — filete-v2-aceitacao.mjs — gate de descoberta do arredondamento real. Não entra em `npm test` enquanto o v2 não existir: hoje ele precisa FALHAR, exibindo a l…
- `furo-ordens-de-ponte.test.ts` — furo-ordens-de-ponte.test.ts — as promessas do A-30 que a geometria sozinha não mostra.
- `oficina.test.ts` — Vitest do NÚCLEO da OFICINA (passo 1): prova os invariantes de identidade — numeração determinística e POSICIONAL (re-rodar dá ids idênticos), identidade est…
- `plataforma-procedural-campo-r10.test.mjs` — Campo R10: três famílias, composição, extensão, montagem e duas vistas por alvo.
- `sonda-supercarro-1-0.test.mjs` — Sonda de escala 1.0: sistema exterior ficcional, privado e recursivo.

## tools/testes/

- `nenhum-teste-desligado.test.mjs` — nenhum-teste-desligado.test.mjs — recusa teste desligado para sempre.
