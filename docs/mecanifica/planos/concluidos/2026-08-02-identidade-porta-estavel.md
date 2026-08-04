# AUT-2026-14 — identidade estável de porta

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** warbookbr/nos-mecanifica, branch
codex/concluir-pendencias-autoria, base f5b3eb6

## Problema observado

Uma porta usa o mesmo nome para ser citada por relações e para ser exibida a uma
pessoa. Renomear o texto, portanto, pode desconectar relações corretas. Isso
contradiz a regra de que rótulo não é identidade e bloqueia submontagens seguras.

## Resultado

Uma porta nova declara uma identidade estável e um rótulo independente. Relações,
seleções, leitor e exportação usam a identidade; a bancada e os relatórios podem
mostrar o rótulo. Portas históricas continuam reproduzíveis.

## Incluído

- contrato novo de identidade e rótulo, sem UUID ou índice;
- compatibilidade para declaração, artefato e relação legados;
- prova fora do automotivo de renomear rótulo sem quebrar a porta;
- exportação, leitura e replay canônicos da forma nova.

## Excluído

- pai semântico, hierarquia, espelho, migração automática de arquivos salvos,
  solver, novos formatos de encaixe ou mudança da geometria.

## Gate de saída

1. trocar somente o rótulo não muda a chave que uma relação cita;
2. duplicar identidade é recusado; rótulos iguais não criam identidade igual;
3. portas antigas preservam saída e relações existentes;
4. fixture neutra exporta, lê e reexecuta a porta nova sem perder identidade,
   rótulo, origem ou interface.

## Fatias

1. congelar os dois formatos e seus consumidores;
2. introduzir chave estável no núcleo e no resolvedor de montagem;
3. transportar a forma pelo leitor, exportador, descrição e bancada;
4. provar compatibilidade, round-trip e encerrar.

## Riscos e parada

Se o formato novo exigir reinterpretar uma porta histórica, preservar a forma
antiga em vez de migrá-la. Se o recorte exigir árvore ou pai, parar e abrir o
plano de hierarquia próprio.

## Fechamento

Concluído em 2 de agosto de 2026.

- `publicarPorta` aceita a forma nova `{id, rotulo, de}` e mantém a histórica
  `{nome, de}` sem acrescentar campos ao resultado legado;
- `sel:{porta}`, relações de montagem, leitor e exportação usam a chave estável;
  bancada e relatório mostram rótulo e id de forma explícita;
- `_jardineira` prova fora do automotivo rótulo humano independente, leitura,
  exportação e reexecução determinística; identificador repetido e forma ambígua
  são recusados;
- a revisão assistida passou à versão 3 para registrar id de porta e origem sem
  ambiguidade; revisões v1 e v2 continuam validáveis na forma que assinaram.

**Evidências:** `npm test` (1001 testes), `npm run guarda:portas`, `npm run
gabarito:selecao:check`, `npm run id-cru:check`, `npm run exportar:check`,
`npm run typecheck`, verificações de links, planos e mapa.

**Sobras deliberadas:** comportamento de espelho e `arranja` continua no Nível
1; hierarquia, solver e migração automática permanecem fora deste plano.
