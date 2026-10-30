# Visões de conferência na bancada — arame, raio X, curvatura, zebra e luz rasante em tempo real, num seletor que a pessoa usa

**Estado:** ativo

**Responsável:** Claude, com a pessoa aprovando o seletor e cada visão por imagem

**Repositório e base:** `warbookbr/nos-modelar`, main depois do fechamento do plano [glossário e entrada para pessoas](encerrados/2026-10-30-glossario-e-entrada-para-pessoas.md); o [furgão realista](2026-10-30-furgao-realista.md) continua sucessor e ativa depois deste

## Problema observado

A pessoa aprova a forma olhando a bancada, mas na bancada ela só vê a peça sólida. Os dois modos de arame já existem no controlador das partes (`definirArame` em `src/bancada/controlar-partes.js`: o arame que esconde o que fica atrás e o de raio X), e só a captura automática de imagens os liga, pela ponte `window.__mecanificaBancada`; nenhum controle os oferece à pessoa. A curvatura, a luz rasante e a zebra existem só como imagens geradas no Blender (`tools/blender/superficie.py`, `curvatura-da-lataria.py`, `luz-rasante.py` e a zebra do pacote cego), fora da bancada, sem girar e sem acompanhar a edição. A pessoa pediu em 2026-10-30 um seletor na bancada para alternar entre essas visões com a peça girando e editável.

## Resultado

A bancada ganha um seletor de visão que a pessoa usa com o mouse ou por atalho, com as visões sólida, arame, raio X, curvatura, zebra e luz rasante, todas em tempo real enquanto a peça gira e se edita; a curvatura da bancada concorda com a do Blender nos mesmos números, e as imagens que a captura automática gera para o crítico não mudam.

## Filtro Agent-First

USAR DIRETO o `definirArame` e o sistema de atalhos da bancada. ENVOLVER a conta da curvatura média e da faixa dos vincos de `superficie.py` num módulo neutro de JavaScript, com a mesma definição e teste numérico contra a saída do Python, para não haver duas réguas que divergem em silêncio. REFATORAR nada da captura automática: ela continua escolhendo a visão pela ponte, e o seletor da pessoa é outra entrada para o mesmo estado. ADIAR o mapa de distância, que precisa de malha de referência carregada na bancada.

## Incluído

O controle "Visão" na barra de baixo da bancada, ao lado das vistas de câmera, com atalho de teclado para cada visão e a escolha lembrada entre sessões como preferência local; o arame e o raio X ligados ao controlador existente; a curvatura média pintada nos vértices, com a mesma escala, as mesmas cores e a mesma faixa ocre dos vincos declarados das vistas obrigatórias da lataria, recalculada depois de cada edição; a zebra pelo vetor refletido, com a largura das listras ajustável; a luz rasante com sombra, elevação baixa e um controle da direção, partindo dos azimutes que `escolher_azimutes` daria para a vista; as provas da bancada para cada visão.

## Excluído

O mapa de distância; mudar as vistas obrigatórias do pacote do crítico ou as imagens que a captura automática gera; material físico (PBR) e paleta nova; desempenho em malha acima do que o acervo tem hoje.

## Invariantes

As imagens das guardas da bancada e da `vistas:critica` saem iguais às de antes com o seletor na visão sólida (`npm run bancada:guardas`). A edição de juntas e a edição de malha funcionam com qualquer visão ligada. O núcleo não muda.

## Gate de saída

1. Cada visão liga pelo controle e pelo atalho, acompanha a rotação da câmera e, na curvatura, a edição da malha, provada por teste da bancada com captura em cada visão.
2. A curvatura média da bancada na peça de prova com vinco (`tools/fixtures/lataria-com-vinco/`) e na `carenagem-de-prova` fica dentro de 5% da escala da curvatura do Blender em cada vértice comparável, e a faixa dos vincos cobre os mesmos vértices.
3. Na zebra e na luz rasante, o amassado da peça de prova aparece: o contraste na região dele passa de um limiar medido contra a mesma região sem o amassado.
4. As guardas da bancada e o `npm run gates -- --completo` passam, e a pessoa aprova o seletor e cada visão por imagem.

## Fatias

1. **Seletor e arame.** O controle "Visão" com as seis opções, os atalhos, a preferência local, e o arame e o raio X ligados; as outras visões aparecem desabilitadas até a fatia delas.
2. **Curvatura.** O módulo neutro da curvatura média e da faixa dos vincos, com o teste contra o Python, e a pintura na bancada.
3. **Zebra e luz rasante.** O material das listras e a luz rasante com sombra e controle de direção.
4. **Prova e fechamento.** As capturas de cada visão para a pessoa, as guardas, a documentação da bancada e o plano movido para `encerrados/`.

## Decisões que dependem da pessoa

1. **Plano e ordem.** Aprovada em 2026-10-30: a pessoa pediu o plano e o pôs antes do furgão realista.
2. **Lugar e conteúdo do seletor.** Recomendo o controle "Visão" na barra de baixo, ao lado das vistas de câmera, com as seis visões, um atalho para cada e a luz rasante com um controle de direção que aparece só quando ela está ligada.

## Riscos e parada

O risco é a curvatura da bancada divergir da do Blender e a pessoa aprovar por uma régua que o crítico não usa: o teste numérico da fatia 2 é a parada, e a divergência acima de 5% volta à pessoa antes de seguir. Para também se a sombra da luz rasante pesar a ponto de a bancada travar no acervo atual.

## Andamento

Ativado em 2026-10-30, a pedido da pessoa, depois do fechamento do plano da entrada para pessoas e antes do furgão realista.
