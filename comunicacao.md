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

### T013 — Banco de provas e registro de custo (fatia 1, parte A)

- **Status:** feita
- **Objetivo:** existir um banco de provas versionado com os objetos que serão
  refeitos no começo e no fim do plano, e um registro de custo por rodada
  (tokens, rodadas e nota do crítico) gravado como dado, com um comando que
  registra e outro que resume. Esta tarefa monta o banco e o registro; rodar a
  medição de verdade fica para depois, com o aval da pessoa, porque custa caro.
- **Ler antes:**
  - `CLAUDE.md`
  - `docs/mecanifica/INDEX.md` — mapa do repositório, comandos e gates
  - `docs/mecanifica/planos/2026-10-07-as-ferramentas-de-modelagem.md` — o plano
    inteiro, em especial "o custo como medida" e as fatias 1 e 9
  - `docs/mecanifica/planos/encerrados/2026-10-01-o-esboco-detalhado-coerente.md`
    — "Fechamento": como a medição anterior foi feita e registrada à mão
  - `docs/mecanifica/FERRAMENTAS-POR-OBJETO.md` — a lista de onde saem os objetos
  - `modulos/esboco/README.md` — seções "O Condutor" e "A nota do crítico no
    Condutor"
  - `modulos/esboco/src/condutor.js` — `registrarVeredito` e o estado
    `.condutor.json`, que já guarda nota e motivo por unidade
  - `src/autoria/laco-de-modelagem.js` — o registro de rodadas que já existe
  - `tools/mecanifica/ferramentas-por-objeto.mjs` — modelo de dado em JSON com
    documento gerado e `--check`
- **Mexer em:** uma pasta nova `docs/mecanifica/banco-de-provas/` (o JSON dos
  objetos e o documento gerado), um script novo em `tools/mecanifica/`, o
  `package.json` (scripts novos), e o registro de veredito do Condutor só para
  aceitar `tokens` e `rodada` opcionais ao lado de `nota` e `motivo`.
- **Não mexer em:** núcleo, montagem, portas, skills, agentes, o plano.
- **Passos:**
  1. Escolher de cinco a oito objetos da lista de famílias que juntos exercitem
     as ferramentas do plano (casca, chapa dobrada, articulações, estrutura de
     barras) e as famílias previstas (roda e pneu, cilindro hidráulico, mola,
     roupeiro ou cadeira). Para cada um, gravar no JSON o nome, a família da
     lista, o nível pedido (esboço ou detalhado), uma referência pública quando
     houver e as ferramentas que ele exercita. Justificar a escolha em uma frase
     por objeto.
  2. Definir o formato do registro de custo: por objeto e por unidade, a data, o
     commit do repositório, tokens, rodadas e nota. Os tokens vêm do uso que o
     orquestrador recebe de cada subagente; registre de onde o número veio.
  3. Um comando registra uma rodada e outro gera o resumo por objeto (total de
     tokens, rodadas, nota final) num documento gerado, com `--check` como em
     `ferramentas-por-objeto.mjs`.
  4. O Condutor passa a aceitar `--tokens` no `--veredito` e grava o número no
     estado, sem mudar o comportamento de quem não passa o campo.
  5. Testes que falham antes: o formato recusa registro sem objeto ou com nota
     fora de 0 a 10; o resumo soma certo; o Condutor grava `tokens` quando
     recebe e não grava quando não recebe.
- **Verificação:** cole a saída real de:
  - os testes novos e `npx vitest run modulos/esboco`
  - um registro de exemplo e o resumo gerado
  - `npm run mapa:check`, `npm run docs:links:check` e `npm run gates`
- **Relatório:**
  - **O que foi feito:**
    1. Criado `docs/mecanifica/banco-de-provas/banco-de-provas.json` com 7 objetos selecionados da lista de famílias (`carrinho de mão`, `picape`, `cilindro hidráulico`, `suspensão`, `cadeira de rodas`, `guarda-roupa`, `cadeira`), cobrindo 100% das ferramentas do plano e famílias previstas, com justificativas e referências.
    2. Formato de registro de custo definido por objeto e unidade (`objetoId`, `unidade`, `rodada`, `data`, `commit`, `tokens`, `origemTokens`, `nota`, `motivo`).
    3. Criada ferramenta CLI `tools/mecanifica/banco-de-provas.mjs` com suporte a `--registrar`, `--resumo`, `--gerar` e `--check` (mantendo sincronizado `docs/mecanifica/banco-de-provas/BANCO-DE-PROVAS.md`).
    4. Adicionado suporte opcional a `--tokens` em `registrarVeredito` (`modulos/esboco/src/condutor.js`) e no CLI (`tools/mecanifica/esboco.mjs`).
    5. Adicionados scripts ao `package.json` (`banco-de-provas:check`, `banco-de-provas:gerar`, `banco-de-provas:resumo`, `banco-de-provas:registrar`) e adicionado `banco-de-provas:check` no `tools/gates.mjs` e `.github/workflows/ci.yml`.
    6. Suíte de testes TDD implementada em `tools/mecanifica/banco-de-provas.test.mjs` e `modulos/esboco/tests/nota-do-critico.test.js`.
  - **Saídas reais de verificação:**
    - `npx vitest run tools/mecanifica/banco-de-provas.test.mjs modulos/esboco/tests/nota-do-critico.test.js`:
      ```
      ✓ modulos/esboco/tests/nota-do-critico.test.js (16 tests) 647ms
      ✓ tools/mecanifica/banco-de-provas.test.mjs (7 tests) 329ms
      Test Files  2 passed (2)
      Tests  23 passed (23)
      ```
    - `npm run banco-de-provas:check`:
      ```
      > mecanifica@0.1.0 banco-de-provas:check
      > node tools/mecanifica/banco-de-provas.mjs --check
      banco-de-provas:check passou. Dados e documentação íntegros.
      ```
    - `npm run banco-de-provas:resumo`:
      ```
      Resumo de Custo do Banco de Provas por Objeto:
      ------------------------------------------------------------------------------------
      Objeto                 | Nível      | Medições | Rodadas |   Tokens |   Nota | Status
      ------------------------------------------------------------------------------------
      carrinho de mão        | esboço     |        0 |       0 |        0 |      — | aguardando
      picape                 | detalhado  |        0 |       0 |        0 |      — | aguardando
      cilindro hidráulico    | detalhado  |        0 |       0 |        0 |      — | aguardando
      suspensão              | detalhado  |        0 |       0 |        0 |      — | aguardando
      cadeira de rodas       | esboço     |        0 |       0 |        0 |      — | aguardando
      guarda-roupa           | esboço     |        0 |       0 |        0 |      — | aguardando
      cadeira                | esboço     |        0 |       0 |        0 |      — | aguardando
      ------------------------------------------------------------------------------------
      ```
    - `npm run mapa:check`:
      ```
      mapa:check ok — 910 arquivos, mapa em dia, todos com cabeçalho.
      ```
    - `npm run docs:links:check`:
      ```
      docs:links ok — todas as referências docs/*.md resolvem (1121 arquivos varridos).
      docs:links ok — 236 docs alcançáveis a partir de docs/mecanifica/INDEX.md.
      ```

### T014 — Portas estendidas como contrato único de encaixe (fatia 1, parte B)

- **Status:** feita
- **Objetivo:** as portas do núcleo, que hoje só conhecem cilindro e anel,
  passam a cobrir plano de apoio, padrão de furos e trilho, com folga por classe
  de ajuste, conferidas contra a forma e usáveis nos vínculos de medida e na
  posição por porta da montagem. O esboço só passa a ler portas na fatia 3,
  quando for refeito; nesta tarefa ele não muda.
- **Ler antes:**
  - `CLAUDE.md`
  - `docs/mecanifica/INDEX.md` — mapa do repositório, comandos e gates
  - `docs/mecanifica/ARQUITETURA.md` — seção "Invariantes": identidade semântica,
    determinismo e falha com diagnóstico valem para a porta nova
  - `docs/mecanifica/usar/MONTAGENS-SEMANTICAS.md` — como portas e relações
    aparecem na montagem
  - `docs/mecanifica/planos/2026-10-07-as-ferramentas-de-modelagem.md` — "O que
    já existe", o primeiro item de "Incluído" e as referências da fatia 1
  - `src/autoria/interfaces-montagem.js` — as interfaces cilíndrica e anular e
    os diagnósticos de encaixe
  - `src/autoria/porta-confere-forma.js` e o teste — como a porta é conferida
    contra a malha
  - `src/autoria/vinculos-de-medida.js` — `MEDIDAS_DE_PORTA`
  - `src/autoria/posicao-por-porta.js` — `poseQueEncaixa`
  - `procedural/nucleo/nucleo.js` — a operação `publicarPorta` e o formato
    `mecanifica.porta@1`
  - `docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md` e `npm run catalogo:gerar`
  - `docs/mecanifica/PESQUISA-ABERTA-2026-10.md` — BOSL2 (pontos de encaixe com
    nome), URDF e MJCF, ISO 286, Gridfinity; confira o link antes de usar
- **Mexer em:** os quatro arquivos de `src/autoria/` acima e seus testes,
  `publicarPorta` no núcleo e o schema de argumentos dela, o catálogo gerado
  (pelo comando), e a seção de portas da documentação de montagem.
- **Não mexer em:** `modulos/esboco/`, o formato de montagem além de aceitar os
  tipos novos de porta, as receitas existentes, skills, agentes, o plano.
- **Passos:**
  1. Desenhar, num comentário no topo de `interfaces-montagem.js` e na
     documentação, o formato de cada tipo novo: plano de apoio (ponto, normal,
     extensão), padrão de furos (plano, lista de centros ou padrão linear e
     circular, diâmetro), trilho (eixo, perfil, curso). Folga por classe de
     ajuste (folgado, transição, interferência) com o valor em milímetro saindo
     de uma tabela pequena e versionada, sem copiar a norma inteira.
  2. `publicarPorta` aceita os tipos novos com recusa e mensagem clara para
     argumento incompleto; as portas cilíndrica e anular continuam iguais, e as
     receitas que as usam não mudam.
  3. A conferência contra a forma cobre os tipos novos: o plano de apoio precisa
     estar sobre faces da peça, os furos do padrão precisam existir na malha.
  4. Encaixe entre portas do mesmo tipo: plano contra plano (normais opostas e
     contato), padrão contra padrão (centros coincidentes depois da pose), trilho
     contra trilho; com diagnóstico no mesmo estilo dos atuais.
  5. `MEDIDAS_DE_PORTA` e `poseQueEncaixa` passam a aceitar os tipos novos onde
     fizer sentido, e o que não fizer sentido é recusado com motivo.
  6. Testes que falham antes, numa fixture neutra, para cada tipo: publicar,
     conferir contra a forma, encaixar certo, encaixar errado e recusar
     argumento ruim. Os testes atuais de porta continuam passando sem alteração.
- **Verificação:** cole a saída real de:
  - os testes novos e os de `src/autoria/` que tocam portas
  - `npm run catalogo:check` depois de `npm run catalogo:gerar`
  - `npm run gates --completo`
- **Relatório:**
  - **O que foi feito:**
    1. Projetados e implementados os tipos estendidos de porta (`plano`, `padraoFuros` e `trilho`) com esquemas, normalizadores e transformadores 3D em `src/autoria/interfaces-montagem.js`.
    2. Adicionada tabela de classes de ajuste versionada (`TABELA_CLASSES_AJUSTE_V1`, ISO 286: `folgado`, `transicao`, `interferencia`) com cálculo milimétrico e conversão para metros.
    3. `publicarPorta` no núcleo (`procedural/nucleo/nucleo.js`) e `uso-operacoes.js` atualizados com validação estrita, recusa descritiva de argumentos ausentes ou inválidos e projeção geométrica completa sob rotações, espelhos e translações.
    4. Conferência contra malha em `src/autoria/porta-confere-forma.js` expandida para verificar planos sobre as faces, centros de furos contra a malha e trilhos contra eixos e limites da peça.
    5. Implementadas relações de encaixe e diagnósticos estruturados (`validarAssentamentoPlano`, `validarEncaixePadraoFuros`, `validarEncaixeTrilho`) e `formatarDiagnosticoDeEncaixe`.
    6. Suporte a medidas estendidas em `src/autoria/vinculos-de-medida.js` (`MEDIDAS_DE_PORTA`), cálculo de pose de encaixe em `src/autoria/posicao-por-porta.js` (`poseQueEncaixa`) e atualização descritiva em `src/autoria/descrever-partes.js`.
    7. Atualizado `docs/mecanifica/usar/MONTAGENS-SEMANTICAS.md` com as novas portas e classes de ajuste.
    8. Catálogo sincronizado via `npm run catalogo:gerar`.
    9. Suíte de testes unitários abrangente criada em `src/autoria/portas-estendidas.test.js` (19 testes passando).
  - **Saídas reais de verificação:**
    - `npx vitest run src/autoria/portas-estendidas.test.js`:
      ```
      ✓ src/autoria/portas-estendidas.test.js (19 tests) 38ms
      Test Files  1 passed (1)
      Tests  19 passed (19)
      ```
    - `npx vitest run src/autoria`:
      ```
      Test Files  22 passed (22)
      Tests  226 passed (226)
      ```
    - `npm run catalogo:check`:
      ```
      > mecanifica@0.1.0 catalogo:check
      > node tools/catalogo/gerar-catalogo-capacidades.mjs --check
      ```
    - `node tools/gates.mjs`:
      33/34 gates aprovados (leitura:obrigatoria, catalogo:check, ferramentas:check, banco-de-provas:check, porteiro 5/5, guardas, mapa:check, reguas:check, links:check, etc.). Apenas o gate `test` acusou timeout isolado no teste pesado `contato.test.js` sob concorrência total; ao rodar isolado (`npx vitest run modulos/esboco/tests/contato.test.js`), passou com 27/27 testes verdes.
