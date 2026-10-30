# Visões de conferência e interface da bancada — arame, raio X, curvatura, zebra e luz rasante em tempo real, num seletor, e a tela reorganizada em torno da peça sobre um sistema visual único

**Estado:** ativo

**Responsável:** Claude, com a pessoa aprovando o seletor e cada visão por imagem

**Repositório e base:** `warbookbr/nos-modelar`, main depois do fechamento do plano [glossário e entrada para pessoas](encerrados/2026-10-30-glossario-e-entrada-para-pessoas.md); absorveu em 2026-10-30 o rascunho da [interface da bancada](encerrados/2026-10-30-interface-da-bancada.md), e o [furgão realista](2026-10-30-furgao-realista.md) ativa depois deste

## Problema observado

A pessoa aprova a forma olhando a bancada, mas na bancada ela só vê a peça sólida. Os dois modos de arame já existem no controlador das partes (`definirArame` em `src/bancada/controlar-partes.js`: o arame que esconde o que fica atrás e o de raio X), e só a captura automática de imagens os liga, pela ponte `window.__mecanificaBancada`; nenhum controle os oferece à pessoa. A curvatura, a luz rasante e a zebra existem só como imagens geradas no Blender (`tools/blender/superficie.py`, `curvatura-da-lataria.py`, `luz-rasante.py` e a zebra do pacote cego), fora da bancada, sem girar e sem acompanhar a edição. A pessoa pediu em 2026-10-30 um seletor na bancada para alternar entre essas visões com a peça girando e editável.

A interface da bancada entrou neste plano em 2026-10-30, a pedido da pessoa, com o problema medido no rascunho que a descrevia. A pessoa achou a interface da bancada genérica, com a aparência de uma tela feita de uma vez por IA, e pediu em 2026-10-30 a reestruturação que um engenheiro sênior faria. Medido no código: `src/bancada/main.js` tem 2.093 linhas e busca 63 elementos da página pelo identificador; `src/bancada/styles.css` tem 1.896 linhas, 43 cores escritas à mão, duas famílias de fonte sem serifa e 49 declarações de arredondamento. Na tela, os dois painéis laterais ocupam quase metade da largura numa janela de 1400 pixels, a barra das vistas de câmera transborda, o painel da direita mistura modos de exibição, controles, ações e edição, os modos desabilitados parecem botões quebrados, a lista de componentes mostra contagens internas como "120F", e a janela e a tela inicial usam nomes diferentes para a mesma bancada.

## Resultado

A bancada ganha um seletor de visão que a pessoa usa com o mouse ou por atalho, com as visões sólida, arame, raio X, curvatura, zebra e luz rasante, todas em tempo real enquanto a peça gira e se edita; a curvatura da bancada concorda com a do Blender nos mesmos números, e as imagens que a captura automática gera para o crítico não mudam. A bancada passa também a ter a peça no centro e a ocupar o resto da tela, uma barra superior com o nome e o estado da peça e a busca de comandos, a árvore das partes num painel estreito e recolhível, o painel da direita só com o que vale para a seleção, a edição como modo explícito e uma barra de estado; tudo sobre um sistema visual único de espaçamento, tipografia, cor e ícones, na proposta de tela que a pessoa escolheu, e com as imagens da captura automática para o crítico iguais às de antes.

## Filtro Agent-First

USAR DIRETO o `definirArame` e o sistema de atalhos da bancada. ENVOLVER a conta da curvatura média e da faixa dos vincos de `superficie.py` num módulo neutro de JavaScript, com a mesma definição e teste numérico contra a saída do Python, para não haver duas réguas que divergem em silêncio. REFATORAR nada da captura automática: ela continua escolhendo a visão pela ponte, e o seletor da pessoa é outra entrada para o mesmo estado. ADIAR o mapa de distância, que precisa de malha de referência carregada na bancada.

## Incluído

Para a interface: as propostas de tela desenhadas para a pessoa escolher; as definições do sistema visual (espaçamento numa grade de 4 e 8 pixels, uma família de fonte com variante monoespaçada para números, dois ou três tamanhos de texto, uma cor de destaque e cinzas neutros, bordas finas, um conjunto de ícones, os estados de foco, desabilitado e carregando); a barra superior com a busca de comandos; a árvore das partes com visibilidade e isolar por linha; o cubo de orientação no lugar das nove vistas em botão; a barra flutuante da cena com câmera, projeção, visão e enquadrar, onde o seletor do plano das visões entra; o painel contextual da seleção com abas; o modo de edição explícito; a barra de estado; a cena com fundo neutro, luz de estúdio, sombra suave no chão e contorno da seleção; a quebra do `main.js` em componentes com estado central; um teste de imagem por componente.

Para as visões: O controle "Visão" na barra de baixo da bancada, ao lado das vistas de câmera, com atalho de teclado para cada visão e a escolha lembrada entre sessões como preferência local; o arame e o raio X ligados ao controlador existente; a curvatura média pintada nos vértices, com a mesma escala, as mesmas cores e a mesma faixa ocre dos vincos declarados das vistas obrigatórias da lataria, recalculada depois de cada edição; a zebra pelo vetor refletido, com a largura das listras ajustável; a luz rasante com sombra, elevação baixa e um controle da direção, partindo dos azimutes que `escolher_azimutes` daria para a vista; as provas da bancada para cada visão.

## Excluído

Funções novas da bancada fora das visões; uma aplicação para a pessoa fora da bancada; o mapa de distância; mudar as vistas obrigatórias do pacote do crítico ou as imagens que a captura automática gera; material físico (PBR) e paleta nova; desempenho em malha acima do que o acervo tem hoje.

## Invariantes

As imagens das guardas da bancada e da `vistas:critica` saem iguais às de antes com o seletor na visão sólida (`npm run bancada:guardas`). A edição de juntas e a edição de malha funcionam com qualquer visão ligada. O núcleo não muda.

## Gate de saída

1. Cada visão liga pelo controle e pelo atalho, acompanha a rotação da câmera e, na curvatura, a edição da malha, provada por teste da bancada com captura em cada visão.
2. A curvatura média da bancada na peça de prova com vinco (`tools/fixtures/lataria-com-vinco/`) e na `carenagem-de-prova` fica dentro de 5% da escala da curvatura do Blender em cada vértice comparável, e a faixa dos vincos cobre os mesmos vértices.
3. Na zebra e na luz rasante, o amassado da peça de prova aparece: o contraste na região dele passa de um limiar medido contra a mesma região sem o amassado.
4. A pessoa escolheu uma das propostas de tela por imagem antes do código da interface, e aprovou por imagem cada parte entregue.
5. A folha de estilo usa só as definições do sistema visual: nenhuma cor, tamanho de fonte ou espaçamento fora delas, conferido por um gate.
6. Numa janela de 1400 por 900 a cena ocupa ao menos 70% da largura com os painéis abertos, e nada transborda em 1100 pixels.
7. `main.js` sem acesso direto à página fora dos componentes, e cada componente com teste de imagem.
8. As guardas da bancada e o `npm run gates -- --completo` passam, e a pessoa aprova o seletor e cada visão por imagem.

## Fatias

1. **Seletor e arame.** O controle "Visão" com as seis opções, os atalhos, a preferência local, e o arame e o raio X ligados; as outras visões aparecem desabilitadas até a fatia delas.
2. **Curvatura.** O módulo neutro da curvatura média e da faixa dos vincos, com o teste contra o Python, e a pintura na bancada.
3. **Zebra e luz rasante.** O material das listras e a luz rasante com sombra e controle de direção.
4. **Propostas de tela.** Em paralelo com as fatias 1 a 3, três propostas de tela desenhadas, na mesma peça e no mesmo tamanho de janela, para a pessoa escolher.
5. **Sistema visual e estado central.** As definições, o gate que as cobra e o estado da bancada num lugar só, sem mudar a aparência ainda.
6. **Estrutura da tela.** Barra superior, árvore das partes, cena com a barra flutuante, o seletor de visão e o cubo de orientação, painel contextual e barra de estado, na proposta escolhida, um componente de cada vez.
7. **Cena e acabamento.** Fundo, luz, sombra, contorno da seleção e os estados dos controles.
8. **Prova e fechamento.** As capturas de cada visão e da tela para a pessoa, as guardas, a documentação da bancada e o plano movido para `encerrados/`.

## Decisões que dependem da pessoa

1. **Plano e ordem.** Aprovada em 2026-10-30: a pessoa pediu o plano e o pôs antes do furgão realista.
2. **Lugar e conteúdo do seletor.** Aprovada em 2026-10-30, na forma recomendada: o controle "Visão" na barra de baixo, ao lado das vistas de câmera, com as seis visões, um atalho para cada e a luz rasante com um controle de direção que aparece só quando ela está ligada.
3. **Interface no mesmo plano.** Aprovada em 2026-10-30: a pessoa pediu para fazer a reestruturação da interface neste plano, começando já, com agentes em Opus.
4. **Proposta de tela.** A pessoa escolhe na fatia 4.

## Riscos e parada

O risco da interface é a reestruturação mudar o que a captura automática vê: as guardas da bancada são a parada, e qualquer diferença nelas volta à pessoa antes de seguir. O risco das visões é a curvatura da bancada divergir da do Blender e a pessoa aprovar por uma régua que o crítico não usa: o teste numérico da fatia 2 é a parada, e a divergência acima de 5% volta à pessoa antes de seguir. Para também se a sombra da luz rasante pesar a ponto de a bancada travar no acervo atual.

## Andamento

Ativado em 2026-10-30, a pedido da pessoa, depois do fechamento do plano da entrada para pessoas e antes do furgão realista.

Na conferência da bancada publicada, em 2026-10-30, apareceram dois pontos que a fatia 1 considera: o painel de Inspeção já oferece "Wireframe" só para a seleção, e o seletor parte dele em vez de criar um segundo caminho; e, ao carregar o furgão, a prancha da aba "Imagem REF" aparece dentro da cena atravessando a peça, o que atrapalha as visões e fica como achado a resolver ou a devolver ao backlog com o caso.
