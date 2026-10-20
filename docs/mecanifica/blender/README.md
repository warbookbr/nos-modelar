# Blender com o Mecanifica

Esta pasta explica como usar o Blender como ferramenta externa de apoio à modelagem no Mecanifica e dá um fluxo genérico para a IA e para a pessoa modelarem objetos novos. Nenhum plano está ativo, de modo que nada aqui autoriza código novo: os documentos descrevem o que já foi provado numa sessão e marcam o que ainda é hipótese.

O Blender é opcional. A receita do Mecanifica continua sendo o produto, porque o conteúdo salvo é determinístico, versionado e reexecutável a partir dela, e uma malha feita no Blender é um arquivo opaco que muda entre versões do programa. Por isso o Blender fica fora do núcleo, fora do CI e fora do `--completo`, e nunca é versionado.

## Os documentos

| Documento | Para que serve |
|---|---|
| [`COMO-COMECAR.md`](COMO-COMECAR.md) | uma página para a IA que vai usar o Blender pela primeira vez |
| [`INSTALAR-E-CONVERTER.md`](INSTALAR-E-CONVERTER.md) | instalação verificada do Blender 4.2 LTS e o script de conversão para GLB |
| [`FLUXO-GENERICO.md`](FLUXO-GENERICO.md) | as etapas de a a e, com o que entra, o que sai e quem aprova, e o caminho para objeto sem forma de referência |
| [`USOS-E-LIMITES.md`](USOS-E-LIMITES.md) | os usos do Blender, o que está provado e o que é hipótese, e as regras de licença e de gate |

## O que está provado

Estão provados a instalação do Blender 4.2 LTS a partir do tarball oficial, a conversão de um `.blend` para GLB por linha de comando e a entrada desse GLB em `modelo-de-referencia.mjs`, que gera `vistas.png` e `partes.json`. O resto dos usos listados em `USOS-E-LIMITES.md` é hipótese e vem marcado como tal.

## Onde isto se liga ao resto

O fluxo de referência que o Blender alimenta é o do plano encerrado [Veículos de referência livre](../planos/encerrados/2026-10-20-veiculos-de-referencia-livre.md), que recriou 27 veículos a partir de malhas de licença livre sem exigência de crédito. As ferramentas são `modelo-de-referencia.mjs`, `medidas-da-fonte.mjs`, `folha-comparativa.mjs` e `comparar-silhueta.mjs`, todas em `tools/mecanifica/`. As regras gerais estão em `CLAUDE.md`.
