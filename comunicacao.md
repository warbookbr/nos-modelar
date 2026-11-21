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

### Tarefa 1 — Concluir `2026-11-17-curvas-lisas-e-zebra-numerica` (fatias 4 e 5)

- **Status:** aberta
- **Branch:** `envio/curvas-lisas-e-zebra-numerica` (a partir da `main` atual, sem misturar com `envio/divisao-por-contorno` nem `envio/rebaixo-por-contorno`)
- **Roteiro inicial:** rodar `npm run comecar -- nucleo` e ler antes `CLAUDE.md`, `docs/modelar/planos/2026-11-17-curvas-lisas-e-zebra-numerica.md` e o banco de provas citado no plano.
- **Escopo e território:** concluir as fatias 4 e 5 do plano `2026-11-17-curvas-lisas-e-zebra-numerica.md` (novas regiões da zebra numérica, leitura exata no ajuste de curva lisa, modo opcional de lisura e revisão adversarial sem bloqueios), respeitando estritamente o território declarado no plano (`tools/modelar/zebra-numerica.mjs`, `procedural/nucleo/ajuste-de-curva-lisa.js`, seus testes e seu banco de provas). Não alterar `procedural/nucleo/operacoes/divisao-por-contorno.js`, `procedural/nucleo/rebaixo-por-contorno.js`, nem `procedural/pecas/carro-quadrado/` (que ficam na frente paralela da outra IA).
- **Verificação:** rodar os testes unitários da zebra numérica e do ajuste de curva lisa, `npm run recusas:check`, `npm run arquitetura:check`, `npm run planos:check` e `npm run docs:links:check`, colando os resultados reais em Relatório. Gerar comparativo visual (zebra e pintura brilhante no `carro-fastback`) para aprovação da pessoa antes de rodar `npm run planos:encerrar`.
- **Coordenação de índice:** não alterar `docs/modelar/planos/README.md` antes de a branch da outra frente integrar na `main` (ou alinhar aqui antes do encerramento) para evitar conflito de merge.
- **Commit e push:** commitar localmente na branch `envio/curvas-lisas-e-zebra-numerica` e avisar a pessoa para subir quando o marco visual estiver pronto.
- **Próxima da fila desta frente (após aprovação da Tarefa 1):** `docs/modelar/planos/2026-11-16-ferramentas-de-correcao-de-superficie.md` (revisão adversarial de `preencherPelasVizinhas`, fechamento do relatório de G2 na fatia 5 e documentação/encerramento na fatia 6).

#### Relatório

_Aguardando início._
