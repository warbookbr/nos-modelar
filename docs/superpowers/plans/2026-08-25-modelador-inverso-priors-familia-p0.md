# Modelador inverso com priors por família — P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restaurar uma linha de base confiável e provar se alvo e avaliador são
adequados antes de implementar qualquer nova geometria.

**Architecture:** P0 adiciona uma fronteira portátil para evidências do
repositório, um contrato explícito de qualificação de alvo e um corpus de
calibração do crítico. Nada em P0 gera carroceria nem altera o núcleo procedural.

**Tech Stack:** Node.js ESM, Vitest, JSON Schema, ferramentas nativas em
`tools/modelagem/` e documentos/artefatos em `autoria-assistida/`.

**Spec:** [`docs/mecanifica/planos/2026-08-25-modelador-inverso-priors-familia.md`](../../mecanifica/planos/2026-08-25-modelador-inverso-priors-familia.md)

## Global Constraints

- Trabalhar em testes primeiro; um teste vermelho deve reproduzir cada falha.
- Não modelar nem ajustar geometria durante P0.
- Não alterar contrato público sem versão nova e migração explícita.
- Evidência visual é um arquivo por vista em tamanho nativo.
- Não escolher limiar de qualidade antes de medir baseline, holdout e incerteza.

---

## Subprojeto P0-A — gates portáteis e linha de base

### Task 1: unificar confinamento de caminhos `repo://`

**Files:**
- Create: `tools/modelagem/caminho-repositorio.mjs`
- Create: `tools/modelagem/caminho-repositorio.test.mjs`
- Modify: `tools/modelagem/despachar-consulta-visual.mjs`
- Modify: `tools/modelagem/aceite-visual.mjs`
- Modify: `tools/modelagem/aceite-visual-regional.mjs`
- Modify: `tools/modelagem/formato-pacote.mjs`
- Test: `tools/modelagem/despachar-consulta-visual.test.mjs`
- Test: `tools/modelagem/aceite-visual.test.mjs`
- Test: `tools/modelagem/aceite-visual-regional.test.mjs`

- [ ] Escrever testes que usam raiz Windows e recusam travessia, prefixo irmão,
  symlink/junction externo, diretório e arquivo inexistente.
- [ ] Confirmar vermelho causado por `startsWith(`${raiz}/`)`.
- [ ] Implementar um único resolvedor com `realpathSync`, `relative`,
  `isAbsolute` e checagem de arquivo regular; nunca comparar separador textual.
- [ ] Substituir as quatro implementações locais pelo serviço comum.
- [ ] Rodar `npx vitest run tools/modelagem/caminho-repositorio.test.mjs tools/modelagem/despachar-consulta-visual.test.mjs tools/modelagem/aceite-visual.test.mjs tools/modelagem/aceite-visual-regional.test.mjs`.
- [ ] Registrar no relatório P0 os nove testes antes falhos e o resultado novo.

### Task 2: resolver guarda da raiz histórica `fps`

**Files:**
- Test: `tools/mecanifica/caminho-procedural.test.ts`
- Inspect: `prototipos/fps/v3/`
- Modify: `docs/mecanifica/RELATORIO-MODELADOR-INVERSO-P0.md`

- [ ] Reproduzir a falha e inventariar se cada entrada é diretório legado,
  junction, compatibilidade intencional ou conteúdo órfão.
- [ ] Não apagar nem mover por suposição. Definir no teste a fronteira correta:
  implementação canônica em `prototipos/procedural/v3`, compatibilidade legada
  somente se documentada e sem segunda implementação.
- [ ] Aplicar a menor correção coerente e provar que não há executor duplicado.
- [ ] Anexar comando, árvore relevante e veredito ao relatório P0.

### Task 3: isolar a falha agregada de importação MCP

**Files:**
- Test: `tools/mcp/mcp.test.mjs`
- Test: `tools/mcp/procedural.test.mjs`
- Inspect: `tools/mcp/servidor.mjs`
- Modify/Create: somente o arquivo indicado pela reprodução causal

- [ ] Rodar o teste de importação sozinho e dentro da suíte com seed/ordem
  registrados; capturar stderr, código de saída e ambiente mínimo.
- [ ] Reduzir a reprodução até identificar estado global, concorrência, timeout
  ou dependência de cwd. A importação manual verde não conta como correção.
- [ ] Escrever teste vermelho específico para a causa encontrada.
- [ ] Corrigir sem relaxar isolamento e executar o teste focado dez vezes.
- [ ] Rodar `npm run mcp:check` e depois `npm test`.

### Task 4: fechar a linha de base oficial

**Files:**
- Modify: `docs/mecanifica/RELATORIO-MODELADOR-INVERSO-P0.md`

- [ ] Rodar, no mesmo checkout Windows: `npm test`, `npm run typecheck`,
  `npm run build`, `npm run porteiro`, `npm run bancada:vazia:check`,
  `npm run guarda:portas`, `npm run guarda:camera`, `npm run guarda:par`,
  `npm run mapa:check`, `npm run docs:toc:check`, `npm run docs:links:check`,
  `npm run planos:check`, `npm run exportar:check`, `npm run catalogo:check`,
  `npm run autoria:schemas:check`, `npm run mcp:check` e `npm run mcp:ensaio`.
- [ ] P0-A passa somente com todos verdes; falha residual mantém P0 bloqueado.

---

## Subprojeto P0-B — alvo qualificado

### Task 5: criar contrato versionado de alvo

**Files:**
- Create: `src/autoria/qualificacao-alvo.js`
- Create: `src/autoria/qualificacao-alvo.test.js`
- Modify: `tools/mecanifica/gerar-schemas-autoria-3d.mjs`
- Modify: `docs/mecanifica/ALVO-N6-CUPE-ESPORTIVO.md`
- Modify: `autoria-assistida/alvos/n6-cupe-esportivo/manifesto.json`

- [ ] Escrever testes para `direcao-estetica`, `alvo-geometrico` e
  `indeterminado`, com campos exigidos por classe e recusa fechada.
- [ ] Exigir em alvo geométrico câmeras, escala, correspondências, identidade do
  mesmo objeto e procedência; hash de recorte sozinho não basta.
- [ ] Implementar validador puro e schema gerado.
- [ ] Reclassificar N6 como `direcao-estetica`, preservando a aprovação do
  usuário apenas como direção visual.
- [ ] Rodar testes focados e `npm run autoria:schemas:check` após regenerar.

### Task 6: produzir canário geométrico calibrado

**Files:**
- Create: `autoria-assistida/alvos/canario-geometrico-p0/`
- Create: `tools/modelagem/gerar-canario-geometrico-p0.mjs`
- Create: `tools/modelagem/gerar-canario-geometrico-p0.test.mjs`

- [ ] Gerar no repositório uma forma 3D sintética conhecida, câmeras e vistas
  individuais; salvar escala, matrizes, landmarks 3D/2D, oclusão e hashes.
- [ ] Provar regeneração byte a byte com seed fixa.
- [ ] Incluir uma vista deliberadamente incompatível e provar classificação
  `indeterminado`.
- [ ] Não usar o canário como evidência de qualidade automotiva.

---

## Subprojeto P0-C — calibrar o avaliador

### Task 7: formar corpus de controles

**Files:**
- Create: `autoria-assistida/avaliacao/corpus-p0/manifesto.json`
- Create: `tools/modelagem/validar-corpus-avaliacao.mjs`
- Create: `tools/modelagem/validar-corpus-avaliacao.test.mjs`

- [ ] Selecionar controles sadios sintéticos e falhas V-01 a V-32 que tenham
  evidência individual suficiente; marcar ausentes como indisponíveis.
- [ ] Criar pares com ordem, vista, pergunta, resposta conhecida, severidade,
  split `calibracao`/`holdout` e hash. Não duplicar o mesmo objeto entre splits.
  Reservar no mínimo 80 itens de holdout balanceados: 40 pares decisivos (20
  com defeito grosseiro), 20 empates e 20 indeterminados; cada item terá quatro
  apresentações, duas por ordem A/B. Usar ao menos 20 objetos de origem, no
  máximo quatro itens por objeto e nenhum objeto nos dois splits.
- [ ] Incluir empates, imagem cortada, vista incompatível e defeitos grosseiros.
- [ ] Validar ausência de vazamento, hashes, cobertura e balanço do corpus.

### Task 8: executar crítico frio repetido

**Files:**
- Create: `tools/modelagem/orquestrar-calibracao-critico.mjs`
- Create: `tools/modelagem/orquestrar-calibracao-critico.test.mjs`
- Create: `tools/modelagem/contrato-julgamento-critico.mjs`
- Create: `tools/modelagem/contrato-julgamento-critico.test.mjs`
- Modify: `docs/mecanifica/RELATORIO-MODELADOR-INVERSO-P0.md`

- [ ] Definir o transporte como arquivos JSON: a CLI exporta um lote selado e
  ingere respostas validadas; **não chama rede nem modelo**. Um agente externo
  consome cada item via CLI/MCP e devolve JSON com provedor, modelo, hash do
  prompt, assinatura do lote e assinatura da resposta. Reexecução usa os lotes
  persistidos; indisponibilidade do agente mantém P0-C bloqueado.
- [ ] Definir saída estrita: preferência A/B, empate ou `indeterminado`, achados
  por região, confiança e assinatura do modelo/prompt.
- [ ] Embaralhar e repetir pares sem expor resposta, histórico ou narrativa do
  autor; persistir cada julgamento bruto.
- [ ] Calcular concordância consigo, acerto contra controles, matriz de confusão,
  intervalo de confiança e desempenho no holdout.
- [ ] Usar `calibracao` para escolher o limiar e congelar manifesto, baselines e
  regra antes de abrir `holdout`.
- [ ] Fixar a unidade estatística: por item, repetibilidade vale 1 somente se as
  quatro respostas categóricas coincidirem; acerto usa essa categoria unânime,
  e item sem unanimidade conta como erro. Calcular intervalos por bootstrap
  agrupado, reamostrando **objetos de origem**, nunca as 320 apresentações.
- [ ] P0-C passa somente com limite inferior bootstrap 95% de repetibilidade ≥
  0,80, limite inferior bootstrap 95% da diferença de acerto contra o melhor
  baseline > 0 e zero promoção observada de defeito grosseiro. Caso contrário,
  registrar `interromper` e não abrir P1.

### Task 9: fechamento de P0

**Files:**
- Modify: `docs/mecanifica/RELATORIO-MODELADOR-INVERSO-P0.md`
- Modify: `docs/mecanifica/planos/2026-08-25-modelador-inverso-priors-familia.md`
- Modify: `docs/mecanifica/GOTCHAS-AUTORIA-VISUAL.md`

- [ ] Reexecutar todos os gates oficiais e verificar artefatos/hashes.
- [ ] Registrar separadamente plataforma, alvo e avaliador como `aprovar`,
  `corrigir` ou `interromper`.
- [ ] Só marcar P0 concluído se P0-A, P0-B e P0-C passarem sem ressalva que
  invalide o estágio seguinte.
- [ ] Solicitar revisão de código independente antes de commit e integração.
