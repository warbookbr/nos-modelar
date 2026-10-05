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

### T003 — Modo "um esbocista novo por unidade" na `laco-do-esboco`

- **Status:** aberta
- **Objetivo:** a skill `laco-do-esboco` ganha um segundo modo, em que cada
  unidade é feita por um `esbocista` NOVO que lê o estado do disco, em vez de um
  esbocista único por objeto retomado por `SendMessage`. É o item 8 do plano,
  segunda parte. O modo atual continua existindo.
- **Ler antes:**
  - `CLAUDE.md` — regras do repositório
  - `docs/mecanifica/planos/2026-10-01-o-esboco-detalhado-coerente.md` — fatia 8
    (segunda frase) e fatia 9, que vai comparar os dois modos
  - `.claude/skills/laco-do-esboco/SKILL.md` — a skill a alterar
  - `.claude/skills/laco-de-modelagem/SKILL.md` — o modelo a seguir: cada etapa
    despacha um `modelador` novo que lê o disco, com `notaDePassagem` (veja a
    seção que a descreve, por volta das linhas 29 e 128-135)
  - `.claude/agents/modelador.md` — como o agente novo recebe o estado
  - `.claude/agents/esbocista.md` — o agente que será despachado por unidade
  - `.claude/skills/esboco-detalhado/SKILL.md` — o núcleo que o esbocista lê
  - `modulos/esboco/README.md` — seção "O Condutor" e o que a T002 acrescentou:
    a nota de passagem gravada pelo Condutor
  - `modulos/esboco/tests/skill.test.js` — testa as skills; pode ser preciso
    cobrir o modo novo
- **Mexer em:** `.claude/skills/laco-do-esboco/SKILL.md`,
  `.claude/agents/esbocista.md` (só o necessário para aceitar a unidade e a nota
  de passagem no brief), `modulos/esboco/tests/skill.test.js`.
- **Não mexer em:** código do módulo (`modulos/esboco/src/`), que a T002 já
  mudou; `laco-de-modelagem`; a skill `esboco-detalhado`; o plano.
- **Passos:**
  1. Leia o `laco-de-modelagem` e veja como ele passa o estado entre etapas.
  2. Em `laco-do-esboco`, descreva os dois modos: objeto inteiro com um
     esbocista (o atual) e um esbocista novo por unidade. Diga quando usar cada
     um e que o segundo é o que a fatia 9 vai medir contra o primeiro.
  3. No modo novo, descreva o brief de cada esbocista: objeto, nível, pasta, a
     unidade a fazer, e o que ele lê do disco (plano, Condutor com
     `--historico`, vereditos e a nota de passagem da unidade anterior). O
     esbocista anterior não é retomado por `SendMessage`.
  4. Use a nota de passagem da T002: o esbocista a grava pelo comando novo e o
     seguinte a lê do Condutor. Descreva o que ela contém (o porquê das
     escolhas, não o que foi feito).
  5. Diga como fica a regra da nota abaixo de 8 no modo novo: refazer a mesma
     unidade com um esbocista novo que lê o motivo do crítico no disco.
  6. Ajuste o `esbocista.md` para aceitar esse brief.
- **Verificação:**
  - `npx vitest run modulos/esboco` passa.
  - `npm run mapa:check` e `npm run docs:links:check` passam.
  - Cole a saída real de cada um, inclusive falhas.
- **Relatório:** (Executora preenche: o que fez, o que rodou, o que falhou,
  dúvidas.)

### T004 — Auditoria dos testes (só relatório, nada é alterado)

- **Status:** aberta (pode começar em paralelo com a T002, sem mexer nos mesmos arquivos)
- **Objetivo:** dizer quais dos ~239 arquivos de teste protegem comportamento de
  verdade e quais são caros de manter e pouco úteis. A Planejadora decide o que
  cortar depois; esta tarefa só mede e relata.
- **Ler antes:**
  - `CLAUDE.md` — regras do repositório
  - `tools/gates.mjs` — a lista de gates e por que cada um nasceu
  - `.github/workflows/ci.yml` — o que o CI roda
  - `package.json` e `vitest.config.ts` — como os testes são rodados
- **Mexer em:** nada do repositório. Grave o relatório só em "Relatório" abaixo.
- **Não mexer em:** qualquer arquivo de teste, código ou documento. Não apague
  nem conserte teste, mesmo que ache o erro.
- **Passos:**
  1. Liste todos os `*.test.*` (exceto `node_modules`), por pasta, com o número de
     testes (`it`/`test`) de cada arquivo.
  2. Classifique cada arquivo em uma de quatro classes, pelo que ele afirma:
     **comportamento** (roda código e confere o resultado), **contrato**
     (confere formato de dado ou API), **texto** (lê documento ou skill e procura
     palavras), **ambiente** (depende de navegador, rede ou sistema). Em caso de
     dúvida, abra o arquivo; não classifique só pelo nome.
  3. Separe os arquivos de classe **texto**: para cada um, diga o que ele
     protege e se o risco que ele cobre já é coberto por outro teste ou gate.
  4. Rode `npx vitest run` e registre: tempo total, os 10 arquivos mais lentos e
     cada falha, com a mensagem real. Contexto: numa execução de `npm run gates` o
     gate `test` levou 694 s e falhou (`mcp:check` 110 s, `mcp:visual:check`
     112 s), e o comentário de `tools/gates.mjs` registra 77 s para a suíte em
     2026-09-22. Rode a suíte sozinha (sem os outros gates em paralelo) e diga se
     o tempo cai, para separar lentidão da suíte de lentidão por concorrência. Diga se a falha é de ambiente (por exemplo
     caminho do Windows) ou de código.
  5. Procure testes duplicados ou que afirmam quase o mesmo (mesmo alvo, mesmas
     entradas), e liste os pares.
- **Verificação:** o relatório tem os números pedidos (contagem por classe, tempo
  total, lentos, falhas, pares) e cada afirmação cita o arquivo. Não invente:
  escreva "não consegui verificar" onde for o caso.
- **Relatório:** (Executora preenche. Seja objetiva: tabelas e listas, sem
  resumo longo.)
