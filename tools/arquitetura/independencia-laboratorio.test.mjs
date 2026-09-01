import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { verificarIndependenciaLaboratorio } from './independencia-laboratorio.mjs';

const temporarios = [];
const GUARDA = fileURLToPath(new URL('./independencia-laboratorio.mjs', import.meta.url));

function repositorioCom(arquivos) {
  const repo = mkdtempSync(join(tmpdir(), 'mecanifica-lab-guarda-'));
  temporarios.push(repo);
  execFileSync('git', ['init', '--quiet'], { cwd: repo });

  for (const [relativo, conteudo] of Object.entries(arquivos)) {
    const destino = join(repo, relativo);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, conteudo, 'utf8');
  }

  execFileSync('git', ['-c', 'core.autocrlf=false', 'add', '.'], { cwd: repo });
  return repo;
}

afterEach(() => {
  while (temporarios.length) rmSync(temporarios.pop(), { recursive: true, force: true });
});

describe('fronteira de isolamento do laboratório', () => {
  it('recusa import Python do laboratório vindo da Mecanifica', () => {
    const repo = repositorioCom({
      'src/consumidor.py': 'from laboratorio.erros import falhar\n',
      'laboratorio/src/laboratorio/erros.py': '',
    });

    expect(verificarIndependenciaLaboratorio({ repo })).toEqual([
      expect.stringMatching(/src\/consumidor\.py:1.*importa laboratorio/i),
    ]);
  });

  it('recusa import Python do laboratório antes de terminador e comentário', () => {
    const repo = repositorioCom({
      'src/consumidor.py': 'import laboratorio; # dependência reversa\n',
      'laboratorio/src/laboratorio/__init__.py': '',
    });

    expect(verificarIndependenciaLaboratorio({ repo })).toEqual([
      expect.stringMatching(/src\/consumidor\.py:1.*importa laboratorio/i),
    ]);
  });

  it('encerra a CLI com código não zero diante da dependência reversa', () => {
    const repo = repositorioCom({
      'src/consumidor.py': 'from laboratorio.erros import falhar\n',
      'laboratorio/src/laboratorio/erros.py': '',
    });

    const resultado = spawnSync(process.execPath, [GUARDA, `--repo=${repo}`], { encoding: 'utf8' });

    expect(resultado.status).toBe(1);
    expect(resultado.stderr).toMatch(/src\/consumidor\.py:1/);
  });

  it('recusa import JavaScript relativo do laboratório vindo da Mecanifica', () => {
    const repo = repositorioCom({
      'src/consumidor.js': "import '../laboratorio/src/laboratorio/erros.js';\n",
      'laboratorio/src/laboratorio/erros.js': '',
    });

    expect(verificarIndependenciaLaboratorio({ repo })).toEqual([
      expect.stringMatching(/src\/consumidor\.js:1.*importa laboratorio/i),
    ]);
  });

  it('recusa require side-effect do laboratório vindo da Mecanifica', () => {
    const repo = repositorioCom({
      'src/consumidor.cjs': "require('../laboratorio/src/laboratorio/erros.js');\n",
      'laboratorio/src/laboratorio/erros.js': '',
    });

    expect(verificarIndependenciaLaboratorio({ repo })).toEqual([
      expect.stringMatching(/src\/consumidor\.cjs:1.*importa laboratorio/i),
    ]);
  });

  it('recusa import JavaScript estático escrito em várias linhas', () => {
    const repo = repositorioCom({
      'src/consumidor.js': [
        'import {',
        '  falhar,',
        "} from '../laboratorio/src/laboratorio/erros.js';",
        '',
      ].join('\n'),
      'laboratorio/src/laboratorio/erros.js': '',
    });

    expect(verificarIndependenciaLaboratorio({ repo })).toEqual([
      expect.stringMatching(/src\/consumidor\.js:1.*importa laboratorio/i),
    ]);
  });

  it('recusa dependência do núcleo do laboratório em porta Mecanifica', () => {
    const repo = repositorioCom({
      'laboratorio/src/laboratorio/instrumento.mjs': "import '../../../src/autoria/executar-receita.js';\n",
      'src/autoria/executar-receita.js': '',
    });

    expect(verificarIndependenciaLaboratorio({ repo })).toEqual([
      expect.stringMatching(/laboratorio\/src\/laboratorio\/instrumento\.mjs:1.*porta Mecanifica/i),
    ]);
  });

  it('recusa module.exports com require de porta Mecanifica fora do adaptador', () => {
    const repo = repositorioCom({
      'laboratorio/src/laboratorio/instrumento.cjs': "module.exports = require('../../../src/autoria/executar-receita.js');\n",
      'src/autoria/executar-receita.js': '',
    });

    expect(verificarIndependenciaLaboratorio({ repo })).toEqual([
      expect.stringMatching(/laboratorio\/src\/laboratorio\/instrumento\.cjs:1.*porta Mecanifica/i),
    ]);
  });

  it('recusa dependência Python do núcleo do laboratório em porta Mecanifica', () => {
    const repo = repositorioCom({
      'laboratorio/src/laboratorio/instrumento.py': 'from src.autoria import executar_receita\n',
      'src/autoria/__init__.py': '',
    });

    expect(verificarIndependenciaLaboratorio({ repo })).toEqual([
      expect.stringMatching(/laboratorio\/src\/laboratorio\/instrumento\.py:1.*porta Mecanifica/i),
    ]);
  });

  it('aceita dependência Mecanifica confinada ao adaptador mecanifica-node', () => {
    const repo = repositorioCom({
      'laboratorio/adaptadores/mecanifica-node/ponte.mjs': "import '../../../src/autoria/executar-receita.js';\n",
      'src/autoria/executar-receita.js': '',
    });

    expect(verificarIndependenciaLaboratorio({ repo })).toEqual([]);
  });
});
