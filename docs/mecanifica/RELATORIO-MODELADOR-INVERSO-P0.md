# Relatório P0 — confiança antes de geometria

**Estado:** aberto, não executado
**Plano:** [`planos/2026-08-25-modelador-inverso-priors-familia.md`](planos/2026-08-25-modelador-inverso-priors-familia.md)
**Execução detalhada:** [`../superpowers/plans/2026-08-25-modelador-inverso-priors-familia-p0.md`](../superpowers/plans/2026-08-25-modelador-inverso-priors-familia-p0.md)

Este arquivo é o destino rastreável das evidências de P0. Sua existência não
declara trabalho executado nem gate aprovado.

## Linha de base de abertura — 2026-08-25

- Suíte completa: 1.264 de 1.277 testes passaram; 11 falharam e 2 foram
  ignorados.
- Nove falhas descendem da resolução não portátil de `repo://` nos fluxos de
  despacho e aceite visual.
- Uma guarda ainda encontra `prototipos/fps/v3` após a migração canônica.
- Uma prova agregada de importação MCP falhou na suíte, embora a importação
  manual isolada tenha encerrado com código zero; causa ainda indeterminada.
- `typecheck`, catálogo, schemas de autoria, planos e independência
  arquitetural passaram em execuções separadas.

Uma execução concorrente com gates visuais ainda encerrando produziu seis
timeouts adicionais (17 falhas). Ela foi preservada como sinal de saturação,
mas não usada como baseline causal; a repetição sem concorrência voltou às 11
falhas determinísticas acima.

## Vereditos

| Braço | Estado | Evidência exigida |
| --- | --- | --- |
| P0-A — linha de base | bloqueado | todos os gates oficiais verdes no mesmo checkout Windows |
| P0-B — alvo | não iniciado | contrato de qualificação + canário geométrico calibrado |
| P0-C — avaliador | não iniciado | corpus, repetições embaralhadas, holdout e intervalos |

**Decisão P0:** aberta. P1 não está autorizada.

## Regra de atualização

Cada fechamento anexa comando, commit, entrada, saída, hashes e decisão. Um
braço não muda para aprovado com execução parcial, teste isolado ou justificativa
textual para uma falha residual.
