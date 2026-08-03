# MAPA — inventário da Mecanifica, arquivo por arquivo

> **GERADO** por `npm run mapa` — não edite à mão. O resumo de cada arquivo
> mora no próprio arquivo (primeiro comentário; H1 nos `.md`); isto é a
> projeção. `npm run mapa:check` (CI) falha se isto estiver velho ou se
> algum arquivo-fonte estiver sem cabeçalho.

285 arquivos (código `.js .mjs .cjs .ts .tsx .html` + docs `.md`).

## (raiz)

- `AGENTS.md` — Mecanifica — instruções para agentes
- `CLAUDE.md` — Mecanifica — acordo de trabalho
- `README.md` — Mecanifica
- `bancada.html` — bancada.html — estúdio de inspeção multivista para autoria e validação de montagens.
- `vite.config.js` — vite.config.js — build estático da BANCADA de autoria, publicada em warbookbr/nos-mecanifica no GitHub Pages. O produto que o cliente abre vive em warbookbr/…
- `vitest.config.ts` — Config do Vitest: cobre os contratos da Mecanifica e os núcleos herdados em tools/**.

## .claude/agents/

- `game-builder.md` — Constrói features do cliente v3 (o motor GPU, a Oficina, o som, a animação, a interface do jogo). Recebe um brief fechado do orquestrador e entrega numa bran…
- `revisor-adversarial.md` — Revisor adversarial POR RISCO do v3 — tenta QUEBRAR a mudança sob estresse antes do merge, com foco em fundação, formato salvo (irreversível) e conta de julg…

## .claude/skills/auditar-peca/

- `SKILL.md` — Gate de senso crítico [cpu] pra peças do motor v3 (prototipos/fps/v3/pecas/*.js). Roda os críticos validados por benchmark (geometria, paleta, costura, bandi…

## .claude/skills/criar-peca/

- `SKILL.md` — Criar ou refinar uma peça 3D procedural da Mecanifica como IA, escrevendo PASSOS e provando o resultado na bancada neutra com medidas, vistas e crítica objet…

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

## docs/historico/legado/

- `ARCHITECTURE.md` — Arquitetura — NÓS
- `CIDADE.md` — A Clareira — a cidade d'O Coração
- `CODER.md` — A Bancada do Coder — ferramentas, limites e o método (D-35)
- `COMUNICACAO.md` — Comunicação ideador ↔ coder — identificação de objetos e áreas (D-33)
- `CONTINUITY.md` — Continuidade — onde paramos
- `GDD.md` — Game Design Document — NÓS
- `HABITANTES.md` — Os Habitantes — mentes que JOGAM o jogo (proposta)
- `IMPLEMENTATION_PLAN.md` — Plano de Implementação — NÓS
- `PORTALS_PROTOCOL.md` — Protocolo dos Portais — R6
- `README.md` — Legado — os docs d'O Coração (o mundo 2D congelado)
- `walkthrough_colaborador2.md` — Resumo de Alterações — Colaborador 2 (T5, T6, T8, T9)

## docs/mecanifica/

- `ARQUITETURA.md` — Arquitetura da Mecanifica
- `ATRITOS-AUTORIA.md` — Atritos de autoria — o que dói ao modelar
- `AUTORIA-IA.md` — Autoria para IA
- `BANCADA-E-APRESENTACAO.md` — Bancada de autoria e apresentação ao cliente
- `COORDENACAO-LOCAL.md` — Coordenação local entre agentes
- `COORDENACAO-REPOS.md` — Coordenação entre os repositórios Mecanifica
- `EXPERIMENTO-AB-FLUXO-IA.md` — Experimento A/B — o fluxo ajuda a IA a modelar?
- `EXPERIMENTO-RODA-REALISTA.md` — Experimento de autoria — roda realista
- `FILETE-V2.md` — Filete v2 — Escopos A e B implementados
- `FLUXO-MODELAGEM-IA.md` — Fluxo de modelagem assistida por IA v1
- `HOMOLOGACAO-FLUXO-IA.md` — Homologação orientada a avanço do fluxo de IA
- `INDEX.md` — Comece aqui — contexto da Mecanifica
- `MONTAGENS-SEMANTICAS.md` — Montagens semânticas — visão, teto e mapa de maturidade
- `OFICINA-OTIMIZACOES.md` — Otimizações da Oficina para autoria por IA
- `PERFIS-DE-AUTORIA.md` — Perfis de autoria
- `PLANO.md` — Plano mestre da Mecanifica — aposentado
- `PRANCHA-FREIO-DISCO.md` — Prancha de referência — freio a disco dianteiro
- `PRANCHA-RODA-DIANTEIRA.md` — Prancha de referência — roda dianteira
- `REFERENCIA-E-CRITICA-VISUAL.md` — Referência e crítica visual — protocolo de modelagem
- `RELATO-RODA-REALISTA.md` — Relato do experimento — roda realista
- `RELATORIO-PONTE-THREE.md` — Relatório da ponte Three.js
- `UPSTREAM-NOS.md` — Melhorias reaproveitáveis pelo NÓS
- `VISAO.md` — Visão da Mecanifica

## docs/mecanifica/planos/

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
- `BACKLOG.md` — Backlog de candidatos
- `ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md` — Encerramento do plano mestre — 2 de agosto de 2026
- `MODELO.md` — [ID] — resultado curto
- `README.md` — Planos da Mecanifica

## docs/rumo/

- `AUDIO_E_CENAS.md` — Áudio e cenas — música, voz e cutscenes (direção)
- `FERRAMENTAS.md` — FERRAMENTAS — o plano da potência (D-56)
- `NORTE.md` — NORTE — objetivo e método do NÓS
- `PLANO.md` — PLANO — evolução da linguagem de criação do NÓS
- `VISION.md` — Visão — NÓS
- `arquitetura-identidade-estavel.md` — Arquitetura — identidade estável de objetos e subpartes
- `oficina-roteiro.md` — Oficina — o que ainda não existe

## docs/uso/

- `LORE.md` — Lore — a bíblia do NÓS
- `RECURSOS.md` — Recursos técnicos do Atelier herdado
- `oficina-contrato.md` — Oficina — contrato histórico do núcleo
- `oficina-referencia.md` — Oficina — referência de como cada coisa funciona

## prototipos/fps/v3/

- `README.md` — v3 — núcleo e cliente GPU herdados (D-55)
- `jogo.html` — jogo.html — o alicerce jogável v3 (D-61): câmera livre, som, tiers de gráfico e menu, em cima do motor ES modules.
- `visor.html` — visor.html — visor de peças da OFICINA (D-55): abre qualquer peça de pecas/ isolada no ambiente padrão (?peca=nome).

## prototipos/fps/v3/gabaritos/

- `_viga.js` — GABARITO do P5 do playground: o contorno de referência da `_viga` (pecas/_viga.js) no ângulo padrão 38° — o formato do P5 (docs/ playground.md): pontos [x,y]…

## prototipos/fps/v3/montagens/

- `anel-e-faixa.js` — anel-e-faixa.js — fixture neutra de assentamento anular. Dois corpos de revolução declaram zonas concêntricas, sem conhecer roda, pneu, freio ou Three.js; el…
- `pino-e-luva.js` — pino-e-luva.js — fixture neutra do encaixe cilíndrico. Não conhece roda, freio ou Three.js: dois corpos rígidos simples publicam as mesmas interfaces que o p…
- `roda-no-freio.js` — roda-no-freio.js — declaração de montagem do piloto AUT-05. Ela reúne duas receitas já existentes numa pose manual conhecida e declara UMA relação de encaixe…

## prototipos/fps/v3/motor/

- `arvore-cartoon.js` — NÓS v3 — CONSTRUTOR de árvores CARTOON (D-63), o "carimbo" plantável. Porta o elenco aprovado no mostruário _arvformas pra uma fábrica reutilizável: criarArv…
- `arvore.js` — motor/arvore.js — GERADOR DE ÁRVORES portado FIEL da V2 (D-59). growTree + dependências extraídos LITERALMENTE de nos-fps.html (não redigitados). Inclui a ha…
- `expressoes.js` — expressoes.js — aritmética determinística e fechada para parâmetros da Oficina. A expressão só existe em um campo numérico e sempre começa com `=`. Ela aceit…
- `geo.js` — helpers de GEOMETRIA do motor v3 (D-55): malha = lista chata de vértices (pos xyz, uv, normal) — 8 floats por vértice, triângulos soltos.
- `input.js` — input.js — teclado/mouse (desktop) + joystick touch, pro alicerce jogável do v3 (D-61). Os joysticks portam FIEL as 3 correções pagas caro na v2 (D-47/48/49)…
- `mat4.js` — mat4 mínimo do motor v3 (D-55) — colunas-major, como o WebGL espera
- `oficina.js` — oficina.js — NÚCLEO + ADAPTADOR v3 da OFICINA (passo 1). Executa a lista de PASSOS de uma peça-objeto e devolve o objeto pronto pro visor. Duas camadas nítid…
- `referencia-posicional.js` — referencia-posicional.js — A REGRA ÚNICA de "isto é referência por id posicional?", para o formato salvo da Oficina.
- `render.js` — O VISOR do motor v3 (D-55) — o ambiente PADRÃO onde toda peça é criada e auditada: framebuffer fixo (?res) com upscale NEAREST (pixel art, custo independente…
- `som.js` — som.js — áudio 100% sintetizado pro v3 (D-61, porta o D-40/41 da v2: Web Audio pura, zero arquivo no repo — dieta D-30 vale pra áudio também). Dois canais in…
- `tex.js` — helpers de TEXTURA do motor v3 (D-55) — paleta Resurrect64, ruído, dither e o gerador de canvas. Uma peça pode devolver índice da paleta OU [r,g,b] direto (m…
- `vegetacao-cartoon.js` — NÓS v3 — CONSTRUTOR de VEGETAÇÃO CARTOON (D-64), irmão do arvore-cartoon.js. criarVegetacao(ctx) monta as texturas UMA vez e devolve arbusto/flor/tufo, cada …

## prototipos/fps/v3/pecas/

- `_arvformas-mosqueado.js` — scratch: variações de FORMATO de árvore (não versionar/publicar). Builder paramétrico: tronco + copa (oval / cone / multi-blob), rampa de cor por espécie. 6 …
- `_arvformas.js` — scratch: variações de FORMATO de árvore (não versionar/publicar). Builder paramétrico: tronco + copa (oval / cone / multi-blob), rampa de cor por espécie. 6 …
- `_bloco-arredondado-composto.js` — PEÇA DE EXERCÍCIO — prova não automotiva do A-37. Um bloco com chanfros recebe uma faixa de raio numa aresta cuja ponta encontra canto composto. Ela existe p…
- `_caixote-filetado.js` — PEÇA DE EXERCÍCIO do ciclo "Curva e filete v1": só existe por causa da op `filete` (motor/oficina.js), a metade "filete" do gate desse ciclo — a metade "curv…
- `_cerca-e-flor.js` — PEÇA DE EXERCÍCIO — a prova NÃO AUTOMOTIVA do ciclo "Arranjos semânticos v1" (O-13): um trecho de cerca de tábuas com uma flor plantada na frente. Nenhum eix…
- `_corpo.js` — PEÇA-EXEMPLO do P6 do playground: um CORPO — o volume que só `inflate` faz hoje (dois contornos 2D, lado e topo, virando um sólido por interseção de prismas)…
- `_corrimao.js` — PEÇA DE EXERCÍCIO — a prova NÃO AUTOMOTIVA da segunda capacidade do ciclo "Corte e orientação de seção v1": `orientacao` no `loft`. Um corrimão de escada, de…
- `_elenco.js` — scratch: ELENCO completo do carimbo — uma de cada espécie em fila, pro ideador ver tudo.
- `_espelhado.js` — PEÇA-EXEMPLO do P3 do playground: uma CABEÇA com um PAR DE CHIFRES — o objeto BILATERAL modelado só de UM chifre e completado pela op `espelha` NOVA, waterti…
- `_flange-de-tubulacao.js` — PEÇA DE EXERCÍCIO — prova geral da F1/A-30: uma flange de tubulação abre, em UM passo, a passagem central e o círculo de fixação com raios diferentes. Os gru…
- `_freio-hierarquia.js` — Fixture de AUT-2026-16. Reusa a geometria real do freio a disco para provar somente a intenção estrutural: pistão e duas pastilhas pertencem à pinça. A ordem…
- `_frondosa.js` — scratch: prova de 'seca'/'raiz' (malhas separadas, afiadas) + 'frondosa' (copa fundida). Fila: seca | raiz | 4× frondosa.
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
- `_pinheiros.js` — scratch: variações do PINHEIRO (não versionar/publicar). Mesmo padrão que o ideador aprovou no _arvformas — saias empilhadas (escada) + agulha verde escuro "…
- `_placa-adaptadora.js` — Placa adaptadora de exercício para o Caso 2 da homologação do fluxo de IA. Uma única chapa recebe três famílias de furação passante: passagem central, círcul…
- `_portas-espelho-arranja.js` — PEÇA DE EXERCÍCIO — prova não automotiva de AUT-2026-15. Três placas de sinalização demonstram portas sob cópia: duas voltas de uma placa radial, uma fileira…
- `_prateleira-furada.js` — PEÇA DE EXERCÍCIO — a prova NÃO AUTOMOTIVA do ciclo "Corte e orientação de seção v1": uma prateleira de parede com furo de parafuso, encaixe de cavilha e um …
- `_primitivas.js` — PEÇA-EXEMPLO do P1 do playground: as TRÊS primitivas novas lado a lado — `plano` como chão, `esfera` apoiada no centro e `cone` deslocado pra +x por moveV (p…
- `_raiz1.js` — scratch: close da RAIZ — tronco ranhurado + pé de raízes liso com sombra (malhas separadas).
- `_tampa-de-caixa.js` — PEÇA DE EXERCÍCIO — a prova NÃO AUTOMOTIVA do ciclo "Furo v2": a tampa de uma caixa de inspeção, com o CÍRCULO DE QUATRO PARAFUSOS que o A-26 disse que não c…
- `_torno.js` — PEÇA-EXEMPLO do P2 do playground: um PEÃO DE XADREZ — o objeto que SÓ o `lathe` faz hoje (um perfil 2D `[[raio,y],...]` girado em torno do eixo Y). O perfil …
- `_vao-e-anteparo.js` — PEÇA DE EXERCÍCIO do O-14 (docs/mecanifica/OFICINA-OTIMIZACOES.md): põe `apagaFace` e `vira` dentro da rede do `gabarito:selecao` — até aqui as duas tinham t…
- `_vaso.js` — PEÇA-EXEMPLO do Ciclo 5 ("Curva e filete v1"): um VASO DE CERÂMICA — o objeto que só a CURVA no perfil do `lathe` faz bem. Família NÃO automotiva (louça), es…
- `_vazio.js` — _vazio — fixture do P5 do playground: peça SEM geometria (0 passos), usada pela bancada de gabarito (tools/bancadas/gabarito.mjs) como a REFERÊNCIA DE FUNDO …
- `_viga.js` — PEÇA-EXEMPLO do P5 do playground: uma VIGA — o objeto que só a chave `contorno` do `loft` faz hoje (uma seção RETANGULAR, não circular, no lugar do `raio`). …
- `arco.js` — PEÇA: arco — o ARCO DE ENTRADA reconstruído com GEOMETRIA DE VERDADE (D-62→). No v2 ele era um billboard chapado com PROFUNDIDADE FALSA (b.depth: até 40 fati…
- `arvore-cartoon.js` — PEÇA: arvore-cartoon — a PROVA do carimbo plantável (D-63). Usa o construtor motor/arvore-cartoon.js pra montar um POOL pequeno de variantes (espécie×seed) e…
- `arvore.js` — PEÇA: arvore — o port das ÁRVORES da V2 pro v3 (D-59). O gerador growTree foi trazido FIEL pra motor/arvore.js (extraído, não redigitado). Aqui cada árvore v…
- `arvore3d.js` — PEÇA: arvore3d — experimento "3D-ish" da árvore (D-59→): tronco de verdade (prisma afunilado com casca) + copa feita de VÁRIOS cartões de folhagem agrupados …
- `caixa-ferramentas.js` — CAIXA-FERRAMENTAS — peça nova (medição da linguagem da Oficina hoje, sessão de agente limpo): objeto pequeno de segurar na mão — corpo, tampa, alça em arco, …
- `casa-toras.js` — PEÇA: casa-toras — a cabana de toras aprovada pelo ideador (D-54f). Toras VERTICAIS castanho-mel (tons reais, D-54f), janelas-ABERTURA com moldura+cruzeta+du…
- `drone-inspecao.js` — PEÇA MÉDIA DA FASE 4 — drone quadricóptero compacto de inspeção. PASSOS é a fonte de verdade: o corpo, a tampa, os quatro braços, os quatro rotores, as pás, …
- `freio-disco.js` — PRIMEIRO SISTEMA MECÂNICO DA MECANIFICA (Fase 3) — freio a disco dianteiro direito, paramétrico e por partes semânticas: `disco`, `cubo`, `pinca`, `suporte`,…
- `ilha-chao.js` — PEÇA: ilha-chao — o primeiro retalho de CHÃO do v3 (port da natureza v2). Ilha flutuante NA ESCALA DA V2 (o mundo é uma grade 64×64 tiles; a ilha tem ~56 uni…
- `lanterna.js` — PEÇA: uma LANTERNA DE MÃO — corpo cilíndrico (cabo), cabeça mais larga, lente (material emissivo), um interruptor (cubo embutido na lateral) e uma alça de pe…
- `moto.js` — moto — MOTOCICLETA FUTURISTA ESTILIZADA, 100% em PASSOS (nenhuma linha de geometria em JS: `construir` é só `executar`).
- `roda-dianteira-realista-experimento.js` — EXPERIMENTO DE AUTORIA — roda dianteira de apresentação feita somente com o vocabulário procedural atual da Oficina.
- `roda-dianteira.js` — RODA DIANTEIRA DA MECANIFICA — pneu, aro e tampa central paramétricos, pensados para compor com `freio-disco`, nunca para duplicar seu `cubo`.
- `vegetacao-cartoon.js` — PEÇA: vegetacao-cartoon — a PROVA da vegetação plantável (D-64). Planta um PRADO cartoon: tufos de grama (assados numa malha por variante -> poucos draws), f…

## src/autoria/

- `adaptar-three.js` — adaptar-three.js — adaptador neutro do núcleo da Oficina para Three.js; não altera o formato persistido.
- `assinatura-geometria.js` — assinatura-geometria.js — SHA-256 síncrono e portátil para os contratos de autoria. Não usa `node:crypto`: a descrição também roda na bancada.
- `descrever-partes.js` — descrever-partes.js — mede uma peça da Oficina POR NOME de parte, sem Three.js: caixa alinhada aos eixos, centro, dimensões e faces de cada parte, e a folga …
- `hierarquia-partes.js` — hierarquia-partes.js — consultas puras e determinísticas da árvore semântica. Não conhece Three.js, geometria ou domínio mecânico.
- `interfaces-montagem.js` — interfaces-montagem.js — resolve portas declaradas por peças, mede relações cilíndricas/anulares e deriva uma prévia cilíndrica sem Three.js, hierarquia ou s…
- `ler-peca-resolvida.js` — ler-peca-resolvida.js — a metade LEITORA do formato `mecanifica.peca-resolvida`.

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

- `auditar.mjs` — auditar.mjs — o GATE de senso crítico [cpu] numa peça REAL (D-60). Roda os críticos validados pelo benchmark (lint-de-malha, distancia-paleta, seam, banding,…
- `criar-aliases.test.mjs` — criar-aliases.test.mjs — impede que a bancada criar volte a diagnosticar como órfã uma peça válida por esquecer o sexto campo do envelope: ALIASES.
- `criar.mjs` — criar.mjs — P7 do playground (D-120): A CAMADA IA, laço único.
- `estado-peca.mjs` — estado-peca.mjs — executa o envelope completo de uma peça procedural para que bancadas distintas não percam MATERIAIS, ESQUELETO ou ALIASES.
- `executar.mjs` — executar.mjs — a bancada do REPLAY da OFICINA (passo 1), sem browser. Roda a lista de PASSOS de uma peça, serializa a lista, re-parseia e re-executa, e afirm…
- `gabarito-selecao-lib.mjs` — gabarito-selecao-lib.mjs — regras puras da Prova Zero: compara o acervo atual ao gabarito gravado e permite declarar SOMENTE peças novas nomeadas.
- `gabarito-selecao-lib.test.mjs` — gabarito-selecao-lib.test.mjs — protege a exceção estreita para peça nova: `--novas` aceita presença nova, mas nunca esconde hash, remoção ou erro de nome.
- `gabarito-selecao.mjs` — gabarito-selecao.mjs — a PROVA ZERO da Fase 3.5 (docs/rumo/PLANO.md): mede, peça por peça, que uma mudança no núcleo (`motor/oficina.js`) não mudou o resulta…
- `gabarito.mjs` — gabarito.mjs — P5 do playground (D-118): FORMA COMO NÚMERO. Mede a silhueta RENDERIZADA de uma peça contra um CONTORNO de referência (o gabarito, desenhado à…
- `id-cru.mjs` — id-cru.mjs — o gate do O-4 (docs/mecanifica/OFICINA-OTIMIZACOES.md): REPROVA peça NOVA que enderece geometria por id posicional, sem quebrar as herdadas.
- `id-cru.test.ts` — id-cru.test.ts — prova do gate do O-4: que ele ACHA id cru em peça nova, que a lista de exceções é uma dívida CONGELADA (não um teto para crescer) e que valo…
- `jogar.mjs` — jogar.mjs — o olho do ALICERCE jogável do v3 (D-61).
- `olhar-peca.mjs` — olhar-peca.mjs — o olho da OFICINA (D-55).
- `porteiro.mjs` — porteiro.mjs — o GATE de render da OFICINA (D-60). Renderiza peça(s) do v3 e FALHA (exit≠0) se: houve pageerror, window.__ready ≠ true, ou o frame é DEGENERA…
- `skill-criar-peca.test.ts` — skill-criar-peca.test.ts — a skill de autoria é MEDIDA contra o núcleo, não revisada no olho. Duas afirmações da `.claude/skills/criar-peca/SKILL.md` custam …

## tools/bancadas/bench/

- `benchmark.mjs` — benchmark.mjs — mede QUAIS ferramentas de senso crítico ajudam (D-60). Casos = peças reais × (limpo + cada defeito plantado). Separa NÚCLEO (defeito real/óbv…
- `gabarito-nucleo.mjs` — gabarito-nucleo.mjs — P5 do playground (docs/historico/playground.md): FORMA COMO NÚMERO. Lógica PURA (sem Playwright/browser — unit-testável) por trás da ba…
- `gabarito-nucleo.test.ts` — Vitest do NÚCLEO PURO da bancada de gabarito (P5 do playground, D-118): máscara por diferença de fundo (+ o corte do HUD), filtro de componente pequeno (o pi…
- `mutacoes.mjs` — mutacoes.mjs — DEFEITOS PLANTADOS pro benchmark de senso crítico (D-60). Cada mutação injeta UM defeito de UM domínio numa peça recém-construída (aplicada em…
- `pngstats.mjs` — pngstats.mjs — decodifica um PNG (8-bit, colortype 2/6) via zlib. Sem dependência externa. `decodePng` devolve os pixels CRUS (usado pelo porteiro via `pngSt…
- `pngwrite.mjs` — pngwrite.mjs — codifica um buffer RGB em PNG (8-bit, colortype 2), sem dependência externa (par do decodePng em pngstats.mjs). Usado pela bancada de gabarito…
- `sandbox.mjs` — sandbox.mjs — roda o construir() de uma peça v3 em NODE PURO, sem browser. Um canvas-stub mínimo cobre o texCanvas/bufToCanvas (só usam createImageData/ put/…

## tools/bancadas/bench/tools/

- `contador-de-pixels-orfaos.mjs` — contador-de-pixels-orfaos [orfaos] — caça pixel ÓRFÃO na textura: componente conexo de 1px (sem vizinho igual em 8-viz), de uma cor RARA no tile, que destoa …
- `detector-de-banding.mjs` — detector-de-banding [banding] — dois defeitos de textura que o olho pega mas nenhuma checagem de malha vê: (a) FAIXA CHAPADA — uma faixa horizontal de UMA co…
- `detector-de-seam.mjs` — detector-de-seam [seam] — numa textura que LADRILHA, a borda oposta deve casar (wrap): direita↔esquerda, topo↔base. O defeito plantado troca uma LINHA/COLUNA…
- `distancia-paleta.mjs` — distancia-paleta [paleta] — conformidade de cor à Resurrect64 em espaço perceptual (CIEDE2000 offline, sem libs). Cada pixel deve estar perto de alguma cor d…
- `lint-malha.mjs` — lint-de-malha [malha] — checagem-CPU da geometria antes do render: triângulo degenerado, vértice NaN/Inf/gigante, normal zero/não-unitária, stride/contagem e…
- `simetria.mjs` — simetria [malha] — a peça que DECLARA simetria de fato é simétrica? Opt-in pelo envelope: só roda se `meta.simetria` estiver declarado ('x', 'y' ou 'z' — o e…

## tools/coordenacao/

- `coord.mjs` — coord.mjs — caixa postal local, econômica e sem dependências para coordenar agentes em repositórios diferentes sem carregar histórico ou diffs inteiros.
- `coord.test.mjs` — coord.test.mjs — prova mensagens imutáveis, leitura econômica, confirmações independentes e bloqueio de reservas sobrepostas do canal entre agentes.

## tools/mapa/

- `fatiar.mjs` — fatiar.mjs — a rede de segurança do fatiamento de um doc grande (o alvo hoje é docs/oficina.md). Dois modos, SÓ mecânica — a classificação de qual seção vai …
- `links.mjs` — links.mjs — o gate de referência: varre todo arquivo rastreado por menções a `docs/<...>.md` (caminho com barra, não prosa solta) e reprova quando o caminho …
- `mapa.mjs` — mapa.mjs — gera docs/uso/MAPA.md: o inventário do repositório com o resumo de cada arquivo. O resumo NÃO mora aqui: mora no PRÓPRIO arquivo (primeiro comentá…
- `planos.mjs` — planos.mjs — impede que o planejamento volte a ter mais de um plano ativo ou que um plano executivo ultrapasse o limite curto acordado.
- `planos.test.mjs` — planos.test.mjs — prova que o gate recusa plano grande, estados inválidos, índice divergente e mais de um plano ativo.
- `toc.mjs` — toc.mjs — gera o índice (sumário) de um doc ENTRE os marcadores <!-- TOC --> e <!-- /TOC -->, a partir dos títulos `##` dele. Mesma filosofia do mapa: o índi…

## tools/mecanifica/

- `acervo-adaptador.test.ts` — acervo-adaptador.test.ts — o ADAPTADOR passa por todo o acervo, e não só pelas cinco peças que outros testes usam de fixture.
- `adaptar-three.test.ts` — adaptar-three.test.ts — prova headless da fronteira entre o núcleo procedural herdado e Three.js.
- `argumentos.mjs` — argumentos.mjs — leitura de linha de comando dos CLIs da Mecanifica, com a MESMA lei que o núcleo de autoria aplica a uma referência: bandeira desconhecida, …
- `argumentos.test.ts` — argumentos.test.ts — prova de que os CLIs da Mecanifica não engolem bandeira desconhecida em silêncio (MEDIA-7). O defeito: `--estrit` (uma letra a menos que…
- `arranjo-em-peca.test.ts` — arranjo-em-peca.test.ts — a prova do ciclo "Arranjos semânticos v1" NA PEÇA, não só no núcleo.
- `caminho-confinado.mjs` — caminho-confinado.mjs — guarda de escrita para artefatos que um CLI aceita por caminho. A checagem lexical sozinha não basta: um diretório relativo pode cont…
- `caminho-confinado.test.ts` — caminho-confinado.test.ts — prova do confinamento sem precisar criar links.
- `corrimao-orientacao.test.ts` — corrimao-orientacao.test.ts — a prova NÃO AUTOMOTIVA da `orientacao` do `loft`, o segundo item do ciclo "Corte e orientação de seção v1".
- `descrever-montagem.mjs` — descrever-montagem.mjs — lê uma montagem piloto e imprime o diagnóstico declarativo do encaixe. Não abre renderizador, não aplica pose e não conhece automóve…
- `descrever-partes.test.ts` — descrever-partes.test.ts — prova do O-1: a conferência de uma peça é NÚMERO, não leitura de PNG (ATRITOS-AUTORIA A-13). Mede três coisas: que o módulo neutro…
- `descrever-peca.mjs` — descrever-peca.mjs — a RÉGUA DA BANCADA: constrói uma peça headless e imprime, por parte semântica, caixa (min/max), centro, dimensões e contagem de faces, e…
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
- `normais-lisas.test.ts` — normais-lisas.test.ts — a borda do furo serrilhava na bancada, e a peça não tinha culpa: o `freio-disco` já usa 12 lados no furo do prisioneiro e já marca a …
- `olhar-bancada.mjs` — olhar-bancada.mjs — o OLHO DA BANCADA: dirige `bancada.html` headless pela URL e salva PNG por vista, para que uma sessão sem navegador possa inspecionar o q…
- `portas-espelho-arranja.test.ts` — portas-espelho-arranja.test.ts — prova adversarial de AUT-2026-15: uma interface não pode permanecer no espaço da fonte quando a sua geometria foi copiada. C…
- `prateleira-integridade.test.ts` — Integridade da peça de exercício `_prateleira-furada` — a prova NÃO AUTOMOTIVA do ciclo "Corte e orientação de seção v1".
- `referencia-posicional.test.ts` — referencia-posicional.test.ts — prova do A-22: a regra de "isto é referência por id posicional?" é UMA SÓ, e ela distingue as duas coisas que a chave `de` ca…
- `roda-dianteira-integridade.test.ts` — roda-dianteira-integridade.test.ts — contratos semânticos da roda revisável na bancada.
- `tampa-de-caixa-integridade.test.ts` — Integridade da peça de exercício `_tampa-de-caixa` — a prova NÃO AUTOMOTIVA do ciclo "Furo v2": vários furos na MESMA face, num passo só.
- `vao-e-anteparo.test.ts` — vao-e-anteparo.test.ts — prova de comportamento das duas ops que o O-14 tirou do ponto cego: `apagaFace` (abre o vão) e `vira` (corrige a normal). Cada asser…

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
