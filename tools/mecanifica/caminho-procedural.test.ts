/* caminho-procedural.test.ts — a raiz da Oficina é neutra e não volta a fps. */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const antigo = ['prototipos', 'fps', 'v3'].join('/');
const atual = ['prototipos', 'procedural', 'v3'].join('/');

describe('raiz procedural neutra', () => {
  it('remove a árvore fps e não deixa consumidor executável reintroduzi-la', () => {
    expect(existsSync(resolve(REPO, antigo))).toBe(false);
    expect(existsSync(resolve(REPO, atual))).toBe(true);
    let encontrados = '';
    try {
      encontrados = execFileSync(
        'git',
        ['grep', '-n', '-I', antigo, '--', 'src', 'tools', 'autoria-assistida', '.github', '.claude'],
        { cwd: REPO, encoding: 'utf8' },
      ).trim();
    } catch (erro: any) {
      if (erro.status !== 1) throw erro;
      encontrados = String(erro.stdout ?? '').trim();
    }
    expect(encontrados).toBe('');
  });
});
