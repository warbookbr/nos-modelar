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

- **Status:** feita
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
- **Relatório:** Feito. `ESCALA_DA_NOTA` (esboco.mjs) é a mesma frase na pergunta da nota da unidade e do Marco e no agente `critico-visual.md`; `vereditoAnterior` lê `estado.vereditos` e o brief da unidade e do Marco traz nota e motivo da última rodada só quando existe; `descricaoDasVizinhas` (detalhe.js) devolve `{ id, rotulo, unidade, funcao }` das formas em cinza e entra no brief da unidade e, por unidade nova, no do Marco. As imagens seguem sem legenda; proposta, sem fazer: pôr o `id` também na imagem só se o crítico ainda errar a peça mesmo com a lista em texto. README do esboço atualizado.

  Testes novos (critico.test.js): escala nas perguntas e no agente, brief da unidade e do Marco com e sem veredito anterior, vizinha com id, rótulo, unidade e função. Desvio: o "Não mexer em" citava `modulos/catalogo-de-familias/`, que não existe, e foi ignorado conforme a correção da Planejadora. O `vizinhos.test.js` e o `nota-do-critico.test.js` não precisaram de mudança.

  `npx vitest run modulos/esboco/tests/critico.test.js modulos/esboco/tests/nota-do-critico.test.js modulos/esboco/tests/vizinhos.test.js`: 3 arquivos, 30 testes passados.
  `npx vitest run modulos/esboco`: 38 arquivos, 752 testes passados.
  `npm run gates`: 33/33 verdes (inclui mapa:check e docs:links:check).

  Brief real do `--feito fila` numa fixture com veredito anterior (nota 6) e a vizinha `p` da unidade `ponta`:

```
--- brief para o crítico cego ---
Função da unidade: fileira de caixas encostadas que faz o corpo do objeto
Veredito anterior (rodada passada): nota 6, motivo: a ponta da direita fica no ar
Diga, para cada defeito desse motivo, se foi resolvido ou não, e não conte como novo o que já foi apontado.
Imagens (as quatro vistas da unidade isolada, sem legenda; as peças em contorno claro são de outras unidades e só mostram onde esta se prende, não as julgue):
  f/g-critico-fila/g-unidade-fila-isometrica.png
  f/g-critico-fila/g-unidade-fila-frontal.png
  f/g-critico-fila/g-unidade-fila-lateral.png
  f/g-critico-fila/g-unidade-fila-superior.png
Peças em cinza (de outras unidades, só mostram onde esta se prende; as imagens seguem sem legenda):
  p (tampa): unidade ponta, função: tampa que fecha a fila
Ligações da unidade em texto (o --ligacoes: quem toca quem, em quantos pontos distintos, pontas livres); confira se as imagens mostram o mesmo:
  unidade fila (9 formas; função: fileira de caixas encostadas que faz o corpo do objeto):
    toca ponta: 1 ponto (c8 em p [180 10 0])
    pontas livres: nenhuma
Responda, olhando só as imagens:
  1. Que pontas ficam no ar, sem encostar em nada?
  2. O que atravessa o quê, sem que a forma explique a travessia?
  3. O que está fora do lugar em relação à parte a que deveria estar preso?
  4. O que a vista mostra que o nome da peça não explica?
  5. Nota de 0 a 10 para a unidade como parte do objeto, com a razão em uma frase. Escala: 10: nenhum achado. 8 e 9: só detalhe de superfície, acabamento ou proporção fina. 5 a 7: pelo menos um defeito estrutural (ponta no ar, travessia sem explicação, peça fora de onde deveria estar presa, peça sem função). 0 a 4: a unidade não cumpre a funcao. Nota abaixo de 8 tem de citar o defeito estrutural que a puxou; detalhe de superfície sozinho não desce a nota abaixo de 8.
--- fim do brief ---
```
