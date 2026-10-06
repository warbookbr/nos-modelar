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

### T011 — Levantamento: modificadores, addons e bibliotecas de forma úteis ao catálogo (só leitura)

- **Status:** aberta
- **Aviso:** esta T011 substitui a anterior (formato do catálogo), que foi
  retirada antes de alinharmos como as capacidades chegam ao esboço e ao
  Mecanifica. Se você já começou a anterior, pare, não apague nada e liste no
  relatório os arquivos que criou ou mudou.
- **Objetivo:** saber o que já existe de melhor para gerar formas mecânicas
  difíceis e operar sobre formas, para decidirmos quais ferramentas o catálogo
  de famílias implementa primeiro no esboço e depois no Mecanifica. A pesquisa
  começa pelo Blender (modificadores, Geometry Nodes e addons, inclusive os que
  não conhecemos) e inclui qualquer outra fonte útil: bibliotecas paramétricas
  de CAD por código, workbenches do FreeCAD, scripts de recursos do Onshape e o
  que mais você achar. Ideia se reimplementa; código de terceiro não entra no
  repositório.
- **Ler antes:**
  - `CLAUDE.md`
  - `docs/mecanifica/planos/2026-10-06-o-catalogo-de-familias.md` — o que é
    ferramenta e família, e as famílias escolhidas (`pneu`, `roda`,
    `cilindroHidraulico`; depois mola com amortecedor, esteira e fixadores)
  - `modulos/esboco/README.md` — seções "Formas", "Espelho e arranjo", "A faixa
    `envolve`", "Estilos, simetria implícita e perfis por função" e
    "Componentes": o que o esboço já faz
  - `docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md` — as operações que o núcleo
    do Mecanifica já tem
  - `LICENSE` — o repositório é MIT
- **Mexer em:** nada do repositório. Escreva só em "Relatório".
- **Não mexer em:** qualquer arquivo.
- **Antes de tudo:** sem acesso à web, escreva isso, marque `Status: bloqueada`
  e pare. Não responda de memória.
- **Passos:**
  1. Blender: percorra a lista oficial de modificadores da versão atual (todas
     as categorias) e os nós de Geometry Nodes que geram ou operam forma
     (curva para malha, instanciar em pontos, arredondar curva, e os outros).
     Fique com os que servem a peça mecânica.
  2. Addons do Blender: os que vêm na plataforma oficial de extensões e os de
     terceiros conhecidos por gerar peça mecânica (parafuso e porca,
     engrenagem, conexão de tubo, mola, cabo e mangueira, corrente, esteira,
     esboço com restrições, booleana, chanfro e arredondamento). Procure além
     desses exemplos; o objetivo é achar o que não conhecemos.
  3. Fora do Blender: bibliotecas paramétricas de CAD por código e de
     modelagem (por exemplo as de OpenSCAD e CadQuery), workbenches do FreeCAD
     e recursos do Onshape que gerem famílias mecânicas. Confira cada nome que
     citar: se não achar a fonte, não cite.
  4. Para cada item, uma linha de tabela: nome; fonte com link, versão e data da
     consulta; licença; o que faz em uma frase; parâmetros principais; se é
     determinístico (mesmos parâmetros, mesmo resultado); se empilha sobre
     qualquer forma ou gera forma do zero; que família do plano usaria; e se o
     esboço ou o núcleo já tem algo equivalente, citando o nome da forma ou da
     operação nos arquivos lidos acima.
  5. No fim, as 10 ferramentas que você implementaria primeiro, em ordem, cada
     uma com uma frase de motivo, dizendo quais famílias ela destrava e se já
     existe meio pronta no esboço ou no núcleo. Separe as que valem para o
     esboço (formas primitivas, rápidas) das que só fazem sentido no
     Mecanifica (malha detalhada).
- **Verificação:** cada item tem link e data. Separe o que você viu na
  documentação ou no código-fonte do que é descrição de loja ou propaganda. Não
  preencha lacuna com valor plausível; escreva "não encontrei".
- **Relatório:** (Executora preenche. Tabelas por fonte, e a lista dos 10 no fim.)

### T012 — Crítico com escala ancorada, defeitos anteriores e nome nas vizinhas (fatia 1, parte B)

- **Status:** aberta (pode correr junto da T011)
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
