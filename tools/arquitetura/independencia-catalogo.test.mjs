/* independencia-catalogo.test.mjs — a fronteira do núcleo: import de src/, tools/, modulos/ e das camadas de procedural/ acima dele reprova, .mjs e .ts entram na varredura, e o núcleo real passa. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { importsDoTexto, verificarFronteiraDoNucleo } from './independencia-catalogo.mjs';

const temporarios = [];
function raizCom(arquivos) {
  const raiz = mkdtempSync(join(tmpdir(), 'fronteira-'));
  temporarios.push(raiz);
  for (const [caminho, texto] of Object.entries(arquivos)) {
    mkdirSync(dirname(join(raiz, caminho)), { recursive: true });
    writeFileSync(join(raiz, caminho), texto);
  }
  return raiz;
}
afterEach(() => { while (temporarios.length) rmSync(temporarios.pop(), { recursive: true, force: true }); });

describe('fronteira do núcleo', () => {
  it('recusa import de src/ num fixture temporário, dizendo arquivo, linha e import', () => {
    const raiz = raizCom({ 'procedural/nucleo/x.js': "import { a } from './a.js';\nimport { b } from '../../src/x.js';\n" });
    const { problemas } = verificarFronteiraDoNucleo(raiz);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain("procedural/nucleo/x.js:2");
    expect(problemas[0]).toContain("'../../src/x.js'");
  });

  it('varre .mjs e .ts e reconhece export from, import dinâmico e import em várias linhas', () => {
    const raiz = raizCom({
      'procedural/nucleo/a.mjs': "export { f } from '../../tools/f.mjs';\n",
      'procedural/nucleo/b.ts': "const m = await import('../pecas/p.js');\n",
      'procedural/nucleo/c.js': "import {\n  x,\n} from '../extensoes/casca/manifesto.js';\n",
      'procedural/nucleo/d.js': "import m from 'manifold-3d';\nimport fs from 'node:fs';\nimport { z } from './sub/z.js';\n// import '../../src/comentario.js'\n/* import '../../tools/y.js' */\n",
    });
    const f = verificarFronteiraDoNucleo(raiz);
    expect(f.varridos).toBe(4);
    expect(f.problemas.map((p) => p.split(': ')[1])).toEqual([
      'procedural/nucleo/a.mjs:1', 'procedural/nucleo/b.ts:1', 'procedural/nucleo/c.js:1',
    ]);
  });

  it('deixa testes e fixtures fora da régua, e conta o teste que sobe de camada', () => {
    const raiz = raizCom({
      'procedural/nucleo/ok.js': "export const a = 1;\n",
      'procedural/nucleo/ok.test.mjs': "import { x } from '../../src/x.js';\n",
      'procedural/nucleo/fixture-mundo.js': "import '../../src/x.js';\n",
    });
    const f = verificarFronteiraDoNucleo(raiz);
    expect(f.problemas).toEqual([]);
    expect(f.testesQueSobem).toEqual(['procedural/nucleo/ok.test.mjs']);
  });

  it('lê import de pacote e de node: como livres', () => {
    expect(importsDoTexto("import a from 'manifold-3d';\nimport b from 'node:path';").map((i) => i.especificador)).toEqual(['manifold-3d', 'node:path']);
  });

  it('o núcleo real passa', () => {
    const f = verificarFronteiraDoNucleo();
    expect(f.problemas).toEqual([]);
    expect(f.varridos).toBeGreaterThan(50);
    expect(f.importsConferidos).toBeGreaterThan(50);
  });
});
