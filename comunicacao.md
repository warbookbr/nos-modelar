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

_Nenhuma tarefa aberta._
