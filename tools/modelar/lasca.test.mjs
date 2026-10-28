/* lasca.test.mjs — a lista de faces finas acha a lateral de uma aresta de 2,8 mm no perfil de uma perua, e diz a parte, a razão, os
   cantos em milímetro e o passo que criou a face. (A primeira fixture era a subtração de dois cilindros, que dava duas lascas na
   booleana; a fatia 10 do plano de ajustes no núcleo as fundiu, e o caso passou a `booleana-colinear.test.mjs`.) */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import receita from './fixtures/lasca/receita.js';
import { lascasDaReceita, formatarLascas } from './lasca.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE = 'tools/modelar/fixtures/lasca/receita.js';

describe('lasca: a aresta de 2,8 mm no canto do teto do perfil da perua', () => {
  const { lascas, orfaos } = lascasDaReceita(receita);

  it('acha exatamente a lateral dessa aresta, da parte e do passo da extrusão', () => {
    expect(orfaos).toEqual([]);
    expect(lascas).toHaveLength(1);
    const [l] = lascas;
    expect(l.parte).toBe('carroceria');
    expect(l.razao).toBeGreaterThan(1.2e-3);
    expect(l.razao).toBeLessThan(1.5e-3);
    expect(l.passo).toBe(0);
    expect(l.operacao).toBe('extrusao');
    expect(l.origemId).toBe(1);
  });

  it('dá os cantos em milímetro: a lasca tem a largura da carroceria e menos de 3 mm nos outros dois eixos', () => {
    const [l] = lascas;
    expect(l.cantos).toHaveLength(4);
    const xs = l.cantos.map((c) => c.mm[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(2110, 6);
    for (const eixo of [1, 2]) {
      const vs = l.cantos.map((c) => c.mm[eixo]);
      expect(Math.max(...vs) - Math.min(...vs)).toBeLessThan(3);
    }
  });

  it('lista na ordem do id da face e escreve a linha com parte, razão, passo e cantos', () => {
    expect(lascas.map((l) => l.face)).toEqual([...lascas.map((l) => l.face)].sort((a, b) => a - b));
    const texto = formatarLascas('ensaio', { lascas, orfaos });
    expect(texto).toContain('ensaio: 1 face(s) fina(s)');
    expect(texto).toContain('parte carroceria');
    expect(texto).toContain('passo 0 (extrusao origemId 1)');
    expect(texto).toContain('cantos em mm:');
  });

  it('com o limite abaixo da razão da lasca, nenhuma é listada', () => {
    expect(lascasDaReceita(receita, { limite: 1e-3 }).lascas).toEqual([]);
  });

  it('a mesma receita dá a mesma lista duas vezes', () => {
    expect(lascasDaReceita(receita).lascas).toEqual(lascas);
  });
});

describe('lasca: linha de comando', () => {
  const rodar = (...args) => spawnSync(process.execPath, ['tools/modelar/lasca.mjs', ...args], { cwd: REPO, encoding: 'utf8' });

  it('sai com 1 e escreve a face quando há lasca', () => {
    const r = rodar(FIXTURE);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('1 face(s) fina(s)');
    expect(r.stdout).toMatch(/face \d+ · parte carroceria · razão 1\.3\de-3 · passo 0 \(extrusao origemId 1\)/);
  });

  it('com --json devolve a lista estruturada', () => {
    const r = rodar(FIXTURE, '--json');
    expect(r.status).toBe(1);
    expect(JSON.parse(r.stdout).lascas).toHaveLength(1);
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
