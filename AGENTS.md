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
- `docs/uso/` e `docs/nos-herdado/` são documentação herdada ou
  histórica. Não autorizam implementação.
- Em divergência, `docs/mecanifica/` prevalece.

## Fronteiras e qualidade

`CLAUDE.md` já define o escopo do repositório, a independência do núcleo, a
identidade semântica, o idioma, a escrita e os gates; tudo aquilo vale aqui e
não se repete. Além disso: confira peças na bancada em mais de um
enquadramento, e não altere comportamento, geometria, materiais ou câmera sem
escopo explícito.
