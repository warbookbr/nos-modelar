/* Testes de vistas-da-receita.mjs: os polígonos da receita em milímetro com as partes na ordem de aparição e a folha de seis vistas pela linha de comando. */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { poligonosDaReceita } from './vistas-da-receita.mjs';
import receitaBase from './fixtures/veiculo-caixa/receita.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../..');

describe('vistas da receita', () => {
  it('lê os polígonos da receita em milímetro, com as partes na ordem de aparição', () => {
    const d = poligonosDaReceita(receitaBase);
    expect(d.partes).toEqual(['corpo', 'cabine']);
    expect(d.nome).toBe('veiculo-caixa');
    const ys = d.polis.flatMap(({ p }) => p.map((v) => v[1]));
    expect(Math.min(...ys)).toBeCloseTo(200, 3); expect(Math.max(...ys)).toBeCloseTo(1500, 3);
  });

  it('na linha de comando escreve a folha de seis vistas (três colunas de 620 px)', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'vr-'));
    try {
      const r = spawnSync('node', [join(AQUI, 'vistas-da-receita.mjs'), join(AQUI, 'fixtures/veiculo-caixa/receita.js'), '--saida', join(pasta, 'v.png')], { cwd: REPO, encoding: 'utf8' });
      expect(r.status, r.stderr).toBe(0);
      expect(existsSync(join(pasta, 'v.png'))).toBe(true);
      expect(PNG.sync.read(readFileSync(join(pasta, 'v.png'))).width).toBeGreaterThanOrEqual(3 * 620);
      expect(r.stdout).toMatch(/2 partes/);
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  }, 60000);
});
