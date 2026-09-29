/* triangulacao-sem-leque.test.ts — face plana grande (tampa de superelipse,
   pedaço de união) não sai em leque: grau máximo por canto e ângulo mínimo dos
   triângulos, medidos na malha que o visor recebe. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../entrada.js';
// @ts-expect-error — adaptador JavaScript.
import { adaptarThree } from '../../../src/autoria/adaptar-three.js';
import { conferirMalha } from '../../../tools/oficina/conferir-malha';
// @ts-expect-error — módulo JavaScript.
import { triangularFace, triangularConvexa } from '../triangulacao-face.js';

const superelipse = (n: number, a: number, b: number, e: number) => Array.from({ length: n }, (_, i) => {
  const t = (2 * Math.PI * i) / n, c = Math.cos(t), s = Math.sin(t);
  return [a * Math.sign(c) * Math.abs(c) ** (2 / e), b * Math.sign(s) * Math.abs(s) ** (2 / e)];
});

const alias = [['cil', { unir: [{ origem: { op: 'cilindro', id: 1 } }, { origem: { op: 'cilindro', id: 1, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: 1, tampa: 'topo' } }] }]];
const medir = (passos: any[]) => {
  const n = nucleo(passos, {}, {}, {}, null, alias);
  const { raiz } = adaptarThree(n);
  const porFace = new Map<number, { graus: Map<number, number>; minAng: number; tris: number }>();
  raiz.traverse((o: any) => {
    if (o.userData?.tipo !== 'superficie') return;
    const g = o.geometry, pos = g.getAttribute('position'), fa = g.getAttribute('origemFace'), vt = g.getAttribute('origemVertice');
    for (let t = 0; t < pos.count / 3; t++) {
      const fid = fa.getX(3 * t);
      let d = porFace.get(fid);
      if (!d) { d = { graus: new Map(), minAng: Infinity, tris: 0 }; porFace.set(fid, d); }
      d.tris++;
      const p = [0, 1, 2].map((k) => [pos.getX(3 * t + k), pos.getY(3 * t + k), pos.getZ(3 * t + k)]);
      for (let k = 0; k < 3; k++) {
        const v = vt.getX(3 * t + k);
        d.graus.set(v, (d.graus.get(v) ?? 0) + 1);
        const u = [0, 1, 2].map((c) => p[(k + 1) % 3][c] - p[k][c]), w = [0, 1, 2].map((c) => p[(k + 2) % 3][c] - p[k][c]);
        const cs = (u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / (Math.hypot(...u) * Math.hypot(...w));
        d.minAng = Math.min(d.minAng, (Math.acos(Math.max(-1, Math.min(1, cs))) * 180) / Math.PI);
      }
    }
  });
  return { n, porFace };
};

const cilindro = (id: number) => ['cilindro', { origemId: id, raio: 0.3, altura: 0.2, lados: 48 }];

describe('face plana grande sem leque', () => {
  const passos = [
    cilindro(1),
    ['cubo', { origemId: 2, lado: 0.2, em: [0.15, 0.1, 0] }],
    ['unir', { origemId: 9, solidos: [{ alias: 'cil' }, { origem: { op: 'cubo', id: 2 } }] }],
  ];

  it('a união segue fechada e manifold', () => {
    const { n } = medir(passos);
    expect(n.orfaos ?? []).toEqual([]);
    conferirMalha(n, { fechada: true, rotulo: 'loft unido' });
  });

  it('nenhum canto de face grande passa de 8 arestas e o ângulo mínimo passa do piso', () => {
    const { porFace } = medir(passos);
    let grandes = 0;
    for (const [fid, d] of porFace) {
      if (d.tris < 6) continue;
      grandes++;
      expect(Math.max(...d.graus.values()), `face ${fid}`).toBeLessThanOrEqual(8);
      expect(d.minAng, `face ${fid}`).toBeGreaterThan(2);
    }
    expect(grandes).toBeGreaterThan(0);
  });

  it('é determinística e mantém a fronteira do polígono', () => {
    const pts = superelipse(48, 0.3, 0.2, 4).map(([x, y]) => [x, y, 0]);
    const a = triangularConvexa(pts);
    expect(a).toEqual(triangularConvexa(pts));
    expect(a.length).toBe(46);
    const arestas = new Set(a.flatMap(([i, j, k]: number[]) => [[i, j], [j, k], [k, i]].map((e) => e.join('>'))));
    for (let i = 0; i < 48; i++) expect(arestas.has(`${i}>${(i + 1) % 48}`)).toBe(true);
    expect(triangularFace(pts.slice(0, 5))).toEqual([[0, 1, 2], [0, 2, 3], [0, 3, 4]]);
  });
});
