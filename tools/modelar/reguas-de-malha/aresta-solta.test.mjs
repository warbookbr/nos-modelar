/* aresta-solta.test.mjs — a régua de aresta solta, a recusa dela no `guarda:acervo` (com a dispensa `meta.casca: "aberta"`) e a face de menos de 3 cantos na régua de face degenerada. */
import { describe, expect, it } from 'vitest';
import { medirArestaSolta } from './aresta-solta.mjs';
import { motivoDeFaceDegenerada, motivoDeArestaSolta } from '../guardas/guarda-acervo.mjs';

const V = new Map([[1, [0, 0, 0]], [2, [1, 0, 0]], [3, [0, 1, 0]], [4, [0, 0, 1]]]);
const tetra = [[1, 3, 2], [1, 2, 4], [2, 3, 4], [3, 1, 4]];
const F = (faces) => new Map(faces.map((vs, i) => [i + 1, { id: i + 1, vs }]));

describe('régua de aresta solta', () => {
  it('o tetraedro fechado mede 0, e sem uma face medem as 3 arestas dela', () => {
    expect(medirArestaSolta({ V, F: F(tetra) }).total).toBe(0);
    expect(medirArestaSolta({ V, F: F(tetra.slice(0, 3)) }).total).toBe(3);
  });
  it('o guarda:acervo recusa a casca aberta, com as arestas, e aceita a fechada', () => {
    expect(motivoDeArestaSolta({ V, F: F(tetra) })).toBeNull();
    expect(motivoDeArestaSolta({ V, F: F(tetra.slice(0, 3)) })).toMatch(/3 ARESTA\(S\) SOLTA\(S\)/);
  });
  it('a peça que declara a casca aberta (meta.casca "aberta") não é recusada', () => {
    expect(motivoDeArestaSolta({ V, F: F(tetra.slice(0, 3)) }, { meta: { casca: 'aberta' } })).toBeNull();
  });
  it('a face de menos de 3 cantos entra na régua de face degenerada, como o adaptador a recusa', () => {
    expect(motivoDeFaceDegenerada({ V, F: new Map([[1, { id: 1, vs: [1, 2] }]]) })).toMatch(/1 FACE\(S\) DEGENERADA\(S\)/);
  });
});
