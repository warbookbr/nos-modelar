# Planos do Modelar

## Estado

**Plano ativo:** [glossário e entrada para pessoas](2026-10-30-glossario-e-entrada-para-pessoas.md) (2026-10-30-glossario-e-entrada-para-pessoas.md), ativado em 2026-10-30.

[Ajustes no núcleo dos veículos](encerrados/2026-10-21-ajustes-no-nucleo-dos-veiculos.md) fechou em 2026-10-30, com os onze achados das 27 receitas na ferramenta geral, a calibração do crítico julgada de novo e o acervo de 54 peças igual ao de antes; o sucessor escolhido pela pessoa é o [furgão realista](2026-10-30-furgao-realista.md), em rascunho.

[Leitura por demanda e limpeza](encerrados/2026-10-22-leitura-por-demanda-e-limpeza.md) fechou em 2026-10-27, com a entrada por perguntas e o repositório sem as áreas que ninguém usava; o gate de 60% menos leitura não passou (19% na correção, 49% na modelagem).

[Carroceria por rede de curvas](encerrados/2026-10-24-carroceria-por-rede-de-curvas.md) fechou em 2026-10-25 com o nono teste cego e o nível oficial de carroceria, a lataria lisa com os detalhes como peças à parte. [Gaiola que segue as feições](encerrados/2026-10-23-gaiola-que-segue-as-feicoes.md) fechou em 2026-10-24 com o oitavo. [Carroceria por subdivisão](encerrados/2026-10-21-carroceria-por-subdivisao.md) fechou em 2026-10-23 com o sétimo. [Veículos de referência livre](encerrados/2026-10-20-veiculos-de-referencia-livre.md) fechou em 2026-10-20 com 27 veículos aprovados pela pessoa. [Objetos externos](encerrados/2026-10-19-objetos-externos-como-familias.md) fechou em 2026-10-20. [Receitas com material e textura](encerrados/2026-10-19-receitas-com-material-e-textura.md) fechou em 2026-10-19, com o tradutor das receitas externas, o campo de materiais no esboço e o módulo de textura de madeira, metal, tecido e liso. [Aparelhos de caixa](encerrados/2026-10-16-aparelhos-de-caixa.md) fechou em 2026-10-19, com a família `aparelho-de-caixa`, quatro perfis aprovados pela pessoa e o processo leve de modelagem escrito. [Importar objeto de código](encerrados/2026-10-15-importar-objeto-de-codigo.md) fechou em 2026-10-16, com a decisão da pessoa de não seguir com a importação como caminho principal; os importadores de OpenSCAD, STEP e STL saíram em 2026-10-25, e o histórico guarda como recriá-los. [Gates em poucos minutos](encerrados/2026-10-16-gates-em-poucos-minutos.md) fechou no mesmo dia. [O avião do esboço à
receita](encerrados/2026-10-15-o-aviao-do-esboco-a-receita.md) fechou em 2026-10-16, com as oito peças no núcleo, a montagem
auditada e o avião aprovado pela pessoa; a picape, o braço robótico, o carrinho de mão e a empilhadeira vêm em seguida, na ordem
que a pessoa escolher. [As famílias de desenho](encerrados/2026-10-14-familias-de-desenho.md) fecharam em 2026-10-14, e o código delas saiu em 2026-10-25.
Em rascunho: [o que o braço robótico achou](2026-09-21-o-que-o-braco-robotico-achou.md) e o [furgão realista](2026-10-30-furgao-realista.md), sucessor do plano ativo, escolhido pela pessoa em 2026-10-30.

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

`npm run planos:check` lê todos os planos desta pasta e das subpastas. Cada plano precisa declarar `**Estado:**` com um dos estados da lista acima ou `congelado`, e ter no máximo 300 linhas. Só pode haver um plano `ativo`, e um plano em `rascunho`, `pronto` ou `ativo` mora na raiz, não numa subpasta. Este índice precisa da declaração `**Plano ativo:**` com o nome do arquivo do plano ativo entre parênteses, ou `nenhum.` quando não houver plano ativo. O mesmo comando confere que o README.md da raiz ("O plano ativo é [..](..)" ou "Nenhum plano está ativo"), o `docs/modelar/INDEX.md` (linha "- Ativo:") e este índice apontam o mesmo plano ativo, ou todos nenhum.
