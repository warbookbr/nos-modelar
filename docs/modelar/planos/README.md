# Planos do Modelar

## Estado

**Planos ativos:**

1. [furgão realista](2026-10-30-furgao-realista.md). Território: `procedural/pecas/furgao-realista/`, `procedural/familias/roda-pneu/`, `docs/modelar/banco-de-provas/furgao-realista-2026-10-30/`. Em aberto: a etapa 8, com a frente e a lanterna traseira aprovadas e uma rodada de acabamento (moldura do arco, grade, aro da luz de canto, pé do para-brisa), os acabamentos que restam da etapa 7 e a etapa de materiais, sobre o plano dos materiais realistas.
2. [as partes do braço](2026-09-26-as-partes-do-braco.md). Território: `procedural/pecas/braco-robotico/`, `src/autoria/etapas-de-construcao.js`, `tools/modelar/etapas-da-montagem.mjs`, `src/autoria/lataria.js`, `tools/modelar/vistas-de-superficie.mjs`, `tools/modelar/vistas-para-critica.mjs`. Em aberto: as partes restantes, a começar pelo anel do cotovelo e pelo cotovelo, e a exportação do braço montado.
3. [união de tubos com arredondamento](2026-11-08-uniao-de-tubos-com-arredondamento.md). Território: `tools/fixtures/uniao-de-tubos/`. Em aberto: a fatia 1, a prova de dois tubos que se cruzam com `unir` e `arredondarCostura` como estão.

A lista está em ordem de prioridade. A ordem desempata quando dois planos precisam do mesmo arquivo: o de menor prioridade espera ou pede à pessoa que mude o território.

[Trecho que some entre laços](encerrados/2026-11-08-trecho-que-some-entre-lacos.md) fechou em 2026-11-08, com o `encolhe`, o `esvai`, o `une` e a tampa côncava no `gaiolaPorLacos`, a aba do cotovelo corrigida na peça de prova e as réguas de dobra e de vinco oculto como aviso no `descrever`, com `PLANO.dobrasAceitas`; o cotovelo espera a união de dois sólidos com filete, que está no backlog. [Materiais realistas](encerrados/2026-11-08-materiais-realistas.md) fechou em 2026-11-08, com o material da receita normalizado, a bancada com verniz, vidro, metal espelhado e relevo sob o estúdio e o céu aberto gerados pelo projeto, os relevos por mapa com a projeção no próprio relevo e `npm run exportar:gltf`, que passa no validador oficial e abre no Blender com os materiais; tudo aprovado pela pessoa na peça de prova, e a aplicação no furgão segue no plano dele. [Abertura só na vizinhança do vão](encerrados/2026-11-06-abertura-so-na-vizinhanca.md) fechou em 2026-11-07, com a booleana de cada vão vendo só a vizinhança dele: as sete aberturas do furgão caíram de 51 s para 3,7 s, e o furgão, aprovado pela pessoa por imagem, mudou só a triangulação junto de três vãos. [Esboço pelo núcleo](encerrados/2026-11-05-esboco-pelo-nucleo.md) fechou em 2026-11-05, com o esboço antigo removido e o esboço 2.0 feito pelas operações do núcleo, as variantes de receita e o relato de contatos. [Navegação de receitas](encerrados/2026-11-05-navegacao-de-receitas.md) fechou em 2026-11-05, com o mapa da receita, a convenção de divisão e a receita do furgão dividida com a malha igual; o modelador de estudo leu menos da metade da receita. [Abertura de contorno livre](encerrados/2026-11-05-abertura-de-contorno-livre.md) fechou em 2026-11-05, com a operação `aberturaPorContorno`, a aba, a lente recuada e a moldura do vão, aprovada pela pessoa na peça de teste. [Sólido por laços](encerrados/2026-11-05-solido-por-lacos.md) fechou em 2026-11-05, com o ajudante `gaiolaPorLacos` no núcleo e a peça em L e a dobra em U aprovadas pela pessoa; o ombro e o cotovelo passam a ele pelo plano do braço. [A porta de entrada dos agentes](encerrados/2026-11-05-porta-de-entrada-dos-agentes.md) fechou em 2026-11-05, com a ficha por capacidade e o `--ajuda` nas ferramentas; a leitura de código do modelador caiu cerca de 30% em volume, sem chegar à metade pedida, e o que faltou ficou no sólido por laços e no backlog.

[Glossário e entrada para pessoas](encerrados/2026-10-30-glossario-e-entrada-para-pessoas.md) fechou em 2026-10-30, com a página de entrada para pessoas aprovada e sem glossário separado.

[Ajustes no núcleo dos veículos](encerrados/2026-10-21-ajustes-no-nucleo-dos-veiculos.md) fechou em 2026-10-30, com os onze achados das 27 receitas na ferramenta geral, a calibração do crítico julgada de novo e o acervo de 54 peças igual ao de antes; o sucessor escolhido pela pessoa é o [furgão realista](2026-10-30-furgao-realista.md).

[Leitura por demanda e limpeza](encerrados/2026-10-22-leitura-por-demanda-e-limpeza.md) fechou em 2026-10-27, com a entrada por perguntas e o repositório sem as áreas que ninguém usava; o gate de 60% menos leitura não passou (19% na correção, 49% na modelagem).

[Carroceria por rede de curvas](encerrados/2026-10-24-carroceria-por-rede-de-curvas.md) fechou em 2026-10-25 com o nono teste cego e o nível oficial de carroceria, a lataria lisa com os detalhes como peças à parte. [Gaiola que segue as feições](encerrados/2026-10-23-gaiola-que-segue-as-feicoes.md) fechou em 2026-10-24 com o oitavo. [Carroceria por subdivisão](encerrados/2026-10-21-carroceria-por-subdivisao.md) fechou em 2026-10-23 com o sétimo. [Veículos de referência livre](encerrados/2026-10-20-veiculos-de-referencia-livre.md) fechou em 2026-10-20 com 27 veículos aprovados pela pessoa. [Objetos externos](encerrados/2026-10-19-objetos-externos-como-familias.md) fechou em 2026-10-20. [Receitas com material e textura](encerrados/2026-10-19-receitas-com-material-e-textura.md) fechou em 2026-10-19, com o tradutor das receitas externas, o campo de materiais no esboço e o módulo de textura de madeira, metal, tecido e liso. [Aparelhos de caixa](encerrados/2026-10-16-aparelhos-de-caixa.md) fechou em 2026-10-19, com a família `aparelho-de-caixa`, quatro perfis aprovados pela pessoa e o processo leve de modelagem escrito. [Importar objeto de código](encerrados/2026-10-15-importar-objeto-de-codigo.md) fechou em 2026-10-16, com a decisão da pessoa de não seguir com a importação como caminho principal; os importadores de OpenSCAD, STEP e STL saíram em 2026-10-25, e o histórico guarda como recriá-los. [Gates em poucos minutos](encerrados/2026-10-16-gates-em-poucos-minutos.md) fechou no mesmo dia. [O avião do esboço à
receita](encerrados/2026-10-15-o-aviao-do-esboco-a-receita.md) fechou em 2026-10-16, com as oito peças no núcleo, a montagem
auditada e o avião aprovado pela pessoa; a picape, o braço robótico, o carrinho de mão e a empilhadeira vêm em seguida, na ordem
que a pessoa escolher. [As famílias de desenho](encerrados/2026-10-14-familias-de-desenho.md) fecharam em 2026-10-14, e o código delas saiu em 2026-10-25.
Em rascunho: [ferramenta de material](2026-11-08-ferramenta-de-material.md), para ver um material em segundos, compor relevos e reaproveitar materiais por nome; pode ser ativado, porque o plano dos materiais realistas fechou.

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
`concluído` e `cancelado`. Até 5 planos podem estar `ativo` ao mesmo tempo, cada um com território declarado (seção abaixo).

Um backlog, programa ou linha candidata não autoriza implementação automática.
Um plano só fica ativo quando tem objetivo, escopo, gates, território, critério de
saída e encerramento registrado. Cada plano ativo tem o seu gate de saída e fecha sozinho.

## Território dos planos ativos

Todo plano `ativo` declara, logo abaixo do Estado, uma linha `**Território:**` com os caminhos que ele muda, cada um entre crases e separados por vírgula: pasta terminada em `/` ou arquivo. Um plano ativo que só espera a aprovação da pessoa declara `**Território:** nenhum (aguarda aprovação)`.

Dois planos ativos não podem ter território sobreposto: há sobreposição quando um caminho é igual ao outro ou é a pasta que o contém. Ficam fora dessa regra os caminhos compartilhados por todos, que estão na lista `CAMINHOS_COMPARTILHADOS` de [`tools/mapa/planos.mjs`](../../../tools/mapa/planos.mjs), a única cópia dessa lista. Quando dois planos precisarem do mesmo arquivo, vale a ordem de prioridade da lista de planos ativos acima: o de menor prioridade espera ou pede à pessoa que mude o território.

## O que o gate exige

`npm run planos:check` lê todos os planos desta pasta e das subpastas. Cada plano precisa declarar `**Estado:**` com um dos estados da lista acima ou `congelado`, e ter no máximo 300 linhas. Um plano em `rascunho`, `pronto` ou `ativo` mora na raiz, não numa subpasta, e o de `rascunho` ou `pronto` precisa de link neste índice. O gate reprova mais de 5 planos `ativo`, plano ativo sem a linha `**Território:**` e territórios sobrepostos, dizendo os dois planos e o caminho em comum. Este índice precisa da declaração `**Planos ativos:**` com a lista dos planos ativos, cada um com o nome do arquivo num link, ou `nenhum.` quando não houver plano ativo, e a lista precisa conter exatamente os planos `ativo`. O mesmo comando confere que o README.md da raiz (parágrafo "Planos ativos:"), o `docs/modelar/INDEX.md` (linha "- Planos ativos:") e este índice apontam os mesmos planos ativos, ou todos nenhum.
