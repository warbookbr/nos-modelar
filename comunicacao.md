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

### T002 — Nota de passagem no Condutor

- **Status:** aberta
- **Objetivo:** o Condutor passa a guardar, por unidade, uma nota de passagem (o
  porquê das escolhas feitas na unidade), para que o esbocista seguinte, que
  começa do zero, a leia. Vale só no modo "um esbocista novo por unidade"; o modo
  atual (um esbocista por objeto) segue sem exigir a nota. É o item 8 do plano,
  segunda parte, e a T003 depende dela.
- **Ler antes:**
  - `CLAUDE.md` — regras do repositório
  - `docs/mecanifica/planos/2026-10-01-o-esboco-detalhado-coerente.md` — fatia 8
  - `modulos/esboco/README.md` — seções "O Condutor" e "A nota do crítico no
    Condutor" (o veredito, as rodadas e a `--liberar` são o modelo a imitar)
  - `modulos/esboco/src/condutor.js` — o estado (`vereditos`, `liberacoes`,
    `historico`, versão do estado) e como o `--veredito` grava e bloqueia
  - `modulos/esboco/tests/condutor.test.js` — como o Condutor é testado
  - `tools/mecanifica/esboco.mjs` — a linha de comando que recebe as opções
  - `.claude/skills/laco-de-modelagem/SKILL.md` — como `notaDePassagem` é
    exigida e limitada ali (procure "notaDePassagem"; o limite de 240 caracteres
    é da `observacao`, use o mesmo para a nota)
- **Mexer em:** `modulos/esboco/src/condutor.js`, `tools/mecanifica/esboco.mjs`,
  `modulos/esboco/tests/condutor.test.js`, a seção "O Condutor" do
  `modulos/esboco/README.md`.
- **Não mexer em:** as skills e os agentes (a T003 cuida deles),
  `descrever-peca.mjs`, o plano.
- **Passos:**
  1. Acrescente ao estado do Condutor `modo` (`objeto`, o padrão, ou
     `por-unidade`) e `notasDePassagem`. Campos novos são opcionais; estado
     antigo continua válido e sobe de versão como as `liberacoes` fizeram.
  2. Comando para escolher o modo: `--condutor <arquivo> --modo por-unidade`.
  3. Comando para gravar a nota:
     `--condutor <arquivo> --nota-de-passagem <unidade> --texto <texto>`. Recusar
     texto vazio ou com mais de 240 caracteres, e unidade que não existe.
  4. No modo `por-unidade`, o `--feito` de uma unidade com brief recusa, com
     código 1 e mensagem clara, enquanto a nota dela não tiver sido gravada.
     No modo `objeto` nada muda.
  5. `--condutor <arquivo> --historico` mostra as notas de passagem.
  6. Testes que falhavam antes: nota gravada, nota vazia ou longa recusada,
     `--feito` recusado sem nota no modo novo, aceito com nota, e modo `objeto`
     intocado.
- **Verificação:**
  - `npx vitest run modulos/esboco` passa.
  - `npm run gates` passa, ou cole a falha real e diga se já existia.
  - Cole a saída real dos comandos novos numa rodada de exemplo.
- **Relatório:** (Executora preenche: o que fez, o que rodou, o que falhou,
  dúvidas, decisões de desenho que tomou.)

### T003 — Modo "um esbocista novo por unidade" na `laco-do-esboco`

- **Status:** aberta (só depois da T002 feita e revisada)
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
