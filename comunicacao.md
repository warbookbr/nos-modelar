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

### T014 — Correção da análise de padrões (T013)

- **Status:** aberta
- **Objetivo:** tornar `docs/mecanifica/elementos-de-objetos.json` e
  `docs/mecanifica/ELEMENTOS-DE-OBJETOS.md` consistentes e confiáveis. A
  revisão da T013 achou, recalculando a partir do próprio JSON:
  - dos 53 elementos, 24 têm a frequência que os objetos mostram e 29 não. Os 29
    são os que entraram no vocabulário v2 e não estão marcados em nenhum objeto,
    embora o relatório lhes dê frequência alta ("trava ou fecho" 226 objetos,
    "placa de circuito" 180, com 0 nos dados). Nove do top 15 são desses;
  - marcação inflada: "fixador" em 340 de 364 objetos, "vidro ou painel" em
    palete, "fixador" em garrafa;
  - "já temos" frouxo: fixador conta como existente por causa de um cilindro
    liso chamado parafuso, sem cabeça nem rosca;
  - fontes que não correspondem ao elemento (modificador Screw para fixador,
    restrição Child Of para articulação, Array para pneu) e normas com 100% de
    confirmação;
  - o relatório diz 27 famílias, mas são 28; a coluna de técnicas das tabelas
    saiu vazia.
  A cópia do JSON na raiz já foi apagada.
- **Ler antes:**
  - `CLAUDE.md`
  - `docs/mecanifica/FAMILIAS-DE-OBJETOS.md`
  - `docs/mecanifica/elementos-de-objetos.json` e
    `docs/mecanifica/ELEMENTOS-DE-OBJETOS.md` (o que vai ser corrigido)
  - `docs/mecanifica/INDEX.md`, entrada "O que já existe", e os três destinos
- **Mexer em:** só os dois arquivos acima. Intermediários e scripts numa pasta
  temporária fora do repositório. Sem commit.
- **Não mexer em:** qualquer outro arquivo.
- **Passos (use subagentes nos passos 1, 2, 4 e 5, com os seis grupos de
  famílias da T013):**
  1. Marcação dos 29 elementos do v2: cada grupo recebe a lista dos 29 com as
     definições e marca em quais objetos do grupo cada um aparece. O resultado
     vai para `objetos[].elementos`.
  2. Revisão da marcação inteira, com esta regra: marque um elemento só se o
     objeto tem uma peça desse tipo que precisaria ser modelada num esboço de
     nível médio, visível ou necessária para a função. Não marque por
     possibilidade ("toda máquina tem algum parafuso"). Cada grupo devolve as
     marcações que tirou e as que pôs, com o motivo em poucas palavras.
  3. Por script: a `frequencia` de cada elemento (objetos e famílias) passa a
     ser calculada a partir de `objetos`, e as tabelas do `.md` também saem do
     JSON por script, não à mão. O ranking passa a ser por número de objetos,
     entre os que não são `já temos`, e mostra os 15 primeiros.
  4. "Já temos" estrito: para cada elemento hoje `já temos`, liste as
     características que o definem (por exemplo, fixador: cabeça com forma,
     haste, rosca; pneu: seção, banda com desenho, flancos) e diga, citando a
     forma do esboço ou a operação do núcleo, se o projeto gera cada uma. Se
     falta alguma característica que define o elemento, a decisão passa a
     `converter` ou `criar`.
  5. Fontes: uma fonte só conta para um elemento se ela gera ou opera a forma
     característica dele; o resto sai do elemento. Para cada norma técnica,
     diga o que foi verificado de fato (página do órgão com título e escopo) e
     se a tabela de medidas está acessível de graça; se não está, marque
     `existe, tabela paga` em vez de `confirmado`.
  6. Corrija o total de famílias para 28 e preencha a coluna de técnicas a
     partir do JSON.
- **Verificação:** rode este conferidor (Python) sobre o JSON final e cole a
  saída real; ele precisa imprimir `divergem 0`:
  ```python
  import json, collections
  d = json.load(open('docs/mecanifica/elementos-de-objetos.json', encoding='utf-8'))
  f = collections.Counter(); fam = collections.defaultdict(set)
  for o in d['objetos']:
      for e in set(o['elementos']): f[e] += 1; fam[e].add(o['familia'])
  div = [e['elemento'] for e in d['elementos']
         if e['frequencia']['total_objetos'] != f[e['elemento']]
         or e['frequencia']['total_familias'] != len(fam[e['elemento']])]
  fora = set(f) - {e['elemento'] for e in d['elementos']}
  print('divergem', len(div), div); print('fora do vocabulario', fora)
  print('familias', len({o['familia'] for o in d['objetos']}))
  ```
  Cole também as 10 maiores e as 10 menores frequências, a lista de mudanças
  de decisão do passo 4 e a saída de `npm run mapa` e `npm run docs:links:check`.
- **Relatório:** (Executora preenche só o resumo e a saída do conferidor.)

### T012 — Crítico com escala ancorada, defeitos anteriores e nome nas vizinhas (fatia 1, parte B)

- **Status:** aberta (pode correr junto da T014)
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
