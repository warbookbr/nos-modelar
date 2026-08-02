/* arredondar-aresta.test.ts — contrato de aceitação do Escopo A do filete v2.
   Escrito antes da op: uma aresta simples de cubo ganha uma faixa de arco com
   vários painéis, mas `filete` v1 continua sendo o chanfro compatível. */
import { describe, expect, it } from 'vitest';
import { conferirMalha } from './conferir-malha.js';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo, neutroCanonico } from '../../prototipos/fps/v3/motor/oficina.js';

const DE = { op: 'cubo', id: 1, face: 'topo' };
const BASE = [['cubo', { larg: 1, alt: 1, prof: 1, origemId: 1 }]];
const OP = (extra: Record<string, unknown> = {}) => [
  ...BASE,
  ['arredondarAresta', { origemId: 9, de: DE, aresta: 0, raio: 0.1, paineis: 2, ...extra }],
];

const DE_COMPOSTO = { op: 'chamferBox', id: 1, face: 'topo' };
const BASE_COMPOSTA = [['chamferBox', { larg: 2, alt: 2, prof: 2, chanfro: 0.2, origemId: 1 }]];
const OP_COMPOSTA = (extra: Record<string, unknown> = {}) => [
  ...BASE_COMPOSTA,
  ['arredondarAresta', { origemId: 9, de: DE_COMPOSTO, aresta: 0, raio: 0.05, paineis: 2, ...extra }],
];

function normal(n: any, face: number) {
  const f = n.F.get(face);
  const p = f.vs.map((v: number) => n.V.get(v));
  let x = 0; let y = 0; let z = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i]; const b = p[(i + 1) % p.length];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}
function angulo(a: number[], b: number[]) {
  return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI;
}
function raioPorTresPontos(a: number[], b: number[], c: number[]) {
  const ab = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const bc = Math.hypot(b[0] - c[0], b[1] - c[1], b[2] - c[2]);
  const ca = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const areaDupla = Math.hypot(
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  );
  return ab * bc * ca / (2 * areaDupla);
}

describe('arredondarAresta — Escopo A, faixa de arco numa aresta simples', () => {
  it('dois painéis criam curva mensurável: cubo 8V/6F → 12V/8F e a faixa percorre 90°', () => {
    const n = nucleo(OP() as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect([n.V.size, n.F.size]).toEqual([12, 8]);
    /* A normal de cada PAINEL plano aponta no meio da corda: nas duas
       fronteiras há meia etapa (22,5°) e entre as duas cordas há 45°. A soma
       é a mudança integral de 90° da aresta, sem fingir que uma corda é arco. */
    expect(angulo(normal(n, 1), normal(n, 1000))).toBeCloseTo(22.5, 6);
    expect(angulo(normal(n, 1000), normal(n, 1001))).toBeCloseTo(45, 6);
    expect(angulo(normal(n, 1001), normal(n, 4))).toBeCloseTo(22.5, 6);
  });

  it('o arco que chega à ponta v0 tem o raio declarado, não a profundidade do chanfro', () => {
    const n = nucleo(OP() as any, {}, {});
    const faceTopo = n.F.get(1);
    const p0 = n.V.get(faceTopo.vs[0]);
    const p1 = n.V.get(1000);
    const p2 = n.V.get(1002);
    expect(raioPorTresPontos(p0, p1, p2)).toBeCloseTo(0.1, 6);
  });

  it('cada painel é endereçável por identidade estrutural', () => {
    const n = nucleo([
      ...OP(),
      ['parte', { nome: 'segundoPainel', sel: { origem: { op: 'arredondarAresta', id: 9, painel: 1 } } }],
    ] as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect(n.F.get(1001).parte).toBe('segundoPainel');
    expect(n.F.get(1000).parte).not.toBe('segundoPainel');
  });

  it('continua uma casca fechada de polígonos trianguláveis no adaptador Three', () => {
    /* Contagem e raio não bastam: é possível fechar arestas e ainda deixar
       um canto sobre uma aresta da própria face. A mesma prova que protegeu
       o filete v1 precisa passar para a faixa multipainel. */
    conferirMalha(nucleo(OP() as any, {}, {}), {
      fechada: true,
      rotulo: 'cubo com arredondarAresta Escopo A',
    });
  });

  it('é determinístico e não muda o filete v1', () => {
    const a = JSON.stringify(neutroCanonico(nucleo(OP() as any, {}, {})));
    const b = JSON.stringify(neutroCanonico(nucleo(OP() as any, {}, {})));
    expect(a).toBe(b);
    const v1 = nucleo([
      ...BASE,
      ['filete', { origemId: 8, de: DE, aresta: 0, raio: 0.1 }],
    ] as any, {}, {});
    expect([v1.V.size, v1.F.size]).toEqual([10, 7]);
  });

  it('raio que não cabe e paineis fora do contrato falham fechados, sem meia malha', () => {
    for (const extra of [{ raio: 1 }, { paineis: 1 }, { paineis: 2.5 }]) {
      const n = nucleo(OP(extra) as any, {}, {});
      expect(n.orfaos.length, JSON.stringify(extra)).toBeGreaterThan(0);
      expect([n.V.size, n.F.size], JSON.stringify(extra)).toEqual([8, 6]);
    }
  });
});

describe('arredondarAresta - Escopo B, canto composto de chamferBox', () => {
  it('costura os dois cantos compostos sem criar fresta ou poligono invalido', () => {
    const n = nucleo(OP_COMPOSTA() as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect([n.V.size, n.F.size]).toEqual([28, 28]);
    conferirMalha(n, { fechada: true, rotulo: 'chamferBox com arredondarAresta composto' });
  });

  it('preserva os paineis estruturais e o replay do canto composto', () => {
    const comParte = nucleo([
      ...OP_COMPOSTA(),
      ['parte', { nome: 'ultimoPainel', sel: { origem: { op: 'arredondarAresta', id: 9, painel: 'ultima' } } }],
    ] as any, {}, {});
    expect(comParte.orfaos).toEqual([]);
    expect(comParte.F.get(1001).parte).toBe('ultimoPainel');
    const a = JSON.stringify(neutroCanonico(nucleo(OP_COMPOSTA() as any, {}, {})));
    const b = JSON.stringify(neutroCanonico(nucleo(OP_COMPOSTA() as any, {}, {})));
    expect(a).toBe(b);
  });

  it('continua recusando raio fora do contrato sem alterar a caixa', () => {
    const n = nucleo(OP_COMPOSTA({ raio: 1 }) as any, {}, {});
    expect(n.orfaos.length).toBeGreaterThan(0);
    expect([n.V.size, n.F.size]).toEqual([24, 26]);
  });

  it('as 24 arestas das seis faces nominais passam pela mesma costura', () => {
    const faces = ['fundo', 'topo', 'tras', 'direita', 'frente', 'esquerda'];
    let medidas = 0;
    for (const face of faces) for (let aresta = 0; aresta < 4; aresta++) {
      const n = nucleo([
        ['chamferBox', { larg: 2, alt: 2, prof: 2, chanfro: 0.2, origemId: 1 }],
        ['arredondarAresta', { origemId: 9, de: { op: 'chamferBox', id: 1, face }, aresta, raio: 0.05, paineis: 2 }],
      ] as any, {}, {});
      expect(n.orfaos, `${face}/${aresta}`).toEqual([]);
      conferirMalha(n, { fechada: true, rotulo: `chamferBox ${face}/${aresta}` });
      medidas++;
    }
    expect(medidas).toBe(24);
  });
});
