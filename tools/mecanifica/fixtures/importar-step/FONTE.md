# Fixtures do importador de STEP

## sintetico.step

Dez sólidos gerados pelo próprio OpenCascade WASM do repositório (`occt-wasm` 4.3.2) com `node tools/mecanifica/fixtures/importar-step/gerar-sintetico.mjs`: placa com quatro furos redondos e um quadrado, garfo em U, peça em L, pino, bucha (anel), ponteira (tronco de cone), bloco com furo cego, sapata (caixa), placa escareada e ponta cônica com fenda. As medidas de cada peça estão no comentário do gerador e na tabela `ESPERADO` do teste. O arquivo é versionado e o teste não o regera (o cabeçalho do STEP leva a data da geração). Sem restrição de uso.

## O que não está aqui

O repositório já guardou um STEP real de 19 sólidos, de um modelo externo com licença que exige crédito. Ele foi retirado por decisão da pessoa, junto com o teste que fixava o número de peças por tipo e o piso de ocupação nele. O que o teste do importador prova passou a depender só da fixture sintética acima, que tem uma peça de cada tipo de forma.
