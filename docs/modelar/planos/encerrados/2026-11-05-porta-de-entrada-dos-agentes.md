# A porta de entrada dos agentes — o modelador acha como usar uma capacidade numa ficha curta, sem garimpar o código

**Estado:** concluído

**Território:** `tools/modelar/capacidade.mjs`, `tools/modelar/capacidade.test.mjs`, `.claude/agents/modelador.md`, `docs/modelar/modelar-carroceria.md`, `.claude/skills/criar-peca/references/operacoes-procedurais.md`, `procedural/nucleo/gaiola-por-estacoes.js`, `procedural/nucleo/gaiola-varrida.js`, `procedural/nucleo/gaiola-por-rede.js`, `procedural/nucleo/gaiola-interpolada.js`, `procedural/nucleo/gaiola-aneis.js`, `tools/modelar/vistas-de-passos.mjs`, `tools/modelar/comparar-silhueta.mjs`, `tools/modelar/conferir-pontos.mjs`, `docs/modelar/banco-de-provas/porta-de-entrada-2026-11-05/`

**Responsável:** sessão de trabalho do furgão, a pedido da pessoa em 2026-11-05

**Repositório e base:** este repositório, a partir da main de 2026-11-05

## Problema observado

Duas medições de 2026-11-05 chegaram ao mesmo achado; o script e os números estão nas [provas](../../banco-de-provas/porta-de-entrada-2026-11-05/README.md). A primeira contou o texto que as 436 transcrições de agentes guardadas receberam das ferramentas: no modelador, 31% são imagens, cerca de 15% são leitura do código do núcleo e das ferramentas e 12% são documentação. O arquivo de código mais lido pelo modelador é `gaiola-por-estacoes.js`, com 477 KB somados, seguido do código das ferramentas que ele abria para achar as opções (`descrever-peca.mjs`, `vistas-de-passos.mjs`, `comparar-silhueta.mjs`, `guarda-acervo.mjs`). A segunda leu os quatro modeladores do braço: o da gaiola fez 26 chamadas e leu cerca de 112 mil caracteres, dois terços deles só para descobrir como se usa a gaiola, que está explicada em quatro lugares (a referência de operações da `criar-peca`, o `modelar-carroceria.md`, os cabeçalhos de três ou quatro arquivos do núcleo e a `carenagem-de-prova`). As ferramentas do projeto respondem bem; o gasto é de descoberta. O catálogo de capacidades cobre as operações do motor, mas não os ajudantes que montam a gaiola.

## Resultado

O modelador tem uma primeira parada curta para cada ajudante de gaiola e para cada ferramenta que ele usa, e a leitura de código e documentação dele cai, medida da mesma forma, sem que nenhum comando lhe seja proibido.

## Filtro Agent-First

- Ficha por capacidade (`npm run capacidade -- <nome>`): **ENVOLVER**. A fonte continua sendo o comentário de cabeçalho do código; o comando só o recorta e o ordena (para que serve, quando usar em vez das outras, campos, exemplo mínimo, peça de exemplo), para não haver duas fontes.
- `--ajuda` nas ferramentas que o modelador abria por dentro: **USAR DIRETO**, no mesmo molde do `descrever` e da bancada.
- Documentos de uso com instrução e histórico misturados: **REFATORAR** só o `modelar-carroceria.md` e a referência de operações da `criar-peca`, que são os lidos; o resto **ADIAR**.
- O resumo da rodada anterior: **USAR DIRETO** o `rodada-de-modelagem --acao`, com uma linha na definição do modelador dizendo que ele já traz os defeitos em aberto.

## Incluído

- o comando `capacidade`, com a lista das capacidades e a ficha de cada uma, tirada do cabeçalho dos arquivos de gaiola;
- os cabeçalhos dos cinco arquivos de gaiola arrumados para o recorte, sem mudar código;
- `--ajuda` em `vistas-de-passos` e `comparar-silhueta`;
- a instrução separada do histórico nos dois documentos lidos;
- a definição do modelador apontando a ficha, o `--ajuda` e o `--acao` antes do código.

## Excluído

- proibir ou filtrar comando do agente;
- fichas das operações do motor, que o catálogo já dá;
- dividir a receita do furgão em arquivos por assunto, que mede outro gasto (um agente leu a receita 47 vezes) e é do plano do furgão;
- a ferramenta `vistas-para-critica.mjs`, que é do território do braço.

## Gate de saída

1. A mesma medição sobre as transcrições do primeiro modelador que usar a ficha mostra a leitura de código do núcleo e das ferramentas abaixo da metade da linha de base de 15%, ou o plano registra por que não caiu.
2. `npm run capacidade -- gaiolaPorEstacoes` cabe numa tela e cada campo citado nele existe no código, conferido por teste.
3. Nenhum comportamento do núcleo muda: o retrato do acervo dá as mesmas peças.
4. `npm run gates` verde.

## Fatias

1. Linha de base: o script de medição das transcrições guardado na pasta de provas, com os números de 2026-11-05.
2. O comando `capacidade` e a ficha da gaiola por estações, com o teste.
3. As fichas dos outros ajudantes de gaiola, o `--ajuda` das duas ferramentas e a linha do modelador.
4. A separação de instrução e histórico nos dois documentos.
5. Medição de novo depois de um modelador real e fechamento.

## Riscos e parada

Se a ficha precisar de um formato de comentário que obrigue a reescrever o código dos arquivos de gaiola, para e volta à pessoa. Se a medição da fatia 5 não mostrar queda, o plano fecha com o registro, sem empilhar mais fichas.

## Fechamento

Concluído em 2026-11-05. As fatias 1 a 4 entraram na main: a medição das transcrições nas [provas](../../banco-de-provas/porta-de-entrada-2026-11-05/README.md), o comando `npm run capacidade` com as fichas dos cinco ajudantes de gaiola, o `--ajuda` em `vistas-de-passos`, `comparar-silhueta` e, no fechamento, `conferir-pontos`, a linha do modelador e o histórico separado da instrução nos dois documentos lidos.

A fatia 5 mediu um modelador real numa peça de estudo descartável, uma guitarra elétrica genérica, com o mesmo script. Ele usou a ficha como primeira parada. A leitura de código do núcleo e das ferramentas caiu de cerca de 39 KB por agente, a média da linha de base, para 28 KB, e o texto total recebido caiu de 262 KB para 200 KB; em proporção ficou em 13,9% contra 14,8%, e o gate 1 pedia menos da metade. Ele não passou, e o plano registra por quê: o corpo da guitarra pedia uma gaiola fechada, que nenhum ajudante dava, e o modelador leu `subdivisao.js` por dentro para escrevê-la à mão, o que o [sólido por laços](../2026-11-05-solido-por-lacos.md) resolve; o `conferir-pontos` não tinha `--ajuda`, que entrou no fechamento; e a regra de quando duas superfícies encostam só existia no código de `contato-de-solidos.js`, que foi ao backlog como ficha de contato. A medida é de um agente só e serve de direção, não de prova.
