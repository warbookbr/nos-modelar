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

### T005 — Testes que falham no Windows por caminho

- **Status:** aberta
- **Objetivo:** os testes que hoje falham na máquina Windows passam, sem deixar
  de passar em Linux (o CI roda em Linux). A causa, medida na T004, é
  `new URL(...).pathname`, que no Windows vira `/C:/...` e depois `C:\C:\...`.
- **Ler antes:**
  - `CLAUDE.md` — regras do repositório
  - `.github/workflows/ci.yml` — o CI roda em que sistema
  - `modulos/esboco/tests/leitura.test.js` (linha 15 define `caminho`) — o
    padrão a corrigir
  - os outros arquivos com `.pathname` nos testes: `correcoes-do-fluxo.test.js`,
    `atritos-da-refeita.test.js`, `esperado.test.js`, `edicao.test.js`,
    `unidades.test.js` (todos em `modulos/esboco/tests/`) e
    `tools/mecanifica/analise-da-peca.test.mjs`
  - `tools/modelagem/revisor-limitado.test.mjs` — falha por
    `node: bad option: --permission`
- **Mexer em:** só os arquivos de teste citados acima.
- **Não mexer em:** código de produção (`src/`, `tools/` que não seja teste), a
  config do Vitest, os outros testes.
- **Passos:**
  1. Troque `new URL(x, base).pathname` por `fileURLToPath(new URL(x, base))`
     (`import { fileURLToPath } from 'node:url'`) em cada arquivo. É a mesma
     mudança em todos.
  2. Em `unidades.test.js`, a asserção de `INIT_CWD` compara com caminho POSIX
     (`/tmp/...`); torne-a independente do sistema (por exemplo com
     `path.resolve`), sem enfraquecer o que ela prova.
  3. Em `correcoes-do-fluxo.test.js`, se houver falha por quebra de linha CRLF,
     diga qual asserção e corrija só ela.
  4. `revisor-limitado.test.mjs`: não conserte. Diga se o teste poderia detectar
     que o Node não suporta `--permission` e ser pulado com motivo, ou se isso
     esconderia um problema real. Deixe a decisão no relatório.
- **Verificação:**
  - Rode cada arquivo alterado sozinho (`npx vitest run <arquivo>`) e cole o
    resultado.
  - Rode `npx vitest run modulos/esboco tools/mecanifica/analise-da-peca.test.mjs`
    e cole o resumo.
  - Diga quais falhas sobraram e por quê. Não afirme que passa no Linux se não
    rodou lá: escreva "não verifiquei no Linux".
- **Relatório:** (Executora preenche.)
