# Comunicação entre IAs

Canal de trabalho entre duas IAs neste repositório.

- **Planejadora** (Claude Code na nuvem): planeja, despacha tarefas e revisa.
- **Executora** (Claude Code local, na máquina da pessoa): executa e reporta aqui.

## Regras

1. A Planejadora escreve em "Tarefas". A Executora escreve só em "Relatório" da
   própria tarefa e no campo `Status`.
2. Uma tarefa por seção, numerada, sem reescrever as antigas.
3. Antes de começar, a Executora lê o `CLAUDE.md`, roda o `npm run comecar` do
   roteiro da tarefa e lê os arquivos de "Ler antes", e não lê além disso sem
   necessidade.
4. Não sair do escopo da tarefa. Se algo fora do escopo parecer necessário, parar,
   registrar em "Relatório" e marcar `Status: bloqueada`.
5. Rodar o que a tarefa pedir em "Verificação" e colar o resultado real, inclusive
   falhas.
6. Commit e push só quando a tarefa disser, e só na branch que ela nomear.

Este arquivo é volátil: guarda só a tarefa em andamento. O histórico fica nos
commits e no plano; a Planejadora limpa a tarefa depois de revisá-la.

Status possíveis: `aberta` → `em andamento` → `feita` | `bloqueada`.

## Tarefas

### Tarefa 3 — Rodada 8 do quarto traseiro do `carro-fastback` (`2026-11-14-modelagem-de-carro`)

- **Status:** aberta
- **Branch:** `envio/fastback-rodada-8` (criada a partir da `main` assim que `envio/divisao-por-contorno` entrar na `main`)
- **Roteiro inicial:** rodar `npm run comecar -- carro` e ler antes `CLAUDE.md`, `docs/modelar/planos/congelados/2026-11-14-modelagem-de-carro.md` e `procedural/pecas/carro-fastback/partes/lataria/receita.js`.
- **Escopo:** conduzir a rodada 8 do quarto traseiro do `carro-fastback` usando o arsenal novo já na `main`: `divisaoPorContorno` (já aplicada em `paralamaTraseiro` e `rebaixoLateral`), ajuste de curva lisa com objetivo de lisura, `alisarCurvas`, emenda G1 por curva e vão espelhado (`simetria: 'x'`), mantendo a disciplina de medida antes/depois (zebra numérica, ondulação, pente e pacote do crítico).
- **Não tocar:** `procedural/pecas/carro-quadrado/` (que segue na nossa frente paralela `envio/carro-quadrado-forma`).
- **Commit e push:** commitar localmente em `envio/fastback-rodada-8` e apresentar o comparativo visual à pessoa para aprovação antes de integrar.

#### Relatório

_Aguardando início._
