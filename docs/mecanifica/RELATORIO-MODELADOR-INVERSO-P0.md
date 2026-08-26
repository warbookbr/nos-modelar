# Relatório P0 — confiança antes de geometria

**Estado:** aberto, P0-B executado; P0-A e P0-C pendentes
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
| P0-B — alvo | aprovado localmente | contrato de qualificação + canário geométrico calibrado |
| P0-C — avaliador | bloqueado por insumos | corpus, repetições embaralhadas, holdout e intervalos |

**Decisão P0:** aberta. P1 não está autorizada.

## Registro P0-B — 2026-08-25

- O N6 passou a declarar `direcao-estetica`: preserva referência visual, mas
  `permiteFittingGeometrico=false`; o recortador também escreve essa declaração,
  impedindo que uma regeneração a apague.
- O canário `canario-geometrico-p0` foi gerado de forma determinística a partir
  de uma cunha sintética, fora do domínio automotivo. Ele traz três SVGs
  individuais, matrizes ortográficas, escala em mm, landmarks 3D/2D, hashes e
  identidade comum de objeto.
- `npx vitest run tools/mecanifica/recortar-prancha-n6.test.mjs` passou (1/1).
- `npx vitest run tools/modelagem/gerar-canario-geometrico-p0.test.mjs` passou
  (2/2): duas gerações idênticas, hashes dos arquivos e rebaixamento de uma
  vista intrusa para `indeterminado`.
- Limite explícito: isto prova apenas o contrato de entrada e sua rejeição de
  incoerência; não mede nem demonstra fidelidade de veículo, fitting, estética
  ou qualidade de superfície.

## Registro P0-C — infraestrutura, 2026-08-25

- O manifesto `autoria-assistida/avaliacao/corpus-p0/manifesto.json` está em
  `pendente-de-coleta`, sem itens. Ele enumera as lacunas em vez de preencher
  controles, V-01..V-32 ou resultados com conteúdo sintético não observado.
- O inventário gerado de V-01..V-32 encontrou evidência individual em apenas
  sete candidatas e marcou as 32 como **inelegíveis**: nenhum registro contém
  ainda par A/B, resposta conhecida, pergunta congelada, quatro apresentações
  cegas e isolamento entre `calibracao`/`holdout`. Contar arquivos de poucos
  experimentos como vinte objetos seria vazamento metodológico.
- O validador só torna um corpus elegível quando há ao menos 80 itens holdout,
  20 objetos sem vazamento entre splits, no máximo quatro itens por objeto, 40
  decisivos (20 grosseiros), 20 empates, 20 indeterminados e quatro
  apresentações com ordem A/B invertida duas vezes.
- O transporte offline exporta apenas lote, vistas e hashes — nunca o gabarito —
  e ingere respostas com provedor, modelo, hash de prompt, achados regionais,
  confiança e assinaturas de lote/resposta.
- `npx vitest run tools/modelagem/validar-corpus-avaliacao.test.mjs
  tools/modelagem/contrato-julgamento-critico.test.mjs
  tools/modelagem/orquestrar-calibracao-critico.test.mjs` passou (6/6).

**Decisão P0-C:** `bloqueado por insumos`. Ainda faltam os 20 objetos e suas
evidências individuais, a seleção controlada dos casos V-01..V-32 e as
execuções de um crítico independente. O transporte e o validador não substituem
nenhum desses dados; sem eles não há bootstrap, limiar, holdout revelado nem
autorização para P1.

## Regra de atualização

Cada fechamento anexa comando, commit, entrada, saída, hashes e decisão. Um
braço não muda para aprovado com execução parcial, teste isolado ou justificativa
textual para uma falha residual.
