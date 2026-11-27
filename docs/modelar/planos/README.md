# Planos do Modelar

## Estado

**Planos ativos:**

1. [operações repartidas entre núcleos](2026-11-26-operacoes-repartidas-entre-nucleos.md). Território: `docs/modelar/banco-de-provas/operacoes-repartidas-2026-11-26/`, `procedural/nucleo/operacoes/abertura-por-contorno.js` e os testes dela, `procedural/nucleo/fios-da-operacao.js` e o teste dele. O corte das aberturas repartido entre fios, com a mesma malha.
2. [processo e CI](2026-11-26-processo-e-ci.md). Território: `.github/workflows/`, `tools/gates.mjs`, `tools/mapa/planos.mjs`, `tools/mapa/mapa.mjs`, `docs/MAPA.md`, `tools/reguas-de-texto/` e os testes. O envio sem vermelho falso, as regras de texto como régua e o limite de planos de núcleo.
3. [laço de modelagem mais rápido](2026-11-26-laco-de-modelagem-mais-rapido.md). Território: a dobra, o vinco oculto, a ferramenta das rodadas, o laço, a calibração do crítico, o navegador e a skill do laço. A rodada em minutos, com a decisão da pessoa gravada.
4. [ferramentas e documentação](2026-11-26-ferramentas-e-documentacao.md). Território: o registro de ferramentas, o `tools/README.md`, o roteador e os roteiros, a página de entrada, cinco agentes, `.claude/settings.json` e `.mcp.json`. Toda ferramenta registrada e o roteador cobrindo o trabalho inteiro.
5. [perna estreita](2026-11-27-perna-estreita.md). Território: as famílias do atuador de junta e do elo entre juntas, as fixtures delas e o banco de provas. A perna do humanoide numa coluna de até 180 mm.

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

Todo plano curto deve declarar (e um número de tempo ou de tamanho citado no problema traz a data e o commit da medida, ou é remedido ao ativar: o plano do laço de modelagem citou 105 s de uma medida de oito dias antes, e a ação já levava 30 s):

1. objetivo verificável e fora de ambiguidade;
2. hipótese ou pergunta que justifica o trabalho;
3. arquivos e identidades em escopo;
4. invariantes que não podem mudar;
5. gates e evidências esperadas;
6. limites e itens explicitamente fora;
7. resultado, decisão e caminho de encerramento.

Um plano-raiz declara `**Tipo:** raiz` abaixo do Estado: ele só gera outros planos, não tem implementação e não passa a `pronto` nem a `ativo`, o que `npm run planos:check` recusa.

Estados aceitos nos planos executivos datados: `rascunho`, `pronto`, `ativo`,
`concluído` e `cancelado`. Até 6 planos podem estar `ativo` ao mesmo tempo, cada um com território declarado (seção abaixo); eram 5 até 2026-11-10, quando duas sessões em paralelo abriram cada uma um plano sobre a mesma base e a pessoa deixou a decisão com quem conduzia. Desde 2026-11-26, por decisão da pessoa, até 3 planos a mais podem estar ativos se forem de ajuste ou melhoria do núcleo: todo plano em `rascunho`, `pronto` ou `ativo` declara `**Núcleo:** sim` ou `**Núcleo:** não` abaixo do Estado, e no plano ativo o campo é conferido contra o território (sim pede um caminho em `procedural/nucleo/`, e um caminho lá pede sim). São no máximo 6 planos ativos que não são de núcleo e 9 no total.

Um backlog, programa ou linha candidata não autoriza implementação automática.
Um plano só fica ativo quando tem objetivo, escopo, gates, território, critério de
saída e encerramento registrado. Cada plano ativo tem o seu gate de saída e fecha sozinho.

## Território dos planos ativos

Todo plano `ativo` declara, logo abaixo do Estado, uma linha `**Território:**` com os caminhos que ele muda, cada um entre crases e separados por vírgula: pasta terminada em `/` ou arquivo. Um plano ativo que só espera a aprovação da pessoa declara `**Território:** nenhum (aguarda aprovação)`.

Dois planos ativos não podem ter território sobreposto: há sobreposição quando um caminho é igual ao outro ou é a pasta que o contém. Ficam fora dessa regra os caminhos compartilhados por todos, que estão na lista `CAMINHOS_COMPARTILHADOS` de [`tools/mapa/planos.mjs`](../../../tools/mapa/planos.mjs), a única cópia dessa lista. Quando dois planos precisarem do mesmo arquivo, vale a ordem de prioridade da lista de planos ativos acima: o de menor prioridade espera ou pede à pessoa que mude o território.

O envio também é conferido contra o território, por `npm run territorio:check` (nos gates e no CI): cada arquivo mudado desde a base comum com a main pertence a um plano ativo (no fim do envio ou na base), a um caminho compartilhado ou a um arquivo gerado. O defeito pontual que fica fora se declara num commit do envio, que não seja de junção, com a linha `Fora-do-territorio: <arquivo>, <motivo>`; uma pasta só se declara quando o envio cria todos os arquivos dela.

## O que o gate exige

`npm run planos:check` lê todos os planos desta pasta e das subpastas. Cada plano precisa declarar `**Estado:**` com um dos estados da lista acima ou `congelado`, e ter no máximo 300 linhas. Um plano em `rascunho`, `pronto` ou `ativo` mora na raiz, não numa subpasta, e o de `rascunho` ou `pronto` precisa de link neste índice. O gate reprova mais de 5 planos `ativo`, plano ativo sem a linha `**Território:**` e territórios sobrepostos, dizendo os dois planos e o caminho em comum. Este índice precisa da declaração `**Planos ativos:**` com a lista dos planos ativos, cada um com o nome do arquivo num link, ou `nenhum.` quando não houver plano ativo, e a lista precisa conter exatamente os planos `ativo`. O mesmo comando confere que o README.md da raiz (parágrafo "Planos ativos:"), o `docs/modelar/INDEX.md` (linha "- Planos ativos:") e este índice apontam os mesmos planos ativos, ou todos nenhum.
