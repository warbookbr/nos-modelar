/* subdivisao.test.mjs — a subdivisão Catmull-Clark e a operação `subdivisao` contra a saída congelada do oráculo, com determinismo e vértice sem face. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { subdividirCatmullClark, espelharGaiolaEmX, nitidezDoVinco } from './subdivisao.js';
import { neutroCanonico, nucleo } from './entrada.js';

const oraculo = JSON.parse(readFileSync(new URL('./fixtures/subdivisao-oraculo-blender.json', import.meta.url)));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const desvio = (P, Q) => Math.max(...P.map((p) => Math.min(...Q.map((q) => dist(p, q)))));

describe('subdivisão Catmull-Clark com vincos', () => {
  for (const caso of oraculo.casos) {
    for (const n of caso.niveis) {
      it(`confere com o Blender: ${caso.nome}, ${n} nível(is)`, () => {
        const r = subdividirCatmullClark({
          vertices: caso.vertices, faces: caso.faces, niveis: n, borda: caso.borda ?? 'suave',
          vincos: caso.vincos.map(([a, b, c]) => [a, b, nitidezDoVinco(c)]),
        });
        const b = oraculo.blender[`${caso.nome}@${n}`];
        expect(r.vertices.length).toBe(b.length);
        expect(Math.max(desvio(r.vertices, b), desvio(b, r.vertices))).toBeLessThan(1e-6);
      });
    }
  }

  it('é determinística: a mesma gaiola dá a mesma saída, byte a byte', () => {
    const c = oraculo.casos[2];
    const f = () => JSON.stringify(subdividirCatmullClark({ vertices: c.vertices, faces: c.faces, vincos: c.vincos.map(([a, b, v]) => [a, b, nitidezDoVinco(v)]), niveis: 3 }));
    expect(f()).toBe(f());
  });

  it('espelhar a gaiola antes de subdividir dá a costura lisa, igual à gaiola inteira', () => {
    // faixa de 2 x 1 quads, metade x >= 0, com a costura em x = 0
    const meia = { vertices: [[0, 0, 0], [0.5, 0.1, 0], [1, 0, 0], [0, 0.2, 1], [0.5, 0.3, 1], [1, 0.1, 1]], faces: [[0, 3, 4, 1], [1, 4, 5, 2]] };
    const inteira = espelharGaiolaEmX(meia);
    const r = subdividirCatmullClark({ ...inteira, niveis: 2 });
    // o ponto da costura no meio da borda de cima fica em x = 0 e com a altura da média lisa, não da regra de borda
    const costura = r.vertices.filter((p) => Math.abs(p[0]) < 1e-12);
    expect(costura.length).toBeGreaterThan(0);
    const simetrica = r.vertices.every((p) => r.vertices.some((q) => dist(q, [-p[0], p[1], p[2]]) < 1e-12));
    expect(simetrica).toBe(true);
  });

  it('recusa aresta de vinco que não existe na gaiola', () => {
    expect(() => subdividirCatmullClark({ vertices: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], faces: [[0, 3, 2, 1]], vincos: [[0, 2, 1]], niveis: 1 })).toThrow(/não existe/);
  });

  for (const caso of oraculo.casos) {
    for (const n of caso.niveis) {
      it(`a operação subdivisao confere com o Blender: ${caso.nome}, ${n} nível(is)`, () => {
        const passos = [['subdivisao', { origemId: 1, vertices: caso.vertices, faces: caso.faces, vincos: caso.vincos.map(([a, b, c]) => [a, b, nitidezDoVinco(c)]), niveis: n, borda: caso.borda ?? 'suave' }]];
        const neutro = nucleo(passos, {});
        expect(neutro.orfaos).toEqual([]);
        const P = [...neutro.V.values()];
        const b = oraculo.blender[`${caso.nome}@${n}`];
        expect(P.length).toBe(b.length);
        expect(Math.max(desvio(P, b), desvio(b, P))).toBeLessThan(1e-6);
        expect(JSON.stringify(neutroCanonico(nucleo(passos, {})))).toBe(JSON.stringify(neutroCanonico(neutro)));
      });
    }
  }

  it('a operação subdivisao publica as faces da superfície como origem', () => {
    const c = oraculo.casos[1];
    const neutro = nucleo([['subdivisao', { origemId: 1, vertices: c.vertices, faces: c.faces, vincos: c.vincos.map(([a, b]) => [a, b]), niveis: 2 }]], {});
    expect(neutro.orfaos).toEqual([]);
    expect(neutro.V.size).toBe(98);
    expect(neutro.F.size).toBe(96);
  });

  describe('vértice de gaiola sem face', () => {
    const quad = [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]];

    it('grita com o nome do ponto e não gera malha', () => {
      const neutro = nucleo([['subdivisao', { origemId: 1, vertices: [...quad, 'pontoSolto'], faces: [[0, 3, 2, 1]], niveis: 1 }]], { pontoSolto: [5, 5, 5] });
      expect(neutro.orfaos).toHaveLength(1);
      expect(neutro.orfaos[0]).toMatchObject({ op: 'subdivisao', ref: 'vertices' });
      expect(neutro.orfaos[0].motivo).toContain("'pontoSolto'");
      expect(neutro.V.size).toBe(0);
    });

    it('sem nome, grita com a posição do vértice', () => {
      const neutro = nucleo([['subdivisao', { origemId: 1, vertices: [...quad, [5, 6, 7]], faces: [[0, 3, 2, 1]], niveis: 1 }]], {});
      expect(neutro.orfaos).toHaveLength(1);
      expect(neutro.orfaos[0].motivo).toContain('[5, 6, 7]');
      expect(neutro.V.size).toBe(0);
    });

    it('na simetria em x, grita com o nome do ponto da metade declarada', () => {
      const neutro = nucleo([['subdivisao', { origemId: 1, simetria: 'x', vertices: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1], 'pontoSolto'], faces: [[0, 3, 2, 1]], niveis: 1 }]], { pontoSolto: [2, 2, 2] });
      expect(neutro.orfaos).toHaveLength(1);
      expect(neutro.orfaos[0].motivo).toContain("'pontoSolto'");
    });
  });
});
