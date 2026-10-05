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

### T006 — `analise-da-peca.test.mjs` com barras no Windows

- **Status:** aberta
- **Objetivo:** os 2 testes que falham no Windows por `\` contra `/` passam, sem
  mexer no código de produção.
- **Ler antes:**
  - `CLAUDE.md` — regras do repositório
  - `tools/mecanifica/analise-da-peca.test.mjs` — linhas 12, 43 e 57 esperam
    caminhos com `/` (`${PASTA}/manifesto.json`, `${PASTA}/zoom-frontal-arame.png`)
  - `tools/mecanifica/analise-da-peca.mjs` — linhas 127, 145, 154 e 164 montam a
    lista `arquivos` com `path.relative`, que no Windows devolve `\`
- **Mexer em:** só `tools/mecanifica/analise-da-peca.test.mjs`.
- **Não mexer em:** `analise-da-peca.mjs` nem outro arquivo.
- **Passos:**
  1. Nos pontos que comparam caminho devolvido pela ferramenta, normalize as
     barras antes de comparar (por exemplo `.replaceAll('\\', '/')` no valor
     devolvido). Não enfraqueça a asserção: ela deve continuar provando o mesmo
     caminho.
  2. No relatório, diga se o `manifesto.json` gravado em disco também sai com
     `\` no Windows (abra o arquivo gerado) e se isso seria um problema para
     quem o lê em outro sistema. Só relate; não corrija.
- **Verificação:**
  - `npx vitest run tools/mecanifica/analise-da-peca.test.mjs` passa; cole o
    resultado.
  - Não afirme que passa no Linux se não rodou lá: escreva "não verifiquei no
    Linux".
- **Relatório:** (Executora preenche.)
