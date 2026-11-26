/* ramos-parados.test.mjs — num repositório de brinquedo com remoto, a lista traz só os ramos claude/** e envio/** com commit fora da
   main, e marca a recusa do juntar quando a main andou desde a base. */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { descrever, ramosParados } from './ramos-parados.mjs';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function repositorio() {
  const base = mkdtempSync(join(tmpdir(), 'ramos-parados-'));
  const remoto = join(base, 'remoto.git'), local = join(base, 'local');
  git(base, 'init', '-q', '--bare', '-b', 'main', remoto);
  git(base, 'init', '-q', '-b', 'main', local);
  git(local, 'config', 'user.email', 'teste@exemplo'); git(local, 'config', 'user.name', 'teste');
  let n = 0;
  const commit = () => { writeFileSync(join(local, 'a.txt'), String(n++)); git(local, 'add', '.'); git(local, 'commit', '-q', '-m', `c${n}`); };
  commit();
  git(local, 'remote', 'add', 'origin', remoto);
  git(local, 'push', '-q', 'origin', 'main');
  /* em dia: um commit à frente da main, que não andou */
  git(local, 'checkout', '-q', '-b', 'claude/em-dia'); commit(); git(local, 'push', '-q', 'origin', 'claude/em-dia');
  /* parado: um commit à frente, e a main anda depois */
  git(local, 'checkout', '-q', 'main'); git(local, 'checkout', '-q', '-b', 'envio/parado'); commit(); git(local, 'push', '-q', 'origin', 'envio/parado');
  /* já juntado e fora do prefixo */
  git(local, 'checkout', '-q', 'main'); git(local, 'push', '-q', 'origin', 'main:claude/juntado');
  git(local, 'checkout', '-q', '-b', 'prova/outro'); commit(); git(local, 'push', '-q', 'origin', 'prova/outro');
  git(local, 'checkout', '-q', 'main'); git(local, 'merge', '-q', '--ff-only', 'claude/em-dia'); git(local, 'push', '-q', 'origin', 'main');
  git(local, 'checkout', '-q', '-b', 'claude/em-dia-2'); commit(); git(local, 'push', '-q', 'origin', 'claude/em-dia-2');
  git(local, 'fetch', '-q', 'origin');
  return local;
}

describe('ramos:parados', () => {
  it('lista só os ramos com commit fora da main e marca a recusa do juntar', () => {
    const ramos = ramosParados({ cwd: repositorio() });
    const porNome = Object.fromEntries(ramos.map((r) => [r.nome, r]));
    expect(Object.keys(porNome).sort()).toEqual(['claude/em-dia-2', 'envio/parado']);
    expect(porNome['envio/parado']).toMatchObject({ commitsForaDaMain: 1, commitsDaMainQueFaltam: 1, juntarRecusa: true });
    expect(porNome['claude/em-dia-2']).toMatchObject({ commitsForaDaMain: 1, commitsDaMainQueFaltam: 0, juntarRecusa: false });
    expect(descrever(ramos)).toContain('envio/parado: 1 commit(s) fora da main, a main andou 1 commit(s)');
  });

  it('diz quando não há ramo parado', () => {
    expect(descrever([])).toMatch(/Nenhum ramo/);
  });
});
