/* caminho-procedural.test.ts — a raiz procedural é neutra: não volta a `fps`,
   que era o nome do jogo removido, nem a `prototipos`, que dizia experimento
   sobre o que o repositório inteiro depende. */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
/* Os nomes são montados por `join` para o próprio teste não virar uma ocorrência
   do que ele proíbe na varredura de `git grep` abaixo. */
const antigos = [['prototipos', 'fps', 'v3'].join('/'), ['prototipos', 'procedural', 'v3'].join('/')];
const atual = ['procedural', 'nucleo'].join('/');

describe('raiz procedural neutra', () => {
  it('não deixa consumidor executável reintroduzir uma raiz antiga', () => {
    expect(existsSync(resolve(REPO, atual))).toBe(true);
    for (const antigo of antigos) {
      expect(existsSync(resolve(REPO, antigo)), antigo).toBe(false);
      let encontrados = '';
      try {
        encontrados = execFileSync(
          'git',
          ['grep', '-n', '-I', antigo, '--', 'src', 'tools', '.github', '.claude'],
          { cwd: REPO, encoding: 'utf8' },
        ).trim();
      } catch (erro: any) {
        if (erro.status !== 1) throw erro;
        encontrados = String(erro.stdout ?? '').trim();
      }
      expect(encontrados, antigo).toBe('');
    }
  });
});
