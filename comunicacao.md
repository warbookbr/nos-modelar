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

### T016 — Revisão de rumo do Mecanifica (só leitura e escrita do relatório)

- **Status:** aberta
- **Objetivo:** uma revisão de rumo de uma página, para a pessoa decidir para
  onde o projeto vai. Ela compara a abordagem atual com alternativas, e não só
  sugere como melhorar a atual.
- **O que a pessoa quer** (não está escrito em nenhum arquivo, por isso vai
  aqui): um sistema potente o bastante para que modelar qualquer coisa fique
  simples, rápido e barato. A IA é sempre a usuária. O projeto é dela e pode
  mudar no que for preciso. Ela não quer avançar em migalhas, consertando um
  problema de cada vez; quer não recriar a roda, aproveitando o que já existe no
  mundo e criando só o que falta; e quer cobrir modelagem geral (as famílias de
  `FAMILIAS-DE-OBJETOS.md`), com os orgânicos para depois.
- **Ler antes:**
  - `CLAUDE.md`, `docs/mecanifica/INDEX.md`, `docs/mecanifica/VISAO.md`
  - `docs/mecanifica/planos/README.md` e o plano ativo
    `docs/mecanifica/planos/2026-10-06-o-catalogo-de-familias.md`
  - `docs/mecanifica/planos/encerrados/2026-10-01-o-esboco-detalhado-coerente.md`
    — "Fechamento": a medição de custo e de notas do crítico
  - `docs/mecanifica/AUTORIA-IA.md` e `docs/mecanifica/ARQUITETURA.md`
  - `docs/mecanifica/FAMILIAS-DE-OBJETOS.md`, `ELEMENTOS-DE-OBJETOS.md` e
    `TECNICAS-DE-FORMA.md` — o que vai ser modelado, os elementos e o que falta
  - `docs/mecanifica/historico/LEVANTAMENTO-IA-3D-2026-10.md` — o que existe
    fora, conferido
  - `docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md` e
    `modulos/esboco/README.md` (seções "Formas" e "O Condutor") — o que o
    núcleo e o esboço fazem
- **Mexer em:** nada do repositório. Escreva só em "Relatório", abaixo.
- **Não mexer em:** qualquer arquivo.
- **O que escrever, nesta ordem:**
  1. Objetivo em uma frase: o que o sistema deve permitir, e para quem.
  2. Critérios de sucesso: 3 a 5 medidas objetivas que dizem se chegamos lá
     (por exemplo custo em tokens por objeto, rodadas até aceite, cobertura das
     famílias, taxa de objetos que funcionam).
  3. Estado atual: o que existe e funciona, o que foi medido e o que falhou.
  4. Plano atual: o que está planejado e as suposições que ele faz sem dizer.
  5. Alternativas: 3 abordagens diferentes da atual. Uma tem de mudar a base
     técnica (por exemplo trocar o núcleo próprio de malha por um kernel de CAD
     maduro ou por ferramentas existentes orquestradas pela IA), e uma tem de ser
     uma ideia que não aparece em nenhum dos arquivos lidos. Para cada uma:
     ganho, custo, risco, tempo e se a decisão é reversível. Inclua a atual na
     mesma tabela, para comparar.
  6. Recomendação: qual seguir, por quê, e o que faria mudar de ideia.
  7. Primeiro passo: o menor experimento que prova ou derruba a recomendação,
     com o resultado esperado e quanto custa.
  8. O que você não sabe e precisaria pesquisar.
- **Roteiro de subagentes:** a revisão é escrita por você, do começo ao fim;
  os subagentes só servem a ela.
  - Leitura, 2 subagentes em paralelo. O primeiro lê `CLAUDE.md`, `INDEX.md`,
    `VISAO.md`, `planos/README.md`, o plano ativo e o plano encerrado; o segundo
    lê `AUTORIA-IA.md`, `ARQUITETURA.md`, `FAMILIAS-DE-OBJETOS.md`,
    `ELEMENTOS-DE-OBJETOS.md`, `TECNICAS-DE-FORMA.md`, o levantamento do
    histórico, o catálogo gerado e as seções do README do esboço. Cada um
    devolve só uma lista de fatos, cada fato com o caminho do arquivo e a
    seção, sem opinião. Você escreve os pontos 1 a 4 a partir dessas listas.
  - Alternativas, 1 subagente novo, que não leu nenhum arquivo do projeto.
    Ele recebe só o bloco "O que a pessoa quer" acima, os critérios de sucesso
    que você escreveu no ponto 2 e uma frase dizendo que hoje o projeto tem um
    núcleo geométrico próprio de malha, um módulo de esboço em formas simples e
    um plano de catálogo de famílias paramétricas. Ele devolve 5 abordagens
    diferentes, cada uma com o mecanismo em 3 frases. Você escolhe 3 delas
    para o ponto 5, respeitando as duas exigências do ponto 5, e diz por que
    escolheu essas.
  - Revisão, 1 subagente novo, adversarial, quando o texto estiver pronto. Ele
    confere se cada caminho citado existe e se a seção diz o que o texto
    afirma, e procura o que derrubaria a recomendação. Você corrige o que ele
    apontar e cola no fim do relatório a lista do que ele achou e do que você
    mudou.
- **Regras:** separe fato de opinião. Todo fato cita a evidência: o caminho de
  um arquivo que existe (com a seção) ou o hash de um commit. Fato sem
  evidência vira opinião ou sai. Onde não houver evidência, escreva "não sei".
  A Planejadora vai conferir por script se cada caminho citado existe. Uma
  página, sem rodeio.
- **Relatório:** (Executora preenche com a revisão.)

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
