# Planos do Modelar

## Estado

**Planos ativos:**

1. [furgão realista](2026-10-30-furgao-realista.md). Território: `procedural/pecas/furgao-realista/`, `procedural/familias/roda-pneu/`, `docs/modelar/banco-de-provas/furgao-realista-2026-10-30/`. Em aberto: a etapa 8, com a frente e a lanterna traseira aprovadas e uma rodada de acabamento (moldura do arco, grade, aro da luz de canto, pé do para-brisa), os acabamentos que restam da etapa 7 e a etapa de materiais, sobre o plano dos materiais realistas.
2. [costuras e furos limpos](2026-11-09-costuras-e-furos-limpos.md). Território: `procedural/nucleo/operacoes/booleanas.js`, `procedural/nucleo/operacoes/estruturais.js`, `procedural/nucleo/operacoes/geradores-avancados.js`, `procedural/nucleo/uso-operacoes.js`, `procedural/nucleo/nucleo.js`, `procedural/nucleo/operacoes/furo-em-aneis.js`, `procedural/nucleo/operacoes/furo-em-aneis.test.ts`, `procedural/nucleo/lados-por-desvio.test.ts`, `tools/modelar/guardas/guarda-acervo.mjs`, `tools/modelar/reguas-de-malha/`, `tools/fixtures/costuras-e-furos/`. Em aberto: a fresta junto da tampa, o aviso do `subtrair` que não corta, a régua da costura num gate e o fechamento.
3. [revisão das verificações e dos testes](2026-11-13-revisao-das-verificacoes-e-dos-testes.md). Território: `docs/modelar/banco-de-provas/revisao-das-verificacoes-2026-11-13/`. Em aberto: tudo.
4. [saída de manual a partir da montagem](2026-11-13-saida-de-manual-a-partir-da-montagem.md). Território: `modulos/manual/` e `docs/modelar/banco-de-provas/saida-de-manual-2026-11-13/`. Em aberto: tudo.
5. [forma exata antes da malha](2026-11-13-forma-exata-antes-da-malha.md). Território: `procedural/nucleo/forma-exata/`, `tools/modelar/silhueta-contra-referencia.mjs` e a pasta dele no banco de provas. Em aberto: a fatia 4, só a chapa com bordas e furos pelo método novo, por decisão da pessoa, e o resto da 5.

A lista está em ordem de prioridade. A ordem desempata quando dois planos precisam do mesmo arquivo: o de menor prioridade espera ou pede à pessoa que mude o território.

Pronto, à espera de território: [núcleo para quem escreve receita](2026-11-13-nucleo-para-quem-escreve-receita.md), que espera o plano das costuras fechar.

Em rascunho: [ferramenta de material](2026-11-08-ferramenta-de-material.md), para ver um material em segundos, compor relevos e reaproveitar materiais por nome; pode ser ativado, porque o plano dos materiais realistas fechou. [Rebaixo por contorno](2026-11-10-rebaixo-por-contorno.md), para o degrau, o sulco e a borda rebaixada sobre a superfície de um corpo, com a borda no raio pedido; espera um lugar de plano ativo.

Plano concluído ou cancelado não fica nesta pasta. Ao fechar, o plano tem o Fechamento preenchido, ganha uma linha em [`PLANOS-ENCERRADOS.md`](../decisoes/PLANOS-ENCERRADOS.md) com o que entregou e o commit em que o texto inteiro está, e sai da árvore, tudo por `npm run planos:encerrar -- <arquivo> --linha "<o que entregou>"`; a decisão que continua valendo vira registro em [`decisoes/registros/`](../decisoes/README.md). Os congelados que ainda contam têm pasta própria em [`congelados/`](congelados/README.md).

## Programas

| Programa | Painel | Execução atual |
|---|---|---|
| MCP para agentes | [`mcp/INDEX.md`](mcp/INDEX.md) | leitura, autoria de montagem e receita declarativa opt-in aprovadas |

O painel de programa acompanha dependências e resultados, mas não conta como
plano executivo ativo. A Fatia 1A somente leitura foi aprovada e encerrada em
[`mcp/concluidos/01-fatia-1a-piloto-leitura.md`](mcp/concluidos/01-fatia-1a-piloto-leitura.md),
a Fatia 1B visual foi encerrada em
[`2026-08-05-mcp-fatia-1b-visual.md`](../decisoes/PLANOS-ENCERRADOS.md), a
avaliação consolidada foi concluída com decisão `corrigir` em
[`2026-08-05-mcp-avaliacao-consolidada.md`](../decisoes/PLANOS-ENCERRADOS.md),
a correção de descoberta foi concluída com decisão `aprovar` em
[`2026-08-05-mcp-correcao-descoberta.md`](../decisoes/PLANOS-ENCERRADOS.md)
e a primeira fatia de autoria controlada foi concluída com decisão `interromper`
em [`2026-08-05-mcp-autoria-controlada.md`](../decisoes/PLANOS-ENCERRADOS.md).

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
`concluído` e `cancelado`. Até 6 planos podem estar `ativo` ao mesmo tempo, cada um com território declarado (seção abaixo); eram 5 até 2026-11-10, quando duas sessões em paralelo abriram cada uma um plano sobre a mesma base e a pessoa deixou a decisão com quem conduzia.

Um backlog, programa ou linha candidata não autoriza implementação automática.
Um plano só fica ativo quando tem objetivo, escopo, gates, território, critério de
saída e encerramento registrado. Cada plano ativo tem o seu gate de saída e fecha sozinho.

## Território dos planos ativos

Todo plano `ativo` declara, logo abaixo do Estado, uma linha `**Território:**` com os caminhos que ele muda, cada um entre crases e separados por vírgula: pasta terminada em `/` ou arquivo. Um plano ativo que só espera a aprovação da pessoa declara `**Território:** nenhum (aguarda aprovação)`.

Dois planos ativos não podem ter território sobreposto: há sobreposição quando um caminho é igual ao outro ou é a pasta que o contém. Ficam fora dessa regra os caminhos compartilhados por todos, que estão na lista `CAMINHOS_COMPARTILHADOS` de [`tools/mapa/planos.mjs`](../../../tools/mapa/planos.mjs), a única cópia dessa lista. Quando dois planos precisarem do mesmo arquivo, vale a ordem de prioridade da lista de planos ativos acima: o de menor prioridade espera ou pede à pessoa que mude o território.

## O que o gate exige

`npm run planos:check` lê todos os planos desta pasta e das subpastas. Cada plano precisa declarar `**Estado:**` com um dos estados da lista acima ou `congelado`, e ter no máximo 300 linhas. Um plano em `rascunho`, `pronto` ou `ativo` mora na raiz, não numa subpasta, e o de `rascunho` ou `pronto` precisa de link neste índice. O gate reprova mais de 5 planos `ativo`, plano ativo sem a linha `**Território:**` e territórios sobrepostos, dizendo os dois planos e o caminho em comum. Este índice precisa da declaração `**Planos ativos:**` com a lista dos planos ativos, cada um com o nome do arquivo num link, ou `nenhum.` quando não houver plano ativo, e a lista precisa conter exatamente os planos `ativo`. O mesmo comando confere que o README.md da raiz (parágrafo "Planos ativos:"), o `docs/modelar/INDEX.md` (linha "- Planos ativos:") e este índice apontam os mesmos planos ativos, ou todos nenhum.
