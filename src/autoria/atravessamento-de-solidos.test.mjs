/* atravessamento-de-solidos.test.mjs — tocar não é atravessar.
 *
 * O defeito: num abajur, as alças da armação entravam pelo topo do soquete e o contato declarado armacao↔soquete passou, porque o estado `interpenetram` valia
 * para o aro que abraça o cilindro e para o tubo que o fura. As fixtures são três pares de geometria conhecida: o tubo fino que fura a tampa (reprova), o mesmo tubo
 * apenas assentado nela (passa) e o aro que abraça o cilindro com folga zero, com a mesma malha e com malha diferente (passam).
 */
import { describe, expect, it } from 'vitest';
import { atravessamentoDeSolidos, auditarParDeSolidos, prepararSolido } from './contato-de-solidos.js';

/* cilindro fechado de eixo z, de z0 a z1, com `n` lados e raio `r`; tampas como polígonos de n lados */
function cilindro({ r, z0, z1, n = 32, rotacao = 0 }) {
  const V = new Map(); const F = new Map();
  for (let i = 0; i < n; i += 1) {
    const ang = rotacao + (2 * Math.PI * i) / n;
    V.set(`b${i}`, [r * Math.cos(ang), r * Math.sin(ang), z0]);
    V.set(`t${i}`, [r * Math.cos(ang), r * Math.sin(ang), z1]);
  }
  for (let i = 0; i < n; i += 1) F.set(`l${i}`, { id: `l${i}`, vs: [`b${i}`, `b${(i + 1) % n}`, `t${(i + 1) % n}`, `t${i}`] });
  F.set('base', { id: 'base', vs: Array.from({ length: n }, (_, i) => `b${n - 1 - i}`) });
  F.set('topo', { id: 'topo', vs: Array.from({ length: n }, (_, i) => `t${i}`) });
  return prepararSolido({ V, F }, undefined, 'cilindro');
}

/* aro de seção retangular (r0 a r1, z0 a z1), com `n` lados */
function aro({ r0, r1, z0, z1, n = 32 }) {
  const V = new Map(); const F = new Map();
  for (let i = 0; i < n; i += 1) {
    const ang = (2 * Math.PI * i) / n; const c = Math.cos(ang); const s = Math.sin(ang);
    V.set(`ib${i}`, [r0 * c, r0 * s, z0]); V.set(`it${i}`, [r0 * c, r0 * s, z1]);
    V.set(`ob${i}`, [r1 * c, r1 * s, z0]); V.set(`ot${i}`, [r1 * c, r1 * s, z1]);
  }
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    F.set(`i${i}`, { id: `i${i}`, vs: [`ib${j}`, `ib${i}`, `it${i}`, `it${j}`] });
    F.set(`o${i}`, { id: `o${i}`, vs: [`ob${i}`, `ob${j}`, `ot${j}`, `ot${i}`] });
    F.set(`t${i}`, { id: `t${i}`, vs: [`it${i}`, `ot${i}`, `ot${j}`, `it${j}`] });
    F.set(`b${i}`, { id: `b${i}`, vs: [`ib${i}`, `ib${j}`, `ob${j}`, `ob${i}`] });
  }
  return prepararSolido({ V, F }, undefined, 'aro');
}

const TOL = 1e-6;
const tampa = () => cilindro({ r: 3, z0: 0, z1: 2 });

describe('atravessamentoDeSolidos', () => {
  it('o tubo fino que entra pela tampa e sai pela base atravessa, mesmo sem vértice dentro', () => {
    const tubo = cilindro({ r: 0.2, z0: -3, z1: 5, n: 8 });
    expect(auditarParDeSolidos(tubo, tampa(), TOL).estado).toBe('interpenetram');
    const r = atravessamentoDeSolidos(tubo, tampa(), TOL);
    expect(r.comprimento).toBeGreaterThan(1);
    expect(r.profundidade).toBeGreaterThan(0.9);
  });

  it('o tubo fino que entra pela tampa e fica dentro atravessa pelo vértice da ponta', () => {
    const tubo = cilindro({ r: 0.2, z0: 1, z1: 6, n: 8 });
    const r = atravessamentoDeSolidos(tubo, tampa(), TOL);
    expect(r.profundidade).toBeGreaterThan(0.9);
  });

  it('o mesmo tubo apenas assentado na tampa encosta e não atravessa', () => {
    const tubo = cilindro({ r: 0.2, z0: 2, z1: 7, n: 8 });
    expect(auditarParDeSolidos(tubo, tampa(), TOL).estado).toBe('encostam');
    expect(atravessamentoDeSolidos(tubo, tampa(), TOL)).toEqual({ profundidade: 0, comprimento: 0, segmentos: 0 });
  });

  it('o aro que abraça o cilindro com folga zero e a mesma malha só encosta', () => {
    const r = atravessamentoDeSolidos(aro({ r0: 3, r1: 3.5, z0: 0.5, z1: 1.5 }), tampa(), TOL);
    expect(r.profundidade).toBeLessThan(1e-6);
  });

  it('o aro de folga zero com malha diferente cruza em lascas da altura do facetamento, e não do tamanho das peças', () => {
    const r = atravessamentoDeSolidos(aro({ r0: 3, r1: 3.5, z0: 0.5, z1: 1.5, n: 48 }), tampa(), TOL);
    expect(r.profundidade).toBeLessThan(3 * (1 - Math.cos(Math.PI / 32)) * 1.01);
  });

  it('o aro que entra meia unidade no cilindro mede meia unidade', () => {
    const r = atravessamentoDeSolidos(aro({ r0: 2.5, r1: 3.5, z0: 0.5, z1: 1.5 }), tampa(), TOL);
    expect(r.profundidade).toBeGreaterThan(0.49);
  });
});
