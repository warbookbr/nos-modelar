/* lasca.test.mjs — a lista de faces finas acha as duas lascas da subtração de dois cilindros de 8 lados num perfil de perua, e diz a
   parte, a razão, os cantos em milímetro e o passo que criou cada uma. */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import receita from './fixtures/lasca/receita.js';
import { lascasDaReceita, formatarLascas } from './lasca.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE = 'tools/modelar/fixtures/lasca/receita.js';

describe('lasca: a subtração de dois cilindros no perfil da perua', () => {
  const { lascas, orfaos } = lascasDaReceita(receita);

  it('acha exatamente as duas lascas, da parte e do passo da subtração', () => {
    expect(orfaos).toEqual([]);
    expect(lascas).toHaveLength(2);
    for (const l of lascas) {
      expect(l.parte).toBe('carroceria');
      expect(l.razao).toBeGreaterThan(1.8e-3);
      expect(l.razao).toBeLessThan(2.0e-3);
      expect(l.passo).toBe(3);
      expect(l.operacao).toBe('subtrair');
      expect(l.origemId).toBe(30);
    }
  });

  it('dá os cantos em milímetro: a lasca tem a largura da carroceria e menos de 8 mm de altura', () => {
    for (const l of lascas) {
      expect(l.cantos).toHaveLength(3);
      const xs = l.cantos.map((c) => c.mm[0]);
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(2110, 6);
      const ys = l.cantos.map((c) => c.mm[1]);
      expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(8);
    }
  });

  it('lista na ordem do id da face e escreve a linha com parte, razão, passo e cantos', () => {
    expect(lascas.map((l) => l.face)).toEqual([...lascas.map((l) => l.face)].sort((a, b) => a - b));
    const texto = formatarLascas('ensaio', { lascas, orfaos });
    expect(texto).toContain('ensaio: 2 face(s) fina(s)');
    expect(texto).toContain('parte carroceria');
    expect(texto).toContain('passo 3 (subtrair origemId 30)');
    expect(texto).toContain('cantos em mm:');
  });

  it('com o limite abaixo da razão das lascas, nenhuma é listada', () => {
    expect(lascasDaReceita(receita, { limite: 1e-3 }).lascas).toEqual([]);
  });

  it('a mesma receita dá a mesma lista duas vezes', () => {
    expect(lascasDaReceita(receita).lascas).toEqual(lascas);
  });
});

describe('lasca: linha de comando', () => {
  const rodar = (...args) => spawnSync(process.execPath, ['tools/modelar/lasca.mjs', ...args], { cwd: REPO, encoding: 'utf8' });

  it('sai com 1 e escreve as duas faces quando há lasca', () => {
    const r = rodar(FIXTURE);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('2 face(s) fina(s)');
    expect(r.stdout).toMatch(/face \d+ · parte carroceria · razão 1\.9\de-3 · passo 3 \(subtrair origemId 30\)/);
  });

  it('com --json devolve a lista estruturada', () => {
    const r = rodar(FIXTURE, '--json');
    expect(r.status).toBe(1);
    expect(JSON.parse(r.stdout).lascas).toHaveLength(2);
  });

  it('sai com 0 quando o limite não alcança nenhuma face', () => {
    const r = rodar(FIXTURE, '--limite=0.001');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('nenhuma face fina');
  });

  it('sai com 2 sem a receita, com bandeira desconhecida e com receita inexistente', () => {
    expect(rodar().status).toBe(2);
    expect(rodar(FIXTURE, '--limit=1').status).toBe(2);
    expect(rodar('peca-que-nao-existe').status).toBe(2);
  });
});
