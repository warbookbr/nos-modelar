# Blender com o Mecanifica

Esta pasta explica como usar o Blender como ferramenta externa de apoio à modelagem no Mecanifica e dá um fluxo genérico para a IA e para a pessoa modelarem objetos novos. Os documentos descrevem o que já foi provado e marcam o que ainda é hipótese, e nada aqui autoriza código novo sem plano. As ferramentas de `tools/blender/` (régua, pacote cego, olhar da candidata, leituras do pacote e oráculo da subdivisão) vieram do plano [carroceria por subdivisão](../planos/encerrados/2026-10-21-carroceria-por-subdivisao.md).

O Blender é opcional. A receita do Mecanifica continua sendo o produto, porque o conteúdo salvo é determinístico, versionado e reexecutável a partir dela, e uma malha feita no Blender é um arquivo opaco que muda entre versões do programa. Por isso o Blender fica fora do núcleo, fora do CI e fora do `--completo`, e nunca é versionado.

## Os documentos

| Documento | Para que serve |
|---|---|
| [`COMO-COMECAR.md`](COMO-COMECAR.md) | uma página para a IA que vai usar o Blender pela primeira vez |
| [`INSTALAR-E-CONVERTER.md`](INSTALAR-E-CONVERTER.md) | instalação verificada do Blender 4.2 LTS e o script de conversão para GLB |
| [`FLUXO-GENERICO.md`](FLUXO-GENERICO.md) | as etapas de a a e, com o que entra, o que sai e quem aprova, e o caminho para objeto sem forma de referência |
| [`USOS-E-LIMITES.md`](USOS-E-LIMITES.md) | os usos do Blender, o que está provado e o que é hipótese, e as regras de licença e de gate |
| [`REGUA-E-PACOTE-CEGO.md`](REGUA-E-PACOTE-CEGO.md) | o uso de `tools/blender/`: a régua entre duas malhas numa caixa, o pacote cego com grade e avesso marcado, o olhar da candidata nas mesmas câmeras, as leituras do pacote em milímetro (`ler-corte`, `ler-linhas`, `comparar-cortes`) e o gerador do oráculo da subdivisão |
| [`modelar-veiculos.md`](../modelar-veiculos.md) | as instruções de modelagem de veículo a partir de fonte de referência: técnica das três vistas e seção por grupo |
| [`modelar-carroceria.md`](../modelar-carroceria.md) | o fluxo da carroceria de chapa contínua por subdivisão: vistas e ficha, gaiola por estações, vincos nomeados e raio de borda, medidas, espessura e o que observar nas vistas |

## O que está provado

Estão provados a instalação do Blender 4.2 LTS a partir do tarball oficial, a conversão de um `.blend` para GLB por linha de comando e a entrada desse GLB em `modelo-de-referencia.mjs`, que gera `vistas.png` e `partes.json`. Com o Blender 5.0.1 estão provadas, em `tools/blender/blender.test.mjs`, a régua, o pacote cego, o olhar da candidata e a regeração da fixture do oráculo da subdivisão, sobre formas desenhadas por código, e em `tools/blender/leitura-do-pacote.test.mjs` e `leitura-blender.test.mjs` as leituras do pacote, sobre um prisma desenhado por código. O resto dos usos listados em `USOS-E-LIMITES.md` é hipótese e vem marcado como tal.

## Onde isto se liga ao resto

O fluxo de referência que o Blender alimenta é o do plano encerrado [Veículos de referência livre](../planos/encerrados/2026-10-20-veiculos-de-referencia-livre.md), que recriou 27 veículos a partir de malhas de licença livre sem exigência de crédito. As ferramentas são `modelo-de-referencia.mjs`, `medidas-da-fonte.mjs`, `folha-comparativa.mjs` e `comparar-silhueta.mjs`, todas em `tools/mecanifica/`. As regras gerais estão em `CLAUDE.md`.
