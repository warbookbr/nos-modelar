/* arredondar-facetado.test.ts — arredondarAresta numa forma facetada não devolve a face vizinha torta.
   O arco anda no plano perpendicular à aresta e o canto da ponta anda junto. A face da ponta só continua plana se o plano dela
   contém esse deslocamento, isto é, se ela é perpendicular à aresta. No prisma de oito lados as laterais vizinhas não são, e o
   passo as devolvia tortas (desvio de 2,15e-2 do próprio plano para o raio de 0,05), que a conferência só avisa como alerta.
   O passo agora confere as faces que altera, antes de escrever, e grita com a face e o desvio.

   O vértice solto que o relato do achado trazia não apareceu: 256 combinações do prisma octogonal arredondado e depois unido ou
   subtraído de um cubo em oito posições, com a conferência desligada, não deixaram vértice sem face nem casca aberta (ver o
   Andamento do plano). */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../entrada.js';
// @ts-expect-error — módulo JavaScript.
import { desvioDeFacePlana } from './face-plana.js';

const PRISMA = [['cilindro', { origemId: 1, raio: 0.5, altura: 1, lados: 8 }]];
const arredonda = (de: Record<string, unknown>, aresta: number, extra: Record<string, unknown> = {}) => [
  ...PRISMA,
  ['arredondarAresta', { origemId: 9, de: { op: 'cilindro', id: 1, ...de }, aresta, raio: 0.05, paineis: 2, ...extra }],
];

const facesTortas = (n: any) => [...n.F.values()].filter((f: any) => desvioDeFacePlana(f.vs.map((v: number) => n.V.get(v))));
const assinatura = (n: any) => JSON.stringify([[...n.V].map(([id, p]: any) => [id, p]), [...n.F].map(([id, f]: any) => [id, f.vs])]);

describe('arredondarAresta em forma facetada', () => {
  it('o prisma de oito lados antes do passo não tem face torta', () => {
    const n = nucleo(PRISMA as any, {}, {});
    expect([n.V.size, n.F.size]).toEqual([16, 10]);
    expect(facesTortas(n)).toEqual([]);
  });

  it('grita na aresta de cima de uma lateral, com a face torta e o desvio, e deixa a malha como estava', () => {
    const n = nucleo(arredonda({ tampa: 'topo' }, 0) as any, {}, {});
    const base = nucleo(PRISMA as any, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0]).toMatchObject({ op: 'arredondarAresta', ref: 'aresta' });
    expect(n.orfaos[0].motivo).toMatch(/^a face \d+ ficaria torta: o canto \d+ a \d\.\d\de-2 do plano médio \(tolerância 1\.0e-6\)/);
    expect(assinatura(n)).toBe(assinatura(base));
  });

  it('o desvio dito é o da torção que o passo escrevia (2,15e-2 para o raio de 0,05)', () => {
    const n = nucleo(arredonda({ tampa: 'topo' }, 0) as any, {}, {});
    const desvio = Number(/a (\d\.\d\de-2) do plano/.exec(n.orfaos[0].motivo)?.[1]);
    expect(desvio).toBeCloseTo(2.15e-2, 3);
  });

  it('nenhuma aresta das tampas nem das laterais sai com face torta: ou arredonda inteira ou grita', () => {
    let aceitas = 0; let recusadas = 0;
    for (const de of [{ tampa: 'topo' }, { tampa: 'fundo' }, ...Array.from({ length: 8 }, (_, lado) => ({ lado }))]) {
      for (let aresta = 0; aresta < ('tampa' in de ? 8 : 4); aresta++) {
        const n = nucleo(arredonda(de, aresta) as any, {}, {});
        expect(facesTortas(n), JSON.stringify([de, aresta])).toEqual([]);
        if (n.orfaos.length) recusadas++; else aceitas++;
      }
    }
    expect(recusadas).toBeGreaterThan(0);
    expect(aceitas).toBeGreaterThan(0);
  });

  it('a aresta que os vizinhos deixam plana arredonda como antes', () => {
    const n = nucleo(arredonda({ lado: 0 }, 0) as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect([n.V.size, n.F.size]).toEqual([20, 12]);
    expect(facesTortas(n)).toEqual([]);
  });

  it('o cubo, de faces perpendiculares, segue arredondando', () => {
    const n = nucleo([
      ['cubo', { larg: 1, alt: 1, prof: 1, origemId: 1 }],
      ['arredondarAresta', { origemId: 9, de: { op: 'cubo', id: 1, face: 'topo' }, aresta: 0, raio: 0.1, paineis: 2 }],
    ] as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect([n.V.size, n.F.size]).toEqual([12, 8]);
  });

  it('é determinística: a mesma receita dá a mesma recusa', () => {
    const a = nucleo(arredonda({ tampa: 'topo' }, 0) as any, {}, {});
    const b = nucleo(arredonda({ tampa: 'topo' }, 0) as any, {}, {});
    expect(a.orfaos).toEqual(b.orfaos);
  });
});

describe('desvioDeFacePlana', () => {
  const quadrado = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]];
  it('aceita a face plana e o triângulo', () => {
    expect(desvioDeFacePlana(quadrado)).toBeNull();
    expect(desvioDeFacePlana(quadrado.slice(0, 3))).toBeNull();
  });
  it('acusa o canto que sai do plano além da tolerância, com o índice e o desvio', () => {
    const torta = desvioDeFacePlana([[0, 0, 0], [1, 0, 0], [1, 1, 0.01], [0, 1, 0]]);
    expect(torta.desvio).toBeCloseTo(0.0025, 6);
    expect(torta.tolerancia).toBeCloseTo(1e-6, 12);
  });
  it('perdoa o ruído abaixo da tolerância', () => {
    expect(desvioDeFacePlana([[0, 0, 0], [1, 0, 0], [1, 1, 1e-9], [0, 1, 0]])).toBeNull();
  });
});
