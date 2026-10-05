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

### T010 — Conferir as fontes do levantamento da T009 (só leitura)

- **Status:** aberta
- **Objetivo:** dizer, fonte por fonte, o que existe e o que o relatório da T009
  afirmou sem base. A Planejadora não conseguiu conferir (a busca na web dela
  está bloqueada) e desconfia de parte dos dados.
- **Ler antes:**
  - `comunicacao.md` — o relatório da T009 já foi retirado deste arquivo; use o
    quadro "Fontes a conferir" abaixo
- **Mexer em:** nada do repositório. Escreva só em "Relatório".
- **Não mexer em:** qualquer arquivo.
- **Antes de tudo:** se você não tem acesso à web, escreva isso, marque
  `Status: bloqueada` e pare. Não responda de memória.
- **Fontes a conferir** (abra cada uma, não resuma de memória):
  1. arXiv 2607.05123 — "AssemCAD" / AssemBench: título, autores, data, e se o
     resumo traz SR e APR para LLMs gerais. Confirme ou negue os números
     citados: Claude-4.8 SR 85,00% e APR 0,83%; Claude Opus 4.8 SR 65,83% e APR
     0,00%; Gemini 3.5 Flash SR 30,83% e APR 0,00%; GPT-5.5 SR 79,17% e APR
     66,67%; AssemCAD SR 89,17% e APR 87,50%. Diga se esses nomes de modelo
     aparecem no artigo.
  2. arXiv 2609.13146 — "SNAP3D": título, autores, data, e se as estabilidades
     citadas (0 a 2% dos geradores de partes contra 95% do método) estão lá.
  3. arXiv 2505.14646 — CAD-Coder: VSR 100% e IoU 0,675 contra GPT-4.5 (0,524),
     o1 (0,494) e Gemini 2.0 Pro (0,445).
  4. arXiv 2412.14042 — CAD-Recode: taxas de código inválido de 7,9% (DeepCAD)
     e 21,0% (MCB).
  5. arXiv 2410.15684 — o artigo que a T009 chamou de CADPrompt/CADCodeVerify:
     confira se o número de arXiv corresponde a esse título e as taxas de
     compilação (GPT-4 96,5%, Gemini 1.5 Pro 85,0%, CodeLlama 73,5%).
  6. arXiv 2501.12211 — a T009 o citou como Hunyuan3D 2.0; confira título e
     número.
  7. As "avaliações de terceiros" sobre furos ovalados, roscas e cotas ignoradas
     em Tripo/Meshy/Luma: para cada afirmação, ache a página específica (não a
     página inicial do site). Se não achar, escreva "não encontrei".
  8. Preços e créditos de Tripo, Meshy e Rodin: confirme na página oficial de
     preços e anote a data da consulta.
- **Verificação:** para cada item, uma linha: `confirmado`, `diferente` (diga o
  que o artigo realmente traz) ou `não encontrei`, com o link exato e a data da
  consulta. Cite o trecho do resumo que sustenta. Não complete lacuna com
  valor plausível.
- **Relatório:** (Executora preenche. Uma tabela, sem opinião sobre o
  Mecanifica.)
