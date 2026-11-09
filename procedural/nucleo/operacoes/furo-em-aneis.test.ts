/* furo-em-aneis.test.ts — a fatia 4 do plano "costuras e furos limpos": o `furo` lê uma região plana de várias faces (a tampa em leque do `lathe`)
   como face de entrada ou de saída, e refaz em anéis a face furada cuja repartição teria triângulo fino. */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../entrada.js';
import { conferirMalha } from '../../../tools/oficina/conferir-malha.js';
// @ts-expect-error — régua de malha em JavaScript.
import { medirTrianguloFino } from '../../../tools/modelar/reguas-de-malha/triangulo-fino.mjs';

const m = (mm: number) => mm / 1000;
const DISCO = (furo: any, lados = 96) => [
  ['lathe', { origemId: 1, lados, eixo: 'x', perfil: [[0, 0], [m(77), 0], [m(77), m(43)], [0, m(43)]] }],
  ['furo', { origemId: 2, lados: 18, ...furo }],
];
const CEGO = { de: { op: 'lathe', id: 1, faixa: 2 }, centros: [{ centro: [m(43), 0, 0], raio: m(15), profundidade: m(6) }] };
const PASSANTE = {
  de: { op: 'lathe', id: 1, faixa: 2 }, saida: { op: 'lathe', id: 1, faixa: 0 },
  centros: [{ centro: [m(43), 0, 0], raio: m(15) }, { pivo: [m(43), 0, 0], distancia: m(55), total: 4, volta: 360, raio: m(4) }],
};

const arestasDoPlano = (n: any, x: number) => {
  const dentro = (id: number) => Math.abs(n.V.get(id)[0] - x) < 1e-9;
  return [...n.F.values()].filter((f: any) => f.vs.every(dentro));
};

describe('furo: região plana como entrada', () => {
  it('a tampa em leque do lathe (96 faces) é a entrada de um furo cego: casca fechada, sem órfão, sem vértice solto', () => {
    const n = nucleo(DISCO(CEGO) as any, {}, {});
    expect(n.orfaos).toEqual([]);
    conferirMalha(n, { fechada: true, rotulo: 'furo cego na tampa em leque' });
    const usados = new Set();
    for (const f of n.F.values()) for (const v of f.vs) usados.add(v);
    expect([...n.V.keys()].filter((v) => !usados.has(v))).toEqual([]);
  });

  it('o furo passante entre as duas tampas em leque fecha a casca, com cinco furos', () => {
    const n = nucleo(DISCO(PASSANTE) as any, {}, {});
    expect(n.orfaos).toEqual([]);
    conferirMalha(n, { fechada: true, rotulo: 'furo passante entre duas tampas em leque' });
  });

  it('um conjunto que não é região plana continua recusado, com a contagem de faces e o tamanho do grupo coplanar', () => {
    const n = nucleo(DISCO({ ...CEGO, de: { op: 'lathe', id: 1, faixa: 1 } }) as any, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/EXATAMENTE uma face, ou para uma região plana.*resolveu para 96 faces/);
  });

  it('o resultado é determinístico: duas execuções dão a mesma malha', () => {
    const a = nucleo(DISCO(PASSANTE) as any, {}, {});
    const b = nucleo(DISCO(PASSANTE) as any, {}, {});
    expect(JSON.stringify([...a.V])).toBe(JSON.stringify([...b.V]));
    expect(JSON.stringify([...a.F].map(([id, f]: any) => [id, f.vs]))).toBe(JSON.stringify([...b.F].map(([id, f]: any) => [id, f.vs])));
  });
});

describe('furo: a face furada refeita em anéis', () => {
  const n = nucleo(DISCO(CEGO) as any, {}, {});

  it('cada aresta do furo ganha o quadrilátero da borda, e o furo de 18 lados tem 18 deles', () => {
    const quadros = arestasDoPlano(n, m(43)).filter((f: any) => f.vs.length === 4);
    expect(quadros).toHaveLength(18);
  });

  it('nenhum vértice novo cai sobre o contorno da tampa: as faces vizinhas da peça seguem sem junção em T', () => {
    const noContorno = [...n.V.values()].filter((p: any) => Math.abs(p[0] - m(43)) < 1e-9 && Math.abs(Math.hypot(p[1], p[2]) - m(77)) < 1e-9);
    expect(noContorno).toHaveLength(96);
  });

  it('a tampa da frente não tem triângulo fino pela régua', () => {
    const { porRegiao } = medirTrianguloFino(n);
    // sobra só a tampa de trás, o leque do lathe que o furo não toca
    expect(porRegiao.map((r: any) => r.faces)).toEqual([96]);
  });
});
