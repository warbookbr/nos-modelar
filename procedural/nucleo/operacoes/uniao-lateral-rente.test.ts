/* uniao-lateral-rente.test.ts — `unir` com laterais coplanares (rentes).
   Caso do ombro do braço robótico: coluna e braço com a MESMA meia largura.
   A saída tem de ser casca fechada e manifold, sem face de área zero, e
   passar pelo adaptador do visor sem erro. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../entrada.js';
// @ts-expect-error — adaptador JavaScript.
import { adaptarThree } from '../../../src/autoria/adaptar-three.js';
import { conferirMalha } from '../../../tools/oficina/conferir-malha';

type P3 = number[];
const areaDaFace = (n: any, f: any) => {
  const p: P3[] = f.vs.map((v: number) => n.V.get(v));
  let s = [0, 0, 0];
  for (let k = 1; k < p.length - 1; k++) {
    const a = [0, 1, 2].map((c) => p[k][c] - p[0][c]), b = [0, 1, 2].map((c) => p[k + 1][c] - p[0][c]);
    s = [s[0] + a[1] * b[2] - a[2] * b[1], s[1] + a[2] * b[0] - a[0] * b[2], s[2] + a[0] * b[1] - a[1] * b[0]];
  }
  return Math.hypot(s[0], s[1], s[2]) / 2;
};
/* volume pelo teorema da divergência, com cada face em leque */
const volume = (n: any) => {
  let v = 0;
  for (const f of n.F.values()) {
    const p: P3[] = f.vs.map((id: number) => n.V.get(id));
    for (let k = 1; k < p.length - 1; k++) {
      const [a, b, c] = [p[0], p[k], p[k + 1]];
      v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
  }
  return Math.abs(v);
};
const semFaceDegenerada = (n: any) => {
  const ruins = [...n.F.values()].filter((f: any) => areaDaFace(n, f) < 1e-10);
  expect(ruins.map((f: any) => f.id)).toEqual([]);
};
const conferir = (n: any, rotulo: string) => {
  expect(n.orfaos ?? []).toEqual([]);
  conferirMalha(n, { fechada: true, rotulo });
  semFaceDegenerada(n);
  expect(() => adaptarThree(n)).not.toThrow();
};

describe('caixa sobre caixa com laterais coplanares', () => {
  const unir = (b: any) => nucleo([
    ['cubo', { origemId: 1, larg: 2, alt: 1, prof: 2, em: [0, 0, 0] }],
    ['cubo', { origemId: 2, ...b }],
    ['unir', { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }],
  ], {});

  it('mesma largura, degrau em profundidade e altura: fechada, sem face degenerada, volume esperado', () => {
    const n = unir({ larg: 2, alt: 1, prof: 1, em: [0, 0.7, 0.3] });
    conferir(n, 'caixa rente');
    expect(volume(n)).toBeCloseTo(4 + 2 - 0.6, 9);   // sobreposição: 2 x 0,3 x 1
  });

  it('mesma largura, segunda caixa deslocada em x pelo meio de uma face', () => {
    const n = unir({ larg: 1, alt: 1, prof: 2, em: [0.5, 0.5, 0] });   // lateral x=1 rente
    conferir(n, 'caixa rente x');
    expect(volume(n)).toBeCloseTo(4 + 2 - 1, 9);
  });
});

describe('coluna e braço de superelipse n=4 com a mesma meia largura', () => {
  const cont = (r: number, n: number, L: number) => Array.from({ length: L }, (_, k) => {
    const th = (2 * Math.PI * k) / L, cs = Math.cos(th), sn = Math.sin(th);
    return [r * Math.sign(cs) * Math.abs(cs) ** (2 / n), r * Math.sign(sn) * Math.abs(sn) ** (2 / n)];
  });
  const ombro = (hColuna: number, L = 48) => {
    const h = 0.11, yE = 0.14, zF = 0.3, o = 0.0004;
    const sec = (pos: P3, r: number) => ({ pos, contorno: cont(r, 4, L) });
    const coluna = [{ pos: [0, 0, 0], raio: 0 }, sec([0, o, 0], hColuna), sec([0, yE - o, 0], hColuna), { pos: [0, yE, 0], raio: 0 }];
    const braco = [{ pos: [0, yE, -h], raio: 0 }, sec([0, yE, -h + o], h - 0.002), sec([0, yE, -h + 0.002], h), sec([0, yE, zF - o], h), { pos: [0, yE, zF], raio: 0 }];
    return nucleo([
      ['loft', { origemId: 1, secoes: coluna, lados: L, orientacao: [1, 0, 0] }],
      ['loft', { origemId: 2, secoes: braco, lados: L, orientacao: [1, 0, 0] }],
      ['unir', { origemId: 9, solidos: [{ origem: { op: 'loft', id: 1 } }, { origem: { op: 'loft', id: 2 } }] }],
    ], {});
  };

  for (const L of [24, 48]) it(`${L} lados: fechada, sem face degenerada, adaptador aceita`, () => {
    conferir(ombro(0.11, L), `ombro rente L${L}`);
  });

  it('o volume com laterais rentes fica a menos de 1% do caso com a coluna 1 mm menor', () => {
    const rente = volume(ombro(0.11)), folga = volume(ombro(0.109));
    expect(Math.abs(rente - folga) / folga).toBeLessThan(0.01);
  });

  it('é determinístico', () => {
    const chave = (n: any) => JSON.stringify([...n.F.values()].map((f: any) => [f.id, f.vs]));
    expect(chave(ombro(0.11))).toBe(chave(ombro(0.11)));
  });
});
