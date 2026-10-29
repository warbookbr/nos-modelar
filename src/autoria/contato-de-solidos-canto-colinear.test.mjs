/* contato-de-solidos-canto-colinear.test.mjs — o sólido de uma face com canto colinear (o vértice que a booleana deixa no meio de
   uma aresta, fatia 10 do plano de ajustes no núcleo) é fechado e decide o contato. O earcut tira dessa face um triângulo de área
   nula entre os três cantos da reta; o preparo o descartava como "triângulo degenerado" e marcava a parte inteira como
   inconclusiva. O prisma de prova tem por base o pentágono da tampa do filtro da lavadora, de cantos C, D, E na mesma reta. */
import { describe, expect, it } from 'vitest';
import { auditarParDeSolidos, prepararSolido } from './contato-de-solidos.js';

const BASE = [[0.17, 0.153], [0.17, 0.098], [0.1632034, 0.1496248], [0.1631541, 0.15], [0.1628211, 0.1525295]];
const ALTURA = 0.1;

/* Colinear até o ruído do desenho: o canto D é colocado exatamente sobre a reta C-E. */
function corrigido() {
  const [c, , , e] = [BASE[2], BASE[3], BASE[4], BASE[4]];
  const d = BASE[3];
  const t = ((d[0] - c[0]) * (e[0] - c[0]) + (d[1] - c[1]) * (e[1] - c[1])) / ((e[0] - c[0]) ** 2 + (e[1] - c[1]) ** 2);
  return BASE.map((p, k) => (k === 3 ? [c[0] + t * (e[0] - c[0]), c[1] + t * (e[1] - c[1])] : p));
}

function prisma(base, dz = 0) {
  const n = base.length;
  const V = new Map();
  base.forEach(([x, y], k) => { V.set(k, [x, y, dz]); V.set(k + n, [x, y, dz + ALTURA]); });
  const F = new Map();
  F.set(0, { id: 0, vs: [...Array(n).keys()].reverse() });                 // baixo, para fora (-z)
  F.set(1, { id: 1, vs: [...Array(n).keys()].map((k) => k + n) });          // cima (+z)
  for (let k = 0; k < n; k += 1) F.set(2 + k, { id: 2 + k, vs: [k, (k + 1) % n, ((k + 1) % n) + n, k + n] });
  return { V, F };
}

describe('contato de sólidos: face com canto colinear', () => {
  it('o prisma do pentágono com três cantos na mesma reta é fechado e não é inconclusivo', () => {
    const solido = prepararSolido(prisma(corrigido()), undefined, 'prisma');
    expect(solido.inconclusivo).toBeUndefined();
    expect(solido.fechada).toBe(true);
  });

  it('os triângulos cobrem a mesma superfície: a soma das áreas é a do prisma', () => {
    const base = corrigido();
    const solido = prepararSolido(prisma(base), undefined, 'prisma');
    const area = ([a, b, c]) => {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      return Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2;
    };
    const total = solido.triangulos.reduce((soma, t) => soma + area(t), 0);
    let areaBase = 0;
    let perimetro = 0;
    base.forEach((p, k) => {
      const q = base[(k + 1) % base.length];
      areaBase += (p[0] * q[1] - q[0] * p[1]) / 2;
      perimetro += Math.hypot(q[0] - p[0], q[1] - p[1]);
    });
    expect(total).toBeCloseTo(2 * Math.abs(areaBase) + perimetro * ALTURA, 12);
  });

  it('o par de prismas separados por uma folga decide, no lugar de ficar inconclusivo', () => {
    const a = prepararSolido(prisma(corrigido()), undefined, 'a');
    const b = prepararSolido(prisma(corrigido(), 0.5), undefined, 'b');
    expect(auditarParDeSolidos(a, b, 1e-9).estado).toBe('separadas');
  });
});
