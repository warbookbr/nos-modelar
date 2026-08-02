/* canon-linha-de-base.test.ts — fotografia do furo antes de portas novas do
   ciclo 6: raios iguais devem conservar exatamente a geometria atual. */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';

const fixo = (n: number) => {
  const s = n.toFixed(9);
  return s === '-0.000000000' ? '0.000000000' : s;
};

function resumoDaGeometria(neutro: any) {
  const vertices = [...neutro.V.entries()].sort((a: any, b: any) => a[0] - b[0])
    .map(([id, p]: any) => `${id}:${p.map(fixo).join(',')}`).join('|');
  const faces = [...neutro.F.entries()].sort((a: any, b: any) => a[0] - b[0])
    .map(([id, f]: any) => `${id}:${f.vs.join(',')}:${f.parte ?? ''}`).join('|');
  return createHash('sha256').update(`${vertices}#${faces}`).digest('hex').slice(0, 16);
}

/* Tampa de cilindro furada por um círculo de furos de raios iguais. Esta é a
   família de simetria que uma nova ordem de ponte não pode alterar. */
const FLANGE = (ladosDaFace: number, ladosDoFuro: number, total: number) => [
  ['cilindro', { id: 0, origemId: 1, raio: 0.052, altura: 0.012, lados: ladosDaFace }],
  ['furo', {
    origemId: 9,
    de: { op: 'cilindro', id: 1, tampa: 'topo' },
    saida: { op: 'cilindro', id: 1, tampa: 'fundo' },
    centros: { distancia: 0.038, total, volta: 360 },
    raio: 0.0065,
    lados: ladosDoFuro,
    orientacao: [1, 0, 0],
  }],
];

/* Medido antes da primeira mudança de comportamento do ciclo 6.
   [lados da face, lados do furo, total, vértices, faces, resumo]. */
const CANONS: [number, number, number, number, number, string][] = [
  [16, 12, 4, 128, 204, '1812afeeee642b1f'],
  [8, 12, 4, 112, 180, '33ec48f802c38db2'],
  [10, 6, 6, 92, 158, 'ffa5266a9151fc55'],
  [24, 6, 6, 120, 200, '430745d1915d5000'],
  [32, 10, 6, 184, 296, 'c13f70a4126854b3'],
  [16, 12, 8, 224, 364, 'b352e8b133f7609d'],
  [20, 12, 4, 136, 216, '41a9ccb577a754e7'],
  [6, 8, 8, 140, 238, '905a515150ada448'],
];

describe('linha de base do furo: família de simetria', () => {
  it('os oito resumos são distintos entre si', () => {
    expect(new Set(CANONS.map((c) => c[5])).size).toBe(8);
    expect(CANONS).toHaveLength(8);
  });

  for (const [face, furo, total, vertices, faces, resumo] of CANONS) {
    it(`face ${face}, ${total} furos de ${furo}: geometria idêntica à linha de base`, () => {
      const n = nucleo(FLANGE(face, furo, total) as any, {}, {});
      expect(n.orfaos).toEqual([]);
      expect(n.V.size).toBe(vertices);
      expect(n.F.size).toBe(faces);
      expect(
        resumoDaGeometria(n),
        'a geometria mudou; uma porta nova deve preservar este caso de raios iguais',
      ).toBe(resumo);
    });
  }

  it('o resumo acusa uma mudança na nona casa decimal', () => {
    const n = nucleo(FLANGE(16, 12, 4) as any, {}, {});
    const antes = resumoDaGeometria(n);
    const primeiro = [...n.V.keys()].sort((a: number, b: number) => a - b)[0];
    const p = n.V.get(primeiro);
    n.V.set(primeiro, [p[0] + 1e-9, p[1], p[2]]);
    expect(resumoDaGeometria(n)).not.toBe(antes);
  });
});
