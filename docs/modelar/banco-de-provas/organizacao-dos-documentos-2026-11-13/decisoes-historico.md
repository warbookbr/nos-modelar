# Decisões em vigor, lote 3 de historico/

## ALVO-N6-CUPE-ESPORTIVO.md
Do que trata: pacote do alvo visual do cupê N6 (direção estética aprovada em 2026-08-24), com a regra de comparar cada render só com a referência individual de mesmo enquadramento e o briefing de rejeições. Citado por (vivos): docs/modelar/planos/congelados/2026-08-25-modelador-inverso-priors-familia-p0.md.
- [B] cada render se compara só com a referência individual de mesmo enquadramento, em tamanho nativo; prancha inteira, mosaico e miniatura não são evidência. Porquê: a comparação por mosaico aprovou formas reprovadas. Lugar: docs/modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md e usar/LACO-VISUAL.md (grep 'tamanho nativo')

## ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md
Do que trata: dossiê de agosto de 2026 que escolheu cage de quads com Catmull-Clark para a pele exterior e rejeitou OCCT/B-rep, Blender headless, SDF, kernel próprio e loft como base. Citado por (vivos): nenhum.
- [B] pele exterior com aberturas não parte de loft nem de booleana, e a chapa lisa se faz por subdivisão de gaiola por estações; B-rep só volta com requisito CAD. Porquê: o loft não abre vão envidraçado sem booleana e acopla capô, ombro e teto. Lugar: docs/modelar/modelar-carroceria.md (gaiola por estações, 'subdivisao'), docs/modelar/DOSSIE-EXPORTACAO-CAD-STEP.md e ANALISES-DE-2026-10.md (B-rep); a recusa do loft como base está em docs/modelar/historico/REGISTRO-FALHAS-AUTORIA-V.md (A, abaixo; ele precisa ir para decisoes/ antes de a pasta sair), V-02

## BASELINE-MOTOR-R00.md
Do que trata: retrato do motor procedural antes da modularização (2.683 linhas, 32 operações, 48 exportações) e comandos de baseline. Citado por (vivos): nenhum.
- [B] atualizar a baseline do motor é decisão explícita de contrato, nunca modo de esconder regressão; tempo e memória não têm teto entre máquinas. Porquê: o corpus mede compatibilidade funcional, não desempenho. Lugar: gates `baseline:motor` e `baseline:motor:medir` (package.json) com tools/oficina/fixtures/motor-r00-baseline.json

## BICICLETA-REALISTA-ATRITOS.md
Do que trata: diário de atritos da modelagem da bicicleta realista, escrito durante a rodada, com a lição de 'procurei e não achei' virar 'não existe'. Citado por (vivos): docs/modelar/ATRITOS-AUTORIA.md.
- [B] atrito se anota na hora, com comando, mensagem e contorno; imagem gerada por IA não é fonte dimensional (a tabela publicada cede só por procedência); contato declarado nasce DENTRO da peça vizinha, não por tolerância de milímetro; anexo da conversa existe no .jsonl da sessão. Porquê: atrito lembrado depois vira opinião, e a medida contradisse a tabela sem decidir quem cede. Lugar: docs/modelar/ATRITOS-AUTORIA.md, CLAUDE.md (imagem de IA vale como caráter, nunca como medida), tools/modelar/medir-transcricao.mjs, .claude/skills/criar-peca

## CADEIRA-REALISTA-NOTAS.md
Do que trata: diário da cadeira realista contra foto, com limites do motor (afunilamento, rebaixo anatômico, veios) e três rodadas de crítico visual. Citado por (vivos): nenhum.
- [C] receita apagada em 2026-09-23; limites do motor eram de então (loft com seções chanfradas resolveu o encosto). Porquê: registro de rodada encerrada, sem regra que não esteja nos guias de operação.

## CHASSI-P0-ALVO-E-LIMIARES.md
Do que trata: alvo, perfil de autoria e limiares do chassi P0, declarado não vinculante desde 2026-08-24 porque os landmarks foram inventados. Citado por (vivos): nenhum.
- [B] modelar só contra alvo declarado antes e medido (dimensão, perfil, condição de rejeição escrita); landmark inventado pela IA não vale como alvo. Porquê: sem alvo os eixos aprovam sozinhos e a sonda reprovada pela pessoa passou nos gates. Lugar: docs/modelar/usar/GOTCHAS-AUTORIA-VISUAL.md ('inventados'), .claude/skills/alinhar-modelagem/SKILL.md, CLAUDE.md (nenhuma métrica aprova forma)

## CHASSI-P1-CONTRATO-DA-CAGE.md
Do que trata: formato `cage-quad@1` da malha de controle, política de diff e orçamento por nível, contrato que o código atual substituiu. Citado por (vivos): nenhum.
- [C] a cage como artefato próprio e a política de diff foram superadas pela gaiola por estações no núcleo. Porquê: o contrato descreve formato que não existe mais; a gaiola vive em procedural/nucleo/gaiola-por-rede*.js.

## CHEGADA-2026-09-11.md
Do que trata: registro de como 18 documentos soltos de docs/modelar/ vieram para historico/ em 2026-09-11, com o critério de cada grupo. Citado por (vivos): docs/modelar/roteiros/roteiros.json, docs/modelar/roteiros/ROTEIROS.md.
- [C] nenhuma. Porquê: é a crônica de uma mudança de pasta já feita; a pasta inteira sai.

## CONJUNTO-PROVA-AUTORIA-GEOMETRICA.md
Do que trata: conjunto de três peças (suporte de eixo, eixo-guia, anel-tampa) que provou autoria do zero com relações de montagem. Citado por (vivos): docs/modelar/INVENTARIO.md.
- [C] conjunto de prova definido e já executado. Porquê: o resultado está no relatório do experimento e o fluxo virou autoria declarativa.

## CONTEXTO-FERRAMENTAS-DE-MODELAGEM.md
Do que trata: complemento do plano das ferramentas de modelagem: o que já existia, referências por fatia, desenho das fatias 4, 8 e 9 e lista de sucessão. Citado por (vivos): modulos/pesquisa/bibliotecas/BIBLIOTECAS.md, modulos/pesquisa/README.md, docs/modelar/CONTRATO-DA-FAMILIA.md.
- [C] desenho de fatias entregues e lista de candidatos (carrinho de mão, bacia em casca, dobradiça de caneco) que não está no BACKLOG. Porquê: candidato não autoriza trabalho e o plano que o carregava encerrou; se a pessoa quiser os candidatos, copiá-los para planos/BACKLOG.md antes de sair.

## DOSSIE-CABO-DE-PA.md
Do que trata: estudo computacional de nove materiais para cabo de pá, com recomendação do colmo de bambu com seleção de lote. Citado por (vivos): nenhum.
- [C] estudo de material fechado, sem ensaio. Porquê: não governa modelagem; o laboratório que o gerou saiu para outro repositório e o texto fica no git.

## DOSSIE-FLUXO-IA-VALIDACAO-MULTIFAMILIA.md
Do que trata: protocolo de estados do plano mestre da arquitetura híbrida (briefing a promoção) com papéis separados e recuperação por falha. Citado por (vivos): nenhum.
- [B] autor, validador determinístico, crítico independente e publicador são papéis separados; o mesmo agente não simula independência trocando o prompt; falha volta ao primeiro estado invalidado. Porquê: o crítico precisa de contexto realmente separado. Lugar: .claude/skills/laco-de-modelagem/SKILL.md e docs/modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md

## DOSSIE-LABORATORIO-IA.md
Do que trata: especificação do laboratório computacional para IA, incubado e depois movido para o repositório nos-ciencia. Citado por (vivos): nenhum.
- [C] subsistema que saiu deste repositório. Porquê: o desenho vive onde o laboratório mora; aqui só restava o registro.

## DOSSIE-MODELADOR-POR-SELECAO.md
Do que trata: proposta de modelador de carroceria em que a IA ordena candidatos gerados por linhas de caráter, superada em 2026-08-25. Citado por (vivos): docs/modelar/LEITURA-POR-TAREFA.md.
- [B] a premissa 'a IA compara melhor do que cria' não foi calibrada; o gerador manual limitava o espaço. Porquê: a seleção não cria o que o gerador não representa. Lugar: docs/modelar/DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md e V-36 em docs/modelar/historico/REGISTRO-FALHAS-AUTORIA-V.md (A, abaixo; ele precisa ir para decisoes/ antes de a pasta sair)

## DOSSIE-MOTOR-SUPERFICIES-NATIVAS.md
Do que trata: dossiê do teto da capacidade de superfície semântica (superficie-semantica@1, níveis blocagem a detalhe). Citado por (vivos): nenhum.
- [C] proposta de um plano encerrado. Porquê: a superfície semântica não foi construída com esse nome; o que existiu virou gaiola e subdivisão.

## DOSSIE-PLATAFORMA-AUTORIA-3D-NATIVA.md
Do que trata: arquitetura vinculante do plano mestre de 2026-08-23 (ativos a preservar, camadas, garantias não funcionais). Citado por (vivos): nenhum.
- [C] arquitetura de plano encerrado. Porquê: as garantias (determinismo, falha fechada, diagnóstico com causa) estão nos contratos vivos.

## EXPERIMENTO-AB-FLUXO-IA.md
Do que trata: experimento cego de duas condições (com e sem pacote de modelagem assistida) sobre uma dobradiça: empate em 14/16. Citado por (vivos): docs/modelar/INVENTARIO.md.
- [C] o fluxo assistido empatou; a causa dominante das falhas era a câmera, corrigida pela revisão visual econômica. Porquê: evidência de etapa vencida; a correção já está na ferramenta.

## EXPERIMENTO-CARRO-SEM-APOIO.md
Do que trata: carro feito por outra IA sem o núcleo (estações digitadas), reprovado pelo critério visual dela, e a razão de o gerador ter saído. Citado por (vivos): nenhum.
- [B] código commitado que nenhuma régua executa apodrece em silêncio e não se guarda como acervo; a saída da IA sem apoio não é editável nem verificável. Porquê: gerador e receita estavam em versões diferentes e ninguém percebeu. Lugar: CLAUDE.md (conteúdo salvo reexecutável e validável; todo achado responde se o processo o pegaria) e gates de execução de peças

## EXPERIMENTO-RODA-REALISTA.md
Do que trata: contrato do experimento da roda realista (restrições, perfil pedido, entregáveis); resultado em RELATO-RODA-REALISTA. Citado por (vivos): docs/modelar/PERFIS-DE-AUTORIA.md, docs/modelar/INVENTARIO.md.
- [C] roda não integrada; variante isolada. Porquê: o fluxo que o experimento justificou está em PERFIS-DE-AUTORIA.md.

## FLUXO-AUTORIA-N1.md
Do que trata: contrato executável da N1: objetivo-autoria@1, receita-autoral@1, provedores e transições. Citado por (vivos): nenhum.
- [B] nenhum adaptador declara forma-global, superfície ou publicação só porque produz malha, imagem ou arquivo; fonte e produto derivado são separados. Porquê: serviço existente não é etapa coberta. Lugar: src/autoria/contrato-autoria-3d.js, orquestrar-fluxo-autoria.js, docs/modelar/gerado/schemas-autoria-3d.json e os testes fluxo-autoria-n1*

## GRAFO-DE-CAPACIDADES-COMO-RECRIAR.md
Do que trata: o que era o hipergrafo de capacidades do catálogo, por que saiu em 2026-10-27 e o commit que guarda o código. Citado por (vivos): nenhum.
- [A] o grafo de capacidades saiu porque ninguém o lia e o motor só tinha quatro tipos de artefato; volta a valer se o motor ganhar tipos intermediários (curva, perfil, superfície, sólido) com operações que os convertem. Porquê: evita recriá-lo sem a condição e diz onde está o código (commit 7d733520: procedural/nucleo/catalogo.js, tools/catalogo/gerar-catalogo-capacidades.mjs). Procurei: 7d733520 e 'grafo de capacidades' em tools/, procedural/, src/, .claude/, docs/modelar/*.md, usar/ (só ARQUITETURA.md e tools/mapa/citacoes.mjs citam o termo, sem a condição de volta); Rascunho do registro: Decisão de 2026-10-27: o grafo de capacidades (hipergrafo derivado do catálogo, recurso MCP mecanifica://procedural/grafo) foi retirado por falta de leitor; o contrato MCP passou de revisao.v6 para v7. Condição de retorno: tipos intermediários de artefato com operações de conversão. Código no commit 7d733520.

## IMPORTADORES-COMO-RECRIAR.md
Do que trata: desenho dos importadores de OpenSCAD (.csg), STEP e STL para .esboco.json, que saíram em 2026-10-25, e o commit que guarda o código. Citado por (vivos): nenhum.
- [A] os importadores saíram porque o plano que os criou fechou com decisão de não seguir e nenhum fluxo os chamava; quem recriar usa o quadro y-para-cima/frente em -z, classifica revolução, extrusão e caixa pela normal, recusa nó desconhecido do .csg com a linha e não aproxima em silêncio. Porquê: guarda o desenho para não refazer as decisões e o commit onde está o código. Procurei: 37665caa, 'importar-csg', 'importar-step', 'importador' em tools/, modulos/, .claude/, docs/modelar/usar e *.md vivos (nenhum documento vivo descreve o desenho; só este arquivo e o plano encerrado); Rascunho do registro: Decisão de 2026-10-25: importadores de .csg, STEP e STL removidos. Código, testes e scripts no commit 37665caa. Desenho a preservar: conversão z-para-cima em (x,y,z)->(x,z,-y) com --frente e --girar; STEP lido por occt-wasm, classificado em revolução, extrusão ou caixa pelas normais (tolerâncias 1e-5, 2e-3); STL facetado classifica a partir de 12 lados; formas não suportadas recusadas todas de uma vez com nó e linha.

## LABORATORIO-IA-PROGRESSO.md
Do que trata: relato por fatia do laboratório computacional (R0 a R5) e do piloto do cabo de pá, com a lição de que soma ponderada deixa critério compensar requisito estrutural. Citado por (vivos): nenhum.
- [C] lições do laboratório e de seleção de material. Porquê: pertencem ao repositório nos-ciencia; nenhum trabalho de modelagem daqui as usa.

## LEVANTAMENTO-DESENHO-SEM-REFERENCIA.md
Do que trata: levantamento da fatia 1 do plano desenho sem referência: resolvedores de restrições 2D (planegcs, SolveSpace, FreeCAD, CADCraft) e Potrace/VectorCraft contra a borda subpixel do contorno da imagem. Citado por (vivos): docs/modelar/PESQUISA-ABERTA-2026-10.md, docs/modelar/planos/BACKLOG.md.
- [A] (1) não substituir nem complementar a borda subpixel por Potrace ou VectorCraft (medido: o limiar 225 põe a borda 0,4 a 0,55 px para fora em qualquer ferramenta); (2) o planegcs devolve sucesso, grau de liberdade zero e geometria espelhada quando o chute inicial cai do lado errado, porque a distância ponto-reta não tem sinal; (3) o `denteMaximo` do contorno corta ponta aguda e falta teste com imagem sintética de verdade conhecida no gate do módulo. Porquê: o módulo desenho-por-restricoes saiu do repositório e o BACKLOG ainda aponta para a medida deste arquivo (linha 'Pontas agudas cortadas pelo alisamento'). Procurei: planegcs, 'lado errado', Potrace, VectorCraft e denteMaximo em tools/, modulos/, procedural/, .claude/, docs/modelar/*.md e usar/ (só PESQUISA-ABERTA-2026-10.md lista os candidatos, sem as medidas; modulos/contorno-da-imagem/src/regioes.js tem um comentário com razão diferente); Rascunho do registro: Medidas de 2026-10-14 sobre imagem sintética de verdade conhecida (asa de 21 graus, círculo, placa de 7 graus, barra de 4 px): borda subpixel a 0,09 px; Potrace e VectorCraft só igualam com meio-tom e falham no avião (silhueta em 3 a 31 pedaços); não trocar. Resolvedor de restrições: planegcs 1.3.0 ganhou por rodar no Node em 83 a 110 ms, mas aceita a solução espelhada com dof 0 quando o chute está do lado errado; qualquer módulo futuro precisa declarar o lado de cada relação. `denteMaximo` 9 px² corta 5 px numa ponta de 21 graus e 102 a 138 mm nas pontas de hélice do avião; falta o teste sintético no gate de modulos/contorno-da-imagem.

## LEVANTAMENTO-IA-3D-2026-10.md
Do que trata: levantamento de IAs que geram 3D (AssemCAD, SNAP3D, CAD-Coder, preços) e o lugar da Mecanifica, com correções de citação. Citado por (vivos): nenhum.
- [B] modelos gerais compilam mas não montam (APR 0 a 0,83%); só modelo com partes tipadas, portas e encaixes chega a 87,5%. Porquê: respaldo externo da tese de portas e relações explícitas. Lugar: docs/modelar/PESQUISA-ABERTA-2026-10.md (AssemBench, AssemCAD, SNAP3D)

## MALHA-OTIMIZADA-PROGRESSO.md
Do que trata: relato das fatias H1 a H5 da malha otimizada (cadeira, redução de vértice sem ganho, organizador de topologia, armas melee). Citado por (vivos): nenhum.
- [B] quad de loft só sai plano quando as duas seções vizinhas são semelhantes; redução de vértice prova o invariante e rende quase nada; contagem, fechamento e orientação se medem, 'lê como o objeto certo' só olhando. Porquê: é o determinante das duas diagonais, não heurística. Lugar: docs/modelar/usar/GOTCHAS-POR-OPERACAO.md (item 2 do loft) e usar/GOTCHAS-AUTORIA-VISUAL.md

## MATRIZ-RASTREABILIDADE-AUTORIA-3D-NATIVA.md
Do que trata: matriz RT-01 a RT-xx que ligava objetivo, capacidade, teste e gate do plano mestre da arquitetura híbrida. Citado por (vivos): nenhum.
- [C] matriz de plano encerrado. Porquê: 'proposto' não se descreve como existente é regra geral já praticada nos contratos.

## OFICINA-OTIMIZACOES.md
Do que trata: análise de dependências e backlog R1 a R9 (O-0 a O-14) da linguagem de autoria da Oficina, com a lista 'o que deliberadamente não fazer'. Citado por (vivos): procedural/nucleo/operacoes/atributos.js, procedural/nucleo/nucleo.js, tools/oficina/oficina.test.ts, docs/modelar/INVENTARIO.md.
- [B] sem eval para expressão (lista branca), sem remover id cru de peça legada, sem mais primitivas antes de endereçamento, sem arranjo antes de origem universal. Porquê: artefato reproduzível não executa string arbitrária e repetir sem identidade gera face anônima em escala. Lugar: CLAUDE.md (conteúdo salvo determinístico), procedural/nucleo/expressoes.js (sem eval) e o gate de id cru; as rodadas R1 a R4 estão entregues. Os comentários de procedural/nucleo/operacoes/atributos.js (linha 63), procedural/nucleo/nucleo.js (2013) e tools/oficina/oficina.test.ts (3676) citam este arquivo pelo caminho e precisam ser reescritos

## PLANO-ESTADO-DA-ARTE-ESBOCO.md
Do que trata: plano de 2026-09-28 para de/para, âncoras, polígono e espelho no esboço antigo, substituído por 'o esboço sem conta à mão'. Citado por (vivos): nenhum.
- [C] plano substituído, de módulo que saiu em 2026-11-05. Porquê: o esboço antigo já não existe.

## PLANO.md
Do que trata: plano mestre da Mecanifica aposentado em 2026-08-02, que só remete ao commit 41f0c50 e ao encerramento. Citado por (vivos): docs/modelar/INVENTARIO.md, docs/oficina.md.
- [C] plano mestre encerrado (F1 do Ciclo 6 aceita, resto cancelado porque filete é chanfro e arredondamento é arredondarAresta). Porquê: o contrato de filete e arredondarAresta está em FILETE-V2.md e nas referências de operações; o commit 41f0c50 fica na crônica.

## PROTOCOLO-DIAGNOSTICO-MOTOR.md
Do que trata: protocolo de método do diagnóstico do motor procedural (distinções capacidade implementada, contratada, provada). Citado por (vivos): docs/modelar/INVENTARIO.md.
- [C] método de uma auditoria já feita. Porquê: a lição geral (teste verde não prova contrato não testado) está no contrato e nas skills de auditoria.

## README.md
Do que trata: índice de historico/ (tabela do que cada arquivo prova) e remissão para CHEGADA-2026-09-11. Citado por (vivos): docs/nos-herdado/README.md, docs/modelar/roteiros/roteiros.json, docs/modelar/roteiros/ROTEIROS.md, docs/modelar/INDEX.md, docs/modelar/INVENTARIO.md, (e, por caminho de pasta, tools/mapa/estrutura-docs.mjs e tools/mapa/links.mjs).
- [C] nenhuma. Porquê: índice da própria pasta que sai; a frase 'consultar para contexto, não autoriza' vai para o README de decisoes/.

## REGISTRO-FALHAS-AUTORIA-V.md
Do que trata: registro das 38 falhas medidas da autoria (V-01 a V-38), a maioria do programa de carroceria N6 congelado. Citado por (vivos): tools/mapa/estrutura-docs.mjs, docs/modelar/usar/GOTCHAS-AUTORIA-VISUAL.md.
- [A] hipóteses de forma já reprovadas que não voltam como base: V-01 números de seções à mão (loft, envelopes, cage direta); V-02 loft como pele exterior; V-04 mais polígonos como estratégia; V-09 suavização pós-modelagem; V-17 e V-22 interseção de silhuetas binárias; V-28 três vistas não determinam a seção; V-30 trocar 80 coordenadas por 12 parâmetros chutados; V-36 esperar que a busca ache forma que o gerador não representa. Regras de processo: V-31 varrer o registro antes de abrir experimento e V-32 não contornar por redação a condição de encerramento escrita antes. Porquê: GOTCHAS-AUTORIA-VISUAL.md manda consultar este arquivo pelo roteiro `pesquisar` antes de abrir experimento de forma, e tools/mapa/estrutura-docs.mjs o tem na allowlist; sem ele a V-31 se repete. Procurei: V-28, '82%', 'prova-secoes-por-medida', 'pele exterior', 'cápsula', 'silhueta binária' em tools/, procedural/, src/, .claude/, docs/modelar/usar, docs/modelar/*.md (só aparecem a menção à V-31 em GOTCHAS-AUTORIA-VISUAL.md e o dossiê do modelador inverso); Rascunho do registro: Um registro por recusa, sem a tabela inteira: 'não se parte de seções à mão, de loft para pele exterior com aberturas, de densidade, de suavização posterior nem de silhueta binária; a seção transversal não sai de três vistas (82% das estações ficam escondidas e duas famílias de vistas idênticas diferem 28 mm no flanco; blueprint dá esqueleto, nunca seção); parâmetro com nome bonito chutado continua chute; busca não cria o que o gerador não representa'. Os ids V-xx e o commit do arquivo ficam no registro. Os abertos (V-03, V-14, V-16, V-19, V-23, V-37) entram como pendência no BACKLOG, não como decisão.

## RELATO-RODA-REALISTA.md
Do que trata: relato do experimento da roda realista (rodadas de pneu, raios, arranja), concluído sem integração. Citado por (vivos): procedural/nucleo/operacoes/transformacoes.js, docs/modelar/PERFIS-DE-AUTORIA.md, docs/modelar/INVENTARIO.md.
- [C] a variante ficou isolada e a conclusão (faltam relações autorais de alto nível: repetição radial, orientação de seção, filetes) virou capacidades do núcleo. Porquê: evidência encerrada; o comentário de procedural/nucleo/operacoes/transformacoes.js que o cita precisa ser reescrito.

## RELATORIO-ANALISE-GRANDES-MELHORIAS.md
Do que trata: análise de 2026-08-14 do estado da Mecanifica e da melhoria de catálogo único com revisão ativa (MCP v4). Citado por (vivos): nenhum.
- [C] recorte entregue. Porquê: 'não importar PBR ou paleta por implicação' já é regra do contrato (material só como escolha por peça).

## RELATORIO-AUDITORIA-PRATICAS-AUTORIA-3D.md
Do que trata: auditoria de 2026-08-20 das práticas de autoria 3D, com a decisão 'corrigir': medida estrutural não encerra decisão de forma. Citado por (vivos): nenhum.
- [B] medida estrutural verde não encerra decisão de forma; a representação recebe seções de caráter autorais, não interpolação genérica. Porquê: o aceite visual podia ser contornado por prova estrutural. Lugar: CLAUDE.md ('nenhuma métrica aprova forma sozinha') e .claude/skills/laco-de-modelagem

## RELATORIO-CHASSI-P2-PROVA-DO-QUARTO.md
Do que trata: prova privada da cage do quarto dianteiro, reprovada pela pessoa no aceite apesar de gates verdes. Citado por (vivos): nenhum.
- [B] rodar as condições de rejeição visual ANTES de fechar, despachar o crítico e abrir o alvo; autocrítica preventiva não substitui o aceite; vinco aplicado onde a superfície é lisa não faz nada. Porquê: gate verde e reprovação apareceram na mesma página. Lugar: .claude/skills/laco-de-modelagem/SKILL.md e REFERENCIA-E-CRITICA-VISUAL.md; a causa (seção interpolada, número de seções sem intenção) é V-01 e V-03 em docs/modelar/historico/REGISTRO-FALHAS-AUTORIA-V.md (A, abaixo; ele precisa ir para decisoes/ antes de a pasta sair)

## RELATORIO-DIAGNOSTICO-MOTOR.md
Do que trata: relatório do diagnóstico do motor: 'motor adequado, abrir Montagem Mínima Persistida v1'. Citado por (vivos): nenhum.
- [C] decisão cumprida (montagem v1 a v4 existem). Porquê: a fronteira motor/montagem está em ARQUITETURA.md e MONTAGEM-PERSISTIDA-V*.md.

## RELATORIO-ENSAIO-DOBRADICA-1-0.md
Do que trata: ensaio ponta a ponta da dobradiça 1.0 (três receitas, montagem v4, composições pelas portas oficiais, descoberta progressiva). Citado por (vivos): nenhum.
- [C] sonda aprovada e suas correções generalizadas já estão no código. Porquê: composições pelas portas oficiais e uso-operacao@1 existem; as medidas de bytes eram de então.

## RELATORIO-ESTUDO-CAMPO-CONJUNTO-DIANTEIRO.md
Do que trata: estudo de campo de 2026-08-14 do conjunto dianteiro (seis peças, relação direcional disco-pinça). Citado por (vivos): docs/modelar/INVENTARIO.md.
- [C] gargalo (contexto de conjunto) tratado pelo mapa canônico e pela revalidação. Porquê: evidência de etapa entregue.

## RELATORIO-EXPERIMENTO-AUTORIA-GEOMETRICA.md
Do que trata: relatório de 2026-08-14 do experimento de autoria do zero: aprovado após o recorte da receita declarativa. Citado por (vivos): docs/modelar/INVENTARIO.md.
- [B] a porta de autoria de montagem não aplica mudança de PARAMS/PASSOS; autoria de receita exige proposta de bytes, execução isolada, confirmação e revalidação, sem atalho no MCP de montagem. Porquê: publicar montagem já corrigida seria prova falsa de autoria. Lugar: docs/modelar/usar/AUTORIA-RECEITA-DECLARATIVA.md e tools/mcp/perfis/

## RELATORIO-EXPORTACAO-CAD-STEP-R00.md
Do que trata: prova R00 da exportação STEP: occt-wasm 4.3.2 aprovado, opencascade.js recusado. Citado por (vivos): docs/modelar/INDEX.md.
- [B] occt-wasm@4.3.2 é o backend do STEP facetado; não atualizar nem trocar sem prova equivalente; o STEP facetado não vira cilindro analítico. Porquê: opencascade.js falhou no Node 24 e a licença LGPL fica registrada. Lugar: docs/modelar/DOSSIE-EXPORTACAO-CAD-STEP.md e modulos/exportador-cad/

## RELATORIO-MODELADOR-INVERSO-P0.md
Do que trata: relatório P0 do modelador inverso (linha de base, alvo, calibração do crítico), bloqueado por execução independente. Citado por (vivos): docs/modelar/planos/congelados/2026-08-25-modelador-inverso-priors-familia-p0.md.
- [C] plano congelado; P0-C bloqueado. Porquê: o plano congelado e o DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md carregam a decisão; atenção: o plano congelado cita este arquivo.

## RELATORIO-MOTOR-DE-PRANCHA-R0.md
Do que trata: R0 do motor de prancha: matriz de dez defeitos injetados e o que o contrato local passou a recusar. Citado por (vivos): nenhum.
- [B] contorno com auto-interseção alertado, supressão fora do contorno exige razão, calibração acima de 3% recusada, comparação de silhueta exige 98% de cobertura. Porquê: uma linha curta coincidente com o meio da referência recebia desvio zero. Lugar: tools/modelar/prancha.test.mjs e prancha-referencia.test.mjs (corpus adversarial) e tools/modelar/prancha/

## RELATORIO-MOTOR-DE-PRANCHA-R1.md
Do que trata: R1 do motor de prancha: OpenCV adiado, Potrace e Inkscape rejeitados do caminho crítico, SVG Path usado. Citado por (vivos): nenhum.
- [A] Potrace e Inkscape Trace Bitmap não entram no caminho crítico (Potrace é GPL, incompatível com trazer a implementação para o núcleo MIT, e a saída não traz intenção nem landmarks); OpenCV só com corpus que o leitor local não diagnostique. Porquê: OpenCV acabou entrando em modulos/contorno-da-imagem, mas a recusa por licença não está escrita em lugar vivo. Procurei: GPL, Potrace, Inkscape em docs/modelar/*.md, usar/, modulos/pesquisa, tools/ (só PESQUISA-ABERTA-2026-10.md cita VectorCraft/planegcs, sem a recusa do Potrace por licença; regioes.js dá outra razão); Rascunho do registro: Potrace (GPL) e Inkscape Trace Bitmap ficam fora do caminho crítico do núcleo MIT e da prancha, porque a licença não permite trazer a implementação e a saída não carrega landmarks, intenção, confiança nem quatro vistas. Medida de 2026-08-20: contra o leitor local, o OpenCV não calcula escala nem resíduo e devolveu 7 contornos, sem critério de silhueta. Juntar ao registro do LEVANTAMENTO-DESENHO-SEM-REFERENCIA.

## RELATORIO-MOTOR-DE-PRANCHA-R2.md
Do que trata: R2 do motor de prancha: contrato de autoria mecanifica.prancha-autoria@1. Citado por (vivos): nenhum.
- [B] prancha só vale como orientação de modelagem com intenção, procedência, confiança e incertezas declaradas; prancha bloqueada continua inspecionável com alerta; as relações de vistas não se duplicam no bloco de autoria. Porquê: duas verdades para o mesmo ponto. Lugar: docs/modelar/usar/CONTRATO-AUTORIA-PRANCHA.md

## RELATORIO-MOTOR-DE-PRANCHA-R3.md
Do que trata: R3 do motor de prancha: matriz executável do corpus e decisão de não incorporar mecanismo externo. Citado por (vivos): nenhum.
- [C] corpus cobre os defeitos e a decisão foi cumprida. Porquê: a matriz está nos testes de prancha.

## RELATORIO-MOTOR-DE-PRANCHA-R4.md
Do que trata: R4 parcial: autoria fria da furgoneta técnica e revisão por mutação, sem comparação 3D. Citado por (vivos): nenhum.
- [C] etapa parcial de plano encerrado. Porquê: a furgoneta não tem malha comparável e a prova nunca foi fechada.

## RELATORIO-N1-FLUXO-AUTORIA.md
Do que trata: encerramento da N1: contratos e orquestração da autoria 3D, sem geometria pública alterada. Citado por (vivos): nenhum.
- [C] fundação concluída. Porquê: contrato vivo em src/autoria; a tabela de reaproveitamento era de então.

## RELATORIO-N2-FORMA-GLOBAL.md
Do que trata: encerramento técnico da N2 (alvo, andaime, blocagem, G01 aprovado, G02 bloqueado). Citado por (vivos): nenhum.
- [C] etapa reprovada em G02 com evidência em evidencias-n2-forma-global/. Porquê: CONTRATO-FORMA-GLOBAL-N2.md é o contrato vivo; as seis imagens e jsons ficam no git.

## RELATORIO-N3-CANAL-PERCEPCAO.md
Do que trata: canal de percepção N3 (zebra, isófota, curvatura) revalidado para C1, e sonda de suavização N3.5 rejeitada. Citado por (vivos): nenhum.
- [B] toda imagem obrigatória se abre separadamente em tamanho nativo; painel e métrica indexam, nunca aprovam; suavização Laplaciana pós-modelagem não repara a pele (P95 22,0 para 21,3 graus, parcela abrupta piorou). Porquê: o mosaico e a cor plana por triângulo faziam costura parecer defeito. Lugar: docs/modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md e V-09 em docs/modelar/historico/REGISTRO-FALHAS-AUTORIA-V.md (A, abaixo; ele precisa ir para decisoes/ antes de a pasta sair)

## RELATORIO-N4-RESTRICOES.md
Do que trata: sonda N4 de autoria por restrição: duas seções satisfazem três restrições, após corrigir crista C0. Citado por (vivos): nenhum.
- [B] P95 de curvatura aprovava crista pontuda local; o gate passou a exigir também diedro máximo de 19 graus, e o aceite revogado pela imagem individual. Porquê: métrica que mede densidade não detecta defeito local. Lugar: V-08 em docs/modelar/historico/REGISTRO-FALHAS-AUTORIA-V.md (A, abaixo; ele precisa ir para decisoes/ antes de a pasta sair); régua de curvatura em tools/blender/regua*.py

## RELATORIO-N5-BUSCA.md
Do que trata: sonda N5: busca residual de uma liberdade (bojoRelativo) com objetivo sintético e elegibilidade geométrica. Citado por (vivos): nenhum.
- [C] prova de mecanismo em alvo sintético. Porquê: o próprio relatório diz que não prova carroceria nem proporção.

## RELATORIO-N6-CANARIO-CASCO-VISUAL.md
Do que trata: canário N6: casco por interseção de silhuetas binárias, reprovado e encerrado. Citado por (vivos): docs/modelar/LEITURA-POR-TAREFA.md.
- [B] silhueta binária informa ocupação, não topologia automotiva; não ajustar nem promover essa malha; o sucessor exige marcos regionais e patches contínuos. Porquê: IoU alto convive com a forma reprovada. Lugar: V-22 e V-31 em docs/modelar/historico/REGISTRO-FALHAS-AUTORIA-V.md (A, abaixo; ele precisa ir para decisoes/ antes de a pasta sair)

## RELATORIO-PLATAFORMA-PROCEDURAL-R10.md
Do que trata: encerramento R10 do plano de plataforma procedural extensível (32 operações, estudo de campo com três famílias). Citado por (vivos): nenhum.
- [C] plano entregue. Porquê: registroOperacoes e composições estão no código.

## RELATORIO-PONTE-THREE.md
Do que trata: prova da ponte Three.js (23 partes expostas, 317 testes, build aprovado). Citado por (vivos): docs/modelar/INVENTARIO.md.
- [C] ponte provada em 2026-08. Porquê: face.parte é a semântica que a ponte consome, hoje em src/autoria/adaptar-three.js.

## RELATORIO-R05-REVALIDACAO-CAMPO.md
Do que trata: estudo de campo R05 da revalidação persistida (duas raízes e um ramo isolado) e a operação obsoletarCampanhaRevalidacao. Citado por (vivos): nenhum.
- [B] a promoção nunca ocorre na derivação, na troca de causa nem na consulta; aprovação é fato registrado pelo validador, e obsoletar campanha preserva o histórico. Porquê: evita promoção implícita. Lugar: tools/modelar/repositorio-revalidacao.mjs e tools/mcp/perfis/revalidacao.mjs

## RELATORIO-R2-CAGE-DIRETA-R3.md
Do que trata: R2 da cage direta: forma global reprovada (20,5/31,5/32,7 mm contra 14/16/16) e redesenho para R2B. Citado por (vivos): nenhum.
- [C] prova privada reprovada. Porquê: a causa (grade sem controle vertical independente) é a assinatura de V-01 no registro e a cage direta foi superada.

## RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md
Do que trata: sonda da armadura humanoide 1.0 (13 definições, 22 folhas, pose articulada como estado) e o próximo teto. Citado por (vivos): nenhum.
- [C] sonda aprovada; limites (subtrativa robusta, envelope de movimento, LOD) eram do dia. Porquê: não autoriza implementação; candidatos vivem no BACKLOG.

## RELATORIO-SONDA-SUPERCARRO-1-0.md
Do que trata: sonda do supercarro 1.0 (12 definições, 27 folhas, contexto progressivo) e limites revelados. Citado por (vivos): nenhum.
- [C] sonda aprovada. Porquê: a carroceria por volumes inflados foi rejeitada na própria inspeção; o que ficou como lição está em V-02 e nos guias de operação.

## REORGANIZACAO-POR-USO-PROGRESSO.md
Do que trata: rastreio das fases F0 a F6 da reorganização por uso (usar/, gates G1 a G7) e a recusa da pasta desenvolver/ com custo medido. Citado por (vivos): nenhum.
- [C] a raiz como área de desenvolvimento e a recusa da pasta eram decisão de 2026-08, agora refeita pelo plano de organização. Porquê: a lição 'evidência congelada não deve guardar caminho mutável' está resolvida pela remoção de historico/ e é tema do plano ativo.

## REVISAO-DE-RUMO-2026-10.md
Do que trata: revisão de rumo de 2026-10-06 com conferência da Planejadora: condição de reabertura do B-Rep cumprida, experimento do cilindroHidraulico. Citado por (vivos): tools/mapa/links.mjs.
- [C] decisão tomada e experimento encerrado. Porquê: a exportação STEP e o ANALISES-DE-2026-10.md carregam o que ficou; o link em tools/mapa/links.mjs (allowlist) precisa sair.

## VEICULOS-PRIMEIRA-LEVA-2026-10.md
Do que trata: diagnóstico da primeira leva de veículos de referência livre e o experimento da perua pelas três vistas. Citado por (vivos): docs/modelar/modelar-veiculos.md.
- [B] carroceria de largura constante perde a seção; a roda escondida e o perfil errado não são vistos pelo comparador de envelope; a folha comparativa na mesma escala é prova do roteiro `modelar/peca`; arco no perfil 2D e caixa de roda em vez de subtrair cilindros. Porquê: a perua reprovada tinha números melhores que o compacto aprovado. Lugar: docs/modelar/modelar-veiculos.md, .claude/skills/criar-peca/references/operacoes-procedurais.md e tools/modelar/folha-comparativa.mjs

## esboco-2d.md
Do que trata: o esboço 2D antigo (modulos/esboco/, 117 arquivos), que saiu em 2026-11-05, o que ensinou e como recriar. Citado por (vivos): src/autoria/refinamento-global.js, modulos/esboco-nucleo/README.md, README.md, tools/mapa/links.mjs, docs/modelar/banco-de-provas/aviao-2026-10-11/CLASSIFICACAO.md, docs/modelar/banco-de-provas/esboco-pelo-nucleo-2026-11-05/gravar-o-que-o-modulo-resolvia.mjs, docs/modelar/CONTRATO-FORMA-GLOBAL-N2.md.
- [A] o esboço antigo só se recria se voltar a haver objeto sem forma de referência e sem peça da qual variar, e mesmo então as opções se escrevem pelo núcleo; o código está no commit f9bfad3a (com a migração e os scripts de gravação) e a fatia 3 do plano em 77f2fe1b. Porquê: a lição de fundo (a opção de forma sai das mesmas operações da peça) está em modulos/esboco-nucleo/README.md, mas o commit, a condição de recriar e a lista do que saiu sem substituto só moram aqui e no plano encerrado. Procurei: f9bfad3a, 77f2fe1b e 'sem substituto' em modulos/esboco-nucleo/README.md, README.md da raiz, docs/modelar/*.md e usar/ (só o plano encerrado do esboço pelo núcleo repete o hash); Rascunho do registro: Decisão de 2026-11-05: o esboço 2D (modulos/esboco) saiu; no lugar, esboço 2.0 em modulos/esboco-nucleo e variantes de receita. Última árvore com o módulo: commit f9bfad3a (`git checkout f9bfad3a -- modulos/esboco`); linha de comando em tools/modelar/esboco.mjs naquele commit. Saíram sem substituto: redesenho do conjunto de calibração do crítico, Envelope do Condutor, receita planejada, expansão de componentes para parâmetros novos e conferência contra .esboco.json qualquer. O desenho promete formas que a peça pode não dar (farol do furgão, 2026-11-05).

## Resumo

Arquivos .md classificados: 64 de 64. Lidos inteiros: os 30 menores (até cerca de 6 KB) e BICICLETA-REALISTA-ATRITOS, VEICULOS-PRIMEIRA-LEVA, esboco-2d, EXPERIMENTO-CARRO-SEM-APOIO, EXPERIMENTO-RODA-REALISTA e BASELINE. Lidos por cabeça, índice de seções e final (sem o miolo): ANALISE-CHASSI, CABO-DE-PA, CADEIRA, CHASSI-P0, CHASSI-P1, CHASSI-P2, CONTEXTO-FERRAMENTAS, DOSSIE-LABORATORIO-IA, LABORATORIO-IA-PROGRESSO, LEVANTAMENTO-DESENHO, MALHA-OTIMIZADA, OFICINA-OTIMIZACOES, PROTOCOLO e RELATORIO-DIAGNOSTICO-MOTOR, REGISTRO-FALHAS (tabela V-01 a V-38 só nas linhas de estado e nas de recusa), REORGANIZACAO-POR-USO, REVISAO-DE-RUMO, RELATO-RODA, DOSSIE-MOTOR-SUPERFICIES, DOSSIE-PLATAFORMA, DOSSIE-FLUXO-IA, DOSSIE-MODELADOR-POR-SELECAO, FLUXO-N1, MATRIZ, e os relatórios N1, N2, N3, ENSAIO-DOBRADICA, SONDA-SUPERCARRO, SONDA-ARMADURA, ESTUDO-CAMPO, ANALISE-GRANDES-MELHORIAS, MODELADOR-INVERSO-P0, AUDITORIA-PRATICAS, EXPERIMENTO-AB, PLANO-ESTADO-DA-ARTE, MOTOR-DE-PRANCHA-R1 e R0. Uma lição só do miolo desses pode ter escapado. Classificação: 6 A, 23 B, 35 C.

A (decisão ou lição sem lugar vivo):
- GRAFO-DE-CAPACIDADES-COMO-RECRIAR.md
- IMPORTADORES-COMO-RECRIAR.md
- LEVANTAMENTO-DESENHO-SEM-REFERENCIA.md
- REGISTRO-FALHAS-AUTORIA-V.md
- RELATORIO-MOTOR-DE-PRANCHA-R1.md
- esboco-2d.md

Observação sobre B: 7 dos B (ANALISE-CHASSI, N3, N4, N6, CHASSI-P2, DOSSIE-MODELADOR-POR-SELECAO, em parte VEICULOS) apoiam-se no REGISTRO-FALHAS-AUTORIA-V.md, que é A; se ele sair sem virar registro em decisoes/, esses B viram A.

Arquivos com citante vivo (24; tmp/gates/verdes.json foi desconsiderado por ser saída gerada):
- ALVO-N6-CUPE-ESPORTIVO.md: docs/modelar/planos/congelados/2026-08-25-modelador-inverso-priors-familia-p0.md
- BICICLETA-REALISTA-ATRITOS.md: docs/modelar/ATRITOS-AUTORIA.md
- CHEGADA-2026-09-11.md: docs/modelar/roteiros/roteiros.json, docs/modelar/roteiros/ROTEIROS.md
- CONJUNTO-PROVA-AUTORIA-GEOMETRICA.md: docs/modelar/INVENTARIO.md
- CONTEXTO-FERRAMENTAS-DE-MODELAGEM.md: modulos/pesquisa/bibliotecas/BIBLIOTECAS.md, modulos/pesquisa/README.md, docs/modelar/CONTRATO-DA-FAMILIA.md
- DOSSIE-MODELADOR-POR-SELECAO.md: docs/modelar/LEITURA-POR-TAREFA.md
- EXPERIMENTO-AB-FLUXO-IA.md: docs/modelar/INVENTARIO.md
- EXPERIMENTO-RODA-REALISTA.md: docs/modelar/PERFIS-DE-AUTORIA.md, docs/modelar/INVENTARIO.md
- LEVANTAMENTO-DESENHO-SEM-REFERENCIA.md: docs/modelar/PESQUISA-ABERTA-2026-10.md, docs/modelar/planos/BACKLOG.md
- OFICINA-OTIMIZACOES.md: procedural/nucleo/operacoes/atributos.js, procedural/nucleo/nucleo.js, tools/oficina/oficina.test.ts, docs/modelar/INVENTARIO.md
- PLANO.md: docs/modelar/INVENTARIO.md, docs/oficina.md
- PROTOCOLO-DIAGNOSTICO-MOTOR.md: docs/modelar/INVENTARIO.md
- README.md: docs/nos-herdado/README.md, docs/modelar/roteiros/roteiros.json, docs/modelar/roteiros/ROTEIROS.md, docs/modelar/INDEX.md, docs/modelar/INVENTARIO.md, (e, por caminho de pasta, tools/mapa/estrutura-docs.mjs e tools/mapa/links.mjs)
- REGISTRO-FALHAS-AUTORIA-V.md: tools/mapa/estrutura-docs.mjs, docs/modelar/usar/GOTCHAS-AUTORIA-VISUAL.md
- RELATO-RODA-REALISTA.md: procedural/nucleo/operacoes/transformacoes.js, docs/modelar/PERFIS-DE-AUTORIA.md, docs/modelar/INVENTARIO.md
- RELATORIO-ESTUDO-CAMPO-CONJUNTO-DIANTEIRO.md: docs/modelar/INVENTARIO.md
- RELATORIO-EXPERIMENTO-AUTORIA-GEOMETRICA.md: docs/modelar/INVENTARIO.md
- RELATORIO-EXPORTACAO-CAD-STEP-R00.md: docs/modelar/INDEX.md
- RELATORIO-MODELADOR-INVERSO-P0.md: docs/modelar/planos/congelados/2026-08-25-modelador-inverso-priors-familia-p0.md
- RELATORIO-N6-CANARIO-CASCO-VISUAL.md: docs/modelar/LEITURA-POR-TAREFA.md
- RELATORIO-PONTE-THREE.md: docs/modelar/INVENTARIO.md
- REVISAO-DE-RUMO-2026-10.md: tools/mapa/links.mjs
- VEICULOS-PRIMEIRA-LEVA-2026-10.md: docs/modelar/modelar-veiculos.md
- esboco-2d.md: src/autoria/refinamento-global.js, modulos/esboco-nucleo/README.md, README.md, tools/mapa/links.mjs, docs/modelar/banco-de-provas/aviao-2026-10-11/CLASSIFICACAO.md, docs/modelar/banco-de-provas/esboco-pelo-nucleo-2026-11-05/gravar-o-que-o-modulo-resolvia.mjs, docs/modelar/CONTRATO-FORMA-GLOBAL-N2.md

Referências ao diretório inteiro, fora de qualquer arquivo: tools/mapa/estrutura-docs.mjs (allowlist com REGISTRO-FALHAS), tools/mapa/links.mjs (allowlist com ciclo6/criticas.json, esboco-2d, REVISAO-DE-RUMO) e docs/modelar/roteiros/roteiros.json (id `historico`). Citam também por caminho, em comentário de código: procedural/nucleo/operacoes/atributos.js, procedural/nucleo/nucleo.js, procedural/nucleo/operacoes/transformacoes.js, tools/oficina/oficina.test.ts, src/autoria/refinamento-global.js.

Arquivos que não são .md (24, nenhum lido além de listar): pasta ciclo6/ com 14 .json (668.145 bytes: criticas, cruzamento, mapa, 8 propostas A-30/A-34/A-36/A-37 e 3 vereditos) e pasta evidencias-n2-forma-global/ com 10 .json (171.382 bytes: alvo, andaime, blocagem de 139.621 bytes, avaliações G00/G01, decisão G02 pendente, manifesto, pacotes do crítico, prova anterior reprovada). Citantes vivos: tools/mapa/links.mjs (ciclo6/criticas.json) e o gerador tools/modelar/gerar-evidencias-forma-global-n2.mjs; ambos são evidência de etapa reprovada.
