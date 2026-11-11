/* booleana-quebras-de-sombra.test.ts — defeito achado na carcaça da empilhadeira em 2026-11-10: a booleana sobre um corpo
   subdividido com vinco vivo deixava em `face.quebras` pares de vértices que o corte tinha apagado, e `assinaturaDaForma` (o
   registro das etapas da montagem) quebrava ao ler a posição deles. A quebra de sombra é uma aresta da face: depois do corte
   ela vale só nos trechos da aresta original que continuam na borda do pedaço, com os vértices do pedaço.

   A fixture é o cubo subdividido com o aro do topo em vinco vivo, menos um prisma que atravessa uma lateral e corta o aro. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../entrada.js';
// @ts-expect-error — autoria herdada em JavaScript.
import { assinaturaDaForma } from '../../../src/autoria/assinatura-da-forma.js';

type N = any;
const P = { a: [0, 0, 0], b: [1, 0, 0], c: [1, 1, 0], d: [0, 1, 0], e: [0, 0, 1], f: [1, 0, 1], g: [1, 1, 1], h: [0, 1, 1] };
const CORPO: any = ['subdivisao', {
  origemId: 1, vertices: Object.keys(P), niveis: 2, liso: 120,
  faces: [['a', 'd', 'c', 'b'], ['e', 'f', 'g', 'h'], ['a', 'b', 'f', 'e'], ['b', 'c', 'g', 'f'], ['c', 'd', 'h', 'g'], ['d', 'a', 'e', 'h']],
  vincos: [{ nome: 'aro', pontos: ['e', 'f', 'g', 'h', 'e'], nitidez: 'viva' }],
}];
/* o prisma entra pela lateral y = 0, na altura do aro (z = 1), e sai pelo topo: corta faces dos dois lados do vinco */
const PASSOS: any[] = [
  CORPO,
  ['cubo', { origemId: 2, larg: 0.3, alt: 0.6, prof: 0.4, em: [0.5, -0.2, 0.9] }],
  ['subtrair', { origemId: 3, solidos: [{ origem: { op: 'subdivisao', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }],
];
const rodar = (passos: any[]): N => nucleo(passos, P);

const quebrasDe = (n: N) => [...n.F.values()].flatMap((f: any) => (f.quebras ?? []).map((q: number[]) => ({ f, q })));

describe('a quebra de sombra depois da booleana', () => {
  it('o corpo subdividido tem quebras no aro antes do corte (a fixture exerce o caso)', () => {
    const n = rodar([CORPO]);
    expect(quebrasDe(n).length).toBeGreaterThan(0);
  });

  it('toda quebra aponta dois vértices que existem e são vizinhos na face', () => {
    const n = rodar(PASSOS);
    const todas = quebrasDe(n);
    expect(todas.length).toBeGreaterThan(0);
    for (const { f, q } of todas) {
      const [a, b] = q;
      expect(n.V.has(a) && n.V.has(b)).toBe(true);
      const k = f.vs.indexOf(a);
      expect(k).toBeGreaterThanOrEqual(0);
      const vizinhos = [f.vs[(k + 1) % f.vs.length], f.vs[(k + f.vs.length - 1) % f.vs.length]];
      expect(vizinhos).toContain(b);
    }
  });

  it('toda aresta do pedaço que está sobre um vinco do corpo inteiro continua quebra, e nenhuma fica dentro do corte', () => {
    const inteiro = rodar([CORPO]);
    const trechos = quebrasDe(inteiro).map(({ q }) => [inteiro.V.get(q[0]), inteiro.V.get(q[1])]);
    const sobre = (p: number[], [a, b]: number[][]) => {
      const ab = a.map((c, k) => b[k] - c), ap = a.map((c, k) => p[k] - c);
      const t = ap.reduce((s2, c, k) => s2 + c * ab[k], 0) / ab.reduce((s2, c) => s2 + c * c, 0);
      if (t < -1e-9 || t > 1 + 1e-9) return false;
      return Math.hypot(...ap.map((c, k) => c - ab[k] * t)) < 1e-9;
    };
    const n = rodar(PASSOS);
    let sobreVinco = 0, comQuebra = 0;
    for (const f of n.F.values() as Iterable<any>) {
      f.vs.forEach((v: number, k: number) => {
        const w = f.vs[(k + 1) % f.vs.length], pv = n.V.get(v), pw = n.V.get(w);
        if (!trechos.some((t) => sobre(pv, t) && sobre(pw, t))) return;
        sobreVinco++;
        if ((f.quebras ?? []).some(([a, b]: number[]) => (a === v && b === w) || (a === w && b === v))) comQuebra++;
      });
    }
    expect(sobreVinco).toBeGreaterThan(0);
    expect(comQuebra).toBe(sobreVinco);
    expect(quebrasDe(n).length).toBe(comQuebra);
    /* o prisma ocupa x 0,35 a 0,65, y -0,2 a 0,4 e z 0,7 a 1,1: o vinco passava por dentro dele, e nenhuma quebra fica lá */
    const dentro = (p: number[]) => p[0] > 0.36 && p[0] < 0.64 && p[1] > -0.19 && p[1] < 0.39 && p[2] > 0.71 && p[2] < 1.09;
    const meio = (a: number[], b2: number[]) => a.map((c, k) => (c + b2[k]) / 2);
    expect(trechos.some(([a, b2]) => dentro(meio(a, b2)))).toBe(true);
    expect(quebrasDe(n).some(({ q }) => dentro(meio(n.V.get(q[0]), n.V.get(q[1]))))).toBe(false);
  });

  it('a assinatura da forma lê a peça cortada sem quebrar', () => {
    expect(assinaturaDaForma(rodar(PASSOS))).toMatch(/^sha256:/);
  });
});
