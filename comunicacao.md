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

### T012 — Crítico com escala ancorada, defeitos anteriores e nome nas vizinhas (fatia 1, parte B)

- **Status:** aberta
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
