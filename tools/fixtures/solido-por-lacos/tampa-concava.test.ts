/* tampa-concava.test.ts — a tampa de um laço côncavo, com trechos coincidentes, na peça geral dos dois tubos (`tubos-forma.js`, técnica de hoje): a tampa da frente é o laço
   da faixa do tubo em pé pendurada sob o círculo (côncavo nos filetes), em vez do círculo inteiro com aviso de amostragem desigual que a escada exigia. A escada põe
   degraus sobre a reta do vizinho nesse laço; `gaiolaPorLacos` passa a triangular o contorno por orelhas, e a gaiola fecha, orientada, sem face de área zero. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { gaiolaPorLacos } from '../../../procedural/nucleo/gaiola-por-lacos.js';
// @ts-expect-error — núcleo em JavaScript.
import { nucleo } from '../../../procedural/nucleo/entrada.js';
// @ts-expect-error — forma em JavaScript.
import { argumentosDaGaiola, lacoNoPlano, planosDeCorte, tabelaDe } from './tubos-forma.js';

function conferir(g: any) {
  const conta = new Map<string, number>();
  for (const f of g.passo.faces) f.forEach((a: string, k: number) => { const c = `${a}|${f[(k + 1) % f.length]}`; conta.set(c, (conta.get(c) ?? 0) + 1); });
  let soltas = 0; let repetidas = 0;
  for (const [c, n] of conta) { const [a, b] = c.split('|'); if (n > 1) repetidas++; if (!conta.has(`${b}|${a}`)) soltas++; }
  return { soltas, repetidas };
}
const area = (f: string[], P: Record<string, number[]>) => {
  let nx = 0; let ny = 0; let nz = 0;
  f.forEach((v, k) => { const [x1, y1, z1] = P[v]; const [x2, y2, z2] = P[f[(k + 1) % f.length]]; nx += (y1 - y2) * (z1 + z2); ny += (z1 - z2) * (x1 + x2); nz += (x1 - x2) * (y1 + y2); });
  return Math.hypot(nx, ny, nz) / 2;
};

describe('tampa de laço côncavo com trechos coincidentes', () => {
  const T = tabelaDe('hoje');
  const args = argumentosDaGaiola(T, 'hoje');
  const n = args.lacos.length;
  const ultimo = planosDeCorte(T, 'hoje')[n - 1];
  args.lacos[n - 1] = lacoNoPlano(T, { x: ultimo.x, tipo: 'rampa', s: 0.3 }, 'hoje');
  delete args.compensar;

  it('a tampa da frente é o laço côncavo da faixa, e a gaiola fecha, orientada, sem face de área zero', () => {
    const g = gaiolaPorLacos(args);
    const c = conferir(g);
    expect(c.soltas + c.repetidas).toBe(0);
    expect(g.passo.faces.filter((f: string[]) => area(f, g.pontosMm) <= 1e-6)).toEqual([]);
    const st = nucleo([['subdivisao', { ...g.passo, niveis: 1 }]], {}, g.pontos);
    expect(st.orfaos).toEqual([]);
    /* a tampa da frente tem triângulos (a triangulação por orelhas), que a escada não tinha */
    const daTampa = g.passo.faces.filter((f: string[]) => f.every((v) => v.startsWith(`k_l${n - 1}_`)));
    expect(daTampa.length).toBeGreaterThan(10);
    expect(daTampa.every((f: string[]) => f.length === 3)).toBe(true);
  });
});
