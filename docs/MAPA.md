# MAPA — inventário do Modelar, arquivo por arquivo

> **GERADO** por `npm run mapa` — não edite à mão. O resumo de cada arquivo
> mora no próprio arquivo (primeiro comentário; H1 nos `.md`); isto é a
> projeção. `npm run mapa:check` (CI) falha se isto estiver velho ou se
> algum arquivo-fonte estiver sem cabeçalho.

1483 arquivos (código `.js .mjs .cjs .ts .tsx .html` + docs `.md`).

## (raiz)

- `AGENTS.md` — Modelar — instruções para agentes
- `CLAUDE.md` — Modelar — contrato mínimo
- `README.md` — Modelar
- `THIRD-PARTY-NOTICES.md` — Avisos de terceiros
- `bancada.html` — bancada.html — estúdio de inspeção multivista para autoria e validação de montagens.
- `comunicacao.md` — Comunicação entre IAs
- `vite.config.js` — vite.config.js — build estático da BANCADA de autoria, publicada em warbookbr/nos-modelar no GitHub Pages. O produto que o cliente abre vive em warbookbr/mec…
- `vitest.config.ts` — Config do Vitest: cobre os contratos do Modelar e os núcleos herdados em tools/**.

## .claude/agents/

- `critico-visual.md` — Crítico visual sem contexto: compara as vistas do MODELO com o DESENHO ALVO ou julga uma unidade de esboço pelas cinco perguntas do brief. Use antes de fecha…
- `desenhador-de-contorno.md` — Põe as sementes que mapeiam as partes da imagem de referência e gera o pacote do crítico com `npm run contorno`. Depois corrige só as sementes que o crítico …
- `desenhista-de-prancha.md` — Decide cotas, calibração e o que a imagem esconde no `<imagem>.prancha.json` e gera com `npm run contorno:prancha`. Depois corrige só o que o crítico apontou…
- `esbocista.md` — Esboça um objeto ou unidade pela skill esboco-detalhado, parando a cada --feito até a nota do crítico. Opcional: só sem forma de referência e por escolha da …
- `implementador.md` — Implementa mudanças delimitadas no Modelar, especialmente no núcleo procedural, receitas, bancada e validação, sempre provadas por medição. Use para um brief…
- `modelador.md` — Escreve e corrige a receita procedural de UMA peça a partir do plano e, depois, do veredito de defeitos. Não julga o próprio resultado nem decide quando para…
- `revisor-adversarial.md` — Revisor adversarial do Modelar: tenta quebrar mudanças de núcleo, formato salvo, autoria, montagem ou julgamento antes da integração. Use quando a mudança te…

## .claude/skills/absorver-ajuste-da-bancada/

- `SKILL.md` — Transforma ajuste da bancada em receita: reescreve TABELA e mede se a receita chega onde a peça ficou. Use ao receber `ajuste-*.json` ou quando a pessoa salv…

## .claude/skills/alinhar-modelagem/

- `SKILL.md` — Conduz o alinhamento antes de modelar: levanta com a pessoa objeto, referências, escala, partes, contatos e critérios de reprovação, e fecha no PLANO da rece…

## .claude/skills/auditar-montagem/

- `SKILL.md` — Auditar uma montagem persistida do Modelar por contexto semântico, relações, impacto de revalidação e vistas visuais. Use quando a tarefa envolver composição…

## .claude/skills/auditar-peca/

- `SKILL.md` — Verificar uma peça do Modelar pelo fluxo atual de descrição, bancada neutra, revisão do pacote e gates do repositório.

## .claude/skills/contorno-da-imagem/

- `SKILL.md` — Mapeia as partes de uma referência por watershed com sementes nomeadas e tira o contorno de cada uma em milímetro, com desenhador e crítico. Use quando a ref…

## .claude/skills/criar-peca/

- `SKILL.md` — Criar ou refinar uma peça 3D procedural do Modelar como IA, escrevendo PASSOS e provando o resultado na bancada neutra com medidas, vistas e crítica objetiva.

## .claude/skills/criar-peca/references/

- `operacoes-procedurais.md` — Referência de operações procedurais
- `por-que.md` — Por que cada regra da skill `criar-peca` existe

## .claude/skills/desenhar-prancha/

- `SKILL.md` — Desenha a prancha ortográfica alvo (silhueta, aberturas, painéis e cotas nas vistas lateral, frontal, traseira e superior). Use para produzir ou corrigir o d…

## .claude/skills/esbocar-opcoes/

- `SKILL.md` — Mostra à pessoa, em imagem, as opções de forma em disputa, lado a lado na mesma escala e com a referência, e pergunta qual se parece mais. Use no alinhamento…

## .claude/skills/esboco-detalhado/

- `SKILL.md` — Esboça um objeto em primitivas e componentes, com contrato, gate de contato e crítico cego, por `npm run esboco -- --condutor`. Opcional: só sem forma de ref…
- `escrever-menos-json.md` — Escrever menos JSON
- `faixas-rodas-discos.md` — Faixas, rodas e discos
- `formas-e-componentes.md` — Formas novas e componentes
- `leitura-em-texto.md` — Ler em texto antes da imagem
- `nivel-detalhado.md` — Nível detalhado
- `regras-de-contato.md` — Regras de contato
- `resumo-do-formato.md` — Resumo do formato
- `sobreposicao-na-projecao.md` — Sobreposição na projeção
- `variantes-simetria-repeticao.md` — Variantes, simetria e repetição

## .claude/skills/laco-de-modelagem/

- `SKILL.md` — Conduzir o laço de modelagem de uma peça: despachar o modelador com o plano, medir, despachar o crítico sem a história da construção e registrar cada rodada …

## .claude/skills/laco-do-esboco/

- `SKILL.md` — Conduz o laço do esboço detalhado: esbocista por unidade, crítico cego a cada parada, medição no fim. Opcional: só sem forma de referência e por escolha da p…

## .claude/skills/prancha-dos-contornos/

- `SKILL.md` — Faz a prancha de uma vista (lateral, topo ou frontal) pelos contornos do mapa de partes, com desenhista de cotas e crítico. Use depois do mapa, antes da mode…

## docs/

- `RECURSOS.md` — Recursos e portas de entrada
- `oficina.md` — A Oficina — índice do design

## docs/mecanifica/

- `AGENT-FIRST.md` — Filtro Agent-First
- `ANALISES-DE-2026-10.md` — Análises de 2026-10
- `ARQUITETURA-SESSAO-E-SEGURANCA.md` — Arquitetura de Sessão Ativa, Hospedagem Estática e Segurança Corporativa
- `ARQUITETURA.md` — Arquitetura atual
- `ATRITOS-AUTORIA.md` — Atritos de autoria — resumo atual
- `AUTORIA-IA.md` — Autoria assistida por IA
- `BANCADA-E-APRESENTACAO.md` — Bancada e apresentação
- `COMPOSICAO-PROCEDURAL-V1.md` — Composição procedural v1
- `CONTEXTO-MONTAGEM-IA.md` — Contexto de montagem para IA
- `CONTEXTO-VISUAL-REVALIDACAO.md` — Contexto visual, revalidação e catálogo de montagem
- `CONTINUIDADE-ARQUITETURAL.md` — Continuidade arquitetural do Modelar
- `CONTRATO-ACEITE-VISUAL.md` — Contrato de aceite visual
- `CONTRATO-DA-FAMILIA.md` — Contrato da família
- `CONTRATO-FORMA-GLOBAL-N2.md` — Contrato de forma global N2
- `COORDENACAO-REPOS.md` — Coordenação entre os repositórios Modelar
- `DOSSIE-EXPORTACAO-CAD-STEP.md` — Dossiê técnico — exportação CAD/STEP
- `DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md` — Dossiê — modelador inverso com priors por família
- `ESCRITA-TRANSACIONAL-MONTAGEM.md` — Escrita transacional de montagem
- `EXTENSOES-NATIVAS-V1.md` — Extensões nativas v1
- `FAMILIAS-DE-OBJETOS.md` — Famílias de objetos que o Modelar deve cobrir
- `FERRAMENTAS-POR-OBJETO.md` — Ferramentas por objeto
- `FILETE-V2.md` — Filete v2 — Escopos A e B implementados
- `FLUXO-MODELAGEM-IA.md` — Fluxo de modelagem assistida por IA v4
- `HOMOLOGACAO-FLUXO-IA.md` — Homologação do fluxo de IA
- `INDEX.md` — Modelar — entrada atual
- `INVENTARIO.md` — Inventário e fontes de verdade
- `LACUNAS-DE-CAPACIDADE-V1.md` — Lacunas de capacidade v1
- `LEITURA-POR-TAREFA.md` — Leitura por tarefa
- `MAPA-CANONICO-DEPENDENCIAS.md` — Mapa canônico de dependências
- `MATRIZ-TESTES-ACOPLADOS.md` — Matriz de testes acoplados ao acervo
- `MONTAGEM-PERSISTIDA-V1.md` — Montagem persistida v1
- `MONTAGEM-PERSISTIDA-V2.md` — Montagem persistida v2
- `MONTAGEM-PERSISTIDA-V3.md` — Montagem persistida v3 e impacto local
- `MONTAGEM-PERSISTIDA-V4.md` — Montagem persistida v4 e expectativas de interseção
- `PERFIS-DE-AUTORIA.md` — Perfis de autoria
- `PESQUISA-ABERTA-2026-10.md` — Pesquisa aberta de 2026-10
- `SERVICOS-PROCEDURAL-V1.md` — Serviços procedurais v1
- `UPSTREAM-NOS.md` — Capacidades candidatas ao NÓS
- `VISAO.md` — Visão do Modelar
- `modelar-carroceria.md` — Modelar carroceria de chapa contínua
- `modelar-veiculos.md` — Modelar veículos a partir de uma fonte de referência

## docs/mecanifica/banco-de-provas/

- `BANCO-DE-PROVAS.md` — Banco de provas e registro de custo
- `MEDICAO-DE-TOKENS-2026-10.md` — Onde vão os tokens do esbocista (2026-10-07)

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/

- `ALINHAMENTO.md` — Avião de pequeno porte: alinhamento
- `ATRITOS.md` — Avião de pequeno porte: atritos
- `CLASSIFICACAO.md` — Avião de pequeno porte: classificação dos atritos

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/

- `ATRITOS.md` — Atritos do esboço do avião

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/

- `ATRITOS.md` — Avião de pequeno porte, segunda rodada: atritos da maquete e do plano de detalhe

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao-critico-asas/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao-critico-empenagem-horizontal/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao-critico-empenagem-vertical/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao-critico-fuselagem/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao-critico-marco-100/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao-critico-marco-50/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao-critico-marco-75/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao-critico-trem-do-nariz/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao-critico-trens-principais/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-critico-asas/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-critico-empenagem-horizontal/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-critico-fuselagem/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-critico-helice/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-critico-marco-100/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-critico-marco-25/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-critico-marco-50/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-critico-marco-75/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-critico-motor/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-critico-trem-do-nariz/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-critico-trens-principais/

- `brief.md` — --- brief para o crítico cego ---

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/frontal.pacote/

- `roteiro.md` — Roteiro da análise

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.pacote/

- `roteiro.md` — Roteiro da análise

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.prancha.pacote/

- `roteiro.md` — Roteiro da crítica da prancha

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/topo.pacote/

- `roteiro.md` — Roteiro da análise

## docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/topo.prancha.pacote/

- `roteiro.md` — Roteiro da crítica da prancha

## docs/mecanifica/banco-de-provas/aviao-receita-2026-10-15/

- `TRADUCAO.md` — O esboço do avião traduzido para o andaime

## docs/mecanifica/banco-de-provas/cadeiras-2026-10-19/

- `medidas.md` — Cadeira: regras construtivas e medida de proporção contra o alvo

## docs/mecanifica/banco-de-provas/carrinho-refeito-2026-10-08/

- `ATRITOS.md` — Atritos

## docs/mecanifica/banco-de-provas/desenho-braco-2026-10-14/

- `DESCRICAO.md` — Braço robótico, vista lateral: a descrição
- `RESULTADO.md` — Braço robótico, vista lateral: o resultado da prova
- `coordenadas.mjs` — coordenadas.mjs — o caminho da IA que desenha por coordenadas, sem resolvedor: lê <vista>.partes.json, com cada parte como um polígono em milímetro escrito à…

## docs/mecanifica/banco-de-provas/desenho-braco-2026-10-14/coordenadas/

- `gera.mjs` — gera.mjs — o gerador que a IA do desenho por coordenadas escreveu para os polígonos do braço (cantos arredondados e círculos em mm), guardado com o resultado…

## docs/mecanifica/banco-de-provas/desenho-carcaca-2026-10-14/

- `DESCRICAO.md` — Carcaça da empilhadeira, vista lateral: a descrição
- `RESULTADO.md` — Carcaça da empilhadeira, vista lateral: o resultado da prova

## docs/mecanifica/banco-de-provas/desenho-carcaca-2026-10-14/coordenadas/

- `gera.mjs` — gera.mjs — gera lateral.partes.json da carcaça da empilhadeira (vista lateral, frente à esquerda, base em v = 0) por coordenadas escritas à mão a partir só d…

## docs/mecanifica/banco-de-provas/desenho-carcaca-2026-10-14/coordenadas-r2/

- `gera.mjs` — gera.mjs — gera lateral.partes.json da carcaça da empilhadeira (vista lateral, frente à esquerda, base em v = 0) por coordenadas escritas à mão a partir só d…

## docs/mecanifica/banco-de-provas/empilhadeira-2026-10-09/

- `ALINHAMENTO.md` — Carcaça da empilhadeira: alinhamento

## docs/mecanifica/banco-de-provas/empilhadeira-2026-10-09/referencias/carcaca_lateral.pacote/

- `roteiro.md` — Roteiro da análise

## docs/mecanifica/banco-de-provas/empilhadeira-2026-10-14/referencias/empilhadeira_lateral.pacote/

- `roteiro.md` — Roteiro da análise

## docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/braco/

- `NOTAS.md` — Braço robótico, vista lateral: o desenho por restrições ajustado à referência

## docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/carcaca/

- `NOTAS.md` — Carcaça da empilhadeira, vista lateral: o desenho por restrições ajustado à referência

## docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/prova/

- `DESCRICAO.md` — Carcaça da empilhadeira nova, vista lateral: a descrição
- `RESULTADO.md` — Carcaça da empilhadeira nova pela família de desenho: o resultado da prova

## docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/prova/familia/

- `NOTAS.md` — A carcaça da descrição pela família de desenho

## docs/mecanifica/banco-de-provas/importar-objeto-2026-10-15/

- `FONTE.md` — Fonte do objeto-prova da importação de código

## docs/mecanifica/banco-de-provas/importar-objeto-2026-10-15/sondas-2026-10-16/

- `SONDAS.md` — Sondas de importação de 2026-10-16

## docs/mecanifica/banco-de-provas/importar-objeto-2026-10-15/sondas-2026-10-16/blendnet/

- `RESULTADO.md` — BlendNet para esboço: sonda de tradução barata e determinística

## docs/mecanifica/banco-de-provas/leitura-por-demanda-2026-10/

- `RESULTADO.md` — Resultado da medida de leitura
- `ROTEIRO.md` — Medida de leitura da leitura por demanda
- `tarefa-corrigir.md` — Tarefa de corrigir
- `tarefa-modelar.md` — Tarefa de modelar

## docs/mecanifica/banco-de-provas/receitas-externas-2026-10-19/

- `README.md` — Receitas do projeto externo da pessoa no esboço do Mecanifica (2026-10-19)
- `levantamento-do-repo-externo.md` — O que o repositório do projeto externo da pessoa tem de objetos extraídos
- `receita_para_esboco.mjs` — Sonda: receita externo (repositório externo da pessoa) -> .esboco.json do Mecanifica. receita: x leste, y norte, z cima, metros, frente = -y. esboço: y cima,…
- `triagem.md` — Triagem das 66 receitas por família candidata
- `triagem.mjs` — Triagem das receitas do externo por família candidata, sem modelar nada: `node triagem.mjs <pasta de receitas expandidas> > triagem.md`. Mede a caixa envolve…

## docs/mecanifica/banco-de-provas/receitas-externas-2026-10-19/cadeiras-ajustadas/

- `README.md` — Cadeiras ajustadas (2026-10-19)
- `cadeira_almofadada_clara.md` — cadeira_almofadada_clara: ajustes
- `cadeira_basica_clara.md` — cadeira_basica_clara: relato dos ajustes
- `cadeira_classica_creme.md` — cadeira_classica_creme: ajustes de construção
- `cadeira_classica_vinho.md` — cadeira_classica_vinho: ajustes de construção
- `cadeira_desgastada_madeira.md` — cadeira_desgastada_madeira: ajustes sobre a folha alinhada
- `cadeira_fibra_azul.md` — cadeira_fibra_azul: ajustes de construção
- `cadeira_fibra_roxa.md` — cadeira_fibra_roxa: ajustes de construção
- `cadeira_larga_estofada_amarela.md` — cadeira_larga_estofada_amarela: ajustes de construção
- `cadeira_larga_estofada_clara.md` — cadeira_larga_estofada_clara: ajustes de construção
- `cadeira_ripada_marrom.md` — cadeira_ripada_marrom: ajustes de construção
- `cadeira_ripada_simples.md` — cadeira_ripada_simples: ajustes de construção

## docs/mecanifica/banco-de-provas/receitas-externas-2026-10-19/defeitos-marcados/

- `README.md` — Defeitos marcados nas cadeiras (2026-10-19)
- `cadeira_almofadada_clara.md` — Defeitos marcados em cadeira_almofadada_clara
- `cadeira_basica_clara.md` — Defeitos marcados em cadeira_basica_clara
- `cadeira_classica_creme.md` — Defeitos marcados em cadeira_classica_creme
- `cadeira_classica_vinho.md` — Defeitos marcados em cadeira_classica_vinho
- `cadeira_desgastada_madeira.md` — Defeitos marcados em cadeira_desgastada_madeira
- `cadeira_fibra_azul.md` — Defeitos marcados em cadeira_fibra_azul
- `cadeira_fibra_roxa.md` — Defeitos marcados em cadeira_fibra_roxa
- `cadeira_larga_estofada_amarela.md` — Defeitos marcados em cadeira_larga_estofada_amarela
- `cadeira_larga_estofada_clara.md` — Defeitos marcados em cadeira_larga_estofada_clara
- `cadeira_ripada_marrom.md` — Defeitos marcados em cadeira_ripada_marrom
- `cadeira_ripada_simples.md` — Defeitos marcados em cadeira_ripada_simples

## docs/mecanifica/banco-de-provas/receitas-externas-2026-10-19/remodelagem-cadeira-ripada-simples/

- `RELATORIO.md` — cadeira_ripada_simples: remodelagem em PASSOS
- `cadeira_ripada_simples.receita.mjs` — cadeira_ripada_simples.receita.mjs — cadeira de madeira simples (4 pernas, assento, saia, 2 postes de encosto, travessa alta e baixa, 5 ripas), remodelada do…
- `conferir.mjs` — conferir.mjs — executa a receita de cadeira_ripada_simples pelo executor do repositório e confere: (a) caixa total contra o alvo, (b) simetria esquerda/direi…
- `vistas.mjs` — vistas.mjs — as seis vistas de cadeira_ripada_simples (isométricas frente-direita, trás-esquerda e frente-esquerda, frontal, lateral direita e superior) em c…

## docs/mecanifica/banco-de-provas/receitas-externas-2026-10-19/sonda-passos/

- `RESULTADO.md` — Sonda: do esboço traduzido à receita do Mecanifica, sem agente (2026-10-19)
- `sonda-passos.mjs` — sonda-passos.mjs — converte as caixas de um esboço traduzido em passos `cubo` e `parte` da receita do Mecanifica e compara a caixa envolvente da malha execut…

## docs/mecanifica/banco-de-provas/suporte-tubo-2026-10-10/

- `README.md` — Suporte de tubo sem identificador numérico
- `alvo.md` — Alvo do suporte-tubo
- `receita.js` — suporte-tubo — suporte em L de chapa grossa que prende um tubo de 30 mm a uma parede.

## docs/mecanifica/banco-de-provas/textura-2026-10-19/

- `README.md` — Madeira em Node ao lado da do Blender (2026-10-19)

## docs/mecanifica/blender/

- `COMO-COMECAR.md` — Como começar com o Blender
- `FLUXO-GENERICO.md` — Fluxo genérico de modelagem com Blender
- `INSTALAR-E-CONVERTER.md` — Instalar o Blender e converter para GLB
- `README.md` — Blender com o Modelar
- `REGUA-E-PACOTE-CEGO.md` — Régua, pacote cego e oráculo da subdivisão
- `USOS-E-LIMITES.md` — Usos do Blender, limites e regras

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
- `CHEGADA-2026-09-11.md` — O que chegou aqui em 2026-09-11
- `CONJUNTO-PROVA-AUTORIA-GEOMETRICA.md` — Conjunto de prova — autoria geométrica do zero
- `CONTEXTO-FERRAMENTAS-DE-MODELAGEM.md` — Contexto das ferramentas de modelagem
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
- `GRAFO-DE-CAPACIDADES-COMO-RECRIAR.md` — Grafo de capacidades: o que era e como recriar
- `IMPORTADORES-COMO-RECRIAR.md` — Importadores de objeto de código: como recriar
- `LABORATORIO-IA-PROGRESSO.md` — Laboratório computacional para IA — progresso por fatia
- `LEVANTAMENTO-DESENHO-SEM-REFERENCIA.md` — Levantamento: desenho sem referência
- `LEVANTAMENTO-IA-3D-2026-10.md` — Levantamento: IAs que geram 3D e o lugar do Mecanifica (2026-10-05)
- `MALHA-OTIMIZADA-PROGRESSO.md` — Malha otimizada e prova por objeto — progresso
- `MATRIZ-RASTREABILIDADE-AUTORIA-3D-NATIVA.md` — Matriz de rastreabilidade — autoria 3D nativa para IA
- `OFICINA-OTIMIZACOES.md` — Otimizações da Oficina para autoria por IA
- `PLANO-ESTADO-DA-ARTE-ESBOCO.md` — Plano de Implementação: Estado da Arte e Ergonomia para IA no `@mecanifica/esboco`
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
- `REVISAO-DE-RUMO-2026-10.md` — Revisão de rumo do Mecanifica (2026-10-06)
- `VEICULOS-PRIMEIRA-LEVA-2026-10.md` — Veículos de referência livre: o diagnóstico da primeira leva

## docs/mecanifica/planos/

- `2026-08-18-chassi-realista-kernel-geometrico.md` — Chassi realista — representação de superfície para carroceria
- `2026-08-19-chassi-p2-prova-do-quarto.md` — Chassi P2 — prova descartável do quarto dianteiro
- `2026-08-20-motor-de-prancha-autonomia.md` — Motor de Prancha — autonomia verificável
- `2026-08-20-validacao-integrada-mecanifica.md` — Validação integrada da Mecanifica — valor Agent-First
- `2026-09-21-o-que-o-braco-robotico-achou.md` — O que o braço robótico achou
- `2026-10-21-ajustes-no-nucleo-dos-veiculos.md` — Ajustes no núcleo dos veículos — o que as 27 receitas revelaram vai para o núcleo e para as ferramentas gerais
- `2026-10-25-renomear-para-modelar.md` — Renomear para Modelar — o projeto e o repositório passam a ter um nome só
- `2026-10-27-bateria-rapida-e-retorno-cedo.md` — Bateria rápida e retorno cedo — a bateria local abaixo de um minuto e a completa abaixo de cinco no CI
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
- `2026-09-29-o-esboco-sem-conta-a-mao.md` — O esboço sem conta à mão
- `2026-10-01-o-esboco-detalhado-coerente.md` — O esboço detalhado coerente
- `2026-10-06-o-catalogo-de-familias.md` — O catálogo de famílias
- `2026-10-07-as-ferramentas-de-modelagem.md` — As ferramentas de modelagem
- `2026-10-07-o-caminho-curto-da-ia.md` — O caminho curto da IA
- `2026-10-08-perguntas-do-critico-por-objeto.md` — Perguntas do crítico por componente e por família de objeto
- `2026-10-11-o-que-o-aviao-pede.md` — O que o avião pede
- `2026-10-13-desenho-sem-referencia.md` — Desenho sem referência
- `2026-10-14-familias-de-desenho.md` — As famílias de desenho
- `2026-10-15-importar-objeto-de-codigo.md` — Importar objeto de código — um objeto descrito em OpenSCAD chega ao esboço e à receita por importação
- `2026-10-15-o-aviao-do-esboco-a-receita.md` — O avião do esboço à receita
- `2026-10-16-aparelhos-de-caixa.md` — Aparelhos de caixa — uma família gera eletrodomésticos e eletrônicos de caixa, provada no forninho elétrico
- `2026-10-16-gates-em-poucos-minutos.md` — Gates em poucos minutos — a bateria completa volta a caber no trabalho sem tirar nenhuma conferência
- `2026-10-19-objetos-externos-como-familias.md` — Objetos externos como famílias do Mecanifica — da receita traduzida ao perfil aprovado
- `2026-10-19-receitas-com-material-e-textura.md` — Receitas com material e textura — tradução sem perdas do projeto externo da pessoa e geração de textura em Node
- `2026-10-20-veiculos-de-referencia-livre.md` — Veículos de referência livre — 27 peças do acervo recriadas a partir de malhas de licença livre sem exigência de crédito
- `2026-10-21-carroceria-por-subdivisao.md` — Carroceria por subdivisão — superfície contínua com vincos nomeados no núcleo
- `2026-10-22-leitura-por-demanda-e-limpeza.md` — Leitura por demanda e limpeza — a IA lê só o que a tarefa pede e o repositório perde o que ninguém usa
- `2026-10-23-gaiola-que-segue-as-feicoes.md` — Gaiola que segue as feições — anéis de gaiola em volta de vãos e arcos para a carroceria ter moldura, calha e lábio
- `2026-10-24-carroceria-por-rede-de-curvas.md` — Carroceria por rede de curvas — a superfície preenchida entre curvas de feição nomeadas, com o detalhe lido em cortes ampliados
- `DESENHO-bancada-referencias-e-controles.md` — Referências visuais e controles persistentes da bancada
- `README.md` — Planos encerrados

## docs/mecanifica/planos/mcp/

- `INDEX.md` — Programa MCP — índice de planos

## docs/mecanifica/planos/mcp/concluidos/

- `01-fatia-1a-piloto-leitura.md` — MCP — encerramento da Fatia 1A somente leitura

## docs/mecanifica/roteiros/

- `ROTEIROS.md` — Roteiros de leitura por intenção

## docs/mecanifica/usar/

- `AJUSTE-DA-BANCADA.md` — Ajuste da bancada
- `ATIVACAO-BANCADA-SESSAO-ATIVA.md` — Ativação de Peças e Montagens na Bancada 3D (Sessão Ativa)
- `AUDITORIA-DA-MONTAGEM.md` — O apoio no chão e a auditoria da montagem construída
- `AUTORIA-DE-PECA.md` — Autoria de peça — o contrato
- `AUTORIA-RECEITA-DECLARATIVA.md` — Autoria de receita declarativa
- `CONFERIR-CONTRA-REFERENCIA.md` — Conferir a peça contra uma foto de referência
- `CONTRATO-AUTORIA-PRANCHA.md` — Contrato de autoria de prancha v1
- `CRITICA-VISUAL-CONTRATO-E-CASOS.md` — Crítica visual — contrato do achado e casos aplicados
- `FLUXO-DO-OBJETO.md` — Fluxo do objeto
- `GOTCHAS-AUTORIA-VISUAL.md` — Gotchas de autoria visual
- `GOTCHAS-POR-OPERACAO.md` — Gotchas por operação: os casos completos
- `GUIA-AUTORIA-IA.md` — # Guia de Autoria e Modelagem Procedural para IA
- `INTENCAO-PECA-V1.md` — Intenção semântica opcional de peça — v1
- `LACO-VISUAL.md` — O laço visual — olhar, sobrepor, despachar
- `METODO-DIAGNOSTICO-E-SEU-LIMITE.md` — Método diagnóstico, e onde ele para
- `MONTAGENS-SEMANTICAS.md` — Montagens semânticas
- `PARAMETROS-VIVOS.md` — Parâmetro vivo e parâmetro decorativo
- `PARE-E-ANALISE.md` — Pare e analise
- `README.md` — Usar o Modelar
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

- `borda-subpixel.js` — borda-subpixel.js — a linha de cada parte passa pela borda da imagem dentro do pixel, e não pela borda da máscara.
- `colunas.js` — colunas.js — nomes em duas colunas fora do desenho, com chamada até a parte.
- `desenho.js` — desenho.js — o que o crítico e a pessoa olham.
- `forma-declarada.js` — forma-declarada.js — a forma que o desenhador de contorno declara para um trecho da borda de uma parte.
- `index.js` — index.js — a porta do módulo contorno-da-imagem: segmentação, desenho, medida e rodadas.
- `medida.js` — medida.js — o contorno de cada parte contra as bordas da própria imagem. Para cada parte, a fração do perímetro que fica a até `distancia` pixels de uma bord…
- `opencv.js` — opencv.js — carrega o OpenCV uma vez. Carregado por require, e só quando usado: importado como módulo ES, o pacote quebra dentro do vitest. E o módulo volta …
- `regioes.js` — regioes.js — as partes da imagem, separadas por watershed com sementes.
- `rodadas.js` — rodadas.js — a conversa entre quem produz e o crítico, com limite. Vale para o mapa de partes e para a prancha.

## modulos/contorno-da-imagem/tests/

- `ajudas-subpixel.js` — ajudas-subpixel.js — imagens sintéticas antisserrilhadas e medidas de geometria para os testes da borda abaixo do pixel e da forma declarada.
- `borda-subpixel.test.js` — borda-subpixel.test.js — a linha de cada borda passa pelo meio-tom da imagem, dentro do pixel. Casos sintéticos antisserrilhados, em que a posição real da bo…
- `contorno.test.js` — contorno.test.js — cada peça do módulo vista num caso construído de propósito: duas partes do mesmo cinza separadas pela semente, a pintura com a opacidade p…
- `forma-declarada.test.js` — forma-declarada.test.js — o desenhador declara que um trecho da borda é reta, curva ou detalhe; a ferramenta ajusta quando a imagem concorda e avisa, sem aju…

## modulos/esboco/

- `README.md` — @mecanifica/esboco

## modulos/esboco/componentes/

- `index.js` — Biblioteca de componentes do esboço: cada `<nome>.json` desta pasta descreve um componente parametrizado (parâmetros, entradas, formas, âncoras e pares do ga…

## modulos/esboco/src/

- `achado.js` — Imagem de um achado: só as peças envolvidas saem coloridas (a primeira em laranja, a segunda em azul), o resto sai em cinza translúcido, sem legenda numerada…
- `ajustar.js` — `--ajustar`: aplica no JSON declarado as sugestões de contato do gate e reexecuta o gate, até aprovar, até uma rodada não reduzir os achados ou até o limite …
- `arranjo.js` — O que um `arranja` repete: uma forma ou um grupo de formas. Puro.
- `camada.js` — Camada das formas para o desenho com teste de profundidade por pixel.
- `componentes.js` — Componentes parametrizados: `{ "id": "rodaFrente", "usa": "roda", "parametros": {...}, "centro": [...] }` numa lista de formas vira as formas do componente, …
- `condutor.js` — O Condutor: a máquina de estados do fluxo de um esboço grande. Estágios: Maquete (formas primitivas com dimensões e posições certas), Conferência da maquete,…
- `conserto.js` — Conserto proposto pelo gate: para cada achado de contato, qual forma mover, em que vetor e por quê. Trabalha sobre o esboço já expandido (números, sem expres…
- `contato.js` — Contato do esboço: gate opt-in de colisão, folga e conjunto conectado entre as formas de cada opção. A geometria é a que o desenho já monta (`resolverOpcao`:…
- `corte.js` — Vista de corte: o plano `eixo = valor` divide o esboço, o desenho mostra só o lado escolhido e a superfície onde o plano atravessa cada sólido é preenchida e…
- `curso-varredura.js` — A varredura do curso de um mecanismo (`curso.js`): em cada posição o gate de contato roda no esboço com o parâmetro naquele valor, e os achados vêm juntos, c…
- `curso.js` — O curso de um mecanismo no esboço: `curso` na raiz declara, por mecanismo, o parâmetro que o move, de onde até onde ele vai e em quantos passos. O trem de po…
- `decomposicao-convexa.js` — Decomposição convexa de uma superfície: o casco convexo de uma nuvem de pontos e o corte de uma lista de polígonos planos em pedaços cujo casco quase não esc…
- `descrever.js` — Leitura do esboço em texto: cada forma resolvida, as âncoras, o grafo de contatos 3D, as formas soltas e as sobreposições (3D e por vista), sem desenhar nada…
- `desenho-da-blocagem.js` — O desenho da blocagem: as quatro vistas (isométrica, frontal, lateral e superior) de uma malha triangular que o módulo recebe como dado, com a oclusão por pi…
- `detalhe.js` — Detalhar e integrar uma Unidade de detalhe: `detalharUnidade` devolve um esboço isolado da unidade (as entradas das outras unidades com `oculto: true`, o pla…
- `editar.js` — `--editar`: a versão mínima da linguagem incremental. Muda, remove ou acrescenta formas no JSON declarado sem regravar o arquivo à mão: `<forma>.<campo>=<val…
- `esquema.js` — Esquema do JSON do esboço: recusa o campo que não existe, o tipo de forma que não existe e o valor fora do conjunto válido, com uma mensagem que diz onde est…
- `estilos.js` — Estilos, cor por unidade e simetria implícita: a etapa de expansão que roda antes de tudo (antes dos componentes, dos parâmetros e dos arranjos) sobre a list…
- `expandir.js` — Parâmetros, expressões, formas herdadas da raiz e arranjos: a etapa que transforma o JSON declarado num JSON simples, só com números, antes de qualquer outra…
- `familia.js` — A forma de família: um sólido que vem de uma família procedural (`procedural/familias`, contrato `mecanifica.familia@1`) e entra no esboço como uma forma só,…
- `formas-resolvidas.js` — As formas de uma opção do esboço como dado puro: parâmetros, componentes, simetria, arranjo e relações já viram centro, medida e matriz em milímetro de mundo…
- `giro.js` — Giro rígido de um grupo de formas em torno de um pivô: o que a instância de componente com `rotacao` (a roda do trem principal do avião gira em torno de z ao…
- `index.js` — Esboço de opções de forma: lê a declaração de cilindros, anéis e caixas em milímetro, resolve as posições relativas (sobre, ponta) e desenha as opções lado a…
- `lados.js` — De que lado cada vista olha, em texto, para o brief do crítico cego. As quatro vistas de sempre olham dos lados positivos dos eixos (frontal de +z, lateral d…
- `ligar.js` — `ligar`: a forma criada entre duas âncoras. `{ "id": "h", "ligar": { "de": "A.topo", "para": "B.base", "tipo": "haste", "diametro": 8 } }` vira a forma comum…
- `malha.js` — Malha: o sólido que vem de fora do esboço como superfície, uma lista de polígonos planos sobre vértices em milímetro. É a forma que uma família procedural (r…
- `mapa-de-ligacoes.js` — O mapa de ligações de uma opção, em texto (`--ligacoes`): quem toca quem, em quantos pontos distintos, as pontas livres e as unidades presas a nada. Os ponto…
- `oclusao-das-linhas.js` — O que uma forma esconde de si: as linhas de uma forma que as faces de frente da própria forma cobrem.
- `parecido.js` — "Quis dizer": o nome válido mais parecido com o que foi escrito, para as mensagens de recusa do esquema, do plano e do Condutor. Puro.
- `perfis.js` — Perfis por função: no lugar da lista de pontos, o `perfil` de uma `extrusao`, `revolucao` ou seção de `loft` pode ser `{ "gerar": "<gerador>", ... }`, que a …
- `perguntas.js` — As perguntas de forma que o brief do crítico do esboço traz depois das cinco fixas: as do componente (o campo `perguntas` do JSON do componente ou do módulo …
- `plano.js` — O `plano` estruturado do esboço: nível de detalhe, medidas nomeadas conferidas contra o esboço e contrato de relações (o que deve tocar, o que deve ficar liv…
- `portas.js` — Portas do esboço: o campo `porta` de uma forma (`recebe`, `ocupa` ou `apoia`) e a conferência do par que as duas formas formam, para o gate de contato. A int…
- `projecao.js` — Sobreposição na projeção: o gate de contato mede colisão, folga e ligação em três dimensões, e a pessoa vê o que ele não mede: duas peças sem penetração algu…
- `recorte.js` — Recorte de uma forma por outra (`subtrai`): o alojamento da roda dentro da asa e do capô, a porta rebaixada no casco, o compensador aberto na borda de fuga e…
- `referencia.js` — Conferência contra a referência: compara, por vista, a silhueta do esboço com a silhueta de uma referência (o contorno de uma foto, em milímetro) e, por part…
- `suave.js` — Superfície suave por seções: o loft e a revolução com `suave: true` passam uma curva de tangente contínua pelas seções que o esbocista declarou, em vez de li…

## modulos/esboco/tests/

- `atritos-da-refeita.test.js` — Os treze atritos da primeira refeita (plano "O esboço detalhado coerente", fatia 5), cada um em reprodução mínima: referências internas de módulo, `--editar`…
- `atritos-da-segunda-integracao.test.js` — Os atritos 43 e 44 do esboço do avião, cada um em reprodução mínima: o `--integrar` de uma unidade que já foi integrada, com o cortador dela já no mestre (43…
- `atritos-do-aviao.test.js` — Os atritos do esboço do avião que são do gate de contato e dos miúdos do esboço (plano "O que o avião pede", fatia 5, onda 1): o `contrato.fixa` com face con…
- `biblioteca.test.js` — Biblioteca genérica de componentes de arquivo: parafuso, mola, engrenagem, rolamento, perfil estrutural e dobradiça. Cada um tem teste de expansão (ids, parâ…
- `brief-do-critico.test.js` — O processo do crítico do esboço depois do avião (atritos 9, 11, 12, 20, 21, 25, 29, 31 e 33): o brief da unidade, do Marco e do objeto vai para `brief.md` e …
- `camada-sem-perfil.test.js` — `perfilDosTracos: false`: a camada das formas sem o perfil das fitas, para quem mede só a área das faces (a silhueta de `tools/mecanifica/esboco-silhueta.mjs`).
- `casca.test.js` — O loft com seção "arredondado" e com "casca": a caçamba de um carrinho de mão (bacia oca de parede inclinada, boca em D com cantos arredondados, fundo menor …
- `componentes.test.js` — Componentes parametrizados (`usa`): expansão com ids prefixados, parâmetros no escopo do componente, entradas, âncoras expostas, pares do gate, espelho de in…
- `condutor-nivel-zero.test.js` — O Condutor lendo o nível zero por uma porta de injeção: o módulo não importa o núcleo, e quem chama passa a função `nivelZero(bruto)`. Aqui a porta é uma fun…
- `condutor.test.js` — O Condutor: estágios, Portão de estágio, nível de detalhe, Plano de detalhe (unidades e ordem), agrupamento com motivo e Marcos.
- `conserto.test.js` — Conserto proposto pelo gate e `--ajustar`: qual forma se move, quanto, e o gate aprovando depois.
- `contato.test.js` — Gate de contato do esboço: colisão, folga, voando e pares declarados.
- `correcoes-do-fluxo.test.js` — Os seis bugs do fluxo por unidades que as duas rodadas de medição acharam (plano "O esboço detalhado coerente", fatia 1), cada um em reprodução mínima, e os …
- `corte-de-malha.test.js` — A seção de corte de uma forma cuja superfície é uma malha de pedaços convexos (a asa e a pá da família `superficie-aerodinamica`) com um vão recortado. A par…
- `corte.test.js` — `--corte`: a vista da seção. O esboço leva `corte: { eixo, valor, lado }`; o desenho corta cada forma pelo plano, mostra só o lado escolhido e preenche a sup…
- `critico.test.js` — O crítico por unidade (plano "O esboço detalhado coerente", fatia 2): `funcao` por unidade, `--largura` e `--saida` nas imagens de `--unidade`, o brief que o…
- `curso-na-linha-de-comando.test.js` — O curso de um mecanismo na linha de comando e no brief do crítico (atritos 38, 40, 42 e 43 do avião): `--curso` varre as posições e junta os achados; o brief…
- `curso.test.js` — O curso de um mecanismo no esboço (atritos 38, 40 e 42 do avião): o trem recolhe girando por um parâmetro e atravessa o capô depois de 85 graus, e saber diss…
- `curvas.test.js` — Formas curvas: extrusão de perfil côncavo, loft por seções e revolução por perfil, em desenho (ordem das faces medida por lançamento de raios), âncoras, gate…
- `descrever.test.js` — Leitura do esboço em texto (`--descrever`, `--descrever --mudou`) e âncoras nomeadas.
- `desempenho.test.js` — Desempenho do esboço: a projeção reaproveita as faces de cada forma, só mede os pares cujas caixas na tela se cruzam, o desenho tem a opção de menos lados no…
- `desenho-da-blocagem.test.js` — O desenho da blocagem (`src/desenho-da-blocagem.js`): recebe a malha como dado e desenha as quatro vistas no mesmo quadro do desenho das formas. As malhas da…
- `edicao.test.js` — A parte 10b da fatia 10: `--editar`, `estilos` e cor por unidade, simetria implícita, perfis por função, Envelope por forma, `--unidade` e o inventário de pe…
- `envolve.test.js` — A forma `envolve` (faixa que contorna círculos por tangentes e arcos) e o modo `caminho` do `arranja`: correia entre coroa e pinhão, esteira em volta de três…
- `esboco.test.js` — Contrato do esboço: posição relativa por sobre/ponta, recusa de referência inexistente e PNG no tamanho que o desenho declara.
- `esperado.test.js` — Fixtures com resultado esperado: a moto de prova (com o Condutor completo), o mancal e a casa, cada uma com o seu `<nome>.esperado.json` ao lado (contagem de…
- `explodir.test.js` — `--explodir`: cada forma (ou cada instância de componente) da unidade é afastada do centro dela ao longo de um eixo, em passos por camada, com uma linha fina…
- `familia.test.js` — A forma de família do esboço (`tipo: "familia"`, `src/familia.js`): o módulo recebe a malha de um provedor injetado e a trata como as outras formas, em cada …
- `formas-resolvidas.test.js` — A exportação das formas resolvidas: dado puro (JSON ida e volta igual), determinístico, completo em relação ao que o desenho mostra, e coerente com a geometr…
- `formas.test.js` — Formas novas: esfera, cone e tronco, extrusão de polígono, chanfro em caixa e tubo por pontos, em desenho, âncoras, gate de contato, espelho e arranjo, leitu…
- `inclinacao.test.js` — A seção inclinada do loft ("inclinacao": [au, av], em graus): a boca horizontal e o fundo inclinado de uma cacamba, com seções de transição. As provas são me…
- `incremental.test.js` — `--unidade` incremental: o hash do conteúdo desenhado fica em `<imagem>.hash`, e a vista cujo conteúdo (as formas da unidade já resolvidas, a vista, a largur…
- `integracao-do-detalhe.test.js` — A integração do detalhe com o mestre e o Envelope (plano "O que o avião pede", fatia 5, onda 1), cada atrito do esboço do avião em reprodução mínima: o parâm…
- `lados.test.js` — De que lado cada vista olha (atritos 12, 21, 31 e 33 do avião): o texto do brief com o eixo e, com `plano.orientacao`, com as palavras do objeto; as vistas d…
- `leitura.test.js` — Leitura padrão do `--descrever` (só divergências), detalhe por forma, leitura completa idêntica à antiga e imagem por achado.
- `ligacoes.test.js` — As ligações estruturais do esboço (plano "O esboço detalhado coerente", fatia 2): `plano.contrato.fixa` (uma peça presa a outra por N pontos de contato disti…
- `ligar-encaixa.test.js` — `ligar` (forma criada entre duas âncoras, atrelada a elas) e `encaixa` (a peça posicionada pela âncora dela), com as mensagens de erro de âncora inexistente …
- `malha-de-prova.js` — A malha de prova dos testes da forma de família: um tubo de parede (a camisa do cilindro hidráulico, o cubo da roda) ao longo de x, como o dado `mecanifica.m…
- `malha.test.js` — A malha que uma família entrega ao esboço (`src/malha.js`, dado `mecanifica.malha@1`): a leitura recentra, confere e dá o volume; as peças convexas deixam li…
- `mapa-de-ligacoes.test.js` — `--ligacoes`: o mapa de ligações em texto (quem toca quem, em quantos pontos distintos, pontas livres e unidades presas a nada), por unidade e por forma, sem…
- `marcas-no-desenho.test.js` — Duas marcas que o desenho por pixel mostrava onde não há nada, medidas em pixels da camada das formas (o PNG do WebGL sem o SVG por cima, com fundo transpare…
- `marco-e-medidas.test.js` — O crítico cego também no Marco, o `--medidas` em texto e o Marco incremental (plano "O esboço detalhado coerente", fatia 3).
- `modulos.test.js` — Bloco `modulos` do esboço: a IA define no próprio JSON um módulo reutilizável (parâmetros, formas e âncoras) e o usa por `usa`, pelo mesmo caminho de expansã…
- `nota-do-critico.test.js` — A regra da nota no Condutor (plano "O esboço detalhado coerente", fatia 7): a unidade com brief (ou o Marco) cujo último veredito é menor que 8 bloqueia o --…
- `oclusao-do-contorno.test.js` — A oclusão das linhas de uma forma recortada (`subtrai`): uma linha que corre sobre a borda de uma face não some, e uma que está de fato atrás dela continua e…
- `parametros.test.js` — Parâmetros e expressões, formas herdadas da raiz, `espelha` e `arranja`, e o legado byte a byte.
- `perguntas-do-critico.test.js` — As perguntas de forma por componente e por família de objeto no brief do crítico do esboço: o campo `perguntas` do componente e do módulo, `plano.familia` co…
- `plano.test.js` — O `plano` estruturado: medidas nomeadas conferidas contra o esboço, contrato de relações e o esquema do JSON.
- `portas.test.js` — Portas no esboço: o campo `porta` (`recebe`, `ocupa`, `apoia`) das formas e o gate de contato que o lê. A prova é por medida: a moto de curvas segue aprovada…
- `posicao.test.js` — Posicionar sem calcular coordenada: haste `de`/`para`, `encosta`, `alinha` e pontos nomeados.
- `previa.test.js` — `--previa`: menos facetas nas curvas, menos fatias e sem as arestas finas (silhuetas e arcos), para iterar por unidade em poucos segundos; a imagem sai rotul…
- `profundidade-por-pixel.test.js` — Oclusão por pixel nas imagens PNG do esboço. O desenho em SVG pinta cada forma inteira por cima ou por baixo das outras (profundidade média), e erra quando u…
- `projecao.test.js` — Sobreposição na projeção: silhuetas que se cobrem sem penetração 3D, explosão e opacidade.
- `recorte.test.js` — O recorte de uma forma por outra (`subtrai`): o alojamento da roda na asa, a porta rebaixada no casco, o entalhe na borda e o furo passante, provados por núm…
- `referencia.test.js` — Conferência contra a referência: a silhueta do esboço contra um contorno (gerado aqui, sem foto), por vista e por parte, com a razão interseção/união e o des…
- `relacoes.test.js` — Contrato de relações da fatia 8: `contato.juntas`, pontos-guia nomeados no `caminho` do tubo, âncora com deslocamento e `<instancia>.<parte>` em todo campo q…
- `roda-e-perfis.test.js` — A `roda` com raios, flanges e pneu de seção arredondada, e os perfis `gerar` de pneu, de raios e de disco de freio (plano "O esboço detalhado coerente", fati…
- `rotacao-da-instancia.test.js` — A instância de componente com `rotacao` (atrito 43 do avião): o trem principal recolhe girando em torno de z, a instância da `roda` não girava, e foi preciso…
- `silhueta-sobre-as-faces.test.js` — O traço da silhueta de uma forma côncava ou recortada (`subtrai`) vai por cima de todas as faces dela. O desenho pintava cada face e logo depois as linhas de…
- `skill.test.js` — As skills `esboco-detalhado`, `laco-do-esboco` e `esbocar-opcoes` e o `PARE-E-ANALISE.md` dizem o fluxo, o nível de detalhe e a proibição de auditar por imag…
- `suave.test.js` — A superfície suave por seções (`suave: true` no loft e na revolução, `suave.js`): a curva passa pelas seções declaradas com tangente contínua, sem passar do …
- `unidades.test.js` — A unidade declarada (`unidade` na forma, na instância e no espelho), a junta dentro da mesma unidade sem declaração, o gate que ignora forma oculta, `--mover…
- `vista-isolada.test.js` — `--vista <vista>` sozinho grava a vista isolada do esboço inteiro na pasta de `--saida`. Antes a linha caía na leitura padrão, imprimia o gate e não gravava …
- `vizinhos.test.js` — A vista `--unidade` desenha também as formas de outras unidades que a tocam (as do `--ligacoes`), em contorno claro e translúcido, sem rótulo; `--sem-vizinho…
- `zoom-forma.test.js` — `--zoom-forma <id|padrão>`: o desenho é reenquadrado na forma (ou nas formas do padrão) com uma margem em mm e rasterizado na resolução cheia, em vez de ampl…

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

## modulos/exportador-obj/

- `README.md` — Exportador Wavefront OBJ

## modulos/exportador-obj/src/

- `contrato.js` — contrato.js — tipos, erros e validação de opções do exportador Wavefront OBJ.
- `gerar-mtl.js` — gerar-mtl.js — serializador do arquivo .mtl que liga cada material à sua imagem. Só escreve a referência: não gera nem grava a imagem.
- `gerar-obj.js` — gerar-obj.js — serializador Wavefront OBJ (.obj) puro e determinístico com suporte a multipartes e coordenadas de textura.
- `index.js` — index.js — porta pública do módulo exportador Wavefront OBJ.
- `validar-malha.js` — validar-malha.js — validação e normalização de malha neutra para exportação OBJ.

## modulos/exportador-obj/tests/

- `exportador-obj.test.js` — exportador-obj.test.js — suíte de testes do exportador Wavefront OBJ.
- `textura.test.js` — textura.test.js — material por parte, arquivo .mtl, usemtl, coordenadas vt em mapeamento planar e recusas.
- `tolerancia.test.js` — tolerancia.test.js — tolerância de triângulo degenerado e regressão de saída sem texturas.

## modulos/pesquisa/

- `README.md` — Pesquisa

## modulos/pesquisa/bibliotecas/

- `BIBLIOTECAS.md` — Bibliotecas avaliadas e ainda fora

## modulos/textura/

- `README.md` — Textura

## modulos/textura/scripts/

- `folha-madeira.mjs` — Gera a folha de amostras da madeira: node modulos/textura/scripts/folha-madeira.mjs <pasta-de-saida> [--blender <pasta com blender-A.png ... blender-E.png>] …
- `folha-metal-tecido.mjs` — Gera as folhas de amostras do metal e do tecido: node modulos/textura/scripts/folha-metal-tecido.mjs <pasta-de-saida> [--blender <pasta com blender-<tipo>-<i…

## modulos/textura/src/

- `cor.js` — Conversão entre sRGB 0-255 e luz linear 0-1.
- `desgaste.js` — Camada de uso por cima da cor base (porte de `_aplicar_desgaste` do Blender, em linear): tinta amarelada, encardido, escorridos, ferrugem e tinta lascada.
- `erro.js` — Erro de entrada ou de tipo de material que o gerador ainda não cobre.
- `estrago.js` — Estrago por cima do material (porte de `_aplicar_estrago` do Blender, sem `podre`, que é da madeira): manchas irregulares com auréola amarelada de umidade e …
- `index.js` — Gerador determinístico da imagem de cor de um material, em JavaScript puro (sem Blender, sem Three.js e sem o núcleo do Modelar). A entrada é o material no f…
- `liso.js` — Cor chapada de tinta ou plástico com variação suave e ruído fraco (porte de `_liso` do Blender).
- `madeira.js` — Madeira (porte de `_madeira` do Blender para um tile contínuo).
- `metal.js` — Metal (porte de `_metal` do Blender para um tile contínuo).
- `ruido.js` — Ruído determinístico e contínuo nas bordas do tile (gradiente de Perlin com rede periódica). Sem Math.random: todo número vem de um hash inteiro da semente e…
- `tecido.js` — Tecido (porte de `_tecido` do Blender para um tile contínuo): trama simples de dois fios que se cruzam alternados (xadrez de fios por cima e por baixo), cada…

## modulos/textura/tests/

- `metal-tecido.test.js` — Testes de metal e tecido: determinismo, tile contínuo, efeito de cada campo, e regressão de madeira e liso.
- `textura.test.js` — Testes do gerador de textura: determinismo, tile contínuo, veio, tábuas, liso e recusas.

## procedural/

- `README.md` — procedural — núcleo, receitas, famílias e extensões

## procedural/criterios/

- `index.js` — Critérios por família de objeto: cada `<id>.json` desta pasta (formato `mecanifica.criterios-do-objeto@1`) traz as perguntas de forma que o brief do crítico …

## procedural/extensoes/articulacao/

- `declaracao.js` — declaracao.js — leitura da articulação declarada entre duas peças.
- `fixture.js` — fixture.js — articulação sintética da extensão: a folha de uma porta que gira noventa graus no eixo da porta publicada pelo batente. As peças e as portas vêm…
- `implementacao.js` — implementacao.js — a articulação não emite vértice nem face. Recebe somente a resolução numérica do contexto e lê a declaração; declaração inválida descarta …
- `manifesto.js` — manifesto.js — contrato versionado da extensão de articulação.

## procedural/extensoes/casca/

- `fixture.js` — fixture.js — receita sintética da extensão: caixa oca aberta em cima.
- `implementacao.js` — implementacao.js — lê o sólido pela seleção, calcula a parede e emite só o que se soma a ele.
- `manifesto.js` — manifesto.js — contrato versionado da extensão `casca`: sólido oco de parede com espessura constante.

## procedural/extensoes/chapa-dobrada/

- `chapa.js` — chapa.js — a conta da chapa dobrada: contorno da seção com as dobras no raio pedido e as medidas de chapa.
- `fixture.js` — fixture.js — receita sintética da extensão, sem publicação de peça: um L de chapa de 2 mm, raio interno 2 mm, 30 mm de largura.
- `implementacao.js` — implementacao.js — extrusa o contorno da chapa dobrada numa largura e, com `origemId`, publica a origem estrutural dela; recebe somente emissor transacional …
- `index.js` — index.js — o pacote registrável da extensão chapa dobrada: manifesto, implementação e a conta das medidas.
- `manifesto.js` — manifesto.js — contrato versionado da extensão chapa dobrada: espessura, raio interno e abas, com as medidas de chapa.

## procedural/extensoes/estrutura-de-barras/

- `estrutura.js` — estrutura.js — valida e constrói a estrutura de barras: barras entre nós nomeados, cortadas ou encaixadas em cada nó, unidas num sólido só.
- `fixture.js` — fixture.js — receita sintética da extensão: um quadro plano de tubos quadrados, sem publicação de peça.
- `implementacao.js` — implementacao.js — emite a malha unida da estrutura de barras pelo contexto limitado da extensão nativa.
- `manifesto.js` — manifesto.js — contrato versionado da extensão nativa estruturaDeBarras: nós nomeados, barras com perfil, juntas cortadas e unidas.
- `perfis.js` — perfis.js — seções transversais da estrutura de barras: tubo redondo, quadrado, retangular e cantoneira, em geometria pura.

## procedural/extensoes/prisma-triangular/

- `fixture.js` — fixture.js — receita sintética da extensão, sem publicação de peça.
- `implementacao.js` — implementacao.js — recebe somente emissor transacional e resolução numérica.
- `manifesto.js` — manifesto.js — contrato versionado da extensão neutra de prova.

## procedural/familias/

- `familias.test.js` — familias.test.js — o registro explícito de famílias e a porta `chamar` ponta a ponta: uma receita com `get CHAMADAS_COMPOSICOES` chama a família de prova, ex…
- `index.js` — index.js — o registro explícito das famílias e a porta de entrada `chamar`.

## procedural/familias/aparelho-de-caixa/

- `aparelho-de-caixa.test.mjs` — aparelho-de-caixa.test.mjs — a família de aparelho de caixa: as combinações que ela declara, a caixa envolvente do perfil do forninho medida na malha, a fren…
- `composicoes.js` — composicoes.js — as composições procedurais da família `aparelho-de-caixa`, geradas por laço porque a quantidade de botões, a presença do painel, do visor e …
- `derivar.js` — derivar.js — dos parâmetros do aparelho de caixa (milímetro) à chamada de composição (metro).
- `geometria.js` — geometria.js — as medidas do aparelho de caixa a partir dos parâmetros da família, em milímetro.
- `index.js` — index.js — a família `aparelho-de-caixa` carregada: o contrato `familia.json`, as composições e o `derivar`.

## procedural/familias/cadeira/

- `cadeira.test.mjs` — cadeira.test.mjs — a família de cadeira: as combinações, as faixas e restrições, a solidez da malha, o determinismo do hash, as partes nomeadas, as regras co…
- `composicoes.js` — composicoes.js — as composições procedurais da família `cadeira`, geradas por laço porque a quantidade de tábuas do assento e de ripas, e a presença de poste…
- `derivar.js` — derivar.js — dos parâmetros da cadeira (milímetro) à chamada de composição (metro).
- `geometria.js` — geometria.js — as caixas da cadeira a partir dos parâmetros da família, em milímetro.
- `index.js` — index.js — a família `cadeira` carregada: o contrato `familia.json`, as composições e o `derivar`.

## procedural/familias/cilindro-hidraulico/

- `cilindro-hidraulico.test.js` — cilindro-hidraulico.test.js — a família `cilindro-hidraulico` medida contra contas feitas à mão: a camisa de casca nativa com a parede pedida, o êmbolo que p…
- `composicoes.js` — composicoes.js — as composições procedurais do cilindro hidráulico: a camisa, a haste e o conjunto dos dois.
- `derivar.js` — derivar.js — dos parâmetros da família (milímetro) aos argumentos das composições (metro).
- `geometria.js` — geometria.js — as medidas do cilindro hidráulico a partir dos parâmetros da família, puras e em milímetro.
- `index.js` — index.js — a família `cilindro-hidraulico`: atuador linear de dupla ação, camisa de casca nativa e haste ligada a ela por uma articulação prismática, com a m…
- `montagem.js` — montagem.js — a montagem v5 que a família gera: a camisa e a haste, peças distintas, ligadas por uma articulação prismática com o curso declarado.

## procedural/familias/dobradica/

- `composicoes.js` — composicoes.js — as composições procedurais da família `dobradica`, geradas por laço porque o número de nós e de furos muda a quantidade de passos e a compos…
- `derivar.js` — derivar.js — dos parâmetros da dobradiça (milímetro) à chamada de composição (metro).
- `dobradica.test.mjs` — dobradica.test.mjs — a família `dobradica`: contrato, recusas, geometria medida contra a conta, a montagem v5 que ela gera (resolvida pelo resolvedor real) e…
- `geometria.js` — geometria.js — as medidas da dobradiça de abas a partir dos parâmetros da família, em metro.
- `index.js` — index.js — a família `dobradica` carregada: o contrato `familia.json`, as composições, o `derivar` e o gerador da montagem v5. A família é o objeto de `defin…
- `montagem.js` — montagem.js — a mini-montagem v5 que a família gera: o pino e as duas folhas como peças soltas, ligadas por uma articulação de revolução com o curso declarad…

## procedural/familias/exemplo/

- `exemplo.test.js` — O exemplo de peça de família que o ramo `modelar/peca/familia` entrega: ele executa, cada parte da família sai com material, o PLANO é válido e o referencial…
- `receita.js` — exemplo/receita.js — a receita mínima de uma peça que sai de uma família, para copiar.

## procedural/familias/movel-de-caixa/

- `composicoes.js` — composicoes.js — as composições procedurais da família `movel-de-caixa`.
- `derivar.js` — derivar.js — dos parâmetros do móvel de caixa (milímetro) à chamada de composição (metro).
- `geometria.js` — geometria.js — as medidas do móvel de caixa a partir dos parâmetros da família, em milímetro.
- `index.js` — index.js — a família `movel-de-caixa` carregada: o contrato `familia.json`, as composições, o `derivar` e o gerador da montagem v5. A família é o objeto de `…
- `montagem.js` — montagem.js — a montagem v5 que a família gera: o corpo, as portas, as gavetas e os guias e as duas metades de cada dobradiça como peças soltas, com uma arti…
- `movel-de-caixa.test.mjs` — movel-de-caixa.test.mjs — a família `movel-de-caixa`: contrato, recusas, os perfis, o roupeiro como antes, a malha medida contra as contas (zonas, frentes em…

## procedural/familias/roda-pneu/

- `composicoes.js` — composicoes.js — as composições da família `roda-pneu`: a roda de disco e as duas raiadas, cada uma com a banda lisa ou com relevo.
- `derivar.js` — derivar.js — dos parâmetros da família `roda-pneu` (o diâmetro em milímetro, as medidas em proporção do diâmetro, as contagens em contagem) aos argumentos da…
- `index.js` — index.js — a família `roda-pneu` carregada: o contrato `familia.json`, as composições e o `derivar`. O registro do produto (`procedural/familias/index.js`) i…
- `roda-pneu.test.js` — roda-pneu.test.js — a família `roda-pneu` medida na malha. As quatro partes (pneu, aro, cubo, disco) e o volume de cada uma contra a fórmula; a banda (pneumá…

## procedural/familias/superficie-aerodinamica/

- `composicoes.js` — composicoes.js — as composições da família `superficie-aerodinamica`: a superfície (semi ou inteira, com ou sem comando) e a hélice.
- `derivar.js` — derivar.js — dos parâmetros da família `superficie-aerodinamica` (a envergadura em milímetro, as medidas em proporção da envergadura, os ângulos em graus, as…
- `geometria.js` — geometria.js — a superfície aerodinâmica em seções, em metro e em graus.
- `index.js` — index.js — a família `superficie-aerodinamica` carregada: o contrato `familia.json`, as composições e o `derivar`. O registro do produto (`procedural/familia…
- `superficie-aerodinamica.test.js` — superficie-aerodinamica.test.js — a família `superficie-aerodinamica` medida na malha e nos argumentos que o `derivar` entrega. O perfil NACA (o bordo de fug…
- `superficie.js` — superficie.js — as seções do `loft` de uma superfície aerodinâmica: a parte fixa, o comando de cada lado e as portas, em metro.

## procedural/nucleo/

- `adaptador.js` — adaptador.js — projeção visual do neutro; não conhece receitas nem execução.
- `animacao.js` — animacao.js — animação rígida e skinning sobre lotes já adaptados.
- `arrumacao.test.mjs` — arrumacao.test.mjs — segura a arrumação do plano "o núcleo mora num lugar só" (2026-09-22). Antes dele, os testes do núcleo moravam espalhados por `tools/` e…
- `artefatos.js` — artefatos.js — contrato neutro e procedência determinística da execução procedural.
- `artefatos.test.mjs` — artefatos-procedencia.test.mjs — prova o artefato neutro e a origem das entidades finais.
- `casca.js` — casca.js — casca com espessura constante de um sólido facetado: função pura sobre posições e listas de vértices.
- `casca.test.mjs` — casca.test.mjs — a extensão `casca` medida sobre a malha que ela devolve, não sobre a conta que a produz. A espessura é conferida por uma medida independente…
- `catalogo.js` — catálogo.js — projeções puras e determinísticas do registro de operações. Não executa receita, não lê arquivos e não conhece visor, MCP ou domínio.
- `catalogo.test.mjs` — catálogo-capacidades.test.mjs — R05: descoberta deriva do registro, sem tabela paralela.
- `composicoes.js` — composicoes.js — subgrafos procedurais declarativos, sem estado global ou I/O.
- `composicoes.test.mjs` — composicoes-procedurais.test.mjs — R06: subgrafos declarativos e reutilizáveis.
- `concordancia-por-ponto.test.ts` — concordancia-por-ponto.test.ts — A-35: cada curva de um mesmo passo pode declarar seu próprio custo sem obrigar todas as outras a usarem o maior.
- `contorno.js` — contorno.js — contorno 2D puro: retângulo de cantos arredondados, recuo por meia-esquadria, área com sinal e convexidade.
- `contorno.test.mjs` — contorno.test.mjs — retângulo arredondado, recuo por meia-esquadria, área e convexidade do contorno 2D.
- `curva2d.js` — curva2d.js — contorno 2D escrito por trechos (reto, arco, arco tangente, concordância e spline), puro.
- `curva2d.test.mjs` — curva2d.test.mjs — contorno 2D por trechos (reto, arco, arco tangente, concordância e spline).
- `entrada.js` — oficina.js — fachada pública compatível do motor procedural. A implementação é separada por responsabilidade; esta entrada preserva o contrato usado por rece…
- `espessura.js` — espessura.js — dá espessura a uma superfície aberta e devolve o sólido fechado
- `espessura.test.mjs` — espessura.test.mjs — a espessura da superfície aberta: a função pura sobre placa, caixa aberta e tubo, o passo `subdivisao` com `espessura` (sólido fechado, …
- `executor.js` — executor.js — orquestra núcleo, adaptador e animação sem duplicar execução.
- `expressoes.js` — expressoes.js — aritmética determinística e fechada para parâmetros da Oficina. A expressão só existe em um campo numérico e sempre começa com `=`. Ela aceit…
- `expressoes.test.ts` — expressoes.test.ts — contrato da aritmética fechada de PARAMS/TOPO (O-5).
- `extensao-articulacao.test.mjs` — articulacao.test.mjs — a articulação como extensão nativa: o manifesto cabe no SDK, o contrato de uso é descobrível, o passo não emite geometria e a declaraç…
- `extensao-chapa-dobrada-origem.test.mjs` — extensao-chapa-dobrada-origem.test.mjs — a origem estrutural da chapa dobrada: com `origemId` a chapa publica as abas, as dobras, os lados de dentro e de for…
- `extensao-chapa-dobrada.test.mjs` — chapa-dobrada.test.mjs — a extensão chapa dobrada: L, U, Z e caixa aberta medidos na malha, planificado contra a conta, determinismo e recusas que dizem camp…
- `extensao-estrutura-de-barras.test.mjs` — estrutura-de-barras.test.mjs — a extensão estruturaDeBarras: quadro plano, treliça triangular, cubo de 12 barras, juntas sem fresta, comprimentos de corte, p…
- `extensoes.js` — extensoes.js — SDK nativo: manifesta, limita e combina extensões sem estado global.
- `extensoes.test.mjs` — extensoes-nativas.test.mjs — R07: SDK confinado, prova e ausência explícita.
- `friso-aba-pele.test.mjs` — friso-aba-pele.test.mjs — a aba numa chapa sem espessura (fatia 3 do plano da gaiola que segue as feições). O pacote cego entrega só a pele externa da carroc…
- `friso-aba.test.mjs` — friso-aba.test.mjs — a aba que dobra a borda livre de um vão (fatia 25, item 6 do plano da carroceria por subdivisão). A chapa de referência dobra uns 90 gra…
- `friso-contato.test.mjs` — friso-contato.test.mjs — o contato declarado do gate da fatia 13 do plano da carroceria por subdivisão (e o da aba da fatia 25): na chapa curva com vão de `f…
- `friso.js` — friso.js — varredura de um perfil 2D ao longo de uma linha 3D, e a linha de uma gaiola de subdivisão refinada.
- `friso.test.mjs` — friso.test.mjs — o friso ao longo de curva: a varredura pura (volume, sólido fechado, esquadria, ponta fechada e grito da curva fechada demais), a cadeia na …
- `gaiola-aneis-gota.test.mjs` — gaiola-aneis-gota.test.mjs — os anéis de gaiola no vão real de uma carroceria: a gota estreita, o recuo por lado e a abertura que é a própria borda
- `gaiola-aneis.js` — gaiola-aneis.js — anéis de gaiola em volta de um vão, opção da gaiola por estações
- `gaiola-aneis.test.mjs` — gaiola-aneis.test.mjs — os anéis de gaiola em volta de um vão e de um arco, na chapa curva desenhada por código
- `gaiola-captura.js` — gaiola-captura.js — a captura das gaiolas montadas durante uma chamada
- `gaiola-interpolada.js` — gaiola-interpolada.js — estações interpoladas e colunas por curva de seção, opções da gaiola por estações
- `gaiola-interpolada.test.mjs` — gaiola-interpolada.test.mjs — as opções `interpolar` e `curvas` da gaiola por estações: a interpolação monótona das colunas entre estações-chave reproduz uma…
- `gaiola-leitura.test.mjs` — gaiola-leitura.test.mjs — a leitura de imagem declarada na gaiola por estações e o peso padrão do passo `subdivisao` (fatia 2 do plano da gaiola que segue as…
- `gaiola-local.test.mjs` — gaiola-local.test.mjs — a gaiola por estações adensada só num trecho (fatia 12 do plano de carroceria por subdivisão): a região com estações parciais e colun…
- `gaiola-origem.test.mjs` — gaiola-origem.test.mjs — a gaiola por estações publica de onde vem cada ponto.
- `gaiola-por-estacoes.js` — gaiola-por-estacoes.js — monta a gaiola da operação `subdivisao` a partir de estações e colunas nomeadas
- `gaiola-por-estacoes.test.mjs` — gaiola-por-estacoes.test.mjs — o ajudante que monta a gaiola da subdivisão por estações e colunas nomeadas: faces, transições de três e cinco lados, vãos, vi…
- `gaiola-por-rede-contato.test.mjs` — gaiola-por-rede-contato.test.mjs — o contato declarado da moldura de 10 mm com a chapa por rede de curvas
- `gaiola-por-rede-liso.js` — gaiola-por-rede-liso.js — o miolo dos retalhos alisado pela normal, para a tangente não quebrar nas curvas compartilhadas
- `gaiola-por-rede-origem.test.mjs` — gaiola-por-rede-origem.test.mjs — a gaiola por rede de curvas publica de onde vem cada ponto, as entradas editáveis e a estrutura.
- `gaiola-por-rede-prova.test.mjs` — gaiola-por-rede-prova.test.mjs — o gate da fatia 2 do plano da carroceria por rede de curvas: a chapa lateral de 1000 × 600 mm
- `gaiola-por-rede.js` — gaiola-por-rede.js — monta a gaiola da operação `subdivisao` a partir de uma rede de curvas nomeadas e dos retalhos que elas fecham
- `gaiola-por-rede.test.mjs` — gaiola-por-rede.test.mjs — o ajudante que monta a gaiola da subdivisão por uma rede de curvas nomeadas e os retalhos que elas fecham
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
- `medidas-com-peso.test.mjs` — medidas-com-peso.test.mjs — a medida com peso da subdivisão (fatia 11 do plano de carroceria por subdivisão).
- `nomes-de-face.test.ts` — nomes-de-face.test.ts — os NOMES publicados por `origem` são formato salvo, e este arquivo é a única coisa que os prende à geometria.
- `nucleo.js` — nucleo.js — implementação única da OFICINA procedural (passo 1). Executa a lista de PASSOS de uma peça-objeto e devolve o objeto pronto pro visor. Duas camad…
- `operador-das-medidas.test.mjs` — operador-das-medidas.test.mjs — a gaiola ajustada pelas medidas vista como transformação linear da declarada.
- `pedacos-convexos.js` — pedacos-convexos.js — de triângulos coplanares a faces convexas.
- `perfil2d.js` — perfil2d.js — perfil 2D com furos e deslocamento de contorno, sobre a CrossSection da Manifold (Clipper2).
- `perfil2d.test.mjs` — perfil2d.test.mjs — perfil 2D com furos e deslocamento de contorno sobre a CrossSection da Manifold.
- `ponto-nomeado.test.ts` — ponto-nomeado.test.ts — um nome pode guardar um ponto inteiro (A-8 e A-29).
- `pose-de-criacao.test.ts` — pose-de-criacao.test.ts — a prova de `em` e `eixo` nos geradores (A-4 / O-7).
- `referencia-posicional.js` — referencia-posicional.js — A REGRA ÚNICA de "isto é referência por id posicional?", para o formato salvo da Oficina.
- `referencia-posicional.test.ts` — referencia-posicional.test.ts — prova do A-22: a regra de "isto é referência por id posicional?" é UMA SÓ, e ela distingue as duas coisas que a chave `de` ca…
- `registro.js` — registro.js — configuração explícita, determinística e sem estado global de operações.
- `registro.test.mjs` — registro-operacoes.test.mjs — prova configuração explícita e despacho determinístico da R02.
- `selecao-geometrica.js` — selecao-geometrica.js — o seletor `onde` de `sel`: face ou aresta por propriedade geométrica.
- `selecao-geometrica.test.mjs` — selecao-geometrica.test.mjs — `sel.onde`: face e aresta por propriedade geométrica, sem identificador numérico. As expectativas vêm de contas sobre as coorde…
- `selecao-nas-edicoes.test.mjs` — selecao-nas-edicoes.test.mjs — `sel` no lugar do id em moveV, moveF, moveA, vira, mescla, pesar e filete.
- `sha256.js` — sha256.js — SHA-256 síncrono, portátil e sem dependência de Node.
- `subdivisao.js` — subdivisao.js — superfície de subdivisão Catmull-Clark com vincos
- `subdivisao.test.mjs` — subdivisao.test.mjs — a subdivisão Catmull-Clark e a operação `subdivisao` contra a saída congelada do oráculo, com determinismo, ponto limite, interpolação,…
- `topologia.js` — topologia.js — organizador de topologia: diz o que há de errado no traçado de uma malha, e nunca a reescreve. Até 2026-10-27 morava em `modulos/topologia/`; …
- `topologia.test.js` — topologia.test.js — cada regra é vista REPROVANDO um defeito construído de propósito, e APROVANDO a malha sã correspondente.
- `triangulacao-face.js` — triangulacao-face.js — triangulação dos triângulos de UMA face plana. O leque a partir do canto 0 põe dezenas de triângulos longos e finos num único vértice …
- `uso-operacoes.js` — uso-operacoes.js — contratos Agent-First executáveis das operações nativas. A tabela descreve como chamar a capacidade; o executor continua decidindo a geome…

## procedural/nucleo/fixtures/

- `aba-prova.js` — aba-prova.js — a chapa curva com um vão de janela nomeado e a aba que dobra a borda dele, desenhadas por código.
- `borda-enrolada.js` — borda-enrolada.js — a borda enrolada de prova da gaiola local, desenhada só por código
- `friso-prova.js` — friso-prova.js — a chapa curva com vão e os frisos desenhados por código para o teste do passo `friso`.
- `gaiola-aneis-prova.js` — gaiola-aneis-prova.js — a chapa curva com um vão de janela de cantos arredondados e um arco recortado na borda, desenhada por código
- `gaiola-borda-livre-prova.js` — gaiola-borda-livre-prova.js — a metade de uma chapa curva com um vão aberto pelas colunas que terminam e começam
- `gaiola-gota-prova.js` — gaiola-gota-prova.js — a chapa curva com um vão em forma de gota, de ponta estreita, desenhada por código na escala de uma carroceria
- `gaiola-interpolada-prova.js` — gaiola-interpolada-prova.js — a forma de prova da gaiola interpolada, desenhada só por código
- `gaiola-por-estacoes-prova.js` — gaiola-por-estacoes-prova.js — a forma de prova da gaiola por estações, desenhada só por código
- `gaiola-por-rede-prova.js` — gaiola-por-rede-prova.js — a chapa lateral desenhada por código para a prova da gaiola por rede de curvas
- `medidas-de-malha.js` — medidas-de-malha.js — medidas de teste sobre malha poligonal por índice, sem Three.js: área, volume com sinal, distância de pontos a triângulos e cruzamento …

## procedural/nucleo/operacoes/

- `arestas-em-cadeia.js` — arestas-em-cadeia.js — arredondar de uma vez a cadeia de arestas que continua em tangência a partir da escolhida.
- `arestas-em-grupos.js` — arestas-em-grupos.js — arredondar ou chanfrar uma aresta cujo lado é uma face PARTIDA em várias coplanares.
- `arranja-contrato.test.ts` — arranja-contrato.test.ts — o que a op `arranja` PROMETE no comentário e não estava afirmado em lugar nenhum.
- `arredondar-aresta.test.ts` — arredondar-aresta.test.ts — contrato de aceitação do Escopo A do filete v2. Escrito antes da op: uma aresta simples de cubo ganha uma faixa de arco com vário…
- `arredondar-cadeia.test.ts` — arredondar-cadeia.test.ts — `arredondarAresta` com `cadeia`: a aresta escolhida e as que continuam em tangência a partir dela, arredondadas como uma varredur…
- `arredondar-canto.test.ts` — arredondar-canto.test.ts — o vértice onde duas ou três arestas arredondadas (ou chanfradas) se encontram.
- `arredondar-chapa-furada.test.ts` — arredondar-chapa-furada.test.ts — as três recusas que sobravam ao arredondar as arestas de uma chapa de 6 mm com furos oblongos.
- `arredondar-costura-convexa.test.ts` — arredondar-costura-convexa.test.ts — fatia 7b do plano "União de sólidos": o `arredondarCostura` arredonda também a borda CONVEXA de uma booleana (a beira do…
- `arredondar-costura.test.ts` — arredondar-costura.test.ts — fatia 4 do plano "União de sólidos": o encontro côncavo de uma união é arredondado com raio declarado, e o `liso` com ângulo não…
- `arredondar-tampa-partida.test.ts` — arredondar-tampa-partida.test.ts — arredondarAresta e filete numa aresta cujo lado é uma tampa partida.
- `atributos.js` — atributos.js — operações do grupo, isoladas por serviços explícitos do núcleo.
- `aviso-de-degrau.test.ts` — aviso-de-degrau.test.ts — o arredondamento que termina em degrau não passa mais calado.
- `booleana-casca-raspada.test.ts` — booleana-casca-raspada.test.ts — o canto solto que a booleana deixava quando o corte cruza a casca de um loft (achado na rodada das asas do avião, em 2026-10…
- `booleanas-carga.test.ts` — booleanas-carga.test.ts — fatia 5 do plano "União de sólidos". O núcleo carrega a Manifold sozinho, por await no topo de `manifold.js`: quem só importa a fac…
- `booleanas-revisao-2.test.ts` — booleanas-revisao-2.test.ts — regressões da segunda revisão adversarial das booleanas (2026-09-29): tolerâncias que dependiam da posição, costura mista que s…
- `booleanas.js` — booleanas.js — `unir`, `subtrair` e `intersectar`: dois ou mais SÓLIDOS fechados viram uma superfície fechada só, sem face interna.
- `booleanas.test.ts` — booleanas.test.ts — fatias 1 a 3 do plano "União de sólidos" (docs/mecanifica/planos/encerrados/2026-09-28-uniao-de-solidos.md). A fixture é neutra: dois cub…
- `cantos-arredondados.js` — cantos-arredondados.js — o remate do vértice onde duas ou três arestas arredondadas (ou chanfradas) se encontram.
- `edicao-direta.js` — edicao-direta.js — edições locais por identidade, via serviços explícitos do núcleo.
- `encostar.test.ts` — encostar.test.ts — contato derivado no lugar de coordenada digitada (A-6).
- `estouro-de-bloco.test.ts` — estouro-de-bloco.test.ts — nenhum passo que passa de BLOCO ids lança erro: espelha, arranja, furo e os geradores com lados:{desvio} continuam na faixa estend…
- `estruturais.js` — estruturais.js — operações do grupo, isoladas por serviços explícitos do núcleo.
- `extrusao-de-perfil.test.ts` — extrusao-de-perfil.test.ts — `extrusao` e o `lathe` com `furos` e `deslocar`: perfil 2D com furo e deslocamento de contorno, levantado ou revolucionado em só…
- `friso.js` — friso.js (operação) — nervura, tubo ou friso que segue uma linha nomeada, com perfil declarado. A linha é uma sequência de pontos nomeados da gaiola de um pa…
- `furo-raio-por-grupo.test.ts` — furo-raio-por-grupo.test.ts — contrato da F1: cada grupo de centros pode declarar raio e, em furo cego, profundidade próprios, e receber um nome semântico pa…
- `geradores-avancados.js` — geradores-avancados.js — operações do grupo, isoladas por serviços explícitos do núcleo.
- `lathe-fechado.test.ts` — lathe-fechado.test.ts — perfil que dá a volta e fecha de verdade.
- `loft-fechado.test.ts` — loft-fechado.test.ts — caminho que volta em si e fecha de verdade.
- `nome-de-copia.test.ts` — nome-de-copia.test.ts — endereço de autor para as cópias do `arranja`.
- `perfis.js` — perfis.js — `extrusao`: um perfil 2D com furos e deslocamento de contorno vira um sólido prismático.
- `primitivas-basicas.js` — primitivas-basicas.js — geradores fundamentais registrados pelo núcleo, sem estado global.
- `primitivas-superficie.js` — primitivas-superficie.js — primitivas fechadas que recebem serviços explícitos do núcleo.
- `subdivisao.js` — subdivisao.js (operação) — gera uma superfície Catmull-Clark com vincos a partir de uma gaiola declarada. A geometria sai de `procedural/nucleo/subdivisao.js…
- `transformacoes.js` — transformacoes.js — operações do grupo, isoladas por serviços explícitos do núcleo.
- `triangulacao-sem-leque.test.ts` — triangulacao-sem-leque.test.ts — face plana grande (tampa de superelipse, pedaço de união) não sai em leque: grau máximo por canto e ângulo mínimo dos triâng…
- `uniao-lateral-rente.test.ts` — uniao-lateral-rente.test.ts — `unir` com laterais coplanares (rentes). Caso do ombro do braço robótico: coluna e braço com a MESMA meia largura. A saída tem …

## procedural/pecas/ambulancia/

- `receita.js` — ambulancia — ambulância estilizada: cabine de picape na frente e baú alto, mais largo e mais alto, atrás. O baú é branco com faixa vermelha e faixa cinza, te…

## procedural/pecas/ambulancia/referencias/

- `alvo.md` — Alvo: ambulancia

## procedural/pecas/aviao/

- `ALINHAMENTO.md` — Avião de pequeno porte — o objeto no núcleo

## procedural/pecas/aviao/partes/asas/

- `receita.js` — aviao/asas — as duas metades da asa do avião de pequeno porte, com a ponta levantada e arredondada, os flaps, os ailerons, os eixos deles, os suportes e a ca…

## procedural/pecas/aviao/partes/asas/rodadas/

- `receita-01.js` — aviao/asas — as duas metades da asa do avião de pequeno porte, com a ponta levantada, os flaps, os ailerons, os eixos deles e os suportes, na pose de pouso, …
- `receita-02.js` — aviao/asas — as duas metades da asa do avião de pequeno porte, com a ponta levantada e arredondada, os flaps, os ailerons, os eixos deles, os suportes e a ca…
- `receita-03.js` — aviao/asas — as duas metades da asa do avião de pequeno porte, com a ponta levantada e arredondada, os flaps, os ailerons, os eixos deles, os suportes e a ca…

## procedural/pecas/aviao/partes/empenagem-horizontal/

- `receita.js` — aviao/empenagem-horizontal — as duas metades do estabilizador do avião de pequeno porte, com os profundores, os eixos deles e os suportes, na pose de pouso, …

## procedural/pecas/aviao/partes/empenagem-horizontal/rodadas/

- `receita-01.js` — aviao/empenagem-horizontal — as duas metades do estabilizador do avião de pequeno porte, com os profundores, os eixos deles e os suportes, na pose de pouso, …
- `receita-02.js` — aviao/empenagem-horizontal — as duas metades do estabilizador do avião de pequeno porte, com os profundores, os eixos deles e os suportes, na pose de pouso, …
- `receita-03.js` — aviao/empenagem-horizontal — as duas metades do estabilizador do avião de pequeno porte, com os profundores, os eixos deles e os suportes, na pose de pouso, …
- `receita-04.js` — aviao/empenagem-horizontal — as duas metades do estabilizador do avião de pequeno porte, com os profundores, os eixos deles e os suportes, na pose de pouso, …

## procedural/pecas/aviao/partes/empenagem-vertical/

- `receita.js` — aviao/empenagem-vertical — a deriva do avião de pequeno porte, com a dorsal, o leme, o eixo dele e as dobradiças, na pose de pouso, com o leme neutro.

## procedural/pecas/aviao/partes/empenagem-vertical/rodadas/

- `receita-01.js` — aviao/empenagem-vertical — a deriva do avião de pequeno porte, com a dorsal, o leme, o eixo dele e as dobradiças, na pose de pouso, com o leme neutro.
- `receita-02.js` — aviao/empenagem-vertical — a deriva do avião de pequeno porte, com a dorsal, o leme, o eixo dele e as dobradiças, na pose de pouso, com o leme neutro.
- `receita-03.js` — aviao/empenagem-vertical — a deriva do avião de pequeno porte, com a dorsal, o leme, o eixo dele e as dobradiças, na pose de pouso, com o leme neutro.
- `receita-04.js` — aviao/empenagem-vertical — a deriva do avião de pequeno porte, com a dorsal, o leme, o eixo dele e as dobradiças, na pose de pouso, com o leme neutro.

## procedural/pecas/aviao/partes/fuselagem/

- `receita.js` — aviao/fuselagem — o casco do avião de pequeno porte, com o para-brisa rente e o montante dele, as oito janelas, a porta traseira e a barbatana ventral.

## procedural/pecas/aviao/partes/fuselagem/rodadas/

- `receita-01.js` — aviao/fuselagem — o casco do avião de pequeno porte, com o para-brisa e o montante, as oito janelas, a porta traseira e a barbatana ventral.
- `receita-02.js` — aviao/fuselagem — o casco do avião de pequeno porte, com o para-brisa e o montante, as oito janelas, a porta traseira e a barbatana ventral.
- `receita-03.js` — aviao/fuselagem — o casco do avião de pequeno porte, com o para-brisa rente e o montante dele, as oito janelas, a porta traseira e a barbatana ventral.

## procedural/pecas/aviao/partes/helice/

- `receita.js` — aviao/helice — o cone e as cinco pás da hélice do avião de pequeno porte, parada na pose do esboço.

## procedural/pecas/aviao/partes/helice/rodadas/

- `receita-01.js` — aviao/helice — o cone e as cinco pás da hélice do avião de pequeno porte, parada na pose do esboço.

## procedural/pecas/aviao/partes/motor/

- `receita.js` — aviao/motor — o capô do motor do avião de pequeno porte, com a entrada de ar sob ele e os dois escapes laterais.

## procedural/pecas/aviao/partes/motor/rodadas/

- `receita-01.js` — aviao/motor — o capô do motor do avião de pequeno porte, com a entrada de ar sob ele e os dois escapes laterais.
- `receita-02.js` — aviao/motor — o capô do motor do avião de pequeno porte, com a entrada de ar sob ele e os dois escapes laterais.

## procedural/pecas/aviao/partes/trem-do-nariz/

- `receita.js` — aviao/trem-do-nariz — o trem do nariz do avião de pequeno porte baixado, na pose de pouso: a carenagem, o pivô e os mancais, a alavanca e o atuador, o compas…

## procedural/pecas/aviao/partes/trem-do-nariz/rodadas/

- `receita-01.js` — aviao/trem-do-nariz — o trem do nariz do avião de pequeno porte baixado, na pose de pouso: a carenagem, o pivô e os mancais, a alavanca e o atuador, o compas…
- `receita-02.js` — aviao/trem-do-nariz — o trem do nariz do avião de pequeno porte baixado, na pose de pouso: a carenagem, o pivô e os mancais, a alavanca e o atuador, o compas…
- `receita-03.js` — aviao/trem-do-nariz — o trem do nariz do avião de pequeno porte baixado, na pose de pouso: a carenagem, o pivô e os mancais, a alavanca e o atuador, o compas…

## procedural/pecas/aviao/partes/trens-principais/

- `receita.js` — aviao/trens-principais — os dois trens principais do avião de pequeno porte baixados, na pose de pouso: em cada um a perna, o pino do pivô, a coroa, o garfo …

## procedural/pecas/aviao/partes/trens-principais/rodadas/

- `receita-01.js` — aviao/trens-principais — os dois trens principais do avião de pequeno porte baixados, na pose de pouso: em cada um a perna, o pino do pivô, a coroa, o garfo …
- `receita-02.js` — aviao/trens-principais — os dois trens principais do avião de pequeno porte baixados, na pose de pouso: em cada um a perna, o pino do pivô, a coroa, o garfo …

## procedural/pecas/balcao-de-bar/

- `receita.js` — balcao-de-bar — balcão de bar de madeira: corpo fechado por duas portas de frente, cada uma com moldura, rodapé, tampo que avança sobre o corpo e dois puxado…

## procedural/pecas/balcao-de-bar-escuro/

- `receita.js` — balcao-de-bar-escuro — balcão de bar de madeira escura: corpo fechado por duas portas de frente, rodapé recuado, tampo que avança sobre o corpo e dois puxado…

## procedural/pecas/balcao-de-bar-escuro/referencias/

- `alvo.md` — Alvo do balcão de bar escuro

## procedural/pecas/balcao-de-bar/referencias/

- `alvo.md` — Alvo do balcão de bar

## procedural/pecas/balcao-em-l/

- `receita.js` — balcao-em-l — balcão de canto em L, como uma peça só por camada: o contorno em L de seis pontos é desenhado uma vez por camada e extrudado na vertical com `e…

## procedural/pecas/balcao-em-l/referencias/

- `alvo.md` — Alvo do balcão em L

## procedural/pecas/balcao-liso/

- `receita.js` — balcao-liso — balcão liso de três partes: um rodapé no chão, um corpo sobre ele e um tampo sobre o corpo, todos caixas retas sem chanfro.

## procedural/pecas/balcao-liso/referencias/

- `alvo.md` — Alvo do balcão liso

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

## procedural/pecas/caminhao-bombeiro/

- `receita.js` — caminhao-bombeiro — caminhão de bombeiros estilizado: cabine vermelha curta e baixa na frente, com para-brisa e vidro lateral azul claros, faróis amarelos, t…

## procedural/pecas/caminhao-bombeiro/referencias/

- `alvo.md` — Alvo: caminhao-bombeiro

## procedural/pecas/caminhao-entrega/

- `receita.js` — caminhao-entrega — caminhão de entrega estilizado: cabine curta e alta, de lavanda clara, na frente, baú verde alto e mais largo atrás, com uma escotilha no …

## procedural/pecas/caminhao-entrega-aberto/

- `receita.js` — caminhao-entrega-aberto — caminhão de entrega de brinquedo de plataforma aberta: cabine curta e afunilada, capô e lados baixos laranja, cabine e teto laranja…

## procedural/pecas/caminhao-entrega-aberto/referencias/

- `alvo.md` — Alvo: caminhao-entrega-aberto

## procedural/pecas/caminhao-entrega/referencias/

- `alvo.md` — Alvo: caminhao-entrega

## procedural/pecas/caminhao-lixo/

- `receita.js` — caminhao-lixo — caminhão de coleta de lixo de brinquedo: cabine curta de capô claro e teto verde na frente, caçamba compactadora verde de topo aberto, com a …

## procedural/pecas/caminhao-lixo/referencias/

- `alvo.md` — Alvo: caminhao-lixo

## procedural/pecas/carenagem-de-prova/

- `receita.js` — carenagem-de-prova — meia carenagem de chapa desenhada só por código, a peça de prova da superfície por subdivisão.
- `receita.test.mjs` — receita.test.mjs — a carenagem de prova da superfície por subdivisão: a receita só endereça a gaiola por nome, cada cota medida da TABELA é vértice da malha …

## procedural/pecas/carenagem-de-prova/referencias/

- `alvo.md` — Alvo da carenagem de prova

## procedural/pecas/carro-corrida/

- `receita.js` — carro-corrida — carro de corrida de rodas descobertas, estilizado: monocoque laranja estreito e longo, nariz que sobe até o cockpit, asa dianteira cinza com …

## procedural/pecas/carro-corrida-futurista/

- `receita.js` — carro-corrida-futurista — carro de corrida de rodas descobertas, azul, baixo e comprido, com monocoque estreito de nariz em rampa, bico e asa dianteira cinza…

## procedural/pecas/carro-corrida-futurista/referencias/

- `alvo.md` — Alvo: carro-corrida-futurista

## procedural/pecas/carro-corrida/referencias/

- `alvo.md` — Alvo: carro-corrida

## procedural/pecas/carro-esportivo-hatch/

- `receita.js` — carro-esportivo-hatch — hatch esportivo estilizado, verde, baixo e comprido, com capô em rampa, teto reto até um aerofólio cinza na ponta do teto, traseira e…

## procedural/pecas/carro-esportivo-hatch/referencias/

- `alvo.md` — Alvo: carro-esportivo-hatch

## procedural/pecas/carro-esportivo-sedan/

- `receita.js` — carro-esportivo-sedan — sedã esportivo estilizado, laranja, baixo e longo, de cabine rebaixada e afunilada, nariz inclinado com faróis amarelos sobre o capô,…

## procedural/pecas/carro-esportivo-sedan/referencias/

- `alvo.md` — Alvo: carro-esportivo-sedan

## procedural/pecas/carro-perua/

- `receita.js` — carro-perua — perua (station wagon) de facetas retas: capô baixo e inclinado, para-brisa em rampa, teto longo e quase plano até uma traseira curta e vertical…

## procedural/pecas/carro-perua/referencias/

- `alvo.md` — Alvo da perua

## procedural/pecas/carro-policia/

- `receita.js` — carro-policia — viatura estilizada de brinquedo: carroceria azul acinzentada com as portas claras, anéis de para-lama e soleira lavanda, cabine que afunila c…

## procedural/pecas/carro-policia/referencias/

- `alvo.md` — Alvo: carro-policia

## procedural/pecas/carro-sedan-angular/

- `receita.js` — carro-sedan-angular — sedã de faces retas e angulares, recriado em primitivas do núcleo a partir do modelo "Sedan" do pacote D.

## procedural/pecas/carro-sedan-angular/referencias/

- `alvo.md` — Alvo: carro-sedan-angular

## procedural/pecas/carro-sedan-classico/

- `receita.js` — carro-sedan-classico — sedã de caixa dos anos 80, vermelho, de cabine longa e estufa afunilada, com capô de tomada de ar, para-lamas em volta dos arcos das r…

## procedural/pecas/carro-sedan-classico/referencias/

- `alvo.md` — Alvo: pacote B

## procedural/pecas/carro-sedan-compacto/

- `receita.js` — carro-sedan-compacto — sedã compacto estilizado, de carroceria vermelha, cabine curta e alta, vidros azul claros, para-lamas salientes em volta das rodas, ro…

## procedural/pecas/carro-sedan-compacto/referencias/

- `alvo.md` — Alvo: carro-sedan-compacto

## procedural/pecas/carro-suv/

- `receita.js` — carro-suv — SUV de brinquedo, verde, de teto e traseira cinza em caixa alta, estufa que afunila, frente alta com grade rebaixada e faróis redondos, para-lama…

## procedural/pecas/carro-suv-luxo/

- `receita.js` — carro-suv-luxo — SUV de brinquedo, de carroceria laranja de uma cor, teto longo e quase plano com teto solar, para-brisa em rampa, estufa que afunila para de…

## procedural/pecas/carro-suv-luxo/referencias/

- `alvo.md` — carro-suv-luxo — alvo

## procedural/pecas/carro-suv/referencias/

- `alvo.md` — Alvo: carro-suv

## procedural/pecas/carro-taxi/

- `receita.js` — carro-taxi — táxi estilizado, amarelo, de frente alta e vertical, chassi cinza mais largo que a carroceria, para-lamas em cápsula em volta das rodas, cabine …

## procedural/pecas/carro-taxi/referencias/

- `alvo.md` — Alvo: carro-taxi

## procedural/pecas/freezer-horizontal/

- `receita.js` — freezer-horizontal — freezer horizontal de tampo: corpo branco sobre o chão, junta escura que cobre o topo do corpo, tampo arredondado assentado sobre a junt…

## procedural/pecas/freezer-horizontal/referencias/

- `alvo.md` — Alvo do freezer horizontal

## procedural/pecas/furgao/

- `receita.js` — furgao — furgão (van) estilizado, azul, de volume único alto e longo, capô curto inclinado, para-brisa grande, cabine que afunila para o teto, painel de teto…

## procedural/pecas/furgao/referencias/

- `alvo.md` — Alvo: furgao

## procedural/pecas/geladeira-compacta-branca/

- `receita.js` — geladeira-compacta-branca — frigobar alto de uma porta, todo branco: gabinete de cantos levemente arredondados, porta de placa com as bordas arredondadas, um…

## procedural/pecas/geladeira-compacta-branca/referencias/

- `alvo.md` — Alvo: geladeira compacta branca

## procedural/pecas/jipe-aberto/

- `receita.js` — jipe-aberto — jipe aberto de poucos polígonos: banheira verde baixa sem teto nem portas, para-brisa inclinado com moldura e vidro, arco de segurança em barra…

## procedural/pecas/jipe-aberto/referencias/

- `alvo.md` — Alvo do jipe-aberto

## procedural/pecas/lava-loucas-compacta-branca/

- `receita.js` — lava-loucas-compacta-branca — lava-louças compacta branca de embutir sob bancada, com caixa branca, painel de controle na faixa de cima da frente, porta, pux…

## procedural/pecas/lava-loucas-compacta-branca/referencias/

- `alvo.md` — Alvo: lava-louças compacta branca

## procedural/pecas/lavadora-secadora-branca/

- `receita.js` — lavadora-secadora-branca — lavadora e secadora de roupa branca de porta frontal: caixa branca com um rebaixo na frente-topo que guarda o painel escuro (com a…

## procedural/pecas/lavadora-secadora-branca/referencias/

- `alvo.md` — Alvo: lavadora e secadora branca de porta frontal

## procedural/pecas/mesa-quadrada-escura/

- `receita.js` — mesa-quadrada-escura — mesa quadrada de madeira escura: tampo de 980 por 980 mm, quatro pés de 80 mm, quatro saias sob o tampo e oito cantoneiras de reforço …

## procedural/pecas/mesa-quadrada-escura/referencias/

- `alvo.md` — Alvo da mesa quadrada escura

## procedural/pecas/micro-ondas-branco/

- `receita.js` — micro-ondas-branco — micro-ondas de bancada: corpo de metal claro sobre uma base escura, porta com janela à esquerda, painel detalhado em coluna alta à direi…

## procedural/pecas/micro-ondas-branco/referencias/

- `alvo.md` — Alvo do micro-ondas branco

## procedural/pecas/onibus-rodoviario/

- `receita.js` — onibus-rodoviario — ônibus de viagem de 12 m, de carroceria branca, fileira de nove vidros escuros com colunas finas, para-brisa grande de frente quase verti…

## procedural/pecas/onibus-rodoviario/referencias/

- `alvo.md` — alvo: onibus-rodoviario

## procedural/pecas/onibus-urbano/

- `receita.js` — onibus-urbano — ônibus urbano de 11,5 m de comprimento e 3,68 m de altura, de carroceria verde com a fileira de seis janelas por lado, a frente de vidro que …

## procedural/pecas/onibus-urbano/referencias/

- `alvo.md` — Alvo: ônibus urbano

## procedural/pecas/picape-angular/

- `receita.js` — picape-angular — picape de cabine afunilada e caçamba aberta (fundo, paredes laterais e tampa traseira), com santantônio atrás da cabine, para-choques de bar…

## procedural/pecas/picape-angular/referencias/

- `alvo.md` — Alvo: picape-angular

## procedural/pecas/picape-compacta/

- `receita.js` — picape-compacta — picape de brinquedo, de carroceria verde, cabine curta e afunilada na frente, caçamba aberta atrás de paredes grossas, chassi cinza mais la…

## procedural/pecas/picape-compacta/referencias/

- `alvo.md` — Alvo: picape-compacta

## procedural/pecas/picape-plataforma/

- `receita.js` — picape-plataforma — picape de brinquedo de cabine curta e afunilada, cinza claro, com vidros azul claros, caçamba rasa de borda larga e piso escuro, aletas e…

## procedural/pecas/picape-plataforma/referencias/

- `alvo.md` — Alvo: picape-plataforma

## procedural/pecas/poltrona-moderna-branca/

- `receita.js` — poltrona-moderna-branca — poltrona de estofado com dois braços, assento e encosto sobre uma base, com quatro pés de madeira.

## procedural/pecas/poltrona-moderna-branca/referencias/

- `alvo.md` — Alvo da poltrona moderna branca

## procedural/pecas/poltrona-vime-azul/

- `receita.js` — poltrona-vime-azul — poltrona de vime sobre quatro pés, com base de vime, dois braços, encosto de vime, almofada de assento e almofada de encosto girada para…

## procedural/pecas/poltrona-vime-azul/referencias/

- `alvo.md` — Alvo da poltrona de vime

## procedural/pecas/poltrona-vime-roxa/

- `receita.js` — poltrona-vime-roxa — poltrona de vime com base baixa, braços, encosto alto de vime e duas almofadas de tecido: a do assento e a do encosto, esta girada 12 gr…

## procedural/pecas/poltrona-vime-roxa/referencias/

- `alvo.md` — Alvo da poltrona de vime

## procedural/pecas/suporte-tubo/

- `receita.js` — suporte-tubo — suporte em L de chapa grossa que prende um tubo de 30 mm a uma parede.

## procedural/pecas/suporte-tubo/referencias/

- `alvo.md` — Alvo do suporte-tubo

## procedural/pecas/trator/

- `receita.js` — trator — trator de brinquedo de capô laranja, estreito e longo, cabine alta de vidros azul claros e teto saliente sobre as rodas traseiras, que são muito mai…

## procedural/pecas/trator-pa/

- `receita.js` — trator-pa — trator de brinquedo verde com pá frontal: rodas traseiras grandes e dianteiras pequenas (pneu escuro, aro laranja, cubo cinza), capô verde estrei…

## procedural/pecas/trator-pa/referencias/

- `alvo.md` — Alvo: trator-pa

## procedural/pecas/trator-sirene/

- `receita.js` — trator-sirene — trator de brinquedo da viatura: capô estreito e branco, cabine alta de vidro com teto branco saliente e barra de sirene azul, preta e vermelh…

## procedural/pecas/trator-sirene/referencias/

- `alvo.md` — Alvo: trator-sirene

## procedural/pecas/trator/referencias/

- `alvo.md` — trator — alvo

## procedural/servicos/

- `descoberta.js` — descoberta.js — porta neutra de descoberta procedural; sem I/O, MCP ou visor.

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
- `apoio-no-chao.js` — apoio no chão — serviço neutro, sem Three.js.
- `apoio-no-chao.test.mjs` — O apoio no chão é medido sobre a malha resolvida: a instância declarada toca o plano do chão dentro da tolerância e nenhuma outra passa abaixo dele. Os cubos…
- `assinatura-geometria.js` — Compatibilidade da autoria: a implementação portátil vive junto ao núcleo.
- `auditar-intersecoes-montagem.js` — auditoria de interseções de montagem — serviço neutro, sem Three.js.
- `auditar-intersecoes-montagem.test.mjs` — A expectativa da montagem passou a JULGAR: par que se toque fora da lista sai em `naoDeclarados`. Estes testes montam uma montagem sintética de dois cubos, p…
- `base-forma-global.js` — Base comum da forma global N2: o erro com código e caminho, e as duas verificações de estrutura que todo normalizador usa. Fica à parte para que o contrato (…
- `calibracao-do-critico.js` — calibracao-do-critico.js — o formato `mecanifica.calibracao-do-critico@1`: o conjunto de imagens com defeito conhecido em que o crítico visual é medido.
- `calibracao-do-critico.test.js` — calibracao-do-critico.test.js — o formato do conjunto de calibração do crítico: o que ele aceita e o que recusa.
- `caminho-simetrico.js` — caminho-simetrico.js — utilitário declarativo para construção de caminhos bilaterais simétricos para a primitiva `loft` no motor procedural do Modelar.
- `caminho-simetrico.test.mjs` — caminho-simetrico.test.mjs — testes unitários para a função criarCaminhoSimetrico.
- `catalogo-pecas.js` — catalogo-pecas.js — contrato explícito da lista que uma aplicação pode publicar. O catálogo é dado de aplicação; o núcleo e os validadores recebem receitas d…
- `chamar-familia.js` — chamar-familia.js — a porta de entrada de uma família: `chamar(familia, id, parametros)`.
- `chamar-familia.test.js` — chamar-familia.test.js — `definirFamilia` e `chamar` sobre a família de prova: o que o `derivar` recebe e o que ele pode devolver. As recusas dos parâmetros …
- `conferir-articulacao.js` — conferir-articulacao — o curso de uma articulação declarada, conferido contra as malhas de uma montagem resolvida. Serviço neutro, sem Three.js.
- `conferir-articulacao.test.mjs` — conferir-articulacao.test.mjs — o curso de uma articulação declarada é amostrado e medido contra as peças que ficam. Montagem sintética de caixas e cilindros…
- `consultar-impacto-global.js` — consultar-impacto-global.js — consulta direcionada sobre o mapa v1.
- `contato-de-solidos-em-milimetro.test.mjs` — contato-de-solidos-em-milimetro.test.mjs — o contato de sólidos numa peça de milímetros (a metro por unidade). Três tolerâncias absolutas do módulo deixavam …
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
- `familia-esboco.js` — familia-esboco.js — a conferência entre a família e o componente do esboço de mesmo nome (núcleo, sem disco).
- `familia-esboco.test.js` — familia-esboco.test.js — a parte pura da conferência da família com o esboço: a dispensa, os três pontos, o esboço mínimo, o mapa de parâmetros e os achados …
- `familia.js` — familia.js — o contrato `mecanifica.familia@1` e o validador, puros e sem nenhum import.
- `familia.test.js` — familia.test.js — o contrato `mecanifica.familia@1`: a fixture válida passa, cada defeito é recusado com o campo, o valor e o que é aceito, e a leitura norma…
- `forma-da-parte.js` — forma-da-parte — a peça saiu com a forma que a receita prometeu?
- `forma-da-parte.test.mjs` — forma-da-parte.test.mjs — a promessa de forma só vale se ela reprovar.
- `forma-do-esboco.js` — forma-do-esboco.js — a forma de cada parte da receita contra a forma do esboço que ela refina, pela sobreposição de volume.
- `forma-do-esboco.test.js` — forma-do-esboco.test.js — a forma de cada parte da receita contra a forma do esboço, pela razão interseção/união de volume. O esboço é sintético e escrito à …
- `forma-global-casco.test.mjs` — Orientação da malha do casco por seções na forma global N2. Para cada combinação de eixo de percurso, ordem dos eixos da seção e sentido do contorno (doze no…
- `forma-global-prisma.test.mjs` — Orientação da malha do prisma na forma global N2. Para cada combinação de eixo de extrusão, ordem dos eixos do perfil e sentido do contorno (doze no total), …
- `forma-global.js` — Contrato e executor neutros da N2. A fonte é um andaime de volumes semânticos; a malha e as projeções são produtos derivados sem identidade. Este módulo não …
- `fresta-e-porta-ocupada.test.js` — fresta-e-porta-ocupada.test.js — duas coisas que a montagem deixava passar em silêncio: fresta entre faces apoiadas e duas partes na mesma porta.
- `g01-do-andaime.js` — G01 sobre o andaime derivado do esboço e sobre a malha da peça. O gate (`avaliarFormaGlobal`) compara um alvo N2 com uma blocagem: envelope, landmarks, regiõ…
- `hierarquia-partes.js` — hierarquia-partes.js — consultas puras e determinísticas da árvore semântica. Não conhece Three.js, geometria ou domínio mecânico.
- `intencao-peca.js` — intencao-peca.js — contrato opcional, semântico e neutro de uma receita.
- `interfaces-montagem.js` — interfaces-montagem.js — resolve portas declaradas por peças, mede relações mecânicas e deriva poses sem Three.js, hierarquia ou solver. É o contrato mínimo …
- `laco-de-modelagem.js` — laco-de-modelagem.js — quem decide se a modelagem continua, e por quê.
- `laco-de-modelagem.test.js` — laco-de-modelagem.test.js — a decisão de parar sai dos números, não de quem modelou.
- `ler-montagem-persistida.js` — ler-montagem-persistida.js — leitor/validador fail-closed da montagem v1 a v5.
- `ler-peca-resolvida.js` — ler-peca-resolvida.js — a metade LEITORA do formato `mecanifica.peca-resolvida`.
- `ler-peca-resolvida.test.js` — ler-peca-resolvida.test.js — o que o leitor devolve de cada face.
- `ler-universo-autoria.js` — ler-universo-autoria.js — contrato e prova estrutural do universo v1.
- `mapa-parte-passo.js` — mapa-parte-passo.js — qual passo da receita constrói qual parte.
- `mapa-parte-passo.test.js` — mapa-parte-passo.test.js — o mapa acha o passo que constrói cada parte.
- `material-da-peca.js` — material-da-peca.js — tudo que pertence a uma peça, e onde está hoje.
- `medidas-na-blocagem.js` — Medidas do `plano.medidas` do esboço lidas na blocagem do nível zero. O esboço mede cada medida declarada sobre as próprias formas (a caixa que envolve as fo…
- `medidas-na-blocagem.test.js` — As medidas do plano lidas na blocagem do nível zero, sobre formas resolvidas escritas à mão (sem o módulo do esboço): a caixa de um eixo e a distância entre …
- `medir-blocagem-nivel-zero.js` — Medida sobre a blocagem N2 de um andaime: compila com um alvo largo (que só serve para o orçamento e o contexto não atrapalharem) e mede, por volume, o volum…
- `origem-de-parametro.js` — origem-de-parametro.js — de onde veio cada número da tabela.
- `origem-de-parametro.test.js` — origem-de-parametro.test.js — a regra que impede a rodada de absorção de inventar número para fechar a conta.
- `parametros-declarados.js` — parametros-declarados.js — a pergunta única: quais números desta receita alguém pode mexer, e qual é o valor de cada um agora.
- `parametros-declarados.test.js` — parametros-declarados.test.js — a pergunta única não adivinha.
- `parametros-vivos.js` — parametros-vivos.js — separa liberdade DECLARADA de liberdade REAL.
- `perguntas-do-critico.js` — perguntas-do-critico.js — as perguntas de forma que o brief do crítico traz depois das cinco fixas.
- `perguntas-do-critico.test.js` — perguntas-do-critico.test.js — o validador das perguntas de forma, o arquivo de critérios por família de objeto com a condição por pergunta, o teto com recus…
- `plano-de-modelagem.js` — plano-de-modelagem.js — o que a peça PROMETE ser, escrito antes da geometria.
- `plano-de-modelagem.test.js` — plano-de-modelagem.test.js — o contrato do que a peça promete ser.
- `porta-confere-forma.js` — porta-confere-forma.js — a porta que a receita declara está na forma da peça.
- `porta-confere-forma.test.js` — porta-confere-forma.test.js — a porta no lugar passa, a porta deslocada do plano e a de raio errado reprovam, e as portas das partes fixas do braço passam.
- `porta-na-chapa-dobrada.test.js` — porta-na-chapa-dobrada.test.js — a porta de uma peça de chapa dobrada sai da origem da chapa: o plano sobre uma aba e o anel e o cilindro sobre um rolo de 27…
- `portas-estendidas.test.js` — portas-estendidas.test.js — suíte de testes completa para portas estendidas do núcleo: plano de apoio, padrão de furos, trilho e classes de ajuste.
- `posicao-por-porta.js` — posicao-por-porta.js — a pose de uma instância derivada do encaixe de uma porta dela numa porta de outra instância já construída.
- `primitivas-forma-global.js` — Primitivas do nível zero na forma global N2: cone (com tronco), esfera, anel, revolução de perfil, extrusão de perfil côncavo e tubo por pontos com raio de c…
- `protocolo-revalidacao.js` — protocolo-revalidacao.js — contrato puro da R00, sem persistência ou efeitos.
- `razoes-da-peca.js` — razoes-da-peca.js — as razões que a receita declara, medidas na malha da peça executada.
- `razoes-da-peca.test.js` — razoes-da-peca.test.js — as razões que a receita declara, medidas na malha da peça executada: a picape de altura 0,29 do comprimento fora da faixa [0,30, 0,4…
- `refinamento-global.js` — refinamento-global.js — a receita detalhada refina um andaime da forma global N2.
- `refinamento-global.test.js` — refinamento-global.test.js — a declaração REFINA, as portas do andaime e a conferência contra a peça executada.
- `regua-de-portas.js` — regua-de-portas.js — a conta das portas, pura e sem nenhum import.
- `regua-de-portas.test.js` — regua-de-portas.test.js — a conta das portas que o núcleo e o gate de contato do esboço dividem.
- `resolver-montagem-persistida.js` — resolver-montagem-persistida.js — resolve instâncias de peças sem acesso a arquivo.
- `separacao-direcional.js` — separacao-direcional.js — mede intervalos projetados sem alegar colisão geral.
- `snapshot-universo-autoria.js` — snapshot-universo-autoria.js — leitura consistente do universo de autoria.
- `solido-do-esboco.js` — solido-do-esboco.js — o sólido exato de uma forma do esboço, em milímetro, como volume que a Manifold subtrai e interseta.
- `solido-do-esboco.test.js` — solido-do-esboco.test.js — o sólido exato de uma forma do esboço, a partir de formas escritas à mão no formato de `formasResolvidas`. Cada caso tem o volume …
- `topologia-da-malha.js` — topologia-da-malha.js — extrudar, duplicar, apagar e criar face.
- `topologia-da-malha.test.js` — topologia-da-malha.test.js — as operações que mudam a malha, medidas na peça de prova: quantas faces e vértices nascem, quem some, e o que fica no lugar. A p…
- `tradutor-nivel-zero.js` — Tradutor do nível zero: lê as formas resolvidas do esboço (`mecanifica.formas-resolvidas@1`, dado puro) e gera o andaime da forma global N2 (`mecanifica.anda…
- `tradutor-nivel-zero.test.js` — O tradutor do nível zero sobre formas resolvidas escritas à mão (sem o módulo do esboço): cada tipo exato com a geometria que o andaime tem de dar, a rotação…
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

- `README.md` — tools/ — ferramentas do Modelar e do núcleo herdado
- `gates.mjs` — gates.mjs — roda TODOS os gates e relata TODOS, em vez de parar no primeiro.
- `testes-lentos.mjs` — testes-lentos.mjs — a lista dos arquivos de teste que saem da bateria padrão, e o comando que roda cada uma das duas.
- `testes-lentos.test.mjs` — testes-lentos.test.mjs — a lista dos lentos aponta para arquivos que existem, e a bateria dos lentos roda todos onde precisa.
- `vitest-duracoes.mjs` — vitest-duracoes.mjs — repórter do Vitest que grava a duração de cada arquivo de teste.

## tools/arquitetura/

- `avisos-de-terceiros.test.mjs` — avisos-de-terceiros.test.mjs — toda dependência de runtime que entra no pacote da bancada tem seção em THIRD-PARTY-NOTICES.md, e o build a copia para `dist/`…
- `fronteira-da-bancada.mjs` — fronteira-da-bancada.mjs — a bancada é um módulo, não o centro do projeto.
- `imagem-pesada-no-git.test.mjs` — imagem-pesada-no-git.test.mjs — nenhuma imagem rastreada passa de 3 MB: o git guarda para sempre o que entra, e agentes despachados já deixaram 26 MB de amos…
- `independencia-catalogo.mjs` — independencia-catalogo.mjs — firewall pequeno entre o núcleo, a autoria pura e as portas que resolvem arquivos. Importar uma peça pelo caminho é permitido no…
- `malha-fora-do-git.test.mjs` — malha-fora-do-git.test.mjs — nenhuma malha importada (.obj ou .mtl) entra no versionamento: o `.gitignore` as cobre, e nenhuma está rastreada.
- `mapear-motor-procedural.mjs` — Mapa estático da fachada procedural. É uma evidência de arquitetura: não é importado pelo motor e não participa da execução de receitas.
- `mapear-motor-procedural.test.mjs` — Guarda que o mapa R00 continue descrevendo a fachada procedural real.
- `navegador-sem-node.test.mjs` — navegador-sem-node.test.mjs — o código que a bancada publicada empacota não importa módulo do Node. Em 2026-10-15 as famílias `movel-de-caixa`, `dobradica` e…
- `nucleo-sem-three.mjs` — nucleo-sem-three.mjs — o núcleo de autoria é independente de Three.js.
- `nucleo-sem-three.test.mjs` — nucleo-sem-three.test.mjs — o invariante "o núcleo de autoria é independente de Three.js", conferido por máquina: o núcleo real não importa Three.js, e um ar…
- `termos-proibidos.mjs` — termos-proibidos.mjs — normalização e varredura do gate de vazamento (termos proibidos e malha ou cena no índice).
- `termos-proibidos.test.mjs` — termos-proibidos.test.mjs — gate de vazamento: o repositório não recebe menção aos termos da lista embaralhada, nem em arquivo, caminho, mensagem de commit o…

## tools/bancadas/

- `avisos-de-terceiros.mjs` — avisos-de-terceiros.mjs — o pacote da bancada leva o texto das licenças das bibliotecas que empacota.
- `harness-entry.js` — harness-entry.js — catálogo privado dos gates visuais. Este módulo só é carregado por harness.html; não participa da entrada publicada da bancada. /
- `harness.html` — harness.html — bancada privada dos gates; nunca é entrada de Pages.
- `porteiro.mjs` — porteiro.mjs — GATE explícito de render do harness privado. Ele não descobre nem publica o acervo de `pecas/`: a lista abaixo é a seleção de capacidades que …
- `sem-sessao-no-pacote.mjs` — sem-sessao-no-pacote.mjs — a sessão ativa não vai para `dist/`.
- `sem-sessao-no-pacote.test.mjs` — sem-sessao-no-pacote.test.mjs — o pacote sai sem a sessão de quem construiu.
- `skill-criar-peca.test.ts` — skill-criar-peca.test.ts — a skill de autoria é MEDIDA contra o núcleo, não revisada no olho. Duas afirmações da `.claude/skills/criar-peca/SKILL.md` custam …
- `versao-publicada.mjs` — versao-publicada.mjs — de qual commit veio a página que está aberta.
- `versao-publicada.test.mjs` — versao-publicada.test.mjs — prova que a versão na tela diz a verdade sobre a construção, inclusive quando não há git, não há commit ou a árvore está suja.

## tools/bancadas/bench/

- `pngstats.mjs` — pngstats.mjs — decodifica um PNG (8-bit, colortype 2/6) via zlib. Sem dependência externa. `decodePng` devolve os pixels CRUS (usado pelo porteiro via `pngSt…

## tools/bancadas/fixtures/

- `catalogo-visual.js` — catalogo-visual.js — fixtures mínimas do harness privado.

## tools/blender/

- `blender.test.mjs` — blender.test.mjs — as ferramentas opcionais do Blender em tools/blender: o oráculo da subdivisão regera a fixture, a régua dá zero na identidade, acusa a ver…
- `caixa-de-prova.mjs` — caixa-de-prova.mjs — a forma simétrica em x, desenhada por código, com que se prova que o pacote cego sai simétrico: uma caixa oca de chapa sem espessura, co…
- `chapa-com-abertura-de-prova.mjs` — chapa-com-abertura-de-prova.mjs — a forma desenhada por código com que se prova a conferência do refino: uma chapa plana de 1 m (x) por 0,6 m (y), com a face…
- `comparar-vincos.test.mjs` — comparar-vincos.test.mjs — comparar-vincos mede os vincos da candidata contra as linhas de feição lidas do pacote cego, por vista, no total e em 3D. A prova …
- `conferir-refino.test.mjs` — conferir-refino.test.mjs — a conferência entre rodadas de refino (tools/blender/conferir-refino.py), provada sobre a chapa com abertura de tools/blender/chap…
- `cordao-de-prova.mjs` — cordao-de-prova.mjs — a forma desenhada por código com que se prova o perfil lido do corte (ler-perfil.py): uma chapa reta ao longo de uma direção horizontal…
- `cortes-de-detalhe.test.mjs` — cortes-de-detalhe.test.mjs — os cortes de detalhe ampliados do pacote cego: uma região de detalhe declarada numa janela do plano gera, ao lado do corte do tr…
- `cotas-dos-cortes.test.mjs` — cotas-dos-cortes.test.mjs — o rótulo de cada cota de um corte não pode cobrir o traço do contorno: o desenho afasta a caixa do ponto e liga os dois por uma l…
- `distancias-de-prova.mjs` — distancias-de-prova.mjs — as medidas com que os testes das leituras do pacote conferem polilinhas lidas contra as exatas, em qualquer dimensão: os pontos a c…
- `feixe-de-prova.mjs` — feixe-de-prova.mjs — a forma desenhada por código com que se prova a conferência das linhas 3D contra os cortes (linhas-pelos-cortes.test.mjs): um prisma de …
- `leitura-blender.test.mjs` — leitura-blender.test.mjs — ler-corte, ler-linhas e comparar-cortes sobre um pacote cego feito de verdade pelo pacote-cego.py, a partir do prisma de prova (pr…
- `leitura-do-pacote.test.mjs` — leitura-do-pacote.test.mjs — ler-corte, ler-linhas e comparar-cortes leem só o pacote cego (imagens, quadro.json, camera.json e grade.json) e devolvem o traç…
- `ler-perfil.test.mjs` — ler-perfil.test.mjs — ler-perfil.py tira do contorno de um corte do pacote cego o perfil de um detalhe de borda, em milímetro, no plano normal à linha de fei…
- `limiar-de-dobra.test.mjs` — limiar-de-dobra.test.mjs — comparar-vincos mede os vincos pelo mesmo limiar de dobra da régua (fatia 3 do plano da gaiola que segue as feições). Antes, a fer…
- `linhas-pelos-cortes.test.mjs` — linhas-pelos-cortes.test.mjs — `ler-linhas --3d` confere cada curva 3D contra os cortes do pacote: onde a curva atravessa o plano de um corte, o ponto dela t…
- `oraculo-subdivisao.mjs` — oraculo-subdivisao.mjs — gera a fixture do oráculo da subdivisão, `procedural/nucleo/fixtures/subdivisao-oraculo-blender.json`, com o modificador Subdivision…
- `pacote-de-prova.mjs` — pacote-de-prova.mjs — monta, sem Blender, um pacote cego desenhado pelo próprio imagens.py a partir do prisma de prova (prisma-de-prova.mjs), para os testes …
- `placa-de-prova.mjs` — placa-de-prova.mjs — a chapa desenhada por código com que se prova o mapa com sinal, a curvatura comparada e os cortes da régua: uma chapa quadrada de 300 mm…
- `prisma-de-prova.mjs` — prisma-de-prova.mjs — a forma desenhada por código com que se provam as leituras do pacote cego (ler-corte, ler-linhas e comparar-cortes): um prisma convexo …
- `regua-sinal-curvatura-cortes.test.mjs` — regua-sinal-curvatura-cortes.test.mjs — o que a fatia 25 do plano da carroceria por subdivisão deu à régua, provado sobre a chapa de tools/blender/placa-de-p…

## tools/blender/receitas-de-prova/

- `chapa-com-abertura.mjs` — chapa-com-abertura.mjs — a receita desenhada por código com que se prova a conferência do refino entre receitas: uma chapa de 1 m (x) por 0,6 m (y) e 6 mm de…
- `chapa-rodada-1.js` — chapa-rodada-1.js — a primeira rodada da chapa com abertura: só a chapa, com a abertura de x 300 a 700 e y 250 a 450 mm.
- `chapa-rodada-2.js` — chapa-rodada-2.js — a segunda rodada: a chapa igual, o friso em volta da abertura e um canto da abertura arredondado.
- `chapa-rodada-3.js` — chapa-rodada-3.js — a rodada em que a abertura da chapa e o friso descem 45 mm (o canto arredondado da segunda fica).

## tools/catalogo/

- `gerar-catalogo-capacidades.mjs` — Gera projeções publicáveis. O motor permanece puro; somente esta borda lê e escreve disco.

## tools/fixtures/

- `requisitos-da-peca-de-prova.js` — requisitos-da-peca-de-prova.js — o que uma peça precisa TER para as guardas provarem o que dizem provar.
- `requisitos-da-peca-de-prova.test.mjs` — requisitos-da-peca-de-prova.test.mjs — a régua da peça de prova mede o que as guardas realmente exigem, e reprova quando falta.

## tools/fixtures/acervo/peca-de-prova/

- `receita.js` — peca-de-prova/receita.js — a peça que as guardas de navegador usam.
- `receita.test.mjs` — receita.test.mjs — a peça de prova cumpre o que as guardas exigem dela.

## tools/fixtures/composicao-parametrica/

- `composicoes.js` — Fixture de teste: uma composição procedural mínima (um bloco identificado) e o registro que a executa. Quem a usa é `tools/mecanifica/composicao-na-varredura…
- `configuracao.mjs` — Configuração explícita do registro de composições da fixture: é o que `--composicoes=tools/fixtures/composicao-parametrica/configuracao.mjs` aponta.
- `receita.js` — Fixture de teste: receita que compõe por `CHAMADAS_COMPOSICOES` e deriva as chamadas de `PARAMS`. Uma base e um pilar com `folga` entre eles; `largura` e `al…

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

## tools/fixtures/familia-chamavel/

- `composicoes.js` — Fixture de teste: as duas composições da família `tubo-de-prova`, uma barra maciça e um tubo de parede. Quem a usa é `procedural/familias/familias.test.js` e…
- `derivar.js` — Fixture de teste: o `derivar` da família `tubo-de-prova`. Puro: recebe os parâmetros em milímetro, já completados com os padrões, e devolve a composição e os…
- `familia.js` — Fixture de teste: a família `tubo-de-prova` carregada (contrato, composições e `derivar`) e a receita que a chama. A receita é um objeto com `get CHAMADAS_CO…

## tools/fixtures/familia-com-casca/

- `familia.js` — Fixture de teste: a família `caixa-oca-de-prova`, uma caixa feita pela casca nativa. Com `comEntalhe: false` (a família que a aprovação mecânica aprova) só h…

## tools/fixtures/familia-com-chapa-e-barras/

- `familia.js` — Fixture de teste: a família `suporte-de-prova`. O parâmetro `estrutura` escolhe a composição: 0 é uma chapa dobrada em L (a extensão `chapaDobrada`), 1 é um …

## tools/fixtures/familia-com-esboco/

- `composicoes.js` — Fixture de teste: a composição da família `roda-com-esboco`, uma roda de eixo em x com pneu, disco e dois cubos, cada um uma revolução, e duas portas (o asse…
- `derivar.js` — Fixture de teste: o `derivar` da família `roda-com-esboco`. Puro: recebe os parâmetros em milímetro, já completados com os padrões, e devolve a composição e …
- `familia.js` — Fixture de teste: a família `roda-com-esboco` carregada (contrato, composição e `derivar`). `criarRodaDeProva` a monta com o contrato escrito em `familia.jso…

## tools/fixtures/familia-com-porta/

- `familia.js` — Fixture de teste: a família `bucha-de-prova`, um anel de revolução que publica a porta `assento` (anel que ocupa) na parede externa. `criarBucha({ erroDoRaio…
- `familias.mjs` — Fixture de teste: a lista de famílias que `npm run familia -- aprovar bucha-de-prova --familias=<este módulo>` lê.

## tools/fixtures/forma-do-esboco/

- `suporte.js` — suporte.js — a receita de prova da conferência da forma contra o esboço.

## tools/fixtures/forma-do-esboco/deslocada/

- `receita.js` — O bloco furado deslocado 20 mm em x: ainda dentro da tolerância do envelope (50 mm), e fora da forma do esboço pela razão de volume.

## tools/fixtures/forma-do-esboco/deslocada-declarada/

- `receita.js` — O bloco furado deslocado 20 mm em x de propósito: a receita declara o deslocamento e o motivo, a razão é medida contra a forma transladada e o envelope do vo…

## tools/fixtures/forma-do-esboco/menor/

- `receita.js` — O bloco furado com 90% das medidas do esboço: dentro do envelope, e com a razão de volume abaixo do mínimo.

## tools/fixtures/forma-do-esboco/minimo-proprio/

- `receita.js` — O bloco sem o furo com mínimo próprio de 0,80: a razão dele (cerca de 0,88) passa mesmo com o mínimo geral de 0,99, que a viga cumpre.

## tools/fixtures/forma-do-esboco/ok/

- `receita.js` — O bloco furado e a viga inclinada do esboço, com a razão de volume acima do mínimo nas duas partes.

## tools/fixtures/forma-do-esboco/sem-recorte/

- `receita.js` — O bloco sem o furo: a caixa do envelope aprova, e a razão de volume cai pelo que o recorte tira da forma do esboço.

## tools/fixtures/forma-do-esboco/viga-reta/

- `receita.js` — A viga sem a inclinação de 30 graus do esboço.

## tools/fixtures/nivel-zero/

- `medir-blocagem.js` — Suporte de prova do tradutor do nível zero. A medida da blocagem mora em `src/autoria/medir-blocagem-nivel-zero.js`, porque o próprio tradutor a usa para o r…

## tools/fixtures/refina-forma-global/

- `suporte.js` — suporte.js — a receita de prova do refinamento da forma global.

## tools/fixtures/refina-forma-global/contorno-ok/

- `receita.js` — O suporte inteiro com o contorno frontal ao lado (referencias/frontal.contornos.json): a sapata e a coluna casam com as regiões de mesmo nome.

## tools/fixtures/refina-forma-global/contorno-parte-fora/

- `receita.js` — A sapata deslocada 30 mm em +x, com a tolerância de envelope no teto (50 mm) para o refinamento deixá-la passar: quem reprova é o contorno por parte, e nomei…

## tools/fixtures/refina-forma-global/g01-ok/

- `receita.js` — O suporte inteiro, com REFINA.alvo: a malha confere com o alvo N2 nas três silhuetas.

## tools/fixtures/refina-forma-global/g01-parte-fora/

- `receita.js` — A sapata deslocada 30 mm em +x, com a tolerância de envelope no teto (50 mm) para o refinamento deixá-la passar: quem reprova é o G01 da malha.

## tools/fixtures/refina-forma-global/ok/

- `receita.js` — A receita inteira do suporte: a sapata e a coluna dentro dos volumes do andaime e o assento onde ele o declarou.

## tools/fixtures/refina-forma-global/parte-fora/

- `receita.js` — A sapata deslocada 30 mm em +x: sai do envelope do volume `sapata` por 30 mm.

## tools/fixtures/refina-forma-global/parte-sem-volume/

- `receita.js` — A coluna entregue sem dizer que volume do andaime ela refina.

## tools/fixtures/refina-forma-global/porta-movida/

- `receita.js` — A porta `assento` publicada 5 mm acima do topo da coluna: a geometria é a do andaime e a porta não.

## tools/fixtures/refina-forma-global/razao-fora/

- `receita.js` — O suporte declarando que a altura é de 0,30 a 0,40 da largura, quando é igual a ela.

## tools/fixtures/refina-forma-global/razao-ok/

- `receita.js` — O suporte com duas razões na faixa: a coluna é de 0,90 da largura da sapata e a altura total é igual à largura total.

## tools/fixtures/refina-forma-global/sapata-deslocada/

- `receita.js` — O suporte com a sapata 1 mm para +x: outra malha, ainda dentro do envelope de 2 mm do volume da sapata.

## tools/fixtures/tres-blocos-vinculados/

- `README.md` — Três blocos vinculados

## tools/fixtures/tres-blocos-vinculados/receitas/

- `bloco.js` — bloco.js — o bloco da fixture neutra "três blocos vinculados", nas três variações que ela usa: só pino, furo e pino, e só furo. Um arquivo só gera as três, p…

## tools/mapa/

- `citacoes.mjs` — citacoes.mjs — documento de leitura obrigatória não pode mandar abrir arquivo que não existe.
- `citacoes.test.mjs` — citacoes.test.mjs — o nome do que saiu só aparece em documento vivo numa frase que diz que saiu, e o repositório passa.
- `descricoes.test.mjs` — descricoes.test.mjs — a descrição do cabeçalho entra em toda sessão.
- `estrutura-docs.mjs` — estrutura-docs.mjs — sustenta a separação da documentação por quem a lê.
- `estrutura-docs.test.mjs` — estrutura-docs.test.mjs — cada gate é visto REPROVANDO antes de ser aceito.
- `gates-bateria-curta.test.mjs` — gates-bateria-curta.test.mjs — a bateria curta só roda quando tudo o que mudou é peça ou documento; qualquer outro arquivo, ou não saber o que mudou, roda to…
- `gates-espelham-ci.test.mjs` — gates-espelham-ci.test.mjs — o comando local `npm run gates` cobre tudo o que o CI executa.
- `gates-lentos.test.mjs` — gates-lentos.test.mjs — depois do gate `test`, o resumo lista os cinco arquivos de teste mais lentos e avisa o que passa do teto, lendo a duração que o repór…
- `gates-saida-guardada.test.mjs` — gates-saida-guardada.test.mjs — a saída inteira de um gate que falha vai para `tmp/gates/`, ignorado pelo git, e a linha de falha diz o caminho. Gate que pas…
- `leitura-obrigatoria.mjs` — leitura-obrigatoria.mjs — quanto cada intenção precisa LER antes de começar.
- `links.mjs` — links.mjs — o gate de referência: varre todo arquivo rastreado por menções a `<pasta>/<...>.md` sob docs/, procedural/, modulos/, tools/ ou src/ (caminho com…
- `mapa.mjs` — mapa.mjs — gera docs/MAPA.md: o inventário do repositório com o resumo de cada arquivo. O resumo NÃO mora aqui: mora no PRÓPRIO arquivo (primeiro comentário …
- `planos.mjs` — planos.mjs — impede que o planejamento volte a ter mais de um plano ativo ou que um plano executivo ultrapasse o limite curto acordado.
- `planos.test.mjs` — planos.test.mjs — prova que o gate recusa plano grande, estados inválidos, índice divergente e mais de um plano ativo.
- `reguas-nos-gates.mjs` — reguas-nos-gates.mjs — régua que existe precisa ser rodada por alguém.
- `reguas-nos-gates.test.mjs` — reguas-nos-gates.test.mjs — a régua órfã precisa reprovar.
- `roteiros.mjs` — roteiros.mjs — os invariantes e os roteiros de leitura por intenção, como dado.
- `roteiros.test.mjs` — roteiros.test.mjs — os roteiros por intenção e o gate leitura:obrigatoria: o JSON do repositório passa, o ROTEIROS.md e os blocos do CLAUDE.md estão gerados …
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
- `comecar.mjs` — comecar.mjs — a entrada por intenção no MCP.
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
- `acervo-real.test.mjs` — A varredura do acervo REAL, inteiro, uma vez.
- `acervo-reduzido.mjs` — acervo-reduzido.mjs — monta um acervo de três peças pequenas sob `tmp/`.
- `adaptar-montagem-three.test.ts` — Prova que a visualização de montagem deriva somente da árvore resolvida.
- `adaptar-three.test.ts` — adaptar-three.test.ts — prova headless da fronteira entre o núcleo procedural herdado e Three.js.
- `alinhar-modelagem.test.mjs` — alinhar-modelagem.test.mjs — a rodada de alinhamento continua colada ao formato que ela produz.
- `alisar-a-superficie.mjs` — alisar-a-superficie.mjs — calcula de uma vez quanto mover cada valor editável de uma receita para tirar as falhas de ondulação da superfície de subdivisão se…
- `alisar-a-superficie.test.mjs` — alisar-a-superficie.test.mjs — a ferramenta de alisamento sobre chapas desenhadas por código.
- `alisar-numerico.mjs` — alisar-numerico.mjs — a álgebra e a geometria pequenas da ferramenta de alisamento.
- `alisar-rede.test.mjs` — alisar-rede.test.mjs — a ferramenta de alisamento sobre a gaiola por rede de curvas.
- `alterar-montagem.test.ts` — alterar-montagem.test.ts — alteração semântica compacta de montagem.
- `analise-da-peca.mjs` — analise-da-peca.mjs — o passo "Pare e analise": a matriz de vistas que a IA precisa olhar antes de declarar uma forma pronta, o manifesto que prova que ela f…
- `analise-da-peca.test.mjs` — analise-da-peca.test.mjs — a matriz do "Pare e analise", o manifesto e o zoom.
- `aprovacao-da-familia.mjs` — aprovacao-da-familia.mjs — a camada mecânica da aprovação de uma família, sem gastar token.
- `aprovacao-da-familia.test.mjs` — aprovacao-da-familia.test.mjs — a camada mecânica da aprovação de uma família e o hash preso ao `aprovacao.json`. A prova: a família de fixture aprovada; a b…
- `argumentos.mjs` — argumentos.mjs — leitura de linha de comando dos CLIs do Modelar, com a MESMA lei que o núcleo de autoria aplica a uma referência: bandeira desconhecida, amb…
- `argumentos.test.ts` — Contratos mínimos do parser compartilhado e recusas pré-navegador.
- `articulacao-na-montagem.test.mjs` — articulacao-na-montagem.test.mjs — a articulação sobre uma montagem v5 real: a folha da porta não declara pose, a posição sai do encaixe da porta `eixo-da-do…
- `ativar-bancada.mjs` — ativar-bancada.mjs — ativa qualquer peca ou montagem procedural na sessao ativa da bancada 3D.
- `ativar-bancada.test.mjs` — ativar-bancada.test.mjs — grito do motor é RECUSA, e não decoração no rodapé.
- `auditar-intersecoes-montagem.test.ts` — @ts-expect-error — serviço neutro JavaScript exercitado pelo contrato público.
- `autoria-ativa.mjs` — autoria-ativa.mjs — provedores neutros para revisões imutáveis ativas.
- `autoria-ativa.test.mjs` — autoria-ativa.test.mjs — continuidade autorizada e falha fechada.
- `autoria-montagem.mjs` — autoria-montagem.mjs — planejamento e aplicação interna de montagens v1/v2/v3.
- `autoria-montagem.test.ts` — Provas R02: planejar, confirmar, validar e materializar montagem persistida.
- `autoria-receita.mjs` — autoria-receita.mjs — autoria declarativa de receitas, sem avaliar JavaScript.
- `autoria-receita.test.ts` — Provas da autoria declarativa de receita sem JavaScript do agente.
- `banco-de-provas.mjs` — Catálogo e registro de custo do banco de provas de modelagem. Compara autonomia, rodadas, notas e tokens consumidos entre o início e o fim do plano de ferram…
- `banco-de-provas.test.mjs` — Testes do catálogo do banco de provas e registro de custo de modelagem. Valida esquema de medições, agregação de custo por objeto e cobertura de ferramentas …
- `cadeiras-ajustadas.test.mjs` — Os ajustes das onze cadeiras (`<id>.ajustes.json` ao lado de cada receita): cada arquivo aplica sem erro, a conversão não recusa forma, a caixa envolvente mu…
- `cadeiras-medida.mjs` — cadeiras-medida.mjs — a medida da família `cadeira` contra o esboço alvo de cada perfil, e a prancha com os dois lado a lado.
- `calibracao-do-critico.mjs` — calibracao-do-critico.mjs — o conjunto de calibração do crítico visual e o gate `calibracao:check`.
- `calibracao-do-critico.test.mjs` — calibracao-do-critico.test.mjs — o gate `calibracao:check`: o conjunto versionado passa, e cada coisa que ele confere reprova quando muda.
- `caminho-confinado.mjs` — caminho-confinado.mjs — guarda de escrita para artefatos que um CLI aceita por caminho. A checagem lexical sozinha não basta: um diretório relativo pode cont…
- `caminho-confinado.test.ts` — caminho-confinado.test.ts — prova do confinamento sem precisar criar links.
- `caminho-procedural.test.ts` — caminho-procedural.test.ts — a raiz procedural é neutra: não volta a `fps`, que era o nome do jogo removido, nem a `prototipos`, que dizia experimento sobre …
- `capacidade-symlink.mjs` — capacidade-symlink.mjs — este ambiente consegue criar vínculo simbólico?
- `capturar-montagem.mjs` — capturar-montagem.mjs — serviço importável de vistas de montagem em memória.
- `capturar-montagem.test.ts` — @ts-expect-error — resolvedor JavaScript público, exercitado pelo contrato.
- `catalogo-pecas.test.ts` — catalogo-pecas.test.ts — catálogo vazio é estado válido; IDs e carregadores continuam sendo contratos explícitos quando uma peça voltar a ser publicada. /
- `cilindro-hidraulico-aprovacao.test.mjs` — cilindro-hidraulico-aprovacao.test.mjs — a aprovação mecânica de uma família que gera montagem: o curso da articulação é conferido contra as malhas da camisa…
- `comecar.mjs` — comecar.mjs — a entrada por intenção: `npm run comecar -- [roteiro] [--arquivo <x.esboco.json>]`.
- `comecar.test.mjs` — comecar.test.mjs — a entrada por intenção: a pergunta inicial com o estado, a pergunta de cada grupo da árvore, cada folha com a sua leitura, as seções entre…
- `comparar-silhueta.mjs` — comparar-silhueta.mjs — compara a silhueta de uma receita do acervo com a de um modelo de referência medido por `modelo-de-referencia.mjs`.
- `comparar-silhueta.test.mjs` — Cabine mais estreita que a da fonte (600 contra 900 de meia largura): o perfil lateral e a planta do corpo não mudam, só a seção da estufa.
- `composicao-na-varredura.test.mjs` — A varredura de parâmetros, o `descrever` e o Envelope do Condutor enxergam o registro de composições.
- `conferir-contra-referencia.mjs` — conferir-contra-referencia.mjs — desvio em MILÍMETRO entre a silhueta lateral de partes de uma peça e a borda correspondente de uma foto de referência.
- `conferir-contra-referencia.test.mjs` — A REFERÊNCIA É A SILHUETA DA PRÓPRIA PEÇA DE PROVA, desenhada a partir da malha dela e guardada ao lado da receita. Uma foto de conteúdo faria este teste dep…
- `conferir-juntas.mjs` — conferir-juntas.mjs — ferramenta de medição e diagnóstico de interfaces de contato entre componentes de uma peça procedural.
- `conferir-juntas.test.ts` — conferir-juntas.test.ts — testes para a ferramenta de medição e diagnóstico de juntas.
- `conferir-malha.mjs` — conferir-malha.mjs — a topologia da malha de uma receita, com os gritos do motor: casca aberta, não-manifold, orientação, face de área nula, face fina, face …
- `conferir-pontos.mjs` — conferir-pontos.mjs — mede os PONTOS DECLARADOS de uma peça contra a malha que a receita produz, e devolve o desvio de cada um em milímetro.
- `configuracao-composicoes.mjs` — configuracao-composicoes.mjs — o registro de composições que um comando recebe.
- `contexto-montagem-estudo.test.ts` — Repete R001/R002 no descritor de contexto e mede a economia Agent-First.
- `contorno-da-imagem.mjs` — contorno-da-imagem.mjs — a porta de linha de comando do módulo `modulos/contorno-da-imagem`, que separa as partes de uma imagem de referência por watershed c…
- `contorno-da-imagem.test.mjs` — contorno-da-imagem.test.mjs — o contorno sai da imagem, igual nas duas execuções, separa partes do mesmo cinza e recusa semente fora da parte.
- `contorno-da-peca.mjs` — contorno-da-peca.mjs — o contorno por parte no veredito da peça.
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
- `esboco-ajuda.mjs` — A referência do JSON do esboço por tópico: `npm run esboco -- --ajuda [tópico]`. A fonte é o README do módulo. Os tópicos saem dos títulos `##` e `###` dele …
- `esboco-ajuda.test.mjs` — esboco-ajuda.test.mjs — o `--ajuda [tópico]` do esboço: o índice cobre todos os títulos do README, cada tópico devolve só a sua seção, o tópico desconhecido …
- `esboco-alinhar-caixas.mjs` — esboco-alinhar-caixas.mjs — alinha as caixas de um esboço onde a receita de origem as deixou desencontradas por pouco. Núcleo puro: recebe as formas resolvid…
- `esboco-alinhar-caixas.test.mjs` — O alinhamento das caixas de um esboço: simetria, colunas, degrau, contato e folga, com o limite de cada regra, e as onze cadeiras convertem com o alinhamento…
- `esboco-blocagem-casos.test.mjs` — Os casos mínimos da silhueta pela blocagem do nível zero: cada forma que fez a blocagem se afastar do desenho atual, sozinha numa cena pequena, com o mesmo m…
- `esboco-blocagem-furo.mjs` — esboco-blocagem-furo.mjs — o fundo que o furo passante de uma forma de família deixa ver nas vistas, medido na blocagem.
- `esboco-blocagem-recorte.mjs` — esboco-blocagem-recorte.mjs — o que o recorte (`subtrai`) de uma forma tira da silhueta, medido contra o desenho das formas.
- `esboco-blocagem-recorte.test.mjs` — O recorte de envelope igual na blocagem do nível zero: a forma recortada vai inteira ao andaime quando o recorte não muda o envelope, e só fica fora quando o…
- `esboco-blocagem.mjs` — esboco-blocagem.mjs — as vistas do esboço desenhadas pela blocagem do nível zero (`--nivel-zero`).
- `esboco-blocagem.test.mjs` — O `--nivel-zero` do esboço: as vistas `--unidade` e `--composta` desenhadas pela blocagem do nível zero, comparadas com o desenho das formas (`desenharEsboco…
- `esboco-brief.mjs` — O que o brief do crítico cego do esboço junta às imagens da unidade, do Marco e do objeto: o arquivo `brief.md` ao lado das imagens (o brief só saía na tela,…
- `esboco-composta.test.mjs` — esboco-composta.test.mjs — o `--composta` do esboço: uma imagem só com as quatro vistas sem legenda em grade 2x2, 1100 px de largura no total, cada quadrante…
- `esboco-condutor-nivel-zero.test.mjs` — O Condutor lendo o nível zero, com o adaptador de verdade (`esboco-nivel-zero.mjs`) entregue como porta: - o percurso completo da moto-curvas (Portões, Marco…
- `esboco-familias.mjs` — esboco-familias.mjs — o adaptador que entrega ao esboço as famílias procedurais.
- `esboco-familias.test.mjs` — A ponte das famílias procedurais para o esboço (`esboco-familias.mjs` e `modulos/esboco/src/familia.js`), com a roda 2.0 e o cilindro hidráulico de verdade: …
- `esboco-medidas-no-andaime.test.mjs` — A prova das medidas do `plano.medidas` lidas na blocagem do nível zero, sobre os esboços do módulo e do banco de provas que as declaram: a leitura na blocage…
- `esboco-nivel-zero.mjs` — esboco-nivel-zero.mjs — o adaptador que liga o Condutor do esboço ao nível zero.
- `esboco-para-andaime.mjs` — esboco-para-andaime.mjs — o adaptador que liga o esboço ao andaime da forma global N2.
- `esboco-para-andaime.test.mjs` — A prova do tradutor do nível zero sobre os esboços do módulo e do banco de provas: o andaime é aceito por `normalizarAndaimeGlobal`, a blocagem compila e fec…
- `esboco-para-passos.mjs` — esboco-para-passos.mjs — converte as formas de um esboço em passos de uma receita do Modelar (`cubo`, `chamferBox`, `cilindro`, `extrusao`, `rotaciona` e `pa…
- `esboco-para-passos.test.mjs` — A conversão do esboço em passos de receita: as onze cadeiras escolhidas (receitas do externo traduzidas em esboço) convertem sem recusa, e a malha que o núcl…
- `esboco-proximo-mede-antes.test.mjs` — O --proximo do esboço só gera o brief do crítico depois das medidas do plano aprovadas, as em milímetro e as razões. O brief do objeto inteiro sai quando o P…
- `esboco-recorte-no-andaime.test.mjs` — O recorte (`subtrai`) na blocagem do nível zero: a N2 não subtrai um volume de outro, então a forma recortada vai ao andaime inteira e a perda entra no relat…
- `esboco-recusa.mjs` — Para onde cada recusa do esboço aponta: a mensagem "esboço recusado: ...", o gate de contato que reprova e o Portão do Condutor que não passa ganham no fim `…
- `esboco-recusa.test.mjs` — esboco-recusa.test.mjs — toda recusa do esboço aponta o tópico que resolve, e o tópico existe no índice real de `npm run esboco -- --ajuda`: a forma e o camp…
- `esboco-referencia.mjs` — Lê as referências do esboço para o módulo `modulos/esboco`, que não lê arquivo: um JSON de contornos da imagem (`mecanifica.contornos@1`, o que `npm run cont…
- `esboco-silhueta.mjs` — esboco-silhueta.mjs — a silhueta de um desenho medida na camada, sem navegador.
- `esboco-solido.mjs` — esboco-solido.mjs — o adaptador que liga o esboço ao sólido que a receita é conferida contra.
- `esboco.mjs` — Linha de comando do esboço: lê `<nome>.esboco.json`, desenha as opções lado a lado com modulos/esboco e grava `<nome>.svg` e `<nome>.png` ao lado. Uso: npm r…
- `estado-bancada.test.ts` — estado-bancada.test.ts — contrato headless das vistas, seleção, contexto e URL da bancada.
- `estudo-campo-revalidacao.test.ts` — R05: estudo de campo sobre uma peça compartilhada em duas raízes.
- `etapas-da-montagem.mjs` — etapas-da-montagem.mjs — o registro de etapas de uma montagem v5, em disco, e a única porta para fixar uma etapa.
- `etapas-da-montagem.test.mjs` — etapas-da-montagem.test.mjs — a porta que fixa etapa. Fixar exige a etapa ser a próxima, o crítico ter fechado a peça dela, a nota de passagem, as juntas pas…
- `etapas-de-construcao.test.mjs` — etapas-de-construcao.test.mjs — fatia 3 do plano "a peça nasce encaixada": o registro de etapas, a junta medida quando a parte entra e a recusa de seguir com…
- `executar-receita.test.ts` — executar-receita.test.ts — prova a fronteira pura sem carregar catálogo.
- `exemplo-canonico.test.mjs` — exemplo-canonico.test.mjs — o exemplo de receita que a documentação ensina precisa passar pelo mesmo caminho que o acervo.
- `exportar-obj.mjs` — exportar-obj.mjs — CLI para exportação atômica e segura de receitas procedurais em Wavefront OBJ (.obj).
- `exportar-obj.test.mjs` — exportar-obj.test.mjs — suíte de testes da CLI de exportação OBJ.
- `exportar-peca.mjs` — exportar-peca.mjs — A-60: o núcleo roda AQUI e grava o resultado; o produto só lê.
- `exportar-peca.test.ts` — Exportação: contrato do artefato e estado sem catálogo publicado.
- `exportar-step.mjs` — exportar-step.mjs — CLI para exportação atômica e segura de receitas procedurais em formato STEP.
- `exportar-step.test.mjs` — exportar-step.test.js — suíte de testes da CLI de exportação STEP e escrita segura.
- `exportar.mjs` — exportar.mjs — a linha de comando do A-60.
- `familia-com-esboco.mjs` — familia-com-esboco.mjs — o adaptador da conferência entre a família e o componente do esboço de mesmo nome.
- `familia-com-esboco.test.mjs` — familia-com-esboco.test.mjs — a conferência da família com o componente do esboço de mesmo nome, ponta a ponta: o componente `roda` do esboço expandido nos p…
- `familia.mjs` — familia.mjs — a aprovação mecânica das famílias e o gate que a confere.
- `familia.test.mjs` — familia.test.mjs — o comando `npm run familia -- aprovar <id>` e o gate `familias:check`.
- `ferramentas-por-objeto.mjs` — Gera docs/mecanifica/FERRAMENTAS-POR-OBJETO.md a partir de docs/mecanifica/ferramentas-por-objeto.json e confere que o JSON cobre a fase atual de FAMILIAS-DE…
- `ferramentas-sobre-uniao.test.ts` — ferramentas-sobre-uniao.test.ts — fatia 5 do plano "União de sólidos": as ferramentas que leem a peça funcionam sobre uma malha unida. A fixture é neutra (`f…
- `folha-comparativa.mjs` — folha-comparativa.mjs — a fonte e a receita lado a lado, nas MESMAS câmeras e na MESMA escala, e a vista de diferença que marca onde a receita sobra ou falta.
- `folha-comparativa.test.mjs` — Testes de folha-comparativa.mjs: as câmeras são as de modelo-de-referencia, a receita igual à fonte não deixa sobra nem falta, e a cabine mais estreita ou o …
- `fonte-sintetica.mjs` — fonte-sintetica.mjs — monta, no Node e sem navegador, um `partes.json` no formato de `modelo-de-referencia.mjs` a partir dos triângulos de uma receita.
- `forma-da-peca-no-veredito.test.mjs` — forma-da-peca-no-veredito.test.mjs — o veredito da peça confere a forma contra a referência, depois do que já roda. Sobre o suporte de `tools/fixtures/refina…
- `forma-do-esboco.mjs` — forma-do-esboco.mjs — a forma de uma receita contra a forma do esboço que ela refina, sem mudar a receita.
- `forma-do-esboco.test.mjs` — forma-do-esboco.test.mjs — a forma da receita contra a forma do esboço, de ponta a ponta: o esboço lido pelo módulo (`formasResolvidas`), o sólido de cada fo…
- `forma-global-n2-primitivas.test.mjs` — Primitivas do nível zero na forma global N2: cone (com tronco), esfera, anel, revolução, extrusão côncava e tubo. Cada uma é provada por envelope medido, mal…
- `frente-da-fonte.mjs` — frente-da-fonte.mjs — de que lado fica a frente de uma malha de referência, e a conferência de que o `partes.json` a registrou.
- `frente-da-fonte.test.mjs` — Testes de frente-da-fonte.mjs: a frente lida pelas rodas, faróis e para-brisa nomeados, a declaração obrigatória quando a malha é uma peça só, a recusa da fr…
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
- `medidas-da-fonte.mjs` — medidas-da-fonte.mjs — tira de `fonte-partes.json`, em milímetro, o ponto de partida das três vistas da carroceria: o perfil lateral, a planta, a seção front…
- `medidas-da-fonte.test.mjs` — Testes de medidas-da-fonte.mjs sobre a fonte sintética da fixture de caixas: perfil, seção, planta, rodas, o trecho de receita que o núcleo executa e a recus…
- `medir-transcricao.mjs` — medir-transcricao.mjs — onde vão os tokens de um agente: `npm run medir:transcricao -- <transcrição.jsonl> [...]`.
- `medir-transcricao.test.mjs` — medir-transcricao.test.mjs — a medição de uma transcrição: turnos e entrada somada pelo `usage` (uma vez por mensagem), cada resultado de ferramenta na etapa…
- `modelo-de-referencia.mjs` — modelo-de-referencia.mjs — estuda uma malha de terceiros (OBJ, FBX ou glTF) como REFERÊNCIA de forma, sem a levar ao repositório.
- `montagem-da-familia.mjs` — montagem-da-familia.mjs — a montagem v5 que uma família de objeto gera, conferida pela aprovação mecânica.
- `montagem-persistida.test.ts` — @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
- `normais-lisas.test.ts` — normais-lisas.test.ts — a borda do furo serrilhava na bancada, e a peça não tinha culpa: o `freio-disco` já usa 12 lados no furo do prisioneiro e já marca a …
- `objeto.mjs` — objeto.mjs — em que etapa do fluxo um objeto está, e o que vem a seguir.
- `objeto.test.mjs` — objeto.test.mjs — a ferramenta lê cada etapa do fluxo no disco e aponta a primeira que falta.
- `olhar-bancada.mjs` — olhar-bancada.mjs — serviço headless de vistas e sua CLI fina.
- `olhar-bancada.test.mjs` — olhar-bancada.test.mjs — validação antecipada de peças e mitigação de timeout em capturas headless.
- `olhar-montagem.mjs` — olhar-montagem.mjs — CLI fina sobre captura importável de montagem.
- `olhar.mjs` — olhar.mjs — rasteriza SVGs para PNG, para que a IA OLHE o desenho.
- `ombro-uniao.test.ts` — ombro-uniao.test.ts — a rodada do ombro do plano "União de sólidos": a união e o arredondamento sobre superfícies CURVAS facetadas. A fixture (`fixtures/fixt…
- `ondulacao-aneis.test.mjs` — ondulacao-aneis.test.mjs — a leitura de ondulação da chapa com anéis de gaiola em volta de um vão e de um arco
- `ondulacao-da-superficie.mjs` — ondulacao-da-superficie.mjs — acha onde a superfície de subdivisão de uma receita ondula, salta ou dobra fora dos vincos declarados, e diz quanto (em milímet…
- `ondulacao-da-superficie.test.mjs` — ondulacao-da-superficie.test.mjs — a ferramenta de ondulação endereçada sobre a chapa desenhada por código.
- `ondulacao-gota.test.mjs` — ondulacao-gota.test.mjs — a leitura de ondulação das chapas com anel no vão real: a gota estreita e o vão aberto pelas colunas que terminam e começam
- `ondulacao-leitura.test.mjs` — ondulacao-leitura.test.mjs — o dado lido com peso, o aviso de estações próximas e a face virada na ferramenta de ondulação
- `ondulacao-rede.test.mjs` — ondulacao-rede.test.mjs — a leitura de ondulação da chapa lateral montada por rede de curvas
- `origem-das-fontes.test.mjs` — A tabela fonte -> pacote das 27 referências de veículos (docs/mecanifica/veiculos-referencias.json) é conferida contra três coisas que a pessoa ou o agente e…
- `origens-check.mjs` — origens-check.mjs — quem declara de onde vieram os números, declara todos.
- `papeis-do-laco.test.mjs` — papeis-do-laco.test.mjs — os papéis do laço continuam separados e genéricos.
- `parametros-peca.mjs` — parametros-peca.mjs — responde o que dá para mexer numa receita.
- `parametros-peca.test.mjs` — Prova de R00: liberdade declarada não é liberdade real, e a diferença é conferível. O total do acervo é conferido contra a soma dos alvos que o acervo lista,…
- `partes-de-objeto.test.mjs` — partes-de-objeto.test.mjs — um objeto de várias partes é uma pasta com as partes dentro de `partes/`, e cada ferramenta acha a parte pelo nome curto `objeto/…
- `pasta-da-peca.test.mjs` — pasta-da-peca.test.mjs — a peça passa a poder ser uma pasta.
- `peca-com-parametros.mjs` — peca-com-parametros.mjs — executa uma receita com parâmetros trocados e devolve a peça resolvida que o resolvedor de montagem lê.
- `perguntas-da-peca.mjs` — perguntas-da-peca.mjs — as perguntas de forma que o brief do crítico de uma peça traz depois do pacote de imagens.
- `perguntas-da-peca.test.mjs` — perguntas-da-peca.test.mjs — o bloco de perguntas de forma que o brief do crítico da peça traz, lido do PLANO da receita.
- `pngjs.d.ts` — pngjs.d.ts — a declaração mínima do `pngjs` para o typecheck dos testes em TypeScript: o pacote não traz tipos, e `capturar-montagem.test.ts` o usa para mont…
- `portas-espelho-arranja.test.ts` — portas-espelho-arranja.test.ts — prova adversarial de AUT-2026-15: uma interface não pode permanecer no espaço da fonte quando a sua geometria foi copiada. C…
- `procedencia-check.mjs` — Gate N3: contrato reduzido e explícito de procedência da fonte de restrições.
- `procedencia-check.test.mjs` — Provas do gate N3 para procedência de valores estruturais.
- `receita-externa.mjs` — Tradutor da receita do externo (repositório externo da pessoa, `externo/receitas/<id>.json`, já expandida pelo `receita.py`) para o esboço do Modelar, e o ca…
- `receita-externa.test.mjs` — O tradutor da receita do externo: nove receitas reais (as do repositório externo da pessoa, já expandidas), sete sem giro e duas com peças giradas. Cada uma …
- `receita-planejada.mjs` — receita-planejada.mjs — grava a receita planejada de uma peça a partir de uma unidade do esboço aprovado.
- `receita-planejada.test.mjs` — receita-planejada.test.mjs — a receita planejada que o comando grava a partir de uma unidade do esboço.
- `refinamento-global.mjs` — refinamento-global.mjs — o adaptador de disco do refinamento da forma global.
- `refinamento-global.test.mjs` — refinamento-global.test.mjs — de ponta a ponta: a receita que declara REFINA passa pelo veredito da peça e pela guarda do acervo. A mesma receita passa intei…
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
- `silhueta-da-superficie.mjs` — silhueta-da-superficie.mjs — extensão de uma malha de triângulos em fatias ao longo de um eixo, medida na SUPERFÍCIE e não nos vértices.
- `silhueta-da-superficie.test.mjs` — Teto grande: uma placa y = 1 de z = 0 a z = 10 em dois triângulos, só com vértices nas pontas.
- `snapshot-universo-autoria.test.ts` — snapshot-universo-autoria.test.ts — provas da R01.
- `sobreposicao-de-cortes.mjs` — sobreposicao-de-cortes.mjs — os cortes planos do modelo sobre os do sólido do esboço que a receita refina, numa imagem por eixo.
- `sobreposicao-de-cortes.test.mjs` — sobreposicao-de-cortes.test.mjs — os cortes do modelo sobre os do sólido do esboço: o corte de uma malha, o desvio entre as duas linhas, o desenho e, de pont…
- `transformacao-rigida.test.ts` — @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
- `triangulos-da-receita.mjs` — triangulos-da-receita.mjs — os triângulos de uma receita em milímetro, com a parte de cada um, pela mesma triangulação que a cena usa (`adaptarThree`).
- `universo-autoria.mjs` — universo-autoria.mjs — adaptador confinado do snapshot do universo.
- `universo-autoria.test.ts` — universo-autoria.test.ts — contrato estrutural e fixture adversarial da R00.
- `uso.mjs` — uso.mjs — registro local do que a IA pede às ferramentas de entrada, e o resumo dele: `npm run uso`.
- `uso.test.mjs` — uso.test.mjs — o registro de uso: grava uma linha por pedido de ajuda, de roteiro e por recusa; resume o que a IA mais pede e o que não encontra; nunca quebr…
- `varrer-peca.mjs` — varrer-peca.mjs — CLI da varredura paramétrica.
- `varrer-peca.test.mjs` — Prova de R01: a varredura reproduz, sem dica nenhuma, o achado que motivou o plano — e nunca aplica o vencedor que encontra.
- `vinco-na-imagem.test.mjs` — vinco-na-imagem.test.mjs — a dobra viva chega à imagem como aresta, nos dois caminhos de imagem: a cena da bancada (`adaptarThree`, que põe a normal de cada …
- `vincos-da-rede.mjs` — vincos-da-rede.mjs — as peças de `vincos-das-linhas.mjs` para a gaiola que sai de `gaiolaPorRede`: as cadeias são as curvas da rede, a declaração de vinco va…
- `vincos-da-rede.test.mjs` — vincos-da-rede.test.mjs — `vincos-das-linhas` sobre a gaiola por rede de curvas.
- `vincos-das-linhas-chaves.test.mjs` — vincos-das-linhas-chaves.test.mjs — `vincos-das-linhas` cita só nomes que a receita declara e separa a borda de vão.
- `vincos-das-linhas.mjs` — vincos-das-linhas.mjs — casa as linhas 3D lidas do pacote cego com as colunas e as estações nomeadas da gaiola de uma receita de subdivisão (ou com as curvas…
- `vincos-das-linhas.test.mjs` — vincos-das-linhas.test.mjs — os vincos a partir das linhas 3D do pacote, sobre a forma desenhada por código.
- `vinculos-de-medida.test.mjs` — vinculos-de-medida.test.mjs — fatias 1, 2 e 2b do plano "a peça nasce encaixada": formato v5 da montagem, ordem de construção, arestas de medida no mapa, e a…
- `visor-montagem.html` — visor-montagem.html — superfície privada para evidência visual de montagem.
- `visor-montagem.js` — visor-montagem.js — renderizador privado, derivado de montagem já resolvida.
- `vistas-da-receita.mjs` — vistas-da-receita.mjs — a folha de seis vistas de uma receita `.js` do acervo, cada parte com uma cor, para olhar a forma e a divisão em partes.
- `vistas-da-receita.test.mjs` — Testes de vistas-da-receita.mjs: os polígonos da receita em milímetro com as partes na ordem de aparição e a folha de seis vistas pela linha de comando.
- `vistas-de-passos.mjs` — vistas-de-passos.mjs — a folha de seis vistas de um objeto convertido do esboço em receita do Modelar, para conferir o que a conversão e os ajustes fizeram.
- `vistas-para-critica.mjs` — vistas-para-critica.mjs — monta, numa chamada, o pacote que a crítica visual precisa receber: as imagens e o pedido pronto.
- `vistas-para-critica.test.mjs` — vistas-para-critica.test.mjs — o pacote que a crítica visual recebe: o prefixo que apaga as imagens velhas pega só as da peça pedida, a unidade do alvo sai d…
- `vistas-texturizadas.mjs` — vistas-texturizadas.mjs — três vistas de uma peça do acervo COM a textura que a exportação OBJ gera, para quem precisa julgar o acabamento (eletrodoméstico, …

## tools/mecanifica/fixtures/

- `alisar-prova.js` — alisar-prova.js — a chapa desenhada por código para o teste da ferramenta de alisamento.
- `alisar-rede-prova.js` — alisar-rede-prova.js — a chapa lateral por rede de curvas, com os pontos-chave na TABELA, para o teste do alisamento sobre a rede.
- `fixture-cubo-material.js` — fixture-cubo-material.js — caixa com todas as faces em um material declarado, para a exportação OBJ com texturas.
- `fixture-cubo.js` — fixture-cubo.js — receita procedural de teste para exportação CAD/STEP.
- `fixture-erro.js` — fixture-erro.js — receita procedural propositalmente sem partes para teste de falha.
- `fixture-ombro-uniao.js` — fixture-ombro-uniao.js — fixture neutra copiada em 2026-09-29 do ombro do braço robótico (procedural/pecas/braco-robotico/partes/ombro/receita.js), para os t…
- `fixture-uniao.js` — fixture-uniao.js — fixture neutra da fatia 5 do plano "União de sólidos": uma coluna e um braço unidos por `unir`, pousados numa base. Prova que as ferrament…
- `leitura-prova.js` — leitura-prova.js — a chapa curva lida com erro, desenhada por código
- `ondulacao-prova-lisa.js` — ondulacao-prova-lisa.js — a mesma chapa de ondulacao-prova.js sem vinco e sem ondulação plantada, como receita de arquivo (a linha de comando da ferramenta d…
- `ondulacao-prova.js` — ondulacao-prova.js — a chapa desenhada por código para o teste da ferramenta de ondulação endereçada.
- `vincos-das-linhas-chaves-prova.js` — vincos-das-linhas-chaves-prova.js — a forma desenhada por código e as linhas 3D sintéticas do teste de `vincos-das-linhas.mjs` sobre uma gaiola com estações …
- `vincos-das-linhas-prova.js` — vincos-das-linhas-prova.js — a forma desenhada por código e o pacote sintético de linhas 3D do teste de `vincos-das-linhas.mjs`.

## tools/mecanifica/fixtures/contatos/

- `fixture-contato-declarado.js` — Duas partes que se encostam, e a receita DIZ que se encostam. Passa. É a metade do gate que impede a medida de condenar peça correta.
- `fixture-contato-nao-declarado.js` — A MESMA geometria da fixture declarada, sem a declaração. Reprova. O par é idêntico: o que muda é só a receita ter dito ou não.
- `fixture-forma-anel-cumprida.js` — A receita promete um ANEL e entrega um anel. Passa. `lathe` revolve um perfil fechado: o resultado tem furo passante.
- `fixture-forma-anel-quebrada.js` — A MESMA promessa de anel da fixture cumprida, entregue como sólido SEM furo passante. Reprova por forma, e só por forma.
- `fixture-parte-engolida.js` — O caso da roda, em miniatura: uma parte inteiramente dentro da outra. Nenhuma superfície aparece de fora, e por isso nenhuma vista mostra.

## tools/mecanifica/fixtures/contorno-da-imagem/

- `braco-sintetico.mjs` — braco-sintetico.mjs — as duas imagens sintéticas, desenhadas por código, com que o teste do contorno da imagem prova a ferramenta: uma vista lateral de um br…

## tools/mecanifica/fixtures/receita-externa-cadeiras/

- `LEIA-ME.md` — Cadeiras escolhidas como alvo de forma (2026-10-19)

## tools/mecanifica/fixtures/veiculo-caixa/

- `receita.js` — veiculo-caixa — um veículo de caixas, só para os testes das ferramentas que comparam uma receita com uma fonte de referência (comparar-silhueta, folha-compar…

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
- `prancha-dos-contornos.mjs` — prancha-dos-contornos.mjs — a prancha de uma vista desenhada com os contornos que `npm run contorno` tirou da imagem de referência, em milímetro.
- `prancha-dos-contornos.test.mjs` — prancha-dos-contornos.test.mjs — a prancha da lateral do braço sai dos contornos gravados, sem parte fora da silhueta e sem a parte fora do modelo.
- `prancha-geometria.mjs` — prancha-geometria.mjs — traçado 2D em milímetros para as pranchas ortográficas. Tudo aqui devolve POLILINHA AMOSTRADA, nunca comando de SVG: é essa decisão q…
- `prancha-referencia.mjs` — prancha-referencia.mjs — lê uma prancha rasterizada de referência, calibra pixel→milímetro por duas medidas conhecidas e extrai a silhueta como polilinha em …
- `prancha-referencia.test.mjs` — Testes do leitor de referência: decodificação PNG sem dependência, calibração por rodas, simplificação e comparação de silhueta. A prancha real não vive no r…
- `prancha.mjs` — prancha.mjs — motor de prancha ortográfica alvo. Recebe especificação declarativa em milímetros e devolve SVG determinístico MAIS um relatório medido da próp…
- `prancha.test.mjs` — Testes do motor de prancha: filete, âncora proporcional e métrica. O que se prova aqui é o que o plano 2026-08-19-motor-de-prancha-medida pediu — que o desen…

## tools/modelagem/

- `aceite-visual-regional.mjs` — aceite-visual-regional.mjs — v2 do aceite: evidência por região e papel. A v1 continua em aceite-visual.mjs, com suas quatro vistas globais intactas.
- `aceite-visual-regional.test.mjs` — aceite-visual-regional.test.mjs — prova cobertura regional, hashes e crítica obrigatória no aceite v2.
- `aceite-visual.mjs` — aceite-visual.mjs — porteiro de vínculo entre revisão, briefing e evidências visuais.
- `aceite-visual.test.mjs` — aceite-visual.test.mjs — corpus de vínculo, bytes e reprovações visuais.
- `caminho-repositorio.mjs` — caminho-repositorio.mjs — resolução portátil e confinada de repo://.
- `caminho-repositorio.test.mjs` — caminho-repositorio.test.mjs — confinamento de evidências repo:// portátil.
- `comparar-revisao.mjs` — CLI fino: lê dois JSONs, usa somente o núcleo puro e escreve JSON canônico.
- `critica-modelagem.mjs` — CLI fino: valida crítica sem abrir navegador, peça ou Oficina.
- `critica-visual.test.mjs` — crítica-visual.test.mjs — contrato neutro e reexecutável de achados visuais.
- `fechar-aceite-visual.mjs` — fechar-aceite-visual.mjs — fecha tecnicamente uma revisão privada só após conferir briefing, modelo, arquivos e crítica pelo porteiro visual.
- `fechar-aceite-visual.test.mjs` — fechar-aceite-visual.test.mjs — o fechamento não concede aceite retroativo.
- `formato-pacote.mjs` — formato-pacote.mjs — contrato pequeno, estrito e canônico do pacote de modelagem assistida. Não conhece Three.js, domínio automotivo ou runtime de navegador:…
- `preparar-pacote.mjs` — preparar-pacote.mjs — cria só o esqueleto canônico; uma pasta já existente é sempre erro. Assim, uma segunda tentativa nunca apaga briefing ou crítica.
- `revisao-modelagem.mjs` — Revisão de modelagem — núcleo puro do ciclo assistido por IA.
- `revisar-pacote.mjs` — revisar-pacote.mjs — marco 2 do fluxo assistido: a única ponte entre o pacote, a régua headless e as quatro câmeras da bancada.
- `validar-pacote.mjs` — validar-pacote.mjs — porta fail-closed do marco 1. Lê, exige bytes canônicos e confere o alvo com a régua headless assim que a fonte canônica existir.

## tools/oficina/

- `argumento-desconhecido.test.mjs` — Argumento fora do contrato da operação GRITA, e o passo não roda.
- `busca-vazia-diz-por-que.test.mjs` — Busca que volta vazia diz por quê.
- `chao-do-ciclo6.test.ts` — chao-do-ciclo6.test.ts — caso vermelho da quinta propriedade: um triângulo emitido pode ter área zero mesmo com núcleo, adaptador e casca saudáveis.
- `conferir-malha.ts` — conferir-malha.ts — a conferência única que todo teste de op nova chama.
- `furo-ordens-de-ponte.test.ts` — furo-ordens-de-ponte.test.ts — as promessas do A-30 que a geometria sozinha não mostra.
- `oficina.test.ts` — Vitest do NÚCLEO da OFICINA (passo 1): prova os invariantes de identidade — numeração determinística e POSICIONAL (re-rodar dá ids idênticos), identidade est…

## tools/testes/

- `nenhum-teste-desligado.test.mjs` — nenhum-teste-desligado.test.mjs — recusa teste desligado para sempre.
