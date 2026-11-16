# Reflexo na bancada: a superfície de lataria julgada sem o Blender

**Estado:** ativo

**Território:** `tools/modelar/olhar-bancada.mjs`, `src/bancada/visoes/`, `tools/modelar/vistas-para-critica.mjs`, `tools/modelar/vistas-de-superficie.mjs`, `docs/modelar/usar/PARE-E-ANALISE.md`, `docs/modelar/banco-de-provas/reflexo-na-bancada-2026-11-15/`, `tools/fixtures/acervo/chapa-de-reflexo-de-prova/`, `tools/fixtures/acervo/chapa-lisa-de-reflexo-de-prova/`, `tools/fixtures/reflexo-calibracao/`, `tools/modelar/pente-de-curvatura.mjs`, `tools/modelar/pente-de-curvatura.test.mjs`, `tools/modelar/mapa-de-desvio.mjs`, `tools/modelar/mapa-de-desvio.test.mjs`, `tools/modelar/continuidade-nas-emendas.mjs`, `tools/modelar/continuidade-nas-emendas.test.mjs`, `tools/modelar/suavidade-por-regiao.mjs`, `tools/modelar/suavidade-por-regiao.test.mjs`, `tools/modelar/imagem-de-medida.mjs`

**Responsável:** a IA da sessão do cordão de solda conduz e mede desde 2026-11-16, quando a sessão do carro parou (a pessoa passou o plano); a pessoa julga por imagem se a superfície ficou legível.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-15 (af68628e).

Pedido pela pessoa em 2026-11-15, na rodada 1 do quarto traseiro do [carro de passeio](2026-11-14-modelagem-de-carro.md).

## Problema observado

Na rodada 1 da lataria do carro (`procedural/pecas/carro-fastback/partes/lataria/`, commit b640556f), o modelador conferiu a chapa pela foto fosca da bancada e pelas vistas de luz rasante e curvatura do Blender e entregou uma superfície ondulada no teto, na lateral e na tampa. A pessoa olhou as mesmas imagens e não soube dizer se a chapa estava boa: a foto fosca com luz difusa esconde a curvatura, e a vista de três quartos de luz rasante saiu quase toda preta. Um teste avulso no Blender, fora do repositório, com pintura brilhante e um ambiente de faixas claras e escuras, mostrou a ondulação em 30 s por imagem: as faixas refletidas serpenteiam, se amontoam no encontro do ombro com a tampa e convergem em leque em volta do arco da roda.

A bancada já tem as visões Zebra, Luz rasante e Curvatura (`src/bancada/visoes/`, atalhos `b`, `j` e `k`), mas só para quem abre a página. A captura por comando (`npm run bancada`) não as alcança, e por isso o modelador e o pacote do crítico (`npm run vistas:critica`) dependem do Blender para ver a superfície, com `MODELAR_BLENDER`, Python com numpy e Pillow, e a recusa do pacote quando ele falta. A bancada também não tem uma visão de pintura brilhante, que é a imagem que se compara com a foto de referência de um carro.

O processo não pegaria a ondulação sozinho: a régua de ondulação acusou 26 falhas de até 1,45 mm perto da traseira, e a chapa ondula também onde a régua não acusou; quem achou foi a pessoa, ao dizer que não conseguia julgar.

## Resultado

O modelador, o crítico e a pessoa veem a superfície de uma peça de lataria por reflexo, em imagem gerada pela bancada com um comando, com a peça enchendo o quadro, e a pessoa decide com a medida da paridade se o pacote de lataria deixa de exigir o Blender.

## Filtro Agent-First

- Zebra, luz rasante e curvatura por comando: ESTENDER `tools/modelar/olhar-bancada.mjs` com `--visao=<id>`, que liga a visão do registro (`src/bancada/visoes/registro-de-visoes.js`) antes da captura, e com `--largura-da-zebra=<graus>` e `--azimute=<graus>` para o controle de cada uma. As visões existem; falta o caminho da captura.
- Peça enchendo o quadro: ESTENDER a captura com `--enquadrar`, que fecha a câmera na caixa do visível (`src/bancada/caixa-do-visivel.js`). Na rodada 1 a peça ocupou perto de um décimo do quadro de 1280 por 720.
- Pintura brilhante: CRIAR a visão `pintura` em `src/bancada/visoes/`, com material de verniz sobre base escura e um ambiente de faixas de luz paralelas ao comprimento da peça, gerado por conta, sem arquivo de imagem. É visão de inspeção, como a zebra: não é material da peça, não entra na receita nem na paleta e não muda o que a bancada salva.
- Pacote do crítico: ESTENDER `vistas:critica` para levar a zebra e a pintura da bancada na peça de lataria, ao lado das vistas do Blender enquanto a paridade não estiver medida.
- Tirar a exigência do Blender do pacote de lataria: ADIAR até a fatia 3, que mede a luz rasante e a curvatura da bancada contra as do Blender na mesma peça; a decisão é da pessoa.
- Pente de curvatura numa seção: CRIAR `tools/modelar/pente-de-curvatura.mjs`, que corta a peça num plano (como o `--corte` da bancada) e desenha a curva da seção com uma haste por ponto, de comprimento proporcional à curvatura, em imagem e em números (a curvatura ao longo da seção e onde ela muda de sinal ou salta). Acrescentado pela pessoa em 2026-11-16: a zebra é legível para o agente como medida, mas não para a pessoa julgar a olho, e o pente é a leitura padrão de superfície de carroceria, legível para os dois.
- Mapa de desvio em milímetros: CRIAR `tools/modelar/mapa-de-desvio.mjs`, que pinta a peça pela distância, com sinal, a uma superfície lisa ajustada a ela (e, quando houver, à referência), com a escala em mm na imagem. Usa a régua de ondulação (`tools/modelar/ondulacao-da-superficie.mjs`, do plano do carro) só como leitura, sem mudá-la. Acrescentado pela pessoa em 2026-11-16, para dizer "aqui está 1,2 mm para dentro", que nem a pessoa nem o agente tiram da zebra.
- Continuidade nas emendas: CRIAR `tools/modelar/continuidade-nas-emendas.mjs`, que percorre cada linha onde dois trechos da chapa se encontram (a borda entre regiões ou entre faces de origem diferente, e a curva declarada da gaiola) e mede, ponto a ponto, a fresta em mm, o ângulo entre as normais dos dois lados em graus e a razão entre as curvaturas dos dois lados, com imagem e números. Acrescentado pela pessoa em 2026-11-16: é a leitura em números do que a zebra mostra por imagem nas emendas, o único ponto em que a zebra vê o que o mapa de desvio não vê.
- Índice de suavidade por região: CRIAR `tools/modelar/suavidade-por-regiao.mjs`, que soma, em cada região ou parte da chapa, a variação da curvatura por área (a energia de suavidade), e devolve um número por região para comparar uma rodada com a outra. Acrescentado pela pessoa em 2026-11-16. É medida, não nota: não aprova forma.
- Desenho de imagem de medida: extrair a fonte, o quadro e a base da vista que o mapa e o pente usam para `tools/modelar/imagem-de-medida.mjs`, compartilhado pelas quatro ferramentas.
- Leitura da zebra: estudo com chapas de calibração de defeito conhecido (amassado, degrau, vinco de curvatura, ondulação) em `tools/fixtures/reflexo-calibracao/`, e a instrução de leitura escrita do que o estudo mostrou, provada por um crítico cego que acha cada defeito só com a instrução.
- Reescrever as vistas do Blender, portar a régua e o pacote cego: fora. Eles medem malha contra referência e não são imagem de inspeção.

## Incluído

- `--visao`, `--enquadrar` e os dois controles na captura, com `--ajuda` e teste em fixture neutra (`tools/blender/chapa-com-amassado-de-prova.mjs`, a chapa com amassado declarado);
- a visão `pintura` no registro, com atalho, controle da largura das faixas e teste;
- a zebra e a pintura no `pedido.md` da peça de lataria, com a frase que diz como se lê a faixa;
- o passo no `PARE-E-ANALISE.md`, que a skill `laco-de-modelagem` já manda ler; a frase na própria skill espera o plano da leitura por partes, que a tem no território;
- a medida de paridade entre a bancada e o Blender na chapa de prova e no quarto traseiro do carro, em `docs/modelar/banco-de-provas/reflexo-na-bancada-2026-11-15/`.

## Excluído

- material PBR de peça, paleta nova e textura, que seguem a regra de material do contrato;
- nota de superfície por régua: as medidas deste plano informam, e a nota da superfície continua sendo do crítico e da pessoa;
- mudança na régua de ondulação, que é território do plano do carro.

## Gate de saída

- `npm run bancada -- <peça> --visao=zebra --enquadrar` grava a imagem com a peça ocupando mais da metade do quadro, na chapa de prova e no quarto traseiro do carro;
- na chapa com amassado de prova, a zebra e a pintura mostram o amassado declarado e a chapa sem amassado sai com faixas paralelas, conferido por teste que mede a faixa na imagem;
- o `pedido.md` de uma peça de lataria lista a zebra e a pintura, e o crítico cego, sem saber do amassado, o aponta na chapa de prova;
- a pessoa diz, pelas imagens do quarto traseiro, que consegue julgar a superfície;
- o pente de curvatura de uma seção da chapa com amassado mostra o salto da curvatura no amassado e o da chapa lisa não, conferido por teste nos números do pente; o mapa de desvio da chapa com amassado dá a profundidade declarada do amassado com erro de até 10%, por teste;
- a continuidade nas emendas acha, nas chapas de calibração, o degrau e o vinco no lugar declarado, com a fresta, o ângulo e a razão de curvatura dentro de 10% do declarado, e não acusa nada na chapa lisa, por teste; o índice de suavidade dá a chapa ondulada acima da lisa e ordena as chapas de calibração pela amplitude declarada da ondulação, por teste; as duas rodam no quarto traseiro do carro e acompanham a rodada seguinte dele;
- nas chapas de calibração, um crítico cego que recebe só a instrução de leitura acha o tipo e o lugar de cada defeito na zebra;
- a paridade medida e a decisão da pessoa sobre o Blender registradas.

## Fatias

1. Feita (b14d782e): captura das visões que existem: `--visao`, `--enquadrar`, `--largura-da-zebra` e `--azimute` em `olhar-bancada.mjs`, com teste. Saída: a zebra, a luz rasante e a curvatura da bancada do quarto traseiro em arquivo, mostradas à pessoa.
2. Feita (82f30228): visão `pintura`: material de verniz e ambiente de faixas, no registro, com teste na chapa de prova. Saída: a imagem do quarto traseiro ao lado da foto de referência, e o sim da pessoa de que dá para julgar.
3. Feita (0a7f465d): pente de curvatura e mapa de desvio, provados nas chapas de calibração e no quarto traseiro, com as imagens ao lado da zebra e da pintura para a pessoa dizer qual leitura serve.
4. Feita (e081ceb8): continuidade nas emendas e índice de suavidade, com a extração de `imagem-de-medida.mjs`, provados nas chapas de calibração e no quarto traseiro antes e depois da rodada 2 do carro.
5. Feita: pacote e paridade: a zebra e a pintura no `pedido.md`; a luz rasante e a curvatura da bancada medidas contra as do Blender (fração iluminada, posição do amassado, escala de cor). Saída: o relatório e a decisão da pessoa sobre exigir o Blender.
6. Feita: sem o Blender, decidido pela pessoa em 2026-11-16 pela paridade da fatia 5: o `vistas:critica` captura a luz rasante e a curvatura pela bancada, com a fração iluminada medida e a recusa abaixo de 25%, o pacote e `superficieDoPacote` aceitam essas imagens, a vista de três quartos é medida contra o Blender antes de entrar, a vista de quina sai também delas, e a exigência de `MODELAR_BLENDER` deixa o pacote de lataria (o Blender fica como conferência opcional).
7. Instrução: o estudo de leitura da zebra nas chapas de calibração, a instrução de como ler a zebra, a pintura, o pente e o mapa de desvio no guia, provada pelo crítico cego, e o fechamento.

## Sucessor

Decidido pela pessoa em 2026-11-16: ao fechar este plano, a mesma sessão ativa o plano [comparar com a referência sem script](2026-11-16-comparar-com-a-referencia.md), que espera este porque os dois mudam `tools/modelar/olhar-bancada.mjs` e o pacote do crítico. O fechamento deste só está completo com o sucessor ativado (território declarado, estado `ativo` e o índice de planos atualizado) ou com a decisão da pessoa de adiá-lo escrita aqui. O que este plano entregar e servir a ele (a captura por `--visao`, as ferramentas de medida e o pacote com zebra e pintura) entra como base do sucessor, sem refazer.

## Riscos e parada

A captura roda num navegador sem placa de vídeo, e o material de verniz com ambiente pode sair lento ou diferente do que a pessoa vê na página; se a imagem capturada divergir da página, a fatia 2 para e volta à pessoa. Se a curvatura da bancada divergir da do Blender além do que a escala de cor mostra, o Blender continua exigido e o plano fecha com a zebra e a pintura como acréscimo. Se a zebra por comando já bastar para a pessoa julgar, a fatia 2 volta a ela antes de começar.

## Fechamento

Em aberto.
