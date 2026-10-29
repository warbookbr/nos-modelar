/* Onde um volume atravessa o outro (`intersecao-de-volumes.js`): o segmento em que dois triângulos se cruzam, e os pares de triângulos de
   volumes diferentes que se cruzam numa malha. */
import { describe, expect, it } from 'vitest';
import { cruzamentoDeTriangulos, cruzamentosEntreVolumes } from '../src/intersecao-de-volumes.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const tri = (a, b, c, volume = 'v', ids = []) => {
  const n = cruz(sub(b, a), sub(c, a)); const m = Math.hypot(...n);
  return { p: [a, b, c], n: n.map((x) => x / m), volume, ids };
};

describe('cruzamentoDeTriangulos', () => {
  it('o triângulo vertical que fura o horizontal cruza num segmento, cortado pelos dois', () => {
    /* o chão: o triângulo grande em z = 0; a parede: o triângulo em x = 0 que o atravessa */
    const chao = tri([-10, -10, 0], [10, -10, 0], [0, 20, 0]);
    const parede = tri([0, -5, -5], [0, 5, -5], [0, 0, 5]);
    const s = cruzamentoDeTriangulos(chao, parede);
    expect(s).not.toBeNull();
    const [a, b] = s;
    expect(a[0]).toBeCloseTo(0, 9); expect(b[0]).toBeCloseTo(0, 9);
    expect(a[2]).toBeCloseTo(0, 9); expect(b[2]).toBeCloseTo(0, 9);
    expect(Math.abs(a[1] - b[1])).toBeCloseTo(5, 9);
  });

  it('o mesmo par, com os papéis trocados, dá o mesmo segmento', () => {
    const chao = tri([-10, -10, 0], [10, -10, 0], [0, 20, 0]);
    const parede = tri([0, -5, -5], [0, 5, -5], [0, 0, 5]);
    const ida = cruzamentoDeTriangulos(chao, parede).map((p) => p.map((x) => Math.round(x * 1e6) / 1e6)).sort();
    const volta = cruzamentoDeTriangulos(parede, chao).map((p) => p.map((x) => Math.round(x * 1e6) / 1e6)).sort();
    expect(volta).toEqual(ida);
  });

  it('triângulos paralelos, coplanares ou que não se alcançam não cruzam', () => {
    const chao = tri([-10, -10, 0], [10, -10, 0], [0, 20, 0]);
    expect(cruzamentoDeTriangulos(chao, tri([-10, -10, 3], [10, -10, 3], [0, 20, 3]))).toBeNull();
    expect(cruzamentoDeTriangulos(chao, tri([-5, -5, 0], [5, -5, 0], [0, 10, 0]))).toBeNull();
    expect(cruzamentoDeTriangulos(chao, tri([30, -5, -5], [30, 5, -5], [30, 0, 5]))).toBeNull();
  });
});

describe('cruzamentosEntreVolumes', () => {
  it('acha o cruzamento de dois volumes e ignora o par do mesmo volume e o que divide vértice', () => {
    const chao = tri([-10, -10, 0], [10, -10, 0], [0, 20, 0], 'a', ['1', '2', '3']);
    const parede = tri([0, -5, -5], [0, 5, -5], [0, 0, 5], 'b', ['4', '5', '6']);
    expect(cruzamentosEntreVolumes([chao, parede])).toHaveLength(1);
    expect(cruzamentosEntreVolumes([{ ...chao, volume: 'x' }, { ...parede, volume: 'x' }])).toHaveLength(0);
    expect(cruzamentosEntreVolumes([chao, { ...parede, ids: ['4', '2', '6'] }])).toHaveLength(0);
  });

  it('é determinística, e cada par aparece uma vez só, por mais células que as caixas dividam', () => {
    const ts = [];
    for (let i = 0; i < 40; i++) ts.push(tri([-100, -100, i], [100, -100, i], [0, 150, i], 'a', [`a${i}0`, `a${i}1`, `a${i}2`]));
    ts.push(tri([0, -60, -5], [0, 60, -5], [0, 0, 60], 'b', ['b0', 'b1', 'b2']));
    const um = cruzamentosEntreVolumes(ts); const dois = cruzamentosEntreVolumes(ts);
    expect(JSON.stringify(um)).toBe(JSON.stringify(dois));
    expect(um).toHaveLength(40);
    expect(new Set(um.map((c) => `${c.de}:${c.com}`)).size).toBe(40);
  });
});
