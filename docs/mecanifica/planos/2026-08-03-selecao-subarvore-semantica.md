# AUT-2026-17 — seleção de subárvore semântica

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `b05b5be`.

## Problema observado

`AUT-2026-16` tornou o pai semântico legível, porém selecionar `pinca` ainda
seleciona somente a carcaça. A pessoa ou IA precisa listar manualmente as
pastilhas e o pistão para inspecionar o conjunto. Essa repetição é ruído e pode
deixar um filho fora da revisão.

## Resultado

Uma raiz semântica selecionada pode expandir sua seleção para todos os
descendentes declarados, em ordem determinística, com uma ação explícita na
bancada e consulta neutra reutilizável.

## Incluído

- consulta pura da árvore `{nome, pai}` que devolve raiz e descendentes;
- recusa de árvore corrompida antes de gerar seleção parcial;
- ação visível na bancada e prova na fixture `_freio-hierarquia`;
- testes headless, revisão visual e atualização dos índices.

## Excluído

- reparenting, transformação/pose herdada, explosão por subárvore e solver;
- mudança de `peca-resolvida`, exportação, persistência ou produto cliente;
- inferir árvore por nome, proximidade ou geometria.

## Gate de saída

1. selecionar `pinca` expande para pinça, duas pastilhas e pistão, em ordem
   estável;
2. uma folha não arrasta partes vizinhas; nome ou árvore inválidos falham com
   causa explícita;
3. a bancada expande a seleção sem mudar pai Three.js, posição, modo ou
   explosão;
4. peças sem hierarquia mantêm a seleção anterior;
5. testes de tipos, build, gates da bancada e documentação passam.

## Fatias

1. fixar plano, reserva e contrato da consulta pura;
2. resolver e testar subárvore sem Three.js;
3. adaptar a ação explícita na bancada;
4. revisar visualmente, rodar gates e encerrar.

## Riscos e parada

Se a ação exigir mover filhos, salvar estado de montagem, alterar o formato
resolvido ou deduzir um pai pela forma, este plano para. Esses contratos seguem
como candidatos próprios do Nível 5.

## Fechamento

**Concluído em 3 de agosto de 2026.**

`nomesDaSubarvore` valida a árvore integral e devolve a raiz seguida dos
descendentes em percurso estável. A bancada usa esse resultado somente para
substituir a seleção atual: pinça + duas pastilhas + pistão; uma folha continua
uma folha. A ação não aparece em peça plana. O grafo Three.js permanece plano,
e modo de exibição, posições, explosão, artefato resolvido e exportação não
mudaram.

Gates: 46 arquivos / 1.017 testes, tipos, build, gabarito, IDs crus,
exportação, guardas de portas e câmera, mapa, índices, links e planos passaram.
Revisão visual da fixture `_freio-hierarquia` passou em isométrica e frontal,
incluindo a seleção isolada. Pose herdada, persistência, exportação de árvore,
explosão por conjunto e solver permanecem fora deste plano.
