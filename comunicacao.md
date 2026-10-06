# Comunicação entre IAs

Canal de trabalho entre duas IAs neste repositório.

- **Planejadora** (Claude Code, sessão local): planeja e despacha tarefas.
- **Executora** (outra IA): faz o trabalho braçal e reporta aqui.

## Regras

1. A Planejadora escreve em "Tarefas". A Executora escreve só em "Relatório" da
   própria tarefa e no campo `Status`.
2. Uma tarefa por seção, numerada (`T001`, `T002`...), sem reescrever as antigas.
3. Antes de começar, a Executora lê **todos** os arquivos de "Ler antes" e o
   `CLAUDE.md`. Não lê além disso sem necessidade.
4. Não sair do escopo da tarefa. Se algo fora do escopo parecer necessário,
   parar, registrar em "Relatório" e marcar `Status: bloqueada`.
5. Rodar o que a tarefa pedir em "Verificação" e colar o resultado real,
   inclusive falhas.
6. Não fazer commit nem push, a menos que a tarefa diga.

Este arquivo é volátil: guarda só a tarefa em andamento. O histórico fica nos
commits e no plano; a Planejadora limpa a tarefa depois de revisá-la.

Status possíveis: `aberta` → `em andamento` → `feita` | `bloqueada`.

## Modelo de tarefa

```markdown
### T000 — título curto

- **Status:** aberta
- **Objetivo:** o que deve existir ao final, em uma ou duas frases.
- **Ler antes:**
  - `caminho/do/arquivo` — por que importa
- **Mexer em:** arquivos que podem ser alterados.
- **Não mexer em:** o que fica intocado.
- **Passos:**
  1. ...
- **Verificação:** comandos e o resultado esperado.
- **Relatório:** (Executora preenche: o que fez, o que rodou, o que falhou,
  dúvidas.)
```

## Tarefas

### T011 — Catálogo de famílias: formato da entrada, validação e consulta (fatia 1, parte A)

- **Status:** aberta
- **Objetivo:** existe um módulo novo, `modulos/catalogo-de-familias/`, com o
  formato versionado de uma entrada do catálogo, o validador e a consulta, e um
  comando `npm run familias` para a IA consultar sem ler arquivo. O catálogo
  real começa vazio: nesta fatia ninguém homologa nada, e as entradas de exemplo
  vivem só nas fixtures dos testes. É a primeira metade da fatia 1 do plano; a
  T012 faz a outra metade (o crítico).
- **Ler antes:**
  - `CLAUDE.md`
  - `docs/mecanifica/planos/2026-10-06-o-catalogo-de-familias.md` — inteiro;
    "Incluído" e o gate de saída 1 e 4 são o contrato desta tarefa
  - `README.md` da raiz, seção "Módulos" — a regra dos módulos isolados
  - `modulos/esboco/README.md`, seção "Independência do núcleo do Mecanifica" —
    o precedente de importar só `procedural/nucleo/expressoes.js`
  - `procedural/nucleo/expressoes.js` — avaliador de `"=a+b*c"`; não tem
    comparação, por isso a regra de recusa abaixo compara duas expressões
  - `modulos/esboco/componentes/roda.json` e `componentes/index.js` — a
    biblioteca de componentes que já existe; o formato novo precisa conseguir
    descrevê-la
  - `procedural/nucleo/catalogo.js` e `tools/catalogo/` — o "catálogo de
    capacidades", que já existe e é outra coisa; não reaproveite o nome
    `catalogo` em script, comando ou arquivo para não confundir os dois
  - `tools/gates.mjs` (listas `GATES` e `GATES_CURTOS`) e
    `.github/workflows/ci.yml` — se o gate novo entrar, entra nos dois
- **Mexer em:** `modulos/catalogo-de-familias/` (novo: `package.json`, `README.md`,
  `src/`, `tests/`, `entradas/` vazio com `.gitkeep`), `tools/mecanifica/familias.mjs`
  (CLI nova), `package.json` (scripts `familias` e `familias:check`),
  `tools/gates.mjs` e `.github/workflows/ci.yml` (só para o `familias:check`),
  a seção "Módulos" do `README.md` da raiz, e `docs/MAPA.md` por `npm run mapa`.
- **Não mexer em:** `modulos/esboco/` (nem componentes, nem código), o núcleo, o
  catálogo de capacidades, o plano.
- **O formato** (um arquivo JSON por entrada em `entradas/`, nome igual ao `id`):
  - `formato: "mecanifica.familia@1"`, `id` (texto estável, é a identidade;
    nunca índice), `versao` (inteiro, sobe a cada mudança), `tipo`
    (`ferramenta`, `familia` ou `objeto`), `descricao` (uma frase);
  - `parametros`: por nome, `{ min, max, padrao, unidade }` para os livres, ou
    uma expressão `"=..."` para os derivados (avaliada pelo `expressoes.js`);
  - `recusas`: lista de `{ a, op, b, motivo }`, com `a` e `b` número, nome de
    parâmetro ou expressão, e `op` em `<`, `<=`, `>`, `>=`, `==`, `!=`. A
    combinação é recusada quando a comparação é verdadeira, e o erro traz o
    `motivo`. Nada de avaliar JS;
  - `interfaces`: lista de `{ nome, tipo, papel, valor }`, com `papel` em
    `prove` ou `requer` e `valor` igual a um parâmetro. Encaixam duas interfaces
    do mesmo `tipo`, papéis opostos e mesmo valor (com a tolerância que você
    definir e documentar). O código não conhece nenhum tipo de interface pelo
    nome: "aro" é dado da entrada;
  - `usa`: lista de `{ id, versao }` das entradas de que esta depende
    (família usa ferramentas; objeto usa uma família);
  - `objeto` tem também `familia` (`{ id, versao }`) e `valores` (os parâmetros
    fixados), validados contra as faixas e as recusas da família;
  - `homologacao`: `{ estado, teste, pontos }`, com `estado` em `rascunho` ou
    `homologada`, `teste` o caminho do teste e `pontos` a lista de
    `{ valores, nota, veredito }`. Para `homologada`, o validador exige: o
    arquivo de teste existe, há um ponto com o mínimo e um com o máximo de cada
    parâmetro livre, um ponto com todos os livres no interior da faixa, e nota
    8 ou mais em todos.
  Se precisar de outro campo, acrescente e justifique no relatório; não tire
  nenhum dos acima.
- **Passos:**
  1. `src/`: o validador de uma entrada e do conjunto (ids únicos, `usa` aponta
     para entrada e versão que existem, sem ciclo em `usa`, objeto bate com a
     família) e a consulta, ambos puros, sem ler arquivo. Mensagem de erro diz o
     campo e a entrada.
  2. Consulta, com saída em texto curto e em JSON: por texto (`id` ou
     `descricao`), por tipo, por interface (`--encaixa <id>`: quem tem interface
     que encaixa em alguma da entrada dada, para os valores dados), por
     dependência inversa (`--quem-usa <id>`, transitivo, com a versão de que
     cada um depende) e por valores (`--conferir <id> --valores <json>`: aceita
     ou recusa com o motivo). Por padrão só mostra `homologada`; `--todas`
     inclui `rascunho`.
  3. `tools/mecanifica/familias.mjs` lê `entradas/`, valida e responde. Sem
     argumento, mostra o uso. Código de saída 1 em recusa ou entrada inválida.
  4. `npm run familias:check` valida todas as entradas. Com o catálogo vazio,
     passa. Entra em `GATES`, `GATES_CURTOS` e no `ci.yml`, e o teste
     `tools/mapa/gates-espelham-ci.test.mjs` tem de continuar passando.
  5. Testes em `modulos/catalogo-de-familias/tests/`, com fixtures de nomes
     neutros (sem pneu, roda nem qualquer objeto real no código ou nos nomes de
     teste): entrada válida; cada campo obrigatório ausente; faixa com `min` maior
     que `max`; recusa disparada com o motivo; encaixe por tipo, papel e valor, e
     não encaixe por valor diferente; `--quem-usa` transitivo; ciclo em `usa`
     recusado; objeto fora da faixa recusado; `homologada` sem ponto no extremo,
     com nota 7 ou com teste inexistente recusada.
  6. Uma fixture que descreve `modulos/esboco/componentes/roda.json` no formato
     novo, como `rascunho`, só para provar que o formato cabe. Ela fica em
     `tests/fixtures/`, não em `entradas/`. No relatório, diga o que do
     componente o formato não conseguiu expressar.
  7. `README.md` do módulo curto: o formato, os comandos, a regra de
     homologação e a diferença para o catálogo de capacidades.
- **Verificação:** cole a saída real de:
  - `npx vitest run modulos/catalogo-de-familias`
  - `npm run familias` sem argumento, e uma consulta qualquer
  - `npm run familias:check`
  - `npx vitest run tools/mapa`
  - `npm run mapa:check` e `npm run docs:links:check`
  Não cole resumo de gates que você não rodou.
- **Relatório:** (Executora preenche.)

### T012 — Crítico com escala ancorada, defeitos anteriores e nome nas vizinhas (fatia 1, parte B)

- **Status:** aberta (pode correr junto da T011; os arquivos não se cruzam)
- **Objetivo:** o crítico por unidade e o do Marco recebem três coisas que a
  medição do plano anterior mostrou faltar: uma escala fixa para a nota, os
  defeitos apontados na rodada anterior da mesma unidade, e o nome das peças
  vizinhas que aparecem em cinza. Sem isso a nota parou entre 6 e 7 e o
  crítico leu a longarina do quadro como guidão.
- **Ler antes:**
  - `CLAUDE.md`
  - `docs/mecanifica/planos/2026-10-06-o-catalogo-de-familias.md` — o item do
    crítico em "Incluído"
  - `docs/mecanifica/planos/encerrados/2026-10-01-o-esboco-detalhado-coerente.md`
    — "Fechamento", os achados do crítico
  - `.claude/agents/critico-visual.md` — seção "Unidade de esboço"
  - `tools/mecanifica/esboco.mjs` — `PERGUNTAS_DO_CRITICO` (linha ~602),
    `briefDoCritico` (~614), `PERGUNTAS_DO_MARCO` e `briefDoMarco` (~635 a 690),
    `vistasArquivo` (~549, onde entram os vizinhos)
  - `modulos/esboco/src/detalhe.js` — `formasVizinhas` e `comFormasVizinhas`
    (hoje tiram o rótulo das vizinhas)
  - `modulos/esboco/src/condutor.js` — `registrarVeredito` (os vereditos ficam
    em `estado.vereditos` com `unidade`, `nota`, `motivo`)
  - `modulos/esboco/tests/critico.test.js`, `nota-do-critico.test.js`,
    `vizinhos.test.js`
- **Mexer em:** `tools/mecanifica/esboco.mjs`, `modulos/esboco/src/detalhe.js`,
  os três testes acima, `.claude/agents/critico-visual.md`, a seção do crítico
  no `modulos/esboco/README.md`.
- **Não mexer em:** `modulos/catalogo-de-familias/` (é da T011), o Condutor além
  de ler o estado, as skills.
- **Passos:**
  1. Escala ancorada, escrita igual no agente e na pergunta da nota do brief da
     unidade e do Marco: 10, nenhum achado; 8 e 9, só detalhe de superfície,
     acabamento ou proporção fina; 5 a 7, pelo menos um defeito estrutural
     (ponta no ar, travessia sem explicação, peça fora de onde deveria estar
     presa, peça sem função); 0 a 4, a unidade não cumpre a `funcao`. Nota abaixo
     de 8 tem de citar o defeito estrutural que a puxou; detalhe de superfície
     sozinho não desce a nota abaixo de 8.
  2. Defeitos anteriores: quando a unidade (ou o Marco) já tem veredito no
     `<arquivo>.condutor.json`, o brief traz a última nota e o `motivo`, com a
     instrução de dizer para cada um se foi resolvido e de não contar como novo o
     que já foi apontado. Sem veredito anterior, o brief não muda.
  3. Nome nas vizinhas: o brief lista cada forma vizinha em cinza com o `id`, o
     `rotulo` se houver e a unidade a que pertence, com a `funcao` dessa unidade
     se houver. As imagens continuam sem legenda; se você achar que o nome
     também precisa entrar na imagem, proponha no relatório e não faça.
  4. Testes que falhavam antes: a escala aparece no brief da unidade e do Marco;
     com veredito anterior o brief traz nota e motivo, sem veredito não traz; o
     brief lista a vizinha com id, unidade e função. Use as fixtures que os
     testes já usam.
- **Verificação:** cole a saída real de:
  - `npx vitest run modulos/esboco/tests/critico.test.js modulos/esboco/tests/nota-do-critico.test.js modulos/esboco/tests/vizinhos.test.js`
  - `npx vitest run modulos/esboco`
  - um brief real impresso por `--feito` numa fixture com veredito anterior e
    vizinhas, para se ver o texto que o crítico recebe
  - `npm run mapa:check` e `npm run docs:links:check`
- **Relatório:** (Executora preenche.)
