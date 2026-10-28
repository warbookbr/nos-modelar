/* booleana-faces-fundidas.test.ts — fatia 10 do plano "Ajustes no núcleo dos veículos" (docs/modelar/planos/2026-10-21-ajustes-no-
   nucleo-dos-veiculos.md, decisão 4). A booleana comum funde, por último, os pedaços coplanares de uma mesma face de entrada num
   polígono convexo e plano, com o canto colinear mantido. Antes, a faceta de um prisma subtraído, que a Manifold devolve virada
   para dentro do buraco, ficava em dois triângulos (a fusão media a convexidade contra a normal da face de entrada), e o
   acabamento ainda partia o polígono no canto colinear que uma face vizinha usa.

   A fixture é um cubo de 2 de lado menos um prisma de 8 lados e raio 0,6 que o atravessa em x: o furo tem as 8 facetas, e a forma é
   conhecida em fórmula (o octógono regular de raio r tem área 2·√2·r²). */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../entrada.js';
// @ts-expect-error — núcleo herdado em JavaScript.
import { desvioDoPlano, fundirCoplanares } from '../pedacos-convexos.js';

type N = any;
const R = 0.6;
const CENTRO = { y: 1, z: 0.2 };
const PASSOS: any[] = [
  ['cubo', { origemId: 1, larg: 2, alt: 2, prof: 2, em: [0, 0, 0] }],
  ['cilindro', { origemId: 2, raio: R, altura: 4, lados: 8, eixo: 'x', em: [-2, CENTRO.y, CENTRO.z] }],
  ['subtrair', { origemId: 3, solidos: [{ origem: { op: 'cubo', id: 1 } }, { alias: 'cil' }] }],
];
const ALIAS = [['cil', { unir: [{ origem: { op: 'cilindro', id: 2 } }, { origem: { op: 'cilindro', id: 2, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: 2, tampa: 'topo' } }] }]];
const rodar = (passos: any[] = PASSOS): N => nucleo(passos, {}, {}, {}, null, ALIAS);

const pos = (n: N, v: number) => n.V.get(v);
function volume(n: N) {
  let s = 0;
  for (const f of n.F.values()) {
    const p0 = pos(n, f.vs[0]);
    for (let k = 1; k < f.vs.length - 1; k++) {
      const p1 = pos(n, f.vs[k]), p2 = pos(n, f.vs[k + 1]);
      s += p0[0] * (p1[1] * p2[2] - p1[2] * p2[1]) - p0[1] * (p1[0] * p2[2] - p1[2] * p2[0]) + p0[2] * (p1[0] * p2[1] - p1[1] * p2[0]);
    }
  }
  return s / 6;
}
function arestasSemPar(n: N) {
  const dirigidas = new Map<string, number>();
  for (const f of n.F.values()) for (let k = 0; k < f.vs.length; k++) {
    const c = `${f.vs[k]}>${f.vs[(k + 1) % f.vs.length]}`;
    dirigidas.set(c, (dirigidas.get(c) ?? 0) + 1);
  }
  let abertas = 0;
  for (const [c, q] of dirigidas) { const [a, b] = c.split('>'); if (q !== 1 || dirigidas.get(`${b}>${a}`) !== 1) abertas++; }
  return abertas;
}
/* a faceta do furo: todos os cantos a R do eixo do prisma */
const doEixo = (n: N, v: number) => Math.hypot(pos(n, v)[1] - CENTRO.y, pos(n, v)[2] - CENTRO.z);
const facetas = (n: N) => [...n.F.values()].filter((f: any) => f.vs.every((v: number) => Math.abs(doEixo(n, v) - R) < 1e-9));

describe('booleana comum: faces fundidas', () => {
  const n = rodar();

  it('a forma é a mesma: o volume é o do cubo menos o prisma, a casca fecha e nada reclama', () => {
    expect(n.orfaos).toEqual([]);
    expect(arestasSemPar(n)).toBe(0);
    expect(volume(n)).toBeCloseTo(8 - 2 * Math.SQRT2 * R * R * 2, 12);
  });

  it('cada uma das 8 facetas do furo é uma face só, de quatro cantos, e guarda o id que tinha no cilindro', () => {
    const lista = facetas(n);
    expect(lista).toHaveLength(8);
    for (const f of lista) expect(f.vs).toHaveLength(4);
    const antes = rodar(PASSOS.slice(0, 2));
    for (const f of lista) expect(antes.F.has(f.id)).toBe(true);
  });

  it('o furo inteiro cabe em 30 faces (eram 38, com 16 triângulos nas facetas)', () => {
    expect(n.F.size).toBe(30);
  });

  it('a mesma receita dá a mesma malha duas vezes', () => {
    const outra = rodar();
    expect([...outra.F.entries()]).toEqual([...n.F.entries()]);
  });
});

describe('fundirCoplanares: só une o que é plano, convexo e não deixa canto em duas faces', () => {
  /* quatro cantos de um quadrado no plano z = 0 e um quinto no meio de um lado (canto colinear) */
  const base: Record<number, number[]> = { 1: [0, 0, 0], 2: [1, 0, 0], 3: [2, 0, 0], 4: [2, 1, 0], 5: [0, 1, 0] };
  const item = (ref: any[], prioridade = false) => ({ ref, prioridade });
  const valencia = (v: number) => new Map([1, 2, 3, 4, 5].map((k) => [k, v]));

  it('une dois pedaços planos de uma face de canto colinear e deixa o canto no polígono', () => {
    const pos = (v: number) => base[v];
    const a = item([7, [1, 2, 5]]);
    const b = item([7, [2, 3, 4, 5]], true);
    const feitos = fundirCoplanares(pos, [a, b], { plano: 1e-9, seno: 1e-9, valencia: valencia(4) });
    expect(feitos).toHaveLength(1);
    expect(feitos[0][0]).toBe(b);   // a face cortada, com `prioridade`, guarda o id
    expect(b.ref[1]).toHaveLength(5);
    expect(new Set(b.ref[1])).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('não une quando o resultado sai do plano', () => {
    const pos = (v: number) => (v === 4 ? [2, 1, 1e-4] : base[v]);
    const a = item([7, [1, 2, 5]]);
    const b = item([7, [2, 3, 4, 5]], true);
    expect(fundirCoplanares(pos, [a, b], { plano: 1e-9, seno: 1e-9, valencia: valencia(4) })).toHaveLength(0);
    expect(desvioDoPlano(pos, [[1, 2, 5], [2, 3, 4], [2, 4, 5]])).toBeGreaterThan(1e-5);
  });

  it('não une quando o polígono ficaria côncavo', () => {
    const pos = (v: number) => (v === 4 ? [0.5, 0.2, 0] : base[v]);
    const a = item([7, [1, 2, 5]]);
    const b = item([7, [2, 3, 4, 5]], true);
    expect(fundirCoplanares(pos, [a, b], { plano: 1e-9, seno: 1e-9, valencia: valencia(4) })).toHaveLength(0);
  });

  it('não une quando um canto da aresta comum ficaria em duas faces só', () => {
    const pos = (v: number) => base[v];
    const a = item([7, [1, 2, 5]]);
    const b = item([7, [2, 3, 4, 5]], true);
    const v = valencia(4);
    v.set(2, 3);   // o canto 2 só tem três faces: sem a aresta 2-5 ele ficaria em duas
    expect(fundirCoplanares(pos, [a, b], { plano: 1e-9, seno: 1e-9, valencia: v })).toHaveLength(0);
  });
});
