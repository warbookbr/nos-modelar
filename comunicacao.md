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

### Tarefa 2 — Concluir `2026-11-16-ferramentas-de-correcao-de-superficie` (fim da fatia 5 e fatia 6)

- **Status:** aberta
- **Branch:** `envio/correcao-de-superficie` (criada a partir da `origin/main` atual, `df6d318e`, que já contém `rebaixo-por-contorno` e `curvas-lisas-e-zebra-numerica`)
- **Roteiro inicial:** rodar `npm run comecar -- nucleo` e ler antes `CLAUDE.md`, `docs/modelar/planos/2026-11-16-ferramentas-de-correcao-de-superficie.md` (linhas 61–74!) e `docs/modelar/banco-de-provas/correcao-de-superficie-2026-11-16/README.md`.
- **Atenção ao estado real do plano:** a linha-resumo de `docs/modelar/planos/README.md` está defasada ("a começar pela fatia 1"), mas o próprio plano registra que as **fatias 1, 2, 3, 4 e o `preencherPelasVizinhas` da fatia 5 já foram feitos**. Não refaça a fatia 1 — retome exatamente de onde a fatia 5 parou (linha 72 do plano):
  1. Revisão adversarial de `preencherPelasVizinhas` (`procedural/nucleo/gaiola-por-rede.js`) e correção de eventuais bloqueios.
  2. Medida diagnóstica do quarto traseiro (`carro-fastback/lataria`, numa cópia fora do repositório, sem alterar a receita do carro) com e sem `alisarSuperficie`, fechando o relatório do G2 alcançável para decisão da pessoa.
  3. Fatia 6: documentação (nota de uso no catálogo e na skill de criar peça), fechamento do plano e encerramento após o aval da pessoa.
- **Confirmação de território sem conflito (conferido em 2026-11-21):** nenhum dos ramos abertos pela outra frente toca qualquer arquivo do seu território:
  - `envio/divisao-por-contorno`: só `divisao-por-contorno.js/.test.mjs`, `carro-fastback/partes/lataria/receita.js` e docs do plano.
  - `envio/auditar-forma`: só `tools/modelar/auditar-forma.mjs/.test.mjs` e `package.json`.
  - `envio/casca-por-perfis`: só `procedural/nucleo/casca-por-perfis.js/.test.mjs` (arquivo novo autônomo; não toca `gaiola-por-rede.js`, `subdivisao.js` nem `abertura-por-contorno.js`).
  - `envio/envelopar-e-embutir`: só `procedural/nucleo/envelopar-e-embutir.js/.test.mjs` (arquivo novo autônomo).
  - `envio/carro-quadrado-forma`: só `procedural/pecas/carro-quadrado/partes/lataria/receita.js` e `receita/chapa.js`.
- **Não tocar:** `procedural/nucleo/casca-por-perfis.js`, `procedural/nucleo/envelopar-e-embutir.js`, `procedural/nucleo/rebaixo-por-contorno.js`, `procedural/nucleo/operacoes/divisao-por-contorno.js`, `tools/modelar/auditar-forma.mjs`, `procedural/pecas/carro-quadrado/` e `procedural/pecas/carro-fastback/partes/lataria/receita.js`.
- **Verificação:** rodar os testes do território (`gaiola-por-rede`, `alisar-curvas`, `abertura-por-contorno`, `subdivisao` e fixtures de `correcao-de-superficie`), `npm run recusas:check`, `npm run arquitetura:check`, `npm run planos:check` e `npm run docs:links:check`.
- **Commit e push:** commitar localmente em `envio/correcao-de-superficie` sem push; esperar o aval da pessoa no relatório/imagens antes de encerrar o plano (e avisar se houver conflito esperado nos índices gerados `planos/README.md`, `PLANOS-ENCERRADOS.md` e `docs/MAPA.md`).

#### Relatório

_Aguardando início._
