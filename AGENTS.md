# Mecanifica — instruções para agentes

Comece por [`docs/mecanifica/INDEX.md`](docs/mecanifica/INDEX.md). Ele define o
estado atual, as fontes de verdade e a leitura necessária. Não leia todo o
histórico por padrão.

Antes de alterar núcleo procedural, planos, atritos ou identidades enquanto
`brigsd/nos-mecanifica` estiver ativo, leia `docs/mecanifica/COORDENACAO-LOCAL.md`,
consulte a inbox e reserve arquivos antes de editar. Use
`docs/mecanifica/COORDENACAO-REPOS.md` para decisões duráveis.

## Fonte de verdade

- `docs/mecanifica/` governa o produto e seus contratos atuais.
- `docs/mecanifica/planos/README.md` governa o planejamento.
- `docs/uso/`, `docs/rumo/` e `docs/historico/` são documentação herdada ou
  histórica. Não autorizam implementação.
- Em divergência, `docs/mecanifica/` prevalece.

## Fronteiras

- Permanecem o núcleo procedural, as receitas, o visor compatível, a bancada e
  as ferramentas de validação.
- `bancada.html` é a única aplicação publicada deste repositório.
- A aplicação jogável, a Oficina humana e o som foram removidos.
- O produto do cliente vive em `warbookbr/mecanica`.
- O núcleo não importa Three.js nem conhece o domínio automotivo.
- Identidade salva é semântica. UUIDs, índices de arrays e posições de passos
  não são identidade.

## Qualidade

- Use pt-BR em documentação e nomes de domínio.
- Rode os gates de `docs/mecanifica/INDEX.md`.
- Confira peças na bancada em mais de um enquadramento.
- Não edite `docs/uso/MAPA.md` à mão; use `npm run mapa`.
- Não altere comportamento, geometria, materiais ou câmera sem escopo explícito.
