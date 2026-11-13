# O grafo de capacidades saiu e só volta se o motor ganhar tipos intermediários de artefato

Estado: em vigor.
Decidido em: 2026-10-27.
Origem: `docs/modelar/historico/GRAFO-DE-CAPACIDADES-COMO-RECRIAR.md`, no commit `b1f22c61`.
Substitui: nada.

## O que ficou decidido
Em 2026-10-27, por decisão da pessoa no plano da leitura por demanda e limpeza, o grafo de capacidades, um hipergrafo derivado do catálogo de operações, foi retirado, com o recurso MCP `mecanifica://procedural/grafo`; o contrato do servidor MCP passou de `mecanifica.mcp.revisao.v6` para `v7`. O código, o esquema e os testes estão no commit `7d733520`, conferido: `procedural/nucleo/catalogo.js` traz a função `hipergrafoDeCapacidades` e `tools/catalogo/gerar-catalogo-capacidades.mjs` traz o esquema.

## Por quê
Ninguém o lia: nenhuma skill, documento de uso ou agente mandava consultá-lo, e o planejador de cadeias trabalha direto sobre o catálogo. Com quatro tipos de artefato, das 39 operações 24 recebiam e devolviam a malha, 12 a criavam do nada e três geravam parte nomeada, pesos ou porta, e o grafo só dizia que qualquer operação de malha liga com qualquer outra.

## Quando reabrir
Se o motor ganhar tipos intermediários (curva, perfil, superfície, sólido) com operações que convertem um no outro, quando o caminho entre eles deixa de ser óbvio.
