# Roteiros de leitura por intenção

<!-- Gerado de roteiros.json por `npm run roteiros:gerar`. Não edite à mão. -->

Cada roteiro diz o que ler antes de começar, o que abrir só quando a condição aparecer, a
skill, os comandos e o que se confere no fim, e `npm run comecar -- <roteiro>` (ou a ferramenta
MCP `comecar`) devolve o mesmo com o passo seguinte lido do estado. Todo roteiro começa pelo
`CLAUDE.md`, que traz os invariantes e a lista destes roteiros. `npm run leitura:obrigatoria` imprime
o tamanho da leitura de cada roteiro contra o orçamento e a linha de base, e o gate recusa o
roteiro que passa de um ou do outro. O `AGENTS.md` faz para outros agentes o papel do
`CLAUDE.md` e não entra na soma.

| roteiro | intenção | quando |
| --- | --- | --- |
| `mudar` | trabalhar no projeto | Mudar núcleo, gate, arquitetura, ferramenta ou plano. |
| `documentar` | trabalhar na documentação | Escrever, mover ou cortar documento, fora de um plano. |
| `pesquisar` | pesquisar | Saber o que já se tentou, mediu ou pesquisou antes de propor algo. |
| `modelar/peca` | modelar | Escrever ou corrigir a receita de uma peça e prová-la na bancada. |
| `modelar/esboco` | modelar | Escrever o JSON do esboço de um objeto ou de uma unidade, como esbocista. |
| `modelar/laco-do-esboco` | modelar | Despachar esbocista e crítico, registrar vereditos e medir o custo de um ou mais objetos. |
| `modelar/auditar-peca` | modelar | Obter evidência objetiva de uma peça antes de publicar ou homologar. |
| `modelar/auditar-montagem` | modelar | Conferir composição, relações, encaixes e impacto de um conjunto montado. |

## mudar: Mudar o Mecanifica

Mudar núcleo, gate, arquitetura, ferramenta ou plano.

Ler antes de começar, num orçamento de 25.000 bytes (linha de base de 59.061 bytes em 2026-10-08):

- `CLAUDE.md`
- `docs/mecanifica/INDEX.md`
- `docs/mecanifica/planos/README.md`
- `docs/mecanifica/planos/2026-10-07-o-caminho-curto-da-ia.md`

Abrir só quando a condição aparecer:

- `comunicacao.md`, quando há tarefa aberta com a outra IA.
- `docs/mecanifica/ARQUITETURA.md`, quando a mudança atravessa camadas.
- `docs/mecanifica/UPSTREAM-NOS.md`, quando a mudança é geral e pode voltar ao NÓS.
- `docs/mecanifica/LEITURA-POR-TAREFA.md`, quando a pergunta é por assunto e nenhum roteiro a responde.

Comandos: `npm run gates`, `npm run mapa`, `npm run uso`.

Passo seguinte, sem estado lido: Leia o plano ativo e trabalhe na fatia em aberto; sem plano ativo, proponha um plano antes de implementar.

Conferido no fim: npm run gates, com a bateria completa quando muda código.

## documentar: Escrever ou reorganizar documentação

Escrever, mover ou cortar documento, fora de um plano.

Ler antes de começar, num orçamento de 13.000 bytes (linha de base de 13.635 bytes em 2026-10-08):

- `CLAUDE.md`
- `docs/mecanifica/INDEX.md`

Abrir só quando a condição aparecer:

- `docs/mecanifica/planos/README.md`, quando o documento é um plano.
- `docs/mecanifica/usar/README.md`, quando o documento é de uso, em docs/mecanifica/usar/.
- `docs/mecanifica/historico/README.md`, quando o documento vai para o histórico.
- `docs/mecanifica/LEITURA-POR-TAREFA.md`, quando a pergunta é por assunto e nenhum roteiro a responde.

Comandos: `npm run mapa`, `npm run gates`.

Passo seguinte, sem estado lido: Edite o documento, rode npm run mapa e confira com npm run gates.

Conferido no fim: npm run gates, que roda os gates de documentação (links, sumário, estrutura, citações e mapa).

## pesquisar: Procurar o que já foi feito ou pesquisado

Saber o que já se tentou, mediu ou pesquisou antes de propor algo.

Ler antes de começar, num orçamento de 6.000 bytes (linha de base de 8.948 bytes em 2026-10-08):

- `CLAUDE.md`
- `docs/mecanifica/historico/README.md`

Abrir só quando a condição aparecer:

- `docs/mecanifica/planos/encerrados/README.md`, quando a pergunta é sobre um plano concluído ou cancelado.
- `docs/mecanifica/PESQUISA-ABERTA-2026-10.md`, quando a pergunta é sobre ferramentas de outros projetos.
- `docs/mecanifica/FERRAMENTAS-POR-OBJETO.md`, quando a pergunta é que ferramenta cada objeto pede.
- `docs/mecanifica/banco-de-provas/BANCO-DE-PROVAS.md`, quando a pergunta é quanto custou modelar um objeto.
- `docs/mecanifica/ANALISES-DE-2026-10.md`, quando a pergunta é sobre a avaliação da estrutura do projeto.
- `docs/mecanifica/historico/CHEGADA-2026-09-11.md`, quando a pergunta é por que um documento saiu da raiz de docs/mecanifica/ ou onde foi parar.

Passo seguinte, sem estado lido: Abra docs/mecanifica/historico/README.md e siga para o item da pergunta, ou para o documento sob demanda que a responde.

Conferido no fim: Nada a conferir: pesquisa não muda o repositório, e o que dela virar trabalho precisa de plano.

## modelar/peca: Criar ou refinar uma peça procedural

Escrever ou corrigir a receita de uma peça e prová-la na bancada.

Ler antes de começar, num orçamento de 65.000 bytes (linha de base de 62.482 bytes em 2026-10-08):

- `CLAUDE.md`
- `docs/mecanifica/usar/GUIA-AUTORIA-IA.md`
- `docs/mecanifica/usar/LACO-VISUAL.md`
- `.claude/skills/criar-peca/SKILL.md`
- `docs/mecanifica/usar/AUTORIA-DE-PECA.md`
- `docs/mecanifica/usar/AUTORIA-RECEITA-DECLARATIVA.md`
- `docs/mecanifica/usar/INTENCAO-PECA-V1.md`
- `docs/mecanifica/usar/GOTCHAS-AUTORIA-VISUAL.md`
- `docs/mecanifica/usar/REFERENCIA-E-CRITICA-VISUAL.md`

Abrir só quando a condição aparecer:

- `.claude/skills/criar-peca/references/operacoes-procedurais.md`, quando for escolher uma operação.
- `docs/mecanifica/usar/METODO-DIAGNOSTICO-E-SEU-LIMITE.md`, quando os achados encolhem e a qualidade não sobe.
- `docs/mecanifica/usar/CRITICA-VISUAL-CONTRATO-E-CASOS.md`, quando for montar o pedido ao crítico ou ler o formato do achado.
- `docs/mecanifica/usar/MONTAGENS-SEMANTICAS.md`, quando a peça entra numa montagem.
- `docs/mecanifica/usar/ATIVACAO-BANCADA-SESSAO-ATIVA.md`, quando for carregar a peça na bancada da sessão.
- `docs/mecanifica/usar/CONTRATO-AUTORIA-PRANCHA.md`, quando a peça parte de uma prancha.
- `docs/mecanifica/usar/PARAMETROS-VIVOS.md`, quando for alterar um número da receita.
- `docs/mecanifica/usar/PARE-E-ANALISE.md`, quando for declarar a forma pronta.
- `docs/mecanifica/usar/README.md`, quando a tarefa pede o mapa dos contratos de uso que o roteiro não cita.
- `docs/mecanifica/usar/CONFERIR-CONTRA-REFERENCIA.md`, quando há foto de referência e não há prancha, para medir a borda em milímetro.

Skill: `criar-peca`.

Comandos: `node tools/mecanifica/olhar-bancada.mjs --analise --peca=<nome>`, `npm run parametros`, `npm run conferir:referencia`.

Passo seguinte, sem estado lido: Com peça nova, combine o alvo pela skill alinhar-modelagem; depois escreva a receita pela skill criar-peca.

Conferido no fim: A análise da bancada aberta e lida, o crítico visual sem contexto e npm run gates.

## modelar/esboco: Esboçar um objeto em formas primitivas

Escrever o JSON do esboço de um objeto ou de uma unidade, como esbocista.

Ler antes de começar, num orçamento de 14.000 bytes (linha de base de 23.789 bytes em 2026-10-08):

- `CLAUDE.md`
- `.claude/skills/esboco-detalhado/SKILL.md`

Abrir só quando a condição aparecer:

- `.claude/skills/esboco-detalhado/formas-e-componentes.md`, quando for usar forma curva, tubo, âncora relativa ou componente pronto.
- `.claude/skills/esboco-detalhado/leitura-em-texto.md`, quando for ler o modelo em texto antes da imagem.
- `.claude/skills/esboco-detalhado/regras-de-contato.md`, quando o gate de contato reprovar.
- `docs/mecanifica/usar/PARE-E-ANALISE.md`, quando for conferir o esboço em imagem.

Skill: `esboco-detalhado`.

Comandos: `npm run esboco -- --ajuda [tópico]`, `npm run esboco -- --condutor <arquivo>`, `npm run esboco -- <arquivo> --descrever`, `npm run esboco -- <arquivo> --composta`.

Passo seguinte, sem estado lido: Rode npm run esboco -- --condutor <arquivo> e siga o Portão do estágio.

Conferido no fim: O Portão de cada estágio do Condutor e a nota 8 ou mais do crítico visual cego.

## modelar/laco-do-esboco: Conduzir o laço do esboço

Despachar esbocista e crítico, registrar vereditos e medir o custo de um ou mais objetos.

Ler antes de começar, num orçamento de 12.000 bytes (linha de base de 13.878 bytes em 2026-10-08):

- `CLAUDE.md`
- `.claude/skills/laco-do-esboco/SKILL.md`

Abrir só quando a condição aparecer:

- `docs/mecanifica/usar/PARE-E-ANALISE.md`, quando for conferir o esboço em imagem.
- `docs/mecanifica/banco-de-provas/BANCO-DE-PROVAS.md`, quando o objeto é do banco de provas e o custo vai ser registrado.
- `docs/mecanifica/usar/README.md`, quando a tarefa pede o mapa dos contratos de uso que o roteiro não cita.

Skill: `laco-do-esboco`.

Comandos: `npm run esboco -- --condutor <arquivo> --veredito <unidade|marco-N|objeto> --nota <0-10> --motivo <texto>`, `npm run banco-de-provas:registrar`.

Passo seguinte, sem estado lido: Siga a skill laco-do-esboco: despache o esbocista e registre cada veredito do crítico.

Conferido no fim: O fluxo do Condutor em Concluído, com cada nota do crítico em 8 ou mais.

## modelar/auditar-peca: Auditar uma peça pronta

Obter evidência objetiva de uma peça antes de publicar ou homologar.

Ler antes de começar, num orçamento de 24.000 bytes (linha de base de 24.773 bytes em 2026-10-08):

- `CLAUDE.md`
- `.claude/skills/auditar-peca/SKILL.md`
- `docs/mecanifica/usar/REFERENCIA-E-CRITICA-VISUAL.md`

Abrir só quando a condição aparecer:

- `docs/mecanifica/usar/PARE-E-ANALISE.md`, quando a silhueta, um encontro ou um corte mudou.
- `docs/mecanifica/usar/ATIVACAO-BANCADA-SESSAO-ATIVA.md`, quando for carregar a peça na bancada da sessão.
- `docs/mecanifica/usar/PARAMETROS-VIVOS.md`, quando o achado leva a alterar um número da receita.
- `docs/mecanifica/usar/CRITICA-VISUAL-CONTRATO-E-CASOS.md`, quando for ler o formato do achado do crítico.
- `docs/mecanifica/usar/README.md`, quando a tarefa pede o mapa dos contratos de uso que o roteiro não cita.

Skill: `auditar-peca`.

Comandos: `npm run descrever`, `npm run malha:conferir`, `npm run revisar:modelagem`.

Passo seguinte, sem estado lido: Descreva a peça com npm run descrever e siga a skill auditar-peca.

Conferido no fim: O relato com os defeitos por vista e região e o que não foi conferido, com o motivo.

## modelar/auditar-montagem: Auditar uma montagem

Conferir composição, relações, encaixes e impacto de um conjunto montado.

Ler antes de começar, num orçamento de 27.000 bytes (linha de base de 27.936 bytes em 2026-10-08):

- `CLAUDE.md`
- `.claude/skills/auditar-montagem/SKILL.md`
- `docs/mecanifica/usar/MONTAGENS-SEMANTICAS.md`

Abrir só quando a condição aparecer:

- `docs/mecanifica/usar/REFERENCIA-E-CRITICA-VISUAL.md`, quando for julgar as vistas do conjunto.
- `docs/mecanifica/usar/README.md`, quando a tarefa pede o mapa dos contratos de uso que o roteiro não cita.

Skill: `auditar-montagem`.

Comandos: `npm run descrever:montagem:persistida`, `npm run olhar:montagem`.

Passo seguinte, sem estado lido: Descreva a árvore com npm run descrever:montagem:persistida e siga a skill auditar-montagem.

Conferido no fim: O relato por relação, impacto de revalidação e vistas.
