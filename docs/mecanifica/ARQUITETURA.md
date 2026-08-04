# Arquitetura atual

## Fronteira

Este repositório executa receitas procedurais determinísticas, adapta a malha
para apresentação e publica a bancada neutra. O produto cliente está separado em
[`warbookbr/mecanica`](https://github.com/warbookbr/mecanica). A aplicação jogável,
a Oficina humana e o som não existem nesta árvore.

## Camadas

1. **Receita**: módulos em `prototipos/fps/v3/pecas/` exportam `meta` e
   `construir`, ou `PASSOS`, `PARAMS`, `TOPO` e contratos auxiliares.
2. **Núcleo**: `motor/oficina.js` resolve parâmetros, topologia, identidades,
   portas, materiais declarados e malha neutra sem conhecer Three.js.
3. **Adaptador**: `src/bancada/adaptarThree.ts` e os adaptadores da bancada já
   convertem o neutro para inspeção e apresentação.
4. **Bancada**: `bancada.html` oferece seleção semântica, isolamento, contexto,
   explosão, hierarquia, subárvore e URLs reproduzíveis.
5. **Exportação**: `tools/mecanifica/exportar.mjs` valida e produz dados
   resolvidos para consumo pelo produto cliente.

## Invariantes

- O domínio automotivo não entra no núcleo.
- Identidade persistida é semântica, nunca UUID de renderizador, índice ou
  posição de passo.
- A mesma receita produz o mesmo neutro e o mesmo export.
- Referência inválida, ambígua ou vazia falha com diagnóstico.
- Materiais permanecem declarativos, mas o contrato genérico de materiais ainda
  não existe.

## Estado operacional

Casos 1 e 2 estão homologados; Caso 3 não iniciado. Não há plano ativo. O
servidor estático local ainda falha ao resolver o import bare `earcut`; esta é
uma pendência da ferramenta de servir/porteiro, não uma decisão de geometria.

## Fora desta arquitetura

Cena de cliente, narrativa, navegação, áudio, jogo, persistência de montagem e
solver de encaixe pertencem ao produto ou ao backlog. Tarefas de produto devem
apontar para `warbookbr/mecanica`.
