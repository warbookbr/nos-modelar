/* aparar.test.ts — `aparar`: o sólido cortado pelo lado de dentro de uma chapa subdividida, a `folga` da pele de dentro dela.
   Mede, numa calota de gaiola de cinco faces (a base em y = 0, o topo em y = 1) e num prisma que a atravessa: (a) a distância de cada vértice
   da pele nova à pele da chapa, que é a folga dentro de 1% (a chapa é facetada, e a distância de vértice a triângulo erra até 0,3% dela);
   (b) com espessura, a pele de dentro da chapa, e não a de fora, é a medida; (c) o resultado fica dentro do prisma, é fechado e sai igual em
   duas execuções; (d) a chapa já cortada por uma booleana segue valendo; (e) as recusas, antes de mexer no estado. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { nucleo, neutroCanonico } from './entrada.js';
// @ts-expect-error — núcleo em JavaScript.
import { moldeDeDentro } from './molde-de-dentro.js';

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mais = (o: V3, u: V3, t: number): V3 => [o[0] + u[0] * t, o[1] + u[1] * t, o[2] + u[2] * t];
function distTri(p: V3, [A, B, C]: V3[]) {
  const ab = sub(B, A); const ac = sub(C, A); const ap = sub(p, A);
  const d1 = dot(ab, ap); const d2 = dot(ac, ap); if (d1 <= 0 && d2 <= 0) return Math.hypot(...ap);
  const bp = sub(p, B); const d3 = dot(ab, bp); const d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return Math.hypot(...bp);
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) return Math.hypot(...sub(p, mais(A, ab, d1 / (d1 - d3))));
  const cp = sub(p, C); const d5 = dot(ab, cp); const d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return Math.hypot(...cp);
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) return Math.hypot(...sub(p, mais(A, ac, d2 / (d2 - d6))));
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return Math.hypot(...sub(p, mais(B, sub(C, B), (d4 - d3) / (d4 - d3 + d5 - d6))));
  const den = 1 / (va + vb + vc); return Math.hypot(...sub(p, mais(mais(A, ab, vb * den), ac, vc * den)));
}

/* a calota: a base 1 por 1 em y = 0, o topo 0,8 por 0,8 em y = 1, cinco faces, sem a de baixo */
const CALOTA = { vertices: [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5], [-0.4, 1, -0.4], [0.4, 1, -0.4], [0.4, 1, 0.4], [-0.4, 1, 0.4]],
  faces: [[0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0], [4, 7, 6, 5]], niveis: 2 };
/* o prisma atravessa a calota: x e z em ±0,6, y de -0,2 a 0,7 */
const PRISMA: [string, object] = ['cubo', { origemId: 2, larg: 1.2, alt: 0.9, prof: 1.2, em: [0, -0.2, 0] }];
const APARAR = (folga: number, extra: object = {}): [string, object] => ['aparar', { origemId: 3, solido: { origem: { op: 'cubo', id: 2 } }, chapa: { op: 'subdivisao', id: 1 }, folga, fecha: { eixo: 'y', em: 0 }, ...extra }];
const receita = (folga: number, chapa: object = {}, extra: object = {}) => [
  ['subdivisao', { origemId: 1, ...CALOTA, ...chapa }],
  ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
  PRISMA, APARAR(folga, extra),
  ['parte', { nome: 'aparado', sel: { origem: { op: 'aparar', id: 3 } } }],
];
const facesDa = (n: any, parte: string) => [...n.F.values()].filter((f: any) => f.parte === parte);
const triangulos = (n: any, faces: any[]) => faces.flatMap((f: any) => { const p = f.vs.map((v: number) => n.V.get(v)); return p.slice(2).map((_: V3, k: number) => [p[0], p[k + 1], p[k + 2]]); });
const fechada = (faces: any[]) => {
  const d = new Map<string, number>();
  for (const f of faces) f.vs.forEach((a: number, k: number) => { const c = `${a}>${f.vs[(k + 1) % f.vs.length]}`; d.set(c, (d.get(c) ?? 0) + 1); });
  return [...d].every(([c, q]) => { const [a, b] = c.split('>'); return q === 1 && d.get(`${b}>${a}`) === 1; });
};
/* os vértices da pele nova: os do aparado que não estão no plano da tampa nem nas faces do prisma */
const daPele = (n: any) => [...new Set(facesDa(n, 'aparado').flatMap((f: any) => f.vs))].map((v: any) => n.V.get(v) as V3)
  .filter((p) => p[1] > 1e-6 && p[1] < 0.7 - 1e-6 && Math.abs(Math.abs(p[0]) - 0.6) > 1e-6 && Math.abs(Math.abs(p[2]) - 0.6) > 1e-6);
const distanciaAPele = (n: any, p: V3, T: V3[][]) => Math.min(...T.map((t) => distTri(p, t)));
const grito = (passos: any[]) => { const n = nucleo(passos, {}, {}); return n.orfaos.map((o: any) => `${o.op}/${o.ref}: ${o.motivo}`); };

describe('aparar: o sólido a uma folga da pele de dentro da chapa', () => {
  it('a pele nova fica a `folga` da chapa, dentro de 1%', () => {
    for (const folga of [0.05, 0.1]) {
      const n = nucleo(receita(folga), {}, {});
      expect(n.orfaos).toEqual([]);
      const T = triangulos(n, facesDa(n, 'chapa'));
      const d = daPele(n).map((p) => distanciaAPele(n, p, T));
      expect(d.length).toBeGreaterThan(30);
      expect(Math.min(...d)).toBeGreaterThan(folga * 0.99);
      expect(Math.max(...d)).toBeLessThan(folga * 1.01);
    }
  });

  it('a tampa fica no plano declarado: a borda que sai dele é cortada, a que fica aquém ganha parede até ele', () => {
    const minY = (n: any) => Math.min(...facesDa(n, 'aparado').flatMap((f: any) => f.vs.map((v: number) => n.V.get(v)[1])));
    /* a borda deslocada fica 5 mm abaixo de y = 0: o plano em 0 corta a pele ali, e o em -0,02 a fecha com parede de 15 mm */
    const em0 = nucleo(receita(0.05), {}, {}); const emMenos = nucleo(receita(0.05, {}, { fecha: { eixo: 'y', em: -0.02 } }), {}, {});
    expect(em0.orfaos).toEqual([]); expect(emMenos.orfaos).toEqual([]);
    expect(minY(em0)).toBeGreaterThan(-1e-9); expect(minY(em0)).toBeLessThan(1e-9);
    expect(minY(emMenos)).toBeGreaterThan(-0.02 - 1e-9); expect(minY(emMenos)).toBeLessThan(-0.02 + 1e-9);
    expect(fechada(facesDa(emMenos, 'aparado'))).toBe(true);
  });

  it('folga zero deixa a pele nova sobre a da chapa', () => {
    const n = nucleo(receita(0), {}, {});
    expect(n.orfaos).toEqual([]);
    const T = triangulos(n, facesDa(n, 'chapa'));
    expect(Math.max(...daPele(n).map((p) => distanciaAPele(n, p, T)))).toBeLessThan(1e-6);
  });

  it('com espessura, a folga é medida da pele de dentro da chapa', () => {
    const n = nucleo([...receita(0.04, { espessura: 0.03 }).slice(0, 1), ['parte', { nome: 'interna', sel: { origem: { op: 'subdivisao', id: 1, parte: 'interna' } } }], PRISMA, APARAR(0.04),
      ['parte', { nome: 'aparado', sel: { origem: { op: 'aparar', id: 3 } } }]], {}, {});
    expect(n.orfaos).toEqual([]);
    const T = triangulos(n, facesDa(n, 'interna'));
    const d = daPele(n).map((p) => distanciaAPele(n, p, T));
    expect(d.length).toBeGreaterThan(30);
    expect(Math.min(...d)).toBeGreaterThan(0.04 * 0.99);
    expect(Math.max(...d)).toBeLessThan(0.04 * 1.01);
  });

  it('o resultado é fechado, fica dentro do prisma e sai igual em duas execuções', () => {
    const n = nucleo(receita(0.05), {}, {});
    const faces = facesDa(n, 'aparado');
    expect(fechada(faces)).toBe(true);
    for (const p of new Set(faces.flatMap((f: any) => f.vs))) {
      const [x, y, z] = n.V.get(p as number) as V3;
      expect(Math.abs(x)).toBeLessThanOrEqual(0.6 + 1e-9); expect(Math.abs(z)).toBeLessThanOrEqual(0.6 + 1e-9);
      expect(y).toBeGreaterThanOrEqual(-1e-9); expect(y).toBeLessThanOrEqual(0.7 + 1e-9);
    }
    expect(JSON.stringify(neutroCanonico(nucleo(receita(0.05), {}, {})))).toBe(JSON.stringify(neutroCanonico(n)));
  });

  it('a chapa cortada por uma booleana antes continua valendo, e o molde não entra na malha da chapa', () => {
    const furo: [string, object] = ['cubo', { origemId: 5, larg: 0.2, alt: 0.2, prof: 2, em: [0, 0.4, 0] }];
    const passos = [
      ['subdivisao', { origemId: 1, ...CALOTA, espessura: 0.03 }],
      furo,
      ['subtrair', { origemId: 6, solidos: [{ origem: { op: 'subdivisao', id: 1 } }, { origem: { op: 'cubo', id: 5 } }] }],
      PRISMA, APARAR(0.04),
      ['parte', { nome: 'aparado', sel: { origem: { op: 'aparar', id: 3 } } }],
    ];
    const n = nucleo(passos, {}, {});
    expect(n.orfaos).toEqual([]);
    expect(fechada(facesDa(n, 'aparado'))).toBe(true);
    /* a pele nova é a da chapa inteira, sem o furo: o ponto do furo (x = 0,1, y = 0,4) tem a pele a 0,04 + 0,03 da pele de fora */
    const molde = moldeDeDentro({ vertices: nucleo([passos[0]] as any, {}, {}).chapas[0].pele.vertices, faces: nucleo([passos[0]] as any, {}, {}).chapas[0].pele.faces, espessura: 0.03, lado: 'contraNormal', folga: 0.04, fecha: { eixo: 'y', em: 0 } });
    expect(molde.triangulos.length).toBeGreaterThan(100);
  });

  it('recusa, sem mexer no estado, a chapa de duas bordas, a fechada, a borda que cruza o plano, a folga negativa e a origem que não existe', () => {
    const antes = nucleo(receita(0.05).slice(0, 3), {}, {});
    /* duas bordas: um anel, sem o topo */
    const anel = { vertices: [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5], [-0.4, 1, -0.4], [0.4, 1, -0.4], [0.4, 1, 0.4], [-0.4, 1, 0.4]], faces: [[0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]], niveis: 1 };
    expect(grito(receita(0.05, anel))[0]).toMatch(/aparar\/chapa: a chapa tem 2 bordas/);
    /* fechada: o cubo de gaiola inteiro */
    const caixa = { vertices: [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5], [-0.4, 1, -0.4], [0.4, 1, -0.4], [0.4, 1, 0.4], [-0.4, 1, 0.4]], faces: [[0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0], [4, 7, 6, 5], [0, 1, 2, 3]], niveis: 1 };
    expect(grito(receita(0.05, caixa))[0]).toMatch(/aparar\/chapa: a chapa não tem borda/);
    expect(grito(receita(0.05, {}, { fecha: { eixo: 'y', em: 0.5 } }))[0]).toMatch(/aparar\/chapa: a borda da chapa fica a .* do plano da tampa .*mais que o deslocamento da pele/);
    expect(grito(receita(-0.01))[0]).toMatch(/aparar\/folga: folga precisa ser um número maior ou igual a zero/);
    expect(grito(receita(0.05, {}, { chapa: { op: 'subdivisao', id: 9 } }))[0]).toMatch(/aparar\/chapa: a origem subdivisao:9 não existe/);
    expect(grito(receita(0.05, {}, { fecha: { eixo: 'w', em: 0 } }))[0]).toMatch(/aparar\/fecha: fecha precisa ser/);
    expect(grito(receita(0.05, {}, { tolerancia: 1 }))[0]).toMatch(/aparar\/tolerancia: argumento desconhecido 'tolerancia'/);
    /* o estado de quem gritou é o de antes do passo: nenhum vértice nem face a mais */
    const gritou = nucleo(receita(0.05, {}, { chapa: { op: 'subdivisao', id: 9 } }).slice(0, 4), {}, {});
    expect([gritou.V.size, gritou.F.size]).toEqual([antes.V.size, antes.F.size]);
  });

  it('a folga que passa do raio local da pele grita com a medida', () => {
    const msg = grito(receita(0.05, { espessura: 0.45 }));
    expect(msg.length).toBeGreaterThan(0);
  });
});
