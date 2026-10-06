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

### T015 — Fontes e decisões da análise de padrões

- **Status:** aberta
- **Objetivo:** deixar confiáveis as `fontes` e a `decisao` de cada elemento em
  `docs/mecanifica/elementos-de-objetos.json` e no `ELEMENTOS-DE-OBJETOS.md`.
  A decomposição e as frequências da T014 estão certas e não mudam.
- **O que a revisão da T014 achou:**
  - dos 118 links marcados `confirmado`, 28 dão 404. A maior parte é BOSL2 com a
    organização errada (`Belfast-OpenSCAD-Library`; a certa é `BelfrySCAD`, e
    com ela as páginas existem), páginas do build123d e repositórios que não
    existem (`FreeCAD/FreeCAD-curves`, `vslot-poland/cadquery-sheetmetal` e
    outros);
  - 49 links do Onshape têm nome legível (`cad.onshape.com/documents/hinge-featurescript`).
    Documento do Onshape tem identificador hexadecimal de 24 caracteres; esse
    formato não existe, e o site devolve 200 para qualquer endereço;
  - a decisão ficou 50 `converter`, 3 `criar` e 0 `já temos`, e não distingue
    mais nada; as características de cada elemento (passo 4 da T014) não foram
    gravadas no JSON.
- **Ler antes:**
  - `CLAUDE.md`
  - `docs/mecanifica/elementos-de-objetos.json` e `ELEMENTOS-DE-OBJETOS.md`
  - `docs/mecanifica/INDEX.md`, entrada "O que já existe", e os três destinos
- **Mexer em:** só os dois arquivos acima. Intermediários numa pasta temporária
  fora do repositório. Sem commit.
- **Não mexer em:** `objetos` e `frequencia` no JSON, e qualquer outro arquivo.
- **Passos:**
  1. Conserte o que for só endereço errado (por exemplo trocar a organização do
     BOSL2) e procure o endereço certo do que mudou de lugar. O que não tiver
     endereço que funcione sai.
  2. Link do Onshape só vale se for documento com identificador hexadecimal de
     24 caracteres ou página da documentação oficial (`cad.onshape.com/FsDoc/...`)
     que exista. Os de nome legível saem, a menos que você ache o documento real.
  3. Rode o conferidor de links abaixo sobre o JSON final. Toda fonte com status
     `confirmado` tem de ter link que responde 200 e não pode ser Onshape de nome
     legível. Ele precisa imprimir `quebrados 0` e `onshape_invalidos 0`.
  4. Para cada elemento, grave no JSON o campo `caracteristicas`: a lista do que
     define o elemento (por exemplo, fixador: cabeça com forma, haste, rosca) e,
     para cada característica, se o projeto gera, citando a forma do esboço ou a
     operação do núcleo, ou `não`.
  5. A decisão passa a ter quatro valores: `já temos` (gera todas as
     características), `temos parcial` (gera parte; o campo `falta` lista o
     resto), `converter` (não gera nenhuma, e há fonte confirmada com a ideia) e
     `criar` (não gera nenhuma, e não há fonte confirmada).
  6. Regere as tabelas do `.md` a partir do JSON, por script, com a coluna
     `falta` nos elementos `temos parcial`.
- **Conferidor de links** (Python, rode no fim e cole a saída real):
  ```python
  import json, re, urllib.request
  d = json.load(open('docs/mecanifica/elementos-de-objetos.json', encoding='utf-8'))
  urls = set()
  for e in d['elementos']:
      for f in e['fontes']:
          if f.get('status') == 'confirmado':
              urls |= {u.rstrip('.').rstrip('"') for u in re.findall(r'https?://[^\s,;)"]+', json.dumps(f, ensure_ascii=False))}
  quebrados, onshape = [], []
  for u in sorted(urls):
      if 'onshape.com/documents/' in u and not re.search(r'/documents/[0-9a-f]{24}', u):
          onshape.append(u); continue
      try:
          r = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=20)
          if r.status != 200: quebrados.append((r.status, u))
      except Exception as x:
          quebrados.append((str(x)[:40], u))
  print('links', len(urls)); print('quebrados', len(quebrados), quebrados); print('onshape_invalidos', len(onshape), onshape)
  ```
  Cole também a contagem de decisões e o conferidor de frequência da T014, que
  tem de continuar com `divergem 0`.
- **Relatório:** (Executora preenche só o resumo e as saídas dos conferidores.)

### T012 — Crítico com escala ancorada, defeitos anteriores e nome nas vizinhas (fatia 1, parte B)

- **Status:** aberta (pode correr junto da T015)
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
