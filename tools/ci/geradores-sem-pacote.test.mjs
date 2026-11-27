/* geradores-sem-pacote.test.mjs — cada gerador que o passo "Juntar à main" do CI roda (`GERADORES_DO_REPOSITORIO` em juntar-a-main.sh)
   carrega sem `node_modules`: o job da junção não faz `npm ci`, e um gerador que importa `pngjs`, `earcut` ou `three` (direto ou por outro módulo
   do repositório) quebra a junção só quando a main anda. A conferência segue os imports relativos, estáticos e com especificador literal, de
   cada arquivo `.mjs`/`.js` que o gerador alcança, e recusa o especificador que não é `node:` nem relativo, com o caminho que o trouxe.
   Não executa o gerador (alguns gravam arquivos). */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const ESPECIFICADOR = /(?:\bimport|\bexport)\s*(?:[^'";()]*?\s*from\s*)?['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Os arquivos `node <arquivo>` e os comandos `npm run <script>` da lista de geradores da junção, resolvidos para arquivo. */
export function geradoresDaJuncao(raiz = REPO) {
  const sh = readFileSync(join(raiz, 'tools/ci/juntar-a-main.sh'), 'utf8');
  const lista = /^GERADORES_DO_REPOSITORIO='([^']*)'/m.exec(sh)?.[1];
  if (!lista) throw new Error('juntar-a-main.sh: GERADORES_DO_REPOSITORIO não achado');
  const scripts = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8')).scripts;
  return lista.split('&&').map((c) => c.trim()).map((c) => {
    const npm = /^npm run (\S+)/.exec(c);
    const comando = npm ? scripts[npm[1]] : c;
    const arquivo = /^node (\S+)/.exec(comando ?? '')?.[1];
    if (!arquivo) throw new Error(`gerador sem arquivo node: ${c}`);
    return { comando: c, arquivo };
  });
}

/** Os especificadores de pacote (nem `node:` nem relativos) alcançados por `entrada`: `[{ de, especificador }]`. */
export function pacotesAlcancados(entrada, raiz = REPO) {
  const vistos = new Set();
  const achados = [];
  const pilha = [resolve(raiz, entrada)];
  const arquivo = (c) => existsSync(c) && statSync(c).isFile();
  while (pilha.length) {
    const atual = pilha.pop();
    if (vistos.has(atual) || !/\.m?js$/.test(atual)) continue;
    vistos.add(atual);
    for (const [, estatico, dinamico] of readFileSync(atual, 'utf8').matchAll(ESPECIFICADOR)) {
      const e = estatico ?? dinamico;
      if (e.startsWith('node:')) continue;
      if (!e.startsWith('./') && !e.startsWith('../')) { achados.push({ de: relative(raiz, atual), especificador: e }); continue; }
      const base = resolve(dirname(atual), e);
      const alvo = [base, `${base}.js`, `${base}.mjs`, join(base, 'index.js')].find(arquivo);
      if (alvo) pilha.push(alvo);
    }
  }
  return achados;
}

describe('os geradores da junção do CI não pedem node_modules', () => {
  it('lê a lista do juntar-a-main.sh e acha o gerador do dossiê entre eles', () => {
    const lista = geradoresDaJuncao();
    expect(lista.length).toBeGreaterThan(8);
    expect(lista.map((g) => g.arquivo)).toContain('tools/modelar/dossie-do-objeto.mjs');
  });

  it.each(geradoresDaJuncao().map((g) => [g.comando, g.arquivo]))('%s carrega só com node: e módulos do repositório', (_comando, arquivo) => {
    expect(pacotesAlcancados(arquivo)).toEqual([]);
  });

  describe('a conferência acusa o pacote que um gerador alcança', () => {
    const pastas = [];
    afterAll(() => { for (const p of pastas) rmSync(p, { recursive: true, force: true }); });
    it('importado direto, por outro módulo e por import dinâmico literal', () => {
      const raiz = mkdtempSync(join(tmpdir(), 'sem-pacote-')); pastas.push(raiz);
      mkdirSync(join(raiz, 'sub'));
      writeFileSync(join(raiz, 'gerador.mjs'), "import { readFileSync } from 'node:fs';\nimport { x } from './sub/modulo.mjs';\nawait import('earcut');\n");
      writeFileSync(join(raiz, 'sub', 'modulo.mjs'), "import { PNG } from 'pngjs';\nexport const x = PNG;\n");
      expect(pacotesAlcancados('gerador.mjs', raiz)).toEqual([
        { de: 'gerador.mjs', especificador: 'earcut' },
        { de: join('sub', 'modulo.mjs'), especificador: 'pngjs' },
      ]);
    });
  });
});
