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

### T007 — `descrever --listar` acha as partes em subpastas

- **Status:** aberta
- **Objetivo:** `npm run descrever -- --listar` passa a listar também as partes
  que vivem em subpastas de `procedural/pecas/`, como `braco-robotico/base`.
  Hoje a lista sai vazia (só olha `.js` soltos na raiz), embora
  `npm run descrever -- braco-robotico/base` já funcione. É a terceira parte da
  fatia 8 do plano.
- **Ler antes:**
  - `CLAUDE.md` — regras do repositório
  - `docs/mecanifica/planos/2026-10-01-o-esboco-detalhado-coerente.md` — fatia 8
  - `tools/mecanifica/descrever-peca.mjs` — linhas 27 a 33 montam a lista e
    103 a 112 a imprimem
  - `tools/mecanifica/resolver-caminho-receita.mjs` — já resolve
    `objeto/parte` para `objeto/partes/parte`; use a mesma convenção
  - `tools/mcp/perfis/revisao.mjs` (linha 192) e `tools/mcp/mcp.test.mjs`
    (linhas 222 e 227) — usam `PECAS_DISPONIVEIS`; entenda o efeito antes de mexer
  - `tools/mecanifica/ativar-bancada.test.mjs` (comentário na linha 28)
  - `procedural/pecas/braco-robotico/partes/` — a estrutura real
- **Mexer em:** `tools/mecanifica/descrever-peca.mjs` e um teste novo ou já
  existente de `descrever` (por exemplo `tools/mecanifica/descrever-partes.test.ts`).
- **Não mexer em:** o valor exportado `PECAS_DISPONIVEIS` (o MCP e seus testes o
  usam; mudá-lo faria o teste do MCP, que já é o mais lento, percorrer cada
  parte), `resolver-caminho-receita.mjs`, as receitas.
- **Passos:**
  1. Crie uma lista nova das peças com partes (`objeto/parte`), lida da pasta
     `procedural/pecas/*/partes/*/receita.js`, usada só pelo `--listar`.
  2. O `--listar` mostra as duas listas, deixando claro quais são peças soltas e
     quais são partes de um objeto, e o total de cada uma.
  3. O resultado estruturado (`resultado`) ganha o campo novo sem tirar
     `disponiveis`.
  4. Teste: `--listar` traz `braco-robotico/base`, `braco-robotico/ombro`,
     `braco-robotico/anel-cintura` e `braco-robotico/ombro-tambor`, e
     `disponiveis` continua como antes.
  5. No relatório, diga se o MCP deveria aceitar o nome `objeto/parte` também.
     Só relate; não mude.
- **Verificação:**
  - `npx vitest run` do teste alterado e de `tools/mcp/mcp.test.mjs` passam; cole
    o resultado.
  - Cole a saída real de `npm run descrever -- --listar`.
  - Não afirme que passa no Linux se não rodou lá.
- **Relatório:** (Executora preenche.)
