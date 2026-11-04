/* geradores-faixa-estendida.test.ts — o lathe e o loft passam do bloco de
   1000 ids do passo e seguem na faixa estendida, como o cilindro, o cone e o
   arranja já faziam. Antes eles gritavam: a coluna do braço não podia passar
   de 72 lados e o ombro não cabia nas seções que a traseira pedia (achado de
   2026-11-04). Abaixo de 1000 o id é o mesmo de sempre, e nenhuma peça muda. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo, neutroCanonico, BLOCO } from '../entrada.js';
import { arestasSemPar, vinculosNaoManifold } from '../../../tools/oficina/conferir-malha';

const quadrado = (r: number, lados: number) => Array.from({ length: lados }, (_, k) => {
  const t = (2 * Math.PI * k) / lados;
  const c = Math.cos(t), s = Math.sin(t), m = Math.max(Math.abs(c), Math.abs(s));
  return [(r * c) / m, (r * s) / m];
});
const loft = (nSecoes: number) => [['loft', {
  origemId: 1, lados: 48,
  secoes: [
    { pos: [0, 0, 0], raio: 0 },
    ...Array.from({ length: nSecoes }, (_, k) => ({ pos: [0, 0.001 + (0.2 * k) / nSecoes, 0], contorno: quadrado(0.05 + 0.01 * Math.sin(k), 48) })),
    { pos: [0, 0.21, 0], raio: 0 },
  ],
}]];
const lathe = (lados: number) => [['lathe', { origemId: 1, eixo: 'y', lados, segmentosCurva: 2, perfil: [[0, 0], [0.07, 0], [0.078, 0.002, 0.0008], [0.078, 0.3], [0.076, 0.302, 0.0008], [0, 0.302]] }]];

describe('lathe e loft na faixa estendida de ids', () => {
  it('um loft de 40 seções por 48 lados, acima do bloco, sai fechado', () => {
    const n = nucleo(loft(40));
    expect(n.orfaos).toEqual([]);
    expect(Math.max(...n.F.keys())).toBeGreaterThanOrEqual(BLOCO);
    expect(arestasSemPar(n)).toEqual([]);
    expect(vinculosNaoManifold(n)).toEqual([]);
  });

  it('um lathe de 256 lados, acima do bloco, sai fechado', () => {
    const n = nucleo(lathe(256));
    expect(n.orfaos).toEqual([]);
    expect(Math.max(...n.F.keys())).toBeGreaterThanOrEqual(BLOCO);
    expect(arestasSemPar(n)).toEqual([]);
    expect(vinculosNaoManifold(n)).toEqual([]);
  });

  it('abaixo do bloco os ids são os do passo, como antes, e a receita é determinística', () => {
    const n = nucleo(loft(10));
    expect(Math.max(...n.F.keys())).toBeLessThan(BLOCO);
    expect(JSON.stringify(neutroCanonico(nucleo(lathe(256))))).toBe(JSON.stringify(neutroCanonico(nucleo(lathe(256)))));
  });
});
