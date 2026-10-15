# Planos da Mecanifica

## Estado

**Plano ativo:** [o avião do esboço à receita](2026-10-15-o-aviao-do-esboco-a-receita.md).

O plano leva o avião, cujo esboço a pessoa aprovou, do esboço à receita no núcleo:
o andaime traduzido do esboço, uma receita por parte com `REFINA` e o avião montado e
aprovado na bancada. A picape, o braço robótico, o carrinho de mão e a empilhadeira
entram depois do avião completo. [As famílias de
desenho](encerrados/2026-10-14-familias-de-desenho.md) fecharam em 2026-10-14, com as
famílias da carcaça e do braço, o ajuste da família a uma referência e o sorteio na
prova. Antes, [o desenho sem referência](encerrados/2026-10-13-desenho-sem-referencia.md)
fechou em 2026-10-14.
Em rascunho: [o que o braço robótico achou](2026-09-21-o-que-o-braco-robotico-achou.md).

A crônica dos planos concluídos, cancelados e congelados, com a tabela de concluídos e a abertura em curso, saiu deste índice e está em [`encerrados/README.md`](encerrados/README.md), na seção de crônica. Os congelados que ainda contam têm pasta própria em [`congelados/`](congelados/README.md).

## Programas

| Programa | Painel | Execução atual |
|---|---|---|
| MCP para agentes | [`mcp/INDEX.md`](mcp/INDEX.md) | leitura, autoria de montagem e receita declarativa opt-in aprovadas |

O painel de programa acompanha dependências e resultados, mas não conta como
plano executivo ativo. A Fatia 1A somente leitura foi aprovada e encerrada em
[`mcp/concluidos/01-fatia-1a-piloto-leitura.md`](mcp/concluidos/01-fatia-1a-piloto-leitura.md),
a Fatia 1B visual foi encerrada em
[`2026-08-05-mcp-fatia-1b-visual.md`](./encerrados/2026-08-05-mcp-fatia-1b-visual.md), a
avaliação consolidada foi concluída com decisão `corrigir` em
[`2026-08-05-mcp-avaliacao-consolidada.md`](./encerrados/2026-08-05-mcp-avaliacao-consolidada.md),
a correção de descoberta foi concluída com decisão `aprovar` em
[`2026-08-05-mcp-correcao-descoberta.md`](./encerrados/2026-08-05-mcp-correcao-descoberta.md)
e a primeira fatia de autoria controlada foi concluída com decisão `interromper`
em [`2026-08-05-mcp-autoria-controlada.md`](./encerrados/2026-08-05-mcp-autoria-controlada.md).

A primeira autoria controlada de pacotes não foi publicada. O PR #25 foi fechado sem merge porque a
implementação portátil não demonstrou simultaneamente publicação do pacote
completo em uma única transição e recusa atômica de sobrescrita contra destino
concorrente. Uma retomada exige plano técnico separado. Edição de receita,
revisões, materiais, Git e distribuição permanecem fora.

## Contrato de plano

Todo plano curto deve declarar:

1. objetivo verificável e fora de ambiguidade;
2. hipótese ou pergunta que justifica o trabalho;
3. arquivos e identidades em escopo;
4. invariantes que não podem mudar;
5. gates e evidências esperadas;
6. limites e itens explicitamente fora;
7. resultado, decisão e caminho de encerramento.

Estados aceitos nos planos executivos datados: `rascunho`, `pronto`, `ativo`,
`concluído` e `cancelado`. Só existe um plano `ativo` por vez.

Um backlog, programa ou linha candidata não autoriza implementação automática.
Um plano só fica ativo quando tem objetivo, escopo, gates, arquivos reservados,
critério de saída e encerramento registrado.

## O que o gate exige

`npm run planos:check` lê todos os planos desta pasta e das subpastas. Cada plano precisa declarar `**Estado:**` com um dos estados da lista acima ou `congelado`, e ter no máximo 300 linhas. Só pode haver um plano `ativo`, e um plano em `rascunho`, `pronto` ou `ativo` mora na raiz, não numa subpasta. Este índice precisa da declaração `**Plano ativo:**` com o nome do arquivo do plano ativo entre parênteses, ou `nenhum.` quando não houver plano ativo.
