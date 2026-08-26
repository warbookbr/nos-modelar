# Relatório P0 — confiança antes de geometria

**Estado:** aberto, P0-B executado; P0-A pendente e P0-C aguardando execução independente
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
| P0-C — avaliador | bloqueado por execução independente | corpus, repetições embaralhadas, holdout e intervalos |

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

- O manifesto `autoria-assistida/avaliacao/corpus-p0/manifesto.json` foi
  congelado com 20 objetos holdout e cinco objetos de calibração separados. Os
  100 itens têm duas evidências SVG individuais com hash: 80 holdout balanceados
  (40 decisivos, dos quais 20 grosseiros, 20 empates e 20 indeterminados) e 20
  itens de calibração. Isso gera 400 apresentações cegas A/B.
- O inventário gerado de V-01..V-32 encontrou evidência individual em apenas
  sete candidatas e marcou as 32 como **inelegíveis**: nenhum registro contém
  ainda par A/B, resposta conhecida, pergunta congelada, quatro apresentações
  cegas e isolamento entre `calibracao`/`holdout`. Contar arquivos de poucos
  experimentos como vinte objetos seria vazamento metodológico.
- O validador só torna um corpus elegível quando há ao menos 80 itens holdout,
  20 objetos sem vazamento entre splits, no máximo quatro itens por objeto, 40
  decisivos (20 grosseiros), 20 empates, 20 indeterminados e quatro
  apresentações com ordem A/B invertida duas vezes.
- O primeiro transporte (`mecanifica.lote-critico-p0@1`) foi invalidado antes
  de qualquer execução externa: embora não exportasse o gabarito, ainda expunha
  `A/B`, a ordem e a identidade do item. Inverter posições dentro desse mesmo
  lote não cegava um crítico contra viés de posição. Nenhum resultado externo
  foi perdido ou aceito desse formato.
- O transporte vigente (`mecanifica.lote-critico-p0@2`) exporta somente IDs
  opacos `pNNNN`, a vista, a pergunta e alternativas `primeira`/`segunda` com
  arquivo e hash. O mapa que liga posição a A/B e item fica numa chave privada,
  assinada e vinculada ao lote, que não acompanha o estímulo. Na volta, a
  ingestão confere as assinaturas, exige cobertura integral e só então recupera
  a decisão semântica localmente.
- As respostas externas carregam provedor, modelo, hash de prompt, achados
  regionais, confiança e assinatura própria; não carregam gabarito nem ID do
  item.
- `tools/modelagem/analisar-calibracao-critico.mjs` mede somente respostas já
  ingeridas: unanimidade de quatro respostas por item, acerto (sem unanimidade
  é erro), matriz de confusão, promoção de defeito grosseiro e bootstrap de
  95% reamostrando os **objetos** holdout. O melhor baseline constante é
  escolhido exclusivamente na calibração e então avaliado no holdout. O
  resultado de uma fixture ou de origem não independente fica
  `indeterminado`; o analisador não transforma teste local em execução externa.
- `npx vitest run tools/modelagem/validar-corpus-avaliacao.test.mjs
  tools/modelagem/contrato-julgamento-critico.test.mjs
  tools/modelagem/orquestrar-calibracao-critico.test.mjs
  tools/modelagem/gerar-corpus-p0.test.mjs
  tools/modelagem/analisar-calibracao-critico.test.mjs` passa nos casos de
  transporte, bootstrap agrupado e veto de promoção grosseira. Isto testa a
  ferramenta; não é resultado de crítico.

**Decisão P0-C:** `bloqueado por execução independente`. O corpus sintético
calibra apenas repetibilidade sobre defeitos definidos por construção; ele não
prova reconhecimento de carro ou humanoide. Ainda faltam as execuções de um
crítico externo, a escolha do limiar só na calibração, o holdout fechado, o
bootstrap por objeto e a verificação de zero promoção grosseira. Sem isso não
há autorização para P1.

## Regra de atualização

Cada fechamento anexa comando, commit, entrada, saída, hashes e decisão. Um
braço não muda para aprovado com execução parcial, teste isolado ou justificativa
textual para uma falha residual.
