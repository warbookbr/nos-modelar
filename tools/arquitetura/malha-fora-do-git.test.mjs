/* malha-fora-do-git.test.mjs — nenhuma malha importada (.obj ou .mtl) entra no versionamento: o `.gitignore` as cobre, e nenhuma está rastreada. */
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' });

describe('malhas importadas', () => {
  it('nenhum .obj nem .mtl está rastreado pelo git', () => {
    const rastreados = git('ls-files').stdout.split('\n').filter((f) => /\.(obj|mtl)$/i.test(f));
    expect(rastreados).toEqual([]);
  });

  it('o .gitignore cobre .obj, .mtl e a pasta importados/', () => {
    for (const caminho of ['qualquer/lugar/modelo.obj', 'modelo.mtl', 'importados/dentro/qualquer-coisa.txt']) {
      expect(git('check-ignore', '-q', caminho).status, caminho).toBe(0);
    }
  });
});
