# Comunicação entre IAs

Canal de trabalho entre duas IAs neste repositório.

- **Planejadora** (Claude Code na nuvem): planeja, despacha tarefas e revisa.
- **Executora** (Claude Code local, na máquina da pessoa): executa e reporta aqui.

## Regras

1. A Planejadora escreve em "Tarefas". A Executora escreve só em "Relatório" da
   própria tarefa e no campo `Status`.
2. Uma tarefa por seção, numerada, sem reescrever as antigas.
3. Antes de começar, a Executora lê os arquivos de "Ler antes" e o `CLAUDE.md`, e
   não lê além disso sem necessidade.
4. Não sair do escopo da tarefa. Se algo fora do escopo parecer necessário, parar,
   registrar em "Relatório" e marcar `Status: bloqueada`.
5. Rodar o que a tarefa pedir em "Verificação" e colar o resultado real, inclusive
   falhas.
6. Commit e push só quando a tarefa disser, e só na branch que ela nomear.

Este arquivo é volátil: guarda só a tarefa em andamento. O histórico fica nos
commits e no plano; a Planejadora limpa a tarefa depois de revisá-la.

Status possíveis: `aberta` → `em andamento` → `feita` | `bloqueada`.

## Tarefas

### T016 — Refazer os quatro esboços do banco de provas pelo caminho curto

- **Status:** aberta
- **Objetivo:** medir quanto custa hoje esboçar os quatro objetos de nível médio
  do banco de provas, depois das fatias 2 a 5 do plano
  [o caminho curto da IA](docs/mecanifica/planos/2026-10-07-o-caminho-curto-da-ia.md),
  com os mesmos pedidos, o mesmo modelo e o mesmo laço da medição de 2026-10-07,
  para a Planejadora comparar. É a fatia 6 do plano. A Executora orquestra; quem
  esboça é o agente `esbocista` e quem julga é o `critico-visual`, despachados por
  ela.
- **Ler antes:**
  - `CLAUDE.md`, que já vem no contexto.
  - A saída de `npm run comecar -- modelar/laco-do-esboco`, que diz o que ler para
    conduzir o laço (a skill `laco-do-esboco`) e o que abrir sob demanda.
  - `docs/mecanifica/banco-de-provas/MEDICAO-DE-TOKENS-2026-10.md` — a medição que
    esta tarefa repete, para saber o que se compara.
- **Mexer em:** uma pasta de trabalho fora do Git para os esboços (sugestão:
  `../banco-de-provas-2026-10-08/<objeto>/`, ao lado do repositório); e, no fim,
  a pasta `docs/mecanifica/banco-de-provas/rodada-2026-10-08/` (só o que o passo 7
  pede), na branch `banco/caminho-curto`.
- **Não mexer em:** código, skills, agentes, roteiros, planos, `banco-de-provas.json`
  (a Planejadora registra) e a `main`.
- **Passos:**
  1. `git checkout main && git pull` e confira que o último commit é `58390a06` ou
     posterior. Confira que o desenho em PNG funciona: `npm run esboco --
     modulos/esboco/tests/fixtures/teste-cubo.esboco.json` tem de gravar o PNG sem
     erro (o PNG usa o Chromium do Playwright; se faltar, `npx playwright install
     chromium` e anote no relatório).
  2. Para cada objeto, na ordem abaixo, despache um agente `esbocista` **sem trocar
     o modelo** (ele é Sonnet pela definição, como na medição antiga) e **sem
     isolamento em worktree**, com exatamente o pedido abaixo, trocando só `<pasta>`
     pela pasta de trabalho do objeto:
     - carrinho de mão: `Objeto: carrinho de mão (de obra: caçamba metálica, quadro tubular com dois cabos, uma roda dianteira com pneu, dois pés de apoio). Nível de detalhe: medio. Pasta onde gravar: <pasta> (crie se não existir). Modo do Condutor: objeto. Repositório: <raiz do repositório>. Siga a skill esboco-detalhado. A cada --feito que imprimir brief do crítico, pare e devolva o caminho do brief e das imagens.`
     - cadeira de rodas: `Objeto: cadeira de rodas manual dobrável (quadro tubular, assento e encosto de lona, duas rodas traseiras grandes com aro de propulsão, dois rodízios dianteiros, apoios de pé e braços, manoplas de empurrar). Nível de detalhe: medio. Pasta onde gravar: <pasta> (crie se não existir). Modo do Condutor: objeto. Repositório: <raiz do repositório>. Siga a skill esboco-detalhado. A cada --feito que imprimir brief do crítico, pare e devolva o caminho do brief e das imagens. Ao terminar, devolva os caminhos das quatro vistas sem legenda.`
     - guarda-roupa: `Objeto: guarda-roupa de quarto (caixa de MDF com duas portas de abrir com dobradiças e puxadores, um vão com prateleiras e outro com cabideiro, duas gavetas embaixo, rodapé). Nível de detalhe: medio. Pasta onde gravar: <pasta> (crie se não existir). Modo do Condutor: objeto. Repositório: <raiz do repositório>. Siga a skill esboco-detalhado. A cada --feito que imprimir brief do crítico, pare e devolva o caminho do brief e das imagens. Ao terminar, devolva os caminhos das quatro vistas sem legenda.`
     - cadeira: `Objeto: cadeira de jantar de madeira (quatro pernas, travessas entre as pernas, assento estofado, encosto com duas travessas e montantes que continuam as pernas traseiras). Nível de detalhe: medio. Pasta onde gravar: <pasta> (crie se não existir). Modo do Condutor: objeto. Repositório: <raiz do repositório>. Siga a skill esboco-detalhado. A cada --feito que imprimir brief do crítico, pare e devolva o caminho do brief e das imagens. Ao terminar, devolva os caminhos das quatro vistas sem legenda.`
  3. No nível médio, o esbocista para quando o `--proximo` imprime o brief do
     crítico do objeto e sai com código 1. Despache então o `critico-visual` (sem
     trocar o modelo) com o texto do brief e as quatro imagens que ele cita, sem
     mais nada: nem o JSON, nem o plano, nem a história da construção. Registre o
     veredito com `npm run esboco -- --condutor <arquivo> --veredito objeto --nota
     <0-10> --motivo "<o que o crítico apontou>" --tokens <tokens do esbocista
     nesta rodada>`.
  4. Nota abaixo de 8: retome o **mesmo** esbocista (continuação da conversa, não
     um agente novo) com a nota e o motivo, e repita o passo 3. Nota 8 ou mais: o
     `--proximo` leva o Condutor a Concluído e o objeto termina. Depois de três
     rodadas abaixo de 8, pare o objeto, marque no relatório e siga para o próximo;
     **não rode `--liberar`**, que só vale com autorização da pessoa.
  5. Anote, por objeto e por rodada, os tokens que o Claude Code mostra ao fim de
     cada despacho ou retomada do esbocista, e a nota e o motivo do crítico.
  6. Ao fim dos quatro, ache a transcrição JSONL de cada esbocista (fica em
     `~/.claude/projects/<pasta do projeto>/<id da sessão>/subagents/agent-<id>.jsonl`;
     no Windows, `C:\Users\<usuário>\.claude\projects\...`) e rode
     `npm run medir:transcricao -- <as quatro transcrições>`.
  7. Copie para `docs/mecanifica/banco-de-provas/rodada-2026-10-08/<objeto>/` o
     `.esboco.json` final, o `.condutor.json` e a composta (`npm run esboco --
     <arquivo> --composta`) de cada objeto. Faça um commit só com essa pasta, na
     branch `banco/caminho-curto` criada a partir da `main`, com mensagem em pt-BR,
     e dê push dessa branch. Não abra PR e não mexa na `main`.
- **Verificação:**
  - `npm run medir:transcricao -- <as quatro transcrições>`: cole a saída inteira.
  - Em cada transcrição, a etapa `leitura: README do esboço` tem de estar ausente
    ou em zero (o gate de saída do plano pede que o esbocista não leia o README do
    módulo). Diga o valor de cada uma.
  - `npm run esboco -- --condutor <arquivo> --historico` de cada objeto: cole a
    parte dos vereditos.
- **Relatório:** (Executora preenche.) Para cada objeto: rodadas, tokens por
  rodada e total, nota e motivo de cada rodada, e a nota final. Depois, a saída do
  `medir:transcricao`, o valor de `leitura: README do esboço` de cada esbocista, o
  hash do commit e o nome da branch, e tudo o que atrapalhou (comando que falhou,
  ferramenta que travou, esbocista que leu o que não devia), com o comando que
  reproduz. Não registre nada em `banco-de-provas.json`.
