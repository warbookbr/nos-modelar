# Os importadores de .csg, STEP e STL saíram, e o desenho deles fica guardado para quem os recriar

Estado: em vigor.
Decidido em: 2026-10-25.
Origem: `docs/modelar/historico/IMPORTADORES-COMO-RECRIAR.md`, no commit `b1f22c61`.
Substitui: nada.

## O que ficou decidido
Em 2026-10-25, por decisão da pessoa no plano da leitura por demanda e limpeza, os importadores de `.csg`, STEP e STL para `.esboco.json` saíram do repositório. O código e os testes estão no commit `37665caa`, conferido, onde os arquivos ainda moravam na pasta de ferramentas com o nome antigo do projeto, e não em `tools/modelar/`. Quem recriar mantém o desenho: quadro y para cima e frente em -z, em milímetro, com a conversão `(x, y, z) -> (x, z, -y)`; STEP lido por `occt-wasm` e classificado pelas normais em revolução, extrusão ou caixa, com tolerâncias de 1e-5 e 2e-3; STL facetado classificado como revolução a partir de 12 lados; nó desconhecido do `.csg` recusado com a linha, todos de uma vez, sem aproximar em silêncio.

## Por quê
O plano que criou os importadores fechou com a decisão de não seguir, e nenhum fluxo os chamava. O desenho fica escrito para quem os recriar não refazer as decisões.

## Quando reabrir
A origem não dá condição.
