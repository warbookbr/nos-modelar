# Textura, relevo e ambiente são gerados de números, sem imagem de fora

Estado: em vigor.
Decidido em: 2026-11-08.
Origem: `docs/modelar/planos/encerrados/2026-11-08-materiais-realistas.md`, no commit `65ce19f3`.
Substitui: nada.

## O que ficou decidido
Por decisão da pessoa em 2026-11-08, as texturas, os relevos e o ambiente são gerados pelo projeto a partir de números, em `modulos/textura/` e no ambiente gerado, sem imagem de fora. Uma exceção por material só entra se a imagem gerada não convencer, e então a origem e a licença ficam registradas. A bancada e o arquivo glTF exportado mostram o mesmo material, declarado uma vez na receita.

## Por quê
A origem não escreve o motivo de recusar a imagem de fora. Ela exige que os mapas sigam a regra de determinismo, em que a mesma entrada e a mesma semente dão os mesmos bytes, e que o `.glb` exportado seja determinístico byte a byte.

## Quando reabrir
Por material, se a imagem gerada não convencer a pessoa; a origem e a licença da imagem de fora entram então registradas.
