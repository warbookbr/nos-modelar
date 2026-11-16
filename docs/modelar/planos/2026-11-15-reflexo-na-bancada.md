# Reflexo na bancada: a superfície de lataria julgada sem o Blender

**Estado:** ativo

**Território:** `tools/modelar/olhar-bancada.mjs`, `src/bancada/visoes/`, `tools/modelar/vistas-para-critica.mjs`, `tools/modelar/vistas-de-superficie.mjs`, `docs/modelar/usar/PARE-E-ANALISE.md`, `docs/modelar/banco-de-provas/reflexo-na-bancada-2026-11-15/`

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
- Reescrever as vistas do Blender, portar a régua e o pacote cego: fora. Eles medem malha contra referência e não são imagem de inspeção.

## Incluído

- `--visao`, `--enquadrar` e os dois controles na captura, com `--ajuda` e teste em fixture neutra (`tools/blender/chapa-com-amassado-de-prova.mjs`, a chapa com amassado declarado);
- a visão `pintura` no registro, com atalho, controle da largura das faixas e teste;
- a zebra e a pintura no `pedido.md` da peça de lataria, com a frase que diz como se lê a faixa;
- o passo no `PARE-E-ANALISE.md`, que a skill `laco-de-modelagem` já manda ler; a frase na própria skill espera o plano da leitura por partes, que a tem no território;
- a medida de paridade entre a bancada e o Blender na chapa de prova e no quarto traseiro do carro, em `docs/modelar/banco-de-provas/reflexo-na-bancada-2026-11-15/`.

## Excluído

- material PBR de peça, paleta nova e textura, que seguem a regra de material do contrato;
- régua nova de superfície: a nota da superfície continua sendo do crítico e da pessoa;
- mudança na régua de ondulação, que é território do plano do carro.

## Gate de saída

- `npm run bancada -- <peça> --visao=zebra --enquadrar` grava a imagem com a peça ocupando mais da metade do quadro, na chapa de prova e no quarto traseiro do carro;
- na chapa com amassado de prova, a zebra e a pintura mostram o amassado declarado e a chapa sem amassado sai com faixas paralelas, conferido por teste que mede a faixa na imagem;
- o `pedido.md` de uma peça de lataria lista a zebra e a pintura, e o crítico cego, sem saber do amassado, o aponta na chapa de prova;
- a pessoa diz, pelas imagens do quarto traseiro, que consegue julgar a superfície;
- a paridade medida e a decisão da pessoa sobre o Blender registradas.

## Fatias

1. Captura das visões que existem: `--visao`, `--enquadrar`, `--largura-da-zebra` e `--azimute` em `olhar-bancada.mjs`, com teste. Saída: a zebra, a luz rasante e a curvatura da bancada do quarto traseiro em arquivo, mostradas à pessoa.
2. Visão `pintura`: material de verniz e ambiente de faixas, no registro, com teste na chapa de prova. Saída: a imagem do quarto traseiro ao lado da foto de referência, e o sim da pessoa de que dá para julgar.
3. Pacote e paridade: a zebra e a pintura no `pedido.md`; a luz rasante e a curvatura da bancada medidas contra as do Blender (fração iluminada, posição do amassado, escala de cor). Saída: o relatório e a decisão da pessoa sobre exigir o Blender.
4. Instrução: o passo no guia, e o fechamento.

## Riscos e parada

A captura roda num navegador sem placa de vídeo, e o material de verniz com ambiente pode sair lento ou diferente do que a pessoa vê na página; se a imagem capturada divergir da página, a fatia 2 para e volta à pessoa. Se a curvatura da bancada divergir da do Blender além do que a escala de cor mostra, o Blender continua exigido e o plano fecha com a zebra e a pintura como acréscimo. Se a zebra por comando já bastar para a pessoa julgar, a fatia 2 volta a ela antes de começar.

## Fechamento

Em aberto.
