# MAPA — inventário da Mecanifica, arquivo por arquivo

> **GERADO** por `npm run mapa` — não edite à mão. O resumo de cada arquivo
> mora no próprio arquivo (primeiro comentário; H1 nos `.md`); isto é a
> projeção. `npm run mapa:check` (CI) falha se isto estiver velho ou se
> algum arquivo-fonte estiver sem cabeçalho.

344 arquivos (código `.js .mjs .cjs .ts .tsx .html` + docs `.md`).

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
- `ARQUITETURA.md` — Arquitetura atual
- `ATRITOS-AUTORIA.md` — Atritos de autoria — resumo atual
- `AUTORIA-IA.md` — Autoria assistida por IA
- `AUTORIA-RECEITA-DECLARATIVA.md` — Autoria de receita declarativa
- `BANCADA-E-APRESENTACAO.md` — Bancada e apresentação
- `CONJUNTO-PROVA-AUTORIA-GEOMETRICA.md` — Conjunto de prova — autoria geométrica do zero
- `CONTEXTO-MONTAGEM-IA.md` — Contexto de montagem para IA
- `CONTEXTO-VISUAL-REVALIDACAO.md` — Contexto visual, revalidação e catálogo de montagem
- `CONTINUIDADE-ARQUITETURAL.md` — Continuidade arquitetural da Mecanifica
- `COORDENACAO-LOCAL.md` — Coordenação local entre agentes
- `COORDENACAO-REPOS.md` — Coordenação entre os repositórios Mecanifica
- `ESCRITA-TRANSACIONAL-MONTAGEM.md` — Escrita transacional de montagem
- `FILETE-V2.md` — Filete v2 — Escopos A e B implementados
- `FLUXO-MODELAGEM-IA.md` — Fluxo de modelagem assistida por IA v4
- `HOMOLOGACAO-FLUXO-IA.md` — Homologação do fluxo de IA
- `INDEX.md` — Mecanifica — entrada atual
- `MAPA-CANONICO-DEPENDENCIAS.md` — Mapa canônico de dependências
- `MONTAGEM-PERSISTIDA-V1.md` — Montagem persistida v1
- `MONTAGEM-PERSISTIDA-V2.md` — Montagem persistida v2
- `MONTAGEM-PERSISTIDA-V3.md` — Montagem persistida v3 e impacto local
- `MONTAGENS-SEMANTICAS.md` — Montagens semânticas
- `PERFIS-DE-AUTORIA.md` — Perfis de autoria
- `PLANO.md` — Plano mestre da Mecanifica — aposentado
- `PRANCHA-FREIO-DISCO.md` — Prancha de referência — freio a disco dianteiro
- `PRANCHA-RODA-DIANTEIRA.md` — Prancha de referência — roda dianteira
- `PROTOCOLO-DIAGNOSTICO-MOTOR.md` — Protocolo detalhado — diagnóstico do motor procedural
- `REFERENCIA-E-CRITICA-VISUAL.md` — Referência e crítica visual — protocolo de modelagem
- `RELATORIO-ANALISE-GRANDES-MELHORIAS.md` — Análise — estado e grandes melhorias
- `RELATORIO-DIAGNOSTICO-MOTOR.md` — Relatório — diagnóstico do motor procedural
- `RELATORIO-ESTUDO-CAMPO-CONJUNTO-DIANTEIRO.md` — Relatório — estudo de campo do conjunto dianteiro
- `RELATORIO-EXPERIMENTO-AUTORIA-GEOMETRICA.md` — Relatório — experimento de autoria geométrica do zero
- `UPSTREAM-NOS.md` — Capacidades candidatas ao NÓS
- `VISAO.md` — Visão da Mecanifica

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
- `2026-08-14-separacao-direcional-e-impacto-local.md` — Separação direcional e impacto local de montagem
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

## prototipos/fps/v3/

- `README.md` — v3 — núcleo procedural, peças e visor
- `visor.html` — visor.html — visor de peças da OFICINA (D-55): abre qualquer peça de pecas/ isolada no ambiente padrão (?peca=nome).

## prototipos/fps/v3/gabaritos/

- `_viga.js` — GABARITO do P5 do playground: o contorno de referência da `_viga` (pecas/_viga.js) no ângulo padrão 38° — o formato do P5 (docs/ playground.md): pontos [x,y]…

## prototipos/fps/v3/montagens/

- `anel-e-faixa.js` — anel-e-faixa.js — fixture neutra de assentamento anular. Dois corpos de revolução declaram zonas concêntricas, sem conhecer roda, pneu, freio ou Three.js; el…
- `pino-e-luva.js` — pino-e-luva.js — fixture neutra do encaixe cilíndrico. Não conhece roda, freio ou Three.js: dois corpos rígidos simples publicam as mesmas interfaces que o p…
- `roda-no-freio.js` — roda-no-freio.js — declaração de montagem do piloto AUT-05. Ela reúne duas receitas já existentes numa pose manual conhecida e declara UMA relação de encaixe…

## prototipos/fps/v3/motor/

- `expressoes.js` — expressoes.js — aritmética determinística e fechada para parâmetros da Oficina. A expressão só existe em um campo numérico e sempre começa com `=`. Ela aceit…
- `geo.js` — helpers de GEOMETRIA do motor v3 (D-55): malha = lista chata de vértices (pos xyz, uv, normal) — 8 floats por vértice, triângulos soltos.
- `mat4.js` — mat4 mínimo do motor v3 (D-55) — colunas-major, como o WebGL espera
- `oficina.js` — oficina.js — NÚCLEO + ADAPTADOR v3 da OFICINA (passo 1). Executa a lista de PASSOS de uma peça-objeto e devolve o objeto pronto pro visor. Duas camadas nítid…
- `referencia-posicional.js` — referencia-posicional.js — A REGRA ÚNICA de "isto é referência por id posicional?", para o formato salvo da Oficina.
- `render.js` — O VISOR do motor v3 (D-55) — o ambiente PADRÃO onde toda peça é criada e auditada: framebuffer fixo (?res) com upscale NEAREST (pixel art, custo independente…
- `tex.js` — helpers de TEXTURA do motor v3 (D-55) — paleta Resurrect64, ruído, dither e o gerador de canvas. Uma peça pode devolver índice da paleta OU [r,g,b] direto (m…

## prototipos/fps/v3/pecas/

- `_bloco-arredondado-composto.js` — PEÇA DE EXERCÍCIO — prova não automotiva do A-37. Um bloco com chanfros recebe uma faixa de raio numa aresta cuja ponta encontra canto composto. Ela existe p…
- `_caixote-filetado.js` — PEÇA DE EXERCÍCIO do ciclo "Curva e filete v1": só existe por causa da op `filete` (motor/oficina.js), a metade "filete" do gate desse ciclo — a metade "curv…
- `_cerca-e-flor.js` — PEÇA DE EXERCÍCIO — a prova NÃO AUTOMOTIVA do ciclo "Arranjos semânticos v1" (O-13): um trecho de cerca de tábuas com uma flor plantada na frente. Nenhum eix…
- `_corpo.js` — PEÇA-EXEMPLO do P6 do playground: um CORPO — o volume que só `inflate` faz hoje (dois contornos 2D, lado e topo, virando um sólido por interseção de prismas)…
- `_corrimao.js` — PEÇA DE EXERCÍCIO — a prova NÃO AUTOMOTIVA da segunda capacidade do ciclo "Corte e orientação de seção v1": `orientacao` no `loft`. Um corrimão de escada, de…
- `_espelhado.js` — PEÇA-EXEMPLO do P3 do playground: uma CABEÇA com um PAR DE CHIFRES — o objeto BILATERAL modelado só de UM chifre e completado pela op `espelha` NOVA, waterti…
- `_flange-de-tubulacao.js` — PEÇA DE EXERCÍCIO — prova geral da F1/A-30: uma flange de tubulação abre, em UM passo, a passagem central e o círculo de fixação com raios diferentes. Os gru…
- `_freio-hierarquia.js` — Fixture de AUT-2026-16. Reusa a geometria real do freio a disco para provar somente a intenção estrutural: pistão e duas pastilhas pertencem à pinça. A ordem…
- `_gabarito-de-furacao.js` — PEÇA DE EXERCÍCIO — prova geral do A-34. Um gabarito de bancada combina cilindro, cone e furo escritos pela mesma tolerância geométrica. O objeto não sabe na…
- `_gabarito-triangulacao-de-furos.js` — PEÇA DE EXERCÍCIO — prova geral do A-33. Um disco hexagonal recebe dez furos triangulares muito próximos da borda: é a fronteira que a ponte gulosa não repar…
- `_galho.js` — PEÇA-EXEMPLO do P4 do playground: um GALHO — o objeto que SÓ o `loft` faz hoje (uma sequência de SEÇÕES circulares encadeada ao longo de um CAMINHO 3D). É o …
- `_jardineira.js` — PEÇA DE EXERCÍCIO — a prova NÃO AUTOMOTIVA da Fundação de autoria v1: uma jardineira de janela com uma muda plantada (caixa, terra, bulbo, caule, folhagem e …
- `_mancal-de-mesa.js` — _mancal-de-mesa.js — mancal de mesa simplificado para a homologação do fluxo de modelagem por IA. A receita fixa X como eixo do conjunto, Y como vertical e Z…
- `_modelo.js` — _modelo — o "olá mundo" da OFICINA (D-55): copie este arquivo pra criar uma peça nova. Mostra o contrato inteiro: textura procedural, geometria e ANIMAÇÃO (m…
- `_oficina-anim.js` — PEÇA-EXEMPLO da OFICINA (passo 13a): ANIMAÇÃO RÍGIDA POR PARTE (em laço). Prova o motor novo com movimento ÓBVIO no visor: uma ENGRENAGEM (`roda`) gira em to…
- `_oficina-esqueleto.js` — PEÇA-EXEMPLO da OFICINA (passo 14a): ESQUELETO com DEFORMAÇÃO SUAVE (linear blend skinning). Uma CORRENTE/tentáculo de 3 segmentos (4 anéis de vértices) que …
- `_oficina-materiais.js` — PEÇA-EXEMPLO da OFICINA (passo 12a): MATERIAIS OPACOS. Um toco com BRASA — um cilindro de casca (cor + aspereza) e o topo como brasa que BRILHA (emissivo + s…
- `_oficina-toco.js` — PEÇA-EXEMPLO da OFICINA (passo 1): um toco de árvore descrito 100% como lista de PASSOS e reconstruído por `executar` — prova a cadeia inteira núcleo -> adap…
- `_oficina-transp.js` — PEÇA-EXEMPLO da OFICINA (passo 12b): MATERIAL TRANSPARENTE. Um relicário — um NÚCLEO opaco que BRILHA (brasa: emissivo + semLuz) dentro de uma CASCA de VIDRO…
- `_pedra.js` — PEÇA-EXEMPLO do P8b+P8c do playground: uma PEDRA — `chamferBox` (caixa cantelada: cantos e arestas chanfrados, analítica, uma fórmula fechada como cubo/esfer…
- `_placa-adaptadora.js` — Placa adaptadora de exercício para o Caso 2 da homologação do fluxo de IA. Uma única chapa recebe três famílias de furação passante: passagem central, círcul…
- `_portas-espelho-arranja.js` — PEÇA DE EXERCÍCIO — prova não automotiva de AUT-2026-15. Três placas de sinalização demonstram portas sob cópia: duas voltas de uma placa radial, uma fileira…
- `_prateleira-furada.js` — PEÇA DE EXERCÍCIO — a prova NÃO AUTOMOTIVA do ciclo "Corte e orientação de seção v1": uma prateleira de parede com furo de parafuso, encaixe de cavilha e um …
- `_primitivas.js` — PEÇA-EXEMPLO do P1 do playground: as TRÊS primitivas novas lado a lado — `plano` como chão, `esfera` apoiada no centro e `cone` deslocado pra +x por moveV (p…
- `_tampa-de-caixa.js` — PEÇA DE EXERCÍCIO — a prova NÃO AUTOMOTIVA do ciclo "Furo v2": a tampa de uma caixa de inspeção, com o CÍRCULO DE QUATRO PARAFUSOS que o A-26 disse que não c…
- `_torno.js` — PEÇA-EXEMPLO do P2 do playground: um PEÃO DE XADREZ — o objeto que SÓ o `lathe` faz hoje (um perfil 2D `[[raio,y],...]` girado em torno do eixo Y). O perfil …
- `_vao-e-anteparo.js` — PEÇA DE EXERCÍCIO do O-14 (docs/mecanifica/historico/OFICINA-OTIMIZACOES.md): põe `apagaFace` e `vira` dentro da rede do `gabarito:selecao` — até aqui as dua…
- `_vaso.js` — PEÇA-EXEMPLO do Ciclo 5 ("Curva e filete v1"): um VASO DE CERÂMICA — o objeto que só a CURVA no perfil do `lathe` faz bem. Família NÃO automotiva (louça), es…
- `_vazio.js` — _vazio — fixture do P5 do playground: peça SEM geometria (0 passos), usada pela bancada de gabarito (tools/bancadas/gabarito.mjs) como a REFERÊNCIA DE FUNDO …
- `_viga.js` — PEÇA-EXEMPLO do P5 do playground: uma VIGA — o objeto que só a chave `contorno` do `loft` faz hoje (uma seção RETANGULAR, não circular, no lugar do `raio`). …
- `caixa-ferramentas.js` — CAIXA-FERRAMENTAS — peça nova (medição da linguagem da Oficina hoje, sessão de agente limpo): objeto pequeno de segurar na mão — corpo, tampa, alça em arco, …
- `drone-inspecao.js` — PEÇA MÉDIA DA FASE 4 — drone quadricóptero compacto de inspeção. PASSOS é a fonte de verdade: o corpo, a tampa, os quatro braços, os quatro rotores, as pás, …
- `freio-disco.js` — PRIMEIRO SISTEMA MECÂNICO DA MECANIFICA (Fase 3) — freio a disco dianteiro direito, paramétrico e por partes semânticas: `disco`, `cubo`, `pinca`, `suporte`,…
- `lanterna.js` — PEÇA: uma LANTERNA DE MÃO — corpo cilíndrico (cabo), cabeça mais larga, lente (material emissivo), um interruptor (cubo embutido na lateral) e uma alça de pe…
- `moto.js` — moto — MOTOCICLETA FUTURISTA ESTILIZADA, 100% em PASSOS (nenhuma linha de geometria em JS: `construir` é só `executar`).
- `roda-dianteira-realista-experimento.js` — EXPERIMENTO DE AUTORIA — roda dianteira de apresentação feita somente com o vocabulário procedural atual da Oficina.
- `roda-dianteira.js` — RODA DIANTEIRA DA MECANIFICA — pneu, aro e tampa central paramétricos, pensados para compor com `freio-disco`, nunca para duplicar seu `cubo`.

## src/autoria/

- `adaptar-montagem-three.js` — adaptar-montagem-three.js — projeta uma montagem resolvida em cena Three.js.
- `adaptar-three.js` — adaptar-three.js — adaptador neutro do núcleo da Oficina para Three.js; não altera o formato persistido.
- `assinatura-geometria.js` — assinatura-geometria.js — SHA-256 síncrono e portátil para os contratos de autoria. Não usa `node:crypto`: a descrição também roda na bancada.
- `derivar-catalogo-montagens.js` — derivar-catalogo-montagens.js — índice determinístico limitado às raízes dadas.
- `derivar-impacto-montagem.js` — derivar-impacto-montagem.js — deriva dependências locais sem executar revalidação.
- `derivar-roteiro-revalidacao.js` — derivar-roteiro-revalidacao.js — transforma impacto local em ações explícitas.
- `descrever-montagem-resolvida.js` — descrever-montagem-resolvida.js — projeta a árvore interna em contexto JSON para IA.
- `descrever-partes.js` — descrever-partes.js — mede uma peça da Oficina POR NOME de parte, sem Three.js: caixa alinhada aos eixos, centro, dimensões e faces de cada parte, e a folga …
- `hierarquia-partes.js` — hierarquia-partes.js — consultas puras e determinísticas da árvore semântica. Não conhece Three.js, geometria ou domínio mecânico.
- `interfaces-montagem.js` — interfaces-montagem.js — resolve portas declaradas por peças, mede relações cilíndricas/anulares e deriva uma prévia cilíndrica sem Three.js, hierarquia ou s…
- `ler-montagem-persistida.js` — ler-montagem-persistida.js — leitor/validador fail-closed da montagem v1/v2/v3.
- `ler-peca-resolvida.js` — ler-peca-resolvida.js — a metade LEITORA do formato `mecanifica.peca-resolvida`.
- `ler-universo-autoria.js` — ler-universo-autoria.js — contrato e prova estrutural do universo v1.
- `resolver-montagem-persistida.js` — resolver-montagem-persistida.js — resolve instâncias de peças sem acesso a arquivo.
- `separacao-direcional.js` — separacao-direcional.js — mede intervalos projetados sem alegar colisão geral.
- `transformacao-rigida.js` — transformacao-rigida.js — contrato neutro de transformações rígidas.

## src/bancada/

- `carregar-peca.js` — carregar-peca.js — resolve a fixture da bancada por nome semântico e falha alto em nome inválido.
- `controlar-partes.js` — controlar-partes.js — seleção múltipla, contexto fantasma, isolamento e explosão visual.
- `criar-ambiente.js` — criar-ambiente.js — estúdio neutro, câmeras previsíveis e enquadramento da bancada.
- `criar-selecao.js` — criar-selecao.js — raycast da bancada com seleção múltipla e foco por duplo clique.
- `estado-bancada.js` — estado-bancada.js — estado headless e determinístico da bancada de inspeção.
- `main.js` — main.js — composição da bancada: fixture procedural, estúdio, inspeção e estado reproduzível.

## tools/

- `README.md` — tools/ — ferramentas da Mecanifica e do núcleo herdado

## tools/bancadas/

- `criar-aliases.test.mjs` — criar-aliases.test.mjs — impede que a bancada criar volte a diagnosticar como órfã uma peça válida por esquecer o sexto campo do envelope: ALIASES.
- `criar.mjs` — criar.mjs — P7 do playground (D-120): A CAMADA IA, laço único.
- `estado-peca.mjs` — estado-peca.mjs — executa o envelope completo de uma peça procedural para que bancadas distintas não percam MATERIAIS, ESQUELETO ou ALIASES.
- `executar.mjs` — executar.mjs — a bancada do REPLAY da OFICINA (passo 1), sem browser. Roda a lista de PASSOS de uma peça, serializa a lista, re-parseia e re-executa, e afirm…
- `gabarito-selecao-lib.mjs` — gabarito-selecao-lib.mjs — regras puras da Prova Zero: compara o acervo atual ao gabarito gravado e permite declarar SOMENTE peças novas nomeadas.
- `gabarito-selecao-lib.test.mjs` — gabarito-selecao-lib.test.mjs — protege a exceção estreita para peça nova: `--novas` aceita presença nova, mas nunca esconde hash, remoção ou erro de nome.
- `gabarito-selecao.mjs` — gabarito-selecao.mjs — a PROVA ZERO da Fase 3.5 (docs/rumo/PLANO.md): mede, peça por peça, que uma mudança no núcleo (`motor/oficina.js`) não mudou o resulta…
- `gabarito.mjs` — gabarito.mjs — P5 do playground (D-118): FORMA COMO NÚMERO. Mede a silhueta RENDERIZADA de uma peça contra um CONTORNO de referência (o gabarito, desenhado à…
- `id-cru.mjs` — id-cru.mjs — o gate do O-4 (docs/mecanifica/historico/OFICINA-OTIMIZACOES.md): REPROVA peça NOVA que enderece geometria por id posicional, sem quebrar as her…
- `id-cru.test.ts` — id-cru.test.ts — prova do gate do O-4: que ele ACHA id cru em peça nova, que a lista de exceções é uma dívida CONGELADA (não um teto para crescer) e que valo…
- `olhar-peca.mjs` — olhar-peca.mjs — o olho da OFICINA (D-55).
- `porteiro.mjs` — porteiro.mjs — o GATE de render da OFICINA (D-60). Renderiza peça(s) do v3 e FALHA (exit≠0) se: houve pageerror, window.__ready ≠ true, ou o frame é DEGENERA…
- `skill-criar-peca.test.ts` — skill-criar-peca.test.ts — a skill de autoria é MEDIDA contra o núcleo, não revisada no olho. Duas afirmações da `.claude/skills/criar-peca/SKILL.md` custam …
- `visor-imports.test.mjs` — Prova a resolução de imports bare no visor legado servido sem transformação.

## tools/bancadas/bench/

- `gabarito-nucleo.mjs` — gabarito-nucleo.mjs — P5 do playground (docs/historico/playground.md): FORMA COMO NÚMERO. Lógica PURA (sem Playwright/browser — unit-testável) por trás da ba…
- `gabarito-nucleo.test.ts` — Vitest do NÚCLEO PURO da bancada de gabarito (P5 do playground, D-118): máscara por diferença de fundo (+ o corte do HUD), filtro de componente pequeno (o pi…
- `pngstats.mjs` — pngstats.mjs — decodifica um PNG (8-bit, colortype 2/6) via zlib. Sem dependência externa. `decodePng` devolve os pixels CRUS (usado pelo porteiro via `pngSt…
- `pngwrite.mjs` — pngwrite.mjs — codifica um buffer RGB em PNG (8-bit, colortype 2), sem dependência externa (par do decodePng em pngstats.mjs). Usado pela bancada de gabarito…

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
- `mcp.test.mjs` — mcp.test.mjs — contrato real de stdio, catálogo, recursos e ferramentas MCP.
- `servidor.mjs` — servidor.mjs — servidor MCP local stdio com revisão e autoria opt-in.

## tools/mcp/perfis/

- `autoria-montagens.mjs` — autoria-montagens.mjs — porta MCP opt-in, fina sobre a autoria interna.
- `autoria-montagens.test.mjs` — Provas R04: MCP de autoria só atua com escopo do host e sem paths públicos.
- `autoria-receitas.mjs` — autoria-receitas.mjs — porta MCP fina para receitas declarativas.
- `autoria-receitas.test.mjs` — Contrato fino da porta MCP de autoria declarativa.
- `montagens.mjs` — montagens.mjs — adaptador MCP fino para leitura e auditoria de montagens.
- `revisao.mjs` — revisao.mjs — adaptador MCP fino para os serviços existentes de modelagem.

## tools/mecanifica/

- `acervo-adaptador.test.ts` — acervo-adaptador.test.ts — o ADAPTADOR passa por todo o acervo, e não só pelas cinco peças que outros testes usam de fixture.
- `adaptar-montagem-three.test.ts` — Prova que a visualização de montagem deriva somente da árvore resolvida.
- `adaptar-three.test.ts` — adaptar-three.test.ts — prova headless da fronteira entre o núcleo procedural herdado e Three.js.
- `argumentos.mjs` — argumentos.mjs — leitura de linha de comando dos CLIs da Mecanifica, com a MESMA lei que o núcleo de autoria aplica a uma referência: bandeira desconhecida, …
- `argumentos.test.ts` — argumentos.test.ts — prova de que os CLIs da Mecanifica não engolem bandeira desconhecida em silêncio (MEDIA-7). O defeito: `--estrit` (uma letra a menos que…
- `arranjo-em-peca.test.ts` — arranjo-em-peca.test.ts — a prova do ciclo "Arranjos semânticos v1" NA PEÇA, não só no núcleo.
- `autoria-ativa.mjs` — autoria-ativa.mjs — provedores neutros para revisões imutáveis ativas.
- `autoria-ativa.test.mjs` — autoria-ativa.test.mjs — continuidade autorizada e falha fechada.
- `autoria-montagem.mjs` — autoria-montagem.mjs — planejamento e aplicação interna de montagens v1/v2/v3.
- `autoria-montagem.test.ts` — Provas R02: planejar, confirmar, validar e materializar montagem persistida.
- `autoria-receita.mjs` — autoria-receita.mjs — autoria declarativa de receitas, sem avaliar JavaScript.
- `autoria-receita.test.ts` — Provas da autoria declarativa de receita sem JavaScript do agente.
- `caminho-confinado.mjs` — caminho-confinado.mjs — guarda de escrita para artefatos que um CLI aceita por caminho. A checagem lexical sozinha não basta: um diretório relativo pode cont…
- `caminho-confinado.test.ts` — caminho-confinado.test.ts — prova do confinamento sem precisar criar links.
- `capturar-montagem.mjs` — capturar-montagem.mjs — serviço importável de vistas de montagem em memória.
- `capturar-montagem.test.ts` — @ts-expect-error — resolvedor JavaScript público, exercitado pelo contrato.
- `contexto-montagem-estudo.test.ts` — Repete R001/R002 no descritor de contexto e mede a economia Agent-First.
- `corrimao-orientacao.test.ts` — corrimao-orientacao.test.ts — a prova NÃO AUTOMOTIVA da `orientacao` do `loft`, o segundo item do ciclo "Corte e orientação de seção v1".
- `derivar-catalogo-montagens.test.ts` — Prova catálogo global confinado às raízes explicitamente resolvidas.
- `derivar-impacto-montagem.test.ts` — Prova mapa de impacto local, direto, indireto e determinístico.
- `derivar-roteiro-revalidacao.test.ts` — Prova roteiro de revalidação assistida, sem correção ou veredito global.
- `descrever-montagem-persistida.mjs` — descrever-montagem-persistida.mjs — CLI confinada do contexto JSON para IA.
- `descrever-montagem-persistida.test.ts` — Prova a CLI confinada que descreve montagem persistida arbitrária em JSON.
- `descrever-montagem-resolvida.test.ts` — Prova o contexto JSON puro derivado de uma montagem persistida resolvida.
- `descrever-montagem.mjs` — descrever-montagem.mjs — lê uma montagem piloto e imprime o diagnóstico declarativo do encaixe. Não abre renderizador, não aplica pose e não conhece automóve…
- `descrever-partes.test.ts` — descrever-partes.test.ts — prova do O-1: a conferência de uma peça é NÚMERO, não leitura de PNG (ATRITOS-AUTORIA A-13). Mede três coisas: que o módulo neutro…
- `descrever-peca.mjs` — descrever-peca.mjs — serviço headless de medição e sua CLI fina.
- `drone-semantica.test.ts` — drone-semantica.test.ts — identidade semântica do drone (lente ≠ pouso, nenhuma face órfã) e, desde a régua do O-1, a RELAÇÃO entre as partes.
- `enquadramento-bancada.test.ts` — enquadramento-bancada.test.ts — prova pura do gate visual da bancada.
- `estado-bancada.test.ts` — estado-bancada.test.ts — contrato headless das vistas, seleção, contexto e URL da bancada.
- `exportar-gate.test.ts` — exportar-gate.test.ts — A-60, segunda metade: o gate que acusa arquivo velho.
- `exportar-peca.mjs` — exportar-peca.mjs — A-60: o núcleo roda AQUI e grava o resultado; o produto só lê.
- `exportar-peca.test.ts` — exportar-peca.test.ts — A-60: a peça vira DADO.
- `exportar.mjs` — exportar.mjs — a linha de comando do A-60.
- `flange-integridade.test.ts` — flange-integridade.test.ts — prova em peça da F1/A-30: uma passagem central e um círculo de parafusos, com raios distintos e nomes estáveis, no mesmo passo. …
- `freio-disco-integridade.test.ts` — freio-disco-integridade.test.ts — testes de integridade do primeiro sistema mecânico da Mecanifica (Fase 3). Não medem beleza: medem as relações que o domíni…
- `gabarito-furacao-integridade.test.ts` — gabarito-furacao-integridade.test.ts — prova geral do A-34 nas três ops com raio escalar: cilindro, cone e furo usam a mesma tolerância em metros.
- `guarda-camera-livre.mjs` — guarda-camera-livre.mjs — prova real: uma órbita da bancada vira URL e a URL volta igual.
- `guarda-inspecao-par.mjs` — guarda-inspecao-par.mjs — prova real de que duas partes recebem vista legível e URL reproduzível.
- `guarda-portas-bancada.mjs` — guarda-portas-bancada.mjs — a PROVA PELO OLHO DA BANCADA do painel de PORTAS: abrir `bancada.html` numa peça que publica portas mostra as portas na tela, e a…
- `hierarquia-partes.test.ts` — hierarquia-partes.test.ts — árvore semântica sem Three.js ou geometria.
- `interfaces-montagem.test.ts` — interfaces-montagem.test.ts — provas do Recorte A de AUT-05: interfaces cilíndricas persistidas pelo núcleo e encaixe estritamente mensurável.
- `jardineira-integridade.test.ts` — jardineira-integridade.test.ts — a prova NÃO AUTOMOTIVA do contrato de autoria: O-6 (`origem` universal), O-12 (portas semânticas) e, desde o ciclo Endereços…
- `ler-montagem-persistida-v3.test.ts` — Prova o contrato estrutural v3 sem alterar a leitura fechada de v1/v2.
- `mcp-degrau-1-preparacao.test.mjs` — Provas da fatia preparatória: importação silenciosa, serviço estruturado e limpeza.
- `montagem-persistida-provas.test.ts` — @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
- `montagem-persistida-v2-provas.test.ts` — @ts-expect-error — leitor JavaScript, usado para verificar recusas estruturais.
- `montagem-persistida.test.ts` — @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
- `normais-lisas.test.ts` — normais-lisas.test.ts — a borda do furo serrilhava na bancada, e a peça não tinha culpa: o `freio-disco` já usa 12 lados no furo do prisioneiro e já marca a …
- `olhar-bancada.mjs` — olhar-bancada.mjs — serviço headless de vistas e sua CLI fina.
- `olhar-montagem.mjs` — olhar-montagem.mjs — CLI fina sobre captura importável de montagem.
- `portas-espelho-arranja.test.ts` — portas-espelho-arranja.test.ts — prova adversarial de AUT-2026-15: uma interface não pode permanecer no espaço da fonte quando a sua geometria foi copiada. C…
- `prateleira-integridade.test.ts` — Integridade da peça de exercício `_prateleira-furada` — a prova NÃO AUTOMOTIVA do ciclo "Corte e orientação de seção v1".
- `referencia-posicional.test.ts` — referencia-posicional.test.ts — prova do A-22: a regra de "isto é referência por id posicional?" é UMA SÓ, e ela distingue as duas coisas que a chave `de` ca…
- `repositorio-autoria.mjs` — repositorio-autoria.mjs — revisões imutáveis com commit como fronteira de visibilidade.
- `repositorio-autoria.test.ts` — Prova publicação imutável, falha recuperável e conflito explícito.
- `resolver-montagem-persistida.test.ts` — @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
- `roda-dianteira-integridade.test.ts` — roda-dianteira-integridade.test.ts — contratos semânticos da roda revisável na bancada.
- `separacao-direcional.test.ts` — Prova separação direcional genérica em peça, parte e montagem recursiva.
- `tampa-de-caixa-integridade.test.ts` — Integridade da peça de exercício `_tampa-de-caixa` — a prova NÃO AUTOMOTIVA do ciclo "Furo v2": vários furos na MESMA face, num passo só.
- `transformacao-rigida.test.ts` — @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
- `universo-autoria.test.ts` — universo-autoria.test.ts — contrato estrutural e fixture adversarial da R00.
- `vao-e-anteparo.test.ts` — vao-e-anteparo.test.ts — prova de comportamento das duas ops que o O-14 tirou do ponto cego: `apagaFace` (abre o vão) e `vira` (corrige a normal). Cada asser…
- `visor-montagem.html` — visor-montagem.html — superfície privada para evidência visual de montagem.
- `visor-montagem.js` — visor-montagem.js — renderizador privado, derivado de montagem já resolvida.

## tools/modelagem/

- `comparar-revisao.mjs` — CLI fino: lê dois JSONs, usa somente o núcleo puro e escreve JSON canônico.
- `critica-modelagem.mjs` — CLI fino: valida crítica sem abrir navegador, peça ou Oficina.
- `formato-pacote.mjs` — formato-pacote.mjs — contrato pequeno, estrito e canônico do pacote de modelagem assistida. Não conhece Three.js, domínio automotivo ou runtime de navegador:…
- `pacote-modelagem.test.mjs` — pacote-modelagem.test.mjs — marco 1: bytes reprodutíveis e recusa explícita para tudo que faria uma IA trabalhar com contexto frágil ou posicional.
- `preparar-pacote.mjs` — preparar-pacote.mjs — cria só o esqueleto canônico; uma pasta já existente é sempre erro. Assim, uma segunda tentativa nunca apaga briefing ou crítica.
- `revisao-modelagem.mjs` — Revisão de modelagem — núcleo puro do ciclo assistido por IA.
- `revisao-modelagem.test.mjs` — Prova determinismo, validação e comparação dos artefatos neutros de revisão e crítica.
- `revisar-pacote.mjs` — revisar-pacote.mjs — marco 2 do fluxo assistido: a única ponte entre o pacote, a régua headless e as quatro câmeras da bancada.
- `revisar-pacote.test.mjs` — Prova a orquestração atômica entre pacote, descrição headless e vistas da bancada.
- `validar-pacote.mjs` — validar-pacote.mjs — porta fail-closed do marco 1. Lê, exige bytes canônicos e confere o alvo com a régua headless assim que a fonte canônica existir.

## tools/oficina/

- `arranja-contrato.test.ts` — arranja-contrato.test.ts — o que a op `arranja` PROMETE no comentário e não estava afirmado em lugar nenhum.
- `arredondar-aresta.test.ts` — arredondar-aresta.test.ts — contrato de aceitação do Escopo A do filete v2. Escrito antes da op: uma aresta simples de cubo ganha uma faixa de arco com vário…
- `canon-linha-de-base.test.ts` — canon-linha-de-base.test.ts — fotografia do furo antes de portas novas do ciclo 6: raios iguais devem conservar exatamente a geometria atual.
- `chao-do-ciclo6.test.ts` — chao-do-ciclo6.test.ts — caso vermelho da quinta propriedade: um triângulo emitido pode ter área zero mesmo com núcleo, adaptador e casca saudáveis.
- `concordancia-por-ponto.test.ts` — concordancia-por-ponto.test.ts — A-35: cada curva de um mesmo passo pode declarar seu próprio custo sem obrigar todas as outras a usarem o maior.
- `conferir-malha.ts` — conferir-malha.ts — a conferência única que todo teste de op nova chama.
- `expressoes.test.ts` — expressoes.test.ts — contrato da aritmética fechada de PARAMS/TOPO (O-5).
- `filete-v2-aceitacao.mjs` — filete-v2-aceitacao.mjs — gate de descoberta do arredondamento real. Não entra em `npm test` enquanto o v2 não existir: hoje ele precisa FALHAR, exibindo a l…
- `furo-ordens-de-ponte.test.ts` — furo-ordens-de-ponte.test.ts — as promessas do A-30 que a geometria sozinha não mostra.
- `furo-raio-por-grupo.test.ts` — furo-raio-por-grupo.test.ts — contrato da F1: cada grupo de centros pode declarar raio e, em furo cego, profundidade próprios, e receber um nome semântico pa…
- `lados-por-desvio.test.ts` — lados-por-desvio.test.ts — A-34: a IA declara uma tolerância geométrica e o núcleo deriva a menor contagem circular, sem adivinhar números sem unidade.
- `nomes-de-face.test.ts` — nomes-de-face.test.ts — os NOMES publicados por `origem` são formato salvo, e este arquivo é a única coisa que os prende à geometria.
- `oficina.test.ts` — Vitest do NÚCLEO da OFICINA (passo 1): prova os invariantes de identidade — numeração determinística e POSICIONAL (re-rodar dá ids idênticos), identidade est…
