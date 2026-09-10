# Referências visuais e controles da bancada — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Permitir que a bancada mantenha imagens de referência alinháveis, preferências de cena e controles de inspeção persistentes sem alterar a autoria procedural.

**Architecture:** O conteúdo de \`sessao-ativa.json\` continua separado do estado local do navegador. Módulos puros normalizam referências, preferências e atalhos; adaptadores da bancada usam esses descritores para atualizar Three.js e a interface. A imagem local é guardada em IndexedDB por alvo, enquanto caminhos e URLs publicados pela IA continuam em \`referencias.imagens\`.

**Tech Stack:** JavaScript ES modules, Vitest, Three.js, DOM nativo, IndexedDB, localStorage e Vite.

**Spec:** \`docs/superpowers/specs/2026-09-09-bancada-referencias-e-controles-design.md\`

## Global Constraints

- O núcleo procedural permanece independente de Three.js, navegador, imagem e domínio automotivo.
- Receita, materiais autorais, geometria, identidade semântica e montagem persistida não mudam.
- Referência local, preferências e atalhos são estado de apresentação por \`alvo.id\`.
- Grade e chão começam ativos; auditoria e explosão podem ocultá-los temporariamente sem apagar a preferência-base.
- Conflito de atalho não transfere tecla silenciosamente.
- A correção de checklist e critérios usa objetos estruturados e tolera sessões legadas de texto.
- Todos os textos novos de interface e documentação ficam em pt-BR.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| \`src/bancada/sessao/estado-sessao.js\` | Forma canônica e normalização compatível de referências, checklist e critérios. |
| \`tools/mecanifica/ativar-bancada.mjs\` | Publica a forma estruturada real da sessão ativa. |
| \`src/bancada/preferencias/estado-local.js\` | Preferências de grade/chão e persistência pequena, injetável nos testes. |
| \`src/bancada/referencias/armazenamento-imagem.js\` | Blob local por alvo via IndexedDB, com adaptador de memória testável. |
| \`src/bancada/referencias/imagem-referencia.js\` | Descritor validado de imagem e cálculo do alinhamento inicial no plano \`YZ\`. |
| \`src/bancada/referencias/prancha-overlay.js\` | Camadas Three.js de pranchas e do plano texturizado de imagem. |
| \`src/bancada/referencias/painel-referencias.js\` | Upload/URL, controles de pose e remoção da referência. |
| \`src/bancada/controles/atalhos.js\` | Registro de comandos, captura, colisão e persistência de atalhos. |
| \`src/bancada/controlar-partes.js\` | Wireframe e opacidade apenas das partes selecionadas. |
| \`src/bancada/criar-ambiente.js\` | Reconciliação única da visibilidade de grade e chão. |
| \`bancada.html\`, \`src/bancada/styles.css\`, \`src/bancada/main.js\` | Barra superior, menus, abas de borda e ligação dos módulos. |

## Task 1: Corrigir o contrato que gera \`undefined\`

**Files:**

- Modify: \`tools/mecanifica/ativar-bancada.mjs:82-145\`
- Modify: \`src/bancada/sessao/estado-sessao.js\`
- Modify: \`src/bancada/referencias/painel-referencias.js:6-156\`
- Modify: \`tools/mecanifica/ativar-bancada.test.mjs\`
- Modify: \`src/bancada/sessao/sessao.test.js\`

**Interfaces:**

- Produces \`normalizarChecklist(valor)\` as \`Array<{ descricao: string, concluido: boolean }>\`.
- Produces \`normalizarCriterios(valor)\` as \`Array<{ texto: string, status: 'pendente'|'aprovado'|'reprovado' }>\`.
- \`ativarReceitaBancada()\` always writes these object arrays in \`payload\`.

- [ ] **Step 1: Write the failing activation contract tests**

Add this assertion to the successful activation case:

\`\`\`js
const payload = JSON.parse(readFileSync(SESSAO, 'utf8'));
expect(payload.intencaoIA.checklist[0]).toEqual({
  descricao: 'bloco',
  concluido: false,
});
expect(payload.referencias.criterios[0]).toEqual({
  texto: 'Sem faces órfãs',
  status: 'aprovado',
});
\`\`\`

Add a legacy case in \`sessao.test.js\` that passes \`['medir altura']\` and expects \`[{ descricao: 'medir altura', concluido: false }]\`.

- [ ] **Step 2: Run test to verify it fails**

Run: \`npx vitest run tools/mecanifica/ativar-bancada.test.mjs src/bancada/sessao/sessao.test.js\`

Expected: FAIL because \`checklist[0]\` is a string and normalizers are absent.

- [ ] **Step 3: Write minimal implementation**

Implement:

\`\`\`js
export function normalizarChecklist(valor = []) {
  return (Array.isArray(valor) ? valor : []).flatMap((item) => {
    if (typeof item === 'string' && item.trim()) return [{ descricao: item.trim(), concluido: false }];
    if (item && typeof item.descricao === 'string') {
      return [{ descricao: item.descricao, concluido: Boolean(item.concluido) }];
    }
    return [];
  });
}
\`\`\`

Implement \`normalizarCriterios()\` with the same compatibility rule and default status \`pendente\`. Make the activation producer emit objects and make the panel consume normalizers before rendering.

- [ ] **Step 4: Run tests to verify they pass**

Run: \`npx vitest run tools/mecanifica/ativar-bancada.test.mjs src/bancada/sessao/sessao.test.js\`

Expected: PASS; generated and legacy sessions both render structured records.

- [ ] **Step 5: Commit**

\`\`\`powershell
git add tools/mecanifica/ativar-bancada.mjs tools/mecanifica/ativar-bancada.test.mjs src/bancada/sessao/estado-sessao.js src/bancada/sessao/sessao.test.js src/bancada/referencias/painel-referencias.js
git commit -m "fix: normaliza referências da sessão da bancada"
\`\`\`

## Task 2: Preferências locais de cena e visibilidade reconciliada

**Files:**

- Create: \`src/bancada/preferencias/estado-local.js\`
- Create: \`src/bancada/preferencias/estado-local.test.js\`
- Modify: \`src/bancada/criar-ambiente.js:92-560\`

**Interfaces:**

- Produces \`criarPreferenciasBancada({ armazenamento })\` with \`ler()\` and \`salvar(parcial)\`.
- Produces \`ambiente.definirPreferenciasCena({ grade, chao })\` and \`ambiente.preferenciasCena()\`.
- View, audit and explosion methods call one private reconciliator instead of assigning \`visible\` independently.

- [ ] **Step 1: Write the failing test**

\`\`\`js
const memoria = new Map();
const armazenamento = {
  getItem: (k) => memoria.get(k) ?? null,
  setItem: (k, v) => memoria.set(k, v),
};
const preferencias = criarPreferenciasBancada({ armazenamento });
expect(preferencias.ler()).toEqual({ grade: true, chao: true });
preferencias.salvar({ grade: false });
expect(criarPreferenciasBancada({ armazenamento }).ler()).toEqual({ grade: false, chao: true });
\`\`\`

- [ ] **Step 2: Run test to verify it fails**

Run: \`npx vitest run src/bancada/preferencias/estado-local.test.js\`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write minimal implementation**

Create a module with \`const PADRAO = Object.freeze({ grade: true, chao: true })\`, malformed JSON fallback and unknown-key rejection. In \`criar-ambiente.js\`, add \`preferenciasCena\` and one private \`aplicarVisibilidadeDoCenario()\`:

\`\`\`js
const podeExibir = !auditoria && vistaAtual !== 'inferior' && explosaoAtual < 0.4;
piso.visible = Boolean(preferenciasCena.chao && podeExibir);
grade.visible = Boolean(preferenciasCena.grade && podeExibir);
\`\`\`

Keep explosion opacity separate from visibility and replace every direct normal-mode assignment to \`piso.visible\` or \`grade.visible\`.

- [ ] **Step 4: Run tests to verify they pass**

Run: \`npx vitest run src/bancada/preferencias/estado-local.test.js && npm run typecheck && npm run build\`

Expected: PASS and no caller can re-enable scene aids during audit.

- [ ] **Step 5: Commit**

\`\`\`powershell
git add src/bancada/preferencias/estado-local.js src/bancada/preferencias/estado-local.test.js src/bancada/criar-ambiente.js
git commit -m "feat: persiste preferências visuais da bancada"
\`\`\`

## Task 3: Referência de imagem persistida e descritor de alinhamento

**Files:**

- Create: \`src/bancada/referencias/armazenamento-imagem.js\`
- Create: \`src/bancada/referencias/armazenamento-imagem.test.js\`
- Create: \`src/bancada/referencias/imagem-referencia.js\`
- Create: \`src/bancada/referencias/imagem-referencia.test.js\`

**Interfaces:**

- Produces \`criarArmazenamentoImagem({ banco })\` with async \`salvar(alvoId, registro)\`, \`ler(alvoId)\` and \`remover(alvoId)\`.
- Produces \`normalizarImagemReferencia(entrada)\` and \`criarAlinhamentoInicial({ caixa, larguraImagem, alturaImagem, lado })\`.
- Record: \`{ id, fonte: 'upload'|'url'|'sessao', url?, blob?, mime?, rotulo, alinhamento: { x, y, z, escala, opacidade, lado } }\`.

- [ ] **Step 1: Write failing storage and geometry tests**

Use a Map adapter exposing async \`put\`, \`get\` and \`delete\`. Assert storing under \`alvo-a\` is invisible to \`alvo-b\`, and removal returns \`null\`. For a box from \`[-0.1, 0, -1]\` to \`[0.1, 2, 1]\` and ratio \`2\`, assert initial \`y === 1\`, positive scale, width \`4\` and the requested side.

- [ ] **Step 2: Run tests to verify they fail**

Run: \`npx vitest run src/bancada/referencias/armazenamento-imagem.test.js src/bancada/referencias/imagem-referencia.test.js\`

Expected: FAIL because both modules are absent.

- [ ] **Step 3: Write minimal implementation**

The normalizer rejects an empty URL and a missing blob/url pair, clamps opacity to \`[0, 1]\`, accepts only \`direita\` or \`esquerda\`, and ignores unknown keys. The browser adapter opens database \`mecanifica-bancada\`, store \`imagens-referencia\`, keyed by \`alvoId\`; tests use injection and do not require browser IndexedDB.

Calculate height from the box, width as \`altura * larguraImagem / alturaImagem\`, center in Y/Z and X just beyond min or max according to the selected side.

- [ ] **Step 4: Run tests to verify they pass**

Run: \`npx vitest run src/bancada/referencias/armazenamento-imagem.test.js src/bancada/referencias/imagem-referencia.test.js\`

Expected: PASS; records isolate by semantic target and alignment is deterministic.

- [ ] **Step 5: Commit**

\`\`\`powershell
git add src/bancada/referencias/armazenamento-imagem.js src/bancada/referencias/armazenamento-imagem.test.js src/bancada/referencias/imagem-referencia.js src/bancada/referencias/imagem-referencia.test.js
git commit -m "feat: persiste descritores de imagem de referência"
\`\`\`

## Task 4: Materializar e descartar o plano de imagem no Three.js

**Files:**

- Modify: \`src/bancada/referencias/prancha-overlay.js\`
- Create: \`src/bancada/referencias/prancha-overlay.test.js\`

**Interfaces:**

- Produces \`definirImagemReferencia(descritor, { textura })\`, \`atualizarImagemReferencia(alinhamento)\`, \`removerImagemReferencia()\` and \`obterImagemReferencia()\`.
- Does not add the image plane to the existing list of pranchas.

- [ ] **Step 1: Write the failing Three.js manager test**

Create a \`THREE.Scene\` and \`THREE.DataTexture\`. Set a descriptor, assert a mesh named \`__imagem_referencia__\`, assert position follows \`{ x: 0.2, y: 1, z: 0 }\`, update opacity to \`0.4\`, remove it, and assert the group has no child with that name.

- [ ] **Step 2: Run test to verify it fails**

Run: \`npx vitest run src/bancada/referencias/prancha-overlay.test.js\`

Expected: FAIL because image-plane APIs are unavailable.

- [ ] **Step 3: Write minimal implementation**

Create \`PlaneGeometry(largura, altura)\` rotated onto \`YZ\` and \`MeshBasicMaterial({ map: textura, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })\`. Set \`renderOrder = -1\`; retain depth testing. Replacing or removing disposes geometry, material and only textures owned by the manager.

- [ ] **Step 4: Run test and inspect one live render**

Run: \`npx vitest run src/bancada/referencias/prancha-overlay.test.js\`

Then activate the bicycle, create a reference from the supplied image and inspect \`vista=esquerda\` plus an isometric view. Expected: lateral model in front of photo; photo does not become geometry.

- [ ] **Step 5: Commit**

\`\`\`powershell
git add src/bancada/referencias/prancha-overlay.js src/bancada/referencias/prancha-overlay.test.js
git commit -m "feat: adiciona plano de imagem à bancada"
\`\`\`

## Task 5: UI de referência e apresentação da seleção

**Files:**

- Modify: \`src/bancada/referencias/painel-referencias.js\`
- Modify: \`src/bancada/controlar-partes.js\`
- Create: \`src/bancada/controlar-partes.test.js\`
- Modify: \`src/bancada/main.js\`
- Modify: \`src/bancada/styles.css\`

**Interfaces:**

- \`criarPainelReferencias()\` accepts \`aoSelecionarImagem\`, \`aoGerarPlano\`, \`aoAtualizarAlinhamento\` and \`aoRemoverImagem\`.
- \`criarControladorPartes()\` exposes \`definirWireframeSelecao(ligado)\` and \`definirOpacidadeSelecao(valor)\`.
- \`estado()\` includes \`wireframeSelecao\` and \`opacidadeSelecao\`, but no recipe or URL serializes them.

- [ ] **Step 1: Write the failing controller test**

Build two cube groups with \`MeshStandardMaterial\`. Select only \`a\`, call \`definirWireframeSelecao(true)\` and \`definirOpacidadeSelecao(0.35)\`, and assert only \`a\` has wireframe, transparency and 0.35 opacity. Call \`limpar()\` and assert both materials equal their captured originals.

- [ ] **Step 2: Run test to verify it fails**

Run: \`npx vitest run src/bancada/controlar-partes.test.js\`

Expected: FAIL because selection-specific methods do not exist.

- [ ] **Step 3: Write minimal implementation**

Add \`wireframeSelecao\` and \`opacidadeSelecao\`. In \`aplicarVisual()\`, restore each material, apply existing context/audit state, then apply selection presentation only when its name is selected. Do not reuse global \`arame\`, which belongs to audit display.

Build DOM with \`createElement\`, never interpolate an untrusted URL through \`innerHTML\`: drop target, file input, URL/path input, preview, five range controls, \`Gerar objeto imagem referência\` and \`Deletar imagem referência\`. Main owns decoding, persistence, object-URL lifecycle, box lookup and callbacks. Session images remain gallery cards and can be selected as the plane source.

- [ ] **Step 4: Run focused tests and live flow**

Run: \`npx vitest run src/bancada/controlar-partes.test.js src/bancada/sessao/sessao.test.js\`

Manual evidence: select two bicycle parts, enable wireframe, set opacity, clear selection, upload JPEG, generate plane, move Y/Z/X, scale, reload and delete. Expected: only selection changes; reference survives reload and disappears only after deletion.

- [ ] **Step 5: Commit**

\`\`\`powershell
git add src/bancada/referencias/painel-referencias.js src/bancada/controlar-partes.js src/bancada/controlar-partes.test.js src/bancada/main.js src/bancada/styles.css
git commit -m "feat: controla referência e aparência da seleção"
\`\`\`

## Task 6: Barra superior, painéis recolhíveis e atalhos remapeáveis

**Files:**

- Create: \`src/bancada/controles/atalhos.js\`
- Create: \`src/bancada/controles/atalhos.test.js\`
- Modify: \`bancada.html\`
- Modify: \`src/bancada/main.js\`
- Modify: \`src/bancada/styles.css\`

**Interfaces:**

- Produces \`criarRegistroAtalhos({ padrao, armazenamento })\` with \`obter()\`, \`atribuir(comando, combinacao)\`, \`restaurarPadroes()\` and \`comandoDaCombinacao(combinacao)\`.
- \`atribuir()\` returns \`{ ok: false, motivo: 'ocupado', comandoOcupante }\` on collision.
- Main maps \`vista-frontal\`, \`vista-esquerda\`, \`enquadrar\`, \`wireframe-selecao\` and \`alternar-grade\` to commands.

- [ ] **Step 1: Write the failing registry tests**

Use defaults \`{ 'vista-frontal': '1', enquadrar: 'f' }\`. Assert assigning \`f\` to \`vista-frontal\` returns \`{ ok: false, motivo: 'ocupado', comandoOcupante: 'enquadrar' }\` and keeps \`vista-frontal: '1'\`. Assert assigning \`q\` succeeds and a fresh registry restores it.

- [ ] **Step 2: Run test to verify it fails**

Run: \`npx vitest run src/bancada/controles/atalhos.test.js\`

Expected: FAIL because the registry is absent.

- [ ] **Step 3: Write minimal implementation**

Normalize keys to lowercase, preserve \`Shift+1\`, reject bare modifier keys. Capture listens once for \`keydown\`, displays attempted combination, calls \`atribuir\`, and reports the owning command on collision. Escape cancels with no mutation. Global listener returns early for inputs, textareas, selects, editable elements and active capture.

Add the thin top bar with \`Configurações\` and \`Controles\`. Settings binds grade/chão to Task 2. Controls lists keyboard commands, mouse gestures as read-only rows and restore defaults. Add external top buttons for each panel collapse; CSS retains a reachable edge tab and keeps the canvas full-size.

- [ ] **Step 4: Run tests and manually verify keyboard behavior**

Run: \`npx vitest run src/bancada/controles/atalhos.test.js && npm run build\`

Manual evidence: change the left-view key, reload, invoke it, attempt duplicate assignment, verify conflict message and existing command, restore defaults, then collapse and reopen both panels with a bicycle part selected.

- [ ] **Step 5: Commit**

\`\`\`powershell
git add src/bancada/controles/atalhos.js src/bancada/controles/atalhos.test.js bancada.html src/bancada/main.js src/bancada/styles.css
git commit -m "feat: organiza controles e atalhos da bancada"
\`\`\`

## Task 7: Validar o limite entre referência visual e modelo procedural

**Files:**

- Modify: \`docs/uso/MAPA.md\` only through \`npm run mapa\`.

**Interfaces:**

- Public bridge continues to report only the procedural model in \`peca()\`, \`partes\`, \`estatisticas\` and \`diagnosticos\`; a reference plane is presentation-only.

- [ ] **Step 1: Verify the regression boundary created in Task 4**

Run: \`npx vitest run src/bancada/referencias/prancha-overlay.test.js tools/mecanifica/olhar-bancada.test.mjs\`

Expected: PASS. The first test proves a managed reference plane exists only in the reference group; the second continues to report statistics for the procedural model supplied by the public bridge.

- [ ] **Step 2: Preserve the procedural-only boundary and generate map**

Keep reference group outside \`modeloAtual.raiz\` and out of objects supplied to \`definirObjeto\`, selection, statistics and headless measurement. Run \`npm run mapa\`; never hand-edit the map.

- [ ] **Step 3: Run complete verification**

Run:

\`\`\`powershell
npm test
npm run typecheck
npm run build
npm run porteiro
npm run exportar:check
npm run gates
\`\`\`

Expected: every command exits 0. Stop and diagnose any failure before changing code.

- [ ] **Step 4: Inspect published interaction**

Activate \`bicicleta-quadro\` with the supplied JPEG using \`--imagem\`, then inspect \`esquerda\`, \`direita\` and isometric. Confirm plane behind lateral model, grid/chão and remapped shortcuts persist through reload, both panels restore, wireframe/opacity restore on clear selection, and no \`undefined\` remains.

- [ ] **Step 5: Commit**

\`\`\`powershell
git add docs/uso/MAPA.md
git commit -m "test: valida referências visuais da bancada"
\`\`\`

## Plan self-review

Task 1 covers the structured-session defect. Tasks 2 and 6 cover persistent scene controls, panel collapse, menus and conflict-safe shortcuts. Tasks 3 to 5 cover image storage, alignment, Three.js materialization and selected-part presentation. Task 7 protects the procedural inspection boundary, updates generated documentation and runs every required gate. All produced interface names are consumed consistently by later tasks.
