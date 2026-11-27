/* juntar-a-main.test.mjs — o passo de juntar à main do CI em repositórios de verdade: avança a main quando ela não andou, junta
   a main andada ao ramo e dispara o CI de novo, para com conflito, e para depois de três tentativas. */
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = fileURLToPath(new URL('./juntar-a-main.sh', import.meta.url));
const pastas = [];
afterEach(() => { while (pastas.length) rmSync(pastas.pop(), { recursive: true, force: true }); });

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }).trim();
const gravar = (cwd, arquivo, texto, mensagem) => { writeFileSync(join(cwd, arquivo), texto); git(cwd, 'add', arquivo); git(cwd, 'commit', '-qm', mensagem); };

/* origem nua com a main, o clone do ramo e o clone da outra sessão; o `gh` falso grava os argumentos */
function cenario() {
  const raiz = mkdtempSync(join(tmpdir(), 'juntar-')); pastas.push(raiz);
  const origem = join(raiz, 'origem.git'); git(raiz, 'init', '-q', '--bare', '-b', 'main', origem);
  const ramo = join(raiz, 'ramo'); git(raiz, 'clone', '-q', origem, ramo);
  gravar(ramo, 'a.txt', 'a\n', 'base'); git(ramo, 'push', '-q', 'origin', 'HEAD:main');
  git(ramo, 'checkout', '-qb', 'claude/x'); gravar(ramo, 'b.txt', 'b\n', 'trabalho'); git(ramo, 'push', '-q', 'origin', 'HEAD:claude/x');
  const outra = join(raiz, 'outra'); git(raiz, 'clone', '-q', origem, outra);
  const bin = join(raiz, 'bin'); execFileSync('mkdir', [bin]);
  writeFileSync(join(bin, 'gh'), `#!/bin/sh\necho "$@" >> ${join(raiz, 'gh.log')}\n`); chmodSync(join(bin, 'gh'), 0o755);
  let gerador = 'true';
  const trocarGerador = (g) => { gerador = g; };
  const rodar = () => spawnSync('bash', [SCRIPT], { cwd: ramo, encoding: 'utf8', env: { ...process.env, RAMO: 'claude/x', GERADORES: gerador, PATH: `${bin}:${process.env.PATH}`, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
  const gh = () => { try { return readFileSync(join(raiz, 'gh.log'), 'utf8'); } catch { return ''; } };
  const andarAMain = (n) => { gravar(outra, `m${n}.txt`, `${n}\n`, `outra sessão ${n}`); git(outra, 'push', '-q', 'origin', 'HEAD:main'); };
  return { origem, ramo, outra, rodar, gh, andarAMain, trocarGerador };
}

describe('juntar à main', () => {
  it('com a main parada, avança a main até o ramo e não dispara nada', () => {
    const c = cenario();
    const r = c.rodar();
    expect(r.status).toBe(0);
    expect(git(c.ramo, 'rev-parse', 'HEAD')).toBe(git(c.origem, 'rev-parse', 'main'));
    expect(c.gh()).toBe('');
  });

  it('com a main andada sem conflito, junta a main ao ramo, envia o ramo e dispara o CI, sem mexer na main', () => {
    const c = cenario();
    gravar(c.outra, 'c.txt', 'c\n', 'outra sessão'); git(c.outra, 'push', '-q', 'origin', 'HEAD:main');
    const mainAntes = git(c.origem, 'rev-parse', 'main');
    const r = c.rodar();
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(git(c.origem, 'rev-parse', 'main')).toBe(mainAntes);
    expect(git(c.origem, 'log', '-1', '--format=%s', 'claude/x')).toBe('Junção automática da main, tentativa 1.');
    expect(spawnSync('git', ['merge-base', '--is-ancestor', mainAntes, 'claude/x'], { cwd: c.origem }).status).toBe(0);
    expect(c.gh()).toBe('workflow run ci.yml --ref claude/x\n');
    expect(git(c.origem, 'log', '-1', '--format=%P', 'claude/x').split(' ')).toHaveLength(2);
  });

  it('três junções seguidas contam 1, 2 e 3, e a quarta para', () => {
    const c = cenario();
    for (const n of [1, 2, 3]) {
      c.andarAMain(n);
      expect(c.rodar().status).toBe(0);
      expect(git(c.origem, 'log', '-1', '--format=%s', 'claude/x')).toBe(`Junção automática da main, tentativa ${n}.`);
    }
    c.andarAMain(4);
    const r = c.rodar();
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/andou três vezes seguidas/);
  });

  it('o que os geradores refazem entra no commit da junção', () => {
    const c = cenario();
    c.trocarGerador('echo gerado > gerado.txt');
    c.andarAMain(1);
    expect(c.rodar().status).toBe(0);
    expect(git(c.origem, 'show', 'claude/x:gerado.txt')).toBe('gerado');
  });

  it('a lista dos geradores da junção regera os dossiês dos objetos, antes do mapa', () => {
    const texto = readFileSync(SCRIPT, 'utf8');
    const lista = /^GERADORES_DO_REPOSITORIO='(.*)'$/m.exec(texto)[1].split(' && ');
    const dossie = lista.indexOf('npm run dossie -- --todos');
    expect(dossie).toBeGreaterThan(-1);
    expect(lista.at(-1)).toBe('node tools/mapa/mapa.mjs');
    expect(dossie).toBeLessThan(lista.length - 1);
  });

  it('o ramo já contido na main não gera junção nem CI', () => {
    const c = cenario();
    git(c.outra, 'fetch', '-q', 'origin', 'claude/x'); git(c.outra, 'merge', '-q', 'FETCH_HEAD'); git(c.outra, 'push', '-q', 'origin', 'HEAD:main');
    c.andarAMain(1);
    git(c.ramo, 'reset', '-q', '--hard', 'HEAD');
    const r = c.rodar();
    expect(r.status, r.stdout).toBe(0);
    expect(r.stdout).toMatch(/já está contido na main/);
    expect(c.gh()).toBe('');
  });

  it('com conflito, para sem enviar nada e diz o que fazer', () => {
    const c = cenario();
    gravar(c.outra, 'b.txt', 'outro b\n', 'conflita'); git(c.outra, 'push', '-q', 'origin', 'HEAD:main');
    const ramoAntes = git(c.origem, 'rev-parse', 'claude/x');
    const r = c.rodar();
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/não fecha sozinha \(conflito\); junte a main ao ramo/);
    expect(git(c.origem, 'rev-parse', 'claude/x')).toBe(ramoAntes);
    expect(c.gh()).toBe('');
  });

  it('a terceira tentativa ainda vale', () => {
    const c = cenario();
    git(c.ramo, 'commit', '-q', '--allow-empty', '-m', 'Junção automática da main, tentativa 2.');
    c.andarAMain(1);
    expect(c.rodar().status).toBe(0);
    expect(git(c.origem, 'log', '-1', '--format=%s', 'claude/x')).toBe('Junção automática da main, tentativa 3.');
  });

  it('depois da terceira tentativa, para em vez de juntar de novo', () => {
    const c = cenario();
    git(c.ramo, 'commit', '-q', '--allow-empty', '-m', 'Junção automática da main, tentativa 3.');
    gravar(c.outra, 'c.txt', 'c\n', 'outra sessão'); git(c.outra, 'push', '-q', 'origin', 'HEAD:main');
    const r = c.rodar();
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/andou três vezes seguidas/);
    expect(c.gh()).toBe('');
  });
});
