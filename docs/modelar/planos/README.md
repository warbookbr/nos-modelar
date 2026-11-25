# Planos do Modelar

## Estado

**Planos ativos:**

1. [modelagem de carro de passeio](2026-11-14-modelagem-de-carro.md). Território: `procedural/pecas/carro-fastback/`, `docs/modelar/banco-de-provas/carro-fastback-2026-11-14/`, `tools/modelar/ondulacao-da-superficie.mjs`, `procedural/criterios/veiculo.json`, `procedural/familias/roda-pneu/`. Em aberto: a fatia 4 (a lataria inteira numa chapa só, com simetria e painéis por vãos), cujo preparo está feito (parâmetros na receita, ensaio de escala e o ajuste esparso, encerrado em 2026-11-22, com o quarto no tamanho do carro inteiro em 10,6 s); as fatias 2 e 3 fecharam em 2026-11-21, com o piloto aprovado e a chapa só decidida.
2. [superfície de produção (G2)](2026-11-22-superficie-de-producao-g2.md). Território: `procedural/nucleo/subdivisao.js` e os testes dela e da energia de curvatura, `tools/fixtures/correcao-de-superficie/`, `tools/modelar/distancia-a-pele.mjs`, `tools/modelar/zebra-numerica.mjs` e os testes delas, `procedural/nucleo/gaiola-por-rede.js` e o teste dele, `procedural/nucleo/algebra-esparsa.js` e o teste dela, `procedural/nucleo/uso-operacoes.js`, `tools/modelar/preenchimento-da-rede.mjs` e o teste dele, `docs/modelar/banco-de-provas/superficie-g2-2026-11-22/`. Em aberto: as fatias 3 a 6; a fatia 2 está no núcleo, com a cota completa refeita quatro vezes, que a pessoa escolheu em 2026-11-22, e com o custo dentro do gate 4 (1,76 vez o de sem a opção no quarto traseiro), e a fatia 1 fechou com a distância à pele, o gate que junta zebra e distância e o diagnóstico do preenchimento.
3. [atuador de junta](2026-11-25-atuador-de-junta.md). Território: `procedural/familias/atuador-de-junta/`, `procedural/familias/index.js`, `tools/fixtures/atuador-de-junta/`, `docs/modelar/banco-de-provas/atuador-de-junta-2026-11-25/`, `docs/modelar/ferramentas-por-objeto.json`, `tools/modelar/capacidade.mjs`. Em aberto: as fatias 3 e 4; as fatias 1 e 2 fecharam em 2026-11-25, com o atuador cilíndrico e o de caixa (servo).
4. [elo entre juntas](2026-11-25-elo-entre-juntas.md). Território: `procedural/familias/elo-entre-juntas/`, `tools/fixtures/elo-entre-juntas/`, `docs/modelar/banco-de-provas/elo-entre-juntas-2026-11-25/`, `procedural/familias/index.js`, `docs/modelar/ferramentas-por-objeto.json`, `tools/modelar/capacidade.mjs`. Em aberto: as quatro fatias; espera a fatia 1 do atuador de junta.

A lista está em ordem de prioridade. A ordem desempata quando dois planos precisam do mesmo arquivo: o de menor prioridade espera ou pede à pessoa que mude o território.


Em rascunho: [acabamento de hard surface](2026-11-25-acabamento-hard-surface.md), o chanfro e o arredondamento em qualquer aresta, as linhas de painel e os recortes na casca; espera os planos do atuador e do elo e a decisão da pessoa sobre G1 ou G2. [curva paralela na rede](2026-11-22-curva-paralela-na-rede.md), os anéis de curvas em volta de um vão gerados pela rede; ativa-se depois do G2, que usa o mesmo arquivo. [Ferramenta de material](2026-11-08-ferramenta-de-material.md), para ver um material em segundos, compor relevos e reaproveitar materiais por nome; pode ser ativado. [Prancha menos manual](2026-11-14-prancha-menos-manual.md), o desvio da prancha contra o contorno da imagem, a leitura combinada num comando e o que ficou fora do esqueleto; espera o fechamento da leitura por partes. [O lado Modelar da mecatrônica](2026-11-16-eletronica-no-modelar.md), plano-raiz que não se ativa: gera os dois planos da parte do Modelar na simulação que mora no nos-mecatronica. Dele saíram a família de componentes eletrônicos, ativa desde 2026-11-16 e a ponte com a mecatrônica, concluída em 2026-11-23.

Plano concluído ou cancelado não fica nesta pasta. Ao fechar, o plano tem o Fechamento preenchido, ganha uma linha em [`PLANOS-ENCERRADOS.md`](../decisoes/PLANOS-ENCERRADOS.md) com o que entregou e o commit em que o texto inteiro está, e sai da árvore, tudo por `npm run planos:encerrar -- <arquivo> --linha "<o que entregou>"`; quem entrega uma capacidade, num plano ou fora dele, tira do [backlog](BACKLOG.md) o item que ela resolve e atualiza o estado dela em [`ferramentas-por-objeto.json`](../ferramentas-por-objeto.json) no mesmo envio; a decisão que continua valendo vira registro em [`decisoes/registros/`](../decisoes/README.md). Os congelados que ainda contam têm pasta própria em [`congelados/`](congelados/README.md).

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
