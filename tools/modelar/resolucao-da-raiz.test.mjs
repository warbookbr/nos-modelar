/* O pacote que a cópia isolada não tem vem da raiz do repositório principal (`resolucao-da-raiz.mjs`). O caso é o do atrito: um
   worktree sem `node_modules` rodando um script que importa um pacote. A prova monta, num diretório temporário, um repositório
   principal com `node_modules/pacote-da-raiz` e uma cópia cujo `.git` aponta para ele, e roda o mesmo script com e sem a resolução. */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { raizPrincipalDe } from './resolucao-da-raiz.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
let base; let principal; let copia; let solta;

const rodar = (cwd, ...args) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });

beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'raiz-'));
  principal = join(base, 'principal');
  copia = join(base, 'copia');
  solta = join(base, 'solta');
  mkdirSync(join(principal, '.git/worktrees/copia'), { recursive: true });
  mkdirSync(join(principal, 'node_modules/pacote-da-raiz'), { recursive: true });
  writeFileSync(join(principal, 'node_modules/pacote-da-raiz/package.json'), '{"name":"pacote-da-raiz","type":"module","exports":"./i.js"}');
  writeFileSync(join(principal, 'node_modules/pacote-da-raiz/i.js'), 'export const valor = "veio da raiz";');
  for (const pasta of [copia, solta]) {
    mkdirSync(join(pasta, 'tools/modelar'), { recursive: true });
    cpSync(join(AQUI, 'resolucao-da-raiz.mjs'), join(pasta, 'tools/modelar/resolucao-da-raiz.mjs'));
    writeFileSync(join(pasta, 'usa.mjs'), "import { valor } from 'pacote-da-raiz'; console.log(valor);");
    writeFileSync(join(pasta, 'usa-dinamico.mjs'), "const { valor } = await import('pacote-da-raiz'); console.log(valor);");
  }
  writeFileSync(join(copia, '.git'), `gitdir: ${join(principal, '.git/worktrees/copia')}\n`);
  mkdirSync(join(solta, '.git'));
});
afterAll(() => rmSync(base, { recursive: true, force: true }));

describe('resolucao-da-raiz', () => {
  it('sem a resolução a cópia não acha o pacote (o atrito)', () => {
    const r = rodar(copia, 'usa.mjs');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/Cannot find package 'pacote-da-raiz'/);
  });

  it('com a resolução a cópia usa o pacote do repositório principal, no import estático e no dinâmico', () => {
    for (const script of ['usa.mjs', 'usa-dinamico.mjs']) {
      const r = rodar(copia, '--import', './tools/modelar/resolucao-da-raiz.mjs', script);
      expect(r.stderr).toBe('');
      expect(r.stdout.trim()).toBe('veio da raiz');
    }
  });

  it('só procura a raiz principal numa cópia: um .git que é pasta não registra nada', () => {
    expect(raizPrincipalDe(copia)).toBe(principal);
    expect(raizPrincipalDe(solta)).toBeNull();
    const r = rodar(solta, '--import', './tools/modelar/resolucao-da-raiz.mjs', 'usa.mjs');
    expect(r.status).not.toBe(0);
  });
});
