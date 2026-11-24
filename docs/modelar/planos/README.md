# Planos do Modelar

## Estado

**Planos ativos:**

1. [modelagem de carro de passeio](2026-11-14-modelagem-de-carro.md). Território: `procedural/pecas/carro-fastback/`, `docs/modelar/banco-de-provas/carro-fastback-2026-11-14/`, `tools/modelar/ondulacao-da-superficie.mjs`, `procedural/criterios/veiculo.json`, `procedural/familias/roda-pneu/`. Em aberto: a fatia 4 (a lataria inteira numa chapa só, com simetria e painéis por vãos), que espera a decisão da pessoa de seguir; as fatias 2 e 3 fecharam em 2026-11-21, com o piloto aprovado e a chapa só decidida.
2. [costura de vão e guardas na rede](2026-11-23-costura-de-vao-e-guardas-na-rede.md). Território: `procedural/nucleo/faixa-de-contorno-na-rede.js`, `procedural/nucleo/faixa-de-contorno-na-rede.test.mjs`, `procedural/nucleo/gaiola-por-rede.js`, `procedural/nucleo/gaiola-por-rede.test.mjs`, `procedural/nucleo/fixtures/faixa-de-contorno-prova.js`, `procedural/pecas/carro-quadrado/`. Em aberto: fatias 1 a 4.

A lista está em ordem de prioridade. A ordem desempata quando dois planos precisam do mesmo arquivo: o de menor prioridade espera ou pede à pessoa que mude o território.


Em rascunho: [ferramenta de material](2026-11-08-ferramenta-de-material.md), para ver um material em segundos, compor relevos e reaproveitar materiais por nome; pode ser ativado. [Prancha menos manual](2026-11-14-prancha-menos-manual.md), o desvio da prancha contra o contorno da imagem, a leitura combinada num comando e o que ficou fora do esqueleto; espera o fechamento da leitura por partes. [O lado Modelar da mecatrônica](2026-11-16-eletronica-no-modelar.md), plano-raiz que não se ativa: gera os dois planos da parte do Modelar na simulação que mora no nos-mecatronica. Dele saíram a família de componentes eletrônicos, ativa desde 2026-11-16, e a [ponte com a mecatrônica](2026-11-16-ponte-com-a-mecatronica.md), a ficha do objeto exportada com as portas elétricas e o pedido que volta lido e conferido; a ponte pode ser ativada quando houver lugar. [Trilhas e validação da placa](2026-11-17-trilhas-e-validacao-da-placa.md), para a placa declarada receber a lista de ligações pela ponte, traçar o cobre nas duas faces e conferir as regras de projeto e a conectividade contra a lista; espera o fechamento da família de componentes (a pessoa já decidiu guardar a cópia da lista).

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

Um plano-raiz declara `**Tipo:** raiz` abaixo do Estado: ele só gera outros planos, não tem implementação e não passa a `pronto` nem a `ativo`, o que `npm run planos:check` recusa.

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
