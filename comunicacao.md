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

### T008 — Timeout do cliente MCP do teste estoura por carga

- **Status:** aberta
- **Objetivo:** `tools/mcp/mcp.test.mjs` deixa de falhar com `tempo esgotado para
  initialize` quando roda junto de outros testes e gates. Num `npm run gates`
  completo no Windows, 2 testes do perfil `revisao` falharam assim; o mesmo
  arquivo passou (39 testes) quando rodou sozinho. É falha por contenção de CPU,
  não defeito do servidor.
- **Ler antes:**
  - `CLAUDE.md` — regras do repositório
  - `vitest.config.ts` — o comentário em `testTimeout: 180_000` e `maxWorkers`
    explica a política do repositório: falha por contenção é falso vermelho, e o
    orçamento tem de caber no trabalho real
  - `tools/mcp/mcp.test.mjs` — linhas 105 a 130 (o cliente de teste) e 150 a 155
    (outro `timeout: 5_000`)
- **Mexer em:** só `tools/mcp/mcp.test.mjs`.
- **Não mexer em:** o servidor MCP, `vitest.config.ts`, os outros testes.
- **Passos:**
  1. No cliente de teste, o `setTimeout` de `enviar` (5_000, linha 112) e o de
     `fechar` (5_000, linha 126) são limites curtos que a política acima
     dispensa. Suba para um valor alinhado ao resto da suíte (sugestão: 30_000) e
     escreva um comentário curto dizendo por quê, no estilo do
     `vitest.config.ts`.
  2. Olhe o `timeout: 5_000` da linha 152 e diga no relatório se é o mesmo caso.
     Mude só se for.
  3. Confirme que o limite maior não esconde travamento: um servidor que nunca
     responde ainda deve falhar, só mais tarde. Diga como você verificou.
- **Verificação:**
  - `npx vitest run tools/mcp/mcp.test.mjs` passa; cole o resumo real.
  - Rode também junto de outro arquivo pesado, por exemplo
    `npx vitest run tools/mcp/mcp.test.mjs modulos/esboco/tests/projecao.test.js`,
    e cole o resumo real.
  - Cole saídas reais, inclusive falhas. Não resuma gates que você não rodou: na
    T007 o relatório trouxe uma lista de gates que não existe neste repositório.
  - Não afirme que passa no Linux se não rodou lá.
- **Relatório:** (Executora preenche.)
