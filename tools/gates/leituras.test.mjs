/* leituras.test.mjs — o registro do que cada arquivo de teste lê, observado pelo fs e pelos processos filhos. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { lerLeituras, testesQueLeem } from './leituras.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const GANCHO = pathToFileURL(join(RAIZ, 'tools/gates/leituras.mjs')).href;
/* montados por partes para o gate de links não tomar os caminhos de ensaio por citação */
const DOC = ['docs', 'x.md'].join('/');
const NOVO = ['docs', 'novo.md'].join('/');

describe('registro de leituras', () => {
  it('anota o arquivo lido, a pasta listada, a leitura do processo node filho, a pasta do arquivo dado a outro programa e o git que lê conteúdo como quem lê tudo', () => {
    const dir = mkdtempSync(join(tmpdir(), 'leituras-'));
    const destino = join(dir, 'x.jsonl');
    const roteiro = `
      const { instalar } = await import(${JSON.stringify(GANCHO)});
      const fs = await import('node:fs');
      fs.writeFileSync(${JSON.stringify(destino)}, JSON.stringify({ teste: 'tools/x.test.mjs' }) + '\\n');
      instalar(${JSON.stringify(destino)});
      const cp = await import('node:child_process');
      fs.readFileSync('package.json'); fs.readdirSync('docs'); fs.readFileSync('node_modules/vitest/package.json');
      cp.execFileSync(process.execPath, ['-e', "require('fs').readFileSync('CLAUDE.md')"]);
      cp.spawnSync('git', ['status', '--short']);
      cp.spawnSync('python3', ['-c', 'pass', 'package.json']);
      cp.spawnSync('git', ['log', '-1', '--format=%cI']);
      cp.spawnSync('git', ['show', 'HEAD:package.json']);`;
    execFileSync(process.execPath, ['--input-type=module', '-e', roteiro], { cwd: RAIZ, env: { ...process.env, GATES_LEITURAS_DESTINO: '' } });
    const registro = lerLeituras(dir)['tools/x.test.mjs'];
    expect([...registro.arquivos].sort()).toEqual(['CLAUDE.md', 'package.json']);
    expect([...registro.pastas].sort()).toEqual(['', 'docs']);
    expect(registro.tudo).toBe(true);
    expect(readFileSync(destino, 'utf8')).not.toContain('node_modules');
    rmSync(dir, { recursive: true, force: true });
  });

  it('o teste que lê o arquivo, ou lista a pasta dele, ou lê tudo, é escolhido', () => {
    const r = (arquivos, pastas, tudo = false) => ({ arquivos: new Set(arquivos), pastas: new Set(pastas), tudo });
    const registro = { a: r([DOC], []), b: r([], ['docs']), c: r(['package.json'], []), d: r([], [], true) };
    expect(testesQueLeem(registro, [DOC])).toEqual(['a', 'b', 'd']);
    expect(testesQueLeem(registro, [NOVO])).toEqual(['b', 'd']);
  });
});
