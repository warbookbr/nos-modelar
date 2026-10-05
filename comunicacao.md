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

### T002 — Modo "um esbocista novo por unidade" na `laco-do-esboco`

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
  - `modulos/esboco/README.md` — procure "Condutor", `--historico`, `--veredito`
    e `--liberar`, para saber o que já fica gravado em disco
  - `modulos/esboco/tests/skill.test.js` — testa as skills; pode ser preciso
    cobrir o modo novo
- **Mexer em:** `.claude/skills/laco-do-esboco/SKILL.md`,
  `.claude/agents/esbocista.md` (só o necessário para aceitar a unidade e a nota
  de passagem no brief), `modulos/esboco/tests/skill.test.js`.
- **Não mexer em:** código do módulo (`modulos/esboco/src/`) — se a nota de
  passagem precisar de campo novo no Condutor, pare e registre em "Relatório"
  como bloqueio; `laco-de-modelagem`; a skill `esboco-detalhado`; o plano.
- **Passos:**
  1. Leia o `laco-de-modelagem` e veja como ele passa o estado entre etapas.
  2. Em `laco-do-esboco`, descreva os dois modos: objeto inteiro com um
     esbocista (o atual) e um esbocista novo por unidade. Diga quando usar cada
     um e que o segundo é o que a fatia 9 vai medir contra o primeiro.
  3. No modo novo, descreva o brief de cada esbocista: objeto, nível, pasta, a
     unidade a fazer, e o que ele lê do disco (plano, Condutor com
     `--historico`, vereditos e a nota de passagem da unidade anterior). O
     esbocista anterior não é retomado por `SendMessage`.
  4. Defina onde a nota de passagem fica gravada e o que ela contém (o porquê
     das escolhas, não o que foi feito), com limite de tamanho como no
     `laco-de-modelagem`. Se o Condutor não comportar isso, é bloqueio.
  5. Diga como fica a regra da nota abaixo de 8 no modo novo: refazer a mesma
     unidade com um esbocista novo que lê o motivo do crítico no disco.
  6. Ajuste o `esbocista.md` para aceitar esse brief.
- **Verificação:**
  - `npx vitest run modulos/esboco` passa.
  - `npm run mapa:check` e `npm run docs:links:check` passam.
  - Cole a saída real de cada um, inclusive falhas.
- **Relatório:** (Executora preenche: o que fez, o que rodou, o que falhou,
  dúvidas.)
