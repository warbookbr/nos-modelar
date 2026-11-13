# Histórico retirado: do que trata cada arquivo

O texto inteiro de cada arquivo está no git, no commit `<C>`, em `docs/modelar/historico/<arquivo>`, e se lê com `git show <C>:docs/modelar/historico/<arquivo>`. A pasta saiu da árvore em 2026-11-13, com o plano de organização dos documentos; o que segue é uma linha por arquivo, em ordem alfabética.

Histórico não governa trabalho novo: é registro do que se fez e se mediu. As decisões que continuam valendo estão em `registros/`, nesta pasta.

- `ALVO-N6-CUPE-ESPORTIVO.md`: pacote do alvo visual do cupê N6 (direção estética aprovada em 2026-08-24), com a regra de comparar cada render só com a referência individual de mesmo enquadramento e o briefing de rejeições.
- `ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md`: dossiê de agosto de 2026 que escolheu cage de quads com Catmull-Clark para a pele exterior e rejeitou OCCT/B-rep, Blender headless, SDF, kernel próprio e loft como base.
- `BASELINE-MOTOR-R00.md`: retrato do motor procedural antes da modularização (2.683 linhas, 32 operações, 48 exportações) e comandos de baseline.
- `BICICLETA-REALISTA-ATRITOS.md`: diário de atritos da modelagem da bicicleta realista, escrito durante a rodada, com a lição de 'procurei e não achei' virar 'não existe'.
- `CADEIRA-REALISTA-NOTAS.md`: diário da cadeira realista contra foto, com limites do motor (afunilamento, rebaixo anatômico, veios) e três rodadas de crítico visual.
- `CHASSI-P0-ALVO-E-LIMIARES.md`: alvo, perfil de autoria e limiares do chassi P0, declarado não vinculante desde 2026-08-24 porque os landmarks foram inventados.
- `CHASSI-P1-CONTRATO-DA-CAGE.md`: formato `cage-quad@1` da malha de controle, política de diff e orçamento por nível, contrato que o código atual substituiu.
- `CHEGADA-2026-09-11.md`: registro de como 18 documentos soltos de docs/modelar/ vieram para historico/ em 2026-09-11, com o critério de cada grupo.
- `CONJUNTO-PROVA-AUTORIA-GEOMETRICA.md`: conjunto de três peças (suporte de eixo, eixo-guia, anel-tampa) que provou autoria do zero com relações de montagem.
- `CONTEXTO-FERRAMENTAS-DE-MODELAGEM.md`: complemento do plano das ferramentas de modelagem: o que já existia, referências por fatia, desenho das fatias 4, 8 e 9 e lista de sucessão.
- `DOSSIE-CABO-DE-PA.md`: estudo computacional de nove materiais para cabo de pá, com recomendação do colmo de bambu com seleção de lote.
- `DOSSIE-FLUXO-IA-VALIDACAO-MULTIFAMILIA.md`: protocolo de estados do plano mestre da arquitetura híbrida (briefing a promoção) com papéis separados e recuperação por falha.
- `DOSSIE-LABORATORIO-IA.md`: especificação do laboratório computacional para IA, incubado e depois movido para o repositório nos-ciencia.
- `DOSSIE-MODELADOR-POR-SELECAO.md`: proposta de modelador de carroceria em que a IA ordena candidatos gerados por linhas de caráter, superada em 2026-08-25.
- `DOSSIE-MOTOR-SUPERFICIES-NATIVAS.md`: dossiê do teto da capacidade de superfície semântica (superficie-semantica@1, níveis blocagem a detalhe).
- `DOSSIE-PLATAFORMA-AUTORIA-3D-NATIVA.md`: arquitetura vinculante do plano mestre de 2026-08-23 (ativos a preservar, camadas, garantias não funcionais).
- `EXPERIMENTO-AB-FLUXO-IA.md`: experimento cego de duas condições (com e sem pacote de modelagem assistida) sobre uma dobradiça: empate em 14/16.
- `EXPERIMENTO-CARRO-SEM-APOIO.md`: carro feito por outra IA sem o núcleo (estações digitadas), reprovado pelo critério visual dela, e a razão de o gerador ter saído.
- `EXPERIMENTO-RODA-REALISTA.md`: contrato do experimento da roda realista (restrições, perfil pedido, entregáveis); resultado em RELATO-RODA-REALISTA.
- `FLUXO-AUTORIA-N1.md`: contrato executável da N1: objetivo-autoria@1, receita-autoral@1, provedores e transições.
- `GRAFO-DE-CAPACIDADES-COMO-RECRIAR.md`: o que era o hipergrafo de capacidades do catálogo, por que saiu em 2026-10-27 e o commit que guarda o código.
- `IMPORTADORES-COMO-RECRIAR.md`: desenho dos importadores de OpenSCAD (.csg), STEP e STL para .esboco.json, que saíram em 2026-10-25, e o commit que guarda o código.
- `LABORATORIO-IA-PROGRESSO.md`: relato por fatia do laboratório computacional (R0 a R5) e do piloto do cabo de pá, com a lição de que soma ponderada deixa critério compensar requisito estrutural.
- `LEVANTAMENTO-DESENHO-SEM-REFERENCIA.md`: levantamento da fatia 1 do plano desenho sem referência: resolvedores de restrições 2D (planegcs, SolveSpace, FreeCAD, CADCraft) e Potrace/VectorCraft contra a borda subpixel do contorno da imagem.
- `LEVANTAMENTO-IA-3D-2026-10.md`: levantamento de IAs que geram 3D (AssemCAD, SNAP3D, CAD-Coder, preços) e o lugar da Mecanifica, com correções de citação.
- `MALHA-OTIMIZADA-PROGRESSO.md`: relato das fatias H1 a H5 da malha otimizada (cadeira, redução de vértice sem ganho, organizador de topologia, armas melee).
- `MATRIZ-RASTREABILIDADE-AUTORIA-3D-NATIVA.md`: matriz RT-01 a RT-xx que ligava objetivo, capacidade, teste e gate do plano mestre da arquitetura híbrida.
- `OFICINA-OTIMIZACOES.md`: análise de dependências e backlog R1 a R9 (O-0 a O-14) da linguagem de autoria da Oficina, com a lista 'o que deliberadamente não fazer'.
- `PLANO-ESTADO-DA-ARTE-ESBOCO.md`: plano de 2026-09-28 para de/para, âncoras, polígono e espelho no esboço antigo, substituído por 'o esboço sem conta à mão'.
- `PLANO.md`: plano mestre da Mecanifica aposentado em 2026-08-02, que só remete ao commit 41f0c50 e ao encerramento.
- `PROTOCOLO-DIAGNOSTICO-MOTOR.md`: protocolo de método do diagnóstico do motor procedural (distinções capacidade implementada, contratada, provada).
- `README.md`: índice de historico/ (tabela do que cada arquivo prova) e remissão para CHEGADA-2026-09-11.
- `REGISTRO-FALHAS-AUTORIA-V.md`: registro das 38 falhas medidas da autoria (V-01 a V-38), a maioria do programa de carroceria N6 congelado.
- `RELATO-RODA-REALISTA.md`: relato do experimento da roda realista (rodadas de pneu, raios, arranja), concluído sem integração.
- `RELATORIO-ANALISE-GRANDES-MELHORIAS.md`: análise de 2026-08-14 do estado da Mecanifica e da melhoria de catálogo único com revisão ativa (MCP v4).
- `RELATORIO-AUDITORIA-PRATICAS-AUTORIA-3D.md`: auditoria de 2026-08-20 das práticas de autoria 3D, com a decisão 'corrigir': medida estrutural não encerra decisão de forma.
- `RELATORIO-CHASSI-P2-PROVA-DO-QUARTO.md`: prova privada da cage do quarto dianteiro, reprovada pela pessoa no aceite apesar de gates verdes.
- `RELATORIO-DIAGNOSTICO-MOTOR.md`: relatório do diagnóstico do motor: 'motor adequado, abrir Montagem Mínima Persistida v1'.
- `RELATORIO-ENSAIO-DOBRADICA-1-0.md`: ensaio ponta a ponta da dobradiça 1.0 (três receitas, montagem v4, composições pelas portas oficiais, descoberta progressiva).
- `RELATORIO-ESTUDO-CAMPO-CONJUNTO-DIANTEIRO.md`: estudo de campo de 2026-08-14 do conjunto dianteiro (seis peças, relação direcional disco-pinça).
- `RELATORIO-EXPERIMENTO-AUTORIA-GEOMETRICA.md`: relatório de 2026-08-14 do experimento de autoria do zero: aprovado após o recorte da receita declarativa.
- `RELATORIO-EXPORTACAO-CAD-STEP-R00.md`: prova R00 da exportação STEP: occt-wasm 4.3.2 aprovado, opencascade.js recusado.
- `RELATORIO-MODELADOR-INVERSO-P0.md`: relatório P0 do modelador inverso (linha de base, alvo, calibração do crítico), bloqueado por execução independente.
- `RELATORIO-MOTOR-DE-PRANCHA-R0.md`: R0 do motor de prancha: matriz de dez defeitos injetados e o que o contrato local passou a recusar.
- `RELATORIO-MOTOR-DE-PRANCHA-R1.md`: R1 do motor de prancha: OpenCV adiado, Potrace e Inkscape rejeitados do caminho crítico, SVG Path usado.
- `RELATORIO-MOTOR-DE-PRANCHA-R2.md`: R2 do motor de prancha: contrato de autoria mecanifica.prancha-autoria@1.
- `RELATORIO-MOTOR-DE-PRANCHA-R3.md`: R3 do motor de prancha: matriz executável do corpus e decisão de não incorporar mecanismo externo.
- `RELATORIO-MOTOR-DE-PRANCHA-R4.md`: R4 parcial: autoria fria da furgoneta técnica e revisão por mutação, sem comparação 3D.
- `RELATORIO-N1-FLUXO-AUTORIA.md`: encerramento da N1: contratos e orquestração da autoria 3D, sem geometria pública alterada.
- `RELATORIO-N2-FORMA-GLOBAL.md`: encerramento técnico da N2 (alvo, andaime, blocagem, G01 aprovado, G02 bloqueado).
- `RELATORIO-N3-CANAL-PERCEPCAO.md`: canal de percepção N3 (zebra, isófota, curvatura) revalidado para C1, e sonda de suavização N3.5 rejeitada.
- `RELATORIO-N4-RESTRICOES.md`: sonda N4 de autoria por restrição: duas seções satisfazem três restrições, após corrigir crista C0.
- `RELATORIO-N5-BUSCA.md`: sonda N5: busca residual de uma liberdade (bojoRelativo) com objetivo sintético e elegibilidade geométrica.
- `RELATORIO-N6-CANARIO-CASCO-VISUAL.md`: canário N6: casco por interseção de silhuetas binárias, reprovado e encerrado.
- `RELATORIO-PLATAFORMA-PROCEDURAL-R10.md`: encerramento R10 do plano de plataforma procedural extensível (32 operações, estudo de campo com três famílias).
- `RELATORIO-PONTE-THREE.md`: prova da ponte Three.js (23 partes expostas, 317 testes, build aprovado).
- `RELATORIO-R05-REVALIDACAO-CAMPO.md`: estudo de campo R05 da revalidação persistida (duas raízes e um ramo isolado) e a operação obsoletarCampanhaRevalidacao.
- `RELATORIO-R2-CAGE-DIRETA-R3.md`: R2 da cage direta: forma global reprovada (20,5/31,5/32,7 mm contra 14/16/16) e redesenho para R2B.
- `RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md`: sonda da armadura humanoide 1.0 (13 definições, 22 folhas, pose articulada como estado) e o próximo teto.
- `RELATORIO-SONDA-SUPERCARRO-1-0.md`: sonda do supercarro 1.0 (12 definições, 27 folhas, contexto progressivo) e limites revelados.
- `REORGANIZACAO-POR-USO-PROGRESSO.md`: rastreio das fases F0 a F6 da reorganização por uso (usar/, gates G1 a G7) e a recusa da pasta desenvolver/ com custo medido.
- `REVISAO-DE-RUMO-2026-10.md`: revisão de rumo de 2026-10-06 com conferência da Planejadora: condição de reabertura do B-Rep cumprida, experimento do cilindroHidraulico.
- `VEICULOS-PRIMEIRA-LEVA-2026-10.md`: diagnóstico da primeira leva de veículos de referência livre e o experimento da perua pelas três vistas.
- `esboco-2d.md`: o esboço 2D antigo (modulos/esboco/, 117 arquivos), que saiu em 2026-11-05, o que ensinou e como recriar.

Pastas de dados, lidas só por ferramenta:

- `ciclo6/`: 14 arquivos JSON do ciclo 6, a rodada de agosto em que quatro atritos do motor (A-30, A-34, A-36 e A-37) foram atacados em paralelo, com duas propostas independentes cada, o cruzamento, o mapa, as críticas e os vereditos; evidência congelada da época.
- `evidencias-n2-forma-global/`: 10 arquivos JSON, as evidências do N2 de forma global (alvo, andaime, blocagem, avaliações G00 e G01, pacotes do crítico e o manifesto).
