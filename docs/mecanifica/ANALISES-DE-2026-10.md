# Análises de 2026-10

Duas análises feitas em 2026-10-07 por subagentes, a partir da [pesquisa aberta](PESQUISA-ABERTA-2026-10.md), da [lista de ferramentas por objeto](FERRAMENTAS-POR-OBJETO.md) e do repositório. A primeira responde que conjunto a mais seria bom para modelar em 3D; a segunda avalia o Mecanifica como projeto, frente ao objetivo de uma IA modelar em 3D melhor, mais barato e com mais confiança, com as premissas fixas de que a IA é a usuária, confere o resultado também por imagem e o conteúdo é determinístico e reexecutável. As duas aguardam a leitura da pessoa e não autorizam implementação.


## Conjunto a mais para modelar em 3D

Este texto propõe capacidades que não estão nas 42 ferramentas de `FERRAMENTAS-POR-OBJETO.md`, nem nas quatro lacunas que a pesquisa aberta já apontou contra os modificadores do Blender (deformação por gaiola, projeção sobre superfície, Cast e controle de normais). Ele não autoriza implementação: sem plano ativo, o que sair daqui precisa de plano antes de virar trabalho.

O critério foi o mesmo da lista existente, uma capacidade entra quando sem ela a IA reconstruiria a forma a partir de primitivas, mas acrescentei um segundo critério que a lista não usa: a capacidade também entra quando ela permite provar por medida algo que hoje só se vê na imagem. Os itens estão agrupados pelo que resolvem e, dentro de cada grupo, na ordem em que me parecem valer a pena.

### 1. Fundações que as ferramentas atuais pressupõem e ainda não existem

Perfil 2D com furos e ilhas. O esboço diz, na seção dos perfis por função, que o perfil de uma extrusão não tem furo e que o disco de freio contorna isso com uma fenda de 0,4 mm e canais. Qualquer peça plana vazada (flange, gabarito, chapa com recortes, perfil estrutural oco, junta plana, placa de circuito) esbarra nesse limite. Uma região 2D com contorno externo e buracos, mais o deslocamento de contorno para dentro e para fora (offset), resolve a fenda e alimenta casca, chapa, vedação, gabinete, perfil e furação ao mesmo tempo.

Curvas 2D com arco, tangente e spline. O README do esboço afirma que não existe curva livre e que a suavidade vem de mais pontos. Um perfil descrito por segmentos, arcos tangentes e curvas de Bézier, amostrado de forma determinística, daria base comum a perfil de revolução, loft, varredura, caminho de cabo, came, perfil aerodinâmico e contorno de carroceria, em vez de cada gerador reamostrar polígonos por conta própria.

Seleção geométrica estável de faces e arestas. Casca com faces abertas, arredondar arestas nomeadas, furação em qualquer face e nervura dependem de dizer qual face ou aresta, e a regra do projeto proíbe índices como identidade. Os seletores de CadQuery e build123d (por direção da normal, por posição extrema, por tipo de superfície) e o problema do nome topológico do FreeCAD mostram o desenho: uma consulta geométrica que se reavalia depois de a peça mudar. Esta é a dependência escondida de quatro das dez ferramentas mais citadas da lista.

Tabelas de norma como dado único. Fixador, rosca, rolamento, vedação (canaleta de o-ring), perfil, polia, correia e eixo escalonado consultam tabelas parecidas (bitola, série, passo, folga). Um catálogo versionado de normas e ajustes (ISO 286 para folga de encaixe, métrica de rosca, série de rolamento, DIN 471 para anel elástico, trilho DIN, rack de 19 polegadas) consultado por todas as ferramentas evita que cada uma embuta os próprios números e permite um gate de designação ("M8x30 ISO 4762" resolve para um sólido).

### 2. Provas por medida que hoje faltam

Mobilidade e curso de mecanismos. `articula` publica o eixo de giro como porta, mas nada prova que o mecanismo se move. A descrição de corpos e juntas com limites (URDF e MJCF, na pesquisa) permitiria checar, por varredura de ângulo ou de curso, que escavadeira, suspensão, tesoura, quatro barras, robô SCARA e cilindro hidráulico percorrem a faixa declarada sem se atravessar e sem passar do alcance. É a extensão natural do gate de contato estático.

Massa, centro de massa e estabilidade. Com densidade por material e volume por peça, o gate pode medir massa total, posição do centro de massa e se ele cai dentro do polígono de apoio. Reprova cadeira que tomba, guindaste sem contrapeso, moto sem apoio e carrinho que vira. É barato, determinístico e responde a uma pergunta que a imagem não responde.

Gates de fabricação por processo. Espessura mínima de parede, balanço e ponte para impressão, ângulo de saída para injeção, raio mínimo de dobra e alívio para chapa, acesso de ferramenta para usinagem, malha estanque e sem auto-interseção (Manifold, DFMPro, OrcaSlicer, Meshmixer na pesquisa). A família "peças funcionais para impressão 3D" e as de chapa e gabinete só têm sentido completo com isso, e ele fica separado da geometria, como a pesquisa sugere.

Desvio contra referência em 3D. O esboço já confere contorno contra imagem. Falta a medida de distância entre a peça e uma nuvem ou malha de referência (mapa de erro do CloudCompare), útil quando a referência é um escaneamento ou um STEP.

### 3. Geradores novos que atendem muitos objetos fora da lista

Gramática de divisão (split grammar, CGA). Divide um retângulo ou volume por regras com repetição e variação por semente. Atende fachada, janela, painel de carroceria, grade de ventilação, teclado, estante, vitral, piso e telhado com uma só descrição, e `arquitetura`, `gabinete` e `movel` poderiam ser casos dela.

Distribuição com espaçamento mínimo (amostragem de Poisson disk e padrões em grade irregular). `repete` copia com passo regular, e não existe a espalhada: rebites em chapa, parafusos de flange irregular, pedras, telhas, folhas, cabelo, pontos de apoio. A semente garante o determinismo.

Módulos por encaixe de arestas (WFC e geração por tiles). Resolvem adjacência entre módulos e servem à família "cenário e ambientes de jogo" da fase posterior (ruínas, masmorras, naves), além de esteiras de módulos e cidades em miniatura. Só vale depois de existirem módulos com portas compatíveis.

Campos implícitos (SDF) com união suave, filete variável e treliça. Booleana suave, espessura que varia por campo e preenchimento celular (giroide, Voronoi, dual de malha do Tissue) cobrem pegas ergonômicas, peças fundidas, ossos, próteses, capacetes e miolo leve de peças impressas. Dão também a espessura variável que a `casca` constante não alcança. A extração de malha (dual contouring, Marching Cubes, Manifold) é a etapa final.

Terreno e rocha. Mapa de altura com erosão simples, rochas por displace sobre esfera com cortes planos, árvores por L-system e plantas por gramática de ramificação. Abrem a família "natureza" da fase posterior com o mesmo contrato determinístico e sem depender de ruído solto.

Linhas de painel, decalque e junta sobre superfície curva. O Plating Generator e o Decal Machine da pesquisa fazem ranhuras, painéis e emendas sobre uma superfície que não é plana. Atende avião, nave, robô, carenagem, relógio e armadura, e depende da projeção sobre superfície que a pesquisa já listou como lacuna.

Sólido por esqueleto com junta suave (Skin do Blender combinado a Subdivision). Uma árvore de nós com raio por nó dá corpo orgânico, braço, perna, tronco e ramo com junta contínua. Cobre quase toda a fase posterior de criaturas e personagens e o que a lista chama de "humanoide" e "quadrúpede" (hoje só `loftSuave` e `articula`). Combina com `pesar`, que já existe para pesos de osso.

Modular de interface padrão (Gridfinity, rack de 19 polegadas, paleta, contêiner ISO, trilho DIN, encaixe de tijolo). Um módulo único de interface cria um ecossistema de peças compatíveis, e a pesquisa já aponta o Gridfinity como prova. Atende organizador, rack, prateleira, caixa, palete, contêiner e a família de impressão 3D, e permite o gate de "cabe no vão".

### 4. Famílias de objetos que esse conjunto abriria

Mobiliário de interior pequeno e utensílios de cozinha (já cobertos em parte), instalações de laboratório e prédios simples saem mais baratos com a gramática de divisão e a tabela de normas. Cenário de jogo, natureza e criaturas, hoje adiados, passam a ter uma rota concreta: terreno, distribuição, tiles, campos e esqueleto com junta suave. Dois tipos de objeto ficam fora de qualquer ferramenta listada e merecem decisão da pessoa: o objeto com mecanismo que precisa provar movimento (brinquedo articulado, autômato, relógio em funcionamento) e o objeto montado de muitas peças iguais com variação (cota de malha, cestaria, tecelagem), que pedem mobilidade e distribuição ao mesmo tempo.

### Ordem sugerida

Primeiro as quatro fundações do grupo 1, porque 125 objetos da lista dependem de casca, 62 de chapa e 57 de gabinete e as três usam perfil com furo, offset e seleção de face. Depois mobilidade e massa, que são medidas sobre o que já existe e têm o menor custo por informação nova. Os geradores do grupo 3 entram por demanda de objeto, com a gramática de divisão e a distribuição por espaçamento na frente, por atenderem mais famílias da fase atual. Terreno, tiles e esqueleto ficam para a fase posterior, junto das famílias orgânicas.

### Ressalva de evidência

Quase tudo que a pesquisa cita não foi aberto; os projetos acima (CadQuery, build123d, BOSL2, URDF e MJCF, Tissue, Gridfinity, Manifold, CloudCompare) vêm de lá e precisam de conferência do link antes de servirem de base. As lacunas do núcleo (perfil sem furo, ausência de curva livre, `casca` inexistente) vêm do README do esboço e do catálogo de capacidades, que lista 36 operações e nenhuma de casca, offset, curva, seleção geométrica ou medida de massa.

## Avaliação da estrutura do Mecanifica

Avaliação feita em 2026-10-07 a partir de `docs/mecanifica/INDEX.md`, `VISAO.md`, `ARQUITETURA.md`, o dossiê do modelador inverso, o plano ativo do catálogo de famílias, o plano do braço robótico, o README do módulo de esboço, o catálogo gerado de capacidades, `procedural/nucleo/manifold.js` e a receita do ombro do braço. Nenhum arquivo do repositório foi alterado. O que está marcado como hipótese é inferência sobre o desenho e diz em que arquivo se apoia.

### Veredito

A metade do projeto que guarda, identifica, compõe e confere está bem desenhada para o objetivo. Receita determinística, identidade semântica, montagem recursiva, mapa de dependências derivado de dados, fronteira entre núcleo headless e bancada, revisão e impacto são exatamente o que uma IA precisa para não perder o controle de um objeto grande. A metade que gera forma é fina e está dividida em dois mundos que não se falam, e a metade que confere mede a peça contra a própria declaração dela. Como o objetivo é modelar melhor, mais barato e com mais confiança, o gargalo hoje está na geração e na âncora externa da verificação, e não na composição. A estrutura certa existe em pedaços; o que eu mudaria é a ordem das camadas e a quantidade de representações.

### O que está certo e deve ficar

A regra de que peça é gerada por receita e conjunto é organizado por montagem, com relações que atravessam ramos, é a decisão que permite à IA trabalhar em alvos pequenos. A separação entre alvo editável e contexto visível (`CONTEXTO-MONTAGEM-IA.md`, `src/autoria/derivar-roteiro-revalidacao.js`) reduz o contexto que a IA precisa carregar, o que ataca o custo. O registro explícito de operações com catálogo gerado (`gerado/CATALOGO-CAPACIDADES.md`) faz a IA descobrir o vocabulário sem ler código. A bancada que nunca escreve receita, só medida, mantém uma única fonte de verdade. O registro de gotchas com bloqueio obrigatório é memória institucional útil para uma usuária que não lembra entre sessões. Nada disso precisa ser refeito.

### 1. Duas geometrias paralelas: esboço e núcleo

O módulo `modulos/esboco/` trabalha em milímetro, com prismas próprios, dez componentes em JSON (roda, mola, engrenagem, rolamento) e reimplementa encostar, espelhar, ponto nomeado e o gate de contato, copiando até a constante `MINIMO_DO_MOTIVO`. O núcleo trabalha em metro, com malha poligonal e portas coaxiais. O README do esboço proíbe importar o núcleo. O plano ativo reconhece o custo ("o que o esboço decide é refeito na modelagem") e responde com dois geradores por família e uma conferência entre eles.

A minha leitura é que essa resposta fixa a duplicação em vez de removê-la. Cada família nova passa a ter dois códigos e um teste de coerência, e cada correção de encaixe precisa acontecer duas vezes. Eu mudaria para um documento único de objeto (partes, parâmetros, interfaces e uma descrição por primitivas ou features) com níveis de detalhe compilados pelo mesmo núcleo: o nível zero é o esboço de primitivas, o nível final é a receita detalhada, e o nível seguinte só pode refinar dentro do envelope e das interfaces do anterior. A conferência entre geradores deixa de ser teste e vira propriedade da compilação. Hipótese apoiada em `modulos/esboco/README.md` (seção de independência) e em `planos/2026-10-06-o-catalogo-de-familias.md` (itens incluídos e risco de divergência). O motivo original da separação, o núcleo exigir montagem v5 e malha, se resolve dando ao núcleo uma entrada de primitivas paramétricas que não exige malha detalhada, e não mantendo um segundo motor.

### 2. A representação de forma é baixa demais para peça mecânica

Tudo no núcleo entra e sai como `mecanifica.malha-poligonal@1`. Várias operações endereçam por ID posicional (`moveV`, `moveA`, `moveF`, `extruda`, `vira`, `mescla`), o que contraria a regra do próprio CLAUDE.md de que índice nunca é identidade, mesmo que só valha dentro de uma execução. O filete v1 é chanfro plano, o arredondamento é por painéis, e as booleanas passam pela Manifold sobre malhas já facetadas, o que produz o gotcha da booleana entre superfícies quase rentes. A receita do ombro mostra o resultado prático: a IA escreve `derivar` à mão em JavaScript, com conversões `mm/1000`, raios de dobra calculados para a parede não se dobrar e IDs numéricos de faixa (`ID = { coluna: 100, anel: 200 ... }`).

Para peça mecânica, que o dossiê diz que deve aproveitar primeiro o motor existente, a IA erra menos e gasta menos quando descreve features (furo em tal face, filete de raio r na aresta entre tal e tal face, revolução deste perfil) e o kernel resolve a geometria exata. O repositório já carrega `occt-wasm` para exportar STEP. Hipótese: usar o OpenCascade como kernel opcional das famílias mecânicas, com a malha poligonal como saída e não como meio de autoria, daria filetes verdadeiros, medidas exatas de furo e eixo e seletores semânticos de face, e eliminaria uma classe inteira de gotchas. Apoio em `DOSSIE-EXPORTACAO-CAD-STEP.md`, `FILETE-V2.md` e `GOTCHAS-AUTORIA-VISUAL.md` (linha da booleana). O custo é o tamanho do wasm e o determinismo entre versões do kernel, que se controla fixando a versão e gravando hash da saída, como já se faz. Se o kernel B-Rep for pesado demais, a alternativa é uma camada de features sobre a malha atual que gere os IDs posicionais internamente, de modo que a IA nunca os escreva.

### 3. A verificação precisa de âncora fora da peça

O plano do braço registrou o achado que governa os outros: toda régua compara a peça contra a declaração dela, e o braço passou em todas as medidas deitado no chão. A correção foi um gate pontual (`guarda:referencial`). A causa estrutural continua: a referência entra como imagem para o crítico, e o crítico é outra IA com escala que o plano ativo ainda está ancorando, porque as notas paravam em 6 ou 7.

O repositório já tem a peça que falta. `modulos/contorno-da-imagem/` tira da referência o contorno de cada parte em milímetro, e o esboço já tem `--referencia` e `--medidas-da-referencia`. Eu poria isso no centro da verificação: cada parte declarada aponta para uma região da referência, o render ortográfico da parte é comparado por silhueta e por medidas nomeadas contra essa região, e só passa ao crítico visual o que a medida não decide (caráter, proporção percebida, superfície). O crítico deixa de ser o único juiz e passa a ser o juiz do resíduo, o que reduz rodadas e torna a nota comparável. Hipótese apoiada em `modulos/contorno-da-imagem/`, `modulos/esboco/README.md` e na lição do braço. O cuidado é o mesmo que o gotcha já registra: silhueta verde não aprova, ela reprova cedo e barato.

O crítico também deveria ser tratado como instrumento medido. Um conjunto fixo de renders com defeitos conhecidos e nota esperada, rodado a cada mudança de brief ou de modelo, diria se a escala ancorada funciona em vez de supor. Hipótese apoiada em `GOTCHAS-AUTORIA-VISUAL.md` (crítico com alvo ao lado) e no item do crítico do plano ativo.

### 4. Catálogo de famílias e modelador inverso são a mesma camada

O dossiê do modelador inverso propõe priors deformáveis por família, ajuste inverso e grafo de superfície semântica, e afirma que nada disso existe. O plano ativo propõe famílias paramétricas homologadas. São duas descrições da mesma camada em altitudes diferentes: a família paramétrica é o prior, e o ajuste dos parâmetros contra o contorno medido da referência é o modelador inverso na sua forma mais simples. Eu declararia isso por escrito e faria do catálogo o caminho do dossiê, com a parte de superfície livre de veículo e humanoide adiada até a família mecânica provar o ciclo completo. Sem isso, a IA que entra pelo INDEX encontra duas direções vigentes. Apoio em `DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md` e `planos/2026-10-06-o-catalogo-de-familias.md`.

Com o contorno em milímetro do item 3, o ajuste dos parâmetros de uma família pode ser numérico (minimizar a diferença de silhueta e de medidas nomeadas por vista) em vez de rodada de IA. A IA escolhe a família e o arquétipo, o otimizador ajusta, e a IA confere. Isso ataca diretamente o custo de 260 mil tokens por esteira medido no plano anterior. Hipótese; o determinismo se preserva gravando o resultado do ajuste como parâmetros na receita.

### 5. Interfaces devem ter um contrato só

Hoje há portas publicadas pelo núcleo (`publicarPorta`, coaxialidade), relações de montagem v1 a v5, contatos do esboço com gate próprio e, no plano ativo, interfaces de encaixe entre famílias ("aro 17 serve no aro 17"). São quatro formas de dizer que duas coisas se encaixam. Eu unificaria num tipo de interface versionado, com geometria (eixo, plano, diâmetro, padrão de furos) e tolerância, que a família declara, o esboço respeita, a montagem resolve e o gate de contato confere. O catálogo passa a responder "o que encaixa aqui" pelo mesmo dado que a montagem usa para posicionar. Apoio em `src/autoria/interfaces-montagem.js`, `src/autoria/posicao-por-porta.js`, `modulos/esboco/src/contato.js` e no plano ativo.

### 6. Composição construída à frente da geração

Há quatro versões de montagem persistida, mapa canônico, escrita transacional, impacto global e um perfil MCP de autoria, e o acervo tem uma peça, o braço, com quatro partes. A infraestrutura de composição está pronta para um carro; a de geração ainda não fecha uma parte boa na primeira rodada. Não proponho remover nada, e sim congelar a composição no estado atual até que o catálogo produza objetos que a exercitem de verdade, porque cada versão nova de contrato sem conteúdo real para testá-la é custo de manutenção e de leitura. Apoio em `MONTAGEM-PERSISTIDA-V1.md` a `V4.md` e em `procedural/pecas/`.

### 7. Regras em prosa custam contexto e confiança

São 43 documentos em `docs/mecanifica/`, cerca de 38 mil linhas de Markdown no repositório, e a leitura obrigatória antes de gerar forma soma perto de 60 mil caracteres, com mais sete documentos sob demanda. Para uma usuária que paga por token e esquece entre sessões, cada regra que vive só em prosa custa leitura em toda tarefa e só vale se for lembrada. O projeto já tem a disciplina de transformar achado em gate; eu estenderia isso como critério de arquitetura: a regra que pode virar schema, tipo, recusa do executor ou gate sai do documento obrigatório e fica só no código com mensagem de erro que explica, e o documento obrigatório guarda apenas o que é julgamento (ordem envelope, volumes, interfaces, detalhe; quando parar o método diagnóstico). Os gotchas por operação, por exemplo, podem virar avisos do próprio executor quando a condição é detectável, como booleana entre faces quase coplanares. Apoio em `tools/mapa/leitura-obrigatoria.mjs`, `usar/GOTCHAS-AUTORIA-VISUAL.md` e `GOTCHAS-POR-OPERACAO.md`.

### 8. Custo como medida de primeira classe

O objetivo inclui "mais barato", e a única medida de custo que encontrei é a do fechamento do esboço detalhado (rodadas e tokens por unidade). Eu gravaria tokens, rodadas e nota por unidade em cada registro de rodada, como dado estruturado, e faria do banco de provas citado no fim do plano ativo um gate periódico: os mesmos objetos refeitos a cada mudança relevante, com e sem catálogo, com e sem kernel de features. Sem isso, as mudanças acima não têm como provar que melhoraram o objetivo. Apoio em `planos/2026-10-06-o-catalogo-de-familias.md` (problema observado e seção "Depois deste plano").

### Ordem que eu seguiria

Primeiro a interface única e o documento único de objeto com níveis de detalhe, porque o plano ativo está prestes a criar o segundo gerador por família e isso fica mais caro de desfazer depois. Em seguida a verificação ancorada no contorno medido e o crítico calibrado, porque tornam mensurável tudo o que vem depois. Depois as famílias mecânicas sobre uma camada de features, com ajuste numérico dos parâmetros contra a referência. Por último, e só com essa base provada, a superfície livre de veículo e humanoide que o dossiê descreve.
