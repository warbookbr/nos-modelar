# Melhoria da Esteira de Apoio à Modelagem e Autoria para IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar a experiência de modelagem assistida por IA na Mecanifica eliminando fricções de CLI, resolvendo o timeout de visualização headless e criando o guia canônico central de autoria procedural.

**Architecture:**
1. Criar utilitário compartilhado de resolução flexível de receitas (`resolverCaminhoReceita`) suportando nome curto, extensão opcional e caminho relativo dentro de `prototipos/procedural/v3/{pecas,maquinas}/`.
2. Atualizar `ativar-bancada.mjs` e `exportar-step.mjs` para aceitarem posicional ou opções com a resolução flexível.
3. Atualizar `olhar-bancada.mjs` para detectar receitas locais fora do catálogo estático do harness, auto-ativar a sessão ativa sem travar o Playwright por timeout e falhar rápido se a peça não existir.
4. Escrever `docs/mecanifica/usar/GUIA-AUTORIA-IA.md`, conectar à skill `.claude/skills/criar-peca/SKILL.md` e à porta `docs/mecanifica/usar/README.md`, validando com os gates de integridade (`docs:estrutura:check`, `docs:links:check`, `mapa:check`).

**Tech Stack:** Node.js (ESM), Vitest, Playwright, Three.js (bancada), TypeScript (gates de checagem).

**Spec:** Baseado no diagnóstico empírico da modelagem de validação de `mancal-guia.js` e nas 3 recomendações aprovadas pelo usuário.

## Global Constraints
- Manter compatibilidade com chamadas CLI existentes (`--arquivo=<caminho>`, etc.).
- Confinamento estrito de caminhos dentro do repositório (rejeitar traversal `..` ou caminhos externos).
- Código em ESM puro (`.mjs` / `.js` com `type: module`).
- Seguir os gates de documentação: `G1` (links internos em `usar/`), `G3` (todo doc em `usar/` citado por skill), `G5` (máximo 60 linhas na porta `usar/README.md`).

---

### Task 1: Resolução Flexível de Argumentos em `ativar:bancada` e `exportar:step`

**Files:**
- Create: `tools/mecanifica/resolver-caminho-receita.mjs`
- Test: `tools/mecanifica/resolver-caminho-receita.test.mjs`
- Modify: `tools/mecanifica/ativar-bancada.mjs:13-45`
- Modify: `tools/mecanifica/exportar-step.mjs:68-85`

**Interfaces:**
- Produces: `resolverCaminhoReceita(alvo, opcoes = {}) => string (caminho absoluto validado)`
- Consumes: `fs.existsSync`, `path.resolve`, `path.relative`

- [ ] **Step 1: Escrever teste de unidade falhando para `resolverCaminhoReceita`**

Criar `tools/mecanifica/resolver-caminho-receita.test.mjs`:
```javascript
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

describe('resolverCaminhoReceita', () => {
  it('resolve caminho relativo existente diretamente', () => {
    const caminho = resolverCaminhoReceita('prototipos/procedural/v3/pecas/chapa-de-fixacao.js');
    expect(caminho).toMatch(/chapa-de-fixacao\.js$/);
  });

  it('resolve nome simples de peça sem extensão', () => {
    const caminho = resolverCaminhoReceita('chapa-de-fixacao');
    expect(caminho).toMatch(/prototipos[\\/]procedural[\\/]v3[\\/]pecas[\\/]chapa-de-fixacao\.js$/);
  });

  it('resolve nome de peça com extensão .js', () => {
    const caminho = resolverCaminhoReceita('chapa-de-fixacao.js');
    expect(caminho).toMatch(/prototipos[\\/]procedural[\\/]v3[\\/]pecas[\\/]chapa-de-fixacao\.js$/);
  });

  it('resolve máquina em maquinas/ por nome simples', () => {
    const caminho = resolverCaminhoReceita('prensa-mecanica-industrial');
    expect(caminho).toMatch(/prototipos[\\/]procedural[\\/]v3[\\/]maquinas[\\/]prensa-mecanica-industrial\.js$/);
  });

  it('lança erro claro quando a receita não é encontrada', () => {
    expect(() => resolverCaminhoReceita('peca-que-nao-existe')).toThrowError(/não encontrada/i);
  });

  it('bloqueia tentativa de path traversal para fora do repo', () => {
    expect(() => resolverCaminhoReceita('../../../fora.js')).toThrowError(/confinamento|fora do repositório/i);
  });
});
```

- [ ] **Step 2: Executar teste para confirmar a falha**

Run: `npx vitest run tools/mecanifica/resolver-caminho-receita.test.mjs`
Expected: FAIL ("resolverCaminhoReceita is not defined" ou módulo inexistente).

- [ ] **Step 3: Implementar `resolver-caminho-receita.mjs`**

Criar `tools/mecanifica/resolver-caminho-receita.mjs`:
```javascript
/* resolver-caminho-receita.mjs — localizador flexível de receitas com confinamento seguro */
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, '../..');

const PASTAS_BUSCA = [
  '',
  'prototipos/procedural/v3/pecas',
  'prototipos/procedural/v3/maquinas',
];

export function resolverCaminhoReceita(alvo, { raiz = REPO } = {}) {
  if (!alvo || typeof alvo !== 'string') {
    throw new Error('Informe o nome ou caminho da receita.');
  }

  const limpo = alvo.trim();
  const variacoesNome = limpo.endsWith('.js') ? [limpo] : [limpo, `${limpo}.js`];

  for (const pasta of PASTAS_BUSCA) {
    for (const nome of variacoesNome) {
      const candidato = isAbsolute(nome)
        ? resolve(nome)
        : resolve(raiz, pasta, nome);

      const rel = relative(raiz, candidato);
      if (rel.startsWith('..') || isAbsolute(rel)) {
        throw new Error(`Confinamento violado: o caminho '${alvo}' aponta para fora do repositório.`);
      }

      if (existsSync(candidato)) {
        return candidato;
      }
    }
  }

  throw new Error(`Receita '${alvo}' não encontrada como arquivo direto ou em prototipos/procedural/v3/{pecas,maquinas}/.`);
}
```

- [ ] **Step 4: Executar teste de unidade para confirmar aprovação**

Run: `npx vitest run tools/mecanifica/resolver-caminho-receita.test.mjs`
Expected: PASS.

- [ ] **Step 5: Integrar `resolverCaminhoReceita` em `ativar-bancada.mjs` e `exportar-step.mjs`**

Modificar `tools/mecanifica/ativar-bancada.mjs`:
- Importar `resolverCaminhoReceita`.
- Aceitar argumento posicional no `lerArgumentos`: `posicional: { nome: 'a receita', obrigatorio: false }`.
- Obter alvo via `args.opcao('arquivo') ?? args.opcao('peca') ?? args.posicional`.
- Resolver caminho absoluto via `resolverCaminhoReceita(alvo)`.

Modificar `tools/mecanifica/exportar-step.mjs`:
- Substituir a checagem manual em `carregarReceita` por `resolverCaminhoReceita(caminhoArquivo)`.

- [ ] **Step 6: Testar integração manual com comandos reais**

Run: `node tools/mecanifica/ativar-bancada.mjs mancal-guia`
Expected: Ativação com sucesso sem precisar de `--arquivo=prototipos/...`.

Run: `node tools/mecanifica/exportar-step.mjs mancal-guia --somente-validar`
Expected: Validação com sucesso sem erro de arquivo não encontrado.

---

### Task 2: Mitigar Timeout e Auto-Ativar Sessão em `olhar-bancada.mjs`

**Files:**
- Modify: `tools/mecanifica/olhar-bancada.mjs:220-310`
- Test: `tools/mecanifica/olhar-bancada.test.mjs`

**Interfaces:**
- Produces: Auto-ativação transparente para peças fora do harness estático + erro imediato sem aguardar timeout caso a bancada reporte falha na inicialização.
- Consumes: `resolverCaminhoReceita`, `ativar-bancada.mjs` (ou lógica de ativação atômica)

- [ ] **Step 1: Escrever teste de unidade falhando para validação rápida de peça no `olhar-bancada`**

Adicionar em `tools/mecanifica/olhar-bancada.test.mjs`:
```javascript
it('rejeita imediatamente peça que não existe no harness nem no repositório sem timeout', async () => {
  await expect(olharBancada({
    peca: 'peca-inexistente-xyz',
    capturarEmMemoria: true,
  })).rejects.toThrowError(/não encontrada no catálogo/i);
});
```

- [ ] **Step 2: Executar teste para confirmar a falha**

Run: `npx vitest run tools/mecanifica/olhar-bancada.test.mjs -t "rejeita imediatamente"`
Expected: FAIL (tenta abrir URL e sofre timeout).

- [ ] **Step 3: Implementar auto-ativação e detecção antecipada em `olhar-bancada.mjs`**

No método `olharBancada` de `tools/mecanifica/olhar-bancada.mjs`:
1. Definir lista das fixtures nativas do harness: `const FIXTURES_HARNESS = ['fixture-visual', 'fixture-hierarquia', 'fixture-portas', 'fixture-sem-portas'];`
2. Se `peca` for informado e NÃO estiver em `FIXTURES_HARNESS`:
   - Tentar resolver via `resolverCaminhoReceita(peca)`.
   - Se não encontrar, disparar `erroDeUso(\`Peça '\${peca}' não encontrada no catálogo de fixtures nem em prototipos/procedural/v3/{pecas,maquinas}/.\`)`.
   - Se encontrar o arquivo `.js`:
     - Disparar ativação silenciosa da bancada para gerar `public/sessao-ativa.json`.
     - Logar: `[olhar-bancada] Peça '${peca}' ativada na sessão ativa.`
     - Configurar URL da bancada sem o parâmetro `?peca=`, para que ela consuma `sessao-ativa.json` normalmente via polling do sincronizador.
3. No `waitForFunction` do Playwright:
   - Adicionar checagem imediata de erro:
     ```javascript
     await page.waitForFunction(
       () => {
         const b = window.__mecanificaBancada;
         if (!b) return false;
         if (b.erro) throw new Error(b.erro);
         return b.carregado === true;
       },
       { timeout: 15000 },
     );
     ```

- [ ] **Step 4: Executar teste de unidade para confirmar aprovação**

Run: `npx vitest run tools/mecanifica/olhar-bancada.test.mjs -t "rejeita imediatamente"`
Expected: PASS.

- [ ] **Step 5: Testar visualização direta de peça pelo nome curto**

Run: `node tools/mecanifica/olhar-bancada.mjs --peca=mancal-guia --vistas=isometrica --auditoria`
Expected: Auto-ativação da sessão e captura concluída em poucos segundos sem timeout.

---

### Task 3: Documento Canônico `GUIA-AUTORIA-IA.md` e Atualização de Skills

**Files:**
- Create: `docs/mecanifica/usar/GUIA-AUTORIA-IA.md`
- Modify: `.claude/skills/criar-peca/SKILL.md:10-40`
- Modify: `docs/mecanifica/usar/README.md:10-25`
- Test: `npm run docs:estrutura:check`, `npm run docs:links:check`, `npm run mapa:check`

**Interfaces:**
- Produces: Guia canônico único e conciso (máximo 120 linhas) para agentes IA modelarem do zero.
- Consumes: Contratos vigentes em `docs/mecanifica/usar/`.

- [ ] **Step 1: Escrever `docs/mecanifica/usar/GUIA-AUTORIA-IA.md`**

Conteúdo estruturado:
1. **Quais Skills Consultar**: `criar-peca` (autoria geométrica) e `auditar-peca` (verificação).
2. **Esqueleto de Receita Procedural v3**: Exemplo mínimo completo com `meta`, `INTENCAO`, `PARAMS`, `MATERIAIS`, `ALIASES` e `PASSOS`.
3. **Armadilha Crítica de `ALIASES`**: A sintaxe obrigatória de união `{ unir: [{ origem: ... }, { origem: ... }] }`.
4. **Armadilha Crítica de `cilindro`**: `{ op: 'cilindro', id }` seleciona somente as faces laterais; unir `tampa: 'fundo'` e `tampa: 'topo'` no alias.
5. **A Esteira Sequencial de Ferramentas CLI**:
   - `npm run descrever -- <peca> --estrito` (validação de malha, 0 órfãos, 0 faces sem identidade).
   - `npm run conferir:juntas -- <peca>` (contato selado flush, ausência de cunhas/frestas).
   - `npm run ativar:bancada -- <peca>` (carga na sessão ativa 3D).
   - `node tools/mecanifica/olhar-bancada.mjs --auditoria --vistas=isometrica,frontal,superior` (captura visual limpa).
   - `npm run exportar:step -- <peca>` (exportação CAD sólida).

- [ ] **Step 2: Citar o novo guia em `.claude/skills/criar-peca/SKILL.md` (Gate G3)**

Adicionar link relativo para `docs/mecanifica/usar/GUIA-AUTORIA-IA.md` na seção de introdução e contratos de `criar-peca/SKILL.md`.

- [ ] **Step 3: Adicionar entrada na porta `docs/mecanifica/usar/README.md` (Gate G5)**

Adicionar linha na tabela de introdução de `docs/mecanifica/usar/README.md` mantendo o arquivo estritamente sob o teto de 60 linhas.

- [ ] **Step 4: Executar os gates de documentação e consistência**

Run:
```bash
npm run docs:estrutura:check
npm run docs:links:check
npm run mapa:check
```
Expected: Todos os comandos terminam com código 0 (sucesso).

---

### Task 4: Verificação Final Integrada

- [ ] **Step 1: Executar ciclo completo de validação com a peça `mancal-guia` usando a nova CLI flexível**

Run:
```bash
npm run descrever -- mancal-guia --estrito
npm run conferir:juntas -- mancal-guia
npm run ativar:bancada -- mancal-guia
node tools/mecanifica/olhar-bancada.mjs --auditoria --vistas=isometrica
npm run exportar:step -- mancal-guia --somente-validar
```
Expected: Todas as operações funcionam passando apenas o nome `mancal-guia`.

- [ ] **Step 2: Rodar suíte de testes e typecheck**

Run:
```bash
npm run typecheck
npx vitest run tools/mecanifica/resolver-caminho-receita.test.mjs tools/mecanifica/olhar-bancada.test.mjs
```
Expected: TypeScript sem erros e testes das novas funcionalidades aprovados.
