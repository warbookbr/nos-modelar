# Pesquisa aberta de 2026-10

Quatro pesquisas abertas, feitas em 2026-10-07 sem contexto do projeto e sem filtro de aplicabilidade, para achar ferramentas, técnicas e ideias que uma pesquisa específica não traria. Os temas foram modelagem por código e paramétrica, geração procedural em jogos e VFX, IA e 3D, e áreas vizinhas (fabricação, robótica, arquitetura, dobradura, simulação). A quinta, de addons do Blender, foi feita por outra IA e está no fim, com os links que ela listou à parte, também não conferidos.

A busca na web devolveu pouco em três das quatro pesquisas. Só os itens marcados como vistos na busca, (V) ou (web), e a seção de IA e 3D vieram de resultado de busca; o resto vem do conhecimento prévio do modelo, com links canônicos que não foram abertos. Confira o link antes de citar ou de basear trabalho num item. Este documento é material de partida para escolher o que trazer ao Mecanifica e não autoriza implementação; o que for escolhido entra pela [lista de ferramentas por objeto](FERRAMENTAS-POR-OBJETO.md) e por plano. As [análises de 2026-10](ANALISES-DE-2026-10.md) cruzam esta pesquisa com o Mecanifica.


## Modelagem 3D por código e paramétrica: achados

Nota de método: duas buscas na web confirmaram os itens marcados com (web); os demais vêm de conhecimento prévio, com links canônicos conhecidos, e não foram reabertos nesta sessão.

### Kernels B-Rep e bibliotecas Python
1. CadQuery (web) — https://github.com/CadQuery/cadquery — Biblioteca Python sobre OpenCascade com API encadeada por seleção de faces e arestas. Interessante pelo seletor de topologia em string, que descreve geometria sem índices.
2. build123d — https://github.com/gumyr/build123d — Sucessor em modo builder e em modo algébrico (operadores entre formas), com localização por Plane e Location. Interessante pela expressividade sem estado global no modo algébrico.
3. cq-editor / cq-cli (web) — https://github.com/CadQuery/CQ-editor — Editor com visualização viva e CLI para exportar scripts. Útil como modelo de laço edita-e-vê.
4. awesome-cadquery (web) — https://github.com/CadQuery/awesome-cadquery — Lista curada de scripts CadQuery. Fonte de receitas reais.
5. SolidPython2 — https://github.com/jeff-dh/SolidPython — Gera OpenSCAD a partir de Python. Interessante para reaproveitar o ecossistema SCAD com linguagem completa.
6. pythonOCC — https://github.com/tpaviot/pythonocc-core — Binding completo do OpenCascade em Python. Serve quando CadQuery fica estreito.
7. Build123d-based text-to-cad skills (web, skills.sh implicit-cad) — https://www.skills.sh/earthtojake/text-to-cad/implicit-cad — Skill de agente que escreve módulos .implicit.js com SDF em GLSL. Interessante por já ser CAD pensado para LLM.

### Linguagens e DSLs próprias
8. OpenSCAD — https://openscad.org — CSG funcional declarativo, o clássico. Interessante pela comunidade e pelo vasto acervo de bibliotecas (BOSL2).
9. BOSL2 — https://github.com/BelfrySCAD/BOSL2 — Biblioteca grande para OpenSCAD com anexos (attachments) que posicionam partes por âncoras nomeadas. Boa ideia de encaixe semântico.
10. ImplicitCAD (web) — https://github.com/Haskell-Things/ImplicitCAD — Linguagem estilo OpenSCAD em Haskell com arredondamento implícito suave. Interessante pelo arredondamento de união nativo.
11. Curv — https://github.com/curv3d/curv — Linguagem funcional para SDF com GPU e relevo de arte generativa. Interessante pela cadeia de modelagem puramente matemática.
12. libfive / Studio — https://libfive.com — Kernel de modelagem implícita com Scheme e Python, malha por dual contouring. Interessante pela fidelidade de arestas vivas em implícitos.
13. Fidget — https://github.com/mkeeter/fidget — Kernel implícito em Rust com JIT, mesmo autor do libfive. Interessante pela velocidade de avaliação.
14. sdfx (web) — https://github.com/deadsy/sdfx — CAD em Go com SDF 2D e 3D, filete e chanfro triviais. Interessante por compilar para binário único.
15. Implicit.js / skills de GLSL (web) — https://www.skills.sh/earthtojake/text-to-cad/implicit-cad — Modelos como função GLSL renderizados no navegador. Interessante pela pré-visualização instantânea.
16. GCL Omega (web) — https://breakingthebottleneck.substack.com/p/friday-5-blake-courter-co-founder — SDK de geometria implícita pura como código, defendida como melhor casamento com LLMs. Interessante pela tese.
17. nTop codereps (web) — https://www.ntop.com/resources/product-updates/codereps-a-better-way-to-communicate/ — Fluxo de nTop vira código legível. Interessante por serializar um grafo visual em texto.
18. ShapeScript — https://shapescript.info — Linguagem declarativa para macOS e iOS com bom retorno visual. Nicho Apple.
19. Tinkercad Codeblocks — https://www.tinkercad.com/codeblocks — Blocos visuais que geram sólidos. Interessante como porta de entrada pedagógica.
20. AngelCAD (web) — https://github.com/arnholm/angelcad — Modelador sólido por script com AngelScript. Nicho de C++.

### JS, web e Rust
21. Cascade Studio (web) — https://github.com/zalo/CascadeStudio — IDE de CAD com OpenCascade.js no navegador. Interessante por rodar tudo no cliente.
22. replicad — https://github.com/sgenoud/replicad — Biblioteca JS sobre OpenCascade.js com API amigável e estúdio online. Interessante para integrar a apps web.
23. JSCAD (OpenJSCAD) — https://github.com/jscad/OpenJSCAD.org — CSG em JavaScript, módulos npm. Interessante pelo ecossistema npm.
24. Manifold — https://github.com/elalish/manifold — Biblioteca CSG robusta e rápida em C++ com bindings JS, usada pelo OpenSCAD novo. Interessante pela garantia de malha válida.
25. Truck — https://github.com/ricosjp/truck — Kernel B-Rep em Rust puro com WebGPU. Interessante por fugir do OpenCascade.
26. Fornjot — https://github.com/hannobraun/fornjot — Kernel B-Rep em Rust, experimental e ambicioso. Interessante pela arquitetura de código-primeiro.
27. Buerli (web) — https://buerli.io — CAD programático não-variedade para a web. Interessante pelo kernel orientado a histórico em JS.
28. three.js CSG / three-bvh-csg — https://github.com/gkjohnson/three-bvh-csg — Booleanas em malhas Three.js. Interessante por rodar no mesmo grafo de cena.

### Ferramentas CAD com script ou paramétrica visual
29. FreeCAD (Python, Part Design, Assembly) — https://www.freecad.org — CAD completo com API Python e macros. Interessante pelo modelo de documento com dependências.
30. Onshape FeatureScript — https://cad.onshape.com/FsDoc/ — Linguagem que define features do CAD nativo na nuvem. Interessante porque as features do usuário valem como as nativas.
31. Grasshopper — https://www.grasshopper3d.com — Programação visual paramétrica para Rhino. Interessante pelo ecossistema de plugins.
32. Houdini (VEX, procedural) — https://www.sidefx.com/products/houdini/ — Redes de nós procedurais com reexecução total. Interessante como modelo de pipeline determinístico.
33. Blender Geometry Nodes — https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/ — Nós procedurais para malhas dentro do Blender. Interessante pelos campos (fields) avaliados por ponto.
34. Dynamo — https://dynamobim.org — Visual para Revit e Civil 3D. Nicho BIM paramétrico.
35. SolveSpace — https://solvespace.com — CAD paramétrico leve com solver de restrições próprio e biblioteca embutível. Interessante pelo solver reutilizável.
36. Fusion 360 API / Autodesk Forge — https://aps.autodesk.com — Automação por Python e JS de um CAD comercial. Interessante para geração em lote.

### Ideias estranhas ou de nicho
37. Shadertoy e raymarching de SDF — https://www.shadertoy.com — Cenas inteiras como uma função GLSL por pixel. Interessante pelo vocabulário de operadores de SDF de Inigo Quilez (https://iquilezles.org/articles/distfunctions/).
38. Dual contouring / Marching cubes lib (Mikola Lysenko) — https://github.com/mikolalysenko/isosurface — Extração de malha de campos escalares em JS. Interessante como etapa final de qualquer SDF.
39. CadQuery + LLM (Text2CAD, CADCodeVerify) — https://arxiv.org/abs/2410.05340 — Pesquisa que gera CadQuery com LLM e verifica por renderização. Interessante pelo laço de verificação visual.
40. Sverchok — https://github.com/nortikin/sverchok — Nós paramétricos para Blender, grande acervo matemático. Interessante pelas superfícies matemáticas.
41. OpenSCAD playground/WASM — https://ochafik.com/openscad2/ — OpenSCAD compilado para WebAssembly no navegador. Interessante por rodar sem servidor.
42. Bitbybit — https://bitbybit.dev — CAD paramétrico no navegador com blocos, Rete e TypeScript sobre OpenCascade. Interessante pelas três interfaces para o mesmo kernel.

## Geração procedural de geometria em jogos, VFX e arte digital

Nota de método: os achados 1 a 12 apareceram nas buscas desta sessão (URLs vistas nos resultados). Os achados 13 a 34 vêm de conhecimento prévio, com URLs canônicas que não foram abertas nesta sessão; confirme os links antes de citar.

### Confirmados nas buscas

1. Wave Function Collapse (Maxim Gumin) — https://github.com/mxgmn/WaveFunctionCollapse — Algoritmo de satisfação de restrições que gera bitmaps e tilemaps a partir de uma amostra ou de regras de adjacência. Interessa por ser a referência de quase toda implementação posterior e por ter virado vocabulário comum de PCG.
2. Model Synthesis (Paul Merrell) — https://paulmerrell.org/model-synthesis/ — Técnica de 2007 que gera modelos 3D grandes a partir de um exemplo pequeno, anterior ao WFC e quase idêntica a ele. Interessa pela tese e pelas variantes que modificam o modelo em blocos, que tratam escala melhor que o WFC.
3. Model Synthesis and Modifying in Blocks (Boris the Brave) — https://www.boristhebrave.com/2021/10/26/model-synthesis-and-modifying-in-blocks/ — Explica como regerar só uma região do resultado mantendo a vizinhança. Interessa para edição local e regeneração incremental de conteúdo procedural.
4. Tessera (Boris the Brave) — https://www.boristhebrave.com/ (projeto Tessera) — Addon de Unity para geração 3D por tiles com WFC, com restrições e controle de repetição. Interessa pelo artigo sobre tornar o WFC menos monótono em escalas grandes.
5. Driven WaveFunctionCollapse — https://www.boristhebrave.com/2021/06/06/driven-wavefunctioncollapse — WFC guiado por um mapa externo que dirige quais tiles aparecem onde. Interessa como ponte entre geração por regra e controle artístico.
6. Wave Function Collapse tips and tricks — https://www.boristhebrave.com/2020/02/08/wave-function-collapse-tips-and-tricks/ — Compilação de armadilhas práticas: contradições, backtracking, pesos, simetrias. Interessa como guia de implementação mais útil que o repositório original.
7. Infinite procedural city (Marian42) — https://github.com/marian42/wavefunctioncollapse — Cidade infinita montada com WFC em blocos 3D, navegável em primeira pessoa. Interessa pelo tratamento de geração infinita por chunks e pela estética coerente com poucos tiles.
8. Townscaper e "Organic Towns from Square Tiles" (Oskar Stålberg) — https://www.gamedeveloper.com/blogs/how-townscaper-works-a-story-four-games-in-the-making — Grade irregular subdividida em quadriláteros com WFC sobre ela para gerar edifícios a partir de cliques. Interessa por mostrar tiles em grade deformada, sem grade ortogonal.
9. DeBroglie (Boris the Brave) — https://github.com/BorisTheBrave/DeBroglie — Biblioteca C# de WFC com restrições, caminhos e topologias além da grade. Interessa por separar o solver do domínio.
10. Unreal Engine PCG Framework — https://dev.epicgames.com/documentation/en-us/unreal-engine/procedural-content-generation-overview — Sistema de grafos de pontos e atributos em tempo de edição e de execução. Interessa pela geração em runtime com hierarquia de grades e pelo Electric Dreams como amostra.
11. Houdini Engine em jogos (GDC 2017, Robert Magee) — https://80.lv/articles/gdc-2017-procedural-assets-for-ue4/ — Ativos procedurais do Houdini carregados no Unreal com parâmetros expostos. Interessa como origem do fluxo de ativos digitais parametrizáveis.
12. ProcGenMod — https://github.com/spaceribs/ProcGenMod — Editor de nós inspirado no Houdini feito sobre a API Python do Blender. Interessa como experimento de camada de nós própria sobre um host existente.

### De conhecimento prévio (URLs a confirmar)

13. Sverchok — https://github.com/nortikin/sverchok — Addon de nós paramétricos do Blender com foco em matemática e arquitetura. Interessa por ter existido antes dos Geometry Nodes e ter nós de superfícies, campos e solvers.
14. Geometry Nodes Fields (Blender) — https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/fields.html — Avaliação preguiçosa de campos por elemento da geometria. Interessa como modelo de dados alternativo ao fluxo de listas.
15. Molecular Nodes — https://github.com/BradyAJohnston/MolecularNodes — Importa estruturas moleculares e as anima com Geometry Nodes. Interessa como uso científico de geometria procedural.
16. CityEngine e CGA (Müller, Wonka) — https://www.esri.com/en-us/arcgis/products/arcgis-cityengine/overview — Gramática de formas contextual para edifícios e cidades. Interessa pelo artigo "Procedural Modeling of Buildings" e pela linguagem de regras como arquivo versionável.
17. Split Grammars (Wonka et al., 2003) — https://dl.acm.org/doi/10.1145/882262.883001 — Gramática de fachadas por divisão de retângulos com atributos. Interessa como base teórica de layouts de fachada.
18. L-systems e "The Algorithmic Beauty of Plants" — http://algorithmicbotany.org/papers/#abop — Livro gratuito sobre gramáticas paralelas para plantas. Interessa pela ligação entre regra, crescimento e ramificação.
19. Dual Contouring e Surface Nets (Boris the Brave) — https://www.boristhebrave.com/2018/04/15/dual-contouring-tutorial/ — Extração de malha de campos de distância preservando quinas. Interessa para terreno voxel e escultura com arestas vivas.
20. libfive — https://libfive.com — Kernel de modelagem sólida funcional por funções implícitas com malhas que preservam arestas. Interessa como CAD programável por SDF.
21. Womp — https://womp3d.com — Modelador 3D em navegador baseado em SDF e operações booleanas suaves. Interessa pela escultura sem malha explícita.
22. Shadertoy e SDF raymarching (Inigo Quilez) — https://iquilezles.org/articles/distfunctions/ — Catálogo de primitivas e operadores de distância assinada. Interessa como biblioteca de formas matematicamente curtas.
23. Wang tiles e Wang cubes — https://en.wikipedia.org/wiki/Wang_tile — Ladrilhos com bordas coloridas que impõem adjacência e geram padrões aperiódicos. Interessa como precursor teórico do WFC.
24. Quadtree/Octree adaptativo e Voronoi em jogos (Amit Patel, Red Blob Games) — https://www.redblobgames.com/ — Artigos interativos sobre mapas de polígonos, grades hexagonais e ruído. Interessa pela clareza e pela cobertura de ruído, rios e distribuições.
25. Poisson disk e distribuição por blue noise — https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf — Amostragem rápida de pontos espaçados uniformemente. Interessa para espalhar objetos sem aglomeração, base de scatter em PCG.
26. Wave Function Collapse em Caves of Qud — https://www.gamedeveloper.com/design/the-procedural-generation-of-caves-of-qud — Palestras de Brian Bucklew sobre geração de ruínas e história. Interessa por misturar geometria, texto e simulação histórica.
27. Dwarf Fortress e geração de mundo — https://www.bay12games.com/dwarves/ — Geração de terreno por erosão, clima e história encadeados. Interessa como exemplo extremo de camadas de simulação.
28. Spelunky, geração por trilha de salas (Derek Yu) — https://spelunkyworld.com/ — Níveis por trilha garantida de salas com blocos pré-feitos. Interessa como PCG por template que garante solucionabilidade.
29. Substance 3D Designer — https://www.adobe.com/products/substance3d/apps/designer.html — Grafos procedurais de texturas e materiais com parâmetros expostos. Interessa por ser o equivalente do Houdini para superfícies.
30. Tyflow — https://www.tyflow.com — Sistema de partículas e geometria procedural para 3ds Max. Interessa pela simulação de multidões e fragmentação sem sair do host.
31. Geometry Script (Unreal) — https://dev.epicgames.com/documentation/en-us/unreal-engine/geometry-scripting-users-guide-in-unreal-engine — Operações de malha por Blueprint e Python no editor e em runtime. Interessa como API de modelagem sem nós.
32. Open CASCADE e CadQuery — https://github.com/CadQuery/cadquery — CAD paramétrico em Python sobre kernel B-rep. Interessa como alternativa de código para peças mecânicas exatas.
33. OpenSCAD — https://openscad.org — Modelagem sólida construtiva puramente textual e determinística. Interessa pela reprodutibilidade total e por décadas de bibliotecas.
34. Inigo Quilez, "Painting a Landscape with Maths" e pesquisas de ruído — https://iquilezles.org/articles/ — Terrenos, árvores e nuvens gerados por funções curtas. Interessa pelo equilíbrio entre qualidade visual e custo.
35. Wave Function Collapse infinito em Bad North — https://www.badnorth.com — Ilhas geradas por modelo sintético com camadas de regras. Interessa pelo resultado legível em jogo comercial.
36. Procedural Content Generation in Games (livro) — http://pcgbook.com — Livro aberto com capítulos sobre gramáticas, restrições, busca e avaliação. Interessa como mapa acadêmico do campo.
37. Marching Cubes e Marching Tetrahedra — https://paulbourke.net/geometry/polygonise/ — Referência clássica de tabelas e código para isosuperfícies. Interessa como ponto de partida de terrenos volumétricos.
38. Gaea e World Machine — https://quadspinner.com — Geração de terreno por erosão e nós. Interessa pela erosão hidráulica realista em tempo curto.

## IA e 3D: achados de pesquisa aberta (2026-10-07)

Os dados vêm de resultados de busca e de resumos dos próprios resultados; nenhum artigo foi lido por inteiro. Números citados são os que o resumo da busca informava.

### CAD e código paramétrico

1. Text-to-CadQuery. https://arxiv.org/pdf/2505.06507. Gera código CadQuery direto do texto, depois de ajustar seis LLMs abertos em 170 mil anotações CadQuery sobre o Text2CAD. Interessa por dispensar representação intermediária e ter dataset reaproveitável.
2. CAD-Coder. https://neurips.cc/virtual/2025/poster/118098. Ajusta o modelo em scripts CadQuery e depois aplica RL (GRPO) com recompensa geométrica, usando 110 mil trincas texto, código e sólido e cadeia de pensamento de planejamento. Interessa pela recompensa medida na geometria resultante, que é verificável.
3. CADmium. https://arxiv.org/pdf/2507.09792. Trata CAD como texto para texto: o GPT-4.1 descreveu 176 mil objetos e o Qwen2.5-Coder foi ajustado com LoRA para voltar à sequência CAD. Interessa pelo método de gerar descrições sintéticas a partir de geometria existente.
4. CADFusion. https://github.com/microsoft/CADFusion (artigo https://arxiv.org/abs/2501.19054v3). Alterna treino em sequências paramétricas com treino de feedback visual que premia objetos renderizados preferidos. Interessa por usar a imagem renderizada como sinal de correção do código.
5. ReCAD. https://arxiv.org/html/2512.06328v1. Modelo visão-linguagem com RL para gerar CAD paramétrico. Interessa como exemplo de RLVR aplicado a CAD.
6. cadrille. https://www.alphaxiv.org/overview/2505.22914. Reconstrução CAD multimodal (nuvem de pontos, imagem, texto) para script Python, com segunda etapa de RL online. Interessa por unir três entradas num mesmo modelo.
7. CADENA, engenharia reversa passo a passo. https://arxiv.org/pdf/2608.00799. Reconstrói CAD em etapas sucessivas, e não de uma vez. Interessa pela decomposição incremental, parecida com receita de passos.
8. ReACT. https://ojs.aaai.org/index.php/AAAI/article/view/37360. Formula a reconstrução de sequência CAD a partir de nuvem de pontos como processo de decisão de Markov com recompensa de forma. Interessa pela ideia de recompensa de longo prazo sobre a forma.
9. Point2CAD. https://arxiv.org/pdf/2312.04962. Segmenta a nuvem e ajusta primitivas por otimização, sem aprendizado, incluindo superfícies livres. Interessa como linha de base sem modelo treinado.
10. CADReasoner-PC. https://huggingface.co/kulibinai/cadreasoner-pc. Variante de nuvem de pontos de um modelo de raciocínio CAD publicado no Hugging Face. Interessa por ser um peso aberto utilizável direto.
11. BrepGen. https://arxiv.org/pdf/2401.15563 (código https://github.com/samxuxiang/BrepGen). Difusão que gera B-rep direto como árvore de faces, arestas e vértices, com topologia dada por nós duplicados. Interessa por incluir superfícies livres e permitir autocompletar CAD.
12. OpenSCAD Pantheon, benchmark prático. https://modelrift.com/blog/openscad-llm-benchmark. Compara ferramentas de código (Codex, Claude, Cursor, Antigravity) transformando referência arquitetônica em OpenSCAD paramétrico. Interessa por ser comparação informal e reproduzível entre agentes.
13. P3D-Bench. https://arxiv.org/pdf/2606.11152. Mede MLLMs em geração 3D paramétrica e raciocínio estrutural, com saída OpenSCAD e métricas geométricas e estéticas. Interessa como benchmark de código de forma, e não de malha.
14. Human-in-the-Loop, avaliação quantitativa de modelos 3D por LLM. https://arxiv.org/pdf/2509.07010. Mede a qualidade de modelos 3D gerados por LLM com humano no laço. Interessa pela metodologia de medida.

### Agentes que modelam e procedurais

15. Procedura. https://arxiv.org/pdf/2608.26238. Agente que escreve objetos como montagens procedurais, parte por parte, com encaixes tipados verificáveis por máquina e verificação de compilação, encaixe e conectividade a cada passo. Interessa por ser quase o mesmo desenho de partes nomeadas e contatos checáveis.
16. ShapeLib. https://arxiv.org/abs/2502.08884 (versão 2: https://arxiv.org/html/2502.08884v2). Pede ao LLM que projete uma biblioteca de funções de abstração de forma, com interfaces semanticamente alinhadas, e edite formas editando programas. Interessa por tratar a biblioteca como saída do modelo.
17. ShapeCraft. https://arxiv.org/abs/2510.17603v1. Multiagente que representa o ativo como programa de forma, com grafo procedural de subtarefas. Interessa pela decomposição de linguagem em grafo.
18. ShapeAssembly. https://ar5iv.labs.arxiv.org/html/2009.08026. Linguagem de montagem de formas com cuboides ligados hierarquicamente e por simetria. Interessa como DSL pequena e antiga que continua servindo de base.
19. 3D-GPT. https://arxiv.org/pdf/2310.12945. Três agentes (concepção, modelagem, despacho) que comandam um gerador procedural no Blender. Interessa pela divisão de papéis.
20. WorldCraft. https://arxiv.org/html/2502.15601v1. Agentes LLM sobre geração procedural para cenas internas e externas, com controle por linguagem de atributos e layout. Interessa pela edição por comando.
21. InfiniBench. https://arxiv.org/pdf/2511.18200. Traduz descrição de cena em restrições procedurais e resolve com motor de layout por clusters, para benchmark de raciocínio espacial com complexidade ajustável. Interessa por gerar o teste sob medida.
22. Blender MCP, mcp-3d-modeling-agent. https://glama.ai/mcp/servers/l4w3j954v2. Servidor MCP com 218 ferramentas e laço planejar, executar, observar, revisar e replanejar sobre o Blender. Interessa pelo catálogo de ferramentas e pelo laço fechado.
23. Blender MCP com geração, busca e animação. https://blenderartists.org/t/open-source-blender-mcp-with-fast-3d-generation-search-and-instant-text-to-animation-auto-rigging/1589568. Versão aberta que acrescenta geração 3D, busca de ativos e rigging automático. Interessa por juntar modelagem e animação num agente.
24. VideoCAD. https://arxiv.org/pdf/2505.24838. Dataset e modelo de interações de interface CAD em vídeo de longo horizonte, com VQA para MLLMs. Interessa porque o GPT-4.1 acertou só 47% na contagem de extrusões.

### Malhas e LLMs

25. LLaMA-Mesh. https://arxiv.org/html/2411.09595v1. Escreve vértices e faces como texto simples, sem ampliar o vocabulário. Interessa pela simplicidade da representação.
26. MeshLLM. https://arxiv.org/html/2508.01242v2. Treina com inferência de conectividade a partir dos vértices e montagem local de malha, superando o LLaMA-Mesh. Interessa pelo foco em topologia.
27. ShapeLLM-Omni. https://arxiv.org/pdf/2506.01853. LLM multimodal nativo que gera e entende 3D com tokenizador de forma. Interessa por unir texto, imagem e 3D no mesmo modelo.
28. Omni123. https://arxiv.org/pdf/2604.02289. Modelo nativo 3D que compensa pouco dado 3D unificando geração de texto para 2D e 3D. Interessa pela estratégia contra a escassez de dados.
29. TRELLIS.2, latentes nativos e compactos. https://www.microsoft.com/en-us/research/publication/native-and-compact-structured-latents-for-3d-generation/. Representação de voxel esparso O-Voxel que cobre topologia aberta, não variedade e PBR, com VAE de compressão esparsa. Interessa por modelar superfícies abertas e materiais.
30. LATO. https://arxiv.org/pdf/2512.14692. Voxel esparso que preserva topologia, com malha como campo de deslocamento de vértices e síntese por flow matching. Interessa por gerar malha explícita sem passar por campo implícito.

### Montagem, articulação e física

31. MUSE. https://www.alphaxiv.org/abs/2605.28579. Benchmark de texto para CAD de montagens B-rep, com checagem de código, geometria (estanque, sem interpenetração) e alinhamento de intenção por juiz VLM com rubrica. Interessa por medir montabilidade, e não só similaridade.
32. AssemCAD. https://djaym7-arxivmedia.hf.space/post/246269. Geração de montagem pronta para produção a partir de linguagem, com fábricas paramétricas de componentes reutilizáveis e o dataset AssemBench. Interessa pela síntese sob demanda de componentes.
33. Foundation Models for Automatic CAD Generation (LLMForge). https://arxiv.org/pdf/2607.05573. Estudo empírico com 97 problemas de engenharia, validação JSON schema e refino iterativo com crítica geométrica ou por VLM. Interessa por comparar os dois regimes de crítica.
34. Manual-PA. https://arxiv.org/pdf/2411.18011. Prevê ordem e pose 6DoF das peças de móveis a partir dos diagramas do manual. Interessa por usar manual ilustrado como entrada de montagem.
35. Manual2Skill. https://arxiv.org/pdf/2502.10090. Lê manuais com VLM para extrair habilidades de montagem de móveis por robô. Interessa por ligar documento a ação.
36. URDF-Anything. https://proceedings.neurips.cc/paper_files/paper/2025/hash/88445acb45c922bdb06952e31f8a60ec-Abstract-Conference.html. LLM 3D que segmenta partes e prevê parâmetros cinemáticos em uma passada, com token [SEG]. Interessa por gerar articulação executável.
37. ArtiWorld. https://arxiv.org/pdf/2511.12977. Converte objetos rígidos em cena para URDF articulado com um módulo LLM de inferência estrutural. Interessa pelo uso do conhecimento prévio do LLM sobre mecanismos.
38. Optimize Any Topology. https://arxiv.org/pdf/2510.23667. Modelo de fundação para otimização topológica, treinado em 2,2 milhões de estruturas (OpenTO), com inferência abaixo de 1 s. Interessa por substituir solver por difusão condicional.
39. PhysiOpt. https://csail-dev-2025.csail.mit.edu/node/13895. Otimizador diferenciável que melhora o comportamento físico de saídas de modelos generativos 3D no espaço latente. Interessa por tornar peças geradas fisicamente plausíveis.

### Avaliação e datasets

40. DB-3DME. https://arxiv.org/pdf/2606.10142. 2.619 malhas sintéticas com notas humanas de geometria e aderência ao prompt; um Qwen-2.5-VL-7B ajustado superou VLMs gerais. Interessa como juiz barato e alinhado a humanos.
41. 3D-DefectBench. https://arxiv.org/pdf/2607.10826. Nove defeitos binários finos (geometria, textura, prompt) para pipelines de VLM; seis vistas RGB funcionaram quase tão bem quanto vistas densas. Interessa pelo achado prático sobre quantas vistas renderizar.
42. Revisiting 3D LLM Benchmarks. https://arxiv.org/html/2502.08503v3. Questiona se os benchmarks de LLM 3D realmente exigem capacidade 3D. Interessa como alerta de validade de teste.
43. NoReGeo. https://arxiv.org/pdf/2601.10254. 2.500 problemas geométricos triviais; o melhor modelo proprietário chegou a cerca de 65%, contra 74,5% humano. Interessa por mostrar que falta intuição geométrica básica.
44. DeepCAD. https://arxiv.org/pdf/2105.09492. 178 mil designs como sequências de comandos CAD, com comprimento máximo de 60. Interessa como dataset de referência e pelo seu limite.
45. HistCAD. https://www.emergentmind.com/topics/histcad. Dataset com sequências de modelagem com restrições, renders, STEP, arquivos nativos e anotações. Interessa por alinhar cinco modalidades.
46. Fusion 360 Gallery e ABC. https://www.ijcai.org/proceedings/2023/0200.pdf. Contexto de datasets: 8.625 sequências humanas de esboço e extrusão, e cerca de 1 milhão de B-reps do Onshape sem histórico. Interessa pela diferença entre ter ou não o histórico de operações.

## Áreas vizinhas à modelagem 3D: achados

Nota de método: a busca web devolveu pouco além de origami computacional, DFM comercial e MuJoCo. Os demais achados vêm do conhecimento prévio, com URLs canônicas dos projetos, e não foram abertos nesta rodada. Os marcados com (V) apareceram nos resultados de busca desta sessão.

### Origami e dobradura

1. Origamizer (V) — https://origami.c.u-tokyo.ac.jp/~tachi/software/ — Gera um padrão de vincos que, dobrado, reproduz uma superfície triangulada qualquer. Interessante como exemplo de "forma-alvo para receita de operações" com prova de que a receita reproduz o alvo.
2. Freeform Origami (V) — https://origami.c.u-tokyo.ac.jp/~tachi/software/ — Arrastar um vértice 3D atualiza o padrão de vincos em tempo real e mostra se continua dobrável como corpo rígido. Útil como modelo de edição direta que preserva uma restrição cinemática.
3. Rigid Origami Simulator (V) — https://origamisimulator.org/ — Simula dobras rígidas e dobras com deformação no navegador, com padrão carregável. Mostra um validador de mobilidade rodando em JS puro.
4. Oriedita / ORIPA — https://github.com/oriedita/oriedita — Editores de padrão de vincos com regras de Huzita-Justin e checagem de planificabilidade (teoremas de Kawasaki e Maekawa). Regras locais simples que decidem validade global.
5. TreeMaker (Robert Lang) (V) — https://langorigami.com/article/treemaker/ — Converte uma árvore de comprimentos de membros num padrão de vincos por empacotamento de círculos. Exemplo de projeto declarativo: descreve-se a estrutura e o algoritmo acha a geometria.

### Fabricação, CNC e chapa

6. FreeCAD Sheet Metal Workbench — https://wiki.freecad.org/SheetMetal_Workbench — Dobra e planifica chapa com fator K e relevos de canto. Interessante porque toda peça de chapa tem duas representações, dobrada e plana, que precisam concordar.
7. Fusion/Onshape "DFM check" e HCL DFMPro (V) — https://www.hcltechsw.com/dfmpro — Checam espessura mínima de parede, ângulo de saída, acesso de ferramenta e furo cego contra regras por processo. Modelo de gates por processo de fabricação, separados da geometria.
8. Toolpath Design Advisor (V) — https://toolpath.com/platform/design-advisor — Simula a usinagem 3 eixos e devolve custo e alertas ao projetista. Mostra "simular o processo para criticar o desenho".
9. OpenCAMLib / FreeCAD CAM (Path) — https://github.com/aewallin/opencamlib — Biblioteca de cálculo de trajetória de ferramenta (drop cutter, waterline). A geometria de varredura de ferramenta é uma medida de acessibilidade reutilizável.
10. Kiri:Moto — https://grid.space/kiri/ — Fatiador e gerador de CAM no navegador, FDM, laser e CNC. Prova de que um pipeline completo de fabricação cabe em uma página estática.
11. LightBurn / Inkscape + Boxes.py — https://github.com/florianfesti/boxes — Gera caixas para corte a laser com juntas de dedo parametrizadas, centenas de tipos. Catálogo de peças definidas só por parâmetros e tolerância de corte (kerf).
12. Tolerâncias e ajustes ISO 286 / tabelas de ajuste — https://www.iso.org/standard/45975.html — Define classes de ajuste folgado, de transição e de interferência por diâmetro nominal. Fonte de valores de folga normalizados para encaixes entre peças.

### Impressão 3D

13. PrusaSlicer/OrcaSlicer: análise de overhang e suportes de árvore — https://github.com/SoftFever/OrcaSlicer — Detectam balanço, ponte e necessidade de suporte por ângulo e comprimento. Uma medida de "imprimível" derivada só da malha.
14. Print-in-place e juntas de dobradiça (Thingiverse/Printables) — https://www.printables.com/ — Mecanismos impressos já montados dependem de folga fixa entre superfícies. Fonte de exemplos reais de folga mínima e de falhas.
15. Cura/Slic3r "Mesh Fix" e Meshmixer — https://github.com/meshmixer — Reparo de malha: furos, normais, auto-interseções, variedade (manifold). Lista de defeitos de malha que um gate de integridade poderia checar.
16. Manifold (biblioteca CSG robusta) — https://github.com/elalish/manifold — Operações booleanas em malha com garantia de saída variedade, usada em OpenSCAD e Blender. Alternativa de CSG com robustez provada.
17. Compliant mechanisms e flexuras impressas — https://compliantmechanisms.byu.edu/ — Mecanismos que se movem por flexão do material, sem juntas. Descreve movimento sem peças separadas.

### Robótica e cinemática

18. URDF/SDF e MJCF (V) — https://mujoco.readthedocs.io/en/stable/XMLreference.html — Formatos declarativos de corpos, juntas, limites e geometria de colisão. Referência madura de montagem como grafo de corpos e juntas com identidade nomeada.
19. Pinocchio / Drake — https://github.com/stack-of-tasks/pinocchio — Cinemática e dinâmica de corpos articulados com cálculo rápido de colisão e jacobianos. Serve para provar alcance e folga de um mecanismo por cálculo.
20. FCL / Coal (detecção de colisão) — https://github.com/coal-library/coal — Distância mínima e penetração entre geometrias convexas e malhas. Fornece a medida de contato e interferência entre peças.
21. Modular robots e kits (Dynamixel brackets, MoveIt) — https://moveit.ros.org/ — Planejamento de movimento sobre descrição URDF. Mostra que um mesmo modelo declarativo alimenta visão, colisão e planejamento.

### Arquitetura computacional

22. Grasshopper / Rhino.Inside — https://www.grasshopper3d.com/ — Programação visual por grafo de dados paramétricos, padrão em arquitetura. Referência para dependência explícita entre parâmetros e geometria.
23. Speckle — https://speckle.systems/ — Transporte de objetos de modelo entre ferramentas com versão e diferença por objeto. Modelo de identidade e histórico de componentes entre sistemas.
24. IFC / buildingSMART — https://technical.buildingsmart.org/standards/ifc/ — Esquema aberto de elementos, relações (contém, conecta, preenche) e classificação. Vocabulário de relações entre partes reaproveitável em montagem.
25. Karamba3D e análise estrutural paramétrica — https://karamba3d.com/ — Análise de elementos finitos de barras dentro do fluxo paramétrico. Exemplo de feedback estrutural em tempo de projeto.
26. Shape grammars / gramáticas de forma (CGA Shape, CityEngine) — https://doc.arcgis.com/en/cityengine/latest/cga/cga-introduction.htm — Fachadas e edifícios por regras de divisão e substituição. Receita hierárquica determinística com variação controlada por semente.

### Simulação física

27. FEniCS / scikit-fem / CalculiX — https://calculix.de/ — Elementos finitos de código aberto para tensão e deformação. Permite checar espessura e rigidez de uma peça com número em vez de impressão visual.
28. Taichi / Warp (NVIDIA) — https://github.com/NVIDIA/warp — Linguagens de GPU para simulação diferenciável de corpos rígidos, tecido e MPM. Simulação diferenciável pode ajustar parâmetros da peça por gradiente.
29. Bullet/PyBullet e Rapier (Rust/WASM) — https://rapier.rs/ — Motor de física rígida com versão WebAssembly. Teste de montagem por "deixar cair e ver se se mantém".

### Design generativo e otimização

30. Topologia: ToPy / TopOpt / Fusion Generative Design — https://github.com/williamhunter/topy — Otimização topológica SIMP: dado carga e apoio, remove material onde não trabalha. Fonte de formas orgânicas justificadas por carga.
31. nTop (implicit modeling) / libfive / OpenVCAD — https://libfive.com/ — Modelagem por campos implícitos (SDF), com mesclagem suave, treliças e gradação de material. Representação em que booleana, filete e treliça são aritmética de funções.
32. Evolução e busca de qualidade-diversidade (MAP-Elites) — https://arxiv.org/abs/1504.04909 — Mantém um mapa de soluções boas em cada região de um espaço de características. Boa ideia para gerar variantes de uma peça cobrindo o espaço e não só o ótimo.
33. Wave Function Collapse — https://github.com/mxgmn/WaveFunctionCollapse — Preenche uma grade com módulos respeitando regras de vizinhança por compatibilidade de arestas. Montagem por restrição de encaixe entre módulos.

### Catálogos e padrões

34. McMaster-Carr (CAD por parte) e TraceParts — https://www.mcmaster.com/ — Catálogos com modelo 3D de cada parafuso, rolamento e perfil, com atributos filtráveis. Referência de nomenclatura e parâmetros de peças comerciais.
35. FreeCAD Fasteners / CadQuery cq_warehouse — https://github.com/gumyr/cq_warehouse — Parafusos, roscas, engrenagens e rolamentos paramétricos em código. Receitas de peças padrão com normas (ISO, DIN) como entrada.
36. Gridfinity — https://gridfinity.xyz/ — Sistema modular de caixas e bases em grade de 42 mm com encaixe padronizado. Prova de que um módulo único de interface cria um ecossistema de peças compatíveis.
37. Perfis e engrenagens: gearGenerator e involute — https://geargenerator.com/ — Gera perfis de engrenagem que engrenam por construção. Exemplo de relação entre peças (módulo, passo) garantida por fórmula.

### Outras áreas

38. CadQuery / build123d — https://github.com/gumyr/build123d — CAD B-rep em Python com seletores de face e aresta por propriedade geométrica. Seleção de topologia por consulta geométrica estável, sem índices.
39. Topological naming problem (FreeCAD) — https://wiki.freecad.org/Topological_naming_problem — Descreve por que referências a faces quebram quando o modelo é recalculado. Estudo direto do problema de identidade persistida.
40. Onshape FeatureScript e histórico por feature — https://cad.onshape.com/FsDoc/ — Linguagem de features com consulta por entidade e regeneração determinística. Modelo de peça como programa reexecutável.
41. Spirograph/gears e mecanismos de Theo Jansen, Linkage — https://mechanisms.shapespeare.com/ — Síntese e animação de mecanismos planos de barras. Fonte de mecanismos mínimos e verificáveis.
42. Kinematic Models for Design Digital Library (Cornell KMODDL) — https://kmoddl.library.cornell.edu/ — Acervo de modelos mecânicos históricos de Reuleaux com fotos e descrição. Repertório visual de mecanismos elementares.
43. SolveSpace (restrições geométricas) — https://solvespace.com/ — CAD paramétrico com solver de restrições 2D e 3D e arquivo de texto legível. Montagem por restrições em vez de coordenadas.
44. Metrologia por escaneamento (CloudCompare, desvio entre malha e CAD) — https://www.cloudcompare.org/ — Mede distância ponto a superfície e mostra mapa de erro colorido. Técnica para medir quanto a peça gerada se afasta de uma referência.

## Crafting Apps do ArtCraft (pesquisa de 2026-10-13)

Família de aplicativos nativos em Rust da Storyteller.ai, publicada em outubro de 2026, gratuitos e de código aberto sob MIT ou Apache-2.0, à escolha; o nome e as marcas ArtCraft ficam fora da licença. Cada app tem repositório próprio em `github.com/storytold`, vários com linha de comando e servidor MCP, e todos em alfa ou pré-alfa. Não se confundem com o estúdio ArtCraft de geração de imagem e vídeo, que roda na nuvem por créditos e não serve ao Mecanifica (a geração inventa detalhe e não é reproduzível). Os apps listados no README do VectorCraft, conferidos pela pessoa: PhotoCraft (edição de imagem com camadas, máscaras, texto e PSD), VectorCraft (ilustração vetorial e vetorização de imagem), FilmCraft (vídeo, cor e som), LightCraft (biblioteca de fotos e revelação raw), PdfCraft (leitura, organização e proteção de PDF), EffectCraft (animação e efeitos) e DesignCraft (diagramação e publicação). A pesquisa achou também o CADCraft (desenho técnico 2D), e a página de apps fala em treze no total.

Os dois que interessam ao Mecanifica:

1. VectorCraft — https://github.com/storytold/vectorcraft — Vetoriza imagem pelas ideias do potrace (quantização, borda abaixo do pixel, ajuste de curvas com quinas e trechos retos, preset de desenho técnico), com documento nativo em JSON e saída SVG, PDF e DXF. O crate `vectorcraft-trace` separa o algoritmo da interface. A linha de comando só sai pronta para macOS, e no Linux compila da fonte. Nada garante saída idêntica entre execuções. Candidato a teste contra o contorno da imagem.
2. CADCraft — https://github.com/storytold/cadcraft — Desenho técnico 2D com cotas e o crate `cadcraft-constraints`, um resolvedor de restrições geométricas e dimensionais que acusa conflito e graus de liberdade restantes. Pré-alfa. Candidato ao plano do [desenho sem referência](planos/encerrados/2026-10-13-desenho-sem-referencia.md), em que a IA escreveria peças e restrições e o resolvedor daria a geometria.

Combinado com a pessoa em 2026-10-13: código aberto que não roda aqui como está ainda serve de base. O Mecanifica pode estudar o algoritmo, adaptar ou reescrever o que precisa no próprio repositório, com teste e determinismo, e usá-lo como modelo para elevar o que faz; ao trazer código, a licença de origem e o aviso de autoria vão junto.

## IA que desenha e resolvedores de restrições 2D (pesquisa de 2026-10-13)

Feita para o plano do [desenho sem referência](planos/encerrados/2026-10-13-desenho-sem-referencia.md). Os itens marcados (V) tiveram página ou código aberto na pesquisa; os demais vêm de resumo de busca ou de memória.

Resolvedores de restrições 2D:

1. cadcraft-constraints (V) — https://github.com/storytold/cadcraft/tree/main/crates/constraints — Gauss-Newton amortecido de mínima norma em Rust, MIT ou Apache-2.0, sem dependência de solver, sem aleatoriedade; informa graus de liberdade por componente, restrição redundante e conflito, e não grava solução que falha. Pequeno o bastante para portar a JS (cerca de 250 linhas de núcleo).
2. planegcs (V) — https://github.com/Salusoft89/planegcs — o resolvedor do Sketcher do FreeCAD em WebAssembly, com tipos TypeScript, para Node; LGPL-2.1. Uso direto com o binário versionado, ou oráculo nos testes de um resolvedor próprio.
3. ezpz (V) — https://github.com/KittyCAD/ezpz — resolvedor em Rust da Zoo, MIT, com crate WASM; referência de conjunto de restrições.
4. SolveSpace (libslvs) — GPLv3; o mais maduro, só como referência de algoritmo ou conferência externa.
5. JSketcher (V) — https://github.com/xibyte/jsketcher — CAD paramétrico no navegador com resolvedor em JS; licença a conferir.
6. Kiwi.js (Cassowary) — só restrição linear; serve a alinhamento e margem de prancha, não a esboço.

IA que desenha:

7. AIDL (V) — https://github.com/deGravity/aidl — linguagem hierárquica em que o LLM declara estruturas e restrições duras e leves e o SolveSpace resolve; em 2D supera o OpenSCAD com poucos exemplos. A ideia mais próxima do plano.
8. Casey et al., ICCV 2025 — o retorno do solver (graus de liberdade, conflito) leva os esboços totalmente restritos de 34% a 93%; o sinal serve sem treino.
9. CAD-Assistant (ICCV 2025), CADCodeVerify (ICLR 2025, https://github.com/Kamel773/CAD_Code_Generation) — laço planejar, executar, renderizar, perguntar e corrigir; ganho modesto da crítica visual.
10. HIPPE 2026 (DFKI) — agente que escolhe vistas de desenho técnico no FreeCAD por MCP; a crítica visual ainda erra escolhas de desenhista, e as checagens estruturais têm de ser determinísticas.
11. build123d-mcp (V) — https://pypi.org/project/build123d-mcp/ — Apache-2.0, com `lint_drawing` (rótulo sobreposto, estouro da folha, rótulo que diverge da geometria); ideia para os testes da prancha.
12. Zoo Text-to-CAD (KCL) — a saída da IA é linguagem versionável, resolvida pelo ezpz.
13. Modelos treinados e benchmarks: Vitruvion e SketchGraphs, CAD-Coder, CAD-Recode, Text2CAD, SketchAgent, SVGenius, VGBench, StarVector, DeTikZify — exigem GPU ou dados; servem de vocabulário de restrição, prompt de avaliação e métrica.

Recomendação da pesquisa para o plano: portar o resolvedor do cadcraft para JS dentro do repositório, gravando posição inicial e tolerância no arquivo salvo; usar o planegcs como oráculo nos testes; devolver à IA o relatório do resolvedor; adotar do AIDL as restrições duras e leves e a composição por estruturas; e manter o crítico com limite de rodadas, com as checagens estruturais no gate.

## Geometria exata e visão para o Mecanifica (análise de 2026-10-14)

Pedida pela pessoa em 2026-10-14, para testar depois do plano do [desenho sem referência](planos/encerrados/2026-10-13-desenho-sem-referencia.md): o que o Mecanifica pode instalar ou recodar de programas de modelagem e de visão, e o que cada um precisa para não quebrar a organização da malha (a identidade de face, a origem, a parte, os nomes de face publicados e a seleção `sel`, que nunca usa índice). A análise foi feita no código do repositório; o teste de cada um fica para depois.

1. Manifold (`manifold-3d` 3.5.4) já está no núcleo: `procedural/nucleo/manifold.js` a carrega e `procedural/nucleo/operacoes/booleanas.js` faz `unir`, `subtrair` e `intersectar` com uma lei de identidade travada por teste. A face que a operação não toca fica com id, cantos, origem, parte e material; a face cortada fica com o id no pedaço de maior área; só os pedaços a mais ganham id novo, no bloco do passo; a face que some vai para as consumidas, e quem a citar recebe o erro com o conserto. O esboço não a usa: tem o recorte próprio por peças convexas (`modulos/esboco/src/recorte.js`), porque o gate de contato trabalha sobre peças convexas (`pecasDe`) e o módulo é separado do núcleo; daí vieram o volume negativo da ponta da asa e o furo fechado da roda no avião. Levar a Manifold ao esboço pede manter a mesma versão fixada, ler as âncoras da forma antes do recorte, como hoje, e continuar entregando peças convexas ao gate, que a Manifold não dá: a decomposição convexa do sólido resultante continua sendo do módulo. Ganha unir e intersectar no esboço, que hoje não existem.
2. OpenCASCADE (`occt-wasm` 4.3.2) já está no repositório, só na exportação STEP (`modulos/exportador-cad`). Daria arredondamento e chanfro exatos, offset, loft com seção côncava ou curva e varredura, e a remoção exata de linhas escondidas para o desenho. O risco é o da nomeação topológica que o FreeCAD documenta: o índice de face do B-rep muda quando o modelo é recalculado, e o Mecanifica proíbe índice como identidade. Usá-lo para modelar pede uma camada que leve o id, a origem e o nome de cada face pelo histórico da operação (o que foi gerado, modificado e apagado de cada face de entrada), na mesma lei da Manifold, com a seleção geométrica `onde` de reserva, e que triangule cada face do B-rep separada, para a malha continuar com os grupos e as regiões por face; a tolerância da triangulação fica fixada para a saída ser a mesma. O uso de menor risco é a remoção de linhas escondidas no desenho das vistas, que só devolve linhas e não toca identidade.
3. Segment Anything (as versões pequenas que rodam sem placa de vídeo, como MobileSAM ou SAM 2 tiny) mexe só no contorno da imagem: as sementes nomeadas viram os cliques que o modelo recebe, e cada máscara volta como a região daquela semente, de modo que a identidade é o nome da semente e nada da malha muda. Pede os pesos fixados por hash e baixados fora do git, a inferência em um fio só para a saída ser a mesma, e a comparação com o watershed atual pelo teste sintético de forma verdadeira do [levantamento](LEVANTAMENTO-DESENHO-SEM-REFERENCIA.md) e pelos contornos aprovados do avião e do braço.

Ordem proposta para o teste: a remoção de linhas escondidas pelo OpenCASCADE e o Segment Anything primeiro, porque não tocam identidade; depois a Manifold no esboço; por último o OpenCASCADE na modelagem, que é a camada maior. Ampliar imagem com IA fica de fora, porque inventa detalhe e a medida passa a mentir.

## Addons do Blender

Links de referência listados pela IA que fez a pesquisa:

- Modelagem e CAD: [CAD Sketcher](https://github.com/hlorus/cad-sketcher) e [site](https://www.blendercad.org/); [CAD Transform](https://github.com/stephenleger/blender-cad-transform); [keKit](https://knekke.gumroad.com/l/kekit) e [documentação](https://ke-post.com/kekit-blender/); [MESHmachine](https://blendermarket.com/products/meshmachine); [Sverchok](https://github.com/nortikin/sverchok); [Tissue](https://github.com/alessandro-zomparelli/tissue); [PolyQuilt](https://github.com/sakana3/PolyQuilt); [EdgeFlow](https://github.com/BenjaminSauder/EdgeFlow); [Mesh Fairing](https://github.com/fedackb/mesh-fairing); [Quad Remesher](https://exoside.com/quadremesher/); [Conform Object](https://blendermarket.com/products/conform-object).
- Pipeline e ecossistema: [Bonsai BIM](https://bonsaibim.org/) e [IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell); [UVPackmaster 3](https://uvpackmaster.com/); [TexTools](https://github.com/franMarz/TexTools-Blender); [Auto-Rig Pro](https://blendermarket.com/products/auto-rig-pro); [FLIP Fluids](https://github.com/rlguy/Blender-FLIP-Fluids); [Pie Menu Editor](https://blendermarket.com/products/pie-menu-editor); [extensões oficiais do Blender](https://extensions.blender.org/).

Documento consolidado a partir de pesquisa técnica exploratória, cobrindo tanto ferramentas de modelagem 3D com foco em precisão, lógica procedural e produtividade adaptável, quanto o panorama geral do ecossistema do Blender.

---

### Parte 1: Modelagem 3D, Precisão CAD e Ferramentas Não-Óbvias

#### 1. Hard Surface, Precisão CAD e Operações Booleanas
* **CAD Sketcher (SolveSpace Solver)**: Modelagem paramétrica baseada em restrições 2D (distâncias, paralelismo, tangência) via solver do SolveSpace. Permite criar perfis paramétricos dinâmicos conversíveis em malhas/curvas 3D.
  * *Potencial de adaptação:* Base para peças técnicas, gabaritos e encaixes que exigem ajuste paramétrico contínuo sem reconstrução de malha.
* **CAD Transform**: Ferramenta de transformação interativa com lógica "Snap From / Snap To" precisa (ancoragem em vértice/aresta/centro e alinhamento direto a alvos sem manipular o 3D Cursor).
  * *Potencial de adaptação:* Montagem de conjuntos modulares mecânicos ou arquitetônicos.
* **keKit**: Suíte de operadores contextuais que alternam função conforme o modo de seleção (vértice, aresta, face). Inclui alinhamento por bounding box e V-Snap.
  * *Potencial de adaptação:* Padronização de atalhos e unificação de operadores dispersos da API do Blender.
* **MESHmachine**: Modelagem hard-surface não-destrutiva/híbrida. Destaque para `Unbevel`/`Unchamfer` (reversão de chanfros aplicados), `Fuse` (recriação de transições pós-booleanas) e sistema de `Stash` (armazenamento de estados de malha para projeção posterior de normais).
  * *Potencial de adaptação:* Reversibilidade em fluxos destrutivos e limpeza de sombreamento em superfícies curvas.
* **Quick Shape**: Prototipagem gestual de volumes e silhuetas diretamente na viewport com operações booleanas automáticas em tempo real.
  * *Potencial de adaptação:* Bloqueio rápido de silhuetas e formas conceituais pré-retopologia.

#### 2. Proceduralidade, Deformação e Padrões Baseados em Nós
* **Sverchok**: Programação visual orientada a dados matemáticos (equivalente ao Grasshopper do Rhino). Opera na geração de topologia analítica pura, matrizes e NURBS, diferenciando-se dos Geometry Nodes nativos.
  * *Potencial de adaptação:* Geração de superfícies paramétricas matemáticas, treliças e engrenagens com perfis analíticos precisos.
* **Tissue**: Design computacional e tesselação. Mapeia componentes pela curvatura de faces (`Tessellate`) e inverte matematicamente faces e vértices (`Dual Mesh`) para estruturas celulares/Voronoi.
  * *Potencial de adaptação:* Malhas biomiméticas, painéis solares/estruturais curvos e materiais de absorção de impacto parametrizados por mapas de peso.
* **BagaPie**: Empacotamento de nós de Geometry Nodes em interface simplificada via pie menus (escadas, vigas, fiação, booleanas contextuais).
  * *Potencial de adaptação:* Modelo de abstração para encapsular grafos complexos de nós em ferramentas simples para produção.
* **GeoCables**: Cálculo automático de catenária física (gravidade), conectores e diâmetros para cabos e tubulações sobre superfícies com clique direto.
  * *Potencial de adaptação:* Roteamento automático de chicotes, mangueiras e condutores industriais.

#### 3. Topologia, Retopologia e Limpeza de Malha
* **PolyQuilt**: Retopologia rápida com o botão esquerdo do mouse (LMB). Identifica o contexto sob o cursor para extrudar quads, soldar vértices, cortar e preencher sem alternar ferramentas.
  * *Potencial de adaptação:* Retopologia manual leve de superfícies críticas em peças CAD/scans.
* **EdgeFlow**: Ajuste de curvatura e espaçamento de edge loops (`Set Flow` para interpolação cúbica baseada em faces vizinhas e `Set Linear` para alinhamento uniforme).
  * *Potencial de adaptação:* Correção de deformações causadas por cortes de suporte em Subdivision Surface.
* **Mesh Fairing**: Suavização matemática de patches de malha via SciPy, respeitando restrições de posição, curvatura global contínua ou tangência.
  * *Potencial de adaptação:* Limpeza cirúrgica de furos e artefatos de scans sem perder a geometria circundante.
* **Quad Remesher**: Remalhamento automático em quads que respeita guias de borda (hard edges) e anéis de fluxo contínuo.
  * *Potencial de adaptação:* Conversão em lote de topologia de arquivos CAD brutos em malhas poligonais funcionais.

#### 4. Automação, Scripting e Controle de Seleção
* **Pie Menu Editor (PME)**: Construtor visual de menus radiais, popups e macros com suporte a scripts condicionais em Python.
  * *Potencial de adaptação:* Automação de sequências repetitivas (ex.: aplicar escalas -> marcar bevel weights -> ativar auto-smooth -> transferir normais).
* **Zen Sets**: Sistema de grupos de seleção com visualização colorida em viewport, similar aos Polygroups do ZBrush.
  * *Potencial de adaptação:* Isolamento rápido de subconjuntos de montagens complexas para modelagem ou mascaramento de modificadores.
* **MeshCheck HUD & 3D Print Toolbox**: Diagnóstico em tempo real de não-conformidades (arestas non-manifold, N-gons, faces coplanares e espessuras mínimas).
  * *Potencial de adaptação:* Etapa de linter de malha pré-exportação ou pré-fabricação.

#### 5. Utilitários Específicos ("Hidden Gems")
* **Conform Object**: Envelopamento não-destrutivo de sólidos sobre superfícies curvas arbitrárias preservando volume e espessura (superando o achatamento do Shrinkwrap padrão).
* **Curves to Mesh**: Modelagem por gaiola de curvas cruzadas (estilo curve patching automotivo/Rhino) gerando superfícies quads contínuas.
* **Bezier Mesh Shaper**: Deformação direta de malhas por curvas Bézier interativas sem necessidade de modificadores de Lattice/Curve prévios.
* **Plating Generator**: Criação paramétrica de painéis, ranhuras e juntas de montagem sobre malhas quads.
* **Face Inset Fillet**: Operador de Inset com chanfro arredondado simultâneo dos cantos gerados.

---

### Parte 2: Panorama do Ecossistema Geral do Blender

#### 1. Materiais, Shading, Texturização e UV
* **UVPackmaster 3** *(Pago - Indispensável)*: Empacotamento de UV acelerado por CPU/GPU multithread, otimização de texel density e empacotamento com suporte a UDIMs.
* **Zen UV** *(Pago)*: Unwrapping orientado a quads, empilhamento automático de ilhas idênticas e corte/costura interativo na viewport 3D.
* **TexTools & Texel Density Checker** *(Gratuitos)*: Padronização de densidade de pixels por unidade e alinhamento de ilhas UV para pipelines de tempo real.
* **Decal Machine** *(Pago - Inovação)*: Detalhamento hard-surface sem bake pesado de normais via mesh decals e trim sheets não-destrutivos.
* **Sanctus Library** *(Pago)*: Biblioteca de materiais 100% procedurais baseados em nós (desgaste de borda e danos gerados pela geometria sem texturas raster estáticas).
* **Bake Wrangler** *(Freemium)*: Sistema nodal para geração não-destrutiva de bakes em lote (Normals, Curvature, Cavity, PBR).

#### 2. Animação, Rigging e Simulação
* **Auto-Rig Pro (ARP)** *(Pago - Indispensável)*: Solução padrão para rigs bípedes/quadrúpedes com retargeting (Mixamo/MoCap) e exportador FBX estrito para Unreal Engine e Unity.
* **Rigify & CloudRig** *(Gratuito/Open-Source)*: Framework nativo de rigs e extensão mantida pelo Blender Studio para animação de longa-metragem.
* **Faceit** *(Pago)*: Rigging e animação facial automatizados baseados nas 52 shape keys do Apple ARKit, com suporte a Live Link Face e NVIDIA Audio2Face.
* **AnimAide & Animation Layers**: Ferramentas de tweening/interpolação e fluxo de animação não-linear em camadas (padrão Maya/MotionBuilder).
* **FLIP Fluids** *(Pago)*: Motor de simulação líquida robusto (método FLIP/APIC), superior ao Mantaflow nativo em estabilidade, viscosidade e controle de spray.
* **Simply Cloth Pro** *(Pago)*: Simulação e escultura interativa de tecidos em tempo real.

#### 3. Iluminação, Câmeras e Renderização
* **Photographer** *(Pago - Indispensável)*: Controle físico de câmeras (ISO, shutter speed, f-stop, Kelvin, raycast autofocus e render queues multissessão).
* **Physical Starlight and Atmosphere** *(Pago)*: Simulação fotométrica de atmosfera e céu para iluminação fisicamente coerente em grandes escalas.
* **Turbo Tools / Turbo Render** *(Pago)*: Reamostragem e denoise multicamada para Cycles com estabilidade temporal em animações, reduzindo tempos de render consideravelmente.
* **Motores Externos (Octane & LuxCore)**: Octane Prime (espectral fisicamente preciso) e LuxCoreRender (foco em cáusticas e precisão óptica pura).

#### 4. Pipeline, CAD/BIM e Asset Management
* **Bonsai BIM (antigo BlenderBIM)** *(Gratuito/Open-Source)*: Suíte completa com suporte a padrões IFC e OpenBIM para edição de dados de engenharia e arquitetura sem triangulação destrutiva.
* **STEPper** *(Pago)*: Importação direta de arquivos CAD (STEP/IGES) com tesselação controlada via kernel OpenCASCADE.
* **Better FBX Importer & Exporter** *(Pago)*: Substituição ao exportador padrão, eliminando erros de rotação em ossos e problemas de coordenadas entre Blender, Maya, 3ds Max e Unreal Engine.
* **Geo-Scatter (Scatter 5)** *(Pago - Indispensável)*: Dispersão massiva de assets com frustum culling dinâmico, biomas pré-configurados e simulação de vento via Geometry Nodes.
* **Nova Plataforma de Extensões (Blender 4.2 LTS+)**: Gerenciador nativo centralizado (`extensions.blender.org`) com sandbox de permissões e atualizações integradas sem necessidade de instalação manual de arquivos `.zip`.

---

### Síntese de Fluxo Integrado Recomendado

```
[Perfís Paramétricos / CAD]  -->  CAD Sketcher / Sverchok / Curves to Mesh
            |
            v
[Modelagem e Detalhamento]    -->  keKit + CAD Transform + MESHmachine + PolyQuilt
            |
            v
[Auditoria e Otimização]      -->  EdgeFlow + Mesh Fairing + 3D Print Toolbox
            |
            v
[UV & Detalhamento Shading]   -->  UVPackmaster 3 + Zen UV + Decal Machine
            |
            v
[Pipeline / Export / Engine]  -->  Pie Menu Editor (Automação) + Better FBX / Bonsai BIM
```

## Modificadores do Blender

Lista trazida pela pessoa em 2026-10-07, dita do Blender 5.2 LTS e não conferida contra o manual. Os de malha se dividem em edição de atributos e normais (Data Transfer, Normal Edit, Weighted Normal, UV Project, UV Warp, os de peso de vértice), geração (Array, Bevel, Boolean, Build, Decimate, Edge Split, Geometry Nodes, Mask, Mesh to Volume, Mirror, Multiresolution, Remesh, Screw, Skin, Solidify, Subdivision Surface, Triangulate, Volume to Mesh, Weld, Wireframe), deformação (Armature, Cast, Curve, Displace, Hook, Laplacian Deform, Lattice, Mesh Deform, Shrinkwrap, Simple Deform, Smooth e variantes, Surface Deform, Volume Displace, Warp, Wave) e física (Cloth, Collision, Dynamic Paint, Explode, Fluid, Ocean, Particle Instance, Particle System, Soft Body). Há ainda os modificadores feitos de Geometry Nodes salvos como asset (Smooth by Angle, Scatter on Surface, Instance on Elements, Curve to Tube), os de curvas de cabelo e os do Grease Pencil.

Contra a [lista de ferramentas por objeto](FERRAMENTAS-POR-OBJETO.md), Solidify é a casca com espessura, Bevel o arredondamento, Array e Curve a repetição, Screw a hélice, Skin e Wireframe a estrutura de barras, Simple Deform o dobrar e torcer, Displace o relevo, Subdivision Surface a superfície suave, Boolean o corte, e Weld, Decimate e Remesh a limpeza que o módulo `otimizador-malha` já faz em parte. Ficam fora da lista quatro capacidades: a deformação por gaiola (Lattice e Mesh Deform), que molda uma forma pronta mexendo em poucos pontos de controle; a projeção sobre outra superfície (Shrinkwrap), que assenta uma peça sobre uma carenagem curva; o Cast, que puxa uma forma para esfera, cilindro ou caixa; e o controle de normais (Weighted Normal e Smooth by Angle), que decide onde a malha aparece lisa e onde aparece com quina.

## Acervos abertos de objetos descritos em código (pesquisa de 2026-10-16)

Pesquisa feita por um agente durante o plano [importar objeto de código](planos/encerrados/2026-10-15-importar-objeto-de-codigo.md), atrás de acervos com licença aberta que guardem peças separadas e, de preferência, parâmetros, em OpenSCAD, CadQuery, build123d, JSCAD, FreeCAD, STEP ou URDF. Só entraram licenças livres sem exigência de crédito, CC-BY, CC-BY-SA, MIT, BSD, Apache, GPL e LGPL, sem NC nem ND e sem marca. Cada linha foi conferida na página do repositório ou vem de resultado de busca, e "não verificado" marca o que não foi aberto. Thingiverse, Printables e MakerWorld responderam 403 ou não mostraram a licença e ficaram fora como acervos.

| Nome | URL | Formato | Licença | Objetos e peças | Separadas e nomeadas | Dependências | Famílias | Nota (1 a 5) |
|---|---|---|---|---|---|---|---|---|
| BOSL2 | https://github.com/BelfrySCAD/BOSL2 | OpenSCAD | BSD-2-Clause | engrenagens, parafusos métricos, rolamentos de esfera e lineares | não, a peça sai da chamada do módulo | nenhuma | engrenagens, parafusos, rolamentos, guias lineares | 4 |
| NopSCADlib | https://github.com/nophead/NopSCADlib | OpenSCAD | GPL-3.0-or-later | componentes comerciais (vitamins), peças impressas, gabinetes | não verificado | biblioteca própria | elementos de máquina, motores, eletrônicos e gabinetes, peças impressas | 4 |
| MCAD | https://github.com/openscad/MCAD | OpenSCAD | LGPL-2.1 | engrenagens evolventes, motores de passo, servos, rolamentos, porcas e parafusos, caixas | não, módulos | nenhuma declarada | engrenagens, motores, rolamentos, parafusos, caixas | 3, o README a diz inacabada |
| threads-scad | https://github.com/rcolyer/threads-scad | OpenSCAD | licença livre sem exigência de crédito | roscas, parafuso, porca e arruela métricos, furo de folga | não, módulos | nenhuma | parafusos, porcas, arruelas | 4 |
| UB.scad | https://github.com/UBaer21/UB.scad | OpenSCAD | licença livre sem exigência de crédito | rolamento, dobradiças, polia GT2, engrenagem cicloidal, anéis, pinos, caixa de placa | não, módulos | nenhuma declarada | rolamentos, dobradiças, polias, engrenagens, gabinetes | 3 |
| cq_warehouse | https://github.com/gumyr/cq_warehouse | CadQuery | Apache-2.0 | fixadores, rolamentos, pinhões, correntes, roscas | não, funções geram a peça | CadQuery de desenvolvimento | parafusos, rolamentos, correntes, roscas | 4 |
| bd_warehouse | https://github.com/gumyr/bd_warehouse | build123d | Apache-2.0 | roscas, parafusos, engrenagens, tubos, flanges, rolamentos (fonte secundária) | não verificado | build123d | parafusos, rolamentos, engrenagens, tubos | 4 |
| cq_gears | https://github.com/meadiode/cq_gears | CadQuery | Apache-2.0 | engrenagens reta, helicoidal, espinha de peixe, anelar, planetária, cônica e cremalheira | não, funções | CadQuery de desenvolvimento | engrenagens | 4 |
| FreeCAD-library | https://github.com/FreeCAD/FreeCAD-library | FCStd e STEP | CC-BY 3.0 | peças mecânicas, robôs, logística, hidráulica, tubos, elétrica | não verificado | FreeCAD | elementos de máquina, robôs, hidráulica, tubos | 3, cerca de 5 GB e com peças de fabricante a filtrar |
| BOLTS | https://github.com/boltsparts/BOLTS | FreeCAD e OpenSCAD | GPL-3.0 | parafusos, porcas, arruelas e outras peças padronizadas | não verificado | Python e pyyaml | fixação | 3, arquivado, com sucessor em boltsparts/boltsparts |
| jenny5-CAD | https://github.com/jenny5-robot/jenny5-cad | OpenSCAD | MIT | braço com parâmetros, perna, cabeça, base, motores, rolamentos, parafusos | um arquivo por subsistema, peças não verificadas | nenhuma vista | braço robótico, motores, rolamentos | 3 |
| Open Parametric Hand | https://github.com/kg398/100_fingers | OpenSCAD | código GPLv3, modelos CC BY 4.0 | mão e dedos paramétricos | mão em peça única, caixa de atuação separada | nenhuma declarada | garra, articulações | 3 |
| modular-bearing | https://github.com/Anthrobotics/modular-bearing | OpenSCAD | CC-BY-SA-4.0 | gerador de rolamento por diâmetro, elementos rolantes e furos | não, um arquivo | nenhuma | rolamentos | 4 |
| openscad_pvc | https://github.com/jon-gilbert/openscad_pvc | OpenSCAD | MIT | flange, tubo, cotovelo e tampão de PVC por série | não, módulos | BOSL2 | tubos e conexões | 3 |
| Mark's Enclosure Helper | https://github.com/sbambach/MarksEnclosureHelper | OpenSCAD | GPL-3.0-only | caixa em duas partes com dobradiça e fechos | tampa e base separadas, não verificado | não verificado | gabinetes, dobradiças | 3 |
| YAPP_Box | https://github.com/mrWheel/YAPP_Box | OpenSCAD | MIT | caixa para eletrônica a partir da placa | não verificado | não verificado | gabinetes eletrônicos | 3 |
| Tray Library | https://github.com/sofian/openscad-tray | OpenSCAD | LGPL-3.0-or-later | bandejas e divisórias | não | nenhuma | recipientes | 2 |
| Catch'n'Hole | https://github.com/mmalecki/catchnhole | OpenSCAD | MIT | alojamento de porca, furo, escareado | não | nenhuma | fixação | 2 |
| OpenSCADutil | https://github.com/franpoli/OpenSCADutil | OpenSCAD | GPL-3.0 | manípulo serrilhado, espelho de parede, abraçadeira, cabo, trava de tubo, ralo | um arquivo por peça | nenhuma declarada | ferramentas, peças impressas, instalações | 2, um arquivo com marca no nome a descartar |
| Constructive | https://github.com/solidboredom/constructive | OpenSCAD | GPL-2.0-only | peças de encaixe | não | nenhuma | encaixes | 2 |
| Board game toolkit | https://github.com/pinkfish/openscad_boardgame_toolkit | OpenSCAD | Apache-2.0 | caixas e componentes de jogo | sim, 3MF multicor | não verificado | recipientes | 2 |

O código aberto se concentra em elementos de máquina e em caixas, quase sempre como bibliotecas de módulos paramétricos. Um módulo desses corresponde a uma família do Mecanifica, e não a uma peça, porque devolve a peça a partir de parâmetros como número de dentes ou diâmetro. O importador de `.csg` do plano ativo exporta uma instância e perde esses parâmetros.

Ficaram fora por licença ou formato: cadquery-models (Unlicense), Gear Lab (CC BY-NC-SA), Technic.scad e LEGO.scad (marca no nome), os geradores de polia sem licença declarada, Zoo KCL (licença não vista), Faze4 (formato não verificado), gggears (licença não verificada) e DeltaRobot (software de ROS 2, sem modelo 3D). O JSCAD é um núcleo de modelagem, e não um acervo de peças.

Não apareceu acervo com licença aceita para picape, caminhão, empilhadeira, carrinho de mão, carrinho de supermercado, bicicleta, foguete ou estrutura de drone, nem para robô SCARA, cartesiano ou delta, cilindro hidráulico, came, biela e manivela, torno, fresadora, esteira transportadora, válvulas ou móveis. Uma prova feita na mesma data com um STL de picape do Thingiverse (CC-BY-SA) mostrou que a malha de várias cascas abertas não se traduz em formas por fatiamento; o STL serve como referência e alvo de medida, e só peças simples e isoladas, como as rodas, foram reconhecidas como primitivas.

## Printables e o espelho do Thingiverse (pesquisa de 2026-10-16)

Os sites do Thingiverse, do Printables e do MakerWorld respondem 403 a acesso automático vindo de servidor de nuvem, por uma proteção anti-robô da Cloudflare, e não pela regra de rede do ambiente. Duas entradas passam por ela. A primeira é a API GraphQL do Printables (`https://api.printables.com/graphql/`), consultada com curl: a introspecção está desligada, a busca `searchPrints2` aceita uma palavra por consulta e `offset`, o campo `stls` de `print(id:)` lista também `.scad`, `.step` e `.f3d`, a mutação `getDownloadLink` devolve o endereço do arquivo, e a API às vezes responde "Request was throttled", o que se resolve esperando. A segunda é o espelho do Thingiverse no Internet Archive, com itens `thingiverse-<id>`, busca em `archive.org/advancedsearch.php` e licença em `archive.org/metadata/<item>`; a lista de arquivos mostra só o zip, e a licença do metadado divergiu da que vem dentro do zip em três casos.

| Objeto ou família | Título | Endereço | Formato | Licença | Peças separadas | Nota (1 a 5) |
|---|---|---|---|---|---|---|
| Redutor planetário | Solid Core Compound Planetary Gearbox (customizable) | thingiverse.com/thing:3511382 | `.scad` visto | CC-BY-SA 3.0 | não verificado | 5 |
| Braço SCARA | Parametric SCARA Robot Arm | thingiverse.com/thing:4595836 | `.scad` visto | CC-BY 4.0 | não verificado | 4 |
| Braço SCARA | dacb scara arm, customizer version | thingiverse.com/thing:1353302 | `.scad` visto | CC-BY 4.0 (o zip diz 3.0) | não verificado | 4 |
| Quadro de drone | Complete frame for TinyTina drone, OpenSCAD parametric | thingiverse.com/thing:3519833 | três `.scad` vistos | CC-BY 4.0 | sim, corpo superior, inferior e trem | 4 |
| Quadro de drone | JeNo 5.1" Drone Frame | printables.com/model/339099 | STEP | CC-BY | sim | 3 |
| Foguete | Space Rocket, parametric model | thingiverse.com/thing:4284015 | `.scad` visto | CC-BY 4.0 | não | 4 |
| Cone de foguete | Parametric Conical e Elliptical Nose Cone | thingiverse.com/thing:509295 e 507830 | `.scad` visto | CC-BY-SA 3.0 | não | 3 |
| Engrenagens | Parametric gear wheels | thingiverse.com/thing:7794 | `.scad` visto | CC-BY-SA 3.0 | não | 4 |
| Redutor planetário | Mini Planetary Gearbox | printables.com/model/853296 | STEP por peça | domínio público | sim | 4 |
| Redutor cicloidal | Cycloidal Gearbox | printables.com/model/1113200 | STEP por peça | CC-BY | sim | 3 |
| Dobradiça | Parametric hinge | printables.com/model/307580 | `.scad` listado | CC-BY | não verificado | 4 |
| Polias | Project: Pulley systems V2 | printables.com/model/6380 | `.scad` listado | CC-BY | sim | 4 |
| Polias GT2 | GT2 Pulley Collection, parametric | printables.com/model/1183441 | F3D | GPL v3 | sim | 3 |
| Rolamento impresso | FPBB, Fully Printable Ball Bearing | printables.com/model/425273 | F3D | CC-BY-SA | sim | 3 |
| Braço de escavadeira | Excavator Arm | printables.com/model/971298 | um STEP com 19 sólidos | CC-BY | sim | 3 |
| Escavadeira e trator pequenos | Small tractor, flexi excavator e tractor spinner | printables.com/model/233416 e 233171 | `.scad` visto | CC-BY | não, peça única | 3 |
| Escavadeira articulada | Yellow Excavator with Movements | printables.com/model/552625 | STEP, F3D e 3MF | CC-BY | não verificado | 3 |
| Cadeira | chair | printables.com/model/437985 | FCStd | CC-BY | não | 3 |
| Came, biela, protetor de corrente | Ratchet Cam, Customizable Linkage, Chainguard for bicycles | thingiverse.com/thing:1079362, 1978423 e 990049 | `.scad` visto | CC-BY 4.0 e CC-BY-SA 3.0 | não | 2 a 3 |

Continuam sem fonte com CAD e licença aceita o carrinho de mão completo, o carrinho de supermercado, a empilhadeira, a picape e o caminhão, a bicicleta completa, o cilindro hidráulico, a biela e manivela completas, o robô delta, a esteira transportadora, a válvula, o torno, a fresadora, a mesa e o armário. Itens com marca no título, como peças de impressora, de móvel ou de linha de produto de fabricante, foram descartados.

## Hardware aberto, robôs de simulação e acervos acadêmicos (pesquisa de 2026-10-16)

Pesquisa atrás de objetos com peças separadas e nomeadas, juntas ou parâmetros. Gazebo Fuel, BCN3D Moveo, AR4, Shapeoko, Prusa, FarmBot, bicicletas e drones ficaram sem pesquisar, e a licença de CAD-Recode, GeoCode e Infinigen Indoors não foi aberta.

| Nome | Endereço | Formato | Licença | Peças separadas e nomeadas | Juntas ou parâmetros | Cobre | Nota (1 a 5) |
|---|---|---|---|---|---|---|---|
| SO-ARM100 | github.com/TheRobotStudio/SO-ARM100 | STEP e STL | Apache-2.0 | sim, por pasta | não verificado | braço robótico | 5 |
| Thor | github.com/AngelLM/Thor | FreeCAD, STEP | CC-BY-SA-4.0 | sim, por pasta | não verificado | braço robótico | 4 |
| Voron-2 | github.com/VoronDesign/Voron-2 | STEP | GPL-3.0 | parcial | não | impressora | 3 |
| JPL Open Source Rover | github.com/nasa-jpl/open-source-rover | Onshape | Apache-2.0 | não verificado | não verificado | rover | 3 |
| Sawppy | github.com/Roger-random/Sawppy_Rover | Onshape, STL | MIT | não verificado | não | rover | 3 |
| awesome-robot-descriptions | github.com/robot-descriptions/awesome-robot-descriptions | URDF, MJCF, SDF | lista com licença livre sem exigência de crédito, cada modelo com a sua | não verificado | sim | braços, bípedes, drones, robôs com rodas | 4 |
| MuJoCo Menagerie | github.com/google-deepmind/mujoco_menagerie | MJCF | por modelo (Go2 BSD-3, Panda Apache-2.0) | sim | sim | braços, quadrúpede | 4 |
| example-robot-data | github.com/Gepetto/example-robot-data | URDF | BSD-3-Clause | não verificado | sim | braços, humanoides | 3 |
| AWS RoboMaker small warehouse | github.com/aws-robotics/aws-robomaker-small-warehouse-world | SDF | MIT-0 | não verificado | não verificado | estantes, transpaleteira | 2 |
| Infinigen e Infinigen Indoors | github.com/princeton-vl/infinigen | código Python sobre o Blender | BSD-3-Clause | objetos gerados | parâmetros | móveis, interiores, objetos de cena | 3 |
| DeepCAD | github.com/ChrisWu1997/DeepCAD | sequências de esboço e extrusão | código MIT, dados não verificados | não | sim | peças prismáticas | 3 |
| ABC | archive.nyu.edu/handle/2451/43778 | STEP, Parasolid | MIT, modelos sob os termos do Onshape | em parte | não | peças mecânicas | 3 |
| ShapeAssembly | github.com/rkjones4/ShapeAssembly | linguagem de caixas ligadas por encaixe | não verificada | sim | sim | montagens por contato | 4 |

Servem só como método, por licença de dados restrita a pesquisa não comercial ou não verificada, o PartNet-Mobility (peças e juntas de móveis), o MeshCoder (malha para código do Blender, CC-BY-NC-SA), o Fusion 360 Gallery (montagens com juntas), o CAD-Recode (um milhão de programas CadQuery) e o GeoCode.

## Sondas de importação de 2026-10-16

Duas sondas, feitas fora do repositório, mediram o que o caminho de importação faz com objetos reais. O quadro de drone TinyTina (três `.scad`, CC-BY 4.0) passou pelo importador de `.csg`: o trem de pouso saiu sem nenhuma forma, e os corpos inferior e superior saíram com 36 e 16 formas e 22 e 27 recusas. As recusas foram o deslocamento de contorno 2D (`offset`, 14 no corpo superior), a diferença 2D que deixa furo no perfil, a extrusão com `scale`, o casco convexo (`hull`) e a soma de Minkowski. A conferência contra a malha (`--conferir`) quebrou com exceção quando o esboço importado fica vazio e quando há cilindro de 6 lados, que a blocagem recusa, em vez de relatar o problema. Nenhum gate pegou isso, porque o importador só era provado na fixture sintética e no caminhão de brinquedo.

O braço de escavadeira do Printables (um STEP com 19 sólidos, CC-BY) passou por um leitor de STEP aberto (gmsh) e por um ajuste de uma caixa ou um cilindro orientado por sólido, com os contatos achados por proximidade. A leitura e o ajuste levaram segundos, sem gasto de tokens. Os pinos saíram como cilindros e os braços retos como caixas, mas a ocupação média foi de 0,44: as peças em L, em garfo e a pá ficam mal representadas por uma forma só. As faces do STEP são exatas (501 planos, 151 cilindros e 114 cones), e as peças impressas costumam ser extrusões de um contorno, o que indica o passo seguinte: tomar a maior face plana de cada sólido como perfil e o sólido como extrusão dele. O arquivo era um leiaute de impressão, com as peças espalhadas, e por isso os contatos achados não descrevem a montagem.

## Seis fontes trazidas pela pessoa (2026-10-16)

O BlendNet (huggingface.co/datasets/FreedomIntelligence/BlendNet, Apache-2.0) tem 12.059 pares de instrução em texto e script Python do Blender que monta o objeto com primitivas posicionadas, em 16 categorias de objetos do dia a dia, como mesa de centro, estante, caneta e cama de cachorro. Cerca de 2 mil foram anotados à mão e o resto pelo GPT-4o. É a fonte mais próxima do formato do esboço, primitivas com nome e posição, e um tradutor que leia as chamadas de primitiva sem rodar o Blender sai barato; é a sonda recomendada.

O 3DCodeVerse (huggingface.co/datasets/ilabai/3dcodeverse, artigo arXiv 2610.22341) reúne mais de 2 milhões de exemplos de código 3D, com cerca de 405 mil em CadQuery, 357 mil em GLSL e 102 mil em Blender, além de OpenSCAD e URDF, cada um com quatro vistas e malha. A licença do conjunto é CC-BY-NC-SA-4.0, que não serve como conteúdo; as partes 3dcodebench (212 famílias procedurais derivadas do Infinigen, BSD-3-Clause) e bioinspired3d (MIT) têm licença própria e podem servir depois de conferidas.

O Infinigen (github.com/princeton-vl/infinigen, BSD-3-Clause) tem geradores procedurais em Python sobre o Blender, para natureza e, no Infinigen Indoors, para interiores: móveis, eletrodomésticos, estantes, portas, janelas e louça. A licença permite traduzir a lógica de cada gerador em família, com crédito, e ele é a fonte indicada para as famílias de móveis e eletrodomésticos.

O Archimesh, add-on do Blender, tem geradores paramétricos de cômodos, portas, janelas, escadas, estantes, armários de cozinha, telhado, colunas, cortinas e persianas. É GPL, e a tradução direta do código faria a família herdar a GPL; serve como referência de quais parâmetros cada objeto tem.

O BlenderLLM (github.com/FreedomIntelligence/BlenderLLM, código Apache-2.0) é um modelo de 7 bilhões de parâmetros, ajustado do Qwen2.5-Coder-7B sobre o BlendNet, que escreve scripts do Blender a partir de texto. O LL3M (github.com/threedle/ll3m, licença acadêmica e de avaliação) é um sistema de vários agentes que planejam, escrevem, depuram e refinam código do Blender, com autocrítica pelas imagens e uma base de consulta da documentação do Blender; o servidor dele foi desligado. Os dois fazem o que o modelador e o crítico do Mecanifica já fazem e servem só como comparação de método.

## StableGen, trazido pela pessoa (2026-10-16)

O StableGen (github.com/sakalond/stablegen, GPL-3.0) é um complemento do Blender que manda fluxos a um servidor ComfyUI. Ele pinta texturas em malhas prontas, projetando de várias câmeras imagens geradas por SDXL, FLUX.1-dev ou Qwen Image Edit, com ControlNet e IPAdapter, e gera malha texturizada a partir de imagem ou texto pelo TRELLIS.2, da Microsoft; também decima, dá espessura e refaz a topologia. Pede placa NVIDIA com 8 a 16 GB de memória, o ComfyUI e de 10 a 50 GB de modelos, e partes do TRELLIS.2 (nvdiffrast e nvdiffrec) são só para uso não comercial. Para a Mecanifica serve pouco: a malha gerada não tem peças, nomes nem parâmetros, como o STL de malha única das [sondas de importação](banco-de-provas/importar-objeto-2026-10-15/sondas-2026-10-16/SONDAS.md), e no máximo serviria de referência visual quando não houver foto; a textura é material, fora do que este repositório cobre; e nada disso roda no contêiner sem placa de vídeo.
