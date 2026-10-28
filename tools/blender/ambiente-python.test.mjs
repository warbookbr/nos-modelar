/* ambiente-python.test.mjs — do_ambiente (tools/blender/ambiente.py), o par em Python de doAmbiente: o nome novo vale, o antigo
   vale com um aviso só por nome na saída de erro, e o vazio conta como ausente. Roda no python3 do sistema, sem Blender; o
   último caso importa comum.py com o Blender trocado por módulos de mentira e confere que ele reexporta a mesma função. */
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const AQUI = dirname(fileURLToPath(import.meta.url));

const roda = (codigo, env) => {
  const limpo = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(MODELAR|MECANIFICA)_/.test(k)));
  const r = spawnSync('python3', ['-c', codigo, AQUI], { env: { ...limpo, ...env }, encoding: 'utf8' });
  expect(r.status, r.stderr).toBe(0);
  return r;
};

const LE = `
import sys
sys.path.insert(0, sys.argv[1])
from ambiente import do_ambiente
print(repr(do_ambiente('TESTE', 'padrao')))
print(repr(do_ambiente('TESTE', 'padrao')))
`;

describe('do_ambiente', () => {
  it('lê o nome novo sem aviso, mesmo com o antigo definido', () => {
    const r = roda(LE, { MODELAR_TESTE: 'novo', MECANIFICA_TESTE: 'velho' });
    expect(r.stdout).toBe("'novo'\n'novo'\n");
    expect(r.stderr).toBe('');
  });

  it('lê o nome antigo e avisa uma vez só', () => {
    const r = roda(LE, { MECANIFICA_TESTE: 'velho' });
    expect(r.stdout).toBe("'velho'\n'velho'\n");
    expect(r.stderr.trim().split('\n')).toHaveLength(1);
    expect(r.stderr).toMatch(/MECANIFICA_TESTE é o nome antigo; use MODELAR_TESTE/);
  });

  it('o vazio conta como ausente e devolve o padrão', () => {
    const r = roda(LE, { MODELAR_TESTE: '', MECANIFICA_TESTE: '' });
    expect(r.stdout).toBe("'padrao'\n'padrao'\n");
    expect(r.stderr).toBe('');
    expect(roda(LE, { MODELAR_TESTE: '', MECANIFICA_TESTE: 'velho' }).stdout).toBe("'velho'\n'velho'\n");
  });

  it('comum.py reexporta a mesma função', () => {
    const codigo = `
import sys
from unittest.mock import MagicMock
for m in ('bpy', 'bmesh', 'numpy', 'mathutils', 'mathutils.bvhtree', 'mathutils.kdtree'):
    sys.modules[m] = MagicMock()
sys.path.insert(0, sys.argv[1])
import comum, ambiente
print(comum.do_ambiente is ambiente.do_ambiente, repr(comum.python_do_sistema()))
`;
    const r = roda(codigo, { MECANIFICA_PYTHON: 'py-antigo' });
    expect(r.stdout.trim()).toBe("True 'py-antigo'");
    expect(r.stderr).toMatch(/MODELAR_PYTHON/);
  });
});
