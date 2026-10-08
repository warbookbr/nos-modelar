/* nucleo-sem-three.test.mjs — o invariante "o núcleo de autoria é independente de Three.js", conferido por máquina: o núcleo
   real não importa Three.js, e um arquivo que importe reprova com o arquivo, a linha e a regra. */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXCECOES, excecoesVelhas, importacoesDeThree, PASTAS_DO_NUCLEO, verificarNucleoSemThree } from './nucleo-sem-three.mjs';

function arvore(arquivos) {
  const raiz = mkdtempSync(join(tmpdir(), 'nucleo-sem-three-'));
  for (const [relativo, texto] of Object.entries(arquivos)) {
    mkdirSync(dirname(join(raiz, relativo)), { recursive: true });
    writeFileSync(join(raiz, relativo), texto);
  }
  return raiz;
}

describe('o núcleo de autoria do repositório', () => {
  it('não importa Three.js fora dos adaptadores declarados', () => {
    expect(verificarNucleoSemThree()).toEqual([]);
  });

  it('cobre as pastas do núcleo, e cada exceção ainda existe e ainda importa Three.js', () => {
    expect(PASTAS_DO_NUCLEO).toEqual(expect.arrayContaining(['procedural/nucleo', 'procedural/pecas', 'src/autoria']));
    expect(excecoesVelhas()).toEqual([]);
    for (const motivo of EXCECOES.values()) expect(motivo.length).toBeGreaterThan(10);
  });
});

describe('o teste reprova o núcleo que importa Three.js', () => {
  it('dizendo o arquivo, a linha e a regra', () => {
    const raiz = arvore({
      'procedural/nucleo/malha.js': "import { vec } from './geo.js';\nimport * as THREE from 'three';\nexport const x = 1;\n",
      'procedural/pecas/roda/receita.js': "import { Vector3 } from 'three/src/math/Vector3.js';\n",
      'modulos/esboco/src/camada.js': "const THREE = await import('three');\n",
      'src/autoria/executar.js': "const T = require('three');\n",
    });
    const problemas = verificarNucleoSemThree(raiz, { excecoes: new Map() });
    expect(problemas).toHaveLength(4);
    expect(problemas.join('\n')).toMatch(/modulos\/esboco\/src\/camada\.js:1: importa Three\.js/);
    expect(problemas.join('\n')).toContain("procedural/nucleo/malha.js:2: importa Three.js (import * as THREE from 'three';)");
    expect(problemas.join('\n')).toContain('O núcleo de autoria é independente de Three.js');
  });

  it('e deixa passar comentário, nome parecido e o adaptador declarado', () => {
    const raiz = arvore({
      'procedural/nucleo/a.js': "// import * as THREE from 'three';\n/* o three entra só no adaptador */\nimport { x } from './threejs-like.js';\nconst t = 'three';\n",
      'src/autoria/adaptar-three.js': "import * as THREE from 'three';\n",
      'src/bancada/main.js': "import * as THREE from 'three';\n",
    });
    expect(verificarNucleoSemThree(raiz, { excecoes: new Map([['src/autoria/adaptar-three.js', 'adaptador']]) })).toEqual([]);
  });

  it('e recusa a exceção que sumiu ou deixou de importar Three.js', () => {
    const raiz = arvore({ 'src/autoria/adaptar-three.js': 'export const x = 1;\n' });
    expect(excecoesVelhas(raiz, new Map([['src/autoria/adaptar-three.js', 'a'], ['src/autoria/sumiu.js', 'b']]))).toEqual(['src/autoria/adaptar-three.js', 'src/autoria/sumiu.js']);
  });

  it('reconhece as formas de importar', () => {
    for (const linha of ["import THREE from 'three'", 'import * as T from "three"', "import 'three'", "const a = await import('three')", "const a = require('three')", "export { Mesh } from 'three'", "import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'"]) {
      expect(importacoesDeThree(linha), linha).toHaveLength(1);
    }
    expect(importacoesDeThree("import x from 'three-mesh-bvh'")).toEqual([]);
  });
});
