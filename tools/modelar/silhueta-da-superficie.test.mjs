import { describe, it, expect } from 'vitest';
import { extensoesPorFatia, fatiasIguais, recortarAoSlab } from './silhueta-da-superficie.mjs';

/* Teto grande: uma placa y = 1 de z = 0 a z = 10 em dois triângulos, só com vértices nas pontas. */
const teto = [
  [[-1, 1, 0], [1, 1, 0], [1, 1, 10]],
  [[-1, 1, 0], [1, 1, 10], [-1, 1, 10]],
];
/* Rampa: do chão em z = 0 até y = 10 em z = 10, também só com vértices nas pontas. */
const rampa = [[[0, 0, 0], [2, 0, 0], [2, 10, 10]], [[0, 0, 0], [2, 10, 10], [0, 10, 10]]];

describe('silhueta pela superfície', () => {
  it('lê a placa grande em toda fatia, onde os vértices deixariam as do meio vazias', () => {
    const fs = fatiasIguais(0, 10, 10);
    const porVertice = fs.map((f) => teto.flat().filter((p) => p[2] >= f.de && p[2] <= f.ate).length);
    expect(porVertice.filter((n) => n === 0).length).toBe(8);
    const ex = extensoesPorFatia(teto, 2, fs);
    for (const e of ex) { expect(e).not.toBeNull(); expect(e.min[1]).toBeCloseTo(1); expect(e.max[1]).toBeCloseTo(1); expect(e.min[0]).toBeCloseTo(-1); expect(e.max[0]).toBeCloseTo(1); }
  });

  it('lê a rampa pela altura que a superfície tem em cada fatia', () => {
    const ex = extensoesPorFatia(rampa, 2, fatiasIguais(0, 10, 10));
    ex.forEach((e, i) => { expect(e.min[1]).toBeCloseTo(i); expect(e.max[1]).toBeCloseTo(i + 1); });
  });

  it('lê fatias em y e devolve null onde nenhuma superfície passa', () => {
    const ex = extensoesPorFatia(teto, 1, [{ de: 0, ate: 0.5 }, { de: 0.5, ate: 1.5 }]);
    expect(ex[0]).toBeNull();
    expect(ex[1].min[2]).toBeCloseTo(0); expect(ex[1].max[2]).toBeCloseTo(10);
  });

  it('recorta o polígono nos dois limites do slab', () => {
    const p = recortarAoSlab(rampa[0], 2, 2, 4);
    expect(Math.min(...p.map((q) => q[2]))).toBeCloseTo(2);
    expect(Math.max(...p.map((q) => q[2]))).toBeCloseTo(4);
  });
});

describe('comparar-silhueta recusa fonte medida pelos vértices', () => {
  it('sai com 2 e pede para regerar quando falta "metodo": "superficie"', async () => {
    const { spawnSync } = await import('node:child_process');
    const { mkdtempSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'silh-'));
    const arq = join(dir, 'partes.json');
    writeFileSync(arq, JSON.stringify({ total: { tamanho: [1, 1, 1], minimo: [0, 0, 0], maximo: [1, 1, 1] }, silhueta: { porFatiaEmZ: [], porFatiaEmY: [] } }));
    const r = spawnSync(process.execPath, ['tools/modelar/comparar-silhueta.mjs', 'tools/fixtures/acervo/peca-de-prova/receita.js', arq], { encoding: 'utf8' });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/regere/);
  });
});
